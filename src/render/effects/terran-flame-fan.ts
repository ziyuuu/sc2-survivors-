import * as THREE from 'three';

export const KNIGHT_FLAME_ARC=150;
/** A continuous sector, including the space between flame streaks. Radius is 1;
 * the instance uses the real saved attack radius. No billboard extends its rim. */
export function createFlameFanGeometry(arcDegrees=KNIGHT_FLAME_ARC,columns=48,rings=8){
 const vertices=(columns+1)*(rings+1),positions=new Float32Array(vertices*3),uv=new Float32Array(vertices*2),indices:number[]=[];
 const half=arcDegrees*Math.PI/360;
 for(let r=0;r<=rings;r++)for(let c=0;c<=columns;c++){const index=r*(columns+1)+c,angle=-half+2*half*c/columns,radial=r/rings;positions[index*3]=Math.sin(angle)*radial;positions[index*3+2]=Math.cos(angle)*radial;uv[index*2]=c/columns;uv[index*2+1]=radial;}
 for(let r=0;r<rings;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
}
