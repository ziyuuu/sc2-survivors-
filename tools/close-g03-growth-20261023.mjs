import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/g03-growth-consumption-20261023';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const summary=read(root+'/summary-final-live.json'),original=read(root+'/summary-live.json'),analysis=read(root+'/consumption-analysis-final.json');
assert.equal(summary.complete,true);assert.equal(summary.count,57);assert.equal(analysis.complete,true);
assert.equal(original.complete,true);assert.equal(original.count,57);
assert.equal(analysis.summarySha256,sha(root+'/summary-final-live.json'));
assert.equal(summary.counts.errors,0,'Investigate any program error before closing this measurement');
const batch=read(root+'/batch-status.json');assert.equal(batch.finished.length,57);assert.equal(batch.active.length,0);assert.equal(batch.pending,0);
const repairBatch=read(root+'/repair-batch-status.json');assert.equal(repairBatch.finished.length,45);assert.equal(repairBatch.active.length,0);assert.equal(repairBatch.pending,0);
assert.equal(fs.readdirSync(root+'/routes').filter(n=>n.endsWith('.lock')).length,0);
assert.equal(fs.readdirSync(root+'/repaired-routes').filter(n=>n.endsWith('.lock')).length,0);
const before=read(root+'/before.json'),after=read(root+'/after.json');
const changed=before.files.filter(r=>sha(r.file)!==r.sha256).map(r=>r.file).sort();
assert.deepEqual(changed,['src/simulation/starship/attributes.ts','src/simulation/starship/runtime.ts','src/ui/starship/equipment-description.ts','src/ui/starship/legacy-view.ts','test/g02-balance.test.ts'].sort());
const added=walk('src').concat(walk('test')).filter(p=>!before.files.some(r=>r.file===p));
assert.deepEqual(added,['test/g03-rank-equipment-growth.test.ts']);
for(const row of after.files){assert.equal(sha(row.file),row.sha256);assert.equal(sha(root+'/after/'+row.file),row.sha256);}
for(const row of before.files.filter(r=>r.file.startsWith('src/')))assert.equal(sha(before.baseline+'/'+row.file),row.sha256);
assert.equal(sha(before.current.file),before.current.sha256);
const historicalRows=original.rows.filter(r=>r.policy==='spending'),allRows=[...summary.rows,...historicalRows];assert.equal(allRows.length,102);
assert.equal(new Set(allRows.map(r=>r.file)).size,102);
for(const row of allRows){assert.equal(sha(row.file),row.sha256);assert.equal(row.reconciliation.minerals,0);assert.equal(row.reconciliation.gas,0);assert.equal(row.outsideCrossing.length,0);}
const full=fs.readFileSync(root+'/full-r1.log','utf8'),retry=fs.readFileSync(root+'/failures-r2.log','utf8');
for(const [log,tests,pass,fail] of [[full,2311,2301,10],[retry,37,37,0]]){
 for(const [label,value] of [['tests',tests],['pass',pass],['fail',fail]])assert.match(log,new RegExp('(?:#|ℹ)\\s+'+label+'\\s+'+value+'\\b'));
}
for(const name of ['typecheck-final','data-final'])assert.ok(!/error TS|not up to date|ERR!/.test(fs.readFileSync(root+'/'+name+'.log','utf8')));
const probes=read(root+'/consumption-probes-r5-repaired.json');assert.equal(probes.rows.length,12);assert.ok(probes.rows.every(r=>r.pass));
const repairRed=read(root+'/repair-selection-original.json'),repairGreen=read(root+'/repair-selection-repaired.json');assert.equal(repairRed.rows.length,3);assert.ok(repairRed.rows.every(r=>!r.pass));assert.equal(repairGreen.rows.length,3);assert.ok(repairGreen.rows.every(r=>r.pass));
const inputs=read(root+'/inputs-and-values.json');assert.equal(inputs.cases,57);assert.equal(inputs.items,684);assert.ok(inputs.pairOpeningAccountsExact);
const cleanup=read(root+'/test-cache-cleanup.json');for(const r of cleanup.removed)assert.equal(fs.existsSync(r.path),false);
const findings=fs.readFileSync(root+'/findings.md','utf8');
const pilotFile=root+'/pilot/after-spending-terran-hard-graduation-529.json',pilot=read(pilotFile);
assert.equal(pilot.stop,'entered-endless');
for(const [file,hash] of Object.entries(pilot.runtimeBinding.tools)){const frozen=root+'/pilot/'+file;assert.equal(sha(fs.existsSync(frozen)?frozen:file),hash);}
const previousTierFile='reports/qa/g03-tier-balance-20261023.json',previousControls=read(previousTierFile).rows.filter(r=>r.tier==='graduation-offense'&&['easy','normal'].includes(r.difficulty));
assert.equal(previousControls.length,12);for(const r of previousControls){assert.equal(r.stop,'entered-endless');assert.equal(sha(r.file),r.sha256);}
const names={terran:'人族',zerg:'虫族',protoss:'星灵',easy:'简单',normal:'普通',hard:'困难',hell:'地狱',entry:'开荒',graduation:'毕业候选',polluted:'净化污染橙候选'};
const arm=r=>r.version==='before'?(r.policy==='legacy'?'旧数值／旧消费':'旧数值／新消费'):'新数值／新消费';
const status=r=>r.stop==='entered-endless'?'进入无尽':r.stop==='lost'?`第${r.stage}关战败`:r.stop==='wall-censored'?'墙钟截断':r.stop==='step-censored'?'步数截断':r.stop;
const counts=rs=>({total:rs.length,entered:rs.filter(r=>r.stop==='entered-endless').length,lost:rs.filter(r=>r.stop==='lost').length,censored:rs.filter(r=>['wall-censored','step-censored'].includes(r.stop)).length,errors:rs.filter(r=>r.stop==='error').length});
const lowDifficultyCounts=Object.fromEntries(['easy','normal'].map(d=>[d,counts(summary.rows.filter(r=>r.version==='after'&&r.difficulty===d))]));
const simpleStarFailure=summary.rows.find(r=>r.version==='after'&&r.race==='protoss'&&r.difficulty==='easy'&&r.stop!=='entered-endless');
const table=['| 数值／消费 | 难度 | 层级 | 路线 | 入无尽 | 战败 | 截断 | 异常 |','|---|---|---|---:|---:|---:|---:|---:|',...summary.groups.map(g=>`| ${arm(g)} | ${names[g.difficulty]} | ${names[g.tier]} | ${g.total} | ${g.entered} | ${g.lost} | ${g.censored} | ${g.errors} |`)].join('\n');
const detail=['| 种族／难度／层级／种子 | 数值／消费 | 结果 | 发展 | 商店完成购买¹ | 培养卡 | 战死事件 | 修理矿／气 | 留存矿／气 |','|---|---|---|---:|---:|---:|---:|---:|---:|',...summary.rows.map(r=>`| ${names[r.race]}/${names[r.difficulty]}/${names[r.tier]}/${r.seed} | ${arm(r)} | ${status(r)} | ${r.development} | ${r.shop.purchases??'—（旧日志'+r.shop.reportedActions+'次请求）'} | ${r.shop.types?.training??(r.policy==='legacy'?'未分类':0)} | ${r.deaths} | ${r.repair.minerals}/${r.repair.gas} | ${r.wallet.minerals}/${r.wallet.gas} |`)].join('\n');
const rounded=n=>Math.round(n*100)/100;
const money=v=>`${rounded(v.minerals)}/${rounded(v.gas)}`;
const consumptionTable=['| 种族／难度／层级 | 共同到达关末 | 旧数值旧消费：购买矿／气 | 旧数值新消费：购买矿／气 | 新数值新消费：购买矿／气 | 三组刷新矿 |','|---|---:|---:|---:|---:|---:|',...analysis.commonProgressPairs.map(p=>`| ${names[p.race]}/${names[p.difficulty]}/${names[p.tier]} | ${p.commonRewardStage} | ${money(p.arms[0].purchases)} | ${money(p.arms[1].purchases)} | ${money(p.arms[2].purchases)} | ${p.arms.map(a=>rounded(a.refresh)).join(' / ')} |`)].join('\n');
const logs=['growth-focused-r1.log','growth-focused-r2.log','related-r1.log','full-r1.log','failures-r2.log','typecheck-final.log','data-final.log','consumption-probes-r1.log','consumption-probes-r2.log','consumption-probes-r3.log','consumption-probes-r4.log','consumption-probes-r5-repaired.log','repair-selection-original.log','repair-selection-repaired.log'];
const boardFile='docs/project/performance-board.json',board=read(boardFile);assert.equal(board.revision,134);const g=board.tasks.find(t=>t.id==='G03');
const reportingTools=Object.fromEntries(['tools/close-g03-growth-20261023.mjs','tools/summarize-g03-growth-20261023.mjs','tools/analyze-g03-consumption-20261023.mjs','tools/inspect-g03-growth-inputs-20261023.mts','tools/probe-g03-repair-selection-20261023.mts'].map(file=>{
 const saved=root+'/reporting-tools/'+file;fs.mkdirSync(saved.slice(0,saved.lastIndexOf('/')),{recursive:true});assert.equal(fs.existsSync(saved),false);fs.copyFileSync(file,saved);return [file,{file:saved,sha256:sha(saved)}];
}));
const report={...summary,totalRouteRecords:102,historicalRows,originalBatch:{file:root+'/summary-live.json',sha256:sha(root+'/summary-live.json'),counts:original.counts},repairCorrection:{scope:'Measurement controller only. Exclude temporary and summoned allies like the existing formal repair UI; no game-rule or other policy changes. Replay all 45 spending cases, not only failures. The 12 original legacy cases remain the old-policy baseline.',red:root+'/repair-selection-original.json',green:root+'/repair-selection-repaired.json',plan:root+'/repair-plan.json',replays:45},status:'approved-growth-implemented-consumption-measurement-complete-overall-balance-open',authorization:before.authorization,findings,analysis:{file:root+'/consumption-analysis-final.json',sha256:sha(root+'/consumption-analysis-final.json'),totals:analysis.totals},inputValidation:{file:root+'/inputs-and-values.json',sha256:sha(root+'/inputs-and-values.json'),cases:57,items:684,pairOpeningAccountsExact:true},probes:{file:root+'/consumption-probes-r5-repaired.json',sha256:sha(root+'/consumption-probes-r5-repaired.json'),passed:12,repairSelection:3,fixture:probes.fixture},source:{baseline:root+'/before.json',candidate:root+'/after.json',baselineFiles:before.files.length,unchanged:before.files.length-changed.length,changed,added,candidateFiles:after.files.length,candidateMatchesMain:true,current:before.current},verification:{uniqueTests:2311,firstRun:{tests:2311,passed:2301,failed:10},retry:{tests:37,passed:37,coveredPriorFailures:10},failureReason:'Three purple equipment damage expectations changed under the approved +5% base, plus seven temp-file/loopback-HTTP permission failures. Only the expected purple damage value changed in the old test. Retried affected files after permission approval; no new production patch.',typecheck:true,dataCheck:true,logs:Object.fromEntries(logs.map(n=>[n,{file:root+'/'+n,sha256:sha(root+'/'+n)}])),newBuild:false,browser:false,gpu:false,human:false,fps:false,publication:false},cleanup,previousBoardResult:g.result};
report.reportingTools=reportingTools;
report.allFormalCounts=counts(allRows);
report.repairCorrection.outcomeChanges=analysis.repairComparison.filter(r=>r.before.stop!==r.after.stop).length;
report.repairCorrection.repairCountChanges=analysis.repairComparison.filter(r=>r.before.repairs!==r.after.repairs).length;
report.lowDifficultyAssessment={current:lowDifficultyCounts,previousEachDifficulty:6,scope:'Prior tested candidates remain valid evidence, not a guarantee for every consumption/controller policy.',unresolved:simpleStarFailure?{id:simpleStarFailure.id,file:simpleStarFailure.file,sha256:simpleStarFailure.sha256,notice:simpleStarFailure.notice,next:'Inspect reinforcement arrival, production choices and spending order. This route retained all green equipment and acquired no hero; do not attribute its failure to the purple/orange numeric change or identify an unproven game defect.'}:null};
report.previousLowDifficulty={report:previousTierFile,sha256:sha(previousTierFile),notNewRuns:true,counts:{easy:6,normal:6},rows:previousControls.map(r=>({id:r.id,file:r.file,sha256:r.sha256,stop:r.stop,policy:r.policy,runtime:r.runtime})),interpretation:'Prior six green and six blue offensive graduation candidates all entered endless. Different controller versions are retained separately; do not merge them into the current sample count or assume every purchasing policy performs equally.'};
report.repairCorrection.legacyBaseline='The 12 unchanged legacy cases retain their original repair-selection behavior and are a historical policy baseline. Old-policy versus new-policy differences include the repair correction; do not attribute them solely to shop refresh or purchase priority. Before/after numeric comparisons both use the same corrected spending controller.';
report.pilot={file:pilotFile,sha256:sha(pilotFile),stop:pilot.stop,reconciliation:pilot.economyAudit.reconciliation,excludedFromFormalRoutes:true,explanation:'Initial diagnostic summed already rounded ledger groups and retained a 1e-6 residual for each currency. The formal driver sums raw deltas first; no game economy change. This one pilot is additional to the 102 formal runs.'};
report.walletReconciliation={precision:1e-6,aggregate:'Unrounded active-wallet deltas plus all frozen-realm wallet replacements; round only the final residual.',routes:102,minerals:0,gas:0};
fs.writeFileSync('reports/qa/g03-growth-consumption-20261023.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/project/G03_GROWTH_CONSUMPTION_20261023.md',`# G03 高品质装备成长与消费构筑 · 2026-10-23

状态：用户批准的数值、消费构筑补测与必要回归完成；G03整体平衡仍开放。

${findings}

## 已批准实现

紫/橙/污染来源橙的基础白字DPS、生命、护甲相对旧基准分别+5%/+8%/+10%；污染来源橙按总计10%，净化后保留来源。英雄/精英每高于Ⅰ级一级，只对紫橙装备的白字DPS、真实DPS、生命白字贡献额外+5%；Ⅰ/Ⅱ/Ⅲ/Ⅴ/Ⅸ级为0/5/10/20/40%。不是把原生英雄整体属性按该系数放大。

混装仅加成紫橙部分，白字套装倍率和全队卡各进入原公式一次。子机沿用母体身份后分摊，投影冻结创建时的装备贡献，固定支援继续读普通全局DPS，不借用英雄等级系数。绿蓝、攻速、百分比词条、原生身份成长、价格和概率保持。装备详情和图鉴同步。紫装普通DPS提高按原公式将既有核弹样本19536改为20068.8；橙装样本受既定支援上限限制仍是50880。

## 样本和方法

冻结57条：36同种子主对照（三族×困难/地狱×开荒/毕业×旧数值旧消费、旧数值新消费、新数值新消费），12条新数值第二种子，6条简单全绿/普通全蓝控制，3条净化污染来源全橙补充。57×12＝684开局物品合法校验；主对照三组开局账户逐项相同。困难开荒为6蓝2绿/绿色模块，地狱开荒为6紫2蓝/蓝色模块，词条140分；毕业候选词条200分，具体套装/绑定/模块见冻结代码与每行opening。它们是有限候选，不是穷举最优解。此前farm/小毕业样本保留在上一份报告，本批不重复计作新覆盖。

原批全部57条保留（${original.counts.entered}通/${original.counts.lost}败/${original.counts.censored}截断/${original.counts.errors}异常）。中途发现消费脚本把临时召唤体一起送去修理，会使整张原生报价返回null；正式界面本已排除temporary/summonOwnerId，这是测量脚本缺陷。三族红/绿复现后，全部45条新消费策略路线用修正版重放。下表与结论使用12条原旧策略基线加45条修正版，共57条最终对照；历史45条旧新策略数据另列保存，总计102条独立运行，12条重复基线不重复计数。没有据旧漏修结果改游戏修理、价格或战斗数值。

12条旧策略保持原先实际运行的行为，包括修理选择局限，仅作历史策略基线。因此旧/新消费差异也包含修理修正，不能单独归因于商店刷新或购买优先级；旧/新数值的直接对照则都使用同一个修正版消费控制器。

45条重放中，${report.repairCorrection.repairCountChanges}条的实际修理次数变化，${report.repairCorrection.outcomeChanges}条的通败结果变化；逐条变化保存在消费分析中。102条正式运行合计${report.allFormalCounts.entered}通/${report.allFormalCounts.lost}败，不把它与下表57条最终对照的数量混用。

另有1条先导人族困难毕业路线进入无尽，单列保留、不计入102条正式路线。先导账本初版先舍入分组再求和，矿气各留下1e-6残差；正式脚本改为先汇总未舍入金额，游戏经济没有因此改变。

同一原生World、地图、兵力/生产/掉落/技能/购买/特殊关连续运行，终点为完成18关并实际进入无尽；不含无尽6分钟续测。没有战中补钱、锁血、强制击杀、指定掉落或强制送英雄；开局英雄/精英来自装备原生效果。途中依真实掉落换装并保留成套/特殊装备。所有组采用相同的可见威胁、必做目标优先、六成火力进射程和原生主动技能控制规则。

新消费策略按真实报价预留补兵资金，优先支持当前兵种的解锁、研究、产能及培养/英雄/精英；按原生发展次数购买，刷新有次数与预算上限，连续两页无购买后停止。每次预算、货架、购买、培养后实际单位军衔、建筑和生产配置、停购原因均保留。旧消费策略的日志只记接受的请求，可能随后取消新家族替换；不冒称它们全部完成，经济金额用原生累计记录比较。

同种子在不同购买后会消耗不同随机数，后续掉落/英雄/特殊关可能分化；主配对用于比较这组完整策略，不能把所有结果差额归因于单一DPS倍率。消费分析另在各组三条都到达的同一个关末、进入购物前比较累积支出，避免较早失败造成时长偏差。程序策略未经合格人类操作认证，不能外推人类胜率。

每条260000固定步/40分钟墙钟上限。最终57条中${summary.counts.entered}进入无尽、${summary.counts.lost}战败、${summary.counts.censored}截断、${summary.counts.errors}异常；全部102条账本在1e-6记录精度下零差额（先汇总未舍入金额，再计算最终残差），横穿记录无越界。失败、截断与先导保持原样。

${table}

## 消费与回归证据

${analysis.spendingRoutes}条新消费策略路线实际购买${analysis.totals.trainingPurchases}张培养卡，记录${analysis.totals.actualUnitRankUpgrades}次单位军衔提高；英雄/精英商品完成购买${analysis.totals.identityPurchases}次。${analysis.totals.contractsChecked}个窗口检查旧精英合同均为零：正式入口无旧天赋，所以此入口不属于漏测，不为测试恢复旧天赋。

下表取三组共同到达的关末、该窗口购物前快照。原生购买累计包含发展、商店、修理和英雄复活，生产与刷新另外记账；不是只计卡牌价格。每组详细生产费用、建筑研究清单、卡牌分类支出与培养对象可在消费分析JSON逐行核对。

${consumptionTable}

15项受控原生探针全部通过：原12项在修正版重跑，覆盖三族实际预算、三族贷款配额加额外发展共4次、首购免费、付费/获得免费刷新、低余额停购、双人培养、满编精英确认替换、同名英雄付费升阶；另新增三族修理名单筛选正例。受控军队/窗口及寻找可抽选种子的夹具不算自然出现率。旧探针失败（零修理报价被误尝试、第1关窗口未抽到英雄、混入临时体导致漏修）保留；仅修正测试控制器/夹具，没有改游戏价格或概率。

22项新增专项；2311项唯一回归已覆盖：首轮2301通过，3项紫装旧核弹预期与7项临时文件/回环HTTP权限失败，同版更新唯一旧预期后37项重跑全部通过；不能把37再加到总数。214项相关回归、类型/运行时数据检查通过。原失败日志均保留。

828个既有src/test中823保持，4生产文件和1旧测试改变，新增1测试文件。511候选源码与主工作区逐SHA一致；原生英雄/精英定义、镜头/输入/渲染以及Current保持。仅清理本批已关闭的两个P5测试缓存，共${cleanup.bytes}字节；无新浏览器缓存或离线大包复制。

本批没有新构建、浏览器/GPU、人类/真机或FPS验收，未提交/推送/替换Current/发布。${simpleStarFailure?'简单星灵的消费/增援到位复核、':''}简单弹幕人类容错、诱饵定位、困难/地狱开荒与最终G03仍待后续判断；T01/U05/D05及最终V/MVP保持开放。

## 全部路线

¹旧消费日志保留请求次数，完成购买数不与新策略混算；累计矿气消费另在每行nativeEconomy和原始账本中。战死是原生回调事件，英雄复活后再次阵亡可重复计数。

${detail}

证据：[完整汇总](../../reports/qa/g03-growth-consumption-20261023.json)、[同关消费与逐次培养](../../reports/local/g03-growth-consumption-20261023/consumption-analysis-final.json)、[原57条冻结计划](../../reports/local/g03-growth-consumption-20261023/plan.json)、[45条修正重放](../../reports/local/g03-growth-consumption-20261023/repair-plan.json)、[前批分层验证](G03_TIER_BALANCE_20261023.md)。
`);
g.status='待讨论';g.updated='2026-10-23';board.updated=g.updated;board.revision++;
g.result=`G03内容分档、入口联动、12/9/3/3英雄门槛、横穿入场/出口与巨兽技能分派修复已完成，历史108条分层与缺陷重放保留。用户批准的紫/橙/污染橙基础白字+5%/+8%/+10%、英雄/精英紫橙DPS/真实DPS/HP贡献每级额外5%已实现；原生英雄、绿蓝、攻速、百分比词条、价格/概率保持。4生产文件、1旧预期、22新增专项，2311唯一回归、类型/数据通过。12消费探针和57条连续对照完成：${summary.counts.entered}入无尽/${summary.counts.lost}败/${summary.counts.censored}截断/${summary.counts.errors}异常，684开局物品合法、账本零差额；旧/新数值及旧/新消费分离，同关支出与实际培养另有明细。${analysis.totals.trainingPurchases}张培养卡实际提高${analysis.totals.actualUnitRankUpgrades}次单位军衔。具体四难度结论见G03_GROWTH_CONSUMPTION_20261023.md；程序结果不外推人类胜率或全局最优。简单弹幕容错、诱饵价值、开荒目标及最终G03仍开放；T01/U05/D05/V/MVP未关闭。无新构建/浏览器/GPU/FPS验收，Current/镜头/输入保持，未提交/推送/发布。`;
g.result='本批共102条独立运行：原57条全保留，修理名单按正式界面修正后重放全部45条新消费策略；最终对照57条采用12条原旧策略基线加45条修正版，不重复计算基线。'+g.result.replace('12消费探针和57条连续对照完成','15项独立消费探针和57条最终对照完成');
g.result=g.result.replace('本批共102条独立运行：','本批正式对照102条独立运行，另1条先导单列：');
g.result+=` 本批简单全绿${lowDifficultyCounts.easy.entered}/3、普通全蓝${lowDifficultyCounts.normal.entered}/3进入无尽。${simpleStarFailure?'简单星灵第15关全灭，上一关修满但增援大量未入队；保留此前6/6证据，收窄简单统一基本达标的判断，先核实产线、增援与消费策略，未认定游戏缺陷或继续改数值。':''}`;
g.steps=g.steps.map(s=>s.startsWith('本批连续战役按冻结57条计划运行：')?'已完成原57条消费构筑路线和45条修理选择修正重放，共102条独立运行；最终57条对照保留36同种子三组配对、12新数值第二种子、6绿蓝对照、3污染来源橙补充。游戏修理规则不变，旧失败、账本、消费与修理前后差异完整保留。':s);
if(simpleStarFailure)g.steps.push('保留简单星灵全绿消费路线第15关失败：上一关已修满、无英雄、生产账本大量增援未释放入队。先核实产线切换、增援到位与消费顺序，区分测试策略局限和游戏问题，不根据该单条路线直接改难度；此前简单6/6历史证据不抹去，也不外推新策略稳定通过。');
const evidence=['G03_GROWTH_CONSUMPTION_20261023.md','../../reports/qa/g03-growth-consumption-20261023.json'];g.evidence.push(...evidence.filter(e=>!g.evidence.includes(e)));board.updates.push({date:g.updated,tasks:['G03'],change:g.result,evidence});
fs.writeFileSync(boardFile,JSON.stringify(board,null,2)+'\n');
const candidate=summary.rows.filter(r=>r.version==='after'),candidateGroups=Object.fromEntries(['hard','hell'].flatMap(d=>['entry','graduation'].map(t=>[d+'-'+t,counts(candidate.filter(r=>r.difficulty===d&&r.tier===t))])));
fs.writeFileSync('AGENTS.md',`## G03高品质成长与消费构筑补测完成 · 2026-10-23\n\n- 按批准落实紫/橙/污染橙基础白字DPS、生命、护甲+5%/+8%/+10%，英雄/精英紫橙DPS、真实DPS、HP贡献每级额外5%。原生英雄/精英、绿蓝、攻速、百分比词条、价格/概率保持。\n- 57冻结路线完成：${summary.counts.entered}入无尽/${summary.counts.lost}败/${summary.counts.censored}截断/${summary.counts.errors}异常；36同种子三组对照、12第二种子、6绿蓝、3净化污染橙分列，684开局物品合法、账本零差额。实际培养${analysis.totals.trainingPurchases}张/${analysis.totals.actualUnitRankUpgrades}次升阶；旧消费请求与新消费完成购买分别标注，同关比较支出。\n- 新数值新消费困难开荒${candidateGroups['hard-entry'].entered}/6、困难毕业候选${candidateGroups['hard-graduation'].entered}/6、地狱开荒${candidateGroups['hell-entry'].entered}/6、地狱毕业候选${candidateGroups['hell-graduation'].entered}/6进入无尽；未完成详情见报告，不外推人类胜率或所有配装平推。简单/普通判断、消费取舍与未决问题见docs/project/G03_GROWTH_CONSUMPTION_20261023.md。\n- 4生产文件/1旧测试预期/22新增专项；2311唯一回归、类型/数据及12消费探针通过。828既有src/test中823保持，511候选源与主工作区一致。清理本批两个关闭的P5缓存，旧失败保留；无新构建、浏览器/GPU/真机/FPS验收，镜头/输入/Current保持，未提交/推送/发布。\n- 看板${board.revision}：62项51完成、8待办/1待讨论/2暂缓。简单弹幕人类容错、诱饵价值、困难/地狱开荒与最终G03、T01/U05/D05/V/MVP仍开放。报告reports/qa/g03-growth-consumption-20261023.json。\n\n`+fs.readFileSync('AGENTS.md','utf8'));
const handoff=fs.readFileSync('AGENTS.md','utf8'),heading='## G03高品质成长与消费构筑补测完成 · 2026-10-23\n\n';assert.ok(handoff.startsWith(heading));
fs.writeFileSync('AGENTS.md',handoff.replace(heading,heading+'- 本批102条独立运行＝原57条＋45条修理选择修正重放；最终57条对照由12条原旧策略基线＋45条修正版构成，基线不重复计数。漏修来自测试脚本混入临时召唤体，正式界面已有正确筛选，游戏修理未改。15项独立消费探针（12原项用r2重跑＋3修理正例）通过；红例保留。\n').replace('类型/数据及12消费探针通过','类型/数据及15项消费探针通过'));
fs.writeFileSync('AGENTS.md',fs.readFileSync('AGENTS.md','utf8').replace('- 本批102条独立运行＝','- 本批正式对照102条独立运行，另1条先导单列；102＝'));
fs.writeFileSync('AGENTS.md',fs.readFileSync('AGENTS.md','utf8').replace('简单/普通判断、消费取舍与未决问题见docs/project/G03_GROWTH_CONSUMPTION_20261023.md。',`简单全绿${lowDifficultyCounts.easy.entered}/3、普通全蓝${lowDifficultyCounts.normal.entered}/3。${simpleStarFailure?'简单星灵15关全灭，上一关已修满但增援大量未入队；简单统一基本达标判断收窄，需先核实消费/增援策略，未认定游戏缺陷或归因于紫橙数值。':''}具体消费取舍与未决问题见docs/project/G03_GROWTH_CONSUMPTION_20261023.md。`));
console.log(JSON.stringify({revision:board.revision,counts:summary.counts,totalRecords:102,pilots:1,source:report.source,candidateGroups},null,2));
