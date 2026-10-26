import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024',read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const old=await read(base+'/actions-r18/report.json'),current=await read(base+'/actions-r19/report.json');
assert.equal(current.profileClosed,true);assert.equal(current.rows.length,60);
const fields=['time','elapsed','phase','actor','target','patient','events','spells','eliteFields','casts','receipt','memoryOnly'];
const evidence=async(r,row)=>{const file=r.evidenceRoot+'/'+row.directory+'/'+r.evidenceFile,bytes=await fs.readFile(file);return {file,sha256:createHash('sha256').update(bytes).digest('hex'),data:JSON.parse(gunzipSync(bytes))};};
const rows=[];
for(const row of old.rows){
 const next=current.rows.find(r=>r.id===row.id);assert.equal(next?.status,'cycle-captured');
 const a=await evidence(old,row),b=await evidence(current,next),differences=[];let samples=0;
 const compare=(label,x,y)=>{samples++;for(const key of fields)if(!isDeepStrictEqual(x[key],y[key]))differences.push({sample:label,field:key});};
 compare('before',a.data.before,b.data.before);compare('trigger',a.data.trigger,b.data.trigger);
 for(const f of a.data.frames){const n=b.data.frames.find(n=>Math.abs(n.at-f.at)<1e-9);assert.ok(n);compare(f.at,f.state,n.state);}
 const tail=b.data.frames.filter(f=>f.at>=3.6).map(f=>({at:f.at,needleMeshes:f.state.render.sourceCombat.source.modelDraws.find(d=>d.model==='NeedleSpinesWeapon')?.meshes??0,poisonHosts:f.state.render.zergElites?.poisonHosts??0}));
 const firstShot=b.data.frames.filter(f=>f.at<=.35).map(f=>({at:f.at,flights:f.state.projectiles?.flights??[],lines:f.state.projectiles?.lines??[],endings:f.state.projectiles?.endings??[],needleMeshes:f.state.render.sourceCombat.source.modelDraws.find(d=>d.model==='NeedleSpinesWeapon')?.meshes??0}));
 rows.push({id:row.id,evidence:{before:{file:a.file,sha256:a.sha256},after:{file:b.file,sha256:b.sha256}},samples,identical:!differences.length,differences,tail,firstShot});
}
const result={scope:'Same native simulation and stop fixture; camera zoom and additional read-only dense captures differ. Before/trigger and all common sample states are compared, including post-stop state. Visual review is tracked separately.',fields,rows,simulationMismatches:rows.filter(r=>!r.identical).length,needleResidualRows:rows.filter(r=>r.tail.some(t=>t.needleMeshes>0)).length};
await fs.writeFile(base+'/ending-mesh-fix-r1/state-comparison.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({rows:rows.length,samples:rows.reduce((n,r)=>n+r.samples,0),simulationMismatches:result.simulationMismatches,needleResidualRows:result.needleResidualRows}));
assert.equal(result.simulationMismatches,0);assert.equal(result.needleResidualRows,0);
