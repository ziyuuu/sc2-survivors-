import {ProtossEliteEffects} from '../effects/protoss-elite-effects';
import {revisedElite} from '../../simulation/combat/terran-elite-runtime';
import {revisedZergElite} from '../../simulation/combat/zerg-elite-runtime';
import {ZergEliteEffects} from '../effects/zerg-elite-effects';
import {TerranEliteEffects} from '../effects/terran-elite-effects';
import {EliteSupportEffects} from '../effects/elite-support-effects';
import {ProtossHeroEffects} from '../effects/protoss-hero-effects';
import {isProtossHero} from '../../data/protoss-heroes';
import {ZergHeroEffects} from '../effects/zerg-hero-effects';
import {deathPoseTime} from '../units/death-clock';
import {createCampaignMap} from '../terrain/campaign-map';
import {RadialTerrain,campaignTerrain,campaignMapAssets,type CampaignMapRecipe} from '../../data/campaign-map';
import {racePreloadModels} from '../../app/race-preload';
import {RESCUE_PRESENTATION} from '../../data/economy';
import {preparePylonBirthMaterials} from '../units/pylon-birth-materials';
import {BOSSES} from '../../data/enemies';
import {ENDLESS} from '../../data/endless';
import {cliffRenderPosition} from '../../simulation/movement/native-traversal';
import {FriendlyLabels} from '../units/friendly-labels';
import {commitInstances,uploadActive,resetUploadStats,requestedUploadBytes} from '../units/instance-updates';
import {RARITIES} from '../../data/rewards';
import * as THREE from 'three';
import {NonHeroEffects} from '../effects/nonhero-effects';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ConfirmedHeroEffects} from '../effects/confirmed-hero/controller';
import {isRevisedHero} from '../../data/terran-heroes';
import {isZergHero} from '../../data/zerg-heroes';
import {MeshoptSimplifier} from 'meshoptimizer';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {assetUrl,ASSETS,icon} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {SC2_UNITS,type CombatUnitType as UnitType} from '../../data/sc2-units';
import {EXPANSION_FAMILIES} from '../../data/expansion-units';
import {CAMPAIGN18_STAGES} from '../../data/campaign18';
import {HEROES,type HeroId} from '../../data/heroes';
import {isAirHeroType,type Race} from '../../data/races';
import {ELITES,type EliteId} from '../../data/elites';
import {heroPresentation,modelPresentationAccent,modelPresentationScale} from '../../data/combat-presentation';
import {AIR_HEIGHT} from '../../data/terrain';
import {TUNING} from '../../data/game';
import {World} from '../../simulation/world';
import type {RunSnapshot} from '../../simulation/persistence/run-snapshot';
import type {Entity,Body,Point,Fortification,VisualEvent} from '../../simulation/types';
import {mapAnimations,attackAction,selectAttackPresentation,type AttackPlaybackState} from '../loaders/animations';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import {pickBattle,pickMovement,pickCarrier} from '../input/battle-picking';
import {PodView} from '../units/pod-view';
import {createTerrain} from '../terrain/char-terrain';
import type {MapView} from '../terrain/original-map';
import {createFlatMap} from '../terrain/flat-map';
import {FlatTerrain} from '../../simulation/movement/flat-terrain';
import type {TerrainQuery} from '../../data/map-definition';
import {ResourceDrops} from '../units/resource-drops';
import {AnimatedBatch} from '../units/animated-batch';
import {heroFeedbackEvent,weaponWorldPoint} from '../effects/hero-feedback';
import {BattleEffects} from '../effects/battle-effects';
import {statusReadout} from '../../ui/unit-identity';
import {loadQuality,saveQuality,renderPixelRatio,type RenderQuality,loadAnimationMode,saveAnimationMode,samplePoseClock,type AnimationMode,type PoseClockState} from '../settings/quality';

type UnitBatch={gltf:GLTF;meshes:THREE.InstancedMesh[];data:THREE.InstancedBufferAttribute[];scale:number;center:THREE.Vector3;minY:number;clips:ReturnType<typeof mapAnimations>};
const heights:Record<UnitType,number>={science_vessel:1.8,reaper:1.4,thor:3.2,viking:1.4,banshee:1.3,queen:1.6,lurker:1.5,mutalisk:1.6,corruptor:1.7,ultralisk:3,zealot:1.6,adept:1.6,stalker:1.8,sentry:1.2,high_templar:1.6,immortal:2,colossus:3.5,phoenix:1.4,void_ray:2,carrier:3.5,marine:1.35,marauder:1.6,hydralisk:1.55,hellion:.9,tank:1.25,medivac:1.05,zergling:.68,roach:1,baneling:.7,ravager:1.45,yamato_battlecruiser:4.5,hots_leviathan:4.5,purifier_flagship:3.5};
const ordinaryLodKeys=new Set<string>(EXPANSION_FAMILIES.flatMap(family=>[family,family+'.death']));
for(const key of ['tank.siege','tank.morph','hellion.hellbat','viking.assault'])ordinaryLodKeys.add(key);
const _obj=new THREE.Object3D(),_color=new THREE.Color(),_vec=new THREE.Vector3();
const UNIT_CAPACITY=1024; // Rescue guardians may temporarily exceed the ambient-wave cap.
export class BattleRenderer {
 cameraShake=false;
 setCameraShake(enabled:boolean){this.cameraShake=enabled;try{localStorage.setItem('sc2.cameraShake',String(enabled));}catch{}}
 private viewportWidth=1;private viewportHeight=1;
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.OrthographicCamera();
 batches=new Map<UnitType,UnitBatch>();gpu=new Map<string,AnimatedBatch>();
 private animationStates=new Map<number,{action:string;since:number;modeDuration:number;playback:AttackPlaybackState;poseClock:PoseClockState;sampled?:{at:number;action:keyof ReturnType<typeof mapAnimations>;seconds:number;once:boolean;attackSeconds:number;attackKey:keyof ReturnType<typeof mapAnimations>}}>();
 private friendlyLabels:FriendlyLabels;
 private enemyLabels=new Map<number,HTMLElement>();
 private corpses=new Map<number,{scale:number;type:string;x:number;z:number;y:number;facing:number;at:number}>();
 private hitTimes=new Map<number,number>();private lastVisual=0;
 private hiveDeathTemplate?:GLTF;private hiveWasAlive=false;
 private hiveDeaths=new Map<number,{root:THREE.Group;mixer:THREE.AnimationMixer;at:number;duration:number;sourceDuration:number}>();
 readonly protossHeroes:ProtossHeroEffects;readonly zergHeroes:ZergHeroEffects;readonly confirmedHeroes:ConfirmedHeroEffects;private heroComposer:EffectComposer;private composerSize={width:0,height:0,ratio:0};
 readonly fx:BattleEffects;quality:RenderQuality=loadQuality();
 animationMode:AnimationMode=loadAnimationMode();
 private destinationMarker!:THREE.Mesh;
 initialAssetsLoaded=false;targetPreview:Point|null=null;loadedModels=0;modelErrors:string[]=[];loadedTextures=0;fps=0;frameMs=0;frameTimes:number[]=[];showGrid=false;showColliders=false;
 readonly nonHeroEffects:NonHeroEffects;
 readonly protossEliteEffects:ProtossEliteEffects;readonly zergEliteEffects:ZergEliteEffects;readonly terranEliteEffects:TerranEliteEffects;readonly eliteSupportEffects:EliteSupportEffects;private shadows:THREE.InstancedMesh;private health:THREE.InstancedMesh;private healthBack:THREE.InstancedMesh;private pickups:ResourceDrops;private rings:THREE.InstancedMesh;
 private lines:THREE.LineSegments;private linePositions=new Float32Array(6000);private lineColors=new Float32Array(6000);
 private anchor:THREE.Group;private podViews=new Map<number,PodView>();private podTemplates=new Map<Race,GLTF>();private terrainUpdate=()=>{};private mapView?:MapView;private mapTerrain?:TerrainQuery;private mapViews=new Map<TerrainQuery,MapView>();private mapSwitching=false;private hiveTemplate:THREE.Object3D|null=null;private hiveView:THREE.Object3D|null=null;private expansionViews=new Map<number,THREE.Object3D>();private fortViews=new Map<number,THREE.Group>();private fortTemplates=new Map<Fortification['kind'],THREE.Group>();private fortDeathTemplates=new Map<Fortification['kind'],THREE.Group>();private fortClips=new Map<string,THREE.AnimationClip>();private fortMixers=new Map<number,THREE.AnimationMixer>();private fortDeathViews=new Map<number,{group:THREE.Group;mixer:THREE.AnimationMixer;until:number}>();private fortVisualTime=0;
 private lootLabels=new Map<number,HTMLElement>();
 private podLabels=new Map<number,HTMLElement>();private labelLayer=document.createElement('div');
 private grid=new THREE.GridHelper(104,26,0x3aa8b4,0x245460);private tickTime=0;private frames=0;private cameraTarget=new THREE.Vector3();
 constructor(readonly canvas:HTMLCanvasElement,readonly world:World){
  try{this.cameraShake=localStorage.getItem('sc2.cameraShake')==='true';}catch{}
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{const error='Shader: '+gl.getProgramInfoLog(program)+' / '+gl.getShaderInfoLog(vertex)+' / '+gl.getShaderInfoLog(fragment);this.modelErrors.push(error);console.error(error);};
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.renderer.setClearColor(0x171d20);this.scene.fog=new THREE.FogExp2(0x202326,.009);
  this.fx=new BattleEffects(this.scene);this.nonHeroEffects=new NonHeroEffects(this.scene,this.fx,this.camera);this.protossEliteEffects=new ProtossEliteEffects(this.scene,this.fx,this.camera);this.zergEliteEffects=new ZergEliteEffects(this.scene,this.fx,this.camera);this.eliteSupportEffects=new EliteSupportEffects(this.scene,this.fx);this.terranEliteEffects=new TerranEliteEffects(this.scene,this.fx,this.camera);this.confirmedHeroes=new ConfirmedHeroEffects(this,world);this.zergHeroes=new ZergHeroEffects(this,world);this.protossHeroes=new ProtossHeroEffects(this,world);this.heroComposer=new EffectComposer(this.renderer);this.heroComposer.addPass(new RenderPass(this.scene,this.camera));this.heroComposer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,.8));this.heroComposer.addPass(new OutputPass());
  this.scene.add(new THREE.HemisphereLight(0xc1d9e3,0x473320,1.4));const light=new THREE.DirectionalLight(0xffe0bd,2.4);light.position.set(-15,25,10);this.scene.add(light);
  const makeBatch=(geometry:THREE.BufferGeometry,material:THREE.Material,count:number)=>{const m=new THREE.InstancedMesh(geometry,material,count);m.frustumCulled=false;m.matrixAutoUpdate=false;m.matrixWorldAutoUpdate=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(m);return m;};
  const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));pixels[(y*32+x)*4+3]=Math.round(a*a*135);}
  const shadowMap=new THREE.DataTexture(pixels,32,32);shadowMap.needsUpdate=true;const disc=new THREE.PlaneGeometry(2,2);disc.rotateX(-Math.PI/2);this.shadows=makeBatch(disc,new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),1400);
  const bar=new THREE.PlaneGeometry(1,.11);bar.rotateX(-Math.PI/2);
  this.health=makeBatch(bar,new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}),400);this.health.renderOrder=5;
  this.healthBack=makeBatch(bar.clone(),new THREE.MeshBasicMaterial({color:0x091610}),400);this.healthBack.renderOrder=4;
  this.pickups=new ResourceDrops(this.scene);
  const ring=new THREE.RingGeometry(.88,1,32);ring.rotateX(-Math.PI/2);this.rings=makeBatch(ring,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}),1400);
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(this.linePositions,3).setUsage(THREE.DynamicDrawUsage));lineGeo.setAttribute('color',new THREE.BufferAttribute(this.lineColors,3).setUsage(THREE.DynamicDrawUsage));this.lines=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9}));this.lines.frustumCulled=false;this.scene.add(this.lines);
  this.anchor=new THREE.Group();const cursor=new THREE.Mesh(new THREE.RingGeometry(.48,.56,4),new THREE.MeshBasicMaterial({color:0x67d9fb,transparent:true,opacity:.65}));cursor.rotation.x=-Math.PI/2;cursor.rotation.z=Math.PI/4;this.anchor.add(cursor);this.scene.add(this.anchor);this.destinationMarker=new THREE.Mesh(new THREE.RingGeometry(.58,.68,32),new THREE.MeshBasicMaterial({color:0x84eea7,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));this.destinationMarker.rotation.x=-Math.PI/2;this.destinationMarker.renderOrder=20;this.destinationMarker.visible=false;this.scene.add(this.destinationMarker);
  this.grid.position.y=.08;this.grid.visible=false;this.scene.add(this.grid);
  this.labelLayer.id='pod-labels';canvas.parentElement!.append(this.labelLayer);this.friendlyLabels=new FriendlyLabels(this.labelLayer);
  this.resize();window.addEventListener('resize',()=>this.resize());new ResizeObserver(()=>this.resize()).observe(canvas);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextEpoch++;this.screenWarmed.clear();this.validatedPrograms.clear();world.paused=true;world.announce('画面连接中断，正在等待恢复');});
  canvas.addEventListener('webglcontextrestored',()=>{world.announce('画面连接已恢复，请准备画面后继续');});
 }
 /** Retain GPU programs, original map and decoded models when starting a fresh run. */
 resetRun(){this.nonHeroEffects.reset();this.protossEliteEffects.reset();this.zergEliteEffects.reset();this.eliteSupportEffects.reset();this.terranEliteEffects.reset();
  for(const id of this.hiveDeaths.keys())this.removeHiveDeath(id);this.hiveWasAlive=false;
  this.animationStates.clear();this.corpses.clear();this.hitTimes.clear();this.lastVisual=0;
  this.friendlyLabels.reset();this.fx.reset();this.confirmedHeroes.reset();this.zergHeroes.reset();this.protossHeroes.reset();
  for(const map of [this.enemyLabels,this.lootLabels,this.podLabels]){for(const el of map.values())el.remove();map.clear();}
  for(const p of this.podViews.values())p.dispose();this.podViews.clear();
  this.hiveView?.removeFromParent();this.hiveView=null;for(const v of this.expansionViews.values())v.removeFromParent();this.expansionViews.clear();
  for(const v of this.fortViews.values())v.removeFromParent();this.fortViews.clear();for(const mixer of this.fortMixers.values())mixer.stopAllAction();this.fortMixers.clear();for(const death of this.fortDeathViews.values()){death.mixer.stopAllAction();death.group.removeFromParent();}this.fortDeathViews.clear();this.fortVisualTime=this.world.time;
  this.cameraTarget.set(0,this.world.terrain?.height({x:0,z:0})??0,0);
  this.frameTimes.length=0;this.frames=0;this.tickTime=0;
 }
 setQuality(quality:RenderQuality){this.quality=quality;saveQuality(quality);this.resize();this.filterTextures(this.scene);}
 setAnimationMode(mode:AnimationMode){this.animationMode=mode;saveAnimationMode(mode);}
 private filterTextures(root:THREE.Object3D){const limit=Math.min(this.renderer.capabilities.getMaxAnisotropy(),this.quality==='native'?8:this.quality==='balanced'?4:1),seen=new Set<THREE.Texture>();root.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const key of ['map','normalMap','specularColorMap','emissiveMap','alphaMap']){const t=(m as unknown as Record<string,THREE.Texture>)[key];if(t&&!seen.has(t)){seen.add(t);if(t.anisotropy!==limit){t.anisotropy=limit;t.needsUpdate=true;}}}});}
 private preloadTextures(root:THREE.Object3D,openedOnly=false){const seen=new Set<THREE.Texture>();root.traverse(n=>{if(!(n instanceof THREE.Mesh)||openedOnly&&n instanceof THREE.InstancedMesh&&n.count===0)return;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const key of ['map','normalMap','specularColorMap','emissiveMap','alphaMap']){const t=(m as unknown as Record<string,THREE.Texture>)[key];if(t&&!seen.has(t)){seen.add(t);this.renderer.initTexture(t);}}});}
 /** Compile and make the first draw with the actual batches while the loading gate is active. */
 private async prewarmBatches(meshes:THREE.InstancedMesh[],includeTemplates=false){
  const identity=new THREE.Matrix4(),white=new THREE.Color(0xffffff);
  const warmScene=new THREE.Scene();warmScene.environment=this.scene.environment;warmScene.fog=this.scene.fog;warmScene.environmentIntensity=this.scene.environmentIntensity;warmScene.environmentRotation.copy(this.scene.environmentRotation);
  this.scene.traverseVisible(node=>{if(node instanceof THREE.Light)warmScene.add(node.clone());});
  const restored=meshes.map(mesh=>({mesh,parent:mesh.parent,count:mesh.count,visible:mesh.visible}));
  const roots=includeTemplates?[...[...this.podTemplates.values(),...this.podBirthTemplates.values(),...this.podDeathTemplates.values()].map(g=>g.scene),...(this.hiveTemplate?[this.hiveTemplate]:[]),...(this.hiveDeathTemplate?[this.hiveDeathTemplate.scene]:[])]:[];
  const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
  const previous=this.renderer.getRenderTarget(),position=this.camera.position.clone(),quaternion=this.camera.quaternion.clone();
  try{
   for(const {mesh} of restored){
    warmScene.add(mesh);
    mesh.visible=true;mesh.count=1;mesh.setMatrixAt(0,identity);
    // Effects and selection rings acquire instanceColor on first use. The skinned
    // batches already use the device's maximum attributes, so keep those white.
    if(!mesh.geometry.hasAttribute('unitPose'))mesh.setColorAt(0,white);
   }
   for(const root of roots)warmScene.add(root);
   this.camera.position.set(0,34,26);this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();
   await this.renderer.compileAsync(warmScene,this.camera);
   this.preloadTextures(warmScene,true);
   this.renderer.setRenderTarget(target);this.renderer.render(warmScene,this.camera);
  }finally{
   this.renderer.setRenderTarget(previous);target.dispose();
   this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();
   for(const root of roots)root.removeFromParent();
   for(const {mesh,parent,count,visible} of restored){if(parent)parent.add(mesh);else mesh.removeFromParent();mesh.count=count;mesh.visible=visible;}
  }
 }
 private validatedPrograms=new Set<number>();
 contextEpoch=0;
 get preparationKey(){return [this.contextEpoch,...this.gpu.keys(),this.mapViews.size,this.fortTemplates.size,this.fortDeathTemplates.size].join('|');}
 private screenWarmed=new Set<THREE.InstancedMesh>();
 /** Exercise each decoded unit material against the actual antialiased canvas.
  * Offscreen 1px prewarming does not cover the driver's first screen pipeline. */
 async warmPresentationBatches(progress:(done:number,total:number,label:string)=>void=()=>{}){
  const pending=[...this.gpu.entries()].flatMap(([key,batch])=>batch.meshes.filter(mesh=>!this.screenWarmed.has(mesh)).map(mesh=>({key,mesh})));
  if(!pending.length)return 0;
  const identity=new THREE.Matrix4(),white=new THREE.Color(0xffffff),renderer=this.renderer,gl=renderer.getContext();
  const target=renderer.getRenderTarget(),position=this.camera.position.clone(),quaternion=this.camera.quaternion.clone();
  // Exercise the real screen pipeline without redrawing the entire map for each
  // material. Preserve lights and the scene graph; only renderable visibility changes.
  const screenVisibility=new Map<THREE.Object3D,boolean>();this.scene.traverse(node=>{if(node instanceof THREE.Mesh||node instanceof THREE.Line||node instanceof THREE.Sprite){screenVisibility.set(node,node.visible);node.visible=false;}});
  try{
   renderer.setRenderTarget(null);
   for(let i=0;i<pending.length;i++){
    const {key,mesh}=pending[i],count=mesh.count,visible=mesh.visible,first=mesh.instanceMatrix.array.slice(0,16);
    try{
     mesh.visible=true;mesh.count=1;mesh.setMatrixAt(0,identity);mesh.instanceMatrix.needsUpdate=true;
     if(!mesh.geometry.hasAttribute('unitPose'))mesh.setColorAt(0,white);
     this.camera.position.set(0,34,26);this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();
     renderer.render(this.scene,this.camera);gl.finish();
     this.screenWarmed.add(mesh);
    }finally{
     mesh.instanceMatrix.array.set(first,0);mesh.instanceMatrix.needsUpdate=true;
     mesh.count=count;mesh.visible=visible;
     this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();
    }
    progress(i+1,pending.length,key);
    if((i+1)%4===0)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   }
  }finally{for(const [node,visible] of screenVisibility)node.visible=visible;renderer.setRenderTarget(target);this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();}
  return pending.length;
 }
 private async finishProgramWarmup(progress:(done:number,total:number)=>void=()=>{}){
  const programs=this.renderer.info.programs as unknown as {id:number;getUniforms:()=>unknown;diagnostics?:{runnable:boolean}}[];
  const pending=programs.filter(item=>!this.validatedPrograms.has(item.id));let checked=0;
  progress(0,pending.length);
  for(const item of pending){
   // Three defers WebGLProgram.onFirstUse (link validation, uniforms and
   // attributes) until getUniforms, even if compileAsync has finished.
   item.getUniforms();
   if(item.diagnostics?.runnable===false)throw Error('GPU 着色器准备失败');
   this.validatedPrograms.add(item.id);
   checked++;if(checked%8===0||checked===pending.length)progress(checked,pending.length);
   if(checked%8===0)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
 }
 resize(){const w=this.viewportWidth=this.canvas.clientWidth||innerWidth,h=this.viewportHeight=this.canvas.clientHeight||innerHeight,gl=this.renderer.getContext();this.renderer.setPixelRatio(renderPixelRatio(this.quality,window.devicePixelRatio||1,w,h,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)));this.renderer.setSize(w,h,false);const height=w<h?30:h<420?17.5:25;this.camera.left=-height*w/h/2;this.camera.right=height*w/h/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.near=.1;this.camera.far=180;this.camera.updateProjectionMatrix();}
 async load(progress:(label:string,done?:number,total?:number)=>void,rescueRace:Race=this.world.expedition.race,skipMap=false){await MeshoptSimplifier.ready;const loader=new GLTFLoader();
  // Fail required race assets before constructing common scene objects. Successful
  // worker/templates cache individually, so retry reuses them without duplicate meshes.
  await this.prepareRescueAssets(rescueRace);
  const initialTypes:UnitType[]=rescueRace==='terran'?['marine','zergling']:rescueRace==='protoss'?['zealot','zergling']:['zergling'];await prepareEmbeddedAssetIds(initialTypes.flatMap(type=>[`model.${type}`,...['.death',...(type==='tank'?['.siege','.morph']:[])].map(suffix=>`model.${type}${suffix}`)].filter(id=>ASSETS.has(id))));
  for(const type of initialTypes){progress(`载入 ${SC2_UNITS[type].name}`);try{const url=assetUrl('model.'+type);if(!url)throw Error('missing asset');const gltf=await restoreSc2Materials(await loader.loadAsync(url));this.prepareUnit(type,gltf);this.loadedModels++;}catch(e){this.modelErrors.push(type+': '+String(e));}}
  for(const key of initialTypes.flatMap(t=>[t+'.death',...(t==='tank'?['tank.siege','tank.morph']:[])])){const url=assetUrl('model.'+key);if(!url)continue;progress(`载入原始动画 ${key}`);try{const type=key.split('.')[0] as UnitType,g=await restoreSc2Materials(await loader.loadAsync(url)),base=this.gpu.get(type);this.gpu.set(key,new AnimatedBatch(g,this.scene,heights[type],base?.normalization));}catch(e){this.modelErrors.push(key+': '+String(e));}}
  await this.fx.load();await this.nonHeroEffects.load();await this.protossEliteEffects.load();await this.zergEliteEffects.load();await this.eliteSupportEffects.loadMedicalTextures();await this.terranEliteEffects.load();await this.confirmedHeroes.prepare();await this.zergHeroes.prepare();this.protossHeroes.prepare();await this.pickups.load();this.modelErrors.push(...this.pickups.errors.map(e=>'resource: '+e));
  if(!skipMap&&this.world.terrain?.definition){this.mapTerrain=this.world.terrain;this.mapView=this.world.terrain instanceof RadialTerrain?await createCampaignMap(this.scene,this.world.terrain):await Promise.reject<MapView>(new Error('不支持的战役地图'));this.mapView.setVisible(true);this.mapViews.set(this.mapTerrain,this.mapView);this.terrainUpdate=()=>this.mapView?.update(this.camera);}else if(!skipMap)this.terrainUpdate=await createTerrain(this.scene,this.world);
  for(const [key,height] of [['drone',.7],['egg',1.3]] as const){if(this.gpu.has(key))continue;const url=assetUrl('model.'+key);if(!url){this.modelErrors.push(key+': missing model');continue;}try{this.gpu.set(key,new AnimatedBatch(await restoreSc2Materials(await loader.loadAsync(url)),this.scene,height));}catch(e){this.modelErrors.push(key+': '+String(e));}}
  await this.prepareWorkerDeath('drone',.7);
  if(!this.hiveDeathTemplate){await prepareEmbeddedAssetIds(['model.hatchery.death']);const url=assetUrl('model.hatchery.death');if(!url)throw Error('主巢死亡资源未就绪');this.hiveDeathTemplate=await restoreSc2Materials(await loader.loadAsync(url));await this.renderer.compileAsync(this.hiveDeathTemplate.scene,this.camera,this.scene);this.preloadTextures(this.hiveDeathTemplate.scene);}
  const hiveUrl=assetUrl('model.hive');if(hiveUrl){try{const g=await loader.loadAsync(hiveUrl);const box=new THREE.Box3().setFromObject(g.scene),size=box.getSize(new THREE.Vector3());g.scene.scale.setScalar(6/Math.max(size.x,size.z));this.hiveTemplate=g.scene;}catch(e){this.modelErrors.push('hive: '+String(e));}}
  this.filterTextures(this.scene);const visible:THREE.Object3D[]=[];for(const b of this.gpu.values())for(const m of b.meshes){if(!m.visible){visible.push(m);m.visible=true;}}
  try{
   // Wait for parallel shader compilation, then upload effect atlases before their first combat use.
   // Both steps happen behind the loading screen; no dummy particles enter the scene.
   await this.renderer.compileAsync(this.scene,this.camera);
   const inactive:THREE.InstancedMesh[]=[];
   this.scene.traverse(node=>{if(node instanceof THREE.InstancedMesh&&node.count===0)inactive.push(node);});
   progress('GPU 准备场景',0,0);
   await this.prewarmBatches(inactive,true);
   await this.finishProgramWarmup((done,total)=>progress('GPU 校验着色器',done,total));
   for(const g of [...this.podTemplates.values(),...this.podBirthTemplates.values(),...this.podDeathTemplates.values()]){await this.renderer.compileAsync(g.scene,this.camera,this.scene);this.preloadTextures(g.scene);}
   if(this.hiveTemplate){await this.renderer.compileAsync(this.hiveTemplate,this.camera,this.scene);this.preloadTextures(this.hiveTemplate);}
   if(this.mapView&&this.world.terrain?.definition){const terrain=this.world.terrain,key=terrain instanceof RadialTerrain?terrain.definition.source.sha256:'terrain-'+terrain.definition!.source.name;const root=this.scene.getObjectByName(key);if(!root)throw Error('地图场景未就绪');this.preloadTextures(root,true);}
   for(const batch of this.fx.batches.values()){
    const material=batch.mesh.material as THREE.ShaderMaterial;
    const texture=material.uniforms.map?.value;
    if(texture instanceof THREE.Texture)this.renderer.initTexture(texture);
   }
  }finally{for(const m of visible)m.visible=false;}
  this.initialAssetsLoaded=true;
 }
 private variantLoads=new Map<string,Promise<boolean>>();private variantQueue=Promise.resolve();assetsPending=0;
 async waitForPendingAssets(){await this.variantQueue;if(this.assetsPending>0)throw Error('仍有资源未完成准备');}
 ensureUnitVariant(key:string,type:UnitType):Promise<boolean>{const existing=this.variantLoads.get(key);if(existing)return existing;if(this.gpu.has(key))return Promise.resolve(true);this.modelErrors=this.modelErrors.filter(error=>!error.startsWith(key+':'));
  // HUD listeners can request this same model synchronously. Publish both the promise and
  // queue entry before notifying them, so one arrival cannot recursively start more loads.
  let finish!:(ok:boolean)=>void;const result=new Promise<boolean>(resolve=>finish=resolve);this.variantLoads.set(key,result);this.assetsPending++;
  this.variantQueue=this.variantQueue.then(async()=>{let ok=false;try{
   const suffixes=['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])];
   await prepareEmbeddedAssetIds([`model.${key}`,...suffixes.map(suffix=>`model.${key}${suffix}`).filter(id=>ASSETS.has(id))]);
   const loader=new GLTFLoader(),url=assetUrl('model.'+key);if(!url)throw Error('missing original model');const gltf=await restoreSc2Materials(await loader.loadAsync(url));if(!gltf.animations.length)throw Error('missing original animation');if(key===type){this.prepareUnit(type,gltf);this.loadedModels++;}else this.gpu.set(key,new AnimatedBatch(gltf,this.scene,key==='interceptor'?.55:heights[type],undefined,TUNING.unitScale,key));const base=this.gpu.get(key)!;
   // The original Fenix asset uses a 7.5 HDR emission with its body color map.
   // Preserve that texture and animation while keeping plating readable under bloom.
   if(key==='hero.fenix')for(const mesh of base.meshes)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const m=material as THREE.MeshStandardMaterial;m.emissiveIntensity=Math.min(m.emissiveIntensity,.85);}
   // The approved showcase casts both rifle skills from their original firing pose.
   if(key==='hero.raynor'||key==='hero.nova')base.actions.skill=base.actions.attack;
   for(const suffix of ['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])]){const path=assetUrl('model.'+key+suffix);if(!path){if(suffix!=='.death')throw Error('missing original tank form '+suffix);continue;}const form=await restoreSc2Materials(await loader.loadAsync(path));this.gpu.set(key+suffix,new AnimatedBatch(form,this.scene,heights[type],base.normalization));}for(const [id,b] of this.gpu)if(id===key||id.startsWith(key+'.'))for(const mesh of b.meshes)this.filterTextures(mesh);const hidden:THREE.Object3D[]=[],inactive:THREE.InstancedMesh[]=[];for(const [id,b] of this.gpu)if(id===key||id.startsWith(key+'.'))for(const m of b.meshes){if(!m.visible){hidden.push(m);m.visible=true;}if(m.count===0)inactive.push(m);}try{await this.prewarmBatches(inactive);await this.finishProgramWarmup();}finally{for(const m of hidden)m.visible=false;}ok=true;
   }catch(e){this.modelErrors.push(key+': '+String(e));this.world.paused=true;this.world.announce('增援素材未能载入，请重新载入战场');}finally{this.assetsPending--;if(ok)this.modelErrors=this.modelErrors.filter(error=>!error.startsWith(key+':'));else this.variantLoads.delete(key);finish(ok);this.world.changed();}});this.world.changed();return result;
 }
 async prepareCampaignAssets(recipe:CampaignMapRecipe){const terrain=campaignTerrain(recipe);await prepareEmbeddedAssetIds(campaignMapAssets(recipe));if(![...this.mapViews.keys()].some(t=>t.definition?.source.sha256===terrain.definition.source.sha256)){const view=await createCampaignMap(this.scene,terrain);this.mapViews.set(terrain,view);view.setVisible(true);try{this.preloadTextures(this.scene.getObjectByName(terrain.definition.source.sha256)!);await this.renderer.compileAsync(this.scene,this.camera);}finally{view.setVisible(this.world.terrain===terrain);}}
  for(const [key,view] of this.mapViews)if(key instanceof RadialTerrain&&key.definition.source.sha256!==terrain.definition.source.sha256&&key!==this.world.terrain){view.dispose?.();this.mapViews.delete(key);}
 }
 private syncMap(){const terrain=this.world.terrain;if(this.mapSwitching||terrain===this.mapTerrain||!terrain)return;this.mapTerrain=terrain;const previous=[...this.mapViews.keys()].find(t=>t.definition?.source.sha256&&t.definition.source.sha256===terrain.definition?.source.sha256),cached=this.mapViews.get(terrain)??(previous?this.mapViews.get(previous):undefined);if(cached&&previous!==terrain){cached.bindTerrain?.(terrain);if(previous)this.mapViews.delete(previous);this.mapViews.set(terrain,cached);}for(const view of this.mapViews.values())view.setVisible(view===cached);if(cached){this.mapView=cached;this.cameraTarget.set(this.world.anchor.x,this.ground(this.world.anchor),this.world.anchor.z);this.terrainUpdate=()=>this.mapView?.update(this.camera);return;}
  this.mapSwitching=true;this.assetsPending++;this.world.changed();void (terrain instanceof FlatTerrain?createFlatMap(this.scene,terrain):terrain instanceof RadialTerrain?createCampaignMap(this.scene,terrain):Promise.reject<MapView>(new Error('不支持的战役地图'))).then(view=>{this.mapViews.set(terrain,view);view.setVisible(this.world.terrain===terrain);if(this.world.terrain===terrain){this.mapView=view;this.cameraTarget.set(this.world.anchor.x,this.ground(this.world.anchor),this.world.anchor.z);this.terrainUpdate=()=>this.mapView?.update(this.camera);this.filterTextures(this.scene);}}).catch(error=>{this.modelErrors.push('map: '+String(error));this.world.paused=true;this.world.announce('无尽地图素材未能载入');}).finally(()=>{this.assetsPending--;this.mapSwitching=false;this.syncMap();this.world.changed();});
 }
 /** Required building models and the flat map must be GPU-ready before World may switch. */
 async prepareEndlessAssets(progress:(done:number,total:number,label:string)=>void=()=>{}){
  const terrain=this.world.endlessField;if(!(terrain instanceof FlatTerrain))throw Error('无尽地图定义不是独立平地');
  for(const type of ENDLESS.bossTypes)if(!this.gpu.has(type)&&!await this.ensureUnitVariant(type,type))throw Error('无尽首领模型未就绪：'+type);
  const ids=['model.fort.bunker','model.fort.bunker.death','model.fort.repair','model.fort.repair.death'];let done=0;
  await prepareEmbeddedAssetIds(ids);
  const loader=new GLTFLoader();for(const id of ids){const cachedKind:Fortification['kind']=id.includes('bunker')?'bunker':'repair';if((id.endsWith('.death')?this.fortDeathTemplates:this.fortTemplates).has(cachedKind)){progress(++done,ids.length+1,id);continue;}const source=assetUrl(id);if(!source)throw Error('缺少原版建筑模型：'+id);const gltf=await restoreSc2Materials(await loader.loadAsync(source));const kind:Fortification['kind']=id.includes('bunker')?'bunker':'repair',death=id.endsWith('.death');const clip=death?gltf.animations.find(action=>action.name==='Death'):gltf.animations.find(action=>action.name==='Stand');if(!clip)throw Error('原版建筑动作缺失：'+id);
   const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=(kind==='bunker'?3.2:4)/Math.max(size.x,size.z);const group=new THREE.Group();const model=clone(gltf.scene);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.scale.setScalar(scale);group.add(model);(death?this.fortDeathTemplates:this.fortTemplates).set(kind,group);this.fortClips.set(`${kind}:${death?'death':'stand'}`,clip);await this.renderer.compileAsync(group,this.camera,this.scene);this.preloadTextures(group);
   progress(++done,ids.length+1,id);
  }
  if(!this.mapViews.has(terrain)){const view=await createFlatMap(this.scene,terrain);this.mapViews.set(terrain,view);const root=this.scene.getObjectByName(FlatTerrain.id)!;this.preloadTextures(root);view.setVisible(true);try{await this.renderer.compileAsync(this.scene,this.camera);}finally{view.setVisible(false);}}
  progress(ids.length+1,ids.length+1,FlatTerrain.id);
 }
 private requiredFamilies():UnitType[]{
  const w=this.world;if(!w.expedition)return [];
  const families=new Set<UnitType>(w.expedition.familySlots);
  for(const u of w.entities.values())if(!isAirHeroType(u.unitType))families.add(u.unitType);
  for(const plan of Object.values(w.expedition.production))for(const family of plan?.outputs??[])if(plan?.enabled[family])families.add(family);
  for(const job of w.expedition.ledger)if(job.state!=='settled')families.add(job.family);
  for(const pod of w.pods)if(['falling','active','opening'].includes(pod.status)){families.add(pod.unitType);for(const guard of pod.guardTypes)families.add(guard);}
  const stage=w.endless?18:Math.min(18,w.stage+(w.phase==='reward'?1:0));
  for(const [family,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)families.add(family as UnitType);
  for(const type of w.endless?ENDLESS.bossTypes:BOSSES[stage]?[BOSSES[stage].type]:[])families.add(type);
  return [...families];
 }
 private modelKey(u:Entity):string{
  const base=u.modelKey??u.unitType;if(u.heroId||u.modelKey==='interceptor')return base;
  if(u.unitType==='tank')return base+(u.action==='sieging'||u.action==='unsieging'?'.morph':u.mode==='siege'?'.siege':'');
  if(!u.eliteId&&u.unitType==='hellion'&&u.nativeMode==='hellbat')return 'hellion.hellbat';
  if(!u.eliteId&&u.unitType==='viking'&&u.nativeMode==='viking_assault')return 'viking.assault';
  return base;
 }
 prepareRosterAssets(){if(!this.initialAssetsLoaded)return;this.syncMap();for(const family of this.requiredFamilies())if(!this.gpu.has(family))void this.ensureUnitVariant(family,family);
  for(const u of this.world.entities.values()){for(const key of [u.modelKey,this.modelKey(u)])if(key&&!this.gpu.has(key))void this.ensureUnitVariant(key,u.unitType);if(!u.heroId&&u.desiredNativeMode==='hellbat')void this.ensureUnitVariant('hellion.hellbat',u.unitType);if(!u.heroId&&u.desiredNativeMode==='viking_assault')void this.ensureUnitVariant('viking.assault',u.unitType);}
  for(const offer of this.world.rewards){if(offer.kind==='hero'&&Object.hasOwn(HEROES,offer.value)){const hero=HEROES[offer.value as HeroId];void this.ensureUnitVariant(hero.model,hero.baseFamily);}else if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)){const elite=ELITES[offer.value as EliteId];void this.ensureUnitVariant(elite.model,elite.family);}}
 }
 private podBirthTemplates=new Map<Race,GLTF>();private podDeathTemplates=new Map<Race,GLTF>();
 private async prepareWorkerDeath(key:string,height:number){
  if(this.gpu.has(key+'.death'))return;const id='model.'+key+'.death';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('工人死亡资源未就绪：'+key);
  const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));this.gpu.set(key+'.death',new AnimatedBatch(g,this.scene,height,this.gpu.get(key)?.normalization));
 }
 async prepareEliteSupportAssets(){if(!this.gpu.has('support.mine')){await prepareEmbeddedAssetIds(['model.support.mine']);const url=assetUrl('model.support.mine');if(!url)throw Error('蜘蛛雷素材未就绪');this.gpu.set('support.mine',new AnimatedBatch(await restoreSc2Materials(await new GLTFLoader().loadAsync(url)),this.scene,.5));}}
 async prepareRescueAssets(race:Race){
  if(race==='terran'&&!this.gpu.has('support.mine')){await prepareEmbeddedAssetIds(['model.support.mine']);const url=assetUrl('model.support.mine');if(!url)throw Error('蜘蛛雷素材未就绪');this.gpu.set('support.mine',new AnimatedBatch(await restoreSc2Materials(await new GLTFLoader().loadAsync(url)),this.scene,.5));}
  const {workerModel,carrierModel,carrierBirthModel,carrierDeathModel}=RESCUE_PRESENTATION[race],loader=new GLTFLoader();
  await prepareEmbeddedAssetIds([...racePreloadModels(race).keys()].filter(k=>!k.includes('.')).map(k=>'wireframe.'+k).filter(id=>ASSETS.has(id)));
  await prepareEmbeddedAssetIds(['model.'+workerModel,'model.'+carrierModel,'model.'+carrierDeathModel,...(carrierBirthModel?['model.'+carrierBirthModel]:[])]);
  if(!this.gpu.has(workerModel)){const url=assetUrl('model.'+workerModel);if(!url)throw Error('缺少原工人模型：'+workerModel);const height=workerModel==='scv'?1.35:workerModel==='probe'?.9:.7;this.gpu.set(workerModel,new AnimatedBatch(await restoreSc2Materials(await loader.loadAsync(url)),this.scene,height));}
  await this.prepareWorkerDeath(workerModel,workerModel==='scv'?1.35:workerModel==='probe'?.9:.7);
  if(!this.podTemplates.has(race)){const url=assetUrl('model.'+carrierModel);if(!url)throw Error('缺少原出兵载体：'+carrierModel);const g=await restoreSc2Materials(await loader.loadAsync(url));await this.renderer.compileAsync(g.scene,this.camera,this.scene);this.preloadTextures(g.scene);this.podTemplates.set(race,g);}
  if(!this.podDeathTemplates.has(race)){const url=assetUrl('model.'+carrierDeathModel);if(!url)throw Error('载体死亡资源未就绪');const g=await restoreSc2Materials(await loader.loadAsync(url));if(!g.animations.some(c=>/^Death/.test(c.name)))throw Error('载体死亡动作缺失');await this.renderer.compileAsync(g.scene,this.camera,this.scene);this.preloadTextures(g.scene);this.podDeathTemplates.set(race,g);}
  if(carrierBirthModel&&!this.podBirthTemplates.has(race)){const url=assetUrl('model.'+carrierBirthModel);if(!url)throw Error('缺少原水晶塔出现模型：'+carrierBirthModel);const g=await restoreSc2Materials(await loader.loadAsync(url));if(!g.animations.some(c=>c.name==='Stand Build End'))throw Error('原水晶塔出现动作缺失：Stand Build End');await preparePylonBirthMaterials(g);await this.renderer.compileAsync(g.scene,this.camera,this.scene);this.preloadTextures(g.scene);this.podBirthTemplates.set(race,g);}
 }
 async prepareNewRunAssets(race:Race,hero:HeroId|null,progress:(done:number,total:number,label:string)=>void=()=>{}){
  await this.prepareRescueAssets(race);
  const required=racePreloadModels(race);
  if(hero){const data=HEROES[hero];if(!data||data.race!==race)throw Error('开局英雄与种族不符');required.set(data.model,data.baseFamily);}
  let done=0;for(const [key,type] of required){if(!this.gpu.has(key)&&!await this.ensureUnitVariant(key,type))throw Error('开局模型未就绪：'+key);progress(++done,required.size,key);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  await this.prepareEndlessAssets((done,total,label)=>progress(done,total,label));
 }
 async prepareCurrentAssets(progress:(done:number,total:number,label:string)=>void=()=>{}){
  await this.prepareRescueAssets(this.world.expedition.race);
  const required=new Map<string,UnitType>();for(const type of this.requiredFamilies())required.set(type,type);
  for(const unit of this.world.entities.values())if(unit.hp>0&&unit.modelKey)required.set(unit.modelKey,unit.unitType);
  if(this.world.eliteChoice){const elite=ELITES[this.world.eliteChoice];required.set(elite.model,elite.family);}
  for(const offer of this.world.rewards){if(offer.kind==='hero'&&Object.hasOwn(HEROES,offer.value)){const hero=HEROES[offer.value as HeroId];required.set(hero.model,hero.baseFamily);}else if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)){const elite=ELITES[offer.value as EliteId];required.set(elite.model,elite.family);}}
  for(const entry of this.world.expedition.bossLootQueue){const effect=entry.reward.expeditionEffect;if(effect.kind==='elite')for(const elite of this.world.eliteVariants(effect.family))required.set(elite.model,elite.family);else if(effect.kind==='hero'){const hero=HEROES[effect.heroId as HeroId];required.set(hero.model,hero.baseFamily);}}
  for(const offer of this.world.rewards)if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value))for(const elite of this.world.eliteVariants(ELITES[offer.value as EliteId].family))required.set(elite.model,elite.family);
  for(const contract of this.world.expedition.eliteContracts)if(!contract.purchased)for(const elite of this.world.eliteVariants(contract.family))required.set(elite.model,elite.family);
  if(this.world.expedition.pendingShopElite){const elite=ELITES[this.world.expedition.pendingShopElite.variantId];required.set(elite.model,elite.family);}
  let done=0;for(const [key,type] of required){if(!this.gpu.has(key)&&!await this.ensureUnitVariant(key,type))throw Error('增援模型未就绪：'+key);progress(++done,required.size,key);}
 }
 async prepareSnapshotAssets(snapshot:RunSnapshot,progress:(done:number,total:number,label:string)=>void=()=>{}){
  await this.prepareRescueAssets(snapshot.state.expedition.race);
  const required:Map<string,UnitType>=racePreloadModels(snapshot.config.race);
  for(const family of snapshot.state.expedition.familySlots)required.set(family,family);
  for(const entry of snapshot.state.expedition.bossLootQueue){const effect=entry.reward.expeditionEffect;if(effect.kind==='elite')for(const elite of Object.values(ELITES).filter(e=>e.family===effect.family))required.set(elite.model,elite.family);else if(effect.kind==='hero'){const hero=HEROES[effect.heroId as HeroId];required.set(hero.model,hero.baseFamily);}}
  for(const plan of Object.values(snapshot.state.expedition.production))for(const family of plan?.outputs??[])if(plan?.enabled[family])required.set(family,family);
  for(const job of snapshot.state.expedition.ledger)if(job.state!=='settled')required.set(job.family,job.family);
  const stage=snapshot.state.battlefield.mode==='endless'?18:Math.min(18,snapshot.state.stage+(snapshot.state.phase==='reward'?1:0));
  for(const [family,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)required.set(family as UnitType,family as UnitType);
  for(const type of snapshot.state.battlefield.mode==='endless'?ENDLESS.bossTypes:BOSSES[stage]?[BOSSES[stage].type]:[])required.set(type,type);
  for(const unit of snapshot.state.entities.values())if(unit.hp>0){if(!isAirHeroType(unit.unitType))required.set(unit.unitType,unit.unitType);if(unit.modelKey)required.set(unit.modelKey,unit.unitType);}
  for(const pod of snapshot.state.pods)if(['falling','active','opening'].includes(pod.status)){required.set(pod.unitType,pod.unitType);for(const guard of pod.guardTypes)required.set(guard,guard);}
  for(const reward of snapshot.state.rewards){if(reward.kind==='hero'&&Object.hasOwn(HEROES,reward.value)){const hero=HEROES[reward.value as HeroId];required.set(hero.model,hero.baseFamily);}else if(reward.kind==='elite'&&Object.hasOwn(ELITES,reward.value)){const elite=ELITES[reward.value as EliteId];required.set(elite.model,elite.family);}}
  const offerFamilies=snapshot.state.rewards.filter(offer=>offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)).map(offer=>ELITES[offer.value as EliteId].family);
  for(const contract of snapshot.state.expedition.eliteContracts)if(!contract.purchased)offerFamilies.push(contract.family);
  for(const family of offerFamilies)for(const elite of Object.values(ELITES).filter(e=>e.family===family))required.set(elite.model,elite.family);
  if(snapshot.state.expedition.pendingShopElite){const elite=ELITES[snapshot.state.expedition.pendingShopElite.variantId];required.set(elite.model,elite.family);}
  let done=0;for(const [key,type] of required){if(!this.gpu.has(key)&&!await this.ensureUnitVariant(key,type))throw Error('必需单位模型未就绪：'+key);progress(++done,required.size,key);}
  await this.prepareEndlessAssets((n,total,label)=>progress(required.size+n,required.size+total,label));
 }
 private prepareUnit(type:UnitType,gltf:GLTF){gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=heights[type]*TUNING.unitScale/Math.max(.001,size.y);
  const batch:UnitBatch={gltf,meshes:[],data:[],scale,center,minY:box.min.y,clips:mapAnimations(gltf.animations)};
  if(gltf.animations.length){this.gpu.set(type,new AnimatedBatch(gltf,this.scene,heights[type],undefined,TUNING.unitScale,type));gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)this.loadedTextures++;});this.batches.set(type,batch);return;}
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
 private makeFortView(id:number,kind:Fortification['kind']):THREE.Group{const template=this.fortTemplates.get(kind),clip=this.fortClips.get(`${kind}:stand`);if(!template||!clip)throw Error('真实 SC 建筑及动作未准备：'+kind);const group=clone(template) as THREE.Group,mixer=new THREE.AnimationMixer(group);mixer.clipAction(clip).play();this.fortMixers.set(id,mixer);this.scene.add(group);return group;}
 private playFortDeath(id:number,kind:Fortification['kind'],position:THREE.Vector3){const template=this.fortDeathTemplates.get(kind),clip=this.fortClips.get(`${kind}:death`);if(!template||!clip)return;const group=clone(template) as THREE.Group,mixer=new THREE.AnimationMixer(group);group.position.copy(position);mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();this.scene.add(group);this.fortDeathViews.set(id,{group,mixer,until:this.world.time+clip.duration});}
 private playHiveDeath(id:number,position:THREE.Vector3,width=6){
  const g=this.hiveDeathTemplate,clip=g?.animations.find(c=>/^Death/.test(c.name));if(!g||!clip||this.hiveDeaths.has(id))return;
  const root=new THREE.Group(),body=clone(g.scene),mixer=new THREE.AnimationMixer(body);const action=mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);body.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(body),center=box.getCenter(new THREE.Vector3()),scale=width/Math.max(.01,box.max.x-box.min.x,box.max.z-box.min.z);body.scale.setScalar(scale);body.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.add(body);root.position.copy(position);this.scene.add(root);this.hiveDeaths.set(id,{root,mixer,at:this.world.time,duration:Math.min(6,clip.duration),sourceDuration:clip.duration});
 }
 private removeHiveDeath(id:number){const d=this.hiveDeaths.get(id);if(!d)return;d.mixer.stopAllAction();d.mixer.uncacheRoot(d.mixer.getRoot());d.root.removeFromParent();const skeletons=new Set<THREE.Skeleton>();d.root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const skeleton of skeletons)skeleton.dispose();this.hiveDeaths.delete(id);}
 private visible(p:Point){return Math.abs(p.x-this.cameraTarget.x)<Math.max(20,this.camera.right+5)&&Math.abs(p.z-this.cameraTarget.z)<24;}
 render(dt:number,alpha:number){const world=this.world;this.frames++;this.tickTime+=dt;if(this.tickTime>=.5){this.fps=this.frames/this.tickTime;this.frames=0;this.tickTime=0;}this.frameMs=dt*1000;this.frameTimes.push(this.frameMs);if(this.frameTimes.length>240)this.frameTimes.shift();
  resetUploadStats();this.cameraTarget.lerp(_vec.set(world.anchor.x,this.ground(world.anchor),world.anchor.z),1-Math.exp(-dt*6));this.camera.position.set(this.cameraTarget.x,34+this.cameraTarget.y,this.cameraTarget.z+26);this.camera.lookAt(this.cameraTarget);this.camera.updateMatrixWorld();this.terrainUpdate();this.anchor.position.set(world.anchor.x,this.ground(world.anchor)+.04,world.anchor.z);this.grid.visible=this.showGrid;
  this.protossHeroes.beginFrame();
  const counts=new Map<UnitType,number>();let bars=0,line=0,ring=0,shadows=0;
  for(const [key,b] of this.gpu){b.animationMode=this.animationMode;b.setLod(ordinaryLodKeys.has(key)&&(this.quality!=='native'||heights[key.split('.')[0] as UnitType]*this.viewportHeight/(this.camera.top-this.camera.bottom)<28));b.begin();}
  const poseTime=world.time-(world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision?(1-alpha)/60:0);
  for(const event of world.visualEvents){if(event.serial<=this.lastVisual)continue;this.lastVisual=event.serial;if(event.kind==='hit')this.hitTimes.set(event.entityId,event.time);if(event.kind==='death'&&event.unitType)this.corpses.set(event.entityId,{scale:world.entities.get(event.entityId)?modelPresentationScale(world.entities.get(event.entityId)!):1,type:event.modelKey??event.unitType,x:event.x,z:event.z,y:event.flying?AIR_HEIGHT:this.ground(event),facing:event.facing,at:event.time});}
  const putLine=(a:Point,ay:number,b:Point,by:number,color:number)=>{if(line>=990)return;const offset=line*6;this.linePositions.set([a.x,ay,a.z,b.x,by,b.z],offset);_color.set(color);this.lineColors.set([_color.r,_color.g,_color.b,_color.r,_color.g,_color.b],offset);line++;};
  const putRing=(p:Point,r:number,color:number)=>{if(ring>=1400)return;this.rings.setMatrixAt(ring,this.matrix(p.x,this.ground(p)+.09,p.z,r,1,r));this.rings.setColorAt(ring++,_color.set(color));};
  // Reserve warning instances before friendly decoration consumes these bounded pools.
  if(world.hiveWarningPoint){putRing(world.hiveWarningPoint,2.8,0xff9f53);putRing(world.hiveWarningPoint,1.2+Math.abs(Math.sin(world.time*5)),0xff5244);}
  for(const cast of world.campaign18Runtime?.mainCombat?.casts??[]){if(cast.kind==='bile'){putRing(cast.point,cast.radius,0xff6846);putRing(cast.point,cast.radius*Math.max(.08,(cast.at-world.time)/1.5),0xffdf92);}else {const angles=cast.kind==='fan'?Array.from({length:5},(_,i)=>cast.angle+(i-2)*.22):[cast.angle];for(const angle of angles){const end={x:cast.origin.x+Math.sin(angle)*cast.range,z:cast.origin.z+Math.cos(angle)*cast.range};putLine(cast.origin,this.ground(cast.origin)+.14,end,this.ground(end)+.14,cast.kind==='fan'?0xffa36e:0xff645b);if(cast.kind==='line')for(const side of [-1,1])putLine({x:cast.origin.x+Math.cos(angle)*cast.radius*side,z:cast.origin.z-Math.sin(angle)*cast.radius*side},this.ground(cast.origin)+.12,{x:end.x+Math.cos(angle)*cast.radius*side,z:end.z-Math.sin(angle)*cast.radius*side},this.ground(end)+.12,0xff645b);}}}
  for(const c of world.enemySpecials.casts){const color=0xff763d;if(c.kind==='bile'||c.kind==='acid')for(const p of c.points)putRing(p,c.radius,color);else {const a=c.angle,ends=c.kind==='fan'||c.kind==='spikes'?Array.from({length:c.count},(_,i)=>a+(i-(c.count-1)/2)*.2):c.kind==='cone'?[a-.6,a+.6]:[a];for(const angle of ends){const end={x:c.origin.x+Math.sin(angle)*c.range,z:c.origin.z+Math.cos(angle)*c.range};putLine(c.origin,this.ground(c.origin)+.1,end,this.ground(end)+.1,color);if(c.kind==='spikes')for(const side of [-1,1])putLine({x:c.origin.x+Math.cos(angle)*c.radius*side,z:c.origin.z-Math.sin(angle)*c.radius*side},this.ground(c.origin)+.1,{x:end.x+Math.cos(angle)*c.radius*side,z:end.z-Math.sin(angle)*c.radius*side},this.ground(end)+.1,color);}putRing(c.origin,.6,color);}}
  for(const zone of world.enemySpecials.acidZones)putRing(zone.point,zone.radius,0xa2e87b);
  const weaponMount=(event:VisualEvent,side?:'Left'|'Right')=>{
   const key=event.modelKey??event.unitType,model=key?this.gpu.get(key+(event.siege?'.siege':'')):null,skill=event.kind==='skill-launch'||event.kind==='skill-line',action=skill?'skill':attackAction(event.unitType,event.shotSequence);
   const pose=event.weaponPoseSeconds??(skill?0:Math.min(model?.actions[action]?.duration??0,(event.unitType?SC2_UNITS[event.unitType].damagePoint:0)*1.4));
   const mountSide=event.heroId==='hots_leviathan'&&!skill?String(2+((event.shotSequence??1)-1)%4).padStart(2,'0'):side;
   const weapon=model?.weaponAt(action,pose,mountSide),unit=world.entities.get(event.entityId),scale=unit?modelPresentationScale(unit):event.unitType?modelPresentationScale({modelKey:event.modelKey,heroId:event.heroId,eliteId:event.eliteId,unitType:event.unitType,flying:event.flying}):1;return weaponWorldPoint(event,weapon??{x:0,y:.6,z:.6},scale,this.ground(event));
  };
  const health=(b:Body,y:number)=>{if(bars>=400)return;const width=Math.max(.7,b.unitRadius*2),ratio=Math.max(0,b.hp/b.maxHp);this.healthBack.setMatrixAt(bars,this.matrix(b.x,y,b.z,width,1,1));this.health.setMatrixAt(bars,this.matrix(b.x-(1-ratio)*width/2,y+.015,b.z,width*ratio,1,1));this.health.setColorAt(bars++,_color.set(b.owner==='terran'?(ratio<.3?0xff7852:0x75ef95):0xd9573c));const u=b as Entity;if(u.team==='player'&&(u.maxShield??0)>0&&bars<400){const shield=Math.max(0,(u.shield??0)/u.maxShield!);this.healthBack.setMatrixAt(bars,this.matrix(b.x,y+.025,b.z-.15,width,1,.55));this.health.setMatrixAt(bars,this.matrix(b.x-(1-shield)*width/2,y+.04,b.z-.15,width*shield,1,.55));this.health.setColorAt(bars++,_color.set(0x65b5ff));}};
  for(const u of world.entities.values()){const batch=this.batches.get(u.unitType);if(!batch&&!this.gpu.has(u.modelKey??u.unitType)||!this.visible(u)||!world.visibleTo(u,'terran'))continue;const fleetPose=this.protossHeroes.childPresentation(u),dying=u.hp<=0,death=dying?Math.max(0,1-(world.time-(u.deadAt??world.time))/1.3):1,presentationScale=(fleetPose?.scale??modelPresentationScale(u))*(u.hp>0&&u.team==='player'&&world.expedition.race==='zerg'&&u.attributes.includes('Biological')&&world.expedition.support.unique.activeUntil>world.time?1.12:1),recoveryScale=u.unitType==='baneling'&&(u.recoveryUntil??0)>world.time?.84+.04*Math.sin(world.time*5):1;
   const index=counts.get(u.unitType)??0;if(index>=UNIT_CAPACITY)continue;counts.set(u.unitType,index+1);
   const transit=u.cliffTransit?cliffRenderPosition(u,world.time):null,x=fleetPose?.point.x??transit?.x??u.prev.x+(u.x-u.prev.x)*alpha,z=fleetPose?.point.z??transit?.z??u.prev.z+(u.z-u.prev.z)*alpha,y=fleetPose?.point.y??(u.flying?AIR_HEIGHT:this.ground({x,z})+(transit?.lift??0));
   if(u.hp>0&&shadows<1400)this.shadows.setMatrixAt(shadows++,this.matrix(x,this.ground({x,z})+.012,z,u.unitRadius*1.9,1,u.unitRadius*1.7));
   if(this.gpu.has(u.modelKey??u.unitType)){
    const baseKey=u.modelKey??u.unitType;if(u.modelKey&&!this.gpu.has(baseKey)){void this.ensureUnitVariant(baseKey,u.unitType);continue;}
    if(dying){if(!this.corpses.has(u.id))this.corpses.set(u.id,{scale:presentationScale,type:baseKey,x,z,y,facing:u.facing,at:u.deadAt??world.time});continue;}
    const key=fleetPose?.modelKey??this.modelKey(u);if(!this.gpu.has(key)){void this.ensureUnitVariant(key,u.unitType);continue;}
    const model=this.gpu.get(key)??this.gpu.get(baseKey)!;let state=this.animationStates.get(u.id);const signature=key+':'+(u.zergEliteCombat?.burrowPhase??0)+':'+u.nativeMode+':'+u.desiredNativeMode+':'+u.nativeModeUntil+':'+u.action+(u.action==='attack'?':'+u.lastShotAt:'');
    if(!state||state.action!==signature){state={...state,action:signature,since:world.time,modeDuration:u.nativeModeUntil?u.nativeModeUntil-world.time:u.modeTimer,playback:state?.playback??{},poseClock:state?.poseClock??{}};this.animationStates.set(u.id,state);}
    let seconds=Math.max(0,poseTime-state.since);const nativeAction=revisedZergElite(u)&&u.unitType==='roach'&&u.zergEliteCombat?.burrowPhase?(u.zergEliteCombat.burrowPhase===1?'burrow':u.zergEliteCombat.burrowPhase===2?'burrowIdle':'unburrow'):!u.heroId&&u.unitType==='lurker'?(u.nativeModeUntil?(u.desiredNativeMode==='lurker_burrowed'?'burrow':'unburrow'):u.nativeMode==='lurker_burrowed'?(u.action==='attack'?'burrowAttack':'burrowIdle'):u.action):!u.heroId&&u.unitType==='thor'?(u.nativeModeUntil?(u.desiredNativeMode==='thor_high_impact'?'highImpactMorph':'highImpactUnmorph'):u.nativeMode==='thor_high_impact'?(u.action==='attack'?(world.body(u.attackTarget??-1)?.flying?'highImpactAttack':'attack'):'highImpactIdle'):u.action):u.action;const p=model.pose(nativeAction);let once=['attack','skill','spawn','sieging','unsieging'].includes(u.action)||!!u.nativeModeUntil||nativeAction==='burrowIdle';
    if(nativeAction==='burrowIdle'&&p)seconds=p.duration;
    else if(revisedZergElite(u)&&u.zergEliteCombat?.burrowPhase&&p)seconds=Math.min(1,(poseTime-u.zergEliteCombat.burrowAt)/.6)*p.duration;
    else if(u.nativeModeUntil&&p)seconds=(1-Math.max(0,u.nativeModeUntil-world.time)/Math.max(1/60,state.modeDuration))*p.duration;
    else if(u.action==='skill')seconds=Math.max(0,poseTime-(u.lastSkillAt??world.time));
    else if(u.action==='move')seconds=u.cliffTransit?poseTime-u.cliffTransit.startedAt:Math.max(0,u.distanceWalked-(world.time-poseTime)*Math.hypot(u.velocity.x,u.velocity.z))/SC2_UNITS[u.unitType].movementSpeed;
    else if((u.action==='sieging'||u.action==='unsieging')&&p)seconds=(1-u.modeTimer/Math.max(1/60,state.modeDuration))*p.duration;
    else if(u.action==='attack')seconds=Math.max(0,world.time-u.lastShotAt)*1.4;
    const shot=revisedZergElite(u)&&u.zergEliteCombat?.burrowPhase?null:selectAttackPresentation(u,Math.max(poseTime,u.lastShotAt),model.actions,state.playback);
    let displayAction:keyof ReturnType<typeof mapAnimations>=nativeAction,attackSeconds=-1,shotAction=attackAction(u.unitType,u.shotSequence) as keyof ReturnType<typeof mapAnimations>;
    if(shot){shotAction=shot.action;if(shot.overlay){attackSeconds=shot.seconds;displayAction=u.action==='move'?'move':model.actions.ready?'ready':'idle';}else{displayAction=nativeAction==='highImpactIdle'&&world.body(u.attackTarget??-1)?.flying?'highImpactAttack':shot.action;seconds=shot.seconds;once=shot.once;}}
    else if((u.recoveryUntil??0)>world.time){displayAction='idle';seconds=0;once=false;}
    else if(u.action==='attack'&&!u.windup&&nativeAction===u.action){displayAction=model.actions.ready?'ready':'idle';once=false;}
    const eventKey=signature+':'+displayAction+':'+u.shotSequence+':'+u.lastSkillAt+':'+(this.hitTimes.get(u.id)??'');
    const sampledAt=samplePoseClock(state.poseClock,this.animationMode,poseTime,eventKey);
    if(!state.sampled||sampledAt!==state.sampled.at||state.sampled.action!==displayAction)state.sampled={at:sampledAt,action:displayAction,seconds,once,attackSeconds,attackKey:shotAction};
    const sampled=state.sampled;
    model.add(x,y,z,fleetPose?.facing??u.facing,sampled.action,sampled.seconds,sampled.once,Math.max(0,1-(world.time-(this.hitTimes.get(u.id)??-100))/.2),presentationScale*recoveryScale,this.animationMode==='complete',sampled.attackSeconds,u.unitType==='tank'&&u.modeTimer<=0?u.attackFacing-u.facing:0,modelPresentationAccent(u)||(u.enemyTier==='boss'||u.enemyTier==='lord'?2:u.enemyTier==='elite'?1:0),sampled.attackKey,true);

   }else{
    _obj.position.set(x,y,z);_obj.rotation.set(dying?Math.PI/2*(1-death):u.unitType==='baneling'?u.distanceWalked*2:0,u.facing,0);_obj.scale.setScalar(Math.max(.01,death)*presentationScale*recoveryScale);_obj.updateMatrix();
    let mode=u.mode==='siege'?1:0;if(u.action==='sieging')mode=1-u.modeTimer/2.887;if(u.action==='unsieging')mode=u.modeTimer/2.53;
    const motion=[u.distanceWalked+u.id*.29,dying?0:Math.min(1,Math.hypot(u.velocity.x,u.velocity.z)/2),u.action==='attack'?Math.min(1,u.attackLock*5):0,Math.max(0,Math.min(1,mode))];
    batch!.meshes.forEach((m,i)=>{m.setMatrixAt(index,_obj.matrix);batch!.data[i].setXYZW(index,...motion as [number,number,number,number]);});
   }
   if(!dying&&u.enemyTier)putRing(u,u.unitRadius+.15,u.enemyTier==='lord'?0xff4b42:u.enemyTier==='boss'?0xff972d:0xd95972);
   if(!dying&&u.owner==='terran'&&(world.statuses.list(u.id,world.time).length||world.zoneSlowed.has(u.id)))putRing(u,u.unitRadius+.4,0xff664c);
   if(!dying&&u.owner==='zerg'&&(world.auraArmor.has(u.id)||world.auraDamage.has(u.id)||world.statuses.value(u.id,'bloodlust',world.time)>0))putRing(u,u.unitRadius+.35,0xffb455);
   if(!dying&&this.showColliders)putRing(u,u.unitRadius,u.flying?0x7ac7ff:u.owner==='terran'?0x82eeab:0xffa865);
   if(!dying&&!fleetPose&&!u.heroId&&(u.owner==='terran'||u.hp<u.maxHp||!!u.enemyTier))health(transit?{...u,x,z}:u,y+heights[u.unitType]*TUNING.unitScale*presentationScale+.22);
  }
  for(const [type,b] of this.batches){b.meshes.forEach((m,i)=>{const count=counts.get(type)??0;commitInstances(m,count);uploadActive(b.data[i],count);});}
  for(const [id,c] of this.corpses){const model=this.gpu.get(c.type+'.death')??this.gpu.get(c.type);const age=world.time-c.at,life=Math.min(5,Math.max(1.5,model?.pose('dead')?.duration??1.5));if(age>life+.4){this.corpses.delete(id);continue;}if(model&&this.visible(c)){const hologram=c.type==='elite.science_vessel.1'&&!model.actions.dead;model.add(c.x,c.y,c.z,c.facing,hologram?'idle':'dead',hologram?0:deathPoseTime(age,model.pose('dead')?.duration??life,life),true,0,(age>life?Math.max(.01,1-(age-life)/.4):1)*c.scale,true,-1,0,hologram?-1-Math.min(1,age/life):0);}}
  for(const [id] of this.animationStates)if(!world.entities.has(id)){this.animationStates.delete(id);this.hitTimes.delete(id);}
  for(const [id,at] of this.hitTimes)if(world.time-at>.25)this.hitTimes.delete(id);
  for(const e of world.economicTargets.values()){if(!this.visible(e))continue;const age=world.time-(e.resolvedAt??world.time),model=this.gpu.get(e.kind);if(e.status==='active'){model?.add(e.x,this.ground(e),e.z,e.facing,e.kind==='drone'?'move':'idle',world.time*1.4);health(e,this.ground(e)+1.65);if(e.kind==='egg')putRing(e,1.1+.08*Math.sin(world.time*4),0xffd67d);}else if(e.kind==='egg'&&e.status==='rescued'&&age<3.8){this.gpu.get(RESCUE_PRESENTATION[world.expedition.race].workerModel)?.add(e.x,this.ground(e),e.z,e.facing,'idle',age*1.4,false,0,age>3.4?Math.max(.01,(3.8-age)/.4):1);putRing(e,1.1,0x8be8a5);}else {const death=this.gpu.get(e.kind+'.death')??model,life=Math.min(5,death?.pose('dead')?.duration??1.5);if(age<life+.3)death?.add(e.x,this.ground(e),e.z,e.facing,'dead',deathPoseTime(age,death?.pose('dead')?.duration??life,life),true,0,age>life?Math.max(.01,1-(age-life)/.3):1);}}
  if(world.expedition.race==='zerg')for(const impact of world.expedition.support.impacts)if(impact.kind==='strategic'&&this.visible(impact.point))this.gpu.get('egg')?.add(impact.point.x,this.ground(impact.point)+Math.max(0,impact.at-world.time)*6,impact.point.z,world.time,'idle',world.time,false,0,2);
  if(world.expedition.race!=='protoss')for(const mine of world.expedition.support.mines){if(!this.visible(mine.point))continue;this.gpu.get(world.expedition.race==='terran'?'support.mine':'egg')?.add(mine.point.x,this.ground(mine.point)+(world.expedition.race==='terran'?(mine.phase==='buried'?-.22:mine.phase==='emerging'?-.22*Math.max(0,Math.min(1,(mine.emergeAt-world.time)/.25)):0):0),mine.point.z,mine.facing,'idle',world.time,false,0,world.expedition.race==='zerg'?.4:1);}
  for(const b of this.gpu.values())b.end();
  for(const p of world.pods){
   // Completed pods keep their simulation record, but expired skeletal views leave the scene.
   if((p.status==='rescued'||p.status==='destroyed')&&world.time-(p.resolvedAt??world.time)>=7){this.podViews.get(p.id)?.dispose();this.podViews.delete(p.id);this.podLabels.get(p.id)?.remove();this.podLabels.delete(p.id);continue;}
   this.podLabel(p);let v=this.podViews.get(p.id);const template=this.podTemplates.get(world.expedition.race);if(!v&&template){v=new PodView(template,this.scene,world.expedition.race,this.podBirthTemplates.get(world.expedition.race),this.podDeathTemplates.get(world.expedition.race));this.podViews.set(p.id,v);}v?.update(p,world.time,this.visible(p),this.ground(p));
   if(this.showColliders&&(p.status==='active'||p.status==='opening'))putRing(p,p.unitRadius,0xffc26d);}
  if(world.hive){if(!this.hiveView&&this.hiveTemplate){this.hiveView=clone(this.hiveTemplate);this.scene.add(this.hiveView);}if(this.hiveView){this.hiveView.position.set(world.hive.x,this.ground(world.hive),world.hive.z);this.hiveView.visible=world.hive.hp>0;if(this.hiveWasAlive&&world.hive.hp<=0)this.playHiveDeath(world.hive.id,this.hiveView.position);}if(world.hive.hp>0)health(world.hive,this.ground(world.hive)+4);this.hiveWasAlive=world.hive.hp>0;}
  for(const [id,v] of this.expansionViews)if(!world.expansionHives.has(id)){this.playHiveDeath(id,v.position,4.8);v.removeFromParent();this.expansionViews.delete(id);}
  for(const hive of world.expansionHives.values()){let v=this.expansionViews.get(hive.id);if(!v&&this.hiveTemplate){v=clone(this.hiveTemplate);v.scale.multiplyScalar(.8);this.scene.add(v);this.expansionViews.set(hive.id,v);}if(v){v.position.set(hive.x,this.ground(hive),hive.z);v.visible=this.visible(hive);}health(hive,this.ground(hive)+3.2);putRing(hive,hive.unitRadius+.35,world.hiveFrenzy?0xff6851:0xb97b5b);}
  for(const [id,death] of this.hiveDeaths){const age=world.time-death.at;if(age>death.duration)this.removeHiveDeath(id);else death.mixer.setTime(deathPoseTime(age,death.sourceDuration,death.duration));}
  const fortDt=Math.max(0,Math.min(.1,world.time-this.fortVisualTime));this.fortVisualTime=world.time;
  for(const [id,v] of this.fortViews)if(!world.fortifications.has(id)&&world.expedition.support.unique.landing?.id!==id){const kind=v.userData.fortKind as Fortification['kind']|undefined;if(kind&&!(v.userData.supportUntil&&world.time>=v.userData.supportUntil))this.playFortDeath(id,kind,v.position);this.fortMixers.get(id)?.stopAllAction();this.fortMixers.delete(id);v.removeFromParent();this.fortViews.delete(id);}
  const landing=world.expedition.support.unique.landing;
  if(landing){let v=this.fortViews.get(landing.id);if(!v){v=this.makeFortView(landing.id,'bunker');this.fortViews.set(landing.id,v);}v.position.set(landing.point.x,this.ground(landing.point)+Math.max(0,landing.at-world.time)*8,landing.point.z);v.visible=this.visible(landing.point);}
  for(const fort of world.fortifications.values()){let v=this.fortViews.get(fort.id);if(!v){v=this.makeFortView(fort.id,fort.kind);v.userData.fortKind=fort.kind;v.userData.supportUntil=fort.supportUntil;this.fortViews.set(fort.id,v);}v.userData.fortKind=fort.kind;v.userData.supportUntil=fort.supportUntil;v.position.set(fort.x,this.ground(fort),fort.z);v.visible=this.visible(fort);if(v.visible){health(fort,this.ground(fort)+2.4);putRing(fort,fort.unitRadius+.2,fort.kind==='bunker'?0x71c4fa:0x70e7c9);}}
  for(const mixer of this.fortMixers.values())mixer.update(fortDt);
  for(const [id,death] of this.fortDeathViews){death.mixer.update(fortDt);if(world.time>=death.until){death.mixer.stopAllAction();death.group.removeFromParent();this.fortDeathViews.delete(id);}}
  for(const fx of world.effects){if(fx.until<=world.time)continue;const hero=world.entities.get(fx.source)?.heroId;if(hero&&(fx.kind==='bile'||fx.kind==='explosion'||fx.kind==='hero-line'))continue;if(fx.kind==='bile'){putRing(fx.end,fx.radius+1,0xff7138);putRing(fx.end,Math.max(.15,(fx.until-world.time)/2.5*(fx.radius+1)),0xffda84);}else if(fx.kind==='hero-warning'){/* Authored charge at the actual weapon replaces a generic friendly ring. */}else if(fx.kind==='scan-warning'){putRing(fx.end,fx.radius,0xff6357);putRing(fx.end,Math.max(.15,fx.radius*(1-(fx.until-world.time))),0xffb26b);}else if(fx.kind==='hero-line'){/* Actual area ticks produce spikes / heat lances. */}else if(fx.kind==='explosion'&&(!world.entities.has(fx.source)||!(revisedElite(world.entities.get(fx.source)!)||revisedZergElite(world.entities.get(fx.source)!))))putRing(fx.end,fx.radius*(1+(fx.until-world.time)),0xffbc59);}

  for(const mine of world.eliteSupport.mines){if(!this.visible(mine.point))continue;this.gpu.get('support.mine')?.add(mine.point.x,this.ground(mine.point)+(mine.phase==='buried'?-.3:mine.phase==='emerging'?-.3*Math.max(0,Math.min(1,(mine.emergeAt-world.time)/.25)):0),mine.point.z,mine.facing,mine.phase==='chasing'?'move':'idle',world.time,false,0,1.6);}
  for(const field of world.expedition?.detectionFields??[])if(field.until>world.time){const color=field.team==='player'?(world.expedition?.race==='zerg'?0xc5a1ef:world.expedition?.race==='protoss'?0xffdd84:0x63dce8):0xff7963;putRing(field,field.radius,color);for(let i=0;i<4;i++){const a=world.time*.4+i*Math.PI/2;putLine({x:field.x+Math.cos(a)*(field.radius-.6),z:field.z+Math.sin(a)*(field.radius-.6)},this.ground(field)+.12,{x:field.x+Math.cos(a)*field.radius,z:field.z+Math.sin(a)*field.radius},this.ground(field)+.12,color);}}
  if(this.targetPreview&&document.body.dataset.targetFamily==='tactical'){const p=this.targetPreview,d=Math.hypot(p.x-world.anchor.x,p.z-world.anchor.z);if(d>.01){const dx=(p.x-world.anchor.x)/d,dz=(p.z-world.anchor.z)/d;for(const side of [-1,1]){const from={x:world.anchor.x+dz*side,z:world.anchor.z-dx*side},to={x:from.x+dx*14,z:from.z+dz*14};putLine(from,this.ground(from)+.12,to,this.ground(to)+.12,0x90ddff);}}}
  if(this.targetPreview){putRing(this.targetPreview,.8,0x90ddff);putLine(world.anchor,this.ground(world.anchor)+.1,this.targetPreview,this.ground(this.targetPreview)+.1,0x90ddff);}
  for(const [id,el] of this.enemyLabels)if((world.entities.get(id)?.hp??0)<=0){el.remove();this.enemyLabels.delete(id);}
  for(const u of world.entities.values())if(u.enemyTier&&u.hp>0){let el=this.enemyLabels.get(u.id);if(!el){el=document.createElement('div');el.className='enemy-special-label '+u.enemyTier;this.enemyLabels.set(u.id,el);this.labelLayer.append(el);}el.hidden=!this.visible(u)||world.phase!=='battle'||!world.visibleTo(u,'terran');if(!el.hidden){const effects=[statusReadout(world,u).short,world.auraArmor.has(u.id)?'甲壳护卫':'',world.auraDamage.has(u.id)?'狂热':'',world.hiveFrenzy?'亢奋':''].filter(Boolean).join(' · '),label=(u.enemyTier==='lord'?'♛ ':'')+(u.enemyName??'')+(effects?' · '+effects:'');if(el.textContent!==label)el.textContent=label;_vec.set(u.x,this.ground(u)+heights[u.unitType]*(u.visualScale??1)+.6,u.z).project(this.camera);el.style.transform=`translate(${(_vec.x*.5+.5)*this.viewportWidth}px,${(.5-_vec.y*.5)*this.viewportHeight}px) translate(-50%,-100%)`;}}
  this.friendlyLabels.update(world,u=>{const key=this.modelKey(u),model=this.gpu.get(key);const transit=u.cliffTransit?cliffRenderPosition(u,world.time):null,x=transit?.x??u.prev.x+(u.x-u.prev.x)*alpha,z=transit?.z??u.prev.z+(u.z-u.prev.z)*alpha,y=(u.flying?AIR_HEIGHT:this.ground({x,z})+(transit?.lift??0))+(model?.bodyHeight??heights[u.unitType]*TUNING.unitScale)*modelPresentationScale(u)+.25;_vec.set(x,y,z).project(this.camera);return {x:(_vec.x*.5+.5)*this.viewportWidth,y:(.5-_vec.y*.5)*this.viewportHeight,visible:!!model&&_vec.x>-1&&_vec.x<1&&_vec.y>-1&&_vec.y<1&&_vec.z>-1&&_vec.z<1};},this.viewportWidth);
  this.destinationMarker.visible=world.phase==='battle'&&!!world.order;if(world.order){this.destinationMarker.position.set(world.order.point.x,this.ground(world.order.point)+.15,world.order.point.z);this.destinationMarker.scale.setScalar(1+.06*Math.sin(world.time*7));}
  commitInstances(this.shadows,shadows);commitInstances(this.rings,ring);
  for(const m of [this.health,this.healthBack])commitInstances(m,bars);
  const lootIds=new Set(world.rewardDrops.map(p=>p.id));for(const [id,el] of this.lootLabels)if(!lootIds.has(id)){el.remove();this.lootLabels.delete(id);}
  for(const drop of world.rewardDrops){let el=this.lootLabels.get(drop.id);if(!el){el=document.createElement('div');el.className='loot-world-label';el.style.setProperty('--rarity',RARITIES[drop.reward.rarity].color);el.dataset.rarity=drop.reward.rarity;el.innerHTML=`${icon(drop.reward.icon)}<span>${RARITIES[drop.reward.rarity].name} · ${drop.reward.name}</span>`;this.labelLayer.append(el);this.lootLabels.set(drop.id,el);}el.hidden=!this.visible(drop)||world.phase!=='battle'||world.paused;if(!el.hidden){const p=this.screen(drop);el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;}}
  this.pickups.render(world.pickups,p=>this.ground(p),p=>this.visible(p));
  this.lines.visible=line>0;this.lines.geometry.setDrawRange(0,line*2);uploadActive(this.lines.geometry.attributes.position as THREE.BufferAttribute,line*2);uploadActive(this.lines.geometry.attributes.color as THREE.BufferAttribute,line*2);
  this.nonHeroEffects.render(world,p=>this.visible(p),weaponMount);
  this.protossEliteEffects.quality=this.fx.heroQuality;this.protossEliteEffects.render(world,p=>this.visible(p),weaponMount);this.zergEliteEffects.quality=this.fx.heroQuality;this.zergEliteEffects.render(world,this.camera,p=>this.visible(p),weaponMount);this.terranEliteEffects.render(world,this.camera,p=>this.visible(p),weaponMount);this.eliteSupportEffects.render(world,this.camera,p=>this.visible(p));this.confirmedHeroes.render(weaponMount,p=>this.visible(p));this.zergHeroes.render(p=>this.visible(p));this.protossHeroes.render(p=>this.visible(p));this.fx.render(world,this.camera,p=>this.visible(p),weaponMount);
  const shake=this.cameraShake&&!world.paused?[...world.visualEvents].reverse().find(e=>e.kind==='skill-impact'&&e.heroId==='yamato_battlecruiser'&&world.time-e.time<.3):undefined;if(shake){const offset=(1-(world.time-shake.time)/.3)*.13*Math.sin((world.time-shake.time)*70);this.camera.position.x+=offset;this.camera.updateMatrixWorld();this.renderScene();this.camera.position.x-=offset;this.camera.updateMatrixWorld();}else this.renderScene();
 }
 private podLabel(p:import('../../simulation/types').Pod){let el=this.podLabels.get(p.id);if(!el){el=document.createElement('div');el.className='pod-world-label';this.labelLayer.append(el);this.podLabels.set(p.id,el);}const active=['falling','active','opening'].includes(p.status);el.hidden=!active||!this.visible(p)||this.world.phase!=='battle'||this.world.paused;if(el.hidden)return;
  _vec.set(p.x,this.ground(p)+3.4,p.z).project(this.camera);const x=(_vec.x*.5+.5)*this.viewportWidth,y=(.5-_vec.y*.5)*this.viewportHeight;el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;const text=`${icon('wireframe.'+p.unitType)}<span class="carrier-count">×${p.passengers.filter(c=>c.status==='waiting').length}</span><span class="carrier-vital"><i style="width:${Math.max(0,p.hp/p.maxHp)*100}%"></i></span>`;if(el.dataset.content!==text){el.innerHTML=text;el.dataset.content=text;}}
 pickCarrier(x:number,y:number){return pickCarrier(x,y,this.canvas,this.camera,this.world);}
 pickMove(clientX:number,clientY:number){return pickMovement(clientX,clientY,this.canvas,this.camera,this.scene,this.world);}
 pick(clientX:number,clientY:number,touch=false){return pickBattle(clientX,clientY,touch,this.canvas,this.camera,this.scene,this.world);}
 screen(p:Point){_vec.set(p.x,this.ground(p),p.z).project(this.camera);return {x:(_vec.x*.5+.5)*this.viewportWidth,y:(-.5*_vec.y+.5)*this.viewportHeight};}
 private renderScene(){if((this.confirmedHeroes.ready||this.zergHeroes.ready||this.protossHeroes.ready)&&[...this.world.entities.values()].some(u=>u.hp>0&&(isRevisedHero(u.heroId)||isZergHero(u.heroId)||isProtossHero(u.heroId)))){const ratio=this.renderer.getPixelRatio(),width=this.viewportWidth,height=this.viewportHeight;if(width!==this.composerSize.width||height!==this.composerSize.height||ratio!==this.composerSize.ratio){this.composerSize={width,height,ratio};this.heroComposer.setPixelRatio(ratio);this.heroComposer.setSize(width,height);}this.heroComposer.render();}else this.renderer.render(this.scene,this.camera);}
 report(){return {nonHeroes:this.nonHeroEffects.report(),protossElites:this.protossEliteEffects.report(),zergElites:this.zergEliteEffects.report(),terranElites:{...this.terranEliteEffects.report(),medical:this.eliteSupportEffects.report()},protossHeroes:this.protossHeroes.report(),zergHeroes:this.zergHeroes.report(),confirmedHeroes:this.confirmedHeroes.report(),animationMode:this.animationMode,map:this.mapView?.report(),order:this.world.order?.kind==='move'?{...this.world.order,point:{...this.world.order.point}}:this.world.order?{...this.world.order}:null,resolution:{quality:this.quality,devicePixelRatio:window.devicePixelRatio||1,renderPixelRatio:this.renderer.getPixelRatio(),width:this.canvas.width,height:this.canvas.height,cssWidth:this.viewportWidth,cssHeight:this.viewportHeight,antialias:this.renderer.getContext().getContextAttributes()?.antialias},models:this.loadedModels,variantModels:[...this.gpu.keys()].filter(k=>(k.startsWith('elite.')||k.startsWith('hero.'))&&!k.endsWith('.death')&&!k.endsWith('.siege')&&!k.endsWith('.morph')),assetsPending:this.assetsPending,economicModels:['scv','drone','probe','egg'].filter(k=>this.gpu.has(k)).length,podModel:this.podTemplates.has(this.world.expedition.race),carrierModels:[...this.podTemplates.keys()],resourceModels:this.pickups.batches.size,resourceInstances:this.pickups.visible,errors:[...this.modelErrors,...this.fx.errors,...this.pickups.errors],originalAnimationModels:[...this.batches.values()].filter(b=>b.gltf.animations.length>0).length,proceduralAnimationModels:[...this.batches.values()].filter(b=>!b.gltf.animations.length).length,originalDeathModels:[...this.gpu.keys()].filter(k=>k.endsWith('.death')).length,animationAtlasBytes:[...this.gpu.values()].reduce((n,b)=>n+b.textureBytes,0),lodRatios:Object.fromEntries([...this.gpu].filter(([k])=>ordinaryLodKeys.has(k)).map(([k,b])=>[k,b.lodRatio])),effectTextures:this.fx.loaded,effects:this.fx.stats,sculptedEffects:this.fx.sculptures.stats,textures:this.loadedTextures,fps:this.fps,requestedInstanceUploadBytes:requestedUploadBytes,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,entities:this.world.entities.size,maxStretch:this.world.maxStretch,spatialVisits:this.world.distancePairs,collisionContacts:this.world.collisionContacts};}
}
