import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const root='reports/local/performance-r02-20261020',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const report=await read('reports/qa/performance-r02-20261020.json'),board=await read('docs/project/performance-board.json');
assert.equal(report.status,'verified-local');assert.equal(board.tasks.find(t=>t.id==='R02').status,'已完成');assert.equal(board.tasks.find(t=>t.id==='R03').status,'待办');assert.equal(board.next,'R03');assert.equal(board.tasks.length,50);assert.equal(board.tasks.filter(t=>t.status==='已完成').length,33);assert.equal(board.auditRows.length,169);
let files=0;for(const f of report.artifacts.files){const b=await fs.readFile(f.file);assert.equal(b.length,f.bytes,f.file);assert.equal(hash(b),f.sha256,f.file);files++;}
const build=await read('preview/performance-r02-20261020-candidate-r3/build-inputs.json');
for(const input of build.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r3-web-inputs/'+input.file)),input.sha256,input.file);
const views=['docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md'],before=await Promise.all(views.map(async p=>hash(await fs.readFile(p))));execFileSync(process.execPath,['tools/render-performance-board.mjs'],{stdio:'pipe'});const after=await Promise.all(views.map(async p=>hash(await fs.readFile(p))));assert.deepEqual(after,before,'Generated views not synchronized');
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md'])assert.ok((await fs.readFile(file,'utf8')).includes('project/PERFORMANCE_R02_20261020.md'));
for(const e of board.tasks.find(t=>t.id==='R02').evidence)await fs.access(new URL('../docs/project/'+e,import.meta.url));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(head,'be9e2982944314194c6dcc9dcc535bc321749eb4');
const output={pass:true,evidenceFiles:files,archivedCompilationInputs:build.inputs.length,head,boardRevision:board.revision,totalTasks:50,completed:33,next:'R03',auditRows:169,generatedViewsExact:true,sourceChanges:report.source.changed,finalOutputs:report.source.outputs,pixels:report.pixels.comparisons,review:report.review};
await fs.writeFile(root+'/closeout-verification.json',JSON.stringify(output,null,2));console.log(JSON.stringify({pass:true,files,revision:board.revision,completed:33,next:'R03'}));
