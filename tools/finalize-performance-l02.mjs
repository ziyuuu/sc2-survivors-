import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-l02-20261020',doc='docs/project/PERFORMANCE_L02_20261020.md',reportFile='reports/qa/performance-l02-20261020.json',lifeName=process.argv[2]??'lifecycle-2';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const digest=async file=>{const sha=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(file)){sha.update(chunk);bytes+=chunk.length;}return {file,bytes,sha256:sha.digest('hex')};};
const build=await read('preview/performance-l02-20261020-candidate-r4/build-inputs.json');
const baseline=await read('preview/performance-l02-20261020-baseline-r1/build-inputs.json');
const offline=await read(root+'/offline-candidate-r4/build-inputs.json');
const offlineBaseline=await read(root+'/offline-baseline-r1/build-inputs.json');
const loading=await read(root+'/loading-summary.json');
const host=await read(root+'/host.json');
const recovery=await read(root+'/recovery-2/report.json'),life=await read(root+'/'+lifeName+'/report.json'),pack=await read(root+'/pack-proof-3/report.json'),visual=await read(root+'/visual-review.json');
const traceBase=await read(root+'/boot-trace-baseline-r1-1/report.json'),traceFinal=await read(root+'/boot-trace-candidate-r4-1/report.json');
for(const r of [recovery,life,pack,visual,traceBase,traceFinal])assert.equal(r.pass,true);
const selected=['web-baseline-r1-3','web-candidate-r4-1','offline-baseline-r1-1','offline-candidate-r4-1'];
for(const name of selected)assert.equal(loading.rows.find(r=>r.name===name)?.complete,true,name);
assert.equal(Number(await fs.readFile(root+'/regression-r4-exit.txt','utf8')),0);
assert.match(await fs.readFile(root+'/regression-r4.txt','utf8'),/pass 1740/);
assert.deepEqual(await read(root+'/check-exits-r4.json'),{typecheck:0,docs:0});
const production=build.inputs.filter(i=>i.file.startsWith('src/')),changes=production.filter(i=>baseline.inputs.find(j=>j.file===i.file)?.sha256!==i.sha256).map(i=>i.file).sort();
assert.equal(production.length,413);assert.deepEqual(changes,build.changes.toSorted());
const evidence=[];
for(const b of [baseline,build]){
 for(const i of b.inputs)assert.equal((await digest(`${root}/${b.variant}-inputs/${i.file}`)).sha256,i.sha256,i.file);
 for(const o of b.outputs){assert.deepEqual(await digest(o.file),o);evidence.push(o.file);}
}
for(const file of changes)assert.equal((await digest(file)).sha256,production.find(i=>i.file===file).sha256,file);
for(const i of recovery.inputs.filter(i=>i.file.startsWith('src/')))assert.equal(i.sha256,production.find(j=>j.file===i.file)?.sha256,i.file);
assert.deepEqual(offline.web,build);assert.deepEqual(await digest(offline.html.file),offline.html);
assert.deepEqual(offlineBaseline.web,baseline);assert.deepEqual(await digest(offlineBaseline.html.file),offlineBaseline.html);
assert.equal(offline.source.payloadSha256,offlineBaseline.source.payloadSha256);
const finalWeb=await read(root+'/web-candidate-r4-1/report.json'),finalOffline=await read(root+'/offline-candidate-r4-1/report.json');
assert.deepEqual(finalWeb.build,build);assert.deepEqual(finalOffline.build,offline);
const js=build.outputs.find(o=>o.file.endsWith('/main.js'));
assert.ok(finalWeb.served.some(i=>i.sha256===js.sha256));assert.deepEqual(life.build,build);assert.equal(finalOffline.network.length,0);
assert.deepEqual(finalWeb.errors,[]);assert.deepEqual(finalOffline.errors,[]);assert.deepEqual(life.unexpectedErrors,[]);
// Bind the local immutable assets requested by the final Web run. Resource Timing
// body sizes are checked where Chrome supplies them; this is not a wire checksum.
const assets=[];
for(const url of new Set(finalWeb.network.map(r=>r.url))){
 const pathname=decodeURIComponent(new URL(url).pathname),at=pathname.indexOf('/assets/');if(at<0)continue;
 const file='public'+pathname.slice(at),resolved=path.resolve(file),base=path.resolve('public')+path.sep;
 assert.ok(resolved.startsWith(base));const record=await digest(file);
 const observed=finalWeb.stages.flatMap(s=>s.data.resources??[]).filter(r=>r.name===url&&r.decoded>0);
 for(const row of observed)assert.equal(row.decoded,record.bytes,file);
 assets.push({...record,url,positiveSizeObservations:observed.length});
}
await fs.writeFile(root+'/requested-assets.json',JSON.stringify({scope:'Locally served immutable files bound by path/hash; observed positive decodedBodySize checked. Not a response-body checksum.',assets},null,2));
const audit={
 'LOAD-006':'部分缓解、边界保留：独立HTML的2834片JSON解析从一次连续批处理改为合作让步；最终冷/刷新45/49批，解析区间不含初始HTML/JS的长任务最大150/0ms（0为没有记录），基线412/573ms。首元数据解析、初始HTML/JS、同步驱动/首绘仍可阻塞，未声称加载已无长帧。',
 'LOAD-013':'原断言不成立：后台工作结束仍不等于正式ready。保留必要入口模型、音频、编译、实战预热、地图及错误检查；实际资源失败时World仍menu/time0，重试通过后才能继续。',
 'LOAD-015':'证据边界复核：分列模型/姿态、纹理CPU提交、异步着色器等待、首用验证、HDR预热和地图准备；实际GPU fence及上下文恢复已验证。嵌套等待耗时不可相加，纹理提交不是GPU执行时长，未补成全内容GPU/FPS验收。',
 'LOAD-016':'旧问题当前已修：沿用编码字符串/引用计数和按需解包，不重新创建全量编码Blob。最终2834块、1874资产逐块字节和部分顺序一致；本批只补分片JSON解析和DOM引用释放，不把旧修复算新收益。',
 'L04':'实测取舍：保留约8ms检查一次的片间JSON解析让步；浏览器支持时用scheduler.yield，回退setTimeout。单个JSON、base85和inflate仍同步；原解包片间16ms让步保持。R2片内解码/流式inflate因时间与堆峰值回退撤回，未宣称硬8ms或内存下降。',
 'L07':'必要异步等待补限：HTTP头及正文60秒后abort；缓存操作5秒、失败30秒降级窗口；入口排队120秒、着色器60秒、GPU fence30秒。实际正文停滞/重试、IDB blocked/reopen、串行lane及取消所有权通过。旧任务排空前不放新任务并发；取消不是同步代码抢占，Three内部轮询和单次驱动调用仍不能强制中断。',
 'DATA-002':'设计边界保留：冷战役地图/legacy地表属于有限准备工作；本批记录mapPreparation，不把它列作每帧模拟负载或重建地图。地图生成、五图及fallback行为未改。'
};
const failures=[
 '首轮新增定向测试2失败：流式候选对空gzip的接受与取消lane断言早于清理微任务；修正测试/候选后通过。流式候选最终整体撤回，旧测试归档。',
 'R2完整回归首轮1737/1738：旧编译测试断言Promise对象身份，加入等待包装后不再相同；改为验证实际pending/结果/目标恢复并补超时后迟到完成检查，最终1740通过。',
 'Web初次回环访问被沙箱拒绝，第二次旧4437服务超时，重启又遇端口占用；保留失败报告，最终使用4439。非资源内容错误。',
 'R1/R2分块解码先导未稳定改善；R2离线菜单解包冷/刷新1.6245/2.1027秒→3.1544/3.1757秒。最终撤回片内base85/流式inflate，保留其源、构建、测试和8对最大原块测量。',
 'R2刷新时ready阶段JS堆采样峰值达2.755GB，未把它等同进程峰值或证实泄漏。最终R4也未证明堆峰值改善；ready后两侧约1.03GB。',
 'R3离线首次准备触发着色器60秒等待上限，入口正确进入error，未进入ready。原因未确定；报告与失败图保留。R4未放宽上限，最终Web/离线及实际恢复另行通过，不改标R3。',
 '局部测量首次构建发现3字节CRLF差异，换行归一后相同；最终恢复验证直接读取最终冻结源并逐项校验，不以该先导冒充最终原始字节一致。'
 ,'普通菜单实际会另抽战役地图/种子，startGame(529)并不固定后续新局：首次Web原版ice/643333095、最终industrial/884755640；离线原版char/2999453982、最终industrial/27892160。总准备计时属于不同正常入口实例，不能作同场景优化收益。解析比较发生在抽图之前，使用相同完整资源payload。'
 ,'lifecycle-1在retry-ready后超过5分钟没有新报告，人工终止。原脚本未在取消检查后保存，具体停滞位置不能确定；不认定为生产取消死锁。后续加阶段记录/45秒夹具等待上限，在相同R4源码独立完成取消、重载和实际上下文恢复，原中断报告保留。'
];
const timed=selected.flatMap(name=>{
 const r=loading.rows.find(x=>x.name===name);
 return ['cold','reload'].map(prefix=>{
  const home=r.stages.find(s=>s.label===prefix+'-home'),ready=r.stages.find(s=>s.label===prefix+'-ready');
  return {name,prefix,map:prefix==='cold'?r.stages.find(s=>s.label==='first-enter').world?.map:null,mapLimit:prefix==='cold'?'Actual committed menu-selected recipe; differs across runs.':'Full recipe not captured before commit; see ready screenshot.',homeMs:home.wallMs,prepareMs:ready.wallMs,homeAndPrepareMs:home.wallMs+ready.wallMs,peakSampledJsHeap:Math.max(home.peakSampledJsHeap,ready.peakSampledJsHeap),readyHeap:ready.endJsHeap,largestTaskMs:Math.max(home.maxLongTaskMs,ready.maxLongTaskMs)};
 });
});
const table=timed.map(r=>`| ${r.name.startsWith('offline')?'离线HTML':'Web'} ${r.name.includes('baseline')?'原版':'最终R4'} ${r.prefix==='cold'?'首次':'刷新'} | ${(r.homeMs/1000).toFixed(3)} | ${(r.prepareMs/1000).toFixed(3)} | ${(r.homeAndPrepareMs/1000).toFixed(3)} | ${(r.peakSampledJsHeap/1e9).toFixed(3)} | ${(r.readyHeap/1e9).toFixed(3)} |`).join('\n');
const spanNames={shaderWait:'着色器等待',textureUploadSubmit:'纹理CPU提交',firstUseValidation:'首用验证',HDRWarm:'实战/HDR预热',mapPreparation:'地图准备',commonModels:'公共模型',poseAndBatch:'姿态/批次',audioPreparation:'音频准备',embeddedDecode:'内置解包',laneWait:'入口排队'};
const spanTable=selected.map(name=>{
 const row=loading.rows.find(r=>r.name===name).stages.find(s=>s.label==='cold-ready');
 return `### ${name}\n\n| 方法 | 次数 | 方法累计秒 | 最长单次秒 |\n|---|---:|---:|---:|\n`+Object.entries(row.spanSummary).filter(([key])=>spanNames[key]).map(([key,r])=>`| ${spanNames[key]} | ${r.count} | ${(r.sumMs/1000).toFixed(3)} | ${(r.maxMs/1000).toFixed(3)} |`).join('\n');
}).join('\n\n');
const traceTable=['ParseHTML','EvaluateScript','v8.compile','V8.ParseProgram'].map(name=>{
 const a=traceBase.events.find(e=>e.name===name),b=traceFinal.events.find(e=>e.name===name);
 return `| ${name} | ${(a.totalMs/1000).toFixed(3)} / ${(a.maxMs/1000).toFixed(3)} | ${(b.totalMs/1000).toFixed(3)} / ${(b.maxMs/1000).toFixed(3)} |`;
}).join('\n');
const text=`# L02 加载分段及等待恢复 · 2026-10-20

用户授权“开始 L02 加载分段及等待恢复，随批补对应的 A01 审计复核，验证完成后更新看板”。L02已完成本地范围验证；A01补7条当前复核，整体仍待办。50项完成38、剩余12，下一项L03，尚未开始。

## 完成内容

- 独立HTML按原2834个script逐片读取、解析并移除。约8ms检查一次是否让步，支持时使用scheduler.yield，否则setTimeout；每次让步/结束更新进度，并及时释放已移除DOM引用。单片解析仍同步，8ms是软目标。
- 网络等待覆盖响应头及正文，60秒超时后中止；必要资源不会因请求只收到响应头就无限等正文。缓存/索引5秒后降级，30秒内跳过同类失败缓存等待，之后允许重试；IDB被其他标签阻塞可降级、迟到连接关闭、versionchange释放。资源缓存与存档数据库分离。
- 必要入口120秒排队上限；取消的入口不再覆盖仍持有渲染器的旧任务控制状态。旧工作真正排空才释放串行通道，避免新旧任务共同修改场景。
- 着色器异步等待60秒上限，GPU fence轮询改为16ms定时并有30秒上限，结束删除fence。同步驱动调用、gl.finish及单次解析不能被计时器抢占；Three内部编译轮询也不被本包装强制终止。
- 正式ready仍需模型、音频、编译、实战预热、地图及错误检查完整通过。缓存失败只给“下次可能需补下载”的准确提示，不把缓存失败一律解释为空间不足。

**没有证据表明总加载时间或堆峰值稳定下降。** 保留的收益是容器解析期间可让步、必要等待可失败/重试，以及取消时的串行所有权。R2片内解码/流式解压因实测回退撤回，最终仍用原base85、同步inflate及解包片间16ms让步。不开新画质档、不减资源、不改开场等待策略。

## 加载与内存实测

Chrome ${finalOffline.hardware?.browser}，${host.cpu.trim()}，约${(host.totalRAM/1024**3).toFixed(1)}GiB RAM，AMD Radeon(TM) Graphics/ANGLE D3D11，1440×900、DPR1、完整效果、默认人族/普通菜单路径。Web与file离线各一组原版/最终R4首次＋刷新；每组独立浏览器profile，**不清操作系统文件缓存，也不代表网络冷启动**。测量期间重型任务串行。首页沿原开场约15秒；准备时间从实际菜单操作至ready，包含菜单点击，未提前运行World。同页进入后立即暂停便于验证，不是自然战役。

原工具scope中的paired只表示代码版本对照，**战役地图未锁定，以下总时间不是同场景A/B收益**：启动seed529之后，普通菜单另抽新局地图/种子。首次Web原版ice/643333095、最终industrial/884755640；离线原版char/2999453982、最终industrial/27892160。刷新最终ready未提交新局，截图可辨地图但原记录未捕获完整recipe。容器解析发生在菜单抽图之前，使用同一完整payload，其分段计数可独立比较。

入口复用生产startGame与真实资源准备；前后构建共享同一组诊断方法包装，并记录长任务/堆采样。它们是带探针的本地验证入口，时间不作为普通无探针交付的承诺。

| 形式/版本 | 首页秒 | 菜单操作至ready秒 | 两阶段合计秒 | 页面阶段JS堆采样峰GB | ready时JS堆GB |
|---|---:|---:|---:|---:|---:|
${table}

两阶段合计排除截图和采集间隔，不是单一连续秒表。JS堆每250ms采样，受GC时机影响；不是浏览器进程RAM、Blob存储、VRAM或真实瞬时峰值。完整原始数据另有1秒CDP采样。离线最终峰值未优于基线，不能宣称内存优化；ready时约1.03GB。最大主线程长任务仍约9–11秒，未由本批消除。

离线2834片移除的MutationObserver批次数：原版冷/刷新1/1，R4为45/49。诊断脚本就绪到首菜单解包的区间为原版0.613/0.731秒、R4 0.639/0.709秒，包含元数据与容器初始化，**不是初始HTML/JS解析时间**。该区间内记录到的requestAnimationFrame回调原版冷/刷新2/0次、最终6/5次；有显示帧穿插，不是稳定帧率证明。此区间内起始的长任务最大原版412/573ms、最终150/无记录；保留的150ms包括元数据等工作，不能说所有解析都低于50ms。首菜单解包原版1.625/2.103秒、R4 1.579/1.914秒，片内解码实现相同，不据此宣称解码优化。

独立Chrome trace另外记录HTML ParseHTML、EvaluateScript、V8编译等事件（原版/最终各一次，带trace开销，不混入主表），详见loading-summary及boot-trace目录。相互嵌套的trace事件和异步方法时间均不可相加。浏览器网络/读取时间、导航、各资源transfer/decodedBodySize在原始报告中；本机资源${assets.length}个实际路径与文件hash绑定。

| trace事件 | 原版累计秒 / 最大秒 | R4累计秒 / 最大秒 |
|---|---:|---:|
${traceTable}

trace覆盖所记录进程/线程，事件可能嵌套，累计值不是单一主线程或墙钟分解。带trace时bootFinished原版${(traceBase.state.bootFinished/1000).toFixed(3)}秒、R4 ${ (traceFinal.state.bootFinished/1000).toFixed(3)}秒，明显慢于主样本，差异原因未隔离。保留这组慢样本，不把它混成无探针体验或用于声称优化收益；它说明初始HTML/JS解析/编译仍有秒级同步片段。

## 分段准备诊断

以下是首次必要入口范围内的嵌套方法计时。累计是该方法自身多次调用的和，多个方法可重叠；**不是可相加的CPU/GPU分解**。纹理项仅CPU提交，着色器等待包含调度和驱动，GPU fence只验证完成，未把等待时间当GPU elapsed。

${spanTable}

## 验证

- 最终1740项完整回归、类型和数据文档检查通过；14项定向回归含正文超时、缓存失败窗口、迟到响应、取消通道、编译目标恢复及原生yield分支。
- 全2834原始块经最终容器解析和实际EmbeddedAssetStore/Blob读回，与旧解码逐字节hash一致；1874资产部分列表不变，独立解码701331450字节、逻辑资产891610009字节。原资源payload整段复用，SHA ${offline.source.payloadSha256}。这是离线验证，不声称新增了运行时逐资产SHA校验。
- 最终Web与离线各完成首次首页/ready/入场、同页返回/继续、刷新首页/ready；各5张图，页面与控制台错误0。离线HTTP请求0；必要ready前World保持menu/time0，模型无错。104模型已准备，实战预热/程序验证记录保留。
- 真实浏览器4项隔离恢复检查：真实HTTP正文停滞250ms后中止，原store重试取回校验字节；真实IDB v1持锁造成v2 blocked，再关闭旧连接成功重开；30ms缩短超时夹具验证串行lane不提前放行。超时短值仅注入测试，产品值保持上述上限。
- 主游戏${life.checks.length}项生命周期检查：真实GLB请求失败时不启动World、原界面重试完整ready；取消等待中的后继入口不清除旧持有者；实际WEBGL_lose_context/restore后time/tick/runId/RNG/暂停/模型键及实体、经济、装备账户等记录保持；注入时钟触发fence超时后再运行真实fence通过。预期资源失败的控制台记录保留，非预期错误0。${life.screens.length}张最终图已查看。
- 本批只检查实际页面流程、加载恢复和轻量视觉；不代表物理输入、人类体验、自然完整战役、低内存设备、跨浏览器或全内容60FPS验收。

## A01 当前复核

${Object.entries(audit).map(([id,value])=>`- ${id}：${value}`).join('\n')}

## 构建与保留记录

冻结U04最终源作为基线；原版438/最终439编译输入，生产输入412/413。仅${changes.length}个加载/准备/提示文件不同；无关economic-egg修改继续排除。最终JS ${js.sha256}，CSS ${build.outputs.find(o=>o.file.endsWith('/main.css')).sha256}。最终独立测试HTML ${offline.html.bytes}字节、SHA ${offline.html.sha256}，保留于原始验证目录，不是替换正式命名交付。

${failures.map(f=>'- '+f).join('\n')}

旧构建/失败不改标。生产源码、工具、冻结输入、最终Web响应、完整HTML、原资源payload、截图及报告绑定见[版本化报告](../../reports/qa/performance-l02-20261020.json)。最终预览：preview/performance-l02-20261020-candidate-r4/，本机4439。未替换Current、提交、推送或发布。

下一项L03缓存与预览，尚未开始。300上限、4∶4∶1、五图、模拟/经济、完整效果及存档延期保持。关于让步API的实现依据：[Chrome官方说明](https://developer.chrome.com/blog/use-scheduler-yield?hl=en)；本项目通过特性检测保留回退，不将该API存在等同实际性能收益。
`;
await fs.writeFile(doc,text);
evidence.push(doc,...changes,'tools/finalize-performance-l02.mjs','tools/summarize-performance-l02.mjs','tools/review-performance-l02.py','tools/build-performance-l02.mjs','tools/build-performance-l02-offline.mjs','tools/performance-l02-runtime.ts','tools/qa-performance-l02-loading.mjs','tools/qa-performance-l02-recovery.mjs','tools/qa-performance-l02-lifecycle.mjs','tools/qa-performance-l02-boot-trace.mjs','tools/verify-performance-l02-pack.mts','test/performance-l02.test.ts','test/presentation-warmup.test.ts',offline.html.file,offlineBaseline.html.file);
for(const name of await fs.readdir(root)){
 const entry=root+'/'+name,stat=await fs.stat(entry);
 if(stat.isFile()&&/\.(json|txt)$/.test(name))evidence.push(entry);
 if(stat.isDirectory()&&!name.endsWith('-inputs')&&!name.endsWith('tests')){
  for(const child of await fs.readdir(entry))if(/\.(json|png|mjs|js|mts|ts)$/.test(child))evidence.push(entry+'/'+child);
 }
}
const artifacts=[];for(const file of new Set(evidence))artifacts.push(await digest(file));
await fs.writeFile(reportFile,JSON.stringify({date:'2026-10-20',scope:'L02 segmented loading and bounded recovery; 7 associated A01 current reviews',status:'complete-locally',main:'be9e2982944314194c6dcc9dcc535bc321749eb4',build,offline,productionChanges:changes,loading:timed,resourceProof:{chunks:2834,assets:1874,decodedBytes:701331450,logicalBytes:891610009,report:root+'/pack-proof-3/report.json'},recovery:{report:root+'/recovery-2/report.json',checks:recovery.checks.length},lifecycle:{report:root+'/'+lifeName+'/report.json',checks:life.checks.length,screens:life.screens.length,errors:life.errors,unexpectedErrors:life.unexpectedErrors},hardware:finalOffline.hardware,tests:1740,audit,failures,limits:{sameScenePairedTotalLoading:false,stableTotalLoadingImprovement:false,peakMemoryImprovement:false,hard8msSlices:false,allSynchronousWorkInterruptible:false,fullContentFPSAccepted:false,physicalInputAccepted:false,humanAccepted:false,committed:false,pushed:false,currentReplaced:false},artifacts},null,2)+'\n');
const boardFile='docs/project/performance-board.json',b=await read(boardFile),task=b.tasks.find(t=>t.id==='L02');
assert.equal(task.status,'待验证');task.status='已完成';task.updated='2026-10-20';task.auditIds=Object.keys(audit);
task.result='容器JSON解析分段、HTTP正文/缓存/串行入口/着色器/GPU等待恢复完成；R2片内解码回退已撤回。1740回归、2834块/1874资产字节对照、最终Web/离线和实际上下文恢复通过。总加载与堆峰值未稳定下降；同步解析/驱动长任务仍保留。A01补7条，失败与旧构建保留。';
task.evidence.push('PERFORMANCE_L02_20261020.md','../../reports/qa/performance-l02-20261020.json','../../src/assets/preparation-wait.ts');
for(const [id,text]of Object.entries(audit))b.auditRows.find(r=>r.id===id).currentReview='2026-10-20 L02完成复核：'+text;
const a01=b.tasks.find(t=>t.id==='A01');a01.result=(a01.result??'')+' L02补LOAD-006/013/015/016、L04/L07/DATA-002七条当前复核；仍保留同步工作、GPU时长和整体性能边界，A01整体待办。';a01.updated='2026-10-20';a01.evidence.push('PERFORMANCE_L02_20261020.md');
b.updated='2026-10-20';b.revision++;b.next='L03';
b.updates.push({date:'2026-10-20',tasks:['L02','A01'],change:'L02本地完成：1740回归、全2834块/1874资产一致、最终Web/离线与真实失败/取消/上下文恢复验证；A01补7条。R2回退撤回、R3超时及所有失败保留；不声称总加载/内存稳定收益。50项完成38/剩余12，下一项L03未开始。',evidence:['PERFORMANCE_L02_20261020.md','../../reports/qa/performance-l02-20261020.json']});
assert.equal(b.tasks.filter(t=>t.status==='已完成').length,38);
await fs.writeFile(boardFile,JSON.stringify(b,null,2)+'\n');
const announcement='2026-10-20 L02完成：[加载分段及等待恢复](LINK)。1740回归、2834资源块字节对照、Web/离线与失败/上下文恢复通过；总加载与堆峰值未证明稳定下降。A01补7条，50项完成38、剩余12；下一项L03未开始。';
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(file,'utf8'),split=old.indexOf('\n');
 await fs.writeFile(file,old.slice(0,split+1)+'\n'+announcement.replace('LINK',file==='docs/project/README.md'?'PERFORMANCE_L02_20261020.md':'project/PERFORMANCE_L02_20261020.md')+'\n'+old.slice(split+1));
}
const oldAgents=await fs.readFile('AGENTS.md','utf8');
await fs.writeFile('AGENTS.md',`## L02 加载分段及等待恢复完成 · 2026-10-20

- 用户授权L02与随批A01复核。记录docs/project/PERFORMANCE_L02_20261020.md，证据reports/qa/performance-l02-20261020.json。50项完成38、剩余12；下一项L03尚未开始，A01整体仍待办。
- 8个生产文件：独立HTML分片JSON解析约8ms软让步并释放DOM引用；HTTP正文60秒中止、缓存5秒/30秒重试窗口、入口120秒串行等待、着色器60秒、GPU fence30秒。取消等待者不能覆盖旧任务控制状态，旧工作排空才放行。同步解析/驱动不能抢占，非硬8ms。
- 最终1740回归、类型/数据检查、2834块/1874资产字节与部分顺序对照、最终Web/离线各7阶段5图，以及真实正文停滞/IDB阻塞/串行lane和主游戏资源失败重试/取消/实际WebGL恢复通过。最终正常加载页面/控制台错误0，离线HTTP0；预期资源失败日志保留。
- R2片内base85/流式inflate实测时间及堆峰值回退，已全部撤回；原片内解码及16ms片间让步保持。R3着色器超时失败及所有先导/权限/夹具错误保留。R4首次/刷新移除批次45/49，基线1/1；总加载与JS堆峰值无稳定下降，首绘仍有约9–11秒长任务，不声称FPS完成。
- 最终JS ${js.sha256}，439编译输入/413生产输入；测试HTML SHA ${offline.html.sha256}。预览preview/performance-l02-20261020-candidate-r4/（4439），冻结U04并排除无关economic-egg。未替换Current、提交/推送/发布；300/4∶4∶1、完整效果、五图、模拟经济、存档延期和自然/物理/人类/全内容性能边界保持。

`+oldAgents);
console.log(JSON.stringify({doc,reportFile,artifacts:artifacts.length,assets:assets.length,js:js.sha256,boardRevision:b.revision,done:38,next:b.next}));
