import type {World} from '../world';
import {RunState} from '../run-state';
import type {Entity} from '../types';
import {EnemySpecials} from '../combat/enemy-specials';
import {newStarshipRuntime} from '../starship/runtime';
import {settleEquipment} from '../starship/inventory';
import {refreshEquipmentMember} from '../starship/members';
import {equipmentSurvivesWipe} from '../starship/lifecycle';
import {hasCombatPotential} from '../combat/combat-presence';
import {SpecialTerrain} from './terrain';
import type {SpecialActive,SpecialStageKind} from './state';
import {SPECIAL_STAGE_NAMES} from './state';
import {specialCommandState,resumeSpecialCommands,rebaseSpecialActor,restoreSpecialBody} from './combat-state';
interface Parked {
 fields:Record<string,unknown>;terrain:World['terrain'];obstacles:World['obstacles'];
 starship:World['starship'];enemySpecials:World['enemySpecials'];autoWaves:unknown;
 positions:Map<number,{x:number;z:number;slot:number;trailIndex:number}>;wallet:{minerals:number;gas:number};
}
const parked=new WeakMap<World,Parked>(),terrains=new Map<SpecialStageKind,SpecialTerrain>();
export const specialSuspended=(w:World)=>parked.has(w);
function terrain(kind:SpecialStageKind){let t=terrains.get(kind);if(!t){t=new SpecialTerrain(kind);terrains.set(kind,t);}return t;}
/** A copied equipped body must keep the native layer that produced its current pools. */
function transferNativeStats(from:World['starship'],source:Entity,to:World['starship'],target:Entity){
 const native=from.native.get(source);if(native)to.native.set(target,{...native});else to.native.delete(target);
}
/** The frozen normal field remains as its original object graph, including private caches. */
export function parkNormalWorld(w:World,a:SpecialActive,members:Entity[]){
 if(parked.has(w))throw Error('不能嵌套特殊关');
 const record=w as unknown as Record<string,unknown>,fresh=new RunState(),fields:Record<string,unknown>={};
 for(const key of Object.keys(fresh))fields[key]=record[key];
 const oldStarship=w.starship,selected=new Set(members.map(u=>u.id)),children=[...w.entities.values()].filter(u=>u.hp>0&&u.summonOwnerId!==undefined&&selected.has(u.summonOwnerId)&&u.summonKind==='interceptor');
 const originals=[...members,...children];
 const data=structuredClone({members:originals,absorptions:w.terranElites.absorptions.filter(r=>selected.has(r.hunter)),expedition:w.expedition,heroes:w.heroes,wallet:w.wallet,upgrades:w.upgrades,account:oldStarship.account,runConfig:w.runConfig,membersMap:oldStarship.members,boundMembers:oldStarship.boundMembers,nativeHeroes:oldStarship.nativeHeroes,numbers:oldStarship.numbers,cycles:oldStarship.cycles,captured:oldStarship.captured,advanced:oldStarship.advancedBodies,bounty:oldStarship.bounty});
 const saved:Parked={fields,terrain:w.terrain,obstacles:w.obstacles,starship:oldStarship,enemySpecials:w.enemySpecials,autoWaves:record.autoWaves,positions:new Map(members.map(u=>[u.id,{x:u.x,z:u.z,slot:u.slot,trailIndex:u.trailIndex}])),wallet:{...w.wallet}};
 parked.set(w,saved);
 Object.assign(w,fresh,{specialStages:fields.specialStages,expedition:data.expedition,heroes:data.heroes,wallet:data.wallet,upgrades:data.upgrades,runConfig:data.runConfig,difficulty:fields.difficulty,stage:fields.stage,time:fields.time,tick:fields.tick,runId:fields.runId,nextId:fields.nextId,phase:'battle',paused:false});
 w.terranElites.absorptions=data.absorptions;
 w.dashReady=Number(fields.dashReady);w.dashUntil=Number(fields.dashUntil);w.airliftReady=Number(fields.airliftReady);
 record.autoWaves=false;record.scheduledStage=w.stage;record.rngState=((Number(fields.rngState)^Math.imul(w.specialStages.serial,0x9e3779b9))>>>0);
 w.terrain=terrain(a.kind);w.obstacles=(w.terrain as SpecialTerrain).walls.map(o=>({...o}));w.enemySpecials=new EnemySpecials(w);
 w.expedition.ledger=[];w.expedition.pendingFreeDeliveries=[];w.expedition.pendingReceipt=null;w.expedition.pendingTalentLoot=null;w.expedition.eliteRescueRights=[];w.expedition.weaponAreas=[];w.expedition.spells=[];w.expedition.bossLootQueue=[];w.expedition.support.impacts=[];w.expedition.support.mines=[];
 w.expedition.support.burns=[];w.expedition.detectionFields=[];
 Object.assign(w.expedition.support.unique,{packets:[],orbs:[],parasites:{},landing:null,prism:null});
 // Ground loot belongs to one field. Its original records remain frozen in saved.starship.
 for(const [id,p] of Object.entries(data.account.locations))if(p.kind==='ground'){delete data.account.locations[id];delete data.account.items[id];}
 w.starship=newStarshipRuntime(data.account,oldStarship.enabled);w.starship.battleView=oldStarship.battleView;
 w.starship.members=new Map([...data.membersMap].filter(([id])=>selected.has(id)));w.starship.boundMembers=data.boundMembers;
 w.starship.nativeHeroes=new Map([...data.nativeHeroes].filter(([id])=>selected.has(id)));w.starship.numbers=data.numbers;w.starship.cycles=data.cycles;
 w.starship.life.rewindUsed=oldStarship.life.rewindUsed;
 w.starship.captured=new Map([...data.captured].filter(([id])=>selected.has(id)));w.starship.advancedBodies=new Map([...data.advanced].filter(([id])=>selected.has(id)));w.starship.bounty=data.bounty;
 w.anchor={x:0,z:a.kind==='crossing'?47.25:10,facing:Math.PI};w.trail=[{x:w.anchor.x,z:w.anchor.z}];
 w.expedition.zerglingPairs=w.expedition.zerglingPairs.filter(p=>p.members.some(id=>selected.has(id)));
 for(const h of w.heroes.values()){h.awaitingSpawn=false;h.revivePaid=false;}
 const columns=a.kind==='dodge'?2:Math.min(7,Math.ceil(Math.sqrt(members.length))),spacing=a.kind==='dodge'?Math.max(1.2,...members.map(u=>u.unitRadius*2+.25)):1.4;
 for(const [i,u] of data.members.entries()){
  const index=Math.max(0,members.findIndex(v=>v.id===u.id));u.x=(index%columns-(columns-1)/2)*spacing;u.z=w.anchor.z+Math.floor(index/columns)*spacing;u.prev={x:u.x,z:u.z};u.trailIndex=0;u.slot=i;u.velocity={x:0,z:0};u.attackTarget=null;u.pendingTarget=null;u.windup=0;u.action='idle';delete u.cliffTransit;delete u.chargeState;
  w.entities.set(u.id,u);
  transferNativeStats(oldStarship,originals[i],w.starship,u);
 }
 w.missions.enabled=false;w.encounters.enabled=false;record.spawnCells=w.terrain.connectedLocations!(w.anchor,.5,1);
 for(const u of w.allies()){
  if(a.kind!=='dodge'){w.refreshStats(u);continue;}
  // A burrowed/deployed body uses its native mobile stance for this movement-only
  // challenge. The parked body retains its original stance and cooldowns.
  if(u.nativeMode==='lurker_burrowed'||u.mode==='siege'){
   const hp=u.hp,shield=u.shield;
   if(u.nativeMode==='lurker_burrowed'){u.nativeMode=u.desiredNativeMode='lurker';u.nativeModeUntil=undefined;u.activeWeapon=undefined;u.cloaked=false;}
   if(u.mode==='siege'){u.mode=u.desiredMode='tank';u.modeTimer=0;}
   w.refreshStats(u);u.hp=hp;u.shield=shield;
  }
 }
 // Keep the whole entry formation inside the rear boundary, including body
 // radii. Translating together preserves its spacing and avoids clamping the
 // last ranks onto each other. Small formations retain their original entry.
 if(a.kind==='crossing'){
  const bodies=w.allies(),rear=(w.terrain as SpecialTerrain).extent.z;
  const shift=Math.max(0,...bodies.map(u=>u.z+u.unitRadius+.05-rear));
  if(shift>0)for(const u of bodies){u.z-=shift;u.prev={x:u.x,z:u.z};}
 }
 w.hash.rebuild([...w.entities.values()]);w.arrivalVersion++;w.changed();
}
export function resumeNormalWorld(w:World,result:NonNullable<SpecialActive['result']>){
 const a=w.specialStages.active,saved=parked.get(w);if(!a||!saved)return false;
 const ids=new Set(saved.positions.keys()),pairIds=new Set(a.pairs),bodies=[...w.entities.values(),...a.evacuated.values()].filter(u=>u.owner==='terran'&&!u.summonKind&&!u.temporary&&(ids.has(u.id)||u.pairId&&pairIds.has(u.pairId)));
 const child={account:w.starship.account,wallet:{...w.wallet},stats:w.stats,economy:w.economyTotals,members:w.starship.members,numbers:w.starship.numbers,cycles:w.starship.cycles,bounty:w.starship.bounty,pending:w.starship.pendingMembers,revivals:w.zergHeroes.revivals,pairs:w.expedition.zerglingPairs,credits:w.expedition.credits,nextCredit:w.expedition.nextCredit,ammo:w.expedition.support.ammo,heroes:w.heroes,nextId:w.nextId,time:w.time,tick:w.tick,life:w.starship.life,rankRows:a.participants.map(id=>({id,before:a.ranks.get(id)??bodies.find(u=>u.id===id)?.rank??1,after:bodies.find(u=>u.id===id)?.rank??a.ranks.get(id)??1})),bossReceipts:w.expedition.bossLootReceipts};
 const commands=specialCommandState(w),childRuntime=w.starship,childActors=new Map([...w.entities,...a.evacuated]);
 const oldAmmo=(saved.fields.expedition as World['expedition']).support.ammo,elapsed=child.time-Number(saved.fields.time);
 // Unclaimed challenge drops expire. Restore every pre-existing normal-field drop exactly.
 for(const [id,p] of Object.entries(child.account.locations))if(p.kind==='ground'){delete child.account.locations[id];delete child.account.items[id];}
 for(const [id,p] of Object.entries(saved.starship.account.locations))if(p.kind==='ground'){child.account.locations[id]=p;child.account.items[id]=saved.starship.account.items[id];}
 const state=w.specialStages;
 Object.assign(w,saved.fields);w.terrain=saved.terrain;w.obstacles=saved.obstacles;w.enemySpecials=saved.enemySpecials;w.starship=saved.starship;(w as unknown as Record<string,unknown>).autoWaves=saved.autoWaves;
 Object.assign(w.starship.account,child.account);w.specialStages=state;w.specialStages.active=null;w.specialStages.last={kind:a.kind,result,ranks:child.rankRows};parked.delete(w);
 w.wallet.minerals+=child.wallet.minerals-saved.wallet.minerals;w.wallet.gas+=child.wallet.gas-saved.wallet.gas;w.expedition.support.ammo+=child.ammo-oldAmmo;w.nextId=Math.max(w.nextId,child.nextId);
 if(a.kind!=='dodge')resumeSpecialCommands(w,commands,elapsed,new Set(a.participants));
 for(const key of Object.keys(w.stats) as (keyof World['stats'])[])w.stats[key]+=child.stats[key];
 for(const key of ['passive','drops','clear','cards','production','purchases'] as const){w.economyTotals[key].minerals+=child.economy[key].minerals;w.economyTotals[key].gas+=child.economy[key].gas;}
 w.economyTotals.rerolls+=child.economy.rerolls;
 for(const id of a.participants){
  const old=w.entities.get(id),updated=bodies.find(u=>u.id===id);
  if(!old)continue;
  if(a.kind==='dodge'&&updated){refreshEquipmentMember(w,old,()=>{old.rank=updated.rank;if(old.heroId){const h=w.heroes.get(old.heroId);if(h)h.rank=old.rank;}});continue;}
  if(!updated){old.hp=0;old.shield=0;old.deadAt=w.time;old.action='dead';old.attackTarget=null;old.pendingTarget=null;continue;}
  const pos=saved.positions.get(id)!;restoreSpecialBody(old,updated,pos,elapsed);Object.assign(old,{slot:pos.slot,trailIndex:pos.trailIndex});if(old.hp<=0){old.deadAt=w.time;old.action='dead';}
  if(old.heroId){const record=w.heroes.get(old.heroId),h=child.heroes.get(old.heroId);if(h){const updated={...h,rank:old.rank,skillReady:w.time+Math.max(0,h.skillReady-child.time)};if(record)Object.assign(record,updated);else w.heroes.set(old.heroId,updated);}}
  transferNativeStats(childRuntime,updated,w.starship,old);
 }
 for(const u of bodies)if(!ids.has(u.id)&&u.hp>0){rebaseSpecialActor(u,elapsed);const origin=[...saved.positions.values()][0]??w.anchor,p=w.freePosition(u.unitType,origin,0,5)??origin;Object.assign(u,p,{prev:{...p}});w.entities.set(u.id,u);transferNativeStats(childRuntime,u,w.starship,u);}
 if(a.kind!=='dodge'){
  // Interceptors are paid, targetable children. Keep their actual losses and
  // replacements, rather than reviving the parked complement for free.
  for(const old of w.entities.values())if(old.summonKind==='interceptor'&&ids.has(old.summonOwnerId!)){
   const updated=childActors.get(old.id);if(updated){restoreSpecialBody(old,updated,{x:old.x,z:old.z},elapsed);transferNativeStats(childRuntime,updated,w.starship,old);}
   else {old.hp=0;old.shield=0;old.deadAt=w.time;old.action='dead';}
  }
  for(const u of childActors.values())if(u.summonKind==='interceptor'&&ids.has(u.summonOwnerId!)&&!w.entities.has(u.id)&&u.hp>0){
   const owner=w.entities.get(u.summonOwnerId!)!;restoreSpecialBody(u,u,owner,elapsed);w.entities.set(u.id,u);transferNativeStats(childRuntime,u,w.starship,u);
  }
  // A pending phase revival owns real projection actors until it resolves.
  // Transfer only that recovery group; unrelated temporary allies stay frozen.
  for(const id of a.participants){const pending=child.life.pending.get(id);if(pending?.source!=='phase')continue;
   const origin=w.entities.get(id)??w.anchor;if(pending.phaseWon)pending.phaseWon={x:origin.x,z:origin.z};
   const group=new Set(pending.projections);
   for(const u of childActors.values())if(group.has(u.id)||group.has(u.summonOwnerId!)){
    const projection=childRuntime.projections.get(u.id);if(!projection)continue;
    const position=w.freePosition(u.unitType,origin,0,5)??origin;restoreSpecialBody(u,u,position,elapsed);
    projection.until-=elapsed;rebaseSpecialActor(projection.snapshot,elapsed);w.entities.set(u.id,u);w.starship.projections.set(u.id,projection);transferNativeStats(childRuntime,u,w.starship,u);
    const member=childRuntime.members.get(u.id);if(member)w.starship.members.set(u.id,member);
    const hero=childRuntime.nativeHeroes.get(u.id);if(hero){hero.record.skillReady=Math.max(0,hero.record.skillReady-elapsed);w.starship.nativeHeroes.set(u.id,hero);}
   }
  }
  for(const id of a.participants){const native=childRuntime.nativeHeroes.get(id),old=w.starship.nativeHeroes.get(id);if(native&&old)Object.assign(old.record,native.record,{skillReady:Math.max(0,native.record.skillReady-elapsed)});}
 }
 for(const pair of child.pairs){if(!pairIds.has(pair.id))continue;const old=w.expedition.zerglingPairs.find(p=>p.id===pair.id);if(old)Object.assign(old,pair,{regrowAt:pair.regrowAt===null?null:w.tick+Math.max(0,pair.regrowAt-child.tick)});}
 w.expedition.credits=child.credits;w.expedition.nextCredit=child.nextCredit;
 for(const id of a.participants){const pending=child.life.pending.get(id);if(pending){pending.death-=elapsed;pending.until-=elapsed;pending.body=w.entities.get(id)??pending.body;if(!w.entities.has(id))Object.assign(pending.body,w.anchor,{prev:{x:w.anchor.x,z:w.anchor.z}});w.starship.life.pending.set(id,pending);}else w.starship.life.pending.delete(id);}
 w.starship.life.rewindUsed=child.life.rewindUsed;
 for(const u of bodies){const member=child.members.get(u.id);if(member)w.starship.members.set(u.id,member);if(w.starship.life.roster.has(u.id))w.starship.life.roster.set(u.id,w.entities.get(u.id)??u);}
 const numberClock=/(:ready$|:last$|^.*-(?:ready|until|last|next|start|tick|time|phase|fire)$|^(?:rage-until|assault-until|drop-speed|moving-extra|pursuit|last-dealt|shield-broken|rewind-hero-ready):)/;
 for(const key of w.starship.numbers.keys())if(!child.numbers.has(key))w.starship.numbers.delete(key);
 for(const [key,value] of child.numbers)if(value!==w.starship.numbers.get(key))w.starship.numbers.set(key,numberClock.test(key)&&Number.isFinite(value)?Math.max(0,value-elapsed):value);
 for(const [key,value] of child.cycles)if(value!==w.starship.cycles.get(key))w.starship.cycles.set(key,Math.max(0,value-elapsed));
 w.starship.bounty=child.bounty;w.starship.pendingMembers.push(...child.pending);
 for(const revival of child.revivals){rebaseSpecialActor(revival,elapsed);w.zergHeroes.revivals.push(revival);}
 // Boss cards are collected in the challenge, then resolved by the native receipt system after return.
 for(const card of a.cards){if(card.bossLootReceipt&&!w.expedition.bossLootReceipts.includes(card.bossLootReceipt))w.expedition.bossLootReceipts.push(card.bossLootReceipt);w.rewardDrops.push({...card,x:w.anchor.x,z:w.anchor.z});w.collectRewardDrop(card.id);}
 w.hash.invalidatePlanes();w.input={x:0,z:0};w.arrivalVersion++;
 if(result==='failed'&&a.kind!=='dodge'&&!w.allies().some(u=>hasCombatPotential(w,u))&&!equipmentSurvivesWipe(w)){w.phase='lost';settleEquipment(w.starship.account,'failure');}
 w.announce(SPECIAL_STAGE_NAMES[a.kind]+' · '+(result==='success'?'挑战成功':result==='timeout'?'时间结束':result==='quit'?'已退出':'挑战失败'));return true;
}
