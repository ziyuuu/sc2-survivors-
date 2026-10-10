import * as THREE from 'three';
import type {ShadowViewContext} from '../scene/scene-shadows';
import {loadSemanticGltf} from '../loaders/semantic-gltf';
import {CAMPAIGN_MAP_SIZE,MAP_THEMES,RadialTerrain} from '../../data/campaign-map';
import {sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import {createCampaignGround,type LandscapeResources} from './campaign-ground';
import {MapVisibility} from './map-visibility';
import type {MapView} from './original-map';

/** Original SC2 scenery, authored ground paint and shared, traversable relief. */
export async function createCampaignMap(scene:THREE.Scene,terrain:RadialTerrain):Promise<MapView>{
 const d=terrain.definition,theme=MAP_THEMES[terrain.recipe.theme],root=new THREE.Group(),half=CAMPAIGN_MAP_SIZE/2;
 root.name=d.source.sha256;root.visible=false;scene.add(root);
 const resources:LandscapeResources={textures:[],geometries:[],materials:[]};
 const {textures,geometries,materials}=resources;
 const dispose=()=>{root.removeFromParent();for(const g of new Set(geometries))g.dispose();for(const m of new Set(materials))m.dispose();for(const t of new Set(textures))t.dispose();};
 try{
  const {ground,stage,updateStage,setLighting}=await createCampaignGround(terrain,resources);root.add(ground);
  const batches:{mesh:THREE.InstancedMesh;matrices:THREE.Matrix4[];bounds:THREE.Sphere[];points:{x:number;z:number;backdrop:boolean}[]}[]=[];
  const matrix=new THREE.Object3D(),vertex=new THREE.Vector3(),color=new THREE.Color();
  for(const id of theme.props){
   const places=d.placements.filter(p=>p.assetId===id);if(!places.length)continue;
   const g=await loadSemanticGltf(id),mixer=new THREE.AnimationMixer(g.scene),stand=g.animations.find(c=>/^stand|idle/i.test(c.name));
   // Include auxiliary SC2 opacity/emissive layers held by shader closures.
   textures.push(...await g.parser.getDependencies('texture') as THREE.Texture[]);
   if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);
   if(terrain.recipe.theme==='ice'){
    const coated=new Set<THREE.Material>();g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const m of Array.isArray(n.material)?n.material:[n.material]){
     if(coated.has(m))continue;coated.add(m);const original=m.onBeforeCompile,key=m.customProgramCacheKey.bind(m);
     m.onBeforeCompile=(shader:THREE.WebGLProgramParametersWithUniforms,renderer:THREE.WebGLRenderer)=>{
      original.call(m,shader,renderer);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 landscapeWorldNormal;').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nlandscapeWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 landscapeWorldNormal;').replace('#include <map_fragment>','#include <map_fragment>\nfloat snow=smoothstep(.22,.78,normalize(landscapeWorldNormal).y)*.78;float textureDetail=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.82,.87)*(.76+textureDetail*.3),snow);');
     };m.customProgramCacheKey=()=>key()+':campaign-snow-v1';
    }});
   }
   const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const matrices=places.map(p=>{
    const x=p.position[0]-half,z=half-p.position[1],scale=p.scale[0]/Math.max(.01,size.x,size.z);
    matrix.position.set(x,terrain.height({x,z})+p.position[2],z);matrix.rotation.set(0,p.rotation,0);
    matrix.scale.set(scale,scale*(p.modelScale?.[1]??1),scale);matrix.updateMatrix();return matrix.matrix.clone();
   });
   g.scene.traverse(n=>{
    if(!(n instanceof THREE.Mesh)||!n.visible)return;
    const geo=n.geometry.clone(),position=geo.getAttribute('position');
    for(let i=0;i<position.count;i++){n.getVertexPosition(i,vertex).applyMatrix4(n.matrixWorld);position.setXYZ(i,vertex.x-center.x,vertex.y-box.min.y,vertex.z-center.z);}
    geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();geo.computeBoundingSphere();geometries.push(geo);
    const mesh=new THREE.InstancedMesh(geo,n.material,places.length);mesh.name=id;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;root.add(mesh);
    const bounds=matrices.map(m=>geo.boundingSphere!.clone().applyMatrix4(m));
    const points=places.map(p=>({x:p.position[0]-half,z:half-p.position[1],backdrop:p.type==='backdrop'}));
    // Snow and distant scenery tint only these instances; unit/effect materials are untouched.
    for(let i=0;i<places.length;i++)mesh.setColorAt(i,color.set(points[i].backdrop?0x697078:terrain.recipe.theme==='ice'&&id.includes('rock')?0xe7f0f5:0xffffff));
    batches.push({mesh,matrices,bounds,points});
   });
   mixer.stopAllAction();mixer.uncacheRoot(g.scene);
   // Each semantic load owns these material/geometry/texture objects.
   g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;geometries.push(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material]){materials.push(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.push(value);}});
  }
  let lastStage=0,visible=0;const visibility=new MapVisibility();
  const update=(camera?:THREE.Camera,shadow?:ShadowViewContext)=>{
   const changed=camera?visibility.update(camera,shadow):false;if(lastStage===terrain.stage&&!changed)return;
   if(lastStage!==terrain.stage)updateStage(terrain.stage);lastStage=terrain.stage;stage.value=lastStage;visible=0;
   for(const b of batches){let n=0;
    for(let i=0;i<b.points.length;i++)if(!camera||visibility.intersects(b.bounds[i])){
     // Static scenery can be read in the unopened distance; enemies and gameplay visibility are unchanged.
     const distant=b.points[i].backdrop||!terrain.isOpen(b.points[i]);
     b.mesh.setMatrixAt(n,b.matrices[i]);b.mesh.setColorAt(n,color.set(distant?0x919ba5:terrain.recipe.theme==='ice'&&b.mesh.name.includes('rock')?0xe7f0f5:0xffffff));n++;
    }
    b.mesh.boundingSphere=null;commitInstances(b.mesh,n);visible+=n;
   }
  };update();
  return {
   bindTerrain:t=>{if(!(t instanceof RadialTerrain)||t.definition.source.sha256!==d.source.sha256)throw Error('地图身份不匹配');terrain=t;lastStage=0;update();},
   update,setLighting,setVisible:v=>{root.visible=v;},dispose,
   report:()=>({name:theme.name,models:theme.props.length,placements:d.placements.length,visibleInstances:visible,visibleMeshes:batches.filter(b=>b.mesh.count>0).length,area:d.stageAreas[terrain.stage-1],scale:1,sourceSha256:d.source.sha256}),
  };
 }catch(error){dispose();throw error;}
}
