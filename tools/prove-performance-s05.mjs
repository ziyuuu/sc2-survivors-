import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s05-20261020',read=async p=>JSON.parse(await fs.readFile(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read('preview/performance-s05-20261020-baseline-r2/build-inputs.json'),candidate=await read('preview/performance-s05-20261020-candidate-r2/build-inputs.json'),nodeOld=await read(root+'/baseline-r2-logic/build-inputs.json'),nodeNew=await read(root+'/candidate-r2-logic/build-inputs.json');
const changed=candidate.inputs.filter(x=>x.file.startsWith('src/')&&baseline.inputs.find(y=>y.file===x.file)?.sha256!==x.sha256);
assert.deepEqual(changed.map(x=>x.file).sort(),candidate.changes.slice().sort());assert.equal(changed.length,7);
for(const x of changed){assert.equal(hash(await fs.readFile(x.file)),x.sha256);const n=nodeNew.inputs.find(y=>y.file===x.file);if(n)assert.equal(n.sha256,x.sha256);else assert.equal(x.file,'src/ui/hud.ts');}
for(const build of [baseline,candidate,nodeOld,nodeNew])for(const x of build.outputs)assert.equal(hash(await fs.readFile(x.file)),x.sha256);
for(const x of candidate.inputs.filter(x=>x.file.startsWith('src/')&&!candidate.changes.includes(x.file)))assert.equal(hash(await fs.readFile(candidate.previous+'/'+x.file)),x.sha256);
for(const x of baseline.inputs.filter(x=>x.file.startsWith('src/')))assert.equal(hash(await fs.readFile(baseline.previous+'/'+x.file)),x.sha256);
await fs.writeFile(root+'/source-proof.json',JSON.stringify({pass:true,changed,baseline,candidate,nodeOld,nodeNew,excludedWorkspaceChange:'src/render/units/economic-egg.ts',boundary:'S08 final frozen inputs; seven S05 simulation/UI inputs differ. No history deletion, no stats/observer/telemetry mutation.'},null,2));console.log(JSON.stringify({pass:true,changed:changed.map(x=>x.file),webInputs:candidate.inputs.length,nodeInputs:nodeNew.inputs.length}));
