import type {TerrainQuery} from '../../data/map-definition';
import type {CharTerrain} from '../../data/terrain';
import type {Body,Entity} from '../types';
import type {Obstacle} from '../../data/game';
import {SpatialHash} from './spatial-hash';
import {translate} from './steering';
const actor=(body:Body):Entity|undefined=>'velocity' in body?body as Entity:undefined;
const fixed=(u:Entity|undefined)=>!u||u.mode==='siege'||u.modeTimer>0;
/** Pooled, bounded circle contacts. One broad-phase pass supplies both solver passes.
 * Ground/air are independent; crowd correction cannot teleport or bypass terrain.
 */
export class ContactSolver {
 private actors:Entity[]=[];private pairs:Body[]=[];private remaining=new Map<number,number>();
 resolve(units:Iterable<Entity>,hash:SpatialHash<Body>,obstacles:Obstacle[],half:number,dt:number,large:Body|null=null,terrain?:TerrainQuery){
  const {actors,pairs,remaining}=this;actors.length=0;pairs.length=0;remaining.clear();let contacts=0;
  for(const u of units)if(u.hp>0){actors.push(u);remaining.set(u.id,Math.max(.06,u.moveSpeed*1.5*dt));}
  const move=(u:Entity|undefined,x:number,z:number,amount:number)=>{if(!u||fixed(u))return;const limit=Math.min(amount,remaining.get(u.id)??0);if(limit<=0)return;const px=u.x,pz=u.z;translate(u,{x:x*limit,z:z*limit},u.unitRadius,u.flying,obstacles,half,terrain);remaining.set(u.id,Math.max(0,(remaining.get(u.id)??0)-Math.hypot(u.x-px,u.z-pz)));};
  for(const a of actors){let checked=0;hash.query(a,a.unitRadius+1.5,b=>{if(b.id===large?.id)return;if(checked++>=20)return false;
    if(a.id===b.id||a.flying!==b.flying||!a.flying&&terrain&&!terrain.sameContactLayer(a,b)||b.hp<=0||actor(b)&&a.id>b.id)return;
    pairs.push(a,b);
   });if(large&&large.hp>0&&!a.flying){const r=a.unitRadius+large.unitRadius+.25;if((a.x-large.x)**2+(a.z-large.z)**2<r*r)pairs.push(a,large);}}
  for(let pass=0;pass<2;pass++)for(let i=0;i<pairs.length;i+=2){const a=pairs[i] as Entity,b=pairs[i+1];let dx=a.x-b.x,dz=a.z-b.z;const r=a.unitRadius+b.unitRadius,d2=dx*dx+dz*dz;
   if(d2>=(r-.0001)*(r-.0001))continue;const other=actor(b),d=Math.sqrt(d2),overlap=r-d;contacts++;
   if(d<.00001){const angle=(Math.min(a.id,b.id)*7+Math.max(a.id,b.id)*13)*2.399;dx=Math.sin(angle);dz=Math.cos(angle);}else{dx/=d;dz/=d;}
   let wa=fixed(a)?0:1,wb=fixed(other)?0:1;
   // Stationary defenders keep their firing position; initial overlap splits correction.
   const ma=wa&&((a.x-a.prev.x)**2+(a.z-a.prev.z)**2)>.000001,mb=wb&&other&&((other.x-other.prev.x)**2+(other.z-other.prev.z)**2)>.000001;
   if(ma&&!mb)wb=0;else if(mb&&!ma)wa=0;const total=wa+wb;if(!total)continue;
   move(a,dx,dz,overlap*wa/total);move(other,-dx,-dz,overlap*wb/total);
  }
  return contacts;
 }
}
/** Isolated-test convenience; the live World owns a reusable solver. */
export function resolveContacts(units:Iterable<Entity>,hash:SpatialHash<Body>,obstacles:Obstacle[],half:number,dt:number,large:Body|null=null,terrain?:TerrainQuery){return new ContactSolver().resolve(units,hash,obstacles,half,dt,large,terrain);}
