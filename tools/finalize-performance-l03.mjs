import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='reports/local/performance-l03-20261020',read=async f=>JSON.parse(await fs.readFile(f,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const summary=await read(root+'/summary.json'),build=await read('preview/performance-l03-20261020-candidate-r1/build-inputs.json'),offline=await read(root+'/offline-candidate-r1/build-inputs.json');
const doc='docs/project/PERFORMANCE_L03_20261020.md',qa='reports/qa/performance-l03-20261020.json';
const changes=['src/ui/presentation/map-preview.ts','src/ui/presentation/recent-cache.ts','src/ui/hud.ts','src/assets/offline-pack.ts'];
for(const file of changes){const item=build.inputs.find(i=>i.file===file);assert.ok(item);assert.equal(hash(await fs.readFile(file)),item.sha256,file);}
const deltas=[];
for(const variant of ['baseline','candidate-r1']){
 const b=await read(`preview/performance-l03-20261020-${variant}/build-inputs.json`);
 for(const i of b.inputs)assert.equal(hash(await fs.readFile(root+'/'+variant+'-inputs/'+i.file)),i.sha256,'archived '+i.file);
 for(const o of b.outputs)assert.equal(hash(await fs.readFile(o.file)),o.sha256,o.file);
 if(variant==='candidate-r1')for(const i of b.inputs.filter(i=>i.file.startsWith('src/'))){
  let old;try{old=await fs.readFile(b.previous+'/'+i.file);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(!old||hash(old)!==i.sha256)deltas.push(i.file);
 }
}
assert.deepEqual(deltas.sort(),[...changes].sort());
for(const variant of ['baseline','candidate-r1']){const b=await read(root+'/offline-'+variant+'/build-inputs.json');assert.equal(hash(await fs.readFile(b.html.file)),b.html.sha256,'offline '+variant);}
const regression=await fs.readFile(root+'/regression-r1.log','utf8'),retry=await fs.readFile(root+'/regression-network-retry.log','utf8');
assert.match(regression,/tests 1745/);assert.match(regression,/pass 1738/);assert.match(regression,/fail 7/);assert.match(retry,/pass 16/);assert.match(retry,/fail 0/);
const requests=new Map();
for(const run of ['web-baseline-2','web-candidate-r1-1']){
 const r=await read(root+'/'+run+'/report.json');assert.ok(r.pass);
 for(const item of r.resources){const u=new URL(item.name),at=u.pathname.indexOf('/assets/');if(at<0)continue;const file='public'+decodeURIComponent(u.pathname.slice(at)),prior=requests.get(file)??new Set();if(item.bytes>0)prior.add(item.bytes);requests.set(file,prior);}
}
const assets=[];for(const [file,sizes]of requests){const bytes=await fs.readFile(file);for(const size of sizes)assert.equal(bytes.length,size,file);assets.push({file,bytes:bytes.length,sha256:hash(bytes),observedDecodedSizes:[...sizes]});}
await fs.writeFile(root+'/requested-assets.json',JSON.stringify({scope:'Observed Web paths mapped to local files; positive ResourceTiming decoded sizes checked. These are not wire response-body checksums.',assets},null,2));
const visual=await read(root+'/visual-review.json');assert.ok(visual.pass);
const audit={
 'UI-PREVIEW-001':'暂停截图保留640×360/WebP .82，复制当前渲染后用单个toBlob/FileReader任务编码，存储在回调中执行；旧run/map回调不覆盖当前预览。相同图片10对交替、预热后9对同步中位显著降低，首对冷操作回退和总延迟增加保留。首次概览仍同步生成，命中缓存才免重算；不是所有暂停都零长帧。',
 'UI-CACHE-001':'概览最近8条/1MiB、滚动位置最近64条/128KiB，以UTF-16文本/number有效载荷估算预算；超额只丢可再生成展示数据。60概览/120切页容量核验、五图重算字节一致；普通内存账户不使用导入概览，压力夹具与真实频度分列。',
 L05:'离线按需及旧整包恢复在创建URL前异步校验每asset SHA，当前请求批次全通过才发布URL/释放编码片；同长坏内容、坏hash、失败后重试验证。1874原资产通过生产校验并独立读回；并非来源签名/真实性证明，也未同步哈希全部资产后才显示首页。',
 L06:'记录Blob逻辑/共享片字节、未解码字符、纹理条目与像素尺寸估算、实际保留JS堆。Web五图11次、离线3次重开后GPU数量与有限资源集合趋稳，页面内活跃资源仍可恢复；UI缓存已限额。跨版本磁盘缓存仍无统一驱逐预算，未进行多版本磁盘压力实验，不能宣称此问题全部修复；其策略留给A01后续取舍，不据此删除活跃/离线唯一资源。',
 'LOAD-018':'沿用已否证结论：深度材质通过WeakMap及源材质/几何生命周期管理，正式恢复仍依赖现有材质；不搬回提前释放候选。当前Web和离线真实上下文恢复通过，此条没有新增生产优化或单列收益。'
};
const failures=[
 {path:root+'/web-baseline-1/report.json',reason:'沙箱阻止localhost访问；无有效游戏样本，提权后同一构建另取baseline-2。'},
 {path:root+'/offline-baseline-1/report.json',reason:`240秒测试等待超时，随后状态读取仍为GPU实战预热(628/628)，再后的failure.png已显示“部署就绪”；没有资源/模型/页面错误，World尚未启动。该轮保留为测试失败/不完整，不是永久死锁证据。baseline-2把测试等待设为420秒并记录进度，实际首局约${Math.round(summary.runs['offline-baseline-2'].stages[0].ms/1000)}秒即完成，小于旧期限；首次加载波动根因未定位，不能归因于延长等待。游戏就绪逻辑不变。`},
 {path:root+'/regression-r1.log',reason:'1745项中1738通过、7项本机网络EACCES；三个文件重跑16项通过，旧失败不抹除。'},
 {path:root+'/paired-1/report.json',reason:'首次冷截图同步120.2→140.1ms、异步总时长174.7ms；冷长帧未消除，不能只报预热收益。'}
];
const warm=summary.paired.warm,fmt=n=>Number(n).toFixed(3),gb=n=>(n/1048576).toFixed(2);
const runTable=Object.entries(summary.runs).map(([name,r])=>`|${name}|${r.stages.length}|${r.screens}|${r.errors.length}|${r.scrollMax}|${r.overview.final.entries}|${fmt(r.capture.synchronousMedian)} / ${fmt(r.capture.totalMedian)}|`).join('\n');
const memoryTable=Object.entries(summary.runs).flatMap(([name,r])=>r.stages.filter(s=>s.label.startsWith('new-')).map(s=>`|${name} · ${s.label}|${gb(s.heap)}|${s.map.views}|${s.models.memory.geometries}/${s.models.memory.textures}|${s.embedded[0]?.ids??'—'}|${s.embedded[0]?.uniquePreparedChunkBytes??'—'}|${s.embedded[0]?.encodedCharacters??'—'}|`)).join('\n');
const text=`# L03 缓存容量与预览开销 · 2026-10-20

用户授权“开始吧L03”。本批从L02 R4冻结输入继续，完成界面缓存限额、异步暂停截图、离线按需SHA校验，并复核5条A01。性能看板50项完成39、剩余11；下一项A01其余审计尚未开始。A01整体、自然游玩、完整内容60FPS与最终MVP验收保持开放。

## 实现与边界

- 地图概览保留最近8条、有效载荷预算1MiB；滚动位置保留最近64条、128KiB。预算按文本2字节/字符及number8字节计，包含key；不是V8对象真实占用。仅淘汰可重新生成的UI数据，当前DOM和World不受影响。
- 暂停截图仍640×360、WebP质量.82；当前帧复制同步，编码及data URL读取异步，localStorage写入移到回调。最多一个编码任务；快速变化时后续有效帧再采样，不堆积编码任务；旧局/地图完成回调丢弃。图片完成后更新当前HUD。存储不可用时当前页预览仍可用，存档延期没有改变。
- 离线每个按需资产以及旧整包恢复，在创建Blob URL前用异步SHA-256比较原清单；整批成功才提交URL和释放编码片。失败回滚新URL、保留原已就绪资源和未释放编码片，可重试。临时哈希输入按单asset读取，当前最大${summary.pack.largestAssetBytes}字节；这不是内存总上界。
- 原片内解码/解压、资源范围、素材字节、模型、地图、效果、模拟及经济未改。未新增资源驱逐政策；现有HTTP内容复用、地图退出释放与活跃资源恢复继续使用。跨版本磁盘预算仍未解决，不把UI缓存上限称为全资源统一预算。

## 测量

同一个浏览器、同一1440×900确定性图像，生产实现交替10对；第一对为冷操作，随后9对分别列出：

|口径|之前|之后|
|---|---:|---:|
|冷次同步调用|${fmt(summary.paired.cold.before.synchronousMs)} ms|${fmt(summary.paired.cold.after.synchronousMs)} ms|
|预热同步调用中位|${fmt(warm.beforeSyncMedian)} ms|${fmt(warm.afterSyncMedian)} ms|
|预热至图片可用中位|${fmt(warm.beforeTotalMedian)} ms|${fmt(warm.afterTotalMedian)} ms|

异步期间继续出现2–4次动画帧回调，同步原路径0次；编码图片字节完全相同。这里减少的是当前调用阻塞，总完成时间略增，首次冷长帧依然存在，不是自然FPS或GPU耗时收益。真实游戏内相同截图的12次组件采样也单列，回调可能被持续绘制推迟约一百多毫秒，不承诺固定延迟。

|浏览器记录|阶段数|截图|错误|滚动缓存最大条目|概览末尾条目|截图同步/完成中位 ms|
|---|---:|---:|---:|---:|---:|---:|
${runTable}

两版各11次Web新局，固定version3/seed529依次覆盖五图两轮再回查尔；离线各3次查尔→冰→查尔。用诊断结束当前关卡后执行真实撤离、返回、新局和就绪提交，不是自然完成战役。两版${summary.pairs.length}个阶段的phase/time/tick/recipe/RNG摘要(仅归一新局UUID)和模型key精确；不是全World跨版本逐字段对照。60个概览的前五图和淘汰后重算字节一致，120次切页为独立压力；常规内存账户中概览缓存可保持0条，不能把压力频率当真实频率。

首局/换图时间作为功能上下文保留，不作为加载收益：Web基线首局及少量早期样本与轻量构建/检查有重叠；两轮还存在驱动与系统波动。离线基线首次240秒测试超时原样保留。未证明总加载或总内存有稳定下降。

## 缓存和内存趋势

使用显式GC后的实际JS保留堆；不是自然峰值、进程内存或显存。Web直接读取资源，不走部署HTTP资源清单缓存；离线保留的Blob与编码片由实际store读取。Blob逻辑字节、共享片字节和编码字符描述不同表示，不相加冒充物理内存。普通纹理RGBA尺寸约${summary.runs['web-candidate-r1-1'].stages[0].decoded.decodedPixelEstimate}字节，是估算，GPU只记录数量。

|运行与阶段|JS堆 MiB|地图视图|几何/纹理数|离线已准备ID|共享片内容字节|未释放编码字符|
|---|---:|---:|---|---:|---:|---:|
${memoryTable}

初次遍历引入地图素材和程序，后续同图GPU计数复现，地图视图在本窗口保持有限。纹理来源与部队集固定后，不见按每次开局持续新增同类GPU对象；JS堆仍有小幅差异，诊断逐帧记录、资源时间记录、JIT/浏览器分配均在其中，未逐对象归因，不能据11局证明无限长局无泄漏。原始资源URL是已解码离线资源可恢复的来源，编码片释放后不能随意撤销；本批不靠丢活跃资源换取假内存收益。

## 验证与证据

- 完整回归1745项：首轮1738通过/7网络权限失败；对应三个文件提权重跑16项通过。22项定向测试、类型检查、数据文档检查通过。新增测试覆盖容量/重新生成、单编码任务/旧局回调/存储失败、同长坏内容、坏hash及重试。
- 原包2834片、1874资产、共享片${summary.pack.uniqueChunkBytes}字节、逻辑${summary.pack.logicalBytes}字节全部通过生产按需校验并独立读回SHA；检查后所有编码片引用均释放。兼容整包恢复的坏hash拒绝另有测试。这是清单内容完整性，不是来源签名。
- 最终Web与离线真实WEBGL_lose_context恢复均通过；模型key和战局摘要精确。离线额外完整比对entities/economy/stats/expedition/statuses/specials/account，epoch递增一次。原始图片、失败及不同脚本版本各自保留。
- 最终浏览器无页面/控制台错误，离线HTTP请求0。${visual.imagesReviewed}张选定图经联系表/原图查看，未见新增黑图、错图或布局错误；未要求/宣称原客户端逐帧校准或用户视觉验收。
- [范围报告](../../reports/qa/performance-l03-20261020.json)、[汇总](../../${root}/summary.json)、[逐资产验证](../../${root}/pack-proof-1/report.json)、[请求资源绑定](../../${root}/requested-assets.json)。Web实际请求${assets.length}个本地路径按哈希绑定；是文件/路径及正值decodedBodySize验证，不是每个网络响应体SHA。

## A01 当前复核

${Object.entries(audit).map(([id,result])=>`- **${id}**：${result}`).join('\n')}

## 构建与失败保留

最终JS \`${build.outputs.find(o=>o.file.endsWith('/main.js')).sha256}\`，${build.inputs.length}编译输入/${build.inputs.filter(i=>i.file.startsWith('src/')).length}生产输入；仅上述4文件相对L02不同。无关economic-egg工作区改动继续排除。当前main仍be9e2982944314194c6dcc9dcc535bc321749eb4；各批本地改动尚未提交。

测试离线HTML \`${offline.html.sha256}\`，${offline.html.bytes}字节，保存于reports/local；预览为preview/performance-l03-20261020-candidate-r1/（4439）。未替换Current、提交、推送或发布。

${failures.map(f=>`- [${path.basename(path.dirname(f.path))}/${path.basename(f.path)}](../../${f.path})：${f.reason}`).join('\n')}

300上限、4∶4∶1、完整效果、五图、模拟经济和存档延期保持。自然战役/物理输入/人类体验/全内容性能及生产验收未由本批关闭。
`;
await fs.writeFile(doc,text);
const artifacts=[];
async function collect(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory()){if(entry.name==='profile'||entry.name.endsWith('-inputs'))continue;await collect(file);}else if(/\.(json|log|png|webp|m?js|mts|ts|py)$/.test(file)){const bytes=await fs.readFile(file);artifacts.push({file,bytes:bytes.length,sha256:hash(bytes)});}}}
await collect(root);
for(const file of ['tools/build-performance-l03.mjs','tools/build-performance-l03-offline.mjs','tools/performance-l03-runtime.ts','tools/qa-performance-l03.mjs','tools/measure-performance-l03.mjs','tools/verify-performance-l03-pack.mts','tools/summarize-performance-l03.mjs','tools/review-performance-l03.py','test/performance-l03.test.ts',doc]){const bytes=await fs.readFile(file);artifacts.push({file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(qa,JSON.stringify({date:'2026-10-20',status:'complete-locally',scope:'L03 UI cache bounds, asynchronous previews, on-demand offline integrity; five associated A01 reviews',main:'be9e2982944314194c6dcc9dcc535bc321749eb4',productionChanges:changes,build,offline,archivesVerified:true,summary,audit,failures,visual,regression:{total:1745,firstPass:1738,firstNetworkFailures:7,retryFiles:3,retryTests:16,retryPass:16,targeted:22,typecheck:true,dataDocs:true},limits:{crossReleaseDiskEvictionImplemented:false,stableTotalMemoryGain:false,totalLoadingGain:false,fullContentFPSAccepted:false,naturalCampaignAccepted:false,physicalInputAccepted:false,humanAccepted:false,committed:false,pushed:false,currentReplaced:false},artifacts},null,2)+'\n');
const boardFile='docs/project/performance-board.json',b=await read(boardFile),task=b.tasks.find(t=>t.id==='L03');assert.equal(task.status,'待验证');
task.status='已完成';task.updated='2026-10-20';task.result='8条/1MiB概览与64条/128KiB滚动缓存，单任务异步截图，离线按需SHA完成。1745项回归覆盖、1874资产逐一校验、Web五图11局/离线3局与真实上下文恢复通过；A01补5条。预热截图阻塞减少但总延迟增加，冷回退/离线等待超时保留；不声称总内存或FPS提升，跨版本磁盘预算仍未实施。';task.evidence.push('PERFORMANCE_L03_20261020.md','../../reports/qa/performance-l03-20261020.json');
for(const [id,result]of Object.entries(audit))b.auditRows.find(r=>r.id===id).currentReview='2026-10-20 L03复核：'+result;
const a=b.tasks.find(t=>t.id==='A01');a.updated='2026-10-20';a.result+=' L03补L05/L06/UI-PREVIEW-001/UI-CACHE-001/LOAD-018五条当前结论，保留磁盘预算及冷长帧限制；整体仍待办。';a.evidence.push('PERFORMANCE_L03_20261020.md');
b.updated='2026-10-20';b.revision++;b.next='A01';b.updates.push({date:'2026-10-20',tasks:['L03','A01'],change:'L03本地完成：界面缓存限额/异步截图/按需SHA，1745回归覆盖、1874原资产独立核验、Web/离线重复开局与恢复通过。冷回退/旧超时/权限失败原样保留，不宣称全资源预算或总内存/FPS提升。50项完成39、剩余11；下一项A01剩余逐条复核，未开始新批。',evidence:['PERFORMANCE_L03_20261020.md','../../reports/qa/performance-l03-20261020.json']});
await fs.writeFile(boardFile,JSON.stringify(b,null,2)+'\n');
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(file,'utf8'),split=old.indexOf('\n'),link=file==='docs/project/README.md'?'PERFORMANCE_L03_20261020.md':'project/PERFORMANCE_L03_20261020.md';
 await fs.writeFile(file,old.slice(0,split+1)+`\n> 2026-10-20：[L03 缓存与预览完成](${link})；性能看板39/50，下一项A01剩余复核。缓存限额、异步截图与离线按需SHA通过；冷长帧、磁盘预算及总内存边界保留。\n`+old.slice(split+1));
}
const old=await fs.readFile('AGENTS.md','utf8');
await fs.writeFile('AGENTS.md',`## L03 缓存与预览完成 · 2026-10-20

- 用户授权L03。记录docs/project/PERFORMANCE_L03_20261020.md，证据reports/qa/performance-l03-20261020.json。50项完成39、剩余11；下一项A01剩余复核未开始，A01整体仍待办。
- 仅4生产文件：概览最近8条/1MiB、滚动位置64条/128KiB，按有效载荷预算；暂停截图同规格单任务异步编码/读取、旧局回调保护，存储移到回调；离线按需和整包恢复逐asset异步SHA后才发布URL。活跃资源、资产字节及存档延期保持。
- 1745回归首轮1738通过/7本机网络权限失败，三个文件16项重跑全过；22定向、类型/数据、2834片/1874资产生产校验及独立读回通过。最终Web五图11局、离线3局及两侧真实WebGL恢复；错误0、离线HTTP0。详见报告范围，不代表自然战役。
- 同页相同图10对交替，9预热同步中位${fmt(warm.beforeSyncMedian)}→${fmt(warm.afterSyncMedian)}ms，总完成${fmt(warm.beforeTotalMedian)}→${fmt(warm.afterTotalMedian)}ms；冷同步120.2→140.1ms回退保留。概览重算和编码字节一致，非总加载/总内存/FPS提升。跨版本磁盘预算未实施。
- 离线基线240秒仍GPU预热的测试超时保留，420秒测试窗口复查实际约137秒完成；首次波动根因未定位，没有修改游戏ready/超时逻辑。A01补5条，LOAD-018不搬回已否证释放方案。所有权限/超时/冷回退保留。
- 最终JS ${build.outputs.find(o=>o.file.endsWith('/main.js')).sha256}，440输入/414生产输入；HTML SHA ${offline.html.sha256}。预览preview/performance-l03-20261020-candidate-r1/（4439），冻结L02并排除economic-egg。未替换Current、提交/推送/发布；300/4∶4∶1、完整效果、五图、模拟经济、存档延期与整体MVP边界保持。

`+old);
console.log(JSON.stringify({complete:true,artifacts:artifacts.length,resourcePaths:assets.length,revision:b.revision,done:b.tasks.filter(t=>t.status==='已完成').length,next:b.next}));
