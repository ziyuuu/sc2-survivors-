import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {EquipmentItem} from '../../simulation/starship/types';
import {equipmentGroundDrops,equipmentBackpackState,type EquipmentLootRuntime,type EquipmentLootEvent} from '../../simulation/starship/loot-presentation';
import {commitInstances} from './instance-updates';
import {EQUIPMENT_LOOT_STYLE,EQUIPMENT_ABSORB_SECONDS,equipmentDropShape,equipmentDropName,equipmentDropLift,equipmentAbsorb,layoutEquipmentLabels,type EquipmentDropShape,type LootLabelCandidate,type LootLabelRect} from './equipment-loot-style';

const temp=new THREE.Object3D(),color=new THREE.Color(),projected=new THREE.Vector3();
/** Grow GPU storage as needed. The render capacity is never an equipment or inventory cap. */
class LootBatch {
 mesh:THREE.InstancedMesh;count=0;private capacity=32;
 constructor(readonly root:THREE.Group,readonly geometry:THREE.BufferGeometry,readonly material:THREE.Material,readonly name:string){this.mesh=this.create();}
 private create(){const m=new THREE.InstancedMesh(this.geometry,this.material,this.capacity);m.name='equipment-loot-'+this.name;m.count=0;m.visible=false;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.setColorAt(0,new THREE.Color(0xffffff));this.root.add(m);return m;}
 add(x:number,y:number,z:number,sx:number,sy:number,sz:number,rotation:number,tint:number|THREE.Color=0xffffff){
  if(this.count===this.capacity){const old=this.mesh;this.capacity*=2;this.mesh=this.create();this.mesh.instanceMatrix.array.set(old.instanceMatrix.array);this.mesh.instanceColor!.array.set(old.instanceColor!.array);old.removeFromParent();old.dispose();}
  temp.position.set(x,y,z);temp.rotation.set(0,rotation,0);temp.scale.set(sx,sy,sz);temp.updateMatrix();this.mesh.setMatrixAt(this.count,temp.matrix);this.mesh.setColorAt(this.count++,typeof tint==='number'?color.set(tint):tint);
 }
 end(){commitInstances(this.mesh,this.count);}
 dispose(){this.mesh.removeFromParent();this.mesh.dispose();this.geometry.dispose();}
}
function merged(parts:THREE.BufferGeometry[]){const result=mergeGeometries(parts,false);if(!result)throw Error('Equipment pickup geometry could not be merged');for(const part of parts)part.dispose();result.computeBoundingSphere();return result;}
function box(x:number,y:number,z:number,px=0,py=0,pz=0){return new THREE.BoxGeometry(x,y,z).translate(px,py,pz);}
function cylinder(radius:number,length:number,x=0,y=0,z=0){return new THREE.CylinderGeometry(radius,radius,length,8).rotateX(Math.PI/2).translate(x,y,z);}
/** Three original, reusable sci-fi pickup silhouettes. These do not replace any SC2 unit art. */
function equipmentGeometry(shape:EquipmentDropShape){
 if(shape==='offense')return {
  body:merged([box(.3,.22,.6,0,.15,0),cylinder(.085,.48,0,.19,.42),box(.19,.09,.36,0,.29,-.02),box(.19,.08,.22,0,.06,-.19),box(.07,.16,.24,-.19,.13,-.05),box(.07,.16,.24,.19,.13,-.05)]),
  trim:merged([box(.24,.035,.16,0,.31,-.06),cylinder(.1,.055,0,.19,.54),box(.012,.09,.3,-.155,.18,0),box(.012,.09,.3,.155,.18,0)])
 };
 if(shape==='defense')return {
  body:merged([new THREE.CylinderGeometry(.34,.38,.11,6).translate(0,.12,0),new THREE.CylinderGeometry(.26,.3,.13,6).translate(0,.23,0),box(.09,.04,.55,0,.31,0)]),
  trim:merged([new THREE.TorusGeometry(.255,.025,4,6).rotateX(Math.PI/2).translate(0,.3,0),box(.14,.02,.13,0,.34,0)])
 };
 return {
  body:merged([box(.52,.28,.43,0,.17,0),box(.56,.065,.47,0,.055,0),box(.56,.065,.47,0,.315,0),box(.06,.07,.22,-.17,.38,0),box(.06,.07,.22,.17,.38,0),box(.34,.055,.055,0,.41,.09)]),
  trim:merged([box(.37,.02,.27,0,.352,0),box(.025,.18,.44,-.2,.19,0),box(.025,.18,.44,.2,.19,0)])
 };
}
function effectTexture(kind:'beam'|'glow'|'spark'){
 const width=32,height=kind==='beam'?128:32,data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=(y+.5)/height,d=Math.hypot((u-.5)*2,(v-.5)*2);
  const a=kind==='beam'?Math.exp(-Math.pow((u-.5)*7,2))*Math.pow(1-v,.6)*Math.min(1,v*48):Math.pow(Math.max(0,1-d),kind==='glow'?2:3);
  const n=(y*width+x)*4;data[n]=data[n+1]=data[n+2]=255;data[n+3]=Math.round(a*255);
 }
 const texture=new THREE.DataTexture(data,width,height);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
export class EquipmentDrops {
 readonly root=new THREE.Group();private batches:LootBatch[]=[];private bodies=new Map<EquipmentDropShape,{body:LootBatch;trim:LootBatch}>();
 private glow:LootBatch;private ring:LootBatch;private beam:LootBatch;private sparks:LootBatch;private rune:LootBatch;
 private materials:THREE.Material[]=[];private textures:THREE.Texture[]=[];private labels=new Map<string,HTMLElement>();private toast:HTMLElement;
 private state?:EquipmentLootRuntime;private terrain:World['terrain'];private serial=0;private cachedRevision=-1;private ground:ReturnType<typeof equipmentGroundDrops>=[];private flights:EquipmentLootEvent[]=[];
 private toastAt=-Infinity;private picked=0;private full=false;private occluded:LootLabelRect[]=[];private layoutAt=-Infinity;private layoutSize='';
 private counts={ground:0,visible:0,beams:0,polluted:0,absorbing:0,labels:0};
 /** UI can supply its final names/icons without changing a drop, a receipt or a material. */
 resolveName:(item:EquipmentItem)=>string=equipmentDropName;
 constructor(private scene:THREE.Scene,private labelLayer:HTMLElement){
  this.root.name='equipment-loot';scene.add(this.root);
  const metal=new THREE.MeshStandardMaterial({color:0x66747e,metalness:.78,roughness:.38}),trim=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x182027,metalness:.55,roughness:.3});this.materials.push(metal,trim);
  for(const shape of ['offense','defense','module'] as const){const geo=equipmentGeometry(shape);this.bodies.set(shape,{body:this.batch(geo.body,metal,shape),trim:this.batch(geo.trim,trim,shape+'-trim')});}
  const effect=(kind:'beam'|'glow'|'spark',opacity:number)=>{const map=effectTexture(kind);this.textures.push(map);const m=new THREE.MeshBasicMaterial({map,color:0xffffff,transparent:true,opacity,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});this.materials.push(m);return m;};
  const glow=effect('glow',.8),beam=effect('beam',.65),spark=effect('spark',.95),line=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});this.materials.push(line);
  this.glow=this.batch(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),glow,'glow');
  this.ring=this.batch(new THREE.RingGeometry(.64,.68,40).rotateX(-Math.PI/2),line,'ring');
  this.beam=this.batch(new THREE.PlaneGeometry(1,1).translate(0,.5,0),beam,'beam');
  this.sparks=this.batch(new THREE.OctahedronGeometry(.5),spark,'spark');
  this.rune=this.batch(merged([box(.04,.015,.35,-.24,0,0).rotateY(.5),box(.04,.015,.35,.24,0,0).rotateY(.5),box(.13,.015,.035,-.18,0,-.26),box(.13,.015,.035,.18,0,.26)]),line,'pollution');
  this.toast=document.createElement('div');this.toast.className='equipment-pickup-toast';this.toast.setAttribute('role','status');this.toast.setAttribute('aria-live','polite');this.toast.hidden=true;labelLayer.append(this.toast);
 }
 private batch(geometry:THREE.BufferGeometry,material:THREE.Material,name:string){const b=new LootBatch(this.root,geometry,material,name);this.batches.push(b);return b;}
 get meshes(){return this.batches.map(b=>b.mesh);}
 reset(){this.state=undefined;this.terrain=undefined;this.serial=0;this.cachedRevision=-1;this.ground=[];this.flights=[];this.toastAt=-Infinity;this.picked=0;this.full=false;this.toast.hidden=true;this.toast.textContent='';this.layoutAt=-Infinity;for(const label of this.labels.values())label.remove();this.labels.clear();for(const b of this.batches){b.count=0;b.end();}this.counts={ground:0,visible:0,beams:0,polluted:0,absorbing:0,labels:0};}
 private body(item:EquipmentItem,x:number,y:number,z:number,rotation:number,scale=1){const b=this.bodies.get(equipmentDropShape(item))!;b.body.add(x,y,z,scale,scale,scale,rotation);b.trim.add(x,y,z,scale,scale,scale,rotation,EQUIPMENT_LOOT_STYLE[item.quality].color);}
 private screen(p:{x:number;y:number;z:number},camera:THREE.Camera,width:number,height:number){projected.set(p.x,p.y,p.z).project(camera);return {x:(projected.x*.5+.5)*width,y:(.5-projected.y*.5)*height,visible:projected.z>-1&&projected.z<1&&projected.x>-1.05&&projected.x<1.05&&projected.y>-1.1&&projected.y<1.1};}
 private exclusions(time:number,width:number,height:number){
  const size=width+':'+height;if(time-this.layoutAt<.2&&size===this.layoutSize)return this.occluded;this.layoutAt=time;this.layoutSize=size;
  const base=this.labelLayer.getBoundingClientRect();this.occluded=[...document.querySelectorAll<HTMLElement>('#topbar,#minimap,.native-map-utilities,.native-army-frame,.native-command-frame,#native-selection,#joystick,#unit-inspector,.fixed-hud,[data-equipment-preview-controls]')].filter(el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}).map(el=>el.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1).map(r=>({left:r.left-base.left,top:r.top-base.top,right:r.right-base.left,bottom:r.bottom-base.top}));return this.occluded;
 }
 render(w:World,camera:THREE.Camera,width:number,height:number,ground:(p:Point)=>number,visible:(p:Point)=>boolean){
  if(this.state!==w.starship.loot||this.terrain!==w.terrain){this.reset();this.state=w.starship.loot;this.terrain=w.terrain;}
  const enabled=w.starship.enabled&&!!w.starship.account.run&&!w.starship.account.run.ended&&w.phase==='battle';this.root.visible=enabled;
  if(!enabled){for(const el of this.labels.values())el.hidden=true;this.toast.hidden=true;this.toastAt=-Infinity;this.flights=[];this.serial=this.state.serial;for(const b of this.batches){b.count=0;b.end();}this.counts={ground:0,visible:0,beams:0,polluted:0,absorbing:0,labels:0};return;}
  for(const b of this.batches)b.count=0;
  if(this.cachedRevision!==w.starship.account.revision){this.ground=equipmentGroundDrops(w);this.cachedRevision=w.starship.account.revision;}
  for(const event of this.state.events){if(event.serial<=this.serial)continue;this.serial=event.serial;if(event.terrain!==w.terrain||event.run!==w.starship.account.run!.id||w.time-event.at>1)continue;
   if(event.kind==='pickup'){this.flights.push(event);if(event.at-this.toastAt>.45||this.full)this.picked=0;this.picked++;this.full=false;this.toastAt=event.at;}
   else if(event.kind==='full'){this.full=true;this.toastAt=event.at;}
  }
  this.counts={ground:this.ground.length,visible:0,beams:0,polluted:0,absorbing:0,labels:0};
  const candidates:LootLabelCandidate[]=[],alive=new Set(this.ground.map(d=>d.item.id)),angle=Math.atan2(camera.position.x-w.anchor.x,camera.position.z-w.anchor.z);
  // Keep every quality visible while merging same-quality lights in crowded ground cells.
  const lights=new Map<string,{drop:ReturnType<typeof equipmentGroundDrops>[number];newest:number;polluted:boolean}>();
  for(const [id,label] of this.labels){label.hidden=true;if(!alive.has(id)){label.remove();this.labels.delete(id);}}
  for(const drop of this.ground){
   if(!visible(drop))continue;this.counts.visible++;const item=drop.item,style=EQUIPMENT_LOOT_STYLE[item.quality],age=w.time-drop.at,y=ground(drop),seed=Number(item.id.match(/\d+$/)?.[0]??0)*2.399963;
   const lift=equipmentDropLift(age);this.body(item,drop.x,y+.04+lift,drop.z,seed,1);
   const key=Math.floor(drop.x/1.5)+':'+Math.floor(drop.z/1.5)+':'+item.quality,cell=lights.get(key);
   if(!cell)lights.set(key,{drop,newest:drop.at,polluted:item.pollution!=='none'});
   else{if(item.quality>cell.drop.item.quality)cell.drop=drop;cell.newest=Math.max(cell.newest,drop.at);cell.polluted||=item.pollution!=='none';}
   if(item.pollution!=='none')this.counts.polluted++;
   const distance=Math.hypot(drop.x-w.anchor.x,drop.z-w.anchor.z);
   if(distance<=style.labelDistance){const screen=this.screen({x:drop.x,y:y+.4,z:drop.z},camera,width,height);if(screen.visible){const name=this.resolveName(item),estimated=Math.min(210,Math.max(145,[...name].length*12+65));candidates.push({id:item.id,x:screen.x,y:screen.y,width:estimated,quality:item.quality,distance,name});}}
  }
  for(const cell of lights.values()){
   const {drop}=cell,item=drop.item,style=EQUIPMENT_LOOT_STYLE[item.quality],age=w.time-cell.newest,y=ground(drop),seed=Number(item.id.match(/\d+$/)?.[0]??0)*2.399963,pulse=1+Math.sin(w.time*2+seed)*.05;
   color.set(style.color).multiplyScalar(style.glow*(age<.38?.7:1));this.glow.add(drop.x,y+.035,drop.z,.8*pulse,1,.8*pulse,0,color);
   if(item.quality>=3){color.set(style.color).multiplyScalar(.6);this.ring.add(drop.x,y+.045,drop.z,.8,1,.8,seed,color);}
   if(style.beam&&age>=.25){color.set(style.color).multiplyScalar(item.quality===5?1.65:1.2);this.beam.add(drop.x,y+.08,drop.z,.32,style.beam,1,angle,color);this.beam.add(drop.x,y+.08,drop.z,.055,style.beam,1,angle,color);this.counts.beams++;}
   if(cell.polluted){color.set(0xf2a6dd).multiplyScalar(.9);this.rune.add(drop.x,y+.055,drop.z,1.65,1,1.65,seed,color);}
   const sparkCount=item.quality>=4?4:item.quality===3?2:0;
   for(let n=0;n<sparkCount;n++){const p=((w.time*.38+seed*.1+n/sparkCount)%1+1)%1,a=n*2.4+seed;this.sparks.add(drop.x+Math.cos(a)*(.24+p*.12),y+.15+p*(style.beam*.68),drop.z+Math.sin(a)*(.24+p*.12),.07,.09,.07,0,color.set(style.color).multiplyScalar(Math.sin(p*Math.PI)*1.5));}
   if(age>=0&&age<.65){const p=age/.65;this.ring.add(drop.x,y+.06,drop.z,.2+p*1.25,1,.2+p*1.25,0,color.set(style.color).multiplyScalar((1-p)*1.6));}
  }
  for(const label of layoutEquipmentLabels(candidates,width,height,this.exclusions(w.time,width,height))){
   let el=this.labels.get(label.id);if(!el){el=document.createElement('div');el.className='equipment-drop-label';const name=document.createElement('span'),count=document.createElement('span');name.className='equipment-label-name';count.className='equipment-label-count';el.append(name,count);this.labels.set(label.id,el);this.labelLayer.append(el);}
   const item=w.starship.account.items[label.id],shape=equipmentDropShape(item),text=(shape==='offense'?'▰ ':shape==='defense'?'⬡ ':'▣ ')+label.name,count=label.extra?' +'+label.extra+' 件':'';
   if(el.children[0].textContent!==text)el.children[0].textContent=text;if(el.children[1].textContent!==count)el.children[1].textContent=count;el.title=text+count;el.style.setProperty('--equipment-color',EQUIPMENT_LOOT_STYLE[label.quality].css);el.dataset.quality=String(label.quality);el.dataset.item=label.id;el.dataset.polluted=String(item.pollution!=='none');el.style.transform=`translate(${Math.round(label.left)}px,${Math.round(label.top)}px)`;el.style.width=label.width+'px';el.hidden=false;this.counts.labels++;
  }
  this.flights=this.flights.filter(e=>w.time-e.at<EQUIPMENT_ABSORB_SECONDS);
  for(const e of this.flights){if(!e.item)continue;const from={x:e.x,y:ground(e)+.22,z:e.z},to={x:w.anchor.x,y:ground(w.anchor)+.9,z:w.anchor.z},age=w.time-e.at,p=equipmentAbsorb(from,to,age);this.body(e.item,p.x,p.y,p.z,age*5,p.scale);this.counts.absorbing++;
   for(let n=0;n<6;n++){const a=age-n*.025;if(a<0)continue;const q=equipmentAbsorb(from,to,a),s=(1-n/7)*.15;color.set(EQUIPMENT_LOOT_STYLE[e.item.quality].color).multiplyScalar((1-n/7)*1.8);this.sparks.add(q.x,q.y,q.z,s,s,s,0,color);}
  }
  const toastAge=w.time-this.toastAt;this.toast.hidden=toastAge>2.8||toastAge<0;
  if(!this.toast.hidden){const pack=equipmentBackpackState(w),text=this.full?'背包已满 · 装备留在地面':`拾取 +${this.picked} 件 · 背包 ${pack.count}/${pack.capacity}`;if(this.toast.textContent!==text)this.toast.textContent=text;this.toast.dataset.full=String(this.full);this.toast.style.opacity=String(Math.min(1,(2.8-toastAge)/.35));const p=this.screen({x:w.anchor.x,y:ground(w.anchor),z:w.anchor.z},camera,width,height);this.toast.style.transform=`translate(${Math.max(140,Math.min(width-140,p.x))}px,${Math.max(80,Math.min(height-135,p.y+55))}px) translateX(-50%)`;}
  for(const b of this.batches)b.end();
 }
 report(){return {...this.counts,drawCalls:this.batches.filter(b=>b.mesh.visible&&this.root.visible).length,capacity:Math.max(...this.batches.map(b=>b.mesh.instanceMatrix.count)),serial:this.serial,toast:this.toast.hidden?null:this.toast.textContent};}
 dispose(){this.reset();for(const b of this.batches)b.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.root.removeFromParent();this.toast.remove();}
}
