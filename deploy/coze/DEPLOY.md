# 本轮升级：三族独有卡与资源缓存（schema13）

在原Coze项目升级，保留域名、PORT、ASSET_BASE_URL、ASSET_ROOT及其他环境设置。永久档案v5不变，不清浏览器数据；旧开发战局schema12只导出，新局使用schema13。

## 已部署项目：默认增量更新

1. 获取交付固定提交的 `deploy/coze` 或解压 `SC2-Coze-App.zip` 到暂存目录，不覆盖在线入口。
2. 解压 `SC2-Web-Resources-Update.zip` 到另一暂存目录。它只含上次发行后变化的散列文件；纯代码更新可以没有模型文件。
3. 先核验原资源目录跨Coze重新部署是否仍保留。不能持久保存时，把资源部署到独立HTTPS静态域名，并保持 `ASSET_BASE_URL` 指向它。不要把临时构建目录误认成持久资源盘。
4. 在原项目执行（路径替换为实际目录）：

```text
node <新应用>/apply-update.mjs --app <新应用> --root <原项目> --assets <原资源根目录> --resources <解压后的差量目录> --commit <目标完整40位提交号>
```

工具核验旧文件，复制差量中缺少的资源；若基线不同，仅从固定提交补实际缺项。资源完整、应用散列正确后才写 `active-release.json`。旧应用和旧散列资源保留，不改 `.env`、存档或天赋。

5. 首次采用更新工具时，它会安装 `start-coze.mjs` 启动器，并保留原package.json的其他配置，只把start命令指向该启动器。原进程继续服务旧版，完成检查后在Coze重新部署/重启。若平台会重新生成整个文件目录，必须把本轮应用及完整目标资源清单同步到发布来源，不能只修改临时容器。
6. 独立HTTPS资源托管时，先上传工具校验过的新增资源，再发布应用。浏览器需要CORS读取权限。入口/清单重新验证缓存，内容散列资源长期缓存。
7. 请求 `/health`，核对 `appBuildId`、`assetReleaseId`、`runSchema:13`。应用ID和资源ID独立，模型没变也应看到新应用ID。
8. 检查再次进入、切族、固定左上地图、三族独有卡、主动取消和新局存读。Web首次获取自动缓存，预下载不是必需步骤。不同域名的浏览器缓存不能直接共享，保持原访问域名。

失败恢复：更新工具失败不会切换应用。成功后若需要回退，将active-release.json的directory恢复为其中previous记录并重启，保留资源目录；不能把新战局作为旧schema继续运行。

## 首次部署

使用 `SC2-Coze-App.zip` 加 `SC2-Web-Resources.zip`，或者从固定提交按组获取资源。资源根目录里应包含assets/；同域启动：`npm start`。不需要转换原始SC素材。

构建差量默认对比Git HEAD已提交的资源清单，重复构建不会把未发布的资源差量吞掉。也可用 `node --import tsx tools/publish-coze-tree.mts --base-manifest <旧版资源清单.json>` 指定任意已部署基线；获取工具仍以目标完整清单为准补缺。

读取Git基线失败会停止打包，不会偷偷生成全量差量包。只有仓库首次发布、确实没有旧清单时使用`--first-release`。

## Git发行约定

日常main只更新源代码、小应用、清单和变化的独立运行资源。离线 `dist/SC2-Survivors-Demo.html` 在本地生成，不再跟踪后续大文件版本；原Git历史不改写。ZIP只作为本地交接产物，不重复提交Git。

以下保留旧版交接作为历史与分批下载参考；发生冲突时以上schema13步骤优先。

---

# Coze 部署交接：固定版本、分批资源

本交付为浏览器游戏：Node 服务负责分发、缓存和健康检查，战斗及 3D 渲染在浏览器运行。业务后台、账号及管理员统计暂缓。部署时使用已构建目录，不重新转换 SC 原素材。

## 2026-09-29 共享科技版本：在已部署项目中升级

本版增加九路线共享科技、三攻三防、全队卡牌、增援与四类战场支援，强化现有天赋，并支持移动端全屏与横竖切换。运行快照为 **schema12**；旧开发战局只导出留档，新局使用新效果。永久档案仍为 v5，**保留三族余额、配点与预设，不清空成长或浏览器数据**。

交给 Coze 执行方的升级步骤：

1. 在**原 Coze 项目**升级，保留现有访问域名、`PORT`、`ASSET_BASE_URL`、`ASSET_ROOT`、资源目录及其他生产环境变量。另存当前应用和清单以便回退。
2. 使用本轮交付的完整提交号，按下面的稀疏获取方式取得 `deploy/coze`，放入待发布目录。不要覆盖正在服务中的入口。
3. 查看 `resource-delta.json` 的 `from/to`、新增文件和 `appBuildId`。完整分组清单为 `resource-groups.json`。本轮新增蜘蛛雷主体及核爆贴图；不重新转换原素材。
4. 依次获取七组资源，`--out` 指向原 `assets/` 的父目录。若这里仍有在线旧应用的 `web-release.json`，升级预取时加 `--resources-only`，例如 `node fetch-resources.mjs --commit <完整提交号> --group common --out <资源根目录> --resources-only`。此选项只允许在旧应用旁预取新资源；仍固定提交、核验每个文件，不修改旧入口或旧清单。工具先核验现有文件，只下载新增、损坏或缺少的内容；不要求重新下载全部资源。独立 HTTPS 托管则将新增散列文件上传到原资源域名下。
5. **先补齐资源，再发布配套应用与清单。**保留旧散列文件，让已打开的页面继续使用自己的清单；不要在升级时清理它们。
6. 在原项目预览测试后重新部署，保持原访问地址。入口和清单重新验证缓存，散列资源保持长期缓存。
7. 请求 `/health`，比对 `appBuildId`、`assetReleaseId`、`runSchema:12` 与本次 `public/web-release.json`。模型不变时资源 ID 可能不变，不能仅凭它判断应用已升级。
8. 在线测试三族首载、共享解锁、发展购买后进入商店、获兵与支援、横竖切换、全屏、新局存读。Coze 中若嵌入 iframe，允许 `fullscreen`；浏览器不支持时会提示并继续普通显示，不强制横屏。

本地包通过不代表 Coze 已发布成功；最终线上部署由账户内执行方完成。[官方部署入口说明](https://docs.coze.cn/guides_deploy_vibe_web)

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

服务使用平台 `PORT`，默认 3000，监听 `0.0.0.0`。本地资源全部通过散列校验才启动。`/health` 返回 `ok`、`appBuildId`、`assetReleaseId`、`runSchema` 和资源模式；这些值必须与 `public/web-release.json` 一致。

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
