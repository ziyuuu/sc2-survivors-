import {isProtossEliteId} from '../../data/protoss-elites';
import {isTerranEliteId} from '../../data/terran-elites';
import {isZergEliteId} from '../../data/zerg-elites';
import {revisedZergElite} from '../../simulation/combat/zerg-elite-runtime';
import {revisedElite} from '../../simulation/combat/terran-elite-runtime';
import * as THREE from 'three';
import {HERO_SPECTACLE,heroVisualTier,type CoreShape} from '../../data/hero-spectacle';
import {UNIT_SPECTACLE} from '../../data/unit-spectacle';
import type {FamilyId} from '../../data/races';
import {HEROES,HERO_SKILL_FLIGHT} from '../../data/heroes';
import type {World} from '../../simulation/world';
import type {Point,VisualEvent,Entity} from '../../simulation/types';
import {AIR_HEIGHT} from '../../data/terrain';
import {commitInstances} from '../units/instance-updates';
import {castLaunchEvent} from './hero-feedback';
import type {WeaponFlight} from '../../simulation/combat/weapon-flight';
import {isRevisedHero} from '../../data/terran-heroes';

type Vec={x:number;y:number;z:number};
type Fragment={shape:CoreShape;point:Vec;velocity:Vec;size:Vec;rotation:Vec;spin:Vec;color:number;start:number;life:number;gravity:number;core:boolean;collapse?:boolean};
type Batch={mesh:THREE.InstancedMesh;count:number};
const obj=new THREE.Object3D(),tint=new THREE.Color();
const CAP=384,MAX=1200;
const metalTypes=new Set(['hellion','tank','thor','viking','banshee','medivac','science_vessel','stalker','sentry','immortal','colossus','phoenix','void_ray','carrier']);
/** Sculpted cores, blade paths and bounded ballistic debris. Never a gameplay collision body. */
export class CombatSculptures {
 heroDetail:'full'|'balanced'|'low'='full';
 ordinarySource:(u:Entity)=>boolean=()=>false;
 readonly batches=new Map<CoreShape,Batch>();fragments:Fragment[]=[];mounts=new Map<string,Vec>();beams:VisualEvent[]=[];shipImpacts:VisualEvent[]=[];
 stats={coreDropped:0,decorationsDropped:0,active:0};
 constructor(scene:THREE.Scene){
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.28,0,.5,0,.08,.85,0,0,-1,0,.08,.85,.28,0,.5],3));blade.computeVertexNormals();
  const shapes:Record<CoreShape,THREE.BufferGeometry>={slug:new THREE.CapsuleGeometry(.18,.9,2,5),crystal:new THREE.OctahedronGeometry(.6,0),orb:new THREE.IcosahedronGeometry(.5,1),spore:new THREE.DodecahedronGeometry(.5,0),blade,shard:new THREE.ConeGeometry(.23,1.2,4),plate:new THREE.BoxGeometry(.7,.12,.5),helix:new THREE.TorusKnotGeometry(.34,.07,24,4,2,3)};
  for(const [shape,geometry] of Object.entries(shapes)){const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:shape==='plate'?.9:.86,depthWrite:false,side:THREE.DoubleSide,blending:['plate','spore'].includes(shape)?THREE.NormalBlending:THREE.AdditiveBlending});
   const mesh=new THREE.InstancedMesh(geometry,material,CAP);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,tint);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);this.batches.set(shape as CoreShape,{mesh,count:0});}
 }
 reset(){this.fragments=[];this.beams=[];this.shipImpacts=[];this.mounts.clear();this.stats={coreDropped:0,decorationsDropped:0,active:0};for(const b of this.batches.values())commitInstances(b.mesh,0);}
 private add(p:Fragment){if(this.fragments.length>=MAX){const index=this.fragments.findIndex(f=>!f.core);if(index<0||!p.core){this.stats[p.core?'coreDropped':'decorationsDropped']++;return;}this.fragments.splice(index,1);this.stats.decorationsDropped++;}this.fragments.push(p);}
 private fragment(e:VisualEvent,shape:CoreShape,point:Vec,size:number,color:number,i:number,life=.35,force=2,core=false,delay=0,collapse=false){
  const a=e.serial*2.399+i*2.741,b=.35+(i%5)*.14;
  this.add({shape,point:{...point},velocity:{x:Math.sin(a)*force*b,y:force*(.5+b*.6),z:Math.cos(a)*force*b},size:{x:size,y:size,z:size},rotation:{x:a,y:e.facing,z:a*.7},spin:{x:3+b,y:2-b,z:4},color,start:e.time+delay,life,gravity:shape==='plate'||shape==='spore'?8:0,core,collapse});
 }
 private at(e:VisualEvent,end=false):Vec{return {x:end?e.end.x:e.x,y:end?e.endY:e.y,z:end?e.end.z:e.z};}
 event(e:VisualEvent,mount:Vec|null,left:Vec|null){
  const profile=e.heroId?HERO_SPECTACLE[e.heroId]:undefined,family=UNIT_SPECTACLE[e.unitType as FamilyId],tier=this.heroDetail==='low'?0:heroVisualTier(e.rank),from=mount??this.at(e),point=this.at(e,true);
  if(e.kind==='attack'&&e.attackId&&(e.projectileSpeed??0)>0)this.mounts.set(e.attackId,{...from});
  if(e.kind==='attack'&&e.heroId==='yamato_battlecruiser'&&e.attackId&&left)this.mounts.set(e.attackId+':left',{...left});
  if(isRevisedHero(e.heroId)&&['attack','projectile-impact','weapon-area'].includes(e.kind)||!e.heroId&&isTerranEliteId(e.eliteId)&&e.kind==='attack')return;
  if(e.kind==='skill-impact'&&['yamato_battlecruiser','hots_leviathan','purifier_flagship'].includes(e.heroId??''))this.shipImpacts.push(e);
  if(!profile&&e.kind==='attack'&&['sentry','void_ray'].includes(e.unitType??''))this.beams.push({...e,x:from.x,y:from.y,z:from.z});
  if(e.kind==='death'){
   const mode=profile?.death??family?.death??(e.race==='zerg'?'bio':metalTypes.has(e.unitType??'')?'reactor':e.race==='protoss'?'psionic':'armor');
   const heavy=e.flying||['thor','ultralisk','colossus'].includes(e.unitType??''),n=profile?9+tier*2:family?.debris??4,size=profile?.size??family?.size??.22;
   for(let i=0;i<n;i++){const shape=mode==='bio'?'spore':mode==='void'?'shard':mode==='psionic'?'crystal':'plate';
    this.fragment(e,shape,this.at(e),size*(heavy?1.6:1),profile?.color??(e.race==='zerg'?0x796239:0x667781),i,mode==='void'?.7:1.2,heavy?4:2.2,false,(mode==='reactor'||heavy&&mode==='bio')?i*.035:0,mode==='void');
    if(mode==='infected'||mode==='bio'&&i%2===0)this.fragment(e,'plate',this.at(e),size*.7,0x716345,i,1.1,2.8);}
   return;
  }
  if(!profile){
   if(!family)return;const scale=e.eliteId?1.35:1,s=family.size*scale;
   if(e.kind==='attack'&&(family.contact==='blade'||family.contact==='claw')){
    const count=e.unitType==='zealot'?2:1;for(let i=0;i<count;i++)this.add({shape:'blade',point:{...point},velocity:{x:Math.cos(e.facing)*(i?2:-2),y:.1,z:-Math.sin(e.facing)*(i?2:-2)},size:{x:s,y:s,z:s*3},rotation:{x:.3,y:e.facing+(i?.5:-.5),z:0},spin:{x:0,y:i?-4:4,z:0},color:family.edge,start:e.time,life:.13,gravity:0,core:true});
   }else if(e.kind==='attack'&&family.contact==='gun'){
    const n=e.unitType==='immortal'?2:3;for(let i=0;i<n;i++){const t=(i+.5)/n;this.add({shape:family.core,point:{x:from.x+(point.x-from.x)*t,y:from.y+(point.y-from.y)*t,z:from.z+(point.z-from.z)*t},velocity:{x:0,y:0,z:0},size:{x:s,y:s*2.5,z:s},rotation:{x:Math.PI/2,y:0,z:-e.facing},spin:{x:0,y:0,z:0},color:family.edge,start:e.time,life:.055,gravity:0,core:true});}
   }else if(e.kind==='weapon-area'&&e.unitType==='colossus'){
    this.beams.push({...e,x:from.x,y:from.y,z:from.z});
    for(let i=0;i<3;i++)this.fragment(e,'shard',point,.18,family.edge,i,.19,1.6,i===0);
   }else if(e.kind==='weapon-area'&&e.unitType==='lurker'){
    for(let i=0;i<3;i++)this.add({shape:'shard',point:{x:point.x+Math.cos(e.facing)*(i-1)*.22,y:point.y-.3,z:point.z-Math.sin(e.facing)*(i-1)*.22},velocity:{x:0,y:2.2,z:0},size:{x:s*.8,y:s*3.3,z:s*.8},rotation:{x:.1,y:e.facing,z:0},spin:{x:0,y:0,z:0},color:i===1?family.edge:family.color,start:e.time,life:.3,gravity:12,core:true});
   }
   if(e.kind==='projectile-impact')for(let i=0;i<(e.eliteId?4:2);i++)this.fragment(e,family.contact==='acid'?'spore':'shard',point,s*.7,family.edge,i,.22,1.8,i===0);
   return;
  }
  if(e.kind==='skill-status'){
   const boss=e.targetTier==='boss'||e.targetTier==='lord';
   for(let i=0;i<4;i++){const a=i*Math.PI/2,r=.55;this.add({shape:e.heroId==='vorazun'?'crystal':'shard',point:{x:point.x+Math.sin(a)*r,y:point.y,z:point.z+Math.cos(a)*r},velocity:{x:0,y:boss?.25:0,z:0},size:{x:.08,y:boss?.4:1.1,z:.08},rotation:{x:0,y:a,z:e.heroId==='tosh'?.5:0},spin:{x:0,y:boss?2:0,z:0},color:profile.edge,start:e.time,life:boss?.45:.8,gravity:0,core:true});}
  }
  if(e.kind==='skill-heal'&&e.heroId==='dehaka')for(let i=0;i<5;i++)this.add({shape:'spore',point:{x:point.x+Math.sin(i)*.8,y:point.y-.3,z:point.z+Math.cos(i)*.8},velocity:{x:-Math.sin(i),y:1,z:-Math.cos(i)},size:{x:.16,y:.25,z:.16},rotation:{x:0,y:i,z:0},spin:{x:0,y:1,z:0},color:0xafd887,start:e.time,life:.45,gravity:0,core:true});
  if(e.kind==='attack'){
   if(e.heroId==='raynor')for(let layer=0;layer<2;layer++)this.add({shape:'shard',point:{x:from.x+Math.sin(e.facing)*.24,y:from.y,z:from.z+Math.cos(e.facing)*.24},velocity:{x:Math.sin(e.facing)*2,y:0,z:Math.cos(e.facing)*2},size:{x:layer?.21:.4,y:layer?.55:.85,z:layer?.21:.4},rotation:{x:Math.PI/2,y:0,z:-e.facing},spin:{x:0,y:0,z:0},color:layer?0xffd271:0xff731c,start:e.time,life:layer?.075:.11,gravity:0,core:true});
   const melee=HEROES[e.heroId!].range<=2;
   if(melee){const hits=e.heroId==='artanis'?2:1;for(let h=0;h<hits;h++){const side=h===0?1:-1;
    this.add({shape:'blade',point:{x:point.x-side*.2,y:point.y,z:point.z},velocity:{x:Math.cos(e.facing)*side*2,y:.15,z:-Math.sin(e.facing)*side*2},size:{x:profile.size*(e.heroId==='dehaka'?1.8:1),y:1,z:1.4},rotation:{x:.25,y:e.facing+side*.7,z:0},spin:{x:0,y:side*5,z:0},color:profile.edge,start:e.time,life:.16,gravity:0,core:true});}
   }else if(['raynor','tychus','nova','swann','purifier_flagship'].includes(e.heroId!)){
    const count=e.heroId==='nova'?6:e.heroId==='tychus'?3:4,dx=point.x-from.x,dz=point.z-from.z;
    for(let i=0;i<count;i++){const f=(i+.5)/count,p={x:from.x+dx*f,y:from.y+(point.y-from.y)*f,z:from.z+dz*f};
     this.add({shape:profile.core,point:p,velocity:{x:0,y:0,z:0},size:{x:profile.size,y:profile.size*(e.heroId==='nova'?2:3),z:profile.size},rotation:{x:Math.PI/2,y:0,z:-e.facing},spin:{x:0,y:0,z:0},color:i%2?profile.color:profile.edge,start:e.time,life:.075,gravity:0,core:true});}
    if(e.heroId!=='nova'&&e.heroId!=='purifier_flagship')this.fragment(e,'plate',from,.11,0xa17e48,0,.5,1.5);
   }
   if(e.heroId==='tychus')for(let i=0;i<3;i++)this.fragment(e,'slug',{x:from.x+Math.cos(e.facing)*.04*i,y:from.y,z:from.z},.08,profile.edge,i,.07,.2,true);
   if(e.heroId==='yamato_battlecruiser'&&left)this.mounts.set(e.attackId+':left',left);
  }
  if(e.kind==='projectile-impact'||e.kind==='skill-impact'||e.kind==='skill-dot'){
   const skill=e.kind==='skill-impact',n=skill?5+tier*2:2+tier,coreSize=profile.size*(skill?2.3:1);
   const restore=['swann','niadra','artanis'].includes(e.heroId!);
   for(let i=0;i<n;i++){
    if(restore){const a=i*Math.PI*2/n,r=e.heroId==='swann'?.3:.65,p={x:point.x+Math.sin(a)*r,y:point.y+.2*Math.cos(a),z:point.z+Math.cos(a)*r};
     this.add({shape:e.heroId==='swann'?'slug':e.heroId==='niadra'?'spore':'plate',point:p,velocity:{x:-Math.sin(a)*r*2,y:.2,z:-Math.cos(a)*r*2},size:{x:coreSize*.45,y:coreSize*.35,z:coreSize},rotation:{x:a,y:a,z:0},spin:{x:0,y:2,z:0},color:profile.edge,start:e.time,life:.4,gravity:0,core:true});
    }else this.fragment(e,skill?profile.skill:profile.core,point,coreSize*(i===0?1:.38),i===0?profile.edge:profile.color,i,skill?.42:.22,skill?4:2,i===0,0,e.heroId==='zeratul'||e.heroId==='tosh');
   }
   if(skill&&e.heroId==='yamato_battlecruiser')for(let i=0;i<8;i++)this.fragment(e,'plate',point,.26,0x795545,i,.7,6,false,.05);
   if(skill&&e.heroId==='hots_leviathan')for(let i=0;i<6;i++)this.fragment(e,'spore',point,.34,profile.color,i,.55,4.5,false,.02*i);
   if(skill&&e.heroId==='purifier_flagship')for(let i=0;i<8;i++)this.fragment(e,'crystal',point,.4,profile.edge,i,.55,5,false,.02*i);
   if(skill&&e.heroId==='dehaka'){
    // Surviving enemies retain their complete body. Only an actual kill produces a collapse.
    for(let i=0;i<2;i++)this.add({shape:'blade',point:{x:point.x+(i?1:-1)*.5,y:point.y,z:point.z},velocity:{x:i?-2:2,y:0,z:0},size:{x:.35,y:.6,z:1.1},rotation:{x:0,y:i?Math.PI:0,z:0},spin:{x:0,y:0,z:0},color:profile.edge,start:e.time,life:.22,gravity:0,core:true});
    if(e.targetAlive===false)for(let i=0;i<4;i++)this.fragment(e,'spore',point,.24,0x75924a,i,.3,2,false,0,true);
   }
   if(skill&&e.heroId==='zeratul')for(const side of [-1,1])this.add({shape:'blade',point:{x:point.x+side*.3,y:point.y,z:point.z},velocity:{x:-side*.6,y:0,z:0},size:{x:.2,y:.5,z:1.6},rotation:{x:0,y:e.facing,z:.4},spin:{x:0,y:0,z:0},color:side<0?0x1b2834:profile.edge,start:e.time,life:.35,gravity:0,core:true,collapse:true});
   if(skill&&e.heroId==='fenix')for(let i=0;i<3;i++)this.fragment(e,'helix',point,.5-i*.08,profile.edge,i,.3,1.8,true,.025*i);
   if(skill&&e.heroId==='tychus')for(let i=0;i<7;i++)this.fragment(e,'plate',point,.1,0xe6c07d,i,.7,5,false,.02);
  }
 }
 private draw(shape:CoreShape,p:Vec,size:Vec,rotation:Vec,color:number,core=true){const b=this.batches.get(shape)!;if(b.count>=CAP){this.stats[core?'coreDropped':'decorationsDropped']++;return;}obj.position.set(p.x,p.y,p.z);obj.scale.set(size.x,size.y,size.z);obj.rotation.set(rotation.x,rotation.y,rotation.z);obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count,tint.set(color));b.count++;}
 private beam(from:Vec,to:Vec,width:number,color:number){
  const b=this.batches.get('slug')!;if(b.count>=CAP){this.stats.coreDropped++;return;}
  const d=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);if(d<.01)return;
  obj.position.set((from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(to.x-from.x,to.y-from.y,to.z-from.z).normalize());obj.scale.set(width,d/1.26,width);obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count,tint.set(color));b.count++;
 }
 private flight(w:World,p:WeaponFlight,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>Vec|null){
  if(this.ordinarySource(p.source))return;
  if(isRevisedHero(p.source.heroId)||revisedElite(p.source)||revisedZergElite(p.source)||isProtossEliteId(p.source.eliteId)||isProtossEliteId(w.entities.get(p.source.summonOwnerId??-1)?.eliteId)||w.time<p.start)return;
  if(!visible(p.point))return;const u=p.source,hero=u.heroId?HERO_SPECTACLE[u.heroId]:undefined;
  // These two use their authentic original weapon meshes, rendered by OriginalProjectiles.
  if(!hero&&['marauder','hydralisk'].includes(u.unitType))return;
  const angle=Math.atan2(p.lastSeen.x-p.point.x,p.lastSeen.z-p.point.z),total=Math.max(.01,Math.hypot(p.lastSeen.x-p.from.x,p.lastSeen.z-p.from.z)),traveled=Math.hypot(p.point.x-p.from.x,p.point.z-p.from.z),t=Math.min(1,traveled/total);
  const ground=w.terrain?.height(p.point)??0,fromY=u.flying?AIR_HEIGHT+1:ground+.8,target=p.lost?undefined:w.body(p.target),toY=target?.flying?AIR_HEIGHT+.6:ground+.65,y=fromY+(toY-fromY)*t;
  const biological=u.race==='zerg',shape=hero?.core??(biological?u.unitType==='mutalisk'?'blade':'spore':u.race==='protoss'?'crystal':'slug'),c=hero?.color??(biological?0xb1cc65:u.race==='protoss'?0x64baff:0xf8c885),s=hero?.size??.16;
  const mount=this.mounts.get(p.attackId),blend=Math.max(0,1-traveled/2),point={x:p.point.x+(mount?mount.x-p.from.x:0)*blend,y:y+(mount?mount.y-fromY:0)*blend,z:p.point.z+(mount?mount.z-p.from.z:0)*blend};
  this.draw(shape,point,{x:s,y:s*(shape==='slug'?3:1),z:s*(shape==='blade'?2:1)},{x:shape==='slug'?Math.PI/2:0,y:angle+w.time*(shape==='orb'||shape==='spore'?5:0),z:shape==='slug'?-angle:w.time*3},c);
  if(hero){this.draw(hero.core==='orb'?'helix':'crystal',point,{x:s*.5,y:s*.5,z:s*.5},{x:w.time*5,y:-w.time*6,z:angle},hero.edge);
   if(u.heroId==='yamato_battlecruiser'&&p.hits===2){const side=.3,other=this.mounts.get(p.attackId+':left');this.draw('slug',{x:point.x+(other&&mount?(other.x-mount.x)*blend:Math.cos(angle)*side),y:point.y+(other&&mount?(other.y-mount.y)*blend:0),z:point.z+(other&&mount?(other.z-mount.z)*blend:-Math.sin(angle)*side)},{x:s*.8,y:s*2.4,z:s*.8},{x:Math.PI/2,y:0,z:-angle},hero.edge);}
  }
  for(let i=1;i<=3;i++){const d=Math.min(traveled,i*.25);this.draw(biological?'spore':'shard',{x:point.x-Math.sin(angle)*d,y:point.y,z:point.z-Math.cos(angle)*d},{x:s/(i+2),y:s/(i+2),z:s/(i+2)},{x:0,y:angle,z:0},c);}
 }
 render(w:World,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>Vec|null){
  for(const b of this.batches.values())b.count=0;
  // Boss projectiles remain shaped bodies on their actual simulation positions.
  for(const m of [...(w.campaign18Runtime?.mainCombat?.missiles??[]),...w.enemySpecials.missiles]){
   if(!visible(m))continue;const y=(w.terrain?.height(m)??0)+.7;
   this.draw('spore',{x:m.x,y,z:m.z},{x:.21,y:.25,z:.42},{x:.2,y:m.angle,z:w.time*4},0xa2b648);
   this.draw('crystal',{x:m.x,y:y+.02,z:m.z},{x:.1,y:.13,z:.27},{x:0,y:m.angle,z:0},0xe2efa3);
   for(let i=1;i<=3;i++)this.draw('spore',{x:m.x-Math.sin(m.angle)*i*.18,y:y-.035*i,z:m.z-Math.cos(m.angle)*i*.18},{x:.1/i,y:.1/i,z:.13/i},{x:0,y:m.angle,z:w.time},0x6f893d);
  }
  this.shipImpacts=this.shipImpacts.filter(e=>w.time-e.time<.72);
  for(const e of this.shipImpacts){if(!visible(e.end))continue;const t=w.time-e.time,p=this.at(e,true),fade=Math.max(0,1-t/.72);
   if(e.heroId==='yamato_battlecruiser'){
    // One hot nucleus followed by outward fire lobes; no full-screen flash.
    if(t<.13)this.draw('orb',p,{x:1.1-t*5,y:1.1-t*5,z:1.1-t*5},{x:0,y:0,z:0},0xfff7cd);
    if(t>.045)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=t*2.3;this.draw('orb',{x:p.x+Math.sin(a)*r,y:p.y+.2+t*.4,z:p.z+Math.cos(a)*r},{x:fade*.65,y:fade*.85,z:fade*.65},{x:0,y:a,z:0},i%2?0xffa13a:0xd3481b);}
   }else if(e.heroId==='hots_leviathan'){
    // Each real 0.8-second pulse opens a sac and drives plasma vertically.
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5,r=.35+t*1.3;this.draw('spore',{x:p.x+Math.sin(a)*r,y:p.y+.2+Math.sin(t*4)*(.7+i*.1),z:p.z+Math.cos(a)*r},{x:fade*.5,y:fade*(.65+t),z:fade*.4},{x:a+t*2,y:a,z:t*3},i%2?0x9fbd48:0xc8f677);}
   }else{
    // A single faceted dome breaks upward, never the Leviathan's pulsing organic shell.
    if(t<.15)this.draw('crystal',p,{x:1.1,y:1.7,z:1.1},{x:0,y:t*8,z:0},0xfff6d1);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=.5+t*1.8;this.draw('plate',{x:p.x+Math.sin(a)*r,y:p.y+.5+t*(1+i%2),z:p.z+Math.cos(a)*r},{x:fade*.55,y:fade*.3,z:fade*1.1},{x:a,y:a+t*2,z:t*3},i%2?0xffdd8f:0xe4f8ff);}
   }
  }
  for(const u of w.entities.values())if(u.hp>0&&u.heroId&&visible(u)){
   const profile=HERO_SPECTACLE[u.heroId],shotAge=w.time-u.lastShotAt;
   const e:VisualEvent={serial:0,time:w.time,kind:'attack',unitType:u.unitType,modelKey:u.modelKey,heroId:u.heroId,entityId:u.id,flying:u.flying,x:u.x,z:u.z,y:0,endY:0,end:u,facing:u.facing,siege:false};
   const point=muzzle(e)??{x:u.x,y:(u.flying?AIR_HEIGHT:0)+.8,z:u.z};
   const s=u.heroId==='tychus'&&shotAge<.8?.08*(1-shotAge/.8):.035;
   this.draw(profile.core,point,{x:s,y:s*1.8,z:s},{x:0,y:w.time,z:0},profile.edge);
  }
  this.beams=this.beams.filter(e=>w.time-e.time<(e.unitType==='colossus'?.12:.22));
  for(const e of this.beams){if(!visible(e)&&!visible(e.end))continue;const from=this.at(e),to=this.at(e,true),age=w.time-e.time;
   if(e.unitType==='void_ray'){
    const a=w.time*18;for(let i=0;i<3;i++){const off={x:Math.sin(a+i*2.1)*.12,z:Math.cos(a+i*2.1)*.12};this.beam({x:from.x+off.x,y:from.y,z:from.z+off.z},to,.16,0x6688ef);}this.beam(from,to,.1,0xc2f5ff);
   }else if(e.unitType==='colossus'){
    for(const side of [-1,1])this.beam({x:from.x+Math.cos(e.facing)*side*.36,y:from.y,z:from.z-Math.sin(e.facing)*side*.36},to,.13,0xffc267);
   }else{
    const mid={x:(from.x+to.x)/2+Math.sin(age*80)*.08,y:(from.y+to.y)/2,z:(from.z+to.z)/2};this.beam(from,mid,.09,0x75daf5);this.beam(mid,to,.075,0xd5f7ff);
   }
  }
  // Support only follows actual simulation recipients. A moving wisp is a visual link, not delayed healing.
  for(const u of w.entities.values())if(u.hp>0&&visible(u)&&!u.heroId&&!this.ordinarySource(u)&&!(u.owner==='terran'&&!!u.eliteId&&['medivac','science_vessel'].includes(u.unitType))&&['medivac','science_vessel'].includes(u.unitType))for(const id of u.healTargets??(u.healTarget?[u.healTarget]:[])){
   const target=w.entities.get(id);if(!target||target.hp<=0)continue;const repair=u.unitType==='science_vessel',from={x:u.x,y:u.flying?AIR_HEIGHT-.1:(w.terrain?.height(u)??0)+.8,z:u.z},to={x:target.x,y:target.flying?AIR_HEIGHT+.5:(w.terrain?.height(target)??0)+.7,z:target.z};
   for(let i=0;i<5;i++){const f=(w.time*1.8+i/5)%1,a=w.time*9+i*1.25,p={x:from.x+(to.x-from.x)*f+Math.sin(a)*.06,y:from.y+(to.y-from.y)*f,z:from.z+(to.z-from.z)*f+Math.cos(a)*.06};this.draw(repair?'slug':'orb',p,{x:.09,y:repair?.22:.09,z:.09},{x:0,y:a,z:a},repair?0xffc76e:0x8bebbb);}
   this.draw(repair?'shard':'orb',to,{x:.17,y:.22,z:.17},{x:w.time*6,y:0,z:0},repair?0xffe8a2:0xb0ffd9);
  }
  // Saved protection and actual repair recipients remain visible in every effect quality.
  for(const u of w.entities.values())if(u.hp>0&&visible(u)){
   const y=u.flying?AIR_HEIGHT+.7:(w.terrain?.height(u)??0)+.8;
   if((u.heroCombat?.protectedUntil??0)>w.time)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=u.unitRadius+.25;this.draw('plate',{x:u.x+Math.sin(a)*r,y,z:u.z+Math.cos(a)*r},{x:.32,y:.65,z:.08},{x:0,y:a,z:0},0xffce77);}
   if(u.heroId==='swann')for(const id of u.healTargets??[]){const a=w.entities.get(id);if(a?.hp){const to={x:a.x,y:a.flying?AIR_HEIGHT+.6:(w.terrain?.height(a)??0)+.7,z:a.z};this.beam({x:u.x,y,z:u.z},to,.045,0x6eff9a);this.draw('orb',to,{x:.14,y:.14,z:.14},{x:0,y:w.time*5,z:0},0xc8ffd6);}}
   if(u.heroId==='nova'&&u.cloaked){for(let i=0;i<3;i++){const a=w.time*2+i*Math.PI*2/3;this.draw('shard',{x:u.x+Math.sin(a)*.5,y:y-.3,z:u.z+Math.cos(a)*.5},{x:.04,y:.6,z:.04},{x:0,y:a,z:0},0x99dbff);}}
   if(u.heroId==='raynor'&&this.heroDetail!=='low')for(const a of w.allies())if(a.hp>0&&(a.heroId==='raynor'||!a.heroId&&['marine','marauder','reaper'].includes(a.unitType))&&w.time-a.bornAt<1)this.draw('shard',{x:a.x,y:(w.terrain?.height(a)??0)+.5,z:a.z},{x:.05,y:.3,z:.05},{x:0,y:0,z:0},0xffce72);
  }
  for(const spell of w.expedition.spells)if(spell.until>w.time&&visible(spell)){const source=w.entities.get(spell.source);if(source&&this.ordinarySource(source))continue;
   const y=(w.terrain?.height(spell)??0)+.1;
   if(spell.kind==='guardian'){for(let i=0;i<10;i++){const a=i*Math.PI*2/10,r=spell.radius*.9;this.draw('plate',{x:spell.x+Math.sin(a)*r,y:y+.5+Math.sin(a)*.1,z:spell.z+Math.cos(a)*r},{x:.32,y:.65,z:.18},{x:Math.PI/2,y:a,z:.3},0x6ea6d1);}}
   else if(spell.kind==='storm'){for(let i=0;i<4;i++){const tick=Math.floor(w.time*12),a=i*2.4+tick*.8,r=spell.radius*(.25+i*.18),p={x:spell.x+Math.cos(a)*r,y,z:spell.z+Math.sin(a)*r},top={x:p.x+.2,y:y+1.8,z:p.z-.3},mid={x:p.x-.2,y:y+.9,z:p.z+.1};this.beam(top,mid,.1,0xccc0ff);this.beam(mid,p,.13,0x8ba1ff);this.draw('crystal',p,{x:.12,y:.25,z:.12},{x:0,y:a,z:0},0xe6d4ff);}}
   else if(spell.target!==null){const target=w.entities.get(spell.target);if(target)for(let i=0;i<4;i++){const a=i*Math.PI/2;this.draw('plate',{x:target.x+Math.sin(a)*target.unitRadius,y:(w.terrain?.height(target)??0)+.75,z:target.z+Math.cos(a)*target.unitRadius},{x:.38,y:1,z:.12},{x:.2,y:a,z:0},0x90dbea);}}
  }
  for(const p of w.weaponFlights)this.flight(w,p,visible,muzzle);
  const attacks=new Set(w.weaponFlights.map(p=>p.attackId));for(const id of this.mounts.keys())if(!attacks.has(id.replace(':left','')))this.mounts.delete(id);
  for(const cast of w.heroCasts){if(cast.phase==='dot'||cast.phase==='channel'||(cast.pulseIndex??0)>0)continue;const source=w.entities.get(cast.source),profile=HERO_SPECTACLE[cast.hero],hero=HEROES[cast.hero],flight=HERO_SKILL_FLIGHT[cast.hero]??0,tier=this.heroDetail==='low'?0:heroVisualTier(cast.rank??source?.rank),launch=castLaunchEvent(cast,source,w.time),mount=muzzle(launch)??{x:launch.x,y:source?.flying?AIR_HEIGHT+1:(w.terrain?.height(launch)??0)+1,z:launch.z};
   const begins=cast.at-flight;
   if(w.time<begins){const windup=hero.delay-flight,charge=windup>0?1-(begins-w.time)/windup:1;if(charge<=0||!visible(mount))continue;
    if(cast.hero==='yamato_battlecruiser'){const target=w.body(cast.target),to={x:cast.point.x,y:target?.flying?AIR_HEIGHT+.6:(w.terrain?.height(cast.point)??0)+.7,z:cast.point.z};this.beam(mount,to,.035+charge*.035,0xbbefff);this.draw('orb',mount,{x:.2+charge*.3,y:.2+charge*.3,z:.2+charge*.3},{x:0,y:0,z:0},0xe5faff);}
    for(let i=0;i<3+tier;i++){const a=w.time*7+i*Math.PI*2/(3+tier),r=.65*(1-charge)+.1;this.draw(profile.skill,{x:mount.x+Math.sin(a)*r,y:mount.y+Math.cos(a)*r,z:mount.z},{x:.09+charge*.12,y:.12,z:.09+charge*.12},{x:a,y:-a,z:a},profile.edge);}continue;
   }
   if(!flight||cast.at<=w.time)continue;const t=Math.min(1,Math.max(0,(w.time-begins)/flight)),a=Math.atan2(cast.point.x-cast.origin.x,cast.point.z-cast.origin.z),line=cast.phase==='line-travel',end=line?{x:cast.origin.x+Math.sin(a)*hero.length,z:cast.origin.z+Math.cos(a)*hero.length}:cast.point,target=w.body(cast.target),toY=target?.flying?AIR_HEIGHT+.6:(w.terrain?.height(end)??0)+.8;
   const p={x:mount.x+(end.x-mount.x)*t,y:mount.y+(toY-mount.y)*t+(cast.hero==='tychus'?Math.sin(t*Math.PI)*2:0),z:mount.z+(end.z-mount.z)*t};if(!visible(p))continue;
   const scale=profile.size*(['yamato_battlecruiser','purifier_flagship','hots_leviathan'].includes(cast.hero)?3:2),rot={x:w.time*6,y:a,z:w.time*4};
   this.draw(profile.skill,p,{x:line?hero.width*.7:scale,y:scale,z:line?scale*1.4:scale},line?{x:.3,y:a,z:0}:rot,profile.color);
   this.draw(cast.hero==='raynor'?'helix':cast.hero==='fenix'?'helix':'crystal',p,{x:scale*.6,y:scale*.6,z:scale*.6},{x:-rot.x,y:-a,z:-rot.z},profile.edge);
  }
  const kept:Fragment[]=[];
  for(const f of this.fragments)if(w.time-f.start<f.life)kept.push(f);
  for(const core of [true,false])for(const f of kept){if(f.core!==core)continue;const age=w.time-f.start;if(age<0||!visible(f.point))continue;const t=age/f.life,fade=f.collapse?Math.max(.01,1-t):Math.max(.05,1-t*t),floor=w.terrain?.height(f.point)??0;
   const p={x:f.point.x+f.velocity.x*age,y:Math.max(floor+.04,f.point.y+f.velocity.y*age-f.gravity*age*age*.5),z:f.point.z+f.velocity.z*age};this.draw(f.shape,p,{x:f.size.x*fade,y:f.size.y*fade,z:f.size.z*fade},{x:f.rotation.x+f.spin.x*age,y:f.rotation.y+f.spin.y*age,z:f.rotation.z+f.spin.z*age},f.color,f.core);
  }this.fragments=kept;this.stats.active=kept.length;for(const b of this.batches.values())commitInstances(b.mesh,b.count);
 }
}
