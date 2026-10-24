import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/performance-a02-20261020',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const qa=await read('reports/qa/performance-a02-20261020.json'),board=await read('docs/project/performance-board.json'),before=await read(root+'/inputs-before.json'),prior=await read(root+'/board-before.json');
assert.equal(qa.status,'pass');assert.equal(board.revision,91);assert.equal(board.next,'A03');
assert.equal(board.tasks.length,52);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,41);
assert.equal(board.tasks.find(t=>t.id==='A02').status,'已完成');assert.equal(board.tasks.find(t=>t.id==='A03').status,'待办');
const html=await fs.readFile('docs/project/PERFORMANCE_BOARD.html','utf8'),embedded=JSON.parse(html.match(/<script id="board-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(embedded,board);
assert.match(await fs.readFile('docs/project/PERFORMANCE_TODO.md','utf8'),/修订 91/);
assert.equal(board.auditRows.length,169);
for(const old of prior.auditRows){
 const now=board.auditRows.find(x=>x.id===old.id);
 for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration'])assert.deepEqual(now[key],old[key]);
 for(const task of old.tasks)assert.ok(now.tasks.includes(task));
 if(['SIM-008','R04','R06','R15'].includes(old.id)){assert.ok(now.reviewEvidence.includes('reports/qa/performance-a02-20261020.json'));assert.ok(!now.followUpTasks.includes('A02'));}
 else assert.deepEqual(now,old,'Unrelated audit row changed '+old.id);
}
for(const e of qa.evidence){const bytes=await fs.readFile(e.path);assert.equal(bytes.length,e.bytes,e.path);assert.equal(sha(bytes),e.sha256,e.path);}
assert.equal(sha(await fs.readFile(qa.document.path)),qa.document.sha256);
let inputChecks=0,outputChecks=0;
for(const variant of ['baseline-r2','candidate-r2']){
 const folder='preview/performance-a02-20261020-'+variant,build=await read(folder+'/build-inputs.json');
 for(const input of build.inputs){assert.equal(sha(await fs.readFile(root+'/'+variant+'-web-inputs/'+input.file)),input.sha256,input.file);inputChecks++;}
 for(const output of build.outputs){assert.equal(sha(await fs.readFile(output.file)),output.sha256,output.file);outputChecks++;}
 assert.equal(qa.summary.binding.rows.find(r=>r.variant===variant).sha256,build.outputs.find(x=>x.file.endsWith('/main.js')).sha256);
}
const changed=[];for(const file of before.files)if(sha(await fs.readFile(file.path))!==file.sha256)changed.push(file.path);
assert.deepEqual(changed,qa.productionChanges);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before.main);
let linkChecks=0;
for(const file of [qa.document.path,'docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const text=await fs.readFile(file,'utf8'),part=file===qa.document.path?text:text.split('\n').slice(0,4).join('\n');
 assert.ok(part.includes('A02'));
 for(const match of part.matchAll(/\]\(([^)]+)\)/g)){const url=match[1];if(url.startsWith('#')||/^[a-z]+:\/\//i.test(url))continue;await fs.access(path.resolve(path.dirname(file),url.split('#')[0]));linkChecks++;}
}
assert.equal(qa.summary.comparisons.length,10);assert.equal(qa.summary.camera.length,18);
assert.equal(qa.summary.rewardCpu.pairs,144);assert.equal(qa.summary.lifecycle.combatExact,true);
assert.equal((await read(root+'/final-1/report.json')).status,'failed','Preserve original hash assertion failure');
assert.equal((await read(root+'/binding-1/report.json')).status,'pass');
assert.ok(Object.values(qa.capacityPeaks).every(c=>c.dropped===0));
const result={status:'pass',revision:91,tasks:52,completed:41,remaining:11,next:'A03',auditRows:169,originalMetadataAndAssociationsPreserved:true,
 evidenceFiles:qa.evidence.length,inputChecks,outputChecks,linkChecks,existingUnchanged:before.files.length-changed.length,productionChanges:changed,
 finalRunFailurePreserved:true,supplementalActualResponseHashPassed:true,visualImages:qa.visualReview.images,generatedHTMLExact:true,main:before.main};
await fs.writeFile(root+'/closeout-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
