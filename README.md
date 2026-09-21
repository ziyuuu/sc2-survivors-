# SC2 SURVIVORS · 星际幸存小队

《星际争霸 II》同人、非盈利的 Three.js 小队生存玩法验证。当前开发在 `D:\星际`、`v3/playable-sc2-demo`，保留 V2 素材实验页与既有实体模拟，没有覆盖 main。

本轮已将**简单／普通两档、48 分钟关卡、付费自动生产、落仓救援、工兵经济和付费三选一**接入同一个游戏运行时。普通难度按合理经济／培养下的理论可行性设计，脚本通关率只作辅助回归，不作为普通难度标准。实际操作手感与真机性能仍需继续校准；原 SCV 亮相语音和部分原声音仍缺失。详见 [验收记录](docs/QA.md)、[实际平衡报告](docs/BALANCE_12_STAGES.md)。

## 运行与构建

需要 Node.js 22+，本机使用 24.14.0。

```sh
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。首次启动会下载已记录的公开原模型、贴图和图标，校验文件并在本地转换；这一步需要网络。以后开发运行使用本地资源。

```sh
npm test
npm run typecheck
npm run build
```

单文件输出：**`D:\星际\dist\SC2-Survivors-Demo.html`**。双击即可离线运行，无需 Node 或服务器，CSS、JS、模型、纹理、图标、现有音频和配置全部内嵌。当前约 **70.65 MiB**，精确字节数与 SHA-256 见 `reports/STATUS.json`。开发版和 HTML 共享 World，朋友版不含 F1 修改状态接口。

WASD／方向键移动，Space 推进，E 使用已研究的兴奋剂，Escape 暂停。手机左侧摇杆与右侧技能支持同时操作。没有局内手动商店／建造／生产按钮。生产状态只读显示。

F1 仅在开发版提供资源、跳关、救援、指定敌人、速度、FPS、实体数、draw calls、战线长度、空间格子和碰撞体积。`npm run lab` 保留 V2 历史素材实验页，不是新版游戏。

## 当前规则

- 一名 Rank 1 Marine、一座已完成兵营、50 矿／0 气开局。四种人族对抗四种虫族战斗兵种；每种人族最多 5 人，每人 Rank 1–5。
- 每个单位有独立 HP、护甲、射程、攻击周期、朝向与速度。枪兵短停开火后可移动；恶火有限转向和直线穿透；坦克按锚点意图决定架起／收起；医疗艇连续治疗合法生物单位。
- 固定 60 Hz、真实队列拖尾、局部避让、实体碰撞、路径和有限追赶，不瞬移或整队同步平移。爆虫真实 AOE，破坏者胆汁可躲。
- 建筑自动扣费生产；Factory 优先当前负担得起的 Tank，否则 Hellion。订单、未解决仓和额外增援占培养容量。每个完成订单产生一个仓，不能直接加兵。
- 降落仓没有超时；落地守军攻击它，清完威胁开舱，毁仓则士兵死亡且不退款。跨关保留 HP、敌人和未解决的仓。
- SCV 虫卵独立 30 秒期限，击破后一次性获得本局采集加成，SCV 亮相后离场；Drone 是高资源经济目标。我方优先攻击战斗威胁。
- 1–3 关每关 120 秒，4–9 关 240 秒，10–12 关 360 秒，共 48 分钟。地图逐关开放；第 12 关必须毁巢并活到结算。
- 三选一全部收费，固定本次折扣，可跳过。刷新 50／75／100…矿。不按钱包过滤、不保证建筑、不根据伤亡削敌、不免费回满 HP。

正式设计见 [DESIGN.md](docs/DESIGN.md)。关卡与经济初值在 `src/data/stages.ts`、`src/data/economy.ts`，不散落到界面或 Three.js 中。

## 数据和素材

基础数据固定 **LotV 5.0.15**，来源为 [SC2Data 导出快照 fbbd6429](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)，Normal 秒转换为 Faster：时长除 1.4，移速／回复率乘 1.4；不声称验证过当前安装客户端。Survivors 改动单独记录在 [DATA_SOURCES.md](docs/DATA_SOURCES.md)。

已导入 8 个原战斗模型及动作、8 个死亡模型、坦克两种形态、原降落仓、SCV、Drone、虫卵、Char 岩石与兵营遗迹；23 个原图标、28 张原效果贴图、5 张真实地表纹理。渲染包含原法线、高光、发光贴图，桌面默认原生 DPR。小尺寸虫族采用本地原网格 LOD，保留原骨骼和材质。

原素材不意味着复刻了 SC2 客户端画质。枪兵原上身动作与移动混合、开舱门骨骼、粒子时序、接触阴影和 PBR 都有网页适配。没有独立开舱动画；不把死亡当开门。原字体不存在时用系统回退，禁止下载未知字体。

素材说明：[ANIMATION_EFFECTS.md](docs/ANIMATION_EFFECTS.md)。缺失声音、枪口粒子层的准确路径：[ASSET_DOWNLOAD_REQUIRED.md](docs/ASSET_DOWNLOAD_REQUIRED.md)。下载失败绝不写入伪 GLB；生成资源、原包和 HTML 均在 Git 忽略目录，仅用于约定的朋友试玩。

## 验证

```sh
npm run test:browser
node --import tsx tools/budget-envelope.mts
node --import tsx tools/campaign-study.mts
node --import tsx tools/duel-study.mts
```

浏览器脚本使用本地 Chrome，可通过 `SC2_CHROME` 指定路径。桌面真实键盘首关、诊断边界场景、390×844／844×390 触摸与压力、断网 `file://` 分开记录。截图仅保存在本机。手机尺寸模拟不是手机真机；headless 加载或测试通过也不是人工视觉验收。
