import type {World} from '../../simulation/world';
import {buildingViewState} from '../../simulation/building/expedition';
import {evolutionTargets,hasGround,project} from '../../simulation/building/rules';
import {SC2_UNITS} from '../../data/sc2-units';
import {button,esc,modal,money} from './reference-primitives';

export function renderHatcheryEvolution(w:World,selectedId:number){
 const s=buildingViewState(w),groups=s?.groups.filter(g=>g.kind==='hatchery')??[];
 if(!s||!groups.length)return '';
 const selected=groups.find(g=>g.ids.includes(selectedId))??groups[0];
 const status=(g:typeof selected)=>`地面${g.directions.includes('ground')?' ✓':'未进化'} · 天空${g.directions.includes('air')?' ✓':'未进化'}`;
 const options=groups.map(g=>`<option value="${g.ids[0]}" ${g===selected?'selected':''}>孵化场 ${g.ids[0]} · ${status(g)}</option>`).join('');
 const choices=([['ground','地面','evolve-zerg.evolution'],['air','天空','evolve-zerg.air']] as const).map(([direction,label,id])=>{
  const done=selected.directions.includes(direction),d=project(id)!,offer=Object.values(w.expedition.developmentQuotes).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===id&&r.expeditionWindow===w.draftWindowId);
  const prerequisite=direction==='ground'&&!s.tech['unlock.roach']&&!s.tech['unlock.queen']?'需要解锁蟑螂或虫后':direction==='air'&&!hasGround(s)?'需要至少一座地面进化':'';
  const legal=evolutionTargets(s,id).includes(selected),building=w.phase==='reward'&&w.rewardRound==='building'&&!s.bought;
  const reason=done?'已完成':prerequisite||(!building?'建设阶段可进化':!legal||!offer?'当前不可进化':!w.canChooseReward(offer)?'资源不足':'');
  return `<section class="hatchery-direction" data-evolution="${direction}"><h3>${label}进化${done?' ✓':''}</h3><div class="hatchery-evolution-price">${!done&&offer?money(offer.minerals,offer.gas):''}</div>${reason?`<p class="hatchery-evolution-state">${esc(reason)}</p>`:`<p>解锁${SC2_UNITS[d.families[0]].zh}</p>`}${button(done?'已完成':label+'进化','development-purchase','primary',`data-id="${esc(offer?.offerId??'')}" data-facility="${selected.ids[0]}" data-window="${esc(w.draftWindowKey)}" data-revision="${w.expedition.shopRevision}" ${reason?'disabled':''}`)}</section>`;
 }).join('');
 const output=selected.outputs.map(f=>SC2_UNITS[f].zh).join(' / ')||'未安排';
 return modal('孵化场进化','',`<label class="wb-target-label">孵化场<select data-evolution-facility aria-label="选择孵化场">${options}</select></label><p class="hatchery-output">${selected.enabled?'生产':'暂停'}：${esc(output)}</p><div class="hatchery-directions">${choices}</div>`,'hatchery-evolution-modal',button('返回','ui-back','secondary'));
}
