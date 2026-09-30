/** Read only original nodes and animation data; do not decode textures or render. */
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3} from 'three';
globalThis.ProgressEvent??=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
const assets=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
for(const id of process.argv.slice(2)){
 const a=assets.find(a=>a.id==='model.'+id),b=await fs.readFile(a.packedFile),n=b.readUInt32LE(12),doc=JSON.parse(b.toString('utf8',20,20+n));
 for(const node of doc.nodes){delete node.mesh;delete node.skin;}for(const key of ['skins','meshes','materials','textures','images'])delete doc[key];
 doc.buffers=[{byteLength:b.length-28-n,uri:'data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64')}];
 const g=await new GLTFLoader().parseAsync(JSON.stringify(doc),''),mixer=new AnimationMixer(g.scene),clip=g.animations.find(c=>c.name==='Stand')??g.animations[0];if(clip){mixer.clipAction(clip).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);
 const mounts=[];g.scene.traverse(node=>{if(/Ref.?Weapon/.test(node.name))mounts.push({name:node.name,position:node.getWorldPosition(new Vector3()).toArray()});});const attack=g.animations.find(c=>c.name==='Attack'),attackMounts=[];
 if(attack){mixer.stopAllAction();mixer.clipAction(attack).play();for(const t of [0,.05,.1,.2]){mixer.setTime(t);g.scene.updateMatrixWorld(true);g.scene.traverse(node=>{if(/Ref.?Weapon/.test(node.name))attackMounts.push({at:t,name:node.name,position:node.getWorldPosition(new Vector3()).toArray()});});}}
 console.log(JSON.stringify({id,clip:clip?.name,mounts,attackMounts}));
}
