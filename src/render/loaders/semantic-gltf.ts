import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {restoreSc2Materials} from './sc2-materials';

/** SC map glTFs refer to image IDs, not paths beside their hashed model file. */
export async function loadSemanticGltf(id:string):Promise<GLTF>{
 await prepareEmbeddedAssetIds([id]);
 const modelUrl=assetUrl(id);if(!modelUrl)throw Error('缺少地图摆件：'+id);
 const response=await fetch(modelUrl);if(!response.ok)throw Error('地图摆件读取失败：'+id);
 const json=await response.text();
 const references=[...new Set([...json.matchAll(/sc2asset:([^"\\\s]+)/g)].map(match=>match[1]))];
 await prepareEmbeddedAssetIds(references);
 const failures:string[]=[],manager=new THREE.LoadingManager();
 manager.onError=url=>failures.push(url);
 manager.setURLModifier(value=>{
  const index=value.lastIndexOf('sc2asset:');if(index<0)return value;
  const key=value.slice(index+9),resolved=assetUrl(key);
  if(!resolved){failures.push(key);throw Error('地图贴图尚未就绪：'+key);}return resolved;
 });
 const model=await restoreSc2Materials(await new GLTFLoader(manager).parseAsync(json,''));
 const declared=JSON.parse(json) as {textures?:unknown[]};
 const images=await Promise.all((declared.textures??[]).map((_,index)=>model.parser.getDependency('texture',index)));
 // GLTFLoader deliberately tolerates image errors. A playable map must not.
 if(failures.length||images.some(image=>!image))throw Error('地图贴图加载失败：'+id+'（'+Math.max(1,failures.length)+'项）');
 return model;
}
