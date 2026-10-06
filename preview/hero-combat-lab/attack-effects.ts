import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {World} from '../../src/simulation/world';
import type {VisualEvent} from '../../src/simulation/types';
import {weaponWorldPoint} from '../../src/render/effects/hero-feedback';
import {modelPresentationScale} from '../../src/data/combat-presentation';
import {restoreSc2Materials,sc2BodyBounds} from '../../src/render/loaders/sc2-materials';
import {assetUrl} from '../../src/assets/manifest';
import {commitInstances} from '../../src/render/units/instance-updates';
import type {AttackPacket,Point3} from './attack-simulation';
import {AttackSimulation} from './attack-simulation';
import {ATTACK_DEMO_TUNING as T} from './tuning';
import {ApprovedGunEffects} from './approved-gun-effects';
import {UpgradeMaterials} from './upgrade-materials';

const v=(p:Point3)=>new THREE.Vector3(p.x,p.y,p.z),lerp=(a:Point3,b:Point3,t:number):Point3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const obj=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,1);
const palette=[0xff91c5,0xffd875,0x91efff,0xbe91ff,0xff885e];
type Mote={at:number;life:number;p:Point3;velocity:Point3;color:number;width:number;gravity:number;kind:'ember'|'firework'|'electric'};
const missileId='model.hero-upgrade.vikingfightermissile';

/** Approved main guns plus original-texture upgrades. No damage, targeting or gameplay RNG. */
export class AttackEffects {
 private guns:ApprovedGunEffects;private materials:UpgradeMaterials;
 private rockets:THREE.InstancedMesh[]=[];private missiles:THREE.InstancedMesh[]=[];
 private samples=new Map<number,number>();private mounts=new Map<string,Point3>();private motes:Mote[]=[];
 private rocketCount=0;private missileCount=0;private electricCount=0;private fireLayerCount=0;
 private missileDimensions={length:0,width:0,meshes:0};
 stats={flights:0,red:0,yellow:0,lightningSegments:0,missiles:0,bounces:0,fireworks:0,fireworkSparks:0,impacts:0,dotFlashes:0,peakFlights:0};
 constructor(private view:BattleRenderer,private w:World,private simulation:AttackSimulation){this.guns=new ApprovedGunEffects(view.scene,view.fx);this.materials=new UpgradeMaterials(view.scene,view.camera,view.fx);}
 async prepare(){
  this.materials.prepare();
  for(const source of this.view.fx.projectiles.batches.get('marauder')??[]){const mesh=new THREE.InstancedMesh(source.geometry,source.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.view.scene.add(mesh);this.rockets.push(mesh);}
  const url=assetUrl(missileId);if(!url)throw Error('Missing original Viking missile body');const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));g.scene.updateMatrixWorld(true);
  const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),axis=size.z>=Math.max(size.x,size.y)?new THREE.Vector3(0,0,1):size.y>=size.x?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),rotation=new THREE.Quaternion().setFromUnitVectors(axis,forward),scale=.9/Math.max(size.x,size.y,size.z);
  g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh)||n.userData.sc2Role!=='body')return;const geometry=n.geometry.clone(),positions=geometry.getAttribute('position'),p=new THREE.Vector3();for(let i=0;i<positions.count;i++){n.getVertexPosition(i,p).applyMatrix4(n.matrixWorld).sub(center).applyQuaternion(rotation).multiplyScalar(scale);positions.setXYZ(i,p.x,p.y,p.z);}geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();geometry.computeBoundingBox();
   const mesh=new THREE.InstancedMesh(geometry,n.material,256);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.view.scene.add(mesh);this.missiles.push(mesh);
  });
  if(!this.missiles.length)throw Error('Original missile has no verified physical body');const body=new THREE.Box3();for(const m of this.missiles)body.union(m.geometry.boundingBox!);const dimensions=body.getSize(new THREE.Vector3());this.missileDimensions={length:dimensions.z,width:Math.max(dimensions.x,dimensions.y),meshes:this.missiles.length};
 }
 reset(){this.guns.reset();this.materials.reset();this.samples.clear();this.mounts.clear();this.motes=[];this.rocketCount=this.missileCount=this.electricCount=this.fireLayerCount=0;for(const m of [...this.rockets,...this.missiles])m.count=0;this.stats={flights:0,red:0,yellow:0,lightningSegments:0,missiles:0,bounces:0,fireworks:0,fireworkSparks:0,impacts:0,dotFlashes:0,peakFlights:0};}
 private gunEvent(p:AttackPacket,kind:'attack'|'projectile-impact'):VisualEvent{return {serial:p.id,time:this.w.time,kind,rank:p.rank,heroId:p.hero,entityId:p.source.id,unitType:p.source.unitType,modelKey:p.source.modelKey,race:p.source.race,flying:p.source.flying,facing:p.source.attackFacing,x:p.source.x,z:p.source.z,y:p.from.y,end:{x:p.to.x,z:p.to.z},endY:p.to.y,targetId:p.target,siege:false,attackId:'demo:'+p.id,projectileSpeed:26};}
 private sprite(key:string,p:Point3,size:number,life:number,color:number,growth=0,velocity?:Point3,to?:Point3,opacity=1){this.view.fx.emit({asset:(key==='kenney-spark_02'?'fx.hero-skill.':'fx.hero-basic.')+key,...p,vx:velocity?.x??0,vy:velocity?.y??0,vz:velocity?.z??0,start:this.w.time,life,size,growth,color,ground:false,angle:this.w.time*.73,to,longitudinalY:!!to,neutralize:false,opacity,priority:to?'core':'trail'});}
 private sparks(p:Point3,count:number,color:number,force=3,rainbow=false,electric=false){for(let i=0;i<count;i++){const a=i*2.399+this.w.time*.9,r=.45+(i%7)*.085;this.motes.push({at:this.w.time,life:rainbow?.58+(i%5)*.045:.26+(i%5)*.025,p:{...p},velocity:{x:Math.sin(a)*force*r,y:rainbow?1.2+(i%6)*.37:.45+(i%6)*.2,z:Math.cos(a)*force*r},color:rainbow?palette[i%palette.length]:color,width:rainbow?.065+(i%3)*.01:.045,gravity:rainbow?5.8:electric?0:3.2,kind:rainbow?'firework':electric?'electric':'ember'});}if(this.motes.length>512)this.motes.splice(0,this.motes.length-512);}
 private mount(p:AttackPacket,side=''){
  if(p.kind==='bounce')return p.from;const key=p.salvo+':'+side,saved=this.mounts.get(key);if(saved)return saved;
  const source=p.source,model=this.view.gpu.get(source.modelKey??source.unitType),weapon=model?.weaponAt('attack',.05,side||undefined)??{x:0,y:1,z:.5};
  const e={x:source.x,z:source.z,facing:source.attackFacing,flying:source.flying} as VisualEvent,result=weaponWorldPoint(e,weapon,modelPresentationScale(source),0);this.mounts.set(key,result);return result;
 }
 private position(p:AttackPacket,t:number,side=''):Point3{
  const from=this.mount(p,side),result=lerp(from,p.to,t),arc=Math.sin(Math.PI*t);
  if(p.kind==='side'){const d=v(p.to).sub(v(from)).normalize(),lane=Math.sign(-Math.cos(p.source.attackFacing)*(p.to.x-p.source.x)+Math.sin(p.source.attackFacing)*(p.to.z-p.source.z))||p.lane;result.x+=-d.z*lane*.72*arc;result.z+=d.x*lane*.72*arc;result.y+=.12*arc;}
  if(p.kind==='missile'){result.y+=(p.source.flying?.65:1.3)*arc;result.z+=p.lane*.65*arc;}
  if(p.kind==='bounce')result.y+=.16*arc;
  return result;
 }
 private electric(head:Point3,tail:Point3,rank:number,seed:number){
  const d=v(head).sub(v(tail)).normalize(),right=new THREE.Vector3().crossVectors(d,up).normalize();if(right.lengthSq()<.1)right.set(1,0,0);const normal=new THREE.Vector3().crossVectors(d,right).normalize(),strands=rank>=5?2:1,radius=rank>=5?.135:.09,phase=this.w.time*24+seed;
  for(let j=0;j<strands;j++){let prev:Point3|undefined;for(let i=0;i<=42;i++){const q=i/42,a=q*Math.PI*4.9+phase+j*Math.PI+.38*Math.sin(q*37+seed),jitter=.76+.19*Math.sin(i*3.71+phase*.45)+.14*Math.cos(i*1.33+phase),base=lerp(tail,head,q),p={x:base.x+(right.x*Math.cos(a)+normal.x*Math.sin(a))*radius*jitter,y:base.y+(right.y*Math.cos(a)+normal.y*Math.sin(a))*radius*jitter,z:base.z+(right.z*Math.cos(a)+normal.z*Math.sin(a))*radius*jitter};if(prev){this.materials.ribbon('arc',prev,p,rank>=5?.14:.12,i%7===0?0xead4ff:0xb17bff,.88+.12*Math.sin(i*.8+phase)**2,0,true,1.8);this.electricCount++;}prev=p;}}
 }
 private burningHit(p:Point3,rank:number){this.sprite('fireanim_x4',p,rank>=5?.78:.62,.29,0xffa075,.35);this.sparks(p,rank>=5?7:5,0xff9854,2.6);this.sprite('fireball_10',p,.3,.11,0xffd4a2);}
 nativeArea(e:VisualEvent){this.guns.event(e,null);}
 private events(){for(const e of this.simulation.takeEvents()){
  const p=e.packet;
  if(e.kind==='launch'){
   if(p.kind==='main'){for(const side of p.hero==='yamato_battlecruiser'?['Right','Left']:[''])this.guns.event(this.gunEvent(p,'attack'),this.mount(p,side));continue;}
   if(p.kind==='missile'){this.sprite('fireball_10',this.mount(p),.32,.11,0xffd5a0);this.sparks(this.mount(p),3,0xffb475,1.8);}
  }else if(e.kind==='impact'){
   this.stats.impacts++;
   if(p.kind==='main'){for(let i=0;i<(p.hero==='yamato_battlecruiser'?2:1);i++)this.guns.event(this.gunEvent(p,'projectile-impact'),null);if(p.hero==='raynor'&&p.rank>=3)this.burningHit(e.p,p.rank);continue;}
   if(p.kind==='bounce'){this.guns.event(this.gunEvent(p,'projectile-impact'),null);continue;}
   this.sprite('flare2b',e.p,p.kind==='missile'?.65:.28,.095,p.kind==='side'?0xffe1a5:0xffbd88);
   if(p.kind==='missile'){this.sprite('fireanim_x4',e.p,1.15,.38,0xffd4b1,.8);this.sparks(e.p,10,0xffbe8b,4.3);this.sprite('kenney-smoke_04',e.p,.55,.72,0x77736e,1.45,{x:0,y:.65,z:0},undefined,.32);}
   else this.sparks(e.p,4,0xffd47a,2.5);
  }else if(e.kind==='dot'){this.stats.dotFlashes++;this.sprite('flare1_blueelec',e.p,p.rank>=5?.68:.5,.16,0xb991ff);this.sparks(e.p,p.rank>=5?7:4,0xb881ff,2,false,true);}
  else if(e.kind==='line-dot'){this.sprite('flare1_blueelec',e.p,p.rank>=5?.52:.4,.1,0xc1a0ff);this.sparks(e.p,p.rank>=5?5:3,0xbb8cff,1.7,false,true);}
  else if(e.kind==='splash'){
   const n=p.rank>=5?T.tosh.vSparks:T.tosh.iiiSparks;this.stats.fireworks++;this.stats.fireworkSparks+=n;this.sparks(e.p,n,0xffa1da,p.rank>=5?6:4,true);this.sprite('flare2b',e.p,p.rank>=5?.48:.36,.08,0xffcdeb);
   for(const id of e.targets??[]){const target=this.w.entities.get(id);if(target)this.sprite('flare2b',{x:target.x,y:target.flying?6.2:.9,z:target.z},.23,.11,0xd8b0ff);}
  }
 }}
 private renderMotes(){
  const now=this.w.time;this.motes=this.motes.filter(m=>now-m.at<m.life);
  for(const m of this.motes){const age=Math.max(0,now-m.at),q=age/m.life,opacity=(1-q)**1.3,position=(t:number)=>({x:m.p.x+m.velocity.x*t*(1-.32*t),y:Math.max(.04,m.p.y+m.velocity.y*t-.5*m.gravity*t*t),z:m.p.z+m.velocity.z*t*(1-.32*t)}),head=position(age),tail=position(Math.max(0,age-(m.kind==='firework'?.065:.035)));
   this.materials.ribbon('arc',tail,head,m.width*(1-.3*q),m.color,opacity,0,true,1.7);this.materials.sprite('glow',head,m.width*2.7,m.color,.65*opacity,0,age+m.at,true,1.35);
  }
 }
 render(){
  this.events();this.materials.begin();this.rocketCount=this.missileCount=this.electricCount=this.fireLayerCount=0;this.stats.red=this.stats.yellow=this.stats.missiles=this.stats.bounces=0;
  const now=this.w.time,mainGuns=this.simulation.packets.filter(p=>p.kind==='main'&&!(p.hero==='nova'&&p.rank>=3));
  const makeFlight=(p:AttackPacket,to:Point3=p.to,end=p.arrival,side='')=>({rank:p.rank,attackId:'demo:'+p.id+(side?':'+side:''),source:{heroId:p.hero,flying:p.source.flying,unitType:'marauder' as const},from:{x:p.from.x,z:p.from.z},point:{x:p.from.x,z:p.from.z},lastSeen:{x:to.x,z:to.z},target:p.target,lost:false,start:p.born,end,mount:this.mount(p,side)});
  this.guns.useBurningCore(mainGuns.some(p=>p.hero==='raynor'&&p.rank>=3)?this.materials.burningCore(now):null);this.guns.useFlights([...mainGuns.flatMap(p=>p.hero==='yamato_battlecruiser'?['Right','Left'].map(side=>makeFlight(p,p.to,p.arrival,side)):[makeFlight(p)]),...this.simulation.lines.map(line=>makeFlight(line.packet,line.to,line.end))]);this.guns.render(this.w,()=>true,new Map());
  for(const [key,segment] of this.guns.segments){
   if(segment.hero==='nova'&&segment.rank>=3)this.electric(segment.tip,segment.tail,segment.rank,Number(key.slice(5)));
   if(segment.red){this.stats.red++;const d=v(segment.tip).sub(v(segment.tail)).normalize(),hotTail=v(segment.tip).addScaledVector(d,-.65),fireTail=v(segment.tail).addScaledVector(d,-.32),pulse=.9+.1*Math.sin(now*71);
    this.materials.ribbon('fireTrail',fireTail,segment.tip,.38*pulse,0xff8d68,.86,0,false,1.35);this.materials.ribbon('warmTrail',{x:hotTail.x,y:hotTail.y,z:hotTail.z},segment.tip,.13,0xffb17e,.92,0,false,1.3);
    for(let j=0;j<4;j++){const point=lerp(segment.tail,segment.tip,(j+.5)/4);this.materials.sprite('fire',point,.27+.025*Math.sin(j+now*21),j%2?0xff956a:0xff724f,.62,(now*34+j*5)%22,j*1.6+now,false,1.3);}this.fireLayerCount+=6;
   }
  }
  for(const p of this.simulation.packets){const q=Math.max(0,Math.min(1,(now-p.born)/(p.arrival-p.born)));
   if(p.kind==='main'){
    if(p.hero==='swann'&&this.rocketCount<256){const flight=this.guns.flights.find(f=>f.attackId==='demo:'+p.id)!;const total=Math.max(.01,Math.hypot(flight.lastSeen.x-flight.from.x,flight.lastSeen.z-flight.from.z)),travel=Math.hypot(flight.point.x-flight.from.x,flight.point.z-flight.from.z),t=Math.min(1,travel/total),blend=Math.max(0,1-travel/2),mount=flight.mount;obj.position.set(flight.point.x+(mount.x-flight.from.x)*blend,.8+(.6-.8)*t+(mount.y-.8)*blend,flight.point.z+(mount.z-flight.from.z)*blend);obj.rotation.set(0,Math.atan2(flight.lastSeen.x-flight.point.x,flight.lastSeen.z-flight.point.z),0);obj.scale.setScalar(1);obj.updateMatrix();for(const m of this.rockets)m.setMatrixAt(this.rocketCount,obj.matrix);this.rocketCount++;}
    if(p.hero==='raynor'&&p.rank>=3&&now-(this.samples.get(p.id)??-100)>=1/45){this.samples.set(p.id,now);this.sparks(this.position(p,q),1,0xff7a3e,.7);}
    continue;
   }
   const head=this.position(p,q),prior=this.position(p,Math.max(0,q-.035)),direction=v(head).sub(v(prior)).normalize();if(direction.lengthSq()<.1)direction.copy(v(p.to).sub(v(head)).normalize());
   if(p.kind==='side'){
    const hotTail=v(head).addScaledVector(direction,-.28);this.materials.ribbon('arc',{x:hotTail.x,y:hotTail.y,z:hotTail.z},head,.1,0xffe68e,1,0,true,2);this.materials.ribbon('warmTrail',{x:hotTail.x,y:hotTail.y,z:hotTail.z},head,.13,0xfff0ad,.85,0,true,1.8);this.materials.sprite('glow',head,.16,0xffdf89,.8);this.stats.yellow++;
    for(let i=0;i<6;i++){const a=this.position(p,Math.max(0,q-.025*(i+1))),b=this.position(p,Math.max(0,q-.025*i));this.materials.ribbon('arc',a,b,.07*(1-i/8),0xffcf68,.48*(1-i/6),0,true,1.4);}
   }else{
    if(p.kind==='missile'&&this.missileCount<256){obj.position.set(head.x,head.y,head.z);obj.quaternion.setFromUnitVectors(forward,direction);obj.scale.setScalar(1);obj.updateMatrix();for(const m of this.missiles)m.setMatrixAt(this.missileCount,obj.matrix);this.missileCount++;this.stats.missiles++;
     const nozzle=v(head).addScaledVector(direction,-.41),flameEnd=nozzle.clone().addScaledVector(direction,-(.62+.08*Math.sin(now*87+p.id)));this.materials.ribbon('fireTrail',{x:flameEnd.x,y:flameEnd.y,z:flameEnd.z},{x:nozzle.x,y:nozzle.y,z:nozzle.z},.23,0xffd1a3,.95,0,false,1.2);this.materials.sprite('glow',{x:nozzle.x,y:nozzle.y,z:nozzle.z},.12,0xffe1bb,.8);this.fireLayerCount+=2;
     for(let i=1;i<=12;i++){const t=Math.max(0,q-i*.022),smoke=this.position(p,t),fade=(1-i/13)*Math.min(1,(q-t)*16);this.materials.sprite(i%2?'smoke':'smokeLit',smoke,.12+i*.018,0x9a958d,.19*fade,0,p.id+i*.73+now*.2);}
    }else if(p.kind==='bounce'&&this.rocketCount<256){obj.position.set(head.x,head.y,head.z);obj.quaternion.setFromUnitVectors(forward,direction);obj.scale.setScalar(.8);obj.updateMatrix();for(const m of this.rockets)m.setMatrixAt(this.rocketCount,obj.matrix);this.rocketCount++;this.stats.bounces++;const tail=v(head).addScaledVector(direction,-.35);this.materials.ribbon('fireTrail',{x:tail.x,y:tail.y,z:tail.z},head,.12,0xffb887,.65,0,false);}
   }
  }
  const dots=new Map<number,number>();for(const d of this.simulation.dots)dots.set(d.target,Math.max(d.rank,dots.get(d.target)??0));
  for(const [id,rank] of dots){const target=this.w.entities.get(id);if(!target||target.hp<=0)continue;const center={x:target.x,y:target.flying?6.35:.9,z:target.z},radius=rank>=5?.56:.4,arcs=rank>=5?3:2;
   this.materials.sprite('plasma',center,rank>=5?1.15:.9,0xa281d5,.11+.045*Math.sin(now*8+id)**2,Math.floor(now*9+id)%4,id+now*.4,true);
   for(let j=0;j<arcs;j++){let previous:Point3|undefined;for(let i=0;i<=16;i++){const q=i/16,a=q*(.9+.3*Math.sin(now*7+id+j))+now*(1.8+j*.3)+id+j*2.31,r=radius*(1+.08*Math.sin(i*.9+now*11)),p={x:center.x+Math.sin(a)*r,y:center.y+.18*Math.sin(a*2.3+now*9+j),z:center.z+Math.cos(a)*r};if(previous){this.materials.ribbon('arc',previous,p,rank>=5?.12:.1,i%5?0xaa6ff1:0xd5a9ff,.78*Math.sin(q*Math.PI),0,true,1.7);this.electricCount++;}previous=p;}}
  }
  this.renderMotes();this.materials.end();for(const m of this.rockets)commitInstances(m,this.rocketCount);for(const m of this.missiles)commitInstances(m,this.missileCount);
  const active=new Set(this.simulation.packets.map(p=>p.id)),salvos=new Set(this.simulation.packets.map(p=>p.salvo));for(const key of this.samples.keys())if(!active.has(key))this.samples.delete(key);for(const key of this.mounts.keys())if(!salvos.has(Number(key.split(':')[0])))this.mounts.delete(key);
  this.stats.flights=this.simulation.packets.length;this.stats.peakFlights=Math.max(this.stats.peakFlights,this.stats.flights);this.stats.lightningSegments=this.electricCount;
 }
 visualState(){return {...this.stats,cores:this.guns.stats.flights,rocketModels:this.rocketCount+this.missileCount,approvedGuns:this.guns.dimensions(),upgradeMaterials:this.materials.report(),fireLayers:this.fireLayerCount,embers:this.motes.length,missileBody:{id:missileId,count:this.missileCount,...this.missileDimensions},colors:{raynorMain:0xff2834,raynorSide:0xffd935,novaLightning:0xb17bff}};}
}
