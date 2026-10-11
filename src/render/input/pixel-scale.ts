import {Vector3,type Camera} from 'three';
/** Pixel tolerance measured in the view plane at the actual body's depth. */
export function worldUnitsPerPixel(camera:Camera,point:{x:number;y:number;z:number},viewportHeight:number){
 const depth=Math.abs(new Vector3(point.x,point.y,point.z).applyMatrix4(camera.matrixWorldInverse).z);
 const perspective=camera.projectionMatrix.elements[11]===-1;
 return 2*(perspective?Math.max(.001,depth):1)/(Math.abs(camera.projectionMatrix.elements[5])*Math.max(1,viewportHeight));
}
