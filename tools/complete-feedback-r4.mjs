import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base='reports/local/feedback-r4-20261022',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const qaNames=['qa-interactions-r9','qa-battle-r4','qa-hordes-r3','qa-production-r2','qa-touch-r2'],qa=[];
for(const name of qaNames){const data=await read(base+'/'+name+'/result.json');assert.ok(data.pass===true||data.records?.some(r=>r.name==='final'&&r.pass===true),name);assert.equal(data.errors.length,0,name);qa.push({name,path:base+'/'+name+'/result.json',records:data.records.length,screens:(await fs.readdir(base+'/'+name+'/screens')).filter(f=>f.endsWith('.png')).length,pass:true});}
const v=await read(base+'/verification.json');assert.ok(v.pass);const full=await fs.readFile(base+'/full-regression-final-r2.log','utf8');assert.match(full,/pass 2171/);assert.match(full,/fail 0/);for(const name of qaNames){const r=await read(base+'/review/'+name+'/index.json').catch(()=>null);if(['qa-battle-r4'].includes(name))assert.ok(r?.reviewed);else if(name==='qa-interactions-r9')assert.ok((await read(base+'/review/qa-interactions-r9-qa-battle-r2/index.json')).reviewed);else assert.ok(r?.reviewed,name);}
const h=await read(base+'/qa-hordes-r3/result.json'),archive=await read(base+'/archive-r1-plan.json'),screens=qa.reduce((n,r)=>n+r.screens,0);
const evidence={schema:1,date:'2026-10-22',pass:true,scope:'User-approved fourth feedback fixes on current main: interaction/equipment/corrupt first, then event and horde pacing. Local engineering verification, no release or natural campaign/balance acceptance.',plan:'docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md',source:v,tests:{complete:2171,passed:2171,failed:0,new:32,log:base+'/full-regression-final-r2.log',typecheck:base+'/typecheck-final-r2.log',dataCheck:base+'/docs-check-final-r2.log'},browser:qa,screensReviewed:screens,hordes:h.records.map(r=>({kind:r.name,stage:r.stage,unlockStage:r.unlockStage,total:r.last.spawned,limit:r.limit,pulse:r.pulse,seconds:r.last.until-r.last.started,peak:r.peak})),recovery:{evidence:base+'/qa-battle-r4/recovery-state.json',exactExcept:['paused','notice','noticeUntil'],reason:'Existing context-recovery lifecycle pauses battle and changes recovery notice; all other full snapshot fields exact.'},priorFailures:{interactions:'R1 network sandbox, R2 local server reachability; R3/R4 invalid fixture equipment IDs; R5 incorrect backpack selector; R6 real tooltip reopened after full detail (fixed in final R2); R7 immediate native claim wrongly expected modal; R8 native flip selector mismatch; R9 passed.',battle:'R1 sampled before simulation readiness; R2/R3 whole snapshot assertion included expected pause and recovery notice; R4 exact gameplay state and native portal route passed.',hordes:'R2 expected unlocking stage instead of existing practice stage 12; final R3 uses real stage 12 and records each unlocking threshold separately.',regression:'First 2170 run: 2161 pass/9 fail (7 local network permission, 2 obsolete accepted-rule assertions); final 2171 complete pass includes the added post-20-second practice isolation case.'},archive:{plan:base+'/archive-r1-plan.json',originalBytes:archive.originalBytes,compressedBytes:archive.compressedBytes,method:archive.method},remaining:['Hero stage-12 Boss candidate not implemented; G03 hero/economy/four-difficulty balance after G01/G02','U05 remaining full-flow guidance','Third/fourth visual batches, T01, D05/D06, V01–V06 and MVP closure'],unchanged:{current:true,camera:true,mouseAndTouchInput:true,performancePathsOutsideApprovedChanges:true,committed:false,pushed:false,published:false}};
await fs.writeFile('reports/qa/fun-feedback-r4-20261022.json',JSON.stringify(evidence,null,2)+'\n');
const doc=`# 第四轮反馈：交互、装备、腐化星灵与频次完成 · 2026-10-22

本轮已按批准顺序在当前 main 工作区完成：先交互、装备说明和腐化星灵，再调整虫群及整体事件频次。原镜头与鼠标／触屏操作保留。这里只关闭已批准的反馈范围；英雄第12关Boss开放仍为G03待评估候选。

## 交互和装备

- 免费特殊关门票进入真实关间补给卡牌列表，作为独立第四张免费卡；原三张普通卡及普通免费次数保留。刷新保留资格，免费领取不扣矿气、不耗普通免费次数，下一关从原“返回前线”进入；重复／过期／不合资格受保护。
- 白、绿、蓝、紫、橙五品质有不同底色、边框与品质文字，选中仍保留品质。原配装布局不重排。
- 装备新增简述和完整详情；鼠标悬停／键盘焦点看简述，点击看详情，触屏仍点按。提示不接管指针；最终修复重渲染后悬停提示盖住已打开详情的问题。
- 联阵护甲属于绿色协同班组两件套。0／1／2件实际开局分别1／1／2名陆战队员；开局总数2，非额外加2。界面现在分别显示当前穿戴件数、未激活／已激活、较高阶替代与换装预览，不再把单件描述当作生效。
- 传送门合法接近3米且通路可达时自动进入，删除旧点击进入按钮；暂停、资格变化、过期与重复使用继续阻止进入。沿用原输入模块。

## 腐化星灵

初始20只（13狂热者、7追猎者），同时最多20、累计40。活体严格低于10后等待5秒，再按合法位置补回20并受剩余累计额度约束；等于10不补。全灭优先结算，取消待补员，完成奖励只发一次。原第6关门槛、单位基础强度和资源／装备收益身份保持。

复用原生星灵折跃门建筑作为据点，保留实体占位；不是新增可拆奖励建筑。守军在附近巡逻、攻击近处普通虫族；玩家接近8米或显式主动攻击才激活对玩家战斗，远处自动索敌不误挑衅。追击限制在约18米，超出回防，保留伤势、死亡、累计出生和奖励回执。五张实际地图的建筑／20人站位及巡逻路径回归通过。

## 频次首版

| 虫群 | 解锁关 | 20秒累计上限 | 每2秒批量 |
| --- | ---: | ---: | ---: |
| 跳虫 | 4 | 150 | 15 |
| 蟑螂／刺蛇 | 6 | 110 | 11 |
| 飞龙 | 8 | 70 | 7 |
| 雷兽 | 10 | 30 | 3 |

10批在0、2、…、18秒出现；死亡不返额度，受阻／容量不足少出，不积压到后续爆发。连续4∶4∶1身份与300上限保持；被替代的降落仓守卫也占当批数量预算。

自然主事件每关只抽一次：第4–6／7–12／13–18关分别60／70／80%，合法任务／遭遇／虫群权重45／35／20；前20秒、Boss存活、高压事件和结束后15秒喘息期间不新增，关末不足完整20秒不启动，不跨关攒事件。未交战的中立据点不会永久封锁事件槽，实际交战会占用。拾取物仍独立。

酒馆倍率改为任务类别权重1.3／1.7／2.2，文案已同步。诱饵保留原概率与每关额外1遭遇／2精英／1虫群上限，同一安全窗口依次兑现，无关末爆发和跨关积攒。特殊关门票与传送门共用每局最多3次、上次第S关进入后最早S+3，未领取／未进入不扣额度，尽量避免连续同关型。

## 验证

- 32新增行为回归；最终完整2171项全通过，类型及数据文档检查通过。覆盖套装实际开局、真实门票购买／刷新／次数，传送资格，腐化40累计／全灭优先／5图／冻结返回，四类10批完整数列、频次／Boss／互斥／喘息／诱饵／特殊关共享额度，以及试玩超过20秒后仍保持隔离。
- 最终R2构建实际浏览器：五品质及简述／详情／悬停、四尺寸、原生翻面／免费门票领取／下一关进入、鼠标左右键接近与撤离回防、普通虫族受伤、三档据点可见、真实WebGL丢失／恢复、暂停后接近自动传送。恢复原流程会暂停并改提示；除此三个字段外完整战斗快照精确。
- 四类虫群用原试玩第12关、原强化编队与正常模拟各跑完整20秒；实际出生分别${h.records.map(r=>r.last.spawned).join('／')}，记录每批及峰值，合法上限由独立解锁／容量／死亡边界回归补足。受控试玩不代表自然概率或平衡。
- 正式Web与file://离线入口原生开局、鼠标左右键、设置往返通过，正式入口无试玩／调试开关；最终离线试玩启动前启用触屏模拟，摇杆真实移动与四尺寸通过。最终页面／控制台错误0、离线HTTP请求0。${screens}张最终检查图已查看。
- ${v.beforeSourceTests}个既有src/test中${v.existingUnchanged}个保持；24旧＋5新生产文件，8旧＋3新测试文件。12份镜头／输入及相机测试保护文件逐SHA保持；渲染器只新增据点绘制循环输入及导入，其余原字节保持。
- 正式／试玩Web输入498／499，离线503／504绑定；每包1909资产、1852独立资源、2975离线块，实际生产解码后逐SHA读回通过。Current SHA保持。

最终构建及证据：[JSON报告](../../reports/qa/fun-feedback-r4-20261022.json)、[冻结与绑定](../../reports/local/feedback-r4-20261022/verification.json)、[逐项批准方案](FUN_FEEDBACK_R4_PLAN_20261022.md)、[试玩入口](../../preview/feedback-r4-20261022/index.html)。

## 保留的失败和交付边界

首轮2170回归中的7项本机网络权限与2项旧规则断言失败保留，最终完整2171通过另列。交互R1–R8保留网络／夹具／选择器错误及真实提示重叠问题；战斗R1采样早于模拟就绪，R2／R3误把原恢复暂停和提示也要求不变，R4明确分列；虫群R2把第12关试玩场景误当解锁关断言，R3修正证据口径。所有原日志、截图和输入保留。

素材引用共享源，不再复制整套资源。两个旧R1离线文件归档为压缩代码／样式差异加最终R2素材载荷，可逐SHA精确重组；恢复命令在[归档清单](../../reports/local/feedback-r4-20261022/archive-r1-plan.json)。清理仅本批已关闭QA缓存，记录另见cleanup.json。

看板修订114：62项完成49、剩余13（9待办、2进行中、2暂缓）。I03反馈返修关闭；U05本轮交互说明与G03频次子项完成，整体仍进行中；下一项G01。第三／四批视觉、T01、D05／D06、最终V系列和MVP保持开放。没有自然完整战役、人类／真机、最终平衡或全内容60FPS结论；未替换Current、提交、推送或发布。
`;
await fs.writeFile('docs/project/FUN_FEEDBACK_R4_20261022.md',doc);
let plan=await fs.readFile('docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md','utf8');plan=plan.replace(/^状态：.*$/m,'状态：已按批准顺序完成本轮实现与工程验证。11点反馈逐项对账见下表；英雄第12关Boss为待评估候选，整体U05／G03及MVP验收未关闭。完成证据见[本轮记录](FUN_FEEDBACK_R4_20261022.md)。');plan=plan.split('\n').map(line=>{if(/^\| (?:[1-7]|9|10) /.test(line))return line.replace(/\| [^|]+ \|$/,'| 本轮完成 |');if(/^\| 11 /.test(line))return line.replace(/\| [^|]+ \|$/,'| 已同步看板和证据 |');return line;}).join('\n').replace('旧稿曾写裂口巡逻但当前没有可见裂口／巡逻实现，这是待补内容，不记录为已实现。','旧稿曾写裂口巡逻但当时缺少可见据点／巡逻；本轮已补齐原生建筑及实际行为，旧缺失记录保留。');await fs.writeFile('docs/project/FUN_FEEDBACK_R4_PLAN_20261022.md',plan);
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,113);board.revision=114;board.next='G01';const evidenceLinks=['FUN_FEEDBACK_R4_20261022.md','../../reports/qa/fun-feedback-r4-20261022.json'];
for(const id of ['I03','U05','G03']){const t=board.tasks.find(t=>t.id===id);t.status=id==='I03'?'已完成':'进行中';t.updated='2026-10-22';for(const e of evidenceLinks)if(!t.evidence.includes(e))t.evidence.push(e);if(id==='I03')t.result+=' 第四轮返修现已完成：单件/两件套真实开局1/1/2说明、腐化原生据点/巡逻/双方交战/有限追击与20同时40累计、接近传送和防重。2171最终完整回归与类型/数据/三档/四尺寸/实际图形恢复/原鼠标及离线模拟触屏通过，旧失败保留。';if(id==='U05')t.result='第四轮交互与装备说明已完成并核验：真实免费门票卡、五品质、套装件数/激活/替代、简述/完整详情、鼠标悬停与键盘焦点/触屏点按、接近自动传送。其余首次全流程引导、所有提示对账及用户理解性验收仍开放。';if(id==='G03')t.result='已完成用户提前批准的虫群150/110/70/30与4/6/8/10解锁、整体自然事件60/70/80%与45/35/20权重、共享安全窗口/喘息/互斥、酒馆权重/诱饵及特殊关3次/S+3。四虫群真实20秒周期与边界回归通过；这是频次首版，不是完整经济或最终平衡验收。英雄第12关Boss为待评估候选，未改英雄来源。G01/G02后的三族/四难度/装备成长与完整经济评估仍开放。';}
board.updates.push({date:'2026-10-22',tasks:['I03','U05','G03'],change:'第四轮批准范围本地完成，先交互/装备/腐化后频次；2171完整回归、类型/数据、实际浏览器三档/四尺寸/鼠标/离线模拟触屏/图形恢复通过。I03返修关闭；U05交互和G03频次子项完成，整体保留进行中。62项完成49，剩余13（9待办、2进行中、2暂缓），下一项G01；英雄12关Boss候选、T01/视觉后续/D05/最终V与MVP仍开放。原镜头和输入/Current保持，未提交/推送/发布。',evidence:evidenceLinks});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');
const intro=`## 第四轮交互、装备、腐化星灵与频次本地完成 · 2026-10-22

- 用户批准先交互／装备／腐化，再整体频次；本轮已完成。门票进入真实第四张免费卡，五品质、简述／详情／悬停及套装真实激活说明修复；联阵0／1／2件开局1／1／2名陆战队员。传送门接近3米自动进入，原镜头和鼠标／触屏不改。
- 腐化原生折跃门据点、巡逻、近虫交战、接近8米／主动攻击激活、18米有限追击回防；同时20、累计40，低于10后5秒补员，全灭优先单次奖励。虫群4／6／8／10关150／110／70／30只，20秒10批；自然主事件60／70／80%、45／35／20权重与共享窗口／喘息，酒馆／诱饵及特殊关3次／S+3已接入。
- 2171完整回归、类型／数据、五图放置、四尺寸／三档／实际WebGL恢复、普通及离线鼠标／模拟触屏通过，${screens}张最终图已查看。恢复原有暂停和提示另列，其余完整战斗状态精确。旧失败保留；非自然战役、人类／真机、最终平衡或FPS验收。
- 看板114：62项49完成，剩余13（9待办、2进行中、2暂缓），下一项G01。I03反馈返修关闭；U05和G03仅本轮子项完成，英雄第12关Boss仍候选，第三／四批视觉、T01、D05/D06与最终V/MVP开放。
- 24旧＋5新生产文件；808既有src/test中776未改，Current保持；正式/试玩Web498/499输入、1909资产及离线2975块逐SHA通过。记录docs/project/FUN_FEEDBACK_R4_20261022.md，证据reports/qa/fun-feedback-r4-20261022.json，候选preview/feedback-r4-20261022/（4484）。素材共享，旧R1离线可重组归档，清理本批关闭QA缓存；未提交／推送／替换Current／发布。

`;
await fs.writeFile('AGENTS.md',intro+await fs.readFile('AGENTS.md','utf8'));console.log(JSON.stringify({pass:true,board:114,screens,qa}));
const guardPath='docs/project/FUN_UI_MERGE_GUARD_20261022.md';let guard=await fs.readFile(guardPath,'utf8');guard=guard.replace(/^\| UI-05.*$/m,'| UI-05 | 必要交互贴近场景对象；第四轮传送门改为接近自动进入 | 传送门合法接近3米自动进入，删除旧专用点击进入按钮；其他仍需主动交互的对象按钮保留。白色虫群继续原生攻击触发，不恢复旧触发按钮 | `src/simulation/special-stages/runtime.ts`、`src/ui/hud/field-interactions.ts`；`test/fun-feedback-r4-interactions.test.ts` |');guard=guard.replace('## 独立试玩工具：保留工具，但不并入正式 HUD','第四轮新增正式UI合同：免费门票是关间独立第四张免费卡，不恢复旧横栏；五品质底色／边框／文字及装备简述／详情、悬停／焦点提示、当前件数／激活／高阶替代状态保留，原配装布局不重排。见[第四轮完成记录](FUN_FEEDBACK_R4_20261022.md)。\n\n## 独立试玩工具：保留工具，但不并入正式 HUD');await fs.writeFile(guardPath,guard);
