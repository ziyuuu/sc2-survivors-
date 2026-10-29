import type {EquipmentAccount,EquipmentItem} from '../../simulation/starship/types';
import type {Race} from '../../data/races';
import type {EquipmentPhase} from '../../simulation/starship/phase';
import {canEquip} from '../../simulation/starship/inventory';

export function equipmentAvailability(a:EquipmentAccount,race:Race,phase:EquipmentPhase,item:EquipmentItem){
 if(a.locations[item.id]?.kind==='equipped')return {ok:false,label:'已装备',reason:''};
 const check=canEquip(a,race,item.id,item.slot);
 if(!check.ok){const reason=check.error;return {ok:false,reason,label:reason.includes('清洗')?'需清洗':reason.includes('局外')?'局外更换':reason.includes('种族')?'种族不符':reason.includes('奖励')?'来源锁定':'不可装备'};}
 if(phase==='battle')return {ok:false,label:'关间更换',reason:'战斗中不可换装，关间可更换'};
 return {ok:true,label:'可装备',reason:''};
}
