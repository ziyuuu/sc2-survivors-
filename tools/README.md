2026-10-29挑战关当前回归：node --import tsx --test test/special-roster-health.test.ts。旧inspect-special-roster-20261029.mts只适配修复前版本，不覆盖历史调查报告；见[修复记录](../docs/project/SPECIAL_ROSTER_FIX_20261029.md)。

# 工具入口

2026-11-17 末日兵器实机入口：`node tools/serve-doomsday.mjs`，打开 <http://127.0.0.1:5199/preview/doomsday-showcase-20261117/>。45 项、九节点三种对照、五位机甲驾驶员及正常玩家流程的复验命令见[展示说明](../preview/doomsday-showcase-20261117/README.md)；[本轮结果](../reports/qa/doomsday-implementation-20261117.md)区分独立场景、真实交易和完整战役验收。

2026-11-11 武装支援实机入口：`node tools/serve-armed-support.mjs`，打开 <http://127.0.0.1:5196/preview/armed-support-showcase-20261111/>；可双击 `preview/armed-support-showcase-20261111/启动展示.cmd`。45 项正式 World/渲染/音效重放及九组同种子节点对照见[展示说明](../preview/armed-support-showcase-20261111/README.md)。`qa-armed-showcase.mjs` 逐项重放，`verify-armed-showcase.mts`核验逐卡状态证据，`qa-armed-player.mts`通过正式玩家 UI 检查关间购买/节点/下一战/恢复（隔离工程检查点）。模型/效果/声音来源用 `audit-armed-support-sources.mjs` 核验；模型定向注册用 `register-armed-support-assets.mts`，避免全量重建保留构建。第一批免费生产与正式波次仍待合流。

2026-11-11 武装支援设计审阅：`node --import tsx tools/build-armed-support-design.mts` 从候选配置生成完整 45 张文案、逐卡本地资源盘点及可直接打开的卡面审阅 HTML，输出 `reports/local/armed-support-design-20261111`。`node tools/qa-armed-support-design.mjs` 用独立 Chrome 检查三端代表样张与全部 45 项卡面切换，截图留本批 local；不运行 World、交易或玩家存档，不代表 45 项正式实机重放已经完成。范围与依赖见 [本轮设计](../docs/project/V1_4_TERRAN_ARMED_SUPPORT_CARD_DESIGN_20261111.md)。

2026-11-06 [1.2 自动战斗](../docs/project/V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md)：`test/auto-combat.test.ts`、`check-auto-combat-contact.mts`、`check-auto-combat-modes.mts`、`measure-auto-combat.mts`提供有限逻辑/接敌/模式/性能对照。`qa-auto-combat-20261106.mjs`使用HUD替身画面与实际IndexedDB；`qa-auto-combat-field.mjs`使用完整渲染器和正常时钟的合成敌人场景。复用教学工具时设置`SC2_TUTORIAL_WORK_ROOT`、`SC2_TUTORIAL_DIST_ROOT`、`SC2_TUTORIAL_VERSION`到独立1.2目录，默认1.1路径保持。旧基线需按本批QA记录的重建补丁准备，不能把当前源码当改前样本。

2026-11-06 [无尽更新](../docs/project/ENDLESS_UPDATE_20261106.md)：`test/endless-update.test.ts`覆盖分组轮长、15%提速、掉落/结算、旧档下一轮切换、生成窗口与高编号迁移；`node tools/qa-endless-update-20261106.mjs`使用正式HUD、隔离合成状态和渲染占位接口验证三尺寸及真实IndexedDB轮换/失败/刷新，`--entry-only`核验独立 `dist/endless-update-20261106/web` 真实菜单入口。临时产物只进本批reports/local，均不发布或使用玩家档案。

2026-11-06 [两项反馈修复](../docs/project/PLAYER_FEEDBACK_FIX_20261106.md)：`test/player-feedback-fixes.test.ts`验证正确购买/换装/保存边界；`node tools/qa-player-feedback-fixes-20261106.mjs`用临时本机页面、隔离合成账户和正式装备UI做31组三尺寸操作与真实IndexedDB刷新恢复。没有战场渲染或玩家档案。下方11月5日复现工具保留旧故障断言，不用于修复验收。

2026-11-05 [两项玩家反馈复现](../docs/project/PLAYER_FEEDBACK_REPRO_20261105.md)：`node --import tsx tools/inspect-player-feedback-20261105.mts` 用隔离合成状态核验孤星紫/橙精英购买与一键装备，当前断言用于记录未修复故障；`node tools/qa-player-feedback-20261105.mjs` 在临时本机页面挂载生产装备UI，核验真实按钮禁用、卸下后恢复及普通升级，不运行战场渲染、不使用玩家档案。输出仅在本批reports/local，不修改正式游戏或发布。

2026-11-04 的[Coze 前端核验](../docs/project/COZE_FRONTEND_ACCEPTANCE_20261104.md)使用 `verify-coze-frontend-http-20261104.mjs --aliases-only` 定向复核两条 CDN 兼容地址。完整 HTTP 模式按固定发布清单核对文件。`verify-coze-frontend-browser-20261104.mjs` 和 `--historical` 分别以自然首关及预置真实旧协议/非空装备的隔离档案核验线上清理和续局，使用 `node --import tsx` 串行执行。

2026-11-03 [缓存脚本升级修复](../docs/project/COZE_CACHE_WORKER_FIX_20261103.md)：`verify-cache-worker-upgrade-20261103.mjs [--fixtures-only|--game-only]`在隔离Chrome和本机服务验证旧脚本升级、清理失败恢复及真实检查点保留；GPU检查串行。`package-cache-worker-fix-20261103.mjs`读取本批独立Web构建和固定压缩基线，生成9文件Coze增量并读回ZIP；拒绝覆盖现有交付目录，不提交推送或部署。详细构建步骤、版本和清理边界见记录。

2026-11-03 [Coze线上核验](../docs/project/COZE_LIVE_CHECK_20261103.md)：`verify-coze-live-20261103.mjs --http|--browser --race=terran|zerg|protoss [--touch]`核对公开交付和三族正常首关/续局。`inspect-coze-delivery-20261103.mjs --http|--browser`比较CDN请求变体并用全新Chrome观察实际SW；`--layout-profile=profile-zerg-<timestamp>`复核本批档案的稳定旋转布局。`inspect-coze-cache-20261103.mjs profile-terran-<timestamp> [--worker-only]`观察本批测试档案的缓存清理或实际Worker脚本。三者不部署、不使用真实玩家档案、不提交统计/反馈；浏览器串行，临时输出进本批reports/local。固定文件名/hash限本次发布。

2026-10-30 [Coze修复更新](../docs/project/COZE_REPAIR_DEPLOY_20261030.md)：`package-coze-repair-20261030.mjs`锁定baf0d94源码及v6资源，生成5文件增量并逐条读回ZIP；`verify-coze-repair-20261030.mjs --baseline|--live`只读核验公开入口/缓存头/文件SHA，`--serve`在127.0.0.1:18906提供本机压缩入口，后台关闭。浏览器交互通过当前已授权Coze对话完成；工具本身不部署。最新Git交付快照另含v6已上线的清单和两首音乐，使仓库入口依赖完整，不需要再向Coze覆盖这些已有资源。

2026-10-30普通坦克长线[复核与第二轮修复](../docs/project/TANK_EFFECT_FOLLOWUP_20261030.md)：`verify-tank-followup-20261030.mjs`在诊断打包中读取94b8a3d旧粒子实现，验证新物理断言与同粒子位移，不替换生产文件；`inspect-tank-effects-20261030.mjs --followup [--baseline]`做同版定向渲染；`record-tank-effects-20261030.mjs --followup`录普通/攻城两段并生成前后对照。输出在本轮reports/local与dist/tank-effects-20261030，不部署。

2026-10-30坦克拖尾[修复与验证](../docs/project/TANK_EFFECT_FIX_20261030.md)：`node tools/inspect-tank-effects-20261030.mjs`渲染四套既有特效与独立火星层，`--baseline`只在诊断中读取2737b9f旧实现。`node --import tsx tools/inspect-tank-particle-direction-20261030.mts`核对实际位移与拖尾方向，重力置零仅在诊断副本使用。输出在`reports/local/tank-effects-20261030`，不改游戏或发布；正式回归为`test/source-particle-tail-motion.test.ts`。

2026-10-29挑战关异常死亡调查：`node --import tsx tools/inspect-special-roster-20261029.mts`检查3种关共12组装备/受伤/入场缓存对照，无战斗固定步并检查返回首次刷新。它断言当前缺陷并写入本次调查报告，修复后须另建回归、不要覆盖历史证据。见[根因与边界](../docs/project/SPECIAL_ROSTER_INSPECTION_20261029.md)。

2026-10-29解锁反馈见[修复与复现](../docs/project/UNLOCK_FEEDBACK_FIX_20261029.md)。`test/development-unlock-feedback.test.ts`覆盖失效候选清理与首次解锁排期；`qa-unlock-feedback.mjs`使用命名Web构建、实际HUD和受控账户检查三尺寸，`--entry-only`检查同批正式Web入口。仅本机服务和独立浏览器数据，输出到`reports/local/unlock-feedback-20261029`，不部署。修复前`inspect-queen-unlock-20261029.mts`保留历史断言，勿在新规则上覆盖旧报告。

本批Coze含BGM增量交付见[步骤与结果](../docs/project/COZE_FEEDBACK_BGM_UPDATE_20261029.md)。`package-coze-feedback-bgm.mjs`锁定批准源码、旧资源release和正式Web构建，新增两首MP3与清单，生成7文件增量ZIP并逐条读回；`node --import tsx tools/verify-coze-feedback-bgm.mts`使用ZIP实际解压件加旧资源，检查播放、首战、合成档和本机入口回退。两者不部署，日期输入与临时目录见交付说明。

本目录保留构建/资源流水线、后台和各批复现代码。脚本多并不意味着都应在当前版本执行；日期型验证工具依赖当批输入与版本。

2026-10-29孤星/无尽/掉落见[本地实现与范围](../docs/project/GROWTH_LOOT_IMPLEMENTATION_20261029.md)。`node --import tsx tools/measure-growth-loot-20261029.mts`对四难度、五种参与/诱饵/模块条件各16种子进行有限原生机会/结算重放，生成/拾取/销毁/带出与全部来源分账；没有战斗存活或真人概率含义。`node tools/qa-growth-loot-ui.mjs`用命名Web资源和正式UI函数检查三尺寸孤星说明；`--entry-only`检查正式Web菜单及新游戏种族选择，使用临时本机服务。`inspect-growth-loot-20261029.mts`已标记为调整前历史检查，须匹配旧源码，不得在新规则上覆盖历史报告。

2026-10-29 BGM见[接入记录](../docs/project/BGM_INTEGRATION_20261029.md)。`tools/bgm-audition/render.py --full`生成完整循环编配，`package.mjs`将指定输出登记为两个独立音乐资源，`verify.py`做完整解码/响度/循环采样核验。`build-checks.mjs`生成本机压缩资源检测页与仅含两曲的离线播放器；`qa.mjs`使用18892临时服务检查三尺寸、正式Web菜单及离线播放，`check-clock.mjs`用Chrome模拟音频输出核验真实媒体/Web Audio波形和循环。所有检测入口只留在`reports/local/bgm-integration-20261029`，不能作为部署输入；物理设备与用户听感单列。

2026-10-29关间操作见[本批记录](../docs/project/FEEDBACK_ACTIONS_20261029.md)。`node tools/build-feedback-actions-diagnostic.mjs`生成有受控装备夹具的本机入口；依赖保留的`dist/runtime-lifecycle-20261028/final/web`原版清单及`sites/size-optimized-site/public`压缩资源，不能发布。`node tools/qa-feedback-actions.mjs`自动临时启动18891服务，使用独立Chrome上下文检查三种视口、菜单音频、装备操作和刷新恢复，结束关闭；若手动使用`serve-feedback-actions-diagnostic.mjs`，不要同时运行同端口检查。`node --import tsx tools/measure-feedback-shop.mjs`对三个关段分别固定抽取2000组，比较两种白色全军卡买满前后，不是自然游玩或整体平衡验收。临时输出在`reports/local/feedback-actions-20261029`。

2026-10-29关间音频对照见[结果](../docs/project/FEEDBACK_PERFORMANCE_20261029.md)：`build-intermission-diagnostic.mjs baseline|candidate`、`serve-intermission-diagnostic.mjs`、`measure-intermission.mjs baseline|candidate`。使用现有压缩资源与本机18890端口；基线取`ff8140b`音频源码，检测入口有固定种子和设备预算，不发布。先完成CPU检查，再串行测量两版，使用独立临时浏览器数据。

对应Coze更新见[交付步骤](../docs/project/COZE_INTERMISSION_UPDATE_20261029.md)。`package-intermission-patch.mjs`为本次日期型打包工具：输入为`ff8140b`中的Safari候选压缩快照和`dist/intermission-release-20261029/web`正式Web构建，输出4文件增量包；它会校验旧appBuildId，不适用于已经覆盖的新快照，也不会部署服务。

| 目的 | 入口 |
| --- | --- |
| 常规回归、类型、参考资料 | 根目录 npm test、npm run typecheck、npm run docs:check |
| 运行过程调查复现 | inspect-runtime-*-20261102；[版本、缺陷断言与浏览器范围](../docs/project/RUNTIME_CODE_AUDIT_20261102.md)，不作为修复后正确行为验收 |
| Web/离线构建 | npm run build:web；离线 npm run build 必须设置 SC2_DEMO_OUTPUT，见根 README |
| 运行时资源恢复 | npm run assets:restore；清单/提取/准备命令按 package.json 和资源来源文档使用 |
| 后台服务与数据库 | backend/；部署事实见 docs/project/V05_SERVER_STAGING_20261027.md |
| T01 集中检测 | t01/ 及根目录相关 t01 工具；当前产物和覆盖见 T01 收尾报告 |
| 文档数据导出 | docs/export-game-reference.mts，经 npm run docs:data / docs:check 使用 |
| 维护清理 | maintenance/；旧脚本通常锁定旧审计输入，先读代码，不直接套用 |
| 历史 QA | [历史工具适用范围](HISTORICAL_QA.md) |
| 宣传视频隔离拍摄与剪辑 | [V4局部重拍](promo-video/V4R1_README.md) · [五分钟V4](promo-video/V4_README.md) · [第三版](promo-video/V3_README.md)；隔离拍摄，不修改正式游戏 |
| 三族玩法流程演示 | 当前[80秒预告风修订](promo-video/DEMO_CINEMATIC_README.md) · [原12段录制](promo-video/DEMO_README.md)；重拍动作、音乐卡点、同屏舰装与片尾Logo，隔离录制与本地交付 |

V04 的 prepare-v04-application、package-v04-resources、verify-v04-browser、verify-v04-update 等用于复现 2026-10-27 打包检查；有固定本地输入/临时基线，不是无参数的一键生产发布器。不要为了让旧脚本能跑而恢复旧接口、旧存档或旧玩法。

反馈版可用 `prepare-v04-application.mjs --output dist/<新目录> --baseline dist/V04-20261027/Application --readme docs/project/COZE_FEEDBACK_DEPLOY_20261027.md`；`verify-v04-update.mjs` 支持 `--app`、`--baseline`、`--report-root`。`update-compressed-game.mjs <已存在的压缩public目录>` 更新游戏代码、样式和模型身份映射，要求已封存的原始内容与压缩清单/索引完全匹配；同ID内容变化也拒绝，不替代首次压缩资源流水线。首次封存、实际结果见[四项稳定性修复](../docs/project/STABILITY_FIX_20261102.md)。

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


## 2026-11-02 两轮审查修复验证

[本批修复与边界](../docs/project/AUDIT_FIXES_20261102.md)。正确行为回归在 `test/audit-persistence-contracts.test.ts`、`audit-lifecycle-contracts.test.ts`、`decoder-recovery.test.ts`、`runtime-resource-recovery.test.ts` 及现有gamepad/packed-cache测试。`verify-audit-browser-20261102.mjs`建立独立源码构建及临时Chrome来源，显式选择 `--continuation-only --normal-only`、`--policy-only` 或 `--texture-only`；后两者可加 `--no-build` 复用当次构建。纹理GPU辅助模块只由该诊断构建导入，不进入正常玩家构建。输出在 `reports/local/audit-fixes-20261102`，工作完成后按规则清理。

`inspect-runtime-simulation-20261102.mts terran|zerg|protoss` 的固定seed、有限18关加2轮无尽可用于修复后的连续状态检查；使用生命保护及有限辅助清敌，不代表自然游戏或性能达标。其余原审查故障断言的适用范围见 `HISTORICAL_QA.md`，不覆盖原审查报告。

## 2026-11-05 首局教学本地候选

**当前入口为固定脚本版本2。** 显式设置 `SC2_WEB_OUTPUT=dist/tutorial-1.1-guided-20261105/web` 后运行 `node tools/build-web.mjs`，再运行 `node tools/build-tutorial-candidate.mjs`。先建立输出父目录，保护原1.0和共享dist/web。当前服务 `node tools/serve-tutorial-candidate.mjs` 使用18912端口，审阅页 `/review/index.html`，默认无诊断入口／后端。

`node --import tsx tools/probe-guided-tutorial.mts terran|zerg|protoss` 是有限自然伤害／生产的模拟层回放；`--boundaries` 在各等待节点用克隆检查点验证恢复和立即跳过，克隆不改变主回放。`build-tutorial-diagnostic.mjs` 仅固定地图seed17并暴露应用，不加保命或额外伤害。`qa-guided-tutorial.mjs terran|zerg|protoss --fast` 使用高亮控件及有限原生固定步加速做功能QA；`--record` 禁止加速，从无档开始，分别录桌面／模拟横屏／模拟竖屏并捕获游戏主音频总线（无麦克风）。三个浏览器工作串行。`--fixture=...` 仅用于隔离QA续档恢复，不用于正式录屏。

录屏复用项目已有FFmpeg：将 `sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe` 硬链接到本任务临时 `playwright-tools/ffmpeg-1011/ffmpeg-win64.exe`，并将 `PLAYWRIGHT_BROWSERS_PATH` 设为该临时根目录；不下载或更改系统工具。`package-tutorial-recordings.mjs` 转为MP4、校验可解码时长并提取审阅帧。`qa-guided-recovery.mjs` 通过隔离档及故意延迟存储，核验加载中跳过不会继续出发，并验证刷新终态。

`verify-tutorial-resources.mjs`、`verify-tutorial-cache.mjs`、`qa-tutorial-hud-baseline.mjs` 核验最终新路径的载荷哈希、旧缓存及真实入口几何；`finalize-guided-tutorial.mjs` 生成新QA、同版录屏清单、全图谱CHECKSUMS与文件增量。以下旧版自由引导／UI回退命令仅作历史复现，不用于当前脚本验收。


[实施记录、参数与验证边界](../docs/project/V1_1_TUTORIAL_IMPLEMENTATION_20261105.md)。`package-tutorial-assets.mjs` 从已核来源头像登记正式资源；通用 restore/build 流程自动接入。显式设 `SC2_WEB_OUTPUT=dist/tutorial-1.1-20261105/web` 后运行 `npm run build:web`，再运行 `node tools/build-tutorial-candidate.mjs` 生成独立压缩候选。它只读取当前封存的体积优化基线，不写共享 `dist/web` 或1.0成品。`build-tutorial-audition.mjs` 生成本机虫后A/B试听及人神声音缺口说明。

`build-tutorial-diagnostic.mjs` 生成固定种子、暴露应用对象的本机测试入口；`qa-first-run-tutorial.mjs terran|zerg|protoss` 做有限辅助流程，`zerg --lifecycle` 核验恢复、单条震动、隐藏和跳过取消。它们使用独立临时 Chrome 空档，不能代替真实玩家存档、物理触屏、自然难度或性能验证。`qa-tutorial-hud-baseline.mjs` 从不带诊断钩子的旧版／候选真实入口比较小地图及HUD几何；重型浏览器依次运行。

`verify-tutorial-resources.mjs` 逐载荷校验资源，`verify-tutorial-cache.mjs` 核验旧缓存升级与本族头像按需传输；`finalize-tutorial-delivery.mjs` 核验同版证据后生成QA摘要、文件哈希、增量清单和审阅页。呈现修订用 `--presentation-only`：先将此前QA摘要复制为本批 `presentation-baseline.json`，保留完整回归所属构建，并验证除教学UI外的已记录生产源码哈希不变；重跑27项教学相关检查至 `ui-revision-tests.log`，重新生成当前三端、资源和缓存证据。红框修订额外检查4px顶距、桌面卡片位于顶边104px内及34条竖屏完整字幕最多两行。`serve-tutorial-candidate.mjs` 在 `http://127.0.0.1:18911/` 提供正常候选，`/review/index.html` 为三端画面，`/audition/index.html` 为试听。服务不开启后端，不暴露诊断入口，不发布线上版本。

用户后续明确恢复固定面板、允许盖矿气，并要求先设计固定脚本。当前UI回退验证用`qa-tutorial-ui-restore.mjs`：同一隔离虫族账号在真实关间保存／重开，核对三尺寸、Chrome触屏媒体、完整字幕和原布局不被挤动；不是三族新玩法E2E。`finalize-tutorial-ui-restore.mjs`核验本批报告及非UI源码未变后生成当前审阅页／清单。`node --import tsx tools/check-guided-tutorial-plan.mjs`只核对[新设计](../docs/project/V1_1_GUIDED_TUTORIAL_DESIGN_20261105.md)的原价与收支；新门控、单席许可和固定计划尚未实装，不能为此运行旧自由引导脚本并宣称新教程通过。
# 1.1 短版教学（当前）

用户最新两段流程见 `docs/project/V1_1_SHORT_TUTORIAL_DESIGN_20261105.md`，三关 guided 工具只适用于旧候选。

- `node --import tsx --test test/short-tutorial.test.ts`：资格/预出发意图、三族自然战斗、十秒扣费、双白装、逐步恢复与跳过转场。
- `npx tsx tools/probe-short-tutorial.mts terran`：有限自然模拟；可换 zerg/protoss，不注入伤害/生命。
- 显式 `SC2_WEB_OUTPUT=dist/tutorial-1.1-feedback-20261106/web` 运行 `node tools/build-web.mjs`；先建立父目录，不覆盖1.0、旧教学候选或共享dist/web。当前路径与版本集中在 `tools/tutorial-candidate-paths.mjs`。
- `node tools/build-short-tutorial-candidate.mjs` 与 `node tools/build-short-tutorial-diagnostic.mjs`：独立压缩候选及只有可观察接口/固定种子的诊断入口。
- `node tools/qa-short-tutorial.mjs terran --record`：同版原生点击与正常时钟录屏。zerg=模拟横屏、protoss=模拟竖屏。`--fast`只用于功能校验，不作为正常录屏。
- 录屏使用现有本地ffmpeg映射，先设置`$env:PLAYWRIGHT_BROWSERS_PATH='D:/星际/reports/local/tutorial-20261105/playwright-tools'`；不需要重新下载工具。
- `node tools/serve-short-tutorial-candidate.mjs`：本地18913入口；诊断页面默认不对外提供。模拟手机与物理手机分列交付。
- `node tools/qa-tutorial-focus.mjs`：有限真实移镜／移动键接管／设置切页／跳过清理检查，使用已有非默认镜头偏好。
- `node tools/package-short-tutorial-recordings.mjs`、`node tools/qa-short-tutorial-playback.mjs`：压制与真实播放拖动。`finalize-tutorial-feedback.mjs`仅用于11月6日local.3历史候选；11月9日local.4使用`finalize-tutorial-polish.mjs`。
- local.4显式设置`SC2_TUTORIAL_DIST_ROOT=dist/tutorial-1.1-polish-20261109`、`SC2_TUTORIAL_WORK_ROOT=reports/local/tutorial-polish-20261109`、`SC2_TUTORIAL_VERSION=1.1.0-local.4`；原工具默认local.3不变。原始Web构建另设`SC2_WEB_OUTPUT=dist/tutorial-1.1-polish-20261109/web`。真实结果约0.5秒，录屏操作前等待当前对白播放/阅读，不给产品增加输入锁。
- `npx tsx tools/prepare-tutorial-voice-plan.mts`、`powershell -File tools/record-tutorial-voices.ps1`、`node tools/package-tutorial-voices.mjs`：已批准的离线Huihui/Kangkang完整中文配音源、压缩资源与文案映射。原始WAV和来源清单属于正式源，不能按临时录屏清理；虫后没有合成对白。M6闭包调用`tools/tutorial-assets.mjs`模块核对来源与压缩哈希。

## 近期集成检查入口

`node --import tsx tools/qa-zerg-six-design.mts --tables` 复现[虫族六单位R2设计](../docs/project/ZERG_SIX_UNITS_CODE_SPEC_20261120.md)的正常追加、独立体验节拍、零掉落与等级算术检查；不创建游戏World，不输出构建／详细日志，不代替正式战斗验收。

当前常规检查使用 `npm test`、`npm run typecheck`、`npm run docs:check`。运行日期型工具前先读[历史 QA 适用范围](HISTORICAL_QA.md)，对应日期报告决定其适用版本，不能为旧测试恢复已废止的游戏规则。

2026-11-19 [六单位主线接回](../docs/project/TERRAN_SIX_MAIN_INTEGRATION_20261119.md)：`test/terran-six-units.test.ts` 和 `test/terran-six-integration.test.ts` 核验正式家族与边界；`qa-terran-six-packaged.mts` 使用 `SC2_TERRAN_WEB` 指定同版正式构建，`SC2_TERRAN_QA_OUTPUT` 将截图／合成存档定向到 D 盘，`SC2_QA_CUMULATIVE=1` 复验三支混买。只使用隔离测试档案，完成后清理可重建输出。

三分支原生复核入口为 `qa-terran-player.mts`、`qa-terran-stacking.mts`、`qa-terran-budget.mts`、`qa-terran-dps.mts`；范围与实际结果见[主线接入](../reports/qa/terran-main-integration-20261119.md)和[规则／叠加／DPS](../reports/qa/terran-rules-dps-20261119.md)。DPS 工具的 `SC2_DPS_ROSTER=ground|air` 选择含六单位的五家族阵容，旧测量结果不能代替新版本实测。

资源恢复使用 `npm run assets:restore`，正式 Web 构建用 `SC2_WEB_OUTPUT` 定向到独立 `dist` 子目录后运行 `npm run build:web`。锁定数据检查需要相应原始 XML 输入；资源来源工具必须保留既有清单与内容哈希校验。

可重建构建、截图、日志、合成档和缓存按[产物保留规则](../docs/project/ARTIFACT_RETENTION.md)在工作结束时删除。源码、原始资源、实际运行依赖及真实用户存档保持。
