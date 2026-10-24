import type {SourceEffectDefinition} from './types';

/** Explicit secondary emitters. Projectile bodies, beam ribbons, ground
 * projections, flashes and status/identity layers are never selected by a
 * broad name pattern. Copies inherit their source emitter's classification. */
export const MEDIUM_DECORATIVE_EMITTERS:Readonly<Record<string,readonly string[]>>={
 MarineAttackImpact:['Star2Part03smoke'],
 MarauderAttackLaunch:['Star2Part09sparks'],
 PunisherGrenadesLMWeapon:['Star2Part03smoke'],
 MarauderBaseAttackImpact:['Star2Part01sparks'],
 ReaperAttackLaunch:['Star2Part03smoke'],
 ReaperAttackImpact:['Star2Part03smoke'],
 HellionAttackBeam:['Star2Part08sparks01'],
 HellionAttackDamageReaction:['Object12smoke01'],
 HellionTankAttackFireAddition:['Object12smoke'],
 SiegeTankAttackLaunch:['Star2PartSmoke'],
 SiegeTankAttackImpact:['Star2Part02bounce','Star2Part03tails','Object09smoke','Star2Part01sparks01'],
 SiegeTankSiegedAttackLaunch:['Star2Part01boomsmoke','Star2Part01sparks','Star2Part01fire03sparkfire','Star2Part01smokebarrell01'],
 SiegeTankSiegedAttackImpact:['Star2Part01sparks01','Star2Part01dirtdebris','Star2Part01dirtsplash1','Star2Part01smoke trails','Star2Part01trailparent','Star2Partshockwavesmoke','Star2PartSmokeTendril1','Star2Part01FireTailsNew'],
 ThorHandGunAttackLaunch:['Star2PartSmoke','Star2PartSmokelittle','Star2Part01fire03sparkfire'],
 ThorHandGunAttackImpact:['Star2Part01sparks03'],
 ThorAAAttackLaunch:['Star2Part01boomsmoke'],
 ThorAAAttackImpact:['Object09smoke','Star2Part01sparks'],
 ThorAAAttackLaunchLance:['Star2PartSmoke','Star2PartSmokelittle','Star2Part01fire03sparkfire'],
 ThorAAAttackImpactLance:['Object09smoke','Star2Part01sparks'],
 VikingFighterAttackImpact:['Object09smoke','Star2Part01sparks'],
 VikingAssaultAttackLaunch:['Star2Part03smoke01'],
 BansheeAttackImpact:['Object09smoke','Star2Part01sparks','Star2Part01dirtsplash1'],
 BanelingDeath:['Star2Part_BloodTendril001','Star2Part_MistBlood001'],
 RoachMissileImpact:['Star2PartSplat31mist'],
 RavagerCorrosiveBileImpact:['Star2Part_BloodTendril001','SC2Particles_NewSmokeRing'],
 HydraliskAttackImpact:['Star2Part01cloud'],
 QueenMissileImpact:['Star2Part01cloud'],
 MutaliskAttackSegment1Impact:['Star2Part01cloud'],
 MutaliskAttackSegment2Impact:['Star2Part01cloud'],
 MutaliskAttackSegment3Impact:['Star2Part01cloud'],
 Ultralisk:['Star2Partshockwavesmoke001','Star2PartRocks','Star2Part_SmokeRing','Star2Part_SmokeTendril'],
 AdeptImpact:['Star2Part01smoke','Star2Part01sparks01'],
 StalkerAttackImpact:['Star2Part01smoke','Star2Part10tendril361rays','Star2Part01sparks01'],
 SentryAttackBeam:['Star2PartSparks01','Star2PartSparks02'],
 ImmortalAttackImpact:['Star2Partsmokering01','Star2PartSmokeTendril03','Star2Part01sparks02','Star2Part01FireTailsNew'],
 ColossusAttackBeamImpact:['Star2PartSmoke','Star2PartSparks01x'],
 HighTemplarAttackImpact:['Star2Part01FireTailsNew'],
 HighTemplarPsiStormModel:['Star2Part01clkouds out'],
 PhoenixAirAttackImpact:['Star2PartSmokex','Star2PartSparks'],
 VoidRayAttackBeam:['Star2Part03sparks'],
 ImpactModelFlames:['Object12smoke'],
 AutoTurretAttackImpact:['Star2Part03smoke'],
 PhotonCannonAttackImpact:['Star2PartSmokex','Star2PartSparks'],
 SpineCrawlerAttackImpactReactionFlesh:['Star2Part29mistblood'],
};
const masks=new WeakMap<SourceEffectDefinition,ReadonlySet<number>>();
export function sourceDecorationMask(def:SourceEffectDefinition){
 let mask=masks.get(def);if(!mask){const names=MEDIUM_DECORATIVE_EMITTERS[def.id]??[];mask=new Set(def.particles.flatMap((emitter,index)=>names.includes(def.bones[emitter.bone]?.name)?[index]:[]));masks.set(def,mask);}return mask;
}
