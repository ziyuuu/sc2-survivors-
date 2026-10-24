import {MISSION_RULES} from './config';
import {missionDamage} from './combat';
import {pointInBattleView} from '../combat/battle-view';
import type {World} from '../world';
import type {MissionRecord} from './state';
import type {Entity,Point} from '../types';
import {SC2_UNITS} from '../../data/sc2-units';
import {makeMissionBody,missionNear,missionPointLegal,finishMission,releaseMissionQueue} from './runtime';
import {nearbyMissionPoint,queueMissionGuards} from './encounters';
import {distance,clearLine} from '../movement/steering';
export interface FleetState {unlocked:boolean;cooldown:number;serial:number;flights:{source:Entity;target:number;at:number}[];pending:{id:string;point:Point;count:number;next:number}|null;ships:Map<number,{expires:number;ready:number;cast:{target:number;at:number;submitted:boolean}|null}>;ceasefire:boolean;committed:boolean;}
export const newFleetState=():FleetState=>({unlocked:false,cooldown:0,serial:0,flights:[],pending:null,ships:new Map(),ceasefire:false,committed:false});
export function spawnFleet(w:World,m:MissionRecord){if(w.stage<10||w.missions.fleet.unlocked)return false;
 let points:Point[]=[];for(let attempt=0;attempt<128;attempt++){const angle=w.random()*Math.PI/4,radius=18+w.random()*8,center=attempt<32?{x:0,z:0}:w.eventPoint(0,Math.max(1,w.mapHalf-radius-3));const candidate=Array.from({length:8},(_,i)=>({x:center.x+Math.cos(angle+i*Math.PI/4)*radius,z:center.z+Math.sin(angle+i*Math.PI/4)*radius}));if(candidate.every((p,i)=>missionPointLegal(w,p,1.25)&&clearLine(p,candidate[(i+1)%8],.6,w.obstacles,w.terrain))&&candidate.some(p=>clearLine(w.anchor,p,.6,w.obstacles,w.terrain))){points=candidate;break;}}
 if(points.length!==8)return false;m.total=8;for(const p of points)makeMissionBody(w,m,'tower',p,1,'mission.tower','terran',1.25,true);queueTower(w,m);return true;
}
function queueTower(w:World,m:MissionRecord){const b=w.missions.bodies.get(m.bodyIds[m.completed])!;queueMissionGuards(w,m,b,2,MISSION_RULES.fleet.guards[Math.floor(m.completed/2)],true);for(const q of m.queue)if(q.sourceId===b.id)q.readyAt=w.time+.5;}
/** Called after committed hits/deaths, before any fresh attack intention. */
export function prepareFleetGate(w:World){const f=w.missions.fleet;f.ceasefire=false;const m=w.missions.active;if(!m||m.kind!=='fleet'||m.pendingNext)return;
 const b=w.missions.bodies.get(m.bodyIds[m.completed]);if(!b)return;const near=missionNear(w,b,6.5);if(near&&m.phase==='offered')m.phase='active';
 const alive=m.enemyIds.some(id=>{const u=w.entities.get(id);return u?.mission?.sourceId===b.id&&u.hp>0&&!(u.owner==='terran'&&w.starship.captured.has(u.id));}),queued=m.queue.some(q=>q.sourceId===b.id);
 f.ceasefire=near&&!alive&&!queued;if(!f.ceasefire)m.progress=0;
 if(f.ceasefire){w.heroCasts=w.heroCasts.filter(c=>c.launched||c.phase==='dot');for(const s of f.ships.values())if(s.cast&&!s.cast.submitted){s.cast=null;s.ready=w.tick+MISSION_RULES.fleet.skillTicks;}}
 if(f.ceasefire)for(const u of w.entities.values())if(u.owner==='terran'){u.windup=0;u.pendingTarget=null;u.attackLock=0;}
}
export function tickFleetMission(w:World,m:MissionRecord){
 if(m.pendingNext){m.pendingNext=false;queueTower(w,m);return;}releaseMissionQueue(w);
 if(!w.missions.fleet.ceasefire)return;if(!w.allies().some(u=>!u.temporary&&!u.summonKind&&u.hp>0))return;
 if(++m.progress<MISSION_RULES.fleet.activationTicks)return;const b=w.missions.bodies.get(m.bodyIds[m.completed])!,key=m.id+':tower:'+b.id;
 if(w.missions.receipts.has(key))return;w.missions.receipts.add(key);b.resolved=true;m.completed++;m.progress=0;
 if(m.completed===8){w.missions.fleet.unlocked=true;w.missions.receipts.add(m.id+':fleetUnlock');finishMission(w,'succeeded');w.announce('已获得呼叫舰队');}else m.pendingNext=true;
}
export function fleetPointLegal(w:World,p:Point){const f=w.missions.fleet;if(!f.unlocked||f.cooldown>0||f.pending||w.endless||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||f.ceasefire||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)+5>=w.mapHalf||Math.abs(p.z)+5>=w.mapHalf)return false;
 const view=w.starship.battleView?.();if(view&&!pointInBattleView(view,{...p,flying:true}))return false;return !!shipPositions(w,p);
}
function shipPositions(w:World,p:Point){const points:Point[]=[];for(let i=0;i<48&&points.length<3;i++){const a=i*2.399963,r=1.8+(i%4)*.75,q={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r};if(Math.abs(q.x)+1.3<w.mapHalf&&Math.abs(q.z)+1.3<w.mapHalf&&points.every(v=>distance(v,q)>2.6)&&![...w.entities.values()].some(u=>u.hp>0&&u.flying&&distance(u,q)<u.unitRadius+1.3))points.push(q);}return points.length===3?points:null;}
export function callFleet(w:World,p:Point){if(!fleetPointLegal(w,p))return false;const f=w.missions.fleet;f.pending={id:w.runId+':fleetCall:'+ ++f.serial,point:{...p},count:0,next:w.tick+1};w.changed();return true;}
export function refreshFleetShip(u:Entity){if(!u.mission?.fleet)return false;const d=SC2_UNITS.yamato_battlecruiser,hp=u.hp/u.maxHp;u.maxHp=d.maxHp;u.hp=hp*u.maxHp;u.armor=d.armor;u.moveSpeed=d.movementSpeed;u.weaponDamage=d.attackDamage;u.attackPeriod=d.attackPeriod;u.attackRange=d.attackRange;return true;}
export function tickFleetCall(w:World){const f=w.missions.fleet;if(f.cooldown>0)f.cooldown--;
 for(const shot of f.flights)if(w.tick>=shot.at){const target=w.body(shot.target),previous=f.committed;f.committed=true;try{if(target?.hp&&target.owner!==shot.source.owner&&w.visibleTo(target,shot.source.owner)){missionDamage(w,shot.source,target,MISSION_RULES.fleet.damage,[],1,'terran',.5,0,shot.source.id);w.visual('skill-impact',shot.source,target);}}finally{f.committed=previous;}}f.flights=f.flights.filter(shot=>w.tick<shot.at);
 const p=f.pending;if(p&&w.tick>=p.next){const points=shipPositions(w,p.point);if(points){const key=p.id+':'+p.count,point=points[0];if(!w.missions.receipts.has(key)){const u=w.addUnit('yamato_battlecruiser','terran',point.x,point.z);u.temporary=true;u.modelKey='hero.yamato_battlecruiser';u.visualScale=.5;u.mission={taskId:p.id,sourceId:0,noLoot:true,escortOnly:false,pulse:false,nextAction:0,fleet:true};refreshFleetShip(u);u.hp=u.maxHp;f.ships.set(u.id,{expires:w.tick+MISSION_RULES.fleet.lifetimeTicks,ready:w.tick+MISSION_RULES.fleet.firstSkillTicks,cast:null});w.missions.receipts.add(key);if(p.count===0)f.cooldown=MISSION_RULES.fleet.cooldownTicks;}p.count++;p.next=w.tick+MISSION_RULES.fleet.arrivalTicks;if(p.count===3)f.pending=null;}}
 for(const [id,s] of f.ships){const u=w.entities.get(id);if(!u||u.hp<=0||w.tick>=s.expires){if(u&&u.hp>0){u.hp=0;w.entities.delete(id);}f.ships.delete(id);continue;}
  if(s.cast){const target=w.body(s.cast.target);if(w.tick>=s.cast.at){if(s.cast.submitted){if(target?.hp)w.hit(target,MISSION_RULES.fleet.damage,[],1,'terran',.5,0,u.id);w.visual('skill-impact',u,target??u);s.cast=null;}else if(f.ceasefire||!target?.hp||!w.targetAllowed(u,target)||!w.hasAttackLine(u,target)){s.cast=null;s.ready=w.tick+MISSION_RULES.fleet.skillTicks;}else{f.flights.push({source:structuredClone(u),target:target.id,at:w.tick+MISSION_RULES.fleet.flightTicks});w.visual('skill-launch',u,target);s.cast=null;s.ready=w.tick+MISSION_RULES.fleet.skillTicks;}}continue;}
  if(f.ceasefire||w.tick<s.ready)continue;const targets=[...w.entities.values()].filter(b=>w.targetAllowed(u,b)&&w.edgeDistance(u,b)<=11&&w.hasAttackLine(u,b)).sort((a,b)=>(b.enemyTier==='boss'?2:b.enemyTier==='elite'?1:0)-(a.enemyTier==='boss'?2:a.enemyTier==='elite'?1:0)||b.maxHp-a.maxHp||a.id-b.id);if(targets[0]){s.cast={target:targets[0].id,at:w.tick+MISSION_RULES.fleet.chargeTicks,submitted:false};w.visual('skill-line',u,targets[0]);}
 }
}
export function clearFleet(w:World){for(const id of w.missions.fleet.ships.keys())w.entities.delete(id);w.missions.fleet=newFleetState();}
