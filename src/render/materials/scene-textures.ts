import type {Material,Texture} from 'three';

const extraSamplers=new WeakMap<Material,readonly Texture[]>();
/** The same sampler list feeds readiness and the existing texture-filter controls. */
export function bindSceneTextures(material:Material,textures:readonly Texture[]){extraSamplers.set(material,[...new Set(textures)]);}
export function sceneMaterialTextures(material:Material):readonly Texture[]{return extraSamplers.get(material)??[];}
