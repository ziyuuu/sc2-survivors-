import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {restoreSc2Materials,sc2BodyBounds} from '../loaders/sc2-materials';
import type {World} from '../../simulation/world';
import type {BattleEffects} from './battle-effects';
import {revisedElite} from '../../simulation/combat/terran-elite-runtime';
import {AIR_HEIGHT} from '../../data/terrain';
import {commitInstances} from '../units/instance-updates';
import {TerranEliteMaterials} from './terran-elite-materials';
import type {VisualEvent} from '../../simulation/types';
import {KNIGHT_FLAME_ARC} from './terran-flame-fan';

/** Presentation reads real saved flights and clocks. It never creates attacks or gameplay IDs. */
export class TerranEliteEffects {
 quality:'full'|'balanced'|'low'='full';private serial=0;private tick=-1;private missiles:THREE.InstancedMesh[]=[];private shells:THREE.InstancedMesh;private shellCount=0;private missileCount=0;
 private group=new THREE.Group();private obj=new THREE.Object3D();private overlays:TerranEliteMaterials;private mounts=new Map<number,{x:number;y:number;z:number}>();private launched=new Set<number>();
 private fans:{source:number;origin:{x:number;z:number};radius:number;facing:number;arcDegrees:number}[]=[];
 constructor(scene:THREE.Scene,private fx:BattleEffects,camera:THREE.Camera){this.overlays=new TerranEliteMaterials(scene,camera,fx);scene.add(this.group);this.shells=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:0xcfc2a4,metalness:.85,roughness:.25,emissive:0x66411d,emissiveIntensity:.45}),256);this.shells.count=0;this.shells.frustumCulled=false;this.group.add(this.shells);}
 async load(){this.overlays.prepare();const url=assetUrl('model.hero-upgrade.vikingfightermissile');if(!url)return;const g=await restoreSc2Materials(await new GLTFLoader().loadAsync(url));g.scene.updateMatrixWorld(true);const box=sc2BodyBounds(g.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=.72/Math.max(size.x,size.y,size.z);g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const geometry=n.geometry.clone();geometry.applyMatrix4(n.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(scale,scale,scale);const mesh=new THREE.InstancedMesh(geometry,n.material,256);mesh.count=0;mesh.frustumCulled=false;this.group.add(mesh);this.missiles.push(mesh);});}
 reset(){this.overlays.reset();this.mounts.clear();this.launched.clear();this.fans=[];this.serial=0;this.tick=-1;this.shells.count=0;for(const m of this.missiles)m.count=0;}
 report(){return {shells:this.shellCount,missiles:this.missileCount,quality:this.quality,flameFans:this.fans,materials:this.overlays.report()};}
 render(w:World,camera:THREE.Camera,visible:(p:{x:number;z:number})=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>{x:number;y:number;z:number}){this.overlays.begin(w.time);this.fans=[];this.shellCount=0;this.missileCount=0;const density=this.quality==='full'?1:this.quality==='balanced'?.55:.25;
  for(const p of w.weaponFlights){const u=p.source;if(!revisedElite(u)||w.time<p.start||!visible(p.point))continue;const target=w.body(p.target),r=Math.max(.01,Math.hypot(p.lastSeen.x-p.from.x,p.lastSeen.z-p.from.z)),t=Math.min(1,Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z)/r),fromY=u.flying?AIR_HEIGHT+.4:.8,toY=target?.flying?AIR_HEIGHT+.4:.6,y=fromY+(toY-fromY)*t+(u.unitType==='tank'?Math.sin(t*Math.PI)*1.6:0),angle=Math.atan2(p.lastSeen.x-p.point.x,p.lastSeen.z-p.point.z);let mount=this.mounts.get(p.id);if(!mount){const e=w.visualEvents.find(e=>e.attackId===p.attackId);mount=e?muzzle(e,u.unitType==='reaper'&&p.id%2===0?'Left':'Right'):{x:p.from.x,y:fromY,z:p.from.z};this.mounts.set(p.id,mount);}const blend=Math.max(0,1-Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z)/2),head={x:p.point.x+(mount.x-p.from.x)*blend,y:y+(w.terrain?.height(p.point)??0)+(mount.y-fromY)*blend,z:p.point.z+(mount.z-p.from.z)*blend},dir={x:Math.sin(angle),y:(toY-fromY)/r,z:Math.cos(angle)},tail={x:head.x-dir.x*.55,y:head.y-dir.y*.55,z:head.z-dir.z*.55};this.obj.position.set(head.x,head.y,head.z);
   if(!this.launched.has(p.id)){this.launched.add(p.id);this.fx.emit({asset:'fx.muzzle.0',...mount,vx:0,vy:0,vz:0,start:w.time,life:.07,size:u.unitType==='tank'?.6:.2,growth:.1,color:u.eliteId==='marine.2'?0x7abfff:0xffc07a,ground:false,angle:0,priority:'core',neutralize:true});}
   const missile=u.unitType==='viking'&&u.nativeMode!=='viking_assault'||u.unitType==='thor'&&target?.flying;
   this.overlays.ribbon(missile?'fireTrail':u.eliteId==='marine.2'?'trace':'warmTrail',tail,head,missile?.18:.055,u.eliteId==='marine.2'?0x6aaeff:0xffbd76,.85,Math.floor(w.time*24)%16);
   if(u.eliteId==='reaper.2'&&(u.eliteCombat?.cycles??11)<=10){this.overlays.sprite('fire',head,.19,0xff721c,.8,Math.floor(w.time*32)%16);this.overlays.sprite('glow',head,.22,0xffa255,.4);}this.obj.rotation.set(0,angle,0);
   if(u.unitType==='viking'&&u.nativeMode!=='viking_assault'||u.unitType==='thor'&&target?.flying){if(this.missileCount<256){this.obj.scale.setScalar(1);this.obj.updateMatrix();for(const m of this.missiles)m.setMatrixAt(this.missileCount,this.obj.matrix);this.missileCount++;}}
   else if(u.unitType!=='marauder'&&this.shellCount<256){const width=u.unitType==='tank'?.11:u.unitType==='thor'?.09:.035;this.obj.scale.set(width,width,width*(u.unitType==='tank'?3:5));this.obj.updateMatrix();this.shells.setMatrixAt(this.shellCount,this.obj.matrix);this.shells.setColorAt(this.shellCount,new THREE.Color(u.eliteId==='marine.2'?0x75cfff:u.eliteId==='reaper.2'?0xffbf84:0xebd9b1));this.shellCount++;}
  }
  this.fields(w,visible,density,muzzle);this.overlays.end();const active=new Set(w.weaponFlights.map(p=>p.id));for(const id of this.mounts.keys())if(!active.has(id)){this.mounts.delete(id);this.launched.delete(id);}commitInstances(this.shells,this.shellCount);for(const m of this.missiles)commitInstances(m,this.missileCount);
  if(this.tick===w.tick)return;this.tick=w.tick;
  const emit=(asset:string,p:{x:number;y?:number;z:number},size:number,life:number,color:number,ground=false,core=false)=>this.fx.emit({asset,x:p.x,y:p.y??.3,z:p.z,vx:0,vy:ground?0:.25,vz:0,start:w.time,life,size,growth:.25,color,ground,angle:0,priority:core?'core':'decoration',neutralize:true});
  for(const e of w.visualEvents){if(e.serial<=this.serial)continue;const u=w.entities.get(e.entityId);if(!u||!revisedElite(u))continue;const p={x:e.end.x,y:e.endY,z:e.end.z},age=w.time-e.time;if(age>.3)continue;
   if(e.kind==='projectile-impact'){emit(u.unitType==='marauder'?'fx.marauder.impact.2':'fx.impact.0',p,u.unitType==='tank'?2:u.unitType==='thor'?.7:.26,.3,u.eliteId==='marine.2'?0x8bcfff:0xffc999,false,true);}
   if(['skill-impact','weapon-area','strategic-impact'].includes(e.kind)){const r=u.eliteId==='science_vessel.3'?5:u.eliteId==='viking.2'?4:3,c=u.eliteId==='science_vessel.2'?0x86f185:u.eliteId==='science_vessel.3'?0x8ce7ff:0xffce95;emit('fx.impact.0',p,r*1.5,.45,c,true,true);for(let i=0;i<Math.ceil(9*density);i++){const a=i*2.399,rr=(i%3+1)*r/3;emit('fx.impact.1',{x:p.x+Math.sin(a)*rr,y:.25,z:p.z+Math.cos(a)*rr},.5,.5,c);}}
  }this.serial=w.visualEvents.at(-1)?.serial??this.serial;
  if(w.tick%6===0){
   for(const p of w.weaponFlights)if(revisedElite(p.source)&&w.time>=p.start&&visible(p.point)&&(p.source.unitType==='viking'||p.source.unitType==='thor'))emit('fx.flameimpact.0',{...p.point,y:p.source.flying?AIR_HEIGHT:.7},.23,.15,0xffce89);

  }
 }
 private fields(w:World,visible:(p:{x:number;z:number})=>boolean,density:number,muzzle:(e:VisualEvent)=>{x:number;y:number;z:number}){
  const point=(p:{x:number;z:number},y=.3)=>({x:p.x,y:(w.terrain?.height(p)??0)+y,z:p.z});
  const patch=(p:{x:number;z:number},radius:number,age:number,color:number,fire=true)=>{
   const n=Math.ceil(13*density);for(let i=0;i<n;i++){const angle=i*2.399+age*.17,r=radius*Math.sqrt((i+.5)/n)*.8,q={x:p.x+Math.sin(angle)*r,z:p.z+Math.cos(angle)*r};
    if(fire)this.overlays.sprite('fire',point(q,.25+(i%3)*.18),.7+(i%3)*.22,color,.7,Math.floor((w.time*28+i*3)%16),i*.7,false);
    this.overlays.sprite('smoke',point(q,.35+age*.3),.9+(i%3)*.25,fire?0xa69b86:0x8ac38a,.28,0,i*.6);
   }
  };
  for(const f of w.effects){const u=w.entities.get(f.source);if(!u||!revisedElite(u)||f.until<=w.time||!visible(f.end)&&!visible(u))continue;
   if(f.kind==='flame'){
    if(u.eliteId==='hellion.2'){
     const radius=f.radius,angle=Math.atan2(f.end.x-f.x,f.end.z-f.z),origin=point(f,.5),remaining=f.until-w.time,fade=Math.min(1,remaining/.1);
     this.fans.push({source:u.id,origin:{x:f.x,z:f.z},radius,facing:angle,arcDegrees:KNIGHT_FLAME_ARC});
     this.overlays.flameFan(origin,angle,radius,.7*fade,f.id);
     this.overlays.flameFan({...origin,y:origin.y+.28},angle,radius,.32*fade,f.id+2);
     // Embers are inset; the connected textured sheets carry the whole fan in all qualities.
     const n=Math.ceil(42*density);for(let i=0;i<n;i++){const a=angle+((i*.61803398875)%1-.5)*Math.PI*135/180,r=radius*(.14+.72*Math.sqrt((i+.5)/n)),p=point({x:f.x+Math.sin(a)*r,z:f.z+Math.cos(a)*r},.55+(i%3)*.12);
      this.overlays.sprite('fire',p,.32+radius*.035,0xffc074,.48*fade,Math.floor((w.time*30+i*3)%16),i*.7,false);
      if(i%9===0)this.overlays.sprite('smoke',{...p,y:p.y+.3},.65,0x8b7764,.12*fade,0,i*.6);
     }
     const e=[...w.visualEvents].reverse().find(e=>e.entityId===u.id&&e.kind==='attack'),mount=e?muzzle(e):origin;
     this.overlays.sprite('glow',mount,.45,0x9ebeff,.55*fade);this.overlays.sprite('fire',mount,.6,0xffd5a0,.85*fade,Math.floor(w.time*30)%16);continue;
    }
    const length=Math.hypot(f.end.x-u.x,f.end.z-u.z),angle=Math.atan2(f.end.x-u.x,f.end.z-u.z),strands=3;
    const e=[...w.visualEvents].reverse().find(e=>e.entityId===u.id&&e.kind==='attack');const from=e?muzzle(e):undefined;
    const base=from??point({x:u.x+Math.sin(angle)*.7,z:u.z+Math.cos(angle)*.7},.6);
    for(let j=0;j<strands;j++){const a=angle+(j-1)*.015,segments=Math.ceil(length/1.2);
     for(let i=0;i<segments;i++){const t=(i+.5)/segments,r=t*length,dr=length/segments*.8,head=point({x:base.x+Math.sin(a)*(r+dr),z:base.z+Math.cos(a)*(r+dr)},.6+.08*Math.sin(w.time*18+i+j)),tail={x:base.x+Math.sin(a)*Math.max(0,r-dr),y:head.y,z:base.z+Math.cos(a)*Math.max(0,r-dr)};
      this.overlays.ribbon('fireTrail',tail,head,.27+t*.2,0xffaa4e,.72,Math.floor((w.time*24+i*3+j)%16),false);
      this.overlays.sprite('fire',head,.32+t*.5,0xffb857,.66,Math.floor((w.time*30+i+j)%16),i*.5,false);
      if(i%3===0&&j===0)this.overlays.sprite('smoke',point(head,.65),.6+t*.55,0x82796b,.23,0,i*.6);
     }
    }
    this.overlays.sprite('glow',base,.45,0x86aaff,.65);this.overlays.sprite('fire',base,.65,0xffd9ad,.85,Math.floor(w.time*30)%16);
   }else if(f.kind==='explosion'){
    const age=.5-(f.until-w.time),fade=Math.max(0,1-age/.6);this.overlays.sprite('glow',point(f.end,.15),f.radius*2,0xffb562,fade*.4);
    this.overlays.sprite('fire',point(f.end,.7),f.radius*1.3,0xffd6a7,fade,Math.floor(age*30)%16);patch(f.end,f.radius,age,0xff9b41);
   }
  }
  for(const a of w.terranElites.areas)if(a.until>w.time&&visible(a.point))patch(a.point,a.radius,w.time-a.next+1,a.kind==='radiation'?0x7acf61:0xffa64d,a.kind==='fire');
  for(const f of w.p4Samples.fires)if(f.until>w.time&&visible(f.point)){const age=w.time-(f.until-2);patch(f.point,4.2,age,0xffb974);if(age<.65){this.overlays.sprite('fire',point(f.point,.6),5.8,0xffd3a0,1-age/.7,Math.floor(age*24)%16);this.overlays.sprite('glow',point(f.point,.1),8,0xffa358,(1-age/.7)*.5);}}
  for(const m of w.p4Samples.mines)if(visible(m.point)&&m.phase!=='buried'){const q={x:m.point.x-Math.sin(m.facing)*.35,z:m.point.z-Math.cos(m.facing)*.35};this.overlays.sprite('smoke',point(q,.2),m.phase==='emerging'?.9:.55,0xafa492,.3,0,w.time*.5);}
  for(const u of w.allies()){if(!revisedElite(u)||!visible(u))continue;const s=u.eliteCombat;if(!s)continue;const head=point(u,u.flying?AIR_HEIGHT+.5:1.1);
   if(u.eliteId==='marine.1'&&s.started!==null){const heat=Math.min(1,(w.time-s.started)/5);this.overlays.sprite('glow',head,.28+heat*.22,0xff633c,.28+heat*.25);}
   if(u.eliteId==='thor.3'&&['warmup','overdrive'].includes(s.mode))for(let i=0;i<2;i++)this.overlays.sprite('glow',{...head,x:head.x+(i?1:-1)*.8},s.mode==='overdrive'?1.1:.65,0xff7c2f,.45);
   if(u.eliteId==='banshee.3'&&s.charge>0)this.overlays.sprite('glow',head,.45,0xffd797,.18+Math.min(.3,s.charge/2600*.3));
  }
 }

}
