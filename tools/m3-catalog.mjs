// Names resolved from the fixed SC2 ModelData/ActorData profile; no community skins.
export const M3_TOOL_REVISION='ee0eff037e2e40d2aad72f4f856af0710b8a44e5';
export const M3_MODELS=[
 ['model.marine','marine'],['model.hellion','hellionex1'],['model.tank','tankex1'],
 ['model.medivac','medivacex1'],['model.zergling','zergling'],['model.roach','roach'],
 ['model.baneling','banelingex1'],['model.ravager','ravager'],
 ['model.tank.siege','siegetank'],['model.tank.morph','siegetankmorph'],
 ['model.marine.death','marinedeathex1'],['model.hellion.death','helliondeath'],
 ['model.tank.death','siegetankdeathex1'],['model.medivac.death','medivacdeath_00'],
 ['model.zergling.death','zerglingdeathex1'],['model.roach.death','roachdeathex1'],
 ['model.baneling.death','banelingex1deathrupture'],['model.ravager.death','ravager_death_00'],
 ['model.droppod','droppodfalling'],
 ['model.scv','scv'],['model.drone','drone'],['model.egg','banelingegg'],
 ['model.terrain.rock','chardunerock_00'],['model.terrain.wreck','barrackswrecked_00'],
];
// Original particle textures. The web renderer implements a documented subset of
// the M3 particle system, not SC2's full material/physics/Actor renderer.
export const M3_EFFECTS=[
 ['fx.muzzle','marineweaponlaunch'],['fx.impact','marineweaponimpact'],
 ['fx.blood','bloodtargetimpact'],['fx.blast','siegetankweaponimpact'],
 ['fx.acid','roachmissileimpactex1'],['fx.bile','ravager_artillery_missile_impact'],
 ['fx.baneling','banelingdeath_low'],['fx.pod','jumplanddust'],
];
