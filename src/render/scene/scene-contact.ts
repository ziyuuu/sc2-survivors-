import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {physicalSurface,type PosedDepthRegistry} from '../materials/posed-depth';

export const CONTACT_SAMPLES=12,CONTACT_RADIUS=.48,CONTACT_STRENGTH=.5;
export function contactKernel(){return Array.from({length:CONTACT_SAMPLES},(_,i)=>{const z=(i+.5)/CONTACT_SAMPLES,a=i*2.399963229728653,r=Math.sqrt(1-z*z),scale=.1+.9*((i+.5)/CONTACT_SAMPLES)**2;return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z).multiplyScalar(scale);});}
type ContactUniforms={sceneContactMap:{value:THREE.Texture};sceneContactSize:{value:THREE.Vector2};sceneContactViewport:{value:THREE.Vector2};sceneContactSpan:{value:number};sceneContactEnabled:{value:number}};
/** Bilateral upsampling touches only ambient diffuse. Source emission, direct light and transparency stay independent. */
export function bindAmbientContact(material:THREE.Material,uniforms:ContactUniforms){
 const compile=material.onBeforeCompile,program=material.customProgramCacheKey;
 material.onBeforeCompile=(shader,renderer)=>{
  compile.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
  // Carrier views preserve a prewarmed template's authored callback when cloning.
  // Its callback may already contain this pass; rebind to this target without
  // duplicating GLSL declarations or multiplying ambient diffuse a second time.
  if(shader.fragmentShader.includes('float sceneAmbientContact(){'))return;
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform sampler2D sceneContactMap;uniform vec2 sceneContactSize;uniform vec2 sceneContactViewport;uniform float sceneContactSpan;uniform float sceneContactEnabled;
   float sceneAmbientContact(){
    if(sceneContactEnabled<.5)return 1.;vec2 pixel=gl_FragCoord.xy/sceneContactViewport*sceneContactSize-.5,base=floor(pixel),f=fract(pixel);float sum=0.,weight=0.;
    for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 q=vec2(float(x),float(y));vec2 sampleUv=(base+q+.5)/sceneContactSize;vec2 data=texture2D(sceneContactMap,sampleUv).rg;
     float depthWeight=max(0.,1.-abs(data.g-gl_FragCoord.z)*sceneContactSpan/.12);vec2 blend=mix(1.-f,f,q);float w=blend.x*blend.y*depthWeight;sum+=data.r*w;weight+=w;}
    return weight>.0001?sum/weight:1.;
   }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=sceneAmbientContact();');
 };
 material.customProgramCacheKey=()=>{const key=program.call(material);return key.includes(':ambient-contact-v1')?key:key+':ambient-contact-v1';};material.needsUpdate=true;
}
const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const fragmentShader=`varying vec2 vUv;uniform sampler2D sceneDepth;uniform mat4 projection;uniform mat4 inverseProjection;uniform vec2 depthSize;uniform vec3 kernel[12];uniform float radius;uniform float strength;
 float depthAt(vec2 uv){return texture2D(sceneDepth,uv).r;}
 vec3 viewAt(vec2 uv,float depth){vec4 v=inverseProjection*vec4(uv*2.-1.,depth*2.-1.,1.);return v.xyz/v.w;}
 vec3 viewNormal(vec2 uv,float d,vec3 p){vec2 e=1./depthSize;float l=depthAt(uv-vec2(e.x,0.)),r=depthAt(uv+vec2(e.x,0.)),b=depthAt(uv-vec2(0.,e.y)),t=depthAt(uv+vec2(0.,e.y));
  vec3 dx=abs(l-d)<abs(r-d)?p-viewAt(uv-vec2(e.x,0.),l):viewAt(uv+vec2(e.x,0.),r)-p;
  vec3 dy=abs(b-d)<abs(t-d)?p-viewAt(uv-vec2(0.,e.y),b):viewAt(uv+vec2(0.,e.y),t)-p;vec3 n=cross(dx,dy);return dot(n,n)>1e-12?normalize(n):vec3(0.,0.,1.);}
 void main(){float depth=depthAt(vUv);if(depth>=.999999){gl_FragColor=vec4(1.,depth,0.,1.);return;}vec3 p=viewAt(vUv,depth),n=viewNormal(vUv,depth,p);
  vec3 axis=abs(n.z)<.95?vec3(0.,0.,1.):vec3(0.,1.,0.);vec3 tangent=normalize(cross(axis,n)),bitangent=cross(n,tangent);mat3 orient=mat3(tangent,bitangent,n);float obscured=0.;
  for(int i=0;i<12;i++){vec3 samplePoint=p+orient*kernel[i]*radius;vec4 clip=projection*vec4(samplePoint,1.);vec2 uv=clip.xy/clip.w*.5+.5;if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))continue;
   float realDepth=depthAt(uv);if(realDepth>=.999999)continue;vec3 real=viewAt(uv,realDepth);float delta=real.z-samplePoint.z;float nearby=1.-smoothstep(radius*.3,radius,abs(p.z-real.z));obscured+=step(.018,delta)*nearby;}
  gl_FragColor=vec4(1.-clamp(obscured/12.,0.,1.)*strength,depth,0.,1.);
 }`;

export class SceneContact {
 enabled=true;private ready=false;private fallback:string|null=null;private bound=new WeakSet<THREE.Material>();
 private depthTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
 private target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});
 private white=new THREE.DataTexture(new Uint8Array([255,255,0,255]),1,1);
 private uniforms:ContactUniforms={sceneContactMap:{value:this.white},sceneContactSize:{value:new THREE.Vector2(1,1)},sceneContactViewport:{value:new THREE.Vector2(1,1)},sceneContactSpan:{value:1},sceneContactEnabled:{value:0}};
 private material=new THREE.ShaderMaterial({name:'posed-contact-12',depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,uniforms:{sceneDepth:{value:null},projection:{value:new THREE.Matrix4()},inverseProjection:{value:new THREE.Matrix4()},depthSize:{value:new THREE.Vector2(1,1)},kernel:{value:contactKernel()},radius:{value:CONTACT_RADIUS},strength:{value:CONTACT_STRENGTH}},vertexShader,fragmentShader});
 private quad=new FullScreenQuad(this.material);private width=0;private height=0;private occluders=0;
 constructor(private renderer:THREE.WebGLRenderer,private registry:PosedDepthRegistry){this.white.needsUpdate=true;this.depthTarget.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.depthTarget.texture.name='posed-contact-depth-colour-unused';this.depthTarget.depthTexture.name='posed-contact-depth';this.target.texture.name='ambient-contact-and-depth';}
 prepare(root:THREE.Object3D){if(!this.enabled)return;root.traverse(node=>{if(!(node instanceof THREE.Mesh))return;for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof THREE.MeshStandardMaterial&&physicalSurface(material)&&!this.bound.has(material)){bindAmbientContact(material,this.uniforms);this.bound.add(material);}});}
 render(scene:THREE.Scene,camera:THREE.OrthographicCamera,width:number,height:number){
  if(!this.enabled||this.renderer.getContext().isContextLost())return;
  this.prepare(scene);width=Math.max(1,Math.floor(width));height=Math.max(1,Math.floor(height));const halfWidth=Math.max(1,Math.ceil(width/2)),halfHeight=Math.max(1,Math.ceil(height/2));
  if(this.width!==width||this.height!==height){this.width=width;this.height=height;this.depthTarget.setSize(width,height);this.target.setSize(halfWidth,halfHeight);}
  const renderer=this.renderer,previous=renderer.getRenderTarget(),background=scene.background,override=scene.overrideMaterial,autoUpdate=renderer.shadowMap.autoUpdate,needsUpdate=renderer.shadowMap.needsUpdate,clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
  const changed:{node:THREE.Object3D;visible:boolean;material?:THREE.Material|THREE.Material[]}[]=[];this.occluders=0;
  scene.traverseVisible(node=>{if(node instanceof THREE.Mesh&&node.userData.visualRole!=='effect'&&(Array.isArray(node.material)?node.material:[node.material]).some(physicalSurface)&&(!(node instanceof THREE.InstancedMesh)||node.count>0))this.occluders++;});
  try{
   scene.traverse(node=>{
    if(node instanceof THREE.Mesh){const physical=(Array.isArray(node.material)?node.material:[node.material]).some(physicalSurface)&&node.userData.visualRole!=='effect';changed.push({node,visible:node.visible,material:node.material});if(physical)node.material=this.registry.depthFor(node);else node.visible=false;}
    else if(node instanceof THREE.Line||node instanceof THREE.Points||node instanceof THREE.Sprite){changed.push({node,visible:node.visible});node.visible=false;}
   });
   scene.background=null;scene.overrideMaterial=null;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setClearColor(0xffffff,1);renderer.setRenderTarget(this.depthTarget);renderer.clear();renderer.render(scene,camera);
   const u=this.material.uniforms;u.sceneDepth.value=this.depthTarget.depthTexture;u.projection.value.copy(camera.projectionMatrix);u.inverseProjection.value.copy(camera.projectionMatrixInverse);u.depthSize.value.set(width,height);
   renderer.setRenderTarget(this.target);renderer.clear();this.quad.render(renderer);
   this.uniforms.sceneContactMap.value=this.target.texture;this.uniforms.sceneContactSize.value.set(halfWidth,halfHeight);this.uniforms.sceneContactViewport.value.set(width,height);this.uniforms.sceneContactSpan.value=camera.far-camera.near;this.uniforms.sceneContactEnabled.value=1;this.ready=true;
  }catch(error){this.enabled=false;this.ready=false;this.fallback=String(error);this.uniforms.sceneContactEnabled.value=0;}
  finally{
   for(const entry of changed){entry.node.visible=entry.visible;if(entry.node instanceof THREE.Mesh&&entry.material)entry.node.material=entry.material;}
   scene.background=background;scene.overrideMaterial=override;renderer.shadowMap.autoUpdate=autoUpdate;renderer.shadowMap.needsUpdate=needsUpdate;renderer.setClearColor(clear,alpha);renderer.setRenderTarget(previous);
  }
 }
 restore(){this.depthTarget.dispose();this.target.dispose();this.uniforms.sceneContactMap.value=this.white;this.uniforms.sceneContactEnabled.value=0;this.ready=false;}
 report(){return {enabled:this.enabled,ready:this.ready,fallback:this.fallback,samples:CONTACT_SAMPLES,radius:CONTACT_RADIUS,strength:CONTACT_STRENGTH,scope:'opaque-indirect-diffuse',depthSize:[this.width,this.height],size:[this.target.width,this.target.height],occluders:this.occluders,sharedPoseDepth:true,emissionUntouched:true};}
}
