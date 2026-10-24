import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async f=>JSON.parse(await fs.readFile(f,'utf8')),root='reports/local/performance-a03-20261021';
const q=await read('reports/qa/performance-a03-20261021.json'),board=await read('docs/project/performance-board.json'),before=await read(root+'/inputs-before.json');
for(const f of q.evidence){const b=await fs.readFile(f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);}
assert.equal(sha(await fs.readFile(q.document.path)),q.document.sha256);
for(const f of before.files)assert.equal(sha(await fs.readFile(f.path)),f.sha256,f.path);
assert.equal(board.revision,93);assert.equal(board.tasks.length,52);assert.equal(board.auditRows.length,169);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,42);assert.equal(board.tasks.find(t=>t.id==='A03').status,'已完成');assert.equal(board.next,'D01');assert.equal(board.tasks.find(t=>t.id==='D04').status,'待讨论');assert.equal(board.auditRows.find(r=>r.id==='LOAD-007').reviewStatus,'证据口径');
const observed=q.summary.games.find(g=>g.name==='game-incognito-1');assert.equal(observed.missingBeforeReload.length,1425);assert.equal(observed.stages.find(s=>s.name==='reload-battle').disk.keys,141);
const pressure=q.summary.pressure.find(p=>p.name==='pressure-incognito-3'),after=pressure.stages.find(s=>s.name==='after-critical');assert.equal(after.missing,1262);assert.equal(after.found,304);assert.equal(pressure.checks.find(c=>c.name==='selective-redownload-after-reload').actualRequests,1262);
assert.ok(q.visual.canvasPairs.every(p=>p.changedPixels===0));assert.equal(q.visual.images,22);
const result={status:'pass',evidence:q.evidence.length,existingFiles:before.files.length,productionInputs:q.productionInputs,gameplayChanges:0,retainedObservedLoss:{keys:141,missingPriorKeys:1425},controlledLoss:{remaining:304,missingAndRedownloaded:1262},images:22,board:q.board};
await fs.writeFile(root+'/final-integrity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
