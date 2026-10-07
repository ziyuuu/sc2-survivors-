# SC2 Survivors 云端后端部署逻辑（2026-10-07）

本分支记录 SC2 Survivors 网页版在 Coze FaaS 环境中的后端部署逻辑（v10），供复现与后续迭代参考。

## 背景

游戏后端（PGlite 本地数据库 + 管理后台）需要在 Coze 云端 FaaS 环境运行。该环境存在以下约束：

- 工作目录 `/opt/bytefaas/data` **不可写**（mode 777 但 writable=false），只有 `/tmp` 可写。
- 依赖包无法安装（无 node_modules 网络安装能力），需要 **vendor 化**。
- 后端管理后台路径必须 **隐藏化**，避免暴露默认 `/admin`。

## 关键文件

| 文件 | 说明 |
| --- | --- |
| `start-coze.mjs` | 启动入口：START_DIAG 诊断 → extractTgz 解压 bundle → PGLITE_REDIRECT 把数据重定向到 `/tmp/sc2-pglite-work/pglite` → 启动游戏服务与后端 |
| `backend/database.mjs` | vendor 化数据库连接（相对 import `../vendor/pglite/dist/index.js`，替代 `@electric-sql/pglite` 包） |
| `backend/service.mjs` | 后端服务，含隐藏路径 `ADMIN_PATH='/sc2-ops-7f3k9m2q'`、`API_PATH='/api/sc2-ops-7f3k9m2q'`，cookie Path 与后台一致，ready.catch 打印 backend init failed |
| `backend/admin/app.js` | 管理后台前端（全部 API 指向隐藏路径） |
| `backend/admin/index.html` | 管理后台页面（资源与样式指向隐藏路径） |
| `vendor/pglite/` | PGlite 依赖包（25MB，dist/LICENSE/package.json/README，含官方插件扩展） |
| `sc2-backend.conf` | 后端配置（启用开关、公共域名、PGlite 目录、删除日志、隐私联络、备份保留） |

## 运行时数据（不入库）

`data/pglite-bundle.tgz`（约 4.8MB）是 PGlite 数据库 bundle，**内含管理账号（admin_users 表）与密码哈希，绝不推送到 Git**。部署时由 `start-coze.mjs` 在云端从该 bundle 解压出数据库到 `/tmp/sc2-pglite-work` 运行。

bundle 只在部署时随包上传（当前线上由发布流程打包进 data/ 目录），不在 Git 仓库维护。

## 部署要点

1. 上传 `deploy/coze/` 到 Coze 服务（含 `.coze`，project_type=web，run=node start-coze.mjs）。
2. 将 `data/pglite-bundle.tgz` 一并放入部署包（服务端 data/ 目录）。
3. 启动后验证：
   - `GET /health` 返回 `{"runSchema":26,...}`
   - 隐藏后台 `/sc2-ops-7f3k9m2q` 返回 200；`/admin` 与 `/api/admin/login` 返回 404
   - 日志含 `PGLITE_REDIRECT` / `PGLITE_EXTRACT` / `backend ready: true`

## 与 GitHub main 的差异

基于 `bba1339`（origin/main）生成，仅修改上表所列文件，并同步 `delivery.json` 中对应文件的 bytes/sha256。其他文件（coze-web-server.mjs、fetch-resources.mjs、前端资源等）保持 main 原样，未做后端逻辑改动。
