# 星际争霸 II：幸存者 · SC2 Survivors

**非官方、非商业玩法验证项目。当前分支是素材接入工程与交互验收页，不是已经完成的原版模型战斗 Demo。**

仓库：`ziyuuu/sc2-survivors-`（末尾有连字符）  
分支：`v2/sc2-assets-ui`  
视觉参考：https://starcraft-shooter-2026.pages.dev/

## 本次内容

- 42 项素材清单：8 个战斗模型、8 个兵种图标、6 个建筑图标、12 个科技/技能图标、3 个地形参考、控制台、标志、两种资源图标和降落仓模型。
- 精确名称匹配、缺失/冲突报告、下载大小限制、文件结构检查、SHA-256 记录；索引匹配不会自动批准为原版素材。
- 真实 GLB 加载与动画检查器、原图标槽位、三选一及付费刷新交互验收页。
- 付费建筑/生产、一任务一降落仓、落地起计时 30 秒、独立血量与治疗、三选一的独立规则模块。
- 65 项局部测试通过：38 项规则、7 项 GLB 校验、20 项资产目录测试。测试数值是合成数据，不是已验证 SC2 参数。

## 运行

需要 Node.js 22 或更高版本。测试与本地服务不要求安装 npm 依赖。

```sh
npm test
npm start
```

打开 `http://127.0.0.1:4173/preview/`。这是素材验收页，不包含 12 关战斗循环；应通过 HTTP 打开，不是直接双击 HTML。

```sh
npm run assets:resolve
npm run assets:fetch -- --kind=icon
npm run assets:fetch -- --kind=model
```

下载仅进入 `.gitignore` 排除的 `assets/private/`；模型检查器通过 CDN 加载固定版本 Three.js。外部来源不可用时会显示错误，不偷偷换成几何占位模型。缺失资源会令下载命令以非零状态结束。

## 已核实的阻塞项

2026-09-20 的 GitHub Actions 审计成功读取素材目录和参考站 HTML/CSS，但八个战斗模型的下载全部返回 HTTP 403；没有取得任何通过检查的原版模型。动作、贴图、Blender 导入和模型身份均未完成验证。

参考站标题为 `StarCraft Shooter 2026`，CSS 声明 `SC2 Chinese`、`SC2 Eurostile`、`SC2 Extended` 三个字体别名。截图只捕获到加载画面，未核实加载后的完整 HUD。别名不证明字体内部身份或授权。

本地 Chromium 访问验收页被运行环境以 `ERR_BLOCKED_BY_ADMINISTRATOR` 阻止；浏览器交互、桌面/手机截图、真机性能均未通过验证。详情见 `reports/STATUS.json`。

## 原版素材边界

社区目录中的同名条目不等于已验证的 Blizzard 原版。地形 JPG 只是选材参考，不是 SC2Map、地表材质全集或可行走地图；控制台缩略图不等于 HUD 切片。标志资源未取得前，文字标题是明确的回退。

仓库当前公开，只存源码、索引与报告；不提交 Blizzard 资源包、字体文件或凭据。字体仅使用本地已安装名称与系统字体回退。StarCraft / StarCraft II 及相关素材和商标属于 Blizzard Entertainment 或相应作者。

旧 V1 Demo 仍在上一轮交付中，本次分支未把旧画面冒充成新版，也没有把旧本地 Git 历史宣称已迁入远程仓库。
