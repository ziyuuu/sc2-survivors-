import {STAGES,chapterGrowth,enemyPressure,type Difficulty,type EnemyPressure} from './stages';

/** The approved Survivors campaign, independent of the legacy twelve-stage table. */
export const CAMPAIGN18_ID='three-races-18' as const;
export const CAMPAIGN18_ENEMIES=['zergling','roach','baneling','ravager','hydralisk','queen','lurker','mutalisk','corruptor','ultralisk'] as const;
export type Campaign18Enemy=typeof CAMPAIGN18_ENEMIES[number];
export type Campaign18Counts=Record<Campaign18Enemy,number>;
export const CAMPAIGN18_WEIGHTS:Readonly<Campaign18Counts>=Object.freeze({zergling:1,roach:3,baneling:2,ravager:4,hydralisk:3,queen:5,lurker:6,mutalisk:4,corruptor:4,ultralisk:12});
export const CAMPAIGN18_HERO_WINDOWS=[6,9,12] as const;
export const CAMPAIGN18_PURPLE_WINDOWS=[15] as const;
export const CAMPAIGN18_DURATIONS=[60,60,60,75,75,75,90,90,90,105,105,105,120,120,120,150,150,150] as const;
export const CAMPAIGN18_BUDGETS=[6,12,28,70,95,125,150,170,190,185,230,285,330,370,420,600,660,758] as const;
export const CAMPAIGN18_CHAPTER_REWARDS=[[330,155],[550,300],[500,325],[400,375],[425,425],[550,475]] as const;
const mixes:readonly (readonly number[])[]=[
 [100,0,0,0,0,0,0,0,0,0],[70,30,0,0,0,0,0,0,0,0],[70,0,30,0,0,0,0,0,0,0],
 [65,20,15,0,0,0,0,0,0,0],[35,40,0,0,25,0,0,0,0,0],[30,35,20,0,15,0,0,0,0,0],
 [40,25,0,0,20,0,0,15,0,0],[25,30,0,25,20,0,0,0,0,0],[25,25,0,0,25,15,0,10,0,0],
 [30,25,0,0,25,0,0,20,0,0],[30,20,0,0,25,0,25,0,0,0],[25,20,0,20,20,0,15,0,0,0],
 [25,25,0,0,20,15,0,0,0,15],[25,20,0,0,20,0,0,20,15,0],[20,20,0,20,20,20,0,0,0,0],
 [20,20,0,15,20,0,15,0,0,10],[30,15,20,0,15,0,0,10,0,10],[20,20,10,15,15,0,10,5,0,5],
];
const names=['登陆','甲壳护卫','爆虫预警','窄口虫群','重甲侧袭','第一主力','地空夹击','胆汁火线','虫后支援','转型窗口','潜伏阵地','第二主力','雷兽冲击','空群混战','支援网络','外巢推进','主巢前哨','主巢决战'];
const sum=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
const starts=CAMPAIGN18_DURATIONS.map((_,i)=>sum(CAMPAIGN18_DURATIONS.slice(0,i)));
const legacyStarts=STAGES.map((_,i)=>sum(STAGES.slice(0,i).map(s=>s.durationSeconds)));
export const CAMPAIGN18_TOTALS=Object.freeze({stages:18,chapters:6,intermissions:17,combatSeconds:1800,baseThreat:4684,minerals:2755,gas:2055});
export const emptyCampaign18Counts=():Campaign18Counts=>Object.fromEntries(CAMPAIGN18_ENEMIES.map(type=>[type,0])) as Campaign18Counts;
const rowCounts=(row:readonly number[]):Campaign18Counts=>Object.fromEntries(CAMPAIGN18_ENEMIES.map((type,i)=>[type,row[i]??0])) as Campaign18Counts;
export const campaign18Threat=(counts:Readonly<Campaign18Counts>)=>CAMPAIGN18_ENEMIES.reduce((total,type)=>total+counts[type]*CAMPAIGN18_WEIGHTS[type],0);
function stageIndex(stage:number){if(!Number.isInteger(stage)||stage<1||stage>18)throw new RangeError('Campaign18 stage must be 1–18');return stage-1;}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** Six chapters span the existing four profiles, retaining both endpoints. */
function profilePosition(stage:number){const chapter=Math.floor(stageIndex(stage)/3),position=chapter*3/5;return {low:Math.floor(position),high:Math.ceil(position),fraction:position-Math.floor(position)};}
export function campaign18EnemyPressure(difficulty:Difficulty,stage:number):EnemyPressure {
 const {low,high,fraction}=profilePosition(stage),a=enemyPressure(difficulty,1+low*3),b=enemyPressure(difficulty,1+high*3);
 return Object.fromEntries(Object.keys(a).map(key=>[key,lerp(a[key as keyof EnemyPressure],b[key as keyof EnemyPressure],fraction)])) as unknown as EnemyPressure;
}
export function campaign18ChapterGrowth(difficulty:Difficulty,stage:number){
 const {low,high,fraction}=profilePosition(stage),a=chapterGrowth(difficulty,1+low*3),b=chapterGrowth(difficulty,1+high*3);
 return {health:lerp(a.health,b.health,fraction),damage:lerp(a.damage,b.damage,fraction),attackSpeed:lerp(a.attackSpeed,b.attackSpeed,fraction)};
}
const countRound=(n:number,difficulty:Difficulty)=>difficulty==='easy'?Math.floor(n+1e-8):Math.floor(n+.5+1e-8);
/** Round the cumulative campaign budget, not each small family or wave separately. */
function scaledBudget(stage:number,difficulty:Difficulty){let before=0;for(let s=1;s<stage;s++)before+=CAMPAIGN18_BUDGETS[s-1]*(difficulty==='easy'?.5:.9)*campaign18EnemyPressure(difficulty,s).total;const current=CAMPAIGN18_BUDGETS[stage-1]*(difficulty==='easy'?.5:.9)*campaign18EnemyPressure(difficulty,stage).total;return countRound(before+current,difficulty)-countRound(before,difficulty);}

/** Percentages describe threat share, not body count. Fill only with allowed types. */
export function allocateCampaign18Threat(budget:number,mix:Readonly<Campaign18Counts>){
 if(!Number.isInteger(budget)||budget<0)throw new RangeError('Threat budget must be a nonnegative integer');
 const counts=emptyCampaign18Counts(),allowed=CAMPAIGN18_ENEMIES.filter(type=>mix[type]>0),total=allowed.reduce((n,type)=>n+mix[type],0);
 if(!Number.isFinite(total)||!total)return {counts,spent:0,unspent:budget};
 for(const type of allowed)counts[type]=Math.floor(budget*mix[type]/total/CAMPAIGN18_WEIGHTS[type]);
 let remaining=budget-campaign18Threat(counts);
 while(remaining>0){let chosen:Campaign18Enemy|undefined,best=-Infinity;for(const type of allowed){const weight=CAMPAIGN18_WEIGHTS[type];if(weight>remaining)continue;const deficit=budget*mix[type]/total/weight-counts[type];if(deficit>best){best=deficit;chosen=type;}}if(!chosen)break;counts[chosen]++;remaining-=CAMPAIGN18_WEIGHTS[chosen];}
 return {counts,spent:budget-remaining,unspent:remaining};
}

/** Use elapsed campaign position for old battlefield/HP references, not stage 12 clamping. */
function legacyValue(index:number,value:(s:typeof STAGES[number])=>number){
 const time=starts[index]/starts[17]*legacyStarts[11];let low=0;while(low<11&&legacyStarts[low+1]<=time)low++;const high=Math.min(11,low+1),fraction=high===low?0:(time-legacyStarts[low])/(legacyStarts[high]-legacyStarts[low]);return lerp(value(STAGES[low]),value(STAGES[high]),fraction);
}
export interface Campaign18EconomicEvent {at:number;kind:'egg'|'drone'}
/** Redistribute the old 26 eggs and 40 drones over the same 30 combat minutes. */
const economicTimeline=STAGES.flatMap((s,index)=>(['egg','drone'] as const).flatMap(kind=>Array.from({length:kind==='egg'?s.eggs:s.drones},(_,i)=>{
 const local=s.id<=2?(kind==='egg'?[10,27,41][i]:[7,19,37,49][i]):s.durationSeconds*(kind==='egg'?.15+i*.5/Math.max(1,s.eggs-1):.2+i*.6/Math.max(1,s.drones-1));return {at:legacyStarts[index]+local,kind};
}))).sort((a,b)=>a.at-b.at);
const stageEconomy=(index:number)=>economicTimeline.filter(e=>e.at>=starts[index]&&e.at<starts[index]+CAMPAIGN18_DURATIONS[index]).map(e=>({...e,at:Math.max(.01,e.at-starts[index])}));
export interface Campaign18Reserves {captain:number;boss:number;mainHive:number;expansionHive:number}
export interface Campaign18StageConfig {
 campaignId:typeof CAMPAIGN18_ID;difficulty?:Difficulty;id:number;chapter:number;name:string;durationSeconds:number;
 /** budget includes every special/hive reserve; guards use a separate per-delivery budget. */
 budget:number;waveBudget:number;mix:Campaign18Counts;reserves:Campaign18Reserves;ambient:Campaign18Counts;guardBudget:number;guards:Campaign18Counts;
 waves:number;entranceSpacing:number;lingHp:number;speed:number;width:number;podHp:number;reward:readonly [number,number];drones:number;eggs:number;
}
function reservesFor(stage:number,budget:number,difficulty?:Difficulty):Campaign18Reserves{return {captain:[3,9,15].includes(stage)?Math.floor(budget*.1):0,boss:[6,12].includes(stage)?Math.floor(budget*.2):0,mainHive:stage===18?Math.floor(budget*.3):0,expansionHive:difficulty==='hell'&&stage>=4?Math.floor(budget*.1):0};}
const reserveTotal=(r:Campaign18Reserves)=>r.captain+r.boss+r.mainHive+r.expansionHive;
function chapterReward(index:number):readonly [number,number]{const total=CAMPAIGN18_CHAPTER_REWARDS[Math.floor(index/3)];return total.map(n=>index%3===2?n-2*Math.floor(n*.3):Math.floor(n*.3)) as unknown as readonly [number,number];}
function baseStage(index:number):Campaign18StageConfig {
 const id=index+1,budget=CAMPAIGN18_BUDGETS[index],mix=rowCounts(mixes[index]),reserves=reservesFor(id,budget),waveBudget=budget-reserveTotal(reserves),events=stageEconomy(index);
 const guardBudget=Math.round(legacyValue(index,s=>Object.entries(s.guards).reduce((n,[type,count])=>n+count*CAMPAIGN18_WEIGHTS[type as Campaign18Enemy],0)));
 return {campaignId:CAMPAIGN18_ID,id,chapter:Math.floor(index/3)+1,name:names[index],durationSeconds:CAMPAIGN18_DURATIONS[index],budget,waveBudget,mix,reserves,ambient:allocateCampaign18Threat(waveBudget,mix).counts,guardBudget,guards:allocateCampaign18Threat(guardBudget,mix).counts,waves:Math.ceil(CAMPAIGN18_DURATIONS[index]/10),entranceSpacing:legacyValue(index,s=>s.entranceSpacing),lingHp:Math.round(legacyValue(index,s=>s.lingHp)),speed:legacyValue(index,s=>s.speed),width:legacyValue(index,s=>s.width),podHp:Math.round(legacyValue(index,s=>s.podHp)),reward:chapterReward(index),eggs:events.filter(e=>e.kind==='egg').length,drones:events.filter(e=>e.kind==='drone').length};
}
export const CAMPAIGN18_STAGES:readonly Campaign18StageConfig[]=CAMPAIGN18_DURATIONS.map((_,i)=>baseStage(i));
/** serial is this stage's zero-based delivery number; retain it in the caller's run state. */
export function campaign18GuardCounts(stage:number,difficulty:Difficulty,serial=0){
 if(!Number.isSafeInteger(serial)||serial<0)throw new RangeError('Guard serial must be a nonnegative integer');const base=CAMPAIGN18_STAGES[stageIndex(stage)],target=base.guardBudget*(difficulty==='easy'?.5:.9)*campaign18EnemyPressure(difficulty,stage).guards,budget=countRound((serial+1)*target,difficulty)-countRound(serial*target,difficulty);return {budget,...allocateCampaign18Threat(budget,base.mix)};
}
export function campaign18StageConfig(stage:number,difficulty:Difficulty):Campaign18StageConfig {
 const base=CAMPAIGN18_STAGES[stageIndex(stage)],budget=scaledBudget(stage,difficulty),reserves=reservesFor(stage,budget,difficulty),waveBudget=budget-reserveTotal(reserves),guards=campaign18GuardCounts(stage,difficulty);
 return {...base,difficulty,budget,waveBudget,mix:{...base.mix},reserves,ambient:allocateCampaign18Threat(waveBudget,base.mix).counts,guardBudget:guards.budget,guards:guards.counts,reward:[...base.reward]};
}

export interface Campaign18Wave {at:number;types:Campaign18Enemy[];bearing:number}
export interface Campaign18Special {at:number;type:Campaign18Enemy;tier:'elite'|'boss';role:'captain'|'boss';budget:number}
export interface Campaign18Hive {
 at:number;budget:number;kind:'main'|'expansion';warningAt?:number;warningSeconds?:number;maxNewPerStage?:number;maxAlive?:number;
 phases?:readonly {from:number;until:number;name:string}[];alwaysAttackable?:boolean;requiresSurvival?:boolean;healBetweenPhases?:boolean;
}
export interface Campaign18Schedule {
 waves:Campaign18Wave[];events:Campaign18EconomicEvent[];specials:Campaign18Special[];mainHive:Campaign18Hive|null;expansionHive:Campaign18Hive|null;
 accounting:{budget:number;waves:number;specials:number;mainHive:number;expansionHive:number;withheld:number;unspent:number};
}
export interface MainHiveCast {id:number;kind:'fan'|'bile'|'line';origin:{x:number;z:number};point:{x:number;z:number};angle:number;warningAt:number;at:number;radius:number;range:number;damage:number}
export interface MainHiveMissile {id:number;cast:number;x:number;z:number;angle:number;remaining:number;speed:number;damage:number;hitIds:number[]}
export interface MainHiveCombatState {nextEvent:number;serial:number;casts:MainHiveCast[];missiles:MainHiveMissile[]}
export interface Campaign18Runtime {
 mainCombat?:MainHiveCombatState;
 stage:number;difficulty:Difficulty;guardSerial:number;expansionId:number|null;expansionSpawned:boolean;mainPhase:number;nextMainSkillAt:number;
 accounting:Campaign18Schedule['accounting'];
 /** A hive spends half its reserve on the structure and the rest on finite adds. Experimental tuning. */
 mainStructureBudget:number;expansionStructureBudget:number;
 hiveBatches:{at:number;kind:'main'|'expansion';types:Campaign18Enemy[]}[];
 spawned:{waves:number;specials:number;mainHive:number;expansionHive:number};withheld:number;
}
/** The map asset has twelve authored reveal levels; retain the first and final reveals. */
export function campaign18TerrainStage(stage:number){stageIndex(stage);return 1+Math.floor((stage-1)*11/17);}
export function campaign18Runtime(config:Campaign18StageConfig,schedule:Campaign18Schedule):Campaign18Runtime {
 const hiveBatches:Campaign18Runtime['hiveBatches']=[],structure={main:0,expansion:0};
 for(const hive of [schedule.mainHive,schedule.expansionHive])if(hive){
  structure[hive.kind]=Math.ceil(hive.budget/2);
  const counts=allocateCampaign18Threat(hive.budget-structure[hive.kind],config.mix).counts,types=CAMPAIGN18_ENEMIES.flatMap(type=>Array<Campaign18Enemy>(counts[type]).fill(type));
  const times=hive.kind==='main'?[0,12,27,40,57,77,97,112,130]:[hive.at+8,hive.at+20,hive.at+32].filter(at=>at<config.durationSeconds*.9);
  const batches=times.map(at=>({at,kind:hive.kind,types:[] as Campaign18Enemy[]}));types.forEach((type,i)=>batches[i%batches.length].types.push(type));hiveBatches.push(...batches);
 }
 return {mainCombat:{nextEvent:0,serial:0,casts:[],missiles:[]},stage:config.id,difficulty:config.difficulty??'normal',guardSerial:0,expansionId:null,expansionSpawned:false,mainPhase:0,nextMainSkillAt:4,accounting:{...schedule.accounting},mainStructureBudget:structure.main,expansionStructureBudget:structure.expansion,hiveBatches:hiveBatches.sort((a,b)=>a.at-b.at),spawned:{waves:0,specials:0,mainHive:0,expansionHive:0},withheld:0};
}
function randomSeed(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
/** Independent RNG streams keep economy stable when specials are disabled. No player inputs. */
export function campaign18Schedule(s:Campaign18StageConfig,seed:number,specialsEnabled=true):Campaign18Schedule {
 stageIndex(s.id);const rng=randomSeed(seed+s.id*7919),economyRng=randomSeed((seed+s.id*104729)^0x5b3a),duration=s.durationSeconds,count=s.waves,first=s.id<=2?3:duration*.12,last=duration*.9,gap=count>1?(last-first)/(count-1):0;
 const waves:Campaign18Wave[]=Array.from({length:count},(_,i)=>({at:i===0?first:i===count-1?last:first+i*gap+(rng()-.5)*Math.min(2,gap*.3),types:[],bearing:rng()*Math.PI*2}));
 for(const type of CAMPAIGN18_ENEMIES){const introduced=CAMPAIGN18_STAGES.findIndex(stage=>stage.mix[type]>0)+1,offset=introduced===s.id&&type!=='zergling'?Math.min(2,count-1):0;for(let i=0;i<s.ambient[type];i++)waves[offset+i%(count-offset)].types.push(type);}
 // Shuffle each wave independently of the composition, preserving its exact threat budget.
 for(const wave of waves)for(let i=wave.types.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[wave.types[i],wave.types[j]]=[wave.types[j],wave.types[i]];}
 const events=stageEconomy(s.id-1).map(e=>{const radius=Math.min(2,e.at*.45,(duration-e.at)*.45);return {...e,at:e.at+(economyRng()*2-1)*radius};}).sort((a,b)=>a.at-b.at);
 const specials:Campaign18Special[]=[];let mainHive:Campaign18Hive|null=null,expansionHive:Campaign18Hive|null=null;
 if(specialsEnabled){
  if(s.reserves.captain)specials.push({at:duration*.6,type:s.id===3?'zergling':s.id===9?'queen':'hydralisk',tier:'elite',role:'captain',budget:s.reserves.captain});
  if(s.reserves.boss)specials.push({at:duration*.55,type:s.id===6?'roach':'ravager',tier:'boss',role:'boss',budget:s.reserves.boss});
  if(s.reserves.mainHive)mainHive={kind:'main',at:0,budget:s.reserves.mainHive,phases:[{from:0,until:45,name:'外围驻军'},{from:45,until:100,name:'主巢技能'},{from:100,until:150,name:'机制组合'}],alwaysAttackable:true,requiresSurvival:true,healBetweenPhases:false};
  if(s.reserves.expansionHive){const at=duration*.45;expansionHive={kind:'expansion',at,budget:s.reserves.expansionHive,warningAt:at-5,warningSeconds:5,maxNewPerStage:1,maxAlive:2};}
 }
 const waveCost=waves.reduce((n,w)=>n+w.types.reduce((v,type)=>v+CAMPAIGN18_WEIGHTS[type],0),0),specialCost=specials.reduce((n,e)=>n+e.budget,0),withheld=specialsEnabled?0:reserveTotal(s.reserves);
 return {waves,events,specials:specials.sort((a,b)=>a.at-b.at),mainHive,expansionHive,accounting:{budget:s.budget,waves:waveCost,specials:specialCost,mainHive:mainHive?.budget??0,expansionHive:expansionHive?.budget??0,withheld,unspent:s.budget-waveCost-specialCost-(mainHive?.budget??0)-(expansionHive?.budget??0)-withheld}};
}
