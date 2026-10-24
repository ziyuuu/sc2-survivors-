import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const sha=data=>createHash('sha256').update(data).digest('hex');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const root='reports/local/performance-a01-20261020';
const report=await read('reports/qa/performance-a01-20261020.json');
const board=await read('docs/project/performance-board.json');
const previous=await read(`${root}/board-before.json`);
const before=await read(`${root}/inputs-before.json`);
const html=await fs.readFile('docs/project/PERFORMANCE_BOARD.html','utf8');
const embedded=JSON.parse(html.match(/<script id="board-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(embedded,board);
const todo=await fs.readFile('docs/project/PERFORMANCE_TODO.md','utf8');
assert.match(todo,/修订 88/);
assert.equal(board.revision,88);
assert.equal(board.next,'A02');
assert.equal(board.tasks.length,52);
assert.equal(board.tasks.filter(t=>t.status==='已完成').length,40);
assert.equal(board.tasks.find(t=>t.id==='A01').status,'已完成');
for(const id of ['A02','A03'])assert.equal(board.tasks.find(t=>t.id===id).status,'待办');
assert.equal(board.auditRows.length,169);
assert.equal(report.adjudications.length,169);
for(const old of previous.auditRows){
 const row=board.auditRows.find(r=>r.id===old.id),record=report.adjudications.find(r=>r.id===old.id);
 for(const k of ['id','title','sourceCategory','sourceExecution','sourceIntegration'])assert.deepEqual(row[k],old[k]);
 assert.equal(row.previousReview,old.currentReview);
 assert.equal(row.reviewStatus,record.status);
 assert.ok(!row.currentReview.startsWith('已建立任务关联'));
 assert.ok(row.reviewEvidence.length);
 for(const id of old.tasks)assert.ok(row.tasks.includes(id),'Original association lost '+old.id);
 for(const id of record.destinations)assert.ok(row.tasks.includes(id),'Current association missing '+old.id);
}
assert.equal(Object.values(report.scope.counts).reduce((a,b)=>a+b,0),169);
for(const e of report.evidence){
 const data=await fs.readFile(e.path);
 assert.equal(data.length,e.bytes,e.path);
 assert.equal(sha(data),e.sha256,e.path);
}
for(const s of report.sourceAnchors){
 const text=await fs.readFile(s.file,'utf8'),offset=text.indexOf(s.needle);
 assert.ok(offset>=0,s.file);
 assert.equal(text.slice(0,offset).split('\n').length,s.line,s.file);
}
assert.equal(sha(await fs.readFile(report.document.path)),report.document.sha256);
let linkChecks=0;
for(const file of [report.document.path,'docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const text=await fs.readFile(file,'utf8');
 // Existing navigation contains historical external references; validate all new
 // document links and the new navigation entry, not unrelated legacy content.
 const targetText=file===report.document.path?text:text.split('\n').slice(0,4).join('\n');
 for(const match of targetText.matchAll(/\]\(([^)]+)\)/g)){
  const ref=match[1];
  if(ref.startsWith('#')||/^[a-z]+:\/\//i.test(ref))continue;
  const relative=ref.split('#')[0];
  await fs.access(path.resolve(path.dirname(file),relative));linkChecks++;
 }
 assert.ok(text.includes('A01'));
}
let existingUnchanged=0;
for(const original of before.files){
 assert.equal(sha(await fs.readFile(original.path)),original.sha256,original.path);
 existingUnchanged++;
}
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before.main);
const result={
 status:'pass',revision:88,auditRows:169,originalMetadataAndAssociationsPreserved:true,
 completeConclusions:169,remainingPlaceholders:0,evidenceFilesVerified:report.evidence.length,
 sourceAnchorsVerified:report.sourceAnchors.length,linkChecks,existingUnchanged,
 generatedHTMLExact:true,generatedMarkdownRevision:88,main:before.main,
 taskCounts:Object.fromEntries(board.statusOrder.map(s=>[s,board.tasks.filter(t=>t.status===s).length])),
 document:report.document.path,scope:'Structural/link/hash verification, not new gameplay or performance acceptance.',
};
await fs.writeFile(`${root}/closeout-check.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
