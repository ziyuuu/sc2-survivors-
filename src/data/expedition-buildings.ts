import {SOURCE_PRODUCTION_RECIPES} from './expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL_RECIPE} from './campaign-science-vessel';
import {SC2_UNITS} from './sc2-units';
import type {FamilyId,Race} from './races';
export type ProductionLineId='barracks'|'factory'|'starport'|'zerg.basic'|'zerg.evolution'|'zerg.air'|'gateway'|'robotics'|'stargate';
export interface DevelopmentDefinition {id:string;name:string;race:Race;kind:'facility'|'technology'|'research';minerals:number;gas:number;requires:string[];afterStage:number;families:FamilyId[];line?:ProductionLineId;maxLevel:number;unlock?:'family'|'skill'|'system';}
export const PRODUCTION_LINES:Record<ProductionLineId,{race:Race;name:string;families:FamilyId[]}>= {
 barracks:{race:'terran',name:'兵营',families:['marine','marauder','reaper']},factory:{race:'terran',name:'重工厂',families:['hellion','tank','thor']},starport:{race:'terran',name:'星港',families:['medivac','viking','banshee','science_vessel']},
 'zerg.basic':{race:'zerg',name:'基础虫群',families:['zergling','baneling','roach','queen']},'zerg.evolution':{race:'zerg',name:'地面进化',families:['ravager','hydralisk','lurker','ultralisk']},'zerg.air':{race:'zerg',name:'飞行虫群',families:['mutalisk','corruptor']},
 gateway:{race:'protoss',name:'传送门',families:['zealot','adept','stalker','sentry','high_templar']},robotics:{race:'protoss',name:'机械台',families:['immortal','colossus']},stargate:{race:'protoss',name:'星门',families:['phoenix','void_ray','carrier']},
};
export function familyLine(family:FamilyId):ProductionLineId{return (Object.entries(PRODUCTION_LINES).find(([,line])=>line.families.includes(family))!)[0] as ProductionLineId;}
export const familyUnlock=(family:FamilyId)=>`unlock.${family}`;
export const lineSystem=(line:ProductionLineId)=>`system.${line}`;
export const lineResearch=(line:ProductionLineId,kind:'weapon'|'defense')=>`research.${line}.${kind}`;
export function seatRecipe(family:FamilyId){const r=family==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[family];if(!r)throw Error(`Missing seat recipe ${family}`);const count=family==='zergling'?2:1;return {minerals:r.mineralCost*count,gas:r.gasCost*count};}
export const FAMILY_REQUIREMENTS=Object.fromEntries(Object.values(PRODUCTION_LINES).flatMap(l=>l.families.map(f=>[f,[familyUnlock(f)]]))) as Record<FamilyId,string[]>;
export const HEAVY_FAMILIES:FamilyId[]=['thor','ultralisk','carrier'];
export const LINE_SKILLS:Partial<Record<ProductionLineId,readonly (readonly [string,string,FamilyId])[]>>={
 barracks:[['stim','兴奋剂','marine'],['shield','战斗盾','marine']],factory:[['infernal','燃烧强化','hellion']],starport:[['cloak','隐形装置','banshee'],['support_efficiency','医修效率','science_vessel']],
 'zerg.basic':[['ling_speed','代谢加速','zergling'],['bane_speed','离心钩','baneling'],['roach_speed','胶质重组','roach']],'zerg.evolution':[['hydra_range','沟槽脊刺','hydralisk'],['lurker_deploy','适应爪','lurker']],
 gateway:[['charge','冲锋','zealot'],['glaives','共鸣战刃','adept'],['blink','闪烁','stalker'],['storm','灵能风暴','high_templar']],robotics:[['colossus_range','热能射线','colossus']]
};
export const DEVELOPMENT:DevelopmentDefinition[]=[];
const facility=(race:Race,id:string,name:string,minerals:number,gas:number,requires:string[],line:ProductionLineId)=>DEVELOPMENT.push({race,id,name,kind:'facility',minerals,gas,requires,line,afterStage:0,maxLevel:5,families:PRODUCTION_LINES[line].families});
facility('terran','barracks','兵营',150,0,[],'barracks');facility('terran','factory','重工厂',150,100,['barracks'],'factory');facility('terran','starport','星港',150,100,['factory'],'starport');
facility('zerg','hatchery','孵化场',150,0,[],'zerg.basic');
facility('protoss','gateway','传送门',150,0,[],'gateway');facility('protoss','robotics','机械台',150,100,['gateway'],'robotics');facility('protoss','stargate','星门',150,100,['gateway'],'stargate');
for(const [id,route] of Object.entries(PRODUCTION_LINES)){
 const line=id as ProductionLineId,base={race:route.race,line,afterStage:0,maxLevel:1};
 for(const f of route.families)DEVELOPMENT.push({...base,id:familyUnlock(f),name:`解锁${SC2_UNITS[f].zh}`,kind:'technology',unlock:'family',...seatRecipe(f),requires:[],families:[f]});
 for(const [skill,name,family] of LINE_SKILLS[line]??[])DEVELOPMENT.push({...base,id:skill,name,kind:'technology',unlock:'skill',minerals:125,gas:75,requires:[familyUnlock(family)],families:[family]});
 DEVELOPMENT.push({...base,id:lineSystem(line),name:`${route.name}攻防系统`,kind:'technology',unlock:'system',minerals:100,gas:50,requires:[],families:[...route.families]});
 for(const kind of ['weapon','defense'] as const)DEVELOPMENT.push({...base,id:lineResearch(line,kind),name:`${route.name}${kind==='weapon'?'武器':'防护'}`,kind:'research',minerals:125,gas:50,requires:[lineSystem(line)],maxLevel:3,families:[...route.families]});
}
/** Direction includes only its projects and the fixed facility chain needed to reach it. */
export function developmentInDirection(id:string,line:ProductionLineId){const d=DEVELOPMENT.find(d=>d.id===id);if(!d)return false;if(d.kind!=='facility')return d.line===line;if(id==='hatchery')return line.startsWith('zerg.');if(d.line===line)return true;return line==='factory'&&id==='barracks'||line==='starport'&&['barracks','factory'].includes(id)||['robotics','stargate'].includes(line)&&id==='gateway';}
export function developmentPrice(d:DevelopmentDefinition,level:number){return d.maxLevel===3?{minerals:125+75*level,gas:50+50*level}:{minerals:d.minerals,gas:d.gas};}

export function familyResearchLevel(tech:Record<string,number>,family:string,kind:'weapon'|'defense'){const line=Object.entries(PRODUCTION_LINES).find(([,l])=>l.families.includes(family as FamilyId))?.[0] as ProductionLineId|undefined;return line?tech[lineResearch(line,kind)]??0:0;}
