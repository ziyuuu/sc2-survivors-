import type {World} from '../../world';
import type {Body,Entity} from '../../types';
import {unitData} from '../expedition-combat';
import {SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../../data/expansion-units';

/** Select a legal weapon view without changing activeWeapon, statistics or RNG. */
export function candidateWeapon(w:World,u:Entity,b:Body){
 const air=b.flying||w.entities.get(b.id)?.unitType==='colossus';
 if(u.heroId||u.summonKind||!(u.unitType in SOURCE_UNIT_WEAPON_IDS))return unitData(u);
 const mode=u.owner==='terran'&&u.unitType==='lurker'?'lurker_burrowed':u.nativeMode;
 const weapons=sourceWeaponsForUnit(u.unitType as VerifiedAddedUnitType,mode as Parameters<typeof sourceWeaponsForUnit>[1]);
 return weapons.find(a=>(u.winged||a.targetType==='both'||a.targetType==='air'&&air||a.targetType==='ground'&&!b.flying)&&w.edgeDistance(u,b)>=a.minimumRange&&w.edgeDistance(u,b)<=a.attackRange)
  ??weapons.find(a=>u.winged||a.targetType==='both'||a.targetType==='air'&&air||a.targetType==='ground'&&!b.flying)??unitData(u);
}
const threatCache=new WeakMap<Entity,{world:World;time:number;victim:Body|undefined;target:number|null;pending:number|null;active:boolean;score:number}>();
function threat(w:World,e:Entity){
 const victim=w.body(e.pendingTarget??e.attackTarget),old=threatCache.get(e);
 if(old&&old.world===w&&old.time===w.time&&old.victim===victim&&old.target===e.attackTarget&&old.pending===e.pendingTarget&&(!victim||victim.hp>0))return old;
 const active=e.weaponDamage>0&&!!victim&&victim.hp>0&&victim.owner==='terran'&&w.targetAllowed(e,victim);
 const entry={world:w,time:w.time,victim,target:e.attackTarget,pending:e.pendingTarget,active,score:active?Math.min(12,Math.log1p(e.weaponDamage*unitData(e).attacks/Math.max(.1,e.attackPeriod))*2):0};threatCache.set(e,entry);return entry;
}
/** Responsibilities are lexicographic tiers, never a distance/HP score bonus. */
export function responsibility(w:World,u:Entity,b:Body){
 const enemy=w.entities.get(b.id),melee=candidateWeapon(w,u,b).attackRange<1.5;
 if(!enemy)return 3;
 const bane=enemy.unitType==='baneling';
 const threatening=threat(w,enemy).active;
 if(!melee)return bane?0:enemy.attackRange<1.5&&threatening?1:2;
 if(bane)return 3;
 const casting=enemy.unitType==='high_templar'&&enemy.energy>=75||enemy.unitType==='ravager'&&enemy.bileCooldown<=1;
 if(enemy.attackRange>=1.5&&(threatening||casting))return 0;
 return enemy.attackRange<1.5?1:2;
}
export function threatPreference(w:World,u:Entity,b:Body){
 const e=w.entities.get(b.id);if(!e||e.weaponDamage<=0)return 0;
 return threat(w,e).score;
}
