import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const images=new WeakMap<object,string>(),sources=new Map<string,WeakRef<THREE.Source>>();
const metrics={parses:0,nonBinary:0,textures:0,noBuffer:0,imageKinds:{} as Record<string,number>,images:0,bytesHashed:0,remapped:0,newSources:0,initCalls:0,initializedSkipped:0};
/** Isolated candidate only: retain original decoder and exact encoded-image identity. */
export function installImageSourceProbe(){
 const native=GLTFLoader.prototype.parse;
 GLTFLoader.prototype.parse=function(data,path,onLoad,onError){return native.call(this,data,path,gltf=>{void trackGltf(gltf,data).then(()=>onLoad(gltf)).catch(onError);},onError);};
}
async function trackGltf(gltf:any,data:unknown){
  metrics.parses++;if(!(data instanceof ArrayBuffer)){metrics.nonBinary++;return;}
  const view=new DataView(data);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67)return gltf;
  const length=view.getUint32(12,true),bin=20+length+8,json=gltf.parser.json as any;
  const tracked=new Map<number,Promise<void>>();
  const track=(index:number,texture:any)=>{if(tracked.has(index))return tracked.get(index);const pending=(async()=>{
   metrics.textures++;const source=json.images?.[index],buffer=source&&json.bufferViews?.[source.bufferView];if(!buffer||buffer.buffer!==0||bin+(buffer.byteOffset??0)+buffer.byteLength>data.byteLength){metrics.noBuffer++;return;}
   const image=texture?.image,kind=image?.constructor?.name??'none';metrics.imageKinds[kind]=(metrics.imageKinds[kind]??0)+1;if(!image||!(image instanceof ImageBitmap))return;
   const bytes=new Uint8Array(data,bin+(buffer.byteOffset??0),buffer.byteLength),digest=await crypto.subtle.digest('SHA-256',bytes),sha=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
   images.set(image,`${source.mimeType}:${image.width}:${image.height}:${sha}`);metrics.images++;metrics.bytesHashed+=bytes.length;
  })();tracked.set(index,pending);return pending;};
  // Observe the source actually chosen by the native loader, including WebP
  // extension sources and future custom material channels; load no unused images.
  const dependency=gltf.parser.loadImageSource.bind(gltf.parser);
  gltf.parser.loadImageSource=async(index:number,loader:any)=>{const result=await dependency(index,loader);await track(index,result);return result;};
  await Promise.all(Object.entries(gltf.parser.sourceCache).map(async([index,cached])=>track(Number(index),await cached)));
  return gltf;
}
export function bindImageSourceProbe(app:any){
 const renderer=app.view.renderer,native=renderer.initTexture;
 renderer.initTexture=function(texture:THREE.Texture){metrics.initCalls++;const key=texture.image&&images.get(texture.image);if(key){const source=sources.get(key)?.deref();if(source){if(texture.source!==source){if(renderer.properties.get(texture).__webglInit){metrics.initializedSkipped++;}else{texture.source=source;metrics.remapped++;}}}else{sources.set(key,new WeakRef(texture.source));metrics.newSources++;}}return native.call(this,texture);};
 (globalThis as any).V01ImageProbe={metrics,live:()=>[...sources.values()].filter(r=>r.deref()).length};
}
