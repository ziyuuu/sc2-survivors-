import {Camera,Frustum,Matrix4,Quaternion,Sphere,Vector3} from 'three';
/** Conservative per-placement culling. A one-unit skirt exceeds the camera refresh threshold,
 * and transformed geometry bounds keep large/tall off-centre props visible at screen edges. */
export class MapVisibility {
 readonly frustum=new Frustum();private matrix=new Matrix4();private previousProjection=new Matrix4();
 private position=new Vector3(Infinity,0,0);private rotation=new Quaternion();private sphere=new Sphere();
 update(camera:Camera){
  if(this.position.distanceToSquared(camera.position)<.16&&this.rotation.angleTo(camera.quaternion)<.005&&this.previousProjection.equals(camera.projectionMatrix))return false;
  camera.updateMatrixWorld();this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);
  this.position.copy(camera.position);this.rotation.copy(camera.quaternion);this.previousProjection.copy(camera.projectionMatrix);return true;
 }
 intersects(bounds:Sphere){this.sphere.copy(bounds);this.sphere.radius+=1;return this.frustum.intersectsSphere(this.sphere);}
}
