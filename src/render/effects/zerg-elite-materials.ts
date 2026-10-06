import * as THREE from 'three';
import type {BattleEffects} from './battle-effects';
import {commitInstances,uploadActive} from '../units/instance-updates';
type P={x:number;y:number;z:number};
const textures={acid:'fx.acid.0',burst:'fx.bile.0',tissue:'fx.bile.4',mist:'fx.hero-upgrade.smoke_wispy11',venom:'fx.baneling.1',claw:'fx.hero-basic.energyplane3',fluid:'fx.hero-basic.emergytrailcyan',glow:'fx.hero-basic.flare2b',dust:'fx.hero-upgrade.smoke_wispy11'} as const;
type Key=keyof typeof textures;
type Batch={mesh:THREE.InstancedMesh;data:THREE.InstancedBufferAttribute;count:number;cells:number};
const obj=new THREE.Object3D(),along=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4(),color=new THREE.Color();
/** Original acid / tissue texture layers. Edges are feathered, never opaque squares or simple circle outlines. */
export class ZergEliteMaterials {
 private batches=new Map<Key,Batch>();private membrane?:THREE.InstancedMesh;private skinCount=0;private ribbons=0;private time=0;private prepared=false;
 constructor(private scene:THREE.Scene,private camera:THREE.Camera,private host:BattleEffects){}
 prepare(){if(this.prepared)return;for(const [key,id] of Object.entries(textures)){const source=this.host.batches.get(id);if(!source)throw Error('Missing original Zerg texture '+id);const old=source.mesh.material as THREE.ShaderMaterial,geometry=new THREE.PlaneGeometry(1,1),data=new THREE.InstancedBufferAttribute(new Float32Array(1024*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('zergParams',data);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:['mist','dust','tissue'].includes(key)?THREE.NormalBlending:THREE.AdditiveBlending,uniforms:{map:{value:old.uniforms.map.value},grid:{value:old.uniforms.grid.value},ribbon:{value:['claw','fluid'].includes(key)?1:0}},
   vertexShader:`attribute vec4 zergParams;uniform vec2 grid;varying vec2 vUv;varying vec2 local;varying vec3 tint;varying vec3 param;void main(){local=uv;vUv=(uv+vec2(mod(zergParams.x,grid.x),grid.y-1.-floor(zergParams.x/grid.x)))/grid;tint=instanceColor;param=zergParams.yzw;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform sampler2D map;uniform float ribbon;varying vec2 vUv;varying vec2 local;varying vec3 tint;varying vec3 param;void main(){vec4 p=texture2D(map,vUv);float lum=max(p.r,max(p.g,p.b));vec3 tex=mix(p.rgb,vec3(lum),param.y);vec2 q=(local-.5)*2.;float radial=pow(max(0.,1.-dot(q,q)),.7);float edge=smoothstep(0.,.07,local.x)*smoothstep(0.,.07,1.-local.x)*smoothstep(0.,.025,local.y)*smoothstep(0.,.025,1.-local.y);float alpha=p.a*edge*mix(radial,1.,ribbon)*smoothstep(.015,.16,lum)*param.x;gl_FragColor=vec4(tex*tint*param.z,alpha);if(alpha<.003)discard;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>}`});
  const mesh=new THREE.InstancedMesh(geometry,material,1024);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,color);mesh.renderOrder=3;this.scene.add(mesh);this.batches.set(key as Key,{mesh,data,count:0,cells:source.cells});
 }
 const tissue=this.batches.get('tissue')!.mesh.material as THREE.ShaderMaterial;const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,uniforms:{map:{value:tissue.uniforms.map.value},time:{value:0}},
  vertexShader:`varying vec2 vUv;varying vec3 eye;varying vec3 norm;varying vec3 tint;void main(){vUv=uv;tint=instanceColor;vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);eye=-p.xyz;norm=normalMatrix*mat3(instanceMatrix)*normal;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform sampler2D map;uniform float time;varying vec2 vUv;varying vec3 eye;varying vec3 norm;varying vec3 tint;void main(){float rim=pow(1.-abs(dot(normalize(eye),normalize(norm))),2.7);float tex=texture2D(map,vUv*1.7+vec2(time*.027,-time*.036)).r;float veins=pow(.5+.5*sin(vUv.x*63.+sin(vUv.y*27.+time)*4.),16.);float cross=pow(.5+.5*sin(vUv.y*51.+sin(vUv.x*31.-time)*2.4),20.);float alpha=.008+rim*(.13+tex*.08)+(veins+cross)*.028;gl_FragColor=vec4(tint*(.38+rim*.45+tex*.2),alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>}`});
 this.membrane=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,3),mat,256);this.membrane.count=0;this.membrane.frustumCulled=false;this.membrane.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.membrane.setColorAt(0,color);this.membrane.renderOrder=3;this.scene.add(this.membrane);this.prepared=true;
 }
 begin(time:number){this.time=time;this.ribbons=0;this.skinCount=0;for(const b of this.batches.values())b.count=0;if(this.membrane)(this.membrane.material as THREE.ShaderMaterial).uniforms.time.value=time;}
 sprite(key:Key,p:P,size:number,tint:number,opacity=.7,frame=0,ground=false,angle=0,aspect=1){obj.position.set(p.x,p.y,p.z);if(ground)obj.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2,0,angle));else {obj.quaternion.copy(this.camera.quaternion);obj.rotateZ(angle);}obj.scale.set(size*aspect,size,1);this.draw(key,tint,opacity,frame);}
 ribbon(key:Key,tail:P,head:P,width:number,tint:number,opacity=.7,frame=0){along.set(head.x-tail.x,head.y-tail.y,head.z-tail.z);const d=along.length();if(d<.001)return;along.divideScalar(d);obj.position.set((head.x+tail.x)/2,(head.y+tail.y)/2,(head.z+tail.z)/2);normal.copy(this.camera.position).sub(obj.position).normalize();across.crossVectors(along,normal).normalize();normal.crossVectors(across,along).normalize();basis.makeBasis(across,along,normal);obj.quaternion.setFromRotationMatrix(basis);obj.scale.set(width,d,1);this.ribbons++;this.draw(key,tint,opacity,frame);}
 skin(p:P,scale:P,tint:number,facing=0){if(!this.membrane||this.skinCount>=256)return;obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,facing,0);obj.scale.set(scale.x,scale.y,scale.z);obj.updateMatrix();this.membrane.setMatrixAt(this.skinCount,obj.matrix);this.membrane.setColorAt(this.skinCount++,color.set(tint));}
 private draw(key:Key,tint:number,opacity:number,frame:number){const b=this.batches.get(key);if(!b||b.count>=1024||opacity<.003)return;obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count,color.set(tint));b.data.setXYZW(b.count++,Math.floor(frame)%b.cells,opacity,1,1);}
 end(){for(const b of this.batches.values()){commitInstances(b.mesh,b.count);uploadActive(b.data,b.count);}if(this.membrane)commitInstances(this.membrane,this.skinCount);}
 reset(){this.begin(0);this.end();}
 report(){return {style:'original-acid-tissue-bone-layering',ribbons:this.ribbons,membranes:this.skinCount,textures:Object.values(textures),batches:[...this.batches].map(([key,b])=>({key,count:b.count,textured:!!(b.mesh.material as THREE.ShaderMaterial).uniforms.map.value}))};}
}
