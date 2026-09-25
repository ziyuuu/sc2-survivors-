# 当前游戏数据参考 · 三族18关

本文件由 `npm run docs:data` 从运行配置生成；请修改源码后重新生成。设计规则见 [DESIGN.md](DESIGN.md)，验证状态见 [QA.md](QA.md)。表格是配置参考，不代表全部内容已经通过人工视觉、操作或平衡验收。逐实体最终值还包括培养、科技、天赋、强化与临时状态。

## 规则与来源边界

| 规则 | 用途 | 普通家族／身体 | 英雄身份 | 战役 |
| --- | --- | --- | --- | --- |
| mvp-1.0 | 当前唯一可玩规则 | 5 家族 × 5 基础身体；A16至7身体，S14培养至7级 | 3 | three-races-18：18关 |

三族目录各 10 个普通家族，共 30 个；模式、英雄与截击机不另计普通家族。

除科技球外的普通单位使用固定 SC2 5.0.15 导出版本，修订 fbbd6429b1eb6978c78a092dc68ba09029d03171。层序：core → liberty → swarm → void → voidmulti → balancemulti。时钟：Normal XML duration / 1.4; rates * 1.4。已核对导出 XML，未声称与另一安装客户端版本等价。

科技球独立使用 Liberty campaign + LibertyStory production; no StarCoop modifiers，版本 5.0.16.97563，buildConfig 5bc8dcc1fade3a320c12936586b7c0ed；不将战役字段伪称为 5.0.15 多人数据，也不叠加合作指挥官强化。

| 科技球来源文件 | SHA-256 |
| --- | --- |
| .cache/sc2-campaign-data/liberty-unitdata.xml | 52026354da439891b67b4767f3caa7adb21088382aa61f167ac30f692574b963 |
| .cache/sc2-campaign-data/liberty-abildata.xml | 4c4020f5bbd1bd02cc88df5be7946e045626869967fd120631fd04032471f746 |
| .cache/sc2-campaign-data/liberty-effectdata.xml | 6e0739ef81bf313f0bbe42d6d1b8b029a45753ad4892cf39fbeb2fc6442159f4 |
| .cache/sc2-campaign-data/libertystory-abildata.xml | 0241cbd3ad314be4b59e4415b710bef70444cf4a16647d7338e5cc850bc32814 |

原模型来源的 CASC 版本为 5.0.16.97563；素材版本不改变上述战斗配置来源。英雄数值、精英能力、建筑报价、天赋、卡牌和战役是本作设计／实验参数。

## 新规则：30个普通家族

以下为一级基础身体和默认主武器。雷神、虫后等多武器、变形与范围模式另见后表；科技球及医疗艇没有普通攻击，航母伤害由所属截击机结算。菌毯修正、护盾和恢复不合并成生命。

### 人族

| ID | 兵种 | HP／护盾 | 生命护甲 | 移速 | 单发 × 发数 | 周期秒 | 射程 | 默认目标 | 属性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| marine | 陆战队员 | 45／0 | 0 | 3.15 | 6 × 1 | 0.6149 | 5 | both | Light、Biological |
| marauder | 劫掠者 | 125／0 | 1 | 3.15 | 10 × 1 | 1.0714 | 6 | ground | Armored、Biological |
| reaper | 死神 | 60／0 | 0 | 5.25 | 4 × 2 | 0.7857 | 5 | ground | Light、Biological |
| hellion | 恶火 | 90／0 | 0 | 5.95 | 8 × 1 | 1.7857 | 5 | ground | Light、Mechanical |
| tank | 攻城坦克 | 175／0 | 1 | 3.15 | 15 × 1 | 0.7429 | 7 | ground | Armored、Mechanical |
| thor | 雷神 | 400／0 | 1 | 2.625 | 30 × 2 | 0.9143 | 7 | ground | Armored、Mechanical、Massive |
| viking | 维京 | 135／0 | 0 | 3.85 | 10 × 2 | 1.4286 | 9 | air | Armored、Mechanical |
| banshee | 女妖 | 140／0 | 0 | 3.85 | 12 × 2 | 0.8929 | 6 | ground | Light、Mechanical |
| medivac | 医疗运输机 | 150／0 | 1 | 3.5 | 0 × 0 | 0.7143 | 0 | none | Armored、Mechanical |
| science_vessel | 科技球 | 200／0 | 1 | 2.8 | 0 × 0 | 1 | 0 | none | Light、Mechanical |

### 虫族

| ID | 兵种 | HP／护盾 | 生命护甲 | 移速 | 单发 × 发数 | 周期秒 | 射程 | 默认目标 | 属性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zergling | 跳虫 | 35／0 | 0 | 4.1343 | 5 × 1 | 0.4971 | 0.1 | ground | Light、Biological |
| baneling | 爆虫 | 30／0 | 0 | 3.5 | 16 × 1 | 0.595 | 0.25 | ground | Biological |
| roach | 蟑螂 | 145／0 | 1 | 3.15 | 16 × 1 | 1.4286 | 4 | ground | Armored、Biological |
| ravager | 破坏者 | 120／0 | 1 | 3.85 | 16 × 1 | 1.1429 | 6 | ground | Biological |
| hydralisk | 刺蛇 | 90／0 | 0 | 3.15 | 12 × 1 | 0.5893 | 5 | both | Light、Biological |
| queen | 虫后 | 175／0 | 1 | 1.3125 | 4 × 2 | 0.7143 | 5 | ground | Biological、Psionic |
| lurker | 潜伏者 | 190／0 | 1 | 4.1343 | 0 × 0 | 1 | 0 | none | Armored、Biological |
| mutalisk | 异龙 | 120／0 | 0 | 5.6 | 9 × 1 | 1.089 | 3 | both | Light、Biological |
| corruptor | 腐化者 | 200／0 | 2 | 4.725 | 14 × 1 | 1.3571 | 6 | air | Armored、Biological |
| ultralisk | 雷兽 | 500／0 | 2 | 4.1343 | 35 × 1 | 0.6143 | 1 | ground | Armored、Biological、Massive |

### 神族

| ID | 兵种 | HP／护盾 | 生命护甲 | 移速 | 单发 × 发数 | 周期秒 | 射程 | 默认目标 | 属性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zealot | 狂热者 | 100／50 | 1 | 3.15 | 8 × 2 | 0.8571 | 0.1 | ground | Light、Biological |
| adept | 使徒 | 70／70 | 1 | 3.5 | 10 × 1 | 1.6071 | 4 | ground | Light、Biological |
| stalker | 追猎者 | 80／80 | 1 | 4.1343 | 13 × 1 | 1.3357 | 6 | both | Armored、Mechanical |
| sentry | 哨兵 | 40／40 | 1 | 3.5 | 6 × 1 | 0.7143 | 5 | both | Mechanical、Psionic |
| immortal | 不朽者 | 200／100 | 1 | 3.15 | 20 × 1 | 1.1429 | 6 | ground | Armored、Mechanical |
| colossus | 巨像 | 250／100 | 1 | 3.15 | 10 × 2 | 1.0714 | 7 | ground | Armored、Mechanical、Massive |
| high_templar | 高阶圣堂武士 | 40／40 | 0 | 2.8218 | 4 × 1 | 1.2529 | 6 | ground | Light、Biological、Psionic |
| phoenix | 凤凰 | 120／60 | 0 | 5.95 | 5 × 2 | 0.7857 | 5 | air | Light、Mechanical |
| void_ray | 虚空辉光舰 | 150／100 | 0 | 3.85 | 6 × 1 | 0.3571 | 6 | both | Armored、Mechanical |
| carrier | 航母 | 300／150 | 2 | 2.625 | 0 × 0 | 0.3571 | 8 | both | Armored、Mechanical、Massive |

### 完整生产配方

费用按最终交付的一名身体列出，进化体费用已包含基础体，不再重复收费。完整训练时间为基础体与进化阶段之和；跳虫通常一批双生，单体尾单按单体价格、同一配方时间。新订单锁定实际价格与训练时间，旧订单不追溯改价。

| 家族 | 生产线 | 矿／气（每身体） | 完整秒 | 基础秒＋进化秒 | 通常身体／配方 | 基础体 | 本作前置 | 额外关卡条件 | 来源训练项 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 陆战队员 | 兵营 | 50／0 | 17.8571 | 17.8571＋0 | 1 | — | barracks | — | BarracksTrain/Train1 |
| 劫掠者 | 兵营 | 100／25 | 21.4286 | 21.4286＋0 | 1 | — | barracks_lab | — | BarracksTrain/Train4 |
| 死神 | 兵营 | 50／50 | 32.1429 | 32.1429＋0 | 1 | — | barracks | — | BarracksTrain/Train2 |
| 恶火 | 重工厂 | 100／0 | 21.4286 | 21.4286＋0 | 1 | — | factory | — | FactoryTrain/Train6 |
| 攻城坦克 | 重工厂 | 150／125 | 32.1429 | 32.1429＋0 | 1 | — | factory_lab | — | FactoryTrain/Train2 |
| 雷神 | 重工厂 | 300／200 | 42.8571 | 42.8571＋0 | 1 | — | factory_lab、armory | 完成第9关 | FactoryTrain/Train5 |
| 维京 | 星港 | 125／75 | 30 | 30＋0 | 1 | — | starport | — | StarportTrain/Train5 |
| 女妖 | 星港 | 150／100 | 42.8571 | 42.8571＋0 | 1 | — | starport_lab | — | StarportTrain/Train2 |
| 医疗运输机 | 星港 | 100／100 | 30 | 30＋0 | 1 | — | starport | — | StarportTrain/Train1 |
| 科技球 | 星港 | 100／200 | 42.8571 | 42.8571＋0 | 1 | — | science_facility | — | StarportTrain/Train7 |
| 跳虫 | 基础虫群 | 25／0 | 17.1429 | 17.1429＋0 | 2 | — | pool | — | LarvaTrain/Train2 |
| 爆虫 | 基础虫群 | 50／25 | 31.4286 | 17.1429＋14.2857 | 1 | 跳虫 | baneling_nest | — | MorphToBaneling/1 |
| 蟑螂 | 基础虫群 | 75／25 | 19.2857 | 19.2857＋0 | 1 | — | roach_warren | — | LarvaTrain/Train10 |
| 破坏者 | 地面进化 | 100／100 | 31.4286 | 19.2857＋12.1429 | 1 | 蟑螂 | roach_warren、lair | — | MorphToRavager/1 |
| 刺蛇 | 地面进化 | 100／50 | 23.5714 | 23.5714＋0 | 1 | — | hydralisk_den | — | LarvaTrain/Train4 |
| 虫后 | 基础虫群 | 175／0 | 35.7143 | 35.7143＋0 | 1 | — | pool | — | TrainQueen/Train1 |
| 潜伏者 | 地面进化 | 150／150 | 41.6071 | 23.5714＋18.0357 | 1 | 刺蛇 | lurker_den | — | MorphToLurker/1 |
| 异龙 | 飞行虫群 | 100／100 | 23.5714 | 23.5714＋0 | 1 | — | spire | — | LarvaTrain/Train5 |
| 腐化者 | 飞行虫群 | 150／100 | 28.5714 | 28.5714＋0 | 1 | — | spire | — | LarvaTrain/Train12 |
| 雷兽 | 地面进化 | 275／200 | 39.2857 | 39.2857＋0 | 1 | — | ultralisk_cavern | 完成第9关 | LarvaTrain/Train7 |
| 狂热者 | 传送门 | 100／0 | 27.1429 | 27.1429＋0 | 1 | — | gateway | — | GatewayTrain/Train1 |
| 使徒 | 传送门 | 100／25 | 30 | 30＋0 | 1 | — | cybernetics_core | — | GatewayTrain/Train7 |
| 追猎者 | 传送门 | 125／50 | 27.1429 | 27.1429＋0 | 1 | — | cybernetics_core | — | GatewayTrain/Train2 |
| 哨兵 | 传送门 | 50／100 | 22.8571 | 22.8571＋0 | 1 | — | cybernetics_core | — | GatewayTrain/Train6 |
| 不朽者 | 机械台 | 275／100 | 39.2857 | 39.2857＋0 | 1 | — | robotics | — | RoboticsFacilityTrain/Train4 |
| 巨像 | 机械台 | 300／200 | 53.5714 | 53.5714＋0 | 1 | — | robotics_bay | — | RoboticsFacilityTrain/Train3 |
| 高阶圣堂武士 | 传送门 | 50／150 | 39.2857 | 39.2857＋0 | 1 | — | templar_archives | — | GatewayTrain/Train4 |
| 凤凰 | 星门 | 150／100 | 25 | 25＋0 | 1 | — | stargate | — | StargateTrain/Train1 |
| 虚空辉光舰 | 星门 | 200／150 | 37.1429 | 37.1429＋0 | 1 | — | stargate | — | StargateTrain/Train5 |
| 航母 | 星门 | 350／250 | 64.2857 | 64.2857＋0 | 1 | — | fleet_beacon | 完成第9关 | StargateTrain/Train3 |

科技球使用独立战役配方；其余配方使用固定多人导出。旧规则的基础体训练字段保留原值，不能拿旧表中爆虫／破坏者的进化阶段时间当作新局完整配方时间。

### 护盾、能量与固有恢复

| 家族 | 护盾护甲 | 回盾／秒 | 受击延迟秒 | 初始／最大能量 | 回能／秒 | 固有生命恢复／秒 | 生命恢复延迟秒 | 菌毯移速系数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 陆战队员 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 劫掠者 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 死神 | 0 | 0 | 0 | 0／0 | 0 | 2.8 | 7.1429 | 1 |
| 恶火 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 攻城坦克 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 雷神 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 维京 | 0 | 0 | 0 | 0／0 | 0 | 0 | 0 | 1 |
| 女妖 | 0 | 0 | 0 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 医疗运输机 | 0 | 0 | 0 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 科技球 | 0 | 0 | 0 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 跳虫 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 爆虫 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 蟑螂 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 破坏者 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 刺蛇 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 虫后 | 0 | 0 | 0 | 25／200 | 0.7875 | 0.3828 | 0 | 2.6665 |
| 潜伏者 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 异龙 | 0 | 0 | 0 | 0／0 | 0 | 1.4 | 0 | 1 |
| 腐化者 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1 |
| 雷兽 | 0 | 0 | 0 | 0／0 | 0 | 0.3828 | 0 | 1.3 |
| 狂热者 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 使徒 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 追猎者 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 哨兵 | 0 | 2.8 | 7.1429 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 不朽者 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 巨像 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 高阶圣堂武士 | 0 | 2.8 | 7.1429 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 凤凰 | 0 | 2.8 | 7.1429 | 50／200 | 0.7875 | 0 | 0 | 1 |
| 虚空辉光舰 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |
| 航母 | 0 | 2.8 | 7.1429 | 0／0 | 0 | 0 | 0 | 1 |

虫族默认满足菌毯条件，只将其实际拥有的菌毯效果应用一次。医修按实际恢复的生命耗能：医疗艇对生物全效／机械三分之一；科技球对机械全效／生物三分之一。降低跨类型恢复速率不再额外增加每点生命能耗。

科技球本作适配：{"mechanicalRecoveryMultiplier":1,"biologicalRecoveryMultiplier":0.3333333333333333,"excludeSelf":true,"excludeStructures":true,"passiveDetector":false,"irradiate":false}。主动侦测为三族开局共有能力，不借科技球的战役被动侦测扩大首版能力范围。

### 多武器与变形武器

| 家族／模式 | 原武器ID | 单发 × 发数 | 周期秒 | 最小／最大射程 | 目标 | 属性额外伤害 | 护盾额外伤害 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 死神 | P38ScytheGuassPistol | 4 × 2 | 0.7857 | 0／5 | ground | — | 0 |
| 雷神 | JavelinMissileLaunchers | 6 × 4 | 2.1429 | 0／10 | air | Light＋6 | 0 |
| 雷神 | ThorsHammer | 30 × 2 | 0.9143 | 0／7 | ground | — | 0 |
| 维京 | LanzerTorpedoes | 10 × 2 | 1.4286 | 0／9 | air | Armored＋4 | 0 |
| 女妖 | BacklashRockets | 12 × 2 | 0.8929 | 0／6 | ground | — | 0 |
| 虫后 | AcidSpines | 9 × 1 | 0.7143 | 0／7 | air | — | 0 |
| 虫后 | Talons | 4 × 2 | 0.7143 | 0／3 | ground | — | 0 |
| 虫后 | TalonsMissile | 4 × 2 | 0.7143 | 3／5 | ground | — | 0 |
| 异龙 | GlaiveWurm | 9 × 1 | 1.089 | 0／3 | both | — | 0 |
| 腐化者 | ParasiteSpore | 14 × 1 | 1.3571 | 0／6 | air | Massive＋6 | 0 |
| 雷兽 | KaiserBlades | 35 × 1 | 0.6143 | 0／1 | ground | — | 0 |
| 狂热者 | PsiBlades | 8 × 2 | 0.8571 | 0／0.1 | ground | — | 0 |
| 使徒 | Adept | 10 × 1 | 1.6071 | 0／4 | ground | Light＋12 | 0 |
| 追猎者 | ParticleDisruptors | 13 × 1 | 1.3357 | 0／6 | both | Armored＋5 | 0 |
| 哨兵 | DisruptionBeam | 6 × 1 | 0.7143 | 0／5 | both | — | 4 |
| 不朽者 | PhaseDisruptors | 20 × 1 | 1.1429 | 0／6 | ground | Armored＋30 | 0 |
| 巨像 | ThermalLances | 10 × 2 | 1.0714 | 0／7 | ground | Light＋5 | 0 |
| 高阶圣堂武士 | HighTemplarWeapon | 4 × 1 | 1.2529 | 0／6 | ground | — | 0 |
| 凤凰 | IonCannons | 5 × 2 | 0.7857 | 0／5 | air | Light＋5 | 0 |
| 虚空辉光舰 | VoidRaySwarm | 6 × 1 | 0.3571 | 0／6 | both | Armored＋4 | 0 |
| 航母 | InterceptorLaunch | 0 × 0 | 0.3571 | 0／8 | both | — | 0 |
| hellbat | HellionTank | 18 × 1 | 1.4286 | 0／2 | ground | — | 0 |
| viking_assault | TwinGatlingCannon | 12 × 1 | 0.7143 | 0／6 | ground | Mechanical＋8 | 0 |
| lurker_burrowed | LurkerMP | 20 × 1 | 1.4286 | 0／8 | ground | Armored＋10 | 0 |
| thor_high_impact | LanceMissileLaunchers | 25 × 1 | 0.9143 | 0／11 | air | Massive＋10 | 0 |

范围伤害、异龙弹射、潜伏者线形穿刺、巨像双束与虚空基础反甲分别读取 `SOURCE_WEAPON_PATTERNS`。本表不是把每行武器同时对同一目标结算。异龙三跳独立读取9／3／1基值与每级1／0.333／0.111增量；爆虫对建筑读取独立80基值与每级5增量。射弹旅行沿用本工程即时命中适配：例如雷神四发仍在一次攻击结算，原发射间隔仅作为来源数据保留，不能据此声称完全复刻SC2弹道。坦克旧架炮配置见 `SIEGE`；变形共享身体、生命、能量、培养及武器冷却。

### 来源科技增量

以下武器与特色研究增量来自同一 5.0.15 固定导出。按实际攻击效果选择科技，维京的两种模式均属于航空升级。

| 原伤害效果ID | 本作科技ID | 一级／二级／三级每次升级增量：基础伤害；属性加成 |
| --- | --- | --- |
| GuassRifle | terran.infantry | 1；无／1；无／1；无 |
| P38ScytheGuassPistol | terran.infantry | 1；无／1；无／1；无 |
| PunisherGrenadesU | terran.infantry | 1；Armored＋1／1；Armored＋1／1；Armored＋1 |
| ThorsHammerDamage | terran.vehicle | 3；无／3；无／3；无 |
| JavelinMissileLaunchersDamage | terran.vehicle | 1；Light＋1／1；Light＋1／1；Light＋1 |
| 90mmCannons | terran.vehicle | 2；Armored＋1／2；Armored＋1／2；Armored＋1 |
| CrucioShockCannonBlast | terran.vehicle | 4；Armored＋1／4；Armored＋1／4；Armored＋1 |
| InfernalFlameThrower | terran.vehicle | 1；Light＋1／1；Light＋1／1；Light＋1 |
| HellionTankDamage | terran.vehicle | 2；无／2；无／2；无 |
| LanceMissileLaunchersDamage | terran.vehicle | 3；Massive＋1／3；Massive＋1／3；Massive＋1 |
| BacklashRocketsU | terran.air_weapon | 1；无／1；无／1；无 |
| LanzerTorpedoesDamage | terran.air_weapon | 1；无／1；无／1；无 |
| TwinGatlingCannons | terran.air_weapon | 1；Mechanical＋1／1；Mechanical＋1／1；Mechanical＋1 |
| Claws | zerg.melee | 1；无／1；无／1；无 |
| KaiserBladesDamage | zerg.melee | 3；无／3；无／3；无 |
| VolatileBurstU | zerg.melee | 2；无／2；无／2；无 |
| VolatileBurstU2 | zerg.melee | 5；无／5；无／5；无 |
| NeedleSpinesDamage | zerg.missile | 1；无／1；无／1；无 |
| Talons | zerg.missile | 1；无／1；无／1；无 |
| AcidSpines | zerg.missile | 1；无／1；无／1；无 |
| AcidSalivaU | zerg.missile | 2；无／2；无／2；无 |
| TalonsMissileDamage | zerg.missile | 1；无／1；无／1；无 |
| RavagerWeaponDamage | zerg.missile | 2；无／2；无／2；无 |
| LurkerMPDamage | zerg.missile | 2；Armored＋1／2；Armored＋1／2；Armored＋1 |
| GlaiveWurmU1 | zerg.flyer_weapon | 1；无／1；无／1；无 |
| GlaiveWurmU2 | zerg.flyer_weapon | 0.333；无／0.333；无／0.333；无 |
| GlaiveWurmU3 | zerg.flyer_weapon | 0.111；无／0.111；无／0.111；无 |
| ParasiteSporeDamage | zerg.flyer_weapon | 1；Massive＋1／1；Massive＋1／1；Massive＋1 |
| PsiBlades | protoss.ground_weapon | 1；无／1；无／1；无 |
| DisruptionBeamDamage | protoss.ground_weapon | 1；无／1；无／1；无 |
| ParticleDisruptorsU | protoss.ground_weapon | 1；Armored＋1／1；Armored＋1／1；Armored＋1 |
| PhaseDisruptors | protoss.ground_weapon | 2；Armored＋3／2；Armored＋3／2；Armored＋3 |
| ThermalLancesMU | protoss.ground_weapon | 1；Light＋1／1；Light＋1／1；Light＋1 |
| AdeptDamage | protoss.ground_weapon | 1；Light＋1／1；Light＋1／1；Light＋1 |
| HighTemplarWeaponDamage | protoss.ground_weapon | 1；无／1；无／1；无 |
| IonCannonsU | protoss.air_weapon | 1；无／1；无／1；无 |
| InterceptorBeamDamage | protoss.air_weapon | 1；无／1；无／1；无 |
| VoidRaySwarmDamage | protoss.air_weapon | 1；无／1；无／1；无 |

| 特色研究ID | 源UpgradeID | 实际效果字段 |
| --- | --- | --- |
| infernal | HighCapacityBarrels | {"hellionLightBonus":5,"hellbatLightBonus":12} |
| shield | ShieldWall | {"maxHpAdd":10} |
| ling_speed | zerglingmovementspeed | {"speedAdd":2.4444} |
| bane_speed | CentrificalHooks | {"speedAdd":0.63434,"maxHpAdd":5} |
| roach_speed | GlialReconstitution | {"speedAdd":1.0499999999999998} |
| hydra_range | EvolveGroovedSpines | {"rangeAdd":1} |
| lurker_deploy | DiggingClaws | {"burrowSecondsSubtract":1.0714285714285714,"randomDelaySecondsSubtract":0.17857142857142858,"speedAdd":0.42098} |
| charge | Charge | {"speedAdd":1.575} |
| glaives | AdeptPiercingAttack | {"attackSpeedAdd":0.45} |
| colossus_range | ExtendedThermalLance | {"rangeAdd":2} |

速度加值已换算为Faster时钟。潜伏者部署研究只缩短埋入，不能套到钻出；恢复卡分别增强已存在的生命恢复、原生回盾和治疗输出，每个通道只乘一次，不凭空增加恢复能力。

## 新规则：持续生产和发展行动

每条生产线最多配置两个产出，按顺序交替；开关只影响尚未付款的未来批次。每条线仍只允许一批在途。虫族每座孵化设施只归属一个序列，不能重复贡献产能。A16可把每家族身体与预付上限从5升至7，S14可把普通军衔升至7。

| 生产线ID | 种族 | 名称 | 合法家族 |
| --- | --- | --- | --- |
| barracks | 人族 | 兵营 | 陆战队员、劫掠者、死神 |
| factory | 人族 | 重工厂 | 恶火、攻城坦克、雷神 |
| starport | 人族 | 星港 | 医疗运输机、维京、女妖、科技球 |
| zerg.basic | 虫族 | 基础虫群 | 跳虫、爆虫、蟑螂、虫后 |
| zerg.evolution | 虫族 | 地面进化 | 破坏者、刺蛇、潜伏者、雷兽 |
| zerg.air | 虫族 | 飞行虫群 | 异龙、腐化者 |
| gateway | 神族 | 传送门 | 狂热者、使徒、追猎者、哨兵、高阶圣堂武士 |
| robotics | 神族 | 机械台 | 不朽者、巨像 |
| stargate | 神族 | 星门 | 凤凰、虚空辉光舰、航母 |

共 60 种发展定义。每个第1—17关后窗口至多购买一项，研究／建造即时生效，训练只消耗战斗时间。报价不因钱包不足隐藏，也不随机打折。

| ID | 种族 | 行动 | 类型 | 价格矿／气 | 等级／设施上限 | 前置 | 最早已完成关卡 | 关联家族 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barracks | 人族 | 兵营 | facility | 150／0 | 5 | — | 0 | 陆战队员、死神 |
| factory | 人族 | 重工厂 | facility | 150／100 | 5 | barracks | 0 | 恶火 |
| starport | 人族 | 星港 | facility | 150／100 | 5 | factory | 0 | 医疗运输机、维京 |
| barracks_lab | 人族 | 兵营实验室 | technology | 50／25 | 1 | barracks | 0 | 劫掠者 |
| factory_lab | 人族 | 工厂实验室 | technology | 50／25 | 1 | factory | 0 | 攻城坦克、雷神 |
| starport_lab | 人族 | 星港实验室 | technology | 50／25 | 1 | starport | 0 | 女妖 |
| engineering_bay | 人族 | 工程站 | technology | 100／50 | 1 | barracks | 0 | — |
| armory | 人族 | 军械库 | technology | 150／100 | 1 | factory | 0 | 雷神 |
| science_facility | 人族 | 科学设施 | technology | 200／150 | 1 | starport | 0 | 科技球 |
| hatchery | 虫族 | 孵化场 | facility | 150／0 | 5 | — | 0 | — |
| pool | 虫族 | 血池 | technology | 100／50 | 1 | hatchery | 0 | 跳虫、虫后 |
| roach_warren | 虫族 | 蟑螂温室 | technology | 100／50 | 1 | pool | 0 | 蟑螂、破坏者 |
| baneling_nest | 虫族 | 爆虫巢 | technology | 100／50 | 1 | pool | 0 | 爆虫 |
| evolution_chamber | 虫族 | 进化腔 | technology | 100／50 | 1 | pool | 0 | — |
| lair | 虫族 | 升级巢穴 | technology | 150／100 | 1 | pool | 0 | 破坏者 |
| hydralisk_den | 虫族 | 刺蛇巢 | technology | 150／100 | 1 | lair | 0 | 刺蛇 |
| lurker_den | 虫族 | 潜伏者巢 | technology | 150／100 | 1 | hydralisk_den | 0 | 潜伏者 |
| spire | 虫族 | 尖塔 | technology | 150／100 | 1 | lair | 0 | 异龙、腐化者 |
| hive | 虫族 | 升级蜂巢 | technology | 200／150 | 1 | lair | 0 | — |
| ultralisk_cavern | 虫族 | 雷兽窟 | technology | 200／150 | 1 | hive | 0 | 雷兽 |
| gateway | 神族 | 传送门 | facility | 150／0 | 5 | — | 0 | 狂热者 |
| cybernetics_core | 神族 | 控制核心 | technology | 100／50 | 1 | gateway | 0 | 使徒、追猎者、哨兵 |
| forge | 神族 | 锻炉 | technology | 100／50 | 1 | gateway | 0 | — |
| robotics | 神族 | 机械台 | facility | 150／100 | 5 | cybernetics_core | 0 | 不朽者 |
| stargate | 神族 | 星门 | facility | 150／100 | 5 | cybernetics_core | 0 | 凤凰、虚空辉光舰 |
| robotics_bay | 神族 | 机械研究设施 | technology | 150／100 | 1 | robotics | 0 | 巨像 |
| twilight_council | 神族 | 暮光议会 | technology | 150／100 | 1 | cybernetics_core | 0 | — |
| templar_archives | 神族 | 圣堂文库 | technology | 150／100 | 1 | twilight_council | 0 | 高阶圣堂武士 |
| fleet_beacon | 神族 | 舰队航标 | technology | 200／150 | 1 | stargate | 0 | 航母 |
| stim | 人族 | 兴奋剂 | research | 125／75 | 1 | barracks_lab | 0 | — |
| shield | 人族 | 战斗盾 | research | 125／75 | 1 | barracks_lab | 0 | — |
| infernal | 人族 | 燃烧强化 | research | 125／75 | 1 | factory_lab | 0 | — |
| cloak | 人族 | 隐形装置 | research | 125／75 | 1 | starport_lab | 0 | — |
| support_efficiency | 人族 | 医修效率 | research | 125／75 | 1 | science_facility | 0 | — |
| ling_speed | 虫族 | 代谢加速 | research | 125／75 | 1 | pool | 0 | — |
| bane_speed | 虫族 | 离心钩 | research | 125／75 | 1 | baneling_nest | 0 | — |
| roach_speed | 虫族 | 胶质重组 | research | 125／75 | 1 | roach_warren | 0 | — |
| hydra_range | 虫族 | 沟槽脊刺 | research | 125／75 | 1 | hydralisk_den | 0 | — |
| lurker_deploy | 虫族 | 适应爪 | research | 125／75 | 1 | lurker_den | 0 | — |
| charge | 神族 | 冲锋 | research | 125／75 | 1 | twilight_council | 0 | — |
| blink | 神族 | 闪烁 | research | 125／75 | 1 | twilight_council | 0 | — |
| glaives | 神族 | 共鸣战刃 | research | 125／75 | 1 | twilight_council | 0 | — |
| storm | 神族 | 灵能风暴 | research | 125／75 | 1 | templar_archives | 0 | — |
| colossus_range | 神族 | 热能射线 | research | 125／75 | 1 | robotics_bay | 0 | — |
| terran.infantry | 人族 | 生化武器 | research | 125／50 → 200／100 → 275／150 | 3 | engineering_bay | 0 | 陆战队员、劫掠者、死神 |
| terran.infantry_armor | 人族 | 生化防护 | research | 125／50 → 200／100 → 275／150 | 3 | engineering_bay | 0 | 陆战队员、劫掠者、死神 |
| terran.vehicle | 人族 | 机械武器 | research | 125／50 → 200／100 → 275／150 | 3 | armory | 0 | 恶火、攻城坦克、雷神 |
| terran.vehicle_armor | 人族 | 机械装甲 | research | 125／50 → 200／100 → 275／150 | 3 | armory | 0 | 恶火、攻城坦克、雷神 |
| terran.air_weapon | 人族 | 航空武器 | research | 125／50 → 200／100 → 275／150 | 3 | armory | 0 | 维京、女妖 |
| terran.air_armor | 人族 | 航空装甲 | research | 125／50 → 200／100 → 275／150 | 3 | armory | 0 | 维京、女妖、医疗运输机、科技球 |
| zerg.melee | 虫族 | 近战攻击 | research | 125／50 → 200／100 → 275／150 | 3 | evolution_chamber | 0 | 跳虫、爆虫、雷兽 |
| zerg.missile | 虫族 | 远程攻击 | research | 125／50 → 200／100 → 275／150 | 3 | evolution_chamber | 0 | 蟑螂、破坏者、刺蛇、潜伏者、虫后 |
| zerg.carapace | 虫族 | 地面甲壳 | research | 125／50 → 200／100 → 275／150 | 3 | evolution_chamber | 0 | 跳虫、爆虫、蟑螂、破坏者、刺蛇、潜伏者、虫后、雷兽 |
| zerg.flyer_weapon | 虫族 | 飞行攻击 | research | 125／50 → 200／100 → 275／150 | 3 | spire | 0 | 异龙、腐化者 |
| zerg.flyer_armor | 虫族 | 飞行甲壳 | research | 125／50 → 200／100 → 275／150 | 3 | spire | 0 | 异龙、腐化者 |
| protoss.ground_weapon | 神族 | 地面武器 | research | 125／50 → 200／100 → 275／150 | 3 | forge | 0 | 狂热者、使徒、追猎者、哨兵、不朽者、巨像、高阶圣堂武士 |
| protoss.ground_armor | 神族 | 地面护甲 | research | 125／50 → 200／100 → 275／150 | 3 | forge | 0 | 狂热者、使徒、追猎者、哨兵、不朽者、巨像、高阶圣堂武士 |
| protoss.shields | 神族 | 护盾 | research | 125／50 → 200／100 → 275／150 | 3 | forge | 0 | 狂热者、使徒、追猎者、哨兵、不朽者、巨像、高阶圣堂武士、凤凰、虚空辉光舰、航母 |
| protoss.air_weapon | 神族 | 航空武器 | research | 125／50 → 200／100 → 275／150 | 3 | cybernetics_core | 0 | 凤凰、虚空辉光舰、航母 |
| protoss.air_armor | 神族 | 航空装甲 | research | 125／50 → 200／100 → 275／150 | 3 | cybernetics_core | 0 | 凤凰、虚空辉光舰、航母 |

三级常规研究还受统一时点限制：二级须完成第6关，三级须完成第12关。单设施实验室选择具体未配实验室的对应设施；同一窗口最多购买一项。雷神、雷兽、航母另须完成第9关。

每章分别有一次免费建筑刷新和强化刷新，不结转；每窗口每类还可付费刷新一次。建筑刷新为 50＋10×(章序−1)矿，强化刷新为30＋10×(章序−1)矿。

新家族接收且五个家族槽已满时先冻结模拟，再展示替换。继承等级 = 1＋floor((旧等级−1)／2)，逐存活成员产生记录；每家族身体上限由A16决定为5或7。未出舱、已付款与已投放资产按各自支付账本结清，不能将培养记录重复兑现。

## 新规则：强化三选一

| 已完成关卡 | 白 | 绿 | 蓝 | 紫 | 橙 |
| --- | --- | --- | --- | --- | --- |
| 1—5 | 45% | 35% | 16% | 4% | 0% |
| 6—11 | 25% | 40% | 27% | 7% | 1% |
| 12—17 | 15% | 35% | 35% | 12% | 3% |

| 效果ID | 名称 | 类别 | 白／绿／蓝／紫／橙（配置值） | 同目标上限（配置值） |
| --- | --- | --- | --- | --- |
| weapon | 武器培养 | core | 0.03／0.05／0.08／0.12／0.16 | 0.4 |
| vitality | 耐久培养 | core | 0.04／0.07／0.1／0.15／0.2 | 0.5 |
| armor | 装甲强化 | core | 0.1／0.2／0.3／0.5／0.7 | 2 |
| recovery | 恢复增效 | synergy | 0.04／0.06／0.09／0.12／0.16 | 0.4 |
| energy | 能量循环 | synergy | 0.04／0.06／0.09／0.12／0.16 | 0.4 |
| production | 训练周转 | general | 0.03／0.05／0.07／0.1／0.12 | 0.25 |
| cultivation | 培养支援 | core | 1／1／2／2／3 | 5 |

百分比卡的配置值0.03表示3%；护甲为固定加值，培养为等级增量。第一张须立即有收益，其余类别权重为核心50／协同30／通用20；已上场目标权重3、已配置且开启的未来产出2、其他合法目标1。

英雄保底窗口：第 6／9／12 关；第 15 关至少一张紫色以上。连续三个窗口未展示蓝色以上，下个窗口至少蓝色。保底随窗口推进，刷新不推进保底计数。

每窗口默认免费领取一张；R09可从同组三张再领1或2张，不另抽牌。未入编家族只可获得生产支持，不靠卡牌直接引入新家族。地图永久强化每章最多一张，全程最多六张；R14另产生独立紫／橙击杀掉落，均保存收据。

## 新规则：18名英雄

各族五选三身份，阵亡仍占身份名额。招募顺序绑定技能槽1／2／3；等级1—5，同名卡升级但不复活。新增技能数值是本作实验参数，不能据原模型名称声称为原版技能。

| ID | 种族 | 英雄 | HP／护盾 | 生命护甲 | 单发 × 发数 | 周期秒 | 射程／移速 | 普攻目标 | 属性 | 先天隐形 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| raynor | 人族 | 雷诺 | 625／0 | 3 | 28 × 1 | 0.18 | 6.5／3.5 | both | Biological、Heroic | 否 |
| tychus | 人族 | 泰凯斯 | 780／0 | 4 | 14 × 1 | 0.08 | 5.5／3.15 | both | Biological、Heroic | 否 |
| nova | 人族 | 诺娃 | 375／0 | 1 | 100 × 1 | 0.7 | 9／3.8 | both | Biological、Heroic | 否 |
| swann | 人族 | 斯旺 | 560／0 | 3 | 28 × 1 | 0.4 | 5／3.15 | ground | Biological、Heroic | 否 |
| tosh | 人族 | 托什 | 440／0 | 1 | 52 × 1 | 0.4 | 6.5／3.5 | both | Biological、Heroic | 否 |
| yamato_battlecruiser | 人族 | 大和战列巡洋舰 | 1100／0 | 4 | 40 × 2 | 0.65 | 8／2.62 | both | Mechanical、Armored、Massive、Heroic | 否 |
| kerrigan | 虫族 | 凯瑞甘 | 750／0 | 3 | 52 × 1 | 0.36 | 1／3.5 | ground | Biological、Heroic | 否 |
| zagara | 虫族 | 扎加拉 | 525／0 | 1 | 36 × 1 | 0.36 | 6.5／3.5 | both | Biological、Heroic | 否 |
| dehaka | 虫族 | 德哈卡 | 1100／0 | 4 | 80 × 1 | 0.6 | 1.4／3.15 | ground | Biological、Heroic | 否 |
| stukov | 虫族 | 斯托科夫 | 625／0 | 2 | 50 × 1 | 0.44 | 6.5／3.15 | both | Biological、Heroic | 否 |
| niadra | 虫族 | 妮雅德拉 | 690／0 | 2 | 32 × 1 | 0.45 | 5.5／3.15 | both | Biological、Heroic | 否 |
| hots_leviathan | 虫族 | 利维坦 | 1300／0 | 4 | 60 × 1 | 0.55 | 7.5／2.5 | both | Biological、Armored、Massive、Heroic | 否 |
| artanis | 神族 | 阿塔尼斯 | 440／375 | 3 | 34 × 2 | 0.55 | 1／3.5 | ground | Biological、Heroic | 否 |
| zeratul | 神族 | 泽拉图 | 440／315 | 1 | 90 × 1 | 0.5 | 1／4.2 | ground | Biological、Heroic | 是 |
| alarak | 神族 | 阿拉纳克 | 750／250 | 3 | 85 × 1 | 0.6 | 1.2／3.15 | ground | Biological、Heroic | 否 |
| fenix | 神族 | 菲尼克斯 | 565／440 | 3 | 72 × 1 | 0.5 | 7.5／3.15 | both | Mechanical、Armored、Heroic | 否 |
| vorazun | 神族 | 沃拉尊 | 375／315 | 1 | 75 × 1 | 0.5 | 1／4 | ground | Biological、Heroic | 是 |
| purifier_flagship | 神族 | 净化者旗舰 | 850／750 | 4 | 0 × 1 | 1 | 8／2.62 | none | Mechanical、Armored、Massive、Heroic | 否 |

| 英雄 | 主动技能 | 一级基础量 | 范围参数：射程／半径／长度／宽度 | 前摇或首个结算延迟秒 | 冷却秒 | 模型ID |
| --- | --- | --- | --- | --- | --- | --- |
| 雷诺 | 穿透射击 | 300 | 12／0.5／12／1.4 | 0.2 | 10 | hero.raynor |
| 泰凯斯 | 手雷 | 240 | 5／3.2／0／0 | 0.6 | 10 | hero.tychus |
| 诺娃 | 狙击 | 650 | 12／0.5／0／0 | 0.35 | 9 | hero.nova |
| 斯旺 | 紧急抢修 | 75 | 7／0／0／0 | 1 | 15 | hero.swann |
| 托什 | 精神冲击 | 220 | 8／2.8／0／0 | 0.5 | 13 | hero.tosh |
| 大和战列巡洋舰 | 大和聚变炮 | 700 | 11／2.8／0／0 | 1.25 | 25 | hero.yamato_battlecruiser |
| 凯瑞甘 | 灵能冲击 | 300 | 11／0／11／2.2 | 0.5 | 10 | hero.kerrigan |
| 扎加拉 | 爆虫弹幕 | 100 | 9／1.7／0／0 | 0.7 | 12 | hero.zagara |
| 德哈卡 | 原始吞噬 | 420 | 3／0／0／0 | 0.35 | 13 | hero.dehaka |
| 斯托科夫 | 腐蚀弹 | 80 | 9／3／0／0 | 0.25 | 12 | hero.stukov |
| 妮雅德拉 | 哺育波 | 120 | 6／6／0／0 | 0 | 18 | hero.niadra |
| 利维坦 | 生体等离子风暴 | 180 | 10／3.5／0／0 | 0.8 | 22 | hero.hots_leviathan |
| 阿塔尼斯 | 护盾复苏 | 150 | 6／6／0／0 | 0 | 16 | hero.artanis |
| 泽拉图 | 虚空斩 | 520 | 3／1.2／0／0 | 0.25 | 10 | hero.zeratul |
| 阿拉纳克 | 毁灭波 | 300 | 10／0／10／2.6 | 0.55 | 12 | hero.alarak |
| 菲尼克斯 | 太阳炮 | 360 | 10／3.2／0／0 | 0.6 | 13 | hero.fenix |
| 沃拉尊 | 时间停滞 | 0 | 9／3.2／0／0 | 0.25 | 16 | hero.vorazun |
| 净化者旗舰 | 聚变核爆 | 600 | 12／4／0／0 | 1.4 | 30 | elite.carrier.1 |

“一级基础量”依技能分别指单次伤害、每次治疗或每目标回盾，控制技能可为0；弹幕次数、持续伤害、合法目标及控制时长由技能执行器定义，不能将该列直接当作技能总伤害。伤害／治疗／回盾量每级增加25%，范围、冷却及控制不成长。复活价格250矿／100气×[1＋0.25×(等级−1)]，下一关部署且技能从完整冷却开始。

## 新规则：90款唯一精英

每个家族同时最多一名精英，占该家族普通身体席位；同局锁定一种变体。多变体家族不会获得更高抽中概率。下列新增专属效果只应用一次，不随精英等级额外重复相乘。

| ID | 名称 | 家族 | 模板 | 专属能力 | 新效果配置 | 模型ID |
| --- | --- | --- | --- | --- | --- | --- |
| marine.1 | 突击枪兵 | 陆战队员 | quick | 兴奋剂不扣血，期间每秒恢复 1% 最大生命。 | 由既有精英规则执行 | elite.marine.1 |
| marine.2 | 重火力枪兵 | 陆战队员 | heavy | 对重甲总伤害额外提高 25%。 | 由既有精英规则执行 | elite.marine.2 |
| marine.3 | 重装枪兵 | 陆战队员 | guard | 强化装甲与生命，适合持续交战。 | 由既有精英规则执行 | elite.marine.3 |
| marauder.1 | 压制劫掠者 | 劫掠者 | quick | 命中降低移速及攻速 30%，持续 1.5 秒；Boss 效果减半。 | 由既有精英规则执行 | elite.marauder.1 |
| marauder.2 | 破甲劫掠者 | 劫掠者 | heavy | 每 15 秒额外发射三倍单发伤害的破甲弹药。 | 由既有精英规则执行 | elite.marauder.2 |
| marauder.3 | 堡垒劫掠者 | 劫掠者 | guard | 高生命与护甲，承担前线压力。 | 由既有精英规则执行 | elite.marauder.3 |
| hellion.1 | 高速恶火 | 恶火 | mobile | 转向与加速提高 20%。 | 由既有精英规则执行 | elite.hellion.1 |
| hellion.2 | 焚烧恶火 | 恶火 | heavy | 附加三秒灼烧，每秒为该次直接伤害的 20%；同来源刷新。 | 由既有精英规则执行 | elite.hellion.2 |
| hellion.3 | 清场恶火 | 恶火 | quick | 火焰宽度 ×1.5，长度 ×1.25。 | 由既有精英规则执行 | elite.hellion.3 |
| tank.1 | 重型攻城坦克 | 攻城坦克 | heavy | 架起后每三秒射程 +1，最多 +3；收炮清除。 | 由既有精英规则执行 | elite.tank.1 |
| tank.2 | 重炮坦克 | 攻城坦克 | heavy | 攻速 ×0.8、单发补偿，攻城溅射半径 ×1.25。 | 由既有精英规则执行 | elite.tank.2 |
| tank.3 | 突击坦克 | 攻城坦克 | mobile | 架起与收起时间 ×0.75。 | 由既有精英规则执行 | elite.tank.3 |
| medivac.1 | 急救医疗艇 | 医疗运输机 | support | 单目标治疗额外 ×1.25。 | 由既有精英规则执行 | elite.medivac.1 |
| medivac.2 | 群疗医疗艇 | 医疗运输机 | support | 额外治疗两名伤员，各为主治疗量的一半；按实际治疗耗能。 | 由既有精英规则执行 | elite.medivac.2 |
| medivac.3 | 维修医疗艇 | 医疗运输机 | support | 恢复输出＋25%，主系／跨系比例保持1与1/3。 | 由既有精英规则执行 | elite.medivac.3 |
| reaper.1 | 突击死神 | 死神 | mobile | 脱战恢复等待时间 ×0.75。 | regenDelayMultiplier：0.75 | elite.reaper.1 |
| thor.1 | 防空雷神 | 雷神 | guard | 对空普攻伤害 ×1.20。 | airAttackDamageMultiplier：1.2 | elite.thor.1 |
| viking.1 | 快速变形维京 | 维京 | mobile | 变形时间 ×0.70。 | transformTimeMultiplier：0.7 | elite.viking.1 |
| banshee.1 | 远程女妖 | 女妖 | quick | 对地射程 +1。 | groundAttackRangeAdd：1 | elite.banshee.1 |
| science_vessel.1 | 修复科技球 | 科技球 | support | 恢复输出 ×1.25，保持主系与跨系比例。 | recoveryMultiplier：1.25 | elite.science_vessel.1 |
| zergling.1 | 利爪跳虫 | 跳虫 | quick | 普攻周期 ×0.80。 | attackPeriodMultiplier：0.8 | elite.zergling.1 |
| baneling.1 | 强酸爆虫 | 爆虫 | heavy | 爆炸半径 ×1.25。 | explosionRadiusMultiplier：1.25 | elite.baneling.1 |
| roach.1 | 再生蟑螂 | 蟑螂 | guard | 固有再生 ×2。 | innateRegenMultiplier：2 | elite.roach.1 |
| ravager.1 | 速射破坏者 | 破坏者 | heavy | 胆汁冷却 ×0.80。 | bileCooldownMultiplier：0.8 | elite.ravager.1 |
| hydralisk.1 | 长刺刺蛇 | 刺蛇 | quick | 射程 +1。 | attackRangeAdd：1 | elite.hydralisk.1 |
| lurker.1 | 宽刺潜伏者 | 潜伏者 | heavy | 穿刺宽度 ×1.25。 | spineWidthMultiplier：1.25 | elite.lurker.1 |
| queen.1 | 哺育虫后 | 虫后 | support | 输血耗能 ×0.75。 | transfusionEnergyMultiplier：0.75 | elite.queen.1 |
| mutalisk.1 | 弹射异龙 | 异龙 | mobile | 后续弹射伤害 ×1.25。 | secondaryBounceDamageMultiplier：1.25 | elite.mutalisk.1 |
| corruptor.1 | 猎空腐化者 | 腐化者 | heavy | 对重甲空中目标普攻伤害 ×1.20。 | armoredAirDamageMultiplier：1.2 | elite.corruptor.1 |
| ultralisk.1 | 厚甲雷兽 | 雷兽 | guard | 生命护甲 +2。 | lifeArmorAdd：2 | elite.ultralisk.1 |
| zealot.1 | 突进狂热者 | 狂热者 | mobile | 已解锁冲锋冷却 ×0.75。 | chargeCooldownMultiplier：0.75 | elite.zealot.1 |
| adept.1 | 穿透使徒 | 使徒 | quick | 对轻甲额外伤害 ×1.50。 | lightBonusMultiplier：1.5 | elite.adept.1 |
| stalker.1 | 猎甲追猎者 | 追猎者 | mobile | 对重甲普攻伤害 ×1.20。 | armoredDamageMultiplier：1.2 | elite.stalker.1 |
| sentry.1 | 守护哨兵 | 哨兵 | support | 守护者之盾持续时间 ×1.30。 | guardianShieldDurationMultiplier：1.3 | elite.sentry.1 |
| immortal.1 | 屏障不朽者 | 不朽者 | guard | 护障吸收量 ×1.40。 | barrierAbsorptionMultiplier：1.4 | elite.immortal.1 |
| colossus.1 | 远距巨像 | 巨像 | heavy | 射程 +1。 | attackRangeAdd：1 | elite.colossus.1 |
| high_templar.1 | 风暴圣堂 | 高阶圣堂武士 | support | 已解锁灵能风暴耗能 ×0.80。 | stormEnergyMultiplier：0.8 | elite.high_templar.1 |
| phoenix.1 | 猎轻凤凰 | 凤凰 | mobile | 对轻甲空中目标普攻伤害 ×1.25。 | lightAirDamageMultiplier：1.25 | elite.phoenix.1 |
| void_ray.1 | 聚焦辉光舰 | 虚空辉光舰 | heavy | 对重甲额外伤害 ×1.50。 | armoredBonusMultiplier：1.5 | elite.void_ray.1 |
| carrier.1 | 高速舰载航母 | 航母 | heavy | 已有截击机普攻周期 ×0.85。 | interceptorAttackPeriodMultiplier：0.85 | elite.carrier.1 |
| viking.2 | 猎舰维京 | 维京 | heavy | 战机模式对重甲空中目标的普通攻击直接伤害＋25%；突击模式不加成。 | armoredAirDamageMultiplier：1.25 | elite.viking.1 |
| viking.3 | 突击维京 | 维京 | mobile | 突击模式对地射程＋1；战机模式射程不变。 | assaultGroundRangeAdd：1 | elite.viking.1 |
| ravager.2 | 广域破坏者 | 破坏者 | support | 自动胆汁伤害半径×1.20；预警圈与实际半径一致。 | bileRadiusMultiplier：1.2 | elite.ravager.1 |
| ravager.3 | 猛酸破坏者 | 破坏者 | heavy | 自动胆汁直接伤害＋25%；半径和冷却不变。 | bileDamageMultiplier：1.25 | elite.ravager.1 |
| high_templar.2 | 储能圣堂 | 高阶圣堂武士 | support | 最大能量＋25%；新增容量不免费回能，不能解锁风暴。 | maxEnergyMultiplier：1.25 | elite.high_templar.1 |
| high_templar.3 | 强电圣堂 | 高阶圣堂武士 | heavy | 灵能风暴已研究后总伤害＋20%；按原tick比例分摊。 | stormDamageMultiplier：1.2 | elite.high_templar.1 |
| reaper.2 | 猎轻死神 | 死神 | quick | 对轻甲目标的普攻直接伤害＋25%。 | lightAttackDamageMultiplier：1.25 | elite.reaper.1 |
| reaper.3 | 装甲死神 | 死神 | guard | 最大生命＋25%；保留已损生命。 | maxHealthMultiplier：1.25 | elite.reaper.1 |
| thor.2 | 重炮雷神 | 雷神 | heavy | 对地普攻直接伤害＋20%。 | groundAttackDamageMultiplier：1.2 | elite.thor.1 |
| thor.3 | 堡垒雷神 | 雷神 | guard | 生命护甲＋2。 | lifeArmorAdd：2 | elite.thor.1 |
| banshee.2 | 隐秘女妖 | 女妖 | mobile | 隐形已研究时持续每秒能耗×0.80。 | cloakEnergyMultiplier：0.8 | elite.banshee.1 |
| banshee.3 | 速射女妖 | 女妖 | quick | 对地普攻周期×0.85。 | attackPeriodMultiplier：0.85 | elite.banshee.1 |
| science_vessel.2 | 储能科技球 | 科技球 | support | 最大能量＋25%，不免费回能。 | maxEnergyMultiplier：1.25 | elite.science_vessel.1 |
| science_vessel.3 | 远距科技球 | 科技球 | mobile | 合法治疗／维修射程＋1.5。 | healingRangeAdd：1.5 | elite.science_vessel.1 |
| zergling.2 | 疾行跳虫 | 跳虫 | mobile | 地面移动速度＋15%。 | movementSpeedMultiplier：1.15 | elite.zergling.1 |
| zergling.3 | 硬壳跳虫 | 跳虫 | guard | 生命护甲＋1.5。 | lifeArmorAdd：1.5 | elite.zergling.1 |
| baneling.2 | 裂变爆虫 | 爆虫 | heavy | 一次真实自爆的直接伤害＋25%。 | explosionDamageMultiplier：1.25 | elite.baneling.1 |
| baneling.3 | 疾行爆虫 | 爆虫 | mobile | 移动速度＋15%。 | movementSpeedMultiplier：1.15 | elite.baneling.1 |
| roach.2 | 破甲蟑螂 | 蟑螂 | heavy | 对重甲地面目标的普攻直接伤害＋20%。 | armoredGroundDamageMultiplier：1.2 | elite.roach.1 |
| roach.3 | 厚甲蟑螂 | 蟑螂 | guard | 最大生命＋25%；保留已损生命。 | maxHealthMultiplier：1.25 | elite.roach.1 |
| hydralisk.2 | 连射刺蛇 | 刺蛇 | quick | 普攻周期×0.85，针刺数不变。 | attackPeriodMultiplier：0.85 | elite.hydralisk.1 |
| hydralisk.3 | 猎空刺蛇 | 刺蛇 | heavy | 对空普攻直接伤害＋25%。 | airAttackDamageMultiplier：1.25 | elite.hydralisk.1 |
| lurker.2 | 远刺潜伏者 | 潜伏者 | mobile | 完成埋地后地刺攻击射程＋1。 | burrowedRangeAdd：1 | elite.lurker.1 |
| lurker.3 | 连刺潜伏者 | 潜伏者 | quick | 埋地普攻周期×0.85。 | attackPeriodMultiplier：0.85 | elite.lurker.1 |
| queen.2 | 强疗虫后 | 虫后 | support | 自动输血实际恢复量＋25%。 | transfusionHealingMultiplier：1.25 | elite.queen.1 |
| queen.3 | 储能虫后 | 虫后 | guard | 最大能量＋25%，不免费回能。 | maxEnergyMultiplier：1.25 | elite.queen.1 |
| mutalisk.2 | 猎轻异龙 | 异龙 | quick | 第一段弹射对轻甲普攻直接伤害＋20%。 | firstBounceLightDamageMultiplier：1.2 | elite.mutalisk.1 |
| mutalisk.3 | 厚翼异龙 | 异龙 | guard | 最大生命＋25%；保留已损生命。 | maxHealthMultiplier：1.25 | elite.mutalisk.1 |
| corruptor.2 | 连射腐化者 | 腐化者 | quick | 对空普攻周期×0.85。 | attackPeriodMultiplier：0.85 | elite.corruptor.1 |
| corruptor.3 | 远猎腐化者 | 腐化者 | mobile | 对空普攻射程＋1。 | attackRangeAdd：1 | elite.corruptor.1 |
| ultralisk.2 | 猛攻雷兽 | 雷兽 | heavy | 对地普攻周期×0.85。 | attackPeriodMultiplier：0.85 | elite.ultralisk.1 |
| ultralisk.3 | 巨躯雷兽 | 雷兽 | guard | 最大生命＋25%；碰撞半径不变。 | maxHealthMultiplier：1.25 | elite.ultralisk.1 |
| zealot.2 | 坚盾狂热者 | 狂热者 | guard | 最大原生护盾＋25%；不治疗生命。 | maxShieldMultiplier：1.25 | elite.zealot.1 |
| zealot.3 | 连斩狂热者 | 狂热者 | quick | 双刀完整攻击周期×0.85。 | attackPeriodMultiplier：0.85 | elite.zealot.1 |
| adept.2 | 疾行使徒 | 使徒 | mobile | 移动速度＋15%。 | movementSpeedMultiplier：1.15 | elite.adept.1 |
| adept.3 | 远击使徒 | 使徒 | heavy | 普攻射程＋1。 | attackRangeAdd：1 | elite.adept.1 |
| stalker.2 | 坚盾追猎者 | 追猎者 | guard | 最大原生护盾＋25%。 | maxShieldMultiplier：1.25 | elite.stalker.1 |
| stalker.3 | 迅闪追猎者 | 追猎者 | mobile | 已研究闪烁冷却×0.75。 | blinkCooldownMultiplier：0.75 | elite.stalker.1 |
| sentry.2 | 储能哨兵 | 哨兵 | support | 最大能量＋25%，不免费回能。 | maxEnergyMultiplier：1.25 | elite.sentry.1 |
| sentry.3 | 广域哨兵 | 哨兵 | guard | 守护者之盾真实生效半径×1.20。 | guardianShieldRadiusMultiplier：1.2 | elite.sentry.1 |
| immortal.2 | 破甲不朽者 | 不朽者 | heavy | 对重甲地面目标普攻直接伤害＋25%。 | armoredGroundDamageMultiplier：1.25 | elite.immortal.1 |
| immortal.3 | 坚盾不朽者 | 不朽者 | guard | 最大原生护盾＋25%。 | maxShieldMultiplier：1.25 | elite.immortal.1 |
| colossus.2 | 连灼巨像 | 巨像 | quick | 完整热能攻击周期×0.85。 | attackPeriodMultiplier：0.85 | elite.colossus.1 |
| colossus.3 | 坚盾巨像 | 巨像 | guard | 最大原生护盾＋25%。 | maxShieldMultiplier：1.25 | elite.colossus.1 |
| phoenix.2 | 远猎凤凰 | 凤凰 | mobile | 对空普攻射程＋1。 | attackRangeAdd：1 | elite.phoenix.1 |
| phoenix.3 | 迅翼凤凰 | 凤凰 | quick | 飞行移动速度＋15%。 | movementSpeedMultiplier：1.15 | elite.phoenix.1 |
| void_ray.2 | 坚盾辉光舰 | 虚空辉光舰 | guard | 最大原生护盾＋25%。 | maxShieldMultiplier：1.25 | elite.void_ray.1 |
| void_ray.3 | 连束辉光舰 | 虚空辉光舰 | quick | 完整光束结算周期×0.85。 | attackPeriodMultiplier：0.85 | elite.void_ray.1 |
| carrier.2 | 强袭舰载航母 | 航母 | heavy | 所属截击机普攻直接伤害＋20%，继承一次。 | interceptorDamageMultiplier：1.2 | elite.carrier.1 |
| carrier.3 | 坚盾航母 | 航母 | guard | 母体最大原生护盾＋25%。 | maxShieldMultiplier：1.25 | elite.carrier.1 |

医疗艇维修变体在当前规则改为恢复输出＋25%。皮肤来源和能力是两个维度，不能据皮肤声称对应原版技能。

| 模板 | 输出倍率 | 攻速倍率 | HP倍率 | 移速倍率 | 额外护甲 | 每级输出增量 | 每级攻速增量 | 每级HP增量 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quick | 1.7 | 1.5 | 1.35 | 1.1 | 0 | 0.25 | 0.1 | 0.12 |
| heavy | 1.95 | 0.95 | 1.5 | 1 | 0.75 | 0.3 | 0.04 | 0.12 |
| guard | 1.55 | 1 | 2 | 1 | 2 | 0.15 | 0.04 | 0.25 |
| mobile | 1.65 | 1.25 | 1.5 | 1.25 | 0.75 | 0.2 | 0.06 | 0.12 |
| support | 1.55 | 1 | 1.55 | 1.1 | 0.75 | 0.25 | 0 | 0.15 |

模板相对于普通五级基准，具体比例由 `eliteStats()` 计算。精英永久死亡后重招从一级开始，沿用本局已锁定路径。

## 当前规则：165个天赋节点

每族资源管理、强化士兵、军队管控各16节点／41可购级，微操7节点／17可购级；四线共用80点玩家等级。每买一级只占1点，资源依层收费。主线第1—7层每级依次1／1／1／2／1／3／5资源；微操依次1／3／3／6／3／6／10资源。主线满额41点／59资源，微操满额17点／64资源。

前置依已批准的逐级节点图校验；上一层最低投入门槛依次为0／2／5／5／3／5／2点。不同种族的对象与效果逐节点独立定义，不把原版三主线替换成新列。

每族三份预设，共九份；只有一个活跃方案实际扣资源。局外按已花金额全额洗点、切换预设；开局冻结当前种族和天赋，读档使用战局快照。英雄与临时单位按逐节点对象规则处理，截击机仅继承母航母明确指定的输出和微操一次。

### 人族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-R01 | SCV救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外1／2／3名SCV；每个救援目标只触发一次；不加目标数量或救援成功率。 |
| 2 | T-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋15%／30%／45%；不乘拾取、过关、退款或永久资源。 |
| 2 | T-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | T-R04 | 节约建材 | 3 | 1／1 | frugal_build | R01满 | 本族实体设施建造价−15%／30%／45%；附属实验室包括在内；研究不算建筑。 |
| 3 | T-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | T-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每次关间增加1／2／3次建筑与强化共享免费刷新；不结转；与基础章免费次数按3.2计。 |
| 3 | T-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 每次合格建筑购买20%／40%／60%免第一座显示费用；先有付款资格再掷骰，按3.3可与双建并发。 |
| 4 | T-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | T-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每次强化三选一额外可免费领取同组剩余1／2张；总上限2／3张，首次领取后不刷新；不能抵扣精英特约。 |
| 4 | T-R10 | 双倍建造 | 2 | 1／2 | double_build | R07满 | 可重复生产设施购买时20%／40%再建1座并支付第二座完整折后价；两座独立产能；先检查设施上限。 |
| 5 | T-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋10%／20%／30%；不乘永久资源，不对同一关收据重复发。 |
| 5 | T-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | T-R13 | 一次完工 | 3 | 1／1 | instant_tech | R10满 | 新兵营／工厂／星港33%／66%／99%命中：优先免费附带本局已有同类实验室，否则免费完成1项满足前置的关联研究；顺序见3.3。 |
| 6 | T-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | T-R15 | 精英教室 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费兵营枪兵／劫掠者／死神身体15%／30%成为同家族合法紫色精英；不适用工厂／星港；回退规则见5.2。 |
| 7 | T-R16 | 英雄支援 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从雷诺、泰凯斯、诺娃、斯旺、托什中选1名一级英雄免费部署；占三身份中的第一席；不额外给英雄卡。 |

### 人族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-S01 | 高级武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、生命护甲、移速、攻速、合法生命治疗输出各＋5%／10%／15%；护甲按已有值乘算，不凭空加基础护甲。 |
| 2 | T-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋5%／10%／15%；不增强技能、治疗或新造弹道。 |
| 2 | T-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少4%／8%／12%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | T-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋5%／10%／15%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | T-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击5%／10%／15%暴击；该次普通武器直接伤害×1.5；技能、持续伤害及衍生溅射不暴击。 |
| 3 | T-S06 | 生物护甲 | 3 | 1／1 | bio_shield | S03满 | 生物组获得独立附加盾，上限为修正后最大生命10%／20%／30%；受敌伤后5秒未再受伤，每秒回附加盾上限3%；不恢复生命。 |
| 3 | T-S07 | 经验老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组被一次普通武器攻击命中时3%／6%／9%闪避该次直接命中；地面预警、技能、范围溅射和持续伤害不能闪避。 |
| 4 | T-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋8%／16%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | T-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | T-S10 | 整备队伍 | 2 | 1／2 | team_share | S07满 | 普通与永久精英身体把最终生命伤害20%／40%均摊给半径8内活着的同家族伙伴；含同家族精英，无伙伴不转移。总伤害不减，详见5.4。 |
| 5 | T-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋10%／20%／30%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | T-S12 | 超级肉 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命＋15%／30%／45%；增加上限保留已损失生命；不提高护盾，不给复活。 |
| 5 | T-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋5%／10%／15%；与S01、S04同类相加，不让架起坦克移动。 |
| 6 | T-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | T-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命8／15秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | T-S16 | 星际战士 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每消耗7名正常付费同家族增援进阶I—V；三方向突击／坚守／机动的逐阶效果及收据见5.5；不是紫色精英，不增加身体。 |

### 人族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-A01 | 熟练部队 | 3 | 1／1 | skilled_troop | 无 | 每名完成救援的普通乘员3%／6%／10%额外升1军衔；付费或免费均可；仍受本人上限及预付款培养容量限制。 |
| 2 | T-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以1%／2%／3%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | T-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀1%／2%／3%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却60战斗秒，详见5.3。 |
| 2 | T-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时1%／2%／3%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | T-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋1／2／3个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | T-A06 | 征召网络 | 3 | 1／1 | conscript_network | A03满 | A03免费普通救援身体最大生命＋10%／20%／30%，作为该身体来源标签保存至死亡；不增强免费守军或付费乘员。 |
| 3 | T-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至60%／70%／80%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | T-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋3／6个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | T-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计360／240秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | T-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | T-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋10%／20%／30%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | T-A12 | 增殖部队 | 3 | 1／1 | proliferate | A09满 | 合格击杀0.5%／1%／1.5%生成1名Rank 5临时枪兵或劫掠者；存活30秒，全队同时上限1／2／3；选择和排除见5.6。 |
| 5 | T-A13 | 坦克支援 | 3 | 1／1 | tank_support | A10满 | 每90／60／45秒触发8秒支援，每秒1／2／3道坦克炮击与等量医疗艇治疗；不造实体，精确伤害／治疗／预约见5.7。 |
| 6 | T-A14 | 精英侦察 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个SCV救援目标5%／10%生成1个同族合法精英救援权；R01额外SCV不再各掷骰，无合法对象或容量不掷骰。 |
| 6 | T-A15 | 雇佣兵先生 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每240／120秒召来1名Rank 5临时紫色精英，存活80秒；只从已解锁枪兵／劫掠者／死神中按5.6选；死亡后本周期不补。 |
| 7 | T-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 人族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋10%／20%／30%；追赶倍率最高1.3，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | T-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋4%／8%／12%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | T-M03 | 技能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G侦测、本族英雄主动、兴奋剂等有计时冷却的手动能力冷却−8%／16%／24%，总冷却倍率最低0.5；模式耗时不算冷却。 |
| 4 | T-M04 | 空投玩家 | 2 | 1／6 | airlift | M03满 | 冷却240／120秒；选择锚点前方合法集结点，准备2秒后搬运本次选中的合法地面战斗组；各单位保伤损命令，不能落地则原位且不耗冷却，见5.8。 |
| 5 | T-M05 | 快速部署 | 3 | 1／3 | quick_siege | M04满 | 坦克架收、恶火/恶蝠、维京、雷神有时长的手动模式切换耗时−33%／66%／99%，最短0.25秒；不自动切换，不缩武器冷却。 |
| 6 | T-M06 | 走A之王 | 2 | 1／6 | stutter_king | M05满 | 战斗组移动瞄准转向速度×1.5／2；合法移动开火机会50%／100%；武器原冷却不变，架起坦克不可移动，光束/持续引导不绕过自身锁定。 |
| 7 | T-M07 | 这是APM么 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击额外发射1次同威力直接命中，合计2次；共用一次冷却和暴击判定；不复制溅射／穿透／弹射／技能／治疗／掉落，见5.9。 |

### 虫族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-R01 | 工蜂救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外1／2／3名工蜂；不增加虫卵、不要求注卵，不复制救援事件。 |
| 2 | Z-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋15%／30%／45%；不乘拾取、过关、退款或永久资源。 |
| 2 | Z-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | Z-R04 | 巢群建材 | 3 | 1／1 | frugal_build | R01满 | 孵化设施及虫族科技建筑建造、设施巢穴／蜂巢升级价−15%／30%／45%；兵种进化配方不属于建筑。 |
| 3 | Z-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | Z-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每次关间增加1／2／3次建筑与强化共享免费刷新；不结转；与基础章免费次数按3.2计。 |
| 3 | Z-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 每次合格建筑购买20%／40%／60%免第一座显示费用；先有付款资格再掷骰，按3.3可与双建并发。 |
| 4 | Z-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | Z-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每次强化三选一额外可免费领取同组剩余1／2张；总上限2／3张，首次领取后不刷新；不能抵扣精英特约。 |
| 4 | Z-R10 | 双生巢群 | 2 | 1／2 | double_build | R07满 | 购买新孵化设施时20%／40%再建1座并支付第二座完整折后价；两座序列与产能独立；不复制唯一科技建筑、巢穴或蜂巢升级。 |
| 5 | Z-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋10%／20%／30%；不乘永久资源，不对同一关收据重复发。 |
| 5 | Z-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | Z-R13 | 成熟巢群 | 3 | 1／1 | instant_tech | R10满 | 新孵化设施33%／66%／99%免费完成1项所选序列相关的已解锁研究；基础/进化/飞行的精确顺序见3.3；不增加设施产能、不改全局前置。 |
| 6 | Z-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | Z-R15 | 精英孵育 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费基础序列的跳虫／爆虫／蟑螂／虫后身体15%／30%成为合法同家族精英；跳虫双生逐身体判定，爆虫完整配方只判定最终体一次。 |
| 7 | Z-R16 | 虫群领袖 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从凯瑞甘、扎加拉、德哈卡、斯托科夫、妮雅德拉中选1名一级英雄免费部署；占第一英雄身份；菌毯增益仍只应用其固有效果一次。 |

### 虫族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-S01 | 进化武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、生命护甲、移速、攻速、合法治疗输出各＋5%／10%／15%；治疗含虫后输血及英雄生命治疗，不增强回能或重复乘菌毯。 |
| 2 | Z-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋5%／10%／15%；不增强技能、治疗或新造弹道。 |
| 2 | Z-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少4%／8%／12%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | Z-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋5%／10%／15%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | Z-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击5%／10%／15%暴击；该次普通武器直接伤害×1.5；技能、持续伤害及衍生溅射不暴击。 |
| 3 | Z-S06 | 共生甲壳 | 3 | 1／1 | bio_shield | S03满 | 生物组获得最大生命10%／20%／30%的独立甲壳缓冲；受敌伤5秒后每秒恢复缓冲上限3%；不是生命再生、不能被输血填充，不改蟑螂固有再生。 |
| 3 | Z-S07 | 经验老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组被一次普通武器攻击命中时3%／6%／9%闪避该次直接命中；地面预警、技能、范围溅射和持续伤害不能闪避。 |
| 4 | Z-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋8%／16%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | Z-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | Z-S10 | 共生分担 | 2 | 1／2 | team_share | S07满 | 普通与永久精英身体的最终生命伤害20%／40%分给半径8内活着同家族伙伴；不同跳虫身体可分担，爆虫自爆不分担；同源伤害只转移一次。 |
| 5 | Z-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋10%／20%／30%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | Z-S12 | 超级肉 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命＋15%／30%／45%；增加上限保留已损失生命；不提高护盾，不给复活。 |
| 5 | Z-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋5%／10%／15%，与S01/S04同类相加；不使埋地潜伏者移动，不重复应用菌毯倍率。 |
| 6 | Z-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | Z-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命8／15秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | Z-S16 | 原始进化 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每7名付费同家族最终进化体进阶I—V；选裂爪／厚甲／迅捷，数值见5.5；不消耗免费虫、不送中间体，爆虫爆后进阶真实丢失。 |

### 虫族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-A01 | 成熟虫群 | 3 | 1／1 | skilled_troop | 无 | 每名救援完成的普通最终体3%／6%／10%额外升1军衔；跳虫按身体分别判定，爆虫／破坏者／潜伏者只在最终体一次判定。 |
| 2 | Z-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以1%／2%／3%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | Z-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀1%／2%／3%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却60战斗秒，详见5.3。 |
| 2 | Z-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时1%／2%／3%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | Z-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋1／2／3个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | Z-A06 | 巢群征召 | 3 | 1／1 | conscript_network | A03满 | A03免费救援虫族最终体最大生命＋10%／20%／30%；不额外赠同批第二跳虫，不把进化前体再当一次免费乘员。 |
| 3 | Z-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至60%／70%／80%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | Z-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋3／6个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | Z-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计360／240秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | Z-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | Z-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋10%／20%／30%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | Z-A12 | 虫群增殖 | 3 | 1／1 | proliferate | A09满 | 合格击杀0.5%／1%／1.5%召来1只Rank 5临时跳虫或蟑螂，30秒，同时上限1／2／3身体；不是双生配方，不生成爆虫，不产资源。 |
| 5 | Z-A13 | 胆汁哺育 | 3 | 1／1 | tank_support | A10满 | 每90／60／45秒触发8秒支援，每秒1／2／3次可见地面目标胆汁及同数生命哺育；胆汁预警0.75秒，半径1.5，基础187.5伤害，生命恢复63/次；详见5.7。 |
| 6 | Z-A14 | 巢群侦察 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个工蜂救援目标5%／10%额外获得1个合法本族精英救援权；R01增员不重复抽，既有精英变体锁与容量照常。 |
| 6 | Z-A15 | 原始猎群 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每240／120秒召来1只Rank 5临时紫色精英，80秒；候选为已解锁跳虫／蟑螂／刺蛇，按5.6轮换；不产生永久精英路径、不触发增殖。 |
| 7 | Z-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 虫族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋10%／20%／30%；追赶倍率最高1.3，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | Z-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋4%／8%／12%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | Z-M03 | 技能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G感知、本族英雄主动及M04地下转移等有计时冷却的手动能力冷却−8%／16%／24%，总倍率最低0.5；不缩自动胆汁/输血冷却或免能量，不改变潜伏埋出耗时。 |
| 4 | Z-M04 | 地下转移 | 2 | 1／6 | airlift | M03满 | 冷却240／120秒，准备2秒；选择锚点前方同一开放区域合法集结点，运送可移动地面战斗组；是天赋转移效果，不赋予全部虫族常驻埋地或隐形，见5.8。 |
| 5 | Z-M05 | 潜伏部署 | 3 | 1／3 | quick_siege | M04满 | 潜伏者手动埋入／钻出耗时−33%／66%／99%，最短0.25秒；埋地完成前不获隐形，不改变攻击周期，不自动钻出解堵。 |
| 6 | Z-M06 | 虫群走A | 2 | 1／6 | stutter_king | M05满 | 移动瞄准×1.5／2，合法移动开火机会50%／100%；埋地潜伏者不能移动，跳虫／雷兽近战仍需接触，异龙弹射不多造一跳。 |
| 7 | Z-M07 | 双重猎杀 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击产生2次同威力直接命中，共用冷却；跳虫/雷兽为第二击动作，异龙只多首跳、潜伏者不复制地刺线，爆虫自爆不复制；详见5.9。 |

### 神族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-R01 | 探机救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外1／2／3名探机；不增加救援目标、救援概率或水晶塔供能范围。 |
| 2 | P-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋15%／30%／45%；不乘拾取、过关、退款或永久资源。 |
| 2 | P-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | P-R04 | 折跃建材 | 3 | 1／1 | frugal_build | R01满 | 本族实体设施建造价−15%／30%／45%；控制核心、锻炉等科技建筑包含在内，研究和普通单位传送配方不属于建造。 |
| 3 | P-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | P-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每次关间增加1／2／3次建筑与强化共享免费刷新；不结转；与基础章免费次数按3.2计。 |
| 3 | P-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 每次合格建筑购买20%／40%／60%免第一座显示费用；先有付款资格再掷骰，按3.3可与双建并发。 |
| 4 | P-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | P-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每次强化三选一额外可免费领取同组剩余1／2张；总上限2／3张，首次领取后不刷新；不能抵扣精英特约。 |
| 4 | P-R10 | 双重折跃 | 2 | 1／2 | double_build | R07满 | 购买传送门／机械台／星门时20%／40%付第二座折后价再建1座，双队列独立；不复制唯一科技建筑。 |
| 5 | P-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋10%／20%／30%；不乘永久资源，不对同一关收据重复发。 |
| 5 | P-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | P-R13 | 折跃整备 | 3 | 1／1 | instant_tech | R10满 | 新传送门／机械台／星门33%／66%／99%免费完成1项满足前置的本线研究；特色/常规精确顺序见3.3，常规只升1级，不额外强化已完成科技。 |
| 6 | P-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | P-R15 | 圣堂选拔 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费传送门狂热者／使徒／追猎者／哨兵身体15%／30%成为同家族合法精英；不覆盖高阶圣堂、机械台和星门，不给幻象。 |
| 7 | P-R16 | 达拉姆领袖 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从阿塔尼斯、泽拉图、阿拉纳克、菲尼克斯、沃拉尊中选1名一级英雄免费部署；身份占第一席；保持各自生物／机械属性和先天护盾。 |

### 神族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-S01 | 灵能武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、最大原生护盾、生命/护盾护甲、移速、攻速、合法生命治疗/原生回盾输出各＋5%／10%／15%；不增强回盾速度或回能。 |
| 2 | P-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋5%／10%／15%；不增强技能、治疗或新造弹道。 |
| 2 | P-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少4%／8%／12%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | P-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋5%／10%／15%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | P-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击5%／10%／15%暴击；该次普通武器直接伤害×1.5；技能、持续伤害及衍生溅射不暴击。 |
| 3 | P-S06 | 护盾织构 | 3 | 1／1 | bio_shield | S03满 | 战斗组最大原生护盾额外增加其修正后最大生命10%／20%／30%的固定盾值；使用本体回盾延迟/速度和护盾护甲，不再生成第二条生物盾，不恢复生命。 |
| 3 | P-S07 | 相位老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组普通攻击直接命中3%／6%／9%相位闪避；成功时该次不扣生命或原生盾；不闪避预警、范围溅射或持续伤害，不传送位置。 |
| 4 | P-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋8%／16%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | P-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | P-S10 | 护盾协防 | 2 | 1／2 | team_share | S07满 | 同家族普通／精英先用各自护盾正常承伤；穿透至生命的剩余伤害20%／40%分给半径8内同家族伙伴的生命，不借伙伴护盾制造二次减伤；详见5.4。 |
| 5 | P-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋10%／20%／30%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | P-S12 | 灵能体魄 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命和原生护盾分别＋10%／20%／30%；替代原节点单独生命＋15%／级，强化神族双层耐久；不加护障吸收值、不当场填盾。 |
| 5 | P-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋5%／10%／15%，与S01/S04同类相加；不缩冲锋/闪烁冷却，不取消虚空辉光舰引导的移动限制。 |
| 6 | P-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | P-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命8／15秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | P-S16 | 圣堂进阶 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每7名付费同家族身体进阶I—V；选锋刃／圣盾／相位，具体三方向见5.5；航母输出仅向所属截击机传一次。 |

### 神族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-A01 | 熟练部队 | 3 | 1／1 | skilled_troop | 无 | 每名完成救援的普通乘员3%／6%／10%额外升1军衔；付费或免费均可；仍受本人上限及预付款培养容量限制。 |
| 2 | P-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以1%／2%／3%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | P-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀1%／2%／3%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却60战斗秒，详见5.3。 |
| 2 | P-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时1%／2%／3%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | P-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋1／2／3个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | P-A06 | 折跃征召 | 3 | 1／1 | conscript_network | A03满 | A03免费救援神族身体最大生命＋10%／20%／30%，最大原生护盾不加；只有该身体来源标签生效，不增强其截击机生命。 |
| 3 | P-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至60%／70%／80%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | P-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋3／6个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | P-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计360／240秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | P-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | P-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋10%／20%／30%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | P-A12 | 折跃援军 | 3 | 1／1 | proliferate | A09满 | 合格击杀0.5%／1%／1.5%召来1名Rank 5临时狂热者或使徒，30秒，同时上限1／2／3；不是幻象，不造截击机，不产资源或击杀连锁。 |
| 5 | P-A13 | 热能屏障 | 3 | 1／1 | tank_support | A10满 | 每90／60／45秒触发8秒支援，每秒1／2／3道双段热能线及同数回盾；线长6宽1.2，各段62.5伤害，每目标每道两段；每次回63原生盾、不修生命；详见5.7。 |
| 6 | P-A14 | 探机显迹 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个探机救援目标5%／10%额外获得1个合法本族精英救援权；不提高主动侦测范围或隐形命中，R01增员不重复掷骰。 |
| 6 | P-A15 | 圣堂卫队 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每240／120秒召来1名Rank 5临时紫色精英，80秒；候选已解锁狂热者／追猎者／不朽者，按5.6轮换；不占永久精英身份、不改变已有变体。 |
| 7 | P-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 神族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋10%／20%／30%；追赶倍率最高1.3，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | P-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋4%／8%／12%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | P-M03 | 灵能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G显迹、英雄主动、已解锁手动闪烁和M04召回冷却−8%／16%／24%，总倍率最低0.5；不缩风暴持续时间，不让自动风暴免能量，不缩普攻。 |
| 4 | P-M04 | 战场召回 | 2 | 1／6 | airlift | M03满 | 冷却240／120秒，准备2秒后将选定可移动地面战斗组召回锚点前方合法集结点；保留生命/护盾/冷却/命令，飞行单位不参加；详见5.8。 |
| 5 | P-M05 | 相位部署 | 3 | 1／3 | quick_siege | M04满 | M04战场召回的准备时间从2秒减少33%／66%／99%，结果1.34／0.68／0.25秒；不减少冷却，不为即时闪烁凭空添加前摇。 |
| 6 | P-M06 | 相位走A | 2 | 1／6 | stutter_king | M05满 | 移动瞄准×1.5／2，合法移动开火机会50%／100%；虚空辉光舰的持续引导仍按本体锁定要求，不能靠此边移边无限引导；近战仍检查接触。 |
| 7 | P-M07 | 双重齐射 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击产生2次同威力直接命中，共用冷却；巨像不复制热能线范围，航母只由截击机继承一次第二发，连续光束每个完整武器周期只追加一次；详见5.9。 |

同属性天赋百分比先相加后乘一次；卡牌同类增量也先相加。A16可把每家族身体上限5提高到7，S14可把普通军衔上限5提高到7，R09可从原组三张强化额外领取。新订单锁定修正后的价格和时间。

## 新规则：18关固定战役

配置ID：three-races-18。18 关／6 章／17 个关间窗口，基础战斗 1800 秒，基础威胁预算 4684；通关矿／气总额 2755／2055。预算不读取玩家军力或伤亡。

| 敌军家族 | 单位威胁权重 |
| --- | --- |
| 跳虫 | 1 |
| 蟑螂 | 3 |
| 爆虫 | 2 |
| 破坏者 | 4 |
| 刺蛇 | 3 |
| 虫后 | 5 |
| 潜伏者 | 6 |
| 异龙 | 4 |
| 腐化者 | 4 |
| 雷兽 | 12 |

| 关 | 章 | 名称 | 秒 | 基础预算 | 普通波预算 | 预留：队长／Boss／主巢 | 威胁份额 | 奖励矿／气 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 登陆 | 60 | 6 | 6 | 0／0／0 | 跳虫100% | 99／46 |
| 2 | 1 | 甲壳护卫 | 60 | 12 | 12 | 0／0／0 | 跳虫70%、蟑螂30% | 99／46 |
| 3 | 1 | 爆虫预警 | 60 | 28 | 26 | 2／0／0 | 跳虫70%、爆虫30% | 132／63 |
| 4 | 2 | 窄口虫群 | 75 | 70 | 70 | 0／0／0 | 跳虫65%、蟑螂20%、爆虫15% | 165／90 |
| 5 | 2 | 重甲侧袭 | 75 | 95 | 95 | 0／0／0 | 跳虫35%、蟑螂40%、刺蛇25% | 165／90 |
| 6 | 2 | 第一主力 | 75 | 125 | 100 | 0／25／0 | 跳虫30%、蟑螂35%、爆虫20%、刺蛇15% | 220／120 |
| 7 | 3 | 地空夹击 | 90 | 150 | 150 | 0／0／0 | 跳虫40%、蟑螂25%、刺蛇20%、异龙15% | 150／97 |
| 8 | 3 | 胆汁火线 | 90 | 170 | 170 | 0／0／0 | 跳虫25%、蟑螂30%、破坏者25%、刺蛇20% | 150／97 |
| 9 | 3 | 虫后支援 | 90 | 190 | 171 | 19／0／0 | 跳虫25%、蟑螂25%、刺蛇25%、虫后15%、异龙10% | 200／131 |
| 10 | 4 | 转型窗口 | 105 | 185 | 185 | 0／0／0 | 跳虫30%、蟑螂25%、刺蛇25%、异龙20% | 120／112 |
| 11 | 4 | 潜伏阵地 | 105 | 230 | 230 | 0／0／0 | 跳虫30%、蟑螂20%、刺蛇25%、潜伏者25% | 120／112 |
| 12 | 4 | 第二主力 | 105 | 285 | 228 | 0／57／0 | 跳虫25%、蟑螂20%、破坏者20%、刺蛇20%、潜伏者15% | 160／151 |
| 13 | 5 | 雷兽冲击 | 120 | 330 | 330 | 0／0／0 | 跳虫25%、蟑螂25%、刺蛇20%、虫后15%、雷兽15% | 127／127 |
| 14 | 5 | 空群混战 | 120 | 370 | 370 | 0／0／0 | 跳虫25%、蟑螂20%、刺蛇20%、异龙20%、腐化者15% | 127／127 |
| 15 | 5 | 支援网络 | 120 | 420 | 378 | 42／0／0 | 跳虫20%、蟑螂20%、破坏者20%、刺蛇20%、虫后20% | 171／171 |
| 16 | 6 | 外巢推进 | 150 | 600 | 600 | 0／0／0 | 跳虫20%、蟑螂20%、破坏者15%、刺蛇20%、潜伏者15%、雷兽10% | 165／142 |
| 17 | 6 | 主巢前哨 | 150 | 660 | 660 | 0／0／0 | 跳虫30%、蟑螂15%、爆虫20%、刺蛇15%、异龙10%、雷兽10% | 165／142 |
| 18 | 6 | 主巢决战 | 150 | 758 | 531 | 0／0／227 | 跳虫20%、蟑螂20%、爆虫10%、破坏者15%、刺蛇15%、潜伏者10%、异龙5%、雷兽5% | 220／191 |

份额是威胁占比，不是身体占比。身体数采用累计余数分配；队长、Boss、主巢和地狱扩张巢占已预留预算，不能重复叠兵。空投守军另按固定关卡／难度表结算。

### 新18关 · 简单

兵量列顺序：跳虫／蟑螂／爆虫／破坏者／刺蛇／虫后／潜伏者／异龙／腐化者／雷兽。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。

| 关 | 秒 | 波次数 | 总预算 | 普通波预算 | 普通兵量 | 预留：队长／Boss／主巢／扩张巢 | 首批守军兵量 | 奖励矿／气 | Drone／虫卵 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | 6 | 3 | 3 | 3／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 1／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 2 | 60 | 6 | 6 | 6 | 6／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 1／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 3 | 60 | 6 | 14 | 13 | 9／0／2／0／0／0／0／0／0／0 | 1／0／0／0 | 2／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 35 | 35 | 23／2／3／0／0／0／0／0／0／0 | 0／0／0／0 | 4／0／0／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 47 | 47 | 17／6／0／0／4／0／0／0／0／0 | 0／0／0／0 | 3／1／0／0／0／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 63 | 51 | 17／6／5／0／2／0／0／0／0／0 | 0／12／0／0 | 2／1／1／0／0／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 75 | 75 | 30／6／0／0／5／0／0／3／0／0 | 0／0／0／0 | 5／1／0／0／0／0／0／0／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 85 | 85 | 23／8／0／5／6／0／0／0／0／0 | 0／0／0／0 | 4／1／0／0／1／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 95 | 86 | 21／7／0／0／7／3／0／2／0／0 | 9／0／0／0 | 3／1／0／0／1／0／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 92 | 92 | 28／8／0／0／8／0／0／4／0／0 | 0／0／0／0 | 5／1／0／0／1／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 115 | 115 | 34／8／0／0／9／0／5／0／0／0 | 0／0／0／0 | 7／1／0／0／2／0／0／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 143 | 115 | 31／7／0／6／7／0／3／0／0／0 | 0／28／0／0 | 5／2／0／1／1／0／0／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 165 | 165 | 41／14／0／0／11／5／0／0／0／2 | 0／0／0／0 | 5／2／0／0／1／1／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 185 | 185 | 46／13／0／0／12／0／0／9／7／0 | 0／0／0／0 | 8／1／0／0／1／0／0／1／1／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 210 | 189 | 40／13／0／9／13／7／0／0／0／0 | 21／0／0／0 | 7／2／0／1／1／1／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 300 | 300 | 60／20／0／12／20／0／8／0／0／2 | 0／0／0／0 | 6／2／0／1／2／0／1／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 330 | 330 | 100／16／33／0／16／0／0／8／0／3 | 0／0／0／0 | 11／2／3／0／2／0／0／1／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 379 | 266 | 53／18／13／10／13／0／5／3／0／1 | 0／0／113／0 | 8／3／2／1／2／0／1／0／0／0 | 220／191 | 3／1 |

| 章节起始关 | 压力：总量／波次／守军 | 压力：HP／伤害／攻速／移速 | 章节成长：HP／伤害／攻速 |
| --- | --- | --- | --- |
| 1 | 1／1／1 | 1／1／1／1 | 1／1／1 |
| 4 | 1／1／1 | 1／1／1／1 | 1.06／1.03／1.015 |
| 7 | 1／1／1 | 1／1／1／1 | 1.14／1.065／1.03 |
| 10 | 1／1／1 | 1／1／1／1 | 1.26／1.11／1.045 |
| 13 | 1／1／1 | 1／1／1／1 | 1.4／1.165／1.07 |
| 16 | 1／1／1 | 1／1／1／1 | 1.55／1.225／1.1 |

### 新18关 · 普通

兵量列顺序：跳虫／蟑螂／爆虫／破坏者／刺蛇／虫后／潜伏者／异龙／腐化者／雷兽。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。

| 关 | 秒 | 波次数 | 总预算 | 普通波预算 | 普通兵量 | 预留：队长／Boss／主巢／扩张巢 | 首批守军兵量 | 奖励矿／气 | Drone／虫卵 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | 6 | 5 | 5 | 5／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 2／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 2 | 60 | 6 | 11 | 11 | 8／1／0／0／0／0／0／0／0／0 | 0／0／0／0 | 3／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 3 | 60 | 6 | 25 | 23 | 17／0／3／0／0／0／0／0／0／0 | 2／0／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 63 | 63 | 41／4／5／0／0／0／0／0／0／0 | 0／0／0／0 | 5／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 86 | 86 | 32／11／0／0／7／0／0／0／0／0 | 0／0／0／0 | 5／1／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 112 | 90 | 27／11／9／0／4／0／0／0／0／0 | 0／22／0／0 | 5／1／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 135 | 135 | 55／11／0／0／9／0／0／5／0／0 | 0／0／0／0 | 6／2／0／0／1／0／0／0／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 153 | 153 | 38／15／0／10／10／0／0／0／0／0 | 0／0／0／0 | 6／2／0／1／1／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 171 | 154 | 40／13／0／0／13／4／0／4／0／0 | 17／0／0／0 | 7／2／0／0／2／1／0／0／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 167 | 167 | 51／14／0／0／14／0／0／8／0／0 | 0／0／0／0 | 8／3／0／0／2／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 207 | 207 | 63／14／0／0／18／0／8／0／0／0 | 0／0／0／0 | 9／2／0／0／3／0／1／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 256 | 205 | 51／14／0／10／14／0／5／0／0／0 | 0／51／0／0 | 10／2／0／1／2／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 297 | 297 | 76／25／0／0／20／10／0／0／0／3 | 0／0／0／0 | 9／4／0／0／3／1／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 333 | 333 | 85／22／0／0／22／0／0／17／12／0 | 0／0／0／0 | 10／3／0／0／3／0／0／2／1／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 378 | 341 | 70／23／0／17／23／13／0／0／0／0 | 37／0／0／0 | 9／3／0／2／3／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 540 | 540 | 108／36／0／21／36／0／14／0／0／4 | 0／0／0／0 | 13／4／0／2／4／0／1／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 594 | 594 | 179／30／59／0／29／0／0／15／0／5 | 0／0／0／0 | 18／4／6／0／3／0／0／2／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 683 | 479 | 95／32／24／18／24／0／8／6／0／2 | 0／0／204／0 | 14／5／4／3／3／0／1／1／0／0 | 220／191 | 3／1 |

| 章节起始关 | 压力：总量／波次／守军 | 压力：HP／伤害／攻速／移速 | 章节成长：HP／伤害／攻速 |
| --- | --- | --- | --- |
| 1 | 1／1／1 | 1／1／1／1 | 1／1／1 |
| 4 | 1／1／1 | 1／1／1／1 | 1.12／1.06／1.03 |
| 7 | 1／1／1 | 1／1／1／1 | 1.28／1.13／1.06 |
| 10 | 1／1／1 | 1／1／1／1 | 1.52／1.22／1.09 |
| 13 | 1／1／1 | 1／1／1／1 | 1.8／1.33／1.14 |
| 16 | 1／1／1 | 1／1／1／1 | 2.1／1.45／1.2 |

### 新18关 · 困难

兵量列顺序：跳虫／蟑螂／爆虫／破坏者／刺蛇／虫后／潜伏者／异龙／腐化者／雷兽。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。

| 关 | 秒 | 波次数 | 总预算 | 普通波预算 | 普通兵量 | 预留：队长／Boss／主巢／扩张巢 | 首批守军兵量 | 奖励矿／气 | Drone／虫卵 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | 6 | 6 | 6 | 6／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 2／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 2 | 60 | 6 | 13 | 13 | 10／1／0／0／0／0／0／0／0／0 | 0／0／0／0 | 3／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 3 | 60 | 6 | 31 | 28 | 20／0／4／0／0／0／0／0／0／0 | 3／0／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 79 | 79 | 52／5／6／0／0／0／0／0／0／0 | 0／0／0／0 | 6／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 108 | 108 | 39／14／0／0／9／0／0／0／0／0 | 0／0／0／0 | 4／2／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 142 | 114 | 35／13／11／0／6／0／0／0／0／0 | 0／28／0／0 | 4／2／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 176 | 176 | 71／15／0／0／12／0／0／6／0／0 | 0／0／0／0 | 9／1／0／0／1／0／0／1／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 201 | 201 | 50／20／0／13／13／0／0／0／0／0 | 0／0／0／0 | 7／2／0／1／2／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 224 | 202 | 50／17／0／0／17／6／0／5／0／0 | 22／0／0／0 | 8／2／0／0／2／1／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 223 | 223 | 68／19／0／0／18／0／0／11／0／0 | 0／0／0／0 | 11／3／0／0／3／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 277 | 277 | 85／19／0／0／23／0／11／0／0／0 | 0／0／0／0 | 13／3／0／0／3／0／1／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 344 | 276 | 70／18／0／14／18／0／7／0／0／0 | 0／68／0／0 | 11／3／0／2／2／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 407 | 407 | 104／34／0／0／27／12／0／0／0／5 | 0／0／0／0 | 14／4／0／0／3／2／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 456 | 456 | 116／30／0／0／30／0／0／23／17／0 | 0／0／0／0 | 13／4／0／0／3／0／0／2／2／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 518 | 467 | 94／31／0／23／31／19／0／0／0／0 | 51／0／0／0 | 11／4／0／3／4／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 756 | 756 | 152／51／0／28／51／0／19／0／0／6 | 0／0／0／0 | 13／5／0／3／5／0／2／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 832 | 832 | 249／42／83／0／41／0／0／21／0／7 | 0／0／0／0 | 25／4／8／0／4／0／0／3／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 955 | 669 | 135／45／33／25／33／0／11／8／0／3 | 0／0／286／0 | 20／6／5／3／4／0／2／1／0／0 | 220／191 | 3／1 |

| 章节起始关 | 压力：总量／波次／守军 | 压力：HP／伤害／攻速／移速 | 章节成长：HP／伤害／攻速 |
| --- | --- | --- | --- |
| 1 | 1.2／1.15／1.15 | 1.1／1.05／1／1.05 | 1／1／1 |
| 4 | 1.26／1.18／1.18 | 1.16／1.092／1.03／1.068 | 1.12／1.06／1.03 |
| 7 | 1.31／1.22／1.21 | 1.22／1.132／1.06／1.084 | 1.28／1.13／1.06 |
| 10 | 1.34／1.28／1.24 | 1.28／1.168／1.09／1.096 | 1.52／1.22／1.09 |
| 13 | 1.37／1.34／1.27 | 1.34／1.208／1.108／1.108 | 1.8／1.33／1.14 |
| 16 | 1.4／1.4／1.3 | 1.4／1.25／1.12／1.12 | 2.1／1.45／1.2 |

### 新18关 · 地狱

兵量列顺序：跳虫／蟑螂／爆虫／破坏者／刺蛇／虫后／潜伏者／异龙／腐化者／雷兽。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。

| 关 | 秒 | 波次数 | 总预算 | 普通波预算 | 普通兵量 | 预留：队长／Boss／主巢／扩张巢 | 首批守军兵量 | 奖励矿／气 | Drone／虫卵 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | 6 | 6 | 6 | 6／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 2／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 2 | 60 | 6 | 13 | 13 | 10／1／0／0／0／0／0／0／0／0 | 0／0／0／0 | 3／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 3 | 60 | 6 | 31 | 28 | 20／0／4／0／0／0／0／0／0／0 | 3／0／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 83 | 75 | 50／5／5／0／0／0／0／0／0／0 | 0／0／0／8 | 7／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 113 | 102 | 36／14／0／0／8／0／0／0／0／0 | 0／0／0／11 | 4／2／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 148 | 105 | 32／12／11／0／5／0／0／0／0／0 | 0／29／0／14 | 4／2／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 195 | 176 | 71／15／0／0／12／0／0／6／0／0 | 0／0／0／19 | 9／1／0／0／1／0／0／1／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 220 | 198 | 51／20／0／12／13／0／0／0／0／0 | 0／0／0／22 | 8／2／0／1／2／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 246 | 198 | 52／16／0／0／16／6／0／5／0／0 | 24／0／0／24 | 10／2／0／0／2／1／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 260 | 234 | 72／19／0／0／19／0／0／12／0／0 | 0／0／0／26 | 11／4／0／0／3／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 323 | 291 | 87／20／0／0／24／0／12／0／0／0 | 0／0／0／32 | 13／2／0／0／3／0／2／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 400 | 280 | 71／19／0／14／18／0／7／0／0／0 | 0／80／0／40 | 11／3／0／2／3／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 499 | 450 | 112／37／0／0／30／13／0／0／0／6 | 0／0／0／49 | 15／4／0／0／4／2／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 559 | 504 | 127／34／0／0／33／0／0／25／19／0 | 0／0／0／55 | 14／4／0／0／3／0／0／3／2／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 635 | 509 | 102／35／0／25／34／20／0／0／0／0 | 63／0／0／63 | 14／5／0／3／4／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 972 | 875 | 176／59／0／33／58／0／22／0／0／7 | 0／0／0／97 | 17／6／0／3／5／0／2／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 1070 | 963 | 289／48／97／0／48／0／0／24／0／8 | 0／0／0／107 | 26／4／8／0／4／0／0／2／0／1 | 165／142 | 2／1 |
| 18 | 150 | 15 | 1228 | 738 | 148／49／38／28／37／0／12／9／0／3 | 0／0／368／122 | 20／7／5／4／5／0／2／1／0／0 | 220／191 | 3／1 |

| 章节起始关 | 压力：总量／波次／守军 | 压力：HP／伤害／攻速／移速 | 章节成长：HP／伤害／攻速 |
| --- | --- | --- | --- |
| 1 | 1.2／1.15／1.15 | 1.1／1.05／1／1.05 | 1／1／1 |
| 4 | 1.32／1.24／1.21 | 1.22／1.14／1.06／1.092 | 1.12／1.06／1.03 |
| 7 | 1.44／1.33／1.27 | 1.35／1.23／1.116／1.126 | 1.28／1.13／1.06 |
| 10 | 1.56／1.42／1.33 | 1.5／1.32／1.164／1.144 | 1.52／1.22／1.09 |
| 13 | 1.68／1.51／1.39 | 1.65／1.41／1.208／1.162 | 1.8／1.33／1.14 |
| 16 | 1.8／1.6／1.45 | 1.8／1.5／1.25／1.18 | 2.1／1.45／1.2 |

第18关主巢全程可攻击、阶段切换不回血；提前摧毁停止其攻击与生产，仍需完成150秒时限。通关要求主巢摧毁和时限结束同时满足。第1—17关按时间推进，存活敵人与伤损跨关保留。24关只是后续独立战役接口，不是当前内容。

普通／简单每3关获得1永久资源，困难每3关2资源，地狱每关1资源；完整18关分别6／12／18。无尽每完整60秒战斗按普通／简单1、困难／地狱2资源结算，未新增20分钟领取上限。无尽保留本局资产，并使用240秒轮次及终章混合敌军池。

## 版本边界

当前新局只运行 mvp-1.0 的三族18关、165节点和单套关间经济。M1空天赋档可规范化迁移；旧开发战局不续跑，只能导出原件并一次性核算已证实的永久资源。历史价格表仅供该只读导入核算，不参与当前游戏运行。

## 核对命令

```sh
npm run docs:data
npm run docs:check
node tools/build-expansion-unit-data.mjs --check
node tools/build-campaign-science-vessel.mjs --check
```
