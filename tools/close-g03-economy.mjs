import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/g03-economy-20261023',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const v=read(root+'/verification.json'),a=read(root+'/analysis.json');assert.equal(v.pass,true);assert.equal(a.current.length,36);
const board=read('docs/project/performance-board.json');assert.equal(board.revision,125,'Do not run closeout twice');
const initialBoard=read(root+'/before/docs/project/performance-board.json');
for(const t of board.tasks.filter(t=>t.id!=='G03'))assert.deepEqual(t,initialBoard.tasks.find(x=>x.id===t.id),t.id+': unrelated task changed');
const doc='docs/project/G03_ECONOMY_MEASUREMENT_20261023.md',qa='reports/qa/g03-economy-20261023.json';assert.ok(fs.readFileSync(doc,'utf8').includes('本批有限测量已完成'));
const report={status:'measurement-complete-entry-defect-open-and-design-choice-pending',date:'2026-10-23',task:'G03',measurementVerified:true,balanceAccepted:false,productionModified:false,summary:{...v.counts,stops:v.stops,ledger:v.ledger,sourceUnchanged:v.gameSource.unchanged,priorSourceExact:v.gameSource.priorVersionSourceExact},artifacts:{report:doc,plan:'docs/project/G03_ECONOMY_MEASUREMENT_PLAN_20261023.md',analysis:root+'/analysis.json',verification:root+'/verification.json',workshop:root+'/workshop.json',dodge:root+'/dodge-r1.json',crossingEntryProbe:root+'/crossing-entry-probe.json',figures:['routes.png','easy-blue-wallet.png','bait-admissions.png'].map(n=>root+'/figures/'+n),manifest:root+'/final-files.json'},knownIssues:[{id:'G03-CROSSING-ENTRY-001',priority:1,status:'confirmed-unfixed',description:'Native crossing entry formation places back-row members outside terrain; 32-body fixtures of three species leave two bodies outside. Two full routes remain blocked; persistent exit commands do not resolve it.',evidence:root+'/crossing-entry-probe.json',files:['src/simulation/special-stages/bridge.ts','src/simulation/special-stages/terrain.ts'],next:'Fix legal entry placement while preserving party, rewards and controls, then rerun affected continuous routes.'}],probes:v.probe,originReplay:v.originReplay,crossingPolicy:v.crossingPolicy,source:v.gameSource,currentUnchanged:v.gameSource.current,notExecuted:v.notExecuted,retainedPilots:v.oldFailuresRetained,decisionsPending:['是否降低简单弹幕操作要求，具体密度或弹速需另定','低难度诱饵作为额外挑战还是稳定投资，是否调整价格或触发机制','是否需要针对新手前三关或后续内容收益的定向补偿；当前不建议统一加钱'],limits:['Evidence integrity passed; a confirmed native crossing entry defect remains unresolved.','Deterministic production-logic controller samples, not human or natural full-campaign acceptance.','No new gameplay numbers, probabilities, controls or camera changes.','Single-stage bait differences include RNG, combat and purchases, not pure causal profit.','Craft attempts use independent clones of actual settled accounts; successes are alternatives, not cumulative.','No new browser, physical-input, graphics-recovery, FPS, full-regression or build validation.','Previous 2264 regression results belong to G03 content integration and are not counted again.','No Current replacement, commit, push or publication.'],storage:{newGameBuilds:0,newBrowserProfiles:0,cleanup:'No new QA browser cache; raw evidence and limited frozen tools retained, existing asset/build shared.'}};
fs.writeFileSync(qa,JSON.stringify(report,null,2)+'\n');
const outcome=`36条主路线：${v.stops.current['endless-six-minutes']??0}完成18关＋无尽6分钟、${v.stops.current.lost??0}战败、${v.stops.current['wall-clock-censored']??0}墙钟截断、${v.stops.current['step-count-censored']??0}横穿入场阻断后步数截断`;
const g03=board.tasks.find(t=>t.id==='G03');g03.status='待讨论';g03.updated='2026-10-23';
g03.result='已完成频次、G01英雄门槛、G02收益方案和G03内容分档／全部入口联动，上一批2264回归及浏览器证据保留。2026-10-23完成有限整局经济与压力测量：'+outcome+'；12分档前配对、12开局策略／种子敏感性、144诱饵条件样本、126弹幕样本及'+v.counts.crossingReplays+'横穿输入补测。发现原生横穿大队伍入场越界：5短复现中三族32人各2人越界，持续移动10秒仍不动；两整局重放仍卡住，缺陷尚未修复，优先处理。'+v.counts.originReplays+'诱饵精英来源重放其余已记录状态精确；'+v.ledger.rows+'账本零差额，'+v.counts.workshopAttempts+'工坊独立试购。三族／配装／消费策略差异显著，不建议统一补矿气或机械折扣诱饵；简单弹幕操作要求和诱饵定位需新用户决定，未调整游戏数值。825个src/test与Current保持，无新构建／浏览器／全量回归。12第二种子蓝装整局和6橙装旧版对照未追加；样本非人类、自然完整验收或最终平衡。G03整体待讨论，T01/U05/D05及最终V/MVP仍开放。';
g03.steps.push('本批新发现G03-CROSSING-ENTRY-001：先修复横穿大队伍入场方阵越过合法地形边界，保持人数／奖励／操作；覆盖16／30人正常与三族32人越界复现、两条被阻断连续路线，再继续平衡取舍。');
for(const ref of ['G03_ECONOMY_MEASUREMENT_PLAN_20261023.md','G03_ECONOMY_MEASUREMENT_20261023.md','../../'+qa])if(!g03.evidence.includes(ref))g03.evidence.push(ref);
board.revision=126;board.updated='2026-10-23';board.next='G03';board.updates.push({date:'2026-10-23',tasks:['G03'],change:'有限经济／成长／诱饵／简单弹幕测量完成，原始战败与截断保留；确认横穿大队伍入场越界阻断，尚未修复，优先处理。没有调整游戏数值，G03转待讨论，不关闭整体平衡。',evidence:['G03_ECONOMY_MEASUREMENT_20261023.md','../../'+qa]});fs.writeFileSync('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');
const heading=`## G03整局经济测量完成、平衡待讨论 · 2026-10-23

- 用户授权G03有限测量，遇新的价格／概率／玩法／难度取舍先给数据和选项。本批${outcome}，另12分档前配对、12开局敏感性、144诱饵、126弹幕、${v.counts.crossingReplays}横穿控制补测及${v.counts.originReplays}精英来源重放；旧失败和截断保留。
- 新确认G03-CROSSING-ENTRY-001：横穿32人方阵后排z54.25超出地图54边界，三族短复现各2人越界且原生移动10秒不动；16／30人对照正常，两整局持续移动补测仍卡住。撤回最初仅控制器停步的判断；未修游戏源码，下一步先修合法入场放置再补测。
- ${v.ledger.rows}账本零差额，${v.counts.workshopSettled}实际结算账户／${v.counts.workshopAttempts}独立工坊试购。三族简单蓝装均通18关＋6分钟无尽，但星灵余量仅约1070矿／409气；普通表现分化。裸装受购物策略和种子影响，不能外推新手胜率；配方资格和粉尘分开。
- 诱饵有零触发、单关差额不代表本局长期回本；简单弹幕0.1／0.25／0.5秒可见弹体策略54/54完成，静止／固定路线36条全失败，不是人类反应验收。建议暂不统一补矿气或机械降价，简单弹幕容错／诱饵定位待用户决定，未改数值。
- 825个src/test、配置、镜头／输入与Current逐SHA保持；无新构建、浏览器／真机／FPS／全量回归，不重复计上一批2264。没有新QA缓存或二进制复制，未提交／推送／发布。12第二种子蓝装整局及6橙装旧版配对未追加，不称已覆盖。
- 看板126：62项51完成，8待办／1待讨论／2暂缓，下一项仍G03。记录docs/project/G03_ECONOMY_MEASUREMENT_20261023.md、reports/qa/g03-economy-20261023.json。G03最终平衡、T01/U05/D05及最终V/MVP开放。

`;
const agents=fs.readFileSync('AGENTS.md','utf8');assert.ok(!agents.startsWith('## G03整局经济测量完成'));fs.writeFileSync('AGENTS.md',heading+agents);
const plan='docs/project/G03_ECONOMY_MEASUREMENT_PLAN_20261023.md';fs.appendFileSync(plan,`\n## 实际执行补记\n\n最终完成36条当前主路线、12条分档前裸装／蓝装对照、12条开局策略／种子敏感性、144条诱饵单关、126条弹幕，以及${v.counts.crossingReplays}条横穿控制补测、5条入场几何短复现、${v.counts.originReplays}条精英掉落来源重放。确认横穿大队伍入场越界，尚未修复；优先处理该阻断。已出现需用户决定的设计取舍，按本计划停止追加12条第二种子蓝装整局和6条橙装旧版对照；未执行不计入覆盖。固定原生本局UUID输入以配对第一Boss回执随机数，原世界／装备RNG算法保持。最终边界和停止状态以[G03测量报告](G03_ECONOMY_MEASUREMENT_20261023.md)为准。\n`);
execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'inherit'});
console.log(JSON.stringify({board:126,status:g03.status,qa,report:doc,agentsUpdated:true}));
