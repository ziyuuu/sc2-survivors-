# Coze 缓存脚本升级修复与部署说明 · 2026-11-03

后续GitHub交付与可供Coze提取的固定文件清单见[同步记录](COZE_CACHE_WORKER_GITHUB_SYNC_20261103.md)。下文“未提交／共享快照未覆盖”是本包最初准备时点，不代表后续推送状态；原ZIP字节保持。

程序侧修复已本地完成，正式压缩入口的旧脚本升级、清缓存、失败重试和检查点续局通过。本次只准备更新包，未提交、推送或部署；原 iPhone 与线上 CDN 尚待发布后核验。用户已确认设置页的两条失败文案，页面、按钮、玩法、画质和存档格式保持。

## 交付

- 更新包：`dist/coze-cache-worker-fix-20261103/Coze-Cache-Worker-Fix.zip`。
- 校验：同目录 `CHECKSUMS.json`；包内 `PATCH-MANIFEST.json` 列出全部9份静态文件的字节数和 SHA256、保留依赖、发布顺序和回退方式。
- `public/` 合并至原 Coze 工程的实际静态根目录，不能替换整个工程。包内也含本说明。
- 源码基线：`b18410e`，加本批未提交修改；本包通过独立构建生成，共享 Sites 前端快照未覆盖。

| 标识 | 目标值 |
| --- | --- |
| 原域名 | `https://sc-survivors.coze.site` |
| 更新前应用 | `34408a35562ffdf62b278e8a310ae04d06515af98cee00f2c6ab61006922dbab` |
| 新 appBuildId | `86c3ca45f17fe278119e0099e023330db4b0140c4c4b8ef7719a35b515889690` |
| 资源 release，保持 | `50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a` |
| 缓存脚本 | `sites-sw.bd646d557a5dc16c1b8b.js` |
| 脚本 SHA256 | `bd646d557a5dc16c1b8b75f494c0d14d4d829873c734951153117bdc0ae2eeb8` |
| 资源索引 | `sites-pack-index.0bb43ff1011a0ab1462d.js` |
| 压缩主程序 | `assets/sc2-entry.6c2870662397867f.js.gz` |
| 存档／规则 | Run schema26、profile v6、archive v2、`mvp-1.0`，保持 |

## 程序修复

1. 启动器注册带内容哈希的缓存脚本，并等待它真正控制当前页面；通过协议握手确认清理及版本化索引能力后再启动游戏。仅 `register()` 或 `ready` 返回，不再视为升级成功。更新等待、协议响应有超时，失败可重试。
2. 清理前确认实际控制脚本能力；遇旧脚本时调用当前启动器升级，同页恢复后再清理。只有收到成功回执且控制者一致才显示成功；清理期间换控制者时再检查一次。
3. 升级失败显示“资源服务更新失败，请刷新后重试。”；其他清理失败显示“资源缓存清理失败，请稍后重试。”，不再把所有失败归为浏览器权限。
4. 保留账户、当前／两份备份检查点、设置与其他缓存；仅处理既有游戏资源缓存。没有注销 Service Worker、删除网站数据或修改保存契约。

涉及：`src/assets/packed-cache.ts`、`src/app/resource-downloads.ts`、`tools/packed-startup.mjs`、`tools/packed-sites-sw.js`、`tools/update-compressed-game.mjs` 及对应回归。打包工具同时生成固定地址兼容副本，版本描述新增脚本文件名、SHA 和协议号。

## 给 Coze 的操作步骤

1. **沿用原项目与域名。** 先备份当前部署及 `index.html`、`web-release.json`、`sites-sw.js`、`sites-pack-index.js` 四份可变文件。保持现有后台、认证、数据库、全部资源与玩家数据。核对当前资源 release、schema 与上表一致；不一致时先核对基线，不直接覆盖。
2. **核对 ZIP 和文件。** 按 `CHECKSUMS.json` 核对整包，再按包内 `PATCH-MANIFEST.json` 核对9份文件；避免把预览网页保存成 JS 或 gzip。旧资源合包、原清单、两首 BGM、Basis 解码器和线上43份独立 KTX2 必须保留，本包没有重新压缩资源。
3. **先放依赖，最后切入口。** 先合并新哈希启动器、gzip 主程序、CSS、哈希缓存脚本及版本化索引，确认均200且 SHA 一致；再更新 `sites-sw.js`、`sites-pack-index.js` 兼容地址。最后在同一次发布中切换 `index.html` 与 `web-release.json`。沿用 Coze 当前构建／发布流程，不以主仓库 Sites 工程覆盖 Coze 后台。
4. **修正源站和 CDN 缓存。** `/`、`/index.html`、`/web-release.json`、`/runtime-config.json`、`/sites-sw.js`、`/sites-pack-index.js` 使用 `Cache-Control: no-cache` 或 `no-store`。失效以上路径在 CDN 的全部已有缓存变体，包含不同 `Accept-Encoding` 的副本；只改源站响应头不能保证已缓存的一年 immutable 立即消失。哈希资源可用长期 immutable；`.js` 返回 JavaScript 类型，Worker 必须同源、位于静态根目录、无需登录且不能回退为 HTML。`.js.gz` 保持原始 gzip 文件字节，不额外配置自动解压的 Content-Encoding。
5. **实际发布并独立核验。** 公网普通请求和真实 Chrome 请求都核对新入口引用、版本描述、脚本、索引及主程序 SHA；不能仅用一次查询参数请求成功代替普通 URL 检查。记录 Coze 部署号和结果。
6. **用有旧缓存的浏览器验收。** 保留原网站数据，重新打开原网址，确认实际 `navigator.serviceWorker.controller.scriptURL` 结尾为新哈希脚本。设置 → 预下载 → 清理资源缓存应成功；“继续游戏”、已有资源／装备及检查点仍在。另开全新浏览器档案复核首战。原 iPhone 17 Pro 用原网址、原存档与原画质再验一次续局和清理，不要求玩家清全部浏览器数据。

成功协议应返回 `{protocol:1,cacheClear:true,versionedIndexes:true}`。网页与 `/web-release.json` 的 appBuildId 均须为上表目标值，schema 仍为26。Coze 可能注入 HTML，HTML 整文件 hash 可因此不同，但应用 meta、资源清单、脚本引用和所有静态 JS／gzip 字节必须匹配。

## 另一个已确认的部署缺口

11月3日实测 `/api/config` 持续404，使统计启用和发送反馈禁用。这与本次缓存脚本修复分开验收。本包不修改现有后台，也不冒称已经恢复这两个功能。

请 Coze 核对 API 路由是否被静态兜底吞掉、现有后端进程与代理是否接通。仓库现有契约见 `tools/backend/service.mjs`：即使服务关闭，`GET /api/config` 也应返回200及真实关闭配置；启用状态必须来自真实后端配置与可用服务。不要伪造 `enabled:true`、替换数据库或套用另一环境的认证。若当前 Coze 工程没有对应后端，明确报告缺口，另行确定接入方案；缓存修复可以独立发布。

## 回退

恢复备份的部署，或恢复四份可变文件并失效相应 CDN 缓存。新旧全部哈希文件保留；已打开的页面仍可依赖它们。核对回退后的应用标识和入口引用，玩家存档／数据库不做回退或删除。修复版 Worker 支持原有版本化资源索引，无需靠注销 Worker 回退。

## 本地验证与限制

- `npm test`：2969项通过、0失败。随后补入启动器 `active` 尚在 `activating` 的状态监听与1项回归，最终43项相关测试全部通过；不把这次定向复验称为重新跑过完整矩阵。
- `npm run typecheck`、`npm run docs:check` 通过，独立正式 Web 构建与封存的压缩资源来源验证通过。构建的大 chunk 提示仍属既有构建提示。
- 真实 Windows Chrome 的4个隔离小场景通过：旧脚本启动升级、同页清理时升级、更新失败后重试、缓存删除拒绝。模拟存档、两份备份、本地设置标记与无关缓存不变。
- 完整游戏包使用真实 UI 创建首关检查点，再注入线上观察到的旧脚本及旧固定索引，模拟 CDN 继续返回旧固定地址。升级至新哈希脚本、同页旧脚本恢复、更新失败／清理失败及重试通过；清理前后3个保存槽整体 SHA 相同，“继续游戏”恢复第1关并运行超过2秒。1280×720、844×390、390×844下两条文案存在且可读，已查看对应页面与恢复战场。
- 完整游戏最终无未捕获页面异常、无意外 HTTP 失败。测试服务器先前缺少线上已有的独立 KTX2，后补为原 pack 内相同 SHA 的文件；旧索引也不能供当前游戏完整新建，所以先用完整基线创建真实检查点，再注入旧控制脚本。沙箱一次阻止本机网络，取得正常网络权限后同脚本通过；这些是测试环境修正，没有更改游戏资源或规则。

不是线上部署、物理 iPhone／Safari、真实玩家档案或自然完整战役验收。11月3日线上三族首关／续局证据属于旧 appBuildId `34408a35…`，本批没有重复计为新构建的三族验收。

复现：先创建 `dist/cache-worker-fix-20261103`，设置 `SC2_WEB_OUTPUT=dist/cache-worker-fix-20261103/web` 并执行 `npm run build:web`；在本批源码与固定基线下执行 `node tools/package-cache-worker-fix-20261103.mjs`。工具不会覆盖已存在的交付目录。`node tools/verify-cache-worker-upgrade-20261103.mjs` 使用独立本机服务和临时 Chrome，可加 `--fixtures-only` 或 `--game-only`；GPU 检查串行。简要结果保留在 `reports/qa/cache-worker-fix-20261103.json`，可重建构建、截图与详细日志完成后按产物保留规则清理；当前 ZIP、展开的增量目录及校验文件保留供部署。
