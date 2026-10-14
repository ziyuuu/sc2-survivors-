import * as THREE from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {AnimatedBatch as Baseline} from '@7a-baseline-animation';
import {AnimatedBatch as Candidate} from '@7a-candidate-animation';
import {ASSETS,assetUrl,configurePlatformAssetUrl} from '../src/assets/manifest';
import {racePreloadModels} from '../src/app/race-preload';
import {displayAssetModelKey} from '../src/render/materials/elite-visual';
import {loadUnitMaterialGltf} from '../src/render/materials/unit-material-loader';

const hash=async(data:ArrayBufferView)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function snapshot(batch:any){
 const atlases=[];for(const texture of batch.ownedPoseTextures)atlases.push({width:texture.image.width,height:texture.image.height,bytes:texture.image.data.byteLength,sha256:await hash(texture.image.data)});
 const points=new Float64Array([...batch.weaponTracks.values()].flatMap((track:any)=>track.flatMap((point:any)=>point.toArray())));
 return {atlases,clips:[...batch.clips],trackKeys:[...batch.weaponTracks.keys()],tracks:await hash(points),normalization:batch.normalization.toArray(),scale:batch.scale,bodyHeight:batch.bodyHeight,bodyRadius:batch.bodyRadius,turretPivot:batch.turretPivot.toArray(),outline:batch.bodyOutline.map((point:any)=>point.toArray()),weapon:batch.weapon.toArray(),boneCount:batch.boneCount,meshCount:batch.meshes.length};
}
function disposeTrial(batch:any){
 // These CPU-only trials share an immutable decoded source. Release only objects
 // owned by this batch; shared image wrappers stay alive until this trial ends.
 for(const mesh of batch.meshes){mesh.removeFromParent();mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();mesh.dispose();}
 for(const texture of [...batch.ownedPoseTextures,...batch.materialSurfaces.map((surface:any)=>surface.texture)])texture.dispose();
}
const results:any[]=[],longTasks:any[]=[];new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
async function init(){const release=await(await fetch('web-release.json')).json(),manifest=await(await fetch(release.manifest)).json();configurePlatformAssetUrl(id=>manifest.assets[id]?.url??null);await MeshoptSimplifier.ready;
 const families=new Map<string,string>();for(const race of ['terran','zerg','protoss']as const)for(const entry of racePreloadModels(race))families.set(...entry);
 for(const [key,family]of [['scv','scv'],['drone','drone'],['probe','probe'],['egg','egg'],['support.mine','support.mine']])families.set(key,family);
 const cases=[];for(const [key,family]of families){const asset=displayAssetModelKey(key),profile=['scv','drone','probe','egg','support.mine'].includes(key)?undefined:key;
  for(const suffix of ['', '.death',...(family==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])]){const id='model.'+asset+suffix;if(!ASSETS.has(id))continue;cases.push({key:key+suffix,asset:asset+suffix,profile:suffix?undefined:profile,height:1.5,normalization:suffix?new THREE.Matrix4().makeScale(.8,.8,.8).multiply(new THREE.Matrix4().makeTranslation(-.25,-.1,.2)):undefined,reference:key.startsWith('elite.')&&!suffix?1.75:undefined});}
 }
 (window as any).animationLab={cases:cases.map(c=>c.key),results,longTasks,async run(key:string,order:string[]=['baseline','prepared','prepared','baseline','baseline','prepared']){
  const item=cases.find(c=>c.key===key);if(!item)throw Error('Unknown animation '+key);const url=assetUrl('model.'+item.asset);if(!url)throw Error('Missing original '+item.asset);
  const gltf=await loadUnitMaterialGltf(new GLTFLoader(),url,item.asset),rows=[];
  for(const condition of order){
   const copy={...gltf,scene:clone(gltf.scene)}as GLTF,scene=new THREE.Scene();let batch:any;const start=performance.now();
   if(condition==='baseline')batch=new Baseline(copy,scene,item.height,item.normalization,1,item.profile,item.reference);
   else if(condition==='prepared')batch=new Candidate(copy,scene,item.height,item.normalization,1,item.profile,item.reference);
   else if(condition==='sliced')batch=await Candidate.create(copy,scene,item.height,item.normalization,1,item.profile,item.reference);
   else throw Error('Invalid condition');
   const end=performance.now(),output=await snapshot(batch);rows.push({condition,start,end,ms:end-start,output});disposeTrial(batch);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  const expected=JSON.stringify(rows[0].output),exact=rows.every(row=>JSON.stringify(row.output)===expected);
  const result={key,asset:item.asset,profile:item.profile,rows,exact};results.push(result);
  if(!exact)throw Error('Original pose/attachment mismatch: '+key);return result;
 }};document.body.dataset.ready='true';
}
void init().catch(error=>{document.body.textContent=String(error);throw error;});
