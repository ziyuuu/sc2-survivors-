// Local geometry-only audit: no original image is loaded or transmitted.
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sc2BodyBounds,sc2ModelScale} from '../src/render/loaders/sc2-materials.ts';
import {mapAnimations} from '../src/render/loaders/animations.ts';
const results=[];
for(const [key,height] of [['hero.yamato_battlecruiser',4.5],['hero.hots_leviathan',4.5],['elite.carrier.1',3.5]]){
 const input=await fs.readFile(`public/assets/optimized/model.${key}.glb`),jsonSize=input.readUInt32LE(12),json=JSON.parse(input.subarray(20,20+jsonSize).toString()),bin=input.subarray(28+jsonSize);
 json.materials=[{}];delete json.images;delete json.textures;delete json.samplers;for(const mesh of json.meshes)for(const primitive of mesh.primitives)primitive.material=0;
 const raw=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(padded);const out=Buffer.alloc(28+padded.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);out.writeUInt32LE(bin.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);bin.copy(out,28+padded.length);
 const gltf=await new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),''),mixer=new THREE.AnimationMixer(gltf.scene),actions=mapAnimations(gltf.animations,key),idle=actions.idle??gltf.animations[0];mixer.clipAction(idle).play();mixer.setTime(0);gltf.scene.updateMatrixWorld(true);
 const box=sc2BodyBounds(gltf.scene),source=sc2ModelScale(gltf.scene),scale=(source===undefined?height/(box.max.y-box.min.y):1.4*source)*.8*1.15,clips=[];let longest=0;
 for(const clip of new Set(Object.values(actions).filter(Boolean))){mixer.stopAllAction();mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();let max=0;for(let i=0;i<=Math.ceil(clip.duration*24);i++){mixer.setTime(Math.min(clip.duration,i/24));gltf.scene.updateMatrixWorld(true);const size=sc2BodyBounds(gltf.scene).getSize(new THREE.Vector3());max=Math.max(max,size.x*scale,size.z*scale);}clips.push({name:clip.name,duration:clip.duration,maxPlanar:max});longest=Math.max(longest,max);}
 results.push({key,scale,maxPlanar:longest,capFactor:key==='elite.carrier.1'?1:Math.min(1,5.5/longest),clips});
}
await fs.mkdir('reports/local/feedback-f06',{recursive:true});await fs.writeFile('reports/local/feedback-f06/hero-bounds.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
