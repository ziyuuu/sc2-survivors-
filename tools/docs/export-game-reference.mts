import fs from 'node:fs/promises';
import {SC2_UNITS,SC2_PROFILE,FASTER} from '../../src/data/sc2-units';
import {HEROES,ALL_HERO_IDS} from '../../src/data/heroes';
import {ELITES,ELITE_TEMPLATES} from '../../src/data/elites';
import {RACES,RACE_NAMES,FAMILIES_BY_RACE,ALL_FAMILIES,FAMILY_LIMIT,BODY_LIMIT,ORDINARY_RANK_LIMIT,HERO_LIMIT,MVP_RULES,type FamilyId} from '../../src/data/races';
import {EXPANSION_SOURCE,SOURCE_UNIT_DETAILS,SOURCE_PRODUCTION_RECIPES,SOURCE_UNIT_MODES,SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../src/data/expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL,SCIENCE_VESSEL_SOURCE,CAMPAIGN_SCIENCE_VESSEL_RECIPE,SCIENCE_VESSEL_ADAPTATION} from '../../src/data/campaign-science-vessel';
import {PRODUCTION_LINES,FAMILY_REQUIREMENTS,HEAVY_FAMILIES,DEVELOPMENT,developmentPrice,familyLine} from '../../src/data/expedition-buildings';
import {CAMPAIGN18_ID,CAMPAIGN18_STAGES,CAMPAIGN18_ENEMIES,CAMPAIGN18_WEIGHTS,CAMPAIGN18_TOTALS,CAMPAIGN18_HERO_WINDOWS,CAMPAIGN18_PURPLE_WINDOWS,campaign18StageConfig,campaign18EnemyPressure,campaign18ChapterGrowth} from '../../src/data/campaign18';
import {MVP_TALENTS,TALENT_LINES,TALENT_POINT_CAP,MAIN_TIER_COSTS,MICRO_TIER_COSTS,PREVIOUS_TIER_POINTS} from '../../src/data/mvp-talents';
import {SOURCE_UPGRADE_PROFILE,SOURCE_WEAPON_UPGRADE_STEPS,SOURCE_RESEARCH_EFFECTS} from '../../src/data/expansion-upgrades';
import {EXPEDITION_CARD_DEFINITIONS,expeditionRarityWeights} from '../../src/simulation/progression/expedition-drafts';

const cell=(v:unknown)=>String(v??'—').replace(/\|/g,'／').replace(/\n/g,' ');
const table=(heads:string[],rows:unknown[][])=>['| '+heads.map(cell).join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(row=>'| '+row.map(cell).join(' | ')+' |')].join('\n');
const n=(v:number)=>Number(v.toFixed(4));
const list=(values:readonly string[])=>values.join('、')||'—';
const name=(id:FamilyId)=>SC2_UNITS[id].zh;
const difficulties=['easy','normal','hard','hell'] as const;
const difficultyNames={easy:'简单',normal:'普通',hard:'困难',hell:'地狱'};
const resource=(v:{minerals:number;gas:number})=>`${v.minerals}／${v.gas}`;
const unitRecipe=(id:FamilyId)=>id==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[id]!;
const unitShield=(id:FamilyId)=>id==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL.maxShields:SOURCE_UNIT_DETAILS[id]!.shields;
const text:string[]=[];

text.push('# 当前游戏数据参考 · 三族18关',
 '本文件由 `npm run docs:data` 从运行配置生成；请修改源码后重新生成。设计规则见 [DESIGN.md](DESIGN.md)，验证状态见 [QA.md](QA.md)。表格是配置参考，不代表全部内容已经通过人工视觉、操作或平衡验收。逐实体最终值还包括培养、科技、天赋、强化与临时状态。',
 '## 规则与来源边界',
 table(['规则','用途','普通家族／身体','英雄身份','战役'],[
  [MVP_RULES,'当前唯一可玩规则',`${FAMILY_LIMIT} 家族 × ${BODY_LIMIT} 基础身体；A16至7身体，S14培养至7级`,HERO_LIMIT,`${CAMPAIGN18_ID}：18关`],
 ]),
 `三族目录各 ${FAMILIES_BY_RACE.terran.length} 个普通家族，共 ${ALL_FAMILIES.length} 个；模式、英雄与截击机不另计普通家族。`,
 `除科技球外的普通单位使用固定 SC2 ${SC2_PROFILE.version} 导出版本，修订 ${SC2_PROFILE.revision}。层序：${EXPANSION_SOURCE.layers.join(' → ')}。时钟：${SC2_PROFILE.clock}。已核对导出 XML，未声称与另一安装客户端版本等价。`,
 `科技球独立使用 ${SCIENCE_VESSEL_SOURCE.profile}，版本 ${SCIENCE_VESSEL_SOURCE.version}，buildConfig ${SCIENCE_VESSEL_SOURCE.buildConfig}；不将战役字段伪称为 5.0.15 多人数据，也不叠加合作指挥官强化。`,
 table(['科技球来源文件','SHA-256'],Object.values(SCIENCE_VESSEL_SOURCE.files).map(f=>[f.file,f.sha256])),
 '原模型来源的 CASC 版本为 5.0.16.97563；素材版本不改变上述战斗配置来源。英雄数值、精英能力、建筑报价、天赋、卡牌和战役是本作设计／实验参数。');

text.push('## 新规则：30个普通家族',
 '以下为一级基础身体和默认主武器。雷神、虫后等多武器、变形与范围模式另见后表；科技球及医疗艇没有普通攻击，航母伤害由所属截击机结算。菌毯修正、护盾和恢复不合并成生命。');
for(const race of RACES)text.push('### '+RACE_NAMES[race],table(['ID','兵种','HP／护盾','生命护甲','移速','单发 × 发数','周期秒','射程','默认目标','属性'],FAMILIES_BY_RACE[race].map(id=>{
 const u=SC2_UNITS[id];return [id,u.zh,`${u.maxHp}／${unitShield(id)}`,u.armor,n(u.movementSpeed),`${u.attackDamage} × ${u.attacks}`,n(u.attackPeriod),u.attackRange,u.targetType,list(u.attributes)];
})));
text.push('### 完整生产配方',
 '费用按最终交付的一名身体列出，进化体费用已包含基础体，不再重复收费。完整训练时间为基础体与进化阶段之和；跳虫通常一批双生，单体尾单按单体价格、同一配方时间。新订单锁定实际价格与训练时间，旧订单不追溯改价。',
 table(['家族','生产线','矿／气（每身体）','完整秒','基础秒＋进化秒','通常身体／配方','基础体','本作前置','额外关卡条件','来源训练项'],ALL_FAMILIES.map(id=>{
  const p=unitRecipe(id);return [name(id),PRODUCTION_LINES[familyLine(id)].name,`${p.mineralCost}／${p.gasCost}`,n(p.productionTime),`${n(p.baseSeconds)}＋${n(p.morphSeconds)}`,p.batchBodyCount,p.baseFamily?name(p.baseFamily):'—',list(FAMILY_REQUIREMENTS[id]),HEAVY_FAMILIES.includes(id)?'完成第9关':'—',`${p.abilityId}/${p.entryId}`];
 })),
 '科技球使用独立战役配方；其余配方使用固定多人导出。旧规则的基础体训练字段保留原值，不能拿旧表中爆虫／破坏者的进化阶段时间当作新局完整配方时间。');
text.push('### 护盾、能量与固有恢复',table(['家族','护盾护甲','回盾／秒','受击延迟秒','初始／最大能量','回能／秒','固有生命恢复／秒','生命恢复延迟秒','菌毯移速系数'],ALL_FAMILIES.map(id=>{
 if(id==='science_vessel'){const c=CAMPAIGN_SCIENCE_VESSEL;return [c.zh,c.shieldArmor,n(c.shieldRegenPerSecond),n(c.shieldRegenDelay),`${c.startEnergy}／${c.maxEnergy}`,n(c.energyRegenPerSecond),n(c.hpRegenPerSecond),n(c.hpRegenDelay),c.creepSpeedMultiplier];}
 const s=SOURCE_UNIT_DETAILS[id]!;return [name(id),s.shieldArmor,n(s.shieldRegen*FASTER),n(s.shieldDelay/FASTER),`${s.energyStart}／${s.energy}`,n(s.energyRegen*FASTER),n(s.lifeRegen*FASTER),n(s.lifeDelay/FASTER),n(s.creep)];
})),
 '虫族默认满足菌毯条件，只将其实际拥有的菌毯效果应用一次。医修按实际恢复的生命耗能：医疗艇对生物全效／机械三分之一；科技球对机械全效／生物三分之一。降低跨类型恢复速率不再额外增加每点生命能耗。',
 `科技球本作适配：${JSON.stringify(SCIENCE_VESSEL_ADAPTATION)}。主动侦测为三族开局共有能力，不借科技球的战役被动侦测扩大首版能力范围。`);
text.push('### 多武器与变形武器',table(['家族／模式','原武器ID','单发 × 发数','周期秒','最小／最大射程','目标','属性额外伤害','护盾额外伤害'],(Object.keys(SOURCE_UNIT_WEAPON_IDS) as VerifiedAddedUnitType[]).flatMap(id=>sourceWeaponsForUnit(id).map(w=>[name(id),w.weaponId,`${w.attackDamage} × ${w.attacks}`,n(w.attackPeriod),`${w.minimumRange}／${w.attackRange}`,w.targetType,w.bonusDamage.map(b=>`${b.attribute}＋${b.amount}`).join('、')||'—',w.shieldBonus])).concat(Object.entries(SOURCE_UNIT_MODES).flatMap(([mode,m])=>[m.weapon].map(w=>[mode,w.weaponId,`${w.attackDamage} × ${w.attacks}`,n(w.attackPeriod),`${w.minimumRange}／${w.attackRange}`,w.targetType,w.bonusDamage.map(b=>`${b.attribute}＋${b.amount}`).join('、')||'—',w.shieldBonus])))),
 '范围伤害、异龙弹射、潜伏者线形穿刺、巨像双束与虚空基础反甲分别读取 `SOURCE_WEAPON_PATTERNS`。本表不是把每行武器同时对同一目标结算。异龙三跳独立读取9／3／1基值与每级1／0.333／0.111增量；爆虫对建筑读取独立80基值与每级5增量。射弹旅行沿用本工程即时命中适配：例如雷神四发仍在一次攻击结算，原发射间隔仅作为来源数据保留，不能据此声称完全复刻SC2弹道。坦克旧架炮配置见 `SIEGE`；变形共享身体、生命、能量、培养及武器冷却。');

text.push('### 来源科技增量',`以下武器与特色研究增量来自同一 ${SOURCE_UPGRADE_PROFILE.version} 固定导出。按实际攻击效果选择科技，维京的两种模式均属于航空升级。`,
 table(['原伤害效果ID','本作科技ID','一级／二级／三级每次升级增量：基础伤害；属性加成'],Object.entries(SOURCE_WEAPON_UPGRADE_STEPS).map(([id,u])=>[id,u.upgradeKey,u.perLevel.map(step=>`${step.damage}；${Object.entries(step.bonusDamage).map(([a,n])=>a+'＋'+n).join('、')||'无'}`).join('／')])),
 table(['特色研究ID','源UpgradeID','实际效果字段'],Object.entries(SOURCE_RESEARCH_EFFECTS).map(([id,r])=>[id,r.sourceId,JSON.stringify(Object.fromEntries(Object.entries(r).filter(([key])=>key!=='sourceId')))])),
 '速度加值已换算为Faster时钟。潜伏者部署研究只缩短埋入，不能套到钻出；恢复卡分别增强已存在的生命恢复、原生回盾和治疗输出，每个通道只乘一次，不凭空增加恢复能力。');

text.push('## 新规则：持续生产和发展行动',
 '每条生产线最多配置两个产出，按顺序交替；开关只影响尚未付款的未来批次。每条线仍只允许一批在途。虫族每座孵化设施只归属一个序列，不能重复贡献产能。A16可把每家族身体与预付上限从5升至7，S14可把普通军衔升至7。',
 table(['生产线ID','种族','名称','合法家族'],Object.entries(PRODUCTION_LINES).map(([id,line])=>[id,RACE_NAMES[line.race],line.name,line.families.map(name).join('、')])),
 `共 ${DEVELOPMENT.length} 种发展定义。每个第1—17关后窗口至多购买一项，研究／建造即时生效，训练只消耗战斗时间。报价不因钱包不足隐藏，也不随机打折。`,
 table(['ID','种族','行动','类型','价格矿／气','等级／设施上限','前置','最早已完成关卡','关联家族'],DEVELOPMENT.map(d=>[d.id,RACE_NAMES[d.race],d.name,d.kind,Array.from({length:d.maxLevel===3?3:1},(_,i)=>resource(developmentPrice(d,i))).join(' → '),d.maxLevel,list(d.requires),d.afterStage,d.families.map(name).join('、')||'—'])),
 '三级常规研究还受统一时点限制：二级须完成第6关，三级须完成第12关。单设施实验室选择具体未配实验室的对应设施；同一窗口最多购买一项。雷神、雷兽、航母另须完成第9关。',
 '每章分别有一次免费建筑刷新和强化刷新，不结转；每窗口每类还可付费刷新一次。建筑刷新为 50＋10×(章序−1)矿，强化刷新为30＋10×(章序−1)矿。',
 '新家族接收且五个家族槽已满时先冻结模拟，再展示替换。继承等级 = 1＋floor((旧等级−1)／2)，逐存活成员产生记录；每家族身体上限由A16决定为5或7。未出舱、已付款与已投放资产按各自支付账本结清，不能将培养记录重复兑现。');

text.push('## 新规则：强化三选一',
 table(['已完成关卡','白','绿','蓝','紫','橙'],[1,6,12].map((stage,index)=>[['1—5','6—11','12—17'][index],...expeditionRarityWeights(stage).map(v=>v+'%')])),
 table(['效果ID','名称','类别','白／绿／蓝／紫／橙（配置值）','同目标上限（配置值）'],Object.entries(EXPEDITION_CARD_DEFINITIONS).map(([id,c])=>[id,c.name,c.category,c.values.join('／'),c.cap])),
 '百分比卡的配置值0.03表示3%；护甲为固定加值，培养为等级增量。第一张须立即有收益，其余类别权重为核心50／协同30／通用20；已上场目标权重3、已配置且开启的未来产出2、其他合法目标1。',
 `英雄保底窗口：第 ${CAMPAIGN18_HERO_WINDOWS.join('／')} 关；第 ${CAMPAIGN18_PURPLE_WINDOWS.join('／')} 关至少一张紫色以上。连续三个窗口未展示蓝色以上，下个窗口至少蓝色。保底随窗口推进，刷新不推进保底计数。`,
 '每窗口默认免费领取一张；R09可从同组三张再领1或2张，不另抽牌。未入编家族只可获得生产支持，不靠卡牌直接引入新家族。地图永久强化每章最多一张，全程最多六张；R14另产生独立紫／橙击杀掉落，均保存收据。');

text.push(`## 新规则：${ALL_HERO_IDS.length}名英雄`,
 '各族五选三身份，阵亡仍占身份名额。招募顺序绑定技能槽1／2／3；等级1—5，同名卡升级但不复活。新增技能数值是本作实验参数，不能据原模型名称声称为原版技能。',
 table(['ID','种族','英雄','HP／护盾','生命护甲','单发 × 发数','周期秒','射程／移速','普攻目标','属性','先天隐形'],ALL_HERO_IDS.map(id=>{const h=HEROES[id];return [id,RACE_NAMES[h.race],h.name,`${h.hp}／${h.shield}`,h.armor,`${h.damage} × ${h.attacks}`,h.period,`${h.range}／${h.speed}`,h.target,list(h.attributes),h.innateCloak?'是':'否'];})),
 table(['英雄','主动技能','一级基础量','范围参数：射程／半径／长度／宽度','前摇或首个结算延迟秒','冷却秒','模型ID'],ALL_HERO_IDS.map(id=>{const h=HEROES[id];return [h.name,h.skill,h.skillDamage,`${h.skillRange}／${h.radius}／${h.length}／${h.width}`,h.delay,h.cooldown,h.model];})),
 '“一级基础量”依技能分别指单次伤害、每次治疗或每目标回盾，控制技能可为0；弹幕次数、持续伤害、合法目标及控制时长由技能执行器定义，不能将该列直接当作技能总伤害。伤害／治疗／回盾量每级增加25%，范围、冷却及控制不成长。复活价格250矿／100气×[1＋0.25×(等级−1)]，下一关部署且技能从完整冷却开始。');

text.push(`## 新规则：${Object.keys(ELITES).length}款唯一精英`,
 '每个家族同时最多一名精英，占该家族普通身体席位；同局锁定一种变体。多变体家族不会获得更高抽中概率。下列新增专属效果只应用一次，不随精英等级额外重复相乘。',
 table(['ID','名称','家族','模板','专属能力','新效果配置','模型ID'],Object.values(ELITES).map(e=>[e.id,e.name,name(e.family),e.template,e.id==='medivac.3'?'恢复输出＋25%，主系／跨系比例保持1与1/3。':e.description,e.effect?`${e.effect.stat}：${e.effect.amount}`:'由既有精英规则执行',e.model])),
 '医疗艇维修变体在当前规则改为恢复输出＋25%。皮肤来源和能力是两个维度，不能据皮肤声称对应原版技能。',
 table(['模板','输出倍率','攻速倍率','HP倍率','移速倍率','额外护甲','每级输出增量','每级攻速增量','每级HP增量'],Object.entries(ELITE_TEMPLATES).map(([id,t])=>[id,t.output,t.as,t.hp,t.move,t.armor,t.dpsStep,t.asStep,t.hpStep])),
 '模板相对于普通五级基准，具体比例由 `eliteStats()` 计算。精英永久死亡后重招从一级开始，沿用本局已锁定路径。');

text.push(`## 当前规则：${MVP_TALENTS.length}个天赋节点`,
 `每族资源管理、强化士兵、军队管控各16节点／41可购级，微操7节点／17可购级；四线共用${TALENT_POINT_CAP}点玩家等级。每买一级只占1点，资源依层收费。主线第1—7层每级依次${MAIN_TIER_COSTS.join('／')}资源；微操依次${MICRO_TIER_COSTS.join('／')}资源。主线满额41点／59资源，微操满额17点／64资源。`,
 `前置依已批准的逐级节点图校验；上一层最低投入门槛依次为${PREVIOUS_TIER_POINTS.join('／')}点。不同种族的对象与效果逐节点独立定义，不把原版三主线替换成新列。`,
 '每族三份预设，共九份；只有一个活跃方案实际扣资源。局外按已花金额全额洗点、切换预设；开局冻结当前种族和天赋，读档使用战局快照。英雄与临时单位按逐节点对象规则处理，截击机仅继承母航母明确指定的输出和微操一次。');
for(const race of RACES)for(const line of TALENT_LINES)text.push(`### ${RACE_NAMES[race]} · ${line.name}`,table(['层','ID','节点','等级上限','每级占点／资源','语义ID','节点前置','效果'],MVP_TALENTS.filter(t=>t.race===race&&t.line===line.id).map(t=>[t.tier,t.id,t.name,t.maxRank,`${t.allocationCost}／${t.resourceCost}`,t.semanticId,t.prerequisiteText,t.description])));
text.push('同属性天赋百分比先相加后乘一次；卡牌同类增量也先相加。A16可把每家族身体上限5提高到7，S14可把普通军衔上限5提高到7，R09可从原组三张强化额外领取。新订单锁定修正后的价格和时间。');

text.push('## 新规则：18关固定战役',
 `配置ID：${CAMPAIGN18_ID}。${CAMPAIGN18_TOTALS.stages} 关／${CAMPAIGN18_TOTALS.chapters} 章／${CAMPAIGN18_TOTALS.intermissions} 个关间窗口，基础战斗 ${CAMPAIGN18_TOTALS.combatSeconds} 秒，基础威胁预算 ${CAMPAIGN18_TOTALS.baseThreat}；通关矿／气总额 ${CAMPAIGN18_TOTALS.minerals}／${CAMPAIGN18_TOTALS.gas}。预算不读取玩家军力或伤亡。`,
 table(['敌军家族','单位威胁权重'],CAMPAIGN18_ENEMIES.map(id=>[name(id),CAMPAIGN18_WEIGHTS[id]])),
 table(['关','章','名称','秒','基础预算','普通波预算','预留：队长／Boss／主巢','威胁份额','奖励矿／气'],CAMPAIGN18_STAGES.map(s=>[s.id,s.chapter,s.name,s.durationSeconds,s.budget,s.waveBudget,`${s.reserves.captain}／${s.reserves.boss}／${s.reserves.mainHive}`,CAMPAIGN18_ENEMIES.filter(t=>s.mix[t]>0).map(t=>`${name(t)}${s.mix[t]}%`).join('、'),s.reward.join('／')])),
 '份额是威胁占比，不是身体占比。身体数采用累计余数分配；队长、Boss、主巢和地狱扩张巢占已预留预算，不能重复叠兵。空投守军另按固定关卡／难度表结算。');
for(const difficulty of difficulties)text.push(`### 新18关 · ${difficultyNames[difficulty]}`,
 `兵量列顺序：${CAMPAIGN18_ENEMIES.map(name).join('／')}。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。`,
 table(['关','秒','波次数','总预算','普通波预算','普通兵量','预留：队长／Boss／主巢／扩张巢','首批守军兵量','奖励矿／气','Drone／虫卵'],CAMPAIGN18_STAGES.map(({id})=>{const s=campaign18StageConfig(id,difficulty);return [id,s.durationSeconds,s.waves,s.budget,s.waveBudget,CAMPAIGN18_ENEMIES.map(t=>s.ambient[t]).join('／'),Object.values(s.reserves).join('／'),CAMPAIGN18_ENEMIES.map(t=>s.guards[t]).join('／'),s.reward.join('／'),`${s.drones}／${s.eggs}`];})),
 table(['章节起始关','压力：总量／波次／守军','压力：HP／伤害／攻速／移速','章节成长：HP／伤害／攻速'],[1,4,7,10,13,16].map(stage=>{const p=campaign18EnemyPressure(difficulty,stage),g=campaign18ChapterGrowth(difficulty,stage);return [stage,[p.total,p.waves,p.guards].map(n).join('／'),[p.health,p.damage,p.attackSpeed,p.moveSpeed].map(n).join('／'),[g.health,g.damage,g.attackSpeed].map(n).join('／')];})));
text.push('第18关主巢全程可攻击、阶段切换不回血；提前摧毁停止其攻击与生产，仍需完成150秒时限。通关要求主巢摧毁和时限结束同时满足。第1—17关按时间推进，存活敵人与伤损跨关保留。24关只是后续独立战役接口，不是当前内容。',
 '普通／简单每3关获得1永久资源，困难每3关2资源，地狱每关1资源；完整18关分别6／12／18。无尽每完整60秒战斗按普通／简单1、困难／地狱2资源结算，未新增20分钟领取上限。无尽保留本局资产，并使用240秒轮次及终章混合敌军池。');

text.push('## 版本边界',
 '当前新局只运行 mvp-1.0 的三族18关、165节点和单套关间经济。M1空天赋档可规范化迁移；旧开发战局不续跑，只能导出原件并一次性核算已证实的永久资源。历史价格表仅供该只读导入核算，不参与当前游戏运行。',
 '## 核对命令','```sh\nnpm run docs:data\nnpm run docs:check\nnode tools/build-expansion-unit-data.mjs --check\nnode tools/build-campaign-science-vessel.mjs --check\n```');
const output=text.join('\n\n')+'\n',path=new URL('../../docs/GAME_DATA_REFERENCE.md',import.meta.url);
if(process.argv.includes('--check')){if(await fs.readFile(path,'utf8')!==output)throw Error('数据参考过期，请运行 npm run docs:data');console.log('Game reference matches runtime data.');}
else {await fs.writeFile(path,output);console.log(`Generated runtime reference: ${ALL_FAMILIES.length} units, ${ALL_HERO_IDS.length} heroes, ${Object.keys(ELITES).length} elites, ${MVP_TALENTS.length} current talents, ${CAMPAIGN18_STAGES.length} stages.`);}
