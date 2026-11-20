# 部署资源与应用基线

2026-10-29 当前 Coze 增量交付为[本批反馈与 BGM 更新包](../docs/project/COZE_FEEDBACK_BGM_UPDATE_20261029.md)，包含两首正式音乐和新资源清单；已本地验证，尚未部署。下列为历史部署和资源来源说明；本地已结束可重建产物按[保留规则](../docs/project/ARTIFACT_RETENTION.md)清理，不因基线名称长期保留。

2026-10-27 最新试玩反馈修复包在 `dist/V06-feedback-20261027/Application.zip`，见 [Coze 更新说明](../docs/project/COZE_FEEDBACK_DEPLOY_20261027.md)。仅提供包不代表已更新阿里云/Coze；下方 V04 为历史部署记录，本地 V04 交付包已按 2026-11-16 用户指令删除。

- coze/：保留的旧应用基线（package.json 为 0.6.28）及既有部署/更新机制；不是当前线上版本的判断入口。
- runtime/：内容 hash 命名的运行时资源。与发布资源清单绑定，使用既有 Git LFS 范围；不能仅凭未跟踪或未在新包出现就删除仍被旧版本需要的文件。

2026-10-27 的 V04 为 0.6.29-rc.1，当时本机交付位于 dist/V04-20261027，服务器使用同版包；该本地目录现已清理，线上服务未因本次清理而改变。实际版本与待办见 [完整交接](../docs/project/MVP_TO_1_0_HANDOFF_20261027.md)、[V05 服务器记录](../docs/project/V05_SERVER_STAGING_20261027.md)。

阿里云部署已完成，备案中尚未公开发布。另有基于同版游戏的 [Sites 体积优化交付](../docs/project/MVP_SITES_REVIEW_20261027.md)，第 5 版已私有发布，源码快照在 sites/size-optimized-site；它使用 Sites 所有者认证、D1/R2，不能与原 admin/PostgreSQL 混用。生产密码、数据库、真实用户数据和私有配置不进入此目录。发布、升级及配置变更按运维线程的实际授权执行；本目录整理不构成新的发布操作。
