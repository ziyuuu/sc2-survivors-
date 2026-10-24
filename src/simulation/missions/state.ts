import {MISSION_RULES} from './config';
import {newFleetState,type FleetState} from './fleet';
import type {Body,Point} from '../types';
import type {EnemySpawnStamp} from '../../data/enemy-tuning';
import type {CombatUnitType} from '../../data/sc2-units';
export const MISSION_KINDS=['escort','repair','intel','rescue','hives','eggs','fleet'] as const;
export type MissionKind=typeof MISSION_KINDS[number];
export type MissionPhase='offered'|'active'|'resolving';
export interface MissionBody extends Body {
 missionId:string;role:'signal'|'worker'|'base'|'repair'|'intel'|'hive'|'egg'|'tower';
 model:string;invulnerable:boolean;resolved:boolean;age:number;progress:number;
 payload?:{kind:'worker';appearance:'scv'|'drone'|'probe'}|{kind:'enemies';types:('zergling'|'baneling')[]};production?:number;nextSpawn?:number;shield?:number;maxShield?:number;lastDamagedAt?:number;facing:number;path?:Point[];pathIndex?:number;speed?:number;
}
export interface MissionSpawn {
 taskId:string;sourceId:number;type:CombatUnitType;stamp:EnemySpawnStamp;
 readyAt?:number;resources?:{minerals:number;gas:number};elite?:boolean;pulse?:boolean;noLoot?:boolean;point:Point;
}
export type MissionReward={kind:'equipment';plan:import('../starship/drops').TaskEquipmentPlan}|{kind:'technology';id:string}|{kind:'elite';id:import('../../data/elites').EliteId;seats:number;ranks:number}|{kind:'hero';id:import('../../data/heroes').HeroId};
export interface MissionRecord {
 id:string;kind:MissionKind;phase:MissionPhase;stage:number;age:number;
 bodyIds:number[];enemyIds:number[];queue:MissionSpawn[];progress:number;
 rescue?:{center:Point;target:number|null;friends:number[];initial:number;escorts:number;signal:number;cycle:number};reward?:MissionReward;intelTier?:0|1|2;pendingNext?:boolean;lastPoint?:Point;repair?:{kind:import('../building/rules').FacilityKind;waves:number;grantedAt?:number};completed:number;total:number;nextSpawn:number;receipts:string[];
}
export interface MissionState {
 scope?:string;packetSource?:import('../types').Entity;fleet:FleetState;claiming?:string;pendingEquipment:{plan:import('../starship/drops').TaskEquipmentPlan;point:Point;error?:string}[];enabled:boolean;serial:number;active:MissionRecord|null;bodies:Map<number,MissionBody>;
 gcd:number;check:number;stage:number;receipts:Set<string>;
 lastResult:{id:string;kind:MissionKind;result:'succeeded'|'failed'|'expired'|'cancelled'}|null;
}
export const MISSION_CLOCK=MISSION_RULES.clock;
export function newMissionState():MissionState{return {fleet:newFleetState(),pendingEquipment:[],enabled:true,serial:0,active:null,bodies:new Map(),gcd:0,check:MISSION_CLOCK.check,stage:0,receipts:new Set(),lastResult:null};}
/** Busy and cooldown time never banks future triggers. */
export function advanceMissionClock(s:MissionState,stage:number,elapsedTicks:number,eligible:boolean,random:()=>number,chanceMultiplier=1){
 if(!s.enabled||!eligible||stage<4||stage>18)return false;
 if(s.active)return false;
 if(s.gcd>0){s.gcd--;return false;}
 if(elapsedTicks<=MISSION_CLOCK.grace)return false;
 if(--s.check>0)return false;
 s.check=MISSION_CLOCK.check;return random()<Math.min(1,MISSION_CLOCK.chance*chanceMultiplier);
}
export function finishMissionState(s:MissionState,result:NonNullable<MissionState['lastResult']>['result']){
 const m=s.active;if(!m)return false;
 s.lastResult={id:m.id,kind:m.kind,result};s.receipts.add(m.id+':end');
 for(const id of m.bodyIds)s.bodies.delete(id);
 m.queue.length=0;s.active=null;s.gcd=MISSION_CLOCK.gcd;s.check=MISSION_CLOCK.check;return true;
}
export function validateMissionState(s:MissionState){
 const count=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 if(!s||!(s.bodies instanceof Map)||!(s.receipts instanceof Set)||!Array.isArray(s.pendingEquipment)||![s.serial,s.gcd,s.check,s.stage].every(count)||s.scope||s.packetSource||s.claiming)throw Error('任务运行状态无效');
 const m=s.active;if(m){if(!MISSION_KINDS.includes(m.kind)||!['offered','active','resolving'].includes(m.phase)||typeof m.id!=='string'||![m.age,m.completed,m.total,m.progress].every(count)||m.completed>m.total||!Array.isArray(m.queue)||!Array.isArray(m.enemyIds)||new Set(m.bodyIds).size!==m.bodyIds.length||m.bodyIds.some(id=>!s.bodies.has(id)))throw Error('任务事务无效');
 for(const q of m.queue)if(q.taskId!==m.id||!m.bodyIds.includes(q.sourceId)&&m.rescue?.target!==q.sourceId||![q.point.x,q.point.z,q.stamp.progress,q.stamp.stage].every(Number.isFinite))throw Error('任务投放计划无效');}
 for(const [id,b] of s.bodies)if(id!==b.id||!m||b.missionId!==m.id||!m.bodyIds.includes(id)||![b.x,b.z,b.hp,b.maxHp,b.age,b.progress].every(Number.isFinite)||b.hp<0||b.hp>b.maxHp)throw Error('任务实体无效');
 const f=s.fleet;if(!f||!(f.ships instanceof Map)||!Array.isArray(f.flights)||![f.cooldown,f.serial].every(count)||typeof f.unlocked!=='boolean'||f.committed)throw Error('舰队运行状态无效');
 for(const ship of f.ships.values())if(!count(ship.expires)||!count(ship.ready))throw Error('协战舰时钟无效');
}
