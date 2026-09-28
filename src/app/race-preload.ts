import {FAMILIES_BY_RACE,type Race,type CombatUnitType} from '../data/races';
import {ELITES} from '../data/elites';
import {HEROES} from '../data/heroes';

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
