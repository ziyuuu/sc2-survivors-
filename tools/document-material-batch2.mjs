import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/material-batch2-20261010';
const d=JSON.parse(await fs.readFile(root+'/delivery.json','utf8'));assert.equal(d.passed,true);
const n=value=>value.toLocaleString('en-US'),f=value=>value.toFixed(3);
const rows=d.comparison.pairs.map(r=>`|${r.suite}|${r.records}|${r.screens}|${r.before}|${r.after}|`);
const text=`# 第二批全单位材质与精英特色 · 验证结果

基线 \`${d.baseline}\`。范围见 [实施说明](MATERIAL_BATCH2_20261010.md)，138 身份见 [逐身份表](MATERIAL_BATCH2_IDENTITIES_20261010.md)。本批工程交付通过；全部画面修复、原作客户端参考、人验、真机与性能阶段尚未完成。

## 可复核的画面

- 全 138 身份的 [前后对照页](../../reports/local/material-batch2-20261010/comparison-gallery.html)：完整身体近景、五张地图的战场视距、844×390／390×844／320×568。
- 四个重点身份的 [连续动作对照页](../../reports/local/material-batch2-20261010/sequence-gallery.html)：修复前、后各 ${d.sequence.framesPerBuild} 帧，每个身份 ${d.sequence.framesPerBuild/4} 帧。逐帧推进 6 tick（0.1 秒），覆盖待机、移动、攻击、受击和死亡。PNG 原文件保留，播放不是实时性能录像。
- 原始证据目录：\`reports/local/material-batch2-20261010\`。完整身体近景采用 86 份 R9 记录及 52 份 R11 补拍。带出生动作的 14 个组统一原生推进 300 tick 后补拍近景、五图和三种窄屏，避免以蜷缩、部分入地或出土第一帧判断常态体型；原截图保留。近景按实际骨骼身体范围分别构图，两侧相机取景可不同，不能用近景像素高度测量倍率。战场和窄屏每对使用相同相机，倍率另由原体高和显示变换验证。

## 功能与同输入验证

${d.checks.regressions} 项回归、类型检查、数据文档和 ${d.checks.talentDefinitions} 项天赋定义检查通过。${d.checks.pairedWorldProfileRngStates} 份矩阵 World／Profile／RNG 状态与修复前逐项相同；另有 ${d.checks.pairedSequenceStates} 份连续动作状态相同。地图与玩法源未改变。所有纳入矩阵的记录均无页面／渲染错误、无待加载资源。R7／R9 的生产输入与最终版只有精英追猎者触发映射的两个文件差异，反向文本证明及其余 174 文件哈希一致；R10 原生闪现额外检查开始／保持／消耗／结束。旧未闪现场景保留原构建编号。

|套件|每侧记录|每侧状态截图|修复前证据|修复后证据|
|---|---:|---:|---|---|
${rows.join('\n')}

暂停不推进材质时钟，多实例错峰、批次重排、当前存档重载保持原生状态。所有精英按普通同兵种体高归一后只乘一次批准倍率；英雄原体高与原倍率不变。模型检查视图 12 项通过。不朽者护障起始／保持／耗尽、狂热者死亡及三位独立死亡动画英雄的回收重新通过；${d.checks.textureFilteringSamples} 项原过滤档位记录通过。三族背景颜色在英雄进出前后保持一致。

正式 Web ${d.checks.web.checks} 项／${d.checks.web.screens} 张截图与实际离线 HTML ${d.checks.offline.checks} 项／${d.checks.offline.screens} 张截图通过，覆盖三族、38 个真实席位、技能分页、触屏输入、皮肤设置和精确当前续局恢复。导入只用于诊断当前 schema，不开展旧存档匹配或迁移。首次 Web 在并行诊断时超过 300 秒，原失败保留；最终测试独立运行，初次准备等待上限明确记录为 ${d.checks.web.initialReadyTimeout/1000} 秒。这不是加载性能达标声明。

## 来源、资源与代码保护

${d.material.sourceModels} 个可追溯原 M3／${d.material.sourceMaterials} 个表面描述；${d.material.sourceHashes} 份 M3、M3A、DDS 源哈希复核不变。源 GLB 几何、骨骼、动作和原贴图未改写。新增 ${d.material.derivedTextures} 张派生 PNG，共 ${n(d.material.derivedTextureBytes)} 字节，均绑定原 DDS 哈希。主体模型替换 ${d.material.bodyModelReplacements} 个；六个恶火／维京精英修复原生变形与死亡模型解析。

基线保护 ${d.protection.baselineFiles} 文件：${d.protection.rawUnchanged} 份原样、${d.protection.authorizedExistingEdits.length} 份授权既有文件变更、${d.protection.missing.length} 缺失；原本地部署前端另行核对。${d.protection.packagedBackendVendorConfigIdentical} 个后端／vendor／启动／配置记录完全相同。World、Profile、规则、地图、HUD 与输入实现没有变更；run26／profile6／maprecipe3 保持。

原 ${d.resources.originalRecords} 条资源记录全保留；最终 ${d.resources.records} 条／${d.resources.files} 文件／${n(d.resources.bytes)} 字节。资源版本 \`${d.resources.release}\`。完整离线实际解码 ${d.html.decodedAssets} 条、${n(d.html.decodedLogicalBytes)} 逻辑字节，逐项 SHA-256 与源闭包相同。

逐项新增资源的源 DDS、通道、尺寸、字节和 SHA-256 见 [派生资源清单](../../deploy/runtime/material-textures.json)；应用 [更新差异清单](../../deploy/coze/resource-delta.json) 保留原资源复用与新增记录。90 精英的模型选择、形态、队色表面和原机制映射见 [逐身份机器记录](../../reports/qa/material-batch2-identities-20261010.json)。

## 短时成本记录

各单独记录约 5 秒暂停场景，采样时未并行运行其他本次 GPU 检查，原状态不变、页面可见且聚焦。两个样本仍只是成本记录；未进行整体性能、帧数或分档优化。

|版本|帧样本|CPU 提交均值 ms|CPU 提交 P95 ms|绘制调用均值|三角形均值|
|---|---:|---:|---:|---:|---:|
${d.cost.map((r,i)=>`|${i?'修复后':'修复前'}|${r.frames}|${f(r.cpuSubmitMs.mean)}|${f(r.cpuSubmitMs.p95)}|${f(r.drawCalls.mean)}|${f(r.triangles.mean)}|`).join('\n')}

设备／驱动：\`${d.cost[1].gpu}\`。无 GPU 时长采样，不能宣称稳定 60 FPS、自然高密度战役或真机通过。原始每帧数据和浏览器信息在 before-cost-r1／after-cost-r1。

## 交付

- Web：\`${d.appBuildId}\`。
- 应用 0.6.17：${d.applicationFiles} 校验文件，\`${d.packageBuildId}\`。
- 完整 HTML：\`${d.html.path}\`，${n(d.html.bytes)} 字节，SHA-256 \`${d.html.sha256}\`；Current 别名相同。
- 应用 ZIP：\`${d.zip.path}\`，${n(d.zip.bytes)} 字节，SHA-256 \`${d.zip.sha256}\`；逐文件 ZIP 往返校验通过。
- 四项实际应用启动用例及更新链通过：675 旧资源复用／160 新增／零旧资源重下，配置、回滚、重复更新和篡改拒绝通过。\`deploy/coze\` 与应用校验一致；本机 4196 提供本次构建，后端关闭。没有线上 Coze／数据库／管理员操作。
- 上一批命名 HTML 和 ZIP 已重算哈希确认保留。所有中间构建、失败记录、旧截图及其他线程工作保留；main 使用详细普通提交推送并单独核对远端，见本地 \`git-sync.json\`。

## 保留的问题与证据边界

精英毒爆白腹的源隐藏标记、统一精英表面覆盖、遗漏的源通道、双发光／透明度、UV／动作时钟、局部受击和已确认高光采样问题已实现。逐身份机器记录分列修复、来源缺口和人工判断。

四个来源缺口保持：hive／hero-upgrade.vikingfightermissile 的 M3 元数据，terrain.rock AO，loot.large reflection_belshir DDS。历史 Science Vessel 三项特效来源缺口仍开放。其精英身体原本就是橙色全息源材质；源 Fresnel 和屏幕纹理保留，不将它解释为一直激活的技能。

R7 近景的身体裁切、R9 蟑螂出土第一帧空白及雷兽／德哈卡出生姿态不适合作为常态对照、第一次补拍相机未钳制动画终帧、早期模型缺预载与夹具错误、共享旗舰尺寸问题、重复 DDS 资源身份、离线单字符串上限、首次 Web 等待超时、可选 ffmpeg 缺失均保留各自失败记录，未改标为最终通过。38 席位控制夹具使用密集布置，画面仍有单位遮挡，其交互和存档通过不等于自然高密度辨识度通过。最终原图人工审美判断、自然运动高光稳定性及同镜头原作参考仍开放；模型检查属于 AI 图像检查，不能替代用户验收。

后续继续投影、五图场景、特效与动态清晰度；**完成全部画面修复后再进入整体性能、帧数优化与画质分档**。P6-V01、低内存、高刷新率、自然／物理／长期／人验、Science Vessel、生产后端和 B4 不由本批关闭。
`;
await fs.writeFile('docs/project/MATERIAL_BATCH2_VALIDATION_20261010.md',text);
const section=`## Approved full unit material and elite visual batch · 2026-10-10

- User approved batch2 from b56201c: 30 ordinary/90 elite/18 heroes plus forms/children/deaths. Scope/results: docs/project/MATERIAL_BATCH2_20261010.md, MATERIAL_BATCH2_IDENTITIES_20261010.md and MATERIAL_BATCH2_VALIDATION_20261010.md; reports/qa/material-batch2-20261010.json; evidence reports/local/material-batch2-20261010. Overall performance/FPS/quality-tier optimization is deferred until ALL visual repairs finish, overriding the older batch1 next-stage phrasing. Shadows/five-map scenes/effects/dynamic clarity remain subsequent work.
- 204 original M3/475 surfaces and 799 M3/M3A/DDS source hashes; external animation refs, source channels/UV/alpha/composites/team masks/specular restored on existing PBR. Original GLB/M3/DDS unchanged; nine illegal unlit-specular pairs repaired only in memory. Authored hidden elite Baneling belly restored; local hit/specular filtering retains texture. 90 explicit elite profiles normalize to ordinary body height then apply ground1.25/giant1.12/flying-first1.15 once; heroes unchanged. Zero body replacements; six elite Hellbat/Viking native form/death fixes. Flagship display cache isolated from shared elite Carrier art. Existing output chain and native state/trigger clocks retained.
- ${d.checks.regressions} regressions/typecheck/data docs/165talents pass; ${d.checks.pairedWorldProfileRngStates} paired matrix plus ${d.checks.pairedSequenceStates} sequence World/Profile/RNG states identical; ${d.checks.textureFilteringSamples} filtering checks/12 inspection checks; final Web24checks51captures/offline24checks51captures, errors0. Complete-body near uses86R9 plus52R11 records;14groups with Birth clips use paired native300tick settled near/five-map/mobile recaptures, all other R7 battle views retain their exact builds. Continuous PNGs are native diagnostic frames, not real-time video/performance. All old failures retain their actual build; first Web300s concurrency timeout is retained, final bounded${d.checks.web.initialReadyTimeout/1000}s test is functional only.
- Protection${d.protection.baselineFiles}: ${d.protection.rawUnchanged}same/${d.protection.authorizedExistingEdits.length}authorized existing edits/0missing; prior local deployment front separately checked;152backend/vendor/launcher/config records identical. Original693records675files retained,160derived PNGs91935430bytes added; final853records835files760556883bytes, release${d.resources.release}. run26/profile6/maprecipe3 remain; no old-save migration. Four source gaps and historical Science Vessel sources/human/client/physical/natural/high-refresh/low-memory/P6-V01/production/B4 gates stay open.
- Web${d.appBuildId}; app0.6.17/184files/package${d.packageBuildId}. HTML ${d.html.path} ${d.html.bytes}bytes SHA${d.html.sha256}; Current matches; full decoder853records761470243logicalbytes hash-pass. ZIP${d.zip.bytes}bytes SHA${d.zip.sha256}. Previous batch1 named HTML/ZIP retained. Isolated v10 four startups/update675reused160added/config/rollback/idempotence/tamper pass; local deploy/coze matches;4196 final backend-disabled. No online Coze/database/admin operation.
- Short paused five-second cost records only, no stable FPS or GPU-timing claim. Keep all before/after/failure evidence and other-thread ROADMAP/dev/concept/three-preview work. Detailed normal main commit/push/remote comparison required; never force push or stage unrelated work.

`;
const agents=await fs.readFile('AGENTS.md','utf8');const heading='## Approved full unit material and elite visual batch · 2026-10-10';
const remaining=agents.startsWith(heading)?agents.slice(agents.indexOf('\n## ',heading.length)+1):agents;
await fs.writeFile('AGENTS.md',section+remaining);
console.log(JSON.stringify({validation:'docs/project/MATERIAL_BATCH2_VALIDATION_20261010.md',agents:true}));
