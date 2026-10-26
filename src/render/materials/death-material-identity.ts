import {UNIT_MATERIAL_CATALOG} from './unit-material-catalog';
import type {UnitMaterialProfile} from './source-tracks';

const profiles=new Map<string,UnitMaterialProfile>();
/** A body's original diffuse mask remains its identity when its death mesh dissolves.
 * Match the exact source texture; never colour blood, burns or unrelated fragments.
 * Keep the death profile's UVs, layer tracks and opacity masks intact. */
export function presentationMaterialProfile(key:string):UnitMaterialProfile|undefined {
 const raw=UNIT_MATERIAL_CATALOG[key];if(!raw||!key.endsWith('.death'))return raw;
 const cached=profiles.get(key);if(cached)return cached;
 const live=UNIT_MATERIAL_CATALOG[key.slice(0,-6)];if(!live)return raw;
 const materials=raw.materials.map(source=>{
  if(source.teamTexture)return source;
  const body=live.materials.find(m=>m.teamTexture&&m.layers.diffuse?.filename===source.layers.diffuse?.filename);
  return body?{...source,teamColor:true,teamTexture:body.teamTexture}:source;
 });
 const result={...raw,materials};profiles.set(key,result);return result;
}
