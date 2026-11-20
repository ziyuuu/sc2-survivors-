# 虫群增殖：45 张卡实现接口规格 R2

2026-11-20。依据[已确认数值 R3](ZERG_SWARM_45_REVIEW_20261120.md)。用户已确认其余卡牌数值，并明确感染孢子“仅爪击、骨刺等物理武器；酸液／毒液普攻也排除”。本文件给出源码接入点、待增加的数据结构、结算顺序和开发验收项；**本轮未实现卡牌运行时，也未运行游戏验收**。

本地核对的是当前工作区。虫族六单位已接入正式家族／发展／生产、战役／无尽敌军及独立体验敌群，当前实现范围以[六单位正式接入结论](../../reports/qa/zerg-six-integration-20261120.md)为准；第三阶段的真机、自然长轮及部分组合验收仍开放。本文件的45张卡运行时尚未实现，不能用六单位接入完成代替卡牌验收。

## 1. 确认结果

可以在现有单一 World、60 Hz 模拟、订单账本和存档系统内实现，不需要第二套战斗模拟。现有接口不能原样拼装全部效果，以下扩展属于必要工作：

| 接口 | 当前源码事实 | 本分支处理 |
| --- | --- | --- |
| 卡牌分支 | `BuildBranch` 只有 armed／doomsday／bio；`buildNodeLegal` 限人族 | 增加虫族分支元数据和统一查询，保留人族旧分支规则 |
| 节点复选 | 当前节点使用一次性 `nodeReserves`，候选优先填未持有牌 | 虫族节点按永久 1–3 档保存；第二、三次节点提供已有节点升级位 |
| 命中资格 | `World.hit` 有 ordinaryWeapon／direct／dot／derived；没有物理／法术枚举 | 增加原始攻击来源上下文，物理普攻资格集中判断，不能把所有 `hit()` 当普攻 |
| 致死顺序 | `World.hit` 内会直接提交死亡；外层普攻回调可能已在死亡之后 | 孢子播种落在真实命中确认后、死亡提交前；孵化放到唯一死亡事务中 |
| 正式投放 | `DeliveryLedger`、`DeliveryPassenger` 和 Pod 使用同一乘员下标 | 主脑占用原订单乘员的交付权；不复制订单、不伪造已经完成的培养 |
| 临时母体 | 六单位的 `zergSix.temp` 专门表示蝗虫、巢虫、受控体，改变原生战斗路径 | 卡牌临时母体使用独立 `zergSwarm` 来源，保留普通六单位技能 |
| 毒爆 | 现行友方毒爆爆炸后进入恢复，部分旧临时来源才一次性退场 | G02及其追加批次增加明确的一次性爆炸标记，不能只设 temporary |
| 复活 | 跳虫同伴补生、尼雅德拉与装备复活有各自预留和执行路径 | 用统一死者／席位回执仲裁本支复活，只允许一个结果消费原席位 |
| 双英雄 | `HeroRecord.entityId` 绑定一个身体；投影虽能复制英雄，但有期限且不能复活 | 增加同一英雄身份下的双身体记录，共享等级、装备、主动技能CD |
| 光环与装备 | 多处以永久身体、原英雄 entityId 判断资格 | 单独扩展本支临时兵的可用属性／光环资格和英雄分体绑定，不能靠临时改成正式 |
| 存档 | 当前 `RUN_SCHEMA=26`，入口严格核对版本，实体／分支有白名单校验 | 实施时升至27，提供26→27无奖励迁移；新增状态逐项登记验证 |

实际入口与45张覆盖清单见[接口映射](zerg-swarm-interface-map-20261120.json)，可用 `node tools/qa-zerg-swarm-interfaces.mjs` 重跑文本声明锚点、卡牌覆盖与数值文件状态核对。它是静态清点，不冒充类型检查或战斗测试。

## 2. 命名、代码边界与卡牌入口

固定命名：

- `BuildBranch` 新增 `'zerg-swarm'`；完整牌 ID 为 `ZSW-W01` 至 `ZSW-O03`。界面可显示短编号 W01–O03。
- 运行状态为 `ExpeditionState.zergSwarm`，实体扩展为 `Entity.zergSwarm`。**不复用 `World.swarm` 或 `src/data/swarm.ts`**，它们已有敌军／战役用途。
- `temporaryKind` 增加 `'zerg-swarm'`。主脑／坑道／卵为展示和交付记录，不伪装成有生命的正式／临时作战单位。
- 未持本分支的旧局不创建大批状态，也不启动周期计时器。第一张卡成交时初始化；合法旧局读档不补发牌、进度、孵化或英雄。

计划新增以下文件，**本轮只确定职责，尚未创建这些运行时文件**：

| 文件 | 职责 |
| --- | --- |
| `src/data/zerg-swarm.ts` | 45张配置、三档参数、配方、价格引用、来源白名单、卡牌说明生成 |
| `src/simulation/combat/zerg-swarm-state.ts` | 保存用DTO、等级查询、实体／席位资格、校验和读档重建 |
| `src/simulation/progression/zerg-swarm-acquisition.ts` | 购买／节点领取、立即效果、复选计时比例、扩编和待绑定选择 |
| `src/simulation/combat/zerg-swarm.ts` | 主tick、属性／伤害／吸收甲壳查询、物理命中入口和调用编排 |
| `src/simulation/combat/zerg-swarm-spawn.ts` | 配方、批次、主脑交付、临时兵创建、最高军衔、寿命、容量与退场 |
| `src/simulation/combat/zerg-swarm-spores.ts` | 孢子标记、传播、致死孵化、突变和独立随机流 |
| `src/simulation/combat/zerg-swarm-revival.ts` | 正式战损、复活候选仲裁、共享席位、替身和复活分裂 |
| `src/simulation/combat/zerg-swarm-heroes.ts` | 永久双身体、共享技能CD、单体重生与整体阵亡 |
| `src/render/effects/zerg-swarm-effects.ts` | 已结算事件的投放、孢子、分裂、甲壳及消散表现；不产生伤害 |

不为45张牌各建一套tick，不增加通用事件总线框架。用少量明确钩子和数据表组合已有单位能力。

### 商店与节点

扩展 `BuildCardId`、`buildCard`、`buildCardBranch`、`buildCardRank`、`buildNodeLegal`、`validateBuildProgress`，按分支元数据判断种族，不把 `race==='terran'` 直接删成“所有种族任意领取”。人族不能买虫族牌，虫族不因此获得人族节点。

`ExpeditionOfferEffect` 增加 `{kind:'zergSwarm',cardId,expectedRank}`；`draftContext` 提供合法性查询；`drawExpeditionReinforcements`、权重分组、价格查询、`canTakeExpeditionOffer`、`purchaseOffer` 和节点领取加入同一路径。普通牌价沿现行对应品质价格配置，免费节点沿既有节点流程，不新设货币。

成交过程必须是原有 `World.atomicMutation` 的一次事务：复核 offer ID／修订号／expectedRank→确认选择和支付→更新本支永久等级→执行唯一即时效果→写购买回执→加有效分支进度→立刻锁主／生成节点。重复请求返回旧结果，不能再次扩编、重抽部队、刷新CD或生成英雄。

虫族节点直接写 `ranks[ZSW-Nxx]=1/2/3`，**不得写 nodeReserves 表示第二、三档**。人族既有储备型节点保持。节点候选先选一个合法已持未满档升级项，再填未持项；已冻结的三候选读档保持，N04前置B01、P02高级空军池条件在生成与成交时都核验。

本轮只注册已确认的这一支，不虚构其余两支虫族牌。现有虫族公共支援牌不静默改成ZSW、不自动回填进度；其旧临时兵也不误领本支加成。是否在后续整理旧公共牌池另按明确设计处理。

## 3. 保存的数据契约

以下是需实现的接口草案，不表示当前代码已有这些类型。全部为数据，不含 World、函数、DOM、Three对象或缓存引用。

```ts
type ZswRank = 1 | 2 | 3;
type BodyRef = { id: number; bornAt: number };
type SeatKey = string; // 正式部队槽序号＋该槽内席位序号；跳虫两体共一席
type ZswOrigin =
  | 'periodic' | 'overflow' | 'companion' | 'spore'
  | 'death-split' | 'replacement' | 'live-split' | 'revival-split' | 'echo';
type SwarmRankPolicy =
  | { kind: 'highest' }
  | { kind: 'capped'; ceiling: number }
  | { kind: 'source'; rankAtEvent: number; subtract: 0|1 };

interface ZergSwarmState {
  version: 1;
  ranks: Partial<Record<ZswCardId, ZswRank>>; // 橙卡只能是1
  purchases: { offerId: string; cardId: ZswCardId; rank: ZswRank; progress: 0|1 }[];
  rng: { offers: number; spawn: number; spores: number; revival: number };
  nextBatch: number;
  nextDeath: number;
  clocks: Partial<Record<ZswCardId | 'overflow', SwarmClock>>;
  batches: SwarmBatch[];
  expandedSlots: number[]; // 仅原五个槽，唯一、最多3个
  pendingExpansion: number; // 已取得但当前部队数不够的次数
  seats: SwarmSeat[];
  deliveryClaims: SwarmDeliveryClaim[];
  spores: SwarmSpore[];
  revivals: SwarmRevival[];
  echo: { counted: 0|1|2; rotate: number; pending: SwarmEcho[] };
  splitCursor: number;
  sharedReady: { hatch: number; loss: number; shell: number; replacement: number };
  heroTwin?: SwarmHeroTwin;
}
interface SwarmClock {
  period: number;
  nextAt: number;
  firstPending: boolean;
  pendingBatch?: number; // 同源最多一批
}
interface SwarmRecipePart {
  family: FamilyId;
  elite?: EliteId;
  count: number; // 配方份数，不是把跳虫对当一只
  bodiesPerPart: 1 | 2;
  rank: SwarmRankPolicy;
  baseLife: number;
  oneShotBaneling?: true; // G02及其派生，其他来源不被偷偷改成一次性
  cloneOf?: BodyRef;
}
interface SwarmBatch {
  id: number;
  cardId: ZswCardId;
  cardRank: ZswRank;
  origin: ZswOrigin;
  rootBatch: number;
  parentBatch?: number;
  baseRecipe: SwarmRecipePart[]; // O03前的已冻结配方；N06从这里取
  recipe: SwarmRecipePart[]; // O03只计算一次后的配方
  queuedAt: number;
  readyAt: number;
  firstBornAt?: number;
  releaseUntil?: number; // firstBornAt+6
  rootNotified: boolean;
  deliveredParts: number[];
}
interface SwarmMember {
  cardId: ZswCardId;
  origin: ZswOrigin;
  batchId: number;
  baseLife: number;
  spawnedAt: number;
  expiresAt: number;
  oneShotBaneling?: true;
  explosionSpent?: true;
  cloneOf?: BodyRef;
  matureTier: 0|ZswRank;
  birthHaste?: { until: number; attack: number; move: number };
  frenzy?: { until: number; attack: number; move: number };
  shells: { source: 'W06'|'G08'; amount: number; until: number }[];
}
```

正式席位／复活／孢子的必要字段：

```ts
interface SwarmSeat {
  key: SeatKey;
  slot: number;
  ordinal: number;
  family: FamilyId;
  members: BodyRef[];
  pairId?: string;
  reviveReady: number;
  rebirthSplitReady: number;
}
interface SwarmSpore {
  target: BodyRef;
  until: number;
  appliedBy: 'physical-hit'|'spore-projectile';
  lastReceipt: string;
}
interface SwarmRevival {
  deathId: number;
  seat: SeatKey;
  dead: BodyRef;
  snapshot: Entity; // 原兵复活快照，按现有DTO方式保存；不是用于复制临时兵
  at: number;
  chancePassed: boolean;
  hpFraction: number;
  settled: boolean;
}
interface SwarmDeliveryClaim {
  jobId: number;
  passengerIndices: number[]; // 原始账本下标，不能重排后再索引
  carrierId: number;
  claimedAt: number;
  readyAt: number;
  released: number[];
}
interface SwarmHeroTwin {
  heroId: HeroId | null; // null表示待绑定第一名英雄
  primary: BodyRef | null;
  twin: BodyRef | null;
  regrowAt: number | null;
  missing: 'primary'|'twin'|null;
  groupDown: boolean;
  lastCastReceipt: number;
}
```

请求与回执补充定义：

```ts
interface SwarmBatchRequest {
  cardId: ZswCardId;
  cardRank: ZswRank;
  origin: ZswOrigin;
  recipe: SwarmRecipePart[];
  triggerReceipt: string; // 同一事件重入只返回既有批次ID
  delay: number;
  parentBatch?: number;
  eventHighestRank?: number; // 死亡事件在移除死者前冻结的R
}
interface SwarmEcho {
  sourceBatch: number;
  readyAt: number;
  cardRankAtTrigger: ZswRank;
  recipe: SwarmRecipePart[]; // 已取完份数的原始配方，尚未造兵
  settled: boolean;
}
interface SwarmDeathReceipt {
  id: number;
  body: BodyRef;
  at: number;
  reason: 'combat'|'expired'|'spent'|'retired'|'transition';
  role: 'formal'|'hero'|'temporary'|'normal-enemy'|'experience-enemy'|'other';
  seat?: SeatKey;
  rankBeforeDeath: number;
  highestFormalRankBeforeDeath: number;
  sourceAttack?: SwarmAttackOrigin;
  rewardSettled: boolean;
  swarmSettled: boolean;
}
interface HeroCastRequest {
  requestId: string;
  battleView?: BattleView; // 沿既有英雄入口，不增加新的战斗技能按钮
}
```

`ZswCardId`由45张`as const`配置推导。`FamilyId`、`EliteId`、`Entity`、`HeroId`、`World`和`BattleView`沿项目既有类型；请求只由本地模拟／现有选择事务调用，不新增联网API。公开函数用显式返回值报告无目标、无容量或已结算，不通过异常重试重复生成。

每个原生攻击轮另有冻结上下文和去重凭据。攻击者已阵亡、弹体仍飞行时继续用发射时的身份，不因当前查不到源身体而把它误判成技能或丢弃资格；复活／换族生成的新身体不能接管旧弹体的回执。

缓存不保存：临时母体活体Set、按部队槽查询的席位索引、附近4／6范围计数、渲染载体句柄。读档由已保存实体和批次重建，不重新抽随机、不发出生事件。

## 4. 物理攻击与孢子接口

### 已确认的物理武器白名单

已确认：感染孢子不能由任意伤害触发，只能由正式兵的合格物理攻击命中触发。**现行源码没有可直接复用的 physical 字段**，也不能用攻击动画、是否有飞行弹体、是否近战或 `armorPenetration===0` 代替。

用户答复已收口为“仅爪击、骨刺等物理武器；酸液／毒液普攻也排除”。`isSwarmPhysicalPrimary()` 必须同时检查正式普通／精英攻击者、原始普攻主目标、真实命中及下列武器白名单；**native-weapon 不等于合格物理武器**。W03、B03 自带播种及传播、N05 自带播种共用此入口，未知武器默认不合格。仅新增本分支的触发资格，不改全游戏伤害或护甲分类。

下列 `weaponKey` 是待实现的规范化键，格式为「家族／实际武器或明确适配键」，不是声称现有实体已保存这些值。已有多武器家族优先读取出手时的 `activeWeapon`；基础单位没有活动武器ID的路径使用下表的明确映射，不能按“攻击范围近”或统一兜底猜测。实际武器无法识别时不使用默认武器绕过白名单。

| 合格普通武器 | 规范化 `weaponKey` | 当前源码依据及边界 |
| --- | --- | --- |
| 跳虫爪击 | `zergling/Claws` | `SOURCE_PRIMARY_DAMAGE_EFFECT.zergling` 的Claws效果映射 |
| 刺蛇骨刺／原生近身物理攻击 | `hydralisk/NeedleSpinesDamage` | 当前共用NeedleSpinesDamage效果；近身仅按HYDRALISK_MELEE调整攻击周期 |
| 虫后对地爪击 | `queen/Talons` | `SOURCE_WEAPONS.Talons`；双击仍属一个原始攻击轮 |
| 虫后对地物理投射 | `queen/TalonsMissile` | `SOURCE_WEAPONS.TalonsMissile`；不把其他虫后武器一并放行 |
| 潜伏者地刺 | `lurker/LurkerMP` | `SOURCE_UNIT_MODES.lurker_burrowed.weapon`；现行合法地表适配同源，穿刺只对主目标判定 |
| 雷兽巨刃 | `ultralisk/KaiserBlades` | `SOURCE_WEAPONS.KaiserBlades`；范围次级伤害不触发 |
| 畸变体普通横扫主目标 | `aberration/primary-cleave` | 新增适配键，对应zergSixInstant的普通主目标attackHit；横扫次目标和受击反击均排除 |

上述源码映射来自 `src/data/expansion-upgrades.ts`、`src/data/expansion-units.ts`、`src/data/sc2-units.ts`、`src/simulation/combat/expedition-combat.ts`、`src/simulation/combat/zerg-six.ts` 及 `World`。普通／精英沿实际同源武器映射；精英技能和追加段不能借用普通攻击键。

| 来源 | 被动播种／传播 |
| --- | --- |
| 上表物理武器的正式普通／精英普攻主目标 | 合格，每原始攻击轮最多一次 |
| 蟑螂／破坏者酸液、吞噬者酸性喷射、感染虫感染弹、飞蛇腐蚀喷吐等酸液／毒液普通武器 | 不合格，不耗孢子概率／CD；即使走普通攻击接口也排除 |
| 虫后对空酸性骨刺 `queen/AcidSpines` | 不合格；与Talons／TalonsMissile按实际活动武器分开 |
| 飞龙GlaiveWurm刃虫、腐化者ParasiteSpore、巢虫领主共生虫投射 | 不在物理武器白名单，不把生体／孢子投射自动视作骨刺；宿主母体没有直接普通武器 |
| 六单位主动齐射、感染技能、飞蛇拉拽／腐蚀云、胆汁技能、反击技能 | 不合格，即使瞬时造成直接伤害 |
| 感染DOT、毒雾、燃烧、反伤、装备追加、卡牌撕裂追加 | 不合格，不耗被动孢子概率／CD |
| 飞龙弹射副目标、范围溅射次目标、多弹同一原轮的后续段 | 不重复掷骰，不因多目标放大概率 |
| 毒爆自爆、召唤子虫、临时兵、受控敌人、英雄及分体 | 不合格，沿已确认正式普通／精英攻击者范围 |
| G07／P05孢囊 | 独立的明确施加接口；不伪装成物理攻击，不被普攻门禁挡掉 |

### 待增加的钩子

```ts
interface SwarmAttackOrigin {
  attackId: string; // 源id＋bornAt＋原始shotSequence
  source: BodyRef;
  formalAtLaunch: boolean;
  weaponKey: string; // 出手时冻结的规范化实际武器键，必须匹配白名单
  kind: 'native-weapon'|'native-ability'|'dot'|'reflection'|'equipment-proc'|'card-proc';
  primary: boolean;
  derived: boolean;
}
interface SwarmResolvedHit {
  origin: SwarmAttackOrigin;
  target: BodyRef;
  hpLost: number;
  shieldLost: number;
  barrierAbsorbed: number;
  landed: boolean;
  lethalPending: boolean;
}
function isSwarmPhysicalPrimary(w: World, hit: SwarmResolvedHit): boolean;
function onSwarmResolvedHit(w: World, hit: SwarmResolvedHit): void;
function applySwarmSpore(w: World, target: Entity,
  source: 'physical-hit'|'spore-projectile', receipt: string): void;
function onSwarmEnemyDeath(w: World, death: SwarmDeathReceipt): void;
```

`landed` 由实际结算产生：闪避、无敌拒绝、视野丢失落空、已死亡目标均为false；HP／原生盾／吸收甲壳产生有效损耗可算命中，不要求必须扣到红血。先检查来源和物理武器白名单，再检查播种／传播；酸液／毒液普攻、技能等不合格来源不消费孢子随机数、不进入1秒尝试冷却，也不刷新或传播已有标记。

合格来源按 **原始攻击轮＋主目标** 去重；1秒尝试间隔从尝试计，失败也消耗。原本未标记者只尝试植入，同一击不能刚植入就继续传播；原本已有标记者按B03一次传播并刷新原标记，转播标记不递归。

接线方式为扩展现有 `World.hit(..., impact)` 的对象参数，增加可选 `impact.origin`；`attackHit`的frozen对象、`WeaponFlight`和穿刺区域记录逐路携带同一上下文，不再增加一串位置布尔参数。**没有origin或可识别weaponKey不能默认认成物理普攻**；`ordinaryWeapon=true`也不足以放行，因为现有APM／其他追加路径可能同样传true。六单位普通攻击与主动齐射分别填native-weapon／native-ability；飞蛇普通喷吐仍是普通武器，但因腐蚀武器属性而被白名单排除，不能按Spell动画误归为主动技能。武器在出手时冻结，弹体命中时不重读攻击者切换后的活动武器，读档继续使用原冻结值。

### 命中到死亡的严格顺序

1. 发射／出手时冻结原生攻击上下文，穿过 `World.fire`→`attackHit`／`WeaponFlight`／穿刺区域；弹射保留原轮并标副目标，派生段显式带 derived。
2. 在伤害前计算W07／W09／B07的条件增伤，W09读取本次受击前生命比例。三项同栏相加，不能受击后追补本次倍率。B08已是原生面板增益，不在此再乘一次。
3. 原引擎做合法性、闪避、护盾、护甲、减伤及吸收结算。
4. 确认命中后、调用 `commitUnitDeath` 之前，执行孢子播种／传播。**第一下物理普攻直接击杀时，也有资格先植入、再做一次死亡孵化。** 不能挂在死亡已结算的外层 `bioNativeHit` 类位置才处理。
5. 生存／免死规则结束后，若真死，为该次死亡建立唯一回执。正常敌人保持原奖励、装备、救援结算一次；体验敌人使用独立零收益路径。
6. 用该回执处理孢子孵化；感染DOT致死另按六单位规则生成受控体。两者可以并存，不复制敌人的奖励资格。生成的新ID身体不把原死者原地改成活体。
7. 同帧伤害、追加、到期仍读到已结算死亡则立即返回；临时兵创建排到当前事务安全点，不能重入同一死亡链。

孢子保留全队0.25秒成功孵化间隔。间隔内死亡不排队补孵，失败不更新成功间隔。**物理限制只管被动植入／刷新／传播，不限制已有孢子的死亡孵化**：标记有效的正常敌人被酸液、毒液、DOT、技能或其他合法伤害击杀，仍走一次原有死亡孵化判定；未标记敌人不会借死亡流程植入。敌人身份必须用明确的体验／正常分类，不能仅凭5%或30%血量猜测，更不能把任务守军误划入体验群。

## 5. 批次、临时兵和正式生产

### 创建与退场统一入口

```ts
function queueSwarmBatch(w: World, spec: SwarmBatchRequest): number;
function tickSwarmBatches(w: World, dt: number): void;
function spawnSwarmBody(w: World, part: SwarmRecipePart, batch: SwarmBatch): Entity | null;
function retireSwarmBody(w: World, body: Entity, reason: 'expired'|'spent'|'transition'): void;
function onSwarmRootBatchBorn(w: World, batch: SwarmBatch): void;
function swarmBirthRank(w: World, policy: SwarmRankPolicy): number;
function swarmTemporaryCapacity(w: World): 60 | 90;
```

顺序固定为：来源牌配方→N05或N02本批上限→O03加量一次→合法位置／身体容量→军衔→原生面板与装备一次→N08寿命一次→出生增益→根批次通知一次。基数与扩增后的配方分开保存，N06只读前者。

使用 `addUnit` 建立独立身体，不使用 `addFamilyMember`，避免临时跳虫生成正式配对／15秒补生记录。写 `temporary=true`、`temporaryKind='zerg-swarm'`、统一 `temporaryUntil` 和来源记录；临时两只跳虫以配方原子占两个空位。临时母体仍走六单位普通战斗入口，**不设置 zergSix.temp**。

复制正式普通／精英兵时，从原型、军衔、精英身份和允许的永久状态重建；不直接 `structuredClone(source)` 后换ID，否则会复制孢子计时、队伍效果、在途攻击、复活登记和已放大的面板。B09能量／技能按新生规则；N02／N03按确认稿继承母体相应能量／剩余冷却，原生战斗能力保留，正式成长和复活资格关闭。

六单位蝗虫、巢虫、受控体继续使用原有48／24／12共享池；60／90只统计本支母体和独立兵，不统计这些子体，也不统计英雄分体。N08不能修改 `zergSix.temp.until`。

到期在本身体当帧出手前处理，退场不是一次新战死。`expireUnit`当前会经过统一死亡路径，不能不加原因过滤就直接复用。退场需取消未发射攻击、解除空间／目标／装备缓存及临时计数，保留已经发射的合法弹体按原规则走完；不触发战损加速、概率复活、裂体、掉落或救援。

G02和N06复制G02的批次携带 `oneShotBaneling=true`；原生爆炸真正执行时先写 `explosionSpent`，完成一次伤害后按spent退场。到期不补爆、同帧不重复爆。其他来源的普通毒爆不因这个修复被全局修改。

### 满容量和派生规则

- 周期来源最多保留一批；全无空位时保持就绪，尚未启动下轮CD。第一只实际出生后，6秒释放窗口与下轮CD一起开始，超时未释放部分取消。
- 分裂／孢子／复活等事件派生只取当前可容纳部分，不积累尸体债；G09的已登记1.5秒延迟不是新周期根批次。
- 根批次通知使用保存的 `rootNotified`，实际出生数为0不能给N06计数。加载、分帧释放、同批两只跳虫不重复计数。
- N06的2秒追加是echo来源；G09为companion；它们不再触发W08／G09／N06。O03不能再扩增echo。
- 主脑／卵／坑道的展示从批次数据重建；显示丢帧或模型晚到不改变单位出生／伤害时间。

### W01与G01的正式生产接口

W01接 `productionQuote`／最终订单耗时，普通新兵、补员、军衔培养与现行正式培养流程统一用当前档位系数；不乘卡牌CD或运输时间。已经处于training的订单保留进度，可用订单保存的已应用系数将 `remaining *= newFactor/oldFactor`；awaiting／risk的订单不再缩时。旧订单缺字段按1处理，不能重算其已支付账目。

G01必须在 `updateExpeditionProduction` 把awaiting订单送入普通Pod之前取得交付权。新增乘员级 claim，键为 **jobId＋原始passengerIndex**，只认purpose=body且已完成／尚未发运的新兵，不能认rankTraining或tacticalProgress。跳虫一席两半同组占主脑配额。

每次主脑CD只认2／3／4席。一个账本含多种用途或超出配额时，主脑只占用选中下标，剩余乘员仍可由正常运输发出；**不复制、删除或重排原passengers数组**。普通Pod释放、主脑释放均先核验“本载体拥有该下标且仍waiting”，再调用提取后的同一真实交付函数。现行 `j.podId` 不能单独表达混合交付，须增加claims映射或载体引用，不能只改飞行时间蒙混通过。

正式新家族到达仍走 `receiptNeeded` 的新槽／替换流程；需要决策时暂停模拟，不因为主脑交付而绕过五／六槽确认。已在途乘员不抢回，已死亡／退款／释放的下标不能再释放。主脑只是交付方式，不附赠新资源、救援奖励或重复生产统计。

G01／N01满员临时来源使用单独overflow时钟，合并CD／席数／寿命，不把正式订单改成假免费临时订单。按已选产出且实际满员家族轮换；培养任务和已付在途乘员照常保留。

W04接一个明确的 `nextSwarmDeliveryCountdown()` 查询：只在确认稿列出的正式新兵／补员与周期投兵计时器中选最短；修改这一项，最低0.5秒，不每个生产设施都减少一次。

## 6. 编制与复活接口

### 正式容量

增加 `swarmFamilyCapacity(w, slotIndex, baseCapacity)` 和 `swarmSquadCapacity(w, baseCapacity)`，接入 `World.familyMemberCap`／`squadCap`，并使 `supplyPlan`、正常生产、交付、替换预览和UI容量读同一查询。不能只把UI的5改成6。

- 原五槽中，B01每次只标记一个未标记槽，最多三个；对应家族被替换后标记仍在该槽。
- 前五槽容量＝现有天赋／装备计算后的原容量＋B01的1席＋已持N04档位；未被B01标记的槽不加N04。
- O02第六槽直接取前五槽**最终容量**最大值，不再追加一遍装备／天赋／N04，也不参与自身最大值计算。
- 增加上限只产生可用空位，不直接生成身体。已有超额者按现行规则保留，不因读档／换装被杀死。
- 跳虫两体共享同一正式席位；临时跳虫不加入这个集合。`familySeatCount`的原生／装备／本支预留必须按同一个SeatKey去重，不能在已有预留上再盲加一次。

正式SeatKey不要复用纯显示站位索引。首次进入本分支时，从现有正式身体、跳虫pair、已存在的复活／在途预留确定性建立槽内席位；保留替换／补员后的席位身份和45秒冷却，防止通过新身体ID绕过“每席”。已经存在的订单／复活不因建表被取消或改军衔。

### 复活仲裁

```ts
function onSwarmFormalDeath(w: World, death: SwarmDeathReceipt): void;
function offerSwarmRevival(w: World, death: SwarmDeathReceipt): void;
function resolveFormalRevivalCandidates(w: World, seat: SeatKey): void;
function onSwarmFormalRevived(w: World, body: Entity, receipt: string): void;
```

当前 `notePairDeath`、`zergRevivalDeath`／`tickZergRevival`、`equipmentBodyDied`／装备恢复都有独立写状态。本支不能再写一个到点就 `addUnit()` 的复活计时器。

处理顺序：

1. 真实战死且属于正式普通／精英，冻结死者快照、D和死亡前R，建立唯一deathId／SeatKey。W04、G08、B02、B09各自最多得到一次事件。
2. G04／N03按确认公式合并一次概率与血量，45秒资格未就绪则不掷骰；失败不逐帧重试。通过后登记3秒候选和原席位预留。
3. 原生／装备规则登记各自合法候选。恢复时间不等于立即消费原生次数；有数量限制的来源先预留可用次数，避免同帧超额，但只有真正执行的胜者才提交消耗。
4. 选择最早到时且当前能完成的候选；同一时刻原生→装备→本支。原地无合法落点时不能白扣次数或生成重叠体，保留既有阻塞等待规则。
5. 实际恢复原兵员一次后，取消针对该死者的其他候选、归还未提交的次数预留、释放重复席位预留，并通知N03一次。N03复活分裂冷却与本支复活资格冷却是两个字段，同一次复活可同时消费二者。
6. 不能把当前 `reserveSurvivor` 之类“登记时即记装备次数”的行为原样叠在新仲裁之后；要为参与仲裁的本支席位提供预留／提交／释放适配，其他分支路径保持其原语义。

跳虫需单独验收：G04恢复某一死者后，取消的是**同一死者**的原15秒补生，不能再多生第三只；若同伴仍死着，可按原生规则安排那另一只的后续补生。尼雅德拉整席双体复活为原子候选，赢得一次时取消两个身体的冲突候选，消耗一席对应次数，不变成每体扣一次。

退役、换族、任务撤离、载体消失、G02消耗和临时到期不进入本函数。临时精英保留战斗技能，但不能借原生／装备的正式复活入口重新变成正式兵。

团灭判定要认合法、有限时间的既定复活预留；一个无限循环卡牌CD、空主脑或地上无敌虫卵不能单独阻止团灭。现存本支有战斗能力的临时母体按正常作战身体判断，原生游离子体与受控体沿原有 `hasCombatPotential` 排除规则。

## 7. 永久双英雄接口

O01复用英雄原生武器／技能代码，但不复用“有期限、不能复活”的装备投影身份。英雄组以 `HeroId` 为唯一养成身份，保存两具BodyRef；一个英雄槽、一套装备、一个升级记录、一个主动技能CD。

新增：

```ts
function heroCombatBodies(w: World, hero: HeroId): Entity[];
function bindSwarmHeroTwin(w: World, hero: HeroId, receipt: string): boolean;
function castSwarmHeroGroup(w: World, hero: HeroId, request: HeroCastRequest): boolean;
function tickSwarmHeroTwin(w: World): void;
```

`heroEntity()`保留单身体兼容查询，但选择当前可用的组内身体；需要覆盖两体的升级、状态、技能源和光环必须显式使用 `heroCombatBodies()`，不能所有调用都偷偷替换成返回数组。

- **购买绑定**：有英雄时在领取节点的既有选择流程内选一名；无英雄时保存待绑定，第一次合法取得英雄后自动绑定。pending选择也保存，不先扣节点再丢失目标。
- **面板／装备**：两体独立重新计算同一英雄当前等级和装备；英雄升级刷新两体并保持各自生命比例。现有 `equipmentBoundBody` 只认主entityId，必须增加同组绑定资格。分体不获得第二套库存物品，也不重复购买养成。
- **主动技能**：先对两体各自校验状态、目标与能量，冻结一个组级施放回执；满足条件的身体各施放一次，共用技能CD只写一次。不能连续调用两次会自行检查／写CD的旧 `castExpeditionHero`，导致第二具永远被挡掉；应拆分“组级合法性／提交CD”和“单源创建cast”。没有任何身体能施放时不消耗CD。
- **原生被动**：身体自身的武器／防护／移动战斗状态各自运行；按英雄身份计算的等级成长、全队唯一奖励与全队技能次数只记组级回执。同一敌人的死亡不会同时给两体各结算一份奖励。
- **光环**：覆盖范围可以是两体范围的并集，但同名英雄光环取一次效果，不乘2。`nativeEquipmentHeroSources`当前受装备开关影响，英雄分体来源必须独立于 `starship.enabled`，无装备也要存在。
- **单体死亡**：若另一体仍活着，记录缺失哪一具、60秒后原身份50%生命恢复；不能恢复成第三个ID仍留旧体活着。合法位置不足保持就绪，不重复刷新60秒。
- **双体死亡**：取消单体重生，按一个HeroRecord进入原有整体阵亡／复活。一次正常整体恢复恢复这组两体，不额外加英雄槽、救援次数或全队复活资格。
- **任务／转场／存档**：使用BodyRef检查当前实体或合法撤离容器，撤离不是死亡；两体的身份、技能CD和剩余重生时间保持。

UI只增加领取时的英雄绑定目标和现有英雄信息中的双身体生命／状态反馈；战斗操作沿原英雄入口，不增加第二套英雄技能按钮。

## 8. 面板、伤害和表现接口

### 属性计算

在 `refreshExpeditionStats` 及原生伤害预算查询中增加本支数值层，按确认稿重新计算，不在每帧对已放大的 `maxHp`／`attackPeriod` 连乘。

- W05出生攻速／移速、N03狂暴、P01／P03冲锋：按同属性取确认稿要求的较高值；其他既有属性依原系统组合规则。攻击间隔用稳定基础间隔除以频率倍率。
- B08记录已成熟档位和基础面板；首次成熟／复选只补“新旧最大生命差”，伤害系数替换，寿命不重置。现存投射物保持其发射时预算。
- `expeditionWeaponScale` 与六单位 `skillDamage`、子虫继承必须统一读取已经应用本支的原生预算，防止母体加一次、技能／子体再乘一次。原生子虫不再领取B08自身成长、W05／W06出生状态。
- W06与G08是两个有期限的吸收层，先消耗更早到期者；同名G08按剩余金额与新金额取大后刷新，不累加。不冒充原生护盾或治疗，不触发治疗充能。
- N09是减伤查询，覆盖正式兵／英雄／本支临时兵，计数池只含本支临时兵。沿现有减伤组合和最终上限，不修改护甲字段充当百分比减伤。
- W07、W09、B07对合法原生直接伤害同栏相加；G07／P05／W08／N07等卡牌追加预算不再触发本分支命中链。稳定A／Q预算从原生面板读取，不从“本次实际打掉多少血”反推，避免护甲或暴击被二次计算。

### 表现事件

新增受控的展示事件 `swarm-batch-start`、`swarm-body-born`、`swarm-spore-on`、`swarm-spore-hatch`、`swarm-split`、`swarm-shell-start/absorb/end`、`swarm-mature`、`swarm-twin-regrow`、`swarm-expire`。事件携带cardId、batchId、实际位置、实体ID、开始／结束时刻；渲染只消费这些已结算事实。

主脑、坑道、卵、孢子、分裂与甲壳优先复用项目既有原版资源与原生动画路由；六单位模型／原声沿当前试玩接线。新路由逐项检查 `src/assets/manifest.ts`、`src/data/combat-fx-routes.json` 和原生效果目录，不在尚未核对资源时声称45张特效已完成。

出生延时、CD、临时寿命由模拟控制，不能由动画结束回调控制生成／伤害。到期与战死使用不同事件，读档只恢复当前持续表现，不重播出生、爆炸或掉落。采用常驻／事件对象池和当前有效事件，不每帧创建一个新圈或载体。

性能：0.25秒更新的4／6范围计数用既有空间查询和每tick缓存；临时总数用活体索引增减维护，读档重建。不能每个临时兵每次攻击都完整扫描45张牌和全部实体。独立随机流、活跃回执与限长批次队列随战斗推进清理，不能在无尽模式永久积累每一击日志。

## 9. 存档、转场与确定性

实施时将RUN_SCHEMA从当前26升到27；`readArchive`／恢复入口仅为已识别26版添加迁移，再进入27版全量校验。迁移旧局时本分支为空，不初始化孵化计时、不补牌、不回填历史进度、不改变原RNG／资源／英雄／订单。不是保留第二套旧运行时。

正式状态全部落在已保存的expedition／entities内；`run-fields.ts`补嵌套字段说明和校验，新的缓存使用模块级WeakMap或明确的重建字段。保存中必须覆盖：

| 数据 | 恢复要求 |
| --- | --- |
| 持牌等级、购买／节点回执、候选、主分支 | 不重选、不重扣、不重发即时效果；橙卡唯一 |
| 四条随机流、批次序号、死亡序号、轮换游标 | 保持下一次结果；不能借读档重抽 |
| 周期时钟、首次标志、已完成比例 | 不重置开场5／8秒，不缩成立即就绪 |
| 等待投放批次、配方、O03是否已扩增、已释放下标、根通知 | 不能多生、重算扩增或重计N06 |
| 60／90临时身份、出生时间、基础寿命、最终期限、成熟档、甲壳 | 正确恢复剩余寿命与成长，不补满HP |
| 孢子目标BodyRef、到期、命中去重、成功孵化间隔 | 不接受旧代目标；致死边界不丢／重复孵化 |
| 主脑claim与正式订单、原passengerIndex | 相互引用一致，一个乘员最多一个载体拥有交付权 |
| 席位标记、复活预留／胜者、45秒资格／分裂CD | 双体／装备／原生复活不会各占一次或重复恢复 |
| 英雄组两体、共享HeroRecord、单体60秒计时 | 无装备也可恢复，缺一体不新增第三体 |

新字段校验包括合法牌ID／种族／档位、N04前置、前三节点计数、扩编槽唯一、临时池实数、pair原子配方、引用唯一、有限时间和单调序号。非法存档拒绝并明确错误，不能“修复”成免费升级或清掉已付订单。

合法转场保留本支兵员剩余寿命、周期CD、成熟时间和复活计时；位置在新场地按原转场规则重落点，不能用旧地图坐标强行生成。旧敌人已离场的孢子标记清除；己方下一次播种／孵化CD继续保留。暂停／商店／离线不推进这些计时。

## 10. 45张卡到处理器的完整映射

“处理器”是待实现的函数／路径名称，不表示已有功能。每张卡都必须能从配置表追到运行事件及验收项，不以购买回执成功代替战斗效果成功。

| 牌 | 处理器／主要入口 | 难度与关键检查 |
| --- | --- | --- |
| W01 | `swarmProductionFactor`、生产订单 | 中；老订单进度比例 |
| W02 | `queueSwarmBatch` | 中；2／3／4对、最高军衔 |
| W03 | `isSwarmPhysicalPrimary`、`onSwarmResolvedHit`、`onSwarmEnemyDeath` | 高；真实命中、首击致死、原轮去重 |
| W04 | `onSwarmFormalDeath`、`nextSwarmDeliveryCountdown` | 中；仅一项计时、最低0.5秒 |
| W05 | `swarmBirthModifiers` | 低；出生一次、同类取高 |
| W06 | `swarmBirthModifiers`、`absorbSwarmShells` | 中；吸收时序／到期 |
| W07 | `onSwarmResolvedHit`、`swarmDirectFactor` | 中；标记刷新、只增原生直接伤害 |
| W08 | `onSwarmRootBatchBorn`、`swarmCardDamage` | 中；每批一次、无递归 |
| W09 | `swarmDirectFactor` | 低；读取伤害前生命 |
| G01 | `claimSwarmDelivery`、`releaseSwarmDelivery`、overflow | 高；原订单下标唯一、同N01合并 |
| G02 | `queueSwarmBatch`、`consumeSwarmBaneling` | 中；一次爆炸，不进入原生恢复 |
| G03 | `resolveSwarmRecipe`、`queueSwarmBatch` | 中；已解锁池、按席抽取 |
| G04 | `offerSwarmRevival`、`resolveFormalRevivalCandidates` | 高；原生／装备／跳虫仲裁 |
| G05 | `queueSwarmBatch` | 低；刺蛇地空武器沿原生 |
| G06 | `queueSwarmBatch` | 低；临时畸变体仍用六单位技能 |
| G07 | `swarmSporeProjectile`、`applySwarmSpore` | 中；先植入再伤害、无普攻伪装 |
| G08 | `onSwarmFormalDeath`、`grantSwarmShell` | 中；同名取大、非治疗 |
| G09 | `onSwarmRootBatchBorn`、companion批次 | 中；1.5秒、禁止再次伴生 |
| B01 | `applyZergSwarmCard`、`swarmFamilyCapacity` | 高；槽标记／后补部队／换族 |
| B02 | `onSwarmFormalDeath`、退化配方表 | 中；16家族回退、临时不裂体 |
| B03 | `onSwarmResolvedHit`、`resolveSwarmSporeOffspring` | 高；传播一次、每后代独立突变 |
| B04 | `queueSwarmBatch` | 低；吞噬者减甲共享 |
| B05 | `queueSwarmBatch`、六单位感染接口 | 低；母体寿命与8／5秒控制分开 |
| B06 | `queueSwarmBatch`、六单位宿主接口 | 低；48蝗虫共享上限 |
| B07 | `swarmNearbyCount`、`swarmDirectFactor` | 中；目标周围计数、增伤封顶 |
| B08 | `tickSwarmMaturity`、原生面板重算 | 中；只补差值、继承不翻倍 |
| B09 | `onSwarmFormalDeath`、`spawnSwarmClone` | 中；精英战斗身份、关闭复活资格 |
| P01 | `queueSwarmBatch`、三路载体表现 | 中；9雷兽／O03后12、移速取高 |
| P02 | `resolveSwarmRecipe`、高级空军池 | 中；无合法池不出牌、2秒孵化 |
| P03 | `queueSwarmBatch` | 低；成对容量和出生冲锋 |
| P04 | `queueSwarmBatch`、六单位子体池 | 低；母体与48／24子体分池 |
| P05 | `swarmSporeProjectile`、`queueSwarmBatch` | 中；冲击与母体同一次事件 |
| P06 | `queueSwarmBatch`、侧翼落点 | 中；合法地空位置和原生拉拽免疫 |
| N01 | `swarmBirthRank`、overflow、正式交付 | 高；新生R、培养／复活不冒充出生 |
| N02 | `tickSwarmSplit`、`spawnSwarmClone` | 高；独立概率、本批上限、轮换 |
| N03 | `offerSwarmRevival`、`onSwarmFormalRevived` | 高；合并概率、分裂CD独立、无套娃 |
| N04 | `swarmFamilyCapacity`、节点永久等级 | 中；6→7→8→9、后购B01追溯 |
| N05 | `resolveSwarmSporeOffspring` | 中；自带播种、一次孵化总量 |
| N06 | `onSwarmRootBatchBorn`、echo批次 | 高；三批计数、原配方、读档不重播 |
| N07 | `onSwarmResolvedHit`、`swarmCardDamage` | 中；必须再次命中、换目标清零 |
| N08 | `swarmLifetime`、现存期限重算 | 中；保留出生时间、排除控制／子虫 |
| N09 | `swarmNearbyCount`、`swarmIncomingFactor` | 中；人数阈值、光环不叠层 |
| O01 | `bindSwarmHeroTwin`、`castSwarmHeroGroup`、`tickSwarmHeroTwin` | 高；双身体／单身份／共享CD |
| O02 | `swarmSquadCapacity`、`swarmFamilyCapacity` | 高；第六槽取前五最终最大值 |
| O03 | `swarmChance`、`expandSwarmRecipe`、`swarmTemporaryCapacity` | 高；百分点／数量只扩增一次 |

## 11. 实施顺序与验收范围

1. **配置和基础契约**：45张数据、种族分支入口、永久节点等级、状态／存档、独立RNG、真实攻击来源与死者回执。先把不能重复的身份和顺序做对。
2. **正式生产和临时投放**：W01、G01、统一批次工厂、普通召唤、一次性毒爆、容量／军衔／寿命、扩编三牌B01／N04／O02。复用已完成的六单位战斗代码，正式科技池以其正式接入接口为前提。
3. **战斗增益和孢子**：出生／成熟／甲壳／围攻／追猎、物理孢子、传播／突变、G07／P05、N05／N07／N08／N09。先验证不递归，再验证组合数值。
4. **复活和分裂**：G04、B02、B09、N02、N03、N06及O03。一起覆盖跳虫双体、装备恢复和尼雅德拉。
5. **双英雄、界面和表现**：O01的永久身份／施法／复活，领取绑定和第六槽展示、卡牌说明与真实战斗表现。然后做同一正式构建的购买→战斗→存档→恢复→下一战闭环。

这些是开发依赖顺序，不代表本轮已经开始这些实现。六单位的既定玩家实机验收／正式友方／敌方接入顺序不因本文件改变。

### 必须验证的机制场景

| 编号 | 场景与应验证结果 |
| --- | --- |
| S01 | 45张唯一ID、126个非橙档位、3个唯一橙；说明与数据同源 |
| S02 | 第三个有效进度锁主、立即选节点；白牌复购不加点 |
| S03 | N04连续三次实际能出现在候选并升至3档；候选读档冻结 |
| S04 | 非虫族不能取得ZSW，旧人族节点储备规则不变 |
| S05 | 白名单物理主目标触发；酸液／毒液普攻、queen/AcidSpines、飞蛇普通腐蚀喷吐、未列武器及技能／DOT／反伤／派生／临时／英雄全部不播种／刷新／传播，不耗孢子RNG或尝试CD；W03／B03／N05规则一致 |
| S06 | 多弹／穿刺／弹射一轮只一次；失败仍消耗1秒尝试间隔 |
| S07 | 第一击致死先播种再孵化；已标记敌人被酸液／毒液／DOT等击杀仍可孵化，未标记者不补植入；同帧第二次命中不重复死亡 |
| S08 | 原生盾／吸收甲壳有效命中、闪避／无敌／飞行落空边界 |
| S09 | 攻击者先死但弹体仍在；恢复后旧弹体不借用新身体状态；虫后Talons／TalonsMissile与AcidSpines切换、飞行中切换及读档均按出手时冻结武器判定 |
| S10 | G07／P05明确施加可用；Boss／领主只受合法伤害、不孵化 |
| S11 | 感染DOT控制＋孢子后代可并存，奖励／救援只一次；控制到期零二次收益 |
| S12 | 体验群无孢子后代、无奖励／装备／救援；原生感染战斗例外仍零收益 |
| S13 | 孢子来源概率／军衔／寿命取规则最大值，N05后再O03；不各自孵一份 |
| S14 | 临时池60／90、原生48／24／12共享池、成对跳虫空位原子检查 |
| S15 | 满池保留一批、第一只后6秒释放窗口、事件派生不积债 |
| S16 | 5／8秒首次、升级CD完成比例、暂停／转场不重开首次 |
| S17 | 正式R、M(k)、D−1、同源、N01覆盖；不误取英雄／临时最高军衔 |
| S18 | N08已有身体只改总期限；控制8／5和子虫8／5不被延长 |
| S19 | G02一只只爆一次、到期不补爆；普通正式毒爆恢复保持 |
| S20 | W01老订单保留完成比例，已完成／在途不被再缩时 |
| S21 | G01只认已完成body乘员；部分混合账本、跳虫两半、在途／培养不被夺取 |
| S22 | 主脑／Pod抢同一下标只有一个成功；保存恢复不多交付、不多退款 |
| S23 | G01＋N01只有一条overflow：三档＋二档16秒2席22秒寿命 |
| S24 | B01三槽＋N04三档为37席；O02后46；含跳虫和其他容量加成仍不重复 |
| S25 | 原5槽替换保留扩编；第六槽不自引用；降上限不杀已有身体 |
| S26 | G04＋N03合并65%等样例；一次死亡一次骰，两个45秒冷却不互相挡住 |
| S27 | 原生／装备／分支最早复活胜出，败方释放预留、不扣成功次数 |
| S28 | 跳虫单体3秒恢复不在原15秒再多生；尼雅德拉整席两体原子恢复 |
| S29 | 临时分体、到期、换族／撤离不能触发正式战损和复活 |
| S30 | B09／N02／N03保留精英战斗身份，但不复制在途弹体／装备槽／正式复活 |
| S31 | G09／N06只认实际根批次；读档与分帧释放不重复计数 |
| S32 | O03人数n+ceil(n/3)、混编最大余数、N06不二次加量；三橙互斥 |
| S33 | W05／狂暴／冲锋取高，B08不循环放大，母体与原生子体面板只继承一次 |
| S34 | W06／G08吸收先后、同名取大、到期和治疗统计互不串用 |
| S35 | W07／W09／B07同栏加成；N07必须再次命中、换目标重置、不自触发 |
| S36 | O01首次／待绑定英雄只出两体、一个英雄槽和一套装备 |
| S37 | 无装备时双英雄仍正常；升级两体同步，原同名光环不乘2 |
| S38 | 双体技能只提交一次CD，两具分别合法／能量不足／无目标分支 |
| S39 | 缺一体60秒50%恢复；双死取消单体重生，整体英雄复活只结算一个身份 |
| S40 | 26版原档迁移不变资源／RNG／订单／军衔；27版中间孵化／孢子／复活／飞行状态往返一致 |
| S41 | 正式购买→战斗→保存→恢复→下一战完整流程及旧人族分支回归 |
| S42 | 真实World中60／90临时母体＋原生子体＋正常／体验敌群性能；移动撤离优先、没有隐藏截断数量 |

接口静态清点通过只说明指定源码入口存在、45张映射齐全。S01–S42属于后续实际实施验收清单，本轮不提前标通过。表现仍需在同版真实World查看，不以独立动画页面代替战斗机制。
