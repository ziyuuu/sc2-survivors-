import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root='reports/local/t01-20261024/actions-r24-r2',report=JSON.parse(await fs.readFile(root+'/report.json','utf8'));
const result={date:new Date().toISOString(),scope:'Re-evaluate all existing interrupted-cycle state samples with per-case diagnostic damage. Original report and images remain unchanged. No new browser run or visual pass.',rows:[]};
assert.equal(report.rows.length,14);assert.deepEqual(report.errors,[]);assert.equal(report.profileClosed,true);
for(const row of report.rows){
 const file=report.evidenceRoot+'/'+row.directory+'/'+report.evidenceFile,bytes=await fs.readFile(file),e=JSON.parse(gunzipSync(bytes));
 const b=e.before,a=e.after,kind=a.enemy.receipt.firstCast.kind,condition=a.enemy.receipt.interruption.condition;
 const damage=a.enemy.diagnostic.damage-b.enemy.diagnostic.damage,cancelled=condition==='before-commit'&&kind!=='bile';
 assert.equal(a.enemy.receipt.spawn.nativeLevel,1);assert.ok(a.enemy.receipt.interruption);assert.ok(!a.actor||a.actor.hp<=0);assert.ok(a.elapsed>=16-1e-7);
 if(cancelled){assert.equal(damage,0);assert.equal(row.status,'failed');assert.match(row.failure,/Uncommitted enemy skill caused damage/);}
 else {assert.equal(row.status,'cycle-captured');assert.ok(damage>0);}
 for(const f of e.frames){assert.equal(f.state.phase,'battle');assert.deepEqual(f.state.render.errors,[]);assert.equal(f.state.render.assetsPending,0);if(cancelled)assert.equal(f.state.enemy.diagnostic.damage,b.enemy.diagnostic.damage);}
 assert.equal(a.enemy.casts.length+a.enemy.missiles.length+a.enemy.charges.length+a.enemy.acidZones.length+a.enemy.corrosionZones.length,0);
 assert.equal(a.render.sourceCombat.source.activeRequests.filter(k=>k.startsWith('enemy-special:')).length,0);
 result.rows.push({id:row.id,originalStatus:row.status,status:'state-checks-passed',condition,kind,damage,beforeCounter:b.enemy.diagnostic.damage,afterCounter:a.enemy.diagnostic.damage,frames:e.frames.length,evidence:file,sha256:createHash('sha256').update(bytes).digest('hex'),visualReview:'pending'});
}
result.pass=true;await fs.writeFile(root+'/state-recheck-r1.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({passed:result.rows.length,originalFailuresRetained:result.rows.filter(r=>r.originalStatus==='failed').length,rows:result.rows.map(r=>({id:r.id,damage:r.damage}))}));
