import design from '../../docs/project/zerg-six-design-20261120.json';
import {ZERG_SIX,type ZergSixFamily} from './zerg-six';
import {CAMPAIGN18_STAGES,type Campaign18Enemy,type Campaign18Wave} from './campaign18';
import {campaignProgress,type EnemyResourceScale,type EnemySpawnStamp} from './enemy-tuning';
import type {Difficulty} from './stages';

export const ZERG_ENEMY_BASE=design.enemyBase;
export const ZERG_ENEMY_DROPS=design.resources.newUnitAmbient;
export const ZERG_EXPERIENCE=design.chaff;
export const ZERG_ENDLESS=design.endless;

export type ExperienceType='zergling'|'roach'|'baneling';
export type ExperienceHealth=.05|.1|.2|.3|.5;
export interface ExperienceIdentity {
 encounterClass:'experience';rewardProfile:'none';rescueNeutral:true;health:ExperienceHealth;origin:'legacy'|'r2';
}
export interface SixBirth {
 id:string;ordinal:number;at:number;bearing:number;stamp:EnemySpawnStamp;resources:EnemyResourceScale;
}
export type SixMotherBirth=SixBirth&{type:ZergSixFamily;role:'mother'};
export type ExperienceBirth=SixBirth&{type:ExperienceType;role:'experience';health:ExperienceHealth;origin:'legacy'|'r2'};

const zero={minerals:0,gas:0};
const fraction=(total:number,i:number,count:number)=>Math.round(total*(i+1)/count)-Math.round(total*i/count);

export function zergCampaignQuotas(stage:number,difficulty:Difficulty){
 const config=design.campaign[difficulty];
 return config.first.map((first,i)=>stage<first?0:Math.min(config.cap[i],1+Math.floor((stage-first)*config.growthNumerator/config.growthDenominator)));
}

export function weaveZergQuotas(counts:readonly number[]){
 const used=counts.map(()=>0),order:ZergSixFamily[]=[];
 for(let n=counts.reduce((sum,count)=>sum+count,0);n>0;n--){
  let best=-1;
  for(let index=0;index<counts.length;index++)if(used[index]<counts[index]&&(best<0||used[index]*counts[best]<used[best]*counts[index]))best=index;
  used[best]++;
  order.push(ZERG_SIX[best]);
 }
 return order;
}

export interface SixWindowOptions {
 key:string;difficulty:Difficulty;start:number;end:number;waves:readonly Campaign18Wave[];
 quotas:readonly number[];motherTimes:(j:number,n:number)=>number;beats:readonly number[];
 count:number;ratio:number;thinRatio:number;typeOffset:number;
 stamp:(at:number)=>EnemySpawnStamp;allowed?:(type:Campaign18Enemy,at:number)=>boolean;
}

export function planSixWindow(options:SixWindowOptions){
 const {key,difficulty,start,end,waves,quotas,beats,count,ratio,thinRatio,typeOffset,stamp,allowed}=options;
 const entry=(when:number)=>{
  for(let i=waves.length-1;i>=0;i--)if(waves[i].at<=when)return waves[i];
  return waves[0];
 };
 const oldScale=waves.flatMap(w=>w.members??[]).find(m=>m.stamp.density===1)?.resources??{minerals:1,gas:1};
 const mothers=weaveZergQuotas(quotas).map((type,j,all):SixMotherBirth=>{
  const at=options.motherTimes(j,all.length);
  return {role:'mother',type,id:'six:'+key+':'+j,ordinal:j,at,bearing:(entry(at)?.bearing??0)+.1,stamp:stamp(at),resources:oldScale};
 }).filter(b=>b.at>=start&&b.at<end);
 for(let j=1;j<mothers.length;j++)if(mothers[j].at-mothers[j-1].at<.6-1e-8)throw Error('Six-unit cadence exceeds the minimum separation');
 const config=design.chaff[difficulty],thinEvery=design.brittle.beatEvery,thinBeats=Math.floor(beats.length/thinEvery);
 const light=Math.max(Math.round(count*ratio),beats.length),thin=thinBeats?Math.round(count*thinRatio):0;
 const experience:ExperienceBirth[]=[];
 for(const [i,t] of beats.entries()){
  const lightCount=fraction(light,i,beats.length);
  const thinIndex=(i+1)/thinEvery-1;
  const thinCount=(i+1)%thinEvery===0?fraction(thin,thinIndex,thinBeats):0;
  const thinStart=thinCount?Math.round(thin*thinIndex/thinBeats):0;
  for(let j=0;j<lightCount+thinCount;j++){
   const ordinal=experience.length,slot=Math.floor(j/config.packet),base=entry(t);
   const at=t+slot*design.chaff.packetSpacing+(j%config.packet)*design.chaff.memberSpacing;
   if(at>=end)continue;
   const health=(j<lightCount?.05:design.brittle.cycleHpArmor[(thinStart+j-lightCount)%3]) as ExperienceHealth;
   const suggested=design.chaff.cycle[(typeOffset+ordinal)%design.chaff.cycle.length] as ExperienceType;
   const type=allowed&&!allowed(suggested,t)?'zergling':suggested;
   const bearing=(base?.bearing??0)+((i+slot)%2?1:-1)*Math.PI/12;
   experience.push({type,at,bearing,health,ordinal,origin:'r2',role:'experience',id:'experience:'+key+':'+ordinal,stamp:stamp(at),resources:zero});
  }
 }
 return {mothers,experience};
}

export function planZergCampaign(stage:number,difficulty:Difficulty,waves:readonly Campaign18Wave[],duration:number){
 const chapter=Math.floor((stage-1)/3),beat=design.chaff[difficulty].beatSeconds[chapter];
 const beats=Array.from({length:Math.max(0,1+Math.floor((duration-design.chaff.stopBeforeEnd-design.chaff.firstAt)/beat))},(_,i)=>design.chaff.firstAt+i*beat);
 const known=new Set<Campaign18Enemy>();
 for(const s of CAMPAIGN18_STAGES.slice(0,stage-1))for(const [type,amount] of Object.entries(s.mix))if(amount)known.add(type as Campaign18Enemy);
 const introduction=new Map<Campaign18Enemy,number>();
 for(const w of waves)for(const m of w.members??[])if(m.stamp.density===1&&!introduction.has(m.type))introduction.set(m.type,w.at+m.offset);
 return planSixWindow({key:String(stage),difficulty,start:0,end:duration,waves,quotas:zergCampaignQuotas(stage,difficulty),
  motherTimes:(j,n)=>duration*(.32+(n>1?.50*j/(n-1):0)),beats,
  count:waves.reduce((n,w)=>n+w.types.length,0),ratio:design.chaff[difficulty].chapterRatio[chapter],
  thinRatio:stage>=design.brittle.fromStage?design.brittle.primaryRatio[difficulty]:0,typeOffset:stage*31,
  stamp:at=>({stage,progress:campaignProgress(stage,at,duration),density:1}),
  allowed:(type,at)=>known.has(type)||(introduction.get(type)??Infinity)<=at
 });
}
