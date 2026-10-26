import type {World} from '../../src/simulation/world';
import type {Entity} from '../../src/simulation/types';
import type {Case} from './catalogue';
import {prepareEquipmentFixture,equipmentFixtureSnapshot} from './equipment-fixture';
import type {EquipmentPreviewData} from './equipment-preview-spec';
import {activeEquipmentEffects,equipmentValue} from '../../src/simulation/starship/modules';
import {registerEquipmentRoster,equipmentSurvivesWipe} from '../../src/simulation/starship/lifecycle';
import {collectEquipmentResource} from '../../src/simulation/starship/growth';
import {evolveEquipmentMembers,initializeEquipmentMembers} from '../../src/simulation/starship/members';
import {releasePaidPassenger} from '../../src/simulation/expedition-production';
import {clearEquipmentFortifications} from '../../src/simulation/starship/fortifications';
import {equipmentPresentationReceipts} from '../../src/simulation/starship/presentation';
import {HEROES} from '../../src/data/heroes';
import {familyLine} from '../../src/data/expedition-buildings';
import {ELITES} from '../../src/data/elites';
import {PRODUCTION_LINES} from '../../src/data/expedition-buildings';
import {grantFacility,type FacilityKind} from '../../src/simulation/building/rules';
import {syncBuildingViews} from '../../src/simulation/building/expedition';

export type EquipmentPreview={data:EquipmentPreviewData;actorId:number;targetId:number;patientId:number;start:number;fired:boolean;ended:boolean;stage:string;initial:ReturnType<typeof equipmentFixtureSnapshot>;observed:Record<string,unknown>[];seen:Set<number>;originalIds:Set<number>;evidence:Set<string>};
const move=(u:Entity,x:number,z:number)=>Object.assign(u,{x,z,prev:{x,z},velocity:{x:0,z:0}});
export function prepareEquipmentPreview(w:World,c:Case):EquipmentPreview{
 const d=c.data as EquipmentPreviewData,p=prepareEquipmentFixture(w,d),u=w.entities.get(p.actorId)!,e=p.effects.find(x=>x.key===d.focusEffect);if(!e)throw Error('预览效果未生效：'+d.focusEffect);
 const f:EquipmentPreview={data:d,...p,start:w.time,fired:false,ended:false,stage:'准备触发条件',initial:equipmentFixtureSnapshot(w),observed:[],seen:new Set(),originalIds:new Set(w.entities.keys()),evidence:new Set()};
 // Keep the real equipped combination intact. Only sandbox positions, timer
 // history and the seed are staged; no effect value or native rule is replaced.
 for(const a of w.allies()){a.moveSpeed=0;a.nextShotAt=Infinity;a.weaponCooldown=Infinity;}
 const key=d.focusEffect;
 if(d.binding.direction&&['direction_reinforcement','opening_direction'].includes(key)){
  const line=d.binding.direction,family=PRODUCTION_LINES[line].families[0],b=w.expedition.building!;
  if(line.startsWith('zerg.')){const group=b.groups.find(g=>g.kind==='hatchery')!;if(line!=='zerg.basic')group.directions.push(line==='zerg.air'?'air':'ground');}
  else if(!b.groups.some(g=>g.line===line))grantFacility(b,line as FacilityKind);
  w.expedition.tech['unlock.'+family]=1;if(!w.expedition.familySlots.includes(family))w.expedition.familySlots.push(family);syncBuildingViews(w.expedition);
  if(!w.isFamilyAvailable(family))throw Error('绑定方向尚无可用生产资格：'+line);
  // An opening-only preview stages the same legal production history before
  // replaying its native initializer. Remove the prior opening delivery first.
  if(key==='opening_direction'&&![...w.starship.members.values()].some(m=>m.origin==='opening_direction'))initializeEquipmentMembers(w);
 }
 if(['cleave','cluster','crit_pursuit'].includes(key)){
  const family=key==='cleave'?'zealot':key==='cluster'?'hellion':'marine';
  const replacement=w.addFamilyMember(family,{x:0,z:0});f.actorId=replacement.id;replacement.moveSpeed=0;replacement.nextShotAt=Infinity;
 }
 const actor=w.entities.get(f.actorId)!,targets=[...w.entities.values()].filter(t=>t.owner==='zerg');
 targets.forEach((t,i)=>{move(t,i===0?0:i===1?.35:-.4,key==='cleave'?1.1:2.5+i*.65);if(key==='cleave')t.flying=false;});
 if(key==='pierce')targets.forEach((t,i)=>move(t,0,actor.attackRange*.55+i*.65));
 if(['capture','execute_chain'].includes(key))targets.forEach(t=>{t.hp=t.maxHp*.2;});
 if(key==='burn_execute')w.starship.combat.burning.set(targets[0].id,{maxHp:targets[0].maxHp,actual:targets[0].maxHp*e.values[0]-.001,bornAt:targets[0].bornAt,source:actor.id});
 if(['overload_chain','crit_pursuit'].includes(key))targets[0].hp=actor.weaponDamage*1.2;
 if(d.recipe==='recall'){move(actor,20,0);actor.stoppedUntil=0;}
 if(d.recipe==='shield'){targets.forEach(t=>move(t,t.x,35));actor.hp=actor.maxHp*.4;actor.shield=0;}
 if(key==='periodic_trap')targets.forEach(t=>move(t,t.x,12));
 if(key==='share_damage')actor.shield=0;
 if(d.recipe==='fort'){
  clearEquipmentFortifications(w);for(const receipt of w.starship.account.run!.receipts)if(receipt.startsWith('fort:'))w.starship.account.run!.receipts.delete(receipt);
 }
 if(key==='insurance'){actor.rank=Math.max(3,e.values[0]);w.refreshStats(actor,true);actor.moveSpeed=0;}
 if(key==='share_damage'){const friend=w.addUnit(actor.unitType,'terran',-1,0);friend.nextShotAt=Infinity;friend.moveSpeed=0;friend.shield=0;}
 if(key==='elite_training'&&!w.allies().some(a=>a.eliteId)){const elite=Object.values(ELITES).find(v=>v.family===actor.unitType)!;actor.eliteId=elite.id;actor.modelKey=elite.model;w.refreshStats(actor,true);}
 if(key==='ravager_evolution')for(const a of w.allies())if(w.starship.numbers.has('equipment-ravager:'+a.id)){a.bileCooldown=.8;a.nextShotAt=Infinity;}
 if(d.recipe==='hero'&&key==='manual_reset'&&!actor.heroId){const hero=({terran:'raynor',zerg:'kerrigan',protoss:'artanis'} as const)[d.race];w.expedition.heroRewardsUnlocked=true;if(!w.acquireHero(hero))throw Error('当前种族英雄准备失败');f.actorId=w.heroEntity(hero)!.id;move(w.entities.get(f.actorId)!,0,0);}
 if(key==='manual_reset')w.dashReady=60;
 if(key==='pack_kill')w.starship.account.rng=1;
 if(d.recipe==='hero'&&actor.heroId==='nova')targets[0].hp=1;
 if(d.recipe==='hero'&&actor.heroId==='niadra'){const patient=w.entities.get(f.patientId)!;w.expedition.familySlots.push(patient.unitType as never);}
 for(const [timer]of w.starship.cycles)w.starship.cycles.set(timer,Infinity);
 for(const other of activeEquipmentEffects(w))if(['swarm','plague','behemoth','yamato_support'].includes(other.key)&&other.key!==key)w.starship.numbers.set(other.source+':'+other.key+':ready',Infinity);
 w.starship.numbers.set('last-command',w.time-20);
 registerEquipmentRoster(w);w.hash.rebuild(w.entities.values());f.initial=equipmentFixtureSnapshot(w);return f;
}
// A native spell packet supplies deterministic incoming damage without ordinary
// weapon dodge. Lethal prevention, shields, rescue and death rights still run.
function damage(w:World,u:Entity,n:number,source?:number){w.hit(u,n,[],1,'zerg',0,1,source,false,false,0,false);}
function evidence(w:World,f:EquipmentPreview){
 const u=w.entities.get(f.actorId),t=w.entities.get(f.targetId),s=w.starship;
 const now={at:Number((w.time-f.start).toFixed(3)),actor:u?{id:u.id,hp:u.hp,rank:u.rank,x:u.x,z:u.z,shots:u.shotSequence}:null,target:t?{hp:t.hp,owner:t.owner}:null,projections:[...s.projections].map(([id,p])=>({id,kind:p.kind,origin:p.origin,until:p.until,alive:(w.entities.get(id)?.hp??0)>0})),members:[...s.members].map(([id,m])=>({id,source:m.source,origin:m.origin,type:w.entities.get(id)?.unitType,hp:w.entities.get(id)?.hp,rank:w.entities.get(id)?.rank})),forts:s.forts.size,mines:w.expedition.support.mines.length,burns:s.burnZones.length+s.combat.burns.length,pending:s.life.pending.size,workers:w.workers,numbers:[...s.numbers],precision:[...s.combat.precision],weakness:[...s.combat.weakness],barriers:[...s.barriers],targetDamage:t?t.maxHp-t.hp:0,receipts:equipmentPresentationReceipts(w).map(r=>({kind:r.kind,detail:r.detail,source:r.source.id,time:r.time})),events:w.visualEvents.filter(e=>e.time>=f.start).map(e=>e.kind)};
 f.observed.push(now);if(f.observed.length>80)f.observed.shift();
}
export function beforeEquipmentPreview(w:World,f:EquipmentPreview){
 const d=f.data,key=d.focusEffect,elapsed=w.time-f.start,u=w.entities.get(f.actorId)??w.starship.life.roster.get(f.actorId),t=w.entities.get(f.targetId),e=activeEquipmentEffects(w).find(x=>x.key===key)!;
 if(!u||!e)return;
 if(!f.fired&&elapsed>=.75){
  f.fired=true;f.stage='实际触发与持续';w.starship.account.rng=key==='pack_kill'?28704:key==='cleave'?387:1;
  const due=(name:string)=>{for(const effect of activeEquipmentEffects(w).filter(x=>x.key===name))w.starship.cycles.set(effect.source+':'+name,w.time);};
  if(d.recipe==='periodic'){
   due(({reinforcement_elite:'reinforcement',drop_elite:'drop_pod'} as Record<string,string>)[key]??key);
   if(key==='sustain_heal'){w.starship.numbers.set('sustain-last',w.time);w.starship.numbers.set('sustain-start',w.time-e.values[0]);w.starship.numbers.set('sustain-next',w.time);}
   if(key==='reactor')w.starship.numbers.set(e.source+':reactor:elapsed',e.values[0]);
   for(const a of w.allies()){a.attackTarget=t!.id;a.nextShotAt=w.time;a.weaponCooldown=0;}
  }
  if(d.recipe==='attack'){
   if(key==='cleave'){let n=0;for(const victim of w.entities.values())if(victim.owner==='zerg'){move(victim,u.x+(n-1)*.12,u.z+.3+n*.1);n++;}w.hash.rebuild(w.entities.values());}
   if(key==='crit_pursuit')(w as unknown as {rngState:number}).rngState=1972;
   if(key==='precision_crit')w.starship.combat.precision.set(u.id,{target:t!.id,count:0,ready:true,cooldown:0});
   u.shotInterval=u.attackPeriod;u.attackTarget=t!.id;u.nextShotAt=w.time;u.weaponCooldown=0;w.fire(u,t!);
  }
  if(d.recipe==='advanced'){
   if(key==='dominance'){for(const a of w.allies())a.moveSpeed=3;if(!w.issueMove({x:5,z:0}))throw Error('主导权移动条件未满足');}
   else {w.starship.numbers.set(e.source+':'+key+':elapsed',e.values[0]);w.starship.numbers.set(e.source+':'+key+':last',w.time);u.attackTarget=t!.id;}
  }
  if(d.recipe==='move'){for(const a of w.allies()){a.moveSpeed=3;if(key==='moving_fire'){a.nextShotAt=w.time;a.weaponCooldown=0;}}if(!w.issueMove({x:18,z:0}))throw Error('移动预览条件未满足');}
  if(d.recipe==='damage'){if(key==='konstant'){(w as unknown as {rngState:number}).rngState=0;damage(w,u,1e10,t!.id);for(const a of w.allies()){a.nextShotAt=w.time;a.weaponCooldown=0;}}else damage(w,u,u.maxHp*.65,t!.id);}
  if(d.recipe==='fatal'){
   damage(w,u,1e10,t!.id);
   if(key==='rescue'&&u.hp>0)damage(w,u,1e10,t!.id);
   if(key==='rescue')for(const pending of w.starship.life.pending.values())if(pending.source==='survivor'&&pending.backup)pending.death=w.time-pending.backup.values[1]+2.5;
  }
  if(d.recipe==='rewind'){
   registerEquipmentRoster(w);for(const a of w.allies())damage(w,a,1e10,t!.id);equipmentSurvivesWipe(w);
  }
  if(d.recipe==='recall')w.starship.numbers.set('recall-lag:'+u.id,w.time-equipmentValue(w,'auto_recall',1));
  if(d.recipe==='rescue'){
   if(key==='rescue_rank'){const pod=w.spawnPod(u.unitType as never,{x:2,z:0},0,1,true);pod.guardTypes=[];pod.guardianIds.clear();releasePaidPassenger(w,pod,0,{x:2,z:0});}
   else {const egg=w.spawnEconomic('egg',{x:1,z:0});w.hit(egg,1e8,[],1,'terran',0,1,u.id);}
  }
  if(d.recipe==='purchase'){
   const type=u.unitType as import('../../src/data/sc2-units').UnitType,id=w.nextJob++,pod=w.spawnPod(type,{x:2,z:0},id,1);pod.guardTypes=[];pod.guardianIds.clear();pod.status='opening';
   w.expedition.ledger.push({id,producerId:'t01-paid',family:type,line:familyLine(type),facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});
   if(!releasePaidPassenger(w,pod,0,{x:2,z:0}))throw Error('付费入队预览失败');
  }
  if(d.recipe==='pickup')collectEquipmentResource(w,{id:w.nextId++,minerals:key==='bounty_hero'?equipmentValue(w,'bounty')*6:e.values[0],gas:0});
  if(d.recipe==='growth'){
   if(key==='kill_training')w.starship.numbers.set(e.source+':kills',e.values[0]-1);
   if(key==='hero_growth')w.starship.numbers.set(e.source+':hero-points',e.values[0]-1);
   if(key==='devour'){w.starship.numbers.set('devour-progress',e.values[0]-1);w.pickups.push({id:w.nextId++,x:0,z:0,minerals:e.values[1],gas:0} as never);}
   const victim=key==='pack_kill'?w.addUnit('zergling','zerg',0,2):t!;w.hit(victim,1e10,[],1,'terran',0,1,u.id);
  }
  if(d.recipe==='drone'){const drone=w.spawnEconomic('drone',{x:1,z:1});w.hit(drone,1e10,[],1,'terran',0,1,u.id);}
  if(d.recipe==='evolve'&&key==='training_evolution'){u.rank=e.values[0];w.refreshStats(u);evolveEquipmentMembers(w);}
  if(d.recipe==='hero'&&u.heroId){w.heroes.get(u.heroId)!.skillReady=0;if(!w.castHero(u.heroId,w.starship.battleView?.()))throw Error('英雄套装预览施法失败：'+u.heroId);}
  if(d.recipe==='opening'||d.recipe==='fort'){for(const a of w.allies()){a.nextShotAt=w.time;a.weaponCooldown=0;}}
  evidence(w,f);
 }
 if(f.fired&&elapsed>=4.5&&['moving_extra','light_assault'].includes(key)&&!f.evidence.has('moving-shot')){for(const victim of w.entities.values())if(victim.owner==='zerg')move(victim,u.x+(victim.id%3)*.3,u.z+2);w.hash.rebuild(w.entities.values());u.nextShotAt=w.time;u.weaponCooldown=0;u.shotInterval=u.attackPeriod;w.fire(u,t!);f.evidence.add('moving-shot');}
 if(f.fired&&elapsed>=3&&key==='periodic_trap'&&!f.evidence.has('mine-target')){const mine=w.expedition.support.mines[0];if(mine&&t){move(t,mine.point.x,mine.point.z+1);w.hash.rebuild(w.entities.values());}f.evidence.add('mine-target');}
 if(f.fired&&key==='phantom'&&w.starship.projections.size){u.nextShotAt=Infinity;u.weaponCooldown=Infinity;}
 for(const [id]of w.starship.projections){if(f.seen.has(id))continue;const copy=w.entities.get(id);if(copy){f.seen.add(id);copy.nextShotAt=w.time;copy.weaponCooldown=0;}}
 if(f.fired&&elapsed>=2&&key==='hero_orange'&&u.heroId==='niadra'&&!f.evidence.has('revival-trigger')){damage(w,w.entities.get(f.patientId)!,1e10,t?.id);f.evidence.add('revival-trigger');}
 if(f.fired&&elapsed>=2&&key==='shield_rebuild'&&!f.evidence.has('shield-break')){damage(w,u,u.maxHp*.1,t?.id);w.starship.numbers.set('shield-broken:'+u.id,w.time-equipmentValue(w,'shield_rebuild')+.7);f.evidence.add('shield-break');}
 if(f.fired&&elapsed>=3&&key==='konstant'&&d.previewPhase==='expiry'&&!f.ended){f.ended=true;f.stage='强化正常结束';w.starship.numbers.set('konstant-until',w.time+.8);}
 if(f.fired&&!f.ended&&elapsed>=3&&d.previewPhase!=='cycle'){
  const bodies=w.allies().filter(a=>a.temporary||w.starship.projections.has(a.id));
  if(bodies.length){f.ended=true;f.stage=d.previewPhase==='expiry'?'临近原生到期边界':'实际阵亡与收尾';
   for(const a of bodies){if(d.previewPhase==='death')damage(w,a,1e10,t?.id);else {a.temporaryUntil=w.time+.8;const p=w.starship.projections.get(a.id);if(p)p.until=w.time+.8;const b=w.starship.advancedBodies.get(a.id);if(b)b.until=w.time+.8;}}
   if(d.previewPhase==='expiry')for(const r of w.starship.life.pending.values())if(r.source==='phase')r.until=w.time+.8;
  }
 }
 if(f.fired&&Math.round(elapsed*60)%30===0)evidence(w,f);
}
export function equipmentPreviewSnapshot(w:World,f:EquipmentPreview){return {key:f.data.focusEffect,phase:f.data.previewPhase,description:f.data.description,stage:f.stage,initial:f.initial,observed:f.observed,current:equipmentFixtureSnapshot(w)};}
