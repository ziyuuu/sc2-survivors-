import type {Race} from '../../data/races';
import {EQUIPMENT_SLOTS,failure,success,type EquipmentAccount,type EquipmentItem} from './types';
import {equipmentTemplate} from './catalog';
import {canEquip,itemsAt} from './inventory';

/** Quality alone decides; existing equal-quality gear and all non-ordinary pieces stay. */
export function quickEquipPlan(a:EquipmentAccount,race:Race,protectedIds:ReadonlySet<string>=new Set()){
 const run=a.run&&!a.run.ended?a.run:null;if(run&&run.race!==race||a.modification)return [];
 const safe=(i:EquipmentItem)=>equipmentTemplate(i.template)?.kind==='attribute'&&!protectedIds.has(i.id)&&!run?.locked.has(i.id);
 const candidates=itemsAt(a,run?'backpack':'warehouse').filter(i=>safe(i)&&canEquip(a,race,i.id,i.slot).ok),plan:EquipmentItem[]=[];
 for(const slot of EQUIPMENT_SLOTS){
  const oldId=a.equipped[race][slot],old=oldId?a.items[oldId]:undefined;
  if(old&&!safe(old))continue;
  let best=old;
  for(const i of candidates)if(i.slot===slot&&(!best||i.quality>best.quality))best=i;
  if(best&&best!==old)plan.push(best);
 }
 return plan;
}

/** One account revision and no intermediate ownership state or RNG use. */
export function quickEquip(a:EquipmentAccount,race:Race,protectedIds:ReadonlySet<string>,revision=a.revision){
 if(revision!==a.revision)return failure('装备状态已变化');
 const plan=quickEquipPlan(a,race,protectedIds);if(!plan.length)return failure('没有更高品质的可用散件');
 for(const item of plan){const old=a.equipped[race][item.slot];if(old)a.locations[old]={...a.locations[item.id]};a.locations[item.id]={kind:'equipped'};a.equipped[race][item.slot]=item.id;}
 a.revision++;return success(plan.map(i=>i.id));
}
