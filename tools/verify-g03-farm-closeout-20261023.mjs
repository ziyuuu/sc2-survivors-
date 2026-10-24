import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/g03-farm-minor-20261023',sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const file='reports/qa/g03-farm-minor-20261023.json',doc='docs/project/G03_FARM_MINOR_20261023.md',r=JSON.parse(fs.readFileSync(file,'utf8')),b=JSON.parse(fs.readFileSync('docs/project/performance-board.json','utf8')),before=JSON.parse(fs.readFileSync(root+'/before.json','utf8'));
assert.equal(r.counts.total,24);assert.equal(r.rows.length,24);assert.equal(r.inputs.legalItems,288);assert.equal(r.controlledChecks.total,22);assert.equal(b.revision,138);assert.equal(b.tasks.find(t=>t.id==='G03').status,'待讨论');assert.equal(b.tasks.length,62);assert.equal(r.executionCounts.formal.total,32);
for(const e of [...r.originalRows,...r.correctedRows]){assert.equal(sha(e.file),e.sha256);assert.equal(e.reconciliation.minerals,0);assert.equal(e.reconciliation.gas,0);assert(!fs.existsSync(e.file+'.lock'));}
for(const p of r.controlledChecks.files)assert.equal(sha(p.file),p.sha256);
for(const e of Object.values(r.evidence.reportingTools))assert.equal(sha(e.file),e.sha256);
for(const e of [r.evidence.plan,r.evidence.modePlan,r.evidence.summary,r.evidence.findings])assert.equal(sha(e.file),e.sha256);
assert.equal(sha(r.evidence.pressureAnalysis.file),r.evidence.pressureAnalysis.sha256);
for(const p of before.files){assert.equal(sha(p.file),p.sha256);if(p.file.startsWith('src/'))assert.equal(sha(before.baseline+'/'+p.file),p.sha256);}
assert.equal(sha(before.current.file),before.current.sha256);
for(const name of ['package.json','tsconfig.json'])assert.equal(sha(name),sha(root+'/before/'+name),name);
const state=JSON.parse(fs.readFileSync(root+'/batch-status.json','utf8'));assert.equal(state.active.length,0);assert.equal(state.pending,0);assert.equal(state.finished.length,24);assert(state.finished.every(e=>e.existing||e.code===0));
const mode=JSON.parse(fs.readFileSync(root+'/mode-batch-status.json','utf8'));assert.equal(mode.active.length,0);assert.equal(mode.pending,0);assert.equal(mode.finished.length,8);assert(mode.finished.every(e=>e.existing||e.code===0));
const text=fs.readFileSync(doc,'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g))assert(fs.existsSync(path.resolve(path.dirname(doc),m[1])),m[1]);
const agents=fs.readFileSync('AGENTS.md','utf8');assert(agents.startsWith('## G03消费增援核对与24条中间档补测完成'));
assert(fs.readFileSync('docs/project/PERFORMANCE_TODO.md','utf8').includes('G03_FARM_MINOR_20261023.md'));
const result={date:'2026-10-23',complete:true,verifiedAt:new Date().toISOString(),report:{file,sha256:sha(file)},document:{file:doc,sha256:sha(doc)},board:{revision:b.revision,counts:b.tasks.reduce((s,t)=>({...s,[t.status]:(s[t.status]??0)+1}),{})},formalExecutions:32,finalCohort:24,separateDiagnostics:2,controlledChecks:22,sourceAndTestsUnchanged:before.files.length,currentUnchanged:true,noNewGameChanges:true};
fs.writeFileSync(root+'/final-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
