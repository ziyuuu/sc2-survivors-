import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',read=async file=>JSON.parse(await fs.readFile(base+'/'+file,'utf8'));
const a=await read('enemy-branches-audit-r1.json'),b=await read('enemy-branches-audit-r2.json'),c=await read('enemy-branches-audit-r3.json');
const prior=new Map([...a.rows,...a.failures,...b.rows,...b.failures].map(r=>[r.id,r]));
const rows=[];
for(const r of [...c.rows,...c.failures]){
 const old=prior.get(r.id);assert.ok(old);const before=structuredClone(old.stats),after=structuredClone(r.stats);
 // This field was added when the original hit-fixture assertion was repaired.
 if(!('actorHpAfterTrigger' in before))delete after.actorHpAfterTrigger;
 rows.push({id:r.id,statsEqual:isDeepStrictEqual(before,after),initialEqual:!old.initial||isDeepStrictEqual(old.initial,r.initial),finalEqual:!old.final||isDeepStrictEqual(old.final,r.final),sameFailure:!old.error||old.error===r.error});
}
assert.equal(rows.length,2633);
const differences=rows.filter(r=>!r.statsEqual||!r.initialEqual||!r.finalEqual||!r.sameFailure);
const evidence=await Promise.all(['enemy-branches-audit-r1.json','enemy-branches-audit-r2.json','enemy-branches-audit-r3.json'].map(async name=>({file:base+'/'+name,sha256:createHash('sha256').update(await fs.readFile(base+'/'+name)).digest('hex')})));
await fs.writeFile(base+'/enemy-visual-fix-r1/native-comparison.json',JSON.stringify({scope:'Native per-case cycle statistics, initial/final actors and patients before/after rendering receipt additions. This is not full World equality or visual acceptance.',evidence,rows,differences,passed:c.rows.length,retainedFailures:c.failures.map(r=>({id:r.id,error:r.error}))},null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,differences,passed:c.rows.length,retainedFailures:c.failures.length}));assert.equal(differences.length,0);
