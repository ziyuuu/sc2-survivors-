import {tickExpandedEncounters,cancelExpandedEncounters} from './expanded';
import {encounterAllowed} from '../progression/fun-availability';
import {corruptSiteBodies} from './corrupted-protoss';
import type {World} from '../world';
import {eliteDebuffValue} from '../combat/terran-elite-runtime';
import {zergEliteDebuff} from '../combat/zerg-elite-runtime';
import {protossEliteDebuff} from '../combat/protoss-elite-runtime';
import {compositeEliteDebuff,compositeHeroDebuff} from '../combat/team-auras';
import type {Body,Entity,Point} from '../types';
import {TUNING} from '../../data/game';
import {SC2_UNITS} from '../../data/sc2-units';
import {campaignProgress} from '../../data/enemy-tuning';
import {distance,blocked,clearLine,steerGoal,translate} from '../movement/steering';
import {planTaskEquipment,planOrdinaryEncounterEquipment,deliverTaskEquipment} from '../starship/drops';
import {ENCOUNTER_KINDS,ENCOUNTER_NAMES,type EncounterKind,type EncounterRecord,type EncounterStats} from './state';

const hp=[3,6,10,16],sizes=[1.2,1.6,2.1,2.6],damage=[1,1.5,2,3];
const snapshot=(u:Entity):EncounterStats=>({maxHp:u.maxHp,armor:u.armor,weaponDamage:u.weaponDamage,attackPeriod:u.attackPeriod,moveSpeed:u.moveSpeed,attackRange:u.attackRange,unitRadius:u.unitRadius});
/** Uses the same live footprints as mission placement, with a subject exclusion for growth. */
export function encounterPointLegal(w:World,p:Point,r:number,ignore?:number){
 if(Math.abs(p.x)+r>=w.mapHalf||Math.abs(p.z)+r>=w.mapHalf||blocked(p,r,w.obstacles)||w.terrain&&!w.terrain.canOccupy(p,r))return false;
 const bodies:Body[]=[...w.entities.values(),...w.missions.bodies.values(),...corruptSiteBodies(w),...w.expansionHives.values(),...w.fortifications.values(),...w.pods.filter(b=>b.status==='active'||b.status==='opening'),...[...w.economicTargets.values()].filter(b=>b.status==='active'),...(w.hive?[w.hive]:[])];
 return !bodies.some(b=>b.id!==ignore&&b.hp>0&&!b.heldBy&&distance(p,b)<r+b.unitRadius+.2);
}
/** Initial encounters leave at least twelve metres outside every living squad body. */
export function encounterAwayFromSquad(w:World,p:Point,r=.65){return distance(w.anchor,p)>=12+r&&w.allies().every(u=>u.temporary||u.summonKind||u.hp<=0||distance(u,p)>=12+r+u.unitRadius);}
function slots(w:World){return Math.max(0,w.missionEnemyCapacity()-w.enemyCount());}
function positions(w:World,p:Point,n:number,radius=.65){
 const result:Point[]=[];
 for(let i=0;i<144&&result.length<n;i++){
  const a=i*2.399963,r=5+(i%7)*.65,q={x:p.x+Math.sin(a)*r,z:p.z+Math.cos(a)*r};
  if(encounterPointLegal(w,q,radius)&&clearLine(p,q,radius,w.obstacles,w.terrain)&&result.every(v=>distance(v,q)>radius*2+.2))result.push(q);
 }return result.length===n?result:null;
}
function fleeRoute(w:World,p:Point,r:number){
 const out:Point[]=[{...p}];
 for(let leg=0;leg<5;leg++){
  const last=out.at(-1)!,base=Math.atan2(last.x-w.anchor.x,last.z-w.anchor.z);let best:Point|undefined;
  for(let i=0;i<24;i++){const a=base+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/12,q={x:last.x+Math.sin(a)*8,z:last.z+Math.cos(a)*8};
   if(encounterPointLegal(w,q,r)&&clearLine(last,q,r,w.obstacles,w.terrain)&&out.every(v=>distance(v,q)>3)){best=q;break;}}
  if(!best)return null;out.push(best);
 }return out;
}
export function spawnEncounter(w:World,kind:EncounterKind,bait=false){
 const s=w.encounters;
 if(!encounterAllowed(w.difficulty,kind)||w.endless||w.phase!=='battle'||w.stage<(kind==='gentle'?7:4)||w.stage>18||s.active||s.expanded.short||!bait&&s.used.has(kind))return false;
 if(kind!=='gentle'&&(!w.starship.enabled||!w.starship.account.run||w.starship.account.run.ended))return false;
 const initial=kind==='gentle'?(w.stage<13?12:16):0;
 if(slots(w)<(initial||1))return false;
 const radius=SC2_UNITS[kind==='gentle'?'ultralisk':'roach'].unitRadius*TUNING.unitScale*(kind==='giant'?2.6:kind==='gentle'?1.1:1.25);
 let point:Point|undefined,pack:Point[]|null=[],route:Point[]|null=[];
 for(let i=0;i<48;i++){
  const a=w.random()*Math.PI*2,r=24+w.random()*8,p={x:w.anchor.x+Math.sin(a)*r,z:w.anchor.z+Math.cos(a)*r};
  if(!encounterAwayFromSquad(w,p,radius)||!encounterPointLegal(w,p,radius)||!clearLine(w.anchor,p,.4,w.obstacles,w.terrain)||[...w.entities.values()].filter(e=>e.hp>0&&e.owner==='zerg'&&distance(e,p)<7).length>3)continue;
  pack=initial?positions(w,p,initial):[];route=kind==='golden'?fleeRoute(w,p,SC2_UNITS.roach.unitRadius*TUNING.unitScale*1.25):[];
  if(pack&&route&&pack.every(p=>encounterAwayFromSquad(w,p))){point=p;break;}
 }
 if(!point)return false;
 const id=`${w.runId}:encounter:${s.serial+1}`,context={difficulty:w.difficulty,stage:w.stage};
 const plans:EncounterRecord['plans']=[];
 if(kind==='golden')for(let i=1;i<=10;i++)plans.push([planOrdinaryEncounterEquipment(w,{...context,tier:'regular'},id+':node:'+i,i===10?6:i===5?2:1,i===10)!]);
 if(kind==='giant')for(let i=0;i<4;i++){
  const tiers=i===0?['elite']:i===1?['elite','elite']:i===2?['elite','boss']:['boss','boss'];
  plans.push(tiers.map((tier,j)=>planTaskEquipment(w,{...context,tier:tier as 'elite'|'boss'},id+':tier:'+i+':'+j)!));
 }
 const m:EncounterRecord={id,kind,bait,stage:w.stage,point,stamp:{stage:w.stage,progress:campaignProgress(w.stage,w.stageElapsed,w.duration),density:1},phase:'signal',clock:0,wait:0,age:0,subject:null,enemies:[],initial:pack!,waves:0,pending:0,tier:0,growth:0,growthBlocked:false,retry:0,progress:0,threshold:0,route:route!,routeIndex:1,plans};
 s.serial++;s.active=m;if(!bait)s.used.add(kind);w.announce('发现'+ENCOUNTER_NAMES[kind]+' · 小地图已标记');return true;
}
function applyGiant(u:Entity,tier:number,fill=false){
 const b=u.encounter!.base!,ratio=fill?1:u.hp/u.maxHp;
 u.maxHp=Math.ceil(b.maxHp*hp[tier]);u.hp=u.maxHp*ratio;u.armor=b.armor+tier;u.weaponDamage=b.weaponDamage*damage[tier];u.moveSpeed=b.moveSpeed*.85;u.visualScale=sizes[tier];u.unitRadius=b.unitRadius*sizes[tier];
 u.enemyName=`巨型蟑螂 · ${['幼体','成长','巨型','成熟'][tier]}`;
}
function spawnBodies(w:World,m:EncounterRecord){
 if(slots(w)<(m.initial.length||1))return false;
 const radius=SC2_UNITS[m.kind==='gentle'?'ultralisk':'roach'].unitRadius*TUNING.unitScale*(m.kind==='giant'?2.6:m.kind==='gentle'?1.1:1.25);
 if(!encounterAwayFromSquad(w,m.point,radius)||!encounterPointLegal(w,m.point,radius)||m.initial.some(p=>!encounterPointLegal(w,p,.65)||!encounterAwayFromSquad(w,p)))return false;
 const u=w.addUnit(m.kind==='gentle'?'ultralisk':'roach','zerg',m.point.x,m.point.z,1,'regular',m.stage,m.stamp);
 u.encounter={id:m.id,kind:m.kind,role:'subject',base:snapshot(u)};u.enemyName=ENCOUNTER_NAMES[m.kind];u.guardOrigin=true;
 if(m.kind==='golden'){u.modelKey='drone';u.maxHp=u.hp=Math.ceil(u.maxHp*12);u.visualScale=1.25;u.unitRadius*=1.25;u.moveSpeed=TUNING.anchorSpeed*.85;u.weaponDamage=0;}
 if(m.kind==='giant')applyGiant(u,0,true);
 if(m.kind==='gentle'){
  u.owner='terran';u.team='player';u.temporary=true;u.maxHp*=4;u.hp=u.maxHp*.4;u.visualScale=1.1;u.unitRadius*=1.1;u.moveSpeed*=1.1;
  for(let i=0;i<m.initial.length;i++)spawnAttacker(w,m,m.initial[i],i<m.initial.length-4?'zergling':'roach');
  w.hash.invalidatePlanes();
 }
 m.subject=u.id;m.phase='offered';return true;
}
function spawnAttacker(w:World,m:EncounterRecord,p:Point,type:'zergling'|'roach'){
 const u=w.addUnit(type,'zerg',p.x,p.z,1,'regular',m.stage,m.stamp);
 u.encounter={id:m.id,kind:'gentle',role:'attacker'};u.guardOrigin=true;m.enemies.push(u.id);return u;
}
function end(w:World,result:NonNullable<World['encounters']['last']>['result'],remove=false){
 const s=w.encounters,m=s.active;if(!m)return;
 const u=m.subject===null?undefined:w.entities.get(m.subject);
 if(remove&&u&&u.encounter?.role!=='friend'){u.hp=0;u.windup=0;u.pendingTarget=null;w.entities.delete(u.id);w.statuses.removeTarget(u.id);}
 s.last={kind:m.kind,result};s.active=null;if(!m.bait){s.gcd=3600;s.check=1200;}
 w.announce(ENCOUNTER_NAMES[m.kind]+' · '+({success:'完成',failed:'救援失败',escaped:'钻地离开',expired:'已离开',cancelled:'结束'}[result]));
}
function scheduleReward(w:World,m:EncounterRecord,index:number,p:Point){
 for(const plan of m.plans[index]??[])w.encounters.pending.push({plan,point:{x:p.x,z:p.z}});
}
export function flushEncounterRewards(w:World){
 for(const item of [...w.encounters.pending])try{
  if(deliverTaskEquipment(w,item.plan,item.point))w.encounters.pending.splice(w.encounters.pending.indexOf(item),1);
 }catch(error){item.error=String(error);}
}
/** Called after final HP resolution, before ordinary death rewards. */
export function encounterAfterHit(w:World,b:Body,before:number,sourceId?:number){
 const u=w.entities.get(b.id),c=u?.encounter,m=w.encounters.active;if(!u||!c||before<=u.hp)return;
 if(c.role==='attacker'){if(sourceId!==undefined&&w.entities.get(sourceId)?.owner==='terran'){c.distractedUntil=w.time+3;c.distractedBy=sourceId;}if(m?.id===c.id&&m.phase==='offered'){m.phase='active';m.age=0;}return;}
 if(c.role!=='subject'||!m||m.id!==c.id)return;
 if(m.phase==='offered'){m.phase='active';m.age=0;}
 if(c.kind==='golden'){
  const threshold=u.hp<=0?10:Math.min(9,Math.floor((1-u.hp/u.maxHp)*10+1e-8));
  while(m.threshold<threshold){scheduleReward(w,m,m.threshold,u);m.threshold++;}
  flushEncounterRewards(w);
 }else if(c.kind==='giant'&&u.hp<=0){scheduleReward(w,m,m.tier,u);flushEncounterRewards(w);}
 // Keep a dead subject for one tick; death wins over growth, clear, timers and extra waves.
}
export function encounterDamageAllowed(w:World,target:Body,sourceOwner:Body['owner'],sourceId?:number){
 const c=w.entities.get(target.id)?.encounter;if(!c)return true;
 const m=w.encounters.active;
 if(c.role==='subject'&&c.kind==='gentle'){
  return sourceOwner==='zerg'&&m?.id===c.id&&m.phase==='active'&&sourceId!==undefined&&w.entities.get(sourceId)?.encounter?.id===c.id&&w.entities.get(sourceId)?.encounter?.role==='attacker';
 }
 if(c.role==='friend')return sourceOwner==='zerg';
 if(c.role==='attacker'&&m?.id===c.id&&m.phase==='offered')return sourceOwner==='terran';
 return sourceOwner==='terran';
}
export function encounterTargetAllowed(w:World,u:Entity,b:Body){
 const a=u.encounter,c=w.entities.get(b.id)?.encounter,m=w.encounters.active;
 if(a?.role==='subject'&&(a.kind==='golden'||a.kind==='gentle'||m?.id===a.id&&m.phase==='offered'))return false;
 if(a?.role==='attacker'&&m?.id===a.id&&m.phase==='offered')return false;
 if(c?.role==='subject'&&c.kind==='gentle')return a?.role==='attacker'&&a.id===c.id&&m?.phase==='active';
 return true;
}
export function encounterPriorityTarget(w:World,u:Entity){
 const c=u.encounter,m=w.encounters.active;
 if(c?.role!=='attacker'||!m||m.id!==c.id||m.phase!=='active')return undefined;
 const distracted=(c.distractedUntil??0)>w.time?w.entities.get(c.distractedBy!):undefined;
 const b=distracted?.hp?distracted:w.entities.get(m.subject!);
 return b?.hp&&w.targetAllowed(u,b)?b:undefined;
}
function walk(w:World,u:Entity,p:Point,dt:number){
 u.prev={x:u.x,z:u.z};
 if((u.stoppedUntil??0)>w.time){u.velocity={x:0,z:0};u.action='idle';return;}
 const goal=steerGoal(u,p,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),d=distance(u,goal);
 const speed=u.moveSpeed*(1-Math.max(eliteDebuffValue(w,u,'move'),zergEliteDebuff(w,u,'move'),protossEliteDebuff(w,u,'move'),compositeEliteDebuff(w,u,'move'),compositeHeroDebuff(w,u,'moveSlow')))*(u.slowUntil&&u.slowUntil>w.time?1-(u.slowFactor??0):1)*(w.zoneSlowed.has(u.id)?.8:1)*(w.time<(u.moveSlowUntil??0)?1-(u.moveSlowFactor??0):1)*(w.hiveFrenzy&&u.owner==='zerg'?1.1:1);
 if(d>.05){const step=Math.min(d,speed*dt);u.facing=Math.atan2(goal.x-u.x,goal.z-u.z);u.velocity={x:(goal.x-u.x)/d*speed,z:(goal.z-u.z)/d*speed};translate(u,{x:(goal.x-u.x)/d*step,z:(goal.z-u.z)/d*step},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);u.action='move';}
 else {u.velocity={x:0,z:0};u.action='idle';}
}
/** Subject passivity and growth repositioning run inside the normal fixed step. */
export function tickEncounterUnit(w:World,u:Entity,dt:number){
 const c=u.encounter,m=w.encounters.active;if(!c)return false;
 if(c.role==='friend')return false;
 if(c.role==='attacker'){
  if(m?.id===c.id&&m.phase==='offered'){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';return true;}
  return false;
 }
 if(!m||m.id!==c.id)return false;
 if(m.phase==='offered'&&c.kind==='golden'){
  const angle=Math.floor(m.wait/180)*Math.PI/2,p={x:m.point.x+Math.sin(angle)*1.2,z:m.point.z+Math.cos(angle)*1.2};
  if(encounterPointLegal(w,p,u.unitRadius,u.id))walk(w,u,p,dt);else {u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';}
  return true;
 }
 if(m.phase==='offered'||c.kind==='gentle'){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';return true;}
 if(c.kind==='golden'){
  if(m.age%360>=240){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';return true;}
  const p=m.route[m.routeIndex];if(p){walk(w,u,p,dt);if(distance(u,p)<.6){m.routeIndex++;if(m.routeIndex>=m.route.length){const next=fleeRoute(w,u,u.unitRadius);if(next){m.route=next;m.routeIndex=1;}else m.routeIndex=m.route.length-1;}}}return true;
 }
 if(c.kind==='giant'&&m.growthBlocked){
  for(let i=0;i<24;i++){const a=i*2.399963,p={x:u.x+Math.sin(a)*4,z:u.z+Math.cos(a)*4};if(encounterPointLegal(w,p,c.base!.unitRadius*sizes[m.tier+1],u.id)){walk(w,u,p,dt);break;}}return true;
 }return false;
}
export function cancelEncounters(w:World){
 cancelExpandedEncounters(w,['won','endless-ready','finished'].includes(w.phase)?'success':'failure');
 const s=w.encounters;end(w,'cancelled',true);
 for(const [id,u] of w.entities)if(u.encounter){u.hp=0;u.pendingTarget=null;w.entities.delete(id);w.statuses.removeTarget(id);}
 s.friends.clear();s.pending=[];w.hash.invalidatePlanes();
}
export function tickEncounters(w:World){
 const s=w.encounters;
 if(w.endless){cancelEncounters(w);return;}
 if(w.phase!=='battle'||w.paused)return;
 flushEncounterRewards(w);
 for(const [id,ticks] of s.friends){const u=w.entities.get(id);if(!u||u.hp<=0){s.friends.delete(id);continue;}if(ticks<=1){w.visual('squad-transfer',u);u.hp=0;u.pendingTarget=null;w.entities.delete(id);s.friends.delete(id);}else s.friends.set(id,ticks-1);}
 tickExpandedEncounters(w);
 const m=s.active;
 if(!m)return;
 if(m.phase==='signal'){m.clock++;if(m.clock>=120&&!spawnBodies(w,m)&&m.clock>=120+600)end(w,'expired');return;}
 const u=w.entities.get(m.subject!);
 if(!u||u.hp<=0){end(w,m.kind==='gentle'?'failed':'success');return;}
 if(m.phase==='offered'){
  m.wait++;
  if(m.kind!=='golden'&&distance(w.anchor,u)<=18){m.phase='active';m.age=0;}
  else if(m.wait>=2700){end(w,'expired',true);return;}
  if(m.phase==='offered')return;
 }
 m.age++;
 if(m.kind==='golden'){if(m.age>=1200)end(w,'escaped',true);return;}
 if(m.kind==='giant'){
  if(m.tier>=3)return;
  m.growth++;
  if(m.growth<720)return;
  if(m.retry>0){m.retry--;return;}
  if(encounterPointLegal(w,u,u.encounter!.base!.unitRadius*sizes[m.tier+1],u.id)){m.tier++;applyGiant(u,m.tier);m.growth=0;m.growthBlocked=false;w.announce('巨型蟑螂 · 成长至'+(m.tier+1)+'档');}
  else {m.growthBlocked=true;m.retry=59;}return;
 }
 const enemies=m.enemies.filter(id=>(w.entities.get(id)?.hp??0)>0);
 if(!enemies.length){m.phase='cleared';m.pending=0;m.waves=3;}
 if(m.phase==='cleared'){
  if(distance(w.anchor,u)<=6&&(!w.terrain||w.terrain.walkLine(w.anchor,u,0))&&w.allies().some(a=>!a.temporary&&distance(a,u)<=6+a.unitRadius))m.progress++;else m.progress=0;
  if(m.progress>=180){u.encounter!.role='friend';s.friends.set(u.id,5400);w.detachMissionOrder(u.id);w.visual('squad-transfer',u);end(w,'success');return;}
 }else{
  // Player damage to a guard also activates the rescue, before its first combat update.
  while(m.waves<3&&m.age>=(m.waves+1)*300){m.waves++;m.pending+=4;}
  if(m.pending&&slots(w)>0){const p=positions(w,u,1,SC2_UNITS.zergling.unitRadius*TUNING.unitScale);if(p){spawnAttacker(w,m,p[0],'zergling');m.pending--;}}
 }
 if(m.age>=2700)end(w,'failed',true);
}
export function encounterLabel(w:World){
 const m=w.encounters.active;if(!m){const entry=[...w.encounters.friends][0];return entry?'温顺雷兽 · 协战 '+Math.ceil(entry[1]/60)+'秒':'';}
 const u=w.entities.get(m.subject!);
 const detail=m.phase==='signal'?'即将出现':m.phase==='offered'?(m.kind==='golden'?'攻击开始20秒寻宝':'靠近开始') :
 m.kind==='golden'?`钻地 ${Math.max(0,Math.ceil((1200-m.age)/60))}秒 · 已触发 ${m.threshold}/10`:
 m.kind==='giant'?`${['幼体','成长','巨型','成熟'][m.tier]} · ${m.growthBlocked?'成长受阻':m.tier===3?'Boss档装备2包':Math.max(0,Math.ceil((720-m.growth)/60))+'秒后成长'}`:
 m.phase==='cleared'?`靠近接纳 ${(m.progress/60).toFixed(1)}/3秒`:`围攻 ${m.enemies.filter(id=>(w.entities.get(id)?.hp??0)>0).length} · ${Math.ceil((2700-m.age)/60)}秒`;
 return ENCOUNTER_NAMES[m.kind]+' · '+detail+(u?' · '+Math.ceil(u.hp/u.maxHp*100)+'%':'');
}
