import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-d04-complete-20261021';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p));
const before=await read(root+'/source-before.json');
const changed=[];for(const f of before){const b=await fs.readFile(f.file);if(sha(b)!==f.sha256)changed.push(f.file);}
const expected=['src/app/background-preparation.ts','src/app/bootstrap.ts','src/render/scene/battle-renderer.ts','src/render/materials/unit-material-batch.ts','src/render/units/animated-batch.ts','src/render/scene/fort-materials.ts','test/battle-preload.test.ts'].sort();
assert.deepEqual(changed.sort(),expected);
async function files(dir){const out=[];for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;out.push(...(f.isDirectory()?await files(p):[p]));}return out;}
const original=new Set(before.map(f=>f.file));const added=(await Promise.all(['src','test'].map(files))).flat().filter(f=>!original.has(f));
assert.deepEqual(added.sort(),['test/battle-preload-complete.test.ts','test/material-depth-program-cache.test.ts']);
const build=await read(root+'/r7/build-inputs.json'),oldBuild=await read('preview/performance-d04-20261021-candidate-r23/build-inputs.json');
const oldInputs=new Map(oldBuild.inputs.map(f=>[f.file,f]));const inputs=build.inputs.filter(f=>f.file.startsWith('src/'));
for(const f of inputs){assert.equal(sha(await fs.readFile(f.source)),f.sha256);if(!build.changes.includes(f.file))assert.equal(f.sha256,oldInputs.get(f.file).sha256);else assert.equal(sha(await fs.readFile(f.file)),f.sha256);}
for(const f of build.outputs)assert.equal(sha(await fs.readFile(f.file)),f.sha256);
const baseline=await read('reports/local/performance-d04-20261021/final-baseline-web-r1/report.json');
const oldKeys=baseline.cycles[0].ready.models.slice().sort();
const functional=await read(root+'/functional-r7/report.json');
const completed=functional.checks.find(c=>c.status?.complete&&Array.isArray(c.models));assert.ok(completed);
assert.deepEqual(completed.models.slice().sort(),oldKeys);
const r5=await read(root+'/formal-r5-terran/report.json'),r7=await read(root+'/formal-r7-terran/report.json');
const equality=[];
for(let i=0;i<3;i++){
 const a=r5.cycles[0].stages[i],b=r7.cycles[0].stages[i];
 const rows=[['initial',a.initial,b.initial],['final',a.final,b.final]];
 const indexed=new Map(a.snapshots.map(s=>[s.tick,s]));
 for(const s of b.snapshots)if(indexed.has(s.tick))rows.push(['tick-'+s.tick,indexed.get(s.tick).state,s.state]);
 for(const [label,one,two]of rows){const equal=one===two;equality.push({stage:i+1,label,equal,baselineSha256:sha(one),candidateSha256:sha(two)});}
}
const result={pass:equality.every(r=>r.equal),existing:before.length,unchanged:before.length-changed.length,changed,added,productionInputs:inputs.length,unchangedFrozenInputs:inputs.length-build.changes.length,outputs:build.outputs,originalBatchModels:{baseline:oldKeys.length,completed:completed.models.length,exact:true,keys:oldKeys},stateComparison:{scope:'R5 and R7 cold native campaigns, identical full-preload work and controller, native run UUID pinned; reported state already excludes notice/noticeUntil only.',count:equality.length,exact:equality.filter(r=>r.equal).length,rows:equality}};
await fs.writeFile(root+'/verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,originalBatchModels:{...result.originalBatchModels,keys:undefined},stateComparison:{...result.stateComparison,rows:equality.filter(r=>!r.equal)}}));
assert.ok(result.pass,'Paired native states differ; inspect before claiming equivalence');
