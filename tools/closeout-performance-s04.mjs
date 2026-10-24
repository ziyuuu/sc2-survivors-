import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s04-20261020',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),baseline=process.argv[2]??'baseline-3',candidate=process.argv[3]??'candidate-1';
const b=await read(root+'/'+baseline+'/report.json'),c=await read(root+'/'+candidate+'/report.json'),summary=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json'),logic=await read(root+'/equivalence.json'),cpu=await read(root+'/cpu.json'),legal=await read(root+'/legal-cpu.json'),source=await read(root+'/source-proof.json');
assert.ok(b.pass&&c.pass&&summary.pass&&logic.pass&&source.pass);assert.equal(logic.checks.length,896);assert.equal(summary.pairs.length,8);assert.equal(pixels.pairs.length,4);assert.equal(legal.results.length,7);
for(const p of pixels.pairs)assert.equal(p.battleRows30to620,0,p.name);
for(const r of [b,c]){assert.equal(r.errors.length,0);assert.equal(r.samples.length,12);for(const s of r.samples){if(!s.live)assert.ok(s.frozenExact);assert.equal(s.after.discarded-s.before.discarded,0);}}
assert.deepEqual(b.build.outputs,source.baseline.outputs);assert.deepEqual(c.build.outputs,source.candidate.outputs);
for(const r of [b,c])assert.equal(r.screens.length,4);
for(const x of b.checkpoints.filter(x=>x.name.endsWith('-fixed')||x.name.endsWith('-ended')))assert.deepEqual(c.checkpoints.find(y=>y.name===x.name).source.activeRequests,x.source.activeRequests);
for(const x of source.changed)assert.equal(createHash('sha256').update(await fs.readFile(x.file)).digest('hex'),x.sha256);
const diagnosticRevision=await read(root+'/diagnostic-r2-proof.json');assert.ok(diagnosticRevision.pass&&diagnosticRevision.productionInputsExact);
for(const r of [b,c])for(const s of r.screens)assert.equal(createHash('sha256').update(await fs.readFile(s.file)).digest('hex'),s.sha256);
const resourceDifferences=summary.pairs.map(p=>({case:p.case,count:p.resourceDiff.length,details:p.resourceDiff}));
const tests=await fs.readFile(root+'/full-tests-authorized.log','utf8');assert.match(tests,/pass 1690/);assert.match(tests,/fail 0/);
const failures={items:[
 {file:root+'/targeted-r1.log',result:'Five of six new tests passed; hero count assertion incorrectly included the separate immediate damage query.',resolution:'Count only target selection originating from the live source; targeted-final.log has six passes. No production change.'},
 {file:root+'/full-tests-r1.log',result:'Seven environment failures: temporary test-file rename EPERM and localhost EACCES.',resolution:'After permitting local test operations, all 1690 pass in full-tests-authorized.log.'},
 {file:root+'/baseline-1/report.json',result:'First browser baseline reached both carrier scenes but failed the nine-area acid fixture; repeated baneling attacks were gated by native recovery.',resolution:'R2 diagnostic fixture explicitly clears recovery before each of three immediate attacks per source. Both original builds, source-proof-r1 and failure retained. All production source hashes, Node replay and CPU inputs unchanged.'},
 {file:root+'/baseline-2/report.json',result:'R2 baseline captured nine-area fixed state, but copying its screenshot timed out after 90 seconds; exact cause not established. No page/console errors reported.',resolution:'Same-build recheck suspends duplicate WebGL frame submission only while copying the already-drawn image, asserts unchanged World, and restores rendering before further steps and all timing windows. Original state/report and two valid carrier images retained separately.'}
],negativeMeasurements:[
 {scenario:'synthetic single split / 300',oldMs:.16946266666666684,newMs:.17454191666666674,result:'Only 1/12 faster; retain the slight slowdown. Legal split module also includes bounce and must be reported separately.'},
 {scenario:'16-target acid overlap',oldMs:.493856111111111,newMs:.4975813888888853,result:'6/12 faster, no stable gain demonstrated.'},
 {scenario:'unchanged launch DTO control',result:'Both sides use six structured clones; 7/12 faster is variation, not an optimization.'}
]};
const proof={date:'2026-10-20',task:'S04',status:'verified-local',baseCommit:'be9e2982944314194c6dcc9dcc535bc321749eb4',base:'S01/S02 final frozen sources; only three simulation files differ. No Git commit.',source,diagnosticRevision,logic,cpu,legalCpu:legal,validation:{tests:1690,addedTests:6,testLog:root+'/full-tests-authorized.log',typecheck:root+'/typecheck-final.log',dataCheck:root+'/docs-check.log',browser:{baseline,candidate,summary,pixels,activeRequestsExact:true,resourceDifferences,visualContactsReviewed:true,captureMethod:b.captureMethod}},failures,decisions:[
 {id:'C15',result:'Secondary pre-hit roster created only for split/cleave/moving_extra/pierce/crit_pursuit. Bounce chooses nearest eligible live body directly at each hop. Value sums avoid filtered arrays; melee metadata and pierce distance evaluated only when needed. Preserve RNG calls, snapshot timing, derived order and finite true-DPS budget.'},
 {id:'C08',result:'Same-source overlap maximum uses a live single pass without filter/map/spread arrays. No cross-area cache or changed area/target ordering. Existing per-second gates, future-area contribution, expiry and damage-driven membership remain.'},
 {id:'C14',result:'One command passes its selected hero target to execution. UI preview remains a fresh read on every call; skill recipient freezing and impact queries remain independent.'},
 {id:'C12',result:'No new spatial-index coverage selected. Existing index is not a complete current-position/current-membership view between rebuilds; replacing live scans could omit relocated/new bodies and static hives. Stale-index and static-hive fixtures preserve live behavior. S07 remains separately pending.'},
 {id:'SIM-007',result:'No global or shared launch source cache selected. Frozen native target association and isolated mutable launch DTOs retained; five-projectile/source-removal control exact and six clones unchanged. No cloning performance gain claimed.'}
],limitations:['Local Node costs are not whole-game FPS. Browser frozen/live measurements and all regressions retained without overall gain attribution.','The candidate browser sampling phase overlapped one 4.48-second local screenshot comparison/contact-sheet process. These browser numbers are observational and not a controlled whole-game speedup benchmark; the earlier alternating Node benchmarks ran separately.','Synthetic branch fixtures and legal loadout fixtures are distinguished. Three immediate native baneling casts per source exercise overlap, not natural cooldown behavior.','Controlled health, parked enemies and fixed-step scenes do not establish natural campaign, physical input, user acceptance or full-content 60 FPS.','No quality, 300 cap, 4:4:1, damage, economy, RNG, simulation-frequency or save-policy changes.','No Current/named-delivery replacement, commit, push or publication.']};
await fs.writeFile('reports/qa/performance-s04-20261020.json',JSON.stringify(proof,null,2)+'\n');await fs.writeFile(root+'/failures.json',JSON.stringify(failures,null,2)+'\n');
const labels={attributes:'纯属性',double:'双击',split:'分裂',bounce:'弹射',cleave:'顺劈',pierce:'穿透',dot:'DOT',moving:'移动附加',combined:'组合效果',acid:'24 酸区重叠','hero-raynor':'雷诺施法','hero-tosh':'托什施法',snapshot:'五弹道来源快照（未改）'},rows=data=>data.map(r=>`| ${labels[r.name]} / ${r.n} | ${r.oldMs.toFixed(6)} | ${r.newMs.toFixed(6)} | ${r.fasterPairs}/12 |`).join('\n');
const fps=summary.runs[0].measurements.filter(s=>!s.live&&!s.detail).map(s=>{const t=summary.runs[1].measurements.find(x=>x.name===s.name);return `| ${s.name} | ${s.fps.toFixed(2)} | ${t.fps.toFixed(2)} |`;}).join('\n');
await fs.writeFile('docs/project/PERFORMANCE_S04_20261020.md',`# S04 装备攻击及范围查询按需执行 · 2026-10-20

用户授权“开始S04”，本项已本地实现并验证。[范围证据](../../reports/qa/performance-s04-20261020.json)；[性能看板](PERFORMANCE_BOARD.html)。下一项 S08，尚未开始。

## 实现与保留

- 纯属性、双击或 DOT 等不使用公共附加候选的攻击，不再扫描／排序整场目标。分裂、顺劈、移动附加、穿透及暴击追击仍在原来的第一次派生伤害之前取得同一候选快照；不能移到命中后才取，避免改变新增／死亡目标的归属。
- 弹射每跳单遍选最近合法目标，以原 ID 决胜；每跳重新读存活、归属、位置、可见性和攻击线，保留死亡／转化影响。效果数值求和不再产生过滤数组；没有顺劈／穿透时跳过对应元数据／距离工作，穿透仍按当时位置重新排序。
- 重叠酸区的同源最大伤害改为直接遍历，去除 filter/map/spread 临时数组。没有改变区域及目标处理顺序，没有缓存跨命中结果；原每秒 gate、过期判断及尚未到 next 的覆盖区仍可贡献最大伤害。
- 英雄执行复用该次命令已经选中的目标。UI 预览仍每次重算，不能复用到之后的命令；原技能受益者冻结和落点／伤害查询保留。
- C12 空间索引扩展未采用：当前索引可能尚未反映两次重建之间的移动、新生和静态巢。新增过期索引／静态巢控制案例保持实时候选，碰撞与索引工作仍归后续 S07。
- SIM-007 来源快照共享未采用：独立弹道持有冻结目标关联与可独立修改的 DTO，不能一概共享。五弹道／删除来源后的到达控制精确；六次深复制保持，不宣称该路径收益。

## 成本对照

同一 Node 进程中的独立等价 World，12 次预热，12 对交替顺序。遍历／距离／复制计数在计时外；单位 ms/次，均包含报告中列明的临时输出重置。这些是局部 CPU，**不是整场帧率**。

实际账户发放／装备模块或套装并经完整 World.fire 的七套配装，均含合法 trueDps 词缀，300 背景敌人使用诊断高生命：

| 配装 / 数量 | 原实现 | 最终实现 | 较快对数 |
| --- | ---: | ---: | ---: |
${rows(legal.results)}

纯属性完整攻击约下降 67.3%，双击 63.8%，DOT 76.8%，各 12/12 对较快。顺劈只有 6/12，移动附加只有 7/12，不宣称稳定普遍收益。分裂模块还带弹射，与下表单独分裂分支不同。

隔离生产函数分支、区域、英雄及未改快照控制：

| 路径 / 数量 | 原实现 | 最终实现 | 较快对数 |
| --- | ---: | ---: | ---: |
${rows(cpu.results)}

300 目标纯属性分支实体访问 301→0、距离计算 4435→0；弹射距离计算 13053→1190。雷诺施法总空间查询 3→2，其中仍包含独立的伤害查询；托什实体遍历 3→2。单独分裂略慢、小酸区没有稳定改善，原始数据保留；来源快照控制两侧均 6 次复制。

## 正确性与真实画面

最终 **1690 项回归通过**（新增 6 项），类型与数据文档检查通过。**896 个旧／新状态检查点精确**，覆盖多种效果与实际配装、种子、密度、平局／逆序、隐形／死亡／转化、障碍、静态巢、过期索引、真伤预算、派生攻击与 DOT、酸区重叠／多来源／过期／追赶、全部英雄及预览后目标失效。六套实际配装各推进 360 固定步，逐次断言 tick 增加。新局 UUID 在动作前统一，未来回执不做宽泛输出清理；受控高生命和静止敌人不代表自然战役。

查尔 seed529、1440×900 DPR1、完整效果，实际浏览器包含属性航母、效果航母、9 个原生酸区、雷诺／托什主动四场景。固定画面／状态比较先全部完成，再采墙钟窗口，避免实时采样的不同推进历史污染之后的固定对照。八组固定／结束状态与活动源请求精确；每侧 12 个详细冻结／低探针冻结／详细实时窗口，冻结不推进，实时没有丢弃模拟欠账。酸区夹具显式清除恢复期，让每个来源立即触发三次原生攻击，仅用于覆盖重叠，不代表正常冷却。

低探针冻结 FPS 全量如下，跨页环境波动尚未归因，不据此宣称整场稳定提升。候选浏览器计时阶段还运行了一次约 4.48 秒的本地截图比对／联系表生成，因此这些浏览器窗口属于观察记录，不能当作无后台负载的整场收益基准；前述交替 Node 计时已单独完成：

| 场景 | 原实现 FPS | 最终 FPS |
| --- | ---: | ---: |
${fps}

主测页面／控制台错误 ${b.errors.length}/${c.errors.length}；请求取消 ${b.requests.length}/${c.requests.length}，逐条保留。四对截图及联系表已有限目视检查；全图差异像素依次为 ${pixels.pairs.map(p=>p.name+' '+p.changedPixels).join('、')}，四组战场区域（行 30—619）差异均为零。八组资源容量／增长计数差异总计 ${resourceDifferences.reduce((n,p)=>n+p.count,0)} 处，逐项列在证据中；活动源请求、提交量及可见输出分别对照，不把容量复用统计当作玩法差异。截图复制时暂缓对已绘制静帧的重复 WebGL 提交，前后断言 World 不变，之后恢复绘制；所有计时窗口正常绘制。不代表人类、物理输入或全内容 60 FPS 验收。

首次新增测试把雷诺独立伤害查询也算进选敌次数，修正计数范围后六项通过，未改生产实现。全量首轮 7 项受到临时文件重命名／本机连接权限限制，允许测试操作后 1690 全部通过。首轮浏览器在两组航母后因酸区夹具漏清原生恢复期而失败；R2 只改诊断夹具。第二轮旧版基线取得九酸区状态后截图 90 秒超时，具体原因未确定；同构建复查采用上述静帧复制方式，保留旧状态和有效航母图片，不将失败改标通过。生产三文件／Node 逻辑／计时输入不变，原构建和失败完整保留。

## 构建与后续

冻结 S01／S02 最终输入，仅 combat.ts、expedition-heroes.ts、zerg-elite-runtime.ts 三处生产逻辑变化，${source.candidate.inputs.length} 个浏览器输入、${source.nodeNew.inputs.length} 个 Node 输入绑定；渲染源码与资源不变，排除无关 economic-egg 改动。最终 JS：\`${source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256}\`。诊断入口：\`preview/performance-s04-20261020-candidate-r2/\`（4436）。

看板本项完成后为 49 项已完成 26、剩余 23；下一项 S08 未开始。未替换 Current／命名交付、提交／推送或发布。五图、完整效果、300 上限／4∶4∶1、模拟／经济／存档延期边界保持。
`);
console.log(JSON.stringify({status:proof.status,checks:logic.checks.length,document:'docs/project/PERFORMANCE_S04_20261020.md'}));
