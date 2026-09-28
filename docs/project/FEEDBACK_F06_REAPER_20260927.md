# F06 死神射击排查与 F07 方向独立回归 · 2026-09-27

批准基线：`MVP_FEEDBACK_F05_F07_APPROVED.md`。本记录是模拟／代码核验，不是人工模型、动作或性能验收。

## 根因与修复

`src/simulation/formation/engagement.ts` 的多人交战射击位置仅登记枪兵、劫掠者、恶火、坦克。死神和其他友军一起交战时没有自己的射击位置，`goal()` 回落到敌人坐标；射击冷却期间仍执行移动，因此会继续靠近敌人。

新增回归先失败：`F06 reaper has a ranged engagement slot with squad peers instead of walking into the target`，错误为 `reaper must receive a shooting arc, not the enemy body`；同次基础数值／双击护甲测试通过。只在现有位置分配登记死神，随后二项均通过。保留已有位置优先顺序、可通行／射线／碰撞／边界检查，不改全兵种队形规则。

死神维持射程 5、两击各 4、周期 `1.1 / 1.4 = 0.7857142857142858`。护甲按每击结算：3 甲目标承受 `(4−3)×2 = 2`，不是总计 8 再减一次甲。低单击伤害对护甲敏感是原数值机制，未据此增伤、加射程或加速。

## 诊断入口和边界

开发服务器 F1 面板新增“开始死神／枪兵射击诊断”。只观察玩家普通／精英枪兵和死神，默认关闭；最多 16 单位、最近 600 条记录。停止保留记录，重新开始清空；换局或时间回退自动清空。

开发控制台 `window.__SC2_DEBUG__.shots.report()` 可读取当前记录；含实际出手序列和受击生命／护盾变化、目标、距离／射程、攻击周期、瞄准误差、冷却、下一发时间、前摇、移动／重定位、锚点距离、越崖、合法性／射线及动作。原因分类为真实出手、无目标、非法目标、遮挡、射程外、前摇、冷却、转向、重定位、越崖和队形。末六条与累计出手／伤害可直接在 F1 查看。伤害字段只表示该次单位更新中的主目标变化，不是范围伤害总计。

`src/diagnostics/shot-diagnostics.ts` 只由原有 `import.meta.env.DEV` 的调试安装入口接入；不新增生产状态修改接口、模拟事件、随机调用或存档字段。开启／关闭诊断的相同种子 900 次更新产生完全相同的 `captureRun()`，同时验证容量上限和真实伤害记录。此模块不宣称生产包检查已经完成，最终构建由主任务核验。

## 实测对照

`test/feedback-reaper.test.ts` 使用固定种子 627、60 Hz、10 秒受控单位更新。目标保留生命以观察连续攻击；移动样本目标随固定路径移动，狭口使用两侧障碍。不是自然战局或硬件性能样本。

| 单位／场景 | 实际出手 | 第一发秒 | 平均间隔秒 | 最小边缘距离 |
| --- | ---: | ---: | ---: | ---: |
| 枪兵静止 | 15 | 0.3500 | 0.64762 | 3.3000 |
| 枪兵移动 | 13 | 0.4000 | 0.75000 | 2.7872 |
| 枪兵狭口 | 15 | 0.3500 | 0.64762 | 3.3000 |
| 死神静止 | 12 | 0.3167 | 0.82121 | 3.3000 |
| 死神移动 | 12 | 0.4167 | 0.84242 | 3.3004 |
| 死神狭口 | 12 | 0.3167 | 0.82121 | 3.3000 |

间隔包含 60 Hz 离散步、转向、前摇及实际移动位置，所有相邻真实出手均不短于各自有效周期；未将动画时长当成伤害时钟。静止与狭口样本不再在冷却期间向近战距离推进。初始背对目标仍完成有限转向并正常开火。

补充检查：死神三型精英和普通兵各自零天赋／S01＋微操组合，共 8 组；连续刷新属性不叠加范围／周期／伤害；枪兵不能使用死神跳崖；死神跳崖期间零出手、合法落地后恢复；空中目标和前摇期间死亡目标不产生虚假出手；真实攻击事件数量与射击次数一致。已有原模型片段映射、两种动作模式不改模拟和读档不重放攻击事件的测试共同通过。人工逐模型表现仍待视觉任务和用户验收。

## F07 独立回归

`test/feedback-direction-independent.test.ts` 对三族、各自全部发展方向、种子 41／93／207、每个方向 30 页随机商店进行对照：发展只给当前方向合法动作；固定同阵容、同随机序列和窗口，随机商店完整报价逐项相等，不受方向筛选。另验证发展刷新 50 → 商店刷新 90 → 130 的共享计数、方向保存、读档报价不变和商店中拒绝修改发展方向。该项未要求修改运行规则。

## 实际执行

初次受限环境执行 `node --import tsx --test test/feedback-reaper.test.ts` 和 `--test-isolation=none` 均因 Node／esbuild 子进程 `spawn EPERM` 无法启动；随后获工具授权在隔离外运行相同本地测试，才取得上述红绿证据。

最终定向命令：

```text
node --import tsx --test test/feedback-reaper.test.ts test/feedback-direction-independent.test.ts test/feedback-attack-playback.test.ts test/native-traversal.test.ts test/controls-v18.test.ts test/feedback-shop.test.ts
```

实际结果：67 通过、0 失败、0 跳过，退出码 0。`npm run typecheck` 退出码 0。

本分任务未运行全量测试、构建、浏览器／离线存读或自然性能测试，未提交、清理磁盘或冻结发布版本。它们由主任务汇总执行。未改变 M4／M5 人工视觉、M6 全场景性能或 M7 最终签收的开放状态。

## 后续独立复核：F06 数值与 F05 存档

复核父任务的 `heroes.ts`、`refreshExpeditionHero`、`carriers.ts`：18 英雄 HP／盾符合批准表；每击 ×1.15、周期 ÷1.15 在派生属性各应用一次。`unitData()` 仍返回原始基础伤害，真实 `fire()` 使用已派生 `weaponDamage`；英雄不进入普通武器多段模式，未发现遗漏增幅或重复乘法。净化者截击机保留原 1.2 系数后只再乘一次 1.15，普通航母不继承该增幅。英雄成长、护甲、复活价格与技能数值未在该数值修改中改变。

新增 `test/feedback-f05-f06-review.test.ts`，独立验证 18 英雄真实普攻伤害（净化者船体仍零攻击）及净化者截击机真实双击。受伤旗舰和截击机保存／恢复后，多次刷新仍保留生命／护盾伤损、已提交冷却／下一发时刻、子机数量、目标已结算生命值；不重放视觉或伤害。

复现并修复一项存档边界缺口：新中立字段 `workers` 的验证只有 `typeof`，`NaN` 可通过恢复并在后续经济更新污染钱包。新增回归先因“Missing expected exception”失败，再于 `run-fields.ts` 对 `workers`、`stats.workersRescued`、`stats.workersLost` 验证非负安全整数；缺失、NaN、无限、负数和小数均在改动 live World 前拒绝。未添加字段、兼容分支或迁移逻辑。

独立复核命令（本次实际共 51 项通过）：

```text
node --import tsx --test test/feedback-f05-f06-review.test.ts test/feedback-f06-hero-balance.test.ts test/feedback-workers.test.ts test/m4-combat-samples.test.ts test/m5-air-heroes.test.ts test/expedition-carriers.test.ts test/m1-save.test.ts
```

该命令曾误列不存在的 `expedition-carriers.test.ts`，Node 未把它计入执行；随后使用真实文件补跑：

```text
node --import tsx --test test/feedback-f05-f06-review.test.ts test/carriers.test.ts
```

补跑 14 项通过、0 失败、0 跳过；包含 11 项已有截击机所有权／付款／伤害／保存回归。类型检查再次退出码 0。两组有 3 项重叠，不能把总数相加当作独立测试数。

另发现 `tools/qa.mjs` 工人字段重命名后仍引用未定义局部量 `scvs`，已由 F05 代理修正。`tools/balance-study.mts` 的 `perScv` 则来自其独立历史 `tools/balance-profile.mjs`，复核后确认应保留。

## 后续独立视觉代码复核与发射锚点修复

检查 `animated-batch.ts`、`hero-feedback.ts`、`battle-effects.ts`、`friendly-labels.ts`。细橙边在标准材质已有 normal 计算之后加入发光值，沿用克隆材质的透明／深度设置；本次没有执行真实 GPU 编译，不能把源码检查称作 GPU 验收。头顶英雄标签仅保留生命／盾，固定技能栏未由该改动删除。新增效果池测试实测弹体先占槽、命中核心优先于装饰，重复渲染只消费事件一次，存读不重播已结算核心；渲染前后 World 快照一致。

复现一个实际表现错误：大和在 `(0,0)` 开始施法，1 秒前摇期间移动到 `(3,0)`；真实 `skill-launch` 位于 `(3,0)`，飞行弹体重建仍取旧 `cast.origin=(0,0)`。原回调每帧将伪事件时间设为当前时间，实际挂点样本固定为技能第 0 秒；并非随当前骨骼每帧漂移，而是闪光／弹体使用了不同的发射位置与姿态。

新增移动施法回归先失败 `0 !== 3`，随后修复：

- `HeroCast.presentationLaunch={x,z,facing,poseSeconds}` 在真实发射时记录一次，随已有 `heroCasts` DTO 保存。它只描述尚未结束飞行的表现起点，不参与伤害、选敌、碰撞、随机或技能规则。
- `VisualEvent.weaponPoseSeconds`、粒子池、Three 挂点矩阵和已消费事件计数仍为重建数据；事件本身不入档。闪光与飞行重建使用同一保存姿态，源单位移动／死亡／被移除后也不改发射点。源单位不存在时从固定英雄身份恢复模型、飞行层与固定缩放。
- 原 `cast.origin`、`point`、`at`、`damage` 和已命中集合保持；不迁移旧开发档，继续本轮 schema8。新增锚点存在时验证有限数值及非负姿态时间。
- 未发生真实发射的记录不显示在飞行弹体列表中；已结算技能仍不重放。

最终定向命令：

```text
node --import tsx --test test/feedback-visual-review.test.ts test/feedback-hero-presentation.test.ts test/m4-combat-samples.test.ts test/m5-air-heroes.test.ts test/m5-hero-control-event.test.ts
```

实际 22 项通过、0 失败、0 跳过；`npm run typecheck` 退出码 0。覆盖前摇移动、飞行中移动、源移除、存档恢复、锚点校验以及原英雄实际伤害／技能时间回归。该轮复核未自行执行构建或浏览器，后续浏览器和全量结果由主任务记录。
