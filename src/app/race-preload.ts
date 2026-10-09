import {FAMILIES_BY_RACE,type Race,type CombatUnitType} from '../data/races';
import {ELITES} from '../data/elites';
import {HEROES} from '../data/heroes';
import {ASSETS} from '../assets/manifest';

/** Complete selected-race roster plus the fixed enemy roster. Values are body types, not family slots. */
export function racePreloadModels(race:Race){
 const models=new Map<string,CombatUnitType>();
 for(const family of [...FAMILIES_BY_RACE[race],...FAMILIES_BY_RACE.zerg])models.set(family,family);
 for(const elite of Object.values(ELITES))if((FAMILIES_BY_RACE[race] as readonly string[]).includes(elite.family))models.set(elite.model,elite.family);
 for(const hero of Object.values(HEROES))if(hero.race===race)models.set(hero.model,hero.baseFamily);
 if(race==='terran'){models.set('hellion.hellbat','hellion');models.set('viking.assault','viking');}
 if(race==='protoss')models.set('interceptor','marine');
 return models;
}

/** Fetch/decode a roster's exact existing forms together so shared chunks are reused. */
export function modelPreloadAssets(models:Iterable<readonly [string,CombatUnitType]>){
 return [...new Set([...models].flatMap(([key,type])=>[
  'model.'+key,...['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])].map(suffix=>'model.'+key+suffix).filter(id=>ASSETS.has(id))
 ]))];
}
