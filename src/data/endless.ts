import type {SpecialType} from './enemies';
import {allocateCampaign18Threat,CAMPAIGN18_WEIGHTS,type Campaign18Counts,type Campaign18StageConfig,type Campaign18Wave} from './campaign18';
import type {Difficulty} from './stages';
import {CAMPAIGN_QUANTITY,continuousEndlessGrowth,endlessFrequency,type EnemySpawnStamp} from './enemy-tuning';
import {mixWaves,campaignMainBefore,ambientResources} from './mixed-waves';
/** Endless tuning is independent of the eighteenth campaign stage. */
// The minimum is one fixed simulation tick, not a difficulty plateau.
export const ENDLESS={
 wave:{interval:15},elite:{interval:30},boss:{interval:90},
 growth:{health:1.22,damage:1.10,damageAfterFiveMinutes:1.16,attackSpeed:1.025},
 bossTypes:['queen','lurker','mutalisk','corruptor','ultralisk','zergling','roach','hydralisk','ravager'] as readonly SpecialType[],
 types:['zergling','roach','hydralisk','ravager'] as readonly SpecialType[],
 roundDuration:60,
 waveTemplateThreat:530.6,
 roundReward:[300,250] as const,
 expansion:{firstAt:20,interval:40,latestAt:210,warningSeconds:5,maxAlive:2,hp:24000,armor:3,firstBatchDelay:8,batchInterval:12},
} as const;
export const ENDLESS_MAP_ID='endless-flat-v1' as const;
export const ENDLESS_ENTRANCES=[{x:0,z:-70},{x:49.5,z:-49.5},{x:70,z:0},{x:49.5,z:49.5},{x:0,z:70},{x:-49.5,z:49.5},{x:-70,z:0},{x:-49.5,z:-49.5}] as const;
export const ENDLESS_MIX:Readonly<Campaign18Counts>=Object.freeze({zergling:20,baneling:10,roach:20,ravager:15,hydralisk:15,queen:0,lurker:10,mutalisk:5,corruptor:0,ultralisk:5});
export interface EndlessConfig extends Omit<Campaign18StageConfig,'campaignId'> {endlessId:typeof ENDLESS_MAP_ID}
const baselinePressure:Record<Difficulty,number>={easy:.5,normal:.9,hard:.9*1.4,hell:.9*1.8};
const countRound=(n:number,d:Difficulty)=>Math.floor(n+(d==='easy'?0:.5)+1e-8);
/** Sum F at all preceding 15-second wave births, including fractional budget carry. */
function cumulativeThreat(waves:number,d:Difficulty){const rate=ENDLESS.waveTemplateThreat*(d==='easy'?.5:.9)*CAMPAIGN_QUANTITY[d][5]/16,sum=waves<=21?waves*(waves-1)/2:20*waves-210;return countRound(rate*(waves+.01*sum),d);}
function waveCounts(wave:number,d:Difficulty){return allocateCampaign18Threat(cumulativeThreat(wave+1,d)-cumulativeThreat(wave,d),ENDLESS_MIX).counts;}
const bodies=(counts:Campaign18Counts)=>Object.values(counts).reduce((a,b)=>a+b,0);
function precedingMainCount(round:number,d:Difficulty){
 const n=(round-1)*4,first=Math.min(n,20);let count=0;for(let i=0;i<first;i++)count+=bodies(waveCounts(i,d));
 if(n>20){const rate=ENDLESS.waveTemplateThreat*(d==='easy'?.5:.9)*CAMPAIGN_QUANTITY[d][5]/16*1.2,low=Math.floor(rate),remaining=n-20,highs=cumulativeThreat(n,d)-cumulativeThreat(20,d)-low*remaining;count+=(remaining-highs)*bodies(allocateCampaign18Threat(low,ENDLESS_MIX).counts)+highs*bodies(allocateCampaign18Threat(low+1,ENDLESS_MIX).counts);}
 return count;
}
export function endlessConfig(difficulty:Difficulty,round=1):EndlessConfig {
 const first=(round-1)*4,budget=cumulativeThreat(first+4,difficulty)-cumulativeThreat(first,difficulty),ambient=allocateCampaign18Threat(0,ENDLESS_MIX).counts;
 for(let i=0;i<4;i++){const c=waveCounts(first+i,difficulty);for(const type of Object.keys(c) as (keyof Campaign18Counts)[])ambient[type]+=c[type];}
 return {endlessId:ENDLESS_MAP_ID,difficulty,id:18,chapter:6,name:'无尽战场',durationSeconds:ENDLESS.roundDuration,budget,waveBudget:budget,mix:{...ENDLESS_MIX},reserves:{captain:0,boss:0,mainHive:0,expansionHive:0},ambient,guardBudget:0,guards:allocateCampaign18Threat(0,ENDLESS_MIX).counts,waves:4,entranceSpacing:.1,lingHp:35,speed:1.2,width:160,podHp:7200+1200*Math.floor((round-1)/2),reward:ENDLESS.roundReward,drones:4,eggs:2};
}
function fullEndlessEconomicEvents(seed:number,round:number){let random=(seed^Math.imul(round,8191))>>>0;return [{at:36,kind:'egg' as const},{at:156,kind:'egg' as const},...[48,96,144,192].map(at=>({at,kind:'drone' as const}))].map(event=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return {...event,at:event.at+random/4294967296*4-2};}).sort((a,b)=>a.at-b.at);}
export type EndlessSource='wave'|'elite'|'boss';
export interface EndlessState {round:number;startedAt:number;elites:number;bosses:number;progress:Record<EndlessSource,number>;retry:Record<'elite'|'boss',number>;pending?:Partial<Record<'elite'|'boss',EnemySpawnStamp>>;last:Partial<Record<'elite'|'boss',{health:number;damage:number;period:number}>>}
export function endlessInterval(source:EndlessSource,elapsed:number){return ENDLESS[source].interval/(source==='wave'?1:endlessFrequency(elapsed));}
export const endlessGrowth=continuousEndlessGrowth;
export function endlessFrequencyIntegral(seconds:number){const t=Math.max(0,seconds);return t<=300?t+t*t/3000:330+(t-300)*1.2;}
export function endlessFrequencyTime(integral:number){return integral<=330?2*integral/(1+Math.sqrt(1+4*integral/3000)):300+(integral-330)/1.2;}

/** Preserve the old four-minute average ordinary mineral/gas income; equipment rates are unchanged. */
export function baselineEndlessResources(difficulty:Difficulty){
 const primary=allocateCampaign18Threat(Math.floor(ENDLESS.waveTemplateThreat*baselinePressure[difficulty]+.5),ENDLESS_MIX).counts,total={minerals:0,gas:0};
 for(const type of Object.keys(primary) as (keyof Campaign18Counts)[]){const [m,g]=ambientResources(type);total.minerals+=m*primary[type]/4;total.gas+=g*primary[type]/4;}
 const q=(difficulty==='easy'?.5/.9:1)*(difficulty==='hard'?1.4:difficulty==='hell'?1.8:1);
 for(const [type,share] of [['zergling',.7],['roach',.2],['baneling',.1]] as const){const [m,g]=ambientResources(type);total.minerals+=m*60*q*share;total.gas+=g*60*q*share;}
 return total;
}
/** Four mixed waves each minute; birth time controls growth and capped density. */
export function endlessWaveTemplate(seed:number,round:number,difficulty:Difficulty){
 let random=(seed^Math.imul(round,104729))>>>0;
 const waves:Campaign18Wave[]=Array.from({length:4},(_,i)=>{const counts=waveCounts((round-1)*4+i,difficulty),types=(Object.keys(counts) as (keyof Campaign18Counts)[]).flatMap(type=>Array<keyof Campaign18Counts>(counts[type]).fill(type)),index=((i+round+seed)%8+8)%8;
  for(let k=types.length-1;k>0;k--){random=(Math.imul(1664525,random)+1013904223)>>>0;const j=random%(k+1);[types[k],types[j]]=[types[j],types[k]];}
  return {at:i*15,types,bearing:Math.atan2(ENDLESS_ENTRANCES[index].x,ENDLESS_ENTRANCES[index].z)};
 });
 return mixWaves(waves,{stage:18,difficulty,seed,duration:60,spacing:.1,mainBefore:campaignMainBefore(19,difficulty,seed)+precedingMainCount(round,difficulty),budget:baselineEndlessResources(difficulty),endlessStart:(round-1)*60});
}
export function endlessEconomicEvents(seed:number,round:number){
 const cycle=Math.floor((round-1)/4)+1,offset=(round-1)%4*60;
 return fullEndlessEconomicEvents(seed,cycle).filter(e=>e.at>=offset&&e.at<offset+60).map(e=>({...e,at:e.at-offset}));
}
export function nextEndlessExpansion(elapsed:number){
 const cycle=Math.floor(elapsed/240),local=elapsed-cycle*240,p=ENDLESS.expansion;
 for(let t=p.firstAt;t<=p.latestAt;t+=p.interval)if(t>local+1e-8)return cycle*240+t;
 return (cycle+1)*240+p.firstAt;
}
