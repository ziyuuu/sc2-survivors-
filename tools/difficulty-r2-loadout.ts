import {newEquipmentAccount,grantEquipment,equip,validateItem} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type Quality,type Affix} from '../src/simulation/starship/types';
import type {Race} from '../src/data/races';
/** Legal deterministic test equipment; no post-start stat overrides or extra currencies. */
export function difficultyLoadout(race:Race,quality:0|Quality,seed=529,account=newEquipmentAccount(seed)){
 if(quality){for(const [n,slot] of ATTRIBUTE_SLOTS.entries()){
  const r=grantEquipment(account,{template:'attribute.'+Math.min(4,quality),race,slot},`r2-fixture:${race}:${slot}`,{kind:'warehouse'});if(!r.ok)throw Error(r.error);const item=r.value;
  const offensive:Affix[]=['attack','trueDps','range','crit'],defensive:Affix[]=['defense','health','reduction','dodge'],pool=n<4?offensive:defensive;
  item.affixes=item.affixes.map((_,i)=>({key:pool[i],score:140}));if(!validateItem(item))throw Error('Invalid fixture');const result=equip(account,race,item.id,slot);if(!result.ok)throw Error(result.error);
 }}return account;
}
