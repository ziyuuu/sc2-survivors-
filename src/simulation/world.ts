import {SC2_UNITS,TERRAN,ZERG,SIEGE,HEAL,BILE,type UnitType,type TerranType,type ZergType} from '../data/sc2-units';
import {BUILDINGS,OBSTACLES,STAGES,TUNING,FORMATION,type BuildingType,type Obstacle} from '../data/game';
import {spend,applyWeaponHit,healBiological} from './rules.mjs';
import {SpatialHash} from './movement/spatial-hash';
import {distance,angleDelta,turn,translate,locomote,steerGoal,clearLine,blocked} from './movement/steering';
import {drawRewards,eligibleReward} from './progression/rewards';
import type {Entity,Point,Pod,Body,Building,Reward,Effect,Pickup} from './types';

export class World {
 time=0;tick=0;stage=1;stageElapsed=0;phase:'menu'|'battle'|'reward'|'won'|'lost'='menu';paused=false;
 entities=new Map<number,Entity>();pods:Pod[]=[];buildings=new Map<BuildingType,Building>();upgrades=new Map<string,number>();
 wallet={minerals:TUNING.startingMinerals,gas:TUNING.startingGas};anchor={x:0,z:0,facing:Math.PI/2};input={x:0,z:0};
 trail:Point[]=[{x:0,z:0}];effects:Effect[]=[];pickups:Pickup[]=[];hash=new SpatialHash<Body>();
 rewards:Reward[]=[];rewardClaimed=false;rerolls=0;nextWave=5;wave=0;nextId=1;nextJob=1;
 dashUntil=0;dashReady=0;hive:Body|null=null;maxStretch=0;distancePairs=0;
 stats={kills:0,rescued:0,failed:0,produced:0,shots:0,healed:0,damage:0};
 notice='守住小队。生产完成后必须救援。';noticeUntil=8;revision=0;
 readonly listeners=new Set<()=>void>();readonly obstacles:Obstacle[];
 private rngState:number;private autoWaves:boolean;
 private navigation=new Map<number,{goal:Point;requested:Point;until:number}>();
 constructor(options:{seed?:number;waves?:boolean;obstacles?:Obstacle[];initial?:TerranType[]}={}){
  this.rngState=options.seed??89241;this.autoWaves=options.waves??true;this.obstacles=options.obstacles??OBSTACLES;
  const initial=options.initial??TUNING.initialSquad;initial.forEach((t,i)=>this.addUnit(t,'terran',-i*1.15,(i%2)*1.4));
 }
 random=()=>{this.rngState=(Math.imul(1664525,this.rngState)+1013904223)>>>0;return this.rngState/4294967296;};
 changed(){this.revision++;for(const fn of this.listeners)fn();}
 announce(text:string){this.notice=text;this.noticeUntil=this.time+7;this.changed();}
 start(){if(this.phase==='menu'){this.phase='battle';this.changed();}}
 allies(){return [...this.entities.values()].filter(u=>u.owner==='terran'&&u.hp>0);}
 enemyCount(){let n=0;for(const u of this.entities.values())if(u.owner==='zerg'&&u.hp>0)n++;return n;}
 addUnit(unitType:UnitType,owner:'terran'|'zerg',x:number,z:number,rank=1){
  const d=SC2_UNITS[unitType];const occupied=new Set(this.allies().filter(a=>a.unitType===unitType).map(a=>a.slot));let slot=0;while(occupied.has(slot))slot++;
  const u:Entity={id:this.nextId++,unitType,owner,x,z,prev:{x,z},
   hp:d.maxHp,maxHp:d.maxHp,armor:d.armor,moveSpeed:d.movementSpeed,attackRange:d.attackRange,weaponDamage:d.attackDamage,weaponCooldown:0,
   attackTarget:null,facing:Math.PI/2,velocity:{x:0,z:0},unitRadius:d.unitRadius,rank,attributes:[...d.attributes],flying:d.flying,
   slot:owner==='terran'?slot:0,trailIndex:Math.max(0,this.trail.length-1),action:'spawn',mode:'tank',modeTimer:0,
   windup:0,attackLock:0,pendingTarget:null,energy:unitType==='medivac'?HEAL.startEnergy:0,healTarget:null,bileCooldown:3,
   guardianPod:null,stimUntil:0,deadAt:null,bornAt:this.time,thinkAt:0,distanceWalked:0};
  this.refreshStats(u,true);this.entities.set(u.id,u);return u;
 }
 refreshStats(u:Entity,fill=false){const d=SC2_UNITS[u.unitType];const old=u.maxHp;
  u.maxHp=(d.maxHp+(u.unitType==='marine'&&this.upgrades.has('shield')?10:0))*(u.owner==='terran'?1+(u.rank-1)*TUNING.rankHp:1);
  u.hp=fill?u.maxHp:Math.min(u.maxHp,u.hp+Math.max(0,u.maxHp-old));
  const upgrade=u.unitType==='marine'?(this.upgrades.get('infantry')??0):['hellion','tank'].includes(u.unitType)?(this.upgrades.get('vehicle')??0)*(u.unitType==='tank'?2:1):0;
  u.weaponDamage=(d.attackDamage+upgrade)*(u.owner==='terran'?1+(u.rank-1)*TUNING.rankDamage:1);
  u.attackRange=u.mode==='siege'?SIEGE.range:d.attackRange;
 }
 reinforce(type:TerranType,p:Point){const same=this.allies().filter(u=>u.unitType===type);
  if(same.length<5)return this.addUnit(type,'terran',p.x,p.z);
  same.sort((a,b)=>a.rank-b.rank||a.id-b.id);const lowest=same[0];if(lowest.rank<5){lowest.rank++;this.refreshStats(lowest);}
  return lowest;
 }
 capacity(type:TerranType){const same=this.allies().filter(u=>u.unitType===type);return same.length<5||same.some(u=>u.rank<5);}
 productionCost=(type:TerranType)=>{const d=SC2_UNITS[type];const factor=this.upgrades.has('discount')?.85:1;return {minerals:Math.ceil(d.mineralCost*factor),gas:Math.ceil(d.gasCost*factor)};};
 buildingFor(type:TerranType){return [...this.buildings.values()].find(b=>BUILDINGS[b.type].types.includes(type));}
 canTrain=(type:TerranType)=>{const b=this.buildingFor(type),c=this.productionCost(type);return !!b&&b.remaining<=0&&this.capacity(type)&&this.wallet.minerals>=c.minerals&&this.wallet.gas>=c.gas;};
 build(type:BuildingType){if(this.buildings.has(type))return false;const d=BUILDINGS[type];if(!spend(this.wallet,{minerals:d.minerals,gas:d.gas}))return false;
  this.buildings.set(type,{type,remaining:d.time,queue:[]});this.changed();return true;
 }
 queue(type:TerranType){if(!this.canTrain(type))return false;const cost=this.productionCost(type);if(!spend(this.wallet,cost))return false;
  this.buildingFor(type)!.queue.push({id:this.nextJob++,unitType:type,remaining:SC2_UNITS[type].productionTime,paid:cost});this.changed();return true;
 }
 updateProduction(dt:number){for(const b of this.buildings.values()){
  if(b.remaining>0){b.remaining=Math.max(0,b.remaining-dt);continue;}
  const job=b.queue[0];if(!job)continue;job.remaining-=dt;
  if(job.remaining<=1e-8){b.queue.shift();this.stats.produced++;this.spawnPod(job.unitType,undefined,job.id);}
 }}
 spawnPod(type:TerranType,position?:Point,jobId=0){let p=position;
  if(!p){for(let i=0;i<40;i++){const a=this.random()*Math.PI*2,r=18+this.random()*14;const candidate={x:Math.max(-44,Math.min(44,this.anchor.x+Math.cos(a)*r)),z:Math.max(-44,Math.min(44,this.anchor.z+Math.sin(a)*r))};if(!blocked(candidate,3,this.obstacles)){p=candidate;break;}}}
  p??={x:34,z:-25};
  const pod:Pod={id:this.nextId++,x:p.x,z:p.z,hp:TUNING.podHp,maxHp:TUNING.podHp,armor:TUNING.podArmor,unitRadius:1.25,flying:false,attributes:['Armored','Structure'],owner:'terran',unitType:type,
   landedAt:this.time,expiresAt:this.time+TUNING.rescueSeconds,guardianIds:new Set(),status:'active',resolvedAt:null,recruitId:null,jobId};this.pods.push(pod);
  const types:ZergType[]=Array.from({length:Math.min(40,20+(this.stage-1)*2)},()=> 'zergling');types.push('roach','roach');
  if(this.stage>=6)types.push('baneling','baneling');if(this.stage>=10)types.push('ravager','ravager');
  // Reserve room for guaranteed rescue guardians; retire only distant ambient enemies if needed.
  if(this.enemyCount()+types.length>TUNING.enemyCap){for(const e of this.entities.values()){if(e.owner==='zerg'&&e.guardianPod===null&&distance(e,this.anchor)>25){this.entities.delete(e.id);this.navigation.delete(e.id);if(this.enemyCount()+types.length<=TUNING.enemyCap)break;}}}
  types.forEach((t,i)=>{const a=i/types.length*Math.PI*2,r=7+this.random()*3;let pos={x:p!.x+Math.cos(a)*r,z:p!.z+Math.sin(a)*r};if(blocked(pos,.8,this.obstacles))pos={x:p!.x+Math.cos(a)*1.8,z:p!.z+Math.sin(a)*1.8};const e=this.addUnit(t,'zerg',pos.x,pos.z);e.guardianPod=pod.id;pod.guardianIds.add(e.id);});
  this.announce(`${SC2_UNITS[type].name.toUpperCase()} DROP POD · 30 秒 · ${types.length} 敌军`);return pod;
 }
 body(id:number|null):Body|undefined {if(id===null)return;return this.entities.get(id)??this.pods.find(p=>p.id===id&&p.status==='active')??(this.hive?.id===id?this.hive:undefined);}
 targetAllowed(u:Entity,b:Body){return b.hp>0&&b.owner!==u.owner&&(!b.flying||SC2_UNITS[u.unitType].targetType==='both');}
 edgeDistance(a:Body,b:Body){return Math.max(0,distance(a,b)-a.unitRadius-b.unitRadius);}
 findTarget(u:Entity,range:number){let best:Body|undefined,score=Infinity;
  this.hash.query(u,range+2,b=>{if(!this.targetAllowed(u,b))return;let s=distance(u,b);
   if(u.guardianPod&&b.id===u.guardianPod)s-=u.id%3===0?0:8;
   if(s<score){score=s;best=b;}
  });return best;
 }
 hit(target:Body,damage:number,bonuses:{attribute:string;amount:number}[]=[],hits=1){
  const before=target.hp;applyWeaponHit(target,{damage,bonuses,hits,minimumDamage:.5});this.stats.damage+=before-target.hp;
  if(target.hp<=0&&'unitType' in target&&this.entities.has(target.id)){const e=target as Entity;if(e.deadAt===null){e.deadAt=this.time;e.action='dead';e.velocity={x:0,z:0};
    if(e.owner==='zerg'){this.stats.kills++;this.pickups.push({id:this.nextId++,x:e.x,z:e.z,minerals:e.unitType==='zergling'?5:10,gas:e.unitType==='zergling'?0:e.unitType==='roach'?3:5});}
  }}
 }
 effect(kind:Effect['kind'],source:Body,end:Point,radius=.1,duration=.18){this.effects.push({id:this.nextId++,kind,x:source.x,z:source.z,end:{...end},until:this.time+duration,radius,owner:source.owner,source:source.id});}
 fire(u:Entity,target:Body){if(!this.targetAllowed(u,target))return;const d=SC2_UNITS[u.unitType];this.stats.shots++;
  const rank=1+(u.rank-1)*TUNING.rankDamage;let bonus=d.bonusDamage.map(b=>({...b,amount:b.amount*(u.owner==='terran'?rank:1)}));
  if(u.unitType==='hellion'){
   if(this.upgrades.has('infernal'))bonus=bonus.map(b=>({...b,amount:b.amount+5}));
   const a=Math.atan2(target.x-u.x,target.z-u.z),end={x:u.x+Math.sin(a)*6.5,z:u.z+Math.cos(a)*6.5};
   this.hash.query(u,8,b=>{if(!this.targetAllowed(u,b))return;const along=(b.x-u.x)*Math.sin(a)+(b.z-u.z)*Math.cos(a);const across=Math.abs((b.x-u.x)*Math.cos(a)-(b.z-u.z)*Math.sin(a));if(along>=0&&along<=6.5+b.unitRadius&&across<=.15+b.unitRadius)this.hit(b,u.weaponDamage,bonus);});this.effect('flame',u,end,.35,.35);
  }else if(u.unitType==='baneling'){
   this.hash.query(u,4,b=>{if(b.owner!==u.owner&&!b.flying&&this.edgeDistance(u,b)<=2.2){this.hit(b,b.attributes.includes('Structure')?80+b.armor:u.weaponDamage,b.attributes.includes('Structure')?[]:bonus);}});
   this.effect('explosion',u,u,2.2,.55);u.hp=0;u.deadAt=this.time;u.action='dead';
  }else if(u.mode==='siege'){
   const dmg=(SIEGE.damage+(this.upgrades.get('vehicle')??0)*4)*rank,bon=SIEGE.bonus.map(b=>({...b,amount:b.amount*rank}));
   this.hash.query(target,3,b=>{if(b.id===u.id||b.flying||b.hp<=0)return;const r=distance(target,b);const band=SIEGE.splash.find(s=>r<=s.radius+b.unitRadius*.25);if(b.id===target.id||band)this.hit(b,dmg*(band?.fraction??1),bon.map(bn=>({...bn,amount:bn.amount*(band?.fraction??1)})));});this.effect('explosion',u,target,1.25,.4);
  }else {this.hit(target,u.weaponDamage,bonus,d.attacks);this.effect('shot',u,target,.1,u.unitType==='marine'?.1:.2);}
 }
 updateTank(u:Entity,anchorDistance:number,dt:number){if(u.unitType!=='tank')return false;
  if(u.modeTimer>0){u.modeTimer=Math.max(0,u.modeTimer-dt);u.velocity={x:0,z:0};if(u.modeTimer<=1e-8){u.mode=u.action==='sieging'?'siege':'tank';u.action='idle';this.refreshStats(u);}return true;}
  let close=false,far=false;this.hash.query(u,15,b=>{if(b.owner==='zerg'&&b.hp>0){const r=this.edgeDistance(u,b);if(r<SIEGE.minRange+.8)close=true;if(r>=SIEGE.minRange&&r<=SIEGE.range)far=true;}});
  const factor=this.upgrades.has('siege')?.8:1;
  if(u.mode==='tank'&&!close&&far&&anchorDistance<TUNING.hardLeash){u.action='sieging';u.modeTimer=SIEGE.deploySeconds*factor;u.velocity={x:0,z:0};return true;}
  if(u.mode==='siege'&&(close||!far||anchorDistance>TUNING.hardLeash)){u.action='unsieging';u.modeTimer=SIEGE.undeploySeconds*factor;u.velocity={x:0,z:0};return true;}
  return false;
 }
 heal(u:Entity,dt:number){u.energy=Math.min(HEAL.maxEnergy,u.energy+HEAL.regen*dt*(this.upgrades.has('medivac')?2:1));u.healTarget=null;
  let best:Entity|undefined;this.hash.query(u,14,b=>{if(b.owner==='terran'&&b.hp>0&&b.hp<b.maxHp&&b.attributes.includes('Biological')){const e=this.entities.get(b.id);if(e&&(!best||e.hp/e.maxHp<best.hp/best.maxHp))best=e;}});
  if(best&&u.energy>0){const healed=healBiological(u,best,HEAL,dt,this.edgeDistance(u,best));if(healed>0){u.healTarget=best.id;u.action='heal';this.stats.healed+=healed;}return best;}return undefined;
 }
 updateBile(u:Entity,dt:number){u.bileCooldown-=dt;if(u.bileCooldown>0)return;const target=this.findTarget(u,BILE.range);
  if(target&&this.edgeDistance(u,target)<=BILE.range){this.effect('bile',u,target,BILE.radius,BILE.delay);u.bileCooldown=BILE.cooldown;}
 }
 moveGoal(u:Entity){const n=this.trail.length;u.trailIndex=Math.min(u.trailIndex,n-1);
  while(u.trailIndex<n-1&&distance(u,this.trail[u.trailIndex])<1.5)u.trailIndex++;
  // Follow historical anchor path while distant, preserving unit-specific progress on reversals.
  if(distance(u,this.anchor)>4&&u.trailIndex<n-2)return this.trail[u.trailIndex];
  u.trailIndex=n-1;
  const formation=FORMATION[u.unitType as TerranType];
  const lane=formation.lane*(u.slot%2===0?-1:1);
  const back=formation.back+(u.unitType==='marine'?Math.floor(u.slot/2):u.slot)*formation.spacing;
  return {x:this.anchor.x-Math.sin(this.anchor.facing)*back+Math.cos(this.anchor.facing)*lane,z:this.anchor.z-Math.cos(this.anchor.facing)*back-Math.sin(this.anchor.facing)*lane};
 }
 separation(u:Entity){const v={x:0,z:0};let n=0;this.hash.query(u,2.8,b=>{if(b.id===u.id||b.flying!==u.flying||n>=12)return;const d=distance(u,b),min=u.unitRadius+b.unitRadius+.15;if(d<min&&d>.001){const strength=Math.min(3,(min-d)*5);v.x+=(u.x-b.x)/d*strength;v.z+=(u.z-b.z)/d*strength;n++;}});return v;}
 updateUnit(u:Entity,dt:number){if(u.hp<=0)return;u.prev={x:u.x,z:u.z};u.healTarget=null;
  u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);
  const anchorDistance=distance(u,this.anchor);
  if(this.updateTank(u,anchorDistance,dt))return;
  if(u.unitType==='ravager')this.updateBile(u,dt);
  if(u.windup>0){u.windup-=dt;u.velocity={x:0,z:0};u.action='attack';if(u.windup<=1e-8){const b=this.body(u.pendingTarget);if(b&&this.edgeDistance(u,b)<=u.attackRange+.5)this.fire(u,b);u.pendingTarget=null;}return;}
  if(u.attackLock>0){u.velocity={x:0,z:0};u.action='attack';return;}
  if(this.time>=u.thinkAt||!this.body(u.attackTarget)?.hp){u.attackTarget=this.findTarget(u,u.owner==='terran'?u.attackRange+2:16)?.id??null;u.thinkAt=this.time+.12+(u.id%5)*.012;}
  let target=this.body(u.attackTarget);if(target&&!this.targetAllowed(u,target))target=undefined;
  const leash=anchorDistance>TUNING.softLeash,hard=anchorDistance>TUNING.hardLeash;
  const closeDefense=target&&this.edgeDistance(u,target)<=2.5;
  if(target&&u.unitType!=='medivac'&&(!hard||u.owner==='zerg'||closeDefense)&&this.edgeDistance(u,target)<=u.attackRange&&this.edgeDistance(u,target)>=(u.mode==='siege'?SIEGE.minRange:0)&&u.weaponCooldown<=1e-8){
   const heading=Math.atan2(target.x-u.x,target.z-u.z);u.facing=turn(u.facing,heading,(u.unitType==='hellion'?2.8:9)*dt);
   if(Math.abs(angleDelta(u.facing,heading))<.3){const data=SC2_UNITS[u.unitType],stim=u.stimUntil>this.time?1.5:1;
    u.weaponCooldown=(u.mode==='siege'?SIEGE.period:data.attackPeriod)/stim;u.windup=Math.max(dt,data.damagePoint);u.attackLock=u.windup+(u.unitType==='marine'?.12:.1);u.pendingTarget=target.id;u.action='attack';u.velocity={x:0,z:0};return;}
   // A committed firing turn must not be cancelled by formation steering in the same tick.
   u.velocity={x:0,z:0};u.action='idle';return;
  }
  if(u.mode==='siege'){u.action='idle';u.velocity={x:0,z:0};return;}
  let goal:Point=u.owner==='terran'?this.moveGoal(u):(target??this.anchor);
  if(u.owner==='zerg'&&u.guardianPod!==null){const p=this.pods.find(p=>p.id===u.guardianPod&&p.status==='active');if(p&&(!target||u.id%3!==0&&distance(u,target)>4))goal=p;}
  if(u.owner==='zerg'&&target&&this.edgeDistance(u,target)<=u.attackRange*.85)goal=u;
  if(u.owner==='terran'&&!leash&&target&&distance(u,this.anchor)<4&&this.edgeDistance(u,target)>u.attackRange)goal=target;
  if(u.unitType==='medivac'){const patient=this.heal(u,dt);if(patient&&!hard){if(this.edgeDistance(u,patient)<=HEAL.range){u.velocity={x:0,z:0};return;}goal=patient;}}
  let speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1);
  if(u.owner==='terran'&&hard)speed*=TUNING.catchUp;
  if(u.owner==='zerg'){const stage=STAGES[this.stage-1];speed*=stage.speed;if(u.unitType==='baneling'&&this.stage>=9)speed*=1.3;}
  if(!u.flying){
   const cached=this.navigation.get(u.id);
   if(!cached||this.time>=cached.until||distance(u,cached.goal)<.7||distance(goal,cached.requested)>2){
    const routed=steerGoal(u,goal,u.unitRadius,this.obstacles);
    this.navigation.set(u.id,{goal:{x:routed.x,z:routed.z},requested:{x:goal.x,z:goal.z},until:this.time+.15+(u.id%4)*.01});
   }
   goal=this.navigation.get(u.id)!.goal;
  }
  locomote(u,goal,speed,this.separation(u),dt,this.obstacles);
 }
 updatePods(){for(const p of this.pods){if(p.status!=='active')continue;
  if(p.hp<=0)p.status='destroyed';else if(this.time>=p.expiresAt-1e-8)p.status='expired';
  else if(![...p.guardianIds].some(id=>(this.entities.get(id)?.hp??0)>0)){
   let localThreat=false;this.hash.query(p,6,b=>{if(b.owner==='zerg'&&b.hp>0)localThreat=true;});if(!localThreat)p.status='rescued';
  }
  if(p.status==='active')continue;p.resolvedAt=this.time;
  for(const id of p.guardianIds){const guardian=this.entities.get(id);if(guardian)guardian.guardianPod=null;}
  if(p.status==='rescued'){const u=this.reinforce(p.unitType,p);p.recruitId=u.id;this.stats.rescued++;this.announce(`${SC2_UNITS[p.unitType].zh} 已获救，正在归队`);}
  else {this.stats.failed++;p.hp=0;this.announce('救援失败 · 降落仓内士兵阵亡 · 资源不返还');}
 }}
 spawnWave(){const s=STAGES[this.stage-1];this.wave++;
  const bearing=this.stage===1?0:this.random()*Math.PI*2;
  for(let i=0;i<s.count&&this.enemyCount()<TUNING.enemyCap;i++){let a=bearing+(this.random()-.5)*.45;if(this.stage===2)a=(i%2?0:Math.PI)+(this.random()-.5)*.45;else if(this.stage>=5&&i%2===0)a+=Math.PI;const r=22+this.random()*6;const p={x:Math.max(-49,Math.min(49,this.anchor.x+Math.cos(a)*r)),z:Math.max(-49,Math.min(49,this.anchor.z+Math.sin(a)*r))};if(blocked(p,1,this.obstacles))continue;this.addUnit(s.mix[i%s.mix.length],'zerg',p.x,p.z);}
 }
 endStage(){if(this.phase!=='battle')return;
  if(this.stage===12){this.phase=this.hive&&this.hive.hp<=0?'won':'lost';this.announce(this.phase==='won'?'虫巢已摧毁 · 小队撤离成功':'未能在期限内摧毁虫巢');return;}
  this.phase='reward';this.rewardClaimed=false;this.rerolls=0;this.rewards=drawRewards(this,this.random);this.changed();
 }
 rerollCost(){return 50+25*this.rerolls;}
 reroll(){if(this.phase!=='reward'||this.rewardClaimed||this.wallet.minerals<this.rerollCost())return false;
  if(!spend(this.wallet,{minerals:this.rerollCost(),gas:0}))return false;this.rewards=drawRewards(this,this.random,this.rewards.map(r=>r.id));this.rerolls++;this.changed();return true;
 }
 choose(id:string){if(this.phase!=='reward'||this.rewardClaimed)return false;const r=this.rewards.find(r=>r.id===id);if(!r||!eligibleReward(this,r))return false;
  if(r.kind==='build'){if(!this.build(r.value as BuildingType))return false;}
  else if(r.kind==='train'){if(!this.queue(r.value as TerranType))return false;}
  else if(r.kind==='tech'){if(!spend(this.wallet,{minerals:r.minerals,gas:r.gas}))return false;this.upgrades.set(r.value,(this.upgrades.get(r.value)??0)+1);for(const u of this.allies())this.refreshStats(u);}
  else {if(r.value==='minerals')this.wallet.minerals+=150;else if(r.value==='gas')this.wallet.gas+=100;else if(r.value==='salvage'){this.wallet.minerals+=75;this.wallet.gas+=40;}else {this.wallet.minerals+=100;this.wallet.gas+=25;}}
  this.rewardClaimed=true;this.stage++;this.stageElapsed=0;this.phase='battle';this.nextWave=this.time+3;
  if(this.stage===12)this.hive={id:this.nextId++,x:35,z:-32,hp:2200,maxHp:2200,armor:2,unitRadius:3,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};
  this.changed();return true;
 }
 stim(){if(this.phase!=='battle'||this.paused||!this.upgrades.has('stim'))return false;let used=false;for(const u of this.allies()){if(u.unitType==='marine'&&u.hp>10&&u.stimUntil<=this.time){u.hp-=10;u.stimUntil=this.time+11;used=true;}}this.changed();return used;}
 dash(){if(this.phase!=='battle'||this.paused||this.time<this.dashReady)return false;this.dashUntil=this.time+1.2;this.dashReady=this.time+12;return true;}
 step(){if(this.phase!=='battle'||this.paused)return;const dt=TUNING.step;this.tick++;this.time=this.tick*dt;this.stageElapsed+=dt;
  const mag=Math.hypot(this.input.x,this.input.z);if(mag>.01){const speed=TUNING.anchorSpeed*(this.time<this.dashUntil?1.65:1);this.anchor.facing=turn(this.anchor.facing,Math.atan2(this.input.x,this.input.z),5*dt);translate(this.anchor,{x:this.input.x/Math.max(1,mag)*speed*dt,z:this.input.z/Math.max(1,mag)*speed*dt},.8,false,this.obstacles);}
  if(distance(this.anchor,this.trail.at(-1)!)>.8)this.trail.push({x:this.anchor.x,z:this.anchor.z});
  if(this.trail.length>1200){this.trail.splice(0,200);for(const u of this.entities.values())u.trailIndex=Math.max(0,u.trailIndex-200);}
  this.updateProduction(dt);
  if(this.autoWaves&&this.time>=this.nextWave){this.spawnWave();this.nextWave=this.time+STAGES[this.stage-1].waveEvery;}
  const bodies:Body[]=[...this.entities.values(),...this.pods.filter(p=>p.status==='active')];if(this.hive&&this.hive.hp>0)bodies.push(this.hive);this.hash.rebuild(bodies);
  for(const u of this.entities.values())this.updateUnit(u,dt);
  for(const fx of this.effects){if(fx.kind==='bile'&&fx.until<=this.time){this.hash.query(fx.end,3,b=>{if(b.hp>0&&distance(b,fx.end)<=BILE.radius+b.unitRadius)this.hit(b,BILE.damage+b.armor);});}}
  this.effects=this.effects.filter(f=>f.until>this.time);
  this.updatePods();
  this.pickups=this.pickups.filter(p=>{const d=distance(p,this.anchor);if(d<2){this.wallet.minerals+=p.minerals;this.wallet.gas+=p.gas;return false;}if(d<6){p.x+=(this.anchor.x-p.x)*dt*4;p.z+=(this.anchor.z-p.z)*dt*4;}return true;});
  this.maxStretch=0;let fighters=0;for(const [id,u] of this.entities){if(u.owner==='terran'&&u.hp>0){this.maxStretch=Math.max(this.maxStretch,distance(u,this.anchor));if(u.unitType!=='medivac')fighters++;}if(u.deadAt!==null&&this.time-u.deadAt>1.5){this.entities.delete(id);this.navigation.delete(id);}}
  this.distancePairs=this.hash.visits;
  if(!fighters){this.phase='lost';this.announce('战斗单位全部阵亡 · 小队失联');}
  else if(this.stageElapsed>=TUNING.stageSeconds-1e-8)this.endStage();
  if(this.tick%6===0)this.changed();
 }
 advance(seconds:number){const n=Math.round(seconds/TUNING.step);for(let i=0;i<n;i++)this.step();}
}
