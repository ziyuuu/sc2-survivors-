import type {World} from '../../world';
import type {Entity,Body} from '../../types';
import {distance} from '../../movement/steering';
import {weaponFlightSpeed} from '../weapon-flight';
import {unitData} from '../expedition-combat';
import {packetEstimate,nextAttackEstimate,type PredictedHit} from './estimates';

/** Reads authoritative receipts only. Visual events and unchosen bounces never enter. */
export function committedHits(w:World,b:Body):PredictedHit[]{
 const hits:PredictedHit[]=[],seen=new Set<string>();
 for(const p of w.weaponFlights){
  if(p.target!==b.id||p.lost||p.expires<=w.time||b.hp<=0||!w.visibleTo(b,p.source.owner)||!w.targetAllowed(p.source,b)||w.terrain&&!w.terrain.lineOfFire(p.from,b,p.source.flying,b.flying))continue;
  const key=`flight:${p.id}:${p.hop}`;if(seen.has(key))continue;seen.add(key);
  if(p.source.eliteId&&!w.hasAttackLine(p.source,b))continue;
  const packet=packetEstimate(w,p.source,b,p.damage*p.enemyFactor,p.bonuses.map(v=>({...v,amount:v.amount*p.enemyFactor})),p.hits,p.shieldBonus*p.enemyFactor,p.hop?1:p.crit,true,true);
  const at=Math.max(w.time,p.start)+distance(p.point,b)/p.speed;
  if(packet&&at<p.expires)hits.push({...packet,source:p.source,at,key,confidence:'flight'});
 }
 // Hero and flagship child packets have their own authoritative arrival clock.
 // Additional proc/splash multipliers are deliberately not promised in this lower bound.
 for(const p of w.heroAttacks.packets){
  if(p.target!==b.id||p.lost||b.hp<=0||!w.targetAllowed(p.source,b)||!w.hasAttackLine(p.source,b))continue;
  if(['kerrigan','dehaka','artanis','zeratul','alarak','vorazun'].includes(p.hero)&&w.edgeDistance(p.source,b)>p.source.attackRange+.3)continue;
  const packet=packetEstimate(w,p.source,b,p.damage,p.bonuses,p.hits,p.shieldBonus,p.crit,true,true);
  if(packet)hits.push({...packet,source:p.source,at:Math.max(w.time,p.arrival),key:`hero:${p.id}`,confidence:'flight'});
 }
 // Existing area receipts already carry their per-point schedule and hit set.
 for(const area of w.expedition.weaponAreas){
  if(area.owner!=='terran'||b.flying||area.hits.includes(b.id))continue;
  const source=w.starship.attackSources.get(area)??w.entities.get(area.source);if(!source||!w.visibleTo(b,source.owner)||!w.targetAllowed(source,b))continue;
  const index=area.points.findIndex((p,i)=>i>=area.nextIndex&&distance(p,b)<=area.radius+b.unitRadius);if(index<0)continue;
  const direct=b.id===area.primaryTargetId,packet=packetEstimate(w,source,b,area.damage,area.bonuses,1,0,direct?area.primaryCrit??1:1,direct);
  if(packet)hits.push({...packet,source,at:Math.max(w.time,area.next+(index-area.nextIndex)*area.period),key:`area:${area.id}:${b.id}`,confidence:'position'});
 }
 return hits;
}
export function scheduledHits(w:World,u:Entity,b:Body,arrival=0):PredictedHit[]{
 const packet=nextAttackEstimate(w,u,b);if(!packet||u.hp<=0||u.modeTimer>0||u.nativeModeUntil||u.heldBy||(u.stoppedUntil??0)>w.time)return [];
 const flight=weaponFlightSpeed(u),travel=flight?distance(u,b)/flight:0,windup=u.pendingTarget===b.id&&u.windup>0?u.windup:Math.max(1/60,unitData(u).damagePoint);
 const first=Math.max(w.time+arrival+windup,u.nextShotAt)+travel,period=Math.max(1/60,u.shotInterval||u.attackPeriod);
 const result:PredictedHit[]=[];
 for(let at=first;at<=w.time+2+1e-8&&result.length<32;at+=period)result.push({...packet,at,source:u,key:`unit:${u.id}:${u.bornAt}:${result.length}`,confidence:u.pendingTarget===b.id&&result.length===0?'windup':'position'});
 return result;
}
