# Coze 部署交接：固定版本、分批资源

本交付为浏览器游戏：Node 服务负责分发、缓存和健康检查，战斗及 3D 渲染在浏览器运行。业务后台、账号及管理员统计暂缓。部署时使用已构建目录，不重新转换 SC 原素材。

## 交付内容

| 路径 | 用途 |
|---|---|
| `deploy/coze/` | 小型应用、脚本、样式、发行清单、静态服务和分批获取工具 |
| `deploy/runtime/assets/` | 经引用审计的运行模型、贴图、动作、地图和音效，真实 Git LFS 对象 |
| `dist/coze-deployment/SC2-Coze-App.zip` | 可跨机器交接的单文件夹应用包 |
| `dist/coze-deployment/SC2-Web-Resources.zip` | 完整去重资源包，可直接上传资源托管 |
| `dist/coze-deployment/CHECKSUMS.json` | 包体字节数、散列与固定发行 ID |
| `dist/SC2-Survivors-Demo.html` | 离线单文件游戏，不作为 Coze 网页入口 |

源素材目录、开发测试、截图和离线大 HTML 都不需要导入 Coze。Git 中只保存一份散列运行资源，不重复提交两份大资源压缩包。同内容不同资源 ID 共用文件。

## 第一步：只取得应用

截至本次核对，Coze 官方 GitHub 导入会获取整个仓库，且不支持超过 500 MB 的仓库。此项目保留了原素材，因此推荐上传小应用 ZIP，或由 Coze 的工作环境按下面方式稀疏取得应用。[官方导入说明](https://docs.coze.cn/guides_import_from_github)

将 `<完整提交号>` 替换为本次交付的 40 位 Git SHA。后面的应用和资源必须使用同一提交：

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --no-checkout https://github.com/ziyuuu/sc2-survivors-.git sc2-delivery
git -C sc2-delivery sparse-checkout init --cone
git -C sc2-delivery sparse-checkout set deploy/coze
GIT_LFS_SKIP_SMUDGE=1 git -C sc2-delivery checkout <完整提交号>
cd sc2-delivery/deploy/coze
```

或者解压 `SC2-Coze-App.zip`，在 Coze「导入 → 本地上传」选择该 ZIP，工作目录为包内的 `SC2-Coze-App`。Node 要求 22 或以上，无需安装依赖。不要执行仓库根目录的素材提取命令。

## 第二步：分批取得真实资源

在应用目录执行；可中断后重跑相同命令。工具会跳过散列正确的文件，保留部分下载，最多重试四次，并检查每个文件字节数及 SHA-256。Git LFS 指针会被判为错误，不会冒充模型。Git 使用指针管理大文件，实际内容储存在 LFS 对象服务中。[GitHub LFS 说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)

```sh
node fetch-resources.mjs --commit <完整提交号> --group common --out public
node fetch-resources.mjs --commit <完整提交号> --group campaign --out public
node fetch-resources.mjs --commit <完整提交号> --group enemies --out public
node fetch-resources.mjs --commit <完整提交号> --group terran --out public
node fetch-resources.mjs --commit <完整提交号> --group zerg --out public
node fetch-resources.mjs --commit <完整提交号> --group protoss --out public
node fetch-resources.mjs --commit <完整提交号> --group endless --out public
```

也可使用 `--group all` 一次获取，或用逗号选择多组。分组只是下载批次，完整发布仍须七组齐全。清单中的重复内容只传输、保存一次。工具从该提交取得 `resource-groups.json`，不会随 main 后续变更混用文件。每批结果写入 `resource-receipt-*.json`。

私有仓库通过服务端环境变量 `GITHUB_TOKEN` 传入只读凭证；不要写入网页、清单或 Git。仓库公开时不需要凭证。遇到 404 先核对提交号和访问权限，遇到 LFS 配额/限流错误先解决仓库服务状态，不改用指针或跳过校验。

## 第三步：运行或分离资源域名

**同域方案：**资源位于 `public/assets/`，不设置 `ASSET_BASE_URL`：

```sh
npm start
```

服务使用平台 `PORT`，默认 3000，监听 `0.0.0.0`。本地资源全部通过散列校验才启动。`/health` 返回 `ok`、发行 ID 和资源模式；发行 ID 必须与 `public/web-release.json` 一致。

**独立资源域名：**将下载的 `assets/` 或完整资源 ZIP 的 `assets/` 上传到已有 HTTPS 静态托管。设置：

```text
ASSET_BASE_URL=https://你的资源域名/sc2/
```

这里是 `assets/` 的父目录，示例最终请求为 `https://你的资源域名/sc2/assets/<sha256>.glb`。不要填写 GitHub 预览页，也不要把 GitHub LFS 下载地址作为长期游戏 CDN。应用只需保留 `public/` 内的小文件，服务无需本地重复保存大资源。`ASSET_ROOT` 可以指定同机另一个包含 `assets/` 的目录；`WEB_ROOT` 可以指定应用入口目录。

资源托管配置：允许 GET/HEAD/OPTIONS；`Access-Control-Allow-Origin: *`（不使用 Cookie）；正确的 GLB/JSON/WebP/音频内容类型；散列文件 `Cache-Control: public,max-age=31536000,immutable`；入口、清单、`runtime-config.json` 使用重新验证或 no-cache。支持 gzip/Brotli 可减少模型传输。客户端仍检查实际解压字节散列，错误不会进入战场。

## 第四步：验证后部署

1. `/health` 为正常且发行 ID 一致。
2. 三族各新建一次，读条完成；普通兵、精英、英雄、工人、载体、死亡模型不缺失。
3. 保存再读取，种族、难度、双生缺员和倒计时一致。
4. 关间点击一次下一关即可继续；资源失败可重试。
5. 进入无尽为独立平地，真实地堡和维修建筑显示。
6. 开发者控制台无 404、LFS 指针、跨域或散列错误；确认冷/暖缓存都能运行。

随后由应用所有者在 Coze 项目中点击「部署」。平台配额、实际公开域名和手机表现需在账户环境验证；本地通过不等于线上部署完成。[官方部署说明](https://docs.coze.cn/guides_deploy_vibe_web)

## 更新与本地打包

先以新提交下载/上传新增散列资源，再切换应用和清单。不要覆盖已有散列文件；已打开的旧页面仍使用自己的固定清单。回退时使用匹配的旧应用和旧资源，无需重新转模型。

开发机执行：

```sh
npm run build:web
node --import tsx tools/publish-coze-tree.mts
python tools/package-coze.py
npm run build
```

提交 `deploy/coze` 及 `deploy/runtime`，随后正常推送 main 和 LFS 对象。推送后用固定提交逐文件远端读取并核验散列；验证报告与实际提交号单独记录。离线包和 Web 运行同一套模拟，不以资源分离宣称战斗帧率已达标。
