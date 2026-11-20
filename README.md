2026-11-09 [1.1、1.2 和共同优化已合入两个 GitHub 分支](docs/project/V12_BRANCH_INTEGRATION_20261109.md)。原画质与压缩构建均通过首战、续局和完整回归。线上服务保持原发布版本。

**MVP 1.0 暂按完成（2026-11-04）。** [进入游戏](https://sc-survivors.coze.site/) · [当前交接与保留事项](docs/project/MVP_1_0_HANDOFF_20261029.md)

> 2026-10-30：[Coze v7已上线](docs/project/COZE_REPAIR_DEPLOY_20261030.md)。坦克修复与累计更新已推送GitHub“体积优化版”并部署至原Coze域名，程序/资源SHA及实际菜单核验通过；原iPhone待验，main未合并。

> 2026-10-29：[多模块代码审查](docs/project/CODE_BUG_AUDIT_20261029.md)四项缺陷已本地修复，2882项回归通过。前两阶段已推送，第三阶段未提交推送；全程未部署。

> 2026-10-29：[挑战关小兵异常死亡修复](docs/project/SPECIAL_ROSTER_FIX_20261029.md)已本地验证：进出场景一致迁移装备前属性基准，保留伤势与真实战损。20项定向及2867项完整回归通过；已随`f68cc85`推送“体积优化版”并双重核验，未部署。

> 2026-10-29：解锁反馈与虫族／近战／舰装已随`f10cfc1`推送GitHub“体积优化版”，249项最终组合回归通过，远端双重核验完成。见[本批同步记录](docs/project/ZERG_MELEE_EQUIPMENT_GITHUB_SYNC_20261029.md)。下一步按授权修复挑战关小兵死亡；旧Coze包不含本批，本次未部署。

# 星际幸存者

基于 TypeScript、Three.js 的三族自动战斗游戏。MVP 正式版本号为 **1.0**，当前功能范围冻结，只处理实际 bug；其他改进留到 **1.1**。既有功能批次已推送，解锁、虫族与舰装反馈修改也已推送GitHub；含两首 BGM 的 Coze 更新包已准备、未部署，且不含这些修改。实际版本、缺陷复核与交付边界见当前交接。

## 从这里接手

- [MVP 1.0 当前交接与 1.1 边界](docs/project/MVP_1_0_HANDOFF_20261029.md)
- [实际目录与模块职责](docs/PROJECT_STRUCTURE.md)
- [当前工作导航](docs/project/README.md) · [看板](docs/project/PERFORMANCE_BOARD.html) · [任务状态数据](docs/project/performance-board.json)
- [V04 成品与验证](docs/project/V04_DELIVERY_20261027.md) · [V05 服务器现状](docs/project/V05_SERVER_STAGING_20261027.md)
- [Sites 压缩与发布核对、MVP 归属](docs/project/MVP_SITES_REVIEW_20261027.md) · [运维交接](docs/project/SITES_HANDOFF_20261027.md)
- [四项统计修正与交接定稿](docs/project/SITES_METADATA_AGENTS_FINAL_20261027.md)
- [最新源码 GitHub 同步](docs/project/LOCAL_FEEDBACK_GITHUB_SYNC_20261029.md) · [含 BGM 的 Coze 更新步骤](docs/project/COZE_FEEDBACK_BGM_UPDATE_20261029.md)
- [项目目录与核心协作规则](AGENTS.md) · [整理安排](docs/project/PROJECT_ORGANIZATION_20261027.md)

## 开发与检查

需要 Node.js 22+、npm 和当前 Git LFS 资源。克隆后先确认 LFS 二进制已获取，再安装锁定依赖。私有原始素材不随普通克隆自动提供；缺资源应查看诊断，不能用占位文件掩盖。

~~~powershell
npm ci
npm run assets:restore
npm run dev
~~~

开发入口为 http://127.0.0.1:5173/ 。运行前检查端口和其他线程正在使用的服务，避免覆盖共享验证现场。

~~~powershell
npm test
npm run typecheck
npm run docs:check
npm run build:web
~~~

按实际改动选择验证范围。修改游戏参考数据后先 npm run docs:data，再运行 docs:check。历史定向脚本见 [工具说明](tools/README.md)，不将旧脚本不兼容当成当前游戏缺陷。

离线构建必须显式命名：默认 npm run build 仍写旧 Current 文件名，该名称没有保留效力。按任务指定输出，工作结束后清理。PowerShell 示例：

~~~powershell
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-Local.html'
try { npm run build } finally { Remove-Item Env:SC2_DEMO_OUTPUT -ErrorAction SilentlyContinue }
~~~

先确认该输出名未被当前任务使用；build:web 同样会更新共享 dist/web。

## 当前本机源码与产物

本地合流源码为 main `8ccf4282` 与“体积优化版”`ad28ddbc`；该次合流尚未推送或部署，见[合流记录](reports/qa/v14-local-integration-20261113.md)。当前状态以[项目导航](docs/project/README.md)和对应任务报告为准。

旧 Current HTML、V04 HTML／应用资源包和 T01 检测目录已于 2026-11-16 按用户要求删除。它们不再作为本地保留基线；需要游戏包或检测入口时，从对应源码、构建脚本与保留资源重新生成。已结束且可重建的产物按[保留规则](docs/project/ARTIFACT_RETENTION.md)清理，[清理报告](reports/qa/disk-cleanup-20261116.md)记录实际范围。

根 package.json 版本、旧 deploy/coze 目录和历史文件名均不能代表最新交付；线上环境以实际部署记录为准。本地文件清理不改变线上服务。

游戏按初始及关间检查点保存，刷新/关闭后当前关可能重打。迁移浏览器、网址或离线文件位置应先导出，再在目标入口导入。详见 [D05 保存约定](docs/project/D05_CHECKPOINT_20261023.md)。

## 文件与协作

生产代码在 src，测试在 test，工具在 tools，资料在 docs；preview 混有原型源码和唯一原图，不能整目录当缓存删除。可重建产物遵循 [保留规则](docs/project/ARTIFACT_RETENTION.md)。共享工作区先核对 git status，不批量提交其他线程改动；不在文件夹整理时修改生产配置或发布。

本首页核对于 2026-10-29。后续最新事实从工作导航、看板 tasks 和对应日期记录读取；历史入口全文可从 Git 的整理前提交恢复。
