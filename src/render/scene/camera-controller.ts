import {Box3,Frustum,Matrix4,PerspectiveCamera,Vector3} from 'three';
import {hudMode} from '../../ui/native-hud/mode';
import type {HudMode} from '../../ui/native-hud/frames';

export type SafeInsets={left:number;right:number;top:number;bottom:number};
type Orientation='landscape'|'portrait';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export const CAMERA_PREFERENCE_KEY='sc2.camera.v2';
// Original SC2 5.0.16.97563 Core CameraData: Pitch=56 degrees below horizontal,
// The approved local control now defaults to 50; original assets remain untouched.
export const CAMERA_PITCH=50*Math.PI/180;
export const CAMERA_FOV=27.8,CAMERA_DISTANCE=34;
export const CAMERA_DESKTOP_SPAN=2*CAMERA_DISTANCE*Math.tan(CAMERA_FOV*Math.PI/360);
export const CAMERA_OFFSET=new Vector3(0,Math.sin(CAMERA_PITCH),Math.cos(CAMERA_PITCH)).multiplyScalar(CAMERA_DISTANCE);
export const clampZoom=(value:number)=>Number.isFinite(value)?Math.max(.6,Math.min(1.8,value)):1;
export const clampPitch=(value:number)=>Number.isFinite(value)?Math.max(40,Math.min(60,Math.round(value/2.5)*2.5)):50;
export type CameraMode='fixed'|'auto'|'cinematic';
export type FrameBody={x:number;y:number;z:number;radius:number;height:number;primary:boolean};
export type ScreenRect={left:number;right:number;top:number;bottom:number};
export type AutoFrame={bodies:FrameBody[];occluded:ScreenRect[];active:boolean;moving?:boolean;combat?:boolean};
type Preference={zoom:number;pitch:number;mode:CameraMode};
export function wheelZoomDelta(delta:number,mode:number,pageHeight:number){return Number.isFinite(delta)?-delta*(mode===1?16:mode===2?pageHeight:1)/1000:0;}
export class CameraController{
 readonly target=new Vector3();
 private preferences:Record<Orientation,Preference>={landscape:{zoom:1,pitch:50,mode:'fixed'},portrait:{zoom:1,pitch:50,mode:'fixed'}};
 private orientation:Orientation='landscape';private mode:HudMode='pc';
 private width=1;private height=1;private safe:SafeInsets={left:0,right:0,top:0,bottom:0};
 private current=1;private currentPitch=50;private start=1;private startPitch=50;private elapsed=.25;private reduced=false;
 private pendingZoom=1;private pendingPitch=50;private autoZoom=1;private autoPitch=50;private quiet=0;private evaluation=0;
 private probe=new PerspectiveCamera();private offset=new Vector3();
 private distance=CAMERA_DISTANCE;private span=CAMERA_DESKTOP_SPAN;
 private projectionBounds={left:0,right:0,top:0,bottom:0};
 private frustum=new Frustum();private matrix=new Matrix4();private bounds=new Box3();private point=new Vector3();
 constructor(readonly camera:PerspectiveCamera,private storage?:StoragePort){
  try{const data=JSON.parse(storage?.getItem(CAMERA_PREFERENCE_KEY)??'null');for(const key of ['landscape','portrait'] as const)if(data?.[key]&&typeof data[key]==='object')this.preferences[key]={zoom:clampZoom(data[key].zoom),pitch:clampPitch(data[key].pitch),mode:data[key].mode==='cinematic'?'cinematic':data[key].mode==='auto'?'auto':'fixed'};}catch{}
  this.current=this.zoom;this.currentPitch=this.pitch;this.startPitch=this.pitch;this.start=this.current;
 }
 get zoom(){return this.preferences[this.orientation].zoom;}
 get pitch(){return this.preferences[this.orientation].pitch;}
 get cameraMode(){return this.preferences[this.orientation].mode;}
 get effectiveZoom(){return this.current;}
 get effectivePitch(){return this.currentPitch;}
 get inputZoom(){return this.cameraMode==='cinematic'?this.current:this.zoom;}
 get verticalSpan(){return this.span;}
 private save(){try{this.storage?.setItem(CAMERA_PREFERENCE_KEY,JSON.stringify(this.preferences));}catch{}}
 private manual(){this.start=this.current;this.startPitch=this.currentPitch;this.elapsed=0;this.preferences[this.orientation].mode='fixed';this.quiet=0;this.save();}
 private retainCinematicOutput(){if(this.cameraMode==='cinematic'){this.preferences[this.orientation].zoom=this.current;this.preferences[this.orientation].pitch=clampPitch(this.currentPitch);}}
 setZoom(value:number){if(!Number.isFinite(value))return;this.retainCinematicOutput();this.preferences[this.orientation].zoom=clampZoom(value);this.manual();}
 setPitch(value:number){if(!Number.isFinite(value))return;this.retainCinematicOutput();this.preferences[this.orientation].pitch=clampPitch(value);this.manual();}
 setMode(mode:CameraMode){this.preferences[this.orientation].mode=mode;this.start=this.current;this.startPitch=this.currentPitch;this.elapsed=0;this.autoZoom=this.current;this.autoPitch=this.currentPitch;this.quiet=0;this.evaluation=0;this.save();}
 adjustZoom(delta:number){this.setZoom(this.inputZoom+delta);}
 resetZoom(){this.preferences[this.orientation]={zoom:1,pitch:50,mode:'fixed'};this.manual();}
 resize(width:number,height:number,coarse:boolean,safe:SafeInsets){
  this.width=Math.max(1,width);this.height=Math.max(1,height);this.safe={...safe};this.mode=hudMode(width,height,coarse);
  const direction:Orientation=width>height?'landscape':'portrait';if(direction!==this.orientation){this.orientation=direction;this.current=this.zoom;this.currentPitch=this.pitch;this.start=this.current;this.startPitch=this.currentPitch;this.autoZoom=this.current;this.autoPitch=this.currentPitch;this.quiet=0;this.evaluation=0;this.elapsed=.25;}
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
 update(anchor:{x:number;y:number;z:number},dt:number,reduced:boolean,frame?:AutoFrame){
  dt=Math.max(0,dt);this.reduced=reduced;
  this.point.set(anchor.x,anchor.y,anchor.z);this.target.lerp(this.point,1-Math.exp(-dt*10));
  if(this.cameraMode==='cinematic')this.updateCinematic(dt,reduced,frame);
  else if(this.cameraMode==='auto'){
   if(frame?.active){this.evaluation-=dt;if(this.evaluation<=0){this.evaluation=.1;const next=this.fit(frame);if(next.zoom<this.autoZoom-.015||next.pitch>this.autoPitch+.1){this.autoZoom=next.zoom;this.autoPitch=next.pitch;this.quiet=0;}else if(next.zoom>this.autoZoom+.015||next.pitch<this.autoPitch-.1){if(Math.abs(next.zoom-this.pendingZoom)>.03||next.pitch!==this.pendingPitch)this.quiet=0;this.pendingZoom=next.zoom;this.pendingPitch=next.pitch;this.quiet+=.1;if(this.quiet>=1.5){this.autoZoom=next.zoom;this.autoPitch=next.pitch;}}else this.quiet=0;}
    const expanding=this.autoZoom<this.current||this.autoPitch>this.currentPitch,t=reduced?1:1-Math.exp(-dt*3/(expanding?.6:1.2));this.current+=(this.autoZoom-this.current)*t;this.currentPitch+=(this.autoPitch-this.currentPitch)*t;}
  }else {this.elapsed=Math.min(.25,this.elapsed+dt);const t=reduced?1:1-(1-this.elapsed/.25)**3;this.current=this.start+(this.zoom-this.start)*t;this.currentPitch=this.startPitch+(this.pitch-this.startPitch)*t;}
  this.project();this.pose(this.target);
 }
 private updateCinematic(dt:number,reduced:boolean,frame?:AutoFrame){
  if(!frame?.active)return;
  this.evaluation-=dt;
  if(this.evaluation<=0){
   this.evaluation=.2;
   const primary=frame.bodies.filter(b=>b.primary),spread=primary.some(b=>Math.hypot(b.x-this.target.x,b.z-this.target.z)>7),giant=primary.some(b=>b.height>4.5);
   const preferred=spread||giant?{zoom:.85,pitch:57.5}:frame.combat?{zoom:1.05,pitch:52.5}:frame.moving?{zoom:1.25,pitch:47.5}:{zoom:1.6,pitch:42.5};
   const next=this.fit(frame,preferred),expanding=next.zoom<this.autoZoom-.04||next.pitch>this.autoPitch+1;
   if(expanding){this.autoZoom=next.zoom;this.autoPitch=next.pitch;this.quiet=0;}
   else if(Math.abs(next.zoom-this.autoZoom)>.04||Math.abs(next.pitch-this.autoPitch)>1){
    if(Math.abs(next.zoom-this.pendingZoom)>.04||next.pitch!==this.pendingPitch)this.quiet=0;
    this.pendingZoom=next.zoom;this.pendingPitch=next.pitch;this.quiet+=.2;
    if(this.quiet>=2){this.autoZoom=next.zoom;this.autoPitch=next.pitch;}
   }else this.quiet=0;
  }
  const expanding=this.autoZoom<this.current-.01||this.autoPitch>this.currentPitch+.1;
  const duration=expanding?.7:frame.moving||frame.combat?1.4:2;
  const t=reduced?1:1-Math.exp(-Math.min(dt,.1)*3/duration);
  this.current+=(this.autoZoom-this.current)*t;this.currentPitch+=(this.autoPitch-this.currentPitch)*t;
 }
 private fit(frame:AutoFrame,preferred?:{zoom:number;pitch:number}){
  const compact=!frame.bodies.some(b=>!b.primary),zoom=preferred?.zoom??clampZoom(this.zoom*(compact?1.1:1)),pitch=preferred?.pitch??clampPitch(this.pitch-(compact?5:0));
  // Probe candidates independently of the current frustum and current zoom. Primary bodies win at limits.
  const fits=(z:number,p:number,primaryOnly:boolean)=>{const c=this.probe;c.copy(this.camera);const distance=this.distance*this.current/z,angle=p*Math.PI/180;c.position.copy(this.target).add(this.offset.set(0,Math.sin(angle),Math.cos(angle)).multiplyScalar(distance));c.lookAt(this.target);c.updateMatrixWorld();
   for(const b of frame.bodies){if(primaryOnly&&!b.primary)continue;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const x of [-b.radius,b.radius])for(const y of [0,b.height])for(const zz of [-b.radius,b.radius]){this.point.set(b.x+x,b.y+y,b.z+zz).project(c);if(this.point.z<-1||this.point.z>1)return false;const sx=(this.point.x+1)*this.width/2,sy=(1-this.point.y)*this.height/2;left=Math.min(left,sx);right=Math.max(right,sx);top=Math.min(top,sy);bottom=Math.max(bottom,sy);}if(left<this.safe.left+10||right>this.width-this.safe.right-10||top<this.safe.top+10||bottom>this.height-this.safe.bottom-10||frame.occluded.some(r=>left<r.right&&right>r.left&&top<r.bottom&&bottom>r.top))return false;}return true;};
  for(let i=0;i<=24;i++){const amount=i/24,z=zoom+(.6-zoom)*amount,p=clampPitch(pitch+(60-pitch)*amount);if(fits(z,p,false))return {zoom:z,pitch:p};}
  // At the range limit keep the widest candidate that still protects the main squad.
  // Searching outward again would snap narrow on phones whenever a secondary body cannot fit.
  for(let i=24;i>=0;i--){const amount=i/24,z=zoom+(.6-zoom)*amount,p=clampPitch(pitch+(60-pitch)*amount);if(fits(z,p,true))return {zoom:z,pitch:p};}
  return {zoom:.6,pitch:60};
 }
 pose(point:Vector3){const pitch=this.currentPitch*Math.PI/180;this.camera.position.copy(point).add(this.offset.set(0,Math.sin(pitch),Math.cos(pitch)).multiplyScalar(this.distance));this.camera.lookAt(point);this.camera.updateMatrixWorld();this.refreshFrustum();}
 private refreshFrustum(){this.matrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);}
 /** Conservative prism includes tall/flying bodies and authored effects around their source. */
 visible(p:{x:number;z:number},ground:number,radius=12,height=24){this.bounds.min.set(p.x-radius,ground-2,p.z-radius);this.bounds.max.set(p.x+radius,ground+height,p.z+radius);return this.frustum.intersectsBox(this.bounds);}
 report(){return {projection:'perspective',mode:this.mode,orientation:this.orientation,cameraMode:this.cameraMode,pitchDegrees:this.currentPitch,requestedPitchDegrees:this.pitch,tiltFromVerticalDegrees:90-this.currentPitch,autoTarget:{zoom:this.autoZoom,pitch:this.autoPitch},fieldOfViewDegrees:CAMERA_FOV,distance:this.distance,verticalSpanAtTarget:this.span,zoom:this.zoom,effectiveZoom:this.current,preferences:structuredClone(this.preferences),safe:{...this.safe},target:this.target.toArray(),bounds:{...this.projectionBounds},cameraZoom:this.camera.zoom};}
}
