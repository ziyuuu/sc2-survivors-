import type {World} from '../world';
import {encounterAllowed} from '../progression/fun-availability';
import type {Body,Entity,Point} from '../types';
import {SC2_UNITS} from '../../data/sc2-units';
import {campaignProgress} from '../../data/enemy-tuning';
import {TUNING} from '../../data/game';
import {DROPS} from '../../data/economy';
import {SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {distance,clearLine,steerGoal,translate} from '../movement/steering';
import {hasCombatPotential} from '../combat/combat-presence';
import {equipmentRosterMember} from '../starship/members';
import {identityCandidates} from '../missions/rewards';
import {planTaskEquipment,planSingleBossEncounterEquipment,planOffensiveEncounterEquipment} from '../starship/drops';
import {encounterPointLegal,encounterAwayFromSquad} from './runtime';
import {FUN_KINDS,FUN_NAMES,FUN_MIN_STAGE,FUN_NYDUS,type FunKind,type FunRecord,type FunFaction} from './expanded-state';
import {funRelation,funMedicalPatient,hasWings} from './relations';
import {CORRUPT,createCorruptSite,corruptPoints,provokeCorrupt,tickCorruptUnit} from './corrupted-protoss';

const alive=(w:World,ids:number[])=>ids.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u&&u.hp>0);
const capacity=(w:World)=>Math.max(0,w.missionEnemyCapacity()-w.enemyCount());
function seats(w:World,ordinary=false){
 const result:Entity[][]=[],seen=new Set<string>();
 for(const u of w.entities.values()){
  if(u.owner!=='terran'||u.hp<=0||u.temporary||u.summonKind||u.heroId||u.heldBy||u.fun||!equipmentRosterMember(w,u)||ordinary&&u.eliteId||!hasCombatPotential(w,u))continue;
  const key=u.pairId??String(u.id);if(seen.has(key))continue;seen.add(key);
  const pair=u.pairId?[...w.entities.values()].filter(v=>v.pairId===u.pairId&&v.hp>0&&!v.heldBy):[u];
  result.push(pair);
 }return result;
}
function shuffle<T>(w:World,items:T[]){for(let i=items.length-1;i>0;i--){const j=Math.floor(w.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function freePoints(w:World,p:Point,n:number,radius=.65){
 const result:Point[]=[];
 for(let i=0;i<240&&result.length<n;i++){
  const a=i*2.399963,r=2+Math.floor(i/16)*.9,q={x:p.x+Math.sin(a)*r,z:p.z+Math.cos(a)*r};
  if(encounterPointLegal(w,q,radius)&&clearLine(p,q,radius,w.obstacles,w.terrain)&&result.every(v=>distance(v,q)>2*radius+.2))result.push(q);
 }return result.length===n?result:null;
}
function remember(w:World,u:Entity){
 const f=u.fun!;w.encounters.expanded.origins.set(u.id,{id:f.id,kind:f.kind,faction:f.faction,until:w.time+60});
}
function spawn(w:World,m:FunRecord,type:Entity['unitType'],p:Point,role:'actor'|'guard'|'offspring'='actor',faction:FunFaction='hostile',elite=false){
 const u=w.addUnit(type,'zerg',p.x,p.z,1,elite?'special':'regular',m.stage,m.stamp);
 if(elite){u.enemyTier='elite';w.configureEnemySpecial(u,'elite',m.stamp);u.visualScale=1.2;u.unitRadius*=1.2;u.specialReady=w.time+2;}
 u.fun={id:m.id,kind:m.kind,role,faction,fixedStats:true,mode:'active',until:0,healed:0,rewarded:false};u.enemyName=FUN_NAMES[m.kind];u.guardOrigin=true;
 (role==='actor'?m.actors:m.guards).push(u.id);remember(w,u);return u;
}
function retire(w:World,u:Entity){u.hp=0;u.pendingTarget=null;u.attackTarget=null;u.windup=0;w.entities.delete(u.id);w.statuses.removeTarget(u.id);}
function pay(w:World,m:FunRecord,key:string,point:Point,plan=m.plans[0]){
 if(m.paid.has(key))return;
 if(plan){w.encounters.pending.push({plan,point:{x:point.x,z:point.z}});}
 m.paid.add(key);
}
function finish(w:World,m:FunRecord,result:string,remove=false){
 if(remove)for(const u of alive(w,[...m.actors,...m.guards]))retire(w,u);
 const s=w.encounters.expanded;if(s.short===m){s.short=null;if(!m.bait){w.encounters.gcd=3600;w.encounters.check=1200;}}if(s.queen===m)s.queen=null;
 s.last={kind:m.kind,result};w.announce(FUN_NAMES[m.kind]+' · '+result);w.hash.invalidatePlanes();
}
export function canSpawnFun(w:World,kind:FunKind,bait=false){
 const s=w.encounters.expanded;
 if(!encounterAllowed(w.difficulty,kind)||w.phase!=='battle'||w.endless||w.stage<FUN_MIN_STAGE[kind]||w.stage>18||!bait&&s.used.has(kind))return false;
 if(kind==='cruelQueen'){if(s.queen||!identityCandidates(w,2,'queen').length)return false;}
 else if(s.short||w.encounters.active)return false;
 if(kind==='devourer'&&seats(w,true).length<3)return false;
 if(kind==='parasites'&&seats(w).length<2)return false;
 if(kind==='flyingRoaches'&&!w.allies().some(u=>u.weaponDamage>0&&w.targetAllowed(u,{id:-1,owner:'zerg',hp:1,maxHp:1,armor:0,flying:true,attributes:[],unitRadius:.5,x:u.x+2,z:u.z})))return false;
 if(kind==='infectedTerrans'&&w.expedition.race==='terran'&&!w.allies().some(u=>['medivac','science_vessel'].includes(u.unitType)))return false;
 return w.starship.enabled&&!!w.starship.account.run&&!w.starship.account.run.ended;
}
export function spawnFunEncounter(w:World,kind:FunKind,position?:Point,bait=false){
 if(!canSpawnFun(w,kind,bait))return false;
 const count=kind==='corruptedProtoss'?CORRUPT.alive:kind==='parasites'?30:kind==='infectedTerrans'?10:['whitePack','flyingRoaches'].includes(kind)?6:1;
 if(capacity(w)<count)return false;
 let point=position,points:Point[]|null=null;
 const sites=kind==='corruptedProtoss'&&!position?w.spawnLocations.filter(p=>distance(p,w.anchor)>=18&&distance(p,w.anchor)<=36&&encounterPointLegal(w,p,CORRUPT.siteRadius)&&clearLine(w.anchor,p,.4,w.obstacles,w.terrain)):[];
 const siteStart=sites.length?Math.floor(w.random()*sites.length):0;
 // The ambush deliberately occupies the squad centre; its selected seats are reserved immediately.
 if(kind==='devourer'){const squad=seats(w,true).flat();point={x:squad.reduce((n,u)=>n+u.x,0)/squad.length,z:squad.reduce((n,u)=>n+u.z,0)/squad.length};points=[point];}
 for(let i=0;kind!=='devourer'&&i<(position?1:kind==='corruptedProtoss'?Math.min(96,sites.length):48);i++){
  const a=kind==='corruptedProtoss'?0:w.random()*Math.PI*2,p=position??(kind==='corruptedProtoss'?sites[(siteStart+i)%sites.length]:{x:w.anchor.x+Math.sin(a)*28,z:w.anchor.z+Math.cos(a)*28});
  if(!encounterPointLegal(w,p,kind==='corruptedProtoss'?CORRUPT.siteRadius:.7)||!clearLine(w.anchor,p,.4,w.obstacles,w.terrain))continue;
  points=kind==='corruptedProtoss'?corruptPoints(w,p,count,.65,(q,r)=>encounterPointLegal(w,q,r)):freePoints(w,p,count);if(points?.length===count&&(position||encounterAwayFromSquad(w,p)&&points.every(q=>encounterAwayFromSquad(w,q)))){point=p;break;}points=null;
 }if(!point||!points)return false;
 const s=w.encounters.expanded,id=`${w.runId}:fun:${++w.encounters.serial}`,m:FunRecord={id,kind,bait,stage:w.stage,stamp:{stage:w.stage,progress:campaignProgress(w.stage,w.stageElapsed,w.duration),density:1},point:{...point},phase:'offered',clock:0,age:0,next:0,actors:[],guards:[],held:[],queue:[],plans:[],paid:new Set(),kills:0,tier:0,route:[],routeIndex:0,claimed:0,eliteChildren:0,ordinaryChildren:0};
 const context={difficulty:w.difficulty,stage:w.stage,tier:'elite' as const};
 if(kind==='whitePack'){
  m.equipmentMilestones=true;
  for(let i=0;i<6;i++){const u=spawn(w,m,'zergling',points[i]);u.fun!.mode='passive';u.moveSpeed*=1.2;}
  for(const n of [3,6])m.plans.push(planTaskEquipment(w,context,id+':elite-milestone:'+n)!);
  m.route=[{...point}];let p=point;
  for(let leg=0;leg<5;leg++){let q:Point|undefined;for(let a=0;a<24;a++){const angle=leg*1.2+a*Math.PI/12,r={x:p.x+Math.sin(angle)*8,z:p.z+Math.cos(angle)*8};if(encounterPointLegal(w,r,.65)&&clearLine(p,r,.65,w.obstacles,w.terrain)){q=r;break;}}if(q){m.route.push(q);p=q;}}
  if(m.route.length<2){for(const u of alive(w,m.actors))retire(w,u);return false;}m.routeIndex=1;
 }else if(kind==='devourer'){
  const pool=shuffle(w,seats(w,true)),chosen=pool.slice(0,Math.floor(pool.length/3));
  m.held=chosen.map(group=>({ids:group.map(u=>u.id),point:{x:group[0].x,z:group[0].z},swallowed:true}));
  const u=spawn(w,m,'roach',point);u.modelKey='fun-nydus';u.maxHp*=20;u.hp=u.maxHp;u.unitRadius=2.2;u.visualScale=7;u.moveSpeed=0;u.weaponDamage=0;u.attributes.push('Structure');u.fun!.mode='passive';
  for(const seat of m.held)for(const b of alive(w,seat.ids)){b.heldBy=m.id;b.pendingTarget=null;b.attackTarget=null;b.windup=0;b.healTarget=null;b.velocity={x:0,z:0};}
  // Swallow and digestion begin with the eruption. Birth is a concurrent presentation.
  m.phase='rescue';m.next=FUN_NYDUS.birthTicks+180;
 }else if(kind==='flyingRoaches'){
  for(const p of points){const u=spawn(w,m,'roach',p);u.maxHp*=1.5;u.hp=u.maxHp;u.moveSpeed*=.8;u.flying=true;u.winged=true;u.wingHeight=1;}
  m.phase='active';
 }else if(kind==='cruelQueen'){
  const heroes=identityCandidates(w,2,'queen');m.hero=heroes[Math.floor(w.random()*heroes.length)] as NonNullable<FunRecord['hero']>;
  const u=spawn(w,m,'queen',point,'actor','queen',true);m.base={hp:u.maxHp,damage:u.weaponDamage,armor:u.armor,move:u.moveSpeed};u.maxHp*=2;u.hp=u.maxHp;u.moveSpeed*=.9;u.specialReady=Infinity;m.phase='active';m.next=360;
  m.plans.push(planSingleBossEncounterEquipment(w,{...context,stage:18,tier:'boss',endlessRound:1},id+':queen')!);
 }else if(kind==='infectedTerrans'){
  m.equipmentMilestones=true;
  for(let i=0;i<points.length;i++){const u=spawn(w,m,'marine',points[i],'actor','neutral');u.modelKey='fun-infested-marine';u.action='idle';u.maxHp*=2;u.hp=u.maxHp*.4;u.moveSpeed*=1.2;u.fun!.mode='passive';}
  for(const n of [3,6,10])m.plans.push(planOffensiveEncounterEquipment(w,context,id+':infected-milestone:'+n)!);
 }else if(kind==='corruptedProtoss'){
  createCorruptSite(w,m);m.route=points.map(p=>({...p})).sort((a,b)=>Math.atan2(a.x-point!.x,a.z-point!.z)-Math.atan2(b.x-point!.x,b.z-point!.z));
  for(let i=0;i<CORRUPT.alive;i++)spawnCorrupt(w,m,points[i],i<13?'zealot':'stalker');
  m.plans.push(planTaskEquipment(w,context,id+':clear')!);m.phase='active';
 }else{
  for(const p of points){const u=spawn(w,m,'zergling',p);u.visualScale=.65;u.unitRadius*=.65;u.fun!.mode='passive';}
  // A single frozen, shuffled bag bounds the entire event, not each host.
  m.queue=shuffle(w,Array.from({length:10},(_,i)=>({type:'hydralisk' as const,elite:i<5})));m.phase='active';
 }
 if(kind==='cruelQueen')s.queen=m;else s.short=m;if(!bait)s.used.add(kind);w.hash.invalidatePlanes();w.announce('发现'+FUN_NAMES[kind]+' · 小地图已标记');return true;
}
function spawnCorrupt(w:World,m:FunRecord,p:Point,type:'zealot'|'stalker'){
 const u=spawn(w,m,type,p,'actor','rogue');u.maxHp*=3;u.hp=u.maxHp;u.maxShield=(u.maxShield??0)*3;u.shield=u.maxShield;u.weaponDamage*=1.5;m.corrupt!.spawned++;return u;
}
function walk(w:World,u:Entity,p:Point,dt:number){
 u.prev={x:u.x,z:u.z};const goal=u.flying?p:steerGoal(u,p,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),d=distance(u,goal);
 if(d<.1){u.action='idle';u.velocity={x:0,z:0};return;}
 const speed=(u.stoppedUntil??0)>w.time?0:u.moveSpeed,step=Math.min(d,speed*dt);u.facing=Math.atan2(goal.x-u.x,goal.z-u.z);u.velocity={x:(goal.x-u.x)/d*speed,z:(goal.z-u.z)/d*speed};
 translate(u,{x:(goal.x-u.x)/d*step,z:(goal.z-u.z)/d*step},u.unitRadius,u.flying,w.obstacles,w.mapHalf,w.terrain);u.action=speed?'move':'idle';
}
function restoreHeld(w:World,m:FunRecord,promote:boolean,kill=false){
 const remaining:FunRecord['held']=[];
 for(const seat of m.held){
  const units=alive(w,seat.ids);
  if(!units.some(u=>u.heldBy===m.id))continue;
  const radius=Math.max(...units.map(u=>u.unitRadius));
  let positions=freePoints(w,m.point,units.length,radius)??freePoints(w,w.anchor,units.length,radius);
  if(!positions){const all:Point[]=[];for(let x=-w.mapHalf+radius+1;x<w.mapHalf-radius-1&&all.length<units.length;x+=radius*2+.4)for(let z=-w.mapHalf+radius+1;z<w.mapHalf-radius-1&&all.length<units.length;z+=radius*2+.4){const p={x,z};if(encounterPointLegal(w,p,radius))all.push(p);}if(all.length===units.length)positions=all;}
  if(!positions&&!kill){remaining.push(seat);continue;}
  const original=units.map(u=>({hp:u.hp,shield:u.shield,rank:u.rank}));
  for(let i=0;i<units.length;i++){delete units[i].heldBy;if(promote&&!kill)units[i].rank=Math.min(w.soldierCap(units[i].unitType as import('../../data/sc2-units').UnitType),original[i].rank+1);}
  for(let i=0;i<units.length;i++){
   const u=units[i];
   if(kill){w.killEncounterHost(u);continue;}
   const p=positions![i];u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;u.windup=0;u.action='spawn';u.funTransit={from:{...m.point},at:w.time,until:w.time+.7};
   w.refreshStats(u);u.thinkAt=0;
  }
  if(!kill)for(let i=0;i<units.length;i++){const u=units[i],p=original[i];u.hp=Math.min(u.maxHp,p.hp);if(p.shield!==undefined)u.shield=Math.min(u.maxShield??0,p.shield);}
 }m.held=remaining;w.hash.invalidatePlanes();
}
export function funBeforeDamage(w:World,target:Body,owner:Body['owner'],sourceId?:number){
 const u=w.entities.get(target.id),m=w.encounters.expanded.short;
 if(m?.corrupt){if(target.id===m.corrupt.site.id)return false;if(u?.fun?.id===m.id&&owner==='terran')provokeCorrupt(w,m);}
 if(u?.fun?.kind==='devourer'&&u.fun.role==='actor'&&m?.id===u.fun.id&&m.phase!=='rescue')return false;
 if(u?.fun?.kind==='whitePack'&&m?.id===u.fun.id&&m.phase==='offered'&&owner==='terran'){
  m.phase='active';m.age=0;
  for(const [i,b] of alive(w,m.actors).entries()){
   const ratio=b.hp/b.maxHp;b.enemyTier='elite';w.configureEnemySpecial(b,'elite',m.stamp);b.hp=b.maxHp*ratio;b.visualScale=1.2;b.unitRadius=SC2_UNITS.zergling.unitRadius*TUNING.unitScale*1.2;b.fun!.mode='morph';b.fun!.until=w.time+.8;b.specialReady=w.time+.8+.25*i;b.pendingTarget=null;b.windup=0;remember(w,b);
  }
 }
 const source=w.missions.packetSource?.id===sourceId?w.missions.packetSource:sourceId===undefined?undefined:w.entities.get(sourceId);
 return funRelation(w,source,target,owner,sourceId)!==false;
}
function payMilestone(w:World,m:FunRecord,u:Entity,prefix:string,thresholds:number[]){
 const key=prefix+u.id;if(m.paid.has(key))return;m.paid.add(key);
 const count=[...m.paid].filter(k=>k.startsWith(prefix)).length,index=thresholds.indexOf(count);
 if(index>=0)pay(w,m,'equipment-milestone:'+count,u,m.plans[index]);
}
function rewardInfected(w:World,m:FunRecord,u:Entity){if(m.equipmentMilestones)payMilestone(w,m,u,'infected:',[3,6,10]);else pay(w,m,'infected:'+u.id,u,m.plans[m.actors.indexOf(u.id)]);u.fun!.rewarded=true;}
export function commitFunMedical(w:World,source:Entity|number|string|undefined,body:Body,amount:number){
 const u=w.entities.get(body.id),healer=typeof source==='object'?source:typeof source==='number'?w.entities.get(source):undefined,m=w.encounters.expanded.short;
 if(!u||!healer||!m||m.kind!=='infectedTerrans'||u.fun?.id!==m.id||u.fun.mode!=='passive'||!funMedicalPatient(w,healer,u)||amount<=0)return;
 u.fun.healed+=amount;
 if(u.fun.healed+1e-8>=u.maxHp*.3){rewardInfected(w,m,u);u.owner='terran';u.team='player';u.temporary=true;u.fun.faction='friend';u.fun.mode='friend';u.fun.until=w.time+90;u.pendingTarget=null;u.attackTarget=null;remember(w,u);w.hash.invalidatePlanes();w.announce('感染陆战队员 · 净化成功');}
}
function hatch(w:World,key:number){
 const s=w.encounters.expanded,x=s.infections.get(key),m=s.short;if(!x||!m||m.id!==x.event)return;
 s.infections.delete(key);const group=x.ids.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u);
 const origins=x.ids.map(id=>{const host=w.entities.get(id);return {point:host?{x:host.x,z:host.z}:{...x.point},facing:host?.facing??0};});
 for(const [i,o] of origins.entries())s.bursts.push({id:m.id+':host:'+x.ids[i],time:w.time,...o,scale:1.5,model:'FunCocoonDeath'});
 for(const u of group){if(u.hp>0)w.killEncounterHost(u);}
 for(const [i,elite] of x.children.entries()){m.queue.push({type:'hydralisk',elite,...origins[i],readyAt:w.time+.55});if(elite)m.eliteChildren++;else m.ordinaryChildren++;}
}
/** Invoked once by the native death transaction; the original death/rights path remains authoritative. */
export function funDeath(w:World,u:Entity,sourceId?:number){
 const s=w.encounters.expanded,m=[s.short,s.queen].find(v=>v?.id===u.fun?.id),origin=sourceId===undefined?undefined:s.origins.get(sourceId),queen=s.queen;
 if(queen&&origin?.id===queen.id&&u.owner==='zerg'&&u.enemyOrigin==='regular'&&!u.enemyTier&&(u.enemySpawn?.density??1)===1&&!u.fun&&!u.mission&&!u.temporary&&!u.summonKind&&!w.starship.derivedEnemies.has(u.id)){
  const q=alive(w,queen.actors)[0];if(q){queen.kills++;q.hp=Math.min(q.maxHp,q.hp+q.maxHp*.05);const tier=queen.kills>=999?2:queen.kills>=600?1:0;if(tier>queen.tier){const fraction=q.hp/q.maxHp;queen.tier=tier;q.maxHp=queen.base!.hp*[2,4,8][tier];q.hp=q.maxHp*fraction;q.weaponDamage=queen.base!.damage*[1,2,3][tier];q.visualScale=[1.2,1.5,1.8][tier];q.modelKey='fun-cocoon';queen.phase='cocoon';queen.clock=0;queen.cast=undefined;q.fun!.mode='morph';q.fun!.until=w.time+(tier===1?1:2);}}
 }
 for(const [key,x] of s.infections)if(x.ids.includes(u.id))hatch(w,key);
 if(u.fun?.kind==='devourer'&&u.fun.role==='guard'){w.drop(u,DROPS.guard.zergling);return;}
 if(!m||!u.fun)return;
 if(u.fun.role!=='actor'){
  return;
 }
 if(m.kind==='whitePack'){if(m.equipmentMilestones)payMilestone(w,m,u,'white:',[3,6]);else pay(w,m,'white:'+u.id,u,m.plans[m.actors.indexOf(u.id)]);}
 if(m.kind==='infectedTerrans')rewardInfected(w,m,u);
 if(m.kind==='corruptedProtoss')w.drop(u,u.unitType==='zealot'?[8,2]:[12,4]);
 if(m.kind==='cruelQueen'){
  pay(w,m,'queen',u);
  if(m.kills>=999&&m.hero){s.queenClaiming=true;try{w.acquireHero(m.hero);}finally{s.queenClaiming=false;}}
  else m.queue=[...Array.from({length:24},()=>({type:'zergling' as const,elite:false})),...Array.from({length:8},()=>({type:'roach' as const,elite:false})),...Array.from({length:8},()=>({type:'baneling' as const,elite:false}))];
  m.phase='active';m.age=0;
 }
}
function tickQueue(w:World,m:FunRecord){
 if(!m.queue.length||capacity(w)<=0)return;
 const points=freePoints(w,m.point,1);if(!points)return;
 const next=m.queue.shift()!;spawn(w,m,next.type,points[0],'offspring','hostile',next.elite);
}
export function tickFunUnit(w:World,u:Entity,dt:number){
 if(u.heldBy){u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;u.windup=0;return true;}
 if(u.funTransit){if(w.time<u.funTransit.until){u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;u.windup=0;u.action='spawn';return true;}delete u.funTransit;}
 if(updateWings(w,u,dt))return true;
 const f=u.fun;if(!f)return false;
 remember(w,u);const m=[w.encounters.expanded.short,w.encounters.expanded.queen].find(v=>v?.id===f.id);
 if(f.mode==='friend'){if(w.time>=f.until)retire(w,u);return false;}
 if(f.mode==='morph'){if(w.time<f.until){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='spawn';return true;}f.mode='active';}
 if(!m)return false;
 if(m.kind==='corruptedProtoss')tickCorruptUnit(w,u);
 if(f.role!=='actor')return false;
 if(m.kind==='devourer'){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action=m.age<FUN_NYDUS.birthTicks&&m.phase==='rescue'?'spawn':m.phase==='emerging'?'spawn':m.phase==='swallowing'?m.clock<FUN_NYDUS.openTicks?'skill':'attack':'idle';return true;}
 if(m.kind==='whitePack'&&f.mode==='passive'){
  const i=m.actors.indexOf(u.id),p=m.route[m.routeIndex%m.route.length],a=i*Math.PI/3;walk(w,u,{x:p.x+Math.sin(a)*1.8,z:p.z+Math.cos(a)*1.8},dt);return true;
 }
 if(m.kind==='infectedTerrans'){
  if(f.mode==='passive'){if(m.phase==='active')walk(w,u,w.anchor,dt);return true;}
  if(f.mode==='swelling'){u.velocity={x:0,z:0};u.action='skill';u.visualScale=1+.4*Math.min(1,(w.time-f.until+1.5)/1.5);if(w.time>=f.until){f.mode='charging';f.until=w.time+8;}return true;}
  if(f.mode==='charging'){
   const target=w.allies().filter(a=>a.fun?.id!==f.id).sort((a,b)=>distance(u,a)-distance(u,b))[0];
   if(target)walk(w,u,target,dt);
   if(w.time>=f.until||target&&w.edgeDistance(u,target)<.4){
    rewardInfected(w,m,u);
    const d=SC2_UNITS.baneling,source=SOURCE_WEAPON_PATTERNS.baneling,scale=(u.nativeStatScale?.damage??1)*w.enemyDamageFactor(u);
    for(const b of [...w.entities.values(),...w.fortifications.values()])if(b.hp>0&&!b.flying&&funRelation(w,u,b)===true&&w.edgeDistance(u,b)<=2.2&&(!w.terrain||w.terrain.walkLine(u,b,0))){
     const structure=b.attributes.includes('Structure');w.hit(b,(structure?source.structureDamage:d.attackDamage)*scale,structure?[]:d.bonusDamage.map(v=>({...v,amount:v.amount*scale})),1,'zerg',.5,structure?1-source.structureArmorReduction:0,u.id);
    }
    w.encounters.expanded.bursts.push({id:m.id+':detonate:'+u.id,time:w.time,point:{x:u.x,z:u.z},facing:u.facing,scale:1.4,model:'BanelingDeath'});
    u.modelKey='fun-infested-marine.timeout';w.hit(u,u.hp+u.armor+1,[],1,'terran',0,1);
   }
   return true;
  }
 }
 if(m.kind==='parasites'){
  const infected=new Set([...w.encounters.expanded.infections.values()].flatMap(x=>x.ids)),pool=seats(w).filter(group=>group.every(a=>!infected.has(a.id)));
  const eligible=pool.filter(group=>group.length<=10-m.claimed),target=eligible.flat().sort((a,b)=>distance(u,a)-distance(u,b))[0];
  if(target)walk(w,u,target,dt);
  if(target&&w.edgeDistance(u,target)<.25&&pool.length>1&&m.claimed<10){
   const group=pool.find(g=>g.includes(target))!,children=m.queue.splice(0,group.length).map(s=>s.elite);m.claimed+=group.length;w.encounters.expanded.infections.set(group[0].id,{event:m.id,ids:group.map(a=>a.id),ticks:600,children,point:{x:target.x,z:target.z}});retire(w,u);
  }return true;
 }
 return false;
}
function updateWings(w:World,u:Entity,dt:number){
 if(!hasWings(w,u))return false;u.winged=true;
 const target=w.body(u.attackTarget),melee=u.attackRange<=1.6,wantLand=melee&&target&&!target.flying&&w.edgeDistance(u,target)<u.attackRange+1;
 let legal=!wantLand||encounterPointLegal(w,u,u.unitRadius,u.id);
 if(wantLand&&!legal){const radius=target.unitRadius+u.unitRadius+.3;let goal:Point|undefined,best=Infinity;
  for(let i=0;i<32;i++){const a=i*Math.PI/16,p={x:target.x+Math.sin(a)*radius,z:target.z+Math.cos(a)*radius},d=distance(u,p);if(d<best&&encounterPointLegal(w,p,u.unitRadius,u.id)){goal=p;best=d;}}
  if(goal){walk(w,u,goal,dt);return true;}
 }
 const height=u.wingHeight??1,land=height>0&&height<1?u.wingLanding===true:!!(wantLand&&legal);
 u.wingLanding=land;const next=Math.max(0,Math.min(1,height+(land?-1:1)*dt/0.6));u.wingHeight=next;
 const flying=land?next>0:next>=1;u.wingAir=flying;if(flying!==u.flying){u.flying=flying;w.hash.invalidatePlanes();}
 if(next>0&&next<1){u.windup=0;u.pendingTarget=null;}
 return false;
}
export function funFlightReady(u:Entity,b:Body){return !u.winged||u.attackRange>1.6||b.flying? !u.winged||u.attackRange>1.6||(u.wingHeight??1)>=1:(u.wingHeight??1)<=0;}
function tickRecord(w:World,m:FunRecord){
 const units=alive(w,m.actors);m.clock++;m.age++;
 if(m.phase==='offered'&&m.stage!==w.stage){finish(w,m,'未激活，离开',true);return;}
 if(m.kind==='whitePack'){
  if(!units.length){finish(w,m,'击败全部精英');return;}
  if(m.phase==='offered'){if(m.clock%180===0)m.routeIndex=(m.routeIndex+1)%m.route.length;if(m.age>=3600)finish(w,m,'未受惊，离开',true);}
 }else if(m.kind==='devourer'){
  // Legacy in-memory phases still finish safely; newly spawned ambushes enter rescue immediately.
  if(m.phase==='emerging'&&m.clock>=FUN_NYDUS.birthTicks){m.phase='swallowing';m.clock=0;}
  if(m.phase==='swallowing'){
   const count=Math.min(m.held.length,Math.max(0,1+Math.floor((m.clock-FUN_NYDUS.openTicks)/FUN_NYDUS.pickupTicks)));
   for(const seat of m.held.slice(0,count)){seat.swallowed=true;for(const u of alive(w,seat.ids)){u.heldBy=m.id;u.pendingTarget=null;u.attackTarget=null;u.windup=0;u.healTarget=null;u.velocity={x:0,z:0};}}
   if(m.clock>=FUN_NYDUS.openTicks+m.held.length*FUN_NYDUS.pickupTicks){m.phase='rescue';m.clock=0;m.next=180;w.hash.invalidatePlanes();}
  }
  if(!units.length){restoreHeld(w,m,m.returnPromote??true);if(!m.held.length)finish(w,m,m.returnPromote===false?'原部队已返还':'救援成功');return;}
  if(m.phase==='departing'){if(m.clock>=FUN_NYDUS.birthTicks){for(const u of units)retire(w,u);finish(w,m,'救援超时');}return;}
  if(m.phase==='rescue'){
   if(m.clock>=1800){restoreHeld(w,m,false,true);m.phase='departing';m.clock=0;return;}
   if(m.clock>=m.next&&m.guardCue===undefined){m.next+=180;m.guardCue=m.clock;}
   if(m.guardCue!==undefined&&m.clock-m.guardCue>=36){const n=Math.min(4,16-alive(w,m.guards).length,capacity(w)),points=n?freePoints(w,m.point,n):null;if(points)for(const p of points){const u=spawn(w,m,'zergling',p,'guard');u.funTransit={from:{...m.point},at:w.time,until:w.time+.6};}m.guardCue=undefined;}
  }
 }else if(m.kind==='flyingRoaches'){
  if(!units.length){w.encounters.expanded.elytra.push({id:m.id,point:{...m.point},stage:m.stage});finish(w,m,'鞘翅已落地');}
 }else if(m.kind==='corruptedProtoss'){
  if(!units.length){pay(w,m,'clear',m.point);finish(w,m,'全部消灭');return;}
  const c=m.corrupt!;
  if(units.length<CORRUPT.reinforceBelow&&c.spawned<CORRUPT.total&&c.reinforceAt===undefined)c.reinforceAt=m.clock+CORRUPT.delay;
  if(c.reinforceAt!==undefined&&m.clock>=c.reinforceAt){
   const n=Math.min(CORRUPT.alive-units.length,CORRUPT.total-c.spawned,capacity(w)),points=corruptPoints(w,m.point,n,.65,(p,r)=>encounterPointLegal(w,p,r));
   for(const p of points)spawnCorrupt(w,m,p,c.spawned%3===2?'stalker':'zealot');c.reinforceAt=undefined;
  }
  // Living IDs only; historical resource and death receipts remain on each native transaction.
  m.actors=m.actors.filter(id=>(w.entities.get(id)?.hp??0)>0);
 }else if(m.kind==='infectedTerrans'){
  const unresolved=units.filter(u=>u.fun!.mode!=='friend');
  if(!unresolved.length){finish(w,m,'处理完成');return;}
  if(m.phase==='offered'&&unresolved.some(u=>distance(u,w.anchor)<=12)){m.phase='active';m.clock=0;}
  if(m.phase==='active'&&m.clock>=720)for(const u of unresolved)if(u.fun!.mode==='passive'){u.fun!.mode='swelling';u.fun!.faction='hostile';u.fun!.until=w.time+1.5;remember(w,u);}
  if(m.phase==='offered'&&m.age>=3600)finish(w,m,'离开',true);
 }else if(m.kind==='parasites'){
  for(const [key,x] of [...w.encounters.expanded.infections])if(x.event===m.id&&--x.ticks<=0)hatch(w,key);
  if(m.claimed>=10||m.age>=3600)for(const u of units)retire(w,u);
  // Unclaimed slots are promises, not a spawn queue. Completed infections are queued separately.
  const owed=m.eliteChildren+m.ordinaryChildren,spawned=m.guards.length;
  if(owed>spawned&&m.queue.length>10-m.claimed&&capacity(w)>0){const child=m.queue[10-m.claimed],origin=child.point??m.point;if(w.time>=(child.readyAt??0)){const points=freePoints(w,origin,1);if(points){m.queue.splice(10-m.claimed,1);const u=spawn(w,m,child.type,points[0],'offspring','hostile',child.elite);u.facing=child.facing??0;u.funTransit={from:{...origin},at:w.time,until:w.time+.65};}}}
  if(!alive(w,m.actors).length&&!w.encounters.expanded.infections.size&&owed===m.guards.length&&!alive(w,m.guards).length)finish(w,m,'孵化体已清除');
 }else{
  const q=units[0];
  if(!q){if(m.queue.length&&m.age%12===0)for(let i=0;i<4;i++)tickQueue(w,m);if(m.age>=600){m.queue=[];finish(w,m,'虫后已击败');}else if(!m.queue.length&&!alive(w,m.guards).length)finish(w,m,'虫后已击败');return;}
  if(m.phase==='cocoon'){if(m.clock>=(m.tier===1?60:120)){m.phase='active';q.modelKey=undefined;q.fun!.mode='active';w.encounters.expanded.bursts.push({id:m.id+':'+m.tier,time:w.time,point:{x:q.x,z:q.z},facing:q.facing,scale:q.visualScale??1});w.visual('skill-impact',q);m.next=m.clock+[360,330,300][m.tier];}return;}
  if(m.clock>=m.next){
   const target=[...w.entities.values()].filter(b=>b.hp>0&&funRelation(w,q,b)===true).sort((a,b)=>distance(q,a)-distance(q,b))[0];
   if(target){q.action='skill';q.lastSkillAt=w.time;q.fun!.mode='morph';q.fun!.until=w.time+[.8,.9,1][m.tier];m.cast={point:{x:target.x,z:target.z},remaining:[48,54,60][m.tier]};m.next=m.clock+[360,330,300][m.tier];}
  }
  if(m.cast&&--m.cast.remaining<=0){const p=m.cast.point;m.cast=undefined;for(const b of w.entities.values())if(b.hp>0&&funRelation(w,q,b)===true&&distance(b,p)<[2.2,2.6,3][m.tier]+b.unitRadius)w.hit(b,q.weaponDamage*2,[],1,'zerg',.5,0,q.id);w.visual('skill-impact',q,p);if(m.tier===2)(m.acid??=[]).push({point:p,next:m.clock+60,remaining:3});}
  for(const acid of m.acid??[])if(acid.remaining>0&&m.clock>=acid.next){acid.next+=60;acid.remaining--;for(const b of w.entities.values())if(b.hp>0&&funRelation(w,q,b)===true&&distance(b,acid.point)<3+b.unitRadius)w.hit(b,q.weaponDamage/3,[],1,'zerg',.5,0,q.id);}
  if(m.acid)m.acid=m.acid.filter(a=>a.remaining>0);
 }
}
export function tickExpandedEncounters(w:World){
 if(w.phase!=='battle'||w.paused)return;
 const s=w.encounters.expanded;
 s.bursts=s.bursts.filter(b=>w.time-b.time<5);
 for(const m of [s.short,s.queen])if(m)tickRecord(w,m);
 for(const [id,o] of s.origins)if(o.until<w.time&&!w.entities.has(id))s.origins.delete(id);
 for(const drop of [...s.elytra]){
  if(distance(w.anchor,drop.point)>3||w.terrain&&!w.terrain.walkLine(w.anchor,drop.point,0))continue;
  const families=[...new Set(seats(w).flat().filter(u=>!u.flying&&!u.fun).map(u=>u.unitType))].sort();
  if(!families.length)continue;const family=families[Math.floor(w.random()*families.length)];s.wingFamilies.add(family);s.elytra.splice(s.elytra.indexOf(drop),1);
  for(const u of w.entities.values())if(hasWings(w,u)){u.winged=true;u.flying=true;u.wingAir=true;u.wingHeight=1;}w.hash.invalidatePlanes();w.announce('鞘翅 · '+SC2_UNITS[family].name+'及后续同系单位获得飞行');
 }
}
export function expandedCandidates(w:World){return FUN_KINDS.filter(k=>canSpawnFun(w,k));}
export function cancelExpandedEncounters(w:World,reason:'success'|'failure'='failure'){
 const s=w.encounters.expanded;
 for(const m of [s.short,s.queen])if(m){if(m.kind==='devourer'){restoreHeld(w,m,false,reason==='failure');if(reason==='success'&&m.held.length){m.returnPromote=false;continue;}}finish(w,m,'遭遇结束',true);}
 s.infections.clear();s.elytra=[];for(const u of [...w.entities.values()])if(u.fun)retire(w,u);
 w.hash.invalidatePlanes();
}
export function expandedLabel(w:World){
 const s=w.encounters.expanded,parts:string[]=[];
 for(const m of [s.short,s.queen])if(m){const units=alive(w,m.actors),count=units.length;parts.push(FUN_NAMES[m.kind]+' · '+(m.kind==='devourer'?m.phase==='rescue'?`${Math.ceil((1800-m.clock)/60)}秒救援 · ${m.held.length}名额`:'吞噬中':m.kind==='cruelQueen'?`${m.kills}/999 · ${m.kills<300?'尚不可攻击':'可攻击'}`:m.kind==='parasites'?`感染 ${m.claimed}/10 · 孵出 ${m.eliteChildren}+${m.ordinaryChildren}`:m.kind==='infectedTerrans'?`待处理 ${units.filter(u=>u.fun?.mode!=='friend').length}`+(m.phase==='active'&&m.clock<720?` · ${Math.ceil((720-m.clock)/60)}秒`:''):`剩余 ${count}`));}
 if(s.elytra.length)parts.push('鞘翅 · 靠近拾取');return parts.join('　｜　');
}
export function requestFunAttack(w:World,kind:string){
 if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return false;
 const m=[w.encounters.expanded.short,w.encounters.expanded.queen].find(m=>m?.kind===kind);
 if(!m||m.kind==='cruelQueen'&&m.kills<300)return false;
 if(m.corrupt)provokeCorrupt(w,m);else m.attackRequested=true;for(const u of w.allies())u.thinkAt=0;w.changed();return true;
}
export function funPriorityTarget(w:World,u:Entity){
 if(u.fun?.kind!=='cruelQueen'||u.fun.role!=='actor')return undefined;
 return [...w.entities.values()].filter(b=>b.hp>0&&w.targetAllowed(u,b)).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id)[0];
}
