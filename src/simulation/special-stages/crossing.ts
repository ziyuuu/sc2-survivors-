import type {World} from '../world';
import type {Entity,Point} from '../types';
import {campaignProgress} from '../../data/enemy-tuning';
import {distance,clearLine,steerGoal,locomote} from '../movement/steering';
import {CROSSING_FORKS,CROSSING_WAVE} from './crossing-layout';
import {revealCrossingFog} from './crossing-fog';
export const CROSSING_START=47.25,CROSSING_FINISH=-47.25;
/** Once the control anchor is across the exit, remaining participants must
 * cross too. Mobile units normally target slots behind the mouse destination;
 * in a large party those slots can all remain before the evacuation line. */
export function crossingExitGoal(w:World,u:Entity):Point|null{
 const a=w.specialStages.active;
 if(a?.kind!=='crossing'||a.phase!=='active'||w.order?.kind!=='move'||w.order.point.z>CROSSING_FINISH||w.anchor.z>CROSSING_FINISH||!a.participants.includes(u.id)||a.escaped.has(u.id))return null;
 return {x:u.x,z:CROSSING_FINISH-1};
}
/** A mouse command into the exit keeps the rear ranks marching after the
 * faster control anchor arrives. A new command away from the exit cancels it. */
export function crossingExitDirection(w:World,goal:Point):Point|null{
 const a=w.specialStages.active;
 if(a?.kind!=='crossing'||a.phase!=='active'||!w.order||w.order.kind!=='move'||goal.z>CROSSING_FINISH||w.anchor.z>CROSSING_FINISH||!w.order.arrived&&(Math.abs(w.anchor.x-goal.x)>=.12||w.anchor.z>goal.z+.12))return null;
 if(!a.participants.some(id=>!a.escaped.has(id)&&(w.entities.get(id)?.hp??0)>0))return null;
 w.order.arrived=false;return {x:0,z:-1};
}
export function tickCrossing(w:World){
 const a=w.specialStages.active!;
 chooseCrossingFork(w);if(a.clock%6===0)revealCrossingFog(w);
 // A regrown twin keeps its original shared membership; no production or new formal slots run here.
 for(const u of w.allies())if(!u.temporary&&!u.summonKind&&u.pairId&&a.pairs.includes(u.pairId)&&!a.participants.includes(u.id))a.participants.push(u.id);
 for(const id of a.participants){const u=w.entities.get(id);if(!u||u.hp<=0||u.z>CROSSING_FINISH)continue;a.escaped.add(id);a.evacuated.set(id,u);w.entities.delete(id);for(const [childId,child] of w.entities)if(child.summonOwnerId===id){a.evacuated.set(childId,child);w.entities.delete(childId);}w.weaponFlights=w.weaponFlights.filter(p=>p.source.id!==id);}
 for(const g of a.crossingGuards??[]){
  const living=g.members.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u&&u.hp>0);
  const hit=living.some(u=>u.lastDamagedAt!==undefined&&w.time-u.lastDamagedAt<2);
  const near=w.allies().some(u=>distance(u,g.point)<g.radius+u.unitRadius&&clearLine(g.point,u,0,w.obstacles,w.terrain));
  const pursuing=g.alerted&&w.allies().some(u=>distance(u,g.point)<g.radius+7&&clearLine(g.point,u,0,w.obstacles,w.terrain));
  g.alerted=living.length>0&&(hit||near||pursuing);
 }
}
export function crossingCounts(w:World){
 const a=w.specialStages.active!;const living=a.participants.filter(id=>!a.escaped.has(id)&&(w.entities.get(id)?.hp??0)>0);
 const pending=[...w.starship.life.pending.values()].some(r=>a.participants.includes(r.body.id)&&!a.escaped.has(r.body.id)&&r.source!=='failed')||w.expedition.zerglingPairs.some(p=>a.pairs.includes(p.id)&&p.members.some(id=>living.includes(id)||a.escaped.has(id))&&(p.birthPending||p.regrowAt!==null))||w.zergHeroes.revivals.some(r=>r.until>w.time&&r.charges>0&&r.seats.some(s=>!s.claimed&&s.members.some(u=>a.participants.includes(u.id))));
 return {escaped:a.escaped.size,living:living.length,pending};
}

/** Choice receipts survive backtracking; neither unchosen lanes nor cleared waves respawn. */
export function initializeCrossing(w:World){
 const a=w.specialStages.active!;a.crossingGuards=[];a.crossingChoices=[];a.nextSwarm=Infinity;a.crossingFog={cells:new Set(),revision:0};revealCrossingFog(w);
}
function chooseCrossingFork(w:World){
 const a=w.specialStages.active!,choices=a.crossingChoices??(a.crossingChoices=[]),index=choices.length,z=CROSSING_FORKS[index];
 if(z===undefined||w.anchor.z>z+13||w.anchor.z<z-10||Math.abs(w.anchor.x)<5)return;
 const side=w.anchor.x<0?-1:1;choices.push(side);
 const p={x:side*12,z},group={id:'fork:'+index,point:p,radius:CROSSING_WAVE.radius,members:[] as number[],homes:[] as Point[],alerted:false};
 for(let i=0;i<1800&&group.members.length<CROSSING_WAVE.count&&w.enemyCount()<300;i++){
  const angle=i*2.399963,r=.5+Math.sqrt(i)*.19,q={x:p.x+Math.sin(angle)*r,z:p.z+Math.cos(angle)*r};
  const radius=group.members.length<CROSSING_WAVE.roaches?.7:.45;
  if(r>7||!w.terrain!.canOccupy(q,radius)||!clearLine(p,q,radius,w.obstacles,w.terrain)||w.allies().some(u=>distance(u,q)<4+u.unitRadius+radius)||[...w.entities.values()].some(u=>u.hp>0&&distance(u,q)<u.unitRadius+radius+.08))continue;
  const n=group.members.length,density=n%9<4?.3:n%9<8?.5:1,stamp={stage:a.stage,progress:campaignProgress(a.stage,0,w.config.durationSeconds),density} as const;
  const u=w.addUnit(n<CROSSING_WAVE.roaches?'roach':'zergling','zerg',q.x,q.z,1,'regular',a.stage,stamp);u.specialNoLoot=true;u.weaponDamage*=.12;u.moveSpeed=Math.min(u.moveSpeed,3.4);u.guardOrigin=true;u.facing=0;
  group.members.push(u.id);group.homes.push(q);
 }
 a.crossingGuards!.push(group);w.hash.invalidatePlanes();
}
/** Gate the ordinary enemy AI until its own corridor is disturbed; return after a local chase. */
export function tickCrossingGuard(w:World,u:Entity,dt:number){
 const a=w.specialStages.active;if(a?.kind!=='crossing'||u.owner!=='zerg')return false;
 const g=a.crossingGuards?.find(g=>g.members.includes(u.id));if(!g)return false;
 if(g.alerted&&distance(u,g.point)<g.radius+9)return false;
 u.prev={x:u.x,z:u.z};u.attackTarget=u.pendingTarget=null;u.windup=0;u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);
 const home=g.homes[g.members.indexOf(u.id)];
 if(distance(u,home)>.15)locomote(u,steerGoal(u,home,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),u.moveSpeed,w.separation(u),dt,w.obstacles,w.mapHalf,w.terrain);
 else {u.action='idle';u.velocity={x:0,z:0};}
 return true;
}
