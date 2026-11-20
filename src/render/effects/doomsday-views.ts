import * as T from 'three';
import type {World} from '../../simulation/world';
import type {Entity,Point} from '../../simulation/types';
import {DoomsdayRefitViews,type DoomsdaySocket} from './doomsday-refit-views';
import type {SmokeAtlas} from './doomsday-atmosphere';

/** Read-only equipment and trajectory presentation. Source SC2 bodies/effects remain in their native renderers. */
export class DoomsdayViews {
 private root=new T.Group();private parts=new Map<string,T.Group>();
 private redirects=new Map<number,number>();
 redirectedFacing(id:number){return this.redirects.get(id);}
 private refits:DoomsdayRefitViews;
 private box=new T.BoxGeometry(1,1,1);private collar=new T.CylinderGeometry(.45,.50,1,16);private dome=new T.SphereGeometry(.5,16,10);
 private metal=new T.MeshStandardMaterial({color:0x7d8d9b,metalness:.7,roughness:.45});
 private light=new T.MeshBasicMaterial({color:0x6edbff});private scrap=new T.MeshStandardMaterial({color:0x8ea099,metalness:.65,roughness:.55});
 private lines=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xb6aaa0,transparent:true,opacity:.85}));
 constructor(scene:T.Scene,smoke?:SmokeAtlas){this.refits=new DoomsdayRefitViews(this.root,smoke);this.root.name='doomsday-equipment';this.root.userData.visualRole='effect';scene.add(this.root);this.root.add(this.lines);this.lines.frustumCulled=false;}
 reset(){this.redirects.clear();for(const part of this.parts.values())part.removeFromParent();this.parts.clear();this.lines.geometry.setDrawRange(0,0);this.refits.reset();}
 dispose(){this.reset();this.refits.dispose();this.root.removeFromParent();this.box.dispose();this.collar.dispose();this.dome.dispose();this.metal.dispose();this.light.dispose();this.scrap.dispose();this.lines.geometry.dispose();(this.lines.material as T.Material).dispose();}
 report(){return {objects:this.parts.size+this.refits.count(),lineVertices:this.lines.geometry.drawRange.count};}
 update(w:World,height:(u:Entity)=>number,visible:(u:Entity)=>boolean,socket?:DoomsdaySocket){
  this.root.visible=w.phase==='battle';const state=w.expedition.doomsday,used=new Set<string>(),points:number[]=[];
  this.redirects.clear();
  if(!this.root.visible||!state){this.reset();return;}
  for(const event of w.visualEvents)if(event.doomsdayEffect==='redirect'&&w.time-event.time<.27){
   const u=w.entities.get(event.entityId);if(u&&event.time>=u.lastShotAt&&event.time>=u.bornAt)this.redirects.set(u.id,Math.atan2(event.end.x-event.x,event.end.z-event.z));
  }
  const ground=(p:Point)=>w.terrain?.height(p)??0;
  const line=(a:Point,ay:number,b:Point,by:number)=>points.push(a.x,ay,a.z,b.x,by,b.z);
  const part=(key:string,kind:'turret'|'scrap'|'light')=>{used.add(key);let g=this.parts.get(key);if(g)return g;g=new T.Group();this.root.add(g);this.parts.set(key,g);
   const base=new T.Mesh(this.collar,this.metal);base.scale.set(.42,.12,.43);g.add(base);
   if(kind==='scrap'){
    const clasp=new T.Mesh(this.box,this.scrap);clasp.scale.set(.28,.10,.14);clasp.position.y=.10;g.add(clasp);
   }else{
    const housing=new T.Mesh(this.dome,this.metal);housing.scale.set(.44,.28,.42);housing.position.y=.11;g.add(housing);
    const tip=new T.Mesh(this.collar,kind==='light'?this.light:this.metal);tip.rotation.x=Math.PI/2;
    if(kind==='turret'){tip.scale.set(.11,.49,.11);tip.position.set(0,.12,.28);}
    else{tip.scale.set(.18,.045,.18);tip.position.set(0,.13,.20);}
    g.add(tip);
   }
   return g;
  };
  for(const [id,b]of Object.entries(state?.blueprints??{})){
   const u=b?.host&&w.entities.get(b.host.entityId);if(!u||u.hp<=0||u.bornAt!==b!.host!.bornAt||!visible(u)||!['M-B09','M-G07'].includes(id))continue;
   const g=part(id+':'+u.id,id==='M-B09'?'turret':'light');g.position.set(u.x,ground(u)+height(u)*.78,u.z);
   if(id==='M-B09'){
    const shot=w.weaponFlights.find(p=>p.source.id===u.id&&p.source.bornAt===u.bornAt&&p.doomsdayDerived?.kind==='turret');
    let target=shot?.lastSeen;
    for(let i=w.visualEvents.length-1;!target&&i>=0;i--){
     const e=w.visualEvents[i];if(e.entityId===u.id&&e.doomsdaySegment==='turret'&&e.time>=u.bornAt)target=e.end;
    }
    if(target)g.userData.aim=Math.atan2(target.x-u.x,target.z-u.z);
    g.rotation.y=g.userData.aim??u.attackFacing;
   }else g.rotation.y=u.facing;
  }
  for(const s of state?.scrap??[]){const g=part('scrap:'+s.id,'scrap');g.position.set(s.x,ground(s)+.14,s.z);g.rotation.y=s.id;}
  for(const u of w.allies()){
   const t=u.doomsday?.tow,helper=t&&w.entities.get(t.helper.entityId);
   if(!t||!helper?.hp||helper.bornAt!==t.helper.bornAt||t.untilTick<=w.tick||!visible(u))continue;
   const middle={x:(u.x+helper.x)/2,z:(u.z+helper.z)/2},low=ground(middle)+.19;
   line(u,ground(u)+.35,middle,low);line(middle,low,helper,ground(helper)+.35);
  }
  this.refits.update(w,height,visible,socket);
  for(const [key,g]of this.parts)if(!used.has(key)){g.removeFromParent();this.parts.delete(key);}
  let attr=this.lines.geometry.getAttribute('position') as T.BufferAttribute|undefined;if(!attr||attr.array.length<points.length){this.lines.geometry.dispose();this.lines.geometry=new T.BufferGeometry();attr=new T.BufferAttribute(new Float32Array(Math.max(96,2**Math.ceil(Math.log2(points.length||1)))) ,3);this.lines.geometry.setAttribute('position',attr);}
  (attr.array as Float32Array).set(points);attr.needsUpdate=true;this.lines.geometry.setDrawRange(0,points.length/3);
 }
}
