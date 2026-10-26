import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed.slice().sort(),['src/render/effects/nonhero-effects.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css'].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const build=await read(base+'/build.json');for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const actions=await read(base+'/actions-r13/report.json'),visual=await read(base+'/actions-r13/visual-review.json');
assert.equal(actions.rows.length,59);assert.ok(actions.profileClosed);assert.equal(actions.errors.length,0);assert.ok(actions.rows.every(r=>r.status==='cycle-captured'));assert.equal(visual.rows.length,30);
const sources=await read(base+'/basic-action-source-r1.json');for(const s of sources)assert.equal(sha(await fs.readFile(s.source)),s.sha256);
for(const r of visual.rows){const [,family,,action]=r.id.split(':');if(!['hit','spawn'].includes(action))continue;const s=sources.find(x=>x.id==='model.'+family);assert.ok(s);r.sourceEvidence={file:base+'/basic-action-source-r1.json',assetId:s.id,assetSha256:s.sha256};r.sourceObservation=`当前活动GLB中Birth/Spawn=${s.namedBirth.length}，Hit/Hurt/Wound/Flinch=${s.namedHit.length}；归队、材质反馈与独立骨骼动画分别记录。`;}
await fs.writeFile(base+'/actions-r13/visual-review.json',JSON.stringify(visual,null,2));
const uniqueCaptured=new Set(),uniqueReviewed=new Set(),runs=[];
for(const item of await fs.readdir(base,{withFileTypes:true})){
 if(!item.isDirectory()||!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(item.name))continue;
 let report;try{report=await read(`${base}/${item.name}/report.json`);}catch{continue;}
 let review;try{review=await read(`${base}/${item.name}/visual-review.json`);}catch{review={rows:[]};}
 const captured=report.rows.filter(r=>['cycle-captured','receipt-captured'].includes(r.status));for(const row of captured)uniqueCaptured.add(row.id);
 for(const row of review.rows){for(const img of [...(row.images??(row.file?[row]:[])),...(row.supplements??[])])assert.equal(sha(await fs.readFile(img.file)),img.sha256);uniqueReviewed.add(row.id);}
 runs.push({run:item.name,captured:captured.length,failed:report.rows.filter(r=>r.status==='failed').length,reviewed:review.rows.length});
}
const audit=await read(base+'/actor-weapon-audit-r2.json');assert.equal(audit.actors,138);assert.equal(audit.states,157);assert.equal(audit.probes,200);
for(const f of audit.sources)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const cleanup=await read(base+'/profile-cleanup-20261025-r22.json'),removed=Array.isArray(cleanup)?cleanup.filter(r=>r.status==='removed'):cleanup.status==='removed'?[cleanup]:[];assert.equal(removed.length,1);
const file=base+'/progress-20261025-r11.json',result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},buildInputs:build.inputs.length,
 dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Observed does not mean passed. Prior invalid captures and readability limits remain explicit. Each ID is deduplicated; this is not final catalogue coverage.'},
 basicActions:{report:base+'/actions-r13/report.json',captured:59,reviewed:visual.rows.length,remainingVisual:29,errors:0,sourceAnimationEvidence:base+'/basic-action-source-r1.json'},
 weaponAudit:{evidence:base+'/actor-weapon-audit-r2.json',actors:audit.actors,states:audit.states,nativeTargetWeaponProbes:audit.probes,statesWithCatalogueGaps:audit.issues.length,scope:audit.scope,correction:audit.correction,productionChanged:false,implemented:false},
 cleanup:{evidence:base+'/profile-cleanup-20261025-r22.json',profiles:1,bytes:removed[0].bytes},remaining:['基础动作剩余29项已捕获但尚未观看。','补齐原生武器/形态/目标目录；潜伏者地表无武器，旗舰由原生子机作战，分别处理。','全量动态逐项完整周期及最终同版双离线HTML未完成。'],coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2),{flag:'wx'});
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,189);board.revision=190;board.updated='2026-10-25';board.next='T01';
const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='59项人族一级基础动作已采集，运行错误/断言失败0；前30项已逐帧记录，剩余29项待看，不能把采集成功算视觉通过。实际GLB未提供的出生/受击剪辑已有源依据和真实反馈记录。138对象157形态200次原生选目标/武器检查发现35种形态目录缺项，包括雷神对空、虫后近远地面、英雄对空与变形后攻击；潜伏者地表无武器，旗舰子机独立处理。目录补齐、全量动态和双离线HTML继续，T01/MVP开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed,coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:190});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`840基线836及Current保持，本批没有新增生产修改或生产全回归。525构建输入逐SHA保持；清理1份已关闭测试缓存${removed[0].bytes}字节，原始帧/状态/失败保留。首次审计漏列旗舰子机已纠正，原r1保留；该审计不是渲染或其余等级通过。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 基础动作与武器目录核对（看板190）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');
const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 基础动作与武器目录核对 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板190，未提交/推送/发布。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:190,changed,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,basicActions:result.basicActions,weaponAudit:result.weaponAudit,cleanup:result.cleanup,coverageComplete:false}));
