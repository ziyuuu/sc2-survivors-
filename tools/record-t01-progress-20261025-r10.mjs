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
const before=await read(base+'/parasite-capture-r2/before-build.json');
assert.deepEqual(build.inputs.filter(n=>before.inputs.find(o=>o.file===n.file)?.sha256!==n.sha256).map(n=>n.file),['tools/t01/card-effect-fixture.ts']);
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
const dense=await read(base+'/card-cycles-r6/report.json'),mapped=new Map();
for(const run of ['card-cycles-r6','card-cycles-r7','card-cycles-r10','card-cycles-r11']){
 const review=await read(`${base}/${run}/visual-review.json`);
 for(const row of review.rows)mapped.set(row.id,{id:row.id,run,review:`${base}/${run}/visual-review.json`,observation:row.observation});
}
const batch=dense.rows.map(r=>mapped.get(r.id));assert.equal(batch.length,48);assert.ok(batch.every(Boolean));
for(const r of batch){if(r.id.includes('parasite'))assert.equal(r.run,'card-cycles-r10');if(r.id.includes('prism'))assert.equal(r.run,'card-cycles-r11');}
const parasite=await read(base+'/parasite-capture-correction-r1.json');
assert.equal(parasite.status,'tool-corrected-native-trigger-and-area-damage-verified-visual-readability-limited');
assert.deepEqual(parasite.actualAreaDamage,[77,117,157]);
for(const r of parasite.receipts)assert.equal(sha(await fs.readFile(r.evidence)),r.sha256);
const cleanup=await read(base+'/profile-cleanup-20261025-r21.json');
const removed=cleanup.filter(r=>r.status==='removed');assert.equal(removed.length,6);
const file=base+'/progress-20261025-r10.json';
const result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},buildInputs:build.inputs.length,
 dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Observed does not mean passed. Prior invalid captures and readability limits remain explicit. Each ID is deduplicated; this is not final catalogue coverage.',denseSupportBatch:{total:48,mappedObservations:batch,rawR6Reviewed:43,scope:'Three parasite fixtures corrected, three prism views replaced, burn repair uses its later validation. Superseded originals remain.'}},
 parasiteCorrection:{finding:base+'/parasite-capture-correction-r1.json',actualAreaDamage:parasite.actualAreaDamage,visualLimit:parasite.visualLimit,productionChanged:false},
 cleanup:{evidence:base+'/profile-cleanup-20261025-r21.json',profiles:removed.length,bytes:removed.reduce((n,r)=>n+r.bytes,0)},
 remaining:['全量动态逐项完整周期及所有动作/装备/玩法映射继续。','回响、弹跳与寄生死亡爆炸的模型重叠/小尺寸可读性观察保留，不记为清晰可辨通过。','最终同版双离线HTML与全部证据映射尚未完成。'],coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2));
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,188);board.revision=189;board.updated='2026-10-25';board.next='T01';
const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='支援卡加密周期48项目已逐项映射有效观察。寄生旧夹具在首次普攻前停止，已纠正并核实三档实际范围伤害77/117/157；酸爆小且与尸体重叠，保留可读性限制。棱镜三档补齐完整光束取景；地雷追踪/爆炸/待机余雷和三档储盾受击消耗已核对。原燃烧修复与332静态记录保持，全量动态及最终同版双离线HTML仍未完成，T01/MVP开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:189});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`840基线836及Current保持；本批只有检测夹具与证据更新，未新增生产修改或重计旧回归。清理6份已关闭缓存${result.cleanup.bytes}字节，原始证据全部保留。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 支援周期证据补齐（看板189）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 支援周期证据补齐 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板189，未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:189,changed,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,denseSupport:48,cleanup:result.cleanup,coverageComplete:false}));
