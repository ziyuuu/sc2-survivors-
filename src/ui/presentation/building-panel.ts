import type {FamilyId} from '../../data/races';
import {DEVELOPMENT,PRODUCTION_LINES,type ProductionLineId} from '../../data/expedition-buildings';
import {SC2_UNITS} from '../../data/sc2-units';
import {canProduce,canUnlock,eligible,hasGround,ownsLine,project,TREE_STEPS,type BuildingState,type PlacementDraft} from '../../simulation/building/rules';
import {presentation,facilityViews,type FacilityView} from './building-view';
import {lineTechnology,facilityIcon,itemHeading} from './building-technology';
import {button,image,glyph,modal,esc} from './reference-primitives';

export const BUILDING_TABS=['placement','research','tree'] as const;
export type BuildingTab=typeof BUILDING_TABS[number];
export interface BuildingPanelActions {close:string;apply:string;output:string;enable:string;tabAction?:(tab:BuildingTab)=>string;tabAttribute?:(tab:BuildingTab)=>string}
const defaultActions:BuildingPanelActions={close:'close',apply:'apply',output:'output',enable:'enable'};
const name=(f:FamilyId)=>SC2_UNITS[f].zh;
const heading=(name:string,status:string)=>itemHeading(name,`<span class="wb-node-state">${esc(status)}</span>`);
function technology(s:BuildingState,line:ProductionLineId){
 const view=presentation(s);return lineTechnology(line,{race:s.race,stage:s.stage,unlocked:view.unlocked,completed:view.completed,hasFacility:l=>ownsLine(s,l),canResearch:id=>{const d=project(id);return !!d&&eligible(s,d);}});
}
function output(s:BuildingState,f:FacilityView,unit:FamilyId,actions:BuildingPanelActions){
 const g=s.groups.find(g=>g.id===f.id)!,on=f.outputs.includes(unit),ready=canProduce(s,g,unit),max=!on&&f.outputs.length>=2,editable=s.phase!=='front';
 const reason=!editable?'关间才能调整兵种':!ready?s.tech['unlock.'+unit]?'第10关开放训练':'尚未解锁':max?'最多两种，先取消一项':'选择生产输出';
 return button(image('unit.'+unit)+esc(name(unit))+(on?' ✓':''),actions.output,'small',`data-facility="${f.id}" data-family="${unit}" aria-pressed="${on}" ${!ready||max||!editable?'disabled':''} title="${reason}"`);
}
export function renderBuildingPlacement(s:BuildingState,draft?:PlacementDraft,actions=defaultActions){
 const rows=facilityViews(s).map(f=>{const d=draft?.groups.find(g=>g.id===f.id);return d?{...f,outputs:[...d.outputs],enabled:d.enabled}:f;});
 return `<div class="feedback-facility-list">${rows.map(f=>`<section class="feedback-facility-card wb-facility" data-facility="${f.id}" data-line="${f.line}"><header>${image('unit.'+f.families[0])}<h2>${esc(f.name)}</h2><span class="wb-direction-label">${f.directions.join(' / ')}${f.count&&f.id!=='crystal-pair'?(f.directions.length?' · ':'')+f.count+'座':''}</span></header><div class="facility-unit-list wb-output-list">${f.families.map(unit=>output(s,f,unit,actions)).join('')}</div><div class="wb-production-order">${button(f.enabled?'训练开启':'训练暂停',actions.enable,'small',`data-facility="${f.id}" aria-pressed="${f.enabled}"`)}</div></section>`).join('')}</div>`;
}
export function renderBuildingTechnology(s:BuildingState){return `<div class="feedback-facility-list">${presentation(s).basic.map(line=>`<section class="feedback-tech-card wb-tech-line"><header><h2>${PRODUCTION_LINES[line].name}</h2></header>${technology(s,line)}</section>`).join('')}</div>`;}
function prerequisites(s:BuildingState,line:ProductionLineId){
 const chains:Partial<Record<ProductionLineId,ProductionLineId[]>>={factory:['barracks','factory'],starport:['barracks','factory','starport'],robotics:['gateway','robotics'],stargate:['gateway','stargate']},chain=chains[line];
 if(chain)return `<ol class="wb-tree-steps wb-building-steps" aria-label="建筑路线">${chain.map(id=>`<li><div class="wb-tree-node"><span class="wb-tree-art wb-ui-icon">${facilityIcon(id,s.race,PRODUCTION_LINES[id].name)}</span>${heading(PRODUCTION_LINES[id].name,ownsLine(s,id)?'已有设施':'未建造')}</div></li>`).join('')}</ol>`;
 if(line==='zerg.air')return `<div class="wb-tree-node wb-tree-requirement" title="至少一座孵化场完成地面进化后开放天空"><span class="wb-tree-art wb-ui-icon">${facilityIcon('hatchery',s.race,'地面进化')}</span>${heading('地面进化',hasGround(s)?'已完成':'未完成')}</div>`;
 return '';
}
export function renderBuildingTree(s:BuildingState){
 const view=presentation(s);
 return `<div class="wb-tree">${view.basic.map(line=>{
  const d=PRODUCTION_LINES[line],crystal=s.race==='protoss'&&line==='gateway'?`<div class="wb-tree-node wb-tree-crystal" title="300矿一对，最多两对，共享狂热者／使徒双输出"><span class="wb-tree-art wb-ui-icon">${facilityIcon('crystal',s.race,'折跃水晶')}</span>${heading('折跃水晶 ×2',s.groups.some(g=>g.kind==='crystal')?'已有设施':'未建造')}</div>`:'';
  return `<section class="wb-tree-line"><header><h2>${d.name}</h2><span>${ownsLine(s,line)?'已有设施':'尚无设施'}</span></header>${prerequisites(s,line)}<ol class="wb-tree-steps">${TREE_STEPS[line].map(group=>`<li><div class="wb-tree-branch">${group.map(f=>`<div class="wb-tree-node ${view.unlocked.has(f)?'unlocked':canUnlock(s,f)?'next':''}" ${f==='high_templar'?'title="追猎者或哨兵任一解锁"':''}><span class="wb-tree-art wb-ui-icon">${image('unit.'+f,name(f))}</span>${heading(name(f),view.unlocked.has(f)?'已解锁':canUnlock(s,f)?'下一层':'未解锁')}</div>`).join('')}</div></li>`).join('')}</ol>${crystal}${technology(s,line)}</section>`;
 }).join('')}</div>`;
}
export function renderBuildingPanel(s:BuildingState,tab:BuildingTab='placement',draft?:PlacementDraft,actions=defaultActions,extraPlacement=''){
 const tabs=`<nav class="settings-tabs wb-base-tabs" role="tablist" aria-label="设施调整">${BUILDING_TABS.map((t,i)=>button(['布置','科技','构建树'][i],actions.tabAction?.(t)??t,'small',`id="facility-tab-${t}" role="tab" aria-selected="${tab===t}" aria-pressed="${tab===t}" aria-controls="facility-panel" tabindex="${tab===t?0:-1}" ${actions.tabAttribute?.(t)??''}`)).join('')}</nav>`;
 const content=`<div id="facility-panel" role="tabpanel" aria-labelledby="facility-tab-${tab}" tabindex="0">${tab==='placement'?renderBuildingPlacement(s,draft,actions)+extraPlacement:tab==='research'?renderBuildingTechnology(s):renderBuildingTree(s)}</div>`;
 return modal('设施调整','',content,'production-modal feedback-base-modal',button('取消',actions.close,'secondary')+button('应用布置',actions.apply,'primary'),'building-panel-cancel').replace('data-action="building-panel-cancel"',`data-action="${actions.close}"`).replace('<div class="modal-content"',tabs+'<div class="modal-content"');
}
/** Required facilities are displayed as icon hints; never as cross-line purchase cards. */
export function renderBuildingPrerequisite(s:BuildingState,line=s.direction,action='development-direction'){
 const base=DEVELOPMENT.find(d=>d.kind==='facility'&&d.line===line),missing=base?.requires.find(id=>!(s.tech[id]>0)),required=DEVELOPMENT.find(d=>d.kind==='facility'&&d.id===missing),ground=s.race==='zerg'&&line==='zerg.air'&&!hasGround(s),blocked=!!required||ground;
 const label=ground?'地面进化':required?.name??'暂无可选项目',target=ground?'zerg.evolution':required?.line;
 return `<section class="im-empty wb-prerequisite" aria-label="${blocked?'前置要求':'当前方向状态'}"><div class="wb-prerequisite-card"><span class="wb-prerequisite-heading">${blocked?'所需前置':'当前方向'}</span><div class="wb-prerequisite-art wb-ui-icon">${facilityIcon(ground?'hatchery':required?.id??base?.id??'hatchery',s.race,label)}${ground?`<span class="wb-prerequisite-mark">${glyph('gear')}</span>`:''}</div><h2>${esc(label)}</h2><div class="wb-prerequisite-state">${glyph('hex')}<span>${ground?'至少一座孵化场完成':required?'尚未建造':'选择其他方向或前往补给'}</span></div>${target?button('前往'+(ground?'地面进化':required!.name),action,'secondary',`data-line="${target}"`):''}</div></section>`;
}
