import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-r02-20261020',run=process.argv[2]??'browser-final',doc='docs/project/PERFORMANCE_R02_20261020.md',reportFile='reports/qa/performance-r02-20261020.json',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex'),median=x=>{x=x.slice().sort((a,b)=>a-b);return (x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2;};
const browser=await read(root+'/'+run+'/report.json'),pixels=await read(root+'/'+run+'/pixels.json'),review=await read(root+'/visual-review.json'),equivalence=await read(root+'/equivalence.json'),boundaries=await read(root+'/boundaries.json'),stress=await read(root+'/resource-stress-equivalence.json');
for(const r of [browser,equivalence,boundaries,stress])assert.equal(r.pass,true);assert.equal(review.run,run);assert.equal(review.reviewed,true);
assert.equal(Number(await fs.readFile(root+'/typecheck.exit','utf8')),0);assert.equal(Number(await fs.readFile(root+'/docs-check.exit','utf8')),0);assert.equal(Number(await fs.readFile(root+'/network-recheck.exit','utf8')),0);
assert.match(await fs.readFile(root+'/tests.log','utf8'),/pass 1714/);assert.match(await fs.readFile(root+'/network-recheck.log','utf8'),/pass 16/);
const cpu=await read(root+'/cpu-pair.json'),corrected=await read(root+'/cpu-pair-resource-stress1000.json');cpu.rows=cpu.rows.map(r=>r.name==='resource-stress1000'?corrected.rows[0]:r);
const cpuRows=cpu.rows.map(r=>({...r,percent:100*(1-r.median[1]/r.median[0]),faster:r.samples[0].filter((v,i)=>r.samples[1][i]<v).length}));
const renderRows=browser.scenes.map(s=>{const values=['baseline','candidate'].map(v=>s.cpu.filter(r=>r.name===v)),times=values.map(v=>median(v.map(r=>r.perCallMs)));return {name:s.name,medianMs:times,percent:100*(1-times[1]/times[0]),faster:values[0].filter((r,i)=>values[1][i].perCallMs<r.perCallMs).length,groundCallsPerFrame:values.map(v=>v[0].groundCalls/v[0].calls),labelMutationsPerFrame:values.map(v=>v[0].labelMutations/v[0].calls),counts:values[1][0].counts};});
const baseline=await read('preview/performance-r01-20261020-candidate-r2/build-inputs.json'),candidate=browser.build,production=candidate.inputs.filter(i=>i.file.startsWith('src/')),changed=production.filter(i=>baseline.inputs.find(b=>b.file===i.file)?.sha256!==i.sha256).map(i=>i.file).sort();
assert.deepEqual(changed,['src/render/units/equipment-drops.ts','src/render/units/equipment-loot-style.ts','src/simulation/starship/drops.ts','src/simulation/world.ts']);
for(const file of changed)assert.equal(hash(await fs.readFile(file)),production.find(i=>i.file===file).sha256);
const prior='reports/local/performance-r01-20261020/candidate-r2-web-inputs/',oldRenderer=candidate.inputs.find(i=>i.file===prior+'src/render/units/equipment-drops.ts');assert.equal(oldRenderer.sha256,baseline.inputs.find(i=>i.file==='src/render/units/equipment-drops.ts').sha256);
const row=n=>cpuRows.find(r=>r.name===n),fmt=n=>n.toFixed(6),pct=n=>n.toFixed(1),shader=candidate.outputs.find(o=>o.file.endsWith('/main.js')),natural=(await read('reports/qa/performance-b03-20261019.json')).natural;
const table=cpuRows.map(r=>`| ${r.name} | ${fmt(r.median[0])} | ${fmt(r.median[1])} | ${pct(r.percent)}% | ${r.faster}/12 |`).join('\n');
const renderTable=renderRows.map(r=>`| ${r.name} | ${fmt(r.medianMs[0])} | ${fmt(r.medianMs[1])} | ${pct(r.percent)}% | ${r.groundCallsPerFrame.join(' → ')} | ${r.labelMutationsPerFrame.join(' → ')} |`).join('\n');
const text=`# R02 矿气、装备拾取与标签布局 · 2026-10-20

用户授权“开始R02”。本批完成四处生产代码优化和局部验证，看板移为已完成。50项完成33、剩余17，下一项R03尚未开始。A01仅补SAVE-006当前结论，整体仍未完成。

## 改动与保留

- 矿气每轮筛选只计算一次拾取半径。每份资源仍独立执行原增产、暴击/丰收随机数、悬赏与幂等回执，保留严格小于的2/6倍半径及路径判断。
- 自动装备拾取复用本轮已通过距离和路径检查的候选，消除再次全表查找和重复路径检查。底层背包位置、容量和实例检查保留；UI入口仍独立查找并验证，暂停租约语义保持。
- 被压制标签用单遍最近选择代替复制/排序，保持稳定等距首项。原质量/距离/ID顺序、56/140像素聚合、垂直避让、6/12标签上限和HUD避让规则保持。
- 装备本体与同品质光柱在同帧复用高度和旋转种子；标签仅在属性改变时写DOM，无需每帧先全部隐藏再显示。投影和布局仍每帧更新，名称变化、尺寸/镜头变化仍即时处理。

既有地面列表缓存、同品质光柱分组是原实现，不重复计收益。没有掉落TTL、合并物品、删减白/橙光柱、缩减装备/矿气收益或新渲染容量限制。ResourceDrops原模型、1000/类型现有绘制容量与投影路径未改；这不是全局掉落扫描消除。

## 规模与方法

代表规模来自[B03原生控制器证据](PERFORMANCE_B03_INTERACTION_LONGRUN_20261019.md)：简单人族、seed529、白装，18关加720秒无尽，共151200步；分别记录矿物181、气体75、总拾取物181、地面装备18、背包64。矿/气可在同一个拾取物中重叠。本轮组合这些历史峰值重建受控场景，不声称它们来自同一自然时刻，也未重跑完整战役。

另测96地面装备、64满包、500仓库历史和1000份正值矿气压力。96件自动拾取遵守64背包上限，遇满包后按原规则停止。1000资源是单独压力，不是自然峰值。

Node同进程串行12对交替；每局部拾取/整步样本40次，标签100/500次，预热后取样，全部样本保留。拾取计时恢复账户/掉落/钱包等；整步还恢复time/tick，但保留无对手单位和其他装备运行态历史，所以是低战斗受控固定步成本，并非严格完整状态重建的整场基准。完整状态正确性由独立配对运行证明。

浏览器核心采用browser-5已完成的15对和72计时窗口；其后窄屏断言失败保留原状态。尺寸/生命周期采用独立browser-6，最终派生报告只合并明确通过的范围，两者bundle相同。每组A/B在同页、同World/镜头切换原版与候选EquipmentDrops，共用同一THREE模块。两侧先在相同落地年龄预热并重置；每轮25次预热、100次局部render、12对交替。测的是JS、矩阵生成和DOM提交，不含最终样式布局/绘制呈现的完整帧时；未测本批GPU收益，也不换算FPS。

## 实测局部CPU

下表单位毫秒，下降为负表示回退。

| 场景 | 原版中位 | 候选中位 | 下降 | 候选较快 |
|---|---:|---:|---:|---:|
${table}

空场微小回退及所有慢样本保留。尤其不能把96件全部收进背包或把1000件当作实际自然峰值。

| 浏览器装备绘制 | 原版ms | 候选ms | 下降 | 每帧高度查询 | 每帧标签属性写入 |
|---|---:|---:|---:|---:|---:|
${renderTable}

这些都是局部成本，不能相加，也不代表完整战斗或全内容60FPS已达标。

## 规则与画面核验

- ${equivalence.checks}项正式新旧对照：24组数量/远近/包容量，释放真实空位后继续收取；12组矿气/装备/天赋/阻挡组合各180固定步，完整状态、钱包、回执和两套RNG精确；100种子×4数量×2宽度标签布局，等距及2.5米边界/暂停/旧图/UI暂停入口保持。
- 4个额外动态边界：矿气2/6倍严格临界、换装后的下一步半径、一次资源爆发中悬赏精英晋升并进化为5级英雄、地形阻挡解除；原版/候选状态精确。正值1000资源压力${stress.steps}步对照也精确。
- 原有1721项回归首轮1714通过、7项本机网络访问受限；对应三个文件在允许访问本机服务后16项全通过。类型、数据文档校验通过。没有把权限失败原记录改为通过。
- 真实查尔1440×900 DPR1完整效果，peak/stress/full三场景各0/.2/.45/.8/2秒：${browser.scenes.reduce((n,s)=>n+s.pairs.length,0)}对完整状态/实例矩阵/颜色/标签/数量精确；390×844和1920×1080、暂停/关间返回/锚点远近/名称变化另有${browser.transitions.length}对。实际满包提示→销毁一件→拾取成功→重试失败与吸附飞行精确。
- 实际WebGL丢失/恢复epoch ${browser.recovery.before.epoch}→${browser.recovery.after.epoch}；time/tick/RNG保持，完整World仅notice/noticeUntil归一后精确。最终活动渲染器为生产候选。
- ${browser.screens.length}张截图已逐组查看，${pixels.comparisons.length}组像素对照中${pixels.comparisons.filter(p=>p.changedPixels===0).length}组RGB精确，其余每组最多${Math.max(...pixels.comparisons.map(p=>p.changedPixels))}像素不同、最大通道差${Math.max(...pixels.comparisons.map(p=>p.maxChannel))}；小范围差异未完全归因，不冒称全图精确。${review.summary}。页面/控制台错误${browser.errors.length}，请求失败${browser.requests.length}条明细原样保留。自动验证不替代人类试玩。

## 失败、测量边界与审计

保留最初readonly duration夹具失败；禁用舰装与无效天赋键造成的先导对照/计时；空地面满包释放后63格的断言错误；1000压力初版819个空资源占位；浏览器沙箱网络拒绝；第一轮显卡池容量32/64预热历史差异；压力夹具的非法污染模块；两次窄屏先导未等待原生80毫秒稳定提交完成；第一份修正1000资源计时与正确性检查短时重叠。分别修正夹具/权限/准备流程，游戏实现未为通过测试改变。初版1000压力行不用于最终收益，正式修正为1000份正值矿物、414份含气体。

SAVE-006：地面有效物品继续保留；矿气仍逐步访问，装备仍按原账户修订缓存地面列表。删除重复查询/排序/写入后局部成本下降，但没有采用TTL或收益合并，长期物品保留政策仍为D03待讨论，A01其余条目继续待办。

## 构建与交付边界

- 基线main引用仍为be9e2982944314194c6dcc9dcc535bc321749eb4；对照源冻结自R01最终candidate-r2输入。
- 最终诊断入口：\`preview/performance-r02-20261020-candidate-r3/\`，本机4436。${candidate.inputs.length}编译输入，其中${production.length}个src；额外旧版比较器只在诊断入口。只改上述4个生产文件，排除无关economic-egg修改。
- 最终JS SHA-256：\`${shader.sha256}\`。Node原版/候选、旧版渲染源码、运行器、截图和失败记录均绑定到[范围报告](../../${reportFile})。
- 未替换Current/命名HTML、提交/推送或发布。300上限、4∶4∶1、五图冻结、模拟经济和存档延期保持；自然战役、物理输入、人类体验、全内容60FPS和整体MVP仍开放。
`;
await fs.writeFile(doc,text);
const evidenceFiles=[doc,root+'/equivalence.json',root+'/boundaries.json',root+'/resource-stress-equivalence.json',root+'/cpu-pair.json',root+'/cpu-pair-resource-stress1000.json',root+'/fixture-errors.txt',root+'/tests.log',root+'/network-recheck.log',root+'/typecheck.log',root+'/docs-check.log',root+'/visual-review.json',root+'/'+run+'/report.json',root+'/'+run+'/pixels.json',root+'/'+run+'/runner.mjs',...browser.sourceReports.flatMap(r=>[r.file,r.runner]),...review.contactSheets,...browser.screens.map(s=>s.file),...candidate.outputs.map(o=>o.file),...changed,'tools/performance-r02-cases.mjs','tools/measure-performance-r02.mjs','tools/verify-performance-r02.mjs','tools/verify-performance-r02-boundaries.mjs','tools/performance-r02-runtime.ts','tools/build-performance-r02.mjs'];
const files=[];for(const file of evidenceFiles){const bytes=await fs.readFile(file);files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
const report={schemaVersion:1,id:'performance-r02-20261020',status:'verified-local',source:{frozen:prior,changed,inputs:candidate.inputs.length,productionInputs:production.length,outputs:candidate.outputs,oldRenderer,excluded:candidate.overrides},naturalScaleSource:{file:'reports/qa/performance-b03-20261019.json',...natural,rerun:false,combinedPeakFixture:true},cpu:{method:cpu.method,rows:cpuRows,renderer:renderRows,renderMethod:'Same-page exact prior renderer / actual candidate, shared THREE, 12 alternating pairs, 25 warmups then 100 render calls. Component JS/matrix/DOM submission only; no end-to-end layout/paint/FPS.'},verification:{equivalenceChecks:equivalence.checks,boundaries:boundaries.checks,resourceStress:stress,tests:{total:1721,initialPass:1714,initialNetworkFailure:7,targetedRecheckPass:16,typecheck:0,docsCheck:0},scenes:browser.scenes.map(s=>({name:s.name,pairs:s.pairs})),transitions:browser.transitions,pickup:browser.pickup,recovery:browser.recovery,errors:browser.errors,requestFailures:browser.requests},pixels,review,browserSourceReports:browser.sourceReports,scopeValidation:browser.scopeValidation,audit:{'SAVE-006':'Remove repeated synchronous candidate lookup, radius calculation, label sorting and redundant DOM writes. Keep valid loot, existing ground cache / light grouping and full scans where necessary. No TTL or yield merging; D03 undecided.'},retainedFailures:await fs.readFile(root+'/fixture-errors.txt','utf8'),limits:['Local CPU/component results are not whole-frame FPS, GPU improvements or full-content60FPS.','B03 separate peaks combined in controlled fixtures; no new natural campaign run.','No Current replacement, commit/push or publication; save deferral and accepted maps unchanged.'],artifacts:{documentation:doc,preview:'preview/performance-r02-20261020-candidate-r3/',files}};
await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
const boardFile='docs/project/performance-board.json',board=await read(boardFile),task=board.tasks.find(t=>t.id==='R02');assert.equal(task.status,'待验证');const evidence=['PERFORMANCE_R02_20261020.md','../../'+reportFile];
task.status='已完成';task.updated='2026-10-20';task.evidence=evidence;task.result=`四处重复工作优化完成；18/96件自动拾取CPU ${fmt(row('pickup-peak18').median[0])}→${fmt(row('pickup-peak18').median[1])} / ${fmt(row('pickup-stress96').median[0])}→${fmt(row('pickup-stress96').median[1])}ms，局部非FPS。1065+4状态/边界、正值1000压力、1721回归覆盖、实际15对矩阵/标签和恢复通过，${browser.screens.length}图已查看。原收益/随机数/满包/半径/白橙光柱保持；全部先导失败、空场小回退及像素差异保留。`;
board.auditRows.find(r=>r.id==='SAVE-006').currentReview='2026-10-20 R02部分优化并明确保留：'+report.audit['SAVE-006'];
const a01=board.tasks.find(t=>t.id==='A01');a01.result+=' R02补SAVE-006当前结论：消除重复查询/排序/DOM写入，不删有效掉落；长期TTL/收益合并仍D03未决，169条整体未完成。';a01.evidence=[...new Set([...a01.evidence,...evidence])];a01.updated='2026-10-20';
const d03=board.tasks.find(t=>t.id==='D03');d03.evidence=[...new Set([...d03.evidence,...evidence])];d03.updated='2026-10-20';d03.result+=' R02已减少重复查询/标签写入并保留全部有效地面物品；TTL、收益合并或清理规则仍未批准实施。';
const scene=board.scenes.find(s=>s.id==='SC06');scene.status+='；R02按B03峰值组合与96装备压力复验，拾取/标签局部CPU下降，实际光柱/飞行/满包/恢复保持；不代表自然FPS';board.next='R03';board.revision++;board.updated='2026-10-20';board.updates.push({date:'2026-10-20',tasks:['R02','A01'],change:`R02待验证→已完成。四处实现，1065+4状态/规则对照、正值1000压力及真实绘制/恢复通过，${browser.screens.length}图已查看。18/96拾取局部CPU约下降${pct(row('pickup-peak18').percent)}/${pct(row('pickup-stress96').percent)}%；不算整场FPS，原失败/回退保留。A01补SAVE-006；50项完成33、剩余17，下一项R03未开始。`,evidence});assert.equal(board.tasks.filter(t=>t.status==='已完成').length,33);await fs.writeFile(boardFile,JSON.stringify(board,null,2)+'\n');
const nav=`2026-10-20 R02已完成：[矿气、装备拾取与标签布局](project/PERFORMANCE_R02_20261020.md)。规则/矩阵/标签及真实恢复通过，18/96装备拾取局部CPU约下降${pct(row('pickup-peak18').percent)}/${pct(row('pickup-stress96').percent)}%，保留全部收益与光柱；非整场FPS。50项完成33、剩余17，下一项R03未开始。\n\n`;
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){const t=await fs.readFile(file,'utf8'),at=t.indexOf('\n\n');await fs.writeFile(file,t.slice(0,at+2)+nav+t.slice(at+2));}
const agents=`## R02 矿气装备拾取与标签完成 · 2026-10-20

- 用户授权R02。说明docs/project/PERFORMANCE_R02_20261020.md，证据reports/qa/performance-r02-20261020.json；50项完成33、剩余17，下一项R03未开始。A01补SAVE-006，整体未完成，D03仍待讨论。
- 四处生产修改：矿气每轮半径一次求值，自动装备拾取复用已验证候选，标签最近归并单遍选择，同帧高度/旋转复用及仅变化时写DOM。增产/暴击/丰收/悬赏/RNG仍逐件，满包64/可达性/实例/2.5米边界与白橙光柱保持，无TTL或收益合并。
- 同进程12对串行，18/96装备拾取${fmt(row('pickup-peak18').median[0])}→${fmt(row('pickup-peak18').median[1])} / ${fmt(row('pickup-stress96').median[0])}→${fmt(row('pickup-stress96').median[1])}ms；已有缓存/光柱分组不重复计收益。浏览器局部render/DOM、受控低战斗固定步和纯布局单列，非整场FPS/GPU或60FPS验收；空场小回退保留。
- 1065正式对照+4动态边界、正值1000资源压力通过；1721回归首轮1714通过/7本机网络权限失败，三个文件定向16通过，类型/数据通过。实际三场景15对落地年龄、8边界及吸附飞行矩阵/颜色/标签/World精确；WebGL epoch${browser.recovery.before.epoch}→${browser.recovery.after.epoch}，time/tick/RNG保持，World仅notice归一。${browser.screens.length}图已查看，像素差异/错误/取消详见报告。
- 禁用舰装/错误天赋键先导、空包断言、初版1000中819空资源占位、重测与正确性短时重叠、非法污染模块、未等待resize事件的窄屏先导、沙箱浏览器拒绝、两侧预热历史造成32/64容量差异均保留；正式夹具补正并验证实际拾取。B03分别峰值181矿/75气/18装备组合重建，不是本轮自然战役或同时峰值证明。
- 最终JS ${shader.sha256}，${candidate.inputs.length}输入/${production.length}src，冻结R01仅改4处并排除economic-egg；诊断入口preview/performance-r02-20261020-candidate-r3/（4436）。未替换Current、提交/推送或发布；300/4∶4∶1、五图、完整效果、经济、存档延期及自然/物理/人类/MVP边界保持。

`;await fs.writeFile('AGENTS.md',agents+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:reportFile,doc,revision:board.revision,completed:33,next:board.next,files:files.length,renderRows}));
