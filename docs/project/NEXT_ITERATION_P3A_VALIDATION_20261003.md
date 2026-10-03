# P3-A 六名人族英雄实施验证 · 2026-10-03

本记录对应已批准的[六名人族英雄契约](NEXT_ITERATION_P3A_TERRAN_HEROES_20261003.md)。雷诺、泰凯斯、诺娃、斯旺、托什、大和战列巡洋舰的机体、成长、被动、主动和表现已实施；30人族精英、布雷车大型雷、其他12英雄仍待后续。不得据此标记整个P3完成。

## 工程与存档

- `npm test`：807/807通过，最终日志 `reports/p3a-tests-release.log`，69.185秒。新专用测试包括六英雄30个rank机体/技能组合及9组机制覆盖；旧测试按本轮批准值修订。
- `npm run typecheck`、`npm run docs:check`、`node --import tsx tools/docs/export-next-iteration-p0.mts --check`通过。文档生成检查不是战斗或平衡验收。
- schema16保存被动计数、预热、隐蔽episode/蓄弹、保护期限、施法rank、冻结目标/视野和主副弹身份；profile v5不变。运行代码不导入P0提案JSON。
- 生产Web与离线HTML通过实际UI保存→刷新→继续；暂停、原字段及HUD折叠偏好保留，Web页面缩放1.25检查通过，两者无生产调试API。`reports/p3a-artifacts.log`，JSON及截图位于 `reports/local/next-p3a-artifacts-20261003/`。

## 原模型、输入和画面证据

`node tools/qa-next-p3a.mjs` 在Chrome154.0.8037.95完成，错误0。使用实际WebGL与现有原模型，采集六名英雄I–V共30张表现截图、5张大和无伤引导截图及6段I–V录像。确定性内容场景关闭自然波次，目标使用高HP展示夹具，不能作为自然平衡样本。截图可供人工复核，自动采集不等于人工验收。

全／均衡／低效果档分别检查1440×900、390×844、844×390、667×375，共12组合；横向页面不溢出。三英雄同屏核心效果丢弃/裁切0；关闭震屏仍保留技能核心。键盘Digit1、触控、命令栏、虚拟标准手柄分别通过实际共用指令入口触发托什冻结视野施法。没有实机手机、实体手柄或Safari结果。

证据：`reports/local/next-p3a-heroes-20261003/report.json`、各英雄 `{id}-{1..5}.png`、`three-heroes-{viewport}-{quality}.png`、`video/{id}-I-V.webm`，完整连续录像路径见report。录像为同一浏览器录屏按报告时间导出；效果等级画面保留原模型。

`node tools/qa-p3a-comparison.mjs` 完成大和／诺娃／斯旺各两张前后对照，错误0。对照使用HEAD13045d64的旧表现模块与新表现模块，**共用当前战斗夹具及相机**，只比较表现，不声称旧数值平衡对照。证据 `reports/local/next-p3a-comparison-20261003/`。

## 单独性能样本

性能采样不录屏：三名V阶英雄（大和、诺娃、托什），无锁血，固定60Hz。报告的分位数来自末240帧，不代表物理硬件或全自然关卡。

| 场景 | 实际战斗秒 | 帧间隔p50/p95/p99 ms | 末帧积压秒／累计丢弃积压秒 | 末帧活敌 | 核心丢弃／裁切 |
|---|---:|---|---|---:|---|
| 36敌人脚本战斗 | 11.2667 | 16.7 / 17.1 / 17.3 | .016633 / .033333 | 0 | 0 / 0 |
| 300高HP敌人合成压力 | 11.25 | 16.7 / 16.8 / 17.1 | .016600 / .033333 | 300 | 0 / 0 |

300压力样本实际丢弃12274装饰和25尾迹，雕塑装饰丢弃12244、核心0。证明本样本下效果降级保留核心，不证明所有场景核心永不裁切。自然波次、完整早中晚战役、无尽和既有late transient backlog缺口仍OPEN；36敌人早期杀清后的末段不能证明持续激战性能。

## 构建与增量交付

运行 `node --import tsx tools/m6-release-assets.mjs`、`node tools/build-web.mjs`、`node tools/build-demo.mjs`、`node --import tsx tools/publish-coze-tree.mts`，日志分别在 `reports/p3a-resources.log`、`p3a-build-web.log`、`p3a-build-offline.log`、`p3a-publish.log`。

- Web：`dist/web/index.html`；appBuildId `7c7afaa430b81aac82144a764511d1cafb07ac370c2c28b75a9bde053ecf9239`。
- 离线：`dist/SC2-Survivors-Demo.html`，415106514 bytes（395.88 MiB），SHA256 `1a0cd185783252b5856b68eb0efde3d86a9d5d4db854a231ba7e036a87f64cc0`，仅本地，不加入Git。
- 资源仍538身份／531文件／599199318 bytes，release `ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64`，资源delta空；本轮仅应用增量。`deploy/coze`本地生成完成，不代表Coze云端已部署；无新资源上传、无清理。

交付关闭前逐项重读14个应用文件和531个独立资源，字节数/SHA256全部匹配清单。源代码/文档暂存差异检查通过；生成的Three.js shader字符串保留上游空白，不修改构建指纹。

## 已修复的检查失败与限制

初次浏览器检查缺Playwright录屏FFmpeg；随后检查夹具缺Vite热更新导出、泰凯斯目标距离越界、托什动态导入产生不同WeakMap视野提供者。均修复在检查工具，最终通过实际UI入口。早期规则测试发现雷诺初始自光环ID、泰凯斯残留旧溅射、其他英雄德哈卡回血对象拷贝问题，均修复后完整807测试通过。中途文档派生差异已重新生成并复检一致。

M6、M7、人工视觉/音频、实体手机/手柄、Safari、三个全息科学船原始死亡片段及晚段瞬时积压仍未关闭。未新增云账号、分析服务、部署、素材替代或第二引擎。
