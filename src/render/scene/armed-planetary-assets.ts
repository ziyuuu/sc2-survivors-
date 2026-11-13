import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {ManagedGLTFLoader} from '../loaders/managed-textures';
import {loadUnitMaterialGltf} from '../materials/unit-material-loader';
import {updateFortMaterials} from './fort-materials';
/** Actor PlanetaryFortress selects Model CommandCenter + AnimGroup A. */
export async function loadArmedPlanetary(death:boolean){
 const id=death?'model.fort.planetary.death':'model.fort.planetary',key=death?'fort.planetary.death':'fort.command_center';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('行星要塞原版资源缺失');const g=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key),clip=g.animations.find(c=>death?/^Death/.test(c.name):c.name==='Stand A');if(!clip)throw Error('行星要塞 A 形态动作缺失');
 const model=clone(g.scene),mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();mixer.setTime(0);model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=6.4/Math.max(size.x,size.z),group=new T.Group();model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);group.add(model);mixer.stopAllAction();mixer.uncacheRoot(model);updateFortMaterials(group,clip.name,0);
 return {group,clip,attack:g.animations.find(c=>c.name==='Attack'),crew:g.animations.find(c=>c.name==='Stand Work A')};
}
/** Unarmed raised SupplyDepot device; no bunker ports or weapon animation. */
export async function loadArmedBarrier(death:boolean){
 const key='fort.supply_depot'+(death?'.death':''),id='model.'+key;await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('装甲设备原版资源缺失');
 const g=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key),clip=g.animations.find(c=>death?/^Death/.test(c.name):c.name==='Stand');if(!clip)throw Error('装甲设备动作缺失');
 const model=clone(g.scene),mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();mixer.setTime(0);model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=2.6/Math.max(size.x,size.z),group=new T.Group();model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);group.add(model);mixer.stopAllAction();mixer.uncacheRoot(model);updateFortMaterials(group,clip.name,0);return {group,clip};
}
