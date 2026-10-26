import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',run=process.argv[2]??'actions-r22-r4',fixed=run==='actions-r23-r2',name=process.argv[3]??'state-comparison-r1.json';
assert.ok(['actions-r22-r4','actions-r22-r5','actions-r23-r2'].includes(run));assert.match(name,/^state-comparison-r\d+\.json$/);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),a=await read(base+'/actions-r21-r2/report.json'),b=await read(base+'/'+run+'/report.json');
assert.equal(b.complete,true);assert.equal(b.errors.length,0);
const prior=new Map(a.rows.map(r=>[r.id,r])),rows=[];
async function evidence(report,row){const file=report.evidenceRoot+'/'+row.directory+'/'+report.evidenceFile,bytes=await fs.readFile(file);return {file,sha256:createHash('sha256').update(bytes).digest('hex'),data:JSON.parse(gunzipSync(bytes).toString('utf8'))};}
const keys=['caseId','playing','speed','time','elapsed','phase','initial','enemy','diagnostic','actor','target','patient','events','spells','eliteFields','casts','receipt','memoryOnly'];
function state(raw,origin,id){
 const s=structuredClone(Object.fromEntries(keys.map(k=>[k,raw[k]])));
 function walk(o){
  if(!o||typeof o!=='object')return;
  if(Array.isArray(o)){for(const v of o)walk(v);return;}
  for(const [k,v] of Object.entries(o)){
   if(k==='diagnostic'&&v&&typeof v==='object'&&'damage'in v){v.damage=Math.round((v.damage-origin.damage)*1e8)/1e8;v.prevented-=origin.prevented;}
   if(fixed&&k==='visual'&&o.kind&&o.origin&&o.points){assert.equal(typeof v.duration,'number');delete o[k];}
   else if(fixed&&k==='visualFlight'&&'cast'in o&&'remaining'in o){delete o[k];}
   else walk(v);
  }
 }
 walk(s);
 if(fixed){s.events=s.events.filter(e=>e.kind!=='enemy-special-impact'&&!(id.includes(':queen:')&&id.endsWith(':skill')&&e.kind==='skill-heal'));for(const e of s.events)delete e.serial;}
 return s;
}
for(const row of b.rows){
 assert.equal(row.status,'cycle-captured');const old=prior.get(row.id);assert.ok(old);
 const before=await evidence(a,old),after=await evidence(b,row),x=before.data,y=after.data;
 const pairs=[['before',x.before,y.before],...y.frames.map((f,i)=>{assert.equal(f.at,x.frames[i]?.at);return [String(f.at),x.frames[i].state,f.state];}),['after',x.after,y.after]];
 assert.equal(x.frames.length,y.frames.length);
 const differences=[];for(const [at,s,t] of pairs){const p=state(s,x.before.diagnostic,row.id),q=state(t,y.before.diagnostic,row.id);if(!isDeepStrictEqual(p,q))differences.push({at,keys:keys.filter(k=>!isDeepStrictEqual(p[k],q[k]))});}
 rows.push({id:row.id,samples:pairs.length,differences,diagnosticBaseline:{before:x.before.diagnostic,after:y.before.diagnostic},evidence:[{file:before.file,sha256:before.sha256},{file:after.file,sha256:after.sha256}]});
}
const mismatches=rows.filter(r=>r.differences.length),result={scope:'Compare every captured native state sample, before and after; rendering/audio/resource wait telemetry is intentionally outside gameplay state comparison.',baseline:'actions-r21-r2',run,fixed,keys,normalization:['Diagnostic counters persist across loads of the same World; compare per-case increments from the saved before state, with 1e-8 rounding only for diagnostic damage.',...(fixed?['Ignore only newly added native cast.visual and missile.visualFlight presentation metadata.','Ignore newly added enemy-special-impact and queen special skill-heal receipts; compare all pre-existing event fields except their shifted visual serials.']:[])],rows,mismatches:mismatches.length,samples:rows.reduce((n,r)=>n+r.samples,0)};
await fs.writeFile(base+'/'+run+'/'+name,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({rows:rows.length,samples:result.samples,mismatches:mismatches.map(r=>({id:r.id,differences:r.differences.slice(0,2)}))}));assert.equal(mismatches.length,0);
