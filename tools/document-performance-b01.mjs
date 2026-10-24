import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-b01-20261019',report=JSON.parse(await fs.readFile(root+'/summary.json','utf8'));
const runs=report.summary.map(s=>s.run),raw=await Promise.all(runs.map(r=>fs.readFile(`${root}/${r}/report.json`,'utf8').then(JSON.parse)));
assert.ok(raw.every(r=>r.passed&&r.frozenStateExact));assert.equal(report.assetManifest.equal,true);
const f=n=>n.toFixed(2),range=values=>`${f(Math.min(...values))}–${f(Math.max(...values))}`;
const samples=report.summary.flatMap(r=>r.samples.map(s=>({...s,run:r.run}))),native=samples.filter(s=>s.label==='native-low-probe'),frozen=samples.filter(s=>s.label.startsWith('frozen-low-probe')),detailed=samples.filter(s=>s.label==='frozen-cpu-gpu');
const inputCount=report.inputs.inputs.length,bundle=report.inputs.outputs.find(o=>o.file.endsWith('/main.js'));
const failureAdjudication=[
 {run:'run-1',verdict:'未采样',reason:'沙箱浏览器访问本机服务返回 ERR_NETWORK_ACCESS_DENIED。'},
 {run:'run-2',verdict:'未采样',reason:'浏览器无法访问沙箱内服务，ERR_CONNECTION_TIMED_OUT；后续使用独立本机服务。'},
 {run:'run-3',verdict:'无效基线',reason:'旧夹具选择了随机精英预算扣减后的空普通波次，Math.max([]) 使时间无效，实际敌人 0。原始 passed=true 仅反映当时不充分的检查，最终明确否决；原文件不改写。'},
 {run:'run-4',verdict:'先导样本',reason:'有效 300 敌人及 CPU/GPU/欠账记录；资源 URL 仅匹配根路径，清单计数 1 不完整。后续修正为匹配任意 /assets/ 前缀，最终基线使用 run-5/run-6。'},
 {run:'run-3/run-4/run-5',verdict:'方法文字勘误',reason:'方法文字曾误写 Mar Sara。chooseCampaignMap 的第二参数是排除的上一地图；实际 runConfig、截图及状态始终为 Char/version3/seed529。run-6 修正方法文字，游戏 bundle 未变，最终报告统一按真实查尔记录，不与旧玛萨拉样本作前后收益比较。'}
];
const scoped={schemaVersion:1,created:new Date().toISOString(),task:'B01',status:'已完成',sourceCommit:report.commit,scope:'冻结当前 main 的最小可重复性能基线；只改变诊断/测量工具与文档。不是 B02/B03 全场景、60 FPS 或 MVP 验收。',report,failures:failureAdjudication,validation:{gameSourceAndTestsUnchanged:true,fixtureTimeChecks:JSON.parse(await fs.readFile(root+'/fixture-time-check.json','utf8')),pageErrors:raw.map(r=>({run:r.run,errors:r.errors,requestCancellations:r.requestFailures.filter(x=>x.failure?.errorText==='net::ERR_ABORTED').length,otherRequestFailures:r.requestFailures.filter(x=>x.failure?.errorText!=='net::ERR_ABORTED')})),visualReview:{files:['run-4','run-5','run-6'].flatMap(r=>['fixture.png','native-end.png'].map(f=>`${root}/${r}/${f}`)),count:6,findings:'已查看实际密集战场、效果、当前 UI 和原生推进后的画面；未发现缺失模型或错误页。密集遮挡及地图明暗沿用既有边界，不作为本轮新修复。'},regressionScope:'游戏 src/test 未修改；本轮不重复宣称完整玩法回归已重跑。仅编译绑定、72 项夹具时间检查、三轮有效浏览器样本及成对状态/资源验证。'},next:'B02'};
await fs.writeFile('reports/qa/performance-b01-20261019.json',JSON.stringify(scoped,null,2)+'\n');
const rows=samples.map(s=>`| ${s.run} / ${s.label} | ${f(s.fps)} | ${f(s.framesMs.p50)} / ${f(s.framesMs.p95)} / ${f(s.framesMs.p99)} | ${s.renderCpuMs.count?f(s.renderCpuMs.mean):'—'} | ${s.gpuMs.count?f(s.gpuMs.mean):'—'} | ${f(s.simulatedSeconds)} / ${f(s.wallSeconds)} | ${f(s.backlogEnd)} |`).join('\n');
const doc=`# B01 当前主线性能基线 · 2026-10-19

B01 已完成：当前 main 的最小对照可以重复运行，输入、输出、实际资源、设备与状态已绑定。游戏玩法与渲染源代码未改变，本轮优化收益为 **未实施／不适用**。下一项为 B02；SC01–SC04 全覆盖和 B03 长局/加载/交互仍未完成。

[固定看板](PERFORMANCE_BOARD.html) · [唯一状态源](performance-board.json) · [范围报告](../../reports/qa/performance-b01-20261019.json) · [原始汇总](../../${root}/summary.json)

## 构建与运行条件

- main：\`${report.commit}\`；src/test 相对 HEAD 无差异。既有其他文档和私有资源工作保留；不提交、推送或替换 Current。
- ${inputCount} 个实际编译输入保存哈希和原字节；最终 JS：\`${bundle.sha256}\`。HTML/CSS 哈希及工具、依赖锁定文件另存。
- 采用生产 boot、World、BattleRenderer、HUD 与当前舰装挂载；独立内存账户及诊断入口。与普通 src/main.ts 入口不同之处仅为可见的固定场景控制、蓝装测试配置、锁血和探针；不把诊断构建当作普通入口的无探针样本。
- 实际地图 **查尔**，recipe version3、seed529；人族、蓝色散件、地狱18跳关、友军锁血，镜头 fixed/pitch50/zoom0.9。960 固定模拟步，每步真实绘制；基线 time=${report.summary[0].fixture.time}、tick=${report.summary[0].fixture.tick}，实际 ${report.summary[0].fixture.enemies} 个敌人。
- 当前 300 上限、4∶4∶1 波次生成、随机精英与 Boss 规则保持。即时存活密度数 194/85/21 包含击杀与补位影响，不宣称战场每时刻恰为 4∶4∶1。
- Windows ${raw[0].host.release}，${raw[0].host.cpu.model.trim()}，${raw[0].host.logicalCpus} 逻辑核；内存 ${(raw[0].host.memoryBytes/1024**3).toFixed(2)} GiB。${report.summary[0].device.gpu}。
- ${report.summary[0].device.userAgent}；独立 fresh headless Chrome profiles。1440×900、DPR1，实际绘制缓冲 1440×900，原生分辨率／完整普通特效／完整英雄特效／完整动画。
- 两轮各请求 ${report.assetManifest.count} 个资源，清单完全一致、所有实际文件 SHA-256 校验通过，合计 ${report.assetManifest.bytes} 字节。编译输入及产物收尾检查无漂移。

## 当前结果

两轮正式基线 ${runs.join('、')}：冻结低探针 ${range(frozen.map(s=>s.fps))} FPS；实时低探针 ${range(native.map(s=>s.fps))} FPS。约10秒墙钟仅推进 ${range(native.map(s=>s.simulatedSeconds))} 秒模拟，期末保留 ${range(native.map(s=>s.backlogEnd))} 秒欠账。实时窗口丢弃模拟时间均为 0。

冻结探针窗口平均渲染 CPU ${range(detailed.map(s=>s.renderCpuMs.mean))} ms、GPU ${range(detailed.map(s=>s.gpuMs.mean))} ms。两者异步重叠，不能相加。当前数据支持继续定位渲染 CPU 热点；没有借本轮测量关闭任何优化或 60 FPS 目标。

| 样本 | FPS | 帧间隔 P50/P95/P99 ms | 渲染 CPU 均值 ms | GPU 均值 ms | 模拟/墙钟 秒 | 期末欠账 秒 |
| --- | ---: | --- | ---: | ---: | --- | ---: |
${rows}

完整逐帧时间、CPU step/advance/HUD 包含关系、GPU query 数量/尾部未完成数、绘制次数/三角面/上传采样与模拟积压保留在原始报告。Frozen low-probe A/B 夹住同状态的详细探针样本；不据两次短样本推断探针开销为零。native 详细探针是在后续演化窗口，不能拿它与前窗做严格开销或优化比较。

## 重复性和验证范围

- 两次状态只归一实际新局 UUID；${report.normalization.rawDifferences.length} 个原始差异路径逐项保留，后缀、time/tick、RNG、实体、事件、经济、装备账户均未忽略。归一 SHA-256：\`${report.normalization.hash}\`。状态覆盖 selectRunData 显式字段、战斗状态、敌方技能及完整装备账户；不是所有运行时缓存的序列化断言。
- 各自冻结测量前后原始状态完全相同，GPU disjoint=0；异步尾部查询计数并排除，未伪填为零。
- 低探针保留时间戳和步数/欠账读取，不能称无探针生产环境。CPU span 有包含关系；GPU 与 CPU 分开。上传只统计 Float32 texSubImage2D 和 typed bufferSubData，不宣称全量上传。
- 诊断 freeze/play 会重置窗口之间的累积；每个实时窗口在 freeze 前捕获欠账及 discarded 增量，诊断重置另列 afterDiagnosticFreeze，绝不算作追平。
- 72 个四难度×18关夹具时间检查通过；源游戏未改，未重复运行或冒称全套玩法回归。已查看3轮有效样本共6张截图；正式两轮页面/控制台错误0，请求取消分别 ${raw.map(r=>r.requestFailures.filter(x=>x.failure?.errorText==='net::ERR_ABORTED').length).join('/')} 条，保留明细。
- 当前仅 SC02 的一个混合密集场景起点。B02 继续三族普通开局、近战/远程、治疗/护盾/群攻/结束空场、精英/Boss/装备代表场景。自然战役、物理输入、人类体验、温控试验、全内容60FPS及整体MVP均未验收。

## 失败、先导和文字勘误

${failureAdjudication.map(x=>`- **${x.run}：${x.verdict}**。${x.reason}`).join('\n')}

全部原始记录、旧构建与截图保留。run-3 的约50FPS空战场数值明确不计入性能结论；run-4 仅为先导，不混入正式两轮范围。

## 复跑

在项目根目录运行 \`node tools/build-performance-b01.mjs\` 生成独立入口；服务使用 \`tools/serve-performance-preview.mjs\`，PORT=4436。每次以新的 SC2_B01_RUN 子目录运行 \`node --import tsx tools/qa-performance-b01.mts\`，SC2_B01_PORT=4436。两次均完成后运行 \`node tools/summarize-performance-b01.mjs <run-a> <run-b>\`，检查两轮状态及资源一致再更新记录。不要覆盖已存样本。

当前本机入口：[诊断预览](http://127.0.0.1:4436/performance-b01-20261019/?gear=3)。新局默认冻结；该入口供诊断复跑，普通正式交付不变。源快照位于 ${root}/inputs；本批基线无需启用存档。
`;
await fs.writeFile('docs/project/PERFORMANCE_B01_BASELINE_20261019.md',doc);
const boardPath='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(boardPath,'utf8')),task=b.tasks.find(t=>t.id==='B01');
task.status='已完成';task.updated='2026-10-19';task.result=`当前 main 的最小可复跑基线已冻结：查尔 seed529、300敌人、完整画质，429编译输入及${report.assetManifest.count}实际资源绑定，两轮状态仅归一新局UUID后完全相同。实时${range(native.map(s=>s.fps))} FPS；约10秒仅推进${range(native.map(s=>s.simulatedSeconds))}秒，欠账保留。未实施优化；空波次旧夹具失败及资源记录先导已单列，SC01–SC04完整覆盖留给B02。`;
task.evidence=['PERFORMANCE_B01_BASELINE_20261019.md','../../reports/qa/performance-b01-20261019.json',`../../${root}/summary.json`];
b.baseline.measurements=`B01 已于2026-10-19冻结当前 main 的首个可复跑查尔300敌人诊断基线；两轮实时${range(native.map(s=>s.fps))} FPS，尚未达到60FPS。未实施新优化，三族及其他代表场景由B02/B03继续。`;
b.scenes.find(s=>s.id==='SC02').status='已录首个混合300敌人基线；近战/远程分组待B02';b.next='B02';b.revision++;b.updated='2026-10-19';
b.updates.push({date:'2026-10-19',tasks:['B01'],change:`B01 进行中→已完成。完成当前 main 编译/资产/设备绑定、两轮固定状态及CPU/GPU/帧时间/模拟欠账采样；保留2次连接失败、1次无效空波次样本、资源记录先导及地图文字勘误。实测无优化收益；下一项B02，B02/B03未开始。`,evidence:task.evidence});
await fs.writeFile(boardPath,JSON.stringify(b,null,2)+'\n');
console.log(JSON.stringify({doc:'docs/project/PERFORMANCE_B01_BASELINE_20261019.md',report:'reports/qa/performance-b01-20261019.json',fps:range(native.map(s=>s.fps)),next:b.next}));
