import type {UnitType,TerranType} from '../data/sc2-units';
import type {BuildingType} from '../data/game';
export interface Point {x:number;z:number}
export interface Body extends Point {id:number;hp:number;maxHp:number;armor:number;unitRadius:number;flying:boolean;attributes:string[];owner:'terran'|'zerg'}
export interface Entity extends Body {
 unitType:UnitType;rank:number;moveSpeed:number;attackRange:number;weaponDamage:number;weaponCooldown:number;
 attackTarget:number|null;facing:number;velocity:Point;prev:Point;slot:number;trailIndex:number;
 action:'idle'|'move'|'attack'|'heal'|'sieging'|'unsieging'|'dead'|'spawn';
 mode:'tank'|'siege';modeTimer:number;windup:number;attackLock:number;pendingTarget:number|null;
 energy:number;healTarget:number|null;bileCooldown:number;guardianPod:number|null;stimUntil:number;
 deadAt:number|null;bornAt:number;thinkAt:number;distanceWalked:number;
}
export interface Pod extends Body {unitType:TerranType;landedAt:number;expiresAt:number;guardianIds:Set<number>;
 status:'active'|'rescued'|'expired'|'destroyed';resolvedAt:number|null;recruitId:number|null;jobId:number}
export interface Job {id:number;unitType:TerranType;remaining:number;paid:{minerals:number;gas:number}}
export interface Building {type:BuildingType;remaining:number;queue:Job[]}
export interface Effect extends Point {id:number;kind:'shot'|'flame'|'explosion'|'bile'|'heal';end:Point;until:number;radius:number;owner:'terran'|'zerg';source:number}
export interface Pickup extends Point {id:number;minerals:number;gas:number}
export interface Reward {id:string;name:string;description:string;icon:string;kind:'build'|'train'|'tech'|'economy';value:string;minerals:number;gas:number}
