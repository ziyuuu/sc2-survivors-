import * as THREE from 'three';
import {loadSemanticGltf} from '../loaders/semantic-gltf';
import {assetUrl} from '../../assets/manifest';
import {MAP_THEMES,RadialTerrain} from '../../data/campaign-map';
import {terrainArray} from './map-surface';
import {sc2BodyBounds} from '../loaders/sc2-materials';
import {commitInstances} from '../units/instance-updates';
import type {MapView} from './original-map';
/** Sparse original SC props and original terrain pixels; no original-map ramps or cliff maze. */
export async function createCampaignMap(scene:THREE.Scene,terrain:RadialTerrain):Promise<MapView>{
 const d=terrain.definition,theme=MAP_THEMES[terrain.recipe.theme],root=new THREE.Group();root.name=d.source.sha256;root.visible=false;scene.add(root);
 const textures:THREE.Texture[]=[],geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const loadTexture=async(id:string)=>{const url=assetUrl(id);if(!url)throw Error('缺少地表：'+id);const t=await new THREE.TextureLoader().loadAsync(url);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;};
 try{
 const original=await loadTexture(terrain.recipe.theme==='char'?'terrain.char':'map.terrain.diffuse');original.wrapS=original.wrapT=THREE.RepeatWrapping;
 const atlas=terrain.recipe.theme==='char'?null:terrainArray(original);if(atlas)textures.push(atlas);
 const mask=new THREE.DataTexture(Uint8Array.from(d.reveal),d.walkWidth,d.walkHeight,THREE.RedFormat);mask.minFilter=mask.magFilter=THREE.NearestFilter;mask.needsUpdate=true;textures.push(mask);const stage={value:1};
 const material=new THREE.MeshStandardMaterial({map:original,roughness:.94});materials.push(material);
 material.onBeforeCompile=s=>{s.uniforms.openMap={value:mask};s.uniforms.openStage=stage;if(atlas)s.uniforms.groundLayers={value:atlas};
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D openMap;uniform float openStage;'+(atlas?'uniform highp sampler2DArray groundLayers;':''));
  const pixels=atlas?`float groundPatch=sin(vMapUv.x*27.0)*sin(vMapUv.y*31.0);vec3 ground=texture(groundLayers,vec3(vMapUv*32.0,${theme.layers[0]}.0)).rgb;ground=mix(ground,texture(groundLayers,vec3(vMapUv*32.0,${theme.layers[1]}.0)).rgb,smoothstep(-.5,.6,groundPatch)*.25);ground=mix(ground,texture(groundLayers,vec3(vMapUv*32.0,${theme.layers[2]}.0)).rgb,smoothstep(-.3,.8,-groundPatch)*.14);`:'vec3 ground=texture2D(map,vMapUv*24.0).rgb;';
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`${pixels}float zone=texture2D(openMap,vec2(vMapUv.x,1.0-vMapUv.y)).r*255.0;float visibleZone=step(.5,zone)*(1.0-step(openStage+.1,zone));diffuseColor.rgb*=ground*mix(.12,1.0,visibleZone);`);
 };material.customProgramCacheKey=()=>`radial-ground-${terrain.recipe.theme}-v1`;
 const geometry=new THREE.PlaneGeometry(160,160);geometries.push(geometry);const ground=new THREE.Mesh(geometry,material);ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.name='char-traversable-ground';root.add(ground);
 const batches:{mesh:THREE.InstancedMesh;matrices:THREE.Matrix4[];points:{x:number;z:number}[]}[]=[],matrix=new THREE.Object3D(),vertex=new THREE.Vector3();
 for(const id of theme.props){const places=d.placements.filter(p=>p.assetId===id);if(!places.length)continue;const g=await loadSemanticGltf(id),mixer=new THREE.AnimationMixer(g.scene),stand=g.animations.find(c=>/^stand|idle/i.test(c.name));if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const matrices=places.map(p=>{const scale=p.scale[0]/Math.max(.01,size.x,size.z);matrix.position.set(p.position[0]-80,0,80-p.position[1]);matrix.rotation.set(0,p.rotation,0);matrix.scale.setScalar(scale);matrix.updateMatrix();return matrix.matrix.clone();});
  g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh)||!n.visible)return;const geo=n.geometry.clone(),position=geo.getAttribute('position');for(let i=0;i<position.count;i++){n.getVertexPosition(i,vertex).applyMatrix4(n.matrixWorld);position.setXYZ(i,vertex.x-center.x,vertex.y-box.min.y,vertex.z-center.z);}geo.deleteAttribute('skinIndex');geo.deleteAttribute('skinWeight');geo.computeVertexNormals();geo.computeBoundingSphere();geometries.push(geo);const mesh=new THREE.InstancedMesh(geo,n.material,places.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;root.add(mesh);batches.push({mesh,matrices,points:places.map(p=>({x:p.position[0]-80,z:80-p.position[1]}))});});
  mixer.stopAllAction();mixer.uncacheRoot(g.scene);
  // These GLTF resources belong only to this map view, unlike shared unit templates.
  g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;geometries.push(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material]){materials.push(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.push(value);}});
 }
 let last=0,visible=0;const update=()=>{if(last===terrain.stage)return;last=terrain.stage;stage.value=last;visible=0;for(const b of batches){let n=0;for(let i=0;i<b.points.length;i++)if(terrain.isOpen(b.points[i]))b.mesh.setMatrixAt(n++,b.matrices[i]);commitInstances(b.mesh,n);visible+=n;}};update();
 return {bindTerrain:t=>{if(!(t instanceof RadialTerrain)||t.definition.source.sha256!==d.source.sha256)throw Error('地图身份不匹配');terrain=t;last=0;update();},update,setVisible:v=>{root.visible=v;},dispose:()=>{root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();},report:()=>({name:theme.name,models:theme.props.length,placements:d.placements.length,visibleInstances:visible,visibleMeshes:batches.filter(b=>b.mesh.count>0).length,area:d.stageAreas[terrain.stage-1],scale:1,sourceSha256:d.source.sha256})};
 }catch(error){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();throw error;}
}
