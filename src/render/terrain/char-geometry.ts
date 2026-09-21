import * as THREE from 'three';
import {CHAR_TERRAIN,RAMPS} from '../../data/terrain';
/** Exact shared heightfield with vertical cliff faces and sloping ramp tops. */
export function charGeometry(){const floor:number[]=[],wall:number[]=[],uv:number[]=[],wuv:number[]=[];
 const quad=(out:number[],tex:number[],p:number[][],coords:number[][])=>{for(const i of [0,2,1,0,3,2]){out.push(...p[i]);tex.push(...coords[i]);}};
 const h=(x:number,z:number)=>CHAR_TERRAIN.height({x,z});
 for(let x=-60;x<60;x++)for(let z=-60;z<60;z++){
  const corners=[[x,z],[x+1,z],[x+1,z+1],[x,z+1]],pos=corners.map(([a,b])=>[a,h(a+(a===x?.001:-.001),b+(b===z?.001:-.001)),b]);quad(floor,uv,pos,corners.map(([a,b])=>[(a+60)/120,(b+60)/120]));
  for(const axis of ['x','z']){const a=axis==='x'?[x,z]:[x,z],b=axis==='x'?[x,z+1]:[x+1,z];const side=(p:number[],s:number)=>axis==='x'?h(p[0]+s*.001,p[1]+(p===a?.001:-.001)):h(p[0]+(p===a?.001:-.001),p[1]+s*.001);
   const al=side(a,-1),ar=side(a,1),bl=side(b,-1),br=side(b,1);if(Math.abs(al-ar)+Math.abs(bl-br)<.01)continue;const loA=Math.min(al,ar),hiA=Math.max(al,ar),loB=Math.min(bl,br),hiB=Math.max(bl,br),along=axis==='x'?z:x;
   quad(wall,wuv,[[a[0],loA,a[1]],[b[0],loB,b[1]],[b[0],hiB,b[1]],[a[0],hiA,a[1]]],[[along/6,loA/3],[(along+1)/6,loB/3],[(along+1)/6,hiB/3],[along/6,hiA/3]]);
  }
 }
 const geometry=(p:number[],u:number[],cliff=false)=>{const colors:number[]=[];for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1],z=p[i+2];let shade=1;if(cliff)shade=.38+.62*Math.min(1,y/3);else {const nearRamp=RAMPS.some(r=>Math.abs((r.axis==='x'?z-r.z:x-r.x))<r.width/2+.4&&Math.abs((r.axis==='x'?x-r.x:z-r.z))<r.length/2+1.2);if(!nearRamp){for(const d of [1.8,.9,.35]){const neighbours=[[x+d,z],[x-d,z],[x,z+d],[x,z-d]].map(([a,b])=>h(a,b));if(neighbours.some(v=>v>y+1))shade=d===.35?.50:d===.9?.67:.87;else if(neighbours.some(v=>v<y-1))shade=Math.max(shade,1.12);}}}colors.push(shade,shade,shade);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();return g;};return {floor:geometry(floor,uv),cliffs:geometry(wall,wuv,true)};
}
