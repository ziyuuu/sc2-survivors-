import * as THREE from 'three';
import type {BattleEffects} from './battle-effects';
import {commitInstances,uploadActive} from '../units/instance-updates';
import type {Point3} from '../../simulation/combat/hero-attack-upgrades';
import {createFlameFanGeometry,KNIGHT_FLAME_ARC} from './terran-flame-fan';

type Batch={mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;cells:number};
const object=new THREE.Object3D(),along=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),observedAlong=new THREE.Vector3(),basis=new THREE.Matrix4(),color=new THREE.Color();
const sources={trace:'fx.hero-basic.kenney-trace_05',arc:'fx.hero-basic.energyplane3',warmTrail:'fx.hero-basic.emergytrailorange',glow:'fx.hero-basic.flare2b',fireTrail:'fx.hero-basic.firestreak7',fire:'fx.hero-basic.fireanim_x4',smoke:'fx.hero-upgrade.smoke_wispy11',smokeLit:'fx.hero-upgrade.newsmoke01',electric:'fx.hero-basic.emergytrailcyan',plasma:'fx.hero-skill.nebulacloudsalphaparticle_purple',spark:'fx.hero-basic.sparks4'} as const;
export type UpgradeMaterial=keyof typeof sources;

/** Dedicated elite overlays; original hero materials are kept untouched. */
export class TerranEliteMaterials {
 private batches=new Map<UpgradeMaterial,Batch>();
 private thermal?:THREE.ShaderMaterial;
 private fan?:{mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;maxRadius:number};
 private ribbonCount=0;private minimumAlignment=1;
 constructor(private scene:THREE.Scene,private camera:THREE.Camera,private host:BattleEffects){}
 prepare(){for(const [name,id] of Object.entries(sources)){
  const source=this.host.batches.get(id);if(!source)throw Error('Missing upgrade material '+id);
  const original=source.mesh.material as THREE.ShaderMaterial,geometry=new THREE.PlaneGeometry(1,1),capacity=['trace','electric','arc'].includes(name)?2048:512;
  const data=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('upgradeParams',data);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:name.startsWith('smoke')?THREE.NormalBlending:THREE.AdditiveBlending,uniforms:{map:{value:original.uniforms.map.value},grid:{value:original.uniforms.grid.value},smokePass:{value:name.startsWith('smoke')?1:0},filamentPass:{value:name==='arc'?1:0}},
   vertexShader:`attribute vec4 upgradeParams;varying vec2 vUv;varying vec2 localUv;varying vec3 vColor;varying vec3 vParams;uniform vec2 grid;
    void main(){float f=upgradeParams.x;localUv=uv;vUv=(uv+vec2(mod(f,grid.x),grid.y-1.0-floor(f/grid.x)))/grid;vColor=instanceColor;vParams=upgradeParams.yzw;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
   fragmentShader:`uniform sampler2D map;uniform float smokePass;uniform float filamentPass;varying vec2 vUv;varying vec2 localUv;varying vec3 vColor;varying vec3 vParams;
    void main(){vec4 p=texture2D(map,vUv);float lum=max(p.r,max(p.g,p.b));vec3 tex=mix(p.rgb,vec3(lum),vParams.y);
     float edge=smoothstep(0.0,0.1,localUv.x)*smoothstep(0.0,0.1,1.0-localUv.x)*smoothstep(0.0,0.045,localUv.y)*smoothstep(0.0,0.045,1.0-localUv.y);
     vec2 radial=(localUv-.5)*2.;float feather=pow(max(0.,1.-dot(radial,radial)),.65);gl_FragColor=vec4(tex*vColor*vParams.z,p.a*edge*feather*vParams.x*mix(smoothstep(.025,.16,lum),smoothstep(0.03,0.65,lum),smokePass));
     if(filamentPass>0.5){float d=abs(localUv.x-0.5)*2.0;float aa=max(fwidth(d),0.02);float core=1.0-smoothstep(0.13-aa,0.13+aa,d);float halo=exp(-d*d*9.0)*0.2;float ends=smoothstep(0.0,0.1,localUv.y)*smoothstep(0.0,0.1,1.0-localUv.y);float grain=0.72+0.28*lum;
      gl_FragColor=vec4(mix(vColor,vec3(1.0),core*0.18)*vParams.z,(core+halo)*grain*ends*vParams.x);}if(gl_FragColor.a<0.003)discard;
     #include <tonemapping_fragment>
     #include <colorspace_fragment>}`});
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,color.set(0xffffff));mesh.renderOrder=name.startsWith('smoke')?2:3;this.scene.add(mesh);this.batches.set(name as UpgradeMaterial,{mesh,data,count:0,cells:source.cells});
 }
 const tile=this.host.batches.get('fx.hero-upgrade.firetile4');if(!tile)throw Error('Missing original firetile4');const map=((tile.mesh.material as THREE.ShaderMaterial).uniforms.map.value as THREE.Texture).clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.needsUpdate=true;
 this.thermal=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{map:{value:map},time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D map;uniform float time;varying vec2 vUv;void main(){vec3 fire=texture2D(map,vec2(vUv.x*1.4+time*0.23,vUv.y*1.7-time*2.5)).rgb;float heat=max(fire.r,max(fire.g,fire.b));float hot=smoothstep(0.23,0.85,heat);float taper=smoothstep(0.0,0.11,vUv.y)*smoothstep(0.0,0.11,1.0-vUv.y);vec3 glow=mix(vec3(0.9,0.035,0.006),vec3(1.4,0.42,0.045),hot);glow=mix(glow,vec3(1.8,1.15,0.48),smoothstep(0.65,1.0,heat)*0.7);gl_FragColor=vec4(glow,(0.55+hot*0.35)*taper);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>}`});
 const fanGeometry=createFlameFanGeometry(),fanData=new THREE.InstancedBufferAttribute(new Float32Array(128*4),4).setUsage(THREE.DynamicDrawUsage);fanGeometry.setAttribute('fanParams',fanData);
 const fanMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,uniforms:{map:{value:map},time:{value:0}},
  vertexShader:`attribute vec4 fanParams;uniform float time;varying vec2 vUv;varying float opacity;varying float phase;
   void main(){vUv=uv;opacity=fanParams.x;phase=fanParams.y;vec3 p=position;p.y=(sin(uv.x*22.+time*12.+phase)*.08+sin(uv.y*17.-time*16.)*.06)*uv.y;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform sampler2D map;uniform float time;varying vec2 vUv;varying float opacity;varying float phase;
   void main(){vec3 t=texture2D(map,vec2(vUv.x*3.3+time*.12+phase*.01,vUv.y*2.7-time*1.7)).rgb;
    vec3 fine=texture2D(map,vec2(vUv.x*6.1-time*.17,vUv.y*4.9-time*2.1+phase*.04)).rgb;
    float heat=clamp(max(t.r,max(t.g,t.b))*.65+max(fine.r,max(fine.g,fine.b))*.35,0.,1.);
    float sides=smoothstep(0.,.025,vUv.x)*smoothstep(0.,.025,1.-vUv.x),rim=smoothstep(0.,.06,1.-vUv.y);
    float plume=.6+.4*smoothstep(.12,.85,heat),root=.6+.4*smoothstep(0.,.12,vUv.y);
    vec3 rgb=mix(vec3(.8,.045,.008),vec3(1.1,.42,.065),smoothstep(.05,.65,heat));rgb=mix(rgb,vec3(1.3,.91,.36),smoothstep(.5,.96,heat)*.58);
    gl_FragColor=vec4(rgb,opacity*sides*rim*root*plume);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>}`});
 const fanMesh=new THREE.InstancedMesh(fanGeometry,fanMaterial,128);fanMesh.count=0;fanMesh.frustumCulled=false;fanMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fanMesh.renderOrder=3;this.scene.add(fanMesh);this.fan={mesh:fanMesh,data:fanData,count:0,maxRadius:0};
 }
 burningCore(time:number){if(!this.thermal)throw Error('Burning surface not prepared');this.thermal.uniforms.time.value=time;return this.thermal;}
 begin(time=0){for(const b of this.batches.values())b.count=0;this.ribbonCount=0;this.minimumAlignment=1;if(this.fan){this.fan.count=0;this.fan.maxRadius=0;(this.fan.mesh.material as THREE.ShaderMaterial).uniforms.time.value=time;}}
 flameFan(origin:Point3,facing:number,radius:number,opacity:number,phase=0){const fan=this.fan;if(!fan||fan.count>=128||radius<=0||opacity<=.001)return;object.position.set(origin.x,origin.y,origin.z);object.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),facing);object.scale.set(radius,1,radius);object.updateMatrix();fan.mesh.setMatrixAt(fan.count,object.matrix);fan.data.setXYZW(fan.count++,opacity,phase,0,0);fan.maxRadius=Math.max(fan.maxRadius,radius);}
 ribbon(key:UpgradeMaterial,tail:Point3,head:Point3,width:number,tint:number,opacity=1,frame=0,neutralize=true,intensity=1){
  along.set(head.x-tail.x,head.y-tail.y,head.z-tail.z);const length=along.length();if(length<.001)return;along.divideScalar(length);object.position.set((tail.x+head.x)/2,(tail.y+head.y)/2,(tail.z+head.z)/2);
  normal.copy(this.camera.position).sub(object.position).normalize();across.crossVectors(along,normal).normalize();normal.crossVectors(across,along).normalize();basis.makeBasis(across,along,normal);object.quaternion.setFromRotationMatrix(basis);object.scale.set(width,length,1);observedAlong.set(0,1,0).applyQuaternion(object.quaternion);this.minimumAlignment=Math.min(this.minimumAlignment,observedAlong.dot(along));this.ribbonCount++;this.draw(key,tint,opacity,frame,neutralize,intensity);
 }
 sprite(key:UpgradeMaterial,p:Point3,size:number,tint:number,opacity=1,frame=0,angle=0,neutralize=false,intensity=1){object.position.set(p.x,p.y,p.z);object.quaternion.copy(this.camera.quaternion);object.rotateZ(angle);object.scale.set(size,size,1);this.draw(key,tint,opacity,frame,neutralize,intensity);}
 private draw(key:UpgradeMaterial,tint:number,opacity:number,frame:number,neutralize:boolean,intensity:number){
  const b=this.batches.get(key);if(!b||b.count>=b.mesh.instanceMatrix.count||opacity<=.001)return;if(key==='fire'||key==='fireTrail'||key==='arc'){normal.copy(this.camera.position).sub(object.position).normalize();object.position.addScaledVector(normal,key==='arc'?.06:.12);}object.updateMatrix();b.mesh.setMatrixAt(b.count,object.matrix);b.mesh.setColorAt(b.count,color.set(tint));b.data.setXYZW(b.count++,Math.max(0,Math.min(b.cells-1,Math.floor(frame))),opacity,neutralize?1:0,intensity);
 }
 end(){for(const b of this.batches.values()){commitInstances(b.mesh,b.count);uploadActive(b.data,b.count);}if(this.fan){commitInstances(this.fan.mesh,this.fan.count);uploadActive(this.fan.data,this.fan.count);}}
 reset(){this.begin();this.end();}
 report(){return {style:'elite-original-texture-feathered-overlays',burningTexture:'fx.hero-upgrade.firetile4',flameFan:{layers:this.fan?.count??0,arcDegrees:KNIGHT_FLAME_ARC,maxRadius:this.fan?.maxRadius??0,filled:true,texture:'fx.hero-upgrade.firetile4'},ribbonOrientation:{count:this.ribbonCount,minimumAlignment:this.minimumAlignment},batches:[...this.batches].map(([key,b])=>({key,count:b.count,capacity:b.mesh.instanceMatrix.count,geometry:b.mesh.geometry.type,textured:!!(b.mesh.material as THREE.ShaderMaterial).uniforms.map.value})),materials:Object.values(sources)};}
}
