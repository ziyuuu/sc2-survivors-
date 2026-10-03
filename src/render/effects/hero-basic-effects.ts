import * as THREE from 'three';
import type {BattleEffects} from './battle-effects';
import type {World} from '../../simulation/world';
import type {Point,VisualEvent} from '../../simulation/types';
import {isRevisedHero} from '../../data/terran-heroes';
import type {HeroId} from '../../data/heroes';
import {AIR_HEIGHT} from '../../data/terrain';
import {commitInstances} from '../units/instance-updates';

type Vec={x:number;y:number;z:number};
export type VisualFlight={attackId:string;source:{heroId:HeroId;flying:boolean;unitType:'marauder'};from:Point;point:Point;lastSeen:Point;target:number;lost:boolean;start:number;end:number;mount:Vec};
type Shell={point:Vec;velocity:Vec;at:number;angle:number};
const object=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),white=new THREE.Color();
const fx=(name:string)=>'fx.hero-basic.'+name;
/** Approved shooting-range visuals driven only by real game flights and impact events. */
export class HeroBasicEffects {
 private cores:THREE.InstancedMesh;private shellMesh:THREE.InstancedMesh;
 private shells:Shell[]=[];private visualFlights:VisualFlight[]=[];private sampled=new Map<string,number>();
 stats={flights:0,impacts:0,casings:0};
 constructor(scene:THREE.Scene,private host:BattleEffects){
  this.cores=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,1,6),new THREE.MeshBasicMaterial({color:0xffffff}),256);
  this.shellMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.026,.028,.13,6),new THREE.MeshStandardMaterial({color:0xb79446,metalness:.78,roughness:.38}),192);
  for(const m of [this.cores,this.shellMesh]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);}
 }
 get flights():readonly VisualFlight[]{return this.visualFlights;}
 reset(){this.visualFlights=[];this.shells=[];this.sampled.clear();this.cores.count=this.shellMesh.count=0;this.stats={flights:0,impacts:0,casings:0};}
 private sprite(point:Vec,key:string,size:number,time:number,life:number,color:number,priority:'core'|'trail'|'decoration'='trail',growth=.4){
  this.host.emit({asset:fx(key),...point,vx:0,vy:0,vz:0,start:time,life,size,growth,color,ground:false,angle:0,priority});
 }
 private ribbon(head:Vec,tail:Vec,key:string,width:number,time:number,color:number,life=.08){
  this.host.emit({asset:fx(key),...tail,to:head,longitudinalY:true,vx:0,vy:0,vz:0,start:time,life,size:width,growth:0,color,ground:false,angle:0,priority:'core'});
 }
 private smoke(point:Vec,time:number,size:number,heavy=false){
  if(this.host.heroQuality==='low')return;
  this.host.emit({asset:fx('kenney-smoke_04'),...point,vx:0,vy:.45,vz:0,start:time,life:heavy?.85:.5,size,growth:2,color:heavy?0x62656b:0x8f9294,ground:false,angle:time,priority:'decoration',opacity:heavy?.42:.28});
 }
 private sparks(point:Vec,time:number,count:number,color:number,serial:number,force=3){
  count=this.host.heroQuality==='low'?2:this.host.heroQuality==='balanced'?Math.ceil(count*.6):count;
  for(let i=0;i<count;i++){const a=serial*2.399+i*2.741,r=.4+(i%5)*.14;
   this.host.emit({asset:fx('kenney-trace_05'),...point,vx:Math.sin(a)*force*r,vy:.5+r*force,vz:Math.cos(a)*force*r,start:time,life:.18+r*.22,size:.065,growth:-.45,color,ground:false,angle:a,aspect:3.5,priority:'trail'});
  }
 }
 event(e:VisualEvent,mount:Vec|null){
  if(!isRevisedHero(e.heroId))return;
  const id=e.heroId!,from=mount??{x:e.x,y:e.y,z:e.z},point={x:e.end.x,y:e.endY,z:e.end.z},cold=id==='nova',color=cold?0x9ce9ff:id==='tosh'?0xff7ebc:0xffc47b;
  if(e.kind==='attack'){
   if(!e.projectileSpeed){
    const speed=id==='nova'?85:id==='swann'?18:60,duration=Math.max(.035,Math.hypot(point.x-from.x,point.y-from.y,point.z-from.z)/speed);
    if(this.visualFlights.length>=256)this.visualFlights.shift();
    this.visualFlights.push({attackId:e.attackId??'visual:'+e.serial,source:{heroId:id,flying:e.flying,unitType:'marauder'},from:{x:from.x,z:from.z},point:{x:from.x,z:from.z},lastSeen:{x:point.x,z:point.z},target:e.targetId??0,lost:false,start:e.time,end:e.time+duration,mount:{...from}});
    this.event({...e,kind:'projectile-impact',time:e.time+duration},null);
   }
   const size=id==='yamato_battlecruiser'?1.25:id==='swann'?.7:cold?.5:.45;
   this.sprite(from,'flare2b',size*.55,e.time,.06,0xffffff,'core');
   const key=cold?'flare1_blueelec':id==='tosh'?'energyplane3_red':id==='swann'?'kenney-muzzle_03':'kenney-muzzle_05';
   const length=Math.hypot(point.x-from.x,point.y-from.y,point.z-from.z)||1;
   this.ribbon({x:from.x+(point.x-from.x)/length*size,y:from.y+(point.y-from.y)/length*size,z:from.z+(point.z-from.z)/length*size},from,key,size*.6,e.time,color,.075);
   if(this.host.heroQuality!=='low'&&['raynor','tychus','nova'].includes(id)){if(this.shells.length>=192)this.shells.shift();this.shells.push({point:{...from},velocity:{x:Math.cos(e.facing)*1.8,y:2.1,z:-Math.sin(e.facing)*1.8},at:e.time,angle:e.serial});}
   if(id==='yamato_battlecruiser'||id==='swann'||e.serial%3===0)this.smoke(from,e.time,id==='yamato_battlecruiser'?.5:.2);
   return;
  }
  if(e.kind!=='projectile-impact'&&e.kind!=='weapon-area')return;
  this.stats.impacts++;
  const heavy=id==='yamato_battlecruiser'||id==='swann',size=heavy?id==='yamato_battlecruiser'?1.35:1.05:cold?.75:id==='tosh'?.65:.48;
  this.sprite(point,'flare2b',size,e.time,.095,color,'core');
  if(heavy){this.sprite(point,'fireanim_x4',size*1.45,e.time,.4,0xffd59b,'core',.8);this.smoke(point,e.time,size*.8,true);this.sparks(point,e.time,10,color,e.serial,4.3);}
  else if(cold){this.sprite(point,'flare1_blueelec',size*1.3,e.time,.16,0xc9f5ff,'core');this.sprite(point,'kenney-twirl_01',size,e.time,.2,color);this.sparks(point,e.time,9,color,e.serial,3.5);this.smoke(point,e.time,.3);}
  else if(id==='tosh'){this.sprite(point,'kenney-twirl_01',size,e.time,.2,color);this.sparks(point,e.time,8,color,e.serial);}
  else {this.sprite(point,'sparks4',size*1.3,e.time,.12,color);this.sparks(point,e.time,id==='tychus'?6:9,color,e.serial);this.smoke(point,e.time,.28);}
 }
 render(w:World,visible:(p:Point)=>boolean,mounts:ReadonlyMap<string,Vec>){
  let count=0;const ids=new Set<string>();
  this.visualFlights=this.visualFlights.filter(p=>w.time<p.end);
  for(const p of this.visualFlights){const t=Math.max(0,Math.min(1,(w.time-p.start)/(p.end-p.start)));p.point.x=p.from.x+(p.lastSeen.x-p.from.x)*t;p.point.z=p.from.z+(p.lastSeen.z-p.from.z)*t;}
  const realFlights=w.weaponFlights.flatMap(p=>p.source.heroId==='yamato_battlecruiser'&&p.hits===2?[p,{...p,primary:false}]:[p]);
  for(const p of [...realFlights,...this.visualFlights]){
   const id=p.source.heroId!,left='primary' in p&&p.primary===false,key=p.attackId+(left?':left':'');if(!isRevisedHero(id))continue;ids.add(key);if(!visible(p.point)||count>=256)continue;
   const total=Math.max(.01,Math.hypot(p.lastSeen.x-p.from.x,p.lastSeen.z-p.from.z)),traveled=Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z),t=Math.min(1,traveled/total),target=p.lost?undefined:w.body(p.target);
   const fromY=p.source.flying?AIR_HEIGHT+1:(w.terrain?.height(p.from)??0)+.8,toY=target?.flying?AIR_HEIGHT+.6:(w.terrain?.height(p.lastSeen)??0)+.65;
   const mount='mount' in p?p.mount:mounts.get(key),blend=Math.max(0,1-traveled/2),head={x:p.point.x+(mount?mount.x-p.from.x:0)*blend,y:fromY+(toY-fromY)*t+(mount?mount.y-fromY:0)*blend,z:p.point.z+(mount?mount.z-p.from.z:0)*blend};
   direction.set(p.lastSeen.x-p.from.x,toY-fromY,p.lastSeen.z-p.from.z).normalize();
   // Sizes are presentation only: wider Raynor, longer Nova, wide and long ship cannon.
   const width=id==='raynor'?2.6:id==='nova'?1.35:id==='yamato_battlecruiser'?5:id==='tosh'?1.8:1.2;
   const length=id==='nova'?2.6:id==='yamato_battlecruiser'?1.9:id==='raynor'?1.15:id==='tychus'?.65:.4;
   object.position.set(head.x,head.y,head.z);object.quaternion.setFromUnitVectors(up,direction);object.scale.set(width,length,width);object.updateMatrix();this.cores.setMatrixAt(count,object.matrix);this.cores.setColorAt(count++,white.set(id==='nova'?0xd9faff:id==='tosh'?0xffb0db:0xffecc9));
   if(w.time-(this.sampled.get(key)??-100)<1/60)continue;this.sampled.set(key,w.time);
   const tail={x:head.x-direction.x*Math.min(length,traveled+.15),y:head.y-direction.y*Math.min(length,traveled+.15),z:head.z-direction.z*Math.min(length,traveled+.15)};
   if(id==='nova'){this.ribbon(head,tail,'emergytrailcyan',.18,w.time,0xa5efff,.13);this.ribbon(head,tail,'energyplane3',.25,w.time,0xc2eeff,.085);}
   else if(id==='yamato_battlecruiser'){this.ribbon(head,tail,'emergytrailorange',.45,w.time,0xffc478,.12);this.ribbon(head,tail,'firestreak7',.36,w.time,0xffe7b3,.07);}
   else if(id==='tosh'){this.ribbon(head,tail,'emergytrailorange',.2,w.time,0xff99c5,.1);const a=w.time*32;this.sprite({x:head.x,y:head.y+Math.sin(a)*.15,z:head.z+Math.cos(a)*.15},'energyplane3_red',.22,w.time,.11,0xff6cb6);}
   else if(id==='swann')this.sprite(head,'fireball_10',.3,w.time,.06,0xffd19b);
   else this.ribbon(head,tail,'kenney-trace_05',id==='raynor'?.19:.095,w.time,0xffdf9c,.06);
   this.sprite(head,'flare2b',id==='yamato_battlecruiser'?.48:id==='raynor'?.2:.16,w.time,.04,id==='nova'?0xb2efff:0xffd89b,'core');
  }
  for(const id of this.sampled.keys())if(!ids.has(id))this.sampled.delete(id);
  commitInstances(this.cores,count);this.stats.flights=count;
  let shells=0;this.shells=this.shells.filter(s=>w.time-s.at<2);
  for(const s of this.shells){const a=Math.max(0,w.time-s.at),y=Math.max(.04,s.point.y+s.velocity.y*a-4.9*a*a);const point={x:s.point.x+s.velocity.x*Math.min(a,.7),y,z:s.point.z+s.velocity.z*Math.min(a,.7)};if(!visible(point))continue;object.position.set(point.x,point.y,point.z);object.rotation.set(s.angle+a*5,s.angle+a*8,a*7);object.scale.setScalar(1);object.updateMatrix();this.shellMesh.setMatrixAt(shells++,object.matrix);}
  commitInstances(this.shellMesh,shells);this.stats.casings=shells;
 }
}
