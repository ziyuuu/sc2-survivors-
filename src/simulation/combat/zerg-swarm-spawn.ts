import {SC2_UNITS} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {FAMILIES_BY_RACE,type FamilyId} from '../../data/races';
import {SWARM_AIR,SWARM_PERIODIC,type SwarmPeriodic} from '../../data/zerg-swarm-rules';
import {activeGroupOutputs} from '../building/rules';
import {distance} from '../movement/steering';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import {swarmHighest,swarmLifespan,swarmNativeRound,swarmRank,swarmRoll,swarmUnlocked,tier,type SwarmBatch,type SwarmPart,type ZergSwarmState} from './zerg-swarm-state';

export function swarmBodies(w:World){
 return w.allies().filter(u=>u.hp>0&&!!u.zergSwarm);
}
export function expandSwarmRecipe(s:ZergSwarmState,plan:SwarmPart[]){
 const result=plan.map(p=>({...p}));
 if(!swarmRank(s,'O03')||!result.length)return result;
 const total=plan.reduce((n,p)=>n+p.count,0),extra=Math.ceil(total/3);
 const shares=plan.map((p,i)=>({i,share:extra*p.count/total}));
 let left=extra;
 for(const {i,share} of shares){const count=Math.floor(share);result[i].count+=count;left-=count;}
 for(const {i} of shares.sort((a,b)=>(b.share%1)-(a.share%1)||a.i-b.i).slice(0,left))result[i].count++;
 return result;
}
export function swarmPart(family:FamilyId,count:number,cap:number,life:number,width:1|2=1):SwarmPart{
 return {family,count,width,cap,life};
}
export function swarmClonePart(u:Entity,count:number,life:number){
 return {...swarmPart(u.unitType as FamilyId,count,7,life),elite:u.eliteId,rank:u.rank,
  energy:u.energy,weapon:u.nextShotAt,skill:u.specialReady,ability:u.abilityReady,bile:u.bileCooldown,mode:u.nativeMode,
  six:u.zergSix?{ready:u.zergSix.ready,shellReady:u.zergSix.shellReady}:undefined};
}
export function swarmFieldPoint(w:World){
 const v=w.marchDirection,heading=Math.hypot(v.x,v.z)>.1?v:{x:0,z:1};
 return {x:w.anchor.x+heading.x*2,z:w.anchor.z+heading.z*2};
}
function spawn(w:World,b:SwarmBatch,p:SwarmPart,point:Point){
 const s=w.expedition.zergSwarm!,highest=swarmHighest(w),grade=p.rank??Math.min(highest,p.cap);
 const u=w.addUnit(p.family,'terran',point.x,point.z,Math.max(grade,swarmRank(s,'N01')?highest:1),undefined,undefined,undefined,'zerg-swarm');
 u.temporary=true;u.temporaryKind='zerg-swarm';u.slot=10000+u.id;
 u.zergSwarm={origin:b.source,baseLife:p.life,expires:w.time+swarmLifespan(s,p.life),oneUse:p.family==='baneling'&&(b.source==='G02'||b.source==='echo:G02')};
 if(p.elite){u.eliteId=p.elite;u.modelKey=ELITES[p.elite].model;}
 if(p.mode)u.nativeMode=p.mode;
 if(p.weapon!==undefined)u.nextShotAt=Math.max(w.time,p.weapon);
 u.specialReady=p.skill;u.abilityReady=p.ability;if(p.bile!==undefined)u.bileCooldown=p.bile;
 if(p.six)u.zergSix={...p.six};
 w.refreshStats(u,true);u.hp=u.maxHp;
 if(p.energy!==undefined)u.energy=Math.min(u.maxEnergy,p.energy);
 const frenzy=swarmRank(s,'W05');
 if(frenzy)u.zergSwarm.birth={until:w.time+3+frenzy,attack:tier(frenzy,[.2,.3,.4]),move:tier(frenzy,[.2,.3,.4])};
 if(b.source==='P01'||b.source==='P03')u.zergSwarm.rush={until:w.time+(b.source==='P01'?4:5),move:b.source==='P01'?.4:tier(b.rank,[.4,.5,.6])};
 const shell=swarmRank(s,'W06');
 if(shell)grantSwarmShell(w,u,'birth',tier(shell,[.15,.22,.3]),3+shell);
 if(!swarmEggSource(b.source))w.visual('support-pulse',u);
 return u;
}
export function grantSwarmShell(w:World,u:Entity,type:'birth'|'loss',factor:number,seconds:number){
 const s=w.expedition.zergSwarm!,shell=s.shells[u.id]??={};
 const old=shell[type];shell[type]={remaining:Math.max(old&&old.until>w.time?old.remaining:0,u.maxHp*factor),until:w.time+seconds};
 w.visual('barrier-start',u);
}
function bodyPositions(w:World,p:SwarmPart,point:Point){
 const q=w.freePosition(p.family,point,0,5)??w.freePosition(p.family,w.anchor,1,6);
 if(!q)return [];
 if(p.width===1)return [q];
 for(const offset of [{x:.8,z:0},{x:-.8,z:0},{x:0,z:.8},{x:0,z:-.8}]){
  const other=w.freePosition(p.family,{x:q.x+offset.x,z:q.z+offset.z},0,.5);
  if(other&&distance(q,other)>.5)return [q,other];
 }
 return [];
}
export function queueSwarmBatch(w:World,source:string,plan:SwarmPart[],point:Point,delay:number,root=false,rank=0,shock?:SwarmBatch['shock']){
 const s=w.expedition.zergSwarm!;if(!plan.length)return;
 const id=s.nextBatch++;
 const copy=plan.map(p=>({...p}));
 const recipe=(source.startsWith('echo:')||source==='spore')?copy.map(p=>({...p})):expandSwarmRecipe(s,copy);
 const b={id,source,createdAt:w.time,point:{x:point.x,z:point.z},at:w.time+delay,recipe,original:copy,root,rank,shock,released:0};
 s.batches.push(b);
 if(root&&s.clocks[source])s.clocks[source].batch=id;
 if(root)w.visual('support-pulse',{...point,id:-id,hp:1,maxHp:1,armor:0,owner:'terran',team:'player',flying:false,unitRadius:0,attributes:[]});
 return b;
}
export function spawnSwarmEvent(w:World,source:string,plan:SwarmPart[],point:Point){
 const b=queueSwarmBatch(w,source,plan,point,0);return b?release(w,b,()=>{}):[];
}
export function swarmBlast(w:World,point:Point,radius:number,power:number,ground=false,plant?:(u:Entity)=>void){
 const list=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&!e.heldBy&&(!ground||!e.flying)&&
  distance(e,point)<=radius+e.unitRadius&&(!w.terrain||w.terrain.lineOfFire(point,e,false,e.flying)));
 for(const e of list){
  plant?.(e);
  w.hit(e,power,[],1,'terran',.5,0,undefined,false,false,0,false,false,false,{derived:true});
 }
 w.visual('bile-impact',{...point,id:0,owner:'terran',race:'zerg',hp:1,maxHp:1,armor:0,unitRadius:0,attributes:[],flying:false},point,undefined,undefined,{supportRadius:radius});
}
function rootBorn(w:World,b:SwarmBatch|undefined,u:Entity){
 const s=w.expedition.zergSwarm!,w08=swarmRank(s,'W08'),g09=swarmRank(s,'G09'),n06=swarmRank(s,'N06');
 const data=SC2_UNITS[u.unitType];
 if(w08&&u.weaponDamage>0&&u.race==='zerg'&&data.targetType!=='air'&&data.targetType!=='none'&&(s.shared.W08??0)<=w.time){
  s.shared.W08=w.time+tier(w08,[3,2.5,2]);swarmBlast(w,u,2.5,swarmNativeRound(w,u,data.attacks)*tier(w08,[.6,.9,1.2]),true);
 }
 if(g09&&(s.shared.G09??0)<=w.time){
  s.shared.G09=w.time+tier(g09,[8,7,6]);
  queueSwarmBatch(w,'companion',[swarmPart('zergling',g09,g09,tier(g09,[12,14,16]),2)],u,1.5);
 }
 if(!b||!n06||++s.echoCount<3)return;
 s.echoCount=0;
 const units=b.original.flatMap(p=>Array.from({length:p.count},()=>({...p,count:1})));
 const count=Math.max(1,Math.floor(units.length*n06/3));
 const chosen=Array.from({length:count},(_,i)=>units[(s.echoCursor+i)%units.length]);
 s.echoCursor=(s.echoCursor+count)%units.length;
 queueSwarmBatch(w,'echo:'+b.source,chosen,b.point,2,false,b.rank);
}
export function swarmFormalBorn(w:World,u:Entity){if(w.expedition.zergSwarm)rootBorn(w,undefined,u);}
export const swarmEggSource=(source:string)=>['G02','G05','P02','companion','spore'].includes(source)||source.startsWith('echo:');
export function swarmDropPoint(b:SwarmBatch,index:number):Point{
 if(swarmEggSource(b.source)&&b.source!=='spore'){
  const r=Math.sqrt(index+.4)*.75,a=index*2.39996;
  return {x:b.point.x+Math.sin(a)*r,z:b.point.z+Math.cos(a)*r};
 }
 const flank=b.source==='P06'?(index%2?4:-4):b.source==='P01'?(index%3-1)*4:0;
 return {x:b.point.x+flank,z:b.point.z};
}
function release(w:World,b:SwarmBatch,after:(b:SwarmBatch)=>void){
 const s=w.expedition.zergSwarm!,capacity=swarmRank(s,'O03')?90:60;
 const born:Entity[]=[];
 let live=swarmBodies(w).length;
 for(const p of b.recipe){
  while(p.count>0&&live+p.width<=capacity){
   const index=b.released;
   const target=swarmDropPoint(b,index);
   const points=bodyPositions(w,p,target);
   if(points.length!==p.width)break;
   p.count--;b.released++;
   const eggs=swarmEggSource(b.source);
   if(eggs||b.root&&(index===0||b.source==='P01'&&index<3)){
    (s.landings??=[]).push({source:b.source,batch:b.id,index,point:eggs?{...points[0]}:target,createdAt:b.createdAt,at:w.time});
   }
   for(const point of points){const u=spawn(w,b,p,point);born.push(u);live++;}
   if(b.root&&b.first===undefined){b.first=w.time;const clock=s.clocks[b.source];
    if(clock){clock.next=w.time+clock.period;clock.first=false;}
    after(b);rootBorn(w,b,born[0]);live=swarmBodies(w).length;
   }
  }
 }
 if(!b.root||b.recipe.every(p=>!p.count)||b.first!==undefined&&w.time>=b.first+6){
  if(b.source==='G03'&&b.first!==undefined)s.exitNydus={id:b.id,point:b.point,createdAt:b.createdAt,until:w.time+2};
  s.batches=s.batches.filter(row=>row.id!==b.id);
  if(s.clocks[b.source]?.batch===b.id)delete s.clocks[b.source].batch;
 }
 return born;
}
export function tickSwarmBatches(w:World,onFirst:(b:SwarmBatch)=>void,ready:(b:SwarmBatch)=>boolean){
 const s=w.expedition.zergSwarm!;
 for(const b of [...s.batches].sort((a,b)=>a.at-b.at||a.source.localeCompare(b.source)||a.id-b.id)){
  if(b.at>w.time||!ready(b))continue;
  if(b.first!==undefined&&w.time>b.first+6){
   s.batches=s.batches.filter(row=>row.id!==b.id);if(s.clocks[b.source]?.batch===b.id)delete s.clocks[b.source].batch;
  }else release(w,b,onFirst);
 }
}
export function swarmOverflow(w:World){
 const s=w.expedition.zergSwarm!,g=swarmRank(s,'G01'),n=swarmRank(s,'N01');
 const families=[...new Set(w.expedition.building?.groups.flatMap(activeGroupOutputs)??[])]
  .filter(f=>w.expedition.familySlots.includes(f)&&w.familySeatCount(f)>=w.familyMemberCap(f));
 if(!families.length)return;
 const family=families[s.overflowCursor++%families.length],count=Math.max(g?tier(g,[1,2,2]):0,n?tier(n,[1,2,3]):0),
  life=Math.max(g?tier(g,[16,18,20]):0,n?tier(n,[18,22,26]):0);
 queueSwarmBatch(w,'overflow',[swarmPart(family,count,n?7:g,life,family==='zergling'?2:1)],swarmFieldPoint(w),1,true);
}
export function swarmPeriodicPlan(w:World,id:SwarmPeriodic,rank:number){
 const s=w.expedition.zergSwarm!,row=SWARM_PERIODIC[id],cap=tier(rank,row.cap),life=tier(rank,row.life);
 if(!('random' in row))return row.pack.map(([family,counts,width])=>swarmPart(family,tier(rank,counts),cap,life,width));
 const pool=(id==='P02'?SWARM_AIR:FAMILIES_BY_RACE.zerg).filter(f=>swarmUnlocked(w,f));
 if(!pool.length)return [];
 return Array.from({length:tier(rank,row.random)},()=>{
  const family=pool[Math.floor(swarmRoll(s,'spawn')*pool.length)];
  return swarmPart(family,1,cap,life,family==='zergling'?2:1);
 });
}
