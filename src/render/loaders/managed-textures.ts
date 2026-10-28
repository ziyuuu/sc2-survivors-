import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {httpStore} from '../../assets/http-store';
import {graphicsPreferences,optimizedGraphics,type GraphicsTier} from '../../platform/graphics-profile';
import {imageDecodeLane,modelDecodeLane} from '../../platform/preparation-budget';

type Binding={id:string;image?:number;source:THREE.Texture['source'];textures:WeakRef<THREE.Texture>[]};
let swapping=false;
const bindings=new Map<THREE.Texture['source'],Binding>(),gltfUrls=new WeakMap<GLTF,string>();
export const textureMetrics={decodedPixels:0,swaps:0,rollbacks:0};
export function textureReport(){let liveVariantPixels=0,liveVariantSources=0;for(const [source,b]of bindings){if(!b.textures.some(r=>r.deref())){bindings.delete(source);continue;}const im=source.data as {width?:number;height?:number};liveVariantPixels+=(im?.width??0)*(im?.height??0);liveVariantSources++;}return {...textureMetrics,liveVariantPixels,liveVariantSources,rgbaMipEstimate:Math.round(liveVariantPixels*4*4/3)};}
export function trackTexture<T extends THREE.Texture>(texture:T,id:string,image?:number){
 if(!optimizedGraphics()||!httpStore()?.manifest.assets[id]?.variants||texture instanceof THREE.CubeTexture)return texture;
 let binding=bindings.get(texture.source);if(!binding){binding={id,image,source:texture.source,textures:[]};bindings.set(texture.source,binding);const im=texture.image as {width?:number;height?:number}|undefined;textureMetrics.decodedPixels+=(im?.width??0)*(im?.height??0);}
 if(!binding.textures.some(r=>r.deref()===texture)){binding.textures.push(new WeakRef(texture));texture.addEventListener('dispose',()=>{if(swapping)return;const current=bindings.get(texture.source);if(current){current.textures=current.textures.filter(r=>r.deref()&&r.deref()!==texture);if(!current.textures.length)bindings.delete(current.source);}});}return texture;
}
export function trackedClone(texture:THREE.Texture){const clone=texture.clone(),b=bindings.get(texture.source);if(b)trackTexture(clone,b.id,b.image);return clone;}
export function registerGltfTextures(g:GLTF,url?:string){
 if(url)gltfUrls.set(g,url);const id=httpStore()?.idForUrl(url??gltfUrls.get(g)??'');if(!id)return;
 for(const [object,association]of g.parser.associations??[]){if(!(object instanceof THREE.Texture))continue;const index=(association as {textures?:number}).textures;if(index===undefined)continue;const info=g.parser.json.textures?.[index];const image=info?.extensions?.EXT_texture_webp?.source??info?.source;if(image!==undefined)trackTexture(object,id,image);}
}
export class ManagedTextureLoader extends THREE.TextureLoader {
 override async loadAsync(url:string,onProgress?:(event:ProgressEvent)=>void){const texture=await (optimizedGraphics()?imageDecodeLane.run(()=>super.loadAsync(url,onProgress)):super.loadAsync(url,onProgress)),id=httpStore()?.idForUrl(url);return id?trackTexture(texture,id):texture;}
}
export class ManagedGLTFLoader extends GLTFLoader {
 constructor(manager?:THREE.LoadingManager){super(manager);this.register(parser=>{const load=parser.loadImageSource.bind(parser);parser.loadImageSource=(index,loader)=>optimizedGraphics()?imageDecodeLane.run(()=>load(index,loader)):load(index,loader);return {name:'sc2_image_decode_budget'};});}
 override async loadAsync(url:string,onProgress?:(event:ProgressEvent)=>void){const work=async()=>{const g=await super.loadAsync(url,onProgress);registerGltfTextures(g,url);return g;};return optimizedGraphics()?modelDecodeLane.run(work):work();}
}
function imageBlob(bytes:ArrayBuffer,index:number){
 const view=new DataView(bytes),length=view.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length))),image=j.images[index],v=j.bufferViews[image.bufferView],start=28+length+(v.byteOffset??0);
 return new Blob([bytes.slice(start,start+v.byteLength)],{type:image.mimeType});
}
async function readImage(binding:Binding,tier:GraphicsTier){
 const store=httpStore()!,url=await store.urlForTier(binding.id,tier);
 return imageDecodeLane.run(async()=>{
  if(binding.image===undefined){const t=await new THREE.TextureLoader().loadAsync(url);return t.image;}
  const r=await fetch(url);if(!r.ok)throw Error('贴图读取失败');const blob=imageBlob(await r.arrayBuffer(),binding.image);
  return createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 });
}
function swap(binding:Binding,image:TexImageSource){
 const previous=binding.source.data as {close?:()=>void}|undefined;binding.source.data=image;
 swapping=true;for(const ref of binding.textures){const t=ref.deref();if(t){t.dispose();t.needsUpdate=true;}}
 // Three clones share Source. All registered wrappers now refer to the new image.
 swapping=false;binding.source.needsUpdate=true;if(previous&&previous!==image&&typeof previous.close==='function')previous.close();
 textureMetrics.swaps++;
}
/** Only called inside the existing preparation gate. Encoded bytes are staged;
 * images replace one at a time, rather than holding two full decoded sets. */
export async function applyPendingTextureTier(cancelled:()=>boolean=()=>false){
 const store=httpStore(),tier=graphicsPreferences().texture;if(!optimizedGraphics()||!store||store.activeTier===tier)return;
 const old=store.activeTier,live=[...bindings.values()].filter(b=>b.textures.some(r=>r.deref())),changed:Binding[]=[];
 // Verify all new encoded resources before changing the first live material.
 try{for(const id of new Set([...Object.keys(store.urls),...live.map(b=>b.id)])){if(cancelled())throw Error('贴图准备已取消');await store.urlForTier(id,tier);}
  for(const b of live){if(cancelled())throw Error('贴图准备已取消');const image=await readImage(b,tier);swap(b,image);bindings.set(b.source,b);changed.push(b);await new Promise<void>(r=>setTimeout(r,0));}
  store.commitTier(tier);store.releaseOldVariants();
 }catch(error){for(const b of changed){swap(b,await readImage(b,old));bindings.set(b.source,b);}store.releaseOldVariants();textureMetrics.rollbacks++;throw error;}
}
export function textureTierPending(){const store=httpStore();return optimizedGraphics()&&!!store&&store.activeTier!==graphicsPreferences().texture;}
