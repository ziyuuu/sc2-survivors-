import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-d04-20261021',variant=process.argv[2]??'candidate-r23',hash=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const before=await read(root+'/inputs-before.json'),build=await read('preview/performance-d04-20261021-'+variant+'/build-inputs.json'),baseline=await read(build.baseline+'/build-inputs.json'),changed=[];
for(const f of before.files)if(hash(await fs.readFile(f.file))!==f.sha256)changed.push(f.file);
const oldChanged=build.changes.filter(file=>before.files.some(f=>f.file===file));
assert.deepEqual(changed.sort(),oldChanged.sort());
for(const f of build.inputs.filter(f=>f.file.startsWith('src/'))){assert.equal(hash(await fs.readFile(f.source)),f.sha256,f.source);if(!build.changes.includes(f.file))assert.equal(f.sha256,baseline.inputs.find(x=>x.file===f.file)?.sha256,f.file);else assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);}
for(const f of build.outputs)assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);
const overrideKinds=[];for(const file of [...new Set(build.overrides)]){const actual=await fs.readFile(file,'utf8'),frozen=await fs.readFile(root+'/baseline-inputs/'+file,'utf8');overrideKinds.push({file,kind:actual.replaceAll('\r\n','\n')===frozen.replaceAll('\r\n','\n')?'line-endings-only':'content'});}
assert.deepEqual(overrideKinds.filter(x=>x.kind==='content').map(x=>x.file),['src/render/units/economic-egg.ts']);
const tests=['test/battle-preload.test.ts','test/first-boss-preload.test.ts','test/battle-streaming.test.ts'];
for(const file of tests)assert.ok((await fs.stat(file)).isFile());
const result={pass:true,existingSourceAndTestFiles:before.files.length,changedExisting:changed,unchangedExisting:before.files.length-changed.length,existingTestsChanged:changed.filter(f=>f.startsWith('test/')).length,added:[...build.changes.filter(f=>!oldChanged.includes(f)),...tests],frozenBaselineProduction:baseline.inputs.filter(x=>x.file.startsWith('src/')).length,finalProduction:build.inputs.filter(x=>x.file.startsWith('src/')).length,unchangedFrozenProduction:build.inputs.filter(x=>x.file.startsWith('src/')&&!build.changes.includes(x.file)).length,overrideKinds,main:build.outputs[0]};
await fs.writeFile(root+'/scope-final.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,overrideKinds:{lineEndings:overrideKinds.filter(x=>x.kind==='line-endings-only').length,content:overrideKinds.filter(x=>x.kind==='content')}}));
