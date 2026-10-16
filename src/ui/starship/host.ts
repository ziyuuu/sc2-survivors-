import type {Race} from '../../data/races';
import type {EquipmentAccount,EquipmentResult,EquipmentSlot,EquipmentItem} from '../../simulation/starship/types';
import type {EquipmentPhase} from '../../simulation/starship/phase';
import type {EquipmentLoadout} from '../../simulation/starship/loadout';

export interface ManagementState {
 revision:number;locked:Set<string>;favorites:Set<string>;
 presets:Record<Race,(EquipmentLoadout|null)[]>;
}
export const newManagementState=():ManagementState=>({revision:0,locked:new Set(),favorites:new Set(),presets:{terran:[null,null,null],zerg:[null,null,null],protoss:[null,null,null]}});
export interface SettlementView {run:string;outcome:'success'|'failure';retained:{id:string;name?:string}[];lost:{id:string;name?:string;item?:EquipmentItem}[];salvaged:{id:string;item:EquipmentItem;dust:number}[];dust:number}
export interface StarshipHost {
 readonly management:ManagementState;
 account():EquipmentAccount;race():Race;phase():EquipmentPhase;stage():number;
 subscribe(listener:()=>void):()=>void;notify():void;
 equip(id:string,slot:EquipmentSlot,revision:number):EquipmentResult<unknown>;
 unequip(slot:EquipmentSlot,revision:number):EquipmentResult<unknown>;
 loadout(value:EquipmentLoadout,revision:number):EquipmentResult<unknown>;
 pickup(id:string):EquipmentResult<unknown>;
 drop(id:string,revision:number):EquipmentResult<unknown>;
 dismantle(ids:readonly string[],revision:number):EquipmentResult<unknown>;
 groundItems?():EquipmentItem[];
 /** Lease only the caller's input/clock ownership; never write another window's pause flag. */
 acquireWindow():()=>void;
 resolveImage(key:string,detail?:boolean):string;
 selectRace?(race:Race):EquipmentResult<unknown>;
 begin?():EquipmentResult<unknown>;continue?():EquipmentResult<unknown>;extract?():EquipmentResult<unknown>;
 settlement?():SettlementView|undefined;
 dispose?():void;
}
