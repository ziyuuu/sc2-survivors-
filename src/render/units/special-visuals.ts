import {CrossingFog} from './crossing-fog';
import * as THREE from 'three';
import {FunPropAssets,releaseFunVisual} from './fun-prop-assets';
import {makeArcanePortal,updateArcanePortal} from './arcane-portal';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import {FIELD_PICKUP_NAMES} from '../../simulation/field-events/state';
import {SPECIAL_STAGE_NAMES} from '../../simulation/special-stages/state';
import {SpecialTerrain} from '../../simulation/special-stages/terrain';
const release=releaseFunVisual;
function box(w:number,h:number,d:number,color:number){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.2,metalness:.65,roughness:.4}));}
/** Small authored props accompany the original mineral/gas models and original combat units. */
export class SpecialVisuals {
 private props=new Map<string,THREE.Group>();private labels=new Map<string,HTMLElement>();private projected=new THREE.Vector3();
 private fog:CrossingFog;
 constructor(private scene:THREE.Scene,private layer:HTMLElement,private assets:FunPropAssets){this.fog=new CrossingFog(scene);}
 private prop(id:string,build:()=>THREE.Group,seen:Set<string>){seen.add(id);let p=this.props.get(id);if(!p){p=build();this.scene.add(p);this.props.set(id,p);}return p;}
 private label(id:string,text:string,p:Point,y:number,camera:THREE.Camera,width:number,height:number,seen:Set<string>,pinned=false){
  this.projected.set(p.x,y,p.z).project(camera);const v=this.projected,off=Math.abs(v.x)>.82||Math.abs(v.y)>.7||v.z>1;if(off&&!pinned)return;
  seen.add(id);let el=this.labels.get(id);if(!el){el=document.createElement('div');el.className='special-world-label';el.style.cssText='position:absolute;pointer-events:none;transform:translate(-50%,-50%);padding:4px 7px;border:1px solid #8bbfb2;background:#111c25e8;color:#e0f3ea;font:12px/1.4 sans-serif;white-space:nowrap;z-index:4';this.layer.append(el);this.labels.set(id,el);}
  el.textContent=(off?(Math.abs(v.y)>Math.abs(v.x)?v.y>0?'▲ ':'▼ ':v.x<0?'◀ ':'▶ '):'')+text;el.style.left=Math.max(90,Math.min(width-90,(v.x*.5+.5)*width))+'px';el.style.top=Math.max(110,Math.min(height-190,(.5-v.y*.5)*height))+'px';
 }
 update(w:World,camera:THREE.Camera,width:number,height:number,ground:(p:Point)=>number){
  this.assets.updateTime(w.time);this.fog.update(w);
  const seen=new Set<string>(),labels=new Set<string>(),a=w.specialStages.active;
  for(const item of w.fieldEvents.pickups){
   const id='pickup:'+item.id,root=this.prop(id,()=>this.assets.create('pickup-'+item.kind as import('./fun-prop-assets').FunPropName),seen);
   root.position.set(item.x,ground(item)+.25+Math.sin(w.time*2+item.id)*.06,item.z);root.rotation.y=w.time*.45;
   this.label(id,FIELD_PICKUP_NAMES[item.kind],item,ground(item)+2,camera,width,height,labels);
  }
  if(w.specialStages.portal){const p=w.specialStages.portal,id='portal',root=this.prop(id,makeArcanePortal,seen);root.position.set(p.point.x,ground(p.point)+.05,p.point.z);updateArcanePortal(root,w.time,camera);this.label(id,SPECIAL_STAGE_NAMES[p.kind]+' · 传送门',p.point,ground(p.point)+5.4,camera,width,height,labels,true);}
  if(a&&w.terrain instanceof SpecialTerrain){
   const e=w.terrain.extent,id='boundary:'+a.kind;this.prop(id,()=>{const g=new THREE.Group();for(const side of [-1,1]){const x=box(.16,.12,e.z*2,0x628b95);x.position.set(side*e.x,.05,0);const z=box(e.x*2,.12,.16,0x628b95);z.position.set(0,.05,side*e.z);g.add(x,z);}return g;},seen);
   for(const r of a.resources.values())if(r.hp>0&&(r.kind==='chest'||r.kind==='highChest')){
    const root=this.prop('chest:'+r.id,()=>this.assets.create(r.kind==='highChest'?'chest-rare':'chest-common'),seen);root.position.set(r.x,ground(r),r.z);
   }
   if(a.kind==='crossing'){const p={x:0,z:-47.25};this.prop('exit',()=>{const g=new THREE.Group(),floor=box(39,.06,2,0x449e83);floor.position.set(0,.04,p.z-.8);g.add(floor);for(const x of [-19,19]){const pillar=box(.4,3,.4,0x97ecce);pillar.position.set(x,1.5,p.z);g.add(pillar);}return g;},seen);}
   if(a.kind==='dodge'){const root=this.prop('dodge-hitpoint',()=>{const g=new THREE.Group(),edge=new THREE.Mesh(new THREE.CircleGeometry(.27,24),new THREE.MeshBasicMaterial({color:0x081015,depthTest:false,depthWrite:false})),dot=new THREE.Mesh(new THREE.CircleGeometry(.18,24),new THREE.MeshBasicMaterial({color:0xf4ffff,depthTest:false,depthWrite:false}));edge.rotation.x=dot.rotation.x=-Math.PI/2;edge.renderOrder=24;dot.renderOrder=25;dot.position.y=.01;g.add(edge,dot);return g;},seen);root.position.set(w.anchor.x,.2,w.anchor.z);root.visible=a.clock>=a.graceUntil||Math.floor(a.clock/5)%2===0;}
   if(a.kind==='dodge'&&a.cue){const c=a.cue,id='cue:'+a.patterns,root=this.prop(id,()=>{const g=new THREE.Group(),bar=box(c.axis==='z'?34:.25,.13,c.axis==='z'?.25:34,0xff8c55);g.add(bar);return g;},seen);root.position.set(c.axis==='x'?c.side*17.5:0,.1,c.axis==='z'?c.side*17.5:0);}
  }
  for(const [id,p] of this.props)if(!seen.has(id)){release(p);this.props.delete(id);}
  for(const [id,el] of this.labels)if(!labels.has(id)){el.remove();this.labels.delete(id);}
 }
 reset(){this.fog.reset();for(const p of this.props.values())release(p);for(const el of this.labels.values())el.remove();this.props.clear();this.labels.clear();}
 report(){return {props:this.props.size,labels:this.labels.size};}
}
