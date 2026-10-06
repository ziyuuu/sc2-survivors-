# SC2 SURVIVORS · 星际幸存小队

基于 Three.js、TypeScript、Vite 的单人小队动作生存游戏。控制方向与技能，小队自动索敌、移动和交战。

2026-10-06 当前版本：30个普通家族、90款显式精英、18名英雄、24张种族趣味卡、五张地图、18关战役和平地无尽。新局随机选择工业遗址、玛萨拉荒漠、查尔焦土、冰封哨站或边境矿场，均为160×160、从中心出发；读档保留原地图。采用 **schema26／永久档案v6**，不兼容或迁移旧存档。现行战斗数值、技能、模型和资源保留；本轮新增原版地表混合、真实缓坡、非对称场景组与积雪／裂纹等环境细节，范围与验证见[五地图补强](docs/project/MAP_VISUAL_POLISH_20261006.md)；前轮见[清理及五地图记录](docs/project/CLEANUP_FIVE_MAPS_20261006.md)，此前规则精简见[规则清理记录](docs/project/CURRENT_LOGIC_CLEANUP_20261006.md)。P6自然性能和强光遮蔽问题仍开放，Coze尚未部署，人工视觉、实体设备和完整M6/M7未因此验收。

正式 UI 已接入主游戏，包含三族卡面、关间浏览与购买、实时单位详情、双行可折叠 HUD 及逐级返回。范围见[UI接入](docs/project/UI_INTEGRATION_20261006.md)，实际验证见[UI验证](docs/project/UI_INTEGRATION_VALIDATION_20261006.md)。

下述P2/P3-A记录是历史阶段快照；当前十八英雄、九十精英及团队光环以[P4-C记录](docs/project/NEXT_ITERATION_P4C_VALIDATION_20261005.md)、[P4收尾](docs/project/NEXT_ITERATION_P4DE_VALIDATION_20261006.md)和[P5记录](docs/project/NEXT_ITERATION_P5_VALIDATION_20261006.md)为准。

本轮P2已接入统一战斗指令、模式取消/落地受阻反馈、方向输入短绕行和商店合法池诊断。存活家族出现对应图标；新增 H恶火、V维京、R雷神、L潜伏者、C女妖、B闪烁、O单位操作、Q战术、X战略，原 T/E/F/G/Space/1–3 保留。手柄 LT/RT 翻页，闪烁/转移/战术/战略支持确认取消。范围及实测见[P2说明](docs/project/NEXT_ITERATION_P2_20261003.md)与[P2验证](docs/project/NEXT_ITERATION_P2_VALIDATION_20261003.md)。

P3-A首批六名人族英雄曾接入机体、I–V成长、被动、主动和原模型技能效果；独立全／均衡／低英雄效果档，震屏默认关闭。该历史阶段为schema16/profile v5、807项测试；其余英雄、精英及大型雷此后已在P3/P4后续批次接入。详见[六英雄说明](docs/project/NEXT_ITERATION_P3A_TERRAN_HEROES_20261003.md)和[当时记录](docs/project/NEXT_ITERATION_P3A_VALIDATION_20261003.md)。

蜘蛛雷前置修正：人族趣味卡雷现在会钻出并沿合法地面路径追踪，数量/伤害不变，保存schema15。P3华丽特效范围仅18英雄，三个种族分阶段。见[蜘蛛雷说明与验证](docs/project/TRACKING_MINES_20261003.md)和[P3修订计划](docs/project/NEXT_ITERATION_P3_RACE_EFFECTS_20261003.md)。

## Coze / Web 部署

当前应用使用[当前增量交接](docs/project/CURRENT_COZE_HANDOFF_20261006.md)与 `dist/Map-Polish-Coze-Application-20261006.zip`。相对P6新增17个原版场景模型、2234026字节；相对已记录的Coze旧版，资源差额为43个文件、4387567字节，保存在 `dist/Current-Coze-Resources-From-Live-20261006.zip`。必须验证全部574个目标文件和锁定生产依赖后再切应用，保留原项目、域名、环境和资源。后台默认关闭，启用要求真实生产数据库与部署方配置，见[P5交接](docs/project/P5_BACKEND_HANDOFF_20261006.md)。

Git 当前交付为 schema26 源码和同一份五地图应用：`deploy/coze` 含锁定依赖和完整后台程序，`deploy/runtime` 保存校验过的 LFS 运行资源。先前 schema23 基线见[历史基线说明](docs/project/GIT_BASELINE_20261006.md)。Coze 仍保持原部署；数据库、凭据、缓存和本机 QA 输出不提交。

## 开始试玩

- 当前单文件：`D:\星际\dist\SC2-Survivors-Current-20261006.html`，双击离线运行。按用户要求已清理旧包、缓存和旧测试材料，UI源稿及预览保留。
- 主菜单“新游戏／读档／天赋”；新局选择种族、难度和天赋，读档保持原配置并先暂停。
- 暂停、设置或关间可保存／导出；返回标题保留续局。部署新一局会替换当前续局，仍保留轮换备份。
- 本地档案受浏览器和页面来源限制。移动 HTML、换浏览器或换电脑前，请导出完整存档；在目标环境标题界面导入。
- 本游戏非官方、非盈利；原始 SC2 资源属于 Blizzard Entertainment。美术只在本机处理，截图和运行缓存留本地。仓库保留历史离线HTML的LFS记录；新离线HTML本轮仅留本地，既有独立运行资源按LFS增量交付。来源核验与分发许可分别记录。

## 开发与验证

需要 Node.js 22+（当前本机24.14.0）；原素材管线另外使用 PowerShell 7.4+、Python、Git。首次资源准备需要联网读取已锁定的公开来源，后续使用本地资源。所有美术处理在本机进行。

```sh
git lfs pull
npm ci --ignore-scripts
npm run assets:restore
npm run dev
```

开发地址为 `http://127.0.0.1:5173/`。素材缺失时按 [原素材准备](docs/ASSET_DOWNLOAD_REQUIRED.md) 和 [地图管线](docs/MAP_PIPELINE.md) 操作，不用几何体代替缺失单位。

全新检出可直接从 `deploy/runtime/source-assets.json` 恢复当前运行所需的文件；完整构建通过 `build-assets.json` 校验已锁定的资源，不再重建已清理的原始转换缓存。`npm run build:ui-preview` 可重建独立 R10 → R11 → R12 UI 预览；它尚未接入正式游戏。重新转换原始素材仍使用原素材管线。

```sh
npm test
npm run typecheck
npm run docs:check
npm run build
```

`npm run build`生成当前完整离线HTML；`npm run build:web`生成分文件Web发行。文件大小、SHA-256和实际测试以[当前验证](docs/project/MAP_VISUAL_POLISH_20261006.md)为准，历史[STATUS.json](reports/STATUS.json)仅保留过去记录。离线包无损还原全部内嵌原资源，不依赖在线解码器，不含修改状态的开发 API。

```sh
npm run test:save
npm run test:browser:save
npm run test:offline:save
npm run docs:data
```

当前浏览器脚本自行启动本地生产服务，需要先构建 `dist/web`；离线检查需要最新当前HTML。本机脚本使用安装的 Chrome，截图只写入 `reports/local/`。历史诊断入口及适用范围见[历史QA说明](tools/HISTORICAL_QA.md)。`npm run lab` 是保留的历史素材实验页。

## 操作

| 输入 | 行为 |
| --- | --- |
| 电脑鼠标模式 | 左／右键前往点击位置；点到敌人也只记录当时位置 |
| 电脑键盘模式 | WASD／方向键移动 |
| 手机 | 设置中选虚拟摇杆或轻点前往；当前轮无手机真机验收 |
| Space／E／T | 推进／兴奋剂／全队手动架炮、收炮 |
| 1／2／3 | 本局招募顺序对应的英雄技能 |
| G | 主动侦测 |
| F | 天赋解锁后的空运 |
| 手柄 | 左杆移动，右杆选六方向技能，A／X施放，B清除，Menu暂停 |
| Escape | 暂停或返回设置 |

操作偏好、画质和手柄校准单独保留。暂停／关间／模型解码期间冻结模拟。自动索敌不生成追击指令，也不移动小队锚点。

## 当前内容

- 三族分别从枪兵、双生跳虫或狂热者开局；四档难度。
- 最多五个家族，普通每家族五名额，天赋可到七；跳虫每名额两只、单只损失15秒后幸存者裂变。最多三个英雄身份；工人及召唤物独立计数。
- 每家族三种精英，同局锁定一种。小紫/橙徽章、细轮廓和血盾条；技能集中在底部指令栏。
- 18关共30分钟基础战斗；每三关Boss死亡掉一件高品质奖励，80%紫、20%橙。最终须生存到时限并摧毁主巢、击败雷兽Boss。
- 关间记忆发展方向，一次建造/升级/科技选择后进入三件付费随机商品；共享递增刷新价，天赋免单与免费刷新另行结算。
- 每条产线最多两种持续产出，已付款批次不受后续开关影响；实际安全接收新家族时处理五槽换兵。
- 虫后可自动给落地普通增援注卵，最多两名额、每舱一次、45秒独立冷却；不占输血能量。
- 战役胜利后选择撤离或整备进入独立`endless-flat-v1`；原版SC地堡和维修设施，240秒一轮，每四轮一次发展，之后购物。
- 三族共165个天赋节点定义，每族四线独立80级、分层资源价格、免费全额洗点，开局冻结本局方案。
- 当前战局与永久档案原子保存，两份备份；暂停、关间和加载不推进，读档不回血或补跑离线时间。仅接受schema26／永久档案v6，旧开发版本直接拒绝。

## 文档入口

完整导航见 [docs/README.md](docs/README.md)。

| 文档 | 内容 |
| --- | --- |
| [当前设计基准](docs/DESIGN.md) | 本局循环、编制、战斗、生产、奖励、难度、无尽与明确范围 |
| [运行数据参考](docs/GAME_DATA_REFERENCE.md) | 从源码生成的兵种、关卡、四难度、英雄、精英和165节点天赋表 |
| [架构与开发边界](docs/ARCHITECTURE.md) | 模块职责、固定模拟、渲染、持久化、资源与验证流程 |
| [存档机制](docs/SAVE_SYSTEM.md) | 保存内容、时机、恢复、兼容、备份、导入导出与故障处理 |
| [后续工作](docs/ROADMAP.md) | 已确认限制、候选兵种、容量取舍与尚未验收项 |
| [数据来源](docs/DATA_SOURCES.md) | 5.0.15数值导出快照与5.0.16.97563素材来源分开记录 |
| [动画与特效](docs/ANIMATION_EFFECTS.md) | 原动作与挂点、网页表现适配及验证边界 |
| [实际验收](docs/QA.md) | 分版本记录测试、浏览器、离线、性能、人工验证范围 |

原素材正确、转换正确、播放正确、人工观感认可和分发许可分别记录。测试通过不等于人工平衡或视觉验收。
