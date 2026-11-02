import * as THREE from 'three';
import {Pass,FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {DISPLACEMENT_LAYER,displacementFrame} from '../effects/source/displacement';
import {waitForAsset,ASSET_REQUEST_TIMEOUT} from '../../assets/preparation-wait';
import {cloneForPreparation} from './preparation-clone';

/** Linear HDR refraction precedes bloom and the single ACES/sRGB output.
 * The signed field is depth-tested against the beauty image, never its own
 * framebuffer. No capture of a previous frame, no simulation or wall clock. */
export class ScreenRefraction extends Pass {
 private field=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 private material=new THREE.ShaderMaterial({uniforms:{color:{value:null},field:{value:this.field.texture},depth:{value:null}},depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv;uniform sampler2D color;uniform sampler2D field;uniform sampler2D depth;void main(){ivec2 pixel=ivec2(gl_FragCoord.xy);vec2 shift=texelFetch(field,pixel,0).xy;vec2 at=clamp(vUv+shift,vec2(0.0),vec2(1.0));bool unchanged=dot(shift,shift)==0.0||texture2D(depth,at).r+0.000001<texelFetch(depth,pixel,0).r;gl_FragColor=unchanged?texelFetch(color,pixel,0):texture2D(color,at);}'});
 private quad=new FullScreenQuad(this.material);private active=0;
 private preparations=new Set<AbortController>();
 invalidatePreparation(){for(const pending of this.preparations)pending.abort();}
 constructor(private scene:THREE.Scene,private camera:THREE.Camera){super();this.needsSwap=false;}
 setEnabled(enabled:boolean){this.enabled=enabled;this.active=0;this.needsSwap=false;this.material.uniforms.field.value=enabled?this.field.texture:null;if(!enabled){this.material.uniforms.color.value=null;this.material.uniforms.depth.value=null;this.field.dispose();}}
 override setSize(width:number,height:number){this.field.setSize(width,height);}
 /** Exercise the compositor even when the entrance has no live effect. The
  * required lighting gate repeats this after context loss before publishing ready. */
 prepareComposite(renderer:THREE.WebGLRenderer){
  if(!this.enabled)return;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false}),previous=renderer.getRenderTarget(),uniforms=this.material.uniforms;
  const saved={color:uniforms.color.value,field:uniforms.field.value,depth:uniforms.depth.value};
  const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1),zero=new THREE.DataTexture(new Uint8Array(4),1,1);white.needsUpdate=zero.needsUpdate=true;
  try{renderer.initRenderTarget(this.field);uniforms.color.value=uniforms.depth.value=white;uniforms.field.value=zero;renderer.setRenderTarget(target);this.quad.render(renderer);}
  finally{uniforms.color.value=saved.color;uniforms.field.value=saved.field;uniforms.depth.value=saved.depth;renderer.setRenderTarget(previous);target.dispose();white.dispose();zero.dispose();}
 }
 async prepare(renderer:THREE.WebGLRenderer,root:THREE.Object3D,control:{cancelled?:()=>boolean;signal?:AbortSignal;timeoutMs?:number}={}){
  const stopped=()=>!!control.signal?.aborted||!!control.cancelled?.()||renderer.getContext().isContextLost();
  if(stopped())throw Error('折射画面准备已取消或上下文失效');
  // Three's pending compiler polls material registrations after returning.
  // Private registrations can be disposed on failure without touching live
  // materials; a late compiler result has no render/publish continuation.
  const prepared=cloneForPreparation(root),camera=this.camera.clone();camera.layers.set(DISPLACEMENT_LAYER);
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false}),controller=new AbortController();
  this.preparations.add(controller);const abort=()=>controller.abort();control.signal?.addEventListener('abort',abort,{once:true});
  let poll:ReturnType<typeof setTimeout>|undefined;
  const check=()=>{if(stopped())controller.abort();else poll=setTimeout(check,16);};check();
  try{
   const previous=renderer.getRenderTarget();let pending:Promise<unknown>;
   try{renderer.setRenderTarget(target);pending=renderer.compileAsync(prepared.root,camera);}finally{renderer.setRenderTarget(previous);}
   await waitForAsset(pending,'折射着色器编译',control.timeoutMs??ASSET_REQUEST_TIMEOUT,controller.signal);
   if(controller.signal.aborted||stopped())throw Error('折射画面准备已取消或上下文失效');
   const old=renderer.getRenderTarget(),depth=displacementFrame.depth.value,size=displacementFrame.size.value.clone(),white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
   // The successful live draw acquires the warmed programs before the private
   // registrations are retired, preserving prewarming and original effects.
   try{displacementFrame.depth.value=white;displacementFrame.size.value.set(1,1);renderer.setRenderTarget(target);renderer.render(root,camera);}
   finally{displacementFrame.depth.value=depth;displacementFrame.size.value.copy(size);renderer.setRenderTarget(old);white.dispose();}
  }finally{clearTimeout(poll);control.signal?.removeEventListener('abort',abort);this.preparations.delete(controller);prepared.dispose();target.dispose();}
 }
 override render(renderer:THREE.WebGLRenderer,write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget){
  if(!this.enabled){this.active=0;this.needsSwap=false;return;}
  this.active=0;this.scene.traverseVisible(n=>{if(n instanceof THREE.Mesh&&n.userData.displacement&&(!(n instanceof THREE.InstancedMesh)||n.count>0))this.active++;});
  this.needsSwap=this.active>0;if(!this.active)return;
  if(!read.depthTexture)throw Error('Original refraction requires current scene depth');
  const mask=this.camera.layers.mask,background=this.scene.background,target=renderer.getRenderTarget(),autoClear=renderer.autoClear,color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
  try{
   displacementFrame.depth.value=read.depthTexture;displacementFrame.size.value.set(read.width,read.height);
   this.camera.layers.set(DISPLACEMENT_LAYER);this.scene.background=null;renderer.setRenderTarget(this.field);renderer.setClearColor(0,0);renderer.autoClear=true;renderer.render(this.scene,this.camera);
   this.material.uniforms.color.value=read.texture;this.material.uniforms.depth.value=read.depthTexture;renderer.setRenderTarget(this.renderToScreen?null:write);this.quad.render(renderer);
  }finally{this.camera.layers.mask=mask;this.scene.background=background;renderer.autoClear=autoClear;renderer.setClearColor(color,alpha);renderer.setRenderTarget(target);}
 }
 report(){return {enabled:this.enabled,activeSurfaces:this.active,width:this.field.width,height:this.field.height,format:'signed-half-float',strengthUnits:'render-pixels',clientAmplitudeCalibrated:false};}
 override dispose(){this.invalidatePreparation();this.field.dispose();this.material.dispose();this.quad.dispose();}
}
