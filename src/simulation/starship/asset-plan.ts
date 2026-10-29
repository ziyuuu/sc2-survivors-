import {World} from '../world';
import {PermanentProfile,type PresetSlot} from '../progression/permanent-profile';
import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES} from '../../data/elites';
import {familyRace,type Race} from '../../data/races';
import type {Entity} from '../types';
import {selectEquipmentEffects} from './selection';
import {equippedItems} from './inventory';
import type {EquipmentAccount} from './types';

/** Run only the shared opening constructor on isolated copies. No combat ticks, live RNG or profile writes. */
export function equipmentOpeningModels(world:World,race:Race,hero:HeroId|null,preset?:PresetSlot){if(!world.starship.enabled)return [];
 const profile=new PermanentProfile();if(!profile.importJSON(world.permanentProfile.exportJSON()))throw Error('舰装资源准备无法复制当前档案');
 if(preset!==undefined&&!profile.activatePreset(race,preset))throw Error('舰装资源准备无法使用选中天赋');
 const account=structuredClone(world.starship.account);account.run=null;
 const preview=new World({race,seed:world.campaignRecipe?.seed??529,terrain:false,obstacles:[],waves:false,sandbox:true,permanentProfile:profile,equipmentAccount:account});if(!preview.start(hero??undefined))throw Error('舰装新局配置尚未就绪');
 const models:{key:string;type:Entity['unitType']}[]=[...preview.entities.values()].filter(u=>u.hp>0).map(u=>({key:u.modelKey??u.unitType,type:u.unitType}));
 models.push(...equipmentRuntimeModels(world,race));return [...new Map(models.map(m=>[m.key,m])).values()];
}
/** Possible later deliveries from the currently equipped effects, without
 * replaying an opening or rolling a second random identity. */
export function equipmentRuntimeModels(world:World,race:Race){if(!world.starship.enabled)return [];
 return equipmentAccountModels(world.starship.account,race);
}
/** A restore prepares the incoming account, which may differ from the title screen. */
export function equipmentAccountModels(account:EquipmentAccount,race:Race){
 const models:{key:string;type:Entity['unitType']}[]=[];
 for(const e of selectEquipmentEffects(equippedItems(account,race))){
  if(e.key==='swarm')models.push({key:'zergling',type:'zergling'},{key:'mutalisk',type:'mutalisk'});
  if(e.key==='plague')models.push({key:'ultralisk',type:'ultralisk'},{key:HEROES.hots_leviathan.model,type:'hots_leviathan'});
  if(e.key==='behemoth'){models.push({key:HEROES.hots_leviathan.model,type:'hots_leviathan'});for(const elite of Object.values(ELITES).filter(e=>e.family==='ultralisk'))models.push({key:elite.model,type:elite.family});}
  if(e.key==='yamato_support'||e.key==='stage_yamato')models.push({key:HEROES.yamato_battlecruiser.model,type:'yamato_battlecruiser'});
  if(e.key==='ark'){if(race==='protoss')models.push({key:'carrier',type:'carrier'},{key:'interceptor',type:'marine'});else {const id=race==='terran'?'yamato_battlecruiser':'hots_leviathan';models.push({key:HEROES[id].model,type:id});}}
  // These effects choose a variant later, after opening RNG has advanced. Load
  // their possible original bodies before combat instead of predicting the roll.
  if(['paid_elite','training_evolution','reinforcement_elite','rescue_elite','drop_elite','bounty','plunder'].includes(e.key))for(const elite of Object.values(ELITES).filter(elite=>familyRace(elite.family)===race))models.push({key:elite.model,type:elite.family});
  if(e.key==='bounty_hero'||e.key==='plunder')for(const hero of Object.values(HEROES).filter(hero=>hero.race===race))models.push({key:hero.model,type:hero.baseFamily});
 }
 return [...new Map(models.map(m=>[m.key,m])).values()];
}
