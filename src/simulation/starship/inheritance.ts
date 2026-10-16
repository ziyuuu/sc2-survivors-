import type {EquipmentTemplate,EquipmentEffect} from './catalog';
import type {ModuleSlot} from './types';
import {BLUE_MODULES} from './catalog-modules';
export interface InheritedEffect {id:string;slot:ModuleSlot;origin:string;effects:EquipmentEffect[]}
const e=(key:string,...values:number[]):EquipmentEffect=>({key,values});
const part=(id:string,origin:string,...indices:number[]):InheritedEffect=>({id,origin,slot:BLUE_MODULES[origin][0],effects:indices.map(i=>BLUE_MODULES[origin][2][i])});
export const PURPLE_INHERITANCE:InheritedEffect[]=[
 part('C01','workers',0),part('C02','workers',1),part('C03','workers',2),part('C04','pickup',0),part('C05','pickup',1),part('C06','pickup',2),part('C07','rescue',0),part('C08','rescue',1),part('C09','double_pickup',0),{id:'C10',origin:'double_pickup',slot:'gathering',effects:[e('boss_quality',.1)]},part('C11','loan',0),
 part('E01','supply',0),part('E02','supply',1),part('E03','supply',2),part('E04','shop',0),part('E05','shop',1),part('E06','shop',2),part('E07','purchase',0,1),part('E08','refresh',0),part('E09','refresh',1),part('E10','unreasonable',0,1),part('E11','contract',0),part('E12','contract',1),part('E13','academy',0),
 part('M01','formation',0),part('M02','formation',1),{id:'M03',origin:'moving_fire',slot:'control',effects:[e('turn_factor',2.5)]},{id:'M04',origin:'moving_fire',slot:'control',effects:[e('moving_chance',1)]},part('M05','split',0),part('M06','split',1),part('M07','blade',0),part('M08','blade',1),part('M09','telescope',0),part('M10','telescope',1),part('M11','adrenaline',0),part('M12','rapid',0),
 part('S01','suppression',0),part('S02','reinforcement',0),part('S03','egg',0),part('S04','incendiary',0),part('S05','elephant',0),part('S06','drop_pod',0),part('S07','reactor',0)
];
export const ORANGE_INHERITANCE:InheritedEffect[]=[
 {id:'C-B1',origin:'pickup',slot:'gathering',effects:[e('pickup_yield',.2)]},{id:'C-B2',origin:'double_pickup',slot:'gathering',effects:[e('boss_quality',.1)]},{id:'C-P1',origin:'pickup',slot:'gathering',effects:[e('card_copy',3)]},{id:'C-P2',origin:'double_pickup',slot:'gathering',effects:[e('pickup_double',.35),e('harvest',5)]},
 {id:'E-B1',origin:'shop',slot:'logistics',effects:[e('shop_refresh',1)]},{id:'E-B2',origin:'purchase',slot:'logistics',effects:BLUE_MODULES.purchase[2]},{id:'E-P1',origin:'refresh',slot:'logistics',effects:[e('refresh_credit',1)]},{id:'E-P2',origin:'shop',slot:'logistics',effects:[e('purchase_copy',1)]},
 {id:'M-B1',origin:'telescope',slot:'control',effects:[e('weapon_range',.1)]},{id:'M-B2',origin:'rapid',slot:'control',effects:[e('prepare_reduction',.66)]},{id:'M-P1',origin:'formation',slot:'control',effects:[e('manual_reset',20)]},{id:'M-P2',origin:'blade',slot:'control',effects:[e('cleave',.2,1,360)]},
 {id:'S-B1',origin:'reinforcement',slot:'support',effects:BLUE_MODULES.reinforcement[2]},{id:'S-B2',origin:'reactor',slot:'support',effects:[e('reactor',360,2)]},{id:'S-P1',origin:'reactor',slot:'support',effects:[e('reactor',270,3)]},{id:'S-P2',origin:'joint',slot:'support',effects:[e('joint_support',35,8,3)]}
];
export const inheritedEffect=(id:string)=>[...PURPLE_INHERITANCE,...ORANGE_INHERITANCE].find(e=>e.id===id);
export function inheritancePool(host:EquipmentTemplate,polluted:boolean){
 if(host.kind!=='module')return [];
 const pool=host.quality===5&&host.pollution!=='required'?ORANGE_INHERITANCE:host.quality===4&&polluted?PURPLE_INHERITANCE:[];
 return pool.filter(row=>row.slot===host.slots[0]&&row.origin!==host.id.split('.')[1]&&!row.effects.every(effect=>host.effects.some(own=>own.key===effect.key&&own.values.length===effect.values.length&&own.values.every((v,i)=>v===effect.values[i])))&&!(host.effects.some(e=>e.key==='first_purchase_free')&&row.effects.some(e=>e.key==='free_product')));
}
export function rollInheritance(host:EquipmentTemplate,polluted:boolean,random:()=>number){const pool=inheritancePool(host,polluted);if(!pool.length)return [];
 if(host.quality===5){const quality=random()<.5?'B':'P',available=pool.filter(e=>e.id.includes('-'+quality));return [(available.length?available:pool)[Math.floor(random()*(available.length||pool.length))].id];}
 const origins=[...new Set(pool.map(e=>e.origin))],origin=origins[Math.floor(random()*origins.length)],available=pool.filter(e=>e.origin===origin);return [available[Math.floor(random()*available.length)].id];
}
export function validInheritance(host:EquipmentTemplate,polluted:boolean,ids:readonly string[]){const pool=inheritancePool(host,polluted);return ids.length===(pool.length?1:0)&&ids.every(id=>pool.some(row=>row.id===id));}
