import {HEROES,type HeroId} from '../../src/data/heroes';
import {SC2_UNITS,type CombatUnitType} from '../../src/data/sc2-units';
import {SOURCE_UNIT_MODES,SOURCE_UNIT_WEAPON_IDS,sourceWeaponsForUnit,type VerifiedAddedUnitType} from '../../src/data/expansion-units';

export type AttackBranch={plane:'ground'|'air';weapon?:string;selectedWeapon?:string;minimumRange:number;range:number;via?:'native-interceptor'};
/** Catalogue enumeration only. Independent World probes verify every rank. */
export function actorAttackBranches(actor:string,family:string,mode?:string):AttackBranch[]{
 if(actor.startsWith('hero.')){
  const h=HEROES[actor.slice(5) as HeroId],carrier=actor==='hero.purifier_flagship';
  return planes(carrier?'both':h.target).map(plane=>({plane,minimumRange:0,range:h.range,...(carrier?{via:'native-interceptor' as const}:{})}));
 }
 // These elite tanks can fire only after their native siege transition.
 if(['elite.tank.2','elite.tank.3'].includes(actor)&&mode!=='siege')return [];
 const nativeMode=mode&&mode!==family?mode as keyof typeof SOURCE_UNIT_MODES:undefined;
 if(family in SOURCE_UNIT_WEAPON_IDS){
  return sourceWeaponsForUnit(family as VerifiedAddedUnitType,nativeMode).flatMap(w=>planes(w.targetType).map(plane=>({plane,weapon:w.weaponId,selectedWeapon:w.weaponId,minimumRange:w.minimumRange,range:w.attackRange})));
 }
 const m=nativeMode&&SOURCE_UNIT_MODES[nativeMode];
 if(m)return planes(m.weapon.targetType).map(plane=>({plane,weapon:m.weapon.weaponId,minimumRange:m.weapon.minimumRange,range:m.weapon.attackRange}));
 const d=SC2_UNITS[family as CombatUnitType];return planes(d.targetType).map(plane=>({plane,minimumRange:0,range:d.attackRange}));
}
function planes(target:string):('ground'|'air')[]{return target==='both'?['ground','air']:target==='ground'||target==='air'?[target]:[];}

