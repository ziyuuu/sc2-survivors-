import type {World} from '../../simulation/world';
import type {ExpeditionReward} from '../../simulation/progression/expedition-drafts';
import {DEVELOPMENT,PRODUCTION_LINES,HEAVY_FAMILIES,familyUnlock,type ProductionLineId} from '../../data/expedition-buildings';
import {SC2_UNITS} from '../../data/sc2-units';
import {button,image,money,esc} from './reference-primitives';
import {paintedArt} from './painted-art';

/** Only an existing native offer can be bought here. Opening this view never draws offers. */
export function developmentControl(w:World,id:string){
 const d=DEVELOPMENT.find(d=>d.id===id);if(!d)return '';
 const offer=w.rewardRound==='building'?w.rewards.find(r=>{const e=(r as ExpeditionReward).expeditionEffect;return e?.kind==='development'&&e.definitionId===id;}):undefined;
 if(offer&&!offer.sold)return `<div class="facility-purchase">${money(offer.minerals,offer.gas)}${button(d.unlock==='family'?'解锁':'研究','reward','small',`data-id="${esc(offer.offerId)}" ${w.canChooseReward(offer)?'':'disabled'}`)}${w.wallet.minerals<offer.minerals||w.wallet.gas<offer.gas?'<span>资源不足</span>':''}</div>`;
 if((w.expedition.tech[id]??0)>=d.maxLevel)return '<span class="facility-state">已完成</span>';
 const missing=d.requires.filter(key=>!w.expedition.tech[key]).map(key=>DEVELOPMENT.find(x=>x.id===key)?.name??key);
 if(d.line&&d.kind!=='facility'&&!w.expedition.facilities.some(f=>f.line===d.line))missing.unshift(PRODUCTION_LINES[d.line].name);
 return `<span class="facility-state">${missing.length?'需要 '+esc(missing.join('、')):'建设阶段获取'}</span>`;
}

export function productionFacilities(w:World){
 const s=w.expedition,editable=w.phase==='reward'||w.phase==='menu';
 return `<div class="feedback-facility-list">${Object.entries(PRODUCTION_LINES).filter(([,d])=>d.race===s.race).map(([key,d])=>{
  const line=key as ProductionLineId,p=s.production[line],fs=s.facilities.filter(f=>f.line===line),on=p?.outputs.some(f=>p.enabled[f]);
  return `<section class="feedback-facility-card" data-line="${line}"><header>${image(['barracks','factory','starport'].includes(line)?'building.'+line:'unit.'+d.families[0])}<h2>${d.name}</h2><strong class="feedback-facility-count"><b>${fs.length}</b> 座</strong>${button(on?'训练开启':'训练暂停','production-line-enable','small',`data-line="${line}" aria-pressed="${!!on}" ${p?.outputs.length?'':'disabled'}`)}</header><div class="facility-unit-list">${d.families.map(f=>{
   const unlocked=!!s.tech[familyUnlock(f)],available=w.isFamilyAvailable(f),selected=!!p?.outputs.includes(f),jobs=s.ledger.filter(j=>j.family===f&&j.state!=='settled');
   const status=unlocked?(available?'已解锁':HEAVY_FAMILIES.includes(f)?'第 10 关开放训练':'训练未开放'):'未解锁';
   const controls=available?button(selected?'已选输出':'选择生产','production-output','small',`data-line="${line}" data-family="${f}" aria-pressed="${selected}" ${!editable||!p||!selected&&p.outputs.length>=2?'disabled':''}`)+(selected?button(p!.enabled[f]?'暂停训练':'开启训练','production-enable','small',`data-family="${f}" aria-pressed="${!!p!.enabled[f]}"`):''):unlocked?'':developmentControl(w,familyUnlock(f));
   return `<article class="facility-unit" data-family="${f}" data-unlocked="${unlocked}"><div class="facility-unit-heading"><div class="facility-unit-art">${paintedArt(f,SC2_UNITS[f].zh,f==='zergling'?2:1,'facility')}</div><div><h3>${SC2_UNITS[f].zh}</h3><span>${status}</span></div></div><div class="facility-unit-actions">${controls}</div><div class="facility-training">${jobs.map(j=>`${j.state==='training'?'训练中 · '+Math.ceil(j.remaining)+' 秒':j.state==='awaiting'?'等待空投':'已出发'} ×${j.passengers.filter(p=>p.status==='waiting').length}`).join(' / ')|| (selected&&p!.enabled[f]?'等待下一批训练':'')}</div></article>`;
  }).join('')}</div></section>`;
 }).join('')}</div>`;
}
