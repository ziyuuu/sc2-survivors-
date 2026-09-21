import type {TerrainQuery} from '../data/map-definition';
import {SC2_UNITS,TERRAN,ZERG,SIEGE,HEAL,BILE,type UnitType,type TerranType,type ZergType} from '../data/sc2-units';
import {BUILDINGS,FACTORY_TECH_LAB,OBSTACLES,STAGES,TUNING,FORMATION,type BuildingType,type Obstacle} from '../data/game';
import {spend,applyWeaponHit,healBiological} from './rules.mjs';
import {ContactSolver} from './movement/contacts';
import {SpatialHash} from './movement/spatial-hash';
import {distance,angleDelta,turn,translate,locomote,steerGoal,clearLine,blocked} from './movement/steering';
import {drawRewards,eligibleReward} from './progression/rewards';
import {stageConfig,stageSchedule,incomeFactor,type Difficulty,type Wave,type EconomicSpawn} from '../data/stages';
import {CharTerrain} from '../data/terrain';
import {rankStats} from '../data/ranks';
import {ECONOMY,DROPS} from '../data/economy';
import type {Entity,Point,Pod,Body,Building,Reward,Effect,Pickup,VisualEvent,EconomicTarget,SquadOrder} from './types';

export class World {
 time=0;tick=0;stage=1;stageElapsed=0;stageStartedAt=0;phase:'menu'|'battle'|'reward'|'won'|'lost'='menu';paused=false;
 entities=new Map<number,Entity>();pods:Pod[]=[];buildings=new Map<number,Building>();upgrades=new Map<string,number>();
 wallet={minerals:TUNING.startingMinerals,gas:TUNING.startingGas};anchor={x:0,z:0,facing:Math.PI/2};input={x:0,z:0};
 controllerCommand=false;order:SquadOrder|null=null;private movePending=new Set<number>();
 private commandRoute:{requested:Point;goal:Point;until:number}|null=null;
 trail:Point[]=[{x:0,z:0}];effects:Effect[]=[];pickups:Pickup[]=[];hash=new SpatialHash<Body>();
 visualEvents:VisualEvent[]=[];private visualSerial=0;
 private offerSerial=0;rewards:Reward[]=[];rewardClaimed=false;rewardRound:'building'|'random'='building';clearReceipt:{stage:number;minerals:number;gas:number}|null=null;rerolls=0;nextBuilding=1;nextWave=Infinity;wave=0;stageWave=0;nextId=1;nextJob=1;
 dashUntil=0;dashReady=0;hive:Body|null=null;maxStretch=0;distancePairs=0;collisionContacts=0;
 stats={kills:0,rescued:0,failed:0,produced:0,started:0,shots:0,healed:0,damage:0,scvsRescued:0,scvsLost:0,dronesKilled:0,ambientSpawned:0};
 difficulty:Difficulty='normal';scvs=0;economicTargets=new Map<number,EconomicTarget>();
 anchorMovingFor=0;anchorStoppedFor=0;tankCommand:'tank'|'siege'='tank';
 readonly economyTotals={passive:{minerals:0,gas:0},drops:{minerals:0,gas:0},clear:{minerals:0,gas:0},cards:{minerals:0,gas:0},production:{minerals:0,gas:0},purchases:{minerals:0,gas:0},rerolls:0};
 private readonly seed:number;private readonly sandbox:boolean;private productionCursor=0;
 productionPlan:{buildingId:number;unitType:TerranType}|null=null;
 private waves:Wave[]=[];private eventPlan:EconomicSpawn[]=[];private nextEvent=0;private scheduledStage=0;
 private ambientBacklog:{type:ZergType;bearing:number;at:number}[]=[];private extraDeliveries:TerranType[]=[];
 private spawnCells:Point[]=[];
 notice='守住小队。生产完成后必须救援。';noticeUntil=8;revision=0;
 readonly terrain?:TerrainQuery;
 readonly listeners=new Set<()=>void>();readonly obstacles:Obstacle[];
 private rngState:number;private autoWaves:boolean;
 private readonly contacts=new ContactSolver();
 private configStage=0;private configDifficulty:Difficulty|null=null;private stageData!:ReturnType<typeof stageConfig>;
 private detours=new Map<number,{body:number;first:Point;second:Point;phase:number;forward:Point}>();
 private navigation=new Map<number,{goal:Point;requested:Point;until:number}>();
 constructor(options:{seed?:number;waves?:boolean;obstacles?:Obstacle[];initial?:TerranType[];difficulty?:Difficulty;sandbox?:boolean;terrain?:boolean|TerrainQuery}={}){
  this.seed=options.seed??89241;this.rngState=this.seed;this.autoWaves=options.waves??true;this.sandbox=options.sandbox??false;this.difficulty=options.difficulty??'normal';this.obstacles=options.obstacles??OBSTACLES;this.terrain=typeof options.terrain==='object'?options.terrain:(options.terrain??(!this.sandbox&&options.obstacles===undefined))?new CharTerrain():undefined;if(this.terrain?.definition&&options.obstacles===undefined)this.obstacles=[];
  const initial=options.initial??TUNING.initialSquad;initial.forEach((t,i)=>this.addUnit(t,'terran',-i*1.15,(i%2)*1.4));
  if(!this.sandbox){this.addBuilding('barracks',0);for(const u of this.allies()){const p=this.moveGoal(u);u.x=p.x;u.z=p.z;u.prev={...p};}}
  this.prepareStage();
 }
 get config(){if(this.configStage!==this.stage||this.configDifficulty!==this.difficulty){this.stageData=stageConfig(this.stage,this.difficulty);this.configStage=this.stage;this.configDifficulty=this.difficulty;}return this.stageData;}
 get mapHalf(){return this.terrain?.definition?Math.max(this.terrain.definition.width,this.terrain.definition.height):this.sandbox?TUNING.worldHalf:this.config.width/2;}
 get duration(){return this.config.durationSeconds;}
 /** Whole-squad commands are simulation intent; picking and feedback live in the renderer. */
 cancelOrder(){this.order=null;this.movePending.clear();this.commandRoute=null;}
 private resetCommand(){this.cancelOrder();this.navigation.clear();this.detours.clear();for(const u of this.allies()){u.windup=0;u.attackLock=0;u.pendingTarget=null;u.attackTarget=null;u.thinkAt=0;}this.input={x:0,z:0};}
 private commandPoint(point:Point):Point|null {
  const radius=.9,half=this.mapHalf;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>=half||Math.abs(point.z)>=half)return null;
  const candidates=[{...point}];for(const r of [.5,1,1.5,2,3])for(let i=0;i<16;i++)candidates.push({x:point.x+Math.sin(i*Math.PI/8)*r,z:point.z+Math.cos(i*Math.PI/8)*r});
  for(const p of candidates){if(Math.abs(p.x)+radius>=half||Math.abs(p.z)+radius>=half||blocked(p,radius,this.obstacles)||this.terrain&&!this.terrain.canOccupy(p,radius))continue;
   if(distance(this.anchor,p)<.15||distance(this.anchor,steerGoal(this.anchor,p,radius,this.obstacles,this.terrain,half))>.01)return p;
  }return null;
 }
 issueMove(point:Point){if(this.phase!=='battle'||this.paused)return false;const goal=this.commandPoint(point);if(!goal){this.announce('该位置无法通行');return false;}
  this.resetCommand();this.order={kind:'move',point:goal,arrived:false,issuedAt:this.time};for(const u of this.allies())this.movePending.add(u.id);this.changed();return true;
 }
 issueFocus(targetId:number){if(this.phase!=='battle'||this.paused)return false;const target=this.body(targetId);if(!target||target.owner!=='zerg'||target.hp<=0)return false;
  if(this.order?.kind==='focus'&&this.order.targetId===targetId)return true;
  const goal=this.commandPoint(target);if(!goal){this.announce('目标无法到达');return false;}
  this.resetCommand();this.order={kind:'focus',targetId,issuedAt:this.time};this.changed();return true;
 }
 controllerTargetReachable(target:Body){return target.hp>0&&target.owner==='zerg'&&Math.abs(target.x)<this.mapHalf&&Math.abs(target.z)<this.mapHalf&&this.commandPoint(target)!==null;}
 setControllerFocus(id:number){const b=this.body(id);if(!b||!this.controllerTargetReachable(b))return false;this.controllerCommand=true;if(this.order?.kind==='focus'&&this.order.targetId===id)return true;this.order={kind:'focus',targetId:id,issuedAt:this.time};this.movePending.clear();this.commandRoute=null;return true;}
 private updateCommand(dt:number):Point {
  if(Math.hypot(this.input.x,this.input.z)>.01){if(this.order&&!(this.controllerCommand&&this.order.kind==='focus'))this.cancelOrder();return this.input;}
  const order=this.order;if(!order)return this.input;
  let goal:Point;
  if(order.kind==='focus'){
   const target=this.body(order.targetId);if(!target||target.hp<=0||target.owner!=='zerg'){this.cancelOrder();return {x:0,z:0};}
   // Stop the command anchor outside contact range, but never below an intervening cliff.
   if(distance(this.anchor,target)<3&&(!this.terrain||this.terrain.lineOfFire(this.anchor,target)))return {x:0,z:0};
   goal=target;
  }else {goal=order.point;if(distance(this.anchor,goal)<.12){order.arrived=true;return {x:0,z:0};}}
  let route=this.commandRoute;
  if(!route||this.time>=route.until||distance(goal,route.requested)>.75||distance(this.anchor,route.goal)<.25){
   const destination=this.commandPoint(goal);if(!destination){this.cancelOrder();this.announce('目标无法到达');return {x:0,z:0};}
   const next=steerGoal(this.anchor,destination,.9,this.obstacles,this.terrain,this.mapHalf);
   this.commandRoute=route={requested:{x:goal.x,z:goal.z},goal:next,until:this.time+.25};
  }
  const dx=route.goal.x-this.anchor.x,dz=route.goal.z-this.anchor.z,d=Math.hypot(dx,dz);
  const speed=TUNING.anchorSpeed*(this.time<this.dashUntil?1.65:1);
  const scale=Math.min(1,d/(speed*dt));return d>.01?{x:dx/d*scale,z:dz/d*scale}:{x:0,z:0};
 }
 setDifficulty(difficulty:Difficulty){if(this.phase!=='menu')return false;this.difficulty=difficulty;this.prepareStage();this.changed();return true;}
 prepareStage(){this.terrain?.setStage?.(this.stage);const plan=stageSchedule(this.config,this.seed);this.waves=plan.waves;this.eventPlan=plan.events;this.stageWave=0;this.nextEvent=0;this.scheduledStage=this.stage;this.nextWave=this.stageStartedAt+(this.waves[0]?.at??Infinity);
  // Flood once per expansion. Events use connected walkable cells, never a clamped wall position.
  const cells=new Map<string,Point>(),limit=this.mapHalf-2;
  for(let x=-Math.floor(limit/2)*2;x<=limit;x+=2)for(let z=-Math.floor(limit/2)*2;z<=limit;z+=2)if(!blocked({x,z},1.4,this.obstacles)&&(!this.terrain||this.terrain.canOccupy({x,z},1.4)))cells.set(x+','+z,{x,z});
  const origin=[...cells.values()].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];this.spawnCells=[];
  if(origin){const queue=[origin],seen=new Set([origin.x+','+origin.z]);for(let i=0;i<queue.length;i++){const p=queue[i];this.spawnCells.push(p);for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){const key=(p.x+dx)+','+(p.z+dz),n=cells.get(key);if(n&&!seen.has(key)&&clearLine(p,n,1.4,this.obstacles,this.terrain)){seen.add(key);queue.push(n);}}}}
  if(this.terrain?.connectedLocations)this.spawnCells=this.terrain.connectedLocations(this.anchor,.9,1.4);
  if(this.stage===12&&!this.hive){const expected=this.terrain?.definition?.hive;const p=expected?this.spawnCells.filter(p=>this.terrain!.canOccupy(p,3)).sort((a,b)=>distance(a,expected)-distance(b,expected))[0]??this.eventPoint():this.spawnCells.reduce((a,b)=>b.z<a.z?b:a,{x:0,z:0}),hp=this.difficulty==='easy'?9000:12000;this.hive={id:this.nextId++,...p,hp,maxHp:hp,armor:2,unitRadius:3,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};}
 }
 eventPoint(min=6,max=Infinity,origin:Point=this.anchor){const candidates=this.spawnCells.filter(p=>distance(p,origin)>=min&&distance(p,origin)<=max);const pool=candidates.length?candidates:this.spawnCells;return {...(pool[Math.floor(this.random()*pool.length)]??{x:0,z:0})};}
 nearbyPoint(origin:Point,radius:number,angle:number,bodyRadius=.6){for(let n=0;n<24;n++){const a=angle+n*.4,r=radius*(1-Math.floor(n/8)*.23),p={x:origin.x+Math.sin(a)*r,z:origin.z+Math.cos(a)*r};if(Math.abs(p.x)<this.mapHalf-bodyRadius&&Math.abs(p.z)<this.mapHalf-bodyRadius&&!blocked(p,bodyRadius,this.obstacles)&&clearLine(origin,p,bodyRadius,this.obstacles,this.terrain))return p;}return this.eventPoint(1,radius+3,origin);}
 random=()=>{this.rngState=(Math.imul(1664525,this.rngState)+1013904223)>>>0;return this.rngState/4294967296;};
 changed(){this.revision++;for(const fn of this.listeners)fn();}
 announce(text:string){this.notice=text;this.noticeUntil=this.time+7;this.changed();}
 start(){if(this.phase==='menu'){this.phase='battle';if(!this.sandbox)this.updateProduction(0);this.changed();}}
 allies(){return [...this.entities.values()].filter(u=>u.owner==='terran'&&u.hp>0);}
 enemyCount(){let n=0;for(const u of this.entities.values())if(u.owner==='zerg'&&u.hp>0)n++;return n;}
 addUnit(unitType:UnitType,owner:'terran'|'zerg',x:number,z:number,rank=1){
  const d=SC2_UNITS[unitType];const occupied=new Set(this.allies().filter(a=>a.unitType===unitType).map(a=>a.slot));let slot=0;while(occupied.has(slot))slot++;
  const u:Entity={id:this.nextId++,unitType,owner,x,z,prev:{x,z},
   hp:d.maxHp,maxHp:d.maxHp,armor:d.armor,moveSpeed:d.movementSpeed,attackRange:d.attackRange,weaponDamage:d.attackDamage,weaponCooldown:0,attackPeriod:d.attackPeriod,attackFacing:Math.PI/2,
   attackTarget:null,facing:Math.PI/2,velocity:{x:0,z:0},unitRadius:d.unitRadius,rank,attributes:[...d.attributes],flying:d.flying,
   slot:owner==='terran'?slot:0,trailIndex:Math.max(0,this.trail.length-1),action:'spawn',mode:'tank',desiredMode:'tank',modeTimer:0,
   windup:0,attackLock:0,pendingTarget:null,lastShotAt:-100,energy:unitType==='medivac'?HEAL.startEnergy:0,maxEnergy:HEAL.maxEnergy,energyRegen:HEAL.regen,healRate:HEAL.hpPerSecond,healTarget:null,bileCooldown:3,
   guardianPod:null,stimUntil:0,deadAt:null,bornAt:this.time,thinkAt:0,distanceWalked:0};
  this.refreshStats(u,true);if(owner==='zerg'&&!this.sandbox){if(unitType==='zergling')u.hp=u.maxHp=this.config.lingHp;if(unitType==='roach'&&this.stage>=8)u.armor++;if(unitType==='baneling'&&this.stage>=9)u.hp=u.maxHp=35;}this.entities.set(u.id,u);if(owner==='terran'&&this.order?.kind==='move')this.movePending.add(u.id);return u;
 }
 refreshStats(u:Entity,fill=false){const d=SC2_UNITS[u.unitType];const old=u.maxHp,r=rankStats(u.owner==='terran'?u.rank:1);
  u.maxHp=(d.maxHp+(u.unitType==='marine'&&this.upgrades.has('shield')?10:0))*r.health;
  u.hp=fill?u.maxHp:Math.min(u.maxHp,u.hp+Math.max(0,u.maxHp-old));
  const upgrade=u.unitType==='marine'?(this.upgrades.get('infantry')??0):['hellion','tank'].includes(u.unitType)?(this.upgrades.get('vehicle')??0)*(u.unitType==='tank'?2:1):0;
  u.weaponDamage=(d.attackDamage+upgrade)*r.damage;
  u.attackRange=u.mode==='siege'?SIEGE.range:d.attackRange;u.attackPeriod=(u.mode==='siege'?SIEGE.period:d.attackPeriod)/r.attackSpeed;
  if(u.owner==='terran')u.armor=d.armor+r.armor;u.maxEnergy=HEAL.maxEnergy*r.energy;u.energyRegen=HEAL.regen*r.energy*(this.upgrades.has('medivac')?2:1);u.healRate=HEAL.hpPerSecond*r.healing;
 }
 reinforce(type:TerranType,p:Point){const same=this.allies().filter(u=>u.unitType===type);
  if(same.length<5)return this.addUnit(type,'terran',p.x,p.z);
  same.sort((a,b)=>a.rank-b.rank||a.id-b.id);const lowest=same[0];if(lowest.rank<5){lowest.rank++;this.refreshStats(lowest);}
  return lowest;
 }
 capacity(type:TerranType){const points=this.allies().filter(u=>u.unitType===type).reduce((n,u)=>n+u.rank,0);const orders=[...this.buildings.values()].reduce((n,b)=>n+b.queue.filter(j=>j.unitType===type).length,0);const pods=this.pods.filter(p=>p.unitType===type&&['falling','active','opening'].includes(p.status)).length;return points+orders+pods+this.extraDeliveries.filter(t=>t===type).length<25;}
 productionCost=(type:TerranType)=>{const d=SC2_UNITS[type];const factor=this.upgrades.has('discount')?.85:1;return {minerals:Math.ceil(d.mineralCost*factor),gas:Math.ceil(d.gasCost*factor)};};
 buildingsOf(type:BuildingType){return [...this.buildings.values()].filter(b=>b.type===type);}
 addBuilding(type:BuildingType,remaining=BUILDINGS[type].time){const b:Building={id:this.nextBuilding++,type,remaining,queue:[],techLab:false,upgradeRemaining:null};this.buildings.set(b.id,b);return b;}
 buildingCanTrain(b:Building,type:TerranType){return b.remaining<=0&&b.upgradeRemaining===null&&BUILDINGS[b.type].types.includes(type)&&(type!=='tank'||b.techLab);}
 productionIntent(b:Building){return (b.type==='factory'?['tank','hellion'] as TerranType[]:BUILDINGS[b.type].types).find(type=>this.buildingCanTrain(b,type)&&this.capacity(type));}
 buildingFor(type:TerranType){return [...this.buildings.values()].filter(b=>this.buildingCanTrain(b,type)).sort((a,b)=>a.queue.length-b.queue.length||a.id-b.id)[0];}
 canTrain=(type:TerranType,buildingId?:number)=>{const b=buildingId===undefined?this.buildingFor(type):this.buildings.get(buildingId),c=this.productionCost(type);return !!b&&this.buildingCanTrain(b,type)&&this.capacity(type)&&this.wallet.minerals>=c.minerals&&this.wallet.gas>=c.gas;};
 build(type:BuildingType){const d=BUILDINGS[type];if(!spend(this.wallet,{minerals:d.minerals,gas:d.gas}))return false;
  this.addBuilding(type);this.economyTotals.purchases.minerals+=d.minerals;this.economyTotals.purchases.gas+=d.gas;this.changed();return true;
 }
 queue(type:TerranType,buildingId?:number){if(!this.canTrain(type,buildingId))return false;const cost=this.productionCost(type);if(!spend(this.wallet,cost))return false;
  const building=buildingId===undefined?this.buildingFor(type):this.buildings.get(buildingId)!;building.queue.push({id:this.nextJob++,unitType:type,remaining:SC2_UNITS[type].productionTime,paid:cost});this.stats.started++;this.economyTotals.production.minerals+=cost.minerals;this.economyTotals.production.gas+=cost.gas;this.changed();return true;
 }
 updateProduction(dt:number){for(const b of this.buildings.values()){
  if(b.remaining>0){b.remaining=Math.max(0,b.remaining-dt);continue;}
  // Already-paid orders finish first; the lab then occupies this building alone.
  const job=b.queue[0];if(!job){if(b.upgradeRemaining!==null){b.upgradeRemaining=Math.max(0,b.upgradeRemaining-dt);if(b.upgradeRemaining<=1e-8){b.techLab=true;b.upgradeRemaining=null;this.changed();}}continue;}job.remaining-=dt;
  if(job.remaining<=1e-8){b.queue.shift();this.stats.produced++;this.spawnPod(job.unitType,undefined,job.id);}
 }
 if(this.sandbox)return;
 const buildings=[...this.buildings.values()],n=buildings.length;if(!n){this.productionPlan=null;return;}
 // Reserve one next order, not one wallet per building. The turn rotates after payment.
 // Cards may still spend this visible wallet while paused; only automatic spending is reserved.
 for(let attempt=0;attempt<n;attempt++){
  const planned=this.productionPlan&&this.buildings.get(this.productionPlan.buildingId);
  if(!planned||planned.queue.length||this.productionIntent(planned)!==this.productionPlan?.unitType)this.productionPlan=null;
  if(!this.productionPlan)for(let offset=0;offset<n;offset++){
   const b=buildings[(this.productionCursor+offset)%n],type=!b.queue.length&&this.productionIntent(b);
   if(type){this.productionPlan={buildingId:b.id,unitType:type};break;}
  }
  const plan=this.productionPlan;if(!plan)break;
  if(!this.queue(plan.unitType,plan.buildingId))break;
  this.productionCursor=(buildings.findIndex(b=>b.id===plan.buildingId)+1)%n;this.productionPlan=null;
 }
 const plan=this.productionPlan;
 if(plan){const reserved=this.productionCost(plan.unitType);
  // Keep lower-tier factories and Barracks productive only from a true surplus.
  for(const b of buildings){if(b.id===plan.buildingId||b.queue.length)continue;const type=this.productionIntent(b);if(!type)continue;
   const cost=this.productionCost(type);if(Math.max(0,this.wallet.minerals-reserved.minerals)>=cost.minerals&&Math.max(0,this.wallet.gas-reserved.gas)>=cost.gas)this.queue(type,b.id);
  }
 }

 }
 podPurpose(type:TerranType){const units=this.allies().filter(u=>u.unitType===type);return units.length<5?'新增队员':units.some(u=>u.rank<5)?'晋升最低军衔':'培养已满';}
 spawnPod(type:TerranType,position?:Point,jobId=0){const p=position??this.eventPoint(this.stage<=3?7:14,this.stage<=3?13:32),c=this.config;
  const pod:Pod={id:this.nextId++,...p,hp:c.podHp,maxHp:c.podHp,armor:TUNING.podArmor,unitRadius:1.25,flying:false,attributes:['Armored','Structure'],owner:'terran',unitType:type,
   createdAt:this.time,landedAt:this.time+ECONOMY.landingSeconds,guardianIds:new Set(),guardTypes:c.guards.flatMap((n,i)=>Array<ZergType>(n).fill(ZERG[i])),status:'falling',resolvedAt:null,recruitId:null,jobId,stage:this.stage};this.pods.push(pod);
  this.announce(SC2_UNITS[type].zh+' 增援即将落地');return pod;
 }
 landPod(p:Pod){p.status='active';p.landedAt=this.time;const radius=p.stage<=3?4:p.stage<=8?6:8;
  p.guardTypes.forEach((t,i)=>{const pos=this.nearbyPoint(p,radius,i/p.guardTypes.length*Math.PI*2),e=this.addUnit(t,'zerg',pos.x,pos.z);if(t==='zergling'){e.hp=e.maxHp=stageConfig(p.stage,this.difficulty).lingHp;}e.guardianPod=p.id;p.guardianIds.add(e.id);});
  this.visual('pod-land',p);this.announce(SC2_UNITS[p.unitType].zh+' 降落仓遭到围攻');
 }
 spawnEconomic(kind:'egg'|'drone',position?:Point){const p=position??this.eventPoint(5),hp=kind==='egg'?ECONOMY.eggHp:ECONOMY.droneHp;
  const target:EconomicTarget={id:this.nextId++,...p,origin:{...p},hp,maxHp:hp,armor:0,unitRadius:kind==='egg'?.65:.55,attributes:kind==='egg'?['Biological','Structure']:['Light','Biological'],owner:'zerg',flying:false,kind,createdAt:this.time,expiresAt:kind==='egg'?this.time+ECONOMY.eggSeconds:null,resolvedAt:null,status:'active',facing:0};this.economicTargets.set(target.id,target);if(kind==='egg')this.announce('发现被困 SCV · 30 秒内击破虫卵');return target;
 }
 updateEconomy(dt:number){if(!this.sandbox){const f=incomeFactor(this.difficulty),m=(ECONOMY.passive.minerals+this.scvs*ECONOMY.perScv.minerals)*dt*f,g=(ECONOMY.passive.gas+this.scvs*ECONOMY.perScv.gas)*dt*f;this.wallet.minerals+=m;this.wallet.gas+=g;this.economyTotals.passive.minerals+=m;this.economyTotals.passive.gas+=g;}
  for(const e of this.economicTargets.values()){if(e.status!=='active')continue;
   if(e.kind==='egg'&&this.time>=e.expiresAt!-1e-8){e.status='expired';e.hp=0;e.resolvedAt=this.time;this.stats.scvsLost++;this.visual('egg-expired',e);this.announce('SCV 未能获救');}
   else if(e.kind==='drone'){const goal={x:e.origin.x+Math.sin(this.time*.24+e.id)*1.2,z:e.origin.z+Math.cos(this.time*.24+e.id)*1.2},dx=goal.x-e.x,dz=goal.z-e.z;e.facing=turn(e.facing,Math.atan2(dx,dz),dt*3);translate(e,{x:dx*dt,z:dz*dt},e.unitRadius,false,this.obstacles,this.mapHalf,this.terrain);}
  }
 }
 body(id:number|null):Body|undefined {if(id===null)return;const econ=this.economicTargets.get(id);return this.entities.get(id)??(econ?.status==='active'?econ:undefined)??this.pods.find(p=>p.id===id&&(p.status==='active'||p.status==='opening'))??(this.hive?.id===id?this.hive:undefined);}
 targetAllowed(u:Entity,b:Body){return b.hp>0&&b.owner!==u.owner&&(!b.flying||SC2_UNITS[u.unitType].targetType==='both');}
 edgeDistance(a:Body,b:Body){return Math.max(0,distance(a,b)-a.unitRadius-b.unitRadius);}
 hasAttackLine(u:Entity,b:Body){return !this.terrain||this.terrain.lineOfFire(u,b,u.flying,b.flying,u.attackRange<1);}
 findTarget(u:Entity,range:number){let best:Body|undefined,score=Infinity;
  this.hash.query(u,range+2,b=>{if(!this.targetAllowed(u,b)||!this.hasAttackLine(u,b))return;let s=distance(u,b);if(u.owner==='terran'){// Stable combat targeting: finish a wounded threat and keep a useful lock.
    s+=b.hp/Math.max(1,b.maxHp)*1.5;if(b.id===u.attackTarget)s-=.8;if(this.economicTargets.has(b.id))s+=100;}
   if(u.guardianPod&&b.id===u.guardianPod)s-=u.id%3===0?0:8;
   if(s<score){score=s;best=b;}
  },u.owner==='terran'?'zerg':'terran');return best;
 }
 hit(target:Body,damage:number,bonuses:{attribute:string;amount:number}[]=[],hits=1,sourceOwner:'terran'|'zerg'='terran'){
  const before=target.hp;applyWeaponHit(target,{damage,bonuses,hits,minimumDamage:.5});this.stats.damage+=before-target.hp;
  if(before>target.hp)this.visual('hit',target);
  const economic=this.economicTargets.get(target.id);if(economic&&economic.status==='active'&&economic.hp<=0){economic.resolvedAt=this.time;
   if(economic.kind==='egg'){if(sourceOwner==='terran'&&this.time<economic.expiresAt!-1e-8){economic.status='rescued';this.scvs++;this.stats.scvsRescued++;this.visual('scv-rescue',economic);this.announce('SCV 已获救 · 自动采集提升');}else {economic.status='expired';this.stats.scvsLost++;this.visual('egg-expired',economic);}}
   else {economic.status='killed';this.stats.dronesKilled++;this.visual('drone-death',economic);this.drop(economic,DROPS.drone);}return;
  }
  if(target.hp<=0&&'unitType' in target&&this.entities.has(target.id)){const e=target as Entity;if(e.deadAt===null){e.deadAt=this.time;e.action='dead';e.velocity={x:0,z:0};
    this.visual('death',e);if(e.owner==='zerg'){this.stats.kills++;this.drop(e,(e.guardianPod===null?DROPS.ambient:DROPS.guard)[e.unitType as ZergType]);}
  }}
 }
 drop(p:Point,amount:readonly [number,number]){const f=incomeFactor(this.difficulty);this.pickups.push({id:this.nextId++,...p,minerals:amount[0]*f,gas:amount[1]*f});}
 visual(kind:VisualEvent['kind'],body:Body,end:Point=body){const e=this.entities.get(body.id);this.visualEvents.push({serial:++this.visualSerial,time:this.time,kind,x:body.x,z:body.z,y:(body.flying?5.6:this.terrain?.height(body)??0)+.6,endY:(this.terrain?.height(end)??0)+.6,unitType:e?.unitType??null,entityId:body.id,flying:body.flying,end:{x:end.x,z:end.z},facing:kind==='attack'?e?.attackFacing??0:e?.facing??0,siege:e?.mode==='siege'});if(this.visualEvents.length>768)this.visualEvents.splice(0,256);}
 effect(kind:Effect['kind'],source:Body,end:Point,radius=.1,duration=.18){this.effects.push({id:this.nextId++,kind,x:source.x,z:source.z,end:{...end},until:this.time+duration,radius,owner:source.owner,source:source.id});}
 fire(u:Entity,target:Body){if(!this.targetAllowed(u,target)||!this.hasAttackLine(u,target))return;const d=SC2_UNITS[u.unitType];this.stats.shots++;
  u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.lastShotAt=this.time;this.visual('attack',u,target);
  const rank=rankStats(u.owner==='terran'?u.rank:1).damage;const bonus=d.bonusDamage.map(b=>({...b,amount:(b.amount+(u.unitType==='hellion'&&this.upgrades.has('infernal')?5:0))*rank}));
  if(u.unitType==='hellion'){
   const a=Math.atan2(target.x-u.x,target.z-u.z),end={x:u.x+Math.sin(a)*6.5,z:u.z+Math.cos(a)*6.5};
   this.hash.query(u,8,b=>{if(!this.targetAllowed(u,b)||!this.hasAttackLine(u,b))return;const along=(b.x-u.x)*Math.sin(a)+(b.z-u.z)*Math.cos(a);const across=Math.abs((b.x-u.x)*Math.cos(a)-(b.z-u.z)*Math.sin(a));if(along>=0&&along<=6.5+b.unitRadius&&across<=.15+b.unitRadius)this.hit(b,u.weaponDamage,bonus);});this.effect('flame',u,end,.35,.35);
  }else if(u.unitType==='baneling'){
   this.hash.query(u,4,b=>{if(b.owner!==u.owner&&!b.flying&&(!this.terrain||this.terrain.walkLine(u,b,0))&&this.edgeDistance(u,b)<=2.2){this.hit(b,b.attributes.includes('Structure')?80+b.armor:u.weaponDamage,b.attributes.includes('Structure')?[]:bonus);}});
   this.effect('explosion',u,u,2.2,.55);u.hp=0;u.deadAt=this.time;u.action='dead';this.visual('death',u);
  }else if(u.mode==='siege'){
   const dmg=(SIEGE.damage+(this.upgrades.get('vehicle')??0)*4)*rank,bon=SIEGE.bonus.map(b=>({...b,amount:b.amount*rank}));
   this.hash.query(target,3,b=>{if(b.id===u.id||b.flying||b.hp<=0)return;const r=distance(target,b);const band=SIEGE.splash.find(s=>r<=s.radius+b.unitRadius*.25);if(b.id===target.id||band)this.hit(b,dmg*(band?.fraction??1),bon.map(bn=>({...bn,amount:bn.amount*(band?.fraction??1)})));});this.effect('explosion',u,target,1.25,.4);
  }else {this.hit(target,u.weaponDamage,bonus,d.attacks);this.effect('shot',u,target,.1,u.unitType==='marine'?.1:.2);}
 }
 toggleTanks(){if(this.phase!=='battle'||this.paused)return false;const tanks=this.allies().filter(u=>u.unitType==='tank');if(!tanks.length)return false;this.tankCommand=this.tankCommand==='tank'?'siege':'tank';for(const u of tanks)u.desiredMode=this.tankCommand;this.changed();return true;}
 updateTank(u:Entity,_anchorDistance:number,dt:number){if(u.unitType!=='tank')return false;
  if(u.modeTimer>0){u.modeTimer=Math.max(0,u.modeTimer-dt);u.velocity={x:0,z:0};if(u.modeTimer<=1e-8){u.mode=u.action==='sieging'?'siege':'tank';u.action='idle';this.refreshStats(u);}return true;}
  if(u.mode!==u.desiredMode){u.action=u.desiredMode==='siege'?'sieging':'unsieging';u.modeTimer=(u.desiredMode==='siege'?SIEGE.deploySeconds:SIEGE.undeploySeconds)*(this.upgrades.has('siege')?.8:1);u.velocity={x:0,z:0};u.windup=0;u.pendingTarget=null;return true;}
  return false;
 }
 heal(u:Entity,dt:number){u.energy=Math.min(u.maxEnergy,u.energy+u.energyRegen*dt);u.healTarget=null;
  let best:Entity|undefined;this.hash.query(u,14,b=>{if(b.owner==='terran'&&b.hp>0&&b.hp<b.maxHp&&b.attributes.includes('Biological')){const e=this.entities.get(b.id);if(e&&(!best||e.hp/e.maxHp<best.hp/best.maxHp))best=e;}},'terran');
  if(best&&u.energy>0){const healed=healBiological(u,best,{...HEAL,hpPerSecond:u.healRate},dt,this.edgeDistance(u,best));if(healed>0){u.healTarget=best.id;u.action='heal';this.stats.healed+=healed;}return best;}return undefined;
 }
 updateBile(u:Entity,dt:number){u.bileCooldown-=dt;if(u.bileCooldown>0)return;const target=this.findTarget(u,BILE.range);
  if(target&&this.edgeDistance(u,target)<=BILE.range){this.effect('bile',u,target,BILE.radius,BILE.delay);u.bileCooldown=BILE.cooldown;}
 }
 moveGoal(u:Entity){
  // The current command is authoritative. A stopped/sieged unit must never replay an old loop.
  // Independent speed, turn rate, collision and attack stops still create real stragglers.
  u.trailIndex=this.trail.length-1;
  const formation=FORMATION[u.unitType as TerranType];
  const lane=formation.lane*(u.slot%2===0?-1:1);
  const back=formation.back+(u.unitType==='marine'?Math.floor(u.slot/2):u.slot)*formation.spacing;
  const bound=this.mapHalf-u.unitRadius-.05;
  const goal={x:Math.max(-bound,Math.min(bound,this.anchor.x-Math.sin(this.anchor.facing)*back+Math.cos(this.anchor.facing)*lane)),z:Math.max(-bound,Math.min(bound,this.anchor.z-Math.cos(this.anchor.facing)*back-Math.sin(this.anchor.facing)*lane))};
  // A formation offset can land inside a wall/cliff; the reachable command point takes priority.
  return !blocked(goal,u.unitRadius,this.obstacles)&&(!this.terrain||this.terrain.canOccupy(goal,u.unitRadius))?goal:{x:this.anchor.x,z:this.anchor.z};
 }
 private avoidStationaryBodies(u:Entity,goal:Point):Point {
  if(u.flying||u.owner!=='terran')return goal;
  let detour=this.detours.get(u.id);
  if(detour){const body=this.body(detour.body),remaining={x:goal.x-u.x,z:goal.z-u.z};
   if(!body||body.hp<=0||'mode' in body&&body.mode!=='siege'&&(body as Entity).modeTimer<=0||remaining.x*detour.forward.x+remaining.z*detour.forward.z<0){this.detours.delete(u.id);detour=undefined;}
   else {if(distance(u,detour.first)<.45)detour.phase=1;if(distance(u,detour.second)<.45){this.detours.delete(u.id);return goal;}return detour.phase?detour.second:detour.first;}
  }
  const d=distance(u,goal);if(d<.25)return goal;const forward={x:(goal.x-u.x)/d,z:(goal.z-u.z)/d};let blocker:Body|undefined,nearest=Infinity,checked=0;
  this.hash.query(u,4+u.unitRadius,b=>{if(checked++>=20)return false;if(b.id===u.id||b.flying||b.owner!=='terran'||this.terrain&&!this.terrain.sameContactLayer(u,b))return;if('velocity' in b&&(b as Entity).mode!=='siege'&&(b as Entity).modeTimer<=0)return;
   const x=b.x-u.x,z=b.z-u.z,along=x*forward.x+z*forward.z,across=Math.abs(x*forward.z-z*forward.x),r=u.unitRadius+b.unitRadius+.2;
   if(along>0&&along<Math.min(d,4)&&across<r&&along<nearest){blocker=b;nearest=along;}
  });
  if(!blocker)return goal;const b=blocker as Body,r=u.unitRadius+b.unitRadius+.4;
  // If the desired slot itself is occupied, settle beside it instead of orbiting the defender.
  if(distance(goal,b)<u.unitRadius+b.unitRadius+.1&&distance(u,b)<r+.2)return u;
  const cross=(u.x-b.x)*forward.z-(u.z-b.z)*forward.x,side=Math.abs(cross)>.1?Math.sign(cross):(u.id%2?1:-1);
  for(const sign of [side,-side]){const lateral={x:forward.z*r*sign,z:-forward.x*r*sign},first={x:b.x-forward.x*r+lateral.x,z:b.z-forward.z*r+lateral.z},second={x:b.x+forward.x*r+lateral.x,z:b.z+forward.z*r+lateral.z};
   if([first,second].some(p=>Math.abs(p.x)+u.unitRadius>=this.mapHalf||Math.abs(p.z)+u.unitRadius>=this.mapHalf))continue;
   if(clearLine(u,first,u.unitRadius,this.obstacles,this.terrain)&&clearLine(first,second,u.unitRadius,this.obstacles,this.terrain)){
    this.detours.set(u.id,{body:b.id,first,second,phase:0,forward});return first;
   }
  }
  return u;
 }
 separation(u:Entity){const v={x:0,z:0};let n=0;this.hash.query(u,2.8,b=>{if(n>=12)return false;if(b.id===u.id||b.flying!==u.flying||!u.flying&&this.terrain&&!this.terrain.sameContactLayer(u,b))return;const d=distance(u,b),min=u.unitRadius+b.unitRadius+.15;if(d<min){const strength=Math.min(3,(min-d)*5);if(d>.001){v.x+=(u.x-b.x)/d*strength;v.z+=(u.z-b.z)/d*strength;}else{const a=(Math.min(u.id,b.id)*7+Math.max(u.id,b.id)*13)*2.399,sign=u.id<b.id?1:-1;v.x+=Math.sin(a)*strength*sign;v.z+=Math.cos(a)*strength*sign;}n++;}});return v;}
 updateUnit(u:Entity,dt:number){if(u.hp<=0)return;u.prev={x:u.x,z:u.z};u.healTarget=null;
  u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);
  const anchorDistance=distance(u,this.anchor);
  if(this.updateTank(u,anchorDistance,dt))return;
  if(u.unitType==='ravager')this.updateBile(u,dt);
  if(u.owner==='terran'&&this.order?.kind==='move'&&this.order.arrived&&distance(u,this.moveGoal(u))<.45+u.unitRadius*.5)this.movePending.delete(u.id);
  const movingOrder=u.owner==='terran'&&this.order?.kind==='move'&&this.movePending.has(u.id)&&u.mode!=='siege';
  const focusBody=u.owner==='terran'&&u.unitType!=='medivac'&&this.order?.kind==='focus'?this.body(this.order.targetId):undefined;
  const focused=focusBody&&this.targetAllowed(u,focusBody)?focusBody:undefined;
  if(u.windup>0){u.windup-=dt;u.velocity={x:0,z:0};u.action='attack';if(u.windup>1e-8)return;const b=this.body(u.pendingTarget);if(b&&this.edgeDistance(u,b)<=u.attackRange+.5)this.fire(u,b);u.pendingTarget=null;u.windup=0;u.attackLock=0;if(u.hp<=0)return;}
  if(focused)u.attackTarget=focused.id;
  else if(movingOrder)u.attackTarget=null;
  else if(this.time>=u.thinkAt||!this.body(u.attackTarget)?.hp){u.attackTarget=this.findTarget(u,u.owner==='terran'?u.attackRange+2:16)?.id??null;u.thinkAt=this.time+.12+(u.id%5)*.012;}
  let target=this.body(u.attackTarget);if(target&&!this.targetAllowed(u,target))target=undefined;
  const leash=anchorDistance>TUNING.softLeash,hard=anchorDistance>TUNING.hardLeash;
  const closeDefense=target&&this.edgeDistance(u,target)<=2.5;
  if(u.unitType==='tank'&&target)u.attackFacing=turn(u.attackFacing,Math.atan2(target.x-u.x,target.z-u.z),6*dt);
  const marchingRearTarget=!focused&&u.unitType==='hellion'&&u.owner==='terran'&&this.anchorMovingFor>.2&&target&&Math.abs(angleDelta(u.facing,Math.atan2(target.x-u.x,target.z-u.z)))>1.2;
  if(target&&this.hasAttackLine(u,target)&&!marchingRearTarget&&u.unitType!=='medivac'&&(!hard||!!focused||u.mode==='siege'||u.owner==='zerg'||closeDefense)&&this.edgeDistance(u,target)<=u.attackRange&&this.edgeDistance(u,target)>=(u.mode==='siege'?SIEGE.minRange:0)&&u.weaponCooldown<=1e-8){
   const heading=Math.atan2(target.x-u.x,target.z-u.z);if(u.unitType!=='tank')u.attackFacing=u.facing=turn(u.facing,heading,(u.unitType==='hellion'?4.8:u.unitType==='marine'?24:9)*dt);
   if(Math.abs(angleDelta(u.attackFacing,heading))<.3){const data=SC2_UNITS[u.unitType],stim=u.stimUntil>this.time?1.5:1;
    u.weaponCooldown=u.attackPeriod/stim;u.windup=Math.max(dt,data.damagePoint);u.attackLock=u.windup;u.pendingTarget=target.id;u.action='attack';u.velocity={x:0,z:0};return;}
   // A committed firing turn must not be cancelled by formation steering in the same tick.
   u.velocity={x:0,z:0};u.action='idle';return;
  }
  if(u.mode==='siege'){u.action='idle';u.velocity={x:0,z:0};return;}
  let goal:Point=u.owner==='terran'?this.moveGoal(u):(target??this.anchor);
  if(focused&&!(this.controllerCommand&&Math.hypot(this.input.x,this.input.z)>.01)){goal=focused;if(this.hasAttackLine(u,focused)&&this.edgeDistance(u,focused)<=u.attackRange){u.velocity={x:0,z:0};u.action='idle';return;}}
  if(u.owner==='zerg'&&u.guardianPod!==null){const p=this.pods.find(p=>p.id===u.guardianPod&&p.status==='active');if(p&&(!target||u.id%3!==0&&distance(u,target)>4))goal=p;}
  if(u.owner==='zerg'&&target&&this.edgeDistance(u,target)<=u.attackRange*.85)goal=u;
  if(u.owner==='terran'&&!leash&&target&&!this.economicTargets.has(target.id)&&this.anchorStoppedFor>.15&&distance(target,this.anchor)<=u.attackRange+3&&this.edgeDistance(u,target)>u.attackRange)goal=target;
  // Hold a useful firing position while the anchor is still; do not turn back to the slot after every bullet.
  if(u.owner==='terran'&&u.unitType!=='medivac'&&target&&!hard&&this.anchorStoppedFor>.1&&this.hasAttackLine(u,target)&&this.edgeDistance(u,target)<=u.attackRange){u.velocity={x:0,z:0};u.action='idle';return;}
  if(u.unitType==='medivac'&&movingOrder)u.energy=Math.min(u.maxEnergy,u.energy+u.energyRegen*dt);
  if(u.unitType==='medivac'&&!movingOrder){const patient=this.heal(u,dt);if(patient&&!hard){if(this.edgeDistance(u,patient)<=HEAL.range){u.velocity={x:0,z:0};return;}goal=patient;}}
  let speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1);
  if(u.owner==='terran'&&hard)speed*=TUNING.catchUp;
  if(u.owner==='zerg'){const stage=STAGES[this.stage-1];speed*=stage.speed;if(u.unitType==='baneling'&&this.stage>=9)speed*=1.3;}
  if(!u.flying){
   const cached=this.navigation.get(u.id);
   if(!cached||this.time>=cached.until||distance(u,cached.goal)<.7||distance(goal,cached.requested)>2){
    const routed=steerGoal(u,goal,u.unitRadius,this.obstacles,this.terrain,this.mapHalf);
    this.navigation.set(u.id,{goal:{x:routed.x,z:routed.z},requested:{x:goal.x,z:goal.z},until:this.time+.15+(u.id%4)*.01});
   }
   goal=this.navigation.get(u.id)!.goal;
  }
  goal=this.avoidStationaryBodies(u,goal);
  locomote(u,goal,speed,this.separation(u),dt,this.obstacles,this.sandbox?TUNING.worldHalf:this.mapHalf,this.terrain);
 }
 updatePods(){for(const p of this.pods){
  if(p.status==='falling'){if(this.time>=p.landedAt-1e-8)this.landPod(p);continue;}
  if(p.status!=='active'&&p.status!=='opening')continue;
  if(p.hp<=0){p.status='destroyed';p.resolvedAt=this.time;this.stats.failed++;this.visual('pod-destroy',p);this.announce('降落仓被毁 · 士兵阵亡');for(const id of p.guardianIds){const u=this.entities.get(id);if(u)u.guardianPod=null;}continue;}
  let threat=[...p.guardianIds].some(id=>(this.entities.get(id)?.hp??0)>0);this.hash.query(p,6,b=>{if(b.owner==='zerg'&&b.hp>0&&!this.economicTargets.has(b.id))threat=true;});
  if(threat){p.status='active';p.resolvedAt=null;continue;}
  if(p.status==='active'){p.status='opening';p.resolvedAt=this.time;this.visual('pod-open',p);}
  else if(this.time-(p.resolvedAt??this.time)>=ECONOMY.openingSeconds-1e-8){p.status='rescued';p.resolvedAt=this.time;const u=this.reinforce(p.unitType,p);p.recruitId=u.id;this.stats.rescued++;this.announce(SC2_UNITS[p.unitType].zh+' 已获救，正在归队');}
 }}
 spawnWave(){if(this.scheduledStage!==this.stage)this.prepareStage();const wave=this.waves[this.stageWave];if(!wave)return;this.wave++;this.stageWave++;wave.types.forEach((type,i)=>this.ambientBacklog.push({type,bearing:wave.bearing,at:this.time+i*this.config.entranceSpacing}));this.ambientBacklog.sort((a,b)=>a.at-b.at);this.nextWave=this.stageStartedAt+(this.waves[this.stageWave]?.at??Infinity);this.releaseAmbient();}
 private releaseAmbient(){let slots=Math.max(0,TUNING.enemyCap-this.enemyCount());while(slots-->0&&this.ambientBacklog.length&&this.ambientBacklog[0].at<=this.time+1e-8){const e=this.ambientBacklog.shift()!,base=this.eventPoint(Math.min(12,this.mapHalf*.75)),angle=this.stage===2?(this.stats.ambientSpawned%2?0:Math.PI):e.bearing+(this.stage>=5&&slots%2?Math.PI:0);
  // Distribute a wave along its approach arc; do not stack every attacker on one point.
  const arc=angle+((this.stats.ambientSpawned%9)-4)*.17,range=Math.min(24,this.mapHalf*.9)*(0.86+(this.stats.ambientSpawned%3)*.06);
  const desired=this.nearbyPoint(this.anchor,range,arc);const p=distance(desired,this.anchor)>=8?desired:base;this.addUnit(e.type,'zerg',p.x,p.z);this.stats.ambientSpawned++;}}
 endStage(){if(this.phase!=='battle')return;this.cancelOrder();
  if(this.stage===12&&(!this.hive||this.hive.hp>0||!this.allies().some(u=>u.unitType!=='medivac'))){this.phase='lost';this.announce('未能在期限内摧毁虫巢并保住小队');return;}
  const [m,g]=this.config.reward,f=incomeFactor(this.difficulty);this.clearReceipt={stage:this.stage,minerals:m*f,gas:g*f};this.wallet.minerals+=m*f;this.wallet.gas+=g*f;this.economyTotals.clear.minerals+=m*f;this.economyTotals.clear.gas+=g*f;
  if(this.stage===12){this.phase='won';this.announce('虫巢已摧毁 · 小队撤离成功');return;}
  this.phase='reward';this.rewardRound='building';this.rewardClaimed=false;this.rerolls=0;this.rewards=this.offers(drawRewards(this,this.random,[],this.rewardRound));this.changed();
 }
 private offers(cards:Reward[]){return cards.map(r=>({...r,offerId:`${this.stage}:${++this.offerSerial}:${r.id}`,sold:false}));}
 rerollCost(){return 50+40*this.rerolls;}
 reroll(){if(this.phase!=='reward'||this.rewardClaimed||!spend(this.wallet,{minerals:this.rerollCost(),gas:0}))return false;this.economyTotals.rerolls+=this.rerollCost();this.rewards=this.offers(drawRewards(this,this.random,this.rewards.map(r=>r.id),this.rewardRound,this.rewards));this.rerolls++;this.changed();return true;}
 choose(id:string){if(this.phase!=='reward'||this.rewardClaimed)return false;const r=this.rewards.find(r=>r.offerId===id);if(!r||(this.rewardRound==='building')!==(r.kind==='build')||!eligibleReward(this,r)||!spend(this.wallet,{minerals:r.minerals,gas:r.gas}))return false;
  this.economyTotals.purchases.minerals+=r.minerals;this.economyTotals.purchases.gas+=r.gas;
  if(r.kind==='build'){const type=r.value as BuildingType;this.addBuilding(type);}
  else if(r.kind==='upgrade'){this.buildings.get(Number(r.value))!.upgradeRemaining=FACTORY_TECH_LAB.time;}
  else if(r.kind==='train')this.extraDeliveries.push(r.value as TerranType);
  else if(r.kind==='tech'){this.upgrades.set(r.value,(this.upgrades.get(r.value)??0)+1);for(const u of this.allies())this.refreshStats(u);}
  else {const gains=r.value==='minerals'?[100,0]:r.value==='gas'?[0,50]:r.value==='salvage'?[75,25]:[100,25];this.wallet.minerals+=gains[0];this.wallet.gas+=gains[1];this.economyTotals.cards.minerals+=gains[0];this.economyTotals.cards.gas+=gains[1];}
  r.sold=true;this.changed();return true;
 }
 skipReward(){if(this.phase!=='reward'||this.rewardClaimed)return false;return this.finishRewardRound();}
 private finishRewardRound(){this.rewardClaimed=true;if(this.rewardRound==='building'){this.rewardRound='random';this.rewards=this.offers(drawRewards(this,this.random));this.rewardClaimed=false;this.changed();return true;}return this.nextStage();}
 private nextStage(){this.rewardClaimed=true;this.stage++;this.stageElapsed=0;this.stageStartedAt=this.time;this.phase='battle';this.rerolls=0;this.prepareStage();for(const type of this.extraDeliveries)this.spawnPod(type,undefined,this.nextJob++);this.extraDeliveries=[];this.changed();return true;}
 stim(){if(this.phase!=='battle'||this.paused||!this.upgrades.has('stim'))return false;let used=false;for(const u of this.allies()){if(u.unitType==='marine'&&u.hp>10&&u.stimUntil<=this.time){u.hp-=10;u.stimUntil=this.time+11;used=true;}}this.changed();return used;}
 dash(){if(this.phase!=='battle'||this.paused||this.time<this.dashReady)return false;this.dashUntil=this.time+1.2;this.dashReady=this.time+12;return true;}
 step(){if(this.phase!=='battle'||this.paused)return;const dt=TUNING.step;this.tick++;this.time=this.tick*dt;this.stageElapsed+=dt;
  if(this.scheduledStage!==this.stage)this.prepareStage();const direction=this.updateCommand(dt),mag=Math.hypot(direction.x,direction.z);if(mag>.01){this.anchorMovingFor+=dt;this.anchorStoppedFor=0;}else {this.anchorStoppedFor+=dt;this.anchorMovingFor=0;}if(mag>.01){const speed=TUNING.anchorSpeed*(this.time<this.dashUntil?1.65:1);this.anchor.facing=turn(this.anchor.facing,Math.atan2(direction.x,direction.z),5*dt);translate(this.anchor,{x:direction.x/Math.max(1,mag)*speed*dt,z:direction.z/Math.max(1,mag)*speed*dt},.8,false,this.obstacles,this.sandbox?TUNING.worldHalf:this.mapHalf,this.terrain);}
  if(distance(this.anchor,this.trail.at(-1)!)>.8)this.trail.push({x:this.anchor.x,z:this.anchor.z});
  if(this.trail.length>1200){this.trail.splice(0,200);for(const u of this.entities.values())u.trailIndex=Math.max(0,u.trailIndex-200);}
  this.updateEconomy(dt);this.updateProduction(dt);
  if(!this.sandbox)while(this.eventPlan[this.nextEvent]?.at<=this.stageElapsed){this.spawnEconomic(this.eventPlan[this.nextEvent++].kind);}
  if(this.autoWaves&&this.time>=this.nextWave)this.spawnWave();if(this.ambientBacklog.length)this.releaseAmbient();
  const bodies:Body[]=[...this.entities.values(),...this.pods.filter(p=>p.status==='active'||p.status==='opening'),...[...this.economicTargets.values()].filter(e=>e.status==='active')];if(this.hive&&this.hive.hp>0)bodies.push(this.hive);this.hash.rebuild(bodies);
  for(const u of this.entities.values())this.updateUnit(u,dt);
  this.collisionContacts=this.contacts.resolve(this.entities.values(),this.hash,this.obstacles,this.mapHalf,dt,this.hive,this.terrain);
  for(const fx of this.effects){if(fx.kind==='bile'&&fx.until<=this.time){this.visual('bile-impact',{...fx.end,id:fx.source,hp:0,maxHp:0,armor:0,flying:false,unitRadius:0,owner:'zerg',attributes:[]});this.hash.query(fx.end,3,b=>{if(b.hp>0&&distance(b,fx.end)<=BILE.radius+b.unitRadius)this.hit(b,BILE.damage+b.armor,[],1,'zerg');});}}
  this.effects=this.effects.filter(f=>f.until>this.time);
  this.updatePods();
  this.pickups=this.pickups.filter(p=>{const d=distance(p,this.anchor);if(d<2&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){this.wallet.minerals+=p.minerals;this.wallet.gas+=p.gas;this.economyTotals.drops.minerals+=p.minerals;this.economyTotals.drops.gas+=p.gas;return false;}if(d<6&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){p.x+=(this.anchor.x-p.x)*dt*4;p.z+=(this.anchor.z-p.z)*dt*4;}return true;});
  this.maxStretch=0;let fighters=0;for(const [id,u] of this.entities){if(u.owner==='terran'&&u.hp>0){this.maxStretch=Math.max(this.maxStretch,distance(u,this.anchor));if(u.unitType!=='medivac')fighters++;}if(u.deadAt!==null&&this.time-u.deadAt>1.5){this.entities.delete(id);this.navigation.delete(id);this.detours.delete(id);}}
  if(this.order?.kind==='move'){for(const id of this.movePending)if((this.entities.get(id)?.hp??0)<=0)this.movePending.delete(id);if(this.order.arrived&&!this.movePending.size)this.cancelOrder();}
  this.distancePairs=this.hash.visits;
  if(!fighters){this.phase='lost';this.announce('战斗单位全部阵亡 · 小队失联');}
  else if(this.stageElapsed>=this.duration-1e-8)this.endStage();
  if(this.tick%6===0)this.changed();
 }
 advance(seconds:number){const n=Math.round(seconds/TUNING.step);for(let i=0;i<n;i++)this.step();}
}
