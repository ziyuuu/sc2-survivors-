# 当前游戏数据参考 · 三族18关

本文件由 `npm run docs:data` 从运行配置生成；请修改源码后重新生成。设计规则见 [DESIGN.md](DESIGN.md)，验证状态见 [QA.md](QA.md)。表格是配置参考，不代表全部内容已经通过人工视觉、操作或平衡验收。逐实体最终值还包括培养、科技、天赋、强化与临时状态。

## 规则与来源边界

| 规则 | 用途 | 普通家族／身体 | 英雄身份 | 战役 |
| --- | --- | --- | --- | --- |
| mvp-1.0 | 当前唯一可玩规则 | 5 家族 × 5 基础名额；A16至7名额，跳虫每名额两身体，S14培养至7级 | 3 | three-races-18：18关 |

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

## 玩家战斗统一适配

普通和精英玩家战斗单位及其适用子体的武器及附加伤害、最大生命、原生护盾、移速、生命/护盾护甲乘 1.15，攻击周期除以该因子。工人、建筑、载体和技能/治疗不乘。P3已批准的18名英雄使用下列独立显式机体，普攻和机体不再重复乘该因子或旧1.15普攻适配；旗舰子机使用独立250/.4秒机枪。下方普通来源表未包含这项适配；实际实体以派生值为准。

跳虫每名额为一对，共享军衔及精英身份，两身体独立战斗。缺员900固定步后存活者裂变；死亡、培养及换兵按配对账计算。虫后距落地载体6以内注卵，每只45秒冷却、同舱一次、最多两个一级普通名额、零付款、先扣除预付款占位。

## 新规则：30个普通家族

以下为一级基础身体和默认主武器。雷神、虫后等多武器、变形与范围模式另见后表；科技球及医疗艇没有普通攻击，航母伤害由所属截击机结算。菌毯修正、护盾和恢复不合并成生命。

### 人族

| ID | 兵种 | HP／护盾 | 生命护甲 | 移速 | 单发 × 发数 | 周期秒 | 射程 | 默认目标 | 属性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| marine | 陆战队员 | 45／0 | 0 | 3.15 | 6 × 1 | 0.6149 | 5 | both | Light、Biological |
| marauder | 劫掠者 | 125／0 | 1 | 3.15 | 10 × 1 | 1.0714 | 6 | ground | Armored、Biological |
| reaper | 死神 | 60／0 | 0 | 5.25 | 6 × 2 | 0.7857 | 5 | ground | Light、Biological |
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

玩家死神使用本作适配：每周期两次、每次6伤害；锁定来源仍为2×4。军衔、精英、科技和强化在此基础上分别计算一次。

### 完整生产配方

费用按最终交付的一名身体列出，进化体费用已包含基础体，不再重复收费。完整训练时间为基础体与进化阶段之和；跳虫通常一批双生，单体尾单按单体价格、同一配方时间。新订单锁定实际价格与训练时间，旧订单不追溯改价。

| 家族 | 生产线 | 矿／气（每身体） | 完整秒 | 基础秒＋进化秒 | 通常身体／配方 | 基础体 | 本作前置 | 额外关卡条件 | 来源训练项 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 陆战队员 | 兵营 | 50／0 | 17.8571 | 17.8571＋0 | 1 | — | unlock.marine | — | BarracksTrain/Train1 |
| 劫掠者 | 兵营 | 100／25 | 21.4286 | 21.4286＋0 | 1 | — | unlock.marauder | — | BarracksTrain/Train4 |
| 死神 | 兵营 | 50／50 | 32.1429 | 32.1429＋0 | 1 | — | unlock.reaper | — | BarracksTrain/Train2 |
| 恶火 | 重工厂 | 100／0 | 21.4286 | 21.4286＋0 | 1 | — | unlock.hellion | — | FactoryTrain/Train6 |
| 攻城坦克 | 重工厂 | 150／125 | 32.1429 | 32.1429＋0 | 1 | — | unlock.tank | — | FactoryTrain/Train2 |
| 雷神 | 重工厂 | 300／200 | 42.8571 | 42.8571＋0 | 1 | — | unlock.thor | 完成第9关 | FactoryTrain/Train5 |
| 维京 | 星港 | 125／75 | 30 | 30＋0 | 1 | — | unlock.viking | — | StarportTrain/Train5 |
| 女妖 | 星港 | 150／100 | 42.8571 | 42.8571＋0 | 1 | — | unlock.banshee | — | StarportTrain/Train2 |
| 医疗运输机 | 星港 | 100／100 | 30 | 30＋0 | 1 | — | unlock.medivac | — | StarportTrain/Train1 |
| 科技球 | 星港 | 100／200 | 42.8571 | 42.8571＋0 | 1 | — | unlock.science_vessel | — | StarportTrain/Train7 |
| 跳虫 | 基础虫群 | 25／0 | 17.1429 | 17.1429＋0 | 2 | — | unlock.zergling | — | LarvaTrain/Train2 |
| 爆虫 | 基础虫群 | 50／25 | 31.4286 | 17.1429＋14.2857 | 1 | 跳虫 | unlock.baneling | — | MorphToBaneling/1 |
| 蟑螂 | 基础虫群 | 75／25 | 19.2857 | 19.2857＋0 | 1 | — | unlock.roach | — | LarvaTrain/Train10 |
| 破坏者 | 地面进化 | 100／100 | 31.4286 | 19.2857＋12.1429 | 1 | 蟑螂 | unlock.ravager | — | MorphToRavager/1 |
| 刺蛇 | 地面进化 | 100／50 | 23.5714 | 23.5714＋0 | 1 | — | unlock.hydralisk | — | LarvaTrain/Train4 |
| 虫后 | 基础虫群 | 175／0 | 35.7143 | 35.7143＋0 | 1 | — | unlock.queen | — | TrainQueen/Train1 |
| 潜伏者 | 地面进化 | 150／150 | 41.6071 | 23.5714＋18.0357 | 1 | 刺蛇 | unlock.lurker | — | MorphToLurker/1 |
| 异龙 | 飞行虫群 | 100／100 | 23.5714 | 23.5714＋0 | 1 | — | unlock.mutalisk | — | LarvaTrain/Train5 |
| 腐化者 | 飞行虫群 | 150／100 | 28.5714 | 28.5714＋0 | 1 | — | unlock.corruptor | — | LarvaTrain/Train12 |
| 雷兽 | 地面进化 | 275／200 | 39.2857 | 39.2857＋0 | 1 | — | unlock.ultralisk | 完成第9关 | LarvaTrain/Train7 |
| 狂热者 | 传送门 | 100／0 | 27.1429 | 27.1429＋0 | 1 | — | unlock.zealot | — | GatewayTrain/Train1 |
| 使徒 | 传送门 | 100／25 | 30 | 30＋0 | 1 | — | unlock.adept | — | GatewayTrain/Train7 |
| 追猎者 | 传送门 | 125／50 | 27.1429 | 27.1429＋0 | 1 | — | unlock.stalker | — | GatewayTrain/Train2 |
| 哨兵 | 传送门 | 50／100 | 22.8571 | 22.8571＋0 | 1 | — | unlock.sentry | — | GatewayTrain/Train6 |
| 不朽者 | 机械台 | 275／100 | 39.2857 | 39.2857＋0 | 1 | — | unlock.immortal | — | RoboticsFacilityTrain/Train4 |
| 巨像 | 机械台 | 300／200 | 53.5714 | 53.5714＋0 | 1 | — | unlock.colossus | — | RoboticsFacilityTrain/Train3 |
| 高阶圣堂武士 | 传送门 | 50／150 | 39.2857 | 39.2857＋0 | 1 | — | unlock.high_templar | — | GatewayTrain/Train4 |
| 凤凰 | 星门 | 150／100 | 25 | 25＋0 | 1 | — | unlock.phoenix | — | StargateTrain/Train1 |
| 虚空辉光舰 | 星门 | 200／150 | 37.1429 | 37.1429＋0 | 1 | — | unlock.void_ray | — | StargateTrain/Train5 |
| 航母 | 星门 | 350／250 | 64.2857 | 64.2857＋0 | 1 | — | unlock.carrier | 完成第9关 | StargateTrain/Train3 |

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

范围伤害、异龙弹射、潜伏者线形穿刺、巨像双束与虚空基础反甲分别读取 `SOURCE_WEAPON_PATTERNS`。本表不是把每行武器同时对同一目标结算。异龙三跳独立读取9／3／1基值与每级1／0.333／0.111增量；爆虫对建筑读取独立80基值与每级5增量。来源武器表不代替实际结算：普通、精英和英雄按各自执行器使用实时命中、真实飞行或延迟包；已批准的多发、穿透、二次效果与持久化时钟分别执行，不能据此声称完全复刻SC2弹道。坦克旧架炮配置见 `SIEGE`；变形共享身体、生命、能量、培养及武器冷却。

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

## 普通敌军与追加虫海

普通敌军：战役1—6关I级、7—12关II级、13—18关III级；无尽1—2轮III级、3—4轮IV级、第5轮起V级。军衔替换普通敌军旧章节生命／伤害／攻速成长。

等级L：攻速1＋0.15×(L−1)，每击伤害L÷攻速倍率，生命1＋0.8×(L−1)，额外护甲0.5×(L−1)。简单减半各增量；困难／地狱再应用一次既有压力。明确兵种阶段升级保留。

第1—6关普通敌人与普通救援守军：简单生命×0.80、普通×0.90，其他难度不变。跳虫最终简单14.4／19.2／24／28，普通16.2／21.6／27／31.5；后者对应第4—6关。精英、Boss、领主、建筑、经济目标不应用。出生后固定，保留原生恢复。

普通难度每关追加I级虫海：7—9关60、10—12关90、13—15关120、16—18关150、无尽每60秒60。70%跳虫／20%蟑螂／10%爆虫；第5秒开始每15秒分批，其他难度按原数量比例、累计余数分配。

追加兵始终使用固定I级基础属性，不叠章节、普通军衔、难度属性或后期兵种升级；正常奖励和击杀天赋。原事件优先，300敌人上限，积压跨关保存，数量不丢弃。

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

共 79 种发展定义。每个第1—17关后窗口至多购买一项，研究／建造即时生效，训练只消耗战斗时间。报价不因钱包不足隐藏。首次选择发展方向，后续记忆方向；购买或跳过后进入随机商店。随机折扣原价／85折／7折／5折的概率为50%／30%／15%／5%，与适用天赋折扣相乘后每资源向上取整。

| ID | 种族 | 行动 | 类型 | 价格矿／气 | 等级／设施上限 | 前置 | 最早已完成关卡 | 关联家族 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barracks | 人族 | 兵营 | facility | 150／0 | 5 | — | 0 | 陆战队员、劫掠者、死神 |
| factory | 人族 | 重工厂 | facility | 150／100 | 5 | barracks | 0 | 恶火、攻城坦克、雷神 |
| starport | 人族 | 星港 | facility | 150／100 | 5 | factory | 0 | 医疗运输机、维京、女妖、科技球 |
| hatchery | 虫族 | 孵化场 | facility | 150／0 | 5 | — | 0 | 跳虫、爆虫、蟑螂、虫后 |
| gateway | 神族 | 传送门 | facility | 150／0 | 5 | — | 0 | 狂热者、使徒、追猎者、哨兵、高阶圣堂武士 |
| robotics | 神族 | 机械台 | facility | 150／100 | 5 | gateway | 0 | 不朽者、巨像 |
| stargate | 神族 | 星门 | facility | 150／100 | 5 | gateway | 0 | 凤凰、虚空辉光舰、航母 |
| unlock.marine | 人族 | 解锁陆战队员 | technology | 50／0 | 1 | — | 0 | 陆战队员 |
| unlock.marauder | 人族 | 解锁劫掠者 | technology | 100／25 | 1 | — | 0 | 劫掠者 |
| unlock.reaper | 人族 | 解锁死神 | technology | 50／50 | 1 | — | 0 | 死神 |
| stim | 人族 | 兴奋剂 | technology | 125／75 | 1 | unlock.marine | 0 | 陆战队员 |
| shield | 人族 | 战斗盾 | technology | 125／75 | 1 | unlock.marine | 0 | 陆战队员 |
| system.barracks | 人族 | 兵营攻防系统 | technology | 100／50 | 1 | — | 0 | 陆战队员、劫掠者、死神 |
| research.barracks.weapon | 人族 | 兵营武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.barracks | 0 | 陆战队员、劫掠者、死神 |
| research.barracks.defense | 人族 | 兵营防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.barracks | 0 | 陆战队员、劫掠者、死神 |
| unlock.hellion | 人族 | 解锁恶火 | technology | 100／0 | 1 | — | 0 | 恶火 |
| unlock.tank | 人族 | 解锁攻城坦克 | technology | 150／125 | 1 | — | 0 | 攻城坦克 |
| unlock.thor | 人族 | 解锁雷神 | technology | 300／200 | 1 | — | 0 | 雷神 |
| infernal | 人族 | 燃烧强化 | technology | 125／75 | 1 | unlock.hellion | 0 | 恶火 |
| system.factory | 人族 | 重工厂攻防系统 | technology | 100／50 | 1 | — | 0 | 恶火、攻城坦克、雷神 |
| research.factory.weapon | 人族 | 重工厂武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.factory | 0 | 恶火、攻城坦克、雷神 |
| research.factory.defense | 人族 | 重工厂防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.factory | 0 | 恶火、攻城坦克、雷神 |
| unlock.medivac | 人族 | 解锁医疗运输机 | technology | 100／100 | 1 | — | 0 | 医疗运输机 |
| unlock.viking | 人族 | 解锁维京 | technology | 125／75 | 1 | — | 0 | 维京 |
| unlock.banshee | 人族 | 解锁女妖 | technology | 150／100 | 1 | — | 0 | 女妖 |
| unlock.science_vessel | 人族 | 解锁科技球 | technology | 100／200 | 1 | — | 0 | 科技球 |
| cloak | 人族 | 隐形装置 | technology | 125／75 | 1 | unlock.banshee | 0 | 女妖 |
| support_efficiency | 人族 | 医修效率 | technology | 125／75 | 1 | unlock.science_vessel | 0 | 科技球 |
| system.starport | 人族 | 星港攻防系统 | technology | 100／50 | 1 | — | 0 | 医疗运输机、维京、女妖、科技球 |
| research.starport.weapon | 人族 | 星港武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.starport | 0 | 医疗运输机、维京、女妖、科技球 |
| research.starport.defense | 人族 | 星港防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.starport | 0 | 医疗运输机、维京、女妖、科技球 |
| unlock.zergling | 虫族 | 解锁跳虫 | technology | 50／0 | 1 | — | 0 | 跳虫 |
| unlock.baneling | 虫族 | 解锁爆虫 | technology | 50／25 | 1 | — | 0 | 爆虫 |
| unlock.roach | 虫族 | 解锁蟑螂 | technology | 75／25 | 1 | — | 0 | 蟑螂 |
| unlock.queen | 虫族 | 解锁虫后 | technology | 175／0 | 1 | — | 0 | 虫后 |
| ling_speed | 虫族 | 代谢加速 | technology | 125／75 | 1 | unlock.zergling | 0 | 跳虫 |
| bane_speed | 虫族 | 离心钩 | technology | 125／75 | 1 | unlock.baneling | 0 | 爆虫 |
| roach_speed | 虫族 | 胶质重组 | technology | 125／75 | 1 | unlock.roach | 0 | 蟑螂 |
| system.zerg.basic | 虫族 | 基础虫群攻防系统 | technology | 100／50 | 1 | — | 0 | 跳虫、爆虫、蟑螂、虫后 |
| research.zerg.basic.weapon | 虫族 | 基础虫群武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.basic | 0 | 跳虫、爆虫、蟑螂、虫后 |
| research.zerg.basic.defense | 虫族 | 基础虫群防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.basic | 0 | 跳虫、爆虫、蟑螂、虫后 |
| unlock.ravager | 虫族 | 解锁破坏者 | technology | 100／100 | 1 | — | 0 | 破坏者 |
| unlock.hydralisk | 虫族 | 解锁刺蛇 | technology | 100／50 | 1 | — | 0 | 刺蛇 |
| unlock.lurker | 虫族 | 解锁潜伏者 | technology | 150／150 | 1 | — | 0 | 潜伏者 |
| unlock.ultralisk | 虫族 | 解锁雷兽 | technology | 275／200 | 1 | — | 0 | 雷兽 |
| hydra_range | 虫族 | 沟槽脊刺 | technology | 125／75 | 1 | unlock.hydralisk | 0 | 刺蛇 |
| lurker_deploy | 虫族 | 适应爪 | technology | 125／75 | 1 | unlock.lurker | 0 | 潜伏者 |
| system.zerg.evolution | 虫族 | 地面进化攻防系统 | technology | 100／50 | 1 | — | 0 | 破坏者、刺蛇、潜伏者、雷兽 |
| research.zerg.evolution.weapon | 虫族 | 地面进化武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.evolution | 0 | 破坏者、刺蛇、潜伏者、雷兽 |
| research.zerg.evolution.defense | 虫族 | 地面进化防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.evolution | 0 | 破坏者、刺蛇、潜伏者、雷兽 |
| unlock.mutalisk | 虫族 | 解锁异龙 | technology | 100／100 | 1 | — | 0 | 异龙 |
| unlock.corruptor | 虫族 | 解锁腐化者 | technology | 150／100 | 1 | — | 0 | 腐化者 |
| system.zerg.air | 虫族 | 飞行虫群攻防系统 | technology | 100／50 | 1 | — | 0 | 异龙、腐化者 |
| research.zerg.air.weapon | 虫族 | 飞行虫群武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.air | 0 | 异龙、腐化者 |
| research.zerg.air.defense | 虫族 | 飞行虫群防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.zerg.air | 0 | 异龙、腐化者 |
| unlock.zealot | 神族 | 解锁狂热者 | technology | 100／0 | 1 | — | 0 | 狂热者 |
| unlock.adept | 神族 | 解锁使徒 | technology | 100／25 | 1 | — | 0 | 使徒 |
| unlock.stalker | 神族 | 解锁追猎者 | technology | 125／50 | 1 | — | 0 | 追猎者 |
| unlock.sentry | 神族 | 解锁哨兵 | technology | 50／100 | 1 | — | 0 | 哨兵 |
| unlock.high_templar | 神族 | 解锁高阶圣堂武士 | technology | 50／150 | 1 | — | 0 | 高阶圣堂武士 |
| charge | 神族 | 冲锋 | technology | 125／75 | 1 | unlock.zealot | 0 | 狂热者 |
| glaives | 神族 | 共鸣战刃 | technology | 125／75 | 1 | unlock.adept | 0 | 使徒 |
| blink | 神族 | 闪烁 | technology | 125／75 | 1 | unlock.stalker | 0 | 追猎者 |
| storm | 神族 | 灵能风暴 | technology | 125／75 | 1 | unlock.high_templar | 0 | 高阶圣堂武士 |
| system.gateway | 神族 | 传送门攻防系统 | technology | 100／50 | 1 | — | 0 | 狂热者、使徒、追猎者、哨兵、高阶圣堂武士 |
| research.gateway.weapon | 神族 | 传送门武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.gateway | 0 | 狂热者、使徒、追猎者、哨兵、高阶圣堂武士 |
| research.gateway.defense | 神族 | 传送门防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.gateway | 0 | 狂热者、使徒、追猎者、哨兵、高阶圣堂武士 |
| unlock.immortal | 神族 | 解锁不朽者 | technology | 275／100 | 1 | — | 0 | 不朽者 |
| unlock.colossus | 神族 | 解锁巨像 | technology | 300／200 | 1 | — | 0 | 巨像 |
| colossus_range | 神族 | 热能射线 | technology | 125／75 | 1 | unlock.colossus | 0 | 巨像 |
| system.robotics | 神族 | 机械台攻防系统 | technology | 100／50 | 1 | — | 0 | 不朽者、巨像 |
| research.robotics.weapon | 神族 | 机械台武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.robotics | 0 | 不朽者、巨像 |
| research.robotics.defense | 神族 | 机械台防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.robotics | 0 | 不朽者、巨像 |
| unlock.phoenix | 神族 | 解锁凤凰 | technology | 150／100 | 1 | — | 0 | 凤凰 |
| unlock.void_ray | 神族 | 解锁虚空辉光舰 | technology | 200／150 | 1 | — | 0 | 虚空辉光舰 |
| unlock.carrier | 神族 | 解锁航母 | technology | 350／250 | 1 | — | 0 | 航母 |
| system.stargate | 神族 | 星门攻防系统 | technology | 100／50 | 1 | — | 0 | 凤凰、虚空辉光舰、航母 |
| research.stargate.weapon | 神族 | 星门武器 | research | 125／50 → 200／100 → 275／150 | 3 | system.stargate | 0 | 凤凰、虚空辉光舰、航母 |
| research.stargate.defense | 神族 | 星门防护 | research | 125／50 → 200／100 → 275／150 | 3 | system.stargate | 0 | 凤凰、虚空辉光舰、航母 |

三级常规研究还受统一时点限制：二级须完成第6关，三级须完成第12关。单设施实验室选择具体未配实验室的对应设施；同一窗口最多购买一项。雷神、雷兽、航母另须完成第9关。

发展与商店共享递增刷新次数n：max(10, ceil((50＋40n−20×R03)×(1−0.1×R12)))矿。R06每窗口1／2／3次免费刷新也推进n；零天赋无免费刷新，购物无限刷新。

新家族接收且五个家族槽已满时先冻结模拟，再展示替换。继承等级 = 1＋floor((旧等级−1)／2)，逐存活成员产生记录；每家族身体上限由A16决定为5或7。未出舱、已付款与已投放资产按各自支付账本结清，不能将培养记录重复兑现。

## 新规则：三件付费商品与Build卡组

| 已完成关卡 | 白 | 绿 | 蓝 | 紫 | 橙 |
| --- | --- | --- | --- | --- | --- |
| 1—5 | 45% | 35% | 16% | 4% | 0% |
| 6—11 | 25% | 40% | 27% | 7% | 1% |
| 12—17 | 15% | 35% | 35% | 12% | 3% |

| 效果ID | 名称 | 类别 | 白／绿／蓝／紫／橙（配置值） | 同目标上限（配置值） |
| --- | --- | --- | --- | --- |
| recovery | 恢复增效 | synergy | 0.04／0.06／0.09／0.12／0.16 | 0.4 |
| energy | 能量循环 | synergy | 0.04／0.06／0.09／0.12／0.16 | 0.4 |
| production | 训练周转 | general | 0.03／0.05／0.07／0.1／0.12 | 0.25 |

| 品质 | 全军伤害／攻速 | 全军生命及盾／双护甲 | 每组每品质上限 |
| --- | --- | --- | --- |
| white | 3%／2% | 4%／0.1 | 3 |
| green | 5%／3% | 7.000000000000001%／0.2 | 3 |
| blue | 8%／4% | 10%／0.3 | 3 |
| purple | 12%／6% | 15%／0.5 | 3 |
| orange | 16%／8% | 20%／0.7 | 3 |

百分比卡的配置值0.03表示3%；护甲为固定加值。培养卡绿蓝紫橙将最低两名普通名额提升至II／III／IV／V，按实际所需等级增量定价。第一张须立即有收益；后两张当前阵容／路线、通用协同、其他合法发展权重70／20／10，空池归一化。九套Build分阶段扩大推荐池，不封锁合法卡。

删除固定关卡英雄、紫卡、连续低品质和强制品质补位；保留分阶段基础稀有度。Boss每三关死亡掉一件：80%紫／20%橙，橙替代紫。

每页三件商品均可购买，售罄不补货；R09每窗口1／2次免单，刷新不消耗免单。数值卡白到橙基础价50/0、90/20、150/50、225/90、325/140；培养为完整配方乘实际等级增量；紫精英为配方乘5，橙V级精英为紫价乘3；英雄750/250。四种经济商品支付25矿/25矿/50矿/75矿25气，分别得到100矿/50气/75矿25气/100矿25气。空投白绿蓝1／2／3名额，直接获兵绿蓝紫1／2／3名额（直接价格乘1.5），按路线攻防进度和卡片品质交集开放三档兵种；不解锁生产。原趣味牌为布雷、随机轰炸、弹药变异与战略打击；每族另有4张独有卡（3自动、1主动），见RACE_FUN_CACHE_20260929.md。先抽品质，再趣味池25%/其他75%，空池重新归一化；每族8张。地图掉落无章节额度，普通／经济工蜂／精英触发率2%／8%／40%；R14另产生独立紫／橙击杀掉落，均保存收据。

## 新规则：18名英雄

各族六选三身份，阵亡仍占身份名额。招募顺序绑定技能槽1／2／3；等级1—5，同名卡升级但不复活。新增技能数值是本作实验参数，不能据原模型名称声称为原版技能。

| ID | 种族 | 英雄 | HP／护盾 | 生命护甲 | 单发 × 发数 | 周期秒 | 射程／移速 | 普攻目标 | 属性 | 先天隐形 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| raynor | 人族 | 雷诺 | 9500／0 | 10 | 360 × 1 | 0.2 | 7.5／4 | both | Biological、Heroic | 否 |
| tychus | 人族 | 泰凯斯 | 11000／0 | 12 | 300 × 1 | 0.1 | 6.5／3.6 | both | Biological、Heroic | 否 |
| nova | 人族 | 诺娃 | 11000／1600 | 6 | 1100 × 1 | 0.5 | 10／4.8 | both | Biological、Heroic | 否 |
| swann | 人族 | 斯旺 | 10000／0 | 14 | 420 × 1 | 0.3 | 8／3.2 | ground | Biological、Heroic | 否 |
| tosh | 人族 | 托什 | 8500／0 | 8 | 480 × 1 | 0.3 | 8／4.3 | both | Biological、Heroic | 否 |
| yamato_battlecruiser | 人族 | 大和战列巡洋舰 | 22000／0 | 18 | 660 × 2 | 0.2 | 10／2.9 | both | Mechanical、Armored、Massive、Heroic | 否 |
| kerrigan | 虫族 | 凯瑞甘 | 18000／0 | 14 | 1800 × 1 | 0.2 | 1.8／4.5 | ground | Biological、Heroic | 否 |
| zagara | 虫族 | 扎加拉 | 13000／0 | 10 | 1150 × 1 | 0.2 | 8／3.8 | both | Biological、Heroic | 否 |
| dehaka | 虫族 | 德哈卡 | 23000／0 | 16 | 2100 × 1 | 0.25 | 2／3.6 | ground | Biological、Heroic | 否 |
| stukov | 虫族 | 斯托科夫 | 15000／0 | 12 | 1500 × 1 | 0.3 | 8／3.5 | both | Biological、Heroic | 否 |
| niadra | 虫族 | 妮雅德拉 | 14500／0 | 11 | 650 × 1 | 0.4 | 7／3.7 | both | Biological、Heroic | 否 |
| hots_leviathan | 虫族 | 利维坦 | 26000／0 | 18 | 2300 × 1 | 0.25 | 9／2.8 | both | Biological、Armored、Massive、Heroic | 否 |
| artanis | 神族 | 阿塔尼斯 | 11000／10000 | 15 | 550 × 2 | 0.28 | 1.8／3.9 | ground | Biological、Heroic | 否 |
| zeratul | 神族 | 泽拉图 | 8000／7000 | 8 | 800 × 1 | 0.24 | 1.6／5.2 | ground | Biological、Heroic | 是 |
| alarak | 神族 | 阿拉纳克 | 15000／8000 | 14 | 800 × 1 | 0.22 | 2／3.9 | ground | Biological、Heroic | 否 |
| fenix | 神族 | 菲尼克斯 | 11000／12000 | 15 | 950 × 1 | 0.25 | 9／3.5 | both | Mechanical、Armored、Heroic | 否 |
| vorazun | 神族 | 沃拉尊 | 8500／7500 | 9 | 550 × 1 | 0.28 | 1.8／4.8 | ground | Biological、Heroic | 是 |
| purifier_flagship | 神族 | 净化者旗舰 | 15000／16000 | 18 | 0 × 1 | 1 | 10／2.9 | none | Mechanical、Armored、Massive、Heroic | 否 |

| 英雄 | 主动技能 | 一级基础量 | 范围参数：射程／半径／长度／宽度 | 前摇或首个结算延迟秒 | 冷却秒 | 模型ID |
| --- | --- | --- | --- | --- | --- | --- |
| 雷诺 | 穿透射击 | 5060 | 12／0.5／12／1.4 | 0.2 | 12 | hero.raynor |
| 泰凯斯 | 手雷 | 4140 | 5／3.2／0／0 | 0.6 | 14 | hero.tychus |
| 诺娃 | 狙击 | 6900 | 12／0.5／12／1 | 0.35 | 18 | hero.nova |
| 斯旺 | 紧急抢修 | 0 | 7／0／0／0 | 1 | 30 | hero.swann |
| 托什 | 精神冲击 | 4600 | 10000／2.8／0／0 | 0.5 | 35 | hero.tosh |
| 大和战列巡洋舰 | 大和聚变炮 | 9200 | 11／2.8／0／0 | 1.25 | 25 | hero.yamato_battlecruiser |
| 凯瑞甘 | 灵能冲击 | 5520 | 11／0／11／2.2 | 0.5 | 12 | hero.kerrigan |
| 扎加拉 | 爆虫弹幕 | 2300 | 9／1.7／0／0 | 0.7 | 16 | hero.zagara |
| 德哈卡 | 原始吞噬 | 9660 | 3／0／0／0 | 0.35 | 20 | hero.dehaka |
| 斯托科夫 | 腐蚀弹 | 1840 | 9／3／0／0 | 0.25 | 16 | hero.stukov |
| 妮雅德拉 | 殖群复生 | 0 | 6／6／0／0 | 0 | 35 | hero.niadra |
| 利维坦 | 生体等离子风暴 | 2760 | 10／3.5／0／0 | 0.8 | 26 | hero.hots_leviathan |
| 阿塔尼斯 | 护盾复苏 | 0 | 6／6／0／0 | 0 | 24 | hero.artanis |
| 泽拉图 | 虚空斩 | 10120 | 3／1.2／0／0 | 0.25 | 18 | hero.zeratul |
| 阿拉纳克 | 毁灭波 | 5520 | 10／0／10／2.6 | 0.55 | 14 | hero.alarak |
| 菲尼克斯 | 太阳炮 | 5980 | 10／3.2／0／0 | 0.6 | 16 | hero.fenix |
| 沃拉尊 | 时间停滞 | 0 | 10／5.5／0／0 | 0.25 | 18 | hero.vorazun |
| 净化者旗舰 | 聚变核爆 | 7360 | 12／4／0／0 | 1.4 | 30 | elite.carrier.1 |

“一级基础量”依技能分别指单次伤害、每次治疗或每目标回盾，控制技能可为0；弹幕次数、持续伤害、合法目标及控制时长由技能执行器定义，不能将该列直接当作技能总伤害。18英雄固定成长见下表；技能伤害基数按skill/9200缩放。治疗、回盾、复生次数、控制和被动分别读取专属规则，不将它们错误地统一写为每级25%。复活价格250矿／100气×[1＋0.25×(等级−1)]，下一关部署且技能从完整冷却开始。

### 英雄I–V固定成长及光环

| 军衔 | 生命／原生盾倍率 | 单击倍率 | 周期倍率 | 额外生命护甲 | 被动量倍率 | 技能伤害基准 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | 0 | 1 | 9200 |
| 2 | 1.35 | 1.2825 | 0.95 | 0.5 | 1.35 | 12880 |
| 3 | 1.7 | 1.53 | 0.9 | 1 | 1.7 | 16560 |
| 4 | 2.05 | 1.7425 | 0.85 | 1.5 | 2.05 | 20240 |
| 5 | 2.4 | 1.92 | 0.8 | 2 | 2.4 | 23920 |

三族18英雄采用相同固定成长曲线；基础量来自前表，不合并光环、科技、卡牌和独立护障。原有雷诺家族号令、扎加拉攻速/移动、利维坦近场生命以及实际治疗/回盾被动继续执行；阿塔尼斯原30%保护被40%替换一次。

| 英雄 | 现行足下光环规则 |
| --- | --- |
| 雷诺 | 战术号令：范围8内永久战斗友军武器伤害 +35%。 |
| 泰凯斯 | 火力压制：范围7内敌方战斗单位攻速 −35%，对 Boss 完整生效。 |
| 诺娃 | 锁定破绽：范围10内敌方战斗单位承受武器伤害 +40%，对 Boss 完整生效。 |
| 斯旺 | 工程护甲：范围8内永久机械战斗友军生命护甲 +6。 |
| 托什 | 精神压迫：范围8内敌方战斗单位武器伤害 −35%，对 Boss 完整生效。 |
| 大和战列巡洋舰 | 舰队节奏：范围10内永久战斗友军攻速 +40%。 |
| 凯瑞甘 | 刀锋意志：攻击＋50%、攻速＋30%、生命/原生盾＋35%、生命/盾护甲＋30%、移动＋25%；全队生物。 |
| 扎加拉 | 虫群围压：敌攻速－45%、武器伤害－30%、移动－50%；半径10，Boss完整生效。 |
| 德哈卡 | 原始威慑：敌武器伤害－50%、攻速－35%、移动－45%；半径9，Boss完整生效。 |
| 斯托科夫 | 感染破绽：受到武器伤害＋45%、实际生命治疗－50%；每秒瘟疫为入圈时最大生命的普通6%/精英3%/Boss1.2%；半径10。 |
| 妮雅德拉 | 殖群甲壳：生命＋60%、生命护甲＋10、每秒恢复最大生命3%；半径12。 |
| 利维坦 | 母巢律动：攻击＋20%、攻速＋60%、生命/原生盾＋20%、生命/盾护甲＋30%、移动＋25%；全队生物。 |
| 阿塔尼斯 | 达拉姆圣盾：原生盾上限＋60%、盾护甲＋10、生命护甲＋6、承受敌伤降低40%；半径12。 |
| 泽拉图 | 虚空裂隙：受到武器伤害＋60%、正生命/盾护甲－65%、已有百分比减伤相对降低30%；半径10，Boss完整。 |
| 阿拉纳克 | 高阶压制：敌武器伤害－45%、攻速－40%、移动－45%；半径10，Boss完整生效。 |
| 菲尼克斯 | 净化武库：攻击＋60%、攻速＋25%、生命＋25%、原生盾＋40%、生命/盾护甲＋30%、移动＋25%；全队机械。 |
| 沃拉尊 | 暗影迟滞：敌攻速－50%、武器伤害－30%、移动－50%；半径10，Boss完整生效。 |
| 净化者旗舰 | 矩阵共鸣：攻击＋30%、攻速＋50%、生命＋25%、原生盾＋50%、生命护甲＋30%、盾护甲＋40%、移动＋25%；全队原生盾友军。 |

游戏中显示足下效果，隐藏光环文字；此参考文档保留数值。身份相同取最强，不同英雄合格属性可相加；精英共享池取最强。永久身体、范围、来源存活、可见性、原生盾与生物/机械资格分别核对，真实子体只经母体继承一次；池变化保持伤损比例。

| 两族英雄配置ID | 当前队伍配置（执行器还实施资格、时钟与实际生命上限） |
| --- | --- |
| kerrigan | {"effectName":"刀锋意志","kind":"buff","radius":null,"stats":{"damage":0.5,"speed":0.3,"maxHp":0.35,"maxShield":0.35,"armorPct":0.3,"shieldArmorPct":0.3,"move":0.25}} |
| zagara | {"effectName":"虫群围压","kind":"debuff","radius":10,"stats":{"attackSlow":0.45,"weaponSuppression":0.3,"moveSlow":0.5},"bossControlScale":1} |
| dehaka | {"effectName":"原始威慑","kind":"debuff","radius":9,"stats":{"weaponSuppression":0.5,"attackSlow":0.35,"moveSlow":0.45},"bossControlScale":1} |
| stukov | {"effectName":"感染破绽","kind":"debuff","radius":10,"stats":{"vulnerability":0.45,"healingSuppression":0.5},"plague":{"ordinaryMaxHpPerSecond":0.06,"eliteMaxHpPerSecond":0.03,"bossMaxHpPerSecond":0.012,"period":1,"firstPulse":1}} |
| niadra | {"effectName":"殖群甲壳","kind":"buff","radius":12,"stats":{"maxHp":0.6,"armorFlat":10,"regenHpPerSecond":0.03}} |
| hots_leviathan | {"effectName":"母巢律动","kind":"buff","radius":null,"stats":{"damage":0.2,"speed":0.6,"maxHp":0.2,"maxShield":0.2,"armorPct":0.3,"shieldArmorPct":0.3,"move":0.25}} |
| artanis | {"effectName":"达拉姆圣盾","kind":"buff","radius":12,"stats":{"maxShield":0.6,"shieldArmorFlat":10,"armorFlat":6,"damageReduction":0.4}} |
| zeratul | {"effectName":"虚空裂隙","kind":"debuff","radius":10,"stats":{"vulnerability":0.6,"armorReduction":0.65,"defenseReduction":0.3}} |
| alarak | {"effectName":"高阶压制","kind":"debuff","radius":10,"stats":{"weaponSuppression":0.45,"attackSlow":0.4,"moveSlow":0.45},"bossControlScale":1} |
| fenix | {"effectName":"净化武库","kind":"buff","radius":null,"stats":{"damage":0.6,"speed":0.25,"maxHp":0.25,"maxShield":0.4,"armorPct":0.3,"shieldArmorPct":0.3,"move":0.25}} |
| vorazun | {"effectName":"暗影迟滞","kind":"debuff","radius":10,"stats":{"attackSlow":0.5,"weaponSuppression":0.3,"moveSlow":0.5},"bossControlScale":1} |
| purifier_flagship | {"effectName":"矩阵共鸣","kind":"buff","radius":null,"stats":{"damage":0.3,"speed":0.5,"maxHp":0.25,"maxShield":0.5,"armorPct":0.3,"shieldArmorPct":0.4,"move":0.25}} |

## 当前规则：90款唯一精英

每个家族同时最多一个精英身份，占一个普通名额；精英跳虫为一对两只身体；同局锁定一种变体。90项只读取三族正式精英规则与当前团队光环；旧模板、重复倍率和旧显示标签已删除。参数JSON来自运行源码，原设计JSON从不作为运行导入。

| ID | 名称 | 家族 | 机体 | 核心机制与当前队伍覆盖 | 机体/专属基础参数 | 模型ID |
| --- | --- | --- | --- | --- | --- | --- |
| marine.1 | 金属风暴 | 陆战队员 | assault | 持续开火在5秒内预热至4倍攻速，满速压制10秒后停火排热2秒。轻甲伤害×1.6，移动速度略降。 | {"moveFactor":0.9,"warmupSeconds":5,"attackSpeedIncrease":3,"maximumSeconds":10,"forcedCoolingSeconds":2,"lightDamageFactor":1.6} | elite.marine.1 |
| marine.2 | 精英杀手 | 陆战队员 | precision | 蓝色穿甲弹对精英造成3倍伤害、对Boss造成5倍伤害。I–V级闪避直接普通攻击的概率为12%／16%／20%／24%／28%。 | {"eliteDamageFactor":3,"bossDamageFactor":5,"dodgeByRank":[0.12,0.16,0.2,0.24,0.28]} | elite.marine.2 |
| marine.3 | 战场指挥官 | 陆战队员 | bulwark | 全队普通与精英陆战队员的生命、护盾、武器伤害、攻速、移速和护甲提高20%；同类指挥加成只生效一次。 | {"familyAttributeIncrease":0.2,"auraRadius":null} | elite.marine.3 |
| reaper.1 | 午夜死神 | 死神 | mobile | 每次攻击连续射出6发高速子弹，对轻甲造成1.8倍伤害；子弹逐发命中。 | {"shotsPerCycle":6,"lightDamageFactor":1.8,"moveFactor":1.4} | elite.reaper.1 |
| reaper.2 | 大枪管 | 死神 | precision | 进入战斗后的前10轮攻击强化至3倍伤害，重甲伤害额外×1.5；命中向周围2.6范围溅射50%伤害。脱战2秒重置。 | {"openingCycles":10,"openingDamageFactor":3,"splashFraction":0.5,"splashRadius":2.6,"armoredDamageFactor":1.5,"outOfCombatSeconds":2} | elite.reaper.1 |
| reaper.3 | 孤星猎手 | 死神 | bulwark | 死神家族仅保留这一名永久战士；吸收其余死神与后续送达死神，按军衔和精英身份积累成长。伤害、生命、护甲增长逐渐趋缓，上限分别为基础的4倍、5倍和额外10点护甲。其他兵种与英雄照常保留。 | {"familyOnly":true,"absorbAttributesOnly":true,"growthK":20,"dpsAsymptoteFactor":4,"hpAsymptoteFactor":5,"armorAsymptoteAdd":10} | elite.reaper.1 |
| hellion.1 | 长炎 | 恶火 | assault | 火焰射程提高至4倍，沿窄幅直线灼烧地面目标；对轻甲造成1.8倍伤害。恶蝠形态同样延长火焰攻击距离。 | {"lengthIncrease":3,"lightDamageFactor":1.8,"widthFactor":1,"attackRangeFactor":4} | elite.hellion.1 |
| hellion.2 | 地狱骑士 | 恶火 | assault | 火焰射程提高至2倍，覆盖前方150°扇面；对轻甲造成1.8倍伤害。恶蝠形态保留扇面喷火。 | {"fanDegrees":150,"lengthIncrease":1,"lightDamageFactor":1.8,"attackRangeFactor":2} | elite.hellion.2 |
| hellion.3 | 布雷车 | 恶火 | mobile | 每12秒部署2枚大型追踪雷，最多保留8枚；发现6范围内地面敌人后出土并以6速度追击。I级爆炸1200、半径4.2，随后两次每秒180残火；随军衔强化。 | {"minePeriod":12,"mineCount":2,"mineDamageI":1200,"mineRadius":4.2,"fireSeconds":2,"fireDamagePerSecondI":180,"activeMineLimit":8,"chaseSpeed":6,"detectionRadius":6} | elite.hellion.3 |
| marauder.1 | 震撼弹专家 | 劫掠者 | assault | 重型震撼弹在接触区压低敌方攻击速度、移动与攻击伤害。 三项独立状态，同来源刷新；Boss控制强度减半；攻击伤害降低不改固定技能/百分比伤害，不能永久归零。 | {"radius":3.2,"seconds":3,"attackSpeedReduction":0.35,"moveReduction":0.45,"attackDamageReduction":0.3,"bossControlFactor":0.5} | elite.marauder.1 |
| marauder.2 | 破甲精英 | 劫掠者 | precision | 范围穿甲榴弹削弱敌人护甲，为全队打开重甲目标。 百分比作用于正护甲，不把护甲压成负数；来源同类取强值；原生盾甲按同样比例，生命/盾减伤分开。 | {"radius":3,"armorReductionByRank":[0.4,0.45,0.5,0.55,0.6],"seconds":5} | elite.marauder.2 |
| marauder.3 | 拒绝者 | 劫掠者 | bulwark | 每周期三枚小范围榴弹组成弹幕，命中有机会推开冲锋者。 一次周期最多推同敌一次；按合法路径推，墙边缩短；Boss/领主免位移改短减速；无递归反弹。 | {"shells":3,"packetFraction":0.65,"radius":2,"knockbackChance":0.35,"knockbackDistance":2,"knockbackInternalSeconds":1,"bossMoveReduction":0.2,"bossSlowSeconds":1} | elite.marauder.3 |
| tank.1 | 豹石 | 攻城坦克 | mobile | 保持机动时仍使用攻城炮，保留原生攻城弹与溅射；不能切换至驻扎形态，仍受攻城炮最小射程限制。 | {"weaponMode":"siege","moveFactor":1.3,"canFireMoving":true,"hasSiegeToggle":false} | elite.tank.1 |
| tank.2 | 虎式 | 攻城坦克 | precision | 驻扎后攻击速度和炮弹伤害均提高至2倍，射程提高至3倍；移动形态保留机动，但不发射攻城炮。 | {"weaponMode":"siege","siegeDamageIncrease":1,"siegeAttackSpeedIncrease":1,"siegeRangeIncrease":2,"canFireMoving":false} | elite.tank.2 |
| tank.3 | 毁灭者 | 攻城坦克 | precision | 驻扎炮击的爆炸面积扩大至5倍，原有各档溅射伤害保留；爆点1秒后造成一次50%炮击伤害的残火，同一炮手的残火对同一目标每秒最多一次。 | {"weaponMode":"siege","blastIncrease":4,"blastInterpretation":"AREA_USER_CONFIRMED","fireSeconds":1,"fireDamageFraction":0.5,"blastAreaFactor":5,"blastRadiusFactor":2.23606797749979} | elite.tank.3 |
| thor.1 | 雷霆支点 | 雷神 | bulwark | 每第3轮对地攻击引发4范围震击，额外造成2倍本轮伤害并减速40%持续2秒，Boss减速减半。6范围永久机械友军额外获得4护甲。 | {"quakeEveryCycles":3,"quakeDamageFraction":2,"quakeRadius":4,"enemyMoveReduction":0.4,"slowSeconds":2,"allyArmorAdd":4,"allyRadius":6} | elite.thor.1 |
| thor.2 | 天罚炮台 | 雷神 | precision | 对重甲空军造成3倍伤害，命中向3范围其他空军溅射60%；连续锁定同一空中目标3秒后攻速翻倍，换目标或脱战后重新锁定。 | {"airArmoredDamageFactor":3,"lockSeconds":3,"lockAttackSpeedIncrease":1,"splashFraction":0.6,"splashRadius":3} | elite.thor.1 |
| thor.3 | 末日过载 | 雷神 | assault | 持续交战4秒蓄力后进入8秒过载，武器伤害提高至3倍；随后4秒冷却，再次循环。换目标不会跳过蓄力。 | {"chargeSeconds":4,"overdriveSeconds":8,"overdriveDpsFactor":3,"coolingSeconds":4,"coolingDpsFactor":1,"moveFactor":0.8} | elite.thor.1 |
| viking.1 | 苍穹猎鹰 | 维京 | mobile | 首次对空攻击追加一对导弹，合计额外造成150%单发伤害；连续攻击同一空军每轮增加35%伤害，最多5层，换目标清除层数。 | {"lockStacks":5,"damagePerStack":0.35,"openingMissileFraction":1.5,"moveFactor":1.25} | elite.viking.1 |
| viking.2 | 钢铁落锤 | 维京 | bulwark | 真实降落完成后造成4范围冲击，I级伤害1600、冷却12秒；地面形态武器伤害翻倍，额外获得5护甲。受阻时等待落点腾出。 | {"landingDamageI":1600,"landingRadius":4,"landingCooldown":12,"assaultDpsFactor":2,"assaultArmorAdd":5} | elite.viking.1 |
| viking.3 | 双相王牌 | 维京 | assault | 真实形态转换完成后强化下10轮攻击至2.5倍，并获得相当于最大生命35%的6秒有限屏障；共用14秒触发冷却。 | {"empoweredCycles":10,"empoweredDpsFactor":2.5,"barrierMaxHp":0.35,"barrierSeconds":6,"triggerCooldown":14} | elite.viking.1 |
| banshee.1 | 报丧女妖 | 女妖 | support | 8范围内可见敌人的正护甲降低40%，已有减伤效果相对降低25%；不会消除免疫或有限屏障。 | {"radius":8,"armorReduction":0.4,"defenseReduction":0.25} | elite.banshee.1 |
| banshee.2 | 瘟疫女妖 | 女妖 | support | 7范围持续污染敌方战斗单位，每秒按进入范围时的最大生命造成3%／3.5%／4%／4.5%／5%伤害；敌精英减半，Boss与领主仅承受五分之一。 | {"radius":7,"ordinaryMaxHpPerSecondByRank":[0.03,0.035,0.04,0.045,0.05],"eliteMaxHpPerSecondFactor":0.5,"bossMaxHpPerSecondFactor":0.2,"secondsPerPulse":1} | elite.banshee.1 |
| banshee.3 | 振奋女妖 | 女妖 | mobile | 脱战2秒后为下次交战蓄能，8秒蓄满；I级满蓄能造成5范围2600伤害，随军衔强化。脱战期间永久战斗友军移动速度提高30%。 | {"teamMoveIncrease":0.3,"chargeSeconds":8,"chargeMaximumI":2600,"blastRadius":5,"outOfCombatSeconds":2} | elite.banshee.1 |
| medivac.1 | 战场女武神 | 医疗运输机 | bulwark | 治疗一个伤员；8范围永久战斗友军生命提高35%，额外获得5护甲。同类指挥加成只生效一次，进出范围保持生命比例。 | {"radius":8,"allyHpIncrease":0.35,"allyArmorAdd":5} | elite.medivac.1 |
| medivac.2 | 精英救护 | 医疗运输机 | support | 同时用医疗束治疗最多5名伤员，优先照顾生命比例最低者。治疗生物单位为全效，机械单位为三分之一；按实际恢复消耗能量。 | {"healTargets":5,"range":8,"energyPerActualHealFactor":1} | elite.medivac.2 |
| medivac.3 | 微光护盾 | 医疗运输机 | support | 治疗一个伤员；伤员最近2秒开火或受伤时，每实际恢复1生命额外生成1.2有限屏障，最高为其最大生命50%，持续6秒。 | {"shieldPerEffectiveHealFraction":1.2,"shieldMaxTargetHpFraction":0.5,"shieldSeconds":6,"range":8,"combatEntry":"EFFECTIVE_HEAL_TO_ALLY_ATTACKING_OR_ENEMY_DAMAGED_WITHIN_2_SECONDS"} | elite.medivac.3 |
| science_vessel.1 | 铁幕研究员 | 科技球 | support | 以绿色纳米迷雾修复最多3名伤员。每实际恢复1生命额外生成1.5有限屏障，最高为伤员最大生命60%，持续7秒；机械单位全效、生物单位三分之一。 | {"repairTargets":3,"range":8,"barrierPerEffectiveRepair":1.5,"barrierMaxHp":0.6,"barrierSeconds":7} | elite.science_vessel.1 |
| science_vessel.2 | 辐照工程师 | 科技球 | support | 纳米迷雾修复最多2名伤员；每10秒对8范围生物敌人施加6秒辐照，I级每秒对3范围生物敌人造成380伤害，随军衔强化，辐照跟随宿主。 | {"radiationCooldown":10,"radiationSeconds":6,"radiationDpsI":380,"radiationRadius":3,"repairTargets":2,"range":8} | elite.science_vessel.1 |
| science_vessel.3 | 磁脉冲主宰 | 科技球 | support | 纳米迷雾修复最多3名伤员；每14秒释放5范围EMP，I级削去最多2400护盾并抽掉60%当前能量，随军衔强化护盾伤害。敌方攻速降低30%持续4秒，Boss减半；无护盾时不会转为生命伤害。 | {"empCooldown":14,"empRadius":5,"shieldDamageI":2400,"energyDrainFraction":0.6,"attackSpeedReduction":0.3,"debuffSeconds":4,"repairTargets":3,"range":8} | elite.science_vessel.1 |
| zergling.1 | 裂爪狂潮 | 跳虫 | assault | 双身体交替撕咬；连续出手逐层叠加狂潮，打出远超普通虫群的近战密度。 两个真实身体共享狂潮层数，各自武器周期；不复制第三身体；幸存再生仍按900步。 | {"stacks":8,"attackSpeedPerStack":0.3,"stackExpireSeconds":2,"lightDamageFactor":1.5} | elite.zergling.1 |
| zergling.2 | 噬甲獠牙 | 跳虫 | precision | 双身体同一周期连续命中后撕裂护甲，第三次啃咬释放处决伤害。 按身体真实周期计数；处决替换该次伤害，非额外四击；Boss可破甲不能秒杀，不打空军。 | {"armorReduction":0.5,"armorSeconds":4,"finisherEveryCycles":3,"finisherDamageFactor":4,"armoredDamageFactor":1.6} | elite.zergling.1 |
| zergling.3 | 共生血巢 | 跳虫 | bulwark | 双身体分摊伤害，攻击吸收养分；一体存活维持另一体再生。 分摊不能回环；按有效生命伤吸血，不能吸盾/无敌；900步保留，任一体都死仍丧失名额。 当前队伍项覆盖：全队跳虫攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。 | {"sharedDamageFraction":0.5,"lifeStealFraction":0.25,"survivorRegrowSteps":900,"regrowHpFraction":0.6} | elite.zergling.1 |
| baneling.1 | 灾厄酸核 | 爆虫 | assault | 自爆伤害三倍、酸爆覆盖扩展，爆后存活但停顿五秒。 仅玩家爆虫存活；停顿不能通过升级/读档跳过；酸爆一次，无法对空，不把爆炸当免费技能连发。 | {"explosionDamageFactor":3,"radiusFactor":1.8,"postExplosionStopSeconds":5} | elite.baneling.1 |
| baneling.2 | 腐土播种者 | 爆虫 | precision | 爆心留下腐土，五秒休眠期间继续侵蚀范围内地面敌军。 腐土逐秒按实在范围敌人结算，同源取强值；Boss允许固定伤害，无永久百分比蒸发。 | {"explosionDamageFactor":2,"acidGroundSeconds":5,"acidDpsI":420,"acidRadius":4,"postExplosionStopSeconds":5} | elite.baneling.1 |
| baneling.3 | 甲壳反应堆 | 爆虫 | bulwark | 受到攻击积累酸压，爆炸释放储压并把部分威力变成自身再生。 只积累实际承受敌伤，不收无敌阻止量/友伤；储压一次消费，固定上限可被击杀，爆后同样停五秒。 | {"storedDamageFraction":0.5,"storedDamageMaxHpFraction":2,"explosionDamageFactor":1.8,"healMaxHpFraction":0.35,"postExplosionStopSeconds":5} | elite.baneling.1 |
| roach.1 | 深壳堡垒 | 蟑螂 | bulwark | 血量越低甲壳越硬，濒危时自动钻地短时修复后出土。 自动钻地为明确新变体行为；受侦测仍可被击杀，钻地不攻击；不取消指令或无限躲避Boss。 | {"lowHpThreshold":0.35,"lowHpArmorAdd":8,"burrowSeconds":3,"burrowCooldown":18,"burrowHealMaxHpPerSecond":0.12} | elite.roach.1 |
| roach.2 | 穿甲酸喉 | 蟑螂 | precision | 同目标连续酸击逐层软化重甲，第六发喷出高浓酸。 六发循环，转火清酸层；高浓酸替换第六发主伤，不把层数和四倍再无限相乘。 | {"stacks":5,"damagePerStack":0.3,"burstEveryCycles":6,"burstDamageFactor":4,"burstRadius":2.5} | elite.roach.1 |
| roach.3 | 反噬菌甲 | 蟑螂 | assault | 受到近战攻击反射腐蚀，攻击命中后再生增强，成为能输出的生体前线。 反伤以实际受伤包为基数，无递归；只反近战敌人，不能让远程或空军无成本受伤。 | {"retaliationDamageFraction":0.6,"retaliationRadius":2,"retaliationInternalSeconds":0.5,"attackRegenMaxHpPerSecond":0.04,"regenSeconds":4} | elite.roach.1 |
| ravager.1 | 连囊炮手 | 破坏者 | assault | 胆汁技能一次投出三枚，沿同一目标区域分段砸落。 三枚独立预警/落点，重叠允许三次实际伤害；仍需原胆汁技能解锁，不把普攻重复当技能。 | {"bileCount":3,"bilePacketFraction":1,"bileInterval":0.3,"bileCooldownFactor":0.75,"bileBaseDamageI":1200,"bileBaseCooldown":12} | elite.ravager.1 |
| ravager.2 | 破城酸星 | 破坏者 | precision | 胆汁变为超重酸星，对重甲/建筑增伤并短时降低正护甲。 胆汁冷却不缩；体积与延迟保留，建筑/重甲倍率取一次；不是打Boss生命百分比。 | {"bileDamageFactor":4,"bileRadiusFactor":1.5,"armoredAndBuildingDamageFactor":1.5,"armorReduction":0.5,"armorSeconds":5,"bileBaseDamageI":1200,"bileBaseCooldown":12} | elite.ravager.1 |
| ravager.3 | 腐蚀雨幕 | 破坏者 | support | 胆汁落点形成六秒酸雨，侵蚀并迟滞地面密集敌群。 本机雨区重叠取强值，敌人离区即停止收益；普攻对空能力不改变雨区只打地面的边界。 当前队伍项覆盖：半径8持续范围：敌正生命/盾护甲－45%，已有百分比减伤相对降低25%。 | {"rainSeconds":6,"rainRadius":4,"rainDpsI":380,"moveReduction":0.45,"bossMoveReduction":0.2,"bileBaseDamageI":1200,"bileBaseCooldown":12} | elite.ravager.1 |
| hydralisk.1 | 千针风暴 | 刺蛇 | assault | 每周期五根实体骨针形成窄锥，主目标承受全部实际命中骨针。 单周期最多3.5倍主伤；五根针不能各触发一轮五针，地空同原合法层。 | {"needles":5,"needleDamageFraction":0.7,"coneDegrees":35,"rangeAdd":2} | elite.hydralisk.1 |
| hydralisk.2 | 裂甲长棘 | 刺蛇 | precision | 重型骨棘贯穿敌阵，对装甲主目标提高伤害并穿过后排。 首目标全包，后排每敌一次80%；地空贯穿分层，不隔山射击。 | {"armoredDamageFactor":2.5,"pierceLength":12,"pierceWidth":1.2,"secondaryDamageFraction":0.8} | elite.hydralisk.1 |
| hydralisk.3 | 毒囊猎手 | 刺蛇 | support | 主击把毒囊植入敌人，连续植入加强缓释毒伤并在敌人死亡时传播。 每来源最多四层；死亡传播只传播剩余一层且不再传播；Boss不传播，固定毒伤仍可用。 当前队伍项覆盖：每层毒囊附带受到武器伤害＋5%，4层上限＋20%；继发1层仅＋5%。 | {"poisonStacks":4,"poisonSeconds":5,"poisonDpsPerStackI":120,"spreadRadius":4,"spreadTargets":4} | elite.hydralisk.1 |
| queen.1 | 母巢女王 | 虫后 | bulwark | 护育光环提高生物战斗友军生命和再生，自己以厚壳稳住后方。 再生只恢复HP；原45秒注卵与同舱一次保留，不把战斗光环兑换额外免费经济。 当前队伍项覆盖：半径9，生命＋45%、生命护甲＋6、每秒恢复最大生命2%。 | {"radius":8,"allyHpIncrease":0.4,"allyRegenMaxHpPerSecond":0.02,"allyArmorAdd":4} | elite.queen.1 |
| queen.2 | 输血主母 | 虫后 | support | 输血改成多目标连续治疗，救回正在失血的生体阵线。 每个目标实际缺血封顶；消耗原输血能量来源，零能量不空放；机械不可受生物输血。 当前队伍项覆盖：原输血实际恢复后给予6秒：受到生命治疗＋30%，武器实际生命伤吸血15%，每体每秒吸血最多自身最大生命10%。 | {"healTargets":5,"healDpsI":240,"range":8,"channelSeconds":4,"healCooldown":12} | elite.queen.1 |
| queen.3 | 毒巢守卫 | 虫后 | precision | 攻击登记巢毒，受伤友军附近的敌人优先被毒刺压制。 优先级不制造新追敌移动指令；Boss控制减半；不把毒刺封锁写成无限眩晕。 当前队伍项覆盖：半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。 | {"venomDamageFactor":2,"venomMoveReduction":0.5,"venomAttackSpeedReduction":0.3,"venomSeconds":3,"venomRadius":3} | elite.queen.1 |
| lurker.1 | 三脊穿心 | 潜伏者 | assault | 埋地下每周期沿三条扇向释放真实刺脊，中央敌人可被三线交会命中。 需埋地；每条独立交集，未在交会处只中一/两条；不以动画给三倍虚假全场伤害。 | {"spineLines":3,"fanDegrees":40,"lineDamageFactor":1,"pierceLength":12} | elite.lurker.1 |
| lurker.2 | 地裂巨刺 | 潜伏者 | precision | 每第四周期发出超长巨刺，击穿重甲并掀动地面敌人。 巨刺替换该周期；Boss慢速半效、不能掀飞；需地面连通/视线，无空中伤害。 | {"everyCycles":4,"giantDamageFactor":5,"giantLength":18,"giantWidth":2.2,"moveReduction":0.6,"slowSeconds":2} | elite.lurker.1 |
| lurker.3 | 潜巢伏击者 | 潜伏者 | mobile | 埋地转场更快，第一次伏击前三个周期带高额伤害和护壳。 十二秒触发内置冷却，钻出钻入不无限重开；未埋地依旧不能发刺。 | {"burrowTimeFactor":0.4,"openingCycles":3,"openingDamageFactor":4,"barrierMaxHp":0.4,"barrierSeconds":5,"triggerCooldown":12} | elite.lurker.1 |
| mutalisk.1 | 六翼回旋 | 异龙 | assault | 一枚刃虫最多六次反弹，后几跳保持高强度清空散群。 同一敌人最多一次命中；有六个合法邻敌才兑现全部，不把六跳全算单体。 | {"bouncePackets":[1,0.8,0.65,0.5,0.4,0.3],"bounceRadius":5} | elite.mutalisk.1 |
| mutalisk.2 | 绞杀翼群 | 异龙 | precision | 三枚刃虫同时攻击一个目标，反弹削弱但主目标可承受三重绞杀。 三枚各有实际命中，共三倍主包；转火/飞行不能刷弹次，无虚假第四身体。 | {"glaives":3,"mainPacketFraction":1,"bouncePackets":[0.35,0.15],"armoredDamageFactor":1.5} | elite.mutalisk.1 |
| mutalisk.3 | 血羽迁徙 | 异龙 | mobile | 脱战积蓄血羽护壳，进战前三秒高速吸血，随后恢复平常循环。 需要完整储能才最大护壳；进战消耗且不重复叠；吸血只主目标有效生命伤。 当前队伍项覆盖：来源脱战2秒后，全队生物移速＋30%；入战按真实储能比例给半径8内5名其他友军最多15%生命护障，4秒，团队触发间隔12秒。 | {"outOfCombatSeconds":2,"chargeSeconds":6,"barrierMaxHp":0.8,"openingSeconds":3,"openingAttackSpeedIncrease":2,"lifeStealFraction":0.35} | elite.mutalisk.1 |
| corruptor.1 | 蚀空锁喉 | 腐化者 | precision | 对同一空中目标持续喷酸越久越强，最终形成重甲腐蚀锁。 换目标重置充能；无法攻击地面，不能把锁定爆发复制给地面Boss。 | {"lockSeconds":4,"maximumDamageFactor":4,"airArmoredDamageFactor":1.5,"armorReduction":0.45,"armorSeconds":4} | elite.corruptor.1 |
| corruptor.2 | 空巢铁卫 | 腐化者 | bulwark | 护翼光环替附近空中友军承受部分直接敌伤，并靠厚甲支撑空战。 分摊量每秒有自身HP预算，不递归分摊；不是替地面全队无敌，友军真实HP伤先减少才记收益。 当前队伍项覆盖：新半径9属性场：生命/原生盾＋35%、生命/盾护甲＋6、攻速＋25%；原半径7分担继续。 | {"radius":7,"redirectFraction":0.3,"redirectMaxHpPerSecond":0.2,"selfDamageReduction":0.25} | elite.corruptor.1 |
| corruptor.3 | 腐空瘟囊 | 腐化者 | support | 击中空军种下腐空囊，宿主死亡时爆炸并给附近空军补一个毒囊。 排除Boss/领主传播；每来源每目标一囊，继发囊不再传播，地面不受伤。 | {"poisonSeconds":5,"poisonDpsI":260,"deathExplosionI":1800,"deathRadius":4.5,"spreadTargets":3} | elite.corruptor.1 |
| ultralisk.1 | 暴君镰刃 | 雷兽 | assault | 宽镰每第三击释放三倍撕裂，切断轻甲前排。 第三击替换而非额外三击；仍近战到位，不能通过墙/空军；大扇形只命中真实覆盖。 | {"thirdDamageFactor":3,"cleaveDegrees":170,"cleaveRangeFactor":1.8,"lightDamageFactor":1.5} | elite.ultralisk.1 |
| ultralisk.2 | 不灭甲兽 | 雷兽 | bulwark | 满壳承伤积蓄甲盾，跌破生命阈值时消耗盾壳恢复并短暂稳住。 敌人可一次打穿触发阈值；护壳不是复活，冷却保存；不从免伤量储蓄，不永久免疫。 | {"damageStoredFraction":0.4,"storedMaxHpFraction":0.8,"triggerHpThreshold":0.3,"healMaxHpFraction":0.5,"triggerCooldown":25,"damageReduction":0.35,"reductionSeconds":5} | elite.ultralisk.1 |
| ultralisk.3 | 原始踏碎者 | 雷兽 | precision | 短距冲锋结束踩碎地面，随后六秒以双倍攻速追猎重甲。 冲锋沿合法通道、撞墙截断；Boss不被击飞，冲锋不能穿崖/瞬移到落点。 | {"chargeCooldown":12,"chargeDistance":6,"stompDamageI":2200,"stompRadius":4,"attackSpeedIncrease":1,"empoweredSeconds":6,"armoredDamageFactor":1.5} | elite.ultralisk.1 |
| zealot.1 | 誓刃狂徒 | 狂热者 | assault | 双刃连击逐层点燃战意，满层后每第三击扩大为灵能斩面。 两刃仍是一个武器周期；伤害只来自实在斩面，战意两秒无攻击清除；不新增对空。 | {"stacks":6,"attackSpeedPerStack":0.35,"cleaveEveryCycles":3,"cleaveRadius":3,"cleaveFraction":1.5} | elite.zealot.1 |
| zealot.2 | 光盾卫士 | 狂热者 | bulwark | 受敌伤破盾时触发短反击窗口，近战斩击恢复有限原生盾。 只由敌伤击破原生盾触发，临时盾消失不触发；回盾按缺口和每秒预算封顶。 | {"shieldBreakCooldown":14,"retaliationDamageFactor":3,"retaliationSeconds":4,"shieldPerEffectiveDamageFraction":0.35,"shieldRestoreMaxPerSecondFraction":0.15} | elite.zealot.1 |
| zealot.3 | 裂阵先锋 | 狂热者 | mobile | 冲锋触敌时横扫落点，前三个周期每击都撕裂敌阵。 合法冲锋路径、不得隔墙触发；前三次连击是实际攻击周期，冷却不被脱战抹掉。 当前队伍项覆盖：全队狂热者攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。 | {"chargeDamageI":1800,"chargeRadius":3.5,"openingCycles":3,"openingDamageFactor":3,"chargeCooldown":10} | elite.zealot.1 |
| adept.1 | 双相战刃 | 使徒 | assault | 同一周期发出实体刃与延迟相位刃，第二刃击中原落点才伤害。 回响用冻结落点，不凭残像必中；每个原周期一个回响、不递归趣味卡；无法对空。 | {"echoDelay":0.3,"echoDamageFactor":1.5,"lightDamageFactor":1.6} | elite.adept.1 |
| adept.2 | 晨星巡猎 | 使徒 | mobile | 脱战后首个目标承受四周期突袭，随后靠高机动绕开近战。 脱战只按真实开火空窗；不新增必须手动影子切换，不靠攻击动画重置冷却。 | {"outOfCombatSeconds":2,"openingCycles":4,"openingDamageFactor":3,"moveFactor":1.35,"rangeAdd":2} | elite.adept.1 |
| adept.3 | 裂光共振 | 使徒 | precision | 攻击标记敌人，第四次命中令标记爆裂并波及轻甲群。 第五倍包替换第四发主伤，邻敌只吃一包；本机标记不被别家兵反复兑换。 | {"hitsRequired":4,"resonanceDamageFactor":5,"resonanceRadius":3.5,"markSeconds":5} | elite.adept.1 |
| stalker.1 | 虚空连射 | 追猎者 | assault | 持续锁定同一敌人使晶体连射成型，第四周期发射三连主弹。 三弹各真实飞行，共3.6倍该周期；切换不清累计周期但不刷新冷却，地空合法层保持。 | {"burstEveryCycles":4,"burstShots":3,"burstDamageFactor":1.2,"rangeAdd":2} | elite.stalker.1 |
| stalker.2 | 裂隙刺客 | 追猎者 | mobile | 合法闪现后六次武器周期高爆发，并获得有限相位护障。 保留手动闪现与地形校验；无自动传送，无武器/CD刷新；触发有十二秒独立冷却。 | {"empoweredCycles":6,"empoweredDamageFactor":3,"barrierMaxShieldFraction":0.8,"barrierSeconds":5,"triggerCooldown":12} | elite.stalker.1 |
| stalker.3 | 晶棘破甲 | 追猎者 | precision | 晶体弹穿过目标正护甲的一部分，并对重甲形成穿透线。 忽略正护甲为自身包规则，不改变全队敌甲；生命/盾分别算，不能忽略敌伤免疫。 | {"positiveArmorIgnoreFraction":0.7,"armoredDamageFactor":2.5,"pierceLength":10,"secondaryFraction":0.8} | elite.stalker.1 |
| sentry.1 | 光穹织者 | 哨兵 | support | 守护者护盾升级为稳定织盾阵，圈内原生盾持续修复。 实际缺原生盾才恢复，消耗原能量；无原生盾不虚构治疗；与普通守护盾同通道取强值。 当前队伍项覆盖：新增常驻半径9：生命＋20%、原生盾＋40%、生命护甲＋3、盾护甲＋5。 | {"radius":7,"shieldRestorePerSecondI":180,"targets":7,"damageReduction":0.25} | elite.sentry.1 |
| sentry.2 | 静滞监察者 | 哨兵 | support | 每个控制周期短暂停住范围普通敌人，Boss仅降攻速与移速。 敌人停滞期间本稿可受伤；同名停滞仅刷新有限期限，不叠加时长；Boss不完全停止；能源不足不施放。 当前队伍项覆盖：半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。 | {"controlCooldown":14,"controlRadius":4,"ordinaryStasisSeconds":2.5,"bossSlow":0.25} | elite.sentry.1 |
| sentry.3 | 折射惩戒 | 哨兵 | precision | 敌伤被本体护盾实际吸收后储存折射，下一次武器周期释放穿透束。 敌伤经护甲后实际盾损才存入，不能从回盾/无敌无限刷；束伤不再次充能。 | {"storedShieldDamageFraction":0.7,"storedLimitMaxShieldFraction":2,"releaseCooldown":3,"beamLength":10,"beamWidth":1.6} | elite.sentry.1 |
| immortal.1 | 破城判官 | 不朽者 | precision | 反甲双炮越打同一重甲越强，屏障耗尽时下一炮为重判。 重判只一次且不与锁定再多层递归；Boss取合法重甲属性，不把建筑/巨型当重甲。 | {"armoredDamageFactor":3,"lockStacks":4,"damagePerStack":0.25,"barrierBreakNextDamageFactor":1.5} | elite.immortal.1 |
| immortal.2 | 永恒壁垒 | 不朽者 | bulwark | 屏障规模大增，被打破后短时恢复原生盾并保护自身前线位置。 屏障触发沿既有条件，新增破屏反应有独立冷却；有限屏障不等于斯旺无敌。 | {"barrierFactor":4,"barrierBreakShieldRestoreFraction":0.5,"damageReduction":0.3,"reductionSeconds":4,"triggerCooldown":16} | elite.immortal.1 |
| immortal.3 | 引力裁决 | 不朽者 | support | 反甲炮在主目标周围生成短引力区，把地面杂兵收拢给后排清场。 每三秒一个牵引区；合法路径，Boss/领主免拉只减速；对空不生成拉地面效果。 当前队伍项覆盖：半径8：生命/盾护甲＋5，承受直接武器伤害降低15%。 | {"gravityRadius":4,"pullDistance":2,"pullCooldown":3,"splashFraction":0.8} | elite.immortal.1 |
| colossus.1 | 焚天双束 | 巨像 | assault | 双束沿地面持续扫灼，第二秒后把同一目标灼成高热。 高热逐目标计时、离束重置；同源火区不叠，不解除巨像可被对空攻击的弱点。 | {"heatSeconds":2,"maximumDamageFactor":3,"lineWidthFactor":1.8,"fireSeconds":2,"fireDpsI":220} | elite.colossus.1 |
| colossus.2 | 地平线切割 | 巨像 | precision | 射程和切割长度扩大，以窄双束远距贯穿敌人纵队。 射程/长度二倍，宽度变窄；视线障碍仍挡，不从地图外无成本开火。 | {"rangeIncrease":1,"lengthIncrease":1,"armoredDamageFactor":2.5,"widthFactor":0.75} | elite.colossus.1 |
| colossus.3 | 震慑行者 | 巨像 | bulwark | 双束每第四周期释放一次广域震慑，延缓近敌进攻并重构自己护盾。 第四周期额外冲击只一包，Boss控制减半；回盾按缺口，不每个命中敌人恢复一次。 | {"everyCycles":4,"shockDamageFactor":2,"shockRadius":5,"moveReduction":0.5,"attackSpeedReduction":0.3,"seconds":2,"shieldRestoreFraction":0.15} | elite.colossus.1 |
| high_templar.1 | 风暴执政 | 高阶圣堂武士 | precision | 灵能风暴覆盖加大，同一风暴脉冲更密、更强。 总伤只提高2.5倍，更密脉冲分拆该预算，不再乘2；保留能量、前置与合法目标。 | {"stormDamageFactor":2.5,"stormRadiusFactor":1.6,"stormPulsePeriodFactor":0.5,"totalStormDamageMultiplier":2.5,"stormBaseTotalI":1200,"stormBaseCooldown":12} | elite.high_templar.1 |
| high_templar.2 | 反馈先知 | 高阶圣堂武士 | support | 优先抽取消耗敌方能量并转成灵能伤害，额外给高危目标固定反馈。 无能量敌人只受固定包；Boss不凭身份虚构能量，反馈总额冻结消耗一次。 当前队伍项覆盖：反馈实际命中后，受到武器伤害＋25%，持续6秒。 | {"feedbackCooldown":12,"feedbackRadius":4,"energyDamageRatio":6,"fixedFeedbackDamageI":1600,"energyDrainFraction":1} | elite.high_templar.1 |
| high_templar.3 | 静电织网 | 高阶圣堂武士 | support | 每次风暴形成静电织网，圈内敌人攻速降低，友方能量缓慢回流。 不叠同源织网，Boss攻速减半；能量按各自上限，只给既有能量战斗身体。 当前队伍项覆盖：新增半径8持续范围：正生命/盾护甲－45%，已有百分比减伤相对降低25%。 | {"webSeconds":6,"webRadius":5,"attackSpeedReduction":0.4,"allyEnergyPerSecond":6,"allyTargets":7} | elite.high_templar.1 |
| phoenix.1 | 离子六翼 | 凤凰 | assault | 空战每周期发射六枚离子弹，以高速压制轻型空军。 普通为双弹，六枚是三倍周期弹次；没有地面普通武器，引力仍沿合法地面目标。 | {"shotsPerCycle":6,"lightDamageFactor":1.6,"moveFactor":1.2} | elite.phoenix.1 |
| phoenix.2 | 引力狩猎者 | 凤凰 | support | 同时维持两个合法引力目标，悬空目标接受更强己方离子打击。 只对原规则可举目标；Boss/领主不悬空，不能凭举起给建筑开对空射击资格。 | {"gravityTargets":2,"liftSeconds":4,"liftDamageFactor":3,"gravityCooldown":10} | elite.phoenix.1 |
| phoenix.3 | 相位突击翼 | 凤凰 | mobile | 脱战储存一次相位冲击，进战首六周期以三倍离子火力突袭。 六秒脱战储能才护障完整，开火消耗；没有自动闪现/穿墙，无无限护障叠加。 当前队伍项覆盖：来源脱战2秒后，全队原生盾友军移速＋30%；入战按储能比例给半径8内5名其他友军最多20%原生盾护障，6秒，团队触发间隔12秒。 | {"outOfCombatSeconds":2,"openingCycles":6,"openingDamageFactor":3,"barrierMaxShieldFraction":0.75,"chargeSeconds":6} | elite.phoenix.1 |
| void_ray.1 | 棱光处刑舰 | 虚空辉光舰 | precision | 同目标持续束流五秒后进入五倍棱镜处刑。 转火/两秒无合法束流重置；不能把新五倍再乘旧模板同类充能，直接替换。 | {"chargeSeconds":5,"maximumDamageFactor":5,"armoredDamageFactor":1.5,"moveFactor":0.8} | elite.void_ray.1 |
| void_ray.2 | 裂光分束舰 | 虚空辉光舰 | assault | 主束旁分出三条辅助束，同时压制附近其他敌人。 主目标1.5倍，三个不同邻敌各普通主包75%；不对同一目标叠四束，不递归复制束流。 | {"secondaryTargets":3,"secondaryFraction":0.75,"secondaryRadius":5,"mainDamageFactor":1.5} | elite.void_ray.1 |
| void_ray.3 | 能量虹吸舰 | 虚空辉光舰 | bulwark | 束流有效伤害回充自身原生盾，满盾溢出形成有限临时护障。 不吸无敌/未命中包，治疗溢出预算不可再回盾；临时护障不改变原生盾上限。 | {"shieldPerEffectiveDamageFraction":0.3,"shieldPerSecondMaxFraction":0.18,"barrierMaxShieldFraction":0.8,"barrierSeconds":6} | elite.void_ray.1 |
| carrier.1 | 蜂群指挥舰 | 航母 | assault | 八架真实截击机围攻，连续锁定后进入蜂群超载。 每架独立所属身体；只存活出勤子机计火力；数量与攻速四倍峰值，不给母舰假普攻。 | {"interceptors":8,"childAttackSpeedIncrease":1,"overdriveSeconds":6,"overdriveCooldown":18} | elite.carrier.1 |
| carrier.2 | 重矛母舰 | 航母 | precision | 四架截击机改为重型穿甲火力，每第四周期追加一次重矛包。 重矛追加一次已增强主包，单周期峰值九倍对甲；技能强度不从虚假新增模型/轰炸机计算。 | {"interceptors":4,"childDamageFactor":2.5,"childArmoredDamageFactor":1.8,"heavyEveryCycles":4,"heavyPacketFraction":1} | elite.carrier.1 |
| carrier.3 | 圣盾巡航舰 | 航母 | bulwark | 母舰盾损先由有限矩阵分担，所属截击机回收时真实维修重整。 只有实际回到母舰近处且不攻击的子机维修；不满血传送重生，不改变其他航母/英雄所属权。 当前队伍项覆盖：生命＋30%、原生盾＋40%、攻速＋25%、生命/盾护甲＋5，半径10。 | {"parentDamageReduction":0.3,"interceptorHpFactor":2.5,"returnHealPerSecondFraction":0.15,"childDpsFactor":1.5,"repairRange":3} | elite.carrier.1 |

| 机体 | 相对普通V生命 | 相对普通V输出 | 额外护甲I | 移速倍率 | 治疗倍率 |
| --- | --- | --- | --- | --- | --- |
| assault | 1.8 | 1.6 | 3 | 1 | 1 |
| precision | 1.7 | 1.8 | 1 | 1 | 1 |
| bulwark | 3 | 1.5 | 7 | 1 | 1 |
| mobile | 1.9 | 1.6 | 2 | 1.15 | 1 |
| support | 2.4 | 1.5 | 3 | 1 | 3 |

| 军衔 | 输出／治疗成长 | 生命成长 | 额外护甲成长 | 能量倍率 |
| --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 0 | 5 |
| 2 | 1.35 | 1.3 | 0.5 | 6 |
| 3 | 1.7 | 1.6 | 1 | 7 |
| 4 | 2.05 | 1.9 | 1.5 | 8 |
| 5 | 2.4 | 2.2 | 2 | 9 |

I级机体以普通V为基准；以上成长仅描述机体层。专属包、周期、付费子机、有限治疗、技能护障、存储伤害与队伍增益由实际执行器结算一次。精英永久死亡后重招从一级开始，沿用本局已锁定路径。皮肤来源和能力是两个维度，不能据皮肤声称对应原版技能。

| 两族精英配置ID | 当前队伍配置 |
| --- | --- |
| zergling.3 | {"effectName":"血巢号令","kind":"buff","radius":null,"stats":{"damage":0.2,"speed":0.2,"maxHp":0.2,"maxShield":0.2,"armorPct":0.2,"shieldArmorPct":0.2,"move":0.2}} |
| ravager.3 | {"effectName":"腐蚀气溶胶","kind":"debuff","radius":8,"stats":{"armorReduction":0.45,"defenseReduction":0.25}} |
| hydralisk.3 | {"effectName":"毒囊裂隙","kind":"conditional-debuff","radius":null,"stats":{"vulnerabilityPerStack":0.05},"trigger":{"maxStacks":4,"duration":5,"secondaryStacks":1},"rangeMode":"EXISTING_POISON_TARGETS_NOT_GLOBAL_FIELD"} |
| queen.1 | {"effectName":"母巢护育","kind":"buff","radius":9,"stats":{"maxHp":0.45,"armorFlat":6,"regenHpPerSecond":0.02}} |
| queen.2 | {"effectName":"鲜血共生","kind":"conditional-buff","radius":8,"stats":{"receivedHealing":0.3,"weaponLifeLeech":0.15},"trigger":{"duration":6,"leechMaxHpPerSecond":0.1,"requiresEffectiveHpHeal":true,"maxTargets":5}} |
| queen.3 | {"effectName":"巢毒压制","kind":"debuff","radius":8,"stats":{"weaponSuppression":0.3,"attackSlow":0.35,"moveSlow":0.45},"bossControlScale":0.5} |
| mutalisk.3 | {"effectName":"迁徙血羽","kind":"conditional-buff","radius":null,"stats":{"move":0.3},"trigger":{"outOfCombatSeconds":2,"chargeSeconds":6,"entryRadius":8,"maxTargets":5,"barrierMaxHp":0.15,"barrierSeconds":4,"entryCooldown":12}} |
| corruptor.2 | {"effectName":"护翼巢域","kind":"buff","radius":9,"stats":{"maxHp":0.35,"maxShield":0.35,"armorFlat":6,"shieldArmorFlat":6,"speed":0.25}} |
| zealot.3 | {"effectName":"先锋战旗","kind":"buff","radius":null,"stats":{"damage":0.2,"speed":0.2,"maxHp":0.2,"maxShield":0.2,"armorPct":0.2,"shieldArmorPct":0.2,"move":0.2}} |
| sentry.1 | {"effectName":"光穹矩阵","kind":"buff","radius":9,"stats":{"maxHp":0.2,"maxShield":0.4,"armorFlat":3,"shieldArmorFlat":5}} |
| sentry.2 | {"effectName":"静滞力场","kind":"debuff","radius":8,"stats":{"weaponSuppression":0.3,"attackSlow":0.35,"moveSlow":0.45},"bossControlScale":0.5} |
| immortal.3 | {"effectName":"引力护阵","kind":"buff","radius":8,"stats":{"armorFlat":5,"shieldArmorFlat":5,"directWeaponReduction":0.15}} |
| high_templar.2 | {"effectName":"反馈暴露","kind":"conditional-debuff","radius":4,"stats":{"vulnerability":0.25},"trigger":{"duration":6}} |
| high_templar.3 | {"effectName":"离子解构场","kind":"debuff","radius":8,"stats":{"armorReduction":0.45,"defenseReduction":0.25}} |
| phoenix.3 | {"effectName":"相位航路","kind":"conditional-buff","radius":null,"stats":{"move":0.3},"trigger":{"outOfCombatSeconds":2,"chargeSeconds":6,"entryRadius":8,"maxTargets":5,"barrierMaxShield":0.2,"barrierSeconds":6,"entryCooldown":12}} |
| carrier.3 | {"effectName":"圣盾航阵","kind":"buff","radius":10,"stats":{"maxHp":0.3,"maxShield":0.4,"speed":0.25,"armorFlat":5,"shieldArmorFlat":5}} |

虫后输血为有限六秒生命恢复/吸取；入圈护障固定原始额度与冷却；斯托科夫瘟疫冻结入圈最大生命并等待一秒首跳。Boss抑制与硬控免疫按各机制独立执行。

## 当前规则：165个天赋节点

每族资源管理、强化士兵、军队管控各16节点／41可购级，微操7节点／17可购级；四线共用80点玩家等级。每买一级只占1点，资源依层收费。主线第1—7层每级依次1／1／1／2／1／3／5资源；微操依次1／3／3／6／3／6／10资源。主线满额41点／59资源，微操满额17点／64资源。

前置依已批准的逐级节点图校验；上一层最低投入门槛依次为0／2／5／5／3／5／2点。不同种族的对象与效果逐节点独立定义，不把原版三主线替换成新列。

每族三份预设，共九份；只有一个活跃方案实际扣资源。局外按已花金额全额洗点、切换预设；开局冻结当前种族和天赋，读档使用战局快照。英雄与临时单位按逐节点对象规则处理，截击机仅继承母航母明确指定的输出和微操一次。

### 人族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-R01 | SCV救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外2／3／4名SCV；每个救援目标只触发一次；不加目标数量或救援成功率。 |
| 2 | T-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋20%／40%／60%；不乘拾取、过关、退款或永久资源。 |
| 2 | T-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | T-R04 | 节约建材 | 3 | 1／1 | frugal_build | R01满 | 修建及兵种、技能、攻防系统解锁费用−15%／30%／45%；不含后续六次攻防升级。 |
| 3 | T-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | T-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每窗口提供1／2／3次发展与购物共享免费刷新；无基础章免费次数；成功刷新推进共享计数，不结转。 |
| 3 | T-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 修建及解锁购买20%／40%／60%免单；需先有付款资格，不作用后续攻防升级；双建第二座仍付款。 |
| 4 | T-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | T-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每窗口提供1／2次购物免单，可用于普通商品、主组精英和英雄；跨刷新页保留、不结转；不能抵扣精英特约。 |
| 4 | T-R10 | 双倍建造 | 2 | 1／2 | double_build | R07满 | 可重复生产设施购买时30%／60%再建1座并支付第二座完整折后价；两座独立产能；先检查设施上限。 |
| 5 | T-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋15%／30%／45%；不乘永久资源，不对同一关收据重复发。 |
| 5 | T-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | T-R13 | 一次完工 | 3 | 1／1 | instant_tech | R10满 | 每座新设施33%／66%／99%免费完成同路线一个合法项目：标记目标、当前产出技能、攻防系统、较低攻防（同级先武器）、未解锁兵种、其他技能；无合法项目不掷骰。 |
| 6 | T-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | T-R15 | 精英教室 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费兵营枪兵／劫掠者／死神身体20%／40%成为同家族合法紫色精英；不适用工厂／星港；回退规则见5.2。 |
| 7 | T-R16 | 英雄支援 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从雷诺、泰凯斯、诺娃、斯旺、托什中选1名二级英雄免费部署；占三身份中的第一席；不额外给英雄卡。 |

### 人族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-S01 | 高级武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、生命护甲、移速、攻速、合法生命治疗输出各＋7.5%／15%／22.5%；护甲按已有值乘算，不凭空加基础护甲。 |
| 2 | T-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋7.5%／15%／22.5%；不增强技能、治疗或新造弹道。 |
| 2 | T-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少6%／12%／18%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | T-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋7.5%／15%／22.5%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | T-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击7.5%／15%／22.5%暴击；该次普通武器直接伤害×1.75；技能、持续伤害及衍生溅射不暴击。 |
| 3 | T-S06 | 生物护甲 | 3 | 1／1 | bio_shield | S03满 | 生物组获得独立附加盾，上限为修正后最大生命15%／30%／45%；受敌伤后5秒未再受伤，每秒回附加盾上限3%；不恢复生命。 |
| 3 | T-S07 | 经验老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组被一次普通武器攻击命中时4.5%／9%／13.5%闪避该次直接命中；地面预警、技能、范围溅射和持续伤害不能闪避。 |
| 4 | T-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋12%／24%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | T-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | T-S10 | 整备队伍 | 2 | 1／2 | team_share | S07满 | 普通与永久精英身体把最终生命伤害20%／40%均摊给半径8内活着的同家族伙伴；含同家族精英，无伙伴不转移。总伤害不减，详见5.4。 |
| 5 | T-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋15%／30%／45%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | T-S12 | 超级肉 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命＋15%／30%／45%；增加上限保留已损失生命；不提高护盾，不给复活。 |
| 5 | T-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋7.5%／15%／22.5%；与S01、S04同类相加，不让架起坦克移动。 |
| 6 | T-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | T-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命10／18秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | T-S16 | 星际战士 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每消耗5个名额正常付费同家族增援进阶I—V；三方向突击／坚守／机动的逐阶效果及收据见5.5；不是紫色精英，不增加身体。 |

### 人族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-A01 | 熟练部队 | 3 | 1／1 | skilled_troop | 无 | 每名完成救援的普通乘员5%／10%／15%额外升1军衔；付费或免费均可；仍受本人上限及预付款培养容量限制。 |
| 2 | T-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以2%／4%／6%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | T-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀2%／4%／6%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却45战斗秒，详见5.3。 |
| 2 | T-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时5%／10%／15%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | T-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋2／4／6个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | T-A06 | 征召网络 | 3 | 1／1 | conscript_network | A03满 | A03免费普通救援身体最大生命＋15%／30%／45%，作为该身体来源标签保存至死亡；不增强免费守军或付费乘员。 |
| 3 | T-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至70%／85%／100%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | T-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋4／8个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | T-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计240／120秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | T-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | T-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋15%／30%／45%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | T-A12 | 增殖部队 | 3 | 1／1 | proliferate | A09满 | 合格击杀1%／2%／3%生成1名Rank 5临时枪兵或劫掠者；存活30秒，全队同时上限1／2／3；选择和排除见5.6。 |
| 5 | T-A13 | 坦克支援 | 3 | 1／1 | tank_support | A10满 | 每75／50／35秒触发8秒支援，每秒1／2／3道坦克炮击与等量医疗艇治疗；不造实体，精确伤害／治疗／预约见5.7。 |
| 6 | T-A14 | 精英侦察 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个SCV救援目标10%／20%生成1个同族合法精英救援权；R01额外SCV不再各掷骰，无合法对象或容量不掷骰。 |
| 6 | T-A15 | 雇佣兵先生 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每180／90秒召来1名Rank 5临时紫色精英，存活80秒；只从已解锁枪兵／劫掠者／死神中按5.6选；死亡后本周期不补。 |
| 7 | T-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 人族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | T-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋15%／30%／45%；追赶倍率最高1.45，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | T-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋5%／10%／15%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | T-M03 | 技能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G侦测、本族英雄主动、兴奋剂等有计时冷却的手动能力冷却−10%／20%／30%，总冷却倍率最低0.5；模式耗时不算冷却。 |
| 4 | T-M04 | 空投玩家 | 2 | 1／6 | airlift | M03满 | 冷却180／90秒；选择锚点前方合法集结点，准备2秒后搬运本次选中的合法地面战斗组；各单位保伤损命令，不能落地则原位且不耗冷却，见5.8。 |
| 5 | T-M05 | 快速部署 | 3 | 1／3 | quick_siege | M04满 | 坦克架收、恶火/恶蝠、维京、雷神有时长的手动模式切换耗时−33%／66%／99%，最短0.25秒；不自动切换，不缩武器冷却。 |
| 6 | T-M06 | 走A之王 | 2 | 1／6 | stutter_king | M05满 | 战斗组移动瞄准转向速度×1.75／2.5；合法移动开火机会50%／100%；武器原冷却不变，架起坦克不可移动，光束/持续引导不绕过自身锁定。 |
| 7 | T-M07 | 这是APM么 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击额外发射1次115%威力直接命中，合计2次；共用一次冷却和暴击判定；不复制溅射／穿透／弹射／技能／治疗／掉落，见5.9。 |

### 虫族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-R01 | 工蜂救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外2／3／4名工蜂；不增加虫卵、不要求注卵，不复制救援事件。 |
| 2 | Z-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋20%／40%／60%；不乘拾取、过关、退款或永久资源。 |
| 2 | Z-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | Z-R04 | 巢群建材 | 3 | 1／1 | frugal_build | R01满 | 修建及兵种、技能、攻防系统解锁费用−15%／30%／45%；不含后续六次攻防升级。 |
| 3 | Z-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | Z-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每窗口提供1／2／3次发展与购物共享免费刷新；无基础章免费次数；成功刷新推进共享计数，不结转。 |
| 3 | Z-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 修建及解锁购买20%／40%／60%免单；需先有付款资格，不作用后续攻防升级；双建第二座仍付款。 |
| 4 | Z-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | Z-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每窗口提供1／2次购物免单，可用于普通商品、主组精英和英雄；跨刷新页保留、不结转；不能抵扣精英特约。 |
| 4 | Z-R10 | 双生巢群 | 2 | 1／2 | double_build | R07满 | 购买新孵化设施时30%／60%再建1座并支付第二座完整折后价；两座序列与产能独立；不复制唯一科技建筑、巢穴或蜂巢升级。 |
| 5 | Z-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋15%／30%／45%；不乘永久资源，不对同一关收据重复发。 |
| 5 | Z-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | Z-R13 | 成熟巢群 | 3 | 1／1 | instant_tech | R10满 | 每座新设施33%／66%／99%免费完成同路线一个合法项目：标记目标、当前产出技能、攻防系统、较低攻防（同级先武器）、未解锁兵种、其他技能；无合法项目不掷骰。 |
| 6 | Z-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | Z-R15 | 精英孵育 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费基础序列的跳虫／爆虫／蟑螂／虫后身体20%／40%成为合法同家族精英；跳虫双生逐身体判定，爆虫完整配方只判定最终体一次。 |
| 7 | Z-R16 | 虫群领袖 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从凯瑞甘、扎加拉、德哈卡、斯托科夫、妮雅德拉中选1名二级英雄免费部署；占第一英雄身份；菌毯增益仍只应用其固有效果一次。 |

### 虫族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-S01 | 进化武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、生命护甲、移速、攻速、合法治疗输出各＋7.5%／15%／22.5%；治疗含虫后输血及英雄生命治疗，不增强回能或重复乘菌毯。 |
| 2 | Z-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋7.5%／15%／22.5%；不增强技能、治疗或新造弹道。 |
| 2 | Z-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少6%／12%／18%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | Z-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋7.5%／15%／22.5%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | Z-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击7.5%／15%／22.5%暴击；该次普通武器直接伤害×1.75；技能、持续伤害及衍生溅射不暴击。 |
| 3 | Z-S06 | 共生甲壳 | 3 | 1／1 | bio_shield | S03满 | 生物组获得最大生命15%／30%／45%的独立甲壳缓冲；受敌伤5秒后每秒恢复缓冲上限3%；不是生命再生、不能被输血填充，不改蟑螂固有再生。 |
| 3 | Z-S07 | 经验老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组被一次普通武器攻击命中时4.5%／9%／13.5%闪避该次直接命中；地面预警、技能、范围溅射和持续伤害不能闪避。 |
| 4 | Z-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋12%／24%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | Z-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | Z-S10 | 共生分担 | 2 | 1／2 | team_share | S07满 | 普通与永久精英身体的最终生命伤害20%／40%分给半径8内活着同家族伙伴；不同跳虫身体可分担，爆虫自爆不分担；同源伤害只转移一次。 |
| 5 | Z-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋15%／30%／45%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | Z-S12 | 超级肉 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命＋15%／30%／45%；增加上限保留已损失生命；不提高护盾，不给复活。 |
| 5 | Z-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋7.5%／15%／22.5%，与S01/S04同类相加；不使埋地潜伏者移动，不重复应用菌毯倍率。 |
| 6 | Z-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | Z-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命10／18秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | Z-S16 | 原始进化 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每5个名额付费同家族最终进化体进阶I—V；选裂爪／厚甲／迅捷，数值见5.5；不消耗免费虫、不送中间体，爆虫爆后进阶真实丢失。 |

### 虫族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-A01 | 成熟虫群 | 3 | 1／1 | skilled_troop | 无 | 每名救援完成的普通最终体5%／10%／15%额外升1军衔；跳虫按身体分别判定，爆虫／破坏者／潜伏者只在最终体一次判定。 |
| 2 | Z-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以2%／4%／6%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | Z-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀2%／4%／6%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却45战斗秒，详见5.3。 |
| 2 | Z-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时5%／10%／15%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | Z-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋2／4／6个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | Z-A06 | 巢群征召 | 3 | 1／1 | conscript_network | A03满 | A03免费救援虫族最终体最大生命＋15%／30%／45%；不额外赠同批第二跳虫，不把进化前体再当一次免费乘员。 |
| 3 | Z-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至70%／85%／100%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | Z-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋4／8个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | Z-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计240／120秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | Z-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | Z-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋15%／30%／45%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | Z-A12 | 虫群增殖 | 3 | 1／1 | proliferate | A09满 | 合格击杀1%／2%／3%召来1只Rank 5临时跳虫或蟑螂，30秒，同时上限1／2／3身体；不是双生配方，不生成爆虫，不产资源。 |
| 5 | Z-A13 | 胆汁哺育 | 3 | 1／1 | tank_support | A10满 | 每75／50／35秒触发8秒支援，每秒1／2／3次可见地面目标胆汁及同数生命哺育；胆汁预警0.75秒，半径1.5，基础187.5伤害，生命恢复63/次；详见5.7。 |
| 6 | Z-A14 | 巢群侦察 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个工蜂救援目标10%／20%额外获得1个合法本族精英救援权；R01增员不重复抽，既有精英变体锁与容量照常。 |
| 6 | Z-A15 | 原始猎群 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每180／90秒召来1只Rank 5临时紫色精英，80秒；候选为已解锁跳虫／蟑螂／刺蛇，按5.6轮换；不产生永久精英路径、不触发增殖。 |
| 7 | Z-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 虫族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Z-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋15%／30%／45%；追赶倍率最高1.45，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | Z-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋5%／10%／15%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | Z-M03 | 技能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G感知、本族英雄主动及M04地下转移等有计时冷却的手动能力冷却−10%／20%／30%，总倍率最低0.5；不缩自动胆汁/输血冷却或免能量，不改变潜伏埋出耗时。 |
| 4 | Z-M04 | 地下转移 | 2 | 1／6 | airlift | M03满 | 冷却180／90秒，准备2秒；选择锚点前方同一开放区域合法集结点，运送可移动地面战斗组；是天赋转移效果，不赋予全部虫族常驻埋地或隐形，见5.8。 |
| 5 | Z-M05 | 潜伏部署 | 3 | 1／3 | quick_siege | M04满 | 潜伏者手动埋入／钻出耗时−33%／66%／99%，最短0.25秒；埋地完成前不获隐形，不改变攻击周期，不自动钻出解堵。 |
| 6 | Z-M06 | 虫群走A | 2 | 1／6 | stutter_king | M05满 | 移动瞄准×1.75／2.5，合法移动开火机会50%／100%；埋地潜伏者不能移动，跳虫／雷兽近战仍需接触，异龙弹射不多造一跳。 |
| 7 | Z-M07 | 双重猎杀 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击产生2次115%威力直接命中，共用冷却；跳虫/雷兽为第二击动作，异龙只多首跳、潜伏者不复制地刺线，爆虫自爆不复制；详见5.9。 |

### 神族 · 资源管理

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-R01 | 探机救星 | 3 | 1／1 | scv_savior | 无 | 每次成功救援一个工人救援目标，额外2／3／4名探机；不增加救援目标、救援概率或水晶塔供能范围。 |
| 2 | P-R02 | 采集大师 | 3 | 1／1 | mining_master | R01满 | 本族被动矿与气收入分别＋20%／40%／60%；不乘拾取、过关、退款或永久资源。 |
| 2 | P-R03 | 刷新爱好者 | 3 | 1／1 | reroll_fan | R01满 | 每次付费建筑／强化刷新基础矿价−20／40／60，最终最低10矿；完整顺序见3.2。 |
| 2 | P-R04 | 折跃建材 | 3 | 1／1 | frugal_build | R01满 | 修建及兵种、技能、攻防系统解锁费用−15%／30%／45%；不含后续六次攻防升级。 |
| 3 | P-R05 | 高效回收 | 3 | 1／1 | recycle | R02满 | 拾取矿气的实际收入＋25%／50%／75%；对同一拾取对象一次；不增加掉落概率。 |
| 3 | P-R06 | 我就看看 | 3 | 1／1 | window_shop | R03满 | 每窗口提供1／2／3次发展与购物共享免费刷新；无基础章免费次数；成功刷新推进共享计数，不结转。 |
| 3 | P-R07 | 这是谁的房子 | 3 | 1／1 | free_house | R04满 | 修建及解锁购买20%／40%／60%免单；需先有付款资格，不作用后续攻防升级；双建第二座仍付款。 |
| 4 | P-R08 | 清扫战场 | 2 | 1／2 | battlefield_cleaner | R05满 | 矿气资源自动拾取半径为基础2倍／4倍；不改变救援、卡牌拾取、侦测或攻击距离。 |
| 4 | P-R09 | 这次消费免单 | 2 | 1／2 | free_purchase | R06满 | 每窗口提供1／2次购物免单，可用于普通商品、主组精英和英雄；跨刷新页保留、不结转；不能抵扣精英特约。 |
| 4 | P-R10 | 双重折跃 | 2 | 1／2 | double_build | R07满 | 购买传送门／机械台／星门时30%／60%付第二座折后价再建1座，双队列独立；不复制唯一科技建筑。 |
| 5 | P-R11 | 奖金增加 | 3 | 1／1 | bonus_income | R08满 | 关卡结算矿、气奖励分别＋15%／30%／45%；不乘永久资源，不对同一关收据重复发。 |
| 5 | P-R12 | 永久折扣 | 3 | 1／1 | permanent_discount | R09满 | 本局未来矿气购买价−10%／20%／30%；与R04相乘。范围、刷新下限及正价最低1见3.2。 |
| 5 | P-R13 | 折跃整备 | 3 | 1／1 | instant_tech | R10满 | 每座新设施33%／66%／99%免费完成同路线一个合法项目：标记目标、当前产出技能、攻防系统、较低攻防（同级先武器）、未解锁兵种、其他技能；无合法项目不掷骰。 |
| 6 | P-R14 | 出金大师 | 2 | 1／3 | rarity_master | 第1／2级：第五层1／2项满 | 每次合格击杀橙色0.5%／1%、紫色1%／2%，独立于普通掉落；建议各自独立判定并可同次双掉（TAL-D08已批准）；不改卡池或旧选项。 |
| 6 | P-R15 | 圣堂选拔 | 2 | 1／3 | elite_classroom | 第1／2级：第五层2／3项满 | 每名正常付费传送门狂热者／使徒／追猎者／哨兵身体20%／40%成为同家族合法精英；不覆盖高阶圣堂、机械台和星门，不给幻象。 |
| 7 | P-R16 | 达拉姆领袖 | 1 | 1／5 | hero_support | R14满；R15满；第五层≥2项满 | 开局从阿塔尼斯、泽拉图、阿拉纳克、菲尼克斯、沃拉尊中选1名二级英雄免费部署；身份占第一席；保持各自生物／机械属性和先天护盾。 |

### 神族 · 强化士兵

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-S01 | 灵能武装 | 3 | 1／1 | advanced_arms | 无 | 战斗组伤害、最大生命、最大原生护盾、生命/护盾护甲、移速、攻速、合法生命治疗/原生回盾输出各＋7.5%／15%／22.5%；不增强回盾速度或回能。 |
| 2 | P-S02 | 武器升级 | 3 | 1／1 | weapon_upgrade | S01满 | 战斗组普攻直接伤害与已有属性附伤＋7.5%／15%／22.5%；不增强技能、治疗或新造弹道。 |
| 2 | P-S03 | 护甲提升 | 3 | 1／1 | armor_upgrade | S01满 | 战斗组护甲结算后的伤害再减少6%／12%／18%；普攻和技能均受影响；转移伤害不再次减伤。 |
| 2 | P-S04 | 轻量化护甲 | 3 | 1／1 | light_armor | S01满 | 战斗组基础移动速度＋7.5%／15%／22.5%；碰撞半径、模式移动限制与目标层不变。 |
| 3 | P-S05 | 爆头 | 3 | 1／1 | headshot | S02满 | 战斗组每次主武器攻击7.5%／15%／22.5%暴击；该次普通武器直接伤害×1.75；技能、持续伤害及衍生溅射不暴击。 |
| 3 | P-S06 | 护盾织构 | 3 | 1／1 | bio_shield | S03满 | 战斗组最大原生护盾额外增加其修正后最大生命15%／30%／45%的固定盾值；使用本体回盾延迟/速度和护盾护甲，不再生成第二条生物盾，不恢复生命。 |
| 3 | P-S07 | 相位老兵 | 3 | 1／1 | veteran_dodge | S04满 | 战斗组普通攻击直接命中4.5%／9%／13.5%相位闪避；成功时该次不扣生命或原生盾；不闪避预警、范围溅射或持续伤害，不传送位置。 |
| 4 | P-S08 | 快速攻击 | 2 | 1／2 | rapid_attack | S05满 | 战斗组普通攻击速度＋12%／24%；改变攻击周期，不增加技能频率，不清当前武器冷却。 |
| 4 | P-S09 | 爱人的护符 | 2 | 1／2 | lovers_charm | S06满 | 普通组遭遇未被前序保护化解的致死时33%／66%保留1生命；每人每关至多成功1次，不保护英雄、紫色精英、自爆或退役。 |
| 4 | P-S10 | 护盾协防 | 2 | 1／2 | team_share | S07满 | 同家族普通／精英先用各自护盾正常承伤；穿透至生命的剩余伤害20%／40%分给半径8内同家族伙伴的生命，不借伙伴护盾制造二次减伤；详见5.4。 |
| 5 | P-S11 | 大火力 | 3 | 1／1 | big_firepower | S08满 | 战斗组普通武器直接伤害与已有属性附伤再＋15%／30%／45%；与S01、S02同伤害类相加后乘一次；不作用技能。 |
| 5 | P-S12 | 灵能体魄 | 3 | 1／1 | super_meat | S09满 | 战斗组最大生命和原生护盾分别＋10%／20%／30%；替代原节点单独生命＋15%／级，强化神族双层耐久；不加护障吸收值、不当场填盾。 |
| 5 | P-S13 | 长跑冠军 | 3 | 1／1 | marathon | S10满 | 战斗组移动速度再＋7.5%／15%／22.5%，与S01/S04同类相加；不缩冲锋/闪烁冷却，不取消虚空辉光舰引导的移动限制。 |
| 6 | P-S14 | 精英培训 | 2 | 1／3 | elite_training | S11满＋S12满 | 普通组军衔上限由5变6／7；不直接升级，不改变紫色精英或英雄五级上限，所有培养仍经过统一容量检查。 |
| 6 | P-S15 | 死战不退 | 2 | 1／3 | last_stand | S12满＋S13满 | 普通组每关首次未被其他保护化解的致死，维持1生命10／18秒；期间不可治疗、回盾或再次保命，时间到必死；不抵消自爆。 |
| 7 | P-S16 | 圣堂进阶 | 1 | 1／5 | star_warrior | S14满＋S15满 | 军衔≥5普通身体，每5个名额付费同家族身体进阶I—V；选锋刃／圣盾／相位，具体三方向见5.5；航母输出仅向所属截击机传一次。 |

### 神族 · 军队管控

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-A01 | 熟练部队 | 3 | 1／1 | skilled_troop | 无 | 每名完成救援的普通乘员5%／10%／15%额外升1军衔；付费或免费均可；仍受本人上限及预付款培养容量限制。 |
| 2 | P-A02 | 经验总结 | 3 | 1／1 | experience_summary | A01满 | 普通组造成的合格击杀，击杀者以2%／4%／6%概率升1军衔；无容量或已满级不掷骰；与A05/A08汇成一次晋升判定。 |
| 2 | P-A03 | 补充成员 | 3 | 1／1 | reinforcement | A01满 | 每次合格击杀2%／4%／6%生成1名已入编本族家族的免费普通救援乘员；需击败守军；全队成功后冷却45战斗秒，详见5.3。 |
| 2 | P-A04 | 规整部队 | 3 | 1／1 | orderly_army | A01满 | 军衔≥2普通组致死时5%／10%／15%降1级后以新最大生命50%存活；每人每关至多成功1次；不保英雄／精英。 |
| 3 | P-A05 | 战例复盘 | 3 | 1／1 | battle_review | A02满 | 合格普通击杀晋升概率再＋2／4／6个百分点；成功后优先同家族最低军衔合法成员，军衔相同按实体ID；只升一名。 |
| 3 | P-A06 | 折跃征召 | 3 | 1／1 | conscript_network | A03满 | A03免费救援神族身体最大生命和最大原生护盾分别＋15%／30%／45%；仅对有该来源标签的身体生效，不增强其截击机生命；保留已有伤损。 |
| 3 | P-A07 | 荣誉档案 | 3 | 1／1 | honor_archive | A04满 | A04降级存活恢复比例由50%提高至70%／85%／100%新最大生命；不是另外再次治疗，不作用S09/S15。 |
| 4 | P-A08 | 传授经验 | 2 | 1／2 | teach_experience | A05满 | 击杀者家族存在活着的永久紫色精英时，A02/A05合并晋升概率再＋4／8个百分点；临时精英和战术进阶不能充当导师。 |
| 4 | P-A09 | 自我成长 | 2 | 1／2 | self_growth | A06满 | 每累计240／120秒战斗时间，使1名活着且未满5级的永久紫色精英升1级；最低等级优先、ID破同分；无目标该次跳过，不存储次数。 |
| 4 | P-A10 | 寻找精英 | 2 | 1／2 | find_elites | A06满 | 第3/6/9/12/15关、18关胜利后选择无尽整备时及无尽每4轮，额外1／2张付费精英特约；完整事务见3.1，不按钱包过滤。 |
| 5 | P-A11 | 优势部队 | 3 | 1／1 | advantage_army | A08满 | 战斗组武器原有轻甲／重甲／生物等属性附加伤害＋15%／30%／45%；只改bonusDamage项，不乘基础伤害，不创造新克制。 |
| 5 | P-A12 | 折跃援军 | 3 | 1／1 | proliferate | A09满 | 合格击杀1%／2%／3%召来1名Rank 5临时狂热者或使徒，30秒，同时上限1／2／3；不是幻象，不造截击机，不产资源或击杀连锁。 |
| 5 | P-A13 | 热能屏障 | 3 | 1／1 | tank_support | A10满 | 每75／50／35秒触发8秒支援，每秒1／2／3道双段热能线及同数回盾；线长6宽1.2，各段62.5伤害，每目标每道两段；每次回63原生盾、不修生命；详见5.7。 |
| 6 | P-A14 | 探机显迹 | 2 | 1／3 | elite_scout | A10满 | 每成功救出一个探机救援目标10%／20%额外获得1个合法本族精英救援权；不提高主动侦测范围或隐形命中，R01增员不重复掷骰。 |
| 6 | P-A15 | 圣堂卫队 | 2 | 1／3 | mercenary | A11≥1＋A13≥1 | 每180／90秒召来1名Rank 5临时紫色精英，80秒；候选已解锁狂热者／追猎者／不朽者，按5.6轮换；不占永久精英身份、不改变已有变体。 |
| 7 | P-A16 | 扩充队伍 | 1 | 1／5 | expanded_squad | 第五层≥2项满 | 每个普通家族身体上限5→7，精英仍占其家族普通位；5家族和3英雄身份不变，未入编家族预付身体上限同步为7。 |

### 神族 · 微操大师

| 层 | ID | 节点 | 等级上限 | 每级占点／资源 | 语义ID | 节点前置 | 效果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P-M01 | 队伍整齐 | 3 | 1／1 | tidy_squad | 无 | 战斗组落后锚点超过8／6／4距离时追赶移速＋15%／30%／45%；追赶倍率最高1.45，不穿墙、不自动切模式、不打断交火停步。 |
| 2 | P-M02 | 高手射程 | 3 | 1／3 | range_master | M01满 | 战斗组合法普通武器射程＋5%／10%／15%，含近战接敌距离；技能、治疗、最小射程不变，仍检查地形阻隔。 |
| 3 | P-M03 | 灵能回复 | 3 | 1／3 | skill_recovery | M02满 | 推进、G显迹、英雄主动、已解锁手动闪烁和M04召回冷却−10%／20%／30%，总倍率最低0.5；不缩风暴持续时间，不让自动风暴免能量，不缩普攻。 |
| 4 | P-M04 | 战场召回 | 2 | 1／6 | airlift | M03满 | 冷却180／90秒，准备2秒后将选定可移动地面战斗组召回锚点前方合法集结点；保留生命/护盾/冷却/命令，飞行单位不参加；详见5.8。 |
| 5 | P-M05 | 相位部署 | 3 | 1／3 | quick_siege | M04满 | M04战场召回的准备时间从2秒减少33%／66%／99%，结果1.34／0.68／0.25秒；不减少冷却，不为即时闪烁凭空添加前摇。 |
| 6 | P-M06 | 相位走A | 2 | 1／6 | stutter_king | M05满 | 移动瞄准×1.75／2.5，合法移动开火机会50%／100%；虚空辉光舰的持续引导仍按本体锁定要求，不能靠此边移边无限引导；近战仍检查接触。 |
| 7 | P-M07 | 双重齐射 | 1 | 1／10 | apm_master | M06满 | 主武器一次攻击产生2次115%威力直接命中，共用冷却；巨像不复制热能线范围，航母只由截击机继承一次第二发，连续光束每个完整武器周期只追加一次；详见5.9。 |

同属性天赋百分比先相加后乘一次；卡牌同类增量也先相加。A16可把每家族身体上限5提高到7，S14可把普通军衔上限5提高到7，R09提供随机商店免单次数。新订单锁定修正后的价格和时间。

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
| 3 | 1 | 爆虫预警 | 60 | 28 | 23 | 0／5／0 | 跳虫70%、爆虫30% | 132／63 |
| 4 | 2 | 窄口虫群 | 75 | 70 | 70 | 0／0／0 | 跳虫65%、蟑螂20%、爆虫15% | 165／90 |
| 5 | 2 | 重甲侧袭 | 75 | 95 | 95 | 0／0／0 | 跳虫35%、蟑螂40%、刺蛇25% | 165／90 |
| 6 | 2 | 第一主力 | 75 | 125 | 100 | 0／25／0 | 跳虫30%、蟑螂35%、爆虫20%、刺蛇15% | 220／120 |
| 7 | 3 | 地空夹击 | 90 | 150 | 150 | 0／0／0 | 跳虫40%、蟑螂25%、刺蛇20%、异龙15% | 150／97 |
| 8 | 3 | 胆汁火线 | 90 | 170 | 170 | 0／0／0 | 跳虫25%、蟑螂30%、破坏者25%、刺蛇20% | 150／97 |
| 9 | 3 | 虫后支援 | 90 | 190 | 152 | 0／38／0 | 跳虫25%、蟑螂25%、刺蛇25%、虫后15%、异龙10% | 200／131 |
| 10 | 4 | 转型窗口 | 105 | 185 | 185 | 0／0／0 | 跳虫30%、蟑螂25%、刺蛇25%、异龙20% | 120／112 |
| 11 | 4 | 潜伏阵地 | 105 | 230 | 230 | 0／0／0 | 跳虫30%、蟑螂20%、刺蛇25%、潜伏者25% | 120／112 |
| 12 | 4 | 第二主力 | 105 | 285 | 228 | 0／57／0 | 跳虫25%、蟑螂20%、破坏者20%、刺蛇20%、潜伏者15% | 160／151 |
| 13 | 5 | 雷兽冲击 | 120 | 330 | 330 | 0／0／0 | 跳虫25%、蟑螂25%、刺蛇20%、虫后15%、雷兽15% | 127／127 |
| 14 | 5 | 空群混战 | 120 | 370 | 370 | 0／0／0 | 跳虫25%、蟑螂20%、刺蛇20%、异龙20%、腐化者15% | 127／127 |
| 15 | 5 | 支援网络 | 120 | 420 | 336 | 0／84／0 | 跳虫20%、蟑螂20%、破坏者20%、刺蛇20%、虫后20% | 171／171 |
| 16 | 6 | 外巢推进 | 150 | 600 | 600 | 0／0／0 | 跳虫20%、蟑螂20%、破坏者15%、刺蛇20%、潜伏者15%、雷兽10% | 165／142 |
| 17 | 6 | 主巢前哨 | 150 | 660 | 660 | 0／0／0 | 跳虫30%、蟑螂15%、爆虫20%、刺蛇15%、异龙10%、雷兽10% | 165／142 |
| 18 | 6 | 主巢决战 | 150 | 758 | 380 | 0／151／227 | 跳虫20%、蟑螂20%、爆虫10%、破坏者15%、刺蛇15%、潜伏者10%、异龙5%、雷兽5% | 220／191 |

份额是威胁占比，不是身体占比。身体数采用累计余数分配；队长、Boss、主巢和地狱扩张巢占已预留预算，不能重复叠兵。空投守军另按固定关卡／难度表结算。

### 新18关 · 简单

兵量列顺序：跳虫／蟑螂／爆虫／破坏者／刺蛇／虫后／潜伏者／异龙／腐化者／雷兽。表中普通身体来自扣除特殊单位预留后的预算；守军是本关首批基准，连续投放使用累计取整。

| 关 | 秒 | 波次数 | 总预算 | 普通波预算 | 普通兵量 | 预留：队长／Boss／主巢／扩张巢 | 首批守军兵量 | 奖励矿／气 | Drone／虫卵 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | 6 | 3 | 3 | 3／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 1／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 2 | 60 | 6 | 6 | 6 | 6／0／0／0／0／0／0／0／0／0 | 0／0／0／0 | 1／0／0／0／0／0／0／0／0／0 | 99／46 | 4／3 |
| 3 | 60 | 6 | 14 | 12 | 8／0／2／0／0／0／0／0／0／0 | 0／2／0／0 | 2／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 35 | 35 | 23／2／3／0／0／0／0／0／0／0 | 0／0／0／0 | 4／0／0／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 47 | 47 | 17／6／0／0／4／0／0／0／0／0 | 0／0／0／0 | 3／1／0／0／0／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 63 | 51 | 17／6／5／0／2／0／0／0／0／0 | 0／12／0／0 | 2／1／1／0／0／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 75 | 75 | 30／6／0／0／5／0／0／3／0／0 | 0／0／0／0 | 5／1／0／0／0／0／0／0／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 85 | 85 | 23／8／0／5／6／0／0／0／0／0 | 0／0／0／0 | 4／1／0／0／1／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 95 | 76 | 19／7／0／0／6／2／0／2／0／0 | 0／19／0／0 | 3／1／0／0／1／0／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 92 | 92 | 28／8／0／0／8／0／0／4／0／0 | 0／0／0／0 | 5／1／0／0／1／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 115 | 115 | 34／8／0／0／9／0／5／0／0／0 | 0／0／0／0 | 7／1／0／0／2／0／0／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 143 | 115 | 31／7／0／6／7／0／3／0／0／0 | 0／28／0／0 | 5／2／0／1／1／0／0／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 165 | 165 | 41／14／0／0／11／5／0／0／0／2 | 0／0／0／0 | 5／2／0／0／1／1／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 185 | 185 | 46／13／0／0／12／0／0／9／7／0 | 0／0／0／0 | 8／1／0／0／1／0／0／1／1／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 210 | 168 | 35／11／0／8／11／7／0／0／0／0 | 0／42／0／0 | 7／2／0／1／1／1／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 300 | 300 | 60／20／0／12／20／0／8／0／0／2 | 0／0／0／0 | 6／2／0／1／2／0／1／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 330 | 330 | 100／16／33／0／16／0／0／8／0／3 | 0／0／0／0 | 11／2／3／0／2／0／0／1／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 379 | 191 | 39／13／10／7／9／0／3／2／0／1 | 0／75／113／0 | 8／3／2／1／2／0／1／0／0／0 | 220／191 | 3／1 |

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
| 3 | 60 | 6 | 25 | 20 | 14／0／3／0／0／0／0／0／0／0 | 0／5／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 63 | 63 | 41／4／5／0／0／0／0／0／0／0 | 0／0／0／0 | 5／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 86 | 86 | 32／11／0／0／7／0／0／0／0／0 | 0／0／0／0 | 5／1／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 112 | 90 | 27／11／9／0／4／0／0／0／0／0 | 0／22／0／0 | 5／1／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 135 | 135 | 55／11／0／0／9／0／0／5／0／0 | 0／0／0／0 | 6／2／0／0／1／0／0／0／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 153 | 153 | 38／15／0／10／10／0／0／0／0／0 | 0／0／0／0 | 6／2／0／1／1／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 171 | 137 | 35／11／0／0／11／4／0／4／0／0 | 0／34／0／0 | 7／2／0／0／2／1／0／0／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 167 | 167 | 51／14／0／0／14／0／0／8／0／0 | 0／0／0／0 | 8／3／0／0／2／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 207 | 207 | 63／14／0／0／18／0／8／0／0／0 | 0／0／0／0 | 9／2／0／0／3／0／1／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 256 | 205 | 51／14／0／10／14／0／5／0／0／0 | 0／51／0／0 | 10／2／0／1／2／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 297 | 297 | 76／25／0／0／20／10／0／0／0／3 | 0／0／0／0 | 9／4／0／0／3／1／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 333 | 333 | 85／22／0／0／22／0／0／17／12／0 | 0／0／0／0 | 10／3／0／0／3／0／0／2／1／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 378 | 303 | 63／20／0／15／20／12／0／0／0／0 | 0／75／0／0 | 9／3／0／2／3／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 540 | 540 | 108／36／0／21／36／0／14／0／0／4 | 0／0／0／0 | 13／4／0／2／4／0／1／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 594 | 594 | 179／30／59／0／29／0／0／15／0／5 | 0／0／0／0 | 18／4／6／0／3／0／0／2／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 683 | 343 | 69／23／17／13／17／0／6／5／0／1 | 0／136／204／0 | 14／5／4／3／3／0／1／1／0／0 | 220／191 | 3／1 |

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
| 3 | 60 | 6 | 31 | 25 | 17／0／4／0／0／0／0／0／0／0 | 0／6／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 79 | 79 | 52／5／6／0／0／0／0／0／0／0 | 0／0／0／0 | 6／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 108 | 108 | 39／14／0／0／9／0／0／0／0／0 | 0／0／0／0 | 4／2／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 142 | 114 | 35／13／11／0／6／0／0／0／0／0 | 0／28／0／0 | 4／2／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 176 | 176 | 71／15／0／0／12／0／0／6／0／0 | 0／0／0／0 | 9／1／0／0／1／0／0／1／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 201 | 201 | 50／20／0／13／13／0／0／0／0／0 | 0／0／0／0 | 7／2／0／1／2／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 224 | 180 | 45／15／0／0／15／5／0／5／0／0 | 0／44／0／0 | 8／2／0／0／2／1／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 223 | 223 | 68／19／0／0／18／0／0／11／0／0 | 0／0／0／0 | 11／3／0／0／3／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 277 | 277 | 85／19／0／0／23／0／11／0／0／0 | 0／0／0／0 | 13／3／0／0／3／0／1／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 344 | 276 | 70／18／0／14／18／0／7／0／0／0 | 0／68／0／0 | 11／3／0／2／2／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 407 | 407 | 104／34／0／0／27／12／0／0／0／5 | 0／0／0／0 | 14／4／0／0／3／2／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 456 | 456 | 116／30／0／0／30／0／0／23／17／0 | 0／0／0／0 | 13／4／0／0／3／0／0／2／2／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 518 | 415 | 83／28／0／21／28／16／0／0／0／0 | 0／103／0／0 | 11／4／0／3／4／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 756 | 756 | 152／51／0／28／51／0／19／0／0／6 | 0／0／0／0 | 13／5／0／3／5／0／2／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 832 | 832 | 249／42／83／0／41／0／0／21／0／7 | 0／0／0／0 | 25／4／8／0／4／0／0／3／0／0 | 165／142 | 2／1 |
| 18 | 150 | 15 | 955 | 478 | 97／31／24／18／24／0／8／6／0／2 | 0／191／286／0 | 20／6／5／3／4／0／2／1／0／0 | 220／191 | 3／1 |

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
| 3 | 60 | 6 | 31 | 25 | 17／0／4／0／0／0／0／0／0／0 | 0／6／0／0 | 4／0／0／0／0／0／0／0／0／0 | 132／63 | 2／2 |
| 4 | 75 | 8 | 83 | 75 | 50／5／5／0／0／0／0／0／0／0 | 0／0／0／8 | 7／0／1／0／0／0／0／0／0／0 | 165／90 | 2／1 |
| 5 | 75 | 8 | 113 | 102 | 36／14／0／0／8／0／0／0／0／0 | 0／0／0／11 | 4／2／0／0／1／0／0／0／0／0 | 165／90 | 2／2 |
| 6 | 75 | 8 | 148 | 105 | 32／12／11／0／5／0／0／0／0／0 | 0／29／0／14 | 4／2／1／0／1／0／0／0／0／0 | 220／120 | 2／1 |
| 7 | 90 | 9 | 195 | 176 | 71／15／0／0／12／0／0／6／0／0 | 0／0／0／19 | 9／1／0／0／1／0／0／1／0／0 | 150／97 | 2／1 |
| 8 | 90 | 9 | 220 | 198 | 51／20／0／12／13／0／0／0／0／0 | 0／0／0／22 | 8／2／0／1／2／0／0／0／0／0 | 150／97 | 2／2 |
| 9 | 90 | 9 | 246 | 173 | 45／15／0／0／14／5／0／4／0／0 | 0／49／0／24 | 10／2／0／0／2／1／0／1／0／0 | 200／131 | 1／1 |
| 10 | 105 | 11 | 260 | 234 | 72／19／0／0／19／0／0／12／0／0 | 0／0／0／26 | 11／4／0／0／3／0／0／1／0／0 | 120／112 | 2／1 |
| 11 | 105 | 11 | 323 | 291 | 87／20／0／0／24／0／12／0／0／0 | 0／0／0／32 | 13／2／0／0／3／0／2／0／0／0 | 120／112 | 2／1 |
| 12 | 105 | 11 | 400 | 280 | 71／19／0／14／18／0／7／0／0／0 | 0／80／0／40 | 11／3／0／2／3／0／1／0／0／0 | 160／151 | 1／1 |
| 13 | 120 | 12 | 499 | 450 | 112／37／0／0／30／13／0／0／0／6 | 0／0／0／49 | 15／4／0／0／4／2／0／0／0／0 | 127／127 | 2／1 |
| 14 | 120 | 12 | 559 | 504 | 127／34／0／0／33／0／0／25／19／0 | 0／0／0／55 | 14／4／0／0／3／0／0／3／2／0 | 127／127 | 3／1 |
| 15 | 120 | 12 | 635 | 445 | 90／30／0／22／29／18／0／0／0／0 | 0／127／0／63 | 14／5／0／3／4／2／0／0／0／0 | 171／171 | 1／1 |
| 16 | 150 | 15 | 972 | 875 | 176／59／0／33／58／0／22／0／0／7 | 0／0／0／97 | 17／6／0／3／5／0／2／0／0／0 | 165／142 | 3／2 |
| 17 | 150 | 15 | 1070 | 963 | 289／48／97／0／48／0／0／24／0／8 | 0／0／0／107 | 26／4／8／0／4／0／0／2／0／1 | 165／142 | 2／1 |
| 18 | 150 | 15 | 1228 | 493 | 99／33／26／18／25／0／8／6／0／2 | 0／245／368／122 | 20／7／5／4／5／0／2／1／0／0 | 220／191 | 3／1 |

| 章节起始关 | 压力：总量／波次／守军 | 压力：HP／伤害／攻速／移速 | 章节成长：HP／伤害／攻速 |
| --- | --- | --- | --- |
| 1 | 1.2／1.15／1.15 | 1.1／1.05／1／1.05 | 1／1／1 |
| 4 | 1.32／1.24／1.21 | 1.22／1.14／1.06／1.092 | 1.12／1.06／1.03 |
| 7 | 1.44／1.33／1.27 | 1.35／1.23／1.116／1.126 | 1.28／1.13／1.06 |
| 10 | 1.56／1.42／1.33 | 1.5／1.32／1.164／1.144 | 1.52／1.22／1.09 |
| 13 | 1.68／1.51／1.39 | 1.65／1.41／1.208／1.162 | 1.8／1.33／1.14 |
| 16 | 1.8／1.6／1.45 | 1.8／1.5／1.25／1.18 | 2.1／1.45／1.2 |

第18关主巢全程可攻击、阶段切换不回血；提前摧毁停止其攻击与生产，仍需完成150秒时限。通关要求主巢摧毁和时限结束同时满足。第1—17关按时间推进，存活敵人与伤损跨关保留。24关只是后续独立战役接口，不是当前内容。

普通／简单每3关获得1永久资源，困难每3关2资源，地狱每关1资源；完整18关分别6／12／18。无尽每完整60秒战斗按普通／简单1、困难／地狱2资源结算，未新增20分钟领取上限。无尽保留本局资产，每60秒结算300矿／250气并购物，每4轮先发展；四分钟混合波次与经济事件切分为四个窗口，特殊敌人计时连续。

## 当前地图

地图版本 campaign-five-v2，五张地图均为 160×160，三族均从中心（0，0）出发，各关开放净面积相同。新局随机选择并避免与上一局重复；读档保留已选地图和随机种子。

| 地图身份 | 环境 |
| --- | --- |
| industrial | 工业遗址 |
| mar-sara | 玛萨拉荒漠 |
| char | 查尔焦土 |
| ice | 冰封哨站 |
| frontier | 边境矿场 |

## 版本边界

当前战局schema25，永久档案v6。当前新局只运行 mvp-1.0 的三族18关、165节点和单套关间经济。只接收当前格式；旧战局、旧永久档案和旧地图配方直接拒绝，不转换、不提取旧资源。当前档案的导入导出、备份轮换和原子恢复保留。

## 核对命令

```sh
npm run docs:data
npm run docs:check
node tools/build-expansion-unit-data.mjs --check
node tools/build-campaign-science-vessel.mjs --check
```
