import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/mvp5-lifecycle-20261014',out=process.argv[2]??root+'/binding-r1.json';
assert.ok(out.startsWith(root+'/')&&!out.includes('..'));
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(root+'/baseline/baseline.json'),formal=await read('dist/MVP5-Lifecycle-Web-20261014-R2/build-inputs.json'),diagnostic=await read(root+'/diagnostic-r2/build-inputs.json'),offline=await read(root+'/offline-build-r2.json');
assert.deepEqual(diagnostic.inputs,formal.inputs);
const before=new Map(baseline.build.inputs.map(r=>[r.file,r]));
assert.equal(before.size,formal.inputs.length);
const changed=[];
for(const r of formal.inputs){assert.equal(sha(await fs.readFile(r.file)),r.sha256,r.file);assert.ok(before.has(r.file),r.file);if(before.get(r.file).sha256!==r.sha256)changed.push(r.file);}
assert.deepEqual(changed,['src/render/terrain/campaign-map.ts']);
for(const binding of [baseline.build,formal,diagnostic])for(const r of binding.builtFiles)assert.equal(sha(await fs.readFile(path.join(binding.output,r.file))),r.sha256,r.file);
for(const r of baseline.resources)assert.equal(sha(await fs.readFile(r.file)),r.sha256,r.file);
assert.equal(offline.appBuildId,formal.appBuildId);assert.deepEqual(offline.inputs,formal.inputs);
const script=await fs.readFile(path.join(formal.output,offline.script.file),'utf8'),style=await fs.readFile(path.join(formal.output,offline.style.file),'utf8'),expected='<script type="module">'+script.replace(/<\/script/gi,'<\\/script')+'</script>';
const handle=await fs.open(offline.html.path,'r');
try{const size=(await handle.stat()).size,tail=Buffer.alloc(Buffer.byteLength(expected)+1000);await handle.read(tail,0,tail.length,size-tail.length);assert.ok(tail.toString('utf8').includes(expected),'Actual HTML module differs from formal Web');const head=Buffer.alloc(Buffer.byteLength(style)+1500000);await handle.read(head,0,head.length,0);assert.ok(head.toString('utf8').includes('<style>'+style.replaceAll('</style','<\\/style')+'</style>'),'Actual HTML CSS differs');}finally{await handle.close();}
const own=new Set(['tools/freeze-environment-lifecycle.mjs','tools/qa-environment-lifecycle.mts','tools/build-environment-main.mts','tools/prepare-current-handoff.mts','tools/qa-current-handoff.mjs','docs/project/MVP5_FULL_MAP_PLAN_20261014.md','docs/project/MVP5_FULL_MAP_20261014.md']),protectedRows=[];
for(const r of baseline.unrelated){if(own.has(r.file))continue;const b=await fs.readFile(r.file).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));protectedRows.push({file:r.file,before:r.sha256,after:b?sha(b):null,unchanged:(b?sha(b):null)===r.sha256});}
const result={at:new Date().toISOString(),passed:true,formalAppBuildId:formal.appBuildId,diagnosticAppBuildId:diagnostic.appBuildId,compiledInputs:formal.inputs.length,productionInputsChanged:changed,formalAndDiagnosticInputsExact:true,htmlFormalModuleAndCssExact:true,retainedResourceFiles:baseline.resources.length,resourceRelease:formal.resources.release,otherWorkingFiles:{total:protectedRows.length,unchanged:protectedRows.filter(r=>r.unchanged).length,changed:protectedRows.filter(r=>!r.unchanged)},scope:'Read-only comparison; changed unrelated files are reported, never overwritten. Baseline, formal, diagnostic and actual HTML stay distinct evidence builds.'};
await fs.writeFile(out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
