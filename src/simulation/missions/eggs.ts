import {MISSION_RULES} from './config';
import type {World} from '../world';
import type {MissionRecord} from './state';
import type {Entity,Point} from '../types';
import {SC2_UNITS} from '../../data/sc2-units';
import {continuousSpecialProfile} from '../../data/enemy-tuning';
import {equipmentWorkerRescue} from '../starship/modules';
import {makeMissionBody,missionNear,missionPointLegal,missionAwayFromSquad,finishMission,releaseMissionQueue} from './runtime';
import {nearbyMissionPoint,currentMissionStamp} from './encounters';
import {distance,steerGoal,translate} from '../movement/steering';
export function spawnEggs(w:World,m:MissionRecord){
 const total=MISSION_RULES.eggs.minimum+Math.floor(w.random()*(MISSION_RULES.eggs.maximum-MISSION_RULES.eggs.minimum+1));let points:Point[]=[];
 for(let attempt=0;attempt<32;attempt++){const center=nearbyMissionPoint(w,12,20);if(!center)continue;points=[];
  for(let i=0;i<256&&points.length<total;i++){const a=w.random()*Math.PI*2,r=Math.sqrt(w.random())*7,p={x:center.x+Math.cos(a)*r,z:center.z+Math.sin(a)*r};if(missionPointLegal(w,p,.65)&&missionAwayFromSquad(w,p,.65,12)&&!points.some(q=>distance(p,q)<2))points.push(p);}if(points.length===total)break;
 }if(points.length!==total)return false;m.total=total;
 for(const p of points){const b=makeMissionBody(w,m,'egg',p,24,'egg','zerg',.65);if(w.random()<MISSION_RULES.eggs.workerChance)b.payload={kind:'worker',appearance:(['scv','drone','probe'] as const)[Math.floor(w.random()*3)]};else {const types:('zergling'|'baneling')[]=[];for(let i=0,n=2;i<n;i++)types.push(!types.includes('baneling')&&w.random()<MISSION_RULES.eggs.banelingChance?'baneling':'zergling');b.payload={kind:'enemies',types};}}
 return true;
}
export function tickEggs(w:World,m:MissionRecord){
 for(const id of m.bodyIds){const b=w.missions.bodies.get(id)!;if(b.resolved)continue;
  if(b.hp>0){if(m.phase==='offered'&&missionNear(w,b,6))m.phase='active';continue;}
  const key=m.id+':egg:'+id;if(w.missions.receipts.has(key))continue;
  b.resolved=true;m.completed++;m.phase='active';w.missions.receipts.add(key);
  if(b.payload?.kind==='worker'){w.workers+=equipmentWorkerRescue(w,id,1,b);w.stats.workersRescued++;w.visual('scv-rescue',b,b,undefined,undefined,{rescueModel:b.payload.appearance});}
  else if(b.payload?.kind==='enemies')for(const type of b.payload.types)m.queue.push({taskId:m.id,sourceId:id,type,elite:true,pulse:type==='baneling',noLoot:true,readyAt:w.time+.5,stamp:currentMissionStamp(w),point:{x:b.x,z:b.z}});
 }
 releaseMissionQueue(w);if(m.completed===m.total){m.phase='resolving';if(!m.queue.length)finishMission(w,'succeeded');}
}
export function createPulseBaneling(w:World,p:Point,item:import('./state').MissionSpawn){
 const u=w.addUnit('baneling','zerg',p.x,p.z,1,'regular',item.stamp.stage,item.stamp),d=SC2_UNITS.roach,base={hp:d.maxHp,damage:d.attackDamage,period:d.attackPeriod,armor:d.armor};
 const elite=continuousSpecialProfile(w.difficulty,'roach','elite',item.stamp,base),boss=continuousSpecialProfile(w.difficulty,'roach','boss',item.stamp,base);
 // This fixed mission profile replaces the ordinary spawn health and pulse damage.
 u.hp=u.maxHp=elite.hp*(u.pandora?1.25:1);u.armor=elite.armor;u.enemyTier='elite';u.enemyLevel=elite.level;u.enemyName='脉冲毒爆';u.weaponDamage=0;u.specialDamageMultiplier=Math.min(SC2_UNITS.baneling.attackDamage*elite.skillDamage,60*boss.skillDamage*.6)*(u.pandora?1.15:1);u.visualScale=1.2;return u;
}
export function tickPulseBaneling(w:World,u:Entity,dt:number){
 const data=u.mission!;if(w.time>=data.nextAction){if((u.stoppedUntil??0)<=w.time){w.visual('attack',u);w.effect('explosion',u,u,2.2,.4);const targets=[...w.entities.values(),...w.fortifications.values()];for(const b of targets)if(b.owner==='terran'&&b.hp>0&&!b.flying&&distance(u,b)<=2.2+b.unitRadius&&w.hasAttackLine(u,b))w.hit(b,u.specialDamageMultiplier??0,[],1,'zerg',.5,0,u.id);}data.nextAction=w.time+MISSION_RULES.eggs.pulseSeconds;}
 u.prev={x:u.x,z:u.z};if(w.time>=data.nextAction-MISSION_RULES.eggs.pulseWarning||(u.stoppedUntil??0)>w.time){u.action='skill';u.velocity={x:0,z:0};return true;}
 const target=w.findTarget(u,w.mapHalf*2);if(!target)return true;const goal=steerGoal(u,target,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),d=distance(u,goal);
 if(d>.001){u.facing=Math.atan2(goal.x-u.x,goal.z-u.z);u.action='move';u.velocity={x:(goal.x-u.x)/d*u.moveSpeed,z:(goal.z-u.z)/d*u.moveSpeed};translate(u,{x:u.velocity.x*dt,z:u.velocity.z*dt},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);}return true;
}
