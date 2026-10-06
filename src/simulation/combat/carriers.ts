import {observeRecovery} from '../observation';
import {revisedProtossElite,fireProtossEliteChild} from './protoss-elite-runtime';
import {compositeEliteBuff,preserveTeamWounds,teamHealingFactor} from './team-auras';
import {eliteFriendlyAura} from './terran-elite-runtime';
import {PROTOSS_HERO_RULES as P} from '../../data/protoss-heroes';
import {protossState,protossShieldArmor} from './protoss-hero-passives';
import {launchProtossChildAttack} from './hero-attack-upgrades';
import {groundHeroBuff} from './hero-ground-auras';
import {uniqueActiveStats} from './unique-support';
import {teamCardEffects} from '../progression/team-cards';
import {PLAYER_COMBAT_FACTOR} from '../../data/player-unit-adaptations';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {UnitData} from '../../data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_INTERCEPTOR} from '../../data/expansion-units';
import {aggregateMvpTalentEffects} from '../progression/mvp-talent-effects';
import {HERO_BASIC_ATTACK} from '../../data/heroes';
import {TUNING} from '../../data/game';
import {distance,translate} from '../movement/steering';
import {eliteEffect} from './expedition-elites';

const HANGAR=SOURCE_ABILITIES.carrierHangar,BASE=SOURCE_INTERCEPTOR;
/** Survivors steering adaptation. Immutable source data plus the approved player adaptation; hangar costs remain unchanged. */
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
 const oldPools={hp:u.hp,maxHp:u.maxHp,shield:u.shield??0,maxShield:u.maxShield??0,factor:u.teamAuraFactors},za=compositeEliteBuff(w,carrier),modern=revisedProtossElite(carrier);const ea=eliteFriendlyAura(w,carrier),lostHp=Math.max(0,u.maxHp-u.hp)/(u.eliteHpAuraFactor??1),lostShield=Math.max(0,(u.maxShield??0)-(u.shield??0));
 const friendly=carrier.team==='player',hero=carrier.heroId==='purifier_flagship',state=w.expedition,tech=friendly&&!hero?state?.tech??{}:{},growth=w.growth(carrier),talents=friendly&&state&&w.runConfig?aggregateMvpTalentEffects(w.runConfig.frozenTalents.levels,w.runConfig.race,hero?{team:'player',race:carrier.race,kind:'hero',attributes:carrier.attributes}:{team:'player',race:carrier.race,kind:'summon',ownerFamilyId:'carrier',summonType:'interceptor'}):{},team=friendly?teamCardEffects(state):{damage:0,speed:0,health:0,armor:0},aura=groundHeroBuff(w,carrier),card=team.damage+aura.damage;
 u.race='protoss';u.team=carrier.owner==='terran'?'player':'enemy';u.owner=carrier.owner;u.rank=1;u.attributes=[...BASE.attributes];if(!u.flying)w.hash.invalidatePlanes();u.flying=true;u.unitRadius=BASE.unitRadius*TUNING.unitScale;u.maxHp=BASE.maxHp*(1+team.health+aura.health)*(friendly?PLAYER_COMBAT_FACTOR:1)*Math.max(ea.hp,1+za.maxHp)*(modern&&carrier.eliteId==='carrier.3'?2.5:1);u.hp=fill?u.maxHp:Math.max(0,u.maxHp-lostHp*ea.hp);u.eliteHpAuraFactor=ea.hp;u.armor=(BASE.armor+(tech['research.stargate.defense']??0)+team.armor)*(friendly?PLAYER_COMBAT_FACTOR:1);
 u.armor=(u.armor+ea.armor)*(1+aura.armorPct)+aura.armor+za.armorFlat;
 u.maxShield=BASE.maxShields*(1+team.health+aura.shield)*(friendly?PLAYER_COMBAT_FACTOR:1)*(1+za.maxShield);u.shield=fill?u.maxShield:Math.max(0,u.maxShield-lostShield);u.shieldArmor=(BASE.shieldArmor+(tech['research.stargate.defense']??0)+team.armor)*(friendly?PLAYER_COMBAT_FACTOR:1);u.shieldArmor=u.shieldArmor*(1+aura.shieldArmorPct)+protossShieldArmor(w,carrier)+za.shieldArmorFlat;u.shieldRegen=BASE.shieldRegenPerSecond;u.shieldDelay=BASE.shieldRegenDelay;
 u.moveSpeed=BASE.movementSpeed*(friendly?PLAYER_COMBAT_FACTOR:1)*(1+uniqueActiveStats(w,u).move+aura.move)*ea.move*(1+za.move);u.attackRange=BASE.weapon.attackRange;u.weaponDamage=(BASE.weapon.attackDamage+(tech['research.stargate.weapon']??0))*growth.damage*(1+card)*(1+(talents.weaponDamagePct??0))*eliteEffect(carrier,'interceptorDamageMultiplier')*(modern?(carrier.eliteId==='carrier.2'?2.5:carrier.eliteId==='carrier.3'?1.5:1):1)*(hero?P.purifier_flagship.childDamage/BASE.weapon.attackDamage:1)*(friendly&&!hero?PLAYER_COMBAT_FACTOR:1);u.attackPeriod=BASE.weapon.attackPeriod/(1+team.speed+uniqueActiveStats(w,u).speed+aura.speed)/growth.attackSpeed/(1+(talents.attackSpeedPct??0))*eliteEffect(carrier,'interceptorAttackPeriodMultiplier')/(hero?BASE.weapon.attackPeriod/P.purifier_flagship.childPeriod:1)/(friendly&&!hero?PLAYER_COMBAT_FACTOR:1)/(hero&&(carrier.protossCombat?.overdriveUntil??0)>w.time?2:1);u.attackPeriod/=(1+za.speed)*(modern&&carrier.eliteId==='carrier.1'&&(carrier.protossEliteCombat?.overdriveUntil??0)>w.time?2:1);u.shotInterval=u.attackPeriod;
 preserveTeamWounds(u,oldPools,{hp:(1+team.health+aura.health)/(1+team.health)*Math.max(ea.hp,1+za.maxHp),shield:(1+team.health+aura.shield)/(1+team.health)*(1+za.maxShield)},fill);
 u.maxEnergy=0;u.energy=0;u.energyRegen=0;u.healRate=0;return true;
}
function spawnInterceptor(w:World,carrier:Entity){const hangar=carrier.carrierHangar!,serial=hangar.serial++,angle=serial*2.399963,p={x:carrier.x+Math.sin(angle)*.7,z:carrier.z+Math.cos(angle)*.7};
 // Reuse the entity DTO, not the carrier's gameplay data. The explicit summon tag routes its logic.
 const u:Entity={...carrier,id:w.nextId++,...p,prev:{...p},unitType:'carrier',summonKind:'interceptor',summonOwnerId:carrier.id,carrierHangar:undefined,temporary:true,temporaryUntil:undefined,protossEliteCombat:undefined,eliteCombat:undefined,zergEliteCombat:undefined,teamAuraFactors:undefined,carrierEliteCycles:0,protossCombat:undefined,heroCombat:undefined,zergCombat:undefined,heroId:undefined,eliteId:undefined,enemyTier:undefined,enemyLevel:undefined,enemyName:undefined,lordTrait:undefined,modelKey:'interceptor',visualScale:.2,
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
  hangar.initialized=true;for(let i=ownedInterceptors(w,carrier.id).length;i<(carrier.heroId==='purifier_flagship'?P.purifier_flagship.children:revisedProtossElite(carrier)&&carrier.eliteId==='carrier.1'?8:HANGAR.initialCount);i++)spawnInterceptor(w,carrier);
 }
}
/** One paid construction slot per mother; intermission, pause and receipt decisions freeze it. */
export function tickCarrierSubsystem(w:World,dt:number){
 if(!w.expedition)return;cleanupCarrierSummons(w);if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Carrier simulation delta must be nonnegative');initializeCarrierSubsystem(w);
 for(const carrier of [...w.entities.values()])if(isCarrier(carrier)&&carrier.hp>0){
  let seconds=dt;const hangar=carrier.carrierHangar!;
  // The campaign has no enemy economy. Enemy carriers get only their included initial complement.
  if(carrier.owner==='terran')while(ownedInterceptors(w,carrier.id).length<(carrier.heroId==='purifier_flagship'?P.purifier_flagship.children:revisedProtossElite(carrier)&&carrier.eliteId==='carrier.2'?4:HANGAR.maxCount)){
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
 if(revisedProtossElite(mother)&&mother.eliteId==='carrier.2'&&ownedInterceptors(w,mother.id).sort((a,b)=>a.id-b.id).findIndex(c=>c.id===u.id)>=4)return false;
 u.rewardOwnerId=mother.id;u.rewardOwnerGeneration=mother.bornAt;u.rewardSourceKind=mother.temporary?'temporary':mother.heroId?'hero':mother.eliteId?'elite':'ordinary';
 u.attackFacing=Math.atan2(target.x-u.x,target.z-u.z);u.facing=u.attackFacing;u.lastShotAt=w.time;u.shotSequence=(u.shotSequence??0)+1;w.stats.shots++;w.visual('attack',u,target);if(mother.heroId==='purifier_flagship'){launchProtossChildAttack(w,u,mother,target);return true;}if(fireProtossEliteChild(w,u,mother,target))return true;w.hit(target,u.weaponDamage,[],BASE.weapon.attacks,u.owner,.5,0,u.id,false,false,0,true);
 if(target.hp>0&&mother.team==='player'&&!mother.temporary&&w.talent('apm_master'))w.hit(target,u.weaponDamage*BASE.weapon.attacks*1.15,[],1,u.owner,.5,0,u.id,false,false,0,true);
 w.effect('shot',u,target,.07,.14);return true;
}
function fly(w:World,u:Entity,goal:Point,dt:number){const dx=goal.x-u.x,dz=goal.z-u.z,d=Math.hypot(dx,dz),step=Math.min(d,u.moveSpeed*dt);u.prev={x:u.x,z:u.z};if(d>.01){u.facing=Math.atan2(dx,dz);translate(u,{x:dx/d*step,z:dz/d*step},u.unitRadius,true,w.obstacles,w.mapHalf,w.terrain);}u.velocity={x:dt?(u.x-u.prev.x)/dt:0,z:dt?(u.z-u.prev.z)/dt:0};u.distanceWalked+=distance(u,u.prev);u.action=d>.1?'move':'idle';}
/** Return true for a handled summon so World does not also run ordinary unit AI/recovery/fire. */
export function tickInterceptor(w:World,u:Entity,dt:number){
 if(!isInterceptor(u))return false;if(u.hp<=0)return true;const carrier=u.summonOwnerId===undefined?undefined:w.entities.get(u.summonOwnerId);if(!carrier||carrier.hp<=0){retire(w,u);return true;}
 refreshInterceptorStats(w,u);const observedShield=u.shield??0;if(w.time-(u.lastDamagedAt??-Infinity)>=(u.shieldDelay??0))u.shield=Math.min(u.maxShield??0,(u.shield??0)+(u.shieldRegen??0)*dt);observeRecovery(w,'natural_regeneration',u,0,(u.shield??0)-observedShield);u.weaponCooldown=Math.max(0,u.nextShotAt-w.time);
 if(u.pendingTarget!==null){u.windup=Math.max(0,u.windup-dt);u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='attack';if(u.windup<=1e-8){const target=w.body(u.pendingTarget);if(target)fireInterceptor(w,u,target);u.pendingTarget=null;}return true;}
 const reserve=revisedProtossElite(carrier)&&carrier.eliteId==='carrier.2'&&ownedInterceptors(w,carrier.id).sort((a,b)=>a.id-b.id).findIndex(b=>b.id===u.id)>=4;
 const target=carrier.attackTarget===null?undefined:w.body(carrier.attackTarget),active=!reserve&&target&&canEngage(w,carrier,target)&&distance(u,carrier)<=INTERCEPTOR_STEERING.leash;
 if(active){u.attackTarget=target.id;if(canStrike(w,u,target)){if(w.time+1e-8>=u.nextShotAt){u.pendingTarget=target.id;u.windup=BASE.weapon.damagePoint;u.nextShotAt=w.time+u.attackPeriod;u.action='attack';u.velocity={x:0,z:0};u.prev={x:u.x,z:u.z};}else {u.action='idle';u.velocity={x:0,z:0};u.prev={x:u.x,z:u.z};}return true;}
  const dx=u.x-target.x,dz=u.z-target.z,d=Math.hypot(dx,dz)||1,standOff=u.attackRange*.75+u.unitRadius+target.unitRadius;fly(w,u,{x:target.x+dx/d*standOff,z:target.z+dz/d*standOff},dt);
 }else {u.attackTarget=null;if(revisedProtossElite(carrier)&&carrier.eliteId==='carrier.3'&&distance(u,carrier)<=3&&u.pendingTarget===null){const gain=Math.min(u.maxHp-u.hp,u.maxHp*.15*dt*teamHealingFactor(w,u,false));u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,carrier,u,gain);if(gain>0)w.visual('support-impact',carrier,u);}const angle=w.time*INTERCEPTOR_STEERING.orbitSpeed+(u.slot-2000)*2.399963;fly(w,u,{x:carrier.x+Math.sin(angle)*INTERCEPTOR_STEERING.orbitRadius,z:carrier.z+Math.cos(angle)*INTERCEPTOR_STEERING.orbitRadius},dt);}
 return true;
}
