import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';

/** Native damage footprints only. No visual receipt can create or extend a danger. */
export type LowDanger={key:string;point:Point;kind:'area'|'lane'|'cone';radius:number;length:number;angle:number;caps?:boolean};
export function lowDangerState(w:World):LowDanger[]{
 const result:LowDanger[]=[];
 const area=(key:string,point:Point,radius:number)=>result.push({key,point:{...point},kind:'area',radius,length:0,angle:0});
 const lane=(key:string,point:Point,radius:number,length:number,angle:number,caps=true)=>{if(length>0)result.push({key,point:{...point},kind:'lane',radius,length,angle,caps});};
 for(const c of w.enemySpecials.casts){
  if(c.at<w.time||!w.enemySpecials.targetsPlayer(c))continue;
  const key='enemy:'+c.id;
  if(c.kind==='bile')c.points.forEach((p,i)=>area(key+':'+i,p,c.radius));
  else if(c.kind==='acid')area(key,c.point,c.radius);
  else if(c.kind==='cone')result.push({key,point:{...c.origin},kind:'cone',radius:c.range,length:c.range,angle:c.angle});
  else if(c.kind==='charge')lane(key,c.origin,(w.entities.get(c.source)?.unitRadius??0)+.15,10,c.angle);
  else {const n=c.kind==='spikes'?3:c.count;for(let i=0;i<n;i++)lane(key+':'+i,c.origin,c.kind==='spikes'?c.radius:.2,c.range,c.angle+(i-(n-1)/2)*.2,c.kind!=='spikes');}
 }
 for(const [id,c]of w.enemySpecials.charges){const u=w.entities.get(id);if(u&&u.hp>0&&w.enemySpecials.targetsPlayer(c))lane('charge:'+id,u,u.unitRadius+.15,c.remaining,c.angle);}
 w.enemySpecials.missiles.forEach((m,i)=>{if(w.enemySpecials.targetsPlayer(m))lane('missile:'+m.cast+':'+i,m,.2,m.remaining,m.angle);});
 w.enemySpecials.acidZones.forEach((z,i)=>{if(z.ticks>0&&w.enemySpecials.targetsPlayer(z))area('acid:'+i,z.point,z.radius);});
 w.corrosionZones.forEach((z,i)=>{if(z.until>w.time&&w.starship.packetOwners.get(z)?.owner!=='terran')z.points.forEach((p,j)=>area('corrosion:'+i+':'+j,p,1));});
 for(const e of w.effects)if(e.kind==='bile'&&e.until>w.time&&e.owner==='zerg')area('bile:'+e.id,e.end,e.radius);
 const main=w.campaign18Runtime?.mainCombat;
 for(const c of main?.casts??[]){if(c.at<w.time)continue;const key='main:'+c.id;
  if(c.kind==='bile')area(key,c.point,c.radius);
  else if(c.kind==='line')lane(key,c.origin,c.radius,c.range,c.angle);
  else for(let i=0;i<5;i++)lane(key+':'+i,c.origin,.25,c.range,c.angle+(i-2)*.22);
 }
 for(const m of main?.missiles??[])lane('main-missile:'+m.id,m,.25,m.remaining,m.angle);
 return result;
}

/** Same footprint used by the decal shader (body radii remain a collision rule). */
export function lowDangerContains(d:LowDanger,p:Point){
 const dx=p.x-d.point.x,dz=p.z-d.point.z,c=Math.cos(d.angle),s=Math.sin(d.angle),x=dx*c-dz*s,z=dx*s+dz*c;
 if(d.kind==='area')return Math.hypot(x,z)<=d.radius;
 if(d.kind==='cone')return Math.hypot(x,z)<=d.length&&Math.abs(Math.atan2(x,z))<=.6;
 return (d.caps!==false||z>=0&&z<=d.length)&&Math.hypot(x,z-Math.max(0,Math.min(d.length,z)))<=d.radius;
}
