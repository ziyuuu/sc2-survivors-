# 四项稳定性缺陷修复与验证

2026-11-02，V06。按用户“把这四个问题都修复，并做好针对性验证，然后推送远端GitHub”的授权实施。[前期独立复核](STABILITY_RECHECK_20261102.md)的四项缺陷均已修复并完成本地验证；已随`ffc2c2f`推送GitHub「体积优化版」并核验，实际远端回执见文末。未部署、未合并main。

## 修改结果

| 编号 | 修复与验证 |
| --- | --- |
| V06-AUDIT-SHADER-LANE-001 | 折射编译使用私有材质注册，补60秒期限、取消和上下文失效检查。失败释放私有状态；晚到编译不再绘制或发布ready。真实准备协调器注入永不完成的编译后，取消可排空并成功重试；不强制清空通道。 |
| V06-AUDIT-PACK-RETRY-001 | 客户端完整性失败通知SW驱逐对应内存/磁盘包；reload绕过缓存并替代旧在途请求，代次检查阻止过期回填。不可变整包先校验hash再使用或入缓存。现有清理按钮覆盖两层资源缓存，玩家存档保持隔离。 |
| V06-AUDIT-PACK-DISK-001 | 可选磁盘初始化、索引、读取和串行写删均有独立1秒期限。拒绝或挂起后本轮禁用磁盘并走网络，已下载的合法结果仍可使用。队列中的超时任务不再锁住后续请求。 |
| V06-AUDIT-PACK-PROVENANCE-001 | 新增原始内容与压缩清单/索引的封存关系，覆盖品质变体和GPU贴图。更新前校验完整原始记录及两份压缩文件hash；同ID素材内容改变、来源缺失或清单/索引变化均在写入前拒绝。 |

未改玩法、数值、UI布局、画质或存档格式；无新增依赖。受影响源文件为 `src/render/scene/screen-refraction.ts`、`battle-renderer.ts`，`src/assets/http-store.ts`、`persistent-cache.ts`、新增`packed-cache.ts`，以及压缩SW、更新和来源封存工具。

## 实际验证

- 新增14项定向回归全部通过：折射3项、包恢复6项、来源核验5项。覆盖超时、取消重试、上下文失效、晚到任务、坏内存/磁盘包、网络坏包拒绝、SW重启、在途替换、磁盘拒绝/挂起、清理失败反馈及原始内容/变体/索引变化。
- 相关组合检查：着色器23项、缓存24项通过，包含上述新测试，不重复累计为唯一项数。
- 完整`npm test`共2909项：首次2903通过，6项因沙箱拒绝本机HTTP连接失败。正常本机权限下复验所属`coze-web`与`p5-backend`两个文件，15项全部通过，覆盖原6项；无未解决测试失败。`npm run typecheck`与`npm run docs:check`通过。最终14项定向复验也通过，包含Windows换行后的来源文件重复封存。
- 真实Windows Chrome、隔离临时浏览器数据与本机服务：健康模式预置坏包，以及open/keys/match/put挂起，共5组各3次请求全部200；每组3次网络请求，资源缓存实际清除，测试用localStorage和独立玩家缓存保留。挂起组约2秒完成整组操作，未等外层45秒失败。
- 当前正式压缩入口菜单、现有设置清缓存按钮、新游戏首战及刷新续局通过；首战5.05秒、恢复后2.02秒，待资源0、缺失原版特效0、页面错误0、失败HTTP请求0。1280×720菜单与战斗截图已目视检查。一次即时缩窗样本不用于手机验收。
- 原始清单3750个独立文件和压缩清单5138个独立载荷已逐一读取、核对字节数与SHA，合法来源关系封存完成，实际更新工具成功生成新前端。

复现：

```powershell
node --import tsx --test test/refraction-preparation-recovery.test.ts test/packed-cache-recovery.test.ts test/compressed-resource-provenance.test.mjs
node tools/verify-stability-browser-20261102.mjs
npm test
npm run typecheck
npm run docs:check
```

旧`inspect-stability-findings-20261102.mts`保留修复前断言，只适用于`fabfb4a`，不能在修复后覆盖旧报告。简要机器记录见[stability-fix-20261102.json](../../reports/qa/stability-fix-20261102.json)。

## 压缩交付与后续更新

基线源码`fabfb4addfb65169c2abc0a9dba57f181fed0ad2`，分支「体积优化版」。本批appBuildId为`a6b6e0d88b466383e804e20dd0ac94141085a32d25afe6d721c38c45e6484488`；资源release保持`50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`，原始资源release保持`c57126842b2eebe90f278e5dfe9c5ad54eaaec683b3e611e697abada0118fdad`。

仓库快照新增压缩程序`sc2-entry.c601e10313646ca2.js.gz`、启动器`index-e188d6ddfd7af9a9.js`和`compressed-resource-provenance.json`，更新HTML、SW及web-release。旧hash文件、原资源、KTX2与音乐保留。

后续只更程序时运行`node tools/update-compressed-game.mjs <packed-public> <original-web>`，必须保留封存文件。既有基线首次封存用`node tools/seal-compressed-provenance.mjs <packed-public> <original-web>`；要求已记录的sourceWebRelease匹配原始资源，并读取验证两侧真实字节。不能改写旧来源标识给新素材背书；内容变化应重建新的压缩资源目录后封存。

本次Web编译成功后因输出父目录缺失，最终rename失败；核对完整staging后移动至本批命名目录，未覆盖共享dist/web。首次浏览器工具错误使用`/game/`挂载，触发SW范围拒绝，已改为部署同款根路径；续局脚本漏点既有“继续”，修正脚本后通过。这两项均未修改产品行为。

未进行原iPhone/Safari、真实GPU挂起、OS死机、线上坏缓存或真实玩家档案验证，也未认定这四项是原iPhone故障原因。V06继续待验证原机事项。当前Coze v7保持原部署，本批Git推送不表示云端更新。

## GitHub推送回执

修复与压缩快照提交[`ffc2c2f`](https://github.com/ziyuuu/sc2-survivors-/commit/ffc2c2fd111b86d67a2c276be6123bbf1d2167cc)已成功推送「体积优化版」。`git ls-remote`返回完整SHA `ffc2c2fd111b86d67a2c276be6123bbf1d2167cc`，GitHub提交接口独立读取同一SHA和本批差异。main仍为`2924d9bb3330f10ad78462b6f96efda163c5eff3`，未合并、未部署。

本批3777份可重建Web文件、截图、日志和临时副本共1,463,470,700字节已按绝对路径/目录链接/跟踪状态检查后清理。当前压缩快照、来源证明、源码、回归和简要报告保留；其他任务改动未提交。
