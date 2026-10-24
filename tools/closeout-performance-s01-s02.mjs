import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s01-s02-20261020',read=async f=>JSON.parse(await fs.readFile(f,'utf8')),baseline=process.argv[2]??'browser-baseline-1',candidate=process.argv[3]??'browser-candidate-1';
const b=await read(root+'/'+baseline+'/report.json'),c=await read(root+'/'+candidate+'/report.json'),summary=await read(root+'/summary.json'),cpu=await read(root+'/cpu.json'),logic=await read(root+'/equivalence.json'),controls=await read(root+'/controls.json'),source=await read(root+'/source-proof.json'),pixels=await read(root+'/pixels.json');
const isolatedSummary=await read(root+'/isolated-summary.json'),isolatedPixels=await read(root+'/isolated-pixels.json'),ib=await read(root+'/isolated-baseline-2/report.json'),ic=await read(root+'/isolated-candidate-1/report.json');
assert.ok(b.pass&&c.pass&&summary.pass&&logic.pass&&source.pass&&isolatedSummary.pass&&ib.pass&&ic.pass);assert.equal(logic.checks.length,310);assert.equal(summary.pairs.length,5);assert.equal(pixels.pairs.length,5);assert.equal(isolatedPixels.pairs.length,2);
for(const p of pixels.pairs)if(!['carrier-equipment','main-hive'].includes(p.name))assert.equal(p.battleRows30to620,0,p.name);
for(const p of isolatedPixels.pairs)assert.equal(p.changedPixels,0,p.name);
for(const p of isolatedSummary.pairs)assert.equal(p.resourceDiff.length,0,p.case);
for(const x of ib.checkpoints.filter(x=>x.name.endsWith('-fixed')))assert.deepEqual(ic.checkpoints.find(y=>y.name===x.name).source.activeRequests,x.source.activeRequests);
const browserReview={isolatedSummary,isolatedPixels,visualReview:{contacts:[...pixels.contacts,...isolatedPixels.contacts],reviewed:true,result:'Seven image pairs reviewed. No obvious missing, black, misplaced or unreasonable effect changes. Primary two battle differences retained; two fixed-history rechecks RGB-exact.'},history:'Primary live intervals advanced differently; later retained AcidSalivaWeapon:2 pool capacities were 128 versus 64 while active output was exact. Fixed-only recheck has exact resource records and pixels. This establishes reproducibility with controlled history, not the precise cause of each primary pixel difference.',fpsConclusion:'All five primary frozen-low samples were slower in the candidate. No overall frame-rate gain demonstrated or attribution established; preserve all timing samples.'};
for(const r of [b,c]){assert.equal(r.errors.length,0);assert.equal(r.samples.length,15);for(const s of r.samples){if(!s.live)assert.equal(s.frozenExact,true);assert.equal(s.after.discarded-s.before.discarded,0);}}
for(const x of b.checkpoints.filter(x=>x.name.endsWith('-fixed')))assert.deepEqual(c.checkpoints.find(y=>y.name===x.name).source.activeRequests,x.source.activeRequests);
for(const x of source.changed)assert.equal(createHash('sha256').update(await fs.readFile(x.file)).digest('hex'),x.sha256);
const tests=await fs.readFile(root+'/full-tests-authorized.log','utf8');assert.match(tests,/pass 1684/);assert.match(tests,/fail 0/);
const proof={date:'2026-10-20',tasks:['S01','S02'],status:'verified-local',baseCommit:'be9e2982944314194c6dcc9dcc535bc321749eb4',base:'Accepted X04 R3 frozen sources plus only six simulation-file changes. No Git commit.',source,logic,cpu,controls,validation:{tests:1684,addedTests:8,testLog:root+'/full-tests-authorized.log',typecheck:root+'/typecheck-final.log',dataCheck:root+'/docs-check.log',browser:{baseline,candidate,summary,pixels,...browserReview,sourceActiveRequestsExact:true}},decisions:[{id:'SIM-001',result:'Per-cast density counted once; direct maximum with ID tie-break; zero/one candidate avoids pair work.'},{ids:['SIM-004','SIM-005'],result:'Single-pass boss heal/target selection retains eligibility and ID ties; retries every original eligible tick. Empty target scan remains, and its small CPU regression is retained.'},{id:'SIM-006',result:'Boss/lord Lurker uses its original timed mode cycle without the unused ordinary-near query.'},{id:'SIM-016',result:'Explicit special position skips unused connected-location enumeration; legal placement and RNG order retained.'},{id:'C04',result:'One-call carrier/child roster reused through initialization and paid replacement; duplicate cleanup removed. Live public queries and reserve rank are recomputed, all stat refresh points retained.'},{id:'C05',result:'Unresearched elite storm returns before target enumeration; feedback variant remains available and initial combat-state creation retained.'},{id:'C07',result:'Hydralisk fan chooses each best angular target without sorting the full pool; primary packet, ID tie-break and five launch order retained.'},{id:'C25',result:controls.decision}],failures:await read(root+'/failures.json'),limitations:['CPU results are scoped production-function measurements in Node, not whole-game FPS.','Single-target storm and empty boss target search did not improve; no reduced scan frequency or gameplay delay introduced.','Cross-run browser timing includes environmental variance and probes; report all samples without attributing overall FPS gains.','Fixed same-seed diagnostic worlds and health-lock browser scenes do not replace natural campaign, physical input or human acceptance.','Five maps, full effects, 300 cap, 4:4:1, simulation/economy/RNG rules and save deferral retained.','No Current or named-delivery replacement, commit, push or publication.']};
await fs.writeFile('reports/qa/performance-s01-s02-20261020.json',JSON.stringify(proof,null,2)+'\n');
const labels={'storm':'灵能风暴','boss-queen-empty':'女王无伤员','boss-queen':'女王有伤员','boss-lurker-empty':'Boss 空目标','boss-lurker':'Boss 有目标','carriers':'三艘航母','templar-no-tech':'精英圣堂未研究风暴','hydra-fan':'精英刺蛇扇形'};
const rows=cpu.results.map(r=>`| ${labels[r.name]} / ${r.n} | ${r.oldMs.toFixed(6)} | ${r.newMs.toFixed(6)} | ${r.fasterPairs}/12 |`).join('\n');
await fs.writeFile('docs/project/PERFORMANCE_S01_S02_20261020.md',`# S01／S02 战斗查询优化 · 2026-10-20

用户授权两项合批实施，已本地完成。[范围证据](../../reports/qa/performance-s01-s02-20261020.json)；[性能看板](PERFORMANCE_BOARD.html)。S04／S08 未在本批实施。

## 实现

- S01：每次施法为每个候选只统计一次邻近密度，按原密度最大／ID 最小规则直接选中目标。保留范围、可见性、攻击线、已有风暴排斥及原施法时序；零／一个候选无需密度循环。
- S02：Boss 治疗和选敌改为一次遍历选择最优值；Boss／领主潜伏者跳过未使用的近敌查询；给定位置的特殊单位跳过未使用的连通位置枚举；未研究风暴的精英圣堂提前退出，反馈型例外保留；精英刺蛇五弹道按原顺序选择角度最优目标。
- 航母在一次子系统调用内建立母子列表，复用初始化／付费补机查询并避免重复清理。公开归属查询及重型航母预备队资格仍读取当前状态。未跨模拟步缓存，未减少原属性刷新，母舰死亡、删除、转化和新增都在下一次调用立即生效。
- C25 主巢导弹保留逐枚获取存活目标的行为。前一枚伤害可能改变后一枚的目标集合，本轮没有选用跨导弹快照；20 枚导弹控制重放中 28 个死亡和命中顺序一致。该项无优化收益声明。

## 成本对照

同一 Node 进程、独立等价 World，预热后 12 对交替顺序。单位 ms/次；括号后的数量是目标场景背景实体数。施法基准包含重置能量、冷却和清空本次临时输出；航母使用 dt=0。遍历计数探针不进入计时。原始每轮及首轮候选均保留。

| 路径 / 数量 | 原实现 | 最终实现 | 较快对数 |
| --- | ---: | ---: | ---: |
${rows}

300 候选风暴距离计算从 1,209,300 次降到 90,300 次（含资格检查）；航母场景实体遍历从 28 次／8,932 个降到 19 次／6,061 个，距离计算不变。未研究风暴的精英圣堂目标遍历从 301 个到 0；给定特殊单位位置的连通枚举 1→0 且 RNG 不变。

单目标风暴和 Boss 空目标搜索没有改善，全部原始数据保留；不把密集场景收益外推至所有场景。特别是这些都是局部计算耗时，不是整场 FPS。浏览器的五场景短样本与模拟欠账另列，未据跨轮差值宣称整场帧率收益。

## 验证

最终 1,684 项回归通过（新增 8 项），类型及数据文档检查通过。旧／新生产实现 310 个检查点精确对照：四个种子、多种密度、ID 平局、插入顺序、死亡、隐形、障碍、无科技／无能量、冷却／前摇、五类 Boss、工事、精英反馈、五弹道及落点、航母付费补机／预备队晋升／转化／删除。六组完整 World 各实际前进 360 固定步并每 60 步对照，逐次断言 tick 增加。为防止诊断过早结束，源初始生命提高并保留一个静止守卫；这些是受控回放，不是自然战役。

控制夹具在动作前设置相同新局 UUID 输入，未来结算／掉落回执不做宽泛字符串清理。比较完整选择的运行字段、技能状态、视觉／攻击事件、账户与装备战斗状态；早期未统一输入导致的结算／Boss 回执差异失败单独保留。

真实浏览器使用查尔 seed529、1440×900 DPR1、完整效果，灵能、Boss、随机精英、航母装备、主巢五组实际绘制，每组冻结详细／冻结低探针／实时详细三个窗口。五组固定状态和活动源请求一致；冻结不推进状态，实时没有丢弃模拟欠账。主测页面／控制台错误均为 0，保留 11／5 条取消请求。截图与有限目视检查不代表人类或自然完整战役验收。

主测低探针冻结 FPS 按上述五组顺序为 22.80→18.55、48.49→38.31、52.66→39.02、20.32→15.78、47.74→35.22，候选均较低。变化原因未归因，本批未证明整场帧率提升；全部详细／低探针／实时记录保留。

主测灵能与 Boss 全图 RGB 相同；随机精英仅界面 337 像素最大差 2。航母战场 290 像素最大差 27、主巢 52 像素最大差 1，保留原图和记录。主测穿插实时窗口的推进历史不同，后四场保留的 AcidSalivaWeapon:2 容量出现 128 对 64，活动绘制和状态仍一致。仅对受影响的航母／主巢做同构建、无实时采样的固定时序复查：两组完整 RGB、状态、活动请求和资源容量均精确一致，页面／控制台错误 0，取消请求 9／7。该复查确认受控历史下可重复，不将首轮像素差异的具体原因写成已证实。三张联系表共七对画面已查看，无明显缺失、黑闪、错位或尺度异常。

首次固定时序复查因验证脚本分支误入旧 X04 专属路径而主动停止，保留报告并修正脚本后重跑；没有改变生产源码。

完整回归首轮 7 项因沙箱本机连接／临时文件重命名权限失败；允许测试操作后 1,684 项全部通过。预览服务启动曾因已有 4436 服务而失败，复用原服务；历史失败不改写。

## 构建和后续

基线沿用 X04 最终输入，仅六处模拟文件变化，${c.build.inputs.length} 个浏览器编译输入；排除无关 economic-egg 改动。最终 JS：\`${c.build.outputs.find(x=>x.file.endsWith('/main.js')).sha256}\`。诊断入口：\`preview/performance-s01-s02-20261020-candidate/\`（4436）。

未替换 Current／命名交付、提交／推送或发布。五图、画质、300 上限／4∶4∶1、模拟频率、经济和存档延期保持。看板两项完成后为 49 项已完成 25、剩余 24；下一项 S04，尚未开始。
`);console.log(JSON.stringify({status:proof.status,checks:logic.checks.length,changed:source.changed.map(x=>x.file),document:'docs/project/PERFORMANCE_S01_S02_20261020.md'}));
