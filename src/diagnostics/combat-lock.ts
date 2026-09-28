import type {Body} from '../simulation/types';
type Lock={enabled:boolean;prevented:number;damage:number};
const locks=new WeakMap<object,Lock>();
const oneHit=new WeakSet<object>();
export function setDiagnosticOneHit(world:object,enabled:boolean){if(import.meta.env?.PROD)return false;if(enabled)oneHit.add(world);else oneHit.delete(world);return true;}
/** Used only after normal targeting/hit admission, never directly kills or grants rewards. */
export function diagnosticAttackDamage(world:object,target:Body,damage:number,sourceOwner:string){
 if(import.meta.env?.PROD||!oneHit.has(world)||sourceOwner!=='terran'||target.team!=='enemy'||damage<=0)return damage;
 return Math.max(damage,(target.maxHp+target.armor+('maxShield' in target?Number(target.maxShield??0):0)+10000)*100);
}
/** No global production entry point, and never part of a player's saved run. */
export function setDiagnosticHealthLock(world:object,enabled:boolean){
 if(import.meta.env?.PROD)return false;
 const state=locks.get(world)??{enabled:false,prevented:0,damage:0};state.enabled=enabled;locks.set(world,state);return true;
}
export function diagnosticHealthLock(world:object){return {...(locks.get(world)??{enabled:false,prevented:0,damage:0})};}
export function preventDiagnosticDeath(world:object,target:Body,before:number,damage:number){
 if(import.meta.env?.PROD)return;
 const lock=locks.get(world);if(!lock?.enabled||target.team!=='player'||!('unitType' in target)||!('rank' in target)||target.attributes.includes('Structure')||before<=0)return;
 lock.damage+=Math.max(0,damage);if(target.hp<1){target.hp=1;lock.prevented++;}
}
