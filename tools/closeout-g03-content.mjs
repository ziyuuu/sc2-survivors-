import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import assert from 'node:assert/strict';
const root='D:/星际',rel='reports/local/g03-content-20261022',base=root+'/'+rel,reportFile='reports/qa/g03-content-20261022.json';
const read=async f=>JSON.parse((await fs.readFile(root+'/'+f,'utf8')).replace(/^\uFEFF/,''));
async function hash(f){const h=createHash('sha256');for await(const b of createReadStream(f))h.update(b);return h.digest('hex');}
const r=await read(reportFile),board=await read('docs/project/performance-board.json'),before=await read(rel+'/before/docs/project/performance-board.json');
const preview=await read(rel+'/preview-health.json');assert.ok(preview.pass);assert.ok(preview.rows.every(x=>x.status===200));r.preview={file:rel+'/preview-health.json',...preview};
assert.equal(board.revision,124);assert.equal(board.next,'G03');assert.equal(board.tasks.find(t=>t.id==='G03').status,'进行中');
for(const t of board.tasks.filter(t=>t.id!=='G03'))assert.deepEqual(t,before.tasks.find(x=>x.id===t.id));
assert.ok(r.cleanup.pass&&r.cleanup.browserClosed&&r.cleanup.protectedExact);
const source=await read(rel+'/final-source.json');assert.equal(source.files.length,825);
for(const s of source.files){assert.equal(await hash(root+'/'+s.file),s.sha256,s.file);assert.equal(await hash(base+'/final-source/'+s.file),s.sha256,s.file);}
assert.equal(await hash(root+'/'+r.source.current.path),r.source.current.sha256);
assert.equal(await hash(r.source.offline.path),r.source.offline.htmlSha256);
const resourceHashes=new Map();
for(const mode of ['game','lab']){
  const b=await read(rel+'/web-'+mode+'-r2-build.json');
  for(const i of b.inputs)assert.equal(await hash(root+'/'+i.path),i.sha256,i.path);
  for(const a of b.artifacts)assert.equal(await hash(b.out+'/'+a.file),a.file.endsWith('.html')?b.htmlSha256:a.sha256,a.file);
  assert.equal(await hash(b.out+'/'+b.manifest),b.manifestSha256);
  for(const a of b.resources){let h=resourceHashes.get(a.source);if(!h){h=await hash(a.source);resourceHashes.set(a.source,h);}assert.equal(h,a.sha256,a.source);}
}
const ob=await read(rel+'/offline-game-r2-build.json');for(const i of ob.inputs)assert.equal(await hash(root+'/'+i.file),i.sha256,i.file);
const full=await fs.readFile(base+'/full-regression-r2.log','utf8');assert.match(full,/# tests 2264\r?\n/);assert.match(full,/# pass 2264\r?\n/);assert.match(full,/# fail 0\r?\n/);
assert.equal(await fs.stat(r.archive.target).then(()=>true,()=>false),false);assert.equal(await fs.stat(r.cleanup.profile).then(()=>true,()=>false),false);
await fs.access(r.archive.difference);await fs.access(r.archive.donor);
const links=[];
for(const f of ['preview/g03-content-20261022/index.html',rel+'/screen-review/index.html']){
  const html=await fs.readFile(root+'/'+f,'utf8');
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^https?:/.test(m[1]))continue;await fs.access(path.resolve(path.dirname(root+'/'+f),decodeURI(m[1])));links.push({from:f,target:m[1],exists:true});}
}
for(const f of ['docs/project/G03_CONTENT_INTEGRATION_20261022.md','docs/project/G03_DIFFICULTY_CONTENT_PLAN_20261022.md']){
  const md=await fs.readFile(root+'/'+f,'utf8');
  for(const m of md.matchAll(/\]\(([^)]+)\)/g)){if(/^https?:/.test(m[1]))continue;await fs.access(path.resolve(path.dirname(root+'/'+f),decodeURI(m[1])));links.push({from:f,target:m[1],exists:true});}
}
for(const f of board.tasks.find(t=>t.id==='G03').evidence)await fs.access(path.resolve(root+'/docs/project',f));
await fs.writeFile(base+'/links.json',JSON.stringify(links,null,2)+'\n');
const bound=['AGENTS.md','docs/project/performance-board.json','docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md','docs/project/G03_CONTENT_INTEGRATION_20261022.md','docs/project/G03_DIFFICULTY_CONTENT_PLAN_20261022.md','preview/g03-content-20261022/index.html',...r.visual.finalImages,...r.visual.archivedImages];
for(const f of await fs.readdir(base))if(/\.(json|log|mjs|mts|py|gz)$/.test(f)&&!f.startsWith('closeout-'))bound.push(rel+'/'+f);
for(const folder of ['qa-production-r1','qa-production-r2','qa-content-r1','qa-content-r2','screen-review'])for(const f of await fs.readdir(base+'/'+folder))if(/\.(json|html|jpg)$/.test(f))bound.push(rel+'/'+folder+'/'+f);
for(const f of await fs.readdir(root+'/tools'))if(f.includes('g03')&&/\.(mjs|mts|ps1|py)$/.test(f))bound.push('tools/'+f);
r.bound=[];for(const f of [...new Set(bound)])r.bound.push({file:f,bytes:(await fs.stat(root+'/'+f)).size,sha256:await hash(root+'/'+f)});
r.closeout={pass:true,all825FinalSourcesExact:true,buildInputsAndResourcesRecheckedAfterCleanup:true,currentExact:true,other61TasksUnchanged:true,allLocalLinksExist:true,localLinks:links.length,rawAndFinalEvidenceBound:r.bound.length,g03Steps1And2Complete:true,g03WholeTaskComplete:false,next:'G03',finalImages:33,allImagesViewed:55};
await fs.writeFile(root+'/'+reportFile,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.closeout));
