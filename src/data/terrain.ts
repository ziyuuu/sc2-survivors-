import type {Point,Body} from '../simulation/types';
export const CHAR_HEIGHT=3;
export const AIR_HEIGHT=5.6;
export const RAMPS=[{id:'east',region:1,x:24,z:0,axis:'x',sign:1,width:4,length:6},{id:'west',region:2,x:-24,z:0,axis:'x',sign:-1,width:4,length:6},{id:'north',region:3,x:0,z:-34,axis:'z',sign:-1,width:4,length:6}] as const;
const length=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const FOOTPRINT=[[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]] as const;
/** A fixed map: unlock bounds change, geometry and routes never shuffle. */
export class CharTerrain {
 readonly routes=new Map<string,Point[]>();
 height(p:Point){if(Math.abs(p.z)<=2){if(p.x>=21&&p.x<=27)return (p.x-21)*.5;if(p.x>=-27&&p.x<=-21)return (-p.x-21)*.5;}if(Math.abs(p.x)<=2&&p.z>=-37&&p.z<=-31)return (-p.z-31)*.5;return p.z<=-34||Math.abs(p.x)>=24?CHAR_HEIGHT:0;}
 /** Conservative convex flat regions let ordinary field queries skip slope sampling.
  * Every footprint along the segment is contained; ambiguous edges still use exact checks. */
 flatHeight(a:Point,b:Point,r=0){const left=Math.min(a.x,b.x)-r,right=Math.max(a.x,b.x)+r,top=Math.min(a.z,b.z)-r,bottom=Math.max(a.z,b.z)+r;
  if(left>27||right<-27||bottom<-37)return 3;
  if(left>-21&&right<21&&top>-31)return 0;
  return -1;
 }
 region(p:Point){if(p.z<=-34)return 3;if(p.x>=24)return 1;if(p.x<=-24)return 2;return 0;}
 canOccupy(p:Point,r:number){if(this.flatHeight(p,p,r)>=0)return true;const h=this.height(p),tolerance=r*.52+.035;for(const [x,z] of FOOTPRINT)if(Math.abs(this.height({x:p.x+x*r,z:p.z+z*r})-h)>tolerance)return false;return true;}
 canStep(a:Point,b:Point,r:number){return this.canOccupy(b,r)&&Math.abs(this.height(a)-this.height(b))<=length(a,b)*.52+.02;}
 walkLine(a:Point,b:Point,r:number){if(this.flatHeight(a,b,r)>=0)return true;const n=Math.max(1,Math.ceil(length(a,b)/.4));let old=a;for(let i=1;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};if(!this.canStep(old,p,r))return false;old=p;}return true;}
 sameContactLayer(a:Point,b:Point){return Math.abs(this.height(a)-this.height(b))<.8;}
 lineOfFire(a:Point,b:Point,airA=false,airB=false,melee=false){if(this.flatHeight(a,b)>=0||airA&&airB)return true;if(melee)return this.walkLine(a,b,0);const start=airA?AIR_HEIGHT:this.height(a)+.75,end=airB?AIR_HEIGHT:this.height(b)+.75,n=Math.max(1,Math.ceil(length(a,b)/.4));for(let i=1;i<n;i++){const t=i/n,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(this.height(p)>start+(end-start)*t+.03)return false;}return true;}
 bodyHeight(b:Pick<Body,'x'|'z'|'flying'>){return b.flying?AIR_HEIGHT:this.height(b);}
 /** Tiny region graph has three central-to-plateau edges. Cached portal chains, no grid A*. */
 routeGoal(a:Point,b:Point,r:number,half:number){if(this.walkLine(a,b,r))return b;const from=this.region(a),to=this.region(b),key=from+':'+to;let route=this.routes.get(key);
  if(!route){route=[];const portal=(id:number,up:boolean)=>{const p=RAMPS.find(p=>p.region===id)!;const v=(up?1:-1)*(p.length/2+1.2)*p.sign;return {x:p.x+(p.axis==='x'?v:0),z:p.z+(p.axis==='z'?v:0)};};if(from){route.push(portal(from,true),portal(from,false));}if(to){route.push(portal(to,false),portal(to,true));}this.routes.set(key,route);}
  for(let i=route.length-1;i>=0;i--){const p=route[i];if(Math.abs(p.x)+r<half&&Math.abs(p.z)+r<half&&this.walkLine(a,p,r))return p;}
  return route.find(p=>length(a,p)>.5)??b;
 }
}
export const CHAR_TERRAIN=new CharTerrain();
