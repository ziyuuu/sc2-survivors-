import type {Entity,Point} from '../types';
import type {HeroId} from '../../data/heroes';
import type {EnemySpawnStamp} from '../../data/enemy-tuning';
import type {TaskEquipmentPlan} from '../starship/drops';

export const FUN_KINDS=['whitePack','devourer','flyingRoaches','cruelQueen','infectedTerrans','corruptedProtoss','parasites'] as const;
export type FunKind=typeof FUN_KINDS[number];
export const FUN_NAMES:Record<FunKind,string>={whitePack:'白色虫群',devourer:'吞噬者',flyingRoaches:'飞行蟑螂',cruelQueen:'残暴虫后',infectedTerrans:'感染人类',corruptedProtoss:'腐化星灵',parasites:'寄生虫'};
export const FUN_MIN_STAGE:Record<FunKind,number>={whitePack:5,devourer:7,flyingRoaches:7,cruelQueen:4,infectedTerrans:7,corruptedProtoss:6,parasites:10};
/** B97563 NydusCanal clips: Birth 6.866s, Work Start .667s, Pickup .567s. */
export const FUN_NYDUS={birthTicks:412,openTicks:41,pickupTicks:35,closeTicks:240} as const;
export type FunFaction='hostile'|'rogue'|'queen'|'neutral'|'friend';
export interface FunIdentity {
 id:string;kind:FunKind;role:'actor'|'guard'|'offspring';faction:FunFaction;
 fixedStats:boolean;mode:'passive'|'active'|'morph'|'swelling'|'charging'|'friend';
 until:number;healed:number;rewarded:boolean;
 returning?:boolean;patrolIndex?:number;
}
export interface FunRecord {
 bait?:boolean;
 /** Absent in older frozen events, whose per-body plans remain deliverable. */
 equipmentMilestones?:true;
 id:string;kind:FunKind;stage:number;stamp:EnemySpawnStamp;point:Point;
 phase:'offered'|'active'|'emerging'|'swallowing'|'rescue'|'cocoon'|'departing';
 clock:number;age:number;next:number;actors:number[];guards:number[];
 held:{ids:number[];point:Point;swallowed?:boolean}[];queue:{type:Entity['unitType'];elite:boolean;point?:Point;readyAt?:number;facing?:number}[];
 plans:TaskEquipmentPlan[];paid:Set<string>;kills:number;tier:number;
 hero?:HeroId;base?:{hp:number;damage:number;armor:number;move:number};
 cast?:{point:Point;remaining:number};acid?:{point:Point;next:number;remaining:number}[];
 attackRequested?:boolean;
 corrupt?:{spawned:number;reinforceAt?:number;proximityTick?:number;site:import('../missions/state').MissionBody};
 guardCue?:number;returnPromote?:boolean;
 route:Point[];routeIndex:number;claimed:number;eliteChildren:number;ordinaryChildren:number;
}
export interface ExpandedEncounters {
 short:FunRecord|null;queen:FunRecord|null;used:Set<FunKind>;
 queenStage:number;queenClaiming:boolean;
 elytra:{id:string;point:Point;stage:number}[];
 wingFamilies:Set<Entity['unitType']>;
 infections:Map<number,{event:string;ids:number[];ticks:number;children:boolean[];point:Point}>;
 bursts:{id:string;time:number;point:Point;facing:number;scale:number;model?:'BanelingDeath'|'FunCocoonDeath'}[];
 origins:Map<number,{id:string;kind:FunKind;faction:FunFaction;until:number}>;
 last:{kind:FunKind;result:string}|null;
}
export const newExpandedEncounters=():ExpandedEncounters=>({short:null,queen:null,used:new Set(),queenStage:0,queenClaiming:false,elytra:[],wingFamilies:new Set(),infections:new Map(),bursts:[],origins:new Map(),last:null});
export function validateExpandedEncounters(s:ExpandedEncounters,entities:Map<number,Entity>){
 if(!s||!(s.used instanceof Set)||!(s.wingFamilies instanceof Set)||!(s.infections instanceof Map)||!(s.origins instanceof Map)||!Array.isArray(s.elytra)||s.elytra.length>1||s.infections.size>10)throw Error('趣味遭遇状态无效');
 for(const k of s.used)if(!FUN_KINDS.includes(k))throw Error('趣味遭遇种类无效');
 if([...s.infections.values()].reduce((n,x)=>n+x.ids.length,0)>10||[...s.infections.values()].some(x=>x.children.length!==x.ids.length)||!Array.isArray(s.bursts))throw Error('寄生身体预算无效');
 for(const m of [s.short,s.queen]){
  if(!m)continue;
  if(m.equipmentMilestones!==undefined&&m.equipmentMilestones!==true)throw Error('遭遇装备节点无效');
  if(!FUN_KINDS.includes(m.kind)||!(m.paid instanceof Set)||!Array.isArray(m.actors)||!Array.isArray(m.held)||!Array.isArray(m.queue)||m.queue.length>40||![m.clock,m.age,m.next,m.kills,m.tier,m.claimed,m.eliteChildren,m.ordinaryChildren].every(v=>Number.isSafeInteger(v)&&v>=0)||m.claimed>10||m.eliteChildren>5||m.ordinaryChildren>5)throw Error('趣味遭遇事务无效');
  for(const seat of m.held)if(seat.swallowed)for(const id of seat.ids)if(entities.get(id)?.heldBy!==m.id)throw Error('吞噬编制身份无效');
  if(m.corrupt&&(m.kind!=='corruptedProtoss'||!Number.isSafeInteger(m.corrupt.spawned)||m.corrupt.spawned<1||m.corrupt.spawned>40||m.corrupt.reinforceAt!==undefined&&(!Number.isSafeInteger(m.corrupt.reinforceAt)||m.corrupt.reinforceAt<0)||m.actors.filter(id=>(entities.get(id)?.hp??0)>0).length>20||m.corrupt.site.missionId!==m.id||m.corrupt.site.model!=='gateway'))throw Error('腐化星灵据点状态无效');
 }
 for(const u of entities.values())if(u.fun&&(!FUN_KINDS.includes(u.fun.kind)||!Number.isFinite(u.fun.healed)||u.fun.healed<0))throw Error('趣味单位身份无效');
}
