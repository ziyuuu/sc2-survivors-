import {TERRAN_SIX_NATIVE as N,SOURCE_WEAPONS,SOURCE_ABILITIES} from '../../data/expansion-units';
import {BILE} from '../../data/sc2-units';
import {bossFor,type SpecialType} from '../../data/enemies';
import type {World} from '../world';
import type {Body,Entity,Point,Fortification} from '../types';
import {distance} from '../movement/steering';
import {movementIntent} from './tactics/intent';
import {expeditionWeaponBonuses,unitData} from './expedition-combat';
import {cloneCombatSource} from '../starship/runtime';
import {equipmentPresentation} from '../starship/presentation';
import {equipmentSkillSealed} from '../starship/hero-advancements';
import type {WeaponFlight} from './weapon-flight';

export const TERRAN_SIX=['ghost','widow_mine','cyclone','raven','liberator','battlecruiser'] as const;
const types=new Set<string>(TERRAN_SIX);
export const formalSix=(u:Entity)=>types.has(u.unitType)&&u.team==='player'&&!u.temporary&&!u.heroId&&!u.summonKind&&!u.mission&&!u.encounter&&!u.fun;
export interface SixState {
 nextThink?:number;weakReady?:number;interfereReady?:number;weakUntil?:number;armorUntil?:number;
 jammed?:Partial<Record<'specialReady'|'corrosiveBileReady'|'bileCooldown'|'abilityReady',boolean>>;
 reloadReady?:number;lock?:number;lockReady?:number;zone?:Point;lastContact?:number;turretReady?:number;yamatoReady?:number;
 yamato?:{target:number;at:number};jumpReady?:number;jump?:{point:Point;at:number};
}
export type SixMissile='weak'|'yamato'|'shredder';
const state=(u:Entity)=>u.six??={};
const boss=(u:Entity)=>u.enemyTier==='boss'||u.enemyTier==='lord';
function priority(u:Entity){return (boss(u)?8:u.enemyTier==='elite'?4:0)+(u.attributes.includes('Armored')?2:0)+(u.unitType==='queen'||u.unitType==='ravager'?1:0);}
function nearby(w:World,u:Entity,range:number){
 const result:Entity[]=[];w.hash.query(u,range+4,b=>{const e=w.entities.get(b.id);if(e&&e.owner!==u.owner&&e.hp>0&&!e.heldBy&&w.visibleTo(e,u.owner)&&w.edgeDistance(u,e)<=range&&w.hasAttackLine(u,e))result.push(e);});
 return result.sort((a,b)=>priority(b)-priority(a)||b.hp-a.hp||distance(u,a)-distance(u,b)||a.id-b.id);
}
function launch(w:World,u:Entity,b:Entity,kind:SixMissile){
 const bonus=kind==='weak'?expeditionWeaponBonuses(w,u):undefined;
 const flight:WeaponFlight={sixSkill:kind,primary:false,id:w.nextId++,attackId:u.id+':'+kind+':'+w.tick,source:cloneCombatSource(w,u),target:b.id,targetFlying:b.flying,from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},lastSeen:{x:b.x,z:b.z},start:w.time,expires:w.time+8,speed:kind==='weak'?80:32,lost:false,damage:kind==='weak'?u.weaponDamage:kind==='yamato'?N.cruiser.damage:0,bonuses:bonus?.bonuses??[],hits:1,shieldBonus:bonus?.shieldBonus??0,crit:1,enemyFactor:1,apm:false,hop:0,seen:[]};
 w.weaponFlights.push(flight);w.visual('skill-launch',u,b,flight.id,undefined,{sixSkill:kind});
}
export function resolveSixMissile(w:World,p:WeaponFlight,target:Body){
 if(!p.sixSkill)return false;
 if(p.sixSkill==='shredder'){
  w.hash.query(target,N.raven.radius+3,b=>{const e=w.entities.get(b.id);if(e&&e.hp>0&&e.owner!==p.source.owner&&distance(target,e)<=N.raven.radius+e.unitRadius)state(e).armorUntil=w.time+N.raven.duration;});
 }else{
  w.hit(target,p.damage,p.bonuses,1,p.source.owner,.5,0,p.source.id,false,false,p.shieldBonus);
  const e=w.entities.get(target.id);if(e&&e.hp>0&&p.sixSkill==='weak')state(e).weakUntil=w.time+6;
 }
 w.visual('skill-impact',p.source,target,p.id,undefined,{sixSkill:p.sixSkill});return true;
}
type Clock='specialReady'|'corrosiveBileReady'|'bileCooldown'|'abilityReady';
function specialClocks(u:Entity):[Clock,number][]{
 if(u.arenaElite||u.arenaHero)return [];
 if(boss(u)&&u.unitType==='queen')return [['specialReady',8],['corrosiveBileReady',10],['abilityReady',SOURCE_ABILITIES.transfusion.cooldown]];
 if(u.enemyTier){const entry=bossFor(u.unitType as SpecialType);if(!entry||u.enemyTier==='elite'&&u.unitType==='roach')return [];
  const clocks:[Clock,number][]=[['specialReady',boss(u)?entry.cooldown:['zergling','hydralisk'].includes(u.unitType)?8:10]];
  if(u.unitType==='queen')clocks.push(['abilityReady',SOURCE_ABILITIES.transfusion.cooldown]);
  return clocks;
 }
 if(u.unitType==='ravager')return [['bileCooldown',BILE.cooldown]];
 if(u.unitType==='queen')return [['abilityReady',SOURCE_ABILITIES.transfusion.cooldown]];
 return [];
}
export function interfere(w:World,u:Entity){
 const eligible=specialClocks(u).filter(([clock])=>!u.six?.jammed?.[clock]&&Number.isFinite(u[clock]??0));
 if(!eligible.length)return false;
 const flags=state(u).jammed??={};
 for(const [clock,base] of eligible){const start=clock==='bileCooldown'?0:w.time;u[clock]=Math.max(start,u[clock]??0)+base*(boss(u)?.15:.30);flags[clock]=true;}
 return true;
}
export function resetInterference(u:Entity,clock:Clock){if(u.six?.jammed)delete u.six.jammed[clock];}
function ghost(w:World,u:Entity,s:SixState,foes:Entity[]){
 const danger=foes.some(e=>w.edgeDistance(u,e)<3)||u.hp<u.maxHp*.35&&foes.length>0;
 if(!danger)u.cloaked=false;else if(!u.cloaked&&u.energy>=N.ghost.cloakCost){u.energy-=N.ghost.cloakCost;u.cloaked=true;}
 if(w.time>=(s.weakReady??0)){
  const marked=(e:Entity)=>(e.six?.weakUntil??0)>w.time||w.weaponFlights.some(p=>p.sixSkill==='weak'&&p.target===e.id&&!p.lost);
  const b=foes.find(e=>!marked(e))??foes.find(e=>!w.weaponFlights.some(p=>p.sixSkill==='weak'&&p.target===e.id)&&(e.six?.weakUntil??0)<w.time+1);
  if(b){launch(w,u,b,'weak');s.weakReady=w.time+8;}
 }
 if(w.time>=(s.interfereReady??0)){const b=foes.find(e=>interfere(w,e));if(b){s.interfereReady=w.time+12;w.visual('skill-status',u,b,undefined,undefined,{sixSkill:'interfere'});}}
 s.lock=foes[0]?.id;
}
function setMode(u:Entity,mode:string){
 if(u.desiredNativeMode===mode)return;
 if(u.nativeModeUntil&&(u.nativeMode??u.unitType)===mode)u.nativeModeUntil=undefined;
 u.desiredNativeMode=mode;u.windup=0;u.pendingTarget=null;u.thinkAt=0;
}
function cluster(foes:Entity[],radius:number,score:(e:Entity)=>number){
 return foes.map(e=>({e,value:foes.reduce((n,b)=>n+(distance(e,b)<=radius+b.unitRadius?score(b):0),0)})).sort((a,b)=>b.value-a.value||a.e.id-b.e.id)[0];
}
function deploy(w:World,u:Entity,s:SixState,moving:boolean,foes:Entity[]){
 const mine=u.unitType==='widow_mine',deployed=mine?'mine_burrowed':'liberator_ag';
 if(moving||distance(u,w.anchor)>10){s.zone=undefined;setMode(u,u.unitType);return;}
 if(mine){
  const valid=foes.filter(b=>!b.attributes.includes('Structure'));
  const b=valid.find(b=>!w.weaponFlights.some(p=>p.source.unitType==='widow_mine'&&p.target===b.id&&p.damage>=b.hp)&&!w.allies().some(a=>a.id!==u.id&&a.unitType==='widow_mine'&&a.pendingTarget===b.id&&a.weaponDamage>=b.hp))??valid[0];
  if(b){s.lastContact=w.time;s.lock=b.id;if(w.anchorStoppedFor>.6)setMode(u,deployed);}
  else if(w.time-(s.lastContact??0)>1.4)setMode(u,u.unitType);
  return;
 }
 const ground=foes.filter(e=>!e.flying);
 if(s.zone&&ground.some(e=>distance(s.zone!,e)<=N.liberator.radius+e.unitRadius)){s.lastContact=w.time;return;}
 if(s.zone&&w.time-(s.lastContact??0)<1.4)return;
 if(s.zone){s.zone=undefined;setMode(u,u.unitType);return;}
 if(w.anchorStoppedFor<.75||u.nativeModeUntil)return;
 const others=w.allies().filter(a=>a.id!==u.id&&a.unitType==='liberator'&&a.six?.zone);
 const volley=(a:Entity)=>a.weaponDamage*SOURCE_WEAPONS.LiberatorAGWeapon.attackDamage/Math.max(.01,unitData(a).attackDamage);
 const best=cluster(ground,N.liberator.radius,e=>{
  const covering=others.filter(a=>distance(a.six!.zone!,e)<=N.liberator.radius+e.unitRadius);
  if(!covering.length)return 1;
  return boss(e)&&e.hp+(e.shield??0)>=covering.reduce((sum,a)=>sum+volley(a),volley(u))?1:0;
 });
 if(!best||!best.value||best.value<2&&!boss(best.e))return;
 const d=distance(u,best.e),f=Math.min(1,N.liberator.castRange/Math.max(.01,d));
 const point={x:u.x+(best.e.x-u.x)*f,z:u.z+(best.e.z-u.z)*f};
 if(!ground.some(e=>distance(point,e)<=N.liberator.radius+e.unitRadius))return;
 s.zone=point;s.lastContact=w.time;setMode(u,deployed);
}
function raven(w:World,u:Entity,s:SixState,foes:Entity[],moving:boolean){
 const best=cluster(foes,N.raven.radius,e=>(e.six?.armorUntil??0)<=w.time&&e.armor>0&&!w.weaponFlights.some(p=>p.sixSkill==='shredder'&&distance(p.lastSeen,e)<=N.raven.radius)?1:0);
 if(best&&u.energy>=N.raven.energy&&(best.value>=2||best.value&&boss(best.e))){u.energy-=N.raven.energy;launch(w,u,best.e,'shredder');return;}
 if(moving||w.anchorStoppedFor<.75||!foes.length||u.energy<N.raven.turretCost||w.time<(s.turretReady??0))return;
 const b=foes[0],d=distance(u,b),range=Math.min(N.raven.turretRange,d);
 for(const angle of [0,.7,-.7,1.4,-1.4]){const h=Math.atan2(b.x-u.x,b.z-u.z)+angle,p={x:u.x+Math.sin(h)*range,z:u.z+Math.cos(h)*range};
  if(distance(p,b)>SOURCE_WEAPONS.AutoTurret.attackRange+b.unitRadius||w.terrain&&!w.terrain.canOccupy(p,N.raven.turretRadius)||[...w.fortifications.values()].some(t=>distance(t,p)<t.unitRadius+N.raven.turretRadius))continue;
  const fort:Fortification={id:w.nextId++,...p,kind:'turret_terran',owner:u.owner,team:u.team,race:'terran',hp:N.raven.turretHp,maxHp:N.raven.turretHp,armor:N.raven.turretArmor,unitRadius:N.raven.turretRadius,flying:false,attributes:['Armored','Mechanical','Structure'],nextActionAt:w.time,ravenUntil:w.time+N.raven.turretLife};
  w.fortifications.set(fort.id,fort);w.hash.invalidatePlanes();u.energy-=N.raven.turretCost;s.turretReady=w.time+N.raven.turretLife;equipmentPresentation(w,'fort-deploy',fort,undefined,fort.kind);return;
 }
}
export function validateSixState(u:Entity){
 const s=u.six;if(!s)return;
 const timestamps=[s.nextThink,s.weakReady,s.interfereReady,s.weakUntil,s.armorUntil,s.lockReady,s.reloadReady,s.lastContact,s.turretReady,s.yamatoReady,s.jumpReady,s.yamato?.at,s.jump?.at];
 const ids=[s.lock,s.yamato?.target],points=[s.zone,s.jump?.point];
 if(typeof s!=='object'||timestamps.some(n=>n!==undefined&&(!Number.isFinite(n)||n<0))||ids.some(n=>n!==undefined&&(!Number.isSafeInteger(n)||n<1))||points.some(p=>p&&(!Number.isFinite(p.x)||!Number.isFinite(p.z)))||s.yamato&&(!Number.isFinite(s.yamato.at)||!Number.isSafeInteger(s.yamato.target))||s.jump&&(!Number.isFinite(s.jump.at)||!s.jump.point)||s.jammed&&Object.entries(s.jammed).some(([k,v])=>!['specialReady','abilityReady','corrosiveBileReady','bileCooldown'].includes(k)||v!==true))throw Error('单位技能状态无效');
}
export function tickRavenTurrets(w:World){
 for(const [id,f] of w.fortifications){if(f.ravenUntil===undefined)continue;
  if(w.time>=f.ravenUntil||f.hp<=0){w.fortifications.delete(id);w.hash.invalidatePlanes();continue;}
  if(w.missions.fleet.ceasefire||f.nextActionAt>w.time)continue;
  const weapon=SOURCE_WEAPONS.AutoTurret,targets:Body[]=[];
  w.hash.query(f,weapon.attackRange+3,b=>{if(b.hp>0&&b.owner!==f.owner&&w.visibleTo(b,f.owner)&&w.edgeDistance(f,b)<=weapon.attackRange&&(!w.terrain||w.terrain.lineOfFire(f,b,false,b.flying)))targets.push(b);});
  const b=targets.sort((a,b)=>distance(f,a)-distance(f,b)||a.id-b.id)[0];if(!b)continue;
  f.nextActionAt=w.time+weapon.attackPeriod;f.facing=Math.atan2(b.x-f.x,b.z-f.z);f.lastShotTick=w.tick;w.hit(b,weapon.attackDamage,weapon.bonusDamage,weapon.attacks,f.owner,.5,0,f.id);equipmentPresentation(w,'fort-shot',f,b,f.kind);
 }
}
function cruiser(w:World,u:Entity,s:SixState,foes:Entity[],moving:boolean){
 if(s.jump){if(w.time>=s.jump.at){const p=s.jump.point;if(Math.max(Math.abs(p.x),Math.abs(p.z))<=w.mapHalf-u.unitRadius&&!nearbyDanger(w,p)&&(!w.terrain||w.terrain.canOccupy(p,0))){u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};w.visual('squad-transfer',u,p);}s.jump=undefined;}return;}
 const danger=u.hp<u.maxHp*.3&&foes.length>0,lag=distance(w.anchor,u)>15;
 if((danger||lag)&&w.time>=(s.jumpReady??0)){
  const goal=w.moveGoal(u),threat=foes[0]??[...w.entities.values()].filter(e=>e.hp>0&&e.owner!==u.owner&&distance(w.anchor,e)<10).sort((a,b)=>distance(w.anchor,a)-distance(w.anchor,b))[0],heading=threat?Math.atan2(w.anchor.x-threat.x,w.anchor.z-threat.z):w.anchor.facing+Math.PI;
  for(const a of [0,.8,-.8,1.6,-1.6]){const p=danger||nearbyDanger(w,goal)?{x:w.anchor.x+Math.sin(heading+a)*4,z:w.anchor.z+Math.cos(heading+a)*4}:goal;
   if(Math.max(Math.abs(p.x),Math.abs(p.z))>w.mapHalf-u.unitRadius||w.terrain&&!w.terrain.canOccupy(p,0)||nearbyDanger(w,p))continue;
   s.yamato=undefined;s.jump={point:{x:p.x,z:p.z},at:w.time+N.cruiser.jumpCharge};s.jumpReady=w.time+N.cruiser.jumpCooldown;return;
  }
 }
 if(s.yamato){const b=w.entities.get(s.yamato.target);if(moving||!b||b.hp<=0||!w.visibleTo(b,u.owner)||w.edgeDistance(u,b)>N.cruiser.range||!w.hasAttackLine(u,b)){s.yamato=undefined;return;}
  if(w.time>=s.yamato.at){launch(w,u,b,'yamato');s.yamato=undefined;s.yamatoReady=w.time+N.cruiser.cooldown;}return;
 }
 if(moving||w.time<(s.yamatoReady??0))return;
 const target=foes.find(e=>{const reserved=w.weaponFlights.filter(p=>p.sixSkill==='yamato'&&!p.lost&&p.target===e.id).length+w.allies().filter(a=>a.six?.yamato?.target===e.id).length;return e.hp+(e.shield??0)-reserved*N.cruiser.damage>=Math.min(N.cruiser.damage,e.enemyTier?u.weaponDamage*5:N.cruiser.damage);});
 if(target)s.yamato={target:target.id,at:w.time+N.cruiser.charge};
}
function nearbyDanger(w:World,p:Point){let danger=false;w.hash.query(p,4,b=>{if(b.owner==='zerg'&&b.hp>0&&distance(b,p)<3+b.unitRadius)danger=true;});return danger;}
export function tickSix(w:World,u:Entity){
 if(!formalSix(u)||u.hp<=0||w.missions.fleet.ceasefire)return;
 const s=state(u),moving=!!movementIntent(w,u)||w.anchorMovingFor>.15;
 if(moving&&(u.unitType==='widow_mine'||u.unitType==='liberator')){s.zone=undefined;setMode(u,u.unitType);}
 if(u.heldBy||(u.stoppedUntil??0)>w.time||equipmentSkillSealed(w,u)){s.yamato=undefined;s.jump=undefined;return;}
 if(w.time<(s.nextThink??0))return;s.nextThink=w.time+.15;
 switch(u.unitType){
  case 'ghost':ghost(w,u,s,nearby(w,u,u.attackRange));break;
  case 'widow_mine':case 'liberator':deploy(w,u,s,moving,nearby(w,u,u.unitType==='liberator'?N.liberator.castRange+N.liberator.radius:u.attackRange));break;
  case 'cyclone':{const b=s.lock===undefined?undefined:w.entities.get(s.lock);
   if(b&&b.hp>0&&w.visibleTo(b,u.owner)&&w.edgeDistance(u,b)<=N.cyclone.maintainRange&&w.hasAttackLine(u,b))break;
   if(s.lock!==undefined){s.lock=undefined;s.lockReady=w.time+N.cyclone.cooldown;}
   if(w.time>=(s.lockReady??0))s.lock=nearby(w,u,N.cyclone.range)[0]?.id;break;}
  case 'raven':raven(w,u,s,nearby(w,u,N.raven.range),moving);break;
  case 'battlecruiser':cruiser(w,u,s,nearby(w,u,N.cruiser.range),moving);break;
 }
}
export function sixAllows(u:Entity,b:Body){
 if(!formalSix(u))return true;
 if(u.unitType==='widow_mine')return u.nativeMode==='mine_burrowed'&&!u.nativeModeUntil&&!b.attributes.includes('Structure');
 if(u.unitType==='liberator')return !u.nativeModeUntil&&(u.nativeMode==='liberator_ag'?!b.flying&&!!u.six?.zone&&distance(u.six.zone,b)<=N.liberator.radius+b.unitRadius:b.flying);
 return true;
}
export function sixTarget(w:World,u:Entity){if(!formalSix(u)||u.six?.lock===undefined)return;const b=w.entities.get(u.six.lock);return b&&w.targetAllowed(u,b)?b:undefined;}
export function ravenDetects(w:World,target:Body,owner:Body['owner']){if(owner!=='terran')return false;return w.allies().some(a=>a.unitType==='raven'&&a.hp>0&&!a.heldBy&&distance(a,target)<=N.raven.detectorRange+target.unitRadius);}

