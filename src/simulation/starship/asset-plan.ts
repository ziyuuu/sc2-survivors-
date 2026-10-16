import {World} from '../world';
import {PermanentProfile} from '../progression/permanent-profile';
import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES} from '../../data/elites';
import type {Race} from '../../data/races';
import type {Entity} from '../types';
import {selectEquipmentEffects} from './selection';
import {equippedItems} from './inventory';

/** Run only the shared opening constructor on isolated copies. No combat ticks, live RNG or profile writes. */
export function equipmentOpeningModels(world:World,race:Race,hero:HeroId|null){if(!world.starship.enabled)return [];
 const profile=new PermanentProfile();if(!profile.importJSON(world.permanentProfile.exportJSON()))throw Error('舰装资源准备无法复制当前档案');
 const account=structuredClone(world.starship.account);account.run=null;
 const preview=new World({race,seed:world.campaignRecipe?.seed??529,terrain:false,obstacles:[],waves:false,sandbox:true,permanentProfile:profile,equipmentAccount:account});if(!preview.start(hero??undefined))throw Error('舰装新局配置尚未就绪');
 const models:{key:string;type:Entity['unitType']}[]=[...preview.entities.values()].filter(u=>u.hp>0).map(u=>({key:u.modelKey??u.unitType,type:u.unitType}));
 for(const e of selectEquipmentEffects(equippedItems(account,race))){
  if(e.key==='swarm')models.push({key:'zergling',type:'zergling'},{key:'mutalisk',type:'mutalisk'});
  if(e.key==='plague')models.push({key:'ultralisk',type:'ultralisk'},{key:HEROES.hots_leviathan.model,type:'hots_leviathan'});
  if(e.key==='behemoth'){models.push({key:HEROES.hots_leviathan.model,type:'hots_leviathan'});for(const elite of Object.values(ELITES).filter(e=>e.family==='ultralisk'))models.push({key:elite.model,type:elite.family});}
  if(e.key==='yamato_support')models.push({key:HEROES.yamato_battlecruiser.model,type:'yamato_battlecruiser'});
 }
 return [...new Map(models.map(m=>[m.key,m])).values()];
}
