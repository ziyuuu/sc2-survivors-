import {PRODUCTION_LINES, type ProductionLineId} from '../../data/expedition-buildings';
import {SC2_UNITS} from '../../data/sc2-units';
import type {FamilyId} from '../../data/races';
import type {CardView} from './reference-card';
export interface FacilityView {id:string;name:string;line:ProductionLineId;directions:string[];families:FamilyId[];outputs:FamilyId[];enabled:boolean;count:number}
import {getOffers, groupFamilies, project, TREE_STEPS, type BuildingState, type Offer} from '../../simulation/building/rules';

export function facilityViews(s:BuildingState):FacilityView[] {
 return s.groups.map(g=>({id:g.id,name:g.kind==='hatchery'?'孵化场 '+g.ids[0]:g.kind==='crystal'?'折跃水晶 ×'+g.ids.length:PRODUCTION_LINES[g.line].name,line:g.line,directions:g.kind==='hatchery'?g.directions.length?g.directions.map(d=>d==='ground'?'地面':'天空'):['基础']:[],families:groupFamilies(g),outputs:[...g.outputs],enabled:g.enabled,count:g.ids.length}));
}
export function presentation(s:BuildingState) {
 const completed=new Set<string>();for(const [id,level] of Object.entries(s.tech))if(level>0){if(id.startsWith('research.'))for(let i=1;i<=level;i++)completed.add(id+'.'+i);else completed.add(id);}
 return {race:s.race,stage:s.stage,wallet:s.wallet,direction:s.direction,basic:Object.keys(TREE_STEPS).filter(l=>PRODUCTION_LINES[l as ProductionLineId].race===s.race) as ProductionLineId[],facilities:facilityViews(s),unlocked:new Set(Object.keys(s.tech).filter(id=>id.startsWith('unlock.')&&s.tech[id]>0).map(id=>id.slice(7) as FamilyId)),completed};
}
export function card(s:BuildingState,q:Offer):CardView {
 const d=project(q.projectId)!,facility=d.kind==='facility',evolution=d.kind==='evolution';
 return {id:q.projectId,race:s.race,rarity:'white',name:(facility?'建造':'')+d.name+(d.kind==='research'?' '+(q.level+1)+'级':''),kicker:facility?'基地建设':evolution?'孵化场进化':'线路科技',flavour:'',stat:facility?d.batch?'增加两座生产设施':'增加一座生产设施':evolution?'开放所选孵化场方向':d.unlock==='family'?'解锁持续生产资格':'本线路共享',detail:facility?d.batch?'每次建造一对，两座共同轮流生产狂热者／使徒。':'增加本线路生产设施。':evolution?'仅开放所选孵化场方向，保留其已有方向。兵种解锁全局共享，不赠送士兵。':d.unlock==='family'?'解锁'+SC2_UNITS[d.families[0]].zh+'的持续生产资格。':'研究作用于本线路，实际效果沿用原游戏规则。',identity:d.unlock==='family'?d.families[0]:undefined,icon:facility?'building.'+d.id:'tech.attack',art:facility||evolution?'facility':d.unlock==='family'?'unit':'firepower',minerals:q.cost.minerals,gas:q.cost.gas,baseMinerals:q.baseCost.minerals,baseGas:q.baseCost.gas,discount:q.discount,label:facility?'建造':evolution?'进化':d.unlock==='family'?'解锁':'研究',short:s.wallet.minerals<q.cost.minerals||s.wallet.gas<q.cost.gas,action:'choose',detailAction:'detail'};
}
export function offerCards(s:BuildingState){return getOffers(s).map(q=>card(s,q));}
