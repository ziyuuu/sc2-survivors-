import type {World} from '../world';
import type {Reward} from '../types';
import type {ExpeditionReward} from '../progression/expedition-drafts';
import {SPECIAL_STAGE_NAMES,SPECIAL_STAGE_RULES} from './state';
import {legalSpecialKinds,specialStageAvailable} from './runtime';

const ticketId=(w:World,stage:number)=>`${w.runId??'run'}:special-ticket:${stage}`;
/** A persisted offer in the real random-card shelf, independent of paid rerolls. */
export function withSpecialTicket(w:World,offers:Reward[]):Reward[]{
 const cards=offers.filter(r=>!('expeditionEffect' in r)||(r as ExpeditionReward).expeditionEffect.kind!=='specialTicket');
 const t=w.specialStages.ticket;if(!t||w.phase!=='reward'||w.rewardRound!=='random'||t.stage!==w.stage+1||w.endless||!legalSpecialKinds(w).includes(t.kind))return cards;
 const r:ExpeditionReward={id:'special-ticket.'+t.kind,offerId:ticketId(w,t.stage),sold:t.claimed,name:SPECIAL_STAGE_NAMES[t.kind]+'门票',description:SPECIAL_STAGE_RULES[t.kind]+' 免费领取后于下一关开始时进入；作为本轮三张卡牌之一，不额外增加卡位，也不消耗商品免单次数。',icon:'ui.native.btn-ability-protoss-massrecall',rarity:'blue',kind:'tech',value:t.kind,minerals:0,gas:0,baseMinerals:0,baseGas:0,discount:0,expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:{kind:'specialTicket',stage:t.stage,challenge:t.kind}};
 // The ticket occupies one of the three real shelf slots, including on reroll.
 return [...cards.slice(0,2),r];
}
export function specialTicketEligible(w:World,r:ExpeditionReward){
 const e=r.expeditionEffect,t=w.specialStages.ticket;
 return e.kind==='specialTicket'&&w.phase==='reward'&&w.rewardRound==='random'&&!w.endless&&!r.sold&&!w.expedition.draftTaken&&!!t&&!t.claimed&&t.stage===w.stage+1&&e.stage===t.stage&&e.challenge===t.kind&&r.offerId===ticketId(w,t.stage)&&r.expeditionWindow===w.draftWindowId&&specialStageAvailable(w,t.stage)&&legalSpecialKinds(w).includes(t.kind);
}
