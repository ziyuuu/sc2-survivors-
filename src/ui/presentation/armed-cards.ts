import {BIO_BY_ID,isBioId} from '../../data/terran-bio';
import {bioCardView} from './bio-cards';
import {ARMED_CARD_BY_ID,ARMED_NODE_LINKS,armedDetail,type ArmedCard} from '../../data/terran-armed-support';
import {DOOMSDAY_CARD_BY_ID,isDoomsdayId,type DoomsdayCard} from '../../data/terran-doomsday';
import {HEROES} from '../../data/heroes';
import {DOOMSDAY_DRIVERS} from '../../simulation/combat/doomsday-orange';
import {DOOMSDAY_BRIEF,DOOMSDAY_DETAIL} from '../../data/terran-doomsday-copy';
import {armedRank} from '../../simulation/progression/build-progress';
import {pendingBuildChoice} from '../../simulation/combat/armed-support';
import type {World} from '../../simulation/world';
import type {CardView} from './reference-card';
import {esc} from './reference-primitives';
export function armedWorldDetail(w:World,c:ArmedCard){const linked=(ARMED_NODE_LINKS[c.id]??[]).map(id=>ARMED_CARD_BY_ID[id as keyof typeof ARMED_CARD_BY_ID]).filter(node=>armedRank(w.expedition.support,node.id)>0);return [armedDetail(c),...linked.map(node=>`${node.name}：${node.detail[0]}`)].join('\n');}
export function doomsdayWorldDetail(w:World,c:DoomsdayCard){
 const detail=DOOMSDAY_DETAIL[c.id];if(c.id!=='M-O01')return detail;
 const drivers=DOOMSDAY_DRIVERS.filter(id=>w.heroes.has(id)).map(id=>HEROES[id].name);
 return detail+'\n本局驾驶员：'+(drivers.join('、')||'尚未取得合格英雄')+'。';
}

export function armedNodeViews(w:World):CardView[]{const m=pendingBuildChoice(w);if(!m)return [];return m.offers.map(id=>{
 if(isBioId(id)){
  const view=bioCardView(BIO_BY_ID[id]);
  return {...view,id:m.id+':'+id,action:'armed-node',label:'领取',attrs:`data-milestone="${esc(m.id)}" data-node="${id}" data-revision="${w.expedition.shopRevision}"`};
 }
 const mechanical=isDoomsdayId(id),c=mechanical?DOOMSDAY_CARD_BY_ID[id]:ARMED_CARD_BY_ID[id];
 const brief=mechanical?DOOMSDAY_BRIEF[id]:ARMED_CARD_BY_ID[id].brief;
 const detail=mechanical?doomsdayWorldDetail(w,DOOMSDAY_CARD_BY_ID[id])+(m.at===3?'\n已进入末日兵器分支：每个机械家族的新机体上限减一（最低一台），新造与重装耗时增加25%，现役和已付订单保留。':''):armedDetail(ARMED_CARD_BY_ID[id]);
 return {id:m.id+':'+id,...(mechanical?{doomsdayId:id}:{armedId:id}),race:'terran',rarity:c.quality,name:c.name,kicker:(mechanical?'末日兵器':'武装支援')+(c.purchase==='orange'?' · 橙色节点':' · 紫色节点'),flavour:'',stat:brief,detail,art:'support',icon:'tech.attack',minerals:0,gas:0,free:true,label:'领取',action:'armed-node',attrs:`data-milestone="${esc(m.id)}" data-node="${id}" data-revision="${w.expedition.shopRevision}"`,detailAction:'ui-info',detailAttrs:`data-title="${esc(c.name)}" data-copy="${esc(detail)}"`};
 });}
