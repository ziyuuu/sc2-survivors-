import type {World} from '../../simulation/world';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES,type HeroId} from '../../data/heroes';
import {SC2_UNITS} from '../../data/sc2-units';
import {icon} from '../../assets/manifest';
import {unitCallsign} from '../unit-identity';
export function renderBossLoot(w:World,ready:(model:string)=>boolean){
 const entry=w.expedition.bossLootQueue[0];if(!entry)return '';const r=entry.reward,effect=r.expeditionEffect,attrs=`data-receipt="${entry.receipt}"`;let cards='',missing=false;
 if(effect.kind==='elite'){
  const variants=Object.values(ELITES).filter(e=>e.family===effect.family);missing=variants.some(e=>!ready(e.model));
  const elite=entry.variant?ELITES[entry.variant]:null;
  if(elite){const needsTarget=!w.eliteOwned(elite.id)&&w.familyUnits(elite.family).length>=w.rosterCap;
   cards=needsTarget?w.eliteCandidates(elite.id).map(u=>`<button class="reward-card rarity-purple" data-action="boss-loot-claim" ${attrs} data-variant="${elite.id}" data-target="${u.id}" ${ready(elite.model)?'':'disabled'}>${icon('unit.'+u.unitType)}<h3>${unitCallsign(u)}</h3><p>Rank ${u.rank} · HP ${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)}</p><strong>免费替换为 ${elite.name}</strong></button>`).join(''):`<button class="reward-card rarity-purple" data-action="boss-loot-claim" ${attrs} data-variant="${elite.id}" ${ready(elite.model)?'':'disabled'}>${icon(elite.icon)}<h3>${elite.name}</h3><p>${elite.description}</p><strong>免费领取</strong></button>`;
   cards+=`<button class="refresh" data-action="boss-loot-variant-back" ${attrs}>返回型号选择</button>`;
  }else cards=variants.map(elite=>`<button class="reward-card rarity-purple" data-action="boss-loot-variant" ${attrs} data-variant="${elite.id}" ${ready(elite.model)&&w.canAcquireElite(elite.id)?'':'disabled'}>${icon(elite.icon)}<h3>${elite.name}</h3><p>${elite.description}</p><strong>${w.eliteOwned(elite.id)?.rank===5?'已满级':w.eliteOwned(elite.id)?'升级此型号 · 免费':'招募此型号 · 免费'}</strong></button>`).join('');
 }else {const model=effect.kind==='hero'?HEROES[effect.heroId as HeroId].model:null;missing=!!model&&!ready(model);cards=`<button class="reward-card rarity-${r.rarity}" data-action="boss-loot-claim" ${attrs} ${missing?'disabled':''}>${icon(r.icon)}<h3>${r.name}</h3><p>${r.description}</p><strong>免费领取</strong></button>`;}
 return `<div class="reward-screen boss-loot-screen"><span class="eyebrow">${r.mapSource?'战场补给':'首领奖励'} · ${w.expedition.bossLootQueue.length} 件待领取</span><h2>${r.mapSource?'战场补给':'首领奖励'}${effect.kind==='elite'?' · '+SC2_UNITS[effect.family].zh:''}</h2><p>免费领取，稍后也可领取。</p>${missing?'<p role="status">请先准备增援素材。</p><button class="refresh" data-action="elite-assets-retry">准备增援素材</button>':''}<div id="reward-cards">${cards||'<p>当前没有可接收这件奖励的单位，奖励继续保留。</p>'}</div><button class="refresh" data-action="boss-loot-close">稍后领取 · 保留奖励</button></div>`;
}

