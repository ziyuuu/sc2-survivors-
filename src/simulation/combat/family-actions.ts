import type {World} from '../world';
import type {Entity,Point,Body} from '../types';
import type {FamilyId} from '../../data/races';
import {SOURCE_ABILITIES} from '../../data/expansion-units';
import {blocked,distance} from '../movement/steering';

export const FAMILY_MODES={
 tank:[['tank','收炮'],['siege','架炮']],
 hellion:[['hellion','恶火'],['hellbat','恶蝠']],
 viking:[['viking','战机'],['viking_assault','突击']],
 thor:[['thor','爆裂弹'],['thor_high_impact','高冲击弹']],
 lurker:[['lurker','钻出'],['lurker_burrowed','埋地']],
} as const;
export type ModeFamily=keyof typeof FAMILY_MODES;
export const familyActionBodies=(w:World,family:FamilyId)=>w.familyBodies(family).filter(u=>u.eliteId!=='tank.1');
export const currentFamilyMode=(u:Entity)=>u.unitType==='tank'?u.mode:u.nativeMode??u.unitType;

/** Use the prospective ground footprint, even while the Viking is still flying. */
export function vikingLandingBlocked(w:World,u:Entity):string|null{
 const radius=u.unitRadius;
 if(Math.abs(u.x)+radius>=w.mapHalf||Math.abs(u.z)+radius>=w.mapHalf||blocked(u,radius,w.obstacles)||w.terrain&&!w.terrain.canOccupy(u,radius))return '落点地形受阻';
 const bodies:Body[]=[...w.entities.values(),...w.pods.filter(p=>['falling','active','opening'].includes(p.status)),...w.fortifications.values(),...w.expansionHives.values(),...[...w.economicTargets.values()].filter(b=>b.status==='active'),...(w.hive?[w.hive]:[])];
 if(bodies.some(b=>b.id!==u.id&&b.hp>0&&!b.flying&&distance(u,b)<radius+b.unitRadius))return '落点被占用';
 const landing=w.expedition.support.unique.landing;
 if(landing&&distance(u,landing.point)<radius+1.6)return '落点已有投送预留';
 return null;
}

export function familyModeState(w:World,family:ModeFamily){
 const units=familyActionBodies(w,family),choices=FAMILY_MODES[family];
 const requested=family==='tank'?w.tankCommand:w.expedition.familyModes[family]??choices[0][0];
 const next=requested===choices[0][0]?choices[1][0]:choices[0][0];
 const modes=units.map(currentFamilyMode),moving=units.filter(u=>family==='tank'?u.modeTimer>0:u.nativeModeUntil!==undefined);
 const waiting=family==='viking'?moving.filter(u=>u.desiredNativeMode==='viking_assault'&&w.time+1e-8>=(u.nativeModeUntil??Infinity)&&vikingLandingBlocked(w,u)):[];
 const remaining=Math.max(0,...moving.map(u=>family==='tank'?u.modeTimer:Math.max(0,(u.nativeModeUntil??w.time)-w.time)));
 const reason=!units.length?'没有存活的对应单位':family==='hellion'&&next==='hellbat'&&!w.expedition.tech['unlock.hellion']?'恶蝠科技未解锁':'';
 return {units,requested,next,remaining,transitioning:moving.length,blocked:waiting.length,mixed:new Set(modes).size>1,active:modes.length>0&&modes.every(mode=>mode===choices[1][0]),enabled:!reason,reason};
}
export function canSetFamilyMode(w:World,family:FamilyId,mode:string){
 if(!(family in FAMILY_MODES))return false;
 const choices=FAMILY_MODES[family as ModeFamily];
 return choices.some(([id])=>id===mode)&&familyActionBodies(w,family).length>0&&!(family==='hellion'&&mode==='hellbat'&&!w.expedition.tech['unlock.hellion']);
}

/** Read-only preview is also used by execution, so failed manual abilities spend nothing. */
export function familyAbilityState(w:World,family:FamilyId,target?:Point){
 const units=familyActionBodies(w,family),off=family==='banshee'&&units.some(u=>u.cloaked);
 const ready=units.filter(u=>family==='banshee'?off?u.cloaked:u.energy>=SOURCE_ABILITIES.bansheeCloak.startEnergy:w.time+1e-8>=(u.abilityReady??0));
 const positions:{unit:Entity;point:Point}[]=[];
 let reason=!units.length?'没有存活的对应单位':family==='banshee'&&!w.expedition.tech.cloak?'隐形科技未解锁':family==='stalker'&&!w.expedition.tech.blink?'闪烁科技未解锁':family!=='banshee'&&family!=='stalker'?'该单位没有手动技能':!ready.length?family==='banshee'?'能量不足':'闪烁冷却中':'';
 if(!reason&&family==='stalker'&&target){
  if(!Number.isFinite(target.x)||!Number.isFinite(target.z))reason='落点无效';
  else for(const unit of ready){
   if(distance(unit,target)>SOURCE_ABILITIES.blink.range)continue;
   const point=w.freePosition(unit.unitType,target,0,2);
   if(point&&distance(unit,point)<=SOURCE_ABILITIES.blink.range&&(!w.terrain||w.terrain.canOccupy(point,unit.unitRadius)))positions.push({unit,point});
  }
  if(!reason&&!positions.length)reason='闪烁落点受阻或超出距离';
 }
 return {units,ready,positions,off,enabled:!reason,reason,remaining:units.length?Math.max(0,Math.min(...units.map(u=>(u.abilityReady??0)-w.time))):0};
}
