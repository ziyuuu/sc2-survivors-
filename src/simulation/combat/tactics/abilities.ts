import type {World} from '../../world';
import type {Entity,Body} from '../../types';
import {distance} from '../../movement/steering';
import {funRelation} from '../../encounters/relations';

export function promisedHealing(w:World,target:Entity){
 let promised=0;for(const s of w.expedition.spells)if(s.kind==='transfusion'&&s.target===target.id&&s.until>w.time&&s.period>0)promised+=Math.max(0,1+Math.floor((s.until-Math.max(w.time,s.next))/s.period))*s.amount;
 return promised;
}
export function healingNeed(w:World,target:Entity){return Math.max(0,target.maxHp-target.hp-promisedHealing(w,target));}
export function healingOrder(w:World,amount:number,a:Entity,b:Entity){return Math.min(amount,healingNeed(w,b))-Math.min(amount,healingNeed(w,a))||a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id;}
/** Storm uses full armor penetration in tickAreaSpells; do not subtract weapon armor here. */
export function areaBenefit(w:World,u:Entity,point:Body,targets:readonly Entity[],radius:number,damage:number){
 let gain=0;for(const e of targets){if(e.hp<=0||!(funRelation(w,u,e)??e.owner!==u.owner)||distance(point,e)>radius+e.unitRadius)continue;
  gain+=Math.min(e.hp+(e.shield??0),damage);
 }return gain;
}
