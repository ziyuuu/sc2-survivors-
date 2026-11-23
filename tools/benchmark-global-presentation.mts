/** Isolated CPU evidence, not an FPS benchmark. Alternate warmed paths in one process. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as THREE from 'three';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {SourceParticleCache,sourceParticleQuads} from '../src/render/effects/source/particles';
import {sourceLife} from '../src/render/effects/source/timeline';
import {SourceEventIndex,sourceEventIndex} from '../src/render/effects/source/event-index';
import type {VisualEvent} from '../src/simulation/types';

// Recreate the rejected candidate in a temporary bundle, never in production.
// The shipped implementation intentionally keeps the original particle outputs.
const out=path.resolve('reports/local/global-performance-20261120');await fs.mkdir(out,{recursive:true});
let particleSource=await fs.readFile('src/render/effects/source/particles.ts','utf8');
for(const [from,to] of [
 ['constructor(readonly limit=8192){}','constructor(readonly limit=8192,readonly reuseOutput=true){}'],
 ['const reuse=stationary?born.quad:undefined,color=','const reusable=!!stationary||!!cache?.reuseOutput,reuse=reusable?born.quad:undefined,color='],
 ['quad.phase=phaseNow;if(stationary)born.quad=quad;result.push(quad);','quad.phase=phaseNow;quad.born=birth.born;if(reusable)born.quad=quad;result.push(quad);'],
]){assert.ok(particleSource.includes(from),'Candidate recipe needs review after a source change');particleSource=particleSource.replace(from,to);}
const rejectedFile=path.join(out,'rejected-particle-candidate.mjs');
await build({stdin:{contents:particleSource,resolveDir:path.resolve('src/render/effects/source'),sourcefile:'rejected-particle-candidate.ts',loader:'ts'},outfile:rejectedFile,bundle:true,platform:'node',format:'esm',packages:'external',target:'node22'});
const rejected=await import(pathToFileURL(rejectedFile).href);

const camera=new THREE.PerspectiveCamera();camera.position.set(3,20,11);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const ground=(p:{x:number;z:number})=>p.x*.01+p.z*.02;
const models=['HydraliskAttackImpact','BloodTargetImpact','LurkerMPAttackSpike','LurkerAttackSpikeEx2','RavagerWeaponImpact','RoachMissileImpact'];
const frames=Array.from({length:180},(_,frame)=>{
 const requests=[];
 for(let born=0;born<=frame;born++)for(let copy=0;copy<2;copy++){
  const model=models[(born+copy)%models.length],def=SOURCE_EFFECTS[model],age=(frame-born)/30;
  assert.ok(def,model);if(age>sourceLife(def))continue;
  requests.push({def,request:{model,key:born+':'+copy,age,seed:(born*529+copy)>>>0,placement:{x:copy*3,y:0,z:born%8,facing:.7,scale:1}}});
 }
 return requests;
});
function particles(reuse:boolean){
 const cache=reuse?new rejected.SourceParticleCache(8192):new SourceParticleCache(8192),sample=reuse?rejected.sourceParticleQuads:sourceParticleQuads;let count=0,sum=0;
 const start=performance.now();
 for(const [frame,requests] of frames.entries()){
  cache.begin(frame/30);const submitted=[];
  for(const {def,request} of requests)submitted.push(...sample(def,request,camera,ground,cache));
  for(const q of submitted){count++;sum+=q.matrix.elements[12]+q.color[3]+q.uv[2];}
  cache.end();
 }
 return {ms:performance.now()-start,count,sum,liveBirths:cache.report().liveBirths};
}
const receipts=Array.from({length:150},(_,frame)=>Array.from({length:768},(_,i)=>({kind:['attack','hit','projectile-impact','shield-hit'][i%4],entityId:i%90,hitSourceId:(i+1)%90,targetId:(i+2)%90,time:frame/60+Math.floor(i/10)/60,serial:frame*1000+i} as VisualEvent)));
function events(shared:boolean){
 let count=0;const start=performance.now();
 for(const original of receipts){
  const current=[...original]; // Every simulated frame publishes a new receipt buffer.
  const a=shared?sourceEventIndex(current):new SourceEventIndex(current),b=shared?sourceEventIndex(current):new SourceEventIndex(current);
  for(const e of current)count+=Number(a.duplicate(e))+Number(b.missile(e));
 }
 return {ms:performance.now()-start,count};
}
particles(false);particles(true);events(false);events(true);
const results=[];
for(let i=0;i<(process.argv.includes('--check')?1:6);i++){
 const order=i%2?[true,false]:[false,true];
 const row:any={};
 for(const reuse of order){globalThis.gc?.();row[reuse?'reuse':'fresh']=particles(reuse);row[reuse?'sharedEvents':'separateEvents']=events(reuse);}
 assert.equal(row.fresh.count,row.reuse.count);assert.equal(row.fresh.sum,row.reuse.sum);assert.equal(row.separateEvents.count,row.sharedEvents.count);results.push(row);
}
const median=(values:number[])=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const report={particleSamples:results[0].fresh.count,frames:frames.length,iterations:results.length,medians:Object.fromEntries(['fresh','reuse','separateEvents','sharedEvents'].map(k=>[k,median(results.map(r=>r[k].ms))])),results};
await fs.mkdir('reports/local/global-performance-20261120',{recursive:true});
await fs.writeFile(path.join(out,'cpu-paired-reproduction.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({particleSamples:report.particleSamples,iterations:report.iterations,medians:report.medians}));
