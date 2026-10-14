import * as THREE from 'three';
import type {ShadowViewContext} from '../scene/scene-shadows';
import {loadSemanticGltf} from '../loaders/semantic-gltf';
import {CAMPAIGN_MAP_SIZE,MAP_THEMES,RadialTerrain} from '../../data/campaign-map';
import {sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import {createCampaignGround,type LandscapeResources} from './campaign-ground';
import {createCampaignGround as createLegacyGround} from './campaign-ground-legacy';
import {MAP_VISUAL_PROFILES,type MapVisualFeatures} from './map-visual-profile';
import {loadEnvironmentTexture} from './environment-texture';
import {prepareEnvironmentMaterials,bindLegacySnow} from './environment-materials';
import {createEnvironmentAtmosphere} from './environment-atmosphere';
import {createEnvironmentBases} from './environment-bases';
import {MapVisibility} from './map-visibility';
import type {MapView} from './original-map';
import type {MapPlacement} from '../../data/map-definition';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {EnvironmentFrame} from './environment-atmosphere';
import {sceneryShape,fitScenery,sceneryFootingGeometry,type SceneryFit} from './scenery-grounding';

/** Explicit opt-in layout used by the environment sample and later approved map integration. */
export interface CampaignMapPresentation {
 placements:MapPlacement[];assetIds:readonly string[];
 groundHeight?:(x:number,z:number)=>number;
 sceneryHeight?:(x:number,z:number)=>number;
 softenPads?:boolean;
 solidFor?:(placement:MapPlacement)=>{x:number;z:number;r:number}|undefined;
 prepareModel?:(g:GLTF,id:string,resources:LandscapeResources)=>Promise<void>;
 decorateInstances?:(input:{root:THREE.Group;model:GLTF;id:string;placements:MapPlacement[];matrices:THREE.Matrix4[];bodyBox:THREE.Box3;terrain:RadialTerrain;resources:LandscapeResources})=>Promise<void>;
 decorate?:(root:THREE.Group,terrain:RadialTerrain,resources:LandscapeResources,ground:THREE.Material)=>Promise<{update?:(frame:EnvironmentFrame)=>void;report:()=>unknown}>;
}

/** Original SC2 scenery, authored ground paint and shared, traversable relief. */
export async function createCampaignMap(scene:THREE.Scene,terrain:RadialTerrain,presentation?:CampaignMapPresentation):Promise<MapView>{
 const d=terrain.definition,theme=MAP_THEMES[terrain.recipe.theme],root=new THREE.Group(),half=CAMPAIGN_MAP_SIZE/2;
 const placements=presentation?.placements??d.placements,assetIds=presentation?.assetIds??theme.props,groundOptions={placements,height:presentation?.groundHeight,softenPads:presentation?.softenPads};
 root.name=d.source.sha256;root.visible=false;scene.add(root);
 const resources:LandscapeResources={textures:[],geometries:[],materials:[]};
 const {textures,geometries,materials}=resources;
 let disposed=false;const dispose=()=>{
  disposed=true;root.removeFromParent();
  // Instance matrices/colors have their own GPU buffers, separate from geometry attributes.
  root.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();});
  for(const g of new Set(geometries))g.dispose();for(const m of new Set(materials))m.dispose();for(const t of new Set(textures))t.dispose();
 };
 try{
  const profile=MAP_VISUAL_PROFILES[terrain.recipe.theme],features={...profile.features};
  let visual=features.ground?await createCampaignGround(terrain,resources,groundOptions):undefined,legacy=features.ground?undefined:await createLegacyGround(terrain,resources),activeGround=visual??legacy!;
  root.add(activeGround.ground);visual?.setBases(features.bases);
  const coating=await loadEnvironmentTexture(profile.coating,resources),atmosphere=await createEnvironmentAtmosphere(root,()=>terrain,terrain.recipe.theme,terrain.recipe.seed,resources,!!presentation);atmosphere.setEnabled(features.atmosphere);
  let emissionRepairs=0;const batches:{mesh:THREE.InstancedMesh;original:THREE.Material|THREE.Material[];restored:THREE.Material|THREE.Material[];matrices:THREE.Matrix4[];bounds:THREE.Sphere[];points:{x:number;z:number;backdrop:boolean}[]}[]=[];
  const matrix=new THREE.Object3D(),vertex=new THREE.Vector3(),color=new THREE.Color(),bodyHeights=new Map<string,number>();
  const fits:{asset:string;type:string;fit:SceneryFit}[]=[];
  for(const id of assetIds){
   const places=placements.filter(p=>p.assetId===id);if(!places.length)continue;
   const g=await loadSemanticGltf(id),mixer=new THREE.AnimationMixer(g.scene),stand=g.animations.find(c=>/^stand|idle/i.test(c.name));
   // Include auxiliary SC2 opacity/emissive layers held by shader closures.
   textures.push(...await g.parser.getDependencies('texture') as THREE.Texture[]);
   if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);
   if(presentation)g.scene.traverse(n=>{if(n instanceof THREE.Mesh){geometries.push(n.geometry);materials.push(...Array.isArray(n.material)?n.material:[n.material])}});
   await presentation?.prepareModel?.(g,id,resources);
   const adapted=await prepareEnvironmentMaterials(g,terrain.recipe.theme,coating,resources);emissionRepairs+=adapted.emissionRepairs;
   if(terrain.recipe.theme==='ice')for(const original of adapted.pairs.keys())bindLegacySnow(original);
   const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const shape=presentation?sceneryShape(g.scene,box):undefined;
   bodyHeights.set(id,size.y/Math.max(.01,size.x,size.z));
   const matrices=places.map(p=>{
    if(shape){const fit=fitScenery(terrain,p,shape,presentation?.solidFor?.(p),presentation?.sceneryHeight??presentation?.groundHeight);fits.push({asset:id,type:p.type,fit});
     if(fit.solid){const footing=sceneryFootingGeometry(terrain,fit);if(footing){geometries.push(footing);const mesh=new THREE.Mesh(footing,activeGround.ground.material);mesh.name='scenery-contact:'+id;root.add(mesh)}}
     return fit.matrix;
    }
    const x=p.position[0]-half,z=half-p.position[1],scale=p.scale[0]/Math.max(.01,size.x,size.z);
    matrix.position.set(x,terrain.height({x,z})+p.position[2],z);matrix.rotation.set(0,p.rotation,0);
    matrix.scale.set(scale,scale*(p.modelScale?.[1]??1),scale);matrix.updateMatrix();return matrix.matrix.clone();
   });
   await presentation?.decorateInstances?.({root,model:g,id,placements:places,matrices,bodyBox:box,terrain,resources});
   g.scene.traverse(n=>{
    if(!(n instanceof THREE.Mesh)||!n.visible)return;
    const geo=n.geometry.clone(),position=geo.getAttribute('position');
    for(let i=0;i<position.count;i++){n.getVertexPosition(i,vertex).applyMatrix4(n.matrixWorld);position.setXYZ(i,vertex.x-center.x,vertex.y-box.min.y,vertex.z-center.z);}
    geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();geo.computeBoundingSphere();geometries.push(geo);
    const original=n.material,restored=Array.isArray(original)?original.map(m=>adapted.pairs.get(m)!):adapted.pairs.get(original)!;
    const mesh=new THREE.InstancedMesh(geo,features.bases?restored:original,places.length);mesh.name=id;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;root.add(mesh);
    const bounds=matrices.map(m=>geo.boundingSphere!.clone().applyMatrix4(m));
    const points=places.map(p=>({x:p.position[0]-half,z:half-p.position[1],backdrop:p.type==='backdrop'}));
    // Snow and distant scenery tint only these instances; unit/effect materials are untouched.
    for(let i=0;i<places.length;i++)mesh.setColorAt(i,color.set(points[i].backdrop?0x697078:terrain.recipe.theme==='ice'&&id.includes('rock')?0xe7f0f5:0xffffff));
    batches.push({mesh,original,restored,matrices,bounds,points});
   });
   mixer.stopAllAction();mixer.uncacheRoot(g.scene);
   // Each semantic load owns these material/geometry/texture objects.
   g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;geometries.push(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material]){materials.push(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.push(value);}});
  }
  const bases=createEnvironmentBases(root,terrain,terrain.recipe.theme,bodyHeights,activeGround.ground.material,resources);bases.setVisible(features.bases&&!presentation);
  const decoration=await presentation?.decorate?.(root,terrain,resources,activeGround.ground.material);
  let lastStage=0,visible=0;const visibility=new MapVisibility();
  const update=(camera?:THREE.Camera,shadow?:ShadowViewContext)=>{
   const changed=camera?visibility.update(camera,shadow):false;if(lastStage===terrain.stage&&!changed)return;
   if(lastStage!==terrain.stage)activeGround.updateStage(terrain.stage);lastStage=terrain.stage;activeGround.stage.value=lastStage;visible=0;
   for(const b of batches){let n=0;
    for(let i=0;i<b.points.length;i++)if(!camera||visibility.intersects(b.bounds[i])){
     // Static scenery can be read in the unopened distance; enemies and gameplay visibility are unchanged.
     const distant=b.points[i].backdrop||!terrain.isOpen(b.points[i]);
     b.mesh.setMatrixAt(n,b.matrices[i]);b.mesh.setColorAt(n,color.set(distant?0x919ba5:!features.bases&&terrain.recipe.theme==='ice'&&b.mesh.name.includes('rock')?0xe7f0f5:0xffffff));n++;
    }
    b.mesh.boundingSphere=null;commitInstances(b.mesh,n);visible+=n;
   }
  };update();
  let lighting={shadow:true,contact:true};const setLighting=(value:{shadow:boolean;contact:boolean})=>{lighting=value;activeGround.setLighting(value);};
  const setVisualParts=async(next:Partial<MapVisualFeatures>)=>{
   if(disposed)throw Error('地图已释放');Object.assign(features,next);
   if(features.ground&&!visual){visual=await createCampaignGround(terrain,resources,groundOptions);root.add(visual.ground);}
   if(!features.ground&&!legacy){legacy=await createLegacyGround(terrain,resources);root.add(legacy.ground);}
   if(disposed){dispose();throw Error('地图已释放');}
   if(visual){visual.ground.visible=features.ground;visual.setBases(features.bases);}if(legacy)legacy.ground.visible=!features.ground;
   activeGround=features.ground?visual!:legacy!;activeGround.setLighting(lighting);activeGround.updateStage(terrain.stage);
   for(const batch of batches)batch.mesh.material=features.bases?batch.restored:batch.original;
   atmosphere.setEnabled(features.atmosphere);bases.setVisible(features.bases&&!presentation);bases.setMaterial(activeGround.ground.material);lastStage=0;update();
  };
  return {
   bindTerrain:t=>{if(!(t instanceof RadialTerrain)||t.definition.source.sha256!==d.source.sha256)throw Error('地图身份不匹配');terrain=t;lastStage=0;update();},
   update,updateEnvironment:frame=>{atmosphere.update(frame);decoration?.update?.(frame)},setVisualParts,setLighting,setVisible:v=>{root.visible=v;atmosphere.setVisible(v);},dispose,
   report:()=>({name:theme.name,models:assetIds.length,placements:placements.length,visibleInstances:visible,visibleMeshes:batches.filter(b=>b.mesh.count>0).length,area:d.stageAreas[terrain.stage-1],scale:1,sourceSha256:d.source.sha256,environment:{features:{...features},ground:features.ground?visual?.report():{legacy:true},bases:bases.report(),emissionRepairs,samplers:textures.filter(t=>t.name.startsWith('terrain.visual.')).map(t=>({name:t.name,width:(t.image as {width?:number})?.width,height:(t.image as {height?:number})?.height,anisotropy:t.anisotropy,mipmaps:t.generateMipmaps,colorSpace:t.colorSpace})),atmosphere:atmosphere.report(),...(presentation?{sample:{fits:fits.map(({asset,type,fit:{matrix,hull,...fit}})=>({asset,type,...fit,hull})),decoration:decoration?.report()}}:{})}}),
  };
 }catch(error){dispose();throw error;}
}
