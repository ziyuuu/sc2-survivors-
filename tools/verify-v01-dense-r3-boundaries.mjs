import fs from 'node:fs/promises';import assert from 'node:assert/strict';import * as THREE from 'three';
import * as old from '../reports/local/v01-20261024/dense-particle-candidate-r3/baseline.mjs';
import * as candidate from '../reports/local/v01-20261024/dense-particle-candidate-r3/candidate.mjs';
const camera=new THREE.PerspectiveCamera();camera.position.set(3,12,16);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);let id=91000000;
const ref=value=>({id:id++,default:value,interpolation:1});
function fixture(){const def=structuredClone(old.SOURCE_EFFECTS.MarineAttackLaunch),p={bone:0,material_reference_index:0,emit_rate:ref(10),emit_count:ref(0),lifespan:ref(.25),size:ref({x:1,y:1,z:1}),color_init:{r:255,g:255,b:255,a:255},color_mid:{r:255,g:255,b:255,a:255},color_end:{r:255,g:255,b:255,a:255}};def.materialProfile.clips=[{name:'Stand',duration:2,tracks:[]}];def.particles=[p];def.ribbons=[];def.projections=[];def.copies=[];def.forces=[];return def;}
const definitions=[];
for(const name of ['plain','keyframe-longer-than-default','random-lifespan','copy-longer','world-space','unknown-reference','negative','infinite']){const def=fixture(),p=def.particles[0];
 if(name==='keyframe-longer-than-default'){p.lifespan=ref(.01);def.materialProfile.clips[0].tracks.push({id:p.lifespan.id,frames:[0,.2,.7,1.2,2],values:[.01,1.7,.25,3,2]});}
 if(name==='random-lifespan'){p.lifespan_random=ref(2.7);p.lifespan_randomize=1;}
 if(name==='copy-longer'){p.copy_indices=[0];def.copies=[{lifespan:ref(1.9),emit_rate:ref(3),world_space:1}];}
 if(name==='world-space')p.world_space=1;
 if(name==='unknown-reference')p.lifespan={id:id++,default:'0.9',interpolation:1};
 if(name==='negative')p.lifespan=ref(-1);
 if(name==='infinite')p.lifespan=ref(Infinity);
 definitions.push({name,def});
}
let cases=0,quads=0;const counts={};
for(const {name,def}of definitions)for(const loop of [false,true])for(const seed of [0,529])for(const age of [.1-1e-10,.1,.25-Number.EPSILON,.25,.25+Number.EPSILON,.71,1.01,2.21,5.17,12.21])for(const fraction of [1,.3,0])for(const mask of [undefined,new Set(),new Set([0])]){
 const request={model:def.id,key:name,age,loop,seed,stopAt:age>5?2.1:undefined,placement:{x:1,y:2,z:3,facing:.7,age,from:{x:0,y:0,z:0},end:{x:4,y:5,z:6}}};
 const expected=old.sourceParticleQuads(def,request,camera,()=>0,undefined,fraction,mask),actual=candidate.sourceParticleQuads(def,request,camera,()=>0,undefined,fraction,mask);assert.deepEqual(actual,expected,[name,loop,seed,age,fraction,mask?.size].join('/'));cases++;quads+=expected.length;counts[name]=(counts[name]??0)+expected.length;
}
const plain=definitions[0].def,r={model:plain.id,key:'decoration-count',age:.71,seed:529,placement:{x:0,y:1,z:0,facing:0}};
assert.equal(candidate.sourceParticleQuads(plain,r,camera,()=>0,undefined,1).length,3);assert.equal(candidate.sourceParticleQuads(plain,r,camera,()=>0,undefined,0,new Set([0])).length,1);
const report={pass:true,cases,quads,counts,scope:'Frozen baseline exact equality for expiration boundaries, loop histories, random and animated lifespans, emitter copies, world-space transforms, nonnumeric references, infinite/negative lifespans, and decoration thresholds. No performance samples.'};await fs.writeFile('reports/local/v01-20261024/dense-particle-candidate-r3/boundary-verification.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
