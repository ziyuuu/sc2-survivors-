import type {World} from '../../world';
import type {Entity,Body} from '../../types';
import {unitData,transformSeconds} from '../expedition-combat';
import {FAMILY_MODES,vikingLandingBlocked,type ModeFamily} from '../family-actions';
import {movementIntent,squadActor} from './intent';
import {clearLine,distance,blocked} from '../../movement/steering';
import {SOURCE_WEAPONS,SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../../data/expansion-units';

const nextChecks=new WeakMap<Entity,number>();
const automated=['hellion','viking','thor','lurker'];
export function initializeAutoMode(w:World,u:Entity){if(u.owner==='terran'&&automated.includes(u.unitType))u.autoMode={mode:u.desiredNativeMode??u.nativeMode??u.unitType,since:w.time};}
function score(w:World,u:Entity,mode:string,targets:Body[],change:boolean){
 const view={...u,nativeMode:mode,activeWeapon:undefined},data=unitData(view);
 const delay=change?transformSeconds(u,mode):0,horizon=u.unitType==='lurker'?8:4,remaining=Math.max(0,horizon-delay);let best=0;
 for(const b of targets){
  const weapons=u.unitType in SOURCE_UNIT_WEAPON_IDS?sourceWeaponsForUnit(u.unitType as VerifiedAddedUnitType,mode as Parameters<typeof sourceWeaponsForUnit>[1]):[data];
  const weapon=weapons.find(a=>a.targetType==='both'||a.targetType==='air'&&(b.flying||('unitType' in b&&b.unitType==='colossus'))||a.targetType==='ground'&&!b.flying)??data;
  if(weapon.targetType==='none'||weapon.targetType==='air'&&!b.flying||weapon.targetType==='ground'&&b.flying)continue;
  const edge=w.edgeDistance(u,b),range=weapon.attackRange;
  if(u.unitType==='thor'&&!b.flying)continue;
  const approach=Math.max(0,edge-range)/Math.max(.01,data.movementSpeed);
  if(approach>=remaining||!w.targetAllowed(view,b)||!w.hasAttackLine(view,b))continue;
  if(mode==='viking_assault'&&edge>range&&!clearLine(u,b,u.unitRadius,w.obstacles,w.terrain))continue;
  if(range<1.5){
   const d=distance(u,b),r=u.unitRadius+b.unitRadius+range*.8,p={x:b.x+(u.x-b.x)/Math.max(.001,d)*r,z:b.z+(u.z-b.z)/Math.max(.001,d)*r};
   if(blocked(p,u.unitRadius,w.obstacles)||w.terrain&&!w.terrain.canOccupy(p,u.unitRadius)||!clearLine(u,p,u.unitRadius,w.obstacles,w.terrain))continue;
   if([...w.entities.values()].some(e=>e!==u&&e!==b&&e.hp>0&&!e.flying&&distance(p,e)<u.unitRadius+e.unitRadius+.04))continue;
  }
  const raw=weapon.attackDamage+weapon.bonusDamage.reduce((n,a)=>n+(b.attributes.includes(a.attribute)?a.amount:0),0);
  const count=Math.max(0,1+Math.floor((remaining-approach-weapon.damagePoint)/Math.max(.01,weapon.attackPeriod)));
  let value=Math.max(.5,raw-b.armor)*weapon.attacks*count;
  // Conservative local area benefit; never count targets outside the native radius.
  if(mode==='hellbat')value*=Math.max(1,targets.filter(e=>!e.flying&&distance(e,b)<1.1&&w.edgeDistance(u,e)<=range+1).length);
  if(u.unitType==='lurker')value*=mode==='lurker_burrowed'?1:.6;
  if(u.unitType==='thor'&&mode==='thor'){const weapon=SOURCE_WEAPONS.JavelinMissileLaunchers;value=Math.max(.5,weapon.attackDamage+weapon.bonusDamage.reduce((n,a)=>n+(b.attributes.includes(a.attribute)?a.amount:0),0)-b.armor)*weapon.attacks*count;value*=Math.max(1,targets.filter(e=>e.flying&&distance(e,b)<.5).length);}
  const vitals=mode==='hellbat'?targets.filter(e=>!e.flying&&distance(e,b)<1.1).reduce((n,e)=>n+e.hp+((e as Entity).shield??0),0):b.hp+((b as Entity).shield??0);
  best=Math.max(best,Math.min(vitals,value));
 }
 return best;
}
/** Existing familyModes is the persistent manual lock. Missing old provenance stays untouched. */
export function planNativeMode(w:World,u:Entity){
 const saved=u.autoMode;if(!saved||!squadActor(u)||u.heroId||u.eliteId||!automated.includes(u.unitType)||w.expedition.familyModes[u.unitType as ModeFamily]!==undefined)return;
 if((u.desiredNativeMode??u.nativeMode??u.unitType)!==saved.mode)return;
 if((u.stoppedUntil??0)>w.time||u.windup>0)return;
 const moving=movementIntent(w,u),current=u.nativeMode??u.unitType;
 if(u.nativeModeUntil){
  if(u.unitType==='viking'&&current==='viking'&&saved.mode==='viking_assault'){
   let air=false;w.hash.query(u,12,b=>{if(b.hp>0&&b.flying&&w.targetAllowed(u,b)&&w.edgeDistance(u,b)<=9)air=true;});
   if(moving||air||vikingLandingBlocked(w,u)){u.desiredNativeMode='viking';u.nativeModeUntil=undefined;u.action='idle';saved.mode='viking';saved.since=w.time;}
  }return;
 }
 if(u.unitType==='hellion'&&current==='hellion'&&!w.expedition.tech['unlock.hellion'])return;
 const immediate=moving&&(u.unitType==='viking'&&current!=='viking'||u.unitType==='hellion'&&current==='hellbat');
 if(!immediate&&u.unitType!=='viking'&&(w.time<(nextChecks.get(u)??0)||w.time-saved.since<1))return;
 let forced:string|undefined;
 const targets:Body[]=[];w.hash.query(u,14,b=>{if(b.hp>0&&b.owner!==u.owner&&!b.heldBy&&w.visibleTo(b,u.owner))targets.push(b);});
 if(u.unitType==='viking'&&current!=='viking'&&(moving||targets.some(b=>b.flying&&w.edgeDistance(u,b)<=9)))forced='viking';
 if(u.unitType==='hellion'&&current==='hellbat'&&moving)forced='hellion';
 if(!forced&&(w.time<(nextChecks.get(u)??0)||w.time-saved.since<1))return;
 nextChecks.set(u,w.time+.24);
 if(!forced){
  if(moving)return;
  const choices=FAMILY_MODES[u.unitType as ModeFamily],other=choices.find(([mode])=>mode!==current)?.[0];if(!other)return;
  if(u.unitType==='hellion'&&other==='hellbat'&&!w.expedition.tech['unlock.hellion'])return;
  if(u.unitType==='viking'&&other==='viking_assault'&&(vikingLandingBlocked(w,u)||targets.some(b=>b.flying&&w.edgeDistance(u,b)<=9)))return;
  const existing=score(w,u,current,targets,false),alternative=score(w,u,other,targets,true);
  if(alternative<=0||alternative<existing*1.25)return;
  forced=other;
 }
 if(forced!==current){u.desiredNativeMode=forced;saved.mode=forced;saved.since=w.time;}
}
