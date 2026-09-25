import type {Race} from '../../data/races';
import {RACE_NAMES} from '../../data/races';
import {assetUrl} from '../../assets/manifest';
import {MVP_TALENTS,TALENT_BY_ID,TALENT_LINES,nextTalentPurchase,allocationPoints,allocationCost,type TalentDefinition,type TalentLine,type TalentLevels} from '../../data/mvp-talents';
import type {PermanentProfile} from '../../simulation/progression/permanent-profile';
import './mvp-talent-panel.css';

const esc=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const ids=(values:string)=>values.split(' ');
/** Original SC icons already shipped with the game. Each node keeps its icon before purchase. */
const ICONS:Record<Race,Record<TalentLine,readonly string[]>>={
 terran:{
  resources:ids('ui.minerals ui.gas building.barracks building.factory building.starport unit.marine tech.attack tech.armor unit.marauder unit.science_vessel tech.heal tech.vehicle unit.medivac tech.shield tech.siege hero.swann'),
  soldiers:ids('unit.marine unit.marauder unit.reaper unit.hellion unit.tank unit.thor unit.viking unit.banshee unit.medivac unit.science_vessel tech.attack tech.armor tech.stim tech.shield tech.infernal hero.raynor'),
  army:ids('unit.marine unit.marauder unit.reaper unit.tank unit.viking unit.medivac hero.raynor hero.tychus hero.nova hero.swann hero.tosh unit.thor unit.banshee tech.boost tech.siege hero.yamato_battlecruiser'),
  micro:ids('tech.boost tech.attack tech.siege unit.viking tech.stim unit.reaper hero.nova')
 },
 zerg:{
  resources:ids('ui.minerals ui.gas unit.zergling unit.roach unit.queen unit.hydralisk unit.ravager unit.baneling unit.mutalisk unit.corruptor unit.ultralisk tech.bile unit.lurker hero.zagara hero.stukov hero.hots_leviathan'),
  soldiers:ids('unit.zergling unit.baneling unit.roach unit.queen unit.ravager unit.hydralisk unit.lurker unit.ultralisk unit.mutalisk unit.corruptor tech.attack tech.armor tech.bile hero.dehaka hero.kerrigan hero.hots_leviathan'),
  army:ids('unit.zergling unit.roach unit.queen unit.ravager unit.hydralisk unit.mutalisk hero.kerrigan hero.zagara hero.dehaka hero.stukov hero.niadra unit.lurker unit.corruptor unit.ultralisk tech.bile hero.hots_leviathan'),
  micro:ids('unit.zergling tech.boost unit.ravager unit.mutalisk unit.lurker tech.bile hero.kerrigan')
 },
 protoss:{
  resources:ids('ui.minerals ui.gas unit.zealot unit.adept unit.stalker unit.sentry unit.immortal unit.colossus unit.high_templar unit.phoenix unit.void_ray unit.carrier tech.attack tech.armor hero.artanis hero.purifier_flagship'),
  soldiers:ids('unit.zealot unit.adept unit.stalker unit.sentry unit.high_templar unit.immortal unit.colossus unit.phoenix unit.void_ray unit.carrier tech.attack tech.armor hero.zeratul hero.fenix hero.alarak hero.purifier_flagship'),
  army:ids('unit.zealot unit.stalker unit.sentry unit.immortal unit.colossus unit.carrier hero.artanis hero.zeratul hero.alarak hero.fenix hero.vorazun unit.phoenix unit.void_ray unit.high_templar tech.shield hero.purifier_flagship'),
  micro:ids('unit.stalker tech.boost unit.zealot unit.phoenix unit.immortal unit.high_templar hero.zeratul')
 }
};
export const talentIconId=(node:TalentDefinition)=>ICONS[node.race][node.line][Number(node.id.slice(-2))-1];
const numberOf=(node:TalentDefinition)=>Number(node.id.slice(-2));
const position=(node:TalentDefinition)=>{
 const n=numberOf(node);
 if(node.line==='micro')return {row:n,col:2};
 if(n===1)return {row:1,col:2};
 if(n<=4)return {row:2,col:n-1};
 if(n<=7)return {row:3,col:n-4};
 if(n<=10)return {row:4,col:n-7};
 if(n<=13)return {row:5,col:n-10};
 if(n<=15)return {row:6,col:n===14?1:3};
 return {row:7,col:2};
};
const commonEdges:readonly [number,number][]=[[1,2],[1,3],[1,4],[2,5],[3,6],[4,7],[5,8],[6,9],[7,10],[8,11],[9,12],[10,13]];
const EDGE_TAILS:Record<TalentLine,readonly [number,number][]>={
 resources:[[11,14],[12,14],[12,15],[13,15],[14,16],[15,16]],
 soldiers:[[11,14],[12,14],[12,15],[13,15],[14,16],[15,16]],
 army:[[10,14],[11,15],[13,15],[14,16],[15,16]],
 micro:[[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
};
function renderLinks(nodes:TalentDefinition[],levels:TalentLevels,line:TalentLine){
 const byNumber=new Map(nodes.map(node=>[numberOf(node),node]));
 const edges=line==='micro'?EDGE_TAILS.micro:[...commonEdges,...EDGE_TAILS[line]];
 return `<svg class="mvp-talent-links" viewBox="0 0 300 616" preserveAspectRatio="none" aria-hidden="true">${edges.map(([from,to])=>{
  const parent=byNumber.get(from)!,child=byNumber.get(to)!;
  const a=position(parent),b=position(child),active=(levels[parent.id]??0)===parent.maxRank;
  return `<path class="${active?'ready':''}${line==='army'&&to===16?' tier-gate':''}" d="M ${(a.col-.5)*100} ${(a.row-.5)*88} L ${(b.col-.5)*100} ${(b.row-.5)*88}"/>`;
 }).join('')}</svg>`;
}
function renderNode(node:TalentDefinition,levels:TalentLevels,balance:number,selectedId:string){
 const rank=levels[node.id]??0,reason=nextTalentPurchase(node.race,levels,node.id,balance);
 const complete=rank===node.maxRank,available=!reason,selected=selectedId===node.id;
 const iconId=talentIconId(node),src=assetUrl(iconId);
 const {row,col}=position(node);
 const state=complete?'complete':rank?'invested':available?'available':'locked';
 const text=`${node.name}，${rank}/${node.maxRank}级。${node.description}。${reason??`下一级花${node.resourceCost}资源`}`;
 return `<div class="mvp-talent-slot" style="grid-row:${row};grid-column:${col}"><button class="mvp-talent-node ${state}${selected?' selected':''}" data-action="mvp-talent-select" data-id="${node.id}" aria-pressed="${selected}" aria-label="${esc(text)}" title="${esc(text)}"><span class="mvp-talent-icon">${src?`<img src="${src}" alt="" aria-hidden="true" draggable="false">`:'<span aria-hidden="true">✦</span>'}<b>${rank}/${node.maxRank}</b></span><span class="mvp-talent-name">${esc(node.name)}</span></button></div>`;
}
function renderLine(race:Race,line:TalentLine,levels:TalentLevels,balance:number,selectedId:string){
 const nodes=MVP_TALENTS.filter(node=>node.race===race&&node.line===line);
 const points=nodes.reduce((sum,node)=>sum+(levels[node.id]??0),0);
 const name=TALENT_LINES.find(item=>item.id===line)!.name;
 return `<section class="mvp-talent-line" aria-label="${name}天赋树"><header><h3>${name}</h3><span>${points} / ${line==='micro'?17:41}</span></header><div class="mvp-talent-grid">${renderLinks(nodes,levels,line)}${nodes.map(node=>renderNode(node,levels,balance,selectedId)).join('')}</div><button class="mvp-line-respec" data-action="mvp-talent-respec" data-line="${line}" ${points?'':'disabled'}>重置${name}</button></section>`;
}
export function renderMvpTalentPanel(profile:PermanentProfile,selectedTalentId?:string|null):string {
 const race=profile.activeRace,levels=profile.levels,balance=profile.balance;
 const selected=TALENT_BY_ID.get(selectedTalentId??'');
 const node=selected?.race===race?selected:MVP_TALENTS.find(item=>item.race===race&&item.line==='resources')!;
 const rank=levels[node.id]??0,reason=nextTalentPurchase(race,levels,node.id,balance);
 return `<div class="mvp-talents" role="region" aria-label="三族独立天赋树">
 <div class="mvp-talent-top"><div><span class="eyebrow">PERMANENT TALENTS / MVP 1.0</span><h2>${RACE_NAMES[race]} · 天赋树</h2></div><button data-action="talents-back">返回</button></div>
 <div class="mvp-talent-summary" aria-live="polite"><strong>${RACE_NAMES[race]}等级 ${profile.playerLevel} / 80</strong><span>本族永久资源 ${balance}</span><span>本族已投资 ${profile.spent}</span></div>
 <div class="mvp-talent-races" role="group" aria-label="选择种族">${(['terran','zerg','protoss'] as const).map(item=>`<button data-action="mvp-talent-race" data-race="${item}" aria-pressed="${race===item}"><b>${RACE_NAMES[item]}</b><small>${profile.levelFor(item)}级 · ${profile.raceBalance(item)}资源</small></button>`).join('')}</div>
 <div class="mvp-talent-presets" role="group" aria-label="${RACE_NAMES[race]}天赋预设">${([0,1,2] as const).map(slot=>{const preset=profile.getPreset(race,slot)!,points=allocationPoints(preset.levels),price=allocationCost(preset.levels),affordable=balance+profile.spent>=price;return `<button data-action="mvp-talent-preset" data-slot="${slot}" aria-pressed="${profile.activePreset===slot}" ${affordable?'':'disabled'}><b>${esc(preset.name)}</b><small>${points}点 · ${price}资源${affordable?'':' · 资源不足'}</small></button>`;}).join('')}</div>
 <div class="mvp-talent-actions"><button data-action="mvp-talent-copy" data-slot="${(profile.activePreset+1)%3}">复制到下一预设</button><button data-action="mvp-talent-respec" data-line="all" ${profile.spent?'':'disabled'}>重置本族全部 · 退${profile.spent}资源</button><span>每级占1点；三族等级与资源互不占用。</span></div>
 <div class="mvp-talent-inspector" aria-live="polite"><div class="mvp-inspector-heading"><span class="mvp-inspector-icon">${assetUrl(talentIconId(node))?`<img src="${assetUrl(talentIconId(node))}" alt="" aria-hidden="true">`:'✦'}</span><div><strong>${esc(node.name)}</strong><small>${TALENT_LINES.find(line=>line.id===node.line)!.name} · 第${node.tier}层 · ${rank}/${node.maxRank}级</small></div></div><p>${esc(node.description)}</p><div class="mvp-inspector-action"><span>${esc(reason??`下一级花 ${node.resourceCost} 资源`)}<br><small>前置：${esc(node.prerequisiteText)}</small></span><button data-action="mvp-talent-buy" data-id="${node.id}" ${reason?'disabled':''}>投入一级</button></div></div>
 <div class="mvp-talent-lines">${TALENT_LINES.map(line=>renderLine(race,line.id,levels,balance,node.id)).join('')}</div></div>`;
}
