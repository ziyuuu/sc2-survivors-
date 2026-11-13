# 人族武装支援 · 45 张牌的代码接入规格 R3

2026-11-10。武装支援设计定稿，供 1.4 实装。普通系统核击每轮 **3–4 发**，焦土战略每轮 **5–8 发**。焦土每次系统齐射赠 **1 枚库存**，手动花 **1 枚打一轮**。兵营、地堡、堡垒由本次投送或刷新产生，有本次自己的落点、在场期和退场。此前认可的援军身份、实际人数、临援寿命、正式战损条件和共冷继续生效。

本稿给出首版可编码的固定步、分弹、伤害分摊和工事时钟。按目标数在发数区间内取值、子弹散布、以下具体加速幅度是本轮实施取值。引用定位到 `体积优化版` 当前工作目录中的 TypeScript，检查时 HEAD 为 `679720fefa5c`，目录另有未提交改动。R1 保存全部原始牌面，R2 保存演出对照。开发与验收以本稿为准。[R1 原始牌表](V1_3_TERRAN_ARMED_SUPPORT_R1_20261110.md) · [R2 战场对照](V1_3_TERRAN_ARMED_SUPPORT_DEV_20261110.md)

## 代码接在哪里

下表左列是当前已有入口，右列是需要编写或调整的部分。文中的 `ArmedSupportState`、`ArmedVolley`、`ArmedDeployment` 和 `planNukeVolley` 都是拟新增的类型或函数。

| 现有入口 | 1.4 接法 |
|---|---|
| `ExpeditionOfferEffect`、`reinforcementPool`、`drawExpeditionReinforcements` | 在现有三格货架加入武装普通牌的候选、档位与资格。用稳定卡 ID 记取得来源，按已有折扣和冻结报价成交。六张由原卡迁入的牌复用效果表，对同一效果只生成一份可购候选。[效果联合类型](../../src/simulation/progression/expedition-drafts.ts#L21) · [候选池](../../src/simulation/progression/expedition-drafts.ts#L193) · [整页抽取](../../src/simulation/progression/expedition-drafts.ts#L298) |
| `canTakeExpeditionOffer`、`purchaseOffer`、`recordExpeditionOffer` | 拟增普通分支牌、待领节点两种类型分支。按有效售货回执一次更新钱包、档位／备次、分支进度及待领机会。首次成功领取分支紫节点时才锁定本局主分支。节点资格并入关间现有决策状态。检查重复点击、付不起与存档冲突。[可买校验](../../src/simulation/progression/expedition-drafts.ts#L346) · [实际扣费路径](../../src/simulation/expedition-economy.ts#L75) · [购得记录](../../src/simulation/progression/expedition-drafts.ts#L372) |
| `World.step → updateTalentSupport → tickShopSupport → tickUnique` | 在 `tickShopSupport` 进入战斗后的固定步分支派发新来源，放在旧逻辑的“无雷、无弹、无燃烧”早退之前。现有六张原卡仍走各自执行器。暂停、需玩家选择、停战和特殊玩法按现有资格处理。[60 Hz](../../src/data/game.ts#L3) · [世界步](../../src/simulation/world.ts#L1157) · [支援调用点](../../src/simulation/world.ts#L780) · [支援步](../../src/simulation/combat/shop-support.ts#L28) |
| `World.fire`、`attackHit`、`commitUnitDeath` | B01 监听实际出手并已产生 `shotSequence` 的一步，全队只开一条弹幕钟。G07/G08 使用已有主命中入口。G03/O01 在致死保护完成、死亡已提交处监听，按 ID 和出生代去重。`uniqueDeath` 的既有调用属于敌军死亡，正式友军战损须在友方分支接入。[真实开火](../../src/simulation/world.ts#L869) · [主命中](../../src/simulation/world.ts#L619) · [死亡和寿命到期](../../src/simulation/world.ts#L834) |
| `World.previewStrategicStrike`、`World.commitStrategicStrike`、`previewStrategic`、`commitStrategic` | 保留现有桌面／触屏瞄准入口。现代码在提交时减 1 库存、消费一次反应堆，再压入一条 `at = w.time + 3` 的手动弹。扩展已学节点的分支，把一轮作为一笔提交。新的手动在途锁只看本人的手动轮及旧手动弹，允许系统齐射期间花刚获得的库存。[世界瞄准入口](../../src/simulation/world.ts#L1152) · [实际库存与在途检查](../../src/simulation/combat/shop-support.ts#L17) |
| `World.trySpawnPod → spawnPod → landPod → updatePods → releasePaidPassenger` | 当前人族援军载体模型就是兵营。标准订单用 `DeliveryLedger` 和 `Pod.passengers`，落地要处理守卫、开舱和乘员回执。新快投沿用已验证的模型、地形检查和出兵定位，使用自己的出勤回执。直接调 `spawnPod` 会改变护卫序列并走正常救援条件，不能用假付费单实现 0.4 秒出兵。[人族载体与标准时钟](../../src/data/economy.ts#L2) · [生成](../../src/simulation/world.ts#L654) · [落地](../../src/simulation/world.ts#L695) · [开舱](../../src/simulation/world.ts#L1063) · [原订单出兵](../../src/simulation/expedition-production.ts#L95) |
| `bunkerPoint`、`UniqueSupportState.landing`、`World.fortifications` | G02 已有 1.5 秒空降、落地实体、双枪与 30 秒回收。保留其单一落地预约。新来源单列多槽预约，只有真正落地的可攻击工事才登记为 `Fortification`。现代码把所有有 `supportUntil` 的工事当双枪地堡，也会据此挡住下一座 G02。接新种类前，**射击与存在性两处都按来源收窄**，兼容旧档无来源标签的原 G02。[工事类型](../../src/simulation/types.ts#L10) · [合法落点](../../src/simulation/combat/unique-support.ts#L65) · [双枪、到期与下次投放](../../src/simulation/combat/unique-support.ts#L75) |
| `familySeatCount`、`paidReservations`、`freePosition`、`addFamilyMember`、`addUnit` | 正式新增要预留真实身体席。`ordinaryCapacity` 和 `availableCapacity` 含可训练军衔空间，数值大于零未必能加一具身体。复用生产里已等待的身体席计算。生产和支援两边都扣除对方的预留。临援用独立占位并设置 `temporary` 和 `temporaryUntil`。援兵加强快照取自出勤时，不追改已出场成员。[席位与定位](../../src/simulation/world.ts#L629) · [生产占位](../../src/simulation/expedition-production.ts#L75) · [临时精英实例先例](../../src/simulation/world.ts#L778) |
| `hitFrom`、`World.hit`、`expeditionDamage`、`equipmentCardDamage` | 虚拟炮火由已冻结的单发量结算，带可观察的来源 ID。临援保留原生武器、装备与死亡链。现有私有 `areaHit` 固定了部分半径和表现分类，需抽出可传半径、受击对象及表现种类的支援结算，旧调用仍用原参数。核爆明确指定 `strategic-impact`，小当量核弹同样有核爆身份。[支援范围命中](../../src/simulation/combat/shop-support.ts#L26) · [观测封装](../../src/simulation/observation.ts#L12) · [装备公式](../../src/simulation/starship/card-effects.ts#L21) · [伤害入口](../../src/simulation/world.ts#L782) · [护盾链](../../src/simulation/combat/expedition-combat.ts#L137) |
| `newExpedition`、`validateExpedition`、`captureRun/restoreRun` | 拟把武装状态放入 `w.expedition.support.armed`。初始化、旧档缺省、成员／工事引用和事件校验在 `ExpeditionState` 一侧处理。`expedition`、实体、载体与工事已经在运行快照内。普通存档遵从原检查点策略，完整快照中途恢复用于检验逐弹、逐人回执。[状态初始化](../../src/simulation/expedition-state.ts#L53) · [当前支援校验](../../src/simulation/expedition-state.ts#L67) · [字段清单](../../src/simulation/persistence/run-fields.ts#L32) · [快照与恢复](../../src/simulation/world.ts#L265) · [检查点条件](../../src/app/run-session.ts#L70) |

## 高频核击的编码合同

| 来源与持牌情况 | 每轮发数 | 首爆／后续间隔，单位为步 | 裸装全轮伤害预算／基准半径 R | 库存 |
|---|---:|---|---|---|
| P01 系统，未选 N05 | 3–4 | 15／5 | 2400／6 | 库存变化 0 |
| P01 系统，选入 N05 | 5–8 | 0／4 | 3840／7.8 | 整轮成功投放 +1 |
| O01 清场中的系统核击 | 3–4，持 N05 时 5–8 | 0／5，持 N05 时 0／4 | 2400／6，持 N05 时 3840／7.8 | 持 N05 时整轮 +1 |
| 手动，无 N05 | 1 | 180／无 | 原版 6000／8，单持 P01 为 7500／10 | 成功提交 −1 |
| 手动，持 N05 | 5–8 | 0／4 | 同持 P01 为 12000／13。仅有 O01 提供系统来源时为 9600／10.4 | 整轮成功提交 −1 |

**发数和落点。** P01 从可见、可受击的合法敌军中按既有随机源等权抽一名，冻结坐标。O01 从触发快照中取离小队最近的合法敌军作核击中心，同距按稳定 ID。手动由玩家定中心，沿现有开放地面校验。按中心 R 内不同合法敌军的数量取发数，夹在该档上下限。只有一个敌人仍打满最低发数，手动点空地也能打最低发数，普通 P01 没有合法敌人时继续待命。O01 即使战场无敌军，仍兑现无敌、补员、护盾与英雄，只有实际发起的系统核击才赠弹。

第一发打中心，余下子弹在 0.50R 的环上等角分布，以小队朝中心的方向为起始角。每枚的爆区半径 0.65R，最远实际覆盖到 1.15R。边缘落点依次向中心缩到 75%、50%、25%、0%，采用第一个合法点。锁后敌人可以移动，每枚都在实际爆区独立命中。单发伤害取已冻结的**全轮预算除以发数**，浮点值只在显示时取整。例如裸装系统 3 发各 800，4 发各 600。焦土系统 8 发各 480，P01＋焦土的手动 8 发各 1500。多个爆区重叠时逐发算盾与甲。

以下 TypeScript 为拟新增的纯排程函数。调用侧先校验阶段、库存、能力与中心，传入已按卡系数和装备结算一次的预算。`Point` 与项目世界坐标同形。`dense` 仅由 N01 认可的 P01 系统火力传入。手动弹与 O01 的专属轮不吃这个速度修正。

~~~ts
type Point = { x: number; z: number };
type NukeOrigin = 'P01' | 'O01' | 'manual';

interface NukeInput {
  origin: NukeOrigin;
  scorched: boolean;
  dense: boolean;
  tick: number;
  center: Point;
  bearing: number;
  legalTargets: number;
  budget: number;
  radius: number;
}

function planNukeVolley(input: NukeInput, canLand: (p: Point) => boolean) {
  const manual = input.origin === 'manual';
  const multi = !manual || input.scorched;
  const min = input.scorched ? 5 : 3;
  const max = input.scorched ? 8 : 4;
  const count = multi ? Math.max(min, Math.min(max, input.legalTargets)) : 1;
  const first = manual && !input.scorched ? 180
    : input.origin === 'P01' && !input.scorched ? 15 : 0;
  const baseGap = input.scorched ? 4 : 5;
  const gap = input.dense && input.origin === 'P01' ? Math.ceil(baseGap / 1.35) : baseGap;
  const points = [{ ...input.center }];
  for (let index = 1; index < count; index++) {
    const angle = input.bearing + (index - 1) * 2 * Math.PI / (count - 1);
    for (const scale of [1, 0.75, 0.5, 0.25, 0]) {
      const offset = input.radius * 0.5 * scale;
      const point = { x: input.center.x + Math.sin(angle) * offset,
                      z: input.center.z + Math.cos(angle) * offset };
      if (canLand(point)) { points.push(point); break; }
    }
  }
  if (points.length !== count) throw Error('No legal point for committed volley');
  return {
    points, firstTick: input.tick + first, gapTicks: count === 1 ? 0 : gap,
    damagePerHit: input.budget / count, blastRadius: input.radius * (multi ? 0.65 : 1),
    ammoDelta: manual ? -1 : input.scorched ? 1 : 0
  };
}
~~~

**提交与结算。** 拟增 `ArmedVolley`，保存 `castId`、来源、关段、上述冻结值和 `nextIndex`。系统赠弹、手动扣弹、反应堆消耗、该来源 CD 与出勤号在首次有效提交中各写一次。旧 `impacts.kind === 'strategic'` 保持原单发与在途锁。多发批用独立集合，系统批可以与手动批并存。恢复使用保存的点、预算和游标。每个子事件用 `(castId, index)` 标识，按 `firstTick + index * gapTicks` 处理所有已到期项。先登记该子项已消费，再走伤害和原生音画，最后一发结清手动在途锁。首爆为 0 步时在提交的同一模拟步兑现。批内后续导弹各在自己的发射步瞬击。

O01 从第十名正式阵亡起计。第 0 步先给无敌并启动系统核击，第 15 步打五发坦克炮，第 36 步以三路雷神弹幕完成对快照幸存敌军的清场、补员、巨盾与英雄。最多 8 发的系统轮最迟在第 28 步落完。每阶段通过同一批激活回执挂接。快照后的来敌按后续普通规则交战。清场只处理仍可受击的敌军实体，沿 `World.hit` 的死亡与掉落路径执行。虫巢进度、护送对象与任务可伤害条件继续遵从原任务入口。

## 空降、刷出、出勤和退场

1. **设施账与地图物件分开读。** `expedition.building.groups` 记录生产线、可选兵种和建设资格，其 ID 没有地图落点。正常人族 `Pod` 落地后从 `falling` 进入 `active`，清掉威胁后 `opening`，乘员领取完 `rescued`、被毁 `destroyed`。完成的投送记录可继续留在数组内，渲染层在结束 7 秒后释放视图。N02 对这样的记录按**当前状态、所属种族、实际落地时间和存活**筛选。[生产组结构](../../src/simulation/building/rules.ts#L10) · [普通载体状态机](../../src/simulation/world.ts#L1063) · [已结束的模型回收](../../src/render/scene/battle-renderer.ts#L1122)
2. **新支援预留落点。** 拟在 `armed.deployments` 保存 `id, castId, cardId, stageKey, slot, point, landTick, endTick, phase, nextExit, reservedPassengers`。检验通路用现有 `validCarrierLanding`，显式传碰撞半径。整批检查其他真实物件、尚未落地的 G02、本批兄弟槽及其他武装预留点，把武装预约也接入旧载体的落点检查。一批需要两营／四堡／六员时，先找全套可行点才开始 CD。落地时二次检查。被移动物体占据时按稳定顺序找合法替代点，等待期间保留同一出勤号和席位。每个物件各从实际落地计寿命。[落点与通行检查](../../src/simulation/movement/carrier-landing.ts#L10) · [空位](../../src/simulation/world.ts#L642)
3. **按实际用途建对象。** 短开舱物在部署账中驱动载体模型和排队乘员。可受击、嘲讽、阻挡或产生光环的工事落地时用同一个实体 ID 加入 `w.fortifications`。拟扩充 `Fortification.kind` 与 `supportOrigin`，后者含 `cardId/castId/slot`。使用既有空间查询、受击、碰撞、删除和 View 回收入口。G02 的旧档识别式为“`bunker`、有 `supportUntil`、有原支援档位并且没有新来源标签”。无尽场地地堡和装备工事仍由各自所有者更新。[原工事联合类型](../../src/simulation/types.ts#L10) · [现有工事被毁](../../src/simulation/world.ts#L822) · [实体碰撞](../../src/simulation/world.ts#L1183)
4. **同一步先退场、再出兵。** 只有 `landTick <= now < endTick` 且该实体仍在场可用时才出人、开炮或供益。死亡、到期或离开本战场都撤销未来未出的子项，归还剩余预留、解除嘲讽／范围增益、回收碰撞和视图。已经入队的成员按各自寿命继续。落地后被击毁，当前出勤按已使用处理。已付普通订单保留原回执。正常换关只清本轮武装场物和未落地场物，保留持牌、CD 与正式成员。回到同一合法战斗快照可恢复仍在服役的物件，到新关时由下次合法出勤新生成。[结束关段](../../src/simulation/world.ts#L1110) · [工事回收示例](../../src/simulation/starship/fortifications.ts)

| 来源 | 物件怎样出现 | 寿命、出兵与撤收 |
|---|---|---|
| W01 临援仓 | 预约一个落点，0.20 秒空投触地冲击 | 0.30／0.40／0.50 秒出临援，N02 的第四人在 0.60 秒。最后一人出完即收仓。 |
| W02 支援仓、G03 快速补充 | W02 有正式空缺才在队后刷出或飞降一次兵营载体。G03 使用本次后方增援出口 | W02 第 0.20 秒开门、0.40 秒补 1 人。G03 最多两人，0.35／0.55 秒出队。出完关闭本次出口。 |
| W05 空仓、B05 增援以至 | W05 空降一座嘲讽兵营。B05 的两座兵营在第 12、21 步分别落地 | W05 落地后驻 10 秒。B05 每座在自身落地后 12／27／42 步出 3 人，自身驻 8 秒。B05 营体首版沿用该关正常人族载体 `w.config.podHp` 与 `TUNING.podArmor`。 |
| G02 地堡、W07 机炮、P04 信标 | G02 走原投放，W07/P04 各生成本次临时炮座／信标 | 各自驻 30／16／8 秒。信标退场后，已经授出的随身盾仍按原盾量与到期步结算。 |
| P05 堡垒空降、O03 行星要塞 | P05 四座各有落地和实体 ID。O03 一次刷出或空降一座重工事 | P05 每座从触地起驻 24 秒。O03 从触地起驻 60 秒，承伤充炮与驻军都归本次要塞 ID。要塞再次出勤从空充能开始。 |

**N02 的出兵源。** 只读本次实际落地、在场的人族兵营载体及 G02 支援地堡。正常人族载体只在 `active/opening` 有效，额外临援和其原有乘员分别记账。W02、W05、B05 各按自己物件的生灭区间。W01 短仓取投送提质与多一人。P05 的四座堡垒负责阻敌与光环，O03 的侧门按自身重炮回执出驻军。首次随机临援在落地后 **1.5 秒**，之后每 **6 秒**一名 I 级枪兵、死神或劫掠者，等权且受普通临援名额约束，存活 16 秒。以按时落地的 B05 为例，两营各能在自身第 1.5、7.5 秒开门，在第 8 秒退场。到第 13.5 秒这两个来源均无下一班。无合法位置或席位时最多保留本建筑当前一笔待出，实际出兵后重启 6 秒计时，退场清掉待出。

## 逐卡配置与调用

所有新 CD 以本次合法预约起算，原卡另有落地起算等约定的依原卡。本文的步数取 `TUNING.step = 1/60`。秒制非整步偏移从同一触发基准向上取整。周期乘数更新在下一次合法发射或出勤时取值。白、绿、蓝、普通紫基础价为 50／0、90／20、150／50、225／90 矿／气。白牌同名复购只升至 III 档，首购记 1 个分支进度。注明“三档”的非白升档每次记 1，注明“备派”的每次成功复购只加一次备派、最多存 2。其余普通牌为一次解锁。11 月 12 日玩家确认，同一分支每 3 个有效进度产生一次免费的紫节点二选一。首次实际领取哪一支的节点，就锁定哪一支。武装锁主后续领武装自己的节点，关闭其他分支的待领及后续节点。普通紫仍按普通牌成交。优先未学且可兑现的节点，已学合法项可备 2 次强化，合法选项不足两种时保留选择权。已发货架保留报价。后续分支格内权重由 1∶1∶1 转为 1∶0.5∶0.5。9 点且领过三次紫节点后，橙色三选一可留到后续关间，325／140，每局限一张。

### 白卡 · 9 张

| 编号与名称 | 实装参数 | 现有接口、要补的行为与验收 |
|---|---|---|
| W01 临援仓 | 接敌 CD 60 秒。落仓半径 2.4，冲击 80／110／140。临时枪兵 3 名，驻 30 秒，军衔 I／II／III，生命再乘 1／1.10／1.20。 | 用快投部署账触地结一次冲击，开舱时逐人 `addUnit`，打上本来源、寿命与批次。满 30 秒从实际出舱步撤离。复购只升原卡。[实体生成](../../src/simulation/world.ts#L546) · [到期分支](../../src/simulation/world.ts#L971) |
| W02 支援仓 | 有正式缺额才就绪，CD 90 秒。刷出本次队后兵营，0.40 秒出 1 名正式兵，按已选家族、军衔 I／II／III。 | 从可用生产家族及补员优先级取一名，预留身体席，合法出营后 `addFamilyMember`。满编等下次机会。最后一席遇到两个来源只兑现一人。[家族可用性](../../src/simulation/expedition-production.ts#L22) · [正式成员与容量](../../src/simulation/world.ts#L638) |
| W03 快速增援 | 后续正常建造／训练耗时 ×0.88／0.78／0.68。与原耗时乘数相乘。新增折减最多把原耗时压到 40%。若旧公式已经更短，取原结果。 | 在 `productionQuote.seconds` 写入新单工时，沿 `DeliveryLedger.remaining` 倒计。现有建设购买即时结算，1.4 若给建设排实际工期，在新工单入队时同样取值。I 档新 10 秒单为 8.8 秒，旧单仍 10 秒。[生产报价](../../src/simulation/expedition-production.ts#L58) · [建设购买](../../src/simulation/expedition-economy.ts#L75) |
| W04 炮火轰击 | 地面接敌 CD 45 秒。在冻结的 4 码窄线第 **6／15／24／33／42 步**各落 1 发。每发为 I 级架坦主炮的 **0.70／0.85／1.00**，沿原三圈和对甲加成。 | 从 `SIEGE` 取炮型，乘玩家系数、军衔、卡系数和一次支援装备。I 档零装爆心对普通／重甲属性分别为 32.2／56.35，均为扣甲前。`hitFrom` 逐爆点结算。[架坦数据](../../src/data/sc2-units.ts#L48) · [装备支援](../../src/simulation/starship/card-effects.ts#L21) |
| W05 空仓 | CD 36 秒，0.20 秒空投一座兵营，驻 10 秒，HP 650／950／1350、甲 2。落地吸引 5 码内普通可嘲讽地面敌军 3 秒。 | 新工事使用独立来源。给受影响敌人暂存 `targetId/until`，在特殊任务强制目标之后、普通候选评分之前取合法嘲讽目标。被毁、到期或目标不可攻击就释放。基础仓的正式乘员数为 0。[找目标](../../src/simulation/world.ts#L714) · [工事死亡](../../src/simulation/world.ts#L822) |
| W06 战地急救箱 | CD 24 秒，队伍 5 码内找受伤生化友军最密处。0.15 秒箱落、0.25 秒开盖。半径 2.8、最多 4 人，按低生命比例每人回 35／55／80。 | 复用合法伤员和稳定排序，按真实生命缺口封顶，记录实际恢复额。阵亡者不入选。箱体开盖后结束。[支援目标筛选](../../src/simulation/combat/support-targets.ts#L9) · [恢复观测](../../src/simulation/observation.ts#L11) |
| W07 前哨机炮 | CD 34 秒，第 12 步部署、第 21 步首枪。驻 16 秒，一座，HP 220／310／420、甲 1、射程 6、只对地。以后每 **20 步**一发，基础 **10／40÷3／17.5**。 | 由本次炮座自己的 `nextActionAt` 开火。I 档原 12／0.40 秒与现 10／⅓ 秒同为裸装面板 30 每秒。即使无人靠近也按期撤收。装备炮塔是另一个来源。[工事类型](../../src/simulation/types.ts#L10) · [原炮座参考](../../src/simulation/starship/fortifications.ts) |
| W08 照明弹 | CD 22 秒，第 8 步抵达，爆区 1.8、伤害 35／55／80。探测区半径 5，驻 6 秒。 | 生成限时玩家探测域，让现有 `visibleTo` 对隐形／钻地状态作资格查询，与已有探测域并集。各域单独到期。[显示与探测](../../src/simulation/combat/expedition-combat.ts#L114) |
| W09 殿后爆破 | 接敌后小队沿远离威胁方向移动至少 1.5 码，在离开的旧点留包，CD 18 秒。0.50 秒后对地爆破，半径 2.5、基础 90／120／155。 | 从固定步的 `anchor` 实际位移确定放置点，冻结坐标和到期步。移动小队后，爆点仍在旧位。[小队移动步](../../src/simulation/world.ts#L1160) · [到点命中](../../src/simulation/combat/shop-support.ts#L26) |

### 绿卡 · 9 张

| 编号与名称 | 实装参数 | 现有接口、要补的行为与验收 |
|---|---|---|
| G01 蜘蛛雷 | 原三档。每关／无尽轮 6／9／12 枚，发现 4、出土 0.25 秒、追速 6、引爆 1.2、半径 2、基础 120。 | 映射 `support:'mines'`，沿用 `stageReceipt`、布雷重试与追击器。N04 只传修正后的发现距离和爆区。引爆先消费雷 ID。[原支援步](../../src/simulation/combat/shop-support.ts#L28) · [追踪参数与执行](../../src/simulation/combat/tracking-mines.ts) |
| G02 地堡 | 原三档 `terran.bunker`。1.5 秒落地，CD 从落地起 35 秒，驻 30 秒。HP 1200／1800／2400，甲 2、射程 8、每 0.5 秒双枪，第二枪延后 0.08 秒，单枪 12／16／20。 | 由 `tickUnique` 持有真实落地与射击时钟。按本卡来源收窄后，B05 两营、P05 四堡、装备或场地工事均不会占其唯一地堡资格。销毁时原在途第二枪按现有来源检查。[地堡原逻辑](../../src/simulation/combat/unique-support.ts#L75) |
| G03 快速补充 | 正式战损后 CD 30 秒，从最近两条未补战损倒序取同家族，军衔降一级、最低 I。0.35／0.55 秒从本次出口依次补入，剩一席就补一人。 | `commitUnitDeath` 记录合格真实阵亡。让正式生产和支援预约共用空席账，已补或已被另一订单承诺的损失不再分配。[正式战损](../../src/simulation/world.ts#L835) · [已有预留](../../src/simulation/expedition-production.ts#L39) |
| G04 焦油 | CD 60 秒，0.15 秒起铺、0.35 秒铺满。7×3 码，满铺后驻 30 秒，首跳在满铺后 1 秒，每秒 16。区内减速 30%，离开 0.5 秒解除。 | 新建有方向和到期步的地面区域，按每目标／同来源每个应到刻只结一次，与 N08 的出口共用这次区域。低帧仍结全部应到的跳数。[既有周期状态](../../src/simulation/combat/statuses.ts) · [伤害](../../src/simulation/observation.ts#L12) |
| G05 游骑兵 | 备派。侧翼可达时 CD 42 秒，0.15／0.30／0.45 秒进 3 辆 III 级恶火，攻击频率 ×1.35，各驻 18 秒。退场挂燃半径 2.2、4 秒、每秒 20。 | 真实恶火沿原线性武器开火。每辆的战死和自然撤离归同一退场回执，给实际范围内敌人挂燃。同来源刷新保留下一跳。[实体火焰武器](../../src/simulation/world.ts#L878) · [到期入口](../../src/simulation/world.ts#L971) |
| G06 害虫杀手 | CD 32 秒，0.18 秒落仓、0.30 秒放出 3 只 II 级临援跳虫，各驻 12 秒。冲击 75／半径 2.5，首次扑击减甲 3，持续 5 秒，同源取一份。 | 用 `addUnit('zergling','terran',…)` 逐只创建我方临时体。普通正式 `addFamilyMember('zergling',…)` 会创建配对，不能拿它生成这三只。减甲按真实首次扑击挂到目标。[配对与单体入口](../../src/simulation/world.ts#L638) · [有效护甲](../../src/simulation/world.ts#L710) |
| G07 跳弹弹链 | 原三档 `terran.ricochet`。正式非英雄枪兵／劫掠者／死神一次武器周期首命中判 25%／35%／45%，最多跳 1／2／3 次，每跳起始命中量 40%，3 码内寻未访问合法敌人，弹时为距离÷20。 | 沿 `uniquePrimary`、`shotSequence` 和已存 `SupportPacket.seen`。沿原兵种地空与视线规则，继承原武器装备一次。[首命中](../../src/simulation/combat/unique-support.ts#L43) · [原跳弹](../../src/simulation/combat/unique-support.ts#L50) |
| G08 燃烧弹 | 原三档 `support:'mutation'`。合格陆战队员命中挂火 3 秒，每秒一跳，总量为该命中量的 30%／45%／60%。每来源／每目标上限 3 层。 | 直接复用 `recordMutation` 与原跳伤处理。满层刷新最早到期层时保留其下一跳。[挂层与刷新](../../src/simulation/combat/shop-support.ts#L19) |
| G09 抢修无人机 | CD 20 秒，同刻 1 架，8 码内选最低生命比例机械或临时工事。0.20 秒贴近，之后每 0.5 秒回最大生命 4%，每跳最高 90，最多 8 跳。 | 把 `fortifications` 中仍有效的本次实体与合法机械一起排序。满血、死亡或退场结束同一修复通道。1200 HP 工事一次最多回 384，其到期时点仍取部署账。[工事修复先例](../../src/simulation/world.ts#L501) · [恢复观测](../../src/simulation/observation.ts#L11) |

### 蓝卡 · 9 张

| 编号与名称 | 实装参数 | 现有接口、要补的行为与验收 |
|---|---|---|
| B01 死亡弹幕 | 正式战斗成员实际开火即启动全队一条钟，最后一次合格开火后续 1.5 秒。一排取 3 台普通 V 级雷神各一次合法地／空武器周期。每台拆成 **4 个落点，一排 12 发**，半径 1。首排第 6 步起，每 2 步一发。 | 全队同一步只预约一排，虚拟命中不能自续期。排间为 V 级对应武器周期 ×1.25，向上取整。即使叠 N01，也至少比原 V 级武器周期多一个固定步。裸装对地每点 53.90625，排间 38 步，单台等量火力仍为 4 点之和。[真实攻击周期](../../src/simulation/world.ts#L869) · [武器模式](../../src/simulation/combat/expedition-combat.ts#L59) · [军衔](../../src/data/ranks.ts#L2) |
| B02 困兽夹 | CD 36 秒，同时 1 道。0.20 秒合围时一次捕获 3.5 码内合法敌军，含圈内飞行目标的平面位置。禁移 3 秒，可控首领同窗。 | 保存目标 ID、出生代、锁位和到期步。参照 `fieldRooted` 在移动／碰撞后归位的做法，武器仍执行。新圈外目标继续行进。[固定位置与正常单位更新](../../src/simulation/world.ts#L969) · [场地根缚恢复](../../src/simulation/field-events/pickups.ts#L9) |
| B03 午时已到 | 备派。CD 36 秒，4 名 III 级死神，0.15／0.30 秒两对从可达侧翼进场，驻 14 秒。优先合法远程地面敌人。 | 冻结侧翼可达点，沿原死神武器和目标资格出手。N03 抽中午夜死神则用原生六连射。[空位](../../src/simulation/world.ts#L642) · [精英真实武器](../../src/simulation/combat/terran-elite-runtime.ts#L63) |
| B04 烈焰升腾 | 地面接敌 CD 42 秒，**5 轮×5 发**。首爆第 9 步，排间 **21 步**、排内 **5 步**，按 2＋2＋1 落弹，末爆第 **103 步**。单发取 V 级架坦主炮 **60%**，装备一次。 | 锁五排，相邻落点距一个原外圈半径，隔排偏半格。每发按原三档溅射结算。零装爆心对普通／重甲属性为 86.25／150.9375。场上只出炮迹。N01 后第 81 步落完。[炮型与三圈](../../src/data/sc2-units.ts#L48) · [原架炮结算](../../src/simulation/world.ts#L887) |
| B05 增援以至 | CD 75 秒，两座临时兵营各 3 人。按玩家现有家族和补员优先级轮选，先补正式空席（II 级），满额部分为 III 级临援、驻 22 秒。两营各驻 8 秒。 | 整批先预留 6 个去向再投两营，归属分配按实际出口时序。2 个正式空缺加 4 个临援空间得到 2 正式＋4 临援。N02 的额外成员与工事出兵单列来源。[身体席与订单预留](../../src/simulation/expedition-production.ts#L75) · [投送位置](../../src/simulation/movement/carrier-landing.ts#L10) |
| B06 呼叫舰队 | 备派。有可见敌空军时 CD 60 秒，0.15／0.30 秒两架 IV 级维京分翼，0.60 秒一艘 III 级普通战巡进场。各驻 16 秒，按原武器承伤与净空。 | 3 个真实临援席，优先打合法空中威胁。普通战巡家族待 T06 接入，已有大和英雄是独立身份。备派在上批清场且名额合格时兑现。[分关内容](../../src/simulation/progression/run-content.ts#L79) · [普通战巡依赖](V1X_ROSTER_20261104.md) |
| B07 导弹齐射 | 原三档 `terran.missiles`。首购 3 秒后就绪，CD 24 秒。14 码内按距离和 ID 轮派 4／6／8 枚，基础 60、半径 1.2。原发射间隔 0.20 秒、飞行 0.60 秒。 | 复用原 `SupportPacket` 与锁点，N01 时在建包处修改伤害、半径与发射间隔，保留飞行时长。旧包缺少新半径字段时取原 1.2。已在途的升级前导弹按原量落地。[组包](../../src/simulation/combat/unique-support.ts#L74) · [到点派发](../../src/simulation/combat/unique-support.ts#L68) |
| B08 攻城空投 | CD 52 秒。0.25 秒吊索放下、0.40 秒落定，1 辆 IV 级普通架坦，驻 20 秒，射程 2–13，三档溅射。 | 设置真实实体、军衔与架起模式，给这次临援固定炮位，沿武器就绪时钟开火。死亡或到期只释放该临援席。[取架坦数据](../../src/simulation/combat/expedition-combat.ts#L68) · [开火模式](../../src/simulation/world.ts#L887) |
| B09 火力超载 | 原三档主动 `terran.overdrive`。基础 CD 60 秒、持续 8 秒。武器伤害 +30%／45%／60%，攻频 +20%／30%／40%，移速 +15%。 | 复用原主动、冷却修正和原 `activeRank/activeUntil`。升档保留在途主动时钟与快照。[现有主动入口](../../src/simulation/combat/unique-support.ts#L59) |

### 普通紫卡 · 6 张

| 编号与名称 | 实装参数 | 现有接口、要补的行为与验收 |
|---|---|---|
| P01 战术核弹 | 系统 CD 48 秒，有合法敌军时按上方合同齐射 3–4 发。未学 N05 时手动弹沿原 3 秒前摇，伤害、半径各 ×1.25。系统与手动同时有各自出勤权。 | 新系统钟写 `armed`，原 `support.ammo` 仍是唯一手动库存。没有手动库存也会系统投放。按来源选择首爆、弹数、预算、赠弹与音画路由。[实际库存入口](../../src/simulation/combat/shop-support.ts#L17) · [原伤害常数](../../src/data/shop-support.ts) |
| P02 泰坦降临 | CD 95 秒，第 15 步同时落三台 V 级 `thor.1/.2/.3`，驻 32 秒。武器 ×1.20、甲 +6，每台落地嘲讽半径 5 的可嘲讽普通敌人 4 秒。 | 在专用三个临援席填 `eliteId/modelKey/rank`，调用 `refreshStats` 和对应精英运行时。实际承伤与休整独立，O02 前排复用同一配置。[精英身份与参数](../../src/data/terran-elites.ts) · [临时精英样例](../../src/simulation/world.ts#L778) |
| P03 生化焦油 | CD 50 秒。取威胁较高的一簇最多 5 人，0.15 秒附身、0.30 秒各在脚下形成油斑。附身 6 秒每秒 24，甲 −4、移速 −35%、武器伤害 −25%。地面油半径 2.2、12 秒每秒 20。 | 分别保存目标附着与场地区域。重叠油斑每目标每秒只吃一份，同步附身和地面可各吃一份。`effectiveArmor` 的旧 `acidArmor` 最多扣 3，新增可表达 −4 的武装状态并按属性取最强，甲最低 0。[有效甲](../../src/simulation/world.ts#L710) · [状态类型与恢复白名单](../../src/simulation/combat/statuses.ts) |
| P04 光盾信标 | CD 48 秒，0.20 秒刷出一座 HP 900、甲 2 的信标，驻 8 秒。给半径 7 内友方战斗成员各一次 35% 最大生命的卡盾，每人最少 300、最多 1200，持续 8 秒。 | 卡盾独立台账在原生盾／生命前吸收，每次实际扣量派受击事件。同源取较高剩余量，异源 P04/O01 先耗早到期者。离圈或信标退场保留已发盾。[逐击护盾链](../../src/simulation/combat/expedition-combat.ts#L137) · [伤害观察与盾面反馈](../../src/simulation/world.ts#L809) |
| P05 堡垒空降 | CD 65 秒，4 座在第 12／22／32／41 步落地，各自 24 秒。每座 HP 1100、甲 3、碰撞半径 1.3。距任一座 4 码的友军甲 +3、攻频 +15%，离开 0.5 秒消退。 | 一条防线保留可达通口，狭地转折线。实体落下才参与阻挡和供益，四光环取一份。每座撤去即分别回收该位置、碰撞和光环来源。[通路检验](../../src/simulation/movement/carrier-landing.ts#L10) · [属性刷新](../../src/simulation/combat/expedition-combat.ts#L88) |
| P06 阻隔区 | CD 44 秒，按种子在可达来敌路线选择 7×5 区域。**6 排×4 点**，首排第 9 步，每 12 步一排，末排第 69 步。每点半径 1.4、基础 **41.25**。 | 原 18×55 与现 24×41.25 全区预算均为 990。命中普通地面敌人停步 0.4 秒，每目标再停步至少间隔 1 秒。沿真实落点冻结、命中、禁移三条记录验收。[固定步](../../src/simulation/world.ts#L1157) · [根缚参考](../../src/simulation/field-events/pickups.ts#L9) |

### 紫色节点 · 9 张

节点首次常驻，复选为下次合格动作储备一次强化。备次与来源 CD 分开计，各节点至多 2 备次。双牌节点须同时满足两边的真实就绪／在场条件。相同首排能被多个节点校点时，先前冻结的点有优先权，同步申请先处理 N06，N07 保留原 2 秒窗等下一份支援。

| 编号与名称 | 修改哪些源及参数 | 执行位置与同场验收 |
|---|---|---|
| N01 密集火力 | 对 W01/W04/B01/B04/B07/P01/P06 的虚拟火力，预算 ×1.15、发射／排间／拍间步数除以 **1.35** 向上取整、爆区半径 ×1.20。W01 特化半径 ×1.40、外推地面普通敌人 1 码。复选给下一次合格出勤伤害再 ×1.10。 | 在原来源预约或建包时只改一次。B04 间隔 21／5 步变 16／4 步，第 81 步落完 25 发。B01 保留慢于原生武器的下限。N01 的 B04 落点间距与外圈同步放大，第五发落地才把一排扬尘相接。W01 I 档砸仓 92／3.36。[原导弹建包](../../src/simulation/combat/unique-support.ts#L74) · [武器模式](../../src/simulation/combat/expedition-combat.ts#L68) |
| N02 源源不断 | W01/W02/G03/G05/G06/B03/B05/B06 派遣 CD ×0.80，新增军衔 +1 封顶 V，每批多一名同类，正式满编时额外人转 16 秒临援。工事自身按 **1.5／6 秒**派随机临援，见上表。复选下一批多 1 个临援。 | 出兵钟挂在实际投送 ID 上，左右两座营分别开门。W01 每仓 3→4 人、CD 60→48 秒。G02 单座若完整驻满 30 秒，有 1.5／7.5／13.5／19.5／25.5 五个机会。毁于 7.5 秒之前只可能兑现第一次。[载体落地](../../src/simulation/world.ts#L695) · [原地堡实体](../../src/simulation/combat/unique-support.ts#L76) |
| N03 精英武装 | 普通临援上限 18→24，合格正式／临时援兵逐人额外 25% 成为本家族已准备的合法精英，保留军衔与寿命。复选下一个合格非精英变为 100%。 | 在实际入队时按该乘员的回执生成、保存身份，原精英照原配置。B03 四人样例第二名抽中 `reaper.1` 时，仍是一名死神，沿原 0.055 秒间隔六连射、对轻甲 ×1.8。读档不重掷。[就绪精英池](../../src/simulation/progression/run-content.ts#L102) · [原生六发](../../src/simulation/combat/terran-elite-runtime.ts#L80) |
| N04 特制道具 | G01 索敌 4→5.5、爆区 2→2.5。B02 半径 3.5→4.5、禁移 3→4 秒。P04 原授盾量 ×1.35。W05 嘲讽 5→6.5。W06 上限 4→6 人。复选使下一次道具作用半径再 ×1.20。 | 在道具创建时冻结本次范围与数值。夹具实际多锁住 4 码处敌人。1000 HP 的前排两次各吃 200 后，强化盾余 72.5。来弹侧亮盾，实际耗尽才破。[原雷参数](../../src/simulation/combat/tracking-mines.ts) · [盾量结算入口](../../src/simulation/combat/expedition-combat.ts#L137) |
| N05 焦土战略 | 持 P01 或 O01 系统来源。全轮核伤 ×1.60、基准半径 ×1.30、首爆瞬击，**5–8 发**每隔 4 步发射并命中。每次系统齐射赠 1 枚，手动齐射仅耗 1 枚。复选下一次实际核击整轮预算再 ×1.10，赠弹仍为 1 枚。 | 入口使用上方排程合同。8 个目标、零库存时，系统在 0/4/8/12/16/20/24/28 步实际命中 8 次。玩家手动打第二轮后库存 0，既有两处真实弹迹与各轮冲击。手动来源永远没有赠弹回执。[核击提交](../../src/simulation/combat/shop-support.ts#L18) · [原版爆炸接收](../../src/render/effects/source-combat-effects.ts#L62) |
| N06 落点协同 | W01/B05/P02 之一 ＋ W04/B04/B07 之一。就绪首排先锁落点前方 2.5 码内的合法守军，实际命中普通守军压制 0.6 秒。节点复备 **10 秒**。复选可提前协同一次。 | 在两批排入队列前关联 `castId`。先压住舱门，再按实到时点开仓，压制期间暂停新起普攻，在途弹保留。只有仓就绪时仓照常落。[现有实际出手点](../../src/simulation/world.ts#L860) · [在途武器](../../src/simulation/combat/weapon-flight.ts#L63) |
| N07 阵地观察哨 | G01/G02/W05 有效命中或嘲讽给出 2 秒来向标记，W04/B01/B04 下一合法排校至来向后方 3 码内最近可见远程敌人，节点复备 **6 秒**。复选可提前校射一次。 | 用原目标 ID、来向与锁点，不赋予额外探测。地堡双枪后，B01 同样的一排 12 发越过前排落到后排。目标在校射前不合法则沿原瞄准。[地堡实际开火](../../src/simulation/combat/unique-support.ts#L75) · [目标可见性](../../src/simulation/combat/expedition-combat.ts#L114) |
| N08 封锁火网 | B02/W05 已控制 ＋ G04/P03/G05 的一次真实出勤。G04 出口油带宽 ×1.25 至 3.75。P03 选合法出口敌人附身，脚下油斑半径 ×1.25。G05 调整实际退场位置，挂火半径 2.2→2.75。复备 **14 秒**。复选可提前封路一次。 | 保存控制点、出口与关联批次。夹口打开后，油留原地，退场燃烧跟随实际受击目标。每车只消费一次退场回执。[到期入口](../../src/simulation/world.ts#L834) · [移动与地形通路](../../src/simulation/movement/steering.ts) |
| N09 交班驻防 | W02/G03/B05 的援兵真正抵达 G02/P05 **当前在场**的 4 码防区。每批最多交接 2 人。新兵引敌 1.2 秒，原前排沿可达路径回撤至多 3 码并获 2 秒 20% 减伤。复备 **8 秒**。复选可提前交班一次。 | 保存新兵、老兵、来源工事三个活体 ID 及双方代次，工事退场前未达成则照常入队。转火改后续普攻，在途 100 仍可打中老兵，减伤后取 80。地堡掩护沿原枪次。[目标选择](../../src/simulation/world.ts#L714) · [原命中入口](../../src/simulation/world.ts#L782) |

### 橙色节点 · 3 张

| 编号与名称 | 实装参数 | 现有接口、要补的行为与验收 |
|---|---|---|
| O01 绝境反攻 | 仅正式部队第 10 名真实阵亡触发。全队当步无敌 3 秒，整套 CD 240 秒，冷却中最多缓存一组 10。核弹按系统齐射合同。第 15 步 5 发架坦炮各取 V 级 60%，第 36 步雷神弹幕击穿快照中合法幸存者。尚空的正式席最多补回 10 名同家族同军衔。友方战斗成员获最大生命 100%、最低 1500 的 12 秒卡盾，一名临时 V 级英雄驻 120 秒。 | 先记死亡代次、计数、整次出勤与下次就绪，再造成可能递归触发的伤害。无敌拦截先于耗盾。补回者／英雄得到剩余无敌时长。复用英雄战斗初始化和本局准备身份，临时英雄按本次实体 ID 处理，单独保护常驻同名英雄的部署及复活记录。清场逐目标走单次死亡／掉落。[死亡提交](../../src/simulation/world.ts#L835) · [英雄初始化与部署](../../src/simulation/combat/expedition-heroes.ts#L42) |
| O02 轨道远征军 | CD 150 秒。开路炮改为 **4 发各 70**，半径 2，落在第 6／9／12／15 步。第 15 步与 P02 同规格三台 V 级精英雷神落地。第 4 秒 V 级 `tank.1` 豹石、`tank.2` 虎式就位，各驻 30 秒。第 8 秒 V 级普通战巡入场，驻 32 秒。各雷神驻 32 秒，协同推进窗 24 秒。 | 六员整批预约专属席，各按自身到场起算寿命。开路炮总预算 280。三台雷神与 P02 共用一份实体配置，豹石行进、虎式架炮，战巡先截空再转地面。依赖 T06 普通战巡。[精英目录](../../src/data/terran-elites.ts) · [实体武器](../../src/simulation/combat/expedition-combat.ts#L68) · [T06](V1X_ROSTER_20261104.md) |
| O03 行星要塞空投 | 小队守在同一 3 码阵地接敌 2 秒，CD 180 秒，0.35 秒落地，本座驻 60 秒。HP 12000、甲 12、射程 10。基础炮改为 **每 45 步 90**（120 每秒）。每实损 1500 HP 蓄 1 发贯穿，最多存 2、至少 3 秒一发。贯穿长 12、宽 2.4、基础 640，每发开侧门出 3 名 III 级枪兵驻 12 秒。小队离阵 6 码时单次遣 3 人殿后。 | 从 `World.hit` 真实应用后的 `before − hp` 累计本座承伤，修理、盾吸收和画面火花不充能。1499＋1 才蓄满，出勤结束后丢弃本座蓄能。先核实要塞原版资产与 `Fortification.kind` 的新映射。[实际生命扣减](../../src/simulation/world.ts#L804) · [工事视图](../../src/render/scene/battle-renderer.ts#L976) |

## 拟新增接口与数据所有权

**火力布点。** `f` 取预约时从队锚到首个合法目标的单位方向，重合时取当前队伍朝向。`s` 为其地面垂直方向，`C` 为已锁定的点。W04 五发依次落在 `C + i·f`，`i = 0…4`。B04 使用架坦外圈半径 `R`，第 `r` 排、第 `c` 列的点为 `C + r·R·f + (c − 2 + 0.5·(r mod 2))·R·s`，`r,c = 0…4`。列 0/4、1/3、2 各归一拍。N01 后用放大的 R 生成整批。B01 用三道并行弹道各四点，第 `j` 个小落点的横偏为 `(j mod 3 − 1)·R`、纵偏为 `(floor(j/3) − 1.5)·R`，`j = 0…11`，此处 R 为本次弹幕小爆区半径。P06 在种子选中的区块中心沿来向切 6 排，每排 4 列，纵偏 `r − 2.5`，横偏 `7·(c/3 − 0.5)`。先择可容纳图形的朝向／中心，边界按核击相同的有限向内缩点规则处理。一次锁点后所有子弹都使用保存的位置。

**协同时序。** N06 仅关联尚未冻结的两份就绪出勤。若选中飞行 0.60 秒的 B07，保留真实弹时，使新预约的运输至少在首排命中后一个固定步落地，开门／成员寿命从真实落地推导。已经落地或发射的回执继续执行原时点。N02 以 `pod.id + landedAt` 或部署 ID 开一次出兵钟，普通载体在 `active/opening` 间反复切换也不重启。地堡到期、兵营完成投送的同一步先关门，余下计时随本次物件释放。

建议将静态定义放在 `src/data/terran-armed-support.ts`，动态结算放在 `src/simulation/combat/armed-support.ts`。现有文件保留原入口，调用以下明确的钩子。新增字段使用本局固定步序号，原接口若使用秒数，在接入处按 `tick / 60` 转换。

| 拟新增的调用 | 调用者、返回与状态修改 |
|---|---|
| `armedOfferLegal(w, cardId): boolean`、`applyArmedPurchase(w, offer): boolean` | 前者纯读。后者在 `purchaseOffer` 已核资格和钱包后应用一次效果或备次。购买函数统一扣价、标记售出与记录进度。原卡映射仅调用一次 `buySupport`，新增层级／来源与原执行器共用同一份效果。 |
| `claimBuildChoice(w, milestoneId, expectedRevision, cardId): boolean` | 从已冻结的里程碑候选领取节点。校验当前关间、未锁或已锁本支、候选 ID、修订号和重复领取。第一次领节点时同笔写入主分支并关闭其他分支待领机会。紫节点免费，橙色三选一走一次正常报价扣费。成功后标记领取并应用节点，同一个里程碑的失败重试仍显示原来的候选。 |
| `reserveArmedDispatch(w, cardId): number \| null` | 校验触发条件、目标、内容身份、整组可行位置、正式空席和临援余量。所有可失败准备先完成。成功时生成出勤号、预约点和乘员，更新 CD／备次。失败为 `null`，保持待命。 |
| `tickArmedSupport(w): void` | 每步一次处理到期、待落地、应出乘员、核击游标、区域与状态。相同步内依因果顺序处理，独立的并列事件按出勤号和子序号稳定排序。`landTick` 变动时，以实际落地步重新推导本建筑各个出口的到期步。 |
| `onArmedWeaponCycle(w, shooter, target): void`、`onArmedMemberDeath(w, victim, forced): void` | 分别接到 `World.fire` 的实际出手点与 `commitUnitDeath` 已确认死亡后。前者用 `id/bornAt/shotSequence` 防止多段命中续排。后者区分正式身体、临援、召唤、退役与任务专属物，按稳定的正式战损回执累计。无需给炮弹伪造一个开枪的友军。 |
| `onArmedFortHealthLoss(w, fort, lostHp): void`、`endArmedDeployment(w, id, reason): void` | 要塞只读本次实扣生命。销毁、到期与清关统一收尾，原因区分战死、正常撤离与场景结束。G05 的战斗退场才挂撤离火，清关只回收。通过已消费标记避免同时死亡与到期产生两份烧伤或两笔驻军。 |
| `commitArmedNuke(w, origin, center, parentCastId?): boolean` | 普通手动无分支且无自定义量时仍走原实现。新系统或焦土路径生成已验证的整轮，将仓库变动、批号、游标和首次发射视为一个同步动作。`World.atomicMutation` 是世界内部的通知合并，私有且不提供回滚。由世界包装入口调用，提交阶段不再做会失败的查位／抽身判断。[已有私有边界](../../src/simulation/world.ts#L164) |

| 状态位置 | 最少保存字段与校验 |
|---|---|
| `expedition` 的共用构筑状态（新增） | 按分支的有效进度、已锁主分支、已领里程碑、待领的冻结候选与顺序、橙资格和成交回执。货架层使用已有 `shopRevision/offerId/purchaseReceipt`。重载同一报价不重抽。 |
| `expedition.support.armed`（新增） | `ranks`、普通备派、节点备次、各来源 `readyTick`、主攻弹幕 `activeUntil/nextRowTick`、正式死亡短表和 O01 冷却计数。旧档无此对象时以空对象初始化，原支援从现有 `levels/unique.levels/ammo` 读取，旧取得不补算新的分支里程碑。 |
| `armed.volleys` 与延期子事件 | `castId, origin, stageKey, points, firstTick, gapTicks, damagePerHit, blastRadius, nextIndex`。写入整批即已处理本次 `ammoDelta`，恢复只走剩余游标。验证位置有限、模式对应发数、`0 ≤ nextIndex ≤ points.length`、步序及来源合法。手动在途状态由未结束手动批和旧手动弹派生。 |
| `armed.deployments` 与支援乘员 | 每个部署具独立 ID、来源、阶段、冻结落点、时钟和剩余真实席位。记录 `castId/slot/index`、家族／军衔／精英、正式或临时、已出的实体 ID、结束原因。跨来源预约按唯一正式空席／战损回执校验。`temporaryKind` 拟扩展武装枚举。在实体上记录出勤号。尸体或过场残影不占活动席。 |
| `armed` 的区域、盾与控制记录 | 以来源出勤 ID 和目标 `id/bornAt` 标识油区、附身、嘲讽、捕获位置、减甲、减伤、盾余量、到期步和下一跳。持续效果在注册、到期及恢复时统一重建查询索引。减速同属性取强，移速减幅上限 65%，禁移单算。甲最低 0，同属性减甲取强。P04/O01 卡盾先承伤，同源取较高余量，无敌期间保持盾量。 |
| 存储与特殊关 | `validateExpedition/validateRunData` 校验新联合类型、引用及上下限，保留当前可读旧档和旧 `impacts` 的原值。完整测试快照在批中恢复。实际玩家保存仍是原账户、检查点、两份备份及多页冲突保护。特殊关按 `parkNormalWorld` 挂起母战场，子场清除复制来的部署／飞弹／临时席，只带该模式准入的已学能力。返回恢复原母场物件及其剩余寿命，按既有差量规则合并合法弹药变化。不得在子场把同一母场齐射再赠一次。[特殊关入口](../../src/simulation/special-stages/bridge.ts#L27) · [返回与库存差量](../../src/simulation/special-stages/bridge.ts#L82) · [快照验证](../../src/simulation/persistence/run-fields.ts#L70) · [备份事务](../../src/persistence/save-repository.ts#L8) |

**补员和清场的最后一步。** 出兵先兑现已有承诺，按可用正式身体席分配，其他临时通道受自己的上限约束。新单不能吞掉旧单的身体席、军衔训练或付款回执。O01 第十名若恰是最后一名战斗成员，已成功预约的这次救场允许世界等到本批第 36 步补员与英雄入队再做全灭检查，之后立即按真实在场人数判定。无敌只拦本窗口内的来袭，固定服役到期照常撤离。敌军清场在原受击资格和任务门控之后按实际剩余盾／生命兑现，随后共享原死亡和奖励回调。临援离场、清关回收、重复快照均不能给正式战损加一。[最后一人判负](../../src/simulation/world.ts#L1198) · [受击与死亡分支](../../src/simulation/world.ts#L782)

**旧卡与新来源。** G01、G02、G07、G08、B07、B09 的运行时效果依次承接 `mines`、`terran.bunker`、`terran.ricochet`、`mutation`、`terran.missiles`、`terran.overdrive`。原 `strategic` 的购买行为只给玩家加一枚库存。P01 是新自动来源，W04 是新五发炮击，两者都需要新的分支卡身份。旧 `bombardment` 等级、倒计时和旧 `impacts` 由旧执行器结清，读档不把它们转换成一次新齐射。[原支援取得](../../src/simulation/combat/shop-support.ts#L15) · [原货架映射](../../src/simulation/progression/expedition-drafts.ts#L193)

## 画面、音频与资源接点

- **空投与工事。** 当前资源注册中 `model.barracks`、`model.barracks.death`、`model.fort.bunker`、`model.fort.bunker.death`、`model.fort.turret_terran` 均为 `available`。兵营沿 `RESCUE_PRESENTATION.terran` 的实际载体模板。可提取 `PodView` 的落地／出门表现给武装载体，普通救援标签和护卫逻辑仍由真正的普通 Pod 持有。扩充 `BattleRenderer` 的入场视图集合，让多座预落地物件与落地工事复用自己的 ID，并在各自退场时释放 mixer、视图和循环声。[运行资源表](../../src/assets/runtime.generated.ts) · [载体视图](../../src/render/units/pod-view.ts#L34) · [工事创建](../../src/render/scene/battle-renderer.ts#L976) · [落地与回收](../../src/render/scene/battle-renderer.ts#L1132)
- **核弹。** 每个真实子弹命中向 `World.visual` 发一个 `strategic-impact`，沿人族无英雄／精英的支援来源（`entityId === 0`）进入 `SourceCombatEffects` 的 `GhostNukeExplode` 原版路由。拟给表现事件补 `castId/impactIndex/blastRadius`，原事件使用原默认尺寸。画预警和爆区都按本发半径，原通用层有写死半径 8 的位置。普通延迟核击沿真实前摇播首发提示。焦土瞬击在首发步起效。旧音频会按每条 `impacts` 的 `at−3/at−1` 扫描发射提示。新轮的发射提示按批号一次，命中声与原模型按各子弹时点调度，恢复只播尚未发生的声音。[原版核爆识别](../../src/render/effects/source-combat-effects.ts#L62) · [原模型生命周期](../../src/render/effects/source-combat-effects.ts#L130) · [通用尺寸](../../src/render/effects/nonhero-effects.ts#L72) · [原发射音轨](../../src/render/effects/combat-audio-router.ts#L160)
- **增援身份。** `prepareSnapshotAssets` 和分关准备都要纳入本局已买牌可能出勤的普通、精英、英雄和工事，以及快照中尚未入场的已承诺对象。检查发现当前普通战巡 `model.battlecruiser` 与拟用要塞键 `model.fort.planetary` 未注册，注册表也没有 `planetary` 命名项。B06/O02 依赖 T06 普通战巡。O03 要补要塞的原版出处、动作、声音与注册。P05 在指定堡垒原型及其真实资源后接入。大和英雄资源已注册，但不能替代普通战巡。资料不足记入对应任务，保留可追踪的资源依赖。[分关预载](../../src/app/battle-scene-preload.ts#L22) · [恢复制备](../../src/render/scene/battle-renderer.ts#L923) · [战巡家族范围](V1X_ROSTER_20261104.md) · [资源来源](../DATA_SOURCES.md)

## 实装顺序与验收夹具

| 顺序 | 开发与判定条件 |
|---|---|
| 1 · 关间成交 | 接通卡牌定义、报价、基础进度、节点选择与兼容默认值。用 W01→复购 W01→W04→G01 验证进度 1→1→2→3。重复购买同一售出项、重开关间和另一页面的过期写入均只保留一笔成交。 |
| 2 · 独立出勤 | 用 W01/W02/G02/B05/P05 做单座、双座、四座。查空地、被占、一次落地、毁于出兵前、到期同刻、跨关清理。普通 Pod 仍走守卫和已付乘员流程。B05 在场时 G02 仍可独立落地。G02 正常双枪，新信标和 B05 都不会凭空开双枪。 |
| 3 · 真实弹点 | W04 输入一条窄线得到 5 发。B01 单排 12 发。B04 基础 25 发／15 拍／103 步末爆，带 N01 为 25 发／15 拍／81 步。P06 六排 24 点、全区裸装预算 990。用同种子、同装备、相同前后排站位分别记每目标命中数、护甲后掉血和实际落点。 |
| 4 · 核击与库存 | 仅 P01，1 个目标→3×800，4 个目标→4×600。P01＋N05，6 个目标→6×640，8 个目标→8×480，库存各只 +1。8 目标齐射时立即手动点另一处，库存从 0→1→0，手动 8×1500。目标在途移动不重定位。手动空地按最低数，非法中心不扣弹。 |
| 5 · 快照与竞争 | 分别在首发前、8 发中的第 3 发之后、工事已落但尚未出兵、第二座营将退场时用 `captureRun/restoreRun` 对照持续运行。核击恢复只有 5 个待发，不重赠、不重扣。两个补兵来源争同一空席不会创建两名正式兵。特殊关来回不把部署复制进第二个战场。 |
| 6 · 节点与终极 | 每个 N 节点用上表的基础组合和复选各走一次。O01 测第十次正式阵亡、最后一人、冷却中再满十、无敌期间扣盾、120 秒英雄撤离。O02 用同一波对比 P02 三台雷神再验证两车一舰能实际攻击。O03 用 1499＋1 实扣、修满、离阵、到期重新出勤检查独立计数和单次殿后。 |

首批回归从现有 [商店核击与数值](../../test/g02-balance.test.ts)、[原独有支援时序](../../test/race-fun-timing.test.ts)、[原核爆生命周期](../../test/nuke-beam-lifecycle.test.ts)、[生产订单](../../test/expedition-production.test.ts) 和 [检查点与失败保护](../../test/d05-checkpoint.test.ts) 开始。以上六组是 R3 实装后的验收要求，游戏内清群、首领耗血、密集爆炸的实际渲染与音频开销以 1.4 同场测量为准。

**本次规格核验。** 已核对 45 个唯一编号与每张的实际源码接点。从本文直接取出核击排程，用项目的 TypeScript 7.0.2 严格检查并执行，132 组来源、节点和目标数输入通过。另核对边缘缩点、齐射中途保存游标、系统／手动 8＋8 发、两档架坦末爆步，以及工事到期与开门同刻的优先级。独立 `World` 复现了现版手动核弹扣一枚并在 3 秒后命中、人族兵营 3.266 秒落地、原地堡落地后驻场 30 秒。8 个现有定向测试文件共 103 项通过，`npm run docs:check` 通过。这些覆盖既有游戏入口与文档算法，R3 的实战结果按上方夹具验证。
