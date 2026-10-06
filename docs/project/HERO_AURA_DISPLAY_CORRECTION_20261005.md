# 英雄光环显示纠正 · 2026-10-05

用户明确纠正：“我要求的是光环的文字效果不显示”。此前将其理解为隐藏脚底光环画面是本轮实施误解。本次恢复十二位已改版人族、虫族英雄的脚底光环，隐藏光环名称和增减益文字，实际增减益继续生效。该直接纠正取代旧合同、验证记录中隐藏脚底画面的表述；旧版 HTML 与旧证据保留。

## 实际改动

- 人族恢复确认版独立光环绘制。原纹理、双层地面徽纹、颜色、半径和着色器分支保持，原普攻、技能及持枪动作保留。
- 虫族六人使用已有 `fx.hero-skill.kenney-twirl_01` 纹理，增加独立的双色流动脉纹、细边和孢子纹；随英雄移动，在实际地形高度贴地，空中利维坦投影在地面。视觉小光环尺寸与实际增减益范围分开。
- 两族绘制入口按身份分别筛选当前存活、可见英雄，使用有界实例池，每人两层；离开视野或死亡不留脚底徽纹。动画读取正式 World 时间，暂停时停在当前帧。没有新增文字对象或新素材下载。
- 正式单位详情移除原来专门追加的光环段落；两个新演示移除光环名称、参数叠层。技能、被动等原按需详情保留；屏幕原血条、冷却与战斗反馈保留。
- 实际光环、身体数值、普攻/技能结算、飞行、感染、独立生命储备、复活资格/收据及支付规则均不变。run schema18 / profile v5 保持。游戏和新演示共用正式仿真、模型及渲染模块。

改动入口：`src/render/effects/confirmed-hero/hero-aura-effects.ts`、`confirmed-hero/controller.ts`、`zerg-hero-effects.ts`、`src/render/scene/battle-renderer.ts`、`src/ui/hud/squad-console.ts`，以及两个演示的文字模板。交付校验工具比对上一轮交付记录中的十个 data/simulation 文件指纹，确认本次未改这些战斗模块。

## 已执行验证

证据目录：`reports/local/hero-aura-correction-20261005/`。

- `npm run typecheck`、`npm test`：875/875 通过，0 失败/跳过。包含真实增减益、冻结确认版效果、数值/飞行/保存/复活规则回归；最终日志 `tests.log`，18,293.3618ms。
- `npm run docs:check`：游戏数据参考与实际运行数据一致；记录 `docs-check.log`。`git diff --check` 记录在 `diff-check.log`。
- `node tools/qa-zerg-hero-integrated-demo.mjs`：18 普攻（六人 I/III/V）、6 主动、2 双体复活、2 真 Boss、2 控制、12 尺寸×质量状态通过。每个存活可见英雄实际绘制一个双层脚底光环，文字对象为 0；页面错误 0，远程请求 0。最终 `zerg-demo/browser.json`。
- `node tools/qa-hero-integrated-demo.mjs`：18 普攻、6 主动、2 真 Boss、4 控制/布局状态通过。原雷诺灼烧与黄色副弹、诺娃沿线 DOT、导弹/弹射/烟花、第一版斯旺技能、1 秒雷诺射线、1.6 倍泰凯斯手雷及 5 倍大和引导线的检查保留。页面错误 0，远程请求 0；最终 `terran-demo/browser.json`。
- `node --import tsx tools/qa-zerg-hero-production-integration.mts`：正式 Web 文件导入两组三英雄诊断档；凯瑞甘/扎加拉/德哈卡、斯托科夫/妮雅德拉/利维坦均显示三个光环，光环文字不显示。实际在途包、主动、感染、死亡双体复活、保存/导出/重载/本地续局通过，原身份、收据和机制保留；schema18、页面错误 0、生产可修改 debug API 不存在。记录 `production-heroes/report.json` 及正式界面截图。这是隔离测试档的工程验证，不是自然招募或通关记录。
- `node --import tsx tools/qa-hero-production-integration.mts`：雷诺/泰凯斯/诺娃与斯旺/托什/大和两组正式页面均显示三个光环、详情没有光环文字；重载续局后仍绘制三个光环。原持枪动作保留，两组实际在途包分别 4 / 3，实际到达伤害分别 12369.024 / 6969.6；保存、导出、重载、本地续局通过，schema18，页面错误 0。新证据独立保存于 `production-terran/report.json`，原人族验收记录未覆盖。
- `QA_RUN_SCHEMA=18 QA_OUT=reports/local/hero-aura-correction-20261005/production-save node --import tsx tools/qa-next-p1-artifacts.mjs`：正式 Web 与完整离线 HTML 的界面新局、暂停、保存/导出、重载、本地续局通过。资金、实体、运行身份、时间及运行字段保留；折叠偏好保留。保存时刻分别为 .6333333333s / .4s，页面错误 0。390px / pageScale1.25 缩放检查是浏览器检查，不是实体手机证据。

浏览器为 Chrome154.0.8037.95。实际检查了凯瑞甘、扎加拉、妮雅德拉、利维坦、雷诺、正式两组三虫族及斯旺/托什/大和组的截图：脚底有分层光环，原身体/攻击特效保留，没有光环文字遮挡。

### 保留的失败记录

虫族演示首次检查在切换英雄后的第一个渲染帧之前读取光环数量，拿到重置中的 0，因此第十二项停止。随后的真实页面报告已是一个光环、两层，页面和着色器错误为 0。失败 JSON 保存在 `zerg-demo/browser-first-frame-failure.json`，日志 `browser-zerg.log`，截图 `zerg-demo/qa-failure.png`。采样工具增加等待首个实际光环帧后再开始检查，未改游戏或已构建 HTML；最终整轮通过，记录 `browser-zerg-final.log`。没有把首次失败隐藏或当作通过。

## 新本地产物

`npm run build`、`npm run build:web` 及两个独立演示构建实际完成。素材准备 896/896，必需缺失 0；沿用572项正式可达资源，无新增资源包。Web554文件、601,303,541实际资源bytes；原资源 release 为 `990d1b8d4b1bc631e885d84a08c168a4a44f05bd27cb4fb193178dd1e775415f`。本次仅应用构建指纹变化，appBuildId 为 `1a552318db872ddcf0d68091bb5de629342c1b63975705679f88e8548a538b3a`。

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `dist/Six-Zerg-Heroes-With-Auras-20261005.html` | 63,360,299 | `c61c767fb7d51c562c3fcd44fe3ad01c3ea426ae50a321efb131f7ad7bb4e407` |
| `dist/Six-Terran-Heroes-With-Auras-20261005.html` | 54,573,622 | `b32fc5091597c3b6dc78721dc50e767bafcf34719c275931a5fb83c59e3b4091` |
| `dist/SC2-Survivors-Hero-Auras-20261005.html` | 417,803,409 | `1a87e08539dfce1e51d9f8d2e615cb4f9de91169072944c91ea09c34c229bc79` |

完整离线副本与当前 `dist/SC2-Survivors-Demo.html` 一致。三个原确认人族 HTML 和上轮两个虫族 HTML 不覆盖；最终逐文件字节/哈希、当前源码指纹、浏览器对应文件指纹和综合检查记录于 `artifacts.json` / `delivery.json`，入口 `node tools/qa-hero-aura-display-delivery.mjs`。

最终综合检查实际通过：五个旧 HTML 逐字节指纹保持，十个上一轮 data/simulation 模块 SHA-256 保持，两族演示报告与最终文件 SHA-256 一致，四组正式英雄和两种正式存档记录通过，Web资源 release 不变。日志 `delivery-check.log`。

本次不改六神族英雄、精英重做或静态 R7 运行发布，不读取 P0 提案 JSON 作为运行数据。完整 P3/M6/M7、人工画面/听觉、实体设备和缺少的原始死亡片段验收仍 OPEN；没有清理、Google 上传、push 或云部署。
