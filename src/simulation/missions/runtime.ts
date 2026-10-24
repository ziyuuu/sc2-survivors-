import {escortSpawnClear,escortSpawnPoint} from './escort-spawn';
import {missionAllowed} from '../progression/fun-availability';
import {cancelEncounters} from '../encounters/runtime';
import {MISSION_RULES} from './config';
import {spawnFleet,tickFleetMission,tickFleetCall,clearFleet} from './fleet';
import {spawnRescue,tickRescue,cleanupRescue} from './rescue';
import {spawnEggs,tickEggs,createPulseBaneling,tickPulseBaneling} from './eggs';
import {spawnIntel,tickIntel,spawnHives,tickHives} from './encounters';
import {identityCandidates,releaseReward} from './rewards';
import {deliverTaskEquipment} from '../starship/drops';
import {repairCandidates,spawnRepair,tickRepair,releaseRepairReservation} from './repair';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {finishMissionState,type MissionBody,type MissionKind,type MissionRecord} from './state';
import {distance,blocked,clearLine,translate,steerGoal} from '../movement/steering';
import {SC2_UNITS} from '../../data/sc2-units';
import {RESCUE_PRESENTATION} from '../../data/economy';
import {equipmentWorkerRescue} from '../starship/modules';
import {campaignProgress} from '../../data/enemy-tuning';

export const MISSION_NAMES:Record<MissionKind,string>={escort:'护送农民',repair:'守卫并修复废弃建筑',intel:'情报收集',rescue:'营救精英',hives:'消灭虫巢群',eggs:'虫卵噩梦',fleet:'谁在呼叫舰队'};
export function missionBodies(w:World){return [...w.missions.bodies.values(),...corruptSiteBodies(w)].filter(b=>!b.resolved&&b.hp>0);}
export function missionNear(w:World,b:Body,r:number){return distance(w.anchor,b)<=r+b.unitRadius&&(!w.terrain||w.terrain.walkLine(w.anchor,b,0))&&w.allies().some(u=>!u.temporary&&distance(u,b)<=r+b.unitRadius);}
export function missionPointLegal(w:World,p:Point,r:number){return Math.abs(p.x)+r<w.mapHalf&&Math.abs(p.z)+r<w.mapHalf&&!blocked(p,r,w.obstacles)&&(!w.terrain||w.terrain.canOccupy(p,r))&&![...missionBodies(w),...w.expansionHives.values(),...w.fortifications.values(),...(w.hive?.hp?[w.hive]:[]),...w.pods.filter(b=>b.status==='active'||b.status==='opening'),...[...w.economicTargets.values()].filter(b=>b.status==='active')].some(b=>distance(b,p)<b.unitRadius+r+.15)&&![...w.entities.values()].some(b=>b.hp>0&&distance(b,p)<b.unitRadius+r+.15);}
export function makeMissionBody(w:World,m:MissionRecord,role:MissionBody['role'],p:Point,hp:number,model:string,owner:Body['owner'],radius:number,invulnerable=false):MissionBody {
 const b:MissionBody={id:w.nextId++,...p,hp,maxHp:hp,armor:0,unitRadius:radius,flying:false,owner,team:owner==='terran'?'player':'enemy',attributes:[...(['hatchery','hive','egg','drone'].includes(model)?['Biological']:['Mechanical']),...(role==='worker'?[]:['Structure'])],missionId:m.id,role,model,invulnerable,resolved:false,age:0,progress:0,facing:0};
 w.missions.bodies.set(b.id,b);m.bodyIds.push(b.id);return b;
}
/** Trace legal ground segments, trim the final segment to the requested travel length. */
export function escortRoute(w:World,start:Point,length=MISSION_RULES.escort.speed*MISSION_RULES.escort.travel):Point[]|null {
 const path:Point[]=[{...start}];let remaining=length;
 for(let leg=0;leg<12&&remaining>.001;leg++){
  const from=path.at(-1)!;let found=false;
  const offset=w.random()*Math.PI*2;
  for(let a=0;a<24;a++){
   const angle=offset+a*Math.PI/12,span=Math.min(remaining,15),p={x:from.x+Math.cos(angle)*span,z:from.z+Math.sin(angle)*span};
   if(!missionPointLegal(w,p,2.4)||!clearLine(from,p,1.3,w.obstacles,w.terrain))continue;
   if(path.length>1&&distance(p,path[path.length-2])<span*.7)continue;
   path.push(p);remaining-=span;found=true;break;
  }
  if(!found)return null;
 }
 return remaining<.001?path:null;
}
export function spawnMission(w:World,kind:MissionKind):boolean {
 if(!missionAllowed(w.difficulty,kind)||w.endless||w.stage<4||w.stage>18||w.missions.active||w.phase!=='battle')return false;
 if(['repair','intel','hives','eggs','rescue','fleet'].includes(kind)){const m:MissionRecord={id:String(w.runId)+':mission:'+(w.missions.serial+1),kind,phase:'offered',stage:w.stage,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:1,nextSpawn:0,receipts:[]};if(!(kind==='fleet'?spawnFleet(w,m):kind==='rescue'?spawnRescue(w,m):kind==='repair'?spawnRepair(w,m):kind==='intel'?spawnIntel(w,m):kind==='eggs'?spawnEggs(w,m):spawnHives(w,m)))return false;w.missions.serial++;w.missions.active=m;w.missions.stage=w.stage;w.announce(MISSION_NAMES[kind]);return true;}if(kind!=='escort')return false;
 let start:Point|null=null,path:Point[]|null=null;
 for(let n=0;n<32&&!path;n++){const p=w.eventPoint(8,24);if(!missionPointLegal(w,p,2.5))continue;const candidate=escortRoute(w,p);if(candidate){const end=candidate.at(-1)!,prev=candidate.at(-2)!,angle=Math.atan2(end.x-prev.x,end.z-prev.z);if(missionPointLegal(w,{x:end.x+Math.sin(angle)*4.4,z:end.z+Math.cos(angle)*4.4},2.4)){start=p;path=candidate;}}}
 if(!start||!path)return false;
 const id=`${w.runId}:mission:${++w.missions.serial}`,m:MissionRecord={id,kind,phase:'offered',stage:w.stage,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:MISSION_RULES.escort.workersMin+Math.floor(w.random()*(MISSION_RULES.escort.workersMax-MISSION_RULES.escort.workersMin+1)),nextSpawn:180,receipts:[]};
 w.missions.active=m;w.missions.stage=w.stage;
 const race=w.expedition.race,presentation=RESCUE_PRESENTATION[race],baseModel=race==='terran'?'command_center':race==='zerg'?'hatchery':'nexus';
 const end=path.at(-1)!,before=path.at(-2)!,heading=Math.atan2(end.x-before.x,end.z-before.z),basePoint={x:end.x+Math.sin(heading)*4.4,z:end.z+Math.cos(heading)*4.4};
 makeMissionBody(w,m,'base',basePoint,1,baseModel,'terran',2.4,true);
 for(let n=0;n<m.total;n++){
  const angle=n*2.399963,offset={x:Math.cos(angle)*.85,z:Math.sin(angle)*.85},p={x:start.x+offset.x,z:start.z+offset.z};
  const body=makeMissionBody(w,m,'worker',p,race==='terran'?45:race==='zerg'?40:20,presentation.workerModel,'terran',.375,true);
  body.path=path.map(q=>({x:q.x+offset.x,z:q.z+offset.z}));body.pathIndex=1;body.speed=MISSION_RULES.escort.speed;
  if(race==='protoss'){body.shield=20;body.maxShield=20;}
 }
 w.announce('发现护送农民 · 靠近防护罩接取');return true;
}
export function finishMission(w:World,result:'succeeded'|'failed'|'expired'|'cancelled'){
 const m=w.missions.active;if(!m)return;
 for(const id of m.enemyIds){const u=w.entities.get(id);if(u?.mission?.taskId===m.id)u.mission.escortOnly=false;}
 cleanupRescue(w,m,result);releaseReward(w,m);releaseRepairReservation(w,m);finishMissionState(w.missions,result);w.announce(`${MISSION_NAMES[m.kind]} · ${result==='succeeded'?'完成':result==='failed'?'失败':result==='expired'?'已失效':'结束'}`);
}
export function missionStage(w:World){
 const s=w.missions;if(s.stage===w.stage)return;
 if(s.active?.phase==='offered'&&s.stage!==0)finishMission(w,'expired');s.stage=w.stage;
}
export function cancelMissions(w:World){cancelEncounters(w);if(w.missions.active)finishMission(w,'cancelled');clearFleet(w);w.missions.pendingEquipment=[];}
function rewardWorker(w:World,m:MissionRecord,b:MissionBody){
 const key=m.id+':worker:'+b.id;if(w.missions.receipts.has(key))return;
 // Whole transaction, not merely the equipment hook, owns idempotence.
 const count=equipmentWorkerRescue(w,b.id,1,b);w.workers+=count;w.stats.workersRescued++;
 w.wallet.minerals+=MISSION_RULES.escort.minerals;w.wallet.gas+=MISSION_RULES.escort.gas;m.completed++;b.resolved=true;w.missions.receipts.add(key);
 w.visual('scv-rescue',b);w.changed();
}
function queueEscort(w:World,m:MissionRecord){
 const workers=missionBodies(w).filter(b=>b.role==='worker');if(!workers.length)return;
 const center=workers[0],angle=w.random()*Math.PI*2,point=escortSpawnPoint(w,center,angle,.5,missionPointLegal)??{x:center.x+Math.cos(angle)*20,z:center.z+Math.sin(angle)*20};
 const stamp={stage:w.stage,progress:campaignProgress(w.stage,w.stageElapsed,w.duration),density:1 as const};
 for(let i=0;i<40;i++)m.queue.push({taskId:m.id,sourceId:center.id,type:i<30?'zergling':'baneling',stamp:{...stamp},point:{...point}});
}
export function releaseMissionQueue(w:World){
 const m=w.missions.active;if(!m)return;let slots=Math.min(8,Math.max(0,w.missionEnemyCapacity()-w.enemyCount()));
 while(slots-->0&&m.queue.length){
  const item=m.queue[0];if(w.time<(item.readyAt??0))break;const d=SC2_UNITS[item.type];let p:Point|null=null;
  for(let i=0;i<24;i++){const angle=(i+m.enemyIds.length)*2.399963,r=.5+Math.floor(i/6)*.6,q={x:item.point.x+Math.cos(angle)*r,z:item.point.z+Math.sin(angle)*r};if(missionPointLegal(w,q,d.unitRadius*.8)&&(m.kind!=='escort'||escortSpawnClear(w,q,d.unitRadius))){p=q;break;}}
  if(!p&&m.kind==='escort'){const worker=missionBodies(w).find(b=>b.role==='worker');if(worker){p=escortSpawnPoint(w,worker,m.enemyIds.length*2.399963,d.unitRadius,missionPointLegal);if(p)item.point={...p};}}
  if(!p)break;
  const u=item.pulse?createPulseBaneling(w,p,item):item.elite?w.spawnSpecial(item.type as import('../../data/enemies').SpecialType,'elite',p,item.stamp):w.addUnit(item.type,'zerg',p.x,p.z,1,'regular',item.stamp.stage,item.stamp);if(!u)break;u.guardOrigin=true;if(item.resources)u.enemyResources={...item.resources};
  u.mission={taskId:m.id,sourceId:item.sourceId,noLoot:!!item.noLoot,escortOnly:m.kind==='escort',pulse:!!item.pulse,rescueAttacker:m.kind==='rescue',resourceFactor:m.kind==='eggs'?1:undefined,nextAction:w.time+3};m.enemyIds.push(u.id);m.queue.shift();if(m.kind==='hives'&&m.queue.length){const next=m.queue.findIndex(q=>q.sourceId!==item.sourceId);if(next>0)m.queue.push(...m.queue.splice(0,next));}
 }
}
export function missionCandidates(w:World):MissionKind[]{
 const s=w.missions;if(s.active||w.endless||w.stage<4||w.stage>18)return [];
 const kinds:MissionKind[]=['escort','hives','eggs'];
 if(repairCandidates(w).length)kinds.push('repair');if(identityCandidates(w,1).length)kinds.push('rescue');
 if(w.starship.enabled&&w.starship.account.run&&!w.starship.account.run.ended||([0,1,2] as const).some(t=>identityCandidates(w,t).length))kinds.push('intel');
 if(w.stage>=10&&!s.fleet.unlocked)kinds.push('fleet');return kinds.filter(k=>missionAllowed(w.difficulty,k));
}
export function tickMissions(w:World){
 if(w.endless){cancelMissions(w);return;}
 missionStage(w);tickFleetCall(w);const s=w.missions,m=s.active;
 for(const delivery of [...s.pendingEquipment]){try{if(deliverTaskEquipment(w,delivery.plan,delivery.point))s.pendingEquipment.splice(s.pendingEquipment.indexOf(delivery),1);}catch(error){delivery.error=String(error);}}
 if(!m)return;
 if(m.kind==='fleet'){tickFleetMission(w,m);return;}
 if(m.kind==='rescue'){tickRescue(w,m);releaseMissionQueue(w);return;}
 if(m.kind==='eggs'){tickEggs(w,m);return;}
 if(m.kind==='intel'){tickIntel(w,m);return;}if(m.kind==='hives'){tickHives(w,m);return;}
 if(m.kind==='repair'){tickRepair(w,m);return;}if(m.kind!=='escort')return;
 const workers=missionBodies(w).filter(b=>b.role==='worker');
 if(!workers.length){finishMission(w,m.completed>0?'succeeded':'failed');return;}
 if(m.phase==='offered'){
  if(workers.some(b=>missionNear(w,b,3))){m.phase='active';for(const b of workers)b.invulnerable=false;w.announce('护送开始 · 农民前往主基地');}else return;
 }
 m.age++;
 for(const b of workers){
  if(b.model==='drone')b.hp=Math.min(b.maxHp,b.hp+.2734*1.4/60);
  if(b.maxShield&&w.time-(b.lastDamagedAt??-Infinity)>=10/1.4)b.shield=Math.min(b.maxShield,(b.shield??0)+2*1.4/60);
  const path=b.path!,i=b.pathIndex!,goal=path[i];if(!goal){rewardWorker(w,m,b);continue;}
  const d=distance(b,goal),step=b.speed!/60;if(d<=step){b.x=goal.x;b.z=goal.z;b.pathIndex=i+1;if(i===path.length-1)rewardWorker(w,m,b);}else{const next=steerGoal(b,goal,b.unitRadius,w.obstacles,w.terrain,w.mapHalf),n=distance(b,next);if(n>.001){b.facing=Math.atan2(next.x-b.x,next.z-b.z);translate(b,{x:(next.x-b.x)/n*step,z:(next.z-b.z)/n*step},b.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);}}
 }
 if(m.age>=m.nextSpawn&&!m.queue.length){queueEscort(w,m);m.nextSpawn=m.age+180;}
 releaseMissionQueue(w);
 if(!missionBodies(w).some(b=>b.role==='worker'))finishMission(w,m.completed>0?'succeeded':'failed');
}
/** Dedicated attackers keep their ordinary stats for the moment the escort ends. */
export function tickMissionUnit(w:World,u:Entity,dt:number){
 if(u.mission?.pulse)return tickPulseBaneling(w,u,dt);
 if(!u.mission?.escortOnly)return false;
 const m=w.missions.active;if(!m||m.id!==u.mission.taskId||m.kind!=='escort'){u.mission.escortOnly=false;return false;}
 const targets=missionBodies(w).filter(b=>b.role==='worker'&&!b.invulnerable).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id),target=targets[0];if(!target)return true;
 u.prev={x:u.x,z:u.z};u.attackTarget=target.id;const d=distance(u,target);
 if(d<=u.unitRadius+target.unitRadius+.25&&w.hasAttackLine(u,target)){
  u.action='attack';u.velocity={x:0,z:0};
  if(w.time>=u.mission.nextAction){u.mission.nextAction=w.time+1;w.visual('attack',u,target);
   if(u.unitType==='baneling'){for(const b of targets)if(distance(u,b)<=2.2+b.unitRadius)w.hit(b,8,[],1,'zerg',0,1,u.id);w.hit(u,u.hp+u.armor+1,[],1,'zerg',0,1,u.id,true);}else w.hit(target,2,[],1,'zerg',0,1,u.id);
  }
 }else{u.action='move';const goal=steerGoal(u,target,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),length=distance(u,goal);if(length>.001){u.facing=Math.atan2(goal.x-u.x,goal.z-u.z);u.velocity={x:(goal.x-u.x)/length*u.moveSpeed,z:(goal.z-u.z)/length*u.moveSpeed};translate(u,{x:u.velocity.x*dt,z:u.velocity.z*dt},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);}}
 return true;
}
/** Return true if this packet was consumed by an isolated task target. */
export function hitMissionBody(w:World,target:Body,damage:number,hits:number,owner:Body['owner'],sourceId?:number){
 const b=w.missions.bodies.get(target.id);if(!b)return false;
 if(b.resolved||b.hp<=0||b.invulnerable)return true;
 if(b.role==='repair')return owner!=='zerg';
 if(b.role==='hive'||b.role==='egg')return owner!=='terran';
 if(b.role==='worker'){
  const source=sourceId===undefined?undefined:w.entities.get(sourceId);if(!source?.mission?.escortOnly||source.mission.taskId!==b.missionId)return true;
  let amount=Math.max(0,damage*hits),shield=Math.min(b.shield??0,amount);b.shield=(b.shield??0)-shield;amount-=shield;b.hp=Math.max(0,b.hp-amount);b.lastDamagedAt=w.time;w.visual('hit',b);
  if(b.hp<=0){b.resolved=true;w.stats.workersLost++;w.visual('death',b);}return true;
 }
 return true;
}
import {corruptSiteBodies} from '../encounters/corrupted-protoss';
