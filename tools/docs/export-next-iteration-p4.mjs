import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Documentation only. No simulation, renderer or build entry point imports this file.
const sourcePath='docs/project/NEXT_ITERATION_P0_VALUES_20261003.json';
const matrixPath='docs/project/NEXT_ITERATION_P4_ELITE_MATRIX_20261005.md';
const valuesPath='docs/project/NEXT_ITERATION_P4_VALUES_20261005.json';
const planPath='docs/project/NEXT_ITERATION_P4_PLAN_20261005.md';
const reportDir='reports/local/p4-plan-20261005';
const baselinePath=reportDir+'/baseline.json';
const check=process.argv.includes('--check');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const familyNames={marine:'陆战队员',marauder:'劫掠者',reaper:'死神',hellion:'恶火/恶蝠',tank:'攻城坦克',thor:'雷神',viking:'维京',banshee:'女妖',medivac:'医疗艇',science_vessel:'科技球',zergling:'跳虫',baneling:'爆虫',roach:'蟑螂',queen:'虫后',ravager:'破坏者',hydralisk:'刺蛇',lurker:'潜伏者',ultralisk:'雷兽',mutalisk:'异龙',corruptor:'腐化者',zealot:'狂热者',adept:'使徒',stalker:'追猎者',sentry:'哨兵',high_templar:'高阶圣堂',immortal:'不朽者',colossus:'巨像',phoenix:'凤凰',void_ray:'虚空辉光舰',carrier:'航母'};
const familyByRace={terran:['marine','marauder','reaper','hellion','tank','thor','viking','banshee','medivac','science_vessel'],zerg:['zergling','baneling','roach','queen','ravager','hydralisk','lurker','ultralisk','mutalisk','corruptor'],protoss:['zealot','adept','stalker','sentry','high_templar','immortal','colossus','phoenix','void_ray','carrier']};
const raceNames={terran:'人族',zerg:'虫族',protoss:'神族'};
const bodyNames={assault:'突击',precision:'精确',bulwark:'堡垒',mobile:'机动',support:'支援'};
const n=v=>String(Math.round(v*10000)/10000);
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.map(v=>String(v).replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |')].join('\n');
const raw=json(sourcePath),spec=raw.eliteHeroRedesign;
assert.equal(spec.elites.length,90);assert.equal(new Set(spec.elites.map(e=>e.id)).size,90);
assert.equal(spec.elites.filter(e=>e.origin==='USER_SAMPLE').length,21);
assert.equal(spec.heroes.length,18);
for(const [race,families] of Object.entries(familyByRace)){
  assert.equal(families.length,10,race);
  for(const family of families)assert.deepEqual(spec.elites.filter(e=>e.id.startsWith(family+'.')).map(e=>e.id).sort(),[1,2,3].map(i=>family+'.'+i),family);
}
const keyLabels=Object.fromEntries([...read('tools/docs/export-elite-hero-redesign.mts').match(/const names:Record<string,string>=\{([\s\S]*?)\n\};/)[1].matchAll(/([A-Za-z][A-Za-z0-9]*):'([^']+)'/g)].map(m=>[m[1],m[2]]));
Object.assign(keyLabels,{blastIncrease:'爆炸面积增加',blastAreaFactor:'爆炸面积倍率',weaponMode:'武器模式',canFireMoving:'移动可开火',hasSiegeToggle:'架炮开关',auraRadius:'光环半径（null表示全队）',quakeEveryCycles:'每N次地面周期震击',quakeDamageFraction:'震击主包比例',quakeRadius:'震击半径',enemyMoveReduction:'敌移动降低',allyRadius:'友军半径',lockSeconds:'同目标锁定秒',lockAttackSpeedIncrease:'锁定攻速增加',chargeSeconds:'储能/充能秒',overdriveSeconds:'超载秒',overdriveDpsFactor:'超载总DPS倍率',coolingSeconds:'散热秒',coolingDpsFactor:'散热DPS倍率',lockStacks:'锁定层数',damagePerStack:'每层伤害增加',openingMissileFraction:'首轮导弹主包比例',landingDamageI:'I级落地伤害',landingRadius:'落地半径',landingCooldown:'落锤CD秒',assaultDpsFactor:'突击DPS倍率',assaultArmorAdd:'突击护甲增加',empoweredCycles:'强化周期数',empoweredDpsFactor:'强化DPS倍率',barrierMaxHp:'屏障/最大HP比例',barrierSeconds:'屏障秒',triggerCooldown:'触发CD秒',armorReduction:'正护甲降低',defenseReduction:'百分比减伤相对降低',secondsPerPulse:'脉冲秒',teamMoveIncrease:'队伍移动增加',chargeMaximumI:'I级储能上限',blastRadius:'爆炸半径',shieldPerEffectiveHealFraction:'有效治疗转临时盾比例',barrierPerEffectiveRepair:'有效维修转屏障比例',radiationCooldown:'辐照CD秒',radiationSeconds:'辐照秒',radiationDpsI:'I级辐照/秒',radiationRadius:'辐照半径',repairTargets:'维修身体数',empCooldown:'EMP CD秒',empRadius:'EMP半径',shieldDamageI:'I级盾伤',energyDrainFraction:'能量抽取比例',debuffSeconds:'减益秒',stacks:'最大层数',attackSpeedPerStack:'每层攻速增加',stackExpireSeconds:'层到期秒',armorSeconds:'破甲秒',finisherEveryCycles:'每N周期处决',finisherDamageFactor:'处决替换包倍率',sharedDamageFraction:'分摊比例',lifeStealFraction:'实际生命伤吸血比例',survivorRegrowSteps:'幸存再生步数',regrowHpFraction:'再生HP比例',explosionDamageFactor:'爆炸伤害倍率',radiusFactor:'半径倍率',postExplosionStopSeconds:'自爆后停顿秒',acidGroundSeconds:'腐土秒',acidDpsI:'I级腐土/秒',acidRadius:'腐土半径',storedDamageFraction:'实际敌伤储量比例',storedDamageMaxHpFraction:'储量/最大HP上限',healMaxHpFraction:'恢复最大HP比例',lowHpThreshold:'低HP触发阈值',lowHpArmorAdd:'低HP护甲增加',burrowSeconds:'钻地秒',burrowCooldown:'钻地CD秒',burrowHealMaxHpPerSecond:'钻地最大HP恢复/秒',burstEveryCycles:'每N周期强化',burstDamageFactor:'强化替换包倍率',burstRadius:'强化半径',retaliationDamageFraction:'反伤比例',retaliationRadius:'反伤半径',retaliationInternalSeconds:'反伤最短间隔秒',attackRegenMaxHpPerSecond:'交战最大HP恢复/秒',regenSeconds:'再生秒',bileCount:'胆汁枚数',bilePacketFraction:'每胆汁基础包比例',bileInterval:'胆汁间隔秒',bileCooldownFactor:'胆汁CD倍率',bileDamageFactor:'胆汁伤害倍率',bileRadiusFactor:'胆汁半径倍率',armoredAndBuildingDamageFactor:'重甲/建筑伤害倍率',rainSeconds:'雨区秒',rainRadius:'雨区半径',rainDpsI:'I级雨区/秒',needles:'骨针数',needleDamageFraction:'每骨针主包比例',coneDegrees:'扇面角',pierceLength:'贯穿长度',pierceWidth:'贯穿全宽',secondaryDamageFraction:'副目标主包比例',poisonStacks:'毒层上限',poisonSeconds:'毒伤秒',poisonDpsPerStackI:'I级每层毒伤/秒',spreadRadius:'传播半径',spreadTargets:'传播对象上限',allyRegenMaxHpPerSecond:'友军最大HP再生/秒',channelSeconds:'引导秒',healCooldown:'治疗CD秒',venomDamageFactor:'毒刺伤害倍率',venomMoveReduction:'毒刺移动降低',venomAttackSpeedReduction:'毒刺攻速降低',venomSeconds:'毒刺秒',venomRadius:'毒刺半径',spineLines:'刺线数量',lineDamageFactor:'每刺线主包倍率',everyCycles:'每N周期触发',giantDamageFactor:'巨刺替换包倍率',giantLength:'巨刺长度',giantWidth:'巨刺全宽',slowSeconds:'减速秒',burrowTimeFactor:'埋地用时倍率',bouncePackets:'各跳主包比例',bounceRadius:'弹射邻距',glaives:'刃虫枚数',mainPacketFraction:'每主包比例',openingSeconds:'开场秒',openingAttackSpeedIncrease:'开场攻速增加',maximumDamageFactor:'充满伤害倍率',airArmoredDamageFactor:'对空重甲倍率',redirectFraction:'分摊比例',redirectMaxHpPerSecond:'每秒分摊/自身HP上限',selfDamageReduction:'自身减伤',poisonDpsI:'I级毒伤/秒',deathExplosionI:'I级死亡爆伤',deathRadius:'死亡爆半径',thirdDamageFactor:'第三击替换倍率',cleaveDegrees:'横扫角',cleaveRangeFactor:'横扫距离倍率',damageStoredFraction:'实际受伤储量比例',storedMaxHpFraction:'储量/最大HP上限',triggerHpThreshold:'触发HP比例',reductionSeconds:'减伤秒',chargeCooldown:'冲锋CD秒',chargeDistance:'冲锋距离',stompDamageI:'I级踏碎伤害',stompRadius:'踏碎半径',empoweredSeconds:'强化秒',cleaveEveryCycles:'每N周期横扫',cleaveRadius:'横扫半径',cleaveFraction:'横扫主包比例',shieldBreakCooldown:'破盾CD秒',retaliationDamageFactor:'反击伤害倍率',retaliationSeconds:'反击秒',shieldPerEffectiveDamageFraction:'有效伤害转原生盾比例',shieldRestoreMaxPerSecondFraction:'每秒回盾/原生盾上限',chargeDamageI:'I级冲锋伤害',chargeRadius:'冲锋半径',echoDelay:'回响延迟秒',echoDamageFactor:'回响伤害倍率',hitsRequired:'所需真实命中',resonanceDamageFactor:'共振替换倍率',resonanceRadius:'共振半径',markSeconds:'标记秒',burstShots:'连发弹数',barrierMaxShieldFraction:'屏障/原生盾上限',positiveArmorIgnoreFraction:'忽略正护甲比例',secondaryFraction:'副目标主包比例',shieldRestorePerSecondI:'I级每体回盾/秒',targets:'目标数量',controlCooldown:'控制CD秒',controlRadius:'控制半径',ordinaryStasisSeconds:'普通停滞秒',bossSlow:'Boss减速',storedShieldDamageFraction:'实际原生盾损储量比例',storedLimitMaxShieldFraction:'储量/原生盾上限',releaseCooldown:'放能CD秒',beamLength:'束长',beamWidth:'束全宽',barrierBreakNextDamageFactor:'破屏后下击伤害倍率',barrierFactor:'屏障倍率',barrierBreakShieldRestoreFraction:'破屏回盾比例',gravityRadius:'牵引半径',pullDistance:'牵引距离',pullCooldown:'牵引CD秒',heatSeconds:'同目标升温秒',lineWidthFactor:'束宽倍率',fireDpsI:'I级残火/秒',rangeIncrease:'射程增加',widthFactor:'宽度倍率',shockDamageFactor:'冲击包倍率',shockRadius:'冲击半径',shieldRestoreFraction:'原生盾恢复比例',stormDamageFactor:'风暴总伤倍率',stormRadiusFactor:'风暴半径倍率',stormPulsePeriodFactor:'风暴脉冲周期倍率',totalStormDamageMultiplier:'风暴总预算倍率',feedbackCooldown:'反馈CD秒',feedbackRadius:'反馈半径',energyDamageRatio:'实际能量转伤害比例',fixedFeedbackDamageI:'I级反馈固定伤害',webSeconds:'织网秒',webRadius:'织网半径',allyEnergyPerSecond:'友军回能/秒',allyTargets:'友军目标数',gravityTargets:'举起目标数',liftSeconds:'举起秒',liftDamageFactor:'被举起伤害倍率',gravityCooldown:'引力CD秒',secondaryTargets:'副目标数量',secondaryRadius:'副目标邻距',mainDamageFactor:'主目标包倍率',shieldPerSecondMaxFraction:'每秒回盾上限比例',childAttackSpeedIncrease:'子机攻速增加',overdriveCooldown:'超载CD秒',childDamageFactor:'子机伤害倍率',childArmoredDamageFactor:'子机对甲倍率',heavyEveryCycles:'每N周期重矛',heavyPacketFraction:'重矛包比例',parentDamageReduction:'母舰减伤',interceptorHpFactor:'子机HP倍率',returnHealPerSecondFraction:'归航维修最大HP/秒',childDpsFactor:'子机DPS倍率',repairRange:'归航维修距离'});
const cards=[...read('docs/project/NEXT_ITERATION_P0_CAPABILITIES_20261003.md').matchAll(/^\| ((?:terran|zerg|protoss)\.[a-z]+)\s+([^|]+)\|([^|]+)\|([^|]+)\|/gm)].map(m=>({id:m[1],name:m[2].trim(),unchangedNumericContract:m[3].trim(),targets:m[4].trim()}));
assert.equal(cards.length,24);assert.equal(new Set(cards.map(c=>c.id)).size,24);
for(const race of Object.keys(familyByRace))assert.equal(cards.filter(c=>c.id.startsWith(race+'.')).length,8);

function sourceFingerprint(root){
 const rows=[];
 function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const next=path.join(p,e.name);if(e.isDirectory()){if(!['node_modules','.cache'].includes(e.name))walk(next);}else if(/\.(?:ts|js|mjs|mts|html|css|json|glsl|vert|frag)$/i.test(e.name))rows.push({path:next.replaceAll('\\','/'),sha256:sha(fs.readFileSync(next))});}}
 walk(root);rows.sort((a,b)=>a.path.localeCompare(b.path,'en'));
 return {files:rows.length,sha256:sha(JSON.stringify(rows)),entries:rows};
}
async function artifactFingerprint(p){const h=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(p))h.update(chunk);return {path:p,bytes:fs.statSync(p).size,sha256:h.digest('hex')};}
const production=json('reports/local/protoss-heroes-20261005/delivery.json');
async function currentBaseline(){
 const code=Object.fromEntries(['src','test','preview'].map(root=>[root,sourceFingerprint(root)]));
 const artifacts=[];
 for(const locked of production.artifacts){const actual=await artifactFingerprint(locked.path);assert.equal(actual.sha256,locked.sha256,locked.path+' differs from P3 delivery');assert.equal(actual.bytes,locked.bytes,locked.path);artifacts.push(actual);}
 return {kind:'PLANNING_ONLY_PRESERVATION_BASELINE',runSchema:19,profileVersion:5,p0SourceHash:sha(fs.readFileSync(sourcePath)),code,artifacts};
}
fs.mkdirSync(reportDir,{recursive:true});
if(process.argv.includes('--capture-baseline')){
 assert.ok(!fs.existsSync(baselinePath),'Refuse to overwrite the existing P4 planning baseline.');
 const baseline=await currentBaseline();fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');
 console.log(JSON.stringify({baseline:baselinePath,codeFiles:Object.values(baseline.code).reduce((a,b)=>a+b.files,0),p3Htmls:baseline.artifacts.length}));
 process.exit(0);
}
const baseline=json(baselinePath),actual=await currentBaseline();
assert.deepEqual(actual,baseline,'Runtime, tests, previews, P0 data or P3 distribution changed during the planning-only task.');
const familyOf=e=>e.id.slice(0,e.id.lastIndexOf('.'));
const raceOf=e=>Object.keys(familyByRace).find(r=>familyByRace[r].includes(familyOf(e)));
const designRows=read('docs/project/ELITE_HERO_REDESIGN_20261003.md').split(/\r?\n/);
const elites=spec.elites.map(e=>{
 const fixedByRank=Object.fromEntries(Object.entries(e.parameters).filter(([k,v])=>k.endsWith('I')&&typeof v==='number').map(([k,v])=>[k,spec.eliteGrowth.fixedDamageAndHeal.map(g=>Math.round(v*g*1e8)/1e8)]));
 const row=designRows.find(line=>line.startsWith('| '+e.id+' '));assert.ok(row,e.id+' design row missing');
 return {...e,family:familyOf(e),race:raceOf(e),approval:'P0_R2_APPROVED_20261003_NOT_RUNTIME',bodyBudgetIAndV:row.split('|')[3].trim(),fixedAmountsByRank:fixedByRank};
});
const large=elites.find(e=>e.id==='hellion.3');assert.equal(large.parameters.minePeriod,12);assert.equal(large.parameters.mineCount,2);assert.equal(large.parameters.fireSeconds,2);
assert.deepEqual(large.fixedAmountsByRank.mineDamageI,[1200,1620,2040,2460,2880]);
assert.deepEqual(large.fixedAmountsByRank.fireDamagePerSecondI,[180,243,306,369,432]);
const destroyer=elites.find(e=>e.id==='tank.3');assert.equal(destroyer.parameters.blastAreaFactor,5);assert.equal(destroyer.parameters.blastRadiusFactor,Math.sqrt(5));
for(const e of elites)for(const k of e.userConfirmedParameterKeys)assert.ok(Object.hasOwn(e.parameters,k),e.id+': '+k);
const eliteEnergyChannels={
 continuousMedical:{energyPerActualHp:.33,shieldAndBarrierUseAlreadyPaidEffectiveHealOnly:true},
 'queen.2':{energyPerCast:50,pulsePeriod:.25,firstPulse:.25,lastPulse:4,pulseCount:16,initialTargetLimit:5,cooldownStartsAt:'SUCCESSFUL_CAST',replaceLegacyInstantAndHot:true,sourceDeathStopsPulses:true},
 'sentry.1':{energyPerActivation:75,windowSeconds:12.857142857142858,cooldownSeconds:12.857142857142858,shieldPulsePeriod:1,firstShieldPulse:1,shieldPulsesNeedLivingSource:true,noPerShieldEnergyCharge:true,noSecondLegacyGuardian:true},
 'sentry.2':{energyPerCast:75,sourceCostReference:'GuardianShield',cooldownSeconds:14},
 'high_templar.1':{energyPerCast:75,sourceCostReference:'PsiStorm',cooldownSeconds:12},
 'high_templar.2':{energyPerCast:75,authorship:'NEW_EQUIVALENT_PSI_STORM_COST_PROPOSAL_NOT_EXISTING_FEEDBACK_COST',cooldownSeconds:12},
 'high_templar.3':{energyPerCast:75,sourceCostReference:'PsiStorm',webFromActualStormOnly:true,extraEnergyForWeb:0,cooldown:'PRESERVE_SOURCE_PSI_STORM_COOLDOWN'}
};
const values={
 schemaVersion:1,revision:'2026-10-05-p4-plan-r1',status:'REVIEW_PLAN_NOT_RUNTIME',gameplayChangedByThisTask:false,
 userRequest:{p3:'p3就按这样',p4:'p4请你先给出规划，数值设计、机制实现、蜘蛛雷、特效实现等'},
 provenance:{approvedSource:sourcePath,sha256:baseline.p0SourceHash,approvalContract:'docs/project/NEXT_ITERATION_P0_20261003.md',priorP3Evidence:'reports/local/protoss-heroes-20261005/delivery.json',baseline:baselinePath,note:'Old pending/status strings preserve historical authorship; recorded whole-P0 approval governs copied values.'},
 baseline:{runSchema:19,profileVersion:5,sourceDigests:Object.fromEntries(Object.entries(baseline.code).map(([k,v])=>[k,{files:v.files,sha256:v.sha256}])),p3Artifacts:baseline.artifacts},
 coverage:{families:30,elites:90,elitesByRace:{terran:30,zerg:30,protoss:30},userSamples:21,funCardIdentities:24,unchangedHeroes:18},
 approved:{bodyBase:'SAME_FAMILY_MODE_UNTALENTED_UNCARDED_UNAURED_ORDINARY_V_WITH_PLAYER_ADAPTATION_ALREADY_APPLIED_ONCE',bodyPresets:spec.bodyPresets,eliteGrowth:spec.eliteGrowth,combat:spec.combat,loneHunter:spec.loneHunter,auraStacking:spec.auraStacking,terranFunMine:raw.terranMine,heroRoleMinimumAgainstEliteV:1.25,elites,funCards:cards},
 proposedImplementation:{approval:'NEW_P4_REVIEW_PROPOSAL_NOT_EXECUTED',scope:'Move unfinished approved ninety elite mechanisms into P4; preserve all eighteen P3 heroes.',largeMine:{emergeSeconds:.25,explosionDistance:1.2,collisionRadius:.45,modelScale:1.6,placementCenterDistance:[1.6,3.2],retrySeconds:1,pendingLimit:2,activeLimitScope:'PER_OWNER',nextBatchFromCompletedDeploymentSeconds:12,crossStage:true,sourceDeath:'KEEP_DEPLOYED_MINES_AND_BURNS_CANCEL_UNDEPLOYED_RIGHTS',retirement:'KEEP_DEPLOYED_MINES_CANCEL_UNDEPLOYED_RIGHTS',firePulseOffsets:[1,2],fireOverlap:'SAME_OWNER_SAME_TARGET_SHARED_ONE_SECOND_DAMAGE_GATE_STRONGEST_DUE_PACKET_NO_PHASE_OFFSET_STACKING',fireTargetInternalSeconds:1,blastLayer:'LEGAL_GROUND_ENEMIES_WITH_EXISTING_BUILDING_WEAPON_LEGALITY_NO_FRIENDLY_DAMAGE'},eliteEnergyChannels,visual:{qualityDecorationDensity:{full:1,balanced:.55,low:.2},requiredCoreDensity:1,ordinaryFlashSeconds:[.06,.14],ordinaryTailSeconds:[.15,.45],eliteBlastTailSeconds:[.5,1.2],ordinaryEliteDecorativeScale:raw.visualFeedback},phases:['P4-0 baseline and plan','P4-A Terran thirty and large mines','P4-B Zerg thirty','P4-C Protoss thirty','P4-D thirty ordinary and twenty-four fun card effects','P4-E regression/performance/local delivery']},
 derivedDesignOnly:{largeMinePerMineFullDamageByRank:spec.eliteGrowth.fixedDamageAndHeal.map(g=>Math.round((large.parameters.mineDamageI+2*large.parameters.fireDamagePerSecondI)*g)),largeMinePairSeparateZonesFullBudgetByRank:spec.eliteGrowth.fixedDamageAndHeal.map(g=>Math.round(2*(large.parameters.mineDamageI+2*large.parameters.fireDamagePerSecondI)*g)),largeMinePairSameTickOverlapOneTargetByRank:spec.eliteGrowth.fixedDamageAndHeal.map(g=>Math.round((2*large.parameters.mineDamageI+2*large.parameters.fireDamagePerSecondI)*g)),ruleBaseRankStates:90*5,ordinaryThreeRankVisualStates:30*3,eliteThreeRankVisualStates:90*3,threeStackCardsFourStates:(24-3)*4,strategicInventoryStates:3*4},
 restrictions:['NO_RUNTIME_IMPORT','NO_P4_IMPLEMENTATION_IN_THIS_TASK','NO_P3_HERO_REDESIGN','NO_NORMAL_OR_CARD_REBALANCE','NO_CLEANUP_UPLOAD_PUSH_DEPLOY','NO_NEW_GAME_ACCEPTANCE_CLAIM']
};
const parameterText=e=>Object.entries(e.parameters).map(([k,v])=>{
 const label=e.userConfirmedParameterKeys.includes(k)?'用户明确':e.derivedParameterKeys?.includes(k)?'派生':'P0设计';
 const val=Array.isArray(v)?v.map(x=>typeof x==='number'?n(x):String(x)).join('／'):v===null?'全队/不设局部半径':typeof v==='number'?n(v):String(v);
 return `【${label}】${keyLabels[k]??k}（${k}）=${val}`;
}).join('；');
const sections=[];
for(const [race,families] of Object.entries(familyByRace)){
 sections.push('## '+raceNames[race]+'三十精英\n');
 for(const family of families){
  sections.push('### '+familyNames[family]+'\n');
  sections.push(table(['稳定ID / 名称 / 机体','批准机体I → V纸预算','真实循环与批准数值','I / III / V固定量（未乘条件词条）','结算边界','特效方向'],elites.filter(e=>e.family===family).map(e=>[`${e.id} ${e.name} / ${bodyNames[e.body]}`,e.bodyBudgetIAndV,e.loop+' '+parameterText(e),Object.entries(e.fixedAmountsByRank).map(([k,v])=>(keyLabels[k]??k)+' '+[v[0],v[2],v[4]].map(n).join('／')).join('；')||'按机体主包/条目比例计算，无另列I级固定量',e.limit,e.visual]))+'\n');
 }
}
const matrix='# P4 九十精英逐款数值、机制与效果清单 · 2026-10-05\n\n状态：**规划附件，不是运行数据或实战验收。** [主规划](NEXT_ITERATION_P4_PLAN_20261005.md)规定实施顺序、蜘蛛雷补足项、医修、卡牌、存档与验证。[参数快照](NEXT_ITERATION_P4_VALUES_20261005.json)只供文档核对，runtime不得导入。\n\n九十项参数完整复制P0 r2已批准设计；【用户明确】与【P0设计】区分原始来源，二者都已随P0获批，不再次索要相同批准。表中机体I→V为既有P0静态推导、未计独有机制/光环；固定量只是按1/1.35/1.7/2.05/2.4成长展开，未施加护甲、目标条件、技能天赋或有效治疗封顶，不能当作P4已经测到的伤害/恢复。百分比、冷却、半径和持续时间不随该成长连乘。\n\n基础机体以同家族普通V、既有1.15适配计一次为基底，替换旧模板。普通/英雄/卡牌数值保留。大型雷的0.45足迹、1.6模型尺度、欠雷/跨关/源死亡等**新实施提议**在主规划第三节，未混入批准行。\n\n'+sections.join('\n')+'\n生成/核对：`node tools/docs/export-next-iteration-p4.mjs` / `node tools/docs/export-next-iteration-p4.mjs --check`。覆盖：30家族×3型=90；人/虫/神各30；21用户样例；18英雄保持。\n';
for(const [p,text] of [[valuesPath,JSON.stringify(values,null,2)+'\n'],[matrixPath,matrix]]){
 if(check)assert.equal(read(p),text,p+' is stale');else fs.writeFileSync(p,text);
}
for(const section of ['## 1.','## 2.','## 3.','## 4.','## 5.','## 6.','## 7.','## 8.'])assert.ok(read(planPath).includes(section),section+' missing');
for(const p of [planPath,matrixPath])for(const m of read(p).matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){if(!m[1].includes('://'))assert.ok(fs.existsSync(path.resolve(path.dirname(p),m[1])),'Missing planning link '+m[1]);}
assert.ok(!baseline.code.src.entries.some(e=>/(?:from|import|require).{0,120}NEXT_ITERATION_P[04]_VALUES/.test(read(e.path))),'Runtime imports planning values.');
const report={kind:'DOCUMENTATION_CONSISTENCY_AND_PRESERVATION_ONLY',passed:true,coverage:values.coverage,derivedDesignOnly:values.derivedDesignOnly,p3CodeUnchanged:true,p3HtmlsUnchanged:actual.artifacts.length,p0BytesUnchanged:true,runSchemaUnchanged:19,profileVersionUnchanged:5,p4RuntimeTestsRun:0,newGameAcceptance:false,files:[planPath,matrixPath,valuesPath].map(p=>({path:p,bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))})),baseline:baselinePath,command:check?'node tools/docs/export-next-iteration-p4.mjs --check':'node tools/docs/export-next-iteration-p4.mjs'};
fs.writeFileSync(reportDir+'/planning-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
