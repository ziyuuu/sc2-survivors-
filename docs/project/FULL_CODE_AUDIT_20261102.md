# 体积优化版全面代码审查

同日后续：[运行过程补充审查](RUNTIME_CODE_AUDIT_20261102.md)新增6项P1阻断及1项P2贴图状态问题，并扩展本文SAVE-NATIVE范围。下文保留首轮8项产品缺陷与1项CI缺口的历史计数；连续运行和浏览器覆盖以补充报告为准。

2026-11-02。按用户要求检查不能运行、中途卡死、逻辑冲突及工程问题；由主代理和三个子代理分工，主代理独立运行全部新增复现工具并核对代码。**确认 8 项产品缺陷、1 项 CI 覆盖缺口，均未修复。** 其中 4 项是合法游戏状态的业务冲突，4 项是故障注入确认的恢复缺口。没有把故障注入等同于真实手机事故，也没有把现有测试通过视为无 bug 证明。

基线为「体积优化版」`8d680aca1b3150b3faa0c9c170458d084c9a1a1e`，包含 `ffc2c2f` 的四项稳定性修复。审查开始和结束时 `src`、`test`、根 package/lock、Vite 配置均无工作区差异。本地当前压缩快照 appBuildId 为 `a6b6e0d88b466383e804e20dd0ac94141085a32d25afe6d721c38c45e6484488`，resource release 为 `50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`。检查对象是当前分支整体，不将所有问题归因于体积优化提交。

| 优先级 | 固定编号 | 问题与玩家后果 | 主要位置 |
| --- | --- | --- | --- |
| P1 | V06-FULL-SAVE-NATIVE-001 | 舰装增强后的虫族精英技能被存档校验拒绝，关间保存、继续失败 | [run-fields.ts:130](../../src/simulation/persistence/run-fields.ts#L130) |
| P1 | V06-FULL-SAVE-HP-CAP-001 | 关间卸生命装备后，合法残留屏障超过新校验上限，保存、继续失败 | [run-fields.ts:94](../../src/simulation/persistence/run-fields.ts#L94) |
| P1 | V06-FULL-INDEX-HANG-001 | 版本索引请求挂起后，网络恢复、重试和清缓存仍等待旧 Promise | [packed-sites-sw.js:61](../../tools/packed-sites-sw.js#L61) |
| P1 | V06-FULL-HTTP-CACHE-001 | 浏览器 HTTP 缓存含坏包时，自动重试持续命中同一坏响应 | [http-store.ts:70](../../src/assets/http-store.ts#L70) |
| P1 | V06-FULL-KTX-WORKER-001 | GPU 贴图解码 worker 出错后不结束，普通贴图回退与准备通道被阻塞 | [gpu-textures.ts:27](../../src/render/loaders/gpu-textures.ts#L27) |
| P1 | V06-FULL-AUDIO-HANG-001 | 音频解码挂起时取消不能排空，下一次准备持续超时 | [audio.ts:32](../../src/render/effects/audio.ts#L32) |
| P2 | V06-FULL-FAMILY-LIFE-001 | 替换兵种遗漏舰装生命周期，退役单位重新复活或时光回溯失效 | [expedition-production.ts:138](../../src/simulation/expedition-production.ts#L138) |
| P2 | V06-FULL-WIPE-001 | 空装备账户也让纯辅助单位阻止团灭，能错误进入关间结算 | [lifecycle.ts:54](../../src/simulation/starship/lifecycle.ts#L54) |
| P2 | V06-FULL-CI-001 | 当前迭代分支直接 push 不触发常规测试和构建工作流 | [tests.yml:4](../../.github/workflows/tests.yml#L4) |

P1 表示应优先处理的运行/继续流程阻断；P2 表示玩法状态错误或工程防线缺口。本轮未发现需要 P0 定级的必现全局启动故障，未复现浏览器进程退出、OS 杀页或真实 GPU 崩溃。

**保存与恢复：两项正常组合冲突。**

`SAVE-NATIVE`：运行时在 `zerg-elite-runtime.ts:153,158` 生成胆汁和输血时乘 `equipmentNativeFactor`，存档校验却只计算等级、技能特例和天赋。破城酸星/输血主母穿对应四件橙色精英套装后，合法倍率为 2，实测胆汁载荷 23040、输血载荷 1152，均被拒绝。实际调用 `endStage()` 后待结算窗口仍保留；关间时钟冻结，等待不会使窗口消失。真实 `RunSession → SaveRepository → readArchive` 路径失败，`saveBeforeAdvance()` 返回 false，`interfacePaused` 为 true。

`SAVE-HP-CAP`：血羽迁徙正常蓄力攻击生成屏障后进入关间，卸下紫色生命散件。生命上限由 2138.05368 降至 1101.24，屏障仍为 1710.442944，校验却只允许新生命上限的 80%（880.992）。换装刷新属性没有同步屏障的生成基准，保存因此被拒绝。该处 stored/redirectSpent 也依赖当前 maxHp，但本轮仅复现 barrier，不扩大声称。

三组反例均确认旧主档保持不变、关间重试无法解决、当前导出字符串也不能被同版本重新读取。后者属于同一状态契约问题，并非额外计数。应统一运行时与保存校验的冻结载荷/上限规则；不能直接删除校验，或为保存擅自削弱技能。复现使用合成账户、合法装备和真实技能/关间/保存方法，没有读取玩家存档。

**启动与资源：两项缓存恢复缺口。**

`INDEX-HANG`：SW 的 `indexFor()` 缓存 fetch/正文读取 Promise，没有期限或取消，只在 reject 后删除；`clearPacks()` 不清这个索引表。页面资源请求超时不会结束它。注入首次索引不完成、随后网络恢复后，初次、reload、清缓存后的 reload 三次请求都超时，只发生一次索引网络请求，SW 没有创建任何索引期限。相同健康网络下新 worker 返回 200。需要有界请求、可替换的在途索引与代次保护，不能仅缩短页面提示时间。

`HTTP-CACHE`：SW 对不可变整包做 SHA 校验，发现错误会返回 502（`packed-sites-sw.js:87–88`）；客户端在 `response.ok` 检查立即抛错，跳过后面的 invalidate/reload。下一轮再次从 default 开始，SW 再用 force-cache。注入浏览器 HTTP 缓存有错误的 200 正文、源站已正确后，四次自动尝试和清资源缓存后的第五次均失败；显式 reload 才返回 200。资源 CacheStorage 与浏览器 HTTP 缓存是不同层。应在完整性失败后有界绕过 HTTP 缓存，并保留完整性与晚到请求保护。没有发现当前实际发布资源损坏。

两项均在当前真实 SW 与 HttpAssetStore 上注入网络/缓存故障，模板与当前压缩快照 SW 一致。11 月 2 日此前修复的是整包内存/磁盘缓存恢复，本项涉及版本索引和额外的 HTTP 缓存层，不重复列旧问题。

**贴图与音频：两项异步工作无法退出。**

`KTX-WORKER`：`gpuTexture()` 无期限地等待 `KTX2Loader.parse()` 回调。当前锁定 Three 的 WorkerPool 只监听 message，没有 error/messageerror 失败通道；worker 运行错误时 parse Promise 不结束，外层 catch 无法进入普通贴图回退，active 保持 1，`releaseGpuDecoder()` 也因 active 拒绝释放。使用当前已校验的真实 KTX2 载荷及真实 KTX2Loader/WorkerPool，替身 Worker 发出运行错误：模拟经过 120001ms 后回退次数仍为 0，后台任务 busy，入口 held=1，重试无法排空。只有测试额外发送协议拒绝消息才解除。应为解码器初始化/转码设置失败与期限，回收失败 worker，取消或隔离晚到结果；不能直接清锁并让旧任务写入新场景。

`AUDIO-HANG`：`ensureDecoded()` 把无期限的 fetch/body/decodeAudioData 工作放入单独音频通道和 decodedJobs。取消只在 `prepareBanks()` 的条目间检查，不能终止正在等待的解码。使用真实 AudioEffects、AssetReadinessCoordinator、BackgroundPreparation，注入首个 decodeAudioData 不返回，取消并重试，模拟 120001ms 后新入口报“上一项资源准备等待超时”，首入口仍未结束，held=2、音频 active=1。测试让旧解码完成后同入口才成功重试。应使该异步工作有界并识别取消/代次，保留已验证音频复用。

这两项是受控故障下已确认的恢复缺陷，没有测定真实设备触发概率，也未证实与原 iPhone 自动刷新相关；它们通常表现为持续加载/无法重试，不等于已经观察到浏览器崩溃。

**战斗与生命周期：两项组合逻辑冲突。**

`FAMILY-LIFE`：`retireFamily()` 清除了实体、原生复生席位、订单与兵种槽，却没有清理 `starship.life.pending/roster/snapshot`。五种真实单位满槽时，通过正式 preview/commit 替换接口，用维京替换正在相位复生的枪兵，30 秒后枪兵仍返回，实际存在六种部队而槽中只有五种；该状态捕获/恢复能成功，不声称存档损坏。带时光回溯时替换活枪兵，旧尸体留在名册，版本升到 6、快照停在 5，首次全灭时回溯失效且未消费；无替换对照能够回溯。现有 HUD 允许该替换，直接补给替换也调用同一 helper。应按被退役普通编制清理关联恢复/投影及快照，不影响独立舰装成员。

`WIPE`：World 先用 `hasCombatPotential` 排除纯辅助，但 `equipmentSurvivesWipe()` 又对名册中的任意活单位返回 true。正式 startGame 总是提供装备账户，故不是仅测试开关的组合。空账户、零效果、零待复生时，枪兵死亡，仅剩医疗运输机或科学球，`World.step()` 仍为 battle，关时到达后为 reward；无装备账户对照均立即 lost。第 18 关另有直接战斗资格判定，本轮不声称终关也能这样通过。应统一存活战力和合法复生判定，保留真正战斗单位的复生等待。

**工程覆盖与结构问题。**

常规 CI 的 push 分支仅为 main、codex/**、v3/**，当前「体积优化版」不在范围内；另一资源审查工作流只监听旧 v2/sc2-assets-ui。PR 和 workflow_dispatch 仍能触发，本轮未查询线上运行历史。建议把当前分支纳入 push 校验或固定受保护 PR 流程。

发现集中在三种边界：运行时与保存校验各自重算同一规则；兵种退役与舰装恢复各自维护成员；页面、SW、HTTP 缓存及解码器各自处理失败，缺少统一的恢复结果。适合按边界补契约和回归，不需要为审查整体搬目录或引入通用框架。

已有工具限制也保留：`build-web.mjs` 不自动创建 SC2_WEB_OUTPUT 多级父目录，11 月 2 日修复记录已有实际失败证据，本轮未重复构建正式资源包来重报；此次隔离 Vite 构建通过，但仍有大于 500kB chunk 的既有警告，不把该警告当成崩溃或新增调优授权。

**实际验证与覆盖。**

| 验证 | 本轮结果 |
| --- | --- |
| `npm test` | 2909 项，首次 2903 通过、6 项本机 HTTP 连接被沙箱 EACCES 拒绝；正常本机权限重跑 coze-web/p5-backend 两文件共 15 项全部通过，覆盖原 6 项。无未解决的既有回归失败，不相加为 2924 项 |
| `npm run typecheck` / `npm run docs:check` | 均通过 |
| 隔离 Vite production build | 547 模块编译成功，12.75 秒；没有覆盖 dist/web 或 Current。属于源码构建检查，不是新交付包或部署验收 |
| 当前压缩快照 | 359 个包、5138 个唯一载荷，824778460 解码字节；范围、长度、MIME、SHA 及启动器/压缩 JS/manifest/index/来源封存一致 |
| 4 份新增调查脚本 | 2 组资源恢复、3 组保存、2 组解码恢复、7 组战斗/对照场景全部达到缺陷断言；这是反例确认，不代表产品行为通过 |
| 专项代理补充检查 | 21 项资源相关、24 项战斗相关既有回归通过；站点资源服务断言通过。与全量回归重叠，不累加为唯一项数 |

代码覆盖：启动/菜单与资源准备、压缩 SW/HTTP/缓存/来源封存/更新构建；渲染准备/取消/上下文失效/模型释放/贴图和音频；账户/两备份/CAS/导入导出/新局替换/装备事务；固定步/死亡/生产/收据/兵种槽/特殊关返回/奖励/商店/无尽及相关生命周期。主要审查当前产品路径，没有逐行穷尽所有历史工具或第三方代码。

未覆盖真实 iPhone/Safari、OS 杀页、自然长局、真实 IndexedDB 故障、线上服务和真实玩家档案；未做重型浏览器/GPU矩阵或无界自动游玩。存档 IndexedDB open/read/commit 没有显式期限是待验证静态风险，本轮没有确定触发，不计入上述缺陷。没有新确认的重复扣费、复制装备、主档覆盖损坏；也不宣称这些类别已被穷尽。

复现入口（均针对本基线，断言当前缺陷；修复后改成正确行为回归，不能恢复旧行为来使调查脚本通过）：

```powershell
node --import tsx tools/inspect-full-audit-assets-20261102.mts --verify-snapshot
node --import tsx tools/inspect-full-audit-persistence-20261102.mts
node --import tsx --test tools/inspect-full-audit-runtime-20261102.mts
node --import tsx tools/inspect-full-audit-simulation-20261102.mts
```

**交付和下一步。** 本轮只新增调查工具、简要报告和当前看板记录，未修改产品源码/UI/数值/存档格式，未提交、推送、合并或部署。已有其他工作区改动保持。机器结论见 [full-code-audit-20261102.json](../../reports/qa/full-code-audit-20261102.json)，V06 仍待验证，新增发现登记为待办。

建议先修两项正常游戏路径的存档阻断，再修四项异步/缓存恢复缺口和两项舰装生命周期冲突，最后补当前分支 CI。每批应同时验证反例、正常路径、取消/恢复与旧档保护；保存载荷的具体规则保持已有合同。原 iPhone、旧客户端升级及实际部署验收仍分别开放。

本批隔离构建、详细日志和已汇总的临时笔记共4126文件、1507199129字节，核对绝对路径、目录链接和Git跟踪状态后已清理。四份复现代码、正式报告及简要结论保留；其他工作区文件与正式成品未清理。
