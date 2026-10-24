import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {BattleEffects} from './battle-effects';
import {lowDangerState,type LowDanger} from './low-danger-state';

type Patch={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;signature:string;danger:LowDanger};
/** One static frame of the original acid texture, projected onto the real ground.
 * The plane is only a texture carrier: no rings, outlines, volumes or solid fill. */
export class LowDangerEffects {
 private root=new THREE.Group();private patches=new Map<string,Patch>();private material?:THREE.ShaderMaterial;private terrain:World['terrain'];
 constructor(scene:THREE.Scene,private fx:BattleEffects){this.root.name='low-original-texture-danger';this.root.visible=false;scene.add(this.root);}
 setEnabled(value:boolean){this.root.visible=value;}
 prepare(){
  if(this.material)return;const source=this.fx.batches.get('fx.acid.0');if(!source)throw Error('Missing original danger texture');
  const original=source.mesh.material as THREE.ShaderMaterial;
  this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
   uniforms:{map:original.uniforms.map,grid:original.uniforms.grid,shape:{value:0},radius:{value:1},range:{value:0},caps:{value:1}},
   vertexShader:'varying vec2 local;varying vec2 tex;void main(){local=position.xz;tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`uniform sampler2D map;uniform vec2 grid;uniform float shape;uniform float radius;uniform float range;uniform float caps;varying vec2 local;varying vec2 tex;
    void main(){float distanceTo=shape<.5?length(local):shape<1.5?length(vec2(local.x,local.y-clamp(local.y,0.,range))):length(local);
     if(distanceTo>radius||(shape>1.5&&abs(atan(local.x,local.y))>.6)||(shape>.5&&shape<1.5&&caps<.5&&(local.y<0.||local.y>range)))discard;
     vec2 atlas=(tex+vec2(mod(7.,grid.x),grid.y-1.-floor(7./grid.x)))/grid;
     vec4 ink=texture2D(map,atlas);float lum=max(ink.r,max(ink.g,ink.b));float alpha=ink.a*smoothstep(.02,.14,lum)*.72;
     if(alpha<.015)discard;gl_FragColor=vec4(vec3(1.,.54,.2)*(.55+.45*lum),alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  this.material.name='original-acid-danger-decal';this.material.userData.visualRole='effect';
 }
 render(w:World,_visible:(p:Point)=>boolean){
  if(!this.material)return;if(this.terrain!==w.terrain){this.reset();this.terrain=w.terrain;}
  const active=new Set<string>();
  for(const d of lowDangerState(w)){
   active.add(d.key);const signature=[d.point.x,d.point.z,d.radius,d.length,d.angle,d.kind,d.caps].join(':');let patch=this.patches.get(d.key);
   if(!patch){const material=new THREE.ShaderMaterial({vertexShader:this.material.vertexShader,fragmentShader:this.material.fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,
     uniforms:{map:this.material.uniforms.map,grid:this.material.uniforms.grid,shape:{value:0},radius:{value:1},range:{value:0},caps:{value:1}}});
    material.name=this.material.name;material.userData.visualRole='effect';
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,12,12),material);mesh.name='native-danger:'+d.key;mesh.renderOrder=3;mesh.userData.visualRole='effect';mesh.raycast=()=>{};this.root.add(mesh);patch={mesh,signature:'',danger:d};this.patches.set(d.key,patch);}
   if(patch.signature!==signature){
    const mesh=patch.mesh,width=d.radius*2,depth=d.kind==='lane'?d.length+2*d.radius:d.radius*2,offset=d.kind==='lane'?d.length/2:0,positions=mesh.geometry.attributes.position,c=Math.cos(d.angle),s=Math.sin(d.angle),height=w.terrain?.height(d.point)??0;
    for(let i=0;i<positions.count;i++){const uv=mesh.geometry.attributes.uv,x=(uv.getX(i)-.5)*width,z=(.5-uv.getY(i))*depth+offset,world={x:d.point.x+x*c+z*s,z:d.point.z-x*s+z*c};positions.setXYZ(i,x,(w.terrain?.height(world)??0)-height+.045,z);}
    positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.position.set(d.point.x,height,d.point.z);mesh.rotation.y=d.angle;
    mesh.material.uniforms.shape.value=d.kind==='area'?0:d.kind==='lane'?1:2;mesh.material.uniforms.radius.value=d.radius;mesh.material.uniforms.range.value=d.length;mesh.material.uniforms.caps.value=d.caps===false?0:1;
    patch.signature=signature;patch.danger=d;
   }
  }
  for(const [key,p]of this.patches)if(!active.has(key)){this.release(p);this.patches.delete(key);}
 }
 private release(p:Patch){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.material.dispose();}
 reset(){for(const p of this.patches.values())this.release(p);this.patches.clear();}
 report(){return {enabled:this.root.visible,texture:'fx.acid.0',frame:7,animated:false,geometryMarkers:0,patches:[...this.patches.values()].map(p=>p.danger)};}
}
