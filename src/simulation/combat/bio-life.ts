import {rankStats} from '../../data/ranks';
import {eliteStats} from '../../data/elites';
import {SC2_UNITS,type UnitType} from '../../data/sc2-units';
import type {Entity,HeroRecord} from '../types';
import type {World} from '../world';
import {bioTriggerReady} from './bio-acquisition';
import {deployExpeditionHero} from './expedition-heroes';
import {compositeHeroBuff} from './team-auras';
import {bioFormal} from './bio-state';
import {bioBody,bioFormalSeat,level,value,reserve,isBoss,near,type BioMember} from './bio-runtime';
import {stableDps} from './bio-combat';
export interface BioAppointment {body:Entity;carrier:number;kind:'twin'|'cocoon';at:number;reserved:boolean;result:'original'|'baneling'|'zergling'|'mutalisk'}
type Role=NonNullable<BioMember['role']>;
const bodies=(w:World,role:Role)=>w.allies().filter(a=>a.bio?.role===role);
function spawn(w:World,role:Role,type:UnitType,host:Entity,hp:number,damage:number,model?:string,seconds?:number){
 const pos=role==='cocoon'?host:w.freePosition(type,host,1,2)??host;
 const u=w.addUnit(type,'terran',pos.x,pos.z,host.rank);u.temporary=true;u.temporaryKind='bio';u.bio={role,host:host.id,followHp:hp,followDamage:damage};if(model)u.modelKey=model;
 if(seconds)u.temporaryUntil=w.time+seconds;
 u.hp=u.maxHp=hp;u.weaponDamage=damage;u.armor=role==='overlord'?4:u.armor;Object.assign(u.bio,{followPeriod:u.attackPeriod,followMove:u.moveSpeed,followArmor:u.armor});
 u.visualScale=role==='hatchling'?.65:1;if(role==='overlord'||role==='cocoon'){u.attackRange=0;u.weaponDamage=0;}
 return u;
}
export function bioFollowerStats(w:World,u:Entity,fill:boolean){
 if(!u.bio?.role)return false;const c=u.bio,ratio=u.hp/u.maxHp;
 const aura=level(w,'BIO-O02')?compositeHeroBuff(w,u):undefined;
 u.maxHp=(c.followHp??u.maxHp)*(1+(aura?.maxHp??0));u.hp=u.maxHp*(fill?1:ratio);u.weaponDamage=(c.followDamage??u.weaponDamage)*(1+(aura?.damage??0));if(c.followPeriod)u.attackPeriod=c.followPeriod/(1+(aura?.speed??0));if(c.followMove)u.moveSpeed=c.followMove*(1+(aura?.move??0));u.armor=(c.followArmor??0)*(1+(aura?.armorPct??0));return true;
}
function pair(w:World,u:Entity,role:'hound'|'twin'){
 const c=bioBody(u),dog=role==='hound';
 const seats=dog?(w.expedition.bio!.houndSeats??=[]):undefined;
 let seat=seats?.find(s=>s.host===u.id);
 if(seats&&!seat){
  seat=seats.find(s=>!(w.entities.get(s.host)?.hp??0)&&!w.expedition.bio!.appointments?.some(a=>a.body.id===s.host)&&!w.starship.life.pending.has(s.host));
  if(seat){seat.host=u.id;c.hound=seat.hound;c.houndAt=seat.ready;}
  else {seat={host:u.id,hound:c.hound,ready:c.houndAt??0};seats.push(seat);}
 }
 const known=c[role],mate=known===undefined?undefined:w.entities.get(known);
 // A new occupant waits for the old host's independently surviving hound to leave.
 if(dog&&mate&&mate.hp>0&&mate.bio?.host!==u.id)return;
 const swarm=level(w,'BIO-N03')?1.25:1,rank=rankStats(u.rank),type=dog?'zergling':'reaper',d=SC2_UNITS[type];
 const hp=dog?d.maxHp*rank.health*(1+value(w,'BIO-W01',0,.15,.3))*swarm:.6*u.maxHp*swarm/(u.teamAuraFactors?.hp??1);
 const dmg=dog?d.attackDamage*rank.damage*(1+value(w,'BIO-W01',0,.1,.2))*swarm:.6*u.weaponDamage*swarm/(c.hostAura?.damage??1);
 const period=dog?d.attackPeriod/rank.attackSpeed:u.attackPeriod*(c.hostAura?.speed??1);
 if(mate&&mate.hp>0){mate.rank=u.rank;mate.bio!.followHp=hp;mate.bio!.followDamage=dmg;mate.bio!.followPeriod=period;bioFollowerStats(w,mate,false);mate.temporaryUntil=undefined;return;}
 if(w.time<(dog?Math.max(c.houndAt??0,seat?.ready??0):Math.max(c.twinAt??0,c.pairReady??0)))return;
 const child=spawn(w,role,type,u,hp,dmg);c[role]=child.id;child.bio!.followPeriod=period;bioFollowerStats(w,child,true);
 if(seat)seat.hound=child.id;
 if(!dog&&known!==undefined){child.hp*=.5;c.pairReady=w.time+60;} 
}
function blast(w:World,u:Entity,damage:number,radius:number){
 w.visual('support-impact',u,u,undefined,undefined,{bioEffect:'burst',supportRadius:radius});
 for(const e of w.entities.values())if(e.owner==='zerg'&&e.hp>0&&!e.flying&&near(e,u,radius+e.unitRadius))w.hit(e,damage,[],1,'terran',.5,0,u.id);
}
export function bioLethal(w:World,u:Entity){
 if(u.hp>0||!level(w,'BIO-N02')||!bioFormal(u)||!(['BIO-W02','BIO-G09','BIO-P05','BIO-B04'] as const).some(id=>level(w,id)))return;
 const c=bioBody(u);if(c.rushEnd!==undefined){u.hp=1;return;}const seat=bioFormalSeat(w,u);if(Math.max(c.lastRush??-91,seat.lastRush??-91)+90>w.time)return;
 seat.lastRush=c.lastRush=w.time;c.rushEnd=w.time+2;u.hp=1;u.windup=0;u.pendingTarget=null;
}
export function bioSpecialAction(w:World,u:Entity,dt:number){
 const c=u.bio;if(!c)return false;
 if(c.rushEnd!==undefined){
  const enemy=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&!e.flying&&near(e,u,8)&&w.hasAttackLine(u,e)).sort((a,b)=>w.edgeDistance(u,a)-w.edgeDistance(u,b)||a.id-b.id)[0];
  if(w.time>=c.rushEnd||enemy&&w.edgeDistance(u,enemy)<.4){c.rushEnd=undefined;blast(w,u,(2*stableDps(u)+.2*u.maxHp)*(reserve(w,'BIO-N02')?1.5:1),2.5);w.killEncounterHost(u);}
  else if(enemy){const d=Math.hypot(enemy.x-u.x,enemy.z-u.z),step=Math.min(d,dt*u.moveSpeed*1.8);u.x+=(enemy.x-u.x)*step/d;u.z+=(enemy.z-u.z)*step/d;u.facing=Math.atan2(enemy.x-u.x,enemy.z-u.z);u.action='move';}
  return true;
 }
 if(c.role==='cocoon'){u.action='idle';return true;}
 if(c.role==='overlord'){const dx=w.anchor.x-u.x,dz=w.anchor.z-u.z,d=Math.hypot(dx,dz);if(d>2){u.x+=dx/d*dt;u.z+=dz/d*dt;u.action='move';}else u.action='idle';return true;}
 if(c.role==='hatchling'||c.role==='mutation'&&u.unitType==='baneling'){
  const radius=c.role==='hatchling'?1.4:2.2;
  if([...w.entities.values()].some(e=>e.owner==='zerg'&&e.hp>0&&!e.flying&&w.edgeDistance(u,e)<.5)){
   blast(w,u,u.weaponDamage,radius*(level(w,'BIO-N03')?1.15:1));
   releaseDeathStim(w,u);w.expireUnit(u);return true;
  }
 }
 return false;
}
function egg(w:World,body:Entity){
 const s=w.expedition.bio!;if(!level(w,'BIO-B03')||w.time<(body.bio?.eggReady??0)||w.starship.life.pending.has(body.id))return;
 const appointments=s.appointments??=[],enhanced=!!level(w,'BIO-N07'),reserved=(s.nodeReserves['BIO-N07']??0)>appointments.filter(a=>a.reserved).length;
 const roll=reserved?0:w.random(),result=roll<.5?'original':roll<.7?'baneling':roll<.9?'zergling':'mutalisk';
 const egg=spawn(w,'cocoon','zergling',body,body.maxHp*.2,0,'fun-cocoon');
 if(enhanced){egg.bio!.barrier=body.maxHp*.1;egg.bio!.barrierEnd=w.time+3.1;}
 appointments.push({kind:'cocoon',body:structuredClone(body),carrier:egg.id,at:w.time+(enhanced?3:5),result,reserved});s.appointments=appointments;
}
function releaseDeathStim(w:World,u:Entity){
 const s=w.expedition.bio;
 if(!s||!level(w,'BIO-N03')||!bioTriggerReady(w,'BIO-N03')||w.time<(s.freeStimAt??0))return;
 if(!bioFormal(u)&&(!u.bio?.role||u.bio.role==='cocoon'))return;
 const seconds=s.nodeReserves['BIO-N03']?8:5;
 const allies=w.allies().filter(a=>a.id!==u.id&&bioFormal(a)&&near(a,u,6)&&a.stimUntil<w.time+seconds);
 if(!allies.length)return;
 s.freeStimAt=w.time+8;reserve(w,'BIO-N03');
 for(const ally of allies){
  const c=bioBody(ally),previousEnd=ally.stimUntil;ally.stimUntil=w.time+seconds;c.freeStim=ally.stimUntil;
  // Extending a paid dose changes its normal end, not the amount that was actually paid.
  if(c.paid&&c.stimEnd===previousEnd&&previousEnd>=w.time)c.stimEnd=ally.stimUntil;
  w.visual('bio-response',ally,ally,undefined,undefined,{bioResponse:'stim'});
 }
}
export function bioDeath(w:World,u:Entity,source?:number){
 const s=w.expedition?.bio;if(!s)return;
 if(u.owner==='zerg'){const host=source===undefined?undefined:w.entities.get(source);if(!host||!bioFormal(host)||!level(w,'BIO-B01')||w.time<(host.bio?.hatchAt??0)||bodies(w,'hatchling').length>=value(w,'BIO-B01',6,8,10)||w.random()>=value(w,'BIO-B01',.12,.18,.24))return;
  bioBody(host).hatchAt=w.time+1;const boost=level(w,'BIO-N03')?1.25:1;const larva=spawn(w,'hatchling','baneling',host,.2*host.maxHp*boost,.8*stableDps(host)*boost,undefined,8);larva.x=u.x;larva.z=u.z;return;}
 if(u.bio?.role==='overlord')s.overlordAt=w.time+60;
 releaseDeathStim(w,u);
 if(u.bio?.role==='hound'||u.bio?.role==='twin'){const host=w.entities.get(u.bio.host!);
  if(u.bio.role==='hound'){const seat=s.houndSeats?.find(s=>s.hound===u.id);if(seat)seat.ready=w.time+90;}
  if(host?.hp){if(u.bio.role==='hound')bioBody(host).houndAt=w.time+90;else bioBody(host).twinAt=w.time+25;}
  else if(u.bio.role==='twin'){const app=s.appointments?.find(a=>a.kind==='twin'&&a.carrier===u.id);if(app){s.appointments=s.appointments!.filter(a=>a!==app);egg(w,app.body);}}
  return;
 }
 if(!bioFormal(u))return;
 if(level(w,'BIO-G01'))blast(w,u,stableDps(u)*value(w,'BIO-G01',.8,1.2,1.6),1.8);
 const dog=w.entities.get(u.bio?.hound??-1);if(dog&&dog.hp>0)dog.temporaryUntil=w.time+10;
 const twin=w.entities.get(u.bio?.twin??-1);if(twin&&twin.hp>0){(s.appointments??=[]).push({kind:'twin',body:structuredClone(u),carrier:twin.id,at:Math.max(w.time+25,u.bio?.pairReady??0),result:'original',reserved:false});return;}
 egg(w,u);
}
function settle(w:World,a:BioAppointment,carrier:Entity){
 const old=a.body,c=bioBody(old);
 if(a.result==='original'){
  const restore=structuredClone(old);restore.hp=restore.maxHp*(a.reserved?.75:.5);restore.deadAt=null;restore.action='idle';restore.x=carrier.x;restore.z=carrier.z;restore.prev={x:restore.x,z:restore.z};restore.pendingTarget=null;restore.windup=0;
  const next=bioBody(restore);next.rushEnd=undefined;next.paid=undefined;next.refund=undefined;next.stimEnd=undefined;restore.stimUntil=0;
  if(a.kind==='cocoon'){next.eggReady=w.time+60;next.survival=level(w,'BIO-N07')?Math.floor((c.survival??0)/2):0;next.kills=level(w,'BIO-N07')?Math.floor((c.kills??0)/2):0;next.surviveTime=0;if(a.reserved)reserve(w,'BIO-N07');}else next.pairReady=w.time+60;
  w.entities.set(restore.id,restore);w.refreshStats(restore);restore.hp=restore.maxHp*(a.reserved?.75:.5);w.visual('hero-revive',restore,restore,undefined,undefined,a.kind==='cocoon'&&level(w,'BIO-N07')?{bioResponse:'hatch'}:undefined);
 }else if(bodies(w,'mutation').length<8){
  const stat=(level(w,'BIO-N07')?1.4:1)*(level(w,'BIO-N03')?1.25:1),d=SC2_UNITS[a.result];
  const u=spawn(w,'mutation',a.result,old,old.maxHp*.5*stat,stableDps(old)*stat*(a.result==='baneling'?2:.6*d.attackPeriod/d.attacks),undefined,15);u.x=carrier.x;u.z=carrier.z;if(level(w,'BIO-N07'))w.visual('bio-response',u,u,undefined,undefined,{bioResponse:'hatch'});
 }
 if(a.kind==='cocoon')w.expireUnit(carrier);
}
export function bioJungleGrowth(w:World,u:Entity){
 if(!u.bio?.seated||!level(w,'BIO-O03'))return;
 const one=u.eliteId?eliteStats(u.eliteId,1):{...rankStats(1),movement:1},rank=u.rank;
 const base=u.eliteId?eliteStats(u.eliteId,5):{...rankStats(rank),movement:1};
 const extra=u.eliteId?Math.max(0,rank-5):0,dps=base.damage*base.attackSpeed*(1+extra*.08),hp=base.health*(1+extra*.1);
 return {...base,rank,health:one.health+(hp-one.health)*1.5,armor:base.armor*(1+extra*.05),damage:(one.damage*one.attackSpeed+(dps-one.damage*one.attackSpeed)*1.5)/base.attackSpeed};
}
export function reconcileBio(w:World){
 if(level(w,'BIO-O03')){
  const state=w.expedition.bio!;
  if(!state.jungleSettled){
   state.jungleSettled=true;state.jungleLegacyBodies=w.expedition.ledger.flatMap(j=>['marine','reaper','marauder','ghost'].includes(j.family)?j.passengers.flatMap((p,index)=>p.status==='waiting'&&p.purpose==='body'?[`${j.id}:${index}`]:[]):[]);
  }
  for(const family of ['marine','reaper','marauder','ghost']){
   const priority=(u:Entity)=>u.eliteId==='reaper.3'?4:u.eliteId?2:1;
   const [keep,...others]=w.allies().filter(u=>bioFormal(u)&&u.unitType===family).sort((a,b)=>priority(b)-priority(a)||b.rank-a.rank||a.id-b.id);
   if(!keep)continue;for(const u of others){for(const member of w.allies())if(member.bio?.host===u.id)w.entities.delete(member.id);w.entities.delete(u.id);}
   if(!keep.bio?.seated||keep.rank<25){
    const healthFraction=keep.hp/keep.maxHp;
    bioBody(keep).seated=true;keep.rank=Math.max(25,keep.rank);w.refreshStats(keep);
    keep.hp=keep.maxHp*healthFraction;w.visual('bio-response',keep,keep,undefined,undefined,{bioResponse:'promote'});
   }
  }
 }
 if(level(w,'BIO-O02')){
  const existing=w.heroes.get('kerrigan');
  if(!existing){
   const record:HeroRecord={id:'kerrigan',rank:5,entityId:null,skillReady:w.time,revivePaid:false,awaitingSpawn:true};
   w.heroes.set('kerrigan',record);deployExpeditionHero(w,record,false);
  }else if(existing.rank<5){
   existing.rank=5;const queen=w.heroEntity('kerrigan');
   if(queen&&queen.hp>0){queen.rank=5;w.refreshStats(queen);}
  }
 }
}
export function bioLifeTick(w:World,dt:number){
 const s=w.expedition.bio!;reconcileBio(w);
 const pending=s.appointments;if(pending?.length){for(const a of [...pending]){const u=w.entities.get(a.carrier);if(u&&u.hp>0&&w.time<a.at)continue;
  s.appointments=s.appointments!.filter(x=>x!==a);if(u&&u.hp>0)settle(w,a,u);}}
 for(const u of w.allies()){if(!bioFormal(u))continue;if(level(w,'BIO-N02'))bioFormalSeat(w,u);if(level(w,'BIO-W01')&&u.unitType==='marine')pair(w,u,'hound');if(level(w,'BIO-G05')&&u.unitType==='reaper')pair(w,u,'twin');}
 if(level(w,'BIO-B05')&&w.time>=(s.overlordAt??0)&&!bodies(w,'overlord').length){const ally=w.allies().find(a=>!a.temporary);if(ally){const u=spawn(w,'overlord','mutalisk',ally,800*(level(w,'BIO-N03')?1.25:1),0,'overlord');s.overlord=u.id;}}
}
function withinOverlord(w:World,u:Entity){const id=w.expedition?.bio?.overlord,carrier=id===undefined?undefined:w.entities.get(id);return carrier&&carrier.hp>0&&u.id!==id&&near(u,carrier,8);}
export function bioDodge(w:World,u:Entity){return withinOverlord(w,u)?level(w,'BIO-N03')?.17:.12:0;}
export function bioEnemySpeed(w:World,u:Entity){return u.owner==='zerg'&&withinOverlord(w,u)?1-(level(w,'BIO-N03')?.20:.15)*(isBoss(u)?.5:1):1;}
