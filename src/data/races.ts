/** Explicit race and allegiance; owner identifies the allied/enemy combat side. */
export type Race = 'terran' | 'zerg' | 'protoss';
export type Team = 'player' | 'enemy' | 'neutral';
export const RACES = ['terran', 'zerg', 'protoss'] as const;
export const RACE_NAMES: Record<Race, string> = {terran:'人族',zerg:'虫族',protoss:'神族'};
export const MVP_RULES = 'mvp-1.0' as const;
export type RulesVersion = typeof MVP_RULES;
export const FAMILY_LIMIT = 5;
export const BODY_LIMIT = 5;
export const ORDINARY_RANK_LIMIT = 5;
export const HERO_LIMIT = 3;
export const inheritedRank = (rank:number) => 1 + Math.floor((Math.max(1,rank)-1)/2);
export const FAMILIES_BY_RACE = {
 terran:['marine','marauder','reaper','hellion','tank','thor','viking','banshee','medivac','science_vessel'],
 zerg:['zergling','baneling','roach','ravager','hydralisk','queen','lurker','mutalisk','corruptor','ultralisk'],
 protoss:['zealot','adept','stalker','sentry','immortal','colossus','high_templar','phoenix','void_ray','carrier'],
} as const;
export type FamilyId = typeof FAMILIES_BY_RACE[Race][number];
export const ALL_FAMILIES = Object.values(FAMILIES_BY_RACE).flat() as FamilyId[];
export function familyRace(id:FamilyId):Race {return RACES.find(r=>(FAMILIES_BY_RACE[r] as readonly string[]).includes(id))!;}
/** Hero-only combat bodies do not enter ordinary family slots or production. */
export const AIR_HERO_TYPES={yamato_battlecruiser:'terran',hots_leviathan:'zerg',purifier_flagship:'protoss'} as const;
export type AirHeroType=keyof typeof AIR_HERO_TYPES;
/** Support-only ordinary bodies; production remains owned by the T06 roster task. */
export const SUPPORT_COMBAT_TYPES={battlecruiser:'terran'} as const;
export type SupportCombatType=keyof typeof SUPPORT_COMBAT_TYPES;
export const isSupportCombatType=(id:string):id is SupportCombatType=>Object.hasOwn(SUPPORT_COMBAT_TYPES,id);
export type CombatUnitType=FamilyId|AirHeroType|SupportCombatType;
export const isAirHeroType=(id:string):id is AirHeroType=>Object.hasOwn(AIR_HERO_TYPES,id);
export function combatRace(id:CombatUnitType):Race{return isAirHeroType(id)?AIR_HERO_TYPES[id]:isSupportCombatType(id)?SUPPORT_COMBAT_TYPES[id]:familyRace(id);}
