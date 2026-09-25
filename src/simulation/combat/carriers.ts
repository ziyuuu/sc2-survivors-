import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {UnitData} from '../../data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_INTERCEPTOR} from '../../data/expansion-units';
import {aggregateMvpTalentEffects} from '../progression/mvp-talent-effects';
import {TUNING} from '../../data/game';
import {distance,translate} from '../movement/steering';
import {eliteEffect} from './expedition-elites';

const HANGAR=SOURCE_ABILITIES.carrierHangar,BASE=SOURCE_INTERCEPTOR;
/** Survivors steering adaptation. Damage, shields, speed and hangar costs remain source values. */
export const INTERCEPTOR_STEERING={orbitRadius:1.4,leash:14,orbitSpeed:1.1} as const;
export const isInterceptor=(u:Entity)=>u.summonKind==='interceptor';
const isCarrier=(u:Entity)=>(u.unitType==='carrier'&&!u.heroId||u.heroId==='purifier_flagship')&&!u.summonKind;
export function ownedInterceptors(w:World,carrierId:number){return [...w.entities.values()].filter(u=>isInterceptor(u)&&u.summonOwnerId===carrierId&&u.hp>0);}
export function interceptorUnitData():UnitData {
 return {name:'Interceptor',zh:'截击机',maxHp:BASE.maxHp,armor:BASE.armor,movementSpeed:BASE.movementSpeed,attackDamage:BASE.weapon.attackDamage,attacks:BASE.weapon.attacks,attackPeriod:BASE.weapon.attackPeriod,attackRange:BASE.weapon.attackRange,targetType:BASE.weapon.targetType,splash:[],bonusDamage:[],attributes:[...BASE.attributes],productionTime:HANGAR.replacementSeconds,mineralCost:HANGAR.mineralCost,gasCost:0,unitRadius:BASE.unitRadius,flying:true,damagePoint:BASE.weapon.damagePoint};
}
/** Rebuild from immutable base + mother rank + scoped output once; never compound previous stats. */
export function refreshInterceptorStats(w:World,u:Entity,fill=false){
 if(!isInterceptor(u))return false;const carrier=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!carrier||!isCarrier(carrier))return false;
 const friendly=carrier.team==='player',hero=carrier.heroId==='purifier_flagship',state=w.expedition,tech=friendly&&!hero?state?.tech??{}:{},growth=w.growth(carrier),talents=friendly&&state&&w.runConfig?aggregateMvpTalentEffects(w.runConfig.frozenTalents.levels,w.runConfig.race,hero?{team:'player',race:carrier.race,kind:'hero',attributes:carrier.attributes}:{team:'player',race:carrier.race,kind:'summon',ownerFamilyId:'carrier',summonType:'interceptor'}):{},card=friendly&&!hero?state?.cardTotals['weapon.carrier']??0:0;
 u.race='protoss';u.team=carrier.owner==='terran'?'player':'enemy';u.owner=carrier.owner;u.rank=1;u.attributes=[...BASE.attributes];if(!u.flying)w.hash.invalidatePlanes();u.flying=true;u.unitRadius=BASE.unitRadius*TUNING.unitScale;u.maxHp=BASE.maxHp;u.hp=fill?u.maxHp:Math.min(u.hp,u.maxHp);u.armor=BASE.armor+(tech['protoss.air_armor']??0);
 u.maxShield=BASE.maxShields;u.shield=fill?u.maxShield:Math.min(u.shield??0,u.maxShield);u.shieldArmor=BASE.shieldArmor+(tech['protoss.shields']??0);u.shieldRegen=BASE.shieldRegenPerSecond;u.shieldDelay=BASE.shieldRegenDelay;
 u.moveSpeed=BASE.movementSpeed;u.attackRange=BASE.weapon.attackRange;u.weaponDamage=(BASE.weapon.attackDamage+(tech['protoss.air_weapon']??0))*growth.damage*(1+card)*(1+(talents.weaponDamagePct??0))*eliteEffect(carrier,'interceptorDamageMultiplier')*(hero?1.2:1);u.attackPeriod=BASE.weapon.attackPeriod/growth.attackSpeed/(1+(talents.attackSpeedPct??0))*eliteEffect(carrier,'interceptorAttackPeriodMultiplier');u.shotInterval=u.attackPeriod;
 u.maxEnergy=0;u.energy=0;u.energyRegen=0;u.healRate=0;return true;
}
function spawnInterceptor(w:World,carrier:Entity){const hangar=carrier.carrierHangar!,serial=hangar.serial++,angle=serial*2.399963,p={x:carrier.x+Math.sin(angle)*.7,z:carrier.z+Math.cos(angle)*.7};
 // Reuse the entity DTO, not the carrier's gameplay data. The explicit summon tag routes its logic.
 const u:Entity={...carrier,id:w.nextId++,...p,prev:{...p},unitType:'carrier',summonKind:'interceptor',summonOwnerId:carrier.id,carrierHangar:undefined,temporary:true,temporaryUntil:undefined,heroId:undefined,eliteId:undefined,enemyTier:undefined,enemyLevel:undefined,enemyName:undefined,lordTrait:undefined,modelKey:'interceptor',visualScale:.2,
  rank:1,slot:2000+serial,attackTarget:null,pendingTarget:null,action:'spawn',facing:angle,attackFacing:angle,velocity:{x:0,z:0},windup:0,attackLock:0,weaponCooldown:0,nextShotAt:w.time,lastShotAt:-100,shotSequence:0,aimStartedAt:null,repositionUntil:0,mode:'tank',desiredMode:'tank',modeTimer:0,nativeMode:undefined,desiredNativeMode:undefined,nativeModeUntil:undefined,
  guardianPod:null,guardOrigin:false,freeConscript:false,stimUntil:0,deadAt:null,bornAt:w.time,thinkAt:0,distanceWalked:0,lastDamagedAt:undefined,healTarget:null,healTargets:[],abilityReady:undefined,specialReady:Infinity,cloaked:false,barrier:undefined,barrierReady:undefined,stoppedUntil:undefined,slowUntil:undefined,slowFactor:undefined,attackSlowUntil:undefined,attackSlowFactor:undefined,moveSlowUntil:undefined,moveSlowFactor:undefined,tacticalTier:undefined,tacticalDirection:undefined,lastStandUntil:undefined,lastStandStage:undefined};
 w.entities.set(u.id,u);refreshInterceptorStats(w,u,true);return u;
}
function retire(w:World,u:Entity){if(u.hp<=0)return;u.hp=0;u.shield=0;u.deadAt=w.time;u.action='dead';u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;w.statuses.removeTarget(u.id);w.visual('death',u);}
/** Mother loss discards incomplete paid work and retires summons without loot or rank rewards. */
export function cleanupCarrierSummons(w:World){
 for(const u of w.entities.values())if(isCarrier(u)&&u.hp<=0&&u.carrierHangar)u.carrierHangar.job=null;
 for(const u of w.entities.values())if(isInterceptor(u)&&u.hp>0){const owner=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!owner||owner.hp<=0||!isCarrier(owner)||owner.owner!==u.owner)retire(w,u);}
}
/** Safe after load or an add-unit transaction; the persisted marker prevents free refills. */
export function initializeCarrierSubsystem(w:World){
 if(!w.expedition)return;cleanupCarrierSummons(w);
 for(const carrier of [...w.entities.values()])if(isCarrier(carrier)&&carrier.hp>0){
  carrier.carrierHangar??={initialized:false,serial:0,job:null};const hangar=carrier.carrierHangar;if(hangar.initialized)continue;
  // Existing owned entities win during migration; rehydration must never duplicate them.
  hangar.initialized=true;for(let i=ownedInterceptors(w,carrier.id).length;i<HANGAR.initialCount;i++)spawnInterceptor(w,carrier);
 }
}
/** One paid construction slot per mother; intermission, pause and receipt decisions freeze it. */
export function tickCarrierSubsystem(w:World,dt:number){
 if(!w.expedition)return;cleanupCarrierSummons(w);if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Carrier simulation delta must be nonnegative');initializeCarrierSubsystem(w);
 for(const carrier of [...w.entities.values()])if(isCarrier(carrier)&&carrier.hp>0){
  let seconds=dt;const hangar=carrier.carrierHangar!;
  // The campaign has no enemy economy. Enemy carriers get only their included initial complement.
  if(carrier.owner==='terran')while(ownedInterceptors(w,carrier.id).length<HANGAR.maxCount){
   if(!hangar.job){if(w.wallet.minerals<HANGAR.mineralCost)break;w.wallet.minerals-=HANGAR.mineralCost;w.economyTotals.production.minerals+=HANGAR.mineralCost;hangar.job={remaining:HANGAR.replacementSeconds,paid:HANGAR.mineralCost};}
   if(seconds+1e-8<hangar.job.remaining){hangar.job.remaining-=seconds;break;}
   seconds=Math.max(0,seconds-hangar.job.remaining);hangar.job=null;spawnInterceptor(w,carrier);
  }
  const target=carrier.attackTarget===null?undefined:w.body(carrier.attackTarget);if(!target||!canEngage(w,carrier,target))carrier.attackTarget=w.findTarget(carrier,carrier.attackRange)?.id??null;
  for(const u of ownedInterceptors(w,carrier.id))refreshInterceptorStats(w,u);
 }
}
function canEngage(w:World,carrier:Entity,target:Body){return target.hp>0&&target.owner!==carrier.owner&&w.edgeDistance(carrier,target)<=carrier.attackRange+.5&&w.targetAllowed(carrier,target)&&w.hasAttackLine(carrier,target);}
function canStrike(w:World,u:Entity,target:Body){return target.hp>0&&target.owner!==u.owner&&w.edgeDistance(u,target)<=u.attackRange+.2&&w.targetAllowed(u,target)&&w.hasAttackLine(u,target);}
/** Uses real targetable child HP. Parent loss or a dead/illegal target cancels an unfinished shot. */
export function fireInterceptor(w:World,u:Entity,target:Body){if(!isInterceptor(u)||u.hp<=0||!canStrike(w,u,target))return false;const mother=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!mother||mother.hp<=0)return false;
 u.rewardOwnerId=mother.id;u.rewardOwnerGeneration=mother.bornAt;u.rewardSourceKind=mother.temporary?'temporary':mother.heroId?'hero':mother.eliteId?'elite':'ordinary';
 u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.facing=u.attackFacing;u.lastShotAt=w.time;u.shotSequence=(u.shotSequence??0)+1;w.stats.shots++;w.visual('attack',u,target);w.hit(target,u.weaponDamage,[],BASE.weapon.attacks,u.owner,.5,0,u.id,false,false,0,true);
 if(target.hp>0&&mother.team==='player'&&!mother.temporary&&w.talent('apm_master'))w.hit(target,u.weaponDamage*BASE.weapon.attacks,[],1,u.owner,.5,0,u.id,false,false,0,true);
 w.effect('shot',u,target,.07,.14);return true;
}
function fly(w:World,u:Entity,goal:Point,dt:number){const dx=goal.x-u.x,dz=goal.z-u.z,d=Math.hypot(dx,dz),step=Math.min(d,u.moveSpeed*dt);u.prev={x:u.x,z:u.z};if(d>.01){u.facing=Math.atan2(dx,dz);translate(u,{x:dx/d*step,z:dz/d*step},u.unitRadius,true,w.obstacles,w.mapHalf,w.terrain);}u.velocity={x:dt?(u.x-u.prev.x)/dt:0,z:dt?(u.z-u.prev.z)/dt:0};u.distanceWalked+=distance(u,u.prev);u.action=d>.1?'move':'idle';}
/** Return true for a handled summon so World does not also run ordinary unit AI/recovery/fire. */
export function tickInterceptor(w:World,u:Entity,dt:number){
 if(!isInterceptor(u))return false;if(u.hp<=0)return true;const carrier=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!carrier||carrier.hp<=0){retire(w,u);return true;}
 refreshInterceptorStats(w,u);if(w.time-(u.lastDamagedAt??-Infinity)>=(u.shieldDelay??0))u.shield=Math.min(u.maxShield??0,(u.shield??0)+(u.shieldRegen??0)*dt);u.weaponCooldown=Math.max(0,u.nextShotAt-w.time);
 if(u.pendingTarget!==null){u.windup=Math.max(0,u.windup-dt);u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='attack';if(u.windup<=1e-8){const target=w.body(u.pendingTarget);if(target)fireInterceptor(w,u,target);u.pendingTarget=null;}return true;}
 const target=carrier.attackTarget===null?undefined:w.body(carrier.attackTarget),active=target&&canEngage(w,carrier,target)&&distance(u,carrier)<=INTERCEPTOR_STEERING.leash;
 if(active){u.attackTarget=target.id;if(canStrike(w,u,target)){if(w.time+1e-8>=u.nextShotAt){u.pendingTarget=target.id;u.windup=BASE.weapon.damagePoint;u.nextShotAt=w.time+u.attackPeriod;u.action='attack';u.velocity={x:0,z:0};u.prev={x:u.x,z:u.z};}else {u.action='idle';u.velocity={x:0,z:0};u.prev={x:u.x,z:u.z};}return true;}
  const dx=u.x-target.x,dz=u.z-target.z,d=Math.hypot(dx,dz)||1,standOff=u.attackRange*.75+u.unitRadius+target.unitRadius;fly(w,u,{x:target.x+dx/d*standOff,z:target.z+dz/d*standOff},dt);
 }else {u.attackTarget=null;const angle=w.time*INTERCEPTOR_STEERING.orbitSpeed+(u.slot-2000)*2.399963;fly(w,u,{x:carrier.x+Math.sin(angle)*INTERCEPTOR_STEERING.orbitRadius,z:carrier.z+Math.cos(angle)*INTERCEPTOR_STEERING.orbitRadius},dt);}
 return true;
}
