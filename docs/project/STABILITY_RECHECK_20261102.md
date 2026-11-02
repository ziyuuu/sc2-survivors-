# 四项稳定性审查独立复核

后续四项修复及针对性验证见[修复记录](STABILITY_FIX_20261102.md)。下文保留修复前调查事实和当时状态。

2026-11-02，V06。用户要求核查云Codex「检查星际幸存者代码并找出死锁Bug」提供的三项P1风险与一项P2一致性缺陷。本轮仅调查，四项均在同一基线独立复现，尚未修复。

源码基线为`fabfb4addfb65169c2abc0a9dba57f181fed0ad2`，分支「体积优化版」。涉及的8个正式源文件与HEAD无差异；发布SW与`tools/packed-sites-sw.js`除首行版本化索引路径及换行外一致。云端聊天读取先超时，后返回单轮记录超过读取上限，未取得原云端报告和复现脚本；以下结论来自本地源码和本轮自建复现，不能表述为运行了原云端脚本。

## 核验结果

| 编号与优先级 | 结论与实际证据 | 条件与影响 |
| --- | --- | --- |
| `V06-AUDIT-SHADER-LANE-001`，P1 | [screen-refraction.ts](../../src/render/scene/screen-refraction.ts)第31–32行直接等待`compileAsync`。注入不完成的Promise后，后台准备保持`busy=true`；取消首次进入及再次超时后`held=2`。通过真实`AssetReadinessCoordinator`执行取消/重试，同样旧准备不结束、重试失败。 | 等待不返回时，当前页面的资源通道不能排空。普通`compilePresentation`已有超时，折射特效路径遗漏了同类保护。取消能清除UI状态，但不能终止底层工作。若最终完成，通道仍能释放，故不是所有编译等待都会永久卡住。 |
| `V06-AUDIT-PACK-RETRY-001`，P1 | [sites-sw.js](../../sites/size-optimized-site/public/sites-sw.js)第22–27、41行先查内存/磁盘包，不传递客户端`Request.cache`。[HttpAssetStore](../../src/assets/http-store.ts)真实校验失败后的`default→reload`连续三轮均失败，模拟SW重启后再试仍失败，网络请求总数为0。 | 坏字节已在包缓存时，客户端正确拒绝资源，但无法取得新字节。真实`ResourceCache.clear()`只删除`sc2-resource-bytes-v1`，没有删除`sc2-immutable-packs-v1`及活跃SW内存。额外验证冷缓存的错误200响应会先存入包缓存，随后才被客户端拒绝。未证明当前线上包已损坏。 |
| `V06-AUDIT-PACK-DISK-001`，P1 | 同一SW第8–9、27行的磁盘初始化/读写缺少独立期限及降级。`open`、`keys`或`match`挂起时，连续两次请求均返回502，实际网络下载为0；`put`挂起时已下载两次仍两次502。 | 外层45秒超时会释放网络并发槽，**并非每个请求无限挂住**；但后续重试仍依赖同一个未完成初始化/磁盘操作，无法绕过可选缓存。立即拒绝的`open()`有catch且能正常下载，不能笼统说所有缓存异常都会阻断。`match`立即拒绝则仍未降级。 |
| `V06-AUDIT-PACK-PROVENANCE-001`，P2 | [update-compressed-game.mjs](../../tools/update-compressed-game.mjs)第13行只比较ID集合，第19–20行无条件将新模型hash替换为旧压缩hash。真实脚本在隔离目录处理相同ID、内容已变的模型和贴图时退出0，输出新程序、旧资源，代码里的新模型hash被替换；增加ID的负对照被正确拒绝。 | 原资源与压缩衍生资源hash不同本身正常；缺的是可信的“原内容hash→压缩内容hash”来源关系核验。脚本无法区分合法压缩差异与真实素材更新。本次未证明已部署成品存在错配。 |

## 验证方法与边界

复现入口：[inspect-stability-findings-20261102.mts](../../tools/inspect-stability-findings-20261102.mts)；简要报告：[stability-recheck-20261102.json](../../reports/qa/stability-recheck-20261102.json)。

```powershell
node --import tsx tools/inspect-stability-findings-20261102.mts
node --import tsx --test test/presentation-warmup.test.ts test/entry-readiness.test.ts test/resource-cache-update.test.ts test/http-assets.test.ts test/startup-auto-retry.test.ts
npm run docs:check
```

四项缺陷断言均成立；相关5个既有测试文件共24项通过，说明已有通过证据未覆盖这些组合边界，不能据此排除本轮发现。`npm run docs:check`通过。没有改动游戏规则/数据，不重复完整游戏回归、构建或重型浏览器/GPU矩阵。

复现使用真实项目类、真实SW脚本在Node VM中执行、模拟Cache API，以及真实更新脚本的隔离子进程；SW的45秒计时仅在测试宿主中缩短到25毫秒，入口等待同样缩短用于验证状态。渲染器是替身，没有启动真实GPU。晚到编译在“上下文已丢失”的替身状态下仍尝试render一次；真实协调器没有发布过期ready。此项说明局部缺失保护，不代表实际GPU驱动行为已复现。

这些是特定故障条件下的恢复缺陷，不是此前iPhone刷新/终止的归因结论，也不是操作系统死机证据。未做原手机、真实GPU挂起、线上缓存损坏或线上包错配调查。原V06实机事项继续开放。

## 修复方向与交接

1. 折射准备补有限等待、取消/上下文代次检查及晚到工作隔离。不能只强制把通道标空，让旧渲染工作与重试争用同一状态；只有安全作废/排空后才释放相关资源。
2. 客户端完整性失败应通知SW驱逐对应内存/磁盘包并执行网络重取；现有清理操作要覆盖两层资源缓存，仍保持玩家存档隔离。需要处理同包在途请求，防止旧坏数据重新回填。
3. 包磁盘缓存独立限时，读写失败或超时后本次请求直接走网络/返回已下载数据；磁盘队列不能继续阻塞必需启动。立即拒绝与永不完成两类均需覆盖。
4. 更新工具核对每个资源及变体的原始来源hash与压缩映射。来源发生变化或缺少可信映射时拒绝“只更程序”，再由明确的资源重建流程更新。

本轮只新增复现代码、报告及看板记录，未修改正式源码、UI、玩家存档或交付成品，未提交、推送、部署或公开发布。建议先处理前三项启动/恢复缺陷，并在下一次压缩更新前完成第四项防护；具体修复留待后续指令。V05与PROMO-01原有两项进行中保持，本次V06只读核验在待验证任务内登记。

隔离更新夹具已在脚本结束时核对绝对路径后删除；长期仅保留源码、简要结论和8个输入文件hash。
