import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const raw='reports/local/performance-s03-l01-f03-20261019',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const verification=await read(raw+'/verification.json');assert.ok(verification.pass);
const component=await read(raw+'/components-r3/report.json'),native=await read(raw+'/native-r4/report.json'),maps=await read(raw+'/native-r3/report.json');
const src=await read(raw+'/source-verification.json'),failures=await read(raw+'/retained-failures.json');
const doc='PERFORMANCE_S03_L01_F03_20261019.md',qa='performance-s03-l01-f03-20261019.json',date='2026-10-20';
const nativeJs=native.build.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const summary={S03:'查尔seed529地堡角落旧版3/3停滞360步，修复3/3于44步合法触发；稳定障碍30次热查询的地形通行检查60→11/次。原生World单次120原始伤害调用，护甲/回血继续生效。',L01:'五图各201次有效热就绪检查的高度读取5,145,600→0；缺失/恢复判定与独立关卡状态保持，真实五图切换及WebGL恢复通过。',F03:'空技能批次每帧10次、97,280字节上传→0；扩容后空场175,104字节→0。10组前后画面逐像素一致，恢复前后画面一致；有内容批次仍正常上传。'};
const report={schemaVersion:1,taskIds:['S03','L01','F03'],started:'2026-10-19',completed:date,status:'completed-in-scope',authorization:'User explicitly authorized the proposed S03/L01/F03 batch with 开始吧.',baseline:{commit:native.build.commit,priorLocalChanges:['F05','U02'],excluded:src.excludedUnrelatedChanges},sourcePolicy:src,results:summary,verification,components:{report:raw+'/components-r3/report.json',sourceInputs:component.modes.web.build.inputs.length,baselineInputs:component.modes.baseline.build.inputs.length,output:component.modes.web.build.outputs,cache:{baseline:component.modes.baseline.cache,candidate:component.modes.web.cache},maps:{baseline:component.modes.baseline.maps,candidate:component.modes.web.maps},effects:{baseline:component.modes.baseline.effects.map(({file,pixelHash,mode,active,uploads,sustained})=>({file,pixelHash,mode,active,uploads:uploads.length,bytes:uploads.reduce((n,u)=>n+u.bytes,0),sustainedUploads:sustained?.uploads.length})),candidate:component.modes.web.effects.map(({file,pixelHash,mode,active,uploads,sustained})=>({file,pixelHash,mode,active,uploads:uploads.length,bytes:uploads.reduce((n,u)=>n+u.bytes,0),sustainedUploads:sustained?.uploads.length}))}},native:{report:raw+'/native-r4/report.json',mapReport:raw+'/native-r3/report.json',mapRunFinalStatus:'failed-later-at-overstrict-hp-assertion; five map readiness checks passed and are reused only for that scope',checks:native.checks,mapChecks:maps.checks.filter(x=>x.name.startsWith('prepared-map-')),sourceInputs:native.build.inputs.length,output:native.build.outputs,requestCancellations:{mapRun:maps.requests.length,recoveryRun:native.requests.length},errors:native.errors},regression:{tests:1662,pass:1662,fail:0,log:raw+'/full-tests-authorized.txt',typecheck:raw+'/typecheck-final.txt',dataDocs:raw+'/data-docs.txt',addedTests:7},visualReview:{componentContact:raw+'/components-r3/contact.png',componentCandidateFrames:10,baselineCandidateExactPairs:10,mainMapContact:raw+'/native-r3/contact.png',mainMapFrames:6,recoveryFrames:native.screens,notes:'Contact sheets and selected final main-game recovery frames reviewed; this is a scoped visual check, not human acceptance or a repeated five-map content audit.'},retainedFailures:failures,boundaries:{ordinaryContent60FPS:false,naturalCampaign:false,physicalInput:false,humanAcceptance:false,MVPComplete:false,currentReplaced:false,commit:false,push:false,published:false,unchanged:['300 enemy cap','4:4:1 mix','damage/economy and target selection rules','five-map assets','quality settings','save deferral']},next:'F01'};
await fs.writeFile('reports/qa/'+qa,JSON.stringify(report,null,2)+'\n');
const lines=[
'# S03／L01／F03：追踪雷、地图就绪与空技能上传',
'',
'2026-10-19 开始，2026-10-20 收尾。用户在三项合批提案后明确授权“开始吧”。本批完成三项范围内的实现与验证；[性能看板](PERFORMANCE_BOARD.html)是统一状态入口。',
'',
'## 实际改动',
'',
'- **S03**：按当前障碍几何保存稳定快照；静态障碍、建筑、主巢、扩张巢、运输舱及活动经济目标的阻挡状态或位置/半径变化时失效。路径图按快照、半径、地图边界、地形对象和关卡阶段复用。追踪雷单独使用连续线段与膨胀矩形相交检查，避免旧0.7间距抽样漏角；可见图同时遵守地形和动态建筑，保留窄路的实际半径回退。普通单位转向与移动实现未改。',
'- **L01**：从 campaignTerrain 中提取缓存的 campaignDefinition；后台就绪判定只读地图定义身份，不创建 MapTerrain 或扫描高度。每次真正开局仍创建独立地形实例，阶段与路径缓存不共享。',
'- **F03**：所有技能批次仍同步实例数量，包括清为零；仅有活动实例时才标记矩阵/颜色上传。首次出现、再次出现、扩容与上下文恢复均保留原绘制内容。',
'',
'生产源码仅四处修改和新增 mine-routing.ts，共五处。两侧均为固定 main 加此前 F05/U02；排除其他工作流的 economic-egg 修改。没有改伤害数值、经济、随机数规则、300 上限、4∶4∶1、画质或地图素材。追踪路径本身因修复卡角而改变，不能声称全部追踪位置与旧版相同。',
'',
'## 对照结果',
'',
'| 项目 | 旧版 | 修复后 |',
'| --- | --- | --- |',
'| 查尔 seed529 地堡拐角，三次追踪 | 360 步均停滞 | 均在第44步触发，逐步合法 |',
'| 稳定障碍，30次热查询地形通行检查 | 每次60次 | 每次11次（首次冷查询80次） |',
'| 五图每图201次有效热就绪检查的高度读取 | 5,145,600次 | 0次 |',
'| 空技能层，每帧实例上传 | 10次／97,280字节 | 0次／0字节 |',
'| 扩容后清空，每帧实例上传 | 10次／175,104字节 | 0次／0字节 |',
'| 首次／清空／再现／扩容／恢复画面 | 10个对照状态 | 10对图像像素完全一致 |',
'',
'空场各连续120帧旧版1,200次上传，修复后0次；有内容的蓄力/射线/护盾仍上传，实际上下文恢复重新创建的29次缓冲上传也保留。R3恢复后的蓄力图与恢复前逐像素一致。数值来自受控组件和实际WebGL调用；高度读取使用探针，附带耗时不作为无探针性能数据。没有据此换算整局FPS或宣称达到60FPS。',
'',
'## 验证与证据归属',
'',
'- 完整回归1,662/1,662；类型与数据文档检查通过。新增7项覆盖B03原角落、连续碰撞/切线、几何变化、地形阶段、运输舱/经济目标/巢生命周期、窄路及地图定义缓存/独立实例/淘汰。原8项追踪雷回归继续通过。',
'- 主游戏从原菜单进入；native-r3 的五图真实换图就绪检查和6张截图通过，随后在血量断言处失败。只复用其已完成的换图证据，不把整个r3改标通过。native-r4单独完成实际World追踪与WebGL恢复。伤害入口仅一次120，目标护甲和回血按原规则结算；不是强行要求最终HP=380。',
'- 实际WebGL恢复后地图就绪，contextEpoch增加，time/tick/RNG保持。上下文恢复暂停状态按原游戏流程处理；未宣称整个World/页面字节不变。组件10帧及主游戏五图/恢复画面做了有限视觉检查，不重开五图内容验收。',
'- 最终组件299个输入，旧版298个；主游戏439个输入。主游戏和组件的五处生产源码哈希一致，差异仅为允许的五处。',
'',
'主要证据：',
'',
`- [范围报告](../../reports/qa/${qa})`,
`- [逐项验证](../../${raw}/verification.json)`,
`- [最终组件对照](../../${raw}/components-r3/report.json)`,
`- [主游戏五图记录](../../${raw}/native-r3/report.json)`,
`- [原生追踪与恢复记录](../../${raw}/native-r4/report.json)`,
`- [源码绑定检查](../../${raw}/source-verification.json)`,
`- [完整回归](../../${raw}/full-tests-authorized.txt)`,
'',
'## 失败保留与交付边界',
'',
'首次受限完整回归为1,659项，其中7项因本机服务EACCES失败；追加3项检查后，在允许本机服务的环境完整重跑1,662项全通过。native-r1过早检查异步地图；r2误把只等待单位队列的waitForPendingAssets当作地图等待；r3最终血量断言忽略护甲/回血。原日志、截图及失败状态保留。',
'',
'组件R1/R2的恢复背景设置仅保存在renderer状态，恢复后背景变黑，两侧表现相同；R3测试场景将背景放在Scene上，验证恢复前后也一致，无游戏源码变化。R1原构建通过记录的输入重建并核对输出SHA完全相同，R2构建另存，R3使用独立目录。',
'',
`主游戏诊断入口：preview/performance-s03-l01-f03-20261019-native/（本地4436）。JS SHA-256：${nativeJs}。`,
'',
'本批不替换Current或命名HTML，不提交、推送或在线发布。自动浏览器与固定步诊断不等于自然战役、人类/物理输入或全内容性能验收；五图接受状态和存档延期保持。看板下一项为F01（治疗结束光束残留），尚未开始。',
''];
await fs.writeFile('docs/project/'+doc,lines.join('\n'));
const board=await read('docs/project/performance-board.json');board.revision++;board.updated=date;board.next='F01';
for(const task of board.tasks)if(summary[task.id]){task.status='已完成';task.updated=date;task.result=summary[task.id]+' 1662回归、类型/数据文档与范围验证通过；局部计数不代表整体FPS。';task.evidence=[...new Set([...task.evidence,doc,'../../reports/qa/'+qa])];}
board.updates.push({date,tasks:['S03','L01','F03'],change:'用户授权三项合批已完成：追踪雷角落合法绕行及缓存复用、地图就绪去重复构造、空技能上传归零。保留全部失败与原构建；1662回归通过，下一项F01尚未开始。',evidence:[doc,'../../reports/qa/'+qa]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');
const entry=`${date} S03／L01／F03 已完成：[追踪雷、地图就绪与空技能上传](project/${doc}) · [证据](../reports/qa/${qa})。原卡角修复、热就绪高度读取及空批上传归零；下一项F01尚未开始。\n\n`;
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md']){const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n')+1;await fs.writeFile(file,old.slice(0,at)+'\n'+entry+old.slice(at).trimStart());}
const agents=[`## S03／L01／F03 合批完成 · ${date}`,'',`- 用户在三项合批提案后授权“开始吧”。已完成追踪雷连续绕障/几何缓存、地图定义就绪复用和空技能批次上传修复。说明 docs/project/${doc}，证据 reports/qa/${qa}；看板下一项F01，尚未开始。`, '- 查尔seed529地堡角落旧版3/3停滞360步，修复3/3在44步合法触发；稳定障碍热查询地形检查60→11/次（冷查询80）。五图每图201次有效热检查高度读取5,145,600→0；空技能实例上传10次/97,280字节每帧→0，扩容清空后175,104→0。都是范围内操作成本，不是整体FPS收益。', '- 1662完整回归及类型/数据文档检查通过；7项新增回归。10组组件前后像素完全一致，恢复前后相同。主游戏五图切换检查复用native-r3已通过部分，r3后续忽略护甲/回血的HP断言失败保持；native-r4原始120单次伤害及实际WebGL恢复通过。沙箱EACCES、早测地图和旧恢复背景夹具均保留。', `- 主游戏JS ${nativeJs}，439编译输入，组件299；五处生产源码哈希相同，排除无关economic-egg变化。入口 preview/performance-s03-l01-f03-20261019-native/（4436）。未替换Current、提交/推送或发布；画质、五图、300/4∶4∶1、经济、伤害规则、存档延期与整体MVP边界保持。`,'',''];
await fs.writeFile('AGENTS.md',agents.join('\n')+await fs.readFile('AGENTS.md','utf8'));console.log(JSON.stringify({doc,qa,boardRevision:board.revision,next:board.next}));
