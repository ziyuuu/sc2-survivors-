import {trackedClone} from '../loaders/managed-textures';
import {ManagedTextureLoader} from '../loaders/managed-textures';
import {CubeTextureLoader,TextureLoader,type Texture,type CubeTexture} from 'three';
import {SharedImageSources} from '../loaders/shared-image-sources';

/** Decode each immutable source once, while keeping sampler/color settings local
 * to the material. Cloned wrappers share Three's Source and GPU image cache. */
export class SharedMaterialTextures {
 private images=new SharedImageSources();
 private cubes=new SharedImageSources();
 constructor(private imageLoader=new ManagedTextureLoader(),private cubeLoader=new CubeTextureLoader()){}
 /** Drop cache references for retired optional models. Live material wrappers
  * retain their Source; never close or mutate an image still used by a material. */
 forget(urls:Iterable<string>){const retired=new Set(urls);this.images.forget(retired);for(const key of this.cubes.keys())if((JSON.parse(key) as string[]).some(url=>retired.has(url)))this.cubes.forget([key]);}
 async image(url:string){
  return trackedClone(await this.images.texture(url,()=>this.imageLoader.loadAsync(url)));
 }
 async cube(urls:string[]){
  return await this.cubes.texture(JSON.stringify(urls),()=>this.cubeLoader.loadAsync(urls)) as CubeTexture;
 }
}

export const sharedMaterialTextures=new SharedMaterialTextures();
