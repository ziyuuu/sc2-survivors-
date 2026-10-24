# B01 当前主线性能基线 · 2026-10-19

B01 已完成：当前 main 的最小对照可以重复运行，输入、输出、实际资源、设备与状态已绑定。游戏玩法与渲染源代码未改变，本轮优化收益为 **未实施／不适用**。下一项为 B02；SC01–SC04 全覆盖和 B03 长局/加载/交互仍未完成。

[固定看板](PERFORMANCE_BOARD.html) · [唯一状态源](performance-board.json) · [范围报告](../../reports/qa/performance-b01-20261019.json) · [原始汇总](../../reports/local/performance-b01-20261019/summary.json)

## 构建与运行条件

- main：`be9e2982944314194c6dcc9dcc535bc321749eb4`；src/test 相对 HEAD 无差异。既有其他文档和私有资源工作保留；不提交、推送或替换 Current。
- 429 个实际编译输入保存哈希和原字节；最终 JS：`978017b62e900ffc27a433e13e896ab4d2f3de5c7c9952b837e1c029ff3d4ef4`。HTML/CSS 哈希及工具、依赖锁定文件另存。
- 采用生产 boot、World、BattleRenderer、HUD 与当前舰装挂载；独立内存账户及诊断入口。与普通 src/main.ts 入口不同之处仅为可见的固定场景控制、蓝装测试配置、锁血和探针；不把诊断构建当作普通入口的无探针样本。
- 实际地图 **查尔**，recipe version3、seed529；人族、蓝色散件、地狱18跳关、友军锁血，镜头 fixed/pitch50/zoom0.9。960 固定模拟步，每步真实绘制；基线 time=141.06666666666666、tick=8464，实际 300 个敌人。
- 当前 300 上限、4∶4∶1 波次生成、随机精英与 Boss 规则保持。即时存活密度数 194/85/21 包含击杀与补位影响，不宣称战场每时刻恰为 4∶4∶1。
- Windows 10.0.26300，AMD Ryzen 7 5800U with Radeon Graphics，16 逻辑核；内存 13.86 GiB。ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)。
- Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36；独立 fresh headless Chrome profiles。1440×900、DPR1，实际绘制缓冲 1440×900，原生分辨率／完整普通特效／完整英雄特效／完整动画。
- 两轮各请求 642 个资源，清单完全一致、所有实际文件 SHA-256 校验通过，合计 403649528 字节。编译输入及产物收尾检查无漂移。

## 当前结果

两轮正式基线 run-5、run-6：冻结低探针 11.14–13.24 FPS；实时低探针 8.92–9.59 FPS。约10秒墙钟仅推进 2.47–2.92 秒模拟，期末保留 7.22–7.60 秒欠账。实时窗口丢弃模拟时间均为 0。

冻结探针窗口平均渲染 CPU 75.09–81.18 ms、GPU 33.34–33.65 ms。两者异步重叠，不能相加。当前数据支持继续定位渲染 CPU 热点；没有借本轮测量关闭任何优化或 60 FPS 目标。

| 样本 | FPS | 帧间隔 P50/P95/P99 ms | 渲染 CPU 均值 ms | GPU 均值 ms | 模拟/墙钟 秒 | 期末欠账 秒 |
| --- | ---: | --- | ---: | ---: | --- | ---: |
| run-5 / frozen-low-probe-a | 12.47 | 74.20 / 121.50 / 152.80 | — | — | 0.00 / 6.09 | 0.00 |
| run-5 / frozen-cpu-gpu | 13.02 | 74.50 / 86.50 / 114.00 | 75.09 | 33.34 | 0.00 / 8.06 | 0.00 |
| run-5 / frozen-low-probe-b | 12.55 | 75.60 / 110.10 / 117.20 | — | — | 0.00 / 6.05 | 0.00 |
| run-5 / native-low-probe | 8.92 | 106.60 / 166.80 / 186.90 | — | — | 2.47 / 10.10 | 7.60 |
| run-5 / native-cpu-gpu-following-window | 8.42 | 111.00 / 178.50 / 199.00 | 98.68 | 43.34 | 1.70 / 8.11 | 6.37 |
| run-6 / frozen-low-probe-a | 11.14 | 88.00 / 126.20 / 141.80 | — | — | 0.00 / 6.10 | 0.00 |
| run-6 / frozen-cpu-gpu | 12.11 | 77.10 / 114.10 / 163.60 | 81.18 | 33.65 | 0.00 / 8.04 | 0.00 |
| run-6 / frozen-low-probe-b | 13.24 | 73.50 / 94.10 / 121.40 | — | — | 0.00 / 6.04 | 0.00 |
| run-6 / native-low-probe | 9.59 | 97.90 / 151.40 / 188.40 | — | — | 2.92 / 10.14 | 7.22 |
| run-6 / native-cpu-gpu-following-window | 9.41 | 101.90 / 136.60 / 216.00 | 86.18 | 36.20 | 2.25 / 8.08 | 5.78 |

完整逐帧时间、CPU step/advance/HUD 包含关系、GPU query 数量/尾部未完成数、绘制次数/三角面/上传采样与模拟积压保留在原始报告。Frozen low-probe A/B 夹住同状态的详细探针样本；不据两次短样本推断探针开销为零。native 详细探针是在后续演化窗口，不能拿它与前窗做严格开销或优化比较。

## 重复性和验证范围

- 两次状态只归一实际新局 UUID；3 个原始差异路径逐项保留，后缀、time/tick、RNG、实体、事件、经济、装备账户均未忽略。归一 SHA-256：`9f15e5a956aaf69456dc4490f7b3ecee896f39151267d0df5aa6ee1d7a56d548`。状态覆盖 selectRunData 显式字段、战斗状态、敌方技能及完整装备账户；不是所有运行时缓存的序列化断言。
- 各自冻结测量前后原始状态完全相同，GPU disjoint=0；异步尾部查询计数并排除，未伪填为零。
- 低探针保留时间戳和步数/欠账读取，不能称无探针生产环境。CPU span 有包含关系；GPU 与 CPU 分开。上传只统计 Float32 texSubImage2D 和 typed bufferSubData，不宣称全量上传。
- 诊断 freeze/play 会重置窗口之间的累积；每个实时窗口在 freeze 前捕获欠账及 discarded 增量，诊断重置另列 afterDiagnosticFreeze，绝不算作追平。
- 72 个四难度×18关夹具时间检查通过；源游戏未改，未重复运行或冒称全套玩法回归。已查看3轮有效样本共6张截图；正式两轮页面/控制台错误0，请求取消分别 9/3 条，保留明细。
- 当前仅 SC02 的一个混合密集场景起点。B02 继续三族普通开局、近战/远程、治疗/护盾/群攻/结束空场、精英/Boss/装备代表场景。自然战役、物理输入、人类体验、温控试验、全内容60FPS及整体MVP均未验收。

## 失败、先导和文字勘误

- **run-1：未采样**。沙箱浏览器访问本机服务返回 ERR_NETWORK_ACCESS_DENIED。
- **run-2：未采样**。浏览器无法访问沙箱内服务，ERR_CONNECTION_TIMED_OUT；后续使用独立本机服务。
- **run-3：无效基线**。旧夹具选择了随机精英预算扣减后的空普通波次，Math.max([]) 使时间无效，实际敌人 0。原始 passed=true 仅反映当时不充分的检查，最终明确否决；原文件不改写。
- **run-4：先导样本**。有效 300 敌人及 CPU/GPU/欠账记录；资源 URL 仅匹配根路径，清单计数 1 不完整。后续修正为匹配任意 /assets/ 前缀，最终基线使用 run-5/run-6。
- **run-3/run-4/run-5：方法文字勘误**。方法文字曾误写 Mar Sara。chooseCampaignMap 的第二参数是排除的上一地图；实际 runConfig、截图及状态始终为 Char/version3/seed529。run-6 修正方法文字，游戏 bundle 未变，最终报告统一按真实查尔记录，不与旧玛萨拉样本作前后收益比较。

全部原始记录、旧构建与截图保留。run-3 的约50FPS空战场数值明确不计入性能结论；run-4 仅为先导，不混入正式两轮范围。

## 复跑

在项目根目录运行 `node tools/build-performance-b01.mjs` 生成独立入口；服务使用 `tools/serve-performance-preview.mjs`，PORT=4436。每次以新的 SC2_B01_RUN 子目录运行 `node --import tsx tools/qa-performance-b01.mts`，SC2_B01_PORT=4436。两次均完成后运行 `node tools/summarize-performance-b01.mjs <run-a> <run-b>`，检查两轮状态及资源一致再更新记录。不要覆盖已存样本。

当前本机入口：[诊断预览](http://127.0.0.1:4436/performance-b01-20261019/?gear=3)。新局默认冻结；该入口供诊断复跑，普通正式交付不变。源快照位于 reports/local/performance-b01-20261019/inputs；本批基线无需启用存档。
