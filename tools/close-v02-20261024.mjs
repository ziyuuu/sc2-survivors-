import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='reports/local/v02-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const r=await read(base+'/route-result.json'),reuse=await read(base+'/reuse-audit.json'),cleanup=await read(base+'/cleanup.json');
assert.equal(r.route.campaignOutcome,'won');assert.equal(r.route.outcome,'finished');assert.equal(r.route.completedStages.length,18);assert.equal(r.route.selectedEndlessCheckpoints.length,4);assert.equal(r.checks.length,6);assert.ok(cleanup.completed);assert.equal(r.source.unchanged,840);
const issue={id:'V02-NATIVE-PERF-001',resolved:false,status:'未解决，普通代表路线未达60FPS',scope:'当前完整画质、原生1x自动浏览器人族普通529路线，非新增极限压力场景',observed:{meanIntervalMs:r.performance.overall.meanMs,approximateRenderFPS:r.performance.overall.meanFPS,stage17FPS:24.34980554807769,stage18FPS:24.07147406930637,maxIntervalMs:r.performance.overall.maxMs,over100:r.performance.overall.over100,maxSimulationBacklogSeconds:r.performance.overall.maxBacklogSeconds},limits:'渲染调用间隔折算，非显示器逐帧或人类体验验收。不能用全程平均掩盖后期约24FPS；451ms尖峰未直接归因，不等同于旧410/502.7ms根因已找到。未降低画质或启动新优化/追踪。',evidence:'../../'+base+'/route-result.json'};
const reviewed=['representative-r3/checkpoint-1-0.png','representative-r3/failure.png','representative-r5/special-2-returned.png','representative-r5/checkpoint-12-0.png','representative-r5/campaign-victory.png','representative-r5/endless-ready.png','representative-r5/endless-round-complete.png','representative-r5/actual-settlement.png','representative-r5/earned-warehouse.png','representative-r5/workshop-crafted.png','representative-r5/next-expedition-battle.png'];
const visual=[];for(const file of reviewed)visual.push({file:base+'/'+file,sha256:sha(await fs.readFile(base+'/'+file))});
const qa={task:'V02',date:'2026-10-24',status:'有限验证完成；功能流程通过，性能目标未通过',boardRevision:175,scope:'用户要求复用已有证据，仅做必要代表路线；本批一个固定出征，未扩展种族/难度/种子或极限矩阵。',sourceCommit:r.sourceCommit,build:r.appBuildId,route:r.route,performance:r.performance,openIssues:[issue],checks:r.checks,archives:{count:29,validatedWith:'readArchive + native config and account/run association',source:base+'/route-result.json'},reuse:{report:base+'/reuse-audit.json',routes:25,threeRaceHistorical:{selected:24,enteredEndless:20,lost:4,replayedNow:0},sourceRows:reuse.sourceRows,unchanged:reuse.unchanged,dataUnchanged:reuse.dataUnchanged,limitation:reuse.scope},harness:{report:base+'/harness-corrections.json',attempts:5,newCampaigns:1,nativeResumeAttempts:2,uninterrupted:false,applicationErrors:0,finalControllerErrors:0,failuresPreserved:true},growth:{specialVisits:['第4关资源','第7关横穿虫群','第11关资源'],deaths:3,maximumSampledAllies:28,maximumSampledEnemies:125,settlement:{retained:48,lostGroundDrops:6,salvaged:0,dustBeforeManagement:125,dustAfterDismantle:145,dustAfterCraft:135},note:'六件遗失均在撤退前实际检查点中属于地面未拾取装备，不是成功撤退随机丢失背包装备。样本最大值不是逐步最大值。'},visual:{reviewed:visual,assessment:'实际主战场、特殊返回、通关、无尽、结算、仓库、工坊合成和再次出征截图已查看；入口动画截图不冒充静态UI验收。详细静态/UI和组合效果审查仍留T01/V03。'},source:r.source,newGameRegressionTests:0,reusedRegression:'V01同版2567回归及D05/V01恢复证据；本批无游戏源码变更，不重复计数。',cleanup,delivery:{commit:false,push:false,publish:false,currentReplaced:false},limits:r.limits,result:base+'/route-result.json'};
await fs.writeFile('reports/qa/v02-20261024.json',JSON.stringify(qa,null,2)+'\n');
const rows=r.performance.bySegment.map(x=>`| ${x.key} | ${x.meanMs.toFixed(2)} | ${x.meanFPS.toFixed(1)} | ${x.maxMs.toFixed(1)} | ${x.over100} | ${x.maxBacklogSeconds.toFixed(3)} |`).join('\n');
const doc=`# V02 有限代表路线验证 · 2026-10-24

功能流程通过；60 FPS 性能目标未通过。按用户要求复用已有证据，仅新增一个固定出征，不扩展极限矩阵。看板175，下一项V03；最终V/T01/MVP仍开放。

人族普通、种子529、既有合法12件蓝装测试起点，原生浏览器RAF/FixedStepper 1x。完成18关→无尽四个60秒轮次→第五轮开始约1.52秒时主动撤退→结算→仓库/工坊→刷新→新出征实际运行并暂停。不是从零自然获得开局装备，也不是人类或物理设备试玩。

48件入仓，6件未拾取地面装备按规则清除，满仓分解0。实际分解一件本局所得装备后粉尘125→145，合成一件白色后勤模块后135；刷新前后账户、管理状态与终局记录逐项一致，再出征生成不同run ID。29份实际导出均通过读取、配置及账户关联校验；三次身体死亡保留，不作永久编制损失或人类胜率解释。自然采样最多28友军、125敌军，非逐步峰值。

第4/11关资源特殊关与第7关横穿虫群往返有记录。首次脚本在第7关中断，修复自动出发按钮竞态与重复模块的特殊返回调用后，用同一出征的最新原生第6关购物后检查点续测；一次初始化阶段错误也保留。两次前置启动失败、两次原生恢复尝试分列，未重开种子刷通。原记录和失败截图全部保留，不能称一次无中断通关。

所选有效战斗段平均间隔28.27ms，折算约35.4FPS；后两关约24FPS。42次>100ms、最长451.3ms，最大模拟积压1.4164秒，活动段丢弃增量0；关间边界清除另列。指标排除暂停、决策及加载等待，不据未连续记录的pendingFrames宣称资源等待为0。451ms未归因，未启动额外追踪或优化。新增未解决项V02-NATIVE-PERF-001，不能只把该结果称为旧极限压力边界。

| 阶段 | 均间隔ms | 折算FPS | 最长ms | >100ms | 最大积压秒 |
|---|---:|---:|---:|---:|---:|
${rows}

历史三族困难/地狱24条最终记录（20进入无尽、4败）及普通旧对照仅复用，未重跑。核对511份旧源码，475相同、36有差异、3份新增；全部数据定义保持。存档、撤退、结算变化由D05/V01与本轮真实流程补齐；趣味商店报价修复可能改变消费序列，因此旧结果不保证当前完全同轨，也不当浏览器FPS证据。

840源码/测试与Current逐SHA保持，508构建输入匹配。未新增游戏回归计数，复用V01同版2567检查。已清理3份关闭测试配置${cleanup.paths.reduce((n,p)=>n+p.bytes,0)}字节，所有原始报告、存档、截图及失败记录保留。未提交、推送、发布或替换Current。

[QA报告](../../reports/qa/v02-20261024.json) · [实际路线与性能](../../${base}/route-result.json) · [复用审计](../../${base}/reuse-audit.json) · [脚本失败与修正](../../${base}/harness-corrections.json)
`;
await fs.writeFile('docs/project/V02_20261024.md',doc);
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,174);board.revision=175;board.next='V03';board.updated='2026-10-24';const task=board.tasks.find(t=>t.id==='V02');task.status='已完成';task.updated='2026-10-24';task.result='按用户范围完成有限验证：同一人族普通529出征完成18关、无尽4轮、撤退结算、仓库工坊、刷新及再出征；29实际存档通过。复用三族旧证据，不扩极限矩阵。脚本失败与两次原生恢复保留。功能通过，后两关约24FPS、最长451.3ms、最大积压1.416秒，性能未通过并保持V02-NATIVE-PERF-001开放。840源码/测试与Current保持，无提交/推送/发布。';task.observedIssues=[issue];task.closure={type:'bounded-representative-validation',functionalPassed:true,performanceTargetPassed:false,uninterruptedCampaign:false,openIssues:[issue.id]};task.evidence.push('V02_20261024.md','../../reports/qa/v02-20261024.json','../../'+base+'/route-result.json');board.updates.push({date:'2026-10-24',tasks:['V02'],change:task.result,evidence:['V02_20261024.md']});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const handoff='## V02 有限验证完成，普通路线性能仍未达标 · 2026-10-24\n\n- 一个固定人族普通529合法蓝装出征完成18关、无尽4轮及撤退/结算/仓库工坊/刷新/再出征；29份实际导出校验通过，48件入仓。三族旧证据复用，不扩极限矩阵。测试脚本失败与两次原生检查点恢复均保留，非一次无中断或人类试玩。\n- 后两关约24FPS，全程42次>100ms、最长451.3ms，最大积压1.416秒；功能通过不等于性能通过。V02-NATIVE-PERF-001开放，未归因尖峰或开始新优化；长期无尽、真机/人类及最终V/MVP未通过。\n- 840源码/测试与Current保持，清理3份关闭测试配置888939623字节，原始证据全部保留。看板175，V02有限验证完成、下一项V03；未提交/推送/发布。记录docs/project/V02_20261024.md。\n\n';await fs.writeFile('AGENTS.md',handoff+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({board:175,next:'V03',functionalPassed:true,performancePassed:false,openIssue:issue.id,unchanged:840}));
