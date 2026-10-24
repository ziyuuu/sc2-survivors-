import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createReadStream} from 'node:fs';import assert from 'node:assert/strict';
const root='D:/星际',base=root+'/reports/local/integration-i03-20261022',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function hash(p){const h=createHash('sha256');for await(const chunk of createReadStream(p))h.update(chunk);return h.digest('hex');}
const before=await read(base+'/before.json'),allowed=new Set(['src/simulation/combat/expedition-combat.ts','src/simulation/progression/supply-cards.ts','src/simulation/starship/catalog-modules.ts','src/simulation/starship/drops.ts','src/ui/starship/effect-text.ts','test/intermission-integration.test.ts']),sources=before.files.filter(r=>/^(src|test)\//.test(r.path)),changed=[],unchanged=[];
for(const r of sources){const after=await hash(root+'/'+r.path);(after===r.sha256?unchanged:changed).push({...r,after});if(after!==r.sha256)assert.ok(allowed.has(r.path),r.path);}
assert.equal(changed.length,6);assert.equal(await hash(root+'/'+before.current.path),before.current.sha256);
const all=[];async function walk(dir){for(const e of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())await walk(f);else if(e.isFile())all.push(f);}}await walk('src');await walk('test');
const oldNames=new Set(sources.map(r=>r.path)),added=all.filter(f=>!oldNames.has(f));assert.deepEqual(added.sort(),['test/integration-i03.test.ts','test/integration-i03-effects.test.ts','test/integration-i03-dead-ends.test.ts','test/integration-i03-entry.test.ts'].sort());
const finalSources=[];for(const f of all){const dest=base+'/final-source/'+f;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(root+'/'+f,dest);finalSources.push({path:f,sha256:await hash(dest),bytes:(await fs.stat(dest)).size});}
await fs.writeFile(base+'/final-source.json',JSON.stringify({files:finalSources},null,2));
const delivery=[];for(const mode of ['game','lab']){
 const web=await read(base+'/web-'+mode+'-r1-build.json'),offline=await read(base+'/offline-'+mode+'-r1-build.json'),verification=await read(base+'/offline-'+mode+'-verification-r1.json');assert.ok(verification.pass);
 for(const r of web.inputs)assert.equal(await hash(root+'/'+r.path),r.sha256,r.path);
 for(const r of offline.inputs)assert.equal(await hash(root+'/'+r.file),r.sha256,r.file);
 const manifest=await read(web.out+'/'+web.manifest);assert.equal(await hash(web.out+'/'+web.manifest),web.manifestSha256);for(const r of web.resources)assert.equal(await hash(web.out+'/'+r.url),r.sha256,r.url);
 for(const r of web.artifacts)assert.equal(await hash(web.out+'/'+r.file),r.file.endsWith('.html')?web.htmlSha256:r.sha256,r.file);
 assert.equal(await hash(offline.out),offline.htmlSha256);assert.equal(Object.keys(manifest.assets).length,1909);assert.equal(web.resources.length,1852);
 delivery.push({mode,web: web.out,webInputs:web.inputs.length,offlineInputs:offline.inputs.length,assets:1909,resources:1852,chunks:verification.chunks,webJs:web.artifacts.find(r=>r.file.endsWith('.js')).sha256,offlineHtml:offline.htmlSha256,allInputsAndOutputsExact:true});
}
const report={pass:true,beforeSourceTests:sources.length,existingUnchanged:unchanged.length,changed,added,finalSourceTests:all.length,cameraInputUiAndRender:{unchanged:unchanged.filter(r=>/^(src\/ui\/|src\/render\/|src\/app\/)/.test(r.path)).map(r=>r.path),changed:['src/ui/starship/effect-text.ts']},current:before.current,delivery};
await fs.writeFile(base+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cameraInputUiAndRender:{unchanged:report.cameraInputUiAndRender.unchanged.length,changed:['src/ui/starship/effect-text.ts']},changed:changed.map(r=>r.path)}));
