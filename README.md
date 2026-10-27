# 星际幸存者

基于 TypeScript、Three.js 的三族自动战斗游戏。原版正式候选为 **0.6.29-rc.1**，T01 画面与听感已由用户确认，V04 同版交付完成。本轮反馈修复已进入原版源码与 **Sites 体积优化版第 7 版**；站点已私有发布，目前只允许所有者访问。阿里云原部署及备案是另一条保留渠道。V05/V06 尚未全部关闭，质量、性能和发布限制见交接。

## 从这里接手

- [当前完整交接与后续 1.0 线程提示词](docs/project/MVP_TO_1_0_HANDOFF_20261027.md)
- [实际目录与模块职责](docs/PROJECT_STRUCTURE.md)
- [当前工作导航](docs/project/README.md) · [看板](docs/project/PERFORMANCE_BOARD.html) · [任务状态数据](docs/project/performance-board.json)
- [V04 成品与验证](docs/project/V04_DELIVERY_20261027.md) · [V05 服务器现状](docs/project/V05_SERVER_STAGING_20261027.md)
- [Sites 压缩与发布核对、MVP 归属](docs/project/MVP_SITES_REVIEW_20261027.md) · [运维交接](docs/project/SITES_HANDOFF_20261027.md)
- [四项统计修正与交接定稿](docs/project/SITES_METADATA_AGENTS_FINAL_20261027.md)
- [本批双版本 GitHub 同步](docs/project/V06_GITHUB_SYNC_20261027.md) · [Coze 部署说明](docs/project/COZE_FEEDBACK_DEPLOY_20261027.md)
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

离线构建必须显式命名：默认 npm run build 会写保留的旧 Current。PowerShell 示例：

~~~powershell
$env:SC2_DEMO_OUTPUT = 'dist/SC2-Survivors-Local.html'
try { npm run build } finally { Remove-Item Env:SC2_DEMO_OUTPUT -ErrorAction SilentlyContinue }
~~~

先确认该输出名未被当前任务使用；build:web 同样会更新共享 dist/web。

## 当前本机交付

在线私有入口：[星际幸存者](https://sc2-v04-private-test-20261027.yuuuu-g.chatgpt.site)。主仓库当前交付分支为“体积优化版”，本批提交同时包含根目录原版源码、`sites/size-optimized-site` 压缩快照及 Coze 说明；main 仍 `2924d9b`，尚未合并。站点第7版内部源码提交为 `ffa349c01b3934fcfd2b320bbfcbc9cef6cdff35`。GitHub 推送不自动部署 Sites，最终远端核验见同步记录。

- 玩家离线游戏：dist/SC2-Survivors-V04-20261027.html。
- Web 与应用/资源包：dist/V04-20261027/；逐包字节和 SHA 见 CHECKSUMS.json。
- T01 检测页：reports/local/t01-20261024/offline-r33/T01-综合检测.html，用于查看动作、声音与 UI。

上述生成物不随普通 Git 克隆分发。当前应用/资源标识见完整交接；根 package.json 版本、旧 deploy/coze 和旧 Current 文件均不能代表最新交付。

游戏按初始及关间检查点保存，刷新/关闭后当前关可能重打。迁移浏览器、网址或离线文件位置应先导出，再在目标入口导入。详见 [D05 保存约定](docs/project/D05_CHECKPOINT_20261023.md)。

## 文件与协作

生产代码在 src，测试在 test，工具在 tools，资料在 docs；preview 混有原型源码和唯一原图，不能整目录当缓存删除。可重建产物遵循 [保留规则](docs/project/ARTIFACT_RETENTION.md)。共享工作区先核对 git status，不批量提交其他线程改动；不在文件夹整理时修改生产配置或发布。

本首页核对于 2026-10-27。后续最新事实从工作导航、看板 tasks 和对应日期记录读取；历史入口全文可从 Git 的整理前提交恢复。
