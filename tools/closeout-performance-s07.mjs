import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s07-20261020',read=async p=>JSON.parse(await fs.readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const source=await read(root+'/source-proof.json'),equivalence=await read(root+'/equivalence-r5.json'),boundaries=await read(root+'/boundaries-r1.json'),cost=await read(root+'/cpu-r5.json'),browser=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json'),browserRecheck=await read(root+'/summary-r2.json'),pixelsRecheck=await read(root+'/pixels-r2.json');
for(const r of [source,equivalence,boundaries,cost,browser,browserRecheck])assert.equal(r.pass,true);
assert.equal(equivalence.checks,917);assert.equal(boundaries.rows.length,5);assert.equal(browser.pairs.length,10);assert.equal(pixels.pairs.length,10);
assert.equal(browserRecheck.pairs.length,10);assert.equal(browserRecheck.originalRunStatePairs.length,20);assert.equal(pixelsRecheck.pairs.length,10);for(const p of pixelsRecheck.pairs)assert.equal(p.outsideMinimapAndCollapseButton,0);
const full=await fs.readFile(root+'/full-tests.txt','utf8');for(const s of ['tests 1721','pass 1721','fail 0'])assert.ok(full.includes(s));
assert.match(await fs.readFile(root+'/docs-check.txt','utf8'),/Game reference matches runtime data/);
const doc=await fs.readFile('docs/project/PERFORMANCE_S07_20261020.md','utf8'),decisions={};
for(const line of doc.split('\n')){const m=line.trim().match(/^- \*\*(SIM-013|SIM-014|C03|C06|C19|C22)\*\*：(.+)$/);if(m)decisions[m[1]]=m[2];}assert.equal(Object.keys(decisions).length,6);
const artifacts=[];for(const f of ['source-proof.json','equivalence-r5.json','boundaries-r1.json','cpu-r5.json','summary.json','pixels.json','summary-r2.json','pixels-r2.json','visual-review.json','packaging-notes.json','full-tests.txt','typecheck-final.txt','docs-check.txt','equivalence-r2.json','equivalence-r3.json','equivalence-r4.json','cpu-r2.json','cpu-r4.json']){
 const file=root+'/'+f,bytes=await fs.readFile(file);artifacts.push({file,bytes:bytes.length,sha256:hash(bytes)});
}
const browsers=[];for(const run of ['baseline-1','candidate-1','baseline-2','candidate-2']){
 const mode=run.split('-')[0],file=root+'/'+run+'/report.json',r=await read(file);assert.ok(r.pass);assert.equal(r.errors.length,0);assert.equal(r.screens.length,10);assert.deepEqual(r.build.outputs,source[mode].outputs);
 for(const s of r.screens)assert.equal(hash(await fs.readFile(s.file)),s.sha256);
 for(const c of r.checkpoints)assert.equal(hash(await fs.readFile(root+'/'+run+'/'+c.stateFile)),c.sha256);
 browsers.push({file,sha256:hash(await fs.readFile(file)),pass:r.pass,device:r.device,errors:r.errors,requests:r.requests,checkpoints:r.checkpoints.map(c=>({name:c.name,stateFile:c.stateFile,sha256:c.sha256})),screens:r.screens,captureMethod:r.captureMethod});
}
const review=await read(root+'/visual-review.json');assert.equal(review.reviewed,true);assert.equal(review.contacts.length,10);
const report={schemaVersion:1,id:'performance-s07-20261020',status:'verified-local',scope:'S07 bounded movement-query batch plus six A01 decisions and S09 regressions. Existing contact solver, separation, spatial hash, combat rules and all caps retained.',
 source:{pass:true,changed:source.changed,excludedWorkspaceChange:source.excludedWorkspaceChange,boundary:source.boundary,builds:['baseline','candidate','nodeOld','nodeNew'].map(k=>({kind:k,inputs:source[k].inputs.length,outputs:source[k].outputs,previous:source[k].previous}))},
 tests:{pass:1721,fail:0,newTests:5,singleFullRun:true,typecheck:true,dataDocs:true},equivalence,boundaries,cost,browser,pixels,browserRecheck,pixelsRecheck,review,browsers,artifacts,decisions,
 retainedFailures:[
 {files:['equivalence-r2.json','equivalence-r3.json'],reason:'Diagnostic HP maximum increased to 1e6; normal stat refresh removed the excess health at tick606. Health lock alone did not fix invalid setup. Final uses normal max HP and existing diagnostic lock.'},
 {files:['equivalence-r4.json'],reason:'Incorrect requirement that enemy baneling survive an actively firing hostile mix; both builds already matched. Final uses original S09 stationary-mix and open enemy controls.'},
 {files:['cpu-r2.json'],reason:'Pilot timing overlapped typecheck; not final performance evidence.'},
 {files:['cpu-r4.json'],reason:'Short-loop timing and JIT variance, including slow candidates, retained. R5 adds explicit excluded warmup and more iterations.'},
 {files:['pixels.json','baseline-1/report.json','candidate-1/report.json'],reason:'Original screenshot capture froze World but allowed camera smoothing until capture. Traversal-end checkpoint camera targets differ; dense-initial zoom remained in transition. Original whole-image differences and tiny differences retained; stable-camera recheck is separate evidence.'}],
 limits:['No full-frame/FPS improvement claim; complete five-step mean-per-step median slightly slower (5.03246 to 5.10438ms).','Current five campaign maps have level0 grids; successful native cliff crossing measured only in supporting legacy/synthetic terrain.','Industrial map failed crossing query regression +0.00408ms retained; successful empty cliff and cold formation small regressions retained.','Existing bounded collision leaves small penetration; S09 tested paths and min clearance remain exactly equal.','No broad-phase ordering/budget changes, corpse trimming, failed-crossing backoff, stale blink/transfer commit reuse or save work.','Diagnostic placement/HP locks and controlled callbacks are not natural campaign, physical input, human acceptance or full-content60FPS.','No Current replacement, Git commit/push or online publication.']};
await fs.writeFile('reports/qa/performance-s07-20261020.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,tests:1721,checks:917,boundaries:5,browserPairs:10,audits:6}));
