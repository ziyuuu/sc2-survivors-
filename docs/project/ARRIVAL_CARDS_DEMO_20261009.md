# 精英 / 英雄入队卡面演示 · 2026-10-09

用户要求先制作独立 HTML。此阶段仅演示第 4 项入队反馈，不实施其余十二项修复，也未接入正式游戏的 Boss 掉落路径。

- 实机战斗和操作来自已批准的 R10 独立样例；通过构建时单一挂接调用 arrival.ts，不改原样例文件，也不复制 World 或战斗逻辑。
- 实际调用原生 acquireElite / acquireHero 成功后再展示；精英紫光、英雄橙金光，原立绘与名称对应。每张 1500ms，依次展示并自动消失。
- 无领取、确认或关闭按钮；卡面不捕获输入，不暂停战斗。重复精英实际提升至 II 军衔，展示“晋升”。
- 顶部按钮仅用于独立演示场景复播：精英入队、英雄入队、连续入队、晋升、重置。默认自动播放精英杀手与雷诺连续入队。
- 手机竖屏采用右上小卡；横屏采用右上横条，避开地图、摇杆、技能和部队栏。系统减少动态效果时不使用位移与缩放。

## 运行

`node tools/build-arrival-cards-demo.mjs`

`node tools/serve-arrival-cards-demo.mjs`（默认 http://127.0.0.1:4197/，占用则自动分配端口）

`node tools/qa-arrival-cards-demo.mjs`

`node node_modules/typescript/bin/tsc -p preview/arrival-cards-20261009/tsconfig.json`

输出 `dist/Arrival-Cards-Demo-20261009.html`，资源内嵌，可独立离线打开。构建工具复用原样例的资源选取方式，额外包含当前精英模型；原游戏资源文件未改动。

## 验证

桌面 1440×900、手机 390×844、窄屏 320×700、横屏 844×390；9 组检查、10 张截图，无页面或模型错误。检查真实入队、原立绘身份、顺序与自动消失、晋升、键盘移动、手机触控摇杆、原生加速，以及减少动态效果。

1374 个生产保护文件哈希无变化；Git 对生产源、部署和原 R10 样例的差异为空。仅针对独立演示验收；不代表自然掉落、正式满员策略、实体手机或整局性能验收。正式入队流程仍待下一阶段改造。

本地证据：`reports/local/arrival-cards-20261009/`。测试最初两次选择器/减少动态效果断言失败已保留；后续结果按真实构建记录。

## 产物身份

- HTML 字节数：70902877
- HTML SHA256：`ce1745619df47a6012c5bcf177cfcde06ddde84abc24c550df1f106ce776976b`
- 样例构建：`00a28bbd5066d9ffedf1096e74f669ef050287a9a69772b69b20264af8f3c418`

## 旧包与旧演示清理核对

截至制作本演示前，dist 顶层仍有 **17 个 HTML、14 个 ZIP，共 4,203,321,540 字节（约 4.20 GB）**；另有 **222,199,564 字节（约 222 MB）** 的解包目录，未包含当前 web 文件夹。上述包括当前交付、历史样例、旧候选和其他线程产物，不能统称为可删除缓存。

**上一轮未删除这些旧包/旧 HTML**；删除的是测试缓存、重复验证资源副本、部署无用文件及已确认旧 C 盘缓存。此次只清点，不再删除。旧 UI 源、立绘、批准样例和证据保留。另一线程 intermission-ui-kit 及 ZIP 仍排除。当前别名与 Maintenance HTML 内容相同，但仍保留两个入口文件。

| 保留文件 | 字节数 |
|---|---:|
| `dist/Battle-UI-Coze-Application-20261008.zip` | 10835615 |
| `dist/Battle-UI-Coze-Application-Final-20261008.zip` | 10836000 |
| `dist/Battle-UI-Feedback-Sample-20261008.html` | 65312845 |
| `dist/Battle-UI-Feedback-Sample-R1-20261008.html` | 63915037 |
| `dist/Battle-UI-Feedback-Sample-R2-20261008.html` | 63919722 |
| `dist/Battle-UI-Feedback-Sample-R3-20261008.html` | 63919934 |
| `dist/Battle-UI-Feedback-Sample-R4-20261008.html` | 65274952 |
| `dist/Battle-UI-Feedback-Sample-R5-20261008.html` | 65289184 |
| `dist/Battle-UI-Feedback-Sample-R6-20261008.html` | 65309199 |
| `dist/Battle-UI-Feedback-Sample-R7-20261008.html` | 65310062 |
| `dist/Battle-UI-Feedback-Sample-R8-20261008.html` | 65312446 |
| `dist/Battle-UI-Feedback-Sample-R9-20261008.html` | 65312658 |
| `dist/Current-Coze-Resources-From-Live-20261006.zip` | 47778906 |
| `dist/Intermission-UI-Kit-20261008.zip` | 90369551 |
| `dist/Maintenance-Coze-Application-20261008.zip` | 9432431 |
| `dist/Map-Polish-Coze-Application-20261006.zip` | 761516 |
| `dist/Opening-Cover-Coze-Application-20261007.zip` | 10824687 |
| `dist/Opening-Cover-Coze-Candidate-71b3-20261007.zip` | 10824444 |
| `dist/Opening-Cover-Coze-Candidate-f79d-20261007.zip` | 10456407 |
| `dist/Performance-Coze-Application-20261006.zip` | 802459 |
| `dist/SC2-Survivors-Battle-UI-20261008.html` | 477266149 |
| `dist/SC2-Survivors-Battle-UI-Final-20261008.html` | 477266412 |
| `dist/SC2-Survivors-Before-Battle-UI-20261008.html` | 477239567 |
| `dist/SC2-Survivors-Current-20261006.html` | 477263774 |
| `dist/SC2-Survivors-Maintenance-20261008.html` | 477263774 |
| `dist/SC2-Survivors-Opening-Candidate-5331-20261007.html` | 477239089 |
| `dist/SC2-Survivors-UI-Coze-Main-20261007.html` | 475931502 |
| `dist/UI-Coze-Application-20261006.zip` | 799457 |
| `dist/UI-Coze-Main-Application-20261007.zip` | 9469570 |
| `dist/UI-Fidelity-Coze-Application-20261007-Candidate-b211.zip` | 892053 |
| `dist/UI-Fidelity-Coze-Application-20261007.zip` | 892138 |
