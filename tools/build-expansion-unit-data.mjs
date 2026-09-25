import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LockedCatalog,LOCKED_LAYERS,UNIT_XML_IDS,summarizeUnits,child,value,number,indexed} from './resolve-expansion-data.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const c=new LockedCatalog();const units=summarizeUnits(c);const FASTER=1.4;
const labels={reaper:['Reaper','死神'],thor:['Thor','雷神'],viking:['Viking','维京'],banshee:['Banshee','女妖'],queen:['Queen','虫后'],lurker:['Lurker','潜伏者'],mutalisk:['Mutalisk','异龙'],corruptor:['Corruptor','腐化者'],ultralisk:['Ultralisk','雷兽'],zealot:['Zealot','狂热者'],adept:['Adept','使徒'],stalker:['Stalker','追猎者'],sentry:['Sentry','哨兵'],immortal:['Immortal','不朽者'],colossus:['Colossus','巨像'],high_templar:['High Templar','高阶圣堂武士'],phoenix:['Phoenix','凤凰'],void_ray:['Void Ray','虚空辉光舰'],carrier:['Carrier','航母']};
const primary={reaper:['P38ScytheGuassPistol','P38ScytheGuassPistol'],thor:['ThorsHammer','ThorsHammerDamage'],viking:['LanzerTorpedoes','LanzerTorpedoesDamage'],banshee:['BacklashRockets','BacklashRocketsU'],queen:['TalonsMissile','TalonsMissileDamage'],lurker:null,mutalisk:['GlaiveWurm','GlaiveWurmU1'],corruptor:['ParasiteSpore','ParasiteSporeDamage'],ultralisk:['KaiserBlades','KaiserBladesDamage'],zealot:['PsiBlades','PsiBlades'],adept:['Adept','AdeptDamage'],stalker:['ParticleDisruptors','ParticleDisruptorsU'],sentry:['DisruptionBeam','DisruptionBeamDamage'],immortal:['PhaseDisruptors','PhaseDisruptors'],colossus:['ThermalLances','ThermalLancesMU'],high_templar:['HighTemplarWeapon','HighTemplarWeaponDamage'],phoenix:['IonCannons','IonCannonsU'],void_ray:['VoidRaySwarm','VoidRaySwarmDamage'],carrier:['InterceptorLaunch',null]};
const train={marine:['BarracksTrain','Train1'],marauder:['BarracksTrain','Train4'],reaper:['BarracksTrain','Train2'],hellion:['FactoryTrain','Train6'],tank:['FactoryTrain','Train2'],thor:['FactoryTrain','Train5'],viking:['StarportTrain','Train5'],banshee:['StarportTrain','Train2'],medivac:['StarportTrain','Train1'],zergling:['LarvaTrain','Train2'],roach:['LarvaTrain','Train10'],hydralisk:['LarvaTrain','Train4'],queen:['TrainQueen','Train1'],mutalisk:['LarvaTrain','Train5'],corruptor:['LarvaTrain','Train12'],ultralisk:['LarvaTrain','Train7'],zealot:['GatewayTrain','Train1'],adept:['GatewayTrain','Train7'],stalker:['GatewayTrain','Train2'],sentry:['GatewayTrain','Train6'],immortal:['RoboticsFacilityTrain','Train4'],colossus:['RoboticsFacilityTrain','Train3'],high_templar:['GatewayTrain','Train4'],phoenix:['StargateTrain','Train1'],void_ray:['StargateTrain','Train5'],carrier:['StargateTrain','Train3']};
const modes={hellbat:['HellionTank','HellionTank','HellionTankDamage'],viking_assault:['VikingAssault','TwinGatlingCannon','TwinGatlingCannons'],lurker_burrowed:['LurkerMPBurrowed','LurkerMP','LurkerMPDamage'],thor_high_impact:['ThorAP','LanceMissileLaunchers','LanceMissileLaunchersDamage']};
function weapon(weaponId,effectId) {
 const w=c.resolve('weapon',weaponId), e=effectId?c.resolve('effect',effectId):null;
 if(!w||(effectId&&!e))throw Error(`Missing weapon/effect ${weaponId}/${effectId}`);
 const filters=value(w,'TargetFilters').split(';')[0];
 const targetType=filters.includes('Ground')?'ground':filters.includes('Air')?'air':'both';
 const damage=e?number(e,'Amount'):0;if(damage===null)throw Error(`Missing damage ${effectId}`);
 return {weaponId,effectId,attackDamage:damage,attacks:damage?number(w,'DisplayAttackCount','0',1):0,attackPeriod:number(w,'Period')/FASTER,attackRange:number(w,'Range'),minimumRange:number(w,'MinimumRange','0',0),targetType,damagePoint:number(w,'DamagePoint')/FASTER,bonusDamage:Object.entries(indexed(e,'AttributeBonus')).filter(([,v])=>Number(v)!==0).map(([attribute,v])=>({attribute,amount:Number(v)})),shieldBonus:number(e,'ShieldBonus','0',0),splash:(e?.children??[]).filter(n=>n.tag==='AreaArray').map(n=>({radius:Number(n.attributes.Radius??0),fraction:Number(n.attributes.Fraction??1),arc:Number(n.attributes.Arc??360)}))};
}
function recipe(id) {
 if(id==='science_vessel')return null;
 let baseTime=0,morphTime=0,baseFamily=null,abilityId,entryId;
 if(['baneling','ravager','lurker'].includes(id)) {
  baseFamily={baneling:'zergling',ravager:'roach',lurker:'hydralisk'}[id];
  baseTime=recipe(baseFamily).productionTime;
  abilityId={baneling:'MorphToBaneling',ravager:'MorphToRavager',lurker:'MorphToLurker'}[id];
  entryId='1';
  const entry=child(c.resolve('abil',abilityId),'InfoArray',entryId);
  morphTime=number(child(entry,'SectionArray','Stats'),'DurationArray','Delay')/FASTER;
 } else {
  [abilityId,entryId]=train[id];
  baseTime=Number(child(c.resolve('abil',abilityId),'InfoArray',entryId).attributes.Time)/FASTER;
 }
 const u=units[id];
 return {abilityId,entryId,baseFamily,mineralCost:Number(u.cost.Minerals??0),gasCost:Number(u.cost.Vespene??0),productionTime:baseTime+morphTime,baseSeconds:baseTime,morphSeconds:morphTime,batchBodyCount:id==='zergling'?2:1};
}
const recipes=Object.fromEntries(Object.keys(UNIT_XML_IDS).map(id=>[id,recipe(id)]));
const verified={};
for(const [id,[name,zh]] of Object.entries(labels)) {
 const u=units[id], p=primary[id]?weapon(...primary[id]):null;
 verified[id]={name,zh,maxHp:u.hp,armor:u.armor,movementSpeed:u.speed*FASTER,attackDamage:p?.attackDamage??0,attacks:p?.attacks??0,attackPeriod:p?.attackPeriod??1,attackRange:p?.attackRange??0,targetType:p?.targetType??'none',splash:(p?.splash??[]).map(({radius,fraction})=>({radius,fraction})),bonusDamage:p?.bonusDamage??[],attributes:Object.entries(u.attributes).filter(([,v])=>v==='1').map(([k])=>k),productionTime:recipes[id].productionTime,mineralCost:recipes[id].mineralCost,gasCost:recipes[id].gasCost,unitRadius:u.radius,flying:u.mover==='Fly',damagePoint:p?.damagePoint??0,maxShields:u.shields,shieldArmor:u.shieldArmor,shieldRegenPerSecond:u.shieldRegen*FASTER,shieldRegenDelay:u.shieldDelay/FASTER,hpRegenPerSecond:u.lifeRegen*FASTER,hpRegenDelay:u.lifeDelay/FASTER,maxEnergy:u.energy,startEnergy:u.energyStart,energyRegenPerSecond:u.energyRegen*FASTER,creepSpeedMultiplier:u.creep,targetPlanes:Object.entries(u.planes).filter(([,v])=>v==='1').map(([k])=>k.toLowerCase()),movementClass:u.mover==='CliffJumper'?'cliff-jumper':u.mover==='Colossus'?'colossus':u.mover==='Fly'?'flying':'ground',sourceUnitId:u.xmlId,primaryWeapon:p};
}
const weapons={};for(const p of Object.values(primary))if(p)weapons[p[0]]=weapon(...p);
for(const pair of [['JavelinMissileLaunchers','JavelinMissileLaunchersDamage'],['AcidSpines','AcidSpines'],['Talons','Talons'],['InterceptorBeam','InterceptorBeamDamage'],...Object.values(modes).map(m=>m.slice(1))]) weapons[pair[0]]=weapon(...pair);
const modeData=Object.fromEntries(Object.entries(modes).map(([id,[unitId,weaponId]])=>{const u=c.resolve('unit',unitId);return [id,{sourceUnitId:unitId,maxHp:number(u,'LifeMax'),armor:number(u,'LifeArmor','0',0),movementSpeed:number(u,'Speed','0',0)*FASTER,unitRadius:number(u,'Radius'),flying:value(u,'Mover')==='Fly',attributes:Object.entries(indexed(u,'Attributes')).filter(([,v])=>v==='1').map(([k])=>k),weapon:weapons[weaponId]}];}));
const cost = id=>child(c.resolve('abil',id),'Cost');
const cooldown = id=>Number(child(cost(id),'Cooldown').attributes.TimeUse)/FASTER;
const energy = id=>number(cost(id),'Vital','Energy',0);
const modeTime = id=>{const a=c.resolve('abil',id),entry=child(a,'InfoArray'),actor=child(entry,'SectionArray','Actor');return {seconds:(number(actor,'DurationArray','Delay',0)+number(actor,'DurationArray','Duration',0))/FASTER,randomDelayMax:Number(entry.attributes.RandomDelayMax??0)/FASTER};};
const sourceAbilities={
 bansheeCloak:{sourceIds:['BansheeCloak'],startEnergy:energy('BansheeCloak'),energyDrainPerSecond:-number(child(c.resolve('behavior','BansheeCloak'),'Modification'),'VitalRegenArray','Energy')*FASTER,normalRegenPerSecond:units.banshee.energyRegen*FASTER},
 transfusion:{sourceIds:['Transfusion','TransfusionHealTick'],energy:energy('Transfusion'),range:number(c.resolve('abil','Transfusion'),'Range'),cooldown:cooldown('Transfusion'),instantHealing:number(child(c.resolve('effect','Transfusion'),'VitalArray','Life'),'Change'),tickHealing:number(child(c.resolve('effect','TransfusionHealTick'),'VitalArray','Life'),'Change'),tickPeriod:number(c.resolve('behavior','Transfusion'),'Period')/FASTER,duration:number(c.resolve('behavior','Transfusion'),'Duration')/FASTER},
 guardianShield:{sourceIds:['GuardianShield','GuardianShieldPersistent','GuardianShieldSearch'],energy:energy('GuardianShield'),cooldown:cooldown('GuardianShield'),radius:Number(child(c.resolve('effect','GuardianShieldSearch'),'AreaArray').attributes.Radius),duration:number(c.resolve('effect','GuardianShieldPersistent'),'PeriodCount')*number(c.resolve('effect','GuardianShieldPersistent'),'PeriodicPeriodArray')/FASTER,rangedDamageReduction:-number(child(c.resolve('behavior','GuardianShield'),'DamageResponse'),'ModifyAmount')},
 psiStorm:{sourceIds:['PsiStorm','PsiStormPersistent','PsiStormDamage'],energy:energy('PsiStorm'),cooldown:cooldown('PsiStorm'),range:number(c.resolve('abil','PsiStorm'),'Range'),radius:Number(child(c.resolve('effect','PsiStormSearch'),'AreaArray').attributes.Radius),searchPeriods:number(c.resolve('effect','PsiStormPersistent'),'PeriodCount'),searchPeriod:number(c.resolve('effect','PsiStormPersistent'),'PeriodicPeriodArray')/FASTER,damagePerTick:number(c.resolve('effect','PsiStormDamage'),'Amount'),damagePeriod:number(c.resolve('behavior','PsiStorm'),'Period')/FASTER,targetBehaviorDuration:number(c.resolve('behavior','PsiStorm'),'Duration')/FASTER},
 blink:{sourceIds:['Blink'],range:number(c.resolve('effect','Blink'),'Range'),cooldown:cooldown('Blink')},
 charge:{sourceIds:['Charge','Charging','ChargeMinTriggerDistance','ChargeMaxDistance'],minTriggerDistance:number(c.resolve('validator','ChargeMinTriggerDistance'),'Value'),maxTriggerDistance:number(c.resolve('validator','ChargeMaxDistance'),'Range'),duration:number(c.resolve('behavior','Charging'),'Duration')/FASTER,speedMultiplier:Number(child(c.resolve('behavior','Charging'),'Modification').attributes.MoveSpeedMultiplier),cooldown:cooldown('Charge')},
 immortalBarrier:{sourceIds:['ImmortalOverload','BarrierDamageResponse'],absorption:number(child(c.resolve('behavior','ImmortalOverload'),'DamageResponse'),'ModifyLimit'),duration:number(c.resolve('behavior','ImmortalOverload'),'Duration'),cooldown:Number(child(child(child(c.resolve('behavior','BarrierDamageResponse'),'DamageResponse'),'Cost'),'Cooldown').attributes.TimeUse)/FASTER},
 carrierHangar:{sourceIds:['CarrierHangar','Interceptor'],initialCount:Number(child(c.resolve('abil','CarrierHangar'),'InfoArray','Ammo1').attributes.CountStart),maxCount:number(c.resolve('abil','CarrierHangar'),'MaxCount'),replacementSeconds:Number(child(c.resolve('abil','CarrierHangar'),'InfoArray','Ammo1').attributes.Time)/FASTER,mineralCost:number(c.resolve('unit','Interceptor'),'CostResource','Minerals'),maxHp:number(c.resolve('unit','Interceptor'),'LifeMax'),maxShields:number(c.resolve('unit','Interceptor'),'ShieldsMax')},
 transformations:{hellbat:modeTime('MorphToHellionTank'),hellion:modeTime('MorphToHellion'),vikingAssault:modeTime('AssaultMode'),vikingFighter:modeTime('FighterMode'),thorHighImpact:modeTime('ThorAPMode'),thorExplosive:modeTime('ThorNormalMode'),lurkerBurrow:modeTime('BurrowLurkerMPDown'),lurkerUnburrow:modeTime('BurrowLurkerMPUp')},
};
const interceptor=c.resolve('unit','Interceptor');
const sourceInterceptor={sourceUnitId:'Interceptor',maxHp:number(interceptor,'LifeMax'),maxShields:number(interceptor,'ShieldsMax'),armor:number(interceptor,'LifeArmor','0',0),shieldArmor:number(interceptor,'ShieldArmor','0',0),shieldRegenPerSecond:number(interceptor,'ShieldRegenRate','0',0)*FASTER,shieldRegenDelay:number(interceptor,'ShieldRegenDelay','0',0)/FASTER,movementSpeed:number(interceptor,'Speed')*FASTER,unitRadius:number(interceptor,'Radius'),attributes:Object.entries(indexed(interceptor,'Attributes')).filter(([,v])=>v==='1').map(([k])=>k),flying:true,targetPlanes:['air'],weapon:weapons.InterceptorBeam};
const sourceMovement=Object.fromEntries(['CliffJumper','Colossus'].map(id=>{const m=c.resolve('mover',id);return [id,{sourceMoverId:id,pathMode:value(m,'PathMode'),heightMap:value(m,'HeightMap'),restoreSeconds:number(m,'RestoreHeightDuration')/FASTER}]}));
const effectOffsets=id=>c.resolve('effect',id).children.filter(n=>n.tag==='PeriodicOffsetArray').slice(0,number(c.resolve('effect',id),'PeriodCount')).map(n=>n.attributes.value.split(',').map(Number));
const sourceWeaponPatterns={
 baneling:{sourceIds:['VolatileBurstU','VolatileBurstU2'],structureEffectId:'VolatileBurstU2',structureDamage:number(c.resolve('effect','VolatileBurstU2'),'Amount'),structureArmorReduction:number(c.resolve('effect','VolatileBurstU2'),'ArmorReduction')},
 hellbat:{sourceIds:['HellionTank','HellionTankSearch','HellionTankDamage'],radius:Number(child(c.resolve('effect','HellionTankSearch'),'AreaArray').attributes.Radius),arcDegrees:Number(child(c.resolve('effect','HellionTankSearch'),'AreaArray').attributes.Arc),impactLocation:child(c.resolve('effect','HellionTankSearch'),'ImpactLocation').attributes.Value,extendByUnitRadius:number(c.resolve('effect','HellionTankSearch'),'SearchFlags','ExtendByUnitRadius')===1,offsetByUnitRadius:number(c.resolve('effect','HellionTankSearch'),'SearchFlags','OffsetByUnitRadius')===1,excludePrimary:true},
 thorExplosive:{sourceIds:['JavelinMissileLaunchersPersistent','JavelinMissileLaunchersDamage'],shots:number(c.resolve('effect','JavelinMissileLaunchersPersistent'),'PeriodCount'),periodSeconds:c.resolve('effect','JavelinMissileLaunchersPersistent').children.filter(n=>n.tag==='PeriodicPeriodArray').map(n=>Number(n.attributes.value)/FASTER),bands:weapons.JavelinMissileLaunchers.splash,targetPlanes:['air'],impactLocation:child(c.resolve('effect','JavelinMissileLaunchersDamage'),'ImpactLocation').attributes.Value,excludePrimary:true},
 ultralisk:{sourceIds:['KaiserBlades','KaiserBladesDamage'],bands:weapons.KaiserBlades.splash,targetPlanes:['ground'],impactLocation:child(c.resolve('effect','KaiserBladesDamage'),'ImpactLocation').attributes.Value,offsetByUnitRadius:number(c.resolve('effect','KaiserBladesDamage'),'SearchFlags','OffsetByUnitRadius')===1,excludePrimary:true},
 mutalisk:{sourceIds:['GlaiveWurmU1','GlaiveWurmU2','GlaiveWurmU3','GlaiveWurmE1','GlaiveWurmE2'],damage:['GlaiveWurmU1','GlaiveWurmU2','GlaiveWurmU3'].map(id=>number(c.resolve('effect',id),'Amount')),bounceRadius:Number(child(c.resolve('effect','GlaiveWurmE1'),'AreaArray').attributes.Radius),maxTargets:3,repeatTarget:false},
 lurker:{sourceIds:['LurkerMP','LurkerMPSearch','LurkerMPDamage'],offsets:effectOffsets('LurkerMP'),searchRadius:Number(child(c.resolve('effect','LurkerMPSearch'),'AreaArray').attributes.Radius),periodSeconds:c.resolve('effect','LurkerMP').children.filter(n=>n.tag==='PeriodicPeriodArray').slice(0,number(c.resolve('effect','LurkerMP'),'PeriodCount')).map(n=>Number(n.attributes.value)/FASTER),weaponRange:weapons.LurkerMP.attackRange,damagePerHit:weapons.LurkerMP.attackDamage,bonusDamage:weapons.LurkerMP.bonusDamage},
 colossus:{sourceIds:['ThermalLancesForward','ThermalLancesReverse','ThermalLancesE','ThermalLancesMU'],forwardOffsets:effectOffsets('ThermalLancesForward'),reverseOffsets:effectOffsets('ThermalLancesReverse'),searchRadius:Number(child(c.resolve('effect','ThermalLancesE'),'AreaArray').attributes.Radius),stepSeconds:number(c.resolve('effect','ThermalLancesForward'),'PeriodicPeriodArray')/FASTER,damagePerBeam:weapons.ThermalLances.attackDamage,bonusDamagePerBeam:weapons.ThermalLances.bonusDamage,uniqueTargetPerBeam:true},
 voidRay:{sourceIds:['VoidRaySwarm','VoidRaySwarmDamage','VoidRayWeaponABTarget'],baseDamage:number(c.resolve('effect','VoidRaySwarmDamage'),'Amount'),armoredBonus:number(c.resolve('effect','VoidRaySwarmDamage'),'AttributeBonus','Armored'),beamSearchSeconds:number(c.resolve('effect','VoidRaySwarm'),'PeriodicPeriodArray')/FASTER,damageCooldownSeconds:number(c.resolve('effect','VoidRayWeaponABTarget'),'Duration')/FASTER,hasAutomaticDamageRamp:false,manualAlignment:{sourceIds:['VoidRaySwarmDamageBoost'],armoredDamageAdd:number(child(c.resolve('behavior','VoidRaySwarmDamageBoost'),'Modification'),'DamageDealtAttributeScaled','Armored'),duration:number(c.resolve('behavior','VoidRaySwarmDamageBoost'),'Duration')/FASTER,movementMultiplier:Number(child(c.resolve('behavior','VoidRaySwarmDamageBoost'),'Modification').attributes.MoveSpeedMultiplier),cooldown:cooldown('VoidRaySwarmDamageBoost')}}
};
const header=`/** Generated from the pinned 5.0.15 XML by tools/build-expansion-unit-data.mjs.
 * Do not replace absent sources with another unit's stats. Runtime adaptations
 * belong outside this source table. All times/rates use Faster (1.4).
 */
import type {UnitData} from './sc2-units';
export const EXPANSION_SOURCE={revision:'fbbd6429b1eb6978c78a092dc68ba09029d03171',layers:${JSON.stringify(LOCKED_LAYERS)},clock:'Faster: durations / 1.4, rates * 1.4'} as const;
export const EXPANSION_FAMILIES=${JSON.stringify(Object.keys(UNIT_XML_IDS))} as const;
export type ExpansionFamilyId=typeof EXPANSION_FAMILIES[number];
export const ADDED_UNIT_IDS=${JSON.stringify([...Object.keys(labels).slice(0,4),'science_vessel',...Object.keys(labels).slice(4)])} as const;
export type AddedUnitType=typeof ADDED_UNIT_IDS[number];
export type VerifiedAddedUnitType=Exclude<AddedUnitType,'science_vessel'>;
export interface SourceWeapon {weaponId:string;effectId:string|null;attackDamage:number;attacks:number;attackPeriod:number;attackRange:number;minimumRange:number;targetType:UnitData['targetType'];damagePoint:number;bonusDamage:UnitData['bonusDamage'];shieldBonus:number;splash:{radius:number;fraction:number;arc:number}[];}
export interface ExpansionUnitData extends UnitData {maxShields:number;shieldArmor:number;shieldRegenPerSecond:number;shieldRegenDelay:number;hpRegenPerSecond:number;hpRegenDelay:number;maxEnergy:number;startEnergy:number;energyRegenPerSecond:number;creepSpeedMultiplier:number;targetPlanes:('ground'|'air')[];movementClass:'ground'|'flying'|'cliff-jumper'|'colossus';sourceUnitId:string;primaryWeapon:SourceWeapon|null;}
export interface SourceProductionRecipe {abilityId:string;entryId:string;baseFamily:ExpansionFamilyId|null;mineralCost:number;gasCost:number;productionTime:number;baseSeconds:number;morphSeconds:number;batchBodyCount:number;}
`;
let output=header;
output+='export const VERIFIED_EXPANSION_UNITS:Record<VerifiedAddedUnitType,ExpansionUnitData>='+JSON.stringify(verified,null,2)+';\n';
output+='export const EXPANSION_UNITS:Record<AddedUnitType,ExpansionUnitData|null>={...VERIFIED_EXPANSION_UNITS,science_vessel:null};\n';
output+='export const SOURCE_PRODUCTION_RECIPES:Record<ExpansionFamilyId,SourceProductionRecipe|null>='+JSON.stringify(recipes,null,2)+';\n';
output+='export const SOURCE_WEAPONS:Record<string,SourceWeapon>='+JSON.stringify(weapons,null,2)+';\n';
output+='export const SOURCE_UNIT_WEAPON_IDS='+JSON.stringify(Object.fromEntries(Object.keys(labels).map(id=>[id,[...new Set(units[id].weapons.filter(w=>weapons[w]))]])),null,2)+' as const;\n';
output+=`/** Weapons retain their own range and target filters; a dual-plane victim is eligible for either weapon. */
const sourceWeaponLists=new Map<string,readonly SourceWeapon[]>();
export function sourceWeaponsForUnit(family:VerifiedAddedUnitType,mode?:keyof typeof SOURCE_UNIT_MODES):readonly SourceWeapon[]{
 const selected=mode&&mode in SOURCE_UNIT_MODES?mode:undefined,key=family+'/'+(selected??''),cached=sourceWeaponLists.get(key);if(cached)return cached;
 let result:readonly SourceWeapon[];if(selected){const raw=SOURCE_UNIT_MODES[selected].weapon,weapon:SourceWeapon={...raw,bonusDamage:[...raw.bonusDamage],splash:[...raw.splash]};result=selected==='thor_high_impact'?[SOURCE_WEAPONS.ThorsHammer,weapon]:[weapon];}
 else result=SOURCE_UNIT_WEAPON_IDS[family].map(id=>SOURCE_WEAPONS[id]);sourceWeaponLists.set(key,result);return result;
}
`;
output+='export const SOURCE_MOVEMENT='+JSON.stringify(sourceMovement,null,2)+' as const;\n';
output+='export const SOURCE_WEAPON_PATTERNS='+JSON.stringify(sourceWeaponPatterns,null,2)+' as const;\n';
output+='export const SOURCE_INTERCEPTOR='+JSON.stringify(sourceInterceptor,null,2)+' as const;\n';
output+='export const SOURCE_ABILITIES='+JSON.stringify(sourceAbilities,null,2)+' as const;\n';
output+='export const SOURCE_UNIT_MODES='+JSON.stringify(modeData,null,2)+' as const;\n';
output+='export const SOURCE_UNIT_DETAILS='+JSON.stringify(units,null,2)+' as const;\n';
output+='export const EXPANSION_DATA_BLOCKERS={science_vessel:"No ScienceVessel combat CUnit/production/heal ability in the pinned multiplayer cache; a gluescreen dummy is not a valid substitute."} as const;\n';
const destination=path.join(root,'src','data','expansion-units.ts');
if(process.argv.includes('--check')) {if(fs.readFileSync(destination,'utf8')!==output)throw Error('Expansion unit data differs from pinned XML');console.log('Expansion unit data matches pinned XML');}
else {fs.writeFileSync(destination,output);console.log('Wrote 19 verified added units, 30 family recipes with Science Vessel explicitly blocked');}
