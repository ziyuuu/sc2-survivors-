import type {World} from '../world';
import {emptyTotals} from './attributes';
import {equipmentTotals} from './runtime';
import {activeEquipmentEffects} from './modules';

/** Source-less cards inherit global attributes only, never an arbitrary hero's identity or bound bonus. */
export function equipmentCardTotals(w:World){
 const t={...(w.starship.enabled?equipmentTotals(w):emptyTotals()),armorPercent:0};
 if(!w.starship.enabled)return t;
 for(const e of activeEquipmentEffects(w)){
  const [scope,key]=e.key.split('.');if(scope==='stat'&&key in t)t[key as keyof typeof t]+=e.values[0];
  if(e.key==='white_dps')t.dps+=equipmentTotals(w).dps*e.values[0];
  if(e.key==='white_hp')t.hp+=equipmentTotals(w).hp*e.values[0];
  if(e.key==='white_armor')t.armor+=equipmentTotals(w).armor*e.values[0];
  if(e.key==='armor_percent')t.armorPercent+=e.values[0];
 }
 const growth=w.starship.numbers.get('devour-growth')??0;t.attack+=growth;t.health+=growth;return t;
}
/** Independent support converts global ordinary white DPS to a capped multiplier;
 * it never consumes a weapon budget or inherits true DPS, attack speed or identity. */
export function equipmentCardDamage(w:World,amount:number){const t=equipmentCardTotals(w);return amount*(1+t.attack)*(1+Math.min(3,Math.max(0,t.dps)/100));}
