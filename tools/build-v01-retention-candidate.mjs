import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';let code=await fs.readFile(base+'/build-web.mjs','utf8');
const before='plugins:[{name:';assert.equal(code.split(before).length,2);
code=code.replace(before,`plugins:[{name:'isolated-spike-retention-candidate',enforce:'pre',async transform(code,id){if(id.replaceAll('\\\\','/').endsWith('/src/render/units/animated-batch.ts'))return fs.readFile(base+'/spike-retention-candidate/src/render/units/animated-batch.ts','utf8');}},{name:`);
code=code.replace('production bytes recorded unchanged','isolated replaced-material retention candidate; original input bytes and separate patch hash recorded');
await fs.writeFile(base+'/build-retention-candidate.mjs',code,{flag:'wx'});console.log('Prepared isolated candidate build.');
