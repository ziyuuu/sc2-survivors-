import type {World} from '../../simulation/world';
import type {ExpeditionReward,ExpeditionCardEffect} from '../../simulation/progression/expedition-drafts';
import {TEAM_CARD_VALUES,CARD_RARITIES,teamCardEffects,teamCardKey} from '../../simulation/progression/team-cards';
import {supplyEligibility} from '../../simulation/progression/supply-cards';
import {FAMILIES_BY_RACE} from '../../data/races';
import {SC2_UNITS} from '../../data/sc2-units';
import {DEVELOPMENT} from '../../data/expedition-buildings';
import {shopProgress} from './shop-progress';
import {equipmentCardDamage,equipmentCardTotals} from '../../simulation/starship/card-effects';
import {STRATEGIC_BASE_DAMAGE} from '../../data/shop-support';
import type {CardView} from './reference-card';
const pct=(n:number)=>Number((n*100).toFixed(2))+'%';
const labels:Record<ExpeditionCardEffect,string>={weapon:'武器伤害',vitality:'最大生命',armor:'护甲',recovery:'恢复效率',energy:'能量恢复',production:'训练耗时',cultivation:'培养'};
export function familyCardEffect(effect:ExpeditionCardEffect,amount:number){return effect==='cultivation'?`普通士兵获得 ${amount} 点培养，优先军衔最低者。`:`${effect==='production'?'后续训练耗时':labels[effect]} ${effect==='production'?'−':'+'}${effect==='armor'?Number(amount.toFixed(2)):pct(amount)}`;}
export function familyCardDetail(effect:ExpeditionCardEffect,amount:number){return familyCardEffect(effect,amount)+(effect==='recovery'?'。提高本兵种已有的生命与护盾自动恢复，以及治疗、修复效果。不会获得新的恢复能力，可治疗的目标类型不变。':'');}
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
  const v=w.expedition.cardTotals[e.key]??0,count=shopProgress(w).count(r);c.stat=familyCardEffect(e.effect,e.amount);c.detail=familyCardDetail(e.effect,e.amount);
  c.progress={purchases:count.complete?`已购 ${count.count} 次`:count.count?`已记录 ${count.count} 次购买`:'此前购买次数未记录',total:e.effect==='cultivation'?`当前累计培养：${v} 点`:`当前累计：${labels[e.effect]} ${e.effect==='production'?'−':'+'}${e.effect==='armor'?Number(v.toFixed(2)):pct(v)}`};
 }else if(e.kind==='support'){
  const base:Record<string,readonly number[]>={strategic:[STRATEGIC_BASE_DAMAGE],mines:[120],bombardment:[180],'terran.missiles':[60],'terran.bunker':[12,16,20],'zerg.parasite':[80,120,160],'protoss.counter':[120,180,240],'protoss.prism':[800,1100,1400]};
  if(base[e.support]){const values=base[e.support].map(n=>Number(equipmentCardDamage(w,n).toFixed(2))).join(' / '),unit=e.support==='terran.missiles'?'每枚':e.support==='terran.bunker'?'每发':e.support==='protoss.prism'?'整轮':'每次';c.detail+=` 基础伤害经过当前舰装加成后：${unit} ${values}（护甲前）。全局攻击百分比生效；普通白字DPS每增加100点，该成长倍率增加1，最高为4倍。不额外继承普攻攻速、暴击或固定真实DPS。`;}
  if(e.support==='terran.overdrive')c.detail+=' 武器增伤与全军火力的伤害加成相加，覆盖普通白字DPS，不放大固定真实DPS；冷却60秒。升级不改变已施放技能的层数或重置冷却。';
  if(e.support==='bombardment'||e.support==='terran.missiles')c.detail+=' 首次购入3秒后就绪；升级和跨关不重置正在等待的计时，无合法目标时等待目标出现。';
  if(['mutation','terran.ricochet','protoss.echo'].includes(e.support))c.detail+=' 继承原攻击已经获得的装备加成，不重复放大。';
  if(e.support==='terran.bunker'){const g=equipmentCardTotals(w);c.detail+=` 当前舰装下耐久 ${[1200,1800,2400].map(n=>Number((n*(1+g.health)).toFixed(2))).join(' / ')}，护甲 ${Number((2*(1+g.armorPercent)).toFixed(2))}。临时建筑沿独立支援属性，不使用士兵身份白字适配。`;}
  if(e.support==='zerg.hatch')c.detail+=' 孵化的真实跳虫继承适用的全局舰装属性，保留原数量与存活时间。';
  if(e.support==='zerg.consume'||e.support==='zerg.evolve')c.detail+=' 实际恢复受目标舰装防御等级影响，并以已装备的生命上限为限。';
  if(e.support==='protoss.reserve')c.detail+=' 使用舰装加成后的实际自然回盾溢出，容量按当前最大护盾计算。';
 }else if(e.kind==='supply'){
  const name=SC2_UNITS[e.family].zh,amount=`${e.count}${e.family==='zergling'?'对':'名'}`;
  c.stat=e.mode==='pod'?`获得 ${amount}空投${name}。`:`获得 ${amount}${name}，立即加入小队。`;c.detail=c.stat;
  const availability=supplyEligibility(w,e.family,e.count,e.mode);
  if(!r.sold&&!availability.legal){c.reason=availability.reasons.includes('capacity')?(availability.full&&w.ordinaryUnits(e.family).every(u=>u.rank>=w.soldierCap())?'军衔已满':'增援已安排'):availability.reasons.includes('research')?'研究不足':availability.reasons.includes('facility')?'缺少设施':'暂无可用落点';c.label=c.reason;}

 }
 return c;
}
