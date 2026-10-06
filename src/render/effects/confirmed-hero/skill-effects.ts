import * as THREE from 'three';
import type {BattleRenderer} from '../../../render/scene/battle-renderer';
import type {World} from '../../../simulation/world';
import type {Entity,HeroCast,VisualEvent} from '../../../simulation/types';
import {HEROES,type HeroId} from '../../../data/heroes';
import {castLaunchEvent,weaponWorldPoint} from '../../../render/effects/hero-feedback';
import {modelPresentationScale} from '../../../data/combat-presentation';

type V={x:number;y:number;z:number};
type SceneCast={hero:HeroId;source:Entity;cast:HeroCast;at:number;from:V;point:V;end:V;targets:number[]};
type Echo={p:V;from:V;at:number;hero:HeroId;dot:boolean;id?:number};
type Shape='orb'|'beam'|'ring'|'shard'|'shield';
const vec=(a:V)=>new THREE.Vector3(a.x,a.y,a.z),lerp=(a:V,b:V,t:number):V=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const up=new THREE.Vector3(0,1,0),obj=new THREE.Object3D(),tint=new THREE.Color();
const colors:Record<string,number>={raynor:0xffbb62,tychus:0xff9c51,nova:0x65d9ff,swann:0x85ffbb,tosh:0xc76dff,yamato_battlecruiser:0xffc37b};
const CAP=256;
export const SKILL_VISUAL_TUNING={raynorRaySeconds:1,tychusGrenadeScale:1.6,yamatoGuideWidthMultiplier:5,yamatoProjectileWidthMultiplier:1,swannVersion:'first-source-20261005-004625',geometricCircles:true} as const;

/** Confirmed skill renderer. Reads real cast events; never issues damage or game commands. */
export class SkillEffects {
 private batches=new Map<Shape,{mesh:THREE.InstancedMesh;count:number}>();
 private cast?:SceneCast;private echoes:Echo[]=[];private nextTrail=0;private grenade=new THREE.Group();
 stats={impacts:0,dots:0,repairs:0,active:0,peak:0};
 constructor(private view:BattleRenderer,private world:World){
  const geometries:Record<Shape,THREE.BufferGeometry>={orb:new THREE.IcosahedronGeometry(1,2),beam:new THREE.CylinderGeometry(.5,.5,1,8,1),ring:new THREE.TorusGeometry(1,.025,5,60),shard:new THREE.ConeGeometry(.13,1,4),shield:new THREE.SphereGeometry(1,24,16)};
  for(const [key,geometry] of Object.entries(geometries)){
   const material=key==='shield'?new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n;varying vec3 eye;varying vec2 vUv;varying vec3 c;void main(){vUv=uv;c=instanceColor;vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.);n=normalize(normalMatrix*mat3(instanceMatrix)*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 eye;varying vec2 vUv;varying vec3 c;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);float line=pow(abs(sin(vUv.x*94.25)),60.)*.14+pow(abs(sin(vUv.y*50.26)),60.)*.1;gl_FragColor=vec4(c,(.025+rim*.25+line)*.7);}'})
    :new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:key==='beam'?.88:.8,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
   const mesh=new THREE.InstancedMesh(geometry,material,CAP);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,tint);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=3;view.scene.add(mesh);this.batches.set(key as Shape,{mesh,count:0});
  }
  view.scene.add(this.grenade);
 }
 prepareGrenade(){for(const mesh of this.view.fx.projectiles.batches.get('marauder')??[]){const m=new THREE.Mesh(mesh.geometry,mesh.material);this.grenade.add(m);}this.grenade.visible=false;}
 reset(){this.cast=undefined;this.echoes=[];this.nextTrail=0;this.grenade.visible=false;this.stats={impacts:0,dots:0,repairs:0,active:0,peak:0};for(const b of this.batches.values()){b.count=0;b.mesh.count=0;}}
 begin(hero:HeroId,casts:HeroCast[],source:Entity){
  const cast=casts.find(c=>c.hero===hero);if(!cast)return;
  const launch=castLaunchEvent(cast,source,cast.beganAt??this.world.time),model=this.view.gpu.get(source.modelKey??source.unitType),weapon=model?.weaponAt('skill',0),from=weaponWorldPoint(launch,weapon??{x:0,y:1,z:.6},modelPresentationScale(source),this.world.terrain?.height(source)??0);
  const target=this.world.entities.get(cast.target),point={...cast.point,y:target?.flying?6.2:.85};const facing=Math.atan2(cast.point.x-source.x,cast.point.z-source.z),length=HEROES[hero].length;
  this.cast={hero,cast,source,from,point,at:cast.beganAt??this.world.time,end:{x:source.x+Math.sin(facing)*(length||Math.hypot(cast.point.x-source.x,cast.point.z-source.z)),y:hero==='nova'||hero==='raynor'?from.y:point.y,z:source.z+Math.cos(facing)*(length||Math.hypot(cast.point.x-source.x,cast.point.z-source.z))},targets:cast.frozenTargets?.map(a=>a.id)??[]};this.nextTrail=this.world.time;
 }
 targetIds(){return this.cast?.targets??[];}
 /** Formal scene attachment only; the frozen first-version shield geometry and drawing remain unchanged. */
 alignShieldBodies(){if(this.cast?.hero!=='swann')return;const b=this.batches.get('shield')!,matrix=new THREE.Matrix4(),position=new THREE.Vector3();for(let i=0;i<b.mesh.count;i++){b.mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);const a=this.cast.targets.map(id=>this.world.entities.get(id)).find(a=>a&&Math.abs(a.x-position.x)<.01&&Math.abs(a.z-position.z)<.01);if(a)matrix.elements[13]+=a.flying?5.6:this.world.terrain?.height(a)??0;b.mesh.setMatrixAt(i,matrix);}if(b.mesh.count)b.mesh.instanceMatrix.needsUpdate=true;}
 visualState(){const mesh=this.batches.get('beam')!.mesh,matrix=new THREE.Matrix4(),scale=new THREE.Vector3(),beamWidths:number[]=[];for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);beamWidths.push(Number(scale.x.toFixed(4)));}return {castAge:this.cast?this.world.time-this.cast.at:null,beamWidths,grenadeVisible:this.grenade.visible,grenadeScale:this.grenade.scale.x,rings:this.batches.get('ring')!.mesh.count,shields:this.batches.get('shield')!.mesh.count,shapes:[...this.batches.keys()]};}
 private sprite(key:string,p:V,size:number,life:number,color:number,growth=0,ground=false,to?:V,velocity?:V,delay=0){this.view.fx.emit({asset:'fx.hero-skill.'+key,...p,vx:velocity?.x??0,vy:velocity?.y??0,vz:velocity?.z??0,start:this.world.time+delay,life,size,growth,color,ground,angle:this.world.time*.731,to,priority:to?'core':'decoration',neutralize:!key.includes('smoke'),opacity:1});}
 private sparks(p:V,count:number,color:number,force=5,life=.55){count=this.view.fx.heroQuality==='full'?count:Math.max(1,Math.ceil(count*(this.view.fx.heroQuality==='balanced'?.7:.35)));for(let i=0;i<count;i++){const a=i*2.399+this.world.time,r=.5+(i%7)/7;this.sprite('kenney-spark_02',p,.09+(i%3)*.035,life*(.7+r*.4),color,-.1,false,undefined,{x:Math.sin(a)*force*r,y:1+(i%5)*.8,z:Math.cos(a)*force*r});}}
 private blast(p:V,color:number,big=false){this.sprite('flare1',p,big?3.6:1.5,.2,0xfff5d5,big?2:1);this.sprite('fireanim_x4',p,big?6:3.8,big?1.05:.75,color,2);this.sprite('shockwave1_burn1',{...p,y:.08},big?3:1.2,.8,color,big?9:6,true);this.sparks(p,big?38:22,color,big?9:5,.85);for(let i=0;i<(big?10:6);i++){const a=i*2.4;this.sprite('kenney-smoke_04',{x:p.x+Math.sin(a)*.35,y:p.y+.25,z:p.z+Math.cos(a)*.35},.8,1.6,0x79818b,2.3,false,undefined,{x:Math.sin(a)*1.2,y:1.3+i*.08,z:Math.cos(a)*1.2},i*.03);}}
 event(e:VisualEvent,mount:V|null){
  const hero=e.heroId;if(!hero||!['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'].includes(hero))return;
  const p={...e.end,y:e.endY},from=mount??this.cast?.from??{x:e.x,y:e.y,z:e.z},color=colors[hero];
  if(e.kind==='skill-launch'){
   if(hero==='raynor'){this.sprite('flare2b',from,2.4,.19,color);this.sprite('emergytrailorange',from,.5,SKILL_VISUAL_TUNING.raynorRaySeconds,color,0,false,{...this.cast?.end??p});this.sparks(from,8,color,2,.4);}
   if(hero==='tychus')this.sprite('flare1',from,.7,.15,color);
   return;
  }
  if(e.kind==='skill-line'){
   this.sprite('emergytrailcyan',from,.42,.24,0x80dfff,0,false,p);this.sprite('flare1_blueelec',from,2.1,.25,0xa7eaff);this.sparks(from,12,0x93edff,3,.45);return;
  }
  if(e.kind==='skill-dot'){this.stats.dots++;this.echoes.push({p,from,at:e.time,hero,dot:true,id:e.targetId});this.sprite('fireanim_x4',{...p,y:p.y+.5},1.6,.55,0xffa367,.3);this.sparks(p,6,0xffb27e,2,.45);return;}
  if(e.kind!=='skill-impact')return;
  this.stats.impacts++;this.echoes.push({p,from,at:e.time,hero,dot:false,id:e.targetId});
  if(hero==='swann'){this.stats.repairs++;this.sprite('flare1',p,1.1,.42,0xb7ffce,.5);this.sparks(p,8,0xaaffbd,1.2,.5);}
  else if(hero==='tychus')this.blast(p,0xffaa62);
  else if(hero==='yamato_battlecruiser'){this.blast(p,0xffba77,true);this.sprite('shockwave_blur1_blue',{...p,y:.15},2.7,1.1,0x96ddff,11,true);this.sprite('plasmaanimx1_blue',p,4.6,.7,0xa3e5ff,1);}
  else if(hero==='tosh'){
   this.sprite('nebulacloudsalphaparticle_purple',p,3.1,.9,0xc987ff,1.4);this.sprite('flare1_blueelec',p,1.25,.28,0xe4b5ff);this.sprite('kenney-twirl_01',{...p,y:.08},1.8,.85,0xaf69e8,2.3,true);this.sparks(p,12,0xcc96ff,3,.75);
  }else{
   this.sprite(hero==='nova'?'flare1_blueelec':'flare1',p,hero==='nova'?2.2:1.7,.25,hero==='nova'?0xb9f1ff:0xffefc9);this.sparks(p,hero==='nova'?15:10,color,4,.6);this.sprite('energyplane3',p,.8,.4,color,1);
  }
 }
 private draw(shape:Shape,p:V,s:V,color:number,rotation?:V,intensity=1){const b=this.batches.get(shape)!;if(b.count>=CAP)return;obj.position.set(p.x,p.y,p.z);obj.rotation.set(rotation?.x??0,rotation?.y??0,rotation?.z??0);obj.scale.set(s.x,s.y,s.z);obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count++,tint.set(color).multiplyScalar(intensity));}
 private beam(from:V,to:V,width:number,color:number,intensity=1){const b=this.batches.get('beam')!;if(b.count>=CAP)return;const d=vec(to).sub(vec(from)),length=d.length();if(length<.001)return;obj.position.copy(vec(from).add(vec(to)).multiplyScalar(.5));obj.quaternion.setFromUnitVectors(up,d.normalize());obj.scale.set(width,length,width);obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count++,tint.set(color).multiplyScalar(intensity));}
 private ring(p:V,r:number,color:number,angle=0,vertical=false,width=1){this.draw('ring',p,{x:r,y:r,z:width},color,{x:vertical?0:Math.PI/2,y:vertical?angle:0,z:vertical?0:angle});}
 private orb(p:V,r:number,color:number,intensity=1){this.draw('orb',p,{x:r,y:r,z:r},color,undefined,intensity);}
 private charge(from:V,age:number,duration:number,color:number,heavy=false){const t=Math.max(0,Math.min(1,age/duration)),r=(heavy?.7:.35)*(.25+t*.75);this.orb(from,r,color,1.4);this.orb(from,r*.55,0xe6fbff,2.8);for(let i=0;i<3;i++)this.ring(from,(heavy?1.8:1.05)*(1-t)+r*1.5,color,this.world.time*(i%2?-3:3)+i,!!(i%2));for(let i=0;i<(heavy?9:5);i++){const a=this.world.time*4+i*Math.PI*2/(heavy?9:5),radius=(heavy?2.2:1.2)*(1-t)+.2;const p={x:from.x+Math.sin(a)*radius,y:from.y+Math.cos(a*1.6)*radius*.6,z:from.z+Math.cos(a)*radius};this.beam(p,from,.025,color);this.orb(p,.055,color,2);}}
 render(){
  for(const b of this.batches.values())b.count=0;this.grenade.visible=false;const c=this.cast,w=this.world,now=w.time;
  if(c){const age=now-c.at,color=colors[c.hero],from=c.from;
   if(c.hero==='raynor'&&age>=0&&age<SKILL_VISUAL_TUNING.raynorRaySeconds){const t=Math.min(1,age/.2),p=lerp(from,c.end,t),fade=age<.65?1:Math.max(0,(SKILL_VISUAL_TUNING.raynorRaySeconds-age)/(SKILL_VISUAL_TUNING.raynorRaySeconds-.65));this.beam(from,p,.42*fade,color,1.4);this.beam(from,p,.13*fade,0xfff6d8,3);if(age<.25){this.orb(p,.22,color,2);if(now>=this.nextTrail){this.sprite('firestreak7',p,.35,.25,color,.3);this.nextTrail=now+.025;}}}
   if(c.hero==='nova'&&age<.35)this.charge(from,age,.35,0x77deff);
   if(c.hero==='nova'&&age>=.35&&age<.58){const fade=1-(age-.35)/.23;this.beam(from,c.end,.53*fade,0x62d5ff,1.1);this.beam(from,c.end,.1*fade,0xeafaff,3);for(let i=1;i<9;i++){const p=lerp(from,c.end,i/10);this.ring(p,.14+(i%3)*.08,0x8ce7ff,Math.PI/2,true);}}
   if(c.hero==='tychus'&&age<.6){const t=Math.max(0,age/.6),p=lerp(from,c.point,t);p.y+=Math.sin(t*Math.PI)*2.9;this.grenade.visible=true;this.grenade.position.set(p.x,p.y,p.z);this.grenade.rotation.set(t*9,t*6,t*3);this.grenade.scale.setScalar(SKILL_VISUAL_TUNING.tychusGrenadeScale);this.orb(p,.24,0xffdb86);if(now>=this.nextTrail){this.sprite('kenney-smoke_04',p,.35,.6,0x909799,.8);this.sprite('flare1',p,.42,.18,0xffc27b,.2);this.nextTrail=now+.035;}}
   if(c.hero==='tosh'&&age<.5){const center={x:c.source.x,y:2.1,z:c.source.z};this.charge(center,age,.5,0xbb6cf2,true);if(now>=this.nextTrail){for(let i=0;i<4;i++){const a=now*3+i*Math.PI/2;this.sprite('nebulacloudsalphaparticle_purple',{x:center.x+Math.sin(a)*1.2,y:center.y,z:center.z+Math.cos(a)*1.2},.55,.45,0xa968cc,.2);}this.nextTrail=now+.06;}}
   if(c.hero==='yamato_battlecruiser'){
    if(age<1){this.charge(from,age,1,0x93ddff,true);this.beam(from,c.point,.028*SKILL_VISUAL_TUNING.yamatoGuideWidthMultiplier,0x88d5ee);if(now>=this.nextTrail){this.sprite('flare1_blueelec',from,.6+age,.15,0x9fdeff);this.nextTrail=now+.045;}}
    else if(age<1.25){const t=(age-1)/.25,p=lerp(from,c.point,t),tail=lerp(from,c.point,Math.max(0,t-.45));this.beam(tail,p,.85,0xffb75d,1.7);this.beam(tail,p,.22,0xf0faff,3);this.orb(p,.55,0xffc57d,2);this.orb(p,.23,0xf7fdff,3);if(now>=this.nextTrail){this.sprite('firestreak7',p,1.1,.38,0xffbd6e,1.2);this.sprite('emergytrailcyan',tail,.5,.2,0x97e7ff,0,false,p);this.nextTrail=now+.02;}}
   }
   if(c.hero==='swann'&&age<5){
    for(const id of c.targets){const a=w.entities.get(id);if(!a||a.hp<=0||(a.heroCombat?.protectedUntil??0)<=now)continue;const size=this.view.gpu.get(a.modelKey??a.unitType)?.bodyHeight??1.2,p={x:a.x,y:size*.55+.15,z:a.z},radius=Math.max(.95,a.unitRadius+1);this.draw('shield',p,{x:radius,y:size*.65+.4,z:radius},0x8ac9a6);this.ring({x:a.x,y:.14,z:a.z},radius,.0?0:0x8ff9be,now*.25);for(let i=0;i<6;i++){const ang=i*Math.PI/3+now*.18;this.draw('shard',{x:a.x+Math.sin(ang)*radius,y:.5+Math.sin(now*2+i)*.06,z:a.z+Math.cos(ang)*radius},{x:1.4,y:.22,z:1.4},0xe3cf83,{x:Math.PI/2,y:ang,z:0});}
    }
   }
  }
  this.echoes=this.echoes.filter(e=>now-e.at<(e.hero==='tosh'?1.2:e.hero==='yamato_battlecruiser'?1.25:.65));
  for(const e of this.echoes){const t=now-e.at;if(t<0)continue;const color=colors[e.hero],fade=Math.max(0,1-t/(e.hero==='yamato_battlecruiser'?1.25:.8));
   if(e.hero==='swann'){
    if(t<.38){this.beam(e.from,e.p,.11*(1-t/.38),0x81ffc0);for(let i=0;i<5;i++){const q=(t*2.1+i/5)%1,p=lerp(e.from,e.p,q);this.orb(p,.055,0xe6ffdc,2);}for(let i=0;i<3;i++)this.ring({...e.p,y:.2+i*.4+t*.8},.65+Math.sin(t*8)*.15,0xa3ffbc,now, false);}
   }else if(e.hero==='tosh'){
    this.ring({...e.p,y:.1},.3+t*2.4,color,now*.4);for(let i=0;i<7;i++){const a=i*Math.PI*2/7+now*3,r=.4+t*.7;const p={x:e.p.x+Math.sin(a)*r,y:e.p.y+t*2.2+i*.13,z:e.p.z+Math.cos(a)*r};this.orb(p,.05*fade,0xdfc2ff,2);this.draw('shard',p,{x:fade,y:fade*.5,z:fade},color,{x:a,y:now*3,z:a});}if(t<.2)this.beam(e.from,e.p,.035*(1-t/.2),0xb78bf5);
   }else if(e.hero==='yamato_battlecruiser'){
    for(let i=0;i<3;i++)this.ring({...e.p,y:.12+i*.12},.3+t*(4.5+i*.9),i===1?0xa1e8ff:color,0,false,fade);if(t<.35){this.orb(e.p,(.5+t*2)*(1-t/.5),0xffe4ad,2);this.beam({...e.p,y:.15},{...e.p,y:3.8+t*3},.35*fade,0xffe9cb,1.3);}for(let i=0;i<12;i++){const a=i*2.4,r=t*(2+i%4);this.draw('shard',{x:e.p.x+Math.sin(a)*r,y:e.p.y+2.8*t-t*t*2.8,z:e.p.z+Math.cos(a)*r},{x:fade,y:fade*.3,z:fade},i%2?color:0xdaf4ff,{x:a,y:a+t*3,z:now});}
   }else if(e.hero==='tychus'&&!e.dot){this.ring({...e.p,y:.11},.25+t*6,color,0,false,fade);for(let i=0;i<8;i++){const a=i*2.4;this.draw('shard',{x:e.p.x+Math.sin(a)*t*4,y:e.p.y+2*t-t*t*4,z:e.p.z+Math.cos(a)*t*4},{x:fade,y:fade*.3,z:fade},0xebaf74,{x:a+t*5,y:a,z:a});}}
   else if(e.hero==='nova'||e.hero==='raynor')this.ring({...e.p,y:.15},.2+t*2.8,color,0,false,fade);
  }
  let total=0;for(const b of this.batches.values()){b.mesh.count=b.count;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;total+=b.count;}this.stats.active=total;this.stats.peak=Math.max(this.stats.peak,total);
 }
}
