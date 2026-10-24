import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/performance-a02-20261020',doc='docs/project/PERFORMANCE_A02_20261020.md',qa='reports/qa/performance-a02-20261020.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const sha=b=>createHash('sha256').update(b).digest('hex'),unique=a=>[...new Set(a)];
const summary=await read(root+'/summary.json'),before=await read(root+'/inputs-before.json'),prior=await read(root+'/board-before.json'),board=await read('docs/project/performance-board.json');
const resuming=process.argv.includes('--resume');
assert.equal(summary.status,'pass');assert.equal(board.revision,resuming?91:90);assert.equal(board.tasks.find(t=>t.id==='A02').status,resuming?'已完成':'待验证');
const review=await read(root+'/visual-review.json');assert.equal(review.status,'pass');
const build=await read('preview/performance-a02-20261020-candidate-r2/build-inputs.json'),baseline=await read('preview/performance-a02-20261020-baseline-r2/build-inputs.json');
const run=await read(root+'/'+summary.run+'/report.json'),equivalence=await read(root+'/reward-equivalence-candidate-r2.json');
assert.equal(equivalence.rows,558);assert.equal(equivalence.pass,true);
const changed=[];
for(const item of before.files)if(sha(await fs.readFile(item.path))!==item.sha256)changed.push(item.path);
assert.deepEqual(changed,['src/simulation/progression/expedition-drafts.ts']);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before.main);
const production=build.inputs.filter(x=>x.file.startsWith('src/')),sourceDiff=[];
for(const item of production){
 const old=baseline.inputs.find(x=>x.file===item.file);assert.ok(old);
 if(item.sha256!==old.sha256)sourceDiff.push(item.file);
 assert.equal(sha(await fs.readFile(root+'/candidate-r2-web-inputs/'+item.file)),item.sha256);
}
assert.deepEqual(sourceDiff,changed);
const regression=await fs.readFile(root+'/regression-r2.log','utf8');assert.match(regression,/tests 1747/);assert.match(regression,/pass 1747/);assert.match(regression,/fail 0/);
const probe=await read(root+'/reward-probe-candidate-r2.json');
assert.ok(probe.rows.filter(r=>r.name==='ordinary-300-deaths').every(r=>!r.rows['reward.context']));
assert.ok(probe.rows.filter(r=>r.name==='boss-death').every(r=>r.rows['reward.context'].calls===1&&!r.rows['reward.fullPool']));
const n=x=>x.toFixed(3),range=a=>`${n(Math.min(...a))}–${n(Math.max(...a))}`;
const cpu=summary.rewardCpu;
const getter=summary.scenes.map(x=>x.getterMsPerFrame),begin=summary.scenes.map(x=>x.beginFrame.msPerFrame),children=summary.scenes.map(x=>x.childPresentation.msPerFrame);
const auto=summary.camera.filter(x=>x.mode!=='fixed').map(x=>x.candidateMedianMs);
const capPeaks={};
for(const scene of summary.scenes)for(const [key,v]of Object.entries(scene.capacities)){
 const row=capPeaks[key]??(capPeaks[key]={peak:0,capacity:v.capacity,submitted:0,dropped:0});
 row.peak=Math.max(row.peak,v.peak);row.submitted+=v.submitted;row.dropped+=v.dropped;row.capacity=Math.max(row.capacity,v.capacity);
}
const failures=[
 {item:'初始构建引用错误',outcome:'诊断入口误用不存在的starship/account，修正为inventory后才产生有效构建；终端原错误保留。'},
 {item:'probe-1本机浏览器网络权限',outcome:'ERR_NETWORK_ACCESS_DENIED，未进入有效游戏；原报告/失败截图保留，获准本机浏览器重跑。'},
 {item:'probe-2不完整技能夹具',outcome:'四技能因缺少战场视图、射程或治疗对象失败；旧12图/报告保留，只作部分先导。后续夹具提供真实合法条件，18英雄技能均成功。其局部时段与Node验证并行，旧计时不作最终收益。'},
 {item:'静态精英目录缓存R1回退',outcome:'上下文计时有回退，Protoss300仅5/12对更快，中位约0.161→0.174ms；该生产文件逐字节撤回。最终仅单位子池保留。'},
 {item:'一次性分析脚本字段错误',outcome:'误用timers/capacity/数组filter与ms字段，部分打印为空或报错；原始rows/capacities/totalMs未改。最终汇总使用实际字段并断言。'},
 {item:'看板中途渲染失败',outcome:'进度记录误用summary而非change/evidence，渲染器报错；立即改正记录结构并成功重新生成两视图。'}
 ,{item:'final-1响应哈希钩子漏匹配',outcome:'8英雄/18镜头/2据点、容量及实际恢复均已完成，最终校验因loadedMainSha256未赋值而失败。服务按Referer把根路径/main.js映射到当前预览，旧钩子误要求URL含预览目录；并非查询参数问题。final-1保留failed。binding-1独立浏览器重载两侧，核验200响应、Referer及实际响应SHA与未改构建相同；未冒充重复完整场景矩阵。'}
 ,{item:'镜头CDP汇总过强断言',outcome:'首次汇总断言18组全0重排失败；实际仅窄屏0敌人fixed窗口出现1次layout/2次style重算，分别约0.207/9.888ms。fixed函数直接返回，这个跨CDP窗口包含UI工作，不能把它归因于cameraFrame，也不能抹除。12组auto/cinematic均0，报告改按原始计数。'}
 ,{item:'收尾文件写入顺序',outcome:'首次收尾先渲染看板、后创建范围报告，链接检查因报告不存在失败；调整为先写报告再渲染，按原修订继续完成并另做最终哈希/链接一致性检查。未覆盖旧运行证据。'}
];
const text=`# A02：客户端剩余候选与英雄效果容量

2026-10-20。用户授权“开始a02”。四项补证完成；只保留一处奖励生成改动。镜头、据点动画与英雄效果实现保持，已记录当前成本及容量边界。下一项A03尚未开始。

[性能看板](PERFORMANCE_BOARD.html) · [完整任务表](PERFORMANCE_TODO.md) · [范围报告](../../${qa}) · [测量汇总](../../${root}/summary.json)

## 实现与结果

| 原审计项 | 当前证据与决定 |
| --- | --- |
| SIM-008 奖励池 | 只抽取原有顺序的英雄/精英子池供Boss与装备单位奖励使用，省去随后必被过滤的训练、经济与卡牌候选。每次仍读取实时资格，原商店池顺序、奖励/RNG、价格、历史、空池回收保持。 |
| R04 镜头 | fixed直接返回；auto/cinematic在两视口×0/32/300敌人的局部中位${range(auto)}ms/次，12组auto/cinematic窗口无新增布局/样式重算。窄屏首次fixed窗口有1次layout/2次style，单列窗口计数，未归因于直接返回的函数。矩形读取仍存在，0重排不等于0读取。保留现状；不搬回旧mainSet慢候选。 |
| R06 据点 | 5个真实据点，可见/屏外各120固定步，均逐帧推进2秒且最终姿态相同。最终循环${summary.forts.map(x=>n(x.loopMsPerFrame)).join(' / ')}ms/帧；内含mixer计时，不可相加。保留增量动画，重入/暂停/移除及实际图形恢复通过。 |
| R15 英雄层 | 18英雄分6组、每组3位满阶，另2组300敌人；全部合法施放，共1440固定步/显示帧。getter合计48次/帧、${range(getter)}ms/帧；Protoss beginFrame每帧2次、合计${range(begin)}ms/帧；childPresentation合计${range(children)}ms/帧。先保留这些低成本读取，不宣称已消除重复。 |

唯一生产文件为[expedition-drafts.ts](../../src/simulation/progression/expedition-drafts.ts)。新增两项回归验证无关资格函数不再执行、实时英雄资格、Boss空池回收与装备空池null。

## 奖励调用与局部收益

三族空装备账户各300次普通敌人死亡：draftContext/完整池均0次；真实Boss死亡1次context，完整池由1降为0；领取0次。关间入口1次context，打开商店/刷新各4次context和1次完整池，三个可见报价资格3次context，实际发生的一次人族全军卡购买1次context。装备单位奖励的直接抽取也绕开完整池。以上是实际生产World方法的受控操作计数，不是自然战役每秒频率；未把空装备击杀结果外推到可触发额外奖励的装备。普通击杀规则保持。

最终未加探针的生产逻辑：三族×0/300敌人×Boss/装备共12组，每组50次预热、12对交替，每窗100次调用；144/144对更快。各组中位${range(cpu.baselineRange)}→${range(cpu.candidateRange)}ms/次，下降${range(cpu.reductionPercent)}%。同时间不运行本批浏览器或测试；不声称系统完全空闲。单次冷调用另存，不足以证明冷态收益。未改的draftContext单独控制样本仍有波动，不认领其收益。

初版静态精英目录缓存因结果不稳定已撤回，包含约0.161→0.174ms的回退样本。最终不缓存动态资格、不改掉落概率、训练、购买或死亡的即时状态，也不把函数收益换算成FPS。

## 正确性、容量与画面

- 18组World（3族×3种子×0/300敌人），31个检查点，共558次奖励及完整选定World/status/special/account对照；含Boss真实死亡/领取/重复、英雄满阶/阵亡、商店购买/刷新/续关。只归一runId、account.run.id和support.stageReceipt的新局UUID前缀。
- 浏览器8个英雄场景和2个据点场景，前后World及相应展示输出精确；镜头18组主体/遮挡/视口输出一致。final-1收尾哈希钩子漏匹配，原报告保留failed；独立binding-1重载确认两侧实际响应JS哈希与未改构建清单相同，未重复完整场景矩阵。页面/控制台错误${run.errors.length}，请求失败/取消${run.failedRequests.length}。
- 实际测量层包括旧英雄材质实例、Protoss条带/本体/外壳、Zerg本体/膜/刺、人族主炮/火箭/导弹/弹壳/光环以及动态技能形状。已测场景容量丢弃0；峰值逐层保存于报告，不能推论所有装备、组合、长局都不会触顶。
- 人为容量边界共84项：固定材质满额后仍按既有规则拒绝第N+1次，条带16384顶点边界及清空后恢复；这类主动越界的drop单列。6套技能orb验证256→512扩展、成功写入第257个；不与自然场景混计。
- 屏外据点重新进入保持mixer时间，暂停20绘制保持姿态；受控移除调用World通知，确认活体mixer释放及死亡视图创建。实际WEBGL_lose_context恢复epoch ${summary.lifecycle.contextEpochBefore}→${summary.lifecycle.contextEpochAfter}，完整记录的战斗状态与模型键精确。移除是渲染生命周期夹具，不冒充自然击杀。
- ${review.images}张截图已通过${review.contactSheets}张联系表查看；明显缺图/黑屏/错误附着检查通过。不是原客户端逐帧匹配、物理输入或人类体验验收。

## 输入与验证范围

起点main ${before.main}，保持未提交/推送。414个冻结生产输入中只改变上述1文件，其余沿用L03；现有economic-egg其他工作流差异明确排除。开始记录的712个src/test文件中711个字节不变；增加1个测试文件。浏览器构建${build.inputs.length}输入，${build.transforms.length}处测量插桩只存在诊断构建，不写入普通入口。

最终JS：${summary.loadedMainSha256}。预览：[A02诊断入口](../../preview/performance-a02-20261020-candidate-r2/index.html)，本地服务4439。此入口包含受控诊断，不作为普通无探针FPS样本。

1747/1747完整回归、类型检查、数据文档检查通过。没有替换Current或命名交付、提交推送或在线发布。五图、300上限/4∶4∶1、完整效果、模拟与经济、存档到MVP收尾的约定保持。独立特殊玩法分支未混入本次输入。

## 失败与保留

${failures.map(x=>`- **${x.item}**：${x.outcome}`).join('\n')}

最初probe-2与最终样本的夹具/插桩不同，旧截图与旧时间不改标成最终。baseline-r2仅3处诊断插桩，最终6处；不据二者渲染时间差宣称优化收益，局部收益只使用同条件无探针逻辑包。原边界和旧失败均保留。

## 看板去向

A02完成后52项完成41、剩余11，下一项A03（部署缓存命中及跨版本留存，未开始）。169条原审计保留原分类、执行、集成元数据和关联。四项现已补当前证据；动画/画质取舍继续D02，所有组合/自然长局/最终FPS仍V01–V04。A02不降低普通游玩60FPS目标，也不关闭整体MVP。
`;
await fs.writeFile(doc,text);
const conclusions={
 'SIM-008':['已解决','A02仅保留Boss/装备单位子池，三族空装备各300普通死亡0context/完整池，Boss完整池1→0；558状态/RNG对照及144/144无探针局部对更快。动态资格保持；静态目录缓存回退撤回。受控操作频次不冒充自然战役或所有装备频率。',[]],
 'R04':['保留现状',`A02两视口×0/32/300×三模式补证；fixed直接返回，auto/cinematic局部${range(auto)}ms，12组auto/cinematic均0布局/样式重算且主体输出保持。窄屏fixed首次窗口1次layout/2次style单列，CDP窗口含UI工作不能归因于cameraFrame。仍读HUD矩形，保留现状；旧mainSet回退不搬回。`,[]],
 'R06':['部分解决','F02私有clone清理已修；A02证实5个活跃屏外据点仍每帧推进，但循环成本小且重入/暂停/移除/实际图形恢复语义通过，因此保留原增量动画。没有实施屏外停更；若进一步改变动画/画质仍交D02。',['D02']],
 'R15':['保留现状','A02补18英雄合法技能/2组300敌人、getter/舰队查找成本和所列旧层submitted/dropped；实际样本0容量丢弃，84固定边界与6动态扩展单列。保留现状；不推论所有装备/长局/组合不可达上限，最终自然规模覆盖归V02。',['V02']]
};
for(const [id,[status,conclusion,follow]]of Object.entries(conclusions)){
 const row=board.auditRows.find(x=>x.id===id),old=prior.auditRows.find(x=>x.id===id);
 row.previousReview=old.currentReview;row.reviewStatus=status;row.currentReview=`【${status}】${conclusion} 当前去向：A02${follow.length?'、'+follow.join('、'):''}。`;
 row.reviewedAt='2026-10-20';row.reviewEvidence=unique([...row.reviewEvidence,doc,qa]);row.followUpTasks=follow;
 row.tasks=unique([...row.tasks,...follow]);
 for(const task of follow){const t=board.tasks.find(t=>t.id===task);t.auditIds=unique([...t.auditIds,id]);}
}
board.revision=91;board.updated='2026-10-20';board.next='A03';
const task=board.tasks.find(t=>t.id==='A02');task.status='已完成';task.updated='2026-10-20';
task.result='四项补证完成。仅Boss/装备单位子池保留：558精确对照、144/144局部CPU对更快，1747回归/类型/数据通过；镜头/据点/英雄查询保留现状。18英雄全部施放，所测旧层0容量丢弃；84边界/6动态扩展、重入/暂停/移除/实际图形恢复通过。静态目录回退撤回，全部失败保留；不关闭整场FPS/自然/物理/人类/MVP。下一项A03未开始。';
task.evidence=unique([...task.evidence,path.basename(doc),'../../'+qa]);
if(!resuming)board.updates.push({date:'2026-10-20',tasks:['A02'],change:task.result,evidence:[path.basename(doc),'../../'+qa]});
for(const old of prior.auditRows){const row=board.auditRows.find(x=>x.id===old.id);for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration'])assert.deepEqual(row[key],old[key]);for(const id of old.tasks)assert.ok(row.tasks.includes(id));}
await write('docs/project/performance-board.json',board);
const note='> 2026-10-20：[A02客户端补证完成](REF)：奖励单位子池局部144/144对更快，558精确对照、1747回归通过；镜头/据点/英雄查询保留，容量与实际恢复已核。看板41/52，下一项A03未开始；不代表全内容60FPS。\n\n';
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n')+1,link=file==='docs/project/README.md'?path.basename(doc):'project/'+path.basename(doc);
 if(!resuming)await fs.writeFile(file,old.slice(0,at)+'\n'+note.replace('REF',link)+old.slice(at));
}
const agents=await fs.readFile('AGENTS.md','utf8');
if(!resuming)await fs.writeFile('AGENTS.md',`## A02 客户端补证与奖励单位池完成 · 2026-10-20

- 用户授权“开始a02”。记录${doc}，证据${qa}；52项完成41、剩余11，下一项A03尚未开始。
- 仅1生产文件：Boss/装备单位奖励直接构建原顺序合法单位子池，实时资格/商店/RNG保持。558精确状态对照、1747回归/类型/数据通过；12组各12/12局部CPU对更快，中位约0.35–0.96→0.12–0.18ms。静态精英目录缓存无稳定收益已撤回，不外推FPS。
- 镜头18组补证，12组auto/cinematic无布局/样式重算；窄屏fixed首次窗口1次layout/2次style保留，不归因于直接返回的镜头函数。5据点可见/屏外保原增量推进，重入/暂停/受控移除/实际图形恢复通过。18英雄全部合法施放，已测旧层0容量丢弃；84固定边界及6动态扩展单列，不宣称所有装备/长局均不可达上限。
- ${review.images}图已查看，最终浏览器错误0；全部先导/权限/回退/脚本失败保留。冻结414生产输入仅改奖励文件，economic-egg其他工作流排除；最终JS ${summary.loadedMainSha256}，预览preview/performance-a02-20261020-candidate-r2/（4439）。
- 未替换Current、提交/推送/发布；300/4∶4∶1、完整效果、五图、经济、存档延期保持。D02画质/动画取舍未实施，V01–V04及整体MVP未关闭；独立特殊玩法分支不混入本次输入。

`+agents);
const evidence=[];
for(const file of [
 root+'/board-before.json',root+'/inputs-before.json',root+'/summary.json',root+'/visual-review.json',
 root+'/reward-equivalence-candidate-r1.json',root+'/reward-equivalence-candidate-r2.json',
 root+'/reward-cpu-candidate-r1-1.json',root+'/reward-cpu-candidate-r2-1.json',
 root+'/reward-probe-baseline.json',root+'/reward-probe-candidate-r2.json',
 ...['probe-1','probe-2','probe-3',summary.run].flatMap(s=>[root+'/'+s+'/report.json',root+'/'+s+'/runner.mjs']),
 root+'/binding-1/report.json',root+'/binding-1/runner.mjs','tools/qa-performance-a02-binding.mjs','tools/serve-performance-b03-cache.mjs',
 ...['regression-r2.log','typecheck-r2.log','docs-check-r2.log'].map(s=>root+'/'+s),
 ...['baseline-logic','candidate-r1-logic','candidate-r2-logic','baseline-probe','candidate-r2-probe'].map(s=>root+'/'+s+'/build-inputs.json'),
 'preview/performance-a02-20261020-baseline-r2/build-inputs.json','preview/performance-a02-20261020-candidate-r2/build-inputs.json',
 ...['start','build','measure','verify','probe','qa','summarize','review','finalize'].map(s=>({
  start:'tools/start-performance-a02.mjs',build:'tools/build-performance-a02.mjs',measure:'tools/measure-performance-a02-rewards.mjs',verify:'tools/verify-performance-a02-rewards.mjs',probe:'tools/probe-performance-a02-rewards.mjs',qa:'tools/qa-performance-a02-probe.mjs',summarize:'tools/summarize-performance-a02.mjs',review:'tools/review-performance-a02.py',finalize:'tools/finalize-performance-a02.mjs'
 })[s]),'tools/performance-a02-runtime.ts','tools/performance-a02-stats.mjs',
 changed[0],'test/performance-a02.test.ts',
 ...review.files
 ]){const bytes=await fs.readFile(file);evidence.push({path:file,bytes:bytes.length,sha256:sha(bytes)});}
await write(qa,{status:'pass',task:'A02',date:'2026-10-20',main:before.main,scope:summary.scope,
 productionChanges:changed,existingUnchanged:before.files.length-changed.length,newTests:['test/performance-a02.test.ts'],frozenProductionInputs:production.length,compiledInputs:build.inputs.length,diagnosticTransforms:build.transforms,
 regression:{total:1747,pass:1747,fail:0,typecheck:true,docsCheck:true},rewardEquivalence:equivalence,summary,capacityPeaks:capPeaks,visualReview:review,
 sourceAdjudications:conclusions,failures,evidence,document:{path:doc,sha256:sha(await fs.readFile(doc))},
 boundaries:{currentReplaced:false,committed:false,pushed:false,published:false,naturalCampaign:false,physicalInput:false,humanAcceptance:false,allContent60FPS:false,saveWorkDeferred:true,otherGameplayBranchIntegrated:false},
 board:{revision:91,tasks:52,completed:41,remaining:11,next:'A03'}});
execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'inherit'});
console.log(JSON.stringify({status:'pass',document:doc,report:qa,evidence:evidence.length,changed,images:review.images,revision:91}));
