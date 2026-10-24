import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-x04-20261020',finalRun=process.argv[2]??'runtime-final-2',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex'),mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
const final=await read(root+'/'+finalRun+'/report.json'),trial=await read(root+'/runtime-candidate-1/report.json'),early=await read(root+'/baseline-2/report.json'),earlyTrial=await read(root+'/candidate-1/report.json'),base=await read(root+'/runtime-baseline-1/report.json'),summary=await read(root+'/summary.json'),pixels=await read(root+'/contact-runtime-baseline-1-'+finalRun+'.json'),componentPixels=await read(root+'/'+finalRun+'/component-pixels.json'),trialPixels=await read(root+'/runtime-candidate-1/component-pixels.json'),numeric=await read(root+'/echo-equivalence.json'),regions=await read(root+'/pixel-regions.json');
assert.ok(final.pass&&trial.pass&&early.pass&&earlyTrial.pass&&base.pass&&summary.pass&&numeric.pass);assert.equal(summary.pairs.length,3);
for(const c of base.checkpoints.filter(c=>c.name.endsWith('-fixed')))assert.deepEqual(final.checkpoints.find(f=>f.name===c.name).source.activeRequests,c.source.activeRequests);
summary.finalActiveRequestsExact=true;
assert.equal(componentPixels.pairs.length,8);for(const p of componentPixels.pairs)assert.equal(p.changedPixels,0);for(const p of trialPixels.pairs.filter(p=>p.race==='protoss'))assert.equal(p.changedPixels,0);
for(const p of regions)assert.equal(p.battleRows30to620,0,p.name);
const changed=['src/render/units/pod-view.ts','src/render/scene/battle-renderer.ts'],baseHashes=new Map(base.build.inputs.map(i=>[i.file,i.sha256])),actual=final.build.inputs.filter(i=>i.file.startsWith('src/')&&baseHashes.get(i.file)!==i.sha256).map(i=>i.file);assert.deepEqual(actual.sort(),[...changed].sort());
for(const file of changed){const expected=final.build.inputs.find(i=>i.file===file);assert.equal(hash(await fs.readFile(file)),expected.sha256);assert.equal(trial.build.inputs.find(i=>i.file===file).sha256,expected.sha256);}
assert.equal(hash(await fs.readFile('src/render/effects/source-combat-effects.ts')),baseHashes.get('src/render/effects/source-combat-effects.ts'));
const tests=await fs.readFile(root+'/full-tests-final.log','utf8');assert.match(tests,/pass 1676/);assert.match(tests,/fail 0/);
const before=await read(root+'/'+finalRun+'/before-recovery.state.json'),after=await read(root+'/'+finalRun+'/after-recovery.state.json'),notice={before:{notice:before.run.notice,until:before.run.noticeUntil},after:{notice:after.run.notice,until:after.run.noticeUntil}};after.run.notice=before.run.notice;after.run.noticeUntil=before.run.noticeUntil;assert.deepEqual(after,before);
assert.ok(final.recovery.after.epoch>final.recovery.before.epoch);assert.ok(final.recoveryBuildings.podViews>0&&final.recoveryBuildings.hiveDeaths>0);
for(const r of summary.runs)for(const s of r.measurements){assert.equal(s.discardedDelta,0);if(!s.live)assert.ok(s.frozenExact);if(s.detail){assert.ok(s.gpuSamples>0);assert.equal(s.disjoint,0);}}
for(const c of final.checkpoints.filter(c=>c.name.endsWith('-ended'))){assert.equal(c.source.particles,0);assert.equal(c.source.endingChannels,0);assert.equal(c.source.meshInstances,41);}
const actors=r=>r.components.pods.map(p=>({race:p.race,oldMs:mean(p.rounds.map(r=>r.old)),newMs:mean(p.rounds.map(r=>r.new)),fasterPairs:p.rounds.filter(r=>r.new<r.old).length,pairs:p.rounds.length,createAndDrawCpu:p.frames,preparation:p.preparation?{...p.preparation,scope:'Fresh main GLTF identity; birth/death template reference caches were already warm. Not whole cold loading.'}:null}));
const hives=r=>[6,4.8].map(width=>{const rows=r.components.hives.filter(r=>r.width===width);return {width,oldMs:mean(rows.map(r=>r.old)),newMs:mean(rows.map(r=>r.new)),fasterPairs:rows.filter(r=>r.new<r.old).length,pairs:rows.length};});
const cold=r=>({run:r.run,pageReadyMs:r.cold.readyAt-r.cold.start,sourceLoad:r.cold.load,sourcePrepare:r.cold.prepare,maxPreloadCloneMs:Math.max(...r.cold.clones.map(c=>c.ms))});
const candidateDecision={status:'withdrawn',reason:'No stable CPU benefit; retain original request dispatch and player cutoff in final R3.',results:trial.steady.map(s=>({name:s.name,oldMs:mean(s.rounds.map(r=>r.old)),newMs:mean(s.rounds.map(r=>r.new)),fasterPairs:s.rounds.filter(r=>r.new<r.old).length,rounds:s.rounds})),expiredRequestsObserved:early.scenes.at(-1).requests.expired,rejectedCandidateExpiredRequests:earlyTrial.scenes.at(-1).requests.expired};
const proof={date:'2026-10-20',task:'X04',status:'verified-local',baseCommit:'be9e2982944314194c6dcc9dcc535bc321749eb4',base:'Accepted X03 R3 frozen inputs; no new Git commit.',preview:'preview/performance-x04-20261020-candidate-r3/',build:final.build,changedFiles:changed,validation:{tests:{passed:1676,log:root+'/full-tests-final.log'},typecheck:root+'/typecheck-final.log',docs:root+'/docs-check.log',numeric,summary,pixels,regions,componentPixels,prototypeComponentPixels:trialPixels,constructorCpu:{sameCodeEarlierThreeRaces:actors(trial),final:actors(final),hiveEarlier:hives(trial),hiveFinal:hives(final),reuse:'PodView and the entire BattleRenderer have identical SHA-256 in R2 and final R3. R2 request-filter candidate is excluded from the final implementation; component evidence concerns only the unchanged actor code.'},disposal:{earlier:trial.components.disposal,final:final.components.disposal},recovery:{...final.recovery,activeBuildings:final.recoveryBuildings,stateExactExceptNotice:true,notice},repeatedClockProbe:final.components.repeatedClockProbe,firstPodAfterLoading:final.firstPodAfterLoading},loading:{method:'Fresh pages/players, same reused browser asset cache; source hooks installed before startGame. Not an uncached download benchmark. Total readiness includes other unchanged rendering preparations.',runs:[early,earlyTrial,base,trial,final].map(cold),timeout:{run:'runtime-final-1',limitMs:240000,phase:'Screenshot shows 85% GPU presentation preparation; exact label was not captured in that failed run.',file:root+'/runtime-final-1/report.json'},finalProgress:final.loadingProgress.map(({at,phase,label,done,total,pending})=>({at,phase,label,done,total,pending}))},pools:{method:early.pools.data.method,peakMeshes:early.pools.data.peakMeshes,endedMeshes:early.pools.ended.report.meshInstances,peakQuadCapacity:early.pools.data.peakQuadCapacity,endedCpuTypedArrayBytes:early.pools.ended.sourceCpuTypedArrayBytes,initialCpuTypedArrayBytes:13696080,retainedIncrementBytes:1956352,decision:'Retain existing high-water quad storage and two-second extra mesh reclamation. No shrinking strategy selected; bytes are source CPU typed arrays, not total GPU memory.',source:'baseline-2 and candidate-1; SourceEffectPlayer and source batch implementations remain unchanged in final.'},notSelected:{expiredRequests:candidateDecision,acid:{baselineFirstMs:early.firstUse.find(r=>r.kind==='acid').ms,decision:'No extra prewarm or pool selected from this single-patch measurement. Existing F02 disposal retained.'},sourceClones:'Existing required preload and pool reclamation retained; no blanket extra mesh warming.'},failures:await read(root+'/decisions-and-failures.json'),limitations:['Constructor CPU improvements are not whole-game FPS or first-GPU-draw guarantees.','Early create-and-draw sample zero always draws the old actor first; shared GPU warm-up confounds that pair. Large earlier Zerg draw samples are retained.','Loading and cross-run FPS vary considerably; no aggregate FPS improvement is attributed to X04.','The rejected request gate and whole-profile echo lifetime remain unchanged in final R3.','Five maps, full effects, 300 cap, 4:4:1, simulation/RNG/economy and save deferral remain unchanged.','No Current replacement, named delivery, commit, push, publication, full natural/physical/human/60FPS or whole MVP acceptance.']};
await fs.writeFile('reports/qa/performance-x04-20261020.json',JSON.stringify(proof,null,2)+'\n');
const rows=actors(trial).map(p=>`| ${p.race} | ${p.oldMs.toFixed(3)} | ${p.newMs.toFixed(3)} | ${(100*(1-p.newMs/p.oldMs)).toFixed(1)}% | ${p.fasterPairs}/${p.pairs} |`).join('\n');
const doc=`# X04：首次创建与资源池测量 · 2026-10-20

X04 本地完成。证据：[范围报告](../../reports/qa/performance-x04-20261020.json)，[性能看板](PERFORMANCE_BOARD.html)。最终只修改载体视图和战场渲染器两处生产文件；过期请求过滤候选因没有稳定 CPU 收益撤回，不能把候选的请求下降当成最终收益。

## 最终改动

载体按不可变 GLTF 模板和原动作复用参考姿态的精确边界与凸包轮廓，首次 CPU 准备放在既有加载门槛内。每个实例仍有独立动画、材质、骨骼和可修改的轮廓副本；出生、工作及死亡表现沿用原实现。弱引用缓存只保存参考数据，不保留已销毁的实例。主巢死亡第一次仍测量原始 Death 起始姿态边界，后续本体／扩张巢按同一边界计算各自宽度，不缓存活体动画。

## 局部成本与取舍

同页交替 12 对构造测量，单位为 ms；R2 的这两处生产文件与最终 R3 哈希完全相同，最终又复测人族与虫族。

| 载体 | 原实现 | 复用后 | 构造 CPU 下降 | 更快对数 |
| --- | ---: | ---: | ---: | ---: |
${rows}

主巢／扩张巢死亡的两种宽度共 24 对原始骨骼与变换精确相同，重复构造从约 3–4 ms 降至约 0.4 ms。早期新页面人族首个诊断构造为 37.2→12.2 ms；最终首次构造记录为 ${final.firstPodAfterLoading.ms.toFixed(3)} ms，均已保留必要加载且复用浏览器资源缓存，不是首次下载或全帧时间。

创建加实际绘制的 CPU 样本另列：首对先画旧实例会预热共享 GPU 资源，不能据此宣称首个 GPU 帧从数百毫秒降到几十毫秒；早期虫族候选 120.6／177.6 ms 慢样本原样保留。最终复测值见范围报告，不外推整场 FPS 或全部首帧峰值。

102 个源模型初始准备已单独计时；既有必需预热和闲置模型回收继续使用。酸液单区首建约 1.4 ms，后续约 0.1–0.3 ms，本轮未据此增加酸液池或更多预热。源 quad 池容量峰值 35,840，网格实例峰值 60、结束回 41；源 CPU 类型化数组由 13,696,080 增到 15,652,432 字节，保留增量约 1.96 MB，不是总显存。当前证据不足以支持收缩后反复扩容，因此保留峰值池策略。

候选曾提前挡住累计 9,007 次过期请求，但同页三组 CPU 均值未改善，已撤回；整个 profile 的 echo 寿命调度和播放器原有过期门槛仍保持原状。

## 验证与边界

最终 1,676 项完整回归、类型和数据文档检查通过；6,333 组活动请求对照精确。三组固定 World／账户／RNG／时间／提交对照仅归一三处新局 UUID，冻结不推进状态，实时采样没有丢弃模拟时间。三族载体的参考轮廓、尺度和落点一致；最终人族／虫族 8 对画面以及同代码神族 4 对画面完全相同。私有材质纹理与骨架纹理释放检查通过。

早期人族降落图有 4,065 个差异像素，原图和失败保留；最终测试对每个阶段只采样一次姿态再切换显示，并记录旧／新重复时钟动作状态用于解释，未修改原动作时钟。完整战场和恢复画面的细小 UI 像素差异逐项记在报告中；战场区域精确一致。

最终实际 WebGL 丢失／恢复检查包含原生灵能场景、活动载体和主巢死亡，时钟／RNG 不变，完整状态仅允许恢复提示 notice／noticeUntil 改变。所有截图只做本游戏的有限视觉检查，不代表人类、物理输入或完整自然战役验收。

加载波动较大：未改动基线也出现约 116 和 211 秒两次准备时间；最终第一次在 240 秒上限、85% GPU 准备阶段超时，失败保留。复测只把验证脚本的上限改为 600 秒并记录阶段进度，未改变游戏加载条件。各次源准备、总加载和整场短采样全部保留，不把跨轮差值归功于本轮代码，也不关闭普通 60 FPS 或整体 MVP 目标。

## 构建与后续

最终 JS：\`${final.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256}\`；${final.build.inputs.length} 编译输入，未纳入无关 economic-egg 修改。诊断入口：\`${proof.preview}\`（4436），原始证据：\`${root}/\`。

未替换 Current／命名交付、提交／推送或发布。五图、完整画质、300 上限／4∶4∶1、模拟与经济及存档延期保持。下一项为 S01「预计算灵能风暴目标密度」，尚未开始。
`;
await fs.writeFile('docs/project/PERFORMANCE_X04_20261020.md',doc);console.log(JSON.stringify({report:'reports/qa/performance-x04-20261020.json',changedFiles:changed,constructors:actors(trial).map(({race,oldMs,newMs})=>({race,oldMs,newMs})),finalRun}));
