import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {revision,eliteChanges,heroChanges,stackingRules} from './aura-rebalance-design-20261005.mjs';

const root=path.resolve(import.meta.dirname,'../..');
process.chdir(root);
const check=process.argv.includes('--check');
const dir='reports/local/aura-rebalance-20261005';
const mainPath='docs/project/TEAM_AURA_REBALANCE_20261005.md';
const valuesPath='docs/project/TEAM_AURA_REBALANCE_VALUES_20261005.json';
const coveragePath='docs/project/TEAM_AURA_REBALANCE_COVERAGE_20261005.md';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const n=x=>Number(x.toFixed(6));
const pct=x=>n(x*100)+'%';
const table=(headers,rows)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.map(v=>String(v??'').replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |')].join('\n');
const write=(p,t)=>{if(check)assert.equal(read(p),t,p+' is stale');else fs.writeFileSync(p,t);};
const p0Path='docs/project/NEXT_ITERATION_P0_VALUES_20261003.json';
const p4Path='docs/project/NEXT_ITERATION_P4_VALUES_20261005.json';
const p0=json(p0Path),p4=json(p4Path),baseline=json(dir+'/baseline.json');
const approved=p4.approved.elites,byId=new Map(approved.map(e=>[e.id,e]));
const oldAuraBody=read('src/data/hero-upgrades.ts').match(/export const HERO_GROUND_AURAS=\{([\s\S]*?)\n\} as const/)[1];
const oldAuras=Object.fromEntries([...oldAuraBody.matchAll(/([a-z_]+):\{([^}]+)\}/g)].map(m=>[m[1],Object.fromEntries([...m[2].matchAll(/(\w+):('[^']*'|-?(?:\d*\.)?\d+)/g)].map(p=>[p[1],p[2].startsWith("'")?p[2].slice(1,-1):Number(p[2])]))]));
assert.equal(Object.keys(oldAuras).length,18);
const originalAuraLabels={damage:'武器伤害＋',speed:'攻速＋',armor:'生命护甲＋',shieldArmor:'盾护甲＋',vulnerability:'受到武器伤害＋',slow:'敌攻速－',suppression:'敌武器伤害－'};
const oldAuraText=id=>{const a=oldAuras[id];return '半径'+a.radius+'；'+Object.entries(a).filter(([k])=>k in originalAuraLabels).map(([k,v])=>originalAuraLabels[k]+(k.includes('Armor')||k==='armor'?v:pct(v))).join('，');};
const changed=new Map(eliteChanges.map(e=>[e.id,e]));
const heroes=new Map(heroChanges.map(h=>[h.id,h]));
const originalSnapshot=e=>({id:e.id,name:e.name,race:e.race,body:e.body,origin:e.origin,userConfirmedParameterKeys:e.userConfirmedParameterKeys??[],parameters:e.parameters,loop:e.loop,limit:e.limit});
const coverage=approved.filter(e=>e.race!=='terran').map(e=>({
  ...originalSnapshot(e),runtimeStatus:e.race==='zerg'?'P4B_PRESENT_UNCHANGED_THIS_TURN':'P4_NOT_FORMALLY_INTEGRATED',
  disposition:changed.has(e.id)?'TEAM_EFFECT_REDESIGNED':'CORE_ROLE_RETAINED',
  proposal:changed.has(e.id)?changed.get(e.id):null
}));
const terranSamples=approved.filter(e=>e.race==='terran'&&e.origin==='USER_SAMPLE').map(originalSnapshot);
const anchorIds=[...new Set(eliteChanges.flatMap(e=>e.anchorIds).concat(heroChanges.flatMap(h=>h.anchorIds)))];
const anchors=anchorIds.filter(id=>byId.get(id)?.race==='terran').map(id=>originalSnapshot(byId.get(id)));
const oldTerranHeroIds=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const values={
  schemaVersion:1,revision,status:'DESIGN_DELIVERY_NOT_RUNTIME',gameplayChangedByThisTask:false,
  userRequest:'以我人族精英为样本，重新设计平衡另外两族精英和英雄的光环效果。',
  scope:{eliteCoverage:60,redesignedEliteTeamEffects:16,retainedEliteCoreRoles:44,redesignedHeroes:12,terranHeroes:'REFERENCE_ONLY_UNCHANGED'},
  provenance:{originalP0:{path:p0Path,sha256:sha(p0Path)},approvedP4:{path:p4Path,sha256:sha(p4Path)},readOnlyAudit:'reports/local/buff-strength-audit-20261005/audit.json',authorship:'Original USER_SAMPLE identities and explicit userConfirmedParameterKeys are preserved; all new values in this revision are authored design proposals, not historical user quotations.'},
  rankPolicy:{percentagesRadiusCooldownDurationTargets:'FIXED_I_TO_V',retainedFixedDamageAndHealingGrowth:p4.approved.eliteGrowth.fixedDamageAndHeal},
  originalTerranUserSamples:terranSamples,comparisonAnchors:anchors,
  retainedEliteEnergyChannels:p4.proposedImplementation.eliteEnergyChannels,
  elites:coverage,
  heroes:heroChanges.map(h=>({...h,previousFootAura:oldAuras[h.id],previousFootAuraText:oldAuraText(h.id)})),
  retainedTerranHeroFootAuras:Object.fromEntries(oldTerranHeroIds.map(id=>[id,oldAuras[id]])),
  stackingRules,
  presentation:{approvedAttackSkillModelMaterialBytes:'UNCHANGED',visibleHeroFootAuras:true,auraTextOnBattlefield:false,fullQualityCorePreserved:true,newTeamEffectDirection:'Reuse original race textures on source feet and actual recipients; no persistent joining lines, oversized plain circles or inflated attack reach.'},
  actualRuntime:{runSchema:22,profileVersion:5,protossEliteP4Integrated:false,newParametersImported:false},
  acceptance:{designMathOnly:true,liveCombatValidated:false,naturalCampaignValidated:false,humanVisualValidated:false}
};

// Arithmetic checks are design comparisons, not a second or fake World runtime.
const checks=[];
const record=(name,condition,detail)=>{assert.ok(condition,name);checks.push({name,...detail});};
const near=(a,b)=>Math.abs(a-b)<1e-9;
const dps=s=>(1+(s.damage??0))*(1+(s.speed??0));
const enemyDps=(s,k=1)=>(1-s.weaponSuppression*k)*(1-s.attackSlow*k);
record('two-race coverage and stable identities',coverage.length===60&&new Set(coverage.map(e=>e.id)).size===60,{elites:60});
record('eight new team roles per race',eliteChanges.length===16&&new Set(eliteChanges.map(e=>e.id)).size===16&&['zerg','protoss'].every(r=>eliteChanges.filter(e=>byId.get(e.id).race===r).length===8),{changed:16,retained:44});
record('six heroes per race; no Terran hero redesign',heroChanges.length===12&&new Set(heroChanges.map(h=>h.id)).size===12&&['zerg','protoss'].every(r=>heroChanges.filter(h=>h.race===r).length===6)&&oldTerranHeroIds.every(id=>!heroes.has(id)),{heroes:12});
record('twenty-one original Terran sample identities',terranSamples.length===21,{count:terranSamples.length});
for(const a of anchors){const original=p0.eliteHeroRedesign.elites.find(e=>e.id===a.id);assert.deepEqual(a.parameters,original.parameters);}
record('all baseline parameters copied exactly from approved P0/P4',true,{anchors:anchors.length});
for(const e of eliteChanges){
  const original=byId.get(e.id);assert.ok(original);
  for(const [key,value]of Object.entries(e.replacements??{})){assert.ok(key in original.parameters,e.id+': missing replaced key '+key);assert.ok(Number.isFinite(value));}
  assert.ok(e.radius===null||e.radius>0);
  assert.ok(e.rules.length>0&&e.retained&&e.presentation);
  for(const id of e.anchorIds)assert.ok(byId.has(id),e.id+' anchor '+id);
}
for(const h of heroChanges){assert.ok(oldAuras[h.id]);assert.ok(h.radius===null||h.radius>0);assert.ok(h.retained);for(const id of h.anchorIds)assert.ok(byId.has(id));}
const finiteNumbers=v=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finiteNumbers):v&&typeof v==='object'?Object.values(v).every(finiteNumbers):true;
record('all proposed numeric values finite',finiteNumbers([...eliteChanges,...heroChanges]),{note:'radius=null on a command denotes global coverage; hydralisk.3 instead follows existing real poison targets, explicitly marked by rangeMode.'});
const commanderPct=byId.get('marine.3').parameters.familyAttributeIncrease;
const commanderDps=(1+commanderPct)**2;
record('Commander composite output anchor',near(commanderDps,1.44),{dpsFactor:n(commanderDps),hpFactor:1.2});
for(const id of ['zergling.3','zealot.3']){const e=changed.get(id);record(id+' matches every family-command attribute',Object.values(e.stats).every(x=>near(x,commanderPct))&&e.radius===null,{dpsFactor:n(dps(e.stats))});}
const heroOffense=heroChanges.filter(h=>h.kind==='buff'&&h.stats.damage!==undefined).map(h=>({id:h.id,name:h.name,recipients:h.recipients,dpsFactor:n(dps(h.stats)),relativeToCommander:n(dps(h.stats)/commanderDps)}));
for(const h of heroOffense)record(h.id+' primary role output exceeds Commander by 25%',h.dpsFactor>=commanderDps*1.25-1e-9,h);
const suppressor=byId.get('marauder.1').parameters;
const suppressionBase={weaponSuppression:suppressor.attackDamageReduction,attackSlow:suppressor.attackSpeedReduction,moveSlow:suppressor.moveReduction};
record('Terran suppression normal/Boss anchor',near(enemyDps(suppressionBase),.455)&&near(enemyDps(suppressionBase,suppressor.bossControlFactor),.70125),{normalRemaining:.455,bossRemaining:.70125});
for(const id of ['queen.3','sentry.2']){const e=changed.get(id);record(id+' whole suppression package matches anchor',near(enemyDps(e.stats),.455)&&near(enemyDps(e.stats,e.bossControlScale),.70125),{normalRemaining:n(enemyDps(e.stats)),bossRemaining:n(enemyDps(e.stats,e.bossControlScale))});}
const heroSuppression=heroChanges.filter(h=>h.stats.weaponSuppression!==undefined).map(h=>({id:h.id,name:h.name,normalRemaining:n(enemyDps(h.stats)),bossRemaining:n(enemyDps(h.stats,h.bossControlScale)),moveReduction:h.stats.moveSlow}));
for(const h of heroSuppression)record(h.id+' suppression beats the complete elite package',h.normalRemaining<.455&&h.bossRemaining<.70125&&h.moveReduction>=.45,h);
const queen=changed.get('queen.1'),medical=byId.get('medivac.1').parameters,niadra=heroes.get('niadra');
record('Queen biological protection exceeds medical-command axes',queen.stats.maxHp>medical.allyHpIncrease&&queen.stats.armorFlat>medical.allyArmorAdd&&queen.radius>medical.radius,{hp:.45,armor:6,regen:.02,radius:9,qualification:'Biological recipients only; not an unrestricted all-unit upgrade.'});
record('Niadra protection exceeds redesigned Queen axes',niadra.stats.maxHp>queen.stats.maxHp&&niadra.stats.armorFlat>queen.stats.armorFlat&&niadra.stats.regenHpPerSecond>queen.stats.regenHpPerSecond&&niadra.radius>queen.radius,{hp:.60,armor:10,regen:.03,radius:12});
const artanis=heroes.get('artanis'),sentry=changed.get('sentry.1');
const shieldMix=[];
for(let i=0;i<=10;i++){
  const shieldFraction=i/10,lifeFraction=1-shieldFraction;
  const artanisEhp=(lifeFraction+(1+artanis.stats.maxShield)*shieldFraction)/(1-artanis.stats.damageReduction);
  const sentryEhp=((1+sentry.stats.maxHp)*lifeFraction+(1+sentry.stats.maxShield)*shieldFraction)/(1-byId.get('sentry.1').parameters.damageReduction);
  const entry={shieldFraction,artanisEhp:n(artanisEhp),sentryEhp:n(sentryEhp),assumptions:'Equal pre-aura HP+shield pool, zero armor, full shields, no healing, sentry paid protection already active; shieldFraction=0 is a mathematical boundary, not an eligible recipient.'};
  record('Artanis protection vs fully active Sentry; shield fraction '+shieldFraction,artanisEhp>sentryEhp,entry);shieldMix.push(entry);
}
record('Artanis I actual shield-heal budget retains 25% lead over Sentry V',560>=180*2.4*1.25,{heroPerTargetI:560,elitePerTargetV:432,heroTargets:7,eliteTargets:7,scope:'Fixed effective missing-shield budget only; energy and active-window availability remain separate.'});
const plagueV=byId.get('banshee.2').parameters;
const plagueBase={ordinary:plagueV.ordinaryMaxHpPerSecondByRank.at(-1),elite:plagueV.ordinaryMaxHpPerSecondByRank.at(-1)*plagueV.eliteMaxHpPerSecondFactor,boss:plagueV.ordinaryMaxHpPerSecondByRank.at(-1)*plagueV.bossMaxHpPerSecondFactor};
const plagueNew=heroes.get('stukov').plague;
for(const [kind,base]of Object.entries(plagueBase))record('Stukov '+kind+' percent budget vs V plague elite',near(plagueNew[kind+'MaxHpPerSecond']/base,1.2),{kind,hero:plagueNew[kind+'MaxHpPerSecond'],eliteV:base,ratio:1.2});
const zera=heroes.get('zeratul').stats;
record('Zeratul breaks more positive armor than V anti-armor elite',zera.armorReduction>byId.get('marauder.2').parameters.armorReductionByRank.at(-1)&&zera.defenseReduction>byId.get('banshee.1').parameters.defenseReduction,{armorReduction:zera.armorReduction,defenseReduction:zera.defenseReduction,vulnerability:zera.vulnerability});
// Independent one-layer sensitivity cases: these are not claimed to reproduce shield spill or World damage ordering.
const armorSensitivity=[];
for(const hit of [20,100,1000])for(const armor of [0,10,50])for(const reduction of [0,.3,.6]){
  const before=Math.max(.5,hit*(1-reduction)-armor);
  const after=Math.max(.5,hit*(1+zera.vulnerability)*(1-reduction*(1-zera.defenseReduction))-armor*(1-zera.armorReduction));
  const entry={hit,positiveArmor:armor,reduction,before:n(before),after:n(after),ratio:n(after/before)};
  record('one-layer armor sensitivity '+[hit,armor,reduction].join('/'),after>=before,entry);armorSensitivity.push(entry);
}
const transfuse=byId.get('queen.2').parameters;
const queenContinuousI=transfuse.healTargets*transfuse.healDpsI*transfuse.channelSeconds/transfuse.healCooldown;
record('Queen burst healing is not mislabeled continuous parity',near(queenContinuousI,400),{unboostedSustainedI:400,unboostedSustainedV:960,medivacFiniteEnergyFullUptimeI:945,medivacFiniteEnergyFullUptimeV:2268,secondaryBuffValue:'Depends on real ally weapon life damage and wounds; not counted as guaranteed healing.'});
const k=heroes.get('kerrigan'),z=heroes.get('zagara'),l=heroes.get('hots_leviathan');
const zDamage=1+k.stats.damage+l.stats.damage,zSpeed=1+k.stats.speed+l.stats.speed+z.retainedTeamEffects[0].stats.speed;
const f=heroes.get('fenix'),flag=heroes.get('purifier_flagship');
const pDamage=1+f.stats.damage+flag.stats.damage,pSpeed=1+f.stats.speed+flag.stats.speed;
const combo={
  zergThreeHeroes:{ids:[k.id,z.id,l.id],recipient:'永久生物跳虫；新全队指挥均覆盖',heroOnlyDps:n(zDamage*zSpeed),withFamilyCommandDps:n(zDamage*zSpeed*commanderDps),hpInsideOldLeviathanAndQueen:n((1+k.stats.maxHp+l.stats.maxHp+l.retainedTeamEffects[0].stats.maxHp)*(1+commanderPct)*(1+queen.stats.maxHp))},
  protossThreeHeroes:{ids:[f.id,flag.id,artanis.id],recipient:'永久地面机械原生盾不朽者；在阿塔尼斯/光穹范围内',dps:n(pDamage*pSpeed),nativeShieldFactor:n((1+f.stats.maxShield+flag.stats.maxShield+artanis.stats.maxShield)*(1+sentry.stats.maxShield)),hpFactor:n((1+f.stats.maxHp+flag.stats.maxHp)*(1+sentry.stats.maxHp)),familyCommandApplies:false,protectionReduction:Math.max(artanis.stats.damageReduction,byId.get('sentry.1').parameters.damageReduction,changed.get('immortal.3').stats.directWeaponReduction)},
  suppressionStack:{example:'扎加拉45%攻速压制＋毒巢35%精英压制，余20%攻速；若再有独立技能40%减攻速，沿既有下限保留10%。',twoChannelsRemaining:n(Math.max(.1,1-z.stats.attackSlow-changed.get('queen.3').stats.attackSlow)),withSkillChannelRemaining:n(Math.max(.1,1-z.stats.attackSlow-changed.get('queen.3').stats.attackSlow-.4)),weaponFactor:n((1-z.stats.weaponSuppression)*(1-changed.get('queen.3').stats.weaponSuppression))}
};
record('Zerg three-hero damage/speed increases add once',near(combo.zergThreeHeroes.heroOnlyDps,3.91)&&near(combo.zergThreeHeroes.withFamilyCommandDps,5.6304),combo.zergThreeHeroes);
record('Zerg HP does not multiply hero passives a second time',near(combo.zergThreeHeroes.hpInsideOldLeviathanAndQueen,3.132),{factor:3.132});
record('Protoss three-hero native shield and qualification',near(combo.protossThreeHeroes.dps,3.325)&&near(combo.protossThreeHeroes.nativeShieldFactor,3.5)&&near(combo.protossThreeHeroes.hpFactor,1.8)&&combo.protossThreeHeroes.protectionReduction===.4,combo.protossThreeHeroes);
record('Existing suppression floor remains explicit',near(combo.suppressionStack.twoChannelsRemaining,.2)&&near(combo.suppressionStack.withSkillChannelRemaining,.1)&&near(combo.suppressionStack.weaponFactor,.49),combo.suppressionStack);

const preserved=[];
for(const old of baseline.protectedFiles){assert.equal(fs.statSync(old.path).size,old.bytes,old.path+' bytes changed');assert.equal(sha(old.path),old.sha256,old.path+' changed');preserved.push(old.path);}
for(const old of baseline.latestArtifacts){assert.equal(sha(old.path),old.sha256,old.path+' changed');}
for(const old of baseline.htmlMetadata){const stat=fs.statSync(old.path);assert.equal(stat.size,old.bytes,old.path+' size changed');assert.equal(stat.mtimeMs,old.mtimeMs,old.path+' mtime changed');}
record('Runtime, tests, old design snapshots and audit preserved byte-for-byte',true,{files:preserved.length});
record('Delivered latest game/demo preserved byte-for-byte; older HTML metadata preserved',true,{hashedLatestArtifacts:baseline.latestArtifacts.length,unchangedHtmlMetadata:baseline.htmlMetadata.length});

const anchorRows=[
  ['战场指挥官','全队枪兵家族，伤害/攻速/生命/盾/护甲/移动＋20%','伤害1.2×攻速1.2＝1.44；还有生存/机动，不能只比较20和40。'],
  ['震撼弹专家','命中范围3.2，3秒；武器伤害－30%、攻速－35%、移动－45%','普通武器输出剩45.5%；Boss每项半效后剩70.125%。'],
  ['破甲精英 / 报丧女妖','V命中破甲60%/5秒；女妖范围8破甲40%＋已有减伤相对－25%','破甲、武器易伤、弱化减伤是不同通道；原生盾/生命甲分别处理。'],
  ['战场女武神 / 精英救护','范围8，生命＋35%、甲＋5；救护最多5体真实治疗且耗能','治疗按实际缺口、冷却与能量核算，不把爆发治疗当无限常驻。'],
  ['微光护盾','有效治疗×1.2转6秒护障，上限目标生命50%，需要真实交战','只能使用实际治疗收据，不从满血空疗生成屏障。'],
  ['瘟疫女妖','V每秒普通最大生命5%，精英2.5%，Boss1%，范围7','英雄百分比瘟疫按三种目标独立设计，首跳和同秒闸门明确。'],
  ['振奋女妖','来源脱战2秒后全队移动＋30%；8秒蓄满入战爆发I 2600','两族机动支援对齐移动收益，入战换成有限队友护障，非同时复制爆炸。'],
  ['雷霆支点（补充对照）','半径6机械生命护甲＋4，另有第三周期震击','它是已批准补设计条目，不冒充用户原21个样例之一。']
];
const raceName={zerg:'虫族',protoss:'神族'};
const eliteSections=['zerg','protoss'].map(r=>`## ${raceName[r]}：8个团队辅助角色\n\n`+table(['精英 / 新职责','旧版缺口','重设计效果','保留与交换'],eliteChanges.filter(e=>byId.get(e.id).race===r).map(e=>[byId.get(e.id).name+'（'+e.id+'）／'+e.role,e.before,e.after,e.retained]))+'\n').join('\n');
const heroSections=['zerg','protoss'].map(r=>`## ${raceName[r]}：6名英雄光环\n\n`+table(['英雄 / 光环','当前新增光环','新版固定I–V效果','保留被动与比较'],heroChanges.filter(h=>h.race===r).map(h=>[h.name+'／'+h.effectName,oldAuraText(h.id),h.after,h.retained+' '+h.comparison]))+'\n').join('\n');
const groupRows=[
 ['家族指挥','共生血巢','裂阵先锋','全队同家族全属性20%，对齐指挥官'],
 ['生命/护盾防护','母巢女王','光穹织者','虫族生命再生；神族盾上限＋有限能量织盾'],
 ['治疗与集中攻击','输血主母＋毒囊猎手','反馈先知','虫族有效治疗/层数；神族反馈后的限时标记'],
 ['持续压制','毒巢守卫','静滞监察者','先对齐30%伤害/35%攻速/45%移动整包'],
 ['持续破防','腐蚀雨幕','静电织网','正甲45%与已有减伤相对25%；原落点技能不扩大'],
 ['地面/空军防护','空巢铁卫；原地面厚壳自保保留','引力裁决＋圣盾巡航舰','不强迫每个位置镜像；虫族有限分担，神族盾阵'],
 ['行军与入战保护','血羽迁徙','相位突击翼','移动30%，最多5名真实队友的有限护障']
];
const offenseTable=table(['英雄','同一合法友军零甲主武器输出','相对指挥官1.44'],heroOffense.map(h=>[h.name,'×'+h.dpsFactor,'×'+h.relativeToCommander]));
const suppressTable=table(['来源','普通敌武器DPS剩余','Boss武器DPS剩余'],[['人族震撼弹 / 新毒巢 / 新监察者','45.5%','70.125%'],...heroSuppression.map(h=>[h.name,pct(h.normalRemaining),pct(h.bossRemaining)])]);
const main=`# 虫族、神族团队光环重设计 · 2026-10-05\n
按用户“以我人族精英为样本”的要求，已完成两族60个精英的团队职责复核：每族8个辅助条目重设计，其余44个保留战斗核心；虫族、神族各6名英雄的光环重做。**这是一份数值与实现规则完整的设计交付；本轮没有改游戏运行值、现有HTML或已确认的攻击/技能特效。**人族30精英及6英雄作固定对照，不在这次改写范围。神族30精英的P4新机制目前仍未正式接入，表内其“旧版”指先前批准设计，不冒充实际游戏已有效果。

新设计的目标是让辅助角色具有用户人族样例那样的完整团队收益，而非把单项40%当作全面强于20%。英雄的主要团队职责领先对应V精英，输出型指挥同时补足生存/机动，支援型以真实恢复和保护衡量，压制型按伤害×出手频率衡量。没有把所有效果折成一个虚构的总战力分数。

## 人族固定基准

${table(['样例','既有参数','比较方法'],anchorRows)}

样例身份与用户明确给定的键、先前P0补齐的数值在[参数快照](TEAM_AURA_REBALANCE_VALUES_20261005.json)分开保留；本版新增数值均是这次的设计选择，不能写成用户原话。原21个人族样例和已批准P0/P4文件未改。先前实际差异见[强度复核](BUFF_STRENGTH_AUDIT_20261005.md)。

## 两族分工

${table(['团队职责','虫族','神族','设计取向'],groupRows)}

保留种族区别：虫族依赖生命、真实吸血、再生、感染及有预算的伤害分担；神族依赖原生盾、能量窗口、破防及相位保护。不是给60个精英都套同一个光环。友方全队项始终受生物/机械/原生盾/家族/地空资格约束；“全队”不包含工人、运输、建筑和临时召唤。

${eliteSections}
${heroSections}
## 整套收益核算

以下只对同一个合法受益身体、相同原始属性比较。无科技/天赋/卡牌，列的是设计参数结果；不是已经在新版本实战测得的数值。

${offenseTable}

四个输出指挥英雄均超过1.44×1.25＝1.80的主要输出基线，同时具有表内生命/盾、甲与移动收益。伤害和攻速的提升相乘，两个不同伤害提升先相加；不能把凯瑞甘50%伤害和30%攻速错算为只有50%，也不能把每个来源再次整体相乘。雷诺保留旧战旗后的实际主要步兵收益×2.145继续作为人族参考，没有因这次重设计被削低。

${suppressTable}

这些是原生直接武器的零甲参数组合，不代表固定技能也按同样比例削弱。英雄压制对Boss完整，精英控制按原规则半效；硬停滞/举起的Boss豁免继续。范围、命中留存、来源存活与原攻击节奏都影响真实覆盖，不能只拿表内DPS比例宣称自然战斗已平衡。

- **生存支援：**尼亚德拉的60%生命、10甲、3%/秒、半径12，对照新女王45%、6甲、2%/秒、半径9。阿塔尼斯对照光穹的常驻属性加上已付能量开启的25%减伤：相同原始总生命＋盾、忽略护甲/恢复时，按原生盾占比0–100%共11个边界点，阿塔尼斯整套有效血池均更高；原回盾I级560/体/秒也超过哨兵V级432的1.25倍。0%盾仅作数学边界，实际无盾身体不具备该光环资格。
- **治疗不能偷换口径：**输血主母原4秒治疗/12秒冷却，五体I级240/秒，长期平均仅400/秒（V为960）；精英救护在能量足够、持续缺血时I级五体945/秒（V为2268）。新主母靠限时治疗放大与有上限的实伤吸血补足特色，不能宣称其原治疗持续量等于救护。能量、伤口、友军实际伤害不足时不能兑现纸面上限。
- **百分比瘟疫：**斯托科夫6%/3%/1.2%分别对照V瘟疫女妖5%/2.5%/1%，每项高20%；武器易伤不二次放大瘟疫。首跳、护甲/抗性、无敌、来源死亡与同秒闸门按实际管线处理，绝不能直接写目标HP实现。
- **破防不是易伤：**泽拉图65%破甲超过V破甲精英60%，相对弱化减伤30%超过女妖25%，另有武器易伤60%。在20/100/1000单包、0/10/50正甲、0/30%/60%减伤的27组单层敏感性计算中明确分项；不将这些简化算式说成盾溢出/屏障/真实World伤害测试。

## 叠加后的明确结果

三英雄组合仍可很强，但要把每个通道写清，不能靠漏算来假装平衡。以下只是三个指定组合，不是所有队伍的全局最大值：

${table(['组合与实际受益者','设计计算','含义'],[
 ['凯瑞甘＋扎加拉＋利维坦；永久生物跳虫','攻击1.70 × 攻速2.30＝3.91；再有同家族指挥：×1.44＝5.6304','保留扎加拉旧40%攻速；不是把三英雄的DPS倍率连乘。'],
 ['同组跳虫在旧利维坦生命圈与母巢女王圈内','英雄生命1.80 × 家族1.20 × 精英生命1.45＝3.132','女王45%和护翼35%在同类精英层取强，不能再乘1.35。'],
 ['菲尼克斯＋净化旗舰＋阿塔尼斯；地面机械原生盾不朽者','攻击1.90 × 攻速1.75＝3.325；光穹内盾上限×3.50、生命×1.80','它不是狂热者，不吃先锋战旗；不凭“神族”错误多乘1.44。'],
 ['阿塔尼斯40%保护＋光穹25%＋引力护阵15%','适用直接武器包取40%，不是1－0.6×0.75×0.85','不同命名固定护甲仍可相加；伤害分担另按真实有限预算。'],
 ['扎加拉45%攻速压制＋毒巢35%精英压制','剩20%攻速；再有独立40%技能时按已有下限剩10%','这是已有通道的合成下限；Boss对精英项先减半，不能照搬普通敌20%。']
 ])}

${stackingRules.map((r,i)=>`${i+1}. ${r}`).join('\n\n')}

## 接入与表现规则

每个英雄仍只显示原确认版的一个脚下光环；本次复合数值归在这一个具名效果内。战场不显示光环名称/参数文字，详细效果只进按需查看的说明。保留已经确认的普攻弹道、红色灼烧弹、沿线DOT、真实导弹、剑光、航母聚能粗束、治疗素材和原有脚下光环。新增辅助精英使用原种族材质与真实受益者短反馈，不放大已确认攻击范围，不画持续黏连线或粗糙大圆；低画质也不能删除真实受益提示。

实际接入时，新团队成员状态进入共享World/同一个正式演示引擎，数值从明确运行常量维护，不运行导入本设计JSON。常驻属性按成员重建；新增有限治疗增益、毒囊易伤、入战护障消费与瘟疫秒闸门必须纳入原子存档校验。过场、升级、读档、源死亡、双生一体死亡、子机丢失不得重发免费收益。现在仍是run schema22/profile v5；这里没有声称已经升级存档。

需要在实际接入时验证：I/III/V合法友军与敌军、同源重叠和离区、生命/盾比例不回血、真实子机一次继承、Boss半效/完整效力、付费能量/治疗窗口、跨关与导入重载，以及三英雄叠加的自然长局。旧英雄裸I对V精英至少25%与既有秒Boss技能时序继续独立验算，光环收益不能用来填补裸本体预算。

## 本次交付与检查

- [60精英完整去向与逐条规则](TEAM_AURA_REBALANCE_COVERAGE_20261005.md)：16个团队效果更新，44个核心定位保留；每条标明当前虫族实装或神族尚未接入。
- [机器可核对参数](TEAM_AURA_REBALANCE_VALUES_20261005.json)：保留21个用户样例身份、明确原值、新值、旧被动、对象与叠加规则。
- [实际设计检查记录](../../reports/local/aura-rebalance-20261005/design-check.json)：${checks.length}项参数/预算/保留检查；包括363个原运行源/测试/原数据与审计文件逐字节一致，最新完整游戏和虫族演示SHA一致，26个原HTML大小/修改时间一致。它是设计数学与文件保留证据，不是新版本实战或人眼验收。

生成：\`node tools/docs/export-aura-rebalance-20261005.mjs\`；复核：\`node tools/docs/export-aura-rebalance-20261005.mjs --check\`。本轮未构建新游戏HTML，现有完整游戏/演示仍保持上一交付版本。
`;

const coverageDoc=`# 两族60精英的团队效果去向 · 2026-10-05\n\n[主设计](TEAM_AURA_REBALANCE_20261005.md)／[精确参数](TEAM_AURA_REBALANCE_VALUES_20261005.json)。本表的“保留”指保持P0/P4既定核心机制；神族P4仍待正式接入，不能把保留规划写成已实装。所有身体I–V基值、武器包、原已定主动与模型/材质继续沿原合同，只有列出的团队效果更新。\n\n`+
  ['zerg','protoss'].map(r=>`## ${raceName[r]}30精英\n\n`+table(['稳定ID / 名称','当前状态','本次去向','原核心定位 / 明确更新'],coverage.filter(e=>e.race===r).map(e=>[e.id+'／'+e.name,e.runtimeStatus==='P4B_PRESENT_UNCHANGED_THIS_TURN'?'P4B已实装；本轮未改':'P4规划；尚未正式接入',e.proposal?'团队效果重设计：'+e.proposal.role:'核心机制保留',e.proposal?e.proposal.after:e.loop]))+'\n').join('\n')+
  '\n## 16条团队效果实现边界\n\n'+eliteChanges.map(e=>`### ${byId.get(e.id).name} · ${e.effectName}（${e.id}）\n\n对象：${e.recipients}。\n\n${e.after}\n\n${e.retained}\n\n${e.rules.map(x=>'- '+x).join('\n')}\n\n表现：${e.presentation}\n`).join('\n')+
  '\n## 英雄特殊结算\n\n'+heroChanges.filter(h=>h.rules||h.replacesRetainedTeamEffect).map(h=>`### ${h.name}\n\n${h.retained}\n\n${(h.rules??[]).map(x=>'- '+x).join('\n')}\n`).join('\n');

write(valuesPath,JSON.stringify(values,null,2)+'\n');
write(mainPath,main);
write(coveragePath,coverageDoc);
const report={
  kind:'DESIGN_MATH_AND_PRESERVATION_ONLY',revision,passed:true,checkedAt:new Date().toISOString(),
  command:'node tools/docs/export-aura-rebalance-20261005.mjs'+(check?' --check':''),scope:values.scope,
  checks:checks.length,results:checks,heroOffense,heroSuppression,shieldMix,armorSensitivity,combinationExamples:combo,
  preserved:{hashedFiles:preserved.length,latestArtifacts:baseline.latestArtifacts,htmlMetadataCount:baseline.htmlMetadata.length,sourceSnapshot:'reports/local/aura-rebalance-20261005/baseline.json'},
  artifacts:[mainPath,valuesPath,coveragePath].map(p=>({path:p,bytes:fs.statSync(p).size,sha256:sha(p)})),
  runtimeChanged:false,newRuntimeTestsRun:0,newGameAcceptance:false,notes:['All new values are design proposals.','Protoss P4 mechanisms remain unimplemented.','Current attacks/skills/models/resources and delivered HTML remain unchanged.','Finite-energy, wound, shield spill, immunity, and natural-campaign comparisons still require actual runtime integration.']
};
fs.writeFileSync(dir+'/design-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,kind:report.kind,checks:checks.length,scope:report.scope,preserved:preserved.length,outputs:report.artifacts}));
