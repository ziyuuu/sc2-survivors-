import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-s08-20261020',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=x=>createHash('sha256').update(x).digest('hex');
const b=await read(root+'/baseline-2/report.json'),c=await read(root+'/candidate-2/report.json'),summary=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json'),logic=await read(root+'/equivalence.json'),cpu=await read(root+'/cpu.json'),battle=await read(root+'/battle-cpu.json'),audio=await read(root+'/audio-cpu.json'),source=await read(root+'/source-proof.json'),diagnosticRevision=await read(root+'/diagnostic-r3-proof.json');
assert.ok(b.pass&&c.pass&&summary.pass&&logic.pass&&cpu.pass&&battle.pass&&audio.pass&&source.pass);
assert.equal(logic.checks.length,850);assert.equal(summary.pairs.length,8);assert.equal(pixels.pairs.length,4);assert.equal(battle.results.length,8);assert.equal(audio.checks.length,32);
assert.equal(process.env.SC2_VISUAL_REVIEWED,'1','View both contact sheets before closeout');
for(const p of pixels.pairs)assert.equal(p.battleRows30to620,0,p.name);
for(const r of [b,c]){
 assert.equal(r.errors.length,0);assert.equal(r.samples.length,12);assert.equal(r.screens.length,4);
 for(const s of r.samples){if(!s.live)assert.ok(s.frozenExact);assert.equal(s.after.discarded-s.before.discarded,0);}
 assert.deepEqual(r.audio.rows.map(x=>x.loops),[0,1,1,0,1,0,1,0,0]);
 for(const row of r.audio.rows){assert.ok(row.decoded>0);assert.equal(row.errors.length,0);}
 for(const s of r.screens)assert.equal(hash(await fs.readFile(s.file)),s.sha256);
 for(const name of ['medical','medical-elite']){
  const fixed=r.checkpoints.find(x=>x.name===name+'-fixed'),ended=r.checkpoints.find(x=>x.name===name+'-ended');
  assert.equal(fixed.state.allies,15);assert.ok(fixed.world.healTargets.length>0);assert.ok(fixed.source.particles>0);assert.ok(fixed.source.ribbonQuads>0);
  assert.equal(ended.world.healTargets.length,0);assert.equal(ended.source.particles,0);assert.equal(ended.source.ribbonQuads,0);assert.equal(ended.source.activeRequests.length,0);
 }
 const empty=r.checkpoints.find(x=>x.name==='no-sources-fixed');assert.equal(empty.state.allies,12);assert.equal(empty.state.stats.healed,0);assert.equal(empty.source.activeRequests.length,0);
}
assert.deepEqual(b.build.outputs,source.baseline.outputs);assert.deepEqual(c.build.outputs,source.candidate.outputs);
assert.ok(diagnosticRevision.pass);assert.ok(diagnosticRevision.records.every(x=>x.productionInputsExact));
for(const r of [b,c])for(const p of r.checkpoints.filter(x=>x.name.endsWith('-fixed')||x.name.endsWith('-ended'))){assert.equal(p.state.phase,'battle');assert.equal(p.state.tick,p.name.endsWith('-fixed')?120:1020);}
for(const p of b.checkpoints.filter(x=>x.name.endsWith('-fixed')||x.name.endsWith('-ended')))assert.deepEqual(p.source.activeRequests,c.checkpoints.find(y=>y.name===p.name).source.activeRequests);
for(const x of source.changed)assert.equal(hash(await fs.readFile(x.file)),x.sha256);
const tests=await fs.readFile(root+'/full-tests.log','utf8');assert.match(tests,/pass 1698/);assert.match(tests,/fail 0/);
const resourceDifferences=summary.pairs.map(p=>({case:p.case,count:p.resourceDiff.length,details:p.resourceDiff}));
const decisions=[
 {id:'C13',result:'Expiry tickets carry their exact map key; pop verifies key plus serial instead of scanning map values. 4096 refreshed tickets / 512 live entries retained on both sides, so this is lookup CPU improvement, not queue compaction or lower memory. Serialized active status and refresh/restore semantics unchanged.'},
 {id:'C16',result:'Stable bounded first-N support selection reads live bodies per call. Preserve the original health or shield ratio/ID, old-target +0.08 preference, zero-energy movement target, line/visibility and original heal order. No cross-tick recipient cache or scan frequency change. Small-army regressions retained; guardian-area candidate reverted.'},
 {id:'C17',result:'Regeneration recipients skipped when no eligible native regeneration source, full-health recipients skipped; blood/barrier/plague/entry cleanup still run. Infection recipient scans skipped when no pool pulse is due, without skipping expiry/revival. Barrier-only support avoids unused mine enemy list. Broader source precollection reverted.'},
 {id:'PG-019',result:'Only immutable effect-ID to first SOURCE_WEAPONS definition is indexed. Nonempty talents, ability, owner/team, mode, hero/elite and tactical changes remain live recomputation; no dynamic stat cache added. 26 weapon effect and 21 dynamic control checks exact.'},
 {id:'UI-AUDIO-001',result:'Production audio unchanged. Actual update measured on 301 entities with 0/1/4/30 healers; Set-reuse experiment too small/inconsistent to adopt. 32 instrumented node lifecycle comparisons and nine actual decoded AudioContext stages per browser side pass. Existing healer loops separate from ordinary 12-voice ceiling, not newly limited. Stats/telemetry remain pending under U04.'}
];
const failures={items:[
 {file:root+'/typecheck-r1.log',result:'Initial immutable lookup map inferred a non-null effect key; one source effectId may be null.',resolution:'Nullable key type corrected before candidate builds; final typecheck passes.'},
 {file:root+'/audio-cpu-r1.log',result:'Diagnostic rewrite did not match the bundled PURE comment.',resolution:'Corrected diagnostic needle; production audio never changed.'},
 {file:root+'/audio-cpu-r2.log',result:'Instrumented AudioNode.connect mock did not return its destination.',resolution:'Corrected mock contract; audio-cpu-r3.log passes. Real browser AudioContext separately verified.'},
 {file:root+'/cpu-r1.json',result:'Initial source-precollection and guardian-area first-N candidates did not justify adoption.',resolution:'Reverted those changes before final R2 builds. Original candidate archive, equivalence-r1 and measurements preserved.'},
 {result:'Initial inline board-start command failed parsing smart quotes before any file write.',resolution:'Saved start-performance-s08.mjs succeeded; board update history retained.'},
 {files:[root+'/baseline-1/report.json',root+'/candidate-1/report.json',root+'/summary-r1.json',root+'/pixels-r1.json'],result:'Both first browser runs had manual maxHp changes that caused native wound-preserving stat refresh to zero 12 patients. No-source scene ended at tick 6 with lost phase; settlement UUID keys produced four state differences. Initial runner pass flag only covered its inadequate assertions; pair summary is false. All first-pass images are identical but do not prove valid sustained treatment.',resolution:'R3 diagnostic leaves health/shield maxima native and resets wounds before each tick until stop. Runner asserts living patients, battle phase and full 120/900 steps. Both sides rerun as baseline-2/candidate-2. Prior raw reports and all images retained; R2/R3 production inputs exact. Node eight-World replay also strengthened to retain native allied maxima and assert living recipients each tick; all 850 checks re-pass in equivalence-r4.log.'}
],negativeMeasurements:{
 smallArmies:cpu.results.filter(r=>r.n===16&&r.fasterPairs<9).map(({samples,...r})=>r),
 normalDensity:battle.results.filter(r=>r.fasterPairs<9).map(({samples,...r})=>r),
 unchangedControls:cpu.results.filter(r=>r.name==='guardian'||r.name==='support-empty').map(({samples,...r})=>r),
 note:'Unchanged guardian and empty-support controls have ordinary measurement variation; no benefit attributed. 16-recipient elite medical without background enemies and Swann/Artanis with 300 enemies show regressions, preserved rather than generalized from 300-allied-recipient stress results.'
}};
const proof={date:'2026-10-20',task:'S08 + U04 healing-loop subtask',status:'verified-local',baseCommit:'be9e2982944314194c6dcc9dcc535bc321749eb4',base:'Frozen S04 final sources, nine production simulation files differ, production audio unchanged. No Git commit.',source,diagnosticRevision,logic,cpu,battleCpu:battle,audioExperiment:audio,validation:{tests:1698,addedTests:8,testLog:root+'/full-tests.log',typecheck:root+'/typecheck-final.log',diagnosticTypecheck:root+'/typecheck-r3.log',dataCheck:root+'/docs-check.log',browser:{baseline:'baseline-2',candidate:'candidate-2',summary,pixels,activeRequestsExact:true,resourceDifferences,visualContactsReviewed:true,audioBaseline:b.audio,audioCandidate:c.audio,captureMethod:b.captureMethod}},decisions,failures,limitations:[
 '300 allied wounded recipients are an extreme selection-pressure case, distinct from the separate 16-allied/300-enemy case. Local CPU is not whole-game FPS.',
 'Browser samples are one ordered baseline/candidate pair, not an alternating replicated whole-game speedup experiment. Frozen rendering cannot establish simulation savings.',
 'Only immutable weapon lookup is cached; dynamic talent/stat computation remains an unchanged control.',
 'Status heap retains all refresh tickets; no queue memory compression or bounded-heap claim.',
 'Actual decoded AudioContext node start/stop is verified, not audible quality or human listening. Audio experiment uses instrumented nodes and excludes decoding/hardware latency.',
 'Diagnostic placement, repeated 25% allied wounds before native ticks, parked enemies, fixed-step preparation and post-timing audio clock adjustment are not natural gameplay or full-content 60 FPS acceptance.',
 'U04 statistics/telemetry untouched and remains pending; A01 only five related review conclusions updated.',
 'No Current/named delivery replacement, Git commit, push, publication, quality/300/4:4:1/economy/frequency/save-policy changes.'
]};
await fs.writeFile('reports/qa/performance-s08-20261020.json',JSON.stringify(proof,null,2)+'\n');
await fs.writeFile(root+'/failures.json',JSON.stringify(failures,null,2)+'\n');
const labels={'medical-medivac':'普通医疗','medical-medivac.2':'精英医疗运输机','swann':'斯旺','niadra':'尼亚德拉','artanis':'阿塔尼斯','auras-none':'无回血来源','auras-queen':'女王回血','pools-empty':'无到期感染池'};
const rows=rs=>rs.map(r=>`| ${labels[r.name]??r.name}${r.n?' / '+r.n:''}${r.variant?' / '+r.variant:''} | ${r.oldMs.toFixed(6)} | ${r.newMs.toFixed(6)} | ${r.fasterPairs}/12 |`).join('\n');
const fps=summary.runs[0].measurements.filter(s=>!s.live&&!s.detail).map(s=>{const t=summary.runs[1].measurements.find(x=>x.name===s.name);return `| ${s.name} | ${s.fps.toFixed(2)} | ${t.fps.toFixed(2)} |`;}).join('\n');
await fs.writeFile('docs/project/PERFORMANCE_S08_20261020.md',`# S08 状态与支援按需查询 · 2026-10-20

用户批准 S08 与 U04 治疗循环音频子项合批。S08 已本地完成；U04 音频子项完成测量和保留原实现的结论，统计／遥测仍待办。[范围证据](../../reports/qa/performance-s08-20261020.json)；[性能看板](PERFORMANCE_BOARD.html)。

## 实现与边界

- 治疗／英雄回盾按原生命或护盾比例及 ID 顺序保留所需前 N 个目标，无需完整排序。每次调用读取当前存活／归属／位置，保留旧治疗目标 0.08 容差、视线、零能量时用于移动的目标，以及逐次治疗后的实时变化；不跨 tick 缓存、不降低频率。
- 无有效原生回血来源时跳过回血受益者查询，满血受益者也跳过；嗜血、屏障、瘟疫和进入状态清理继续执行。没有到期感染池时不扫描友军，但池推进／过期／复活逻辑保留。仅屏障且无地雷时不生成无用的敌方候选数组。
- 状态过期票据携带精确 key，以 key 和 serial 验证当前条目，省去遍历全部活动条目。4096 票据、512 活动状态两侧保持；没有压缩堆、改变刷新或存档格式，不能宣称减少票据内存。
- 只为不可变武器定义建立 effectId→首个匹配定义的索引。非空天赋、技能、动态形态、转化、英雄／精英和战术属性继续实时派生，无新属性缓存。
- 公共支援来源预收集及精英护盾区域选优候选已撤回；没有稳定收益，最终保留原路径。治疗音频代码字节不变。

## 成本对照

同进程独立 World、12 次预热、12 对交替顺序；局部 CPU，单位 ms/次，包含双方相同的生命／护盾／能量及临时输出重置。**不是整场 FPS 收益。**

16 名受益友军＋300 名驻停高生命敌人的独立补测，每对各 200 次，八组完整状态／观测回执精确：

| 路径 | 原实现 | 最终实现 | 较快对数 |
| --- | ---: | ---: | ---: |
${rows(battle.results)}

普通／精英医疗约下降 36%／23%，各 11/12 对较快；无回血来源和无到期感染池各 12/12 较快。斯旺 0.008821→0.009486、阿塔尼斯 0.019823→0.021588ms 略慢；尼亚德拉仅 6/12 较快，不能宣称小队英雄路径普遍改善。

极端 300 名友军受益者压力与其他定向路径单列；它不是“300 个敌人的普通战斗”。完整 35 组原始数据及逐对结果在证据中：

| 路径 / 数量 / 变体 | 原实现 | 最终实现 | 较快对数 |
| --- | ---: | ---: | ---: |
${rows(cpu.results.filter(r=>(r.n===300&&['medical-medivac','medical-medivac.2','swann','niadra','artanis','auras-none','auras-queen','pools-empty','pools-due','support-barrier','weapon'].includes(r.name))||r.name==='status-expiry'||(r.n===16&&r.name==='medical-medivac.2'&&r.variant==='wounded')))}

武器行是 301 个单位的属性查询一批，状态行是 4096 过期票据的一批，不能与单次治疗直接相加。到期感染池原路径仅 7/12 较快、女王伤者路径仅 8/12，不宣称稳定改善。无背景敌人的 16 名伤员精英医疗 0.008140→0.010602ms 回退保留。

## 音频子项

301 实体、0／1／4／30 名治疗者的原更新成本约 0.001256／0.001454／0.001627／0.003239ms。复用临时 Set 的实验收益仅约 0.00006—0.00019ms，带治疗者时只有 8／7／7 对较快，未采用。更新来自 World 通知，通常 10Hz，不是每次渲染帧。

32 组仪器化 AudioContext 节点启停对照通过；普通声音 12 voice 上限与治疗循环原本分离，30 循环压力时普通 voice 为 0，未新增限流或改变听感规则。两侧浏览器各九步真实解码 AudioBuffer／AudioContext 生命周期：空 0→治疗 1→刚结束尾音 1→尾音结束 0→再治疗 1→暂停 0→恢复 1→来源死亡 0→重置 0，已解码 ${b.audio.rows[0].decoded}/${c.audio.rows[0].decoded} 个原音频、错误 0。音频夹具在全部正式状态与计时之后单独推进 0.16 秒以验证尾音；不是听觉或硬件质量验收。统计和遥测未开始，U04 不整项关闭。

## 正确性与画面

1698 回归（新增 8 项）、类型和数据文档检查通过。850 个完整状态／账户／事件／观测回执检查精确，含有无来源、满血／零能量、平局／逆序、同 tick 死亡／归属变化／新伤员／晋升／新英雄。三个种子各 1200 次状态刷新／移除／恢复操作；26 武器定义、21 非空天赋与动态状态控制；八个 World 各实际推进 180 固定步，并断言友军受益者每步存活、保持战斗。另八组上述普通密度状态对照独立计数。

查尔 seed529、1440×900 DPR1、完整效果，普通医疗／精英医疗／英雄支援／无来源四场景，各 120 步固定与驻停后 900 步状态对照。友军最大生命／护盾保留原生，诊断每步前把受益者生命／护盾设为上限 25%，模拟持续伤势；不产生真实受击事件，不代表自然敌方伤害。结束阶段停掉该伤势注入，再推进完整 900 步；驻停不等于关闭全部被动回血。八对完整状态仅归一新局 UUID，活动源请求／提交量精确。固定画面全部先于实时采样；静帧截图暂缓重复提交、断言 World 不变并恢复渲染，计时正常绘制。

普通／精英医疗固定场景各 15 名存活友军，光束带分别 20／100、粒子 236／289；停疗后的目标、粒子、光束带及活动请求全部归零。无来源场景 12 名存活友军、治疗量及活动请求 0；英雄支援 19 名友军，原生治疗量为正。上述断言与前后输出一起验证，不以相同的空画面替代治疗覆盖。

两侧各 12 个四秒窗口，冻结状态不变，实时窗口无丢弃模拟欠账；冻结只量渲染，不能体现模拟查询收益。低探针 FPS 如下，仅一组顺序运行观察，未建立稳定整场加速结论：

| 场景 | 原实现 FPS | 最终 FPS |
| --- | ---: | ---: |
${fps}

页面／控制台错误 ${b.errors.length}/${c.errors.length}，请求取消 ${b.requests.length}/${c.requests.length} 逐条保留。四对截图、两张联系表已有限目视检查；全图差异像素 ${pixels.pairs.map(x=>x.name+' '+x.changedPixels).join('、')}，战场行 30—619 差异均 0。资源容量／增长差异 ${resourceDifferences.reduce((n,x)=>n+x.count,0)} 处，详情另列，不用容量统计替代活动输出对照。自然战役、物理／人类输入及全内容 60 FPS 仍不由本批关闭。

## 失败保留与构建

首次类型检查的 nullable effectId 错误已修正；音频诊断前两次分别因 bundle 注释匹配及 mock connect 返回值失败，均保留，第三次通过。首轮支援预收集／护盾区域候选及数据归档，最终撤回；旧结果不改标最终构建。看板启动命令首次引号解析失败，无文件写入，后由保存脚本完成。

首轮 baseline-1／candidate-1 手动提高友军 maxHp，原生保留伤口的属性刷新将 12 名受益者生命降为零；无来源场景在第 6 步进入失败结算，产生四处结算 UUID 键差异。原 runner 的 pass 仅表示旧断言通过，summary-r1 明确失败，不能当作四场战斗通过，原图／原报告保留。R3 诊断按上述原生上限与逐步伤势重录；新断言要求伤员存活、战斗阶段及完整 120／900 步。全部游戏生产输入与 R2 精确相同，Node 实际 World 对照同步加强并重新通过 850 项。全量回归没有失败，最终 baseline-2／candidate-2 单列。

冻结 S04 最终输入，八处模拟文件修改加一个选优 helper，共九个生产文件；${source.candidate.inputs.length} 个浏览器输入、${source.nodeNew.inputs.length} 个 Node 输入绑定。音频与其他生产输入保持该基线，排除无关 economic-egg 工作区修改。最终 JS \`${source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256}\`；入口 \`preview/performance-s08-20261020-candidate-r3/\`（4436）。

看板完成 27/49，剩余 22；下一项 S05 未开始。A01 仅补 C13／C16／C17／PG-019／UI-AUDIO-001 五条结论。未替换 Current／命名交付、提交／推送或发布；五图、画质、300／4∶4∶1、模拟经济及存档延期保持。
`);
console.log(JSON.stringify({status:proof.status,checks:logic.checks.length,battleChecks:battle.results.length,document:'docs/project/PERFORMANCE_S08_20261020.md'}));

