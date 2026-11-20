# Coze 更新步骤与本轮阻塞

2026-10-28。**本次 Safari 修复尚未通过原手机验收，没有新的正式 Coze 应用包或已推送固定提交。当前不要把 `02c312a`、Sites 第 13 版或旧 V06 包称作 Safari 修复版。** 本线程没有操作 Coze 部署，也没有核实 Coze 当前自动部署设置及运行版本。

## 先区分两套交付

现有 Coze 流程运行生成的 Node 应用 Application，使用原版资源及现有后台；`deploy/coze` 只提供打包基线，不能用其旧前端覆盖新应用。`sites/size-optimized-site` 依赖 Sites 的 Workers、DB、BUCKET，不能直接作为 Coze 的部署目录。

本轮主要内存收益依赖压缩版的三档资源身份清单与加载路径。原版 Application 不会因为更新同一份 `src` 就自动获得完整收益，**目前不能交付一个原版包并宣称它已解决 Coze 上的 Safari 问题**。若故障发生在 Coze 地址，需要先核对该地址的 `/health`、`public/web-release.json` 和实际交付方式，再对它的成品单独测试。

## 获得验证通过的 Coze 正式包后

1. 记录当前 `/health`，保存完整 `active-release.json`、现有生产配置和独立数据库备份。保持原域名、端口、数据库、资源目录和玩家数据。
2. 使用交付记录指定的 `Application.zip` 与 SHA256，解压到暂存目录。核对 `delivery.json` 的 `packageBuildId`、`appBuildId`、资源版本和保存格式；只看 `0.6.29-rc.1` 不足以识别更新。
3. 在暂存环境用原手机验证“预下载完成 → 进入首战 → 退出再进入”，再验证同域名下继续游戏、后台认证和数据持久化。这里未通过就不激活。
4. 若已有安装使用项目更新器，沿用以下流程。路径替换为 Coze 当前实际路径，不创建无关的新项目：

```sh
SC2_NEW_APP=/srv/sc2-staging/Application
SC2_INSTALL=/srv/sc2
SC2_RESOURCES=/srv/sc2/public
node "$SC2_NEW_APP/apply-update.mjs" --app "$SC2_NEW_APP" --root "$SC2_INSTALL" --assets "$SC2_RESOURCES"
```

5. 更新器校验通过后，用已有安装的启动器重启服务。检查 `/health` 的 `appBuildId`、`assetReleaseId`、`runSchema` 与新包的 `public/web-release.json` 相同。已有配置文件会覆盖同名环境变量，必须核对实际生效值。
6. 失败时停止服务，恢复更新前保存的**完整** `active-release.json`，然后重新启动并核对旧 `/health`。保留旧应用、内容哈希资源及玩家数据。

若 Coze 每次部署会重建工作目录，需要把通过验证的应用与资源放入持久发布来源；在临时容器里运行更新器不能保证下次部署仍有效。自动部署如已启用，应在发布来源明确后绑定已验证的固定提交，不能仅凭分支名更新。

这些是项目现有交付工具的更新步骤，不代表已经核实某个 Coze 实例具备这些目录、持久存储或运行方式。详细原版构建、资源复用及后台约定仍见 [此前 Coze 交接](COZE_FEEDBACK_DEPLOY_20261027.md)；其中旧提交和旧 ZIP 仅适用于当时版本。
