# M6 包体与普通首关性能进度（2026-09-25）

这是 M6 的可复现增量记录，不是 1.0 MVP 的性能签收。参考机上的浏览器测试均为本地无头 Chrome，1440×900、DPR1。WebGL 查询确认其通过 ANGLE D3D11 使用 AMD Radeon 核显，见 `reports/local/qa-m6-gpu-capabilities/report.json`；无头窗口的呈现节拍与实际可见游戏窗口不同，仍不能代替批准稿要求的实体设备实玩。

## 本轮天赋树与三族独立培养

- 按 `docs/project/M6_TALENT_TREE_AND_RACE_PROFILE.md`，三族分别保存永久资源余额、当前付费方案、等级和投资账；各族最多投入80点。关卡和无尽奖励入本局冻结种族，跨族查看或切换不会挪用资源。现行永久档案为 v5；按用户最新要求，MVP 前不做旧开发期 v3/v4 档案迁移。
- 天赋面板已换成四线七层的图标树；未购买节点仍显示原 SC 小图标，连线、灰锁、可点、已投入、点满状态分明。选择图标只查看详情，另用“投入一级”提交购买。165个节点原效果与价格未改。
- `npm run typecheck`、`npm test`（446/446）、`npm run docs:data`、`npm run docs:check`、`node tools/check-mvp-plan.mjs` 均通过。`node tools/qa-m6-talent-tree.mjs` 在 1440×900 和 390×844 验证四线、55个本族图标、59条连线、锁定详情、跨族购买、窄屏无横向溢出及单文件断网打开；截图仅存 `reports/local/qa-m6-talent-tree/`。`node tools/qa-m6-offline-matrix.mjs` 验证人族普通、虫族困难、神族地狱从新局到本地保存、关闭页面、断网重读，种族/难度/时间保持一致。
- 天赋树阶段的 `dist/SC2-Survivors-Demo.html` 为 351,911,413 字节（335.61 MiB），SHA-256 `8B379769F614D030C2ED0159A5280D8D3EE42A2924F80128A3B02326D2683A35`；最新正式包体见文末 M6 实施增量。本阶段没有继续清理磁盘；用户报告 D 盘可用空间显示 66 GB，先前空间读数不能据此判断为项目占用。
- 新版 UI 与档案下，从真实菜单对三族普通首关各取60秒无头样本，见 `reports/local/m6-natural-talent-tree/results.json`。帧间隔 P95 人/虫/神分别为16.8/16.8/16.9ms，P99为17.2/17.2/17.2ms，固定步 P95为1.2/1.3/0.8ms，均无积累模拟欠账；人族无操作阵亡、神族开战早期有250ms呈现间隔，故不能据此签收普通1—6关稳定60+。同一参考机、无头浏览器结果仍需可见窗口和实体设备复核。

## 包体和本地磁盘

- 原转换 GLB 不变。在派生 GLB 中，将内嵌 PNG 转为 Pillow 无损 WebP，并逐图解码比较 RGBA 字节；源与派生 SHA-256 均纳入 `assets/private/m6-webp-manifest.json`。构建只在双哈希匹配时引用派生文件，否则回退原模型。M5 六组浏览器 QA 和断网单文件存读在这套派生资源上通过。
- 优化器现在只处理运行资源清单中的 141 个模型。清除专用 `public/assets/optimized` 中旧运行清单不引用的 224 个派生文件，释放 262,322,344 字节；清理前逐路径限制在该派生目录，未删除 `public/assets/animated` 原模型。磁盘清理量不计作 HTML 包体收益。
- 独立 PNG 贴图另生成 187 个逐像素一致的无损 WebP 派生，原 PNG 保留。构建只在源文件和派生文件的 SHA-256 同时匹配且 WebP 文件头合法时使用；30 张大贴图的只读探测中，gzip 后从 26,866,185 字节降到 21,129,407 字节。完整 191 张候选中有 187 张产生更小的派生，源文件合计 45,775,059 字节、派生合计 35,569,540 字节。
- WebP 派生阶段的 `npm run build`：751/751 资源、必需缺失 0、141 个无损派生模型及 187 个无损派生贴图；当时单 HTML 351,902,053 字节（335.60 MiB），SHA-256 `8508A7EBEB0907F7A7B30520BAD1B1335F4B1DD7262EB9A67201E430837F5C23`。相对 M4 已记录的 440,302,070 字节，净少 88,400,017 字节，并同时包含 M5 新内容；文末记录最新包体。

一次重建因D盘写满而产生不完整的350,748,672字节 HTML。确认 `dist/assets` 是 Vite 生成的重复资源副本后，仅删除该目录的1,337,757,747字节、失败的半成品和失效的 `dist/index.html`；`git lfs prune --dry-run` 识别52个可清理的旧本地对象后执行清理，1138个被引用对象仍保留。当前 `npm run build` 直接由类型检查与 esbuild 生成正式单文件，并先写 `.tmp`、成功后替换，不再额外在 `dist` 复制整套资源。重建后 `dist` 只剩上述有效 HTML，D盘实测剩余12,830,253,056字节；原SC源模型、报告和存档未删除。若需要另测Vite生产构建，应单独运行 `vite build`，其产物不属于离线交付包。

二次磁盘清理（2026-09-25）：确认没有运行中的 Git/Git LFS 进程后，清除 `.git/lfs/tmp` 中 29 个临时文件（2,950,624,256 字节）；删除 `.cache/m6-webp` 中 742 个可由原贴图再生的中间文件（217,592,238 字节），正式 141 个派生 GLB 和来源清单均保留；删除旧性能诊断目录中的 70 张可重跑 PNG（97,611,115 字节），指标 JSON 和 M4/M5 待验收截图保留。三项已删文件的逻辑长度合计 3,265,827,609 字节，不等同于 D 盘空闲变化；删除后 D 盘一度空闲 17,799,700,480 字节；随后又观察到约 255 MB 的 LFS 临时文件再生成（具体触发进程未确认），结束前再次移除。当前离线 HTML 的长度和 SHA-256 均未改变；751 个运行资源及 141 个正式派生模型全部存在。`npm run typecheck` 与 `npm run docs:check` 通过。本次不删除原始 SC 素材、正式 LFS 对象、存档或当前试玩包。
## 首用长帧

Chrome CPU profile 将最严重的首次战斗长任务定位到 Three.js `WebGLProgram.onFirstUse`：`compileAsync` 完成后，死亡模型及选择圈的链接检查、uniform/attribute 查询仍在第一次显示时执行；音效解码也原先落在开战后。当前资源协调器在就绪前解码音效，失败的必需音效可重试；渲染器在 1 像素离屏目标准备真实批次，并在加载阶段对程序调用 `getUniforms()` 完成首次校验。首次 11 秒追踪中，修复后人族没有 >12ms 的 `render()`、没有主线程 long task，程序数量不再于战斗中增加；证据在 `reports/local/m6-first-use/results.json` 及 CPU profile。

故障注入回归已通过：`reports/local/qa-m6-audio-failure/report.json` 验证必需音效读取失败时新局未提交、显示重试，恢复资源后可继续同一选择；`reports/local/qa-m3-failure/report.json` 验证无尽建筑失败、重试和 WebGL 上下文丢失仍保留原整备状态。真实进度回归 `reports/local/qa-m6-loading/report.json` 观察到模型、音频、GPU 等阶段，模型就绪后约 14 秒进入可确认页，玩家确认前世界时间始终为 0。

对 292 组原战场模型采用最多四路预取、仍按原顺序生成场景；并在模型读取失败时移除未完成的地图根节点。单 HTML 断网首启／同页重载的串行基线保存在 `reports/local/m6-startup-memory/report-serial.json`，四路版本见同目录 `report.json`。从菜单到新局就绪，首启约 19.05→17.58 秒，同页重载约 16.33→12.78 秒；地图模型阶段首启约 11.80→10.14 秒、重载约 10.97→8.05 秒。两组样本都只说明这台无头机器上的趋势，不等于物理冷盘或可见窗口成绩。就绪后主动垃圾回收的 JS 堆约 205 MiB，几乎未变；首次菜单出现的 0.7–1.1 GiB 未回收瞬时堆在回收后约 10 MiB，不能按常驻内存报告。更新后的 `reports/local/qa-m6-loading/report.json` 再次确认模型、音频、GPU 和确认门槛；`reports/local/qa-m6-map-failure/report.json` 确认必需地图模型故障后原战局未提交、半成品地图被移除，解除故障后重试仅保留一份地图。

前一单 HTML 上的断网矩阵 `reports/local/qa-m6-offline-matrix/report.json` 逐一完成了人族普通、虫族困难、神族地狱的新局、保存、关闭页签后的重读；三次均保持原种族、原难度和原战斗时间，所需模型没有加载错误。该矩阵不覆盖第18关后无尽或实体设备输入。最新包的单路断网存读也已通过 `reports/local/qa-m3-offline/report.json`；本轮完整测试为443/443通过，`typecheck`、`docs:check`和项目计划检查也通过。压缩努力档位的只读试验：12张最大原贴图的无损WebP method 4压缩后合计18,069,404字节，method 6合计17,506,745字节，仅减少562,659字节；尚未改变正式包的编码档位。

三族普通难度真实菜单开局各采 60 秒（`reports/local/m6-natural-prewarmed/results.json`）：固定步 P95 人/虫/神为 1.3/1.7/0.9ms，渲染 P95 为 8.1/8.8/7.7ms，模拟积债约为 0。三族 P95 帧间隔均16.8ms、P99均16.9ms、>20ms帧比例分别为0.61%/0.03%/0.11%，符合批准稿对这60秒样本的百分位阈值。虫族渲染最高17.8ms；神族渲染最高13.4ms但 rAF 曾跳到233ms；人族 60 秒样本有后半段渲染尖峰。随后的人族 35 秒带时标复测（`reports/local/m6-terran-trace/results.json`）中，固定步最高6.4ms、渲染最高22.3ms、主线程 long task 为0；rAF 仍有最多166.7ms 的间隔跳跃，需实体设备区分浏览器调度、GPU 呈现和游戏资源事件。任何一项现有无头结果均**不证明**普通1—6关持续60+。

在地形射线及敌方天赋快通道后，重新从真实菜单分别采三族普通首关60秒（`reports/local/m6-natural-ray-talent/results.json`）：三族 P95 都为16.8ms、P99为16.9ms，>20ms帧比例人/虫/神为0.26%/0.03%/0.06%，固定步 P95 为1.2/1.6/0.9ms，模拟欠账没有增长；人族无操作在约58秒阵亡，因此该段不足60秒战斗。神族开战约0.18秒处仍有一次300ms的 rAF 间隔，但同段无主线程长任务，渲染函数最高12ms。8秒 Chrome trace 在 GPU 进程记录到约120—137ms 的 WebGL CommandBuffer flush；尝试把 `gl.finish()` 移到读条结束前后复测仍出现约417ms的开战间隔及约117—133ms的后续 GPU flush，故撤回这项无效改动。保留诊断摘要于 `reports/local/m6-frame-trace-protoss/report-before-gpu-sync.json` 和 `report.json`；52.7MB原始追踪已清理。这些证据定位了主线程以外的呈现风险，尚未证明原因是游戏发令、驱动或无头合成器。

天赋语义节点原先每次由 `MVP_TALENTS.find` 线性扫描；现在按种族和语义 ID 建只读索引，零配点且无付费战术进阶时直接返回空效果。相同神族合成夹具（35普通、3英雄、56截击机、100敌、原图，见 `reports/local/qa-three-race-performance-100-35/results.json` 与 `reports/local/qa-three-race-performance-100-35-talent-index/results.json`）的固定步均值从6.29ms变为5.72ms、P95从8.7ms变为8.2ms，模拟不积债；帧间隔 P99 仍为约33ms，不能把 CPU 收益说成稳定60帧。直接注入35身体仅用于合成诊断，不是合法天赋Build验收。

最新源码再次从真实菜单采三族普通首关各60秒（`reports/local/m6-natural-talent-index/results.json`）：帧间隔 P95 均16.8ms，P99 人/虫/神为17.2/17.0/16.9ms，>20ms比例分别为0.17%/0.06%/0.06%，固定步 P95 为1.1/1.3/0.7ms，均无累计欠账。人族无操作在约58秒阵亡；虫族、神族进入关间。人族有数次99—133ms、神族有一次250ms的开战后帧间隔，均无主线程长任务，仍需目标窗口与设备证据。

本地无头 Chrome 的15秒空画布对照见 `reports/local/m6-browser-baseline/report.json`：2D 画布出现一次133.3ms的 rAF 间隔，期间也没有主线程长任务；最小 WebGL2 三角形样本没有>20ms帧。它说明无头浏览器本身也可能丢失呈现节拍，但不能排除游戏 WebGL 负载触发的另外一类 GPU 停顿。正式判定继续等待可见窗口及目标机器的同场对照。

## 高压热点与独立报告

同种子合成夹具（真实地图、25普通、3英雄、300敌；神族另有截击机）在本地 AMD D3D11、1440×900 下约30fps，单步通常10—14ms，出现0.1—3.9秒的12秒区间模拟欠账，不能当作正常关卡60+通过。三族基线见 `reports/local/qa-three-race-performance-before-talent/results.json`；后续人族样本见 `reports/local/qa-three-race-performance/results.json`。该夹具人为增加血量以保留300敌，符合批准稿的独立极端诊断类别。

扩编压力补测 `reports/local/qa-three-race-performance-300-35/results.json` 直接注入神族35普通、3英雄、起始56截击机与300敌：12秒采样约38.3帧/秒，帧间隔P95 33.4ms；固定步均值11.05ms、P95 16.8ms，渲染提交均值6.86ms，模拟欠账增加0.78秒，末尾还有51截击机，223 draw calls，JS堆约546 MiB。CPU样本以接触解算、空间查询和单位更新为主。它明确显示极端合成场景仍有性能缺口，也不等于正常终章波次必然如此；不为使报告好看而降低敌军预算、关掉特效或更改接触截断语义。

CPU profile 将热点指向 `updateUnit`、空间查询与地图视线。地图的原高度场最大3.9998，双线性插值不会超过顶点最大值；若射击端点的可见高度已经高于此上界，直接返回原密集采样必然得到的“无遮挡”，其余仍用原采样。300组随机地空/高低点乘四种目标层的规则对照通过；实际地图40,000次射线微基准较原方法缩短约7%—13%。人族同一合成夹具优化前平均固定步11.18ms，优化后两次为10.40/10.55ms，但相邻重复运行仍有波动，不把这两次差值当作稳定帧率承诺。敌军不适用玩家天赋时直接复用空效果，避免每帧建立无效上下文；不改变已购天赋效果。空间哈希的另一个微调未测到稳定收益，已撤回。

## 未关闭的发布门槛

- 自然玩法1—6关完整时长、10—12及16—18关、平地无尽、0/41/80点及35普通＋3英雄＋截击机仍未完成批准稿中的多种子、实体设备帧时验收；25普通＋3英雄／300敌已做合成夹具，不能替代正常游玩。
- 人族无操作首关会阵亡；脚本化输入控制器的零天赋战役通关能力也不足。需区分输入策略和实际平衡后再做九套 Build 的人工持续游玩，不能用无战损经济模型替代。
- 内存冷暖启动、WebGL 上下文丢失、三舰首次登场/技能首用、真实手柄与触屏设备仍须在 M6/M7 收尾。保持这些任务为未完成，不因单项包体通过而发布 1.0 MVP。

## 本次 M6 实施增量（2026-09-25）

- `M6-01` 已完成发行闭包审计：`tools/m6-release-assets.mjs` 从三族家族、18 名英雄、90 款精英、形态/死亡模型、地图摆放、外部贴图、音频、特效及 UI 追踪资源。当前 751 项可用资源全部有引用，未找到可证明为零引用的包内项；旧 Acropolis 资源已经不在本次运行资源清单。`reports/local/asset-reachability.json` 保存逐项理由、来源/派生 SHA-256 和类别字节数。构建再次校验资源 ID、路径、长度和 SHA-256，必需项缺失或单文件超过 380 MiB 会失败。没有删除原 SC 素材或清理磁盘。
- `M6-02` 的无损样板把诺娃源模型的 105 段动画中运行绑定使用的 6 段保留，舍弃 99 段未用序列；所有保留的网格、贴图、骨骼和动作 bufferView 逐字节相等。派生文件 10,853,592→5,329,660 字节，原文件保留；见 `assets/private/m6-clip-manifest.json`。M5 模型/动作浏览器回归通过。对雷兽、沃拉尊、德哈卡做的 Meshopt 几何试验解码后逐字节一致，但经现有 gzip 再编码后分别增加 28,772／27,572／33,968 字节，故没有接入正式包；见 `reports/local/m6-meshopt-probe.json`。本地未配置可用 KTX2 编码器，且主观有损画质尚待 MVP 统一验收，未将 KTX2 或有损贴图放入正式包。
- 内嵌包改为先准备菜单图标和地图定义，再按战场/阵容/增援 ID 解包；未准备的 ID 不回退到会失效的 `file://` 路径。编码分片移入浏览器 Blob，避免保留约 269 MiB 的额外 JS 堆。关间进入下一关前新增资源就绪确认，取消或失败时保持原关间选择，世界时间不推进。`qa-m6-loading`、地图/音频失败重试及 WebGL 上下文丢失出口均通过。最终包的无头离线首启/同页重载到菜单为 3.52/3.85 秒，到战场就绪为 26.80/21.98 秒，就绪后主动 GC 的 **JS 堆** 205.55/205.65 MiB；这些数据不包括 Blob/GPU/进程总内存，也未证明首次进入战场比原全量解包更快。见 `reports/local/m6-startup-memory/report.json`。
- 最终 `dist/SC2-Survivors-Demo.html` 为 **348,915,915 字节（332.75 MiB）**，SHA-256 `2F624401457DADC763E957B00E5AA63FC3584835D75295EE8CE787F40A4C5565`。相对此次改动前 351,911,708 字节减少 2,995,793 字节；距 320 MiB 努力目标仍约 12.75 MiB。`reports/local/release-manifest.json` 记录 751 项来源与派生散列、分片归属和分类体积；原始打包字节 446,485,507，去重后 378,237,523，gzip 存储 277,661,311，Base85 编码 347,078,695。
- 最终包的三族断网新局/存读 3/3 通过；浏览器存读、单文件离线存读、452 项规则测试、类型检查、数据生成/一致性检查、构建、加载进度、地图/音频故障重试及上下文丢失回归通过。`M6-03` 自然首关无头 Chrome 三族各采约 60 秒：P95 均 16.8ms，P99 人/虫/神 16.9/16.9/17.2ms，>20ms 比例 0.20%/0.03%/0.08%，无累积模拟欠账；人族无操作于第 1 关阵亡。人族有窗口自动化对照 P95/P99 16.8/16.9ms、>20ms 0.20%，仍有最高 250ms 的偶发 rAF 间隔，期间无主线程长任务且渲染函数最高 14.7ms。见 `reports/local/m6-natural-stage1/results.json` 和 `reports/local/m6-headed-terran/results.json`。有窗口自动化仍不等于人工可见设备验收。
- `M6-03` 的完整第 1–6 关三种子、`M6-04` 的合法第 10–12／16–18 关及无尽各 180 秒、0/41/80 天赋与三舰首次出手、`M6-05` 的整机/GPU 内存和正式设备复测仍开放。现有无作弊输入控制器的零天赋战役在人族第 1 关、虫族/神族第 4 关阵亡，无法产生合格后期检查点；此项与 `M5-04` 的自然战役平衡工作相连。合成 100/300 敌报告继续单列，不作为自然游玩通过证据；**M6 整体尚未签收**。

本增量实际执行并通过：`npm run typecheck`、`npm test`（452/452）、`npm run docs:data`、`npm run docs:check`、`node tools/check-mvp-plan.mjs --write-board`、`npm run build`、`node tools/qa-m6-loading.mjs`、`node tools/qa-m6-map-failure.mjs`、`node tools/qa-m6-audio-failure.mjs`、`node tools/qa-m3-failure.mjs`、`node tools/qa-m6-offline-matrix.mjs`、`npm run test:browser:save`、`npm run test:offline:save`、`node tools/qa-m6-startup-memory.mjs`、`node tools/qa-m6-natural.mjs --seconds 65 --output reports/local/m6-natural-stage1`、`node tools/qa-m6-natural.mjs --headed --races terran --seconds 65 --output reports/local/m6-headed-terran`、`node tools/probe-m6-meshopt.mjs`。首轮沙箱内 `npm test` 因 Node 子进程 `spawn EPERM` 未运行，随后按工具审批要求重跑通过；这不是测试断言失败。

## 可见 Chrome 首用长帧定位与修复增量（2026-09-25）

在同一台 AMD Ryzen 7 5800U／Radeon、1440×900、DPR1 的可见 Chrome 中，最小 WebGL2 三角形没有实战级百毫秒长帧；人族首关的 WebGL GPU 命令缓冲刷新在跳虫、工蜂、虫卵首次进入画面时约耗 120—150ms，而固定步和主线程渲染没有对应尖峰。隐藏地图不消除长帧，隐藏所有单位模型会消除；隐藏跳虫后其首次出场长帧消失，经济单位出场长帧仍在。诊断中用简单材质绘制单位也消除这些停顿。现有 1×1 离屏预热以及全尺寸离屏逐模型预热均无效；在加载遮罩下逐模型向正式屏幕缓冲绘制后，出场时长帧在该短测中消失。由此推断差异与正式屏幕绘制的 GPU 材质／管线首用有关，尚不把驱动内部机制当作已证明事实。诊断摘要在 `reports/local/m6-frame-trace-terran-headed*/report.json` 及 `reports/local/m6-browser-baseline-headed/report.json`；大型原始 trace 未保留。

现在资源就绪协调器在开放“继续”前，对已准备的单位模型逐个完成正式屏幕缓冲绘制并等待 GPU，进度显示在 GPU 阶段。战斗模拟、数值和存档格式未变。修复后完整地图的三族各 15 秒 trace 未再出现与敌军和经济单位首次出场对应的百毫秒 GPU 刷新。三族正常菜单开局各 60 秒的可见 Chrome 自动采样在 `reports/local/m6-natural-screen-warm/results.json`：P95／P99 帧间隔均为 16.8ms，超过20ms的帧人／虫／神分别为 3/3512、2/3597、2/3597，均没有累积模拟欠账。自动脚本不操控部队，人族首关阵亡，这些数据只验证已到达的自然首关，不算完整通关、前六关或后期验收。

本增量通过 `npm run typecheck`、`npm test`（452/452）、`npm run docs:data`、`npm run docs:check`、`node tools/check-mvp-plan.mjs`、`npm run build`、`npm run test:browser:m6:loading`、`npm run test:browser:m6:first-use`、`npm run test:browser:save`、`npm run test:offline:save` 与 `node tools/qa-m6-offline-matrix.mjs`（人／虫／神断网开局和存读3/3）。`npm test` 与 `docs:data` 在默认沙箱首次分别因子进程／D盘写入权限失败，随后在获准环境重跑通过；不是测试断言失败。新单 HTML 为 **348,917,417 字节（332.75 MiB）**，SHA-256 `6796B0A1BCBEF74D9F9922E41468622B52B253F1D9D6FBD13EBA6BCFE08C081D`。`M6-03` 的三族第1—6关三种子、`M6-04` 的合法后期／无尽检查点和目标设备人工验证仍未完成，M6 尚未签收。

## 第4关读档首用卡顿修复与验证（2026-09-25）

用公开输入产生的三族第4关零天赋普通难度存档复现：读档就绪后，旧 `prepareSnapshotAssets` 只准备已存活单位、当前舱和卡牌，漏掉本关尚未出场的敌军及已付款未来兵种。可见 Chrome 的 CPU profile 将长任务指向 `WebGLProgram.onFirstUse`／`finishProgramWarmup`；初次离线12秒样本出现约1.0／1.43／1.88秒最大帧间隔，固定步和常规渲染耗时不解释这些长任务。修复让读档资源清单覆盖本关固定波次、已启用产出和未结算订单，仍在原加载遮罩下完成模型与GPU就绪；没有改变模拟、数值或档案格式。新增 `test/m6-snapshot-assets.test.ts` 防止遗漏再次出现。

同一第4关存档在修复后的可见 Chrome 开发版三族各12秒：P99为16.8／17.2／16.8ms，最大帧间隔33.3／33.4／33.4ms，新增模拟欠账约0.017／0.017／0秒。更新后的**离线单HTML**三族各12秒：P95均约16.8ms、P99为16.9／16.8／16.8ms，超过20ms分别3/724、2/728、1/732帧，模拟欠账没有累计；最大间隔仍为83.1／33.4／66.6ms，需要在完整关卡中继续定位偶发呈现尖峰。见 `reports/local/m6-natural-checkpoints-dev/results.json`、`reports/local/m6-natural-checkpoints/results.json`；这是读档后局部实战诊断，**不是第1—6关完整时长或三种子验收**。早期脚本两次把恢复状态/隐藏暂停按钮处理错，已修正后重跑，错误样本不计入结果。

本增量实际通过：`npm run typecheck`、`npm test`（454/454，含缺失待出敌军阻断读档回归）、`npm run docs:data`、`npm run docs:check`、`node tools/check-mvp-plan.mjs`、`npm run build`、`npm run test:browser:save`、`npm run test:offline:save`、`node tools/qa-m6-offline-matrix.mjs`（3/3）、`npm run test:browser:m6:loading`及 `git diff --check`。新单文件 `dist/SC2-Survivors-Demo.html` 为 **348,917,777字节（332.75 MiB）**，SHA-256 `AC8215286C0ED4F78D1CEA6CF8A35F2D5FF232497B69751E078EF7D32CBD6E1F`，751项资源齐全。M5-04、M6-03/04/05的完整自然关卡与后期／无尽性能门槛继续开放。
