import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {World} from '../../src/simulation/world';
import {RACES,RACE_NAMES,FAMILIES_BY_RACE,ALL_FAMILIES,familyRace,type FamilyId,type Race} from '../../src/data/races';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {ELITES,type EliteId} from '../../src/data/elites';
import {HEROES,ALL_HERO_IDS,HERO_IDS_BY_RACE,heroStats,type HeroId} from '../../src/data/heroes';
import {UNIQUE_SUPPORT} from '../../src/data/unique-support';
import {SOURCE_UNIT_MODES} from '../../src/data/expansion-units';
import {unitData,expeditionWeaponBonuses} from '../../src/simulation/combat/expedition-combat';
import {SOURCE_WEAPONS} from '../../src/data/expansion-units';
import {exportEliteHeroRedesign} from './export-elite-hero-redesign.mts';
import {initializeCarrierSubsystem,ownedInterceptors} from '../../src/simulation/combat/carriers';
import {CARD_RARITIES,TEAM_CARD_VALUES} from '../../src/simulation/progression/team-cards';
import {EXPEDITION_CARD_DEFINITIONS} from '../../src/simulation/progression/expedition-drafts';

// A documentation probe only: detached Worlds, no step/fire/hit/save/storage/browser/network calls.
const proposalPath='docs/project/NEXT_ITERATION_P0_VALUES_20261003.json';
const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
const out='docs/project/NEXT_ITERATION_P0_CAPABILITIES_20261003.md';
const n=(v:number)=>Number.isFinite(v)?String(Math.round(v*10000)/10000):'—';
const pct=(v:number)=>n(v*100)+'%';
const table=(headers:string[],rows:(string|number)[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(row=>'| '+row.map(v=>String(v).replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |')].join('\n');
const triple=(a:number[])=>[a[0],a[2],a[4]].map(n).join('／');
const templateNames={quick:'速攻',heavy:'重火力',guard:'防护',mobile:'机动',support:'支援'};
const roles:Record<FamilyId,[string,string,string]>={
 marine:['实弹通用火力、兴奋剂','密集真实枪口/弹芯/命中火花','对空、持续输出；轻甲前排需承伤保护'],
 marauder:['地面反甲、震撼压制','慢速重弹、重甲接触核心、真实减速标记','对甲优先；不能补对空空缺'],
 reaper:['双枪、跳崖机动、脱战恢复','每真实周期两次枪口、细热粒子、合法跳崖动作','机动与早期输出；保留2×6、射程5'],
 hellion:['直线喷火清轻甲、火车/恶蝠','分段连续火舌、真实接触燃烧；强化不扩实际通道','轻甲群聚时有效；须区分科技/精英烧伤与卡牌变异'],
 tank:['移动炮与手动架起攻城溅射','炮口反冲、慢重炮飞行、对应半径爆心','高低地视线与架炮时间构成代价；不自动解架'],
 thor:['重甲地面支点、多武器对空','按当前武器的真实双炮/防空弹组及重击核心','对空武器、反甲武器分别核算，不把两者DPS相加'],
 viking:['战机对空、突击对地、合法降落','空中导弹和突击机枪；落地/取消有状态反馈','变形共享伤损与冷却；落点受阻不得传送'],
 banshee:['空中对地双弹、耗能隐形','真实两发、目标接触火花、隐形/侦测边界','没有对空；隐形有能耗与侦测克制'],
 medivac:['生物全效/机械三分之一治疗','持续绿色治疗束：真实挂点→当前有效受益者','实际恢复量及实际耗能；不计满血治疗，不治疗自身/建筑'],
 science_vessel:['机械全效/生物三分之一修复','绿色纳米粒流/连接光与实际修复涌光','真实恢复量与耗能；三款全息体的原死亡片段仍缺'],
 zergling:['一名额双身体、近战围攻','两身体独立爪击；I/III/V/VII用真实出手密度','按名额投入、按两身体输出；15秒裂变不能当免费整对复活'],
 baneling:['地面爆炸群伤、自爆后停5秒','真实自爆酸核、爆心、暂停身体；不画成阵亡','玩家存活、敌方死亡；5秒停顿限制循环爆炸收益'],
 roach:['重甲前线、固有再生','酸弹囊体/命中液滴、有效再生细光','低射程耐久；固有再生与主动治疗分开'],
 ravager:['胆汁定点炮击、破密集阵','独立胆汁上抛、落点预警及真实爆心','延迟与地形命中；胆汁技能不能从普攻DPS推算'],
 hydralisk:['地空持续刺弹、变异载体','真实刺弹及酸滴；额外腐蚀按各次脉冲','可补对空；射程/攻速科技分别一次'],
 queen:['地空多武器、输血、载体注卵','武器分层、输血实际脉冲、一次注卵挂点','能量/45秒注卵冷却；同舱一次、预付款占位先扣'],
 lurker:['埋地直线穿刺、钻入钻出','从真实埋地身体发出刺脊并逐目标接触','未埋地不能输出；本表采用埋地模式以比较作战武器'],
 mutalisk:['机动飞行、三跳清杂','三个真实9/3/1基础跳弹路径、逐目标命中','续跳只对合法邻敌；不能将三跳最大值当主目标DPS'],
 corruptor:['空中反甲与空军承伤','粗酸囊、空中接触液膜、甲壳承伤反馈','不能清地面；与地面火力协作'],
 ultralisk:['近战重甲与挥砍覆盖','重爪反冲、真实覆盖内接触冲击、甲壳碎屑','体型和到位成本；被空军克制'],
 zealot:['近战前线、冲锋','真实双刃接触、冲锋轨迹、原生盾承伤','到位后近战输出；护盾恢复与生命恢复分开'],
 adept:['地面反轻甲','实体灵能刃、轻甲接触爆芯','不补对空；战刃攻速与护盾收益一次'],
 stalker:['地空火力、手动闪现、变异载体','晶体弹芯、贯入裂光、合法闪现残像','对空/机动；闪现不刷新武器或技能冷却'],
 sentry:['基础能量火力、守护者护盾','真实能量连接、守护盾壳范围与到期','有效减伤/护盾时间与能量；不能按假治疗量比较'],
 immortal:['地面反甲、屏障','重能量双炮、重甲冲击核心、实际屏障吸收','单体重甲职责；屏障耗尽/到期单列'],
 colossus:['地面双束清群、可被对空武器打','双束沿实际覆盖接触、灼热核心','覆盖收益依密度；高阶不能消除双层被攻击风险'],
 high_templar:['灵能风暴与能量支援','真实风暴脉冲、目标有效命中、能量消耗','风暴完整预算/能量/密度单列；低普攻不代表低贡献'],
 phoenix:['机动对空、引力能力','真实离子双弹、合法目标牵引与解除','地面单位能否受控依原规则；不伪装地面常规攻击'],
 void_ray:['地空能量束、反甲','连接当前目标的真实束芯及反甲充能层次','反甲加成单列；不能从最大强化推成全时输出'],
 carrier:['母舰与所属截击机','原母舰、真实独立截击机出动/飞行/命中','母舰没有直接普攻；只计现存所属子机，各继承一次'],
};
const worlds=Object.fromEntries(RACES.map(race=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});assert.equal(w.start(),true);assert.equal(Object.keys(w.runConfig!.frozenTalents.levels).length,0);assert.equal(Object.keys(w.expedition.cardTotals).length,0);return [race,w];})) as Record<Race,World>;
function snapshot(id:FamilyId|HeroId,rank:number,eliteId?:EliteId,mode?:string,weapon?:string){
 const hero=Object.hasOwn(HEROES,id)?HEROES[id as HeroId]:undefined;
 const family=hero?.baseFamily??id as FamilyId,race=hero?.race??familyRace(family as FamilyId),w=worlds[race];w.entities.clear();w.heroes.clear();
 const u=w.addUnit(family,'terran',0,0,rank);
 if(hero){u.heroId=id as HeroId;u.modelKey=hero.model;}if(eliteId){u.eliteId=eliteId;u.modelKey=ELITES[eliteId].model;}
 if(family==='lurker')u.nativeMode='lurker_burrowed';
 if(mode==='siege')u.mode='siege';else if(mode)u.nativeMode=mode as typeof u.nativeMode;
 if(weapon){assert.ok(Object.hasOwn(SOURCE_WEAPONS,weapon),weapon+': missing source weapon');u.activeWeapon=weapon;}
 w.refreshStats(u,true);const data=unitData(u);
 let dps=data.targetType==='none'?0:u.weaponDamage*data.attacks/u.attackPeriod,childCount=0;
 if(family==='carrier'||id==='purifier_flagship'){initializeCarrierSubsystem(w);const children=ownedInterceptors(w,u.id);childCount=children.length;dps=children.reduce((s,c)=>s+c.weaponDamage*unitData(c).attacks/c.attackPeriod,0);}
 const support=['medivac','science_vessel'].includes(family)?u.healRate:0;
 const bonuses=expeditionWeaponBonuses(w,u).bonuses;
 const maxBonusFactor=u.weaponDamage>0?1+bonuses.reduce((s,b)=>s+b.amount,0)/u.weaponDamage:1;
 const result={hp:u.maxHp,shield:u.maxShield??0,armor:u.armor,dps,damage:u.weaponDamage,attacks:data.attacks,period:u.attackPeriod,range:u.attackRange,support,childCount,target:data.targetType,energy:u.maxEnergy,maxBonusFactor};
 for(const [key,v] of Object.entries(result))if(typeof v==='number')assert.ok(Number.isFinite(v)&&v>=0,`${id}/${rank}/${key}`);
 return result;
}
type Probe=ReturnType<typeof snapshot>;
const stats=(p:Probe)=>`${n(p.hp)}／${n(p.shield)}；甲${n(p.armor)}；DPS ${n(p.dps)}${p.dps&&!p.childCount?`；${n(p.damage)}×${p.attacks}／${n(p.period)}s；射程${n(p.range)}`:''}${p.support?`；医修 ${n(p.support)}/s`:''}${p.childCount?`（${p.childCount}子机理论总和）`:''}`;
assert.equal(ALL_FAMILIES.length,30);assert.equal(Object.keys(ELITES).length,90);assert.equal(ALL_HERO_IDS.length,18);assert.equal(Object.keys(UNIQUE_SUPPORT).length,12);
assert.deepEqual(Object.keys(roles).sort(),[...ALL_FAMILIES].sort());
for(const family of ALL_FAMILIES)assert.equal(Object.values(ELITES).filter(e=>e.family===family).length,3,`${family}: three variants`);
const pHeroIds=[...proposal.damageSkills,...proposal.supportSkills].map(s=>s.id);assert.equal(new Set(pHeroIds).size,18);assert.deepEqual(pHeroIds.sort(),[...ALL_HERO_IDS].sort());
for(let i=0;i<5;i++)assert.ok(Math.abs(proposal.yamatoDamageByRank[i]-proposal.yamatoDamageByRank[0]*proposal.damageGrowthByRank[i])<1e-6);
assert.equal(proposal.damageSkills.find(s=>s.id==='nova').packets[0],.75);
assert.ok(proposal.yamatoDamageByRank[0]>=proposal.benchmark.easyStage12Hp);assert.ok(proposal.yamatoDamageByRank[4]>=proposal.benchmark.easyEndlessRound3NewBossHp);
for(const s of proposal.damageSkills){assert.ok(s.cooldown>0);assert.ok(s.packets.every(v=>v>0));
 const usableFraction=s.id==='zagara'?s.packets[0]*2:s.packets.reduce((a,b)=>a+b,0);
 if(!['dehaka','zeratul','yamato_battlecruiser'].includes(s.id))for(const i of [0,4])assert.ok(proposal.yamatoDamageByRank[i]*usableFraction>=(i?proposal.benchmark.easyEndlessRound3NewBossHp:proposal.benchmark.easyStage12Hp)/2,`${s.id}: AOE full package budget`);
}
assert.ok(Math.abs((1+3*TEAM_CARD_VALUES.damage[4])*(1+3*TEAM_CARD_VALUES.speed[4])-1.8352)<1e-9);
for(const s of proposal.supportSkills)for(const [key,values] of Object.entries(s))if(key.endsWith('ByRank'))assert.equal((values as unknown[]).length,5,`${s.id}/${key}`);
const text:string[]=['# P0能力对照表 · 2026-10-03',
 '由 `node --import tsx tools/docs/export-next-iteration-p0.mts` 生成。主设计见 [P0统一设计与差异](NEXT_ITERATION_P0_20261003.md)，新数值唯一源为 [P0设计JSON](NEXT_ITERATION_P0_VALUES_20261003.json)。状态：P0 r2设计已于2026-10-03获用户确认，用户要求开始P1；本表新战斗数值尚未实施。',
 '## 读表口径',
 '30普通家族、90精英、18英雄、每族8张趣味牌共24个种族身份逐项覆盖。数值来自独立内存World的属性派生：零天赋、零全队牌、零科技、零临时Buff；没有运行战斗、伤害、存档或联网。均为玩家实体，已含适用的友军15%与英雄普攻15%；这些适配不得再乘。',
 'HP／原生盾分别列出；甲为生命护甲；随后为DPS、每次单发×次数／周期秒与射程。DPS为无护甲、无属性加成、无暴击/控制/有效命中损失的当前选定主武器理论值，不是实战输出。多武器不相加，条件加成见每项能力；医修为主系无缺血/能量限制的理论每秒值，跨系三分之一。航母为初始现存所属截击机理论总和，不是母舰武器。潜伏者采用埋地模式；普通坦克默认移动模式，其他模式另表。',
 '普通I/III/V/VII只读当前公式，VII需已批准培养天赋，不是无天赋开局可得。精英I/V相对同家族普通V比较。英雄技能表不包括普攻/队友/天赋贡献；当前完整值针对可承受全部后续包的合法目标，泰凯斯建筑只有首爆、其余目标需承受燃烧；持续伤害必须完整命中。四难度玩家技能共用固定值，不能据简单基准推定困难/地狱通关。',
 '## 30普通家族：当前值、保留值与实际职责'];
for(const race of RACES){text.push('### '+RACE_NAMES[race],table(['家族/职责','I：HP/盾；理论值','III','V','VII（需天赋）','拟变更/有效收益/反馈'],FAMILIES_BY_RACE[race].map(id=>[`${SC2_UNITS[id].zh} (${id})：${roles[id][0]}`,...[1,3,5,7].map(rank=>stats(snapshot(id,rank))),`数值保留；${roles[id][2]}；${roles[id][1]}`])));}
text.push('### 可切换作战模式的独立核对',table(['家族/模式','普通V：HP/盾；理论值','目标/射程/周期','范围边界'],([['tank','siege'],['hellion','hellbat'],['viking','viking_assault']] as [FamilyId,string][]).map(([id,mode])=>{assert.ok(mode==='siege'||Object.hasOwn(SOURCE_UNIT_MODES,mode));const p=snapshot(id,5,undefined,mode);return [id+'/'+mode,stats(p),`${p.target}／${n(p.range)}／${n(p.period)}秒`,'切换共享身体、生命及冷却；本次无参数改动'];})));
text.push('## 90精英：当前运行基线，r2重设计另列',
 '本节仅记录当前运行值；旧P0保留精英的设计已由 [90精英/18英雄重设计](ELITE_HERO_REDESIGN_20261003.md) 覆盖。新提案不叠乘本表旧模板/独有效果。DPS比值含当前属性派生的周期改变，未包含条件额外伤害、范围覆盖、法术与控场收益；无武器家族用医修比。独有效果是当前配置，实际兑现仍须有效命中/目标/能量/状态。');
for(const race of RACES){text.push('### '+RACE_NAMES[race],table(['精英ID/名称/模板','当前I：HP/盾；理论值','当前V：HP/盾；理论值','相对普通V：I→V','当前独有效果/作用对象','新提案入口/原反馈'],FAMILIES_BY_RACE[race].flatMap(family=>Object.values(ELITES).filter(e=>e.family===family).map(e=>{const low=snapshot(family,1,e.id),high=snapshot(family,5,e.id),base=snapshot(family,5);const ratio=base.dps?`DPS ${n(low.dps/base.dps)}→${n(high.dps/base.dps)}倍`:base.support?`医修 ${n(low.support/base.support)}→${n(high.support/base.support)}倍`:'普攻无比较值，独立技能核算';const effect=e.effect?`${e.effect.stat}=${e.effect.amount}；` :'';return [`${e.id} ${e.name}／${templateNames[e.template]}`,stats(low),stats(high),`${ratio}；HP ${n(low.hp/base.hp)}→${n(high.hp/base.hp)}倍`,effect+e.description,`运行基线；r2提案替换旧模板/独有效果，保留原模型；${roles[family][1]}`];}))));}
text.push('## 18英雄：当前普攻/耐久与技能逐包提案',
 '普攻/耐久列为当前运行基线；新的机体、被动与英雄高于精英的预算见 [r2重设计](ELITE_HERO_REDESIGN_20261003.md)。本节主动技包随P0设计获确认，仍待P3实施。',
 '新D为I—V：'+proposal.yamatoDamageByRank.join('／')+'；仅14名伤害英雄技能使用'+proposal.damageGrowthByRank.join('／')+'，替代旧技能成长，不叠加旧heroStats.skill、普攻15%或全队武器牌。既有针对hero技能的能力天赋按原语义施法时计算一次；零天赋基准不含它。',
 table(['英雄','当前I普攻/耐久','当前V普攻/耐久','当前技能I/III/V','新技能I/III/V（P0已确认）','冷却当前→拟秒/包结构/反馈'],RACES.flatMap(race=>HERO_IDS_BY_RACE[race].map(id=>{const h=HEROES[id],s=proposal.damageSkills.find(s=>s.id===id),p=proposal.supportSkills.find(s=>s.id===id);return [h.name+' ('+id+')',stats(snapshot(id,1)),stats(snapshot(id,5)),s?`${triple([1,2,3,4,5].map(rank=>s.currentFull*heroStats(rank).skill))}；${h.skill}`:p.current,s?triple(proposal.yamatoDamageByRank.map(d=>d*s.packets.reduce((a,b)=>a+b,0))):'见支援逐级表',`${h.cooldown}→${s?.cooldown??p.cooldown}；${s?.structure??p.target}；${s?.visual??p.visual}`];}))),
 '### 14伤害英雄：每个独立伤害包与兑现风险',table(['英雄','I逐包','III逐包','V逐包','次目标','I完整/冷却','兑现风险'],proposal.damageSkills.map(s=>[HEROES[s.id as HeroId].name,...[0,2,4].map(i=>s.packets.map(f=>n(proposal.yamatoDamageByRank[i]*f)).join('＋')),s.secondaryMax?`最多${s.secondaryMax}名，每名主包${pct(s.secondaryFraction)}`:'范围内每名实际命中者按本包；不增加额外对象',n(proposal.yamatoDamageByRank[0]*s.packets.reduce((a,b)=>a+b,0)/s.cooldown)+'/s',s.risk])),
 '完整AOE对简单对应基准至少半血的算术关系：托什I/V=4600/11960，分别≥4500/11760；扎加拉至少两枚=4600/11960，仍需真实几何命中验证。大和I/V=9200/23920，分别高于9000/23520；这只是预算检查，不是已经击杀。');
text.push('### 支援、保护与控制逐级提案',table(['英雄/机制','I','II','III','IV','V','对象/数量/冷却'],proposal.supportSkills.map(s=>{let values:string[];if(s.id==='swann')values=s.healTotalMaxHpByRank.map(v=>`5秒敌伤无敌＋四脉冲总${pct(v)}最大HP`);else if(s.id==='artanis')values=s.immediateMaxShieldByRank.map((v,i)=>`立即${pct(v)}＋8次各${pct(s.perPulseMaxShieldByRank[i])}最大原生盾`);else if(s.id==='niadra')values=s.chargesByRank.map((v,i)=>`${v}次复生，各${pct(s.reviveMaxHpByRank[i])}HP；起手${pct(s.immediateMaxHpByRank[i])}HP`);else values=s.durationByRank.map((v,i)=>`普通停滞${v}s；Boss移速/攻速减${pct(s.bossSlowByRank[i])}`);return [HEROES[s.id as HeroId].name,...values,s.target+'；CD'+s.cooldown+'秒'];})),
 '德哈卡：真实吞噬命中后，I—V自身储备为最大HP '+proposal.dehakaReserve.maxHpByRank.map(pct).join('／')+'，期限8秒；额外回自身20%最大HP。储备不接受治疗、同源取较大值、期限刷新、到期只移除余量。护甲与溢出结算详见主设计。');

// Per-race visual identities share the existing four rules, never borrow the Terran chase change.
const shared=[
 {id:'mines',names:['蜘蛛雷','生体酸囊雷','晶体地雷'],rarity:'绿',levels:'6／9／12枚；每枚120，触发1.2，爆炸半径2',target:'可见地面敌人触发；爆炸按既有范围目标规则；关/轮开始布设',visual:['钻出、合法追踪、一次爆炸；新增4/6/0.25参数已随P0确认，待P4实施','静态囊体触发后酸核炸开；不自动变追踪雷','静态晶体触发后能量裂爆；不自动变追踪雷']},
 {id:'bombardment',names:['轨道轰炸','酸液轰炸','灵能轰炸'],rarity:'蓝',levels:'每20／15／10秒；每次180，半径2.5，0.75秒预警',target:'可见敌人位置；区域合法敌军/建筑按当前规则',visual:['机械轨道落点、炮芯与残烟','生体上抛酸液、酸核与液滴','棱形汇聚、垂直能量芯与裂光']},
 {id:'mutation',names:['基因改造','生体变异','灵能灌注'],rarity:'紫',levels:'主击有效伤害30／45／60%，分3秒；每来源/目标最多3层',target:'陆战队／刺蛇／追猎者的普通或精英主武器命中；不含英雄/召唤物',visual:['主枪口强化及真实燃烧脉冲','刺囊、腐蚀脉冲','晶体充能及相位脉冲']},
 {id:'strategic',names:['战术核弹','生体核爆','净化打击'],rarity:'橙',levels:'每次购买+1弹药；每次3000，半径8，延迟3秒；一次最多1项待落点',target:'玩家合法落点；敌军地空与建筑，无友伤；不属于三层Buff',visual:['核弹落点预警、一次爆心与残烟','生体核坍缩、一次强酸爆心','净化核汇聚、一次能量爆心']},
];
const uniqueRows:Record<keyof typeof UNIQUE_SUPPORT,[string,string,string]>={
 'terran.ricochet':['25／35／45%触发，额外最多1／2／3目标各主击40%','永久普通/精英陆战队、劫掠者、死神；每真实开火周期首击；邻距3、飞行速度20、无递归','真实跳弹路径和各次命中火花；不是无条件多发'],
 'terran.bunker':['HP1200／1800／2400；每0.5秒双枪各12／16／20；存活30秒','落地1.5秒，射程8，护甲2，占位1.6；落地后35秒再部署；最多1个','原地堡落地、实体双枪和对应命中；受毁/到期结束'],
 'terran.missiles':['每24秒4／6／8枚，各60伤害，半径1.2','锚点14内可见敌人；每枚间隔0.2、飞行0.6；按锁定落点结算','4/6/8枚真实集束飞行、各独立爆心'],
 'terran.overdrive':['8秒攻速+20／30／40%，移速+15%','玩家战斗友军；基础CD60秒，技能恢复天赋沿当前规则','引擎/机械超载、真实开火变密；不增加假弹'],
 'zerg.hatch':['12次附近有效击杀→2／3／4临时I跳虫，寿命12秒；存活上限4／6／8','锚点12内敌军真实死亡；临时单位/召唤链排除；不占永久名额','尸骸孵化并出现真实临时身体；身体数随层数变化'],
 'zerg.consume':['每精华有效恢复40／60／80HP','最多2颗、每3秒一次、寿命6秒、速度8；尸骸原点6内最缺血生物友军','精华实体飞至真实受益者，只显示有效恢复'],
 'zerg.parasite':['普攻登记4秒毒囊；宿主真实死亡酸爆80／120／160，半径2.5','普通/精英敌人，排除Boss/领主/召唤物；刷新不叠无限毒囊','宿主毒囊及一次死亡酸爆；不伪造Boss爆炸'],
 'zerg.evolve':['立即恢复最大HP15／22.5／30%，8秒甲+2／3／4','玩家生物战斗友军；基础CD60秒，技能恢复天赋沿当前规则','真实回血、甲壳鼓胀及期限；不提高额外最大HP'],
 'protoss.reserve':['自然回盾溢出储备上限最大原生盾15／22.5／30%，保留6秒','拥有原生盾的永久战斗友军，含合法英雄；非技能回盾溢出','原生盾外储备分段；受击按真实消耗显示'],
 'protoss.counter':['原生盾被敌伤击破反击120／180／240，半径3；减速25%/Boss12.5% 2秒','每受益身体CD12秒；需敌伤打破原生盾，不被人工清盾触发','盾壳破裂后反击波及真实命中；不增加减伤'],
 'protoss.echo':['每3个真实开火周期追加主击35／50／65%，延迟0.6秒','永久普通/精英武器；原锁定点1.5内、可见且视线合法；无递归','一次延迟相位回响；目标脱离即不画有效命中'],
 'protoss.prism':['总800／1100／1400，10次各80／110／140；长14、完整宽2','基础CD60秒；当前首次伤害在0.7秒，间隔0.2秒、末次2.5秒；方向冻结','持续定向棱镜束，仅真实10次脉冲结算；时间线歧义待修订文案'],
};
assert.deepEqual(Object.keys(uniqueRows).sort(),Object.keys(UNIQUE_SUPPORT).sort());
const cardRows=RACES.flatMap((race,ri)=>[...shared.map(s=>[`${race}.${s.id} ${s.names[ri]}／${s.rarity}`,s.levels,s.target,s.visual[ri],'既有收益保留；人族雷行为参数另审']),...Object.entries(UNIQUE_SUPPORT).filter(([,s])=>s.race===race).map(([id,s])=>[id+' '+s.name+'／'+s.rarity,...uniqueRows[id as keyof typeof UNIQUE_SUPPORT],'既有收益保留'])]);
assert.equal(cardRows.length,24);
text.push('## 高级卡牌：24趣味身份及全队/家族强化',
 '每族4张共用规则牌＋4张独有牌。共用牌表中的race.mines等为对照身份标签，运行保存仍使用mines/bombardment/mutation/strategic共用键，不新增12个存档键。新独有牌保持商店独占、先抽品质再25%合法趣味/75%其他合法池，不改Boss或地图掉落，不增加保底。0层没有对应效果；1/2/3层如下；战略弹药按次消耗。固定伤害不再乘友军15%/普通武器科技；主击比例继承实际非暴击主击，再按卡牌系数一次，禁止卡牌间递归触发。',
 table(['身份/品质','1／2／3层：当前值＝拟保留值','作用对象/触发与限制','拟升级反馈','差异'],cardRows),
 '### 全队牌白/绿/蓝/紫/橙，每品质每组最多三张',table(['品质','火力1张：伤害/攻速','火力3张实际理论DPS因子','防御1张：HP及原生盾/护甲','防御3张'],CARD_RARITIES.map((r,i)=>[r,`${pct(TEAM_CARD_VALUES.damage[i])}／${pct(TEAM_CARD_VALUES.speed[i])}`,n((1+3*TEAM_CARD_VALUES.damage[i])*(1+3*TEAM_CARD_VALUES.speed[i])),`${pct(TEAM_CARD_VALUES.health[i])}／+${TEAM_CARD_VALUES.armor[i]}`,`${pct(3*TEAM_CARD_VALUES.health[i])}／+${n(3*TEAM_CARD_VALUES.armor[i])}`])),
 '同组各品质先各自累加到总加值，最后在属性派生乘一次，不逐卡连乘。普通、精英、英雄及所属子机沿既有合法适用边界；工人、建筑、载体不因全队牌提高。橙火力三张在其他零加值时理论DPS×1.8352；橙防御三张HP/原生盾+60%、原始护甲+2.1，再走既有友军护甲适配。升级不得免费补HP/盾。',
 '### 其他家族强化与科技',table(['类别','白／绿／蓝／紫／橙值','目标/当前上限','拟值/实际收益与反馈'],(['recovery','energy','production'] as const).map(id=>{const c=EXPEDITION_CARD_DEFINITIONS[id];return [id+' '+c.name,c.values.join('／'),String(c.cap),`数值保留；${id==='recovery'?'分别增强已有固有回血、原生回盾与合法医修，不凭空增加新通道':id==='energy'?'增加已有能量系统的有效续航，无能量单位不虚构施法':'锁定已付款订单、真实未来生产提速，不重付/重置在途进度'}`];})),
 '军衔/精英/英雄卡改变对应真实等级，未新增免费招募、重复身份或额度；攻防科技仍共享九线与六档，解锁/增量详见 [当前数据参考](../GAME_DATA_REFERENCE.md)。本次只要求把真实收益接入可辨认反馈，不另造卡牌成长曲线。');
const sourcePaths=[proposalPath,'src/data/races.ts','src/data/ranks.ts','src/data/elites.ts','src/data/expansion-elites.ts','src/data/heroes.ts','src/data/sc2-units.ts','src/data/expansion-units.ts','src/data/unique-support.ts','src/data/player-unit-adaptations.ts','src/simulation/world.ts','src/simulation/combat/expedition-combat.ts','src/simulation/combat/expedition-elites.ts','src/simulation/combat/expedition-heroes.ts','src/simulation/combat/carriers.ts','src/simulation/combat/shop-support.ts','src/simulation/combat/unique-support.ts','src/simulation/progression/team-cards.ts','src/simulation/progression/expedition-drafts.ts'];
text.push('## 生成核对与来源指纹','核对：30普通、每家族三型共90精英、18英雄（14伤害＋3支援＋1控制）、24趣味身份、10种全队品质组合。18英雄普攻/耐久、30家族I/III/V/VII、90精英I/V使用当前World派生。验证D成长、诺娃75%及简单Boss预算，不运行游戏验收。来源文本以UTF-8、CRLF规范化为LF后计算SHA-256，避免Windows/云端换行差异；不是本机CRLF文件的原始字节散列。',table(['源码/提案文件','SHA-256（UTF-8/LF）'],sourcePaths.map(path=>[path,crypto.createHash('sha256').update(fs.readFileSync(path,'utf8').replaceAll('\r\n','\n'),'utf8').digest('hex')])));
const redesign=exportEliteHeroRedesign(proposal,snapshot,process.argv.includes('--check'));
const generated=text.join('\n\n')+'\n';
if(process.argv.includes('--check')){
 assert.equal(fs.readFileSync(out,'utf8').replaceAll('\r\n','\n'),generated,'P0 capability matrix differs; regenerate and review');
 const state=JSON.parse(fs.readFileSync('docs/project/status.json','utf8')).nextIterationP0;
 assert.equal(state.newParametersApproved,proposal.approval.approved);assert.equal(state.runtimeChanged,false);assert.equal(state.runtimeSchema,14);assert.equal(state.profileVersion,5);
 assert.equal(state.revision,proposal.revision);assert.equal(state.eliteHeroRevision.allAuthoredValuesApproved,proposal.approval.approved);assert.equal(proposal.approval.scope,'P0_DESIGN_APPROVED_P1_EXECUTION_AUTHORIZED');assert.equal(proposal.approval.runtimeApplied,false);
 assert.equal(state.eliteHeroRevision.eliteDesigns,90);assert.equal(state.eliteHeroRevision.heroDesigns,18);assert.equal(state.eliteHeroRevision.userSamples,21);assert.equal(state.eliteHeroRevision.heroRoleComparisons,18);assert.equal(state.eliteHeroRevision.allFiveRanksChecked,true);
 assert.equal(state.eliteHeroRevision.loneHunterScope,'REAPER_FAMILY_ONLY_USER_CONFIRMED');assert.equal(state.eliteHeroRevision.destroyerBlast,'AREA_FIVE_TIMES_USER_LATEST_CORRECTION');
 assert.deepEqual(state.coverage,{ordinaryFamilies:30,eliteVariants:90,heroes:18,raceFunCardIdentities:24,teamCardQualityGroups:10});
 let localLinks=0;
 for(const file of ['docs/project/NEXT_ITERATION_P0_20261003.md',out,redesign.path,'docs/project/NEXT_ITERATION_P0_VALIDATION_20261003.md']){
  const source=fs.readFileSync(file,'utf8');assert.equal(/[\t ]+$/m.test(source),false,file+': trailing whitespace');
  for(const m of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   const ref=m[1].split('#')[0];if(!ref||/^[a-z]+:\/\//i.test(ref)||ref.startsWith('mailto:'))continue;
   assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),file+': missing link '+ref);localLinks++;
  }
 }
 process.stdout.write('P0 r2 matrix check passed: 30 ordinary, 90 current/new elites, 18 current/new heroes, 21 user samples, 24 fun identities; 18 hero role and durability comparisons; '+localLinks+' local links resolve.\n');
}
else{fs.writeFileSync(out,generated,'utf8');process.stdout.write('Generated '+out+' and '+redesign.path+'; current stats and approved P0 designs remain separate.\n');}
