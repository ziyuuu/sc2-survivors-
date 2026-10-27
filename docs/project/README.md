# 当前工作入口

2026-10-27：T01 已获用户接受，原版 V04 完成并推送；Sites 体积优化版第 6 版已私有发布，压缩/合包/后台与发布已纳入 MVP 第 7/8 包。主仓库“体积优化版”分支已推送、未合入 main。V05 仍进行中，V06 最终关闭待办；阿里云备案与原部署渠道单独保留。

## 新线程必读

1. [MVP → 后续 1.0 完整交接](MVP_TO_1_0_HANDOFF_20261027.md)：版本、八包、模块、保存、运维、遗留项及启动提示词。
2. [项目结构](../PROJECT_STRUCTURE.md) 与 [根 README](../../README.md)：修改位置与可运行命令。
3. [任务状态数据](performance-board.json) 的 tasks：实时任务入口；[可视看板](PERFORMANCE_BOARD.html) 和 [计划表](PERFORMANCE_TODO.md) 为派生展示。

## 长期规范入口

- [UI 规范](UI_RULES.md)：具体变更确认、极简文案、视觉与三端布局、保存入口和已确认专项约定。
- [项目管理规范](PROJECT_MANAGEMENT_RULES.md)：统一看板、状态与完成标准、工作闭环、线程分工、文档和图片管理。
- [产物保留规则](ARTIFACT_RETENTION.md)：原始资源与当前成品保护、已完成临时产物清理。
- [根 AGENTS 目录与核心规则](../../AGENTS.md)：已按共同讨论整理，按任务决定先读哪些规范；[原指令历史](history/AGENTS_HISTORY_BEFORE_20261027.md) 完整保留。

## 当前证据

| 范围 | 入口 |
| --- | --- |
| 已确认画面与原声 | [T01 累计收尾](T01_CLOSEOUT_20261027.md)、[用户确认](../../reports/qa/t01-user-acceptance-20261027.json) |
| 打包、资源与本地更新 | [V04](V04_DELIVERY_20261027.md)、[报告](../../reports/qa/v04-packaging-20261027.json) |
| Sites 压缩与发布、MVP 归属 | [主线程核对](MVP_SITES_REVIEW_20261027.md)、[运维交接](SITES_HANDOFF_20261027.md)、[体积优化版](V04_SIZE_OPTIMIZED_20261027.md) |
| Sites 后台和加载 | [D1/R2 适配](V04_SITES_BACKEND_20261027.md)、[加载对照](V04_SITES_LOADING_20261027.md)；与阿里云 PostgreSQL 分开 |
| 服务器、后台与公开发布缺口 | [V05](V05_SERVER_STAGING_20261027.md)、[报告](../../reports/qa/v05-server-staging-20261027.json) |
| 正确性/性能限制 | [V01](V01_CLOSEOUT_20261024.md)、[V02](V02_20261024.md) |
| 输入、人类反馈与物理设备范围 | [V03](V03_20261024.md)；最终反馈归 V06 |
| 当前存档与恢复 | [D05](D05_CHECKPOINT_20261023.md) |
| 四项统计修正与正式交接 | [定稿记录](SITES_METADATA_AGENTS_FINAL_20261027.md)、[验证结论](../../reports/qa/sites-metadata-agents-final-20261027.json)；Sites 第 6 版，V04-SITES-META-001 已关闭 |
| 本轮整理与已定稿规则 | [整理安排](PROJECT_ORGANIZATION_20261027.md)、[根 AGENTS](../../AGENTS.md)、[讨论记录](AGENTS_PROPOSAL_20261027.md) |

具体日期记录保留当时事实，因此早期 V04 的“未部署”不覆盖后来的 V05 部署记录。看板 tasks 的状态也不代表报告内所有已知限制均解决。历史说明查 [文档索引](../DOCUMENT_INDEX.md)，不再将每轮进展复制到各层 README。
