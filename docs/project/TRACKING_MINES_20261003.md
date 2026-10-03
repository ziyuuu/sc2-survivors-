# 人族蜘蛛雷前置修正 · 2026-10-03

用户要求“先更新蜘蛛雷”，同时明确P3的华丽特效只指英雄单位。本修正单独落实已批准P0的人族趣味卡追踪雷，P3未开工；布雷车大型雷仍随P3-A精英机制实施，不把其1200伤害/残火混入趣味卡雷。修正后的三阶段范围见[P3计划](NEXT_ITERATION_P3_RACE_EFFECTS_20261003.md)。

## 运行规则

- 每关/每轮数量仍为6/9/12，伤害120、爆炸半径2、引爆距离1.2保持。虫族爆裂虫卵、神族灵能地雷继续静态触发，原有范围包及其他支援规则保持。
- 人族雷保存埋地、钻出、追踪三个在场状态。发现半径4，仅选择合法可见敌方地面身体，按距离/ID稳定排序；钻出0.25秒后开始追踪，速度6。引爆后从在场雷表先移除，再同步兑现一次范围包，`exploded`为移除状态而非残留实体。
- 已有合法目标保持ID，不因附近新敌人随意换目标。目标失去可见性、死亡、变为空中时停住并重选附近合法对象；路径失效释放目标，下个模拟步选择可达对象。没有合法目标则停住，不追空气或凭表现定位隐藏目标。
- 复用现有合法地面寻路，逐步核对地形/坡道/静态障碍及实体结构占地；寻路优先保留0.1拐角净空，窄路仍可按实际0.3雷足迹通过。禁止穿墙、跨断崖、瞬移；隔墙进入引爆距离也不能直接引爆。布雷位置不能落进静态阻挡或载体/建筑占地，未落下数量继续按原重试规则保留。
- 保留原蜘蛛雷模型；埋地略降低展示高度，0.25秒钻出上升，追踪更新实际位置/朝向，引爆使用现有真实命中反馈。渲染不移动雷、不发伤害、不消耗战斗RNG，本次不引入新模型/贴图。

## 存档与边界

新增字段位于已保存的 `expedition.support.mines`：`phase / targetId / emergeAt / facing`，原 `id / point`保持。路径、模型姿态和装饰粒子重建，保存在场状态/稳定目标/绝对模拟时间，不用墙钟。战局schema从14升到15，永久profile仍v5；不新增旧开发战局兼容分支，不改写或清理原存档。

恢复仍暂停。钻出/追踪继续原计时和原目标；引爆后保存没有该雷，恢复不重放伤害。损坏计时、目标ID、未知状态及重复雷ID拒绝恢复；战局与永久档案仍由现有事务/双备份保存。

## 验证记录

- `npm run typecheck`通过；`npm test`最终768/768通过（新增8项雷规则测试）。最终日志：`reports/local/tracking-mines-tests-final.log`。
- 专项覆盖发现/钻出/速度、目标锁定/重选、绕墙、真实Char坡道/断崖、三族差异/可见性/暂停、钻出及追踪状态恢复、一次伤害、损坏DTO及重复ID拒绝、失效路线释放目标和布雷占地。
- `node tools/qa-tracking-mines.mjs`：本机Chrome原雷模型3项检查、0页面错误，诊断fixture静止敌人并冻结普通战斗，仅手动推进真实雷逻辑；不是自然通关或性能验收。报告：`reports/local/tracking-mines-20261003/report.json`；本地画面`emerging.png / chasing.png / exploded.png`已查看。初版fixture误改waves类型/地图导致恢复被正确拒绝，已修正fixture并重跑通过。
- `npm run docs:check`、P0生成及`--check`通过；P0批准数值未改，仅刷新shop-support源码摘要。
- `node tools/build-web.mjs`与`node tools/build-demo.mjs`通过。Web appBuildId：`990f5548dbc1b6a8f014df774a46cac5c0381006e035626042f509c6185f8225`，runSchema15。资源release仍`ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64`，538资源ID/531文件/599199318字节，没有新模型/贴图。
- 离线`dist/SC2-Survivors-Demo.html`：415092957字节（395.86MiB），SHA256 `609e0a304166571c80b3cdd8d7a32fb70d1ef84a7c9ee177954c45ced80d474c`。日志`reports/local/tracking-mines-build-web-final.log / tracking-mines-build-offline.log`。
- 正式Web/离线实际UI保存导出、重载和续局均通过，0页面错误，生产调试API不存在；恢复核心状态一致且暂停。命令：`QA_RUN_SCHEMA=15 QA_OUT=reports/local/tracking-mines-artifacts-20261003 node --import tsx tools/qa-next-p1-artifacts.mjs`（PowerShell实际设置对应环境变量）；报告`reports/local/tracking-mines-artifacts-20261003/report.json`，日志`reports/local/tracking-mines-artifacts.log`。Web还复测了页面缩放下画布/选点矩形一致，未据此声明实体捏合设备验收。

已有M6/M7、人工视觉/音效、实体手机/手柄及全息科技球原死亡片段缺口不因本修正关闭。未清理资源、提交离线HTML或部署Coze；源代码与应用/独立资源仍按既有增量发行边界交付。
