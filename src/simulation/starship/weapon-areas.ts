import type {World} from '../world';
import type {Entity,Point,Body} from '../types';
import {eliteMainFactor} from '../combat/terran-elite-runtime';
import {zergEliteMainFactor} from '../combat/zerg-elite-runtime';
import {protossEliteMainFactor} from '../combat/protoss-elite-runtime';
type Bonus={attribute:string;amount:number};
function effect(w:World,u:Entity,key:string,index=0){const shot=w.starship.attacks.get(u);return shot?.effects.filter(e=>e.key===key).reduce((sum,e)=>sum+(e.values[index]??0),0)??0;}
/** Only explicit native weapon areas call this; range, target search, skills and equipment blasts never do. */
export function equipmentAreaRadius(w:World,u:Entity,radius:number){return radius*(1+effect(w,u,'weapon_area'));}
export function equipmentAreaFactor(w:World,u:Entity){return 1+effect(w,u,'weapon_area',1);}
export function equipmentAreaBonuses(w:World,u:Entity,bonuses:readonly Bonus[]){const f=equipmentAreaFactor(w,u);return bonuses.map(b=>({...b,amount:b.amount*f}));}
export function equipmentAreaHit(w:World,u:Entity,target:Body,damage:number,bonuses:Bonus[],hits=1,shieldBonus=0,primary=true,crit=1,frozen?:Parameters<World['attackHit']>[8]){const factor=equipmentAreaFactor(w,u);w.attackHit(u,target,damage*factor,equipmentAreaBonuses(w,u,bonuses),hits,shieldBonus*factor,primary,crit,frozen);}
/** One cluster branch belongs to the committed cycle, including all native lanes and repeated packets. */
export function equipmentCluster(w:World,u:Entity,point:Point,nativeRadius:number,damage:number,bonuses:readonly Bonus[],hits=1,crit=1,plane:'ground'|'air'|'both'='both',enemyFactor=w.enemyDamageFactor(u)){
 const shot=w.starship.attacks.get(u),count=effect(w,u,'cluster');if(!shot||shot.clustered||!count||shot.derived)return;shot.clustered=true;
 const radius=equipmentAreaRadius(w,u,nativeRadius),small=radius*effect(w,u,'cluster',1),factor=equipmentAreaFactor(w,u)*effect(w,u,'cluster',2)*hits*crit*enemyFactor;
 for(let i=0;i<count;i++){const angle=u.attackFacing+i*Math.PI*2/count,center={x:point.x+Math.sin(angle)*(radius+small),z:point.z+Math.cos(angle)*(radius+small)};
  for(const b of [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])]){if(b.hp<=0||b.owner===u.owner||plane==='ground'&&b.flying||plane==='air'&&!b.flying||Math.hypot(b.x-center.x,b.z-center.z)>small+b.unitRadius||!w.visibleTo(b,u.owner)||w.terrain&&!w.terrain.lineOfFire(center,b,false,b.flying))continue;const native=eliteMainFactor(u,b)*zergEliteMainFactor(u,b)*protossEliteMainFactor(u,b);w.hit(b,damage*factor*native,bonuses.map(a=>({...a,amount:a.amount*factor*native})),1,u.owner,.5,0,u.id,false,false,0,true);}
  w.visual('weapon-area',u,center);w.effect('explosion',u,center,small,.3);
 }
}
