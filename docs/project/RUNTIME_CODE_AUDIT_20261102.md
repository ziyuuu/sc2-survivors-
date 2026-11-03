# 体积优化版运行过程补充审查

2026-11-02。承接用户“请补一轮吧”，补查连续运行、同帧执行顺序、运行时异常、跨局资源生命周期和浏览器恢复。源码基线仍为「体积优化版」`8d680aca1b3150b3faa0c9c170458d084c9a1a1e`。**新增6项P1运行/保存阻断、1项P2贴图状态缺陷；另扩大上一轮SAVE-NATIVE的已证实范围，不重复计数。均未修复。**

这是有限的运行时审查，不能视为所有设备、组合和长局均无缺陷。三路代理分别检查连续模拟、运行/保存交点、资源生命周期；主代理重跑全部新增复现工具，串行执行真实Chrome检查。上一轮结果见[代码审查](FULL_CODE_AUDIT_20261102.md)。

| 优先级 | 固定编号 | 已确认问题与后果 | 主要位置 |
| --- | --- | --- | --- |
| P1 | V06-RUNTIME-RESCUE-SAVE-001 | 虫族营救任务的临时跳虫护卫带双生标记，被普通编制校验拒绝；跨到关间时无法保存/恢复 | [run-fields.ts:104](../../src/simulation/persistence/run-fields.ts#L104) |
| P1 | V06-RUNTIME-SAVE-SWANN-001 | 橙套斯旺能修复10个目标，存档只允许7个；技能跨关间时保存被拒绝 | [run-fields.ts:109](../../src/simulation/persistence/run-fields.ts#L109) |
| P1 | V06-RUNTIME-SAVE-NIADRA-001 | 五级腐化橙套尼亚德拉能登记5次复生，存档只允许4次 | [zerg-hero-passives.ts:68](../../src/simulation/combat/zerg-hero-passives.ts#L68) |
| P1 | V06-RUNTIME-SAVE-HERORANK-001 | 英雄正常击杀成长到六级后，技能载荷仍被存档的五级上限拒绝 | [run-fields.ts:109](../../src/simulation/persistence/run-fields.ts#L109) |
| P1 | V06-RUNTIME-MAP-RETRY-001 | 特殊关地图首次加载失败后，恢复资源、重试仍不重新创建地图，残留错误继续阻断入口 | [battle-renderer.ts:698](../../src/render/scene/battle-renderer.ts#L698) |
| P1 | V06-RUNTIME-GAMEPAD-RAF-001 | 页面禁止手柄权限时，无手柄也会抛SecurityError，整个帧循环停止 | [controller.ts:22](../../src/ui/gamepad/controller.ts#L22)、[bootstrap.ts:108](../../src/app/bootstrap.ts#L108) |
| P2 | V06-RUNTIME-TEXTURE-TIER-001 | 科学球死亡压缩贴图降档后仍保留高档mip，贴图对象与已选档位不一致；实际GPU画面待复核 | [managed-textures.ts:86](../../src/render/loaders/managed-textures.ts#L86) |

**连续运行与同帧顺序。**

固定seed529、正常难度、正式战役地图和空装备账户，连续执行真实`World.step()`，每个关间捕获/恢复，并检查钱包/实体数值、订单/奖励回执唯一性和重复`endStage()`。人族与星灵各跑完18关和2轮无尽，每族115200固定步、1920模拟秒、20次检查点。虫族固定身份路径在第14关真实关间恢复失败：73800步、1230模拟秒，前13个检查点通过。

连续模拟使用锁血、单次高伤害、每秒清理已有敌人和自动处理部分待决项；随机特殊关留给定向检查。因此这些结果验证状态积累与流程衔接，**不代表自然通关、平衡或性能达标**。Boss掉落还从runId派生随机状态，复现工具已同时固定runId；只固定战斗seed不足以复现整条掉落序列。早先一个未固定runId的虫族路径曾跑完20个窗口，另一个在第14关失败；不以成功路径覆盖失败。

`RESCUE-SAVE`已缩成不使用锁血/清敌的对照：第14关末4秒调用正式`spawnMission('rescue')`，再走240个真实固定步。任务自身在最后一帧生成4只临时跳虫护卫，关卡同帧转为reward。它们有任务专用`pairId`，合法地不属于永久`zerglingPairs`，但校验无条件要求活的有pairId实体为永久编制。`restoreRun`、`readArchive`、`SaveRepository.commit`三条路径均被拒绝，旧检查点未被覆盖；人族和星灵同样流程均通过。修复应校验真实任务来源及临时护卫关系，不能把所有双生校验删掉或给任务护卫冒登记永久席位。

**英雄技能与保存交点。**

三项英雄反例均经过真实装备/英雄接口、实际技能、`endStage()`和`RunSession`保存：斯旺同为三级，无装7目标通过、有装10目标失败；尼亚德拉同为五级，无装4次复生通过、腐化橙套5次失败；雷诺以真实`w.hit()`击杀回执成长，9次首领击杀到五级后施放通过，15次到六级后施放失败，没有直接修改六级值。失败时旧主档保留、关间时钟冻结、`saveBeforeAdvance()`为false、当前导出无法被同版本读取。

上一轮`V06-FULL-SAVE-NATIVE-001`另确认4个扩展：腐土播种者、腐蚀雨幕的舰装增强地面伤害2016/1824被拒绝，无装1008/912通过；末日火炮搭配三脊穿心、裂甲长棘，合法脊刺宽度0.65/1.56及伤害增益被拒绝，无装对照通过。位置为[zerg-elite-runtime.ts:216](../../src/simulation/combat/zerg-elite-runtime.ts#L216)及同文件219行。它们沿用原编号，不把8组对照记为8个新问题。保存上限应与装备/成长后的冻结技能契约统一，不能为了过校验削弱既有技能。

**地图失败与贴图生命周期。**

`MAP-RETRY`用真实特殊关进入、`syncMap()`和`createFlatMap()`，仅替换图片解码结果。首张图片失败后`mapTerrain`已写入，目标地图却未加入`mapViews`；解码恢复后3次重试累计仍只调用过1次加载。特殊关停在loading，paused=true；真实准备协调器也被残留`map:`错误拒绝。诊断强制返回原战场后，错误仍阻止准备。相同地形健康对照加载7张纹理成功。这里已确认的是失败恢复契约，未声称真实玩家发生过该故障。

`TEXTURE-TIER`针对当前快照的`model.science_vessel.death`内嵌图0：真实高档GLB/WebP为1024×1024，中档为512×512，载荷与图片SHA均核验。实际`trackTexture/applyPendingTextureTier`把合成CompressedTexture的Source换为512图，但保留BPTC格式和旧1024压缩mip；普通Texture对照正确更新。锁定Three的上传代码使用`mipmaps`分配和上传，故新ImageBitmap不替代旧压缩内容。该项只确认CPU状态和上传代码契约，**未测实际GPU输出，不宣称黑屏、崩溃或全部贴图切档无效**。

跨局地形复用对照通过：3轮reset/start及资源关、竞技关、闪避关进出，endlessField为同一对象，每类SpecialTerrain各复用一个对象。只读核对尸体/任务/建筑/载体视图清理、标签释放、空闲模型回收、准备代次、音乐和音源结束处理，未新增确认无界泄漏。浏览器观察中的模型/贴图数受后台预载影响；不据此宣称整体内存恒定或泄漏已排除。

**真实浏览器与主循环。**

使用Windows Chrome无头模式、1280×720、中档画质、临时档案、独立回环HTTP服务。隔离production构建只固定初始seed并暴露返回的app供观察，保留真实游戏逻辑；使用已核验的当前压缩资源，未覆盖共享dist/web、Current或发布快照。快照appBuildId为`a6b6e0d88b466383e804e20dd0ac94141085a32d25afe6d721c38c45e6484488`，资源release为`50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a`；诊断程序自身哈希另存机器结论，不冒充原发布程序。

- 正常路径通过：首战自然运行、键盘输入与暂停/继续、资源已就绪战斗中的3.5秒断网恢复、合成hidden事件处理、`WEBGL_lose_context`丢失/恢复、3次菜单/原局继续、诊断关末后的真实关间推进、刷新检查点恢复、再次开新局。正常路径未捕获pageerror或HTTP错误响应；抽查战斗恢复和关间画面，未见空白战场或遮挡异常。
- 三次原局继续保持同一runId，World监听器6个、永久档案监听器2个未增加。未测完整浏览器/进程内存平台期，不能将其等同于全部生命周期无泄漏。
- 刷新后按D05恢复第1关已完成的random关间，再从既有按钮重新进入第2关；这符合最近检查点规则。调查脚本曾误假设直接恢复战斗，以及遗漏building→random的第一次“前往”操作，均已修正，不计产品缺陷。首批已通过流程与修正后续跑分开留结论。
- CDP的freeze/active没有触发本环境visibilitychange，恢复后补算了冻结期间时间，因此该观察不算真实切后台验证。另用明确标注的合成hidden事件确认处理器会暂停；未替代物理手机后台/OS杀页。
- `GAMEPAD-RAF`在真实HTTP响应设置`Permissions-Policy: gamepad=()`后成立：无手柄连接仍由浏览器抛SecurityError；相隔1.8秒renderer帧号同为51，游戏时间为0。`poll()`未处理API拒绝，主循环仅在尾部调度下一帧，因此异常永久中断循环；诊断`report()`也调用该API。普通权限对照的全部流程可运行。应隔离可选输入API失败并使帧异常有可恢复状态，不能仅隐藏console错误。没有证据表明当前线上站点设置了该限制。

**验证口径和复现入口。**

主代理复跑：四种精英技能扩展8组、三种英雄上限6组、任务关末3族对照、资源/地形3项、三族连续模拟及上述浏览器组。工具中的AUDIT断言用来确认现有缺陷，运行通过不表示产品正确；虫族连续模拟按预期在真实检查点失败，不能列为全程通过。同基线上一轮2909项常规回归、类型/数据和5138载荷核验沿用，不重复累加。本轮源码未修改，未再次跑全量回归。

```powershell
node --import tsx tools/inspect-runtime-persistence-20261102.mts
node --import tsx tools/inspect-runtime-hero-checkpoint-20261102.mts
node --import tsx tools/inspect-runtime-rescue-save-20261102.mts
node --import tsx --test tools/inspect-runtime-resources-20261102.mts
node --import tsx tools/inspect-runtime-simulation-20261102.mts terran
node --import tsx tools/inspect-runtime-simulation-20261102.mts zerg
node --import tsx tools/inspect-runtime-simulation-20261102.mts protoss
node tools/inspect-runtime-browser-20261102.mjs
```

浏览器工具需要允许Chrome访问本机回环；首次沙箱拒绝`ERR_NETWORK_ACCESS_DENIED`后，已用正常本机权限完成，不把访问限制列为产品问题。完整证据摘要和脚本/源码哈希见[机器结论](../../reports/qa/runtime-code-audit-20261102.json)。

**交付边界。** 只新增复现工具、报告和看板记录，未修改产品源码/UI/数值/存档格式，未提交、推送、合并或部署。V06继续待验证，新增发现待办；应优先修复合法游戏状态的保存阻断，其次处理地图与主循环失败恢复，再验证压缩贴图切档。真实iPhone/Safari、OS杀页、自然完整长局、线上服务和完整GPU/进程内存测量仍开放。任务结束按产物保留规则清理本批隔离构建、截图和详细日志，只保留复现代码及简要结论。

本批34个可重建文件共52400937字节已按绝对路径、目录链接、Git跟踪状态核对后清理，含隔离构建、截图、详细日志与临时笔记。6份复现工具、正式报告、简要机器结论和看板保留；其他工作区改动和正式成品未清理。最终docs:check、11个报告本地链接及源码/脚本哈希核对通过，src/test及根构建配置无工作区差异。
