import {FAMILIES_BY_RACE,type Race} from '../data/races';
import {HEROES,type HeroId} from '../data/heroes';
import type {Difficulty} from '../data/stages';
import {COMBAT_FX_PROFILES} from '../render/effects/combat-fx-profile';
import catalog from '../render/effects/source/catalog.json';

export interface CombatPreloadPlan {sources:string[];heroes:HeroId[]}
export interface CombatPreloadScope {
 race:Race;stage:number;difficulty:Difficulty;
 models?:Iterable<readonly [string,string]>;
 /** Actual/restored identities, deferred orders, casts, receipts and equipment bindings. */
 identities?:unknown;
}
const heroByModel=new Map(Object.entries(HEROES).map(([id,h])=>[h.model,id as HeroId]));
const families=new Set<string>(Object.values(FAMILIES_BY_RACE).flat());
const routed=new Set([...COMBAT_FX_PROFILES.values()].flatMap(p=>Object.values(p.models).flat()));
/** Shared lifecycle/gear effects have independent owners. Retain their complete
 * closure, plus all enemy families; scope only unrelated friendly weapon sets.
 * This never predicts a reward or consumes gameplay RNG. */
export function combatPreloadPlan(scope:CombatPreloadScope):CombatPreloadPlan {
 const required=new Set<string>([...FAMILIES_BY_RACE[scope.race],...FAMILIES_BY_RACE.zerg,
  'marine','zealot','stalker','shield','sentry']); // infected/corrupted actors, shield hits and escort field
 const heroes=new Set<HeroId>();
 const identity=(value:string)=>{
  if(families.has(value))required.add(value);
  const hero=Object.hasOwn(HEROES,value)?value as HeroId:value==='hero.purifier_flagship'?'purifier_flagship':heroByModel.get(value);
  if(hero){heroes.add(hero);required.add(HEROES[hero].baseFamily);}
 };
 for(const [key,family]of scope.models??[]){identity(key);identity(family);}
 const seen=new WeakSet<object>();
 const visit=(value:unknown):void=>{
  if(typeof value==='string'){identity(value);return;}
  if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
  if(value instanceof Map){for(const [key,child]of value){visit(key);visit(child);}}
  else if(value instanceof Set){for(const child of value)visit(child);}
  else if(!ArrayBuffer.isView(value))for(const child of Object.values(value))visit(child);
 };
 visit(scope.identities);
 // At/after the first boss and mission window, rewards may legally introduce
 // any own-race hero without another pause. Preserve the entire candidate set.
 if(scope.stage>=3)for(const [id,hero]of Object.entries(HEROES))if(hero.race===scope.race)heroes.add(id as HeroId);
 const sources=new Set(Object.keys(catalog).filter(id=>!routed.has(id)));
 // Equipment healing uses the native Medic layer even without a Medivac.
 sources.add('MedicHealModel');
 for(const profile of COMBAT_FX_PROFILES.values())if(required.has(profile.family))for(const id of Object.values(profile.models).flat())sources.add(id);
 return {sources:[...sources].sort(),heroes:[...heroes].sort()};
}
export const fullCombatPreloadPlan=():CombatPreloadPlan=>({sources:Object.keys(catalog).sort(),heroes:Object.keys(HEROES) as HeroId[]});
