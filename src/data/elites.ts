import {TERRAN_ELITE_RULES,isTerranEliteId,terranEliteGrowth} from './terran-elites';
import {ZERG_ELITE_RULES,isZergEliteId,zergEliteGrowth} from './zerg-elites';
import {PROTOSS_ELITE_RULES,isProtossEliteId,protossEliteGrowth} from './protoss-elites';
import {TEAM_AURA_HELP} from './team-auras';
import type {FamilyId} from './races';
export type EliteId=`${FamilyId}.${1|2|3}`;
export interface EliteDefinition {id:EliteId;family:FamilyId;name:string;description:string;model:string;sourceModel:string;icon:string}
/** Approved model identities only. Combat parameters come exclusively from the three race rule tables. */
const presentation:Record<EliteId,readonly [FamilyId,string,string,string]>={
 "marine.1":["marine","elite.marine.1","marine / Covert Ops","unit.marine"],
 "marine.2":["marine","elite.marine.2","marine / Merc","unit.marine"],
 "marine.3":["marine","elite.marine.3","marine / Junker","unit.marine"],
 "marauder.1":["marauder","elite.marauder.1","marauder / Covert Ops","unit.marauder"],
 "marauder.2":["marauder","elite.marauder.2","marauder / Merc","unit.marauder"],
 "marauder.3":["marauder","elite.marauder.3","marauder / Junker","unit.marauder"],
 "hellion.1":["hellion","elite.hellion.1","hellion / Covert Ops","unit.hellion"],
 "hellion.2":["hellion","elite.hellion.2","hellion / Merc","unit.hellion"],
 "hellion.3":["hellion","elite.hellion.3","hellion / Junker","unit.hellion"],
 "tank.1":["tank","elite.tank.1","tank / Covert Ops","unit.tank"],
 "tank.2":["tank","elite.tank.2","tank / Junker","unit.tank"],
 "tank.3":["tank","elite.tank.3","tank / Commando","unit.tank"],
 "medivac.1":["medivac","elite.medivac.1","medivac / Covert Ops","unit.medivac"],
 "medivac.2":["medivac","elite.medivac.2","medivac / Merc","unit.medivac"],
 "medivac.3":["medivac","elite.medivac.3","medivac / Junker","unit.medivac"],
 "reaper.1":["reaper","elite.reaper.1","Reaper_CovertOps_Collection","unit.reaper"],
 "thor.1":["thor","elite.thor.1","Thor_CovertOps_Collection","unit.thor"],
 "viking.1":["viking","elite.viking.1","Viking_MercFighter_Collection","unit.viking"],
 "banshee.1":["banshee","elite.banshee.1","Banshee_CovertsOps_Collection","unit.banshee"],
 "science_vessel.1":["science_vessel","elite.science_vessel.1","Hologram_Skin_ScienceVessel","unit.science_vessel"],
 "zergling.1":["zergling","elite.zergling.1","Zergling_CollectionSkin_Webby","unit.zergling"],
 "baneling.1":["baneling","elite.baneling.1","Baneling_Webby_Collection","unit.baneling"],
 "roach.1":["roach","elite.roach.1","Roach_CollectionSkin_Webby","unit.roach"],
 "ravager.1":["ravager","elite.ravager.1","Ravager_CollectionSkin_Webby","unit.ravager"],
 "hydralisk.1":["hydralisk","elite.hydralisk.1","Hydralisk_Collection_Webby","unit.hydralisk"],
 "lurker.1":["lurker","elite.lurker.1","Lurker_CollectionSkin_Webby","unit.lurker"],
 "queen.1":["queen","elite.queen.1","Queen_CollectionSkin_Webby","unit.queen"],
 "mutalisk.1":["mutalisk","elite.mutalisk.1","Mutalisk_CollectionSkin_Webby","unit.mutalisk"],
 "corruptor.1":["corruptor","elite.corruptor.1","Corruptor_CollectionSkin_Webby","unit.corruptor"],
 "ultralisk.1":["ultralisk","elite.ultralisk.1","Ultralisk_CollectionSkin_Webby","unit.ultralisk"],
 "zealot.1":["zealot","elite.zealot.1","Zealot_Purifier_Collection","unit.zealot"],
 "adept.1":["adept","elite.adept.1","Adept_Purifier_Collection","unit.adept"],
 "stalker.1":["stalker","elite.stalker.1","Stalker_Purifier_Collection","unit.stalker"],
 "sentry.1":["sentry","elite.sentry.1","Sentry_Purifier_Collection","unit.sentry"],
 "immortal.1":["immortal","elite.immortal.1","Immortal_Purifier_Collection","unit.immortal"],
 "colossus.1":["colossus","elite.colossus.1","Colossus_Purifier_Collection","unit.colossus"],
 "high_templar.1":["high_templar","elite.high_templar.1","HighTemplar_Purifier_Collection","unit.high_templar"],
 "phoenix.1":["phoenix","elite.phoenix.1","Phoenix_Purifier_Collection","unit.phoenix"],
 "void_ray.1":["void_ray","elite.void_ray.1","VoidRay_Purifier_Collection","unit.void_ray"],
 "carrier.1":["carrier","elite.carrier.1","Carrier_Purifier_Collection","unit.carrier"],
 "viking.2":["viking","elite.viking.1","Viking_MercFighter_Collection","unit.viking"],
 "viking.3":["viking","elite.viking.1","Viking_MercFighter_Collection","unit.viking"],
 "ravager.2":["ravager","elite.ravager.1","Ravager_CollectionSkin_Webby","unit.ravager"],
 "ravager.3":["ravager","elite.ravager.1","Ravager_CollectionSkin_Webby","unit.ravager"],
 "high_templar.2":["high_templar","elite.high_templar.1","HighTemplar_Purifier_Collection","unit.high_templar"],
 "high_templar.3":["high_templar","elite.high_templar.1","HighTemplar_Purifier_Collection","unit.high_templar"],
 "reaper.2":["reaper","elite.reaper.1","Reaper_CovertOps_Collection","unit.reaper"],
 "reaper.3":["reaper","elite.reaper.1","Reaper_CovertOps_Collection","unit.reaper"],
 "thor.2":["thor","elite.thor.1","Thor_CovertOps_Collection","unit.thor"],
 "thor.3":["thor","elite.thor.1","Thor_CovertOps_Collection","unit.thor"],
 "banshee.2":["banshee","elite.banshee.1","Banshee_CovertsOps_Collection","unit.banshee"],
 "banshee.3":["banshee","elite.banshee.1","Banshee_CovertsOps_Collection","unit.banshee"],
 "science_vessel.2":["science_vessel","elite.science_vessel.1","Hologram_Skin_ScienceVessel","unit.science_vessel"],
 "science_vessel.3":["science_vessel","elite.science_vessel.1","Hologram_Skin_ScienceVessel","unit.science_vessel"],
 "zergling.2":["zergling","elite.zergling.1","Zergling_CollectionSkin_Webby","unit.zergling"],
 "zergling.3":["zergling","elite.zergling.1","Zergling_CollectionSkin_Webby","unit.zergling"],
 "baneling.2":["baneling","elite.baneling.1","Baneling_Webby_Collection","unit.baneling"],
 "baneling.3":["baneling","elite.baneling.1","Baneling_Webby_Collection","unit.baneling"],
 "roach.2":["roach","elite.roach.1","Roach_CollectionSkin_Webby","unit.roach"],
 "roach.3":["roach","elite.roach.1","Roach_CollectionSkin_Webby","unit.roach"],
 "hydralisk.2":["hydralisk","elite.hydralisk.1","Hydralisk_Collection_Webby","unit.hydralisk"],
 "hydralisk.3":["hydralisk","elite.hydralisk.1","Hydralisk_Collection_Webby","unit.hydralisk"],
 "lurker.2":["lurker","elite.lurker.1","Lurker_CollectionSkin_Webby","unit.lurker"],
 "lurker.3":["lurker","elite.lurker.1","Lurker_CollectionSkin_Webby","unit.lurker"],
 "queen.2":["queen","elite.queen.1","Queen_CollectionSkin_Webby","unit.queen"],
 "queen.3":["queen","elite.queen.1","Queen_CollectionSkin_Webby","unit.queen"],
 "mutalisk.2":["mutalisk","elite.mutalisk.1","Mutalisk_CollectionSkin_Webby","unit.mutalisk"],
 "mutalisk.3":["mutalisk","elite.mutalisk.1","Mutalisk_CollectionSkin_Webby","unit.mutalisk"],
 "corruptor.2":["corruptor","elite.corruptor.1","Corruptor_CollectionSkin_Webby","unit.corruptor"],
 "corruptor.3":["corruptor","elite.corruptor.1","Corruptor_CollectionSkin_Webby","unit.corruptor"],
 "ultralisk.2":["ultralisk","elite.ultralisk.1","Ultralisk_CollectionSkin_Webby","unit.ultralisk"],
 "ultralisk.3":["ultralisk","elite.ultralisk.1","Ultralisk_CollectionSkin_Webby","unit.ultralisk"],
 "zealot.2":["zealot","elite.zealot.1","Zealot_Purifier_Collection","unit.zealot"],
 "zealot.3":["zealot","elite.zealot.1","Zealot_Purifier_Collection","unit.zealot"],
 "adept.2":["adept","elite.adept.1","Adept_Purifier_Collection","unit.adept"],
 "adept.3":["adept","elite.adept.1","Adept_Purifier_Collection","unit.adept"],
 "stalker.2":["stalker","elite.stalker.1","Stalker_Purifier_Collection","unit.stalker"],
 "stalker.3":["stalker","elite.stalker.1","Stalker_Purifier_Collection","unit.stalker"],
 "sentry.2":["sentry","elite.sentry.1","Sentry_Purifier_Collection","unit.sentry"],
 "sentry.3":["sentry","elite.sentry.1","Sentry_Purifier_Collection","unit.sentry"],
 "immortal.2":["immortal","elite.immortal.1","Immortal_Purifier_Collection","unit.immortal"],
 "immortal.3":["immortal","elite.immortal.1","Immortal_Purifier_Collection","unit.immortal"],
 "colossus.2":["colossus","elite.colossus.1","Colossus_Purifier_Collection","unit.colossus"],
 "colossus.3":["colossus","elite.colossus.1","Colossus_Purifier_Collection","unit.colossus"],
 "phoenix.2":["phoenix","elite.phoenix.1","Phoenix_Purifier_Collection","unit.phoenix"],
 "phoenix.3":["phoenix","elite.phoenix.1","Phoenix_Purifier_Collection","unit.phoenix"],
 "void_ray.2":["void_ray","elite.void_ray.1","VoidRay_Purifier_Collection","unit.void_ray"],
 "void_ray.3":["void_ray","elite.void_ray.1","VoidRay_Purifier_Collection","unit.void_ray"],
 "carrier.2":["carrier","elite.carrier.1","Carrier_Purifier_Collection","unit.carrier"],
 "carrier.3":["carrier","elite.carrier.1","Carrier_Purifier_Collection","unit.carrier"]
};
const rules={...TERRAN_ELITE_RULES,...ZERG_ELITE_RULES,...PROTOSS_ELITE_RULES};
export const ELITES=Object.fromEntries(Object.entries(presentation).map(([key,[family,model,sourceModel,icon]])=>{
 const id=key as EliteId,rule=rules[id],aura=TEAM_AURA_HELP[id as keyof typeof TEAM_AURA_HELP];
 return [id,{id,family,name:rule.name,description:rule.description+(aura?' '+aura:''),model,sourceModel,icon}];
})) as Record<EliteId,EliteDefinition>;
export function eliteStats(id:EliteId,rank:number){
 if(isTerranEliteId(id))return terranEliteGrowth(id,rank);
 if(isZergEliteId(id))return zergEliteGrowth(id,rank);
 if(isProtossEliteId(id))return protossEliteGrowth(id,rank);
 throw Error('Unknown elite: '+id);
}
