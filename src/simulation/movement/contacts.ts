import type {Body,Entity} from '../types';
import type {Obstacle} from '../../data/game';
import {SpatialHash} from './spatial-hash';
import {translate} from './steering';
/** Bounded circle contact solver after steering. Different altitude layers never block each other.
 * Correction stays within ordinary per-tick travel; crowds cannot teleport an actor across the map.
 */
export function resolveContacts(units:Iterable<Entity>,hash:SpatialHash<Body>,obstacles:Obstacle[],half:number,dt:number,large:Body|null=null){
 const actors=[...units].filter(u=>u.hp>0),byId=new Map(actors.map(u=>[u.id,u])),remaining=new Map(actors.map(u=>[u.id,Math.max(.06,u.moveSpeed*1.5*dt)]));let contacts=0;
 const fixed=(u:Entity|undefined)=>!u||u.mode==='siege'||u.modeTimer>0;
 const move=(u:Entity|undefined,x:number,z:number,amount:number)=>{if(!u||fixed(u))return 0;const limit=Math.min(amount,remaining.get(u.id)??0),px=u.x,pz=u.z;translate(u,{x:x*limit,z:z*limit},u.unitRadius,u.flying,obstacles,half);const actual=Math.hypot(u.x-px,u.z-pz);remaining.set(u.id,Math.max(0,(remaining.get(u.id)??0)-actual));return actual;};
 const pair=(a:Entity,b:Body)=>{if(a.id===b.id||a.flying!==b.flying||b.hp<=0)return;const other=byId.get(b.id);if(other&&a.id>b.id)return;
  let dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz),overlap=a.unitRadius+b.unitRadius-d;if(overlap<=.0001)return;contacts++;
  if(d<.00001){const angle=(Math.min(a.id,b.id)*7+Math.max(a.id,b.id)*13)*2.399;dx=Math.sin(angle);dz=Math.cos(angle);d=1;}else{dx/=d;dz/=d;}
  let wa=fixed(a)?0:1,wb=fixed(other)?0:1;
  // A moving actor yields to a stationary one. Initial overlap still resolves symmetrically.
  const ma=wa&&Math.hypot(a.x-a.prev.x,a.z-a.prev.z)>.001,mb=wb&&other&&Math.hypot(other.x-other.prev.x,other.z-other.prev.z)>.001;
  if(ma&&!mb)wb=0;else if(mb&&!ma)wa=0;const total=wa+wb;if(!total)return;
  move(a,dx,dz,overlap*wa/total);move(other,-dx,-dz,overlap*wb/total);
 };
 for(let pass=0;pass<2;pass++)for(const a of actors){let checked=0;hash.query(a,a.unitRadius+1.5,b=>{if(b.id===large?.id)return;if(checked++>=20)return false;pair(a,b);});if(large&&!a.flying&&Math.hypot(a.x-large.x,a.z-large.z)<a.unitRadius+large.unitRadius)pair(a,large);}
 return contacts;
}
