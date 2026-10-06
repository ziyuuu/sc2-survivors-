# P4-B · 虫族三十精英正式接入 · 2026-10-05

用户确认恶火地狱骑士修正“可以了”，并明确要求“继续进行虫族的30精英”。本批实现已批准的十个虫族家族、每族三个精英的全部 I–V 身体成长、真实战斗机制、原模型和动作、特效与保存；交付正式完整游戏与共享引擎的独立演示。其余神族精英、普通兵种和趣味卡重做、R7 静态界面的运行时替换不属于本批。

## 数值约定

明确运行时数据位于 `src/data/zerg-elites.ts`，30个身份、名称、身体预设和参数与批准 P4 快照逐项对应。游戏不导入 P0/P4 文档 JSON。按普通 V 级身体为基准，伤害、固定伤害和修复采用 1+.35×(rank−1)，生命采用 1+.30×(rank−1)，护甲每级额外增加 .5；既有玩家1.15、科技、卡牌、天赋只各应用一次。五个原批准身体预设如下：

| 身体预设 | 生命系数 | 输出系数 | 额外护甲 | 移速系数 | 修复系数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| assault | 1.8 | 1.6 | 3 | 1 | 1 |
| precision | 1.7 | 1.8 | 1 | 1 | 1 |
| bulwark | 3 | 1.5 | 7 | 1 | 1 |
| mobile | 1.9 | 1.6 | 2 | 1.15 | 1 |
| support | 2.4 | 1.5 | 3 | 1 | 3 |

保留原武器条件加成、正护甲/原生护盾/有限屏障和真实生命损失链。更换目标、发射、抵达、实际死亡与显式退役是不同事件；衍生弹体不再增加主攻击周期。以下参数为批准值，其中固定金额字段为 I 级，其他级别按固定成长冻结。

## 全部三十身份

| ID · 名称 | 身体预设 | 批准参数 |
| --- | --- | --- |
| `zergling.1` · 裂爪狂潮 | assault | stacks=8；attackSpeedPerStack=0.3；stackExpireSeconds=2；lightDamageFactor=1.5 |
| `zergling.2` · 噬甲獠牙 | precision | armorReduction=0.5；armorSeconds=4；finisherEveryCycles=3；finisherDamageFactor=4；armoredDamageFactor=1.6 |
| `zergling.3` · 共生血巢 | bulwark | sharedDamageFraction=0.5；lifeStealFraction=0.25；survivorRegrowSteps=900；regrowHpFraction=0.6 |
| `baneling.1` · 灾厄酸核 | assault | explosionDamageFactor=3；radiusFactor=1.8；postExplosionStopSeconds=5 |
| `baneling.2` · 腐土播种者 | precision | explosionDamageFactor=2；acidGroundSeconds=5；acidDpsI=420；acidRadius=4；postExplosionStopSeconds=5 |
| `baneling.3` · 甲壳反应堆 | bulwark | storedDamageFraction=0.5；storedDamageMaxHpFraction=2；explosionDamageFactor=1.8；healMaxHpFraction=0.35；postExplosionStopSeconds=5 |
| `roach.1` · 深壳堡垒 | bulwark | lowHpThreshold=0.35；lowHpArmorAdd=8；burrowSeconds=3；burrowCooldown=18；burrowHealMaxHpPerSecond=0.12 |
| `roach.2` · 穿甲酸喉 | precision | stacks=5；damagePerStack=0.3；burstEveryCycles=6；burstDamageFactor=4；burstRadius=2.5 |
| `roach.3` · 反噬菌甲 | assault | retaliationDamageFraction=0.6；retaliationRadius=2；retaliationInternalSeconds=0.5；attackRegenMaxHpPerSecond=0.04；regenSeconds=4 |
| `ravager.1` · 连囊炮手 | assault | bileCount=3；bilePacketFraction=1；bileInterval=0.3；bileCooldownFactor=0.75；bileBaseDamageI=1200；bileBaseCooldown=12 |
| `ravager.2` · 破城酸星 | precision | bileDamageFactor=4；bileRadiusFactor=1.5；armoredAndBuildingDamageFactor=1.5；armorReduction=0.5；armorSeconds=5；bileBaseDamageI=1200；bileBaseCooldown=12 |
| `ravager.3` · 腐蚀雨幕 | support | rainSeconds=6；rainRadius=4；rainDpsI=380；moveReduction=0.45；bossMoveReduction=0.2；bileBaseDamageI=1200；bileBaseCooldown=12 |
| `hydralisk.1` · 千针风暴 | assault | needles=5；needleDamageFraction=0.7；coneDegrees=35；rangeAdd=2 |
| `hydralisk.2` · 裂甲长棘 | precision | armoredDamageFactor=2.5；pierceLength=12；pierceWidth=1.2；secondaryDamageFraction=0.8 |
| `hydralisk.3` · 毒囊猎手 | support | poisonStacks=4；poisonSeconds=5；poisonDpsPerStackI=120；spreadRadius=4；spreadTargets=4 |
| `queen.1` · 母巢女王 | bulwark | radius=8；allyHpIncrease=0.4；allyRegenMaxHpPerSecond=0.02；allyArmorAdd=4 |
| `queen.2` · 输血主母 | support | healTargets=5；healDpsI=240；range=8；channelSeconds=4；healCooldown=12 |
| `queen.3` · 毒巢守卫 | precision | venomDamageFactor=2；venomMoveReduction=0.5；venomAttackSpeedReduction=0.3；venomSeconds=3；venomRadius=3 |
| `lurker.1` · 三脊穿心 | assault | spineLines=3；fanDegrees=40；lineDamageFactor=1；pierceLength=12 |
| `lurker.2` · 地裂巨刺 | precision | everyCycles=4；giantDamageFactor=5；giantLength=18；giantWidth=2.2；moveReduction=0.6；slowSeconds=2 |
| `lurker.3` · 潜巢伏击者 | mobile | burrowTimeFactor=0.4；openingCycles=3；openingDamageFactor=4；barrierMaxHp=0.4；barrierSeconds=5；triggerCooldown=12 |
| `mutalisk.1` · 六翼回旋 | assault | bouncePackets=[1,0.8,0.65,0.5,0.4,0.3]；bounceRadius=5 |
| `mutalisk.2` · 绞杀翼群 | precision | glaives=3；mainPacketFraction=1；bouncePackets=[0.35,0.15]；armoredDamageFactor=1.5 |
| `mutalisk.3` · 血羽迁徙 | mobile | outOfCombatSeconds=2；chargeSeconds=6；barrierMaxHp=0.8；openingSeconds=3；openingAttackSpeedIncrease=2；lifeStealFraction=0.35 |
| `corruptor.1` · 蚀空锁喉 | precision | lockSeconds=4；maximumDamageFactor=4；airArmoredDamageFactor=1.5；armorReduction=0.45；armorSeconds=4 |
| `corruptor.2` · 空巢铁卫 | bulwark | radius=7；redirectFraction=0.3；redirectMaxHpPerSecond=0.2；selfDamageReduction=0.25 |
| `corruptor.3` · 腐空瘟囊 | support | poisonSeconds=5；poisonDpsI=260；deathExplosionI=1800；deathRadius=4.5；spreadTargets=3 |
| `ultralisk.1` · 暴君镰刃 | assault | thirdDamageFactor=3；cleaveDegrees=170；cleaveRangeFactor=1.8；lightDamageFactor=1.5 |
| `ultralisk.2` · 不灭甲兽 | bulwark | damageStoredFraction=0.4；storedMaxHpFraction=0.8；triggerHpThreshold=0.3；healMaxHpFraction=0.5；triggerCooldown=25；damageReduction=0.35；reductionSeconds=5 |
| `ultralisk.3` · 原始踏碎者 | precision | chargeCooldown=12；chargeDistance=6；stompDamageI=2200；stompRadius=4；attackSpeedIncrease=1；empoweredSeconds=6；armoredDamageFactor=1.5 |

## 实际机制与边界

- 跳虫保持一个编制的两个实际身体。狂潮层数两体共享，攻击周期各自记录；第三击替换本次伤害。血契仅分摊真实生命损失，不递归，吸血不计护盾和被阻止的伤害；原900步幸存再生保留，血契再生体为60%生命。替补新编制即时撤销旧狂潮归属，原付费、容量、尸体/尼亚德拉保留权不改。
- 三种永久毒爆虫真实爆炸后存活，恢复五秒内不能攻击或移动，保存/升级不能消除此窗口。保留独立的原 VolatileBurstU2 建筑伤害通道和建筑护甲穿透。酸土每秒一次，同源重叠只取最强；反应堆只储存实际敌方生命损失，消耗一次，回复不复活已死身体。
- 蟑螂低血量防御与 .6秒埋地/3秒潜伏修复/.6秒出土是可检测、可伤害的实际状态机，保留原命令。强酸五层后第六击替换为范围强击并重启序列，换目标重启；伤害在弹体接触时结算。反射只由实际敌方近战生命损失触发，半秒门控，不递归；实际命中后的四秒自愈有限。
- 破坏者需要既有胆汁科技。三连有0/.3/.6秒独立发射、每发原2.5秒落点延迟；强酸星的重甲/建筑1.5只取一次。雨幕只在真实落点生成六次地面脉冲，Boss减速20%，空军不会受地面雨伤害。未发射弹囊遇施法者死亡会撤销，已发射弹囊保留冻结源与落点。原普通胆汁落点预订会避开新精英的真实在途胆汁。
- 刺蛇五针有五个实体飞行、同一主周期身份和一个主命中收据；射程+2，35度覆盖使用原地空合法层。贯穿矛在主目标实际抵达后逐段推进，后续每目标80%，地空分别结算并受地形/墙阻挡。毒囊同源最多四层、五秒、每秒固定伤害；实际非Boss死亡只传播剩余一层、最多四个，继发囊不再传播。真正主巢/扩张巢等合法建筑也能保存活体毒囊，显式移除不会制造死亡传播。
- 育巢光环只作用于永久友方生物身体，包含永久生物英雄，进出范围保持损失比例，护甲+4在既有乘法后加入。机械、临时、子体与敌方不取该增益；原45秒注卵、一次货舱收据和支付/容量约束保留。输血固定最多五个原伤员、四次每秒脉冲，花原50能量（既有天赋减免一次）；有效缺血封顶、不能改锁新目标，来源死亡/离开范围/墙阻挡停止有效恢复。毒巢卫的毒液是实际两倍武器到达后的半径3状态，Boss控制半效，偏好受伤友军附近敌人不改变移动命令。
- 潜伏者必须完成真实埋地。三条40度扇形地刺从身体所在处逐段推进，交叉处最多每条一次；第四巨刺替换为五倍，长度18、宽2.2、60%减速两秒，Boss半效。伏击者转换时间乘原时长 .4，原科技缩短另按旧链应用；前3次四倍与40%五秒有限护壳，每12秒只触发一次，频繁转换不刷护盾。
- 六翼飞龙为六个不同合法目标的真实连续抵达链，精确份额1/.8/.65/.5/.4/.3。绞杀翼群三条真实短链，各1/.35/.15；转场、未命中和衍生弹射不重算主周期或补发无目标伤害。血羽从出生/最近攻击/最近受伤后的完整两秒脱战等待起算，再充六秒；开战消耗一次蓄能、最多80%六秒护壳，前三秒攻速×3，生命吸血35%。
- 腐化者仅可对空。锁定四秒从1×渐变到4×，换目标重置；正护甲45%削弱保持。空中守护对永久空中友军的实际生命损失分担30%，单守护体每秒最多自己20%最大生命，不循环分担，自身25%减伤不重复用于转移额。瘟疫一源一目标一囊，非Boss真实死亡后1800成长爆发/半径4.5、最多3个继发囊，继发不会再爆发或传播，地面不受益。
- 雷兽第三击为实际前方170度/原近战距离1.8倍的三倍替换，轻甲再取1.5；没有隔墙或空军命中。不灭甲兽储存实际受伤40%、上限80%最大生命，存活且≤30%时只释放已有储存、最多回复50%，25秒门控与五秒35%减伤，不是复活。踏碎者实际沿合法地面前进最多6，逐步检测地形、边界和身体占用；到达或被挡后在真实身体位置重踏，不能在远端提前结算或瞬移穿墙。

## 同源表现与保存

`World`、实际 `weaponFlights`、`zergElites` 和 `BattleRenderer` 同时服务正式游戏与独立演示。原模型、骨骼动作和资源字节不改。原刺蛇骨针作为实际针/矛与活体刃虫组件，原毒爆虫实体作为酸囊；地刺为使用原骨表面的有弯曲三维刺体和原尘土/组织层。这些是作者制作的组合，不宣称找到了原飞龙导弹或原潜伏者导弹完整模型。治疗为原纹理弯曲体液流、移动细胞、受体膜与接收光，没有改造原科技球纳米迷雾或已确认英雄效果。爆炸、酸池、毒囊、护壳、镰刃余光均采用独立羽化材质，不靠普通圆圈说明机制。

完整/均衡/简化保持实体弹体、地刺、真实攻击段与主要治疗流，减的是装饰密度。效果不自行制造伤害、游戏ID或假弹道。原18个英雄的数值、被动、技能、原模型动作、脚底可见光环及隐藏光环文字保留；共享英雄统计函数只接入新的生物友军育巢光环。原30个人族精英、已确认神族特效与恶火地狱骑士连续填满的150度扇形保留。

run schema22 保存双体层数、目标/周期、储存、潜地/冲锋/蓄能/开场/护壳、真实及衍生飞行、胆汁批次、逐段脊刺、固定毒囊、治疗窗口、同源命中门与减益。profile v5不变；没有开发者旧存档兼容分支。恢复前验证有限数值、源/目标资格、批次/唯一身份、冻结金额、段长/宽度/进度、层数与时间上界，非法数据原子拒绝。渲染层与光环成员关系重建。

## 本地交付

- `dist/Thirty-Zerg-Elites-Integrated-Game-Demo.html`：10家族×3精英、I/III/V、地空/群体/直线/身份/伤员/空能量/低血/墙体、真实埋地、承伤、暂停、快进、本页内存保存/恢复及三档质量。
- `dist/SC2-Survivors-Zerg-Elites-20261005.html`：全部已确认英雄、已确认人族精英与本批虫族精英的完整本地离线游戏。
- `dist/web`：同源正式Web应用及原已核验575资源。

旧18份HTML逐字节保留，新游戏使用新文件名。演示的高生命静止敌人、Boss身份目标和快进是观察工具；真正Boss数值与技能击杀另由正式Boss工厂验证，完整游戏另通过正常界面保存/恢复。没有清理、Google上传、推送或部署。实际工程证据见 `NEXT_ITERATION_P4B_VALIDATION_20261005.md`；人类视觉、设备、完整自然M6/M7、长期平衡/性能与原科技球死亡片段缺口保持OPEN。
