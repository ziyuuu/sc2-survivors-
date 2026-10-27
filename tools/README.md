# 工具入口

本目录保留构建/资源流水线、后台和各批复现代码。脚本多并不意味着都应在当前版本执行；日期型验证工具依赖当批输入与版本。

| 目的 | 入口 |
| --- | --- |
| 常规回归、类型、参考资料 | 根目录 npm test、npm run typecheck、npm run docs:check |
| Web/离线构建 | npm run build:web；离线 npm run build 必须设置 SC2_DEMO_OUTPUT，见根 README |
| 运行时资源恢复 | npm run assets:restore；清单/提取/准备命令按 package.json 和资源来源文档使用 |
| 后台服务与数据库 | backend/；部署事实见 docs/project/V05_SERVER_STAGING_20261027.md |
| T01 集中检测 | t01/ 及根目录相关 t01 工具；当前产物和覆盖见 T01 收尾报告 |
| 文档数据导出 | docs/export-game-reference.mts，经 npm run docs:data / docs:check 使用 |
| 维护清理 | maintenance/；旧脚本通常锁定旧审计输入，先读代码，不直接套用 |
| 历史 QA | [历史工具适用范围](HISTORICAL_QA.md) |

V04 的 prepare-v04-application、package-v04-resources、verify-v04-browser、verify-v04-update 等用于复现 2026-10-27 打包检查；有固定本地输入/临时基线，不是无参数的一键生产发布器。不要为了让旧脚本能跑而恢复旧接口、旧存档或旧玩法。
