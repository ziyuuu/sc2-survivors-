import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-d03-20261021',doc='docs/project/PERFORMANCE_D03_20261021.md',qaFile='reports/qa/performance-d03-20261021.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
const functional=await read(root+'/functional-r1/report.json'),visual=await read(root+'/visual-r1/report.json'),review=await read(root+'/visual-review.json'),pairs=await read(root+'/paired-state-candidate-r1-r2.json'),scope=await read(root+'/scope-final.json'),preview=await read(root+'/preview-verified.json'),cleanup=await read(root+'/profile-cleanup.json');
for(const r of [functional,visual,pairs,scope,preview,cleanup])assert.equal(r.pass,true);
assert.equal(review.status,'reviewed');assert.equal(review.images,40);assert.equal(pairs.pairs.length,378);assert.equal(functional.checks.length,49);assert.equal(visual.checks.length,47);
assert.equal(functional.errors.length+visual.errors.length+functional.failedRequests.length+visual.failedRequests.length,0);
const build=await read('preview/performance-d03-20261021-candidate-r1/build-inputs.json'),main=build.outputs.find(f=>f.file.endsWith('/main.js'));
assert.equal(main.sha256,'cd9e22e61e4983680789b9cc9975c7bb62d0a3e7e219a1016ec6713f8a33a011');
const recovery=functional.checks.find(c=>c.kind==='context-recovery');assert.equal(recovery.before.state,recovery.after.state);assert.equal(recovery.after.epoch,recovery.before.epoch+1);
const regression=await fs.readFile(root+'/regression-r1.log','utf8'),retry=await fs.readFile(root+'/network-regression-r2.log','utf8'),targeted=await fs.readFile(root+'/targeted-r1.log','utf8');
assert.match(regression,/tests 1773/);assert.match(regression,/pass 1766/);assert.match(regression,/fail 7/);assert.match(retry,/pass 16/);assert.match(retry,/fail 0/);assert.match(targeted,/pass 15/);
const text=`# D03 地面资源与装备保留规则完成 · 2026-10-21

用户批准“就按这个规则实现，核验后更新看板”。本批实现地面矿气不跨关、白／绿／蓝／紫／橙装备保留2／3／4／5／6关。D03本地完成；52项完成45、剩余7，下一项D04待讨论，尚未启动。[正式证据](../../reports/qa/performance-d03-20261021.json)。

## 规则与实现

保留关数包含掉落当关。例如第5关掉落的白装可在第5、6关拾取，进入第7关时清除。每次成功进入下一关才推进；关间的奖励／装备菜单、暂停、预准备和重复展示均不消耗期限。无尽每轮计一关，第18关转入无尽第1轮也只计一次；准备失败、取消、重复提交不提前清除。

地面矿气进入下一关时全部清除，已进入钱包和累计经济数据的资源不回扣。地面装备到期直接消失，不自动分解、兑换或重新抽取；背包、仓库和已穿戴装备不受影响。成功拾取后再主动丢弃，从这次落地所在关重新计数。满包重试、重新注册展示和图形恢复不会续期。关末实际击杀掉落按击杀所在关记录；旧内存／诊断对象缺少落地关数时，从当前关起算，不直接误删。

仅4个生产文件变动（3旧＋1新）：新增跨关清理模块，给地面位置加落地关数，在装备落地时记录，并接入普通／无尽的成功切关路径。战役转无尽更换地形后，未到期物品重新放到合法可达落点，保留原落地关数。没有改变逐份资源收益、伤害、RNG、刷怪队列、背包容量或渲染实现。

本次授权针对地面掉落。生产账本、购买历史、领取回执、已获取配方记录及尚有守卫的运输舱继续保留，未做历史归档或存档整合。已到期装备的领取来源回执也保留，不能通过重复来源重新生成装备。

## 核验

- 新增15项回归：五品质精确关数；两套装备开关下矿气清理；暂停／关间／准备；已持有装备与再丢弃；64格满包和腾位领取；缺落地关数兼容；关末真实击杀与重复回执；战役转无尽的失败／取消／成功／重复提交；第4097轮等高轮次；账本、守卫、已入账收益和双随机流保持。
- 全量回归共1773项，首轮1766通过、7项受本机环回网络EACCES限制；对应三个测试文件在允许本机网络的环境重跑，16项全部通过。原首轮失败保留，不写成首轮全通过。类型检查和数据文档检查通过，既有测试未修改。
- 冻结基线／候选54个构造场景，每个7个边界，共378次精确状态对照。涵盖3随机种子、3种族、战役第1／7／12关起点和无尽第1／31／4097轮起点。只在基线投影已批准的地面矿气／到期装备删除，并显式排除新增落地关数字段、账户缓存修订和跨新局身份；其余选取的完整运行状态、状态系统、特殊系统、账户与掉落运行态序列化一致。不是自然战役或性能实验。
- 最终构建浏览器功能49条记录：原生菜单／关间按钮推进，高档从第1至7关逐一清除白到橙；中／低档到第3关；满包64及腾位领取；三尺寸；战役转无尽及第2轮。关卡终止和最终胜利条件为受控构造，未冒称自然打通18关。
- 真实WebGL丢失／恢复首次通过，epoch 0→1，time=1、tick=60、关卡2及五件装备落地关数保持。完整比较只排除notice／noticeUntil，前后SHA均为 ${recovery.before.state}。恢复后进入第3关白装正常到期，没有续期。未提高或绕过生产超时。
- 清晰画面补充47条记录、19张图，重复三档、五品质到期、满包、三尺寸及无尽切换；沿用已关闭的同一测试目录。两轮最终页面／控制台错误及请求失败均为0。功能轮21张＋补充19张共40张已通过8张联系表查看，并直接查看5张关键原图。

## 画面与保留的问题

首轮截图包含真实暂停菜单和背景模糊，保留原图；其状态断言有效，但不把这些图作为清晰战场展示。补充轮冻结模拟驱动，拍摄时暂时关闭真实暂停菜单，随后恢复；没有移除CSS或修图。补充画面确认高档第1至7关地面装备数依次5／5／4／3／2／1／0，矿气进入第2关消失，到期模型、光柱和标签不残留。低档保持模型／标签和既有无装饰光柱表现。

1440×900、980×700和390×844均核验剩余物品状态。390宽截图中紫装标签位于窄视野右侧之外，保留这个原有布局限制，不声称所有标签在窄屏完整可读或已完成移动端体验优化。无尽入场截图捕获重新落地的早期展示帧，未作成熟动画或像素完全一致的断言。

首次状态对照在21条后因诊断夹具把人族雷诺绑定到其他种族而失败；保留原失败JSON，改为各族合法英雄后完成378条。Node诊断包的import.meta转CommonJS警告保留为构建限制，浏览器生产包不受此转换。全量回归的网络权限失败、本地预览首轮EACCES及沙箱后台服务未持续导致的ECONNREFUSED、初次进程查询受限均记录；后续本机预览五个实际HTTP文件逐SHA核验通过。没有把旧失败重标通过。

本次未测量帧率、CPU收益、内存上限或长期自然压力。按关清理减少跨关残留，但存活物品仍按原路径扫描；不能据此宣称所有长局增长已经解决。SAVE-005／006／008保持“部分解决”，后续自然压力交V02，存档继续D05延期。

## 构建与交付

718个既有src/test文件中715个逐字节未改，只改3个旧生产文件；新增1个生产模块和1个测试文件。418个最终生产输入中414个与已接受D02低档冻结输入精确相同。覆盖工作区差异时，118项仅换行不同，唯一额外内容差异economic-egg来自其他工作流，未进入本候选。独立特殊玩法分支未混入。

主JS SHA-256：${main.sha256}。本地预览目录：preview/performance-d03-20261021-candidate-r1/；[打开本地预览](http://127.0.0.1:4467/)。只清理本次已关闭测试浏览器的约528MiB临时目录；截图、原始日志、对照和冻结输入保留。

300／4∶4∶1、五张地图、默认高档与中／低选项保持。未替换Current、提交、推送或在线发布。V01–V04、人类试玩、物理设备与整体MVP验收继续开放。
`;
await fs.writeFile(doc,text);
const boardPath='docs/project/performance-board.json',board=await read(boardPath),before=structuredClone(board),task=board.tasks.find(t=>t.id==='D03');
assert.equal(board.revision,101);assert.equal(task.status,'进行中');
const result='D03本地完成：地面矿气不跨关；白/绿/蓝/紫/橙装备保留2/3/4/5/6关（含掉落当关），成功进入下一关清除，无尽每轮计一关。背包/仓库/穿戴、账本/回执与守卫保留；不自动折算收益。15新增回归、1773回归覆盖（7网络权限失败定向重跑通过）、378状态对照、49功能+47清晰画面记录、真实WebGL恢复通过，40图已查看。仅4生产文件，未测FPS或自然长局；存档继续延期。';
task.status='已完成';task.updated='2026-10-21';task.result=result;
task.evidence=[...new Set([...task.evidence,'PERFORMANCE_D03_20261021.md','../../'+qaFile])];
const reviews={
 'SAVE-005':{text:'S05已有账本索引保持；D03仅改变地面掉落保留，未删除历史运输舱/经济对象，尚有守卫的被毁舱保持。原扫描成本与自然长局增长未证明消除，继续V02补证。',follow:['V02']},
 'SAVE-006':{text:'R02查询/标签优化保持。用户批准的D03地面矿气不跨关与白绿蓝紫橙2/3/4/5/6关保留已实现；只在成功切关清理，不按暂停时间衰减、不合并收益，既有物品/模型/光柱/标签清理与图形恢复核验通过。剩余有效掉落仍使用原扫描路径，没有新增FPS或自然长局证据，继续V02。',follow:['V02']},
 'SAVE-008':{text:'S05生产派生索引及U04观察者优化保持；D03授权仅涉及地面掉落，账本/幂等回执/购买历史/已获取记录继续保留，过期物品来源回执不删除。未实施历史归档或证明长期内存增长消失；自然长局交V02，保存/导入/迁移仍D05延期。',follow:['V02','D05']}
};
for(const [id,r] of Object.entries(reviews)){
 const row=board.auditRows.find(x=>x.id===id);row.currentReview='【部分解决】2026-10-21 '+r.text;row.reviewStatus='部分解决';row.reviewedAt='2026-10-21';row.followUpTasks=r.follow;
 row.reviewEvidence=[...new Set([...row.reviewEvidence,doc,qaFile])];
}
const v02=board.tasks.find(t=>t.id==='V02');v02.steps.push('跟踪D03切关清理后的地面掉落及仍保留历史/运输舱的自然长局压力，禁止把受控边界对照当作长期验收');v02.auditIds=[...new Set([...v02.auditIds,...Object.keys(reviews)])];v02.evidence=[...new Set([...v02.evidence,'PERFORMANCE_D03_20261021.md','../../'+qaFile])];
board.revision++;board.updated='2026-10-21';board.next='D04';board.updates.push({date:'2026-10-21',tasks:['D03'],change:result,evidence:['PERFORMANCE_D03_20261021.md','../../'+qaFile]});
assert.equal(board.tasks.length,52);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,45);assert.equal(board.auditRows.length,169);
for(const row of board.auditRows){const old=before.auditRows.find(x=>x.id===row.id);for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration','tasks','previousReview'])assert.deepEqual(row[key],old[key],row.id+':'+key);if(!reviews[row.id])assert.deepEqual(row,old);}
for(const t of board.tasks)if(!['D03','V02'].includes(t.id))assert.deepEqual(t,before.tasks.find(x=>x.id===t.id));
await fs.writeFile(boardPath,JSON.stringify(board,null,2)+'\n');await fs.writeFile(root+'/board-after.json',JSON.stringify(board,null,2)+'\n');
const agentsPath='AGENTS.md',agents=await fs.readFile(agentsPath,'utf8');assert.ok(!agents.includes('## D03 地面掉落保留完成'));
await fs.writeFile(agentsPath,`## D03 地面掉落保留完成 · 2026-10-21

- 用户批准按已讨论规则实现并核验更新看板。4生产文件（3旧+1新）完成，记录docs/project/PERFORMANCE_D03_20261021.md，证据reports/qa/performance-d03-20261021.json；52项完成45、剩余7，下一项D04待讨论未开始。
- 地面矿气不跨关；白/绿/蓝/紫/橙装备保留2/3/4/5/6关，含掉落当关，只在成功进入下一关清除；无尽每轮计一关。满包/暂停/奖励菜单/重复展示/图形恢复不续期；背包/仓库/穿戴及钱包保持，再主动丢弃从本次落地计数，到期不折算收益。
- 15新增回归，1773回归覆盖（首轮1766通过/7本机网络权限失败，三文件16项重跑通过）、类型/数据、378冻结状态对照通过。原生菜单受控切关49记录、清晰画面补充47记录、三档/三尺寸/64满包/无尽转场/实际WebGL恢复通过；40图已查看，正式页面/控制台及请求错误0。非自然全战役或FPS验收。
- 保留首次跨种族英雄夹具失败、网络/预览权限与服务先导失败、首轮暂停遮挡截图；补充图单列。390宽紫装标签在右侧可视范围外，未宣称移动端布局全通过。业务历史/回执/已获取记录/待出守卫保持；SAVE-005/006/008仍部分解决，长期压力V02、存档D05延期。
- 718既有文件715未改，既有测试未改；418生产输入414冻结精确，排除economic-egg他线。主JS ${main.sha256}；preview/performance-d03-20261021-candidate-r1/（4467）。只清本次关闭QA缓存约528MiB，截图与证据保留。未替换Current、提交/推送/发布；300/4∶4∶1、五图、三档、特殊分支与V01–V04/MVP边界保持。

`+agents);
const failureNotes={retained:[{file:root+'/paired-state-candidate-r1.json',reason:'First diagnostic fixture used terran Raynor for other races; failure after 21 paired records, repaired only in later runner.'},{file:root+'/regression-r1.log',reason:'Seven loopback EACCES tests; three files rerun with local networking, 16/16 passed.'},{file:root+'/functional-r1/report.json',reason:'Pause-overlay screenshots retained; clear-playfield visual supplement recorded separately.'}],toolSetup:[{action:'initial preview HTTP verification in sandbox',error:'connect EACCES 127.0.0.1:4467'},{action:'initial CIM query in sandbox',error:'Unable to access CIM resource from client'},{action:'first allowed-network preview HTTP verification',error:'connect ECONNREFUSED 127.0.0.1:4467; initial sandbox-started background server did not remain available'},{action:'restart preview server outside sandbox and verify all five output files',result:'passed; see preview-verified.json'}],buildWarnings:['Node-only esbuild CommonJS diagnostic bundle reports import.meta unavailable; browser ES module build is separate.']};
await fs.writeFile(root+'/preserved-failures.json',JSON.stringify(failureNotes,null,2)+'\n');
const evidence=new Set([doc,root+'/board-before.json',root+'/board-after.json',root+'/inputs-before.json',root+'/scope-final.json',root+'/candidate-r1-node-builds.json',root+'/paired-state-candidate-r1.json',root+'/paired-state-candidate-r1-r2.json',root+'/paired-state-r2-runner.mjs',root+'/targeted-r1.log',root+'/regression-r1.log',root+'/network-regression-r2.log',root+'/typecheck-r1.log',root+'/typecheck-r2.log',root+'/docs-check-r1.log',root+'/preview-verified.json',root+'/preview-server.json',root+'/preview-server-r2.json',root+'/profile-cleanup.json',root+'/preserved-failures.json',root+'/visual-review.json',root+'/visual-review/analysis.json','preview/performance-d03-20261021-candidate-r1/build-inputs.json','test/stage-loot-retention.test.ts',...build.changes,...build.outputs.map(f=>f.file),...review.contacts.map(c=>c.file),...review.pictures.map(p=>p.file)]);
for(const run of ['functional-r1','visual-r1'])for(const name of ['report.json','runner.mjs','helper.mjs'])evidence.add(root+'/'+run+'/'+name);
for(const name of ['start-performance-d03.mjs','build-performance-d03.mjs','performance-d03-runtime.ts','prove-performance-d03.mjs','check-performance-d03-scope.mjs','qa-performance-d03.mjs','d03-browser-helper.mjs','review-performance-d03.py','record-performance-d03-visual-review.mjs','serve-performance-d03.mjs','finalize-performance-d03.mjs'])evidence.add('tools/'+name);
const files=[];for(const p of evidence){const bytes=await fs.readFile(p);files.push({file:p.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}
const qa={task:'D03',date:'2026-10-21',status:'completed-local',pass:true,policy:{groundResources:'Clear on committed next-stage entry; earned wallet unchanged',groundEquipmentStages:{white:2,green:3,blue:4,purple:5,orange:6},includesDropStage:true,endlessRoundCountsOne:true,ownedEquipmentExcluded:true,pauseRewardPreparationDoNotAge:true,noSalvageOrCurrencyConversion:true,collectedThenRedropped:'New lifetime from latest drop stage',businessHistory:'Unchanged; no archive or receipt deletion'},implementation:{productionFiles:build.changes,existingFiles:718,unchangedExisting:715,existingTestsChanged:0,finalProduction:418,unchangedFrozenProduction:414,excludedOtherWork:'src/render/units/economic-egg.ts'},verification:{newTests:15,regression:{total:1773,firstPassed:1766,firstEnvironmentFailures:7,retestedFiles:3,retestPassed:16},typecheck:true,gameDataDocs:true,pairedState:{fixtures:54,comparisons:378,scope:pairs.scope,identityNormalization:'Run UUID and its embedded support-receipt identity normalized; source in paired-state-r2-runner.mjs'},browser:{functionalRecords:49,clearVisualRecords:47,pageConsoleErrors:0,failedRequests:0,screenshots:40,contactSheets:8,directOriginals:5,realWebGLRecovery:{beforeEpoch:recovery.before.epoch,afterEpoch:recovery.after.epoch,beforeState:recovery.before.state,afterState:recovery.after.state,firstAttempt:true}},performanceMeasured:false,naturalCampaign:false},scope:scope,build:{directory:'preview/performance-d03-20261021-candidate-r1',main,preview:preview.url},board:{revision:board.revision,total:52,complete:45,remaining:7,next:'D04',nextStarted:false,auditRows:169},limitations:['No measured FPS/CPU/memory improvement, long-run natural campaign, physical input or human playability acceptance.','390px purple label outside the narrow visible area; no mobile layout redesign.','Functional pause-overlay screenshots retained; separate visible-playfield supplement.','Business histories and surviving-loot scan costs remain; SAVE-005/006/008 partial, V02/D05 follow-up.','Save integration and V01–V04/MVP acceptance remain open.','No Current replacement, commit, push, publication or special-gameplay branch merge.'],failures:failureNotes,cleanup:{onlyClosedOwnQaProfile:true,logicalBytes:cleanup.logicalBytes},evidence:files};
await fs.writeFile(qaFile,JSON.stringify(qa,null,2)+'\n');console.log(JSON.stringify({pass:true,boardRevision:board.revision,completed:45,remaining:7,next:'D04',evidenceFiles:files.length,main:main.sha256}));
