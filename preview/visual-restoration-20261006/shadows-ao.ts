import * as THREE from 'three';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';

const mats=(m:THREE.Mesh)=>Array.isArray(m.material)?m.material:[m.material];
const opaqueBody=(m:THREE.Mesh)=>m.geometry.hasAttribute('unitPose')?mats(m).some(t=>t.userData.sc2?.role==='body'&&!t.transparent):mats(m).some(t=>t instanceof THREE.MeshStandardMaterial&&!t.transparent);
/** Depth and normals carry the exact existing GPU pose callback, not the bind pose. */
export class PoseAwareSSAOPass extends SSAOPass {
 private normals=new Map<THREE.Mesh,THREE.MeshNormalMaterial>();
 constructor(scene:THREE.Scene,camera:THREE.Camera){
  super(scene,camera,640,360,16);this.kernelRadius=1.15;this.minDistance=.0003;this.maxDistance=.025;
  this.ssaoMaterial.defines.PERSPECTIVE_CAMERA=0;this.depthRenderMaterial.defines.PERSPECTIVE_CAMERA=0;
  this.ssaoMaterial.fragmentShader=this.ssaoMaterial.fragmentShader.replace('vec3( 1.0 - occlusion )','vec3( 1.0 - occlusion * 0.45 )');
  let seed=20261006;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<this.kernel.length;i++)this.kernel[i].set(rnd()*2-1,rnd()*2-1,rnd()).normalize().multiplyScalar(.1+.9*(i/this.kernel.length)**2);
  const data=new Float32Array(16);for(let i=0;i<16;i++)data[i]=rnd();this.noiseTexture.dispose();this.noiseTexture=new THREE.DataTexture(data,4,4,THREE.RedFormat,THREE.FloatType);this.noiseTexture.wrapS=this.noiseTexture.wrapT=THREE.RepeatWrapping;this.noiseTexture.needsUpdate=true;this.ssaoMaterial.uniforms.tNoise.value=this.noiseTexture;
 }
 _renderOverride(renderer:THREE.WebGLRenderer,_override:THREE.Material,target:THREE.WebGLRenderTarget,color:THREE.ColorRepresentation,alpha:number){
  const oldTarget=renderer.getRenderTarget(),oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),oldAuto=renderer.autoClear,oldShadow=renderer.shadowMap.autoUpdate;
  const saved:{node:THREE.Object3D;visible:boolean;material?:THREE.Material|THREE.Material[]}[]=[];
  try{
   this.scene.traverse(node=>{
    if(!(node instanceof THREE.Mesh)){if(node instanceof THREE.Line||node instanceof THREE.Points){saved.push({node,visible:node.visible});node.visible=false;}return;}
    saved.push({node,visible:node.visible,material:node.material});
    if(!opaqueBody(node)){node.visible=false;return;}
    let normal=this.normals.get(node);if(!normal){const material=mats(node)[0] as THREE.MeshStandardMaterial;normal=new THREE.MeshNormalMaterial({side:material.side,normalMap:material.normalMap,normalScale:material.normalScale,alphaTest:material.alphaTest});
     if(node.geometry.hasAttribute('unitPose')){normal.onBeforeCompile=(s,r)=>material.onBeforeCompile(s,r);normal.customProgramCacheKey=()=>material.customProgramCacheKey()+':pose-normal-v1';}
     this.normals.set(node,normal);
    }node.material=normal;
   });
   renderer.shadowMap.autoUpdate=false;renderer.autoClear=false;renderer.setRenderTarget(target);renderer.setClearColor(color,alpha);renderer.clear();renderer.render(this.scene,this.camera);
  }finally{
   for(const s of saved){s.node.visible=s.visible;if(s.material&&(s.node instanceof THREE.Mesh))s.node.material=s.material;}
   renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);renderer.autoClear=oldAuto;renderer.shadowMap.autoUpdate=oldShadow;
  }
 }
}

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
   if(body&&node.geometry.hasAttribute('unitPose')){
    const material=mats(node).find(m=>m.userData.sc2?.role==='body') as THREE.MeshStandardMaterial;
    const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:material.side});
    depth.onBeforeCompile=(s,r)=>material.onBeforeCompile(s,r);depth.customProgramCacheKey=()=>material.customProgramCacheKey()+':pose-depth-v1';node.customDepthMaterial=depth;
   }this.configured.add(node);
  });
 }
 report(){return {enabled:this.enabled,resolution:1024,casters:[...this.configured].filter(m=>m.castShadow&&m.visible&&(m instanceof THREE.InstancedMesh?m.count>0:true)).length,poseDepth:true};}
}
