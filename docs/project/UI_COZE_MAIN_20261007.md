# 新 UI 与 Coze 部署分支合并 · 2026-10-07

用户要求把已完成的原稿 UI 与 Coze 实际部署分支合并后推送 main。两个父版本均基于 `bba1339`：UI 为 `083c5ddd2338ac3b1c38bbbd18e63d98e232ddc2`，Coze 为 `ed70fe4`（`codex/backend-deploy-logic-20261007`）。合并保留两条提交历史，不用旧部署分支的前端覆盖新 UI。

游戏 Web 身份仍为 `4b241eb22ff39aeaf57b0fd78c6637b23c5ebb1c58c8c2025f7c8c146f493c06`，战局 schema26、永久档案 v6、地图配方 v3 不变。全部 `src/`、UI 原稿、原资源和已验证的部署前端逐字节继承 UI 提交；连续输入控制点没有障碍物碰撞体积，真实部队、点击命令、武器和数值规则保持原设计。原 UI 验证记录保留其原始构建与包身份，不冒充本次新增验证。

Coze v10 启动入口、配置文件、隐藏后台路由、对应 cookie Path、管理前端及 308 个 PGlite vendor 文件继承部署分支。`tools/start-coze.mjs` 和 `tools/backend/` 同步，后续打包不会恢复旧路由。数据库模块优先加载包内 vendor；开发源目录没有 vendor 时使用锁定的 npm 包。`prepare-current-handoff.mts --ui-fidelity --coze` 包含 vendor、Coze 配置与本说明，版本为 0.6.7，并重新计算所有应用文件与独立包身份。

`sc2-backend.conf` 保留 Coze 分支的启用状态和运行环境；它不是旧 UI 候选的默认关闭配置。启动入口相对部署根解析数据路径，部署根不可写时使用 `/tmp/sc2-pglite-work`。根目录的 `active-release.json` 仍选择不可变应用和既有资源，根目录配置仍由原环境管理。更新器保留原环境、数据库、资源与回滚指针，不把新包配置写入既有项目根来覆盖运行配置。

应用：`dist/UI-Coze-Main-Application-20261007.zip`，与 Git 的 `deploy/coze` 一致。完整离线 HTML 保持 `dist/SC2-Survivors-Current-20261006.html`。资源版本仍为 `2848cfe41f50528ce1cc9128edd1e5ddccdf9bd7e889aa15af72df16f3fc287a`，647 记录、629 文件、648838732 字节，没有新增游戏资源。旧线上资源增量仍复用 531、补齐 98 文件／49639414 字节。

私有 `data/pglite-bundle.tgz`、数据库、管理员、密码哈希和 token 不进入应用或 Git；bundle 和 `deploy/coze/data/` 明确忽略。数据库恢复测试只使用本地生成的临时样本。新合并应用的逐文件校验和在 `deploy/coze/delivery.json`；本轮实际验证与源码保护证据在 `reports/local/ui-coze-main-20261007/`。

本次授权并执行的是 Git main 推送。没有另行上传 Coze、操作线上数据库、创建生产管理员或替换私有 bundle。Coze 配置中的 PGlite 与 `/tmp` 行为不等同持久 PostgreSQL、跨实例数据保存或 B4 验收；运营联系人和真实删除日志卷仍须由运营方核实。P6-V01、自然及高密度性能、完整 M6/M7、人工视觉、物理设备、高刷新率、长期及低内存验收、三个科学船来源缺口继续 OPEN。
