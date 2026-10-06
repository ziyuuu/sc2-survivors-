import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Entity,Point,VisualEvent} from '../../simulation/types';
import type {BattleEffects} from './battle-effects';
import {UNIT_SPECTACLE} from '../../data/unit-spectacle';
import type {FamilyId} from '../../data/races';
import {ProtossHeroMaterials} from './protoss-hero-materials';
import {ZergEliteMaterials} from './zerg-elite-materials';
import {TerranEliteMaterials} from './terran-elite-materials';
import {ordinaryActor,ordinaryEmissionScale,ordinaryEvent,ORDINARY_DETAIL} from './ordinary-presentation';
import {OrdinaryMedicalEffects} from './ordinary-medical-effects';
import {commitInstances} from '../units/instance-updates';
import {loadOrdinaryEffects,saveOrdinaryEffects,type OrdinaryEffectQuality} from '../settings/quality';
import {createFlameFanGeometry} from './terran-flame-fan';
import {SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';

type P={x:number;y:number;z:number};
type Echo={e:VisualEvent;from:P;left?:P;life:number;scale:number};
const mix=(a:P,b:P,t:number):P=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const object=new THREE.Object3D();
/** Render-only adapters of real ordinary attacks and support receipts. No simulation mutation or RNG. */
export class NonHeroEffects {
 ready=false;quality:OrdinaryEffectQuality=loadOrdinaryEffects();
 private psionic:ProtossHeroMaterials;private organic:ZergEliteMaterials;private terran:TerranEliteMaterials;private medical:OrdinaryMedicalEffects;
 private serial=0;private time=0;private echoes:Echo[]=[];private missiles:THREE.InstancedMesh[]=[];private needles:THREE.InstancedMesh[]=[];private missileCount=0;private needleCount=0;
 private flameFans?:THREE.InstancedMesh;private fanCount=0;private flameExtents:{origin:P;radius:number;arc:number}[]=[];
 private counts={attacks:0,flights:0,contacts:0,blades:0,beams:0,fields:0,medical:0,mines:0,packets:0,telegraphs:0,statuses:0,decorations:0};
 constructor(private scene:THREE.Scene,private fx:BattleEffects,private camera:THREE.Camera){this.psionic=new ProtossHeroMaterials(scene,camera,fx);this.organic=new ZergEliteMaterials(scene,camera,fx);this.terran=new TerranEliteMaterials(scene,camera,fx);this.medical=new OrdinaryMedicalEffects(scene,fx);}
 async load(){if(this.ready)return;this.psionic.prepare();this.organic.prepare();this.terran.prepare();await this.medical.loadMedicalTextures();for(const [key,list]of [['marauder',this.missiles],['hydralisk',this.needles]] as const)for(const original of this.fx.projectiles.batches.get(key)??[]){const mesh=new THREE.InstancedMesh(original.geometry,original.material,512);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);list.push(mesh);}
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{map:{value:this.terran.burningCore(0).uniforms.map.value},time:{value:0}},vertexShader:'varying vec2 v;varying vec3 tint;void main(){v=uv;tint=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;uniform float time;varying vec2 v;varying vec3 tint;void main(){vec3 t=texture2D(map,vec2(v.x*2.+time*.15,v.y*2.-time*1.8)).rgb;float h=max(t.r,max(t.g,t.b));float edge=smoothstep(0.,.04,v.x)*smoothstep(0.,.04,1.-v.x)*smoothstep(0.,.08,1.-v.y);vec3 rgb=mix(vec3(.9,.08,.01),vec3(1.3,.75,.18),smoothstep(.2,.85,h));gl_FragColor=vec4(rgb*tint,edge*(.45+.4*h));}'});
  this.flameFans=new THREE.InstancedMesh(createFlameFanGeometry(SOURCE_WEAPON_PATTERNS.hellbat.arcDegrees),material,128);this.flameFans.count=0;this.flameFans.frustumCulled=false;this.flameFans.setColorAt(0,new THREE.Color(1,1,1));this.scene.add(this.flameFans);this.ready=true;
 }
 setQuality(q:OrdinaryEffectQuality){this.quality=q;saveOrdinaryEffects(q);}
 reset(){this.serial=this.time=0;this.echoes=[];if(this.ready){this.psionic.reset();this.organic.reset();this.terran.reset();this.medical.reset();for(const m of [...this.missiles,...this.needles,...(this.flameFans?[this.flameFans]:[])])commitInstances(m,0);}}
 report(){return {ready:this.ready,quality:this.quality,decorationDensity:ORDINARY_DETAIL[this.quality],...this.counts,missiles:this.missileCount,needles:this.needleCount,flameExtents:this.flameExtents,medical:this.medical.report(),psionic:this.psionic.report(),organic:this.organic.report(),terran:this.terran.report()};}
 private body(kind:'missile'|'needle',p:P,angle:number,scale=1,tilt=0){const n=kind==='missile'?this.missileCount++:this.needleCount++,list=kind==='missile'?this.missiles:this.needles;if(n>=512)return;object.position.set(p.x,p.y,p.z);object.rotation.set(tilt,angle,0);object.scale.setScalar(scale);object.updateMatrix();for(const m of list)m.setMatrixAt(n,object.matrix);}
 render(w:World,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>P){
  if(!this.ready)return;if(w.time<this.time)this.reset();this.time=w.time;const density=ORDINARY_DETAIL[this.quality];this.psionic.begin(w.time);this.organic.begin(w.time);this.terran.begin(w.time);this.missileCount=this.needleCount=this.fanCount=0;this.flameExtents=[];if(this.flameFans)(this.flameFans.material as THREE.ShaderMaterial).uniforms.time.value=w.time;
  this.counts={attacks:0,flights:0,contacts:0,blades:0,beams:0,fields:0,medical:0,mines:0,packets:0,telegraphs:0,statuses:0,decorations:0};
  const p=(b:Point&{flying?:boolean},height=.65):P=>({x:b.x,z:b.z,y:(b.flying?5.6:w.terrain?.height(b)??0)+height});
  const glow=(at:P,size:number,tint:number,opacity=.8)=>this.psionic.sprite('glow',at,size,tint,opacity,Math.floor(w.time*24)%16);
  const energy=(a:P,b:P,width:number,tint:number,opacity=.8)=>{this.psionic.ribbon('beam',a,b,width,tint,opacity,0,true,.9);};
  const streak=(a:P,b:P,width:number,tint:number,opacity=.8)=>this.terran.ribbon('trace',a,b,width,tint,opacity,0,true,1);
  this.fx.ordinaryEventIds.clear();this.fx.sculptures.ordinarySource=u=>ordinaryActor(u,w);this.fx.supportPresentation=true;
  for(const e of w.visualEvents){const own=ordinaryEvent(e,w),support=!e.heroId&&!e.eliteId&&e.entityId===0&&['support-flight','support-pulse','support-impact','strategic-impact','bile-impact'].includes(e.kind);if(own||support)this.fx.ordinaryEventIds.add(e.serial);if(e.serial<=this.serial||w.time-e.time>.45||!own&&!support)continue;
   const from=own?muzzle(e):{x:e.x,y:e.y,z:e.z},u=w.entities.get(e.entityId);if(e.attackId)this.fx.sculptures.mounts.set(e.attackId,{...from});
   this.echoes.push({e:structuredClone(e),from:{...from},left:e.unitType==='reaper'?{...muzzle(e,'Left')}:undefined,life:e.kind==='attack'?e.unitType==='zealot'||e.unitType==='ultralisk'?.28:.18:e.kind==='strategic-impact'?1.15:.5,scale:u?ordinaryEmissionScale(u):1});
  }this.serial=w.visualEvents.at(-1)?.serial??this.serial;this.echoes=this.echoes.filter(a=>w.time-a.e.time<a.life).slice(-512);
  for(const {e,from,left,life,scale}of this.echoes){if(!visible(e)&&!visible(e.end))continue;const age=Math.max(0,w.time-e.time),fade=Math.pow(Math.max(0,1-age/life),.75),end={...e.end,y:e.endY},profile=UNIT_SPECTACLE[e.unitType as FamilyId],color=profile?.color??(w.expedition.race==='zerg'?0xb9d876:w.expedition.race==='protoss'?0x8bdfff:0xffbc79);
   if(e.kind==='attack'){
    this.counts.attacks++;if(profile?.contact==='children'&&!w.entities.get(e.entityId)?.summonKind)continue;
    glow(from,(profile?.size??.14)*2.2*scale,profile?.edge??color,fade*.7);
    if(profile?.contact==='claw'||profile?.contact==='blade'){
     const count=e.unitType==='zealot'?2:e.unitType==='ultralisk'?2:1,reach=Math.max(.3,Math.hypot(end.x-from.x,end.z-from.z));
     for(let j=0;j<count;j++){const points=Array.from({length:17},(_,i)=>{const t=i/16,a=e.facing+(t-.5)*1.5+(j-.5)*.16,r=reach*(.86+.14*Math.sin(t*Math.PI));return {x:from.x+Math.sin(a)*r,y:from.y+.15+Math.sin(t*Math.PI)*.25+j*.1,z:from.z+Math.cos(a)*r};});this.psionic.stroke(points,points.map((_,i)=>(e.unitType==='ultralisk'?.31:e.unitType==='zealot'?.26:.13)*Math.sin(i/16*Math.PI)),color,.7*fade,.7);}this.counts.blades++;
    }else if(['hellion','lurker','colossus'].includes(e.unitType??'')){
     // Their saved flame shapes or progressive weapon-area receipts own the live extent.
    }else if(profile?.contact==='beam'&&e.unitType!=='colossus'){
     energy(from,end,e.unitType==='void_ray'?.34:.18,color,fade*.8);glow(end,.5,color,fade*.6);this.counts.beams++;
    }else if(!e.projectileSpeed){
     if(e.race==='protoss')energy(from,end,e.unitType==='immortal'?.16:.1,color,fade);else streak(from,end,e.unitType==='tank'?.18:.08,color,fade);if(left)streak(left,end,.08,color,fade);this.contact(end,e.race??'terran',profile?.size??.13,fade,age);this.counts.contacts++;
    }
    if(density>.2&&age<.13){this.terran.sprite('spark',from,.22*scale,profile?.edge??color,.35*fade,Math.floor(age*24));this.counts.decorations++;}continue;
   }
   if(e.kind==='support-flight'){if(e.race==='protoss')energy(from,end,.55,0xa5dfff,fade*.7);else streak(from,end,.12,0xffcb82,fade);this.counts.beams++;continue;}
   if(e.kind==='weapon-area'&&e.unitType==='lurker'){this.body('needle',{...end,y:end.y-.25+Math.sin(Math.min(1,age/.32)*Math.PI)*.5},e.facing,1.15,-Math.PI/3);this.organic.sprite('dust',{...end,y:end.y-.4},.7,0xb2a27d,.24*fade,Math.floor(age*24));this.counts.blades++;continue;}
   if(e.kind==='weapon-area'&&e.unitType==='colossus'){energy(from,end,.3,0xffbd75,fade*.8);glow(end,.55,0xffdfa3,fade*.7);this.counts.beams++;continue;}
   if(e.kind==='skill-heal'){this.organic.sprite('tissue',end,1.15,0xb2df80,fade*.45,Math.floor(age*18));this.counts.medical++;continue;}
   const big=e.kind==='strategic-impact',support=e.entityId===0,r=big?8:support?e.kind==='support-pulse'?.45:.85:e.unitType==='baneling'?2.2:profile?.size?profile.size*3:.6;
   this.contact(end,e.race??w.expedition.race,big?3:r,fade,age);this.counts.contacts++;
   for(let i=0;i<Math.ceil((big?14:4)*density);i++){const a=i*2.399,dist=Math.min(r,age*r*2),q={x:end.x+Math.sin(a)*dist,y:end.y+.1+age*(i%3),z:end.z+Math.cos(a)*dist};if(e.race==='zerg'||!e.race&&w.expedition.race==='zerg')this.organic.sprite('venom',q,.28,color,fade*.6,Math.floor(age*24));else this.terran.sprite('spark',q,.24,color,fade,Math.floor(age*24));this.counts.decorations++;}
  }
  for(const f of w.weaponFlights){const u=f.source;if(!ordinaryActor(u,w)||w.time<f.start||!visible(f.point))continue;
   if(f.hop===0&&!this.fx.sculptures.mounts.has(f.attackId)){
    // Reconstruct a frozen socket after save/load from the saved launch body and pose.
    const at=p({...f.from,flying:u.flying}),end=p({...f.lastSeen,flying:w.body(f.target)?.flying});
    const launch:VisualEvent={...f.from,serial:f.id,time:f.start,kind:'attack',unitType:u.unitType,entityId:u.id,modelKey:u.modelKey,rank:u.rank,race:u.race,flying:u.flying,facing:u.attackFacing??u.facing,siege:u.mode==='siege',y:at.y,endY:end.y,end:{...f.lastSeen},shotSequence:u.shotSequence,attackId:f.attackId,projectileSpeed:f.speed};
    this.fx.sculptures.mounts.set(f.attackId,muzzle(launch));
   }
   const target=f.lost?undefined:w.body(f.target),total=Math.max(.01,Math.hypot(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z)),travel=Math.hypot(f.point.x-f.from.x,f.point.z-f.from.z),t=Math.min(1,travel/total),origin=p({...f.from,flying:f.hop>0?w.body(f.seen.at(-1)!)?.flying:u.flying},.8),to=p({...f.point,flying:target?.flying}),mount=f.hop>0?undefined:this.fx.sculptures.mounts.get(f.attackId),blend=Math.max(0,1-travel/2),head={x:f.point.x+(mount?mount.x-f.from.x:0)*blend,y:origin.y+(to.y-origin.y)*t+(mount?mount.y-origin.y:0)*blend,z:f.point.z+(mount?mount.z-f.from.z:0)*blend},a=Math.atan2(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z),length=Math.min(travel,.9),tail={x:head.x-Math.sin(a)*length,y:head.y,z:head.z-Math.cos(a)*length},color=UNIT_SPECTACLE[u.unitType as FamilyId]?.color??0xbfe8ff;
   if(u.unitType==='marauder'||u.unitType==='hydralisk'){/* Existing original missile / spine bodies retain their authoritative position. */}
   else if(u.race==='terran')this.body('missile',head,a,u.unitType==='thor'?1:.7);
   else if(u.unitType==='queen')this.body('needle',head,a,.85);
   else if(u.unitType==='mutalisk'){for(let j=0;j<3;j++)this.body('needle',head,a+w.time*15+j*Math.PI*2/3,.58);}
   else if(u.race==='zerg'){this.organic.sprite('acid',head,u.unitType==='corruptor'?.65:.5,color,.85,Math.floor(w.time*22));this.organic.skin(head,{x:.19,y:.22,z:.28},color,a);}
   else {energy(tail,head,u.unitType==='adept'?.28:.23,color);glow(head,.52,color,.75);}
   if(u.race==='zerg')this.organic.ribbon('fluid',tail,head,.15,color,.55);else if(u.race==='terran')this.terran.ribbon('warmTrail',tail,head,.18,0xffc17b,.5);this.counts.flights++;
  }
  for(const f of w.effects){const u=w.entities.get(f.source);if(!ordinaryActor(u,w)||f.until<=w.time||!visible(f.end))continue;
   if(f.kind==='flame'&&u!.unitType==='hellion'){const from=p(f,.12),to=p(f.end,.12),fade=Math.min(1,(f.until-w.time)/.1),a=Math.atan2(to.x-from.x,to.z-from.z);
    if(f.radius>.4&&this.flameFans&&this.fanCount<128){const radius=SOURCE_WEAPON_PATTERNS.hellbat.radius,origin={x:to.x-Math.sin(a)*radius,y:to.y,z:to.z-Math.cos(a)*radius};object.position.set(origin.x,origin.y,origin.z);object.rotation.set(0,a,0);object.scale.set(radius,1,radius);object.updateMatrix();this.flameFans.setMatrixAt(this.fanCount,object.matrix);this.flameFans.setColorAt(this.fanCount++,new THREE.Color(fade,fade,fade));this.flameExtents.push({origin,radius,arc:SOURCE_WEAPON_PATTERNS.hellbat.arcDegrees});}
    else this.terran.ribbon('fireTrail',{...from,y:from.y+.3},{...to,y:to.y+.3},.3,0xffa346,.75*fade,Math.floor(w.time*24));this.counts.beams++;}
   if(f.kind==='bile'){const left=f.until-w.time,head=p(f.end,Math.max(.2,left*4));this.organic.sprite('acid',head,.9,0xd3d378,.9,Math.floor(w.time*24));this.organic.ribbon('fluid',{...head,y:head.y+.9},head,.4,0xb0c55a,.6);this.counts.flights++;}
  }
  for(const s of w.expedition.spells){const u=w.entities.get(s.source);if(!ordinaryActor(u,w)||s.until<=w.time||!visible(s))continue;const at=p(s,.15);if(s.kind==='storm'){for(let i=0;i<7;i++){const a=i*2.399,r=s.radius*Math.sqrt((i+.5)/7)*.8,b={x:at.x+Math.sin(a)*r,y:at.y,z:at.z+Math.cos(a)*r},points=Array.from({length:6},(_,j)=>({x:b.x+Math.sin(i*3+j*6+w.time*11)*.15,y:b.y+2.5-j*.5,z:b.z+Math.cos(j*3+i)*.1}));this.psionic.stroke(points,[.02,.1,.13,.11,.08,.01],0xb5cfff,.65,.9);}this.psionic.sprite('plasma',at,s.radius*2,0x98acdd,.16,Math.floor(w.time*16)%16);}else if(s.kind==='transfusion'){const patient=s.target===null?undefined:w.entities.get(s.target);if(patient?.hp){const a=p(u!),b=p(patient),points=Array.from({length:9},(_,i)=>{const t=i/8,q=mix(a,b,t);return {...q,y:q.y+Math.sin(t*Math.PI)*.65};});for(let i=1;i<points.length;i++)this.organic.ribbon('fluid',points[i-1],points[i],.22,0xb8e598,.6);this.organic.skin(b,{x:.65,y:.8,z:.65},0xa7d984);this.counts.medical++;}}else{this.psionic.sprite('plasma',at,s.radius*1.5,0x9bdefc,.18,Math.floor(w.time*16)%16);}this.counts.fields++;}
  for(const u of w.entities.values()){if(!ordinaryActor(u,w)||u.hp<=0||!visible(u))continue;if((u.barrier??0)>0){this.psionic.sprite('plasma',p(u),Math.max(1.3,u.unitRadius*2.5),0x9bd7f4,.28,Math.floor(w.time*20)%16);this.counts.statuses++;}if((u.recoveryUntil??0)>w.time){this.organic.skin(p(u,.35),{x:.48,y:.5,z:.48},0xc2d477);this.counts.statuses++;}}
  this.support(w,visible,p,glow,energy,streak,density);
  this.medical.quality=this.quality;this.medical.render(w,this.camera,visible);this.psionic.end();this.organic.end();this.terran.end();if(this.flameFans)commitInstances(this.flameFans,this.fanCount);for(const m of this.missiles)commitInstances(m,Math.min(512,this.missileCount));for(const m of this.needles)commitInstances(m,Math.min(512,this.needleCount));
 }
 private contact(at:P,race:string,size:number,fade:number,age:number){if(race==='zerg'){this.organic.sprite('burst',at,size*2,0xc4db81,fade*.8,Math.floor(age*24));this.organic.sprite('tissue',at,size*2.4,0x9abc60,fade*.35,Math.floor(age*20));}else if(race==='protoss'){this.psionic.sprite('glow',at,size*1.6,0xccecff,fade*.8,Math.floor(age*24));this.psionic.sprite('plasma',at,size*2.1,0x85b6e7,fade*.45,Math.floor(age*20));}else {this.terran.sprite('fire',at,size*2,0xffc583,fade*.8,Math.floor(age*24),0);this.terran.sprite('smokeLit',at,size*2.7,0xd0a481,fade*.35,Math.floor(age*20),0);}}
 private support(w:World,visible:(p:Point)=>boolean,p:(b:Point&{flying?:boolean},h?:number)=>P,glow:(p:P,s:number,c:number,a?:number)=>void,energy:(a:P,b:P,width:number,c:number,alpha?:number)=>void,streak:(a:P,b:P,width:number,c:number,alpha?:number)=>void,density:number){
  const s=w.expedition.support,u=s.unique,race=w.expedition.race,color=race==='zerg'?0xb7d97b:race==='protoss'?0x8bdafa:0xffbc6f;
  for(const m of s.mines){if(!visible(m.point))continue;const at=p(m.point,.26);if(race==='protoss'){for(let i=0;i<3;i++){const a=i*Math.PI*2/3+w.time*.25;energy(at,{x:at.x+Math.sin(a)*.4,y:at.y+.45,z:at.z+Math.cos(a)*.4},.18,0x7cd6ff,.7);}glow(at,.6,color,.55);}else if(race==='zerg')this.organic.skin(at,{x:.45,y:.35,z:.45},color);else if(m.phase!=='buried')this.terran.sprite('smoke',at,.8,0xad9985,.24,Math.floor(w.time*16));this.counts.mines++;}
  for(const impact of s.impacts){if(!visible(impact.point))continue;const big=impact.kind==='strategic',left=impact.at-w.time,radius=big?8:2.5,base=p(impact.point,.1),head={...base,y:base.y+Math.max(.2,left*(big?6:10))};
   // Eight fixed rim marks keep the real warning radius visible on every quality tier.
   for(let i=0;i<8;i++){const a=i*Math.PI/4,q={x:base.x+Math.sin(a)*radius,y:base.y,z:base.z+Math.cos(a)*radius};energy({...q,y:q.y+.12},{...q,x:q.x-Math.sin(a)*.35,z:q.z-Math.cos(a)*.35},.09,color,.65);}
   if(race==='terran'){this.body('missile',head,0,big?2:1,Math.PI/2);this.terran.ribbon('warmTrail',head,{...head,y:head.y+(big?2:1)},big?.55:.24,color,.65);}else if(race==='zerg'){this.organic.sprite('acid',head,big?2.3:.9,color,.9,Math.floor(w.time*24));this.organic.skin(head,{x:big?.8:.3,y:big?1.2:.45,z:big?.8:.3},color);}else{energy({...base,y:base.y+7},head,big?.7:.32,color,.6);glow(base,big?2.3:.9,color,.4+Math.max(0,1-left/(big?3:.75))*.3);}this.counts.telegraphs++;
  }
  for(const packet of u.packets){if(packet.start>w.time||packet.at<=w.time)continue;const t=(w.time-packet.start)/Math.max(.001,packet.at-packet.start),target=w.body(packet.target),from=p(packet.from,1),to=p({...packet.point,flying:packet.air??target?.flying},.7),head=mix(from,to,t);if(packet.kind==='echo'){glow(to,.9,0xbad6ff,.45);this.psionic.sprite('plasma',to,1.3,0x97a3ff,.3,Math.floor(w.time*18)%16);}else if(packet.kind==='missile'){head.y+=Math.sin(t*Math.PI)*3;this.body('missile',head,Math.atan2(to.x-from.x,to.z-from.z),.85);this.terran.ribbon('warmTrail',mix(from,head,.9),head,.25,color,.7);}else streak(mix(from,to,Math.max(0,t-.2)),head,.13,color,.85);this.counts.packets++;}
  for(const orb of u.orbs)if(visible(orb.point)){const at=p(orb.point,.65);this.organic.skin(at,{x:.22,y:.25,z:.22},0xb6dc78);this.organic.sprite('acid',at,.65,0xd1eba0,.8,Math.floor(w.time*20));this.counts.statuses++;}
  for(const [id,parasite]of Object.entries(u.parasites)){const target=w.entities.get(+id);if(!target?.hp||parasite.until<=w.time||!visible(target))continue;const at=p(target);this.organic.skin(at,{x:target.unitRadius+.12,y:.6,z:target.unitRadius+.12},0xa8c661);this.counts.statuses++;}
  for(const [id,reserve]of Object.entries(u.reserves)){const target=w.entities.get(+id);if(!target?.hp||reserve.until<=w.time||reserve.amount<=0||!visible(target))continue;this.psionic.sprite('plasma',p(target),Math.max(1,target.unitRadius*2.6),0x87c9ed,.18+.16*Math.min(1,reserve.amount/Math.max(1,(target.maxShield??1)*.3)),Math.floor(w.time*16)%16);this.counts.statuses++;}
  const burns=new Map<number,number>();for(const b of s.burns)if(b.until>w.time)burns.set(b.target,(burns.get(b.target)??0)+1);for(const [id,n]of burns){const target=w.entities.get(id);if(!target?.hp||!visible(target))continue;const at=p(target,.5);if(race==='zerg')this.organic.skin(at,{x:target.unitRadius+.15,y:.7,z:target.unitRadius+.15},0xb5d465);else if(race==='protoss')this.psionic.sprite('plasma',at,1.1+n*.15,0xa4a2f3,.3,Math.floor(w.time*24)%16);else this.terran.sprite('fire',at,.8+n*.15,0xffb15a,.6,Math.floor(w.time*24));this.counts.statuses++;}
  if(u.activeUntil>w.time){for(const target of w.allies()){if(!visible(target)||race==='zerg'&&!target.attributes.includes('Biological'))continue;const at=p(target,.4);if(race==='zerg')this.organic.skin(at,{x:target.unitRadius+.13,y:.7,z:target.unitRadius+.13},0xbed879);else {for(let i=0;i<2;i++){const side=i?1:-1,from={...at,x:at.x+Math.cos(target.facing)*side*.2,z:at.z-Math.sin(target.facing)*side*.2};streak(from,{x:from.x-Math.sin(target.facing)*.8,y:from.y,z:from.z-Math.cos(target.facing)*.8},.15,0xffb974,.65);}}this.counts.statuses++;}}
  for(const child of w.allies())if(child.temporaryKind==='fun-brood'&&visible(child)){this.organic.sprite('tissue',p(child,.12),.7,0xa7ca72,.25,Math.floor(w.time*20));this.counts.statuses++;}
  if(u.landing&&visible(u.landing.point)){const at=p(u.landing.point,.1);for(let i=0;i<4;i++){const a=i*Math.PI/2;this.terran.sprite('smoke', {x:at.x+Math.sin(a),y:at.y+.25,z:at.z+Math.cos(a)},1.1,0xc2bca4,.22,Math.floor(w.time*16));}this.counts.telegraphs++;}
  if(u.prism){const b=u.prism,at=p(b.origin,3),end=p({x:b.origin.x+b.direction.x*14,z:b.origin.z+b.direction.z*14},.6),start=b.next-(10-b.remaining)*.2;glow(at,1.5,0xb8e7ff,.75);for(let i=0;i<3;i++){const a=w.time+i*Math.PI*2/3,q={x:at.x+Math.sin(a)*.55,y:at.y+Math.cos(a)*.35,z:at.z+Math.cos(a)*.55};energy(q,at,.25,color,.7);}if(w.time>=start){energy(at,end,1.1,color,.45);energy(at,end,.55,0xc2edff,.8);glow(end,1.35,color,.65);}this.counts.beams++;}
 }
}
