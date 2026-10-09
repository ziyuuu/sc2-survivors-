import * as THREE from 'three';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';

/** Reuse the actual colour pass depth, including its animated pose and alpha cuts. */
export class SceneDepthContactPass extends SSAOPass {
 constructor(scene:THREE.Scene,camera:THREE.Camera){
  super(scene,camera,640,360,12);
  this.ssaoMaterial.defines.PERSPECTIVE_CAMERA=0;
  this.ssaoMaterial.fragmentShader=this.ssaoMaterial.fragmentShader.replace('vec3( 1.0 - occlusion )','vec3( 1.0 - occlusion * 0.5 )').replace(/vec3 getViewNormal\( const in vec2 screenPosition \) \{[\s\S]*?\n\t\t\}/,`vec3 getViewNormal(const in vec2 uv){
   vec2 e=1.0/resolution;float d=getDepth(uv),dl=getDepth(uv-vec2(e.x,0.0)),dr=getDepth(uv+vec2(e.x,0.0)),db=getDepth(uv-vec2(0.0,e.y)),dt=getDepth(uv+vec2(0.0,e.y));
   vec3 p=getViewPosition(uv,d,getViewZ(d));
   vec3 dx=abs(dl-d)<abs(dr-d)?p-getViewPosition(uv-vec2(e.x,0.0),dl,getViewZ(dl)):getViewPosition(uv+vec2(e.x,0.0),dr,getViewZ(dr))-p;
   vec3 dy=abs(db-d)<abs(dt-d)?p-getViewPosition(uv-vec2(0.0,e.y),db,getViewZ(db)):getViewPosition(uv+vec2(0.0,e.y),dt,getViewZ(dt))-p;
   return normalize(cross(dx,dy));
  }`);
  let seed=20261009;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<this.kernel.length;i++)this.kernel[i].set(rnd()*2-1,rnd()*2-1,rnd()).normalize().multiplyScalar(.1+.9*(i/this.kernel.length)**2);
  const pixels=new Float32Array(16);for(let i=0;i<16;i++)pixels[i]=rnd();this.noiseTexture.dispose();this.noiseTexture=new THREE.DataTexture(pixels,4,4,THREE.RedFormat,THREE.FloatType);this.noiseTexture.wrapS=this.noiseTexture.wrapT=THREE.RepeatWrapping;this.noiseTexture.needsUpdate=true;this.ssaoMaterial.uniforms.tNoise.value=this.noiseTexture;
 }
 _overrideVisibility(){}
 _restoreVisibility(){}
 _renderOverride(){}
 render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget,deltaTime:number,maskActive:boolean){
  if(!readBuffer.depthTexture)throw Error('Scene depth is required for contact shadows');
  const u=this.ssaoMaterial.uniforms,camera=this.camera as THREE.OrthographicCamera;
  u.tDepth.value=readBuffer.depthTexture;u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;u.cameraProjectionMatrix.value.copy(camera.projectionMatrix);u.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
  super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);
 }
}
