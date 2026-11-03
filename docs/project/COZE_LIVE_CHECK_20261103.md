# Coze 线上部署与可用性核验 · 2026-11-03

核验入口：[sc-survivors.coze.site](https://sc-survivors.coze.site/)。**主程序已上线最新修复，受测核心流程可用；部署一致性尚未通过，另有统计/反馈服务缺口。** 本次是用户要求的独立检查，没有修改线上配置、部署、提交反馈、启用统计、推送 GitHub 或修改产品代码。

## 已确认问题

### P1 · V06-COZE-SW-001：CDN/旧客户端仍执行旧缓存脚本

1. 本批新建的人族测试档案进入首战并保存后，在第二关暂停页操作“设置 → 下载 → 清理资源缓存”，出现“浏览器未允许清理资源缓存，请稍后重试”。主菜单再试两次也失败，后两次分别约5.15秒、5.08秒。
2. 观察包装保持浏览器 API 原返回值；实际只发出了 `sc2-pack-cache-clear` 消息，没有收到回执，也没有执行 CacheStorage 删除或下载索引清理。玩家检查点时间保持，不能把提示文案当作浏览器拒绝权限的证据。
3. 从实际运行的 Chrome Service Worker 提取脚本：1456字节，SHA256 `777a07c5f18c0c4184f9ded53fd363610d0404e053ed3ddbfc3d9ad98db7a9f9`，没有清缓存/metrics消息协议；资源索引3742项。交付脚本应为13508字节、SHA256 `f74e4014798c71db4f286f7ba0c6272d46eff8283b609aee9d4b472f11111fcc`。
4. 同一公开 URL `/sites-sw.js`：普通 HTTP 请求拿到新版和 `no-cache`；Chrome 常用 `Accept-Encoding: gzip, deflate, br, zstd` 一度命中旧版、`X-Cache: HIT` 及 `public, max-age=31536000, immutable`。仅换 User-Agent 未复现差异；去掉zstd或加查询参数时得到新版。这是响应/缓存变体证据，不是仅本机已有缓存的猜测。
5. **结果有时间和节点差异，不能概括成所有 Chrome 都拿旧版。** 12:22—12:23（北京时间）后续请求及一个从零注册的 Chrome 档案拿到新版，其清理函数存在、版本化索引5136项。但无版本号 `/sites-pack-index.js` 仍返回旧485820字节，SHA256 `7c356e0e406b6597c7831c97524ab9b2ff61e9bd3fb356fa562bcd0f51e5ee97`，并带一年缓存；正确索引782043字节、SHA256 `0bb43ff1011a0ab1462d14581dbeec3ad02e9b8c46f1d84ef5bdf2b08cdb0f95`。此后原测试档案重开并清缓存仍失败。

影响已证实为部分实际客户端没有获得完整缓存修复、现有清理入口不可用。旧脚本亦不含新缓存边界，但本次没有证实它造成原iPhone重载或自然长局崩溃。下一步由部署方统一失效这两个可变URL的CDN缓存变体、恢复可重验证缓存策略，并核验既有客户端能更新到新脚本；不能以让玩家清全部浏览器数据替代修复，尤其不能损失存档。

### P2 · V06-COZE-CONFIG-001：统计与反馈服务未接通

公开 `GET /api/config` 在HTTP及三族浏览器会话中持续返回404。真实设置页显示反馈服务不可用，“发送反馈”及“同意并启用统计”禁用。`TelemetryClient.initialize()`按既有规则降级到 `enabled:false`，所以战斗和本地存档仍正常。

后台现有契约即使关闭服务也应由 `/api/config` 返回200及配置；需核对Coze路由/服务是否按该渠道预期接入。本次没有访问管理员数据或写入数据库，也没有把此问题断定为本轮更新新引入，更没有推断线上数据已丢失。

## 通过的检查

- 最新主程序 `appBuildId: 34408a35562ffdf62b278e8a310ae04d06515af98cee00f2c6ab61006922dbab`；资源release `50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`；run schema26。对应修复提交 `deeb9d8`，GitHub回执 `b18410e`。
- 首页、版本清单、启动器和实际gzip程序匹配交付字节。普通HTTP路径56项文件返回200且SHA一致，含解码器、两首音乐与43份KTX2兜底资源；随后用Chrome请求头独立复验主程序、启动器及版本化索引亦一致。**56项成功不能覆盖上述缓存变体反例。**
- Windows真实Chrome、独立临时档案、简单难度、正常60秒时钟、实际UI操作：人族/虫族/神族均完成首关、关间自动保存、刷新续局、钱包与种族一致恢复、实际进入第二关并运行超过2秒。没有注入战局、保命或快进，没有未捕获页面异常。
- 桌面键盘、暂停/继续、桌面隐藏摇杆；虫族模拟触屏拖动与释放通过。查看了桌面首战/关间、移动竖屏首战及稳定后的移动横竖屏关间截图。旋转后等待布局稳定，正文与主画布尺寸匹配844×390和390×844。
- 所有测试会话 `/api/` 非只读请求为0，未启用玩家统计或发送测试反馈。

三族流程通过不包含清缓存成功，也不表示没有其他bug。原iPhone/Safari、物理触屏/手柄、OS杀页、完整自然战役/后期高负载、管理后台与生产数据均未验收。没有重跑或重新累计上一批2957项本地回归；其同版范围见[GitHub同步记录](AUDIT_FIXES_GITHUB_SYNC_20261103.md)。

## 非阻断观察与检查工具修正

- `V06-COZE-TLS-001`：虫族一次KTX2后台请求出现 `ERR_CERT_COMMON_NAME_INVALID`，未阻断已测流程。随后相同公开URL独立请求200，内容SHA匹配；尚未稳定复现或确定证书/CDN节点原因，列为待验证观察。虫族另有两条既有 `normalMap undefined` 材质警告，未见对应渲染中断，不据此另报已确认玩法缺陷。
- 首次脚本把普通加载层误当失败；其后误把仅菜单可用的 `canResume` 当作局内保存成功标志。这两处均修正了检测判断，未改游戏。人族从原测试检查点继续，保留实际首关/续局来源。默认沙箱一次DNS受限，正常网络权限重试通过，未记为站点故障。
- 一张旋转后立即截图尚未完成重排，不作为稳定布局问题；补充等待后的实际页面及画布尺寸检查通过。

## 复现与记录

机器摘要：[coze-live-check-20261103.json](../../reports/qa/coze-live-check-20261103.json)。任务归属V06，状态待验证，已登记上述两个确定问题及一个待验证网络观察。V05及其他线程任务不代改。

```powershell
node tools/verify-coze-live-20261103.mjs --http
node tools/verify-coze-live-20261103.mjs --browser --race=terran
node tools/verify-coze-live-20261103.mjs --browser --race=zerg --touch
node tools/verify-coze-live-20261103.mjs --browser --race=protoss
node tools/inspect-coze-delivery-20261103.mjs --http
node tools/inspect-coze-delivery-20261103.mjs --browser
```

浏览器/GPU检查串行。`inspect-coze-cache-20261103.mjs profile-terran-<timestamp> [--worker-only]`只接受本批生成的测试档案；`inspect-coze-delivery-20261103.mjs --layout-profile=profile-zerg-<timestamp>`只恢复本批虫族检查点。日期工具绑定本次发布文件名，之后的发布不能用其固定hash断言覆盖本次事实。原始截图、日志、HTTP副本、测试档案按产物保留规则清理，保留上述工具和简要结论。
