import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-d04-20261021',doc='docs/project/PERFORMANCE_D04_20261021.md',qaFile='reports/qa/performance-d04-20261021.json';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex');
const summary=await read(root+'/measurement-summary.json'),scope=await read(root+'/scope-final.json'),functional=await read(root+'/functional-r23/report.json'),review=await read(root+'/visual-review.json');
const build=await read('preview/performance-d04-20261021-candidate-r23/build-inputs.json'),main=build.outputs.find(f=>f.file.endsWith('/main.js'));
const offlineBuild=await read(root+'/offline-candidate-r23/build-inputs.json'),offlineBaseline=await read(root+'/offline-baseline-r2/build-inputs.json');assert.equal(offlineBuild.source.payloadSha256,offlineBaseline.source.payloadSha256);assert.equal(offlineBuild.source.payloadBytes,offlineBaseline.source.payloadBytes);
const runs=['final-baseline-web-r1','final-candidate-web-r24','final-baseline-offline-r1','final-candidate-offline-r24'];
const chosen=runs.map(name=>{const r=summary.runs.find(x=>x.run===name);assert.ok(r,name);assert.equal(r.pass,true,name);assert.equal(r.errors.length,0,name);return r;});
for(const r of chosen)for(const c of r.cycles){assert.equal(c.stages.length,3);for(const s of c.stages){assert.equal(s.full.pendingFrames,0);assert.equal(s.full.renderSkippedFrames,0);if(r.variant.startsWith('candidate'))assert.equal(s.discardedDelta,0);}}
for(const r of chosen.filter(r=>r.offline))assert.equal(r.httpRequests.length,0);
assert.equal(scope.pass,true);assert.equal(functional.pass,true);assert.equal(functional.checks.length,23);assert.equal(functional.errors.length,0);assert.equal(functional.failedRequests.length,0);assert.equal(functional.screens.length,15);assert.equal(review.status,'reviewed');
assert.equal(scope.changedExisting.length,13);assert.equal(scope.finalProduction,421);assert.equal(scope.existingTestsChanged,0);assert.equal(build.changes.length,16);
const recovery=functional.checks.find(c=>c.kind==='context-recovery');assert.equal(recovery.before.state,recovery.after.state);assert.equal(recovery.after.epoch,recovery.before.epoch+1);
const regression=await fs.readFile(root+'/regression-r23.log','utf8'),network=await fs.readFile(root+'/network-regression-r23.log','utf8'),networkWeb=await fs.readFile(root+'/network-web-regression-r23.log','utf8');
assert.match(regression,/tests 1793/);assert.match(regression,/pass 1786/);assert.match(regression,/fail 7/);assert.match(network,/pass 15/);assert.match(network,/fail 0/);assert.match(networkWeb,/pass 1/);assert.match(networkWeb,/fail 0/);
for(const p of ['typecheck-r23.log','docs-check-r23.log']){const t=await fs.readFile(root+'/'+p,'utf8');assert.ok(!t.includes('error TS'));if(p.startsWith('docs'))assert.match(t,/matches runtime data/);}
const [bw,cw,bo,co]=chosen,sec=n=>(n/1000).toFixed(3),ms=n=>n.toFixed(1),reduction=(b,c)=>((1-c/b)*100).toFixed(1),pre=c=>`${c.stages[2].preBoss.over100}帧／${ms(c.stages[2].preBoss.max)}毫秒`;
const pairs=summary.pairs.filter(p=>runs.includes(p.baseline)&&runs.includes(p.candidate));assert.equal(pairs.length,3);
for(const p of pairs)for(const s of p.stages){if(s.stage<3){assert.equal(s.initialExact,true);assert.equal(s.finalExact,true);assert.equal(s.snapshotsDifferent.length,0);}assert.equal(s.initialWithoutNewPlanExact,true);assert.equal(s.preBossSnapshotsWithoutNewPlanDifferent.length,0);}
const third=[...cw.cycles,...co.cycles].map(c=>c.stages[2]);assert.ok(third.every(s=>s.bossReadyAt>0&&s.bossReadyAt<30));
const original=await fs.readFile(root+'/report-draft-policy.md','utf8'),policy=original.slice(original.indexOf('## 已批准的范围'),original.indexOf('## 已完成的核验')),failureSection=original.slice(original.indexOf('## 保留的失败和撤回方案'),original.indexOf('## 当前构建'));
const text=`# D04 分阶段加载本地完成 · 2026-10-21

本批实现、功能核验和加载／前三关测量完成。**开局显著缩短，但第三关准备期间仍有新增长帧，无新增卡顿这一项没有通过。** D04范围决策与本地实现完成，残留性能问题转入V01继续开放；52项完成46、剩余6，下一项V01尚未启动，D05／D06仍暂缓。[正式证据](../../reports/qa/performance-d04-20261021.json)。

${policy}## 最终构建核验

- 新增20项回归：三族四难度前三关实际波表、原生形态、装备／天赋候选、实际奖励身份映射、提前计划与RNG／ID、旧运行态兼容、非法计划拒绝、后台优先级和入口排空，以及独立预热、错误诊断恢复和附加幻影可见性。
- 全量1793项：首轮1786通过，7项受本机环回网络或临时文件权限限制；相关三个文件重跑共16项全部通过。重跑分15项和1项两条记录；首次重跑命令漏选静态服务文件，随后单独补齐。类型和数据文档检查通过，既有测试没有修改。
- 最终浏览器功能23条、15张截图：按需难度图标与选择保持，开局无尽地图未准备，五品质／三档画质／三尺寸、原生关间按钮、战役第18关转无尽第1／2轮，三族18位选定英雄资源准备，以及三组原本未加载的精英身体和附加幻影实际显示。英雄检查是资源准备，不冒称18次技能施放。后期边界采用受控关卡状态和原生入口，不是自然打通战役。
- 真实WebGL丢失恢复一次通过，epoch ${recovery.before.epoch}→${recovery.after.epoch}；仅排除notice／noticeUntil后的完整选取状态SHA前后均为 ${recovery.before.state}。time=1、tick=60、关卡2、落地关数与钱包保持；恢复后进入第3关白装正常到期。
- 功能核验发现独立预热隐藏的附加幻影未被原实例更新重新显示；最终构建已按实际实例数恢复可见性，并覆盖正数→零→正数。原普通身体路径保持。R22测量仍按原构建保存，以下主表全部使用修复后的R23重新测量。

## 开局与前三关正式对照

同机Chrome ${functional.browser}、${functional.hardware.renderer}、1440×900／DPR1，完整效果／原生分辨率／完整动作；人族简单查尔seed529、独立空账户。Web各两轮（新测试目录冷轮、同目录同地址刷新热轮），离线各一轮。冷指浏览器目录，不代表操作系统缓存清空。测试均串行，无锁血、秒杀、额外资源、加速或模拟时钟跳转；控制器仅调用原游戏移动、生产和关间选择，不是人类或物理输入验收。

| 项目 | D03旧版 | D04最终R23 |
| --- | ---: | ---: |
| Web冷启动：点击开始至可进入战场 | ${sec(bw.cycles[0].startupReadyMs)}秒 | ${sec(cw.cycles[0].startupReadyMs)}秒 |
| Web热启动：刷新后开始 | ${sec(bw.cycles[1].startupReadyMs)}秒 | ${sec(cw.cycles[1].startupReadyMs)}秒 |
| 离线启动：点击开始至可进入战场 | ${sec(bo.cycles[0].startupReadyMs)}秒 | ${sec(co.cycles[0].startupReadyMs)}秒 |
| Web冷／热菜单可操作 | ${sec(bw.cycles[0].homeReadyMs)}／${sec(bw.cycles[1].homeReadyMs)}秒 | ${sec(cw.cycles[0].homeReadyMs)}／${sec(cw.cycles[1].homeReadyMs)}秒 |
| Web冷轮第1／2关中位帧间隔 | ${ms(bw.cycles[0].stages[0].steady.median)}／${ms(bw.cycles[0].stages[1].steady.median)}毫秒 | ${ms(cw.cycles[0].stages[0].steady.median)}／${ms(cw.cycles[0].stages[1].steady.median)}毫秒 |
| Web热轮第1／2关中位帧间隔 | ${ms(bw.cycles[1].stages[0].steady.median)}／${ms(bw.cycles[1].stages[1].steady.median)}毫秒 | ${ms(cw.cycles[1].stages[0].steady.median)}／${ms(cw.cycles[1].stages[1].steady.median)}毫秒 |
| Web热轮第2关最大帧间隔 | ${ms(bw.cycles[1].stages[1].full.max)}毫秒 | ${ms(cw.cycles[1].stages[1].full.max)}毫秒 |
| 第3关Boss出现前：Web冷轮>100ms帧数／最大值 | ${pre(bw.cycles[0])} | ${pre(cw.cycles[0])} |
| 第3关Boss出现前：Web热轮>100ms帧数／最大值 | ${pre(bw.cycles[1])} | ${pre(cw.cycles[1])} |
| 第3关Boss出现前：离线>100ms帧数／最大值 | ${pre(bo.cycles[0])} | ${pre(co.cycles[0])} |

开局等待分别缩短${reduction(bw.cycles[0].startupReadyMs,cw.cycles[0].startupReadyMs)}%、${reduction(bw.cycles[1].startupReadyMs,cw.cycles[1].startupReadyMs)}%和${reduction(bo.cycles[0].startupReadyMs,co.cycles[0].startupReadyMs)}%。菜单仍受原约15秒开场展示影响，不据少载图标宣称菜单等待缩短。前两关中位数采用关内第3–58秒；第三关比较使用Boss出现前完整0–30秒。原始完整区间、P95/P99与全部长帧保留，不用中位数掩盖峰值。没有多次独立冷启动重复，不能给统计稳定性或全内容60FPS结论。

Web冷轮入口已准备模型${bw.cycles[0].readyModels}→${cw.cycles[0].readyModels}个，累计网络正文${bw.cycles[0].readyAssets.downloadBytes}→${cw.cycles[0].readyAssets.downloadBytes}字节。它只反映当次准备范围和编码下载量，不是JS堆峰值、显存或长期内存；本批没有独立内存峰值证据。后续文件缓存继续增加，不能将开局减少外推为长期固定节省。

最终三轮的奖励在第3关开始后${third.map(s=>s.bossReadyAt.toFixed(3)).join('／')}秒就绪，均早于30秒Boss刷新。正式六轮共18关逐帧素材等待、跳过绘制均为0，全部完成；最终候选9关新增丢弃积压为0。旧版Web热轮第3关在time=180转入reward的最后一条记录增加0.05秒丢弃，前一条战斗记录为0；这个关间尾部计数保留，不写成全部18关均零。Web候选两次关间等待分别${cw.cycles.map(c=>c.intermissions.map(i=>sec(i.ms)).join('／')).join('、')}秒；未混入战斗帧间隔。所有正式页面／控制台错误0；离线所有HTTP请求0。

两版前两关初末选取运行态、状态系统、特殊系统和账户，以及每600tick快照均精确一致；第三关开始及至第30秒快照仅排除新增firstBossLoot字段后也一致。原生新局UUID在配对中固定以控制既有回执哈希变体，主模拟RNG没有覆盖。领取后奖励身份可能因批准的提前决定而不同，不声明第三关末整体状态等价。

R22补充轮保留：Web开局53.445／24.973秒，离线49.626秒；第三关Boss前Web冷／热7／9帧超过100毫秒，最大257.7／275.4毫秒，离线8帧、最大292.1毫秒。它与R23分列，不把修复前结果改标为最终通过。

## 已知未通过项

第三关选定模型准备仍引入额外长帧，虽能在Boss刷新前完成，仍未达到无新增卡顿。异步切片不能抢占同步模型解析、材质反射或显卡驱动等待；实际慢点在调用间迁移，尚未证明单一根因。此项挂入V01，后续统一构建验收必须继续呈现，不凭本次完成关闭它。

最终Web热轮第2关最大帧间隔从135.3升至249.4毫秒，两侧稳态各2帧超过100毫秒；这一峰值没有完成因果定位，也保留给V01，不能仅用16.7毫秒中位数宣布前两关所有峰值均改善。冷轮首个关间截图中重工厂／星港分类图标为问号占位，后续关间图已恢复，文字与按钮存在；没有测量占位精确时长，不宣称按需图标零占位。

390像素宽场景仍有原有装备标签处于视野边缘外的问题，本批没有重做移动端布局。无尽切换截图处于物品重新落地的早期显示帧，不作为成熟动画或像素相同证明。没有新存档整合、物理设备、人类试玩、全战役自然压力、长期磁盘预算或全内容60FPS结论；V01–V04及整体MVP继续开放。

${failureSection}最终R23首次复测在第1关遇D盘空间耗尽，报告写入ENOSPC，原JSON截断保留；这一轮完全排除性能结论，离线未启动。确认无D04进程后，仅清理D04根目录内29个已关闭测试浏览器profile，验证目标和无链接，释放约17GB；原始截图、报告、构建保留。清理后使用未改动R23构建另起Web／离线R24记录，未改标失败。详见final-r23-disk-failure.json与profile-cleanup.json。

## 当前构建

16个生产文件（13旧＋3新），720个既有src/test中707个逐字节未改，既有测试未改。421个最终生产输入中405个与冻结D03精确一致；其余覆盖差异115项仅换行，economic-egg他线内容差异排除，特殊玩法分支没有混入。原材质加载器已逐字节恢复。

最终候选：preview/performance-d04-20261021-candidate-r23/。主JS SHA-256：${main.sha256}。离线完整资源载荷与原包相同，输出和来源hash见offline-candidate-r23记录。

正式与补充截图共${review.images}张，已查看全部${review.contacts.length}张联系表，并直接查看三族奖励原图；原图、失败记录与冻结输入保留。未替换Current、提交、推送或在线发布；300／4∶4∶1、五图、三档与存档延期保持。
`;
await fs.writeFile(doc,text);
const boardPath='docs/project/performance-board.json',board=await read(boardPath),before=structuredClone(board),task=board.tasks.find(t=>t.id==='D04');assert.equal(board.revision,103);assert.equal(task.status,'进行中');
const result=`D04分阶段加载本地完成：菜单按需、开局当前阵容/装备/英雄，无尽延后；第三关开始确定一份实际Boss奖励并逐步准备。Web冷/热开局${sec(bw.cycles[0].startupReadyMs)}→${sec(cw.cycles[0].startupReadyMs)}秒、${sec(bw.cycles[1].startupReadyMs)}→${sec(cw.cycles[1].startupReadyMs)}秒，离线${sec(bo.cycles[0].startupReadyMs)}→${sec(co.cycles[0].startupReadyMs)}秒。最终三轮均在Boss30秒前就绪，18正式关卡素材等待/跳绘0、候选9关新增丢弃0；第三关新增长帧及热轮第2关249.4ms峰值保留，无新增卡顿未通过，转V01开放。1793回归覆盖、类型/数据、23功能记录及实际图形恢复通过，${review.images}图已查看。地图保持完整，无自动磁盘驱逐，未替换Current/发布。`;
task.status='已完成';task.updated='2026-10-21';task.result=result;task.evidence=[...new Set([...task.evidence,'PERFORMANCE_D04_20261021.md','../../'+qaFile])];task.steps.push('第三关开始决定实际Boss奖励并准备这一份；记录同步GPU长帧与V01未通过项');
const reviews={
 L01:{status:'已解决',text:'D04按批准范围改为菜单直接UI/建筑/起始图标先备，其余页面出现时按需准备；实际难度页面图标、选择和文字保持。菜单原15秒展示未提速，不将编码资源准备等同图像/GPU解码。',follow:[]},
 L03:{status:'部分解决',text:'D04缩小开局并延后无尽；第3关开始确定一份实际Boss奖励，最终三轮均在30秒前准备完毕，无素材等待/跳绘。但第三关新增长帧仍存在，无新增卡顿未通过；保留完整地图、完整恢复范围，后续V01复核。',follow:['V01']},
 L06:{status:'部分解决',text:'A03磁盘留存证据保持。D04菜单按需和分阶段准备减少开局持有范围，但未实施统一磁盘预算或自动驱逐。用户未决定预算，继续保留当前/活动/离线恢复hash，不能按最后写入release删除；自然多局增长与恢复交V02观察，观察不授权驱逐。',follow:['V02']}
};
for(const [id,r] of Object.entries(reviews)){const row=board.auditRows.find(x=>x.id===id);row.currentReview=`【${r.status}】2026-10-21 ${r.text}`;row.reviewStatus=r.status;row.reviewedAt='2026-10-21';row.followUpTasks=r.follow;row.reviewEvidence=[...new Set([...row.reviewEvidence,doc,qaFile])];}
for(const id of ['V01','V02']){const t=board.tasks.find(t=>t.id===id);t.evidence=[...new Set([...t.evidence,'PERFORMANCE_D04_20261021.md','../../'+qaFile])];if(id==='V01'){t.steps.push('D04第三关实际奖励准备仍有新增100ms以上长帧，必须在最终统一构建继续复核；按时就绪不代表无卡顿通过');t.auditIds=[...new Set([...t.auditIds,'L03'])];t.result+=' D04分阶段加载完成，但第三关GPU/模型准备长帧未解决；该项作为未通过项持续开放。';}else{t.steps.push('观察D04分阶段资源在自然多局/跨版本的增长和恢复；统一磁盘预算未获决定，不自动驱逐活动或离线唯一资源');t.auditIds=[...new Set([...t.auditIds,'L06'])];}}
board.revision++;board.updated='2026-10-21';board.next='V01';board.updates.push({date:'2026-10-21',tasks:['D04'],change:result,evidence:['PERFORMANCE_D04_20261021.md','../../'+qaFile]});
assert.equal(board.tasks.length,52);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,46);assert.equal(board.auditRows.length,169);
for(const row of board.auditRows){const old=before.auditRows.find(x=>x.id===row.id);for(const k of ['id','title','sourceCategory','sourceExecution','sourceIntegration','tasks','previousReview'])assert.deepEqual(row[k],old[k],row.id+':'+k);if(!reviews[row.id])assert.deepEqual(row,old);}
for(const t of board.tasks)if(!['D04','V01','V02'].includes(t.id))assert.deepEqual(t,before.tasks.find(x=>x.id===t.id));
await fs.writeFile(boardPath,JSON.stringify(board,null,2)+'\n');await fs.writeFile(root+'/board-after.json',JSON.stringify(board,null,2)+'\n');
const agents=await fs.readFile('AGENTS.md','utf8');assert.ok(!agents.includes('## D04 分阶段加载本地完成'));
await fs.writeFile('AGENTS.md',`## D04 分阶段加载本地完成 · 2026-10-21

- 用户批准分阶段准备，指定第3关开始决定实际Boss奖励再逐步准备这一份。16生产文件（13旧＋3新）完成；记录${doc}，证据${qaFile}。52项完成46、剩余6，下一项V01未启动，D05/D06暂缓。
- 菜单按需、开局本族普通/前三关敌人/实际装备候选/选定英雄；未来文件先准备，仅实际首Boss奖励战斗中完整准备。当前地图完整，无尽延后；原完整恢复保持，无新增磁盘预算/驱逐。
- Web冷/热入口${sec(bw.cycles[0].startupReadyMs)}→${sec(cw.cycles[0].startupReadyMs)}秒、${sec(bw.cycles[1].startupReadyMs)}→${sec(cw.cycles[1].startupReadyMs)}秒；离线${sec(bo.cycles[0].startupReadyMs)}→${sec(co.cycles[0].startupReadyMs)}秒。正常无锁血前三关18正式关卡素材等待/跳绘0，候选9关新增丢弃0；旧版热轮第3关reward尾部0.05秒保留。奖励${third.map(s=>s.bossReadyAt.toFixed(3)).join('/')}秒就绪早于Boss30秒；第三关新增长帧及热轮第2关249.4ms峰值保留，无新增卡顿未通过，V01开放。不能外推全部内容60FPS。
- 20新增、1793回归覆盖（1786首过/7权限失败，三文件16重跑通过）、类型/数据通过。23功能记录、18英雄准备、三族流式身体/幻影、三档/三尺寸/无尽/真实WebGL恢复通过；${review.images}图已查看，正式页面/控制台0、离线HTTP0。前两关及第3关Boss前状态按声明排除后精确；领取后奖励身份改变不做完整等价宣称。
- 初期秒级长帧、早期2.6秒首次奖励等待、并发干扰旧测量、最终首轮磁盘满及脚本/权限失败保留。所有替代纹理解码方案撤回；原材质字节保持。只清本次关闭QA缓存29份约17GB，原始证据保留后重测；390宽标签边缘限制保留，无人类/真机/全战役/长期验收。
- 720既有文件707未改、既有测试未改；421输入405冻结精确，economic-egg他线排除。主JS ${main.sha256}；preview/performance-d04-20261021-candidate-r23/。未替换Current、提交/推送/发布；300/4∶4∶1、五图、三档、存档延期、特殊分支及V01–V04/MVP边界保持。

`+agents);
const evidence=new Set([doc,root+'/board-before.json',root+'/board-after.json',root+'/inputs-before.json',root+'/scope-final.json',root+'/measurement-summary.json',root+'/measurement-summary-r22.json',root+'/visual-review.json',root+'/regression-r23.log',root+'/network-regression-r23.log',root+'/network-web-regression-r23.log',root+'/typecheck-r23.log',root+'/docs-check-r23.log',root+'/profile-cleanup.json',root+'/final-r23-disk-failure.json','preview/performance-d04-20261021-candidate-r23/build-inputs.json',...build.changes,...build.outputs.map(f=>f.file),...review.contacts,...review.pictures.map(p=>p.file)]);
for(const run of [...runs,'functional-r23','final-candidate-web-r1','final-candidate-offline-r1'])evidence.add(root+'/'+run+'/report.json');
for(const p of ['offline-candidate-r23/build-inputs.json','offline-baseline-r2/build-inputs.json','final-tooling-notes.json','map-shared-assets.json'])evidence.add(root+'/'+p);
for(const p of ['test/battle-preload.test.ts','test/first-boss-preload.test.ts','test/battle-streaming.test.ts','tools/finalize-performance-d04.mjs','tools/build-performance-d04.mjs','tools/build-performance-d04-offline.mjs','tools/performance-d04-runtime.ts','tools/qa-performance-d04-loading.mjs','tools/qa-performance-d04-functional.mjs','tools/d04-browser-helper.mjs','tools/check-performance-d04-scope.mjs','tools/review-performance-d04.py','tools/analyze-performance-d04.mjs'])evidence.add(p);
const files=[];for(const p of evidence){const b=await fs.readFile(p);files.push({file:p.replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});}
const qa={task:'D04',date:'2026-10-21',status:'completed-local-with-open-performance-finding',pass:true,noAdditionalHitchesAccepted:false,implementation:{productionFiles:build.changes,scope},verification:{newTests:20,regression:{total:1793,firstPass:1786,environmentFailures:7,retestedFiles:3,retestPass:16},typecheck:true,dataDocs:true,functionalRecords:23,heroesPrepared:18,streamedProjectionExamples:3,realWebGLRecovery:recovery,pageConsoleErrors:0,offlineHttpRequests:0,screenshotReview:review},measurements:{finalRuns:chosen,pairedStates:pairs,priorR22:root+'/measurement-summary-r22.json',noExtraAssetWait:true,noAdditionalHitches:false},build:{main,variant:'candidate-r23',manifest:'preview/performance-d04-20261021-candidate-r23/build-inputs.json'},board:{revision:board.revision,total:52,complete:46,remaining:6,next:'V01',nextStarted:false},openFindings:['Third-stage selected-reward preparation still adds long frames; V01 remains open.','Current map kept whole; no distance-based visual streaming.','No unified disk budget or automatic eviction; V02 observation only.','No human/physical/full-campaign/full-content-60FPS or save acceptance.','Narrow-screen loot label boundary remains.'],preservedFailures:{description:'All earlier candidates, failed reports, profiler traces and logs retained in the D04 report root; no failed run relabelled as final. See report failure section.',materialExperiments:'All alternate image/texture loading experiments withdrawn; frozen original material loader retained.',regression:'Original seven permission failures, initial missing scope-test filename and disk-full truncated measurement retained; corrected runs recorded separately.'},noCurrentReplacement:true,noCommitPushOrPublication:true,evidence:files};
qa.build.offline={html:offlineBuild.html,source:offlineBuild.source,unchangedPairedPayload:true};
await fs.writeFile(qaFile,JSON.stringify(qa,null,2)+'\n');console.log(JSON.stringify({pass:true,board:qa.board,main:main.sha256,evidence:files.length,noAdditionalHitches:false}));
