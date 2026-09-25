import {tickMainHive} from './combat/main-hive';
import {selectRunData,validateRunData} from './persistence/run-fields';
import {RUN_RULES,RUN_SCHEMA,type RunSnapshot} from './persistence/run-snapshot';
import {CombatStatuses} from './combat/statuses';
import {connectedSpawnCells} from './movement/spawn-cells';
import {ROSTER_LIMITS} from '../data/roster';
import {CONTROL_COMBAT as CONTROL} from '../data/control-tuning';
import {autoTargetScore} from './combat/auto-targeting';
import {RunState} from './run-state';
import {PermanentProfile} from './progression/permanent-profile';
import {talentRank} from '../data/mvp-talents';
import {familyRace,combatRace,isAirHeroType,type Race,type FamilyId} from '../data/races';
import {newExpedition} from './expedition-state';
import {availableFamily,setOutputs,setEnabled,assignHatchery,paidReservations,productionQuote,updateExpeditionProduction,receiptNeeded,previewReplacement,commitReplacement,rejectReceipt,releasePaidPassenger,setTacticalPlan,setTacticalEnabled,previewTacticalCancellation,cancelTacticalPlan} from './expedition-production';
import type {TacticalDirection} from './expedition-state';
import type {ProductionLineId} from '../data/expedition-buildings';
import {DEVELOPMENT} from '../data/expedition-buildings';
import {refreshExpeditionStats,castDetection,castFamilyAbility,setFamilyMode,visibleTo,validAttackTarget,tickDetection,tickNativeMode,tickExpeditionRecovery,healExpedition,unitData,talentModifiers,expeditionDamage,tickAutoAbilities,tickAreaSpells,selectWeapon} from './combat/expedition-combat';
import {campaign18ChapterGrowth,campaign18EnemyPressure} from '../data/campaign18';
import {developmentOffers,reinforcementOffers,offerEligible,purchaseOffer,purchaseEliteContract,refreshOffers,endReinforcement,previewRepair,repair,mapReinforcement,collectMapReinforcement,openTalentLoot,claimTalentLoot,type RepairQuote} from './expedition-economy';
import {expeditionRefreshCost} from './progression/expedition-drafts';
import {canAcquireExpeditionHero,acquireExpeditionHero,deployExpeditionHero,refreshExpeditionHero,canCastExpeditionHero,castExpeditionHero,resolveExpeditionHeroCasts,heroAtSlot} from './combat/expedition-heroes';
import {canAcquireExpeditionElite,eliteDamageMultiplier,eliteEffect} from './combat/expedition-elites';
import {SOURCE_WEAPON_PATTERNS} from '../data/expansion-units';
import {expeditionWeaponBonuses,expeditionWeaponUpgrade,expeditionWeaponScale,expeditionAttackRange} from './combat/expedition-combat';
import {fireWeaponPattern,tickWeaponAreas} from './combat/weapon-patterns';
import {tickCarrierSubsystem,tickInterceptor,refreshInterceptorStats,fireInterceptor,cleanupCarrierSummons,isInterceptor} from './combat/carriers';
import {tickTalentSupport} from './combat/talent-support';
import {previewTalentTransfer as previewTransfer,prepareTalentTransfer as prepareTransfer,cancelTalentTransfer as cancelTransfer,finishTalentTransfer as finishTransfer,defaultTalentTransferTarget,talentTransferContains} from './combat/talent-transfer';
import {talentPointsForStage,talentPointsForEndlessMinute} from './progression/talent-profile';
import {ENDLESS,ENDLESS_MAP_ID,ENDLESS_ENTRANCES,endlessConfig,endlessWaveTemplate,endlessEconomicEvents,endlessInterval,endlessGrowth} from '../data/endless';
import {FlatTerrain} from './movement/flat-terrain';
import {expansionProfile,expansionBatch,mainHiveBatch} from '../data/hives';
import {EnemySpecials} from './combat/enemy-specials';
import type {StatusKind} from './combat/statuses';
import {ENEMY_NAMES,bossFor,type SpecialType,type EnemyTier} from '../data/enemies';
import {heroStats,heroRevivalCost,HERO_IDS_BY_RACE,type HeroId} from '../data/heroes';
import {ELITES,eliteStats,type EliteId} from '../data/elites';
import {MAP_REWARDS} from '../data/rewards';
import type {TerrainQuery} from '../data/map-definition';
import {SC2_UNITS,TERRAN,ZERG,SIEGE,HEAL,BILE,HYDRALISK_MELEE,type UnitType,type CombatUnitType,type TerranType,type ZergType} from '../data/sc2-units';
import {OBSTACLES,TUNING,type BuildingType,type Obstacle} from '../data/game';
import {spend} from './rules.mjs';
import {distance,angleDelta,turn,translate,locomote,steerGoal,clearLine,blocked} from './movement/steering';
import {tickCliffTraversal,tickZealotCharge} from './movement/native-traversal';
import {hasCombatPotential} from './combat/combat-presence';
import {incomeFactor,bossHealthFactor,bossDamageFactor,bossAttackSpeedFactor,enemyPressure,eliteGrowth,type Difficulty} from '../data/stages';
import {CAMPAIGN18_ENEMIES,CAMPAIGN18_WEIGHTS,campaign18StageConfig,campaign18Schedule,campaign18Runtime,campaign18TerrainStage,campaign18GuardCounts,type Campaign18StageConfig,type Campaign18Special} from '../data/campaign18';
import {beginExpeditionWindow} from './progression/expedition-drafts';
import {CharTerrain} from '../data/terrain';
import {rankStats} from '../data/ranks';
import {ECONOMY,DROPS} from '../data/economy';
import type {Entity,Point,Pod,Body,Building,Reward,Effect,Pickup,VisualEvent,EconomicTarget,SquadOrder,RewardDrop,HeroRecord,HeroCast,ExpansionHive,Fortification} from './types';

const HERO_SPLASH:Partial<Record<HeroId,{center:'source'|'target';radius:number;arc:number;max:number;fraction:number;plane:'ground'|'same'}>>={
 tychus:{center:'target',radius:.65,arc:360,max:2,fraction:.25,plane:'same'},
 kerrigan:{center:'source',radius:1.8,arc:70,max:2,fraction:.4,plane:'ground'},
 dehaka:{center:'source',radius:2.2,arc:90,max:3,fraction:.5,plane:'ground'},
 stukov:{center:'target',radius:.8,arc:360,max:2,fraction:.3,plane:'same'},
 artanis:{center:'source',radius:1.6,arc:70,max:2,fraction:.3,plane:'ground'},
 alarak:{center:'source',radius:2,arc:90,max:3,fraction:.4,plane:'ground'},
 fenix:{center:'target',radius:1.1,arc:360,max:3,fraction:.35,plane:'same'},
};

export class World extends RunState {
 readonly listeners=new Set<()=>void>();
 private mutationDepth=0;private mutationChanged=false;
 private atomicMutation<T>(run:()=>T):T{this.mutationDepth++;try{return run();}finally{this.mutationDepth--;if(!this.mutationDepth&&this.mutationChanged){this.mutationChanged=false;this.changed();}}}
 terrain?:TerrainQuery;obstacles:Obstacle[];private initialObstacles:Obstacle[]=[];
 private readonly initialTerrain?:TerrainQuery;private readonly endlessTerrain?:TerrainQuery;
 get endlessField(){return this.endlessTerrain;}
 private readonly seed:number;private readonly sandbox:boolean;
 readonly permanentProfile:PermanentProfile;
 private selectedRace:Race;
 awardPermanentResource(receipt:string,amount:number){return this.permanentProfile.award(receipt,amount,this.runConfig?.race??this.selectedRace);}
 setProductionOutputs(line:ProductionLineId,families:FamilyId[]){return setOutputs(this,line,families);}
 setProductionEnabled(family:FamilyId,enabled:boolean){return setEnabled(this,family,enabled);}
 assignHatcherySequence(id:number,line:ProductionLineId){return assignHatchery(this,id,line);}
 isFamilyAvailable(family:FamilyId){return availableFamily(this,family);}
 setDevelopmentTarget(id:string|null){if(!['menu','reward'].includes(this.phase)||id!==null&&!DEVELOPMENT.some(d=>d.id===id&&d.race===this.expedition.race))return false;this.expedition.developmentTarget=id;this.changed();return true;}
 castDetection(){return castDetection(this);}
 castHeroSlot(slotIndex:number){const id=heroAtSlot(this,slotIndex);return id?this.castHero(id):false;}
 castFamilyAbility(family:FamilyId,target?:Point){if(this.familyUnits(family).some(unit=>talentTransferContains(this,unit.id)))cancelTransfer(this);return castFamilyAbility(this,family,target);}
 setFamilyMode(family:FamilyId,mode:string){if(this.familyUnits(family).some(unit=>talentTransferContains(this,unit.id)))cancelTransfer(this);return setFamilyMode(this,family,mode);}
 visibleTo(target:Body,owner:Body['owner']){return visibleTo(this,target,owner);}
 get draftWindowId(){return this.endlessEntry?18:this.endless?18+this.endless.round:this.stage;}
 get draftStage(){return this.endlessEntry||this.endless?17:this.stage;}
 get draftWindowKey(){return this.endlessEntry?.id??String(this.draftWindowId);}
 generateDevelopmentOffers(windowId:string){if(windowId!==this.draftWindowKey||this.phase!=='reward'||this.rewardRound!=='building')return [];this.rewards=developmentOffers(this);return this.rewards;}
 generateReinforcementDraft(windowId:string){if(windowId!==this.draftWindowKey||this.phase!=='reward'||this.rewardRound!=='random')return [];this.rewards=reinforcementOffers(this);return this.rewards;}
 purchaseDevelopmentOffer(windowId:string,id:string){return windowId===this.draftWindowKey&&this.rewardRound==='building'&&this.choose(id);}
 claimReinforcement(windowId:string,id:string){return windowId===this.draftWindowKey&&this.rewardRound==='random'&&this.choose(id);}
 canChooseReward(r:Reward){return offerEligible(this,r)&&this.wallet.minerals>=r.minerals&&this.wallet.gas>=r.gas;}
 private repairQuotes=new Map<string,RepairQuote>();
 previewRepair(ids:number[]){const quote=previewRepair(this,ids);if(quote){this.repairQuotes.clear();this.repairQuotes.set(quote.id,quote);}return quote;}
 purchaseRepair(id:string){const quote=this.repairQuotes.get(id);return !!quote&&repair(this,quote);}
 previewFamilyReplacement(id:string,old:FamilyId){return previewReplacement(this,id,old);}
 commitFamilyReplacement(id:string,old:FamilyId,revision:number){return commitReplacement(this,id,old,revision);}
 rejectIncomingBatch(id:string,revision:number){return rejectReceipt(this,id,revision);}
 planPassengerReceipt(deliveryId:number,passengerId:number){const p=this.pods.find(p=>p.id===deliveryId);if(this.phase!=='battle'||!p||p.status!=='opening'||p.hp<=0||p.passengers[passengerId]?.status!=='waiting'||p.passengers.findIndex(c=>c.status==='waiting')!==passengerId||this.time<p.nextExitAt||this.time-(p.resolvedAt??this.time)<ECONOMY.openingSeconds-1e-8)return false;if([...this.entities.values()].some(u=>u.owner==='zerg'&&u.hp>0&&(p.guardianIds.has(u.id)||distance(u,p)<=6+u.unitRadius))||!this.freePosition(p.unitType,p,1.8,4.5))return false;return receiptNeeded(this,p,passengerId);}
 rerollOffers(windowId:string,kind:'building'|'random'){return windowId===this.draftWindowKey&&kind===this.rewardRound&&refreshOffers(this);}
 get requiresPlayerDecision(){return this.requiresEliteChoice||!!this.expedition.pendingReceipt||!!this.expedition.pendingTalentLoot||this.expedition.eliteRescueRights.length>0;}
 claimTalentLoot(receipt:string,offerId:string,variantId?:EliteId){return this.atomicMutation(()=>claimTalentLoot(this,receipt,offerId,variantId));}
 previewTalentTransfer(target:Point,participantIds?:number[]){return previewTransfer(this,target,participantIds);}
 cancelTalentTransfer(){return cancelTransfer(this);}
 get eliteRescueChoice(){return this.expedition.eliteRescueRights[0]??null;}
 claimEliteRescueRight(receipt:string,variantId?:EliteId){const right=this.eliteRescueChoice;if(!right||right.receipt!==receipt||this.phase!=='battle')return false;const selected=this.resolveEliteVariant(ELITES[right.eliteId as EliteId]?.family,variantId);if(!selected||!this.acquireElite(selected))return false;this.expedition.eliteRescueRights.shift();this.expedition.eliteRescueCompleted.push(receipt);this.changed();return true;}
 declineEliteRescueRight(receipt:string){const right=this.eliteRescueChoice;if(!right||right.receipt!==receipt||this.phase!=='battle')return false;this.expedition.eliteRescueRights.shift();this.expedition.eliteRescueCompleted.push(receipt);this.changed();return true;}
 cancelPendingEliteChoice(id:EliteId){if(this.phase!=='battle'||!this.pendingElites.includes(id))return false;this.pendingElites=this.pendingElites.filter(other=>other!==id);const family=ELITES[id].family;if(!this.familyUnits(family).some(unit=>unit.eliteId===id)&&this.expedition.elitePaths[family]===id)delete this.expedition.elitePaths[family];this.changed();return true;}
 selectRace(race:Race){if(this.phase!=='menu'||!['terran','zerg','protoss'].includes(race))return false;if(!this.permanentProfile.selectRace(race))return false;this.selectedRace=race;this.resetRun();return true;}
 talent(id:string){return this.runConfig?talentRank(this.runConfig.frozenTalents.levels,this.runConfig.race,id):0;}
 get rarityBonus(){return this.talent('rarity_master');}
 soldierCap(){return 5+this.talent('elite_training');}
 private familyCap(){return ROSTER_LIMITS.familyBase+2*this.talent('expanded_squad');}
 get totalRosterCap(){return (this.talent('expanded_squad')?ROSTER_LIMITS.ordinaryExpanded:ROSTER_LIMITS.ordinaryBase)+ROSTER_LIMITS.heroes;}
 get rosterCap(){return this.familyCap();}
 private readonly initialUnits:readonly TerranType[];private readonly useDiagnosticInitial:boolean;private readonly configuredWaves:boolean;
 private autoWaves:boolean;
 enemySpecials=new EnemySpecials(this);
 get endlessElapsed(){return this.endless?this.time-this.endless.startedAt:0;}
 constructor(options:{seed?:number;waves?:boolean;obstacles?:Obstacle[];initial?:TerranType[];difficulty?:Difficulty;sandbox?:boolean;terrain?:boolean|TerrainQuery;endlessTerrain?:TerrainQuery;permanentProfile?:PermanentProfile;rulesVersion?:string;race?:Race}={}){
  super();this.permanentProfile=options.permanentProfile??new PermanentProfile();this.selectedRace=options.race??this.permanentProfile.activeRace;this.initialUnits=[...(options.initial??TUNING.initialSquad)];this.useDiagnosticInitial=!!options.sandbox&&options.initial!==undefined;this.configuredWaves=options.waves??true;
  this.seed=options.seed??89241;this.rngState=this.seed;this.autoWaves=options.waves??true;this.sandbox=options.sandbox??false;this.difficulty=options.difficulty??'normal';this.obstacles=options.obstacles??OBSTACLES;this.terrain=typeof options.terrain==='object'?options.terrain:(options.terrain??(!this.sandbox&&options.obstacles===undefined))?new CharTerrain():undefined;this.initialTerrain=this.terrain;this.endlessTerrain=options.endlessTerrain??new FlatTerrain();if(this.terrain?.definition&&options.obstacles===undefined)this.obstacles=[];this.initialObstacles=[...this.obstacles];
  this.initializeRun();
 }
 private initializeRun(){this.expedition=newExpedition(this.selectedRace);this.battlefield={mode:'campaign',mapId:'campaign-kairos-v1',mapHash:this.mapIdentity(this.initialTerrain)};this.expedition.talentLootRngState=(this.seed^0x9e3779b9)>>>0;this.terrain?.setStage?.(this.stage);const baseline:readonly UnitType[]=this.selectedRace==='zerg'?['zergling','zergling']:this.selectedRace==='protoss'?['zealot']:['marine'];const initial=this.useDiagnosticInitial?this.initialUnits:baseline;initial.forEach((t,i)=>this.addUnit(t,'terran',-i*1.15,(i%2)*1.4));
  this.wallet={minerals:this.selectedRace==='protoss'?0:50,gas:0};
  if(!this.sandbox){for(const u of this.allies()){const p=this.moveGoal(u);u.x=p.x;u.z=p.z;u.prev={...p};}}
  this.prepareStage();
 }
 /** Keep World identity: all controls, map views and listeners refer to this same instance. */
 resetRun(difficulty:Difficulty=this.difficulty){
  Object.assign(this,new RunState());
  this.terrain=this.initialTerrain;this.obstacles=[...this.initialObstacles];this.difficulty=difficulty;this.rngState=this.seed;this.autoWaves=this.configuredWaves;
  this.enemySpecials=new EnemySpecials(this);this.initializeRun();this.changed();
 }
 private mapIdentity(terrain=this.terrain){return terrain instanceof FlatTerrain?FlatTerrain.id:terrain?.definition?terrain.definition.source.sha256:terrain?'builtin-char-v1':'none';}
 captureRun():RunSnapshot {
  if(!this.runId||this.phase==='menu')throw Error('尚未开始战局');
  if(!this.runConfig)throw Error('战局配置缺失');
  return {schema:RUN_SCHEMA,rules:RUN_RULES,config:structuredClone(this.runConfig),map:this.mapIdentity(),seed:this.seed,autoWaves:this.autoWaves,sandbox:this.sandbox,state:selectRunData(this),statuses:this.statuses.snapshot(),specials:this.enemySpecials.snapshot()};
 }
 /** Validate detached state before touching the live World or its listeners. */
 restoreRun(snapshot:RunSnapshot,validateOnly=false){
  if(snapshot?.schema!==RUN_SCHEMA||snapshot.rules!==RUN_RULES)throw Error('续局版本不兼容；请使用对应版本或保留导出档案');
  if(snapshot.seed!==this.seed||snapshot.config?.seed!==snapshot.seed||snapshot.config.rulesId!==RUN_RULES||snapshot.config.campaignId!=='campaign-18'||snapshot.config.mapId!=='campaign-kairos-v1'||snapshot.config.mapHash!==this.mapIdentity(this.initialTerrain)||snapshot.sandbox!==this.sandbox||typeof snapshot.autoWaves!=='boolean')throw Error('续局运行配置不兼容');
  const fresh=new RunState();validateRunData(snapshot.state,fresh);
  if(!snapshot.state.runConfig||JSON.stringify(snapshot.config)!==JSON.stringify(snapshot.state.runConfig)||snapshot.config.difficulty!==snapshot.state.difficulty||snapshot.config.race!==snapshot.state.expedition.race)throw Error('续局配置与状态不一致');
  const terrain=snapshot.state.battlefield.mode==='endless'?this.endlessTerrain:this.initialTerrain;
  if((!terrain&&!this.sandbox)||snapshot.map!==this.mapIdentity(terrain)||snapshot.state.battlefield.mapHash!==snapshot.map)throw Error('续局地图版本不匹配');
  const data=structuredClone(snapshot),statuses=new CombatStatuses(),specials=new EnemySpecials(this);
  statuses.restore(data.statuses);specials.restore(data.specials);if(validateOnly)return;
  Object.assign(this,fresh,data.state);this.selectedRace=data.config.race;this.statuses=statuses;this.enemySpecials=specials;this.autoWaves=data.autoWaves;
  this.terrain=terrain;this.obstacles=data.state.battlefield.mode==='endless'?[]:[...this.initialObstacles];this.terrain?.setStage?.(this.terrainStage);this.input={x:0,z:0};if(this.phase==='battle')this.paused=true;
  this.spawnCells=connectedSpawnCells(this.terrain,this.anchor,this.mapHalf,this.obstacles);
  const bodies:Body[]=[...this.entities.values(),...this.pods.filter(p=>p.status==='active'||p.status==='opening'),...[...this.economicTargets.values()].filter(e=>e.status==='active'),...this.expansionHives.values(),...this.fortifications.values()];if(this.hive&&this.hive.hp>0)bodies.push(this.hive);this.hash.rebuild(bodies);
  this.changed();
 }
 get config(){if(this.configStage!==this.stage||this.configDifficulty!==this.difficulty||!!this.endless!==('endlessId' in (this.stageData??{}))){this.stageData=this.endless?endlessConfig(this.difficulty):campaign18StageConfig(this.stage,this.difficulty);this.configStage=this.stage;this.configDifficulty=this.difficulty;}return this.stageData;}
 get terrainStage(){return campaign18TerrainStage(this.stage);}
 get mapHalf(){return this.terrain instanceof FlatTerrain?FlatTerrain.half:this.terrain?.definition?Math.max(this.terrain.definition.width,this.terrain.definition.height):this.sandbox?TUNING.worldHalf:this.config.width/2;}
 get duration(){return this.config.durationSeconds;}
 /** Whole-squad commands are simulation intent; picking and feedback live in the renderer. */
 cancelOrder(){this.order=null;this.movePending.clear();this.commandRoute=null;this.marchDirection={x:0,z:0};}
 private resetCommand(){this.cancelOrder();this.navigation.clear();this.detours.clear();for(const u of this.allies()){u.attackTarget=null;u.thinkAt=0;}this.input={x:0,z:0};}
 private commandPoint(point:Point):Point|null {
  const radius=.9,half=this.mapHalf;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>=half||Math.abs(point.z)>=half)return null;
  const candidates:Point[]=[{x:point.x,z:point.z}];for(const r of [.5,1,1.5,2,3])for(let i=0;i<16;i++)candidates.push({x:point.x+Math.sin(i*Math.PI/8)*r,z:point.z+Math.cos(i*Math.PI/8)*r});
  for(const p of candidates){if(Math.abs(p.x)+radius>=half||Math.abs(p.z)+radius>=half||blocked(p,radius,this.obstacles)||this.terrain&&!this.terrain.canOccupy(p,radius))continue;
   if(distance(this.anchor,p)<.15||distance(this.anchor,steerGoal(this.anchor,p,radius,this.obstacles,this.terrain,half))>.01)return p;
  }return null;
 }
 issueMove(point:Point){if(this.talentTransferPlan)cancelTransfer(this);if(this.phase!=='battle'||this.paused||this.requiresPlayerDecision)return false;const goal=this.commandPoint(point);if(!goal){this.announce('该位置无法通行');return false;}
  this.resetCommand();this.order={kind:'move',point:goal,arrived:false,issuedAt:this.time};for(const u of this.allies())this.movePending.add(u.id);this.changed();return true;
 }
 private updateCommand(dt:number):Point {
  if(Math.hypot(this.input.x,this.input.z)>.01){if(this.talentTransferPlan)cancelTransfer(this);if(this.order)this.cancelOrder();return this.input;}
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
 prepareStage(){if(this.endless){this.prepareEndlessRound();return;}
  this.terrain?.setStage?.(this.terrainStage);
  const plan=campaign18Schedule(this.config as Campaign18StageConfig,this.seed);
  this.waves=plan.waves;this.specialPlan=plan.specials;this.nextSpecial=0;this.lordWarningPoint=null;
  this.eventPlan=plan.events;this.stageWave=0;this.nextEvent=0;this.scheduledStage=this.stage;
  this.nextWave=this.stageStartedAt+(this.waves[0]?.at??Infinity);
  this.spawnCells=connectedSpawnCells(this.terrain,this.anchor,this.mapHalf,this.obstacles);
  if(this.campaign18Runtime?.stage!==this.stage||this.campaign18Runtime.difficulty!==this.difficulty)this.campaign18Runtime=campaign18Runtime(this.config as Campaign18StageConfig,plan);
  this.hiveWarningPoint=null;this.nextExpansionAt=plan.expansionHive&&!this.campaign18Runtime.expansionSpawned?this.stageStartedAt+plan.expansionHive.at:Infinity;
  if(plan.mainHive&&!this.hive){const expected=this.terrain?.definition?.hive,p=expected?this.spawnCells.filter(p=>this.terrain!.canOccupy(p,3)).sort((a,b)=>distance(a,expected)-distance(b,expected))[0]??this.eventPoint():this.spawnCells.reduce((a,b)=>b.z<a.z?b:a,{x:0,z:0}),hp=(this.difficulty==='easy'?9000:12000)*campaign18EnemyPressure(this.difficulty,this.stage).health;
   this.hive={id:this.nextId++,...p,hp,maxHp:hp,armor:2,unitRadius:3,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg',race:'zerg',team:'enemy'};this.campaign18Runtime.spawned.mainHive+=this.campaign18Runtime.mainStructureBudget;
  }
  this.mainHiveNextBatchAt=Infinity;this.mainHivePending=[];
 }
 /** Campaign victory is a saved decision, never an automatic map switch. */
 chooseCampaignExit(action:'evacuate'|'endless'){
  if(this.phase!=='won'||this.stage!==18||this.endless||!this.runId)return false;
  if(action==='evacuate'){this.phase='finished';this.endlessEntry=null;this.changed();return true;}
  return this.beginEndlessPreparation();
 }
 beginEndlessPreparation(){
  if(this.phase!=='won'||this.stage!==18||this.endless||!this.runId)return false;
  if(this.endlessEntry?.ready){this.phase='endless-ready';this.changed();return true;}
  if(!this.endlessEntry){this.endlessEntry={id:this.runId+':endless-entry',revision:0,ready:false};this.rewardRound='building';this.rewards=[];}
  this.phase='reward';this.rewardClaimed=false;
  if(this.expedition.draftWindow!==18)beginExpeditionWindow(this.expedition,17,18,this.talent('window_shop'));
  this.rewards=this.rewards.length?this.rewards:this.rewardRound==='building'?developmentOffers(this):reinforcementOffers(this);this.changed();return true;
 }
 backFromEndlessPreparation(){if(!this.endlessEntry||!['reward','endless-ready'].includes(this.phase))return false;this.phase='won';this.changed();return true;}
 /** Pure placement plan. Every body is assigned before the campaign field is changed. */
 previewEndlessTransition(){
  const entry=this.endlessEntry,terrain=this.endlessTerrain;
  if(this.phase!=='endless-ready'||!entry?.ready||!this.runId||!(terrain instanceof FlatTerrain)||this.endless)return null;
  const occupied:{x:number;z:number;r:number}[]=this.endlessFortSites().map(([kind,p])=>({...p,r:kind==='bunker'?1.6:2}));
  const place=(radius:number,min:number,max:number,origin:Point={x:0,z:0})=>{for(let d=min;d<=max;d+=.75)for(let i=0;i<96;i++){const angle=i*2.399963229728653,p={x:origin.x+Math.cos(angle)*d,z:origin.z+Math.sin(angle)*d};if(!terrain.canOccupy(p,radius)||occupied.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<radius+q.r+.35))continue;occupied.push({...p,r:radius});return p;}return null;};
  const allies=new Map<number,Point>(),pods=new Map<number,Point>(),guards=new Map<number,Point>();
  for(const u of [...this.entities.values()].filter(u=>u.team==='player'&&u.hp>0).sort((a,b)=>a.id-b.id)){const p=place(u.unitRadius,2,10);if(!p)return null;allies.set(u.id,p);}
  for(const pod of this.pods.filter(p=>['falling','active','opening'].includes(p.status)).sort((a,b)=>a.id-b.id)){
   const p=place(pod.unitRadius,16,40);if(!p)return null;pods.set(pod.id,p);
   for(const id of [...pod.guardianIds].sort((a,b)=>a-b)){const guard=this.entities.get(id);if(!guard||guard.hp<=0)continue;const q=place(guard.unitRadius,6,10,p);if(!q)return null;guards.set(id,q);}
  }
  return {requestId:entry.id,expectedRevision:entry.revision,mapId:ENDLESS_MAP_ID,mapHash:this.mapIdentity(terrain),allies,pods,guards};
 }
 private endlessReadyToken:string|null=null;
 registerEndlessReadyToken(token:string){const plan=this.previewEndlessTransition();if(!plan||token!==`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`)return false;this.endlessReadyToken=token;return true;}
 commitEndlessTransition(requestId:string,expectedRevision:number,readyToken:string){
  const plan=this.previewEndlessTransition();if(!plan||plan.requestId!==requestId||plan.expectedRevision!==expectedRevision||readyToken!==this.endlessReadyToken)return false;
  const terrain=this.endlessTerrain!;
  for(const [id,u] of this.entities)if(u.team==='enemy'&&!plan.guards.has(id)){this.entities.delete(id);this.statuses.removeTarget(id);}
  for(const [id,p] of plan.allies){const u=this.entities.get(id)!;u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};u.attackTarget=null;u.pendingTarget=null;u.windup=0;}
  for(const [id,p] of plan.guards){const u=this.entities.get(id)!;u.x=p.x;u.z=p.z;u.prev={...p};u.velocity={x:0,z:0};u.attackTarget=null;u.pendingTarget=null;}
  for(const [id,p] of plan.pods){const pod=this.pods.find(p=>p.id===id)!;pod.x=p.x;pod.z=p.z;}
  this.terrain=terrain;this.battlefield={mode:'endless',mapId:ENDLESS_MAP_ID,mapHash:plan.mapHash};this.anchor={x:0,z:0,facing:0};this.trail=[{x:0,z:0}];this.resetCommand();
  this.obstacles=[];this.pods=this.pods.filter(p=>['falling','active','opening'].includes(p.status));this.enemySpecials=new EnemySpecials(this);
  this.expansionHives.clear();this.hive=null;this.economicTargets.clear();this.pickups=[];this.rewardDrops=[];this.effects=[];this.corrosionZones=[];this.ambientBacklog=[];this.campaign18Runtime=null;this.expedition.detectionFields=[];this.expedition.spells=[];this.hiveWarningPoint=null;this.lordWarningPoint=null;
  this.endless={round:1,startedAt:this.time,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};
  this.stageElapsed=0;this.stageStartedAt=this.time;this.phase='battle';this.paused=false;this.endlessTransitionReceipt=requestId;this.endlessEntry=null;this.endlessReadyToken=null;
  this.spawnCells=terrain.connectedLocations?.(this.anchor,.9,1.4)??[];this.placeEndlessFortifications();this.prepareEndlessRound();this.announce('无尽战场 · 守住小队');return true;
 }
 /** Obsolete direct entry is deliberately unavailable without prepared assets. */
 startEndless(){return false;}
 private prepareEndlessRound(){if(this.terrain?.connectedLocations)this.spawnCells=this.terrain.connectedLocations(this.anchor,.9,1.4);this.waves=endlessWaveTemplate(this.seed,this.endless!.round,this.difficulty);this.stageWave=0;this.specialPlan=[];this.nextSpecial=0;this.eventPlan=endlessEconomicEvents(this.seed,this.endless!.round);this.nextEvent=0;this.scheduledStage=this.stage;this.nextWave=this.stageStartedAt+(this.waves[0]?.at??Infinity);this.nextExpansionAt=this.difficulty==='hell'?this.stageStartedAt+ENDLESS.expansion.firstAt:Infinity;this.hiveWarningPoint=null;}
 private endlessFortSites():[Fortification['kind'],Point][]{return [['bunker',{x:0,z:-12}],['bunker',{x:12,z:0}],['bunker',{x:0,z:12}],['bunker',{x:-12,z:0}],['repair',{x:6,z:6}]];}
 private placeEndlessFortifications(){this.fortifications.clear();for(const [kind,point] of this.endlessFortSites()){const hp=kind==='bunker'?900:650,radius=kind==='bunker'?1.6:2;this.fortifications.set(this.nextId,{id:this.nextId++,...point,hp,maxHp:hp,armor:kind==='bunker'?2:1,unitRadius:radius,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',kind,nextActionAt:this.time});}}
 private endlessPodPoint(){const candidates=this.spawnCells.filter(p=>distance(p,this.anchor)>=4&&distance(p,this.anchor)<=11&&[...this.fortifications.values()].every(f=>f.hp<=0||distance(p,f)>f.unitRadius+3)&&this.pods.every(pod=>!['falling','active','opening'].includes(pod.status)||distance(p,pod)>pod.unitRadius+3));return {...(candidates[Math.floor(this.random()*candidates.length)]??this.eventPoint(4,11))};}
 private updateEndlessSpawns(dt:number){const state=this.endless!;
   for(const source of ['elite','boss'] as const){state.progress[source]=Math.min(1,state.progress[source]+dt/(endlessInterval(source,this.endlessElapsed)*(source==='elite'&&this.difficulty==='easy'?2:1)));if(state.progress[source]<1-1e-8)continue;
    if(this.time<state.retry[source])continue;const n=source==='elite'?state.elites:state.bosses,type=ENDLESS.types[n%ENDLESS.types.length],tier=source==='boss'&&n%3===2?'lord':source;
    if(this.spawnSpecial(type,tier)){state.progress[source]=0;}else state.retry[source]=this.time+1;
  }
 }
 eventPoint(min=6,max=Infinity,origin:Point=this.anchor){const candidates=this.spawnCells.filter(p=>distance(p,origin)>=min&&distance(p,origin)<=max);const pool=candidates.length?candidates:this.spawnCells;return {...(pool[Math.floor(this.random()*pool.length)]??{x:0,z:0})};}
 get hiveFrenzy(){return this.expansionHives.size>0;}
 enemyDamageFactor(u:Entity){if(u.owner!=='zerg')return 1;const frenzy=this.hiveFrenzy?(u.enemyTier==='boss'||u.enemyTier==='lord' ? .1 : .2):0;return 1+Math.max(frenzy,this.auraDamage.get(u.id)??0);}
 enemyAttackSpeedFactor(u:Entity){if(u.owner!=='zerg')return 1;const frenzy=this.hiveFrenzy?(u.enemyTier==='boss'||u.enemyTier==='lord' ? .1 : .2):0;return (1+Math.max(frenzy,this.auraAttackSpeed.get(u.id)??0,this.statuses.value(u.id,'bloodlust',this.time)))*(this.time<(u.attackSlowUntil??0)?1-(u.attackSlowFactor??0):1);}
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
  if(!this.endless){this.updateCampaignHives();return;}
  if(this.difficulty==='hell'&&this.nextExpansionAt<Infinity){const profile=ENDLESS.expansion;
   if(this.time>=this.nextExpansionAt-profile.warningSeconds&&!this.hiveWarningPoint&&this.expansionHives.size<profile.maxAlive&&this.nextExpansionAt-this.stageStartedAt<=profile.latestAt){this.hiveWarningPoint=this.expansionPoint();if(this.hiveWarningPoint)this.announce('扩张虫巢即将出现 · 5 秒');}
   if(this.time>=this.nextExpansionAt-1e-8){if(this.hiveWarningPoint&&this.expansionHives.size<profile.maxAlive&&this.stageElapsed<=profile.latestAt){const p=this.hiveWarningPoint,hive:ExpansionHive={id:this.nextId++,...p,hp:profile.hp,maxHp:profile.hp,armor:profile.armor,unitRadius:2.4,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg',race:'zerg',team:'enemy',stage:this.stage,spawnedAt:this.time,nextBatchAt:this.time+profile.firstBatchDelay,batchSerial:0,pending:[],rewarded:false};this.expansionHives.set(hive.id,hive);this.announce('扩张虫巢出现 · 击毁以解除亢奋');}
    this.hiveWarningPoint=null;this.nextExpansionAt+=profile.interval;if(this.nextExpansionAt-this.stageStartedAt>profile.latestAt)this.nextExpansionAt=Infinity;
   }
  }
  for(const hive of this.expansionHives.values()){if(hive.hp<=0)continue;if(hive.nextBatchAt<=this.time+1e-8&&!hive.pending.length)hive.pending=expansionBatch(hive.stage,++hive.batchSerial);
   if(hive.pending.length&&this.releaseHiveBatch(hive,hive.pending))hive.nextBatchAt=this.time+ENDLESS.expansion.batchInterval;
  }
  if(this.hive&&this.hive.hp>0&&this.mainHiveNextBatchAt<=this.time+1e-8){if(!this.mainHivePending.length)this.mainHivePending=mainHiveBatch(++this.mainHiveBatch);
   if(this.releaseHiveBatch(this.hive,this.mainHivePending))this.mainHiveNextBatchAt=this.time+18;
  }
 }
 /** The campaign never borrows the legacy hive's unlimited reinforcement generator. */
 private updateCampaignHives(){const state=this.campaign18Runtime;if(!state)return;
  if(this.nextExpansionAt<Infinity){
   if(this.time>=this.nextExpansionAt-5&&!this.hiveWarningPoint&&this.expansionHives.size<2){this.hiveWarningPoint=this.expansionPoint();if(this.hiveWarningPoint){this.nextExpansionAt=Math.max(this.nextExpansionAt,this.time+5);this.announce('扩张虫巢即将出现 · 5 秒');}}
   if(this.time>=this.nextExpansionAt-1e-8){state.expansionSpawned=true;this.nextExpansionAt=Infinity;
    if(this.hiveWarningPoint&&this.expansionHives.size<2){const profile=expansionProfile(this.terrainStage),p=this.hiveWarningPoint,hive:ExpansionHive={id:this.nextId++,...p,hp:profile.hp,maxHp:profile.hp,armor:profile.armor,unitRadius:2.4,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg',race:'zerg',team:'enemy',stage:this.terrainStage,spawnedAt:this.time,nextBatchAt:Infinity,batchSerial:0,pending:[],rewarded:false};this.expansionHives.set(hive.id,hive);state.expansionId=hive.id;state.spawned.expansionHive+=state.expansionStructureBudget;this.announce('扩张虫巢出现 · 本关仅此一座');}
    else state.withheld+=state.expansionStructureBudget;
    this.hiveWarningPoint=null;
   }
  }
  for(const batch of state.hiveBatches){const hive=batch.kind==='main'?this.hive:state.expansionId===null?undefined:this.expansionHives.get(state.expansionId);
   if(batch.kind==='expansion'&&!state.expansionSpawned)continue;
   if(!hive||hive.hp<=0){state.withheld+=batch.types.reduce((n,t)=>n+CAMPAIGN18_WEIGHTS[t],0);batch.types=[];continue;}
   if(batch.at>this.stageElapsed+1e-8)continue;
   let serial=0;while(batch.types.length&&this.enemyCount()<TUNING.enemyCap){const type=batch.types[0],p=this.hiveSpawnPoint(hive,serial++);if(!p)break;batch.types.shift();const u=this.addUnit(type,'zerg',p.x,p.z);u.guardOrigin=true;state.spawned[batch.kind==='main'?'mainHive':'expansionHive']+=CAMPAIGN18_WEIGHTS[type];}
  }
  tickMainHive(this,TUNING.step);
 }
 private spawnCampaignSpecial(event:Campaign18Special){if(this.enemyCount()>=TUNING.enemyCap)return undefined;const radius=SC2_UNITS[event.type].unitRadius*TUNING.unitScale*(event.tier==='elite'?1.2:1.7),candidates=this.spawnCells.filter(p=>distance(p,this.anchor)>8&&!blocked(p,radius,this.obstacles)&&(!this.terrain||this.terrain.canOccupy(p,radius))),p=candidates[Math.floor(this.random()*candidates.length)];if(!p)return undefined;
  const u=this.addUnit(event.type,'zerg',p.x,p.z),pressure=campaign18EnemyPressure(this.difficulty,this.stage);u.enemyTier=event.tier;u.enemyName=SC2_UNITS[event.type].zh+(event.role==='captain'?' · 精英队长':' · 主要首领');u.visualScale=event.tier==='elite'?1.2:1.7;u.unitRadius=radius;u.specialReady=event.type==='queen'?Infinity:this.time+2;
  if(event.tier==='boss'){const data=bossFor(event.type as SpecialType),factor=this.difficulty==='easy'?.5:.9,damageFactor=(this.difficulty==='easy'?1:1.2)*pressure.damage;u.hp=u.maxHp=data.hp*factor*pressure.health;u.armor=data.armor;u.weaponDamage=SC2_UNITS[event.type].attackDamage*2*damageFactor;u.specialDamageMultiplier=damageFactor;u.attackPeriod=SC2_UNITS[event.type].attackPeriod/((this.difficulty==='easy'?1:this.stage===6?1.05:1.2)*pressure.attackSpeed);}
  else {const level=eliteGrowth(this.difficulty,this.terrainStage);u.enemyLevel=level.level;u.hp=u.maxHp=u.maxHp*3*level.health;u.armor+=1+level.armor;u.weaponDamage*=1.3*level.damage;u.attackPeriod/=1.1*level.attackSpeed;}
  if(this.campaign18Runtime)this.campaign18Runtime.spawned.specials+=event.budget;return u;
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
 changed(){if(this.mutationDepth){this.mutationChanged=true;return;}this.revision++;if(this.endlessEntry&&this.phase==='reward')this.endlessEntry.revision++;for(const fn of this.listeners)fn();}
 announce(text:string){this.notice=text;this.noticeUntil=this.time+7;this.changed();}
 start(starterHero?:HeroId){if(this.phase!=='menu')return false;
  if(!this.permanentProfile.selectRace(this.selectedRace))return false;
  const frozen=this.permanentProfile.freezeRun();
  if(talentRank(frozen.levels,this.selectedRace,'hero_support')){
   if(!starterHero||!HERO_IDS_BY_RACE[this.selectedRace].includes(starterHero as never)||!this.canAcquireHero(starterHero)){this.announce('请选择本族可用的开局英雄');return false;}
  }
  this.expedition.talentPreset=this.permanentProfile.activePreset;
  this.runConfig={rulesId:RUN_RULES,race:this.selectedRace,difficulty:this.difficulty,campaignId:'campaign-18',seed:this.seed,mapId:'campaign-kairos-v1',mapHash:this.mapIdentity(this.initialTerrain),frozenTalents:frozen};
  const growth=this.talent('self_growth'),mercenary=this.talent('mercenary'),support=this.talent('tank_support');
  this.nextEliteGrowthAt=growth?(growth===1?360:240):Infinity;this.nextMercenaryAt=mercenary?(mercenary===1?240:120):Infinity;this.nextTankSupportAt=support?[Infinity,90,60,45][support]:Infinity;
  this.allies().forEach(u=>this.refreshStats(u));this.runId=globalThis.crypto?.randomUUID?.()??String(Date.now())+'-'+String(this.random());
  this.phase='battle';if(talentRank(frozen.levels,this.selectedRace,'hero_support'))this.acquireHero(starterHero!);if(!this.sandbox)this.updateProduction(0);this.changed();return true;
 }
 allies(){const allies:Entity[]=[];for(const u of this.entities.values())if(u.owner==='terran'&&u.hp>0&&!u.summonKind)allies.push(u);return allies;}
 enemyCount(){let n=0;for(const u of this.entities.values())if(u.owner==='zerg'&&u.hp>0)n++;return n;}
 addUnit(unitType:CombatUnitType,owner:'terran'|'zerg',x:number,z:number,rank=1){
  const d=SC2_UNITS[unitType];const occupied=new Set(owner==='terran'?this.allies().filter(a=>a.unitType===unitType).map(a=>a.slot):[]);let slot=0;while(occupied.has(slot))slot++;
  const u:Entity={id:this.nextId++,unitType,owner,race:combatRace(unitType),team:owner==='terran'?'player':'enemy',x,z,prev:{x,z},
   hp:d.maxHp,maxHp:d.maxHp,armor:d.armor,moveSpeed:d.movementSpeed,attackRange:d.attackRange,weaponDamage:d.attackDamage,weaponCooldown:0,attackPeriod:d.attackPeriod,attackFacing:Math.PI/2,
   attackTarget:null,facing:Math.PI/2,velocity:{x:0,z:0},unitRadius:d.unitRadius*TUNING.unitScale,rank,attributes:[...d.attributes],flying:d.flying,
   slot:owner==='terran'?slot:0,trailIndex:Math.max(0,this.trail.length-1),action:'spawn',mode:'tank',desiredMode:'tank',modeTimer:0,
   windup:0,attackLock:0,pendingTarget:null,lastShotAt:-100,nextShotAt:0,shotInterval:d.attackPeriod,repositionUntil:0,aimStartedAt:null,energy:unitType==='medivac'?HEAL.startEnergy:0,maxEnergy:HEAL.maxEnergy,energyRegen:HEAL.regen,healRate:HEAL.hpPerSecond,healTarget:null,bileCooldown:3,
   guardianPod:null,stimUntil:0,deadAt:null,bornAt:this.time,thinkAt:0,distanceWalked:0};
  if(!isAirHeroType(unitType))this.refreshStats(u,true);if(owner==='zerg'){
   if(!this.sandbox){if(unitType==='zergling')u.hp=u.maxHp=this.config.lingHp;if(unitType==='roach'&&this.stage>=8)u.armor++;if(unitType==='baneling'&&this.stage>=9)u.hp=u.maxHp=35;}
   const chapter=campaign18ChapterGrowth(this.difficulty,this.stage),pressure=campaign18EnemyPressure(this.difficulty,this.stage);
   u.maxHp*=chapter.health*pressure.health;u.hp=u.maxHp;u.weaponDamage*=chapter.damage*pressure.damage;u.attackPeriod/=chapter.attackSpeed*pressure.attackSpeed;u.moveSpeed*=pressure.moveSpeed;
   u.nativeStatScale={hp:u.maxHp/d.maxHp,damage:chapter.damage*pressure.damage,period:u.attackPeriod/d.attackPeriod,move:u.moveSpeed/d.movementSpeed,armor:u.armor-d.armor};
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
 refreshStats(u:Entity,fill=false){
  if(refreshInterceptorStats(this,u,fill))return;
  if(u.heroId){refreshExpeditionHero(this,u,fill);return;}
  refreshExpeditionStats(this,u,fill);
 }
 heroEntity(id:HeroId){const record=this.heroes.get(id);return record?.entityId!==null&&record?.entityId!==undefined?this.entities.get(record.entityId):undefined;}
 canAcquireHero(id:HeroId){return canAcquireExpeditionHero(this,id);}
 acquireHero(id:HeroId){return acquireExpeditionHero(this,id);}
 private deployHero(record:HeroRecord,revival:boolean){return deployExpeditionHero(this,record,revival);}
 revivalCost(rank:number){const base=heroRevivalCost(rank),factor=1-.1*this.talent('permanent_discount');return factor===1?base:{minerals:Math.max(1,Math.ceil(base.minerals*factor)),gas:Math.max(1,Math.ceil(base.gas*factor))};}
 canReviveHero(id:HeroId){const h=this.heroes.get(id),cost=h?this.revivalCost(h.rank):null;return this.phase==='reward'&&!!h&&!h.revivePaid&&!h.awaitingSpawn&&!(this.heroEntity(id)?.hp)&&this.wallet.minerals>=cost!.minerals&&this.wallet.gas>=cost!.gas;}
 reviveHero(id:HeroId){if(!this.canReviveHero(id))return false;const h=this.heroes.get(id)!,cost=this.revivalCost(h.rank);if(!spend(this.wallet,cost))return false;h.revivePaid=true;this.economyTotals.purchases.minerals+=cost.minerals;this.economyTotals.purchases.gas+=cost.gas;this.changed();return true;}
 private deployPendingHeroes(newStage=false){for(const h of this.heroes.values()){if(newStage&&h.revivePaid)h.awaitingSpawn=true;if(h.awaitingSpawn)this.deployHero(h,h.revivePaid);}}
 canCastHero(id:HeroId){return canCastExpeditionHero(this,id);}
 castHero(id:HeroId){const unit=this.heroEntity(id);if(unit&&talentTransferContains(this,unit.id))cancelTransfer(this);return castExpeditionHero(this,id);}
 private resolveHeroCasts(){resolveExpeditionHeroCasts(this);}
 eliteOwned(id:EliteId){return this.allies().find(u=>u.eliteId===id);}
 canAcquireElite(id:EliteId){return canAcquireExpeditionElite(this,id);}
 eliteVariants(family:FamilyId){const locked=this.expedition?.elitePaths[family];return Object.values(ELITES).filter(elite=>elite.family===family&&(!locked||elite.id===locked)&&this.canAcquireElite(elite.id)).sort((a,b)=>a.id.localeCompare(b.id));}
 resolveEliteVariant(family:FamilyId|undefined,variantId?:EliteId):EliteId|null {if(!family)return null;const variants=this.eliteVariants(family);if(variantId)return variants.some(elite=>elite.id===variantId)?variantId:null;return variants.length===1?variants[0].id:null;}
 eliteCandidates(id:EliteId){return this.ordinaryUnits(ELITES[id].family).filter(u=>this.ordinaryCapacity(ELITES[id].family)-(this.soldierCap()-u.rank)>=this.reservedRanks(ELITES[id].family));}
 get eliteChoice(){return this.pendingElites.find(id=>this.eliteCandidates(id).length>0);}
 get requiresEliteChoice(){return !!this.eliteChoice;}
 acquireElite(id:EliteId){if(!this.canAcquireElite(id))return false;const owned=this.eliteOwned(id);if(owned){owned.rank++;this.refreshStats(owned);}else if(this.familyUnits(ELITES[id].family).length<this.familyCap()){
  const type=ELITES[id].family,pos=this.freePosition(type,this.anchor);if(!pos)return false;
  const u=this.addUnit(type,'terran',pos.x,pos.z);u.eliteId=id;u.modelKey=ELITES[id].model;u.specialReady=this.time+15;this.refreshStats(u);this.announce(ELITES[id].name+' · 已加入队伍');
 }else {this.pendingElites.push(id);this.announce(ELITES[id].name+' · 选择替换队员；已付费增援优先保留');}this.expedition.elitePaths[ELITES[id].family]=id;this.changed();return true;}
 replaceWithElite(id:EliteId,targetId:number){if(!this.pendingElites.includes(id)||!this.eliteCandidates(id).some(u=>u.id===targetId))return false;const u=this.entities.get(targetId)!;u.eliteId=id;u.rank=1;u.modelKey=ELITES[id].model;u.specialReady=this.time+15;this.refreshStats(u);this.pendingElites=this.pendingElites.filter(e=>e!==id);this.changed();return true;}
 private attackHit(u:Entity,target:Body,damage:number,bonuses:{attribute:string;amount:number}[],hits=1,shieldBonus=0,primary=true,crit=1){const factor=(u.eliteId==='marine.2'&&target.attributes.includes('Armored')?1.25:1)*this.enemyDamageFactor(u)*eliteDamageMultiplier(u,target),before=target.hp,penetration=u.owner==='zerg'&&u.unitType==='hydralisk'&&(u.enemyTier==='elite'||u.enemyTier==='lord')&&u.enemyLevel&&u.enemyLevel>=3?[0,0,.25,.35,.4][u.enemyLevel-1]:0,scaled=bonuses.map(b=>({...b,amount:b.amount*factor*crit}));this.hit(target,damage*factor*crit,scaled,hits,u.owner,.5,penetration,u.id,false,false,shieldBonus*factor*crit,primary);
  if(primary&&target.hp>0&&(talentModifiers(this,u).apmDuplicate??0)>0)this.hit(target,damage*hits*factor*crit,scaled.map(b=>({...b,amount:b.amount*hits})),1,u.owner,.5,penetration,u.id,false,false,shieldBonus*hits*factor*crit,true);
  const e=this.entities.get(target.id);if(e&&e.hp>0&&u.eliteId==='marauder.1'){e.slowUntil=this.time+1.5;e.slowFactor=e.enemyTier==='boss'?.15:.3;}
  if(e&&e.hp>0&&u.owner==='zerg'&&u.unitType==='roach'&&(u.enemyTier==='elite'||u.enemyTier==='lord')&&(u.enemyLevel??1)>=2){this.applyStatus(e,u,'acidArmor',[0,1,1.5,2,3][(u.enemyLevel??1)-1],4);}
  if(e&&e.hp>0&&u.eliteId==='hellion.2'){const key=u.id+':'+target.id,old=this.burns.get(key);this.burns.set(key,{source:u.id,target:target.id,damage:(before-target.hp)*.2,next:old?.next??this.time+1,until:this.time+3});}
  if(u.eliteId==='marauder.2'&&this.time>=(u.specialReady??0)&&target.hp>0){u.specialReady=this.time+15;this.hit(target,damage*3,bonuses.map(b=>({...b,amount:b.amount*3})),hits,u.owner);this.effect('explosion',u,target,.6,.35);}
 }
 private updateBurns(){for(const [key,b] of this.burns){const target=this.entities.get(b.target);if(!target||target.hp<=0){this.burns.delete(key);continue;}while(b.next<=this.time+1e-8&&b.next<=b.until+1e-8){this.hit(target,b.damage+target.armor,[],1,'terran',0);b.next+=1;}if(this.time>=b.until)this.burns.delete(key);}}
 private updateElite(u:Entity,dt:number){if(u.eliteId==='marine.1'&&u.stimUntil>this.time)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.01*dt);if(u.eliteId==='tank.1'){const baseRange=expeditionAttackRange(this,u);if(u.mode==='siege'&&u.modeTimer<=0){u.siegeSince??=this.time;u.attackRange=baseRange+Math.min(3,Math.floor((this.time-u.siegeSince)/3));}else {u.siegeSince=undefined;u.attackRange=baseRange;}}}
 reservedRanks(type:UnitType){return paidReservations(this,type);}
 familyUnits(type:UnitType){return this.allies().filter(u=>u.unitType===type&&!u.heroId&&!u.temporary);}
 ordinaryUnits(type:UnitType){return this.familyUnits(type).filter(u=>!u.eliteId);}
 ordinaryCapacity(type:UnitType){const units=this.ordinaryUnits(type),cap=this.soldierCap();return (this.familyCap()-this.familyUnits(type).length)*cap+units.reduce((n,u)=>n+cap-u.rank,0);}
 availableCapacity(type:UnitType){if(!this.expedition.familySlots.includes(type))return Math.max(0,this.familyCap()-this.reservedRanks(type));return Math.max(0,this.ordinaryCapacity(type)-this.reservedRanks(type));}
 freePosition(type:CombatUnitType,origin:Point,min=.8,max=8){const radius=SC2_UNITS[type].unitRadius*TUNING.unitScale,air=SC2_UNITS[type].flying;
  for(let r=min;r<=max;r+=.5)for(let i=0;i<20;i++){const p={x:origin.x+Math.sin(i*Math.PI/10)*r,z:origin.z+Math.cos(i*Math.PI/10)*r};if(Math.abs(p.x)+radius>=this.mapHalf||Math.abs(p.z)+radius>=this.mapHalf||!air&&!clearLine(origin,p,radius,this.obstacles,this.terrain)||[...this.entities.values()].some(u=>u.hp>0&&u.flying===air&&distance(u,p)<u.unitRadius+radius+.12)||!air&&this.pods.some(pod=>['active','opening'].includes(pod.status)&&distance(pod,p)<pod.unitRadius+radius+.12)||!air&&[...this.fortifications.values()].some(f=>distance(f,p)<f.unitRadius+radius+.3))continue;return p;}return null;
 }
 reinforce(type:UnitType,p:Point){const same=this.ordinaryUnits(type);
  if(this.familyUnits(type).length<this.familyCap())return this.addUnit(type,'terran',p.x,p.z,1);
  same.sort((a,b)=>a.rank-b.rank||a.id-b.id);const lowest=same[0];if(!lowest)throw Error('No legal cultivation recipient');if(lowest.rank<this.soldierCap()){lowest.rank++;this.refreshStats(lowest);}return lowest;
 }
 capacity(type:UnitType){return this.availableCapacity(type)>0;}
 productionCost=(type:UnitType)=>{const q=productionQuote(this,type);return {minerals:q.minerals,gas:q.gas};};
 buildingsOf(type:BuildingType){return [...this.buildings.values()].filter(b=>b.type===type);}
 addBuilding(type:BuildingType,remaining=0){const inheritedLab=type==='factory'&&this.talent('instant_tech')>0&&this.buildingsOf('factory').some(b=>b.techLab)&&this.random()<Math.min(.99,.33*this.talent('instant_tech'));const b:Building={id:this.nextBuilding++,type,remaining,queue:[],techLab:inheritedLab,upgradeRemaining:null};this.buildings.set(b.id,b);return b;}
 updateProduction(dt:number){updateExpeditionProduction(this,dt,!this.sandbox);}
 podPurpose(type:UnitType,count=1){const added=Math.min(count,this.familyCap()-this.familyUnits(type).length),promoted=Math.min(count-added,Math.max(0,this.ordinaryCapacity(type)-added));return [added?'新增 '+added:'',promoted?'晋升 '+promoted:''].filter(Boolean).join(' / ')||'培养已满';}
 spawnPod(type:UnitType,position?:Point,jobId=0,quantity=1,freeConscript=false){const p=position??(this.endless&&this.terrain===this.endlessTerrain?this.endlessPodPoint():this.eventPoint(this.stage<=3?7:14,this.stage<=3?13:32)),c=this.config;
  this.nextGuardCounts=campaign18GuardCounts(this.stage,this.difficulty,this.campaign18Runtime?this.campaign18Runtime.guardSerial++:0).counts;
  const guardTypes:UnitType[]=CAMPAIGN18_ENEMIES.flatMap(t=>Array<Campaign18Special['type']>((this.nextGuardCounts as import('../data/campaign18').Campaign18Counts)[t]).fill(t));
  const pod:Pod={number:++this.podSerial,id:this.nextId++,...p,hp:c.podHp,maxHp:c.podHp,armor:TUNING.podArmor,unitRadius:1.25,flying:false,attributes:['Armored','Structure'],owner:'terran',unitType:type,
   createdAt:this.time,landedAt:this.time+ECONOMY.landingSeconds,guardianIds:new Set(),guardTypes,status:'falling',resolvedAt:null,recruitId:null,jobId,stage:this.stage,passengers:Array.from({length:quantity},()=>({status:'waiting',entityId:null})),nextExitAt:0,freeConscript};this.pods.push(pod);
  this.announce(SC2_UNITS[type].zh+' 增援即将落地');return pod;
 }
 landPod(p:Pod){p.status='active';p.landedAt=this.time;const radius=p.stage<=3?4:p.stage<=8?6:8;
  p.guardTypes.forEach((t,i)=>{const pos=this.nearbyPoint(p,radius,i/p.guardTypes.length*Math.PI*2),e=this.addUnit(t,'zerg',pos.x,pos.z);if(t==='zergling'){e.hp=e.maxHp=campaign18StageConfig(p.stage,this.difficulty).lingHp*campaign18ChapterGrowth(this.difficulty,p.stage).health*campaign18EnemyPressure(this.difficulty,p.stage).health;}e.guardianPod=p.id;e.guardOrigin=true;if(p.stage>=4&&i===0)e.detector=true;p.guardianIds.add(e.id);});
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
 targetAllowed(u:Entity,b:Body){return validAttackTarget(this,u,b);}
 edgeDistance(a:Body,b:Body){return Math.max(0,distance(a,b)-a.unitRadius-b.unitRadius);}
 hasAttackLine(u:Entity,b:Body){return !this.terrain||this.attackLines.clear(this.terrain,this.stage,u,b);}
 canFireAt(u:Entity,b:Body,tolerance=0){const d=this.edgeDistance(u,b);return (unitData(u).targetType!=='none'&&!(u.unitType==='lurker'&&u.nativeMode!=='lurker_burrowed'))&&u.unitType!=='medivac'&&this.targetAllowed(u,b)&&d<=u.attackRange+tolerance&&d>=(u.mode==='siege'?SIEGE.minRange:0)&&this.hasAttackLine(u,b);}
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
 private qualifiedKill(sourceId?:number){let source=sourceId===undefined?undefined:this.entities.get(sourceId);
  if(source?.summonKind==='interceptor'){
   const child=source,owner=child.rewardOwnerId===undefined?undefined:this.entities.get(child.rewardOwnerId);
   if(child.team!=='player'||child.rewardSourceKind==='temporary'||!child.rewardSourceKind||child.rewardOwnerId!==child.summonOwnerId)return false;
   source=owner&&owner.bornAt===child.rewardOwnerGeneration&&owner.team==='player'&&!owner.temporary&&owner.hp>0?owner:undefined;
  }else if(!source||source.team!=='player'||source.hp<=0||source.temporary||source.summonKind)return false;
  if(source&&!source.heroId&&!source.eliteId&&!isAirHeroType(source.unitType)){
   const members=this.ordinaryUnits(source.unitType).filter(u=>u.rank<this.soldierCap()),eligible=members.filter(u=>this.availableCapacity(u.unitType as UnitType)>0),candidate=this.talent('battle_review')?eligible.sort((a,b)=>a.rank-b.rank||a.id-b.id)[0]:eligible.find(u=>u.id===source!.id);
   const mentor=this.familyUnits(source.unitType).some(u=>!!u.eliteId&&u.hp>0&&!u.temporary),chance=.01*(this.talent('experience_summary')+this.talent('battle_review'))+(mentor?.03*this.talent('teach_experience'):0);
   if(candidate&&chance>0&&this.random()<chance){candidate.rank++;this.refreshStats(candidate);}
  }
  if(this.talent('reinforcement')&&this.time>=this.nextFreePodAt){
   const pool=this.expedition.familySlots.filter(f=>availableFamily(this,f)&&this.capacity(f)).map(f=>({family:f,missing:this.rosterCap-this.familyUnits(f).length,average:this.ordinaryUnits(f).reduce((sum,u)=>sum+u.rank,0)/Math.max(1,this.ordinaryUnits(f).length)})).sort((a,b)=>b.missing-a.missing||a.average-b.average||a.family.localeCompare(b.family));
   if(pool.length&&this.random()<.01*this.talent('reinforcement')){this.spawnPod(pool[0].family,undefined,this.nextJob++,1,true);this.nextFreePodAt=this.time+60;}
  }
  if(this.talent('proliferate')&&this.allies().filter(u=>u.temporaryKind==='proliferate'&&u.hp>0).length<this.talent('proliferate')){
   const candidates=(this.expedition.race==='terran'?['marine','marauder']:this.expedition.race==='zerg'?['zergling','roach']:['zealot','adept']).filter(f=>availableFamily(this,f as FamilyId)) as UnitType[];
   if(candidates.length&&this.random()<.005*this.talent('proliferate')){const index=this.expedition.temporaryOrdinaryCursor++%candidates.length,type=candidates[index],p=this.freePosition(type,this.anchor,.8,6);if(p){const u=this.addUnit(type,'terran',p.x,p.z,5);u.temporary=true;u.temporaryKind='proliferate';u.temporaryUntil=this.time+30;this.refreshStats(u,true);}}
  }
  return true;
 }
 private rollTalentLoot(){const state=this.expedition;state.talentLootRngState=(Math.imul(state.talentLootRngState,1664525)+1013904223)>>>0;return state.talentLootRngState/4294967296;}
 private issueTalentLoot(enemy:Entity){const rank=this.talent('rarity_master');if(!rank||enemy.enemyTier==='boss'||enemy.enemyTier==='lord')return;
  for(const rarity of ['orange','purple'] as const){const chance=rarity==='orange'?.005*rank:.01*rank;if(this.rollTalentLoot()>=chance)continue;
   const receipt=`${this.runId}:enemy:${enemy.id}:${rarity}`;if(this.expedition.talentLootReceipts.includes(receipt))continue;this.expedition.talentLootReceipts.push(receipt);
   const reward:Reward={id:`talent.${rarity}`,offerId:receipt,sold:false,name:rarity==='orange'?'出金大师 · 橙色选择':'出金大师 · 紫色选择',description:'拾取后从同品质合法奖励中免费选一项。',icon:'ui.minerals',rarity,kind:'economy',value:'talent-loot',minerals:0,gas:0,baseMinerals:0,baseGas:0,discount:0};
   this.rewardDrops.push({id:this.nextId++,x:enemy.x,z:enemy.z,reward,talentLoot:{rarity,receipt}});
  }
 }
 private issueEliteRescue(target:EconomicTarget){const rank=this.talent('elite_scout');if(!rank)return;const receipt=`${this.runId}:worker:${target.id}`;
  if(this.expedition.eliteRescueCompleted.includes(receipt)||this.expedition.eliteRescueRights.some(right=>right.receipt===receipt))return;
  const candidates=Object.values(ELITES).filter(elite=>this.canAcquireElite(elite.id)&&!this.expedition.eliteRescueRights.some(right=>ELITES[right.eliteId as EliteId]?.family===elite.family));
  const fresh=candidates.filter(elite=>!this.familyUnits(elite.family).some(unit=>unit.eliteId&&!unit.temporary)),pool=fresh.length?fresh:candidates;
  if(!pool.length||this.random()>=.05*rank)return;
  const families=[...new Set(pool.map(elite=>elite.family))].sort(),family=families[Math.floor(this.random()*families.length)],variants=pool.filter(elite=>elite.family===family).sort((a,b)=>a.id.localeCompare(b.id)),locked=this.expedition.elitePaths[family],selected=locked?variants.find(elite=>elite.id===locked):variants[0];
  if(!selected)return;this.expedition.eliteRescueRights.push({receipt,eliteId:selected.id});this.announce(selected.name+' · 精英救援权可领取或放弃');this.changed();
 }
 private updateTalentSupport(){
  if(this.time>=this.nextEliteGrowthAt){const pool=this.allies().filter(u=>u.eliteId&&u.rank<5).sort((a,b)=>a.rank-b.rank||a.id-b.id);if(pool[0]){pool[0].rank++;this.refreshStats(pool[0]);this.announce(ELITES[pool[0].eliteId!].name+' · 自我成长晋升');}this.nextEliteGrowthAt=this.time+(this.talent('self_growth')===1?360:240);}
  if(this.time>=this.nextMercenaryAt){const families=this.expedition.race==='terran'?['marine','marauder','reaper']:this.expedition.race==='zerg'?['zergling','roach','hydralisk']:['zealot','stalker','immortal'];
   const candidates=families.filter(f=>availableFamily(this,f as FamilyId)).map(f=>{const locked=this.expedition.elitePaths[f as FamilyId];return Object.values(ELITES).filter(e=>e.family===f&&(!locked||locked===e.id)).sort((a,b)=>a.id.localeCompare(b.id))[0];}).filter((e):e is typeof ELITES[EliteId]=>!!e);
   if(candidates.length&&!this.allies().some(u=>u.temporaryKind==='mercenary'&&u.hp>0)){const elite=candidates[this.expedition.temporaryEliteCursor++%candidates.length],p=this.freePosition(elite.family,this.anchor,.8,6);if(p){const u=this.addUnit(elite.family,'terran',p.x,p.z,5);u.eliteId=elite.id;u.modelKey=elite.model;u.temporary=true;u.temporaryKind='mercenary';u.temporaryUntil=this.time+80;this.refreshStats(u,true);this.announce(elite.name+' · 雇佣兵抵达');}}
   this.nextMercenaryAt=this.time+(this.talent('mercenary')===1?240:120);}
  tickTalentSupport(this);
 }
 hit(target:Body,damage:number,bonuses:{attribute:string;amount:number}[]=[],hits=1,sourceOwner:'terran'|'zerg'='terran',minimum=.5,armorPenetration=0,sourceId?:number,forced=false,transferred=false,shieldBonus=0,ordinaryWeapon=false){
  const acid=this.statuses.value(target.id,'acidArmor',this.time),armor=Math.max(0,target.armor+(this.auraArmor.get(target.id)??0)-Math.min(3,acid));
  const friendly=target.owner==='terran'&&sourceOwner==='zerg'?this.entities.get(target.id):undefined,attacker=sourceId===undefined?undefined:this.entities.get(sourceId);
  if(!forced&&ordinaryWeapon&&friendly&&attacker&&this.talent('veteran_dodge')&&this.random()<.03*this.talent('veteran_dodge'))return;
  const bonus=bonuses.reduce((sum,b)=>sum+(target.attributes.includes(b.attribute)?b.amount:0),0),before=target.hp;
  let total=transferred?Math.min(target.hp,Math.max(0,damage)):expeditionDamage(this,target,damage+bonus,hits,minimum,armorPenetration,sourceOwner,armor,sourceId,shieldBonus);
  if(friendly){if(!transferred)total*=1-.04*this.talent('armor_upgrade');friendly.lastDamagedAt=this.time;
   if(!transferred&&!friendly.heroId&&!friendly.temporary&&this.talent('team_share')&&total>0){const partners=this.allies().filter(u=>u.id!==friendly.id&&u.unitType===friendly.unitType&&u.hp>0&&!u.heroId&&!u.temporary&&!(u.lastStandUntil&&u.lastStandUntil>this.time)&&distance(u,friendly)<=8);if(partners.length){const share=total*.2*this.talent('team_share');total-=share;for(const partner of partners)this.hit(partner,share/partners.length,[],1,'zerg',0,1,undefined,false,true);}}
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
   if(economic.kind==='egg'){if(sourceOwner==='terran'&&this.time<economic.expiresAt!-1e-8){economic.status='rescued';this.scvs+=1+this.talent('scv_savior');this.stats.scvsRescued++;this.visual('scv-rescue',economic);this.announce('SCV 已获救 · 自动采集提升');this.issueEliteRescue(economic);}else {economic.status='expired';this.stats.scvsLost++;this.visual('egg-expired',economic);}}
   else {economic.status='killed';this.stats.dronesKilled++;this.visual('drone-death',economic);this.drop(economic,DROPS.drone);this.tryRewardDrop(economic,true);}return;
  }
  if(target.hp<=0&&'unitType' in target&&this.entities.has(target.id)){const e=target as Entity;if(e.deadAt===null){e.deadAt=this.time;e.action='dead';e.velocity={x:0,z:0};this.statuses.removeTarget(e.id);if(e.owner==='zerg')this.nextAuraUpdate=this.time;
    this.visual('death',e);if(e.owner==='zerg'&&!e.summonKind){this.stats.kills++;const drop=(e.guardOrigin||e.guardianPod!==null?DROPS.guard:DROPS.ambient)[e.unitType as ZergType]??[1,0],factor=e.enemyTier==='boss'?20:e.enemyTier==='lord'?24:e.enemyTier==='elite'?3:1;this.drop(e,[drop[0]*factor,drop[1]*factor]);this.tryRewardDrop(e,false,e.enemyTier);if(this.qualifiedKill(sourceId))this.issueTalentLoot(e);}
  }}
 }
 drop(p:Point,amount:readonly [number,number]){const f=incomeFactor(this.difficulty)*ECONOMY.dropMultiplier;this.pickups.push({id:this.nextId++,...p,minerals:amount[0]*f,gas:amount[1]*f});}
 tryRewardDrop(p:Point,drone=false,tier?:EnemyTier){if(tier==='boss'||tier==='lord'||this.random()>=(tier==='elite'?.4:drone?MAP_REWARDS.droneChance:MAP_REWARDS.combatChance))return;const reward=mapReinforcement(this);if(reward)this.rewardDrops.push({id:this.nextId++,...p,reward});}
 collectRewardDrop(id:number){return this.atomicMutation(()=>{const index=this.rewardDrops.findIndex(p=>p.id===id);if(index<0||this.expedition.pendingTalentLoot)return false;const drop=this.rewardDrops[index],ok=drop.talentLoot?openTalentLoot(this,drop.talentLoot.receipt,drop.talentLoot.rarity):collectMapReinforcement(this,drop.reward);if(ok)this.rewardDrops.splice(index,1);this.changed();return ok;});}
 visual(kind:VisualEvent['kind'],body:Body,end:Point=body,castId?:number){const e=this.entities.get(body.id),sequence=e?.shotSequence;this.visualEvents.push({serial:++this.visualSerial,time:this.time,kind,castId,x:body.x,z:body.z,y:(body.flying?5.6:this.terrain?.height(body)??0)+.6,endY:('flying' in end&&end.flying?5.6:this.terrain?.height(end)??0)+.6,unitType:e?.unitType??null,modelKey:e?.modelKey,heroId:e?.heroId,eliteId:e?.eliteId,race:e?.race,shotSequence:sequence,attackId:kind==='attack'&&sequence!==undefined?`${body.id}:${sequence}`:undefined,entityId:body.id,flying:body.flying,end:{x:end.x,z:end.z},facing:kind==='attack'||kind==='skill-launch'?e?.attackFacing??0:e?.facing??0,siege:e?.mode==='siege'});if(this.visualEvents.length>768)this.visualEvents.splice(0,256);}
 effect(kind:Effect['kind'],source:Body,end:Point,radius=.1,duration=.18){const fx:Effect={id:this.nextId++,kind,x:source.x,z:source.z,end:{...end},until:this.time+duration,radius,owner:source.owner,source:source.id};this.effects.push(fx);return fx;}
 fire(u:Entity,target:Body){
  if((u.recoveryUntil??0)>this.time)return;
  if(isInterceptor(u)){fireInterceptor(this,u,target);return;}
  if(u.unitType==='carrier'&&!u.heroId||u.heroId==='purifier_flagship')return;
  if(!this.targetAllowed(u,target)||!this.hasAttackLine(u,target))return;
  const d=unitData(u);
  this.stats.shots++;
  u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.lastShotAt=this.time;u.shotSequence=(u.shotSequence??0)+1;u.nextShotAt=this.time+u.shotInterval;this.visual('attack',u,target);
  const nativeBonus=expeditionWeaponBonuses(this,u),bonus=nativeBonus.bonuses,critChance=u.unitType==='baneling'?0:talentModifiers(this,u).critChance??0,crit=critChance&&this.random()<critChance?1.5:1;let primary=true;
  if(fireWeaponPattern(this,u,target,bonus,(victim,damage,bonuses,hits=1)=>{this.attackHit(u,victim,damage,bonuses,hits,0,primary,primary?crit:1);primary=false;},crit))return;
  if(u.unitType==='hellion'){
   const angle=Math.atan2(target.x-u.x,target.z-u.z),length=6.5*(u.eliteId==='hellion.3'?1.25:1),width=.15*(u.eliteId==='hellion.3'?1.5:1),end={x:u.x+Math.sin(angle)*length,z:u.z+Math.cos(angle)*length};
   this.hash.query(u,11,b=>{if(b.owner===u.owner||b.flying||b.hp<=0||!this.hasAttackLine(u,b))return;const along=(b.x-u.x)*Math.sin(angle)+(b.z-u.z)*Math.cos(angle);const across=Math.abs((b.x-u.x)*Math.cos(angle)-(b.z-u.z)*Math.sin(angle));if(along>=0&&along<=length+b.unitRadius&&across<=width+b.unitRadius)this.attackHit(u,b,u.weaponDamage,bonus,1,0,b.id===target.id,b.id===target.id?crit:1);});this.effect('flame',u,end,.35,.35);
  }else if(u.unitType==='baneling'){
   const radius=2.2*eliteEffect(u,'explosionRadiusMultiplier'),source=SOURCE_WEAPON_PATTERNS.baneling,explosion=eliteEffect(u,'explosionDamageMultiplier'),structureDamage=(source.structureDamage+expeditionWeaponUpgrade(this,u,source.structureEffectId).damage)*expeditionWeaponScale(this,u)*this.enemyDamageFactor(u)*explosion;
   this.hash.query(u,radius+2,b=>{if(b.owner!==u.owner&&!b.flying&&(!this.terrain||this.terrain.walkLine(u,b,0))&&this.edgeDistance(u,b)<=radius){const structure=b.attributes.includes('Structure');this.hit(b,structure?structureDamage:u.weaponDamage*this.enemyDamageFactor(u)*explosion,structure?[]:bonus.map(entry=>({...entry,amount:entry.amount*this.enemyDamageFactor(u)*explosion})),1,u.owner,.5,structure?1-source.structureArmorReduction:0,u.id);}});
   this.effect('explosion',u,u,radius,.55);
   if(u.team==='player'&&u.race==='zerg'){u.recoveryUntil=this.time+5;u.velocity={x:0,z:0};u.action='idle';u.windup=0;u.pendingTarget=null;u.attackTarget=null;this.visual('baneling-recover',u);}
   else this.hit(u,u.hp+u.armor,[],1,u.owner,0,1);
  }else if(u.mode==='siege'){
   const damage=u.weaponDamage*this.enemyDamageFactor(u),scaledBonuses=bonus.map(entry=>({...entry,amount:entry.amount*this.enemyDamageFactor(u)}));
   this.hash.query(target,3,b=>{if(b.id===u.id||b.flying||b.hp<=0)return;const r=distance(target,b),primaryHit=b.id===target.id,band=SIEGE.splash.find(s=>r<=s.radius*(u.eliteId==='tank.2'?1.25:1)+b.unitRadius*.25);if(primaryHit||band){const fraction=band?.fraction??1,scaled=scaledBonuses.map(entry=>({...entry,amount:entry.amount*fraction*(primaryHit?crit:1)}));this.hit(b,damage*fraction*(primaryHit?crit:1),scaled,1,u.owner,.5,0,u.id,false,false,0,primaryHit);if(primaryHit&&b.hp>0&&(talentModifiers(this,u).apmDuplicate??0)>0)this.hit(b,damage*crit,scaledBonuses.map(entry=>({...entry,amount:entry.amount*crit})),1,u.owner,.5,0,u.id,false,false,0,true);}});this.effect('explosion',u,target,1.25,.4);
  }else {this.attackHit(u,target,u.weaponDamage,bonus,d.attacks,nativeBonus.shieldBonus,true,crit);
   const splash=u.heroId?HERO_SPLASH[u.heroId]:undefined;
   if(splash){
    const center=splash.center==='source'?u:target,angle=u.attackFacing,extra=[...this.entities.values()].filter(b=>b.id!==target.id&&b.owner!==u.owner&&b.hp>0&&(splash.plane==='ground'?!b.flying:b.flying===target.flying)&&this.hasAttackLine(u,b)&&distance(center,b)<=splash.radius+b.unitRadius&&(splash.arc===360||Math.abs(angleDelta(Math.atan2(b.x-u.x,b.z-u.z),angle))<=splash.arc*Math.PI/360)).sort((a,b)=>distance(center,a)-distance(center,b)||a.id-b.id).slice(0,splash.max);
    for(const victim of extra){const factor=this.enemyDamageFactor(u)*eliteDamageMultiplier(u,victim),fraction=splash.fraction;this.hit(victim,u.weaponDamage*fraction*factor,bonus.map(entry=>({...entry,amount:entry.amount*fraction*factor})),u.heroId==='artanis'?2:1,u.owner,.5,0,u.id,false,false,0,false);}
   }
   this.effect('shot',u,target,.1,u.unitType==='marine'?.1:.2);}
 }
 toggleTanks(){if(this.allies().some(u=>u.unitType==='tank'&&talentTransferContains(this,u.id)))cancelTransfer(this);if(this.phase!=='battle'||this.paused||this.requiresPlayerDecision)return false;const tanks=this.allies().filter(u=>u.unitType==='tank');if(!tanks.length)return false;this.tankCommand=this.tankCommand==='tank'?'siege':'tank';for(const u of tanks)u.desiredMode=this.tankCommand;this.changed();return true;}
 updateTank(u:Entity,_anchorDistance:number,dt:number){if(u.unitType!=='tank')return false;
  if(u.modeTimer>0){u.modeTimer=Math.max(0,u.modeTimer-dt);u.velocity={x:0,z:0};if(u.modeTimer<=1e-8){u.mode=u.action==='sieging'?'siege':'tank';u.siegeSince=u.mode==='siege'?this.time:undefined;u.action='idle';this.refreshStats(u);}return true;}
  if(u.mode!==u.desiredMode){u.action=u.desiredMode==='siege'?'sieging':'unsieging';u.modeTimer=Math.max(.25,(u.desiredMode==='siege'?SIEGE.deploySeconds:SIEGE.undeploySeconds)*(this.upgrades.has('siege')?.8:1)*(u.eliteId==='tank.3'?.75:1)*(1-(talentModifiers(this,u).transformTimeReductionPct??0)));u.siegeSince=undefined;u.velocity={x:0,z:0};u.windup=0;u.pendingTarget=null;return true;}
  return false;
 }
 heal(u:Entity,dt:number){return healExpedition(this,u,dt);}
 updateBile(u:Entity,dt:number){u.bileCooldown-=dt;if(u.bileCooldown>0)return;const radius=BILE.radius*eliteEffect(u,'bileRadiusMultiplier');const target=[...this.entities.values()].filter(e=>e.hp>0&&e.owner!==u.owner&&this.visibleTo(e,u.owner)&&this.edgeDistance(u,e)<=BILE.range&&this.hasAttackLine(u,e)&&!this.effects.some(f=>f.kind==='bile'&&f.owner===u.owner&&f.until>this.time&&distance(f.end,e)<radius*1.5)).sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id)[0];
  if(target&&this.edgeDistance(u,target)<=BILE.range){const fx=this.effect('bile',u,target,radius,BILE.delay);fx.damage=BILE.damage*(u.weaponDamage/SC2_UNITS.ravager.attackDamage)*this.enemyDamageFactor(u)*(1+(talentModifiers(this,u,'bile').abilityDamagePct??0))*eliteEffect(u,'bileDamageMultiplier');u.bileCooldown=BILE.cooldown*eliteEffect(u,'bileCooldownMultiplier')*(1-(talentModifiers(this,u,'bile').abilityCooldownReductionPct??0));}else u.bileCooldown=.12;
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
  if(!combatDetour&&distance(goal,b)<u.unitRadius+b.unitRadius+.1&&distance(u,b)<r+.2)return u;
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
 separation(u:Entity){const v={x:0,z:0};let n=0;this.hash.queryPlane(u,2.8,u.flying,b=>{if(n>=12)return false;if(b.id===u.id)return;const dx=u.x-b.x,dz=u.z-b.z,d2=dx*dx+dz*dz,min=u.unitRadius+b.unitRadius+.15;if(d2<min*min){if(!u.flying&&this.terrain&&!this.terrain.sameContactLayer(u,b))return;const d=Math.sqrt(d2),strength=Math.min(3,(min-d)*5);if(d>.001){v.x+=dx/d*strength;v.z+=dz/d*strength;}else{const a=(Math.min(u.id,b.id)*7+Math.max(u.id,b.id)*13)*2.399,sign=u.id<b.id?1:-1;v.x+=Math.sin(a)*strength*sign;v.z+=Math.cos(a)*strength*sign;}n++;}});return v;}
 private moveWhileAiming(u:Entity,dt:number){
  const before={x:u.x,z:u.z},speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1)*(this.zoneSlowed.has(u.id)?.8:1)*(this.time<(u.moveSlowUntil??0)?1-(u.moveSlowFactor??0):1);
  translate(u,{x:this.marchDirection.x*speed*dt,z:this.marchDirection.z*speed*dt},u.unitRadius,u.flying,this.obstacles,this.mapHalf,this.terrain);
  u.velocity.x=(u.x-before.x)/dt;u.velocity.z=(u.z-before.z)/dt;u.distanceWalked+=distance(before,u);
 }
 updateUnit(u:Entity,dt:number){if(u.hp<=0)return;if(tickInterceptor(this,u,dt))return;if(!u.heroId&&u.unitType==='lurker'&&u.owner==='zerg'){const near=[...this.entities.values()].some(e=>e.owner==='terran'&&e.hp>0&&this.visibleTo(e,'zerg')&&distance(u,e)<9);u.desiredNativeMode=near?'lurker_burrowed':'lurker';}if(u.owner==='terran'&&!u.heroId&&this.tick%6===0)refreshExpeditionStats(this,u);tickExpeditionRecovery(this,u,dt);
  if(u.lastStandUntil&&this.time>=u.lastStandUntil){u.lastStandUntil=undefined;this.hit(u,u.hp+u.armor+1,[],1,'zerg',0,0,undefined,true);return;}if(u.temporaryUntil&&this.time>=u.temporaryUntil){this.hit(u,u.hp+u.armor+1,[],1,'zerg',0,0,undefined,true);return;}
  if(u.recoveryUntil){if(this.time+1e-8<u.recoveryUntil){u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';return;}u.recoveryUntil=undefined;}
  if(talentTransferContains(this,u.id)){u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='idle';return;}
  const micro=talentModifiers(this,u);tickAutoAbilities(this,u);if((u.stoppedUntil??0)>this.time||tickNativeMode(this,u)){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};return;}this.updateElite(u,dt);if(u.owner==='terran'&&!u.flying)this.movementStall.set(u.id,u.action==='move'&&u.mode==='tank'&&u.modeTimer<=0&&distance(u,u.prev)<u.moveSpeed*dt*.15?(this.movementStall.get(u.id)??0)+dt:0);u.prev.x=u.x;u.prev.z=u.z;if(u.unitType!=='medivac')u.healTarget=null;
  u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);
  if(u.cliffTransit&&tickCliffTraversal(this,u,u.cliffTransit.to,dt))return;
  if(u.heroId==='nova'&&this.heroCasts.some(c=>c.source===u.id&&c.at>this.time)){u.velocity={x:0,z:0};u.action='skill';return;}
  const anchorDistance=distance(u,this.anchor);
  if(this.updateTank(u,anchorDistance,dt))return;
  if(this.enemySpecials.act(u,dt))return;
  if(u.unitType==='ravager'&&!u.enemyTier)this.updateBile(u,dt);
  if(u.owner==='terran'&&this.order?.kind==='move'&&this.order.arrived&&distance(u,this.moveGoal(u))<.45+u.unitRadius*.5)this.movePending.delete(u.id);
  const marching=u.owner==='terran'&&Math.hypot(this.marchDirection.x,this.marchDirection.z)>.01&&u.mode!=='siege';
  if(u.windup>0){u.windup-=dt;if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};u.action='attack';
   const b=this.body(u.pendingTarget);if(b){const heading=Math.atan2(b.x-u.x,b.z-u.z);u.attackFacing=turn(u.attackFacing,heading,(u.unitType==='tank'?6:u.unitType==='hellion'?4.8:u.owner==='terran'?CONTROL.infantryTurnRate:9)*(micro.aimingSpeedMultiplier??1)*dt);if(u.unitType!=='tank')u.facing=u.attackFacing;}
   if(u.windup>1e-8)return;
   if(this.time+1e-8<u.nextShotAt){u.windup=u.nextShotAt-this.time;return;}
   if(b&&this.canFireAt(u,b,.5)){if(Math.abs(angleDelta(u.attackFacing,Math.atan2(b.x-u.x,b.z-u.z)))<.3)this.fire(u,b);else if(!marching||this.time-(u.aimStartedAt??this.time)<CONTROL.maxMovingAim){u.windup=dt;return;}}
   u.pendingTarget=null;u.windup=0;u.attackLock=0;u.aimStartedAt=null;if(marching)u.repositionUntil=this.time+((micro.movingFireChance??0)>0&&this.random()<micro.movingFireChance!?0:CONTROL.repositionSeconds);if(u.hp<=0)return;}
  if(u.unitType==='medivac')u.attackTarget=null;
  else if(this.time>=u.thinkAt||u.attackTarget!==null&&!this.body(u.attackTarget)?.hp){
   u.attackTarget=this.findTarget(u,u.owner==='terran'?u.attackRange+2:16)?.id??null;u.thinkAt=this.time+(u.owner==='terran'?CONTROL.thinkSeconds+(u.id%4)*CONTROL.thinkSpread:.12+(u.id%5)*.012);
  }
  let target=this.body(u.attackTarget);if(target&&!this.targetAllowed(u,target))target=undefined;
  if(u.owner==='terran'&&this.order?.kind==='move'&&this.order.arrived&&anchorDistance<=TUNING.softLeash&&target&&this.canFireAt(u,target))this.movePending.delete(u.id);
  const leash=anchorDistance>TUNING.softLeash,hard=anchorDistance>TUNING.hardLeash;
  if(target)selectWeapon(this,u,target);const closeDefense=target&&this.edgeDistance(u,target)<=2.5;
  if(u.unitType==='tank'&&target)u.attackFacing=turn(u.attackFacing,Math.atan2(target.x-u.x,target.z-u.z),6*dt);
  const marchingRearTarget=marching&&u.unitType==='hellion'&&target&&Math.abs(angleDelta(Math.atan2(this.marchDirection.x,this.marchDirection.z),Math.atan2(target.x-u.x,target.z-u.z)))>1.2;
  if(marching&&u.aimStartedAt!==null&&this.time-u.aimStartedAt>CONTROL.maxMovingAim){u.repositionUntil=this.time+CONTROL.repositionSeconds;u.aimStartedAt=null;}
  if(target&&this.canFireAt(u,target)&&!marchingRearTarget&&(!marching||this.time>=u.repositionUntil)&&(!hard||u.mode==='siege'||u.owner==='zerg'||closeDefense)&&u.weaponCooldown<=1e-8&&this.time+Math.max(dt,SC2_UNITS[u.unitType].damagePoint,marching?CONTROL.movingWindup:0)+1e-8>=u.nextShotAt){
   u.aimStartedAt??=this.time;const heading=Math.atan2(target.x-u.x,target.z-u.z);if(u.unitType!=='tank')u.attackFacing=u.facing=turn(u.facing,heading,(u.unitType==='hellion'?4.8:u.owner==='terran'?CONTROL.infantryTurnRate:9)*(micro.aimingSpeedMultiplier??1)*dt);
   if(Math.abs(angleDelta(u.attackFacing,heading))<.3){const data=SC2_UNITS[u.unitType],stim=u.stimUntil>this.time?1.5:1;
    u.weaponCooldown=(u.unitType==='hydralisk'&&this.edgeDistance(u,target)<=HYDRALISK_MELEE.range?HYDRALISK_MELEE.period*u.attackPeriod/SC2_UNITS.hydralisk.attackPeriod:u.attackPeriod)/stim/(u.slowUntil&&u.slowUntil>this.time?1-(u.slowFactor??0):1)/this.enemyAttackSpeedFactor(u)/(1-Math.min(.3,this.statuses.value(u.id,'neural',this.time)));u.shotInterval=u.weaponCooldown;u.windup=Math.max(dt,data.damagePoint,marching?CONTROL.movingWindup:0);u.attackLock=u.windup;u.pendingTarget=target.id;u.action='attack';if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};return;}
   // A committed firing turn must not be cancelled by formation steering in the same tick.
   if(marching)this.moveWhileAiming(u,dt);else u.velocity={x:0,z:0};u.action='idle';return;
  }
  u.aimStartedAt=null;
  if(u.mode==='siege'||u.nativeMode==='lurker_burrowed'){u.action='idle';u.velocity={x:0,z:0};return;}
  if((!hard||u.owner==='zerg')&&tickZealotCharge(this,u,target,dt))return;
  let goal:Point=u.owner==='terran'?this.moveGoal(u):(target??{x:0,z:0});
  const pursuit=target;
  const deploying=u.owner==='terran'&&u.unitType!=='medivac'&&pursuit&&!marching&&!hard&&this.anchorStoppedFor>.15&&distance(pursuit,this.anchor)<=u.attackRange+3;
  if(deploying)goal=this.engagement.goal(u,pursuit!,this.movementAllies??this.allies(),this.anchor,this.time,this.mapHalf,this.obstacles,this.terrain);
  if(u.owner==='zerg'&&u.guardianPod!==null){const p=this.pods.find(p=>p.id===u.guardianPod&&p.status==='active');if(p&&(!target||u.id%3!==0&&distance(u,target)>4))goal=p;}
  if(u.owner==='zerg'&&target&&this.edgeDistance(u,target)<=u.attackRange*.85)goal=u;

  // Hold a useful firing position while the anchor is still; do not turn back to the slot after every bullet.
  if(u.owner==='terran'&&u.unitType!=='medivac'&&target&&!hard&&this.anchorStoppedFor>.1&&this.edgeDistance(u,target)<=u.attackRange&&this.hasAttackLine(u,target)&&(!deploying||distance(u,goal)<.22)){u.velocity={x:0,z:0};u.action='idle';return;}
  if(u.unitType==='medivac'||u.unitType==='science_vessel'){const patient=this.heal(u,dt);if(patient&&!hard){
   if(this.edgeDistance(u,patient)<=HEAL.range+eliteEffect(u,'healingRangeAdd',0)){if(this.anchorStoppedFor>.15){u.velocity.x=0;u.velocity.z=0;return;}}
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
  let speed=u.moveSpeed*(u.stimUntil>this.time?1.5:1)*(u.slowUntil&&u.slowUntil>this.time?1-(u.slowFactor??0):1)*(this.zoneSlowed.has(u.id)?.8:1)*(this.time<(u.moveSlowUntil??0)?1-(u.moveSlowFactor??0):1);
  if(u.owner==='terran'&&micro.catchupThreshold!==undefined&&distance(u,this.anchor)>micro.catchupThreshold)speed*=1+(micro.catchupSpeedPct??0);
  if(u.owner==='terran'&&hard)speed*=TUNING.catchUp;
  if(u.owner==='zerg'){const stage=this.config;speed*=stage.speed*this.enemyMoveFactor(u);if(u.unitType==='baneling'&&this.stage>=9)speed*=1.3;}
  if(!u.flying){
   // Native movers may cross a nearby legal cliff toward explicit movement intent.
   // Keep ordinary ground navigation and its ramp restrictions unchanged.
   const rawGoal=u.owner==='terran'&&this.order?.kind==='move'&&!this.order.arrived?this.order.point:goal;
   if(tickCliffTraversal(this,u,rawGoal,dt)){this.navigation.delete(u.id);return;}
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
   const index=p.passengers.indexOf(passenger),job=this.expedition.ledger.find(j=>j.id===p.jobId),tactical=job?.passengers[index]?.purpose==='tacticalProgress';
   const pos=tactical||this.familyUnits(p.unitType).length<this.familyCap()?this.freePosition(p.unitType,p,1.8,4.5):p;if(!pos||!tactical&&this.ordinaryCapacity(p.unitType)<=0)continue;
   if(!tactical&&receiptNeeded(this,p,index))return;releasePaidPassenger(this,p,index,pos);
  }
 }}
 spawnWave(){if(this.scheduledStage!==this.stage)this.prepareStage();const wave=this.waves[this.stageWave];if(!wave)return;this.wave++;this.stageWave++;wave.types.forEach((type,i)=>this.ambientBacklog.push({type,bearing:wave.bearing,at:this.time+i*this.config.entranceSpacing,...!this.endless?{campaignStage:this.stage,detector:this.stage>=4&&this.stageWave===1&&i===0}:{detector:i===0}}));this.ambientBacklog.sort((a,b)=>a.at-b.at);this.nextWave=this.stageStartedAt+(this.waves[this.stageWave]?.at??Infinity);this.releaseAmbient();}
 private releaseAmbient(){let slots=Math.max(0,TUNING.enemyCap-this.enemyCount());while(slots-->0&&this.ambientBacklog.length&&this.ambientBacklog[0].at<=this.time+1e-8){
   if(this.endless){const e=this.ambientBacklog[0],radius=SC2_UNITS[e.type].unitRadius*TUNING.unitScale,start=(this.seed+this.stats.ambientSpawned)%ENDLESS_ENTRANCES.length;let entry:Point|undefined;for(let i=0;i<ENDLESS_ENTRANCES.length;i++){const p=ENDLESS_ENTRANCES[(start+i)%ENDLESS_ENTRANCES.length];if(this.allies().every(u=>distance(u,p)>=18)&&this.terrain?.canOccupy(p,radius)){entry=p;break;}}if(!entry)break;this.ambientBacklog.shift();const unit=this.addUnit(e.type,'zerg',entry.x,entry.z);if(e.detector)unit.detector=true;this.stats.ambientSpawned++;continue;}
  const e=this.ambientBacklog.shift()!,base=this.eventPoint(Math.min(12,this.mapHalf*.75)),angle=this.stage===2?(this.stats.ambientSpawned%2?0:Math.PI):e.bearing+(this.stage>=5&&slots%2?Math.PI:0);
  // Distribute a wave along its approach arc; do not stack every attacker on one point.
  const arc=angle+((this.stats.ambientSpawned%9)-4)*.17,range=Math.min(24,this.mapHalf*.9)*(0.86+(this.stats.ambientSpawned%3)*.06);
  const desired=this.nearbyPoint(this.anchor,range,arc);const p=distance(desired,this.anchor)>=8?desired:base;const unit=this.addUnit(e.type,'zerg',p.x,p.z);if(e.detector)unit.detector=true;if(this.campaign18Runtime&&e.campaignStage===this.campaign18Runtime.stage)this.campaign18Runtime.spawned.waves+=CAMPAIGN18_WEIGHTS[e.type];this.stats.ambientSpawned++;}}
 endStage(){if(this.phase!=='battle'||!this.endless&&this.stage===18&&this.stageElapsed<this.duration-1e-8)return;if(this.talentTransferPlan)cancelTransfer(this);this.cancelOrder();
  if(!this.endless&&this.difficulty==='hell'&&this.expansionHives.size){this.phase='lost';this.announce('扩张虫巢尚未清除 · 战线失守');return;}
  if(!this.endless&&this.stage===18&&(!this.hive||this.hive.hp>0||!this.allies().some(u=>hasCombatPotential(this,u)))){this.phase='lost';this.announce('未能在期限内摧毁虫巢并保住小队');return;}
  if(!this.endless&&this.runId){const points=talentPointsForStage(this.difficulty,this.stage);if(points)this.awardPermanentResource(this.runId+':stage:'+this.stage,points);}
   const [m,g]=this.config.reward,f=incomeFactor(this.difficulty)*(1+.1*this.talent('bonus_income')),roundReceipt=this.endless&&this.runId?`${this.runId}:endless-round:${this.endless.round}`:null,alreadyPaid=!!roundReceipt&&this.endlessRoundReceipts.includes(roundReceipt);
   this.clearReceipt={stage:this.stage,minerals:alreadyPaid?0:m*f,gas:alreadyPaid?0:g*f};if(!alreadyPaid){this.wallet.minerals+=m*f;this.wallet.gas+=g*f;this.economyTotals.clear.minerals+=m*f;this.economyTotals.clear.gas+=g*f;if(roundReceipt)this.endlessRoundReceipts.push(roundReceipt);}
  if(!this.endless&&this.stage===18){this.phase='won';this.rewards=[];this.rewardClaimed=true;this.announce('主巢已摧毁 · 小队撤离成功');return;}
  this.phase='reward';this.rewardRound='building';this.rewardClaimed=false;this.rerolls=0;
  if(!this.endless)beginExpeditionWindow(this.expedition,this.stage,this.stage,this.talent('window_shop'));
  this.rewards=this.generateDevelopmentOffers(this.draftWindowKey);this.changed();
 }
 rerollCost(){return expeditionRefreshCost(this.expedition,this.draftStage,this.rewardRound,this.draftWindowId,this.talent('reroll_fan'),this.talent('permanent_discount'))??Infinity;}
 reroll(){return refreshOffers(this);}
 choose(id:string,variantId?:EliteId){return this.atomicMutation(()=>purchaseOffer(this,id,variantId));}
 buyEliteContract(id:string,variantId?:EliteId){return this.atomicMutation(()=>purchaseEliteContract(this,id,variantId));}
 setTacticalEvolutionPlan(family:FamilyId,targetEntityId:number,direction:TacticalDirection){return this.atomicMutation(()=>setTacticalPlan(this,family,targetEntityId,direction));}
 setTacticalEvolutionEnabled(family:FamilyId,enabled:boolean){return this.atomicMutation(()=>setTacticalEnabled(this,family,enabled));}
 previewTacticalEvolutionCancellation(family:FamilyId){return previewTacticalCancellation(this,family);}
 cancelTacticalEvolutionPlan(family:FamilyId,expectedRevision:number){return this.atomicMutation(()=>cancelTacticalPlan(this,family,expectedRevision));}
 skipReward(){if(this.phase!=='reward'||this.rewardClaimed)return false;return this.finishRewardRound();}
 private finishRewardRound(){if(this.rewardRound==='building'){this.rewardRound='random';this.rewards=[];this.rewards=reinforcementOffers(this);this.changed();return true;}endReinforcement(this);if(this.endlessEntry){this.endlessEntry.ready=true;this.phase='endless-ready';this.rewards=[];this.changed();return true;}return this.nextStage();}
 private nextStage(){this.rewardClaimed=true;if(this.endless)this.endless.round++;else this.stage++;this.stageElapsed=0;this.stageStartedAt=this.time;this.phase='battle';this.rerolls=0;this.prepareStage();this.deployPendingHeroes(true);this.changed();return true;}
 stim(){if(this.allies().some(u=>['marine','marauder'].includes(u.unitType)&&talentTransferContains(this,u.id)))cancelTransfer(this);if(this.phase!=='battle'||this.paused||!this.upgrades.has('stim'))return false;let used=false;for(const u of this.allies()){const cost=u.eliteId==='marine.1'?0:u.unitType==='marauder'?20:10;if(!u.heroId&&['marine','marauder'].includes(u.unitType)&&u.hp>cost&&u.stimUntil<=this.time){u.hp-=cost;u.stimUntil=this.time+11;used=true;}}this.changed();return used;}
 dash(){if(this.phase!=='battle'||this.paused||this.time<this.dashReady)return false;const power=this.upgrades.get('buff.tactical')??0;this.dashUntil=this.time+1.2+power*.6;this.dashReady=this.time+12/(1+power)*Math.max(.5,1-.08*this.talent('skill_recovery'));return true;}
 airlift(point:Point=defaultTalentTransferTarget(this),participantIds?:number[]){return prepareTransfer(this,point,participantIds);}
 step(){if(this.phase!=='battle'||this.paused||this.requiresPlayerDecision)return;const dt=TUNING.step;this.tick++;this.time=this.tick*dt;this.stageElapsed+=dt;this.statuses.tick(this.time);
  if(this.talentTransferPlan&&this.time+1e-8>=this.talentTransferPlan.readyAt)finishTransfer(this);
  if(this.endless&&this.runId){const minutes=Math.floor((this.endlessElapsed+1e-8)/60);while(this.endlessAwardedMinutes<minutes){this.endlessAwardedMinutes++;this.awardPermanentResource(this.runId+':endless:'+this.endlessAwardedMinutes,talentPointsForEndlessMinute(this.difficulty));}}
  if(this.scheduledStage!==this.stage)this.prepareStage();const direction=this.updateCommand(dt),mag=Math.hypot(direction.x,direction.z);this.marchDirection={x:direction.x/Math.max(1,mag),z:direction.z/Math.max(1,mag)};if(mag>.01){this.anchorMovingFor+=dt;this.anchorStoppedFor=0;}else {this.anchorStoppedFor+=dt;this.anchorMovingFor=0;}if(mag>.01){const speed=TUNING.anchorSpeed*(this.time<this.dashUntil?1.65:1);this.anchor.facing=turn(this.anchor.facing,Math.atan2(direction.x,direction.z),5*dt);translate(this.anchor,{x:direction.x/Math.max(1,mag)*speed*dt,z:direction.z/Math.max(1,mag)*speed*dt},.8,false,this.obstacles,this.sandbox?TUNING.worldHalf:this.mapHalf,this.terrain);}
  if(distance(this.anchor,this.trail.at(-1)!)>.8)this.trail.push({x:this.anchor.x,z:this.anchor.z});
  if(this.trail.length>1200){this.trail.splice(0,200);for(const u of this.entities.values())u.trailIndex=Math.max(0,u.trailIndex-200);}
  this.updateEconomy(dt);this.updateProduction(dt);tickCarrierSubsystem(this,dt);this.updateBurns();this.deployPendingHeroes();
  if(!this.sandbox)while(this.eventPlan[this.nextEvent]?.at<=this.stageElapsed){this.spawnEconomic(this.eventPlan[this.nextEvent++].kind);}
  if(this.autoWaves&&this.specialPlan[this.nextSpecial]?.tier==='lord'&&this.specialPlan[this.nextSpecial].at-this.stageElapsed<=5&&!this.lordWarningPoint){const radius=SC2_UNITS[this.specialPlan[this.nextSpecial].type].unitRadius*TUNING.unitScale*1.7,pool=this.spawnCells.filter(p=>distance(p,this.anchor)>8&&(!this.terrain||this.terrain.canOccupy(p,radius))&&!blocked(p,radius,this.obstacles));this.lordWarningPoint=pool.length?{...pool[Math.floor(this.random()*pool.length)]}:null;if(this.lordWarningPoint)this.announce('随机领主即将降临 · 5 秒');}
  if(this.autoWaves)while(this.specialPlan[this.nextSpecial]?.at<=this.stageElapsed){const e=this.specialPlan[this.nextSpecial],spawned='budget' in e?this.spawnCampaignSpecial(e):this.spawnSpecial(e.type,e.tier,e.tier==='lord'?this.lordWarningPoint??undefined:undefined);if(!spawned)break;this.nextSpecial++;if(e.tier==='lord')this.lordWarningPoint=null;if(e.tier==='elite')this.stats.ambientSpawned++;}
  if(this.autoWaves&&this.endless)this.updateEndlessSpawns(dt);if(this.autoWaves&&this.time>=this.nextWave)this.spawnWave();if(this.ambientBacklog.length)this.releaseAmbient();if(this.autoWaves)this.updateHives();
  const bodies:Body[]=[...this.entities.values(),...this.pods.filter(p=>p.status==='active'||p.status==='opening'),...[...this.economicTargets.values()].filter(e=>e.status==='active'),...this.expansionHives.values(),...this.fortifications.values()];if(this.hive&&this.hive.hp>0)bodies.push(this.hive);this.hash.rebuild(bodies);this.updateAuras();this.updateTalentSupport();this.resolveHeroCasts();tickDetection(this);tickAreaSpells(this);tickWeaponAreas(this);this.enemySpecials.update(dt);this.updateCorrosionZones();
  this.movementAllies=this.allies();this.formationPlanned=false;
  for(const u of this.entities.values())this.updateUnit(u,dt);
  this.updateFortifications();
  this.movementAllies=null;cleanupCarrierSummons(this);
  this.collisionContacts=this.contacts.resolve(this.entities.values(),this.hash,this.obstacles,this.mapHalf,dt,[...(this.hive&&this.hive.hp>0?[this.hive]:[]),...this.expansionHives.values(),...this.fortifications.values()],this.terrain);
  for(const fx of this.effects){if(fx.kind==='bile'&&fx.until<=this.time){this.visual('bile-impact',{...fx.end,id:fx.source,hp:0,maxHp:0,armor:0,unitRadius:0,flying:false,owner:'zerg',attributes:[]});this.hash.query(fx.end,fx.radius+3,b=>{if(!b.flying&&b.hp>0&&distance(b,fx.end)<=fx.radius+b.unitRadius)this.hit(b,fx.damage??BILE.damage,[],1,fx.owner,0,1);});}}
  this.effects=this.effects.filter(f=>f.until>this.time);
  this.updatePods();if(this.requiresPlayerDecision)return;
  this.pickups=this.pickups.filter(p=>{const d=distance(p,this.anchor),radius=2**this.talent('battlefield_cleaner');if(d<2*radius&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){const factor=1+.25*this.talent('recycle'),m=p.minerals*factor,g=p.gas*factor;this.wallet.minerals+=m;this.wallet.gas+=g;this.economyTotals.drops.minerals+=m;this.economyTotals.drops.gas+=g;return false;}if(d<6*radius&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0))){p.x+=(this.anchor.x-p.x)*dt*4;p.z+=(this.anchor.z-p.z)*dt*4;}return true;});
  for(const p of [...this.rewardDrops])if(distance(p,this.anchor)<2&&(!this.terrain||this.terrain.walkLine(p,this.anchor,0)))this.collectRewardDrop(p.id);
  this.maxStretch=0;let fighters=0;for(const [id,u] of this.entities){if(u.owner==='terran'&&u.hp>0){this.maxStretch=Math.max(this.maxStretch,distance(u,this.anchor));if(hasCombatPotential(this,u))fighters++;}if(u.deadAt!==null&&this.time-u.deadAt>1.5){this.entities.delete(id);this.navigation.delete(id);this.detours.delete(id);this.movementStall.delete(id);}}
  if(this.order?.kind==='move'){for(const id of this.movePending)if((this.entities.get(id)?.hp??0)<=0)this.movePending.delete(id);if(this.order.arrived&&!this.movePending.size)this.cancelOrder();}
  this.distancePairs=this.hash.visits;
  if(!fighters){this.phase='lost';this.announce('战斗单位全部阵亡 · 小队失联');}
  else if(this.stageElapsed>=this.duration-1e-8)this.endStage();
  if(this.tick%6===0)this.changed();
 }
 advance(seconds:number){const n=Math.round(seconds/TUNING.step);for(let i=0;i<n;i++)this.step();}
}
