import {funMedicalPatient} from '../encounters/relations';
import {missionSupportAllowed} from '../missions/combat';
import type {World} from '../world';
import type {Entity} from '../types';

/** Keep the first N of the same stable ordering without materializing/sorting every body.
 * Selection is local to one call: earlier heals, new wounds and conversions stay visible. */
export function firstSupportTargets(bodies:Iterable<Entity>,eligible:(u:Entity)=>boolean,compare:(a:Entity,b:Entity)=>number,limit:number){
 const selected:Entity[]=[];
 for(const body of bodies){if(!eligible(body))continue;let at=selected.length;while(at>0&&compare(body,selected[at-1])<0)at--;if(at>=limit)continue;selected.splice(at,0,body);if(selected.length>limit)selected.pop();}
 return selected;
}
export const healthOrder=(a:Entity,b:Entity)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id;
export function medicalTargets(w:World,u:Entity,radius:number,limit:number,previous?:number|null){
 let retained:Entity|undefined;
 const selected=firstSupportTargets(w.entities.values(),p=>{
  if(!((funMedicalPatient(w,u,p)??(p.owner===u.owner))&&missionSupportAllowed(u,p)&&p.id!==u.id&&p.hp>0&&p.hp<p.maxHp&&!p.attributes.includes('Structure')&&(p.attributes.includes('Biological')||p.attributes.includes('Mechanical'))&&w.edgeDistance(u,p)<=radius&&w.hasAttackLine(u,p)))return false;
  if(p.id===previous)retained=p;return true;
 },healthOrder,limit);
 if(retained&&selected[0]!==retained&&retained.hp/retained.maxHp<=selected[0].hp/selected[0].maxHp+.08){const at=selected.indexOf(retained);if(at>=0)selected.splice(at,1);selected.unshift(retained);if(selected.length>limit)selected.pop();}
 return selected;
}
