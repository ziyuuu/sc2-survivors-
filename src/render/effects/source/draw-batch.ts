import * as THREE from 'three';
import {commitInstances,uploadActive} from '../../units/instance-updates';
import {sourceSurface,type SourceMaterialResource} from './materials';
import type {SourcePhase} from './types';
import type {UnitMaterialSurface} from '../../materials/unit-material-batch';

export interface SourceQuad {matrix:THREE.Matrix4;color:[number,number,number,number];uv:[number,number,number,number];phase:SourcePhase;segmentedUv?:boolean}
/** Source effects grow their draw storage; a crowded scene cannot drop a core emitter. */
export class SourceDrawBatch {
 mesh!:THREE.InstancedMesh;surface!:UnitMaterialSurface;
 private colors!:THREE.InstancedBufferAttribute;private uvs!:THREE.InstancedBufferAttribute;private segmented!:THREE.InstancedBufferAttribute;private capacity=0;
 readonly quads:SourceQuad[]=[];growths=0;
 constructor(private scene:THREE.Scene,private material:SourceMaterialResource){this.grow(64);}
 private grow(size:number){
  const old=this.mesh,oldSurface=this.surface;this.capacity=Math.max(64,2**Math.ceil(Math.log2(size)));
  const geometry=new THREE.PlaneGeometry(1,1);this.colors=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4).setUsage(THREE.DynamicDrawUsage);this.uvs=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceColor',this.colors);geometry.setAttribute('sourceUv',this.uvs);
  this.segmented=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceSegmentedUv',this.segmented);
  this.surface=sourceSurface(this.material,geometry,this.capacity,true);this.mesh=new THREE.InstancedMesh(geometry,this.surface.material,this.capacity);this.mesh.name='source-combat-particles';this.mesh.userData.combatEffect=true;this.mesh.userData.visualRole='effect';this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.renderOrder=2;this.scene.add(this.mesh);
  if(old){old.removeFromParent();old.geometry.dispose();old.dispose();oldSurface.material.dispose();oldSurface.texture.dispose();this.growths++;}
 }
 begin(){this.quads.length=0;}
 add(quad:SourceQuad){this.quads.push(quad);}
 end(){
  if(this.quads.length>this.capacity)this.grow(this.quads.length);
  this.quads.forEach((q,i)=>{this.mesh.setMatrixAt(i,q.matrix);this.colors.setXYZW(i,...q.color);this.uvs.setXYZW(i,...q.uv);this.segmented.setX(i,q.segmentedUv?1:0);this.surface.write(i,{clip:q.phase.clip.name,seconds:q.phase.seconds});});
  commitInstances(this.mesh,this.quads.length);uploadActive(this.colors,this.quads.length);uploadActive(this.uvs,this.quads.length);uploadActive(this.segmented,this.quads.length);this.surface.flush();
 }
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.dispose();this.surface.material.dispose();this.surface.texture.dispose();}
 report(){return {active:this.quads.length,submitted:this.mesh.count,dropped:Math.max(0,this.quads.length-this.mesh.count),capacity:this.capacity,growths:this.growths};}
}
