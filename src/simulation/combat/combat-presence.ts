import type {World} from '../world';
import type {Entity} from '../types';
import {SC2_UNITS} from '../../data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_INTERCEPTOR,SOURCE_UNIT_MODES} from '../../data/expansion-units';
import {HEROES} from '../../data/heroes';
import {unitData} from './expedition-combat';

const armed=(weapon:{attackDamage:number;targetType:string}|null|undefined)=>!!weapon&&weapon.attackDamage>0&&weapon.targetType!=='none';
/** A surviving combat actor need not be shooting this frame: native deployment,
 * renewable energy, weapon cooldowns and a carrier's hangar remain combat paths.
 * Detached summons and pure healers do not keep a defeated squad alive. */
export function hasCombatPotential(w:Pick<World,'expedition'>,u:Entity){
 if(u.owner!=='terran'||u.hp<=0||u.summonKind)return false;
 if(!w.expedition)return SC2_UNITS[u.unitType].attackDamage>0||!!u.heroId;
 if(u.heroId)return HEROES[u.heroId].damage>0||u.heroId==='purifier_flagship'&&armed(SOURCE_INTERCEPTOR.weapon)&&SOURCE_ABILITIES.carrierHangar.maxCount>0;
 if(u.unitType==='medivac'||u.unitType==='science_vessel')return false;
 if(armed(unitData(u)))return true;
 if(u.unitType==='carrier')return armed(SOURCE_INTERCEPTOR.weapon)&&SOURCE_ABILITIES.carrierHangar.maxCount>0;
 if(u.unitType==='lurker')return armed(SOURCE_UNIT_MODES.lurker_burrowed.weapon);
 return u.unitType==='high_templar'&&!!w.expedition.tech.storm&&SOURCE_ABILITIES.psiStorm.damagePerTick>0;
}
