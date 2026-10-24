import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-d02-medium-20261021',doc='docs/project/PERFORMANCE_D02_MEDIUM_20261021.md',qa='reports/qa/performance-d02-medium-20261021.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n'),hash=b=>createHash('sha256').update(b).digest('hex'),unique=a=>[...new Set(a)];
const s=await read(root+'/summary.json'),functional=await read(root+'/functional-r1/report.json'),visual=await read(root+'/visual-review.json'),build=await read('preview/performance-d02-medium-20261021-candidate-r1/build-inputs.json'),before=await read(root+'/inputs-before.json'),board=await read('docs/project/performance-board.json'),prior=structuredClone(board);
const settingsRun=await read(root+'/settings-r3/report.json');assert.equal(settingsRun.pass,true);assert.match(functional.failure,/strict mode violation/);assert.equal(functional.errors.length,0);assert.equal(visual.status,'reviewed');assert.equal(board.revision,97);assert.equal(board.tasks.find(t=>t.id==='D02').status,'进行中');
const heroes=functional.checks.filter(c=>c.kind==='hero-group'),contexts=functional.checks.filter(c=>c.kind==='context'),sizes=settingsRun.checks.filter(c=>c.kind==='responsive-settings');assert.equal(heroes.length,6);assert.equal(heroes.flatMap(c=>c.casts).length,18);assert.ok(heroes.every(c=>c.casts.every(x=>x.result)&&c.frames.length===3));assert.deepEqual(contexts.map(c=>c.preset),['medium','full']);assert.equal(sizes.length,3);
const test=await fs.readFile(root+'/regression-r1.log','utf8'),retry=await fs.readFile(root+'/regression-network-r2.log','utf8');assert.match(test,/tests 1753/);assert.match(test,/pass 1746/);assert.match(test,/fail 7/);assert.match(retry,/tests 16/);assert.match(retry,/pass 16/);assert.match(retry,/fail 0/);
const changed=[];for(const f of before.files)if(hash(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);assert.deepEqual(changed.slice().sort(),build.changes.filter(f=>f!=='src/render/effects/source/detail.ts').slice().sort());for(const f of build.inputs.filter(f=>build.changes.includes(f.file)))assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);
const regression={total:1753,firstPass:1746,firstEnvironmentFailures:7,retriedFiles:['test/coze-fetch.test.mjs','test/coze-web.test.mjs','test/p5-backend.test.mjs'],retryTests:16,retryPass:16,typecheck:true,dataCheck:true,newContractTests:6,fullParticleReference:await read(root+'/particle-reference.json')};
const failures=[...s.failures,{kind:'functional-selector',path:root+'/functional-r1/report.json',detail:'All 18 hero casts, 18 same-state samples and both actual context recoveries completed. The first responsive settings screenshot and medium/full selection also completed, then an ambiguous settings-back locator matched Close and Return; original report remains failed. settings-r3 independently completes three responsive panels using the exact Return button.'},{kind:'settings-resize-timing',path:root+'/settings-r2/report.json',detail:'1440px setting selection passed; the 980px panel bounds were sampled before the resize layout settled. Original report remains failed. settings-r3 waits for the actual current-viewport bounds and passes three panel selections; this is settings UI coverage, not canvas-resize verification.'},{kind:'regression-sandbox',path:root+'/regression-r1.log',detail:'Seven failure counts including the parent suite: loopback EACCES and temporary asset rename EPERM. Three existing files rerun outside that restriction passed 16/16. No test changed to suppress the failures.'},{kind:'historical-full-cross-browser-pixels',path:root+'/visual-candidate-r1/historical-full-comparison.json',detail:'Two independent-browser full captures differ despite identical cameras and run state apart from run identity. Renderer history was not synchronized; cause not established. Same-page full restoration and independent particle-module comparison are separate passing checks.'}];
const runs=['visual-candidate-r1','live-r1','live-r2','live-r3','live-r4','functional-r1','settings-r2','settings-r3'],files=[root+'/summary.json',root+'/visual-review.json',root+'/inputs-before.json',root+'/particle-reference.json',root+'/all-screen-index.json',root+'/functional-r1/hero-pixel-pairs.json',root+'/visual-candidate-r1/historical-full-comparison.json',root+'/regression-r1.log',root+'/regression-network-r2.log',root+'/typecheck-final.log',root+'/docs-check-final.log','preview/performance-d02-medium-20261021-candidate-r1/build-inputs.json',...build.changes,'test/medium-combat-preset.test.ts'];
for(const run of runs){const r=await read(root+'/'+run+'/report.json');files.push(root+'/'+run+'/report.json',root+'/'+run+'/runner.mjs');for(const pic of r.screens)assert.equal(hash(await fs.readFile(pic.file)),pic.sha256,pic.file);}
files.push('tools/build-performance-d02-medium.mjs','tools/qa-performance-d02-medium.mjs','tools/qa-performance-d02-live.mjs','tools/qa-performance-d02-functional.mjs','tools/qa-performance-d02-settings.mjs','tools/d02-browser-helper.mjs','tools/check-performance-d02-particles.mjs','tools/summarize-performance-d02-medium.mjs','tools/serve-performance-d02-medium.mjs');
const evidenceFiles=[];for(const file of unique(files)){const bytes=await fs.readFile(file);evidenceFiles.push({path:file,bytes:bytes.length,sha256:hash(bytes)});}
s.status='implemented-and-verified';s.functional={report:root+'/functional-r1/report.json',responsiveReport:root+'/settings-r3/report.json',partialRunScope:'Original functional runner remains failed on a final ambiguous Close/Return selector, after all hero and context checks completed; responsive checks completed separately.',heroes:18,groups:6,sameStateSamples:18,contexts:contexts.map(c=>({preset:c.preset,before:c.before.epoch,after:c.after.epoch,stateExact:c.before.state===c.after.state})),viewports:sizes.map(c=>c.size),settings:functional.checks.slice(0,4)};s.regression=regression;s.visual={images:visual.images,restoredFullPairs:visual.restoredFullPairs,status:visual.status};await write(root+'/summary.json',s);
// Bind the final summary bytes, not the pre-finalization status above.
const summaryFile=evidenceFiles.find(x=>x.path===root+'/summary.json'),summaryBytes=await fs.readFile(root+'/summary.json');Object.assign(summaryFile,{bytes:summaryBytes.length,sha256:hash(summaryBytes)});
const policy={approvedByUser:true,default:'Existing desktop native/full/complete and device-specific default rules retained.',medium:'Explicit secondary particle masks at 0.30, existing low ordinary/hero/terran-elite decoration, simple unit ground shadows, real-time PCF and contact disabled, decorative displacement disabled, bloom strength .18/radius .25/input width and height .25.',preserved:'Native output resolution, complete animation, source lifecycle, primary projectiles/beam ribbons/projections and combat state; full option retained. No new offscreen stopping/culling.',saved:'Exact old medium/native/complete/balanced+balanced upgrades to low+low; independently customized settings retain their values.',scope:'Performance benefit measured for the combined optional preset, not individual-cut causal attribution or all-content 60FPS acceptance.'};
await write(qa,{date:'2026-10-21',task:'D02',status:'implemented-and-verified',decisionComplete:true,policy,productionChanges:build.changes,existingFiles:{total:before.files.length,changed:changed.length,unchanged:before.files.length-changed.length,existingTestsChanged:0,added:['src/render/effects/source/detail.ts','test/medium-combat-preset.test.ts']},productionInputs:415,main:s.main,measurement:{gpu:s.scenes,liveGroups:s.liveGroups,livePairs:s.livePairs,totalNativeRuns:8,totalSimulatedSeconds:440,normalization:s.normalization,partialRunScope:s.partialRunScope},validation:{regression,functional:s.functional,visual,pageConsoleErrors:0},failures,limits:s.limits,evidenceFiles});
const fmt=n=>n.toFixed(3),full=s.liveGroups.find(x=>x.preset==='full'),medium=s.liveGroups.find(x=>x.preset==='medium');
await fs.writeFile(doc,`# D02：增强中特效并保留完整默认

2026-10-21。用户提出“中特效还阉割多一点”，并批准实施。新中特效已本地实现、验证并保留，D02 完成。原先“维持旧中档”的评估建议未成为最终决定；原报告和失败记录保留。看板完成44/52、剩余8项，下一项D03尚未开始。

[性能看板](PERFORMANCE_BOARD.html) · [范围证据](../../${qa}) · [原始汇总](../../${root}/summary.json) · [截图检查](../../${root}/visual-review.json) · [本地候选预览](http://127.0.0.1:4464/)

## 实际取舍

| 内容 | 新中特效 | 全特效／默认 |
| --- | --- | --- |
| 原生源粒子 | 逐模型、逐骨骼白名单精简烟尘、火花与碎屑，确定性保留参数0.30；小于等于3个出生及首个有效出生保留，实际数量不承诺恰好30% | 原发射器完整输出 |
| 普通兵、英雄与人族精英装饰 | 接入已有精简档；对应装饰路径约25%–35%，部分烟尘／弹壳省略 | 原完整档 |
| 阴影 | 关闭实时PCF阴影，单位使用已有简化落地影；也会失去摆件等实时投影 | 1024 PCF保持 |
| 接触阴影／画面扭曲 | 关闭接触预通道和折射，清理旧纹理的启用状态；保留护盾颜色和其他非折射层 | 原通道保持 |
| 泛光 | 强度0.32→0.18，半径0.5→0.25，输入宽高为全档的1/4；HDR和输出变换保留 | 原参数保持 |
| 清晰度与动作 | native输出、完整动作；主弹体、光束带、地面投影、危险提示、单位辨识和源生命周期保持 | 原默认及完整选项保持 |

此前中档仅少数整模型粒子减量，现改为明确的装饰发射器分类，避免按模糊名称或整个攻击模型裁减。分类表见[detail.ts](../../src/render/effects/source/detail.ts)。未增加屏外停更、动画强制降频或激进可见性裁剪。自适应75%–100%、独立15Hz动作选项和粗指针默认规则未改。

旧保存值仅在精确匹配旧中档组合（medium/native/complete、普通与英雄balanced）时迁移为新的low组合。其他自定义值保留。实际浏览器已验证迁移、刷新保持、自定义adaptive＋15Hz保留，以及无保存值时仍为桌面全档；窄窗口检查不等于物理触屏验证。

## 正常推进的整帧对照

AMD Radeon集显／ANGLE D3D11，headless Chrome155，1440×900，DPR1。四对独立新局交替全／中顺序，通过原生菜单进入简单人族、查尔seed529、相同空测试账号。保留原生产、射击、波次和伤害，无锁血、秒杀、注入单位／装备／现金、加速或跳关。玩家未移动；这是普通首关的自动战斗片段，不是人类完整战役。

每局自然推进至3300tick／55秒，累计440模拟秒。每局先用40个实际暂停绘制帧预热档位；原始0–55秒全部保存，汇总3≤time＜55秒，排除初始3秒及主动结束暂停帧。四对在两个独立浏览器中串行完成；第四对单独补测，未同时运行另一渲染或计时任务。

| 指标 | 全特效 | 新中特效 |
| --- | ---: | ---: |
| 每局中位帧间隔的组中位 | ${fmt(full.medianFrameIntervalMs)}ms | ${fmt(medium.medianFrameIntervalMs)}ms |
| 每局平均帧间隔的组中位 | ${fmt(full.meanFrameIntervalMs)}ms | ${fmt(medium.meanFrameIntervalMs)}ms |
| 每局P95帧间隔的组中位 | ${fmt(full.p95FrameIntervalMs)}ms | ${fmt(medium.p95FrameIntervalMs)}ms |
| 完整RAF回调CPU中位 | ${fmt(full.medianFrameCpuMs)}ms | ${fmt(medium.medianFrameCpuMs)}ms |
| 汇总测量帧 | ${full.steadyFrames} | ${medium.steadyFrames} |

四对中位帧间隔分别改善${s.livePairs.map(p=>p.medianIntervalReductionPercent.toFixed(1)+'%').join('／')}；平均帧间隔也4/4下降（约9.7%–14.6%）。因此保留这个可选组合。没有逐项剥离各削减的独立贡献，也不把这一首关结果外推到所有难度、后期、装备堆叠、五图或无尽。18.1ms仍高于16.67ms，不宣称60FPS完成。

每对初态、55秒末态及600/1200/1800/2400/3000/3300tick检查点一致；探针省略runId、notice、noticeUntil，并仅归一跨新局的UUID:1支援回执。其余选择的运行状态、状态系统和特殊系统精确，不能称所有World私有字段全等。八局均11击杀，末尾3名友军，前两名HP33.75／46.75、射击47／13次；第三名HP51.75。最终主动暂停的驱动尾部清理为0或1/60秒，实际值保留；没有修改FixedStepper。

## 同状态GPU和画面

另用无锁血普通开局的原生射击时刻，暂停相同World／镜头做18对交替测量。每窗10帧预热、24帧GPU查询，共864测量帧。暂停CPU展示缓存生效，不能把这组数字直接当作活跃帧率。

| 时刻／活敌 | 全档GPU区间 | 新中档GPU区间 | 中位下降 |
| --- | ---: | ---: | ---: |
${s.scenes.map(r=>`| ${r.time.toFixed(3)}秒／${r.enemies} | ${fmt(r.fullGpuMs)}ms | ${fmt(r.mediumGpuMs)}ms | ${r.gpuReductionPercent.toFixed(1)}% |`).join('\n')}

18/18对中档GPU区间较短。GPU elapsed包含该提交区间，CPU墙钟含提交／驱动阻塞；二者重叠，不能相加。旧中档的5.7%–13.3%历史结果仍见[原评估](PERFORMANCE_D02_REVIEW_20261021.md)，不同运行间不据此精确分配每项改动的贡献。

三个普通场景和六组英雄场景的全→中→全，恢复后的9对原始画布RGB逐像素相同。全／中有明确画质差异，保留原图和差异计数；例如英雄强光场景受泛光影响可遍及大部分画布，不称画面无损。主要弹体、光束、范围与英雄辨识均保留。18英雄采用构造的正常血量场景、合法获取及施放；英雄60%HP与友军50%HP用于覆盖治疗，24名普通血量敌人，无锁血，六组各三个时间点。它们用于功能和画面核验，不计入性能结论或自然战役。

实际WebGL丢失／恢复在中档和全档各通过一次，epoch递增，除恢复提示外的选择运行状态保持；恢复后的两个画布和三尺寸设置画面均已查看。共${visual.images}张截图检查完成。正式浏览器页面／控制台错误0，失败先导另列。三尺寸设置补测在正常标题页启动，用HUD公开面板状态打开实际设置，再操作原生下拉框与明确命名的返回按钮；没有重跑或改标已经完成的英雄／恢复报告。

## 回归、范围与失败

- 1753项回归覆盖通过：首轮1746通过、7个环境失败计数；相关3个既有文件授权重跑16/16通过。类型和数据文档检查通过。6项新增回归覆盖精确发射器分类、主要粒子保持、护盾颜色／折射切换、阴影标志、接触旧纹理与失败回退。
- 独立读取修改前粒子模块，102个模型、6个年龄、循环／非循环共1224组，26361个粒子的矩阵、颜色、UV、出生、发射器和相位与新全档精确相同。
- live-r1为沙箱HTTP拒绝；live-r2第二局被正常“未结束出征”规则阻止。后续只在菜单恢复相同空测试账号，未改战斗状态或生产规则。
- live-r3完成前三对并保存全部测量后，在第六局结束暂停因1/60秒尾部清理触发过严的零断言。该报告仍为失败；六个完整窗口逐项复核后保留，live-r4仅补第四对。未删除原失败或把R3改标通过。
- functional-r1已完成18英雄、两档真实恢复及首张设置截图，最后因关闭与返回共用动作导致严格选择器冲突。原报告仍失败；settings-r2改用明确的返回按钮，1440尺寸通过，但980尺寸读取早于resize布局完成；该失败也保留。settings-r3等待当前窗口布局就绪，单独完成三尺寸设置补测。补测验证设置面板和切档，不作为画布resize或触屏验收。
- 与旧独立浏览器全档图比较：21.15秒RGB相同，3.9／33.817秒分别499／4936像素不同，最大色阶26／40。相机一致，运行状态只差新局身份；渲染历史未同步，原因未完全定位。该历史比较不冒充严格A/B，也不影响另行验证的同页9对恢复精确与粒子模块对照。

仅7个旧生产文件和1个新增分类文件改变，另新增1个测试文件；713个开始前src/test文件中706个逐字节保持、既有测试未改。候选415个生产编译输入绑定A03/A02冻结底稿，排除其他工作流economic-egg变化。实际主JS SHA-256：\`${s.main.sha256}\`。预览目录为\`preview/performance-d02-medium-20261021-candidate-r1/\`，设置→画面→特效预设可切换。

D02只关闭已批准的画质政策与实现。FX-011/R10不追加直接屏外停更／剔除；R06保留据点增量动画；R08/R11全档仍有完整GPU成本，不把可选降档写成默认无损优化。300／4∶4∶1、五图内容、模拟经济、存档延期保持。未替换Current、提交、推送、在线发布或混入特殊玩法分支，V01–V04及整体MVP未关闭。
`);
const task=board.tasks.find(t=>t.id==='D02');task.status='已完成';task.updated='2026-10-21';task.result='用户批准增强中特效，8个生产文件本地实现：明确装饰发射器0.30、简化单位影，关闭实时阴影/接触/装饰折射，降低泛光；默认全档、native/完整动作、主攻击与源生命周期保持。4对正常无锁血首关0–55秒，3–55秒中位帧间隔21.1→18.1ms，四对均改善；18对暂停GPU约37.5–39.5%下降，非全内容60FPS。1753回归覆盖、类型/数据、18英雄、两档真实WebGL恢复及设置保存/三尺寸通过，9对全档恢复RGB精确。原环境/未结束账号/暂停尾部断言/设置选择器与resize等待及跨浏览器像素差异保留。D03未开始。';task.evidence=unique([...task.evidence,path.basename(doc),'../../'+qa]);
const reviews={
 'FX-011':'【不采纳】保留源生命周期、跨屏光束与重入；不追加直接屏外停更。D02已按用户决定实施显式装饰发射器减量与可选折射关闭，未按整个攻击模型或可见性删去主层。画质决策已完成。',
 'R06':'【部分解决】F02私有克隆清理及A02边界证据保留。据点活体/死亡增量动画继续原频率推进，D02未新增屏外停更或强制15Hz；用户批准的是可选中档装饰、阴影及后处理取舍，决策完成。',
 'R08':'【部分解决】R03静止CPU展示复用保留；全档继续完整GPU绘制。D02可选中档关闭实时阴影/接触/折射并缩减泛光，未停止暂停GPU渲染或改变活跃插值/镜头。政策完成，未宣称完整默认无后处理成本。',
 'R10':'【不采纳】全档保留可见与阴影范围并集，不直接移除可能影响画内的屏外投射体。D02中档明确关闭实时投影并使用单位简影，属于用户批准的画质取舍，不冒充保守剔除优化；未追加更激进可见性规则。',
 'R11':'【部分解决】D02用户批准增强可选中档：关闭接触/装饰折射、降低泛光强度和输入尺寸，native输出及HDR/ACES保留。完整默认维持原通道；4对普通首关整帧与18对GPU证据通过，不代表所有内容60FPS。'
};
for(const id of task.auditIds){const row=board.auditRows.find(r=>r.id===id);row.previousReview=row.currentReview;row.currentReview='2026-10-21 D02：'+reviews[id];row.reviewedAt='2026-10-21';row.reviewEvidence=unique([...row.reviewEvidence,doc,qa]);}
board.revision=98;board.updated='2026-10-21';board.next='D03';board.baseline.measurements+=' D02于2026-10-21完成用户批准的增强可选中档；4对普通首关中位帧间隔21.1→18.1ms，默认全档/完整动作保持，未达成全内容60FPS。';board.updates.push({date:'2026-10-21',tasks:['D02'],change:task.result+' 完成44/52、剩余8项。',evidence:[path.basename(doc),'../../'+qa]});
assert.equal(board.tasks.length,52);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,44);assert.equal(board.auditRows.length,169);for(const t of board.tasks)if(t.id!=='D02')assert.deepEqual(t,prior.tasks.find(x=>x.id===t.id));for(const row of board.auditRows){const old=prior.auditRows.find(x=>x.id===row.id);for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration','tasks','reviewStatus','followUpTasks'])assert.deepEqual(row[key],old[key]);if(!task.auditIds.includes(row.id))assert.deepEqual(row,old);}
await write(root+'/board-before-final.json',prior);await write('docs/project/performance-board.json',board);
const note=`## D02 增强中特效完成 · 2026-10-21\n\n- 用户批准扩大中特效差异，8个生产文件本地实现；记录${doc}，证据${qa}。52项完成44、剩余8，下一项D03未开始。\n- 装饰发射器定向0.30及既有精简档、简化单位落地影、关闭实时PCF/接触/装饰折射、降低泛光；完整默认、native、完整动作、主路径/范围/辨识与源生命周期保持，无新增屏外停更。精确旧中档保存组合升级，其他自定义和粗指针规则保持。\n- 4对正常无锁血简单人族首关各55秒，3–55秒20093帧，中位帧间隔21.1→18.1ms，均值21.844→19.305ms，4/4较快；3射击点18对GPU区间约省37.5–39.5%。不是全内容60FPS。\n- 1753回归覆盖、类型/数据、1224组原全档粒子精确、18英雄、两档实际WebGL恢复、设置保存/三尺寸通过；9对全档恢复RGB精确，${visual.images}图已查看，正式页面/控制台错误0。沙箱/旧账号阻止/暂停尾部断言/设置选择器与resize等待及跨浏览器2图差异保留；R3六个已完成测量与R4补一对分列，不改旧失败。\n- 7旧生产+1新增分类、1新增测试；713既有文件706未改，既有测试未改，415冻结生产输入排除economic-egg他线。主JS ${s.main.sha256}，候选preview/performance-d02-medium-20261021-candidate-r1/（4464）。未替换Current、提交/推送/发布；300/4∶4∶1、五图、经济、存档延期、特殊玩法分支与V01–V04/MVP边界保持。\n\n`;
await fs.writeFile('AGENTS.md',note+await fs.readFile('AGENTS.md','utf8'));
for(const f of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){const old=await fs.readFile(f,'utf8'),at=old.indexOf('\n'),prefix=f==='docs/project/README.md'?'':'project/';await fs.writeFile(f,old.slice(0,at+1)+`\n2026-10-21 [D02增强中特效完成](${prefix}${path.basename(doc)})：用户批准扩大可选档差异，默认完整效果保持；4对普通首关中位帧间隔21.1→18.1ms，18对GPU约下降37.5–39.5%，非全内容60FPS。看板44/52、剩余8项，下一项D03未开始。\n`+old.slice(at+1));}
const oldDoc='docs/project/PERFORMANCE_D02_REVIEW_20261021.md',old=await fs.readFile(oldDoc,'utf8'),at=old.indexOf('\n');await fs.writeFile(oldDoc,old.slice(0,at+1)+`\n> 后续决定：用户已批准增强中特效，实施与验证见[最终D02记录](${path.basename(doc)})。下文保留当时“待定”的评估结论与旧档位数据，不代表当前状态。\n`+old.slice(at+1));
console.log(JSON.stringify({status:task.status,revision:board.revision,completed:44,remaining:8,next:board.next,doc,qa,images:visual.images}));
