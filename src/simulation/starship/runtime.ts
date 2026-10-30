import {equipmentNativeWeaponBudget} from './weapon-budget';
import {canReceiveRecovery} from '../combat/support-targets';
import {teamCardEffects} from '../progression/team-cards';
import {uniqueActiveStats} from '../combat/unique-support';
import {newEquipmentLootRuntime,type EquipmentLootRuntime} from './loot-presentation';
import {tickEquipmentFortifications,type EquipmentFortRecord} from './fortifications';
import {newEquipmentHeroRuntime,equipmentDevourSpeed,equipmentDevourWeapon,equipmentBanelingFactor,type EquipmentHeroRuntime} from './hero-advancements';
import {equipmentOutputFactor,tickAdvancedEquipmentSupport,type AdvancedEquipmentBody,type EquipmentNativeHero,type EquipmentYamatoSequence} from './advanced-support';
import {tickEquipmentRecall} from './recall';
import {equipmentCaptureHit,type CapturedEquipmentBody} from './capture';
import {newEquipmentLife,tickEquipmentLife,type EquipmentLifeRuntime} from './lifecycle';
import {projectionFor,tickEquipmentProjections,type EquipmentProjection} from './projections';
import {tickEquipmentDefense,type EquipmentBarrier} from './defense';
import {equipmentControlBoost,tickEquipmentControls} from './controls';
import {tickEquipmentSupport,type EquipmentSupportStrike,type EquipmentBurnZone,type EquipmentSupportSequence} from './support';
import type {ExpeditionReward} from '../progression/expedition-drafts';
import type {EliteId} from '../../data/elites';
import {startEquipmentEconomy,tickEquipmentEconomy,equipmentPeriodicResources} from './economy';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import type {Race} from '../../data/races';
import {equippedItems,newEquipmentAccount,equip,unequip,beginEquipmentRun,equipmentRandom} from './inventory';
import {emptyTotals,totalAttributes,identityFactors,rankEquipmentBonus} from './attributes';
import {equipmentTemplate} from './catalog';
import type {ActiveEquipmentEffect} from './selection';
import {activeEquipmentEffects,equipmentValue,initializeEquipmentMembers,tickEquipmentModules,equipmentEngagementTarget,type EquipmentMemberSource,type PendingEquipmentMember} from './modules';
import {failure,success,type EquipmentAccount,type EquipmentTotals,type EquipmentSlot} from './types';
import {directionMatches,permanentEquipmentBody} from './eligibility';
import {equipmentBoundBody} from './members';
import {collectNearbyEquipment} from './drops';
import {equipmentPhase,equipmentChangeAllowed} from './phase';
import {tickEquipmentGrowth,rememberEquipmentSource,type EquipmentBounty} from './growth';
import {newEquipmentCombat,tickEquipmentCombat,equipmentAttackEffects,equipmentCommitAttack,equipmentHoldFactor,type EquipmentCombatRuntime} from './combat';

interface NativeStats {maxHp:number;maxShield:number;armor:number;moveSpeed:number;attackRange:number;attackPeriod:number}
export interface AttackBudget {target:number;remaining:number;truePerHit:number;nativeDamage:number;attackFactor:number;owner:number;sequence:number;hits:number;weaponDamage:number;bonuses:{attribute:string;amount:number}[];effects:readonly ActiveEquipmentEffect[];handled:boolean;derived:boolean;clustered?:boolean;captureChecked?:boolean;before?:boolean;forcedCrit?:boolean;armorPen?:number;precisionBoost?:boolean;packetDamage?:number;packetBonuses?:{attribute:string;amount:number}[]}
export interface StarshipRuntime {
 loot:EquipmentLootRuntime;
 forts:Map<number,EquipmentFortRecord>;
 hero:EquipmentHeroRuntime;
 battleView?:()=>import('../combat/battle-view').BattleView|undefined;advancedBodies:Map<number,AdvancedEquipmentBody>;nativeHeroes:Map<number,EquipmentNativeHero>;skillSources:Map<number,Entity>;yamatoSequences:EquipmentYamatoSequence[];
 captured:Map<number,CapturedEquipmentBody>;packetOwners:WeakMap<object,{owner:Body['owner'];source:number}>;life:EquipmentLifeRuntime;projections:Map<number,EquipmentProjection>;barriers:Map<number,EquipmentBarrier[]>;combat:EquipmentCombatRuntime;combatSources:Map<number,Entity>;bounty?:EquipmentBounty;
 cards:{id:string;reward:ExpeditionReward;variant?:EliteId;origin:'purchase'|'drop'}[];account:EquipmentAccount;enabled:boolean;derivedEnemies:Set<number>;revision:number;race:Race;totals:EquipmentTotals;highQualityTotals:EquipmentTotals;
 native:WeakMap<Entity,NativeStats>;nativeTargets:WeakMap<Entity,number>;attacks:WeakMap<object,AttackBudget>;attackSources:WeakMap<object,Entity>;active:AttackBudget|null;
 cycles:Map<string,number>;numbers:Map<string,number>;strikes:EquipmentSupportStrike[];burnZones:EquipmentBurnZone[];supportSequences:EquipmentSupportSequence[];
 effectsRevision:number;effectsRace:Race;effects:ActiveEquipmentEffect[];
 members:Map<number,EquipmentMemberSource>;boundMembers:Map<string,number>;pendingMembers:PendingEquipmentMember[];window:{id:number;shop:number;development:number};
}
export function newStarshipRuntime(account?:EquipmentAccount,enabled=account!==undefined):StarshipRuntime{return {loot:newEquipmentLootRuntime(),forts:new Map(),hero:newEquipmentHeroRuntime(),advancedBodies:new Map(),nativeHeroes:new Map(),skillSources:new Map(),yamatoSequences:[],captured:new Map(),packetOwners:new WeakMap(),life:newEquipmentLife(),projections:new Map(),barriers:new Map(),combat:newEquipmentCombat(),combatSources:new Map(),cards:[],account:account??newEquipmentAccount(),enabled,derivedEnemies:new Set(),revision:-1,race:'terran',totals:emptyTotals(),highQualityTotals:emptyTotals(),native:new WeakMap(),nativeTargets:new WeakMap(),attacks:new WeakMap(),attackSources:new WeakMap(),active:null,cycles:new Map(),numbers:new Map(),strikes:[],burnZones:[],supportSequences:[],effectsRevision:-1,effectsRace:'terran',effects:[],members:new Map(),boundMembers:new Map(),pendingMembers:[],window:{id:0,shop:0,development:0}};}
export function equipmentTotals(w:World){const s=w.starship,race=w.expedition.race;if(s.revision!==s.account.revision||s.race!==race){s.race=race;s.revision=s.account.revision;const items=equippedItems(s.account,s.race);s.totals=totalAttributes(items);s.highQualityTotals=totalAttributes(items.filter(item=>item.quality>=4));}return s.totals;}
export function equipmentRecipient(w:World,u:Entity){return !u.mission?.holdout&&!u.mission?.fleet&&u.owner==='terran'&&u.team==='player'&&!u.attributes.includes('Structure')&&!['scv','drone','probe'].includes(u.unitType);}
const isChild=(u:Entity)=>u.summonKind==='interceptor';
function parent(w:World,u:Entity){return isChild(u)?w.entities.get(u.summonOwnerId!):u;}
function budgetShare(w:World,u:Entity){const owner=parent(w,u);return owner&&isChild(u)?1/Math.max(1,[...w.entities.values()].filter(child=>isChild(child)&&child.summonOwnerId===owner.id&&child.hp>0).length):1;}
const nonempty=(totals:ReturnType<typeof equipmentUnitTotals>)=>Object.entries(totals).some(([key,value])=>['lifeFactor','exclusiveHealth','exclusiveShield','burstFactor'].includes(key)?value!==1:!!value);
export function equipmentUnitTotals(w:World,u:Entity){const owner=parent(w,u)??u,t={...equipmentTotals(w),shieldPercent:0,armorPercent:0,native:0,lifeFactor:1,exclusiveHealth:1,exclusiveShield:1,burstFactor:(w.starship.numbers.get('drop-speed:'+u.id)??0)>w.time?2:1},ordinary=!owner.heroId&&!owner.eliteId&&owner.enemyTier!=='elite';
 const high=w.starship.highQualityTotals,rankBonus=rankEquipmentBonus(owner);let highDps=high.dps,highHp=high.hp;
 for(const effect of activeEquipmentEffects(w)){const [scope,key]=effect.key.split('.'),bound=equipmentBoundBody(w,effect,owner);
  if(scope==='stat'||scope==='bound'&&bound||scope==='elite'&&(!!owner.eliteId||owner.enemyTier==='elite')||scope==='ordinary'&&ordinary&&permanentEquipmentBody(w,owner)||scope==='direction'&&ordinary&&permanentEquipmentBody(w,owner)&&directionMatches(effect.binding,owner.unitType)){
   if(scope==='bound'&&effect.quality===5&&(key==='health'||key==='shield')){if(key==='health')t.exclusiveHealth*=1+effect.values[0];else t.exclusiveShield*=1+effect.values[0];}
   else {if(key in t)t[key as keyof typeof t]+=effect.values[0];if(key==='shield')t.shieldPercent+=effect.values[0];}
  }
  if(effect.key==='white_dps'){t.dps+=equipmentTotals(w).dps*effect.values[0];highDps+=high.dps*effect.values[0];}if(effect.key==='white_hp'){t.hp+=equipmentTotals(w).hp*effect.values[0];highHp+=high.hp*effect.values[0];}if(effect.key==='white_armor')t.armor+=equipmentTotals(w).armor*effect.values[0];if(effect.key==='armor_percent')t.armorPercent+=effect.values[0];
  if(effect.key==='adventurer'||effect.key==='adventurer_replace')t.lifeFactor=Math.min(t.lifeFactor,1-effect.values[0]);
  if(effect.key==='bound.native_tier'&&bound)t.native+=effect.values[(effect.pieces??0)>=6?1:0];
 }
 t.dps+=highDps*rankBonus;t.trueDps+=high.trueDps*rankBonus;t.hp+=highHp*rankBonus;
 const boost=equipmentControlBoost(w,u);if(boost){t.move+=boost.values[4];t.dodge+=boost.values[6];t.crit+=boost.values[7];t.critDamage+=boost.values[8];t.trueDps+=boost.values[9];}const growth=w.starship.numbers.get('devour-growth')??0;t.attack+=growth;t.health+=growth;
 // Native pools already contain team cards. Extend only their additive gear pools here;
 // projections freeze these totals, and fixed true DPS keeps its separate budget.
 if(equipmentRecipient(w,u)){const team=teamCardEffects(w.expedition);t.dps*=1+team.damage+uniqueActiveStats(w,u).damage;t.hp*=1+team.health;}return t;
}
/** Remove only this layer before rebuilding native stats. Wounds remain fractions during the rebuild. */
export function detachEquipmentStats(w:World,u:Entity){const previous=w.starship?.native.get(u);if(!previous)return;const hpRatio=u.maxHp>0?u.hp/u.maxHp:0,shieldRatio=(u.maxShield??0)>0?(u.shield??0)/u.maxShield!:0;
 Object.assign(u,previous);u.hp=u.maxHp*hpRatio;u.shield=(u.maxShield??0)*shieldRatio;w.starship.native.delete(u);
}
export function applyEquipmentStats(w:World,u:Entity,fill=false){if(!w.starship||!equipmentRecipient(w,u))return;const output=equipmentOutputFactor(w,u.id);if(output!==1){u.maxHp*=output;u.hp*=output;u.maxShield=(u.maxShield??0)*output;u.shield=(u.shield??0)*output;u.weaponDamage*=output;}const t=equipmentUnitTotals(w,u),range=equipmentValue(w,'weapon_range'),melee=u.weaponDamage>0&&u.attackRange<=1.5?equipmentValue(w,'melee_range'):0;if(!nonempty(t)&&!range&&!melee&&!equipmentValue(w,'adrenaline')&&(w.starship.numbers.get('dominance-fire')??0)<=w.time&&(w.starship.numbers.get('assault-until:'+u.id)??0)<=w.time)return;
 const owner=parent(w,u);if(!owner)return;const factors=identityFactors(owner),share=budgetShare(w,u),hpRatio=u.maxHp>0?u.hp/u.maxHp:0,shieldRatio=(u.maxShield??0)>0?(u.shield??0)/u.maxShield!:0;
 w.starship.native.set(u,{maxHp:u.maxHp,maxShield:u.maxShield??0,armor:u.armor,moveSpeed:u.moveSpeed,attackRange:u.attackRange,attackPeriod:u.attackPeriod});
 u.maxHp=(u.maxHp+t.hp*factors.hp*share)*(1+t.health)*t.exclusiveHealth*t.lifeFactor;u.hp=fill?u.maxHp:u.maxHp*hpRatio;
 u.maxShield=(u.maxShield??0)*(1+t.defense/1000+t.shieldPercent)*t.exclusiveShield;u.shield=fill?u.maxShield:u.maxShield*shieldRatio;
 u.armor=(u.armor+t.armor*factors.armor)*(1+t.armorPercent);u.moveSpeed*=1+t.move;u.attackRange=u.attackRange*(1+t.range+range)+melee;u.attackPeriod/=(1+t.attackSpeed)*t.burstFactor*equipmentDevourSpeed(w,u);
 if(equipmentValue(w,'adrenaline'))u.attackPeriod/=u.hp/u.maxHp>=.5?.5:2;if((w.starship.numbers.get('assault-until:'+u.id)??0)>w.time)u.attackPeriod/=2;if((w.starship.numbers.get('dominance-fire')??0)>w.time)u.attackPeriod/=equipmentValue(w,'dominance',2)||1;
}
export function refreshEquippedBodies(w:World){for(const u of w.entities.values())if(u.owner==='terran')w.refreshStats(u);w.changed();}
export function equipWorldItem(w:World,item:string,slot:EquipmentSlot,revision=w.starship.account.revision){
 if(!equipmentChangeAllowed(equipmentPhase(w.phase,w.starship.account)))return failure('战斗中不能换装');const result=equip(w.starship.account,w.expedition.race,item,slot,revision);if(result.ok){w.starship.enabled=true;refreshEquippedBodies(w);}return result;
}
export function unequipWorldItem(w:World,slot:EquipmentSlot,revision=w.starship.account.revision){
 if(!equipmentChangeAllowed(equipmentPhase(w.phase,w.starship.account)))return failure('战斗中不能换装');const result=unequip(w.starship.account,w.expedition.race,slot,revision);if(result.ok)refreshEquippedBodies(w);return result;
}
export function startStarshipRun(w:World){const a=w.starship.account,result=beginEquipmentRun(a,w.expedition.race,w.runId!);if(!result.ok)return result;
 w.starship.cycles.clear();w.starship.strikes=[];
 for(const effect of activeEquipmentEffects(w)){
  const key=effect.source+':'+effect.key;if(effect.key==='opening_workers'){w.workers+=effect.values[0];for(const id of effect.items)a.run!.locked.add(id);a.run!.receipts.add(key);}
  if(['periodic_resources','bombardment','reinforcement','periodic_trap','elite_training','direction_reinforcement','fleet_reinforcement','periodic_worker','reactor','joint_support','incendiary','drop_pod','bounty_order','volley','hold_volley','burn_area'].includes(effect.key))w.starship.cycles.set(key,w.time+effect.values[0]);
 }startEquipmentEconomy(w);return success(undefined);
}
/** Freeze an ordinary weapon's additions at commit. Native skill damage is never rewritten persistently. */
export function withEquipmentWeapon<T>(w:World,u:Entity,target:Body,fire:()=>T,hits=1):T{
 rememberEquipmentSource(w,u);
 if(!w.starship.enabled)return fire();const projection=projectionFor(w,u),t=projection?.totals??equipmentUnitTotals(w,u),effects=projection?.effects??activeEquipmentEffects(w);if(!equipmentRecipient(w,u)||!projection&&!nonempty(t)&&!effects.length)return fire();
 const owner=parent(w,u);if(!owner)return fire();const share=projection?.share??budgetShare(w,u),f=projection?.factors??identityFactors(owner),period=u.shotInterval>0?u.shotInterval:u.attackPeriod;hits=isChild(u)&&owner.heroId==='purifier_flagship'?1:Math.max(1,hits);const nativeBudget=equipmentNativeWeaponBudget(w,u,target,hits);hits=nativeBudget.packets;
 const previous=w.starship.active,base=u.weaponDamage,nativeBase=base*(1+t.native),attackFactor=(1+t.attack)*equipmentDevourWeapon(w,u)*equipmentBanelingFactor(w,u)*equipmentHoldFactor(w)*(1+Math.min(equipmentValue(w,'distance_damage',1),Math.hypot(target.x-u.x,target.z-u.z)*equipmentValue(w,'distance_damage'))),derived=w.starship.combat.derivedDepth>0,extraTrueDps=projection?.extraTrueDps??0;
 const shot:AttackBudget={target:target.id,remaining:derived?0:(t.trueDps*f.dps*share+extraTrueDps)*period,truePerHit:derived?0:(t.trueDps*f.dps*share+extraTrueDps)*period/hits,nativeDamage:nativeBase,attackFactor,owner:u.id,sequence:u.shotSequence??0,hits,weaponDamage:0,bonuses:[],effects,handled:false,derived};
 const enhanced=(nativeBase+(base>0?t.dps*f.dps*period*share/nativeBudget.weight:0))*attackFactor;
 equipmentCommitAttack(w,u,shot);shot.weaponDamage=enhanced;w.starship.active=shot;w.starship.attacks.set(u,shot);u.weaponDamage=enhanced;
 try{return fire();}finally{if(u.weaponDamage===enhanced)u.weaponDamage=base;w.starship.active=previous;w.starship.attacks.delete(u);}
}
/** Attack clones carry a shared finite true-DPS allowance outside the deferred save DTO. */
export function cloneCombatSource(w:World,u:Entity):Entity{const clone=structuredClone(u),shot=w.starship.attacks.get(u)??w.starship.active;if(shot&&shot.owner===u.id)w.starship.attacks.set(clone,shot);const target=w.starship.nativeTargets.get(u);if(target!==undefined)w.starship.nativeTargets.set(clone,target);return clone;}
export function nativeCombatSource(w:World,u:Entity,target:Body){const clone=cloneCombatSource(w,u);if(w.starship.attacks.has(clone))w.starship.nativeTargets.set(clone,target.id);return clone;}
export function bindEquipmentAttack(w:World,u:Entity,receipt:object){const shot=w.starship.attacks.get(u);if(shot){w.starship.attacks.set(receipt,shot);w.starship.attackSources.set(receipt,cloneCombatSource(w,u));}}
export function resolveEquipmentAreaHit(w:World,receipt:object,target:Body,hits=1,crit=1){const source=w.starship.attackSources.get(receipt);if(source)applyEquipmentTrueHit(w,source,target,hits,crit,receipt);}
export function equipmentPatternDamage(w:World,u:Entity,native:number,fraction=1){const shot=w.starship.attacks.get(u);return shot?(native+(u.weaponDamage/shot.attackFactor-shot.nativeDamage)*fraction)*shot.attackFactor:native;}
export function equipmentAttackFactor(w:World,u:Entity){const shot=w.starship.attacks.get(u)??w.starship.active;return shot?.owner===u.id?shot.attackFactor:1;}
export function applyEquipmentTrueHit(w:World,u:Entity,target:Body,hits=1,crit=1,key:object=u){const shot=w.starship.attacks.get(key);if(!shot||target.id!==(w.starship.nativeTargets.get(u)??shot.target)||target.owner===u.owner)return;
 const damage=Math.min(shot.remaining,shot.truePerHit*hits);shot.remaining-=damage;if(damage>0&&target.hp>0)w.hit(target,damage,[],1,u.owner,0,1,u.id);
 equipmentCaptureHit(w,u,target,shot);if(target.owner===u.owner)return;equipmentAttackEffects(w,u,target,shot,crit);
}
export function equipmentCrit(w:World,u:Entity){const t=equipmentUnitTotals(w,u);return equipmentRecipient(w,u)?{chance:t.crit,damage:t.critDamage}:{chance:0,damage:0};}
export function equipmentIncomingReduction(w:World,u:Entity){return equipmentRecipient(w,u)?Math.min(.7,equipmentUnitTotals(w,u).reduction):0;}
export function equipmentDodge(w:World,u:Entity){return equipmentRecipient(w,u)?Math.min(.75,equipmentUnitTotals(w,u).dodge):0;}
export function equipmentRecoveryFactor(w:World,u:Entity){if(!canReceiveRecovery(u))return 0;return equipmentRecipient(w,u)?1+equipmentUnitTotals(w,u).defense/1000:1;}

export function tickStarship(w:World){const a=w.starship.account;if(!w.starship.enabled||!a.run||a.run.ended||w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 tickEquipmentLife(w);tickEquipmentProjections(w);tickEquipmentControls(w);tickEquipmentDefense(w);tickEquipmentRecall(w);if(!w.specialStages.active){tickEquipmentModules(w);tickEquipmentEconomy(w);}tickEquipmentGrowth(w);tickEquipmentCombat(w);collectNearbyEquipment(w);
 for(const effect of activeEquipmentEffects(w)){const key=effect.source+':'+effect.key,ready=w.starship.cycles.get(key);
  if(ready===undefined||w.time+1e-8<ready)continue;
  if(effect.key==='periodic_resources'&&!w.specialStages.active){equipmentPeriodicResources(w,effect.source,effect.values[1],effect.values[2]);w.starship.cycles.set(key,ready+effect.values[0]);const source=w.allies()[0];if(source)w.effect('heal',source,source,.4,.4);}
 }
 tickEquipmentSupport(w);tickAdvancedEquipmentSupport(w);const last=w.starship.numbers.get('fort-last-time')??w.time;tickEquipmentFortifications(w,Math.max(0,w.time-last));w.starship.numbers.set('fort-last-time',w.time);
}

export function equipmentCatchUp(w:World,u:Entity){if(!equipmentRecipient(w,u))return 1;let bonus=0;for(const effect of activeEquipmentEffects(w))if(effect.key==='catch_up'&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)>effect.values[0])bonus=Math.max(bonus,effect.values[1]);return 1+bonus;}

export function equipmentDamageFactor(w:World){return Math.min(1,...activeEquipmentEffects(w).filter(e=>e.key==='adventurer'||e.key==='adventurer_replace').map(e=>1-e.values[0]));}
