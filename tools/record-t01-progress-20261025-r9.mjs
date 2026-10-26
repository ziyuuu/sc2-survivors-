import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual([...changed].sort(),['src/render/effects/nonhero-effects.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css'].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const build=await read(base+'/build.json');
for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const burn=await read(base+'/support-burn-fix-r1/finding.json');
assert.equal(burn.status,'fixed-affected-validation-complete');
const state=await read(base+'/support-burn-fix-r1/state-comparison.json');
assert.equal(state.length,3);assert.ok(state.every(r=>r.stateSame&&r.frames===14));
const runs=[],uniqueCaptured=new Set(),uniqueReviewed=new Set();
for(const item of await fs.readdir(base,{withFileTypes:true})){
 if(!item.isDirectory()||!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(item.name))continue;
 let report;try{report=await read(`${base}/${item.name}/report.json`);}catch{continue;}
 let review;try{review=await read(`${base}/${item.name}/visual-review.json`);}catch{review={rows:[]};}
 const captured=report.rows.filter(r=>['cycle-captured','receipt-captured'].includes(r.status));
 for(const row of captured)uniqueCaptured.add(row.id);
 for(const row of review.rows){
  for(const img of [...(row.images??(row.file?[row]:[])),...(row.supplements??[])])assert.equal(sha(await fs.readFile(img.file)),img.sha256);
  uniqueReviewed.add(row.id);
 }
 runs.push({run:item.name,captured:captured.length,failed:report.rows.filter(r=>r.status==='failed').length,reviewed:review.rows.length,evidence:`${base}/${item.name}/report.json`});
}
const yamato=await read(base+'/actions-r12/visual-review.json');assert.equal(yamato.rows.length,5);
const result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},buildInputs:build.inputs.length,
 burnRepair:{finding:base+'/support-burn-fix-r1/finding.json',validation:{relatedTests:6,typecheck:true,browserLevels:3,browserErrors:0,matchingStates:42},newTest:'test/support-burn-animation.test.ts'},
 dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Observed does not mean passed: known gaps and old failures remain in individual records. Retakes and supplements are deduplicated by case ID. Not final catalogue coverage.',yamatoAllFiveRanksWholeRingReviewed:true,cardCyclesR6Reviewed:14,cardCyclesR6Total:48},
 remaining:['继续未完成的动态逐项完整周期检查及所有真实动作/变体映射。','大和炮中心贴地直边等外观观察保留，尚未把外观观察判定为已修复。','全量覆盖、同版证据映射和最终双离线HTML仍未完成。'],
 cleanup:base+'/profile-cleanup-20261025-r20.json',coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
const file=base+'/progress-20261025-r9.json';await fs.writeFile(file,JSON.stringify(result,null,2));
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,187);board.revision=188;board.updated='2026-10-25';board.next='T01';
const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='继续全量动态逐项核对。人族支援持续燃烧误停在近空图集尾帧，已修复为原有活跃火焰循环；6项相关测试、类型检查、三档浏览器完整周期与末段补帧通过，42个模拟采样状态与修复前一致，低叠层小火焰遮挡如实记录。大和炮五阶已补齐整个外圈取景，中心贴地直边另记外观观察。332静态记录保持；动态全量和最终同版双离线HTML仍未完成，T01/MVP保持开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:188});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail='840基线836及Current保持，三个既有批准UI改动加一处原效果缺陷修复；新增2项针对测试包含有效红绿。原始截图、失败及旧构建保持。用户中途要求清理磁盘，已清理2份关闭缓存3021395902字节，未删除原始证据。';
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 持续燃烧缺陷修复及周期检查（看板188）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 持续燃烧修复及周期检查 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板188，未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:188,changed,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,coverageComplete:false}));
