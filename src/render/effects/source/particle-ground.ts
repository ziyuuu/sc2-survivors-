import type {Vector3} from 'three';

/** Replay terrain contacts from birth, so seeking/pausing never changes a spark.
 * Between contacts use the same drag/acceleration trajectory as free particles.
 * A bounce starts a new trajectory at contact; mirroring a below-ground endpoint
 * would accelerate the particle upwards forever after its first contact.
 */
export function groundParticleMotion(position:Vector3,velocity:Vector3,age:number,gravity:number,drag:number,bounce:number,friction:number,ground:(p:{x:number;z:number})=>number){
 let x=position.x,y=Math.max(position.y,ground(position)+.025),z=position.z,vx=velocity.x,vy=velocity.y,vz=velocity.z,remaining=age;
 const sample={x,y,z},travel=(t:number)=>drag>1e-8?-Math.expm1(-drag*t)/drag:t;
 const at=(t:number)=>{const distance=travel(t);sample.x=x+vx*distance;sample.y=y+vy*distance+.5*gravity*t*t;sample.z=z+vz*distance;return sample;};
 const restitution=Math.max(0,Math.min(1,bounce)),tangent=Math.max(0,1-Math.max(0,Math.min(1,friction)));
 while(remaining>1e-9){
  const floor=ground({x,z})+.025;
  if(y<=floor+1e-8&&vy<=1e-4&&gravity<=0){
   // The diminishing rebounds have settled. Keep the particle and its authored
   // lifetime, with horizontal drag; no new downward flight is manufactured.
   const end=at(remaining),decay=Math.exp(-drag*remaining);position.set(end.x,ground(end)+.025,end.z);velocity.set(vx*decay,0,vz*decay);return;
  }
  const end=at(remaining);
  if(end.y>=ground(end)+.025){const decay=Math.exp(-drag*remaining);position.set(end.x,end.y,end.z);velocity.set(vx*decay,vy*decay+gravity*remaining,vz*decay);return;}
  let low=0,high=remaining;
  for(let i=0;i<28;i++){const middle=(low+high)*.5,p=at(middle);if(p.y>=ground(p)+.025)low=middle;else high=middle;}
  const hit=(low+high)*.5,p=at(hit),decay=Math.exp(-drag*hit);
  x=p.x;z=p.z;y=ground(p)+.025;vx*=decay*tangent;vz*=decay*tangent;vy=Math.max(0,-(vy*decay+gravity*hit)*restitution);remaining-=hit;
 }
 position.set(x,y,z);velocity.set(vx,vy,vz);
}
