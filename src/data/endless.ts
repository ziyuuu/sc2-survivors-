import type {SpecialType} from './enemies';
import {allocateCampaign18Threat,CAMPAIGN18_WEIGHTS,type Campaign18Counts,type Campaign18StageConfig,type Campaign18Wave} from './campaign18';
import type {Difficulty} from './stages';
/** Endless tuning is independent of the eighteenth campaign stage. */
// The minimum is one fixed simulation tick, not a difficulty plateau.
export const ENDLESS={
 wave:{interval:8,accelerateEvery:30,factor:.9,minInterval:1/60},
 elite:{interval:30,accelerateEvery:60,factor:.85,minInterval:1/60},
 boss:{interval:90,accelerateEvery:90,factor:.85,minInterval:1/60},
 growth:{health:1.4,damage:1.25,attackSpeed:1.15},
 types:['zergling','roach','hydralisk','ravager'] as readonly SpecialType[],
 roundDuration:240,
 waveTemplateThreat:530.6,
 roundReward:[300,250] as const,
 expansion:{firstAt:20,interval:40,latestAt:210,warningSeconds:5,maxAlive:2,hp:7500,armor:3,firstBatchDelay:8,batchInterval:12},
} as const;
export const ENDLESS_MAP_ID='endless-flat-v1' as const;
export const ENDLESS_ENTRANCES=[{x:0,z:-70},{x:49.5,z:-49.5},{x:70,z:0},{x:49.5,z:49.5},{x:0,z:70},{x:-49.5,z:49.5},{x:-70,z:0},{x:-49.5,z:-49.5}] as const;
export const ENDLESS_MIX:Readonly<Campaign18Counts>=Object.freeze({zergling:20,baneling:10,roach:20,ravager:15,hydralisk:15,queen:0,lurker:10,mutalisk:5,corruptor:0,ultralisk:5});
export interface EndlessConfig extends Omit<Campaign18StageConfig,'campaignId'> {endlessId:typeof ENDLESS_MAP_ID}
const pressure:Record<Difficulty,number>={easy:.5,normal:.9,hard:.9*1.4,hell:.9*1.8};
export function endlessConfig(difficulty:Difficulty):EndlessConfig {
 const budget=Math.floor(ENDLESS.waveTemplateThreat*pressure[difficulty]+.5),ambient=allocateCampaign18Threat(budget,ENDLESS_MIX).counts;
 return {endlessId:ENDLESS_MAP_ID,difficulty,id:18,chapter:6,name:'无尽战场',durationSeconds:ENDLESS.roundDuration,budget,waveBudget:budget,mix:{...ENDLESS_MIX},reserves:{captain:0,boss:0,mainHive:0,expansionHive:0},ambient,guardBudget:0,guards:allocateCampaign18Threat(0,ENDLESS_MIX).counts,waves:15,entranceSpacing:.1,lingHp:35,speed:1,width:160,podHp:600,reward:ENDLESS.roundReward,drones:4,eggs:2};
}
export function endlessWaveTemplate(seed:number,round:number,difficulty:Difficulty):Campaign18Wave[]{
 const config=endlessConfig(difficulty),waves:Array<Campaign18Wave>=Array.from({length:15},(_,i)=>({at:i*16,types:[],bearing:Math.atan2(ENDLESS_ENTRANCES[(i+round+seed)%8].x,ENDLESS_ENTRANCES[(i+round+seed)%8].z)}));
 const types=(Object.keys(config.ambient) as (keyof Campaign18Counts)[]).flatMap(type=>Array(config.ambient[type]).fill(type));
 let random=(seed^Math.imul(round,104729))>>>0;for(let i=types.length-1;i>0;i--){random=(Math.imul(1664525,random)+1013904223)>>>0;const j=random%(i+1);[types[i],types[j]]=[types[j],types[i]];}
 types.forEach((type,i)=>waves[i%waves.length].types.push(type));
 if(waves.reduce((total,wave)=>total+wave.types.reduce((n,type)=>n+CAMPAIGN18_WEIGHTS[type],0),0)>config.waveBudget)throw Error('无尽波次超出预算');
 return waves;
}
export function endlessEconomicEvents(seed:number,round:number){let random=(seed^Math.imul(round,8191))>>>0;return [{at:36,kind:'egg' as const},{at:156,kind:'egg' as const},...[48,96,144,192].map(at=>({at,kind:'drone' as const}))].map(event=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return {...event,at:event.at+random/4294967296*4-2};}).sort((a,b)=>a.at-b.at);}
export type EndlessSource='wave'|'elite'|'boss';
export interface EndlessState {round:number;startedAt:number;elites:number;bosses:number;progress:Record<EndlessSource,number>;retry:Record<'elite'|'boss',number>;last:Partial<Record<'elite'|'boss',{health:number;damage:number;period:number}>>}
export function endlessInterval(source:EndlessSource,elapsed:number){const c=ENDLESS[source];return Math.max(c.minInterval,c.interval*Math.pow(c.factor,Math.floor(Math.max(0,elapsed+1e-8)/c.accelerateEvery)));}
export function endlessGrowth(serial:number){const n=Math.max(1,serial);return {health:Math.min(1e12,ENDLESS.growth.health**n),damage:Math.min(1e12,ENDLESS.growth.damage**n),attackSpeed:Math.min(1e12,ENDLESS.growth.attackSpeed**n)};}
