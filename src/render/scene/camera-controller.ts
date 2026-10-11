import {Box3,Frustum,Matrix4,PerspectiveCamera,Vector3} from 'three';
import {hudMode} from '../../ui/native-hud/mode';
import type {HudMode} from '../../ui/native-hud/frames';

export type SafeInsets={left:number;right:number;top:number;bottom:number};
type Orientation='landscape'|'portrait';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export const CAMERA_PREFERENCE_KEY='sc2.camera.v1';
// Original SC2 5.0.16.97563 Core CameraData: Pitch=56 degrees below horizontal,
// equivalently 34 degrees away from vertically downward. Three.js uses lookAt here.
export const CAMERA_PITCH=56*Math.PI/180;
export const CAMERA_FOV=27.8,CAMERA_DISTANCE=34;
export const CAMERA_DESKTOP_SPAN=2*CAMERA_DISTANCE*Math.tan(CAMERA_FOV*Math.PI/360);
export const CAMERA_OFFSET=new Vector3(0,Math.sin(CAMERA_PITCH),Math.cos(CAMERA_PITCH)).multiplyScalar(CAMERA_DISTANCE);
export const clampZoom=(value:number)=>Number.isFinite(value)?Math.max(.7,Math.min(1.6,value)):1;
export function wheelZoomDelta(delta:number,mode:number,pageHeight:number){return Number.isFinite(delta)?-delta*(mode===1?16:mode===2?pageHeight:1)/1000:0;}
export class CameraController{
 readonly target=new Vector3();
 private preferences={landscape:1,portrait:1};
 private orientation:Orientation='landscape';private mode:HudMode='pc';
 private width=1;private height=1;private safe:SafeInsets={left:0,right:0,top:0,bottom:0};
 private current=1;private start=1;private elapsed=.12;private reduced=false;
 private distance=CAMERA_DISTANCE;private span=CAMERA_DESKTOP_SPAN;
 private projectionBounds={left:0,right:0,top:0,bottom:0};
 private frustum=new Frustum();private matrix=new Matrix4();private bounds=new Box3();private point=new Vector3();
 constructor(readonly camera:PerspectiveCamera,private storage?:StoragePort){
  try{const data=JSON.parse(storage?.getItem(CAMERA_PREFERENCE_KEY)??'null');for(const key of ['landscape','portrait'] as const)if(typeof data?.[key]==='number')this.preferences[key]=clampZoom(data[key]);}catch{}
  this.current=this.zoom;this.start=this.current;
 }
 get zoom(){return this.preferences[this.orientation];}
 get verticalSpan(){return this.span;}
 setZoom(value:number){if(!Number.isFinite(value))return;this.start=this.current;this.elapsed=0;this.preferences[this.orientation]=clampZoom(value);try{this.storage?.setItem(CAMERA_PREFERENCE_KEY,JSON.stringify(this.preferences));}catch{}if(this.reduced){this.current=this.zoom;this.project();}}
 adjustZoom(delta:number){this.setZoom(this.zoom+delta);}
 resetZoom(){this.setZoom(1);}
 resize(width:number,height:number,coarse:boolean,safe:SafeInsets){
  this.width=Math.max(1,width);this.height=Math.max(1,height);this.safe={...safe};this.mode=hudMode(width,height,coarse);
  const direction:Orientation=width>height?'landscape':'portrait';if(direction!==this.orientation){this.orientation=direction;this.current=this.zoom;this.start=this.current;this.elapsed=.12;}
  this.project();
 }
 private project(){
  const {left,right,top,bottom}=this.safe,w=this.width,h=this.height,sw=Math.max(1,w-left-right),sh=Math.max(1,h-top-bottom);
  const span=this.mode==='portrait'?12*sh/sw:this.mode==='landscape'?16:CAMERA_DESKTOP_SPAN;
  const fullHeight=span/this.current*h/sh,fullWidth=fullHeight*w/h;
  const ax=(left+sw*(this.mode==='portrait'?.44:.5))/w,ay=(top+sh*(this.mode==='pc'?.45:this.mode==='landscape'?.42:.44))/h;
  this.span=fullHeight;this.distance=fullHeight/(2*Math.tan(CAMERA_FOV*Math.PI/360));
  this.projectionBounds={left:-ax*fullWidth,right:(1-ax)*fullWidth,top:ay*fullHeight,bottom:-(1-ay)*fullHeight};
  const c=this.camera;c.fov=CAMERA_FOV;c.aspect=w/h;c.near=.1;c.far=180;c.zoom=1;c.updateProjectionMatrix();
  // Off-axis projection puts the followed point at the HUD-safe anchor without rotating the view.
  c.projectionMatrix.elements[8]=1-2*ax;c.projectionMatrix.elements[9]=2*ay-1;c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
 }
 update(anchor:{x:number;y:number;z:number},dt:number,reduced:boolean){
  this.reduced=reduced;this.elapsed=Math.min(.12,this.elapsed+Math.max(0,dt));const t=this.elapsed/.12;
  const next=reduced?this.zoom:this.start+(this.zoom-this.start)*(1-(1-t)**3);if(next!==this.current){this.current=next;this.project();}
  this.point.set(anchor.x,anchor.y,anchor.z);this.target.lerp(this.point,1-Math.exp(-Math.max(0,dt)*6));this.pose(this.target);
 }
 pose(point:Vector3){this.camera.position.copy(point).addScaledVector(CAMERA_OFFSET,this.distance/CAMERA_DISTANCE);this.camera.lookAt(point);this.camera.updateMatrixWorld();this.refreshFrustum();}
 private refreshFrustum(){this.matrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);}
 /** Conservative prism includes tall/flying bodies and authored effects around their source. */
 visible(p:{x:number;z:number},ground:number,radius=12,height=24){this.bounds.min.set(p.x-radius,ground-2,p.z-radius);this.bounds.max.set(p.x+radius,ground+height,p.z+radius);return this.frustum.intersectsBox(this.bounds);}
 report(){return {projection:'perspective',mode:this.mode,orientation:this.orientation,pitchDegrees:CAMERA_PITCH*180/Math.PI,tiltFromVerticalDegrees:90-CAMERA_PITCH*180/Math.PI,fieldOfViewDegrees:CAMERA_FOV,distance:this.distance,verticalSpanAtTarget:this.span,zoom:this.zoom,effectiveZoom:this.current,preferences:{...this.preferences},safe:{...this.safe},target:this.target.toArray(),bounds:{...this.projectionBounds},cameraZoom:this.camera.zoom};}
}
