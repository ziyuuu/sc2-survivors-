import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed,['src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css']);
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const authorization=await read(base+'/menu-level-fix-r1/authorization.json');
for(const f of authorization.files)assert.equal(sha(await fs.readFile(f.file)),f.afterSha256);
const current=await read(base+'/build.json'),catalogue=await read(base+'/catalogue-current.json'),hashes=new Map(current.inputs.map(x=>[x.file,x.sha256]));
for(const f of current.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const menuRoot='reports/local/v03-20261024/t01-menu-bar-r4',menu=await read(menuRoot+'/report.json'),menuReview=await read(menuRoot+'/visual-review.json');
assert.equal(menu.pass,true);assert.equal(menu.checks.length,12);assert.equal(menu.errors.length,0);assert.equal(menu.profileClosed,true);
assert.ok(menu.checks.every(x=>x.state.phase==='menu'&&x.state.display==='none'));
for(const x of menuReview.images)assert.equal(sha(await fs.readFile(x.file)),x.sha256);
const runs=[],effective=new Map();
for(const run of ['ui-interactions-r4','ui-interactions-r5','ui-interactions-r6','ui-interactions-r8','ui-interactions-r9','ui-interactions-r11']){
 const root=base+'/'+run,r=await read(root+'/report.json'),v=await read(root+'/visual-review.json'),reviews=new Map(v.rows.map(x=>[x.id,x]));
 assert.equal(r.complete,true);assert.equal(r.profileClosed,true);assert.equal(r.errors.length,0);
 const differences=r.build.inputs.filter(x=>hashes.get(x.file)!==x.sha256).map(x=>x.file);
 assert.ok(differences.every(x=>['tools/t01/tool.css','tools/t01/static-runtime.ts','tools/t01/entry.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css'].includes(x)));
 for(const row of v.rows)for(const image of row.images)assert.equal(sha(await fs.readFile(root+'/'+image.file)),image.sha256);
 runs.push({run,rows:r.rows.length,reviewed:v.rows.length,differences,evidence:root+'/report.json'});
 for(const [index,row]of r.rows.entries())effective.set(row.id,{id:row.id,run,index:index+1,status:row.status,review:reviews.get(row.id)??null,phases:[...new Set(row.viewports.map(x=>x.after?.fixture?.phase).filter(Boolean))]});
}
const rows=catalogue.static.map(c=>effective.get(c.id));assert.equal(rows.length,332);assert.ok(rows.every(x=>x?.status==='captured'&&x.review));
const ui11=await read(base+'/ui-interactions-r11/report.json');assert.equal(ui11.rows.length,48);
const presentations=ui11.rows.flatMap(r=>r.viewports.map(v=>({id:r.id,width:v.width,...v.initialPresentation})));
assert.equal(presentations.length,144);
assert.ok(presentations.filter(x=>x.phase==='menu').every(x=>x.topbarDisplay==='none'));
assert.ok(presentations.filter(x=>x.phase!=='menu').every(x=>x.topbarDisplay==='flex'));
assert.ok(presentations.every(x=>x.levelBadges.every(b=>!/^level\d/i.test(b.text))));
const levelBadges=presentations.flatMap(x=>x.levelBadges);assert.ok(levelBadges.some(x=>x.text==='0级'));assert.ok(levelBadges.some(x=>x.text==='1级'));
const controlRoot=base+'/tool-controls-probe-r3',control=await read(controlRoot+'/report.json');
assert.equal(control.pass,true);assert.equal(control.checks.length,6);assert.equal(control.errors.length,0);assert.equal(control.profileClosed,true);
const controlsReview={at:new Date().toISOString(),status:'reviewed',scope:'Tool controls in 3 sizes, dynamic/static, 18 full-viewport frames; not production layout or physical-device acceptance.',observation:'逐图查看动态/静态工具的顶部、标签和底部。循环及诊断锁血不再被游戏全局label样式拆行；横屏可滚到导出及计数，竖屏各控件在工具内，无水平溢出。',images:[]};
for(let n=0;n<6;n++){const file=controlRoot+'/review-'+n+'.jpg';controlsReview.images.push({file,sha256:sha(await fs.readFile(file))});}
await fs.writeFile(controlRoot+'/visual-review.json',JSON.stringify(controlsReview,null,2));
const dynamics=[];
for(const run of ['cycle-probe-r1','actions-r2','actions-r3','actions-r4','actions-r5-r2','actions-r8','card-cycles-r2','card-cycles-r3','card-cycles-r4','card-cycles-r5']){
 let r;try{r=await read(base+'/'+run+'/report.json');}catch{continue;}
 let v;try{v=await read(base+'/'+run+'/visual-review.json');}catch{v={rows:[]};}
 dynamics.push({run,captured:r.rows.filter(x=>['cycle-captured','receipt-captured'].includes(x.status)).length,failed:r.rows.filter(x=>x.status==='failed').length,reviewed:v.rows.length,evidence:base+'/'+run+'/report.json'});
}
const result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},catalogue:{dynamic:catalogue.dynamic.length,static:catalogue.static.length},
 approvedUI:{authorization:base+'/menu-level-fix-r1/authorization.json',normalMenu:{checks:12,visualReview:menuRoot+'/visual-review.json',errors:0,foreground:'CDP emulation; not native OS focus or performance acceptance'},affectedDisplays:{cases:48,viewports:144,review:base+'/ui-interactions-r11/visual-review.json',menuViews:presentations.filter(x=>x.phase==='menu').length,battleViews:presentations.filter(x=>x.phase==='battle').length,rewardViews:presentations.filter(x=>x.phase==='reward').length,levelTexts:[...new Set(levelBadges.map(x=>x.text))]},validation:{relatedTests:69,typecheck:true,evidenceRoot:base+'/menu-level-fix-r1'},status:'validated'},
 static:{runs,rows,uniqueCaptured:rows.length,uniqueReviewed:rows.filter(x=>x.review).length,duplicateRunsNotAdded:true,allVisualPassed:false,reuseBasis:['最新48项覆盖全部菜单21项、三族战斗详情3项及24项等级相关显示；其余旧截图不是声称由新包重拍。','原始SHA保留并逐份核对；生产差异只为已批准menu限定战斗条隐藏及levelN文本替换，当前48项针对验证单列。','旧静态运行器/工具输入差异为详情实际入口、分页、测试反馈隔离及检测面板输入/标签修正；后续受影响用例以r5/r6/r8/r9/r11逐项覆盖。','r9补齐六项早期用例和两项竖屏结算初始截图缺口，旧截图与失败保留。'],pending:['最终离线同版打包及证据绑定仍待完成。']},
 controls:{checks:6,errors:0,review:controlRoot+'/visual-review.json'},dynamic:{runs:dynamics,coverageComplete:false,notes:'按运行分别列采集和已看，重测不能累加为唯一覆盖；10481全量动态尚未完成，已有阿拉纳克取景及妮阿德拉细节待核对。'},
 oldFailures:{normalMenuR2:'Opening overlay had not finished; three premature checks are not accepted as final menu evidence.',normalMenuR3:'Hidden test browser had document.hidden=true and no RAF progress; timeout retained.',uiR10:'Same hidden-window boot timeout, 0 rows; retained.',foregroundCorrection:'Only test runners enable CDP foreground emulation. No production opening code or normal focus behavior changed.'},
 cleanup:base+'/profile-cleanup-20261025-r17.json',coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
const file=base+'/progress-20261025-r8.json';await fs.writeFile(file,JSON.stringify(result,null,2));
await fs.writeFile(base+'/menu-level-fix-r1/result.json',JSON.stringify({date:result.date,...result.approvedUI,baseline:result.baseline},null,2));
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,186);board.revision=187;board.updated='2026-10-25';board.next='T01';
const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='332项静态目录已有逐项三尺寸采集和逐图复核记录，按最新有效运行去重映射；两项旧结算竖屏截图缺口已补齐。用户批准的菜单战斗条隐藏与中文等级已实施，普通菜单4页×3尺寸及48项受影响显示复核通过，69相关测试和类型检查通过。检测工具6组布局检查通过。全量动态逐项完整周期、最终同版双离线HTML证据绑定仍未完成，不宣告T01/MVP验收。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:187});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 两项已批准UI修复验证与静态映射（看板187）\n\n'+task.result+'\n\n840基线837及Current保持，三个正式修改仅为已批准的装备槽定位、menu限定隐藏战斗条和levelN改N级。测试隐藏窗口造成开场不推进，旧超时保留；测试使用CDP前台模拟，不认定真实系统焦点或性能通过。关闭缓存清理2份2433033787字节，原截图/失败/日志保持。动态逐运行采集与已看另列，未计成全量覆盖。进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 两项批准UI修复验证与静态映射 · 2026-10-25\n\n- '+task.result+'\n- 840基线837及Current保持，三个正式改动均为用户已批准范围；隐藏测试窗口超时与旧失败保留，CDP前台模拟仅测试使用。清理2份关闭缓存2433033787字节，原证据保持。看板187，未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:187,staticCaptured:rows.length,staticReviewed:rows.filter(x=>x.review).length,affected:ui11.rows.length,controls:6,changed}));
