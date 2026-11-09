import type {HttpAssetManifest} from '../../assets/http-store';

const indexes=new WeakMap<HttpAssetManifest,Map<string,(string|null)[]>>();
/** Current bytes alone are insufficient: two identical high images can have
 * different low variants. The build verifies each family's three image hashes. */
export function gltfImageIdentities(manifest:HttpAssetManifest,modelHash:string){
 let index=indexes.get(manifest);
 if(!index){
  index=new Map();indexes.set(manifest,index);
  for(const asset of Object.values(manifest.assets))for(const row of [asset,...Object.values(asset.variants??{})]){
   if(!row.imageSources)continue;
   const keys=row.imageSources.map(i=>i&&/^[a-f0-9]{64}$/.test(i.hash)&&/^[a-f0-9]{64}$/.test(i.family)?`${i.family}:${i.hash}:${i.mime}`:null),previous=index.get(row.sha256);
   // A shared model hash with conflicting variant families stays isolated.
   index.set(row.sha256,previous?previous.map((key,i)=>key===keys[i]?key:null):keys);
  }
 }
 return index.get(modelHash);
}
