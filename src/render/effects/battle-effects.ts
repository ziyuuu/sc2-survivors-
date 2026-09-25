import {OriginalProjectiles} from './original-projectiles';
import {commitInstances,uploadActive} from '../units/instance-updates';
import * as THREE from 'three';
import {ASSETS,assetUrl} from '../../assets/manifest';
import type {World} from '../../simulation/world';
import type {Point,VisualEvent} from '../../simulation/types';
import {attackPresentation,heroPresentation} from '../../data/combat-presentation';
import {HEROES,HERO_SKILL_FLIGHT} from '../../data/heroes';
import {AIR_HEIGHT} from '../../data/terrain';

type Particle={asset:string;x:number;y:number;z:number;vx:number;vy:number;vz:number;start:number;life:number;size:number;growth:number;color:number;ground:boolean;angle:number};
type Batch={mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;cells:number;start:number;end:number};
const object=new THREE.Object3D(),color=new THREE.Color(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1);
const CAPACITY=256,POOL_SIZE=1280;
const additive=new Set(['fx.marauder.launch.1','fx.marauder.impact.2','fx.marauder.impact.3','fx.muzzle.0','fx.flame.0','fx.flame.1','fx.muzzle.1','fx.flameimpact.0','fx.blast.0','fx.blast.3','fx.blast.6','fx.blast.8','fx.impact.0','fx.bile.4','fx.baneling.0']);
/** Original M3-referenced sprites; authored web emission timing, not a full SC2 particle emulator. */
export class BattleEffects {
 batches=new Map<string,Batch>();loaded=0;errors:string[]=[];lastSerial=0;
 particles:Particle[]=[];pool:Particle[]=[];steps=new Map<number,number>();
 stats={attack:0,hit:0,death:0,movement:0,bile:0,active:0,pending:0,dropped:0};
 readonly projectiles:OriginalProjectiles;
 constructor(private scene:THREE.Scene){this.projectiles=new OriginalProjectiles(scene);}
 reset(){this.pool.push(...this.particles);this.particles.length=0;this.steps.clear();this.lastSerial=0;this.projectiles.active.length=0;this.stats={attack:0,hit:0,death:0,movement:0,bile:0,active:0,pending:0,dropped:0};}
 async load(){await this.projectiles.load();this.errors.push(...this.projectiles.errors);for(const a of ASSETS.values()){if(a.kind!=='effect-texture')continue;const url=assetUrl(a.id);if(!url)continue;try{
   const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=(a as unknown as {sprite?:{columns:number;rows:number;startFrame?:number;endFrame?:number}}).sprite??{columns:1,rows:1};
   const geometry=new THREE.PlaneGeometry(1,1),data=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('spriteFrame',data);
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,forceSinglePass:true,blending:additive.has(a.id)?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.DoubleSide,uniforms:{map:{value:texture},grid:{value:new THREE.Vector2(sprite.columns,sprite.rows)}},
    vertexShader:`attribute vec2 spriteFrame; varying vec2 vUv; varying vec3 vColor; varying float vOpacity; uniform vec2 grid;
     void main(){float f=spriteFrame.x;vUv=(uv+vec2(mod(f,grid.x),grid.y-1.0-floor(f/grid.x)))/grid;vOpacity=spriteFrame.y;vColor=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D map;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
     void main(){vec4 p=texture2D(map,vUv);gl_FragColor=vec4(p.rgb*vColor,p.a*vOpacity);if(gl_FragColor.a<0.01)discard;#include <tonemapping_fragment>
     #include <colorspace_fragment>}`.replace(';#include',';\n#include')});
   const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,color.set(0xffffff));mesh.count=0;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.renderOrder=2;this.scene.add(mesh);this.batches.set(a.id,{mesh,data,count:0,cells:sprite.columns*sprite.rows,start:sprite.startFrame??0,end:sprite.endFrame??sprite.columns*sprite.rows-1});this.loaded++;
  }catch(e){this.errors.push(a.id+': '+String(e));}}
 }
 emit(p:Particle){if(!this.batches.has(p.asset))return;if(this.particles.length>=POOL_SIZE){this.stats.dropped++;return;}const item=this.pool.pop()??{} as Particle;Object.assign(item,p);this.particles.push(item);}
 burst(event:VisualEvent&{y?:number},asset:string,count:number,size:number,tint=0xffffff,life=.5,ground=false){for(let i=0;i<count;i++){const a=(event.serial*2.399+i*2.74),r=(i+1)/(count+1);this.emit({asset,x:event.x,y:event.y??(event.flying?3:.6),z:event.z,vx:Math.sin(a)*r*1.8,vy:ground?0:.5+r,vz:Math.cos(a)*r*1.8,start:event.time,life:life*(.8+r*.4),size,growth:.8,color:tint,ground,angle:a});}}
 event(e:VisualEvent,mount:{x:number;y:number;z:number}|null=null){
  if(e.kind==='hit'){this.stats.hit++;const metal=!e.unitType||['hellion','tank','medivac'].includes(e.unitType);this.burst(e,metal?'fx.impact.0':'fx.blood.0',metal?3:2,metal?.25:.5,metal?0xffcf80:e.unitType==='marine'?0xc94031:0x86a956,.28);}
  else if(e.kind==='death'){this.stats.death++;const metal=['hellion','tank','medivac'].includes(e.unitType??'');this.burst(e,metal?'fx.blast.3':e.unitType==='baneling'?'fx.baneling.1':'fx.blood.0',4,metal?1.6:1.1,0xffffff,.7);if(metal)this.burst(e,'fx.blast.4',3,1.5,0x605c57,1.4);}
  else if(e.kind==='bile-impact'){this.stats.bile++;this.burst(e,'fx.bile.6',5,1.6,0xffffff,.9);this.burst(e,'fx.bile.4',1,3,0xffffff,.5,true);}
  else if(e.kind==='baneling-recover')this.burst(e,'fx.baneling.0',5,.92,0xb4ef6b,.48);
  else if(e.kind==='barrier-start')this.burst(e,'fx.impact.0',3,.47,0x9ce9ff,.27);
  else if(e.kind==='storm-start')this.burst({...e,...e.end,y:e.endY},'fx.muzzle.1',2,.6,0xc8e0ff,.3);
  else if(e.kind==='skill-launch'){const profile=attackPresentation(e);if(profile)this.burst({...e,...(mount??{})},profile.asset,2,profile.size*1.3,profile.tint,.12);}
  else if(e.kind==='skill-impact'){const profile=attackPresentation(e);if(profile)this.burst({...e,...e.end,y:e.endY},profile.impact,e.heroId==='fenix'?4:3,profile.impactSize*(e.heroId==='fenix'?1.5:1),profile.tint,profile.life);}
  else if(e.kind==='skill-dot'){this.burst({...e,...e.end,y:e.endY},e.heroId==='tychus'?'fx.flame.1':'fx.bile.4',1,.32,e.heroId==='tychus'?0xffa35a:0xbad984,.2);}
  else if(e.kind==='pod-land')this.burst(e,'fx.pod.0',5,2.7,0xb6a798,1.1,true);
  else if(e.kind==='pod-destroy')this.burst(e,'fx.blast.3',5,2.2,0xffffff,1);
  else if(e.kind==='egg-expired'||e.kind==='drone-death')this.burst(e,'fx.blood.0',3,1,0x9cbd66,.65);
  else if(e.kind==='attack'){this.stats.attack++;if(!e.heroId&&(e.unitType==='zergling'||e.unitType==='baneling'))return;const muzzle={...e,...(mount??{x:e.x+Math.sin(e.facing)*.6,y:.8,z:e.z+Math.cos(e.facing)*.6})},profile=attackPresentation(e);
   if(profile){this.burst(muzzle,profile.asset,1,profile.size,profile.tint,profile.life);this.burst({...e,...e.end,y:e.endY},profile.impact,1,profile.impactSize,profile.tint,profile.life);}
   if(e.heroId)return;
   if(e.unitType==='hellion'){
    // HellionBeam's own Flame2 flipbook (8x4) and glow layer, emitted from its weapon mount.
    const length=Math.min(6,Math.max(2,Math.hypot(e.end.x-muzzle.x,e.end.z-muzzle.z))),dx=Math.sin(e.facing),dz=Math.cos(e.facing);
    for(let i=0;i<8;i++)this.emit({asset:'fx.flame.0',x:muzzle.x+dx*i*.12,y:muzzle.y,z:muzzle.z+dz*i*.12,vx:dx*8,vy:.04,vz:dz*8,start:e.time+i*.015,life:Math.min(.5,length/8),size:.3+i*.035,growth:1.6,color:0xffffff,ground:false,angle:e.facing});
    this.burst(muzzle,'fx.flame.1',1,.25,0xffffff,.12);
   }
   else if(e.unitType==='marauder'){this.projectiles.emit(e,mount);this.burst(muzzle,'fx.marauder.launch.1',1,.35,0xffffff,.1);this.burst({...e,...e.end,y:e.endY},'fx.marauder.impact.2',1,.6,0xffffff,.16);this.burst({...e,...e.end,y:e.endY},'fx.marauder.impact.0',2,.5,0xffffff,.3);}
   else if(e.unitType==='hydralisk'){this.projectiles.emit(e,mount);}
   else if(e.unitType==='marine'||e.unitType==='tank'){
    if(e.unitType==='marine'){this.burst(muzzle,'fx.muzzle.0',1,.32,0xffffff,.09);this.burst(muzzle,'fx.muzzle.1',1,.2,0xffd491,.06);}
    else {this.burst(muzzle,'fx.blast.6',1,.9,0xffd491,.1);this.burst({...e,...e.end,y:e.endY},'fx.blast.3',3,e.siege?2.2:1.1,0xffffff,.55);}
   }
   else if(!profile)this.burst({...e,...e.end,y:e.endY},e.unitType==='ravager'?'fx.bile.0':'fx.acid.0',2,.6,e.unitType==='ravager'?0xffa76a:0x99d56e,.4);
  }
 }
 render(w:World,camera:THREE.Camera,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent)=>{x:number;y:number;z:number}|null=()=>null){
  for(const e of w.visualEvents){if(e.serial<=this.lastSerial)continue;this.lastSerial=e.serial;if(visible(e)&&w.time-e.time<1.5)this.event(e,muzzle(e));}
  for(const u of w.entities.values()){if(u.hp<=0||u.flying||!visible(u))continue;const last=this.steps.get(u.id)??u.distanceWalked;if(u.distanceWalked-last>.7){this.stats.movement++;this.steps.set(u.id,u.distanceWalked);this.emit({asset:'fx.impact.1',x:u.x,y:(w.terrain?.height(u)??0)+.13,z:u.z,vx:-u.velocity.x*.12,vy:.2,vz:-u.velocity.z*.12,start:w.time,life:.5,size:u.unitType==='tank'?.8:.3,growth:.7,color:0x77726a,ground:false,angle:u.facing});}else if(!this.steps.has(u.id))this.steps.set(u.id,last);}
  for(const id of this.steps.keys())if(!w.entities.has(id))this.steps.delete(id);
  this.projectiles.render(w.time,visible);
  for(const b of this.batches.values())b.count=0;
  let kept=0;for(const p of this.particles){const age=w.time-p.start,t=age/p.life;if(t>=1){this.pool.push(p);continue;}this.particles[kept++]=p;if(t<0||!visible(p))continue;const b=this.batches.get(p.asset)!;if(b.count>=CAPACITY)continue;
   object.position.set(p.x+p.vx*age,p.y+p.vy*age,p.z+p.vz*age);object.scale.setScalar(p.size*(1+t*p.growth));
   if(p.ground)object.rotation.set(-Math.PI/2,0,p.angle);else{object.quaternion.copy(camera.quaternion);rotation.setFromAxisAngle(axis,p.angle);object.quaternion.multiply(rotation);}object.updateMatrix();
   b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(p.color));b.data.setXY(b.count,Math.min(b.end,b.start+Math.floor(t*(b.end-b.start+1))),Math.min(1,(1-t)*2));b.count++;
  }this.particles.length=kept;this.stats.active=kept;
  this.stats.pending=0;
  for(const cast of w.heroCasts){
   if(cast.phase==='dot'||cast.phase==='channel'||(cast.pulseIndex??0)>0)continue;
   const duration=HERO_SKILL_FLIGHT[cast.hero];if(!duration||cast.at<=w.time)continue;
   const start=cast.at-duration;if(w.time<start)continue;
   const hero=HEROES[cast.hero],profile=heroPresentation(cast.hero),projectile=this.batches.get(profile.asset);if(!projectile||projectile.count>=CAPACITY)continue;
   const t=Math.max(0,Math.min(1,(w.time-start)/duration)),from=cast.origin,angle=Math.atan2(cast.point.x-from.x,cast.point.z-from.z);
   const line=['raynor','kerrigan','alarak'].includes(cast.hero),to=line?{x:from.x+Math.sin(angle)*hero.length,z:from.z+Math.cos(angle)*hero.length}:cast.point;
   const x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;if(!visible({x,z}))continue;
   const fromY=hero.flying?AIR_HEIGHT+.6:(w.terrain?.height(from)??0)+1.2,target=w.body(cast.target),toY=target?.flying?AIR_HEIGHT+.6:(w.terrain?.height(to)??0)+1.2;
   object.position.set(x,fromY+(toY-fromY)*t,z);object.quaternion.copy(camera.quaternion);object.scale.setScalar(profile.size*(cast.hero==='yamato_battlecruiser'||cast.hero==='purifier_flagship'?1.2:1));object.updateMatrix();
   const count=projectile.count++;projectile.mesh.setMatrixAt(count,object.matrix);projectile.mesh.setColorAt(count,color.set(profile.tint));projectile.data.setXY(count,projectile.start,1);this.stats.pending++;
  }
  for(const b of this.batches.values()){commitInstances(b.mesh,b.count);uploadActive(b.data,b.count);}
 }
}
