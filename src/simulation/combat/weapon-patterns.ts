import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import {SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {eliteEffect,eliteDamageMultiplier} from './expedition-elites';
import {distance} from '../movement/steering';
import {expeditionWeaponUpgrade,expeditionWeaponScale,talentModifiers} from './expedition-combat';

type Bonus={attribute:string;amount:number};
/** The normal attack exit keeps elite procs, enemy multipliers and armor handling in one place. */
export type PatternAttack=(target:Body,damage:number,bonuses:Bonus[],hits?:number)=>void;
const scaled=(bonuses:readonly Bonus[],factor:number)=>bonuses.map(b=>({...b,amount:b.amount*factor}));
function bodies(w:World):Body[]{return [...w.entities.values(),...w.pods.filter(p=>p.status==='active'||p.status==='opening'),...[...w.economicTargets.values()].filter(e=>e.status==='active'),...w.expansionHives.values(),...w.fortifications.values(),...(w.hive?[w.hive]:[])];}
/** Source search arcs mapped to the game's circular collision bodies. One band per victim. */
export function inWeaponArc(origin:Point,facing:number,victim:Body,radius:number,arcDegrees:number,extendByRadius=true){
 const d=distance(origin,victim),r=extendByRadius?victim.unitRadius:0;if(d>radius+r)return false;if(arcDegrees>=360||d<=r)return true;
 const direction=Math.atan2(victim.x-origin.x,victim.z-origin.z),delta=Math.abs(Math.atan2(Math.sin(direction-facing),Math.cos(direction-facing))),edge=Math.asin(Math.min(1,r/d));
 return delta<=arcDegrees*Math.PI/360+edge+1e-9;
}
const validAreaVictim=(u:Entity,b:Body,plane:'ground'|'air')=>b.hp>0&&b.owner!==u.owner&&(plane==='air'?(b.flying||('unitType' in b&&b.unitType==='colossus')):!b.flying);
/** Pinned source shapes; projectile travel remains the existing immediate-hit combat adapter. */
export function fireWeaponPattern(w:World,u:Entity,target:Body,bonuses:Bonus[],attack?:PatternAttack,crit=1){
 if(u.heroId||u.summonKind||!w.expedition)return false;const s=w.expedition,angle=Math.atan2(target.x-u.x,target.z-u.z),dx=Math.sin(angle),dz=Math.cos(angle);
 const hit:PatternAttack=attack??((victim,damage,bonus,hits=1)=>{const f=w.enemyDamageFactor(u)*eliteDamageMultiplier(u,victim);w.hit(victim,damage*f,scaled(bonus,f),hits,u.owner,.5,0,u.id);});
 if(u.unitType==='hellion'&&u.nativeMode==='hellbat'){
  const p=SOURCE_WEAPON_PATTERNS.hellbat,origin={x:u.x+dx*(p.offsetByUnitRadius?u.unitRadius:0),z:u.z+dz*(p.offsetByUnitRadius?u.unitRadius:0)},radius=p.radius*(u.eliteId==='hellion.3'?1.25:1),arc=p.arcDegrees*(u.eliteId==='hellion.3'?1.5:1);
  hit(target,u.weaponDamage,bonuses);for(const victim of bodies(w))if(victim.id!==target.id&&validAreaVictim(u,victim,'ground')&&inWeaponArc(origin,angle,victim,radius,arc,p.extendByUnitRadius)&&w.hasAttackLine(u,victim))hit(victim,u.weaponDamage,bonuses);
  w.effect('flame',u,{x:origin.x+dx*radius,z:origin.z+dz*radius},Math.tan(arc*Math.PI/360)*radius,.35);return true;
 }
 if(u.unitType==='thor'&&u.activeWeapon==='JavelinMissileLaunchers'){
  const p=SOURCE_WEAPON_PATTERNS.thorExplosive;hit(target,u.weaponDamage,bonuses,p.shots);
  for(const victim of bodies(w)){if(victim.id===target.id||!validAreaVictim(u,victim,'air'))continue;const band=p.bands.find(b=>distance(target,victim)<=b.radius+victim.unitRadius);if(band)hit(victim,u.weaponDamage*band.fraction,scaled(bonuses,band.fraction),p.shots);}
  w.effect('explosion',u,target,Math.max(...p.bands.map(b=>b.radius)),.3);return true;
 }
 if(u.unitType==='ultralisk'){
  const p=SOURCE_WEAPON_PATTERNS.ultralisk;hit(target,u.weaponDamage,bonuses);
  for(const victim of bodies(w)){if(victim.id===target.id||!validAreaVictim(u,victim,'ground')||!w.hasAttackLine(u,victim))continue;const band=p.bands.find(b=>inWeaponArc(target,angle,victim,b.radius,b.arc));if(band)hit(victim,u.weaponDamage*band.fraction,scaled(bonuses,band.fraction));}
  w.effect('hero-line',u,target,1,.2);return true;
 }
 if(u.unitType==='lurker'&&u.nativeMode==='lurker_burrowed'){
  const p=SOURCE_WEAPON_PATTERNS.lurker,points=p.offsets.map(offset=>({x:u.x-dx*offset[1]+dz*offset[0],z:u.z-dz*offset[1]-dx*offset[0]})),f=w.enemyDamageFactor(u);
  const apm=(talentModifiers(w,u).apmDuplicate??0)>0;
  s.weaponAreas.push({id:w.nextId++,source:u.id,owner:u.owner,points,nextIndex:0,next:w.time+(p.periodSeconds[0]??0),period:p.periodSeconds[1],radius:p.searchRadius*eliteEffect(u,'spineWidthMultiplier'),hits:[],damage:u.weaponDamage*f,bonuses:scaled(bonuses,f),primaryTargetId:target.id,primaryCrit:crit,...(apm?{apmDamage:u.weaponDamage*f*crit,apmBonuses:scaled(bonuses,f*crit),apmUsed:false}:{})});w.effect('hero-line',u,points.at(-1)!,p.searchRadius,.7);return true;
 }
 if(u.unitType==='colossus'){
  const p=SOURCE_WEAPON_PATTERNS.colossus,f=w.enemyDamageFactor(u),apm=(talentModifiers(w,u).apmDuplicate??0)>0;for(const [index,offsets] of [p.forwardOffsets,p.reverseOffsets].entries()){const points=offsets.map(offset=>({x:target.x+dz*offset[0]-dx*offset[1],z:target.z-dx*offset[0]-dz*offset[1]}));s.weaponAreas.push({id:w.nextId++,source:u.id,owner:u.owner,points,nextIndex:0,next:w.time,period:p.stepSeconds,radius:p.searchRadius,hits:[],damage:u.weaponDamage*f,bonuses:scaled(bonuses,f),primaryTargetId:target.id,primaryCrit:crit,...(apm&&index===1?{apmDamage:u.weaponDamage*f*2*crit,apmBonuses:scaled(bonuses,f*2*crit),apmUsed:false}:{})});}w.effect('hero-line',u,target,.3,.3);return true;
 }
 if(u.unitType==='mutalisk'){
  const p=SOURCE_WEAPON_PATTERNS.mutalisk,hitIds=new Set<number>();let victim=target,origin:Body=u;
  for(let bounce=0;bounce<p.maxTargets;bounce++){if(bounce){const next=bodies(w).filter(e=>e.hp>0&&e.owner!==u.owner&&!hitIds.has(e.id)&&w.visibleTo(e,u.owner)&&distance(e,victim)<=p.bounceRadius+e.unitRadius).sort((a,b)=>distance(a,victim)-distance(b,victim)||a.id-b.id)[0];if(!next)break;origin=victim;victim=next;}
   hitIds.add(victim.id);const effect='GlaiveWurmU'+(bounce+1),upgrade=expeditionWeaponUpgrade(w,u,effect),special=bounce?eliteEffect(u,'secondaryBounceDamageMultiplier'):victim.attributes.includes('Light')?eliteEffect(u,'firstBounceLightDamageMultiplier'):1,f=expeditionWeaponScale(w,u)*special;hit(victim,(p.damage[bounce]+upgrade.damage)*f,scaled(bonuses,p.damage[bounce]/p.damage[0]*special));const fx=w.effect('shot',origin,victim,.1,.2);fx.owner=u.owner;fx.source=u.id;
  }return true;
 }
 return false;
}
export function tickWeaponAreas(w:World){const s=w.expedition;if(!s)return;const targets=bodies(w);for(const area of s.weaponAreas){while(area.next<=w.time+1e-8&&area.nextIndex<area.points.length){const point=area.points[area.nextIndex++];for(const target of targets){if(target.hp<=0||target.owner===area.owner||target.flying||area.hits.includes(target.id)||distance(point,target)>area.radius+target.unitRadius)continue;area.hits.push(target.id);
   const direct=target.id===area.primaryTargetId&&w.visibleTo(target,area.owner),crit=direct?area.primaryCrit??1:1;
   w.hit(target,area.damage*crit,scaled(area.bonuses,crit),1,area.owner,.5,0,area.source,false,false,0,direct);
   if(direct&&area.apmDamage&&!area.apmUsed){area.apmUsed=true;const source=w.entities.get(area.source);if(target.hp>0&&source?.hp&&w.targetAllowed(source,target))w.hit(target,area.apmDamage,area.apmBonuses??[],1,area.owner,.5,0,area.source,false,false,0,true);}
  }area.next+=area.period;}}s.weaponAreas=s.weaponAreas.filter(area=>area.nextIndex<area.points.length);}
