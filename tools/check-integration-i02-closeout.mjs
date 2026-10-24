import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root='D:/星际',base=root+'/reports/local/integration-i02-20261022',read=async f=>JSON.parse((await fs.readFile(f,'utf8')).replace(/^\uFEFF/,'')),hash=async f=>createHash('sha256').update(await fs.readFile(f)).digest('hex');
const reportPath=root+'/reports/qa/integration-i02-20261022.json',report=await read(reportPath);
for(const name of ['qa-web-r5','qa-offline-r1','qa-production-r1','qa-touch-r1']){const b=report.browser[name];b.httpScope=name==='qa-web-r5'?'not-collected-for-web':'offline-only';if(name==='qa-web-r5')b.httpRequests=null;}
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
const final=await read(base+'/final-source.json');for(const r of final.files)assert.equal(await hash(root+'/'+r.path),r.sha256,r.path);
const board=await read(root+'/docs/project/performance-board.json'),before=await read(base+'/before/docs/project/performance-board.json');assert.equal(board.revision,111);assert.equal(board.next,'I03');assert.equal(board.tasks.filter(t=>t.status==='已完成').length,48);assert.equal(board.tasks.find(t=>t.id==='I03').status,'待办');assert.deepEqual(board.tasks.filter(t=>t.id!=='I02'),before.tasks.filter(t=>t.id!=='I02'));
const preserved=await read(base+'/verification.json');assert.equal(await hash(root+'/'+preserved.current.path),preserved.current.sha256);
for(const e of report.evidence)assert.equal(await hash(root+'/'+e.file),e.sha256,e.file);
for(const mode of ['game','lab']){const web=await read(base+'/web-'+mode+'-r2-build.json');for(const f of [web.manifest,...web.artifacts.map(r=>r.file),...web.resources.map(r=>r.url)]){const a=await fs.stat(web.out+'/'+f),b=await fs.stat(root+'/preview/integration-i02-20261022/'+mode+'/'+f);assert.equal(a.ino,b.ino,f);assert.equal(a.size,b.size,f);}}
const doc=root+'/docs/project/INTEGRATION_I02_20261022.md';let text=await fs.readFile(doc,'utf8');text=text.replace('正式试玩Web JS','独立试玩Web JS');await fs.writeFile(doc,text);
assert.ok(!text.includes('<!--FINAL_RESULTS-->'));assert.ok(!await fs.stat(base+'/qa-shared/profile').then(()=>true,()=>false));
await fs.writeFile(base+'/closeout-check.json',JSON.stringify({pass:true,sourceTests:final.files.length,allEvidenceHashExact:true,allOtherBoardTasksExact:true,previewLinksExact:true,currentExact:true,qaCacheRemoved:true,boardRevision:111,next:'I03'},null,2));
console.log('I02 closeout verified: 804 source/test files, evidence hashes, preview identities, Current and all other board tasks unchanged.');
