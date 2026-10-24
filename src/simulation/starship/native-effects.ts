import type {World} from '../world';
import type {Entity} from '../types';
import type {HeroId} from '../../data/heroes';
import {equipmentUnitTotals} from './runtime';
import {projectionFor,projectionOutput} from './projections';
/** Only native amounts explicitly named by the identity contract use this factor. */
export function equipmentNativeFactor(w:World,u:Entity){if(u.mission?.holdout||u.mission?.fleet||!w.starship.enabled||u.owner!=='terran')return 1;return 1+(projectionFor(w,u)?.totals.native??equipmentUnitTotals(w,u).native);}
/** Restorative projection output is independent of the patient's received-healing modifier. */
export function equipmentHealingOutput(w:World,u:Entity,native=true){return projectionOutput(w,u.id)*(native?equipmentNativeFactor(w,u):1);}
export function heroExtraAmount(rank:number){return 1+.2*Math.max(0,rank-5);}
/** Independent native ability bodies keep their existing aura identity, without stacking identical auras. */
export function nativeEquipmentHeroSources(w:World,id:HeroId){const original=w.heroEntity(id),sources=original?[original]:[];if(w.starship.enabled)for(const [entityId] of w.starship.nativeHeroes){const u=w.entities.get(entityId);if(u&&u.id!==original?.id&&u.heroId===id&&u.owner==='terran')sources.push(u);}return sources;}
