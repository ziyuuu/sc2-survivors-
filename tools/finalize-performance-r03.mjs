import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-r03-20261020',run='browser-5',doc='docs/project/PERFORMANCE_R03_20261020.md',reportFile='reports/qa/performance-r03-20261020.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const median=x=>{x=x.toSorted((a,b)=>a-b);return(x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2;};
const b=await read(root+'/'+run+'/report.json'),input=await read(root+'/input-2/report.json'),pixels=await read(root+'/'+run+'/pixels.json'),review=await read(root+'/visual-review.json');
assert.equal(b.pass,true);assert.equal(input.pass,true);assert.equal(pixels.passedRun,true);assert.equal(review.reviewed,true);assert.equal(review.run,run);
for(const name of ['tests-r3','typecheck-r3','docs-check-r2','network-recheck-r3'])assert.equal(Number(await fs.readFile(root+'/checks/'+name+'.exit','utf8')),0,name);
assert.match(await fs.readFile(root+'/checks/tests-r3.log','utf8'),/pass 1721/);
assert.deepEqual(input.variants.baseline.states,input.variants.candidate.states);
assert.deepEqual(input.variants.baseline.pointer,input.variants.candidate.pointer);
const cpu=b.scenes.map(s=>{
 const windows=['baseline','candidate'].map(v=>s.samples.filter(r=>r.variant===v).toSorted((a,b)=>a.round-b.round));
 assert.ok(windows.every(x=>x.length===6));
 for(const [i,rows]of windows.entries())for(const row of rows){assert.equal(row.worldExact,true);assert.equal(row.draws,16);assert.equal(row.preparations,i===0?16:0);}
 const values=windows.map(rows=>rows.map(r=>median(r.ms))),ms=values.map(median);
 return {name:s.name,medianMs:ms,percent:100*(1-ms[1]/ms[0]),faster:values[0].filter((v,i)=>values[1][i]<v).length,windowMedians:values};
});
const inputCpu=[['menu',2],['menu',16],['menu',64],['reset',64]].map(([kind,controls])=>{
 const rows=['baseline','candidate'].map(v=>input.samples.filter(r=>r.variant===v&&r.kind===kind&&r.controls===controls).toSorted((a,b)=>a.round-b.round));
 assert.ok(rows.every(r=>r.length===12));
 const values=rows.map(r=>r.map(x=>x.ms/x.calls)),ms=values.map(median);
 return {kind,controls,medianMs:ms,percent:100*(1-ms[1]/ms[0]),faster:values[0].filter((v,i)=>values[1][i]<v).length,windowPerCallMs:values};
});
for(const r of b.boundaries)for(const key of ['worldExact','cameraExact','attributesExact','labelsExact','sourceExact'])assert.equal(r[key],true,r.name+':'+key);
assert.equal(b.boundaries.find(r=>r.name==='decision-during-yamato-impact').preparations.second,1);
const candidate=b.build,baseline=await read('preview/performance-r02-20261020-candidate-r3/build-inputs.json'),production=candidate.inputs.filter(i=>i.file.startsWith('src/'));
const changes=production.filter(i=>baseline.inputs.find(j=>j.file===i.file)?.sha256!==i.sha256).map(i=>i.file).sort();
assert.deepEqual(changes,['src/render/scene/battle-renderer.ts','src/ui/gamepad/controller.ts','src/ui/mobile/input.ts']);
for(const file of changes)assert.equal(hash(await fs.readFile(file)),production.find(i=>i.file===file).sha256);
for(const file of changes.slice(1))assert.equal(input.build.inputs.find(i=>i.file===file).sha256,production.find(i=>i.file===file).sha256);
for(const i of candidate.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r3-web-inputs/'+i.file)),i.sha256,i.file);
for(const i of input.build.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r2-input-inputs/'+i.file)),i.sha256,i.file);
const frozen='reports/local/performance-r02-20261020/candidate-r3-web-inputs/';
for(const file of changes)assert.equal(candidate.inputs.find(i=>i.file===frozen+file).sha256,baseline.inputs.find(i=>i.file===file).sha256);
const fmt=n=>n.toFixed(5),pct=n=>n.toFixed(1),js=candidate.outputs.find(i=>i.file.endsWith('/main.js'));
const table=cpu.map(r=>`| ${r.name} | ${fmt(r.medianMs[0])} | ${fmt(r.medianMs[1])} | ${pct(r.percent)}% | ${r.faster}/6 |`).join('\n');
const inputTable=inputCpu.map(r=>`| ${r.kind==='menu'?r.controls+'控件空菜单':'重复重置'} | ${fmt(r.medianMs[0])} | ${fmt(r.medianMs[1])} | ${pct(r.percent)}% | ${r.faster}/12 |`).join('\n');
const audit={
 R08:'已优化静止战场的CPU展示准备、属性和标签提交；完整GPU绘制/阴影/接触/折射/辉光仍运行，不声称后处理已消除。活跃无步进帧仍处理插值、镜头和效果。配装原本停止战场绘制不重复计收益。',
 'UI-PAD-002':'空菜单且焦点有效时仅检查当前控件；每次仍重新定位根/顶层弹窗。首次、禁用/移除/隐藏/inert焦点或真实操作仍全量枚举，未降轮询频率；31行为对照及2/16/64控件计时通过。',
 'UI-INPUT-001':'保留每次输入清零、路线清理、指针释放，只去掉状态已相同的DOM写入和无目标preview(null)。不改主循环重置时机，不引入可能遗留按键的跨阻塞状态门；实际指针捕获/释放对照通过。'
};
const failures=[
 'browser-1沙箱拒绝本机网络及空白页localStorage，保留原报告；之后在允许本机访问的环境运行。',
 'R1浏览器先导browser-2与完整测试短时重叠，只作功能先导；正式browser-3/R1、browser-4/R2与browser-5/R3性能采样串行，不混用较好数字。',
 '代码复核发现界面暂停租约可能在paused=false时冻结大和冲击震屏；R2起在偏移非零时保留完整更新。不是已经录制的R1失败重标为通过。',
 'R2类型检查发现protected visualSerial访问错误；R3改读公开visualEvents末项序号和长度。最终构建重新完整核验，不以R2计时冒称R3结果。',
 'browser-4/R2在设置返回处遇到两个同名按钮，46对/48计时窗口已完成但整轮失败；修正脚本选中返回按钮。browser-5使用最终R3从头完成，旧失败保留。',
 'R2的震屏整页截图有10867像素差、最大167色阶，范围落在部署准备界面；其裸战场截图与同步WebGL像素均精确。整页CSS动效不作为严格画面对照，未改写原结果。',
 'R1与R2完整测试各有7项本机网络权限失败，对应3文件16项定向通过；最终R3完整1721项在允许本机服务访问时通过。',
 '暂停界面实际点击选中单位未改变选中集，固定位置切换相机模式也未改变矩阵；这些不算正向失效证据。另有选中集回调、pitch/zoom/平滑镜头与新视觉事件正向验证。'
];
const text=`# R03 暂停展示与输入小合批 · 2026-10-20

用户批准R03主项、U03的空菜单与重复重置两个子项，并随批复核A01三条审计。本批已本地实现和验证。R03已完成；U03保留战斗技能页/指针查询待办，A01整体仍未完成。50项完成34、剩余16，下一项U01尚未开始。

## 实现

- 暂停或界面决策停住的战场复用上次展示准备结果。仍每帧更新镜头，精确比较World修订/时间、视觉事件、账户/掉落、插值、资源、设置、选中对象、视口和相机矩阵；任一变化重新准备。普通活跃战斗即使本帧无固定步也保持原更新。
- GPU主场景、阴影、接触、折射、辉光和输出仍照常绘制；没有降低效果或将完整画面截图贴回。节省的是场景、模型、材质、粒子、实例和标签的重复CPU提交。配装本来停止战场绘制，不另记收益。
- 界面暂停租约可能让paused仍为false。大和冲击偏移不为零时继续走原路径，保留震屏；地图/新局/加载准备/真实WebGL恢复也使缓存失效。
- 空输入菜单先重新确定根和最上层弹窗，仅验证当前有效焦点；首次、失效或真实导航仍枚举全部控件。没有跨帧缓存DOM列表或降低轮询频率。
- 重复reset仍清空方向/按键/路线、释放指针捕获，只在状态变化时写摇杆、目标、技能页和校准DOM；没有改主循环reset时机。无目标时不再重复调用preview(null)。

生产代码仅三个文件：battle-renderer、mobile/input、gamepad/controller。没有修改模拟、经济、单位上限或画质规则。

## 局部测量

真实Chrome/AMD集显，1440×900 DPR1，原完整效果。在同页同一个World和渲染器对象上切换冻结R02的原render方法与候选方法；共享THREE、场景及GPU资源。每场景6对交替，每个窗口4帧预热后16帧取样，先取窗口中位再取6轮中位。所有计时期间World原样不变。

| 暂停场景 | 原版ms | 候选ms | 下降 | 候选较快 |
|---|---:|---:|---:|---:|
${table}

计时覆盖render方法的JS与GPU提交阻塞，不是GPU elapsed、端到端帧时或自然战斗FPS。每个16帧窗口两侧均绘制16次；源效果展示准备由16次降为0次。${cpu.filter(r=>r.percent<0).length?'有回退项，表中如实保留。':'本轮四组中位均下降，单轮波动保留。'} B03分别历史峰值18装备/181资源组合为受控掉落场景；另外三组B02战斗夹具推进120步后暂停，含300敌人、护盾风暴与航母装备效果，非本轮自然通关或同时峰值证明。

输入计时单独串行，每种12对交替，每窗1000次调用；这里是已激活手柄在空菜单中的方法成本，未换算整场收益。真实操作另以状态对照验证。

| 输入局部 | 原版ms/次 | 候选ms/次 | 下降 | 候选较快 |
|---|---:|---:|---:|---:|
${inputTable}

120次空菜单轮询，2/16/64控件的矩形和样式读取分别由240/1920/7680次降为120次；重复reset的480次DOM修改和120次空预览调用降为0，输入状态清理继续执行。

## 正确性和画面

- 最终${b.boundaries.length}对同步World/镜头/实例动态数组/标签/活动源效果对照均精确；同步WebGL像素最大差${Math.max(...b.boundaries.map(r=>r.pixels.changed))}像素、${Math.max(...b.boundaries.map(r=>r.pixels.max))}色阶。
- 覆盖修订/时间/新视觉事件、选中集、生命条、网格、特效档、减少动效、资源未就绪/恢复、后台准备、暂停/界面租约与释放。相机平滑仍变化，alpha改变两次均重算；大和冲击0.1秒时的租约保持原震屏偏移。
- 390×844、1440×900、1920×1080；实际设置中的自动画质/原画、战斗预设、动画档、字号均往返核验。实际Escape暂停/返回、I背包/关闭后同页账户和run引用保持，时间不跳变；再推进12个真实固定步核验。
- 真实WebGL丢失/恢复epoch ${b.recovery.before.epoch}→${b.recovery.after.epoch}，time/tick/RNG保持；完整World仅notice/noticeUntil归一后精确。实际冰图→查尔准备和切换后对照通过。
- 输入新旧31个状态精确，包含首次/禁用/隐藏/inert/移除焦点、多层弹窗/原生dialog、选择/滑条/返回、键盘暂停清空与恢复无旧键重放、目标取消、命令保留、校准和合成手柄断开。浏览器实际鼠标触发指针捕获并释放；不等同物理手柄/触屏验收。
- 最终完整1721项回归、类型与数据文档检查通过。${b.screens.length}张截图经${pixels.contactSheets.length}张联系表与原尺寸图核对；${pixels.comparisons.length}组截图对照（含整页及临时隐藏遮罩的裸战场）中${pixels.comparisons.filter(r=>r.changedPixels===0).length}组RGB精确，最大${Math.max(...pixels.comparisons.map(r=>r.changedPixels))}像素/${Math.max(...pixels.comparisons.map(r=>r.maxChannel))}色阶差异。${review.summary}
- 页面/控制台错误${b.errors.length}；请求取消/失败${b.requests.length}条，原始URL与原因保留于报告。自动对照不替代用户试玩。

## 失败与范围

${failures.map(s=>'- '+s).join('\n')}

${Object.entries(audit).map(([id,t])=>`- ${id}：${t}`).join('\n')}

未实施U03战斗技能页与指针查询复用、U01其余界面、U04统计/遥测、加载体验取舍。没有把缓存扩大到活跃无步进帧或删掉后处理。

## 构建

- 冻结R02最终411个生产输入，最终${candidate.inputs.length}个编译输入；诊断入口额外载入原版比较器，普通入口不包含这些诊断钩子。无关economic-egg变更继续排除。
- 最终预览：\`preview/performance-r03-20261020-candidate-r3/\`，本机4436；JS SHA-256 \`${js.sha256}\`。
- 输入验证使用R2独立入口，其两个输入生产文件与最终R3哈希相同；${input.build.inputs.length}输入和原版比较器分别归档。最终R3浏览器完整重跑，未合并旧候选为最终通过。
- [范围报告](../../${reportFile})绑定构建、源文件、运行器、回归、截图和所有先导失败。main引用仍为be9e2982944314194c6dcc9dcc535bc321749eb4。未替换Current、提交/推送或发布；300上限/4∶4∶1、五图、经济、存档延期和自然/物理/人类/全内容60FPS/MVP边界保持。
`;
await fs.writeFile(doc,text);
const evidencePaths=[doc,root+'/'+run+'/report.json',root+'/'+run+'/runner.mjs',root+'/'+run+'/pixels.json',root+'/visual-review.json',root+'/input-2/report.json',root+'/input-2/runner.mjs',
 ...['tests-r3','typecheck-r3','docs-check-r2','network-recheck-r3','tests-r2','typecheck-r2','tests','typecheck','network-recheck'].map(n=>root+'/checks/'+n+'.log'),
 ...['browser-1','browser-2','browser-3','browser-4','input-1'].map(n=>root+'/'+n+'/report.json'),
 ...b.screens.map(s=>s.file),...review.contactSheets,...candidate.outputs.map(o=>o.file),...input.build.outputs.map(o=>o.file),
 'preview/performance-r03-20261020-candidate-r3/build-inputs.json','preview/performance-r03-20261020-candidate-r2/input-build-inputs.json',
 ...changes,'tools/build-performance-r03.mjs','tools/performance-r03-runtime.ts','tools/qa-performance-r03.mjs','tools/qa-performance-r03-input.mjs','tools/review-performance-r03.py'];
const files=[];for(const file of evidencePaths){const bytes=await fs.readFile(file);files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
const report={schemaVersion:1,id:'performance-r03-20261020',status:'verified-local',source:{baseline:frozen,changes,productionInputs:production.length,build:candidate,inputBuild:input.build},cpu:{method:'Same renderer instance, prior render prototype vs candidate, six alternating pairs, 4 warmups +16 RAF calls; median of per-window medians. CPU+submission stall, not GPU elapsed or FPS.',rows:cpu,inputMethod:'Same browser isolated production Input/GamepadInput classes, 12 alternating pairs per kind, 1000 calls/window. Actual operation semantics checked independently.',inputRows:inputCpu,inputCounts:Object.fromEntries(Object.entries(input.variants).map(([k,v])=>[k,v.bySize]))},verification:{tests:1721,typecheck:true,docsCheck:true,inputStatePairs:31,inputPointer:input.variants.candidate.pointer,boundaries:b.boundaries,settings:b.settings,samePage:b.samePage,recovery:b.recovery,device:b.device,errors:b.errors,requests:b.requests},pixels,review,audit,retainedFailures:failures,limits:['U03 skill page/pointer queries and A01 remainder remain open.','Full GPU passes still execute; measured paused CPU is not natural whole-battle FPS.','No physical gamepad/touch or human acceptance; no new natural campaign.','No Current replacement, commit/push/publication; save deferral unchanged.'],artifacts:{documentation:doc,preview:'preview/performance-r03-20261020-candidate-r3/',files}};
await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
const boardFile='docs/project/performance-board.json',board=await read(boardFile),r03=board.tasks.find(t=>t.id==='R03'),u03=board.tasks.find(t=>t.id==='U03'),a01=board.tasks.find(t=>t.id==='A01');
assert.equal(r03.status,'待验证');assert.equal(u03.status,'待验证');
const evidence=['PERFORMANCE_R03_20261020.md','../../'+reportFile],range=cpu.map(r=>r.percent);
r03.status='已完成';r03.updated='2026-10-20';r03.evidence=[...new Set([...r03.evidence,...evidence])];
r03.result=`暂停静止战场复用CPU展示，仍每帧更新镜头和完整GPU绘制；四场景局部render中位下降${pct(Math.min(...range))}–${pct(Math.max(...range))}%，不是自然战斗FPS。最终${b.boundaries.length}对状态/属性/源效果、设置/三尺寸/震屏/同页账户/实际恢复及换图通过，1721回归和类型/数据通过，${b.screens.length}图已查看。活跃无步进、资源未就绪和震屏偏移保留原更新；全部失败保留。`;
u03.status='待办';u03.updated='2026-10-20';u03.evidence=[...new Set([...u03.evidence,...evidence])];
u03.result='本批完成UI-PAD-002空菜单及UI-INPUT-001重复重置：31状态/实际指针捕获释放通过；2/16/64控件每轮矩形/样式读取降为1次，重复reset仅跳过同值DOM写入且仍清零/释放。合成手柄不替代物理设备验收；UI-PAD-001战斗技能页和UI-PICK-001指针查询仍待办，整项未完成。';
for(const [id,text]of Object.entries(audit))board.auditRows.find(r=>r.id===id).currentReview='2026-10-20 R03小合批：'+text;
a01.result+=' R03补R08/UI-PAD-002/UI-INPUT-001三条当前结论：静止CPU展示/空菜单/重复DOM提交已局部验证，GPU全绘制与输入清零保持，169条整体未关闭。';a01.updated='2026-10-20';a01.evidence=[...new Set([...a01.evidence,...evidence])];
board.scenes.find(s=>s.id==='SC10').status+='；R03暂停四场景/设置/三尺寸/震屏/实际恢复核验通过，静止CPU局部下降，GPU全绘制保持';
board.next='U01';board.updated='2026-10-20';board.revision++;
board.updates.push({date:'2026-10-20',tasks:['R03','U03','A01'],change:`R03待验证→已完成；U03两子项完成后整项回待办，剩战斗技能页/指针查询。四暂停场景局部render下降${pct(Math.min(...range))}–${pct(Math.max(...range))}%，完整GPU仍绘制，非FPS；${b.boundaries.length}对状态/画面、31输入行为、真实恢复、1721回归通过。类型访问与重复返回按钮脚本失败保留，最终R3全量重核。50项完成34、剩余16，下一项U01尚未开始。`,evidence});
assert.equal(board.tasks.filter(t=>t.status==='已完成').length,34);assert.equal(board.tasks.length,50);assert.equal(board.auditRows.length,169);
await fs.writeFile(boardFile,JSON.stringify(board,null,2)+'\n');
const nav=`2026-10-20 R03小合批已完成：[暂停展示与输入优化](project/PERFORMANCE_R03_20261020.md)。静止CPU展示复用、空菜单与重复重置验证通过，GPU全绘制和输入清零保持；非自然FPS收益。50项完成34、剩余16，U03其余子项仍待办，下一项U01未开始。\n\n`;
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){const t=await fs.readFile(file,'utf8'),at=t.indexOf('\n\n');await fs.writeFile(file,t.slice(0,at+2)+nav+t.slice(at+2));}
const agents=`## R03 暂停展示与输入小合批完成 · 2026-10-20

- 用户批准R03主项、U03空菜单/重复重置两子项与A01三条复核。说明docs/project/PERFORMANCE_R03_20261020.md，证据reports/qa/performance-r03-20261020.json；50项完成34、剩余16，下一项U01未开始。U03技能页/指针查询及A01整体保持待办。
- 三处生产修改：暂停/界面决策静止战场复用CPU展示准备；空菜单仅验证当前有效焦点；重复重置只跳过同值DOM/空目标预览，清零/路线/指针释放仍执行。镜头每帧更新，插值/设置/资源/选择/地图/上下文变化失效；活跃无步进及震屏偏移仍原路径，完整GPU阴影/接触/折射/辉光继续绘制。
- 四暂停场景6对交替、每窗4预热16帧，局部render中位下降${pct(Math.min(...range))}–${pct(Math.max(...range))}%；JS加提交阻塞，不是GPUelapsed或自然FPS。120次空菜单2/16/64控件读取240/1920/7680→120，重复reset480DOM/120空预览→0。31输入状态与浏览器实际指针释放通过，合成手柄不代表物理设备。
- 最终${b.boundaries.length}对World/镜头/实例/标签/源效果精确，三尺寸/设置/大和震屏租约/同页账户/12步恢复/真实WebGL epoch${b.recovery.before.epoch}→${b.recovery.after.epoch}/冰图→查尔通过；${b.screens.length}图已查看。1721最终回归、类型与数据检查通过，错误${b.errors.length}、请求取消/失败${b.requests.length}详见报告。
- 保留R1/R2先导、网络权限失败、震屏保护复核、R2protected计数类型错误、设置返回双按钮选择器失败及整页CSS动效截图差异。最终R3改公开事件序号/长度并从头重核；未把旧构建失败改为通过。输入R2代码哈希与R3相同，证据单列。
- 最终JS ${js.sha256}，${candidate.inputs.length}编译输入/${production.length}src；冻结R02仅改3处、排除无关economic-egg。诊断入口preview/performance-r03-20261020-candidate-r3/（4436）。未替换Current、提交/推送或发布；300/4∶4∶1、五图、经济、存档延期及自然/物理/人类/全内容60FPS/MVP边界保持。

`;
await fs.writeFile('AGENTS.md',agents+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({report:reportFile,doc,revision:board.revision,completed:34,next:'U01',cpu,inputCpu,files:files.length}));
