import {swarmDirectFactor} from './zerg-swarm';
import {ZERG_SIX_CAPS as CAP,ZERG_SIX_UNITS,ZERG_SIX_WEAPON_RESEARCH,isZergSixFamily} from '../../data/zerg-six';
import {familyResearchLevel} from '../../data/expedition-buildings';
import {TUNING} from '../../data/game';
import type {ZergSixChild,ZergSixFamily} from '../../data/zerg-six';
import type {Body,Entity,Point} from '../types';
import type {World} from '../world';
import {blocked,distance} from '../movement/steering';
import {movementIntent} from './tactics/intent';
import {expeditionWeaponScale,unitData} from './expedition-combat';
import {experienceContactAllowed,extraBirthsAvailable,recordExtraBirth} from '../zerg-encounters';
import {equipmentSkillSealed} from '../starship/hero-advancements';
import {equipmentUnitTotals} from '../starship/runtime';
import {launchWeaponFlight,type WeaponFlight} from './weapon-flight';

export type ZergSixCue = 'shell'|'counter'|'infection'|'locusts'|'burrow'|'vortex'|'acid'|'brood'|'enemy-warning';
type Skill = 'counter'|'volley'|'infection'|'locusts'|'vortex';
type Infection = {source:number;generation:number;applied:number;next:number;until:number;damage:number;owner?:Body['owner']};
type Temporary = {kind:'locust'|'broodling'|'converted';parent:number;until:number;target?:number;original?:number;generation?:number;elite?:boolean};
type Cast = {kind:Skill;at:number;point:Point;target?:number;shots?:number[];index?:number;damage:number;launched?:boolean};
export type ZergSixCloud = {source:number;point:Point;damage:number;next:number;remaining:number;owner?:Body['owner']};
export type ZergSixSeatCooldown = {ability:number;shell:number;weapon:number};
export interface ZergSixState {
 temp?:Temporary;
 cast?:Cast;
 ready?:number;
 decide?:number;
 regroup?:boolean;
 strain?:number;
 hitAt?:number;
 shellUntil?:number;
 shellReady?:number;
 corrosion?:{layers:number;until:number;step?:number};
 warning?:{point:Point;at:number};
 cloudSlowUntil?:number;
 infections?:Infection[];
 immuneUntil?:number;
 displacement?:{start:number;until:number;from:Point;to:Point};
 lastSpawn?:number;
 lastCloudHit?:number;
 broodRound?:number;
 contactAt?:number;
 quietAt?:number;
 burrow?:'entering'|'burrowed'|'leaving';
 burrowAt?:number;
}
const epsilon=1e-8;
const state=(u:Entity)=>(u.zergSix??={});
const heavy=(b:Body)=>Number(b.attributes.includes('Armored'));
const special=(b:Body)=>(b as Entity).enemyTier;
const major=(b:Body)=>special(b)==='boss'||special(b)==='lord';
const point=(p:Point):Point=>({x:p.x,z:p.z});
const ahead=(a:Point,b:Point)=>({x:b.x-a.x,z:b.z-a.z});
const due=(time:number,at:number|undefined)=>at===undefined||time+epsilon>=at;
const rankBy=(origin:Point)=>(a:Body,b:Body)=>distance(origin,a)-distance(origin,b)||a.id-b.id;
export const zergSixResearch=(w:World,id:ZergSixFamily)=>familyResearchLevel(w.expedition.tech,id,'weapon');
export function corrosionArmor(w:World,target:Body){
 const acid=(target as Entity).zergSix?.corrosion;
 return acid&&acid.until>w.time?acid.layers*(acid.step??.5):0;
}
export function infectionWeakness(w:World,source:Entity|undefined){
 return Math.max(0,...(source?.zergSix?.infections??[]).map(i=>i.until+epsilon<w.time?0:i.owner==='zerg'?.05:.1));
}
export function zergShellReduction(w:World,target:Body){
 const s=(target as Entity).zergSix;
 const enemy=!!(target as Entity).enemySix;
 return (s?.shellUntil??0)>w.time?(enemy?.15:.3):s?.burrow==='burrowed'&&!enemy?.2:0;
}
export function recordZergSixHit(w:World,u:Entity,lost:number){
 if(u.unitType!=='aberration'||u.owner!=='terran'&&!u.enemySix||u.hp<=0||lost<=0||u.zergSix?.temp)return;
 const s=state(u),enemy=!!u.enemySix;
 s.strain=Math.min(u.maxHp*(enemy?.25:.2),(w.time-(s.hitAt??-Infinity)<10?s.strain??0:0)+lost);
 s.hitAt=w.time;
 if(u.hp<=u.maxHp*(enemy?.3:.35)&&due(w.time,s.shellReady)){
  s.shellReady=w.time+(enemy?24:20);
  s.shellUntil=w.time+(enemy?3:4);
  cue(w,u,u,'shell',.7,enemy?3:4);
 }
}
function legal(w:World,source:Entity,b:Body,layer:boolean|null,grounded?:Point){
 return b.hp>0&&b.owner!==source.owner&&experienceContactAllowed(w,source,b)&&!b.heldBy&&(layer===null||b.flying===layer)&&w.visibleTo(b,source.owner)
  &&(!grounded?w.hasAttackLine(source,b):!w.terrain||w.terrain.lineOfFire(grounded,b,source.flying,b.flying));
}
function targets(w:World,source:Entity,center:Point,radius:number,layer:boolean|null,edge=false){
 const candidates:Body[]=[];
 w.hash.query(center,radius+3,b=>{
  if(legal(w,source,b,layer,center===source?undefined:center)&&(edge?w.edgeDistance(source,b):distance(center,b))<=radius+epsilon)candidates.push(b);
 });
 return candidates.sort(rankBy(center));
}
function cue(w:World,u:Entity,center:Point,kind:ZergSixCue,radius:number,life:number){
 w.visual('support-impact',u,center,undefined,undefined,{zergCue:kind,supportRadius:radius,supportDuration:life});
}
function packet(w:World,u:Entity,b:Body,damage:number,dot=false,infestation?:Infection){
 w.hit(b,damage*(dot?1:swarmDirectFactor(w,u,b)),[],1,u.owner,.5,infestation?1:0,u.zergSix?.temp?.parent??u.id,false,false,0,false,false,false,{dot,infestation});
}
function skillDamage(w:World,u:Entity,base:number){
 if(u.enemySix)return base*u.enemySix.damage;
 const rank=w.growth(u),ordinary=ZERG_SIX_UNITS[u.unitType as ZergSixFamily].attackDamage;
 const gear=w.starship.enabled?equipmentUnitTotals(w,u):null,attack=1+(gear?.attack??0);
 const shot=w.starship.attacks.get(u);
 const damage=shot?shot.nativeDamage*attack:u.weaponDamage*(1+(gear?.native??0))*attack;
 return base*rank.attackSpeed*(ordinary?damage/ordinary:rank.damage*(1+(u.zergSwarm?.mature?.damage??0)));
}
function infect(w:World,u:Entity,b:Body,damage:number){
 const target=w.entities.get(b.id);
 if(!target||target.hp<=0||target.attributes.includes('Structure'))return;
 const entries=(state(target).infections??=[]),enemy=u.owner==='zerg',duration=enemy?4:6,limit=enemy?1:2;
 const own=entries.find(i=>i.source===u.id&&i.generation===u.bornAt);
 if(own){own.until=w.time+duration;own.damage=damage;return;}
 const infection:Infection={source:u.id,generation:u.bornAt,applied:w.time,next:w.time+1,until:w.time+duration,damage,owner:u.owner};
 if(entries.length<limit){entries.push(infection);return;}
 const stronger=(a:Infection,b:Infection)=>b.damage-a.damage||a.applied-b.applied||a.source-b.source;
 entries.sort(stronger);
 const weakest=entries[limit-1];
 if(stronger(infection,weakest)<0)entries[limit-1]={...infection,next:weakest.next};
}
function corrode(w:World,source:Entity,b:Body){
 const u=w.entities.get(b.id);
 if(!u||u.hp<=0)return;
 const s=state(u),old=s.corrosion;
 const enemy=source.owner==='zerg',cap=enemy?({easy:2,normal:2,hard:3,hell:4})[w.difficulty]:major(u)?2:4;
 s.corrosion={layers:Math.min(cap,(old&&old.until>w.time?old.layers:0)+1),until:w.time+(enemy?4:6),step:enemy?.25:.5};
}
function occupied(w:World,u:Entity,p:Point){
 return Math.max(Math.abs(p.x),Math.abs(p.z))+u.unitRadius>=w.mapHalf
  ||!u.flying&&(blocked(p,u.unitRadius,w.obstacles)||!!w.terrain&&!w.terrain.canOccupy(p,u.unitRadius)
   ||[w.hive,...w.expansionHives.values(),...w.fortifications.values()].some(b=>b&&b.hp>0&&distance(b,p)<b.unitRadius+u.unitRadius));
}
function displace(w:World,b:Body,vector:Point,limit:number,seconds:number,immunity:number,allow?:(p:Point)=>boolean){
 const u=w.entities.get(b.id),length=Math.hypot(vector.x,vector.z);
 if(!u||u.heldBy||!length||major(u)||u.attributes.includes('Structure')||!due(w.time,u.zergSix?.immuneUntil))return;
 const d=Math.min(length,limit),from=point(u);
 let to=from;
 for(let i=1;i<=8;i++){
  const p={x:from.x+vector.x/length*d*i/8,z:from.z+vector.z/length*d*i/8};
  if(occupied(w,u,p)||allow&&!allow(p))break;
  to=p;
 }
 if(to===from)return;
 const s=state(u);
 s.displacement={start:w.time,until:w.time+seconds,from,to};
 s.immuneUntil=w.time+immunity;
}
function expire(w:World,u:Entity){
 u.hp=0;
 u.deadAt=w.time;
 u.action='dead';
 u.velocity={x:0,z:0};
 w.statuses.removeTarget(u.id);
 if(u.zergSix?.temp?.kind==='converted')w.visual('unit-expired',u);
 else w.visual('death',u);
}
export function convertInfestation(w:World,original:Entity,mark:Infection){
 const parent=w.entities.get(mark.source);
 if(original.owner!=='zerg'||original.summonKind||original.temporary||original.attributes.includes('Structure')||original.encounter?.role==='subject'||original.heldBy
  ||major(original)||mark.owner==='zerg'||!parent||parent.owner!=='terran'||parent.hp<=0||parent.bornAt!==mark.generation||parent.unitType!=='infestor')return;
 const all=temporary(w,'converted'),elite=original.enemyTier==='elite';
 const mine=all.filter(u=>u.zergSix!.temp!.parent===parent.id);
 const oldest=(list:Entity[])=>list.filter(u=>!u.zergSix!.temp!.elite).sort((a,b)=>a.bornAt-b.bornAt||a.id-b.id)[0];
 if(elite&&all.filter(u=>u.zergSix!.temp!.elite).length>=CAP.convertedElite)return;
 if(mine.length>=CAP.perInfestorConverted){
  const replace=elite&&oldest(mine);
  if(!replace)return;
  expire(w,replace);
 }
 if(all.filter(u=>u.hp>0).length>=CAP.convertedTotal){
  const replace=elite&&oldest(all.filter(u=>u.hp>0));
  if(!replace)return;
  expire(w,replace);
 }
 const u=w.addUnit(original.unitType,'terran',original.x,original.z);
 const d=unitData(original),cycle=Math.max(original.unitType==='baneling'?2:.5,original.attackPeriod);
 const dps=original.unitType==='swarm_host'?8/1.2:Math.min(original.weaponDamage*Math.max(1,d.attacks)/Math.max(.5,original.attackPeriod)*.5,parent.weaponDamage/parent.attackPeriod*3);
 Object.assign(u,{hp:1,maxHp:1,flying:original.flying,modelKey:original.modelKey,armor:0,shield:0,maxShield:0,maxEnergy:0,energy:0,
  experience:original.experience,attackRange:original.unitType==='swarm_host'?5:original.attackRange,attackPeriod:cycle,shotInterval:cycle,weaponDamage:dps*cycle,moveSpeed:original.moveSpeed,temporary:true});
 state(u).temp={kind:'converted',parent:parent.id,until:w.time+(elite?5:8),original:original.id,generation:original.bornAt,elite};
 w.visual('support-pulse',u,u);
}
function temporary(w:World,kind:Temporary['kind'],owner:Body['owner']='terran'){
 return [...w.entities.values()].filter(u=>u.hp>0&&u.owner===owner&&u.zergSix?.temp?.kind===kind);
}
function breed(w:World,parent:Entity,type:ZergSixChild,center:Point,target?:number){
 const d=ZERG_SIX_UNITS[type],radius=d.unitRadius*TUNING.unitScale,positions=[point(center),...Array.from({length:8},(_,i)=>({x:center.x+.5*Math.cos(i*Math.PI/4),z:center.z+.5*Math.sin(i*Math.PI/4)}))];
 const locust=type==='zerg_locust';
 const pos=positions.find(p=>!occupied(w,{unitRadius:radius,flying:false} as Entity,p)&&(!locust||distance(parent,p)>=.8&&distance(parent,p)<=1.8)
  &&(!w.terrain||(locust?w.terrain.walkLine(parent,p,radius):w.terrain.lineOfFire(parent,p,parent.flying,false))));
 if(!pos)return false;
 const enemy=parent.enemySix;
 if(enemy){
  const budget=w.expedition.zergEncounters;
  if(!budget||!extraBirthsAvailable(w)||w.enemyCount()>=Math.min(260,w.missionEnemyCapacity()))return false;
  const u=w.addUnit(type,'zerg',pos.x,pos.z,parent.rank,'special'),period=(locust?1:1.2)/enemy.attackSpeed;
  const hp=(locust?18:10)*enemy.health;
  Object.assign(u,{hp,maxHp:hp,armor:0,weaponDamage:(locust?3:2)*enemy.damage,attackPeriod:period,shotInterval:period,
   attackRange:locust?2:.6,moveSpeed:d.movementSpeed*enemy.move,temporary:true,specialNoLoot:true,enemySix:enemy});
  state(u).temp={kind:locust?'locust':'broodling',parent:parent.id,until:w.time+(locust?6:3.5),target};
  u.attackTarget=target??null;state(parent).lastSpawn=w.time;budget.counters.children++;recordExtraBirth(w);
  return true;
 }
 const u=w.addUnit(type,'terran',pos.x,pos.z,parent.rank);
 const base=ZERG_SIX_UNITS[parent.unitType as ZergSixFamily],research=zergSixResearch(w,parent.unitType as ZergSixFamily);
 const gear=w.starship.enabled?equipmentUnitTotals(w,parent):null;
 const hpFactor=(w.starship.native.get(parent)?.maxHp??parent.maxHp)/base.maxHp*(1+(gear?.health??0))*(gear?.exclusiveHealth??1)*(gear?.lifeFactor??1);
 const baseDamage=base.attackDamage+ZERG_SIX_WEAPON_RESEARCH[parent.unitType as ZergSixFamily]*research;
 const weaponFactor=(locust?expeditionWeaponScale(w,parent)*(1+(parent.zergSwarm?.mature?.damage??0)):parent.weaponDamage/baseDamage)*(1+(gear?.attack??0))*(1+(gear?.native??0));
 const cadence=base.attackPeriod/parent.attackPeriod;
 Object.assign(u,{hp:d.maxHp*hpFactor,maxHp:d.maxHp*hpFactor,weaponDamage:(d.attackDamage+(locust?1:.5)*research)*weaponFactor,
  attackPeriod:d.attackPeriod/cadence,shotInterval:d.attackPeriod/cadence,armor:d.armor,temporary:true,
  rewardOwnerId:parent.id,rewardOwnerGeneration:parent.bornAt,rewardSourceKind:'ordinary'});
 state(u).temp={kind:locust?'locust':'broodling',parent:parent.id,until:w.time+(locust?8:5),target};
 u.attackTarget=target??null;
 state(parent).lastSpawn=w.time;
 return true;
}
export function zergSixTarget(w:World,u:Entity){
 const t=u.zergSix?.temp;
 if(t&&t.kind!=='converted'){
  const parent=w.entities.get(t.parent);
  const legalChild=(b:Body)=>Math.min(distance(b,parent??w.anchor),distance(b,w.anchor))<=10&&legal(w,u,b,false);
  const preferred=t.target===undefined?undefined:w.body(t.target);
  return preferred&&legalChild(preferred)?preferred:targets(w,u,u,10,false).find(legalChild);
 }
 if(u.owner!=='terran'&&!u.enemySix||t||!isZergSixFamily(u.unitType))return;
 if(u.unitType==='devourer')return targets(w,u,u,u.attackRange,null,true).sort((a,b)=>Number(b.flying)-Number(a.flying)||heavy(b)-heavy(a)||rankBy(u)(a,b))[0];
 if(u.unitType==='brood_lord')return targets(w,u,u,u.attackRange,false,true).sort((a,b)=>Number(!!special(b))-Number(!!special(a))||heavy(b)-heavy(a)||rankBy(u)(a,b))[0];
}
function cone(w:World,u:Entity,target:Body,radius:number,angle:number,limit:number){
 const heading=u.attackFacing;
 return targets(w,u,u,radius,target.flying,u.unitType==='viper').filter(b=>b.id!==target.id
  &&Math.cos(Math.atan2(b.x-u.x,b.z-u.z)-heading)>=Math.cos(angle*Math.PI/360)).slice(0,limit-1);
}
export function zergSixInstant(w:World,u:Entity,target:Body,crit:number){
 if(u.owner!=='terran'&&!u.enemySix||w.starship.combat.derivedDepth>0||u.zergSix?.temp||u.unitType!=='aberration'&&u.unitType!=='viper')return false;
 const sweep=u.unitType==='aberration',enemy=!!u.enemySix,others=cone(w,u,target,sweep?2.2:4.5,sweep?110:45,enemy?(sweep?3:2):(sweep?6:3));
 w.attackHit(u,target,u.weaponDamage,[],1,0,true,crit);
 for(const b of others)packet(w,u,b,u.weaponDamage*(enemy?(sweep?.5:.4):(sweep?.65:.5)));
 return true;
}
export function fireZergTemporary(w:World,u:Entity,target:Body){
 const t=u.zergSix?.temp;
 if(!t)return false;
 if(u.hp<=0||!w.targetAllowed(u,target)||!w.hasAttackLine(u,target))return true;
 u.lastShotAt=w.time;
 u.shotSequence=(u.shotSequence??0)+1;
 u.nextShotAt=w.time+u.attackPeriod;
 w.stats.shots++;
 w.visual('attack',u,target);
 if(t.kind==='locust'&&launchWeaponFlight(w,u,target,[],0,1,1,false))return true;
 const data=unitData(u),splash=u.unitType==='baneling'?{radius:2.2,fraction:1}:data.splash.at(-1);
 const others=splash&&t.kind==='converted'?targets(w,u,target,splash.radius,target.flying).filter(b=>b.id!==target.id).slice(0,3):[];
 packet(w,u,target,u.weaponDamage);
 if(splash)for(const b of others)packet(w,u,b,u.weaponDamage*splash.fraction);
 return true;
}
export function resolveZergSixFlight(w:World,p:WeaponFlight,target:Body|undefined){
 const u=p.source;
 if(u.owner!=='terran'&&!u.enemySix||p.zergDerived)return false;
 if(u.zergSix?.temp){if(target){packet(w,u,target,p.damage);w.visual('projectile-impact',u,target,p.id);}return true;}
 if(u.unitType!=='devourer'&&u.unitType!=='infestor'&&u.unitType!=='brood_lord')return false;
 const primary=p.primary!==false;
 const damage=(b:Body,factor:number)=>{
  const before=b.hp+((b as Entity).shield??0);
  if(b===target&&primary&&!p.zergVolley)w.attackHit(u,b,p.damage,p.bonuses,1,p.shieldBonus,true,p.crit,{enemyFactor:p.enemyFactor,apm:p.apm,direct:true});
  else packet(w,u,b,p.damage*factor);
  if(b===target)w.visual('projectile-impact',u,b,p.id);
  return before>b.hp+((b as Entity).shield??0);
 };
 if(u.unitType==='infestor'){
  if(target){damage(target,1);infect(w,u,target,p.zergDotDamage??skillDamage(w,u,u.enemySix?2:4));}
  return true;
 }
 if(p.zergVolley){if(target&&damage(target,1))corrode(w,u,target);return true;}
 const devourer=u.unitType==='devourer',enemy=!!u.enemySix,radius=enemy?1.2:devourer?1.5:1.4,center=p.zergLanding?.point??target??p.lastSeen;
 const others=targets(w,u,center,radius,p.targetFlying??false).filter(b=>b.id!==target?.id).slice(0,(enemy?3:devourer?5:4)-(target?1:0));
 const hit=target?damage(target,1):false;
 if(devourer&&target&&hit)corrode(w,u,target);
 for(const b of others)if(damage(b,enemy?(devourer?.35:.30):(devourer?.5:.4))&&devourer)corrode(w,u,b);
 if(target||others.length)cue(w,u,center,devourer?'acid':'brood',radius,.28);
 if(!devourer&&(hit||!enemy&&target)&&primary&&!p.zergDerived){
  const parent=w.entities.get(u.id);
  if(parent&&parent.hp>0){
   const s=state(parent),all=temporary(w,'broodling',u.owner),round=u.shotSequence??0;
   const max=enemy?CAP.enemyBroodling[w.difficulty]:CAP.friendlyBroodling,per=enemy?CAP.perEnemyBroodLord:CAP.perBroodLord;
   if(round>(s.broodRound??0)){
    s.broodRound=round;
    if((!enemy||round%2===0)&&all.length<max&&all.filter(b=>b.zergSix!.temp!.parent===u.id).length<per)breed(w,parent,'zerg_broodling',center,target?.id);
   }
  }
 }
 return true;
}
export function snapshotInfestorDamage(w:World,u:Entity){return skillDamage(w,u,u.enemySix?2:4);}
function launchVolley(w:World,u:Entity,b:Body,cast:Cast){
 if(!launchWeaponFlight(w,u,b,[],0,1,1,false))return;
 const p=w.weaponFlights.at(-1)!;
 p.zergVolley=true;
 p.attackId+=':volley:'+p.id;
 p.damage=cast.damage;
 u.attackFacing=Math.atan2(b.x-u.x,b.z-u.z);
 w.visual('attack',u,b);
}
function effectiveLife(u:Body){return u.hp+((u as Entity).shield??0);}
function skillTarget(w:World,u:Entity,radius:number,kind:'infection'|'vortex'){
 const others=w.allies().filter(b=>b.id!==u.id&&b.unitType!=='aberration'&&!b.temporary);
 const planned=[...w.entities.values()].filter(b=>b.zergSix?.cast?.kind===kind).map(b=>b.zergSix!.cast!.point);
 const candidates=targets(w,u,u,radius,null,true).filter(b=>kind!=='infection'||!planned.some(p=>distance(p,b)<=2.5));
 return candidates.map(b=>{
  const group=targets(w,u,b,2.5,null);
  return {body:b,count:group.length,score:group.filter(e=>kind!=='infection'||!(e as Entity).zergSix?.infections?.length).length,
   safety:Math.min(100,...others.map(o=>distance(o,b)))};
 }).filter(c=>c.count>=3||!!special(c.body)&&effectiveLife(c.body)>u.weaponDamage*3)
  .sort((a,b)=>b.score-a.score||b.count-a.count||b.safety-a.safety||rankBy(u)(a.body,b.body))[0]?.body;
}
function hold(u:Entity,dt:number,action:Entity['action']='skill'){
 u.action=action;u.prev=point(u);u.velocity={x:0,z:0};
 u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);
 u.attackLock=Math.max(0,u.attackLock-dt);
 return true;
}
function volleyTargets(w:World,u:Entity,damage:number){
 const reserve=(b:Body)=>w.weaponFlights.reduce((n,p)=>n+(p.source.owner===u.owner&&!p.lost&&p.target===b.id?p.damage:0),0)
  +[...w.entities.values()].reduce((n,e)=>n+(e.zergSix?.cast?.kind==='volley'?(e.zergSix.cast.shots??[]).slice(e.zergSix.cast.index??0).filter(id=>id===b.id).length*e.zergSix.cast.damage:0),0);
 const targetsInRange=targets(w,u,u,6,null,true).filter(b=>effectiveLife(b)>reserve(b))
  .sort((a,b)=>Number(b.flying)-Number(a.flying)||heavy(b)-heavy(a)||rankBy(u)(a,b));
 if(targetsInRange.length>=3)return targetsInRange.slice(0,3).map(b=>b.id);
 const durable=targetsInRange.find(b=>effectiveLife(b)-reserve(b)>3*Math.max(.5,u.weaponDamage-w.effectiveArmor(b))&&effectiveLife(b)>damage*2);
 return durable?[durable.id,durable.id,durable.id]:undefined;
}
function completeCast(w:World,u:Entity,cast:Cast){
 const s=state(u);
 if(cast.kind==='volley'){
  const index=cast.index??0,b=w.body(cast.shots![index]);
  if(b&&legal(w,u,b,null)){
   launchVolley(w,u,b,cast);
   if(!cast.launched){s.ready=w.time+8;cast.launched=true;}
  }
  if(index<2){cast.index=index+1;cast.at+=.12;return;}
 }else if(cast.kind==='counter'){
  const enemies=targets(w,u,u,2.6,false).slice(0,8);
  if(enemies.length){
   s.strain=0;s.ready=w.time+4;
   for(const b of enemies){packet(w,u,b,cast.damage);if(b.hp>0){const v=ahead(u,b),len=Math.hypot(v.x,v.z),push=special(b)==='elite'?.35:.65;if(len)displace(w,b,{x:v.x/len*push,z:v.z/len*push},push,.2,4);}}
   cue(w,u,u,'counter',2.6,.25);
  }
 }else if(cast.kind==='infection'){
  const enemies=targets(w,u,cast.point,2.5,null).slice(0,8);
  if(enemies.length){for(const b of enemies)infect(w,u,b,cast.damage);s.ready=w.time+7;cue(w,u,cast.point,'infection',2.5,.55);}
 }else if(cast.kind==='vortex'){
  const fronts=ahead(w.anchor,cast.point),back=w.allies().filter(b=>b.id!==u.id&&b.unitType!=='aberration'&&!b.temporary);
  const safe=(p:Point)=>(p.x-w.anchor.x)*fronts.x+(p.z-w.anchor.z)*fronts.z>=0&&back.every(b=>distance(b,p)>=3);
  const enemies=targets(w,u,cast.point,2.5,null).filter(b=>!major(b)&&!b.attributes.includes('Structure')&&due(w.time,(b as Entity).zergSix?.immuneUntil));
  if(safe(cast.point))for(const b of enemies.slice(0,6))if(safe(b))displace(w,b,ahead(b,cast.point),special(b)==='elite'?1:2,.35,5,safe);
  (w.expedition.zergSixClouds??=[]).push({source:u.id,point:cast.point,damage:cast.damage,next:w.time+.5,remaining:5});
  s.ready=w.time+10;cue(w,u,cast.point,'vortex',2.5,2.5);
 }else{
  const target=w.body(cast.target??null);
  if(target&&legal(w,u,target,false)&&w.edgeDistance(u,target)<=10){
   const all=temporary(w,'locust'),room=Math.min(4,CAP.friendlyLocust-all.length,CAP.perHostLocust-all.filter(b=>b.zergSix!.temp!.parent===u.id).length);
   const angle=Math.atan2(target.x-u.x,target.z-u.z);
   let count=0;
   for(let i=0;i<room;i++){
    const a=angle+(i-1.5)*.38,length=(i%2)*.5+1.25;
    if(breed(w,u,'zerg_locust',{x:u.x+Math.sin(a)*length,z:u.z+Math.cos(a)*length},target.id))count++;
   }
   s.ready=w.time+(count?10:1);
   if(count)cue(w,u,u,'locusts',1,.4);
  }
 }
 s.cast=undefined;
}
function enemyGroup(w:World,u:Entity,range:number,radius:number,skill:Skill){
 const candidates=targets(w,u,u,range,null,true);
 const reserved=[...w.entities.values()].filter(other=>other.hp>0&&other.owner===u.owner&&other.zergSix?.cast?.kind===skill).map(other=>other.zergSix!.cast!.point);
 let best:Body|undefined,bestCount=0;
 for(const candidate of candidates){
  if(reserved.some(p=>distance(p,candidate)<radius))continue;
  const count=Math.min(4,targets(w,u,candidate,radius,null).length);
  if(count>bestCount){best=candidate;bestCount=count;}
 }
 return best;
}

function completeEnemyCast(w:World,u:Entity,cast:Cast){
 const s=state(u);
 if(cast.kind==='volley'){
  const index=cast.index??0,b=w.body(cast.shots![index]);
  if(b&&legal(w,u,b,null)&&w.edgeDistance(u,b)<=6){
   launchVolley(w,u,b,cast);
   if(!cast.launched){s.ready=w.time+10;cast.launched=true;}
  }
  if(index===0){cast.index=1;cast.at+=.12;return;}
 }else if(cast.kind==='counter'){
  const victims=targets(w,u,cast.point,2,false).slice(0,4);
  s.strain=0;s.ready=w.time+7;
  for(const b of victims){
   packet(w,u,b,cast.damage);
   if(b.hp>0)displace(w,b,ahead(u,b),.3,.15,5);
  }
  cue(w,u,cast.point,'counter',2,.25);
 }else if(cast.kind==='infection'){
  const victims=targets(w,u,cast.point,2,null).slice(0,4);
  for(const b of victims)infect(w,u,b,cast.damage);
  s.ready=w.time+9;cue(w,u,cast.point,'infection',2,.55);
 }else if(cast.kind==='vortex'){
  (w.expedition.zergSixClouds??=[]).push({source:u.id,point:cast.point,damage:cast.damage,next:w.time+.5,remaining:4,owner:'zerg'});
  s.ready=w.time+12;cue(w,u,cast.point,'vortex',2.5,2);
 }else{
  const b=w.body(cast.target??null);
  if(b&&legal(w,u,b,false)&&w.edgeDistance(u,b)<=10){
   const all=temporary(w,'locust','zerg'),room=Math.min(2,CAP.enemyLocust[w.difficulty]-all.length,CAP.perEnemyHostLocust-all.filter(e=>e.zergSix?.temp?.parent===u.id).length);
   const heading=Math.atan2(b.x-u.x,b.z-u.z);
   let spawned=0;
   for(let i=0;i<room;i++){
    const angle=heading+(i===0?-.22:.22);
    if(breed(w,u,'zerg_locust',{x:u.x+Math.sin(angle)*1.25,z:u.z+Math.cos(angle)*1.25},b.id))spawned++;
   }
   s.ready=w.time+(spawned?12:1);
   if(spawned)cue(w,u,u,'locusts',1,.4);
  }
 }
 s.cast=undefined;
}

function tickEnemySix(w:World,u:Entity,dt:number){
 if(u.unitType==='brood_lord')return false;
 const s=state(u);
 if(s.cast){
  if(due(w.time,s.cast.at)&&s.cast.kind!=='locusts')completeEnemyCast(w,u,s.cast);
  if(s.cast)return hold(u,dt);
 }
 const host=u.unitType==='swarm_host',ground=host?targets(w,u,u,10,false,true)[0]:undefined;
 if(host&&!ground){s.burrow=undefined;return false;}
 if(u.windup||!due(w.time,s.decide)||!due(w.time,s.ready)||equipmentSkillSealed(w,u))return host&&!!ground?hold(u,dt,'sieging'):false;
 s.decide=w.time+.2;
 if(host&&ground){
  s.burrow='burrowed';s.cast={kind:'locusts',at:w.time+.4,point:point(ground),target:ground.id,damage:0};
 }else if(u.unitType==='aberration'&&(s.strain??0)+epsilon>=u.maxHp*.25&&targets(w,u,u,2,false).length){
  s.cast={kind:'counter',at:w.time+.5,point:point(u),damage:skillDamage(w,u,20)};
  cue(w,u,u,'enemy-warning',2,.5);
 }else if(u.unitType==='devourer'){
  const candidates=targets(w,u,u,6,null,true).sort((a,b)=>Number(b.flying)-Number(a.flying)||heavy(b)-heavy(a)||rankBy(u)(a,b));
  const [first,second]=candidates;
  if(first){
   s.cast={kind:'volley',at:w.time+.6,point:point(first),damage:skillDamage(w,u,10),shots:[first.id,(second??first).id]};
   cue(w,u,first,'enemy-warning',.7,.6);
  }
 }else if(u.unitType==='infestor'||u.unitType==='viper'){
  const infection=u.unitType==='infestor',radius=infection?2:2.5,warning=infection?.7:1;
  const kind=infection?'infection':'vortex',b=enemyGroup(w,u,infection?7:8,radius,kind);
  if(b){s.cast={kind,at:w.time+warning,point:point(b),damage:skillDamage(w,u,infection?2:2.5)};cue(w,u,b,'enemy-warning',radius,warning);}
 }
 if(s.cast)u.lastSkillAt=w.time;
 return s.cast?hold(u,dt):host&&!!ground?hold(u,dt,'sieging'):false;
}

export function warnEnemyBrood(w:World,u:Entity,target:Body){
 if(u.unitType!=='brood_lord'||!u.enemySix||u.zergSix?.temp)return;
 const p=point(target);
 state(u).warning={point:p,at:w.time+.7};cue(w,u,p,'enemy-warning',1.2,.7);
}
export function enemyCloudMoveFactor(w:World,u:Entity){
 if((u.zergSix?.cloudSlowUntil??0)<=w.time)return 1;
 return 1-({easy:.08,normal:.10,hard:.12,hell:.15})[w.difficulty];
}

export function tickZergSixUnit(w:World,u:Entity,dt:number){
 const motion=u.zergSix?.displacement;
 if(motion){
  const t=Math.min(1,(w.time-motion.start)/(motion.until-motion.start)),p={x:motion.from.x+(motion.to.x-motion.from.x)*t,z:motion.from.z+(motion.to.z-motion.from.z)*t};
  if(!occupied(w,u,p)){u.x=p.x;u.z=p.z;}
  if(t===1)state(u).displacement=undefined;
  return hold(u,dt,u.action);
 }
 const temp=u.zergSix?.temp;
 if(temp){
  if(due(w.time,temp.until)){expire(w,u);return true;}
  if(temp.kind==='converted')u.hp=1;
  return false;
 }
 if(!isZergSixFamily(u.unitType))return false;
 if(u.owner==='zerg')return u.enemySix?tickEnemySix(w,u,dt):false;
 const s=state(u),moving=!!movementIntent(w,u),stretch=distance(u,w.anchor),host=u.unitType==='swarm_host';
 s.regroup=stretch>8||!!s.regroup&&stretch>6||undefined;
 if(moving||s.regroup){
  s.cast=undefined;s.contactAt=undefined;u.windup=0;u.pendingTarget=null;u.aimStartedAt=null;u.attackLock=0;
  u.weaponCooldown=Math.max(0,u.nextShotAt-w.time);
 }
 const hostTarget=host&&!moving&&stretch<=6?targets(w,u,u,10,false,true)[0]:undefined;
 if(host){
  if(hostTarget){s.quietAt=undefined;s.contactAt??=w.time;}
  else {s.contactAt=undefined;s.quietAt??=w.time;}
  if((moving||stretch>6||w.time-(s.quietAt??w.time)>=2)&&(s.burrow==='burrowed'||s.burrow==='entering')){
   s.burrow='leaving';s.burrowAt=w.time+.25;w.visual('support-pulse',u);
  }
  if(s.burrow==='leaving'&&due(w.time,s.burrowAt)){s.burrow=undefined;s.burrowAt=undefined;}
  if(hostTarget&&!s.burrow&&w.time-(s.contactAt??w.time)>=1){
   s.burrow='entering';s.burrowAt=w.time+.5;cue(w,u,u,'burrow',.8,.5);
  }
  if(s.burrow==='entering'&&due(w.time,s.burrowAt)){s.burrow='burrowed';s.burrowAt=undefined;}
 }
 if(moving||s.regroup)return s.burrow==='leaving'?hold(u,dt,'sieging'):false;
 if(s.cast){
  if(due(w.time,s.cast.at)&&s.cast.kind!=='locusts')completeCast(w,u,s.cast);
  if(s.cast)return hold(u,dt);
 }
 if(!u.windup&&due(w.time,s.decide)&&due(w.time,s.ready)&&u.action!=='spawn'){
  s.decide=w.time+.2;
  if(u.unitType==='aberration'&&w.time-(s.hitAt??-Infinity)>=10)s.strain=0;
  if(u.unitType==='aberration'&&(s.strain??0)+epsilon>=u.maxHp*.2&&targets(w,u,u,2.6,false).length)
   s.cast={kind:'counter',at:w.time+.15,point:point(u),damage:skillDamage(w,u,36)};
  if(host&&hostTarget&&w.time-(s.contactAt??w.time)>=1)s.cast={kind:'locusts',at:w.time+.4,point:point(hostTarget),target:hostTarget.id,damage:0};
  if(w.time-u.bornAt>=1){
   if(u.unitType==='devourer'){
    const damage=skillDamage(w,u,16),shots=volleyTargets(w,u,damage);
    if(shots)s.cast={kind:'volley',at:w.time+.4,point:point(u),shots,damage};
   }
   if(u.unitType==='infestor'||u.unitType==='viper'){
    const infection=u.unitType==='infestor',kind=infection?'infection':'vortex',b=skillTarget(w,u,infection?7:8,kind);
    if(b)s.cast={kind,at:w.time+(infection?.35:.4),point:point(b),damage:skillDamage(w,u,infection?4:6)};
   }
  }
 }
 if(s.cast)u.lastSkillAt=s.cast.at-(s.cast.kind==='infection'?.35:s.cast.kind==='counter'?.15:.4);
 return s.cast?hold(u,dt):s.burrow==='entering'||s.burrow==='leaving'||s.burrow==='burrowed'?hold(u,dt,'sieging'):false;
}
export function tickZergSixEffects(w:World){
 const births:Entity[]=[];
 for(const u of w.entities.values()){
  if(u.hp<=0||!u.zergSix)continue;
  const s=u.zergSix;
  if(s.temp&&due(w.time,s.temp.until)){expire(w,u);continue;}
  if(s.corrosion&&due(w.time,s.corrosion.until))s.corrosion=undefined;
  for(const mark of s.infections??[]){
   if(u.hp<=0||!due(w.time,mark.next)||mark.next>mark.until+epsilon)continue;
   mark.next+=1;
   const owner=mark.owner??'terran';
   w.hit(u,mark.damage,[],1,owner,0,1,mark.source,false,false,0,false,false,false,{dot:true,infestation:owner==='terran'?mark:undefined});
  }
  if(s.infections)s.infections=s.infections.filter(mark=>mark.until>w.time+epsilon);
  if(s.cast?.kind==='locusts'&&due(w.time,s.cast.at)&&(u.enemySix||!movementIntent(w,u)&&distance(w.anchor,u)<=6))births.push(u);
 }
 for(const u of births.sort((a,b)=>(a.zergSix!.lastSpawn??-1)-(b.zergSix!.lastSpawn??-1)||a.id-b.id)){
  if(u.enemySix)completeEnemyCast(w,u,u.zergSix!.cast!);else completeCast(w,u,u.zergSix!.cast!);
 }
 const clouds=w.expedition.zergSixClouds;
 if(!clouds?.length)return;
 if(!clouds.some(c=>due(w.time,c.next)))return;
 const dueVictims=new Set<number>(),damage=new Map<number,{body:Body;cloud:ZergSixCloud}>();
 // Active clouds share a target's half-second clock even if their casts started on different ticks.
 for(const c of clouds){
  const pulsing=due(w.time,c.next),candidates:Body[]=[];
  if(pulsing){c.next+=.5;c.remaining--;}
  w.hash.query(c.point,2.5,b=>{
   const owner=c.owner??'terran';
   if(b.owner===owner||b.hp<=0||b.heldBy||distance(b,c.point)>2.5||!w.visibleTo(b,owner)||
    w.terrain&&!w.terrain.lineOfFire(c.point,b,false,b.flying))return;
   candidates.push(b);
  });
  for(const b of candidates.sort(rankBy(c.point)).slice(0,c.owner==='zerg'?4:6)){
   if(pulsing&&c.owner==='zerg'){const u=w.entities.get(b.id);if(u)state(u).cloudSlowUntil=w.time+.5;}
   if(w.time-((b as Entity).zergSix?.lastCloudHit??-Infinity)+epsilon<.5)continue;
   if(pulsing)dueVictims.add(b.id);
   if(c.damage>(damage.get(b.id)?.cloud.damage??0))damage.set(b.id,{body:b,cloud:c});
  }
 }
 for(const {body,cloud} of damage.values()){
  if(!dueVictims.has(body.id))continue;
  const entity=w.entities.get(body.id);if(entity)state(entity).lastCloudHit=w.time;
  w.hit(body,cloud.damage,[],1,cloud.owner??'terran',.5,0,cloud.source,false,false,0,false,false,false,{dot:true});
 }
 w.expedition.zergSixClouds=clouds.filter(c=>c.remaining>0);
}
export function zergSixKillCredit(w:World,sourceId:number|undefined){
 if(sourceId===undefined)return;
 const child=w.entities.get(sourceId),temp=child?.zergSix?.temp;
 if(!temp||temp.kind==='converted'||child?.owner!=='terran'||child.rewardSourceKind!=='ordinary'||child.rewardOwnerId!==temp.parent)return sourceId;
 const parent=w.entities.get(temp.parent);
 return parent?.team==='player'&&parent.hp>0&&!parent.temporary&&parent.bornAt===child.rewardOwnerGeneration
  &&parent.unitType===(temp.kind==='locust'?'swarm_host':'brood_lord')?parent.id:sourceId;
}

export function rememberZergSixSeat(w:World,u:Entity){
 if(u.team!=='player'||!isZergSixFamily(u.unitType)||u.heroId||u.temporary||u.summonKind||!w.expedition.familySlots.includes(u.unitType))return;
 const saved=w.expedition.zergSixSeatCooldowns??={};
 const seats=saved[u.unitType]??={};
 const old=seats[u.slot], ability=Math.max(u.zergSix?.ready??0,old?.ability??0),shell=Math.max(u.zergSix?.shellReady??0,old?.shell??0);
 const weapon=Math.max(u.nextShotAt,w.time+u.weaponCooldown,old?.weapon??0);
 if(Math.max(ability,shell,weapon)>w.time)seats[u.slot]={ability,shell,weapon};
 else delete seats[u.slot];
}

export function inheritZergSixSeat(w:World,u:Entity){
 if(u.team!=='player'||!isZergSixFamily(u.unitType)||!w.expedition.familySlots.includes(u.unitType))return;
 const seats=w.expedition.zergSixSeatCooldowns?.[u.unitType],saved=seats?.[u.slot];
 if(!seats||!saved)return;
 delete seats[u.slot];
 if(saved.ability>w.time)state(u).ready=saved.ability;
 if(saved.shell>w.time)state(u).shellReady=saved.shell;
 if(saved.weapon>w.time){u.nextShotAt=saved.weapon;u.weaponCooldown=saved.weapon-w.time;}
}

export function clearZergSixStage(w:World){
 if(w.expedition.zergSixClouds)w.expedition.zergSixClouds=[];
 for(const u of w.entities.values()){
  const s=u.zergSix;
  if(!s)continue;
  if(s.temp){if(u.hp>0)expire(w,u);continue;}
  s.cast=undefined;s.contactAt=undefined;s.quietAt=undefined;s.burrow=undefined;s.burrowAt=undefined;s.regroup=undefined;
  s.infections=undefined;s.corrosion=undefined;s.displacement=undefined;s.lastCloudHit=undefined;s.cloudSlowUntil=undefined;s.warning=undefined;
 }
}
export function validateZergSixState(u:Entity){
 const growth=u.enemySix;
 if(growth&&(u.owner!=='zerg'||!isZergSixFamily(u.unitType)&&u.unitType!=='zerg_locust'&&u.unitType!=='zerg_broodling'
  ||![growth.damage,growth.health,growth.attackSpeed,growth.move].every(v=>Number.isFinite(v)&&v>0)))throw Error('虫群敌方成长无效');
 const s=u.zergSix;
 if(!s)return;
 const times=[s.ready,s.decide,s.strain,s.hitAt,s.shellUntil,s.shellReady,s.immuneUntil,s.lastSpawn,s.broodRound,s.contactAt,s.quietAt,s.burrowAt,s.lastCloudHit,s.cloudSlowUntil];
 if(typeof s!=='object'||s.regroup!==undefined&&typeof s.regroup!=='boolean'||times.some(t=>t!==undefined&&(!Number.isFinite(t)||t<0))
  ||s.burrow&&!['entering','burrowed','leaving'].includes(s.burrow)
  ||s.corrosion&&(!Number.isInteger(s.corrosion.layers)||s.corrosion.layers<1||s.corrosion.layers>4||!Number.isFinite(s.corrosion.until))
  ||s.displacement&&(![s.displacement.from.x,s.displacement.from.z,s.displacement.to.x,s.displacement.to.z,s.displacement.start,s.displacement.until].every(Number.isFinite)||s.displacement.until<=s.displacement.start))throw Error('虫群单位状态无效');
 if(s.temp&&(!u.temporary||u.owner==='zerg'&&(!u.enemySix||s.temp.kind==='converted')||!['converted','locust','broodling'].includes(s.temp.kind)
  ||!Number.isSafeInteger(s.temp.parent)||!Number.isFinite(s.temp.until)||s.temp.kind==='locust'&&u.unitType!=='zerg_locust'
  ||s.temp.kind==='broodling'&&u.unitType!=='zerg_broodling'||s.temp.kind==='converted'&&(u.maxHp!==1||!Number.isSafeInteger(s.temp.original))))throw Error('虫群临时单位无效');
 if(s.infections&&(!Array.isArray(s.infections)||s.infections.length>2||s.infections.some(i=>![i.source,i.generation,i.applied,i.next,i.until,i.damage].every(Number.isFinite))))throw Error('感染状态无效');
 if(s.cast&&(!['counter','volley','infection','locusts','vortex'].includes(s.cast.kind)||![s.cast.at,s.cast.point.x,s.cast.point.z,s.cast.damage].every(Number.isFinite)||s.cast.kind==='volley'&&(!Array.isArray(s.cast.shots)||s.cast.shots.length!==(u.enemySix?2:3)||s.cast.shots.some(id=>!Number.isSafeInteger(id))||s.cast.index!==undefined&&(!Number.isInteger(s.cast.index)||s.cast.index<0||s.cast.index>2))))throw Error('虫群自动技能状态无效');
}
