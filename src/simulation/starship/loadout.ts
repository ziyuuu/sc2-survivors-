import type {Race} from '../../data/races';
import {EQUIPMENT_SLOTS,failure,success,type EquipmentAccount,type EquipmentSlot} from './types';
import {validateItem,itemsAt,WAREHOUSE_CAPACITIES} from './inventory';

export type EquipmentLoadout=Partial<Record<EquipmentSlot,string>>;
/** Validate the complete exchange before moving anything, including when the warehouse is full. */
export function applyEquipmentLoadout(a:EquipmentAccount,race:Race,loadout:EquipmentLoadout,revision=a.revision){
 if(revision!==a.revision)return failure('配装已变化，请重新确认');
 if(a.run&&!a.run.ended)return failure('整套预设只能局外使用');
 if(a.modification)return failure('请先处理洗练结果');
 const ids=Object.values(loadout).filter((id):id is string=>!!id);
 if(new Set(ids).size!==ids.length||Object.keys(loadout).some(s=>!EQUIPMENT_SLOTS.includes(s as EquipmentSlot)))return failure('预设包含重复装备或非法槽位');
 for(const slot of EQUIPMENT_SLOTS){const id=loadout[slot];if(!id)continue;const i=a.items[id],loc=a.locations[id];
  if(!i||!validateItem(i)||i.race!==race||i.slot!==slot||i.pollution==='uncleansed')return failure('预设中有遗失、污染或不匹配的装备');
  if(loc?.kind!=='warehouse'&&!(loc?.kind==='equipped'&&a.equipped[race][slot]===id))return failure('预设装备尚未入仓');
 }
 const current=Object.values(a.equipped[race]).filter((id):id is string=>!!id),old=new Set(current),next=new Set(ids);
 const occupied=itemsAt(a,'warehouse').length+current.filter(id=>!next.has(id)).length-ids.filter(id=>!old.has(id)).length;
 if(occupied>WAREHOUSE_CAPACITIES[a.warehouseLevel])return failure('仓库没有足够空位存放卸下的装备');
 for(const id of current)if(!next.has(id))a.locations[id]={kind:'warehouse'};
 for(const id of ids)a.locations[id]={kind:'equipped'};
 a.equipped[race]={...loadout};a.revision++;return success(undefined);
}
