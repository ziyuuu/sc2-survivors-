**后续决定（2026-11-04）**：MVP 1.0 暂按完成。下文保留当时实测结果。CDN 待处理，暂不提工单，Coze 后端继续暂缓。

# Coze 前端线上核验 · 2026-11-04

原站已提供 `81893e6` 对应的新版游戏。新会话首战、旧脚本升级、清理资源缓存和检查点续局均通过。CDN 在部分请求下仍返回两份旧兼容文件，前端部署一致性待复验。[原站版本描述](https://sc-survivors.coze.site/web-release.json) · [交付清单](COZE_CACHE_WORKER_PATCH_20261103.json) · [机器记录](../../reports/qa/coze-frontend-20261104.json)

用户于11月4日决定暂缓 Coze 的数据库、统计、反馈和 `/api/config` 要求。看板将 `V06-COZE-CONFIG-001` 标为暂缓，后端不计入本次前端验收。

## 实际交付

| 核验项 | 结果 |
| --- | --- |
| 程序版本 | 首页应用标识与版本描述均为 `86c3ca45f17fe278119e0099e023330db4b0140c4c4b8ef7719a35b515889690`。资源 release 为 `50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`，存档 schema 为26。 |
| 9份静态文件 | 普通请求的8份非 HTML 文件全部200、SHA256和长度与固定提交一致。首页与 `/index.html` 的标识、资源清单、模块和样式引用一致。标准化 HTML 标记后，原86个标记全部保留，另有3段内联脚本。gzip程序返回原始gzip字节。 |
| 保留资源 | 清单中365份依赖及线上43份独立 KTX2 全部200并逐文件匹配 SHA，合计488,412,718字节。也核对了两个已知旧 Coze 版本的启动器、压缩程序和共用样式，去重5份均匹配。 |
| 稳定地址与哈希地址 | 根页、显式首页、版本描述及运行配置在3种请求条件下均为 `no-cache`。带哈希的 Worker、索引和启动器正确，哈希文件可长期缓存。两份固定兼容地址有以下反例。 |

## CDN 仍需处理的两个路径

北京时间11:01开始的首轮检查、11:13复核及11:18:57复核均重现。对原域名的普通 URL 显式发送 `Accept-Encoding: gzip, deflate, br, zstd`，两次兼容请求均命中旧 CDN 副本，返回 HTTP 200 和 `public, max-age=31536000, immutable`。

| 路径 | 应返回 | 旧 CDN 响应 |
| --- | --- | --- |
| `/sites-sw.js` | 13,637字节，SHA `bd646d55…` | 1,456字节，SHA `777a07c5…` |
| `/sites-pack-index.js` | 782,043字节，SHA `0bb43ff1…` | 485,820字节，SHA `7c356e0e…` |

普通默认请求、`identity`、带新查询参数的对照，以及本机真实 Chrome 的这两个请求均能取得正确字节及 `no-cache`。请求条件和命中的节点会影响结果。请 Coze 对两个固定路径执行所有内容编码变体的缓存失效，再以相同请求头、不加查询参数复核字节及缓存头。该检查归 `V06-COZE-SW-001`。

### 收到 Coze 回执后的两轮复查

Coze 报告其出口两轮均通过，另测五组编码条件也通过。Coze 表示当前权限没有自服务 purge 接口，正式全节点失效仍待平台运维。原复现环境随后以同一工具、原 URL 和完整 `Accept-Encoding: gzip, deflate, br, zstd` 请求头连续复查两轮（北京时间，以下为各轮结束时间）。

| 轮次 | Worker / 索引解压后大小 | HTTP 与缓存结果 |
| --- | --- | --- |
| 12:18:57 | 1,456 / 485,820 字节 | 均200，SHA 为已知旧值，`HIT TCP_MEM_HIT`，`Age: 622387`，`public, max-age=31536000, immutable` |
| 12:19:03 | 13,637 / 782,043 字节 | 均200，完整 SHA 匹配，`MISS TCP_MISS`，无 Age，`no-cache` |

两轮均为 gzip 传输，`Vary: Accept-Encoding`。同批默认请求及 `identity` 对照均取得新版。Coze 的抽测结果与本次单轮旧命中可同时成立，原复现环境的连续两轮验收未通过。后续由平台运维对两条路径处理各级节点和全部编码变体，在取得工单或失效任务回执后按原条件复查。完整 SHA 及响应头保存在机器记录的 `publicHttp.cdn.postCozeReceipt`。

## 游戏内实测

- 真实 Windows Chrome 156，全新隔离档案、正常游戏时钟。启动时实际控制者为 `sites-sw.bd646d557a5dc16c1b8b.js`，消息通道返回协议1、清理和版本化索引能力。人族简单难度完成60秒首关并正常保存。在同档案注册公网固定地址、关闭并重开浏览器后，新入口接管成功。现有清理按钮将237个包缓存、2,033个文件缓存及对应下载索引清至零。当前档和已有备份的 SHA 保持，空槽仍空。刷新后继续游戏恢复相同关间、种族和矿气，并实际进入第二关。此档案在固定地址取得的脚本当时已经支持协议1。
- 另一个隔离档案预置11月3日实际捕获的旧脚本、3,742项旧索引和三个有效测试保存槽。其中有两件装备，一件已装备、一件在背包。设置完成后关闭浏览器，重新启动时使用公网正常响应。加载游戏前，实际旧控制者对新协议无响应。加载新版后，实际控制者切换到目标哈希脚本并通过握手。清理后当前档和两份备份逐槽 SHA 保持，经“继续游戏”恢复420矿、113气，物品、位置及装备槽的整体哈希一致。
- 第二个档案的严格“前端 HTTP 错误数为零”断言记录到一次 WebP 502，同一路径在清理阶段出现 `ERR_ABORTED`。该文件随后经线上 Worker 用普通及版本化地址复取，两次均200、8,698字节、SHA `f98213bf…` 正确。此轮升级、清理及实际恢复断言通过。已列 `V06-COZE-CLEAR-ASSET-001` 为非阻断观察，首次502的直接原因尚未确定。

已查看首关战场、清理成功状态和第二关战场画面。原 iPhone 17 Pro 的 Safari 仍待实机复验。平台部署号、备份和回退执行情况需以 Coze 运维回执核对。本批做公网检查和本地记录。[修复提交](https://github.com/ziyuuu/sc2-survivors-/commit/81893e63965810ad721d7d7a9a2109cfd5af1909)的[远端 CI](https://github.com/ziyuuu/sc2-survivors-/actions/runs/41589569498)已完成，测试、类型、数据及构建步骤通过。

## 复验

```powershell
node tools/verify-coze-frontend-http-20261104.mjs --aliases-only
node tools/verify-coze-frontend-http-20261104.mjs --previous-entries
node tools/verify-coze-frontend-http-20261104.mjs
node --import tsx tools/verify-coze-frontend-browser-20261104.mjs
node --import tsx tools/verify-coze-frontend-browser-20261104.mjs --historical
```

CDN 处理后先跑 `--aliases-only` 即可定向复核。完整 HTTP 模式会逐文件读取保留依赖。浏览器模式串行运行，`--recheck-asset` 在本次历史档案仍存在时定向复取其异常贴图。复验工具、简要结果和范围决定保留，本批临时浏览器档案、截图与详细日志按项目规则清理。
