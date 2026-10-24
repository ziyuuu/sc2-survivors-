import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/performance-d02-20261021',doc='docs/project/PERFORMANCE_D02_REVIEW_20261021.md',qa='reports/qa/performance-d02-20261021.json';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8')),write=(f,v)=>fs.writeFile(f,JSON.stringify(v,null,2)+'\n'),sha=b=>createHash('sha256').update(b).digest('hex');
const s=await read(root+'/summary.json'),raw=await read(root+'/'+s.run+'/report.json'),visual=await read(root+'/visual-review/analysis.json');
const b=await read('docs/project/performance-board.json'),before=structuredClone(b),inputs=await read(root+'/inputs-before.json');
assert.equal(b.revision,95);assert.equal(b.tasks.find(t=>t.id==='D02').status,'进行中');assert.equal(s.status,'measured-awaiting-policy');assert.equal(raw.pass,true);assert.equal(s.errors.length,0);assert.equal(s.failedRequests.length,0);assert.equal(visual.images,22);
for(const f of inputs.files)assert.equal(sha(await fs.readFile(f.file)),f.sha256,f.file);
for(const run of ['ordinary-1','ordinary-2',s.run]){const r=await read(`${root}/${run}/report.json`);for(const pic of r.screens)assert.equal(sha(await fs.readFile(pic.file)),pic.sha256,pic.file);}
assert.ok(visual.pixelPairs.filter(p=>p.other==='full-restored').every(p=>p.changedPixels===0));
const sourceEvidence=s.scenes.map(scene=>({time:scene.actualTime,presets:scene.settings.map(w=>({preset:w.preset,source:Object.fromEntries(Object.entries(w.source.source).filter(([k,v])=>typeof v!=='object'))}))}));
const reviewed={...visual,status:'reviewed',date:'2026-10-21',method:'All 22 originals inspected through 5 contact sheets; 8 originals additionally viewed at full size (ordinary-2 t20 full/medium; formal t3/t20/t32 full/medium).',findings:['Menu and ready screens render normally in successful runs. Sandbox failure screenshot remains an actual network-denied page.','Formal canvas captures exclude the pause/HUD overlay. Existing dark Char terrain, units, health bars and resource landmarks are visible; medium changes shadow, bloom and decorative particles. No claim that all combat effects or heroes are visually equivalent.','All three full-to-restored-full RGB comparisons are exact. Full-to-medium differences are intentional quality differences, not zero-pixel equivalence.','The ordinary-2 failure screenshot shows the normal intermission after 60 seconds, not a game crash. Final formal screenshot shows the native pause screen.']};
await write(root+'/visual-review.json',reviewed);
const recommendations={status:'awaiting-user-policy',default:'Keep existing saved settings and device-specific defaults; unsaved desktop native/full/complete.',options:'Keep existing medium, adaptive 75–100%, custom quality and optional 15 Hz pose mode; do not add duplicate settings.',newTradeoffs:'No newly forced 15 Hz animation, offscreen mixer stop, source-effect stop or removal of offscreen shadow casters.',performanceGoal:'Ordinary-play 60 FPS remains unaccepted; this review only measures paused GPU draw intervals.'};
const manifestFiles=[root+'/inputs-before.json',root+'/summary.json',root+'/visual-review.json','tools/qa-performance-d02.mjs','tools/summarize-performance-d02.mjs','tools/review-performance-d02.py'];
for(const run of ['ordinary-1','ordinary-2',s.run])manifestFiles.push(`${root}/${run}/report.json`,`${root}/${run}/runner.mjs`);
for(const n of [3,20,32])manifestFiles.push(`${root}/${s.run}/t${n}.state.json`);
const evidenceFiles=[];for(const f of manifestFiles){const data=await fs.readFile(f);evidenceFiles.push({path:f,bytes:data.length,sha256:sha(data)});}
await write(qa,{date:'2026-10-21',task:'D02',status:'assessment-complete-awaiting-policy',decisionComplete:false,productionChanges:[],device:s.device,main:s.main,recommendations,measurement:{sceneCount:3,pairs:18,windows:36,measuredFrames:864,warmupFrames:360,scenes:s.scenes.map(x=>({time:x.actualTime,counts:x.counts,stateSha256:x.stateSha256,pairs:x.pairs,fullGpuMs:x.fullGpuMs,mediumGpuMs:x.mediumGpuMs,gpuReductionPercent:x.gpuReductionPercent,mediumFasterPairs:x.mediumFasterPairs,fullRenderCpuMs:x.fullRenderCpuMs,mediumRenderCpuMs:x.mediumRenderCpuMs})),sourceEvidence,naturalWindows:s.naturalWindows},validation:{existingFilesUnchanged:inputs.files.length,productionComparison:s.productionComparison,allWindowWorldAndCameraExact:true,restoredFullPixelsExact:true,pageConsoleErrors:0,failedRequests:0,fullGameTestSuiteRerun:false,images:22,formalImages:12,contactSheets:5},failures:s.failures,limits:s.limits,evidenceFiles,priorEvidence:['docs/project/PERFORMANCE_R01_20261020.md','docs/project/PERFORMANCE_R03_20261020.md','docs/project/PERFORMANCE_A02_20261020.md','docs/project/EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md']});
const fixed=n=>n.toFixed(3);
await fs.writeFile(doc,`# D02：画质分档与可见性取舍复核

2026-10-21。用户授权开始 D02，证据整理完成，画质政策待定。建议保持现有默认与可选档位，本轮不增加画质牺牲。尚未把此建议记作用户决定，D02 保持待讨论；看板完成 43/52、剩余 9 项，当前仍为 D02。

[性能看板](PERFORMANCE_BOARD.html) · [范围证据](../../${qa}) · [原始汇总](../../${root}/summary.json) · [截图检查](../../${root}/visual-review.json)

## 当前已有选项与建议

| 项目 | 现有行为 | 本轮建议 |
| --- | --- | --- |
| 未保存设置的桌面默认 | 屏幕分辨率、全特效、完整动作 | 保持 |
| 中特效 | 同样使用屏幕分辨率与完整动作；普通兵/英雄效果均衡，指定装饰粒子比例 1→0.55，接触阴影采样 12→6，阴影图 1024→512，泛光输入宽高各减半 | 保留已有手动选项，不作为新实现或默认降档 |
| 自适应 | 已有可选分辨率比例 100/90/80/75%，由真实 GPU 查询驱动；不改单位、攻击与技能逻辑 | 保持已有范围，不把历史 50% 诊断当作自动档 |
| 其他质量设置 | 均衡限制 DPR≤1.5，低分辨率限制 DPR≤1；在 DPR1 时二者并不自动缩小输出。纹理过滤和 LOD 还可能不同 | 不用“低分辨率”名称推断固定收益，不新增重复控件 |
| 动作 | 默认完整动作，已有独立可选 15Hz 姿态采样 | 保持可选，不强制降频 |
| 已保存设置／粗指针设备 | 继续读取保存值；粗指针无保存值时，分辨率、英雄/普通特效已有均衡默认，动作仍完整；界面可能显示自定义 | 保留现有规则；本轮没有手机真机测量 |
| 屏外据点、源特效与阴影投射体 | 保持当前增量动画、生命周期及镜头/阴影范围并集 | 不追加直接停更或更激进剔除 |
| 暂停展示 | R03 已复用合法静止帧的 CPU 展示准备，完整 GPU 后处理仍运行 | 保持既有实现，不将 CPU 复用冒充停止 GPU 绘制 |

设置依据：[质量策略](../../src/render/settings/quality.ts)、[自适应](../../src/render/settings/adaptive-quality.ts)、[渲染器](../../src/render/scene/battle-renderer.ts)、[设置界面](../../src/ui/presentation/settings-screen.ts)。全/中两档切换会恢复 native 与完整动作；“中特效”不等于降低整个画布分辨率。以上均为既有功能，本轮生产修改为 0。

## 普通开局的同状态对照

沿用 A03 的冻结 A02 生产输入与真实资源，在独立测试浏览器正常菜单选择简单难度、人族、查尔、seed529，空装备账户。原生主循环推进，未锁血、未一击必杀、未注入单位/装备/现金、未跳关，也未手动改伤害或调用攻击。脚本在达到最低时间后，等到有活敌且原生固定步实际产生一次玩家射击才暂停。三个取样点实际为 3.9、21.15、33.8167 秒，活敌分别为 1、1、3；这是同一开局的三个小规模交火时刻，不是三个完整战役或高密度代表集。

设备为本机 AMD Radeon 集显 / ANGLE D3D11、Headless Chrome155、1440×900、DPR1。每个场景做 6 对全/中特效交替顺序测量，每窗 10 帧预热、24 帧实际 GPU 查询，共 36 窗、864 帧测量与 360 帧预热。比较原生 render 的 GPU elapsed 区间；模拟暂停，因此 R03 的 CPU 静止准备复用生效。这不是活跃整场 FPS、纯 GPU 忙碌时间或最终人工游玩验收。

| 实际模拟时间 / 活敌 | 全特效 GPU 区间 ms | 中特效 GPU 区间 ms | 中位下降 | 中特效较快的对数 |
| --- | ---: | ---: | ---: | ---: |
${s.scenes.map(x=>`| ${fixed(x.actualTime)} 秒 / ${x.counts.enemies} | ${fixed(x.fullGpuMs.median)} | ${fixed(x.mediumGpuMs.median)} | ${x.gpuReductionPercent.toFixed(1)}%（${fixed(x.fullGpuMs.median-x.mediumGpuMs.median)}ms） | ${x.mediumFasterPairs}/6 |`).join('\n')}

表格为“每窗 24 帧中位数，再取 6 窗中位数”，没有择最好值。18/18 配对的中特效 GPU 区间较短，支持保留可选档位；这点收益不能证明降为默认能解决帧率问题。

render 的 CPU 墙钟时间包含驱动/提交阻塞，不能与 GPU 区间相加。三个场景全→中分别为 ${s.scenes.map(x=>`${fixed(x.fullRenderCpuMs.median)}→${fixed(x.mediumRenderCpuMs.median)}ms`).join('、')}；后两组变慢，未显示稳定 CPU 收益。正常推进片段仅全特效有记录，帧间隔中位分别为 ${s.naturalWindows.map(x=>fixed(x.renderIntervalMs.median)).join('、')}ms，均超过 16.67ms；有诊断探针和暂停分段，不把它们当作标准 FPS 验收或配对全/中对比。累计 discardedBacklogSeconds 最终为 1/60 秒，包含测试主动暂停切换，不宣称测试全程完全无丢弃；游戏驱动未改。

首个陆战队员实际 HP 从 51.75 降为 33.75，原生生产新增友军；正式段敌人逐步峰值 3、积压峰值 0。该证据不覆盖其他族、后期、英雄、装备堆叠、无尽、移动镜头或全部五图。普通游玩 60 FPS 总目标继续保留，V01–V04 未关闭。

## 画面与状态核验

每窗 selectRunData、状态/特殊系统快照、visualEvents 与装备账户逐字串相同，相机矩阵/投影/位置/输出也一致；不称所有 World 私有字段全等。两档实际输出均 1440×900、native、完整动作，确认阴影、接触采样和装饰比例按既有规则变化。恢复全档后的三对原始画布 RGB 逐像素相同。

全/中之间本来就有画面差异：三个场景分别改变 9,915 / 180,839 / 183,024 像素，最大通道差 35 / 75 / 75。检查可见查尔地形、单位、血条和资源标记；泛光/阴影细节不同，21.15秒的源粒子为全档11、中特效7。不能说画面完全不变、所有英雄主效果均验收，或把低粒子数量归结为源生命周期删除。原始战场截图排除了暂停/HUD覆盖层；原生暂停界面另有整页截图。

22 张截图通过 5 张联系表全部查看，另将 8 张原图放大核对；其中正式运行 12 张。正式运行页面/控制台错误 0，请求失败 0。正式三个场景的 [全档](../../${root}/${s.run}/t20-full.png) / [中档](../../${root}/${s.run}/t20-medium.png) 对照可直接查看（链接为21.15秒场景）。

## 旧证据与失败保留

- [R01](PERFORMANCE_R01_20261020.md) 的 300 敌压力与 100/75/50/100% 分辨率诊断仍为人工压力证据，不能替代正常对局；当前自适应最低仍为75%。不继承其跨会话像素差异为本次严格对照。
- [A02](PERFORMANCE_A02_20261020.md) 的5据点可见/屏外循环均约0.062ms/帧，且重入、暂停、移除及实际图形恢复已有记录。收益不足以支持本轮冒险停止增量动画。
- FX-011 的源特效跨屏/重入及 R10 的屏外投射体可能影响屏内画面，尚无完整保守边界候选。建议维持此前不直接停更/剔除的处理；R08/R11 的后处理边界保持。五条审计仅追加本次证据链接和待定建议，不把待定决策写成已解决。
- [2026-10-16旧重载实验](EQUIPMENT_EFFECTS_PERFORMANCE_20261016.md) 曾有全/中均低帧率且中特效收益不稳定的结果；保留原值。那一阶段重载30/60FPS目标不降低当前普通游玩60FPS目标。
- ordinary-1：沙箱本地HTTP被拒，错误页及失败记录保留，无有效游戏样本；授权后的运行使用同一冻结游戏构建。
- ordinary-2：20/40秒恰好处于0活敌间歇，测量只按空档保留；60秒自然进入关间界面，导致脚本“仍在战斗”断言失败。不是游戏崩溃，也不把两个空档当成正式交火场景。正式 ordinary-active-1 改按原生射击事件选择时间，之前的runner与report均保留。

## 构建与完成范围

实际浏览器主JS SHA-256：\`${s.main[0].sha256}\`，${s.main[0].bytes}字节；使用 \`preview/performance-a03-20261021-r2/\`，没有新游戏构建。414个冻结生产输入与当前源码对照：289逐字节一致、124仅换行不同、1个economic-egg为其他工作流差异且未混入本次测试。开始前记录的713个既有src/test文件至本轮记录时逐字节未改。

本轮只新增诊断工具、报告与看板记录，没有重跑全量游戏测试、类型检查或恢复矩阵，也不把 A02/A03 的既有通过数写成本轮新通过。新增的同状态、镜头、实际设置、GPU查询与截图校验全部通过；原始样本、失败与脚本版本可由范围证据的文件hash追溯。

用户待决定的是：是否按“保留现有默认和可选档位，本轮不增加画质牺牲”完成 D02，或继续评估明确的新可选档位。本轮尚未记录该选择；不是重新申请实现已授权的自适应。未启动 D03，未替换 Current、提交、推送或发布；300／4∶4∶1、五图、经济、存档延期及独立特殊玩法分支边界保持。
`);
const task=b.tasks.find(t=>t.id==='D02');task.status='待讨论';task.updated='2026-10-21';task.result='评估证据已齐，待用户定案。正常无锁血人族首关3次原生交火、18对同状态全/中特效，GPU区间约省0.35–0.78ms（5.7–13.3%）；CPU无稳定收益，非整场FPS。建议保留现有默认、中特效/自适应/完整动作及已有可选项，不新增屏外停更或激进裁剪。全档恢复3对RGB精确，22图已查看，713既有src/test未改；先导网络拒绝和空档/关间断言失败保留。无生产修改，D02尚未关闭。';
task.evidence=[...new Set([...task.evidence,path.basename(doc),'../../'+qa])];
for(const id of task.auditIds){const row=b.auditRows.find(r=>r.id===id);row.previousReview=row.currentReview;row.currentReview+=' 2026-10-21 D02已补普通开局同状态画面/GPU证据，建议维持现有选项与完整默认；尚待用户定案，不据此关闭该决策。';row.reviewedAt='2026-10-21';row.reviewEvidence=[...new Set([...row.reviewEvidence,doc,qa])];}
b.revision=96;b.updated='2026-10-21';b.next='D02';b.updates.push({date:'2026-10-21',tasks:['D02'],change:task.result+' 完成43/52、剩余9项，D03未开始。',evidence:[path.basename(doc),'../../'+qa]});
assert.equal(b.tasks.filter(t=>t.status==='已完成').length,43);assert.equal(b.tasks.length,52);assert.equal(b.auditRows.length,169);
for(const t of b.tasks)if(t.id!=='D02')assert.deepEqual(t,before.tasks.find(x=>x.id===t.id));
for(const r of b.auditRows){const old=before.auditRows.find(x=>x.id===r.id);for(const k of ['id','title','sourceCategory','sourceExecution','sourceIntegration','tasks','reviewStatus','followUpTasks'])assert.deepEqual(r[k],old[k]);if(!task.auditIds.includes(r.id))assert.deepEqual(r,old);}
await write(root+'/board-before-review.json',before);await write('docs/project/performance-board.json',b);
const note=`## D02 画质取舍评估就绪，待定案 · 2026-10-21\n\n- 用户授权开始D02。记录${doc}，证据${qa}；无新画质政策决定，D02待讨论，52项完成43、剩余9，D03未开始。\n- 正常无锁血简单人族首关3.9/21.15/33.8167秒原生射击取样，活敌1/1/3；18对同状态全/中特效、864测量帧，GPU区间约省0.35–0.78ms（5.7–13.3%）。CPU后两组较慢，非整场FPS或普通60FPS验收；正常推进片段帧间隔约19/22.3/22ms保留。\n- 建议保持现有默认、保存值及粗指针规则，保留已有中特效/75–100%自适应/可选15Hz；默认完整动作，不追加屏外停更或激进裁剪。建议尚未当作用户决定。\n- 全档恢复3对RGB精确；全/中画面差异如实保留，22截图经5联系表查看。正式页面/控制台及请求错误0；沙箱失败、空档取样和60秒正常进入关间导致的脚本断言失败保留。\n- 713既有src/test未改，414冻结生产输入沿用A03/A02，economic-egg他线变更排除。主JS ${s.main[0].sha256}。无生产修改/新全量回归，不替换Current、提交/推送/发布；300/4∶4∶1、五图、经济、存档延期及V01–V04/MVP边界保持。\n\n`;
await fs.writeFile('AGENTS.md',note+await fs.readFile('AGENTS.md','utf8'));
for(const f of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){const old=await fs.readFile(f,'utf8'),at=old.indexOf('\n'),prefix=f==='docs/project/README.md'?'':'project/';await fs.writeFile(f,old.slice(0,at+1)+`\n2026-10-21 [D02画质取舍评估就绪](${prefix}${path.basename(doc)})：普通无锁血开局3个交火点18对全/中特效，GPU区间约省0.35–0.78ms，CPU无稳定收益；建议保留现有默认及可选档，待用户定案。无生产修改，看板43/52、剩余9项。\n`+old.slice(at+1));}
console.log(JSON.stringify({revision:b.revision,status:task.status,completed:43,remaining:9,productionChanges:0,doc,qa,sourceEvidence}));
