# 第一批材质与单位修复验证 · 2026-10-10

基于 `3b2ad8bf42bad588ee5ebbc620fc80499b3961ed`，已把普通／三个精英不朽者的护障、普通／三个精英狂热者的死亡材质及统一颜色输出接入正式渲染路径。范围见 [实现说明](MATERIAL_BATCH1_20261010.md)。整体性能优化、画质分档及其他模型材质推广仍在后续阶段。

完整机器摘要：[reports/qa/material-batch1-20261010.json](../../reports/qa/material-batch1-20261010.json)。原始报告、构建快照、前后截图和失败证据在 `reports/local/material-batch1-20261010`。

## 实际修复

- 不朽者附属护障层在未激活时关闭，主体原纹理可见；真实受击后按原曲线开始、保持和结束。四个实体错峰触发，批次重排后数值跟随实体；暂停、移动、实际攻击及当前存档重载通过。
- 狂热者死亡读取现有骨骼动作时间，恢复发光、遮罩和 UV 消散。普通模型保留原能量消散柱，精英模型保留原碎片；没有删除死亡效果来掩盖白色实体问题。死亡 0、0.2、0.5、1.5 秒、两种模型寿命及回收前后的画面均保留。
- 每帧使用同一半浮点线性场景和现有 Bloom，最后一次 ACES、曝光 1、sRGB 输出。Three.js 在中间渲染目标上不再额外执行 ACES；OutputPass 的实际程序定义与运行参数已记录。
- 原 M3、DDS、GLB、骨骼、身体尺寸和游戏规则不变；其他模型仍走原材质加载路径。没有加入玩家设置或生产调试接口。
- 自定义采样器已接入原纹理过滤和预加载路径。四模型各材质面共 117 条采样器／档位组合检查通过，沿用原 native 8、balanced 4、performance 1 的上限及硬件限制，没有调整档位参数。

## 前后画面与构建身份

| 内容 | 前版 | 修复后 |
| --- | --- | --- |
| 不朽者待机，四实体 | [原白色覆盖](../../reports/local/material-batch1-20261010/before-core-r1/immortal-idle-near.png) | [护障关闭，主体可见](../../reports/local/material-batch1-20261010/final-core-r2/immortal-idle-near.png) |
| 不朽者护障保持 | [前版](../../reports/local/material-batch1-20261010/before-core-r1/immortal-hold.png) | [原护障纹理与发光](../../reports/local/material-batch1-20261010/final-core-r2/immortal-hold.png) |
| 狂热者死亡 0.5 秒 | [前版](../../reports/local/material-batch1-20261010/before-core-r1/zealot-death-030.png) | [恢复消散与碎片](../../reports/local/material-batch1-20261010/final-core-r2/zealot-death-030.png) |
| 竖屏护障 | [前版](../../reports/local/material-batch1-20261010/before-mobile-r1/portrait-immortal-active.png) | [修复后](../../reports/local/material-batch1-20261010/final-mobile-r2/portrait-immortal-active.png) |
| 冰雪地图近景 | [前版](../../reports/local/material-batch1-20261010/before-maps-r1/ice-immortal-near-active.png) | [修复后](../../reports/local/material-batch1-20261010/final-maps-r2/ice-immortal-near-active.png) |

前版测试通过第一阶段已冻结的主线源文件编译，使用同一个诊断夹具和固定战局身份。`baseline-r4` JavaScript 为 `c4e9c5155f07ec6ca5998e82f245d5e43f3a9ba7f47380f40521e01aeab364ac`。全部最终材质场景与成本记录使用 `candidate-r6`，JavaScript 为 `29f5afa88967eab03f8a38962129e35f79c1718683fc260fdec1b172b6b512fe`，源摘要为 `08798b501398dfd117947d51fc554ce387a7740d6ef64f29aac80edd1a281d42`；其中 172 份正式源文件均逐个与最终源码核对。R1–R5 的原构建标识和实际画面另行保留。

| 最终诊断组 | 截图 | 实际覆盖 |
| --- | ---: | --- |
| `final-core-r2` | 31 | 四实例错峰、保持、耗尽、重排、重载、移动、原生攻击；四狂热者死亡和回收；117 条过滤设置检查 |
| `final-maps-r2` | 21 | industrial / mar-sara / char / ice / frontier，两种目标单位近景及战场视距 |
| `final-mobile-r2` | 17 | 844×390 横屏、390×844 竖屏，远近与生死阶段 |
| `final-heroes-r3` | 28 | 三英雄原生 Death 动作、准确寿命前后及回收 |
| `final-color-r3` | 10 | 三族英雄加入／死亡前后背景像素与输出链 |

共 107 张最终诊断截图，另有前版 79 张对照图。核心、地图、移动端和颜色组的 79 对同输入 World／Profile／玩法 RNG 状态 CRC 均一致，渲染前后状态检查通过，页面／控制台／模型错误 0，待加载资源 0。它们是诊断夹具证据，不是自然战役或真机验收。

## 护障、死亡及颜色的数值核对

护障原开始曲线 0→0.166 秒对应 0→1。0.1 秒采样为约 0.60240966；四实体依次触发时依次出现 `[0.6024,0,0,0]`、`[1,0.6024,0,0]`、`[1,1,0.6024,0]`、`[1,1,1,0.6024]`。三个精英共用一个原实例批次，反转批次顺序后其槽位变为 `[0.6024,1,1]`，重载仍一致。耗尽后 0.1 秒约 0.39759037，0.22 秒为 0，其他护障保持 1。原实例容量 1024，新增状态纹理每材质面 180224 字节，无每实体材质或绘制调用。

源码核对纠正了计划中的共用模型假设：阿塔尼斯、阿拉纳克、沃拉尊分别使用各自 GLB 的原生 Death，未共用狂热者死亡文件。因此只验证它们，没有替换模型：

| 英雄 | 原 Death 时长 | 原尸体寿命 | 已确认回收的采样时刻 |
| --- | ---: | ---: | ---: |
| 阿塔尼斯 | 1.0 秒 | 1.5 秒 | 死亡后 1.9167 秒 |
| 阿拉纳克 | 2.0 秒 | 2.0 秒 | 死亡后 2.4167 秒 |
| 沃拉尊 | 约 1.333 秒 | 1.5 秒 | 死亡后 1.9167 秒 |

三族固定 40×40 背景区域均含实际非零纹理像素。前版在人族／虫族英雄出现时 CRC 从 `96a8668b` 变为 `90038fdb`，死亡后返回；神族出现时变为 `db53aa2e`。修复后三族的英雄出现前、在场及死亡后均为 `90038fdb`。Bloom 参数始终为 0.32 / 0.5 / 0.8，曝光 1，最终程序含 ACES 和 sRGB 输出定义；没有通过修改光照掩盖差异。

## 源文件与规则保护

四份原 M3、29 份引用 DDS 和四份目标 GLB 均核对 SHA-256。源文件完整清单在摘要的 `originalSources`，绑定与实际运行时校验均通过。

| 目标模型 | 原 M3 | 未改写 GLB SHA-256 |
| --- | --- | --- |
| `immortal` | `immortal_ex2.m3` | `71cfca0037dca6cee533a28d64fd85cab2291c682b8287b50e5849171c7dd22f` |
| `elite.immortal.1` | `immortal_purifier_collection.m3` | `e0d18712ef1d961084b93d2e94195b011bf9ee749f427d21ffdfcf356c8db9fd` |
| `zealot.death` | `zealotdeath.m3` | `6c7a7841a1911a39e2d6e5dc205403ba319fe5e98609eb59a622f4957086e04b` |
| `elite.zealot.1.death` | `zealot_purifier_collection_death_00.m3` | `f96e68dc87654ee56bb962356853cafe8851975a00e739fe1f8603954a2ebdf7` |

2532 项基线保护记录中，183 个本地交付文件另行逐项检查；其余 2349 个文件为 2346 个字节一致、3 个授权现有编辑、0 缺失。三个编辑是 `battle-renderer.ts`、`animated-batch.ts` 和交付工具的批次版本开关。新增四个材质源码文件、回归测试、诊断预览及提取／验证／打包工具单列。仓库说明与本批文档不计入这份原源文件保护清单。

693 条资源、675 个文件、668621453 字节全部与前版资源清单一致，资源发布 ID 仍为 `2ceccc4865bd761cecc694f47bf39983660c6774cf13ce1ad8c94b4edd4ebbb5`，资源新增 0。152 个打包后的 backend／vendor／启动器／配置条目与前版逐字节一致。Run 26、Profile 6、地图配方 3 保持；未修改模拟、输入、UI、地图、阴影、LOD、抗锯齿或画质档位。

## 回归及正式交付验证

- 全量 `npm test`：1293 通过，0 失败，0 跳过，包含新增 7 项材质绑定、原曲线、实例隔离、重排、暂停、重载、容量和死亡时钟测试。
- 正式 TypeScript、独立诊断 TypeScript、数据文档及 165 个天赋检查通过；原材质生成器 `--check` 通过。
- 正式 Web：24 项检查、51 张截图；完整离线 HTML：24 项检查、51 张截图。三族真实原生界面、38 席位分页、11/9/9 命令集合、横竖屏触控／摇杆／目标取消、皮肤设置、四入口及精确当前存档恢复通过，页面／模型错误 0。离线测试使用 Chrome `file://` 和断网上下文；不是操作系统双击或物理触屏验收。
- 生产解码器从实际 HTML 逐条恢复全部 693 条资源、669534813 个逻辑字节，全部原始 SHA-256 一致；逻辑字节含不同资源记录的共享内容，不等于唯一文件总大小。
- 实际 0.6.16 包在隔离目录通过可写根、注入只读根恢复、active-release 启动、损坏数据库关闭后台四种用例。更新复用 675 文件、新增 0，保留旧环境和回滚指针，重复更新幂等，损坏应用拒绝激活。测试数据库与配置仅在隔离目录。
- 本地 `deploy/coze` 与应用包的 183 个校验文件及 delivery.json 一致，ZIP 解包逐字节回验通过。4196 本地预览已刷新为最终构建，后台关闭；没有线上 Coze、真实数据库或管理员操作。

## 本批成本记录

前后各一次约 5 秒暂停渲染，分别 300／301 帧；Chrome、AMD 集显、1280×720 画布、DPR 1，页面始终可见且获焦，World／Profile／RNG 不变。原始每帧数据在 `before-cost-r2/results.json` 与 `final-cost-r2/results.json`。

| 指标 | 前版 | 修复后 |
| --- | ---: | ---: |
| CPU 提交均值 / P95 | 2.763 / 3.300 ms | 3.022 / 3.800 ms |
| RAF 间隔均值 / P95 | 16.660 / 17.000 ms | 16.657 / 17.000 ms |
| 每帧绘制调用 | 29 | 43 |
| 每帧三角形 | 94840 | 94854 |

固定后处理增加 14 次绘制，保留这个代价。该记录没有 GPU 计时，也不代表稳定 60 FPS、高密度场景或性能优化成果。没有运行全量性能矩阵；自然性能、真机、人验、低内存、高刷新率及现有 P6-V01、参考客户端、Science Vessel、生产后端、B4 门槛继续开放。

## 交付文件与保留的失败

| 交付 | 大小 / 身份 |
| --- | --- |
| [完整离线 HTML](../../dist/SC2-Survivors-Material-Batch1-Final-20261010.html) | 501292910 字节；SHA-256 `e0e10fe2d2de1b247eda7a3eb5a91a7697d955666f1d924c981d9c984f6cc8fa` |
| Current HTML 别名 | 与上列逐字节一致 |
| [0.6.16 应用 ZIP](../../dist/Material-Batch1-Final-Application-20261010.zip) | 9498038 字节；SHA-256 `53040f23a6c6fa2c3273df369419f55deeaf881221dae28633e8594a6b245ec1` |
| Web build | `4d0402758734b05e65c4ba03027a4932a9cd1eeea9aaa07df4fb47f58f43655a` |
| Package build | `402a4b4a0a41ba827ce4d6e3cc442f4fca5842e1c938ab329b61c043a9a31e80` |

上一版具名 Native-HUD HTML（SHA `2913fa09…`）和 ZIP（SHA `2ccb8628…`）保留并复核完整哈希。

`smoke-r1` 的首次重载夹具同时导入 Profile，原生 Profile 导入会增加修订号，因而触发状态不等；后续改为保留同一 Profile、只恢复当前 Run，正式导出／恢复另外通过。`final-color-r1` 的预设场外坐标超界，后续改为查找合法镜头外位置。首次更新命令错用了不带版本的清单路径，`update-log.txt` 保留 ENOENT；使用冻结发布描述中的实际清单后通过。它们没有被改写或计为通过。

源码复核发现第一份打包候选的自定义采样器未登记到原纹理过滤路径；R6 补齐登记和预加载，并重新执行全量回归、107 张场景检查、正式 Web／离线及实际包验证。首份 HTML（`74367aaf…`）、ZIP（`7ba2f3f2…`）、`candidate-first` 报告与旧成本记录全部保留，不归入最终版本。最终交付文件名包含 `Final`，Current 别名指向最终文件。

提交范围排除其他线程的 `docs/ROADMAP.md`、`dev/`、随机事件方案和三个独立 UI 预览。正常提交、推送 `main` 并核对远端，不强推；最终结果记录于 `reports/local/material-batch1-20261010/git-sync.json`。
