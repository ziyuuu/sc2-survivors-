import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',read=async run=>JSON.parse(await fs.readFile(base+'/'+run+'/report.json','utf8'));
const old=await read('actions-r16'),current=await read('actions-r17'),rows=[];
const evidence=async(r,row)=>JSON.parse(gunzipSync(await fs.readFile(r.evidenceRoot+'/'+row.directory+'/evidence.json.gz')));
const fields=['time','elapsed','phase','actor','target','patient','events','spells','eliteFields','casts','receipt','memoryOnly'];
const simulation=s=>Object.fromEntries(fields.map(k=>[k,s[k]]));
for(const row of old.rows){
 const next=current.rows.find(r=>r.id===row.id);assert.ok(next&&next.status==='cycle-captured');
 const a=await evidence(old,row),b=await evidence(current,next);let samples=0;
 assert.deepEqual(simulation(a.before),simulation(b.before));samples++;
 assert.deepEqual(simulation(a.trigger),simulation(b.trigger));samples++;
 for(const f of a.frames.filter(f=>f.at<=3)){const n=b.frames.find(n=>n.at===f.at);assert.ok(n);assert.deepEqual(simulation(n.state),simulation(f.state));samples++;}
 rows.push({id:row.id,samples,identical:true,comparison:'before, trigger and every recorded state through the 3-second frame, before test-only suppression differs'});
}
const files=['src/render/loaders/animations.ts','src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','test/animations.test.ts','tools/qa-t01-cycles.mjs'];
const sources=await Promise.all(files.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const result={scope:'Observed simulation state equality across the rendering fix. Post-stop states intentionally differ because the old test fixture incorrectly delayed pending windups.',fields,rows,sources};
await fs.writeFile(base+'/thor-attack-fix-r1/state-comparison.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({rows:rows.length,samples:rows.reduce((n,r)=>n+r.samples,0)}));
