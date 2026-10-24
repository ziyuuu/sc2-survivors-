import {Texture} from 'three';
import type {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Isolated candidate. Share exact encoded embedded images before decoding.
// Each material still receives a separate Texture wrapper and sampler settings.
type SharedSource=Texture['source'];
type Entry={pending?:Promise<SharedSource>;source?:WeakRef<SharedSource>};
const sources=new Map<string,Entry>();
export const imageSourceMetrics={hashes:0,hashedBytes:0,decoded:0,reused:0,failures:0};
export function configureSharedImageLoader(loader:GLTFLoader){
 loader.register(parser=>{
  const p=parser as any,native=p.loadImageSource.bind(p),hashes=new Map<number,Promise<string>>();
  p.loadImageSource=async(index:number,imageLoader:any)=>{
   const image=p.json.images[index];
   if(!imageLoader.isImageBitmapLoader||image.bufferView===undefined||!image.mimeType||image.extras!==undefined&&(image.extras===null||typeof image.extras!=='object'))return native(index,imageLoader);
   let hash=hashes.get(index);
   if(!hash){hash=p.getDependency('bufferView',image.bufferView).then(async(bytes:ArrayBuffer)=>{imageSourceMetrics.hashes++;imageSourceMetrics.hashedBytes+=bytes.byteLength;const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');});hashes.set(index,hash!);}
   const key=image.mimeType+'|'+JSON.stringify(imageLoader.options)+'|'+await hash;
   let entry=sources.get(key),source=entry?.source?.deref();
   if(source||entry?.pending){imageSourceMetrics.reused++;source??=await entry!.pending!;}
   else{
    entry={};sources.set(key,entry);const current=entry;
    current.pending=Promise.resolve().then(()=>native(index,imageLoader)).then((texture:Texture)=>{if(!texture?.source)throw Error('Embedded image source unavailable');imageSourceMetrics.decoded++;current.source=new WeakRef(texture.source);current.pending=undefined;return texture.source;}).catch((error:unknown)=>{imageSourceMetrics.failures++;if(sources.get(key)===current)sources.delete(key);throw error;});
    source=await current.pending;
   }
   const texture=new Texture();
   // Set the new wrapper's version without invalidating an already uploaded
   // shared Source. GLTFLoader applies this wrapper's original sampler below.
   texture.needsUpdate=true;texture.source=source;
   if(image.extras)Object.assign(texture.userData,image.extras);
   texture.userData.mimeType=image.mimeType;
   return texture;
  };
  return {name:'V01_EXACT_EMBEDDED_IMAGE_SOURCE'};
 });
 return loader;
}
