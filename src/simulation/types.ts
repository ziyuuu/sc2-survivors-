import type {HeroId} from '../data/heroes';
import type {Race} from '../data/races';
import type {EliteId} from '../data/elites';
import type {Rarity} from '../data/rewards';
import type {UnitType,CombatUnitType,TerranType,ZergType} from '../data/sc2-units';
export interface Point {x:number;z:number}
export type SquadOrder={kind:'move';point:Point;arrived:boolean;issuedAt:number};
export interface Body extends Point {heldBy?:string;winged?:boolean;wingHeight?:number;id:number;hp:number;maxHp:number;armor:number;unitRadius:number;flying:boolean;attributes:string[];owner:'terran'|'zerg';race?:import('../data/races').Race;team?:import('../data/races').Team;damageReduction?:number;enemySpawn?:import('../data/enemy-tuning').EnemySpawnStamp}
export interface ExpansionHive extends Body {stage:number;spawnedAt:number;nextBatchAt:number;batchSerial:number;pending:ZergType[];pendingStamp?:import('../data/enemy-tuning').EnemySpawnStamp;rewarded:boolean}
export interface Fortification extends Body {kind:'bunker'|'repair'|'turret_terran'|'turret_zerg'|'turret_protoss'|'cover';nextActionAt:number;supportUntil?:number;supportRank?:number;shield?:number;maxShield?:number}
export interface Entity extends Body {
 pandora?:boolean;pandoraStats?:boolean;
 arenaHero?:boolean;arenaElite?:boolean;arenaParent?:number;specialNoLoot?:boolean;
 fun?:import("./encounters/expanded-state").FunIdentity;
 funTransit?:{from:Point;at:number;until:number};
 wingLanding?:boolean;wingAir?:boolean;
 encounter?:import("./encounters/state").EncounterIdentity;
 mission?:{taskId:string;sourceId:number;noLoot:boolean;escortOnly:boolean;pulse:boolean;resourceFactor?:number;holdout?:boolean;holdoutArmor?:number;holdoutStage?:number;rescueAttacker?:boolean;center?:Point;supportStage?:number;fleet?:boolean;nextAction:number};protossEliteCombat?:import('./combat/protoss-elite-runtime').ProtossEliteCombat;teamAuraFactors?:{hp:number;shield:number};carrierEliteCycles?:number;protossLiftedBy?:number;zergEliteCombat?:import('./combat/zerg-elite-runtime').ZergEliteCombat;zergEliteHpAuraFactor?:number;eliteCombat?:import('./combat/terran-elite-runtime').TerranEliteCombat;eliteHpAuraFactor?:number;
 protossCombat?:import('./combat/protoss-hero-passives').ProtossCombatState;
 zergCombat?:import('./combat/zerg-hero-passives').ZergCombatState;
 enemyRoute?:import('./movement/enemy-routes').EnemyRoute;
 pairId?:string;injectReady?:number;
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
 enemyOrigin?:'regular'|'swarm'|'special';
 enemyResources?:import('../data/enemy-tuning').EnemyResourceScale;
 nativeStatScale?:{hp:number;damage:number;period:number;move:number;armor:number};
 detector?:boolean;
 stoppedUntil?:number;attackSlowUntil?:number;attackSlowFactor?:number;
 shotSequence?:number;moveSlowUntil?:number;moveSlowFactor?:number;
 endlessLevel?:number;enemyLevel?:number;lordTrait?:'zeal'|'carapace'|'regen';specialDamageMultiplier?:number;eliteId?:EliteId;heroId?:HeroId;heroCombat?:import('./combat/terran-hero-passives').HeroCombatState;heroOpening?:boolean;modelKey?:string;enemyTier?:'elite'|'boss'|'lord';enemyName?:string;visualScale?:number;slowUntil?:number;slowFactor?:number;specialReady?:number;corrosiveBileReady?:number;lastSkillAt?:number;siegeSince?:number;turnMultiplier?:number;healTargets?:number[];
 unitType:CombatUnitType;rank:number;moveSpeed:number;attackRange:number;weaponDamage:number;weaponCooldown:number;attackPeriod:number;attackFacing:number;
 attackTarget:number|null;facing:number;velocity:Point;prev:Point;slot:number;trailIndex:number;
 action:'idle'|'move'|'attack'|'skill'|'heal'|'sieging'|'unsieging'|'dead'|'spawn';
 mode:'tank'|'siege';desiredMode:'tank'|'siege';modeTimer:number;windup:number;attackLock:number;pendingTarget:number|null;lastShotAt:number;nextShotAt:number;shotInterval:number;repositionUntil:number;aimStartedAt:number|null;
 energy:number;maxEnergy:number;energyRegen:number;healRate:number;healTarget:number|null;bileCooldown:number;guardianPod:number|null;guardOrigin?:boolean;stimUntil:number;
 deadAt:number|null;bornAt:number;thinkAt:number;distanceWalked:number;
 shield?:number;maxShield?:number;lastDamagedAt?:number;charmStage?:number;orderlyStage?:number;lastStandStage?:number;lastStandUntil?:number;temporaryUntil?:number;temporary?:boolean;temporaryKind?:'proliferate'|'mercenary'|'fun-brood'|'hero-baneling'|'shop-gland'|'shop-nydus';freeConscript?:boolean;tacticalTier?:number;tacticalDirection?:'assault'|'guard'|'mobility';recoveryUntil?:number;
}
export interface Pod extends Body {injectedBy?:number;injectedSeats?:number;injectedAt?:number;number:number;unitType:UnitType;createdAt:number;landedAt:number;guardianIds:Set<number>;guardTypes:UnitType[];
 guardSpawn?:import('../data/enemy-tuning').EnemySpawnStamp;
 status:'falling'|'active'|'opening'|'rescued'|'destroyed';resolvedAt:number|null;recruitId:number|null;jobId:number;stage:number;passengers:{status:'waiting'|'released'|'lost';entityId:number|null}[];nextExitAt:number;freeConscript?:boolean}
export interface EconomicTarget extends Body {kind:'egg'|'drone';createdAt:number;expiresAt:number|null;resolvedAt:number|null;status:'active'|'rescued'|'expired'|'killed';origin:Point;facing:number}
export interface Effect extends Point {id:number;kind:'shot'|'flame'|'explosion'|'bile'|'heal'|'hero-line'|'scan-warning'|'hero-warning';end:Point;until:number;radius:number;owner:'terran'|'zerg';source:number;damage?:number}
export interface Pickup extends Point {id:number;minerals:number;gas:number}
/** Presentation never consumes gameplay IDs or random numbers. */
export type HitSurface='flesh'|'armor'|'shield';
export interface EnemySpecialVisual {kind:'bile'|'spikes'|'cone';origin:Point;points:Point[];angle:number;range:number;radius:number}
export interface EnemyMissileVisual {origin:Point;point:Point;sourceFlying:boolean;targetFlying:boolean}
export interface VisualSnapshot {deathAppearance?:Pick<Entity,"team"|"maxHp"|"fun"|"encounter">;missionFleet?:boolean;missionModel?:string;revealed?:boolean;supportSound?:string;enemySpecial?:EnemySpecialVisual;missionDeath?:string;rescueModel?:'scv'|'drone'|'probe';nativeMode?:string;activeWeapon?:string;summonKind?:Entity['summonKind'];rewardSourceKind?:Entity['rewardSourceKind'];sourceTeam?:Entity['team'];enemyTier?:Entity['enemyTier'];visualScale?:number;targetSurface?:HitSurface;targetFlying?:boolean;hitSourceId?:number;weaponHit?:boolean;weaponHop?:number;shieldDamage?:number}
export interface VisualEvent extends Point,VisualSnapshot {equipmentProjection?:boolean;heroOpening?:boolean;weaponPoseSeconds?:number;targetId?:number;targetTier?:string;targetAlive?:boolean;rank?:number;projectileSpeed?:number;shotSequence?:number;attackId?:string;castId?:number;heroId?:HeroId;eliteId?:EliteId;race?:Race;modelKey?:string;serial:number;time:number;y:number;endY:number;kind:'unit-expired'|'sound'|'enemy-special-impact'|'squad-transfer'|'hero-tentacle'|'hero-hatch'|'hero-cleave'|'hero-essence'|'hero-reserve'|'hero-infection-pool'|'hero-revival-mark'|'hero-revive'|'weapon-area'|'skill-status'|'skill-heal'|'projectile-impact'|'support-flight'|'support-pulse'|'support-impact'|'strategic-impact'|'shield-hit'|'shield-break'|'queen-inject'|'attack'|'hit'|'death'|'bile-impact'|'baneling-recover'|'skill-launch'|'skill-impact'|'skill-line'|'skill-dot'|'barrier-start'|'storm-start'|'pod-land'|'pod-open'|'pod-destroy'|'scv-rescue'|'egg-expired'|'drone-death';unitType:CombatUnitType|null;entityId:number;flying:boolean;end:Point;facing:number;siege:boolean}
export interface Reward {id:string;offerId:string;sold:boolean;name:string;description:string;icon:string;rarity:Rarity;rank?:3|5;strength?:number;kind:'hero'|'elite'|'intelligence'|'build'|'research'|'train'|'veteran'|'buff'|'tech'|'upgrade'|'economy';value:string;minerals:number;gas:number;discount:number;baseMinerals:number;baseGas:number}

export interface RewardDrop extends Point {id:number;reward:Reward;bossLootReceipt?:string;bossLootVariant?:EliteId;talentLoot?:{rarity:'purple'|'orange';receipt:string}}

export interface HeroRecord {id:HeroId;rank:number;entityId:number|null;skillReady:number;revivePaid:boolean;awaitingSpawn:boolean}
export interface HeroCast {beganAt?:number;rank?:number;frozenTargets?:{id:number;maxHp:number}[];battleView?:import('./combat/battle-view').BattleView;id:number;hero:HeroId;source:number;target:number;origin:Point;point:Point;at:number;damage:number;phase?:'impact'|'channel'|'dot'|'line-travel'|'area-pulse';progress?:number;hitIds?:number[];launched?:boolean;pulseIndex?:number;presentationLaunch?:Point&{facing:number;poseSeconds:number}}
