import type {World} from '../world';
import type {Entity,Body} from '../types';
import {distance} from '../movement/steering';
import {FUN_NYDUS} from '../encounters/expanded-state';
import {funShopQuote,type FunShopId} from './state';
import {tickBait} from './bait';

export function buyFunShop(w:World,id:FunShopId,level:number,expected:number){
 if(w.specialStages.active||!funShopQuote(w.funShop.levels,id,level,expected))return false;
 w.funShop.levels[id]=level;
 if(id==='nydus')w.funShop.nextNydus=w.time+18;
 if(id==='pandora'){w.wallet.minerals+=3000;w.wallet.gas+=1500;w.economyTotals.cards.minerals+=3000;w.economyTotals.cards.gas+=1500;}
 return true;
}
export function shopDetects(w:World,target:Body,owner:Body['owner']){return owner==='terran'&&w.funShop.levels.eye>0&&distance(w.anchor,target)<=14+target.unitRadius;}
export function applyPandoraStats(u:Entity){if(!u.pandora||u.pandoraStats)return;u.maxHp*=1.25;u.hp*=1.25;u.weaponDamage*=1.15;if(u.specialDamageMultiplier!==undefined)u.specialDamageMultiplier*=1.15;if(u.nativeStatScale){u.nativeStatScale.hp*=1.25;u.nativeStatScale.damage*=1.15;}u.pandoraStats=true;}
export function glandDeath(w:World,victim:Entity,sourceId?:number){
 if(!w.funShop.levels.gland||w.specialStages.active||victim.owner!=='zerg'||victim.temporary||victim.summonKind||victim.mission||victim.fun||victim.encounter||victim.enemyTier==='boss'||victim.enemyTier==='lord'||victim.attributes.includes('Structure'))return;
 const source=sourceId===undefined?undefined:w.missions.packetSource?.id===sourceId?w.missions.packetSource:w.entities.get(sourceId);
 if(!source||source.owner!=='terran'||source.temporaryKind==='shop-gland'||source.temporaryKind==='shop-nydus')return;
 let count=0;for(const u of w.entities.values())if(u.hp>0&&u.temporaryKind==='shop-gland')count++;
 if(count>=10||w.random()>=.25)return;
 const p=w.freePosition('baneling',victim,0,4);if(!p)return;
 const u=w.addUnit('baneling','terran',p.x,p.z,1);u.temporary=true;u.temporaryKind='shop-gland';u.temporaryUntil=w.time+30;w.refreshStats(u,true);w.visual('hero-hatch',u);
}
export function nydusEligible(w:World,u:Entity){return u.owner==='zerg'&&u.hp>0&&!u.flying&&!u.enemyTier&&!u.eliteId&&!u.heroId&&!u.mission&&!u.fun&&!u.encounter&&!u.summonKind&&!u.temporary&&!u.specialNoLoot&&!u.attributes.includes('Structure')&&w.visibleTo(u,'terran');}
function retireNydus(w:World){const n=w.funShop.nydus;if(!n)return;w.entities.delete(n.id);w.statuses.removeTarget(n.id);w.funShop.nydus=null;w.hash.invalidatePlanes();}
function tickNydus(w:World){
 const s=w.funShop,n=s.nydus;
 if(n){
  if(n.stage!==w.stage){retireNydus(w);return;}
  const ticks=Math.round((w.time-n.phaseAt)*60);
  if(n.phase==='birth'&&ticks>=FUN_NYDUS.birthTicks){n.phase='open';n.phaseAt=w.time;}
  else if(n.phase==='open'&&ticks>=FUN_NYDUS.openTicks){n.phase='swallow';n.phaseAt=w.time;}
  else if(n.phase==='swallow'&&ticks>=FUN_NYDUS.pickupTicks){
   const u=w.entities.get(n.targets[n.cursor++]);n.phaseAt=w.time;
   // Recheck at the animation cue: moving, transformed or newly protected enemies escape.
   if(u&&nydusEligible(w,u)&&distance(n,u)<=4+u.unitRadius){const original=w.entities.get(n.source),source=original?.owner==='terran'&&original.hp>0?original:w.allies().find(a=>!a.temporary&&!a.summonKind);if(source)w.hit(u,(u.hp+(u.shield??0)+u.armor+1)*1e6,[],1,'terran',0,1,source.id);}
   if(n.cursor>=n.targets.length){n.phase='retreat';n.phaseAt=w.time;}
  }else if(n.phase==='retreat'&&ticks>=FUN_NYDUS.birthTicks)retireNydus(w);
  return;
 }
 if(!s.levels.nydus||w.time+1e-8<s.nextNydus||w.missions.fleet.ceasefire)return;
 s.nextNydus=w.time+18;
 const source=w.allies().find(u=>!u.temporary&&!u.summonKind);if(!source)return;
 const enemies=[...w.entities.values()].filter(u=>nydusEligible(w,u)&&distance(u,w.anchor)<=22);
 let best:Entity[]=[],center:Entity|undefined;
 for(const u of enemies){if(w.terrain&&!w.terrain.canOccupy(u,1.5))continue;const group=enemies.filter(v=>distance(u,v)<=4+v.unitRadius);if(group.length>best.length){best=group;center=u;}}
 if(!center)return;
 const u=w.addUnit('roach','terran',center.x,center.z);u.modelKey='fun-nydus';u.temporary=true;u.temporaryKind='shop-nydus';u.moveSpeed=0;u.weaponDamage=0;u.unitRadius=0;u.visualScale=5.5;u.action='spawn';
 s.nydus={id:u.id,source:source.id,stage:w.stage,born:w.time,phase:'birth',phaseAt:w.time,x:center.x,z:center.z,targets:best.slice(0,6).map(e=>e.id),cursor:0};
 w.announce('友方坑道虫 · 即将吞噬附近普通地面敌人');
}
export function tickFunShop(w:World){if(w.specialStages.active)return;tickNydus(w);tickBait(w);}
