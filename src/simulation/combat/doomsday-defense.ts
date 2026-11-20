import {DOOMSDAY_CARD_BY_ID as C} from '../../data/terran-doomsday';
import {formalDoomsdayMember,mechanicalMember,mechanicalRank} from './doomsday-roster';
import {doomsdayCombat} from './doomsday-combat';
import {canReceiveRecovery} from './support-targets';
import {observeRecovery} from '../observation';
import {teamHealingFactor} from './team-auras';
import {clearLine,blocked,steerGoal,translate,movementRadius} from '../movement/steering';
import type {World} from '../world';
import type {Entity,Point} from '../types';

const gap=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Incoming source is the frozen flight source when available, not its moved live body. */
export function doomsdayIncoming(w:World,u:Entity,source:Entity|undefined,direct:boolean){
 let factor=u.doomsday?.tow&&w.tick<u.doomsday.tow.untilTick?C['M-G05'].params.damage:1;
 if(!source||source.owner===u.owner||!direct)return factor;
 if(mechanicalMember(w,u)&&!u.flying&&mechanicalRank(w,u,'M-G09')){
  const dx=source.x-u.x,dz=source.z-u.z,d=Math.hypot(dx,dz);
  if(d>0&&(dx*Math.sin(u.facing)+dz*Math.cos(u.facing))/d>=Math.cos(C['M-G09'].params.angle*Math.PI/180)){factor*=C['M-G09'].params.damage;w.visual('support-pulse',u,source,undefined,undefined,{doomsdayEffect:'armor-deflect'});}
 }
 const rank=mechanicalRank(w,u,'M-W08');
 if(rank&&formalDoomsdayMember(u)&&['marine','reaper','marauder'].includes(u.unitType)){
  const dx=u.x-source.x,dz=u.z-source.z,l2=dx*dx+dz*dz;
  const cover=l2>0?w.allies().find(car=>{
   if(car.id===u.id||car.flying||!mechanicalMember(w,car)||gap(car,u)>C['M-W08'].params.range)return false;
   const t=((car.x-source.x)*dx+(car.z-source.z)*dz)/l2;
   return t>0&&t<1&&Math.hypot(car.x-source.x-dx*t,car.z-source.z-dz*t)<=car.unitRadius;
  }):undefined;if(cover){factor*=C['M-W08'].params.damage[rank-1];w.visual('support-pulse',cover,source,undefined,undefined,{doomsdayEffect:'cover',doomsdayOrigin:{x:u.x,z:u.z}});}
 }
 return factor;
}
/** Called only after immunity checks, once for the full incoming damage packet. */
export function doomsdayOuterDamage(w:World,u:Entity|undefined,outer:boolean){
 if(!u||!outer||!mechanicalMember(w,u))return 1;
 const rank=mechanicalRank(w,u,'M-W06');if(!rank)return 1;const s=doomsdayCombat(u);
 if(w.tick<(s.fragmentReadyTick??0))return 1;
 s.fragmentReadyTick=w.tick+C['M-W06'].params.cooldown;w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'fragment'});return C['M-W06'].params.damage[rank-1];
}
export function doomsdayAfterDamage(w:World,u:Entity,loss:number){
 if(loss<=0||u.hp<=0||u.flying||!mechanicalMember(w,u)||!mechanicalRank(w,u,'M-G05')||u.hp/u.maxHp>C['M-G05'].params.threshold)return;
 const s=doomsdayCombat(u),p=C['M-G05'].params;if(w.tick<(s.tow?.readyTick??0))return;
 const helper=w.allies().filter(v=>v.id!==u.id&&!v.flying&&mechanicalMember(w,v)&&v.hp/v.maxHp>p.helperHealth&&gap(v,u)<=p.range).sort((a,b)=>gap(a,u)-gap(b,u)||a.id-b.id)[0];if(!helper)return;
 const d=gap(helper,u);if(d<.01)return;const dx=(helper.x-u.x)/d,dz=(helper.z-u.z)/d,r=movementRadius(u);
 for(let offset=movementRadius(helper)+r+.2;offset<=movementRadius(helper)+r+2;offset+=.25){
  const goal={x:helper.x+dx*offset,z:helper.z+dz*offset};
  if(Math.abs(goal.x)+r>=w.mapHalf||Math.abs(goal.z)+r>=w.mapHalf||blocked(goal,r,w.obstacles)||w.terrain&&!w.terrain.canOccupy(goal,r)||!clearLine(u,goal,r,w.obstacles,w.terrain)||w.allies().some(v=>v.id!==u.id&&!v.flying&&gap(v,goal)<movementRadius(v)+r+.05))continue;
  s.tow={helper:{entityId:helper.id,bornAt:helper.bornAt},goal,untilTick:w.tick+p.duration,readyTick:w.tick+p.cooldown};return;
 }
}
export function doomsdayTowMovement(w:World,u:Entity,dt:number){
 const tow=u.doomsday?.tow;if(!tow||w.tick>=tow.untilTick)return false;const helper=w.entities.get(tow.helper.entityId);
 if(!helper||helper.hp<=0||helper.bornAt!==tow.helper.bornAt||gap(u,tow.goal)<.15){tow.untilTick=w.tick;return false;}
 if(u.mode==='siege'){u.desiredMode='tank';return false;}if(u.modeTimer>0||u.nativeModeUntil||(u.stoppedUntil??0)>w.time)return false;
 const radius=movementRadius(u),goal=steerGoal(u,tow.goal,radius,w.obstacles,w.terrain,w.mapHalf),d=gap(u,goal),step=Math.min(d,u.moveSpeed*dt),before={x:u.x,z:u.z};
 u.windup=0;u.pendingTarget=null;u.attackTarget=null;u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);
 if(d>.001)translate(u,{x:(goal.x-u.x)/d*step,z:(goal.z-u.z)/d*step},radius,false,w.obstacles,w.mapHalf,w.terrain);
 u.prev=before;u.velocity={x:(u.x-before.x)/dt,z:(u.z-before.z)/dt};u.action=gap(u,before)>.001?'move':'idle';return true;
}
export function doomsdayDeath(w:World,u:Entity){
 const s=w.expedition.doomsday;if(!s||!mechanicalMember(w,u)||!mechanicalRank(w,u,'M-G08'))return;
 (s.scrap??=[]).push({id:w.nextId++,source:{entityId:u.id,bornAt:u.bornAt},x:u.x,z:u.z});
}
/** A single shot is consumed before its original arrival; other flights are untouched. */
export function interceptDoomsdayFlight(w:World){
 const s=w.expedition.doomsday;if(!s?.ranks['M-B06']||w.tick<(s.interceptReady??0))return;
 const guards=w.allies().filter(u=>mechanicalMember(w,u)&&u.weaponDamage>0&&mechanicalRank(w,u,'M-B06'));
 const eligible=w.weaponFlights.flatMap(p=>{
  if(p.source.owner!=='zerg'||p.lost||p.start>w.time||p.expires<=w.time||p.hits!==1||p.bounceDamage||p.doomsdayDerived||!['roach','ravager','hydralisk'].includes(p.source.unitType))return [];
  const target=w.entities.get(p.target);if(!target||target.hp<=0||target.owner!=='terran'||target.heldBy||!w.visibleTo(target,p.source.owner)||!w.hasAttackLine(p.source,target))return [];
  const guard=guards.filter(u=>gap(u,target)<=4).sort((a,b)=>gap(a,target)-gap(b,target)||a.id-b.id)[0];if(!guard)return [];
  const raw=(p.damage+p.bonuses.reduce((n,b)=>n+(target.attributes.includes(b.attribute)?b.amount:0),0))*p.enemyFactor*p.crit;
  const expected=Math.max(0,Math.max(.5,raw-w.effectiveArmor(target))-(target.shield??0)-(target.doomsday?.nano?.remaining??0));
  return [{p,target,guard,expected,lethal:expected>=target.hp,arrival:gap(p.point,target)/p.speed}];
 }).sort((a,b)=>Number(b.lethal)-Number(a.lethal)||b.expected-a.expected||a.arrival-b.arrival||a.p.id-b.p.id);
 const selected=eligible[0];if(!selected)return;
 w.weaponFlights=w.weaponFlights.filter(p=>p.id!==selected.p.id);s.interceptReady=w.tick+C['M-B06'].params.cooldown;
 w.visual('support-flight',selected.guard,selected.p.point,undefined,undefined,{supportVisual:'bunker-shot',doomsdayEffect:'intercept'});
 w.effect('explosion',selected.guard,selected.p.point,.35,.2);
}
export function tickDoomsdayDefense(w:World){
 const s=w.expedition.doomsday;if(!s)return;
 const machines=w.allies().filter(u=>mechanicalMember(w,u));
 if(s.scrap?.length){
  s.scrap=s.scrap.filter(scrap=>{
   if(gap(w.anchor,scrap)>C['M-G08'].params.pickup)return true;
   const target=machines.filter(u=>canReceiveRecovery(u)&&u.hp<u.maxHp&&gap(u,scrap)<=4).sort((a,b)=>(a.hp/a.maxHp-b.hp/b.maxHp)||gap(a,scrap)-gap(b,scrap)||a.id-b.id)[0];if(!target)return true;
   const amount=Math.min(target.maxHp-target.hp,target.maxHp*C['M-G08'].params.repair*teamHealingFactor(w,target));if(amount<=0)return true;
   target.hp+=amount;w.stats.healed+=amount;observeRecovery(w,scrap.source.entityId,target,amount);w.effect('heal',target,target,.5,.5);w.visual('support-pulse',{...target,...scrap},target,undefined,undefined,{doomsdayEffect:'nano-scrap'});return false;
  });
 }
 for(const u of machines){
  if(!mechanicalRank(w,u,'M-B08')||!['tank','thor'].includes(u.unitType))continue;
  const state=doomsdayCombat(u),p=C['M-B08'].params,b=state.brace??={settled:0,readyTick:0};
  b.settled=Math.hypot(u.velocity.x,u.velocity.z)<.1?b.settled+1:0;
  if(u.modeTimer>0||u.nativeModeUntil||(u.unitType==='tank'?u.mode!=='siege':b.settled<p.settleTicks))continue;
  if(w.tick<b.readyTick)continue;
  const victims=[...w.entities.values()].filter(v=>v.hp>0&&!v.flying&&v.owner!==u.owner&&!v.heldBy&&gap(u,v)<=p.radius&&w.visibleTo(v,u.owner)&&w.hasAttackLine(u,v));
  if(!victims.length)continue;b.readyTick=w.tick+p.cooldown;
  for(const v of victims){if(v.enemyTier==='boss'||v.enemyTier==='lord'){v.moveSlowUntil=Math.max(v.moveSlowUntil??0,w.time+p.duration/60);v.moveSlowFactor=Math.max(v.moveSlowFactor??0,1-p.bossSpeed);}else v.stoppedUntil=Math.max(v.stoppedUntil??0,w.time+p.duration/60);}
  w.effect('explosion',u,u,p.radius,.35);w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'brace',supportRadius:p.radius});
 }
}
