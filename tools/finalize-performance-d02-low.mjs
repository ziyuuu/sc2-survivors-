import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
const root='reports/local/performance-d02-low-20261021',doc='docs/project/PERFORMANCE_D02_LOW_20261021.md',qa='reports/qa/performance-d02-low-20261021.json',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n'),hash=b=>createHash('sha256').update(b).digest('hex'),unique=a=>[...new Set(a)];
const s=await read(root+'/summary.json'),visual=await read(root+'/visual-review.json'),board=await read('docs/project/performance-board.json'),build=await read('preview/performance-d02-low-20261021-candidate-r3/build-inputs.json');
assert.equal(board.revision,99);assert.equal(board.tasks.find(t=>t.id==='D02').status,'进行中');assert.equal(visual.status,'reviewed');assert.equal(s.live.totalNativeRuns,6);assert.equal(s.functional.heroFixedPairs.length,6);
const regressionText=await fs.readFile(root+'/regression-final.log','utf8');assert.match(regressionText,/tests 1758/);assert.match(regressionText,/pass 1758/);assert.match(regressionText,/fail 0/);
for(const f of build.inputs.filter(f=>build.changes.includes(f.file)))assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);
const full=s.live.groups.find(x=>x.preset==='full'),low=s.live.groups.find(x=>x.preset==='low'),reduction=(full.medianFrameIntervalMs-low.medianFrameIntervalMs)/full.medianFrameIntervalMs*100,faster=s.live.pairs.filter(p=>p.low.intervalMs.median<p.full.intervalMs.median).length;
const failures=[];for(const name of ['functional-r1','functional-r2','functional-r3','functional-r4','functional-r5']){const r=await read(root+'/'+name+'/report.json');failures.push({run:name,path:root+'/'+name+'/report.json',pass:r.pass??false,failure:r.failure,completedChecks:r.checks.length,pageConsoleErrors:r.errors,startupAttempts:r.startupAttempts});}
const recovery=await read(root+'/functional-r6/context-retry.json');assert.equal(recovery.clicked,true);assert.equal(recovery.before.epoch,1);assert.equal(recovery.before.pending,0);
const regression={total:1758,pass:1758,failed:0,newTests:5,existingTestsChanged:0,typecheck:true,dataCheck:true,earlierFailuresRetained:['regression-r1.log','targeted-tests.log','targeted-tests-r2.log','network-regression-r2.log','targeted-fixture-r3.log','low-tests-r4.log']};
const policy={approvedByUser:true,presets:['low','medium','full'],labels:['低 · 仅危险提示','中 · 精简特效','高 · 完整特效（默认）'],freshDefault:'High/native/complete for fresh desktop and coarse-pointer profiles. Any existing graphics preference preserves the existing customized resolution/effects/animation rules.',low:'Disable combat/decorative effect adapters, projectiles/beams/muzzle flashes/hit/explosion/trails, birth/death extras, environment particles, pickup decorations, barrier and hit overlays, bloom, refraction, real-time PCF and contact shadows. Keep physical unit/pickup models, model materials, complete actions, simple ground shadows, health bars and interaction UI.',danger:'One static frame of original fx.acid.0 texture projected on terrain, clipped to native harmful footprints. No added visible sphere, ring, box, outline or solid-fill geometry marker. Plane mesh is only a texture carrier. Nominal footprints do not replace native body-radius or line-of-sight collision rules.',medium:'Previously approved medium policy retained; no new medium-vs-high GPU measurement in this supplement.',high:'Complete effects remain available. Same-state high/low/high restoration verified.',simulation:'Damage, trajectories, movement, AI, fixed-step schedule, RNG, production, 300 and 4:4:1 remain unchanged. One read-only native packet-ownership query added for correct danger classification after caster capture or removal.',saved:'Low persists across reload; exact old medium combination upgrades as before; existing custom settings preserved.'};
const files=[root+'/summary.json',root+'/scope-final.json',root+'/visual-review.json',root+'/visual-review/analysis.json',root+'/inputs-before.json',root+'/regression-final.log',root+'/typecheck-complete.log',root+'/docs-check-complete.log',root+'/functional-r6/context-retry.json',root+'/functional-r6/context-retry-runner.mjs',root+'/functional-r6-context-low-inspect.json',root+'/functional-r6-context-full-inspect.json','preview/performance-d02-low-20261021-candidate-r3/build-inputs.json',...build.changes,'test/low-combat-preset.test.ts'];
for(const name of ['functional-r1','functional-r2','functional-r3','functional-r4','functional-r5','functional-r6','boot-baseline-r1','boot-candidate-r1','settings-desktop-r1','settings-coarse-r1','live-r1','danger-drawing-r1']){files.push(root+'/'+name+'/report.json');try{await fs.access(root+'/'+name+'/runner.mjs');files.push(root+'/'+name+'/runner.mjs');}catch{}}
for(let i=0;i<6;i++)files.push(root+'/functional-r6/fixed-pair-'+i+'.json');for(const file of regression.earlierFailuresRetained)files.push(root+'/'+file);for(const picture of visual.pictures)files.push(picture.file);for(const contact of visual.contacts)files.push(contact);
for(const f of ['tools/build-performance-d02-low.mjs','tools/d02-low-browser-helper.mjs','tools/qa-performance-d02-low-functional.mjs','tools/qa-performance-d02-low-live.mjs','tools/qa-performance-d02-low-settings.mjs','tools/qa-d02-low-danger-drawing.mjs','tools/check-d02-low-scope.mjs','tools/review-performance-d02-low.py','tools/summarize-performance-d02-low.mjs','tools/serve-performance-d02-low.mjs'])files.push(f);
const evidenceFiles=[];for(const file of unique(files)){const b=await fs.readFile(file);evidenceFiles.push({path:file,bytes:b.length,sha256:hash(b)});}
const limits=[...s.limits,'Functional R6 context-low recovery needed a supplemental native Retry after a shader timeout; medium/high recoveries and later first-attempt startup are recorded separately, not used to erase the timeout.','Earlier failed R5 assertion output is truncated and its first mismatch is the independent run UUID in stageReceipt. It is not a proof of full equality; R6 saves complete raw paired states and compares every other serialized field.','No Current replacement, commit, push, online deployment or merge of the independent special-gameplay branch. V01–V04 and overall MVP remain open.'];
s.status='implemented-and-verified';s.policy=policy;s.regression=regression;s.visual=visual;s.recoveryAssistance=recovery;s.failures=failures;s.limits=limits;await write(root+'/summary.json',s);const summaryBytes=await fs.readFile(root+'/summary.json');Object.assign(evidenceFiles.find(x=>x.path===root+'/summary.json'),{bytes:summaryBytes.length,sha256:hash(summaryBytes)});
await write(qa,{date:'2026-10-21',task:'D02',status:'implemented-and-verified',policy,productionChanges:build.changes,scope:s.scope,main:s.main,measurement:s.live,validation:{functional:s.functional,settings:s.settings,regression,visual,recoveryAssistance:recovery},failures,limits,evidenceFiles});
const fmt=n=>n.toFixed(3);
await fs.writeFile(doc,`# D02 低／中／高三档补完 · 2026-10-21

用户批准补完三档、默认高档；低档关闭特效，只留最简危险范围提示，并禁止几何体提示。本批已本地实现和核验，D02完成；52项完成44、剩余8，下一项D03尚未开始。[正式证据](../../${qa})。

## 实际行为

设置 → 画面提供“低 · 仅危险提示”“中 · 精简特效”“高 · 完整特效（默认）”。三档均保持native输出和完整动作。全新桌面与实际粗指针模拟环境都默认高档；已有画质自定义不被覆盖，精确旧中档保存组合沿用既有迁移，低档刷新后保持。

低档隐藏战斗特效层，同时跳过十组特效适配器的计算，不只隐藏粒子。弹丸／导弹外观、光束、枪口、命中、爆炸、轨迹、出生／死亡额外效果、环境粒子、拾取装饰、受击闪光和护盾叠层关闭；泛光、折射、实时PCF和接触阴影关闭。模型及其材质、完整动作、实际拦截机编队、简单落地影、血条、物品本体和既有交互提示保留。低档期间消费英雄展示事件，回高档时同步展示游标并清理过时缓存；不改伤害、弹道结算、RNG、队列、AI、生产或固定步调度。

危险提示使用原始fx.acid.0贴图第7帧的静态地面投影：涵盖六类敌方特殊预警、进行中的冲锋／导弹、酸区／腐蚀区、普通敌方腐蚀胆汁和主巢特殊攻击。没有新增可见球体、圆环、方框、实体填充或轮廓几何标记；底层平面只承载原贴图。范围来自原生数据，沿地形取高，危险消失时释放投影；伤害仍使用原有单位半径、视线和命中规则。新增的模拟侧接口仅只读查询攻击提交时的归属，避免施法者被俘获或移除后误隐藏敌方危险。

中档沿用[已批准实现与测量](PERFORMANCE_D02_MEDIUM_20261021.md)。本补充未重做中／高GPU对照，不把跨次历史数据当成新的三档同场测量。高档仍保留完整效果，没有新增屏外停更。

## 正常首关对照

同一台机器、1440×900、DPR1，简单人族查尔seed529；三个交替高／低对照，共六局，每局完整55秒。原生菜单、生产、波次、攻击和显示循环，无锁血、秒杀、加速或注入单位。每次菜单恢复同一空测试账号，暂停尾部保持原驱动行为。3–55秒共${full.steadyFrames+low.steadyFrames}测量帧，最初3秒保留在原始数据。

| 指标（各局结果的中位数） | 高档 | 低档 |
| --- | ---: | ---: |
| 帧间隔中位数 | ${fmt(full.medianFrameIntervalMs)}ms | ${fmt(low.medianFrameIntervalMs)}ms |
| 帧间隔均值 | ${fmt(full.meanFrameIntervalMs)}ms | ${fmt(low.meanFrameIntervalMs)}ms |
| 帧间隔P95 | ${fmt(full.p95FrameIntervalMs)}ms | ${fmt(low.p95FrameIntervalMs)}ms |
| 显示回调CPU中位数 | ${fmt(full.medianFrameCpuMs)}ms | ${fmt(low.medianFrameCpuMs)}ms |

中位帧间隔汇总下降${reduction.toFixed(1)}%，${faster}/3对低档更快；各对中位变化分别为${s.live.pairs.map(p=>p.medianIntervalReductionPercent.toFixed(1)+'%').join('／')}。这是本机普通首关的可选画质取舍收益，不是全内容60FPS验收，也不是单个削减项目的独立贡献。显示回调CPU与GPU／帧间隔不能相加。

各对初态、55秒末态和600／1200／1800／2400／3000／3300tick的选择运行状态、状态系统及特殊系统精确。只省略跨局runId与提示文本时间，并归一支援回执中UUID部分，其他字段不归一。另在所有计时完成后用原生设置切到键盘操作，实测低档恢复、D移动、松键及Escape暂停；这段不计入性能。

## 功能和画面

- 18英雄均合法获取和施放，六组各三个时刻共18个同状态切档检查；低档十组特效render调用计数不增加，泛光／实时阴影／接触／折射关闭，native与完整动作保持。
- 六组英雄分别高／低运行180固定步，保存完整原始对照；除跨新局身份外的选择状态精确，低档英雄展示事件队列为0。
- 六类危险预警实际画面、原数据不变、过期清除通过；独立真实WebGL材质检查覆盖10个投影，使用原贴图，没有几何提示物。五张现有地图检查低档环境粒子为0及危险投影，保留高档恢复对照。
- 低／中／高各一次真实WebGL丢失与恢复，epoch依次0→1→2→3，记录的战斗状态保持。低档恢复需要一次现有“重试”，详见下文，不能写成全程无异常自动恢复。
- 三尺寸1440×900、980×700、390×844的实际设置操作及布局检查通过；另验证低档保存、旧中档迁移、自定义保留、全新桌面／粗指针高档默认。
- 最终构建画面与所有保留失败图共${visual.images}张已查看。最终11对高→低→高恢复画布RGB逐像素一致；此前R5的6对也保留。高／低画质差异统计如实保留。正式R6、设置及计时页面／控制台错误均为0，但readiness中的超时单列，未被这个计数掩盖。
- 1758回归全部通过，新增5项；既有测试未修改，类型与数据文档检查通过。全量回归在当前工作区执行；浏览器使用冻结候选，economic-egg他线修改不进入候选。早期失败日志保留。

## 保留的异常与边界

functional-r1受本机沙箱网络限制；r2／r3／r4在原有着色器等待阶段失败。独立旧中档与候选启动都曾首次通过，R5首次超时后正常重试成功，最终R6首次启动成功，因此不能据此认定超时只来自多次刷新或已定位根因。两版诊断中初始同场景均1339个网格／539个已有程序，仍不构成所有系统条件一致的因果证明。

R6低档实际上下文恢复时，场景编译等待约85.33秒后返回超时；只读检查时已无未完成程序，时间3秒／tick180保持。保存异常画面和诊断后，补充脚本点击现有重试按钮，主检查继续并完成状态核对；没有提高或绕过游戏超时。中／高档恢复另行记录。加载稳定性保留给V01，不算本次修复。

R5六组切档／画面检查已完成，之后独立新局的状态比较首处差异为支援回执的随机UUID。旧断言输出截断，不用于证明完整状态；报告仍失败。R6保存完整原始成对状态后，仅归一身份并全部通过。早期纹理包装和旧测试模拟view兼容问题已在后续候选修正；旧日志、候选及权限失败不改标。

715个既有src/test文件中695个逐字节保持，20个旧生产文件改变，新增2个生产文件及1个测试文件。417个最终生产输入中395个与已接受中档冻结输入精确相同，其他工作流economic-egg修改排除。最终主JS SHA-256：\`${s.main.sha256}\`。本地预览：\`preview/performance-d02-low-20261021-candidate-r3/\`，服务端口4465。

300／4∶4∶1、五图、模拟经济和存档延期保持。未替换Current、提交、推送、在线发布或合入独立特殊玩法分支。V01–V04、人类试玩、物理设备与整体MVP验收继续开放。
`);
const t=board.tasks.find(t=>t.id==='D02');t.status='已完成';t.updated='2026-10-21';t.result=`用户批准的低／中／高三档已本地完成，默认高；低档关闭战斗装饰与后处理，只留原贴图静态危险投影，无几何体提示。22生产文件（20旧+2新）；1758回归、类型/数据、18英雄、六组固定步状态对照、五图、三档实际WebGL恢复、保存/自定义/粗指针默认及三尺寸通过。3对正常无锁血首关55秒，中位帧间隔汇总${fmt(full.medianFrameIntervalMs)}→${fmt(low.medianFrameIntervalMs)}ms，${faster}/3更快，非全内容60FPS。低档恢复一次原生重试及早期着色器超时/身份断言/权限与夹具失败保留；加载稳定性仍V01。D03未开始。`;t.evidence=unique([...t.evidence,path.basename(doc),'../../'+qa]);
for(const id of t.auditIds){const row=board.auditRows.find(r=>r.id===id);row.previousReview=row.currentReview;row.currentReview+=' 2026-10-21 D02补充：按用户要求完成低/中/高三档，默认高；低档完全关闭战斗装饰/后处理并仅保留原贴图危险投影，保留模型与完整动作。未新增屏外停更，原高档成本和V01–V04边界不关闭。';row.reviewedAt='2026-10-21';row.reviewEvidence=unique([...row.reviewEvidence,doc,qa]);}
const v01=board.tasks.find(t=>t.id==='V01');v01.result+=' D02三档补充中保留启动及低档上下文恢复的着色器等待超时，正常重试可继续，根因未确认；已挂接证据，未据此通过V01。';v01.evidence=unique([...v01.evidence,path.basename(doc),'../../'+qa]);
board.revision++;board.updated='2026-10-21';board.next='D03';board.updates.push({date:'2026-10-21',tasks:['D02','V01'],change:t.result+' 完成44/52、剩余8项。',evidence:[path.basename(doc),'../../'+qa]});assert.equal(board.tasks.filter(t=>t.status==='已完成').length,44);await write('docs/project/performance-board.json',board);
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md',`## D02 低／中／高三档补完 · 2026-10-21

- 用户批准低档关闭特效、只留最简危险范围且禁止几何体提示。22生产文件（20旧+2新）本地完成，记录${doc}，证据${qa}；52项完成44、剩余8，下一项D03未开始。
- 低档跳过十组战斗特效计算，关闭弹体/光束/命中/爆炸/轨迹/环境粒子/额外出生死亡与后处理，只留原贴图静态地形投影；模型/材质/完整动作/实际拦截机/血条/交互及伤害、轨迹结算、队列、RNG保持。无新增球体/圆环/方框等几何提示，原碰撞规则保持。
- 三档native/完整动作，新桌面和粗指针默认高；已有自定义、旧中档精确迁移、低档保存通过。1758回归、类型/数据、18英雄、六组180步高低状态对照、五图、三档实际WebGL恢复、三尺寸与原生键盘通过；${visual.images}图已查看。
- 3对正常无锁血简单首关各55秒，3–55秒${full.steadyFrames+low.steadyFrames}帧，中位帧间隔汇总${fmt(full.medianFrameIntervalMs)}→${fmt(low.medianFrameIntervalMs)}ms，${faster}/3较快；非全内容60FPS。此前中档GPU结果另列，不混作本次三档测量。
- 启动着色器超时、低档恢复超时后一次原生重试、R5跨局身份断言及早期纹理/模拟view/权限失败保留；最终R6首次启动成功，页面/控制台错误0不掩盖readiness异常。加载稳定性仍V01，未提高超时或宣称根因已定位。
- 715既有文件695未改，既有测试未改；417生产输入中395与已接受中档冻结输入精确，排除economic-egg他线。主JS ${s.main.sha256}，预览preview/performance-d02-low-20261021-candidate-r3/（4465）。未替换Current、提交/推送/发布；300/4∶4∶1、五图、经济、存档延期、特殊分支与V01–V04/MVP边界保持。

`+agents);
console.log(JSON.stringify({doc,qa,revision:board.revision,completed:44,pending:8,next:board.next,main:s.main}));


