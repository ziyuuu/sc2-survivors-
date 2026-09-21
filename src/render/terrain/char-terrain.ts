import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import {charGeometry} from './char-geometry';
import {CHAR_TERRAIN} from '../../data/terrain';
import {assetUrl} from '../../assets/manifest';
import type {World} from '../../simulation/world';
/** Original Char DDS layers and doodad meshes, with an authored expandable Survivors layout. */
export async function createTerrain(scene:THREE.Scene,w:World){
 const texture=async(id:string,linear=false)=>{const url=assetUrl(id);if(!url)throw Error('Missing terrain '+id);const t=await new THREE.TextureLoader().loadAsync(url);t.colorSpace=linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;};
 const [dirt,normal,rock,rockNormal,cracked,cliff,cliffNormal,cliffEmissive]=await Promise.all([texture('terrain.char'),texture('terrain.char.normal',true),texture('terrain.rock'),texture('terrain.rock.normal',true),texture('terrain.cracked'),texture('terrain.cliff'),texture('terrain.cliff.normal',true),texture('terrain.cliff.emissive')]);
 dirt.repeat.set(28,28);normal.repeat.copy(dirt.repeat);rock.repeat.set(2,2);rockNormal.repeat.copy(rock.repeat);
 const half={value:w.mapHalf},material=new THREE.MeshStandardMaterial({map:dirt,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),roughness:.97,color:0xbab3a1});
 material.onBeforeCompile=shader=>{shader.uniforms.openHalf=half;shader.uniforms.crackedMap={value:cracked};shader.uniforms.rockMap={value:rock};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 terrainXZ;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainXZ=(modelMatrix*vec4(position,1.0)).xz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 terrainXZ;uniform float openHalf;uniform sampler2D crackedMap;uniform sampler2D rockMap;').replace('#include <map_fragment>',`#include <map_fragment>
   float patchMix=smoothstep(-0.3,0.65,sin(terrainXZ.x*.12+sin(terrainXZ.y*.08))*cos(terrainXZ.y*.15));
   vec3 varied=mix(texture2D(crackedMap,terrainXZ*.24).rgb,texture2D(rockMap,terrainXZ*.22).rgb,patchMix);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*varied*1.5,0.45);
   float edge=max(abs(terrainXZ.x),abs(terrainXZ.y));float locked=smoothstep(openHalf-.2,openHalf+.25,edge);
   diffuseColor.rgb*=mix(1.0,0.13,locked);diffuseColor.rgb+=vec3(.2,.08,.015)*(1.0-smoothstep(.04,.18,abs(edge-openHalf)));`);
 };
 const geometry=charGeometry(),ground=new THREE.Mesh(geometry.floor,material);ground.position.y=-.018;scene.add(ground);const cliffs=new THREE.Mesh(geometry.cliffs,new THREE.MeshStandardMaterial({map:cliff,normalMap:cliffNormal,emissiveMap:cliffEmissive,emissive:0x6f2410,emissiveIntensity:.25,roughness:.96,side:THREE.DoubleSide,color:0xb9aaa0}));scene.add(cliffs);
 const loader=new GLTFLoader(),props:THREE.Object3D[]=[];
 for(const [id,placements] of [['model.terrain.rock',w.obstacles.flatMap((o,index)=>{const count=Math.ceil(Math.max(o.w,o.h)/3.2);return Array.from({length:count},(_,i)=>({x:o.x+(o.w>o.h?(i/(count-1)-.5)*(o.w-2):0),z:o.z+(o.h>o.w?(i/(count-1)-.5)*(o.h-2):0),width:3.9,height:1.4+(i%3)*.35,angle:(i+index)*2.399}));})],['model.terrain.wreck',[{x:33,z:14,width:7,height:3,angle:.5}]]] as const){
  const url=assetUrl(id);if(!url)continue;const g=await restoreSc2Materials(await loader.loadAsync(url)),mixer=new THREE.AnimationMixer(g.scene),stand=g.animations.find(c=>/^stand$/i.test(c.name));if(stand){mixer.clipAction(stand).play();mixer.setTime(0);}g.scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),sx=1/Math.max(size.x,size.z);
  const normalize=new THREE.Matrix4().makeScale(sx,1/Math.max(.01,size.y),sx).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
  g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const geo=n.geometry.clone();geo.applyMatrix4(normalize.clone().multiply(n.matrixWorld));const mesh=new THREE.InstancedMesh(geo,n.material,placements.length),o=new THREE.Object3D();
   placements.forEach((p,i)=>{o.position.set(p.x,CHAR_TERRAIN.height(p),p.z);o.scale.set(p.width,p.height,p.width);o.rotation.y=p.angle;o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);props.push(mesh);
  });
 }
 return ()=>{half.value=w.mapHalf;};
}

