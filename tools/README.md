2026-10-29挑战关当前回归：node --import tsx --test test/special-roster-health.test.ts。旧inspect-special-roster-20261029.mts只适配修复前版本，不覆盖历史调查报告；见[修复记录](../docs/project/SPECIAL_ROSTER_FIX_20261029.md)。

# 工具入口

2026-10-29解锁反馈见[修复与复现](../docs/project/UNLOCK_FEEDBACK_FIX_20261029.md)。`test/development-unlock-feedback.test.ts`覆盖失效候选清理与首次解锁排期；`qa-unlock-feedback.mjs`使用命名Web构建、实际HUD和受控账户检查三尺寸，`--entry-only`检查同批正式Web入口。仅本机服务和独立浏览器数据，输出到`reports/local/unlock-feedback-20261029`，不部署。修复前`inspect-queen-unlock-20261029.mts`保留历史断言，勿在新规则上覆盖旧报告。

本目录保留构建/资源流水线、后台和各批复现代码。脚本多并不意味着都应在当前版本执行；日期型验证工具依赖当批输入与版本。

2026-10-29孤星/无尽/掉落见[本地实现与范围](../docs/project/GROWTH_LOOT_IMPLEMENTATION_20261029.md)。`node --import tsx tools/measure-growth-loot-20261029.mts`对四难度、五种参与/诱饵/模块条件各16种子进行有限原生机会/结算重放，生成/拾取/销毁/带出与全部来源分账；没有战斗存活或真人概率含义。`node tools/qa-growth-loot-ui.mjs`用命名Web资源和正式UI函数检查三尺寸孤星说明；`--entry-only`检查正式Web菜单及新游戏种族选择，使用临时本机服务。`inspect-growth-loot-20261029.mts`已标记为调整前历史检查，须匹配旧源码，不得在新规则上覆盖历史报告。

2026-10-29 BGM见[接入记录](../docs/project/BGM_INTEGRATION_20261029.md)。`tools/bgm-audition/render.py --full`生成完整循环编配，`package.mjs`将指定输出登记为两个独立音乐资源，`verify.py`做完整解码/响度/循环采样核验。`build-checks.mjs`生成本机压缩资源检测页与仅含两曲的离线播放器；`qa.mjs`使用18892临时服务检查三尺寸、正式Web菜单及离线播放，`check-clock.mjs`用Chrome模拟音频输出核验真实媒体/Web Audio波形和循环。所有检测入口只留在`reports/local/bgm-integration-20261029`，不能作为部署输入；物理设备与用户听感单列。

2026-10-29关间操作见[本批记录](../docs/project/FEEDBACK_ACTIONS_20261029.md)。`node tools/build-feedback-actions-diagnostic.mjs`生成有受控装备夹具的本机入口；依赖保留的`dist/runtime-lifecycle-20261028/final/web`原版清单及`sites/size-optimized-site/public`压缩资源，不能发布。`node tools/qa-feedback-actions.mjs`自动临时启动18891服务，使用独立Chrome上下文检查三种视口、菜单音频、装备操作和刷新恢复，结束关闭；若手动使用`serve-feedback-actions-diagnostic.mjs`，不要同时运行同端口检查。`node --import tsx tools/measure-feedback-shop.mjs`对三个关段分别固定抽取2000组，比较两种白色全军卡买满前后，不是自然游玩或整体平衡验收。临时输出在`reports/local/feedback-actions-20261029`。

2026-10-29关间音频对照见[结果](../docs/project/FEEDBACK_PERFORMANCE_20261029.md)：`build-intermission-diagnostic.mjs baseline|candidate`、`serve-intermission-diagnostic.mjs`、`measure-intermission.mjs baseline|candidate`。使用现有压缩资源与本机18890端口；基线取`ff8140b`音频源码，检测入口有固定种子和设备预算，不发布。先完成CPU检查，再串行测量两版，使用独立临时浏览器数据。

对应Coze更新见[交付步骤](../docs/project/COZE_INTERMISSION_UPDATE_20261029.md)。`package-intermission-patch.mjs`为本次日期型打包工具：输入为`ff8140b`中的Safari候选压缩快照和`dist/intermission-release-20261029/web`正式Web构建，输出4文件增量包；它会校验旧appBuildId，不适用于已经覆盖的新快照，也不会部署服务。

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


2026-10-29虫族／舰装定向入口：`qa-zerg-melee-equipment.mjs`使用合成账户和暂停关卡，通过真实HUD验证三端逐巢进化及三族局外装备；先建立`dist/zerg-melee-equipment-20261029`父目录，再以`SC2_WEB_OUTPUT=dist/zerg-melee-equipment-20261029/web`构建。支持`--evolution-only`、`--entry-only`，不代表自然战役、原手机或性能结果。[记录](../docs/project/ZERG_MELEE_EQUIPMENT_IMPLEMENTATION_20261029.md)。
