import {trackedClone} from '../loaders/managed-textures';
import {ManagedTextureLoader} from '../loaders/managed-textures';
import {CubeTextureLoader,TextureLoader,type Texture,type CubeTexture} from 'three';

/** Decode each immutable source once, while keeping sampler/color settings local
 * to the material. Cloned wrappers share Three's Source and GPU image cache. */
export class SharedMaterialTextures {
 private images=new Map<string,Promise<Texture>>();
 private cubes=new Map<string,Promise<CubeTexture>>();
 constructor(private imageLoader=new ManagedTextureLoader(),private cubeLoader=new CubeTextureLoader()){}
 /** Drop cache references for retired optional models. Live material wrappers
  * retain their Source; never close or mutate an image still used by a material. */
 forget(urls:Iterable<string>){const retired=new Set(urls);for(const url of retired)this.images.delete(url);for(const key of this.cubes.keys())if((JSON.parse(key) as string[]).some(url=>retired.has(url)))this.cubes.delete(key);}
 async image(url:string){
  let pending=this.images.get(url);
  if(!pending){pending=this.imageLoader.loadAsync(url);this.images.set(url,pending);pending.catch(()=>this.images.delete(url));}
  return trackedClone(await pending);
 }
 async cube(urls:string[]){
  const key=JSON.stringify(urls);let pending=this.cubes.get(key);
  if(!pending){pending=this.cubeLoader.loadAsync(urls);this.cubes.set(key,pending);pending.catch(()=>this.cubes.delete(key));}
  return (await pending).clone();
 }
}

export const sharedMaterialTextures=new SharedMaterialTextures();
