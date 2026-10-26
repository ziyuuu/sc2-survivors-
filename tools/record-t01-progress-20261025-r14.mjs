import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed.slice().sort(),['src/render/effects/nonhero-effects.ts','src/render/effects/source/player.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css','src/render/loaders/animations.ts','src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','test/animations.test.ts'].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const report=await read(base+'/actions-r19/report.json'),build=report.build,comparison=await read(base+'/ending-mesh-fix-r1/state-comparison.json'),control=await read(base+'/ending-mesh-fix-r1/control-state.json'),before=await read(base+'/ending-mesh-fix-r1/before-analysis.json');
for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256,'Build drift '+f.file);
for(const run of ['actions-r19','actions-r20']){const r=await read(base+'/'+run+'/report.json'),v=await read(base+'/'+run+'/visual-review.json');assert.equal(r.profileClosed,true);assert.equal(r.errors.length,0);assert.equal(r.rows.length,run==='actions-r19'?60:23);assert.equal(v.rows.length,r.rows.length);for(const row of r.rows){assert.equal(row.status,'cycle-captured');assert.equal(v.rows.find(x=>x.id===row.id)?.status,'reviewed');}}
assert.equal(comparison.rows.length,60);assert.equal(comparison.rows.reduce((n,r)=>n+r.samples,0),1500);assert.equal(comparison.simulationMismatches,0);assert.equal(comparison.needleResidualRows,0);assert.equal(control.rows.length,23);
for(const r of comparison.rows)for(const e of Object.values(r.evidence))assert.equal(sha(await fs.readFile(e.file)),e.sha256);
for(const r of control.rows)assert.equal(sha(await fs.readFile(r.evidence.file)),r.evidence.sha256);
assert.equal(sha(await fs.readFile(before.source)),before.sourceSha256);
assert.match(await fs.readFile(base+'/ending-mesh-green-r2.log','utf8'),/pass 42/);
const frozen=base+'/actions-r19/frozen-web/build.json';const frozenBuild=await read(frozen);for(const a of frozenBuild.artifacts)assert.equal(sha(await fs.readFile(frozenBuild.out+'/'+a.file)),a.sha256);
const fix={issue:'T01-SOURCE-DEATH-MESH',cause:before.cause,implementation:'Selected Death geometry ends at its authored clip duration; pre-existing and Death-emitted particle/ribbon/projection tails retain their native lifetime.',sourceEvidence:base+'/ending-mesh-fix-r1/before-analysis.json',renderedFullCycles:60,reviewedFullCycles:60,singleShotSupplements:12,sharedControls:11,errors:0,commonSimulationSamples:1500,simulationMismatches:0,needleResidualRows:0,tests:42,newTests:4,testLog:base+'/ending-mesh-green-r2.log',typecheck:base+'/ending-mesh-typecheck.log',stateComparison:base+'/ending-mesh-fix-r1/state-comparison.json',controlState:base+'/ending-mesh-fix-r1/control-state.json',reports:['actions-r18','actions-r19','actions-r20'].map(r=>base+'/'+r+'/report.json'),reviews:['actions-r18','actions-r19','actions-r20'].map(r=>base+'/'+r+'/visual-review.json'),frozenBuild:frozen,limitations:['Near ground bodies occlude portions of very short flights; per-step state and wide single-shot supplements retained.','Ravager control retains native automatic bile casts after ordinary attacks stop.','No full-catalogue, production full-regression, performance or human acceptance claim.']};
const fixFile=base+'/ending-mesh-fix-r1/result.json';await fs.writeFile(fixFile,JSON.stringify(fix,null,2),{flag:'wx'});
const old=await read(base+'/actions-r18/visual-review.json');let resolved=0;for(const r of old.rows)if(r.issue===fix.issue){Object.assign(r,{resolved:true,resolution:fixFile});resolved++;}assert.equal(resolved,48);await fs.writeFile(base+'/actions-r18/visual-review.json',JSON.stringify(old,null,2));
const uniqueCaptured=new Set(),uniqueReviewed=new Set(),runs=[];
for(const item of await fs.readdir(base,{withFileTypes:true})){
 if(!item.isDirectory()||!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(item.name))continue;
 let r;try{r=await read(`${base}/${item.name}/report.json`);}catch{continue;}let v;try{v=await read(`${base}/${item.name}/visual-review.json`);}catch{v={rows:[]};}
 const captured=r.rows.filter(x=>['cycle-captured','receipt-captured'].includes(x.status));for(const x of captured)uniqueCaptured.add(x.id);
 for(const x of v.rows){for(const img of [...(x.images??(x.file?[x]:[])),...(x.supplements??[])])assert.equal(sha(await fs.readFile(img.file)),img.sha256);uniqueReviewed.add(x.id);}
 runs.push({run:item.name,captured:captured.length,failed:r.rows.filter(x=>x.status==='failed').length,reviewed:v.rows.length});
}
const cleanup=[];for(const n of [28,29,30]){const file=base+'/profile-cleanup-20261025-r'+n+'.json',r=await read(file);for(const e of Array.isArray(r)?r:[r])if(e.status==='removed')cleanup.push({file,...e});}assert.equal(cleanup.length,3);
const catalogue=await read(base+'/catalogue-current.json');assert.equal(catalogue.dynamic.length,11201);
const file=base+'/progress-20261025-r14.json',result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},build:{inputs:build.inputs.length,drift:[],frozen},dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Observations include historical issues and are not aggregate pass.'},catalogue:{total:11201,notApplicable:160,static:332},endingMeshFix:fix,cleanup,remaining:['其余旧攻击周期的停火夹具问题仍需逐项复测，不自动通过。','敌军等级、领主特性、形态和技能分支目录/夹具补齐。','全量动态逐项完整周期及最终同版双离线HTML继续。'],coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2),{flag:'wx'});
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,192);board.revision=193;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='确认并修复针体结束动画播完后仍冻结末姿的问题：仅让网格按原Death剪辑结束，粒子/飘带/投影尾迹保持。普通/三精英刺蛇及斯托科夫60完整周期、12穿刺宽视野补充和11共用特效控制逐项已看，错误0；1500共同战斗状态一致，42相关检查及类型通过。原48问题记录保留并关联修复。11201动态（160不适用）和332静态目录，敌军分支补齐、全量动态及同版双离线HTML继续，T01/MVP开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed.filter(f=>f.startsWith('src/')),coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:193});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`840基线831保持，8生产文件和1旧测试有本任务改动，本批新增4项针对测试；527构建输入逐SHA一致，Current保持。清理3份关闭缓存共${cleanup.reduce((n,r)=>n+r.bytes,0)}字节，原始证据/红绿失败/旧构建保持。首次清理可执行路径不存在在删除前失败，随后使用已核对路径完成。未提交/推送/发布。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 弹体结束动画修复验证（看板193）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 弹体结束动画修复验证 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板193。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:193,rendered:83,reviewed:83,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,cleanupBytes:cleanup.reduce((n,r)=>n+r.bytes,0),changed}));
