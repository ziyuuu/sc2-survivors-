# SC2 SURVIVORS · 星际幸存小队

《星际争霸 II》同人、非盈利、仅用于玩法验证和朋友试玩的 Three.js 小队生存游戏。当前 V3 在 V2 的素材目录、GLB 校验器、规则模块与 65 项测试上继续开发，保留原素材验收页。没有覆盖 main 或丢弃 V2。

核心体验是**队伍因移速、停火、转向、避障和架炮而自然拉长**。玩家控制 Squad Anchor，每个士兵独立移动、交火和死亡。站位调整与面向敌人是保留的玩法；静止或固定路线的存活时间是观察数据，不是降低难度的验收标准。

## 开发版

需要 Node.js 22+（本轮使用 24.14.0）。

```sh
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。第一次启动会从已记录的公开素材目录下载文件到本地忽略目录，校验 GLB magic、版本、长度和内部资源，再生成独立 glTF、bin、贴图、图标及音效。下载过程需要网络；取得素材后开发服务不依赖远程 CDN。

WASD / 方向键移动；Space 推进锚点；E 使用已研究的 Stimpack；B 打开付费生产面板；Escape 暂停。手机使用左下摇杆和右下技能，横屏优先。F1 开发面板提供跳关、资源、救援、指定虫族、时间倍率、FPS、实体数、draw calls、战线长度和空间格显示。

```sh
npm test
npm run typecheck
npm run assets:download
npm run assets:animate
npm run build
```

`npm run lab` 保留 V2 验收页，地址 `http://127.0.0.1:4173/preview/`。该历史页面不是 V3 游戏，也不是离线 Demo。

## 单 HTML 试玩版

构建生成 **`dist/SC2-Survivors-Demo.html`**。朋友只需下载这个文件并双击打开；不需要 Node、本地服务器或联网。JavaScript、CSS、模型、贴图、图标、音效与规则数据均内嵌。它和开发版使用同一个 `src/main.ts` 与 Simulation，只在生产构建中移除 F1 / 修改状态的调试 API。

当前文件约 **33.80 MiB**；包含原始动作与独立死亡模型，精确大小和验证记录见 [验收记录](docs/QA.md)。常规 Vite 网站构建也在 `dist/`。单文件包含本地取得的游戏素材，仅用于这里约定的非商业朋友试玩；生成物和资源二进制不提交到公开 Git 仓库。

## 已实现规则

- Marine、Hellion、Siege Tank、Medivac 对抗 Zergling、Roach、Baneling、Ravager；每兵种最多 5 名，每名 Rank 1–5，死亡后身份不复活。
- 独立 HP、护甲、射程、攻击周期、目标、朝向和速度；Marine 停下开火再跟随，Hellion 有限转向与直线穿透，坦克自动架起/收起和溅射，Medivac 连续治疗合法生物单位并消耗能量。Baneling 真实 AOE，Ravager 落点预警与延迟伤害。
- 固定 60 Hz 模拟，速度不同的编队槽、历史路径、空间哈希与局部避让；soft/hard leash 和有限追赶，不瞬移重排。
- Minerals / Gas 用于建筑、排队生产、科技和刷新。每份付费订单产生一个救援仓，落地立即开始 30 秒；20–40 Zergling 加 Roach 及后期 Baneling / Ravager 主动围攻。清理威胁并保住仓体才会出兵，失败不退款。
- 12 × 60 秒；关间暂停，三张不同且可负担的候选，只能选一个；刷新依次支付 50 / 75 / 100… Minerals。第 12 关限时摧毁虫巢。
- Terran 风格 DOM HUD、生产面板、可滚动三选一、独立指针捕获和多点触控。

## 数据与素材

单位基础数据固定为 **LotV 5.0.15**，取自 [SC2Data 导出快照 fbbd6429](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)，没有混用不同版本的多人层。它是社区托管的游戏 XML 导出，不是本机当前客户端实测。Normal 数据秒转换为 Faster 时间：持续时间 / 1.4，移动、治疗与恢复速率 × 1.4。来源字段、继承顺序和适配项见 [DATA_SOURCES.md](docs/DATA_SOURCES.md)。

`src/data/sc2-units.ts` 是单位数据唯一入口；`src/data/game.ts` 单独记录试验性的波次、队伍、军衔、地图和救援数值。架构见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

实际取得并在浏览器解析了 **8/8 战斗 GLB、23/23 图标**，另外有原 Hatchery 用作虫巢目标。素材索引来自 [Asset Explorer](https://github.com/sc2-arcade-watcher/asset-explorer)。本轮下载成功，V2 中的 403 是历史记录。

**已从公开原始 M3 包补齐 8/8 单位骨骼动画、8/8 独立死亡模型、坦克行进/架炮/变形模型与 24 张战斗特效贴图。** 目录的旧 GLB 是静态预览；`npm run assets:animate` 在本机 Node 转成自包含动画 GLB，并由开发版和单文件共享。首次开发启动会自动尝试准备。动作映射优先原始 Walk、Attack、Stand、Death、Birth；Medivac 用 Stand Work 治疗，坦克用 Morph Start/End。GPU 共享骨骼纹理批量绘制，保留独立移速、朝向与停步攻击。来源、准确文件名与效果边界见 [ANIMATION_EFFECTS.md](docs/ANIMATION_EFFECTS.md)。

受击现在有实际扣血触发的血花/火花和材质闪光；枪口、火焰、酸液、爆炸、移动尘土使用原始特效贴图进行网页适配，并非完整复制 SC2 粒子引擎。Char 地面仍使用两张原地形预览 JPG、自制岩壁和通道；原版 Drop Pod 没有准确索引。三个 WAV 仍是本地合成，9 项原声音已在 manifest 标记 missing 并提供导入接口。缺失项与无需改代码的放置路径见 [ASSET_DOWNLOAD_REQUIRED.md](docs/ASSET_DOWNLOAD_REQUIRED.md)。必需模型或动画缺失会阻止朋友版打包；开发版明确提示并允许继续规则调试。

没有下载或分发字体。`@font-face` 保留本地 SC2 Chinese / Eurostile / Extended 接口，缺失时使用系统字体。StarCraft / StarCraft II 及相关素材、商标属于 Blizzard Entertainment 或相应作者。公开目录可访问不代表已获得再分发许可。

## 验证与限制

`npm test` 当前 121 项通过。`npm run build` 通过，包含 TypeScript 检查、Vite 和离线 IIFE 打包。`node tools/qa-effects.mjs` 专门验证移动、射击、受击、死亡回收、坦克模式、动画暂停和离线资源。浏览器验证区分正常玩法观察、开发诊断场景、手机尺寸模拟和真实手机；详见 [QA.md](docs/QA.md)。

本地开发服务启动后可执行 `npm run test:browser`。脚本默认使用 Windows Chrome；其他安装位置通过 `SC2_CHROME` 指定。`node tools/play-stage.mjs` 记录正常首关，设置 `SC2_PLAY_CONTINUOUS=1` 可观察连续机动策略。两种策略的输赢都不会自动触发平衡改动。

真实手机性能、人工视觉验收与完整 12 关胜利仍须单独验证。截图仅保存本地，没有上传游戏图像；DOM 和帧时间测试不能冒充视觉验收。后续平衡应围绕救援决策、战线拉伸与主动收拢来做。
