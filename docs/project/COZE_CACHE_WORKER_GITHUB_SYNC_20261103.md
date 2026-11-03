# 缓存脚本修复 GitHub 同步 · 2026-11-03

用户要求先将[本批修复](COZE_CACHE_WORKER_FIX_20261103.md)推送 GitHub「体积优化版」，再提供包含缓存更新和 `/api/config` 核查要求的完整 Coze 提示词。本次只提交、推送源码与同版交付，未操作 Coze、Sites 或阿里云部署，未合并 main。

## 固定交付

仓库 `ziyuuu/sc2-survivors-`，分支 `体积优化版`，起点 `b18410e58642d61b94390f2a20d6cc73e8f3428e`。源码、验证工具、记录与同版前端已随[81893e6](https://github.com/ziyuuu/sc2-survivors-/commit/81893e63965810ad721d7d7a9a2109cfd5af1909)推送，远端分支查询与GitHub提交接口均核验一致。main仍为`2924d9bb3330f10ad78462b6f96efda163c5eff3`。

- appBuildId：`86c3ca45f17fe278119e0099e023330db4b0140c4c4b8ef7719a35b515889690`。
- 资源release：`50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`，schema26保持。
- 正式前端：`sites/size-optimized-site/public/` 中[发布清单](COZE_CACHE_WORKER_PATCH_20261103.json)列出的9份文件，来自已完成Chrome验证的同一增量包。
- ZIP保留原字节，SHA256 `05a523646037fa87ec0861a62d7c69e28a07de5498282d2758890d41f144fccb`，9,048,023字节。包内README记录最初准备时状态；最新Git交付事实以本文为准。
- 新哈希Worker在`.gitattributes`增加`-text`，避免Windows换行转换破坏内容哈希；固定地址和哈希地址必须字节相同。

## 验证依据

五份产品/打包源码SHA与上一轮报告一致，9份压缩前端逐文件SHA与已验证ZIP一致。本次未更改产品行为，复用上一轮2969项完整回归、最终43项相关检查、类型/数据、正式Web/压缩来源及Chrome真实检查点恢复结果，不重新累计测试。

两份日期复现/交付工具改为读取固定的`b18410e`旧版本描述和入口，防止当前Git快照更新后旧基线漂移。资源仍从现有未改变的合包读取。小场景复验及暂存Git对象字节检查的实际结果写入[机器回执](../../reports/qa/cache-worker-github-sync-20261103.json)。

共享看板只提交V06相关状态与本批更新，宣传片、1.1规划、演示片和其他未提交工作保留。未提交ZIP、大量重复资源、测试缓存或真实玩家数据。Coze必须按固定提交提取发布清单中的文件，再合并到原工程，不能直接替换整个Coze工程。

## Coze核查边界

源站与CDN对可变路径使用可重验证缓存策略，并清除全部旧缓存变体；旧客户端实际控制脚本、协议、清缓存与续局均需发布后验证。`/api/config`持续404是另一个已确认的现有部署缺口，须检查真实后端进程、路由优先级和代理；关闭服务也应返回真实关闭配置，不能伪造启用状态。若缺少后端/数据库依赖，明确报告并独立记录，不能以缓存修复发布成功冒称反馈和统计已恢复。

原iPhone与线上CDN仍待实际部署后的验收。已有后台、认证、数据库、域名和资源保持；原手机数据不能靠清网站数据重置。

## 推送核验

36份文件限定提交完成；9份发布文件的已提交Git对象SHA与本地验证包全部一致。固定基线后的4项Chrome小场景重新通过，测试存档及无关缓存保持。GitHub [CI 41589569498](https://github.com/ziyuuu/sc2-survivors-/actions/runs/41589569498)已触发，head为本次提交；查询时进行中，未冒称通过。

## 可直接发送给Coze的提示词

```text
请在现有 Coze 项目中完成这次缓存修复部署，并核查 /api/config。继续使用 https://sc-survivors.coze.site，保持原应用、规格、认证、数据库、域名、资源和玩家存档。

交付来源：GitHub ziyuuu/sc2-survivors-，分支“体积优化版”，固定代码提交 81893e63965810ad721d7d7a9a2109cfd5af1909。请从该提交提取文件，不使用会继续变化的分支HEAD代替固定版本。部署清单为 docs/project/COZE_CACHE_WORKER_PATCH_20261103.json，文件来源在 sites/size-optimized-site/public/。只将清单中的9份静态文件增量合入Coze实际静态根目录，不用整套Sites工程替换Coze工程，不重新压缩资源或重建一份未经核验的前端。

一、预检与备份
核对线上资源release为 50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a，runSchema为26。此前核验的应用为34408a35…；如当前资源/存档基线不符或已有其他更新，先核对差异。备份当前部署及 index.html、web-release.json、sites-sw.js、sites-pack-index.js。保留全部旧哈希文件、资源合包、原资源清单、两首BGM、Basis解码器及线上43份独立KTX2，保留数据库与玩家数据。

二、文件与发布顺序
先按清单逐项核对长度和SHA256，使用Git原始文件字节，不把GitHub文件预览页当作文件。
先上传以下5份哈希文件：
- assets/index-52cb797e550cfae8.js
- assets/sc2-entry.6c2870662397867f.js.gz
- assets/index-BBLppp3h.css
- sites-sw.bd646d557a5dc16c1b8b.js
- sites-pack-index.0bb43ff1011a0ab1462d.js
再更新 sites-sw.js、sites-pack-index.js 两份兼容副本；最后在同一次发布中切换 index.html 和 web-release.json。全部9份文件须来自上述固定提交。发布仍使用原Coze工程及现有流程。

三、源站与CDN缓存
对 /、/index.html、/web-release.json、/runtime-config.json、/sites-sw.js、/sites-pack-index.js 使用 Cache-Control: no-cache 或 no-store；清除这些路径在CDN中的全部旧缓存变体，包括不同Accept-Encoding产生的副本。只改源站响应头或添加一次性查询参数不算完成旧缓存失效。哈希文件可长期immutable；保留新旧哈希文件。
Service Worker必须同源、位于静态根目录、返回正确JavaScript类型、无需登录，不能被SPA兜底改成HTML。两份新Worker的字节必须相同，SHA256均为 bd646d557a5dc16c1b8b75f494c0d14d4d829873c734951153117bdc0ae2eeb8。两份资源索引SHA256均为 0bb43ff1011a0ab1462d14581dbeec3ad02e9b8c46f1d84ef5bdf2b08cdb0f95。.js.gz保持原始gzip文件字节，不额外设置自动解压的Content-Encoding。
分别以普通HTTP请求、Chrome默认请求头（包含gzip/deflate/br/zstd）和真实浏览器会话核对普通URL的状态、缓存头与内容。平台若无法清除某些CDN缓存，报告具体限制，不能直接宣布旧客户端已更新。

四、实际升级与存档验收
网页meta与web-release.json的appBuildId均应为 86c3ca45f17fe278119e0099e023330db4b0140c4c4b8ef7719a35b515889690；资源release保持上值，schema保持26。核对新启动器、gzip主程序、Worker、索引均200并匹配清单SHA。Coze注入HTML时可单独核对应用meta和全部应用引用，不能忽略JS/gzip的字节差异。
至少检查一个保留旧缓存的测试浏览器会话和一个全新会话。旧会话不删除网站数据，重新打开原网址后，实际 navigator.serviceWorker.controller.scriptURL 应指向 sites-sw.bd646d557a5dc16c1b8b.js；通过MessageChannel向该控制者发送sc2-pack-capabilities，回复应包含 protocol:1、cacheClear:true、versionedIndexes:true，不能只凭register或ready成功判定升级完成。
通过现有“设置→预下载→清理资源缓存”操作确认成功，再检查已有存档、装备、资源和“继续游戏”可用；全新会话检查正常入场。程序已区分“资源服务更新失败，请刷新后重试。”和“资源缓存清理失败，请稍后重试。”，不要改回统一权限错误。不得靠清全部浏览器数据、注销所有Worker或删除存档代替修复。原iPhone17 Pro需原网址、原存档和原画质复验；无法实测则明确待验证。

五、独立核查 /api/config
此前公开 GET /api/config 持续404，导致反馈发送和统计启用不可用。请检查Coze实际启动的后端、端口与代理、/api路由优先级，以及静态/SPA兜底是否吞掉API；对现有接入的路由或代理错误作必要修正。
以同一固定提交的 tools/backend/service.mjs 与 tools/backend/contracts.mjs 为接口契约。GET /api/config 应同源、无需登录，返回200、application/json和Cache-Control: no-store，包含真实enabled、version、operator、contact、backupDays、retention。服务关闭时也应返回真实关闭配置，不能返回404、HTML或跳转登录。
enabled:true必须对应真实配置及可用后端，不得硬编码假响应让按钮亮起；enabled:false只说明服务关闭，不能称反馈/统计已恢复。核查现有后端依赖是否就绪，不输出密钥或数据库连接凭据，不替换数据库、认证或隐私配置，不自动启用玩家统计或向生产环境提交测试反馈。若项目缺少对应后端或必须新增数据库/服务，请列明缺口与所需决定；前端缓存修复可独立完成发布，后台项保持未完成。

六、失败回退与交付回执
若入口或升级验收失败，恢复备份部署或四份可变文件并处理相应CDN缓存；保留新旧哈希资源和全部玩家数据。
完成后请返回：实际Coze部署号/时间/状态、固定提交SHA、appBuildId/资源release/schema、9份文件校验结果、缓存策略及失效结果、新旧浏览器实际控制Worker与清缓存/续局结果、/api/config的HTTP与真实服务状态、原iPhone及其他未完成项。将“前端部署成功”“缓存升级验收通过”“后台服务恢复”分别报告；不能仅凭构建成功、页面能打开或配置返回200就宣布全部完成。
```
