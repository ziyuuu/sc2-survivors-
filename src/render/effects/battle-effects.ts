import * as THREE from 'three';
import {ASSETS,assetUrl} from '../../assets/manifest';
import type {World} from '../../simulation/world';
import type {Point,VisualEvent} from '../../simulation/types';

type Particle={asset:string;x:number;y:number;z:number;vx:number;vy:number;vz:number;start:number;life:number;size:number;growth:number;color:number;ground:boolean;angle:number};
type Batch={mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;cells:number;start:number;end:number};
const object=new THREE.Object3D(),color=new THREE.Color(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1);
const CAPACITY=256,POOL_SIZE=1280;
const additive=new Set(['fx.muzzle.1','fx.flameimpact.0','fx.blast.0','fx.blast.3','fx.blast.6','fx.blast.8','fx.impact.0','fx.bile.4','fx.baneling.0']);
/** Original M3-referenced sprites; authored web emission timing, not a full SC2 particle emulator. */
export class BattleEffects {
 batches=new Map<string,Batch>();loaded=0;errors:string[]=[];lastSerial=0;
 particles:Particle[]=[];pool:Particle[]=[];steps=new Map<number,number>();
 stats={attack:0,hit:0,death:0,movement:0,bile:0,active:0,dropped:0};
 constructor(private scene:THREE.Scene){}
 async load(){for(const a of ASSETS.values()){if(a.kind!=='effect-texture')continue;const url=assetUrl(a.id);if(!url)continue;try{
   const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=(a as unknown as {sprite?:{columns:number;rows:number;startFrame?:number;endFrame?:number}}).sprite??{columns:1,rows:1};
   const geometry=new THREE.PlaneGeometry(1,1),data=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('spriteFrame',data);
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive.has(a.id)?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.DoubleSide,uniforms:{map:{value:texture},grid:{value:new THREE.Vector2(sprite.columns,sprite.rows)}},
    vertexShader:`attribute vec2 spriteFrame; varying vec2 vUv; varying vec3 vColor; varying float vOpacity; uniform vec2 grid;
     void main(){float f=spriteFrame.x;vUv=(uv+vec2(mod(f,grid.x),grid.y-1.0-floor(f/grid.x)))/grid;vOpacity=spriteFrame.y;vColor=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D map;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
     void main(){vec4 p=texture2D(map,vUv);gl_FragColor=vec4(p.rgb*vColor,p.a*vOpacity);if(gl_FragColor.a<0.01)discard;#include <tonemapping_fragment>
     #include <colorspace_fragment>}`.replace(';#include',';\n#include')});
   const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,color.set(0xffffff));mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=2;this.scene.add(mesh);this.batches.set(a.id,{mesh,data,count:0,cells:sprite.columns*sprite.rows,start:sprite.startFrame??0,end:sprite.endFrame??sprite.columns*sprite.rows-1});this.loaded++;
  }catch(e){this.errors.push(a.id+': '+String(e));}}
 }
 emit(p:Particle){if(!this.batches.has(p.asset))return;if(this.particles.length>=POOL_SIZE){this.stats.dropped++;return;}const item=this.pool.pop()??{} as Particle;Object.assign(item,p);this.particles.push(item);}
 burst(event:VisualEvent&{y?:number},asset:string,count:number,size:number,tint=0xffffff,life=.5,ground=false){for(let i=0;i<count;i++){const a=(event.serial*2.399+i*2.74),r=(i+1)/(count+1);this.emit({asset,x:event.x,y:event.y??(event.flying?3:.6),z:event.z,vx:Math.sin(a)*r*1.8,vy:ground?0:.5+r,vz:Math.cos(a)*r*1.8,start:event.time,life:life*(.8+r*.4),size,growth:.8,color:tint,ground,angle:a});}}
 event(e:VisualEvent,mount:{x:number;y:number;z:number}|null=null){
  if(e.kind==='hit'){this.stats.hit++;const metal=!e.unitType||['hellion','tank','medivac'].includes(e.unitType);this.burst(e,metal?'fx.impact.0':'fx.blood.0',metal?3:2,metal?.25:.5,metal?0xffcf80:e.unitType==='marine'?0xc94031:0x86a956,.28);}
  else if(e.kind==='death'){this.stats.death++;const metal=['hellion','tank','medivac'].includes(e.unitType??'');this.burst(e,metal?'fx.blast.3':e.unitType==='baneling'?'fx.baneling.1':'fx.blood.0',4,metal?1.6:1.1,0xffffff,.7);if(metal)this.burst(e,'fx.blast.4',3,1.5,0x605c57,1.4);}
  else if(e.kind==='bile-impact'){this.stats.bile++;this.burst(e,'fx.bile.6',5,1.6,0xffffff,.9);this.burst(e,'fx.bile.4',1,3,0xffffff,.5,true);}
  else if(e.kind==='pod-land')this.burst(e,'fx.pod.0',5,2.7,0xb6a798,1.1,true);
  else if(e.kind==='pod-destroy')this.burst(e,'fx.blast.3',5,2.2,0xffffff,1);
  else if(e.kind==='egg-expired'||e.kind==='drone-death')this.burst(e,'fx.blood.0',3,1,0x9cbd66,.65);
  else if(e.kind==='attack'){this.stats.attack++;if(e.unitType==='zergling'||e.unitType==='baneling')return;const muzzle={...e,...(mount??{x:e.x+Math.sin(e.facing)*.6,y:.8,z:e.z+Math.cos(e.facing)*.6})};
   if(e.unitType==='hellion'){for(let i=0;i<10;i++){const t=(i+1)/10;this.emit({asset:'fx.flameimpact.0',x:e.x+(e.end.x-e.x)*t,y:.65,z:e.z+(e.end.z-e.z)*t,vx:Math.sin(e.facing)*1.5,vy:.15,vz:Math.cos(e.facing)*1.5,start:e.time+t*.08,life:.3,size:.55+t*.35,growth:1,color:0xffa354,ground:false,angle:e.facing});}}
   else if(e.unitType==='marine'||e.unitType==='tank'){this.burst(muzzle,e.unitType==='marine'?'fx.muzzle.1':'fx.blast.6',1,e.unitType==='marine'?.4:.9,0xffd491,.1);if(e.unitType==='tank')this.burst({...e,...e.end},'fx.blast.3',3,e.siege?2.2:1.1,0xffffff,.55);}
   else this.burst({...e,...e.end},e.unitType==='ravager'?'fx.bile.0':'fx.acid.0',2,.6,e.unitType==='ravager'?0xffa76a:0x99d56e,.4);
  }
 }
 render(w:World,camera:THREE.Camera,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent)=>{x:number;y:number;z:number}|null=()=>null){
  for(const e of w.visualEvents){if(e.serial<=this.lastSerial)continue;this.lastSerial=e.serial;if(visible(e)&&w.time-e.time<1.5)this.event(e,muzzle(e));}
  for(const u of w.entities.values()){if(u.hp<=0||u.flying||!visible(u))continue;const last=this.steps.get(u.id)??u.distanceWalked;if(u.distanceWalked-last>.7){this.stats.movement++;this.steps.set(u.id,u.distanceWalked);this.emit({asset:'fx.impact.1',x:u.x,y:.13,z:u.z,vx:-u.velocity.x*.12,vy:.2,vz:-u.velocity.z*.12,start:w.time,life:.5,size:u.unitType==='tank'?.8:.3,growth:.7,color:0x77726a,ground:false,angle:u.facing});}else if(!this.steps.has(u.id))this.steps.set(u.id,last);}
  for(const id of this.steps.keys())if(!w.entities.has(id))this.steps.delete(id);
  for(const b of this.batches.values())b.count=0;
  let kept=0;for(const p of this.particles){const age=w.time-p.start,t=age/p.life;if(t>=1){this.pool.push(p);continue;}this.particles[kept++]=p;if(t<0||!visible(p))continue;const b=this.batches.get(p.asset)!;if(b.count>=CAPACITY)continue;
   object.position.set(p.x+p.vx*age,p.y+p.vy*age,p.z+p.vz*age);object.scale.setScalar(p.size*(1+t*p.growth));
   if(p.ground)object.rotation.set(-Math.PI/2,0,p.angle);else{object.quaternion.copy(camera.quaternion);rotation.setFromAxisAngle(axis,p.angle);object.quaternion.multiply(rotation);}object.updateMatrix();
   b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(p.color));b.data.setXY(b.count,Math.min(b.end,b.start+Math.floor(t*(b.end-b.start+1))),Math.min(1,(1-t)*2));b.count++;
  }this.particles.length=kept;this.stats.active=kept;
  for(const b of this.batches.values()){b.mesh.count=b.count;b.mesh.visible=b.count>0;b.mesh.instanceMatrix.needsUpdate=true;b.data.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}
 }
}
