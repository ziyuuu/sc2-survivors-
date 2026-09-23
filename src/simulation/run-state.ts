import type {EndlessState} from '../data/endless';
import type {HeroId} from '../data/heroes';
import type {EliteId} from '../data/elites';
import type {EnemyEvent} from '../data/enemies';
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
/** Run-owned mutable state only. No listeners, terrain assets, closures or World references.
 * One fresh state resets a run without reloading the renderer or immutable asset pack. */
export class RunState {
 podSerial=0;time=0;tick=0;stage=1;stageElapsed=0;stageStartedAt=0;phase:'menu'|'battle'|'reward'|'won'|'lost'='menu';paused=false;
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
 dashUntil=0;dashReady=0;hive:Body|null=null;maxStretch=0;distancePairs=0;collisionContacts=0;
 airliftReady=0;airliftAt=Infinity;
 expansionHives=new Map<number,ExpansionHive>();nextExpansionAt=Infinity;hiveWarningPoint:Point|null=null;mainHiveNextBatchAt=Infinity;mainHiveBatch=0;mainHivePending:ZergType[]=[];
 fortifications=new Map<number,Fortification>();
 lordWarningPoint:Point|null=null;
 stats={kills:0,rescued:0,failed:0,produced:0,started:0,shots:0,healed:0,damage:0,scvsRescued:0,scvsLost:0,dronesKilled:0,ambientSpawned:0};
 difficulty:Difficulty='normal';scvs=0;economicTargets=new Map<number,EconomicTarget>();
 anchorMovingFor=0;anchorStoppedFor=0;tankCommand:'tank'|'siege'='tank';
 readonly economyTotals={passive:{minerals:0,gas:0},drops:{minerals:0,gas:0},clear:{minerals:0,gas:0},cards:{minerals:0,gas:0},production:{minerals:0,gas:0},purchases:{minerals:0,gas:0},rerolls:0};
protected productionCursor=0;
 productionPlan:{buildingId:number;unitType:TerranType;group:BuildingType;quantity:number;cost:{minerals:number;gas:number}}|null=null;
 protected guardRemainders=emptyCounts();protected nextGuardCounts:Counts|null=null;
protected specialPlan:EnemyEvent[]=[];protected nextSpecial=0;
 protected waves:Wave[]=[];protected eventPlan:EconomicSpawn[]=[];protected nextEvent=0;protected scheduledStage=0;
 protected ambientBacklog:{type:ZergType;bearing:number;at:number}[]=[];protected extraDeliveries:TerranType[]=[];
 protected spawnCells:Point[]=[];
 notice='守住小队。生产完成后必须救援。';noticeUntil=8;revision=0;
 protected readonly contacts=new ContactSolver();
 protected readonly formation=new SquadFormation();
 protected readonly engagement=new EngagementSlots();
 protected movementAllies:Entity[]|null=null;protected formationPlanned=false;
 protected configStage=0;protected configDifficulty:Difficulty|null=null;protected stageData!:StageConfig;
 protected movementStall=new Map<number,number>();
 protected detours=new Map<number,{body:number;first:Point;second:Point;phase:number;forward:Point;until:number}>();
 protected navigation=new Map<number,{goal:Point;requested:Point;until:number;stalled:boolean}>();

 heroes=new Map<HeroId,HeroRecord>();heroCasts:HeroCast[]=[];
 pendingElites:EliteId[]=[];
 evolution=new Map<TerranType,{targetId:number;direction:'assault'|'guard'|'mobility';bank:number}>();
 protected burns=new Map<string,{target:number;source:number;damage:number;next:number;until:number}>();
 protected groupNext:Record<BuildingType,TerranType>={barracks:'marine',factory:'hellion',starport:'medivac'};
 protected groupUnlocks={marauder:false,tank:false};
 protected rngState=0;
 protected attackLines=new AttackLineCache();
 statuses=new CombatStatuses();corrosionZones:{source:number;points:Point[];damage:number;until:number;nextTick:number}[]=[];zoneSlowed=new Set<number>();
 auraArmor=new Map<number,number>();auraDamage=new Map<number,number>();auraAttackSpeed=new Map<number,number>();protected nextAuraUpdate=0;

}
