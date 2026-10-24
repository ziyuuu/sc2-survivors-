import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as old from '../reports/local/v01-20261024/dense-particle-candidate-r3/baseline.mjs';
import * as candidate from '../reports/local/v01-20261024/dense-particle-candidate-r3/candidate.mjs';
const base='reports/local/v01-20261024/dense-particle-candidate-r3';
const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const ground=p=>Math.sin(p.x*.2)*.1+Math.cos(p.z*.3)*.1,report={scope:'Exact numeric particle output and lifecycle comparison against frozen current implementation. Microbenchmark separate from browser performance.',cases:0,quads:0,models:0,benchmarks:[],pass:false};
const oldCache=new old.SourceParticleCache(),newCache=new candidate.SourceParticleCache(),tinyOld=new old.SourceParticleCache(2),tinyNew=new candidate.SourceParticleCache(2);
let frame=0;
for(const def of Object.values(old.SOURCE_EFFECTS)){
 report.models++;const current=candidate.SOURCE_EFFECTS[def.id];
 for(const seed of [17,529])for(const loop of [false,true])for(const age of [0,.13,.13,.44,.81,1.31,3.7,10.1,19.97,.2]){
  frame++;const request={model:def.id,key:def.id+':'+seed,seed,loop,age,stopAt:age>3?2.1:undefined,placement:{x:Math.sin(frame),y:1,z:Math.cos(frame),facing:frame*.01,age,from:{x:-1,y:0,z:-1},end:frame%2?undefined:{x:3,y:2,z:8}}};
  oldCache.begin(frame);newCache.begin(frame);tinyOld.begin(frame);tinyNew.begin(frame);
  const expected=old.sourceParticleQuads(def,request,camera,ground,oldCache),actual=candidate.sourceParticleQuads(current,request,camera,ground,newCache);
  assert.deepEqual(actual,expected,def.id+'/'+seed+'/'+loop+'/'+age);assert.deepEqual(candidate.sourceParticleQuads(current,request,camera,ground,tinyNew),old.sourceParticleQuads(def,request,camera,ground,tinyOld),def.id+'/tiny');
  oldCache.end();newCache.end();tinyOld.end();tinyNew.end();assert.deepEqual(newCache.report(),oldCache.report());assert.deepEqual(tinyNew.report(),tinyOld.report());report.cases++;report.quads+=expected.length;
 }
}
for(const cache of [oldCache,newCache,tinyOld,tinyNew]){cache.begin(++frame);cache.end();assert.equal(cache.report().liveBirths,0);assert.equal(cache.report().requests,0);cache.reset();}
const input=JSON.parse(await fs.readFile('reports/local/performance-x01-x02-20261020/native-cpu-1/report.json'));
for(const c of input.cases){const caches={old:new old.SourceParticleCache(),new:new candidate.SourceParticleCache()},render=(api,cache,exact=false)=>{const result=[];let count=0;cache.begin(c.time);for(const {request:r}of c.requests){const q=api.sourceParticleQuads(api.SOURCE_EFFECTS[r.model],r,camera,ground,cache);count+=q.length;if(exact)result.push(...q);}cache.end();return exact?result:count;};assert.deepEqual(render(candidate,caches.new,true),render(old,caches.old,true));for(let n=0;n<20;n++){render(old,caches.old);render(candidate,caches.new);}const rounds=[];for(let n=0;n<12;n++){const row={round:n};for(const key of n%2?['new','old']:['old','new']){const start=performance.now();for(let k=0;k<10;k++)render(key==='old'?old:candidate,caches[key]);row[key]=(performance.now()-start)/10;}rounds.push(row);}const mean=k=>rounds.reduce((n,r)=>n+r[k],0)/rounds.length;report.benchmarks.push({name:c.name,requests:c.requests.length,particles:render(candidate,caches.new),oldMs:mean('old'),newMs:mean('new'),changePercent:(mean('new')/mean('old')-1)*100,fasterPairs:rounds.filter(r=>r.new<r.old).length,rounds});}
report.pass=true;await fs.writeFile(base+'/verification.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({...report,benchmarks:report.benchmarks.map(({rounds,...r})=>r)},null,2));
