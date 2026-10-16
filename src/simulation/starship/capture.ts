import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import type {AttackBudget} from './runtime';
import {applyEquipmentStats,detachEquipmentStats} from './runtime';
import {equipmentRandom} from './inventory';
import {realEquipmentEnemy,equipmentKillSource} from './growth';
import {lockEquipmentSource} from './modules';
import {rankStats} from '../../data/ranks';
import {projectionFor} from './projections';

export interface CapturedEquipmentBody {base:Entity;rank:number;}
export function refreshCapturedEquipment(w:World,u:Entity,fill=false){const captured=w.starship.captured.get(u.id);if(!captured)return false;detachEquipmentStats(w,u);const hp=u.maxHp?u.hp/u.maxHp:0,shield=(u.maxShield??0)>0?(u.shield??0)/u.maxShield!:0,b=captured.base,old=rankStats(captured.rank),next=rankStats(u.rank),elite=b.enemyTier==='elite';
 const health=elite?(1+.3*(u.rank-1))/(1+.3*(captured.rank-1)):next.health/old.health,damage=elite?(1+.35*(u.rank-1))/(1+.35*(captured.rank-1)):next.damage/old.damage,speed=elite?1:next.attackSpeed/old.attackSpeed;
 u.maxHp=b.maxHp*health;u.hp=fill?u.maxHp:u.maxHp*hp;u.maxShield=(b.maxShield??0)*health;u.shield=fill?u.maxShield:u.maxShield*shield;u.weaponDamage=b.weaponDamage*damage;u.attackPeriod=b.attackPeriod/speed;u.armor=b.armor+(elite?.25*(u.rank-captured.rank):next.armor-old.armor);u.moveSpeed=b.moveSpeed;u.attackRange=b.attackRange;u.maxEnergy=b.maxEnergy;u.energyRegen=b.energyRegen;u.healRate=b.healRate;u.shieldArmor=b.shieldArmor;u.shieldRegen=b.shieldRegen;u.shieldDelay=b.shieldDelay;applyEquipmentStats(w,u,fill);return true;
}
export function equipmentCaptureHit(w:World,source:Entity,target:Body,shot:AttackBudget){if(shot.derived||shot.captureChecked||target.id!==shot.target||target.hp<=0||projectionFor(w,source))return;const e=shot.effects.find(e=>e.key==='capture'),u=w.entities.get(target.id);if(!e||!u||!realEquipmentEnemy(w,u)||u.heroId||u.enemyTier==='boss'||u.enemyTier==='lord'||u.hp/u.maxHp>=e.values[0]||!equipmentKillSource(w,source.id))return;
 const count=w.allies().filter(u=>w.starship.members.get(u.id)?.source===e.source&&!u.temporary).length;if(count>=e.values[2]||w.time<(w.starship.numbers.get('capture-ready')??0))return;shot.captureChecked=true;const difficulty={easy:3,normal:4,hard:5,hell:6}[w.difficulty];if(equipmentRandom(w.starship.account)>=e.values[difficulty])return;
 const base=structuredClone(u);u.owner='terran';u.team='player';u.rank=u.enemyLevel??u.rank;u.guardianPod=null;u.guardOrigin=false;u.attackTarget=null;u.pendingTarget=null;u.windup=0;u.attackLock=0;u.velocity={x:0,z:0};u.slot=10000+u.id;u.enemyOrigin=undefined;
 w.enemySpecials.cancelUncommittedSource(u.id);w.starship.captured.set(u.id,{base,rank:u.rank});w.starship.members.set(u.id,{source:e.source,items:e.items,independent:true,origin:'capture'});w.starship.numbers.set('capture-ready',w.time+e.values[1]);w.hash.invalidatePlanes();w.refreshStats(u);equipmentPresentation(w,'capture',u);w.visual('squad-transfer',u);lockEquipmentSource(w,e);
}
