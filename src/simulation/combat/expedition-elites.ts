import {revisedElite} from './terran-elite-runtime';
import {revisedZergElite} from './zerg-elite-runtime';
import {revisedProtossElite} from './protoss-elite-runtime';
import {reservedZergElite} from './zerg-hero-revival';
import {ELITES,type EliteId} from '../../data/elites';
import {RUNTIME_ASSETS} from '../../assets/runtime.generated';
import {familyRace} from '../../data/races';
import type {Entity,Body} from '../types';
import type {World} from '../world';
export function eliteEffect(u:Entity,stat:string,fallback=1){if(revisedElite(u)||revisedZergElite(u)||revisedProtossElite(u))return fallback;const effect=u.eliteId?ELITES[u.eliteId].effect:undefined;return effect?.stat===stat?effect.amount:fallback;}
export function canAcquireExpeditionElite(w:World,id:EliteId){const s=w.expedition,e=ELITES[id];if(w.terranElites.absorptions.some(r=>r.elite===id&&w.entities.get(r.hunter)?.hp))return false;if(!s||!e||familyRace(e.family)!==s.race||!s.familySlots.includes(e.family)||w.pendingElites.some(other=>ELITES[other].family===e.family))return false;const living=w.eliteOwned(id);if(living)return living.rank<5;if(reservedZergElite(w,id))return false;if(!RUNTIME_ASSETS.some(asset=>asset.id==='model.'+e.model&&asset.status==='available'))return false;return w.eliteCandidates(id).length>0||w.familySeatCount(e.family)<w.rosterCap&&w.ordinaryCapacity(e.family)-5>=w.reservedRanks(e.family);}
export function eliteDamageMultiplier(u:Entity,target:Body){let factor=target.flying?eliteEffect(u,'airAttackDamageMultiplier'):eliteEffect(u,'groundAttackDamageMultiplier');if(target.attributes.includes('Armored'))factor*=eliteEffect(u,'armoredDamageMultiplier')*(target.flying?eliteEffect(u,'armoredAirDamageMultiplier'):eliteEffect(u,'armoredGroundDamageMultiplier'));if(target.attributes.includes('Light'))factor*=eliteEffect(u,'lightAttackDamageMultiplier')*(target.flying?eliteEffect(u,'lightAirDamageMultiplier'):1);return factor;}
