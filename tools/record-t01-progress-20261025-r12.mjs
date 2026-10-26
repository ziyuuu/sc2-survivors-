import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const base='reports/local/t01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/baseline.json'),changed=[];
for(const f of baseline.files)if(sha(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
assert.deepEqual(changed.slice().sort(),['src/render/effects/nonhero-effects.ts','src/ui/intermission-skin/presentation.ts','src/ui/native-hud/battle.css','src/ui/starship/native.css','src/render/loaders/animations.ts','src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','test/animations.test.ts'].sort());
assert.equal(sha(await fs.readFile(baseline.currentFile)),baseline.currentSha256);
const build=await read(base+'/build.json'),buildDrift=[];for(const f of build.inputs)if(sha(await fs.readFile(f.file))!==f.sha256)buildDrift.push(f.file);
const sources=await read(base+'/basic-action-source-r1.json');for(const s of sources)assert.equal(sha(await fs.readFile(s.source)),s.sha256);
const reports={},reviews={};for(const run of ['actions-r13','actions-r14-r2','actions-r15','actions-r16']){reports[run]=await read(base+'/'+run+'/report.json');reviews[run]=await read(base+'/'+run+'/visual-review.json');assert.ok(reports[run].profileClosed);assert.equal(reports[run].errors.length,0);assert.ok(reports[run].rows.every(r=>r.status==='cycle-captured'));}
assert.deepEqual(Object.values(reviews).map(v=>v.rows.length),[59,31,32,3]);
const evidence=async(run,n)=>{const r=reports[run];return JSON.parse(gunzipSync(await fs.readFile(r.evidenceRoot+'/'+r.rows[n-1].directory+'/'+r.evidenceFile)));};
const a=await evidence('actions-r14-r2',12),b=await evidence('actions-r15',1),keys=['caseId','playing','speed','time','elapsed','phase','initial','diagnostic','actor','target','patient','events','spells','eliteFields','casts','receipt','memoryOnly'];
const state=s=>Object.fromEntries(keys.map(k=>[k,s[k]]));
for(const key of ['before','trigger','after'])assert.deepEqual(state(a[key]),state(b[key]));
assert.equal(a.frames.length,b.frames.length);for(let i=0;i<a.frames.length;i++)assert.deepEqual(state(a.frames[i].state),state(b.frames[i].state));
const moveResult={scope:'Same controlled ordinary rank-1 high-impact move, before/trigger/after and all captured simulation snapshots. Rendering/audio counters excluded; other ranks retain their own captures.',samples:3+a.frames.length,simulationEqual:true,sourceTracks:base+'/thor-move-fix-r1/source-track-audit.json',rendered:32,reviewed:32,errors:0,report:base+'/actions-r15/report.json',review:base+'/actions-r15/visual-review.json'};
await fs.writeFile(base+'/thor-move-fix-r1/result.json',JSON.stringify(moveResult,null,2),{flag:'wx'});
for(const [run,n,files,note]of [
 ['actions-r15',1,['003-0.35.jpg','004-0.7.jpg'],'另看两张原尺寸全视口，腿部前后位置不同，高冲击炮架持续展开。'],
 ['actions-r14-r2',22,['004-0.35.jpg','005-0.5.jpg'],'原尺寸0.35秒可见空中目标前下方浅色细针弹体，0.5秒黄绿色命中。'],
 ['actions-r14-r2',23,['004-0.35.jpg','005-0.5.jpg'],'原尺寸0.35秒目标左前方有浅色尖刺弹体，0.5秒目标身上黄绿色命中。']]){
 const row=reviews[run].rows.find(v=>v.id===reports[run].rows[n-1].id);row.supplements=[];for(const name of files){const file=reports[run].evidenceRoot+'/'+reports[run].rows[n-1].directory+'/'+name;row.supplements.push({file,sha256:sha(await fs.readFile(file))});}row.supplementObservation=note;
}
for(const row of reviews['actions-r14-r2'].rows){if(!row.id.endsWith(':hit'))continue;const family=row.id.split(':')[1],model=family==='hellion'?'hellion.hellbat':family==='tank'?'tank.siege':family==='viking'?'viking.assault':family;
 const s=sources.find(s=>s.id==='model.'+model);assert.ok(s);row.sourceEvidence={file:base+'/basic-action-source-r1.json',assetId:s.id,assetSha256:s.sha256};row.sourceObservation=`实际活动GLB的独立Hit/Hurt/Wound/Flinch剪辑数量为${s.namedHit.length}；已记录的暖色材质反馈不冒充独立骨骼受击动画。`;
}
const moveIssue=reviews['actions-r14-r2'].rows.find(r=>r.id===a.case.id);assert.ok(moveIssue);Object.assign(moveIssue,{status:'issue',resolved:true,resolution:base+'/thor-move-fix-r1/result.json'});
const carrierId='actor:hero.purifier_flagship:1:attack-air';Object.assign(reviews['actions-r14-r2'].rows.find(r=>r.id===carrierId),{status:'issue',issue:'T01-FIXTURE-CHILD-STOP',resolved:true,resolution:base+'/actions-r16/visual-review.json'});
for(const row of reviews['actions-r16'].rows)if(row.id.startsWith('actor:thor:'))Object.assign(row,{status:'issue',issue:'T01-THOR-HIGH-IMPACT-ATTACK',resolved:false,fixtureLimitation:'旧停火把普通单位nextShotAt设到远期，不能把末段定住前摇当作自然收枪。已修测试控制，等待新周期。'});
for(const [run,review]of Object.entries(reviews))await fs.writeFile(base+'/'+run+'/visual-review.json',JSON.stringify(review,null,2));
assert.equal(reports['actions-r14-r2'].applicability.length,160);
const naFile=base+'/actions-r14-r2/not-applicable.png';await fs.writeFile(base+'/actions-r14-r2/applicability-review.json',JSON.stringify({file:naFile,sha256:sha(await fs.readFile(naFile)),observed:true,observation:'已查看工具页：不适用有源依据说明，160项独立计数，仍显示10991未测，没有混入已看；原生暂停层在背景。',tested:160},null,2),{flag:'wx'});
const uniqueCaptured=new Set(),uniqueReviewed=new Set(),runs=[];
for(const item of await fs.readdir(base,{withFileTypes:true})){
 if(!item.isDirectory()||!/^(?:actions|cycle-probe|card-cycles|equipment-cycles|map-cycles)-r\d+(?:-r\d+)?$/.test(item.name))continue;
 let report;try{report=await read(`${base}/${item.name}/report.json`);}catch{continue;}let review;try{review=await read(`${base}/${item.name}/visual-review.json`);}catch{review={rows:[]};}
 const captured=report.rows.filter(r=>['cycle-captured','receipt-captured'].includes(r.status));for(const r of captured)uniqueCaptured.add(r.id);
 for(const r of review.rows){for(const img of [...(r.images??(r.file?[r]:[])),...(r.supplements??[])])assert.equal(sha(await fs.readFile(img.file)),img.sha256);uniqueReviewed.add(r.id);}
 runs.push({run:item.name,captured:captured.length,failed:report.rows.filter(r=>r.status==='failed').length,reviewed:review.rows.length});
}
const audit=await read(base+'/native-branches-audit-r3.json');assert.equal(audit.failures.length,0);for(const f of audit.sources)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const cleanup=[];for(const n of [24,25,26]){const f=base+`/profile-cleanup-20261025-r${n}.json`,r=await read(f);for(const row of Array.isArray(r)?r:[r])if(row.status==='removed')cleanup.push({evidence:f,...row});}
const file=base+'/progress-20261025-r12.json',result={date:new Date().toISOString(),baseline:{total:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,currentUnchanged:true},build:{inputs:build.inputs.length,drift:buildDrift,scope:'Captured runs bind their own build. Latest attack correction awaits a new build and rendered verification.'},dynamic:{runs,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,scope:'Visual observations include unresolved issues; no aggregate pass.'},catalogue:{total:audit.catalogueCount,added:audit.added,notApplicable:audit.notApplicable,actors:audit.actors,states:audit.states,probes:audit.probes,evidence:base+'/native-branches-audit-r3.json'},moveFix:moveResult,attackFix:{status:'implemented-awaiting-rendered-verification',tests:25,green:base+'/thor-attack-fix-r1/green.log',initialRed:'Missing new export stopped test loading; retained, not a behavioral red test.',evidence:base+'/actions-r16/visual-review.json'},cleanup,remaining:['雷神高冲击瞄准/射击修复需两份源模型轨道核对、重新构建及实际周期验证。','修正普通攻击停火夹具后复核完整收枪，旧停火记录不作为自然结束通过。','刺蛇近战及范围/弹射、敌方目录与夹具仍待交叉核对。','全量动态逐项完整周期、同版双离线HTML仍未完成。'],coverageComplete:false,offlineDelivered:false,commit:false,push:false,publish:false};
await fs.writeFile(file,JSON.stringify(result,null,2),{flag:'wx'});
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,190);board.revision=191;board.updated='2026-10-25';board.next='T01';const task=board.tasks.find(t=>t.id==='T01');task.status='进行中';task.updated=board.updated;
task.result='动态目录补齐原生形态/目标/武器670项，现11151项（160不适用）；138对象785状态990原生探测通过，未据此代替渲染检查。59项基础动作及31项新增分支已逐项观看，发现雷神高冲击滑步；修复后普通/三种精英各五级移动和双向变形共32项已看，实际状态对照一致。又确认高冲击瞄准误用普通姿态，修复及25相关检查已完成，实际渲染复测待续。旗舰子机停止夹具已纠正并看完末尾；普通停火前摇干扰另已修正待复测。全量动态、双离线HTML和T01/MVP继续开放。';
task.evidence.push('../../'+file);board.updates.push({date:board.updated,tasks:['T01'],change:task.result,evidence:['../../'+file]});await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');execFileSync(process.execPath,['tools/render-performance-board.mjs']);
const qa=await read('reports/qa/t01-20261024.json');Object.assign(qa,{progress:file,productionChanged:changed.filter(f=>f.startsWith('src/')),coverageComplete:false,offlineDelivered:false,staticReviewed:332,boardRevision:191});await fs.writeFile('reports/qa/t01-20261024.json',JSON.stringify(qa,null,2)+'\n');
const detail=`840基线中832保持，7生产文件和1旧测试有本任务改动；Current保持。最新攻击修复未计入旧527输入构建的渲染结果。清理3份已关闭缓存共${cleanup.reduce((n,r)=>n+r.bytes,0)}字节，原始失败、截图、状态、旧构建证据保留。未提交/推送/发布。`;
await fs.appendFile('docs/project/T01_20261024.md','\n\n## 2026-10-25 原生分支补齐与雷神姿态修复（看板191）\n\n'+task.result+'\n\n'+detail+'进展 `'+file+'`。\n');const agents=await fs.readFile('AGENTS.md','utf8');await fs.writeFile('AGENTS.md','## T01 原生分支与雷神姿态修复 · 2026-10-25\n\n- '+task.result+'\n- '+detail+'看板191。进展 `'+file+'`。\n\n'+agents);
console.log(JSON.stringify({board:191,changed,buildDrift,uniqueCaptured:uniqueCaptured.size,uniqueWithVisualObservation:uniqueReviewed.size,moveResult,cleanup:cleanup.map(r=>({bytes:r.bytes,status:r.status}))}));
