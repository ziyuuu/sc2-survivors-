import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {EnemySpecials} from '../../simulation/combat/enemy-specials';
import type {BattleEffects} from './battle-effects';

type Zone=EnemySpecials['acidZones'][number];
type Patch={root:THREE.Group;geometry:THREE.BufferGeometry;radius:number;point:Point;phase:number;fade:number};
/** Expiry is already encoded by the native remaining ticks; no presentation clock enters a save. */
export const acidZoneExpiry=(zone:Zone)=>zone.nextTick+zone.ticks-1;
export const acidZoneKey=(zone:Zone)=>[zone.source,zone.point.x.toFixed(6),zone.point.z.toFixed(6),zone.radius,acidZoneExpiry(zone).toFixed(6)].join(':');
export function acidZonePhase(key:string){let value=2166136261;for(const char of key)value=Math.imul(value^char.charCodeAt(0),16777619);return (value>>>0)/4294967296*Math.PI*2;}

/** Original acid/tissue pixels on the actual terrain, with no outline or synthetic damage state. */
export class AcidGroundEffects {
 private patches=new Map<string,Patch>();private materials:THREE.ShaderMaterial[]=[];private terrain:World['terrain'];private time=0;
 constructor(private scene:THREE.Scene,private fx:BattleEffects){}
 prepare(){
  if(this.materials.length)return;
  for(const [index,id]of ['fx.bile.4','fx.acid.0'].entries()){
   const source=this.fx.batches.get(id);if(!source)throw Error('Missing original acid layer '+id);
   const original=source.mesh.material as THREE.ShaderMaterial;
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:index?THREE.AdditiveBlending:THREE.NormalBlending,
    uniforms:{map:original.uniforms.map,grid:original.uniforms.grid,frame:{value:0},angle:{value:0},fade:{value:1},opacity:{value:index?.32:.64},tint:{value:new THREE.Color(index?0xb8cb70:0x758d45)}},
    vertexShader:'varying vec2 local;void main(){local=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform sampler2D map;uniform vec2 grid;uniform float frame;uniform float angle;uniform float fade;uniform float opacity;uniform vec3 tint;varying vec2 local;
     void main(){vec2 p=(local-.5)*2.;float edge=pow(max(0.,1.-dot(p,p)),.7);float s=sin(angle),c=cos(angle);vec2 uv=mat2(c,-s,s,c)*(local-.5)+.5;
      float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);vec2 atlas=(clamp(uv,0.,1.)+vec2(mod(frame,grid.x),grid.y-1.-floor(frame/grid.x)))/grid;
      vec4 tex=texture2D(map,atlas);float lum=max(tex.r,max(tex.g,tex.b));float alpha=tex.a*edge*inside*smoothstep(.015,.16,lum)*fade*opacity;if(alpha<.003)discard;
      gl_FragColor=vec4(mix(tex.rgb,vec3(lum),.65)*tint,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
     }`});
   material.name='original-acid-ground:'+id;material.userData.visualRole='effect';this.materials.push(material);
   // The existing loading gate warms these exact shader/instance variants before a real zone exists.
   const warm=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1,12,12),material,1);warm.name='acid-ground-prewarm';warm.count=0;warm.setColorAt(0,new THREE.Color(1,1,1));warm.frustumCulled=false;warm.userData.visualRole='effect';this.scene.add(warm);
  }
 }
 render(world:World,visible:(p:Point)=>boolean){
  if(!this.materials.length)return;
  if(this.terrain!==world.terrain){this.reset();this.terrain=world.terrain;}this.time=world.time;
  const active=new Set<string>();
  for(const zone of world.enemySpecials.acidZones){if(zone.ticks<=0)continue;const key=acidZoneKey(zone);active.add(key);let patch=this.patches.get(key);
   if(!patch){
    const geometry=new THREE.PlaneGeometry(zone.radius*2,zone.radius*2,12,12);geometry.rotateX(-Math.PI/2);
    const positions=geometry.getAttribute('position'),height=world.terrain?.height(zone.point)??0;
    for(let i=0;i<positions.count;i++)positions.setY(i,(world.terrain?.height({x:zone.point.x+positions.getX(i),z:zone.point.z+positions.getZ(i)})??0)-height+.035);
    positions.needsUpdate=true;geometry.computeBoundingSphere();const root=new THREE.Group();root.name='native-acid-ground';root.position.set(zone.point.x,height,zone.point.z);
    patch={root,geometry,radius:zone.radius,point:{...zone.point},phase:acidZonePhase(key),fade:1};const record=patch;
    for(const [index,material]of this.materials.entries()){
     const mesh=new THREE.InstancedMesh(geometry,material,1);mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,index*.003,0));mesh.setColorAt(0,new THREE.Color(1,1,1));mesh.renderOrder=2+index;mesh.userData.visualRole='effect';
     mesh.onBeforeRender=()=>{const grid=material.uniforms.grid.value as THREE.Vector2;material.uniforms.frame.value=Math.floor(this.time*(index?12:8))%(grid.x*grid.y);material.uniforms.angle.value=record.phase+(index?.38:0);material.uniforms.fade.value=record.fade;material.uniformsNeedUpdate=true;};root.add(mesh);
    }
    this.scene.add(root);this.patches.set(key,patch);
   }
   patch.root.visible=visible(zone.point);patch.fade=Math.min(1,Math.max(0,(acidZoneExpiry(zone)-world.time)/.18));
  }
  for(const [key,patch]of this.patches)if(!active.has(key)){patch.root.removeFromParent();patch.geometry.dispose();this.patches.delete(key);}
 }
 reset(){for(const patch of this.patches.values()){patch.root.removeFromParent();patch.geometry.dispose();}this.patches.clear();}
 report(){return {textures:['fx.bile.4','fx.acid.0'],zones:[...this.patches].map(([key,p])=>({key,point:p.point,radius:p.radius,visible:p.root.visible,fade:p.fade,terrainConforming:true})),auxiliaryOutlines:0};}
}
