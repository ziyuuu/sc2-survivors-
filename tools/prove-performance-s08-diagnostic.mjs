import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const root='reports/local/performance-s08-20261020',records=[];
for(const mode of ['baseline','candidate']){
 const old=JSON.parse(await fs.readFile(`preview/performance-s08-20261020-${mode}-r2/build-inputs.json`)),current=JSON.parse(await fs.readFile(`preview/performance-s08-20261020-${mode}-r3/build-inputs.json`));
 assert.deepEqual(old.inputs.filter(x=>x.file.startsWith('src/')),current.inputs.filter(x=>x.file.startsWith('src/')));
 const changes=current.inputs.filter(x=>old.inputs.find(y=>y.file===x.file)?.sha256!==x.sha256);
 assert.ok(changes.every(x=>x.file==='tools/performance-s08-runtime.ts'||x.file.startsWith('preview/performance-s08-')));
 records.push({mode,productionInputsExact:true,changes,oldOutputs:old.outputs,currentOutputs:current.outputs});
}
await fs.writeFile(root+'/diagnostic-r3-proof.json',JSON.stringify({pass:true,records,reason:'R2 manual allied maxHp mutation caused native wound-preserving stat refresh to zero patients. R3 leaves maxima native and resets diagnostic wounds to 25% before each real tick, disabling resets before 900-step tail and audio lifecycle. QA now asserts full 120/900 ticks, battle phase and living recipients. All production files and existing CPU benchmark input bundles unchanged.'},null,2));
console.log(JSON.stringify({pass:true,productionInputsExact:true}));
