# P4-C · 神族30精英与两族团队光环正式接入 · 2026-10-05

用户直接授权“以此数值落地前面已经完成的精英和英雄，并开始制作神族30精英”。本次把上一轮团队光环设计写入正式战斗，同时实现全部30个神族精英；先前“光环仅设计”“神族P4未接入”的范围限制由本次授权更新。人族30精英和6英雄为固定基准；原18英雄本体、技能金额/时序、确认版模型动作和攻击特效保持。光环脚底视觉显示，战场不显示光环说明文字。

## 数值来源和成长

- 精英身体和机制来自已批准的 NEXT_ITERATION_P4_VALUES_20261005.json；新增团队项来自 TEAM_AURA_REBALANCE_VALUES_20261005.json。两份原快照保持不变。
- 明确运行时常量为 src/data/protoss-elites.ts 与 src/data/team-auras.ts；正式运行时不导入文档 JSON。全部90个精英都使用明确规则，不再走旧神族模板回退。
- 五个身体预设与前两族一致，以普通V身体为基准；固定伤害和输出成长1+.35×(rank−1)，生命/原生盾1+.30×(rank−1)，护甲每级加.5。原玩家1.15、科技、卡牌、天赋各计一次。
- 新神族对轻甲/重甲的整包倍率替代对应原生同类加成，避免同类条件叠算超过批准预算；没有新条件倍率的原武器附伤继续保留。新指挥伤害增益同时作用主伤和原生附伤一次。

## 神族全部30身份

固定金额字段为I级；其余等级按上述成长冻结。团队项另见下一节。

| ID · 名称 | 身体预设 | 批准参数 |
| --- | --- | --- |
| `zealot.1` · 誓刃狂徒 | assault | stacks=6；attackSpeedPerStack=0.35；cleaveEveryCycles=3；cleaveRadius=3；cleaveFraction=1.5 |
| `zealot.2` · 光盾卫士 | bulwark | shieldBreakCooldown=14；retaliationDamageFactor=3；retaliationSeconds=4；shieldPerEffectiveDamageFraction=0.35；shieldRestoreMaxPerSecondFraction=0.15 |
| `zealot.3` · 裂阵先锋 | mobile | chargeDamageI=1800；chargeRadius=3.5；openingCycles=3；openingDamageFactor=3；chargeCooldown=10 |
| `adept.1` · 双相战刃 | assault | echoDelay=0.3；echoDamageFactor=1.5；lightDamageFactor=1.6 |
| `adept.2` · 晨星巡猎 | mobile | outOfCombatSeconds=2；openingCycles=4；openingDamageFactor=3；moveFactor=1.35；rangeAdd=2 |
| `adept.3` · 裂光共振 | precision | hitsRequired=4；resonanceDamageFactor=5；resonanceRadius=3.5；markSeconds=5 |
| `stalker.1` · 虚空连射 | assault | burstEveryCycles=4；burstShots=3；burstDamageFactor=1.2；rangeAdd=2 |
| `stalker.2` · 裂隙刺客 | mobile | empoweredCycles=6；empoweredDamageFactor=3；barrierMaxShieldFraction=0.8；barrierSeconds=5；triggerCooldown=12 |
| `stalker.3` · 晶棘破甲 | precision | positiveArmorIgnoreFraction=0.7；armoredDamageFactor=2.5；pierceLength=10；secondaryFraction=0.8 |
| `sentry.1` · 光穹织者 | support | radius=7；shieldRestorePerSecondI=180；targets=7；damageReduction=0.25 |
| `sentry.2` · 静滞监察者 | support | controlCooldown=14；controlRadius=4；ordinaryStasisSeconds=2.5；bossSlow=0.25 |
| `sentry.3` · 折射惩戒 | precision | storedShieldDamageFraction=0.7；storedLimitMaxShieldFraction=2；releaseCooldown=3；beamLength=10；beamWidth=1.6 |
| `immortal.1` · 破城判官 | precision | armoredDamageFactor=3；lockStacks=4；damagePerStack=0.25；barrierBreakNextDamageFactor=1.5 |
| `immortal.2` · 永恒壁垒 | bulwark | barrierFactor=4；barrierBreakShieldRestoreFraction=0.5；damageReduction=0.3；reductionSeconds=4；triggerCooldown=16 |
| `immortal.3` · 引力裁决 | support | gravityRadius=4；pullDistance=2；pullCooldown=3；splashFraction=0.8 |
| `colossus.1` · 焚天双束 | assault | heatSeconds=2；maximumDamageFactor=3；lineWidthFactor=1.8；fireSeconds=2；fireDpsI=220 |
| `colossus.2` · 地平线切割 | precision | rangeIncrease=1；lengthIncrease=1；armoredDamageFactor=2.5；widthFactor=0.75 |
| `colossus.3` · 震慑行者 | bulwark | everyCycles=4；shockDamageFactor=2；shockRadius=5；moveReduction=0.5；attackSpeedReduction=0.3；seconds=2；shieldRestoreFraction=0.15 |
| `high_templar.1` · 风暴执政 | precision | stormDamageFactor=2.5；stormRadiusFactor=1.6；stormPulsePeriodFactor=0.5；totalStormDamageMultiplier=2.5；stormBaseTotalI=1200；stormBaseCooldown=12 |
| `high_templar.2` · 反馈先知 | support | feedbackCooldown=12；feedbackRadius=4；energyDamageRatio=6；fixedFeedbackDamageI=1600；energyDrainFraction=1 |
| `high_templar.3` · 静电织网 | support | webSeconds=6；webRadius=5；attackSpeedReduction=0.4；allyEnergyPerSecond=6；allyTargets=7 |
| `phoenix.1` · 离子六翼 | assault | shotsPerCycle=6；lightDamageFactor=1.6；moveFactor=1.2 |
| `phoenix.2` · 引力狩猎者 | support | gravityTargets=2；liftSeconds=4；liftDamageFactor=3；gravityCooldown=10 |
| `phoenix.3` · 相位突击翼 | mobile | outOfCombatSeconds=2；openingCycles=6；openingDamageFactor=3；barrierMaxShieldFraction=0.75；chargeSeconds=6 |
| `void_ray.1` · 棱光处刑舰 | precision | chargeSeconds=5；maximumDamageFactor=5；armoredDamageFactor=1.5；moveFactor=0.8 |
| `void_ray.2` · 裂光分束舰 | assault | secondaryTargets=3；secondaryFraction=0.75；secondaryRadius=5；mainDamageFactor=1.5 |
| `void_ray.3` · 能量虹吸舰 | bulwark | shieldPerEffectiveDamageFraction=0.3；shieldPerSecondMaxFraction=0.18；barrierMaxShieldFraction=0.8；barrierSeconds=6 |
| `carrier.1` · 蜂群指挥舰 | assault | interceptors=8；childAttackSpeedIncrease=1；overdriveSeconds=6；overdriveCooldown=18 |
| `carrier.2` · 重矛母舰 | precision | interceptors=4；childDamageFactor=2.5；childArmoredDamageFactor=1.8；heavyEveryCycles=4；heavyPacketFraction=1 |
| `carrier.3` · 圣盾巡航舰 | bulwark | parentDamageReduction=0.3；interceptorHpFactor=2.5；returnHealPerSecondFraction=0.15；childDpsFactor=1.5；repairRange=3 |

## 已落地的团队光环

完整逐英雄、逐精英参数保留在 [光环数值设计](TEAM_AURA_REBALANCE_20261005.md) 与参数快照中；该文件开头的设计阶段状态属于历史记录，本契约记录现在已正式实现。两族各8个辅助精英条目、各6名英雄改用完整团队职责，其余44个精英保留各自战斗核心。人族原样例数值未改。

家族指挥全队同家族全属性20%；精英压制采用伤害30%/攻速35%/移动45%并对Boss半效。虫族保留生命、有效输血、吸血、再生、腐蚀与有限分担；神族采用原生盾、有限能量织盾、反馈标记、相位护障和真实子机继承。凯瑞甘、利维坦、菲尼克斯、旗舰采用新版多属性指挥；扎加拉、德哈卡、阿拉纳克、沃拉尊采用整组压制；泽拉图破防、斯托科夫瘟疫/抑疗、尼亚德拉生体支援、阿塔尼斯盾阵均按快照实现。

同身份不叠乘，生命/原生盾的精英同通道取最强；不同英雄加法汇总后应用一次。全属性家族指挥独立乘1.2；平坦新护甲在既有乘法后加入。工人、建筑、独立临时体及运输货舱不受友军战斗光环；实际子机仅通过母体继承一次。范围效果检查存活、资格、距离与通路；敌方隐形未被侦测时不凭光环揭示。英雄压制对Boss完整生效，硬控制免疫仍保持。

输血主母花50能量，冻结5个实际伤员，4秒16次脉冲、每体I级240/秒；有效恢复后给予6秒受治疗+30%和实际生命伤15%吸血，吸血每秒最多自身生命10%，不重复叠加原更强吸血。血羽/相位入战护障冻结当时生命/盾基数和真实储能比例，最多5名其他队友，4/6秒与12秒门控；离开光环不凭空刷新护障。斯托科夫瘟疫冻结入圈最大生命，首跳延后1秒，普通/精英/Boss每秒6%/3%/1.2%，不再乘武器易伤；进出圈不刷即时伤害。

生命/盾上限因光环变化时保持伤势比例，升级仍保留原绝对损失规则。阿塔尼斯旧30%保护由40%替换一次，不乘成两层保护；原七体恢复、旧利维坦近场生命、扎加拉原指挥等原被动继续。

## 真实机制和边界

- 狂热者双刃按一个周期记数；连击、破盾反击和合法冲锋到达分别有实际收据，途中取消不远端重踏。新剑光跟随冻结发射姿态，有限余光不附带伤害。
- 使徒回响只击中冻结落点，第四次共振替换主包；追猎连射为三个真实弹体，成功闪现才开启六周期窗口，贯穿沿真实路径受墙阻挡。
- 哨兵守护、静滞、盾伤储能有原能量/冷却、范围和上限。普通静滞与Boss减速分开；已经被有限屏障吸收的伤害不凭空再储存。
- 不朽者保留实际屏障和破盾回报；重力牵引检查合法位置，Boss只承受减速。巨像双线真实扫过、同线每目标只命中一次，灼地同源每秒取一次；热量需持续攻击，分支的宽/远程和第四周期实际生效。
- 高阶圣堂武士保留科技与真实能量。强风暴3000I总伤、0.2秒分摊而非翻倍总伤；反馈只消费现有能量一次并给6秒25%武器易伤；织网仅由实际风暴生成，最多7个已有能量池回流。
- 凤凰六发是真弹体；引力束抬起最多两个合法地面普通/精英，Boss/建筑排除，结束或来源死亡回地面。相位突击消耗真实储能，护障和开场周期分别记录。
- 虚空锁定换目标/脱战会清除，折射有独立合法邻敌，吸盾仅按实际生命/盾伤并受每秒预算约束，溢出转有限护障。
- 航母使用真实所属子机，无母舰假炮。编队航母出生8机，连续锁定2秒后进入6秒双攻速/18秒门控；2秒为对原设计“持续锁定”的实现补齐。重型航母4个活跃机位，原已付费多余子机保留为备机并在损失后补位，绝不额外开火或免费补充。圣盾巡航舰按实际返航距离和未开火状态修复；普通4/8机库与补充价格/时间保持。

引力束未另加设计快照未要求的能量池/花费；它仍受10秒冷却、4秒持续、双目标和合法地面目标限制。这是实现选择，不标为用户原给数值。

## 效果、保存与交付

正式游戏与演示共享 World、真实 weaponFlights/protossElites/teamAuras 和 BattleRenderer。新精英使用原准备模型、动作及原灵能纹理，独立羽化材质绘制持续剑光、晶体/相位刃、双线扫射、风暴、护盾和引力螺旋；为作者制作的层组合，不宣称是完整原SC2特效资产。完整/均衡/简化保留核心弹体、宽度和实际攻击段，降低装饰数量。原神族英雄修正后的剑光/航母聚能粗射线和人族填满扇形保持。

run schema23 保存神族周期/目标/储能/破盾/升空/子机时钟，真实主/衍生弹体、回响、扫线、能量场、有限屏障、输血和瘟疫收据；profile v5不变，无开发者旧存档兼容分支。恢复时验证有限数值、时钟边界、金额/来源/目标和结构；显示及光环成员关系重建。

- 独立演示：dist/Thirty-Protoss-Elites-Integrated-Game-Demo.html。
- 完整离线游戏：dist/SC2-Survivors-Protoss-Elites-And-Auras-20261005.html；本地Web为dist/web。
- 实际验证记录：NEXT_ITERATION_P4C_VALIDATION_20261005.md 与 reports/local/protoss-elites-auras-20261005/delivery.json。

历史20份HTML保留；原资源发布版本不变。没有清理、上传、推送或部署。新精英视觉等待用户复核；完整自然M6/M7、实体设备/长期性能和三个科技球原始死亡片段缺口仍OPEN，不能用诊断场景或预算数学替代。
