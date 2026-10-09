import * as THREE from 'three';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';

const mats=(m:THREE.Mesh)=>Array.isArray(m.material)?m.material:[m.material];
const opaqueBody=(m:THREE.Mesh)=>m.geometry.hasAttribute('unitPose')?mats(m).some(t=>t.userData.sc2?.role==='body'&&!t.transparent):mats(m).some(t=>t instanceof THREE.MeshStandardMaterial&&!t.transparent);
export class ShadowTrial {
 private light:THREE.DirectionalLight;
 private sourceBlob:THREE.InstancedMesh;
 private configured=new Set<THREE.Mesh>();
 enabled=false;
 constructor(private battle:BattleRenderer){
  this.light=battle.scene.children.find(n=>n instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
  this.sourceBlob=(battle as unknown as {shadows:THREE.InstancedMesh}).shadows;
  // Three r186 maps the retired PCFSoft enum to PCF. Use the actual measured filter.
  battle.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.light.shadow.mapSize.set(1024,1024);Object.assign(this.light.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:.5,far:100});this.light.shadow.camera.updateProjectionMatrix();this.light.shadow.bias=-.00015;this.light.shadow.normalBias=.055;
 }
 setEnabled(value:boolean){this.enabled=value;this.light.castShadow=value;this.battle.renderer.shadowMap.enabled=value;this.sourceBlob.visible=!value;this.sourceBlob.count=value?0:this.sourceBlob.count;}
 beforeDraw(){
  if(!this.enabled)return;
  this.sourceBlob.visible=false;
  const a=this.battle.world.anchor,y=this.battle.world.terrain?.height(a)??0;
  this.light.position.set(a.x-15,y+25,a.z+10);this.light.target.position.set(a.x,y,a.z);this.light.target.updateMatrixWorld();this.light.updateMatrixWorld();
  this.battle.scene.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||this.configured.has(node))return;
   const body=opaqueBody(node);node.castShadow=body;node.receiveShadow=body;
   if(body){
    const material=(mats(node).find(m=>m.userData.sc2?.role==='body')??mats(node)[0]) as THREE.MeshStandardMaterial;
    const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:material.side});
    depth.onBeforeCompile=(s,r)=>material.onBeforeCompile(s,r);depth.customProgramCacheKey=()=>material.customProgramCacheKey()+':pose-depth-v1';node.customDepthMaterial=depth;
   }this.configured.add(node);
  });
 }
 report(){return {enabled:this.enabled,resolution:1024,casters:[...this.configured].filter(m=>m.castShadow&&m.visible&&(m instanceof THREE.InstancedMesh?m.count>0:true)).length,poseDepth:true};}
}
