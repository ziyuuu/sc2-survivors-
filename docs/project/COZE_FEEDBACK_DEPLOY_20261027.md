# Coze 部署交接：2026-10-27 反馈修复版

## 给 Coze 的执行说明

请更新现有《星际幸存者》项目，使用本次交付的 `Application.zip`。保留现有域名、端口、数据库、配置、资源目录及玩家数据。先在暂存目录验证，成功后才切换应用；不要创建一个不相干的新项目，不要用旧 `deploy/coze` 目录覆盖本包。

本包修复装备产出、趣味事件频率、难度解锁、后期敌人成长、腺体毒爆追击、任务出生距离、成长蟑螂行为、加载状态和购物卡牌。应用版本号仍沿用 0.6.29-rc.1；**识别本次更新必须核对 `delivery.json` 的 `packageBuildId` 和 `appBuildId`，不能只看版本号**。存档 schema 26、永久档案 v6 保持，禁止清空账户或自动导入测试档。

此应用包使用原版资源。压缩版 Sites 是另一套部署，使用所有者认证及 D1/R2，不能把它的 Worker、压缩资源包或数据库配置混进本应用。

## 文件与资源

- 新应用：本次 `dist/V06-feedback-20261027/Application.zip`，内含服务端、前端、固定依赖清单、更新器和校验清单，没有数据库或账号。
- 已部署 V04 的安装：完整资源版本仍为 `885e128519e431e7e83975a31fd93dcc14b246585837415f95ae395acf858bfa`，本次无资源增量，更新器逐 SHA 校验并复用。
- 首次安装或资源不全：使用已有 `dist/V04-20261027/Resources.zip`，解压后应有 `public/assets/…`。它与本次应用的资源清单相符。不要拿压缩版约 240 MB 的 Sites 资源代替。
- ZIP 完整性及本批应用身份见 `reports/qa/v06-application-package-20261027.json`；解压后再由 `delivery.json` 验证每个应用文件。

GitHub 交付使用 **`体积优化版` 分支**：仓库根目录 `src/` 是原版游戏源码，`sites/size-optimized-site/` 是同批修复的压缩版 Sites 源码快照。本说明与两套源码一起提交。`main` 仍为此前 V04 基线，不能将它当作本批修复版；部署前记录 `git rev-parse HEAD`，按该固定提交构建，不依赖分支名称猜测版本。

## 从 GitHub 构建原版应用

已提供的 Application.zip 可以直接按下文部署；仅持有 Git 仓库时，在新的构建目录执行以下步骤。构建机需要 Git LFS、Node.js 22+ 和 npm。先检出交付的固定提交，再获取运行时 LFS 资源；不需要重新提取原始游戏资源。

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone --branch '体积优化版' --single-branch https://github.com/ziyuuu/sc2-survivors-.git sc2-build
cd sc2-build
git rev-parse HEAD
git lfs pull --include='deploy/runtime/**' --exclude=''
npm ci
npm run build:web
node tools/prepare-v04-application.mjs --output dist/Coze-from-Git --baseline deploy/coze --readme docs/project/COZE_FEEDBACK_DEPLOY_20261027.md
```

生成的应用为 `dist/Coze-from-Git/Application`，完整原版资源在 `dist/web/assets`。这是构建目录；生产工作目录应使用生成的 Application，**仓库根目录的 `npm start` 是开发服务器**。这里的 `deploy/coze` 仅提供旧基线的服务配置、依赖和资源对照，前端取自刚构建的 `dist/web`，不会把旧前端作为新版本发布。

本地 V06 ZIP 使用 V04 资源对照生成；上面的 Git 构建使用仓库内旧基线生成，因此包哈希、增量清单和构建环境产生的标识可能不同。应核对实际生成的清单并复用已有同 hash 资源，不能要求两种打包方式的 ZIP 哈希相同。详细同步记录见 `docs/project/V06_GITHUB_SYNC_20261027.md`。

## 首次安装

运行环境为 Node.js 22+。将应用目录作为服务工作目录；安装和启动命令为：

```sh
npm ci --omit=dev
npm start
```

程序读取平台提供的 `PORT`，默认 3000。资源默认在应用的 `public`；若资源单独存放，`ASSET_ROOT` 必须指向 `assets` 的父目录。独立 HTTPS 资源托管使用 `ASSET_BASE_URL`，先上传全部内容哈希资源再启用应用。

平台必须能运行 Node 服务；仅托管静态文件的环境不能提供本包的统计、反馈及管理后台。此交接不假定 Coze 提供持久磁盘或数据库。实际平台不具备持久化条件时，应接已配置的持久 PostgreSQL，不能把临时 `/tmp` 当成生产数据库。

## 现有安装更新

以下变量是示例路径，Coze 应替换为现有项目实际目录，不改变原有目录结构：

```sh
SC2_NEW_APP=/srv/sc2-staging/Application
SC2_INSTALL=/srv/sc2
SC2_RESOURCES=/srv/sc2/public
node "$SC2_NEW_APP/apply-update.mjs" --app "$SC2_NEW_APP" --root "$SC2_INSTALL" --assets "$SC2_RESOURCES"
```

若原资源不完整且已取得完整资源 ZIP，再追加 `--resources /srv/sc2-staging/resources/public`。更新器先校验应用和资源，再写 `active-release.json`；同 hash 资源复用，失败不激活。切换之后使用原安装目录中的启动器重启服务。

更新前保存原 `active-release.json` 和生产配置，做数据库备份及独立删除日志备份。更新不会替你迁移真实数据库或创建管理员。保持现有 `sc2-backend.conf`；启动器会读取该文件，因此不能只在平台环境变量里改值却忽略同名配置的覆盖。密钥、密码、数据库地址不放进 Git 或本说明。

如果平台每次重新部署会重建整个工作目录，必须把新应用与资源纳入平台的发布来源，数据库和删除日志使用独立持久存储；在临时容器里运行更新器不等于下次部署仍有效。

## 验证及回退

1. `GET /health` 的 `appBuildId`、`assetReleaseId` 和 `runSchema` 分别与应用 `public/web-release.json` 的 `appBuildId`、`release`、`runSchema` 一致。
2. 页面进入正常菜单；新账户只能选择简单、普通。能进入战斗，加载标记消失；关间门票占三张卡之一，购买后卡框不跳动。不要用测试账户覆盖真实玩家档案。
3. 在相同域名下确认继续游戏与导出备份；检查未同意统计前不收集统计，后台访问仍受原认证和访问限制保护。采用既有生产配置时再验证数据库重启持久化。
4. 若需回退，停止服务，恢复更新前保存的**完整** `active-release.json`，保留旧应用和 hash 资源，再启动并核对旧 `/health`。不要只改一个字段或删除资源来回退。

本轮本地验证不等于已经更新 Coze 或阿里云。现有阿里云仍按 V05 记录运行，备案和公开发布状态不因提供本说明而改变。部署结果应记录实际应用身份、资源身份、健康检查及回退目标。
