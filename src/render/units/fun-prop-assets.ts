import {ManagedGLTFLoader} from '../loaders/managed-textures';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {empPulseMaterial} from './emp-pulse';

export const FUN_PROP_NAMES=['chest-common','chest-rare','intel-book','pickup-medical','pickup-firepower','pickup-armor','pickup-nuke','pickup-root','elytra'] as const;
export type FunPropName=typeof FUN_PROP_NAMES[number];
const ID='model.fun-props';

/** Renderer-owned templates. Instances share immutable geometry, maps and materials. */
export class FunPropAssets {
 private template?:THREE.Group;
 private loading?:Promise<THREE.Group>;
 private pulses=new Set<THREE.ShaderMaterial>();
 get ready(){return !!this.template;}
 async prepare():Promise<THREE.Group>{
  if(this.template)return this.template;
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   await prepareEmbeddedAssetIds([ID]);const url=assetUrl(ID);if(!url)throw Error('趣味道具模型未就绪');
   const gltf=await new ManagedGLTFLoader().loadAsync(url);
   for(const name of FUN_PROP_NAMES)if(!gltf.scene.getObjectByName(name))throw Error('趣味道具模型缺少节点：'+name);
   const replacements=new Map<THREE.Material,THREE.ShaderMaterial>();
   gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;
    const adapt=(m:THREE.Material)=>{
     if(m.name.startsWith('SC2_mutalisk_wing'))m.side=THREE.DoubleSide;
     if(!m.name.startsWith('EMP_'))return m;
     let pulse=replacements.get(m);if(!pulse){pulse=empPulseMaterial(m.name.includes('core'));replacements.set(m,pulse);this.pulses.add(pulse);}o.castShadow=false;return pulse;
    };o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);
   }});
   for(const original of replacements.keys())original.dispose();
   this.template=gltf.scene;return gltf.scene;
  })();
  try{return await this.loading;}finally{this.loading=undefined;}
 }
 updateTime(time:number){for(const pulse of this.pulses)pulse.uniforms.time.value=time;}
 create(name:FunPropName):THREE.Group{
  const template=this.template?.getObjectByName(name);if(!template)throw Error('趣味道具尚未准备：'+name);
  const root=new THREE.Group();root.name=name;root.userData.funPropShared=true;root.add(template.clone(true));return root;
 }
}

/** Retiring a visual must not dispose shared templates used by siblings or future spawns. */
export function releaseFunVisual(root:THREE.Object3D){
 root.removeFromParent();
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
 function visit(o:THREE.Object3D){
  if(o.userData.funPropShared)return;
  if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}
  for(const child of o.children)visit(child);
 }
 visit(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}
