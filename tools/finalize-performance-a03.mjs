import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='reports/local/performance-a03-20261021',doc='docs/project/PERFORMANCE_A03_20261021.md',qa='reports/qa/performance-a03-20261021.json';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),write=(f,o)=>fs.writeFile(f,JSON.stringify(o,null,2)+'\n'),unique=a=>[...new Set(a)];
const summary=await read(root+'/summary.json'),before=await read(root+'/inputs-before.json'),prior=await read(root+'/board-before.json'),visual=await read(root+'/visual-review.json'),board=await read('docs/project/performance-board.json'),build=await read('preview/performance-a03-20261021-r2/build-inputs.json');
assert.equal(summary.status,'pass');assert.equal(visual.status,'reviewed');assert.equal(board.revision,92);assert.equal(board.tasks.find(t=>t.id==='A03').status,'进行中');
for(const f of before.files)assert.equal(sha(await fs.readFile(f.path)),f.sha256,f.path);
const testLog=await fs.readFile(root+'/cache-regression-final.log','utf8');assert.match(testLog,/tests 24/);assert.match(testLog,/pass 24/);assert.match(testLog,/fail 0/);
const failures=[
 {kind:'build-scope-correction',path:'preview/performance-a03-20261021/build-inputs.json',detail:'First draft used all 2162 records / 2077 files in the asset source catalog. This exceeded the frozen released selection. Corrected before any browser scenario to the exact 1874 donor-package IDs and hashes; original draft outputs retained.'},
 {kind:'sandbox-network-denial',path:root+'/cache-persistent-1/report.json',detail:'Local Chrome navigation ERR_NETWORK_ACCESS_DENIED under sandbox; zero scenario stages. Authorized retry outside that restriction completed as persistent-2. This was not an automatic approval-review rejection.'},
 {kind:'expected-negative-resource-checks',path:root+'/cache-persistent-2/report.json',detail:'Intentional single-file CacheStorage deletion, server 503, same-length corrupt cached bytes and subsequent retries retained separately from ordinary loading.'},
 {kind:'historical-trigger-not-recorded',path:'docs/project/MVP7A_LOADING_VALIDATION_20261013.md',detail:'Original 7A 148/595/606-of-929 failures retained. A03 reproduces the same symptom and isolates a browser pressure-eviction mechanism; exact pressure events in old runs were not captured.'},
 {kind:'observed-incognito-post-hit-key-loss',path:root+'/observed-key-loss.json',detail:'After 1566 successful hits, only 141 keys remained; 1425 prior keys absent. This is retained as a storage-retention failure, despite successful gameplay and context recovery.'},
 {kind:'optional-preload-failure',path:root+'/pressure-incognito-1/report.json',detail:'Whole-release prefetch failed before any pressure notification. Original low-level exception was not recorded; do not label it retrospectively from the next run.'},
 {kind:'actual-quota-exceeded',path:root+'/pressure-incognito-2/report.json',detail:'Whole-release prefetch captured QuotaExceededError around 856 MB while estimate.quota reported around 11.59 GB. Formal pressure comparison uses the independently established 515 MB main-game subset.'},
];
const gameRows=summary.games.map(g=>{const cold=g.stages.find(s=>s.name==='cold-battle'),same=g.stages.find(s=>s.name==='same-page-battle'),reload=g.stages.find(s=>s.name==='reload-battle'),restored=g.stages.find(s=>s.name==='context-restored');return {name:g.name,cold,same,reload,restored};});
const cacheBodyChecks=summary.caches.reduce((n,r)=>n+r.verifiedBodies,0),gameBodyChecks=summary.games.reduce((n,r)=>n+r.stages.reduce((a,s)=>a+s.disk.verifiedBodies,0),0);
await fs.writeFile(doc,`# A03：部署缓存命中与跨版本留存复核

2026-10-21。用户授权“开始A03”。本轮调查与验证完成，生产代码保持现状。临时浏览器复现了旧7A同类缓存丢失，并用受控压力通知定位到浏览器内存缓存回收机制；正常持久化目录的相同对照保持完整。未捕获旧样本当时的系统压力事件，不宣称逐次历史触发均已追溯。看板42/52，剩余10项，下一项D01尚未开始；磁盘预算与驱逐策略归入D04待讨论。

[性能看板](PERFORMANCE_BOARD.html) · [任务表](PERFORMANCE_TODO.md) · [范围证据](../../reports/qa/performance-a03-20261021.json) · [原始汇总](../../reports/local/performance-a03-20261021/summary.json)

## 已核实的结果

| 检查 | 实际结果 |
| --- | --- |
| 历史7A清单 | 1,177条资源／1,129个独立文件，809,073,180字节；首次实际下载1,129个文件 |
| 历史MVP5清单 | 1,217条／1,168个独立文件，823,440,309字节；只新增39次下载／14,367,129字节 |
| 本轮冻结发行范围 | 1,874条／1,817个独立文件，878,440,787字节；只新增649次下载／55,000,478字节 |
| 刷新和浏览器重启 | 持久化与临时上下文的刷新预下载均0次下载；持久化浏览器完全关闭重开后仍保留1,817个完整文件，0次补下载 |
| 相同内容与别名 | 新release复用相同hash；两个资源ID共享一个Blob，实测1次命中，0下载 |
| 缺失／损坏／失败 | 只删测试浏览器的一个缓存文件后，503不会产生可用URL，同一store可重试；同长度错误正文也被SHA拒绝，只重下该文件 |
| 替换内容 | 控制清单把同一个逻辑ID改指向另一份真实资源；两份hash都继续保留。此项为控制边界，不冒充已发布的新版本 |
| 当前活动资源 | 测试性删除缓存正文后，既有Blob仍逐一通过SHA；断网时实际WebGL丢失／恢复仍通过 |
| 检查与绑定 | 24项定向回归、类型与数据文档检查通过；713个既有src/test文件未改，414个生产编译输入与A02冻结输入逐字节一致 |

预下载使用真实HttpAssetStore/ResourceCache、真实CacheStorage及IndexedDB，HTTP传输缓存关闭以区分来源；它不创建模型Blob。该路径本来不会增加files/cacheHits计数，因此用服务器下载记录、缓存正文和进度判定复用，不能把1,817个缓存文件写成1,817次前台命中。缓存矩阵累计${cacheBodyChecks}次完整正文长度／SHA检查，主游戏检查${gameBodyChecks}次；重复读取不代表这么多独立资源。以上初始预下载矩阵通过，不代表后续主游戏或不同隐私上下文必然留存，下面保留实际异常与配额失败。

三份清单的旧资源全包含在当前集合中，实际可回收的过时资源为0字节。三版本缓存累计为878,440,787字节，不是三份整包之和。浏览器estimate在持久化目录约881.9MB、临时上下文约879.9MB，包含缓存／索引开销并可能波动；这些是十进制MB。persist申请后实测仍为false，不能承诺浏览器永不回收。

## 已复现的浏览器回收机制

临时浏览器首次及同页重进均有1,566个键；刷新实际读取全部1,566份资源后，进入战场只能枚举141个键／211,131,114字节，少1,425份／304,317,911字节。没有缓存警告，estimate仍报约516MB。此时页面已持有全部活动Blob，所以战场可用、命中计数为1,566与后置键数141可以同时成立。首次观察没有逐个读取那些缺失键，不能仅凭该轮键数把所有丢失正文逐一确认。

随后用同样的1,566份／515,449,025字节真实资源集合做独立因果对照。临时浏览器收到CDP模拟的moderate通知后仍完整，critical通知后剩304份／214,380,503字节；直接查询全部原hash，确认1,262份正文缺失，JS层Cache.delete／CacheStorage.delete调用为0，索引仍有1,566行且estimate保持原用量。重新加载后恰好只下载这1,262份，逐一SHA验证恢复完整，活动Blob也保持可读。相同持久化目录的moderate／critical通知后保留全部1,566份，刷新补下载0。这是浏览器内的受控通知，没有制造操作系统内存耗尽。

Chromium的[CacheStorage后端选择](https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/cache_storage/cache_storage_cache.cc)和[内存后端回收实现](https://chromium.googlesource.com/chromium/src/+/HEAD/net/disk_cache/memory/mem_backend_impl.cc)与该现象一致：内存模式与磁盘模式使用不同后端，内存压力可回收前者；保留字节规模也符合该机制。源码参考为读取时HEAD，安装版本精确tag／revision链接未能取得，不能冒充安装二进制逐行绑定。实际因果证据来自记录了版本与revision的本机浏览器测试；自然观察及旧7A未记录到压力事件，其具体系统触发仍是推断。协议定义见[Memory.simulatePressureNotification](https://chromedevtools.github.io/devtools-protocol/tot/Memory/)。

压力夹具的前两次整包预下载还遇到配额拒绝；第二次捕获真实QuotaExceededError，约856MB用量时estimate.quota仍显示约11.59GB。错误由现有可选预下载路径正确报告，尚未执行压力通知；第一轮未捕获底层异常名，不能将第二轮的异常名直接回填第一轮。正式因果测试改用实际主游戏515MB集合，明确隔离这类配额失败。不能用estimate显示的大配额承诺离线整包一定可保存。

结论是保留按hash校验、缺失时重新下载的现有恢复路径。A03没有也不应通过禁止浏览器内存回收来维持隐私上下文缓存；缓存留存指标在V01按持久化与临时上下文分开验收。原7A失败保持原值。

## 主游戏路径

使用同一冻结A02构建、真实HTTP资源清单与正式菜单／准备／进入逻辑，Chrome 155.0.8059.82、1440×900、DPR1、native画质、完整动画和效果。旧7A记录为Chrome154，不把浏览器版本变化推定为异常消失的原因。每轮菜单停留15秒。固定seed529／查尔用于复现；在实际进入提交后诊断暂停，同页返回用诊断结算，因此不代表自然战役或人类操作。

| 浏览器上下文 | 首次进入 | 同页重进 | 刷新进入 | 清除测试缓存正文并断网后 |
| --- | --- | --- | --- | --- |
${gameRows.map(g=>`| ${g.name.includes('persistent')?'持久化':'临时／隐私'} | ${g.cold.http.files}文件／${g.cold.http.downloadBytes}字节下载 | 新增${g.same.http.downloadBytes-g.cold.http.downloadBytes}字节 | ${g.reload.http.cacheHits}命中／${g.reload.http.cacheMisses}未命中／${g.reload.http.downloadBytes}字节下载 | epoch ${g.restored.epoch-1}→${g.restored.epoch}，时间／tick／RNG／模型键／归一运行状态保持 |`).join('\n')}

每侧恢复前核对所有活动Blob正文；恢复后CacheStorage正文0条、下载增量0，页面资源仍可用。比较覆盖selectRunData、状态／特殊系统快照和装备账户，仅归一notice／noticeUntil提示，不能称World所有私有字段及恢复提示原始对象全等。清理后estimate仍可保留索引数据库空间，不等于物理文件立刻归零；GPU对象数也会随恢复后的重新上传改变，不以对象数全等判定画面。这只说明已准备的活动集合能够恢复；清缓存后在新页面断网启动、未准备资源首次使用以及独立HTML的离线恢复不由本测试承诺。独立HTML的逐资源SHA与恢复沿用L03已记录证据，未在A03重跑。

持久化主游戏在每次战场检查点读取缓存正文；临时上下文首次／同页仅枚举键，到最终刷新后才读正文，避免在刷新前用正文读回改变该轮观察条件。所有检查都有探针开销，不比较加载速度。菜单阶段后台准备仍在进行，键数、files与Blob计数不是原子快照；例如首次菜单862个键、863个files并不是已证实丢失，稳定战场均逐项核对完整。

${visual.images}张截图已查看；临时上下文的首次／同页重进以及刷新／断网恢复两对实际画布均RGB逐像素相同。画面结果不抹去缓存后置留存失败。主游戏原脚本pass仅表示其加载／恢复断言通过，没有包含缓存键数量全等断言；本汇总把141键失配单独保留并继续完成原因对照。两侧页面／控制台错误0；预期失败和先导失败原样保存。

## 各类留存分别计量

| 层 | 当前证据与限制 |
| --- | --- |
| 浏览器缓存正文 | 初始完整发行范围1,817个hash、878,440,787字节；主游戏所需1,566个hash、515,449,025字节。持久化目录与隐私内存后端分列；后者出现141键留存，不能都称持久磁盘 |
| IndexedDB索引 | files只记录最后写入release，命中不会登记其他使用版本；删除正文可能留下旧行。它是辅助索引，不能按其条数计算正文占用或直接按旧release驱逐 |
| 页面Blob | 主游戏1,618个已准备ID共享1,566个URL，唯一载荷515,449,025字节；缓存正文清除不撤销这些URL |
| 编码片 | 本轮HTTP页面的离线编码script节点为0；独立HTML的编码片释放与唯一恢复源由L03单列 |
| 纹理与GPU对象 | 记录当前scene材质纹理的图像尺寸×4、typed data长度，以及renderer.info对象数。前者不涵盖所有效果私有纹理或缓存，也不等于实际分配或显存 |
| JS与外部存储 | 各检查点保留CDP堆与backing storage快照；未做强制GC，不当保留堆、进程RSS、峰值或显存，也不与上述载荷简单相加 |

## 预算与驱逐的去向

当前三次真实版本演进没有淘汰资源，自动驱逐可回收量为0。建议本轮保持原有按hash复用、按需准备和用户主动清理，D04再决定是否为可选预下载及未来替换资源实施统一磁盘预算；本轮没有设置任意容量，也没有加入自动清理。

若后续决定实施，具体方案必须先维护当前清单、旧活动页和用户明确离线保留集合的hash引用；按唯一正文计费，以实际缓存读回为准，辅助索引只提供候选。仅对这些集合之外的资源按最近使用时间回收；预算不足时先停止可选预下载并显示状态，必需资源按现有可恢复路径加载。既有Blob、已释放编码片后的唯一离线恢复源不能因此撤销。跨标签页同时更新／清理、浏览器拒绝持久化、配额不足、用户主动清理后的补下载需要随实施验证。

读回索引中仍标为7A的1,128条资源、标为MVP5的39条资源全部被当前版本使用；另1条在故障复测后标为控制release。因此“删旧版本索引项”会损伤当前复用。这个索引边界与浏览器压力回收是两件事，不能混成应用自动驱逐的证据。

## 原异常、失败与验收边界

- 原7A曾出现148／595／606对929的命中／键数异常。本轮复现同类现象并验证了可触发它的浏览器内存压力回收机制，LOAD-007改为证据口径，V01继续区分上下文／后置留存与当次命中；不改成生产缺陷已修复或所有历史触发已追溯。
- L06保持部分解决：页面/UI边界已有L03，本轮补跨版本磁盘证据；统一预算政策仍属D04，不把A03验证完成等同全部内存／磁盘问题关闭。
- R1构建草案误用完整素材目录2,162条资源，浏览器测试前发现；R2严格回到原交付包1,874条ID和SHA。首轮沙箱浏览器本机HTTP被拒，保留failed报告；授权重跑使用新目录。503及缓存损坏是明确控制的负例，未混入正常路径错误。
- 两侧使用本机Chrome／HTTP服务器；已做浏览器压力通知对照和观察到真实配额拒绝，但没有线上Coze或CDN、操作系统低磁盘／内存耗尽、多周留存、移动设备或跨浏览器验收。三版本与多次重开不能证明长期无泄漏。
- A03没有性能优化候选，未测FPS／GPU执行时间或宣称加载加速。全部游戏文件不变，因此只重跑24项相关回归与类型／数据检查；A02的1,747全回归是既有证据，不声称在本轮重跑。

主游戏JS SHA-256：\`${summary.source.mainSha256}\`。主游戏440个编译输入；与缓存探针合计441个联合输入，其中414个生产输入与A02完全一致。所有资源清单、实际响应、脚本和截图在范围证据中绑定。无关economic-egg工作流继续排除；独立特殊玩法分支未混入。

未替换Current、提交、推送或发布。五图、完整画质、300／4∶4∶1、模拟经济与存档延期保持；V01–V04、D01–D04及整体MVP仍未关闭。
`);
const updates={
 'LOAD-007':{status:'证据口径',follow:['V01'],text:'A03临时Chrome复现1566命中后仅141键；受控critical内存压力使1566份降至304，直接读取确认1262正文缺失，应用删除0次，刷新恰好补下缺失部分。持久化目录同压保持1566。已定位可触发同类异常的浏览器内存回收机制；旧7A每次系统触发未记录，原失败不改标修复。V01按上下文、当次命中和后置留存分列，estimate不作为正文保证。'},
 L06:{status:'部分解决',follow:['D04'],text:'A03补真实磁盘证据：1874资源/1817hash共878440787字节，三历史清单全为当前子集，过时可回收0；刷新/浏览器重启不重下，活动Blob在清测试缓存正文和断网后实际恢复。跨版本无自动预算/驱逐，索引release不能作为安全删除依据；策略明确交D04，离线唯一恢复源继续保留。'},
};
for(const [id,u]of Object.entries(updates)){const row=board.auditRows.find(r=>r.id===id);row.previousReview=row.currentReview;row.reviewStatus=u.status;row.currentReview=`【${u.status}】${u.text} 当前去向：A03、${u.follow.join('、')}。`;row.reviewedAt='2026-10-21';row.reviewEvidence=unique([...row.reviewEvidence,doc,qa]);row.followUpTasks=u.follow;row.tasks=unique([...row.tasks,...u.follow]);for(const id of u.follow){const t=board.tasks.find(t=>t.id===id);t.auditIds=unique([...t.auditIds,row.id]);}}
const d=board.tasks.find(t=>t.id==='D04');d.updated='2026-10-21';d.steps.push('结合A03实测决定可选预下载及跨版本磁盘预算：保护当前/活动/离线保留hash，禁止仅按最后写入release驱逐');d.acceptance.push('需要实施预算时给出活动引用、跨页、配额和重新下载验证；未决定前保留现状');d.evidence=unique([...d.evidence,path.basename(doc)]);d.result+=' A03补证：三版本过时可回收0，缓存索引release不是完整所有权；统一磁盘预算/驱逐留待本项决定，未实施。';
const v=board.tasks.find(t=>t.id==='V01');v.updated='2026-10-21';v.steps.push('按LOAD-007／A03结论区分持久化与临时内存缓存、当次命中与后置留存；保留原7A失败，压力回收后验证按缺失hash补下载');
const task=board.tasks.find(t=>t.id==='A03');task.status='已完成';task.updated='2026-10-21';task.result='部署缓存调查完成，无生产修改：三版本1874资源/1817hash共享；临时Chrome复现1566命中后仅141键，受控critical压力确认浏览器回收1262正文、应用删除0次且只补下载缺失部分，持久化目录同压保持完整。两侧活动Blob及断网WebGL恢复通过，22图/两对画布精确；24定向/类型/数据、713文件与414冻结输入通过。原历史触发未逐次追溯，LOAD-007口径交V01；统一预算/驱逐交D04未实施。';task.evidence=unique([...task.evidence,path.basename(doc),'../../'+qa]);board.revision=93;board.updated='2026-10-21';board.next='D01';board.updates.push({date:'2026-10-21',tasks:['A03','D04','V01'],change:task.result,evidence:[path.basename(doc),'../../'+qa]});
for(const old of prior.auditRows){const row=board.auditRows.find(r=>r.id===old.id);for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration'])assert.deepEqual(row[key],old[key]);for(const id of old.tasks)assert.ok(row.tasks.includes(id));}
assert.equal(board.tasks.filter(t=>t.status==='已完成').length,42);await write('docs/project/performance-board.json',board);
const note='> 2026-10-21：[A03部署缓存调查完成](REF)：临时浏览器复现旧类异常，压力对照定位内存缓存回收；按缺失hash补下载及断网图形恢复通过，无生产改动。磁盘预算归D04。看板42/52，下一项D01未开始。\n\n';
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){const text=await fs.readFile(file,'utf8'),at=text.indexOf('\n')+1,link=file==='docs/project/README.md'?path.basename(doc):'project/'+path.basename(doc);await fs.writeFile(file,text.slice(0,at)+'\n'+note.replace('REF',link)+text.slice(at));}
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md',`## A03 部署缓存与跨版本留存复核完成 · 2026-10-21

- 用户授权“开始A03”。记录${doc}，证据${qa}；52项完成42、剩余10，下一项D01尚未开始。
- 无生产修改。三份真实资源清单逐hash复用：1129→1168→1817个独立文件，最终1874资源／878440787字节；历史资源均仍在当前范围，过时可回收0。持久化与临时浏览器刷新0下载，持久化浏览器关闭重开仍完整。
- 两侧主游戏首次各1566文件／515449025字节，同页重进0新增、刷新1566命中／0未命中；仅清测试缓存正文、断网后所有活动Blob逐一校验及实际WebGL恢复通过。页面Blob、scene纹理估算、编码片、缓存正文与索引分列，不当显存或长期无泄漏。
- 24定向回归、类型／数据检查通过，713既有src/test未改，414生产输入与A02冻结输入精确；主JS ${summary.source.mainSha256}。${visual.images}图已查看，最终页面／控制台错误0；R1素材目录范围修正、沙箱失败、503及损坏负例保留。
- 临时Chrome复现1566命中后仅141键；受控critical压力使1566→304，直接读回确认1262正文缺失、应用删除0次，刷新只补缺失部分；持久化目录同压保持完整。机制已定位，旧7A每次系统触发未捕获；LOAD-007证据口径交V01。前两次整包预下载失败保留，第二次实际QuotaExceededError与大estimate配额并存。
- 索引最后写入release不是所有权，删除正文可留旧行；L06部分解决，统一磁盘预算与驱逐交D04，未经决定未实施。没有线上CDN、系统低磁盘/内存耗尽、多周、自然战役或FPS验收。
- 未替换Current、提交／推送／发布；300／4∶4∶1、完整效果、五图、经济、存档延期保持。V01–V04及整体MVP未关闭，独立特殊玩法分支未混入。

`+agents);
const paths=[root+'/board-before.json',root+'/inputs-before.json',root+'/summary.json',root+'/visual-review.json',root+'/retention-audit.json',root+'/asset-files-r2.json',root+'/cache-regression-r1.log',root+'/cache-regression-r2.log',root+'/cache-regression-final.log',root+'/typecheck.log',root+'/docs-check.log','preview/performance-a03-20261021/build-inputs.json','preview/performance-a03-20261021-r2/build-inputs.json',...build.outputs.map(o=>o.file),...['cache-persistent-1','cache-persistent-2','cache-incognito-1','game-persistent-1','game-incognito-1'].flatMap(r=>[root+'/'+r+'/report.json',root+'/'+r+'/runner.mjs']),...['start','build','qa-cache','qa-game','summarize','finalize'].map(k=>({'start':'tools/start-performance-a03.mjs','build':'tools/build-performance-a03.mjs','qa-cache':'tools/qa-performance-a03-cache.mjs','qa-game':'tools/qa-performance-a03-game.mjs','summarize':'tools/summarize-performance-a03.mjs','finalize':'tools/finalize-performance-a03.mjs'}[k])),...visual.files];
paths.push('tools/review-performance-a03.py','tools/qa-performance-a03-pressure.mjs',root+'/game-incognito-1/restore-before.json',root+'/game-incognito-1/restore-after.json',root+'/build-r2.mjs',root+'/observed-key-loss.json',root+'/browser-source-notes.json',...['pressure-incognito-1','pressure-incognito-2','pressure-incognito-3','pressure-persistent-1'].flatMap(r=>[root+'/'+r+'/report.json',root+'/'+r+'/runner.mjs']));
const evidence=[];for(const file of unique(paths)){const b=await fs.readFile(file);evidence.push({path:file,bytes:b.length,sha256:sha(b)});}
await write(qa,{status:'pass',task:'A03',date:'2026-10-21',main:before.main,summary,productionChanges:[],existingUnchanged:713,productionInputs:414,regression:{targetedTotal:24,pass:24,fail:0,typecheck:true,docsCheck:true,fullSuiteRerun:false,previousFullSuite:'A02: 1747 passed; reused historical evidence only'},visual,sourceAdjudications:updates,failures,evidence,document:{path:doc,sha256:sha(await fs.readFile(doc))},boundaries:{currentReplaced:false,committed:false,pushed:false,published:false,automaticEvictionImplemented:false,browserPressureEvictionMechanismReproduced:true,original7ATriggersRetrospectivelyCaptured:false,longTermRetention:false,hostedDeployment:false,naturalCampaign:false,physicalInput:false,humanAcceptance:false,allContent60FPS:false,saveWorkDeferred:true,otherGameplayBranchIntegrated:false},board:{revision:93,tasks:52,completed:42,remaining:10,next:'D01'}});
execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'inherit'});console.log(JSON.stringify({status:'pass',document:doc,report:qa,evidence:evidence.length,images:visual.images,revision:93}));
