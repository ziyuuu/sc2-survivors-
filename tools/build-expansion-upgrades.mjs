import fs from 'node:fs';
import crypto from 'node:crypto';
import {LockedCatalog,LOCKED_LAYERS} from './resolve-expansion-data.mjs';
const catalog=new LockedCatalog();
// Catalog layers can repeat unindexed rows. A reference is one final field change, not repeated investment.
function changes(id){const node=catalog.resolve('upgrade',id);if(!node)throw Error(`Missing upgrade ${id}`);return Object.fromEntries(node.children.filter(n=>n.tag==='EffectArray'&&n.attributes.Reference).map(n=>[n.attributes.Reference,{operation:n.attributes.Operation??'Add',value:Number(n.attributes.Value)}]));}
function change(id,ref){const row=changes(id)[ref];if(!row||!Number.isFinite(row.value))throw Error(`Missing ${id}:${ref}`);return row.value;}
const groups={'terran.infantry':'TerranInfantryWeapons','terran.vehicle':'TerranVehicleWeapons','terran.air_weapon':'TerranShipWeapons','zerg.melee':'ZergMeleeWeapons','zerg.missile':'ZergMissileWeapons','zerg.flyer_weapon':'ZergFlyerWeapons','protoss.ground_weapon':'ProtossGroundWeapons','protoss.air_weapon':'ProtossAirWeapons'};
const primary={marine:'GuassRifle',marauder:'PunisherGrenadesU',reaper:'P38ScytheGuassPistol',hellion:'InfernalFlameThrower',tank:'90mmCannons',thor:'ThorsHammerDamage',viking:'LanzerTorpedoesDamage',banshee:'BacklashRocketsU',medivac:null,science_vessel:null,zergling:'Claws',baneling:'VolatileBurstU',roach:'AcidSalivaU',ravager:'RavagerWeaponDamage',hydralisk:'NeedleSpinesDamage',queen:'TalonsMissileDamage',lurker:'LurkerMPDamage',mutalisk:'GlaiveWurmU1',corruptor:'ParasiteSporeDamage',ultralisk:'KaiserBladesDamage',zealot:'PsiBlades',adept:'AdeptDamage',stalker:'ParticleDisruptorsU',sentry:'DisruptionBeamDamage',immortal:'PhaseDisruptors',colossus:'ThermalLancesMU',high_templar:'HighTemplarWeaponDamage',phoenix:'IonCannonsU',void_ray:'VoidRaySwarmDamage',carrier:'InterceptorBeamDamage'};
const selected=new Set([...Object.values(primary),'HellionTankDamage','CrucioShockCannonBlast','TwinGatlingCannons','JavelinMissileLaunchersDamage','LanceMissileLaunchersDamage','AcidSpines','Talons','GlaiveWurmU2','GlaiveWurmU3','VolatileBurstU2']);
const steps={};
for(const [key,prefix] of Object.entries(groups))for(let level=1;level<=3;level++){
 for(const [ref,row] of Object.entries(changes(prefix+'Level'+level))){const [,effect,field]=ref.split(',');if(!ref.startsWith('Effect,')||!selected.has(effect)||!Number.isFinite(row.value))continue;
  if(field!=='Amount'&&!field.startsWith('AttributeBonus[')&&field!=='ShieldBonus')continue;
  if(row.operation!=='Add')throw Error(`Expected additive weapon step ${prefix}: ${ref}`);
  steps[effect]??={upgradeKey:key,sourceIds:[1,2,3].map(n=>prefix+'Level'+n),perLevel:Array.from({length:3},()=>({damage:0,bonusDamage:{},shieldBonus:0}))};
  const step=steps[effect].perLevel[level-1];if(field==='Amount')step.damage=row.value;else if(field==='ShieldBonus')step.shieldBonus=row.value;else step.bonusDamage[field.slice(15,-1)]=row.value;
 }
}
const FASTER=1.4;
const research={
 infernal:{sourceId:'HighCapacityBarrels',hellionLightBonus:change('HighCapacityBarrels','Effect,InfernalFlameThrower,AttributeBonus[Light]'),hellbatLightBonus:change('HighCapacityBarrels','Effect,HellionTankDamage,AttributeBonus[Light]')},
 shield:{sourceId:'ShieldWall',maxHpAdd:change('ShieldWall','Unit,Marine,LifeMax')},
 ling_speed:{sourceId:'zerglingmovementspeed',speedAdd:change('zerglingmovementspeed','Unit,Zergling,Speed')*FASTER},
 bane_speed:{sourceId:'CentrificalHooks',speedAdd:change('CentrificalHooks','Unit,Baneling,Speed')*FASTER,maxHpAdd:change('CentrificalHooks','Unit,Baneling,LifeMax')},
 roach_speed:{sourceId:'GlialReconstitution',speedAdd:change('GlialReconstitution','Unit,Roach,Speed')*FASTER},
 hydra_range:{sourceId:'EvolveGroovedSpines',rangeAdd:change('EvolveGroovedSpines','Weapon,NeedleSpines,Range')},
 lurker_deploy:{sourceId:'DiggingClaws',burrowSecondsSubtract:change('DiggingClaws','Abil,BurrowLurkerMPDown,InfoArray[0].SectionArray[Actor].DurationArray[Duration]')/FASTER,randomDelaySecondsSubtract:change('DiggingClaws','Abil,BurrowLurkerMPDown,InfoArray[0].RandomDelayMax')/FASTER,speedAdd:change('DiggingClaws','Unit,LurkerMP,Speed')*FASTER},
 charge:{sourceId:'Charge',speedAdd:change('Charge','Unit,Zealot,Speed')*FASTER},
 glaives:{sourceId:'AdeptPiercingAttack',attackSpeedAdd:change('AdeptPiercingAttack','Weapon,Adept,RateMultiplier')},
 colossus_range:{sourceId:'ExtendedThermalLance',rangeAdd:change('ExtendedThermalLance','Weapon,ThermalLances,Range')},
};
const provenance={version:'5.0.15',revision:'fbbd6429b1eb6978c78a092dc68ba09029d03171',files:LOCKED_LAYERS.map(layer=>{const file=`.cache/sc2-data/${layer}-upgradedata.xml`;return {file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};})};
const output=`/** Generated from pinned 5.0.15 UpgradeData. Ordinary weapon increments are source values, not flat +1 assumptions. */
import type {FamilyId} from './races';
export interface SourceWeaponUpgradeDelta {damage:number;bonusDamage:Record<string,number>;shieldBonus:number;}
export interface SourceWeaponUpgrade {upgradeKey:string;sourceIds:readonly string[];perLevel:readonly SourceWeaponUpgradeDelta[];}
export const SOURCE_UPGRADE_PROFILE=${JSON.stringify(provenance,null,2)} as const;
export const SOURCE_PRIMARY_DAMAGE_EFFECT:Record<FamilyId,string|null>=${JSON.stringify(primary,null,2)};
export const SOURCE_WEAPON_UPGRADE_STEPS:Readonly<Record<string,SourceWeaponUpgrade>>=${JSON.stringify(steps,null,2)};
export const SOURCE_RESEARCH_EFFECTS=${JSON.stringify(research,null,2)} as const;
export function sourceWeaponUpgradeDelta(effectId:string|null,level:number):SourceWeaponUpgradeDelta {const result:SourceWeaponUpgradeDelta={damage:0,bonusDamage:{},shieldBonus:0};if(!effectId)return result;for(const step of SOURCE_WEAPON_UPGRADE_STEPS[effectId]?.perLevel.slice(0,Math.max(0,Math.min(3,Math.floor(level))))??[]){result.damage+=step.damage;result.shieldBonus+=step.shieldBonus;for(const [attribute,amount] of Object.entries(step.bonusDamage))result.bonusDamage[attribute]=(result.bonusDamage[attribute]??0)+amount;}return result;}
`;
const file='src/data/expansion-upgrades.ts';if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==output)throw Error('Upgrade source table differs from pinned XML');console.log('Upgrade source matches pinned XML');}else {fs.writeFileSync(file,output);console.log(`Wrote ${Object.keys(steps).length} effect upgrade tracks and ${Object.keys(research).length} research profiles`);}
