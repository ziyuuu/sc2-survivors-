# B03：交互、加载与长局代表基线 · 2026-10-19

状态：基线记录；不是性能优化或整体游戏验收。固定 main `be9e2982944314194c6dcc9dcc535bc321749eb4`。当前游戏源码未由本任务修改；构建排除其他工作流的 economic-egg.ts 改动。

选定截图已查看 77 张；原始捕获、代表选择与实际查看分开记录。见 [图像检查记录](../../reports/local/performance-b03-20261019/visual-review/reviewed.json)。
覆盖检查 39 项；通过情况见 [语义核验](../../reports/local/performance-b03-20261019/semantic-verification.json)，不将已知产品异常改标为无错误。

选择 17 组浏览器原始记录，68 个采样窗口、153 次计时操作、123 个状态点及 145 张截图。followups-1 只采纳完成的子项；失败状态点和截图仍包含在原始组中，并单列原因，不重写成通过。看板：[统一入口](PERFORMANCE_BOARD.html)；[证据索引](../../reports/qa/performance-b03-20261019.json)。

## 方法与边界

- Windows / Ryzen 7 5800U / AMD Radeon ANGLE D3D11 / Chrome，1440×900、DPR 1，原生分辨率及完整效果；每份原始记录保留实际设备信息。
- 通常每组 3 次 × 30 秒；UI 操作按实际操作计时；路径检查为重复组件/World 移动记录；加载按阶段计时。所有重型浏览器串行。
- 详细探针计时包含仪表开销；CPU 嵌套统计不可相加，CPU 与 GPU 不可相加。冻结窗口验证完整状态不变。实时窗口记录墙钟、模拟进度、欠账；结束后的诊断冻结重置单列，不能宣称整个运行没有丢弃欠账。
- 浏览器自动输入不代表物理键鼠、真实手柄或人类体验。中性手柄是明确标记的合成设备；启用统计使用生产统计类与本地模拟传输，不发送真实遥测。
- 页面/装备数据只在本页面；不调用装备存档恢复来跳过长局。存档继续延期。

## 场景与证据

|场景|设置与记录|证据|
|---|---|---|
|SC05 地形|五图真实移动命令与追踪雷、动态建筑阻挡；组件探针旧结果单列|[followups-1](../../reports/local/performance-b03-20261019/followups-1/report.json)、[supplement-3](../../reports/local/performance-b03-20261019/supplement-3/report.json)、[terrain-1](../../reports/local/performance-b03-20261019/terrain-1/report.json)|
|SC06 掉落|181 矿物堆、75 气体堆、96 装备、混合及 64 满包；冻结和实时分开|[drops-1](../../reports/local/performance-b03-20261019/drops-1/report.json)、[drops-live-1](../../reports/local/performance-b03-20261019/drops-live-1/report.json)|
|SC07 配装/关间|空仓与合法扩仓 1,000 容量；搜索、筛选、分页、预设、换装、分解；关间生产控制|[ui-1](../../reports/local/performance-b03-20261019/ui-1/report.json)、[ui-2](../../reports/local/performance-b03-20261019/ui-2/report.json)、[followups-1](../../reports/local/performance-b03-20261019/followups-1/report.json)|
|SC08 长局/历史|实际共享规则 18 关＋无尽 6/12 轮；独立 0/1,000/10,000 条历史|[natural-2](../../reports/local/performance-b03-20261019/natural-2/report.json)、[browser-natural-2](../../reports/local/performance-b03-20261019/browser-natural-2/report.json)、[browser-natural-3](../../reports/local/performance-b03-20261019/browser-natural-3/report.json)、[history-1](../../reports/local/performance-b03-20261019/history-1/report.json)|
|SC09 加载|浏览器冷/热缓存、同页新局、换图、失败重试、独立离线 HTML|见下方加载表|
|SC10 生命周期|背包暂停、暂停菜单、同页返回继续、后台/冻结、三视口及真实 WebGL 恢复|[followups-1](../../reports/local/performance-b03-20261019/followups-1/report.json)、[supplement-3](../../reports/local/performance-b03-20261019/supplement-3/report.json)、[visibility-2](../../reports/local/performance-b03-20261019/visibility-2/report.json)、[lifecycle-1](../../reports/local/performance-b03-20261019/lifecycle-1/report.json)|
|SC11 输入/统计|键盘自动输入，中性合成手柄，统计关闭/本地模拟开启|[input-1](../../reports/local/performance-b03-20261019/input-1/report.json)|

## 已确认与需保留的结论

1. 仓库搜索和清空搜索稳定触发重入绘制异常：ui-1、ui-2 各 6 次。ui-2 三轮输入/清空均定位到 legacy-view 的 input→render，在移除聚焦输入时触发 change→render。流程完成不等于无错误，归入 U02 修复。
2. 满包失败重试保留同一地面物品；腾出一格后入包一次，第二次拒绝。96 件装备是明确压力样本，不是自然地面峰值。
3. 自然规则 Node 路线为简单、人族 bio、合法白装开局、无锁血，固定步推进 2520 秒 / 151200 步。峰值矿堆 181、气堆 75（可重叠），地面装备 18、背包 64、账本 20；最终回执 8434。这是逻辑及峰值证据，不能当作实时 FPS 或人类通关。
4. 相同 seed 的长局可能因新局 UUID 参与 Boss 掉落回执随机而分化；保留每次真实身份及状态差异，不只归一 UUID 后宣称长局完全相同。历史长度对照另行固定当前状态，明确只排除三类历史集合和身份字段进行比较。
5. 页面堆大小受 GC 与缓存影响；保留分阶段值，不能把单点增加直接称为内存泄漏。上下文恢复的模型/纹理缓存和相同页面继续语义单列。
6. 追踪雷在诊断地堡角落三次停滞，已有合法绕行路径证据；无障碍及摧毁后新雷均命中。问题归 S03，细节见后文。
7. 活动出征时新游戏覆盖提示与禁用出发按钮冲突，归 U02；加载测试明确区分同页继续和结算后新局。

## 实时与冻结采样明细

FPS 为详细探针窗口的帧间隔均值换算，未当作无探针性能目标验收。全部原始分段、CPU 项、绘制/上传量、DOM、资源、长帧和装备数据在 [summary.json](../../reports/local/performance-b03-20261019/summary.json)。

|记录/窗口|模式|FPS|P95 ms|CPU绘制 ms|GPU ms|墙钟 s|模拟 s|欠账 s|状态不变|
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
|browser-natural-2/campaign-18-frozen-1|冻结 battle→battle|32.13|38.20|29.77|11.58|30.04|0.00|0.00|true|
|browser-natural-2/campaign-18-frozen-2|冻结 battle→battle|33.85|33.10|28.52|10.47|30.02|0.00|0.00|true|
|browser-natural-2/campaign-18-frozen-3|冻结 battle→battle|33.59|35.60|28.66|10.50|30.04|0.00|0.00|true|
|browser-natural-2/campaign-18-live|实时 battle→battle|34.05|40.60|23.73|15.56|30.02|30.00|0.02|—|
|browser-natural-2/endless-6-frozen-1|冻结 reward→reward|53.09|22.20|17.61|6.32|30.03|0.00|0.00|true|
|browser-natural-2/endless-6-frozen-2|冻结 reward→reward|51.48|25.10|18.25|6.47|30.01|0.00|0.00|true|
|browser-natural-2/endless-6-frozen-3|冻结 reward→reward|51.59|24.50|18.06|6.41|30.03|0.00|0.00|true|
|browser-natural-2/endless-6-live|实时 reward→reward|51.11|24.80|18.40|6.46|30.02|0.00|0.00|—|
|browser-natural-2/endless-12-frozen-1|冻结 reward→reward|44.84|27.70|20.54|8.33|30.02|0.00|0.00|true|
|browser-natural-2/endless-12-frozen-2|冻结 reward→reward|46.26|25.80|20.25|8.37|30.04|0.00|0.00|true|
|browser-natural-2/endless-12-frozen-3|冻结 reward→reward|43.36|30.90|21.54|8.72|30.03|0.00|0.00|true|
|browser-natural-2/endless-12-live|实时 reward→reward|46.39|26.10|20.19|8.28|30.03|0.00|0.00|—|
|browser-natural-3/endless-6-frozen-1|冻结 battle→battle|37.42|40.10|21.69|10.75|30.03|0.00|0.00|true|
|browser-natural-3/endless-6-frozen-2|冻结 battle→battle|43.22|26.40|18.62|8.60|30.01|0.00|0.00|true|
|browser-natural-3/endless-6-frozen-3|冻结 battle→battle|44.12|25.40|18.25|8.47|30.03|0.00|0.00|true|
|browser-natural-3/endless-6-live|实时 battle→battle|33.31|42.80|24.25|16.72|30.02|30.02|0.02|—|
|browser-natural-3/endless-12-frozen-1|冻结 battle→battle|47.70|26.70|19.97|6.70|30.02|0.00|0.00|true|
|browser-natural-3/endless-12-frozen-2|冻结 battle→battle|47.93|26.40|19.89|6.74|30.02|0.00|0.00|true|
|browser-natural-3/endless-12-frozen-3|冻结 battle→battle|50.33|24.50|18.98|6.52|30.02|0.00|0.00|true|
|browser-natural-3/endless-12-live|实时 battle→battle|39.42|37.60|19.09|8.31|30.02|29.98|0.02|—|
|drops-1/mineral-frozen-1|冻结 battle→battle|40.76|41.90|23.11|10.00|30.03|0.00|0.00|true|
|drops-1/mineral-frozen-2|冻结 battle→battle|39.03|46.50|24.40|9.95|30.03|0.00|0.00|true|
|drops-1/mineral-frozen-3|冻结 battle→battle|22.86|113.00|41.34|13.60|30.03|0.00|0.00|true|
|drops-1/gas-frozen-1|冻结 battle→battle|53.29|24.80|18.11|6.22|30.02|0.00|0.00|true|
|drops-1/gas-frozen-2|冻结 battle→battle|49.31|29.20|19.57|6.98|30.04|0.00|0.00|true|
|drops-1/gas-frozen-3|冻结 battle→battle|40.96|35.30|23.51|8.70|30.02|0.00|0.00|true|
|drops-1/equipment-frozen-1|冻结 battle→battle|35.95|42.30|24.09|7.84|30.03|0.00|0.00|true|
|drops-1/equipment-frozen-2|冻结 battle→battle|36.40|35.60|24.02|7.58|30.03|0.00|0.00|true|
|drops-1/equipment-frozen-3|冻结 battle→battle|33.99|40.10|25.74|7.78|30.03|0.00|0.00|true|
|drops-1/mixed-frozen-1|冻结 battle→battle|47.11|24.80|18.36|7.06|30.04|0.00|0.00|true|
|drops-1/mixed-frozen-2|冻结 battle→battle|47.98|24.80|17.99|7.04|30.02|0.00|0.00|true|
|drops-1/mixed-frozen-3|冻结 battle→battle|46.73|26.10|18.52|7.08|30.03|0.00|0.00|true|
|drops-live-1/mineral-live-1|实时 battle→battle|55.34|22.70|16.47|6.43|30.02|29.98|0.02|—|
|drops-live-1/mineral-live-2|实时 battle→battle|56.00|22.00|16.35|6.41|30.02|30.02|0.02|—|
|drops-live-1/mineral-live-3|实时 battle→battle|50.28|28.20|17.93|7.17|30.03|30.02|0.02|—|
|drops-live-1/gas-live-1|实时 battle→battle|56.17|22.20|16.31|6.06|30.03|30.02|0.02|—|
|drops-live-1/gas-live-2|实时 battle→battle|58.41|20.60|15.71|5.89|30.03|30.03|0.02|—|
|drops-live-1/gas-live-3|实时 battle→battle|57.07|21.70|16.09|5.98|30.03|30.02|0.02|—|
|drops-live-1/equipment-live-1|实时 battle→battle|41.44|32.40|19.48|7.86|30.01|30.00|0.02|—|
|drops-live-1/equipment-live-2|实时 battle→battle|43.94|28.10|18.45|7.64|30.02|30.00|0.02|—|
|drops-live-1/equipment-live-3|实时 battle→battle|44.09|28.30|18.39|7.62|30.03|30.02|0.02|—|
|drops-live-1/mixed-live-1|实时 battle→battle|42.02|30.50|19.11|7.92|30.01|30.00|0.02|—|
|drops-live-1/mixed-live-2|实时 battle→battle|42.94|29.30|18.78|7.82|30.02|30.02|0.00|—|
|drops-live-1/mixed-live-3|实时 battle→battle|40.24|34.70|19.88|8.44|30.02|30.00|0.02|—|
|followups-1/paused-1|冻结 battle→battle|51.66|25.40|18.61|6.83|30.02|0.00|0.00|true|
|followups-1/paused-2|冻结 battle→battle|51.37|24.40|18.76|6.48|30.02|0.00|0.00|true|
|followups-1/paused-3|冻结 battle→battle|54.33|22.00|17.72|5.99|30.02|0.00|0.00|true|
|history-1/history-0-1|实时 battle→battle|56.02|22.30|16.30|6.06|30.02|30.02|0.02|—|
|history-1/history-0-2|实时 battle→battle|55.44|22.70|16.55|6.10|30.01|30.00|0.02|—|
|history-1/history-0-3|实时 battle→battle|50.13|29.80|18.05|7.08|30.02|30.00|0.02|—|
|history-1/history-1000-1|实时 battle→battle|56.61|21.70|16.18|5.98|30.03|30.03|0.02|—|
|history-1/history-1000-2|实时 battle→battle|57.40|21.40|15.92|5.94|30.02|30.02|0.02|—|
|history-1/history-1000-3|实时 battle→battle|58.97|20.60|15.40|5.79|30.03|30.02|0.02|—|
|history-1/history-10000-1|实时 battle→battle|57.34|21.80|15.85|5.94|30.03|30.05|0.02|—|
|history-1/history-10000-2|实时 battle→battle|44.35|41.20|20.10|7.21|30.03|30.05|0.02|—|
|history-1/history-10000-3|实时 battle→battle|38.69|48.10|22.73|6.66|30.04|30.12|0.02|—|
|input-1/neutral-pad-1|实时 battle→battle|33.66|48.30|26.15|7.54|30.03|30.03|0.00|—|
|input-1/neutral-pad-2|实时 battle→battle|33.14|47.50|26.75|7.42|30.05|30.07|0.02|—|
|input-1/neutral-pad-3|实时 battle→battle|39.06|38.20|22.98|7.07|30.03|30.02|0.02|—|
|input-1/telemetry-false-1|实时 battle→battle|42.39|33.20|21.36|6.67|30.04|30.03|0.02|—|
|input-1/telemetry-false-2|实时 battle→battle|50.91|26.20|17.93|6.11|30.03|30.03|0.02|—|
|input-1/telemetry-false-3|实时 battle→battle|50.62|26.70|18.08|6.12|30.03|30.00|0.02|—|
|input-1/telemetry-true-1|实时 battle→battle|54.00|22.40|17.01|5.95|30.02|30.00|0.02|—|
|input-1/telemetry-true-2|实时 battle→battle|54.96|21.60|16.72|5.89|30.02|30.00|0.02|—|
|input-1/telemetry-true-3|实时 battle→battle|54.76|22.00|16.78|5.89|30.01|29.98|0.02|—|
|supplement-3/near-full-live-1|实时 battle→battle|43.35|29.60|18.35|8.02|30.03|30.00|0.02|—|
|supplement-3/near-full-live-2|实时 battle→battle|42.60|31.80|18.79|8.11|30.03|30.02|0.02|—|
|supplement-3/near-full-live-3|实时 battle→battle|42.42|31.60|18.79|8.53|30.01|29.98|0.02|—|

### 计时解释

- 自动操作耗时包含自动化等待和绘制，不能视作纯事件处理耗时；原始记录另含事件到两帧的延迟。
- 同一静止场景跨轮 FPS 有波动；统计开启样本晚于关闭样本，不能据其更高 FPS 宣称开启统计会提速。生产历史的微探针使用 dt=0，只衡量该路径，不代表完整 tick。
- `simulation.step.includingController` 是继承的 B02 计时名称；B03 控制器包在其外层，控制器成本体现在 `simulation.advance`，不能按旧名称将其算入 step。
- 无窗口标签页未实际 hidden，CDP 冻结也单列；真实后台结果仅取 visibility-2。有窗口自动操作仍不代表物理输入。
- 音频准备状态有记录，但没有独立音频循环 CPU 探针；U04 音频细分仍待实施前补测。
- 掉落冻结样本停在生成时刻，画面是初始环状反馈；实时样本包含持续光柱，两种视觉相位不可当作匹配的开关前后对照。
- 追踪雷/建筑使用明确的诊断位置及真实地堡半径，验证动态阻挡与摧毁后的行为；不是玩家放置流程验收。
- 初始诊断重置后，旧 followups-1 追踪雷首帧与 browser-natural-2 开局首帧地图尚未绘出，图像原样保留并排除画面就绪验收；实际长局计时窗口开始均已无待准备资源。
- 追踪雷在诊断地堡角落三次停滞：每次6秒不命中但无穿墙；无地堡及摧毁后的新雷均命中。独立组件验证存在合法绕行路径；0.3半径直线抽样漏掉近角，0.4半径回退到未包含动态地堡的地形路径。归S03，未修复；详见 [追踪雷诊断](../../reports/local/performance-b03-20261019/tracking-mine-findings-r2.json)。
- 已有出征返回首页后，菜单提示新游戏将覆盖当前续局，但创建按钮被活动出征限制禁用。这是实际菜单行为冲突，归 U02；本批只记录，不改动出征结算规则。

## 加载分段

浏览器冷缓存指新 profile，不等于操作系统磁盘冷缓存；4438 本地服务器明确缓存资源，冷/热响应记录 CDP disk-cache 与 served-from-cache 标志。Web 为当前 main 的诊断预览，直接请求资源，未启用部署版本的资源清单/IndexedDB 下载管线；不是部署网络或生产验收。HTML 使用相同 B03 诊断代码与完整资源块，文件协议离线运行；不是旧交付冒充当前 main。GLTF 解析与编译异步时间可能重叠，不能求和得出总准备时间。

首页还包含现有后台准备策略：存在待准备工作时，opening 最多等待到导航后约 15 秒的软界限；不是所有页面都强制等待 15 秒，也不能把这个阶段全归因于下载。

|记录|阶段|毫秒|
|---|---|---:|
|loading-failure-2|cold-home|15123.04|
|loading-failure-2|required-resource-failure|6698.60|
|loading-failure-2|retry-ready|99388.32|
|loading-failure-2|retry-enter|641.53|
|loading-failure-3|cold-home|15156.31|
|loading-failure-3|required-resource-failure|5864.45|
|loading-failure-3|retry-ready|98247.88|
|loading-failure-3|retry-enter|684.43|
|loading-offline-3|cold-home|15077.24|
|loading-offline-3|first-battle-ready|111551.29|
|loading-offline-3|first-battle-enter|597.51|
|loading-offline-3|same-page-home|923.14|
|loading-offline-3|active-new-blocked-then-continue|1702.42|
|loading-offline-3|diagnostic-settlement-setup|613.37|
|loading-offline-3|same-page-new-run-ready|1142.31|
|loading-offline-3|same-page-new-run-enter|528.67|
|loading-offline-3|warm-reload-home|15058.82|
|loading-offline-3|warm-reload-battle-ready|98968.92|
|loading-offline-3|warm-reload-battle-enter|474.51|
|loading-offline-4|cold-home|15081.69|
|loading-offline-4|first-battle-ready|108298.19|
|loading-offline-4|first-battle-enter|572.50|
|loading-offline-4|same-page-home|930.27|
|loading-offline-4|active-new-blocked-then-continue|1585.82|
|loading-offline-4|diagnostic-settlement-setup|968.06|
|loading-offline-4|same-page-new-run-ready|1627.15|
|loading-offline-4|same-page-new-run-enter|491.13|
|loading-offline-4|warm-reload-home|15084.64|
|loading-offline-4|warm-reload-battle-ready|101289.54|
|loading-offline-4|warm-reload-battle-enter|458.39|
|loading-web-3|cold-home|15119.58|
|loading-web-3|first-battle-ready|106983.08|
|loading-web-3|first-battle-enter|574.07|
|loading-web-3|same-page-home|969.01|
|loading-web-3|active-new-blocked-then-continue|1672.29|
|loading-web-3|diagnostic-settlement-setup|663.31|
|loading-web-3|same-page-new-run-ready|1167.34|
|loading-web-3|same-page-new-run-enter|549.76|
|loading-web-3|diagnostic-settlement-before-map|652.85|
|loading-web-3|changed-map-ready|2770.59|
|loading-web-3|changed-map-enter|612.32|
|loading-web-3|warm-reload-home|15110.04|
|loading-web-3|warm-reload-battle-ready|93181.65|
|loading-web-3|warm-reload-battle-enter|479.63|
|loading-web-4|cold-home|15130.19|
|loading-web-4|first-battle-ready|107831.69|
|loading-web-4|first-battle-enter|615.36|
|loading-web-4|same-page-home|1019.11|
|loading-web-4|active-new-blocked-then-continue|1652.60|
|loading-web-4|diagnostic-settlement-setup|542.34|
|loading-web-4|same-page-new-run-ready|1024.60|
|loading-web-4|same-page-new-run-enter|522.49|
|loading-web-4|diagnostic-settlement-before-map|559.95|
|loading-web-4|changed-map-ready|2794.46|
|loading-web-4|changed-map-enter|759.42|
|loading-web-4|warm-reload-home|15108.75|
|loading-web-4|warm-reload-battle-ready|91741.82|
|loading-web-4|warm-reload-battle-enter|568.96|
- supplement-2 的旧 Map 包装在重置后失效，错误炮台仍被生成且追踪目标超出发现范围；渲染异常停止了主循环。其后满包窗口零帧及恢复计时均不作为正式证据，整个失败原样保留。正式动态建筑、满包及恢复证据取 supplement-3。

## 历史与问题原样保留

- natural-1 矿气类别计数使用了错误字段；修正计数后 natural-2 重新运行。旧路线其他有效记录保留。
- smoke-1 统计环境字段不符合契约，造成 4 条丢弃；当前构建改为合法诊断环境，正式统计路径另验。
- intermission-1 使用不存在的可见生产选择器；换装与分解已有记录，修正后由 followups-1 重复三轮完成。
- terrain-1 原组件步进不是完整真实移动，且换图诊断准备未显式提交地图，保留失败；改用真实 World 命令与明确资源准备，不修改游戏。
- browser-natural-2 的无尽360/720秒边界落在奖励页，保留为长局关间样本，其实时窗口推进0秒；browser-natural-3另取续入下一轮后1秒的实际战斗窗口，不能混算战斗FPS。
- supplement-1合成炮台缺少真实装备前置，资源准备正确地未预载该炮台；后续诊断改用已有原版地堡及真实半径，不将测试对象构造错误判成正式玩法缺素材。
- visibility-1 的有窗口切页仍被框架默认覆盖固定为visible；两个空白页探针保留未隐藏结果。visibility-probe-3使用原生Chrome并以noDefaults连接后，正常→最小化→正常的hidden为false/true/false；visibility-2据此验证实际游戏。
- lifecycle-1 首次继续保留暂停，脚本第二轮遗漏恢复，造成隐藏按钮超时；修正脚本后 followups-1 完成三轮暂停/继续；其 WebGL 等待误用了首次进入的 ready 状态，改由 supplement-3 按自动提交后的 idle 状态验证。
- loading-web-1/2 与 loading-failure-1 的旧4437服务访问失败保留；同环境独立4438端口先验证HTTP200，再重跑。
- loading-offline-1/2 实际首进战场完成，随后因活动出征限制而无法再次新开局，保留 disabled 按钮及原文；后续先测继续，再明确通过诊断完成关卡并执行真实撤离结算后测试新局。结算准备不算自然游玩或加载收益。
- 旧命名 HTML 与当前 main 有多处源码差异，已拒绝作为当前代码基线；只在验证资源身份表一致后复用其原样资源块，重新绑定当前诊断 JS/CSS。

## 构建、资源与后续

当前 Web、离线包装、各轮脚本和实际请求资源分别保留哈希。[校验记录](../../reports/local/performance-b03-20261019/verification.json)只证明证据一致性，不抹除上述页面错误或未通过的场景结果。
本轮未修改玩法、画质、五图、存档或 Current，未提交/推送/发布。后续修复按看板依赖推进，收益需同口径前后实测；普通游玩 60 FPS 与最终 MVP 验收仍开放。
