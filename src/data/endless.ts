import type {SpecialType} from './enemies';
/** Survivors endless tuning only; the twelve campaign stages remain untouched. */
// The minimum is one fixed simulation tick, not a difficulty plateau.
export const ENDLESS={
 wave:{interval:8,accelerateEvery:30,factor:.9,minInterval:1/60},
 elite:{interval:30,accelerateEvery:60,factor:.85,minInterval:1/60},
 boss:{interval:90,accelerateEvery:90,factor:.85,minInterval:1/60},
 growth:{health:1.4,damage:1.25,attackSpeed:1.15},
 types:['zergling','roach','hydralisk','ravager'] as readonly SpecialType[],
} as const;
export type EndlessSource='wave'|'elite'|'boss';
export interface EndlessState {round:number;startedAt:number;elites:number;bosses:number;progress:Record<EndlessSource,number>;retry:Record<'elite'|'boss',number>;last:Partial<Record<'elite'|'boss',{health:number;damage:number;period:number}>>}
export function endlessInterval(source:EndlessSource,elapsed:number){const c=ENDLESS[source];return Math.max(c.minInterval,c.interval*Math.pow(c.factor,Math.floor(Math.max(0,elapsed+1e-8)/c.accelerateEvery)));}
export function endlessGrowth(serial:number){const n=Math.max(1,serial);return {health:Math.min(1e12,ENDLESS.growth.health**n),damage:Math.min(1e12,ENDLESS.growth.damage**n),attackSpeed:Math.min(1e12,ENDLESS.growth.attackSpeed**n)};}
