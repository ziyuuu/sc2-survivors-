# 部署资源与应用基线

- coze/：保留的旧应用基线（package.json 为 0.6.28）及既有部署/更新机制；不是当前线上版本的判断入口。
- runtime/：内容 hash 命名的运行时资源。与发布资源清单绑定，使用既有 Git LFS 范围；不能仅凭未跟踪或未在新包出现就删除仍被旧版本需要的文件。

当前 V04 为 0.6.29-rc.1，正式应用/资源包在本机 dist/V04-20261027，服务器使用同版包。实际版本与待办见 [完整交接](../docs/project/MVP_TO_1_0_HANDOFF_20261027.md)、[V05 服务器记录](../docs/project/V05_SERVER_STAGING_20261027.md)。

阿里云部署已完成，备案中尚未公开发布。另有基于同版游戏的 [Sites 体积优化交付](../docs/project/MVP_SITES_REVIEW_20261027.md)，第 5 版已私有发布，源码快照在 sites/size-optimized-site；它使用 Sites 所有者认证、D1/R2，不能与原 admin/PostgreSQL 混用。生产密码、数据库、真实用户数据和私有配置不进入此目录。发布、升级及配置变更按运维线程的实际授权执行；本目录整理不构成新的发布操作。
