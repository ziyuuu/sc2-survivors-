import * as THREE from 'three';
import type {MapDefinition} from '../../data/map-definition';
/** Separate texture layers retain seamless repeat derivatives and independent mipmaps.
 * Repeating fract() inside a shared atlas caused mip seams and neighbouring-layer bleed.
 */
export function splitTerrainLayers(pixels:Uint8ClampedArray|Uint8Array,width:number,height:number){
 const side=width/2;if(!Number.isInteger(side)||height!==side*4||pixels.length!==width*height*4)throw Error('Invalid eight-layer terrain atlas');
 const output=new Uint8Array(pixels.length),rowBytes=side*4;
 for(let layer=0;layer<8;layer++)for(let y=0;y<side;y++){const from=((Math.floor(layer/2)*side+y)*width+(layer%2)*side)*4;output.set(pixels.subarray(from,from+rowBytes),(layer*side*side+y*side)*4);}
 return {pixels:output,side};
}
export function terrainArray(texture:THREE.Texture){
 const image=texture.image as HTMLImageElement,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,0,0);
 const {pixels,side}=splitTerrainLayers(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height),array=new THREE.DataArrayTexture(pixels,side,side,8);
 array.colorSpace=texture.colorSpace;array.wrapS=array.wrapT=THREE.RepeatWrapping;array.minFilter=THREE.LinearMipmapLinearFilter;array.magFilter=THREE.LinearFilter;array.generateMipmaps=true;array.anisotropy=8;array.needsUpdate=true;canvas.width=canvas.height=1;return array;
}
/** Continuous original height field is the backing surface underneath the original cliffs.
 * Deleting a whole quad for one steep corner also deleted walkable ramp-foot triangles.
 */
export function originalGroundGeometry(d:MapDefinition){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){positions.push(x-d.origin[0],d.heights[y*d.width+x]-.018,d.origin[1]-y);uv.push(x/(d.width-1),y/(d.height-1));}
 for(let y=0;y<d.height-1;y++)for(let x=0;x<d.width-1;x++){const a=y*d.width+x,b=a+1,c=a+d.width,e=c+1;indices.push(a,b,c,b,e,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
