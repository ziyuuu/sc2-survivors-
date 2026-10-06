import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {CampaignTheme} from '../../src/data/campaign-map';
import {sourcePhong,type SourceProfile} from './source-materials';

const palettes:Record<CampaignTheme,{ambient:number;ground:number;key:number;fill:number;back:number;fog:number}>={
 industrial:{ambient:0xa8c0ce,ground:0x443831,key:0xffe6c6,fill:0x91b3cf,back:0xb8cedb,fog:0x232b2e},
 'mar-sara':{ambient:0xc0c3c2,ground:0x68492c,key:0xffe4bb,fill:0xabbfd2,back:0xe8c89a,fog:0x42332a},
 char:{ambient:0x9cabb8,ground:0x613221,key:0xffc693,fill:0xa5b7d3,back:0xd98858,fog:0x211b1a},
 ice:{ambient:0xb0d0e2,ground:0x78828b,key:0xffefdb,fill:0x92bddb,back:0xcceafa,fog:0x75828b},
 frontier:{ambient:0xb1bebc,ground:0x615142,key:0xffdba9,fill:0x91b0c8,back:0xdfc49a,fog:0x2c2b28}
};
type Assignment={mesh:THREE.InstancedMesh;original:THREE.Material|THREE.Material[];phong:THREE.Material|THREE.Material[]};
export class LightingTrial {
 private hemi:THREE.HemisphereLight;private key:THREE.DirectionalLight;private fill:THREE.DirectionalLight;private back:THREE.DirectionalLight;
 private baseline:{hemi:number;sky:THREE.Color;ground:THREE.Color;key:number;keyColor:THREE.Color;fog:THREE.FogExp2};
 private environment:THREE.WebGLRenderTarget;private bodies:Assignment[]=[];
 mode:'base'|'pbr'|'phong'='base';
 constructor(private r:BattleRenderer,private theme:CampaignTheme,profile:SourceProfile){
  this.hemi=r.scene.children.find(n=>n instanceof THREE.HemisphereLight) as THREE.HemisphereLight;this.key=r.scene.children.find(n=>n instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
  this.baseline={hemi:this.hemi.intensity,sky:this.hemi.color.clone(),ground:this.hemi.groundColor.clone(),key:this.key.intensity,keyColor:this.key.color.clone(),fog:(r.scene.fog as THREE.FogExp2).clone()};
  this.fill=new THREE.DirectionalLight(0xffffff,0);this.fill.position.set(20,14,16);this.back=new THREE.DirectionalLight(0xffffff,0);this.back.position.set(7,20,-25);this.fill.visible=this.back.visible=false;r.scene.add(this.fill,this.back);
  const pmrem=new THREE.PMREMGenerator(r.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  for(const [key,batch] of r.gpu){const source=profile.bodyProfiles.find(p=>p.id==='model.'+key);if(!source?.materials)continue;for(const mesh of batch.meshes){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   if(!mats.every(m=>m instanceof THREE.MeshStandardMaterial&&m.userData.sc2?.role==='body'))continue;
   const converted=mats.map(m=>{const sourceMat=source.materials!.find(s=>s.name===m.name);return sourceMat?sourcePhong(m as THREE.MeshStandardMaterial,sourceMat):m;});this.bodies.push({mesh,original:mesh.material,phong:Array.isArray(mesh.material)?converted:converted[0]});
  }}
 }
 setMode(mode:'base'|'pbr'|'phong'){
  this.mode=mode;for(const b of this.bodies)b.mesh.material=mode==='phong'?b.phong:b.original;
  if(mode==='base'){
   this.hemi.intensity=this.baseline.hemi;this.hemi.color.copy(this.baseline.sky);this.hemi.groundColor.copy(this.baseline.ground);this.key.intensity=this.baseline.key;this.key.color.copy(this.baseline.keyColor);this.fill.intensity=this.back.intensity=0;this.fill.visible=this.back.visible=false;this.r.scene.environment=null;this.r.scene.fog=this.baseline.fog.clone();this.r.renderer.toneMappingExposure=1;
  }else{
   const p=palettes[this.theme];this.hemi.color.set(p.ambient);this.hemi.groundColor.set(p.ground);this.hemi.intensity=.75;this.key.color.set(p.key);this.key.intensity=2.4;this.fill.visible=this.back.visible=true;this.fill.color.set(p.fill);this.fill.intensity=.5;this.back.color.set(p.back);this.back.intensity=.65;
   this.r.scene.environment=mode==='pbr'?this.environment.texture:null;this.r.scene.environmentIntensity=.22;this.r.scene.fog=new THREE.FogExp2(p.fog,.007);this.r.renderer.toneMappingExposure=1;
  }
 }
 report(){return {mode:this.mode,bodyMaterialsWithSourceSpecular:this.bodies.length,environment:this.mode==='pbr'?'neutral RoomEnvironment, authored reference, not native SC2 skybox':'none',exposure:1,auxiliaryOrHeroEmissionChanged:false};}
}
