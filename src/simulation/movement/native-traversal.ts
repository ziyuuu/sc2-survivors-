import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {MapDefinition,MapPlacement,TerrainQuery} from '../../data/map-definition';
import {CharTerrain} from '../../data/terrain';
import {SOURCE_ABILITIES} from '../../data/expansion-units';
import {eliteEffect} from '../combat/expedition-elites';
import {blocked,clearLine,distance,translate} from './steering';

/** Experimental adaptation from native Jumper/Scaler movers to this map's half-unit grid. */
export const CLIFF_TRAVERSAL={
 reaper:{maximumDistance:4.5,maximumHeight:4.1,minimumHeight:1.5,seconds:.5,cooldown:1.25,kind:'jump' as const},
 colossus:{maximumDistance:6.5,maximumHeight:4.1,minimumHeight:1.5,seconds:.85,cooldown:.25,kind:'stride' as const},
 sampleStep:.2,
} as const;
const footprint=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]] as const;
const at=(a:Point,b:Point,t:number):Point=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
function gridCell(d:MapDefinition,p:Point){const x=Math.floor((p.x+d.origin[0])/d.cellSize),y=Math.floor((d.origin[1]-p.z)/d.cellSize);return x>=0&&y>=0&&x<d.walkWidth&&y<d.walkHeight?y*d.walkWidth+x:-1;}
function cliffLevel(d:MapDefinition,p:Point){const x=Math.round(p.x+d.origin[0]),y=Math.round(d.origin[1]-p.z);return x>=0&&y>=0&&x<d.width&&y<d.height?d.levels[y*d.width+x]:undefined;}
function placementBlocks(d:MapDefinition,p:Point,r:number,placement:MapPlacement){
 const footprint=(placement as MapPlacement&{footprint?:string}).footprint?.match(/(\d+)x(\d+)/);let sx=placement.blockerSize??(footprint?Number(footprint[1]):placement.unit?/Mineral/.test(placement.type)?2:/Geyser/.test(placement.type)?3:4:0),sz=placement.blockerSize??(footprint?Number(footprint[2]):placement.unit?/Mineral/.test(placement.type)?1:/Geyser/.test(placement.type)?3:4:0);if(!sx||!sz)return false;
 sx*=placement.scale[0]??1;sz*=placement.scale[1]??1;const x=p.x+d.origin[0]-placement.position[0],y=d.origin[1]-p.z-placement.position[1],c=Math.cos(placement.rotation),s=Math.sin(placement.rotation);return Math.abs(c*x+s*y)<sx/2+r&&Math.abs(-s*x+c*y)<sz/2+r;
}
function endpointClear(w:World,u:Entity,p:Point){
 if(Math.abs(p.x)+u.unitRadius>=w.mapHalf||Math.abs(p.z)+u.unitRadius>=w.mapHalf||blocked(p,u.unitRadius,w.obstacles)||!w.terrain?.canOccupy(p,u.unitRadius))return false;
 const bodies:Body[]=[...w.entities.values(),...w.pods.filter(p=>['active','opening','falling'].includes(p.status)),...w.expansionHives.values(),...w.fortifications.values(),...(w.hive?[w.hive]:[])];
 return !bodies.some(b=>b.id!==u.id&&b.hp>0&&!b.flying&&distance(p,b)<b.unitRadius+u.unitRadius+.1)&&![...w.entities.values()].some(b=>b.id!==u.id&&b.hp>0&&b.cliffTransit&&distance(p,b.cliffTransit.to)<b.unitRadius+u.unitRadius+.1);
}
/** Reject walls/chasms, even when their far endpoint happens to be walkable. */
export function legalCliffCrossing(w:World,u:Entity,to:Point){
 if(!w.expedition||u.flying||u.heroId||u.summonKind||u.unitType!=='reaper'&&u.unitType!=='colossus'||!w.terrain)return false;
 const profile=CLIFF_TRAVERSAL[u.unitType],terrain=w.terrain,d=terrain.definition,len=distance(u,to),a=terrain.height(u),b=terrain.height(to);
 if(len<.1||len>profile.maximumDistance||Math.abs(a-b)<profile.minimumHeight||Math.abs(a-b)>profile.maximumHeight||!endpointClear(w,u,to)||!terrain.canOccupy(u,u.unitRadius)||clearLine(u,to,u.unitRadius,w.obstacles,terrain))return false;
 if(!d&&!(terrain instanceof CharTerrain))return false;
 const fromLevel=d?cliffLevel(d,u):Math.round(a/3),toLevel=d?cliffLevel(d,to):Math.round(b/3);if(fromLevel===undefined||toLevel===undefined||Math.abs(fromLevel-toLevel)!==1)return false;
 const low=Math.min(a,b),high=Math.max(a,b),minLevel=Math.min(fromLevel,toLevel),maxLevel=Math.max(fromLevel,toLevel),n=Math.ceil(len/CLIFF_TRAVERSAL.sampleStep);let previous=a,steep=false;
 for(let i=0;i<=n;i++){
  const p=at(u,to,i/n),height=terrain.height(p);if(height<low-.15||height>high+.15||(b>a?height<previous-.15:height>previous+.15)||blocked(p,u.unitRadius,w.obstacles))return false;previous=height;
  if(d&&d.placements.some(placement=>placementBlocks(d,p,u.unitRadius,placement)))return false;
  for(const [dx,dz] of footprint){const q={x:p.x+dx*u.unitRadius,z:p.z+dz*u.unitRadius};
   if(d){const cell=gridCell(d,q),level=cliffLevel(d,q);if(cell<0||level===undefined||level<minLevel||level>maxLevel)return false;
    const open=d.walk[cell]?d.opening[cell]:d.reveal[cell];if(!open||open>w.terrainStage)return false;
    if(!d.walk[cell]){const center=terrain.height(q),gradient=Math.max(...[[.4,0],[-.4,0],[0,.4],[0,-.4]].map(([x,z])=>Math.abs(terrain.height({x:q.x+x,z:q.z+z})-center)));
     // compile-map marks steep cliff cells nonwalkable; flat painted hazards remain forbidden.
     if(gradient<=.47)return false;steep=true;
    }
   }else {const qh=terrain.height(q);if(qh<low-.15||qh>high+.15)return false;if(i&&Math.abs(height-terrain.height(at(u,to,(i-1)/n)))>.6)steep=true;}
  }
 }
 return steep;
}
/** Find a nearby legal opposite plateau in the intended direction, never a new global route. */
export function cliffLanding(w:World,u:Entity,rawGoal:Point):Point|null {
 if(u.unitType!=='reaper'&&u.unitType!=='colossus'||!w.terrain||w.time<(u.cliffReadyAt??0))return null;
 const distanceToGoal=distance(u,rawGoal);if(distanceToGoal<.1)return null;const profile=CLIFF_TRAVERSAL[u.unitType],heading=Math.atan2(rawGoal.x-u.x,rawGoal.z-u.z);
 for(const offset of [0,.15,-.15,.3,-.3])for(let length=Math.min(profile.maximumDistance,distanceToGoal);length>=Math.max(1,u.unitRadius*2+.3);length-=.25){const p={x:u.x+Math.sin(heading+offset)*length,z:u.z+Math.cos(heading+offset)*length};if(distance(p,rawGoal)>=distanceToGoal-.2)continue;if(legalCliffCrossing(w,u,p))return p;}
 return null;
}
/** During the brief animation simulation stays on the valid takeoff cell, then commits a rechecked landing. */
export function tickCliffTraversal(w:World,u:Entity,rawGoal:Point,dt:number){
 if(!w.expedition||u.hp<=0)return false;
 const current=u.cliffTransit;if(current){
  u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='move';if(w.time<current.until-1e-8)return true;
  if(endpointClear(w,u,current.to)){u.x=current.to.x;u.z=current.to.z;u.prev={...current.to};u.distanceWalked+=distance(current.from,current.to);}
  u.cliffTransit=undefined;return true;
 }
 if(u.flying||u.heroId||u.summonKind||u.windup>0||(u.stoppedUntil??0)>w.time||dt<=0)return false;
 const landing=cliffLanding(w,u,rawGoal);if(!landing||u.unitType!=='reaper'&&u.unitType!=='colossus')return false;const profile=CLIFF_TRAVERSAL[u.unitType];
 u.cliffTransit={kind:profile.kind,from:{x:u.x,z:u.z},to:landing,startedAt:w.time,until:w.time+profile.seconds};u.cliffReadyAt=w.time+profile.seconds+profile.cooldown;u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;u.facing=Math.atan2(landing.x-u.x,landing.z-u.z);u.action='move';return true;
}
export function cliffRenderPosition(u:Entity,time:number){const transit=u.cliffTransit;if(!transit)return {x:u.x,z:u.z,lift:0};const progress=Math.min(1,Math.max(0,(time-transit.startedAt)/(transit.until-transit.startedAt)));return {...at(transit.from,transit.to,progress),lift:transit.kind==='jump'?Math.sin(Math.PI*progress)*1.1:0};}

function chargeMovementAllowed(w:World,u:Entity,target:Body){return target.hp>0&&!target.flying&&target.owner!==u.owner&&w.targetAllowed(u,target)&&clearLine(u,target,u.unitRadius,w.obstacles,w.terrain);}
/** Charge changes approach speed only; attacks retain their normal timing, damage and target rules. */
export function tickZealotCharge(w:World,u:Entity,target:Body|undefined,dt:number){
 if(!w.expedition||u.unitType!=='zealot'||u.heroId||u.summonKind||u.hp<=0||u.flying)return false;
 const source=SOURCE_ABILITIES.charge,manual=u.owner==='terran'&&(Math.hypot(w.input.x,w.input.z)>.01||w.order?.kind==='move'&&!w.order.arrived),state=u.chargeState;
 if(state){target=w.body(state.targetId);if(!target||!chargeMovementAllowed(w,u,target)||manual||w.time>=state.until||(u.stoppedUntil??0)>w.time){u.chargeState=undefined;return false;}}
 else {
  if(!target||manual||u.owner==='terran'&&!w.expedition.tech.charge||w.time<(u.chargeReadyAt??0)||u.windup>0||(u.stoppedUntil??0)>w.time||!chargeMovementAllowed(w,u,target))return false;
  const edge=w.edgeDistance(u,target);if(edge<=source.minTriggerDistance||edge>=source.maxTriggerDistance)return false;
  u.chargeState={targetId:target.id,until:w.time+source.duration};u.chargeReadyAt=w.time+source.cooldown*eliteEffect(u,'chargeCooldownMultiplier');
 }
 const victim=target!,remaining=w.edgeDistance(u,victim)-Math.max(.1,u.attackRange*.8);if(remaining<=.01){u.chargeState=undefined;return false;}
 const dx=victim.x-u.x,dz=victim.z-u.z,d=Math.hypot(dx,dz)||1,step=Math.min(remaining,u.moveSpeed*source.speedMultiplier*dt),before={x:u.x,z:u.z};
 u.prev={...before};translate(u,{x:dx/d*step,z:dz/d*step},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);u.velocity={x:dt?(u.x-before.x)/dt:0,z:dt?(u.z-before.z)/dt:0};u.distanceWalked+=distance(before,u);u.facing=Math.atan2(dx,dz);u.action='move';if(distance(before,u)<step*.5)u.chargeState=undefined;return true;
}
