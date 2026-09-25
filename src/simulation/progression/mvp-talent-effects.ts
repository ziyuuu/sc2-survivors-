import type {Race} from '../../data/races';
import {talentRank,type TalentLevels} from '../../data/mvp-talents';

export interface TalentSubject {
 team:'player'|'enemy'|'neutral';race:Race;kind:'ordinary'|'elite'|'hero'|'summon'|'raceAbility';
 familyId?:string;attributes?:readonly string[];mode?:string;freeConscript?:boolean;
 tacticalTier?:number;tacticalDirection?:'assault'|'guard'|'mobility';
 ownerFamilyId?:string;summonType?:string;ability?:string;manualAbility?:boolean;
}
export interface MvpTalentEffects {
 weaponDamagePct?:number;abilityDamagePct?:number;bonusDamagePct?:number;
 maxHpPct?:number;maxShieldPct?:number;shieldFromHpPct?:number;
 armorFlat?:number;armorPct?:number;shieldArmorFlat?:number;shieldArmorPct?:number;
 moveSpeedPct?:number;attackSpeedPct?:number;rangePct?:number;healingPct?:number;shieldHealingPct?:number;
 postArmorReductionPct?:number;dodgeChance?:number;critChance?:number;
 productionCostReductionPct?:number;productionTimeReductionPct?:number;
 transformTimeReductionPct?:number;abilityCooldownReductionPct?:number;
 catchupThreshold?:number;catchupSpeedPct?:number;aimingSpeedMultiplier?:number;movingFireChance?:number;apmDuplicate?:number;
 lifeRegenMultiplierPct?:number;lifeRegenDelayReductionSeconds?:number;shieldDelayReductionSeconds?:number;
 energyRegenPct?:number;maxEnergyFlat?:number;shieldRegenPct?:number;regenMaxHpPerSecond?:number;
 abilityEnergyReductionPct?:number;detectionRadiusPct?:number;detectionDurationFlat?:number;
}

/** Adds percentages within the talent layer before existing cards/tech/rank multipliers. */
export function aggregateMvpTalentEffects(levels:TalentLevels,race:Race,subject:TalentSubject):MvpTalentEffects {
 if(subject.team!=='player'||subject.race!==race)return {};
 if(!subject.tacticalTier&&Object.keys(levels).length===0)return {};
 const rank=(id:string)=>talentRank(levels,race,id);
 const out:MvpTalentEffects={};
 const add=(key:keyof MvpTalentEffects,amount:number)=>{if(amount)(out as Record<string,number>)[key]=((out as Record<string,number>)[key]??0)+amount;};
 if(subject.kind==='raceAbility'){
  if(subject.manualAbility)add('abilityCooldownReductionPct',Math.min(.5,.08*rank('skill_recovery')));
  return out;
 }
 if(subject.kind==='summon'){
  if(subject.summonType==='interceptor'&&subject.ownerFamilyId==='carrier'){
   add('weaponDamagePct',.05*rank('advanced_arms')+.05*rank('weapon_upgrade')+.10*rank('big_firepower'));
   add('bonusDamagePct',.1*rank('advantage_army'));
   add('attackSpeedPct',.05*rank('advanced_arms')+.08*rank('rapid_attack'));
   out.apmDuplicate=rank('apm_master')?1:0;
  }
  return out;
 }
 const combat=subject.kind==='ordinary'||subject.kind==='elite'||subject.kind==='hero';
 if(!combat)return out;
 const s01=rank('advanced_arms'),s12=rank('super_meat');
 add('maxHpPct',.05*s01+(race==='protoss'?.10:.15)*s12);
 add('moveSpeedPct',.05*s01+.05*rank('light_armor')+.05*rank('marathon'));
 add('attackSpeedPct',.05*s01+.08*rank('rapid_attack'));
 add('healingPct',.05*s01);
 add('armorPct',.05*s01);
 add('postArmorReductionPct',.04*rank('armor_upgrade'));
 add('dodgeChance',.03*rank('veteran_dodge'));
 add('critChance',.05*rank('headshot'));
 add('bonusDamagePct',.1*rank('advantage_army'));
 add('rangePct',.04*rank('range_master'));
 if(race==='protoss'){
  add('maxShieldPct',.05*s01+.10*s12);
  add('shieldArmorPct',.05*s01);
  add('shieldHealingPct',.05*s01);
  add('shieldFromHpPct',.10*rank('bio_shield'));
 }else if(subject.attributes?.includes('Biological'))add('shieldFromHpPct',.10*rank('bio_shield'));
 add('weaponDamagePct',.05*s01+.05*rank('weapon_upgrade')+.10*rank('big_firepower'));
 if(subject.kind==='hero')add('abilityDamagePct',.05*s01);
 if(subject.kind==='ordinary'&&subject.freeConscript)add('maxHpPct',.10*rank('conscript_network'));
 if(subject.manualAbility)add('abilityCooldownReductionPct',Math.min(.5,.08*rank('skill_recovery')));
 if(rank('tidy_squad')){const r=rank('tidy_squad');out.catchupThreshold=[0,8,6,4][r];out.catchupSpeedPct=.1*r;}
 if(rank('stutter_king')){out.aimingSpeedMultiplier=rank('stutter_king')===1?1.5:2;out.movingFireChance=.5*rank('stutter_king');}
 if(rank('apm_master'))out.apmDuplicate=1;
 if(subject.kind==='ordinary'&&subject.tacticalTier){
  const tier=Math.min(5,subject.tacticalTier);
  if(subject.tacticalDirection==='assault')add('weaponDamagePct',.10*tier);
  if(subject.tacticalDirection==='guard'){
   if(race==='protoss')add('maxShieldPct',.15*tier);
   else add('maxHpPct',.10*tier);
   if(race==='terran')add('armorPct',.10*tier);
   if(race==='zerg')add('lifeRegenMultiplierPct',.10*tier);
   if(race==='protoss')add('shieldArmorPct',.10*tier);
  }
  if(subject.tacticalDirection==='mobility'){
   add('moveSpeedPct',(race==='terran'?.10:.08)*tier);
   if(race==='zerg')add('lifeRegenDelayReductionSeconds',.2*tier);
   if(race==='protoss')add('shieldDelayReductionSeconds',.2*tier);
  }
 }
 const mode=subject.mode;
 if(race==='terran'&&rank('quick_siege')&&['tank','siege','hellion','hellbat','viking','viking_assault','thor','thor_high_impact'].includes(mode??subject.familyId??''))add('transformTimeReductionPct',Math.min(.99,.33*rank('quick_siege')));
 if(race==='zerg'&&rank('quick_siege')&&subject.familyId==='lurker')add('transformTimeReductionPct',Math.min(.99,.33*rank('quick_siege')));
 return out;
}
