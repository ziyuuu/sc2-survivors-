import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-s09-20261020',read=async p=>JSON.parse(await fs.readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const source=await read(root+'/source-proof.json'),behavior=await read(root+'/behavior-r4.json'),boundaries=await read(root+'/boundaries-r1.json'),cost=await read(root+'/route-cpu.json'),browser=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json');
for(const r of [source,behavior,boundaries,cost,browser])assert.equal(r.pass,true);
assert.equal(behavior.rows.length,63);assert.equal(behavior.controls.length,4);assert.equal(boundaries.rows.length,7);
const full=await fs.readFile(root+'/full-tests.txt','utf8');assert.match(full,/tests 1716/);assert.match(full,/pass 1716/);assert.match(full,/fail 0/);
assert.match(await fs.readFile(root+'/docs-check.txt','utf8'),/Game reference matches runtime data/);
const raw=['source-proof.json','behavior-r4.json','boundaries-r1.json','route-cpu.json','summary.json','pixels.json','full-tests.txt','targeted-tests.txt','typecheck.txt','docs-check.txt','behavior-r2.json'];
const artifacts=[];
for(const f of raw){const file=root+'/'+f,b=await fs.readFile(file);artifacts.push({file,bytes:b.length,sha256:hash(b)});}
const browsers=[];
for(const mode of ['baseline','candidate']){
 const file=root+'/'+mode+'-1/report.json',r=await read(file);assert.equal(r.pass,true);assert.equal(r.errors.length,0);assert.equal(r.screens.length,12);assert.equal(r.checkpoints.length,12);
 assert.deepEqual(r.build.outputs,source[mode].outputs);
 for(const s of r.screens)assert.equal(hash(await fs.readFile(s.file)),s.sha256);
 for(const c of r.checkpoints)assert.equal(hash(await fs.readFile(root+'/'+mode+'-1/'+c.stateFile)),c.sha256);
 browsers.push({file,sha256:hash(await fs.readFile(file)),pass:r.pass,device:r.device,errors:r.errors,requests:r.requests,checkpoints:r.checkpoints.map(c=>({name:c.name,stateFile:c.stateFile,sha256:c.sha256})),screens:r.screens,captureMethod:r.captureMethod});
}
for(const p of pixels.pairs.filter(p=>p.name.endsWith('-initial')))assert.equal(p.battleRows30to620,0);
const contacts=[];for(const file of pixels.contacts)contacts.push({file,sha256:hash(await fs.readFile(file)),reviewed:true});
const report={
 schemaVersion:1,id:'performance-s09-20261020',status:'verified-local',
 scope:'Player ground baneling melee approach behavior fix; not a performance gain or global movement rewrite.',
 source:{pass:source.pass,changed:source.changed,excludedWorkspaceChange:source.excludedWorkspaceChange,boundary:source.boundary,builds:['baseline','candidate','nodeOld','nodeNew'].map(k=>({kind:k,inputs:source[k].inputs.length,outputs:source[k].outputs,previous:source[k].previous}))},
 tests:{pass:1716,fail:0,newBehaviorTests:8,typecheck:true,dataDocs:true,fullSingleRun:true},
 behavior:{pass:true,method:behavior.method,rows:behavior.rows.map(x=>({options:x.options,initialStatsBefore:x.before.initialStats,initialStatsAfter:x.after.initialStats,beforeShots:x.before.shots,afterShots:x.after.shots,terrainInvalid:x.after.terrainInvalid,maxTravel:x.after.maxTravel,clearanceBefore:x.before.minClearance,clearanceAfter:x.after.minClearance})),controls:behavior.controls},
 boundaries,cost,browser,pixels,visualReview:{contacts,totalScreens:24,findings:'Visible side approach in mixed/dense scenes; ordinary/elite remain near target after attacks, temporary source disappears. No obvious missing mesh or attachment error. Fixed checkpoints do not capture explosion instant; no full-animation acceptance claimed.',initialDifference:'Three initial pairs RGB exact. Elite initial: 3 pixels, max one channel level, x1184 y676..707 in bottom UI border; battle region exact. Not further attributed; originals retained.'},
 browsers,artifacts,
 retainedFailures:[{file:root+'/behavior-r2.json',status:'failed-retained',reason:'24-ally formation contact slot remained enclosed; later candidates search alternative legal contact positions at unchanged range.'}],
 limits:['Bounded 2048-node local search; no arbitrary-maze reachability guarantee.','Route cached at most 0.4 simulated seconds; next segment checks current bodies each call.','Measured planner cost is new CPU work, not improvement or full-frame FPS.','Existing collision solver has small contact penetration; dense angle3.1 minimum clearance -0.03252 to -0.03597 is retained, not called a precision improvement.','High HP stopped diagnostic target, controlled World steps, no natural campaign or physical/human play acceptance.','Generic temporary fixture lifetime30 is distinct from actual Zagara lifetime10 boundary checks.','No Current replacement, Git commit/push, online publishing or full MVP/60FPS acceptance.']
};
await fs.writeFile('reports/qa/performance-s09-20261020.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,cases:behavior.rows.length,boundaries:boundaries.rows.length,tests:1716,screens:24,contacts:contacts.length}));
