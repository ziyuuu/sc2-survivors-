/** Records this local implementation only; never commits, deploys or accepts device performance. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const root='reports/local/auto-combat-20261106',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=read('dist/auto-combat-1.2-20261106/candidate/web-release.json');
const baseline=read(root+'/baseline.json');
const files=[];function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+d.name;if(d.isDirectory())walk(p);else files.push(p);}}walk('src');
const changed=files.filter(p=>sha(p)!==baseline.hashes[p]),hashes=Object.fromEntries(changed.map(p=>[p,{before:baseline.hashes[p]??null,after:sha(p)}]));
const summary=p=>{const s=fs.readFileSync(p,'utf8');const get=k=>Number(s.match(new RegExp('(?:ℹ|#) '+k+' (\\d+)'))?.[1]);if(!get('tests')||get('fail')!==0)throw Error('Incomplete test log: '+p);return {tests:get('tests'),passed:get('pass'),failed:get('fail')};};
const diagnostic=read(root+'/browser/build.json');
const tutorials=['terran','zerg','protoss'].map(r=>{const a=read(root+'/short-browser/'+r+'/result.json');if(!a.passed||a.build.sha256!==diagnostic.sha256)throw Error('Tutorial code is not final: '+r);return {race:r,reportedAppBuildId:a.build.appBuildId,finalAppBuildId:release.appBuildId,verifiedSameDiagnosticCodeSHA:diagnostic.sha256,passed:a.passed,clicks:a.clicks.length,assistance:a.assistance,errors:a.errors};});
const browser=read(root+'/browser.json'),field=read(root+'/field.json');if(!browser.passed||field.rows.length!==3||field.rows.some(r=>!r.passed))throw Error('Browser checks incomplete');
const performance=[];
for(const [beforeFile,afterFile] of [['perf-before','perf-final'],['campaign-before','campaign-after']]){
 const before=read(root+'/'+beforeFile+'.json'),after=read(root+'/'+afterFile+'.json');
 for(let i=0;i<before.rows.length;i++){const a=before.rows[i],b=after.rows[i];performance.push({scene:b.scene,race:b.race,before:{p50:a.p50,p95:a.p95,runs:a.runs},after:{p50:b.p50,p95:b.p95,runs:b.runs},p95ChangePercent:100*(b.p95/a.p95-1)});}
}
const report={date:'2026-11-06',task:'AUTO-1.2',status:'Implemented locally; finite functional checks passed. Performance results and unaccepted device/user experience are separate.',branch:'体积优化版',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:release.appBuildId,applicationVersion:'1.2.0-local.1',rulesId:'mvp-1.0',runSchema:26,output:'dist/auto-combat-1.2-20261106/candidate',sourceHashes:hashes,
 decisions:['Manual move/mode/ability constraints stay authoritative; siege requires manual unsiege.','No additional ordinary melee speed, damage/cooldown/reward changes, new units, UI layout or automatic-combat switch.','Only fresh ordinary hellion/viking/thor/lurker entities have automatic mode provenance; manual family lock persists. Legacy missing provenance is preserved.','Automatic modes compare conservative local output after transform cost, require 25% advantage and one second hold; move/landing illegality bypasses ordinary holding.','Exact fire commitments support deterministic ordinary defenses; unknown special absorption earns zero confidence. Existing attacks still settle exactly once.'],
 validation:{full:summary(root+'/full-complete.log'),finalAbilities:summary(root+'/abilities-final.log'),finalTargeted:summary(root+'/final-targeted.log'),typecheck:'passed in final Web build',docsData:'generated',docsCheck:'passed',browser,tutorials,field,modes:read(root+'/modes.json'),contactBefore:read(root+'/contact-before.json'),contactAfter:read(root+'/contact-after.json'),performance},
 findings:[{id:'AUTO-1.2-PERF-01',owner:'AUTO-1.2',status:'measured; remaining cost disclosed',detail:'Initial dense p95 exceeded investigation threshold. Profiles and decision timings identified repeated threat/mode/planning/defense queries; cached threat/mode checks, conservative kill screen and cheap lifecycle cleanup reduce dense final increases to about 3–4%. Endless round 4 still costs about 26–34% (roughly +0.8–0.9 ms p95); extra decisions/path allocation and changed combat populations remain. No fixed steps, attacks or backlog dropped. This is not device FPS acceptance.'},{id:'AUTO-1.2-CONTACT-01',owner:'AUTO-1.2',status:'explicit scope limit',detail:'Eight mixed-size melee around two adjacent small targets saturate contact positions: seven attackers output in both baselines, with a different waiting member. A free slot is required; neither all-unit contact nor universal time-to-first-hit improvement is claimed.'}],
 resolved:['Stationary blocked rear members wrongly treated as moving fire; movement intent and actual movement separated.','Crowded slot block cache preserved while global reservations are shared.','Storm score originally subtracted armor although actual storm penetrates armor; corrected and high-armor target regression passed.','Restricted child-process launches failed with EPERM; approved local test/build/browser executions reran successfully.','Initial campaign baseline used foreign FlatTerrain class identity; corrected to matching source class and sandbox isolation before comparison.'],
 limits:['Synthetic fixed-seed scenes and finite normal-clock renderer cases; not natural long campaign or balance acceptance.','Browser phones are emulated; no physical mobile or user acceptance.','Shared checkout includes existing tutorial/endless/player-feedback work; only listed source changes belong to this batch.','Areas credit only currently covered authoritative receipts; unknown heroes/elites/shared absorption are conservative zero, not full predictive coverage.','Automatic-mode benefit comparison is four bounded cases, not a promise of optimal behavior in every battle.'],
 delivery:{implemented:true,localBuild:true,committed:false,pushed:false,deployed:false,published:false,humanAccepted:false},
 retention:{keep:['concise report and implementation document','current independent packed candidate','source/tests/reproduction tools','baseline reconstruction patch'],remove:['temporary logs/screenshots/profiles/synthetic saves','superseded original Web output and test diagnostic bundle','duplicated baseline source after reconstruction patch is verified']}};
fs.writeFileSync('reports/qa/auto-combat-implementation-20261106.json',JSON.stringify(report,null,2)+'\n');
const pct=x=>(x>=0?'+':'')+x.toFixed(1)+'%',ms=x=>x.toFixed(3),table=performance.map(p=>`| ${p.scene} / ${p.race} | ${ms(p.before.p95)} | ${ms(p.after.p95)} | ${pct(p.p95ChangePercent)} |`).join('\n');
const doc=`# 1.2 自动战斗本地实现

2026-11-06，任务 AUTO-1.2。用户授权「请根据1.2落地方案，完成1.2的落地」。A/B/C 已接入本地源码并生成独立候选；功能验证与性能结果分别记录。未提交、推送、部署、发布或取得用户/物理设备验收。

候选 **1.2.0-local.1**，appBuildId **${release.appBuildId}**。目录 \`dist/auto-combat-1.2-20261106/candidate\`。分支体积优化版，HEAD 6510fb2；共享工作区中的教学、无尽及玩家反馈未提交成果保持。rulesId mvp-1.0、Run schema26 不变。

## 实现结果

- A：每成员移动意图保留至实际到位；坦克架炮不被移动覆盖，须原时长手动收炮。远近战职责先分层，同层再按威胁、有效位置与距离选敌。跨目标共享攻击位置，绕行实际终点回写预留；单次最多两个入围目标寻路、每固定步最多八次新搜索，原2048节点边界保持。无位置时换目标或等待，未有效输出且无手动命令的友军可短距让路。普通近战没有额外加速。
- B：独立 tactics 模块读取真实弹丸、英雄/子机包及原范围收据，区分在途、前摇与接敌贡献。两秒离散窗口与真实逐发护甲/护盾纯函数共用；未知特殊吸收、未来随机暴击及未选择弹跳不预支。软计划不会让全军停火；真实在途失效即释放。真实结算次序、RNG、消耗、伤害与奖励仍走原执行器。
- C：医疗按有效缺口与已有持续治疗分配；风暴按有效覆盖生命/护盾选择中心，沿用实际穿甲规则；既有治疗、护盾、风暴重叠保护与支付保留。恶火、维京、雷神、潜伏者使用变形成本后的收益判断，25%优势与至少1秒保持；手动族系命令持续接管，维京落点/空中威胁及移动优先。四组12秒对照均有真实输出收益且各切换一次。坦克不参加自动模式选择。
- 航母只计真实子机包；任务、遭遇、临时体与召唤不纳入普通小队接管。覆盖当前30个普通族系，原英雄/精英特例保留。新增实体 autoMode 来源和时间随原 entities 保存并校验；旧档缺省保守保留，计划/路径/预留恢复后重建。

没有新增或改版玩家界面。既有模式按钮从实际/已接受模式计算下一动作，保持原标签与布局；教学源码和已批准原生入口未改。

## 验证

- 完整回归 ${report.validation.full.passed} 项通过；最后风暴算术修正及治疗/支持 ${report.validation.finalAbilities.passed} 项定向通过；类型检查和数据参考生成/核对通过。详见机器记录中的版本与范围，定向重复不叠加为独立总数。
- AC-01至AC-10：尾队命令、架炮恢复、职责、跨目标占位、逐发算术1e-6差分、失效弹丸、富余火力、治疗/技能支付、四类自动模式、临时体/航母、旧档与恢复都有对应测试；原命令、碰撞、任务、奖励、暂停与多页事务沿用本轮完整回归。
- AC-11：三族真实HUD点击完成两段教学及同件装备安装，各${tutorials.map(t=>t.clicks).join('/')}次点击，有限固定步加速；没有注入伤害、资源或强杀。不是正常时钟教学录屏或人类认可。
- 真实Chrome IndexedDB三槽轮换、写失败保持原槽位、页面刷新、模式手动锁定、派生计划清理通过。三种视口，模拟输入，不是物理手机。
- 三族完整渲染器各12秒正常时钟：在开局小队附近放置固定敌方夹具，原生战斗实际输出、保存通过；无直接伤害/推进时间注入。不是自然通关。
- 接敌六组修复前后对照：墙角、不可达目标、三种体型穿友军阵型均能真实输出，墙体重叠记录为0。相邻两小目标的8名混合体型场景前后均7名输出，等待者改变；不宣称所有拥挤场景都更快或所有成员同时接敌。

## 性能与尚未接受的范围

同机顺序执行、每场景重复三次；mixed 为24友军/48敌军、360步，first/endless4为1200步的隔离规则场景（无尽由合成过关状态进入第4轮，非自然养成）。没有浏览器/GPU并发测量。p50、实际伤害、决策/寻路次数、空闲步数和目标切换详见机器记录；这里仅列模拟p95毫秒。

| 场景 / 种族 | 改前 | 改后 | 增幅 |
| --- | ---: | ---: | ---: |
${table}

AUTO-1.2-PERF-01：早期密集场景超10%调查门槛，已调查重复决策/威胁/模式/防御查询并收敛，最终密集场景约增加3%–4%。无尽第4轮仍增加约26%–34%、绝对约0.8–0.9ms；更多计划/路径与战场存活构成变化均参与结果，不能当作严格逐帧等价性能对照。保留此开销和用户/真机待验，不宣布整体FPS达标，也未少结算或丢积压。

## 文件与复现

修改既有 simulation 文件9个，新增 tactics八模块及 damage-packet 纯算术。具体文件和前后SHA见[简要QA](../../reports/qa/auto-combat-implementation-20261106.json)。

- \`test/auto-combat.test.ts\`：18项专项，含30族系循环。
- \`tools/check-auto-combat-contact.mts\`、\`check-auto-combat-modes.mts\`、\`measure-auto-combat.mts\`：有限接敌、变形及性能对照。
- \`tools/qa-auto-combat-20261106.mjs\`、\`qa-auto-combat-field.mjs\`：HUD/实际存储和正常时钟渲染结算。
- 教学工具支持 \`SC2_TUTORIAL_WORK_ROOT\`、\`SC2_TUTORIAL_DIST_ROOT\`、\`SC2_TUTORIAL_VERSION\`，本批分别指向 reports/local/auto-combat-20261106、dist/auto-combat-1.2-20261106、1.2.0-local.1；不传时原1.1路径不变。
- 基线复建补丁 \`reports/qa/auto-combat-baseline-20261106.patch\` 记录当前源码到本轮前源码的差异；在隔离副本反向应用后作为 baseline-src 输入，不改正在工作的主目录。

下一步：用户试玩核对命令/职责/模式取舍，并针对无尽额外CPU开销继续定向评估；物理设备、长局体验、合流提交和发布分别处理，不从本地实现推断授权。
`;
fs.writeFileSync('docs/project/V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md',doc);
const board=read('docs/project/performance-board.json'),task=board.tasks.find(t=>t.id==='AUTO-1.2');
task.status='已完成';task.problem=task.problem.replace('允许与1.1并行，本轮仅设计。','已按用户授权完成本地实现；性能、真机/用户验收与发布分别记录。');task.result=`A/B/C本地实现和候选1.2.0-local.1／${release.appBuildId.slice(0,12)}完成；${report.validation.full.passed}完整回归、最终${report.validation.finalAbilities.passed}技能定向、类型/数据、三族教学与真实IndexedDB/正常时钟渲染通过。密集模拟p95增加约3%–4%，无尽第4轮仍增加约26%–34%，不代表FPS或真机达标。未提交、推送、部署或发布。`;
task.next='试玩核对命令/火力/模式体验，跟进AUTO-1.2-PERF-01无尽额外CPU开销；真机与发布另行处理。';task.auditIds=[...new Set([...task.auditIds,'AUTO-1.2-PERF-01','AUTO-1.2-CONTACT-01'])];task.evidence=['V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md','../../reports/qa/auto-combat-implementation-20261106.json',...task.evidence];task.implementationComplete=true;task.humanAccepted=false;task.updated='2026-11-06';
board.updates.push({date:'2026-11-06',tasks:['AUTO-1.2'],change:task.result,evidence:task.evidence.slice(0,2)});board.updated='2026-11-06';board.revision++;for(const finding of report.findings)board.auditRows.push({id:finding.id,title:finding.detail,sourceCategory:'current_mechanism_or_candidate',sourceExecution:'finite_local_measurement',sourceIntegration:'included_in_local_candidate',tasks:['AUTO-1.2'],currentReview:finding.detail,reviewedAt:'2026-11-06',reviewStatus:'保留限制',reviewEvidence:['reports/qa/auto-combat-implementation-20261106.json'],followUpTasks:['AUTO-1.2']});fs.writeFileSync('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');
const entry='2026-11-06 [1.2 自动战斗本地实现](V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md)：命令/职责/位置/火力、技能与四族系自动模式已接入，候选'+release.appBuildId.slice(0,12)+'；'+report.validation.full.passed+'回归及三族教学/保存通过。无尽模拟p95额外开销约26%–34%明确保留，用户/真机未验收；未提交推送发布。';
const nav='docs/project/README.md';fs.writeFileSync(nav,fs.readFileSync(nav,'utf8').replace(/2026-11-06 \[1\.2 自动战斗落地方案\][^\n]+/,entry));
const handoff='docs/project/MVP_1_0_HANDOFF_20261029.md';fs.writeFileSync(handoff,fs.readFileSync(handoff,'utf8').replace(/2026-11-06 \[1\.2 自动战斗落地方案\][^\n]+/,entry));
const plan='docs/project/V1_2_AUTO_COMBAT_PLAN_20261106.md';fs.writeFileSync(plan,'> 2026-11-06后续：用户已授权并完成本地实现，见[实现与验证](V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md)。以下保留实施前方案，旧“尚未实现”描述仅属当时时点。\n\n'+fs.readFileSync(plan,'utf8'));
const roadmap='docs/project/V1X_ROADMAP_20261104.md';fs.writeFileSync(roadmap,fs.readFileSync(roadmap,'utf8').replace(/2026-11-06：\[落地方案\][^\n]+/,'2026-11-06：[本地实现与验证](V1_2_AUTO_COMBAT_IMPLEMENTATION_20261106.md)已完成，候选1.2.0-local.1，命令/接敌、火力、技能/模式/召唤三批已接入。保留无尽额外CPU开销、用户/物理设备未验收及未发布边界；原[落地方案](V1_2_AUTO_COMBAT_PLAN_20261106.md)和[调研](V1_2_AUTO_COMBAT_RESEARCH_20261105.md)作来源。'));
let patch='';for(const p of changed.filter(p=>baseline.hashes[p])){const r=spawnSync('git',['-c','core.autocrlf=false','diff','--no-index','--',root+'/baseline-src/'+p.slice(4),p],{encoding:'utf8',maxBuffer:5e6});if(r.status!==0&&r.status!==1)throw Error(r.stderr);patch+=r.stdout.replaceAll('a/'+root+'/baseline-src/','a/src/');}
fs.writeFileSync('reports/qa/auto-combat-baseline-20261106.patch',patch);
execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'inherit'});console.log(JSON.stringify({build:release.appBuildId,changedSource:changed.length,tests:report.validation.full.passed}));
