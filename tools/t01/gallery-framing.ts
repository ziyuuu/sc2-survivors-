import {Box3,PerspectiveCamera,Vector3} from 'three';

export function boxCorners(box:Box3){return [box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>new Vector3(x,y,z))));}

/** Fit the actual 3D envelope to the existing off-axis camera projection.
 * Tool only: no production camera settings, actor sizes or collision changes. */
export function fitGalleryCamera(camera:PerspectiveCamera,box:Box3,focus:Vector3,padding=.12){
 if(box.isEmpty())return;
 const direction=camera.position.clone().sub(focus).normalize();
 const inverse=camera.quaternion.clone().invert(),e=camera.projectionMatrix.elements;
 const limit=1-padding;let distance=4;
 for(const point of boxCorners(box)){
  const p=point.sub(focus).applyQuaternion(inverse);
  // NDC = (projectionScale * localCoordinate / depth) - offAxis.
  distance=Math.max(distance,p.z+camera.near+.1,
   p.z+Math.abs(p.x)*e[0]/Math.max(.05,limit+(p.x>=0?e[8]:-e[8])),
   p.z+Math.abs(p.y)*e[5]/Math.max(.05,limit+(p.y>=0?e[9]:-e[9])));
 }
 camera.position.copy(focus).addScaledVector(direction,distance);
 camera.far=Math.max(180,distance+box.getSize(new Vector3()).length()+10);
 // Preserve the controller's off-axis projection when only extending far.
 const far=camera.far,near=camera.near;
 camera.projectionMatrix.elements[10]=-(far+near)/(far-near);
 camera.projectionMatrix.elements[14]=-2*far*near/(far-near);
 camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 camera.updateMatrixWorld();
}

/** A rotation-independent envelope keeps long ships fully visible as they turn. */
export function includeModel(box:Box3,model:{bodyOutline:Vector3[];bodyHeight:number;bodyRadius:number},point:{x:number;y:number;z:number},scale:number){
 const radius=Math.max(model.bodyRadius,...model.bodyOutline.map(p=>Math.hypot(p.x,p.z)))*scale;
 const low=Math.min(0,...model.bodyOutline.map(p=>p.y))*scale;
 const high=Math.max(model.bodyHeight,...model.bodyOutline.map(p=>p.y))*scale;
 box.expandByPoint(new Vector3(point.x-radius,point.y+low-.2,point.z-radius));
 box.expandByPoint(new Vector3(point.x+radius,point.y+high+.4,point.z+radius));
}
