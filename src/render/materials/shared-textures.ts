import {CubeTextureLoader,TextureLoader,type Texture,type CubeTexture} from 'three';

/** Decode each immutable source once, while keeping sampler/color settings local
 * to the material. Cloned wrappers share Three's Source and GPU image cache. */
export class SharedMaterialTextures {
 private images=new Map<string,Promise<Texture>>();
 private cubes=new Map<string,Promise<CubeTexture>>();
 constructor(private imageLoader=new TextureLoader(),private cubeLoader=new CubeTextureLoader()){}
 async image(url:string){
  let pending=this.images.get(url);
  if(!pending){pending=this.imageLoader.loadAsync(url);this.images.set(url,pending);pending.catch(()=>this.images.delete(url));}
  return (await pending).clone();
 }
 async cube(urls:string[]){
  const key=JSON.stringify(urls);let pending=this.cubes.get(key);
  if(!pending){pending=this.cubeLoader.loadAsync(urls);this.cubes.set(key,pending);pending.catch(()=>this.cubes.delete(key));}
  return (await pending).clone();
 }
}

export const sharedMaterialTextures=new SharedMaterialTextures();
