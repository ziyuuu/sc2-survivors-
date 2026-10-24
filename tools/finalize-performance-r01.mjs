import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-r01-20261020',doc='docs/project/PERFORMANCE_R01_20261020.md',reportFile='reports/qa/performance-r01-20261020.json',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
const verified=await read(root+'/verified-summary.json'),pixels=await read(root+'/final-pixels.json'),exits=await read(root+'/check-exits.json'),final=await read(root+'/candidate-r2-final-1/report.json');assert.equal(verified.pass,true);assert.equal(final.pass,true);for(const key of ['tests','typecheck','docsCheck'])assert.equal(exits[key],0);assert.match(await fs.readFile(root+'/tests.log','utf8'),/pass 1721/);
const reviews=[];
for(const dir of ['paired-r2','boundaries-r1','candidate-r2-final-1'])for(const name of await fs.readdir(root+'/'+dir))if(/^contact-.*\.jpg$/.test(name))reviews.push(root+'/'+dir+'/'+name);
reviews.push(root+'/pilot-contact.jpg');assert.equal(reviews.length,23);
const files=[...verified.files];for(const file of [root+'/verified-summary.json',root+'/final-pixels.json',root+'/check-exits.json',root+'/tests.log',root+'/typecheck.log',root+'/docs-check.log',root+'/collection-failure-r1.json',doc,...reviews]){const b=await fs.readFile(file);files.push({file,bytes:b.length,sha256:hash(b)});}
const report={
 schemaVersion:1,id:'performance-r01-20261020',status:'verified-local',
 scope:'R01 actual GPU diagnostics and exact-zero-weight terrain texture sampling; five-map material boundaries and actual context restore. No quality/simulation/content reduction.',
 source:{baselineHead:'be9e2982944314194c6dcc9dcc535bc321749eb4',frozenSource:'reports/local/performance-s07-20261020/candidate-r4-web-inputs',changed:verified.build.onlyChangedProductionFiles,inputs:447,productionInputs:411,candidateOutputs:verified.build.candidate.outputs,excluded:verified.build.excluded},
 tests:{count:1721,passed:1721,failed:0,...exits,gpuTimingCompleteBeforeTests:true},
 gpu:{device:verified.device,method:'Real EXT_disjoint_timer_query_webgl2. Same-page exact production fragment swap, six alternating rounds; 20 measured frames, 8 warmup per variant/stage; 168 windows. All frames retained. Total interval may include CPU submission gaps; stages overlap and were measured separately. CPU/GPU cannot be added.',comparison:verified.gpu,stageSummary:verified.stageSummary,resolution:verified.resolution,limitations:['Temporal GPU outliers retained; Char empty-scene total median regressed 4.35%.','Per-draw transparent sums have query overhead and do not measure fragment overdraw ratio.','Frozen rendering is not natural whole-game FPS or full-content60FPS.']},
 equivalence:verified.invariantPairs,
 pixels:{samePage:verified.pixels,boundaries:verified.boundaryPixels,actualCandidateAndRestore:pixels.comparisons,crossSessionLimit:'Cross-session full World, active fixed camera, active effect requests/draw counts equal. Inactive auto camera target and renderer pool history differ; pixel differences not fully attributed. Do not relabel them as exact A/B.'},
 browser:{scenarios:final.scenarios.length,actualShaders:final.scenarios.filter(x=>x.name.startsWith('quiet-')).map(x=>x.shader),recovery:verified.recovery,afterRestoreMaps:verified.afterRestoreMaps,errors:verified.errors,requestFailures:verified.requestFailures},
 review:{imagesReviewed:57,contactSheets:23,files:reviews,result:'No new missing ground textures, visible seams, black faces, gross attachment/scale errors; not human acceptance.'},
 decisions:{R09:'Adopt exact-zero texture sampling only, explicit gradients before varying branch.',R10:'Keep joint camera/shadow visibility; no unvalidated offscreen removals.',R11:'Existing colorWrite=false and empty refraction bypass are controls; bloom/output retained; quality choices D02.',FX011:'Keep source lifecycles/long beams and re-entry; earlier CPU changes separate.',R15:'Getters/fleet lookups/legacy caps remain; source batches grow. Detailed legacy layer stress continues A01; no hidden cap changes.'},
 retainedFailures:[{file:root+'/paired-r1/invalidation.json',reason:'Initial cross-map diagnostic omitted prepare; first ground query zero. Replaced by new valid run, original preserved.'},{file:root+'/collection-failure-r1.json',reason:'Analysis compared inactive autoTarget in fixed camera; active projection/state equal.'},'Initial Python GBK read failure corrected to UTF-8; browser evidence unchanged.','GPU outliers, same-page tiny differences, restore tiny differences and cross-session large differences preserved.'],
 artifacts:{documentation:doc,preview:'preview/performance-r01-20261020-candidate-r2/',files},
 limits:['No Current replacement, Git commit/push or publication.','300 cap, 4:4:1, full effects, simulation/economy, five-map freeze and save deferral unchanged.','Natural campaign, physical input, human playtest, full-content60FPS and whole MVP not closed.']
};await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
const boardFile='docs/project/performance-board.json',board=await read(boardFile),task=board.tasks.find(x=>x.id==='R01');assert.equal(task.status,'待验证');
const evidence=['PERFORMANCE_R01_20261020.md','../../'+reportFile];task.status='已完成';task.updated='2026-10-20';task.evidence=evidence;task.result='真实GPU阶段/分辨率诊断、七场景168窗口交替A/B、五图10镜头边界及实际候选恢复通过。只跳过严格零权重地表采样；300远程地表2.130→1.625ms（约23.7%），总GPU区间22.866→22.103ms（约3.3%），不是整场FPS。1721回归、类型/数据通过；57图已查看。查尔空场总区间回退、大波动、微差及跨会话大像素差异保留；五图恢复RGB精确。A01本批五条结论，D02仍待讨论。';
const audit={
 'R09':'采纳严格零权重层跳过四次纹理采样，分支外梯度/分支内textureGrad；小权重、材质、mip和画质保持。七场景真实GPU、五图交界及实际恢复证据见R01；查尔波动/回退保留。',
 'R10':'保留镜头可见与阴影范围并集，当前批次共用；屏外投射体仍可能影响画内阴影。独立pass列表/保守边界没有本批候选，不直接剔除；进一步可见性取舍归D02。',
 'R11':'接触深度colorWrite=false及空折射绕过原本已有，不重复计收益。GPU阶段和100/75/50/100%压力已测；保留HDR/辉光/ACES输出，默认画质不改，取舍归D02。',
 'FX-011':'保留源特效生命周期、长光束跨屏与重入，当前无完整保守包围盒。不采用直接屏外停更；本批测透明提交，非片元过绘比例。此前X01–X04 CPU/池优化单列。',
 'R15':'人族英雄getter、舰队child查找和旧stroke 16384顶点/49152索引边界仍在，源DrawBatch按需增长；部分旧精英查找已有此前索引。R01不改容量/输出；全部旧层极限和规模CPU仍待A01补证，不能宣称全解决。'
};for(const [id,value]of Object.entries(audit))board.auditRows.find(x=>x.id===id).currentReview='2026-10-20 A01随R01复核：'+value;
const a01=board.tasks.find(x=>x.id==='A01');a01.evidence=[...new Set([...a01.evidence,...evidence])];a01.result+=' R01补FX-011、R09/R10/R11/R15五条当前结论和去向，含不采纳/待补证范围；169条整体仍未完成。';a01.updated='2026-10-20';
const d02=board.tasks.find(x=>x.id==='D02');d02.evidence=[...new Set([...d02.evidence,...evidence])];d02.updated='2026-10-20';d02.result='R01提供实际GPU各阶段与分辨率压力；保留完整效果，尚未批准或实施降低阴影/接触/辉光/特效密度或更激进可见性取舍。';
for(const id of ['SC02','SC03','SC04']){const scene=board.scenes.find(s=>s.id===id);scene.tasks=[...new Set([...scene.tasks,'R01'])];scene.status+='；R01已测代表场景真实GPU，质量与原输出保持，非自然全内容FPS验收';}
board.next='R02';board.updated='2026-10-20';board.revision++;board.updates.push({date:'2026-10-20',tasks:['R01','A01','D02'],change:'R01待验证→已完成。地表严格零贡献采样优化，7场景168 GPU窗口、5图10镜头、实际候选11场景和真实恢复、1721回归/类型/数据通过；57图已查看。保留波动、查尔总区间回退与跨会话像素差异。A01补5条，D02保持待讨论；50项完成32、剩余18，下一项R02未开始。',evidence});assert.equal(board.tasks.filter(t=>t.status==='已完成').length,32);await fs.writeFile(boardFile,JSON.stringify(board,null,2)+'\n');
const nav='2026-10-20 R01已完成：[真实GPU成本与地表零权重采样](project/PERFORMANCE_R01_20261020.md)。1721回归、七场景GPU交替对照、五图交界及实际恢复通过；局部GPU收益、波动/回退和跨会话差异单列，不宣称整场FPS达标。50项完成32、剩余18，下一项R02未开始。\n\n';
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){const text=await fs.readFile(file,'utf8'),first=text.indexOf('\n\n');assert.ok(first>0);await fs.writeFile(file,text.slice(0,first+2)+nav+text.slice(first+2));}
const agents=`## R01 真实GPU与零权重地表采样完成 · 2026-10-20

- 用户授权R01并要求核验、更新看板。说明docs/project/PERFORMANCE_R01_20261020.md，证据reports/qa/performance-r01-20261020.json；50项完成32、剩余18，下一项R02未开始，A01整体未完成、D02仍待讨论。
- 仅layered-ground生产文件改变：严格零权重才跳过该层双尺度颜色/法线四次采样，UV梯度分支外计算、分支内textureGrad；保留原混合、材质、法线、发光、揭露与底座。接触深度不写颜色、无活动折射绕过原本已有，不重复计收益。画质、阴影/接触/折射/辉光/输出保持。
- 同页真实GPU六轮交替、每阶段20帧/8预热，七场景168窗口；300远程地表2.130→1.625ms（约23.7%），总GPU区间22.866→22.103ms（约3.3%）。冰图地表约34.5%、总约21%下降；玛萨拉总无稳定改善。查尔总12.771→13.327ms回退及大幅GPU波动保留，不报最好值或自然整场FPS提升。GPU/CPU不可相加、重叠阶段不可求和；分辨率100/75/50/100仅诊断，未改默认。
- 1721回归、类型/数据通过；正式7图对照+五图10镜头边界，严格同页最多20像素差1色阶。实际候选11场景、5图已编译GPU片段匹配；WebGL真实丢失恢复epoch0→1、time2/tick120/RNG529保持，World仅notice/noticeUntil归一后精确，恢复战斗663像素差≤2，恢复后五图RGB精确。57图/23联系表已查看，页面/控制台错误0，初始/最终请求取消7/5条。
- 跨会话候选和注入图的World、实际固定镜头、活动请求与绘制计数精确，但资源池/重复绘制历史未统一：五图371–380像素、远程36820、护盾2443不同，具体原因未完全定位，保留且不改标严格A/B。首图未启用autoTarget差异单列。首次跨图漏prepare导致地表GPU零的paired-r1无效先导、GBK分析读取及非活动相机断言失败均保留。
- A01补FX-011/R09/R10/R11/R15当前结论：不直接停止屏外源生命周期/移除阴影投射体，不改旧层容量；旧英雄getter/舰队索引及全部极限仍待补证。最终JS a4c85a6132834c1e4c2205a25be76317e8e07cdf5a94bca544ef5bd7c224d221，447输入/411src，冻结S07仅改一处并排除无关economic-egg；入口preview/performance-r01-20261020-candidate-r2/（4436）。未替换Current、提交/推送或发布；300/4∶4∶1、模拟经济、五图、存档延期与自然/物理/人类/全内容60FPS/MVP边界保持。

`;
await fs.writeFile('AGENTS.md',agents+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:reportFile,revision:board.revision,done:32,total:50,next:board.next,reviewed:57,contacts:reviews.length}));
