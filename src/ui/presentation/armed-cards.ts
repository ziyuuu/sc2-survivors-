import {ARMED_CARD_BY_ID,ARMED_NODE_LINKS,armedDetail,type ArmedCard} from '../../data/terran-armed-support';
import {armedRank} from '../../simulation/progression/build-progress';
import {pendingBuildChoice} from '../../simulation/combat/armed-support';
import type {World} from '../../simulation/world';
import type {CardView} from './reference-card';
import {esc} from './reference-primitives';
export function armedWorldDetail(w:World,c:ArmedCard){const linked=(ARMED_NODE_LINKS[c.id]??[]).map(id=>ARMED_CARD_BY_ID[id as keyof typeof ARMED_CARD_BY_ID]).filter(node=>armedRank(w.expedition.support,node.id)>0);return [armedDetail(c),...linked.map(node=>`${node.name}：${node.detail[0]}`)].join('\n');}

export function armedNodeViews(w:World):CardView[]{const m=pendingBuildChoice(w);if(!m)return [];return m.offers.map(id=>{const c=ARMED_CARD_BY_ID[id];return {id:m.id+':'+id,armedId:id,race:'terran',rarity:c.quality,name:c.name,kicker:'武装支援 · 紫色节点',flavour:'',stat:c.brief,detail:armedDetail(c),art:'support',icon:'tech.attack',minerals:0,gas:0,free:true,label:'领取',action:'armed-node',attrs:`data-milestone="${esc(m.id)}" data-node="${id}" data-revision="${w.expedition.shopRevision}"`,detailAction:'ui-info',detailAttrs:`data-title="${esc(c.name)}" data-copy="${esc(armedDetail(c))}"`};});}
