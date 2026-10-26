import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed,['src/ui/starship/native.css']);assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const catalogue=await read(base+'/catalogue-current.json'),current=await read(base+'/build.json'),inputHashes=new Map(current.inputs.map(x=>[x.file,x.sha256]));
const runs=[],effective=new Map();
for(const run of ['ui-interactions-r4','ui-interactions-r5','ui-interactions-r6']){
 const root=base+'/'+run,r=await read(root+'/report.json'),v=await read(root+'/visual-review.json'),reviews=new Map(v.rows.map(x=>[x.id,x]));
 assert.equal(r.complete,true);assert.equal(r.profileClosed,true);assert.equal(r.errors.length,0);
 const differences=r.build.inputs.filter(x=>inputHashes.get(x.file)!==x.sha256).map(x=>x.file);
 assert.ok(differences.every(x=>['tools/t01/static-runtime.ts','tools/t01/entry.ts'].includes(x)));
 for(const row of v.rows)for(const image of row.images)assert.equal(sha(await fs.readFile(root+'/'+image.file)),image.sha256);
 runs.push({run,evidence:root+'/report.json',rows:r.rows.length,counts:r.rows.reduce((a,x)=>(a[x.status]=(a[x.status]??0)+1,a),{}),reviewed:v.rows.length,changedToolInputs:differences,productionInputsIdentical:true});
 for(const [index,row]of r.rows.entries())effective.set(row.id,{id:row.id,run,index:index+1,status:row.status,reviewed:reviews.has(row.id),review:reviews.get(row.id)??null});
}
const rows=[...effective.values()];assert.equal(rows.length,326);assert.ok(rows.every(x=>x.status==='captured'));
const ui6=await read(base+'/ui-interactions-r6/report.json'),scrolls=ui6.rows.flatMap(r=>r.viewports.flatMap(v=>v.scrolls));assert.equal(scrolls.length,75);assert.ok(scrolls.every(s=>s.status==='reached-bottom'));
const offline=await read(base+'/offline-qa-r8/report.json');assert.equal(offline.pass,true);assert.equal(offline.profileClosed,true);assert.equal(offline.errors.length,0);assert.equal(offline.http.length,0);assert.deepEqual(offline.modes.map(x=>x.checks.length),[10,6]);
assert.ok(offline.downloads.every(d=>d.state==='completed'&&d.receivedBytes===d.totalBytes&&d.totalBytes>0));
const result={date:new Date().toISOString(),baseline:{files:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},catalogue:{dynamic:catalogue.dynamic.length,static:catalogue.static.length},
 interactions:{runs,effectiveRows:rows,uniqueCaptured:rows.length,latestReviewed:rows.filter(x=>x.reviewed).length,latestPendingReview:rows.filter(x=>!x.reviewed).length,otherSixPriorEvidence:base+'/ui-interactions-r2/visual-review.json',otherSixCurrentCompatibility:'Prior individual execution/review retained; source mapping must be checked before final reuse. Not silently included in the 326 current mapped rows.',scrollRetest:{cases:15,scrollContainers:scrolls.length,allReachedBottom:true,evidence:base+'/ui-interactions-r6/report.json'},causes:['9项决策详情测试夹具仍找旧详情按钮；改用原生翻面入口。','2项精英详情测试未走原生分页；夹具使用实际席位及翻页。','9项暂停背包测试选中了底层暂停页；改为当前可见舰装根节点。','15项竖屏手势落在滚动条而非内容；按clientWidth选择实际内容坐标后全部到尾。','旧跨尺寸初始截图在浏览器布局绘制稳定前采样；补等绘制并清除旧焦点/滚动，仅重拍受影响项。'],oldFailuresPreserved:true,allVisualPassed:false},
 offline:{build:base+'/offline-r5/build.json',evidence:base+'/offline-qa-r8/report.json',dynamicChecks:10,staticChecks:6,errors:0,http:0,downloads:offline.downloads.map(x=>({name:x.suggestedFilename,bytes:x.totalBytes,state:x.state})),controlsPassed:true,delivered:false,limitations:'Control/lifecycle checks are bounded and do not establish all catalogue entries visually pass.',downloadCause:{evidence:base+'/download-probe-r3/report.json',cause:'Windows CDP下载目录混用斜杠导致Chrome实际下载取消。独立原生复现中仅混用路径失败，规范本机路径成功；测试下载目录改path.join。旧noDefaults解释不充分，保留原失败。'},recordCause:{before:base+'/tool-controls-probe-r1/report.json',after:base+'/tool-controls-probe-r2/report.json',cause:'检测备注失焦的change冒泡至游戏弹窗，父级重绘在pointerdown/up之间替换工具，导致click丢失。仅检测工具隔离input/change后原生点击与实际离线导出通过。'}},
 storage:{relocation:base+'/ui-evidence-relocation-r1.json',cleanup:[base+'/profile-cleanup-20261025-r10.json',base+'/profile-cleanup-20261025-r11.json'],policy:'原截图、失败、日志、下载及必要旧包保持。关闭UI截图目录逐文件SHA迁移到专用可写卷，原路径保留目录链接；新双HTML及周期截图写同一专用目录。'},
 dynamic:{nextRun:'card-cycles-r4',selection:base+'/card-cycles-r4-selection.json',scope:'66项支援效果按事件加密帧，已启动；结果不预判。全部动态逐项完整周期仍未完成。'},pendingUI:['菜单战斗条隐藏提议未获确认、未采用','level0/level1中文等级提议未获确认、未采用'],coverageComplete:false,commit:false,push:false,publish:false};
const file=base+'/progress-20261025-r7.json';await fs.writeFile(file,JSON.stringify(result,null,2));
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,185);const task=board.tasks.find(t=>t.id==='T01');board.revision=186;board.updated='2026-10-25';board.next='T01';task.status='进行中';task.updated=board.updated;
task.result='动态/静态离线双HTML控制验证10+6项通过，实际下载164869/1386字节、刷新隔离、HTTP与页面错误0；修复检测工具备注冒泡重绘丢点击，下载失败定位到测试Windows混用路径。326项界面按r4/r5/r6逐项映射均完成三尺寸采集，最新'+result.interactions.latestReviewed+'项逐图复核，其余继续；15项竖屏滚动75个容器均到尾。旧20失败及18待查保留，由测试夹具/根节点/手势修正后复采。66项支援周期加密帧启动，全量动态与完整视觉验收未完。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineControlsPassed:true,offlineDelivered:false,boardRevision:186});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 离线控制修复与界面复测（看板186）\n\n'+task.result+'\n\n840基线中839与Current保持，唯一正式修改仍为用户批准的装备槽定位。重复项按最新有效记录映射，不重复计数，采集、已看与通过分开。6条更早的三尺寸交互记录另列，最终复用前仍核对输入。进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 离线控制修复与界面复测 · 2026-10-25\n\n- '+task.result+'\n- 840基线839及Current保持，唯一正式修改为已批准装备槽定位；菜单战斗条和英文等级提议仍待答，未采用。未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:186,captured:rows.length,latestReviewed:result.interactions.latestReviewed,offlineChecks:16,changed}));
