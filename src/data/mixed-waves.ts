import {CAMPAIGN18_ENEMIES,CAMPAIGN18_STAGES,campaign18StageConfig,type Campaign18Wave,type Campaign18Enemy,type MixedWaveMember} from './campaign18';
import {CAMPAIGN_CHAPTERS} from './campaign-layout';
import {DROPS} from './economy';
import {campaignProgress,type EnemyResourceScale} from './enemy-tuning';
import type {Difficulty} from './stages';

const weakTypes=['zergling','roach','baneling'] as const,shares=[.7,.2,.1];
export function ambientResources(type:Campaign18Enemy):readonly number[]{return DROPS.ambient[type as keyof typeof DROPS.ambient]??[1,0];}
const addResources=(total:EnemyResourceScale,type:Campaign18Enemy,count:number)=>{const [m,g]=ambientResources(type);total.minerals+=m*count;total.gas+=g*count;};
/** Frozen pre-R2 budget: existing primary waves plus the independent swarm they replace. */
export function baselineCampaignResources(stage:number,difficulty:Difficulty){
 const total={minerals:0,gas:0},base=campaign18StageConfig(stage,difficulty,true);
 for(const type of CAMPAIGN18_ENEMIES)addResources(total,type,base.ambient[type]);
 const before=[0,0,0];
 for(let s=7;s<=stage;s++){
  const amount=s<=9?60:s<=12?90:s<=15?120:150,factor=(difficulty==='easy'?.5/.9:1)*CAMPAIGN_CHAPTERS[difficulty][Math.floor((s-1)/3)].pressure.total;
  shares.forEach((share,i)=>{const after=before[i]+amount*factor*share;if(s===stage)addResources(total,weakTypes[i],Math.floor(after+1e-8)-Math.floor(before[i]+1e-8));before[i]=after;});
 }
 return total;
}
export function campaignMainBefore(stage:number,difficulty:Difficulty){let count=0;for(let s=1;s<stage;s++)count+=Object.values(campaign18StageConfig(s,difficulty).ambient).reduce((a,b)=>a+b,0);return count;}
/** Exact 4:4:1 cumulative body ratio. Companions share their primary's due time and approach. */
export function mixWaves(waves:readonly Campaign18Wave[],options:{stage:number;difficulty:Difficulty;seed:number;duration:number;spacing:number;mainBefore:number;budget:EnemyResourceScale;endlessStart?:number}):Campaign18Wave[]{
 const {stage,difficulty,seed,duration,spacing,budget,endlessStart}=options;
 const unlocked=new Set<Campaign18Enemy>(endlessStart===undefined?CAMPAIGN18_ENEMIES.filter(type=>CAMPAIGN18_STAGES.findIndex(s=>s.mix[type]>0)+1<stage):CAMPAIGN18_ENEMIES);
 let serial=options.mainBefore;
 const weak=(index:number,salt:number):Campaign18Enemy=>{
  const choices=weakTypes.map((type,i)=>({type,share:shares[i]})).filter(({type})=>unlocked.has(type)),total=choices.reduce((n,c)=>n+c.share,0);
  let n=((Math.imul(index+1,1664525)^Math.imul(seed+salt,1013904223))>>>0)/4294967296*total;
  for(const c of choices){n-=c.share;if(n<0)return c.type;}return choices.at(-1)?.type??'zergling';
 };
 const result=waves.map(wave=>{
  // A newly introduced species becomes eligible in the same wave as its first primary.
  wave.types.forEach(type=>unlocked.add(type));
  const members:MixedWaveMember[]=[];
  wave.types.forEach((type,i)=>{
   const lane=serial++,offset=i*spacing,elapsed=Math.min(duration,wave.at+offset),progress=endlessStart===undefined?campaignProgress(stage,elapsed,duration):1;
   const base={stage,progress,...endlessStart===undefined?{}:{endlessSeconds:endlessStart+elapsed}};
   const put=(type:Campaign18Enemy,density:1|.3|.5)=>members.push({type,offset,lane,stamp:{...base,density},resources:{minerals:1,gas:1}});
   put(type,1);put(weak(lane,17),.3);if((lane+1)%4===0)put(weak(lane,71),.5);
  });
  return {...wave,members};
 });
 const weight={minerals:0,gas:0};for(const wave of result)for(const member of wave.members)addResources(weight,member.type,member.stamp.density);
 for(const wave of result)for(const member of wave.members)member.resources={minerals:weight.minerals?budget.minerals/weight.minerals*member.stamp.density:0,gas:weight.gas?budget.gas/weight.gas*member.stamp.density:0};
 return result;
}
export function mixCampaignWaves(waves:readonly Campaign18Wave[],stage:number,difficulty:Difficulty,seed:number){const config=campaign18StageConfig(stage,difficulty);return mixWaves(waves,{stage,difficulty,seed,duration:config.durationSeconds,spacing:config.entranceSpacing,mainBefore:campaignMainBefore(stage,difficulty),budget:baselineCampaignResources(stage,difficulty)});}
