import * as THREE from 'three';
import {commitInstances,uploadActive} from '../../units/instance-updates';
import {sourceSurface,type SourceMaterialResource} from './materials';
import type {SourcePhase} from './types';
import type {UnitMaterialSurface} from '../../materials/unit-material-batch';
import {DisplacementSurface,DISPLACEMENT_LAYER,type DisplacementResource} from './displacement';

export interface SourceQuad {matrix:THREE.Matrix4;color:[number,number,number,number];uv:[number,number,number,number];phase:SourcePhase;segmentedUv?:boolean}
/** Source effects grow their draw storage; a crowded scene cannot drop a core emitter. */
export class SourceDrawBatch {
 mesh!:THREE.InstancedMesh;surface!:UnitMaterialSurface|DisplacementSurface;
 private slots!:THREE.InstancedBufferAttribute;private paletteCapacity=0;private colors!:THREE.InstancedBufferAttribute;private uvs!:THREE.InstancedBufferAttribute;private segmented!:THREE.InstancedBufferAttribute;private capacity=0;
 readonly quads:SourceQuad[]=[];growths=0;
 constructor(private scene:THREE.Scene,private material:SourceMaterialResource|DisplacementResource){this.grow(64);}
 private grow(size:number,paletteSize=64){
  this.paletteCapacity=Math.max(64,2**Math.ceil(Math.log2(paletteSize)));
  const old=this.mesh,oldSurface=this.surface;this.capacity=Math.max(64,2**Math.ceil(Math.log2(size)));
  const geometry=new THREE.PlaneGeometry(1,1);this.colors=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4).setUsage(THREE.DynamicDrawUsage);this.uvs=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceColor',this.colors);geometry.setAttribute('sourceUv',this.uvs);
  this.segmented=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceSegmentedUv',this.segmented);
  this.slots=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceMaterialSlot',this.slots);
  this.surface='source'in this.material?new DisplacementSurface(this.material,this.paletteCapacity,true):sourceSurface(this.material,geometry,this.paletteCapacity,true);this.mesh=new THREE.InstancedMesh(geometry,this.surface.material,this.capacity);this.mesh.name='source-combat-particles';this.mesh.userData.combatEffect=true;this.mesh.userData.visualRole='effect';this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.renderOrder=2;if('source'in this.material){this.mesh.layers.set(DISPLACEMENT_LAYER);this.mesh.userData.displacement=true;this.mesh.renderOrder=this.material.source.priority;}this.scene.add(this.mesh);
  if(old){old.removeFromParent();old.geometry.dispose();old.dispose();oldSurface.material.dispose();oldSurface.texture.dispose();this.growths++;}
 }
 private growPalette(size:number){const old=this.surface;this.paletteCapacity=Math.max(64,2**Math.ceil(Math.log2(size)));this.surface='source'in this.material?new DisplacementSurface(this.material,this.paletteCapacity,true):sourceSurface(this.material,this.mesh.geometry,this.paletteCapacity,true);this.mesh.material=this.surface.material;old.material.dispose();old.texture.dispose();}
 begin(){this.quads.length=0;}
 add(quad:SourceQuad){this.quads.push(quad);}
 end(){
  const phases:SourcePhase[]=[],indices:number[]=[],clips=new Map<string,Map<number,number>>();
  for(const q of this.quads){let times=clips.get(q.phase.clip.name);if(!times){times=new Map();clips.set(q.phase.clip.name,times);}let slot=times.get(q.phase.seconds);if(slot===undefined){slot=phases.length;phases.push(q.phase);times.set(q.phase.seconds,slot);}indices.push(slot);}
  if(this.quads.length>this.capacity)this.grow(this.quads.length,Math.max(this.paletteCapacity,phases.length));else if(phases.length>this.paletteCapacity)this.growPalette(phases.length);
  phases.forEach((phase,i)=>this.surface.write(i,{clip:phase.clip.name,seconds:phase.seconds}));
  this.quads.forEach((q,i)=>{this.mesh.setMatrixAt(i,q.matrix);this.colors.setXYZW(i,...q.color);this.uvs.setXYZW(i,...q.uv);this.segmented.setX(i,q.segmentedUv?1:0);this.slots.setX(i,indices[i]);});
  commitInstances(this.mesh,this.quads.length);uploadActive(this.colors,this.quads.length);uploadActive(this.uvs,this.quads.length);uploadActive(this.segmented,this.quads.length);uploadActive(this.slots,this.quads.length);this.surface.flush();
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.dispose();this.surface.material.dispose();this.surface.texture.dispose();}
 report(){return {active:this.quads.length,submitted:this.mesh.count,dropped:Math.max(0,this.quads.length-this.mesh.count),capacity:this.capacity,growths:this.growths,paletteCapacity:this.paletteCapacity};}
}
