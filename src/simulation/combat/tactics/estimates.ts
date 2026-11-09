import type {World} from '../../world';
import type {Entity,Body} from '../../types';
import {resolveArmorPacket} from '../damage-packet';
import {expeditionWeaponBonuses,unitData,sourceDetails} from '../expedition-combat';
import {FASTER} from '../../../data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_WEAPON_PATTERNS} from '../../../data/expansion-units';
import {equipmentDamageFactor} from '../../starship/runtime';
import {projectionOutput} from '../../starship/projections';
import {fieldAttackFactor} from '../../field-events/pickups';
import {distance} from '../../movement/steering';

export interface Defense {hp:number;shield:number;armor:number;shieldArmor:number;barrier:number;talentShield:number;barrierReady:number;immortal:boolean;reduction:number;at:number;lastDamage:number;maxHp:number;maxShield:number;lifeRate:number;lifeDelay:number;shieldRate:number;shieldDelay:number;}
export interface PredictedHit {at:number;source:Entity;raw:number;hits:number;shieldBonus:number;penetration:number;minimum:number;guardian?:number;key:string;confidence:'flight'|'windup'|'position';}
/** Unknown shared absorption is zero credit, never an optimistic kill promise. */
export function defenseSnapshot(w:World,b:Body):Defense|undefined{
 const u=w.entities.get(b.id);
 if(b.owner!=='zerg'||!u||u.fun||u.encounter||u.mission||u.heroId||u.eliteId||u.heldBy||u.lordTrait==='regen'||u.protossCombat||u.zergCombat||u.heroCombat||u.eliteCombat||u.protossEliteCombat||u.zergEliteCombat||w.teamAuras.barriers.some(a=>a.target===u.id&&a.until>w.time)||w.expedition.spells.some(s=>s.kind==='transfusion'&&s.target===u.id&&s.until>w.time))return;
 const recovery=sourceDetails(u.unitType);
 return {hp:b.hp,shield:u.shield??0,armor:Math.max(0,b.armor+w.armorAura(b)),shieldArmor:u.shieldArmor??0,barrier:u.barrier??0,talentShield:u.talentShield??0,barrierReady:u.barrierReady??0,immortal:u.unitType==='immortal',reduction:1-Math.max(0,Math.min(1,b.damageReduction??0)),at:w.time,lastDamage:u.lastDamagedAt??-Infinity,maxHp:u.maxHp,maxShield:u.maxShield??0,lifeRate:recovery.lifeRegen*FASTER,lifeDelay:recovery.lifeDelay/FASTER,shieldRate:u.shieldRegen??0,shieldDelay:u.shieldDelay??0};
}
/** Local sequential defense state; shares exactly the real per-hit armor arithmetic. */
export function applyPredictedHit(state:Defense,p:PredictedHit){
 const lifeSeconds=Math.max(0,p.at-Math.max(state.at,state.lastDamage+state.lifeDelay)),shieldSeconds=Math.max(0,p.at-Math.max(state.at,state.lastDamage+state.shieldDelay));
 state.hp=Math.min(state.maxHp,state.hp+lifeSeconds*state.lifeRate);state.shield=Math.min(state.maxShield,state.shield+shieldSeconds*state.shieldRate);state.at=p.at;state.lastDamage=p.at;
 if(state.immortal&&p.raw>0&&p.at>=state.barrierReady){state.barrier=SOURCE_ABILITIES.immortalBarrier.absorption;state.barrierReady=p.at+SOURCE_ABILITIES.immortalBarrier.cooldown;}
 let health=0;
 for(let n=0;n<p.hits;n++){
  let raw=p.raw*state.reduction;if(p.guardian)raw=Math.max(p.minimum,raw-p.guardian);
  const barrier=Math.min(raw,state.barrier);state.barrier-=barrier;raw-=barrier;
  const talent=Math.min(raw,state.talentShield);state.talentShield-=talent;raw-=talent;
  const result=resolveArmorPacket({amount:raw,shield:state.shield,armor:state.armor,shieldArmor:state.shieldArmor,shieldBonus:p.shieldBonus*state.reduction,minimum:p.minimum,penetration:p.penetration,reduction:1,armorPaid:false,shieldOnly:false});
  state.shield=result.shield;health+=result.health;
 }
 state.hp=Math.max(0,state.hp-health);
}
export function packetEstimate(w:World,u:Entity,b:Body,damage:number,bonuses:readonly {attribute:string;amount:number}[],hits:number,shieldBonus=0,crit=1,ordinary=true,frozen=false){
 if(u.owner!=='terran'||!frozen&&(u.heroId||u.eliteId)||u.fun||u.mission||u.encounter||!defenseSnapshot(w,b))return;
 const factor=equipmentDamageFactor(w)*projectionOutput(w,u.id)*(ordinary?fieldAttackFactor(w,u):1);
 const raw=(damage+bonuses.reduce((n,a)=>n+(b.attributes.includes(a.attribute)?a.amount:0),0))*crit*factor;
 const guardian=u.attackRange>1&&w.expedition.spells.some(s=>s.kind==='guardian'&&s.owner===b.owner&&s.until>w.time&&distance(s,b)<=s.radius+b.unitRadius)?SOURCE_ABILITIES.guardianShield.rangedDamageReduction:0;
 return {raw,hits,shieldBonus:shieldBonus*crit*factor,penetration:0,minimum:.5,guardian};
}
export function nextAttackEstimate(w:World,u:Entity,b:Body){
 // Native areas, self-explosions and carrier mothers require their real receipts.
 if(['carrier','purifier_flagship','baneling','lurker','colossus'].includes(u.unitType)||u.unitType==='tank'&&u.mode==='siege')return;
 const bonus=expeditionWeaponBonuses(w,u),data=unitData(u);
 return packetEstimate(w,u,b,u.weaponDamage,bonus.bonuses,u.unitType==='thor'&&u.activeWeapon==='JavelinMissileLaunchers'?SOURCE_WEAPON_PATTERNS.thorExplosive.shots:data.attacks,bonus.shieldBonus);
}
