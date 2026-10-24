import type {World} from '../../simulation/world';
import type {Entity,Point} from '../../simulation/types';
import type {SourceEffectPlayer} from './source/player';
import {sourceSeed,sourceFieldScale} from './source/timeline';
import {SOURCE_EFFECTS} from './source/player';
import {nydusPose} from '../units/fun-presentation';
export function renderFunSource(w:World,player:SourceEffectPlayer,ground:(p:Point)=>number,matrix?:(u:Entity)=>number[]|undefined){
 const escort=w.missions.active;
 if(escort?.kind==='escort'&&escort.phase==='offered'){const workers=escort.bodyIds.map(id=>w.missions.bodies.get(id)).filter(b=>b?.role==='worker'&&b.hp>0&&b.invulnerable);if(workers.length){const p={x:workers.reduce((n,b)=>n+b!.x,0)/workers.length,z:workers.reduce((n,b)=>n+b!.z,0)/workers.length},radius=Math.max(...workers.map(b=>Math.hypot(b!.x-p.x,b!.z-p.z)+b!.unitRadius))+.8,key=escort.id+':guardian';player.add({key,model:'GuardianShield',age:w.time,clockRate:1,loop:true,seed:sourceSeed(key),placement:{...p,y:ground(p)+.6,facing:0,scale:sourceFieldScale(SOURCE_EFFECTS.GuardianShield,radius)}},ground);}}
 const n=w.funShop.nydus;if(n){const u=w.entities.get(n.id);if(u){const pose=nydusPose(w,u),transform=matrix?.(u),key=`shop-nydus:${n.id}:${n.phase}:${n.cursor}`;if(pose&&transform)player.add({key,model:'FunNydus',clip:pose.clip,age:pose.seconds,clockRate:1,loop:!pose.once,seed:sourceSeed(key),mesh:false,placement:{x:u.x,y:ground(u),z:u.z,facing:u.facing,matrix:transform}},ground);}}
 const m=w.encounters.expanded.short;
 if(m?.kind==='devourer'){
  const u=w.entities.get(m.actors[0]);if(u&&u.hp>0){const pose=nydusPose(w,u),transform=matrix?.(u);if(pose&&transform){const key=m.id+':'+m.phase+':'+(m.phase==='swallowing'?Math.floor(Math.max(0,m.clock-41)/35):0);player.add({key,model:'FunNydus',clip:pose.clip,age:pose.seconds,clockRate:1,loop:!pose.once,seed:sourceSeed(key),mesh:false,placement:{x:u.x,y:ground(u),z:u.z,facing:u.facing,matrix:transform}},ground);}}
 }
 for(const b of w.encounters.expanded.bursts){const age=w.time-b.time;if(age<0||age>4)continue;player.add({key:b.id,model:b.model??'FunCocoonDeath',mesh:b.model==='BanelingDeath'?false:undefined,clip:'Death',age,clockRate:1,seed:sourceSeed(b.id),placement:{x:b.point.x,y:ground(b.point)+.7,z:b.point.z,facing:b.facing,scale:b.scale*.65}},ground);}
}
