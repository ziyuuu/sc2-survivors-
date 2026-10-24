import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='reports/local/g03-farm-minor-20261023',date='2026-10-23',sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const summary=JSON.parse(fs.readFileSync(root+'/summary-live.json','utf8')),plan=JSON.parse(fs.readFileSync(root+'/plan.json','utf8')),before=JSON.parse(fs.readFileSync(root+'/before.json','utf8')),inputs=JSON.parse(fs.readFileSync(root+'/inputs.json','utf8')),batch=JSON.parse(fs.readFileSync(root+'/batch-status.json','utf8'));
const document='docs/project/G03_FARM_MINOR_20261023.md',reportFile='reports/qa/g03-farm-minor-20261023.json',boardFile='docs/project/performance-board.json';
assert(summary.complete&&summary.count===24&&summary.missing.length===0);assert.equal(batch.pending,0);assert.equal(batch.active.length,0);assert.equal(batch.finished.length,24);assert(batch.finished.every(r=>r.existing||r.code===0));assert(!fs.existsSync(reportFile));
const modePlan=JSON.parse(fs.readFileSync(root+'/mode-plan.json','utf8')),modeBatch=JSON.parse(fs.readFileSync(root+'/mode-batch-status.json','utf8'));assert.equal(modeBatch.pending,0);assert.equal(modeBatch.active.length,0);assert.equal(modeBatch.finished.length,8);assert(modeBatch.finished.every(r=>r.existing||r.code===0));assert.equal(summary.executionCounts.formal.total,32);
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
assert.equal([...walk('src'),...walk('test')].length,before.files.length);
for(const f of before.files){assert.equal(sha(f.file),f.sha256,f.file);if(f.file.startsWith('src/'))assert.equal(sha(before.baseline+'/'+f.file),f.sha256,f.file+' frozen source');}
assert.equal(sha(before.current.file),before.current.sha256);
for(const name of ['package.json','tsconfig.json'])assert.equal(sha(name),sha(root+'/before/'+name),name);
for(const [p,h] of Object.entries(plan.tools)){assert.equal(sha(p),h,p);assert.equal(sha(root+'/runtime-tools/'+p),h,p+' copy');}
for(const [p,h] of Object.entries(modePlan.tools)){assert.equal(sha(p),h,p);assert.equal(sha(root+'/mode-runtime-tools/'+p),h,p+' copy');}
for(const r of [...summary.originalRows,...summary.correctedRows]){assert.equal(sha(r.file),r.sha256,r.file);assert(!fs.existsSync(r.file+'.lock'));assert.equal(r.reconciliation.minerals,0);assert.equal(r.reconciliation.gas,0);assert.equal(r.outsidePlacements,0);}
for(const r of summary.correctedRows){const original=summary.originalRows.find(o=>o.id===r.id);assert.deepEqual(JSON.parse(fs.readFileSync(r.file,'utf8')).opening,JSON.parse(fs.readFileSync(original.file,'utf8')).opening,'replay opening '+r.id);}
assert.equal(inputs.items,288);assert.equal(inputs.oldFirstSeedAccountsExact,12);assert(inputs.allLegal);
const repeated=JSON.parse(fs.readFileSync(root+'/consumption-probes-r3-first.json','utf8')),specific=JSON.parse(fs.readFileSync(root+'/strategy-probes-r1.json','utf8'));
assert.equal(repeated.rows.length,12);assert.equal(specific.rows.length,7);assert([...repeated.rows,...specific.rows].every(r=>r.pass));
for(const [f,n] of [['consumption-probes-r4-first.json',12],['strategy-probes-r4.json',7]]){const checks=JSON.parse(fs.readFileSync(root+'/'+f,'utf8')).rows;assert.equal(checks.length,n);assert(checks.every(r=>r.pass));}
const mode=JSON.parse(fs.readFileSync(root+'/lurker-mode-red-green.json','utf8'));assert.equal(mode.rows[0].canFire,false);assert.equal(mode.rows[1].canFire,true);assert(mode.rows.slice(2).every(r=>r.unchanged));
assert(fs.existsSync(root+'/findings.md'),'Write evidence-based interpretation after all rows finish');
const findings=fs.readFileSync(root+'/findings.md','utf8');assert(findings.length>200);
const b=JSON.parse(fs.readFileSync(boardFile,'utf8'));assert.equal(b.revision,137);const g=b.tasks.find(t=>t.id==='G03');assert.equal(g.status,'进行中');
const names={terran:'人族',zerg:'虫族',protoss:'星灵',hard:'困难',hell:'地狱',farm:'farm',minor:'小毕业'};
const range=a=>a.length?`${Math.min(...a)}–${Math.max(...a)}`:'—';
const qualityText=a=>Object.entries(a).map(([q,n])=>`${n}${({2:'绿',3:'蓝',4:'紫',5:'橙'})[q]??q}`).join('＋');
const groupTable=['| 难度 | 配装 | 路线 | 进入无尽 | 战败 | 截断 | 战死事件范围 | 修理矿范围 |','|---|---|---:|---:|---:|---:|---:|---:|',...summary.groups.map(g=>`| ${names[g.difficulty]} | ${names[g.tier]} | ${g.total} | ${g.entered} | ${g.lost} | ${g.censored} | ${range(g.deaths)} | ${range(g.repairs)} |`)].join('\n');
const rowsTable=['| 种族/难度/层级/种子 | 结果 | 战死事件 | 修理矿/气 | 付费英雄复活 | 战斗乘员入队/损失 | 八槽初始→最终品质 |','|---|---|---:|---:|---:|---:|---|',...summary.rows.map(r=>`| ${names[r.race]}/${names[r.difficulty]}/${names[r.tier]}/${r.seed} | ${r.stop==='entered-endless'?'进入无尽':r.stop==='lost'?'第'+r.stage+'关战败':'截断（未完成）'} | ${r.deathEvents} | ${r.repairMinerals}/${r.repairGas} | ${r.paidHeroRevivals} | ${r.deliveries['body/released']??0}/${r.deliveries['body/lost']??0} | ${qualityText(r.openingQuality)} → ${qualityText(r.finalQuality)} |`)].join('\n');
const total=k=>summary.rows.reduce((n,r)=>n+r[k],0);
const reporters=['tools/start-g03-farm-minor-20261023.mjs','tools/run-g03-farm-minor-20261023.mjs','tools/prepare-g03-farm-plan-20261023.mts','tools/summarize-g03-farm-minor-20261023.mjs','tools/close-g03-farm-minor-20261023.mjs','tools/prepare-g03-mode-correction-20261023.mjs','tools/prepare-g03-mode-replay-20261023.mjs','tools/freeze-g03-mode-plan-20261023.mjs','tools/run-g03-farm-mode-20261023.mjs'];
reporters.push('tools/run-g03-mode-after-original-20261023.mjs','tools/inspect-g03-farm-pressure-20261023.mjs','tools/verify-g03-farm-closeout-20261023.mjs');
reporters.push('tools/write-g03-farm-findings-20261023.mjs');
const reportingTools={};for(const p of reporters){const f=root+'/reporting-tools/'+p;fs.mkdirSync(path.dirname(f),{recursive:true});assert(!fs.existsSync(f));fs.copyFileSync(p,f);reportingTools[p]={file:f,sha256:sha(f)};}
const report={date,status:'complete-measurement-discussion-pending',authorization:'Audit consumption and reinforcement, complete 24 farm/minor cases; preserve current game values and discuss after measurement.',scope:modePlan.scope,counts:summary.counts,executionCounts:summary.executionCounts,groups:summary.groups,rows:summary.rows,originalRows:summary.originalRows,correctedRows:summary.correctedRows,modeComparison:summary.modeComparison,diagnostic:summary.diagnostic,
 totals:{trainingCards:total('trainingCards'),actualUnitRankIncreases:total('actualUnitRankIncreases'),shopPurchases:total('shopPurchases'),deathEvents:total('deathEvents'),repairs:total('repairCount'),paidHeroRevivals:total('paidHeroRevivals')},
 controlledChecks:{total:22,consumption:12,strategy:7,modePairedCheck:1,nonZergEquality:2,r4RepeatedChecks:19,reproducedStrategyOutputs:7,initialFixtureFailurePreserved:root+'/lurker-mode-red-green-r1-fixture-failure.log',files:['consumption-probes-r3-first.json','strategy-probes-r1.json','consumption-probes-r4-first.json','strategy-probes-r4.json','lurker-mode-red-green.json','strategy-probes-r3-restored.json','probe-output-audit.json'].map(f=>({file:root+'/'+f,sha256:sha(root+'/'+f)}))},
 inputs:{cases:24,legalItems:288,firstSeedAccountsExact:12,file:root+'/inputs.json',sha256:sha(root+'/inputs.json')},
 immutable:{sourceAndTestsUnchanged:before.files.length,completeSourceSnapshot:before.baseline,sourceCount:before.files.filter(f=>f.file.startsWith('src/')).length,manifest:root+'/before.json',manifestSha256:sha(root+'/before.json'),current:before.current,tools:plan.tools},
 evidence:{plan:{file:root+'/plan.json',sha256:sha(root+'/plan.json')},modePlan:{file:root+'/mode-plan.json',sha256:sha(root+'/mode-plan.json')},summary:{file:root+'/summary-live.json',sha256:sha(root+'/summary-live.json')},findings:{file:root+'/findings.md',sha256:sha(root+'/findings.md')},reportingTools},
 boundaries:{newGameSourceChanges:0,newGameTests:0,priorRegressionUnique:2311,priorRegressionReusedBecauseSourceUnchanged:true,newBuild:false,browser:false,gpu:false,human:false,fps:false,currentReplaced:false,commit:false,push:false,release:false},interpretation:findings,limitations:summary.limits};
report.evidence.pressureAnalysis={file:root+'/pressure-analysis.json',sha256:sha(root+'/pressure-analysis.json')};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(document,`# G03 消费与增援策略核对、farm/小毕业补测 · ${date}

状态：授权的策略核对与24条补测完成，当前游戏数值保持。测量结论与后续取舍分开。

${findings}

## 正式24条结果

${groupTable}

这些是三族、两种子的有限程序路线。farm看打通，小毕业还需结合战损、修理、复活、战斗压力及实际换装判断平推；通关不自动代表平推，也不是人类胜率。困难/地狱的英雄、目标和事件会随实际行动产生后续随机分化。

## 消费与增援策略核对

旧星灵简单529用只观察的脚本重放，同为第15关全灭、83537步，最终战斗状态和账户与原记录逐项相同。逐笔确认33名未入队乘员在降落仓HP归零后损失，其中31战斗增援、2培养；没有主动拒收/退役。该因果分类来自本条原生状态变化和调用链，不能外推其他旧记录。

修正仅在测试控制器：一份当前可生产战斗增援预留；必要发展未完成时延后趣味购买，购物保留下一个发展预算；低兵力时配置已解锁的战斗兵种；可见降落仓保护优先于可选拾取和遭遇，地狱必做扩张巢及第18关目标仍优先。全程原生公开动作，不改变游戏价格、概率、增援HP或出生规则。

修正版同一全绿星灵先导进入无尽，没有英雄，死亡事件14→3；战斗增援入队3→24、未入队损失31→1，培养乘员已释放1→46、损失2→1。终局仍全绿。这是完整策略组合的效果证据，后续抽选会分化，不能把差额全部归于某一个改动或当作三族简单完整复验。两条诊断与正式24条分列。

22项独立受控检查通过＝12项消费＋7项策略＋1项潜伏者模式红绿配对＋2项其他种族行为一致性；其中19项消费/策略在r4复验。209矿夹具中原策略的150矿预留挡住100矿使徒解锁，修正后实际购买并剩109矿；新解锁单位进入产线，未完成必要发展时延后可选趣味购买。三族降落仓保护发出原生移动且未改变HP/乘员/随机数，第18关优先保持。夹具包含明确的窗口、钱包和阶段设置，不算自然发生率或整局通关。

首轮虫族小毕业曾出现通关但41次死亡，核查时发现测试控制器在护仓停步后漏恢复潜伏者钻地射击。原生模式红绿确认后，只修改虫族护仓停步分支；游戏源码未改。首轮24条完整保留，8条虫族使用r4重放，最终24条对照为16条原人族/星灵＋8条修正版虫族。总正式执行32条（${summary.executionCounts.formal.entered}通、${summary.executionCounts.formal.lost}败），不能当作32份独立配装。逐条前后差异见JSON的modeComparison；行为变化可能使后续随机抽选分化，不能把战损差全当作单项模式切换的纯因果效果。原夹具失败日志和探针输出命名复算记录也保留。

正式样本实际完成${total('shopPurchases')}次商品购买，其中${total('trainingCards')}张培养卡产生${total('actualUnitRankIncreases')}次真实单位军衔提高；修理${total('repairCount')}次，付费英雄复活${total('paidHeroRevivals')}次。完整购买、预算、产线、队伍、交付与损失原因逐行保留，未入队与入队后战死分开记账。

## 配装与测量边界

困难farm为6蓝2紫，小毕业6紫2蓝；地狱相应6紫2橙、6橙2紫。词条分数160/180、模块品质与旧中间档一致。12条第一种子的完整开局账户与旧记录精确相同；24×12＝288个物品逐件合法。橙色槽使用真实生存者套装，模块按旧档位配置；这是固定中间档候选，不是穷举最优。

装备来自合法预配装，不证明自然获得耗时。原生掉落允许替换属性装，套装保留；八槽最终品质、每件换装和英雄成长另记。没有战中补款、锁血、强制英雄/击杀/掉落；原生发展、生产、修理、技能、特殊关和18关到无尽转场运行。只测无尽实际入场，没有6分钟续测。

每条最多260000固定步或40分钟墙钟，战败、异常、截断不混计。普通战场每约1秒采样队伍人数/总HP比例和敌人数；采样值不是逐帧最低生命，且大生命英雄会影响总HP比例，因此不能单靠该比例认定平推。原生死亡回调记录非临时友军死亡，英雄复活后再次死亡可再次计数；增援账本另外区分身体/培养乘员，虫族双生乘员沿原账本计数。

## 全部路线

品质2/3/4/5为绿/蓝/紫/橙。战死事件包括英雄再次阵亡，修理为实际扣费。战斗乘员入队是交付成功数量，不是最终存活人数。

${rowsTable}

## 完整性与交接

32次正式执行的账本在1e-6记录精度下零差额；原始运行、失败、先导和冻结工具均保留。最终24条共288开局物品合法，8条重放使用相同的另96物品执行记录。829份src/test与本轮开始时精确一致，511候选源码与主工作区一致；镜头/输入/Current保持。没有修改游戏源码、数值、价格或概率，也没有新游戏回归/构建/浏览器/GPU/真机/FPS验收；既有2311唯一回归只作未变源码的既有证据，不重复计作新测试。

G03整体仍待讨论，简单弹幕、诱饵及其余后续任务状态保持。未提交、推送、替换Current或发布。

证据：[完整汇总](../../${reportFile})、[冻结计划](../../${root}/plan.json)、[逐件开局](../../${root}/inputs.json)、[验收口径](G03_ACCEPTANCE_CLARIFICATION_20261023.md)、[旧成长与消费](G03_GROWTH_CONSUMPTION_20261023.md)。
`);
g.status='待讨论';g.updated=date;
const result=`已完成消费/增援策略核对与24条farm/小毕业对照：${summary.counts.entered}进入无尽、${summary.counts.lost}战败、${summary.counts.censored}截断。原24＋8虫族模式修正重放共32次执行，旧失败保留；游戏源码未改。两条星灵全绿诊断另列：旧策略精确复现，33未入队乘员逐笔确认为降落仓HP归零；修正测试预算/产线/保护后通18关、无英雄，战斗增援入队3→24、损失31→1、死亡14→3。22独立受控检查通过，19在r4复验；288对照开局物品合法，12第一种子账户与旧中间档精确相同，32账本零差额；829源码/测试及Current保持。正式分层结果与平推判断见G03_FARM_MINOR_20261023.md，不能只以通关次数替代平推。按用户要求保持当前数值，测完待讨论；G03其余项、T01/U05/D05/V/MVP不关闭。无新游戏修改、回归、构建、浏览器/GPU/FPS或发布。`;
const layerSummary=summary.groups.map(x=>`${names[x.difficulty]}${names[x.tier]} ${x.entered}/${x.total}进入无尽（死亡${range(x.deaths)}）`).join('；');
g.result=result+' 分层：'+layerSummary+'。困难虫族小毕业529修正后48死亡、第16/17关末各余1单位，仍不能判平推；其中6个跳虫未入队损失为明确拒收，54个为仓HP归零。原目标分支的潜伏者行军/钻地配合未独立验收，后续区分控制局限与数值。既有G03内容分档/入口联动、12/9/3/3英雄门槛、横穿入场/出口、巨兽技能分派修复和高品质成长均保持。紫/橙/污染橙基础白字+5%/+8%/+10%、英雄/精英紫橙装备DPS/真实DPS/生命每级额外5%沿用。旧108条分层、102条成长消费与所有失败完整保留；旧2311回归不重复计数。';
g.steps=g.steps.map(s=>s.replace('新版farm/小毕业尚未重测，不以毕业通关替代中间档，也不将旧版地狱farm失败直接判作新版失败。','本次已补齐新版24条farm/小毕业；新旧结果分列，不以毕业通关替代中间档，也不将旧版地狱farm失败直接判作新版失败。'));
g.steps=g.steps.map(s=>s.startsWith('保留简单星灵全绿消费路线第15关失败：')?'简单星灵全绿消费路线第15关失败已完成策略诊断：原策略精确复现，31战斗增援和2培养乘员均因降落仓HP归零损失；新测试预算/产线/护仓策略后同开局进入无尽、无英雄、终局仍全绿，入队3→24、仓内战斗增援损失31→1、死亡14→3。两条诊断独立列出，不能把整体策略效果归给单一环节或外推三族稳定通过。':s);
g.acceptance=g.acceptance.map(s=>s.replace('新版farm/小毕业证据缺口单列，不能拿开荒失败或毕业成功替代其验收。','新版farm/小毕业须有独立证据；本次24条已提供，具体通关与平推结论按结果判断，不能拿开荒失败或毕业成功替代其验收。'));
g.steps.push('已完成授权24条当前数值farm/小毕业路线及消费/增援核对；按实际战损、交付、成长和换装区别通关与平推，测后讨论，不追加数值改动。');
g.steps.push('后续讨论仍失败的farm候选与困难虫族小毕业后期余量：把主动拒收、降落仓被毁、购物架实际供给、目标效率和兵种模式控制与游戏数值分开；原目标分支的潜伏者行军/钻地配合尚未独立重放验收。');
g.evidence.push('../../'+reportFile);b.revision=138;b.updated=date;b.updates.push({date,tasks:['G03'],change:result,evidence:['G03_FARM_MINOR_20261023.md','../../'+reportFile]});
fs.writeFileSync(boardFile,JSON.stringify(b,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'pipe'});
console.log(JSON.stringify({report:reportFile,document,boardRevision:b.revision,counts:summary.counts,next:'Prepend final AGENTS entry, then run the closeout verifier. Do not rerun this one-time finalizer.'}));
