import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ELITES} from '../../src/data/elites';
import {HEROES,ALL_HERO_IDS,HERO_IDS_BY_RACE} from '../../src/data/heroes';
import {ALL_FAMILIES,FAMILIES_BY_RACE,RACES,RACE_NAMES,type FamilyId} from '../../src/data/races';
import {SC2_UNITS} from '../../src/data/sc2-units';

type Probe={hp:number;shield:number;armor:number;dps:number;damage:number;attacks:number;period:number;range:number;support:number;maxBonusFactor:number;target:string};
type Snapshot=(id:any,rank:number,eliteId?:any,mode?:string,weapon?:string)=>Probe;
const out='docs/project/ELITE_HERO_REDESIGN_20261003.md';
const n=(v:number)=>String(Math.round(v*10000)/10000);
const table=(heads:string[],rows:any[][])=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.map(v=>String(v).replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |')].join('\n');
const names:Record<string,string>={
 moveFactor:'移动倍率',warmupSeconds:'预热秒',attackSpeedIncrease:'攻速增加',maximumSeconds:'满速秒',forcedCoolingSeconds:'强制停火秒',lightDamageFactor:'对轻甲总倍率',eliteDamageFactor:'对精英总倍率',bossDamageFactor:'对Boss总倍率',dodgeByRank:'I—V固定闪避',familyAttributeIncrease:'枪兵属性增加',shotsPerCycle:'每周期弹次',openingCycles:'开场强化周期数',openingDamageFactor:'开场伤害倍数',splashFraction:'溅射主包比例',splashRadius:'溅射半径',armoredDamageFactor:'对重甲总倍率',outOfCombatSeconds:'脱战秒',growthK:'吸收增长半饱和量',dpsAsymptoteFactor:'火力渐近上限倍率',hpAsymptoteFactor:'生命渐近上限倍率',armorAsymptoteAdd:'护甲渐近增加',lengthIncrease:'长度增加',fanDegrees:'扇形角度',minePeriod:'补雷间隔秒',mineCount:'每次雷数',mineDamageI:'I级每雷伤害',mineRadius:'雷爆半径',fireSeconds:'残火秒',fireDamagePerSecondI:'I级火伤/秒',activeMineLimit:'同时存活雷数',chaseSpeed:'雷追踪速度',detectionRadius:'发现半径',radius:'半径',seconds:'期限秒',attackSpeedReduction:'敌攻速降低',moveReduction:'敌移动降低',attackDamageReduction:'敌攻击力降低',bossControlFactor:'Boss控制强度因子',armorReductionByRank:'I—V正护甲降低',shells:'每周期弹数',packetFraction:'每弹主包比例',knockbackChance:'击退概率',knockbackDistance:'击退距离',knockbackInternalSeconds:'同敌击退最短间隔秒',bossMoveReduction:'Boss移动降低',bossSlowSeconds:'Boss慢速秒',siegeDamageIncrease:'架炮伤害增加',siegeAttackSpeedIncrease:'架炮攻速增加',siegeRangeIncrease:'架炮射程增加',blastIncrease:'爆炸半径增加',blastRadiusFactor:'爆炸半径倍率',fireDamageFraction:'火伤主包比例',range:'射程/医修范围',healTargets:'并行治疗身体',allyHpIncrease:'友军HP增加',allyArmorAdd:'友军护甲增加',shieldPerEffectiveHealFraction:'有效治疗转临时盾比例',shieldMaxTargetHpFraction:'临时盾/目标最大HP上限',shieldSeconds:'临时盾秒',healDpsI:'I级每身体有效治疗/秒',bileBaseDamageI:'I级胆汁基础主包',bileBaseCooldown:'胆汁基础CD秒',stormBaseTotalI:'I级风暴基础总包',stormBaseCooldown:'风暴基础CD秒',interceptors:'现存子机数',childDamage:'I级每子机单发',childAttacks:'每子机弹次',childPeriod:'每子机周期秒',damageReduction:'敌伤减免',rangeAdd:'射程增加',ordinaryMaxHpPerSecondByRank:'I—V普通敌最大HP/秒',eliteMaxHpPerSecondFactor:'精英百分比扣血因子',bossMaxHpPerSecondFactor:'Boss百分比扣血因子'
};
const value=(key:string,v:any)=>Array.isArray(v)?v.map(x=>typeof x==='number'?n(x):String(x)).join('／'):typeof v==='number'?n(v):v===null?'未设/不适用':String(v);
function parameterText(e:any){return Object.entries(e.parameters).map(([k,v])=>`${e.userConfirmedParameterKeys.includes(k)?'【用户】':e.derivedParameterKeys?.includes(k)?'【派生】':'【提案】'}${k==='blastIncrease'?'爆炸面积增加':names[k]??k}=${value(k,v)}`).join('；');}

// These are text references. No art, screenshot, model or image-return endpoint is used.
const loreSources=[
 ['人族游骑兵／神族团结与刀锋女王阶段','Blizzard故事梗概','https://news.blizzard.com/en-gb/article/23331587/starcraft-story-primer'],
 ['泰凯斯：强悍小队与转管枪火力','Blizzard泰凯斯设计','https://news.blizzard.com/en-gb/article/22316743/co-op-commander-preview-tychus'],
 ['诺娃：幽灵精锐、隐蔽与精确爆发','Blizzard诺娃设计','https://news.blizzard.com/en-us/article/20320355/patch-3-7-new-co-op-commander-nova'],
 ['斯旺：海伯利昂首席工程师与军械','Blizzard军械角色介绍','https://news.blizzard.com/en-gb/article/9979969/building-the-war-machine'],
 ['德哈卡：原始虫族、吞噬与精华适应','Blizzard德哈卡设计','https://news.blizzard.com/en-us/article/20988565/patch-3-17-preview-new-co-op-commander-dehaka'],
 ['斯托科夫：被感染的人族军力与虫群融合','Blizzard斯托科夫设计','https://news.blizzard.com/en-us/article/20380441/patch-3-9-preview-new-co-op-commander-stukov'],
 ['阿拉纳克：塔达林高阶领主、征服与毁灭','Blizzard阿拉纳克设计','https://news.blizzard.com/en-us/article/20273595/patch-3-6-preview-new-co-op-commander-alarak'],
 ['菲尼克斯：净化者机械身体与前线战士','Blizzard菲尼克斯设计','https://news.blizzard.com/en-us/article/20720318/patch-3-13-0-preview-new-co-op-commander-fenix'],
 ['沃拉尊：奈拉齐姆族长与隐秘军力','Blizzard指挥官介绍','https://news.blizzard.com/en-us/article/23001166/new-starcraft-ii-loot-for-twitch-prime-members'],
];

export function exportEliteHeroRedesign(proposal:any,snapshot:Snapshot,check:boolean){
 const spec=proposal.eliteHeroRedesign;
 assert.equal(spec.status,'PROPOSAL_NOT_RUNTIME');
 assert.equal(spec.elites.length,90);assert.equal(spec.heroes.length,18);
 assert.deepEqual(spec.elites.map((e:any)=>e.id).sort(),Object.keys(ELITES).sort());
 assert.deepEqual(spec.heroes.map((h:any)=>h.id).sort(),[...ALL_HERO_IDS].sort());
 assert.equal(spec.elites.filter((e:any)=>e.origin==='USER_SAMPLE').length,21);
 assert.equal(new Set(spec.elites.map((e:any)=>e.name)).size,90);
 for(const e of spec.elites){assert.ok(spec.bodyPresets[e.body],e.id+': missing body preset');for(const key of ['loop','limit','visual'])assert.ok(e[key].length>0,e.id+'/'+key);for(const [key,values] of Object.entries(e.parameters))if(key.endsWith('ByRank'))assert.equal((values as unknown[]).length,5,e.id+'/'+key);}
 for(const f of ALL_FAMILIES)assert.equal(spec.elites.filter((e:any)=>e.id.startsWith(f+'.')).length,3);
 const elites=new Map<string,any>(spec.elites.map((e:any)=>[e.id,e]));
 const heroes=new Map<string,any>(spec.heroes.map((h:any)=>[h.id,h]));
 assert.deepEqual([...new Set(spec.heroes.flatMap((h:any)=>h.peerIds))].sort(),Object.keys(ELITES).sort(),'every elite has a hero-role review mapping');
 for(const group of [spec.eliteGrowth,spec.heroGrowth])for(const [key,values] of Object.entries(group)){assert.equal((values as any[]).length,5,key);assert.ok((values as number[]).every(Number.isFinite));}
 const ep=(id:string)=>elites.get(id).parameters;
 assert.equal(ep('marine.1').moveFactor,.9);assert.equal(ep('marine.1').warmupSeconds,5);assert.equal(ep('marine.1').attackSpeedIncrease,3);assert.equal(ep('marine.1').maximumSeconds,10);assert.equal(ep('marine.1').forcedCoolingSeconds,2);
 assert.equal(ep('marine.2').eliteDamageFactor,3);assert.equal(ep('marine.2').bossDamageFactor,5);assert.equal(ep('marine.3').familyAttributeIncrease,.2);
 assert.equal(ep('reaper.1').shotsPerCycle,6);assert.equal(ep('reaper.2').openingCycles,10);assert.equal(ep('reaper.2').openingDamageFactor,3);assert.equal(ep('reaper.2').splashFraction,.5);
 assert.equal(ep('reaper.3').familyOnly,true);assert.equal(spec.loneHunter.scope,'REAPER_FAMILY_ONLY_USER_CONFIRMED');
 assert.equal(ep('hellion.1').lengthIncrease,3);assert.equal(ep('hellion.2').fanDegrees,150);assert.equal(ep('hellion.2').lengthIncrease,1);
 assert.equal(ep('hellion.1').attackRangeFactor,1+ep('hellion.1').lengthIncrease);assert.equal(ep('hellion.2').attackRangeFactor,1+ep('hellion.2').lengthIncrease);
 assert.equal(ep('hellion.3').minePeriod,12);assert.equal(ep('hellion.3').mineCount,2);assert.equal(ep('hellion.3').fireSeconds,2);
 assert.equal(ep('tank.2').siegeDamageIncrease,1);assert.equal(ep('tank.2').siegeAttackSpeedIncrease,1);assert.equal(ep('tank.2').siegeRangeIncrease,2);
 assert.equal(ep('tank.3').blastInterpretation,'AREA_USER_CONFIRMED');assert.equal(ep('tank.3').blastAreaFactor,5);assert.ok(Math.abs(ep('tank.3').blastRadiusFactor**2-5)<1e-9);assert.equal(ep('tank.3').fireSeconds,1);assert.equal(ep('medivac.2').healTargets,5);
 assert.equal(spec.combat.outOfCombatSeconds,2);
 function base(e:any){return snapshot(ELITES[e.id as keyof typeof ELITES].family,5,undefined,e.parameters.weaponMode,e.benchmarkWeapon);}
 function eliteStats(e:any,index:number){const b=base(e),c=spec.bodyPresets[e.body],g=spec.eliteGrowth;return {hp:b.hp*c.hp*g.hp[index],shield:b.shield*c.shield*g.hp[index],armor:b.armor+c.armorAdd+g.armorAdd[index],dps:b.dps*c.dps*g.dps[index],support:b.support*(c.heal??1)*g.fixedDamageAndHeal[index]};}
 function eliteDurability(e:any,index:number){const s=eliteStats(e,index),p=e.parameters;return(s.hp+s.shield)*(1+(p.familyAttributeIncrease??p.allyHpIncrease??0))*(e.id==='reaper.3'?p.hpAsymptoteFactor:1);}
 function fixedEnvelope(e:any,index:number,bossHp:number){const p=e.parameters,g=spec.eliteGrowth.fixedDamageAndHeal[index];let fixed=0;
  if(p.mineDamageI)fixed+=(p.mineDamageI+p.fireDamagePerSecondI*p.fireSeconds)*p.mineCount/p.minePeriod;
  if(p.landingDamageI)fixed+=p.landingDamageI/p.landingCooldown;
  if(p.rainDpsI)fixed+=p.rainDpsI;
  if(p.bileBaseDamageI){const count=p.bileCount??1,damage=p.bileDamageFactor??1,armored=p.armoredAndBuildingDamageFactor??1;fixed+=p.bileBaseDamageI*count*(p.bilePacketFraction??1)*damage*armored/(p.bileBaseCooldown*(p.bileCooldownFactor??1));}
  if(p.poisonDpsPerStackI)fixed+=p.poisonDpsPerStackI*p.poisonStacks;
  if(p.poisonDpsI)fixed+=p.poisonDpsI;
  if(p.stompDamageI)fixed+=p.stompDamageI/p.chargeCooldown;
  if(p.chargeDamageI)fixed+=p.chargeDamageI/p.chargeCooldown;
  if(p.fireDpsI)fixed+=p.fireDpsI;
  if(p.radiationDpsI)fixed+=p.radiationDpsI;
  if(p.fixedFeedbackDamageI)fixed+=p.fixedFeedbackDamageI/p.feedbackCooldown;
  if(p.stormBaseTotalI)fixed+=p.stormBaseTotalI*p.totalStormDamageMultiplier/p.stormBaseCooldown;
  if(p.ordinaryMaxHpPerSecondByRank)fixed+=bossHp*p.ordinaryMaxHpPerSecondByRank[index]*p.bossMaxHpPerSecondFactor/g;
  return fixed*g;
 }
 function eliteEnvelope(e:any,index:number){const b=base(e),s=eliteStats(e,index),p=e.parameters;const explicitAttribute=Object.keys(p).some(k=>/^(light|armored|airArmored)DamageFactor$/.test(k));return s.dps*e.primaryEnvelope*(explicitAttribute?1:b.maxBonusFactor)+fixedEnvelope(e,index,Math.max(proposal.benchmark.easyStage12Hp,proposal.benchmark.easyEndlessRound3NewBossHp));}
 const window=spec.benchmarkSeconds;
 function heroWeapon(h:any,index:number){const p=h.parameters,g=spec.heroGrowth;const baseDps=h.id==='purifier_flagship'?p.interceptors*p.childDamage*p.childAttacks/p.childPeriod:h.body.damage*h.body.attacks/h.body.period;return baseDps*g.dps[index];}
 function heroMain(h:any,index:number){const s=proposal.damageSkills.find((s:any)=>s.id===h.id);return s?proposal.yamatoDamageByRank[index]*s.packets.reduce((a:number,b:number)=>a+b,0)/s.cooldown:0;}
 function heroEnvelope(h:any,index:number){const p=h.parameters,g=spec.heroGrowth;let d=heroWeapon(h,index),f=1;
  if(h.id==='raynor')f=(1+p.teamDamageIncrease)*(1+p.teamAttackSpeedIncrease)*(1+p.personalExtraPacketFraction/p.personalEveryCycles);
  if(h.id==='tychus')f=(1+p.maximumAttackSpeedIncrease)*(window-p.warmupSeconds)/window+(1+p.maximumAttackSpeedIncrease/2)*p.warmupSeconds/window;
  if(h.id==='nova')f=p.eliteAndBossDamageFactor;
  if(h.id==='tosh')f=1+p.psionicPacketFraction/p.everyCycles;
  if(h.id==='kerrigan')f=1; // The cleave is secondary, so the primary budget receives no free cleave damage.
  if(h.id==='zagara')f=1+p.teamAttackSpeedIncrease;
  if(h.id==='stukov')f=1+p.grenadeDamageFraction/p.grenadeEveryCycles;
  if(h.id==='alarak'){const period=h.body.period*g.periodFactor[index],cycles=Math.floor(window/period);let sum=0;for(let i=0;i<cycles;i++)sum+=1+p.damagePerStack*Math.min(p.powerStacks,Math.floor(i/p.hitsPerStack));f=sum/cycles;}
  if(h.id==='fenix')f=1+(p.solarDamageFactor-1)/p.solarEveryCycles;
  // Zeratul/Vorazun/Dehaka/flagships receive no credit for their conditional growth/openers.
  d=d*f+heroMain(h,index);if(p.tentacleDamageI)d+=p.tentacleDamageI*g.fixedPassiveDamageAndHeal[index]/p.tentaclePeriod;return d;
 }
 function supportCompare(h:any,index:number){const p=h.parameters,g=spec.heroGrowth.fixedPassiveDamageAndHeal[index];
  if(h.id==='swann')return {hero:p.repairDpsPerBodyI*p.repairBodies*g,elite:Math.max(...h.peerIds.map((id:string)=>{const e=elites.get(id);return eliteStats(e,index).support*(e.parameters.healTargets??e.parameters.repairTargets??1);})),label:'七体机械修复上限/秒 vs 精英医修上限/秒'};
  if(h.id==='niadra')return {hero:p.healDpsPerBodyI*p.healBodies*g,elite:ep('queen.2').healDpsI*ep('queen.2').healTargets*spec.eliteGrowth.fixedDamageAndHeal[index],label:'七体生物哺育/秒 vs 五体输血峰值/秒'};
  if(h.id==='artanis')return {hero:p.shieldDpsPerBodyI*p.shieldBodies*g,elite:ep('sentry.1').shieldRestorePerSecondI*ep('sentry.1').targets*spec.eliteGrowth.fixedDamageAndHeal[index],label:'七体原生回盾/秒 vs 精英织盾/秒'};
  if(h.id==='vorazun'){const control=proposal.supportSkills.find((s:any)=>s.id===h.id);return {hero:control.durationByRank[index]/control.cooldown,elite:ep('sentry.2').ordinaryStasisSeconds/ep('sentry.2').controlCooldown,label:'普通敌停滞时间/CD；另列更大范围、自身火力与帷幕'};}
  return null;
 }
 const budgetFailures:string[]=[];
 const audits=spec.heroes.map((h:any)=>{const metric=[0,1,2,3,4].map(i=>{const support=supportCompare(h,i);const selected=support??{hero:heroEnvelope(h,i),elite:Math.max(...h.peerIds.map((id:string)=>eliteEnvelope(elites.get(id),i))),label:'主目标等效/秒：英雄完整循环 vs 精英持续峰值＋固定包上界'};const ratio=selected.hero/selected.elite;return {...selected,ratio};});
  for(const [i,m] of metric.entries())if(m.ratio+1e-9<spec.heroSuperiorityMinimum)budgetFailures.push(`${h.id} rank ${i+1}: ${n(m.hero)}/${n(m.elite)}=${n(m.ratio)}, below ${spec.heroSuperiorityMinimum}`);
  const durability=[0,1,2,3,4].map(i=>{const hero=(h.body.hp+h.body.shield)*spec.heroGrowth.hpAndShield[i];const elite=Math.max(...h.peerIds.map((id:string)=>eliteDurability(elites.get(id),i)));if(hero/elite<spec.heroSuperiorityMinimum)budgetFailures.push(`${h.id} rank ${i+1} durability ${n(hero/elite)}`);return {hero,elite,ratio:hero/elite};});
  return {h,metric,durability};
 });
 assert.deepEqual(budgetFailures,[],'hero-role design budget needs revision');
 const lines=['# 90精英与18英雄重设计 · P0 r2 · 2026-10-03',
 '状态：**设计提案可审阅，运行未实施。** 用户要求以21款人族样例重做精英，并让英雄强于精英、符合兵种与人物性格。本稿是 [P0统一设计](NEXT_ITERATION_P0_20261003.md) 的战斗设计修订；覆盖其旧“精英/英雄机体保留”提案，不覆盖已批准的运行规则。数值唯一源为 [P0提案JSON](NEXT_ITERATION_P0_VALUES_20261003.json) 的 `eliteHeroRedesign`，原有18英雄主动技能包仍来自同一JSON。',
 '## 设计口径与强度阶梯',
 '普通兵提供基础职责；每款精英有一个改变作战循环的核心机制；英雄具有强力本体、符合身份的持续能力与标志主动技。每家族三个精英沿用原稳定ID与真实模型，仅改显示名称/机制提案，不新增家族。默认三型共存规则保留；用户已确认孤星猎手仅使死神家族只留一人，其他家族和英雄照常。仍最多三个英雄。',
 '所有新机体、增长、未给定技能参数、叠加规则与保护分配均为提案。表中【用户】只标用户给出的数值及后续明确答复，不表示整行参数获批；【提案】为本次补齐，【派生】为由用户数值直接计算。+300%是4倍，300%伤害是3倍；+100%是2倍，+200%是3倍。毁灭者以用户最新纠正为准：爆炸面积+400%=5倍，半径√5约2.236倍。',
 '精英I机体以同家族当前普通V的最终属性为基底，替换旧精英模板及旧独有效果，不能再乘旧模板。基础DPS倍率与精英等级DPS成长入武器单包，周期保留当前普通V；只有明确的变体攻速/弹次机制改变周期/次数。逐款机体栏均未计独有效果/光环；强度核算另计指挥官、女武神、母巢女王自受光环与猎手增长。新轻甲/重甲词条的“总倍率”替换该精英旧同属性额外项；未写新词条的原武器属性加成仍保留。身份伤害倍率取精英/Boss一种，再按合法新武器词条一次；无隐含第二次成长。支援机体的医修倍率用于原真实能量治疗通道。',
 table(['机体提案','HP/原生盾×普通V','基础DPS×普通V','护甲+','移动×','原医修×'],Object.entries(spec.bodyPresets).map(([id,c]:[string,any])=>[id,`${c.hp}/${c.shield}`,c.dps,c.armorAdd,c.move,c.heal??1])),
 table(['I—V成长','I','II','III','IV','V'],[['精英基础DPS/固定伤害与治疗',...spec.eliteGrowth.dps],['精英HP/原生盾',...spec.eliteGrowth.hp],['精英护甲增加',...spec.eliteGrowth.armorAdd],['英雄DPS/固定被动量',...spec.heroGrowth.dps],['英雄HP/原生盾',...spec.heroGrowth.hpAndShield],['英雄周期因子',...spec.heroGrowth.periodFactor],['英雄护甲增加',...spec.heroGrowth.armorAdd]]),
 '英雄机体表为已含当前友军/英雄15%适配的最终I级基础值，不再乘两套旧适配，也不再乘旧heroStats成长。高等级武器总DPS按新成长；单包因子=新DPS成长×新周期因子，周期乘新周期因子。所属截击机只沿父舰新成长继承一次。主动技另沿D的1/1.4/1.8/2.2/2.6，不能再乘机体成长。',
 '## 90精英完整设计'];
 for(const race of RACES){lines.push('## '+RACE_NAMES[race]+'精英');for(const family of FAMILIES_BY_RACE[race]){const rows=spec.elites.filter((e:any)=>ELITES[e.id as keyof typeof ELITES].family===family);lines.push('### '+SC2_UNITS[family].zh,table(['稳定ID／新名称','核心打法','I机体HP/盾；基础DPS或医修 → V','核心参数与来源','结算/代价','实际表现'],rows.map((e:any)=>{const low=eliteStats(e,0),high=eliteStats(e,4);return[e.id+' '+e.name+(e.origin==='USER_SAMPLE'?'【用户样例】':'【新提案】'),e.loop,`${n(low.hp)}/${n(low.shield)}；DPS ${n(low.dps)}${low.support?'；医修'+n(low.support)+'/s':''} → ${n(high.hp)}/${n(high.shield)}；DPS ${n(high.dps)}${high.support?'；医修'+n(high.support)+'/s':''}`,parameterText(e),e.limit,e.visual];})));}}
 lines.push('## 18英雄完整设计',
 '本体不再沿用旧保守普攻/耐久。以下每位都列人物/平台定位、持续能力、主技能与精英差距。人物设定参考下方Blizzard文字资料；具体被动、数值和组合为本作新设计，并非声称原作就有这些技能。三艘英雄舰以作战纲领塑造身份，不擅造人物履历。托什、妮雅德拉保留已锁定原战役角色和身体，其灵能/寄生延伸标为本作设计，未新增外部剧情事实。');
 for(const race of RACES){
  lines.push('## '+RACE_NAMES[race]+'英雄');
  for(const id of HERO_IDS_BY_RACE[race]){
   const h=heroes.get(id)!,s=proposal.damageSkills.find((s:any)=>s.id===id),p=proposal.supportSkills.find((s:any)=>s.id===id);
   const supportText=p?(id==='swann'?'五秒机械敌伤无敌＋四次维修，最多七体':id==='artanis'?'八秒持续原生回盾，最多七体':id==='niadra'?'八秒登记最多七生物名额、共享I—V两到四次复生，起手群疗':`范围${p.range}/半径${p.radius}，普通敌${p.durationByRank[0]}—${p.durationByRank[4]}秒停滞，Boss移速/攻速减${n(p.bossSlowByRank[0]*100)}—${n(p.bossSlowByRank[4]*100)}%`):'';
   lines.push('### '+HEROES[id].name+'（'+id+'）',h.doctrine+'。',
    `**I级本体提案：** HP ${h.body.hp}，原生盾 ${h.body.shield}，护甲 ${h.body.armor}，基础主目标DPS ${n(heroWeapon(h,0))}，射程 ${h.body.range}，移动 ${h.body.speed}。${id==='purifier_flagship'?'母舰无普通武器，上述DPS为十二架现存子机合计。':`武器 ${h.body.damage}×${h.body.attacks}／${h.body.period}秒。`}`,
    `**持续能力：** ${h.passive}`,
    `**被动参数提案：** ${Object.entries(h.parameters).filter(([k])=>!k.startsWith('benchmark')).map(([k,v])=>`${names[k]??k}=${value(k,v)}`).join('；')}。`,
    s?`**主技能：** ${HEROES[id].skill}，${s.structure}；I完整主目标包 ${n(proposal.yamatoDamageByRank[0]*s.packets.reduce((a:number,b:number)=>a+b,0))}，V ${n(proposal.yamatoDamageByRank[4]*s.packets.reduce((a:number,b:number)=>a+b,0))}，CD ${s.cooldown}秒。${s.risk}。`:`**主技能：** ${supportText}；CD ${p.cooldown}秒。对象/期限/消耗与溢出沿P0四保护和控制合同。`,
    `**强于精英的地方：** ${h.strength}`,`**身份与边界：** ${h.risk}`);
  }
 }
 lines.push('## 同级强度核算：英雄要强于精英',
 `下表为零天赋/科技/全队牌的设计算术。以I/V同等级比较；每位列出的对应精英均参与职责复审，合集覆盖90款。输出英雄取${window}秒理想连续攻击的平均被动火力＋主技能完整预算/CD；精英取选定主武器持续峰值与额外固定伤害上界。这种比较对精英更宽松：即使精英实际要预热、停火或只有首十周期，仍可按峰值持续计算；英雄近身、暴击、开场、帷幕、子机超载、精华成长和队友增益收益大部分不计。`,
 '精英总倍率是文档显式上界，不是实际60秒模拟。穿刺/弹跳/雨区/风暴/火区/百分比侵蚀需按各自合法目标。百分比侵蚀在所有等级均取两个简单Boss基准中较高的23520HP作上界；不是改Boss血量。I—V各级均检查，表仅展示I/V。雷兽第三击、重判屏障破裂等特定峰值可短时高于常态英雄，但本稿以这些峰值给精英更高比较预算。支援英雄用有效医修/盾修/控制时间另比，本体耐久另核，不能把复生、无敌与假治疗折成伤害。',
 table(['英雄','参与职责比较的精英','核心比较','I：英雄/精英；比例','V：英雄/精英；比例','I/V基础总耐久比'],audits.map(({h,metric,durability}:any)=>[HEROES[h.id as keyof typeof HEROES].name,h.peerIds.map((id:string)=>elites.get(id).name).join('、'),metric[0].label,`${n(metric[0].hero)}/${n(metric[0].elite)}；${n(metric[0].ratio)}倍`,`${n(metric[4].hero)}/${n(metric[4].elite)}；${n(metric[4].ratio)}倍`,`${n(durability[0].ratio)}／${n(durability[4].ratio)}倍`])),
 `主职责预算与基础总耐久均要求至少${spec.heroSuperiorityMinimum}倍。不是承诺所有单项都更长、更快、更大，也不是保证一名英雄压过五款精英总和；虎式39射程、毁灭者5倍爆炸面积、精英杀手Boss专攻各保留自己的价值。英雄在同职责完整能力更强，不剥掉精英特色。`,
 '这些是人工设计预算与静态推导，不是战斗、平衡、帧率或视觉验收。AOE另须后续按1/5/20合法目标核对实际每包覆盖，300敌人不凭总人数全命中；不在本次追加大型通关验收。',
 '## 战斗循环、增长与保存边界',
 '有武器单位进战以第一次真实武器周期开火为准，命中与否不影响开火记录；两秒无开火脱战。法术、治疗、受伤、仅索敌不擅算枪兵/死神开火；近战沿真实武器周期。无武器医修单位另以对交战友军的有效治疗入战；受益者最近两秒真实开火或承受敌伤即为交战，两秒没有这类有效治疗则医救脱战。微光护盾据此可真实触发，不等待不存在的医疗艇枪击。所有预热、热量、首十周期、储能、雷周期、光环、毒囊、屏障、精华、命中计数都走60Hz战斗时间；暂停/商店/失焦停模拟，读档恢复剩余量，不靠壁钟离线充能。大枪管按周期计十次，六发午夜死神仍是一周期，不给六次重开权。',
 '孤星猎手采用明确的渐近增长提案：N为被吸收死神的基础DPS与基础HP各半权重的普通I等价量，排除天赋、全队卡、其他光环、临时状态与历史已吸收贡献。s=N/(N+20)，火力=DPS0×(1+3s)，HP=HP0×(1+4s)，护甲=甲0+10s。每次合法收集继续增长，渐近4倍火力/5倍HP/加10护甲，避免无限收集最终越过英雄的等级阶梯；上限曲线没有获得数值批准。初始有三死神精英时，另外两位的属性被吸收，技能不复制，其唯一身份继续占“已拥有”防重复卡。猎手死亡时这个名额与吸收身份按永久精英阵亡规则消失，不复用已消费吸收收据。',
 table(['N等价量','火力×DPS0','HP×HP0','护甲增加'],spec.loneHunter.examples.map((N:number)=>{const s=N/(N+ep('reaper.3').growthK);return[N,n(1+(ep('reaper.3').dpsAsymptoteFactor-1)*s),n(1+(ep('reaper.3').hpAsymptoteFactor-1)*s),n(ep('reaper.3').armorAsymptoteAdd*s)];})),
 '猎手须安全入队后原子吸收已经到账的死神，不能先销毁再发现无合法落点。已付款训练/投送继续交付，到达时转为一次吸收；账本、原等级、属性贡献、稳定身份、支付/交付/吸收收据均保留，重试或读档不得重复增长。猎手已经阵亡时，尚未到账死神仍按原付费单位安全交付，不据消失的吸收目标销毁；后续家族恢复普通规则。用户只批准单死神家族身体，并未批准免费退款、退休奖励、消费其他家族或把全军删成单人。未来实施必须同步审计满编替换与精英名额，不在文档阶段改存档。',
 '同名增益光环取最强一份；不同来源的同类伤害/攻速加值先相加再乘一次，HP/盾/护甲分别计算。主包、溅射、贯穿、毒伤、反伤、回响与死亡传播都有源类型；派生包不递归生成同类包或触发趣味卡链。临时单位/子机不能产生付费编制、永久奖励或无限孵化链。获得/失去HP上限光环保留已损HP比例，升级按现有损失口径，不给满血套利。',
 '击退/牵引/冲锋/降落遵守原合法路径与可落点；Boss/领主按显式免位移/降强度条款，不暗削血量。残火/腐土/辐照/百分比侵蚀走实际伤害包，不能直接改HP绕过无敌/屏障。伤害减免、原生盾、临时盾、有限屏障、生命储备、敌伤无敌、复生权分开结算，沿P0持久化与复生/升级合同。',
 '## 原作身份、真实素材与后续复审',
 table(['参考的角色特征','原始文字依据'],loreSources.map(([scope,title,url])=>[scope,`[${title}](${url})`])),
 '普通族群特点、当前目标层、变形模式、原始模型/角色锁定同时参考 [原作来源索引](../BUILD_RESEARCH.md)、[战斗素材计划](../MVP10_COMBAT_ASSETS.md)、[9月29日英雄地图表现合同](HERO_MAP_UI_20260929.md) 与 [当前能力基线](NEXT_ITERATION_P0_CAPABILITIES_20261003.md)。叙事只决定设计方向，不能把本作雷区、复生、保护与倍率说成原作已存在的同名规则。未补查证的托什/妮雅德拉新叙事不冒充官方文本。',
 '表现以原身体、局部甲色/肤色、真实武器节奏、真实接触与状态为主；需要新攻击通道时先确认原挂点/动画，没有素材不得用另一单位或生成几何冒充。三款全息科技球原死亡片段仍缺，本稿不伪造补齐。只读取官方文字，没有传出原始素材/本地截图。',
 '下一步复审对象：五机体提案、精英/英雄成长、90款未给参数、18英雄机体与被动、孤星渐近曲线、光环叠加/状态边界，以及先前P0主动技能/保护/冷却。本次不改变runtime或schema14/profile v5，不开展资源清理、云端配置或Coze账号部署；M6/M7/人工视觉/物理手机与手柄/科技球源片缺口继续OPEN。',
 '生成：`node --import tsx tools/docs/export-next-iteration-p0.mts`；一致性核对追加90款ID、用户样例数值、18英雄映射、同级预算与本体耐久。核对通过不代表游戏实现或验收。');
 const generated=lines.join('\n\n')+'\n';
 if(check)assert.equal(fs.readFileSync(out,'utf8').replaceAll('\r\n','\n'),generated,'elite/hero design differs; regenerate and review');else fs.writeFileSync(out,generated,'utf8');
 return {path:out,elites:90,heroes:18,userSamples:21,heroRoleComparisons:18};
}
