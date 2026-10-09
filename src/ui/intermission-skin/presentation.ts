import type {World} from '../../simulation/world';
import type {ExpeditionReward} from '../../simulation/progression/expedition-drafts';
import type {CardView} from '../../ui/presentation/reference-card';
import {DEVELOPMENT,familyLine,type ProductionLineId} from '../../data/expedition-buildings';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES,type HeroId} from '../../data/heroes';
import type {FamilyId} from '../../data/races';
import {supplyEligibility} from '../../simulation/progression/supply-cards';
import {teamCardKey} from '../../simulation/progression/team-cards';
import {supplyPlan} from '../../simulation/progression/supply-plan';

export const lineRows:Record<string,ProductionLineId[]>={terran:['barracks','factory','starport'],protoss:['gateway','robotics','stargate'],zerg:['zerg.basic','zerg.evolution','zerg.air']};
export const roundCopy=(text:string)=>text.replace(/\d+\.\d{2,}/g,n=>String(Number(Number(n).toFixed(1))));
export function equipment(c:CardView,r?:ExpeditionReward){
 const e=r?.expeditionEffect,id=e?.kind==='development'?e.definitionId:c.id.replace(/^[^:]+:/,'');
 const d=DEVELOPMENT.find(d=>d.id===id),sub=e?.kind==='card'?e.effect:id.startsWith('card.')?id.split('.')[1]:'';
 const kind=d?.kind==='research'?(id.endsWith('.weapon')?0:1):['weapon','armor','vitality'].includes(sub)?(sub==='weapon'?0:1):null;
 if(kind===null)return null;
 const identity=e&&'family'in e?e.family:c.identity;
 const f=identity&&((ELITES as Record<string,{family:FamilyId}>)[identity]?.family??identity);
 const line=d?.line??(f?familyLine(f as FamilyId):undefined),row=lineRows[c.race].indexOf(line!);
 return row<0?null:{row,kind,line};
}
export function objectIndex(c:CardView){
 const a=c.art,id=c.id,name=c.name;
 if(/跳弹弹链|尸骸孵育|护盾回流/.test(name))return 12;
 if(/空降地堡|吞噬回收|破盾反击/.test(name))return 13;
 if(/导弹齐射|寄生毒囊|相位回响/.test(name))return 14;
 if(/火力超载|应激进化|棱镜扫射/.test(name))return 15;
 if(a==='firepower')return 0;if(a==='defense')return 1;
 if(a==='facility')return 2;
 if(a==='energy')return 5;if(/补给|回收/.test(name))return 7;
 if(a==='recovery')return 4;if(a==='production')return 6;
 if(a==='training')return 6;if(/mines|地雷|蜘蛛雷/.test(a+name))return 8;
 if(/bombard|轰炸|轰击/.test(a+name))return 9;if(/mutation|燃烧弹|腐蚀弹|灼能弹/.test(a+name))return 10;
 if(/strategic|核弹|巨爆|净化打击/.test(a+name))return 11;
 return 3;
}
/** Presentation reads the existing quote; it never recalculates prices or redirects effects. */
export function cardPresentation(w:World,c:CardView,r?:ExpeditionReward){
 const source=c.id.slice(c.id.indexOf(':')+1);
 const catalogueEffect=!r&&source.startsWith('card.')?source.split('.')[1]:undefined;
 const e=r?.expeditionEffect,level=(n:number)=>'level'+n;
 let current='',gain='',simple=c.stat,detail=c.detail;
 const strength=({white:'提高',green:'小幅提高',blue:'中幅提高',purple:'大幅提高',orange:'极大幅度提高'})[c.rarity];
 if(e?.kind==='supply'){
  const q=supplyEligibility(w,e.family,e.count,e.mode),p=supplyPlan(w,e.family,e.count,e.mode);
  current=p.full?'MAX':String(q.alive);gain=p.full?'↗':'+'+e.count;
  simple=p.full?'提升军衔':e.mode==='pod'?'空投增援，抵达后接收':'增援立即加入小队';
  if(!r?.sold&&!q.legal)simple=p.full&&w.ordinaryUnits(e.family).every(u=>u.rank>=w.soldierCap())?'军衔已满':c.reason??'当前无法接收增援';
  detail=(p.full?'增援转为军衔提升。':detail)+` 当前编制 ${q.alive} / ${w.rosterCap}${e.family==='zergling'?' 对':''}，待抵达 ${q.pending}。本次可补充 ${p.added} 个编制、提供 ${p.promoted} 级军衔提升。费用按整张卡收取。${e.mode==='pod'?'空投抵达并接收后生效。':''}`;
 }else if(e?.kind==='training'){
  const min=Math.min(...e.targets.map(t=>t.rank));current=Number.isFinite(min)?level(min):'';
  gain='↗'.repeat(Math.max(1,...e.targets.map(t=>e.rank-t.rank)));simple='提升军衔';
 }else if(e?.kind==='development'){
  const d=DEVELOPMENT.find(d=>d.id===e.definitionId),n=w.expedition.tech[e.definitionId]??0;current=level(n);gain=n>=Number(d?.maxLevel)?'':'↗';
  simple=d?.kind==='research'?(e.definitionId.endsWith('.weapon')?'提高本生产线武器伤害':'提高本生产线防护能力'):d?.kind==='facility'?'扩充本生产线设施':d?.unlock==='family'?'解锁该兵种的持续生产':d?.unlock==='system'?'开放本生产线攻防研究':'解锁对应作战能力';
 }else if(e?.kind==='teamCard'){
  current='×'+(w.expedition.cardTotals[teamCardKey(e.group,e.rarity)]??0);
  simple=strength+(e.group==='firepower'?'全军伤害与攻击速度':'全军生命、护盾与护甲');
 }else if(e?.kind==='card'){
  simple=e.effect==='production'?strength.replace('提高','缩短')+'后续训练耗时':e.effect==='cultivation'?'培养军衔最低的普通士兵':strength+({weapon:'武器伤害',vitality:'最大生命',armor:'护甲',recovery:'治疗与修复效率',energy:'能量恢复'} as Record<string,string>)[e.effect];
 }else if(e?.kind==='support'){
  simple=({mines:'布设地雷，拦截靠近的敌军',bombardment:'呼叫范围轰击',mutation:'强化攻击的附加效果',strategic:'发动大范围战略打击','terran.ricochet':'实弹跳向额外目标','terran.bunker':'部署临时地堡提供掩护','terran.missiles':'周期性发射集束导弹','terran.overdrive':'主动提高射速与移动速度','zerg.hatch':'利用附近战果孵化临时跳虫','zerg.consume':'吞噬尸骸精华恢复生命','zerg.parasite':'植入毒囊，宿主倒下时酸爆','zerg.evolve':'主动恢复生命并强化甲壳','protoss.reserve':'将溢出的护盾恢复储存备用','protoss.counter':'破盾时反击并减速敌军','protoss.echo':'普攻追加相位伤害','protoss.prism':'主动展开定向持续扫射'})[e.support];
 }else if(e?.kind==='resource'){
  simple='回收补给，补充作战资源';
 }else if(e?.kind==='hero'||c.identity&&c.identity in HEROES){const id=(e?.kind==='hero'?e.heroId:c.identity)as HeroId,owned=w.heroes.get(id);current=owned?level(owned.rank):'';gain=c.kicker==='英雄复活'?'':owned?(owned.rank<5?'↗':''):'NEW';simple=c.kicker==='英雄复活'?c.stat:owned?'提升英雄军衔':'招募英雄加入战斗';}
 else if(e?.kind==='elite'||c.identity&&c.identity in ELITES){const id=(e?.kind==='elite'?e.eliteId:c.identity)as EliteId,owned=w.eliteOwned(id);current=owned?level(owned.rank):'';gain=owned?(owned.rank<5?'↗':''):'NEW';simple=owned?'提升精锐军衔':'挑选精锐与专属战法';}
 if(!e&&!c.identity?.includes('.')&&c.art==='supply'){gain='+'+c.count;simple=c.kicker.includes('空投')?'空投增援，抵达后接收':'增援立即加入小队';}
 if(!e&&(catalogueEffect||source.startsWith('team.'))){const kind=catalogueEffect??source.split('.')[1];simple=kind==='production'?'缩短后续训练耗时':kind==='cultivation'?'培养军衔最低的普通士兵':strength+({weapon:'武器伤害',vitality:'最大生命',armor:'护甲',recovery:'治疗与修复效率',energy:'能量恢复',firepower:'全军伤害与攻击速度',defense:'全军生命、护盾与护甲'}as Record<string,string>)[kind];}
 if(!e&&source.startsWith('economy.'))simple='回收补给，补充作战资源';
 if(!e&&source.startsWith('training.')){gain='↗';simple='提升普通士兵军衔';}
 if(!e&&equipment(c)){simple=equipment(c)!.kind===0?'提高对应生产线的武器伤害':'提高对应生产线的防护能力';}
 if(c.progress)detail+=' '+c.progress.purchases+'。'+c.progress.total;
 return {current,gain,simple:roundCopy(simple),detail:roundCopy(detail),equipment:equipment(c,r)};
}
