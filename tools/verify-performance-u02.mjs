import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-u02-20261019',hash=x=>createHash('sha256').update(x).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const baseline=await read('preview/performance-u02-20261019-baseline/build-inputs.json'),candidate=await read('preview/performance-u02-20261019/build-inputs.json');
const key=p=>p.replace('performance-u02-20261019-baseline','performance-u02-20261019');
const old=new Map(baseline.inputs.map(x=>[key(x.file),x])),changed=[];
for(const entry of candidate.inputs){assert.ok(old.has(key(entry.file)),entry.file);if(old.get(key(entry.file)).sha256!==entry.sha256)changed.push(entry.file);assert.equal(hash(await fs.readFile(path.join(root,'web-inputs',entry.file))),entry.sha256,entry.file);}
assert.deepEqual(changed.sort(),['src/ui/hud/m3-menu.ts','src/ui/starship/legacy-view.ts']);
for(const file of changed)assert.equal(hash(await fs.readFile(file)),candidate.inputs.find(x=>x.file===file).sha256,file);
for(const b of [baseline,candidate])for(const output of b.outputs)assert.equal(hash(await fs.readFile(output.file)),output.sha256,output.file);
assert.equal(baseline.outputs.find(x=>x.file.endsWith('.css')).sha256,candidate.outputs.find(x=>x.file.endsWith('.css')).sha256);
const rounds=[['baseline-2','fixed-4'],['baseline-3','fixed-5']],results=[];
const median=a=>{const sorted=[...a].sort((a,b)=>a-b),n=sorted.length;return n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;};
const names=['search','search-match','clear','sort','next','prev','select'];
const summarize=r=>Object.fromEntries(names.map(name=>{const samples=r.benchmark.filter(x=>x.name===name).slice(3).map(x=>x.ms);return [name,{n:samples.length,median:median(samples),max:Math.max(...samples)}];}));
const reviewed=await read(root+'/visual-review.json');
for(const [oldRun,newRun]of rounds){
 const a=await read(root+'/'+oldRun+'/report.json'),b=await read(root+'/'+newRun+'/report.json');assert.equal(a.pass,true);assert.equal(b.pass,true);assert.equal(b.errors.length,0);assert.ok(a.errors.length>0);assert.ok(a.errors.every(e=>e.message?.includes("Failed to set the 'innerHTML'")));
 assert.equal(b.build.outputs.find(x=>x.file.endsWith('.js')).sha256,candidate.outputs.find(x=>x.file.endsWith('.js')).sha256);
 for(const check of b.checks)if('result'in check)assert.equal(check.result,true,check.name);
 for(const label of Object.keys(a.states))assert.equal(a.states[label],b.states[label],label);
 assert.deepEqual(a.benchmark.map(x=>[x.name,x.count]),b.benchmark.map(x=>[x.name,x.count]));assert.ok(b.benchmark.every(x=>x.shellRetained&&x.inputRetained));
 for(const r of [a,b])for(const screen of r.screens){assert.equal(hash(await fs.readFile(screen.file)),screen.sha256);assert.ok(reviewed.files.includes(screen.file),screen.file);}
 results.push({baseline:oldRun,candidate:newRun,baselineErrors:a.errors.length,candidateErrors:b.errors.length,checks:b.checks.filter(x=>'result'in x).length,baselineScreens:a.screens.length,candidateScreens:b.screens.length,statesExact:Object.keys(a.states),requestFailures:{baseline:a.requests,candidate:b.requests},handlers:{baseline:summarize(a),candidate:summarize(b)},nativeInputLatency:{baseline:a.actions.map(x=>({name:x.name,events:x.ui.events.filter(e=>e.type==='input'||e.type==='change').map(e=>e.twoFramesMs)})),candidate:b.actions.map(x=>({name:x.name,events:x.ui.events.filter(e=>e.type==='input'||e.type==='change').map(e=>e.twoFramesMs)}))}});
}
const tests=await fs.readFile(root+'/tests-final.log','utf8'),types=await fs.readFile(root+'/typecheck-final.log','utf8');assert.match(tests,/pass 1655/);assert.match(tests,/fail 0/);assert.ok(!types.includes('error TS'));
const result={pass:true,created:new Date().toISOString(),scope:'Frozen main plus prior F05 in both; only U02 UI source changes. Synthetic 1000-item legal warehouse, browser input and separate synchronous dispatch; no FPS or natural campaign acceptance.',inputs:candidate.inputs.length,changed,outputs:candidate.outputs,tests:1655,rounds:results,reviewedFiles:reviewed.files,limits:['Synthetic dispatch timings are handler CPU work, not input-to-paint or FPS.','No-match search regression is retained; aggregate gains do not mean every operation improved.','Four viewport checks use browser automation, not human or physical-input acceptance.','Battle starts natively; intermission fixture calls native endStage on a controlled battlefield, not natural full campaign.'],failuresPreserved:['Sandbox tests blocked by localhost EACCES and temporary-file EPERM.','Existing port 4436 already in use; reused existing server.','fixed-1: scroll equality failed when filtered content shrank; fixed-2 records 146→31 with new maximum 31.','fixed-2: test confused interface pause with player pause.','fixed-3: continued run correctly preserved player pause; test had omitted explicit resume.','R1/R2 previews, compiled input archives and all raw runs retained.']};
await fs.writeFile(root+'/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({pass:true,changed,inputs:result.inputs,rounds:results.map(r=>({runs:[r.baseline,r.candidate],checks:r.checks,errors:[r.baselineErrors,r.candidateErrors],timing:r.handlers}))}));
