import type {World} from '../world';
import type {Entity,Body} from '../types';
import {HEROES,type HeroId} from '../../data/heroes';
import {isRevisedHero} from '../../data/terran-heroes';
import {isProtossHero} from '../../data/protoss-heroes';
import {isZergHero} from '../../data/zerg-heroes';
import {heroMainFactor,heroState} from './terran-hero-passives';
import {talentModifiers} from './expedition-combat';
import {ATTACK_DEMO_TUNING as T} from '../../data/hero-upgrades';
export type Point3={x:number;y:number;z:number};
export type PacketKind='main'|'side'|'missile'|'bounce';
export interface AttackPacket {
 id:number;salvo:number;hero:HeroId;rank:number;kind:PacketKind;source:Entity;
 target:number;primaryTarget:number;from:Point3;to:Point3;born:number;arrival:number;
 damage:number;hits:number;rootDamage:number;lane:number;hop:number;parent:number|null;
 bonuses:{attribute:string;amount:number}[];shieldBonus:number;crit:number;apm:boolean;primary:boolean;lost:boolean;mountSide?:'Right'|'Left';
}
export interface Dot {id:number;source:Entity;target:number;damage:number;remaining:number;next:number;rank:number}
export interface DotLine {id:number;packet:AttackPacket;from:Point3;to:Point3;born:number;end:number;targets:{id:number;arrive:number;applied:boolean}[]}
export type AttackEvent={kind:'launch'|'impact'|'dot'|'splash'|'line-dot';packet:AttackPacket;at:number;p:Point3;targets?:number[];damage?:number};
export interface HeroAttackState {packets:AttackPacket[];dots:Dot[];lines:DotLine[];chains:{salvo:number;seen:number[]}[]}
export const newHeroAttackState=():HeroAttackState=>({packets:[],dots:[],lines:[],chains:[]});
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const point=(w:World,e:Body):Point3=>({x:e.x,y:e.flying?6.2:(w.terrain?.height(e)??0)+.85,z:e.z});
function legal(w:World,u:Entity,e:Body){return e.owner!==u.owner&&e.hp>0&&w.visibleTo(e,u.owner)&&w.targetAllowed(u,e)&&w.hasAttackLine(u,e);}
function emit(w:World,e:AttackEvent){w.heroAttackEvents.push(e);if(w.heroAttackEvents.length>768)w.heroAttackEvents.splice(0,256);}
function launch(w:World,source:Entity,target:Body,kind:PacketKind,salvo:number,primaryTarget:number,damage:number,hits:number,bonuses:AttackPacket['bonuses'],shieldBonus:number,crit:number,apm:boolean,lane=0,hop=0,parent:AttackPacket|null=null,primary=kind==='main',mountSide?:AttackPacket['mountSide']){
 const from=parent?parent.to:{x:source.x,y:(source.flying?5.6:w.terrain?.height(source)??0)+1.2,z:source.z},to=point(w,target);
 const speed=kind==='missile'?12:kind==='bounce'?13:source.heroId==='swann'?14:source.heroId==='nova'?22:isProtossHero(source.heroId)?source.heroId==='fenix'?19:24:isZergHero(source.heroId)?source.heroId==='hots_leviathan'?18:source.heroId==='stukov'?22:17:26;
 const duration=kind==='missile'?Math.max(.46,distance(from,to)/speed):Math.max(.14,distance(from,to)/speed);
 const p:AttackPacket={id:w.nextId++,salvo,hero:source.heroId!,rank:source.rank,kind,source,target:target.id,primaryTarget,from:{...from},to,born:w.time,arrival:w.time+duration,damage,hits,rootDamage:parent?.rootDamage??source.weaponDamage*HEROES[source.heroId!].attacks,lane,hop,parent:parent?.id??null,bonuses:bonuses.map(b=>({...b})),shieldBonus,crit,apm,primary,lost:false,...(mountSide?{mountSide}: {})};
 w.heroAttacks.packets.push(p);emit(w,{kind:'launch',packet:p,at:w.time,p:from});return p;
}
function novaLine(w:World,p:AttackPacket,target:Body){
 const from=p.from,dx=target.x-from.x,dz=target.z-from.z,groundLength=Math.max(.001,Math.hypot(dx,dz)),range=p.source.attackRange;
 const to={x:from.x+dx/groundLength*range,y:from.y+(p.to.y-from.y)/groundLength*range,z:from.z+dz/groundLength*range},vx=to.x-from.x,vy=to.y-from.y,vz=to.z-from.z,length=Math.hypot(vx,vy,vz),ux=vx/length,uy=vy/length,uz=vz/length;
 const targets=[...w.entities.values()].flatMap(e=>{
  if(!legal(w,p.source,e)||w.edgeDistance(p.source,e)>range)return [];const ep=point(w,e),ex=ep.x-from.x,ey=ep.y-from.y,ez=ep.z-from.z,along=ex*ux+ey*uy+ez*uz;
  const across=Math.hypot(ex-along*ux,ey-along*uy,ez-along*uz);if(along<0||along>length+e.unitRadius||across>T.nova.lineWidth/2+e.unitRadius)return [];
  return [{id:e.id,arrive:p.born+Math.max(.14,Math.min(length,along)/22),applied:false}];
 }).sort((a,b)=>a.arrive-b.arrive||a.id-b.id);
 w.heroAttacks.lines.push({id:p.id,packet:p,from:{...from},to,born:p.born,end:p.born+Math.max(.14,length/22),targets});
}
/** One real main cycle enters here after World has frozen crit, talent bonuses and opening charge. */
export function launchHeroAttacks(w:World,u:Entity,target:Body,bonuses:AttackPacket['bonuses'],shieldBonus:number,crit:number){
 if(!isRevisedHero(u.heroId)&&!isZergHero(u.heroId)&&!isProtossHero(u.heroId))return false;const source=structuredClone(u),hero=u.heroId!,definition=HEROES[hero],salvo=w.nextId++,apm=(talentModifiers(w,u).apmDuplicate??0)>0;
 w.heroAttacks.chains.push({salvo,seen:[target.id]});
 const opposite=hero==='yamato_battlecruiser'?[...w.entities.values()].filter(e=>e.flying!==target.flying&&legal(w,u,e)&&w.edgeDistance(u,e)<=u.attackRange).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id)[0]:undefined;
 const main=launch(w,source,target,'main',salvo,target.id,u.weaponDamage,opposite?1:definition.attacks,bonuses,shieldBonus,crit,apm,0,0,null,true,opposite?'Right':undefined);
 if(opposite)launch(w,source,opposite,'main',salvo,target.id,u.weaponDamage,1,bonuses,shieldBonus,crit,false,0,0,null,false,'Left');
 if(u.rank<3)return true;
 if(hero==='raynor'){const count=u.rank>=5?T.raynor.vSides:T.raynor.iiiSides,pool=[...w.entities.values()].filter(e=>e.id!==target.id&&legal(w,u,e)&&w.edgeDistance(u,e)<=u.attackRange).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id);for(const [i,e] of pool.slice(0,count).entries())launch(w,source,e,'side',salvo,target.id,u.weaponDamage*T.raynor.sideFraction,1,bonuses.map(b=>({...b,amount:b.amount*T.raynor.sideFraction})),shieldBonus*T.raynor.sideFraction,crit,false,i===0?1:-1);}
 if(hero==='nova')novaLine(w,main,target);
 if((hero==='tychus'||hero==='yamato_battlecruiser')&&heroState(u).cycles%T.missiles.everySalvos===0){const pool=[...w.entities.values()].filter(e=>e.id!==target.id&&e.id!==opposite?.id&&legal(w,u,e)&&w.edgeDistance(u,e)<=u.attackRange),count=u.rank>=5?T.missiles.vCount:T.missiles.iiiCount;
  for(let i=0;i<count&&pool.length;i++){const e=pool.splice(Math.floor(w.random()*pool.length),1)[0],f=definition.attacks*T.missiles.damageFraction;launch(w,source,e,'missile',salvo,target.id,u.weaponDamage*f,1,bonuses.map(b=>({...b,amount:b.amount*f})),shieldBonus*f,crit,false,i-(count-1)/2);}}
 return true;
}
function damage(w:World,p:AttackPacket,target:Body,amount:number,hits=1,primary=false){w.attackHit(p.source,target,amount,p.bonuses,hits,p.shieldBonus,primary,p.crit,{enemyFactor:1,apm:primary&&p.apm});}
function impact(w:World,p:AttackPacket){const target=w.body(p.target);if(p.lost||!target||!legal(w,p.source,target)||['kerrigan','dehaka','artanis','zeratul','alarak','vorazun'].includes(p.hero)&&w.edgeDistance(p.source,target)>p.source.attackRange+.3)return;
 damage(w,p,target,p.damage,p.hits,p.primary);emit(w,{kind:'impact',packet:p,at:w.time,p:point(w,target)});
 if(p.rank<3)return;
 if(p.hero==='swann'&&(p.kind==='main'||p.kind==='bounce')&&p.hop<T.swann.maxHops){const chain=w.heroAttacks.chains.find(c=>c.salvo===p.salvo);if(chain){const pool=[...w.entities.values()].filter(e=>!chain.seen.includes(e.id)&&legal(w,p.source,e)&&e.flying===target.flying&&distance(target,e)<=T.swann.range+e.unitRadius&&(!w.terrain||w.terrain.lineOfFire(target,e,false,e.flying))).sort((a,b)=>distance(target,a)-distance(target,b)||a.id-b.id);
  for(const e of pool.slice(0,p.rank>=5?T.swann.vBranches:T.swann.iiiBranches)){chain.seen.push(e.id);launch(w,p.source,e,'bounce',p.salvo,p.primaryTarget,p.damage*T.swann.retainedFraction,1,p.bonuses.map(b=>({...b,amount:b.amount*T.swann.retainedFraction})),p.shieldBonus*T.swann.retainedFraction,p.crit,false,0,p.hop+1,p,false);}}}
 if(p.kind==='main'&&p.hero==='tosh'){const radius=p.rank>=5?T.tosh.vRadius:T.tosh.iiiRadius,fraction=p.rank>=5?T.tosh.vFraction:T.tosh.iiiFraction,targets:number[]=[];
  for(const e of w.entities.values())if(e.id!==target.id&&legal(w,p.source,e)&&e.flying===target.flying&&distance(e,target)<=radius+e.unitRadius&&(!w.terrain||w.terrain.lineOfFire(target,e,false,e.flying))){const splash={...p,bonuses:p.bonuses.map(b=>({...b,amount:b.amount*p.hits*fraction})),shieldBonus:p.shieldBonus*p.hits*fraction};damage(w,splash,e,p.damage*p.hits*fraction);targets.push(e.id);}
  emit(w,{kind:'splash',packet:p,at:w.time,p:point(w,target),targets});}
}
/** Render-independent 60 Hz arrival and per-target DOT. Caster death does not erase launched packets. */
export function tickHeroAttacks(w:World){const state=w.heroAttacks;
 for(const p of state.packets){const target=w.body(p.target);if(!target||!legal(w,p.source,target))p.lost=true;else if(!p.lost)p.to=point(w,target);}
 const due=state.packets.filter(p=>p.arrival<=w.time+1e-8);state.packets=state.packets.filter(p=>p.arrival>w.time+1e-8);for(const p of due)impact(w,p);
 for(const line of state.lines)for(const hit of line.targets)if(!hit.applied&&hit.arrive<=w.time+1e-8){hit.applied=true;const target=w.entities.get(hit.id),p=line.packet;if(!target||!legal(w,p.source,target))continue;
  const f=p.rank>=5?T.nova.vFraction:T.nova.iiiFraction;state.dots.push({id:w.nextId++,source:p.source,target:target.id,rank:p.rank,damage:(p.damage+p.bonuses.reduce((sum,b)=>sum+(target.attributes.includes(b.attribute)?b.amount:0),0))*p.hits*heroMainFactor(p.source,target)*f*p.crit,remaining:p.rank>=5?T.nova.vTicks:T.nova.iiiTicks,next:w.time+T.nova.dotPeriod});emit(w,{kind:'line-dot',packet:p,at:w.time,p:point(w,target),targets:[target.id]});}
 state.lines=state.lines.filter(line=>w.time<line.end);
 for(const d of state.dots){const target=w.entities.get(d.target);if(!target||target.hp<=0){d.remaining=0;continue;}if(d.remaining>0&&d.next<=w.time+1e-8){
  // DOT already contains the frozen opening, bonuses and crit; no recursive passive/APM/loot-chain proc.
  w.hit(target,d.damage,[],1,d.source.owner,.5,0,d.source.id,false,false,0,true);
  const p:AttackPacket={id:d.id,salvo:0,hero:'nova',rank:d.rank,kind:'main',source:d.source,target:d.target,primaryTarget:d.target,from:point(w,target),to:point(w,target),born:w.time,arrival:w.time,damage:d.damage,hits:1,rootDamage:d.source.weaponDamage,lane:0,hop:0,parent:null,bonuses:[],shieldBonus:0,crit:1,apm:false,primary:false,lost:false};
  emit(w,{kind:'dot',packet:p,at:w.time,p:point(w,target),damage:d.damage});d.next+=T.nova.dotPeriod;d.remaining--;}}
 state.dots=state.dots.filter(d=>d.remaining>0);const active=new Set(state.packets.map(p=>p.salvo));state.chains=state.chains.filter(c=>active.has(c.salvo));
}
export function validateHeroAttacks(s:HeroAttackState){
 const id=(v:number)=>Number.isSafeInteger(v)&&v>0,position=(p:Point3)=>p&&[p.x,p.y,p.z].every(Number.isFinite);
 const packet=(p:AttackPacket)=>p&&id(p.id)&&id(p.salvo)&&id(p.source?.id)&&id(p.target)&&id(p.primaryTarget)&&(isRevisedHero(p.hero)||isZergHero(p.hero)||isProtossHero(p.hero))&&p.source.heroId===p.hero&&Number.isInteger(p.rank)&&p.rank>=1&&p.rank<=5&&['main','side','missile','bounce'].includes(p.kind)&&[p.born,p.arrival,p.damage,p.rootDamage,p.shieldBonus,p.crit,p.lane].every(Number.isFinite)&&p.arrival>=p.born&&p.damage>=0&&p.rootDamage>=0&&p.crit>=1&&[1,2].includes(p.hits)&&Number.isInteger(p.hop)&&p.hop>=0&&p.hop<=T.swann.maxHops&&(p.parent===null||id(p.parent))&&position(p.from)&&position(p.to)&&['apm','primary','lost'].every(k=>typeof p[k as keyof AttackPacket]==='boolean')&&(!p.mountSide||['Right','Left'].includes(p.mountSide))&&Array.isArray(p.bonuses)&&p.bonuses.every(b=>typeof b.attribute==='string'&&Number.isFinite(b.amount));
 if(!s||!Array.isArray(s.packets)||!Array.isArray(s.dots)||!Array.isArray(s.lines)||!Array.isArray(s.chains)||s.packets.length>4096||s.dots.length>16384||s.lines.length>4096||s.chains.length>4096||s.packets.some(p=>!packet(p))||new Set(s.packets.map(p=>p.id)).size!==s.packets.length||s.dots.some(d=>!id(d.id)||!id(d.target)||d.source?.heroId!=='nova'||![d.damage,d.next].every(Number.isFinite)||d.damage<0||!Number.isInteger(d.rank)||d.rank<3||d.rank>5||!Number.isInteger(d.remaining)||d.remaining<1||d.remaining>4)||s.lines.some(l=>!packet(l.packet)||l.id!==l.packet.id||!position(l.from)||!position(l.to)||![l.born,l.end].every(Number.isFinite)||l.end<l.born||!Array.isArray(l.targets)||new Set(l.targets.map(t=>t.id)).size!==l.targets.length||l.targets.some(t=>!id(t.id)||!Number.isFinite(t.arrive)||typeof t.applied!=='boolean'))||s.chains.some(c=>!id(c.salvo)||!Array.isArray(c.seen)||c.seen.some(v=>!id(v))||new Set(c.seen).size!==c.seen.length)||new Set(s.chains.map(c=>c.salvo)).size!==s.chains.length||s.packets.some(p=>!s.chains.some(c=>c.salvo===p.salvo&&c.seen.includes(p.primaryTarget))))throw Error('确认版英雄攻击续局数据无效');
}

/** Actual flagship-owned bolt; the child's original identity and mount remain the source. */
export function launchProtossChildAttack(w:World,child:Entity,mother:Entity,target:Body){const source=structuredClone(child);source.heroId='purifier_flagship';source.rank=mother.rank;const salvo=w.nextId++;w.heroAttacks.chains.push({salvo,seen:[target.id]});return launch(w,source,target,'main',salvo,target.id,child.weaponDamage,1,[],0,1,false,0,0,null,false);}
