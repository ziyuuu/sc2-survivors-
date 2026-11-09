> 历史资料，正文保留 2026-10-30 的兵种研究与旧版号。接入版本、兵种职责和流派决定见 [现行兵种目录](V1X_ROSTER_20261104.md) 与 [修订任务清单](V1X_ROADMAP_20261104.md)。

# 1.x 兵种接入目录与调研依据

2026-10-30。配套 [1.1至1.12版本规划](V1X_RESEARCH_ROADMAP_20261030.md)。以下“接入”“交付”均指计划目标，当前只有明确标为已有的内容属于已实现。

## 目录范围与身份分类

用户已确认普通兵种、精英和战役/合作模式特殊兵种都包含在需求内。本目录以 **SC2对战、三部主要战役、诺娃任务和合作模式**为内容范围；同一个原型的皮肤、模式、子体和具名英雄分开登记。仅在SC1存在而未确认SC2原资源的瓦格雷、蝎子等列为来源调查缺口，不能算进已经确定可交付的SC2数量。纯过场物件、测试单位、废案和敌方不可控道具不自动变成可生产兵种。

| 分类 | 在本作占用什么 | 获取与限制 |
| --- | --- | --- |
| 普通家族 | 一个家族槽，成员按实际名额上限 | 建筑/科技解锁并生产，完整接入训练与补员 |
| 变形/进化模式 | 原成员的同一身份和名额 | 继承伤损、冷却、付款，不生成第二份成员 |
| 原版特殊变体 | 对应家族里的一个来源选择 | 任务合同或科技解锁；同一当局家族默认使用一种来源，不按皮肤增大随机卡池 |
| 本作精英 | 该家族的精英席位 | 现有90个ID保留；新家族按真实战术差异设计，不要求所有辅助单位三种加攻模板 |
| 具名英雄 | 三个英雄槽之一 | 英雄招募/相关任务；已有18英雄不重复新建 |
| 临时支援和子体 | 来源实体、寿命及独立预算 | 不进永久家族，不产生无限成长/任务/掉落链 |
| 工人/生产/运输身份 | 当前经营或任务角色，或明确的辅助家族 | 不因为补单位目录同时引入整套RTS采矿与人口经营 |

“来源选择”和“本作精英分支”不能默认把两套倍率全部相乘。每个组合要列出保留的核心机制、互斥项和成本；初版只开放已逐项定义过的组合，禁止将所有变体与90精英做不受控笛卡尔积。

## 已有内容

| 种族 | 当前10个普通家族 | 已有模式或特殊情况 |
| --- | --- | --- |
| 人族 | 陆战队员、劫掠者、死神、恶火、攻城坦克、雷神、维京、女妖、医疗艇、科技球 | 恶蝠、架炮、维京地空、雷神武器属于模式；科技球已经是战役单位 |
| 虫族 | 跳虫、毒爆、蟑螂、破坏者、刺蛇、虫后、潜伏者、异龙、腐化者、雷兽 | 跳虫双体；毒爆休眠；潜伏者地下移动；这些不是待新增 |
| 神族 | 狂热者、使徒、追猎者、哨兵、不朽者、巨像、高阶圣堂、凤凰、辉光舰、航母 | 航母截击机为子体，不另计家族 |

18名英雄：人族雷诺、泰凯斯、诺娃、斯旺、托什、大和战列巡洋舰；虫族凯瑞甘、扎加拉、德哈卡、斯托科夫、妮雅德拉、利维坦；神族阿塔尼斯、泽拉图、阿拉纳克、菲尼克斯、沃拉尊、净化者旗舰。名称以当前源码为准。

当前精英按30家族各三款，共90款，主要是本作专精设计。它们不能直接当成SC2的佣兵、皇家卫队、净化人格等原版单位已经实现的证据。当前普通/精英原模型也不必然具有新原版身份需要的武器、动作和声音。

来源：[家族](../../src/data/races.ts)、[英雄](../../src/data/heroes.ts)、[精英](../../src/data/elites.ts)、[当前生成参考](../GAME_DATA_REFERENCE.md)。

## 1.3至1.5常规目录补齐

这20个原版身份均在当前本地锁定的5.0.15 XML单位资料中找到对应声明；王虫和监察王虫在本提案中合并为一个家族及形态，因此新增 **19个家族**。若按本表实施，目录从30到49家族：人族16、虫族15、神族18。此数不含后续战役新家族、英雄、临时体和工人；不是SC2官方单位总数。

原数据来自项目已经使用的 [固定导出快照](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)，它是社区托管的暴雪数据导出。只核对到声明，不等于已经解析所有继承层、技能和美术闭包；实现时继续使用项目指定的继承顺序。[来源约定](../DATA_SOURCES.md)

| 编号/版本 | 身份及已找到的源ID | 战斗职责与获取 | 精英/变体方向和关键验收 |
| --- | --- | --- | --- |
| T01 / 1.3 | 幽灵 `Ghost` | 生化线，狙击生物和干扰能量/护盾；兵营高阶科技 | 单体狙击／战术干扰；隐形、视野、能量、Boss抗性 |
| T02 / 1.3 | 寡妇雷 `WidowMine` | 机械线的有限区域控制；重工 | 伏击爆发／快速转点；埋收、目标锁定、重装、移动取消 |
| T03 / 1.3 | 飓风 `Cyclone` | 机动机械，锁定高价值目标；重工 | 长时间锁定／机动护卫；锁定超距/遮挡/死亡解除 |
| T04 / 1.3 | 渡鸦 `Raven` | 机械和空军支援；星港 | 电子压制／无人机支援；侦测与治疗科技球分工 |
| T05 / 1.3 | 解放者 `Liberator` | 航空路线，制空和划区对地；星港 | 地面阵地／空域拦截；区域内外和模式继承 |
| T06 / 1.3 | 战列巡洋舰 `Battlecruiser` | 重型星港单位；普通生产、后期开放 | 主炮爆发／舰队护航；与当前英雄身份、属性和槽位分别校验 |
| Z01 / 1.4 | 感染虫 `Infestor` | 地下控制线；地面进化 | 真菌控制／短时寄生；控制期归属、奖励及Boss排除 |
| Z02 / 1.4 | 虫群宿主 `SwarmHostMP` | 虫群线，用短寿命波次施压；地面进化 | 持续蝗潮／定点突袭；子体预算和来源，不刷永久收益 |
| Z03 / 1.4 | 飞蛇 `Viper` | 巨兽/空军的战术支援；天空进化 | 拉扯关键目标／区域火力抑制；不自动献祭玩家珍贵成员 |
| Z04 / 1.4 | 巢虫领主 `BroodLord` | 后期空中对地攻城；腐化者转化或完整配方生产 | 攻城射程／巢虫控制；母体和巢虫分账 |
| Z05 / 1.4 | 王虫 `Overlord`、监察王虫 `Overseer` | 同一家族的侦察/运输/侦测取舍；运输王虫为模式 | 辅助分支只做真实功能差异；不新增人口经济，变形不复制成员 |
| P01 / 1.5 | 黑暗圣堂 `DarkTemplar` | 灵能线的隐形近战；传送门高阶科技 | 切入／控制；侦测反制、换目标及融合资格 |
| P02 / 1.5 | 执政官 `Archon` | 灵能线的高盾范围前排；两圣堂融合 | 前排护盾／范围火力；材料、输出与槽位同一事务 |
| P03 / 1.5 | 干扰者 `Disruptor` | 机械线的延迟范围爆发；机械台 | 爆发集中／控制覆盖；弹体生命周期及真实伤害时点 |
| P04 / 1.5 | 先知 `Oracle` | 舰队侦察、揭露与能量打击；星门 | 揭露支援／能量突击；有无能量时行为、静滞资格 |
| P05 / 1.5 | 风暴舰 `Tempest` | 后期远程火力；星门 | 重型单体／区域支援；地空目标和过量集火 |
| P06 / 1.5 | 母舰 `Mothership` | 舰队空间支援；后期、最多一艘普通身份 | 护航／转移；独立于净化者旗舰英雄，支援范围和代价明确 |
| P07 / 1.5 | 观察者 `Observer` | 常驻侦测；机械台 | 观察范围／随队生存；不强造攻击型精英 |
| P08 / 1.5 | 折跃棱镜 `WarpPrism` | 运载和接应已付款补员；机械台 | 运载／部署；乘员死亡、接应、空间和订单守恒 |

工人SCV、工蜂、探机已有经济/任务用途，先审计角色与原资源覆盖；MULE、污染者变形虫、侦察幻象等按经营或技能子体处理。不会为它们各开一个普通战斗家族，也不会凭目录名宣布其所有原版能力已接入。

## 1.8人族战役与合作内容

每行是需要完成的内容包，行内身份全部列入该包的交付核对。中文有地区译名差异时，以英文原身份固定映射，正式中文沿用项目选定的一套名称。

| 内容包 | 具体身份 | 本作接法与获取 |
| --- | --- | --- |
| T-C01 经典地面与空军 | Firebat火蝠、Medic医疗兵、Goliath歌利亚、Vulture秃鹫、Diamondback响尾蛇、Wraith怨灵、Spectre幽魂 | 有独立定位的普通家族；分别覆盖近距群伤、地面治疗、双向火力、布雷机动、移动射击、隐形战机及灵能干扰 |
| T-C02 研究/运输 | Predator掠食者、Hercules大力神；Science Vessel科技球已存在 | 掠食者为近战机械选择，大力神为运输/行动支援；科技球复用现有身份。HERC与Warhound先归下方具名英雄身体，不自动扩为普通生产 |
| T-C03 八类佣兵 | War Pigs、Devil Dogs、Hammer Securities、Spartan Company、Siege Breakers、Hel's Angels、Dusk Wings、Jackson's Revenge | 对应陆战队、火蝠、劫掠者、歌利亚、坦克、维京、女妖、战巡的精锐合同；保留原资源身份，费用和补员周期承担强度代价 |
| T-C04 诺娃步兵 | Elite Marine、Marauder Commando、Spec Ops Ghost | 普通家族的特种变体；诺娃英雄继续使用已有ID |
| T-C05 诺娃载具 | Hellbat Ranger、Strike Goliath、Heavy Siege Tank、Raid Liberator、Covert Banshee、Raven Type-II | 对应家族来源变体；范围维修无人机、坦克布雷等技能走实际子体和能量机制 |
| T-C06 蒙斯克基础 | Dominion Trooper及三类武器选择、Dominion Laborer、Imperial Intercessor、Imperial Witness | 帝国士兵是生化来源选择；劳工为经营身份；中介沿医疗艇/运输，证人为辅助身份；不附带无限帝国人口系统 |
| T-C07 六类皇家卫队 | Aegis Guard、Emperor's Shadow、Shock Division、Blackhammer、Sky Fury、Pride of Augustgrad | 对应劫掠者、幽灵、坦克、雷神、维京、战巡的精英路线；高阶解锁独特技能，来自真实成长而不是全部套满开局倍率 |
| T-C08 汉的军队 | Reaper、Hellion、Hellbat、Widow Mine特殊版本、Assault Galleon | 家族变体和可生产炮舰；炮舰产出接入同一生产账，地空辅助不能复制另一套免费兵 |
| T-C09 霍纳舰队 | Asteria Wraith、Deimos Viking、Theia Raven、Sovereign Battlecruiser、Strike Fighter | 前四个为对应航空变体，打击战机为限时任务/技能支援；舰队与地面互补 |
| T-C10 亡命之徒 | Crooked Sam、Sirius、Blaze、Cannonball、Rattlesnake、Vega、Nux、Lt. Nikara；Tychus已有 | 八个具名英雄，使用三个英雄槽。HERC与Warhound身体在此获得明确用途；任务解锁，不能当作免费精英塞入普通席位 |
| T-C11 旗舰与支援 | Hyperion、Dusk Wings支援编队、A.R.E.S.、Odin及相关无人机/炮台 | 按原来源设为限时支援或已有英雄的技能形态；若需新的永久旗舰，另列独立身份，不自动改写当前英雄 |

诺娃的精锐小队、汉霍纳的地空互补、蒙斯克皇家卫队和泰凯斯小队的来源分别见 [诺娃](https://news.blizzard.com/en-gb/article/20320355/patch-3-7-preview-new-co-op-commander-nova)、[汉霍纳](https://news.blizzard.com/en-us/article/21191766/patch-4-0-han-and-horner-commander)、[蒙斯克](https://news.blizzard.com/en-us/article/23185584/new-co-op-commander-arcturus-mengsk)、[泰凯斯](https://news.blizzard.com/en-us/article/22316743/co-op-commander-preview-tychus)。这些资料支持身份和原版机制；表中的槽位、获取及具体限制是本作方案。

佣兵身份参考 [战役佣兵目录](https://www.tentonhammer.com/guides/starcraft-ii-campaign-mercenary-guide)。皇家卫队和机体对应关系补充核对 [合作模式孟斯克资料](https://starcraft2coop.com/commanders/mengsk)。社区资料用于目录交叉核对，数值和资源仍需固定版本源数据。

## 1.9虫族战役与合作内容

| 内容包 | 具体身份 | 本作接法与获取 |
| --- | --- | --- |
| Z-C01 跳虫/毒爆品系 | Raptor/Swarmling；Hunter/Splitter | 分别强调接敌与繁殖、跳跃伏击与分裂。既有双体跳虫和休眠毒爆保持明确模式；不能把三生体或分裂额外身体直接当成新增永久名额 |
| Z-C02 蟑螂/刺蛇品系 | Vile/Corpser；Impaler/Lurker | 减速、寄生和两种地下火力取舍；潜伏者复用已有家族，穿刺者作为独立战术变体/产物 |
| Z-C03 宿主/异龙/雷兽品系 | Carrion/Creeper；Viper/Brood Lord进化关系；Noxious/Torrasque | 飞行蝗虫/地下转点、异龙转化、毒云/复生的实际区别；飞蛇/巢虫领主不重复建立同名家族 |
| Z-C04 扎加拉及战役补充 | Aberration畸变体、Scourge爆蚊、Swarm Queen虫群女王、Bile Launcher相关任务结构 | 畸变体近战屏障，爆蚊对空爆发，女王为虫后来源；自爆/死亡子体不生成永久成长；建筑不塞进普通兵家族 |
| Z-C05 阿巴瑟 | Guardian守护者、Devourer吞噬者、Brutalisk暴掠兽、Leviathan终极进化及Symbiote | 前两种是实际航空分工；终极进化占单一进化席位，利维坦与当前英雄/舰装来源分别保存；不把遭遇“吞噬者”同名当成已实现的原版Devourer |
| Z-C06 原始基础 | Primal Zergling、Primal Roach、Primal Hydralisk、Primal Host、Primal Ultralisk | 对应家族原始来源；原始战斗只使用合格的真实材料 |
| Z-C07 原始产物 | Ravasaur、Primal Igniter、Primal Guardian、Primal Mutalisk、Primal Impaler、Creeper Host、Tyrannozor | 分别对应远程酸液、群体火焰、空中攻城、机动空战、单体地下火力、爆炸子体、重型空地战；融合改变角色和成本 |
| Z-C08 原始领主 | Glevig、Murvar、Dakrun、Primal Wurm/Greater Primal Wurm | 限时支援或任务实体；德哈卡英雄已有，不新增第二个德哈卡 |
| Z-C09 感染步兵 | Infested Civilian、Infested Trooper、Infested Marine、Volatile Infested | 前三种按常驻家族/限时批次分别配置，爆炸体为子体；来源决定训练、掉落和献祭资格 |
| Z-C10 感染载具 | Infested Diamondback、Infested Siege Tank、Infested Liberator、Infested Banshee、Brood Queen | 新来源身份，分别保留束缚空军、活体弹药、群体攻击形态、地下休眠及支援控制特征；不能只把人族载具改颜色 |
| Z-C11 感染巨兽 | Apocalisk、Aleksander | 限时强力支援；来源、到期死亡和重载只结算一次 |
| Z-C12 机械虫群 | Mecha Zergling、Baneling、Hydralisk、Lurker、Infestor、Corruptor、Ultralisk、Battlecarrier Lord | 对应家族机械来源和混合巨兽；机能值决定技能强弱，机能不足仍保留明确基础行为 |
| Z-C13 机械英雄/子体 | Gary/Super Gary、Mecha Roach/Ravager、Mecha Broodling、Locusceptor及机能节点 | 盖瑞是一个英雄的两种形态；其他为有来源子体或有限节点，不另造永久家族席位 |
| Z-C14 运输及召唤补全 | Omega Worm、Nydus、Broodling、Locust、Changeling、工蜂/王虫特殊外观 | 复用现有友方坑道和运输接口；逐项核对其原版身份，不把不同来源的洞口互相冒充 |

七组战役品系通过 [进化任务资料](https://starcraft.fandom.com/wiki/Evolution_mission)及 [战役台词/任务记录](https://starcraft.fandom.com/wiki/StarCraft_II%3A_Heart_of_the_Swarm_campaign_quotations/Evolution_Missions)交叉核对；本次取得了可检索正文，直接页面部分受站点限制。发行版内的准确模型/数值仍作为V19-01源数据验收项。

其余来源：[阿巴瑟](https://news.blizzard.com/en-gb/article/20118421/patch-3-3-abathur-is-coming-to-co-op-missions)、[德哈卡](https://news.blizzard.com/en-us/article/20988565/patch-3-17-preview-new-co-op-commander-dehaka)、[斯托科夫](https://news.blizzard.com/en-us/article/20380441/patch-3-9-preview-new-co-op-commander-stukov)、[斯台特曼](https://news.blizzard.com/en-us/article/22989881/co-op-commander-stetmann)。[机械虫群资料](https://starcraft2coop.com/commanders/stetmann)补充具体机体目录。来源中的大规模铺场、无限距离菌毯与自动免费步兵量不直接复制到本作。

## 1.10神族战役与合作内容

| 内容包 | 具体身份 | 本作接法与获取 |
| --- | --- | --- |
| P-C01 近战 | Zealot已有、Sentinel、Centurion、Legionnaire | 狂热者家族的生存、控制、净化者来源；不是四种占四槽的相同近战 |
| P-C02 远程步兵 | Stalker/​Adept已有、Dragoon；Slayer | 龙骑士补独立机体用途；杀戮者为塔达林追猎来源。Instigator只在有限剧情/历史资料出现，先核源，不当作正式战议会第三个常规选项 |
| P-C03 支援 | Sentry已有、Energizer、Havoc、Conservator | 回盾/加速、目标锁定、保护场；归支援家族的来源选择，能量实际消耗 |
| P-C04 圣堂 | High Templar已有、Dark Archon、Ascendant、Supplicant | 黑暗执政官的支配、升格者施法/献祭、死徒材料分别定义；献祭只用明确允许的来源 |
| P-C05 黑暗圣堂 | Dark Templar于1.5加入、Avenger、Blood Hunter | 复归与控制等分支，死亡/隐形不重置成长和技能 |
| P-C06 重型机械 | Immortal/Colossus已有、Annihilator、Vanguard、Wrathwalker、Reaver | 单体技能、弹幕、重型狙击和甲虫弹药的区别；金甲虫实际弹药消耗/子体寿命需实现 |
| P-C07 轻型航空 | Phoenix已有、Mirage、Corsair、Scout | 闪避护航、干扰场和空地战分工；侦察机补普通家族，其他优先家族来源变体 |
| P-C08 重型航空 | Void Ray已有、Destroyer、Arbiter；Carrier/Tempest/Mothership的派系版本 | 连锁攻击、隐形/召回和舰队支援；每个实际不同机体核原资源，控制技能有Boss边界 |
| P-C09 净化者六人格 | Kaldalis→Legionnaire、Talis→Adept、Taldarin→Immortal、Mojo→Scout、Warbringer→Colossus、Clolarion→Carrier | 六个精英人格，对应实际机体；没有可用备用成员不得凭空迁移 |
| P-C10 菲尼克斯机体 | Praetor、Solarite Dragoon、Cybros Arbiter | 现有菲尼克斯英雄的机体选择/技能形态方案，保留同一英雄身份；各机体能量/冷却独立记录，禁止切换刷新 |
| P-C11 萨尔纳加 | Ambusher、Shieldguard、Void Templar、Enforcer、Abrogator、Void Array、Watcher | 对应追猎、支援、暗堂、不朽、干扰者、棱镜和观察者的来源；阵列成对通行但不重复人口/乘员 |
| P-C12 军团和化身 | Telbrus、Zoraya、Serdath军团，Avatar of Form/Essence，Death Fleet | 临时支援；限时/归属/成长资格与英雄、普通母舰分别保存 |
| P-C13 阵地和方舟支援 | Photon Cannon、Shield Battery、Khaydarin Monolith、Tesseract Cannon/Monolith、Spear of Adun支援 | 作为任务结构或限时支援接入；不凭补兵扩成可随地无限建塔的第二个主游戏 |

原版战议会目录参考 [War council](https://starcraft.fandom.com/wiki/War_council)。该资料也指出Instigator与正式Adept选项的区别；因直读受限，罕见剧情/旧设计身份保留逐源核验，不据搜索名称直接声称已准备。

派系机制与净化人格的官方依据：[卡拉克斯](https://news.blizzard.com/en-us/article/19975211/karax-now-available-in-legacy-of-the-void-co-op-missions)、[阿拉纳克](https://news.blizzard.com/en-gb/article/20273595/patch-3-6-preview-new-co-op-commander-alarak)、[菲尼克斯](https://news.blizzard.com/en-us/article/20720318/patch-3-13-0-preview-new-co-op-commander-fenix)、[泽拉图](https://news.blizzard.com/en-us/article/22640607/co-op-commander-preview-zeratul)。这些身份归属与本作槽位的结合需要新设计，不能把“原作是英雄”简单等同于全部占本作英雄位。

## 共同交付清单

普通家族必须逐项具备以下内容；原版变体、英雄、子体则明确标注不适用项和理由，不能整行只写“完成模型”。

1. **身份与来源**：原作、数据版本、源ID、标准中文名、父家族/来源；区分本作适配与源规则。
2. **原版资源**：主模型、变形/死亡、动作、贴图、武器挂点、弹体/命中、声音、图标。依赖包可在目标入口按需准备。
3. **真实战斗**：武器目标、伤害、护盾、能量、范围、施法前后摇、模式和子体；无渲染回调结算。
4. **获取与经营**：解锁前置、生产线、成本、时长、名额、在途、补员、培养、任务合同和退出处理。
5. **构筑与精英**：至少一条主要路线和一个替代用途；新增战斗家族至少两种实质不同的精英方向，辅助类按功能需要设计。
6. **装备与卡牌**：合法标签、绑定对象、精英/英雄排除、现有套装影响及新机制限制；旧商品回执不追溯改写。
7. **保存与生命周期**：初始、关间、刷新、导入/导出、战败、撤离、转换、限时死亡、重复事件和多页冲突。
8. **玩家呈现**：普通说明讲用途、主要收益与代价；详情给数值和限制。新增页面与交互单独按UI规范确认。
9. **验证与交付**：定向逻辑、正式流程、原版表现核验、受控成本比较、发布清单和实际入口。只把真实覆盖范围写为通过。

## 需要控制的工作量与风险

| 风险 | 为什么与本作有关 | 对应处理 |
| --- | --- | --- |
| 数量膨胀 | 现有卡池已经覆盖30家族与90精英；同一原型再加全部皮肤会稀释有效选项 | 1.2先家族级抽取，特殊来源进入第二层选择；三条路线仍可混搭 |
| 原版资源不足 | 现有M3包主要服务已接入身份；数据XML有声明不代表动作/声音齐全 | 1.1制作源清单，各内容版逐身份验收；没有闭包不称已实现 |
| 大型单位和召唤 | 现有移动端已出现过加载/恢复问题；母舰、机械虫群和分裂会扩大负载 | 按本局身份准备资源，限定新召唤批次和寿命，保留原机验证边界 |
| 三层强度叠加 | 普通等级、来源变体、精英专精、装备可能重复乘算 | 一套共同成长基础；来源核心和精英效果显式组合，不开放未定义组合 |
| 资产重复与丢失 | 融合、人格、运输、感染归属、跨局任务跨多个现有系统 | 先完成1.2的身份与迁移约定；之后每种转换用唯一回执和单事务 |
| 过多手动操作 | 本作需要在手机上移动小队，已有英雄/种族操作 | 通用技能由职责AI施放，保留必要手动控制，不逐单位增加常驻按钮 |
| 平衡被英雄掩盖 | 现有英雄和装备很强，裸单位DPS无法代表实际可玩 | 分别检验基础阵容、普通配装和高投入配装；英雄不是成型前置 |

1.8—1.10是本计划最大的内容版本，各有多个独立内容包，规模明显大于三个新任务。正式立项前依据第一批真实资源提取和一个完整单位接入的工时估算，再安排包内顺序；不能从本目录条目数推算日历工期。若资源瓶颈要求拆版，应顺延后续版本号并保留所有任务归属，不隐去未交付身份。

## 调研证据边界

- 已核对当前源码目录、成长/选敌/卡牌/生产入口、装备目录、任务/遭遇/特殊关、检查点合同以及20个常规候选源ID。
- 已读取公开开发者文章、游戏官方商店介绍，并用社区目录交叉核对原版身份。部分SC2官网入口和Fandom直读失败，未把它们写成原客户端实测或完整美术可用证明。
- 本轮没有启动SC2客户端、试玩外部地图、提取新模型、修改游戏、运行新平衡实验或部署。新增数值、自动行为与版本适配是待实施方案，其可行性来自现有接口和约束分析。
- 版本任务、构筑和传奇目标见主规划；简要核对记录见 [研究报告](../../reports/qa/v1x-research-roadmap-20261030.json)。
