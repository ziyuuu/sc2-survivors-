import type {World} from '../../src/simulation/world';
import type {Entity} from '../../src/simulation/types';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {beginHeroAttack,heroAttackSpeed,heroMainFactor,tickTerranHero} from '../../src/simulation/combat/terran-hero-passives';
import {ATTACK_DEMO_TUNING as T} from './tuning';

export type Point3={x:number;y:number;z:number};
export type PacketKind='main'|'side'|'missile'|'bounce';
export interface AttackPacket {
 id:number;salvo:number;hero:HeroId;rank:number;kind:PacketKind;source:Entity;
 target:number;primaryTarget:number;from:Point3;to:Point3;born:number;arrival:number;
 damage:number;hits:number;rootDamage:number;lane:number;hop:number;parent:number|null;
}
export interface Dot {id:number;source:Entity;target:number;damage:number;remaining:number;next:number;rank:number}
export interface DotLine {id:number;packet:AttackPacket;from:Point3;to:Point3;born:number;end:number;targets:{id:number;arrive:number;applied:boolean}[]}
export type AttackEvent={kind:'launch'|'impact'|'dot'|'splash'|'line-dot';packet:AttackPacket;at:number;p:Point3;targets?:number[];damage?:number};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const point=(e:Entity):Point3=>({x:e.x,y:e.flying?6.2:.85,z:e.z});

/** Local rules fixture: flight arrival, DOT and secondary damage run at 60 Hz, independently of rendering. */
export class AttackSimulation {
 packets:AttackPacket[]=[];dots:Dot[]=[];lines:DotLine[]=[];events:AttackEvent[]=[];
 audit:{id:number;salvo:number;kind:string;target:number;primaryTarget:number;damage:number;hpLoss:number;hop:number;at:number;parent:number|null}[]=[];
 stats={salvos:0,mainHits:0,sideHits:0,missilesLaunched:0,missileHits:0,bounceHits:0,dotTicks:0,dotLineTargets:0,splashHits:0,missileProcs:0};
 private reserved=new Map<number,Set<number>>();private serial=0;private dotSerial=0;private next=Infinity;
 constructor(private w:World){}
 reset(firstAt:number){this.packets=[];this.dots=[];this.lines=[];this.events=[];this.audit=[];this.reserved.clear();this.serial=0;this.dotSerial=0;this.next=firstAt;this.stats={salvos:0,mainHits:0,sideHits:0,missilesLaunched:0,missileHits:0,bounceHits:0,dotTicks:0,dotLineTargets:0,splashHits:0,missileProcs:0};}
 stopFiring(){this.next=Infinity;}
 takeEvents(){const events=this.events;this.events=[];return events;}
 private legal(u:Entity,e:Entity){const rule=HEROES[u.heroId!];return e.owner!==u.owner&&e.hp>0&&this.w.visibleTo(e,u.owner)&&(rule.target==='both'||rule.target==='ground'&&!e.flying)&&this.w.hasAttackLine(u,e);}
 private launch(source:Entity,target:Entity,kind:PacketKind,salvo:number,primaryTarget:number,damage:number,hits:number,lane=0,hop=0,parent:AttackPacket|null=null){
  const from=parent?parent.to:{x:source.x,y:source.flying?6.2:1.2,z:source.z},to=point(target);
  const speed=kind==='missile'?12:kind==='bounce'?13:source.heroId==='swann'?14:source.heroId==='nova'?22:26;
  const duration=kind==='missile'?Math.max(.46,distance(from,to)/speed):Math.max(.14,distance(from,to)/speed);
  const p:AttackPacket={id:++this.serial,salvo,hero:source.heroId!,rank:source.rank,kind,source,target:target.id,primaryTarget,from:{...from},to,born:this.w.time,arrival:this.w.time+duration,damage,hits,rootDamage:parent?.rootDamage??source.weaponDamage*HEROES[source.heroId!].attacks,lane,hop,parent:parent?.id??null};
  this.packets.push(p);this.events.push({kind:'launch',packet:p,at:this.w.time,p:from});if(kind==='missile')this.stats.missilesLaunched++;
  return p;
 }
 private novaLine(p:AttackPacket,target:Entity){
  const from=p.from,dx=target.x-from.x,dz=target.z-from.z,groundLength=Math.max(.001,Math.hypot(dx,dz)),range=p.source.attackRange;
  const to={x:from.x+dx/groundLength*range,y:from.y+(p.to.y-from.y)/groundLength*range,z:from.z+dz/groundLength*range},vx=to.x-from.x,vy=to.y-from.y,vz=to.z-from.z,length=Math.hypot(vx,vy,vz),ux=vx/length,uy=vy/length,uz=vz/length,speed=22;
  const targets=[...this.w.entities.values()].flatMap(e=>{
   if(!this.legal(p.source,e)||this.w.edgeDistance(p.source,e)>range)return [];const ep=point(e),ex=ep.x-from.x,ey=ep.y-from.y,ez=ep.z-from.z,along=ex*ux+ey*uy+ez*uz;
   const across=Math.hypot(ex-along*ux,ey-along*uy,ez-along*uz);if(along<0||along>length+e.unitRadius||across>T.nova.lineWidth/2+e.unitRadius)return [];
   return [{id:e.id,arrive:p.born+Math.max(.14,Math.min(length,along)/speed),applied:false}];
  }).sort((a,b)=>a.arrive-b.arrive||a.id-b.id);
  this.lines.push({id:p.id,packet:p,from:{...from},to,born:p.born,end:p.born+Math.max(.14,length/speed),targets});
 }
 private fire(u:Entity){
  const target=[...this.w.entities.values()].filter(e=>this.legal(u,e)&&this.w.edgeDistance(u,e)<=u.attackRange).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id)[0];if(!target)return;
  u.facing=u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.action='attack';u.attackTarget=target.id;u.lastShotAt=this.w.time;u.shotSequence=(u.shotSequence??0)+1;beginHeroAttack(this.w,u,target);
  const interval=u.attackPeriod/heroAttackSpeed(this.w,u);u.nextShotAt=this.w.time+interval;u.shotInterval=interval;this.next=u.nextShotAt;
  const source=structuredClone(u),salvo=++this.stats.salvos,hero=u.heroId!,rank=u.rank,definition=HEROES[hero];this.w.stats.shots++;this.w.visual('attack',u,target);
  this.reserved.set(salvo,new Set([target.id]));const main=this.launch(source,target,'main',salvo,target.id,u.weaponDamage,definition.attacks);
  if(rank<3)return;
  if(hero==='raynor'){const count=rank>=5?T.raynor.vSides:T.raynor.iiiSides,pool=[...this.w.entities.values()].filter(e=>e.id!==target.id&&this.legal(u,e)&&this.w.edgeDistance(u,e)<=u.attackRange).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id);for(const [i,other] of pool.slice(0,count).entries())this.launch(source,other,'side',salvo,target.id,u.weaponDamage*T.raynor.sideFraction,1,i===0?1:-1);}
  if(hero==='nova')this.novaLine(main,target);
  if((hero==='tychus'||hero==='yamato_battlecruiser')&&salvo%T.missiles.everySalvos===0){
   const pool=[...this.w.entities.values()].filter(e=>e.id!==target.id&&this.legal(u,e)&&this.w.edgeDistance(u,e)<=u.attackRange),count=rank>=5?T.missiles.vCount:T.missiles.iiiCount;this.stats.missileProcs++;
   for(let i=0;i<count&&pool.length;i++){const index=Math.floor(this.w.random()*pool.length),other=pool.splice(index,1)[0];this.launch(source,other,'missile',salvo,target.id,u.weaponDamage*definition.attacks*T.missiles.damageFraction,1,i-(count-1)/2);}
  }
 }
 private damage(p:AttackPacket,target:Entity,amount:number,hits=1,primary=false,kind:string=p.kind){
  const before=target.hp;this.w.attackHit(p.source,target,amount,[],hits,0,primary,1,{enemyFactor:1,apm:false});
  this.audit.push({id:p.id,salvo:p.salvo,kind,target:target.id,primaryTarget:p.primaryTarget,damage:amount*hits*(primary?heroMainFactor(p.source,target):1),hpLoss:before-target.hp,hop:p.hop,at:this.w.time,parent:p.parent});if(this.audit.length>512)this.audit.splice(0,this.audit.length-512);
 }
 private bounce(p:AttackPacket,target:Entity){
  if(p.hop>=T.swann.maxHops)return;const seen=this.reserved.get(p.salvo)!;
  const pool=[...this.w.entities.values()].filter(e=>!seen.has(e.id)&&this.legal(p.source,e)&&e.flying===target.flying&&distance(target,e)<=T.swann.range+e.unitRadius).sort((a,b)=>distance(target,a)-distance(target,b)||a.id-b.id);
  const branches=p.rank>=5?T.swann.vBranches:T.swann.iiiBranches;
  for(const other of pool.slice(0,branches)){seen.add(other.id);this.launch(p.source,other,'bounce',p.salvo,p.primaryTarget,p.damage*T.swann.retainedFraction,1,0,p.hop+1,p);}
 }
 private impact(p:AttackPacket){
  const target=this.w.entities.get(p.target);if(!target||!this.legal(p.source,target))return;
  this.damage(p,target,p.damage,p.hits,p.kind==='main');this.events.push({kind:'impact',packet:p,at:this.w.time,p:point(target)});
  if(p.kind==='main')this.stats.mainHits++;else if(p.kind==='side')this.stats.sideHits++;else if(p.kind==='missile')this.stats.missileHits++;else this.stats.bounceHits++;
  if(p.rank<3)return;
  if(p.hero==='swann'&&(p.kind==='main'||p.kind==='bounce'))this.bounce(p,target);
  if(p.kind!=='main')return;
  if(p.hero==='tosh'){
   const radius=p.rank>=5?T.tosh.vRadius:T.tosh.iiiRadius,fraction=p.rank>=5?T.tosh.vFraction:T.tosh.iiiFraction,targets:number[]=[];
   for(const e of this.w.entities.values())if(e.id!==target.id&&this.legal(p.source,e)&&e.flying===target.flying&&distance(e,target)<=radius+e.unitRadius){this.damage(p,e,p.damage*p.hits*fraction,1,false,'splash');this.stats.splashHits++;targets.push(e.id);}
   this.events.push({kind:'splash',packet:p,at:this.w.time,p:point(target),targets});
  }
 }
 step(dt:number){
  const source=[...this.w.entities.values()].find(e=>e.owner==='terran'&&e.heroId&&e.hp>0);if(source){tickTerranHero(this.w,source,dt);if(this.w.time+1e-8>=this.next)this.fire(source);if(this.w.time-source.lastShotAt>.25)source.action='idle';}
  // Remove due packets before resolving; impacts can append the next real bounce flight.
  const due=this.packets.filter(p=>p.arrival<=this.w.time+1e-8);this.packets=this.packets.filter(p=>p.arrival>this.w.time+1e-8);for(const p of due)this.impact(p);
  for(const line of this.lines)for(const hit of line.targets)if(!hit.applied&&hit.arrive<=this.w.time+1e-8){
   hit.applied=true;const target=this.w.entities.get(hit.id);if(!target||!this.legal(line.packet.source,target))continue;const p=line.packet;
   this.dots.push({id:++this.dotSerial,source:p.source,target:target.id,rank:p.rank,damage:p.damage*p.hits*heroMainFactor(p.source,target)*(p.rank>=5?T.nova.vFraction:T.nova.iiiFraction),remaining:p.rank>=5?T.nova.vTicks:T.nova.iiiTicks,next:this.w.time+T.nova.dotPeriod});
   this.stats.dotLineTargets++;this.events.push({kind:'line-dot',packet:p,at:this.w.time,p:point(target),targets:[target.id]});
  }
  this.lines=this.lines.filter(line=>this.w.time<line.end);
  for(const d of this.dots){const target=this.w.entities.get(d.target);if(!target||!this.legal(d.source,target)){d.remaining=0;continue;}if(d.remaining>0&&d.next<=this.w.time+1e-8){
   const p:AttackPacket={id:-d.id,salvo:0,hero:'nova',rank:d.rank,kind:'main',source:d.source,target:d.target,primaryTarget:d.target,from:point(target),to:point(target),born:this.w.time,arrival:this.w.time,damage:d.damage,hits:1,rootDamage:d.source.weaponDamage,lane:0,hop:0,parent:null};
   this.damage(p,target,d.damage,1,false,'dot');this.events.push({kind:'dot',packet:p,at:this.w.time,p:point(target),damage:d.damage});this.stats.dotTicks++;d.next+=T.nova.dotPeriod;d.remaining--;
  }}this.dots=this.dots.filter(d=>d.remaining>0);
  const active=new Set(this.packets.map(p=>p.salvo));for(const key of this.reserved.keys())if(!active.has(key))this.reserved.delete(key);
 }
 report(){return {stats:{...this.stats},packets:this.packets.map(p=>({id:p.id,kind:p.kind,hero:p.hero,rank:p.rank,salvo:p.salvo,target:p.target,primaryTarget:p.primaryTarget,damage:p.damage*p.hits,rootDamage:p.rootDamage,hop:p.hop,born:p.born,arrival:p.arrival,lane:p.lane})),lines:this.lines.map(line=>({id:line.id,from:{...line.from},to:{...line.to},end:line.end,targets:line.targets.map(t=>({...t}))})),dots:this.dots.map(d=>({target:d.target,damage:d.damage,next:d.next,remaining:d.remaining})),audit:this.audit.map(a=>({...a})),reservedSalvos:this.reserved.size};}
}
