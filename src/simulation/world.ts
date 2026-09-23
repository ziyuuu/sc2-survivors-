import {CONTROL_COMBAT as CONTROL} from '../data/control-tuning';
import {autoTargetScore} from './combat/auto-targeting';
import {RunState} from './run-state';
import {TalentProfile,talentPointsForStage,talentPointsForEndlessMinute} from './progression/talent-profile';
import {ENDLESS,endlessInterval,endlessGrowth} from '../data/endless';
import {expansionProfile,expansionBatch,mainHiveBatch} from '../data/hives';
import {EnemySpecials} from './combat/enemy-specials';
import type {StatusKind} from './combat/statuses';
import {ENEMY_NAMES,bossFor,type SpecialType,type EnemyTier} from '../data/enemies';
import {HEROES,HERO_IDS,heroStats,heroRevivalCost,type HeroId} from '../data/heroes';
import {ELITES,eliteStats,type EliteId} from '../data/elites';
import {MAP_REWARDS} from '../data/rewards';
import type {TerrainQuery} from '../data/map-definition';
import {SC2_UNITS,TERRAN,ZERG,SIEGE,HEAL,BILE,HYDRALISK_MELEE,type UnitType,type TerranType,type ZergType} from '../data/sc2-units';
import {BUILDINGS,FACTORY_TECH_LAB,OBSTACLES,STAGES,TUNING,type BuildingType,type Obstacle} from '../data/game';
import {spend,applyWeaponHit,healBiological} from './rules.mjs';
import {distance,angleDelta,turn,translate,locomote,steerGoal,clearLine,blocked} from './movement/steering';
import {drawRewards,drawReward,drawBossReward,eligibleReward,unlockedReward,rewardPool} from './progression/rewards';
import {stageConfig,stageSchedule,incomeFactor,enemyCountFactor,bossHealthFactor,bossDamageFactor,bossAttackSpeedFactor,enemyPressure,chapterGrowth,eliteGrowth,scaleCounts,type Difficulty} from '../data/stages';
import {CharTerrain} from '../data/terrain';
import {rankStats} from '../data/ranks';
import {ECONOMY,DROPS} from '../data/economy';
import type {Entity,Point,Pod,Body,Building,Reward,Effect,Pickup,VisualEvent,EconomicTarget,SquadOrder,RewardDrop,HeroRecord,HeroCast,ExpansionHive,Fortification} from './types';

export class World extends RunState {
 readonly listeners=new Set<()=>void>();
 terrain?:TerrainQuery;readonly obstacles:Obstacle[];
 private readonly initialTerrain?:TerrainQuery;private readonly endlessTerrain?:TerrainQuery;
 private readonly seed:number;private readonly sandbox:boolean;
 readonly talentProfile:TalentProfile;
 talent(id:string){return this.talentProfile.level(id);}
 get rarityBonus(){return this.talent('rarity_master');}
 private soldierCap(){return 5+this.talent('elite_training');}
 private familyCap(){return 5+2*this.talent('expanded_squad');}
 get rosterCap(){return this.familyCap();}
 private readonly initialUnits:readonly TerranType[];private readonly configuredWaves:boolean;
 private autoWaves:boolean;
 enemySpecials=new EnemySpecials(this);
 get endlessElapsed(){return this.endless?this.time-this.endless.startedAt:0;}
 constructor(options:{seed?:number;waves?:boolean;obstacles?:Obstacle[];initial?:TerranType[];difficulty?:Difficulty;sandbox?:boolean;terrain?:boolean|TerrainQuery;endlessTerrain?:TerrainQuery;talentProfile?:TalentProfile}={}){
  super();this.talentProfile=options.talentProfile??new TalentProfile();this.initialUnits=[...(options.initial??TUNING.initialSquad)];this.configuredWaves=options.waves??true;
  this.seed=options.seed??89241;this.rngState=this.seed;this.autoWaves=options.waves??true;this.sandbox=options.sandbox??false;this.difficulty=options.difficulty??'normal';this.obstacles=options.obstacles??OBSTACLES;this.terrain=typeof options.terrain==='object'?options.terrain:(options.terrain??(!this.sandbox&&options.obstacles===undefined))?new CharTerrain():undefined;this.initialTerrain=this.terrain;this.endlessTerrain=options.endlessTerrain;if(this.terrain?.definition&&options.obstacles===undefined)this.obstacles=[];
  this.initializeRun();
 }
 private initializeRun(){this.terrain?.setStage?.(this.stage);this.initialUnits.forEach((t,i)=>this.addUnit(t,'terran',-i*1.15,(i%2)*1.4));
  if(!this.sandbox){this.addBuilding('barracks',0);for(const u of this.allies()){const p=this.moveGoal(u);u.x=p.x;u.z=p.z;u.prev={...p};}}
  this.prepareStage();
 }
 /** Keep World identity: all controls, map views and listeners refer to this same instance. */
 resetRun(difficulty:Difficulty=this.difficulty){
  Object.assign(this,new RunState());
  this.terrain=this.initialTerrain;this.difficulty=difficulty;this.rngState=this.seed;this.autoWaves=this.configuredWaves;
  this.enemySpecials=new EnemySpecials(this);this.initializeRun();this.changed();
 }
 get config(){if(this.configStage!==this.stage||this.configDifficulty!==this.difficulty){this.stageData=stageConfig(this.stage,this.difficulty);this.configStage=this.stage;this.configDifficulty=this.difficulty;}return this.stageData;}
 get mapHalf(){return this.terrain?.definition?Math.max(this.terrain.definition.width,this.terrain.definition.height):this.sandbox?TUNING.worldHalf:this.config.width/2;}
 get duration(){return this.config.durationSeconds;}
 /** Whole-squad commands are simulation intent; picking and feedback live in the renderer. */
 cancelOrder(){this.order=null;this.movePending.clear();this.commandRoute=null;this.marchDirection={x:0,z:0};}
 private resetCommand(){this.cancelOrder();this.navigation.clear();this.detours.clear();for(const u of this.allies()){u.attackTarget=null;u.thinkAt=0;}this.input={x:0,z:0};}
 private commandPoint(point:Point):Point|null {
  const radius=.9,half=this.mapHalf;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>=half||Math.abs(point.z)>=half)return null;
  const candidates=[{...point}];for(const r of [.5,1,1.5,2,3])for(let i=0;i<16;i++)candidates.push({x:point.x+Math.sin(i*Math.PI/8)*r,z:point.z+Math.cos(i*Math.PI/8)*r});
  for(const p of candidates){if(Math.abs(p.x)+radius>=half||Math.abs(p.z)+radius>=half||blocked(p,radius,this.obstacles)||this.terrain&&!this.terrain.canOccupy(p,radius))continue;
   if(distance(this.anchor,p)<.15||distance(this.anchor,steerGoal(this.anchor,p,radius,this.obstacles,this.terrain,half))>.01)return p;
  }return null;
 }
 issueMove(point:Point){if(this.phase!=='battle'||this.paused||this.requiresEliteChoice)return false;const goal=this.commandPoint(point);if(!goal){this.announce('该位置无法通行');return false;}
  this.resetCommand();this.order={kind:'move',point:goal,arrived:false,issuedAt:this.time};for(const u of this.allies())this.movePending.add(u.id);this.changed();return true;
 }
 private updateCommand(dt:number):Point {
  if(Math.hypot(this.input.x,this.input.z)>.01){if(this.order)this.cancelOrder();return this.input;}
  const order=this.order;if(!order)return this.input;
  const goal=order.point;if(distance(this.anchor,goal)<.12){order.arrived=true;return {x:0,z:0};}
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
 prepareStage(){if(this.endless){this.prepareEndlessRound();return;}this.terrain?.setStage?.(this.stage);const plan=stageSchedule(this.config,this.seed);this.waves=plan.waves;this.specialPlan=plan.specials;this.nextSpecial=0;this.lordWarningPoint=null;this.eventPlan=plan.events;this.stageWave=0;this.nextEvent=0;this.scheduledStage=this.stage;this.nextWave=this.stageStartedAt+(this.waves[0]?.at??Infinity);
  // Flood once per expansion. Events use connected walkable cells, never a clamped wall position.
  if(this.terrain?.connectedLocations)this.spawnCells=this.terrain.connectedLocations(this.anchor,.9,1.4);
  else {
  const cells=new Map<string,Point>(),limit=this.mapHalf-2;
  for(let x=-Math.floor(limit/2)*2;x<=limit;x+=2)for(let z=-Math.floor(limit/2)*2;z<=limit;z+=2)if(!blocked({x,z},1.4,this.obstacles)&&(!this.terrain||this.terrain.canOccupy({x,z},1.4)))cells.set(x+','+z,{x,z});
  const origin=[...cells.values()].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];this.spawnCells=[];
  if(origin){const queue=[origin],seen=new Set([origin.x+','+origin.z]);for(let i=0;i<queue.length;i++){const p=queue[i];this.spawnCells.push(p);for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){const key=(p.x+dx)+','+(p.z+dz),n=cells.get(key);if(n&&!seen.has(key)&&clearLine(p,n,1.4,this.obstacles,this.terrain)){seen.add(key);queue.push(n);}}}}
  }
  this.nextExpansionAt=this.difficulty==='hell'&&this.stage>=4?this.stageStartedAt+20:Infinity;this.hiveWarningPoint=null;
  if(this.stage===12&&!this.hive){const expected=this.terrain?.definition?.hive;const p=expected?this.spawnCells.filter(p=>this.terrain!.canOccupy(p,3)).sort((a,b)=>distance(a,expected)-distance(b,expected))[0]??this.eventPoint():this.spawnCells.reduce((a,b)=>b.z<a.z?b:a,{x:0,z:0}),hp=(this.difficulty==='easy'?9000:12000)*enemyPressure(this.difficulty,12).health;this.hive={id:this.nextId++,...p,hp,maxHp:hp,armor:2,unitRadius:3,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};this.mainHiveNextBatchAt=this.time+12;if(this.autoWaves)this.spawnHiveGarrison(this.hive);}
 }
 /** Move surviving actors to the separately opened endless field without rebuilding them. */
 startEndless(){if(this.phase!=='won'||this.stage!==12||!this.hive||this.hive.hp>0||!this.allies().some(u=>u.unitType!=='medivac'))return false;
  if(this.endlessTerrain&&this.endlessTerrain!==this.terrain){this.terrain=this.endlessTerrain;this.terrain.setStage?.(12);const d=this.terrain.definition,center=d?{x:d.width/2-d.origin[0],z:d.origin[1]-d.height/2}:{x:0,z:0},cells=this.terrain.connectedLocations?.(d?.start??{x:0,z:0},.9,2)??[];const origin=cells.sort((a,b)=>distance(a,center)-distance(b,center))[0]??center;
   for(const [id,u] of this.entities)if(u.owner==='zerg'){this.entities.delete(id);this.statuses.removeTarget(id);}this.expansionHives.clear();this.hive=null;this.economicTargets.clear();this.pickups=[];this.rewardDrops=[];this.effects=[];
   this.anchor={...origin,facing:Math.PI/2};this.trail=[{...origin}];this.navigation.clear();this.detours.clear();for(const u of this.allies()){const p=this.freePosition(u.unitType as TerranType,origin,1.2,12)??origin;u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};u.attackTarget=null;u.pendingTarget=null;u.windup=0;}
  }
  this.endless={round:1,startedAt:this.time,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};
  this.resetCommand();this.paused=false;this.phase='battle';this.stageElapsed=0;this.stageStartedAt=this.time;this.prepareEndlessRound();if(this.endlessTerrain&&this.terrain===this.endlessTerrain){this.placeEndlessFortifications();for(const p of this.pods.filter(p=>['falling','active','opening'].includes(p.status))){const location=this.endlessPodPoint();p.x=location.x;p.z=location.z;}}this.announce('无尽战场 · 守住小队');return true;
 }
 private prepareEndlessRound(){if(this.terrain?.connectedLocations)this.spawnCells=this.terrain.connectedLocations(this.anchor,.9,1.4);const plan=stageSchedule(this.config,this.seed+this.endless!.round*104729,false);this.waves=plan.waves;this.stageWave=0;this.specialPlan=[];this.nextSpecial=0;this.eventPlan=plan.events;this.nextEvent=0;this.scheduledStage=this.stage;this.nextWave=Infinity;this.nextExpansionAt=this.difficulty==='hell'?this.stageStartedAt+20:Infinity;this.hiveWarningPoint=null;}
 private placeEndlessFortifications(){this.fortifications.clear();const sites:[Fortification['kind'],Point][]=[['bunker',{x:-8,z:0}],['bunker',{x:8,z:0}],['bunker',{x:0,z:-8}],['bunker',{x:0,z:8}],['repair',{x:3,z:3}]],allies=this.allies().filter(u=>!u.flying),pods=this.pods.filter(p=>['falling','active','opening'].includes(p.status));
  for(const [kind,offset] of sites){let best:Point|undefined,score=Infinity;const requested={x:this.anchor.x+offset.x,z:this.anchor.z+offset.z},radius=kind==='bunker'?1.15:1.05,forts=[...this.fortifications.values()];
   for(const p of this.spawnCells){const d=distance(p,requested);if(d>=score||distance(p,this.anchor)<(kind==='bunker'?5:3)||forts.some(f=>distance(p,f)<f.unitRadius+radius+2)||allies.some(u=>distance(p,u)<u.unitRadius+radius+1)||pods.some(pod=>distance(p,pod)<pod.unitRadius+radius+2)||this.terrain&&!this.terrain.canOccupy(p,radius))continue;best=p;score=d;}
   if(!best)continue;const hp=kind==='bunker'?900:650;this.fortifications.set(this.nextId,{id:this.nextId++,...best,hp,maxHp:hp,armor:kind==='bunker'?2:1,unitRadius:radius,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',kind,nextActionAt:this.time});
  }
 }
 private endlessPodPoint(){const candidates=this.spawnCells.filter(p=>distance(p,this.anchor)>=4&&distance(p,this.anchor)<=11&&[...this.fortifications.values()].every(f=>f.hp<=0||distance(p,f)>f.unitRadius+3)&&this.pods.every(pod=>!['falling','active','opening'].includes(pod.status)||distance(p,pod)>pod.unitRadius+3));return {...(candidates[Math.floor(this.random()*candidates.length)]??this.eventPoint(4,11))};}
 private updateEndlessSpawns(dt:number){const state=this.endless!;
  for(const source of ['wave','elite','boss'] as const){state.progress[source]=Math.min(1,state.progress[source]+dt/(endlessInterval(source,this.endlessElapsed)*(source==='elite'&&this.difficulty==='easy'?2:1)));if(state.progress[source]<1-1e-8)continue;
   if(source==='wave'){// Preserve the existing on-field cap without accumulating an unbounded queue.
    if(this.ambientBacklog.length>=TUNING.enemyCap)continue;this.spawnWave();state.progress.wave=0;
   }else {if(this.time<state.retry[source])continue;const n=source==='elite'?state.elites:state.bosses,type=ENDLESS.types[n%ENDLESS.types.length],tier=source==='boss'&&n%3===2?'lord':source;
    if(this.spawnSpecial(type,tier)){state.progress[source]=0;}else state.retry[source]=this.time+1;
   }
  }
 }
 eventPoint(min=6,max=Infinity,origin:Point=this.anchor){const candidates=this.spawnCells.filter(p=>distance(p,origin)>=min&&distance(p,origin)<=max);const pool=candidates.length?candidates:this.spawnCells;return {...(pool[Math.floor(this.random()*pool.length)]??{x:0,z:0})};}
 get hiveFrenzy(){return this.expansionHives.size>0;}
 enemyDamageFactor(u:Entity){if(u.owner!=='zerg')return 1;const frenzy=this.hiveFrenzy?(u.enemyTier==='boss'||u.enemyTier==='lord' ? .1 : .2):0;return 1+Math.max(frenzy,this.auraDamage.get(u.id)??0);}
 enemyAttackSpeedFactor(u:Entity){if(u.owner!=='zerg')return 1;const frenzy=this.hiveFrenzy?(u.enemyTier==='boss'||u.enemyTier==='lord' ? .1 : .2):0;return 1+Math.max(frenzy,this.auraAttackSpeed.get(u.id)??0,this.statuses.value(u.id,'bloodlust',this.time));}
 private enemyMoveFactor(u:Entity){return this.hiveFrenzy&&u.owner==='zerg'?(u.enemyTier==='boss'||u.enemyTier==='lord' ? 1.05 : 1.1):1;}
 private expansionPoint(){const r=2.4,candidates=this.spawnCells.filter(p=>distance(p,this.anchor)>=12&&distance(p,this.anchor)<=24&&Math.abs(p.x)+r<this.mapHalf&&Math.abs(p.z)+r<this.mapHalf&&(!this.terrain||this.terrain.canOccupy(p,r))&&!blocked(p,r,this.obstacles)&&!this.pods.some(pod=>['falling','active','opening'].includes(pod.status)&&distance(p,pod)<6)&&![...this.expansionHives.values()].some(h=>distance(p,h)<8)&&(!this.hive||distance(p,this.hive)>8));
  return candidates.length?{...candidates[Math.floor(this.random()*candidates.length)]}:null;
 }
 private hiveSpawnPoint(hive:Body,serial:number){for(let i=0;i<24;i++){const angle=(serial+i)*2.39996,r=hive.unitRadius+1.3+Math.floor(i/8)*.65,p={x:hive.x+Math.sin(angle)*r,z:hive.z+Math.cos(angle)*r};
   if(Math.abs(p.x)+.5>=this.mapHalf||Math.abs(p.z)+.5>=this.mapHalf||blocked(p,.5,this.obstacles)||this.terrain&&!this.terrain.canOccupy(p,.5)||!clearLine(hive,p,.5,this.obstacles,this.terrain)||[...this.entities.values()].some(u=>u.hp>0&&!u.flying&&distance(u,p)<u.unitRadius+.55))continue;return p;
  }return null;}
 private spawnHiveGarrison(hive:Body){const base:ZergType[]=['zergling','zergling','zergling','zergling','zergling','zergling','roach','roach','hydralisk'],factor=this.difficulty==='easy'?.5:enemyPressure(this.difficulty,this.stage).total;
  for(let i=0;i<Math.round(base.length*factor);i++){const type=base[i%base.length],p=this.hiveSpawnPoint(hive,i);if(!p)break;const u=this.addUnit(type,'zerg',p.x,p.z);u.guardOrigin=true;}
 }
 private releaseHiveBatch(hive:Body,pending:ZergType[]){let serial=0;while(pending.length&&this.enemyCount()<TUNING.enemyCap){const p=this.hiveSpawnPoint(hive,serial++);if(!p)break;const u=this.addUnit(pending.shift()!,'zerg',p.x,p.z);u.guardOrigin=true;}return !pending.length;}
 private updateHives(){
  if(this.difficulty==='hell'&&this.stage>=4&&this.nextExpansionAt<Infinity){const profile=expansionProfile(this.stage);
   if(this.time>=this.nextExpansionAt-5&&!this.hiveWarningPoint&&this.expansionHives.size<profile.limit&&this.nextExpansionAt-this.stageStartedAt<=this.duration-30){this.hiveWarningPoint=this.expansionPoint();if(this.hiveWarningPoint)this.announce('扩张虫巢即将出现 · 5 秒');}
   if(this.time>=this.nextExpansionAt-1e-8){if(this.hiveWarningPoint&&this.expansionHives.size<profile.limit&&this.stageElapsed<=this.duration-30){const p=this.hiveWarningPoint,hive:ExpansionHive={id:this.nextId++,...p,hp:profile.hp,maxHp:profile.hp,armor:profile.armor,unitRadius:2.4,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg',stage:this.stage,spawnedAt:this.time,nextBatchAt:this.time+8,batchSerial:0,pending:[],rewarded:false};this.expansionHives.set(hive.id,hive);this.announce('扩张虫巢出现 · 击毁以解除亢奋');}
    this.hiveWarningPoint=null;this.nextExpansionAt+=profile.interval;if(this.nextExpansionAt-this.stageStartedAt>this.duration-30)this.nextExpansionAt=Infinity;
   }
  }
  for(const hive of this.expansionHives.values()){if(hive.hp<=0)continue;if(hive.nextBatchAt<=this.time+1e-8&&!hive.pending.length)hive.pending=expansionBatch(hive.stage,++hive.batchSerial);
   if(hive.pending.length&&this.releaseHiveBatch(hive,hive.pending))hive.nextBatchAt=this.time+expansionProfile(hive.stage).batchInterval;
  }
  if(this.hive&&this.hive.hp>0&&this.mainHiveNextBatchAt<=this.time+1e-8){if(!this.mainHivePending.length)this.mainHivePending=mainHiveBatch(++this.mainHiveBatch);
   if(this.releaseHiveBatch(this.hive,this.mainHivePending))this.mainHiveNextBatchAt=this.time+18;
  }
 }
 private updateFortifications(){if(!this.endless||!this.fortifications.size)return;
  for(const fort of this.fortifications.values()){if(fort.hp<=0||fort.nextActionAt>this.time+1e-8)continue;
   if(fort.kind==='bunker'){let target:Body|undefined,closest=Infinity;this.hash.query(fort,12,b=>{if(b.owner!=='zerg'||b.hp<=0)return;const d=distance(fort,b);if(d>10+b.unitRadius||d>=closest||this.terrain&&!this.terrain.lineOfFire(fort,b,false,b.flying))return;target=b;closest=d;},'zerg');
    fort.nextActionAt=this.time+.8;if(target){this.hit(target,18,[],1,'terran');this.effect('shot',fort,target,.1,.16);this.stats.shots++;}
   }else {const damaged:Body[]=[...this.fortifications.values(),...this.allies().filter(u=>u.attributes.includes('Mechanical'))].filter(b=>b.id!==fort.id&&b.hp>0&&b.hp<b.maxHp&&distance(fort,b)<=6+b.unitRadius&&(!this.terrain||this.terrain.lineOfFire(fort,b)));
    damaged.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);const patient=damaged[0];fort.nextActionAt=this.time+.2;if(patient){const healed=Math.min(patient.maxHp-patient.hp,2.4);patient.hp+=healed;this.stats.healed+=healed;this.effect('heal',fort,patient,.1,.2);}
   }
  }
 }
 private updateAuras(){if(this.time<this.nextAuraUpdate)return;this.nextAuraUpdate=this.time+.25;this.auraArmor.clear();this.auraDamage.clear();this.auraAttackSpeed.clear();
  for(const source of this.entities.values())if(source.hp>0&&source.owner==='zerg'){
   if(source.unitType==='roach'&&source.enemyTier==='elite'&&(source.enemyLevel??1)>=3)this.hash.query(source,5,b=>{if(b.owner!=='zerg'||b.hp<=0||b.attributes.includes('Structure'))return;const target=this.entities.get(b.id);if(!target||target.enemyTier==='boss'||target.enemyTier==='lord'||!clearLine(source,target,0,this.obstacles,this.terrain))return;this.auraArmor.set(target.id,Math.max(this.auraArmor.get(target.id)??0,2));},'zerg');
   if(source.enemyTier==='lord'&&source.lordTrait)this.hash.query(source,6,b=>{if(b.id===source.id||b.owner!=='zerg'||b.hp<=0||b.attributes.includes('Structure'))return;const target=this.entities.get(b.id);if(!target||target.enemyTier==='boss'||target.enemyTier==='lord'||!clearLine(source,target,0,this.obstacles,this.terrain))return;
    if(source.lordTrait==='zeal'){this.auraDamage.set(target.id,Math.max(this.auraDamage.get(target.id)??0,.2));this.auraAttackSpeed.set(target.id,Math.max(this.auraAttackSpeed.get(target.id)??0,.2));}
    if(source.lordTrait==='carapace')this.auraArmor.set(target.id,Math.max(this.auraArmor.get(target.id)??0,3));
    if(source.lordTrait==='regen')target.hp=Math.min(target.maxHp,target.hp+target.maxHp*.0025);
   },'zerg');
  }
 }
 addCorrosionZone(source:number,points:Point[],damage:number){this.corrosionZones.push({source,points:points.map(p=>({...p})),damage:damage*.05,until:this.time+3,nextTick:this.time+.5});}
 private updateCorrosionZones(){this.zoneSlowed.clear();const active=[] as typeof this.corrosionZones;
  for(const zone of this.corrosionZones){if(zone.until<=this.time)continue;active.push(zone);const hits=new Set<number>();
   for(const p of zone.points)this.hash.query(p,3,b=>{if(b.owner==='terran'&&b.hp>0&&!b.flying&&distance(p,b)<=1+b.unitRadius){this.zoneSlowed.add(b.id);hits.add(b.id);}},'terran');
   if(this.time+1e-8>=zone.nextTick){for(const id of hits){const body=this.body(id);if(body&&body.hp>0)this.hit(body,zone.damage,[],1,'zerg',0,1);}zone.nextTick+=.5;}
  }this.corrosionZones=active;
 }
 nearbyPoint(origin:Point,radius:number,angle:number,bodyRadius=.6){for(let n=0;n<24;n++){const a=angle+n*.4,r=radius*(1-Math.floor(n/8)*.23),p={x:origin.x+Math.sin(a)*r,z:origin.z+Math.cos(a)*r};if(Math.abs(p.x)<this.mapHalf-bodyRadius&&Math.abs(p.z)<this.mapHalf-bodyRadius&&!blocked(p,bodyRadius,this.obstacles)&&clearLine(origin,p,bodyRadius,this.obstacles,this.terrain))return p;}return this.eventPoint(1,radius+3,origin);}
 random=()=>{this.rngState=(Math.imul(1664525,this.rngState)+1013904223)>>>0;return this.rngState/4294967296;};
 changed(){this.revision++;for(const fn of this.listeners)fn();}
 announce(text:string){this.notice=text;this.noticeUntil=this.time+7;this.changed();}
 start(){if(this.phase==='menu'&&!this.talentProfile.locked){this.runId=TalentProfile.newRunId();this.phase='battle';if(this.talent('hero_support'))this.acquireHero(this.talentProfile.selectedHero);if(this.talent('self_growth'))this.nextEliteGrowthAt=this.time+(this.talent('self_growth')===1?360:240);if(this.talent('mercenary'))this.nextMercenaryAt=this.time+(this.talent('mercenary')===1?240:120);if(this.talent('tank_support'))this.nextTankSupportAt=this.time+[Infinity,90,60,45][this.talent('tank_support')];if(!this.sandbox)this.updateProduction(0);this.changed();}}
 allies(){const allies:Entity[]=[];for(const u of this.entities.values())if(u.owner==='terran'&&u.hp>0)allies.push(u);return allies;}
 enemyCount(){let n=0;for(const u of this.entities.values())if(u.owner==='zerg'&&u.hp>0)n++;return n;}
 addUnit(unitType:UnitType,owner:'terran'|'zerg',x:number,z:number,rank=1){
  const d=SC2_UNITS[unitType];const occupied=new Set(owner==='terran'?this.allies().filter(a=>a.unitType===unitType).map(a=>a.slot):[]);let slot=0;while(occupied.has(slot))slot++;
  const u:Entity={id:this.nextId++,unitType,owner,x,z,prev:{x,z},
   hp:d.maxHp,maxHp:d.maxHp,armor:d.armor,moveSpeed:d.movementSpeed,attackRange:d.attackRange,weaponDamage:d.attackDamage,weaponCooldown:0,attackPeriod:d.attackPeriod,attackFacing:Math.PI/2,
   attackTarget:null,facing:Math.PI/2,velocity:{x:0,z:0},unitRadius:d.unitRadius*TUNING.unitScale,rank,attributes:[...d.attributes],flying:d.flying,
   slot:owner==='terran'?slot:0,trailIndex:Math.max(0,this.trail.length-1),action:'spawn',mode:'tank',desiredMode:'tank',modeTimer:0,
   windup:0,attackLock:0,pendingTarget:null,lastShotAt:-100,nextShotAt:0,shotInterval:d.attackPeriod,repositionUntil:0,aimStartedAt:null,energy:unitType==='medivac'?HEAL.startEnergy:0,maxEnergy:HEAL.maxEnergy,energyRegen:HEAL.regen,healRate:HEAL.hpPerSecond,healTarget:null,bileCooldown:3,
   guardianPod:null,stimUntil:0,deadAt:null,bornAt:this.time,thinkAt:0,distanceWalked:0};
  this.refreshStats(u,true);if(owner==='zerg'){
   if(!this.sandbox){if(unitType==='zergling')u.hp=u.maxHp=this.config.lingHp;if(unitType==='roach'&&this.stage>=8)u.armor++;if(unitType==='baneling'&&this.stage>=9)u.hp=u.maxHp=35;}
   const chapter=chapterGrowth(this.difficulty,this.stage),pressure=enemyPressure(this.difficulty,this.stage);
   u.maxHp*=chapter.health*pressure.health;u.hp=u.maxHp;u.weaponDamage*=chapter.damage*pressure.damage;u.attackPeriod/=chapter.attackSpeed*pressure.attackSpeed;u.moveSpeed*=pressure.moveSpeed;
  }this.entities.set(u.id,u);if(owner==='terran'&&this.order?.kind==='move')this.movePending.add(u.id);return u;
 }
 spawnSpecial(type:SpecialType,tier:EnemyTier,position?:Point){const scale=tier==='elite'?1.2:1.7,radius=SC2_UNITS[type].unitRadius*TUNING.unitScale*scale;
  const candidates=(this.terrain?.connectedLocations?.(this.anchor,radius,radius)??this.spawnCells).filter(p=>!blocked(p,radius,this.obstacles)&&(!this.terrain||this.terrain.canOccupy(p,radius))&&distance(p,this.anchor)>8);
  const p=position??candidates[Math.floor(this.random()*candidates.length)];if(!p||blocked(p,radius,this.obstacles)||this.terrain&&!this.terrain.canOccupy(p,radius))return undefined;
  const u=this.addUnit(type,'zerg',p.x,p.z);u.enemyTier=tier;u.enemyName=ENEMY_NAMES[tier][type];u.visualScale=scale;u.unitRadius=radius;u.specialReady=this.time+2;
  if(tier==='boss'||tier==='lord'){const data=bossFor(type),pressure=enemyPressure(this.difficulty,this.stage),chapter=this.stage-7,damageFactor=tier==='boss'?bossDamageFactor(this.difficulty,this.stage):(1+Math.max(0,chapter)*.12)*pressure.damage,attackSpeed=tier==='boss'?bossAttackSpeedFactor(this.difficulty,this.stage):(1+Math.max(0,chapter)*.04)*pressure.attackSpeed;
   u.hp=u.maxHp=data.hp*bossHealthFactor(this.difficulty,this.stage)*(tier==='lord'?1+Math.max(0,chapter)*.2:1);u.armor=data.armor;u.weaponDamage=SC2_UNITS[type].attackDamage*2*damageFactor;u.specialDamageMultiplier=damageFactor;u.attackPeriod=SC2_UNITS[type].attackPeriod/attackSpeed;
   if(tier==='lord'){const traits=['zeal','carapace','regen'] as const;u.lordTrait=traits[Math.floor(this.random()*traits.length)];u.enemyLevel=eliteGrowth(this.difficulty,this.stage).level;u.enemyName+=' · '+['I','II','III','IV','V'][u.enemyLevel-1]+'阶领主 · '+({zeal:'狂热',carapace:'甲壳',regen:'再生'})[u.lordTrait];}
  }
  else {const level=eliteGrowth(this.difficulty,this.stage);u.enemyLevel=level.level;u.enemyName+=' · '+['I','II','III','IV','V'][level.level-1];u.hp=u.maxHp=u.maxHp*(type==='roach'?5:3)*level.health;u.armor+=type==='roach'?3:1;u.armor+=level.armor;u.weaponDamage*=1.3*level.damage;u.attackPeriod/=1.1*level.attackSpeed;if(type==='zergling')u.moveSpeed*=1.2;if(type==='roach')u.moveSpeed*=.9;}
  if(this.endless){const level=tier==='elite'?++this.endless.elites:++this.endless.bosses,g=endlessGrowth(level),key=tier==='elite'?'elite':'boss',last=this.endless.last[key],baseDamage=u.weaponDamage;
   u.endlessLevel=level;u.hp=u.maxHp=Math.min(1e100,Math.max(u.maxHp*g.health,(last?.health??0)*ENDLESS.growth.health));
   u.weaponDamage=Math.min(1e100,Math.max(baseDamage*g.damage,(last?.damage??0)*ENDLESS.growth.damage));u.specialDamageMultiplier=(u.specialDamageMultiplier??1)*(u.weaponDamage/baseDamage);
   u.attackPeriod=Math.max(TUNING.step,Math.min(u.attackPeriod/g.attackSpeed,(last?.period??Infinity)/ENDLESS.growth.attackSpeed));
   this.endless.last[key]={health:u.maxHp,damage:u.weaponDamage,period:u.attackPeriod};u.enemyName+=' · 无尽 '+level;
  }
  return u;
 }
 growth(u:Entity){return u.heroId?heroStats(u.rank):u.eliteId?eliteStats(u.eliteId,u.rank):{...rankStats(u.owner==='terran'?u.rank:1),movement:1};}
 refreshStats(u:Entity,fill=false){const d=SC2_UNITS[u.unitType];const old=u.maxHp,r=this.growth(u),friendly=u.owner==='terran',arms=friendly?1+.05*this.talent('advanced_arms'):1,health=friendly?arms*(1+.15*this.talent('super_meat'))*(u.tacticalDirection==='guard'?1+.1*(u.tacticalTier??0):1):1,speed=friendly?arms*(1+.05*this.talent('light_armor'))*(1+.05*this.talent('marathon'))*(u.tacticalDirection==='mobility'?1+.1*(u.tacticalTier??0):1):1,attackSpeed=friendly?arms*(1+.08*this.talent('rapid_attack')):1,range=friendly?1+.04*this.talent('range_master'):1;if(u.heroId){const h=HEROES[u.heroId];u.maxHp=h.hp*r.health*(1+(this.upgrades.get('buff.vitality')??0))*health;u.hp=fill?u.maxHp:Math.min(u.maxHp,u.hp+Math.max(0,u.maxHp-old));u.armor=(h.armor+r.armor)*arms;u.moveSpeed=h.speed*speed;u.weaponDamage=h.damage*r.damage*this.weaponFactor(u);u.attackPeriod=h.period/r.attackSpeed/attackSpeed;u.attackRange=h.range*range;if(u.attributes.includes('Biological')){const oldShield=u.maxShield??0;u.maxShield=u.maxHp*.1*this.talent('bio_shield');u.shield=fill?u.maxShield:Math.min(u.maxShield,(u.shield??0)+Math.max(0,u.maxShield-oldShield));}return;}u.moveSpeed=d.movementSpeed*r.movement*speed;u.turnMultiplier=u.eliteId==='hellion.1'?1.2:1;
  u.maxHp=(d.maxHp+(u.unitType==='marine'&&this.upgrades.has('shield')?10:0))*r.health*(u.owner==='terran'?1+(this.upgrades.get('buff.vitality')??0):1)*health*(u.freeConscript?1+.1*this.talent('conscript_network'):1);
  u.hp=fill?u.maxHp:Math.min(u.maxHp,u.hp+Math.max(0,u.maxHp-old));
  const upgrade=['marine','marauder'].includes(u.unitType)?(this.upgrades.get('infantry')??0):['hellion','tank'].includes(u.unitType)?(this.upgrades.get('vehicle')??0)*(u.unitType==='tank'?2:1):0;
  u.weaponDamage=(d.attackDamage+upgrade)*r.damage*this.weaponFactor(u);
  u.attackRange=(u.mode==='siege'?SIEGE.range:d.attackRange)*range;u.attackPeriod=(u.mode==='siege'?SIEGE.period:d.attackPeriod)/r.attackSpeed/attackSpeed;
  if(u.owner==='terran')u.armor=(d.armor+r.armor)*arms*(u.tacticalDirection==='guard'?1+.1*(u.tacticalTier??0):1);u.maxEnergy=HEAL.maxEnergy*r.energy;u.energyRegen=HEAL.regen*r.energy*(this.upgrades.has('medivac')?2:1);u.healRate=HEAL.hpPerSecond*r.healing*(1+(this.upgrades.get('buff.recovery')??0))*arms;
  if(friendly&&u.attributes.includes('Biological')){const oldShield=u.maxShield??0;u.maxShield=u.maxHp*.1*this.talent('bio_shield');u.shield=fill?u.maxShield:Math.min(u.maxShield,(u.shield??0)+Math.max(0,u.maxShield-oldShield));}
 }
 weaponFactor(u:Entity){return u.owner==='terran'?(1+(this.upgrades.get('buff.weapon')??0))*(1+.05*this.talent('advanced_arms'))*(1+.05*this.talent('weapon_upgrade'))*(1+.1*this.talent('big_firepower'))*(u.tacticalDirection==='assault'?1+.1*(u.tacticalTier??0):1):1;}
 heroEntity(id:HeroId){const record=this.heroes.get(id);return record?.entityId!==null&&record?.entityId!==undefined?this.entities.get(record.entityId):undefined;}
 canAcquireHero(id:HeroId){return (this.heroes.get(id)?.rank??0)<5;}
 acquireHero(id:HeroId){if(!this.canAcquireHero(id))return false;let record=this.heroes.get(id);if(record){record.rank++;const u=this.heroEntity(id);if(u&&u.hp>0){u.rank=record.rank;this.refreshStats(u);}}else {record={id,rank:1,entityId:null,skillReady:this.time,revivePaid:false,awaitingSpawn:true};this.heroes.set(id,record);this.deployHero(record,false);}this.changed();return true;}
 private deployHero(record:HeroRecord,revival:boolean){const pos=this.freePosition('marine',this.anchor);if(!pos)return false;const u=this.addUnit('marine','terran',pos.x,pos.z,record.rank);u.heroId=record.id;u.modelKey=HEROES[record.id].model;u.slot=100+HERO_IDS.indexOf(record.id);u.unitRadius=.45*TUNING.unitScale;this.refreshStats(u,true);record.entityId=u.id;record.awaitingSpawn=false;record.revivePaid=false;if(revival)record.skillReady=this.time+HEROES[record.id].cooldown;return true;}
 revivalCost(rank:number){const base=heroRevivalCost(rank),factor=1-.1*this.talent('permanent_discount');return factor===1?base:{minerals:Math.max(1,Math.ceil(base.minerals*factor)),gas:Math.max(1,Math.ceil(base.gas*factor))};}
 canReviveHero(id:HeroId){const h=this.heroes.get(id),cost=h?this.revivalCost(h.rank):null;return this.phase==='reward'&&!!h&&!h.revivePaid&&!h.awaitingSpawn&&!(this.heroEntity(id)?.hp)&&this.wallet.minerals>=cost!.minerals&&this.wallet.gas>=cost!.gas;}
 reviveHero(id:HeroId){if(!this.canReviveHero(id))return false;const h=this.heroes.get(id)!,cost=this.revivalCost(h.rank);if(!spend(this.wallet,cost))return false;h.revivePaid=true;this.economyTotals.purchases.minerals+=cost.minerals;this.economyTotals.purchases.gas+=cost.gas;this.changed();return true;}
 private deployPendingHeroes(newStage=false){for(const h of this.heroes.values()){if(newStage&&h.revivePaid)h.awaitingSpawn=true;if(h.awaitingSpawn)this.deployHero(h,h.revivePaid);}}
 private heroTarget(id:HeroId){const u=this.heroEntity(id);if(!u||u.hp<=0)return;
  let best:Body|undefined,score=Infinity;
  this.hash.query(u,HEROES[id].skillRange+3,b=>{if(!this.validHeroTarget(id,u,b))return;
   const s=autoTargetScore(u,b,this.marchDirection,true,this.economicTargets.has(b.id));if(s<score){score=s;best=b;}
  },'zerg');return best;
 }
 private validHeroTarget(id:HeroId,u:Entity,target:Body){return target.hp>0&&this.targetAllowed(u,target)&&this.edgeDistance(u,target)<=HEROES[id].skillRange&&this.hasAttackLine(u,target)&&(id!=='nova'||target.attributes.includes('Biological'));}
 canCastHero(id:HeroId){const h=this.heroes.get(id);return this.phase==='battle'&&!this.paused&&!this.requiresEliteChoice&&!!h&&this.time+1e-8>=h.skillReady&&!this.heroCasts.some(c=>c.hero===id)&&!!this.heroTarget(id);}
 castHero(id:HeroId){if(!this.canCastHero(id))return false;const h=this.heroes.get(id)!,u=this.heroEntity(id)!,target=this.heroTarget(id)!,data=HEROES[id];h.skillReady=this.time+data.cooldown*Math.max(.5,1-.08*this.talent('skill_recovery'));u.lastSkillAt=this.time;const cast:HeroCast={id:this.nextId++,hero:id,source:u.id,target:target.id,origin:{x:u.x,z:u.z},point:{x:target.x,z:target.z},at:this.time+data.delay,damage:data.skillDamage*heroStats(h.rank).skill};this.heroCasts.push(cast);this.resolveHeroCasts();this.changed();return true;}
 private resolveHeroCasts(){const pending:HeroCast[]=[];for(const c of this.heroCasts){if(c.at>this.time+1e-8){pending.push(c);continue;}const source=this.entities.get(c.source),target=this.body(c.target),data=HEROES[c.hero];
   if(c.hero==='nova'){if(source&&source.hp>0&&target&&this.validHeroTarget(c.hero,source,target)){this.hit(target,c.damage,[],1,'terran',0,1);this.effect('hero-line',source,target,.1,.16);}continue;}
   if(c.hero==='tychus'){this.hash.query(c.point,data.radius+3,b=>{if(b.hp>0&&b.owner==='zerg'&&distance(b,c.point)<=data.radius+b.unitRadius&&(!this.terrain||this.terrain.walkLine(c.point,b,0)))this.hit(b,c.damage,[],1,'terran',0,1);},'zerg');if(source)this.effect('explosion',source,c.point,data.radius,.6);continue;}
   const angle=Math.atan2(c.point.x-c.origin.x,c.point.z-c.origin.z),end={x:c.origin.x+Math.sin(angle)*data.length,z:c.origin.z+Math.cos(angle)*data.length};
   this.hash.query(c.origin,data.length+3,b=>{const dx=b.x-c.origin.x,dz=b.z-c.origin.z,along=dx*Math.sin(angle)+dz*Math.cos(angle),side=Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle));if(b.hp>0&&b.owner==='zerg'&&along>=0&&along<=data.length+b.unitRadius&&side<=data.width/2+b.unitRadius&&(!this.terrain||this.terrain.lineOfFire(c.origin,b,false,b.flying)))this.hit(b,c.damage,[],1,'terran',0,1);},'zerg');if(source)this.effect('hero-line',source,end,data.width/2,.2);
  }this.heroCasts=pending;
 }
 eliteOwned(id:EliteId){return this.allies().find(u=>u.eliteId===id);}
 canAcquireElite(id:EliteId){const owned=this.eliteOwned(id);return !this.pendingElites.includes(id)&&(owned?owned.rank<5:this.ordinaryUnits(ELITES[id].family).length>0||[...this.buildings.values()].some(b=>this.buildingCanTrain(b,ELITES[id].family)));}
 eliteCandidates(id:EliteId){return this.ordinaryUnits(ELITES[id].family).filter(u=>this.ordinaryCapacity(ELITES[id].family)-(this.soldierCap()-u.rank)>=this.reservedRanks(ELITES[id].family));}
 get eliteChoice(){return this.pendingElites.find(id=>this.eliteCandidates(id).length>0);}
 get requiresEliteChoice(){return !!this.eliteChoice;}
 acquireElite(id:EliteId){if(!this.canAcquireElite(id))return false;const owned=this.eliteOwned(id);if(owned){owned.rank++;this.refreshStats(owned);}else if(this.familyUnits(ELITES[id].family).length<this.familyCap()){
  const type=ELITES[id].family,pos=this.freePosition(type,this.anchor);if(!pos)return false;
  const u=this.addUnit(type,'terran',pos.x,pos.z);u.eliteId=id;u.modelKey=ELITES[id].model;u.specialReady=this.time+15;this.refreshStats(u);this.announce(ELITES[id].name+' · 已加入队伍');
 }else {this.pendingElites.push(id);this.announce(ELITES[id].name+' · 选择替换队员；已付费增援优先保留');}this.changed();return true;}
 replaceWithElite(id:EliteId,targetId:number){if(!this.pendingElites.includes(id)||!this.eliteCandidates(id).some(u=>u.id===targetId))return false;const u=this.entities.get(targetId)!;u.eliteId=id;u.rank=1;u.modelKey=ELITES[id].model;u.specialReady=this.time+15;this.refreshStats(u);this.pendingElites=this.pendingElites.filter(e=>e!==id);this.changed();return true;}
 private attackHit(u:Entity,target:Body,damage:number,bonuses:{attribute:string;amount:number}[],hits=1){const factor=(u.eliteId==='marine.2'&&target.attributes.includes('Armored')?1.25:1)*this.enemyDamageFactor(u),crit=u.owner==='terran'&&this.random()<.05*this.talent('headshot')?1.5:1,built=u.owner==='terran'?1+.1*this.talent('advantage_army'):1,before=target.hp,penetration=u.owner==='zerg'&&u.unitType==='hydralisk'&&(u.enemyTier==='elite'||u.enemyTier==='lord')&&u.enemyLevel&&u.enemyLevel>=3?[0,0,.25,.35,.4][u.enemyLevel-1]:0;this.hit(target,damage*factor*crit,bonuses.map(b=>({...b,amount:b.amount*factor*crit*built})),hits*(u.owner==='terran'&&u.mode!=='siege'?1+this.talent('apm_master'):1),u.owner,.5,penetration,u.id);
  const e=this.entities.get(target.id);if(e&&e.hp>0&&u.eliteId==='marauder.1'){e.slowUntil=this.time+1.5;e.slowFactor=e.enemyTier==='boss'?.15:.3;}
  if(e&&e.hp>0&&u.owner==='zerg'&&u.unitType==='roach'&&(u.enemyTier==='elite'||u.enemyTier==='lord')&&(u.enemyLevel??1)>=2){this.applyStatus(e,u,'acidArmor',[0,1,1.5,2,3][(u.enemyLevel??1)-1],4);}
  if(e&&e.hp>0&&u.eliteId==='hellion.2'){const key=u.id+':'+target.id,old=this.burns.get(key);this.burns.set(key,{source:u.id,target:target.id,damage:(before-target.hp)*.2,next:old?.next??this.time+1,until:this.time+3});}
  if(u.eliteId==='marauder.2'&&this.time>=(u.specialReady??0)&&target.hp>0){u.specialReady=this.time+15;this.hit(target,damage*3,bonuses.map(b=>({...b,amount:b.amount*3})),hits,u.owner);this.effect('explosion',u,target,.6,.35);}
 }
 private updateBurns(){for(const [key,b] of this.burns){const target=this.entities.get(b.target);if(!target||target.hp<=0){this.burns.delete(key);continue;}while(b.next<=this.time+1e-8&&b.next<=b.until+1e-8){this.hit(target,b.damage+target.armor,[],1,'terran',0);b.next+=1;}if(this.time>=b.until)this.burns.delete(key);}}
 private updateElite(u:Entity,dt:number){if(u.eliteId==='marine.1'&&u.stimUntil>this.time)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.01*dt);if(u.eliteId==='tank.1'){if(u.mode==='siege'&&u.modeTimer<=0){u.siegeSince??=this.time;u.attackRange=SIEGE.range+Math.min(3,Math.floor((this.time-u.siegeSince)/3));}else {u.siegeSince=undefined;u.attackRange=u.mode==='siege'?SIEGE.range:SC2_UNITS.tank.attackRange;}}}
 activeBatches(){return [...new Map([...this.buildings.values()].flatMap(b=>b.queue).map(j=>[j.id,j])).values()];}
 private reservedRanks(type:TerranType){return this.activeBatches().filter(j=>j.unitType===type).reduce((n,j)=>n+j.quantity,0)+this.pods.filter(p=>p.unitType===type&&['falling','active','opening'].includes(p.status)).reduce((n,p)=>n+p.passengers.filter(c=>c.status==='waiting').length,0)+this.extraDeliveries.filter(t=>t===type).length;}
 familyUnits(type:TerranType){return this.allies().filter(u=>u.unitType===type&&!u.heroId&&!u.temporary);}
 ordinaryUnits(type:TerranType){return this.familyUnits(type).filter(u=>!u.eliteId);}
 ordinaryCapacity(type:TerranType){const units=this.ordinaryUnits(type),cap=this.soldierCap();return (this.familyCap()-this.familyUnits(type).length)*cap+units.reduce((n,u)=>n+cap-u.rank,0);}
 private evolutionCapacity(type:TerranType){if(!this.talent('star_warrior')||this.ordinaryCapacity(type)>0)return 0;const saved=this.evolution.get(type),target=saved&&this.entities.get(saved.targetId);return target&&target.hp>0&&target.rank>=5&&(target.tacticalTier??0)<5?7-saved.bank:0;}
 availableCapacity(type:TerranType){return Math.max(0,this.ordinaryCapacity(type)+this.evolutionCapacity(type)-this.reservedRanks(type));}
 selectEvolution(id:number,direction:'assault'|'guard'|'mobility'){const u=this.entities.get(id);if(this.phase!=='reward'||!this.talent('star_warrior')||!u||u.hp<=0||u.owner!=='terran'||u.heroId||u.eliteId||u.temporary||u.rank<5||!TERRAN.includes(u.unitType as TerranType))return false;const type=u.unitType as TerranType,old=this.evolution.get(type);this.evolution.set(type,{targetId:id,direction,bank:old?.targetId===id?old.bank:0});u.tacticalDirection=direction;this.refreshStats(u);this.changed();return true;}
 private evolvePassenger(type:TerranType){if(this.ordinaryCapacity(type)>0)return null;const plan=this.evolution.get(type),u=plan&&this.entities.get(plan.targetId);if(!plan||!u||u.hp<=0||u.rank<5||(u.tacticalTier??0)>=5)return null;plan.bank++;if(plan.bank>=7){plan.bank=0;u.tacticalTier=(u.tacticalTier??0)+1;u.tacticalDirection=plan.direction;this.refreshStats(u);this.announce(SC2_UNITS[type].zh+' · 战术精英 '+['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][u.tacticalTier-1]);}return u;}
 canRecruit(type:TerranType,rank:number){const units=this.ordinaryUnits(type),gain=this.familyUnits(type).length<this.familyCap()?rank:rank-Math.min(...units.map(u=>u.rank));return gain>0&&gain<=this.availableCapacity(type);}
 private freePosition(type:TerranType,origin:Point,min=.8,max=8){const radius=SC2_UNITS[type].unitRadius*TUNING.unitScale,air=SC2_UNITS[type].flying;
  for(let r=min;r<=max;r+=.5)for(let i=0;i<20;i++){const p={x:origin.x+Math.sin(i*Math.PI/10)*r,z:origin.z+Math.cos(i*Math.PI/10)*r};if(Math.abs(p.x)+radius>=this.mapHalf||Math.abs(p.z)+radius>=this.mapHalf||!air&&!clearLine(origin,p,radius,this.obstacles,this.terrain)||[...this.entities.values()].some(u=>u.hp>0&&u.flying===air&&distance(u,p)<u.unitRadius+radius+.12)||!air&&this.pods.some(pod=>['active','opening'].includes(pod.status)&&distance(pod,p)<pod.unitRadius+radius+.12)||!air&&[...this.fortifications.values()].some(f=>distance(f,p)<f.unitRadius+radius+.3))continue;return p;}return null;
 }
 grantVeteran(type:TerranType,rank:3|5){if(!this.canRecruit(type,rank))return false;const units=this.ordinaryUnits(type);
  if(this.familyUnits(type).length===this.familyCap()){const lowest=units.sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];lowest.rank=rank;this.refreshStats(lowest);return true;}
  const p=this.freePosition(type,this.anchor);if(!p)return false;this.addUnit(type,'terran',p.x,p.z,rank);return true;
 }
 reinforce(type:TerranType,p:Point){const same=this.ordinaryUnits(type),extra=this.talent('skilled_troop')&&this.ordinaryCapacity(type)>this.reservedRanks(type)&&this.random()<[0,.03,.06,.1][this.talent('skilled_troop')]?1:0;
  if(this.familyUnits(type).length<this.familyCap())return this.addUnit(type,'terran',p.x,p.z,Math.min(this.soldierCap(),1+extra));
  same.sort((a,b)=>a.rank-b.rank||a.id-b.id);const lowest=same[0];if(lowest.rank<this.soldierCap()){lowest.rank=Math.min(this.soldierCap(),lowest.rank+1+extra);this.refreshStats(lowest);}return lowest;
 }
 private classroom(u:Entity,type:TerranType){if(!['marine','marauder'].includes(type)||!this.talent('elite_classroom')||this.random()>=.15*this.talent('elite_classroom'))return;
  const pool=Object.values(ELITES).filter(e=>e.family===type&&!this.eliteOwned(e.id)&&this.eliteCandidates(e.id).some(candidate=>candidate.id===u.id));
  if(pool.length){const chosen=pool[Math.floor(this.random()*pool.length)];u.eliteId=chosen.id;u.rank=1;u.modelKey=chosen.model;u.specialReady=this.time+15;this.refreshStats(u);this.announce(chosen.name+' · 兵营培训完成');}
  else if(u.rank<5&&this.ordinaryCapacity(type)-this.reservedRanks(type)>=5-u.rank){u.rank=5;this.refreshStats(u);}
 }
 capacity(type:TerranType){return this.availableCapacity(type)>0;}
 productionCost=(type:TerranType)=>{const d=SC2_UNITS[type];const factor=(this.upgrades.has('discount')?.85:1)*(1-.1*this.talent('permanent_discount'));return {minerals:Math.max(1,Math.ceil(d.mineralCost*factor)),gas:d.gasCost?Math.max(1,Math.ceil(d.gasCost*factor)):0};};
 buildingsOf(type:BuildingType){return [...this.buildings.values()].filter(b=>b.type===type);}
 addBuilding(type:BuildingType,remaining=0){const inheritedLab=type==='factory'&&this.talent('instant_tech')>0&&this.buildingsOf('factory').some(b=>b.techLab)&&this.random()<Math.min(.99,.33*this.talent('instant_tech'));const b:Building={id:this.nextBuilding++,type,remaining,queue:[],techLab:inheritedLab,upgradeRemaining:null};this.buildings.set(b.id,b);return b;}
 unlockMarauder(){if(this.upgrades.has('marauder'))return false;this.upgrades.set('marauder',1);this.groupNext.barracks='marauder';this.productionPlan=null;return true;}
 upgradeFactory(id:number){const b=this.buildings.get(id);if(!b||b.type!=='factory'||b.techLab)return false;b.techLab=true;b.upgradeRemaining=null;this.groupNext.factory='tank';this.productionPlan=null;return true;}
 buildingCanTrain(b:Building,type:TerranType){return b.remaining<=0&&BUILDINGS[b.type].types.includes(type)&&(type!=='tank'||b.techLab)&&(type!=='marauder'||this.upgrades.has('marauder'));}
 private unresolved(type:TerranType){return this.pods.some(p=>p.unitType===type&&['falling','active','opening'].includes(p.status))||this.extraDeliveries.includes(type);}
 productionIntent(b:Building){const types=b.type==='barracks'?['marauder','marine'] as TerranType[]:b.type==='factory'?['tank','hellion'] as TerranType[]:['medivac'] as TerranType[],preferred=this.groupNext[b.type];
  return [preferred,...types.filter(t=>t!==preferred)].find(t=>this.buildingsOf(b.type).some(b=>this.buildingCanTrain(b,t))&&this.capacity(t)&&!this.unresolved(t));
 }
 private batchPlan(group:BuildingType){if(this.activeBatches().some(j=>j.group===group))return null;const first=this.buildingsOf(group)[0];if(!first)return null;const type=this.productionIntent(first);if(!type)return null;const participants=this.buildingsOf(group).filter(b=>this.buildingCanTrain(b,type)&&!b.queue.length).slice(0,this.availableCapacity(type));if(!participants.length)return null;const c=this.productionCost(type);return {group,unitType:type,buildingId:participants[0].id,buildingIds:participants.map(b=>b.id),quantity:participants.length,cost:{minerals:c.minerals*participants.length,gas:c.gas*participants.length}};}
 buildingFor(type:TerranType){return [...this.buildings.values()].find(b=>this.buildingCanTrain(b,type));}
 canTrain=(type:TerranType,buildingId?:number)=>{const b=buildingId===undefined?this.buildingFor(type):this.buildings.get(buildingId),c=this.productionCost(type);return !!b&&this.buildingCanTrain(b,type)&&!this.activeBatches().some(j=>j.group===b.type)&&!this.unresolved(type)&&this.capacity(type)&&this.wallet.minerals>=c.minerals&&this.wallet.gas>=c.gas;};
 build(type:BuildingType){const d=BUILDINGS[type],factor=(1-.1*this.talent('permanent_discount'))*(1-.15*this.talent('frugal_build')),price={minerals:Math.max(1,Math.ceil(d.minerals*factor)),gas:d.gas?Math.max(1,Math.ceil(d.gas*factor)):0},free=this.talent('free_house')>0&&this.random()<.2*this.talent('free_house'),double=!free&&this.talent('double_build')>0&&this.random()<.2*this.talent('double_build')&&this.wallet.minerals>=price.minerals*2&&this.wallet.gas>=price.gas*2,cost={minerals:free?0:price.minerals*(double?2:1),gas:free?0:price.gas*(double?2:1)};if(!spend(this.wallet,cost))return false;this.addBuilding(type);if(double)this.addBuilding(type);this.economyTotals.purchases.minerals+=cost.minerals;this.economyTotals.purchases.gas+=cost.gas;this.changed();return true;}
 private startBatch(type:TerranType,ids:number[]){const participants=ids.map(id=>this.buildings.get(id)).filter((b):b is Building=>!!b&&this.buildingCanTrain(b,type)&&!b.queue.length).slice(0,this.availableCapacity(type));if(!participants.length||this.unresolved(type)||this.activeBatches().some(j=>j.group===participants[0].type))return false;
  const c=this.productionCost(type),paid={minerals:c.minerals*participants.length,gas:c.gas*participants.length};if(!spend(this.wallet,paid))return false;
  const job={id:this.nextJob++,unitType:type,quantity:participants.length,buildingIds:participants.map(b=>b.id),group:participants[0].type,remaining:SC2_UNITS[type].productionTime,paid};for(const b of participants)b.queue.push(job);
  this.groupNext[job.group]=type==='marine'&&this.upgrades.has('marauder')?'marauder':type==='marauder'?'marine':type==='tank'?'hellion':type==='hellion'&&this.buildingsOf('factory').some(b=>b.techLab)?'tank':type;
  this.stats.started+=job.quantity;this.economyTotals.production.minerals+=paid.minerals;this.economyTotals.production.gas+=paid.gas;this.changed();return true;
 }
 queue(type:TerranType,buildingId?:number){if(!this.canTrain(type,buildingId))return false;return this.startBatch(type,buildingId!==undefined?[buildingId]:this.buildingsOf(this.buildingFor(type)!.type).filter(b=>this.buildingCanTrain(b,type)).map(b=>b.id));}
 private flushDeliveries(){if(this.phase!=='battle')return;for(const type of TERRAN){if(this.pods.some(p=>p.unitType===type&&['falling','active','opening'].includes(p.status)))continue;const count=this.extraDeliveries.filter(t=>t===type).length;if(count){this.extraDeliveries=this.extraDeliveries.filter(t=>t!==type);this.spawnPod(type,undefined,this.nextJob++,count);}}}
 updateProduction(dt:number){for(const b of this.buildings.values())if(b.remaining>0)b.remaining=Math.max(0,b.remaining-dt);
  const marauder=this.upgrades.has('marauder'),tank=this.buildingsOf('factory').some(b=>b.techLab);if(marauder&&!this.groupUnlocks.marauder)this.groupNext.barracks='marauder';if(tank&&!this.groupUnlocks.tank)this.groupNext.factory='tank';this.groupUnlocks={marauder,tank};
  for(const job of this.activeBatches()){job.remaining-=dt;if(job.remaining>1e-8)continue;for(const b of this.buildings.values())b.queue=b.queue.filter(j=>j.id!==job.id);this.stats.produced+=job.quantity;for(let i=0;i<job.quantity;i++)this.extraDeliveries.push(job.unitType);}
  this.flushDeliveries();if(this.sandbox)return;
  const groups:BuildingType[]=['barracks','factory','starport'];this.productionPlan=null;
  for(let n=0;n<groups.length;n++){
   const index=(this.productionCursor+n)%groups.length,plan=this.batchPlan(groups[index]);if(!plan)continue;
   if(this.startBatch(plan.unitType,plan.buildingIds)){this.productionCursor=(index+1)%groups.length;n=-1;continue;}
   this.productionPlan=plan;break;
  }
  const reserved=this.productionPlan;if(reserved)for(const group of groups){const other=this.batchPlan(group);if(!other||other.group===reserved.group)continue;if(Math.max(0,this.wallet.minerals-reserved.cost.minerals)+1e-8>=other.cost.minerals&&Math.max(0,this.wallet.gas-reserved.cost.gas)+1e-8>=other.cost.gas)this.startBatch(other.unitType,other.buildingIds);}
 }
 podPurpose(type:TerranType,count=1){const units=this.ordinaryUnits(type),added=Math.min(count,this.familyCap()-this.familyUnits(type).length),promoted=Math.min(count-added,Math.max(0,this.ordinaryCapacity(type)-added));return [added?'新增 '+added:'',promoted?'晋升 '+promoted:'',this.evolutionCapacity(type)?'战术精英进化':''].filter(Boolean).join(' / ')||'培养已满';}
 spawnPod(type:TerranType,position?:Point,jobId=0,quantity=1,freeConscript=false){const p=position??(this.endless&&this.terrain===this.endlessTerrain?this.endlessPodPoint():this.eventPoint(this.stage<=3?7:14,this.stage<=3?13:32)),c=this.config;this.nextGuardCounts=scaleCounts(STAGES[this.stage-1].guards,enemyCountFactor(this.difficulty)*enemyPressure(this.difficulty,this.stage).guards,this.guardRemainders,this.difficulty!=='easy');
  const pod:Pod={number:++this.podSerial,id:this.nextId++,...p,hp:c.podHp,maxHp:c.podHp,armor:TUNING.podArmor,unitRadius:1.25,flying:false,attributes:['Armored','Structure'],owner:'terran',unitType:type,
   createdAt:this.time,landedAt:this.time+ECONOMY.landingSeconds,guardianIds:new Set(),guardTypes:ZERG.flatMap(t=>Array<ZergType>(this.nextGuardCounts![t]).fill(t)),status:'falling',resolvedAt:null,recruitId:null,jobId,stage:this.stage,passengers:Array.from({length:quantity},()=>({status:'waiting',entityId:null})),nextExitAt:0,freeConscript};this.pods.push(pod);
  this.announce(SC2_UNITS[type].zh+' 增援即将落地');return pod;
 }
 landPod(p:Pod){p.status='active';p.landedAt=this.time;const radius=p.stage<=3?4:p.stage<=8?6:8;
  p.guardTypes.forEach((t,i)=>{const pos=this.nearbyPoint(p,radius,i/p.guardTypes.length*Math.PI*2),e=this.addUnit(t,'zerg',pos.x,pos.z);if(t==='zergling'){e.hp=e.maxHp=stageConfig(p.stage,this.difficulty).lingHp;}e.guardianPod=p.id;e.guardOrigin=true;p.guardianIds.add(e.id);});
  this.visual('pod-land',p);this.announce(SC2_UNITS[p.unitType].zh+' 降落仓遭到围攻');
 }
 spawnEconomic(kind:'egg'|'drone',position?:Point){const p=position??this.eventPoint(5),hp=kind==='egg'?ECONOMY.eggHp:ECONOMY.droneHp;
  const target:EconomicTarget={id:this.nextId++,...p,origin:{...p},hp,maxHp:hp,armor:0,unitRadius:kind==='egg'?.65:.55,attributes:kind==='egg'?['Biological','Structure']:['Light','Biological'],owner:'zerg',flying:false,kind,createdAt:this.time,expiresAt:kind==='egg'?this.time+ECONOMY.eggSeconds:null,resolvedAt:null,status:'active',facing:0};this.economicTargets.set(target.id,target);if(kind==='egg')this.announce('发现被困 SCV · 30 秒内击破虫卵');return target;
 }
 updateEconomy(dt:number){if(!this.sandbox){const f=incomeFactor(this.difficulty)*(1+.15*this.talent('mining_master')),m=(ECONOMY.passive.minerals+this.scvs*ECONOMY.perScv.minerals)*dt*f,g=(ECONOMY.passive.gas+this.scvs*ECONOMY.perScv.gas)*dt*f;this.wallet.minerals+=m;this.wallet.gas+=g;this.economyTotals.passive.minerals+=m;this.economyTotals.passive.gas+=g;}
  for(const e of this.economicTargets.values()){if(e.status!=='active')continue;
   if(e.kind==='egg'&&this.time>=e.expiresAt!-1e-8){e.status='expired';e.hp=0;e.resolvedAt=this.time;this.stats.scvsLost++;this.visual('egg-expired',e);this.announce('SCV 未能获救');}
   else if(e.kind==='drone'){const goal={x:e.origin.x+Math.sin(this.time*.24+e.id)*1.2,z:e.origin.z+Math.cos(this.time*.24+e.id)*1.2},dx=goal.x-e.x,dz=goal.z-e.z;e.facing=turn(e.facing,Math.atan2(dx,dz),dt*3);translate(e,{x:dx*dt,z:dz*dt},e.unitRadius,false,this.obstacles,this.mapHalf,this.terrain);}
  }
 }
 body(id:number|null):Body|undefined {if(id===null)return;const econ=this.economicTargets.get(id);return this.entities.get(id)??(econ?.status==='active'?econ:undefined)??this.pods.find(p=>p.id===id&&(p.status==='active'||p.status==='opening'))??this.expansionHives.get(id)??this.fortifications.get(id)??(this.hive?.id===id?this.hive:undefined);}
 targetAllowed(u:Entity,b:Body){return b.hp>0&&b.owner!==u.owner&&(!b.flying||SC2_UNITS[u.unitType].targetType==='both');}
 edgeDistance(a:Body,b:Body){return Math.max(0,distance(a,b)-a.unitRadius-b.unitRadius);}
 hasAttackLine(u:Entity,b:Body){return !this.terrain||this.attackLines.clear(this.terrain,this.stage,u,b);}
 canFireAt(u:Entity,b:Body,tolerance=0){const d=this.edgeDistance(u,b);return u.unitType!=='medivac'&&this.targetAllowed(u,b)&&d<=u.attackRange+tolerance&&d>=(u.mode==='siege'?SIEGE.minRange:0)&&this.hasAttackLine(u,b);}
 findTarget(u:Entity,range:number,defenseOnly=false){let best:Body|undefined,score=Infinity;
  this.hash.query(u,range+3,b=>{
   if(!this.targetAllowed(u,b)||defenseOnly&&this.economicTargets.has(b.id))return;
   let s=distance(u,b);const edge=Math.max(0,s-u.unitRadius-b.unitRadius),inRange=edge<=u.attackRange&&edge>=(u.mode==='siege'?SIEGE.minRange:0);
   if(defenseOnly&&!inRange)return;
   if(u.owner==='terran'){
    if(u.mode==='siege'&&edge<SIEGE.minRange)return;
    s=autoTargetScore(u,b,this.marchDirection,inRange,this.economicTargets.has(b.id));
   }
   if(u.guardianPod&&b.id===u.guardianPod)s-=u.id%3===0?0:8;
   // Expensive terrain sampling only matters when this candidate can beat the current choice.
   if(s<score&&this.hasAttackLine(u,b)){score=s;best=b;}
  },u.owner==='terran'?'zerg':'terran');return best;
 }
 applyStatus(target:Entity,source:Entity|number,kind:StatusKind,value:number,duration:number){const hostile=typeof source==='number'||source.owner==='zerg',id=typeof source==='number'?source:source.id,strength=this.difficulty==='easy'&&hostile?.7:1;this.statuses.apply(target.id,id,kind,value*strength,duration,this.time);}
 private qualifiedKill(sourceId?:number){const source=sourceId===undefined?undefined:this.entities.get(sourceId);if(!source||source.owner!=='terran'||source.hp<=0||source.temporary)return;
  if(!source.heroId&&!source.eliteId&&source.rank<this.soldierCap()){
   const taught=this.allies().some(e=>e.eliteId&&e.unitType===source.unitType),chance=.01*(this.talent('experience_summary')+this.talent('battle_review'))+(taught?.03*this.talent('teach_experience'):0);
   if(chance>0&&this.random()<chance){source.rank++;this.refreshStats(source);}
  }
  if(this.talent('reinforcement')&&this.time>=this.nextFreePodAt&&this.random()<.01*this.talent('reinforcement')){const pool=TERRAN.filter(type=>this.capacity(type));if(pool.length){this.spawnPod(pool[Math.floor(this.random()*pool.length)],undefined,this.nextJob++,1,true);this.nextFreePodAt=this.time+60;}}
  if(this.talent('proliferate')&&this.allies().filter(u=>u.temporary&&u.temporaryUntil&&u.temporaryUntil>this.time).length<this.talent('proliferate')&&this.random()<.005*this.talent('proliferate')){const type:TerranType=this.random()<.5?'marine':'marauder',p=this.freePosition(type,this.anchor);if(p){const u=this.addUnit(type,'terran',p.x,p.z,5);u.temporary=true;u.temporaryUntil=this.time+30;}}
 }
 private updateTalentSupport(){
  if(this.time>=this.nextEliteGrowthAt){const pool=this.allies().filter(u=>u.eliteId&&u.rank<5).sort((a,b)=>a.rank-b.rank||a.id-b.id);if(pool[0]){pool[0].rank++;this.refreshStats(pool[0]);this.announce(ELITES[pool[0].eliteId!].name+' · 自我成长晋升');}this.nextEliteGrowthAt=this.time+(this.talent('self_growth')===1?360:240);}
  if(this.time>=this.nextMercenaryAt){const keys=Object.values(ELITES),elite=keys[Math.floor(this.random()*keys.length)],p=this.freePosition(elite.family,this.anchor);if(p){const u=this.addUnit(elite.family,'terran',p.x,p.z,5);u.eliteId=elite.id;u.modelKey=elite.model;u.temporary=true;u.temporaryUntil=this.time+80;this.refreshStats(u);this.announce(elite.name+' · 雇佣兵抵达');}this.nextMercenaryAt=this.time+(this.talent('mercenary')===1?240:120);}
  if(this.time>=this.nextTankSupportAt){this.supportUntil=this.time+8;this.nextSupportTick=this.time;this.nextTankSupportAt=this.time+[Infinity,90,60,45][this.talent('tank_support')];this.announce('坦克与医疗艇支援 · 8 秒');}
  if(this.time+1e-8>=this.nextSupportTick&&this.time<=this.supportUntil){this.nextSupportTick+=1;const count=this.talent('tank_support'),targets=[...this.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0&&distance(u,this.anchor)<14).sort((a,b)=>distance(a,this.anchor)-distance(b,this.anchor));for(const target of targets.slice(0,count)){this.hit(target,SIEGE.damage*rankStats(5).damage,[],1,'terran');this.effect('explosion',target,target,1,.3);}const patients=this.allies().filter(u=>u.hp<u.maxHp&&!u.lastStandUntil).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);for(const u of patients.slice(0,count))u.hp=Math.min(u.maxHp,u.hp+HEAL.hpPerSecond*rankStats(5).healing);}
 }
 hit(target:Body,damage:number,bonuses:{attribute:string;amount:number}[]=[],hits=1,sourceOwner:'terran'|'zerg'='terran',minimum=.5,armorPenetration=0,sourceId?:number,forced=false,transferred=false){
  const acid=this.statuses.value(target.id,'acidArmor',this.time),armor=Math.max(0,target.armor+(this.auraArmor.get(target.id)??0)-Math.min(3,acid));
  const friendly=target.owner==='terran'&&sourceOwner==='zerg'?this.entities.get(target.id):undefined,attacker=sourceId===undefined?undefined:this.entities.get(sourceId);
  if(!forced&&friendly&&attacker&&this.talent('veteran_dodge')&&this.random()<.03*this.talent('veteran_dodge'))return;
  const bonus=bonuses.reduce((sum,b)=>sum+(target.attributes.includes(b.attribute)?b.amount:0),0),perHit=transferred?damage:Math.max(minimum,damage+bonus-armor*(1-armorPenetration)),before=target.hp;
  let total=Math.min(target.hp+(friendly?.shield??0),perHit*hits);
  if(friendly){if(!transferred)total*=1-.04*this.talent('armor_upgrade');friendly.lastDamagedAt=this.time;if(friendly.shield){const absorbed=Math.min(friendly.shield,total);friendly.shield-=absorbed;total-=absorbed;}
   if(!transferred&&this.talent('team_share')&&total>0){const partners=this.allies().filter(u=>u.id!==friendly.id&&u.unitType===friendly.unitType&&u.hp>0&&!u.temporary);if(partners.length){const share=total*.2*this.talent('team_share');total-=share;for(const partner of partners)this.hit(partner,share/partners.length,[],1,'zerg',0,1,undefined,false,true);}}
  }
  target.hp=Math.max(0,target.hp-total);this.stats.damage+=before-target.hp;
  if(before>target.hp||friendly&&before===target.hp)this.visual('hit',target);
  if(friendly&&target.hp<=0&&!forced&&!friendly.temporary){
   if(friendly.lastStandUntil&&this.time<friendly.lastStandUntil)friendly.hp=1;
   else if(!friendly.heroId&&!friendly.eliteId&&friendly.rank>=2&&friendly.orderlyStage!==this.stage&&this.random()<.01*this.talent('orderly_army')){friendly.orderlyStage=this.stage;friendly.rank--;this.refreshStats(friendly);friendly.hp=Math.max(1,friendly.maxHp*(.5+.1*this.talent('honor_archive')));}
   else if(!friendly.heroId&&!friendly.eliteId&&friendly.charmStage!==this.stage&&this.random()<.33*this.talent('lovers_charm')){friendly.charmStage=this.stage;friendly.hp=1;}
   else if(!friendly.heroId&&!friendly.eliteId&&friendly.lastStandStage!==this.stage&&this.talent('last_stand')){friendly.lastStandStage=this.stage;friendly.lastStandUntil=this.time+(this.talent('last_stand')===1?8:15);friendly.hp=1;}
  }
  const hive=this.expansionHives.get(target.id);if(hive&&hive.hp<=0&&!hive.rewarded){hive.rewarded=true;hive.pending=[];const profile=expansionProfile(hive.stage);this.drop(hive,profile.reward);this.tryRewardDrop(hive,false,'elite');this.expansionHives.delete(hive.id);this.stats.kills++;this.effect('explosion',hive,hive,2.4,.6);this.announce('扩张虫巢已清除 · 亢奋来源减少');return;}
  const fort=this.fortifications.get(target.id);if(fort&&fort.hp<=0){this.fortifications.delete(fort.id);this.effect('explosion',fort,fort,2,.5);this.announce(fort.kind==='bunker'?'防御地堡被摧毁':'修理设施被摧毁');return;}
  const economic=this.economicTargets.get(target.id);if(economic&&economic.status==='active'&&economic.hp<=0){economic.resolvedAt=this.time;
   if(economic.kind==='egg'){if(sourceOwner==='terran'&&this.time<economic.expiresAt!-1e-8){economic.status='rescued';this.scvs+=1+this.talent('scv_savior');this.stats.scvsRescued++;this.visual('scv-rescue',economic);this.announce('SCV 已获救 · 自动采集提升');if(this.talent('elite_scout')&&this.random()<.05*this.talent('elite_scout')){const pool=Object.values(ELITES).filter(e=>!this.eliteOwned(e.id)&&this.familyUnits(e.family).length<this.familyCap()&&this.canAcquireElite(e.id));if(pool.length)this.acquireElite(pool[Math.floor(this.random()*pool.length)].id);}}else {economic.status='expired';this.stats.scvsLost++;this.visual('egg-expired',economic);}}
   else {economic.status='killed';this.stats.dronesKilled++;this.visual('drone-death',economic);this.drop(economic,DROPS.drone);this.tryRewardDrop(economic,true);}return;
  }
  if(target.hp<=0&&'unitType' in target&&this.entities.has(target.id)){const e=target as Entity;if(e.deadAt===null){e.deadAt=this.time;e.action='dead';e.velocity={x:0,z:0};this.statuses.removeTarget(e.id);if(e.owner==='zerg')this.nextAuraUpdate=this.time;
    this.visual('death',e);if(e.owner==='zerg'){this.stats.kills++;const drop=(e.guardOrigin||e.guardianPod!==null?DROPS.guard:DROPS.ambient)[e.unitType as ZergType],factor=e.enemyTier==='boss'?20:e.enemyTier==='lord'?24:e.enemyTier==='elite'?3:1;this.drop(e,[drop[0]*factor,drop[1]*factor]);this.tryRewardDrop(e,false,e.enemyTier);this.qualifiedKill(sourceId);}
  }}
 }
 drop(p:Point,amount:readonly [number,number]){const f=incomeFactor(this.difficulty)*ECONOMY.dropMultiplier;this.pickups.push({id:this.nextId++,...p,minerals:amount[0]*f,gas:amount[1]*f});}
 tryRewardDrop(p:Point,drone=false,tier?:EnemyTier){if(tier!=='boss'&&tier!=='lord'&&this.random()>=(tier==='elite'?.4:drone?MAP_REWARDS.droneChance:MAP_REWARDS.combatChance))return;const reward=tier==='boss'||tier==='lord'?drawBossReward(this,this.random):drawReward(this,this.random,tier==='elite'?'elite':true);if(reward)this.rewardDrops.push({id:this.nextId++,...p,reward});}
 collectRewardDrop(id:number){const index=this.rewardDrops.findIndex(p=>p.id===id);if(index<0)return false;const drop=this.rewardDrops[index],r=drop.reward;
  if(r.id!=='boss.exhausted'&&unlockedReward(this,r)&&this.applyReward(r)){this.announce('拾获 '+r.name);}
  else {this.wallet.minerals+=r.baseMinerals;this.wallet.gas+=r.baseGas;this.economyTotals.cards.minerals+=r.baseMinerals;this.economyTotals.cards.gas+=r.baseGas;this.announce(r.name+' 已培养完成 · 回收补给');}
  this.rewardDrops.splice(index,1);this.changed();return true;
 }
 visual(kind:VisualEvent['kind'],body:Body,end:Point=body){const e=this.entities.get(body.id);this.visualEvents.push({serial:++this.visualSerial,time:this.time,kind,x:body.x,z:body.z,y:(body.flying?5.6:this.terrain?.height(body)??0)+.6,endY:(this.terrain?.height(end)??0)+.6,unitType:e?.unitType??null,modelKey:e?.modelKey,entityId:body.id,flying:body.flying,end:{x:end.x,z:end.z},facing:kind==='attack'?e?.attackFacing??0:e?.facing??0,siege:e?.mode==='siege'});if(this.visualEvents.length>768)this.visualEvents.splice(0,256);}
 effect(kind:Effect['kind'],source:Body,end:Point,radius=.1,duration=.18){const fx:Effect={id:this.nextId++,kind,x:source.x,z:source.z,end:{...end},until:this.time+duration,radius,owner:source.owner,source:source.id};this.effects.push(fx);return fx;}
 fire(u:Entity,target:Body){if(!this.targetAllowed(u,target)||!this.hasAttackLine(u,target))return;const d=SC2_UNITS[u.unitType];this.stats.shots++;
  u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.lastShotAt=this.time;u.nextShotAt=this.time+u.shotInterval;this.visual('attack',u,target);
  const rank=this.growth(u).damage*this.weaponFactor(u),bonusFactor=u.owner==='zerg'&&u.unitType==='baneling'?u.weaponDamage/d.attackDamage*this.enemyDamageFactor(u):rank;const bonus=d.bonusDamage.map(b=>({...b,amount:(b.amount+(u.unitType==='hellion'&&this.upgrades.has('infernal')?5:0)+(u.unitType==='marauder'?(this.upgrades.get('infantry')??0):0))*bonusFactor}));
  if(u.unitType==='hellion'){
   const a=Math.atan2(target.x-u.x,target.z-u.z),length=6.5*(u.eliteId==='hellion.3'?1.25:1),width=.15*(u.eliteId==='hellion.3'?1.5:1),end={x:u.x+Math.sin(a)*length,z:u.z+Math.cos(a)*length};
   this.hash.query(u,11,b=>{if(!this.targetAllowed(u,b)||!this.hasAttackLine(u,b))return;const along=(b.x-u.x)*Math.sin(a)+(b.z-u.z)*Math.cos(a);const across=Math.abs((b.x-u.x)*Math.cos(a)-(b.z-u.z)*Math.sin(a));if(along>=0&&along<=length+b.unitRadius&&across<=width+b.unitRadius)this.attackHit(u,b,u.weaponDamage,bonus);});this.effect('flame',u,end,.35,.35);
  }else if(u.unitType==='baneling'){
   this.hash.query(u,4,b=>{if(b.owner!==u.owner&&!b.flying&&(!this.terrain||this.terrain.walkLine(u,b,0))&&this.edgeDistance(u,b)<=2.2){this.hit(b,b.attributes.includes('Structure')?80*bonusFactor+b.armor:u.weaponDamage*this.enemyDamageFactor(u),b.attributes.includes('Structure')?[]:bonus,1,u.owner);}});
   this.effect('explosion',u,u,2.2,.55);this.hit(u,u.hp+u.armor,[],1,'zerg');
  }else if(u.mode==='siege'){
   const dmg=(SIEGE.damage+(this.upgrades.get('vehicle')??0)*4)*rank,bon=SIEGE.bonus.map(b=>({...b,amount:b.amount*rank}));
   this.hash.query(target,3,b=>{if(b.id===u.id||b.flying||b.hp<=0)return;const r=distance(target,b);const band=SIEGE.splash.find(s=>r<=s.radius*(u.eliteId==='tank.2'?1.25:1)+b.unitRadius*.25);if(b.id===target.id||band)this.hit(b,dmg*(band?.fraction??1),bon.map(bn=>({...bn,amount:bn.amount*(band?.fraction??1)})));});this.effect('explosion',u,target,1.25,.4);
  }else {this.attackHit(u,target,u.weaponDamage,bonus,d.attacks);this.effect('shot',u,target,.1,u.unitType==='marine'?.1:.2);}
 }
 toggleTanks(){if(this.phase!=='battle'||this.paused||this.requiresEliteChoice)return false;const tanks=this.allies().filter(u=>u.unitType==='tank');if(!tanks.length)return false;this.tankCommand=this.tankCommand==='tank'?'siege':'tank';for(const u of tanks)u.desiredMode=this.tankCommand;this.changed();return true;}
 updateTank(u:Entity,_anchorDistance:number,dt:number){if(u.unitType!=='tank')return false;
  if(u.modeTimer>0){u.modeTimer=Math.max(0,u.modeTimer-dt);u.velocity={x:0,z:0};if(u.modeTimer<=1e-8){u.mode=u.action==='sieging'?'siege':'tank';u.siegeSince=u.mode==='siege'?this.time:undefined;u.action='idle';this.refreshStats(u);}return true;}
  if(u.mode!==u.desiredMode){u.action=u.desiredMode==='siege'?'sieging':'unsieging';u.modeTimer=Math.max(.25,(u.desiredMode==='siege'?SIEGE.deploySeconds:SIEGE.undeploySeconds)*(this.upgrades.has('siege')?.8:1)*(u.eliteId==='tank.3'?.75:1)*(1-.33*this.talent('quick_siege')));u.siegeSince=undefined;u.velocity={x:0,z:0};u.windup=0;u.pendingTarget=null;return true;}
  return false;
 }
 heal(u:Entity,dt:number){u.energy=Math.min(u.maxEnergy,u.energy+u.energyRegen*dt);const previous=u.healTarget;u.healTarget=null;
  let best:Entity|undefined,score=Infinity;const mechanical=this.upgrades.has('mechanicalHeal');
  this.hash.query(u,14,b=>{
   if(b.owner!=='terran'||b.hp<=0||b.hp>=b.maxHp||b.id===u.id||!b.attributes.includes('Biological')&&!(mechanical&&b.attributes.includes('Mechanical')&&!b.attributes.includes('Structure')))return;
   const e=this.entities.get(b.id);if(!e||e.lastStandUntil&&e.lastStandUntil>this.time)return;
   // A treatable patient wins over a distant one. Keep a beam stable for small HP differences,
   // while substantially more critical patients can still take priority.
   const value=(this.edgeDistance(u,b)<=HEAL.range?0:2)+b.hp/b.maxHp;
   const priority=value-(b.id===previous ? .12 : 0);
   if(priority<score){best=e;score=priority;}
  },'terran');
  u.healTargets=[];if(best&&u.energy>0){const patients=[best];if(u.eliteId==='medivac.2')this.hash.query(u,HEAL.range+2,b=>{if(patients.length<3&&b.id!==best!.id&&b.id!==u.id&&b.owner==='terran'&&b.hp>0&&b.hp<b.maxHp&&this.edgeDistance(u,b)<=HEAL.range&&(b.attributes.includes('Biological')||mechanical&&b.attributes.includes('Mechanical'))){const ally=this.entities.get(b.id);if(ally)patients.push(ally);}},'terran');
   for(let i=0;i<patients.length;i++){const patient=patients[i];if(patient.lastStandUntil&&patient.lastStandUntil>this.time)continue;const repair=u.eliteId==='medivac.3'&&patient.attributes.includes('Mechanical'),suppression=Math.min(.5,Math.max(this.statuses.value(patient.id,'bleed',this.time),this.statuses.value(patient.id,'corruption',this.time))),healed=healBiological(u,patient,{...HEAL,hpPerSecond:u.healRate*(1-suppression)*(i===0?1:.5)*(repair?1.5:1),energyPerHp:HEAL.energyPerHp*(repair?.75:1),allowMechanical:mechanical},dt,this.edgeDistance(u,patient));if(healed>0){u.healTarget??=patient.id;u.healTargets.push(patient.id);u.action='heal';this.stats.healed+=healed;}}
  }
  return best;
 }
 updateBile(u:Entity,dt:number){u.bileCooldown-=dt;if(u.bileCooldown>0)return;const target=this.findTarget(u,BILE.range);
  if(target&&this.edgeDistance(u,target)<=BILE.range){const fx=this.effect('bile',u,target,BILE.radius,BILE.delay);fx.damage=BILE.damage*(u.weaponDamage/SC2_UNITS.ravager.attackDamage)*this.enemyDamageFactor(u);u.bileCooldown=BILE.cooldown;}else u.bileCooldown=.12;
 }
 moveGoal(u:Entity){
  u.trailIndex=this.trail.length-1;
  if(!this.movementAllies||!this.formationPlanned){this.formation.plan(this.movementAllies??this.allies(),this.anchor,this.time,this.mapHalf,this.obstacles,this.terrain);this.formationPlanned=true;}
  return this.formation.goal(u);
 }
 private avoidStationaryBodies(u:Entity,goal:Point):Point {
  if(u.flying||u.owner!=='terran')return goal;
  const settled=(b:Body)=>{if(!('velocity' in b))return true;const e=b as Entity;
   if(e.mode==='siege'||e.modeTimer>0)return true;
   if(e.velocity.x*e.velocity.x+e.velocity.z*e.velocity.z>=.01)return false;
   const target=this.body(e.attackTarget);
   // A front-rank shooter can hold a firing arc instead of its formation slot.
   return this.anchorStoppedFor>.15&&!!target&&this.canFireAt(e,target)||e.action==='idle'&&distance(e,this.moveGoal(e))<.35;
  };
  let detour=this.detours.get(u.id);
  if(detour){const body=this.body(detour.body),remaining={x:goal.x-u.x,z:goal.z-u.z};
   if(!body||body.hp<=0||!settled(body)||this.time>detour.until&&(this.movementStall.get(u.id)??0)>.5||remaining.x*detour.forward.x+remaining.z*detour.forward.z<0){this.detours.delete(u.id);detour=undefined;}
   else {if(distance(u,detour.first)<.45)detour.phase=1;if(distance(u,detour.second)<.45){this.detours.delete(u.id);return goal;}return detour.phase?detour.second:detour.first;}
  }
  const d=distance(u,goal);if(d<.25)return goal;const forward={x:(goal.x-u.x)/d,z:(goal.z-u.z)/d};let blocker:Body|undefined,nearest=Infinity,checked=0;
  this.hash.query(u,4+u.unitRadius,b=>{if(checked++>=20)return false;if(b.id===u.id||b.flying||b.owner!=='terran'||this.terrain&&!this.terrain.sameContactLayer(u,b))return;if(!settled(b)||'velocity' in b&&(b as Entity).mode!=='siege'&&(b as Entity).modeTimer<=0&&(this.movementStall.get(u.id)??0)<.6)return;
   const x=b.x-u.x,z=b.z-u.z,along=x*forward.x+z*forward.z,across=Math.abs(x*forward.z-z*forward.x),r=u.unitRadius+b.unitRadius+.2;
   if(along>0&&along<Math.min(d,4)&&across<r&&along<nearest){blocker=b;nearest=along;}
  });
  if(!blocker)return goal;const b=blocker as Body,r=u.unitRadius+b.unitRadius+.4;
  const combatTarget=this.body(u.attackTarget),combatDetour=this.anchorStoppedFor>.15&&!!combatTarget&&distance(combatTarget,this.anchor)<=u.attackRange+3;
  // If the desired slot itself is occupied, settle beside it instead of orbiting the defender.
  if(distance(goal,b)<u.unitRadius+b.unitRadius+.1&&distance(u,b)<r+.2)return u;
  const cross=(u.x-b.x)*forward.z-(u.z-b.z)*forward.x,side=Math.abs(cross)>.1?Math.sign(cross):(u.id%2?1:-1);
  const bodyClear=(from:Point,to:Point)=>{const dx=to.x-from.x,dz=to.z-from.z,d2=dx*dx+dz*dz;let clear=true;
   this.hash.query({x:(from.x+to.x)/2,z:(from.z+to.z)/2},Math.sqrt(d2)/2+u.unitRadius+2,other=>{
    if(other.id===u.id||other.owner!=='terran'||other.flying||!settled(other)||this.terrain&&!this.terrain.sameContactLayer(u,other))return;
    const radius=u.unitRadius+other.unitRadius+.04,t=d2>1e-8?Math.max(0,Math.min(1,((other.x-from.x)*dx+(other.z-from.z)*dz)/d2)):0;
    // Allow leaving a current contact, never cutting through the next held shooter.
    if(t<.02&&distance(to,other)>distance(from,other)+.1)return;
    if(Math.hypot(from.x+dx*t-other.x,from.z+dz*t-other.z)<radius){clear=false;return false;}
   },'terran');return clear;
  };
  for(const width of combatDetour?[1,1.5,2]:[1])for(const sign of [side,-side]){const lateral={x:forward.z*r*width*sign,z:-forward.x*r*width*sign},approach=combatDetour?Math.min(r,Math.max(0,(b.x-u.x)*forward.x+(b.z-u.z)*forward.z)):r,first={x:b.x-forward.x*approach+lateral.x,z:b.z-forward.z*approach+lateral.z},second={x:b.x+forward.x*r+lateral.x,z:b.z+forward.z*r+lateral.z};
   if([first,second].some(p=>Math.abs(p.x)+u.unitRadius>=this.mapHalf||Math.abs(p.z)+u.unitRadius>=this.mapHalf))continue;
   if(clearLine(u,first,u.unitRadius,this.obstacles,this.terrain)&&clearLine(first,second,u.unitRadius,this.obstacles,this.terrain)&&(!combatDetour||bodyClear(u,first)&&bodyClear(first,second))){
    this.detours.set(u.id,{body:b.id,first,second,phase:0,forward,until:combatDetour?this.time+1:Infinity});return first;
   }
  }
  return u;
 }
 separation(u:Entity){const v={x:0,z:0};let n=0;this.hash.query(u,2.8,b=>{if(n>=12)return false;if(b.id===u.id||b.flying!==u.flying)return;const dx=u.x-b.x,dz=u.z-b.z,d2=dx*dx+dz*dz,min=u.unitRadius+b.unitRadius+.15;if(d2<min*min){if(!u.flying&&this.terrain&&!this.terrain.sameContactLayer(u,b))return;const d=Math.sqrt(d2),strength=Math.min(3,(min-d)*5);if(d>.001){v.x+=dx/d*strength;v.z+=dz/d*strength;}else{const a=(Math.min(u.id,b.id)*7+Math.max(u.id,b.id)*13)*2.399,sign=u.id<b.id?1:-1;v.x+=Math.sin(a)*strength*sign;v.z+=Math.cos(a)*strength*sign;}n++;}});return v;}
 private moveWhileAiming(u:Entity,dt:number){
  const before={x:u.x,z:u.z},speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1)*(this.zoneSlowed.has(u.id)?.8:1);
  translate(u,{x:this.marchDirection.x*speed*dt,z:this.marchDirection.z*speed*dt},u.unitRadius,u.flying,this.obstacles,this.mapHalf,this.terrain);
  u.velocity.x=(u.x-before.x)/dt;u.velocity.z=(u.z-before.z)/dt;u.distanceWalked+=distance(before,u);
 }
 updateUnit(u:Entity,dt:number){if(u.hp<=0)return;if(u.lastStandUntil&&this.time>=u.lastStandUntil){u.lastStandUntil=undefined;this.hit(u,u.hp+u.armor+1,[],1,'zerg',0,0,undefined,true);return;}if(u.temporaryUntil&&this.time>=u.temporaryUntil){this.hit(u,u.hp+u.armor+1,[],1,'zerg',0,0,undefined,true);return;}if(u.maxShield&&this.time-(u.lastDamagedAt??-Infinity)>=5)u.shield=Math.min(u.maxShield,(u.shield??0)+u.maxShield*.03*dt);this.updateElite(u,dt);if(u.owner==='terran'&&!u.flying)this.movementStall.set(u.id,u.action==='move'&&u.mode==='tank'&&u.modeTimer<=0&&distance(u,u.prev)<u.moveSpeed*dt*.15?(this.movementStall.get(u.id)??0)+dt:0);u.prev.x=u.x;u.prev.z=u.z;if(u.unitType!=='medivac')u.healTarget=null;
  u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);
  if(u.heroId==='nova'&&this.heroCasts.some(c=>c.source===u.id&&c.at>this.time)){u.velocity={x:0,z:0};u.action='skill';return;}
  const anchorDistance=distance(u,this.anchor);
  if(this.updateTank(u,anchorDistance,dt))return;
  if(this.enemySpecials.act(u,dt))return;
  if(u.unitType==='ravager'&&!u.enemyTier)this.updateBile(u,dt);
  if(u.owner==='terran'&&this.order?.kind==='move'&&this.order.arrived&&distance(u,this.moveGoal(u))<.45+u.unitRadius*.5)this.movePending.delete(u.id);
  const marching=u.owner==='terran'&&Math.hypot(this.marchDirection.x,this.marchDirection.z)>.01&&u.mode!=='siege';
  if(u.windup>0){u.windup-=dt;if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};u.action='attack';
   const b=this.body(u.pendingTarget);if(b){const heading=Math.atan2(b.x-u.x,b.z-u.z);u.attackFacing=turn(u.attackFacing,heading,(u.unitType==='tank'?6:u.unitType==='hellion'?4.8:u.owner==='terran'?CONTROL.infantryTurnRate:9)*(u.owner==='terran'?1+.5*this.talent('stutter_king'):1)*dt);if(u.unitType!=='tank')u.facing=u.attackFacing;}
   if(u.windup>1e-8)return;
   if(this.time+1e-8<u.nextShotAt){u.windup=u.nextShotAt-this.time;return;}
   if(b&&this.canFireAt(u,b,.5)){if(Math.abs(angleDelta(u.attackFacing,Math.atan2(b.x-u.x,b.z-u.z)))<.3)this.fire(u,b);else if(!marching||this.time-(u.aimStartedAt??this.time)<CONTROL.maxMovingAim){u.windup=dt;return;}}
   u.pendingTarget=null;u.windup=0;u.attackLock=0;u.aimStartedAt=null;if(marching)u.repositionUntil=this.time+(this.talent('stutter_king')>=2||this.talent('stutter_king')===1&&this.random()<.5?0:CONTROL.repositionSeconds);if(u.hp<=0)return;}
  if(u.unitType==='medivac')u.attackTarget=null;
  else if(this.time>=u.thinkAt||u.attackTarget!==null&&!this.body(u.attackTarget)?.hp){
   u.attackTarget=this.findTarget(u,u.owner==='terran'?u.attackRange+2:16)?.id??null;u.thinkAt=this.time+(u.owner==='terran'?CONTROL.thinkSeconds+(u.id%4)*CONTROL.thinkSpread:.12+(u.id%5)*.012);
  }
  let target=this.body(u.attackTarget);if(target&&!this.targetAllowed(u,target))target=undefined;
  if(u.owner==='terran'&&this.order?.kind==='move'&&this.order.arrived&&anchorDistance<=TUNING.softLeash&&target&&this.canFireAt(u,target))this.movePending.delete(u.id);
  const leash=anchorDistance>TUNING.softLeash,hard=anchorDistance>TUNING.hardLeash;
  const closeDefense=target&&this.edgeDistance(u,target)<=2.5;
  if(u.unitType==='tank'&&target)u.attackFacing=turn(u.attackFacing,Math.atan2(target.x-u.x,target.z-u.z),6*dt);
  const marchingRearTarget=marching&&u.unitType==='hellion'&&target&&Math.abs(angleDelta(Math.atan2(this.marchDirection.x,this.marchDirection.z),Math.atan2(target.x-u.x,target.z-u.z)))>1.2;
  if(marching&&u.aimStartedAt!==null&&this.time-u.aimStartedAt>CONTROL.maxMovingAim){u.repositionUntil=this.time+CONTROL.repositionSeconds;u.aimStartedAt=null;}
  if(target&&this.canFireAt(u,target)&&!marchingRearTarget&&(!marching||this.time>=u.repositionUntil)&&(!hard||u.mode==='siege'||u.owner==='zerg'||closeDefense)&&u.weaponCooldown<=1e-8&&this.time+Math.max(dt,SC2_UNITS[u.unitType].damagePoint,marching?CONTROL.movingWindup:0)+1e-8>=u.nextShotAt){
   u.aimStartedAt??=this.time;const heading=Math.atan2(target.x-u.x,target.z-u.z);if(u.unitType!=='tank')u.attackFacing=u.facing=turn(u.facing,heading,(u.unitType==='hellion'?4.8:u.owner==='terran'?CONTROL.infantryTurnRate:9)*(u.owner==='terran'?1+.5*this.talent('stutter_king'):1)*dt);
   if(Math.abs(angleDelta(u.attackFacing,heading))<.3){const data=SC2_UNITS[u.unitType],stim=u.stimUntil>this.time?1.5:1;
    u.weaponCooldown=(u.unitType==='hydralisk'&&this.edgeDistance(u,target)<=HYDRALISK_MELEE.range?HYDRALISK_MELEE.period*u.attackPeriod/SC2_UNITS.hydralisk.attackPeriod:u.attackPeriod)/stim/(u.slowUntil&&u.slowUntil>this.time?1-(u.slowFactor??0):1)/this.enemyAttackSpeedFactor(u)/(1-Math.min(.3,this.statuses.value(u.id,'neural',this.time)));u.shotInterval=u.weaponCooldown;u.windup=Math.max(dt,data.damagePoint,marching?CONTROL.movingWindup:0);u.attackLock=u.windup;u.pendingTarget=target.id;u.action='attack';if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};return;}
   // A committed firing turn must not be cancelled by formation steering in the same tick.
   if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};u.action='idle';return;
  }
  u.aimStartedAt=null;
  if(u.mode==='siege'){u.action='idle';u.velocity={x:0,z:0};return;}
  let goal:Point=u.owner==='terran'?this.moveGoal(u):(target??this.anchor);
  const pursuit=target;
  const deploying=u.owner==='terran'&&u.unitType!=='medivac'&&pursuit&&!marching&&!hard&&this.anchorStoppedFor>.15&&distance(pursuit,this.anchor)<=u.attackRange+3;
  if(deploying)goal=this.engagement.goal(u,pursuit!,this.movementAllies??this.allies(),this.anchor,this.time,this.mapHalf,this.obstacles,this.terrain);
  if(u.owner==='zerg'&&u.guardianPod!==null){const p=this.pods.find(p=>p.id===u.guardianPod&&p.status==='active');if(p&&(!target||u.id%3!==0&&distance(u,target)>4))goal=p;}
  if(u.owner==='zerg'&&target&&this.edgeDistance(u,target)<=u.attackRange*.85)goal=u;

  // Hold a useful firing position while the anchor is still; do not turn back to the slot after every bullet.
  if(u.owner==='terran'&&u.unitType!=='medivac'&&target&&!hard&&this.anchorStoppedFor>.1&&this.edgeDistance(u,target)<=u.attackRange&&this.hasAttackLine(u,target)&&(!deploying||distance(u,goal)<.22)){u.velocity={x:0,z:0};u.action='idle';return;}
  if(u.unitType==='medivac'){const patient=this.heal(u,dt);if(patient&&!hard){
   if(this.edgeDistance(u,patient)<=HEAL.range){if(this.anchorStoppedFor>.15){u.velocity.x=0;u.velocity.z=0;return;}}
   else if(this.anchorStoppedFor>.15&&!leash)goal=patient;
  }}
  // Marching intent wins over a rear formation slot: do not reverse just to reform a row.
  // A short forward shoulder stays close to the anchor and must be directly traversable.
  if(u.owner==='terran'&&!deploying&&this.anchorMovingFor>0){
   const sx=Math.sin(this.anchor.facing),sz=Math.cos(this.anchor.facing),dx=goal.x-u.x,dz=goal.z-u.z;
   if(dx*sx+dz*sz<-.15){const forward=Math.min(1.5,Math.max(0,(this.anchor.x-u.x)*sx+(this.anchor.z-u.z)*sz+.8)),side=Math.max(-.6,Math.min(.6,dx*sz-dz*sx)),march={x:u.x+sx*forward+sz*side,z:u.z+sz*forward-sx*side};
    if(Math.abs(march.x)+u.unitRadius<this.mapHalf&&Math.abs(march.z)+u.unitRadius<this.mapHalf&&(u.flying||clearLine(u,march,u.unitRadius,this.obstacles,this.terrain)))goal=march;
   }
  }
  let speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1)*(u.slowUntil&&u.slowUntil>this.time?1-(u.slowFactor??0):1)*(this.zoneSlowed.has(u.id)?.8:1);
  if(u.owner==='terran'&&this.talent('tidy_squad')&&distance(u,this.anchor)>[Infinity,8,6,4][this.talent('tidy_squad')])speed*=1+.1*this.talent('tidy_squad');
  if(u.owner==='terran'&&hard)speed*=TUNING.catchUp;
  if(u.owner==='zerg'){const stage=STAGES[this.stage-1];speed*=stage.speed*this.enemyMoveFactor(u);if(u.unitType==='baneling'&&this.stage>=9)speed*=1.3;}
  if(!u.flying){
   const cached=this.navigation.get(u.id);
   if(!cached||this.time>=cached.until||!cached.stalled&&distance(u,cached.goal)<.7&&distance(cached.goal,cached.requested)>.5||distance(goal,cached.requested)>2){
    const routed=steerGoal(u,goal,u.unitRadius,this.obstacles,this.terrain,this.mapHalf);
    this.navigation.set(u.id,{goal:{x:routed.x,z:routed.z},requested:{x:goal.x,z:goal.z},until:this.time+.15+(u.id%4)*.01,stalled:distance(u,routed)<.02});
   }
   goal=this.navigation.get(u.id)!.goal;
  }
  goal=this.avoidStationaryBodies(u,goal);
  locomote(u,goal,speed,this.separation(u),dt,this.obstacles,this.sandbox?TUNING.worldHalf:this.mapHalf,this.terrain);
 }
 updatePods(){for(const p of this.pods){
  if(p.status==='falling'){if(this.time>=p.landedAt-1e-8)this.landPod(p);continue;}
  if(p.status!=='active'&&p.status!=='opening')continue;
  if(p.hp<=0){p.status='destroyed';p.resolvedAt=this.time;this.stats.failed+=p.passengers.filter(c=>c.status==='waiting').length;for(const c of p.passengers)if(c.status==='waiting')c.status='lost';this.visual('pod-destroy',p);this.announce('降落仓被毁 · 士兵阵亡');for(const id of p.guardianIds){const u=this.entities.get(id);if(u)u.guardianPod=null;}continue;}
  let threat=[...p.guardianIds].some(id=>(this.entities.get(id)?.hp??0)>0);this.hash.query(p,6,b=>{if(b.owner==='zerg'&&b.hp>0&&!this.economicTargets.has(b.id))threat=true;});
  if(threat){p.status='active';p.resolvedAt=null;continue;}
  if(p.status==='active'){p.status='opening';p.resolvedAt=this.time;this.visual('pod-open',p);}
  else if(this.time-(p.resolvedAt??this.time)>=ECONOMY.openingSeconds-1e-8&&this.time>=p.nextExitAt){const passenger=p.passengers.find(c=>c.status==='waiting');if(!passenger)continue;
   if(this.ordinaryCapacity(p.unitType)<=0&&!this.evolutionCapacity(p.unitType))continue;const units=this.familyUnits(p.unitType),pos=units.length>=this.familyCap()?p:this.freePosition(p.unitType,p,1.8,4.5);if(!pos)continue;
   const evolved=this.evolvePassenger(p.unitType),u=evolved??this.reinforce(p.unitType,pos);passenger.status='released';passenger.entityId=u.id;p.recruitId=u.id;p.nextExitAt=this.time+.35;this.stats.rescued++;if(!evolved){if(p.freeConscript){u.freeConscript=true;this.refreshStats(u);}this.classroom(u,p.unitType);}
   if(p.passengers.every(c=>c.status==='released')){p.status='rescued';p.resolvedAt=this.time;this.announce(SC2_UNITS[p.unitType].zh+' ×'+p.passengers.length+' 已获救，正在归队');}
  }
 }}
 spawnWave(){if(this.scheduledStage!==this.stage)this.prepareStage();if(this.endless&&this.stageWave>=this.waves.length)this.stageWave=0;const wave=this.waves[this.stageWave];if(!wave)return;this.wave++;this.stageWave++;wave.types.forEach((type,i)=>this.ambientBacklog.push({type,bearing:wave.bearing,at:this.time+i*this.config.entranceSpacing}));this.ambientBacklog.sort((a,b)=>a.at-b.at);this.nextWave=this.endless?Infinity:this.stageStartedAt+(this.waves[this.stageWave]?.at??Infinity);this.releaseAmbient();}
 private releaseAmbient(){let slots=Math.max(0,TUNING.enemyCap-this.enemyCount());while(slots-->0&&this.ambientBacklog.length&&this.ambientBacklog[0].at<=this.time+1e-8){const e=this.ambientBacklog.shift()!,base=this.eventPoint(Math.min(12,this.mapHalf*.75)),angle=this.stage===2?(this.stats.ambientSpawned%2?0:Math.PI):e.bearing+(this.stage>=5&&slots%2?Math.PI:0);
  // Distribute a wave along its approach arc; do not stack every attacker on one point.
  const arc=angle+((this.stats.ambientSpawned%9)-4)*.17,range=Math.min(24,this.mapHalf*.9)*(0.86+(this.stats.ambientSpawned%3)*.06);
  const desired=this.nearbyPoint(this.anchor,range,arc);const p=distance(desired,this.anchor)>=8?desired:base;this.addUnit(e.type,'zerg',p.x,p.z);this.stats.ambientSpawned++;}}
 endStage(){if(this.phase!=='battle')return;this.cancelOrder();
  if(this.difficulty==='hell'&&this.expansionHives.size){this.phase='lost';this.announce('扩张虫巢尚未清除 · 战线失守');return;}
  if(!this.endless&&this.stage===12&&(!this.hive||this.hive.hp>0||!this.allies().some(u=>u.unitType!=='medivac'))){this.phase='lost';this.announce('未能在期限内摧毁虫巢并保住小队');return;}
  if(!this.endless&&this.runId){const points=talentPointsForStage(this.difficulty,this.stage);if(points)this.talentProfile.award(this.runId+':stage:'+this.stage,points);}
  const [m,g]=this.config.reward,f=incomeFactor(this.difficulty)*(1+.1*this.talent('bonus_income'));this.clearReceipt={stage:this.stage,minerals:m*f,gas:g*f};this.wallet.minerals+=m*f;this.wallet.gas+=g*f;this.economyTotals.clear.minerals+=m*f;this.economyTotals.clear.gas+=g*f;
  if(!this.endless&&this.stage===12){if(this.talent('find_elites')){this.phase='reward';this.rewardRound='random';this.rewardClaimed=false;this.freeRerolls=this.talent('window_shop');this.freePurchases=this.talent('free_purchase');this.rewards=this.randomRoundOffers();this.announce('虫巢已摧毁 · 领取里程碑支援后撤离');}else {this.phase='won';this.announce('虫巢已摧毁 · 小队撤离成功');}return;}
  this.phase='reward';this.rewardRound='building';this.rewardClaimed=false;this.rerolls=0;this.freeRerolls=this.talent('window_shop');this.freePurchases=this.talent('free_purchase');this.rewards=this.offers(drawRewards(this,this.random,[],this.rewardRound));this.changed();
 }
 private offers(cards:Reward[]){return cards.map(r=>{const discount=(1-.1*this.talent('permanent_discount'))*(r.kind==='build'?1-.15*this.talent('frugal_build'):1);return {...r,offerId:`${this.stage}:${++this.offerSerial}:${r.id}`,sold:false,minerals:r.minerals?Math.max(1,Math.ceil(r.minerals*discount)):0,gas:r.gas?Math.max(1,Math.ceil(r.gas*discount)):0};});}
 private randomRoundOffers(previous:string[]=[],oldPrices:Reward[]=[]){const cards=this.offers(drawRewards(this,this.random,previous,'random',oldPrices));const milestone=this.endless?this.endless.round%4===0:this.stage%3===0;if(!milestone||!this.talent('find_elites'))return cards;
  const candidates=this.offers(rewardPool(this).filter(r=>r.kind==='elite'&&unlockedReward(this,r))).filter(r=>eligibleReward(this,r));
  for(let i=0;i<Math.min(this.talent('find_elites'),cards.length,candidates.length);i++){const at=Math.floor(this.random()*candidates.length);cards[i]=candidates.splice(at,1)[0];}return cards;
 }
 rerollCost(){return this.freeRerolls?0:Math.max(10,50+40*this.rerolls-20*this.talent('reroll_fan'));}
 reroll(){if(this.phase!=='reward'||this.rewardClaimed)return false;const price=this.rerollCost();if(!spend(this.wallet,{minerals:price,gas:0}))return false;if(this.freeRerolls)this.freeRerolls--;else this.economyTotals.rerolls+=price;this.rewards=this.rewardRound==='random'?this.randomRoundOffers(this.rewards.map(r=>r.id),this.rewards):this.offers(drawRewards(this,this.random,this.rewards.map(r=>r.id),this.rewardRound,this.rewards));this.rerolls++;this.changed();return true;}
 choose(id:string){if(this.phase!=='reward'||this.rewardClaimed)return false;const r=this.rewards.find(r=>r.offerId===id);if(!r||(this.rewardRound==='building')!==(r.kind==='build'||r.kind==='research')||!eligibleReward(this,r))return false;
  const free=this.rewardRound==='random'&&this.freePurchases>0||r.kind==='build'&&this.talent('free_house')>0&&this.random()<.2*this.talent('free_house'),double=r.kind==='build'&&this.talent('double_build')>0&&this.random()<.2*this.talent('double_build')&&!free&&this.wallet.minerals>=r.minerals*2&&this.wallet.gas>=r.gas*2,cost={minerals:free?0:r.minerals*(double?2:1),gas:free?0:r.gas*(double?2:1)};
  if(!spend(this.wallet,cost))return false;this.economyTotals.purchases.minerals+=cost.minerals;this.economyTotals.purchases.gas+=cost.gas;
  if(!this.applyReward(r)){this.wallet.minerals+=cost.minerals;this.wallet.gas+=cost.gas;this.economyTotals.purchases.minerals-=cost.minerals;this.economyTotals.purchases.gas-=cost.gas;return false;}
  if(double)this.addBuilding(r.value as BuildingType);if(free&&this.rewardRound==='random')this.freePurchases--;
  r.sold=true;this.changed();return true;
 }
 private applyReward(r:Reward){
  if(r.kind==='build')this.addBuilding(r.value as BuildingType);
  else if(r.kind==='upgrade')this.upgradeFactory(Number(r.value));
  else if(r.kind==='research')this.unlockMarauder();
  else if(r.kind==='train')this.extraDeliveries.push(r.value as TerranType);
  else if(r.kind==='hero'){if(!this.acquireHero(r.value as HeroId))return false;}
  else if(r.kind==='elite'){if(!this.acquireElite(r.value as EliteId))return false;}
  else if(r.kind==='intelligence'){if((this.upgrades.get('intelligence')??0)>=5)return false;this.upgrades.set('intelligence',(this.upgrades.get('intelligence')??0)+1);}
  else if(r.kind==='veteran'){if(!this.grantVeteran(r.value as TerranType,r.rank!))return false;}
  else if(r.kind==='tech'||r.kind==='buff'){const key=r.kind==='buff'?'buff.'+r.value:r.value;this.upgrades.set(key,(this.upgrades.get(key)??0)+(r.strength??1));for(const u of this.allies())this.refreshStats(u);}
  else {const gains=r.value==='minerals'?[100,0]:r.value==='gas'?[0,50]:r.value==='salvage'?[75,25]:[100,25];this.wallet.minerals+=gains[0];this.wallet.gas+=gains[1];this.economyTotals.cards.minerals+=gains[0];this.economyTotals.cards.gas+=gains[1];}
  return true;
 }
 skipReward(){if(this.phase!=='reward'||this.rewardClaimed)return false;return this.finishRewardRound();}
 private finishRewardRound(){this.rewardClaimed=true;if(this.rewardRound==='building'){this.rewardRound='random';this.rewards=this.randomRoundOffers();this.rewardClaimed=false;this.changed();return true;}if(!this.endless&&this.stage===12){this.phase='won';this.announce('虫巢已摧毁 · 小队撤离成功');return true;}return this.nextStage();}
 private nextStage(){this.rewardClaimed=true;if(this.endless)this.endless.round++;else this.stage++;this.stageElapsed=0;this.stageStartedAt=this.time;this.phase='battle';this.rerolls=0;this.prepareStage();this.flushDeliveries();this.deployPendingHeroes(true);this.changed();return true;}
 stim(){if(this.phase!=='battle'||this.paused||!this.upgrades.has('stim'))return false;let used=false;for(const u of this.allies()){const cost=u.eliteId==='marine.1'?0:u.unitType==='marauder'?20:10;if(!u.heroId&&['marine','marauder'].includes(u.unitType)&&u.hp>cost&&u.stimUntil<=this.time){u.hp-=cost;u.stimUntil=this.time+11;used=true;}}this.changed();return used;}
 dash(){if(this.phase!=='battle'||this.paused||this.time<this.dashReady)return false;const power=this.upgrades.get('buff.tactical')??0;this.dashUntil=this.time+1.2+power*.6;this.dashReady=this.time+12/(1+power)*Math.max(.5,1-.08*this.talent('skill_recovery'));return true;}
 airlift(){if(!this.talent('airlift')||this.phase!=='battle'||this.paused||this.requiresEliteChoice||this.time<this.airliftReady||this.airliftAt<Infinity)return false;this.airliftAt=this.time+2;this.announce('空运呼叫中 · 2 秒后集结');return true;}
 private completeAirlift(){this.airliftAt=Infinity;const allies=this.allies(),planned:{u:Entity;p:Point}[]=[],half=this.mapHalf;
  for(const u of allies){let found:Point|undefined;for(let ring=0;ring<12&&!found;ring++){const radius=1.5+ring*.55;for(let i=0;i<24;i++){const angle=(i+u.id*.31)*Math.PI/12,p={x:this.anchor.x+Math.sin(angle)*radius,z:this.anchor.z+Math.cos(angle)*radius};if(Math.abs(p.x)+u.unitRadius>=half||Math.abs(p.z)+u.unitRadius>=half||!u.flying&&((this.terrain&&!this.terrain.canOccupy(p,u.unitRadius))||blocked(p,u.unitRadius,this.obstacles))||planned.some(other=>other.u.flying===u.flying&&distance(other.p,p)<other.u.unitRadius+u.unitRadius+.2))continue;found=p;break;}}
   if(!found){this.announce('空运落点不足 · 冷却未消耗');return;}
   planned.push({u,p:found});
  }
  this.cancelOrder();for(const {u,p} of planned){u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};u.windup=0;u.pendingTarget=null;this.navigation.delete(u.id);}
  this.trail=[{x:this.anchor.x,z:this.anchor.z}];this.airliftReady=this.time+(this.talent('airlift')===1?240:120);this.announce('空运完成 · 小队已集结');
 }
 step(){if(this.phase!=='battle'||this.paused||this.requiresEliteChoice)return;const dt=TUNING.step;this.tick++;this.time=this.tick*dt;this.stageElapsed+=dt;this.statuses.tick(this.time);
  if(this.airliftAt<=this.time+1e-8)this.completeAirlift();
  if(this.endless&&this.runId){const minutes=Math.floor((this.endlessElapsed+1e-8)/60);while(this.endlessAwardedMinutes<minutes){this.endlessAwardedMinutes++;this.talentProfile.award(this.runId+':endless:'+this.endlessAwardedMinutes,talentPointsForEndlessMinute(this.difficulty));}}
  if(this.scheduledStage!==this.stage)this.prepareStage();const direction=this.updateCommand(dt),mag=Math.hypot(direction.x,direction.z);this.marchDirection={x:direction.x/Math.max(1,mag),z:direction.z/Math.max(1,mag)};if(mag>.01){this.anchorMovingFor+=dt;this.anchorStoppedFor=0;}else {this.anchorStoppedFor+=dt;this.anchorMovingFor=0;}if(mag>.01){const speed=TUNING.anchorSpeed*(this.time<this.dashUntil?1.65:1);this.anchor.facing=turn(this.anchor.facing,Math.atan2(direction.x,direction.z),5*dt);translate(this.anchor,{x:direction.x/Math.max(1,mag)*speed*dt,z:direction.z/Math.max(1,mag)*speed*dt},.8,false,this.obstacles,this.sandbox?TUNING.worldHalf:this.mapHalf,this.terrain);}
  if(distance(this.anchor,this.trail.at(-1)!)>.8)this.trail.push({x:this.anchor.x,z:this.anchor.z});
  if(this.trail.length>1200){this.trail.splice(0,200);for(const u of this.entities.values())u.trailIndex=Math.max(0,u.trailIndex-200);}
  this.updateEconomy(dt);this.updateProduction(dt);this.updateBurns();this.deployPendingHeroes();
  if(!this.sandbox)while(this.eventPlan[this.nextEvent]?.at<=this.stageElapsed){this.spawnEconomic(this.eventPlan[this.nextEvent++].kind);}
  if(this.autoWaves&&this.specialPlan[this.nextSpecial]?.tier==='lord'&&this.specialPlan[this.nextSpecial].at-this.stageElapsed<=5&&!this.lordWarningPoint){const radius=SC2_UNITS[this.specialPlan[this.nextSpecial].type].unitRadius*TUNING.unitScale*1.7,pool=this.spawnCells.filter(p=>distance(p,this.anchor)>8&&(!this.terrain||this.terrain.canOccupy(p,radius))&&!blocked(p,radius,this.obstacles));this.lordWarningPoint=pool.length?{...pool[Math.floor(this.random()*pool.length)]}:null;if(this.lordWarningPoint)this.announce('随机领主即将降临 · 5 秒');}
  if(this.autoWaves)while(this.specialPlan[this.nextSpecial]?.at<=this.stageElapsed){const e=this.specialPlan[this.nextSpecial];if(!this.spawnSpecial(e.type,e.tier,e.tier==='lord'?this.lordWarningPoint??undefined:undefined))break;this.nextSpecial++;if(e.tier==='lord')this.lordWarningPoint=null;if(e.tier==='elite')this.stats.ambientSpawned++;}
  if(this.autoWaves&&this.endless)this.updateEndlessSpawns(dt);else if(this.autoWaves&&this.time>=this.nextWave)this.spawnWave();if(this.ambientBacklog.length)this.releaseAmbient();if(this.autoWaves)this.updateHives();
  const bodies:Body[]=[...this.entities.values(),...this.pods.filter(p=>p.status==='active'||p.status==='opening'),...[...this.economicTargets.values()].filter(e=>e.status==='active'),...this.expansionHives.values(),...this.fortifications.values()];if(this.hive&&this.hive.hp>0)bodies.push(this.hive);this.hash.rebuild(bodies);this.updateAuras();this.updateTalentSupport();this.resolveHeroCasts();this.enemySpecials.update(dt);this.updateCorrosionZones();
  this.movementAllies=this.allies();this.formationPlanned=false;
  for(const u of this.entities.values())this.updateUnit(u,dt);
  this.updateFortifications();
  this.movementAllies=null;
  this.collisionContacts=this.contacts.resolve(this.entities.values(),this.hash,this.obstacles,this.mapHalf,dt,[...(this.hive&&this.hive.hp>0?[this.hive]:[]),...this.expansionHives.values(),...this.fortifications.values()],this.terrain);
  for(const fx of this.effects){if(fx.kind==='bile'&&fx.until<=this.time){this.visual('bile-impact',{...fx.end,id:fx.source,hp:0,maxHp:0,armor:0,unitRadius:0,flying:false,owner:'zerg',attributes:[]});this.hash.query(fx.end,3,b=>{if(!b.flying&&b.hp>0&&distance(b,fx.end)<=BILE.radius+b.unitRadius)this.hit(b,fx.damage??BILE.damage,[],1,'zerg',0,1);});}}
  this.effects=this.effects.filter(f=>f.until>this.time);
  this.updatePods();
  this.pickups=this.pickups.filter(p=>{const d=distance(p,this.anchor),radius=2**this.talent('battlefield_cleaner');if(d<2*radius&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){const factor=1+.25*this.talent('recycle'),m=p.minerals*factor,g=p.gas*factor;this.wallet.minerals+=m;this.wallet.gas+=g;this.economyTotals.drops.minerals+=m;this.economyTotals.drops.gas+=g;return false;}if(d<6*radius&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){p.x+=(this.anchor.x-p.x)*dt*4;p.z+=(this.anchor.z-p.z)*dt*4;}return true;});
  for(const p of [...this.rewardDrops])if(distance(p,this.anchor)<2&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0)))this.collectRewardDrop(p.id);
  this.maxStretch=0;let fighters=0;for(const [id,u] of this.entities){if(u.owner==='terran'&&u.hp>0){this.maxStretch=Math.max(this.maxStretch,distance(u,this.anchor));if(u.unitType!=='medivac')fighters++;}if(u.deadAt!==null&&this.time-u.deadAt>1.5){this.entities.delete(id);this.navigation.delete(id);this.detours.delete(id);this.movementStall.delete(id);}}
  if(this.order?.kind==='move'){for(const id of this.movePending)if((this.entities.get(id)?.hp??0)<=0)this.movePending.delete(id);if(this.order.arrived&&!this.movePending.size)this.cancelOrder();}
  this.distancePairs=this.hash.visits;
  if(!fighters){this.phase='lost';this.announce('战斗单位全部阵亡 · 小队失联');}
  else if(this.stageElapsed>=this.duration-1e-8)this.endStage();
  if(this.tick%6===0)this.changed();
 }
 advance(seconds:number){const n=Math.round(seconds/TUNING.step);for(let i=0;i<n;i++)this.step();}
}
