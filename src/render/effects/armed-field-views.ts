import {ArmedCombatViews} from './armed-combat-views';
import {armedOilMaterial} from './armed-oil-material';
import * as T from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';

/** Authored support props and ground footprints. Only reads committed World clocks. */
export class ArmedFieldViews{
 private views=new Map<number,T.Group>();
 private combat:ArmedCombatViews;
 constructor(private scene:T.Scene){this.combat=new ArmedCombatViews(scene);}
 shieldTemplate(){return this.combat.shieldTemplate();}
 private mesh(g:T.BufferGeometry,color:number,opacity=1){return new T.Mesh(g,new T.MeshStandardMaterial({color,metalness:.65,roughness:.48,transparent:opacity<1,opacity,depthWrite:opacity===1}));}
 private box(w:number,h:number,d:number,color=0x354955){return this.mesh(new T.BoxGeometry(w,h,d),color);}
 private ring(radius:number,color:number){const m=this.mesh(new T.RingGeometry(radius-.04,radius,64),color,.55);m.rotation.x=-Math.PI/2;return m;}
 private create(kind:string,radius:number,width?:number,length?:number){const g=new T.Group();
  if(kind==='W06'){
   const box=this.box(1.15,.45,.75);box.position.y=.25;g.add(box);const hinge=new T.Group();hinge.position.set(0,.5,-.37);const lid=this.box(1.2,.12,.8,0x80999f);lid.position.z=.4;hinge.add(lid);hinge.name='lid';g.add(hinge);const crossA=this.box(.5,.025,.13,0x5dffc2),crossB=this.box(.13,.025,.5,0x5dffc2);crossA.position.set(0,.09,.4);crossB.position.copy(crossA.position);hinge.add(crossA,crossB);for(const y of [-.08,.09]){const a=this.box(.5,.025,.13,0x78ffd0),b=this.box(.13,.025,.5,0x78ffd0);a.position.set(0,y,.4);b.position.copy(a.position);a.material.emissive.set(0x31765c);b.material.emissive.copy(a.material.emissive);hinge.add(a,b);}for(const x of [-.48,.48]){const rib=this.box(.1,.5,.83,0x77929d);rib.position.set(x,.26,0);g.add(rib);const trim=this.box(.09,.045,.82,0x6fe6c1);trim.position.set(x,.54,0);g.add(trim);}for(const z of [-.32,.32]){const clasp=this.box(.18,.27,.09,0xa9c4c7);clasp.position.set(0,.28,z);g.add(clasp);}
  }else if(kind==='B02'){
   for(let i=0;i<6;i++){const p=new T.Group(),a=i*Math.PI/3;p.position.set(Math.sin(a)*radius,0,Math.cos(a)*radius);p.rotation.y=a;const base=this.box(.5,.25,.7),jaw=this.box(.2,.8,.2,0x9ab7c2);base.position.y=.14;jaw.position.set(0,.45,.12);p.add(base,jaw);g.add(p);}g.add(this.ring(radius,0x43c8f5));
  }else if(kind==='G04'||kind==='P03'){
   const geo=width?new T.PlaneGeometry(width,length):new T.CircleGeometry(radius,32),oil=new T.Mesh(geo,armedOilMaterial(kind==='P03',!width));oil.rotation.x=-Math.PI/2;oil.position.y=.035;oil.renderOrder=2;g.add(oil);for(let i=0;i<14;i++){const bubble=this.mesh(new T.SphereGeometry(.09+.025*i,8,5),kind==='P03'?(i%2?0x9d43bd:0x84d75e):0x9b752d,.8);bubble.position.set(Math.sin(i*7)*(width?width*.3:radius*.6),.07,Math.cos(i*9)*(length?length*.3:radius*.6));g.add(bubble);}
  }else if(kind==='W08'){
   g.add(this.ring(5,0xe6d78d));const flare=this.mesh(new T.SphereGeometry(.18,12,8),0xffdf8a);flare.material.emissive.set(0xffdf8a);flare.material.emissiveIntensity=2;flare.position.y=.25;g.add(flare);
  }else if(kind==='W09'){
   const body=this.box(.7,.25,.5,0x38505c);body.position.y=.15;g.add(body);const light=this.box(.15,.03,.1,0xff8040);light.position.y=.3;light.name='fuse';g.add(light);
  }else if(kind==='B08'){for(const x of [-.45,.45]){const cable=this.mesh(new T.CylinderGeometry(.018,.018,1,6),0xc2c9cb);cable.position.x=x;g.add(cable);}}else if(kind==='P04'){
   const base=this.mesh(new T.CylinderGeometry(.6,.8,.25,8),0x4c626c);base.position.y=.13;g.add(base);for(let i=0;i<3;i++){const arm=this.box(.15,1.3,.15,0x789ca9);arm.position.set(Math.sin(i*2.094)*.35,.8,Math.cos(i*2.094)*.35);g.add(arm);}const core=this.mesh(new T.SphereGeometry(.33,12,8),0x49c9ff,.8);core.position.y=1.1;g.add(core);g.add(this.ring(radius,0x2f7db4));
  }return g;
 }
 private release(id:number){const g=this.views.get(id);if(!g)return;g.removeFromParent();g.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});this.views.delete(id);}
 reset(keepShield=false){this.combat.reset(keepShield);for(const id of this.views.keys())this.release(id);}
 update(w:World,visible:(p:Point)=>boolean,ground:(p:Point)=>number){this.combat.update(w,visible,ground);const live=new Set<number>();
  for(const f of w.expedition.support.armed?.fields??[]){if(f.cardId==='G09'||w.tick>=f.endTick)continue;live.add(f.id);let g=this.views.get(f.id);if(!g){g=this.create(f.cardId,f.radius,f.width,f.length);this.views.set(f.id,g);this.scene.add(g);}g.visible=visible(f.point);g.position.set(f.point.x,ground(f.point),f.point.z);if(f.direction)g.rotation.y=Math.atan2(f.direction.x,f.direction.z);const progress=Math.max(0,Math.min(1,(w.tick-f.createdTick)/Math.max(1,f.activeTick-f.createdTick)));
   if(f.cardId==='W06'){g.position.y+=Math.max(0,9-(w.tick-f.createdTick))*2/9;g.getObjectByName('lid')!.rotation.x=-Math.min(Math.PI/2,Math.max(0,w.tick-f.activeTick)*.2);}
   else if(f.cardId==='W08')g.position.y+=Math.max(0,8-(w.tick-f.createdTick));
   else if(f.cardId==='G04')g.scale.set(1,1,Math.max(.01,(w.tick-f.createdTick-9)/12));
   if(f.cardId==='G04'||f.cardId==='P03'){g.scale.z=Math.min(1,g.scale.z);g.traverse(n=>{if(n instanceof T.Mesh&&n.material instanceof T.ShaderMaterial)n.material.uniforms.clock.value=w.time;});}
   else if(f.cardId==='B02')g.scale.setScalar(Math.max(.01,progress));
   else if(f.cardId==='W09'){const fuse=g.getObjectByName('fuse');if(fuse)fuse.visible=Math.floor(w.tick/3)%2===0;}
  }
  for(const f of w.expedition.support.armed?.fields??[])if(f.cardId==='P03'&&f.attachTick!<=w.tick&&w.tick<f.attachEndTick!){const u=w.entities.get(f.target!.id);if(u?.hp&&u.bornAt===f.target!.generation){const id=-f.id;live.add(id);let g=this.views.get(id);if(!g){g=new T.Group();for(let i=0;i<4;i++){const m=this.mesh(new T.SphereGeometry(.16,10,8),i%2?0x8e43bc:0x7dd95a,.8);m.material.emissive.set(i%2?0x50206a:0x24572e);m.position.set(Math.sin(i*2)*.3,.65+i*.15,Math.cos(i*2)*.3);g.add(m);}this.views.set(id,g);this.scene.add(g);}g.position.set(u.x,ground(u),u.z);g.visible=visible(u);}}
  for(const d of w.expedition.support.armed?.deployments??[])if(d.cardId==='B08'&&d.phase==='falling'&&w.tick>=d.createdTick+15){live.add(d.id);let g=this.views.get(d.id);if(!g){g=this.create('B08',0);this.views.set(d.id,g);this.scene.add(g);}const bottom=Math.max(0,(d.landTick-w.tick)/60*36),length=Math.max(.1,8-bottom);g.position.set(d.point.x,ground(d.point)+bottom+length/2,d.point.z);for(const c of g.children)c.scale.y=length;g.visible=visible(d.point);}
  for(const d of w.expedition.support.armed?.deployments??[])if(d.cardId==='P04'&&d.phase!=='ended'){live.add(d.id);let g=this.views.get(d.id);if(!g){g=this.create('P04',d.impactRadius!);this.views.set(d.id,g);this.scene.add(g);}g.visible=visible(d.point);g.position.set(d.point.x,ground(d.point)+Math.max(0,d.landTick-w.tick)*.25,d.point.z);}
  for(const d of w.expedition.support.armed?.deployments??[])if(d.cardId==='P05'&&d.phase==='active'&&w.fortifications.get(d.id)?.hp){live.add(d.id);let g=this.views.get(d.id);if(!g){g=new T.Group();const ring=this.ring(4,0x67bfc4);g.add(ring);this.views.set(d.id,g);this.scene.add(g);}g.position.set(d.point.x,ground(d.point)+.04,d.point.z);g.visible=visible(d.point);}
  for(const id of this.views.keys())if(!live.has(id))this.release(id);
 }
}
