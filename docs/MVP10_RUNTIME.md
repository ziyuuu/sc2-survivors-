# 1.0 MVP 运行流程、存档、无尽与加载规格

状态：`M0 r6已获用户确认 / 待实施`。审计日期：2026-09-24。适用项目：`D:\星际`。本稿是已确认的首版实施基线，尚未修改游戏代码、存档或构建产物；文内旧PROPOSED标签表示首版实验参数，修改须留变更记录。

配套文档：[迭代总计划](MVP10_ITERATION_PLAN.md) · [三族天赋完整稿](MVP10_TALENTS.md) · [英雄精英与素材稿](MVP10_COMBAT_ASSETS.md) · [项目决策与缺陷登记](project/DECISIONS.md)。缺陷ID与项目总登记一致；本稿新增证据条目使用RUN-EVIDENCE前缀。

标记约定：`USER_CONFIRMED` 是本轮用户的明确要求；`OBSERVED` 是本次文件／只读运行证据；`PROPOSED` 是M0 r6已批准的首版实施建议，尚待写入游戏；`BLOCKED` 表示必要素材或证据尚未取得。

## 1. 本轮规则与实际问题

| ID | 要求／发现 | 状态与处理 |
|---|---|---|
| RUN-01 | 无真实玩家，不再为兼容旧存档保留多套游戏规则 | USER_CONFIRMED；M1 合并为一套运行规则，不在本轮计划阶段删除旧档 |
| RUN-02 | 无尽必须先有明确关间选择，进入大平地，使用真实 SC 建筑 | USER_CONFIRMED；M3 实施 |
| RUN-03 | 读档保持原难度，简单不能变普通 | USER_CONFIRMED；M1 阻断回归，M3 验证完整界面操作 |
| RUN-04 | 标题主入口为新游戏、读档、天赋；新游戏设置种族／难度／天赋 | USER_CONFIRMED；M3 实施 |
| RUN-05 | 预加载应显示读条，在就绪后进入，不让玩家进入后卡住 | USER_CONFIRMED；M3 实施 |
| ISS01 | 无尽地图失败时仍可能在战役地图开始无尽 | OBSERVED：`bootstrap.ts` 将 Acropolis 读取异常变成 null；`World.startEndless()` 仅在存在 endlessTerrain 时换图，缺失时仍设置 endless 并开战；必须删除该静默回退 |
| ISS04 | 当前 Acropolis 并非大平地，当前防御建筑不是原模型 | OBSERVED：运行地图177×185、高度范围−16.49498至3.9942、4种地形级、22坡道、150摆件；`makeFortView()` 用 BoxGeometry／TorusGeometry 搭建筑 |
| ISS03 | 三族无尽轮次误用终章150秒 | OBSERVED：`duration` 直接返回 `config.durationSeconds`；无尽仍为stage18，config仍为campaign18第18关；没有240秒独立无尽配置 |
| ISS02 | 用户报告读取后难度变化 | 尚未复现；不能写成已定位修复。当前快照保存difficulty，直接往返四难度均保持；完整导入／标题／续局界面链仍需回归 |
| RUN-EVIDENCE-01 | 用户提及10×存档仍留原地图 | 尚未取得对应无尽档案；已检查三份Downloads档均为简单第7关，endless=null，不能拿它们证明10×因果 |

当前胜利页**已有**“进入无尽”按钮，代码未自动调用 `startEndless()`；差距在于没有完整的无尽前整备与事务化换场流程。本轮改成明确的“撤离／无尽整备”关间决策，并消除地图失败仍开战。

## 2. 单一规则与开发存档退役（M1）

### 2.1 唯一运行合同

PROPOSED：正式规则标识为 `mvp-1.0`，存档外壳 `archiveVersion=2`，战局 `schemaVersion=2`，永久档案 `profileVersion=3`。数字只表示数据格式，不允许在World中据此切换12关、旧商店、117天赋或旧生产玩法。

唯一运行模型保留：18关、三族、5普通家族、未点天赋每家族5身体／军衔5、至多3英雄身份、完整付款账本与安全接收换兵。天赋使用本轮确认后的三族原版适配稿。天赋允许突破的身体／军衔上限由该稿统一提供，不能写死25身体覆盖原版终极。

| 当前并存内容 | 收敛后实现 |
|---|---|
| `expedition===null`旧局 vs 非空三族局 | 运行状态始终有统一RunConfig、Roster、Production、Development、Reinforcement；无旧局开关 |
| `talentProfile`＋`threeRaceTalentProfile`双永久档案 | 一个PermanentProfile：共享本金、活动配点、预设、实际投资账、奖励收据；仅冻结的本局TalentSnapshot影响战斗 |
| 旧12关与新18关双结算 | CampaignConfig只有18关正式配置；24关仅留未来配置接口，不交付第二套玩法 |
| 旧多购商店与新三选一 | 由确认后的建筑／卡片文档唯一决定；保留用户原版天赋的免单语义，不能以删旧分支为由删掉能力 |
| 旧Job与新账本双训练 | 一套配方／订单／逐乘员付款账本；统一容量、取消、退款与换兵规则 |
| `owner`兼任种族与阵营 | `race`与`team`分离；一次完成查询适配，移除terran=player的永久别名依赖 |

只删除实际被替代的运行代码，不能把被复用的公式、技能、素材来源或测试证据一并删掉。合并后用静态检索与行为测试证明旧分支不可达，不能只改版本字符串。

### 2.2 旧开发存档策略

PROPOSED：**保留文件、停止旧战局续玩、允许一次性永久资源导入**。不保留旧运行系统，不自动删除或覆盖任何原始导出文件。

1. 打开旧档只解析到隔离数据，展示“开发存档不支持在1.0继续战斗”、原日期／种族／难度／关卡，以及“保留原档案副本”“仅导入永久资源”“取消”。无效校验档不导入任何内容。
2. 一次性导入器独立放在 `persistence/dev-profile-import.ts`，不调用旧World、不加载旧商店、不重现旧天赋效果。它是数据转换器，不是另一套游戏系统。
3. 本金恢复依照旧档已保存的共享principal／余额＋实际投资账；缺投资账时只使用**已核实的对应旧版本价格表**推导。不能把旧所有等级数乘3，不能把两份profile余额相加。发生矛盾时阻止导入，显示差异供核对。
4. 导入器返回 `sourceArchiveChecksum / principal / awardReceipts / conversionReport`；新档记导入收据，同一checksum重复导入不追加本金。确认后“替换永久档案”为明确动作，不暗中叠加资源；当前有新战局时先返回标题保留检查点。
5. 旧节点语义已被用户改过，转换后主树与微操配点均为空，所有已核实本金可重新购买；不擅自把旧方案映射成新种族方案。历史预设作为文字附录保留供参考，不装配未知节点。
6. 支持“导出旧原档后重新开始”，新零资源档仅由玩家选择创建。当前本地数据与两份备份在新档提交成功前都保留。
7. 1.0格式的完整存档可以在同版本正常导入续玩。今后格式升级可加纯数据迁移，禁止因此恢复旧玩法开关。

这项处理方式已随M0 r6获批准，尚待实施。M1任务须记录移除模块清单、复用模块清单、转换前后本金对照及原文件保留位置。

## 3. 难度与加载是两条独立的数据流（M1＋M3）

### 3.1 已核实调用链

- `HUD change[difficulty] → World.setDifficulty()`：只允许menu阶段。
- `RunSession.exportJSON → World.captureRun → selectRunData`：`RUN_FIELDS`显式含difficulty。
- `readArchive → validateRunData`：校验四种合法难度，未为缺失值补normal。
- `RunSession.resume → World.restoreRun`：`Object.assign(this, fresh, data.state)`；快照difficulty覆盖fresh默认normal，然后战斗恢复暂停。
- `RunSession.importJSON`当前仅验证候选run、导入profile、保存pending，再调用selectRace重建菜单；“导入”与“继续”是两步。当前菜单摘要不显示难度和种族，容易混淆候选存档与新局设置，但**这只是界面风险，不能认定为报告的根因**。
- DEV `debug.speed`仅乘墙钟差值；不在RUN_FIELDS内；resetPresentation重置为1。10×不会按设计更改difficulty或地图，但加速可能暴露异步时序，需独立验证。

### 3.2 目标数据合同

```ts
interface NewGamePreferences {
  race: Race;
  difficulty: Difficulty;
  talentPresetId: string;
}
interface RunConfig {
  rulesId: 'mvp-1.0';
  seed: number;
  race: Race;
  difficulty: Difficulty; // startRun 后只读，来自该run
  campaignId: 'campaign-18';
  frozenTalents: FrozenTalentAllocation;
}
interface BattlefieldState {
  mode: 'campaign' | 'endless';
  mapId: 'campaign-kairos-v1' | 'endless-flat-v1';
  mapRevision: string;
}
```

新游戏设置写 `preferences.newGameDifficulty`；读档只读 `snapshot.config.difficulty`。选择新局种族、编辑天赋、修改画质、返回标题均不得调用修改存档难度的方法。RunConfig冻结后不暴露 `setDifficulty`。模拟配置缓存的键必须含runId、mode、round/stage、difficulty、配置版本。

加载步骤：读取字节→校验checksum/schema/字段→解析候选run→按该run的mapId和单位/技能清单预加载→重建候选派生缓存→在安全边界一次性替换World状态→显示“已恢复：虫族／简单／第7关”，暂停等待“继续战斗”。**不能先以菜单normal启动再覆盖部分字段。**失败时保留原活动战局与候选存档，显示错误并允许导出。

通过条件：任意四难度的 campaign/battle、reward、pendingDecision、campaignVictory、endless/battle、endless/intermission 经导出导入／本地继续均保持难度、种族、钱包、时间、敌人强度配置和领奖收据。只比HUD文字不足以验收，要比较run.config及一次固定敌军生成输出。

## 4. 战役胜利到无尽的状态机（M3）

以下菜单细节为PROPOSED；“必须关间选择”是USER_CONFIRMED。

```text
campaignBattle(第18关满足时限＋主巢死亡)
  → campaignVictoryIntermission（只结算一次）
      ├─ 撤离，结束本局 → campaignFinished → 标题
      └─ 进入无尽整备 → endlessPreparation
          ├─ 付费发展三选一／跳过
          ├─ 配置生产、英雄复活、驻地生命修复
          ├─ 免费强化三选一／明确放弃
          └─ 准备完成 → loading(endless-flat-v1)
               ├─ 失败／取消 → endlessPreparation，原战局完整保留
               └─ 校验就绪 → commitEndlessTransition → endlessBattle第1轮
                    → 每240秒 endlessIntermission → 下一轮
```

- 胜利窗口并列“撤离，结束本局”“进入无尽整备”；默认焦点放撤离，触屏均为至少48px高；第一次选无尽不开始计时。说明“保留当前小队、伤损、订单；无尽没有终点，可在关间结束”。
- 无尽前提供**一个**独立整备窗口，ID为`runId:endless-entry`。其中发展一次、强化一次是PROPOSED新增体验，不重复第18关通关矿气、永久资源或Boss预算。刷新规则复用唯一正式关间规则，进入新窗口不赠额外章节免费刷新。
- 返回上一步不重抽；已付款项目与已领强化不回滚、不再领取。玩家最终撤离也不返还已买本局项目。窗口本身完整入档。
- 读条中模拟、训练、能量、状态计时、技能冷却、永久分钟计时全部冻结；恢复不补跑墙钟差。
- 所有决定有命令ID与expectedRevision。双击进入、读条完成回调重复、自动保存同一帧都只能转移一次。加载成功之前 `battlefield.mode`仍为campaign；不能形成endless＋campaignMap组合。

### 4.1 换场事务

`previewEndlessTransition()`在隔离数据中生成计划：地图标识、保持对象、清除对象、安全落点、建筑点位、未完成空投守军关联、所需资源清单。就绪后 `commitEndlessTransition(requestId, expectedRevision, readyToken)`一次提交。

| 对象 | 精确规则（PROPOSED） |
|---|---|
| 存活友军与英雄身份 | entityId、rank、HP／盾／能量、模式、技能与武器剩余冷却、死亡英雄记录、家族槽、精英路径不变；仅按合法落点重定位 |
| 属性与天赋 | 使用同一冻结RunConfig与原伤损，不用新局初始化函数，不补满HP、盾、能量 |
| 生产与继承 | 钱包、设施、研究、产线、已付订单、训练剩余时间、退款/奖励收据、继承记录全部保持 |
| 未解决空投 | 舱ID、HP、乘员、逐人付款和交付状态保留；falling/active/opening统一重定位，开启剩余时间保留；关联存活守军ID/HP/状态保留并随舱迁移，不能清敌后留下悬空guardianIds |
| 旧战场敌人 | 清除不属于未解决舱的敌军、主巢、扩张巢、地图经济目标；对应status与索敌引用清理 |
| 场地临时物 | 旧拾取物、未领取地图牌、旧弹道和危险区域在确认页提示留在战役；换场清除，不转成免费资源；保留友军已消耗的冷却，不返还发射费用 |
| 指令 | 清除旧地图移动/目标坐标与路线缓存，保留手动模式；坦克不自动收炮，潜伏者不自动钻出 |
| 时间 | world.time连续；endless.startedAt=currentTime，roundElapsed=0，round=1；无尽分钟收据由累计无尽战斗时间计算 |
| 存储 | 转移后的run+永久档案同一事务保存；失败保留内存已提交状态并允许导出，不能重复转换。硬盘原检查点在成功前保留 |

落点不足、必需模型失败、地图校验失败均拒绝提交。未解决舱如果数量多，按舱ID顺序在中心半径16—30环带逐圈排布，间距至少两舱半径＋2；友军先在中心半径2—10排布；守军在其舱半径6—10排布。最多搜索到半径40，再失败回退整备；不得叠在同一点强行开战。

## 5. 真正的大平地与真实建筑（M3）

### 5.1 平地图规格

PROPOSED：新资源ID `map.endless-flat`，唯一逻辑ID `endless-flat-v1`；**不复用Acropolis高度、通行格、坡道或摆件**。当前项目锁定地图 worldUnitsPerSc2Unit=1，以下均为同一世界单位。

| 项目 | 数值 |
|---|---|
| 渲染地面 | 160×160，x/z范围−80…80，地面y=0 |
| 可通行区 | x/z均−76…76；身体外缘必须在此范围内，外围4单位为不可达边界 |
| 高度／坡道 | height恒0，level恒0，ramps=[]，无悬崖、无分章封锁 |
| 起始锚点 | (0,0)，初始面向北 |
| 逻辑采样 | 1单位格用于出生与空间查询；开放区可使用直达检测，不为平地生成旧高程A*数据 |
| 固定入侵口 | 北(0,−70)、东北(49.5,−49.5)、东(70,0)、东南(49.5,49.5)、南(0,70)、西南(−49.5,49.5)、西(−70,0)、西北(−49.5,−49.5) |
| 出兵安全距离 | 生成点与最近存活友军至少18；入口被贴近时按种子既定顺序找下一入口，全部占用则暂缓，不读取玩家战力改预算 |
| 地面表现 | 使用已核实本地SC地表贴图平铺，低对比灰土/金属分区；中心半径40无装饰阻挡，边缘装饰不进入可通行区 |
| 小地图 | 全图一次显示；固定建筑、8入口、玩家、空投；无战役章节雾格 |

运行断言：所有合法地面点height=0；中心至8入口可通行；配置中不得出现Acropolis资源ID；视图report.mapId与simulation.mapId必须一致。普通地面单位仍受建筑碰撞，飞行与地面层保持独立；平地不是“全部单位忽略碰撞”。

### 5.2 建筑功能与素材门槛

PROPOSED保留当前“4碉堡＋1维修设施”的基础结构，不加新的塔防建设系统。

| 设施 | 坐标与碰撞 | 首版功能 | 必需原模型 |
|---|---|---|---|
| 北碉堡 | (0,−12)，半径1.6 | 900HP、护甲2；射程10，18基础伤害/0.8s，对地空；遵守阵营、可见性、射线 | SC2 Terran Bunker，4座共享几何／材质 |
| 东碉堡 | (12,0)，半径1.6 | 同上 | 同上 |
| 南碉堡 | (0,12)，半径1.6 | 同上 | 同上 |
| 西碉堡 | (−12,0)，半径1.6 | 同上 | 同上 |
| 战地维修设施 | (6,6)，半径2 | 650HP、护甲1；范围6，每0.2s恢复最低血量比例合法机械友军/其他防御建筑2.4HP，不作用自身、死亡、生物生命或原生护盾；不复活 | 候选SC2 Engineering Bay原模型，维修功能明确为本作适配，不声称其原作自动治疗 |

本表HP/攻击/治疗沿用当前数值，位置和碰撞是PROPOSED。三族共享远征据点设施；虫族主要依靠自身恢复，神族靠回盾和驻地服务，不能把维修装成生物全效恢复来暗补平衡。若需三族各自据点外观与功能，应独立确认，不在实现时临时替换。

**素材状态：BLOCKED。**本次在runtime manifest未找到专用bunker/repair建筑资源ID；未完成本地原始模型、贴图、动作与来源核验。候选名字不是已取得素材证据。落地前每个资产须记录：原客户端路径/版本、SHA256、导出链、贴图依赖、Stand/Attack或开火挂点/Death的可用状态、本地运行验证。模型尺寸以实际外包围拟合上述碰撞，炮口从原挂点发射；死亡保留原残骸或已核实死亡动作。

无法取得真实模型时该项不得转DONE，不用几何拼装、重命名别的单位或缺材质白模作正式替身。仅原模型中没有Attack动画时，可使用已存在Stand加本地已核实炮口FX，但必须在素材验收记录中标明。

### 5.3 无尽规则独立配置

PROPOSED将已有240秒规则接成唯一 `EndlessConfig.roundDuration=240`。波次、特殊敌人增长与永久分钟奖励从明确EndlessConfig读取，不能从campaign18末关隐式继承duration、clearReward、经济事件或Boss预算。初始敌军混合采用已确认终章池，保留对空与侦测；无尽奖励沿用当前独立分钟规则，不重复18关奖励。

以下为PROPOSED完整首版配置；从当前规则取值并独立写入EndlessConfig，实施后不再运行时借用campaign18 config：

| 配置项 | 明确规则 |
|---|---|
| 普通波循环 | 15波一个模板周期，原始威胁总量530.6（终章758×70%的既有普通份额），每种敌军跨波累计余数；周期结束再循环 |
| 普通池威胁份额 | 跳虫20%、爆虫10%、蟑螂20%、破坏者15%、刺蛇15%、潜伏者10%、异龙5%、雷兽5%；威胁单价仍1/2/3/4/3/6/4/12 |
| 普通预算难度 | 简单×0.5，普通×0.9，困难×0.9×1.4，地狱×0.9×1.8；不读取军力、死亡率或钱包 |
| 普通波间隔 | 初始8秒，每累计无尽战斗30秒×0.9，最低1/60秒；只有成功发出一波才清进度，满实体/待生成预算时暂停发出 |
| 特殊精英 | 初始30秒，每60秒×0.85，简单额外×2，最低1/60秒；跳虫→蟑螂→刺蛇→破坏者循环 |
| 特殊Boss | 初始90秒，每90秒×0.85，最低1/60秒；同四单位循环；每第三个使用现有lord特征 |
| 新特殊单位成长 | 精英与Boss各自独立计数，n从1开始（第一只即HP×1.4、伤害×1.25、攻速×1.15），与当前`endlessGrowth(serial)`一致；第n只相对基础模板HP×1.4^n、伤害×1.25^n、攻速×1.15^n；成长倍率封顶1e12，不能追溯增强在场旧敌；维持现有最短攻击周期保护 |
| 数量安全边界 | 沿用现有enemyCap300与有界待生成队列，满额不无限积压；首版不以降敌军数量作为FPS验收手段 |
| 侦测 | 每个15波模板的第1、6、11波各一名侦察守军拥有固定半径12、持续6秒、冷却18秒、提前1秒预警的侦测；每波先从已有蟑螂/刺蛇选择，不额外加身体；Boss同配置 |
| 轮次资源 | 采用原240秒无尽的300矿/250气基础奖励；仅结算一次，并乘现有简单收入1.25及已确认天赋的关卡奖励加成；这比误用18关的220矿/191气高，列入M5经济验证 |
| 经济目标 | 每轮虫卵2个（36/156秒）、工蜂4个（48/96/144/192秒），种子在各时点±2秒内扰动；原基础收益与拾取预算不另叠新奖励 |
| 空投守军 | 独立冻结与战役第18关相同的固定难度守军表；不根据玩家阵容调整；守军序号和余数入档，不用轮次反复取第一组 |
| 每轮关间 | 发展一次→生产/修复/复活→免费强化一次；不发战役18关永久结算资源；无尽分钟奖励另外按累计战斗时间发放 |
| 地狱扩张 | 仅地狱，具体固定时点、配方与预算见下表；最多同时2座；无尽不要求240秒结束时清空扩张巢才能继续，主目标是存活；该项作为本作无尽规则需确认 |

地狱扩张独立参数（PROPOSED）如下。数值取自当前`src/data/hives.ts`的终章`expansionProfile(stage>9)`与`expansionBatch(stage>9, serial)`；唯一明确改动是将旧终章同时3座统一为本稿最多2座，并取消无尽关间“未清扩张巢直接失败”。实现时复制为具名EndlessConfig常量，不在运行时传stage18借用战役分支。

| 参数 | 数值与结算边界 |
|---|---|
| `expansion.firstAt / interval / latestAt` | 每轮20秒首个、间隔40秒、截止210秒；实际尝试时点20/60/100/140/180，共5次，不在220秒补建 |
| `expansion.warningSeconds` | 每次提前5秒，落点在预警开始时锁定；没有合法落点或同时存活2座则跳过该次，不积攒追补 |
| `expansion.maxAlive / maxAttemptsPerRound` | 2座／每轮5次；跨轮存活占同时上限；玩家毁巢只影响已有敌方设施是否存在，不增加计划预算 |
| `expansion.hp / armor / radius` | 7500生命／3护甲／2.4碰撞半径；不再叠难度或章节乘数；新巢使用以上基础值 |
| `expansion.firstBatchDelay / batchInterval` | 建成后8秒首批，成功放完一批后12秒下一批；卡住未放完时只保留当前一批，不叠加无限队列 |
| `expansion.batchBase` | 每批6跳虫＋2蟑螂＋1爆虫＋1刺蛇，共10身体、威胁17；每座巢serial从1开始，每第3批额外1破坏者，变11身体、威胁21 |
| `expansion.batchBudget` | 独立于普通530.6威胁模板；每个完整存活240秒的巢最多20批，威胁340＋4×(本轮serial中可被3整除的批数)，即最多368；2座完整轮最多736威胁，不含上轮已承诺但未交付的一批 |
| `expansion.newHiveBudget` | 在20/60/100/140/180秒建成且一直存活时，本轮最多18/15/11/8/5批；每批仍按17或21记账。实际因被摧毁/堵塞减少，绝不按玩家军力补足差额 |
| `expansion.roundBoundary` | roundElapsed到240时停止全部模拟，剩余批次/nextBatchAt原样保存；下一轮继续，不清空、不新增“开场免费批次”；下一轮新建尝试仍为20/60/100/140/180 |
| `expansion.killReward` | 击毁仅一次120矿／50气基础掉落，按现有拾取加成结算；天赋与地图强化卡上限使用批准后的唯一奖励规则，不能借每座巢绕过上限 |
| `expansion.spawnRegion` | 在以玩家锚点为中心半径12—24的可达环带中按固定种子选合法点，与舱至少6单位、与已有巢至少8单位；仅检查几何合法性与位置，不读取玩家军力 |

出生实体同样计入enemyCap300；上限满只延后该巢当前批交付。上述威胁是明确配方的预算审计值，不用于额外再生成一份敌人。

无尽计时包含全部已完成和当前轮战斗时间，关间与加载不计；加速系数不因进入新轮归零。首版确认后再按相同种子实测，调整通过变更单改配置。不能用“接入无尽”掩盖无限指数增长造成的后期实体压力，表现优化与玩法改预算分开记录。

## 6. 菜单与读档页面（M3）

### 6.1 标题

只保留三个主入口，顺序为**新游戏 / 读档 / 天赋**。设置、退出说明、版本放次级区域，不与主流程混排。标题不生成战斗、不解码全部种族模型。背景使用已核实SC贴图，本地资源不足时进入明确素材缺失状态，不能下载不明素材。

### 6.2 新游戏

一个设置流程包含三个可回退步骤：

1. **选择种族**：桌面三列卡片、390px窄屏一列；整卡可选择。每卡一个原SC种族徽记/代表单位肖像、种族名称、以下固定特点、初始部队和资源。素材注册为`ui.race.terran/zerg/protoss`并有来源记录；可以采用已核实原始单位肖像组合，不能把CSS纯色块当星际贴图。
2. **选择难度**：简单/普通/困难/地狱。显示已批准难度配置的敌压、永久资源规则，不写未经验证“适合所有玩家”；默认记住上次新游戏选择，但不写入已有存档。
3. **确认天赋与出发**：展示本族预设名、四线合计分配/80、当前等级、微操已占点数及资源价、资源余额、开局效果摘要；“编辑天赋”打开同一局外编辑器，关闭后返回本步骤。未花资源允许开局。最终按钮“开始新游戏”，下方准确列种族/难度/预设。

种族说明文案：

| 人族 | 虫族 | 神族 |
|---|---|---|
| 远程火力与机械阵地；兵营/工厂/星港分别配置生产；坦克手动部署，医修按生物/机械主系分工 | 数量补员、恢复与反复冲击；设施分配孵化序列；进化单位支付完整配方，玩家爆虫自爆后保留身体并停顿5秒（敌方仍自爆死亡） | 原生护盾与高价质量单位；回盾需要脱离受击，不能当生命治疗；闪烁/部署与灵能施法形成节奏 |
| 初始1枪兵、兵营、50矿0气 | 初始2跳虫、孵化场＋血池、50矿0气 | 初始1狂热者、传送门、0矿0气 |

已有可续局时，最后出发按钮前在同一确认页明确“开始后替换当前续局槽”，提供“先导出当前存档”；不是每步重复弹确认。只有真实确认出发并新局加载成功时才替换续局槽，加载失败保留旧槽。

### 6.3 读档

“读档”进入独立页面：本地续局卡（种族、难度、战役关/无尽轮、战斗时长、保存时间、待选择状态）＋“导入存档文件”。读档页**没有种族、难度、天赋可编辑控件**。

- 选本地档→完整就绪读条→恢复到原阶段；战斗暂停，关间仍是原关间，换兵/精英选择仍是原选择。
- 导入文件→先显示只读摘要与“载入这份存档”，确认后加载；成功后原续局退入备份。取消不改变当前档；错误只显示原因，不创建normal新局。
- 校验失败、格式不支持、地图/资产不匹配分别有明确文案；提供返回、重试、导出当前档，不能无限转圈。
- 天赋主入口可切换种族编辑未来新局预设，不改变已保存战局冻结的天赋。

### 6.4 输入与焦点

所有主操作使用原生button/select；种族卡用radio语义、方向键选择，回车确认。标题初始焦点新游戏；每步进入焦点标题/首个选择，返回恢复先前按钮。Esc/B返回上一级；加载中若已进入提交边界禁用取消并显示“正在应用存档”，不误触开始。触屏最小48×48，底部确认栏遵守safe-area，单一纵向滚动，避免两套滚动区。手柄D-pad/左摇杆导航、A确认、B返回；读档加载结束后不能把确认键透传成技能。

## 7. 加载进度与就绪门槛（M3；体积优化依赖M6）

### 7.1 当前已有能力与缺口

已有：离线包恢复使用progress元素；`BattleRenderer.load()`包含 `compileAsync` 和部分texture upload；`assetsPending`暂停固定模拟。缺口：离线JSON.parse仍主线程大块执行；模型异步到达后才冻场；map切换丢弃progress文本；新英雄/精英首次FX或贴图GPU初始化仍可能在可玩阶段发生。方案应复用已有机制，而不是再造另一个加载器。

### 7.2 任务清单、进度与处理顺序

PROPOSED由 `AssetReadinessService`构建本次进入的稳定任务清单：地图、实体模型/模式、英雄/精英、未解决舱、守军、准备进入关卡固定敌池、卡面候选、技能弹道/命中特效、HUD图、必要音频。

| 阶段 | 真实完成量 | 页面文案／门槛 |
|---|---|---|
| A 读取与校验 | 已读取bytes / manifest总bytes；本地包按chunk storedBytes累计 | “读取本地资源” |
| B 解包与转换 | 完成解包bytes / 总解包bytes；JSON.parse不可细分时显示“不确定进度：解析清单”，禁止伪造平滑百分比 | “准备资源包” |
| C 地图与模型 | 完成任务数 / 当前固定任务总数，同时显示模型名；失败仍计失败项但不计就绪 | “准备战场 24/38” |
| D 贴图与GPU | 完成纹理上传数 / 所需纹理数，compileAsync等待显示当前任务；预编译所需材质组合 | “准备画面” |
| E 战局恢复 | 校验、派生索引、落点、显示同步5项逐项完成 | “恢复战局”或“准备小队” |
| F 就绪 | requiredFailures=0，requiredPending=0，mapId一致，固定stepper重置，至少已呈现一帧加载完成画面 | 显示“开始／继续”，按用户确认才运行模拟 |

不把不同单位的bytes和任务数相加计算虚假整体百分比。主读条表示当前阶段，旁边显示阶段序号；可显示独立阶段完成列表。每次浏览器任务执行预算建议≤8ms后yield；不能yield的GLTF解析改为减少单体负载/Worker可行部分/提前加载，不以进度动画掩盖10秒主线程冻结。

### 7.3 何时加载

- 首次页面仅准备标题所需资源；当前单HTML结构决定浏览器仍需读取HTML本身，读条不能缩短文件读取，M6包体方案另验收。
- 新游戏最后确认后：本族初始家族、首关敌池、地图与共用战斗素材。
- 每次关间：下一关固定敌池、已配置且合法的未来产出、未交付订单、三个已显示候选的模型/FX；在关间完成，不边走边编译。
- 精英/英雄从地图领取：玩家确认接收前就绪；若缓存未命中，使用带取消/保存出口的“准备增援”覆盖层，完整冻场，不允许卡成不可退出的三选一页。
- 手动变形解锁时：在研究购买或关间开始prepare，无须等按变形键才读GLB。
- 进入无尽或读取无尽档：flat map＋五建筑＋存活/待交付对象＋终章敌池一次准备；必要素材失败退回原界面，不能回退旧地图。
- 为控制内存，释放被替代战役场景的instance和不再使用贴图引用；共享资源按引用数保留，不在战斗中反复dispose/recreate。

资产失败每项有稳定errorCode和任务ID；重试只重试失败任务，取消不修改run。离线缺文件、贴图解码失败、WebGL context lost需要各自出口。开发页保留详细资产路径；玩家页只显示“某类资源未完成”和可执行恢复操作。

## 8. 改动位置与公开命令

| 文件／模块 | 实施内容 |
|---|---|
| `src/simulation/world.ts` | 合并玩法分支；拆分Campaign/Endless config；只保留唯一决定事务；统一start/load/endless命令；去掉缺地图fallback |
| `src/simulation/run-state.ts`、`persistence/run-fields.ts` | 单一RunConfig、BattlefieldState、EndlessEntryWindow、状态收据；保存/重建字段明确分类 |
| `src/simulation/persistence/run-snapshot.ts` | schema2、mapId/revision显式保存；不再携带旧规则玩法迁移 |
| `src/persistence/archive.ts`、`save-repository.ts` | archive2／隔离校验／原子提交／两备份／纯数据开发档转换器 |
| `src/app/run-session.ts` | staged load candidate、resume原子提交；新局偏好与存档配置分开；摘要加race/difficulty |
| `src/app/bootstrap.ts` | LoadingScreen/AssetReadiness协调；重置时钟；未ready不得开始；不吞地图异常 |
| `src/ui/hud.ts`、`hud/save-controls.ts` | 标题三入口与独立读档；不在DOM监听器直接修改RunConfig；卡住选择始终有保存出口 |
| 新 `src/ui/menu/{title,new-game,load-run}.ts` | 小模块存页面局部导航状态，无第二World；原焦点与返回路径可测 |
| 新 `src/simulation/movement/flat-terrain.ts`、`data/endless-map.ts` | 真平地通行、独立地图定义、坐标、建筑布局 |
| `src/render/terrain/original-map.ts`与新flat-map视图 | 按地图类型准确构建；flat不执行旧高程地表/坡道逻辑 |
| `src/render/scene/battle-renderer.ts` | 真SC建筑模板；分阶段准备，传递map进度；取消makeFortView几何替身 |
| `src/assets/offline-pack.ts`、manifest与本地工具 | 明确byte/task进度，分批CPU工作；新地图依赖；在运行清单移除Acropolis专有资产前做引用扫描 |
| `src/diagnostics/debug.ts` | speed仅开发会话；导出诊断记录speed，不把speed写入正式玩法档；禁止其修改map/difficulty |

PROPOSED命令：`prepareNewRun(options)`、`commitNewRun(ticket)`、`inspectSave(raw)`、`prepareLoad(saveId)`、`commitLoad(ticket)`、`chooseCampaignExit(action)`、`beginEndlessPreparation()`、`previewEndlessTransition()`、`commitEndlessTransition(requestId, expectedRevision, readyToken)`。准备命令只生成隔离候选／资源清单；提交命令校验状态和版本，失败零变更；UI按钮禁用不是安全校验的替代。

## 9. 测试矩阵与实施门槛

以下是**待实施后执行**的验收，不代表本轮已经通过。

| 测试ID | 场景 | 必须满足 |
|---|---|---|
| SAVE-01 | 四难度×三族，新建→存档→标题选择另一难度→读原档 | runConfig及敌压仍为原值；新局设置不覆盖 |
| SAVE-02 | 浏览器导出/导入、本地继续、两备份回退 | 难度/种族/地图一致；存档损坏不产生默认新局 |
| SAVE-03 | battle/reward/待换兵/待精英/胜利/无尽整备/无尽战斗各存读一次 | 原流程原地续接，不回血、不重抽、不重复奖 |
| SAVE-04 | 旧dev档与双profile矛盾、同档重复导入 | 明确拒绝或一次性资源转换；不启用旧玩法、不重复本金 |
| END-01 | 第18关胜利后不操作60秒 | 留在选择页，无尽time=0，无新增训练/收入/奖励 |
| END-02 | 撤离、进入整备、整备返回、重复确认 | 仅选进入且加载成功才能开启无尽；奖励/窗口只一次 |
| END-03 | 地图加载失败、模型缺失、取消、context lost | 无旧地图fallback；原战局和订单完整；能保存/导出 |
| END-04 | 坦克架炮、潜伏者埋地、受伤英雄、待复活英雄、三批未完成舱换场 | 身份/伤损/模式/冷却/付款保持，落点合法，舱守军不丢引用 |
| END-05 | 平地图几何/八向行走/空地碰撞 | 所有地面高度0、没有旧坡道/章节封锁；建筑可碰撞可攻击 |
| END-06 | 无尽239.9/240秒与分钟59.9/60/120 | 正确进入关间和发分钟资源；不套第18关150秒、不重复战役奖 |
| END-07 | 同种子1×与DEV10×到第18关、无尽前后存读 | 玩法事件序列同语义；加速不改图/难度；读档恢复1×是预期 |
| UI-01 | 1440×900、390×844键鼠/触屏 | 三入口；三族图和特点；完整返回路径；无横溢出/重叠焦点 |
| UI-02 | 键盘/手柄完整新建、读档、无尽整备 | A/回车不透传技能，Esc/B不误取消事务，焦点可见 |
| LOAD-01 | 冷缓存/热缓存/已保存英雄与精英/变形模型 | 进入前requiredPending=0；没有首次发射/模型出现触发的明显停顿 |
| LOAD-02 | 慢磁盘、解码失败、重试、取消 | 真实阶段进度、可退回、失败原因明确；不伪造百分比 |
| LOAD-03 | 读条期间模拟状态快照对比 | time/tick/HP/energy/cooldown/订单/资源完全静止 |
| MODEL-01 | 本地真实建筑来源、Stand/开火/Death与缩放 | 不是几何替身；来源与运行证据齐全；人工视觉验收独立记录 |

建议新增单测文件：`test/mvp-save-contract.test.ts`、`mvp-endless-transition.test.ts`、`mvp-flat-terrain.test.ts`、`mvp-loading-state.test.ts`；浏览器场景放`tools/qa-mvp-menu-save.mjs`、`qa-mvp-endless.mjs`。测试fixture用独立临时profile，绝不把用户当前续局用作自动测试可变输入。

M1完成：唯一规则、所有save入口同合同、难度回归和原子存储通过。M3完成：真实模型无BLOCKED、平地图与选择加载闭环可运行、上述浏览器矩阵通过。M6包体变更后重跑离线入口和无尽资源校验。发布命令按主计划执行；不能只拿单测通过宣称视觉或60FPS达标。

## 10. 本轮实际执行的只读核查

1. 使用`Get-Content`和`rg`阅读上述源文件、地图打包脚本和runtime manifest；未运行build、未修改存档。
2. 使用以下Node＋tsx脚本读取现有导出档、直接往返四难度、统计地图数据（命令从`D:\星际`运行）：

```powershell
node --import tsx --input-type=module -e 'import fs from "node:fs"; import {readArchive} from "./src/persistence/archive.ts"; import {World} from "./src/simulation/world.ts"; import {THREE_RACE_RULES} from "./src/data/races.ts"; for(const file of fs.readdirSync("D:/Downloads").filter(x=>x.startsWith("sc2-survivors-save")&&x.endsWith(".json"))){const s=readArchive(fs.readFileSync("D:/Downloads/"+file,"utf8")).bundle.run; console.log(JSON.stringify({file,difficulty:s?.state.difficulty,phase:s?.state.phase,stage:s?.state.stage,endless:s?.state.endless,map:s?.map,rules:s?.rules}));} for(const difficulty of ["easy","normal","hard","hell"]){const a=new World({terrain:false,waves:false,rulesVersion:THREE_RACE_RULES,difficulty});a.start();const b=new World({terrain:false,waves:false,rulesVersion:THREE_RACE_RULES});b.restoreRun(a.captureRun());console.log(JSON.stringify({test:"direct-restore",before:difficulty,after:b.difficulty,paused:b.paused}));} const d=JSON.parse(fs.readFileSync("public/assets/map-acropolis/acropolis.json","utf8")); console.log(JSON.stringify({map:d.source,width:d.width,height:d.height,heightRange:[Math.min(...d.heights),Math.max(...d.heights)],levels:[...new Set(d.levels)],walkable:d.walk.filter(Boolean).length,walkCells:d.walk.length,placements:d.placements.length,ramps:d.ramps.length}));'
```

实际输出摘要：

```text
sc2-survivors-save-v1.json       easy / battle / stage7 / endless:null
sc2-survivors-save-v1 (1).json   easy / battle / stage7 / endless:null
sc2-survivors-save-v1 (2).json   easy / battle / stage7 / endless:null
上述三档 map = bc54ccf150f40935c5df1309a041144be2fce7a3861d4e4bceda8a36e852b2f2
直接restore：easy→easy、normal→normal、hard→hard、hell→hell，全部paused:true
Acropolis LE: width177 height185; heightRange[-16.49498,3.9942]
levels[0,1,2,3]; walkable53375/129536; placements150; ramps22
```

本轮结果仅证明直接数据往返与当前文件内容。未操作用户游戏浏览器，未证明完整界面链无难度bug，未找到对应10×无尽存档，未做新菜单视觉验收，也未验收真实建筑模型。
