import type {EquipmentAccount} from './types';

export type EquipmentPhase='outside'|'battle'|'intermission'|'settled';
/** Native phase, never pause state, determines whether a loadout may change. */
export function equipmentPhase(phase:string,account:EquipmentAccount):EquipmentPhase {
 if(phase==='battle')return 'battle';
 if(account.run&&!account.run.ended)return phase==='reward'||phase==='won'||phase==='endless-ready'?'intermission':'battle';
 return phase==='lost'||phase==='finished'?'settled':'outside';
}
export const equipmentChangeAllowed=(phase:EquipmentPhase)=>phase!=='battle';
