import type {SpecialType} from './enemies';
import {allocateCampaign18Threat,CAMPAIGN18_WEIGHTS,type Campaign18Counts,type Campaign18StageConfig,type Campaign18Wave} from './campaign18';
import type {Difficulty} from './stages';
import {CAMPAIGN_QUANTITY,continuousEndlessGrowth,endlessFrequency,type EnemySpawnStamp} from './enemy-tuning';
import {mixWaves,campaignMainBefore,ambientResources,endlessResourceWeights} from './mixed-waves';
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
export function endlessConfig(difficulty:Difficulty,round=1,pacing?:EndlessPacing):EndlessConfig {
 if(pacing){const plan=endlessWavePlan(round,difficulty,pacing);
  return {...endlessConfig(difficulty,round),durationSeconds:pacing.duration,budget:plan.budget,waveBudget:plan.budget,ambient:plan.ambient,waves:plan.waveCount,reward:[ENDLESS.roundReward[0]*pacing.duration/60,ENDLESS.roundReward[1]*pacing.duration/60]};
 }
 const first=(round-1)*4,budget=cumulativeThreat(first+4,difficulty)-cumulativeThreat(first,difficulty),ambient=allocateCampaign18Threat(0,ENDLESS_MIX).counts;
 for(let i=0;i<4;i++){const c=waveCounts(first+i,difficulty);for(const type of Object.keys(c) as (keyof Campaign18Counts)[])ambient[type]+=c[type];}
 return {endlessId:ENDLESS_MAP_ID,difficulty,id:18,chapter:6,name:'无尽战场',durationSeconds:ENDLESS.roundDuration,budget,waveBudget:budget,mix:{...ENDLESS_MIX},reserves:{captain:0,boss:0,mainHive:0,expansionHive:0},ambient,guardBudget:0,guards:allocateCampaign18Threat(0,ENDLESS_MIX).counts,waves:4,entranceSpacing:.1,lingHp:35,speed:1.2,width:160,podHp:7200+1200*Math.floor((round-1)/2),reward:ENDLESS.roundReward,drones:4,eggs:2};
}
function fullEndlessEconomicEvents(seed:number,round:number){let random=(seed^Math.imul(round,8191))>>>0;return [{at:36,kind:'egg' as const},{at:156,kind:'egg' as const},...[48,96,144,192].map(at=>({at,kind:'drone' as const}))].map(event=>{random=(Math.imul(1664525,random)+1013904223)>>>0;return {...event,at:event.at+random/4294967296*4-2};}).sort((a,b)=>a.at-b.at);}
export type EndlessSource='wave'|'elite'|'boss';
/** Missing pacing means a current legacy 60-second round; migrate only on nextStage. */
export interface EndlessState {round:number;startedAt:number;elites:number;bosses:number;progress:Record<EndlessSource,number>;retry:Record<'elite'|'boss',number>;pending?:Partial<Record<'elite'|'boss',EnemySpawnStamp>>;last:Partial<Record<'elite'|'boss',{health:number;damage:number;period:number}>>;pacing?:EndlessPacing}
/** Frozen round-start state. Generation is pure, so restoring never advances counters. */
export interface EndlessPacing {version:1;duration:number;roundStart:number;wavePhase:number;threatCarry:number;mainBefore:number;nextWaveIndex?:number;resourceWeights?:{minerals:number;gas:number};previousWave?:Campaign18Wave}
export const ENDLESS_WAVE_WINDOW=128;
export function endlessRoundDuration(round:number){const group=Math.floor((round-1)/3);return group===0?60:group===1?90:60*(group);}
export function endlessRoundFrequency(round:number){return 1+.15*Math.floor((round-1)/3);}
export function endlessWaveCount(round:number,pacing:EndlessPacing){const interval=ENDLESS.wave.interval/endlessRoundFrequency(round);return Math.max(0,Math.ceil((pacing.duration-(1-pacing.wavePhase)*interval-1e-8)/interval));}
export function initialEndlessPacing(difficulty:Difficulty):EndlessPacing {return {version:1,duration:60,roundStart:0,wavePhase:1,threatCarry:difficulty==='easy'?0:.5,mainBefore:0};}
/** Preserve fractional wave progress, allocation rounding, and the global 4:4:1 lane serial. */
export function endlessWavePlan(round:number,difficulty:Difficulty,pacing:EndlessPacing,start=0,limit=ENDLESS_WAVE_WINDOW){
 const interval=ENDLESS.wave.interval/endlessRoundFrequency(round),rate=ENDLESS.waveTemplateThreat*(difficulty==='easy'?.5:.9)*CAMPAIGN_QUANTITY[difficulty][5]/16;
 const first=(1-pacing.wavePhase)*interval,waveCount=endlessWaveCount(round,pacing),growing=Math.max(0,Math.min(waveCount,Math.ceil((300-pacing.roundStart-first)/interval)));
 const raw=(n:number)=>{const k=Math.min(n,growing);return rate*(k+(k*(pacing.roundStart+first)+interval*k*(k-1)/2)/1500+(n-k)*1.2);};
 const spent=(n:number)=>Math.floor(pacing.threatCarry+raw(n)+1e-8),countsAt=(i:number)=>allocateCampaign18Threat(spent(i+1)-spent(i),ENDLESS_MIX).counts;
 const prefix=(n:number)=>{const counts=allocateCampaign18Threat(0,ENDLESS_MIX).counts,add=(c:Campaign18Counts,times=1)=>{for(const type of Object.keys(counts) as (keyof Campaign18Counts)[])counts[type]+=c[type]*times;};
  for(let i=0;i<Math.min(n,growing);i++)add(countsAt(i));
  if(n>growing){const low=Math.floor(rate*1.2),highs=spent(n)-spent(growing)-low*(n-growing);add(allocateCampaign18Threat(low,ENDLESS_MIX).counts,n-growing-highs);add(allocateCampaign18Threat(low+1,ENDLESS_MIX).counts,highs);}return counts;
 };
 const ambient=prefix(waveCount),main=bodies(ambient),budget=spent(waveCount),waves=Array.from({length:Math.max(0,Math.min(limit,waveCount-start))},(_,i)=>({at:first+(start+i)*interval,counts:countsAt(start+i)}));
 const next:EndlessPacing={version:1,duration:endlessRoundDuration(round+1),roundStart:pacing.roundStart+pacing.duration,wavePhase:Math.max(0,Math.min(1,pacing.wavePhase+pacing.duration/interval-waveCount)),threatCarry:Math.max(0,pacing.threatCarry+raw(waveCount)-budget),mainBefore:pacing.mainBefore+main};
 return {waves,waveCount,budget,ambient,mainBeforeWindow:bodies(prefix(start)),next};
}
export function advanceEndlessPacing(state:EndlessState,difficulty:Difficulty,elapsed:number):EndlessPacing {
 if(state.pacing)return {...endlessWavePlan(state.round,difficulty,state.pacing).next,roundStart:elapsed};
 const n=state.round*4,rate=ENDLESS.waveTemplateThreat*(difficulty==='easy'?.5:.9)*CAMPAIGN_QUANTITY[difficulty][5]/16,sum=n<=21?n*(n-1)/2:20*n-210;
 return {version:1,duration:endlessRoundDuration(state.round+1),roundStart:elapsed,wavePhase:1,threatCarry:Math.max(0,rate*(n+.01*sum)+(difficulty==='easy'?0:.5)-cumulativeThreat(n,difficulty)),mainBefore:precedingMainCount(state.round+1,difficulty)};
}
export function endlessSpawnStamp(state:EndlessState,elapsed:number):EnemySpawnStamp {
 const pacing=state.pacing;return {stage:18,progress:1,density:1,endlessSeconds:Math.max(0,elapsed),...pacing?{endlessRound:state.round,endlessGrowthSeconds:60*(state.round-1+Math.max(0,Math.min(1,(elapsed-pacing.roundStart)/pacing.duration)))}:{}};
}
export function validateEndlessState(state:EndlessState|null){
 if(!state)return;
 if(!Number.isSafeInteger(state.round)||state.round<1||!Number.isFinite(state.startedAt)||state.startedAt<0||![state.elites,state.bosses].every(n=>Number.isSafeInteger(n)&&n>=0)||!state.progress||!state.retry||!['wave','elite','boss'].every(k=>Number.isFinite(state.progress[k as EndlessSource])&&state.progress[k as EndlessSource]>=0&&state.progress[k as EndlessSource]<=1)||!['elite','boss'].every(k=>Number.isFinite(state.retry[k as 'elite'|'boss'])))throw Error('无尽轮次状态无效');
 const p=state.pacing;if(p&&(p.version!==1||p.duration!==endlessRoundDuration(state.round)||!Number.isFinite(p.roundStart)||p.roundStart<0||!Number.isFinite(p.wavePhase)||p.wavePhase<0||p.wavePhase>1||!Number.isFinite(p.threatCarry)||p.threatCarry<0||p.threatCarry>=1||!Number.isSafeInteger(p.mainBefore)||p.mainBefore<0||p.nextWaveIndex!==undefined&&(!p.resourceWeights||!Number.isSafeInteger(p.nextWaveIndex)||p.nextWaveIndex<0||p.nextWaveIndex>endlessWaveCount(state.round,p))||p.resourceWeights!==undefined&&![p.resourceWeights.minerals,p.resourceWeights.gas].every(n=>Number.isFinite(n)&&n>0)))throw Error('无尽排程状态无效');
}
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
/** Legacy four-wave plans remain intact. New rounds materialize one bounded window. */
export function endlessWaveTemplate(seed:number,round:number,difficulty:Difficulty,pacing?:EndlessPacing,start=0,limit=ENDLESS_WAVE_WINDOW){
 let random=(seed^Math.imul(round,104729))>>>0;
 const summary=pacing?endlessWavePlan(round,difficulty,pacing,start,limit):undefined,plan=summary?.waves??Array.from({length:4},(_,i)=>({at:i*15,counts:waveCounts((round-1)*4+i,difficulty)}));
 // Jump the local LCG over prior shuffles without replaying or touching world RNG.
 let draws=(summary?.mainBeforeWindow??0)-start,mult=1664525,add=1013904223;while(draws>0){if(draws%2)random=(Math.imul(mult,random)+add)>>>0;add=Math.imul(mult+1,add)>>>0;mult=Math.imul(mult,mult)>>>0;draws=Math.floor(draws/2);}
 const waves:Campaign18Wave[]=plan.map(({at,counts},i)=>{const types=(Object.keys(counts) as (keyof Campaign18Counts)[]).flatMap(type=>Array<keyof Campaign18Counts>(counts[type]).fill(type)),index=((start+i+round+seed)%8+8)%8;
  for(let k=types.length-1;k>0;k--){random=(Math.imul(1664525,random)+1013904223)>>>0;const j=random%(k+1);[types[k],types[j]]=[types[j],types[k]];}
  return {at,types,bearing:Math.atan2(ENDLESS_ENTRANCES[index].x,ENDLESS_ENTRANCES[index].z)};
 });
 const duration=pacing?.duration??60,baseline=baselineEndlessResources(difficulty),budget={minerals:baseline.minerals*duration/60,gas:baseline.gas*duration/60};
 const mainBefore=campaignMainBefore(19,difficulty,seed)+(pacing?.mainBefore??precedingMainCount(round,difficulty));
 return mixWaves(waves,{stage:18,difficulty,seed,duration,spacing:.1,mainBefore:mainBefore+(summary?.mainBeforeWindow??0),budget,endlessStart:pacing?.roundStart??(round-1)*60,...pacing?{endlessRound:round,resourceWeights:pacing.resourceWeights??endlessResourceWeights(summary!.ambient,mainBefore,seed)}:{}});
}
export function prepareEndlessWaveWindow(seed:number,state:EndlessState,difficulty:Difficulty,start=0){
 const p=state.pacing!;p.resourceWeights??=endlessResourceWeights(endlessWavePlan(state.round,difficulty,p,0,0).ambient,campaignMainBefore(19,difficulty,seed)+p.mainBefore,seed);
 const waves=endlessWaveTemplate(seed,state.round,difficulty,p,start);p.nextWaveIndex=start+waves.length;return waves;
}
export function endlessEconomicEvents(seed:number,round:number,pacing?:EndlessPacing){
 if(pacing){const start=pacing.roundStart,end=start+pacing.duration,events:ReturnType<typeof fullEndlessEconomicEvents>=[];
  for(let cycle=Math.floor(start/240);cycle*240<end;cycle++)for(const event of fullEndlessEconomicEvents(seed,cycle+1)){const at=cycle*240+event.at;if(at>=start&&at<end)events.push({...event,at:at-start});}
  return events;
 }
 const cycle=Math.floor((round-1)/4)+1,offset=(round-1)%4*60;
 return fullEndlessEconomicEvents(seed,cycle).filter(e=>e.at>=offset&&e.at<offset+60).map(e=>({...e,at:e.at-offset}));
}
export function nextEndlessExpansion(elapsed:number){
 const cycle=Math.floor(elapsed/240),local=elapsed-cycle*240,p=ENDLESS.expansion;
 for(let t=p.firstAt;t<=p.latestAt;t+=p.interval)if(t>local+1e-8)return cycle*240+t;
 return (cycle+1)*240+p.firstAt;
}
