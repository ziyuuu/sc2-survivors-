import * as THREE from 'three';
import {modelPresentationScale} from '../../src/data/combat-presentation';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShadowTrial} from '../sc2-quality-20261009/pose-shadow';
import {SceneDepthContactPass} from '../sc2-quality-20261009/depth-contact';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {CampaignTheme} from '../../src/data/campaign-map';
const palettes:Record<CampaignTheme,[number,number,number,number,number,number]>={industrial:[0xc0d2df,0x38454d,1.6,0xf5e7d5,1.8,0x283840],'mar-sara':[0xdccbb5,0x5c4633,1.65,0xffe0b6,1.85,0x624c3c],char:[0x9caabc,0x332321,1.55,0xffd4b6,1.55,0x2b2528],ice:[0xc8ddeb,0x758d9c,1.25,0xffefd9,1.5,0xa4baca],frontier:[0xc8d1cf,0x51483e,1.55,0xf9dfb8,1.8,0x464d48]};
export class CandidateView{
 focusId:number|null=null;mode='baseline';theme:CampaignTheme='industrial';height=20;shadow:ShadowTrial;composer:EffectComposer;ao:SceneDepthContactPass;fxaa=new ShaderPass(FXAAShader);bloom:UnrealBloomPass;
 private base:()=>void;private hemi:THREE.HemisphereLight;private light:THREE.DirectionalLight;private fill=new THREE.DirectionalLight(0x9eb9ca,.28);private size='';private materials=new Map<THREE.Material,{compile:THREE.Material['onBeforeCompile'];key:()=>string}>();
 private ambient:THREE.Points;private enabledSurface=false;
 constructor(readonly r:BattleRenderer){
  this.hemi=r.scene.children.find(x=>x instanceof THREE.HemisphereLight) as THREE.HemisphereLight;this.light=r.scene.children.find(x=>x instanceof THREE.DirectionalLight) as THREE.DirectionalLight;this.fill.position.set(14,14,-8);this.fill.visible=false;r.scene.add(this.fill);
  this.shadow=new ShadowTrial(r);const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  this.composer=new EffectComposer(r.renderer,target);this.ao=new SceneDepthContactPass(r.scene,r.camera);this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.16,.32,1.08);
  this.composer.addPass(new RenderPass(r.scene,r.camera));this.composer.addPass(this.ao);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());this.composer.addPass(this.fxaa);
  const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const at=(y*32+x)*4;pixels[at]=pixels[at+1]=pixels[at+2]=255;pixels[at+3]=Math.round(Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5))**2*255);}
  const texture=new THREE.DataTexture(pixels,32,32);texture.needsUpdate=true;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(60*3),3));this.ambient=new THREE.Points(geo,new THREE.PointsMaterial({map:texture,size:.14,transparent:true,opacity:.32,depthWrite:false,color:0xd7d2c4}));this.ambient.visible=false;this.ambient.frustumCulled=false;r.scene.add(this.ambient);
  const p=r as unknown as {renderScene:()=>void};this.base=p.renderScene.bind(r);p.renderScene=()=>this.draw();this.set('baseline','industrial');
 }
 set(mode:string,theme:CampaignTheme){
  this.mode=mode;this.theme=theme;const lit=['lighting','combined','composition'].includes(mode),p=palettes[theme];
  this.hemi.color.set(lit?p[0]:0xc1d9e3);this.hemi.groundColor.set(lit?p[1]:0x473320);this.hemi.intensity=lit?p[2]:1.4;this.light.color.set(lit?p[3]:0xffe0bd);this.light.intensity=lit?p[4]:2.4;this.fill.visible=lit;
  this.r.scene.fog=new THREE.FogExp2(lit?p[5]:0x202326,lit?.005:.009);this.r.renderer.toneMappingExposure=1;
  this.shadow.setEnabled(['shadow','contact','combined'].includes(mode));this.enabledSurface=['surface','combined','composition'].includes(mode);this.ambient.visible=['atmosphere','combined','composition'].includes(mode);
  for(const [m,original] of this.materials){m.onBeforeCompile=original.compile;m.customProgramCacheKey=original.key;m.needsUpdate=true;}this.materials.clear();this.patchGround();
 }
 patchGround(){
  const ground=this.r.scene.getObjectByName('campaign-traversable-ground') as THREE.Mesh;if(!ground||!this.enabledSurface)return;
  const m=ground.material as THREE.Material;if(this.materials.has(m))return;const compile=m.onBeforeCompile,key=m.customProgramCacheKey.bind(m);this.materials.set(m,{compile,key});
  m.onBeforeCompile=(s,renderer)=>{compile.call(m,s,renderer);s.fragmentShader=s.fragmentShader.replace('diffuseColor.rgb*=groundColor*field.a','float vpMacro=.5+.28*sin(vMapUv.x*71.0+sin(vMapUv.y*31.0))+.22*sin(vMapUv.y*53.0+vMapUv.x*19.0);groundColor*=mix(.90,1.07,vpMacro);diffuseColor.rgb*=groundColor*field.a').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(.5-vpMacro)*.16,.3,1.0);');};m.customProgramCacheKey=()=>key()+':plan-surface-v1';m.needsUpdate=true;
 }
 draw(){
  const r=this.r,w=r.canvas.clientWidth,h=r.canvas.clientHeight,aspect=w/h,u=this.focusId===null?null:r.world.entities.get(this.focusId),body=u?(r.gpu.get((r as any).modelKey(u))?.bodyHeight??1)*modelPresentationScale(u):0,height=u?Math.max(4.5,u.unitRadius*6,body*1.75):this.height,view=height*(aspect<1?Math.max(1.4,1/aspect):1);r.camera.left=-view*aspect/2;r.camera.right=view*aspect/2;r.camera.top=view/2;r.camera.bottom=-view/2;r.camera.updateProjectionMatrix();if(u){const p=new THREE.Vector3(u.x,(u.flying?5.6:r.world.terrain!.height(u))+body*.5,u.z);r.camera.position.copy(p).add(new THREE.Vector3(0,34,26));r.camera.lookAt(p);}if(!u&&this.mode==='composition'){const c=r.world.anchor,p=new THREE.Vector3(c.x,r.world.terrain!.height(c),c.z-2);r.camera.position.copy(p).add(new THREE.Vector3(0,34,20));r.camera.lookAt(p);}r.camera.updateMatrixWorld();
  this.patchGround();if(this.ambient.visible){const a=this.ambient.geometry.getAttribute('position'),t=r.world.time,c=r.world.anchor;for(let i=0;i<a.count;i++){const phase=(i*.61803398875)%1,x=(i*17.319)%32-16,z=(i*9.761)%24-12;a.setXYZ(i,c.x+x+Math.sin(t*.18+i)*.55,this.theme==='ice'?6-((t*.55+phase*6)%6):.3+((t*.18+phase*5)%5),c.z+z+Math.cos(t*.13+i)*.6);}a.needsUpdate=true;const m=this.ambient.material as THREE.PointsMaterial;m.color.set(this.theme==='char'?0xd9854e:this.theme==='ice'?0xe2eef7:0xc5bba2);m.size=this.theme==='ice'?.12:.18;}
  this.shadow.beforeDraw();const originalBloom=(r as any).heroComposer.passes.find((p:any)=>p instanceof UnrealBloomPass);if(originalBloom)originalBloom.enabled=this.mode!=='no-bloom';
  if(this.mode==='direct')r.renderer.render(r.scene,r.camera);
  else if(['contact','combined','fxaa','msaa4'].includes(this.mode)){this.ao.enabled=['contact','combined'].includes(this.mode);this.bloom.enabled=[...r.world.entities.values()].some(x=>x.hp>0&&x.heroId);this.fxaa.enabled=this.mode!=='msaa4';const samples=this.mode==='msaa4'?Math.min(4,r.renderer.capabilities.maxSamples):0;for(const target of [this.composer.renderTarget1,this.composer.renderTarget2])if(target.samples!==samples){target.samples=samples;target.dispose();}const ratio=r.renderer.getPixelRatio(),size=[w,h,ratio].join(':');if(size!==this.size){this.size=size;this.composer.setPixelRatio(ratio);this.composer.setSize(w,h);this.ao.setSize(Math.round(w*ratio*.5),Math.round(h*ratio*.5));this.bloom.setSize(Math.round(w*ratio*.5),Math.round(h*ratio*.5));this.fxaa.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio));}this.composer.render();}
  else this.base();
 }
 report(){return {mode:this.mode,theme:this.theme,viewHeight:this.height,focusId:this.focusId,shadow:this.shadow.report(),contact:['contact','combined'].includes(this.mode),surface:this.enabledSurface,ambient:this.ambient.visible,ambientCount:60,palettes:this.mode==='lighting'||this.mode==='combined'?palettes[this.theme]:null,composition:this.mode==='composition',aa:this.mode==='msaa4'?'MSAA4':this.mode==='fxaa'?'FXAA':'native',cameraBodyHeightFraming:true,prototype:true,changesSimulation:false};}
}
