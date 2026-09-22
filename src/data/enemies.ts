import type {ZergType} from './sc2-units';
/** Survivors tuning, not multiplayer SC2 values. Specials replace budgeted ordinary units. */
export type SpecialType=Exclude<ZergType,'baneling'>;
export type EnemyTier='elite'|'boss';
export interface EnemyEvent {at:number;type:SpecialType;tier:EnemyTier}
export const ELITE_TIMES:readonly (readonly (readonly [number,SpecialType])[])[]=[[],[[30,'zergling']],[],[[40,'zergling'],[85,'roach']],[[40,'zergling'],[85,'roach']],[[35,'roach']],[[45,'zergling'],[110,'hydralisk']],[[45,'roach'],[110,'hydralisk']],[[45,'hydralisk']],[[45,'zergling'],[110,'hydralisk'],[175,'ravager']],[[45,'roach'],[110,'hydralisk'],[175,'ravager']],[[45,'hydralisk'],[105,'ravager']]];
export const BOSSES:Record<number,{at:number;type:SpecialType;hp:number;armor:number;damage:number;cooldown:number}>={3:{at:30,type:'zergling',hp:900,armor:1,damage:30,cooldown:8},6:{at:75,type:'roach',hp:4000,armor:2,damage:45,cooldown:10},9:{at:120,type:'hydralisk',hp:9000,armor:3,damage:45,cooldown:8},12:{at:150,type:'ravager',hp:18000,armor:3,damage:70,cooldown:10}};
export const ENEMY_NAMES={elite:{zergling:'猎杀跳虫',roach:'重甲蟑螂',hydralisk:'尖刺刺蛇',ravager:'腐蚀破坏者'},boss:{zergling:'巨型跳虫',roach:'巨型蟑螂',hydralisk:'巨型刺蛇',ravager:'巨型破坏者'}};
export function bossFor(type:SpecialType){return Object.values(BOSSES).find(b=>b.type===type)!;}
