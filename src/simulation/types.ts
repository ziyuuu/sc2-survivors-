import type {HeroId} from '../data/heroes';
import type {Race} from '../data/races';
import type {EliteId} from '../data/elites';
import type {Rarity} from '../data/rewards';
import type {UnitType,CombatUnitType,TerranType,ZergType} from '../data/sc2-units';
import type {BuildingType} from '../data/game';
export interface Point {x:number;z:number}
export type SquadOrder={kind:'move';point:Point;arrived:boolean;issuedAt:number};
export interface Body extends Point {id:number;hp:number;maxHp:number;armor:number;unitRadius:number;flying:boolean;attributes:string[];owner:'terran'|'zerg';race?:import('../data/races').Race;team?:import('../data/races').Team}
export interface ExpansionHive extends Body {stage:number;spawnedAt:number;nextBatchAt:number;batchSerial:number;pending:ZergType[];rewarded:boolean}
export interface Fortification extends Body {kind:'bunker'|'repair';nextActionAt:number}
export interface Entity extends Body {
 race:import('../data/races').Race;
 team:import('../data/races').Team;
 /** Carrier-owned actors are targetable entities, never independent roster/cultivation entries. */
 summonKind?:'interceptor';summonOwnerId?:number;
 /** Frozen when a summon starts an attack; surviving projectiles keep their original reward identity. */
 rewardOwnerId?:number;rewardOwnerGeneration?:number;rewardSourceKind?:'ordinary'|'elite'|'hero'|'temporary';
 carrierHangar?:{initialized:boolean;serial:number;job:{remaining:number;paid:number}|null};
 cliffTransit?:{kind:'jump'|'stride';from:Point;to:Point;startedAt:number;until:number};cliffReadyAt?:number;
 chargeState?:{targetId:number;until:number};chargeReadyAt?:number;
 shieldArmor?:number;shieldRegen?:number;shieldDelay?:number;barrier?:number;barrierReady?:number;talentShield?:number;maxTalentShield?:number;
 nativeMode?:string;desiredNativeMode?:string;nativeModeUntil?:number;abilityReady?:number;cloaked?:boolean;
 activeWeapon?:string;
 nativeStatScale?:{hp:number;damage:number;period:number;move:number;armor:number};
 detector?:boolean;
 stoppedUntil?:number;attackSlowUntil?:number;attackSlowFactor?:number;
 shotSequence?:number;moveSlowUntil?:number;moveSlowFactor?:number;
 endlessLevel?:number;enemyLevel?:number;lordTrait?:'zeal'|'carapace'|'regen';specialDamageMultiplier?:number;eliteId?:EliteId;heroId?:HeroId;modelKey?:string;enemyTier?:'elite'|'boss'|'lord';enemyName?:string;visualScale?:number;slowUntil?:number;slowFactor?:number;specialReady?:number;lastSkillAt?:number;siegeSince?:number;turnMultiplier?:number;healTargets?:number[];
 unitType:CombatUnitType;rank:number;moveSpeed:number;attackRange:number;weaponDamage:number;weaponCooldown:number;attackPeriod:number;attackFacing:number;
 attackTarget:number|null;facing:number;velocity:Point;prev:Point;slot:number;trailIndex:number;
 action:'idle'|'move'|'attack'|'skill'|'heal'|'sieging'|'unsieging'|'dead'|'spawn';
 mode:'tank'|'siege';desiredMode:'tank'|'siege';modeTimer:number;windup:number;attackLock:number;pendingTarget:number|null;lastShotAt:number;nextShotAt:number;shotInterval:number;repositionUntil:number;aimStartedAt:number|null;
 energy:number;maxEnergy:number;energyRegen:number;healRate:number;healTarget:number|null;bileCooldown:number;guardianPod:number|null;guardOrigin?:boolean;stimUntil:number;
 deadAt:number|null;bornAt:number;thinkAt:number;distanceWalked:number;
 shield?:number;maxShield?:number;lastDamagedAt?:number;charmStage?:number;orderlyStage?:number;lastStandStage?:number;lastStandUntil?:number;temporaryUntil?:number;temporary?:boolean;temporaryKind?:'proliferate'|'mercenary';freeConscript?:boolean;tacticalTier?:number;tacticalDirection?:'assault'|'guard'|'mobility';recoveryUntil?:number;
}
export interface Pod extends Body {number:number;unitType:UnitType;createdAt:number;landedAt:number;guardianIds:Set<number>;guardTypes:UnitType[];
 status:'falling'|'active'|'opening'|'rescued'|'destroyed';resolvedAt:number|null;recruitId:number|null;jobId:number;stage:number;passengers:{status:'waiting'|'released'|'lost';entityId:number|null}[];nextExitAt:number;freeConscript?:boolean}
export interface EconomicTarget extends Body {kind:'egg'|'drone';createdAt:number;expiresAt:number|null;resolvedAt:number|null;status:'active'|'rescued'|'expired'|'killed';origin:Point;facing:number}
export interface Job {id:number;unitType:TerranType;quantity:number;buildingIds:number[];group:BuildingType;remaining:number;paid:{minerals:number;gas:number};passengerPayments?:{minerals:number;gas:number}[]}
export interface Building {id:number;type:BuildingType;remaining:number;queue:Job[];techLab:boolean;upgradeRemaining:number|null}
export interface Effect extends Point {id:number;kind:'shot'|'flame'|'explosion'|'bile'|'heal'|'hero-line'|'scan-warning'|'hero-warning';end:Point;until:number;radius:number;owner:'terran'|'zerg';source:number;damage?:number}
export interface Pickup extends Point {id:number;minerals:number;gas:number}
/** Presentation never consumes gameplay IDs or random numbers. */
export interface VisualEvent extends Point {shotSequence?:number;attackId?:string;castId?:number;heroId?:HeroId;eliteId?:EliteId;race?:Race;modelKey?:string;serial:number;time:number;y:number;endY:number;kind:'attack'|'hit'|'death'|'bile-impact'|'baneling-recover'|'skill-launch'|'skill-impact'|'skill-dot'|'barrier-start'|'storm-start'|'pod-land'|'pod-open'|'pod-destroy'|'scv-rescue'|'egg-expired'|'drone-death';unitType:CombatUnitType|null;entityId:number;flying:boolean;end:Point;facing:number;siege:boolean}
export interface Reward {id:string;offerId:string;sold:boolean;name:string;description:string;icon:string;rarity:Rarity;rank?:3|5;strength?:number;kind:'hero'|'elite'|'intelligence'|'build'|'research'|'train'|'veteran'|'buff'|'tech'|'upgrade'|'economy';value:string;minerals:number;gas:number;discount:number;baseMinerals:number;baseGas:number}

export interface RewardDrop extends Point {id:number;reward:Reward;talentLoot?:{rarity:'purple'|'orange';receipt:string}}

export interface HeroRecord {id:HeroId;rank:number;entityId:number|null;skillReady:number;revivePaid:boolean;awaitingSpawn:boolean}
export interface HeroCast {id:number;hero:HeroId;source:number;target:number;origin:Point;point:Point;at:number;damage:number;phase?:'impact'|'channel'|'dot'|'line-travel'|'area-pulse';progress?:number;hitIds?:number[];launched?:boolean;pulseIndex?:number}
