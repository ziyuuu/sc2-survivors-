import {MISSION_RULES} from './config';
import type {World} from '../world';
import type {MissionRecord,MissionBody} from './state';
import {makeMissionBody,missionNear,missionPointLegal,finishMission,releaseMissionQueue} from './runtime';
import {PROJECTS,eligible,facilityCount,type FacilityKind} from '../building/rules';
import {worldBuildingContext} from '../building/expedition';
import {campaignProgress} from '../../data/enemy-tuning';
const FACILITIES={terran:['barracks','factory','starport'],zerg:['hatchery'],protoss:['gateway','robotics','stargate']} as const;
const HP:Partial<Record<FacilityKind,number>>={barracks:1000,factory:1250,starport:1300,hatchery:1250,gateway:1000,robotics:900,stargate:1200};
export function repairCandidates(w:World){const s=worldBuildingContext(w);return !s||w.workers<1?[]:FACILITIES[w.expedition.race].filter(kind=>eligible(s,PROJECTS.find(p=>p.id===kind)!));}
export function spawnRepair(w:World,m:MissionRecord){
 const kinds=repairCandidates(w);if(!kinds.length)return false;let p;
 for(let i=0;i<32;i++){const q=w.eventPoint(12,20);if(missionPointLegal(w,q,2.4)){p=q;break;}}if(!p)return false;
 const kind=kinds[Math.floor(w.random()*kinds.length)],s=worldBuildingContext(w)!;
 s.missionReserved??={};s.missionReserved[kind]=(s.missionReserved[kind]??0)+1;
 m.repair={kind,waves:0};m.total=1;
 const b=makeMissionBody(w,m,'repair',p,HP[kind]!,kind,'terran',2.4,true);b.armor=1;b.hp=b.maxHp*MISSION_RULES.repair.initialHp;return true;
}
function wave(w:World,m:MissionRecord,b:MissionBody){
 const members=w.missionWaveMembers();for(const member of members)m.queue.push({taskId:m.id,sourceId:b.id,type:member.type,readyAt:w.time+member.offset,stamp:{...member.stamp},point:{x:b.x+5,z:b.z},resources:member.resources});
}
export function releaseRepairReservation(w:World,m:MissionRecord){const s=w.expedition.building,kind=m.repair?.kind;if(s?.missionReserved&&kind&&m.repair?.grantedAt===undefined)s.missionReserved[kind]=Math.max(0,(s.missionReserved[kind]??0)-1);}
export function tickRepair(w:World,m:MissionRecord){
 const b=w.missions.bodies.get(m.bodyIds[0]);if(!b||b.hp<=0){finishMission(w,'failed');return;}
 if(m.repair?.grantedAt!==undefined){if(w.time>=m.repair.grantedAt+1)finishMission(w,'succeeded');return;}
 const near=missionNear(w,b,6.5)&&w.workers>0;
 if(m.phase==='offered'){if(!near)return;m.phase='active';b.invulnerable=false;wave(w,m,b);m.repair!.waves=1;}
 if(near)b.hp=Math.min(b.maxHp,b.hp+b.maxHp*Math.min(MISSION_RULES.repair.maximumRate,w.workers*MISSION_RULES.repair.perWorker)/60);
 if(b.hp>=b.maxHp*MISSION_RULES.repair.secondWaveHp&&m.repair!.waves===1){wave(w,m,b);m.repair!.waves=2;}
 releaseMissionQueue(w);
 if(b.hp>=b.maxHp){m.phase='resolving';b.invulnerable=true;m.queue.length=0;const key=m.id+':facilityGrant',kind=m.repair!.kind,s=worldBuildingContext(w)!;if(!w.missions.receipts.has(key)){releaseRepairReservation(w,m);if(w.grantFacility(kind)){w.missions.receipts.add(key);m.repair!.grantedAt=w.time;}else{s.missionReserved??={};s.missionReserved[kind]=(s.missionReserved[kind]??0)+1;}}}
}