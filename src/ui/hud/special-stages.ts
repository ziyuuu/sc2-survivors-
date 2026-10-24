import type {World} from '../../simulation/world';
import {SPECIAL_STAGE_NAMES} from '../../simulation/special-stages/state';
import {equipmentTemplate} from '../../simulation/starship/catalog';
import {itemsAt,BACKPACK_CAPACITY} from '../../simulation/starship/inventory';
import {button,esc,modal} from '../presentation/reference-primitives';
export function specialOverlay(w:World){
 const a=w.specialStages.active;if(!a)return '';
 if(a.phase==='loading')return modal(SPECIAL_STAGE_NAMES[a.kind],'场景准备中','<p>正在准备战场…</p>','special-dialog','',null);
 if(a.phase!=='loot')return '';
 const ground=Object.entries(w.starship.account.locations).filter(([,l])=>l.kind==='ground'),count=itemsAt(w.starship.account,'backpack').length;
 const body=`<p>${a.kind==='crossing'?'全体存活成员已撤离。请领取3件动力装备后返回。':'竞技场敌人已全部消灭。领取战利品后返回前线。'}</p><p>背包 ${count} / ${BACKPACK_CAPACITY} · 待领取装备 ${ground.length} 件${w.rewardDrops.length?' · 待领取卡牌 '+w.rewardDrops.length+' 张':''}</p><ul class="special-loot">${ground.map(([id])=>{const item=w.starship.account.items[id],t=equipmentTemplate(item.template);return `<li data-quality="${item.quality}">${esc(t.name)} <small>${item.slot==='defense3'?'动力一':item.slot==='defense4'?'动力二':t.kind==='module'?'模块':'战利品'}</small></li>`;}).join('')||'<li>装备已领取</li>'}</ul><p class="special-loot-notice">${esc(w.notice)}</p>`;
 return modal(SPECIAL_STAGE_NAMES[a.kind]+' · 挑战成功','战利品整理',body,'special-dialog',button('领取战利品','special-claim','primary',!ground.length&&!w.rewardDrops.length?'disabled':'')+button('整理背包','starship-backpack','secondary')+button('返回原战场','special-return','secondary'),'special-return');
}
