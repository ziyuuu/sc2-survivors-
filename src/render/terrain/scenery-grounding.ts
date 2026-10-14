import * as THREE from 'three';
import type {MapPlacement} from '../../data/map-definition';
import type {RadialTerrain} from '../../data/campaign-map';

export interface SceneryShape {width:number;height:number;radius:number;points:THREE.Vector3[];feet:THREE.Vector3[];hull:{x:number;z:number}[]}
export interface SceneryFit {x:number;z:number;y:number;scale:number;vertical:number;angle:number;radius:number;groundMin:number;groundMax:number;solid?:{x:number;z:number;r:number};hull:{x:number;z:number}[];matrix:THREE.Matrix4}
/** The same posed body vertices used by the production bake; no stale glTF accessor bounds. */
export function sceneryShape(root:THREE.Object3D,box:THREE.Box3):SceneryShape{
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),points:THREE.Vector3[]=[],fallback:THREE.Vector3[]=[];
 root.traverse(n=>{if(!(n instanceof THREE.Mesh)||!n.visible)return;const target=n.userData.sc2Role==='body'?points:fallback;for(let i=0;i<n.geometry.attributes.position.count;i++){const p=n.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(n.matrixWorld);p.x-=center.x;p.z-=center.z;p.y-=box.min.y;target.push(p)}});
 if(!points.length)points.push(...fallback);const feet=points.filter(p=>p.y<=Math.max(.01,size.y*.14));
 return {width:Math.max(.01,size.x,size.z),height:size.y,radius:points.reduce((r,p)=>Math.max(r,Math.hypot(p.x,p.z)),0),points,feet,hull:convexHull((feet.length>=3?feet:points).map(p=>({x:p.x,z:p.z})))};
}
export function convexHull(points:readonly {x:number;z:number}[]){
 const sorted=[...new Map(points.map(p=>[p.x+':'+p.z,p])).values()].sort((a,b)=>a.x-b.x||a.z-b.z);if(sorted.length<=2)return sorted;
 const cross=(a:{x:number;z:number},b:{x:number;z:number},c:{x:number;z:number})=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x),lower:typeof sorted=[],upper:typeof sorted=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p)}
 for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p)}return lower.slice(0,-1).concat(upper.slice(0,-1));
}
/** A visual fit only. The original terrain, collision, stages and save recipe stay authoritative. */
export function fitScenery(terrain:RadialTerrain,p:MapPlacement,shape:SceneryShape,solid?:{x:number;z:number;r:number},height=(x:number,z:number)=>terrain.height({x,z})):SceneryFit{
 const x=p.position[0]-80,z=80-p.position[1],vertical=p.modelScale?.[1]??1,angle=p.rotation,c=Math.cos(angle),s=Math.sin(angle);
 let scale=p.scale[0]/shape.width;
 if(solid){const allowance=solid.r-Math.hypot(x-solid.x,z-solid.z)-.12;if(allowance<=0)throw Error('Scenery origin outside its solid footprint');scale=Math.min(scale,allowance/Math.max(shape.radius,.01))}
 const point=(v:{x:number;z:number})=>({x:x+scale*(v.x*c+v.z*s),z:z+scale*(-v.x*s+v.z*c)});
 let y=-Infinity,min=Infinity,max=-Infinity;
 for(const v of shape.feet){const q=point(v),ground=height(q.x,q.z);y=Math.max(y,ground-v.y*scale*vertical);min=Math.min(min,ground);max=Math.max(max,ground)}
 if(!Number.isFinite(y)){y=height(x,z);min=max=y}
 if(p.assetId?.includes('rock')&&!p.assetId.includes('cliff'))y-=shape.height*scale*vertical*.10;
 // Original bottom contact is supported everywhere, then a local skirt fills any slope-side gap.
 y+=(p.position[2]??0);const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(scale,scale*vertical,scale));
 return {x,z,y,scale,vertical,angle,radius:shape.radius*scale,groundMin:min,groundMax:max,solid,hull:shape.hull.map(point),matrix};
}
/** Closed sides under actual low body contacts. All vertices stay inside the original blocker. */
export function sceneryFootingGeometry(terrain:RadialTerrain,fit:SceneryFit){
 if(fit.hull.length<3||!fit.solid)return null;const p:number[]=[],uv:number[]=[],index:number[]=[],h=fit.hull.length;
 const center={x:fit.hull.reduce((n,v)=>n+v.x,0)/h,z:fit.hull.reduce((n,v)=>n+v.z,0)/h};
 const top=fit.y+.012;
 // Slight outward flare fills raster-sized cracks but remains inside the physical exclusion circle.
 const hull=fit.hull.map(v=>{const dx=v.x-center.x,dz=v.z-center.z,l=Math.hypot(dx,dz)||1;const q={x:v.x+dx/l*.055,z:v.z+dz/l*.055};const d=Math.hypot(q.x-fit.solid!.x,q.z-fit.solid!.z),r=fit.solid!.r-.04;return d>r?{x:fit.solid!.x+(q.x-fit.solid!.x)*r/d,z:fit.solid!.z+(q.z-fit.solid!.z)*r/d}:q});
 for(const v of hull){p.push(v.x,top,v.z);uv.push((v.x+80)/160,(80-v.z)/160)}
 for(const v of hull){p.push(v.x,terrain.height(v)-.035,v.z);uv.push((v.x+80)/160,(80-v.z)/160)}
 for(let i=1;i<h-1;i++)index.push(0,i+1,i);for(let i=0;i<h;i++){const j=(i+1)%h;index.push(i,j,j+h,i,j+h,i+h)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
