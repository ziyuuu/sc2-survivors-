// UI review fixtures only. They do not determine production eligibility or charge a wallet.
import {DEVELOPMENT,PRODUCTION_LINES,type ProductionLineId} from '../../src/data/expedition-buildings';
import {SC2_UNITS} from '../../src/data/sc2-units';
import type {Race,FamilyId} from '../../src/data/races';
import type {CardView} from '../../src/ui/presentation/reference-card';
export type Scene='opening'|'developed'|'prerequisite'|'poor';
export type FacilityView={id:string;name:string;line:ProductionLineId;directions:string[];families:FamilyId[];outputs:FamilyId[];enabled:boolean;paid?:string;count?:number};
export const names:Record<Race,string>={terran:'人族',zerg:'虫族',protoss:'神族'};
export const routes:Record<string,string>={barracks:'陆战队员 → 死神 → 劫掠者',factory:'恶火 → 坦克 → 雷神',starport:'医疗运输机 → 科学船 → 维京 → 女妖','zerg.basic':'跳虫／爆虫 → 蟑螂／虫后','zerg.evolution':'刺蛇 → 破坏者 → 雷兽／潜伏者','zerg.air':'飞龙 → 腐化者',gateway:'狂热者 → 使徒 → 追猎者／哨兵 → 高阶圣堂武士',robotics:'不朽者 → 巨像',stargate:'凤凰 → 虚空辉光舰 → 航母'};
const line=(id:ProductionLineId,outputs:FamilyId[]):FacilityView=>({id,name:PRODUCTION_LINES[id].name,line:id,directions:[PRODUCTION_LINES[id].name],families:PRODUCTION_LINES[id].families,outputs,enabled:true});
export function fixture(race:Race,scene:Scene){
 const developed=scene==='developed',basic=Object.entries(PRODUCTION_LINES).filter(([,l])=>l.race===race).map(([id])=>id as ProductionLineId);
 const facilities:FacilityView[]=race==='zerg'?[{id:'h1',name:'孵化场 1',line:'zerg.basic',directions:['基础'],families:PRODUCTION_LINES['zerg.basic'].families,outputs:developed?['zergling','baneling']:['zergling'],enabled:true},...(developed?[{id:'h2',name:'孵化场 2',line:'zerg.evolution',directions:['地面','天空'],families:[...PRODUCTION_LINES['zerg.basic'].families,...PRODUCTION_LINES['zerg.evolution'].families,...PRODUCTION_LINES['zerg.air'].families],outputs:['hydralisk','mutalisk'],enabled:true,paid:'已付费刺蛇订单保持原进度'},{id:'h3',name:'孵化场 3',line:'zerg.basic',directions:['基础'],families:PRODUCTION_LINES['zerg.basic'].families,outputs:['roach','queen'],enabled:true}] as FacilityView[]:[])]:[line(basic[0],[PRODUCTION_LINES[basic[0]].families[0]]),...(developed?basic.slice(1).map(id=>line(id,[PRODUCTION_LINES[id].families[0]])):[])];
 if(developed&&race==='zerg')facilities.push({id:'h4',name:'孵化场 4',line:'zerg.evolution',directions:['地面'],families:[...PRODUCTION_LINES['zerg.basic'].families,...PRODUCTION_LINES['zerg.evolution'].families],outputs:['ravager'],enabled:true},{id:'h5',name:'孵化场 5',line:'zerg.air',directions:['天空'],families:PRODUCTION_LINES['zerg.air'].families,outputs:['mutalisk'],enabled:false});
 if(scene==='prerequisite'&&race==='protoss')facilities.length=0;
 if(developed&&race==='terran')facilities[0].outputs=['marine','reaper'];
 if(developed&&race==='protoss'){facilities[0].outputs=['stalker','sentry'];facilities.push({id:'crystal-pair',name:'折跃水晶 ×2',line:'gateway',directions:['两座样例 · 配置方式待定'],families:['zealot','adept'],outputs:['zealot','adept'],enabled:true});}
 const unlocked=new Set<FamilyId>(developed?race==='terran'?['marine','reaper','hellion','tank','medivac','science_vessel']:race==='protoss'?['zealot','adept','stalker','sentry','immortal','phoenix','void_ray']:['zergling','baneling','roach','queen','hydralisk','ravager','mutalisk']: [PRODUCTION_LINES[basic[0]].families[0]]);
 return {race,scene,stage:developed?9:1,wallet:{minerals:scene==='poor'?20:850,gas:scene==='poor'?0:400},facilities,unlocked,completed:new Set<string>(),basic,direction:(scene==='prerequisite'?basic[2]:basic[0]) as ProductionLineId};
}
export function project(id:string,race:Race):CardView{
 const d=DEVELOPMENT.find(d=>d.id===id)!;return {id,race,rarity:'white',name:d.kind==='facility'?'建造'+d.name:d.name,kicker:d.kind==='facility'?'基地建设':'线路科技',flavour:'',stat:d.kind==='facility'?'增加一座生产设施':d.unlock==='family'?'解锁持续生产资格':'本线路共享',detail:'样例项目，基础价格取当前数据。新前置与实际支付将在真实规则独立包验证。',identity:d.unlock==='family'?d.families[0]:undefined,icon:d.kind==='facility'?'building.'+id:'tech.attack',art:d.kind==='facility'?'facility':d.unlock==='family'?'unit':'firepower',minerals:d.minerals,gas:d.gas,label:d.kind==='facility'?'建造':d.unlock==='family'?'解锁':'研究',action:'choose',detailAction:'detail'};
}
export function pending(id:string,name:string,race:Race,copy:string,art='facility'):CardView{return {id,name,race,rarity:'white',kicker:'基地建设',flavour:'',stat:copy,detail:copy+'。本轮只看交互，具体价格与资格将在定案后接入。',icon:'tech.attack',art,label:'费用待定',locked:true,reason:'规则参数待定',action:'choose',detailAction:'detail'};}
export function offers(race:Race,scene:Scene,direction:ProductionLineId,page=0):CardView[]{
 const developed=scene==='developed';let ids:string[]=[];
 if(!developed&&direction==='zerg.air')return [];
 if(!developed&&direction==='starport')return [];
 if(scene==='prerequisite'&&direction==='starport')return [];
 if(scene==='prerequisite'&&direction==='stargate')return [];
 if(race==='terran')ids=direction==='barracks'?['unlock.'+(developed?'marauder':'reaper'),'stim','barracks']:direction==='factory'?developed?['unlock.thor','infernal','factory']:['factory']:developed?['unlock.viking','system.starport','starport']:['starport'];
 if(race==='protoss')ids=direction==='gateway'?[developed?'blink':'unlock.adept','gateway']:direction==='robotics'?developed?['unlock.colossus','system.robotics','robotics']:['robotics']:developed?['unlock.carrier','system.stargate','stargate']:['stargate'];
 if(race==='zerg')ids=direction==='zerg.basic'?['hatchery','unlock.baneling','ling_speed']:direction==='zerg.evolution'?developed?['unlock.ravager','hydra_range']:['hatchery']:developed?['unlock.corruptor']:[];
 let cards=ids.map(id=>project(id,race));
 if(race==='protoss'&&direction==='gateway')cards.push(pending('crystal','建造折跃水晶 ×2',race,'一次两座，用于狂热者／使徒'));
 if(race==='zerg'&&direction!=='zerg.basic')cards.push(pending('evolve-'+direction,direction==='zerg.air'?'开放天空方向':'地面进化',race,direction==='zerg.air'?'目标孵化场开放天空，给出飞龙':'目标孵化场开放地面，给出刺蛇'));
 if(page%2===1&&cards.length>1)cards=[...cards.slice(1),cards[0]];
 return cards.map(c=>({...c,short:c.minerals!==undefined&&scene==='poor'&&(c.minerals>20||(c.gas??0)>0)})).slice(0,3);
}
export const familyName=(f:string)=>SC2_UNITS[f as keyof typeof SC2_UNITS]?.zh??f;
