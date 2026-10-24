import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import * as THREE from 'three';
import * as old from '../reports/local/performance-x01-x02-20261020/baseline-numeric.mjs';
const revision=process.argv[2]??'candidate',current=await import('../reports/local/performance-x01-x02-20261020/'+revision+'-numeric.mjs');
const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const report={definitions:0,cases:0,quads:{particles:0,ribbons:0,projections:0},cache:[],hash:null,pass:false},digest=createHash('sha256');
const ground=p=>Math.sin(p.x*.2)*.1+Math.cos(p.z*.3)*.1;
for(const id of Object.keys(old.SOURCE_EFFECTS)){
 const before=old.SOURCE_EFFECTS[id],after=current.SOURCE_EFFECTS[id];report.definitions++;const a=new old.SourceParticleCache(),b=new current.SourceParticleCache();
 for(const loop of [false,true])for(const seed of [1,529])for(const age of [0,.07,.31,.9,2.5,5,.31,.31]){
  const request={model:id,key:id+':'+seed,age,seed,loop,hostedBeam:true,placement:{x:1,y:2,z:3,facing:.7,scale:1.2,end:{x:4,y:1,z:7},from:{x:-2,y:3,z:0},age}};
  a.begin(age);b.begin(age);
  for(const [kind,name,argsA,argsB]of [['particles','sourceParticleQuads',[camera,ground,a],[camera,ground,b]],['ribbons','sourceRibbonQuads',[camera],[camera]],['projections','sourceProjectionQuads',[ground],[ground]]]){
   const x=old[name](before,request,...argsA),y=current[name](after,request,...argsB);assert.deepEqual(y,x,id+'/'+kind+'/'+age+'/'+loop+'/'+seed);report.quads[kind]+=y.length;digest.update(JSON.stringify(y));
  }
  a.end();b.end();report.cases++;
 }
 report.cache.push({model:id,...current.sourcePoseCacheReport(after)});
}
report.hash=digest.digest('hex');report.pass=true;
await fs.writeFile('reports/local/performance-x01-x02-20261020/numerical-equivalence'+(revision==='candidate'?'':'-'+revision)+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,cache:report.cache.length}));
