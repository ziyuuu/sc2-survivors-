import {Color,DynamicDrawUsage,InstancedMesh,MeshBasicMaterial,Object3D,PlaneGeometry,Vector3,type Camera,type Scene} from 'three';
import type {Body,Entity,VisualEvent} from '../../simulation/types';
import {commitInstances} from './instance-updates';
import {worldUnitsPerPixel} from '../input/pixel-scale';
export type HealthBarMode='always'|'needed'|'hidden';
export const healthBarMode=(s:string|null):HealthBarMode=>s==='always'||s==='hidden'?s:'needed';
export function showHealthBar(body:Body,mode:HealthBarMode,time:number,selected:boolean,recent=-Infinity){
 const u=body as Entity,shield=(u.shield??0)+(u.talentShield??0),maxShield=(u.maxShield??0)+(u.maxTalentShield??0);
 return body.hp>0&&body.maxHp>0&&mode!=='hidden'&&(mode==='always'||selected||body.hp<body.maxHp||shield<maxShield||time-Math.max(recent,u.lastDamagedAt??-Infinity,u.lastShotAt>0?u.lastShotAt:-Infinity)<=2);
}
/** One view-facing, CSS-pixel sized renderer for all living battlefield bodies. */
export class HealthBars{
 mode:HealthBarMode='needed';private capacity=128;private count=0;private shown:number[]=[];
 private back!:InstancedMesh;private fill!:InstancedMesh;private obj=new Object3D();private color=new Color();private point=new Vector3();private projected=new Vector3();private anchor=new Vector3();private right=new Vector3();private up=new Vector3();
 private recent=new Map<number,number>();private serial=0;private run='';private time=-Infinity;
 constructor(private scene:Scene){try{this.mode=healthBarMode(localStorage.getItem('sc2.health-bars'));}catch{}this.create();}
 setMode(mode:HealthBarMode){this.mode=healthBarMode(mode);try{localStorage.setItem('sc2.health-bars',this.mode);}catch{}}
 private create(){const geometry=new PlaneGeometry(1,1);this.back=new InstancedMesh(geometry,new MeshBasicMaterial({color:0x071119,depthTest:false,depthWrite:false,toneMapped:false}),this.capacity);this.fill=new InstancedMesh(geometry,new MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false,toneMapped:false}),this.capacity);for(const [i,m] of [this.back,this.fill].entries()){m.count=0;m.frustumCulled=false;m.renderOrder=10+i;m.instanceMatrix.setUsage(DynamicDrawUsage);this.scene.add(m);}this.fill.setColorAt(0,this.color);}
 private grow(){const old=[this.back,this.fill];this.capacity*=2;this.create();for(let i=0;i<this.count;i++){old[0].getMatrixAt(i,this.obj.matrix);this.back.setMatrixAt(i,this.obj.matrix);old[1].getMatrixAt(i,this.obj.matrix);this.fill.setMatrixAt(i,this.obj.matrix);old[1].getColorAt(i,this.color);this.fill.setColorAt(i,this.color);}for(const m of old){m.removeFromParent();m.dispose();(m.material as MeshBasicMaterial).dispose();}old[0].geometry.dispose();}
 begin(run:string,time:number,events:VisualEvent[]){this.count=0;this.shown=[];if(run!==this.run||time<this.time){this.recent.clear();this.serial=0;this.run=run;}this.time=time;for(const e of events){if(e.serial<=this.serial)continue;this.serial=e.serial;if(['attack','hit','shield-hit','shield-break'].includes(e.kind))this.recent.set(e.entityId,e.time);}for(const [id,at] of this.recent)if(time-at>2)this.recent.delete(id);}
 add(body:Body,top:{x:number;y:number;z:number},camera:Camera,height:number,selected:boolean,outline?:{x:number;y:number;z:number}[]){if(!showHealthBar(body,this.mode,this.time,selected,this.recent.get(body.id)))return;this.point.copy(top).project(camera);if(outline?.length){let y=-Infinity;for(const p of outline)y=Math.max(y,this.projected.copy(p).project(camera).y);this.point.y=y;}if(Math.abs(this.point.x)>1||Math.abs(this.point.y)>1||Math.abs(this.point.z)>1)return;this.anchor.copy(this.point).unproject(camera);this.shown.push(body.id);const pixel=worldUnitsPerPixel(camera,this.anchor,height),u=body as Entity;this.right.set(1,0,0).applyQuaternion(camera.quaternion);this.up.set(0,1,0).applyQuaternion(camera.quaternion);
  const row=(ratio:number,tint:number,y:number)=>{if(this.count>=this.capacity)this.grow();ratio=Math.max(0,Math.min(1,ratio));this.obj.quaternion.copy(camera.quaternion);this.obj.position.copy(this.anchor).addScaledVector(this.up,y*pixel);this.obj.scale.set(36*pixel,5*pixel,1);this.obj.updateMatrix();this.back.setMatrixAt(this.count,this.obj.matrix);this.obj.position.addScaledVector(this.right,-(1-ratio)*34*pixel/2);this.obj.scale.set(34*pixel*ratio,3*pixel,1);this.obj.updateMatrix();this.fill.setMatrixAt(this.count,this.obj.matrix);this.fill.setColorAt(this.count++,this.color.set(tint));};
  row(body.hp/body.maxHp,body.owner==='terran'?(body.hp/body.maxHp<.3?0xff7852:0x75ef95):0xe65e4f,7);const max=(u.maxShield??0)+(u.maxTalentShield??0);if(max>0)row(((u.shield??0)+(u.talentShield??0))/max,0x65b5ff,13);const reserve=u.zergCombat;if((reserve?.reserveUntil??0)>this.time&&(reserve?.reserve??0)>0)row(reserve!.reserve/Math.max(1,reserve!.reserveMax),0xb5dc67,max>0?19:13);
 }
 end(){commitInstances(this.back,this.count);commitInstances(this.fill,this.count);}
 report(){return {mode:this.mode,rows:this.count,capacity:this.capacity,bodyIds:[...this.shown]};}
}
