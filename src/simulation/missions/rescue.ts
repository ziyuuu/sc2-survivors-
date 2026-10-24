import {MISSION_RULES} from './config';
import {notifyUnitArrival} from '../boss-loot';
import {refreshExpeditionStats} from '../combat/expedition-combat';
import {newExpedition} from '../expedition-state';
import {newStarshipRuntime} from '../starship/runtime';
import type {World} from '../world';
import type {MissionRecord} from './state';
import type {Entity,Point} from '../types';
import {ELITES} from '../../data/elites';
import {SC2_UNITS} from '../../data/sc2-units';
import {enemySpawnGrowth} from '../../data/enemy-progression';
import {nearbyMissionPoint,currentMissionStamp} from './encounters';
import {identityCandidates,planIdentity} from './rewards';
import {makeMissionBody,missionNear,missionPointLegal,finishMission} from './runtime';
import {acquireEliteImmediately} from '../elite-claim';
export function spawnRescue(w:World,m:MissionRecord){
 const ids=identityCandidates(w,1);if(!ids.length)return false;const p=nearbyMissionPoint(w,12,20);if(!p)return false;
 m.reward=planIdentity(w,1,ids[Math.floor(w.random()*ids.length)]);m.rescue={center:p,target:null,friends:[],initial:6+Math.floor(w.random()*5),escorts:w.expedition.race==='zerg'?4+2*Math.floor(w.random()*2):4+Math.floor(w.random()*3),signal:0,cycle:0};m.total=900;makeMissionBody(w,m,'signal',p,1,'mission.intel','terran',.5,true);return true;
}
function batch(w:World,m:MissionRecord,n:number){const r=m.rescue!,members=w.missionWaveMembers(),stamp=currentMissionStamp(w);return Array.from({length:n},(_,i)=>{const member=members[i%Math.max(1,members.length)];return {taskId:m.id,sourceId:r.target??m.bodyIds[0],type:member?.type??'zergling' as const,stamp:{...stamp,density:member?.stamp.density??1},resources:member?.resources,point:{x:r.center.x+6,z:r.center.z},readyAt:w.time+.5};});}
function positions(w:World,center:Point,n:number,min:number,max:number){const points:Point[]=[];for(let i=0;i<160&&points.length<n;i++){const a=i*2.399963,r=min+(max-min)*(i%13)/12,p={x:center.x+Math.cos(a)*r,z:center.z+Math.sin(a)*r};if(missionPointLegal(w,p,.8)&&!points.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1.6))points.push(p);}return points.length===n?points:null;}
const statContexts=new WeakMap<World,World>();
export function refreshHoldout(w:World,u:Entity,fill=false){
 if(!u.mission?.holdout)return false;const d=SC2_UNITS[u.unitType],growth=w.growth(u),hp=u.hp/u.maxHp,shield=(u.shield??0)/(u.maxShield||1),baseShield=u.race==='protoss'?(u.maxShield??0):0;
 const stamp=currentMissionStamp(w),members=w.missionWaveMembers();let sum=0,weight=0;
 for(const m of members){const data=SC2_UNITS[m.type];if(data.targetType==='none'||(u.flying?data.targetType==='ground':data.targetType==='air'))continue;const g=enemySpawnGrowth(w.difficulty,w.stage,'regular',undefined,stamp.progress,0),rate=data.attacks*g.attackSpeed/data.attackPeriod;sum+=data.attackDamage*g.damage*m.stamp.density*rate;weight+=rate;}
 if(u.mission.holdoutStage!==w.stage){u.mission.holdoutStage=w.stage;u.mission.holdoutArmor=weight?MISSION_RULES.rescue.armorRatio*sum/weight:0;}let context=statContexts.get(w);if(!context){context=Object.create(w) as World;context.expedition=newExpedition(w.expedition.race);context.starship=newStarshipRuntime();context.runConfig=null;context.heroes=new Map();statContexts.set(w,context);}context.entities=new Map([...w.entities].filter(([,v])=>v.owner==='zerg'||v.mission?.holdout&&v.mission.taskId===u.mission!.taskId));refreshExpeditionStats(context,u,fill);u.hp=fill?u.maxHp:u.maxHp*hp;u.shield=fill?u.maxShield:(u.maxShield??0)*shield;u.armor=Math.max(u.armor,u.mission.holdoutArmor??0);u.shieldArmor=Math.max(u.shieldArmor??0,u.mission.holdoutArmor??0);return true;
}
export function tickRescue(w:World,m:MissionRecord){const r=m.rescue!;
 if(r.target===null){r.signal=Math.min(MISSION_RULES.rescue.signalTicks,r.signal+1);if(r.signal<MISSION_RULES.rescue.signalTicks||w.enemyCount()+r.initial>w.missionEnemyCapacity())return;
  const friends=positions(w,r.center,r.escorts+1,.4,4),enemies=positions(w,{x:r.center.x+6,z:r.center.z},r.initial,.5,3);if(!friends||!enemies)return;const reward=m.reward;if(reward?.kind!=='elite')throw Error('Missing rescue identity');const types=batch(w,m,r.initial);
  for(let i=0;i<friends.length;i++){const type=i===0?ELITES[reward.id].family:w.expedition.race==='terran'?'marine':w.expedition.race==='zerg'?'zergling':'stalker',p=friends[i],u=w.addUnit(type,'terran',p.x,p.z);u.temporary=true;w.detachMissionOrder(u.id);u.mission={taskId:m.id,sourceId:m.bodyIds[0],noLoot:true,escortOnly:false,pulse:false,nextAction:0,holdout:true,center:{...r.center},supportStage:undefined};if(i===0){u.eliteId=reward.id;u.modelKey=ELITES[reward.id].model;r.target=u.id;}if(i>0&&w.expedition.race==='zerg')u.pairId=m.id+':escortPair:'+Math.floor((i-1)/2);refreshHoldout(w,u,true);r.friends.push(u.id);}
  for(let i=0;i<types.length;i++){const item=types[i],p=enemies[i],u=w.addUnit(item.type,'zerg',p.x,p.z,1,'regular',w.stage,item.stamp);u.guardOrigin=true;u.enemyResources=item.resources;u.mission={taskId:m.id,sourceId:r.target!,noLoot:false,escortOnly:false,pulse:false,nextAction:0,rescueAttacker:true};m.enemyIds.push(u.id);}r.cycle=240;w.missions.bodies.get(m.bodyIds[0])!.resolved=true;return;
 }
 const target=w.entities.get(r.target);if(!target||target.hp<=0){finishMission(w,'failed');return;}
 if(missionNear(w,target,6-target.unitRadius)){m.phase='active';m.progress++;}else {m.progress=0;if(m.phase==='resolving')m.phase='active';}
 if(m.progress>=MISSION_RULES.rescue.defendTicks){m.phase='resolving';w.missions.claiming=m.id;try{
  const reward=m.reward;if(reward?.kind!=='elite')throw Error('Missing rescue reward');const before=w.eliteOwned(reward.id),hp=target.hp/target.maxHp,shield=(target.shield??0)/(target.maxShield||1);let acquired=false;
  if(!before&&w.familySeatCount(ELITES[reward.id].family)<w.familyMemberCap(ELITES[reward.id].family)&&w.canAcquireElite(reward.id)){acquired=w.adoptRescuedElite(target);}
  else {const replacement=w.eliteCandidates(reward.id).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];acquired=acquireEliteImmediately(w,reward.id,replacement?.id);if(acquired){const formal=w.eliteOwned(reward.id);if(formal&&!before){formal.hp=formal.maxHp*hp;formal.shield=(formal.maxShield??0)*shield;}target.hp=0;w.entities.delete(target.id);}}
  if(acquired){for(const child of w.entities.values())if(child.summonOwnerId===r.target&&child.mission?.holdout){delete child.mission;w.refreshStats(child);}notifyUnitArrival(w,{identity:reward.id,name:ELITES[reward.id].name,kind:'elite',rank:w.eliteOwned(reward.id)?.rank??1,promoted:!!before});w.missions.receipts.add(m.id+':eliteRescue');for(const id of r.friends){if(id===r.target)continue;const u=w.entities.get(id);if(!u?.hp)continue;const hp=u.hp/u.maxHp,shield=(u.shield??0)/(u.maxShield||1);u.mission!.holdout=false;delete u.pairId;u.mission!.supportStage=w.stage;w.refreshStats(u);u.hp=u.maxHp*hp;u.shield=(u.maxShield??0)*shield;}finishMission(w,'succeeded');return;}
 }finally{delete w.missions.claiming;}}
 if(--r.cycle<=0&&!m.queue.length){m.queue=batch(w,m,6+Math.floor(w.random()*5));r.cycle=240;}
}
export function cleanupRescue(w:World,m:MissionRecord,result:string){if(!m.rescue||result==='succeeded')return;for(const id of m.rescue.friends){const u=w.entities.get(id);if(u?.mission?.holdout){w.visual('squad-transfer',u);u.windup=0;u.pendingTarget=null;u.hp=0;w.entities.delete(id);}}}
