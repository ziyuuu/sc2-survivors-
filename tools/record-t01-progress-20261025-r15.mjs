import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.equal(changed.length,13);assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const frozen=base+'/actions-r23/frozen-web/build.json',build=await read(frozen);
for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256,'Build drift '+f.file);
for(const f of build.artifacts)assert.equal(sha(await fs.readFile(build.out+'/'+f.file)),f.sha256);
const nativeFile=base+'/enemy-visual-fix-r1/native-comparison-fixed-r2.json',native=await read(nativeFile);
assert.equal(native.rows.length,2633);assert.equal(native.differences.length,0);assert.equal(native.retainedFailures.length,10);
for(const f of native.evidence)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const catalogue=await read(base+'/catalogue-current.json');assert.equal(catalogue.dynamic.length,13799);assert.equal(catalogue.static.length,332);
const runs=[];
for(const name of ['actions-r21-r2','actions-r22-r4','actions-r23-r2']){
 const report=await read(base+'/'+name+'/report.json'),review=await read(base+'/'+name+'/visual-review.json');
 for(const row of review.rows)for(const f of row.images)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
 runs.push({run:name,captured:report.rows.filter(r=>r.status==='cycle-captured').length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,reviewed:review.rows.length,profileClosed:report.profileClosed});
}
assert.equal(runs[0].captured,101);assert.equal(runs[0].reviewed,101);assert.equal(runs[1].captured,28);
assert.match(await fs.readFile(base+'/enemy-special-visuals-related-r4.log','utf8'),/pass 25/);
assert.equal((await fs.readFile(base+'/enemy-special-visuals-typecheck-r3.log','utf8')).trim(),'');
const added=[];for(const file of ['src/render/effects/enemy-special-source.ts','test/enemy-special-visuals.test.ts'])added.push({file,sha256:sha(await fs.readFile(file))});
const cleanup=[];for(const n of [31,32]){const file=base+'/profile-cleanup-20261025-r'+n+'.json',r=await read(file);for(const x of Array.isArray(r)?r:[r])if(x.status==='removed')cleanup.push({file,...x});}
const file=base+'/progress-20261025-r15.json',result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},added,build:{frozen,inputs:build.inputs.length,drift:[]},catalogue:{dynamic:13799,static:332,notApplicable:catalogue.dynamic.filter(c=>c.applicability).length},enemy:{nativeRows:2633,passed:2623,retainedFailures:native.retainedFailures,comparison:nativeFile,matched:2633,comparisonScope:native.scope,runs,visualRepair:'Original queen transfusion, bile flight/impact, three-ray lurker spikes and roach spray are connected to native receipts; native fan flights retain source and target height. Verification remains in progress.',tests:{latest:25,earlier:33,new:9,latestLog:base+'/enemy-special-visuals-related-r4.log',earlierLog:base+'/enemy-special-visuals-related-r3.log',typecheck:base+'/enemy-special-visuals-typecheck-r3.log'},retainedComparisonFailures:['native-comparison.json','native-comparison-fixed.json'].map(n=>base+'/enemy-visual-fix-r1/'+n)},cleanup,coverageComplete:false,offlineDelivered:false,remaining:['Finish the 51 repaired native enemy cycles and 28 camera-only supplements; verify browser state comparisons.','Retain zero-damage elite queen, missing telegraph/aura observations and initial-size observations until independently resolved.','Continue all remaining dynamic entries and final matching offline HTML delivery.'],commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2),{flag:'wx'});
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,193);board.revision=194;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='敌军目录补齐为2760项（2633适用），全目录13799动态/332静态。2633原生分支检查2623通过、10个精英虫后零伤害分支保留；修复前后固定开局标识后逐项记录一致，旧随机掉落差异与比较脚本漏剔重复显示字段的失败保留。101原画面完整周期已看，发现敌军技能漏效及对空高度问题；已补接原版治疗/胆汁/地刺/喷吐并修正弹体高度，51受影响周期复核及28镜头补充进行中。25相关检查和类型通过，未改伤害/冷却/UI，未认定全量动态或MVP通过。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed.filter(f=>f.startsWith('src/')),productionAdded:added.filter(f=>f.file.startsWith('src/')),coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:194});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`${baseline.files.length}基线${baseline.files.length-changed.length}保持，12旧生产及1旧测试改变；本批新增1效果辅助与1测试文件（9项）。${build.inputs.length}构建输入与成品逐SHA通过，Current保持。清理${cleanup.length}份已关闭缓存共${cleanup.reduce((n,r)=>n+r.bytes,0)}字节，所有原始证据保留。未提交/推送/发布。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 敌军分支与原版技能显示修复进行中（看板194）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 敌军分支与原版技能显示修复进行中 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板194。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:194,runs,changed:changed.length,inputs:build.inputs.length,cleanup:cleanup.length}));
