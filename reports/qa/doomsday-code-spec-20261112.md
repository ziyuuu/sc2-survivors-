# 末日兵器代码规格核对

2026-11-12 · BUILD-1.3 ·「体积优化版」工作区 `679720fefa5c`，含本地武装支援候选。本轮交付末日兵器 45 张的开发规格，并将首次紫节点领取时锁主的共用规则同步到三族设计、武装 R3 与路线图。[代码接入规格](../../docs/project/V1_3_TERRAN_DOOMSDAY_WEAPONS_CODE_SPEC_20261112.md) · [三族取得规则](../../docs/project/V1_3_FACTION_BUILDS_DRAFT_20261109.md)

| 本轮执行 | 实际结果与范围 |
| --- | --- |
| `node --import tsx tools/qa-doomsday-code-spec.mts` | 8 项参考用例通过。45 个卡号、卡名和六档数量与逐卡稿完全对应，规格的本地链接可读。普通紫首购、同名白牌复购、普通进度达 3 都保持未锁。武装先达 3 后延领，机械可先锁；反向锁武装后能混买蓝焰图纸且继续领取武装 6／9 点，过期机械领取无效。旧档待领与已领有不同的转换结果。模型另验新单名额、工时、高达的 36 枚主弹／3 炮／1 核及游标续排、堡垒炮列去重与转向。[可执行参考程序](../../tools/qa-doomsday-code-spec.mts) |
| `node --import tsx tools/qa-doomsday-card-values.mts` | 复跑 I／V 级、各 7 种 12 秒固定靶。I 级一空一地的新增实扣为蓝维京 126.50、旧紫女妖 88.32、新紫女妖 353.28。现有开舱函数将四架在队加一份已付在途交付为五架，重复交付为空；第五、第四台自然减员后查询的新身体空位为 0、1。三类普通在途弹均能在到达前拦下。特装调度和新单余量来自隔离工具，弹道、扣甲和旧单交付使用游戏代码。[复现程序](../../tools/qa-doomsday-card-values.mts) |
| 四个既有回归文件 | 61 项通过。覆盖当前武装商店及领取、原生生产、补员检查点和次生伤害。现版武装的购牌链用例仍在第三个有效进度断言 `main='armed'`；共用规则接入时，这个断言需移到成功领取后的节点。此次通过确认的是当前基线。[购牌链](../../test/armed-support.test.ts) · [共用进度代码](../../src/simulation/progression/build-progress.ts) |
| `npm run docs:check` | 当前生成数据与游戏源码匹配。 |

参考程序从裸装 World 读取 V 级「末日过载」未开过载和 V 级「虎式」架炮的实际面板，计算得到高达首测 3665.97／秒、19126.80 HP，绝望堡垒 4692.44／秒、7903.09 HP。火力为无甲无属性加成靶的武器预算；炮列站位和逐击护甲决定实际扣血。前轮 12 个浏览器场景的画面及其旧参数保留在 11 月 11 日报告。本轮核对运行于 Node，正式候选中的机甲挂点、高达整机连续交火、正常关间至续局以及同预算战斗仍待实装验证。[前轮可行性场景](doomsday-fx-feasibility-20261111.md)

复跑基线回归：

~~~powershell
node --import tsx --test --test-reporter=spec test/armed-support.test.ts test/expedition-production.test.ts test/v01-supply-checkpoint.test.ts test/expedition-secondary-damage.test.ts
~~~
