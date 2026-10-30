// Investigation of V06-TANK-FX-001. Reports current behavior; not a regression
// assertion that should be retained after the production renderer is repaired.
import fs from 'node:fs';
import * as THREE from 'three';
import {sourceParticleQuads,type SourceParticleQuad} from '../src/render/effects/source/particles';
import type {SourceEffectDefinition} from '../src/render/effects/source/types';

const catalog=JSON.parse(fs.readFileSync('src/render/effects/source/catalog.json','utf8'));
const camera=new THREE.PerspectiveCamera();camera.position.set(0,20,22);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
function tip(q:SourceParticleQuad){const m=q.matrix.elements;return new THREE.Vector3(m[12]+m[4]*.5,m[13]+m[5]*.5,m[14]+m[6]*.5);}
const out=[];
for(const gravity of ['native','zero-control']){
 const d=structuredClone(catalog.SiegeTankAttackImpact) as SourceEffectDefinition;
 if(gravity==='zero-control')for(const p of d.particles)p.gravity=0;
 for(const age of [.3,.6,1]){
  const run=(t:number)=>sourceParticleQuads(d,{model:d.id,key:'diagnostic',age:t,seed:17,placement:{x:0,y:10,z:0,facing:.7}},camera,()=>-1000).filter(q=>q.emitter===1);
  const a=run(age-.0001),b=run(age+.0001);if(a.length!==b.length||!a.length)throw Error('Unstable particle sample');
  const angles=a.map((q,i)=>{if(q.born!==b[i].born)throw Error('Unmatched particle');const axis=new THREE.Vector3().setFromMatrixColumn(q.matrix,1).normalize(),delta=tip(b[i]).sub(tip(q)).normalize();return Math.acos(Math.max(-1,Math.min(1,axis.dot(delta))))*180/Math.PI;});
  out.push({gravity,age,count:a.length,minAngle:Math.min(...angles),maxAngle:Math.max(...angles)});
 }
}
fs.mkdirSync('reports/local/tank-effects-20261030',{recursive:true});
fs.writeFileSync('reports/local/tank-effects-20261030/direction.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
