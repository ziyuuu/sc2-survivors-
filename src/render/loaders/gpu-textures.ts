import type {Texture,WebGLRenderer} from 'three';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {httpStore} from '../../assets/http-store';
import {optimizedGraphics} from '../../platform/graphics-profile';
import {SharedImageSources} from './shared-image-sources';

let renderer:WebGLRenderer|undefined,loader:KTX2Loader|undefined,supported=false,active=0;
const images=new SharedImageSources(),failures=new Set<string>();
export const gpuTextureMetrics={loaded:0,fallbacks:0,payloadBytes:0,transcodeMs:0,workerReleases:0};
export function configureGpuTextures(value:WebGLRenderer){
 renderer=value;
 // UASTC high-quality targets only. Older DXT/ETC-only devices keep existing
 // WebP pixels instead of accepting a lower-quality transcode or RGBA expansion.
 supported=optimizedGraphics()&&(value.extensions.has('WEBGL_compressed_texture_astc')||value.extensions.has('EXT_texture_compression_bptc'));
 const store=httpStore();if(store)store.gpuTexturesEnabled=supported;
}
function decoder(){
 if(!loader){loader=new KTX2Loader().setTranscoderPath(new URL('./basis/',document.baseURI).href).setWorkerLimit(1).detectSupport(renderer!);}
 return loader;
}
/** A missing/unsupported sidecar leaves the existing source image path intact. */
export async function gpuTexture(imageHash:string):Promise<Texture|null>{
 const store=httpStore();if(!supported||!store?.manifest.gpuTextures?.[imageHash]||failures.has(imageHash))return null;
 active++;
 try{return await images.texture(imageHash,async()=>{
  const bytes=await store.gpuTextureBytes(imageHash),at=performance.now();
  const texture=await new Promise<Texture>((resolve,reject)=>decoder().parse(bytes,resolve,reject));
  gpuTextureMetrics.loaded++;gpuTextureMetrics.transcodeMs+=performance.now()-at;
  gpuTextureMetrics.payloadBytes+=texture.mipmaps.reduce((n,m)=>n+('data' in m?(m.data as ArrayBufferView).byteLength:0),0);return texture;
 });}catch{failures.add(imageHash);gpuTextureMetrics.fallbacks++;return null;}finally{active--;}
}
/** Keep immutable pixels, release the WASM worker heap at safe entrance boundaries. */
export function releaseGpuDecoder(){if(active||!loader)return false;loader.dispose();loader=undefined;gpuTextureMetrics.workerReleases++;return true;}
export function gpuTextureReport(){return {...gpuTextureMetrics,supported,active,workerResident:!!loader,shared:images.metrics};}
