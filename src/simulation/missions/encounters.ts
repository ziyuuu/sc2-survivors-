import {MISSION_RULES,missionWaveTicks} from './config';
import type {World} from '../world';
import type {MissionRecord,MissionBody} from './state';
import {campaignProgress,continuousSpecialProfile} from '../../data/enemy-tuning';
import {SC2_UNITS} from '../../data/sc2-units';
import {makeMissionBody,missionNear,missionPointLegal,missionAwayFromSquad,finishMission,releaseMissionQueue} from './runtime';
import {distance,clearLine} from '../movement/steering';
import {identityCandidates,planIntelReward,deliverReward} from './rewards';
import {planTaskEquipment} from '../starship/drops';
export function currentMissionStamp(w:World){return {stage:w.stage,progress:campaignProgress(w.stage,w.stageElapsed,w.duration),density:1 as const};}
export function nearbyMissionPoint(w:World,min=12,max=24){for(let i=0;i<32;i++){const p=w.eventPoint(min,max);if(missionPointLegal(w,p,1.5)&&missionAwayFromSquad(w,p,1.5,12))return p;}return null;}
export function queueMissionGuards(w:World,m:MissionRecord,b:MissionBody,elite:number,ordinary:number,noLoot=false){
 const stamp=currentMissionStamp(w),members=w.missionWaveMembers(),types=members.filter(v=>v.stamp.density===1).map(v=>v.type),specials=(['zergling','roach','hydralisk','ravager'] as const).filter(type=>members.some(m=>m.type===type));if(!specials.length)specials.push('zergling');const first=Math.floor(w.random()*specials.length);
 for(let i=0;i<elite+ordinary;i++){const member=m.kind==='fleet'&&i>=elite?members[(i-elite)%Math.max(1,members.length)]:undefined;m.queue.push({taskId:m.id,sourceId:b.id,type:member?.type??(i<elite?specials[(first+i)%specials.length]:types.length?types[Math.floor(w.random()*types.length)]:'zergling'),resources:member?.resources,elite:i<elite,noLoot,stamp:{...stamp,density:member?.stamp.density??1},point:{x:b.x+5,z:b.z}});}
}
export function intelPoint(w:World,m:MissionRecord){const from=m.lastPoint??w.anchor;for(let i=0;i<96;i++){const a=w.random()*Math.PI*2,r=8+w.random()*7,p={x:from.x+Math.sin(a)*r,z:from.z+Math.cos(a)*r};if(!missionAwayFromSquad(w,p,.8,12)||!missionPointLegal(w,p,.8)||!clearLine(from,p,.8,w.obstacles,w.terrain)||!clearLine(w.anchor,p,.4,w.obstacles,w.terrain)||m.bodyIds.some(id=>{const b=w.missions.bodies.get(id);return b&&distance(b,p)<5;}))continue;return p;}return null;}
export function spawnIntel(w:World,m:MissionRecord){
 const p=intelPoint(w,m);if(!p)return false;
 const gear=w.starship.enabled&&!!w.starship.account.run&&!w.starship.account.run.ended;
 const tiers=([0,1,2] as const).filter(t=>gear||identityCandidates(w,t).length),sum=tiers.reduce<number>((s,t)=>s+MISSION_RULES.intel.weights[t],0);if(!sum)return false;
 let roll=w.random()*sum,tier=tiers[0];for(const t of tiers){roll-=MISSION_RULES.intel.weights[t];if(roll<0){tier=t;break;}}
 if(!planIntelReward(w,m,tier))return false;
 m.intelTier=tier;m.total=MISSION_RULES.intel.counts[tier][0]+Math.floor(w.random()*(MISSION_RULES.intel.counts[tier][1]-MISSION_RULES.intel.counts[tier][0]+1));
 const b=makeMissionBody(w,m,'intel',p,1,'mission.intel','terran',.8,true);queueMissionGuards(w,m,b,tier===2?2:1,8);return true;
}
export function tickIntel(w:World,m:MissionRecord){
 releaseMissionQueue(w);
 if(m.pendingNext){const p=intelPoint(w,m);if(!p)return;const b=makeMissionBody(w,m,'intel',p,1,'mission.intel','terran',.8,true);queueMissionGuards(w,m,b,m.intelTier===2?2:1,8);m.pendingNext=false;return;}
 const b=w.missions.bodies.get(m.bodyIds.at(-1)!);if(!b)return;
 if(m.phase==='resolving'){if(deliverReward(w,m,b))finishMission(w,'succeeded');return;}
 if(!missionNear(w,b,2-b.unitRadius))return;m.phase='active';b.progress++;
 if(b.progress<MISSION_RULES.intel.residenceTicks)return;
 const receipt=m.id+':intel:'+b.id;if(w.missions.receipts.has(receipt))return;w.missions.receipts.add(receipt);m.completed++;b.resolved=true;m.lastPoint={x:b.x,z:b.z};
 if(m.completed<m.total)m.pendingNext=true;else {m.phase='resolving';if(deliverReward(w,m,b))finishMission(w,'succeeded');}
}
export function spawnHives(w:World,m:MissionRecord){
 const total=MISSION_RULES.hives.minimum+Math.floor(w.random()*(MISSION_RULES.hives.maximum-MISSION_RULES.hives.minimum+1));let points:{x:number;z:number}[]=[];
 for(let group=0;group<32;group++){const center=nearbyMissionPoint(w,12,20);if(!center||!missionPointLegal(w,center,2.4))continue;points=[center];
  for(let attempt=0;attempt<128&&points.length<total;attempt++){const angle=w.random()*Math.PI*2,r=8+w.random()*4,p={x:center.x+Math.sin(angle)*r,z:center.z+Math.cos(angle)*r};if(missionPointLegal(w,p,2.4)&&missionAwayFromSquad(w,p,2.4,12)&&points.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>=8)&&(!w.terrain||w.terrain.walkLine(center,p,.6)))points.push(p);}if(points.length===total)break;
 }
 if(points.length!==total)return false;m.total=points.length;const stamp=currentMissionStamp(w),d=SC2_UNITS.roach;
 // Use the same ordinary profile as a real roach, without creating a hidden combat body.
 const hp=w.missionOrdinaryHp('roach',stamp)*8;
 for(const p of points){const b=makeMissionBody(w,m,'hive',p,hp,'hive','zerg',2.4);b.armor=2;b.production=3+Math.floor(w.random()*3);b.nextSpawn=missionWaveTicks(MISSION_RULES.hives.waveTicks,w.stage);}
 return true;
}
export function tickHives(w:World,m:MissionRecord){
 for(const id of m.bodyIds){const b=w.missions.bodies.get(id)!;if(b.resolved)continue;
  if(b.hp<=0){b.resolved=true;m.completed++;m.queue=m.queue.filter(v=>v.sourceId!==b.id);const key=m.id+':hive:'+id+':equipment';if(!w.missions.receipts.has(key)){const plan=planTaskEquipment(w,{difficulty:w.difficulty,stage:w.stage,tier:'elite'},key);if(plan)w.missions.pendingEquipment.push({plan,point:{x:b.x,z:b.z}});w.missions.receipts.add(key);}continue;}
  if(m.phase==='offered'&&missionNear(w,b,6))m.phase='active';b.age++;
  if(b.age>=(b.nextSpawn??missionWaveTicks(MISSION_RULES.hives.waveTicks,w.stage))&&!m.queue.some(v=>v.sourceId===b.id)&&m.queue.length<MISSION_RULES.hives.queueLimit){const n=Math.min(2*b.production!,b.production!+Math.floor(b.age/MISSION_RULES.hives.growthTicks));queueMissionGuards(w,m,b,0,Math.min(n,MISSION_RULES.hives.queueLimit-m.queue.length));b.nextSpawn=b.age+missionWaveTicks(MISSION_RULES.hives.waveTicks,w.stage);}
 }
 releaseMissionQueue(w);if(m.completed===m.total)finishMission(w,'succeeded');
}
