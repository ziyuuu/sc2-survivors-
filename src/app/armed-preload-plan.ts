import {HEROES} from '../data/heroes';
import type {ExpeditionState} from '../simulation/expedition-state';
import type {CombatUnitType} from '../data/races';
import {ELITES} from '../data/elites';
import {armedElitePool} from '../simulation/combat/armed-reinforcements';
import {counterHeroCandidates} from '../simulation/combat/armed-counterattack';
import type {StageContent} from '../simulation/progression/run-content';
import type {Fortification} from '../simulation/types';

export const armedPropModels=[['W06','support.medkit',.5],['G09','support.repair_drone',.8]] as const;
export const armedFortModels=[['P05','supply_depot'],['O03','planetary']] as const;
/** Include still-visible fields, pending drops and real buildings from a restored field. */
export function armedSceneKeys(s:ExpeditionState,forts?:Iterable<Pick<Fortification,'kind'>>){
 const keys=new Set<string>(),a=s.support.armed;
 for(const [card,key] of armedPropModels)if(a?.ranks[card]||a?.fields?.some(f=>f.cardId===card))keys.add(key);
 for(const [card,kind] of armedFortModels)if(a?.ranks[card]||a?.deployments.some(d=>d.cardId===card))keys.add('fort.'+kind);
 if(s.tech['unlock.raven']||s.familySlots.includes('raven')||a?.ranks.W07||a?.deployments.some(d=>d.cardId==='W07'&&d.phase!=='ended'))keys.add('fort.turret_terran');
 if(s.support.unique.levels['terran.bunker']||s.support.unique.landing)keys.add('fort.bunker');
 for(const f of forts??[])keys.add('fort.'+f.kind);
 return keys;
}

/** Future passengers of cards already owned, including restored in-flight rows. */
export function armedSupportModels(s:ExpeditionState,planned?:Pick<StageContent,'heroes'|'elites'>){
 const models=new Map<string,CombatUnitType>(),a=s.support.armed;
 const bio=s.bio?.ranks;if(bio){if(bio['BIO-W01']||bio['BIO-B03'])models.set('zergling','zergling');if(bio['BIO-B01']||bio['BIO-B03'])models.set('baneling','baneling');if(bio['BIO-B03']){models.set('mutalisk','mutalisk');models.set('fun-cocoon','zergling');}if(bio['BIO-B05'])models.set('overlord','mutalisk');if(bio['BIO-G05'])models.set('reaper','reaper');if(bio['BIO-O02'])models.set(HEROES.kerrigan.model,HEROES.kerrigan.baseFamily);}
 if(!a)return models;
 const add=(family:CombatUnitType)=>models.set(family,family);
 if(a.ranks.W01)add('marine');
 if(a.ranks.G05)add('hellion');if(a.ranks.G06)add('zergling');if(a.ranks.B03)add('reaper');if(a.ranks.B08){add('tank');add('medivac');}
 const heroes=new Set(a.ranks.O01?counterHeroCandidates(planned?.heroes):[]);
 const committed=a.counter?.activation;
 if(committed&&(!committed.finished||committed.heroPending))heroes.add(committed.hero);
 for(const id of heroes){const h=HEROES[id];models.set(h.model,h.baseFamily);}
 if(a.ranks.O03)add('marine');
 if(a.ranks.B06){add('viking');add('battlecruiser');}if(a.ranks.O02){add('battlecruiser');for(const id of ['tank.1','tank.2'] as const)models.set(ELITES[id].model,ELITES[id].family);}
 if(a.ranks.P02||a.ranks.O02)for(const id of ['thor.1','thor.2','thor.3'] as const)models.set(ELITES[id].model,ELITES[id].family);
 if(a.ranks.W02||a.ranks.G03||a.ranks.B05)for(const f of s.familySlots)add(f);
 for(const d of a.deployments)if(d.phase!=='ended')for(const p of d.passengers)if(!p.cancelled&&p.entityId===null){add(p.family);if(p.eliteId)models.set(ELITES[p.eliteId].model,p.family);}
 if(a.ranks.N02)for(const f of ['marine','reaper','marauder'] as const)add(f);
 if(a.ranks.N03)for(const family of [...models.values()])for(const e of armedElitePool(family as import('../data/races').FamilyId,planned?.elites))models.set(e.model,e.family);
 return models;
}
