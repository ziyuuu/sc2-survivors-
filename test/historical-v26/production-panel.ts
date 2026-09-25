import {BUILDINGS,type BuildingType} from '../../data/game';
import {SC2_UNITS} from '../../data/sc2-units';
import {icon} from '../../assets/manifest';
import type {World} from '../../simulation/world';

const GROUPS:BuildingType[]=['barracks','factory','starport'];
/** One intermission panel; gameplay and eligibility remain owned by World. */
export function renderProductionPanel(world:World){
 return `<section class="production-choice" aria-label="本轮生产"><div class="production-choice-heading"><h3>本轮生产</h3><p>每类建筑最多两种单位交替；修改仅影响未付款的下一批。</p></div><div class="production-choice-groups">${GROUPS.map(group=>{
  const buildings=world.buildingsOf(group),available=world.availableProductionTypes(group),selected=available.filter(type=>world.productionChoices[group].includes(type)),next=buildings[0]?world.productionIntent(buildings[0]):undefined;
  return `<div class="production-choice-group"><div class="production-group-title"><b>${BUILDINGS[group].name}</b><small>${buildings.length?`${selected.length} / 2 已选 · 下一批 ${next?SC2_UNITS[next].zh:'等待资源或空位'}`:'尚未建设'}</small></div><div class="production-option-row">${available.map(type=>{
   const active=selected.includes(type),disabled=active&&selected.length===1||!active&&selected.length===2;
   return `<button type="button" class="production-option ${active?'selected':''}" data-action="production-toggle" data-group="${group}" data-id="${type}" aria-pressed="${active}" ${disabled?'disabled':''}>${icon('unit.'+type,SC2_UNITS[type].zh)}<span>${SC2_UNITS[type].zh}<small>${active?'本轮交替':'加入轮换'}</small></span></button>`;
  }).join('')||'<span class="production-unavailable">暂无可生产配方</span>'}</div></div>`;
 }).join('')}</div></section>`;
}
