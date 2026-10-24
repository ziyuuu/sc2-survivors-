import {FAMILIES_BY_RACE,type Race,type CombatUnitType} from '../data/races';
import {CAMPAIGN18_STAGES} from '../data/campaign18';
import {BOSSES} from '../data/enemies';
import {ELITES} from '../data/elites';
import {ELITE_VISUAL_PROFILES} from '../data/elite-visual-profiles';
import {HEROES,type HeroId} from '../data/heroes';
import type {ExpeditionState} from '../simulation/expedition-state';
import {talentRank,type TalentLevels} from '../data/mvp-talents';

/** Rendering dependencies only: never consume the simulation RNG or alter a wave. */
export function campaignPreloadModels(first:number,last:number){
 const models=new Map<string,CombatUnitType>();
 for(let stage=Math.max(1,first);stage<=Math.min(18,last);stage++){
  for(const [type,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)models.set(type,type as CombatUnitType);
  if(BOSSES[stage])models.set(BOSSES[stage].type,BOSSES[stage].type);
 }
 return models;
}

/** Only the reward fixed at stage-three entry, including its native forms. */
export function plannedBossPreloadModels(plan:ExpeditionState['firstBossLoot']){
 const models=new Map<string,CombatUnitType>();if(!plan)return models;
 const effect=plan.reward.expeditionEffect;
 if(effect.kind==='hero'){const hero=HEROES[effect.heroId as HeroId];models.set(hero.model,hero.baseFamily);}
 if(effect.kind==='elite'&&plan.variant){const elite=ELITES[plan.variant],visual=ELITE_VISUAL_PROFILES[plan.variant];models.set(visual.model,elite.family);for(const model of Object.values(visual.forms))models.set(model,elite.family);}
 return models;
}

/** Own ordinary families remain ready for immediate production and native forms.
 * Unchosen heroes/elites and later enemy families no longer hold up a new run. */
export function openingPreloadModels(race:Race,talents:TalentLevels={}){
 const models=new Map<string,CombatUnitType>();
 for(const type of FAMILIES_BY_RACE[race])models.set(type,type);
 for(const entry of campaignPreloadModels(1,3))models.set(...entry);
 if(race==='terran'){models.set('hellion.hellbat','hellion');models.set('viking.assault','viking');}
 if(race==='protoss')models.set('interceptor','marine');
 if(talentRank(talents,race,'mercenary')){
  const families=race==='terran'?['marine','marauder','reaper']:race==='zerg'?['zergling','roach','hydralisk']:['zealot','stalker','immortal'];
  for(const elite of Object.values(ELITES))if(families.includes(elite.family))models.set(elite.model,elite.family);
 }
 return models;
}
