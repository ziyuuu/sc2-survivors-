import * as T from 'three';
import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
/** Read-only presentation of real shield pools and committed projectile/beam receipts. */
export class ArmedCombatViews {
 private views=new Map<string,T.Group>();
 private shieldBase?:T.Group;
 constructor(private scene:T.Scene){}
 private group(key:string){let g=this.views.get(key);if(!g){g=new T.Group();this.scene.add(g);this.views.set(key,g);}return g;}
 private material(color:number,opacity:number){return new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});}
 shieldTemplate(){
  if(this.shieldBase)return this.shieldBase;
  const group=new T.Group(),shell=new T.Mesh(new T.SphereGeometry(1,24,16),this.material(0x54dfff,.075));
  shell.name='shield-shell';shell.material.side=T.BackSide;
  const hull=new T.IcosahedronGeometry(1,1),wire=new T.WireframeGeometry(hull);hull.dispose();
  const lines=new T.LineSegments(wire,new T.LineBasicMaterial({color:0x8eeaff,transparent:true,opacity:.35,depthWrite:false,blending:T.AdditiveBlending}));
  lines.name='shield-wire';
  const ring=new T.Mesh(new T.TorusGeometry(.88,.018,6,40),this.material(0x8df6ff,.75));
  ring.name='shield-ring';ring.rotation.x=Math.PI/2;ring.position.y=-.42;
  group.add(shell,lines,ring);this.shieldBase=group;return group;
 }
 private line(g:T.Group,a:T.Vector3,b:T.Vector3,width:number,color:number,opacity:number){let m=g.children.find(n=>n.name==='line-'+g.userData.cursor) as T.Mesh|undefined;const name='line-'+g.userData.cursor;g.userData.cursor++;if(!m){m=new T.Mesh(new T.CylinderGeometry(1,1,1,8),this.material(color,opacity));m.name=name;g.add(m);}const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());m.scale.set(width,d.length(),width);(m.material as T.MeshBasicMaterial).opacity=opacity;}
 private disposeGroup(g:T.Group){g.traverse(n=>{if(n instanceof T.Mesh||n instanceof T.LineSegments){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});}
 private release(key:string){
  const g=this.views.get(key);if(!g)return;g.removeFromParent();
  if(key.startsWith('shield:'))(g.children[0] as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>).material.dispose();
  else this.disposeGroup(g);
  this.views.delete(key);
 }
 reset(keepShield=false){for(const k of this.views.keys())this.release(k);if(this.shieldBase&&!keepShield){this.disposeGroup(this.shieldBase);this.shieldBase=undefined;}}
 update(w:World,visible:(p:Point)=>boolean,ground:(p:Point)=>number){const live=new Set<string>();
  for(const u of w.allies()){const shields=w.expedition.support.armed?.unitStatus[u.id]?.cardShields?.filter(s=>s.amount>0&&s.untilTick>w.tick);if(!u.hp||!shields?.length||!visible(u))continue;const key='shield:'+u.id,g=this.group(key);live.add(key);const radius=Math.max(.72,u.unitRadius*1.65),height=Math.max(.95,radius*.8);g.position.set(u.x,ground(u)+(u.flying?5.6:0)+height,u.z);g.scale.set(radius,height,radius);
   if(!g.children.length){
    const [body,lines,ring]=this.shieldTemplate().children,shell=body.clone() as T.Mesh<T.SphereGeometry,T.MeshBasicMaterial>;
    shell.material=shell.material.clone();g.name=key;g.add(shell,lines.clone(),ring.clone());
   }
   let hit:typeof w.visualEvents[number]|undefined;for(let i=w.visualEvents.length-1;i>=0;i--){const e=w.visualEvents[i];if(e.entityId===u.id&&(e.kind==='shield-hit'||e.kind==='barrier-start')){hit=e;break;}}const flash=hit?Math.max(0,1-(w.time-hit.time)/.3):0;(g.children[0] as T.Mesh<T.SphereGeometry,T.MeshBasicMaterial>).material.opacity=.075+flash*.15;
  }
  for(const d of w.expedition.support.armed?.deployments??[]){const s=d.sweep,fort=w.fortifications.get(d.id);if(!s||d.phase!=='active'||!fort?.hp||w.tick>=s.endTick||!visible(fort))continue;const p=ARMED_CARD_BY_ID.O03.params,key='sweep:'+d.id,g=this.group(key),fx=Math.sin(s.angle),fz=Math.cos(s.angle);live.add(key);g.userData.cursor=0;const a=new T.Vector3(fort.x+fx*2.3,ground(fort)+2.6,fort.z+fz*2.3),b=new T.Vector3(fort.x+fx*p.length,ground(fort)+.7,fort.z+fz*p.length);this.line(g,a,b,.1,0xe9fcff,.9);this.line(g,a,b,.24,0x63dfff,.34);this.line(g,a,b,p.width/2,0x2587f4,.035);}
  for(const e of w.visualEvents){if(!['raider-blast','ricochet-hit'].includes(e.supportVisual??''))continue;const age=w.time-e.time,life=e.supportDuration??.14;if(age<0||age>=life||!visible(e))continue;const key='burst:'+e.serial,g=this.group(key);live.add(key);if(!g.children.length){const m=new T.Mesh(e.supportVisual==='raider-blast'?new T.RingGeometry(.93,1,48):new T.SphereGeometry(.13,8,6),this.material(e.supportVisual==='raider-blast'?0xff8b24:0xffe9a0,.8));if(e.supportVisual==='raider-blast')m.rotation.x=-Math.PI/2;g.add(m);}g.position.set(e.x,ground(e)+(e.supportVisual==='raider-blast'?.08:e.y),e.z);g.scale.setScalar(e.supportVisual==='raider-blast'?(e.supportRadius??2)*(.25+age/life):1+age/life);((g.children[0] as T.Mesh).material as T.MeshBasicMaterial).opacity=.45*(1-age/life);}
  for(const e of w.visualEvents){if(!e.supportVisual||!['ricochet','bunker-shot'].includes(e.supportVisual))continue;const duration=e.supportDuration??.1,age=w.time-e.time,life=duration+(e.supportVisual==='ricochet'?.3:.16);if(age<0||age>=life||!visible(e)&&!visible(e.end))continue;const key='receipt:'+e.serial,g=this.group(key);live.add(key);g.userData.cursor=0;
   const a=new T.Vector3(e.x,e.supportVisual==='planetary-beam'?ground(e)+2.6:e.y+(e.supportVisual==='bunker-shot'?.8:0),e.z),b=new T.Vector3(e.end.x,e.supportVisual==='planetary-beam'?ground(e.end)+.7:e.endY,e.end.z),fade=Math.min(1,(life-age)/.16);
   {const t=Math.min(1,age/Math.max(.001,duration)),head=a.clone().lerp(b,t),tail=a.clone().lerp(b,Math.max(0,t-.65)),orange=e.supportVisual==='ricochet';if(orange)this.line(g,a,b,.022,0xffb72c,.22*fade);this.line(g,tail,head,.045,orange?0xffef8d:0xfff4d1,.95*fade);this.line(g,tail,head,.1,orange?0xffad29:0xffbe55,.45*fade);if(!orange){let flash=g.getObjectByName('muzzle') as T.Mesh|undefined;if(!flash){flash=new T.Mesh(new T.SphereGeometry(.12,8,6),this.material(0xffdd8a,.9));flash.name='muzzle';g.add(flash);}flash.position.copy(a);flash.visible=age<.12;(flash.material as T.MeshBasicMaterial).opacity=.9*Math.max(0,1-age/.12);}}
  }
  // Pending restored hops retain their real start/arrival clocks without replaying old hits.
  for(const p of w.expedition.support.unique.packets){if(p.kind!=='ricochet'||p.start>w.time||p.at<=w.time||!visible(p.point))continue;const key='hop:'+p.id,g=this.group(key);live.add(key);g.userData.cursor=0;const t=(w.time-p.start)/Math.max(.001,p.at-p.start),target=w.entities.get(p.target),prev=w.entities.get(p.seen?.at(-2)??0),a=new T.Vector3(p.from.x,ground(p.from)+(prev?.flying?5.6:1),p.from.z),b=new T.Vector3(p.point.x,ground(p.point)+(target?.flying?5.6:1),p.point.z);this.line(g,a.clone().lerp(b,Math.max(0,t-.65)),a.clone().lerp(b,t),.055,0xffdf66,.9);}
  for(const key of this.views.keys())if(!live.has(key))this.release(key);
 }
}
