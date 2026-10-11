import * as THREE from 'three';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import type {LandscapeResources} from './campaign-ground-legacy';

/** Each map owns its textures. Native size and independent mip chains are preserved. */
export async function loadEnvironmentTexture(name:string,resources:LandscapeResources,linear=false){
 const id='terrain.visual.'+name;await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('缺少原版环境素材：'+id);
 const texture=await new THREE.TextureLoader().loadAsync(url);resources.textures.push(texture);texture.name=id;
 texture.colorSpace=linear?THREE.NoColorSpace:THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;return texture;
}
