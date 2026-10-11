import * as THREE from 'three';
/** Isolated projection experiment. Never imported by production or used as acceptance evidence. */
export function experimentalOptics(view:any,kind:'orthographic'|'perspective',span:number,pitch=56,distance=34){
 const target:THREE.Vector3=view.cameraTarget;
 const camera:any=kind==='perspective'?new THREE.PerspectiveCamera():new THREE.OrthographicCamera();
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),box=new THREE.Box3(),point=new THREE.Vector3();
 let width=1,height=1;
 const pose=()=>{const rad=pitch*Math.PI/180;camera.position.copy(target).add(new THREE.Vector3(0,Math.sin(rad)*distance,Math.cos(rad)*distance));camera.lookAt(target);camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);};
 const resize=(w:number,h:number)=>{width=w;height=h;const vertical=span,horizontal=span*w/h,ax=.5,ay=.45;
  camera.near=.1;camera.far=180;camera.zoom=1;
  if(kind==='perspective'){camera.fov=2*Math.atan(vertical/(2*distance))*180/Math.PI;camera.aspect=w/h;camera.updateProjectionMatrix();camera.projectionMatrix.elements[8]=1-2*ax;camera.projectionMatrix.elements[9]=2*ay-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
  Object.assign(camera,{left:-ax*horizontal,right:(1-ax)*horizontal,top:ay*vertical,bottom:-(1-ay)*vertical});
  if(kind==='orthographic')camera.updateProjectionMatrix();pose();
 };
 const controller={target,zoom:1,verticalSpan:span,resize,pose:()=>pose(),setZoom:()=>{},adjustZoom:()=>{},resetZoom:()=>{},
  update(anchor:{x:number;y:number;z:number},dt:number){point.set(anchor.x,anchor.y,anchor.z);target.lerp(point,1-Math.exp(-Math.max(0,dt)*6));pose();},
  visible(p:{x:number;z:number},ground:number,radius=12,tall=24){box.min.set(p.x-radius,ground-2,p.z-radius);box.max.set(p.x+radius,ground+tall,p.z+radius);return frustum.intersectsBox(box);},
  report(){return {experimental:true,projection:kind,pitchDegrees:pitch,tiltFromVerticalDegrees:90-pitch,distance,verticalSpanAtTarget:span,fov:camera.fov??null,zoom:1,effectiveZoom:1,cameraZoom:1,target:target.toArray(),width,height,limitations:'Isolated camera optics experiment; existing contact upsampling and input margins are not yet adapted for perspective. Not production acceptance.'};}
 };
 view.camera=camera;view.cameraController=controller;for(const pass of view.heroComposer.passes)if('camera' in pass)pass.camera=camera;
 resize(view.canvas.clientWidth,view.canvas.clientHeight);return controller.report();
}
