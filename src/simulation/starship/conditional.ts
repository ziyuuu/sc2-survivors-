import type {World} from '../world';
import type {Entity} from '../types';
import {BILE} from '../../data/sc2-units';
import {activeEquipmentEffects,equipmentValue,lockEquipmentSource} from './modules';
import {equipmentHeroWeaponCycle} from './hero-advancements';

/** This game's native resource channel is already certain. A chance bonus cannot add a second packet. */
export function equipmentResourceDropChance(w:World,native:number){return Math.min(1,Math.max(0,native)+equipmentValue(w,'resource_drop'));}
/** Called only with the authoritative egg-spawn receipt; an ordinary nearby enemy is never an egg child. */
export function convertEquipmentEggEnemies(w:World,egg:number,spawned:readonly Entity[]){const effect=activeEquipmentEffects(w).find(e=>e.key==='egg_conversion'),run=w.starship.account.run,key='egg-conversion:'+egg;if(!effect||!run||run.receipts.has(key)||w.economicTargets.get(egg)?.status!=='rescued')return 0;run.receipts.add(key);let count=0;
 for(const u of spawned){if(w.entities.get(u.id)!==u||u.hp<=0||u.owner!=='zerg'||u.heroId||u.eliteId||u.enemyTier||u.summonKind||u.temporary||u.attributes.includes('Structure'))continue;u.owner='terran';u.team='player';u.guardianPod=null;u.guardOrigin=false;u.attackTarget=null;u.pendingTarget=null;u.windup=0;u.attackLock=0;u.velocity={x:0,z:0};u.slot=10000+u.id;u.enemyOrigin=undefined;w.starship.members.set(u.id,{source:effect.source,items:effect.items,independent:true,origin:'egg_conversion'});w.refreshStats(u);w.visual('squad-transfer',u);count++;}
 if(count){w.hash.invalidatePlanes();lockEquipmentSource(w,effect);}return count;
}
/** Only the two source roaches evolve. They replace native bile with their specified twelve-second cast. */
export function equipmentRavagerBile(w:World,u:Entity,dt:number){if(!w.starship.numbers.has('equipment-ravager:'+u.id))return false;const e=activeEquipmentEffects(w).find(e=>e.key==='ravager_evolution'&&e.source===w.starship.members.get(u.id)?.source);if(!e)return false;u.bileCooldown-=dt;if(u.bileCooldown>1e-8)return true;
 const target=[...w.entities.values()].filter(b=>b.hp>0&&b.owner!==u.owner&&w.visibleTo(b,u.owner)&&w.edgeDistance(u,b)<=BILE.range&&w.hasAttackLine(u,b)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id)[0];if(!target)return true;
 const fx=w.effect('bile',u,target,e.values[1],BILE.delay);fx.damage=equipmentHeroWeaponCycle(w,u)*e.values[2];u.bileCooldown=e.values[0];return true;
}
