import * as THREE from 'three';
import type {World} from '../../simulation/world';
import {CROSSING_FOG} from '../../simulation/special-stages/crossing-fog';
/** One small mask, rebuilt only when new ground is explored. No range rings or guard overlays. */
export class CrossingFog {
 private canvas=document.createElement('canvas');private context:CanvasRenderingContext2D;
 private texture:THREE.CanvasTexture;private mesh:THREE.Mesh;private key='';
 constructor(scene:THREE.Scene){
  this.canvas.width=CROSSING_FOG.width;this.canvas.height=CROSSING_FOG.height;this.context=this.canvas.getContext('2d')!;
  this.texture=new THREE.CanvasTexture(this.canvas);this.texture.generateMipmaps=false;this.texture.minFilter=THREE.LinearFilter;this.texture.magFilter=THREE.LinearFilter;this.texture.colorSpace=THREE.SRGBColorSpace;
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(40,108),new THREE.MeshBasicMaterial({map:this.texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
  this.mesh.rotation.x=-Math.PI/2;this.mesh.position.y=.2;this.mesh.renderOrder=10000;this.mesh.visible=false;scene.add(this.mesh);
 }
 update(w:World){
  const a=w.specialStages.active,f=a?.crossingFog;this.mesh.visible=a?.kind==='crossing'&&!!f;if(!this.mesh.visible||!f)return;
  const key=a!.id+':'+f.revision;if(key===this.key)return;this.key=key;
  const c=this.context;c.clearRect(0,0,40,108);c.fillStyle='#080e13';c.fillRect(0,0,40,108);for(const cell of f.cells)c.clearRect(cell%40,Math.floor(cell/40),1,1);this.texture.needsUpdate=true;
 }
 reset(){this.key='';this.mesh.visible=false;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();(this.mesh.material as THREE.Material).dispose();this.texture.dispose();}
}
