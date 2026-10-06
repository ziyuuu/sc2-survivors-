import {TEAM_CARD_VALUES,CARD_RARITIES} from '../../src/simulation/progression/team-cards';
import {PLAYER_REAPER_DAMAGE_BONUS,PLAYER_COMBAT_FACTOR} from '../../src/data/player-unit-adaptations';
import fs from 'node:fs/promises';
import {SC2_UNITS,SC2_PROFILE,FASTER} from '../../src/data/sc2-units';
import {HEROES,ALL_HERO_IDS} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import {TERRAN_ELITE_RULES,TERRAN_ELITE_BODIES,terranEliteGrowth,terranEliteArmor} from '../../src/data/terran-elites';
import {ZERG_ELITE_RULES} from '../../src/data/zerg-elites';
import {PROTOSS_ELITE_RULES} from '../../src/data/protoss-elites';
import {terranHeroGrowth} from '../../src/data/terran-heroes';
import {HERO_AURA_DESCRIPTIONS} from '../../src/data/hero-upgrades';
import {ELITE_TEAM_AURAS,HERO_TEAM_AURAS,TEAM_AURA_HELP} from '../../src/data/team-auras';
import {RUN_SCHEMA} from '../../src/simulation/persistence/run-snapshot';
import {CAMPAIGN_MAP_ID,CAMPAIGN_MAP_SIZE,MAP_THEMES} from '../../src/data/campaign-map';
import {RACES,RACE_NAMES,FAMILIES_BY_RACE,ALL_FAMILIES,FAMILY_LIMIT,BODY_LIMIT,ORDINARY_RANK_LIMIT,HERO_LIMIT,MVP_RULES,type FamilyId} from '../../src/data/races';
import {EXPANSION_SOURCE,SOURCE_UNIT_DETAILS,SOURCE_PRODUCTION_RECIPES,SOURCE_UNIT_MODES,SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../src/data/expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL,SCIENCE_VESSEL_SOURCE,CAMPAIGN_SCIENCE_VESSEL_RECIPE,SCIENCE_VESSEL_ADAPTATION} from '../../src/data/campaign-science-vessel';
import {PRODUCTION_LINES,FAMILY_REQUIREMENTS,HEAVY_FAMILIES,DEVELOPMENT,developmentPrice,familyLine} from '../../src/data/expedition-buildings';
import {CAMPAIGN18_ID,CAMPAIGN18_STAGES,CAMPAIGN18_ENEMIES,CAMPAIGN18_WEIGHTS,CAMPAIGN18_TOTALS,campaign18StageConfig,campaign18EnemyPressure,campaign18ChapterGrowth} from '../../src/data/campaign18';
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
const currentElites={...TERRAN_ELITE_RULES,...ZERG_ELITE_RULES,...PROTOSS_ELITE_RULES};

text.push('# 当前游戏数据参考 · 三族18关',
 '本文件由 `npm run docs:data` 从运行配置生成；请修改源码后重新生成。设计规则见 [DESIGN.md](DESIGN.md)，验证状态见 [QA.md](QA.md)。表格是配置参考，不代表全部内容已经通过人工视觉、操作或平衡验收。逐实体最终值还包括培养、科技、天赋、强化与临时状态。',
 '## 规则与来源边界',
 table(['规则','用途','普通家族／身体','英雄身份','战役'],[
  [MVP_RULES,'当前唯一可玩规则',`${FAMILY_LIMIT} 家族 × ${BODY_LIMIT} 基础名额；A16至7名额，跳虫每名额两身体，S14培养至7级`,HERO_LIMIT,`${CAMPAIGN18_ID}：18关`],
 ]),
 `三族目录各 ${FAMILIES_BY_RACE.terran.length} 个普通家族，共 ${ALL_FAMILIES.length} 个；模式、英雄与截击机不另计普通家族。`,
 `除科技球外的普通单位使用固定 SC2 ${SC2_PROFILE.version} 导出版本，修订 ${SC2_PROFILE.revision}。层序：${EXPANSION_SOURCE.layers.join(' → ')}。时钟：${SC2_PROFILE.clock}。已核对导出 XML，未声称与另一安装客户端版本等价。`,
 `科技球独立使用 ${SCIENCE_VESSEL_SOURCE.profile}，版本 ${SCIENCE_VESSEL_SOURCE.version}，buildConfig ${SCIENCE_VESSEL_SOURCE.buildConfig}；不将战役字段伪称为 5.0.15 多人数据，也不叠加合作指挥官强化。`,
 table(['科技球来源文件','SHA-256'],Object.values(SCIENCE_VESSEL_SOURCE.files).map(f=>[f.file,f.sha256])),
 '原模型来源的 CASC 版本为 5.0.16.97563；素材版本不改变上述战斗配置来源。英雄数值、精英能力、建筑报价、天赋、卡牌和战役是本作设计／实验参数。');

text.push('## 玩家战斗统一适配',`普通和精英玩家战斗单位及其适用子体的武器及附加伤害、最大生命、原生护盾、移速、生命/护盾护甲乘 ${PLAYER_COMBAT_FACTOR}，攻击周期除以该因子。工人、建筑、载体和技能/治疗不乘。P3已批准的18名英雄使用下列独立显式机体，普攻和机体不再重复乘该因子或旧1.15普攻适配；旗舰子机使用独立250/.4秒机枪。下方普通来源表未包含这项适配；实际实体以派生值为准。`, '跳虫每名额为一对，共享军衔及精英身份，两身体独立战斗。缺员900固定步后存活者裂变；死亡、培养及换兵按配对账计算。虫后距落地载体6以内注卵，每只45秒冷却、同舱一次、最多两个一级普通名额、零付款、先扣除预付款占位。');
text.push('## 新规则：30个普通家族',
 '以下为一级基础身体和默认主武器。雷神、虫后等多武器、变形与范围模式另见后表；科技球及医疗艇没有普通攻击，航母伤害由所属截击机结算。菌毯修正、护盾和恢复不合并成生命。');
for(const race of RACES)text.push('### '+RACE_NAMES[race],table(['ID','兵种','HP／护盾','生命护甲','移速','单发 × 发数','周期秒','射程','默认目标','属性'],FAMILIES_BY_RACE[race].map(id=>{
 const u=SC2_UNITS[id];return [id,u.zh,`${u.maxHp}／${unitShield(id)}`,u.armor,n(u.movementSpeed),`${u.attackDamage+(id==='reaper'?PLAYER_REAPER_DAMAGE_BONUS:0)} × ${u.attacks}`,n(u.attackPeriod),u.attackRange,u.targetType,list(u.attributes)];
})));
text.push('玩家死神使用本作适配：每周期两次、每次6伤害；锁定来源仍为2×4。军衔、精英、科技和强化在此基础上分别计算一次。');
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
 '范围伤害、异龙弹射、潜伏者线形穿刺、巨像双束与虚空基础反甲分别读取 `SOURCE_WEAPON_PATTERNS`。本表不是把每行武器同时对同一目标结算。异龙三跳独立读取9／3／1基值与每级1／0.333／0.111增量；爆虫对建筑读取独立80基值与每级5增量。来源武器表不代替实际结算：普通、精英和英雄按各自执行器使用实时命中、真实飞行或延迟包；已批准的多发、穿透、二次效果与持久化时钟分别执行，不能据此声称完全复刻SC2弹道。坦克旧架炮配置见 `SIEGE`；变形共享身体、生命、能量、培养及武器冷却。');

text.push('### 来源科技增量',`以下武器与特色研究增量来自同一 ${SOURCE_UPGRADE_PROFILE.version} 固定导出。按实际攻击效果选择科技，维京的两种模式均属于航空升级。`,
 table(['原伤害效果ID','本作科技ID','一级／二级／三级每次升级增量：基础伤害；属性加成'],Object.entries(SOURCE_WEAPON_UPGRADE_STEPS).map(([id,u])=>[id,u.upgradeKey,u.perLevel.map(step=>`${step.damage}；${Object.entries(step.bonusDamage).map(([a,n])=>a+'＋'+n).join('、')||'无'}`).join('／')])),
 table(['特色研究ID','源UpgradeID','实际效果字段'],Object.entries(SOURCE_RESEARCH_EFFECTS).map(([id,r])=>[id,r.sourceId,JSON.stringify(Object.fromEntries(Object.entries(r).filter(([key])=>key!=='sourceId')))])),
 '速度加值已换算为Faster时钟。潜伏者部署研究只缩短埋入，不能套到钻出；恢复卡分别增强已存在的生命恢复、原生回盾和治疗输出，每个通道只乘一次，不凭空增加恢复能力。');

text.push('## 普通敌军与追加虫海',
 '普通敌军：战役1—6关I级、7—12关II级、13—18关III级；无尽1—2轮III级、3—4轮IV级、第5轮起V级。军衔替换普通敌军旧章节生命／伤害／攻速成长。',
 '等级L：攻速1＋0.15×(L−1)，每击伤害L÷攻速倍率，生命1＋0.8×(L−1)，额外护甲0.5×(L−1)。简单减半各增量；困难／地狱再应用一次既有压力。明确兵种阶段升级保留。',
 '第1—6关普通敌人与普通救援守军：简单生命×0.80、普通×0.90，其他难度不变。跳虫最终简单14.4／19.2／24／28，普通16.2／21.6／27／31.5；后者对应第4—6关。精英、Boss、领主、建筑、经济目标不应用。出生后固定，保留原生恢复。',
 '普通难度每关追加I级虫海：7—9关60、10—12关90、13—15关120、16—18关150、无尽每60秒60。70%跳虫／20%蟑螂／10%爆虫；第5秒开始每15秒分批，其他难度按原数量比例、累计余数分配。',
 '追加兵始终使用固定I级基础属性，不叠章节、普通军衔、难度属性或后期兵种升级；正常奖励和击杀天赋。原事件优先，300敌人上限，积压跨关保存，数量不丢弃。');

text.push('## 新规则：持续生产和发展行动',
 '每条生产线最多配置两个产出，按顺序交替；开关只影响尚未付款的未来批次。每条线仍只允许一批在途。虫族每座孵化设施只归属一个序列，不能重复贡献产能。A16可把每家族身体与预付上限从5升至7，S14可把普通军衔升至7。',
 table(['生产线ID','种族','名称','合法家族'],Object.entries(PRODUCTION_LINES).map(([id,line])=>[id,RACE_NAMES[line.race],line.name,line.families.map(name).join('、')])),
 `共 ${DEVELOPMENT.length} 种发展定义。每个第1—17关后窗口至多购买一项，研究／建造即时生效，训练只消耗战斗时间。报价不因钱包不足隐藏。首次选择发展方向，后续记忆方向；购买或跳过后进入随机商店。随机折扣原价／85折／7折／5折的概率为50%／30%／15%／5%，与适用天赋折扣相乘后每资源向上取整。`,
 table(['ID','种族','行动','类型','价格矿／气','等级／设施上限','前置','最早已完成关卡','关联家族'],DEVELOPMENT.map(d=>[d.id,RACE_NAMES[d.race],d.name,d.kind,Array.from({length:d.maxLevel===3?3:1},(_,i)=>resource(developmentPrice(d,i))).join(' → '),d.maxLevel,list(d.requires),d.afterStage,d.families.map(name).join('、')||'—'])),
 '三级常规研究还受统一时点限制：二级须完成第6关，三级须完成第12关。单设施实验室选择具体未配实验室的对应设施；同一窗口最多购买一项。雷神、雷兽、航母另须完成第9关。',
 '发展与商店共享递增刷新次数n：max(10, ceil((50＋40n−20×R03)×(1−0.1×R12)))矿。R06每窗口1／2／3次免费刷新也推进n；零天赋无免费刷新，购物无限刷新。',
 '新家族接收且五个家族槽已满时先冻结模拟，再展示替换。继承等级 = 1＋floor((旧等级−1)／2)，逐存活成员产生记录；每家族身体上限由A16决定为5或7。未出舱、已付款与已投放资产按各自支付账本结清，不能将培养记录重复兑现。');

text.push('## 新规则：三件付费商品与Build卡组',
 table(['已完成关卡','白','绿','蓝','紫','橙'],[1,6,12].map((stage,index)=>[['1—5','6—11','12—17'][index],...expeditionRarityWeights(stage).map(v=>v+'%')])),
 table(['效果ID','名称','类别','白／绿／蓝／紫／橙（配置值）','同目标上限（配置值）'],Object.entries(EXPEDITION_CARD_DEFINITIONS).filter(([id])=>['recovery','energy','production'].includes(id)).map(([id,c])=>[id,c.name,c.category,c.values.join('／'),c.cap])),
 table(['品质','全军伤害／攻速','全军生命及盾／双护甲','每组每品质上限'],CARD_RARITIES.map((r,i)=>[r,`${TEAM_CARD_VALUES.damage[i]*100}%／${TEAM_CARD_VALUES.speed[i]*100}%`,`${TEAM_CARD_VALUES.health[i]*100}%／${TEAM_CARD_VALUES.armor[i]}`,3])),
 '百分比卡的配置值0.03表示3%；护甲为固定加值。培养卡绿蓝紫橙将最低两名普通名额提升至II／III／IV／V，按实际所需等级增量定价。第一张须立即有收益；后两张当前阵容／路线、通用协同、其他合法发展权重70／20／10，空池归一化。九套Build分阶段扩大推荐池，不封锁合法卡。',
 '删除固定关卡英雄、紫卡、连续低品质和强制品质补位；保留分阶段基础稀有度。Boss每三关死亡掉一件：80%紫／20%橙，橙替代紫。',
 '每页三件商品均可购买，售罄不补货；R09每窗口1／2次免单，刷新不消耗免单。数值卡白到橙基础价50/0、90/20、150/50、225/90、325/140；培养为完整配方乘实际等级增量；紫精英为配方乘5，橙V级精英为紫价乘3；英雄750/250。四种经济商品支付25矿/25矿/50矿/75矿25气，分别得到100矿/50气/75矿25气/100矿25气。空投白绿蓝1／2／3名额，直接获兵绿蓝紫1／2／3名额（直接价格乘1.5），按路线攻防进度和卡片品质交集开放三档兵种；不解锁生产。原趣味牌为布雷、随机轰炸、弹药变异与战略打击；每族另有4张独有卡（3自动、1主动），见RACE_FUN_CACHE_20260929.md。先抽品质，再趣味池25%/其他75%，空池重新归一化；每族8张。地图掉落无章节额度，普通／经济工蜂／精英触发率2%／8%／40%；R14另产生独立紫／橙击杀掉落，均保存收据。');

text.push(`## 新规则：${ALL_HERO_IDS.length}名英雄`,
 '各族六选三身份，阵亡仍占身份名额。招募顺序绑定技能槽1／2／3；等级1—5，同名卡升级但不复活。新增技能数值是本作实验参数，不能据原模型名称声称为原版技能。',
 table(['ID','种族','英雄','HP／护盾','生命护甲','单发 × 发数','周期秒','射程／移速','普攻目标','属性','先天隐形'],ALL_HERO_IDS.map(id=>{const h=HEROES[id];return [id,RACE_NAMES[h.race],h.name,`${h.hp}／${h.shield}`,h.armor,`${n(h.damage)} × ${h.attacks}`,n(h.period),`${h.range}／${h.speed}`,h.target,list(h.attributes),h.innateCloak?'是':'否'];})),
 table(['英雄','主动技能','一级基础量','范围参数：射程／半径／长度／宽度','前摇或首个结算延迟秒','冷却秒','模型ID'],ALL_HERO_IDS.map(id=>{const h=HEROES[id];return [h.name,h.skill,h.skillDamage,`${h.skillRange}／${h.radius}／${h.length}／${h.width}`,h.delay,h.cooldown,h.model];})),
 '“一级基础量”依技能分别指单次伤害、每次治疗或每目标回盾，控制技能可为0；弹幕次数、持续伤害、合法目标及控制时长由技能执行器定义，不能将该列直接当作技能总伤害。18英雄固定成长见下表；技能伤害基数按skill/9200缩放。治疗、回盾、复生次数、控制和被动分别读取专属规则，不将它们错误地统一写为每级25%。复活价格250矿／100气×[1＋0.25×(等级−1)]，下一关部署且技能从完整冷却开始。');

text.push('### 英雄I–V固定成长及光环',
 table(['军衔','生命／原生盾倍率','单击倍率','周期倍率','额外生命护甲','被动量倍率','技能伤害基准'],[1,2,3,4,5].map(rank=>{const g=terranHeroGrowth(rank);return [rank,g.health,n(g.damage),g.period,g.armor,g.passive,g.skill];})),
 '三族18英雄采用相同固定成长曲线；基础量来自前表，不合并光环、科技、卡牌和独立护障。原有雷诺家族号令、扎加拉攻速/移动、利维坦近场生命以及实际治疗/回盾被动继续执行；阿塔尼斯原30%保护被40%替换一次。',
 table(['英雄','现行足下光环规则'],ALL_HERO_IDS.map(id=>[HEROES[id].name,HERO_AURA_DESCRIPTIONS[id]])),
 '游戏中显示足下效果，隐藏光环文字；此参考文档保留数值。身份相同取最强，不同英雄合格属性可相加；精英共享池取最强。永久身体、范围、来源存活、可见性、原生盾与生物/机械资格分别核对，真实子体只经母体继承一次；池变化保持伤损比例。',
 table(['两族英雄配置ID','当前队伍配置（执行器还实施资格、时钟与实际生命上限）'],Object.entries(HERO_TEAM_AURAS).map(([id,v])=>[id,JSON.stringify(v)])));

text.push(`## 当前规则：${Object.keys(currentElites).length}款唯一精英`,
 '每个家族同时最多一个精英身份，占一个普通名额；精英跳虫为一对两只身体；同局锁定一种变体。90项只读取三族正式精英规则与当前团队光环；旧模板、重复倍率和旧显示标签已删除。参数JSON来自运行源码，原设计JSON从不作为运行导入。',
 table(['ID','名称','家族','机体','核心机制与当前队伍覆盖','机体/专属基础参数','模型ID'],Object.entries(currentElites).map(([id,e])=>[id,e.name,name(ELITES[id as keyof typeof ELITES].family),e.body,e.description+(Object.hasOwn(TEAM_AURA_HELP,id)?' 当前队伍项覆盖：'+TEAM_AURA_HELP[id as keyof typeof TEAM_AURA_HELP]:''),JSON.stringify(e.parameters),ELITES[id as keyof typeof ELITES].model])),
 table(['机体','相对普通V生命','相对普通V输出','额外护甲I','移速倍率','治疗倍率'],Object.entries(TERRAN_ELITE_BODIES).map(([id,b])=>[id,b.hp,b.dps,b.armor,b.move,b.heal])),
 table(['军衔','输出／治疗成长','生命成长','额外护甲成长','能量倍率'],[1,2,3,4,5].map(rank=>{const g=terranEliteGrowth('marine.1',rank),i=terranEliteGrowth('marine.1',1);return [rank,n(g.damage/i.damage),n(g.health/i.health),n(terranEliteArmor('marine.1',rank)-terranEliteArmor('marine.1',1)),g.energy];})),
 'I级机体以普通V为基准；以上成长仅描述机体层。专属包、周期、付费子机、有限治疗、技能护障、存储伤害与队伍增益由实际执行器结算一次。精英永久死亡后重招从一级开始，沿用本局已锁定路径。皮肤来源和能力是两个维度，不能据皮肤声称对应原版技能。',
 table(['两族精英配置ID','当前队伍配置'],Object.entries(ELITE_TEAM_AURAS).map(([id,v])=>[id,JSON.stringify(v)])),
 '虫后输血为有限六秒生命恢复/吸取；入圈护障固定原始额度与冷却；斯托科夫瘟疫冻结入圈最大生命并等待一秒首跳。Boss抑制与硬控免疫按各机制独立执行。');

text.push(`## 当前规则：${MVP_TALENTS.length}个天赋节点`,
 `每族资源管理、强化士兵、军队管控各16节点／41可购级，微操7节点／17可购级；四线共用${TALENT_POINT_CAP}点玩家等级。每买一级只占1点，资源依层收费。主线第1—7层每级依次${MAIN_TIER_COSTS.join('／')}资源；微操依次${MICRO_TIER_COSTS.join('／')}资源。主线满额41点／59资源，微操满额17点／64资源。`,
 `前置依已批准的逐级节点图校验；上一层最低投入门槛依次为${PREVIOUS_TIER_POINTS.join('／')}点。不同种族的对象与效果逐节点独立定义，不把原版三主线替换成新列。`,
 '每族三份预设，共九份；只有一个活跃方案实际扣资源。局外按已花金额全额洗点、切换预设；开局冻结当前种族和天赋，读档使用战局快照。英雄与临时单位按逐节点对象规则处理，截击机仅继承母航母明确指定的输出和微操一次。');
for(const race of RACES)for(const line of TALENT_LINES)text.push(`### ${RACE_NAMES[race]} · ${line.name}`,table(['层','ID','节点','等级上限','每级占点／资源','语义ID','节点前置','效果'],MVP_TALENTS.filter(t=>t.race===race&&t.line===line.id).map(t=>[t.tier,t.id,t.name,t.maxRank,`${t.allocationCost}／${t.resourceCost}`,t.semanticId,t.prerequisiteText,t.description])));
text.push('同属性天赋百分比先相加后乘一次；卡牌同类增量也先相加。A16可把每家族身体上限5提高到7，S14可把普通军衔上限5提高到7，R09提供随机商店免单次数。新订单锁定修正后的价格和时间。');

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
 '普通／简单每3关获得1永久资源，困难每3关2资源，地狱每关1资源；完整18关分别6／12／18。无尽每完整60秒战斗按普通／简单1、困难／地狱2资源结算，未新增20分钟领取上限。无尽保留本局资产，每60秒结算300矿／250气并购物，每4轮先发展；四分钟混合波次与经济事件切分为四个窗口，特殊敌人计时连续。');

text.push('## 当前地图',
 `地图版本 ${CAMPAIGN_MAP_ID}，五张地图均为 ${CAMPAIGN_MAP_SIZE}×${CAMPAIGN_MAP_SIZE}，三族均从中心（0，0）出发，各关开放净面积相同。新局随机选择并避免与上一局重复；读档保留已选地图和随机种子。`,
 '每图使用独立原版地表与场景组合、真实缓坡和侧区地标；中心及四条主路平坦畅通。地表、物件、脚底与地面弹道共享高度，近战沿实际通路、空中攻击保留原资格规则。大型物件对应真实阻挡，低矮碎石可以通行。',
 table(['地图身份','环境'],Object.entries(MAP_THEMES).map(([id,theme])=>[id,theme.name])),
 '## 版本边界',
 `当前战局schema${RUN_SCHEMA}，永久档案v6。当前新局只运行 mvp-1.0 的三族18关、165节点和单套关间经济。只接收当前格式；旧战局、旧永久档案和旧地图配方直接拒绝，不转换、不提取旧资源。当前档案的导入导出、备份轮换和原子恢复保留。`,
 '## 核对命令','```sh\nnpm run docs:data\nnpm run docs:check\nnode tools/build-expansion-unit-data.mjs --check\nnode tools/build-campaign-science-vessel.mjs --check\n```');
const output=text.join('\n\n')+'\n',path=new URL('../../docs/GAME_DATA_REFERENCE.md',import.meta.url);
if(process.argv.includes('--check')){if((await fs.readFile(path,'utf8')).replace(/\r\n/g,'\n')!==output)throw Error('数据参考过期，请运行 npm run docs:data');console.log('Game reference matches runtime data.');}
else {await fs.writeFile(path,output);console.log(`Generated runtime reference: ${ALL_FAMILIES.length} units, ${ALL_HERO_IDS.length} heroes, ${Object.keys(ELITES).length} elites, ${MVP_TALENTS.length} current talents, ${CAMPAIGN18_STAGES.length} stages.`);}
