import type {Race,FamilyId} from '../../data/races';
import type {HeroId} from '../../data/heroes';
import type {EliteId} from '../../data/elites';
import type {ProductionLineId} from '../../data/expedition-buildings';

export const MODULE_SLOTS=['gathering','logistics','control','support'] as const;
export const ATTRIBUTE_SLOTS=['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'] as const;
export const EQUIPMENT_SLOTS=[...MODULE_SLOTS,...ATTRIBUTE_SLOTS] as const;
export type ModuleSlot=typeof MODULE_SLOTS[number];
export type AttributeSlot=typeof ATTRIBUTE_SLOTS[number];
export type EquipmentSlot=typeof EQUIPMENT_SLOTS[number];
export type Quality=1|2|3|4|5;
export type WhiteAllocation=0|1|2|3|4;
export const OFFENSIVE_AFFIXES=['attack','trueDps','range','crit','critDamage'] as const;
export const DEFENSIVE_AFFIXES=['defense','dodge','move','health','reduction'] as const;
export type Affix=typeof OFFENSIVE_AFFIXES[number]|typeof DEFENSIVE_AFFIXES[number];
export interface EquipmentBinding {hero?:HeroId;elite?:EliteId;direction?:ProductionLineId;family?:FamilyId}
export interface EquipmentItem {
 id:string;template:string;race:Race;slot:EquipmentSlot;quality:Quality;
 allocation:WhiteAllocation;affixes:{key:Affix;score:number}[];binding:EquipmentBinding;
 /** Cleansing changes availability, never the rolled contents or drop-only provenance. */
 pollution:'none'|'uncleansed'|'cleansed';inherited:string[];
}
/** Recipe identity, retained after the item is consumed or lost. Runtime only until save integration. */
export type AcquiredEquipment=Pick<EquipmentItem,'template'|'race'|'slot'|'binding'>;
export type ItemLocation={kind:'warehouse'|'equipped'}|{kind:'backpack'|'ground';run:string;x?:number;z?:number};
export interface EquipmentRun {
 id:string;race:Race;locked:Set<string>;receipts:Set<string>;started:boolean;ended:boolean;
}
export interface EquipmentAccount {
 revision:number;serial:number;rng:number;dust:number;warehouseLevel:0|1|2|3;
 items:Record<string,EquipmentItem>;locations:Record<string,ItemLocation>;
 acquired:Record<string,AcquiredEquipment>;
 equipped:Record<Race,Partial<Record<EquipmentSlot,string>>>;
 pity:Record<Quality,number>;receipts:Record<string,string[]>;run:EquipmentRun|null;
 modification?:{id:string;revision:number;items:string[];kind:'affix'|'elite';index?:number;choices:({key:Affix;score:number}|EquipmentBinding)[]};
}
export interface EquipmentTotals {
 dps:number;attackSpeed:number;armor:number;hp:number;attack:number;trueDps:number;
 range:number;crit:number;critDamage:number;defense:number;dodge:number;move:number;health:number;reduction:number;
}
export type EquipmentResult<T=undefined>={ok:true;value:T}|{ok:false;error:string};
export const success=<T>(value:T):EquipmentResult<T>=>({ok:true,value});
export const failure=(error:string):EquipmentResult<never>=>({ok:false,error});
export const isAttributeSlot=(slot:EquipmentSlot):slot is AttributeSlot=>(ATTRIBUTE_SLOTS as readonly string[]).includes(slot);
export const isOffensiveSlot=(slot:EquipmentSlot)=>slot.startsWith('offense');
