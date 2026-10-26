import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed.slice().sort(),['src/render/effects/nonhero-effects.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css','src/render/loaders/animations.ts','src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','test/animations.test.ts'].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const report=await read(base+'/actions-r17/report.json'),review=await read(base+'/actions-r17/visual-review.json'),build=report.build;
assert.equal(report.profileClosed,true);assert.equal(report.errors.length,0);assert.equal(report.rows.length,49);assert.equal(review.rows.length,49);
for(const f of build.inputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256,'Build drift '+f.file);
for(const row of report.rows){assert.equal(row.status,'cycle-captured');assert.equal(review.rows.find(r=>r.id===row.id)?.status,'reviewed');}
const freeze=base+'/actions-r17/frozen-web';await fs.mkdir(freeze,{recursive:false});
for(const item of build.artifacts){const bytes=await fs.readFile(build.out+'/'+item.file);assert.equal(sha(bytes),item.sha256);await fs.writeFile(freeze+'/'+item.file,bytes,{flag:'wx'});}
for(const f of ['asset-manifest.json','runtime-config.json'])await fs.copyFile(build.out+'/'+f,freeze+'/'+f);
await fs.writeFile(freeze+'/build.json',JSON.stringify(build,null,2),{flag:'wx'});
await fs.writeFile(freeze+'/replay-build.json',JSON.stringify({...build,out:freeze},null,2),{flag:'wx'});
const original=report.evidenceRoot+'/'+report.rows[1].directory+'/008-1.2.jpg';
Object.assign(review.rows.find(r=>r.id===report.rows[1].id),{supplements:[{file:original,sha256:sha(await fs.readFile(original))}],supplementObservation:'另看原尺寸完整视口1.2秒，先前窄裁切遗漏上方对空命中；扩展裁切后已重新查看该条全部21帧。'});
await fs.writeFile(base+'/actions-r17/visual-review.json',JSON.stringify(review,null,2));
const endStates=[];
for(const row of report.rows){const ev=JSON.parse(gunzipSync(await fs.readFile(report.evidenceRoot+'/'+row.directory+'/'+report.evidenceFile)));const frames=ev.frames.filter(f=>f.at>=6),last=frames.at(-1).state;assert.ok(frames.length>=2);assert.ok(frames.every(f=>f.state.actor.shots===last.actor.shots));
 if(row.id.includes('thor:')||row.id.includes('thor.')){assert.equal(last.attackState.windup,0);assert.equal(last.presentation.action,row.id.includes(':form:')?'highImpactIdle':'idle');}
 endStates.push({id:row.id,shotsAtEnd:last.actor.shots,windup:last.attackState?.windup,pose:last.presentation?.action,shotsStable:true});
}
const source=await read(base+'/thor-attack-fix-r1/source-track-audit.json');assert.equal(source.rows.length,2);for(const row of source.rows){assert.equal(sha(await fs.readFile(row.source)),row.sha256);assert.ok(row.allCannonTracksConstant&&row.sourceClipsUnchanged);assert.equal(row.compositions.length,4);}
const comparison=await read(base+'/thor-attack-fix-r1/state-comparison.json');assert.equal(comparison.rows.length,3);assert.equal(comparison.rows.reduce((n,r)=>n+r.samples,0),42);
const attackResult={scope:'Thor high-impact windup and ground/air shot presentation, all 5 ranks of ordinary and 3 elite variants, plus 8 normal-mode controls and 1 carrier fixture control. No general performance or human acceptance claim.',rendered:49,reviewed:49,errors:0,highImpact:40,normalControls:8,carrierControl:1,sourceTracks:base+'/thor-attack-fix-r1/source-track-audit.json',stateComparison:base+'/thor-attack-fix-r1/state-comparison.json',endStates,tests:25,green:base+'/thor-attack-fix-r1/green.log',typecheck:base+'/thor-attack-fix-r1/typecheck.log',report:base+'/actions-r17/report.json',review:base+'/actions-r17/visual-review.json',frozenBuild:freeze+'/replay-build.json'};
await fs.writeFile(base+'/thor-attack-fix-r1/result.json',JSON.stringify(attackResult,null,2),{flag:'wx'});
const oldReview=await read(base+'/actions-r16/visual-review.json');for(const row of oldReview.rows)if(row.issue==='T01-THOR-HIGH-IMPACT-ATTACK')Object.assign(row,{resolved:true,resolution:base+'/thor-attack-fix-r1/result.json'});await fs.writeFile(base+'/actions-r16/visual-review.json',JSON.stringify(oldReview,null,2));
const uniqueCaptured=new Set(),uniqueReviewed=new Set(),runs=[];
for(const item of await fs.readdir(base,{withFileTypes:true})){
 if(!item.isDirectory()||!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(item.name))continue;
 let r;try{r=await read(`${base}/${item.name}/report.json`);}catch{continue;}let v;try{v=await read(`${base}/${item.name}/visual-review.json`);}catch{v={rows:[]};}
 const captured=r.rows.filter(x=>['cycle-captured','receipt-captured'].includes(x.status));for(const x of captured)uniqueCaptured.add(x.id);
 for(const x of v.rows){for(const img of [...(x.images??(x.file?[x]:[])),...(x.supplements??[])])assert.equal(sha(await fs.readFile(img.file)),img.sha256);uniqueReviewed.add(x.id);}
 runs.push({run:item.name,captured:captured.length,failed:r.rows.filter(x=>x.status==='failed').length,reviewed:v.rows.length});
}
const cleanupFile=base+'/profile-cleanup-20261025-r27.json',cleanup=await read(cleanupFile),removed=(Array.isArray(cleanup)?cleanup:[cleanup]).filter(r=>r.status==='removed');assert.equal(removed.length,1);
const file=base+'/progress-20261025-r13.json',result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},build:{inputs:build.inputs.length,drift:[],frozen:freeze+'/replay-build.json'},dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Observations include preserved historical issues, not aggregate pass.'},catalogue:{total:11151,notApplicable:160,static:332},attackFix:attackResult,cleanup:{evidence:cleanupFile,removed},remaining:['旧攻击周期的停火夹具会延迟待发前摇，不能作为自然收枪通过；受影响条目仍需新周期。','刺蛇近战及范围/弹射、敌方目录和夹具待交叉核对。','全量动态逐项完整周期、同版双离线HTML仍未完成。'],coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2),{flag:'wx'});
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,191);board.revision=192;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='雷神重击瞄准/射击姿态修复已完成源轨道与实际渲染验证：普通及三精英五级对地/对空40项、普通模式8项及旗舰子机控制1项，共49完整周期逐项已看，错误0；42个修复前后战斗状态一致，25相关检查及类型通过。旧停火夹具干扰前摇已修正并验证本批末段，其余旧周期不据此自动通过。动态目录11151项（160不适用），332静态已有记录；全量动态及双离线HTML仍未完成，T01/MVP保持开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed.filter(f=>f.startsWith('src/')),coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:192});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`840基线中832保持，7生产文件和1旧测试有本任务改动；527构建输入逐SHA一致，Current保持。清理1份关闭缓存${removed[0].bytes}字节，原始证据和修复前构建保留；首次清理因可执行路径不存在、第二次CIM受限均在删除前退出，授权后清理成功。未提交/推送/发布。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 雷神重击攻击修复验证（看板192）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 雷神重击攻击修复验证 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板192。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:192,rendered:49,reviewed:49,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,changed,cleanupBytes:removed[0].bytes}));
