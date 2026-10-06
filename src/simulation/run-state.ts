import {newProtossEliteRun} from './combat/protoss-elite-runtime';
import {newTeamAuraRun} from './combat/team-auras';
import {newTerranEliteRun} from './combat/terran-elite-runtime';
import {newZergEliteRun} from './combat/zerg-elite-runtime';
import {newEliteSupportState} from './combat/elite-support';
import {newProtossHeroRun} from './combat/protoss-hero-passives';
import {newZergHeroRun} from './combat/zerg-hero-passives';
import {newHeroAttackState,type HeroAttackState,type AttackEvent} from './combat/hero-attack-upgrades';
import type {WeaponFlight} from './combat/weapon-flight';
import {newSwarmState} from '../data/swarm';
import type {EndlessState} from '../data/endless';
import type {EndlessConfig} from '../data/endless';
import type {RunConfig} from './persistence/run-snapshot';
import {newExpedition} from './expedition-state';
import type {HeroId} from '../data/heroes';
import type {EliteId} from '../data/elites';
import type {Campaign18Runtime,Campaign18Counts,Campaign18Special,Campaign18Wave,Campaign18Enemy,Campaign18StageConfig} from '../data/campaign18';
import type {TerranType,ZergType} from '../data/sc2-units';
import {TUNING} from '../data/game';
import type {Difficulty} from '../data/stages';
import type {Campaign18EconomicEvent} from '../data/campaign18';
import {EngagementSlots} from './formation/engagement';
import {SquadFormation} from './formation/squad';
import {ContactSolver} from './movement/contacts';
import {SpatialHash} from './movement/spatial-hash';
import {AttackLineCache} from './combat/attack-lines';
import {CombatStatuses} from './combat/statuses';
import type {Entity,Point,Pod,Body,Reward,Effect,Pickup,VisualEvent,EconomicTarget,SquadOrder,RewardDrop,HeroRecord,HeroCast,ExpansionHive,Fortification} from './types';
import type {TalentSupportImpact} from './combat/talent-support';
import type {TalentTransferPlan} from './combat/talent-transfer';
/** Run-owned mutable state only. No listeners, terrain assets, closures or World references.
 * One fresh state resets a run without reloading the renderer or immutable asset pack. */
export class RunState {
 expedition:import('./expedition-state').ExpeditionState=newExpedition('terran');
 runConfig:RunConfig|null=null;
 campaign18Runtime:Campaign18Runtime|null=null;
 swarm=newSwarmState();
 podSerial=0;time=0;tick=0;stage=1;stageElapsed=0;stageStartedAt=0;phase:'menu'|'battle'|'reward'|'won'|'endless-ready'|'finished'|'lost'='menu';paused=false;
 battlefield:{mode:'campaign'|'endless';mapId:'campaign-kairos-v1'|'campaign-radial-v1'|'endless-flat-v1';mapHash:string}={mode:'campaign',mapId:'campaign-kairos-v1',mapHash:''};
 endlessEntry:{id:string;revision:number;ready:boolean}|null=null;
 endlessTransitionReceipt:string|null=null;
 endlessRoundReceipts:string[]=[];
 runId:string|null=null;endlessAwardedMinutes=0;
 endless:EndlessState|null=null;
 entities=new Map<number,Entity>();pods:Pod[]=[];upgrades=new Map<string,number>();
 wallet={minerals:TUNING.startingMinerals,gas:TUNING.startingGas};anchor={x:0,z:0,facing:Math.PI/2};input={x:0,z:0};
 marchDirection:Point={x:0,z:0};order:SquadOrder|null=null;protected movePending=new Set<number>();
 protected commandRoute:{requested:Point;goal:Point;until:number}|null=null;
 protected directionRoute:import('./movement/direction-route').DirectionRouteCache|null=null;
 trail:Point[]=[{x:0,z:0}];effects:Effect[]=[];pickups:Pickup[]=[];rewardDrops:RewardDrop[]=[];hash=new SpatialHash<Body>();
 visualEvents:VisualEvent[]=[];protected visualSerial=0;
 protected offerSerial=0;rewards:Reward[]=[];rewardClaimed=false;rewardRound:'building'|'random'='building';clearReceipt:{stage:number;minerals:number;gas:number}|null=null;rerolls=0;nextWave=Infinity;wave=0;stageWave=0;nextId=1;nextJob=1;
 nextFreePodAt=0;nextEliteGrowthAt=Infinity;nextMercenaryAt=Infinity;nextTankSupportAt=Infinity;
 supportUntil=0;nextSupportTick=Infinity;
 talentSupportImpacts:TalentSupportImpact[]=[];
 dashUntil=0;dashReady=0;hive:Body|null=null;maxStretch=0;distancePairs=0;collisionContacts=0;
 airliftReady=0;talentTransferPlan:TalentTransferPlan|null=null;
 expansionHives=new Map<number,ExpansionHive>();nextExpansionAt=Infinity;hiveWarningPoint:Point|null=null;mainHiveNextBatchAt=Infinity;mainHiveBatch=0;mainHivePending:ZergType[]=[];
 fortifications=new Map<number,Fortification>();

 stats={kills:0,rescued:0,failed:0,produced:0,started:0,shots:0,healed:0,damage:0,workersRescued:0,workersLost:0,dronesKilled:0,ambientSpawned:0};
 difficulty:Difficulty='normal';workers=0;economicTargets=new Map<number,EconomicTarget>();
 anchorMovingFor=0;anchorStoppedFor=0;tankCommand:'tank'|'siege'='tank';
 readonly economyTotals={passive:{minerals:0,gas:0},drops:{minerals:0,gas:0},clear:{minerals:0,gas:0},cards:{minerals:0,gas:0},production:{minerals:0,gas:0},purchases:{minerals:0,gas:0},rerolls:0};

 protected nextGuardCounts:Campaign18Counts|null=null;
protected specialPlan:Campaign18Special[]=[];protected nextSpecial=0;
 protected waves:Campaign18Wave[]=[];protected eventPlan:Campaign18EconomicEvent[]=[];protected nextEvent=0;protected scheduledStage=0;
 protected ambientBacklog:{type:ZergType|Campaign18Enemy;bearing:number;at:number;campaignStage?:number;detector?:boolean}[]=[];
 protected spawnCells:Point[]=[];
 protected swarmSpawnCache:{cells:Point[];radius:number;points:Point[]}[]=[];
 notice='守住小队。生产完成后必须救援。';noticeUntil=8;revision=0;
 protected readonly contacts=new ContactSolver();
 protected readonly formation=new SquadFormation();
 protected readonly destinationFormation=new SquadFormation();
 protected readonly engagement=new EngagementSlots();
 protected movementAllies:Entity[]|null=null;protected formationPlanned=false;
 protected configStage=0;protected configDifficulty:Difficulty|null=null;protected stageData!:Campaign18StageConfig|EndlessConfig;
 protected movementStall=new Map<number,number>();
 protected detours=new Map<number,{body:number;first:Point;second:Point;phase:number;forward:Point;until:number}>();
 protected navigation=new Map<number,{goal:Point;requested:Point;until:number;stalled:boolean}>();

 terranElites=newTerranEliteRun();
 protossElites=newProtossEliteRun();teamAuras=newTeamAuraRun();
 zergElites=newZergEliteRun();
 eliteSupport=newEliteSupportState();
 protossHeroes=newProtossHeroRun();
 zergHeroes=newZergHeroRun();
 heroAttacks:HeroAttackState=newHeroAttackState();heroAttackEvents:AttackEvent[]=[];heroAuraMembership=new Map<number,string>();
 weaponFlights:WeaponFlight[]=[];
 heroes=new Map<HeroId,HeroRecord>();heroCasts:HeroCast[]=[];
 pendingElites:EliteId[]=[];


 protected rngState=0;
 protected attackLines=new AttackLineCache();
 statuses=new CombatStatuses();corrosionZones:{source:number;points:Point[];damage:number;until:number;nextTick:number}[]=[];zoneSlowed=new Set<number>();
 auraArmor=new Map<number,number>();auraDamage=new Map<number,number>();auraAttackSpeed=new Map<number,number>();protected nextAuraUpdate=0;

 /** Typed DTO only; protected gameplay fields stay encapsulated on the live state. */
 snapshotData(){return {
  expedition:this.expedition,runConfig:this.runConfig,campaign18Runtime:this.campaign18Runtime,swarm:this.swarm,podSerial:this.podSerial, time:this.time, tick:this.tick, stage:this.stage, stageElapsed:this.stageElapsed,
  stageStartedAt:this.stageStartedAt, phase:this.phase, paused:this.paused, battlefield:this.battlefield,endlessEntry:this.endlessEntry,endlessTransitionReceipt:this.endlessTransitionReceipt,endlessRoundReceipts:this.endlessRoundReceipts,runId:this.runId,
  endlessAwardedMinutes:this.endlessAwardedMinutes, endless:this.endless, entities:this.entities, pods:this.pods,
  upgrades:this.upgrades, wallet:this.wallet, anchor:this.anchor, marchDirection:this.marchDirection, order:this.order,
  movePending:this.movePending, commandRoute:this.commandRoute, trail:this.trail, effects:this.effects, pickups:this.pickups,
  rewardDrops:this.rewardDrops, visualSerial:this.visualSerial, offerSerial:this.offerSerial, rewards:this.rewards, rewardClaimed:this.rewardClaimed,
  rewardRound:this.rewardRound, clearReceipt:this.clearReceipt, rerolls:this.rerolls, nextWave:this.nextWave,
  wave:this.wave, stageWave:this.stageWave, nextId:this.nextId, nextJob:this.nextJob,
  nextFreePodAt:this.nextFreePodAt, nextEliteGrowthAt:this.nextEliteGrowthAt, nextMercenaryAt:this.nextMercenaryAt, nextTankSupportAt:this.nextTankSupportAt,
  supportUntil:this.supportUntil, nextSupportTick:this.nextSupportTick, talentSupportImpacts:this.talentSupportImpacts, dashUntil:this.dashUntil, dashReady:this.dashReady, hive:this.hive,
  airliftReady:this.airliftReady, talentTransferPlan:this.talentTransferPlan, expansionHives:this.expansionHives, nextExpansionAt:this.nextExpansionAt, hiveWarningPoint:this.hiveWarningPoint,
  mainHiveNextBatchAt:this.mainHiveNextBatchAt, mainHiveBatch:this.mainHiveBatch, mainHivePending:this.mainHivePending, fortifications:this.fortifications,
  stats:this.stats, difficulty:this.difficulty, workers:this.workers, economicTargets:this.economicTargets, anchorMovingFor:this.anchorMovingFor,
  anchorStoppedFor:this.anchorStoppedFor, tankCommand:this.tankCommand, economyTotals:this.economyTotals,
  nextGuardCounts:this.nextGuardCounts, specialPlan:this.specialPlan, nextSpecial:this.nextSpecial, waves:this.waves,
  eventPlan:this.eventPlan, nextEvent:this.nextEvent, scheduledStage:this.scheduledStage, ambientBacklog:this.ambientBacklog,
  notice:this.notice, noticeUntil:this.noticeUntil, movementStall:this.movementStall, detours:this.detours, navigation:this.navigation,
  protossElites:this.protossElites,teamAuras:this.teamAuras,zergElites:this.zergElites,terranElites:this.terranElites,eliteSupport:this.eliteSupport, heroes:this.heroes, heroCasts:this.heroCasts,protossHeroes:this.protossHeroes,weaponFlights:this.weaponFlights,heroAttacks:this.heroAttacks,zergHeroes:this.zergHeroes, pendingElites:this.pendingElites,
  rngState:this.rngState, corrosionZones:this.corrosionZones, zoneSlowed:this.zoneSlowed,
  auraArmor:this.auraArmor, auraDamage:this.auraDamage, auraAttackSpeed:this.auraAttackSpeed, nextAuraUpdate:this.nextAuraUpdate
 };}

}
