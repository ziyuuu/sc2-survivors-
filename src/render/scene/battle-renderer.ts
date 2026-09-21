import * as THREE from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {assetUrl,ASSETS,icon} from '../../assets/manifest';
import {SC2_UNITS,TERRAN,ZERG,type UnitType} from '../../data/sc2-units';
import {AIR_HEIGHT} from '../../data/terrain';
import {TUNING} from '../../data/game';
import {World} from '../../simulation/world';
import type {Entity,Body,Point} from '../../simulation/types';
import {mapAnimations} from '../loaders/animations';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import {pickBattle} from '../input/battle-picking';
import {PodView} from '../units/pod-view';
import {createTerrain} from '../terrain/char-terrain';
import {AnimatedBatch} from '../units/animated-batch';
import {BattleEffects} from '../effects/battle-effects';
import {loadQuality,saveQuality,renderPixelRatio,type RenderQuality} from '../settings/quality';

type UnitBatch={gltf:GLTF;meshes:THREE.InstancedMesh[];data:THREE.InstancedBufferAttribute[];scale:number;center:THREE.Vector3;minY:number;clips:ReturnType<typeof mapAnimations>};
const heights:Record<UnitType,number>={marine:1.35,hellion:.9,tank:1.25,medivac:1.05,zergling:.68,roach:1,baneling:.7,ravager:1.45};
const _obj=new THREE.Object3D(),_color=new THREE.Color(),_vec=new THREE.Vector3();
const UNIT_CAPACITY=1024; // Rescue guardians may temporarily exceed the ambient-wave cap.
export class BattleRenderer {
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.OrthographicCamera();
 batches=new Map<UnitType,UnitBatch>();gpu=new Map<string,AnimatedBatch>();
 private animationStates=new Map<number,{action:string;since:number;modeDuration:number}>();
 private corpses=new Map<number,{type:UnitType;x:number;z:number;y:number;facing:number;at:number}>();
 private hitTimes=new Map<number,number>();private lastVisual=0;
 readonly fx:BattleEffects;quality:RenderQuality=loadQuality();
 loadedModels=0;modelErrors:string[]=[];loadedTextures=0;fps=0;frameMs=0;frameTimes:number[]=[];showGrid=false;showColliders=false;
 private shadows:THREE.InstancedMesh;private health:THREE.InstancedMesh;private healthBack:THREE.InstancedMesh;private pickups:THREE.InstancedMesh;private rings:THREE.InstancedMesh;
 private lines:THREE.LineSegments;private linePositions=new Float32Array(6000);private lineColors=new Float32Array(6000);
 private anchor:THREE.Group;private podViews=new Map<number,PodView>();private podTemplate:GLTF|null=null;private terrainUpdate=()=>{};private hiveTemplate:THREE.Object3D|null=null;private hiveView:THREE.Object3D|null=null;
 private podLabels=new Map<number,HTMLElement>();private labelLayer=document.createElement('div');
 private grid=new THREE.GridHelper(104,26,0x3aa8b4,0x245460);private tickTime=0;private frames=0;private cameraTarget=new THREE.Vector3();
 constructor(readonly canvas:HTMLCanvasElement,readonly world:World){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{const error='Shader: '+gl.getProgramInfoLog(program)+' / '+gl.getShaderInfoLog(vertex)+' / '+gl.getShaderInfoLog(fragment);this.modelErrors.push(error);console.error(error);};
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.renderer.setClearColor(0x171d20);this.scene.fog=new THREE.FogExp2(0x202326,.009);
  this.fx=new BattleEffects(this.scene);
  this.scene.add(new THREE.HemisphereLight(0xc1d9e3,0x473320,1.4));const light=new THREE.DirectionalLight(0xffe0bd,2.4);light.position.set(-15,25,10);this.scene.add(light);
  const makeBatch=(geometry:THREE.BufferGeometry,material:THREE.Material,count:number)=>{const m=new THREE.InstancedMesh(geometry,material,count);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(m);return m;};
  const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));pixels[(y*32+x)*4+3]=Math.round(a*a*135);}
  const shadowMap=new THREE.DataTexture(pixels,32,32);shadowMap.needsUpdate=true;const disc=new THREE.PlaneGeometry(2,2);disc.rotateX(-Math.PI/2);this.shadows=makeBatch(disc,new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),1400);
  const bar=new THREE.PlaneGeometry(1,.11);bar.rotateX(-Math.PI/2);
  this.health=makeBatch(bar,new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}),400);this.health.renderOrder=5;
  this.healthBack=makeBatch(bar.clone(),new THREE.MeshBasicMaterial({color:0x091610}),400);this.healthBack.renderOrder=4;
  this.pickups=makeBatch(new THREE.OctahedronGeometry(.17),new THREE.MeshBasicMaterial({color:0xffffff}),1000);
  const ring=new THREE.RingGeometry(.88,1,32);ring.rotateX(-Math.PI/2);this.rings=makeBatch(ring,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}),1400);
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(this.linePositions,3).setUsage(THREE.DynamicDrawUsage));lineGeo.setAttribute('color',new THREE.BufferAttribute(this.lineColors,3).setUsage(THREE.DynamicDrawUsage));this.lines=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9}));this.lines.frustumCulled=false;this.scene.add(this.lines);
  this.anchor=new THREE.Group();const cursor=new THREE.Mesh(new THREE.RingGeometry(.48,.56,4),new THREE.MeshBasicMaterial({color:0x67d9fb,transparent:true,opacity:.65}));cursor.rotation.x=-Math.PI/2;cursor.rotation.z=Math.PI/4;this.anchor.add(cursor);this.scene.add(this.anchor);
  this.grid.position.y=.08;this.grid.visible=false;this.scene.add(this.grid);
  this.labelLayer.id='pod-labels';document.body.append(this.labelLayer);
  this.resize();window.addEventListener('resize',()=>this.resize());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();world.paused=true;world.announce('图形上下文丢失，请重新载入。');});
 }
 setQuality(quality:RenderQuality){this.quality=quality;saveQuality(quality);this.resize();this.filterTextures(this.scene);}
 private filterTextures(root:THREE.Object3D){const limit=Math.min(this.renderer.capabilities.getMaxAnisotropy(),this.quality==='native'?8:this.quality==='balanced'?4:1),seen=new Set<THREE.Texture>();root.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const key of ['map','normalMap','specularColorMap','emissiveMap']){const t=(m as unknown as Record<string,THREE.Texture>)[key];if(t&&!seen.has(t)){seen.add(t);t.anisotropy=limit;t.needsUpdate=true;}}});}
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight,gl=this.renderer.getContext();this.renderer.setPixelRatio(renderPixelRatio(this.quality,window.devicePixelRatio||1,w,h,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)));this.renderer.setSize(w,h,false);const height=w<h?30:25;this.camera.left=-height*w/h/2;this.camera.right=height*w/h/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.near=.1;this.camera.far=180;this.camera.updateProjectionMatrix();}
 async load(progress:(label:string)=>void){await MeshoptSimplifier.ready;const loader=new GLTFLoader();
  for(const type of [...TERRAN,...ZERG]){progress(`载入 ${SC2_UNITS[type].name}`);try{const url=assetUrl('model.'+type);if(!url)throw Error('missing asset');const gltf=await restoreSc2Materials(await loader.loadAsync(url));this.prepareUnit(type,gltf);this.loadedModels++;}catch(e){this.modelErrors.push(type+': '+String(e));}}
  for(const key of [...TERRAN,...ZERG].map(t=>t+'.death').concat(['tank.siege','tank.morph'])){const url=assetUrl('model.'+key);if(!url)continue;progress(`载入原始动画 ${key}`);try{const type=key.split('.')[0] as UnitType,g=await restoreSc2Materials(await loader.loadAsync(url)),base=this.gpu.get(type);this.gpu.set(key,new AnimatedBatch(g,this.scene,heights[type],base?.normalization));}catch(e){this.modelErrors.push(key+': '+String(e));}}
  await this.fx.load();
  this.terrainUpdate=await createTerrain(this.scene,this.world);
  for(const [key,height] of [['scv',1.35],['drone',.7],['egg',1.3]] as const){const url=assetUrl('model.'+key);if(!url){this.modelErrors.push(key+': missing model');continue;}try{this.gpu.set(key,new AnimatedBatch(await restoreSc2Materials(await loader.loadAsync(url)),this.scene,height));}catch(e){this.modelErrors.push(key+': '+String(e));}}
  const hiveUrl=assetUrl('model.hive');if(hiveUrl){try{const g=await loader.loadAsync(hiveUrl);const box=new THREE.Box3().setFromObject(g.scene),size=box.getSize(new THREE.Vector3());g.scene.scale.setScalar(6/Math.max(size.x,size.z));this.hiveTemplate=g.scene;}catch(e){this.modelErrors.push('hive: '+String(e));}}
  const podUrl=assetUrl('model.droppod');if(podUrl){try{const g=await restoreSc2Materials(await loader.loadAsync(podUrl));this.podTemplate=g;}catch(e){this.modelErrors.push('droppod: '+String(e));}}
  this.filterTextures(this.scene);const visible:THREE.Object3D[]=[];for(const b of this.gpu.values())for(const m of b.meshes){if(!m.visible){visible.push(m);m.visible=true;}}this.renderer.compile(this.scene,this.camera);for(const m of visible)m.visible=false;
 }
 private prepareUnit(type:UnitType,gltf:GLTF){gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=heights[type]/Math.max(.001,size.y);
  const batch:UnitBatch={gltf,meshes:[],data:[],scale,center,minY:box.min.y,clips:mapAnimations(gltf.animations)};
  if(gltf.animations.length){this.gpu.set(type,new AnimatedBatch(gltf,this.scene,heights[type]));gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)this.loadedTextures++;});this.batches.set(type,batch);return;}
  if(!gltf.animations.length)gltf.scene.traverse(node=>{if(!(node instanceof THREE.Mesh))return;
   // Bake the original static mesh into local model coordinates; preserve original maps and topology.
   const geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);
   const anim=new THREE.InstancedBufferAttribute(new Float32Array(UNIT_CAPACITY*4),4);anim.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitMotion',anim);
   const materials=(Array.isArray(node.material)?node.material:[node.material]).map(m=>{const material=m.clone() as THREE.MeshStandardMaterial;
    if(material.map){this.loadedTextures++;material.map.anisotropy=2;}
    const h=heights[type].toFixed(4),biological=['marine','zergling','roach','ravager'].includes(type),wheel=type==='hellion';
    material.onBeforeCompile=shader=>{
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 unitMotion;');
     const deformation=biological?`float leg = 1.0-smoothstep(${h}*0.24,${h}*0.58,position.y); float stride=sin(unitMotion.x*8.0+sign(position.x)*1.5708); transformed.z += stride*leg*0.17*unitMotion.y; transformed.y += max(0.0,stride)*leg*0.11*unitMotion.y; transformed.y += sin(unitMotion.x*16.0)*0.018*unitMotion.y;`:
       wheel?`transformed.y += sin(unitMotion.x*23.0+position.z*5.0)*0.016*unitMotion.y;`:
       type==='tank'?`transformed.x *= 1.0+unitMotion.w*0.12; transformed.y *= 1.0-unitMotion.w*0.12; transformed.z -= unitMotion.z*0.08*smoothstep(0.6,1.0,position.y);`:
       type==='medivac'?`transformed.y += sin(unitMotion.x*3.0)*0.035;`:'';
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+deformation+'\ntransformed.z -= unitMotion.z*0.055;');
    };material.customProgramCacheKey=()=>type+'-local-motion-v1';return material;});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,UNIT_CAPACITY);mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.scene.add(mesh);batch.meshes.push(mesh);batch.data.push(anim);
  });this.batches.set(type,batch);
 }
 ground(p:Point){return this.world.terrain?.height(p)??0;}
 private matrix(x:number,y:number,z:number,sx=1,sy=1,sz=1,ry=0){_obj.position.set(x,y,z);_obj.rotation.set(0,ry,0);_obj.scale.set(sx,sy,sz);_obj.updateMatrix();return _obj.matrix;}
 private visible(p:Point){return Math.abs(p.x-this.cameraTarget.x)<Math.max(20,this.camera.right+5)&&Math.abs(p.z-this.cameraTarget.z)<24;}
 render(dt:number,alpha:number){const world=this.world;this.frames++;this.tickTime+=dt;if(this.tickTime>=.5){this.fps=this.frames/this.tickTime;this.frames=0;this.tickTime=0;}this.frameMs=dt*1000;this.frameTimes.push(this.frameMs);if(this.frameTimes.length>240)this.frameTimes.shift();
  this.terrainUpdate();this.cameraTarget.lerp(new THREE.Vector3(world.anchor.x,this.ground(world.anchor),world.anchor.z),1-Math.exp(-dt*6));this.camera.position.set(this.cameraTarget.x,34+this.cameraTarget.y,this.cameraTarget.z+26);this.camera.lookAt(this.cameraTarget);this.anchor.position.set(world.anchor.x,this.ground(world.anchor)+.04,world.anchor.z);this.grid.visible=this.showGrid;
  const counts=new Map<UnitType,number>();let bars=0,line=0,ring=0,shadows=0;
  for(const [key,b] of this.gpu){b.setLod(ZERG.some(t=>key===t||key===t+'.death')&&(this.quality!=='native'||heights[key.split('.')[0] as UnitType]*this.canvas.clientHeight/(this.camera.top-this.camera.bottom)<28));b.begin();}
  for(const event of world.visualEvents){if(event.serial<=this.lastVisual)continue;this.lastVisual=event.serial;if(event.kind==='hit')this.hitTimes.set(event.entityId,event.time);if(event.kind==='death'&&event.unitType)this.corpses.set(event.entityId,{type:event.unitType,x:event.x,z:event.z,y:event.flying?AIR_HEIGHT:this.ground(event),facing:event.facing,at:event.time});}
  const putLine=(a:Point,ay:number,b:Point,by:number,color:number)=>{if(line>=990)return;const offset=line*6;this.linePositions.set([a.x,ay,a.z,b.x,by,b.z],offset);_color.set(color);this.lineColors.set([_color.r,_color.g,_color.b,_color.r,_color.g,_color.b],offset);line++;};
  const putRing=(p:Point,r:number,color:number)=>{if(ring>=1400)return;this.rings.setMatrixAt(ring,this.matrix(p.x,this.ground(p)+.09,p.z,r,1,r));this.rings.setColorAt(ring++,_color.set(color));};
  const health=(b:Body,y:number)=>{if(bars>=400)return;const width=Math.max(.7,b.unitRadius*2),ratio=Math.max(0,b.hp/b.maxHp);this.healthBack.setMatrixAt(bars,this.matrix(b.x,y,b.z,width,1,1));this.health.setMatrixAt(bars,this.matrix(b.x-(1-ratio)*width/2,y+.015,b.z,width*ratio,1,1));this.health.setColorAt(bars++,_color.set(b.owner==='terran'?(ratio<.3?0xff7852:0x75ef95):0xd9573c));};
  for(const u of world.entities.values()){const batch=this.batches.get(u.unitType);if(!batch||!this.visible(u))continue;const dying=u.hp<=0,death=dying?Math.max(0,1-(world.time-(u.deadAt??world.time))/1.3):1;
   const index=counts.get(u.unitType)??0;if(index>=UNIT_CAPACITY)continue;counts.set(u.unitType,index+1);
   if(u.hp>0&&shadows<1400)this.shadows.setMatrixAt(shadows++,this.matrix(u.x,this.ground(u)+.012,u.z,u.unitRadius*1.9,1,u.unitRadius*1.7));
   const x=u.prev.x+(u.x-u.prev.x)*alpha,z=u.prev.z+(u.z-u.prev.z)*alpha,y=u.flying?AIR_HEIGHT:this.ground({x,z});
   if(this.gpu.has(u.unitType)){
    if(dying){if(!this.corpses.has(u.id))this.corpses.set(u.id,{type:u.unitType,x,z,y,facing:u.facing,at:u.deadAt??world.time});continue;}
    let key:string=u.unitType;if(u.unitType==='tank')key=u.action==='sieging'||u.action==='unsieging'?'tank.morph':u.mode==='siege'?'tank.siege':'tank';
    const model=this.gpu.get(key)??this.gpu.get(u.unitType)!;let state=this.animationStates.get(u.id);const signature=key+':'+u.action;
    if(!state||state.action!==signature){state={action:signature,since:world.time,modeDuration:u.modeTimer};this.animationStates.set(u.id,state);}
    let seconds=world.time-state.since;const p=model.pose(u.action);const once=['attack','spawn','sieging','unsieging'].includes(u.action);
    if(u.action==='move')seconds=u.distanceWalked/SC2_UNITS[u.unitType].movementSpeed;
    else if((u.action==='sieging'||u.action==='unsieging')&&p)seconds=(1-u.modeTimer/Math.max(1/60,state.modeDuration))*p.duration;
    else if(u.action==='attack')seconds*=1.4;
    // Small enemy silhouettes keep original 24 Hz poses; larger/friendly actors interpolate.
    const interpolate=u.owner==='terran'||heights[u.unitType]*this.canvas.clientHeight/(this.camera.top-this.camera.bottom)>=36;
    const shotAge=world.time-u.lastShotAt,displayAction=u.unitType==='marine'&&u.action==='attack'?'idle':u.action;
    model.add(x,y,z,u.facing,displayAction,seconds,once,Math.max(0,1-(world.time-(this.hitTimes.get(u.id)??-100))/.12),1,interpolate,u.unitType==='marine'&&shotAge<.4?shotAge*1.4:-1,u.unitType==='tank'&&u.modeTimer<=0?u.attackFacing-u.facing:0);
   }else{
    _obj.position.set(x,y,z);_obj.rotation.set(dying?Math.PI/2*(1-death):u.unitType==='baneling'?u.distanceWalked*2:0,u.facing,0);_obj.scale.setScalar(Math.max(.01,death));_obj.updateMatrix();
    let mode=u.mode==='siege'?1:0;if(u.action==='sieging')mode=1-u.modeTimer/2.887;if(u.action==='unsieging')mode=u.modeTimer/2.53;
    const motion=[u.distanceWalked+u.id*.29,dying?0:Math.min(1,Math.hypot(u.velocity.x,u.velocity.z)/2),u.action==='attack'?Math.min(1,u.attackLock*5):0,Math.max(0,Math.min(1,mode))];
    batch.meshes.forEach((m,i)=>{m.setMatrixAt(index,_obj.matrix);batch.data[i].setXYZW(index,...motion as [number,number,number,number]);});
   }
   if(!dying&&this.showColliders)putRing(u,u.unitRadius,u.flying?0x7ac7ff:u.owner==='terran'?0x82eeab:0xffa865);
   if(!dying&&(u.owner==='terran'||u.hp<u.maxHp))health(u,y+heights[u.unitType]+.22);
   if(u.healTarget){const target=world.entities.get(u.healTarget);if(target)putLine(u,AIR_HEIGHT-.2,target,this.ground(target)+.9,0x79ffb7);}
  }
  for(const [type,b] of this.batches){b.meshes.forEach((m,i)=>{m.count=counts.get(type)??0;m.instanceMatrix.needsUpdate=true;b.data[i].needsUpdate=true;});}
  for(const [id,c] of this.corpses){const model=this.gpu.get(c.type+'.death')??this.gpu.get(c.type);const age=world.time-c.at,life=Math.min(5,Math.max(1.5,model?.pose('dead')?.duration??1.5));if(age>life+.4){this.corpses.delete(id);continue;}if(model&&this.visible(c))model.add(c.x,c.y,c.z,c.facing,'dead',age,true,0,age>life?Math.max(.01,1-(age-life)/.4):1);}
  for(const [id] of this.animationStates)if(!world.entities.has(id)){this.animationStates.delete(id);this.hitTimes.delete(id);}
  for(const [id,at] of this.hitTimes)if(world.time-at>.2)this.hitTimes.delete(id);
  for(const e of world.economicTargets.values()){if(!this.visible(e))continue;const age=world.time-(e.resolvedAt??world.time),model=this.gpu.get(e.kind);if(e.status==='active'){model?.add(e.x,this.ground(e),e.z,e.facing,e.kind==='drone'?'move':'idle',world.time*1.4);health(e,this.ground(e)+1.65);if(e.kind==='egg')putRing(e,1.1,0xe8be6e);}else if(e.kind==='egg'&&e.status==='rescued'&&age<3.8){this.gpu.get('scv')?.add(e.x,this.ground(e),e.z,e.facing,'idle',age*1.4,false,0,age>3.4?Math.max(.01,(3.8-age)/.4):1);putRing(e,1.1,0x8be8a5);}else if(age<1.5)model?.add(e.x,this.ground(e),e.z,e.facing,'dead',age,true,0,Math.max(.01,1-age/1.5));}
  for(const b of this.gpu.values())b.end();
  for(const p of world.pods){this.podLabel(p);let v=this.podViews.get(p.id);if(!v&&this.podTemplate){v=new PodView(this.podTemplate,this.scene);this.podViews.set(p.id,v);}v?.update(p,world.time,this.visible(p),this.ground(p));
   if(p.status==='active'||p.status==='opening'){health(p,this.ground(p)+2.9);putRing(p,this.showColliders?p.unitRadius:2.1,0xffa94e);}}
  if(world.hive){if(!this.hiveView&&this.hiveTemplate){this.hiveView=clone(this.hiveTemplate);this.scene.add(this.hiveView);}if(this.hiveView){this.hiveView.position.set(world.hive.x,this.ground(world.hive),world.hive.z);this.hiveView.visible=world.hive.hp>0;}if(world.hive.hp>0)health(world.hive,this.ground(world.hive)+4);}
  for(const fx of world.effects){if(fx.kind==='bile'){putRing(fx.end,fx.radius+1,0xff7138);putRing(fx.end,Math.max(.15,(fx.until-world.time)/2.5*(fx.radius+1)),0xffda84);}else if(fx.kind==='explosion')putRing(fx.end,fx.radius*(1+(fx.until-world.time)),0xffbc59);}

  if(world.phase==='battle'&&world.order){const order=world.order;
   if(order.kind==='move')putRing(order.point,.65+.08*Math.sin(world.time*7),0x84eea7);
   else {const target=world.body(order.targetId);if(target&&target.hp>0)putRing(target,target.unitRadius+.28,0xff624a);}
  }
  this.shadows.count=shadows;this.shadows.instanceMatrix.needsUpdate=true;this.rings.count=ring;this.rings.instanceMatrix.needsUpdate=true;if(this.rings.instanceColor)this.rings.instanceColor.needsUpdate=true;
  for(const m of [this.health,this.healthBack]){m.count=bars;m.instanceMatrix.needsUpdate=true;}if(this.health.instanceColor)this.health.instanceColor.needsUpdate=true;
  let resources=0;for(const p of world.pickups){if(!this.visible(p)||resources>=1000)continue;this.pickups.setMatrixAt(resources,this.matrix(p.x,this.ground(p)+.25,p.z,1,1.5,1));this.pickups.setColorAt(resources++,_color.set(p.gas?0x8be5a2:0x7cd2ff));}this.pickups.count=resources;this.pickups.instanceMatrix.needsUpdate=true;if(this.pickups.instanceColor)this.pickups.instanceColor.needsUpdate=true;
  this.lines.geometry.setDrawRange(0,line*2);this.lines.geometry.attributes.position.needsUpdate=true;this.lines.geometry.attributes.color.needsUpdate=true;
  this.fx.render(world,this.camera,p=>this.visible(p),event=>{const model=event.unitType?this.gpu.get(event.siege?'tank.siege':event.unitType):null;const weapon=model?.weaponAt('attack',Math.max(0,world.time-event.time)*1.4);if(!weapon)return null;return {x:event.x+weapon.x*Math.cos(event.facing)+weapon.z*Math.sin(event.facing),y:weapon.y+this.ground(event),z:event.z-weapon.x*Math.sin(event.facing)+weapon.z*Math.cos(event.facing)};});
  this.renderer.render(this.scene,this.camera);
 }
 private podLabel(p:import('../../simulation/types').Pod){let el=this.podLabels.get(p.id);if(!el){el=document.createElement('div');el.className='pod-world-label';this.labelLayer.append(el);this.podLabels.set(p.id,el);}const active=['falling','active','opening'].includes(p.status);el.hidden=!active||!this.visible(p)||this.world.phase!=='battle'||this.world.paused;if(el.hidden)return;
  _vec.set(p.x,this.ground(p)+3.4,p.z).project(this.camera);const x=(_vec.x*.5+.5)*this.canvas.clientWidth,y=(.5-_vec.y*.5)*this.canvas.clientHeight;el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;const text=`${icon('unit.'+p.unitType)}<span>${SC2_UNITS[p.unitType].zh} #${p.id}<small>${this.world.podPurpose(p.unitType)} · ${Math.ceil(p.hp)} / ${p.maxHp} HP</small><i style="width:${Math.max(0,p.hp/p.maxHp)*100}%"></i></span>`;if(el.dataset.content!==text){el.innerHTML=text;el.dataset.content=text;}}
 pick(clientX:number,clientY:number,touch=false){return pickBattle(clientX,clientY,touch,this.canvas,this.camera,this.scene,this.world);}
 screen(p:Point){_vec.set(p.x,this.ground(p),p.z).project(this.camera);return {x:(_vec.x*.5+.5)*this.canvas.clientWidth,y:(-.5*_vec.y+.5)*this.canvas.clientHeight};}
 report(){return {order:this.world.order?.kind==='move'?{...this.world.order,point:{...this.world.order.point}}:this.world.order?{...this.world.order}:null,resolution:{quality:this.quality,devicePixelRatio:window.devicePixelRatio||1,renderPixelRatio:this.renderer.getPixelRatio(),width:this.canvas.width,height:this.canvas.height,cssWidth:this.canvas.clientWidth,cssHeight:this.canvas.clientHeight,antialias:this.renderer.getContext().getContextAttributes()?.antialias},models:this.loadedModels,economicModels:['scv','drone','egg'].filter(k=>this.gpu.has(k)).length,podModel:!!this.podTemplate,errors:[...this.modelErrors,...this.fx.errors],originalAnimationModels:[...this.batches.values()].filter(b=>b.gltf.animations.length>0).length,proceduralAnimationModels:[...this.batches.values()].filter(b=>!b.gltf.animations.length).length,originalDeathModels:[...this.gpu.keys()].filter(k=>k.endsWith('.death')).length,animationAtlasBytes:[...this.gpu.values()].reduce((n,b)=>n+b.textureBytes,0),lodRatios:Object.fromEntries([...this.gpu].filter(([k])=>ZERG.includes(k as never)).map(([k,b])=>[k,b.lodRatio])),effectTextures:this.fx.loaded,effects:this.fx.stats,textures:this.loadedTextures,fps:this.fps,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,entities:this.world.entities.size,maxStretch:this.world.maxStretch,spatialVisits:this.world.distancePairs,collisionContacts:this.world.collisionContacts};}
}
