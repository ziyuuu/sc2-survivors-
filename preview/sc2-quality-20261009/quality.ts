import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {ShadowTrial} from './pose-shadow';
import {SceneDepthContactPass} from './depth-contact';
import type {MaterialRepair} from './material-repair';

export class QualityView {
 readonly shadow:ShadowTrial;readonly composer:EffectComposer;readonly ao:SceneDepthContactPass;readonly bloom:UnrealBloomPass;
 private hemi:THREE.HemisphereLight;private key:THREE.DirectionalLight;private fill=new THREE.DirectionalLight(0x8eabbf,.45);private rim=new THREE.DirectionalLight(0xcee2e9,.55);
 private env:THREE.WebGLRenderTarget;private size='';private mode='restored';private baseline:()=>void;
 cameraTarget=new THREE.Vector3(0,0,-1);height=16.5;aoEnabled=true;shadowEnabled=true;shadowResolution=1024;bloomScale=.5;multisample=false;environmentEnabled=false;
 constructor(readonly r:BattleRenderer,readonly materials:MaterialRepair){
  this.hemi=r.scene.children.find(n=>n instanceof THREE.HemisphereLight) as THREE.HemisphereLight;this.key=r.scene.children.find(n=>n instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
  this.fill.position.set(16,12,9);this.rim.position.set(-6,17,-18);r.scene.add(this.fill,this.rim);
  const pmrem=new THREE.PMREMGenerator(r.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  this.shadow=new ShadowTrial(r);this.key.shadow.mapSize.set(this.shadowResolution,this.shadowResolution);Object.assign(this.key.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:.5,far:95});this.key.shadow.camera.updateProjectionMatrix();this.key.shadow.normalBias=.035;this.key.shadow.bias=-.00013;
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.composer=new EffectComposer(r.renderer,target);
  this.ao=new SceneDepthContactPass(r.scene,r.camera);this.ao.kernelRadius=.48;this.ao.maxDistance=.009;this.ao.minDistance=.00018;
  this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.16,.32,1.08);this.composer.addPass(new RenderPass(r.scene,r.camera));this.composer.addPass(this.ao);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  const bridge=r as unknown as {renderScene:()=>void;shadows:THREE.InstancedMesh;health:THREE.InstancedMesh;healthBack:THREE.InstancedMesh;anchor:THREE.Group};this.baseline=bridge.renderScene.bind(r);
  bridge.renderScene=()=>{this.camera();bridge.health.visible=bridge.healthBack.visible=false;bridge.anchor.visible=false;
   if(this.mode==='baseline'){this.baseline();return;}
   this.materials.update();this.shadow.beforeDraw();const width=r.canvas.clientWidth,height=r.canvas.clientHeight,ratio=r.renderer.getPixelRatio(),key=[width,height,ratio].join(':');
   if(key!==this.size){this.size=key;this.composer.setPixelRatio(ratio);this.composer.setSize(width,height);this.ao.setSize(Math.round(width*ratio*.5),Math.round(height*ratio*.5));this.bloom.setSize(Math.round(width*ratio*this.bloomScale),Math.round(height*ratio*this.bloomScale));}
   this.ao.enabled=this.aoEnabled;this.composer.render();
  };
  this.setMode('restored');
 }
 setMultisample(value:boolean){this.multisample=value;for(const target of [this.composer.renderTarget1,this.composer.renderTarget2]){target.samples=value?2:0;target.dispose();}this.size='';}
 setShadowResolution(value:number){this.shadowResolution=value;this.key.shadow.mapSize.set(value,value);this.key.shadow.map?.dispose();this.key.shadow.map=null;}
 setShadows(value:boolean){this.shadowEnabled=value;this.shadow.setEnabled(this.mode!=='baseline'&&value);}
 setBloomScale(value:number){this.bloomScale=value;this.size='';}
 setEnvironment(value:boolean){this.environmentEnabled=value;this.r.scene.environment=this.mode!=='baseline'&&value?this.env.texture:null;}
 camera(){const r=this.r,aspect=r.canvas.clientWidth/r.canvas.clientHeight,h=this.height*(aspect<1?Math.max(1.5,1/aspect):1);r.camera.left=-h*aspect/2;r.camera.right=h*aspect/2;r.camera.top=h/2;r.camera.bottom=-h/2;r.camera.updateProjectionMatrix();r.camera.position.copy(this.cameraTarget).add(new THREE.Vector3(19,28,21));r.camera.lookAt(this.cameraTarget);r.camera.updateMatrixWorld();}
 setMode(mode:string){this.mode=mode;const restored=mode!=='baseline';this.materials.setEnabled(restored);this.shadow.setEnabled(restored&&this.shadowEnabled);this.hemi.color.set(restored?0xafc5d1:0xc1d9e3);this.hemi.groundColor.set(restored?0x35454b:0x473320);this.hemi.intensity=restored?1.6:1.4;this.key.color.set(restored?0xf1e9dc:0xffe0bd);this.key.intensity=restored?1.8:2.4;this.fill.visible=this.rim.visible=restored;this.r.scene.environment=restored&&this.environmentEnabled?this.env.texture:null;this.r.scene.environmentIntensity=.18;this.r.scene.fog=new THREE.FogExp2(restored?0x17252b:0x202326,restored?.002:.009);this.r.renderer.toneMappingExposure=restored?1.05:1;}
 report(){return {mode:this.mode,shadowMap:this.shadowResolution,shadow:this.shadowEnabled,ao:this.aoEnabled,bloom:this.bloom.enabled,bloomScale:this.bloomScale,multisample:this.multisample,environment:this.environmentEnabled,aoSource:'current colour pass depth; reconstructed geometric normal; 12 taps at half resolution',viewHeight:this.height,position:this.r.camera.position.toArray(),target:this.cameraTarget.toArray(),consistentHDR:true};}
}
