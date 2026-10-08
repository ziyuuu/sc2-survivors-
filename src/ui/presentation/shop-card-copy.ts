import type {World} from '../../simulation/world';
import type {ExpeditionReward,ExpeditionCardEffect} from '../../simulation/progression/expedition-drafts';
import {TEAM_CARD_VALUES,CARD_RARITIES,teamCardEffects,teamCardKey} from '../../simulation/progression/team-cards';
import {supplyEligibility} from '../../simulation/progression/supply-cards';
import {FAMILIES_BY_RACE} from '../../data/races';
import {SC2_UNITS} from '../../data/sc2-units';
import {DEVELOPMENT} from '../../data/expedition-buildings';
import {shopProgress} from './shop-progress';
import type {CardView} from './reference-card';
const pct=(n:number)=>Number((n*100).toFixed(2))+'%';
const labels:Record<ExpeditionCardEffect,string>={weapon:'武器伤害',vitality:'最大生命',armor:'护甲',recovery:'治疗与修复效率',energy:'能量恢复',production:'训练耗时',cultivation:'培养'};
export function familyCardEffect(effect:ExpeditionCardEffect,amount:number){return effect==='cultivation'?`普通士兵获得 ${amount} 点培养，优先军衔最低者。`:`${effect==='production'?'后续训练耗时':labels[effect]} ${effect==='production'?'−':'+'}${effect==='armor'?Number(amount.toFixed(2)):pct(amount)}`;}
/** Player-facing descriptions only. Offer identity, eligibility and price remain native. */
export function decorateShopCard(w:World,r:ExpeditionReward,c:CardView){
 const e=r.expeditionEffect;if(!e)return c;
 if(e.kind==='teamCard'){
  const totals=teamCardEffects(w.expedition),i=CARD_RARITIES.indexOf(e.rarity),n=w.expedition.cardTotals[teamCardKey(e.group,e.rarity)]??0;
  const army=[FAMILIES_BY_RACE[w.expedition.race][0]];
  c.identity=army[0];c.bodyIdentities=army;c.bodies=army.length;c.art=e.group;
  c.stat=e.group==='firepower'?`伤害 +${pct(TEAM_CARD_VALUES.damage[i])} · 攻速 +${pct(TEAM_CARD_VALUES.speed[i])}`:`生命与护盾 +${pct(TEAM_CARD_VALUES.health[i])} · 护甲 +${TEAM_CARD_VALUES.armor[i]}`;
  c.progress={purchases:`已购 ${CARD_RARITIES.reduce((sum,q)=>sum+(w.expedition.cardTotals[teamCardKey(e.group,q)]??0),0)} 次 · 本品质 ${n} 次`,total:e.group==='firepower'?`当前全军：伤害 +${pct(totals.damage)} · 攻速 +${pct(totals.speed)}`:`当前全军：生命与护盾 +${pct(totals.health)} · 护甲 +${Number(totals.armor.toFixed(2))}`};c.detail=c.stat;
 }else if(e.kind==='card'){
  const v=w.expedition.cardTotals[e.key]??0,count=shopProgress(w).count(r);c.stat=familyCardEffect(e.effect,e.amount);c.detail=c.stat;
  c.progress={purchases:count.complete?`已购 ${count.count} 次`:count.count?`已记录 ${count.count} 次购买`:'此前购买次数未记录',total:e.effect==='cultivation'?`当前累计培养：${v} 点`:`当前累计：${labels[e.effect]} ${e.effect==='production'?'−':'+'}${e.effect==='armor'?Number(v.toFixed(2)):pct(v)}`};
 }else if(e.kind==='supply'){
  const name=SC2_UNITS[e.family].zh,amount=`${e.count}${e.family==='zergling'?'对':'名'}`;
  c.stat=e.mode==='pod'?`获得 ${amount}空投${name}。`:`获得 ${amount}${name}，立即加入小队。`;c.detail=c.stat;
  const availability=supplyEligibility(w,e.family,e.count,e.mode);
  if(!r.sold&&!availability.legal){c.reason=availability.reasons.includes('capacity')?'编制已满':availability.reasons.includes('research')?'研究不足':availability.reasons.includes('facility')?'缺少设施':'暂无可用落点';c.label=c.reason;}

 }
 return c;
}
