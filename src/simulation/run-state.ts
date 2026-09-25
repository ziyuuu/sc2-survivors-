import type {EndlessState} from '../data/endless';
import type {EndlessConfig} from '../data/endless';
import type {RunConfig} from './persistence/run-snapshot';
import {newExpedition} from './expedition-state';
import type {HeroId} from '../data/heroes';
import type {EliteId} from '../data/elites';
import type {EnemyEvent} from '../data/enemies';
import type {Campaign18Runtime,Campaign18Counts,Campaign18Special,Campaign18Wave,Campaign18Enemy,Campaign18StageConfig} from '../data/campaign18';
import type {TerranType,ZergType} from '../data/sc2-units';
import {TUNING,type BuildingType} from '../data/game';
import {emptyCounts,type Counts,type Difficulty,type Wave,type EconomicSpawn,type StageConfig} from '../data/stages';
import {EngagementSlots} from './formation/engagement';
import {SquadFormation} from './formation/squad';
import {ContactSolver} from './movement/contacts';
import {SpatialHash} from './movement/spatial-hash';
import {AttackLineCache} from './combat/attack-lines';
import {CombatStatuses} from './combat/statuses';
import type {Entity,Point,Pod,Body,Building,Reward,Effect,Pickup,VisualEvent,EconomicTarget,SquadOrder,RewardDrop,HeroRecord,HeroCast,ExpansionHive,Fortification} from './types';
import type {TalentSupportImpact} from './combat/talent-support';
import type {TalentTransferPlan} from './combat/talent-transfer';
/** Run-owned mutable state only. No listeners, terrain assets, closures or World references.
 * One fresh state resets a run without reloading the renderer or immutable asset pack. */
export class RunState {
 expedition:import('./expedition-state').ExpeditionState=newExpedition('terran');
 runConfig:RunConfig|null=null;
 campaign18Runtime:Campaign18Runtime|null=null;
 podSerial=0;time=0;tick=0;stage=1;stageElapsed=0;stageStartedAt=0;phase:'menu'|'battle'|'reward'|'won'|'endless-ready'|'finished'|'lost'='menu';paused=false;
 battlefield:{mode:'campaign'|'endless';mapId:'campaign-kairos-v1'|'endless-flat-v1';mapHash:string}={mode:'campaign',mapId:'campaign-kairos-v1',mapHash:''};
 endlessEntry:{id:string;revision:number;ready:boolean}|null=null;
 endlessTransitionReceipt:string|null=null;
 endlessRoundReceipts:string[]=[];
 runId:string|null=null;endlessAwardedMinutes=0;
 endless:EndlessState|null=null;
 entities=new Map<number,Entity>();pods:Pod[]=[];buildings=new Map<number,Building>();upgrades=new Map<string,number>();
 wallet={minerals:TUNING.startingMinerals,gas:TUNING.startingGas};anchor={x:0,z:0,facing:Math.PI/2};input={x:0,z:0};
 marchDirection:Point={x:0,z:0};order:SquadOrder|null=null;protected movePending=new Set<number>();
 protected commandRoute:{requested:Point;goal:Point;until:number}|null=null;
 trail:Point[]=[{x:0,z:0}];effects:Effect[]=[];pickups:Pickup[]=[];rewardDrops:RewardDrop[]=[];hash=new SpatialHash<Body>();
 visualEvents:VisualEvent[]=[];protected visualSerial=0;
 protected offerSerial=0;rewards:Reward[]=[];rewardClaimed=false;rewardRound:'building'|'random'='building';clearReceipt:{stage:number;minerals:number;gas:number}|null=null;rerolls=0;nextBuilding=1;nextWave=Infinity;wave=0;stageWave=0;nextId=1;nextJob=1;
 freeRerolls=0;freePurchases=0;
 nextFreePodAt=0;nextEliteGrowthAt=Infinity;nextMercenaryAt=Infinity;nextTankSupportAt=Infinity;
 supportUntil=0;nextSupportTick=Infinity;
 talentSupportImpacts:TalentSupportImpact[]=[];
 dashUntil=0;dashReady=0;hive:Body|null=null;maxStretch=0;distancePairs=0;collisionContacts=0;
 airliftReady=0;talentTransferPlan:TalentTransferPlan|null=null;
 expansionHives=new Map<number,ExpansionHive>();nextExpansionAt=Infinity;hiveWarningPoint:Point|null=null;mainHiveNextBatchAt=Infinity;mainHiveBatch=0;mainHivePending:ZergType[]=[];
 fortifications=new Map<number,Fortification>();
 lordWarningPoint:Point|null=null;
 stats={kills:0,rescued:0,failed:0,produced:0,started:0,shots:0,healed:0,damage:0,scvsRescued:0,scvsLost:0,dronesKilled:0,ambientSpawned:0};
 difficulty:Difficulty='normal';scvs=0;economicTargets=new Map<number,EconomicTarget>();
 anchorMovingFor=0;anchorStoppedFor=0;tankCommand:'tank'|'siege'='tank';
 readonly economyTotals={passive:{minerals:0,gas:0},drops:{minerals:0,gas:0},clear:{minerals:0,gas:0},cards:{minerals:0,gas:0},production:{minerals:0,gas:0},purchases:{minerals:0,gas:0},rerolls:0};
protected productionCursor=0;
 productionPlan:{buildingId:number;unitType:TerranType;group:BuildingType;quantity:number;cost:{minerals:number;gas:number}}|null=null;
 protected guardRemainders=emptyCounts();protected nextGuardCounts:Counts|Campaign18Counts|null=null;
protected specialPlan:(EnemyEvent|Campaign18Special)[]=[];protected nextSpecial=0;
 protected waves:(Wave|Campaign18Wave)[]=[];protected eventPlan:EconomicSpawn[]=[];protected nextEvent=0;protected scheduledStage=0;
 protected ambientBacklog:{type:ZergType|Campaign18Enemy;bearing:number;at:number;campaignStage?:number;detector?:boolean}[]=[];protected extraDeliveries:TerranType[]=[];
 protected spawnCells:Point[]=[];
 notice='守住小队。生产完成后必须救援。';noticeUntil=8;revision=0;
 protected readonly contacts=new ContactSolver();
 protected readonly formation=new SquadFormation();
 protected readonly engagement=new EngagementSlots();
 protected movementAllies:Entity[]|null=null;protected formationPlanned=false;
 protected configStage=0;protected configDifficulty:Difficulty|null=null;protected stageData!:StageConfig|Campaign18StageConfig|EndlessConfig;
 protected movementStall=new Map<number,number>();
 protected detours=new Map<number,{body:number;first:Point;second:Point;phase:number;forward:Point;until:number}>();
 protected navigation=new Map<number,{goal:Point;requested:Point;until:number;stalled:boolean}>();

 heroes=new Map<HeroId,HeroRecord>();heroCasts:HeroCast[]=[];
 pendingElites:EliteId[]=[];
 evolution=new Map<TerranType,{targetId:number;direction:'assault'|'guard'|'mobility';bank:number}>();
 protected burns=new Map<string,{target:number;source:number;damage:number;next:number;until:number}>();
 productionChoices:Record<BuildingType,TerranType[]>={barracks:['marine','marauder'],factory:['hellion','tank'],starport:['medivac']};
 protected groupNext:Record<BuildingType,TerranType>={barracks:'marine',factory:'hellion',starport:'medivac'};
 protected groupUnlocks={marauder:false,tank:false};
 protected rngState=0;
 protected attackLines=new AttackLineCache();
 statuses=new CombatStatuses();corrosionZones:{source:number;points:Point[];damage:number;until:number;nextTick:number}[]=[];zoneSlowed=new Set<number>();
 auraArmor=new Map<number,number>();auraDamage=new Map<number,number>();auraAttackSpeed=new Map<number,number>();protected nextAuraUpdate=0;

 /** Typed DTO only; protected gameplay fields stay encapsulated on the live state. */
 snapshotData(){return {
  expedition:this.expedition,runConfig:this.runConfig,campaign18Runtime:this.campaign18Runtime,podSerial:this.podSerial, time:this.time, tick:this.tick, stage:this.stage, stageElapsed:this.stageElapsed,
  stageStartedAt:this.stageStartedAt, phase:this.phase, paused:this.paused, battlefield:this.battlefield,endlessEntry:this.endlessEntry,endlessTransitionReceipt:this.endlessTransitionReceipt,endlessRoundReceipts:this.endlessRoundReceipts,runId:this.runId,
  endlessAwardedMinutes:this.endlessAwardedMinutes, endless:this.endless, entities:this.entities, pods:this.pods, buildings:this.buildings,
  upgrades:this.upgrades, wallet:this.wallet, anchor:this.anchor, marchDirection:this.marchDirection, order:this.order,
  movePending:this.movePending, commandRoute:this.commandRoute, trail:this.trail, effects:this.effects, pickups:this.pickups,
  rewardDrops:this.rewardDrops, visualSerial:this.visualSerial, offerSerial:this.offerSerial, rewards:this.rewards, rewardClaimed:this.rewardClaimed,
  rewardRound:this.rewardRound, clearReceipt:this.clearReceipt, rerolls:this.rerolls, nextBuilding:this.nextBuilding, nextWave:this.nextWave,
  wave:this.wave, stageWave:this.stageWave, nextId:this.nextId, nextJob:this.nextJob, freeRerolls:this.freeRerolls,
  freePurchases:this.freePurchases, nextFreePodAt:this.nextFreePodAt, nextEliteGrowthAt:this.nextEliteGrowthAt, nextMercenaryAt:this.nextMercenaryAt, nextTankSupportAt:this.nextTankSupportAt,
  supportUntil:this.supportUntil, nextSupportTick:this.nextSupportTick, talentSupportImpacts:this.talentSupportImpacts, dashUntil:this.dashUntil, dashReady:this.dashReady, hive:this.hive,
  airliftReady:this.airliftReady, talentTransferPlan:this.talentTransferPlan, expansionHives:this.expansionHives, nextExpansionAt:this.nextExpansionAt, hiveWarningPoint:this.hiveWarningPoint,
  mainHiveNextBatchAt:this.mainHiveNextBatchAt, mainHiveBatch:this.mainHiveBatch, mainHivePending:this.mainHivePending, fortifications:this.fortifications, lordWarningPoint:this.lordWarningPoint,
  stats:this.stats, difficulty:this.difficulty, scvs:this.scvs, economicTargets:this.economicTargets, anchorMovingFor:this.anchorMovingFor,
  anchorStoppedFor:this.anchorStoppedFor, tankCommand:this.tankCommand, economyTotals:this.economyTotals, productionCursor:this.productionCursor, productionPlan:this.productionPlan,
  guardRemainders:this.guardRemainders, nextGuardCounts:this.nextGuardCounts, specialPlan:this.specialPlan, nextSpecial:this.nextSpecial, waves:this.waves,
  eventPlan:this.eventPlan, nextEvent:this.nextEvent, scheduledStage:this.scheduledStage, ambientBacklog:this.ambientBacklog, extraDeliveries:this.extraDeliveries,
  notice:this.notice, noticeUntil:this.noticeUntil, movementStall:this.movementStall, detours:this.detours, navigation:this.navigation,
  heroes:this.heroes, heroCasts:this.heroCasts, pendingElites:this.pendingElites, evolution:this.evolution, burns:this.burns,
  productionChoices:this.productionChoices, groupNext:this.groupNext, groupUnlocks:this.groupUnlocks, rngState:this.rngState, corrosionZones:this.corrosionZones, zoneSlowed:this.zoneSlowed,
  auraArmor:this.auraArmor, auraDamage:this.auraDamage, auraAttackSpeed:this.auraAttackSpeed, nextAuraUpdate:this.nextAuraUpdate
 };}

}
