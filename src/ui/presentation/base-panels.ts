import {productionFacilities,developmentControl} from './facility-controls';
import type {World} from '../../simulation/world';
import {PRODUCTION_LINES,LINE_SKILLS,familyUnlock,lineSystem,lineResearch,type ProductionLineId} from '../../data/expedition-buildings';
import {SC2_UNITS} from '../../data/sc2-units';
import {EXPEDITION_CARD_DEFINITIONS} from '../../simulation/progression/expedition-drafts';
import {teamCardEffects} from '../../simulation/progression/team-cards';
import {RARITIES} from '../../data/rewards';
import {image,button,money,esc,modal} from './reference-primitives';
import {shopProgress} from './shop-progress';
import {purchasedEnhancements} from './purchased-enhancements';
import {familyCardEffect} from './shop-card-copy';
export type BaseTab='facilities'|'production'|'technology';
const lines=(w:World)=>Object.entries(PRODUCTION_LINES).filter(([,d])=>d.race===w.expedition.race) as [ProductionLineId,(typeof PRODUCTION_LINES)[ProductionLineId]][];
const lineIcon=(line:ProductionLineId)=>['barracks','factory','starport'].includes(line)?'building.'+line:'unit.'+PRODUCTION_LINES[line].families[0];
export function lineTechnology(w:World,line:ProductionLineId){const tech=w.expedition.tech;return {
 families:PRODUCTION_LINES[line].families.map(f=>({id:familyUnlock(f),name:SC2_UNITS[f].zh,image:'unit.'+f,unlocked:!!tech[familyUnlock(f)]})),
 skills:(LINE_SKILLS[line]??[]).map(([id,name,f])=>({id,name,image:'unit.'+f,unlocked:!!tech[id]})),system:!!tech[lineSystem(line)]};}
function unlocks(rows:{id:string;name:string;image:string;unlocked:boolean}[]){return `<div class="feedback-unlocks">${rows.map(r=>`<div class="feedback-unlock ${r.unlocked?'unlocked':'locked'}" data-tech="${r.id}" data-unlocked="${r.unlocked}">${image(r.image,r.name)}<span>${esc(r.name)}</span><b>${r.unlocked?'已解锁':'未解锁'}</b></div>`).join('')}</div>`;}
function research(w:World,line:ProductionLineId,kind:'weapon'|'defense'){const n=w.expedition.tech[lineResearch(line,kind)]??0;return `<div>${image(kind==='weapon'?'tech.attack':'tech.armor')}<span>${kind==='weapon'?'武器':'防护'}</span><span class="research-pips" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=n?'lit':''}"></i>`).join('')}</span><b>${n} / 3</b>${developmentControl(w,lineResearch(line,kind))}</div>`;}
export const facilities=productionFacilities;
export function technology(w:World){return `<div class="feedback-facility-list">${lines(w).map(([line,d])=>{const t=lineTechnology(w,line);return `<section class="feedback-tech-card" data-line="${line}"><header>${image(lineIcon(line))}<h2>${d.name}</h2><span class="feedback-system ${t.system?'unlocked':'locked'}">攻防系统 · ${t.system?'已解锁':'未解锁'}</span></header><div class="feedback-research">${research(w,line,'weapon')}${research(w,line,'defense')}</div><h3>兵种</h3>${unlocks(t.families)}<h3>技能科技</h3>${unlocks(t.skills)}</section>`;}).join('')}</div>`;}
export function researchOverview(w:World){return `<section class="feedback-research-summary">${lines(w).map(([line,d])=>`<div class="feedback-research-line" data-line="${line}"><h4>${d.name}</h4><div class="feedback-research">${research(w,line,'weapon')}${research(w,line,'defense')}</div></div>`).join('')}</section>`;}
export function progressStrip(){return `<nav class="feedback-progress-strip" aria-label="整备服务">${button('设施调整','battle-base','small')}${button('武器与防护研究','battle-research','small')}${button('强化一览','battle-progress','small')}${button('休整','ui-page','small','data-page="rest"')}</nav>`;}
export function renderEnhancements(w:World,tab:'summary'|'sources'){
 const journal=shopProgress(w).snapshot(),groups=purchasedEnhancements(journal.entries),team=teamCardEffects(w.expedition),pct=(n:number)=>Number((n*100).toFixed(2))+'%',totals=w.expedition.cardTotals;
 const aggregate=`<section class="feedback-cumulative"><h3>总体加成</h3><div class="feedback-totals"><span>全军伤害 <b>+${pct(team.damage)}</b> · 攻速 <b>+${pct(team.speed)}</b></span><span>全军生命／护盾 <b>+${pct(team.health)}</b> · 护甲 <b>+${Number(team.armor.toFixed(2))}</b></span>${Object.entries(totals).flatMap(([key,v])=>{const [kind,f]=key.split('.');return v&&kind in EXPEDITION_CARD_DEFINITIONS&&f in SC2_UNITS?[`<span>${SC2_UNITS[f as keyof typeof SC2_UNITS].zh} · <b>${familyCardEffect(kind as keyof typeof EXPEDITION_CARD_DEFINITIONS,v)}</b></span>`]:[];}).join('')}</div></section>`;
 const sources=`<section class="feedback-purchased-cards"><h3>已购买强化卡牌 <span>${groups.reduce((n,g)=>n+g.count,0)} 张</span></h3><div class="feedback-source-list">${groups.map(({card:r,count,minerals,gas})=>{const e=r.expeditionEffect;return `<article class="feedback-source-card" data-purchase-id="${esc(r.offerId)}" data-purchase-count="${count}" style="--source-color:${RARITIES[r.rarity].color}">${count>1?`<b class="source-count" aria-label="已购买 ${count} 次">×${count}</b>`:''}${image(r.icon,r.name)}<div><header><h4>${esc(r.name)}</h4><span>${RARITIES[r.rarity].name}</span></header><p>${esc(e.kind==='card'?familyCardEffect(e.effect,e.amount):r.description)}</p><div class="source-paid"><span>花费</span>${money(minerals,gas)}</div></div></article>`;}).join('')||'<p>尚未购买强化卡牌</p>'}${journal.complete?'':'<p>此前购买记录未保存。</p>'}</div></section>`;
 return modal('强化一览','',`<nav class="settings-tabs" aria-label="商店强化内容">${(['summary','sources']as const).map(t=>button(t==='summary'?'总体加成':'已购卡牌','battle-progress-tab','',`data-tab="${t}" aria-pressed="${tab===t}"`)).join('')}</nav>`+(tab==='summary'?aggregate:sources),'production-modal feedback-progress-modal',button('返回','battle-panel-close','primary'),'battle-panel-close');
}
