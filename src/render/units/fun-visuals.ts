import * as THREE from 'three';
import {FunPropAssets,releaseFunVisual} from './fun-prop-assets';
import type {World} from '../../simulation/world';
import type {Entity,Point} from '../../simulation/types';
import {AIR_HEIGHT} from '../../data/terrain';
type Wings={root:THREE.Group;left:THREE.Group;right:THREE.Group};
export type FunBodyPose={x:number;y:number;z:number;scale:number;facing:number};
function makeWings(assets:FunPropAssets):Wings{
 const root=assets.create('elytra'),left=root.getObjectByName('elytra-left') as THREE.Group,right=root.getObjectByName('elytra-right') as THREE.Group;
 root.name='elytra-wings';return {root,left,right};
}
const release=releaseFunVisual;
/** Every eligible ground family uses its measured original body bounds; no family allowlist. */
export class FunVisuals{
 private wings=new Map<number,Wings>();private cysts=new Map<number,THREE.Group>();private drops=new Map<string,Wings>();private labels=new Map<string,HTMLDivElement>();private point=new THREE.Vector3();
 constructor(private scene:THREE.Scene,private layer:HTMLElement,private assets:FunPropAssets){}
 update(w:World,camera:THREE.Camera,width:number,height:number,ground:(p:Point)=>number,bounds:(u:Entity)=>{height:number;radius:number},visible:(u:Entity)=>boolean,bodyPose:(u:Entity)=>FunBodyPose|undefined){
  const wingIds=new Set<number>(),infectedIds=new Set<number>(),dropIds=new Set<string>(),labelIds=new Set<string>();
  for(const u of w.entities.values()){
   const pose=bodyPose(u);if(u.hp<=0||u.heldBy&&!pose)continue;
   const shape=bounds(u),level=u.wingHeight??1,y=pose?.y??(u.winged?ground(u)+(AIR_HEIGHT-ground(u))*level:u.flying?AIR_HEIGHT:ground(u));
   if(u.winged){
    wingIds.add(u.id);let view=this.wings.get(u.id);if(!view){view=makeWings(this.assets);this.wings.set(u.id,view);this.scene.add(view.root);}
    view.root.visible=!!pose&&visible(u);view.root.position.set(pose?.x??u.x,y+shape.height*.80,pose?.z??u.z);view.root.rotation.y=pose?.facing??u.facing;
    const span=Math.max(.015,shape.radius*1.35,shape.height*.50);view.root.scale.setScalar(span);
    const beat=Math.sin(w.time*32+u.id*.71)*.28*level+.12;view.left.rotation.z=beat;view.right.rotation.z=-beat;
    view.left.visible=view.right.visible=level>0;
   }

  }
  for(const infection of w.encounters.expanded.infections.values())for(const id of infection.ids){
   const u=w.entities.get(id);if(!u||u.hp<=0||u.heldBy&&!bodyPose(u))continue;infectedIds.add(id);let root=this.cysts.get(id);
   if(!root){root=new THREE.Group();for(let i=0;i<3;i++){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshStandardMaterial({color:0x9ba843,emissive:0x304409,emissiveIntensity:.3,roughness:.7}));mesh.position.set((i-1)*.22,0,i%2*.2);root.add(mesh);}this.cysts.set(id,root);this.scene.add(root);}
   const b=bounds(u),pose=bodyPose(u),growth=1-Math.max(0,infection.ticks)/600;root.visible=!!pose&&visible(u);root.position.set(pose?.x??u.x,(pose?.y??(u.flying?AIR_HEIGHT:ground(u)))+b.height*.78,pose?.z??u.z);root.rotation.y=pose?.facing??u.facing;root.scale.setScalar(Math.max(.004,b.radius*.4)*(.7+growth*.9));
  }
  for(const drop of w.encounters.expanded.elytra){
   dropIds.add(drop.id);let v=this.drops.get(drop.id);if(!v){v=makeWings(this.assets);this.drops.set(drop.id,v);this.scene.add(v.root);}
   v.root.position.set(drop.point.x,ground(drop.point)+.5+Math.sin(w.time*3)*.1,drop.point.z);v.root.rotation.y=w.time*.4;v.root.scale.setScalar(.7);v.left.rotation.z=.25;v.right.rotation.z=-.25;
   this.label(drop.id,'鞘翅 · 靠近拾取',drop.point,ground(drop.point)+1.6,camera,width,height,labelIds);
  }
  for(const [id,v] of this.wings)if(!wingIds.has(id)){release(v.root);this.wings.delete(id);}
  for(const [id,v] of this.cysts)if(!infectedIds.has(id)){release(v);this.cysts.delete(id);}
  for(const [id,v] of this.drops)if(!dropIds.has(id)){release(v.root);this.drops.delete(id);}
  for(const [id,v] of this.labels)if(!labelIds.has(id)||w.phase!=='battle'){v.remove();this.labels.delete(id);}
 }
 private label(id:string,text:string,p:Point,y:number,camera:THREE.Camera,width:number,height:number,seen:Set<string>,pin=true){
  this.point.set(p.x,y,p.z).project(camera);if(!pin&&(Math.abs(this.point.x)>.85||Math.abs(this.point.y)>.8||this.point.z>1||(.5-this.point.y*.5)*height>height-190))return;
  seen.add(id);let el=this.labels.get(id);if(!el){el=document.createElement('div');el.style.cssText='position:absolute;pointer-events:none;padding:4px 7px;background:#11191de0;border:1px solid #a9ba82;color:#e8edca;border-radius:3px;font:12px sans-serif;white-space:nowrap;transform:translate(-50%,-50%);z-index:4';this.layer.append(el);this.labels.set(id,el);}
  this.point.set(p.x,y,p.z).project(camera);const off=Math.abs(this.point.x)>.85||Math.abs(this.point.y)>.8||this.point.z>1;
  el.textContent=(off?(this.point.x<0?'◀ ':'▶ '):'')+text;el.style.left=Math.max(110,Math.min(width-110,(this.point.x*.5+.5)*width))+'px';el.style.top=Math.max(140,Math.min(height-190,(.5-this.point.y*.5)*height))+'px';
 }
 reset(){for(const v of this.wings.values())release(v.root);for(const v of this.cysts.values())release(v);for(const v of this.drops.values())release(v.root);for(const v of this.labels.values())v.remove();this.wings.clear();this.cysts.clear();this.drops.clear();this.labels.clear();}
 report(){return {wings:this.wings.size,infections:this.cysts.size,drops:this.drops.size};}
 dispose(){this.reset();}
}
