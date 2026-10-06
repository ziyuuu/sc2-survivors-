import {observeRecovery} from '../observation';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {WeaponFlight} from './weapon-flight';
import {isProtossEliteId,protossEliteArmor} from '../../data/protoss-elites';
import {eliteFixedGrowth} from '../../data/terran-elites';
import {SOURCE_ABILITIES,SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {unitData,talentModifiers} from './expedition-combat';
import {inWeaponArc} from './weapon-patterns';
import {clearLine,translate} from '../movement/steering';
import {permanentTeamBody,nativeShieldBody,teamEntryBarrier,teamRange} from './team-auras';

type Bonus={attribute:string;amount:number};
/** Authored target multipliers replace the source weapon's matching bonus track. */
export function protossEliteBonuses(u:Entity,bonuses:Bonus[]){const attr=['adept.1','phoenix.1'].includes(u.eliteId??'')?'Light':['stalker.3','immortal.1','void_ray.1'].includes(u.eliteId??'')?'Armored':null;return attr?bonuses.filter(b=>b.attribute!==attr):bonuses;}
export interface ProtossEliteCombat {cycles:number;lastFire:number;target:number|null;stacks:number;stackUntil:number;lockAt:number;opening:number;openingTarget:number|null;charge:number;episode:boolean;ready:number;boostUntil:number;shieldBreakReady:number;stored:number;restored:number;budgetAt:number;barrier:number;barrierUntil:number;chargedStrike:boolean;overdriveUntil:number;overdriveReady:number}
export interface ProtossEliteField {id:number;source:Entity;point:Point;kind:'guardian'|'storm'|'web'|'fire';radius:number;amount:number;next:number;until:number;period:number}
export interface ProtossEliteLine {id:number;source:Entity;from:Point;points:Point[];index:number;next:number;period:number;radius:number;damage:number;bonuses:Bonus[];target:number;hits:number[];crit:number;apm:boolean;armorPen:number;air:boolean;kind:'thermal'|'refraction'|'pierce'}
export interface ProtossEliteEcho {id:number;source:Entity;point:Point;target:number;at:number;damage:number;bonuses:Bonus[]}
export interface ProtossEliteDebuff {source:number;target:number;until:number;speed:number;move:number;vulnerability:number}
export interface ProtossEliteRun {fields:ProtossEliteField[];lines:ProtossEliteLine[];echoes:ProtossEliteEcho[];marks:{source:number;target:number;hits:number;until:number}[];debuffs:ProtossEliteDebuff[];lifts:{source:number;target:number;until:number;wasFlying:boolean;originalStop:number}[];heat:{source:number;target:number;since:number;last:number}[];gates:Record<string,number>}
export const newProtossEliteRun=():ProtossEliteRun=>({fields:[],lines:[],echoes:[],marks:[],debuffs:[],lifts:[],heat:[],gates:{}});
export const revisedProtossElite=(u:Entity)=>u.team==='player'&&!u.heroId&&!u.summonKind&&isProtossEliteId(u.eliteId);
export const protossEliteCombat=(u:Entity):ProtossEliteCombat=>u.protossEliteCombat??(u.protossEliteCombat={cycles:0,lastFire:-100,target:null,stacks:0,stackUntil:0,lockAt:0,opening:0,openingTarget:null,charge:0,episode:false,ready:0,boostUntil:0,shieldBreakReady:0,stored:0,restored:0,budgetAt:0,barrier:0,barrierUntil:0,chargedStrike:false,overdriveUntil:0,overdriveReady:0});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const boss=(b:Body)=>'enemyTier' in b&&['boss','lord'].includes(String(b.enemyTier));
export function protossEliteEnemies(w:World,u:Entity,p:Point,r:number,plane:'ground'|'air'|'both'='both'):Body[]{return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.hp>0&&b.owner!==u.owner&&(plane==='both'||b.flying===(plane==='air'))&&dist(p,b)<=r+b.unitRadius&&w.visibleTo(b,u.owner)&&(!w.terrain||w.terrain.lineOfFire(p,b,u.flying,b.flying))&&(u.flying||b.flying||clearLine(p,b,0,w.obstacles)));}
function debuff(w:World,u:Entity,b:Body,seconds:number,v:Partial<Pick<ProtossEliteDebuff,'speed'|'move'|'vulnerability'>>){let d=w.protossElites.debuffs.find(d=>d.source===u.id&&d.target===b.id);if(!d){d={source:u.id,target:b.id,until:0,speed:0,move:0,vulnerability:0};w.protossElites.debuffs.push(d);}for(const key of ['speed','move','vulnerability']as const)if(v[key]!==undefined)d[key]=Math.max(d[key],v[key]!);d.until=w.time+seconds;}
export function protossEliteDebuff(w:World,b:Body,key:'speed'|'move'){return w.protossElites.debuffs.reduce((n,d)=>d.target===b.id&&d.until>w.time?Math.max(n,d[key]):n,0);}
export function protossEliteStats(w:World,u:Entity){const result={damage:1,speed:1,armor:0,move:1,shield:1};if(!revisedProtossElite(u))return result;const s=protossEliteCombat(u),id=u.eliteId!;result.armor=protossEliteArmor(id as Parameters<typeof protossEliteArmor>[0],u.rank);
 if(id==='zealot.1'&&s.stackUntil>w.time)result.speed=1+s.stacks*.35;
 if(id==='adept.2')result.move=1.35;if(id==='phoenix.1')result.move=1.2;if(id==='void_ray.1')result.move=.8;return result;
}
export function protossEliteMainFactor(u:Entity,b:Body){if(!revisedProtossElite(u))return 1;const id=u.eliteId!,s=u.protossEliteCombat;let factor=1;
 if(id==='adept.1'&&b.attributes.includes('Light'))factor*=1.6;
 if(id==='phoenix.1'&&b.attributes.includes('Light'))factor*=1.6;
 if(b.attributes.includes('Armored'))factor*=id==='stalker.3'||id==='colossus.2'?2.5:id==='immortal.1'?3:id==='void_ray.1'?1.5:1;
 if(id==='immortal.1')factor*=1+(s?.stacks??0)*.25;
 if(id==='void_ray.1')factor*=1+4*Math.min(1,Math.max(0,(s?.lastFire??0)-(s?.lockAt??0))/5);
 if(id==='phoenix.2'&&b.flying&&'protossLiftedBy' in b&&b.protossLiftedBy===u.id)factor*=3;
 return factor;
}
export function protossEliteDefense(w:World,b:Body){const u=w.entities.get(b.id);if(!u||!revisedProtossElite(u))return 0;return u.eliteId==='carrier.3'?.3:u.eliteId==='immortal.2'&&protossEliteCombat(u).boostUntil>w.time?.3:0;}
export function absorbProtossEliteBarrier(w:World,u:Entity,amount:number){if(!revisedProtossElite(u))return amount;const s=protossEliteCombat(u);if(s.barrierUntil<=w.time)return amount;const absorbed=Math.min(s.barrier,amount);s.barrier-=absorbed;return amount-absorbed;}
function restoreShield(w:World,u:Entity,amount:number,observedSource:Entity=u){const gain=Math.min(Math.max(0,(u.maxShield??0)-(u.shield??0)),Math.max(0,amount));u.shield=(u.shield??0)+gain;w.stats.healed+=gain;observeRecovery(w,observedSource,u,0,gain);return gain;}
export function protossEliteBarrierBroken(w:World,u:Entity){if(!revisedProtossElite(u))return;const s=protossEliteCombat(u);if(u.eliteId==='immortal.1')s.chargedStrike=true;if(u.eliteId==='immortal.2'&&w.time>=s.shieldBreakReady){s.shieldBreakReady=w.time+16;s.boostUntil=w.time+4;restoreShield(w,u,(u.maxShield??0)*.5);w.visual('barrier-start',u);}}
export function protossEliteAfterDamage(w:World,u:Entity,oldShield:number){if(!revisedProtossElite(u)||u.hp<=0)return;const lost=Math.max(0,oldShield-(u.shield??0));if(lost<=0)return;const s=protossEliteCombat(u);
 if(u.eliteId==='sentry.3')s.stored=Math.min((u.maxShield??0)*2,s.stored+lost*.7);
 if(u.eliteId==='zealot.2'&&oldShield>0&&(u.shield??0)<=0&&w.time>=s.shieldBreakReady){s.boostUntil=w.time+4;s.shieldBreakReady=w.time+14;w.visual('barrier-start',u);}
}
export function protossEliteAfterHit(w:World,u:Entity,target:Body,dealt:number,primary:boolean){if(!revisedProtossElite(u)||dealt<=0)return;const live=w.entities.get(u.id);if(!live?.hp||live.eliteId!==u.eliteId)return;const id=u.eliteId!,s=protossEliteCombat(live);
 if(id==='zealot.2'||id==='void_ray.3'){if(w.time>=s.budgetAt+1){s.budgetAt=w.time;s.restored=0;}const cap=(live.maxShield??0)*(id==='zealot.2'?.15:.18),amount=Math.min(dealt*(id==='zealot.2'?.35:.3),Math.max(0,cap-s.restored)),gain=restoreShield(w,live,amount);s.restored+=gain;
  if(id==='void_ray.3'){const overflow=Math.min(amount-gain,Math.max(0,(live.maxShield??0)*.8-s.barrier));if(overflow>0){s.barrier+=overflow;s.restored+=overflow;s.barrierUntil=w.time+6;}}if(amount>0)w.visual('shield-hit',live);
 }
 if(id==='immortal.3'&&primary&&w.time>=s.ready){s.ready=w.time+3;for(const b of protossEliteEnemies(w,live,target,4,'ground')){if(b.id!==target.id)w.attackHit(u,b,u.weaponDamage*.8,[],1,0,false,1,{enemyFactor:1,apm:false});const e=w.entities.get(b.id);if(!e)continue;if(boss(b)){debuff(w,live,e,2,{move:.2});continue;}const d=dist(e,target),step=Math.min(2,Math.max(0,d-target.unitRadius-e.unitRadius));if(d>0&&step>0){const point={x:e.x+(target.x-e.x)*step/d,z:e.z+(target.z-e.z)*step/d};if(clearLine(e,point,e.unitRadius,w.obstacles,w.terrain)&&![...w.entities.values()].some(other=>other.id!==e.id&&other.hp>0&&!other.flying&&dist(other,point)<other.unitRadius+e.unitRadius-.03)){translate(e,{x:point.x-e.x,z:point.z-e.z},e.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);e.prev={x:e.x,z:e.z};}}}w.visual('weapon-area',live,target);}
}
function flight(w:World,u:Entity,b:Body,bonuses:Bonus[],shieldBonus:number,crit:number,factor=1,delay=0,primary=true,hits=1){const p:WeaponFlight={id:w.nextId++,attackId:`${u.id}:${u.shotSequence}`,source:structuredClone(u),target:b.id,from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},lastSeen:{x:b.x,z:b.z},start:w.time+delay,expires:w.time+delay+8,speed:u.unitType==='phoenix'?56:34,lost:false,damage:u.weaponDamage*factor,bonuses:bonuses.map(x=>({...x,amount:x.amount*factor})),hits,shieldBonus:shieldBonus*factor,crit,enemyFactor:w.enemyDamageFactor(u),apm:primary&&(talentModifiers(w,u).apmDuplicate??0)>0,primary,hop:0,seen:[]};w.weaponFlights.push(p);return p;}
function line(w:World,u:Entity,points:Point[],radius:number,damage:number,bonuses:Bonus[],target:number,crit:number,kind:ProtossEliteLine['kind'],armorPen=0){w.protossElites.lines.push({id:w.nextId++,source:structuredClone(u),from:{x:u.x,z:u.z},points,index:0,next:w.time,period:kind==='thermal'?SOURCE_WEAPON_PATTERNS.colossus.stepSeconds:.025,radius,damage,bonuses:structuredClone(bonuses),target,hits:[],crit,apm:(talentModifiers(w,u).apmDuplicate??0)>0,armorPen,air:kind!=='thermal'&&!!w.body(target)?.flying,kind});}
function field(w:World,u:Entity,point:Point,kind:ProtossEliteField['kind'],radius:number,amount:number,period:number,seconds:number){const f:ProtossEliteField={id:w.nextId++,source:structuredClone(u),point:{x:point.x,z:point.z},kind,radius,amount,next:w.time+period,until:w.time+seconds,period};w.protossElites.fields.push(f);return f;}
export function fireProtossElite(w:World,u:Entity,target:Body,bonuses:Bonus[],shieldBonus:number,crit:number){if(!revisedProtossElite(u))return false;if(u.unitType==='carrier')return true;bonuses=protossEliteBonuses(u,bonuses);const id=u.eliteId!,s=protossEliteCombat(u),quiet=w.time-s.lastFire;
 if(s.target!==target.id||id==='void_ray.1'&&quiet>=2){s.target=target.id;s.lockAt=w.time;s.stacks=0;}s.cycles++;s.lastFire=w.time;
 if(id==='zealot.1'){if(s.stackUntil<=w.time)s.stacks=0;s.stacks=Math.min(6,s.stacks+1);s.stackUntil=w.time+2;}
 if(id==='immortal.1')s.stacks=Math.min(4,s.stacks+1);
 if(id==='adept.2'&&quiet>=2&&!s.episode){s.opening=4;s.openingTarget=target.id;s.episode=true;}
 if(id==='phoenix.3'&&!s.episode){s.episode=true;if(s.charge>0){s.barrier=(u.maxShield??0)*.75*s.charge;s.barrierUntil=w.time+6;s.opening=6;teamEntryBarrier(w,u,s.charge);s.charge=0;w.visual('barrier-start',u);}}
 let factor=id==='zealot.2'&&s.boostUntil>w.time?3:1;
 if(s.opening>0&&(['zealot.3','stalker.2','phoenix.3'].includes(id)||id==='adept.2'&&s.openingTarget===target.id)){factor*=3;s.opening--;}
 if(id==='immortal.1'&&s.chargedStrike){factor*=1.5;s.chargedStrike=false;}
 const packet=structuredClone(u);packet.weaponDamage*=factor;const bonus=bonuses.map(b=>({...b,amount:b.amount*factor}));
 if(u.unitType==='zealot'){
  w.attackHit(packet,target,packet.weaponDamage,bonus,unitData(u).attacks,shieldBonus*factor,true,crit);
  if(id==='zealot.1'&&s.cycles%3===0){for(const b of protossEliteEnemies(w,u,u,3,'ground'))if(b.id!==target.id&&inWeaponArc(u,u.attackFacing,b,3,180))w.attackHit(packet,b,packet.weaponDamage*1.5,bonus.map(v=>({...v,amount:v.amount*1.5})),unitData(u).attacks,0,false);w.visual('weapon-area',u,target);}
  w.effect('hero-line',u,target,.5,.32);return true;
 }
 if(id==='adept.1'){flight(w,packet,target,bonus,shieldBonus,crit);w.protossElites.echoes.push({id:w.nextId++,source:structuredClone(packet),point:{x:target.x,z:target.z},target:target.id,at:w.time+.3,damage:packet.weaponDamage*1.5,bonuses:bonus.map(v=>({...v,amount:v.amount*1.5}))});return true;}
 if(id==='stalker.1'&&s.cycles%4===0){for(let i=0;i<3;i++)flight(w,packet,target,bonus,shieldBonus,crit,1.2,i*.08,i===0);return true;}
 if(id==='sentry.3'&&s.stored>0&&w.time>=s.ready){const amount=s.stored;s.stored=0;s.ready=w.time+3;const points=Array.from({length:10},(_,i)=>({x:u.x+Math.sin(u.attackFacing)*(i+1),z:u.z+Math.cos(u.attackFacing)*(i+1)}));line(w,packet,points,.8,amount,[],target.id,1,'refraction');w.visual('weapon-area',u,target);}
 if(u.unitType==='colossus'){
  const p=SOURCE_WEAPON_PATTERNS.colossus,dx=Math.sin(u.attackFacing),dz=Math.cos(u.attackFacing),length=id==='colossus.2'?2:1,width=id==='colossus.1'?1.8:id==='colossus.2'?.75:1;
  for(const offsets of [p.forwardOffsets,p.reverseOffsets]){const points=offsets.map(o=>({x:target.x+dz*o[0]*length-dx*o[1]*length,z:target.z-dx*o[0]*length-dz*o[1]*length}));line(w,packet,points,p.searchRadius*width,packet.weaponDamage,bonus,target.id,crit,'thermal');}
  if(id==='colossus.3'&&s.cycles%4===0){for(const b of protossEliteEnemies(w,u,target,5,'ground')){w.attackHit(packet,b,packet.weaponDamage*2,bonus.map(v=>({...v,amount:v.amount*2})),1,0,false);const k=boss(b)?.5:1;debuff(w,u,b,2,{move:.5*k,speed:.3*k});}restoreShield(w,u,(u.maxShield??0)*.15);w.visual('strategic-impact',u,target);}
  w.effect('hero-line',u,target,.5*width,.55);return true;
 }
 if(id==='phoenix.1'){for(let i=0;i<6;i++)flight(w,packet,target,bonus,shieldBonus,crit,1,i*.016,i===0);return true;}
 if(u.unitType==='void_ray'){
  w.attackHit(packet,target,packet.weaponDamage*(id==='void_ray.2'?1.5:1),bonus.map(v=>({...v,amount:v.amount*(id==='void_ray.2'?1.5:1)})),1,shieldBonus,true,crit);
  if(id==='void_ray.2'){const extras=protossEliteEnemies(w,u,target,5,'both').filter(b=>b.id!==target.id&&w.targetAllowed(u,b)&&w.hasAttackLine(u,b)).sort((a,b)=>dist(a,target)-dist(b,target)||a.id-b.id).slice(0,3);for(const b of extras){w.attackHit(packet,b,packet.weaponDamage*.75,bonus.map(v=>({...v,amount:v.amount*.75})),1,0,false);w.effect('hero-line',u,b,.3,.3);}}
  w.effect('hero-line',u,target,id==='void_ray.1'?.58:.36,.3);return true;
 }
 flight(w,packet,target,bonus,shieldBonus*factor,crit,1,0,true,unitData(u).attacks);return true;
}
export function protossEliteFlightImpact(w:World,p:WeaponFlight,target:Body){const u=p.source;if(!revisedProtossElite(u))return false;const id=u.eliteId!;
 if(id==='adept.3'){let mark=w.protossElites.marks.find(m=>m.source===u.id&&m.target===target.id);if(!mark){mark={source:u.id,target:target.id,hits:0,until:0};w.protossElites.marks.push(mark);}if(mark.until<=w.time)mark.hits=0;mark.hits++;mark.until=w.time+5;const burst=mark.hits===4;if(burst)mark.hits=0;w.attackHit(u,target,p.damage*(burst?5:1),p.bonuses.map(v=>({...v,amount:v.amount*(burst?5:1)})),p.hits,p.shieldBonus,!!p.primary,p.crit,{enemyFactor:p.enemyFactor,apm:p.apm});if(burst){for(const b of protossEliteEnemies(w,u,target,3.5,'ground'))if(b.id!==target.id)w.attackHit(u,b,p.damage*5,p.bonuses.map(v=>({...v,amount:v.amount*5})),p.hits,0,false,1,{enemyFactor:p.enemyFactor,apm:false});w.visual('strategic-impact',u,target);}w.visual('projectile-impact',u,target,p.id);return true;}
 if(id==='stalker.3'){w.attackHit(u,target,p.damage,p.bonuses,p.hits,p.shieldBonus,!!p.primary,p.crit,{enemyFactor:p.enemyFactor,apm:p.apm,armorPen:.7});const d=dist(p.from,target),a=Math.atan2(target.x-p.from.x,target.z-p.from.z);if(d<10){const points=Array.from({length:Math.ceil(10-d)},(_,i)=>({x:p.from.x+Math.sin(a)*Math.min(10,d+i+1),z:p.from.z+Math.cos(a)*Math.min(10,d+i+1)}));line(w,u,points,.6,p.damage*.8,p.bonuses.map(v=>({...v,amount:v.amount*.8})),target.id,1,'pierce',.7);const l=w.protossElites.lines.at(-1)!;l.hits=[target.id];l.from={...p.from};}w.visual('projectile-impact',u,target,p.id);return true;}return false;
}
export function protossEliteBlink(w:World,u:Entity){if(!revisedProtossElite(u)||u.eliteId!=='stalker.2')return;const s=protossEliteCombat(u);if(w.time<s.ready)return;s.ready=w.time+12;s.opening=6;s.barrier=(u.maxShield??0)*.8;s.barrierUntil=w.time+5;w.visual('barrier-start',u);}
export function protossEliteChargeLanded(w:World,u:Entity){if(!revisedProtossElite(u)||u.eliteId!=='zealot.3')return;const s=protossEliteCombat(u);s.opening=3;for(const b of protossEliteEnemies(w,u,u,3.5,'ground'))w.hit(b,1800*eliteFixedGrowth(u.rank),[],1,u.owner,0,0,u.id);w.visual('strategic-impact',u);}

/** Paid casts keep their own finite energy pool and freeze the cast payload. */
export function protossEliteAbility(w:World,u:Entity){if(!revisedProtossElite(u))return false;if(!['sentry','high_templar'].includes(u.unitType))return false;
 const id=u.eliteId!,s=protossEliteCombat(u),storm=SOURCE_ABILITIES.psiStorm,t=talentModifiers(w,u,u.unitType==='high_templar'?'storm':'guardianShield'),cost=75*(1-(t.abilityEnergyReductionPct??0));if(u.energy<cost||w.time<(u.abilityReady??0))return true;
 if(id==='sentry.3')return true;const threats=protossEliteEnemies(w,u,u,id==='sentry.1'?10:storm.range,'both').filter(b=>w.hasAttackLine(u,b)).sort((a,b)=>dist(a,u)-dist(b,u)||a.id-b.id);if(!threats.length)return true;
 if(id==='sentry.1'){field(w,u,u,'guardian',7,180*eliteFixedGrowth(u.rank)*(1+(t.healingPct??0)),1,SOURCE_ABILITIES.guardianShield.duration);u.abilityReady=w.time+SOURCE_ABILITIES.guardianShield.cooldown;w.visual('barrier-start',u);}
 else if(id==='sentry.2'){const target=threats[0];for(const b of protossEliteEnemies(w,u,target,4,'both')){const e=w.entities.get(b.id);if(!e||e.attributes.includes('Structure'))continue;if(boss(b))debuff(w,u,b,2.5,{speed:.25,move:.25});else {e.stoppedUntil=Math.max(e.stoppedUntil??0,w.time+2.5);e.pendingTarget=null;e.windup=0;e.velocity={x:0,z:0};}}u.abilityReady=w.time+14;w.visual('strategic-impact',u,target);}
 else {if(!w.expedition.tech.storm&&id!=='high_templar.2')return true;const target=threats[0];if(id==='high_templar.2'){for(const b of protossEliteEnemies(w,u,target,4,'both')){const e=w.entities.get(b.id),energy=Math.max(0,e?.energy??0);if(e)e.energy=0;w.hit(b,(1600*eliteFixedGrowth(u.rank)+energy*6)*(1+(t.abilityDamagePct??0)),[],1,u.owner,0,0,u.id);if(b.hp>0)debuff(w,u,b,6,{vulnerability:.25});}w.visual('strategic-impact',u,target);}
  else {const fast=id==='high_templar.1',period=storm.damagePeriod*(fast?.5:1),seconds=storm.searchPeriods*storm.damagePeriod,total=1200*eliteFixedGrowth(u.rank)*(fast?2.5:1)*(1+(t.abilityDamagePct??0));field(w,u,target,'storm',storm.radius*(fast?1.6:1),total/(seconds/period),period,seconds);if(id==='high_templar.3')field(w,u,target,'web',5,0,1,6);w.visual('storm-start',u,target);}u.abilityReady=w.time+12;}
 u.energy-=cost;u.lastSkillAt=w.time;s.ready=u.abilityReady;return true;
}
export function tickProtossElite(w:World,u:Entity,dt:number){if(!revisedProtossElite(u))return false;const s=protossEliteCombat(u),id=u.eliteId!;
 if(s.barrierUntil<=w.time)s.barrier=0;
 if(id==='adept.2'&&w.time-s.lastFire>=2){s.episode=false;s.opening=0;s.openingTarget=null;}
 if(id==='phoenix.3'&&w.time-Math.max(s.lastFire,u.lastDamagedAt??-100)>=2){s.episode=false;s.charge=Math.min(1,s.charge+dt/6);} 
 if(id==='phoenix.2'&&w.time>=s.ready){const targets=protossEliteEnemies(w,u,u,8,'ground').filter(b=>!boss(b)&&!b.attributes.includes('Structure')&&w.entities.has(b.id)&&!w.protossElites.lifts.some(l=>l.target===b.id)).sort((a,b)=>dist(a,u)-dist(b,u)||a.id-b.id).slice(0,2);if(targets.length){s.ready=w.time+10;for(const b of targets){const e=w.entities.get(b.id)!;w.protossElites.lifts.push({source:u.id,target:e.id,until:w.time+4,wasFlying:e.flying,originalStop:e.stoppedUntil??0});e.protossLiftedBy=u.id;e.flying=true;e.stoppedUntil=w.time+4;e.pendingTarget=null;e.windup=0;w.visual('barrier-start',u,e);}w.hash.invalidatePlanes();}}
 if(id==='carrier.1'){const target=u.attackTarget===null?undefined:w.body(u.attackTarget);if(!target||target.hp<=0||!w.visibleTo(target,u.owner)||w.edgeDistance(u,target)>u.attackRange+.5){s.target=null;s.lockAt=w.time;}else {if(s.target!==target.id){s.target=target.id;s.lockAt=w.time;}if(w.time-s.lockAt>=2&&w.time>=s.overdriveReady){s.overdriveUntil=w.time+6;s.overdriveReady=w.time+18;w.visual('barrier-start',u);}}}
 return false;
}
export function fireProtossEliteChild(w:World,child:Entity,mother:Entity,target:Body){if(!revisedProtossElite(mother))return false;child.carrierEliteCycles=(child.carrierEliteCycles??0)+1;const packet=structuredClone(child);if(mother.eliteId==='carrier.2'&&target.attributes.includes('Armored'))packet.weaponDamage*=1.8;flight(w,packet,target,[],0,1,1,0,true,unitData(child).attacks);if(mother.eliteId==='carrier.2'&&child.carrierEliteCycles%4===0)flight(w,packet,target,[],0,1,1,.12,false,unitData(child).attacks);return true;}
export function tickProtossEliteState(w:World){const s=w.protossElites;
 for(const lift of s.lifts){const source=w.entities.get(lift.source),target=w.entities.get(lift.target);if(lift.until>w.time&&source?.hp&&target?.hp)continue;if(target?.protossLiftedBy===lift.source){target.flying=lift.wasFlying;target.protossLiftedBy=undefined;target.stoppedUntil=Math.max(lift.originalStop,target.stoppedUntil!==lift.until?target.stoppedUntil??0:0);w.hash.invalidatePlanes();}lift.until=0;}s.lifts=s.lifts.filter(l=>l.until>w.time);
 s.debuffs=s.debuffs.filter(d=>d.until>w.time&&(w.body(d.target)?.hp??0)>0);s.marks=s.marks.filter(d=>d.until>w.time&&(w.body(d.target)?.hp??0)>0);s.heat=s.heat.filter(h=>w.time-h.last<=2&&(w.body(h.target)?.hp??0)>0);
 for(const e of s.echoes)if(e.at<=w.time){const source=w.entities.get(e.source.id),target=w.body(e.target);if(source?.hp&&target?.hp&&!target.flying&&dist(target,e.point)<=target.unitRadius+.6&&w.visibleTo(target,e.source.owner)&&w.hasAttackLine(e.source,target)){w.attackHit(e.source,target,e.damage,e.bonuses,1,0,false,1,{enemyFactor:1,apm:false});w.visual('weapon-area',e.source,e.point);}}s.echoes=s.echoes.filter(e=>e.at>w.time);
 for(const l of s.lines){while(l.index<l.points.length&&l.next<=w.time+1e-8){const p=l.points[l.index++];l.next+=l.period;if(w.terrain&&!w.terrain.lineOfFire(l.from,p,l.source.flying,l.air)||!l.source.flying&&!l.air&&!clearLine(l.from,p,0,w.obstacles)){l.index=l.points.length;break;}for(const b of protossEliteEnemies(w,l.source,p,l.radius,l.air?'air':'ground')){if(l.hits.includes(b.id))continue;l.hits.push(b.id);let factor=1;
   if(l.source.eliteId==='colossus.1'){let h=s.heat.find(h=>h.source===l.source.id&&h.target===b.id);if(!h){h={source:l.source.id,target:b.id,since:w.time,last:w.time};s.heat.push(h);}if(w.time-h.last>2)h.since=w.time;h.last=w.time;factor=1+2*Math.min(1,(w.time-h.since)/2);const key=`ignite:${l.source.id}:${b.id}`;if((s.gates[key]??0)<=w.time){s.gates[key]=w.time+1;field(w,l.source,p,'fire',1.8,220*eliteFixedGrowth(l.source.rank),1,2);}}
   if(l.kind==='refraction')w.hit(b,l.damage,[],1,l.source.owner,0,0,l.source.id);else w.attackHit(l.source,b,l.damage*factor,l.bonuses.map(v=>({...v,amount:v.amount*factor})),1,0,false,l.crit,{enemyFactor:1,apm:l.apm,armorPen:l.armorPen});}w.effect('hero-line',{...l.source,...(l.index===1?l.from:l.points[l.index-2])},p,l.radius*2,.32);}}
 s.lines=s.lines.filter(l=>l.index<l.points.length);
 for(const f of s.fields){const live=w.entities.get(f.source.id);if(f.kind==='guardian'){if(!live?.hp){f.until=0;continue;}f.point={x:live.x,z:live.z};}
  while(f.next<=w.time+1e-8&&f.next<=f.until+1e-8){f.next+=f.period;
   if(f.kind==='guardian'){const targets=w.allies().filter(u=>permanentTeamBody(u)&&nativeShieldBody(u)&&teamRange(w,live!,u,f.radius)&&(u.shield??0)<(u.maxShield??0)).sort((a,b)=>(a.shield??0)/(a.maxShield||1)-(b.shield??0)/(b.maxShield||1)||a.id-b.id).slice(0,7);for(const b of targets)if(restoreShield(w,b,f.amount,live!)>0)w.visual('support-impact',live!,b);}
   else if(f.kind==='web'){for(const b of protossEliteEnemies(w,f.source,f.point,f.radius,'both'))debuff(w,f.source,b,1.01,{speed:.4*(boss(b)?.5:1)});if(live?.hp)for(const b of w.allies().filter(b=>permanentTeamBody(b)&&b.maxEnergy!>0&&teamRange(w,f.source,b,f.radius)).sort((a,b)=>a.energy/(a.maxEnergy||1)-b.energy/(b.maxEnergy||1)||a.id-b.id).slice(0,7))b.energy=Math.min(b.maxEnergy!,b.energy+6);}
   else {for(const b of protossEliteEnemies(w,f.source,f.point,f.radius,f.kind==='fire'?'ground':'both')){const key=`${f.kind}:${f.source.id}:${b.id}`;if((s.gates[key]??0)>w.time+1e-8)continue;s.gates[key]=w.time+f.period;w.hit(b,f.amount,[],1,f.source.owner,0,f.kind==='storm'?1:0,f.source.id);}w.visual('skill-impact',f.source,f.point);}
  }
 }s.fields=s.fields.filter(f=>f.until>w.time+1e-8);for(const[k,t]of Object.entries(s.gates))if(t<w.time-2)delete s.gates[k];
}

export function validateProtossEliteCombat(s:ProtossEliteCombat){if(!s||Object.keys(s).length!==21||Object.entries(s).some(([k,v])=>!['target','openingTarget','episode','chargedStrike'].includes(k)&&(!Number.isFinite(v)||Number(v)<(k==='lastFire'?-100:0)))||!Number.isSafeInteger(s.cycles)||!Number.isInteger(s.stacks)||s.stacks>6||!Number.isInteger(s.opening)||s.opening>6||s.charge>1||typeof s.episode!=='boolean'||typeof s.chargedStrike!=='boolean'||[s.target,s.openingTarget].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<=0)))throw Error('神族精英循环无效');}
export function validateProtossEliteRun(s:ProtossEliteRun,time:number,entities:Map<number,Entity>,nextId:number){const finite=(n:number)=>Number.isFinite(n)&&Math.abs(n)<1e12,point=(p:Point)=>p&&finite(p.x)&&finite(p.z),id=(n:number)=>Number.isSafeInteger(n)&&n>0,source=(u:Entity)=>u&&revisedProtossElite(u)&&id(u.id)&&[u.x,u.z,u.weaponDamage].every(finite),seen=new Set<number>();
 if(!s||Object.keys(s).length!==8||!s.gates||['fields','lines','echoes','marks','debuffs','lifts','heat'].some(k=>!Array.isArray(s[k as keyof ProtossEliteRun])||(s[k as keyof ProtossEliteRun] as unknown[]).length>4096))throw Error('神族精英状态无效');
 for(const r of [...s.fields,...s.lines,...s.echoes]){if(!id(r.id)||r.id>=nextId||seen.has(r.id)||!source(r.source))throw Error('神族派生收据无效');seen.add(r.id);if(r.source.protossEliteCombat)validateProtossEliteCombat(r.source.protossEliteCombat);}
 for(const f of s.fields)if(!['guardian','storm','web','fire'].includes(f.kind)||!point(f.point)||![f.radius,f.amount,f.next,f.until,f.period].every(finite)||f.radius<=0||f.radius>8||f.amount<0||f.period<=0||f.until>time+13.001||f.next>time+1.001||f.kind==='guardian'&&f.source.eliteId!=='sentry.1'||f.kind==='web'&&f.source.eliteId!=='high_templar.3'||f.kind==='fire'&&f.source.eliteId!=='colossus.1')throw Error('神族区域载荷无效');
 for(const l of s.lines)if(!point(l.from)||!Array.isArray(l.points)||l.points.length>64||l.points.some(p=>!point(p))||!Number.isInteger(l.index)||l.index<0||l.index>=l.points.length||![l.next,l.period,l.radius,l.damage,l.armorPen,l.crit].every(finite)||l.damage<0||l.period<=0||l.next>time+.251||typeof l.air!=='boolean'||!['thermal','refraction','pierce'].includes(l.kind)||!Array.isArray(l.hits)||new Set(l.hits).size!==l.hits.length||l.hits.some(n=>!id(n))||l.bonuses.some(b=>!finite(b.amount)||b.amount<0))throw Error('神族穿线载荷无效');
 for(const e of s.echoes)if(e.source.eliteId!=='adept.1'||!point(e.point)||!id(e.target)||!finite(e.at)||e.at>time+.301||!finite(e.damage)||e.damage<0||e.bonuses.some(b=>!finite(b.amount)||b.amount<0))throw Error('回响收据无效');
 const pairs=new Set<string>();for(const d of s.debuffs){const key=d.source+':'+d.target;if(!id(d.source)||!id(d.target)||pairs.has(key)||![d.until,d.speed,d.move,d.vulnerability].every(finite)||d.until>time+6.001||d.speed<0||d.speed>.5||d.move<0||d.move>.5||![0,.25].includes(d.vulnerability))throw Error('神族减益无效');pairs.add(key);}
 pairs.clear();for(const m of s.marks){const key=m.source+':'+m.target;if(!id(m.source)||!id(m.target)||pairs.has(key)||!Number.isInteger(m.hits)||m.hits<0||m.hits>3||!finite(m.until)||m.until>time+5.001)throw Error('共鸣计数无效');pairs.add(key);}
 const lifted=new Set<number>();for(const l of s.lifts){const u=entities.get(l.target),a=entities.get(l.source);if(!u||!a||a.eliteId!=='phoenix.2'||u.protossLiftedBy!==a.id||!u.flying||boss(u)||u.attributes.includes('Structure')||lifted.has(l.target)||!finite(l.until)||l.until>time+4.001||l.wasFlying!==false||!finite(l.originalStop))throw Error('引力抬升收据无效');lifted.add(l.target);}for(const u of entities.values())if(u.protossLiftedBy!==undefined&&!lifted.has(u.id))throw Error('抬升状态缺少收据');
 for(const h of s.heat)if(!id(h.source)||!id(h.target)||![h.since,h.last].every(finite)||h.since>h.last||h.last>time+.001)throw Error('热束锁定无效');for(const[k,v]of Object.entries(s.gates))if(!/^(ignite|fire|storm):\d+:\d+$/.test(k)||!finite(v)||v>time+1.001)throw Error('区域命中门无效');
}
