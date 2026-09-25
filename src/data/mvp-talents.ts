import type {Race} from './races';
import {MVP_TALENT_ROWS} from './mvp-talents.generated';

export type TalentLine='resources'|'soldiers'|'army'|'micro';
export type TalentLevels=Record<string,number>;
export type TalentDefinition=(typeof MVP_TALENT_ROWS)[number];
export const MVP_TALENTS:readonly TalentDefinition[]=MVP_TALENT_ROWS;
export const TALENT_BY_ID=new Map<string,TalentDefinition>(MVP_TALENTS.map(node=>[node.id,node]));
const TALENT_BY_SEMANTIC=new Map<string,TalentDefinition>();
const semanticKey=(race:Race,id:string)=>race+':'+id;
for(const node of MVP_TALENTS){const key=semanticKey(node.race,node.semanticId);if(!TALENT_BY_SEMANTIC.has(key))TALENT_BY_SEMANTIC.set(key,node);}
export const TALENT_POINT_CAP=80;
export const MAIN_TIER_COSTS=[1,1,1,2,1,3,5] as const;
export const MICRO_TIER_COSTS=[1,3,3,6,3,6,10] as const;
export const PREVIOUS_TIER_POINTS=[0,2,5,5,3,5,2] as const;
export const TALENT_LINES:readonly {id:TalentLine;name:string}[]=[
 {id:'resources',name:'资源管理'},{id:'soldiers',name:'强化士兵'},{id:'army',name:'军队管控'},{id:'micro',name:'微操大师'}
];
const RACE_PREFIX:Record<Race,string>={terran:'T',zerg:'Z',protoss:'P'};
const LINE_PREFIX:Record<TalentLine,string>={resources:'R',soldiers:'S',army:'A',micro:'M'};
const idOf=(race:Race,line:TalentLine,number:number)=>`${RACE_PREFIX[race]}-${LINE_PREFIX[line]}${String(number).padStart(2,'0')}`;
const value=(levels:TalentLevels,id:string)=>levels[id]??0;
const full=(levels:TalentLevels,id:string)=>value(levels,id)===(TALENT_BY_ID.get(id)?.maxRank??Infinity);
const fifthFull=(race:Race,line:TalentLine,levels:TalentLevels)=>[11,12,13].filter(n=>full(levels,idOf(race,line,n))).length;
const previousTier=(race:Race,line:TalentLine,tier:number,levels:TalentLevels)=>MVP_TALENTS.filter(n=>n.race===race&&n.line===line&&n.tier===tier-1).reduce((sum,n)=>sum+value(levels,n.id),0);

/** Returns a user-facing prerequisite failure, or null when this purchased rank is legal. */
export function talentPrerequisiteFailure(node:TalentDefinition,nextRank:number,levels:TalentLevels):string|null {
 const {race,line,tier}=node;
 if(nextRank<1||nextRank>node.maxRank)return '已达到节点等级上限';
 if(line==='micro'){
  const number=Number(node.id.slice(-2));
  return number>1&&!full(levels,idOf(race,line,number-1))?'需要前一微操节点点满':null;
 }
 if(tier>1&&previousTier(race,line,tier,levels)<PREVIOUS_TIER_POINTS[tier-1])return `上一层需要投入${PREVIOUS_TIER_POINTS[tier-1]}点`;
 const number=Number(node.id.slice(-2));
 if(number>=2&&number<=4)return full(levels,idOf(race,line,1))?null:'需要第一层点满';
 if(number>=5&&number<=13){const parent=number<=7?number-3:number<=10?number-3:number-3;return full(levels,idOf(race,line,parent))?null:`需要${line==='resources'?'R':line==='soldiers'?'S':'A'}${String(parent).padStart(2,'0')}点满`;}
 if(line==='resources'){
  if(number===14)return fifthFull(race,line,levels)>=nextRank?null:`需要第五层${nextRank}项点满`;
  if(number===15)return fifthFull(race,line,levels)>=nextRank+1?null:`需要第五层${nextRank+1}项点满`;
  if(number===16)return full(levels,idOf(race,line,14))&&full(levels,idOf(race,line,15))&&fifthFull(race,line,levels)>=2?null:'需要R14/R15及第五层两项点满';
 }
 if(line==='soldiers'){
  if(number===14)return full(levels,idOf(race,line,11))&&full(levels,idOf(race,line,12))?null:'需要S11和S12点满';
  if(number===15)return full(levels,idOf(race,line,12))&&full(levels,idOf(race,line,13))?null:'需要S12和S13点满';
  if(number===16)return full(levels,idOf(race,line,14))&&full(levels,idOf(race,line,15))&&fifthFull(race,line,levels)>=2?null:'需要S14/S15及第五层两项点满';
 }
 if(line==='army'){
  if(number===14)return full(levels,idOf(race,line,10))?null:'需要A10点满';
  if(number===15)return value(levels,idOf(race,line,11))>=1&&value(levels,idOf(race,line,13))>=1?null:'需要A11和A13至少一级';
  if(number===16)return fifthFull(race,line,levels)>=2?null:'需要第五层两项点满';
 }
 return null;
}

export function allocationPoints(levels:TalentLevels){return Object.values(levels).reduce((sum,rank)=>sum+rank,0);}
export function allocationCost(levels:TalentLevels){return Object.entries(levels).reduce((sum,[id,rank])=>sum+(TALENT_BY_ID.get(id)?.resourceCost??0)*rank,0);}
export function validateTalentAllocation(race:Race,levels:TalentLevels):string|null {
 if(!levels||typeof levels!=='object'||Array.isArray(levels))return '天赋方案无效';
 let points=0;
 for(const [id,rank] of Object.entries(levels)){
  const node=TALENT_BY_ID.get(id);
  if(!node||node.race!==race||!Number.isSafeInteger(rank)||rank<1||rank>node.maxRank)return `节点${id}无效`;
  points+=rank;
 }
 if(points>TALENT_POINT_CAP)return '已达到80级上限';
 for(const [id,rank] of Object.entries(levels)){
  const node=TALENT_BY_ID.get(id)!;
  for(let level=1;level<=rank;level++){
   const failure=talentPrerequisiteFailure(node,level,levels);
   if(failure)return `${id}：${failure}`;
  }
 }
 return null;
}
export function nextTalentPurchase(race:Race,levels:TalentLevels,id:string,balance:number):string|null {
 const node=TALENT_BY_ID.get(id);
 if(!node||node.race!==race)return '不能购买其他种族的天赋';
 if(allocationPoints(levels)>=TALENT_POINT_CAP)return '已达到80级上限';
 if(balance<node.resourceCost)return `需要${node.resourceCost}永久资源`;
 return talentPrerequisiteFailure(node,value(levels,id)+1,levels);
}
export function talentRank(levels:TalentLevels,race:Race,semanticId:string){
 const node=TALENT_BY_SEMANTIC.get(semanticKey(race,semanticId));
 return node?value(levels,node.id):0;
}
