import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-u04-20261020',doc='docs/project/PERFORMANCE_U04_20261020.md',reportFile='reports/qa/performance-u04-20261020.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
const median=values=>{const a=values.toSorted((x,y)=>x-y);return(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
const measure=await read(root+'/measure-3/report.json'),bounded=await read(root+'/measure-4-bounded/report.json'),game=await read(root+'/game-2/report.json'),proof=await read(root+'/proof-4/report.json'),visual=await read(root+'/game-2/visual-review.json');
for(const r of [measure,bounded,game,proof,visual])assert.equal(r.pass,true);
assert.deepEqual(bounded.build,measure.build);
assert.equal(Number(await fs.readFile(root+'/regression-final-exit.txt','utf8')),0);
assert.deepEqual(await read(root+'/check-exits.json'),{typecheck:0,docs:0});
assert.match(await fs.readFile(root+'/regression-final.txt','utf8'),/pass 1729/);
const build=game.build,previous=await read('preview/performance-u01-u03-20261020-candidate-r1/build-inputs.json'),production=build.inputs.filter(i=>i.file.startsWith('src/'));
const changes=production.filter(i=>previous.inputs.find(j=>j.file===i.file)?.sha256!==i.sha256).map(i=>i.file).toSorted();
assert.deepEqual(changes,build.changes.toSorted());assert.equal(production.length,412);
for(const file of changes)assert.equal(hash(await fs.readFile(file)),production.find(i=>i.file===file).sha256);
for(const [b,kind]of [[build,'web'],[measure.build,'node']]){
 for(const i of b.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r2-'+kind+'-inputs/'+i.file)),i.sha256,i.file);
 for(const o of b.outputs)assert.equal(hash(await fs.readFile(o.file)),o.sha256,o.file);
}
for(const i of measure.build.inputs.filter(i=>i.file.startsWith('src/')))assert.equal(i.sha256,production.find(j=>j.file===i.file)?.sha256,i.file);
const js=build.outputs.find(i=>i.file.endsWith('/main.js'));assert.ok(game.served.some(i=>i.sha256===js.sha256));
const allSamples=[...measure.samples,...bounded.samples];
const rows=[...new Set(allSamples.map(s=>s.kind))].map(kind=>{
 const samples=['baseline','candidate'].map(v=>allSamples.filter(s=>s.kind===kind&&s.variant===v).toSorted((a,b)=>a.round-b.round).map(s=>s.ms));
 assert.ok(samples.every(s=>s.length===8));const ms=samples.map(median);return {kind,ms,changePercent:ms[0]?100*(ms[1]/ms[0]-1):null,faster:samples[0].filter((v,i)=>samples[1][i]<v).length,samples};
});
const labels={off:'统计关闭 frame',unchanged:'相同状态显示帧（0历史）',changed:'业务通知（0历史）',advance:'推进时间后的显示帧（0历史）','unchanged-long':'相同状态显示帧（10000历史）','changed-long':'业务通知（10000历史）','advance-long':'推进时间后的显示帧（10000历史）','trim-normal':'200条小事件，无需裁剪','trim-overflow':'200条大摘要，超限裁剪',flush:'100条12身份摘要的本机flush（含超限裁剪）','flush-bounded':'32条12身份摘要的本机flush（无需裁剪）'};
const table=rows.map(r=>`| ${labels[r.kind]} | ${r.ms[0].toFixed(6)} | ${r.ms[1].toFixed(6)} | ${r.changePercent?.toFixed(r.changePercent< -99.9?2:1)??'—'}% | ${r.faster}/8 |`).join('\n');
const failures=[
 '初次定向测试15项中14项通过，新增测试取card参数时误用索引7（实际key为索引6）；修正验证断言后15/15，未修改业务行为。原失败保留工具输出，后续定向日志已保存。',
 'proof-1在候选观察器已激活后restore夹具，额外产生开始事件；proof-2未对齐restore自动暂停。修正夹具初始化顺序和暂停状态，proof-3及最终R2 proof-4各386组通过；原失败报告不改标。',
 'measure-1本机浏览器网络被沙箱拒绝，后续允许回环连接；未连接外部遥测服务。',
 'measure-2为先导，部分时间与完整测试重叠；unchanged场景被includes(changed)误选为changed，相关计时无效。200大摘要超限重复50次/窗过慢，人工终止，已有样本与计数保留；最终修正分支、降低压力场景重复数并独立完成8对测量。',
 'R1普通未超限队列逐条序列化在先导中约0.0893→0.1567ms；R2撤回此改法，普通路径保持一次原数组序列化，只对被移除事件减去长度。原R1构建、源和计时保留。',
 'regression-r1为1722/1729，7失败来自本机网络访问权限；最终允许回环连接后的完整1729通过。',
 'game-1验证脚本错误假设当前标题页有统计链接，90秒等待超时；game-2直接调用已有服务控制器检查对话框，其后按钮使用真实浏览器点击。未新增标题导航、未启用普通入口服务。原失败截图和报告保留。',
 '额外未超限批次测量的首次自动审批超时，未执行；按工具允许重试一次后通过，measure-4-bounded完整完成。'
];
const audit={
 'UI-OBS-001':'当前机制复现并优化：只复用上个完整显示帧的观察；World通知仍立即执行，通知后第一帧再读取同tick余下修改。120显示帧＋20通知的changed/roster/economy各140→40，关闭时仍仅20入口且0汇总。生产账本保留已观察ID，按追加游标读取，新数组/缩短重扫。10000历史重复ID读取2800000→0；新局/恢复/撤回/重同意/阶段与时间回退均对照。',
 'TEL-001':'当前裁剪和渐增组包重复序列化已测量并局部优化：裁剪保留一次原数组序列化，移除时只扣该事件和逗号；组包逐事件累计含外壳的JSON长度。维持原UTF-16长度×3保守预算、200项/256KiB/24h、heartbeat优先、32项/64000批次、跨标签锁、旧回执保护与撤回。数据可变，不跨操作缓存序列化；普通队列R1回退已撤回。当前默认入口保持离线，无默认FPS收益。',
};
const text=`# U04 可选统计与遥测 · 2026-10-20

用户授权“开始 U04 统计/遥测，随批补对应的 A01 审计复核，验证完成后更新看板”。本批已本地完成，U04含此前S08音频子项可关闭；A01补UI-OBS-001、TEL-001的当前证据，保留既有UI-AUDIO-001结论。看板50项完成37、剩余13，下一项L02，尚未开始。

## 结果与适用范围

当前普通startGame提供内存装备账户，bootstrap为该入口固定使用离线统计协议；独立HTML的file协议同样禁用服务。本批保持此策略。浏览器实际普通入口统计关闭、无标识、无队列、无统计网络请求；**本批收益只属于可选统计代码路径，不是当前默认入口FPS提升，也未启用上线遥测**。

- 相同状态的连续显示帧不重复汇总。World监听器、pulse和leaving继续强制观察；同一固定步通知后仍可能发生修改，因此通知后首个显示帧也重新读取。直方图、长帧、峰值单位及欠账逐帧记录保持。
- 生产账本在局内追加，reset/restore替换数组。观察器只扫追加记录，新数组/缩短时重扫并保持原ID去重；开局已有订单仍不补发。已有完整订单集合保留，没有删除历史或更改交易。
- 队列裁剪只序列化整个数组一次，删除时扣除被删除事件和逗号长度；上传组包逐项累加JSON长度。原长度×3预算及所有权限/同意/保留政策保持。可变数据不做跨调用序列化缓存；普通无需裁剪路径保留原数组序列化。
- 音频沿用[已完成S08证据](PERFORMANCE_S08_20261020.md)：301实体、0/1/4/30治疗者计时、32仪器化启停和每侧9步真实AudioContext生命周期已通过；原Set实现与独立治疗loop/12普通voice规则保持，本批没有重新声称听觉验收。

仅修改game-observer.ts与telemetry-client.ts，World/RNG/玩法/画质/资源无改动。300上限、4∶4∶1、五图、经济及存档延期保持。

## 局部测量

最终真实Chrome隔离页面，16友军＋300敌人，0或10000条已观察生产历史；8对交替调用，未与其他测试或游戏绘制同时运行。表中为每窗口平均方法耗时的中位，单位ms/次；变化为候选相对原版，负数表示下降。不是整帧耗时、网络时延或全内容FPS。

| 路径 | 原版 | 候选 | 变化 | 候选较快 |
|---|---:|---:|---:|---:|
${table}

关闭路径接近浏览器时钟分辨率，不声称收益。短历史业务通知/推进后的显示帧仍需原统计；微小波动和回退如表保留，不把长历史收益外推到普通每帧。10000历史及一次200条大摘要超限均为压力夹具，不代表自然频度。普通无超限队列保持原路径，差值主要按实测波动解释。

预热一般20次，flush5次、200大摘要裁剪1次；每窗关闭50000次、相同状态短历史5000次、短通知/推进3000次、长历史1000次、普通裁剪300次、大摘要裁剪2次、超限flush60次，额外未超限flush120次。flush使用内存Response，包含persist、裁剪、组包、回执与最终persist，无真实网络时延。100条摘要超过队列预算，不能把该行约95%的整体下降全归为组包；单独32条未超限批次约0.3392→0.2154ms，下降36.5%。计数在独立对象上进行，不混入计时对象。

计数：120显示帧＋20World通知，开启时汇总各140→40；后者含20次业务通知和20次通知后的首帧，未合并通知。10000历史的ID读取2800000→0；关闭时两侧均20次changed入口、0阵容/经济汇总、0账本读取。

## 验证与当前审计

- 最终1729项完整回归、类型检查和数据文档检查通过。新增4项覆盖连续帧直方图、同tick通知后的修改、订单追加/替换/缩短/新局、撤回/重新同意和不同JSON字符与长度的裁剪。
- 最终386组新旧对照：360显示帧与120真实固定步、真实伤害与恢复观察、暂停、同tick后续修改、1100订单、恢复/缩短/追加、购买/刷新、换关与时间回退、撤回/重新同意、失败/离开和新局，摘要/事件/交易及World状态精确一致。运输对照包含250混合事件、大小上限、32项批次、单条超大拒发、失败重试、24小时过期、旧上传回执不能删除新内容、401撤回及删除。所有运输请求均为测试桩。
- 实际主游戏6项检查/10张截图通过：默认离线不采集；受控可选服务同意、36实际固定步与37帧统计、真实伤害＋恢复观察回调、静止观察不改World；真实endStage发通关摘要、本机flush、撤回后立即停止、跨标签身份同步停止。真实按钮点击与390/1440宽对话框检查通过。${game.requests.length}条资源请求失败/取消保留；页面/控制台错误0，实际/api请求0。
- 当前标题页无统计链接，默认服务对话框通过既有控制器打开检查。可选服务把既有PlayerServices连接至独立内存client/observer，手动喂入受控帧；**不是普通入口已开放统计的证明，不是外部服务端集成验收**。
- 最终截图已通过3张联系表及窄屏隐私/战场原图查看；没有发现本批新增明显显示错误。保持原有对话框长文滚动和布局；不代替物理输入、人类、自然战役或全内容性能验收。

${Object.entries(audit).map(([id,t])=>`- ${id}：${t}`).join('\n')}

A01整体仍待办，其余审计条目没有因本批联动自动关闭。

## 构建、失败记录与后续

基线为U01/U03最终冻结输入（JS 5259be7c30d098f5158acc6072405c03155317ede155f759925e92b03506347e）。最终R2有449编译输入、412生产输入；仅2个上述服务文件不同，无关economic-egg改动继续排除。独立测量模块156输入，其共享生产源码与Web一致。

最终JS：${js.sha256}。预览：preview/performance-u04-20261020-candidate-r2/（本机4436）。实际浏览器响应与文件哈希已绑定。没有替换Current/命名HTML，没有提交、推送或在线发布。

${failures.map(f=>'- '+f).join('\n')}

下一项L02加载分段与等待恢复，尚未开始；L03、最终自然/输入/性能/交付验收及待讨论/延期项继续保留。详细证据：[版本化报告](../../reports/qa/performance-u04-20261020.json)，原始记录reports/local/performance-u04-20261020/。
`;
await fs.writeFile(doc,text);
const evidence=[doc,'tools/build-performance-u04.mjs','tools/verify-performance-u04.mjs','tools/measure-performance-u04.mjs','tools/qa-performance-u04-game.mjs','test/performance-u04.test.ts',root+'/proof-4/report.json',root+'/measure-3/report.json',root+'/measure-4-bounded/report.json',root+'/game-2/report.json',root+'/game-2/visual-review.json',root+'/regression-final.txt',root+'/regression-final-exit.txt',root+'/typecheck-final.txt',root+'/docs-check-final.txt',root+'/check-exits.json',
 root+'/proof-4/runner.mjs',root+'/measure-3/runner.mjs',root+'/measure-4-bounded/runner.mjs',root+'/game-2/runner.mjs',
 ...changes,...build.outputs.map(i=>i.file),...measure.build.outputs.map(i=>i.file),...game.screens.map(i=>i.file),...visual.files,
 'reports/qa/performance-s08-20261020.json',root+'/proof-1/report.json',root+'/proof-2/report.json',root+'/measure-1/report.json',root+'/measure-2/report.json',root+'/game-1/report.json',root+'/regression-r1.txt'];
const artifacts=[];for(const file of evidence){const bytes=await fs.readFile(file);artifacts.push({file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(reportFile,JSON.stringify({date:'2026-10-20',scope:'U04 optional observation/transport plus associated A01 review; audio evidence reused',status:'complete-locally',main:'be9e2982944314194c6dcc9dcc535bc321749eb4',build,productionChanges:changes,metrics:rows,counts:measure.counts,proof:{checks:proof.checks.length,report:root+'/proof-4/report.json'},browser:{checks:game.checks.length,screens:game.screens.length,errors:game.errors,requests:game.requests,actualApiRequests:game.api,mockRequests:game.mockRequests},tests:1729,audit,audioEvidence:'reports/qa/performance-s08-20261020.json',failures,limits:{defaultTelemetryEnabled:false,realTelemetryUploaded:false,fullContentFPSAccepted:false,physicalInputAccepted:false,humanAccepted:false,committed:false,pushed:false,currentReplaced:false},artifacts},null,2)+'\n');
const boardFile='docs/project/performance-board.json',b=await read(boardFile),task=b.tasks.find(t=>t.id==='U04');
assert.equal(task.status,'待验证');task.status='已完成';task.updated='2026-10-20';
task.result='统计/遥测完成：重复显示帧汇总140→40，10000账本ID读取2800000→0；普通裁剪保持原路径，超限减量与组包累加。386组新旧对照、1729回归、实际6检查10图通过，真实API请求0。当前普通入口仍离线关闭，非默认FPS收益。音频复用S08已验证原实现；A01两条新复核。';
task.evidence.push('PERFORMANCE_U04_20261020.md','../../reports/qa/performance-u04-20261020.json','../../src/services/telemetry-client.ts');
for(const [id,text]of Object.entries(audit))b.auditRows.find(r=>r.id===id).currentReview='2026-10-20 U04完成复核：'+text;
const a01=b.tasks.find(t=>t.id==='A01');a01.result=(a01.result??'')+' U04补UI-OBS-001/TEL-001两条当前复核，UI-AUDIO-001沿用S08证据；整体仍待办。';a01.updated='2026-10-20';a01.evidence.push('PERFORMANCE_U04_20261020.md');
b.updated='2026-10-20';b.revision++;b.next='L02';b.updates.push({date:'2026-10-20',tasks:['U04','A01'],change:'U04统计/遥测及此前音频子项完成：1729回归、386对照、8对局部测量、实际6检查10图；普通入口仍离线，真实上传0。R1普通队列回退撤回、夹具与权限失败保留。A01两条复核，50项完成37/剩余13，下一项L02未开始。',evidence:['PERFORMANCE_U04_20261020.md','../../reports/qa/performance-u04-20261020.json']});
await fs.writeFile(boardFile,JSON.stringify(b,null,2)+'\n');
const announcement='2026-10-20 U04完成：[可选统计与遥测](LINK)。重复显示帧/长账本和超限队列处理已验证，1729回归、386对照及实际浏览器通过；默认入口仍离线，无默认FPS收益。50项完成37、剩余13，A01仍有余项，下一项L02未开始。';
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(file,'utf8'),split=old.indexOf('\n');
 await fs.writeFile(file,old.slice(0,split+1)+'\n'+announcement.replace('LINK',file==='docs/project/README.md'?'PERFORMANCE_U04_20261020.md':'project/PERFORMANCE_U04_20261020.md')+'\n'+old.slice(split+1));
}
const oldAgents=await fs.readFile('AGENTS.md','utf8');
await fs.writeFile('AGENTS.md',`## U04 可选统计与遥测完成 · 2026-10-20

- 用户授权U04统计/遥测及随批A01复核。记录docs/project/PERFORMANCE_U04_20261020.md，证据reports/qa/performance-u04-20261020.json。50项完成37、剩余13，下一项L02尚未开始；A01整体仍待办。
- 仅2个服务文件：完整显示帧观察复用、生产账本追加游标、超限裁剪长度扣减和上传组包累计。20通知＋120帧的汇总140→40，10000历史ID读取2800000→0；通知后首帧保留，逐帧直方图/业务事件/变更时序保持。普通未超限序列化仍原路径，R1回退撤回。
- 最终1729回归、类型/数据检查、386组摘要/事件/World/运输对照、8对独立局部计时，以及主游戏6检查/10图通过。页面/控制台错误0，实际API请求0；可选路径使用内存服务与受控观察器。普通startGame仍强制离线，HTML file也关闭，不声称默认入口或整场FPS提升。
- A01复核UI-OBS-001/TEL-001；UI-AUDIO-001沿用S08的32启停/两侧各9步实际AudioContext证据，音频未改。保留原回退、先导并发/脚本误选、人工终止、权限失败、夹具restore/暂停及标题链接超时；未改标旧失败。
- 最终JS ${js.sha256}，449编译输入/412生产输入，预览preview/performance-u04-20261020-candidate-r2/（4436）。冻结U01/U03，仅2服务文件不同，无关economic-egg排除。未替换Current、提交/推送/发布；300/4∶4∶1、完整效果、五图、经济、存档延期和自然/物理/人类/全内容性能边界保持。

`+oldAgents);
console.log(JSON.stringify({doc,reportFile,artifacts:artifacts.length,js:js.sha256,boardRevision:b.revision,done:b.tasks.filter(t=>t.status==='已完成').length,rows}));
