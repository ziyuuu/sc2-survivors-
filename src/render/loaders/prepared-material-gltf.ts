import * as THREE from 'three';
import {ManagedGLTFLoader} from './managed-textures';

/** The source-effect renderer already owns every material and image. Bind those
 * during parsing so glTF never decodes a second set that is immediately replaced.
 * Original, hash-verified geometry, skeletons and animation bytes are unchanged. */
export function parsePreparedMaterialGltf(bytes:ArrayBuffer,materialFor:(name:string,index:number)=>THREE.Material){
 const loader=new ManagedGLTFLoader();
 loader.register(parser=>({name:'sc2_prepared_materials',loadMaterial:async index=>{
  const material=materialFor(parser.json.materials[index].name,index);
  parser.associations.set(material,{materials:index});return material;
 }}));
 return loader.parseAsync(bytes,'');
}
