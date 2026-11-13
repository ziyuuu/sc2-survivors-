import {armedTargetAllowed} from './armed-targets';
import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {armedRank} from '../progression/build-progress';
import type {ArmedDeployment} from './armed-support-state';
import {armedTemporaryUsed} from './armed-reinforcements';
import {equipmentCardDamage} from '../starship/card-effects';
import {equipmentPresentation} from '../starship/presentation';
import {clearLine} from '../movement/steering';
import {hitFrom} from '../observation';
import type {World} from '../world';
import type {Body} from '../types';

export function planetaryReady(w:World,stageKey:string){const a=w.expedition.support.armed!,p=C.O03.params,contact=[...w.entities.values()].some(e=>armedTargetAllowed(w,e)&&w.visibleTo(e,'terran'));
 if(!contact){a.hold=undefined;return false;}const hold=a.hold;if(!hold||hold.stageKey!==stageKey||Math.hypot(w.anchor.x-hold.point.x,w.anchor.z-hold.point.z)>p.holdRadius){a.hold={point:{x:w.anchor.x,z:w.anchor.z},sinceTick:w.tick,stageKey};return false;}return w.tick-hold.sinceTick>=p.holdTime*60;
}
export function armedFortDamage(w:World,target:Body,actual:number){if(actual<=0)return;const a=w.expedition.support.armed,d=a?.deployments.find(d=>d.id===target.id&&d.cardId==='O03'&&d.phase==='active');if(!d)return;const p=C.O03.params;d.chargeDamage=(d.chargeDamage??0)+actual;const earned=Math.floor(d.chargeDamage/p.chargeHp);d.chargeDamage%=p.chargeHp;d.charges=Math.min(p.charges,(d.charges??0)+earned);}
function garrison(w:World,d:ArmedDeployment){const p=C.O03.params;if(armedTemporaryUsed(w)+p.marines>(armedRank(w.expedition.support,'N03')?24:18))return false;
 for(let i=0;i<p.marines;i++)d.passengers.push({origin:{x:d.point.x+(i%2?1:-1)*(d.radius+.7),z:d.point.z-.5},family:'marine',rank:p.rank,formal:false,exitTick:w.tick+i*6,lifeTicks:p.marineLife*60,entityId:null,cancelled:false});return true;
}
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function tickArmedPlanetary(w:World){const a=w.expedition.support.armed;if(!a)return;const p=C.O03.params;
 for(const d of a.deployments){if(d.cardId!=='O03'||d.phase!=='active'||w.tick>=d.endTick)continue;const fort=w.fortifications.get(d.id);if(!fort||fort.hp<=0)continue;
  const target=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&!e.flying&&w.visibleTo(e,'terran')&&Math.hypot(e.x-fort.x,e.z-fort.z)<=p.range+e.unitRadius&&clearLine(fort,e,.1,w.obstacles,w.terrain)).sort((a,b)=>Math.hypot(a.x-fort.x,a.z-fort.z)-Math.hypot(b.x-fort.x,b.z-fort.z)||a.id-b.id)[0];
  if(target&&w.time+1e-8>=fort.nextActionAt){fort.nextActionAt=w.time+p.gap/60;fort.lastShotTick=w.tick;fort.facing=Math.atan2(target.x-fort.x,target.z-fort.z);equipmentPresentation(w,'fort-shot',fort,target,'planetary',undefined,true);hitFrom(w,'armed.O03',target,equipmentCardDamage(w,p.damage),[],1,'terran',0);w.stats.shots++;}
  if(target&&!d.sweep&&(d.charges??0)>0&&w.tick>=(d.pierceReadyTick??0)&&garrison(w,d)){
   d.charges!--;d.pierceReadyTick=w.tick+p.pierceCd*60;
   const angle=Math.atan2(target.x-fort.x,target.z-fort.z)-p.sweepAngle/2,pulses=Math.round(p.sweepTime/p.sweepGap);
   d.sweep={startedTick:w.tick,endTick:w.tick+p.sweepTime*60,nextTick:w.tick+p.sweepGap*60,angle,nextIndex:0,pulses,damage:equipmentCardDamage(w,p.pierceDamage)};
   w.visual('support-flight',fort,{x:fort.x+Math.sin(angle)*p.length,z:fort.z+Math.cos(angle)*p.length},d.castId,undefined,{supportVisual:'planetary-beam',supportRadius:p.width,supportDuration:p.sweepTime});
  }
  const sweep=d.sweep;if(sweep){
   const progress=Math.min(1,(w.tick-sweep.startedTick)/(sweep.endTick-sweep.startedTick));
   if(target){const aim=Math.atan2(target.x-fort.x,target.z-fort.z)+(progress-.5)*p.sweepAngle;sweep.angle+=Math.max(-.8/60,Math.min(.8/60,angleDelta(aim,sweep.angle)));}
   fort.facing=sweep.angle;
   while(sweep.nextIndex<sweep.pulses&&sweep.nextTick<=w.tick&&sweep.nextTick<=sweep.endTick){sweep.nextIndex++;sweep.nextTick+=p.sweepGap*60;const fx=Math.sin(sweep.angle),fz=Math.cos(sweep.angle);
    for(const e of [...w.entities.values()])if(armedTargetAllowed(w,e)&&!e.flying&&w.visibleTo(e,'terran')){const x=e.x-fort.x,z=e.z-fort.z,along=x*fx+z*fz,across=Math.abs(x*fz-z*fx);if(along>=0&&along<=p.length+e.unitRadius&&across<=p.width/2+e.unitRadius&&clearLine(fort,e,.1,w.obstacles,w.terrain))hitFrom(w,'armed.O03',e,sweep.damage/sweep.pulses,[],1,'terran',0);}
   }
   if(w.tick>=sweep.endTick)delete d.sweep;
  }
  if(!d.rearGuardSent&&Math.hypot(w.anchor.x-fort.x,w.anchor.z-fort.z)>p.leaveRadius&&garrison(w,d))d.rearGuardSent=true;
 }
}
