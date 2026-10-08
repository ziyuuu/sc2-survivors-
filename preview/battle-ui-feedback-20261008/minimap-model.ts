import type {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';

/** Give the native map a display surface for the existing flat diagnostic arena.
 * All state and methods still come from the real World; no terrain/save mutation. */
export function minimapSource(world:World):World{
 if(world.terrain)return world;
 const surface=new FlatTerrain();surface.isOpen=p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<world.mapHalf&&Math.abs(p.z)<world.mapHalf;
 const methods=new Map<Function,Function>();
 return new Proxy(world,{get(target,key){
  if(key==='terrain')return surface;
  const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;
  if(!methods.has(value))methods.set(value,value.bind(target));return methods.get(value);
 },set(){throw Error('Minimap state must use the native World commands');}});
}
