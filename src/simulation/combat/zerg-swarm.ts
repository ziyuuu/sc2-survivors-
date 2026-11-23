import {SC2_UNITS} from '../../data/sc2-units';
import {SWARM_PERIODIC,SWARM_REVERSION,type SwarmPeriodic} from '../../data/zerg-swarm-rules';
import {rankStats} from '../../data/ranks';
import {equipmentUnitTotals} from '../starship/runtime';
import {identityFactors} from '../starship/attributes';
import {familyResearchLevel} from '../../data/expedition-buildings';
import {distance} from '../movement/steering';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import type {FamilyId} from '../../data/races';
import {fillSwarmExpansions} from '../progression/zerg-swarm-acquisition';
import {applySwarmSpore} from './zerg-swarm-spores';
import {swarmFormal,swarmHighest,swarmRank,swarmRoll,swarmUnlocked,tier,type SwarmBatch} from './zerg-swarm-state';
import {queueSwarmBatch,spawnSwarmEvent,swarmBlast,swarmBodies,swarmClonePart,
 swarmFieldPoint,swarmOverflow,swarmPart,swarmPeriodicPlan,tickSwarmBatches} from './zerg-swarm-spawn';
import {swarmAfterFormalDeath,tickSwarmRevival} from './zerg-swarm-revival';
import {tickSwarmHero} from './zerg-swarm-heroes';

export function swarmSpeed(w:World,u:Entity,key:'attack'|'move'){
 const snap=u.zergSwarm,ra=w.expedition.zergSwarm?.shared['rage:'+u.id]??0;
 const rank=ra>w.time?swarmRank(w.expedition.zergSwarm,'N03'):0;
 return 1+Math.max(snap?.birth&&snap.birth.until>w.time?snap.birth[key]:0,
  key==='move'&&snap?.rush&&snap.rush.until>w.time?snap.rush.move:0,
  rank?tier(rank,key==='move'?[.2,.25,.3]:[.4,.5,.6]):0);
}
export function swarmDirectFactor(w:World,u:Entity|undefined,target:Body,temporary=!!u?.zergSwarm){
 const s=w.expedition.zergSwarm;if(!s||!temporary)return 1;
 const follow=swarmRank(s,'W07'),wound=swarmRank(s,'W09'),group=swarmRank(s,'B07');
 const tagged=follow&&(s.tags[target.id]??0)>w.time?tier(follow,[.15,.22,.3]):0;
 const wounded=wound&&target.hp<target.maxHp*.35?tier(wound,[.2,.3,.4]):0;
 let nearby=0;
 if(group){
  const cached=s.nearby[target.id];
  if(cached&&cached.until>w.time)nearby=cached.count;
  else {w.hash.query(target,4,b=>{if(nearby<10&&(b as Entity).zergSwarm&&b.hp>0&&distance(target,b)<=4)nearby++;},'terran');s.nearby[target.id]={count:nearby,until:w.time+.25};}
 }
 return 1+tagged+wounded+nearby*(group?tier(group,[.03,.04,.05]):0);
}
export function swarmIncoming(w:World,u:Entity){
 const armor=w.expedition.zergSwarm?.groupArmor[u.id];
 return armor&&armor.until>w.time?1-armor.factor:1;
}
export function absorbSwarmShells(w:World,u:Entity,damage:number){
 const shells=w.expedition.zergSwarm?.shells[u.id];if(!shells)return damage;
 for(const shell of [shells.birth,shells.loss].filter(s=>s&&s.until>w.time).sort((a,b)=>a!.until-b!.until)){
  const take=Math.min(damage,shell!.remaining);shell!.remaining-=take;damage-=take;
 }
 return damage;
}
export function expireSwarmBody(w:World,u:Entity){
 if(!u.zergSwarm)return false;
 u.hp=0;u.deadAt=w.time;u.action='dead';u.pendingTarget=null;u.attackTarget=null;u.velocity={x:0,z:0};
 w.statuses.removeTarget(u.id);w.detachMissionOrder(u.id);w.visual('unit-expired',u);return true;
}
function sporeTarget(w:World,radius:number){
 const pool=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&!e.heldBy&&!e.experience&&w.visibleTo(e,'terran')&&distance(w.anchor,e)<=12);
 const candidates=pool.map(u=>({u,group:pool.filter(b=>distance(u,b)<=radius).length}));
 return candidates.sort((a,b)=>b.group-a.group||distance(w.anchor,a.u)-distance(w.anchor,b.u)||a.u.id-b.u.id)[0]?.u;
}
function sporePower(w:World,factor:number){
 const d=SC2_UNITS.hydralisk,rank=swarmHighest(w),growth=rankStats(rank);
 const damage=(d.attackDamage+familyResearchLevel(w.expedition.tech,'hydralisk','weapon'))*growth.damage*d.attacks;
 if(!w.starship.enabled)return damage*factor;
 // Read direction and rank equipment against a reference body, never a placed unit.
 const reference={id:-1,unitType:'hydralisk',rank,owner:'terran',team:'player',race:'zerg',attributes:d.attributes} as Entity;
 const gear=equipmentUnitTotals(w,reference),period=d.attackPeriod/growth.attackSpeed/(1+gear.attackSpeed);
 const additive=gear.dps*identityFactors(reference).dps*period;
 return (damage*(1+gear.native)+additive)*(1+gear.attack)*factor;
}
function firstBatch(w:World,b:SwarmBatch){
 if(b.shock)swarmBlast(w,b.shock.point,b.shock.radius,sporePower(w,b.shock.power),false,u=>{applySwarmSpore(w,u);});
}
function split(w:World){
 const s=w.expedition.zergSwarm!,r=swarmRank(s,'N02'),o=swarmRank(s,'O03'),units=w.allies().filter(u=>u.hp>0&&swarmFormal(w,u));
 if(!units.length)return;
 const chosen=units.map((_u,i)=>units[(s.splitCursor+i)%units.length]).filter(()=>swarmRoll(s,'spawn')<tier(r,[.2,.25,.3])+(o?.15:0));
 s.splitCursor=(s.splitCursor+1)%units.length;
 const n=Math.min(chosen.length,tier(r,[4,6,8]));
 spawnSwarmEvent(w,'live-split',chosen.slice(0,n).map(u=>swarmClonePart(u,1,tier(r,[12,14,16]))),swarmFieldPoint(w));
}
export function rebaseSwarmStage(w:World){
 const s=w.expedition.zergSwarm;if(!s)return;
 s.spores={};s.tags={};s.nearby={};delete s.exitNydus;delete s.landings;
 for(const b of s.batches){b.point=swarmFieldPoint(w);if(b.shock)b.shock.point={...b.point};}
}
export function tickZergSwarm(w:World){
 const s=w.expedition.zergSwarm;if(!s)return;
 fillSwarmExpansions(w);tickSwarmRevival(w);tickSwarmHero(w);
 for(const u of swarmBodies(w)){
  const b=u.zergSwarm!;
  if(w.time>=b.expires){expireSwarmBody(w,u);continue;}
  const mature=swarmRank(s,'B08');
  if(mature&&w.time-u.bornAt>=7-mature&&b.mature?.health!==tier(mature,[.2,.3,.4])){
   b.mature={health:tier(mature,[.2,.3,.4]),damage:tier(mature,[.15,.25,.35])};w.refreshStats(u);
  }
 }
 if((s.shared.scan??0)<=w.time){
  s.shared.scan=w.time+.25;
  if(s.landings)s.landings=s.landings.filter(l=>w.time-l.at<2.1);
  if(s.exitNydus&&s.exitNydus.until<=w.time)delete s.exitNydus;
  for(const key of Object.keys(s.shared))if(key.startsWith('rage:')&&s.shared[key]<=w.time)delete s.shared[key];
  const armor=swarmRank(s,'N09');
  if(armor){
   for(const u of w.allies())if(u.hp>0&&(u.heroId||u.zergSwarm||swarmFormal(w,u))){
    let n=0;w.hash.query(u,6,b=>{if((b as Entity).zergSwarm&&b.hp>0&&distance(u,b)<=6)n++;},'terran');
    if(n>=6)s.groupArmor[u.id]={until:w.time+.5,factor:(n>=12?.15:.05)+armor*.05};
   }
  }
  for(const [key,value] of Object.entries(s.spores))if(value.until<=w.time||!w.entities.get(+key)?.hp)delete s.spores[+key];
  for(const [key,value] of Object.entries(s.nearby))if(value.until<=w.time)delete s.nearby[+key];
  for(const [key,value] of Object.entries(s.tags))if(value<=w.time)delete s.tags[+key];
  for(const [key,value] of Object.entries(s.groupArmor))if(value.until<=w.time||!w.entities.get(+key)?.hp)delete s.groupArmor[+key];
  for(const key of Object.keys(s.shells))if(!w.entities.get(+key)?.hp||[s.shells[+key].birth,s.shells[+key].loss].every(b=>!b||!b.remaining||b.until<=w.time))delete s.shells[+key];
  for(const [key,value] of Object.entries(s.attackChecks))if(value.next+15<=w.time&&!w.entities.has(+key))delete s.attackChecks[+key];
 }
 for(const [key,clock] of Object.entries(s.clocks).sort(([a,x],[b,y])=>x.next-y.next||a.localeCompare(b))){
  if(clock.batch||clock.next>w.time)continue;
  if(key==='overflow'){swarmOverflow(w);continue;}
  if(key==='delivery')continue;
  if(key==='N02'){split(w);clock.next=w.time+clock.period;continue;}
  if(key==='G07'){
   const point=sporeTarget(w,3);if(!point)continue;
   swarmBlast(w,point,3,sporePower(w,tier(swarmRank(s,'G07'),[1.5,2,2.5])),false,u=>{applySwarmSpore(w,u);});
   clock.next=w.time+clock.period;continue;
  }
  const id=key as SwarmPeriodic,row=SWARM_PERIODIC[id];if(!row)continue;
  const r=swarmRank(s,id),point=id==='P05'?sporeTarget(w,6):undefined;
  if(id==='P05'&&!point)continue;
  queueSwarmBatch(w,id,swarmPeriodicPlan(w,id,r),swarmFieldPoint(w),row.delay,true,r,
   point?{point:{x:point.x,z:point.z},radius:6,power:3+r}:undefined);
 }
 tickSwarmBatches(w,b=>firstBatch(w,b),b=>{
  if(!b.shock||b.first!==undefined)return true;
  const target=sporeTarget(w,b.shock.radius);if(!target)return false;
  b.shock.point={x:target.x,z:target.z};return true;
 });
}
export function onSwarmFormalDeath(w:World,u:Entity){
 const s=w.expedition.zergSwarm;if(!s||!swarmFormal(w,u))return;
 swarmAfterFormalDeath(w,u);
 const loss=swarmRank(s,'W04'),revert=swarmRank(s,'B02');
 if(loss&&(s.shared.loss??0)<=w.time){
  const timers=[
   ...w.expedition.ledger.filter(j=>j.state==='training'&&!j.refit&&j.passengers.some(p=>p.status==='waiting'&&p.purpose==='body')&&j.remaining>.5)
    .map(j=>({left:j.remaining,reduce:(n:number)=>{j.remaining=n;}})),
   ...Object.entries(s.clocks).filter(([key,c])=>key!=='delivery'&&key!=='N02'&&key!=='G07'&&!c.batch&&c.next>w.time+.5)
    .map(([,c])=>({left:c.next-w.time,reduce:(n:number)=>{c.next=w.time+n;}})),
  ].sort((a,b)=>a.left-b.left);
  if(timers.length){timers[0].reduce(Math.max(.5,timers[0].left-(1+loss)));s.shared.loss=w.time+1;}
 }
 if(revert&&(s.shared.revert??0)<=w.time){
  const f=(SWARM_REVERSION[u.unitType as FamilyId]??[]) .find(f=>swarmUnlocked(w,f))??'zergling';
  if(spawnSwarmEvent(w,'death-split',[{...swarmPart(f,revert,7,12+2*revert),rank:Math.max(1,u.rank-(swarmRank(s,'N01')?0:1))}],u).length)s.shared.revert=w.time+2;
 }
}
