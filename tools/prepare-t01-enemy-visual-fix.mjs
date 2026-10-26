import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024',out=base+'/enemy-visual-fix-r1';
await fs.mkdir(out,{recursive:true});
const source=JSON.parse(await fs.readFile(base+'/actions-r21/frozen-web/build.json','utf8'));
const files=[];
for(const file of ['src/simulation/combat/enemy-specials.ts','src/simulation/types.ts','src/render/effects/source-combat-effects.ts','src/render/effects/combat-sculptures.ts']){
 const copy=out+'/'+file.replaceAll('/','__');let bytes;
 try{bytes=await fs.readFile(copy);}catch{
  bytes=await fs.readFile(file);
  // The first freeze stopped at a type-only module absent from esbuild inputs.
  // Recover the single renderer replacement and verify its exact prior SHA.
  if(file==='src/render/effects/source-combat-effects.ts')bytes=Buffer.from(bytes.toString('utf8').replace("const profile=e.kind==='skill-heal'&&e.unitType==='queen'?COMBAT_FX_PROFILES.get('queen-heal'):combatFxProfile(e);",'const profile=combatFxProfile(e);'));
 }
 const sha256=createHash('sha256').update(bytes).digest('hex'),input=source.inputs.find(f=>f.file===file);
 if(input)assert.equal(input.sha256,sha256);else assert.equal(file,'src/simulation/types.ts','Only type-only module may be absent from bundled inputs');
 try{await fs.writeFile(copy,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
 files.push({file,sha256,copy,verification:input?'frozen-build-input':'unchanged type-only source before patch'});
}
await fs.writeFile(out+'/plan.json',JSON.stringify({date:new Date().toISOString(),baseline:'actions-r21-r2',files,scope:['Restore original enemy queen transfusion, bile flight/impact, lurker spikes and roach spray from native simulation receipts.','Correct native enemy fan missile height without changing its collision or damage.','No new UI, geometry warnings, aura design, balance, cooldown or gameplay change.'],retainedFailures:['Native skill visual omissions','Fan air-height mismatch','Fixture framing and initial pose observations'],complete:false},null,2),{flag:'wx'});
console.log(JSON.stringify({files:files.length,out}));
