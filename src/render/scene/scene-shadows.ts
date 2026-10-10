import * as THREE from 'three';
import type {TerrainQuery} from '../../data/map-definition';
import type {Point} from '../../simulation/types';
import {PosedDepthRegistry,physicalSurface} from '../materials/posed-depth';

export const SHADOW_RESOLUTION=1024;
const origin=new THREE.Vector3(),sun=new THREE.Vector3(-15,25,10).normalize(),basis=new THREE.Matrix4().lookAt(sun,origin,new THREE.Vector3(0,1,0));
const right=new THREE.Vector3().setFromMatrixColumn(basis,0),up=new THREE.Vector3().setFromMatrixColumn(basis,1);
const elevations=new WeakMap<TerrainQuery,{min:number;max:number}>();
function elevationRange(terrain:TerrainQuery|undefined){if(!terrain)return {min:0,max:0};let range=elevations.get(terrain);if(!range){range={min:0,max:0};for(const y of terrain.definition?.heights??[]){range.min=Math.min(range.min,y);range.max=Math.max(range.max,y);}elevations.set(terrain,range);}return range;}

/** The camera footprint is extruded toward the key light to include off-screen casters. */
export class ShadowViewContext {
 readonly frustum=new THREE.Frustum();readonly matrix=new THREE.Matrix4();revision=0;private sphere=new THREE.Sphere();
 bounds={width:0,height:0,texelX:0,texelY:0,centerX:0,centerY:0,near:.5,far:1,maxCasterHeight:32};
 fit(camera:THREE.OrthographicCamera,light:THREE.DirectionalLight,terrain:TerrainQuery|undefined){
  camera.updateMatrixWorld();const range=elevationRange(terrain),points:THREE.Vector3[]=[];
  for(const y of [range.min-.1,range.max+.1])for(const x of [-1,1])for(const z of [-1,1]){const a=new THREE.Vector3(x,z,-1).unproject(camera),b=new THREE.Vector3(x,z,1).unproject(camera).sub(a);if(Math.abs(b.y)<1e-6)throw Error('Shadow view requires a ground-facing camera');points.push(a.addScaledVector(b,(y-a.y)/b.y));}
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of points){const x=p.dot(right),y=p.dot(up),z=p.dot(sun);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
  const padding=5,width=Math.ceil((maxX-minX+padding*2)/2)*2,height=Math.ceil((maxY-minY+padding*2)/2)*2;
  const texelX=width/SHADOW_RESOLUTION,texelY=height/SHADOW_RESOLUTION,cx=Math.round((minX+maxX)/2/texelX)*texelX,cy=Math.round((minY+maxY)/2/texelY)*texelY;
  const lightZ=maxZ+this.bounds.maxCasterHeight/sun.y+4,near=.5,far=lightZ-minZ+4;
  light.position.copy(right).multiplyScalar(cx).addScaledVector(up,cy).addScaledVector(sun,lightZ);light.target.position.copy(light.position).sub(sun);light.updateMatrixWorld();light.target.updateMatrixWorld();
  Object.assign(light.shadow.camera,{left:-width/2,right:width/2,top:height/2,bottom:-height/2,near,far});light.shadow.camera.updateProjectionMatrix();light.shadow.updateMatrices(light);
  const next=new THREE.Matrix4().multiplyMatrices(light.shadow.camera.projectionMatrix,light.shadow.camera.matrixWorldInverse);
  if(!this.matrix.equals(next)){this.matrix.copy(next);this.frustum.setFromProjectionMatrix(next);this.revision++;}
  this.bounds={width,height,texelX,texelY,centerX:cx,centerY:cy,near,far,maxCasterHeight:this.bounds.maxCasterHeight};
  light.shadow.bias=-(Math.max(texelX,texelY)*.55+.006)/(far-near);
 }
 intersects(bounds:THREE.Sphere){return this.frustum.intersectsSphere(bounds);}
 body(p:Point,ground:number,height=12,radius=6){this.sphere.center.set(p.x,ground+height/2,p.z);this.sphere.radius=Math.max(radius,height/2)+1;return this.intersects(this.sphere);}
}

export class SceneShadows {
 readonly depth=new PosedDepthRegistry();readonly view=new ShadowViewContext();enabled=true;private fallback:string|null=null;
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene,readonly light:THREE.DirectionalLight){
  if(renderer.capabilities.maxTextureSize<SHADOW_RESOLUTION){this.enabled=false;this.fallback='Required 1024 shadow texture is unsupported';}
  renderer.shadowMap.enabled=this.enabled;renderer.shadowMap.type=THREE.PCFShadowMap;light.castShadow=this.enabled;light.shadow.mapSize.set(SHADOW_RESOLUTION,SHADOW_RESOLUTION);light.shadow.bias=-.00008;light.shadow.normalBias=.035;
 }
 update(camera:THREE.OrthographicCamera,terrain:TerrainQuery|undefined){if(this.enabled)this.view.fit(camera,this.light,terrain);}
 prepare(root:THREE.Object3D=this.scene){if(this.enabled)this.depth.configure(root);}
 restore(){this.light.shadow.map?.dispose();this.light.shadow.map=null;this.light.shadow.needsUpdate=true;this.renderer.shadowMap.needsUpdate=true;}
 report(){let meshes=0,surfaces=0,posed=0;this.scene.traverseVisible(node=>{if(!(node instanceof THREE.Mesh)||!node.castShadow||node instanceof THREE.InstancedMesh&&node.count===0)return;meshes++;if(node instanceof THREE.SkinnedMesh||node.geometry.hasAttribute('unitPose'))posed++;surfaces+=(Array.isArray(node.material)?node.material:[node.material]).filter(physicalSurface).length;});return {enabled:this.enabled,method:'PCF',resolution:SHADOW_RESOLUTION,ready:this.enabled&&!!this.light.shadow.map,fallback:this.fallback,casters:meshes,surfaces,posedCasters:posed,view:{...this.view.bounds},revision:this.view.revision,poseDepth:true};}
}
