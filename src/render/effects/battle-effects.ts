import {isRevisedHero} from '../../data/terran-heroes';
import {loadHeroEffects,saveHeroEffects,type HeroEffectQuality} from '../settings/quality';
import {CombatSculptures} from './combat-sculptures';
import {HeroBasicEffects} from './hero-basic-effects';
import {OriginalProjectiles} from './original-projectiles';
import {commitInstances,uploadActive} from '../units/instance-updates';
import * as THREE from 'three';
import {ASSETS,assetUrl} from '../../assets/manifest';
import type {World} from '../../simulation/world';
import type {Point,VisualEvent} from '../../simulation/types';
import {attackPresentation,heroSkillPresentation} from '../../data/combat-presentation';
import {HEROES,HERO_SKILL_FLIGHT} from '../../data/heroes';
import {heroFeedbackEvent,castLaunchEvent} from './hero-feedback';
import {AIR_HEIGHT} from '../../data/terrain';

type Priority='decoration'|'trail'|'core';
const priorityRank={decoration:0,trail:1,core:2};
const counters=()=>({decoration:0,trail:0,core:0});
type Particle={opacity?:number;longitudinalY?:boolean;neutralize?:boolean;to?:{x:number;y:number;z:number};priority?:Priority;aspect?:number;asset:string;x:number;y:number;z:number;vx:number;vy:number;vz:number;start:number;life:number;size:number;growth:number;color:number;ground:boolean;angle:number};
type Batch={mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;cells:number;start:number;end:number};
const object=new THREE.Object3D(),color=new THREE.Color(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,0,1);
const along=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4();
const CAPACITY=256,POOL_SIZE=1280;
const additive=new Set(['fx.support.nuke.16','fx.support.nuke.2','fx.marauder.launch.1','fx.marauder.impact.2','fx.marauder.impact.3','fx.muzzle.0','fx.flame.0','fx.flame.1','fx.muzzle.1','fx.flameimpact.0','fx.blast.0','fx.blast.3','fx.blast.6','fx.blast.8','fx.impact.0','fx.bile.4','fx.baneling.0']);
/** Original M3-referenced sprites; authored web emission timing, not a full SC2 particle emulator. */
export class BattleEffects {
 heroQuality:HeroEffectQuality=loadHeroEffects();
 setHeroQuality(value:HeroEffectQuality){this.heroQuality=value;saveHeroEffects(value);}
 batches=new Map<string,Batch>();loaded=0;errors:string[]=[];lastSerial=0;
 particles:Particle[]=[];pool:Particle[]=[];steps=new Map<number,number>();
 stats={attack:0,hit:0,death:0,movement:0,bile:0,active:0,pending:0,dropped:0,droppedByClass:counters(),culledByClass:counters(),projectileCulled:0};
 readonly projectiles:OriginalProjectiles;readonly sculptures:CombatSculptures;
 readonly heroBasic:HeroBasicEffects;
 constructor(private scene:THREE.Scene){this.projectiles=new OriginalProjectiles(scene);this.sculptures=new CombatSculptures(scene);this.heroBasic=new HeroBasicEffects(scene,this);}
 reset(){this.heroBasic.reset();this.sculptures.reset();this.pool.push(...this.particles);this.particles.length=0;this.steps.clear();this.lastSerial=0;this.stats={attack:0,hit:0,death:0,movement:0,bile:0,active:0,pending:0,dropped:0,droppedByClass:counters(),culledByClass:counters(),projectileCulled:0};}
 async load(){await this.projectiles.load();this.errors.push(...this.projectiles.errors);for(const a of ASSETS.values()){if(a.kind!=='effect-texture')continue;const url=assetUrl(a.id);if(!url)continue;try{
   const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=(a as unknown as {sprite?:{columns:number;rows:number;startFrame?:number;endFrame?:number}}).sprite??{columns:1,rows:1};
   const geometry=new THREE.PlaneGeometry(1,1),data=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*3),3).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('spriteFrame',data);
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,forceSinglePass:true,blending:additive.has(a.id)||a.id.startsWith('fx.hero-basic.')&&!a.id.includes('smoke')?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.DoubleSide,uniforms:{map:{value:texture},grid:{value:new THREE.Vector2(sprite.columns,sprite.rows)}},
    vertexShader:`attribute vec3 spriteFrame; varying vec2 vUv; varying vec3 vColor; varying float vOpacity; varying float vNeutralize; uniform vec2 grid;
     void main(){float f=spriteFrame.x;vUv=(uv+vec2(mod(f,grid.x),grid.y-1.0-floor(f/grid.x)))/grid;vOpacity=spriteFrame.y;vNeutralize=spriteFrame.z;vColor=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D map;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vNeutralize;
     void main(){vec4 p=texture2D(map,vUv);p.rgb=mix(p.rgb,vec3(max(p.r,max(p.g,p.b))),vNeutralize);gl_FragColor=vec4(p.rgb*vColor,p.a*vOpacity);if(gl_FragColor.a<0.01)discard;#include <tonemapping_fragment>
     #include <colorspace_fragment>}`.replace(';#include',';\n#include')});
   const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,color.set(0xffffff));mesh.count=0;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.renderOrder=2;this.scene.add(mesh);this.batches.set(a.id,{mesh,data,count:0,cells:sprite.columns*sprite.rows,start:sprite.startFrame??0,end:sprite.endFrame??sprite.columns*sprite.rows-1});this.loaded++;
  }catch(e){this.errors.push(a.id+': '+String(e));}}
 }
 emit(p:Particle){if(!this.batches.has(p.asset))return;const priority=p.priority??'decoration';if(this.particles.length>=POOL_SIZE){const index=this.particles.findIndex(item=>priorityRank[item.priority??'decoration']<priorityRank[priority]);this.stats.dropped++;if(index<0){this.stats.droppedByClass[priority]++;return;}const [discarded]=this.particles.splice(index,1);this.stats.droppedByClass[discarded.priority??'decoration']++;this.pool.push(discarded);}const item=this.pool.pop()??{} as Particle;Object.assign(item,{aspect:1,to:undefined,neutralize:false,opacity:1,longitudinalY:false},p,{priority});this.particles.push(item);}
 burst(event:VisualEvent&{y?:number},asset:string,count:number,size:number,tint=0xffffff,life=.5,ground=false,priority:Priority='decoration',neutralize=false){for(let i=0;i<count;i++){const a=(event.serial*2.399+i*2.74),r=(i+1)/(count+1),core=priority==='core';this.emit({asset,x:event.x,y:event.y??(event.flying?AIR_HEIGHT+.6:.6),z:event.z,vx:core?0:Math.sin(a)*r*1.8,vy:core?0:ground?0:.5+r,vz:core?0:Math.cos(a)*r*1.8,start:event.time,life:life*(core?1:.8+r*.4),size,growth:core?.2:.8,color:tint,ground,angle:core?event.facing:a,priority,neutralize});}}
 trace(e:VisualEvent,from:{x:number;y:number;z:number},asset:string,tint:number,width:number){
  this.emit({asset,...from,to:{...e.end,y:e.endY},vx:0,vy:0,vz:0,start:e.time,life:.085,size:width,growth:0,color:tint,ground:false,angle:0,priority:'core'});
 }
 bulletParticles(e:VisualEvent,from:{x:number;y:number;z:number},tint:number,nova=false){
  const count=nova?7:4;
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,dx=e.end.x-from.x,dy=e.endY-from.y,dz=e.end.z-from.z;
   this.emit({asset:'fx.muzzle.1',x:from.x+dx*t,y:from.y+dy*t,z:from.z+dz*t,vx:0,vy:0,vz:0,start:e.time,life:nova?.09:.06,size:nova?.1:.065,growth:0,color:tint,ground:false,angle:e.facing,priority:'trail'});
  }
 }
 event(e:VisualEvent,mount:{x:number;y:number;z:number}|null=null,leftMount:{x:number;y:number;z:number}|null=null){
  this.heroBasic.event(e,mount);
  if(e.kind==='attack'&&e.heroId==='yamato_battlecruiser'&&leftMount)this.heroBasic.event(e,leftMount);
  this.sculptures.heroDetail=this.heroQuality;this.heroLayers(e,mount);
  this.sculptures.event(e,mount,leftMount);
  if(isRevisedHero(e.heroId)&&['attack','projectile-impact','weapon-area'].includes(e.kind)){if(e.kind==='attack')this.stats.attack++;return;}
  if(e.kind==='projectile-impact'){const p=attackPresentation(e);if(p){this.burst({...e,...e.end,y:e.endY},p.impact,1,p.impactSize,p.tint,p.life,false,'core');}return;}
  if(e.kind==='support-flight'){if(e.race==='protoss'){this.trace(e,{x:e.x,y:e.y+1,z:e.z},'fx.muzzle.1',0x8beeff,.26);this.burst({...e,...e.end},'fx.impact.0',2,.45,0x9eeaff,.2,false,'core');}else this.bulletParticles(e,{x:e.x,y:e.y+1,z:e.z},0xffc373);return;}
  if(e.kind==='support-pulse'){if(e.race==='zerg'){this.burst(e,'fx.bile.4',3,.6,0xb4ed67,.45);this.burst(e,'fx.baneling.0',1,.7,0x88b956,.35,false,'core');}else if(e.race==='protoss'){for(let i=0;i<3;i++)this.burst({...e,x:e.x+Math.sin(i*2.1)*.5,z:e.z+Math.cos(i*2.1)*.5},'fx.impact.0',1,.25,0x96ddff,.5,false,'core');}else this.burst(e,'fx.blast.4',2,.35,0xffc271,.3);return;}
  if(e.kind==='support-impact'||e.kind==='strategic-impact'){if(e.race==='protoss'){for(let i=0;i<6;i++){const a=i*Math.PI/3;this.emit({asset:'fx.muzzle.1',x:e.x,y:e.y,z:e.z,vx:Math.sin(a)*4,vy:1.2,vz:Math.cos(a)*4,start:e.time,life:.35,size:.25,growth:-.4,color:0x8bddff,ground:false,angle:a,aspect:3,priority:'core'});}}else if(e.race==='zerg'){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;this.emit({asset:'fx.bile.0',x:e.x,y:e.y,z:e.z,vx:Math.sin(a)*3,vy:2,vz:Math.cos(a)*3,start:e.time,life:.5,size:.35,growth:-.2,color:0xb4ed67,ground:false,angle:a,priority:'trail'});}}const big=e.kind==='strategic-impact',zerg=e.race==='zerg',protoss=e.race==='protoss',tint=zerg?0xb4ed67:protoss?0x86d9ff:0xffc271;this.burst(e,zerg?'fx.bile.4':protoss?'fx.impact.0':big?'fx.support.nuke.1':'fx.blast.3',1,big?7:2,tint,big?1.4:.5,false,'core');this.burst(e,zerg?'fx.baneling.0':protoss?'fx.muzzle.1':big?'fx.support.nuke.16':'fx.blast.6',3,big?2.5:.8,tint,.5);if(big&&!zerg&&!protoss)this.burst(e,'fx.support.nuke.2',1,12,0xffffff,.8,true,'core');}
  else if(e.kind==='shield-hit'||e.kind==='shield-break')this.burst(e,'fx.impact.0',e.kind==='shield-break'?5:2,e.kind==='shield-break'?.5:.28,0x69baff,.24);
  else if(e.kind==='queen-inject'){this.burst(e,'fx.impact.0',2,.35,0xaedb54,.5);this.burst({...e,x:e.end.x,z:e.end.z},'fx.impact.0',3,.7,0xaedb54,.65);}
  else if(e.kind==='hit'){this.stats.hit++;const metal=!e.unitType||['hellion','tank','medivac','thor','viking','banshee','science_vessel','stalker','sentry','immortal','colossus','phoenix','void_ray','carrier'].includes(e.unitType);this.burst(e,metal?'fx.impact.0':'fx.blood.0',metal?3:2,metal?.25:.5,metal?0xffcf80:e.unitType==='marine'?0xc94031:0x86a956,.28);}
  else if(e.kind==='death'){this.stats.death++;const metal=['hellion','tank','medivac','thor','viking','banshee','science_vessel','stalker','sentry','immortal','colossus','phoenix','void_ray','carrier'].includes(e.unitType??'');this.burst(e,metal?'fx.blast.3':e.unitType==='baneling'?'fx.baneling.1':'fx.blood.0',4,metal?1.6:1.1,0xffffff,.7);if(metal)this.burst(e,'fx.blast.4',3,1.5,0x605c57,1.4);}
  else if(e.kind==='bile-impact'){this.stats.bile++;this.burst(e,'fx.bile.6',5,1.6,0xffffff,.9);this.burst(e,'fx.bile.4',1,3,0xffffff,.5,true);}
  else if(e.kind==='baneling-recover')this.burst(e,'fx.baneling.0',5,.92,0xb4ef6b,.48);
  else if(e.kind==='barrier-start')this.burst(e,'fx.impact.0',3,.47,0x9ce9ff,.27);
  else if(e.kind==='storm-start')this.burst({...e,...e.end,y:e.endY},'fx.muzzle.1',2,.6,0xc8e0ff,.3);
  else if(e.kind==='weapon-area'&&isRevisedHero(e.heroId)){this.burst({...e,...e.end,y:e.endY},'fx.blast.6',1,e.heroId==='tosh'?.65:.35,e.heroId==='tosh'?0xc695ff:0xffd18e,.15,false,'core');}
  else if(e.kind==='skill-line'&&e.heroId==='nova'){this.trace(e,mount??{x:e.x,y:e.y+.5,z:e.z},'fx.muzzle.1',0x9ffff0,.28);}
  else if(e.kind==='skill-launch'){const profile=e.heroId?heroSkillPresentation(e.heroId):attackPresentation(e);if(profile)this.burst({...e,...(mount??{})},profile.asset,1,profile.size,profile.tint,.12,false,'core',profile.neutralize);}
  else if(e.kind==='skill-impact'){const profile=e.heroId?heroSkillPresentation(e.heroId):attackPresentation(e);if(profile){const impact={...e,...e.end,y:e.endY};this.burst(impact,profile.impact,1,profile.impactSize,profile.tint,Math.max(.18,profile.life),false,'core');this.burst(impact,profile.impact,2,profile.impactSize*.45,profile.tint,profile.life);}}
  else if(e.kind==='skill-dot'){this.burst({...e,...e.end,y:e.endY},e.heroId==='tychus'?'fx.flame.1':'fx.bile.4',1,.32,e.heroId==='tychus'?0xffa35a:0xbad984,.2);}
  else if(e.kind==='pod-land')this.burst(e,'fx.pod.0',5,2.7,0xb6a798,1.1,true);
  else if(e.kind==='pod-destroy')this.burst(e,'fx.blast.3',5,2.2,0xffffff,1);
  else if(e.kind==='egg-expired'||e.kind==='drone-death')this.burst(e,'fx.blood.0',3,1,0x9cbd66,.65);
  else if(e.kind==='attack'){this.stats.attack++;if(!e.heroId&&(e.unitType==='zergling'||e.unitType==='baneling'))return;const muzzle={...e,...(mount??{x:e.x+Math.sin(e.facing)*.6,y:.8,z:e.z+Math.cos(e.facing)*.6})},profile=attackPresentation(e);
   if(profile){this.burst(muzzle,profile.asset,1,profile.size,profile.tint,profile.life,false,'core');if(!e.projectileSpeed)this.burst({...e,...e.end,y:e.endY},profile.impact,1,profile.impactSize,profile.tint,profile.life,false,'core');if(e.heroId&&HEROES[e.heroId].range<=2)this.emit({asset:profile.asset,x:e.end.x,y:e.endY,z:e.end.z,vx:0,vy:0,vz:0,start:e.time,life:.12,size:profile.impactSize*.65,growth:.3,color:profile.tint,ground:false,angle:-e.facing,aspect:2.4,priority:'trail'});}
   if(e.heroId==='nova'){this.bulletParticles(e,muzzle,0x72ffd4,true);return;}
   if(e.heroId)return;
   if(e.projectileSpeed){if(e.unitType==='marauder')this.burst(muzzle,'fx.marauder.launch.1',1,.35,0xffffff,.1,false,'core');return;}
   if(e.unitType==='reaper'){
    this.bulletParticles(e,muzzle,0xffb859);
    if(leftMount){this.burst({...e,...leftMount},'fx.muzzle.0',1,.32,0xffbd62,.1,false,'core');this.bulletParticles(e,leftMount,0xffb859);}
    return;
   }
   if(e.unitType==='hellion'){
    // HellionBeam's own Flame2 flipbook (8x4) and glow layer, emitted from its weapon mount.
    const length=Math.min(6,Math.max(2,Math.hypot(e.end.x-muzzle.x,e.end.z-muzzle.z))),dx=Math.sin(e.facing),dz=Math.cos(e.facing);
    for(let i=0;i<8;i++)this.emit({asset:'fx.flame.0',x:muzzle.x+dx*i*.12,y:muzzle.y,z:muzzle.z+dz*i*.12,vx:dx*8,vy:.04,vz:dz*8,start:e.time+i*.015,life:Math.min(.5,length/8),size:.3+i*.035,growth:1.6,color:0xffffff,ground:false,angle:e.facing});
    this.burst(muzzle,'fx.flame.1',1,.25,0xffffff,.12);
   }


   else if(e.unitType==='marine'||e.unitType==='tank'){
    if(e.unitType==='marine'){this.burst(muzzle,'fx.muzzle.0',1,.32,0xffffff,.09);this.burst(muzzle,'fx.muzzle.1',1,.2,0xffd491,.06);}
    else {this.burst(muzzle,'fx.blast.6',1,.9,0xffd491,.1);this.burst({...e,...e.end,y:e.endY},'fx.blast.3',3,e.siege?2.2:1.1,0xffffff,.55);}
   }
   else if(!profile)this.burst({...e,...e.end,y:e.endY},e.unitType==='ravager'?'fx.bile.0':'fx.acid.0',2,.6,e.unitType==='ravager'?0xffa76a:0x99d56e,.4);
  }
 }
 private heroLayers(e:VisualEvent,mount:{x:number;y:number;z:number}|null){
  if(!isRevisedHero(e.heroId))return;
  if(['attack','projectile-impact','weapon-area'].includes(e.kind))return;
  const rank=Math.max(1,Math.min(5,e.rank??1)),detail=this.heroQuality==='full'?rank:this.heroQuality==='balanced'?Math.min(rank,3):0,profile=e.heroId?heroSkillPresentation(e.heroId):null;
  if(!profile)return;const from=mount??{x:e.x,y:e.y,z:e.z},impact={...e,...e.end,y:e.endY};
  if(e.kind==='attack'){
   // Core, colored muzzle sheath, real instant trace, and local contact. Flights get contact on arrival.
   this.burst({...e,...from},'fx.muzzle.1',1,.18,0xffffff,.055,false,'core');
   if(!e.projectileSpeed)this.trace(e,from,'fx.muzzle.1',profile.tint,.035);
   if(e.heroId==='nova'&&e.heroOpening)this.trace(e,from,'fx.impact.0',0xdaf6ff,.09);
   if(detail>0)this.burst({...e,...from},'fx.impact.0',detail,.07,profile.tint,.12,false,'decoration');
  }
  if(['skill-impact','projectile-impact','weapon-area'].includes(e.kind)){
   const skill=e.kind==='skill-impact',size=skill?e.heroId==='yamato_battlecruiser'?2:.7:.18;
   this.burst(impact,'fx.muzzle.1',1,size*.45,0xffffff,skill?.24:.075,false,'core');
   this.burst(impact,'fx.impact.0',1,size,profile.tint,skill?.35:.12,true,'trail');
   if(detail>0)this.burst(impact,'fx.impact.1',detail,size*.24,profile.tint,skill?.45:.18,false,'decoration');
   if(skill&&detail>=3)this.burst(impact,'fx.blast.4',detail-2,size*.75,0x80756e,.65,false,'decoration');
   if(skill&&detail>=4)this.burst(impact,'fx.blast.6',1,size*1.3,profile.tint,.28,true,'decoration');
   if(skill&&detail===5)this.burst(impact,'fx.impact.0',5,size*.12,0xffffff,.5,false,'decoration');
   if(e.heroId==='swann'&&skill)this.trace(e,from,'fx.muzzle.1',0x78ffaa,.065);
  }
 }
 render(w:World,camera:THREE.Camera,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>{x:number;y:number;z:number}|null=()=>null){
  for(const e of w.visualEvents){if(e.serial<=this.lastSerial)continue;this.lastSerial=e.serial;const paired=e.unitType==='reaper'||e.heroId==='yamato_battlecruiser';if((visible(e)||visible(e.end))&&w.time-e.time<1.5)this.event(heroFeedbackEvent(e,w.entities),muzzle(e,paired&&e.kind==='attack'?'Right':undefined),paired?muzzle(e,'Left'):null);}
  for(const u of w.entities.values()){if(u.hp<=0||u.flying||!visible(u))continue;const last=this.steps.get(u.id)??u.distanceWalked;if(u.distanceWalked-last>.7){this.stats.movement++;this.steps.set(u.id,u.distanceWalked);this.emit({asset:'fx.impact.1',x:u.x,y:(w.terrain?.height(u)??0)+.13,z:u.z,vx:-u.velocity.x*.12,vy:.2,vz:-u.velocity.z*.12,start:w.time,life:.5,size:u.unitType==='tank'?.8:.3,growth:.7,color:0x77726a,ground:false,angle:u.facing});}else if(!this.steps.has(u.id))this.steps.set(u.id,last);}
  for(const id of this.steps.keys())if(!w.entities.has(id))this.steps.delete(id);
  this.sculptures.heroDetail=this.heroQuality;this.heroBasic.render(w,visible,this.sculptures.mounts);this.projectiles.renderFlights(w,visible,this.sculptures.mounts,this.heroBasic.flights);this.sculptures.render(w,visible,muzzle);
  for(const b of this.batches.values())b.count=0;this.stats.culledByClass=counters();this.stats.projectileCulled=0;
  this.stats.pending=0;
  const support=w.expedition.support,tint=w.expedition.race==='zerg'?0xb4ed67:w.expedition.race==='protoss'?0x86d9ff:0xffc271;
  const glyph=(point:Point,y:number,size:number,asset:string,ground=false,aspect=1)=>{const b=this.batches.get(asset);if(!b||b.count>=CAPACITY||!visible(point))return;object.position.set(point.x,y,point.z);object.scale.set(size*aspect,size,1);if(ground)object.rotation.set(-Math.PI/2,0,w.time*.3);else object.quaternion.copy(camera.quaternion);object.updateMatrix();b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(tint));b.data.setXYZ(b.count++,Math.min(b.end,b.start+Math.floor((b.end-b.start)*.35)),1,0);};
  if(w.expedition.race==='protoss')for(const mine of support.mines){const y=(w.terrain?.height(mine.point)??0)+.45;glyph(mine.point,y,.42,'fx.impact.0');for(let i=0;i<3;i++){const a=w.time+i*Math.PI*2/3;glyph({x:mine.point.x+Math.sin(a)*.35,z:mine.point.z+Math.cos(a)*.35},y,.13,'fx.muzzle.1');}}
  for(const impact of support.impacts){const left=Math.max(0,impact.at-w.time),big=impact.kind==='strategic',y=w.terrain?.height(impact.point)??0;
   if(w.expedition.race==='protoss'){const charge=1-left/(big?3:.75);for(let i=0;i<7;i++)glyph(impact.point,y+.5+i*.9,.1+charge*(big?.32:.16),'fx.muzzle.1');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;glyph({x:impact.point.x+Math.sin(a)*left,z:impact.point.z+Math.cos(a)*left},y+.1,.35,'fx.impact.0',true);}}
   else if(w.expedition.race==='zerg'){if(!big)glyph(impact.point,y+left*10,.75+.08*Math.sin(w.time*17),'fx.bile.0');for(let i=1;i<=3;i++)glyph(impact.point,y+left*(big?6:10)+i*.35,(big?.3:.14)/i,'fx.bile.4');}
   else {glyph(impact.point,y+left*(big?6:10),big?1.2:.55,'fx.blast.6',false,.45);for(let i=1;i<=4;i++)glyph(impact.point,y+left*(big?6:10)+i*.3,(big?.6:.2)*(1-i*.16),'fx.blast.4');}
  }

  const unique=support.unique;
  if(unique.prism){const beam=unique.prism,start=beam.next-(10-beam.remaining)*.2-.2;
   const prism={x:beam.origin.x+beam.direction.x*.5,z:beam.origin.z+beam.direction.z*.5},y=(w.terrain?.height(prism)??0)+3;
   glyph(prism,y,.8,'fx.impact.0');
   if(w.time>=start){const b=this.batches.get('fx.muzzle.1'),end={x:beam.origin.x+beam.direction.x*14,z:beam.origin.z+beam.direction.z*14};
    if(b&&b.count<CAPACITY&&(visible(beam.origin)||visible(end))){object.position.set((prism.x+end.x)/2,y*.5+((w.terrain?.height(end)??0)+.8)*.5,(prism.z+end.z)/2);along.set(end.x-prism.x,(w.terrain?.height(end)??0)+.8-y,end.z-prism.z);const length=along.length();along.normalize();normal.copy(camera.position).sub(object.position).normalize();across.crossVectors(normal,along).normalize();normal.crossVectors(along,across).normalize();basis.makeBasis(along,across,normal);object.quaternion.setFromRotationMatrix(basis);object.scale.set(length,.24,1);object.updateMatrix();b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(0x8eeaff));b.data.setXYZ(b.count++,Math.min(b.end,b.start+Math.floor((b.end-b.start)*.35)),1,1);}
   }
  }
  for(const packet of unique.packets){if(packet.start>w.time||packet.at<=w.time)continue;const t=(w.time-packet.start)/Math.max(.001,packet.at-packet.start),p={x:packet.from.x+(packet.point.x-packet.from.x)*t,z:packet.from.z+(packet.point.z-packet.from.z)*t};if(packet.kind==='echo'){glyph(packet.point,(w.terrain?.height(packet.point)??0)+.6,.5,'fx.impact.0');continue;}glyph(p,(w.terrain?.height(p)??0)+1+(packet.kind==='missile'?Math.sin(t*Math.PI)*3:0),packet.kind==='missile'?.4:.12,packet.kind==='missile'?'fx.blast.6':'fx.muzzle.1');if(packet.kind==='missile')for(let i=1;i<=4;i++){const q=Math.max(0,t-i*.035),tail={x:packet.from.x+(packet.point.x-packet.from.x)*q,z:packet.from.z+(packet.point.z-packet.from.z)*q};glyph(tail,(w.terrain?.height(tail)??0)+1+Math.sin(q*Math.PI)*3,.18-i*.025,'fx.blast.4');}}
  for(const orb of unique.orbs)glyph(orb.point,(w.terrain?.height(orb.point)??0)+.6,.38,'fx.bile.0');
  for(const id of Object.keys(unique.parasites)){const u=w.entities.get(+id);if(u?.hp)glyph(u,(w.terrain?.height(u)??0)+(u.flying?5.6:.7),.3,'fx.baneling.0');}
  for(const [id,r] of Object.entries(unique.reserves)){const u=w.entities.get(+id);if(!u?.hp||!r.amount)continue;const n=Math.min(5,Math.ceil(r.amount/Math.max(1,(u.maxShield??1)*.06)));for(let i=0;i<n;i++){const a=i*Math.PI*2/n,p={x:u.x+Math.sin(a)*(u.unitRadius+.2),z:u.z+Math.cos(a)*(u.unitRadius+.2)};glyph(p,(w.terrain?.height(u)??0)+(u.flying?5.6:.5),.16,'fx.impact.0');}}
  let kept=0;for(const p of this.particles){const age=w.time-p.start,t=age/p.life;if(t>=1){this.pool.push(p);continue;}this.particles[kept++]=p;}this.particles.length=kept;this.stats.active=kept;
  for(const priority of ['core','trail','decoration'] as const)for(const p of this.particles){if((p.priority??'decoration')!==priority)continue;const age=w.time-p.start,t=age/p.life;if(t<0||!visible(p))continue;const b=this.batches.get(p.asset)!;if(b.count>=CAPACITY){this.stats.culledByClass[priority]++;continue;}
   object.position.set(p.x+p.vx*age,p.y+p.vy*age,p.z+p.vz*age);const size=p.size*(1+t*p.growth);object.scale.set(size*(p.aspect??1),size,size);
   if(p.to){along.set(p.to.x-p.x,p.to.y-p.y,p.to.z-p.z);const length=along.length();if(length<.001)continue;along.divideScalar(length);object.position.set((p.x+p.to.x)/2,(p.y+p.to.y)/2,(p.z+p.to.z)/2);normal.copy(camera.position).sub(object.position).normalize();across.crossVectors(normal,along).normalize();normal.crossVectors(along,across).normalize();if(p.longitudinalY){basis.makeBasis(across,along,normal);object.scale.set(size,length,1);}else{basis.makeBasis(along,across,normal);object.scale.set(length,size,1);}object.quaternion.setFromRotationMatrix(basis);}
   else if(p.ground)object.rotation.set(-Math.PI/2,0,p.angle);else{object.quaternion.copy(camera.quaternion);rotation.setFromAxisAngle(axis,p.angle);object.quaternion.multiply(rotation);}object.updateMatrix();
   b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(p.color));b.data.setXYZ(b.count,Math.min(b.end,b.start+Math.floor(t*(b.end-b.start+1))),Math.min(1,(1-t)*2)*(p.opacity??1),p.neutralize?1:0);b.count++;
  }
  for(const b of this.batches.values()){commitInstances(b.mesh,b.count);uploadActive(b.data,b.count);}
 }
}
