# 从 GitHub 导入 Coze 并部署网页版游戏

目标仓库：[ziyuuu/sc2-survivors-](https://github.com/ziyuuu/sc2-survivors-) 的 `main` 分支。目标产物是 `dist/SC2-Survivors-Demo.html`，它是包含 3D 模型的**浏览器版**单文件游戏。这里部署的是 Coze 网页应用，不是微信小游戏包；微信小游戏的构建和微信平台发布仍需另行完成。

## 导入前的两个检查

1. 在 GitHub 打开仓库，确认 `main` 包含 `tools/coze-web-server.mjs`、本说明和 `dist/SC2-Survivors-Demo.html`。后者由 Git LFS 管理；GitHub 网页上看到约 130 字节的指针文字并不代表拿到了游戏。
2. Coze 官方文档目前写明，GitHub 导入**不支持超过 500 MB 的仓库**。本仓库的 LFS 素材总量约 710 MiB，但 Coze 对此限制如何计算、导入时是否下载 LFS 对象，官方页面没有说明。因此 Git 导入和在线部署必须以 Coze 实际结果为准，不保证一次成功。若 Coze 拒绝超过限额，不能靠跳过 LFS 对象继续部署本游戏。

## 在 Coze 导入

1. 打开 [扣子编程](https://code.coze.cn/)并登录。在工作空间的“集成管理 → Git 服务”中授权 GitHub 账号；个人版可使用默认工作空间。
2. 在左侧选择“导入 → GitHub 导入”，选择 `ziyuuu/sc2-survivors-`。确认导入的是 `main` 的最新提交，等待项目初始化，不要让 AI 改写游戏或自动重建素材。
3. 也可在 Coze 对话中输入：

   > 使用 Coze CLI 授权我的 GitHub 账号，导入 `ziyuuu/sc2-survivors-` 的 `main`。先报告项目链接、检出的提交 SHA、Git LFS 是否取回了 `dist/SC2-Survivors-Demo.html`，不要修改代码或直接部署。

4. 在 Coze 项目终端验证：

   ```sh
   git rev-parse HEAD
   git lfs pull -I "dist/SC2-Survivors-Demo.html" -X ""
   wc -c dist/SC2-Survivors-Demo.html
   head -c 32 dist/SC2-Survivors-Demo.html
   ```

   游戏文件应大于 **300 MiB**，开头是 HTML。若显示 `version https://git-lfs.github.com/spec/v1`，那只是 LFS 指针。上面的命令只取回网页发行包，避免把运行时不需要的原素材也下载到 Coze；还须检查 Coze 是否允许下载及部署该文件，不能把指针当作页面。

## 配置预览与部署

本仓库源码构建依赖尚未全部托管的本地原版素材。Coze 上**不要执行**根目录的 `npm run build` 或 `npm run build:web` 来重建游戏，也不要将 `public/assets` 缺失理解为代码错误。直接运行已提交的单文件游戏，启动命令：

```sh
node tools/coze-web-server.mjs
```

该服务使用 Coze 提供的 `PORT` 环境变量（未设置时为 3000），`/` 与 `/index.html` 返回游戏，`/health` 返回 `ok`。启动时会检查游戏文件大小，LFS 未取回时会直接报错，避免发布空白页面。无需额外 npm 依赖。

可把下面整段交给 Coze 编程 AI：

> 请把当前 GitHub 仓库作为网页应用部署。不要改动游戏逻辑、资源或重新构建。先确认 `dist/SC2-Survivors-Demo.html` 是大于 300 MiB 的真实 HTML，而非 Git LFS 指针；如未取回，只执行 `git lfs pull -I "dist/SC2-Survivors-Demo.html" -X ""`。用 `node tools/coze-web-server.mjs` 作为启动命令，使用平台分配的 `PORT`。先预览 `/health` 和 `/`，确认页面能加载、三族标题菜单能打开且浏览器控制台没有资源错误。若 Coze 不支持此大文件或无法设置启动命令，请给出原始错误和日志，不要以占位页替代。预览通过后再部署，并给我正式网址与部署日志。

在项目预览确认可玩后，由项目所有者点击右上角“部署”，检查部署版本、域名和日志。Coze 文档说明网页应用默认为**公开部署**，并可能受配额限制。部署成功后用正式网址再次检查新游戏、读档、三族模型和 3D 战斗。一个约 333 MiB 的 HTML 需要完整网络下载；实际首屏时间、Coze 文件/响应限制与手机表现，必须在该线上地址实测。

## 常见失败

| 表现 | 处理 |
|---|---|
| GitHub 导入被 500 MB 限制拒绝 | 停止本次 Git 导入；不要发布缺资源版本。记录 Coze 原始报错，再考虑独立的、低于限额的发行仓库或其他静态托管方案。 |
| 启动时报“Playable build is too small” | 定向 `git lfs pull -I "dist/SC2-Survivors-Demo.html" -X ""` 未取得大文件，先解决 LFS 下载权限与配额。 |
| Coze 自动尝试 `npm run build` | 指定直接运行 `node tools/coze-web-server.mjs`；本仓库的 Git 内容不是完整的原素材重建环境。 |
| 预览能开、部署后空白 | 查看部署日志及正式网址的网络请求，确认产物确实进入生产环境，不能只凭预览判断。 |
| 用户要微信小游戏 | 这份流程只部署网页应用。微信小游戏要求适配小游戏运行时、分包/远程资源、真机验证，以及微信侧 AppID 和发布流程。 |

官方依据：[Coze 导入项目](https://docs.coze.cn/guides_import_from_github)、[Coze CLI 导入已有项目](https://docs.coze.cn/coze-cli-import-existing-project)、[部署网页应用](https://docs.coze.cn/guides_deploy_vibe_web)。本文依据 2026-09-25 的文档编写；若 Coze 的界面或限制改变，以实际项目和最新官方文档为准。
