import {equipmentPresentation,markEquipmentReplay} from './presentation';
import type {World} from '../world';
import type {Body,Entity,HeroCast,Point} from '../types';
import {HEROES} from '../../data/heroes';
import {zergHeroGrowth,ZERG_HERO_RULES} from '../../data/zerg-heroes';
import {protossHeroGrowth} from '../../data/protoss-heroes';
import {activeEquipmentEffects} from './modules';
import {equipmentBoundBody,refreshEquipmentMember} from './members';
import {equipmentUnitTotals} from './runtime';
import {identityFactors} from './attributes';
import {equipmentHoldFactor} from './combat';
import {equipmentNativeFactor} from './native-effects';
import {giveEquipmentBarrier} from './defense';
import {observeRecovery} from '../observation';
import {translate} from '../movement/steering';
import {talentModifiers} from '../combat/expedition-combat';

interface CastReceipt {tier:number;source:Entity;weapon:number;tentacle:number;hits:Map<number,number>;control:Map<number,number>;kills:Set<number>;done:boolean;pulled:boolean}
interface HeroJob {kind:'replay'|'area'|'hits'|'yamato'|'tentacles'|'banelings'|'stasis';at:number;cast:HeroCast;receipt:CastReceipt;damage:number;radius?:number;targets?:number[];reverse?:boolean;angle?:number;until?:number;next?:number}
interface ShieldReceipt {tier:number;source:number;until:number;patients:Map<number,number>;used:Set<number>}
export interface EquipmentHeroRuntime {
 casts:WeakMap<HeroCast,CastReceipt>;derived:WeakSet<HeroCast>;jobs:HeroJob[];seals:Map<number,number>;
 devour:Map<number,{until:number;tier:number}>;carriers:Map<number,{until:number;factor:number}>;
 shields:Map<number,ShieldReceipt>;revivals:Map<number,number>;spread:WeakSet<object>;
 veil:Map<number,{source:number;marked:boolean}>;veilReady:Set<number>;banelings:Map<number,number>;
}
export function newEquipmentHeroRuntime():EquipmentHeroRuntime{return {casts:new WeakMap(),derived:new WeakSet(),jobs:[],seals:new Map(),devour:new Map(),carriers:new Map(),shields:new Map(),revivals:new Map(),spread:new WeakSet(),veil:new Map(),veilReady:new Set(),banelings:new Map()};}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function equipmentHeroTier(w:World,u:Entity){return Math.max(0,...activeEquipmentEffects(w).filter(e=>e.key==='hero_orange'&&equipmentBoundBody(w,e,u)).map(e=>e.values[0]));}
function legal(w:World,source:Entity,b:Body,ground=false){return b.hp>0&&b.owner!==source.owner&&w.visibleTo(b,source.owner)&&(!ground||!b.flying&&!b.attributes.includes('Structure'));}
function area(w:World,source:Entity,p:Point,radius:number,ground=false){return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>legal(w,source,b,ground)&&distance(b,p)<=radius+b.unitRadius&&(!w.terrain||w.terrain.lineOfFire(p,b,false,b.flying))).sort((a,b)=>distance(a,p)-distance(b,p)||a.id-b.id);}
/** Pure ordinary cycle budget: no attack commitment, RNG, true-DPS allocation or proc is run. */
export function equipmentHeroWeaponCycle(w:World,u:Entity){const t=equipmentUnitTotals(w,u),hits=u.heroId?HEROES[u.heroId].attacks:1,period=u.attackPeriod;return (u.weaponDamage*(1+t.native)*hits+(u.weaponDamage>0?t.dps*identityFactors(u).dps*period:0))*(1+t.attack)*equipmentHoldFactor(w);}
export function captureEquipmentHeroCasts(w:World,u:Entity,casts:HeroCast[]){const tier=equipmentHeroTier(w,u);if(!tier)return;for(const cast of casts)if(!w.starship.hero.casts.has(cast)&&!w.starship.hero.derived.has(cast))w.starship.hero.casts.set(cast,{tier,source:structuredClone(u),weapon:equipmentHeroWeaponCycle(w,u),tentacle:ZERG_HERO_RULES.hots_leviathan.tentacleDamage*zergHeroGrowth(cast.rank??u.rank).passive*equipmentNativeFactor(w,u),hits:new Map(),control:new Map(),kills:new Set(),done:false,pulled:false});}
/** Called only after a real native hit/status, so a miss cannot manufacture a follow-up. */
export function equipmentHeroHit(w:World,cast:HeroCast,target:Body,before:number,ratio=1){const r=w.starship.hero.casts.get(cast);if(!r)return;r.hits.set(target.id,ratio);if(before>0&&target.hp<=0)r.kills.add(target.id);if(cast.hero==='tosh'&&target.hp>0&&!target.attributes.includes('Structure'))w.starship.hero.seals.set(target.id,Math.max(w.starship.hero.seals.get(target.id)??0,w.time+(r.tier===2?8:4)));if(cast.hero==='vorazun'){const u=w.entities.get(target.id);if(u)r.control.set(u.id,u.enemyTier==='boss'||u.enemyTier==='lord'?Math.max(u.moveSlowUntil??0,u.attackSlowUntil??0):u.stoppedUntil??0);}}
export function equipmentHeroPreImpact(w:World,cast:HeroCast){const r=w.starship.hero.casts.get(cast);if(!r||r.tier!==2||r.pulled||cast.hero!=='tychus'||w.time+1e-8<cast.at-.3)return;r.pulled=true;for(const b of area(w,r.source,cast.point,HEROES.tychus.radius)){const u=w.entities.get(b.id);if(!u||u.attributes.includes('Structure'))continue;const d=distance(u,cast.point),move=Math.min(2,d);if(d>0)translate(u,{x:(cast.point.x-u.x)/d*move,z:(cast.point.z-u.z)/d*move},u.unitRadius,u.flying,w.obstacles,w.mapHalf,w.terrain);}w.hash.invalidatePlanes();}
function job(w:World,cast:HeroCast,r:CastReceipt,kind:HeroJob['kind'],delay:number,damage:number,extra:Partial<HeroJob>={}){w.starship.hero.jobs.push({kind,at:w.time+delay,cast:structuredClone(cast),receipt:r,damage,...extra});}
export function completeEquipmentHeroCast(w:World,cast:HeroCast){const r=w.starship.hero.casts.get(cast);if(!r||r.done||cast.phase==='dot'||cast.at>w.time+1e-8)return;r.done=true;const corrupt=r.tier===2,hero=cast.hero;
 if(hero==='raynor')for(const delay of corrupt?[.3,.6]:[.3])job(w,cast,r,'replay',delay,cast.damage*(corrupt?.8:.6));
 if(hero==='tychus'){const count=corrupt?5:3;for(let i=0;i<count;i++){const angle=2*Math.PI*i/count;job(w,cast,r,'area',0,cast.damage*(corrupt?.3:.2),{radius:2,cast:{...cast,point:{x:cast.point.x+Math.sin(angle)*2,z:cast.point.z+Math.cos(angle)*2}}});}}
 if(hero==='nova'&&(corrupt||r.kills.size)){const original=w.body(cast.target),target=corrupt&&original&&legal(w,r.source,original)&&!original.attributes.includes('Structure')?original:area(w,r.source,r.source,HEROES.nova.skillRange).find(b=>b.id!==cast.target&&!b.attributes.includes('Structure')&&w.hasAttackLine(r.source,b));if(target)job(w,cast,r,'replay',.3,cast.damage*(corrupt?1:.6),{cast:{...cast,origin:{x:r.source.x,z:r.source.z},point:{x:target.x,z:target.z},target:target.id}});}
 if(hero==='tosh'&&corrupt)job(w,cast,r,'hits',.5,cast.damage*.5,{targets:[...r.hits.keys()]});
 if(hero==='yamato_battlecruiser'&&r.hits.has(cast.target)){const others=area(w,r.source,cast.point,HEROES.yamato_battlecruiser.skillRange).filter(b=>b.id!==cast.target).slice(0,2);for(const b of others){w.visual('skill-launch',r.source,b,cast.id);job(w,cast,r,'yamato',.25,cast.damage*.5,{targets:[b.id]});}if(corrupt)job(w,cast,r,'yamato',1,cast.damage,{targets:[cast.target]});}
 if(hero==='kerrigan')job(w,cast,r,'area',0,r.weapon,{radius:4,cast:{...cast,point:{x:w.entities.get(cast.source)?.x??r.source.x,z:w.entities.get(cast.source)?.z??r.source.z}}});
 if(hero==='zagara'&&cast.pulseIndex===2)job(w,cast,r,'banelings',0,0,{until:w.time+(corrupt?8:6)});
 if(hero==='dehaka'&&r.hits.size){const u=w.entities.get(cast.source);if(u&&u.hp>0)refreshEquipmentMember(w,u,()=>w.starship.hero.devour.set(u.id,{until:w.time+(corrupt?12:8),tier:r.tier}));}
 if(hero==='stukov'&&corrupt)job(w,cast,r,'area',1,cast.damage*3.25/6,{radius:5,until:w.time+6,next:1});
 if(hero==='hots_leviathan'&&(corrupt||cast.pulseIndex===2))job(w,cast,r,'tentacles',0,r.tentacle*(corrupt?1.5:1),{radius:6});
 if(hero==='zeratul'&&r.hits.size)for(const delay of corrupt?[.35,.7]:[.35])job(w,cast,r,'hits',delay,cast.damage*(corrupt?.8:.6),{targets:[...r.hits.keys()]});
 if(hero==='alarak'){job(w,cast,r,'replay',0,cast.damage*(corrupt?1:.5),{reverse:true});if(corrupt)for(const angle of [-Math.PI/9,Math.PI/9])job(w,cast,r,'replay',0,cast.damage*.5,{angle});}
 if(hero==='fenix')job(w,cast,r,'area',.5,cast.damage*.6,{radius:HEROES.fenix.radius});
 if(hero==='vorazun'&&r.hits.size)job(w,cast,r,'stasis',0,r.weapon*2,{targets:[...r.hits.keys()]});
 if(hero==='purifier_flagship'){w.starship.hero.carriers.set(cast.source,{until:w.time+(corrupt?8:6),factor:corrupt?3:2});for(const child of w.entities.values())if(child.hp>0&&child.summonKind==='interceptor'&&child.summonOwnerId===cast.source)w.refreshStats(child);if(corrupt)job(w,cast,r,'area',1,cast.damage*.8,{radius:HEROES.purifier_flagship.radius});}
}
export function equipmentSkillSealed(w:World,u:Entity){return (w.starship.hero.seals.get(u.id)??0)>w.time;}
export function equipmentDevourWeapon(w:World,u:Entity){const b=w.starship.hero.devour.get(u.id);return b&&b.until>w.time?b.tier===2?2:1.5:1;}
export function equipmentDevourSpeed(w:World,u:Entity){const b=w.starship.hero.devour.get(u.id);return b&&b.until>w.time?b.tier===2?1.6:1.3:1;}
export function equipmentDevourDefense(w:World,u:Entity){const b=w.starship.hero.devour.get(u.id);return b?.tier===2&&b.until>w.time?.75:1;}
export function equipmentCarrierSpeed(w:World,u:Entity){const b=w.starship.hero.carriers.get(u.id);return Math.max((u.protossCombat?.overdriveUntil??0)>w.time?2:1,b&&b.until>w.time?b.factor:1);}
export function equipmentSwannTargets(w:World,u:Entity){const tier=equipmentHeroTier(w,u);return tier===2?Infinity:tier===1?10:7;}
export function equipmentSwannProtection(w:World,u:Entity){const tier=equipmentHeroTier(w,u);return tier===2?10:tier===1?8:5;}
export function equipmentKerriganAbsorbed(w:World,u:Entity,amount:number){if(amount<=0||equipmentHeroTier(w,u)!==2)return;const key='kerrigan-absorbed:'+u.id,total=(w.starship.numbers.get(key)??0)+amount;w.starship.numbers.set(key,total);if(total<u.maxHp*.5||w.time<(w.starship.numbers.get(key+':ready')??0))return;w.starship.numbers.set(key,0);w.starship.numbers.set(key+':ready',w.time+8);for(const b of area(w,u,u,5)){w.hit(b,total*.5,[],1,u.owner,0,0,u.id);w.visual('skill-impact',u,b);} }
export function equipmentInfectionDeath(w:World,e:Entity){for(const infection of [...w.zergHeroes.infections]){if(infection.target!==e.id||infection.until<=w.time||w.starship.hero.spread.has(infection))continue;const u=w.entities.get(infection.source);if(!u||!equipmentHeroTier(w,u))continue;for(const target of area(w,u,e,5).filter(b=>b.id!==e.id&&!b.attributes.includes('Structure')).slice(0,3)){if(w.zergHeroes.infections.some(x=>x.source===u.id&&x.target===target.id&&x.until>w.time&&!w.starship.hero.spread.has(x)))continue;w.zergHeroes.infections=w.zergHeroes.infections.filter(x=>x.source!==u.id||x.target!==target.id);const spread={source:u.id,target:target.id,rank:infection.rank,until:w.time+8};w.starship.hero.spread.add(spread);w.zergHeroes.infections.push(spread);w.visual('hero-infection-pool',u,target);}}}
export function equipmentRevivalWindow(w:World,u:Entity,id:number){const tier=equipmentHeroTier(w,u);if(tier)w.starship.hero.revivals.set(id,tier);return tier===2?1:0;}
export function equipmentRevived(w:World,id:number,u:Entity){if(w.starship.hero.revivals.has(id))giveEquipmentBarrier(w,u,'niadra:'+id,u.maxHp*.3,5);}
export function equipmentShieldWindow(w:World,u:Entity,id:number,until:number,targets:Entity[]){const tier=equipmentHeroTier(w,u);if(tier)w.starship.hero.shields.set(id,{tier,source:u.id,until,patients:new Map(targets.map(a=>[a.id,a.maxShield??0])),used:new Set()});}
export function equipmentShieldBroken(w:World,u:Entity,before:number,actuallyBroken=(u.shield??0)<=0){if(before<=0||!actuallyBroken||u.hp<=0)return;for(const r of w.starship.hero.shields.values()){const maximum=r.patients.get(u.id);if(r.until<=w.time||!maximum||r.used.has(u.id))continue;r.used.add(u.id);const amount=Math.min(maximum*.25,Math.max(0,(u.maxShield??0)-(u.shield??0)));u.shield=(u.shield??0)+amount;w.stats.healed+=amount;observeRecovery(w,r.source,u,0,amount);w.visual('barrier-start',u);}}
export function equipmentShieldPulse(w:World,id:number,total:number){const r=w.starship.hero.shields.get(id),source=r&&w.entities.get(r.source);if(!r||r.tier!==2||total<=0||!source)return;const targets=area(w,source,source,8);for(const b of targets){w.hit(b,total*.3/targets.length,[],1,source.owner,0,0,source.id);w.visual('skill-impact',source,b,id);}}
export function equipmentFenixOverdrive(w:World,u:Entity){if(equipmentHeroTier(w,u)!==2)return;const target=area(w,u,u,HEROES.fenix.skillRange).find(b=>w.hasAttackLine(u,b));if(!target)return;const damage=HEROES.fenix.skillDamage*protossHeroGrowth(u.rank).skill/9200*equipmentNativeFactor(w,u)*(1+(talentModifiers(w,u,'hero').abilityDamagePct??0));w.visual('skill-launch',u,target);for(const b of area(w,u,target,HEROES.fenix.radius)){w.hit(b,damage,[],1,u.owner,0,1,u.id);w.visual('skill-impact',u,b);}}
export function equipmentVeilStarted(w:World,u:Entity,source:Entity){w.starship.hero.veil.set(u.id,{source:source.id,marked:equipmentHeroTier(w,source)===2});}
export function equipmentVeilEnded(w:World,u:Entity){const r=w.starship.hero.veil.get(u.id);if(r?.marked)w.starship.hero.veilReady.add(u.id);w.starship.hero.veil.delete(u.id);}
/** One actual ordinary packet, before armor. It does not go through attackHit or start a new cycle. */
export function equipmentVeilAttack(w:World,u:Entity,target:Body,damage:number,bonuses:{attribute:string;amount:number}[],hits:number,crit:number){if(!w.starship.hero.veilReady.has(u.id)||target.owner===u.owner)return;w.starship.hero.veilReady.delete(u.id);if(target.hp<=0)return;w.hit(target,damage*hits*crit*.5,bonuses.map(b=>({...b,amount:b.amount*hits*crit*.5})),1,u.owner,.5,0,u.id);w.visual('weapon-area',u,target);}
function spawnBanelings(w:World,j:HeroJob){const count=j.receipt.tier===2?6:3,points:Point[]=[];for(let i=0;i<count;i++){let selected:Point|null=null;for(let n=0;n<24&&!selected;n++){const angle=(i*24+n)*2.399963,p=w.freePosition('baneling',{x:j.cast.point.x+Math.sin(angle)*(1+n*.15),z:j.cast.point.z+Math.cos(angle)*(1+n*.15)},0,2);if(p&&points.every(q=>distance(p,q)>.7))selected=p;}if(!selected)return false;points.push(selected);}for(const p of points){const u=w.addUnit('baneling','terran',p.x,p.z,j.cast.rank??j.receipt.source.rank);u.temporary=true;u.temporaryKind='hero-baneling';u.temporaryUntil=j.until;u.summonOwnerId=j.cast.source;w.starship.hero.banelings.set(u.id,equipmentNativeFactor(w,j.receipt.source)*(j.receipt.tier===2?1.5:1));w.refreshStats(u,true);w.visual('hero-hatch',j.receipt.source,u);}return true;}
export function equipmentBanelingFactor(w:World,u:Entity){return w.starship.hero.banelings.get(u.id)??1;}
export function tickEquipmentHeroes(w:World){const state=w.starship.hero;if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 for(const [id,b] of state.devour)if(b.until<=w.time){state.devour.delete(id);const u=w.entities.get(id);if(u&&u.hp>0)refreshEquipmentMember(w,u,()=>{});}
 for(const [id,b] of state.carriers)if(b.until<=w.time){state.carriers.delete(id);for(const u of w.entities.values())if(u.hp>0&&u.summonKind==='interceptor'&&u.summonOwnerId===id)w.refreshStats(u);}
 for(const [id,until] of state.seals)if(until<=w.time)state.seals.delete(id);for(const [id,r] of state.shields)if(r.until<=w.time)state.shields.delete(id);
 const pending:HeroJob[]=[];for(const j of state.jobs){if(j.at>w.time+1e-8){pending.push(j);continue;}const {cast,receipt:r}=j,source=r.source;
  if(j.kind==='replay'){const replay:HeroCast={...cast,id:w.nextId++,at:w.time+(cast.phase==='line-travel'?.2:0),damage:j.damage,progress:0,hitIds:[],launched:false};if(j.reverse){const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),end={x:cast.origin.x+Math.sin(angle)*HEROES[cast.hero].length,z:cast.origin.z+Math.cos(angle)*HEROES[cast.hero].length};replay.origin=end;replay.point={...cast.origin};}if(j.angle){const angle=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z)+j.angle;replay.point={x:cast.origin.x+Math.sin(angle)*HEROES[cast.hero].length,z:cast.origin.z+Math.cos(angle)*HEROES[cast.hero].length};}replay.presentationLaunch={...replay.origin,facing:Math.atan2(replay.point.x-replay.origin.x,replay.point.z-replay.origin.z),poseSeconds:0};state.derived.add(replay);w.heroCasts.push(replay);markEquipmentReplay(w,replay,source);continue;}
  if(j.kind==='banelings'){if(w.time<(j.until??0)&&!spawnBanelings(w,j))pending.push(j);continue;}
  if(j.kind==='stasis'){const waiting:number[]=[];for(const id of j.targets??[]){const u=w.entities.get(id);if(!u||!legal(w,source,u)||u.attributes.includes('Structure'))continue;const until=r.control.get(id)??0;if(until>w.time+1e-8){waiting.push(id);continue;}w.hit(u,j.damage,[],1,source.owner,0,0,source.id);w.visual('skill-impact',source,u,cast.id);}if(waiting.length)pending.push({...j,targets:waiting});continue;}
  if(j.kind==='hits'||j.kind==='yamato'){for(const id of j.targets??[]){const b=w.body(id);if(b&&legal(w,source,b,cast.hero==='zeratul')){w.hit(b,j.damage*(j.kind==='hits'?(r.hits.get(id)??1):1),[],1,source.owner,0,1,source.id);w.visual('skill-impact',source,b,cast.id);}}continue;}
  const targets=area(w,source,cast.point,j.radius??0);if(j.kind==='tentacles'){for(const b of targets.filter(b=>!b.attributes.includes('Structure')).slice(0,4)){w.hit(b,j.damage,[],1,source.owner,0,0,source.id);w.visual('hero-tentacle',source,b,cast.id);}continue;}
  equipmentPresentation(w,'hero-extra',source,{...source,id:0,x:cast.point.x,z:cast.point.z,flying:false},cast.hero,j.radius);
  for(const b of targets){w.hit(b,j.damage,[],1,source.owner,0,1,source.id);w.visual('skill-impact',source,b,cast.id);}if(j.next&&j.until){j.at+=j.next;if(j.at<=j.until+1e-8)pending.push(j);}
 }state.jobs=pending;
}
export function clearEquipmentHeroStage(w:World){const affected=new Set([...w.starship.hero.devour.keys(),...w.starship.hero.carriers.keys()]);w.starship.hero=newEquipmentHeroRuntime();for(const u of w.entities.values())if(u.hp>0&&(affected.has(u.id)||affected.has(u.summonOwnerId??-1)))w.refreshStats(u);}
