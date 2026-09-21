import type {UnitType,TerranType,ZergType} from '../data/sc2-units';
import type {BuildingType} from '../data/game';
export interface Point {x:number;z:number}
export interface Body extends Point {id:number;hp:number;maxHp:number;armor:number;unitRadius:number;flying:boolean;attributes:string[];owner:'terran'|'zerg'}
export interface Entity extends Body {
 unitType:UnitType;rank:number;moveSpeed:number;attackRange:number;weaponDamage:number;weaponCooldown:number;
 attackTarget:number|null;facing:number;velocity:Point;prev:Point;slot:number;trailIndex:number;
 action:'idle'|'move'|'attack'|'heal'|'sieging'|'unsieging'|'dead'|'spawn';
 mode:'tank'|'siege';modeTimer:number;windup:number;attackLock:number;pendingTarget:number|null;lastShotAt:number;
 energy:number;healTarget:number|null;bileCooldown:number;guardianPod:number|null;stimUntil:number;
 deadAt:number|null;bornAt:number;thinkAt:number;distanceWalked:number;
}
export interface Pod extends Body {unitType:TerranType;createdAt:number;landedAt:number;guardianIds:Set<number>;guardTypes:ZergType[];
 status:'falling'|'active'|'opening'|'rescued'|'destroyed';resolvedAt:number|null;recruitId:number|null;jobId:number;stage:number}
export interface EconomicTarget extends Body {kind:'egg'|'drone';createdAt:number;expiresAt:number|null;resolvedAt:number|null;status:'active'|'rescued'|'expired'|'killed';origin:Point;facing:number}
export interface Job {id:number;unitType:TerranType;remaining:number;paid:{minerals:number;gas:number}}
export interface Building {type:BuildingType;remaining:number;queue:Job[]}
export interface Effect extends Point {id:number;kind:'shot'|'flame'|'explosion'|'bile'|'heal';end:Point;until:number;radius:number;owner:'terran'|'zerg';source:number}
export interface Pickup extends Point {id:number;minerals:number;gas:number}
/** Presentation never consumes gameplay IDs or random numbers. */
export interface VisualEvent extends Point {serial:number;time:number;kind:'attack'|'hit'|'death'|'bile-impact'|'pod-land'|'pod-open'|'pod-destroy'|'scv-rescue'|'egg-expired'|'drone-death';unitType:UnitType|null;entityId:number;flying:boolean;end:Point;facing:number;siege:boolean}
export interface Reward {id:string;name:string;description:string;icon:string;kind:'build'|'train'|'tech'|'economy';value:string;minerals:number;gas:number;discount:number;baseMinerals:number;baseGas:number}
