import type {World} from '../world';
import type {Entity} from '../types';
import {equipmentCanGrow,permanentEquipmentBody} from '../starship/eligibility';
import {equipmentValue} from '../starship/modules';
export function specialMembers(w:World){return [...w.entities.values()].filter(u=>u.hp>0&&permanentEquipmentBody(w,u)&&!u.heldBy&&!u.mission&&!u.encounter&&!u.fun);}
export function dodgeGroups(w:World){
 const all=specialMembers(w).filter(u=>!u.flying&&!u.winged&&equipmentCanGrow(w,u)),ids=new Set(all.map(u=>u.id)),seen=new Set<string>(),groups:Entity[][]=[];
 for(const u of all){const key=u.pairId??String(u.id);if(seen.has(key))continue;seen.add(key);const g=u.pairId?[...w.entities.values()].filter(v=>v.pairId===u.pairId&&v.hp>0):[u];if(g.every(v=>ids.has(v.id))&&g.length<=4)groups.push(g);}
 return groups;
}
export function canSelectFour(w:World){let sizes=new Set([0]);for(const g of dodgeGroups(w))sizes=new Set([...sizes,...[...sizes].map(n=>n+g.length).filter(n=>n<=4)]);return sizes.has(4);}
export function selectFour(w:World){
 const groups=dodgeGroups(w).map(group=>({group,priority:group.some(u=>u.heroId||u.eliteId)?1:0,roll:w.random()})).sort((a,b)=>b.priority-a.priority||a.roll-b.roll);
 // Maximize priority bodies with an exact 4-body selection. Twin groups are atomic.
 const choices=new Map<number,{bodies:Entity[];score:number}>([[0,{bodies:[],score:0}]]);
 for(const g of groups)for(const [size,picked] of [...choices].sort((a,b)=>b[0]-a[0])){
  const n=size+g.group.length,score=picked.score+g.priority*g.group.length;
  if(n<=4&&(!choices.has(n)||score>choices.get(n)!.score))choices.set(n,{bodies:[...picked.bodies,...g.group],score});
 }
 return choices.get(4)?.bodies??null;
}
export function specialRankCap(w:World,u:Entity){return u.heroId?Math.max(5,equipmentValue(w,'hero_cap')):u.eliteId?5:w.soldierCap(u.unitType as import('../../data/sc2-units').UnitType);}
