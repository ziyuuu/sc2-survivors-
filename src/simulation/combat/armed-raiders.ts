import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {armedTargetAllowed} from './armed-targets';
import {steerGoal,translate} from '../movement/steering';
import {equipmentCardDamage} from '../starship/card-effects';
import {hitFrom} from '../observation';
import type {World} from '../world';
import type {Entity,Point} from '../types';

/** Check the actual body-to-body approach space, including enemies on the flank. */
export function raiderEntryClearance(w:World,radius:number){
 const threats=[...w.entities.values()].filter(e=>!e.flying&&armedTargetAllowed(w,e)&&w.visibleTo(e,'terran'));
 const gap=C.G05.params.entryGap;
 return (point:Point)=>threats.every(enemy=>{
  const minimum=radius+enemy.unitRadius+gap;
  return (point.x-enemy.x)**2+(point.z-enemy.z)**2>=minimum**2;
 });
}

/** Receipt precedes both damage and death callbacks, including forced expiry. */
export function detonateArmedRaider(w:World,u:Entity){
 if(u.armed?.cardId!=='G05'||w.phase!=='battle')return;
 const a=w.expedition.support.armed!,receipt=`${u.id}:${u.bornAt}`,receipts=a.raiderReceipts??=[];
 if(receipts.includes(receipt))return;receipts.push(receipt);
 const p=C.G05.params,radius=u.armed.blockadeExit?C.N08.params.burnRadius:p.burnRadius;
 for(const enemy of [...w.entities.values()])if(armedTargetAllowed(w,enemy)&&!enemy.flying&&Math.hypot(enemy.x-u.x,enemy.z-u.z)<=radius+enemy.unitRadius){
  hitFrom(w,'armed.G05',enemy,equipmentCardDamage(w,p.blastDamage),[],1,'terran',u.id);
  if(enemy.hp>0)w.expedition.support.burns.push({id:w.nextId++,source:u.id,target:enemy.id,damage:equipmentCardDamage(w,p.burnDamage),next:w.time+1,until:w.time+p.burnTime,armedCardId:'G05'});
 }
 w.visual('support-impact',u,u,u.armed.castId,undefined,{supportVisual:'raider-blast',supportRadius:radius,supportDuration:.45});
}

/** A real ground unit follows native terrain routing; it never fires while charging. */
export function tickArmedRaider(w:World,u:Entity,dt:number){
 if(u.armed?.cardId!=='G05')return false;
 if(w.missions.fleet.ceasefire||(u.stoppedUntil??0)>w.time){u.velocity={x:0,z:0};u.action='idle';return true;}
 const a=w.expedition.support.armed!,status=a.unitStatus[u.id]??={},p=C.G05.params;
 const candidates=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&!e.flying&&w.visibleTo(e,'terran'));
 let target=candidates.find(e=>e.id===status.raiderTarget?.id&&e.bornAt===status.raiderTarget.generation);
 if(!target){target=candidates.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id)[0];if(target)status.raiderTarget={id:target.id,generation:target.bornAt};}
 u.attackTarget=null;u.pendingTarget=null;u.windup=0;u.attackLock=0;
 if(!target){u.velocity={x:0,z:0};u.action='idle';return true;}
 if(Math.hypot(target.x-u.x,target.z-u.z)<=u.unitRadius+target.unitRadius+p.contact){detonateArmedRaider(w,u);w.expireUnit(u);return true;}
 const exit=u.armed.blockadeExit;if(exit&&Math.hypot(exit.x-u.x,exit.z-u.z)<=1.2)status.raiderExitReached=true;const goal=exit&&!status.raiderExitReached?exit:target;
 u.prev={x:u.x,z:u.z};const next=steerGoal(u,goal,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),dx=next.x-u.x,dz=next.z-u.z,d=Math.hypot(dx,dz),step=Math.min(d,u.moveSpeed*p.chargeSpeed*dt);
 if(d>1e-6)translate(u,{x:dx/d*step,z:dz/d*step},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);
 u.velocity={x:(u.x-u.prev.x)/dt,z:(u.z-u.prev.z)/dt};u.distanceWalked+=Math.hypot(u.x-u.prev.x,u.z-u.prev.z);u.facing=Math.atan2(dx,dz);u.action=step>.001?'move':'idle';
 return true;
}
