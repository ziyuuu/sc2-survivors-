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

反馈版可用 `prepare-v04-application.mjs --output dist/<新目录> --baseline dist/V04-20261027/Application --readme docs/project/COZE_FEEDBACK_DEPLOY_20261027.md`；`verify-v04-update.mjs` 支持 `--app`、`--baseline`、`--report-root`。`update-compressed-game.mjs <已存在的压缩public目录>` 更新游戏代码、样式和模型身份映射，要求资源ID集合不变，不替代首次压缩资源流水线。

## 体积优化版画质候选（2026-10-28）

适用范围与实测边界见[实施记录](../docs/project/SITES_QUALITY_IMPLEMENTATION_20261028.md)。资源：`build-quality-assets.mjs`→`build-quality-assets.py`→`verify-quality-assets.mjs`。游戏：显式设置 `SC2_WEB_OUTPUT` 后构建，再运行 `update-compressed-game.mjs <packed-public> <web>`；它保留旧程序/样式，线上旧版本清理须另行核对。

`verify-quality-browser.mjs <origin> low|high [constrained]`检查真实入口首战、分档及热缓存；`verify-quality-layout.mjs`检查稳定后的三尺寸设置页。`build-quality-harness.mjs`生成仅本机的测试入口，供 `verify-quality-lifecycle.mjs`、`verify-quality-device.mjs`、`verify-quality-rollback.mjs`使用；测试入口不能随候选发布。浏览器工具默认Chrome和本机18883端口，使用独立临时浏览器上下文，不使用真实玩家数据；GPU测试串行。

KTX2仅小样：`prepare-ktx-samples.py`、`run-basis-sample.mjs`、`build-ktx-sample.mjs`、`verify-quality-ktx.mjs`。编码器来自官方Basis Universal，样本在D盘本机处理。本批没有采纳全量KTX2，也未授权或执行线上发布。

本候选后续已发布第13版，见[发布与资源托管](../docs/project/SITES_QUALITY_DEPLOY_20261028.md)。`sites-push-large-update.mjs`处理源码推送限额，`upload-sites-assets.mjs`用于临时授权的哈希资源上传；密钥只从隐藏标准输入读取。`verify-sites-asset-storage.mjs`复核资源，`verify-quality-published.mjs`检查真实入口与首战。`repack-sites-archive.py`仅复现本次未采用的归档无损压缩实验。

## 运行内存优化（2026-10-28）

[第16版资源生命周期结果](../docs/project/RUNTIME_MEMORY_LIFECYCLE_20261028.md)：`runtime-memory-inventory.mjs`只对本地检测入口记录分类账本；`verify-safari-entry.mjs`增加`--inventory --postprocess --assert-released --unit-cache --combat-scope --equipment-scope --campaign-three --scene-scope`定向入口，使用舰装项时加`node --import tsx`。同内容3次重入、一次换族与重建、三关正常时钟及注入夹具的口径分别记录；不将检测页发布。传入`file://`入口时强制断网并断言无HTTP请求。

预下载范围需显式区分：`--predownload`使用“下载本族”，`--predownload-all`使用“下载全部”，均等待对应完成状态。第16版的3组成对测量使用前者，线上功能检查分别覆盖两者。

[峰值、KTX2与缓存释放记录](../docs/project/RUNTIME_MEMORY_20261028.md)对应Sites第15版。`prepare-runtime-ktx-assets.py`、`encode-runtime-ktx-samples.mjs`、`package-runtime-ktx.mjs`准备同尺寸衍生贴图，`prepare-runtime-ktx-site.mjs`同步明确的发布文件。`verify-safari-entry.mjs`支持`--peak --predownload --settle --reenter`和`--no-compressed`；`verify-runtime-ktx-published.mjs`核对线上文件。当前只覆盖43张大型模型法线/高光贴图，不能替代iPhone实机验证或完整GPU缓存生命周期。
