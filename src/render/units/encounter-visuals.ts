import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
type View={root:THREE.Group;crystals:THREE.Mesh[];sparkles:THREE.Mesh[];kind:string};
/** Small bounded adornments on original animated bodies. All clocks are simulation clocks. */
export class EncounterVisuals {
 private views=new Map<number,View>();
 private label:HTMLDivElement;
 private v=new THREE.Vector3();
 constructor(private scene:THREE.Scene,layer:HTMLElement){
  this.label=document.createElement('div');this.label.className='encounter-direction';this.label.style.cssText='position:absolute;pointer-events:none;padding:5px 9px;border:1px solid #d8bf7899;border-radius:4px;background:#09131ddd;color:#ffdf88;font:12px sans-serif;white-space:nowrap;transform:translate(-50%,-50%);z-index:4';
  layer.append(this.label);this.label.hidden=true;
 }
 private create(u:Entity):View{
  const kind=u.encounter!.kind,root=new THREE.Group();root.name='encounter:'+kind;
  const color=kind==='golden'?0xffd35d:kind==='giant'?0xbe57fc:0x88fff0;
  const crystals:THREE.Mesh[]=[],sparkles:THREE.Mesh[]=[];
  const n=kind==='golden'?5:kind==='giant'?7:4;
  for(let i=0;i<n;i++){
   const crystal=new THREE.Mesh(kind==='gentle'?new THREE.SphereGeometry(1,8,6):new THREE.OctahedronGeometry(1,0),new THREE.MeshStandardMaterial({color,roughness:.22,metalness:kind==='golden'?.8:.3,emissive:color,emissiveIntensity:.22}));
   root.add(crystal);crystals.push(crystal);
  }
  const shape=new THREE.Shape();shape.moveTo(0,1);shape.lineTo(.13,.13);shape.lineTo(1,0);shape.lineTo(.13,-.13);shape.lineTo(0,-1);shape.lineTo(-.13,-.13);shape.lineTo(-1,0);shape.lineTo(-.13,.13);shape.closePath();
  for(let i=0;i<(kind==='golden'?9:4);i++){const star=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:kind==='golden'?0xffefbb:color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));root.add(star);sparkles.push(star);}
  this.scene.add(root);return {root,crystals,sparkles,kind};
 }
 update(w:World,camera:THREE.Camera,width:number,height:number,ground:(p:{x:number;z:number})=>number,bodyHeight:(u:Entity)=>number,visible:(u:Entity)=>boolean,effectsEnabled=true){
  const alive=new Set<number>();
  for(const u of w.entities.values()){
   if(!u.encounter||u.encounter.role==='attacker'||u.hp<=0)continue;
   alive.add(u.id);let view=this.views.get(u.id);if(!view){view=this.create(u);this.views.set(u.id,view);}
   view.root.visible=visible(u);if(!view.root.visible)continue;
   const m=w.encounters.active?.id===u.encounter.id?w.encounters.active:null,tier=m?.tier??0,h=bodyHeight(u),r=u.unitRadius;
   view.root.position.set(u.x,ground(u),u.z);view.root.rotation.y=u.facing;
   const pulse=effectsEnabled?.5+.5*Math.sin(w.time*Math.PI*2/.6):0,color=u.encounter.kind==='giant'?[0xa052e8,0xbe4ac6,0xee7460,0xff9f48][tier]:u.encounter.kind==='golden'?0xffd35d:0xa1ffe3;
   view.crystals.forEach((mesh,i)=>{
    const a=i*2.399963,scale=u.encounter!.kind==='giant'?.12+.025*tier:.08;
    mesh.position.set(Math.sin(a)*r*.5,h*(u.encounter!.kind==='gentle'?.72:.86),Math.cos(a)*r*.5);
    mesh.scale.set(r*scale,h*(u.encounter!.kind==='giant'?.10+.015*tier:u.encounter!.kind==='gentle'?.05:.13),r*scale);mesh.rotation.z=Math.sin(a)*.35;
    const mat=mesh.material as THREE.MeshStandardMaterial;mat.color.set(color);mat.emissive.set(color);mat.emissiveIntensity=.16+.14*pulse;
   });
   view.sparkles.forEach((mesh,i)=>{
    mesh.visible=effectsEnabled;if(!effectsEnabled)return;
    const phase=(w.time*1.67+i*.173)%1,a=i*2.399963;
    mesh.position.set(Math.sin(a)*r*(1+phase*.8),h*(.5+phase),Math.cos(a)*r*(1+phase*.8));
    mesh.quaternion.copy(camera.quaternion);mesh.rotateY(-u.facing);mesh.scale.setScalar((u.encounter!.kind==='golden'?.18:.11)*Math.sin(phase*Math.PI));
    (mesh.material as THREE.MeshBasicMaterial).opacity=.7*Math.sin(phase*Math.PI);
   });
  }
  for(const [id,v] of this.views)if(!alive.has(id)){this.remove(v.root);this.views.delete(id);}
  this.label.hidden=true;
 }
 private remove(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.removeFromParent();}
 reset(){for(const v of this.views.values())this.remove(v.root);this.views.clear();this.label.hidden=true;}
 dispose(){this.reset();this.label.remove();}
 report(){return {bodies:this.views.size,signal:false};}
}
