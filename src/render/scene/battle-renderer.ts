import {textureTierPending,textureReport} from '../loaders/managed-textures';
import {ManagedGLTFLoader} from '../loaders/managed-textures';
import {graphicsPreferences,saveGraphics,optimizedGraphics,TIER_LABELS,type GraphicsPreset,type GraphicsTier,runtimeBudget} from '../../platform/graphics-profile';
import {deathPresentation} from '../materials/death-presentation';
import {LowDangerEffects} from '../effects/low-danger-effects';
import {rescueEggMaterial,nightmareEggMaterial} from '../units/economic-egg';
import {loadCombatDetail,saveCombatDetail,hasCombatPreferences,type CombatPreset} from '../settings/quality';
import {FunPropAssets,releaseFunVisual} from '../units/fun-prop-assets';
import {SpecialVisuals} from '../units/special-visuals';
import {FunVisuals,type FunBodyPose} from '../units/fun-visuals';
import {heldPose,nydusPose} from '../units/fun-presentation';
import {EncounterVisuals} from '../units/encounter-visuals';
import {equipmentApparition} from '../units/equipment-apparition';
import {selectedProductionFamilies} from '../../simulation/building/expedition';
import type {PosePreparationControl} from '../units/sampled-poses';
import {sharedMaterialTextures} from '../materials/shared-textures';
import {prepareFloatSkinIndices} from '../units/skin-index-format';
import {cloneForPreparation} from './preparation-clone';
import type {PreparationJob} from '../../app/background-preparation';
import {openingPreloadModels,campaignPreloadModels,plannedBossPreloadModels} from '../../app/battle-preload-plan';
import {battleScenePreload,type BattleSceneScope} from '../../app/battle-scene-preload';
import type {Difficulty} from '../../data/stages';
import {bodyOutline} from '../units/body-outline';
import {HealthBars,type HealthBarMode} from '../units/health-bars';
import {CameraController,type AutoFrame,type CameraMode} from './camera-controller';
import {BattleDistress} from './battle-distress';
import {SceneLighting} from './scene-lighting';
import {SceneShadows} from './scene-shadows';
import {SceneContact} from './scene-contact';
import {ScreenRefraction} from './screen-refraction';
import {bindSourceDepth} from '../materials/posed-depth';
import {ProtossEliteEffects} from '../effects/protoss-elite-effects';
import {revisedZergElite} from '../../simulation/combat/zerg-elite-runtime';
import {ZergEliteEffects} from '../effects/zerg-elite-effects';
import {TerranEliteEffects} from '../effects/terran-elite-effects';
import {EliteSupportEffects} from '../effects/elite-support-effects';
import {ProtossHeroEffects} from '../effects/protoss-hero-effects';
import {ZergHeroEffects} from '../effects/zerg-hero-effects';
import {deathPoseTime} from '../units/death-clock';
import {createFullEnvironmentMap as createCampaignMap} from '../terrain/environment-full-map';
import {fullEnvironmentModelIds} from '../terrain/environment-compositions';
import {RadialTerrain,campaignDefinition,campaignTerrain,campaignMapAssets,type CampaignMapRecipe} from '../../data/campaign-map';
import {racePreloadModels,modelPreloadAssets} from '../../app/race-preload';
import {RESCUE_PRESENTATION} from '../../data/economy';
import {preparePylonBirthMaterials} from '../units/pylon-birth-materials';
import {BOSSES} from '../../data/enemies';
import {ENDLESS} from '../../data/endless';
import {cliffRenderPosition} from '../../simulation/movement/native-traversal';
import {FriendlyLabels} from '../units/friendly-labels';
import {EquipmentDrops} from '../units/equipment-drops';
import {commitInstances,uploadActive,resetUploadStats,requestedUploadBytes} from '../units/instance-updates';
import {RARITIES} from '../../data/rewards';
import * as THREE from 'three';
import {NonHeroEffects} from '../effects/nonhero-effects';
import {SourceCombatEffects} from '../effects/source-combat-effects';
import {sourceHologramDeath,COMBAT_FX_PROFILES} from '../effects/combat-fx-profile';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ConfirmedHeroEffects} from '../effects/confirmed-hero/controller';
import {MeshoptSimplifier} from 'meshoptimizer';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {waitForAsset} from '../../assets/preparation-wait';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {assetUrl,ASSETS,icon} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {SC2_UNITS,type CombatUnitType as UnitType} from '../../data/sc2-units';
import {EXPANSION_FAMILIES,SOURCE_ABILITIES} from '../../data/expansion-units';
import {CAMPAIGN18_STAGES} from '../../data/campaign18';
import {HEROES,type HeroId} from '../../data/heroes';
import {isAirHeroType,type Race} from '../../data/races';
import {ELITES,type EliteId} from '../../data/elites';
import {heroPresentation,modelPresentationAccent,modelPresentationScale} from '../../data/combat-presentation';
import {AIR_HEIGHT} from '../../data/terrain';
import {TUNING} from '../../data/game';
import {World} from '../../simulation/world';
import type {RunSnapshot} from '../../simulation/persistence/run-snapshot';
import {equipmentOpeningModels,equipmentRuntimeModels} from '../../simulation/starship/asset-plan';
import type {PresetSlot} from '../../simulation/progression/permanent-profile';
import {selectEquipmentEffects} from '../../simulation/starship/selection';
import {equippedItems} from '../../simulation/starship/inventory';
import {EQUIPMENT_FORTS,type EquipmentFortKind} from '../../simulation/starship/fortifications';
import type {Entity,Body,Point,Fortification,VisualEvent} from '../../simulation/types';
import {mapAnimations,attackAction,selectAttackPresentation,type AttackPlaybackState} from '../loaders/animations';
import {sc2BodyBounds,restoreSc2Materials} from '../loaders/sc2-materials';
import {loadSemanticGltf} from '../loaders/semantic-gltf';
import {updateFortRibbons} from './fort-ribbons';
import {releaseBuildingView} from './building-view-lifecycle';
import {prepareFortMaterials,updateFortMaterials} from './fort-materials';
import {pickBattle,pickMovement,pickCarrier} from '../input/battle-picking';
import {PodView} from '../units/pod-view';
import {createTerrain} from '../terrain/char-terrain';
import type {MapView} from '../terrain/original-map';
import {createFlatMap} from '../terrain/flat-map';
import {FlatTerrain} from '../../simulation/movement/flat-terrain';
import type {TerrainQuery} from '../../data/map-definition';
import {ResourceDrops} from '../units/resource-drops';
import {AnimatedBatch} from '../units/animated-batch';
import {loadUnitMaterialGltf,unitMaterialDependencies,unitMaterialTextures} from '../materials/unit-material-loader';
import {sceneMaterialTextures} from '../materials/scene-textures';
import {environmentAssetIds} from '../terrain/map-visual-profile';
import {displayModelKey,displayActiveModelKey,displayDeathModelKey,displayAssetModelKey,displayLoadModelKey,unitMaterialIdentity} from '../materials/elite-visual';
import {BarrierMaterialTimeline} from '../materials/source-tracks';
import {heroFeedbackEvent,weaponWorldPoint} from '../effects/hero-feedback';
import {BattleEffects} from '../effects/battle-effects';
import {configureGpuTextures} from '../loaders/gpu-textures';
import {statusReadout} from '../../ui/unit-identity';
import {loadQuality,saveQuality,renderPixelRatio,type RenderQuality,loadAnimationMode,saveAnimationMode,samplePoseClock,type AnimationMode,type PoseClockState} from '../settings/quality';
import {AdaptiveResolution,AdaptiveGpuTimer} from '../settings/adaptive-quality';
import {restoreMaterialUploads,materialUploadTotals} from '../materials/unit-material-batch';

type UnitBatch={gltf:GLTF;meshes:THREE.InstancedMesh[];data:THREE.InstancedBufferAttribute[];scale:number;center:THREE.Vector3;minY:number;clips:ReturnType<typeof mapAnimations>};
const heights:Record<UnitType,number>={science_vessel:1.8,reaper:1.4,thor:3.2,viking:1.4,banshee:1.3,queen:1.6,lurker:1.5,mutalisk:1.6,corruptor:1.7,ultralisk:3,zealot:1.6,adept:1.6,stalker:1.8,sentry:1.2,high_templar:1.6,immortal:2,colossus:3.5,phoenix:1.4,void_ray:2,carrier:3.5,marine:1.35,marauder:1.6,hydralisk:1.55,hellion:.9,tank:1.25,medivac:1.05,zergling:.68,roach:1,baneling:.7,ravager:1.45,yamato_battlecruiser:4.5,hots_leviathan:4.5,purifier_flagship:3.5};
const ordinaryLodKeys=new Set<string>(EXPANSION_FAMILIES.flatMap(family=>[family,family+'.death']));
for(const key of ['tank.siege','tank.morph','hellion.hellbat','viking.assault'])ordinaryLodKeys.add(key);
const _obj=new THREE.Object3D(),_color=new THREE.Color(),_vec=new THREE.Vector3();
const UNIT_CAPACITY=1024; // Rescue guardians may temporarily exceed the ambient-wave cap.
export class BattleRenderer {
 /** Mobile browsers need a bounded optional working set, not a lower visual preset. */
 readonly memoryConstrainedPreload=runtimeBudget().recentOnly;
 private stillPresentation:readonly unknown[]|null=null;
 cameraShake=true;
 private distress=new BattleDistress();private distressLayer=document.createElement('div');
 setCameraShake(enabled:boolean){this.cameraShake=enabled;try{localStorage.setItem('sc2.cameraShake',String(enabled));}catch{}}
 private viewportWidth=1;private viewportHeight=1;
 private viewportObserver:ResizeObserver;private readonly resizeFromBrowser=()=>this.resize();
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();readonly effectScene=new THREE.Scene();private lowSince:number|null=null;readonly lowDanger:LowDangerEffects;camera=new THREE.PerspectiveCamera();private lighting:SceneLighting;private sceneShadows:SceneShadows;private contact:SceneContact;
 batches=new Map<UnitType,UnitBatch>();gpu=new Map<string,AnimatedBatch>();
 private animationStates=new Map<number,{action:string;since:number;modeDuration:number;playback:AttackPlaybackState;poseClock:PoseClockState;sampled?:{at:number;action:keyof ReturnType<typeof mapAnimations>;seconds:number;once:boolean;attackSeconds:number;attackKey:keyof ReturnType<typeof mapAnimations>}}>();
 private friendlyLabels:FriendlyLabels;
 private enemyLabels=new Map<number,HTMLElement>();
 private corpses=new Map<number,{scale:number;type:string;x:number;z:number;y:number;facing:number;at:number;revealed:boolean;apparition?:ReturnType<typeof equipmentApparition>;teamColor?:readonly [number,number,number]}>();
 private hitTimes=new Map<number,number>();private lastVisual=0;
 private barrierMaterials=new BarrierMaterialTimeline();
 private hiveDeathTemplate?:GLTF;private hiveDeathBounds?:THREE.Box3;private hiveWasAlive=false;
 private hiveDeaths=new Map<number,{root:THREE.Group;mixer:THREE.AnimationMixer;at:number;duration:number;sourceDuration:number}>();
 readonly protossHeroes:ProtossHeroEffects;readonly zergHeroes:ZergHeroEffects;readonly confirmedHeroes:ConfirmedHeroEffects;private heroComposer:EffectComposer;private composerSize={width:0,height:0,ratio:0};
 private applyingGraphics=false;
 private combatDetail=loadCombatDetail();private bloomDetailSize='';readonly fx:BattleEffects;quality:RenderQuality=loadQuality();
 private adaptive=new AdaptiveResolution();private adaptiveTimer?:AdaptiveGpuTimer;private adaptiveFrame=false;
 get adaptiveQuality(){return {...this.adaptive.report(),supported:this.adaptiveTimer?.supported??null};}
 private refraction:ScreenRefraction;
 animationMode:AnimationMode=loadAnimationMode();
 private destinationMarker!:THREE.Mesh;
 /** Original SC2 targetingcursormockup3.dds, already present in the source effect pack. */
 private rescueBeaconTexture?:THREE.Texture;
 private rescueBeacon(){if(!this.rescueBeaconTexture)throw Error('原版营救光标尚未准备');const marker=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.35),new THREE.MeshBasicMaterial({map:this.rescueBeaconTexture,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false}));marker.quaternion.copy(this.camera.quaternion);marker.position.y=1.4;marker.renderOrder=20;marker.name='rescue-sc2-targeting-cursor';return marker;}
 initialAssetsLoaded=false;targetPreview:Point|null=null;loadedModels=0;modelErrors:string[]=[];loadedTextures=0;fps=0;frameMs=0;frameTimes:number[]=[];showGrid=false;showColliders=false;
 readonly nonHeroEffects:NonHeroEffects;readonly sourceCombatEffects:SourceCombatEffects;
 readonly protossEliteEffects:ProtossEliteEffects;readonly zergEliteEffects:ZergEliteEffects;readonly terranEliteEffects:TerranEliteEffects;readonly eliteSupportEffects:EliteSupportEffects;private shadows:THREE.InstancedMesh;readonly healthBars:HealthBars;selectedHealthBodies:()=>Set<number>=()=>new Set();private pickups:ResourceDrops;
 private lines:THREE.LineSegments;private linePositions=new Float32Array(6000);private lineColors=new Float32Array(6000);
 private podViews=new Map<number,PodView>();private podTemplates=new Map<Race,GLTF>();private terrainUpdate=()=>{};private mapView?:MapView;private mapTerrain?:TerrainQuery;private mapViews=new Map<TerrainQuery,MapView>();private mapSwitching=false;private hiveTemplate:THREE.Object3D|null=null;private hiveView:THREE.Object3D|null=null;private expansionViews=new Map<number,THREE.Object3D>();private fortViews=new Map<number,THREE.Group>();private fortTemplates=new Map<Fortification['kind'],THREE.Group>();private fortDeathTemplates=new Map<Fortification['kind'],THREE.Group>();private fortClips=new Map<string,THREE.AnimationClip>();private fortMixers=new Map<number,THREE.AnimationMixer>();private fortDeathViews=new Map<number,{group:THREE.Group;mixer:THREE.AnimationMixer;until:number}>();private fortVisualTime=0;
 readonly equipmentDrops:EquipmentDrops;
 private lootLabels=new Map<number,HTMLElement>();
 private podLabels=new Map<number,HTMLElement>();private labelLayer=document.createElement('div');
 private grid=new THREE.GridHelper(104,26,0x3aa8b4,0x245460);private tickTime=0;private frames=0;private cameraController=new CameraController(this.camera,(()=>{try{return localStorage;}catch{return undefined;}})());private cameraTarget=this.cameraController.target;private safeProbe=document.createElement('div');
 constructor(readonly canvas:HTMLCanvasElement,readonly world:World){
  try{this.cameraShake=localStorage.getItem('sc2.cameraShake')!=='false';}catch{}
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  configureGpuTextures(this.renderer);
  this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{const error='Shader: '+gl.getProgramInfoLog(program)+' / '+gl.getShaderInfoLog(vertex)+' / '+gl.getShaderInfoLog(fragment);this.modelErrors.push(error);console.error(error);};
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.renderer.setClearColor(0x171d20);this.scene.fog=new THREE.FogExp2(0x202326,.009);
  this.effectScene.name='combat-effects';this.scene.add(this.effectScene);  this.fx=new BattleEffects(this.effectScene);this.sourceCombatEffects=new SourceCombatEffects(this.effectScene,this.camera,this.fx);this.nonHeroEffects=new NonHeroEffects(this.effectScene,this.fx,this.camera);this.protossEliteEffects=new ProtossEliteEffects(this.effectScene,this.fx,this.camera);this.zergEliteEffects=new ZergEliteEffects(this.effectScene,this.fx,this.camera);this.eliteSupportEffects=new EliteSupportEffects(this.effectScene,this.fx);this.terranEliteEffects=new TerranEliteEffects(this.effectScene,this.fx,this.camera);this.confirmedHeroes=new ConfirmedHeroEffects(this,world);this.zergHeroes=new ZergHeroEffects(this,world);this.protossHeroes=new ProtossHeroEffects(this,world);this.lowDanger=new LowDangerEffects(this.scene,this.fx);this.heroComposer=new EffectComposer(this.renderer);for(const buffer of [this.heroComposer.readBuffer,this.heroComposer.writeBuffer])buffer.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.heroComposer.addPass(new RenderPass(this.scene,this.camera));this.refraction=new ScreenRefraction(this.scene,this.camera);this.heroComposer.addPass(this.refraction);this.heroComposer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,.8));this.heroComposer.addPass(new OutputPass());
  // Fresh installations start on high on every pointer type. Explicit saved
  // settings still win, including custom quality and animation combinations.
  let fresh=true;try{fresh=!hasCombatPreferences(localStorage);}catch{}
  if(fresh&&!optimizedGraphics()){this.quality='native';this.animationMode='complete';this.fx.heroQuality='full';this.nonHeroEffects.quality='full';}
  // A saved old medium preset used balanced/balanced. Upgrade only that exact
  // preset combination; independent custom settings and coarse-pointer defaults stay intact.
  if(this.combatDetail==='medium'&&this.quality==='native'&&this.animationMode==='complete'&&this.fx.heroQuality==='balanced'&&this.nonHeroEffects.quality==='balanced'){this.fx.setHeroQuality('low');this.nonHeroEffects.setQuality('low');}
  if(optimizedGraphics()){const p=graphicsPreferences();if(p.preset!=='custom'){const tier=p.preset==='auto'?p.tier:p.preset;this.combatDetail=tier==='high'?'full':tier;this.quality=tier==='high'?'high':tier==='medium'?'balanced':'performance';this.animationMode='complete';this.fx.heroQuality=tier==='high'?'full':'low';this.nonHeroEffects.quality=tier==='high'?'full':'low';}}
  this.lighting=new SceneLighting(this.scene);this.lighting.bind(world.terrain);this.sceneShadows=new SceneShadows(this.renderer,this.scene,this.lighting.key);this.contact=new SceneContact(this.renderer,this.sceneShadows.depth);this.applyCombatDetail();
  const makeBatch=(geometry:THREE.BufferGeometry,material:THREE.Material,count:number)=>{const m=new THREE.InstancedMesh(geometry,material,count);m.frustumCulled=false;m.matrixAutoUpdate=false;m.matrixWorldAutoUpdate=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(m);return m;};
  const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));pixels[(y*32+x)*4+3]=Math.round(a*a*135);}
  const shadowMap=new THREE.DataTexture(pixels,32,32);shadowMap.needsUpdate=true;const disc=new THREE.PlaneGeometry(2,2);disc.rotateX(-Math.PI/2);this.shadows=makeBatch(disc,new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),1400);
  this.healthBars=new HealthBars(this.scene);
  this.pickups=new ResourceDrops(this.scene);

  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(this.linePositions,3).setUsage(THREE.DynamicDrawUsage));lineGeo.setAttribute('color',new THREE.BufferAttribute(this.lineColors,3).setUsage(THREE.DynamicDrawUsage));this.lines=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9}));this.lines.frustumCulled=false;this.scene.add(this.lines);
  const arrow=new THREE.BufferGeometry();arrow.setAttribute('position',new THREE.Float32BufferAttribute([-.35,0,.12,.35,0,.12,0,0,.65,-.1,0,-.45,.1,0,-.45,.1,0,.12,-.1,0,-.45,.1,0,.12,-.1,0,.12],3));arrow.computeBoundingSphere();
  this.destinationMarker=new THREE.Mesh(arrow,new THREE.MeshBasicMaterial({color:0x84eea7,transparent:true,opacity:.85,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));this.destinationMarker.name='transient-move-arrow';this.destinationMarker.renderOrder=20;this.destinationMarker.visible=false;this.scene.add(this.destinationMarker);
  this.grid.position.y=.08;this.grid.visible=false;this.scene.add(this.grid);
  this.distressLayer.id='battle-distress';this.distressLayer.setAttribute('aria-hidden','true');canvas.parentElement!.append(this.distressLayer);
  this.labelLayer.id='pod-labels';canvas.parentElement!.append(this.labelLayer);this.friendlyLabels=new FriendlyLabels(this.labelLayer);this.equipmentDrops=new EquipmentDrops(this.scene,this.labelLayer);
  this.safeProbe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';canvas.parentElement!.append(this.safeProbe);
  this.resize();window.addEventListener('resize',this.resizeFromBrowser);this.viewportObserver=new ResizeObserver(this.resizeFromBrowser);this.viewportObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.adaptiveTimer?.clear();this.adaptive.suspend();this.contextEpoch++;this.screenWarmed.clear();this.validatedPrograms.clear();world.paused=true;world.announce('画面连接中断，正在等待恢复');});
  canvas.addEventListener('webglcontextrestored',()=>{restoreMaterialUploads();this.adaptiveTimer?.restore();this.adaptive.reset();this.resize();this.sceneShadows.restore();this.contact.restore();world.announce('画面连接已恢复，请准备画面后继续');});
 }
 /** Retain GPU programs, original map and decoded models when starting a fresh run. */
 resetRun(){this.lowSince=this.combatDetail==='low'?this.world.time:null;this.lowDanger.reset();this.stillPresentation=null;this.adaptiveTimer?.clear();this.adaptive.reset();this.resize();this.sourceCombatEffects.reset();this.distress.reset();this.distressLayer.hidden=true;this.nonHeroEffects.reset();this.protossEliteEffects.reset();this.zergEliteEffects.reset();this.eliteSupportEffects.reset();this.terranEliteEffects.reset();
  for(const v of this.missionViews.values())releaseBuildingView(v.root,v.mixer);this.missionViews.clear();
  for(const v of this.missionDeaths.values())releaseBuildingView(v.root,v.mixer);this.missionDeaths.clear();
  for(const prop of this.missionProps.values())releaseFunVisual(prop);this.missionProps.clear();
  for(const id of this.hiveDeaths.keys())this.removeHiveDeath(id);this.hiveWasAlive=false;
  this.animationStates.clear();this.corpses.clear();this.hitTimes.clear();this.barrierMaterials.reset();this.lastVisual=0;
  this.specialVisuals?.reset();this.encounterVisuals?.reset();this.funVisuals?.reset();this.friendlyLabels.reset();this.equipmentDrops.reset();this.fx.reset();this.confirmedHeroes.reset();this.zergHeroes.reset();this.protossHeroes.reset();
  for(const map of [this.enemyLabels,this.lootLabels,this.podLabels]){for(const el of map.values())el.remove();map.clear();}
  for(const p of this.podViews.values())p.dispose();this.podViews.clear();
  if(this.hiveView)releaseBuildingView(this.hiveView);this.hiveView=null;for(const v of this.expansionViews.values())releaseBuildingView(v);this.expansionViews.clear();
  for(const [id,v]of this.fortViews)releaseBuildingView(v,this.fortMixers.get(id));this.fortViews.clear();this.fortMixers.clear();for(const death of this.fortDeathViews.values())releaseBuildingView(death.group,death.mixer);this.fortDeathViews.clear();this.fortVisualTime=this.world.time;
  this.cameraTarget.set(0,this.world.terrain?.height({x:0,z:0})??0,0);
  this.frameTimes.length=0;this.frames=0;this.tickTime=0;
 }
 get combatDetailQuality(){return this.combatDetail;}
 get dynamicResolution(){return this.quality==='adaptive'||optimizedGraphics()&&graphicsPreferences().preset==='auto';}
 get optimizedGraphics(){return optimizedGraphics();}
 get graphicsPreset(){return graphicsPreferences().preset;}
 get graphicsPresetLabels(){return {auto:'自动（'+TIER_LABELS[graphicsPreferences().tier]+'）',high:'高',medium:'中',low:'低',custom:'自定义'};}
 get textureQuality(){return graphicsPreferences().texture;}
 get textureQualityPending(){return textureTierPending();}
 markGraphicsCustom(){if(optimizedGraphics()&&!this.applyingGraphics){saveQuality(this.quality);saveAnimationMode(this.animationMode);saveCombatDetail(this.combatDetail);this.fx.setHeroQuality(this.fx.heroQuality);this.nonHeroEffects.setQuality(this.nonHeroEffects.quality);saveGraphics({preset:'custom'});}}
 setTextureQuality(tier:GraphicsTier){saveGraphics({texture:tier});this.markGraphicsCustom();}
 setGraphicsPreset(preset:GraphicsPreset){
  if(preset==='custom')return;const tier=preset==='auto'?graphicsPreferences().tier:preset;
  this.applyingGraphics=true;try{this.setCombatPreset(tier==='high'?'full':tier);this.setQuality(tier==='high'?'high':tier==='medium'?'balanced':'performance');saveGraphics({preset,texture:tier});}finally{this.applyingGraphics=false;}
 }
 get combatEffectsEnabled(){return this.combatDetail!=='low';}
 get combatPreset():CombatPreset{const q=this.combatDetail==='full'?'full':'low';return this.quality==='native'&&this.animationMode==='complete'&&this.fx.heroQuality===q&&this.nonHeroEffects.quality===q?this.combatDetail:'custom';}
 setCombatPreset(value:CombatPreset){if(value==='custom')return;if(this.combatDetail==='low'&&value!=='low')this.resumeCombatEffects();if(value==='low'&&this.combatDetail!=='low')this.lowSince=this.world.time;this.combatDetail=value;saveCombatDetail(value);this.setQuality('native');this.setAnimationMode('complete');this.nonHeroEffects.setQuality(value==='full'?'full':'low');this.fx.setHeroQuality(value==='full'?'full':'low');this.applyCombatDetail();}
 setCombatDetail(value:'full'|'medium'|'low'){if(this.combatDetail==='low'&&value!=='low')this.resumeCombatEffects();if(value==='low'&&this.combatDetail!=='low')this.lowSince=this.world.time;this.combatDetail=value;saveCombatDetail(value);this.markGraphicsCustom();this.applyCombatDetail();}
 private applyCombatDetail(){const low=this.combatDetail==='low',medium=this.combatDetail!=='full';this.effectScene.visible=!low;this.lowDanger.setEnabled(low);this.sourceCombatEffects.player.decorationFraction=medium?.3:1;this.sourceCombatEffects.player.displacementEnabled=!medium;this.refraction.setEnabled(!medium);this.contact.samples=12;this.contact.setEnabled(!medium);this.sceneShadows.setEnabled(!medium);this.sceneShadows.setResolution(1024);this.terranEliteEffects.quality=medium?'low':'full';const bloom=this.heroComposer.passes.find(p=>p instanceof UnrealBloomPass);if(bloom instanceof UnrealBloomPass){bloom.enabled=!low;bloom.strength=medium?.18:.32;bloom.radius=medium?.25:.5;if(low)for(const target of [bloom.renderTargetBright,...bloom.renderTargetsHorizontal,...bloom.renderTargetsVertical])target.dispose();}this.bloomDetailSize='';}
 private resumeCombatEffects(){
  const w=this.world,advanced=this.lowSince===null||w.time!==this.lowSince;
  // Keep frozen presentation intact for a paused round trip. Once time advanced,
  // release old visual caches before rebuilding continuous native state.
  if(advanced){for(const effects of [this.sourceCombatEffects,this.nonHeroEffects,this.protossEliteEffects,this.zergEliteEffects,this.terranEliteEffects,this.eliteSupportEffects,this.confirmedHeroes,this.zergHeroes])effects.reset();this.fx.reset();for(const id of this.hiveDeaths.keys())this.removeHiveDeath(id);for(const death of this.fortDeathViews.values())releaseBuildingView(death.group,death.mixer);this.fortDeathViews.clear();}
  for(const effects of [this.sourceCombatEffects,this.nonHeroEffects,this.protossEliteEffects,this.zergEliteEffects,this.terranEliteEffects,this.confirmedHeroes,this.zergHeroes,this.protossHeroes])effects.resumeAt(w);
  this.fx.lastSerial=w.visualEvents.at(-1)?.serial??0;this.lowSince=null;
 }
 setQuality(quality:RenderQuality){this.markGraphicsCustom();this.quality=quality;this.adaptiveTimer?.clear();this.adaptive.reset();saveQuality(quality);this.resize();this.filterTextures(this.scene);}
 setAnimationMode(mode:AnimationMode){this.markGraphicsCustom();this.animationMode=mode;saveAnimationMode(mode);}
 private filterTextures(root:THREE.Object3D){const limit=Math.min(this.renderer.capabilities.getMaxAnisotropy(),(this.quality==='native'||this.quality==='high'||this.quality==='adaptive')?8:this.quality==='balanced'?4:1),seen=new Set<THREE.Texture>();root.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const t of [...['map','normalMap','specularColorMap','emissiveMap','alphaMap'].map(key=>(m as unknown as Record<string,THREE.Texture>)[key]),...unitMaterialTextures(m),...sceneMaterialTextures(m)])if(t&&!seen.has(t)){seen.add(t);if(t.anisotropy!==limit){t.anisotropy=limit;t.needsUpdate=true;}}});}
 private async preloadTextures(root:THREE.Object3D,openedOnly=false){const seen=new Set<THREE.Texture>();root.traverse(n=>{if(!(n instanceof THREE.Mesh)||openedOnly&&n instanceof THREE.InstancedMesh&&n.count===0)return;for(const m of Array.isArray(n.material)?n.material:[n.material])for(const t of [...['map','normalMap','specularColorMap','emissiveMap','alphaMap'].map(key=>(m as unknown as Record<string,THREE.Texture>)[key]),...unitMaterialTextures(m),...sceneMaterialTextures(m)])if(t&&!seen.has(t)){seen.add(t);}});for(const texture of seen){this.renderer.initTexture(texture);if(optimizedGraphics())await new Promise<void>(resolve=>setTimeout(resolve,0));}}
 /** Start shader compilation with the same linear target as gameplay. compileAsync
  * creates programs synchronously before polling, so restore the target immediately
  * and let normal frames continue safely while the returned promise is pending. */
 compilePresentation(object:THREE.Object3D,camera:THREE.Camera,targetScene?:THREE.Scene){
  const target=this.renderer.getRenderTarget();
  try{this.renderer.setRenderTarget(this.heroComposer.readBuffer);return waitForAsset(this.renderer.compileAsync(object,camera,targetScene),'着色器编译');}
  finally{this.renderer.setRenderTarget(target);}
 }
 /** Compile and make the first draw with the actual batches while the loading gate is active. */
 private async prewarmBatches(meshes:THREE.InstancedMesh[],includeTemplates=false,extraRoots:THREE.Object3D[]=[]){
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
    // Effects acquire instanceColor on first use. The skinned
    // batches already use the device's maximum attributes, so keep those white.
    if(!mesh.geometry.hasAttribute('unitPose')&&!mesh.geometry.hasAttribute('sourceColor'))mesh.setColorAt(0,white);
   }
   for(const root of roots)warmScene.add(root);
   this.cameraController.pose(new THREE.Vector3());
   for(const root of extraRoots)warmScene.add(root);this.sceneShadows.prepare(warmScene);this.contact.prepare(warmScene);
   await this.compilePresentation(warmScene,this.camera);
   await this.preloadTextures(warmScene,true);
   this.renderer.setRenderTarget(target);this.contact.render(warmScene,this.camera,2,2);this.renderer.render(warmScene,this.camera);
  }finally{
   warmScene.traverse(node=>{if(node instanceof THREE.DirectionalLight||node instanceof THREE.SpotLight||node instanceof THREE.PointLight){node.shadow.map?.dispose();node.shadow.mapPass?.dispose();}});
   this.renderer.setRenderTarget(previous);target.dispose();
   this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();
   for(const root of [...roots,...extraRoots])root.removeFromParent();
   for(const {mesh,parent,count,visible} of restored){if(parent)parent.add(mesh);else mesh.removeFromParent();mesh.count=count;mesh.visible=visible;}
  }
 }
 private validatedPrograms=new Set<number>();
 contextEpoch=0;
 get preparationKey(){return [this.contextEpoch,...this.gpu.keys(),this.mapViews.size,this.fortTemplates.size,this.fortDeathTemplates.size].join('|');}
 private screenWarmed=new Set<THREE.InstancedMesh>();
 /** Exercise every decoded unit in the real half-float HDR target, then output once.
  * Direct scene-to-canvas warming compiles ACES/sRGB variants that gameplay no
  * longer uses, and fails to exercise the actual half-float presentation chain. */
 async warmPresentationBatches(progress:(done:number,total:number,label:string)=>void=()=>{},background=false){
  this.sceneShadows.prepare();this.contact.prepare(this.scene);
  const pending=[...this.gpu.entries()].flatMap(([key,batch])=>batch.allMeshes.filter(mesh=>!this.screenWarmed.has(mesh)).map(mesh=>({key,mesh})));
  if(this.world.starship.enabled)for(const mesh of this.equipmentDrops.meshes)if(!this.screenWarmed.has(mesh))pending.push({key:mesh.name,mesh});
  if(!pending.length){if(!background)this.warmLightingFrame();return 0;}
  const identity=new THREE.Matrix4(),white=new THREE.Color(0xffffff),renderer=this.renderer;
  const target=renderer.getRenderTarget(),position=this.camera.position.clone(),quaternion=this.camera.quaternion.clone(),equipmentVisible=this.equipmentDrops.root.visible;
  // Exercise the real screen pipeline without redrawing the entire map for each
  // material. Preserve lights and the scene graph; only renderable visibility changes.
  const screenVisibility=new Map<THREE.Object3D,boolean>();this.scene.traverse(node=>{if(node instanceof THREE.Mesh||node instanceof THREE.Line||node instanceof THREE.Sprite){screenVisibility.set(node,node.visible);node.visible=false;}});
  try{
   this.preparePresentationSize();
   this.equipmentDrops.root.visible=this.world.starship.enabled;
   // Every material still exercises the real canvas pipeline. One bounded group
   // shares the scene traversal and shadow pass instead of
   // repeating a full-screen render and GPU round trip for every submesh.
   for(let i=0;i<pending.length;i+=8){
    const group=pending.slice(i,i+8).map(({key,mesh})=>({key,mesh,count:mesh.count,visible:mesh.visible,first:mesh.instanceMatrix.array.slice(0,16)}));
    try{
     for(const {mesh} of group){mesh.visible=true;mesh.count=1;mesh.setMatrixAt(0,identity);mesh.instanceMatrix.needsUpdate=true;
      if(!mesh.geometry.hasAttribute('unitPose')&&!mesh.geometry.hasAttribute('sourceColor'))mesh.setColorAt(0,white);}
     this.cameraController.pose(new THREE.Vector3());
     renderer.setRenderTarget(this.heroComposer.readBuffer);
     renderer.render(this.scene,this.camera);
    }finally{
     for(const {mesh,first,count,visible} of group){
     mesh.instanceMatrix.array.set(first,0);mesh.instanceMatrix.needsUpdate=true;
     mesh.count=count;mesh.visible=visible;}
     this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();
    }
    progress(Math.min(i+8,pending.length),pending.length,group.at(-1)!.key);
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   }
  }finally{for(const [node,visible] of screenVisibility)node.visible=visible;this.equipmentDrops.root.visible=equipmentVisible;renderer.setRenderTarget(target);this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();}
  // The final lighting frame waits once for all earlier GPU submissions too.
  // Only then record the batches as ready; no per-submesh GPU round trips.
  if(background)await this.waitForGpu();else this.warmLightingFrame();
  if(renderer.getContext().isContextLost())throw Error('WebGL 上下文丢失，预热未完成');
  for(const {mesh} of pending)this.screenWarmed.add(mesh);
  return pending.length;
 }
 private async waitForGpu(){
  const gl=this.renderer.getContext() as WebGL2RenderingContext,fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!fence)throw Error('GPU fence unavailable');
  const deadline=performance.now()+30000;
  gl.flush();try{for(;;){if(gl.isContextLost())throw Error('WebGL context lost during background preparation');const status=gl.clientWaitSync(fence,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)return;if(status===gl.WAIT_FAILED)throw Error('GPU background preparation failed');if(performance.now()>=deadline)throw Error('GPU 准备等待超时，请重试');await new Promise<void>(resolve=>setTimeout(resolve,16));}}finally{gl.deleteSync(fence);}
 }
 private warmLightingFrame(){
  const position=this.camera.position.clone(),quaternion=this.camera.quaternion.clone();
  try{const p=this.world.anchor,y=this.ground(p);this.cameraController.pose(new THREE.Vector3(p.x,y,p.z));this.preparePresentationSize();this.refraction.prepareComposite(this.renderer);this.sceneShadows.update(this.camera,this.world.terrain);this.renderScene();this.renderer.getContext().finish();}
  finally{this.camera.position.copy(position);this.camera.quaternion.copy(quaternion);this.camera.updateMatrixWorld();}
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
 private resizeSignature='';
 /** The production viewport coordinator owns commits; standalone previews keep their observer. */
 manageViewport(){window.removeEventListener('resize',this.resizeFromBrowser);this.viewportObserver.disconnect();}
 resize(){
  const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight,gl=this.renderer.getContext(),ratio=renderPixelRatio(this.quality,window.devicePixelRatio||1,w,h,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))*(this.dynamicResolution?this.adaptive.scale:1),safe=getComputedStyle(this.safeProbe),coarse=matchMedia('(pointer:coarse)').matches;
  const insets={left:parseFloat(safe.paddingLeft)||0,right:parseFloat(safe.paddingRight)||0,top:parseFloat(safe.paddingTop)||0,bottom:parseFloat(safe.paddingBottom)||0},signature=[w,h,ratio,coarse,...Object.values(insets)].join(':');
  if(signature===this.resizeSignature)return;this.resizeSignature=signature;this.stillPresentation=null;
  if(w!==this.viewportWidth||h!==this.viewportHeight||ratio!==this.renderer.getPixelRatio())this.renderer.setDrawingBufferSize(w,h,ratio);
  this.viewportWidth=w;this.viewportHeight=h;this.cameraController.resize(w,h,coarse,insets);
 }
 private preparedCommon=new Set<string>();
 private backgroundModels=new Set<string>();
 private backgroundDesired=new Set<string>();
 private retireOptional(key:string){
  const retired=new Set<string>();for(const [id,batch] of this.gpu)if(id===key||id.startsWith(key+'.')){for(const asset of unitMaterialDependencies(displayAssetModelKey(id)))retired.add(asset);for(const mesh of batch.allMeshes)this.screenWarmed.delete(mesh);batch.dispose();this.gpu.delete(id);}
  for(const id of this.gpu.keys())for(const asset of unitMaterialDependencies(displayAssetModelKey(id)))retired.delete(asset);
  sharedMaterialTextures.forget([...retired].map(assetUrl).filter((url):url is string=>!!url));
  if(this.batches.delete(key as UnitType))this.loadedModels--;this.variantLoads.delete(key);this.backgroundModels.delete(key);
 }
 backgroundBusy=false;entryPreparation=false;
 private streamingLoads=new Map<string,{promise:Promise<boolean>;promoted:boolean}>();
 private staticWarmEpoch=new Map<string,number>();
 private stageWarmEpoch=-1;
 private stageWarm=new Map<string,ReturnType<typeof cloneForPreparation>>();
 /** Exact first-use combinations, with no mutation of World or live instances. */
 stagePreparationJobs(checkpoint:(cancelled:()=>boolean)=>Promise<void>):PreparationJob[]{
  const epoch=this.contextEpoch;
  if(this.stageWarmEpoch!==epoch){for(const anchor of this.stageWarm.values())anchor.dispose();this.stageWarm.clear();this.stageWarmEpoch=epoch;}
  const families=new Set(this.currentModels().values());
  if(this.world.endless||this.world.stage>=18)for(const family of campaignPreloadModels(1,18).values())families.add(family);
  const models=new Set(['BanelingDeath','BloodTargetImpact','DropPodLand','ProtossShieldDamage','ProtossShieldFull']);
  for(const profile of COMBAT_FX_PROFILES.values())if(families.has(profile.family as UnitType))for(const ids of Object.values(profile.models))for(const id of ids)models.add(id);
  if(families.has('science_vessel'))models.add('Hologram_Death_Large');
  if(this.world.expedition.race==='zerg')for(const id of ['BurrowFXSmall','BurrowFXLarge'])models.add(id);
  if(this.world.expedition.race==='protoss')models.add('WarpTrainModel');
  const entries=this.sourceCombatEffects.player.preparationEntries().filter(entry=>models.has(entry.key.split(':')[0]));
  entries.sort((a,b)=>Number(b.key.startsWith('BanelingDeath'))-Number(a.key.startsWith('BanelingDeath')));
  if(this.funProps.ready)for(const name of ['pickup-root','pickup-nuke','pickup-armor','pickup-firepower','pickup-medical'] as const)if(!this.stageWarm.has('prop:'+name))entries.unshift({key:'prop:'+name,root:this.funProps.create(name),displacement:false});
  return entries.map(entry=>({key:`stage-presentation:${epoch}:${entry.key}`,priority:true,paced:true,
   isReady:()=>epoch!==this.contextEpoch||this.stageWarm.has(entry.key),run:async()=>{
    const cancelled=()=>epoch!==this.contextEpoch,wait=()=>checkpoint(cancelled);await wait();
    const anchor=cloneForPreparation(entry.root),root=new THREE.Scene(),meshes:THREE.Mesh[]=[];root.add(anchor.root);anchor.root.traverse(n=>{if(n instanceof THREE.Mesh)meshes.push(n);});
    try{
     if(entry.displacement){root.environment=this.scene.environment;root.fog=this.scene.fog;this.scene.traverseVisible(n=>{if(n instanceof THREE.Light)root.add(n.clone());});await wait();await this.refraction.prepare(this.renderer,root);await this.waitForGpu();}
     else await this.warmDetachedBatches(root,meshes,wait);
     if(cancelled())throw Error('后台资源准备已取消');this.stageWarm.set(entry.key,anchor);anchor.root.removeFromParent();
    }catch(error){anchor.dispose();throw error;}
   }}));
 }
 /** Detached CPU/GPU preparation never hides the live scene or holds simulation.
  * A roster request can promote an unfinished item to the existing required gate. */
 private streamUnitVariant(key:string,type:UnitType,checkpoint:(cancelled:()=>boolean)=>Promise<void>):Promise<boolean>{
  key=displayLoadModelKey(key,type);if(this.gpu.has(key))return Promise.resolve(true);
  const existing=this.variantLoads.get(key);if(existing)return existing;
  const epoch=this.contextEpoch,runId=this.world.runId,cancelled=()=>epoch!==this.contextEpoch||runId!==this.world.runId;
  const wait=async()=>{if(record.promoted){if(cancelled())throw Error('后台资源准备已取消');await new Promise<void>(resolve=>setTimeout(resolve,0));}else await checkpoint(cancelled);},root=new THREE.Scene(),prepared=new Map<string,AnimatedBatch>();let ordinary:UnitBatch|undefined;
  let finish!:(ok:boolean)=>void;const promise=new Promise<boolean>(resolve=>finish=resolve),record={promise,promoted:false};
  this.variantLoads.set(key,promise);this.streamingLoads.set(key,record);
  this.variantQueue=this.variantQueue.then(async()=>{let ok=false;try{
   await wait();await MeshoptSimplifier.ready;
   const assetKey=displayAssetModelKey(key),suffixes=['',...['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])].filter(s=>ASSETS.has('model.'+assetKey+s))];
   for(const suffix of suffixes){
    await wait();await prepareEmbeddedAssetIds(['model.'+assetKey+suffix,...unitMaterialDependencies(assetKey+suffix)]);
    await wait();const url=assetUrl('model.'+assetKey+suffix);if(!url)throw Error('模型未就绪：'+key+suffix);
    const gltf=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,assetKey+suffix);prepareFloatSkinIndices(gltf.scene);if(key.startsWith('fun-'))await prepareFortMaterials(gltf);if(!suffix&&!gltf.animations.length)throw Error('原版动作缺失：'+key);
    await wait();const base=prepared.get(key),reference=key.startsWith('elite.')?this.gpu.get(key.endsWith('.assault')?'viking.assault':type)?.bodyHeight:undefined;
    const batch=await AnimatedBatch.create(gltf,root,key==='interceptor'?.55:heights[type],base?.normalization,suffix?1:TUNING.unitScale,suffix?(key.startsWith('fun-')?key+suffix:undefined):key,suffix?undefined:reference,{cancelled,yield:wait,sliceMs:2});
    if(this.world.starship.enabled)batch.enableApparitions(root);prepared.set(key+suffix,batch);
    if(!suffix&&key===type){const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3());ordinary={gltf,meshes:[],data:[],scale:heights[type]*TUNING.unitScale/Math.max(.001,size.y),center:box.getCenter(new THREE.Vector3()),minY:box.min.y,clips:mapAnimations(gltf.animations)};}
    if(!suffix&&(key==='hero.raynor'||key==='hero.nova'))batch.actions.skill=batch.actions.attack;
   }
   await this.warmDetachedBatches(root,[...prepared.values()].flatMap(b=>b.allMeshes),wait);
   if(cancelled())throw Error('后台模型已失效');
   // All original forms publish together; render cannot observe a half-built body.
   for(const [id,batch] of prepared){this.gpu.set(id,batch);for(const mesh of batch.allMeshes){this.scene.add(mesh);this.screenWarmed.add(mesh);}}
   if(ordinary){this.batches.set(type,ordinary);this.loadedModels++;ordinary.gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)this.loadedTextures++;});}this.stillPresentation=null;ok=true;
  }catch(error){for(const batch of prepared.values())batch.dispose();if(record.promoted){this.modelErrors.push(key+': '+String(error));this.world.paused=true;this.world.announce('增援素材未能载入，请重新载入战场');}}
  finally{this.streamingLoads.delete(key);if(record.promoted)this.assetsPending--;if(!ok)this.variantLoads.delete(key);finish(ok);if(record.promoted)this.world.changed();}});
  return promise;
 }
 /** The target and camera belong to this job. Only synchronous draw sections
  * touch renderer state; every await leaves the live frame free to render. */
 private async compileDetached(object:THREE.Object3D,camera:THREE.Camera,scene:THREE.Scene,wait:()=>Promise<void>){
  type Program={id:number;program:WebGLProgram;isReady:()=>boolean;getUniforms:()=>unknown};
  const programs=()=>this.renderer.info.programs as unknown as Program[],before=new Set(programs().map(p=>p.id));
  const pending=this.compilePresentation(object,camera,scene),created=programs().filter(p=>!before.has(p.id));await pending;
  const gl=this.renderer.getContext(),deadline=performance.now()+60000;
  for(const program of created){
   do{await wait();if(performance.now()>deadline)throw Error('后台着色器准备超时');}while(!program.isReady());
   if(gl.isContextLost()||!gl.getProgramParameter(program.program,gl.LINK_STATUS))throw Error('后台着色器链接失败：'+(gl.getProgramInfoLog(program.program)??''));
   // Completion and LINK_STATUS are checked above. Successful diagnostic-log
   // reads force a long driver synchronization in Chromium; cache first-use
   // uniforms without those redundant log reads, restoring diagnostics before
   // any live frame. Failed links still retain the real driver error log.
   const check=this.renderer.debug.checkShaderErrors;
   try{this.renderer.debug.checkShaderErrors=false;program.getUniforms();}finally{this.renderer.debug.checkShaderErrors=check;}
   this.validatedPrograms.add(program.id);
  }
  // Let the GPU finish newly linked programs asynchronously before an image
  // upload can force their queued driver work into a synchronous browser call.
  if(created.length)await this.waitForGpu();
 }
 private async warmDetachedBatches(root:THREE.Scene,meshes:THREE.Mesh[],wait:()=>Promise<void>){
  root.environment=this.scene.environment;root.fog=this.scene.fog;root.environmentIntensity=this.scene.environmentIntensity;root.environmentRotation.copy(this.scene.environmentRotation);
  this.scene.traverseVisible(node=>{if(node instanceof THREE.Light){const light=node.clone();if(light instanceof THREE.DirectionalLight||light instanceof THREE.SpotLight||light instanceof THREE.PointLight)light.shadow.mapSize.set(32,32);root.add(light);}});
  const camera=this.camera.clone(),target=new THREE.WebGLRenderTarget(32,32,{type:THREE.HalfFloatType,depthBuffer:true}),identity=new THREE.Matrix4();
  camera.position.set(0,35,25);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  // A zero-count InstancedMesh can still compile its material during render.
  // Hide every later submesh until its own compilation/upload slice is ready.
  for(const mesh of meshes){if(mesh instanceof THREE.InstancedMesh)mesh.count=0;mesh.visible=false;}
  try{
   this.sceneShadows.prepare(root);this.contact.prepare(root);
   for(const mesh of meshes){await wait();this.filterTextures(mesh);mesh.visible=true;if(mesh instanceof THREE.InstancedMesh){mesh.count=1;mesh.setMatrixAt(0,identity);mesh.instanceMatrix.needsUpdate=true;}
    await this.compileDetached(mesh,camera,root,wait);
    // Contact depth uses a separate original-pose program. Compile it here too,
    // without resizing or replacing the live contact targets between frames.
    await wait();const colorMaterial=mesh.material,depthMaterial=this.sceneShadows.depth.depthFor(mesh);
    mesh.material=depthMaterial;try{await this.compileDetached(mesh,camera,root,wait);
     const depths=Array.isArray(depthMaterial)?depthMaterial:[depthMaterial],colors=Array.isArray(colorMaterial)?colorMaterial:[colorMaterial],sides=depths.map(m=>m.side);
     const fog=root.fog;
     try{for(let i=0;i<depths.length;i++){const source=colors[i];depths[i].side=source.shadowSide??(source.side===THREE.FrontSide?THREE.BackSide:source.side===THREE.BackSide?THREE.FrontSide:THREE.DoubleSide);depths[i].needsUpdate=true;}root.fog=null;await wait();await this.compileDetached(mesh,camera,root,wait);}
     finally{root.fog=fog;depths.forEach((m,i)=>{m.side=sides[i];m.needsUpdate=true;});}
    }finally{mesh.material=colorMaterial;}
    const textures=new Set<THREE.Texture>();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);for(const texture of [...sceneMaterialTextures(material),...unitMaterialTextures(material)])textures.add(texture);}
    for(const texture of textures){for(const image of Array.isArray(texture.image)?texture.image:[texture.image])if(typeof image?.decode==='function')await image.decode();await wait();this.renderer.initTexture(texture);}
    // Match the contact pass (no nested shadows), then the colour/shadow pass.
    // Each synchronous draw restores the live target before the next yield.
    await wait();let previous=this.renderer.getRenderTarget();const auto=this.renderer.shadowMap.autoUpdate,needs=this.renderer.shadowMap.needsUpdate;
    try{this.renderer.setRenderTarget(target);this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=false;mesh.material=depthMaterial;this.renderer.render(root,camera);}
    finally{mesh.material=colorMaterial;this.renderer.shadowMap.autoUpdate=auto;this.renderer.shadowMap.needsUpdate=needs;this.renderer.setRenderTarget(previous);}
    await wait();previous=this.renderer.getRenderTarget();try{this.renderer.setRenderTarget(target);this.renderer.render(root,camera);}finally{this.renderer.setRenderTarget(previous);if(mesh instanceof THREE.InstancedMesh)mesh.count=0;mesh.visible=false;}
   }
   await this.waitForGpu();
  }finally{for(const mesh of meshes){if(mesh instanceof THREE.InstancedMesh)mesh.count=0;mesh.visible=false;}root.traverse(node=>{if(node instanceof THREE.DirectionalLight||node instanceof THREE.SpotLight||node instanceof THREE.PointLight){node.shadow.map?.dispose();node.shadow.mapPass?.dispose();}});target.dispose();}
 }

 /** The same selected-race roster that formerly blocked startup, including the
  * fixed enemy roster. Near-term enemies precede unchosen elites and heroes. */
 completePreloadModels(){
  const models=new Map<string,UnitType>();
  for(const entry of campaignPreloadModels(1,18))models.set(...entry);
  for(const entry of this.raceModels(this.world.expedition.race))models.set(...entry);
  for(const {key,type}of equipmentRuntimeModels(this.world,this.world.expedition.race))models.set(displayLoadModelKey(key,type),type);
  for(const type of ENDLESS.bossTypes)models.set(type,type);
  return models;
 }
 /** Required entrances still prepare every actual unit, form and reward before
  * use. Only speculative future GPU work is narrower on touch devices. */
 backgroundPreloadModels(){
  if(!this.memoryConstrainedPreload)return this.completePreloadModels();
  const w=this.world,models=this.currentModels();
  for(const entry of openingPreloadModels(w.expedition.race,w.runConfig?.frozenTalents.levels))models.set(...entry);
  for(const entry of campaignPreloadModels(w.endless?1:Math.max(1,w.stage),w.endless?18:Math.min(18,w.stage+1)))models.set(...entry);
  for(const entry of plannedBossPreloadModels(w.expedition.firstBossLoot))models.set(...entry);
  return models;
 }
 completePreloadStatus(){
  const models=[...this.completePreloadModels()].map(([key,type])=>displayLoadModelKey(key,type));
  const missing=models.filter(key=>{const batch=this.gpu.get(key);return !batch||!batch.allMeshes.every(mesh=>this.screenWarmed.has(mesh));});
  const buildings=['bunker','repair'].flatMap(kind=>[...(this.staticTemplateReady('model.fort.'+kind)?[]:[kind]),...(this.staticTemplateReady('model.fort.'+kind+'.death')?[]:[kind+'.death'])]);
  const map=this.staticTemplateReady('map.endless');
  return {total:models.length+5,ready:models.length-missing.length+4-buildings.length+Number(map),missing:[...missing,...buildings.map(key=>'fort.'+key),...map?[]:['map.endless']],complete:!missing.length&&!buildings.length&&map};
 }
 private staticTemplateReady(id:string){return this.staticWarmEpoch.get(id)===this.contextEpoch&&(id==='map.endless'?!!this.world.endlessField&&this.mapViews.has(this.world.endlessField):(id.endsWith('.death')?this.fortDeathTemplates:this.fortTemplates).has(id.includes('bunker')?'bunker':'repair'));}
 /** Optional static templates use their own scene and render target too. No
  * incomplete building or map is published into the live battlefield. */
 private async streamEndlessTemplate(id:string,checkpoint:(cancelled:()=>boolean)=>Promise<void>){
  const epoch=this.contextEpoch,runId=this.world.runId,terrain=this.world.endlessField,cancelled=()=>epoch!==this.contextEpoch||runId!==this.world.runId,wait=()=>checkpoint(cancelled),root=new THREE.Scene();
  let map:MapView|undefined,group:THREE.Object3D|undefined,published=false,reused=false;
  try{
   await wait();
   const existing=id==='map.endless'?(terrain&&this.mapViews.has(terrain)?this.scene.getObjectByName(FlatTerrain.id):undefined):(id.endsWith('.death')?this.fortDeathTemplates:this.fortTemplates).get(id.includes('bunker')?'bunker':'repair');
   if(existing){group=clone(existing);root.add(group);reused=true;}
   else if(id==='map.endless'){
    await prepareEmbeddedAssetIds(['terrain.char',...environmentAssetIds('char')]);await wait();
    if(!(terrain instanceof FlatTerrain))throw Error('无尽地图定义不是独立平地');
    map=await createFlatMap(root,terrain,wait);group=root.getObjectByName(FlatTerrain.id)!;
   }else{
    await prepareEmbeddedAssetIds([id]);await wait();const source=assetUrl(id);if(!source)throw Error('缺少原版建筑模型：'+id);
    const gltf=await restoreSc2Materials(await new ManagedGLTFLoader().loadAsync(source));await wait();
    const kind=id.includes('bunker')?'bunker':'repair',death=id.endsWith('.death'),clip=gltf.animations.find(action=>action.name===(death?'Death':'Stand'));
    if(!clip)throw Error('原版建筑动作缺失：'+id);
    const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=(kind==='bunker'?3.2:4)/Math.max(size.x,size.z),model=clone(gltf.scene);
    group=new THREE.Group();model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.scale.setScalar(scale);group.add(model);root.add(group);group.userData.preparedClip=clip;
   }
   const visible=new Map<THREE.Object3D,boolean>(),instances=new Map<THREE.InstancedMesh,{count:number;first:THREE.Matrix4}>(),meshes:THREE.Mesh[]=[];group.traverse(node=>{visible.set(node,node.visible);node.visible=true;if(node instanceof THREE.Mesh)meshes.push(node);if(node instanceof THREE.InstancedMesh){const first=new THREE.Matrix4();node.getMatrixAt(0,first);instances.set(node,{count:node.count,first});}});
   try{await this.warmDetachedBatches(root,meshes,wait);}finally{for(const [node,value]of visible)node.visible=value;for(const [mesh,{count,first}]of instances){mesh.count=count;mesh.setMatrixAt(0,first);mesh.instanceMatrix.needsUpdate=true;}}
   if(cancelled())throw Error('后台资源准备已取消');
   if(reused)group.removeFromParent();
   else if(map&&terrain){map.setVisible(false);this.scene.add(group);this.mapViews.set(terrain,map);}
   else{const kind=id.includes('bunker')?'bunker':'repair',death=id.endsWith('.death');group.removeFromParent();(death?this.fortDeathTemplates:this.fortTemplates).set(kind,group as THREE.Group);this.fortClips.set(`${kind}:${death?'death':'stand'}`,group.userData.preparedClip);delete group.userData.preparedClip;}
   this.staticWarmEpoch.set(id,epoch);published=true;
  }finally{if(reused){group?.removeFromParent();group?.traverse(node=>{if(node instanceof THREE.SkinnedMesh)node.skeleton.dispose();if(node instanceof THREE.InstancedMesh)node.dispose();if(node instanceof THREE.Mesh&&Array.isArray(node.material))node.customDepthMaterial?.dispose();});}else if(!published){if(map)map.dispose?.();else group?.traverse(node=>{if(node instanceof THREE.Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();}});}}
 }
 /** Complete startup work advances in paced slices throughout battles and
  * intermissions. The chosen reward can move to the front of the remaining work. */
 battleBackgroundJobs(checkpoint:(cancelled:()=>boolean,priority?:boolean)=>Promise<void>):PreparationJob[]{
  const models=this.backgroundPreloadModels();
  const epoch=this.contextEpoch,runId=this.world.runId,cancelled=()=>epoch!==this.contextEpoch||runId!==this.world.runId;
  const ids=new Set(modelPreloadAssets([...models].map(([key,type])=>[displayAssetModelKey(key),type] as const)));
  const fileOwners=new Map<string,string[]>();
  for(const [key,type]of models)for(const id of modelPreloadAssets([[displayAssetModelKey(key),type]]))fileOwners.set(id,[...(fileOwners.get(id)??[]),displayLoadModelKey(key,type)]);
  // An encoded model may have been retired after parsing. Its live batches own
  // all forms already; an optional file job must not refill that retired Blob.
  const fileReady=(id:string)=>!!assetUrl(id)||!!fileOwners.get(id)?.every(key=>this.gpu.has(key));
  for(const [key,type] of models)for(const id of modelPreloadAssets([[displayAssetModelKey(key),type]]))for(const texture of unitMaterialDependencies(id.slice(6)))ids.add(texture);
  const modelJob=(key:string,type:UnitType,priority=false):PreparationJob=>({key:`${priority?'boss':'roster'}:${epoch}:${runId}:${key}`,priority,paced:true,isReady:()=>this.gpu.has(displayLoadModelKey(key,type)),run:async()=>{if(!await this.streamUnitVariant(key,type,cancelled=>checkpoint(cancelled,priority)))throw Error('后台模型准备未完成：'+key);}});
  const jobs:PreparationJob[]=[...[...plannedBossPreloadModels(this.world.expedition.firstBossLoot)].map(([key,type])=>modelJob(key,type,true)),...[...models].map(([key,type])=>modelJob(key,type))];
  if(!this.memoryConstrainedPreload||this.world.endless||this.world.stage>=17)for(const id of ['model.fort.bunker','model.fort.bunker.death','model.fort.repair','model.fort.repair.death','map.endless'])jobs.push({key:`template:${epoch}:${runId}:${id}`,paced:true,isReady:()=>this.staticTemplateReady(id),run:()=>this.streamEndlessTemplate(id,checkpoint)});
  return [...jobs,...[...ids].filter(id=>!fileReady(id)).map(id=>({key:`file:${epoch}:${runId}:${id}`,paced:true,isReady:()=>fileReady(id),run:async()=>{await checkpoint(cancelled);if(!fileReady(id))await prepareEmbeddedAssetIds([id]);}}))];
 }
 private async commonTask(key:string,run:()=>Promise<unknown>){if(this.preparedCommon.has(key))return;await run();if(key==='effects'&&this.fx.errors.length||key==='pickups'&&this.pickups.errors.length)throw Error('公共资源未完成：'+key);this.preparedCommon.add(key);}
 private commonAssetIds(){return [...ASSETS.values()].filter(a=>a.status==='available'&&(a.kind==='effect-texture'||a.kind==='combat-effect-model'||a.kind==='combat-effect-texture'||['p4.texture.beam','p4.texture.flare','p4.texture.heal','model.hero-upgrade.vikingfightermissile','model.baneling','model.loot.mineral','model.loot.gas','model.loot.large','model.projectile.marauder','model.projectile.hydralisk'].includes(a.id))).map(a=>a.id);}
 private commonTasks():PreparationJob[]{return [
  {key:'effects',run:()=>this.fx.load()}, {key:'source-combat-effects',run:async()=>{await this.sourceCombatEffects.load();await this.sourceCombatEffects.player.prepareMeshes(async (root,displacement)=>{await this.preloadTextures(root);this.filterTextures(root);if(displacement)await this.refraction.prepare(this.renderer,root);else await this.compilePresentation(root,this.camera,this.scene);});}}, {key:'ordinary-effects',run:async()=>{await this.nonHeroEffects.load();this.lowDanger.prepare();}},
  {key:'protoss-elites',run:()=>this.protossEliteEffects.load()}, {key:'zerg-elites',run:()=>this.zergEliteEffects.load()},
  {key:'medical',run:()=>this.eliteSupportEffects.loadMedicalTextures()}, {key:'terran-elites',run:()=>this.terranEliteEffects.load()},
  {key:'heroes',run:()=>this.confirmedHeroes.prepare()}, {key:'zerg-heroes',run:()=>this.zergHeroes.prepare()},
  {key:'protoss-heroes',run:async()=>this.protossHeroes.prepare()}, {key:'pickups',run:()=>this.pickups.load()}
 ];}
 /** Optional models are capped across selection changes. Formal entrance owns the
  * uncapped required roster; optional work never changes World or publishes readiness. */
 backgroundJobs(race:Race,hero:HeroId|null=null,map?:CampaignMapRecipe,snapshot?:Readonly<RunSnapshot>):PreparationJob[]{
  const jobs:PreparationJob[]=[],models=new Map<string,UnitType>([['zergling','zergling']]);
  if(hero&&HEROES[hero]?.race===race)models.set(HEROES[hero].model,HEROES[hero].baseFamily);
  if(snapshot){for(const u of snapshot.state.entities.values())if(u.hp>0)models.set(displayActiveModelKey(u),u.unitType);
   const stage=snapshot.state.battlefield.mode==='endless'?18:Math.min(18,snapshot.state.stage+(snapshot.state.phase==='reward'?1:0));
   for(const [family,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)models.set(family as UnitType,family as UnitType);
   for(const type of snapshot.state.battlefield.mode==='endless'?ENDLESS.bossTypes:BOSSES[stage]?[BOSSES[stage].type]:[])models.set(type,type);
  }
  if(this.world.phase==='reward')for(const entry of this.currentModels())models.set(...entry);
  for(const entry of openingPreloadModels(race))models.set(...entry);
  const selectedModels=[...models].slice(0,24);this.backgroundDesired=new Set(selectedModels.map(([key])=>key));
  const addModel=(key:string,type:UnitType)=>jobs.push({key:'unit:'+key,isReady:()=>this.gpu.has(key),run:async()=>{
   if(!this.gpu.has(key)&&this.backgroundModels.size>=24){const stale=[...this.backgroundModels].find(k=>!this.backgroundDesired.has(k));if(stale&&!this.initialAssetsLoaded&&this.world.phase==='menu')this.retireOptional(stale);else return;}
   await MeshoptSimplifier.ready;
   await prepareEmbeddedAssetIds([...modelPreloadAssets([[displayAssetModelKey(key),type]]),...unitMaterialDependencies(displayAssetModelKey(key)),...unitMaterialDependencies(displayAssetModelKey(key)+'.death')]);
   if(!await this.ensureUnitVariant(key,type,true))throw Error('Optional model unavailable');
   this.backgroundModels.add(key);await this.warmPresentationBatches(()=>{},true);
  }});
  const first=selectedModels.slice(0,2);for(const [key,type] of first)addModel(key,type);
  if(map)jobs.push({key:'map:'+JSON.stringify(map),isReady:()=>[...this.mapViews.keys()].some(t=>t.definition?.source.sha256===campaignDefinition(map).source.sha256),run:()=>this.prepareCampaignAssets(map)});
  // Small immutable decode jobs precede material creation, and are shared with the gate.
  for(const id of this.commonAssetIds())jobs.push({key:'asset:'+id,run:()=>prepareEmbeddedAssetIds([id])});
  for(const task of this.commonTasks())jobs.push({key:'common:'+task.key,run:async()=>{
   if(this.commonAssetIds().some(id=>!assetUrl(id)))throw Error('Optional dependencies incomplete');
   const previous=new Set<THREE.Object3D>();this.scene.traverse(n=>previous.add(n));await this.commonTask(task.key,task.run);
   const added:THREE.InstancedMesh[]=[];this.scene.traverse(n=>{if(n instanceof THREE.InstancedMesh&&!previous.has(n)&&n.count===0)added.push(n);});
   for(let i=0;i<added.length;i+=4){await this.prewarmBatches(added.slice(i,i+4));await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  }});
  for(const [key,type] of selectedModels.slice(2))addModel(key,type);
  return jobs.map(job=>({key:this.contextEpoch+':'+job.key,isReady:job.isReady,run:async()=>{this.backgroundBusy=true;try{return await job.run();}finally{this.backgroundBusy=false;}}}));
 }
 async load(progress:(label:string,done?:number,total?:number)=>void,rescueRace:Race=this.world.expedition.race,skipMap=false){await MeshoptSimplifier.ready;const loader=new ManagedGLTFLoader();
  // Fail required race assets before constructing common scene objects. Successful
  // worker/templates cache individually, so retry reuses them without duplicate meshes.
  await this.prepareRescueAssets(rescueRace);
  const initialTypes:UnitType[]=rescueRace==='terran'?['marine','zergling']:rescueRace==='protoss'?['zealot','zergling']:['zergling'];await prepareEmbeddedAssetIds(initialTypes.flatMap(type=>[`model.${type}`,...['.death',...(type==='tank'?['.siege','.morph']:[])].map(suffix=>`model.${type}${suffix}`)].filter(id=>ASSETS.has(id))));
  for(const type of initialTypes){progress(`载入 ${SC2_UNITS[type].name}`);if(!await this.ensureUnitVariant(type,type))throw Error('开局模型未就绪：'+type);}
  await prepareEmbeddedAssetIds(this.commonAssetIds());for(const task of this.commonTasks())await this.commonTask(task.key,task.run);this.modelErrors.push(...this.pickups.errors.map(e=>'resource: '+e));
  if(!skipMap&&this.world.terrain?.definition){this.mapTerrain=this.world.terrain;this.mapView=this.world.terrain instanceof RadialTerrain?await createCampaignMap(this.scene,this.world.terrain):await Promise.reject<MapView>(new Error('不支持的战役地图'));this.mapView.setVisible(true);this.mapViews.set(this.mapTerrain,this.mapView);this.terrainUpdate=()=>this.mapView?.update(this.camera,this.sceneShadows.enabled?this.sceneShadows.view:undefined);}else if(!skipMap)this.terrainUpdate=await createTerrain(this.scene,this.world);
  for(const [key,height] of [['drone',.7],['egg',1.3]] as const){if(this.gpu.has(key))continue;const url=assetUrl('model.'+key);if(!url){this.modelErrors.push(key+': missing model');continue;}try{this.gpu.set(key,await this.createAnimatedBatch(await loadUnitMaterialGltf(loader,url,key),this.scene,height));}catch(e){this.modelErrors.push(key+': '+String(e));}}
  await this.prepareWorkerDeath('drone',.7);
  this.filterTextures(this.scene);const visible:THREE.Object3D[]=[];for(const b of this.gpu.values())for(const m of b.allMeshes){if(!m.visible){visible.push(m);m.visible=true;}}
  try{
   // Wait for parallel shader compilation, then upload effect atlases before their first combat use.
   // Both steps happen behind the loading screen; no dummy particles enter the scene.
   this.sceneShadows.prepare();this.contact.prepare(this.scene);await this.compilePresentation(this.scene,this.camera);
   const inactive:THREE.InstancedMesh[]=[];
   this.scene.traverse(node=>{if(node instanceof THREE.InstancedMesh&&node.count===0)inactive.push(node);});
   progress('GPU 准备场景',0,0);
   await this.prewarmBatches(inactive,true);
   await this.finishProgramWarmup((done,total)=>progress('GPU 校验着色器',done,total));
   for(const g of [...this.podTemplates.values(),...this.podBirthTemplates.values(),...this.podDeathTemplates.values()]){await this.compilePresentation(g.scene,this.camera,this.scene);await this.preloadTextures(g.scene);}
   if(this.hiveTemplate){await this.compilePresentation(this.hiveTemplate,this.camera,this.scene);await this.preloadTextures(this.hiveTemplate);}
   if(this.mapView&&this.world.terrain?.definition){const terrain=this.world.terrain,key=terrain instanceof RadialTerrain?terrain.definition.source.sha256:'terrain-'+terrain.definition!.source.name;const root=this.scene.getObjectByName(key);if(!root)throw Error('地图场景未就绪');await this.preloadTextures(root,true);}
   for(const batch of this.fx.batches.values()){
    const material=batch.mesh.material as THREE.ShaderMaterial;
    const texture=material.uniforms.map?.value;
    if(texture instanceof THREE.Texture)this.renderer.initTexture(texture);
   }
  }finally{for(const m of visible)m.visible=false;}
  if(this.preparationControl?.cancelled?.())throw Error('战场准备已取消');
  this.initialAssetsLoaded=true;
 }
 preparationControl?:PosePreparationControl;
 private createAnimatedBatch(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number){const epoch=this.contextEpoch,control=this.preparationControl;return AnimatedBatch.create(gltf,scene,height,normalization,unitScale,profile,referenceBodyHeight,{...control,cancelled:()=>this.contextEpoch!==epoch||!!control?.cancelled?.()}).then(batch=>{if(this.world.starship.enabled)batch.enableApparitions(scene);return batch;});}
 private variantLoads=new Map<string,Promise<boolean>>();private variantQueue=Promise.resolve();assetsPending=0;
 async waitForPendingAssets(){await this.variantQueue;if(this.assetsPending>0)throw Error('仍有资源未完成准备');}
 ensureUnitVariant(key:string,type:UnitType,optional=false):Promise<boolean>{const silent=optional||this.entryPreparation;key=displayLoadModelKey(key,type);if(key.startsWith('elite.')){if(!this.gpu.has(type))void this.ensureUnitVariant(type,type,optional);if(key.endsWith('.assault')&&!this.gpu.has('viking.assault'))void this.ensureUnitVariant('viking.assault','viking',optional);}const existing=this.variantLoads.get(key);if(existing){const stream=this.streamingLoads?.get(key);if(stream&&!optional&&!stream.promoted){stream.promoted=true;this.assetsPending++;}return existing;}if(this.gpu.has(key))return Promise.resolve(true);this.modelErrors=this.modelErrors.filter(error=>!error.startsWith(key+':'));
  // HUD listeners can request this same model synchronously. Publish both the promise and
  // queue entry before notifying them, so one arrival cannot recursively start more loads.
  let finish!:(ok:boolean)=>void;const result=new Promise<boolean>(resolve=>finish=resolve);this.variantLoads.set(key,result);this.assetsPending++;
  this.variantQueue=this.variantQueue.then(async()=>{const existingKeys=new Set(this.gpu.keys());let ok=false;try{
   const suffixes=['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])];
   const assetKey=displayAssetModelKey(key);
   await prepareEmbeddedAssetIds([`model.${assetKey}`,...suffixes.map(suffix=>`model.${assetKey}${suffix}`).filter(id=>ASSETS.has(id))]);
   const loader=new ManagedGLTFLoader(),url=assetUrl('model.'+assetKey);if(!url)throw Error('missing original model');const gltf=await loadUnitMaterialGltf(loader,url,assetKey);if(key.startsWith('fun-'))await prepareFortMaterials(gltf);if(!gltf.animations.length)throw Error('missing original animation');if(key===type){await this.prepareUnit(type,gltf);this.loadedModels++;}else this.gpu.set(key,await this.createAnimatedBatch(gltf,this.scene,key==='interceptor'?.55:heights[type],undefined,TUNING.unitScale,key,key.startsWith('elite.')?this.gpu.get(key.endsWith('.assault')?'viking.assault':type)?.bodyHeight:undefined));const base=this.gpu.get(key)!;
   // The approved showcase casts both rifle skills from their original firing pose.
   if(key==='hero.raynor'||key==='hero.nova')base.actions.skill=base.actions.attack;
   for(const suffix of ['.death',...(type==='tank'&&!key.startsWith('hero.')?['.siege','.morph']:[])]){const path=assetUrl('model.'+assetKey+suffix);if(!path){if(suffix!=='.death')throw Error('missing original tank form '+suffix);continue;}const form=await loadUnitMaterialGltf(loader,path,assetKey+suffix);if(key.startsWith('fun-'))await prepareFortMaterials(form);this.gpu.set(key+suffix,await this.createAnimatedBatch(form,this.scene,heights[type],base.normalization,1,key.startsWith('fun-')?key+suffix:undefined));}for(const [id,b] of this.gpu)if(id===key||id.startsWith(key+'.'))for(const mesh of b.allMeshes)this.filterTextures(mesh);const hidden:THREE.Object3D[]=[],inactive:THREE.InstancedMesh[]=[];for(const [id,b] of this.gpu)if(id===key||id.startsWith(key+'.'))for(const m of b.allMeshes){if(!m.visible){hidden.push(m);m.visible=true;}if(m.count===0)inactive.push(m);}try{if(!silent){await this.prewarmBatches(inactive);await this.finishProgramWarmup();}}finally{for(const m of hidden)m.visible=false;}ok=true;
   }catch(e){for(const [id,batch] of this.gpu)if(!existingKeys.has(id)&&(id===key||id.startsWith(key+'.'))){batch.dispose();this.gpu.delete(id);}if(!existingKeys.has(key)&&this.batches.delete(key as UnitType))this.loadedModels--;if(!optional)this.modelErrors.push(key+': '+String(e));if(!silent){this.world.paused=true;this.world.announce('增援素材未能载入，请重新载入战场');}}finally{this.assetsPending--;if(ok)this.modelErrors=this.modelErrors.filter(error=>!error.startsWith(key+':'));else this.variantLoads.delete(key);finish(ok);if(!silent)this.world.changed();}});if(!silent)this.world.changed();return result;
 }
 async prepareCampaignAssets(recipe:CampaignMapRecipe){const terrain=campaignTerrain(recipe);await prepareEmbeddedAssetIds([...campaignMapAssets(recipe),...fullEnvironmentModelIds(recipe.theme),...environmentAssetIds(recipe.theme)]);if(![...this.mapViews.keys()].some(t=>t.definition?.source.sha256===terrain.definition.source.sha256)){const view=await createCampaignMap(this.scene,terrain);this.mapViews.set(terrain,view);view.setVisible(true);try{const root=this.scene.getObjectByName(terrain.definition.source.sha256)!;this.filterTextures(root);await this.preloadTextures(root);this.sceneShadows.prepare();this.contact.prepare(this.scene);await this.compilePresentation(this.scene,this.camera);}finally{view.setVisible(this.world.terrain===terrain);}}
  for(const [key,view] of this.mapViews)if(key instanceof RadialTerrain&&key.definition.source.sha256!==terrain.definition.source.sha256&&key!==this.world.terrain){view.dispose?.();this.mapViews.delete(key);}
 }
 private syncMap(){const terrain=this.world.terrain;if(this.mapSwitching||terrain===this.mapTerrain||!terrain)return;this.mapTerrain=terrain;const previous=[...this.mapViews.keys()].find(t=>t.definition?.source.sha256&&t.definition.source.sha256===terrain.definition?.source.sha256),cached=this.mapViews.get(terrain)??(previous?this.mapViews.get(previous):undefined);if(cached&&previous!==terrain){cached.bindTerrain?.(terrain);if(previous)this.mapViews.delete(previous);this.mapViews.set(terrain,cached);}for(const view of this.mapViews.values())view.setVisible(view===cached);if(cached){this.mapView=cached;this.cameraTarget.set(this.world.anchor.x,this.ground(this.world.anchor),this.world.anchor.z);this.terrainUpdate=()=>this.mapView?.update(this.camera,this.sceneShadows.enabled?this.sceneShadows.view:undefined);return;}
  this.mapSwitching=true;this.assetsPending++;this.world.changed();void (terrain instanceof FlatTerrain?createFlatMap(this.scene,terrain):terrain instanceof RadialTerrain?createCampaignMap(this.scene,terrain):Promise.reject<MapView>(new Error('不支持的战役地图'))).then(view=>{this.mapViews.set(terrain,view);view.setVisible(this.world.terrain===terrain);if(this.world.terrain===terrain){this.mapView=view;this.cameraTarget.set(this.world.anchor.x,this.ground(this.world.anchor),this.world.anchor.z);this.terrainUpdate=()=>this.mapView?.update(this.camera,this.sceneShadows.enabled?this.sceneShadows.view:undefined);this.filterTextures(this.scene);}}).catch(error=>{this.modelErrors.push('map: '+String(error));this.world.paused=true;this.world.announce('无尽地图素材未能载入');}).finally(()=>{this.assetsPending--;this.mapSwitching=false;this.syncMap();this.world.changed();});
 }
 /** Required building models and the flat map must be GPU-ready before World may switch. */
 async prepareEndlessAssets(progress:(done:number,total:number,label:string)=>void=()=>{}){
  const terrain=this.world.endlessField;if(!(terrain instanceof FlatTerrain))throw Error('无尽地图定义不是独立平地');
  for(const type of ENDLESS.bossTypes)if(!this.gpu.has(type)&&!await this.ensureUnitVariant(type,type))throw Error('无尽首领模型未就绪：'+type);
  const ids=['model.fort.bunker','model.fort.bunker.death','model.fort.repair','model.fort.repair.death','map.endless'],control=this.preparationControl;let done=0;
  for(const id of ids){if(!this.staticTemplateReady(id))await this.streamEndlessTemplate(id,async cancelled=>{if(cancelled()||control?.cancelled?.())throw Error('战场准备已取消');await new Promise<void>(resolve=>setTimeout(resolve,0));});progress(++done,ids.length,id);}
 }

 private requiredFamilies():UnitType[]{
  const w=this.world;if(!w.expedition)return [];
  const families=new Set<UnitType>(w.expedition.familySlots);
  for(const u of w.entities.values())if(!isAirHeroType(u.unitType))families.add(u.unitType);
  for(const family of selectedProductionFamilies(w.expedition))families.add(family);
  for(const job of w.expedition.ledger)if(job.state!=='settled')families.add(job.family);
  for(const pod of w.pods)if(['falling','active','opening'].includes(pod.status)){families.add(pod.unitType);for(const guard of pod.guardTypes)families.add(guard);}
  const stage=w.endless?18:Math.min(18,w.stage+(w.phase==='reward'?1:0));
  for(const [family,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)families.add(family as UnitType);
  for(const type of w.endless?ENDLESS.bossTypes:BOSSES[stage]?[BOSSES[stage].type]:[])families.add(type);
  return [...families];
 }
 private raceModels(race:Race){const models=new Map([...racePreloadModels(race)].map(([key,type])=>[displayLoadModelKey(key,type),type] as const));if(race==='protoss')models.set(ELITES['carrier.1'].model,'carrier');return models;}
 private modelKey(u:Entity):string{return displayActiveModelKey(u);}
 prepareRosterAssets(){if(!this.initialAssetsLoaded)return;this.syncMap();for(const family of this.requiredFamilies())if(!this.gpu.has(family))void this.ensureUnitVariant(family,family);
  for(const u of this.world.entities.values()){for(const key of [displayModelKey(u),this.modelKey(u)])if(key&&!this.gpu.has(key))void this.ensureUnitVariant(key,u.unitType);if(!u.heroId&&u.desiredNativeMode==='hellbat')void this.ensureUnitVariant('hellion.hellbat',u.unitType);if(!u.heroId&&u.desiredNativeMode==='viking_assault')void this.ensureUnitVariant('viking.assault',u.unitType);}
  for(const offer of this.world.rewards){if(offer.kind==='hero'&&Object.hasOwn(HEROES,offer.value)){const hero=HEROES[offer.value as HeroId];void this.ensureUnitVariant(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}else if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)){const elite=ELITES[offer.value as EliteId];void this.ensureUnitVariant(elite.model,elite.family);}}
 }
 private funProps=new FunPropAssets();
 private specialVisuals?:SpecialVisuals;private specialSceneKey:string|null=null;private encounterVisuals?:EncounterVisuals;private funVisuals?:FunVisuals;
 private missionProps=new Map<number,THREE.Group>();
 private missionTemplates=new Map<string,{root:THREE.Group;clip:THREE.AnimationClip;height:number}>();
 private missionViews=new Map<number,{root:THREE.Object3D;mixer:THREE.AnimationMixer;height:number}>();
 private missionDeathTemplates=new Map<string,{root:THREE.Group;clip:THREE.AnimationClip}>();
 private missionDeaths=new Map<number,{root:THREE.Object3D;mixer:THREE.AnimationMixer;clip:THREE.AnimationClip;at:number}>();
 private async prepareMissionAssets(scope:BattleSceneScope){
  const plan=battleScenePreload(scope);
  if(plan.hive){
   const loader=new ManagedGLTFLoader();await prepareEmbeddedAssetIds(['model.hive','model.hatchery.death']);
   if(!this.hiveDeathTemplate){const url=assetUrl('model.hatchery.death');if(!url)throw Error('主巢死亡资源未就绪');this.hiveDeathTemplate=await restoreSc2Materials(await loader.loadAsync(url));await this.compilePresentation(this.hiveDeathTemplate.scene,this.camera,this.scene);await this.preloadTextures(this.hiveDeathTemplate.scene);}
   if(!this.hiveTemplate){const url=assetUrl('model.hive');if(!url)throw Error('主巢资源未就绪');const g=await loader.loadAsync(url),box=new THREE.Box3().setFromObject(g.scene),size=box.getSize(new THREE.Vector3());g.scene.scale.setScalar(6/Math.max(size.x,size.z));this.hiveTemplate=g.scene;await this.compilePresentation(this.hiveTemplate,this.camera,this.scene);await this.preloadTextures(this.hiveTemplate);}
  }
  if(!this.funProps.ready){const props=await this.funProps.prepare();this.filterTextures(props);await this.preloadTextures(props);await this.compilePresentation(props,this.camera,this.scene);}
  if(!this.rescueBeaconTexture){const id='combat-fx.texture.2f6012318376ba66e4436768';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('原版营救光标资源缺失');this.rescueBeaconTexture=await sharedMaterialTextures.image(url);}
  for(const key of plan.workers){const height=key==='scv'?1.35:key==='probe'?.9:.7;if(!this.gpu.has(key)){await prepareEmbeddedAssetIds(['model.'+key]);const url=assetUrl('model.'+key);if(!url)throw Error('任务工人模型缺失：'+key);this.gpu.set(key,await this.createAnimatedBatch(await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key),this.scene,height));}await this.prepareWorkerDeath(key,height);}
  // Buildings use original skeletal meshes. Unit instancing adds pose, aim and
  // apparition attributes which exceed WebGL's 16 slots on these source meshes.
  for(const key of plan.buildings){
   if(this.missionTemplates.has(key))continue;await prepareEmbeddedAssetIds(['model.'+key]);const url=assetUrl('model.'+key);if(!url)throw Error('任务原模型缺失：'+key);
   const gltf=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key);let embedded=false;gltf.scene.traverse(n=>{if(n.userData.sc2FortMaterials)embedded=true;});if(embedded)await prepareFortMaterials(gltf);const clip=gltf.animations.find(c=>c.name==='Stand')??gltf.animations.find(c=>/^Stand/.test(c.name));if(!clip)throw Error('任务原版待机动作缺失：'+key);
   updateFortMaterials(gltf.scene,clip.name,0);const box=sc2BodyBounds(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=(key==='mission.tower'?2.5:4.8)/Math.max(size.x,size.z),root=new THREE.Group(),model=clone(gltf.scene);
   model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.add(model);root.name='mission-model:'+key;
   await this.compilePresentation(root,this.camera,this.scene);this.filterTextures(root);await this.preloadTextures(root);await this.prewarmBatches([],false,[root]);this.missionTemplates.set(key,{root,clip,height:size.y*scale});
  }
  for(const key of plan.deaths){
   if(this.missionDeathTemplates.has(key))continue;const id='model.'+key+'.death';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('任务死亡模型缺失：'+key);
   const gltf=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key+'.death');let embedded=false;gltf.scene.traverse(n=>{if(n.userData.sc2FortMaterials)embedded=true;});if(embedded)await prepareFortMaterials(gltf);
   const clip=gltf.animations.find(c=>/^Death/.test(c.name));if(!clip)throw Error('任务死亡动作缺失：'+key);
   const root=new THREE.Group(),model=clone(gltf.scene),live=this.missionTemplates.get(key)!.root.children[0];model.scale.copy(live.scale);model.position.copy(live.position);root.add(model);root.name='mission-death:'+key;
   updateFortMaterials(root,clip.name,0);await this.compilePresentation(root,this.camera,this.scene);this.filterTextures(root);await this.preloadTextures(root);this.missionDeathTemplates.set(key,{root,clip});
  }
 }
 private playMissionDeath(event:VisualEvent){
  const key=event.missionModel==='hive'?'hatchery':event.missionModel;if(!key||this.missionDeaths.has(event.entityId))return;
  if(['scv','drone','probe'].includes(key)){this.corpses.set(event.entityId,{type:key,x:event.x,z:event.z,y:this.ground(event),facing:event.facing,at:event.time,scale:1,revealed:event.revealed!==false});return;}
  const template=this.missionDeathTemplates.get(key);if(!template||this.world.time-event.time>template.clip.duration)return;
  const root=clone(template.root),mixer=new THREE.AnimationMixer(root.children[0]),action=mixer.clipAction(template.clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();root.position.set(event.x,this.ground(event),event.z);root.rotation.y=event.facing;root.visible=event.revealed!==false;root.userData.deathRevealed=event.revealed!==false;this.scene.add(root);this.missionDeaths.set(event.entityId,{root,mixer,clip:template.clip,at:event.time});
 }
 private podBirthTemplates=new Map<Race,GLTF>();private podDeathTemplates=new Map<Race,GLTF>();
 private async prepareWorkerDeath(key:string,height:number){
  if(this.gpu.has(key+'.death'))return;const id='model.'+key+'.death';await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('工人死亡资源未就绪：'+key);
  const g=await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,key+'.death');this.gpu.set(key+'.death',await this.createAnimatedBatch(g,this.scene,height,this.gpu.get(key)?.normalization));
 }
 async prepareEliteSupportAssets(){if(!this.gpu.has('support.mine')){await prepareEmbeddedAssetIds(['model.support.mine']);const url=assetUrl('model.support.mine');if(!url)throw Error('蜘蛛雷素材未就绪');this.gpu.set('support.mine',await this.createAnimatedBatch(await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,'support.mine'),this.scene,.5));}}
 async prepareRescueAssets(race:Race){
  if(race==='terran'&&!this.gpu.has('support.mine')){await prepareEmbeddedAssetIds(['model.support.mine']);const url=assetUrl('model.support.mine');if(!url)throw Error('蜘蛛雷素材未就绪');this.gpu.set('support.mine',await this.createAnimatedBatch(await loadUnitMaterialGltf(new ManagedGLTFLoader(),url,'support.mine'),this.scene,.5));}
  const {workerModel,carrierModel,carrierBirthModel,carrierDeathModel}=RESCUE_PRESENTATION[race],loader=new ManagedGLTFLoader();
  await prepareEmbeddedAssetIds([...racePreloadModels(race).keys()].filter(k=>!k.includes('.')).map(k=>'wireframe.'+k).filter(id=>ASSETS.has(id)));
  await prepareEmbeddedAssetIds(['model.'+workerModel,'model.'+carrierModel,'model.'+carrierDeathModel,...(carrierBirthModel?['model.'+carrierBirthModel]:[])]);
  if(!this.gpu.has(workerModel)){const url=assetUrl('model.'+workerModel);if(!url)throw Error('缺少原工人模型：'+workerModel);const height=workerModel==='scv'?1.35:workerModel==='probe'?.9:.7;this.gpu.set(workerModel,await this.createAnimatedBatch(await loadUnitMaterialGltf(loader,url,workerModel),this.scene,height));}
  await this.prepareWorkerDeath(workerModel,workerModel==='scv'?1.35:workerModel==='probe'?.9:.7);
  if(!this.podTemplates.has(race)){const url=assetUrl('model.'+carrierModel);if(!url)throw Error('缺少原出兵载体：'+carrierModel);const g=await restoreSc2Materials(await loader.loadAsync(url));await this.compilePresentation(g.scene,this.camera,this.scene);await this.preloadTextures(g.scene);this.podTemplates.set(race,g);}
  if(!this.podDeathTemplates.has(race)){const url=assetUrl('model.'+carrierDeathModel);if(!url)throw Error('载体死亡资源未就绪');const g=await restoreSc2Materials(await loader.loadAsync(url));if(!g.animations.some(c=>/^Death/.test(c.name)))throw Error('载体死亡动作缺失');await this.compilePresentation(g.scene,this.camera,this.scene);await this.preloadTextures(g.scene);this.podDeathTemplates.set(race,g);}
  if(carrierBirthModel&&!this.podBirthTemplates.has(race)){const url=assetUrl('model.'+carrierBirthModel);if(!url)throw Error('缺少原水晶塔出现模型：'+carrierBirthModel);const g=await restoreSc2Materials(await loader.loadAsync(url));if(!g.animations.some(c=>c.name==='Stand Build End'))throw Error('原水晶塔出现动作缺失：Stand Build End');await preparePylonBirthMaterials(g);await this.compilePresentation(g.scene,this.camera,this.scene);await this.preloadTextures(g.scene);this.podBirthTemplates.set(race,g);}
  PodView.prepare(this.podTemplates.get(race)!,race,this.podBirthTemplates.get(race),this.podDeathTemplates.get(race));
 }
 async prepareEquipmentFortAssets(race:Race=this.world.expedition.race){
  if(!this.world.starship.enabled||!selectEquipmentEffects(equippedItems(this.world.starship.account,race)).some(e=>e.key==='fortification'))return;
  const kind=('turret_'+race) as EquipmentFortKind,entries:[Fortification['kind'],string,boolean][]=[[kind,'model.fort.'+kind,false],[kind,'model.fort.'+kind+'.death',true],['cover','model.map.spaceplatformbarrier_02',false]];
  await prepareEmbeddedAssetIds(entries.map(e=>e[1]));const loader=new ManagedGLTFLoader();
  for(const [kind,id,death] of entries){if((death?this.fortDeathTemplates:this.fortTemplates).has(kind))continue;const url=assetUrl(id);if(!url)throw Error('舰装原版阵地资源缺失：'+id);const gltf=kind==='cover'?await loadSemanticGltf(id):await restoreSc2Materials(await loader.loadAsync(url)),clip=gltf.animations.find(c=>c.name===(death?'Death':kind==='turret_zerg'?'Stand Burrow':'Stand'));if(!clip)throw Error('舰装阵地动作缺失：'+id);
   if(kind!=='cover')await prepareFortMaterials(gltf);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=EQUIPMENT_FORTS[kind as EquipmentFortKind].width/Math.max(size.x,size.z),group=new THREE.Group(),model=clone(gltf.scene);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.scale.setScalar(scale);group.add(model);updateFortMaterials(group,clip.name,0);(death?this.fortDeathTemplates:this.fortTemplates).set(kind,group);this.fortClips.set(kind+':'+(death?'death':'stand'),clip);const attack=gltf.animations.find(c=>c.name==='Attack');if(!death&&kind!=='cover'){if(!attack)throw Error('舰装炮台攻击动作缺失：'+id);this.fortClips.set(kind+':attack',attack);}await this.compilePresentation(group,this.camera,this.scene);await this.preloadTextures(group);await this.prewarmBatches([],false,[group]);
  }
 }
 async prepareNewRunAssets(race:Race,hero:HeroId|null,progress:(done:number,total:number,label:string)=>void=()=>{},preset?:PresetSlot,difficulty:Difficulty=this.world.difficulty){
  await this.prepareRescueAssets(race);await this.prepareMissionAssets({race,difficulty,stage:1});
  const levels=this.world.permanentProfile.getPreset(race,preset??this.world.permanentProfile.activePresetFor(race))?.levels;
  const required=openingPreloadModels(race,levels);for(const model of equipmentOpeningModels(this.world,race,hero,preset)){if(!isAirHeroType(model.type))required.set(model.type,model.type);required.set(displayLoadModelKey(model.key,model.type),model.type);}
  if(hero){const data=HEROES[hero];if(!data||data.race!==race)throw Error('开局英雄与种族不符');required.set(displayLoadModelKey(data.model,data.baseFamily),data.baseFamily);}
  await prepareEmbeddedAssetIds(modelPreloadAssets([...required].filter(([key])=>!this.gpu.has(key)).map(([key,type])=>[displayAssetModelKey(key),type] as const)));
  let done=0;for(const [key,type] of required){const missing=!this.gpu.has(key);if(missing&&!await this.ensureUnitVariant(key,type))throw Error('开局模型未就绪：'+key);progress(++done,required.size,key);if(missing)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  if(this.world.starship.enabled)await this.prepareEquipmentFortAssets(race);
 }
 private currentModels(){
  const required=new Map<string,UnitType>();for(const type of this.requiredFamilies())required.set(type,type);
  for(const model of equipmentRuntimeModels(this.world,this.world.expedition.race)){if(!isAirHeroType(model.type))required.set(model.type,model.type);required.set(displayLoadModelKey(model.key,model.type),model.type);}
  for(const hero of this.world.heroes.values()){const data=HEROES[hero.id];required.set(displayLoadModelKey(data.model,data.baseFamily),data.baseFamily);}
  for(const unit of this.world.entities.values())if(unit.hp>0){required.set(displayModelKey(unit),unit.unitType);required.set(displayActiveModelKey(unit),unit.unitType);}
  if(this.world.eliteChoice){const elite=ELITES[this.world.eliteChoice];required.set(elite.model,elite.family);}
  for(const offer of this.world.rewards){if(offer.kind==='hero'&&Object.hasOwn(HEROES,offer.value)){const hero=HEROES[offer.value as HeroId];required.set(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}else if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)){const elite=ELITES[offer.value as EliteId];required.set(elite.model,elite.family);}}
  for(const entry of this.world.expedition.bossLootQueue){const effect=entry.reward.expeditionEffect;if(effect.kind==='elite')for(const elite of this.world.eliteVariants(effect.family))required.set(elite.model,elite.family);else if(effect.kind==='hero'){const hero=HEROES[effect.heroId as HeroId];required.set(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}}
  for(const offer of this.world.rewards)if(offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value))for(const elite of this.world.eliteVariants(ELITES[offer.value as EliteId].family))required.set(elite.model,elite.family);
  for(const contract of this.world.expedition.eliteContracts)if(!contract.purchased)for(const elite of this.world.eliteVariants(contract.family))required.set(elite.model,elite.family);
  if(this.world.expedition.pendingShopElite){const elite=ELITES[this.world.expedition.pendingShopElite.variantId];required.set(elite.model,elite.family);}
  return required;
 }
 async prepareCurrentAssets(progress:(done:number,total:number,label:string)=>void=()=>{}){
  if(this.world.starship.enabled)await this.prepareEquipmentFortAssets();await this.prepareRescueAssets(this.world.expedition.race);await this.prepareMissionAssets({race:this.world.expedition.race,difficulty:this.world.difficulty,stage:Math.min(18,this.world.stage+(this.world.phase==='reward'?1:0)),endless:!!this.world.endless,bodyModels:[...this.world.missions.bodies.values(),...corruptSiteBodies(this.world)].map(b=>b.model),hasHive:!!this.world.hive||this.world.expansionHives.size>0});
  const required=this.currentModels();
  await prepareEmbeddedAssetIds(modelPreloadAssets([...required].filter(([key])=>!this.gpu.has(key)).map(([key,type])=>[displayAssetModelKey(key),type] as const)));
  let done=0;for(const [key,type] of required){if(!this.gpu.has(key)&&!await this.ensureUnitVariant(key,type))throw Error('增援模型未就绪：'+key);progress(++done,required.size,key);}
 }
 async prepareSnapshotAssets(snapshot:RunSnapshot,progress:(done:number,total:number,label:string)=>void=()=>{}){
  await this.prepareRescueAssets(snapshot.state.expedition.race);await this.prepareMissionAssets({race:snapshot.config.race,difficulty:snapshot.config.difficulty,stage:Math.min(18,snapshot.state.stage+(snapshot.state.phase==='reward'?1:0)),endless:snapshot.state.battlefield.mode==='endless',bodyModels:[...[...(snapshot.state.missions?.bodies.values()??[])].map(b=>b.model),...(snapshot.state.encounters?.expanded.short?.corrupt?[snapshot.state.encounters.expanded.short.corrupt.site.model]:[])],hasHive:!!snapshot.state.hive||(snapshot.state.expansionHives?.size??0)>0});
  const required:Map<string,UnitType>=this.raceModels(snapshot.config.race);
  for(const family of snapshot.state.expedition.familySlots)required.set(family,family);
  for(const entry of snapshot.state.expedition.bossLootQueue){const effect=entry.reward.expeditionEffect;if(effect.kind==='elite')for(const elite of Object.values(ELITES).filter(e=>e.family===effect.family))required.set(elite.model,elite.family);else if(effect.kind==='hero'){const hero=HEROES[effect.heroId as HeroId];required.set(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}}
  for(const family of selectedProductionFamilies(snapshot.state.expedition))required.set(family,family);
  for(const job of snapshot.state.expedition.ledger)if(job.state!=='settled')required.set(job.family,job.family);
  const stage=snapshot.state.battlefield.mode==='endless'?18:Math.min(18,snapshot.state.stage+(snapshot.state.phase==='reward'?1:0));
  for(const [family,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share>0)required.set(family as UnitType,family as UnitType);
  for(const type of snapshot.state.battlefield.mode==='endless'?ENDLESS.bossTypes:BOSSES[stage]?[BOSSES[stage].type]:[])required.set(type,type);
  for(const unit of snapshot.state.entities.values())if(unit.hp>0){if(!isAirHeroType(unit.unitType))required.set(unit.unitType,unit.unitType);required.set(displayModelKey(unit),unit.unitType);required.set(displayActiveModelKey(unit),unit.unitType);}
  for(const pod of snapshot.state.pods)if(['falling','active','opening'].includes(pod.status)){required.set(pod.unitType,pod.unitType);for(const guard of pod.guardTypes)required.set(guard,guard);}
  for(const reward of snapshot.state.rewards){if(reward.kind==='hero'&&Object.hasOwn(HEROES,reward.value)){const hero=HEROES[reward.value as HeroId];required.set(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}else if(reward.kind==='elite'&&Object.hasOwn(ELITES,reward.value)){const elite=ELITES[reward.value as EliteId];required.set(elite.model,elite.family);}}
  const offerFamilies=snapshot.state.rewards.filter(offer=>offer.kind==='elite'&&Object.hasOwn(ELITES,offer.value)).map(offer=>ELITES[offer.value as EliteId].family);
  for(const contract of snapshot.state.expedition.eliteContracts)if(!contract.purchased)offerFamilies.push(contract.family);
  for(const family of offerFamilies)for(const elite of Object.values(ELITES).filter(e=>e.family===family))required.set(elite.model,elite.family);
  if(snapshot.state.expedition.pendingShopElite){const elite=ELITES[snapshot.state.expedition.pendingShopElite.variantId];required.set(elite.model,elite.family);}
  await prepareEmbeddedAssetIds(modelPreloadAssets([...required].filter(([key])=>!this.gpu.has(key)).map(([key,type])=>[displayAssetModelKey(key),type] as const)));
  let done=0;for(const [key,type] of required){if(!this.gpu.has(key)&&!await this.ensureUnitVariant(key,type))throw Error('必需单位模型未就绪：'+key);progress(++done,required.size,key);}
  await this.prepareEndlessAssets((n,total,label)=>progress(required.size+n,required.size+total,label));
 }
 private async prepareUnit(type:UnitType,gltf:GLTF){gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=heights[type]*TUNING.unitScale/Math.max(.001,size.y);
  const batch:UnitBatch={gltf,meshes:[],data:[],scale,center,minY:box.min.y,clips:mapAnimations(gltf.animations)};
  if(gltf.animations.length){this.gpu.set(type,await this.createAnimatedBatch(gltf,this.scene,heights[type],undefined,TUNING.unitScale,type));gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)this.loadedTextures++;});this.batches.set(type,batch);return;}
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
    };material.customProgramCacheKey=()=>type+'-local-motion-v1';const poseCompile=material.onBeforeCompile,poseKey=material.customProgramCacheKey;bindSourceDepth(material,{key:()=>poseKey.call(material),compile:(shader,renderer)=>poseCompile.call(material,shader,renderer)});return material;});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,UNIT_CAPACITY);mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.scene.add(mesh);batch.meshes.push(mesh);batch.data.push(anim);
  });this.batches.set(type,batch);
 }
 ground(p:Point){return this.world.terrain?.height(p)??0;}
 private matrix(x:number,y:number,z:number,sx=1,sy=1,sz=1,ry=0){_obj.position.set(x,y,z);_obj.rotation.set(0,ry,0);_obj.scale.set(sx,sy,sz);_obj.updateMatrix();return _obj.matrix;}
 private makeFortView(id:number,kind:Fortification['kind']):THREE.Group{const template=this.fortTemplates.get(kind),clip=this.fortClips.get(`${kind}:stand`);if(!template||!clip)throw Error('真实 SC 建筑及动作未准备：'+kind);const group=clone(template) as THREE.Group,mixer=new THREE.AnimationMixer(group);mixer.clipAction(clip).play();mixer.setTime(0);updateFortRibbons(group,clip.name,0);updateFortMaterials(group,clip.name,0);this.fortMixers.set(id,mixer);this.scene.add(group);return group;}
 private playFortDeath(id:number,kind:Fortification['kind'],position:THREE.Vector3){const template=this.fortDeathTemplates.get(kind),clip=this.fortClips.get(`${kind}:death`);if(!template||!clip)return;const group=clone(template) as THREE.Group,mixer=new THREE.AnimationMixer(group);group.position.copy(position);group.userData.fortKind=kind;mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();mixer.setTime(0);updateFortRibbons(group,clip.name,0);updateFortMaterials(group,clip.name,0);this.scene.add(group);this.fortDeathViews.set(id,{group,mixer,until:this.world.time+clip.duration});}
 private playHiveDeath(id:number,position:THREE.Vector3,width=6){
  const g=this.hiveDeathTemplate,clip=g?.animations.find(c=>/^Death/.test(c.name));if(!g||!clip||this.hiveDeaths.has(id))return;
  const root=new THREE.Group(),body=clone(g.scene),mixer=new THREE.AnimationMixer(body);const action=mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);body.updateMatrixWorld(true);
  const box=this.hiveDeathBounds??=new THREE.Box3().setFromObject(body),center=box.getCenter(new THREE.Vector3()),scale=width/Math.max(.01,box.max.x-box.min.x,box.max.z-box.min.z);body.scale.setScalar(scale);body.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.add(body);root.position.copy(position);this.scene.add(root);this.hiveDeaths.set(id,{root,mixer,at:this.world.time,duration:Math.min(6,clip.duration),sourceDuration:clip.duration});
 }
 private removeHiveDeath(id:number){const d=this.hiveDeaths.get(id);if(!d)return;releaseBuildingView(d.root,d.mixer);this.hiveDeaths.delete(id);}
 private outlineCache=new WeakMap<THREE.Object3D,THREE.Vector3[]>();private outlineStorage:THREE.Vector3[]=[];private outlineActive:THREE.Vector3[]=[];
 private transformOutline(points:THREE.Vector3[],matrix:THREE.Matrix4){this.outlineActive.length=points.length;for(let i=0;i<points.length;i++){const p=this.outlineStorage[i]??(this.outlineStorage[i]=new THREE.Vector3());this.outlineActive[i]=p.copy(points[i]).applyMatrix4(matrix);}return this.outlineActive;}
 private objectOutline(root:THREE.Object3D|null|undefined){if(!root)return;root.updateWorldMatrix(true,true);let points=this.outlineCache.get(root);if(!points){points=bodyOutline(root,root.matrixWorld.clone().invert());this.outlineCache.set(root,points);}return this.transformOutline(points,root.matrixWorld);}

 private cameraFrame():AutoFrame|undefined{
  if(this.cameraController.cameraMode==='fixed')return;
  const w=this.world,active=w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision;
  if(!active)return {active:false,bodies:[],occluded:[]};
  const mains=w.allies().filter(u=>!u.summonKind&&!u.temporary),near=(p:Point)=>Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z)<=24||mains.some(u=>Math.hypot(p.x-u.x,p.z-u.z)<=24);
  const bodies:AutoFrame['bodies']=[{x:w.anchor.x,y:this.ground(w.anchor),z:w.anchor.z,radius:.3,height:.3,primary:true}];
  for(const u of w.entities.values()){const primary=mains.includes(u);if(u.hp<=0||u.summonKind||u.temporary||!primary&&(!near(u)||!w.visibleTo(u,'terran')))continue;const model=this.gpu.get(this.modelKey(u)),scale=modelPresentationScale(u),transit=u.cliffTransit?cliffRenderPosition(u,w.time):null;bodies.push({x:transit?.x??u.x,y:u.flying?AIR_HEIGHT:this.ground(u)+(transit?.lift??0),z:transit?.z??u.z,radius:(model?.bodyRadius??u.unitRadius)*scale,height:(model?.bodyHeight??heights[u.unitType]*TUNING.unitScale)*scale,primary});}
  for(const p of w.pods)if(p.hp>0&&['falling','active','opening'].includes(p.status)&&near(p))bodies.push({x:p.x,y:this.ground(p),z:p.z,radius:1.5,height:this.podViews.get(p.id)?.bodyHeight??3.4,primary:false});
  for(const p of w.economicTargets.values())if(p.hp>0&&p.status==='active'&&near(p))bodies.push({x:p.x,y:this.ground(p),z:p.z,radius:p.unitRadius,height:this.gpu.get(p.kind)?.bodyHeight??1.65,primary:false});
  for(const p of [...(w.hive?[w.hive]:[]),...w.expansionHives.values(),...w.fortifications.values()])if(p.hp>0&&near(p)){const root=p===w.hive?this.hiveView:this.expansionViews.get(p.id)??this.fortViews.get(p.id),outline=this.objectOutline(root);bodies.push({x:p.x,y:this.ground(p),z:p.z,radius:p.unitRadius,height:outline?.length?Math.max(...outline.map(v=>v.y))-this.ground(p):4,primary:false});}
  const rect=this.canvas.getBoundingClientRect(),selector='#topbar,#minimap,.native-map-utilities button,.native-army-frame,.native-command-frame,#army-toggle,#native-selection,#joystick,#unit-inspector,.fixed-hud';
  const occluded=[...document.querySelectorAll<HTMLElement>(selector)].filter(el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}).map(el=>el.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1).map(r=>({left:r.left-rect.left,right:r.right-rect.left,top:r.top-rect.top,bottom:r.bottom-rect.top}));
  return {active,bodies,occluded,moving:w.order?.kind==='move'&&Math.hypot(w.order.point.x-w.anchor.x,w.order.point.z-w.anchor.z)>.5,combat:mains.some(u=>w.time-u.lastShotAt<2||w.time-(u.lastDamagedAt??-Infinity)<2)};
 }
 private bodyVisible(p:Point){return this.visible(p)||this.sceneShadows.enabled&&this.sceneShadows.view.body(p,this.ground(p));}
 private visible(p:Point){return this.cameraController.visible(p,this.ground(p));}
 render(dt:number,alpha:number){if(this.backgroundBusy||this.entryPreparation){this.stillPresentation=null;return;}const world=this.world;const sceneKey=world.specialStages.active?.id??null;if(sceneKey!==this.specialSceneKey){this.specialSceneKey=sceneKey;this.resetRun();}this.frames++;this.tickTime+=dt;if(this.tickTime>=.5){this.fps=this.frames/this.tickTime;this.frames=0;this.tickTime=0;}this.frameMs=dt*1000;this.frameTimes.push(this.frameMs);if(this.frameTimes.length>240)this.frameTimes.shift();
  const low=this.combatDetail==='low';resetUploadStats();const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.querySelector('#interface.ui-reduced-motion');
  this.lighting.bind(world.terrain);this.cameraController.update({x:world.anchor.x,y:this.ground(world.anchor),z:world.anchor.z},dt,!motion,this.cameraFrame());
  const selected=this.selectedHealthBodies();
  // Only reuse stopped battle presentation. A live frame without a fixed step can
  // still have a new interpolation alpha, camera pose or effect sample.
  const still=world.phase==='battle'&&(world.paused||world.requiresPlayerDecision)&&this.initialAssetsLoaded&&!this.assetsPending&&!this.renderer.getContext().isContextLost();
  const key=still?[world.runId,world.revision,world.visualEvents.at(-1)?.serial,world.visualEvents.length,world.time,world.tick,world.paused,world.requiresPlayerDecision,world.terrain,world.starship.account.revision,world.starship.loot.serial,alpha,
   this.contextEpoch,this.mapView,this.loadedModels,this.loadedTextures,this.gpu.size,this.fx.loaded,this.viewportWidth,this.viewportHeight,this.renderer.getPixelRatio(),motion,
   this.quality,this.animationMode,this.combatDetail,this.nonHeroEffects.quality,this.fx.heroQuality,this.sourceCombatEffects.player.decorationFraction,
   this.healthBars.mode,this.showGrid,this.showColliders,this.cameraShake,this.sceneShadows.enabled,this.contact.enabled,this.contact.samples,
   this.targetPreview?.x,this.targetPreview?.z,document.body.dataset.targetFamily,[...selected].join(','),...this.camera.matrixWorld.elements,...this.camera.projectionMatrix.elements]:null;
  if(key&&this.stillPresentation&&key.length===this.stillPresentation.length&&key.every((value,i)=>value===this.stillPresentation![i])){this.renderScene();return;}
  this.stillPresentation=null;
  this.sceneShadows.update(this.camera,world.terrain);this.mapView?.setLighting?.({shadow:this.sceneShadows.enabled,contact:this.contact.enabled});this.terrainUpdate();this.grid.visible=this.showGrid;
  this.protossHeroes.beginFrame(!low);
  this.barrierMaterials.begin(world.runId??'',world.time);
  for(const unit of world.entities.values())if(!unit.heroId&&unit.unitType==='immortal')this.barrierMaterials.observe(unit.id,unit.hp>0&&(unit.barrier??0)>0,(unit.barrierReady??0)-SOURCE_ABILITIES.immortalBarrier.cooldown,unit.lastDamagedAt);
  this.barrierMaterials.finish();
  const counts=new Map<UnitType,number>();let line=0,shadows=0;this.healthBars.begin(world.runId??'',world.time,world.visualEvents);
  for(const [key,b] of this.gpu){b.animationMode=this.animationMode;b.setLod(ordinaryLodKeys.has(key)&&((this.quality!=='native'&&this.quality!=='adaptive')||heights[key.split('.')[0] as UnitType]*this.viewportHeight/this.cameraController.verticalSpan<28));b.begin();}
  const poseTime=world.time-(world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision?(1-alpha)/60:0);
  for(const event of world.visualEvents){
   if(event.serial<=this.lastVisual)continue;this.lastVisual=event.serial;
   if(event.kind==='hit')this.hitTimes.set(event.entityId,event.time);
   if(event.kind==='death'&&event.missionDeath&&event.missionDeath!=='egg'&&!low)this.playMissionDeath(event);
   if(event.kind!=='death'||!event.unitType||event.modelKey==='fun-cocoon'||sourceHologramDeath(event))continue;
   const live=world.entities.get(event.entityId),identity=deathPresentation(event,live)!;
   this.corpses.set(event.entityId,{...identity,apparition:identity.apparition??equipmentApparition(world,event.entityId),revealed:event.revealed??(!!live&&world.visibleTo(live,'terran')),x:event.x,z:event.z,y:event.flying?AIR_HEIGHT:this.ground(event),facing:event.facing,at:event.time});
  }
  const putLine=(a:Point,ay:number,b:Point,by:number,color:number)=>{if(line>=990)return;const offset=line*6;this.linePositions.set([a.x,ay,a.z,b.x,by,b.z],offset);_color.set(color);this.lineColors.set([_color.r,_color.g,_color.b,_color.r,_color.g,_color.b],offset);line++;};

  // Auxiliary range outlines are absent from both maps; native attacks are rendered by their effect adapters.

  const weaponMount=(event:VisualEvent,side?:string)=>{
   const source=world.entities.get(event.entityId),key=event.unitType?displayActiveModelKey({...event,unitType:event.unitType,action:'idle',mode:event.siege?'siege':'tank',nativeMode:event.nativeMode??(event.unitType==='viking'?(event.flying?'viking':'viking_assault'):source?.nativeMode)}):undefined,model=key?this.gpu.get(key):null,skill=event.kind==='skill-launch'||event.kind==='skill-line',action=skill?'skill':attackAction(event.unitType,event.shotSequence);
   const pose=event.weaponPoseSeconds??(skill?0:Math.min(model?.actions[action]?.duration??0,(event.unitType?SC2_UNITS[event.unitType].damagePoint:0)*1.4));
   const mountSide=event.heroId==='hots_leviathan'&&!skill?String(2+((event.shotSequence??1)-1)%4).padStart(2,'0'):side;
   const weapon=model?.weaponAt(action,pose,mountSide),unit=world.entities.get(event.entityId),scale=event.nativeMode===undefined&&unit?modelPresentationScale(unit):event.unitType?modelPresentationScale({modelKey:event.modelKey,heroId:event.heroId,eliteId:event.eliteId,unitType:event.unitType,flying:event.flying,visualScale:event.visualScale,missionFleet:event.missionFleet}):1;return weaponWorldPoint(event,weapon??{x:0,y:.6,z:.6},scale,this.ground(event));
  };
  this.encounterVisuals??=new EncounterVisuals(this.scene,this.labelLayer);
  this.encounterVisuals.update(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),u=>(this.gpu.get(this.modelKey(u))?.bodyHeight??1)*modelPresentationScale(u),u=>this.bodyVisible(u)&&world.visibleTo(u,'terran'),!low);
  this.funVisuals??=new FunVisuals(this.scene,this.labelLayer,this.funProps);
  const funPoses=new Map<number,FunBodyPose>();
  const health=(b:Body,y:number,outline?:THREE.Vector3[])=>{if(this.visible(b)&&world.phase==='battle')this.healthBars.add(b,{x:b.x,y,z:b.z},this.camera,this.viewportHeight,selected.has(b.id),outline);};
  for(const u of world.entities.values()){const held=heldPose(world,u);if(held===null)continue;const batch=this.batches.get(u.unitType);if(!batch&&!this.gpu.has(displayModelKey(u))||!this.bodyVisible(u)||!world.visibleTo(u,'terran'))continue;const fleetPose=this.protossHeroes.childPresentation(u),dying=u.hp<=0,death=dying?Math.max(0,1-(world.time-(u.deadAt??world.time))/1.3):1,presentationScale=(held?.scale??1)*(fleetPose?.scale??modelPresentationScale(u))*(u.hp>0&&u.team==='player'&&world.expedition.race==='zerg'&&u.attributes.includes('Biological')&&world.expedition.support.unique.activeUntil>world.time?1.12:1),recoveryScale=u.unitType==='baneling'&&(u.recoveryUntil??0)>world.time?.84+.04*Math.sin(world.time*5):1;
   const index=counts.get(u.unitType)??0;if(index>=UNIT_CAPACITY)continue;counts.set(u.unitType,index+1);
   const transit=u.cliffTransit?cliffRenderPosition(u,world.time):null,x=held?.x??fleetPose?.point.x??transit?.x??u.prev.x+(u.x-u.prev.x)*alpha,z=held?.z??fleetPose?.point.z??transit?.z??u.prev.z+(u.z-u.prev.z)*alpha,y=held?this.ground({x,z})+held.lift:fleetPose?.point.y??(u.winged?this.ground({x,z})+(AIR_HEIGHT-this.ground({x,z}))*(u.wingHeight??1):u.flying?AIR_HEIGHT:this.ground({x,z})+(transit?.lift??0));
   if(!this.sceneShadows.enabled&&u.hp>0&&shadows<1400)this.shadows.setMatrixAt(shadows++,this.matrix(x,this.ground({x,z})+.012,z,u.unitRadius*1.9,1,u.unitRadius*1.7));
   if(this.gpu.has(displayModelKey(u))){
    const baseKey=displayModelKey(u);if(u.modelKey&&!this.gpu.has(baseKey)){void this.ensureUnitVariant(baseKey,u.unitType);continue;}
    if(dying){if(u.modelKey==='fun-cocoon'||sourceHologramDeath(u))continue;if(!this.corpses.has(u.id))this.corpses.set(u.id,{apparition:unitMaterialIdentity(u,world.time).apparition??equipmentApparition(world,u.id),revealed:world.visibleTo(u,'terran'),scale:presentationScale,type:displayDeathModelKey(u),teamColor:unitMaterialIdentity(u,world.time).teamColor,x,z,y,facing:u.facing,at:u.deadAt??world.time});continue;}
    const key=fleetPose&&world.entities.get(u.summonOwnerId??-1)?.heroId==='purifier_flagship'?'hero.purifier_flagship':fleetPose?.modelKey??this.modelKey(u);if(!this.gpu.has(key)){void this.ensureUnitVariant(key,u.unitType);continue;}
    const model=this.gpu.get(key)??this.gpu.get(baseKey)!;let state=this.animationStates.get(u.id);const signature=key+':'+(u.zergEliteCombat?.burrowPhase??0)+':'+u.nativeMode+':'+u.desiredNativeMode+':'+u.nativeModeUntil+':'+u.action+(u.action==='attack'?':'+u.lastShotAt:'');
    if(!state||state.action!==signature){state={...state,action:signature,since:world.time,modeDuration:u.nativeModeUntil?u.nativeModeUntil-world.time:u.modeTimer,playback:state?.playback??{},poseClock:state?.poseClock??{}};this.animationStates.set(u.id,state);}
    let seconds=Math.max(0,poseTime-state.since);const nativeAction=revisedZergElite(u)&&u.unitType==='roach'&&u.zergEliteCombat?.burrowPhase?(u.zergEliteCombat.burrowPhase===1?'burrow':u.zergEliteCombat.burrowPhase===2?'burrowIdle':'unburrow'):!u.heroId&&u.unitType==='lurker'?(u.nativeModeUntil?(u.desiredNativeMode==='lurker_burrowed'?'burrow':'unburrow'):u.nativeMode==='lurker_burrowed'?(u.action==='attack'?'burrowAttack':'burrowIdle'):u.action):!u.heroId&&u.unitType==='thor'?(u.nativeModeUntil?(u.desiredNativeMode==='thor_high_impact'?'highImpactMorph':'highImpactUnmorph'):u.nativeMode==='thor_high_impact'?(u.action==='move'?'highImpactMove':u.action==='attack'?(u.activeWeapon==='LanceMissileLaunchers'?'highImpactAttack':'highImpactGroundAttack'):'highImpactIdle'):u.action):u.action;const p=model.pose(nativeAction);let once=['attack','skill','spawn','sieging','unsieging'].includes(u.action)||!!u.nativeModeUntil||nativeAction==='burrowIdle';
    if(nativeAction==='burrowIdle'&&p)seconds=p.duration;
    else if(revisedZergElite(u)&&u.zergEliteCombat?.burrowPhase&&p)seconds=Math.min(1,(poseTime-u.zergEliteCombat.burrowAt)/.6)*p.duration;
    else if(u.nativeModeUntil&&p)seconds=(1-Math.max(0,u.nativeModeUntil-world.time)/Math.max(1/60,state.modeDuration))*p.duration;
    else if(u.action==='skill')seconds=Math.max(0,poseTime-(u.lastSkillAt??world.time));
    else if(u.action==='move')seconds=u.cliffTransit?poseTime-u.cliffTransit.startedAt:Math.max(0,u.distanceWalked-(world.time-poseTime)*Math.hypot(u.velocity.x,u.velocity.z))/SC2_UNITS[u.unitType].movementSpeed;
    else if((u.action==='sieging'||u.action==='unsieging')&&p)seconds=(1-u.modeTimer/Math.max(1/60,state.modeDuration))*p.duration;
    else if(u.action==='attack')seconds=Math.max(0,world.time-u.lastShotAt)*1.4;
    const shot=revisedZergElite(u)&&u.zergEliteCombat?.burrowPhase?null:selectAttackPresentation(u,Math.max(poseTime,u.lastShotAt),model.actions,state.playback);
    let displayAction:keyof ReturnType<typeof mapAnimations>=nativeAction,attackSeconds=-1,shotAction=attackAction(u.unitType,u.shotSequence) as keyof ReturnType<typeof mapAnimations>;
    if(shot){shotAction=shot.action;if(shot.overlay){attackSeconds=shot.seconds;displayAction=u.action==='move'?'move':model.actions.ready?'ready':'idle';}else{displayAction=shot.action;seconds=shot.seconds;once=shot.once;}}
    else if((u.recoveryUntil??0)>world.time){displayAction='idle';seconds=0;once=false;}
    else if(u.action==='attack'&&!u.windup&&nativeAction===u.action){displayAction=model.actions.ready?'ready':'idle';once=false;}
    if(u.winged&&(u.wingHeight??1)>0&&displayAction==='move'){displayAction='idle';seconds=poseTime;once=false;}
    if(key.startsWith('fun-')&&shot?.overlay){displayAction=shot.action;seconds=shot.seconds;once=shot.once;attackSeconds=-1;}
    const specialPose=nydusPose(world,u);if(specialPose){displayAction=specialPose.action;seconds=specialPose.seconds;once=specialPose.once;attackSeconds=-1;}
    if(u.modelKey==='fun-cocoon'){displayAction='idle';seconds=(world.encounters.expanded.queen?.clock??0)/60;once=false;attackSeconds=-1;}
    const eventKey=signature+':'+displayAction+':'+u.shotSequence+':'+u.lastSkillAt+':'+(this.hitTimes.get(u.id)??'');
    const sampledAt=samplePoseClock(state.poseClock,this.animationMode,poseTime,eventKey);
    if(!state.sampled||sampledAt!==state.sampled.at||state.sampled.action!==displayAction)state.sampled={at:sampledAt,action:displayAction,seconds,once,attackSeconds,attackKey:shotAction};
    const sampled=state.sampled;
    model.add(x,y,z,fleetPose?.facing??u.facing,sampled.action,sampled.seconds,sampled.once,low?0:Math.max(0,1-(world.time-(this.hitTimes.get(u.id)??-100))/.2),presentationScale*recoveryScale,this.animationMode==='complete',sampled.attackSeconds,u.unitType==='tank'&&u.modeTimer<=0?u.attackFacing-u.facing:0,modelPresentationAccent(u)||(u.enemyTier==='boss'||u.enemyTier==='lord'?2:u.enemyTier==='elite'?1:0),sampled.attackKey,true,model.materialSurfaces.length||world.starship.projections.has(u.id)?{entityId:u.id,runId:world.runId??'',time:world.time,barrier:low?undefined:this.barrierMaterials.get(u.id),apparition:equipmentApparition(world,u.id),...unitMaterialIdentity(u,world.time)}:undefined);

   }else{
    _obj.position.set(x,y,z);_obj.rotation.set(dying?Math.PI/2*(1-death):u.unitType==='baneling'?u.distanceWalked*2:0,u.facing,0);_obj.scale.setScalar(Math.max(.01,death)*presentationScale*recoveryScale);_obj.updateMatrix();
    let mode=u.mode==='siege'?1:0;if(u.action==='sieging')mode=1-u.modeTimer/2.887;if(u.action==='unsieging')mode=u.modeTimer/2.53;
    const motion=[u.distanceWalked+u.id*.29,dying?0:Math.min(1,Math.hypot(u.velocity.x,u.velocity.z)/2),u.action==='attack'?Math.min(1,u.attackLock*5):0,Math.max(0,Math.min(1,mode))];
    batch!.meshes.forEach((m,i)=>{m.setMatrixAt(index,_obj.matrix);batch!.data[i].setXYZW(index,...motion as [number,number,number,number]);});
   }

   if(!dying&&(u.winged||u.fun||world.encounters.expanded.infections.size))funPoses.set(u.id,{x,y,z,scale:presentationScale*recoveryScale,facing:fleetPose?.facing??u.facing});
   if(!dying&&!held){const key=fleetPose&&world.entities.get(u.summonOwnerId??-1)?.heroId==='purifier_flagship'?'hero.purifier_flagship':fleetPose?.modelKey??this.modelKey(u),model=this.gpu.get(key),scale=presentationScale*recoveryScale;health({...u,x,z},y+(model?.bodyHeight??heights[u.unitType]*TUNING.unitScale)*scale,model?this.transformOutline(model.bodyOutline,this.matrix(x,y,z,scale,scale,scale,u.facing)):undefined);}

  }
  this.funVisuals.update(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),u=>{const b=this.gpu.get(this.modelKey(u)),s=funPoses.get(u.id)?.scale??modelPresentationScale(u);return {height:(b?.bodyHeight??1)*s,radius:(b?.bodyRadius??u.unitRadius)*s};},u=>this.bodyVisible(u)&&world.visibleTo(u,'terran'),u=>funPoses.get(u.id));
  for(const [type,b] of this.batches){b.meshes.forEach((m,i)=>{const count=counts.get(type)??0;commitInstances(m,count);uploadActive(b.data[i],count);});}
  for(const [id,c] of this.corpses){const model=this.gpu.get(c.type+'.death')??this.gpu.get(c.type);const age=world.time-c.at,life=c.type.startsWith('fun-')?Math.max(1.5,model?.pose('dead')?.duration??1.5):Math.min(5,Math.max(1.5,model?.pose('dead')?.duration??1.5));if(age>life+.4){this.corpses.delete(id);continue;}if(model&&c.revealed&&(!world.entities.has(id)||world.visibleTo(world.entities.get(id)!,'terran'))&&this.bodyVisible(c)){const hologram=c.type==='elite.science_vessel.1'&&!model.actions.dead;model.add(c.x,c.y,c.z,c.facing,hologram?'idle':'dead',hologram?0:deathPoseTime(age,model.pose('dead')?.duration??life,life),true,0,(age>life?Math.max(.01,1-(age-life)/.4):1)*c.scale,true,-1,0,hologram?-1-Math.min(1,age/life):0,'attack',false,model.materialSurfaces.length||c.apparition?{entityId:id,runId:world.runId??'',time:world.time,deathAt:c.at,teamColor:c.teamColor,apparition:c.apparition}:undefined);}}
  for(const [id] of this.animationStates)if(!world.entities.has(id)){this.animationStates.delete(id);this.hitTimes.delete(id);}
  for(const [id,at] of this.hitTimes)if(world.time-at>.25)this.hitTimes.delete(id);
  const taskProps=new Set<number>(),taskViews=new Set<number>();
  for(const b of [...world.missions.bodies.values(),...corruptSiteBodies(world)]){
   if((b.resolved&&b.role!=='tower')||b.hp<=0)continue;const ground=this.ground(b),key=b.model==='hive'?'hatchery':b.model,model=this.gpu.get(key),template=this.missionTemplates.get(key);
   if(template){taskViews.add(b.id);let v=this.missionViews.get(b.id);if(!v){const root=clone(template.root),mixer=new THREE.AnimationMixer(root.children[0]);mixer.clipAction(template.clip).play();v={root,mixer,height:template.height};this.missionViews.set(b.id,v);this.scene.add(root);}v.root.position.set(b.x,ground,b.z);v.root.rotation.y=b.facing;v.root.visible=this.bodyVisible(b);v.mixer.setTime(world.time);updateFortMaterials(v.root,template.clip.name,v.mixer.existingAction(template.clip)?.time??0);if(v.root.visible&&b.role!=='base'&&b.role!=='tower')health(b,ground+v.height,this.objectOutline(v.root));}
   if(!this.bodyVisible(b))continue;
   if(model){model.add(b.x,ground,b.z,b.facing,b.role==='worker'&&!b.invulnerable?'move':'idle',world.time*1.4,false,0,1,true,-1,0,0,'attack',false,b.role==='egg'?nightmareEggMaterial(b.id,world.runId,world.time):undefined);if(b.role!=='base'&&b.role!=='tower')health(b,ground+model.bodyHeight,this.transformOutline(model.bodyOutline,this.matrix(b.x,ground,b.z,1,1,1,b.facing)));}
   if(b.role==='intel'||b.role==='signal'||b.role==='tower'&&b.resolved){taskProps.add(b.id);let prop=this.missionProps.get(b.id);if(!prop){prop=new THREE.Group();if(b.role==='tower'){const light=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,4,8),new THREE.MeshBasicMaterial({color:0x59e5ff}));light.position.y=2;prop.add(light);}else if(b.role==='intel'){const book=this.funProps.create('intel-book');book.rotation.y=.25;book.scale.setScalar(.45);prop.add(book);}else prop.add(this.rescueBeacon());this.scene.add(prop);this.missionProps.set(b.id,prop);}prop.position.set(b.x,ground,b.z);if(b.role==='signal')prop.children[0]?.quaternion.copy(this.camera.quaternion);}
  }
  for(const u of world.entities.values())if(u.hp>0&&u.mission?.holdout&&u.eliteId){taskProps.add(u.id);let prop=this.missionProps.get(u.id);if(!prop){prop=new THREE.Group();prop.add(this.rescueBeacon());this.scene.add(prop);this.missionProps.set(u.id,prop);}const model=this.gpu.get(this.modelKey(u));prop.position.set(u.x,(u.flying?AIR_HEIGHT:this.ground(u))+(model?.bodyHeight??2)*modelPresentationScale(u),u.z);prop.visible=this.bodyVisible(u);prop.children[0]?.quaternion.copy(this.camera.quaternion);}
  for(const [id,v] of this.missionViews)if(!taskViews.has(id)){releaseBuildingView(v.root,v.mixer);this.missionViews.delete(id);}
  for(const [id,death]of this.missionDeaths){const age=world.time-death.at;if(age>death.clip.duration){releaseBuildingView(death.root,death.mixer);this.missionDeaths.delete(id);continue;}death.root.visible=!low&&death.root.userData.deathRevealed&&this.bodyVisible({x:death.root.position.x,z:death.root.position.z});death.mixer.setTime(Math.max(0,age));updateFortMaterials(death.root,death.clip.name,Math.max(0,age));}
  for(const [id,prop] of this.missionProps)if(!taskProps.has(id)){releaseFunVisual(prop);this.missionProps.delete(id);}
  for(const event of world.visualEvents)if(event.kind==='death'&&event.missionDeath==='egg'){
   const model=this.gpu.get('egg'),age=world.time-event.time,life=model?.pose('dead')?.duration??1.5;if(model&&age>=0&&age<life&&this.bodyVisible(event))model.add(event.x,this.ground(event),event.z,event.facing,'dead',age,true,0,1,true,-1,0,0,'attack',false,nightmareEggMaterial(event.entityId,world.runId,world.time));
  }
  for(const event of world.visualEvents)if(event.kind==='scv-rescue'&&event.rescueModel&&world.time-event.time<3.5){const age=world.time-event.time;this.gpu.get(event.rescueModel)?.add(event.x+age*.4,this.ground(event),event.z,0,'move',age*1.4,false,0,Math.min(1,3.5-age));}
  for(const e of world.economicTargets.values()){if(!this.bodyVisible(e))continue;const age=world.time-(e.resolvedAt??world.time),model=this.gpu.get(e.kind);if(e.status==='active'){model?.add(e.x,this.ground(e),e.z,e.facing,e.kind==='drone'?'move':'idle',world.time*1.4,false,0,1,true,-1,0,0,'attack',false,e.kind==='egg'?rescueEggMaterial(e.id,world.runId,world.time):undefined);health(e,this.ground(e)+(model?.bodyHeight??1.65),model?this.transformOutline(model.bodyOutline,this.matrix(e.x,this.ground(e),e.z,1,1,1,e.facing)):undefined);}else if(e.kind==='egg'&&e.status==='rescued'&&age<3.8){this.gpu.get(RESCUE_PRESENTATION[world.expedition.race].workerModel)?.add(e.x,this.ground(e),e.z,e.facing,'idle',age*1.4,false,0,age>3.4?Math.max(.01,(3.8-age)/.4):1);}else {const death=this.gpu.get(e.kind+'.death')??model,life=Math.min(5,death?.pose('dead')?.duration??1.5);if(age<life+.3)death?.add(e.x,this.ground(e),e.z,e.facing,'dead',deathPoseTime(age,death?.pose('dead')?.duration??life,life),true,0,age>life?Math.max(.01,1-(age-life)/.3):1,true,-1,0,0,'attack',false,e.kind==='egg'?rescueEggMaterial(e.id,world.runId,world.time):undefined);}}
  if(!low&&world.expedition.race==='zerg')for(const impact of world.expedition.support.impacts)if(impact.kind==='strategic'&&this.visible(impact.point))this.gpu.get('egg')?.add(impact.point.x,this.ground(impact.point)+Math.max(0,impact.at-world.time)*6,impact.point.z,world.time,'idle',world.time,false,0,2);
  if(world.expedition.race!=='protoss')for(const mine of world.expedition.support.mines){if(!this.visible(mine.point))continue;this.gpu.get(world.expedition.race==='terran'?'support.mine':'egg')?.add(mine.point.x,this.ground(mine.point)+(world.expedition.race==='terran'?(mine.phase==='buried'?-.22:mine.phase==='emerging'?-.22*Math.max(0,Math.min(1,(mine.emergeAt-world.time)/.25)):0):0),mine.point.z,mine.facing,'idle',world.time,false,0,world.expedition.race==='zerg'?.4:1);}
  for(const mine of world.eliteSupport.mines){if(!this.visible(mine.point))continue;this.gpu.get('support.mine')?.add(mine.point.x,this.ground(mine.point)+(mine.phase==='buried'?-.3:mine.phase==='emerging'?-.3*Math.max(0,Math.min(1,(mine.emergeAt-world.time)/.25)):0),mine.point.z,mine.facing,mine.phase==='chasing'?'move':'idle',world.time,false,0,1.6);}
  for(const b of this.gpu.values())b.end();
  for(const p of world.pods){
   // Completed pods keep their simulation record, but expired skeletal views leave the scene.
   if((p.status==='rescued'||p.status==='destroyed')&&world.time-(p.resolvedAt??world.time)>=7){this.podViews.get(p.id)?.dispose();this.podViews.delete(p.id);this.podLabels.get(p.id)?.remove();this.podLabels.delete(p.id);continue;}
   this.podLabel(p);let v=this.podViews.get(p.id);const template=this.podTemplates.get(world.expedition.race);if(!v&&template){v=new PodView(template,this.scene,world.expedition.race,this.podBirthTemplates.get(world.expedition.race),this.podDeathTemplates.get(world.expedition.race));this.podViews.set(p.id,v);}v?.update(p,world.time,this.bodyVisible(p),this.ground(p),!low);if(v&&['falling','active','opening'].includes(p.status)){v.root.updateWorldMatrix(true,true);health(p,this.ground(p)+v.bodyHeight*v.root.scale.y,this.transformOutline(v.bodyOutline,v.root.matrixWorld));}
  }
  if(world.hive){if(!this.hiveView&&this.hiveTemplate){this.hiveView=clone(this.hiveTemplate);this.scene.add(this.hiveView);}if(this.hiveView){this.hiveView.position.set(world.hive.x,this.ground(world.hive),world.hive.z);this.hiveView.visible=world.hive.hp>0;if(!low&&this.hiveWasAlive&&world.hive.hp<=0)this.playHiveDeath(world.hive.id,this.hiveView.position);}if(world.hive.hp>0)health(world.hive,this.ground(world.hive)+4,this.objectOutline(this.hiveView));this.hiveWasAlive=world.hive.hp>0;}
  for(const [id,v] of this.expansionViews)if(!world.expansionHives.has(id)){if(!low)this.playHiveDeath(id,v.position,4.8);releaseBuildingView(v);this.expansionViews.delete(id);}
  for(const hive of world.expansionHives.values()){let v=this.expansionViews.get(hive.id);if(!v&&this.hiveTemplate){v=clone(this.hiveTemplate);v.scale.multiplyScalar(.8);this.scene.add(v);this.expansionViews.set(hive.id,v);}if(v){v.position.set(hive.x,this.ground(hive),hive.z);v.visible=this.bodyVisible(hive);}health(hive,this.ground(hive)+3.2,this.objectOutline(v));}
  for(const [id,death] of this.hiveDeaths){const age=world.time-death.at;if(age>death.duration)this.removeHiveDeath(id);else {death.root.visible=!low;if(!low)death.mixer.setTime(deathPoseTime(age,death.sourceDuration,death.duration));}}
  const fortDt=Math.max(0,Math.min(.1,world.time-this.fortVisualTime));this.fortVisualTime=world.time;
  for(const [id,v] of this.fortViews)if(!world.fortifications.has(id)&&world.expedition.support.unique.landing?.id!==id){const kind=v.userData.fortKind as Fortification['kind']|undefined;if(!low&&kind&&!(v.userData.equipmentFort&&!world.starship.forts.has(id))&&!(v.userData.supportUntil&&world.time>=v.userData.supportUntil))this.playFortDeath(id,kind,v.position);releaseBuildingView(v,this.fortMixers.get(id));this.fortMixers.delete(id);this.fortViews.delete(id);}
  const landing=world.expedition.support.unique.landing;
  if(landing){let v=this.fortViews.get(landing.id);if(!v){v=this.makeFortView(landing.id,'bunker');this.fortViews.set(landing.id,v);}v.position.set(landing.point.x,this.ground(landing.point)+Math.max(0,landing.at-world.time)*8,landing.point.z);v.visible=this.bodyVisible(landing.point);}
  for(const fort of world.fortifications.values()){let v=this.fortViews.get(fort.id);if(!v){v=this.makeFortView(fort.id,fort.kind);v.userData.fortKind=fort.kind;v.userData.supportUntil=fort.supportUntil;this.fortViews.set(fort.id,v);}v.userData.fortKind=fort.kind;v.userData.supportUntil=fort.supportUntil;v.position.set(fort.x,this.ground(fort),fort.z);v.visible=this.bodyVisible(fort);const gear=world.starship.forts.get(fort.id);v.userData.equipmentFort=!!gear;if(gear){v.rotation.y=gear.facing;const mixer=this.fortMixers.get(fort.id),clip=this.fortClips.get(fort.kind+':attack');if(clip&&mixer&&v.userData.lastEquipmentShot!==gear.lastShot&&Number.isFinite(gear.lastShot)){v.userData.lastEquipmentShot=gear.lastShot;mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();}}if(v.visible){health(fort,this.ground(fort)+2.4,this.objectOutline(v));}}
  for(const [id,mixer] of this.fortMixers){mixer.update(fortDt);const v=this.fortViews.get(id);if(v){const kind=v.userData.fortKind,attack=this.fortClips.get(kind+':attack'),stand=this.fortClips.get(kind+':stand'),action=attack?mixer.existingAction(attack):null,pose=action?.isRunning()?action:stand?mixer.existingAction(stand):null;if(pose){updateFortMaterials(v,pose.getClip().name,pose.time);if(kind==='turret_zerg')updateFortRibbons(v,pose.getClip().name,pose.time);}}}
  for(const [id,death] of this.fortDeathViews){death.group.visible=!low;if(!low){death.mixer.update(fortDt);updateFortMaterials(death.group,'Death',death.mixer.time);if(death.group.userData.fortKind==='turret_zerg')updateFortRibbons(death.group,'Death',death.mixer.time);}if(world.time>=death.until){releaseBuildingView(death.group,death.mixer);this.fortDeathViews.delete(id);}}




  if(this.targetPreview&&document.body.dataset.targetFamily==='tactical'){const p=this.targetPreview,d=Math.hypot(p.x-world.anchor.x,p.z-world.anchor.z);if(d>.01){const dx=(p.x-world.anchor.x)/d,dz=(p.z-world.anchor.z)/d;for(const side of [-1,1]){const from={x:world.anchor.x+dz*side,z:world.anchor.z-dx*side},to={x:from.x+dx*14,z:from.z+dz*14};putLine(from,this.ground(from)+.12,to,this.ground(to)+.12,0x90ddff);}}}
  if(this.targetPreview){const p=this.targetPreview,r=.38;putLine({x:p.x-r,z:p.z-r},this.ground(p)+.1,{x:p.x+r,z:p.z+r},this.ground(p)+.1,0x90ddff);putLine({x:p.x-r,z:p.z+r},this.ground(p)+.1,{x:p.x+r,z:p.z-r},this.ground(p)+.1,0x90ddff);putLine(world.anchor,this.ground(world.anchor)+.1,p,this.ground(p)+.1,0x90ddff);}
  for(const [id,el] of this.enemyLabels)if((world.entities.get(id)?.hp??0)<=0){el.remove();this.enemyLabels.delete(id);}
  for(const u of world.entities.values())if(u.enemyTier&&u.hp>0){let el=this.enemyLabels.get(u.id);if(!el){el=document.createElement('div');el.className='enemy-special-label '+u.enemyTier;this.enemyLabels.set(u.id,el);this.labelLayer.append(el);}el.hidden=!this.visible(u)||world.phase!=='battle'||!world.visibleTo(u,'terran');if(!el.hidden){const effects=[statusReadout(world,u).short,world.auraArmor.has(u.id)?'甲壳护卫':'',world.auraDamage.has(u.id)?'狂热':'',world.hiveFrenzy?'亢奋':''].filter(Boolean).join(' · '),label=(u.enemyTier==='lord'?'♛ ':'')+(u.enemyName??'')+(effects?' · '+effects:'');if(el.textContent!==label)el.textContent=label;_vec.set(u.x,this.ground(u)+heights[u.unitType]*(u.visualScale??1)+.6,u.z).project(this.camera);el.style.transform=`translate(${(_vec.x*.5+.5)*this.viewportWidth}px,${(.5-_vec.y*.5)*this.viewportHeight}px) translate(-50%,-100%)`;}}
  this.friendlyLabels.update(world,u=>{const key=this.modelKey(u),model=this.gpu.get(key);const transit=u.cliffTransit?cliffRenderPosition(u,world.time):null,x=transit?.x??u.prev.x+(u.x-u.prev.x)*alpha,z=transit?.z??u.prev.z+(u.z-u.prev.z)*alpha,y=(u.flying?AIR_HEIGHT:this.ground({x,z})+(transit?.lift??0))+(model?.bodyHeight??heights[u.unitType]*TUNING.unitScale)*modelPresentationScale(u)+.25;_vec.set(x,y,z).project(this.camera);return {x:(_vec.x*.5+.5)*this.viewportWidth,y:(.5-_vec.y*.5)*this.viewportHeight,visible:!!model&&_vec.x>-1&&_vec.x<1&&_vec.y>-1&&_vec.y<1&&_vec.z>-1&&_vec.z<1};},this.viewportWidth);
  const order=world.order,orderAge=order?world.time-order.issuedAt:Infinity;this.destinationMarker.visible=world.phase==='battle'&&!!order&&orderAge>=0&&orderAge<.85;
  if(order){this.destinationMarker.position.set(order.point.x,this.ground(order.point)+.15,order.point.z);this.destinationMarker.rotation.y=Math.atan2(order.point.x-world.anchor.x,order.point.z-world.anchor.z);(this.destinationMarker.material as THREE.MeshBasicMaterial).opacity=.85*Math.max(0,1-orderAge/.85);}
  commitInstances(this.shadows,shadows);
  this.healthBars.end();
  const lootIds=new Set(world.rewardDrops.map(p=>p.id));for(const [id,el] of this.lootLabels)if(!lootIds.has(id)){el.remove();this.lootLabels.delete(id);}
  for(const drop of world.rewardDrops){let el=this.lootLabels.get(drop.id);if(!el){el=document.createElement('div');el.className='loot-world-label';el.style.setProperty('--rarity',RARITIES[drop.reward.rarity].color);el.dataset.rarity=drop.reward.rarity;el.innerHTML=`${icon(drop.reward.icon)}<span>${RARITIES[drop.reward.rarity].name} · ${drop.reward.name}</span>`;this.labelLayer.append(el);this.lootLabels.set(drop.id,el);}el.hidden=!this.visible(drop)||world.phase!=='battle'||world.paused;if(!el.hidden){const p=this.screen(drop);el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;}}
  this.pickups.render(world.pickups,p=>this.ground(p),p=>this.visible(p),[...(world.specialStages.active?.resources.values()??[])].filter(r=>r.hp>0));
  for(const r of world.specialStages.active?.resources.values()??[])if(r.hp>0&&this.visible(r))health(r,this.ground(r)+1.5);
  this.specialVisuals??=new SpecialVisuals(this.scene,this.labelLayer,this.funProps);this.specialVisuals.update(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p));
  this.equipmentDrops.render(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),p=>this.visible(p),!low);
  this.lines.visible=line>0;this.lines.geometry.setDrawRange(0,line*2);uploadActive(this.lines.geometry.attributes.position as THREE.BufferAttribute,line*2);uploadActive(this.lines.geometry.attributes.color as THREE.BufferAttribute,line*2);
  if(!low){this.sourceCombatEffects.render(world,weaponMount,(event,_model,age,liveBody=false)=>{
   if(!event.unitType)return undefined;const liveUnit=world.entities.get(event.entityId);if(liveBody&&(!liveUnit||!this.bodyVisible(liveUnit)||!world.visibleTo(liveUnit,'terran')))return undefined;
   const sampled=liveBody?this.animationStates.get(event.entityId)?.sampled:undefined,batch=this.gpu.get(event.unitType),action=sampled?.action??attackAction(event.unitType,event.shotSequence),clip=batch?.actions[action];if(!batch||!clip)return undefined;
   const seconds=sampled?(sampled.once?Math.min(sampled.seconds,clip.duration):sampled.seconds%Math.max(.001,clip.duration)):(SC2_UNITS[event.unitType].damagePoint+age)*1.4;if(seconds>clip.duration)return undefined;
   const live=world.entities.get(event.entityId),scale=modelPresentationScale({...event,unitType:event.unitType}),at=live?.hp?live:event,transform=new THREE.Matrix4().compose(new THREE.Vector3(at.x,event.flying?AIR_HEIGHT:this.ground(at),at.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),event.facing),new THREE.Vector3(scale,scale,scale)).multiply(batch.normalization).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2));
   return {matrix:transform.toArray(),clip:clip.name,seconds};
  },event=>{
   if(!event.unitType)return undefined;
   const key=displayActiveModelKey({...event,unitType:event.unitType,action:'idle',mode:event.siege?'siege':'tank'}),model=this.gpu.get(key);if(!model)return undefined;
   const scale=modelPresentationScale({...event,unitType:event.unitType}),height=model.bodyHeight*scale;
   return {center:{x:event.x,y:(event.flying?AIR_HEIGHT:this.ground(event))+height/2,z:event.z},top:{x:event.x,y:(event.flying?AIR_HEIGHT:this.ground(event))+height,z:event.z},radius:Math.max(model.bodyRadius*scale,height/2)};
  },event=>{
   if(event.kind==='boost-start'||event.kind==='boost-end'){const u=event.source;if(!u.unitType)return undefined;const model=this.gpu.get(displayActiveModelKey({...u,unitType:u.unitType,mode:u.mode??'tank',action:'idle'}));return model?{x:u.x,y:(u.flying?AIR_HEIGHT:this.ground(u))+model.bodyHeight*modelPresentationScale({...u,unitType:u.unitType}),z:u.z}:undefined;}
   const root=this.fortViews.get(event.source.id)??this.fortTemplates.get(event.detail as Fortification['kind']);if(!root)return undefined;
   const attachment=root.getObjectByName('Ref_Weapon');if(!attachment)return undefined;
   root.updateWorldMatrix(true,true);const local=attachment.getWorldPosition(new THREE.Vector3());root.worldToLocal(local);
   const facing=world.starship.forts.get(event.source.id)?.facing??(event.target?Math.atan2(event.target.x-event.source.x,event.target.z-event.source.z):0),c=Math.cos(facing),s=Math.sin(facing);
   return {x:event.source.x+local.x*c+local.z*s,y:this.ground(event.source)+local.y,z:event.source.z-local.x*s+local.z*c};
  },u=>{const batch=this.gpu.get(this.modelKey(u));if(!batch)return;const s=modelPresentationScale(u);return this.matrix(u.x,this.ground(u),u.z,s,s,s,u.facing).clone().multiply(batch.normalization).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2)).toArray();},u=>{
   const model=this.gpu.get(this.modelKey(u));if(!model)return;const action=u.action==='attack'?attackAction(u.unitType,u.shotSequence):u.action,clip=model.actions[action],age=Math.max(0,(world.time-(this.animationStates.get(u.id)?.since??world.time))*1.4),seconds=clip?(u.action==='idle'||u.action==='move'?age%clip.duration:Math.min(age,clip.duration)):0,p=model.overheadAt(action,seconds);if(!p)return;
   const scale=modelPresentationScale(u),c=Math.cos(u.facing),s=Math.sin(u.facing);return {x:u.x+(p.x*c+p.z*s)*scale,y:(u.flying?AIR_HEIGHT:this.ground(u))+p.y*scale,z:u.z+(-p.x*s+p.z*c)*scale};
  });
  this.nonHeroEffects.render(world,p=>this.visible(p),weaponMount);
  this.protossEliteEffects.quality=this.fx.heroQuality;this.protossEliteEffects.render(world,p=>this.visible(p),weaponMount);this.zergEliteEffects.quality=this.fx.heroQuality;this.zergEliteEffects.render(world,this.camera,p=>this.visible(p),weaponMount);this.terranEliteEffects.render(world,this.camera,p=>this.visible(p),weaponMount);this.eliteSupportEffects.render(world,this.camera,p=>this.visible(p));this.confirmedHeroes.render(weaponMount,p=>this.visible(p));this.zergHeroes.render(p=>this.visible(p));this.protossHeroes.render(p=>this.visible(p));this.fx.render(world,this.camera,p=>this.visible(p),weaponMount);
  }else{world.heroAttackEvents=world.heroAttackEvents.filter(e=>!HEROES[e.packet.hero]);this.lowDanger.render(world,p=>this.visible(p));}
  this.mapView?.updateEnvironment?.({effectsEnabled:!low,time:world.time,paused:world.paused,quality:this.quality,reducedMotion:!motion,camera:this.camera,seed:world.runConfig?.seed??0});
  const distress=this.distress.update(world,motion&&!low,this.cameraShake&&!low);this.distressLayer.hidden=low||world.phase!=='battle'||world.paused||world.requiresPlayerDecision;this.distressLayer.style.opacity=String(distress.opacity);this.distressLayer.dataset.boss=String(distress.boss);this.distressLayer.dataset.casualty=String(distress.casualty);
  const shake=!low&&this.cameraShake&&!world.paused?[...world.visualEvents].reverse().find(e=>e.kind==='skill-impact'&&e.heroId==='yamato_battlecruiser'&&world.time-e.time<.3):undefined;
  const impactOffset=shake?(1-(world.time-shake.time)/.3)*.13*Math.sin((world.time-shake.time)*70):0,offsetX=impactOffset+distress.shakeX,offsetZ=distress.shakeZ;
  this.adaptiveFrame=true;try{if(offsetX||offsetZ){this.camera.position.x+=offsetX;this.camera.position.z+=offsetZ;this.camera.updateMatrixWorld();this.renderScene();this.camera.position.x-=offsetX;this.camera.position.z-=offsetZ;this.camera.updateMatrixWorld();}else this.renderScene();}finally{this.adaptiveFrame=false;}
  // A decision lease can stop simulation without setting paused. Preserve the
  // existing impact offset on every draw while that frozen shake is visible.
  this.stillPresentation=offsetX||offsetZ?null:key;
 }
 private podLabel(p:import('../../simulation/types').Pod){let el=this.podLabels.get(p.id);if(!el){el=document.createElement('div');el.className='pod-world-label';this.labelLayer.append(el);this.podLabels.set(p.id,el);}const active=['falling','active','opening'].includes(p.status);el.hidden=!active||!this.visible(p)||this.world.phase!=='battle'||this.world.paused;if(el.hidden)return;
  _vec.set(p.x,this.ground(p)+3.4,p.z).project(this.camera);const x=(_vec.x*.5+.5)*this.viewportWidth,y=(.5-_vec.y*.5)*this.viewportHeight;el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;const text=`${icon('wireframe.'+p.unitType)}<span class="carrier-count">×${p.passengers.filter(c=>c.status==='waiting').length}</span>`;if(el.dataset.content!==text){el.innerHTML=text;el.dataset.content=text;}}
 pickCarrier(x:number,y:number){return pickCarrier(x,y,this.canvas,this.camera,this.world);}
 pickMove(clientX:number,clientY:number){return pickMovement(clientX,clientY,this.canvas,this.camera,this.scene,this.world);}
 pick(clientX:number,clientY:number,touch=false){return pickBattle(clientX,clientY,touch,this.canvas,this.camera,this.scene,this.world);}
 screen(p:Point){_vec.set(p.x,this.ground(p),p.z).project(this.camera);return {x:(_vec.x*.5+.5)*this.viewportWidth,y:(-.5*_vec.y+.5)*this.viewportHeight};}
 /** Linear HDR scene and bloom, followed by one OutputPass (ACES exposure 1, then sRGB). */
 private preparePresentationSize(){const ratio=this.renderer.getPixelRatio(),width=this.viewportWidth,height=this.viewportHeight;if(width!==this.composerSize.width||height!==this.composerSize.height||ratio!==this.composerSize.ratio){this.composerSize={width,height,ratio};this.heroComposer.setPixelRatio(ratio);this.heroComposer.setSize(width,height);this.bloomDetailSize='';}const key=[width,height,ratio,this.combatDetail].join(':');if(key!==this.bloomDetailSize){this.bloomDetailSize=key;const bloom=this.heroComposer.passes.find(p=>p instanceof UnrealBloomPass);bloom?.setSize(width*ratio*(this.combatDetail==='medium'?.25:1),height*ratio*(this.combatDetail==='medium'?.25:1));}}
 private renderScene(){
  const adapt=this.dynamicResolution&&this.adaptiveFrame&&!this.world.paused&&!document.hidden&&this.world.phase==='battle'&&!this.world.requiresPlayerDecision;
  if(adapt){this.adaptiveTimer??=new AdaptiveGpuTimer(this.renderer.getContext() as WebGL2RenderingContext);this.adaptiveTimer.begin(ms=>{if(this.adaptive.sample(ms,performance.now()))this.resize();},()=>this.adaptive.suspend());}
  else if(this.adaptiveTimer){this.adaptiveTimer.clear();this.adaptive.suspend();}
  try{this.sceneShadows.prepare();this.preparePresentationSize();const ratio=this.renderer.getPixelRatio();this.contact.render(this.scene,this.camera,this.viewportWidth*ratio,this.viewportHeight*ratio);this.heroComposer.render();}finally{if(adapt)this.adaptiveTimer?.end();}
 }
 get cameraPitch(){return this.cameraController.pitch;}
 get cameraOutput(){return {pitch:this.cameraController.effectivePitch,zoom:this.cameraController.effectiveZoom};}
 get cameraInputZoom(){return this.cameraController.inputZoom;}
 get cameraMode(){return this.cameraController.cameraMode;}
 get healthBarMode(){return this.healthBars.mode;}
 setCameraPitch(value:number){this.cameraController.setPitch(value);}
 setCameraMode(value:CameraMode){this.cameraController.setMode(value);}
 setHealthBarMode(value:HealthBarMode){this.healthBars.setMode(value);}
 get cameraZoom(){return this.cameraController.zoom;}
 setCameraZoom(value:number){this.cameraController.setZoom(value);}
 adjustCameraZoom(delta:number){this.cameraController.adjustZoom(delta);}
 resetCameraZoom(){this.cameraController.resetZoom();}
 report(){return {special:this.specialVisuals?.report(),fun:this.funVisuals?.report(),encounters:this.encounterVisuals?.report(),graphics:optimizedGraphics()?{...graphicsPreferences(),budget:runtimeBudget(),textures:textureReport()}:null,combatPreset:this.combatPreset,combatDetail:this.combatDetail,materialUploads:{...materialUploadTotals},refraction:this.refraction.report(),sourceCombat:this.sourceCombatEffects.report(),healthBars:this.healthBars.report(),camera:{...this.cameraController.report(),targetPreview:this.targetPreview?{...this.targetPreview}:null},lighting:this.lighting.report(),shadows:this.sceneShadows.report(),contact:this.contact.report(),distress:{...this.distress.frame},nonHeroes:this.nonHeroEffects.report(),protossElites:this.protossEliteEffects.report(),zergElites:this.zergEliteEffects.report(),terranElites:{...this.terranEliteEffects.report(),medical:this.eliteSupportEffects.report()},protossHeroes:this.protossHeroes.report(),zergHeroes:this.zergHeroes.report(),confirmedHeroes:this.confirmedHeroes.report(),animationMode:this.animationMode,map:this.mapView?.report(),order:this.world.order?.kind==='move'?{...this.world.order,point:{...this.world.order.point}}:this.world.order?{...this.world.order}:null,resolution:{quality:this.quality,adaptive:this.adaptiveQuality,devicePixelRatio:window.devicePixelRatio||1,renderPixelRatio:this.renderer.getPixelRatio(),width:this.canvas.width,height:this.canvas.height,cssWidth:this.viewportWidth,cssHeight:this.viewportHeight,antialias:this.renderer.getContext().getContextAttributes()?.antialias},models:this.loadedModels,variantModels:[...this.gpu.keys()].filter(k=>(k.startsWith('elite.')||k.startsWith('hero.'))&&!k.endsWith('.death')&&!k.endsWith('.siege')&&!k.endsWith('.morph')),assetsPending:this.assetsPending,economicModels:['scv','drone','probe','egg'].filter(k=>this.gpu.has(k)).length,podModel:this.podTemplates.has(this.world.expedition.race),carrierModels:[...this.podTemplates.keys()],resourceModels:this.pickups.batches.size,resourceInstances:this.pickups.visible,errors:[...this.modelErrors,...this.fx.errors,...this.pickups.errors],originalAnimationModels:[...this.batches.values()].filter(b=>b.gltf.animations.length>0).length,proceduralAnimationModels:[...this.batches.values()].filter(b=>!b.gltf.animations.length).length,originalDeathModels:[...this.gpu.keys()].filter(k=>k.endsWith('.death')).length,animationAtlasBytes:[...this.gpu.values()].reduce((n,b)=>n+b.textureBytes,0),lodRatios:Object.fromEntries([...this.gpu].filter(([k])=>ordinaryLodKeys.has(k)).map(([k,b])=>[k,b.lodRatio])),effectTextures:this.fx.loaded,effects:this.fx.stats,sculptedEffects:this.fx.sculptures.stats,textures:this.loadedTextures,fps:this.fps,requestedInstanceUploadBytes:requestedUploadBytes,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,entities:this.world.entities.size,maxStretch:this.world.maxStretch,spatialVisits:this.world.distancePairs,collisionContacts:this.world.collisionContacts};}
}
import {corruptSiteBodies} from '../../simulation/encounters/corrupted-protoss';
