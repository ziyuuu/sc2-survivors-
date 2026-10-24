import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-b02-20261019',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const report=await read('reports/qa/performance-b02-20261019.json'),board=await read('docs/project/performance-board.json');
assert.equal(report.metrics.length,100);assert.equal(board.tasks.find(t=>t.id==='B02').status,'已完成');assert.equal(board.next,'B03');assert.equal(board.tasks.find(t=>t.id==='B03').status,'待办');assert.equal(board.tasks.find(t=>t.id==='F05').status,'待办');assert.equal(board.auditRows.length,169);
for(const e of report.evidence){const bytes=await fs.readFile(e.file);assert.equal(bytes.length,e.bytes,e.file);assert.equal(sha(bytes),e.sha256,e.file);}
let snapshots=0,archivedInputs=0;
for(const run of report.runs){const r=await read(run.raw);assert.equal(r.run,run.run);for(const c of r.checkpoints){assert.equal(sha(await fs.readFile(`${root}/${r.run}/${c.snapshot.file}`)),c.snapshot.sha256);snapshots++;}const outputDir=r.run==='synthetic-2'?'preview/performance-b02-20261019':root+'/build-1';for(const output of r.build.outputs)assert.equal(sha(await fs.readFile(outputDir+'/'+path.basename(output.file))),output.sha256);}
for(const n of [1,2]){const archive=`${root}/build-${n}`,b=await read(archive+'/build-inputs.json');for(const i of b.inputs){assert.equal(sha(await fs.readFile(`${archive}/inputs/${i.file}`)),i.sha256,i.file);archivedInputs++;}for(const o of b.outputs)assert.equal(sha(await fs.readFile(archive+'/'+path.basename(o.file))),o.sha256);}
assert.equal(snapshots,86);
const mixed=report.metrics.filter(r=>!r.stableCombatEligible);assert.equal(mixed.length,1);assert.equal(mixed[0].run,'normal-zerg-1');assert.equal(mixed[0].phase,'lost');assert.equal(report.runs.find(r=>r.run==='normal-zerg-1').rawPassed,false);
const doc=await fs.readFile('docs/project/PERFORMANCE_B02_SCENES_20261019.md','utf8');
for(const match of doc.matchAll(/\]\(([^)]+)\)/g))await fs.access(path.resolve('docs/project',match[1]));
for(const file of ['docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md']){const content=await fs.readFile(file,'utf8');assert.ok(content.includes('F05'));assert.ok(content.includes('B03'));}
const result={date:new Date().toISOString(),passed:true,evidenceHashes:report.evidence.length,formalStateHashes:snapshots,archivedBuildInputs:archivedInputs,formalOutputsMatchAssignedBuilds:true,zergFailureAndExclusionPreserved:true,boardRevision:board.revision,tasks:board.tasks.length,auditRows:board.auditRows.length,next:board.next};
await fs.writeFile(root+'/closeout-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
