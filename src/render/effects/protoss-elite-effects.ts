import * as THREE from 'three';
import type {World} from '../../simulation/world';
import type {Entity,VisualEvent} from '../../simulation/types';
import {isProtossEliteId} from '../../data/protoss-elites';
import {ProtossHeroMaterials} from './protoss-hero-materials';
import type {BattleEffects} from './battle-effects';
type P={x:number;y:number;z:number};
const mix=(a:P,b:P,t:number):P=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
/** Own texture batches and frozen event anchors: never modifies the approved hero composer. */
export class ProtossEliteEffects {
 ready=false;quality:'full'|'balanced'|'low'='full';private material:ProtossHeroMaterials;private serial=0;private time=0;private echoes:{e:VisualEvent;life:number}[]=[];
 private counts={flights:0,blades:0,beams:0,fields:0,shields:0,lifts:0,echoes:0};
 constructor(scene:THREE.Scene,fx:BattleEffects,camera:THREE.Camera){this.material=new ProtossHeroMaterials(scene,camera,fx);}
 async load(){if(this.ready)return;this.material.prepare();this.ready=true;}
 reset(){this.echoes=[];this.serial=0;this.time=0;if(this.ready)this.material.reset();}
 report(){return {ready:this.ready,quality:this.quality,...this.counts,materials:this.material.report()};}
 render(w:World,visible:(p:{x:number;z:number})=>boolean,muzzle:(e:VisualEvent)=>P){if(!this.ready)return;if(w.time<this.time){this.echoes=[];this.serial=0;}this.time=w.time;this.material.begin(w.time);this.counts={flights:0,blades:0,beams:0,fields:0,shields:0,lifts:0,echoes:0};const density=this.quality==='full'?1:this.quality==='balanced'?.65:.35;
  const p=(b:{x:number;z:number;flying?:boolean},height=.8):P=>({x:b.x,z:b.z,y:(b.flying?5.6:w.terrain?.height(b)??0)+height});
  const glow=(b:P,size:number,color=0x80dafa,opacity=.8)=>this.material.sprite('glow',b,size,color,opacity,Math.floor(w.time*24)%16);
  const beam=(a:P,b:P,width:number,color:number,fade=1)=>{this.material.ribbon('beam',a,b,width*1.7,color,.24*fade,0,true,.85);this.material.ribbon('beam',a,b,width,color,.8*fade,0,true,1.05);};
  for(const f of w.weaponFlights){const u=f.source,mother=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!isProtossEliteId(u.eliteId)&&!isProtossEliteId(mother?.eliteId)||w.time<f.start||!visible(f.point))continue;const target=w.body(f.target),distance=Math.max(.01,Math.hypot(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z)),travel=Math.hypot(f.point.x-f.from.x,f.point.z-f.from.z),t=Math.min(1,travel/distance),from=p({...f.from,flying:u.flying}),to=p({...f.point,flying:target?.flying}),head={...to,y:from.y+(to.y-from.y)*t},a=Math.atan2(f.lastSeen.x-f.from.x,f.lastSeen.z-f.from.z),heavy=u.unitType==='immortal'||mother?.eliteId==='carrier.2',size=heavy?.7:u.unitType==='adept'?.53:.35,color=u.eliteId==='adept.3'||u.eliteId==='stalker.3'?0xbb9aff:0x84d9ff;
   const event=w.visualEvents.find(e=>e.attackId===f.attackId);if(event){const mount=muzzle(event),blend=Math.max(0,1-travel/1.4);head.x+=(mount.x-f.from.x)*blend;head.z+=(mount.z-f.from.z)*blend;head.y+=(mount.y-from.y)*blend;}
   const tail={x:head.x-Math.sin(a)*(heavy?1.2:.72),y:head.y,z:head.z-Math.cos(a)*(heavy?1.2:.72)};beam(tail,head,size*.58,color);glow(head,size*1.4,color,.9);this.material.sprite('plasma',head,size,color,.5,Math.floor(w.time*18)%16,a,true,.9);if(heavy){const rear=mix(tail,head,.15);glow(rear,size*.65,0xecddaf,.75);}this.counts.flights++;
  }
  for(const e of w.visualEvents){if(e.serial<=this.serial||e.heroId||!isProtossEliteId(e.eliteId)||w.time-e.time>.3)continue;if(['attack','weapon-area','projectile-impact','strategic-impact','storm-start','support-impact','barrier-start'].includes(e.kind))this.echoes.push({e:structuredClone(e),life:e.kind==='attack'?(e.unitType==='zealot'?.55:.32):e.kind==='strategic-impact'?.85:.5});}this.serial=w.visualEvents.at(-1)?.serial??this.serial;this.echoes=this.echoes.filter(x=>w.time-x.e.time<x.life).slice(-256);
  for(const {e,life}of this.echoes){if(!visible(e)&&!visible(e.end))continue;const age=w.time-e.time,fade=Math.pow(Math.max(0,1-age/life),.7),origin={x:e.x,y:e.y,z:e.z},end={x:e.end.x,y:e.endY,z:e.end.z};
   if(e.kind==='attack'&&e.unitType==='zealot'){const third=e.eliteId==='zealot.1'&&(e.shotSequence??0)%3===0,radius=third?3:1.35;for(let blade=0;blade<2;blade++){const points:P[]=[],widths:number[]=[];for(let i=0;i<=22;i++){const t=i/22,a=e.facing+(t-.5)*(third?Math.PI:2.1)+(blade-.5)*.24,r=radius*(.85+.15*Math.sin(t*Math.PI));points.push({x:origin.x+Math.sin(a)*r,y:origin.y+.15+Math.sin(t*Math.PI)*.45+blade*.18,z:origin.z+Math.cos(a)*r});widths.push(.62*Math.sin(t*Math.PI)*fade);}this.material.stroke(points,widths,e.eliteId==='zealot.2'?0xffd58b:0x8fdcff,.8*fade,1);}this.counts.blades++;continue;}
   if(e.kind==='attack'&&e.unitType==='void_ray'){const a=muzzle(e),strength=e.eliteId==='void_ray.1'?1+Math.min(1,(w.entities.get(e.entityId)?.protossEliteCombat?.lastFire??0)-(w.entities.get(e.entityId)?.protossEliteCombat?.lockAt??0))/2:1;beam(a,end,.62*strength,e.eliteId==='void_ray.3'?0xb3a1ff:0x6fe1f3,fade);glow(end,1.35,0xd2e9ff,fade);this.counts.beams++;continue;}
   if(e.kind==='attack'){glow(muzzle(e),e.unitType==='immortal'?1:.55,0xd0edff,fade*.8);continue;}
   if(e.kind==='barrier-start'||e.kind==='support-impact'){glow(end,1.4,0xa8dfff,fade*.38);continue;}
   const large=e.kind==='strategic-impact',radius=large?3:.65;glow(end,radius*2.1,e.eliteId==='adept.3'?0xcba7ff:0xc4e6ff,fade*.8);this.material.sprite('plasma',end,radius*2.5,0x8797e6,fade*.5,Math.floor(age*30)%16,0,true,.8);for(let i=0;i<Math.ceil((large?14:5)*density);i++){const a=i*2.399,dist=radius*age*2,head={x:end.x+Math.sin(a)*dist,y:end.y+.2+(i%3)*age,z:end.z+Math.cos(a)*dist},tail=mix(end,head,.65);beam(tail,head,.1,0xa6dfff,fade*.65);}this.counts.echoes++;
  }
  // Join only contiguous, forward segments from the same real source and width.
  // One UV strip removes seams without extending the live simulation trail.
  const trails:{source:number;width:number;color:number;points:P[];until:number}[]=[];
  for(const f of w.effects){const u=w.entities.get(f.source);if(f.kind!=='hero-line'||!u||u.heroId||!isProtossEliteId(u.eliteId)||f.until<=w.time||u.unitType==='zealot'||u.unitType==='void_ray'||!visible(f))continue;const a=p({...f,flying:u.flying},.8),b=p(f.end,.8),width=Math.max(.4,f.radius),color=u.unitType==='colossus'?0xffbc79:0xbfc4ff;
   const joined=trails.find(t=>{if(t.source!==u.id||t.width!==width||f.until<t.until||f.until-t.until>.08)return false;const head=t.points.at(-1)!,before=t.points.at(-2)!;if(Math.hypot(head.x-a.x,head.y-a.y,head.z-a.z)>.002)return false;const ax=head.x-before.x,az=head.z-before.z,bx=b.x-a.x,bz=b.z-a.z;return (ax*bx+az*bz)/Math.max(.001,Math.hypot(ax,az)*Math.hypot(bx,bz))>.98;});
   if(joined){joined.points.push(b);joined.until=f.until;}else trails.push({source:u.id,width,color,points:[a,b],until:f.until});
  }
  for(const t of trails){const fade=Math.min(1,(t.until-w.time)/.2);this.material.stroke(t.points,t.points.map(()=>t.width*1.7),t.color,.24*fade,.85);this.material.stroke(t.points,t.points.map(()=>t.width),t.color,.8*fade,1.05);glow(t.points.at(-1)!, .7,0xe8e9bb,fade*.7);this.counts.beams++;}
  for(const f of w.protossElites.fields){if(!visible(f.point))continue;const center=p(f.point,.12),n=Math.ceil((f.kind==='guardian'?12:18)*density),color=f.kind==='fire'?0xffbe75:f.kind==='web'?0xb6a0fa:0x7dcfff;for(let i=0;i<n;i++){const a=i*2.399+w.time*.13,r=f.radius*Math.sqrt((i+.5)/n)*.85,base={x:center.x+Math.sin(a)*r,y:center.y,z:center.z+Math.cos(a)*r};this.material.sprite('plasma',{...base,y:base.y+.3+Math.sin(w.time*2+i)*.15},1.5,color,.23,Math.floor(w.time*16+i)%16,i,true,.8);if(f.kind==='storm'||f.kind==='web'){const points=Array.from({length:6},(_,j)=>({x:base.x+Math.sin(j*4+i+w.time*9)*.15,y:base.y+2.6-j*.5,z:base.z+Math.cos(j*3+i)*.16}));this.material.stroke(points,[.02,.14,.17,.13,.1,.01],color,.75,1);glow(base,.5,color,.5);}else if(f.kind==='fire')beam({...base,y:base.y+.1},{...base,x:base.x+.2,y:base.y+.8},.5,color,.6);}this.counts.fields++;}
  for(const lift of w.protossElites.lifts){const u=w.entities.get(lift.target);if(!u?.hp||!visible(u))continue;const base=p({...u,flying:false},.1);for(let i=0;i<3;i++){const points=Array.from({length:25},(_,j)=>{const t=j/24,a=t*Math.PI*3+i*Math.PI*2/3-w.time*2;return {x:u.x+Math.sin(a)*.65,y:base.y+t*6,z:u.z+Math.cos(a)*.65};});this.material.stroke(points,points.map((_,j)=>.22*Math.sin(j/24*Math.PI)),0xaaafff,.6,1);}glow(p(u),1.7,0xc2bbff,.45);this.counts.lifts++;}
  for(const u of w.allies()){if(!isProtossEliteId(u.eliteId)||!visible(u))continue;const state=u.protossEliteCombat,r=Math.max(.8,u.unitRadius*1.5);if((state?.barrier??0)>0||u.barrier||state?.overdriveUntil!>w.time){for(let i=0;i<3;i++){const a=w.time*.7+i*2.1,pos={...p(u),x:u.x+Math.sin(a)*r*.6,z:u.z+Math.cos(a)*r*.6};this.material.sprite('plasma',pos,r*1.9,0x8cc8ff,.27,Math.floor(w.time*16)%16,i,true,.85);}glow(p(u),r*1.5,0xb9dfff,.25);this.counts.shields++;}}
  for(const barrier of w.teamAuras.barriers){const u=w.entities.get(barrier.target);if(!u?.hp||barrier.amount<=0||!visible(u))continue;const color=barrier.kind==='phase'?0xaacbff:0xc9a095;this.material.sprite('plasma',p(u),Math.max(1,u.unitRadius*2.5),color,.24,Math.floor(w.time*18)%16,0,true,.65);this.counts.shields++;}
  this.material.end();
 }
}
