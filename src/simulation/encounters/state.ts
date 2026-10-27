import {newExpandedEncounters,validateExpandedEncounters,type ExpandedEncounters} from './expanded-state';
import type {Point,Entity} from '../types';
import type {TaskEquipmentPlan} from '../starship/drops';
import type {EnemySpawnStamp} from '../../data/enemy-tuning';
export const ENCOUNTER_KINDS=['golden','giant','gentle'] as const;
export type EncounterKind=typeof ENCOUNTER_KINDS[number];
export const ENCOUNTER_NAMES:Record<EncounterKind,string>={golden:'黄金工蜂',giant:'巨型蟑螂',gentle:'温顺雷兽'};
export type EncounterStats=Pick<Entity,'maxHp'|'armor'|'weaponDamage'|'attackPeriod'|'moveSpeed'|'attackRange'|'unitRadius'>;
export interface EncounterIdentity {
 id:string;kind:EncounterKind;role:'subject'|'attacker'|'friend';
 base?:EncounterStats;distractedUntil?:number;distractedBy?:number;engaged?:boolean;
}
export interface EncounterRecord {
 bait?:boolean;
 id:string;kind:EncounterKind;stage:number;point:Point;stamp:EnemySpawnStamp;
 phase:'signal'|'offered'|'active'|'cleared';clock:number;wait:number;age:number;
 subject:number|null;enemies:number[];initial:Point[];waves:number;pending:number;
 tier:number;growth:number;growthBlocked:boolean;retry:number;progress:number;threshold:number;
 route:Point[];routeIndex:number;plans:TaskEquipmentPlan[][];
}
export interface EncounterState {
 expanded:ExpandedEncounters;
 enabled:boolean;serial:number;stage:number;check:number;gcd:number;used:Set<EncounterKind>;
 active:EncounterRecord|null;friends:Map<number,number>;
 pending:{plan:TaskEquipmentPlan;point:Point;error?:string}[];
 last:{kind:EncounterKind;result:'success'|'failed'|'escaped'|'expired'|'cancelled'}|null;
}
export const newEncounterState=():EncounterState=>({expanded:newExpandedEncounters(),enabled:true,serial:0,stage:0,check:1200,gcd:0,used:new Set(),active:null,friends:new Map(),pending:[],last:null});
export function validateEncounterState(s:EncounterState,entities:Map<number,Entity>){
 const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
 const point=(p:Point)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
 if(!s||typeof s.enabled!=='boolean'||![s.serial,s.stage,s.check,s.gcd].every(count)||!(s.used instanceof Set)||[...s.used].some(k=>!ENCOUNTER_KINDS.includes(k))||!(s.friends instanceof Map)||!Array.isArray(s.pending))throw Error('特殊遭遇状态无效');
 validateExpandedEncounters(s.expanded,entities);
 const m=s.active;
 if(m&&(!ENCOUNTER_KINDS.includes(m.kind)||!m.bait&&!s.used.has(m.kind)||!['signal','offered','active','cleared'].includes(m.phase)||!point(m.point)||![m.clock,m.wait,m.age,m.waves,m.pending,m.tier,m.growth,m.retry,m.progress,m.threshold,m.routeIndex].every(count)||m.tier>3||m.threshold>10||m.waves>3||m.pending>12||!Array.isArray(m.route)||m.route.some(p=>!point(p))||!Array.isArray(m.plans)||m.subject!==null&&entities.get(m.subject)?.encounter?.id!==m.id))throw Error('特殊遭遇事务无效');
 for(const [id,ticks] of s.friends)if(!count(ticks)||entities.get(id)?.encounter?.role!=='friend')throw Error('特殊增援状态无效');
 for(const p of s.pending)if(!point(p.point)||!p.plan?.receipt||!Array.isArray(p.plan.items))throw Error('特殊掉落待交付无效');
 for(const e of entities.values())if(e.encounter){
  const c=e.encounter;if(!ENCOUNTER_KINDS.includes(c.kind)||!['subject','attacker','friend'].includes(c.role)||typeof c.id!=='string'||c.base&&Object.values(c.base).some(v=>!Number.isFinite(v)||v<0))throw Error('特殊单位属性无效');
 }
}
