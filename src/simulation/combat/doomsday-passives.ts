import {applyDoomsdayOrangeStats} from './doomsday-orange';
import {doomsdayRepairFactor} from './doomsday-nodes';
import {DOOMSDAY_CARD_BY_ID as CARDS} from '../../data/terran-doomsday';
import {SC2_UNITS} from '../../data/sc2-units';
import {mechanicalMember,mechanicalRank,formalDoomsdayMember} from './doomsday-roster';
import {doomsdayCombat} from './doomsday-combat';
import {canReceiveRecovery} from './support-targets';
import {observeRecovery} from '../observation';
import {teamHealingFactor} from './team-auras';
import type {World} from '../world';
import type {Entity} from '../types';

/** Applied only while rebuilding native stats, before the existing equipment layer. */
export function applyDoomsdayStats(w:World,u:Entity){
 u.movementRadius=undefined;
 if(!mechanicalMember(w,u))return;
 const flame=mechanicalRank(w,u,'M-W02');doomsdayCombat(u).visualScale=(mechanicalRank(w,u,'M-B01')?CARDS['M-B01'].params.scale:1)*(u.unitType==='hellion'&&flame?CARDS['M-W02'].params.scale[flame-1]:1);
 if(!u.heroId&&mechanicalRank(w,u,'M-P03')&&SC2_UNITS[u.unitType].attributes.includes('Biological')){doomsdayCombat(u).mechanized=true;u.attributes=u.attributes.filter(a=>a!=='Biological');if(!u.attributes.includes('Mechanical'))u.attributes.push('Mechanical');u.armor+=CARDS['M-P03'].params.armor;}
 if(mechanicalRank(w,u,'M-B01')){const lost=u.maxHp-u.hp;u.maxHp*=CARDS['M-B01'].params.health;u.hp=Math.max(0,u.maxHp-lost);u.armor+=CARDS['M-B01'].params.armor;}
 if(!u.flying){const factor=(mechanicalRank(w,u,'M-B01')?CARDS['M-B01'].params.radius:1)*(mechanicalRank(w,u,'M-B04')?CARDS['M-B04'].params.radius:1)*(mechanicalRank(w,u,'M-N02')?.92:1);u.movementRadius=u.unitRadius*Math.max(.7,factor);}
 const speed=mechanicalRank(w,u,'M-W03'),move=mechanicalRank(w,u,'M-G03'),repair=mechanicalRank(w,u,'M-W04');
 if(speed)u.attackPeriod/=CARDS['M-W03'].params.speed[speed-1];
 if(move)u.moveSpeed*=(u.flying?CARDS['M-G03'].params.air:CARDS['M-G03'].params.ground)[move-1];
 if(repair&&u.unitType==='science_vessel')u.healRate*=CARDS['M-W04'].params.repair[repair-1];
 applyDoomsdayOrangeStats(w,u);
}
 export function doomsdayFlameWidth(w:World,u:Entity){const rank=mechanicalRank(w,u,'M-W02');return rank&&u.unitType==='hellion'?CARDS['M-W02'].params.width[rank-1]:1;}
/** Only add the difference on an upgrade; ordinary stat refresh never refills damage. */
export function refreshDoomsdayPools(w:World,u:Entity){
 const rank=mechanicalMember(w,u)?mechanicalRank(w,u,'M-G02'):0;if(!rank)return;
 const combat=doomsdayCombat(u),max=u.maxHp*CARDS['M-G02'].params.capacity[rank-1],old=combat.nano;
 combat.nano={max,remaining:old?Math.min(max,Math.max(0,old.remaining+max-old.max)):max,regenTick:old?.regenTick??0};
}
export function damageDoomsdayShield(w:World,u:Entity){if(u.doomsday?.nano)u.doomsday.nano.regenTick=w.tick+CARDS['M-G02'].params.delay;}
export function absorbDoomsdayShield(w:World,u:Entity,amount:number,sourceId?:number){
 const shield=u.doomsday?.nano;if(!shield||amount<=0)return amount;
 const absorbed=Math.min(shield.remaining,amount);shield.remaining-=absorbed;
 if(absorbed>0)w.visual(shield.remaining<=0?'shield-break':'shield-hit',u,u,undefined,undefined,{shieldDamage:absorbed,hitSourceId:sourceId,doomsdayEffect:shield.remaining<=0?'nano-break':'nano-shield'});return amount-absorbed;
}
export function doomsdayTransformFactor(w:World,u:Entity){const rank=mechanicalRank(w,u,'M-W07');return rank?CARDS['M-W07'].params.time[rank-1]:1;}
export function doomsdayBattery(w:World,u:Entity,before:number){
 if(!formalDoomsdayMember(u)||!['medivac','science_vessel'].includes(u.unitType))return;
 const rank=mechanicalRank(w,u,'M-W09'),p=CARDS['M-W09'].params;if(!rank||before<p.threshold||u.energy>=p.threshold)return;
 const stage=`${w.runId}:${w.endless?'endless:'+w.endless.round:w.stage}`,s=doomsdayCombat(u);if(s.batteryStage===stage)return;
 s.batteryStage=stage;u.energy=Math.min(u.maxEnergy,u.energy+p.energy[rank-1]);
 w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'battery'});
}
export function tickDoomsdayPassives(w:World,dt:number){
 const cards=w.expedition.doomsday?.ranks;if(!cards||!cards['M-G02']&&!cards['M-G04'])return;
 const allies=w.allies(),members=allies.filter(formalDoomsdayMember),machines=allies.filter(u=>mechanicalMember(w,u));
 for(const u of machines){const s=u.doomsday?.nano;if(s&&(w.tick>s.regenTick||(u.doomsday?.nanoArmorUntilTick??0)>w.tick))s.remaining=Math.min(s.max,s.remaining+s.max*CARDS['M-G02'].params.regen*dt);}
 const workers=members.filter(u=>SC2_UNITS[u.unitType].attributes.includes('Biological')&&mechanicalRank(w,u,'M-G04')>0).sort((a,b)=>a.id-b.id),assigned=new Map<number,number>();
 for(const worker of workers){
  const target=machines.filter(u=>u.id!==worker.id&&u.hp<u.maxHp&&canReceiveRecovery(u)&&(assigned.get(u.id)??0)<2&&Math.hypot(u.x-worker.x,u.z-worker.z)<=2.5).sort((a,b)=>(1-b.hp/b.maxHp)-(1-a.hp/a.maxHp)||Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z)||a.id-b.id)[0];
  if(!target)continue;assigned.set(target.id,(assigned.get(target.id)??0)+1);
  const amount=Math.min(target.maxHp-target.hp,target.maxHp*.01*dt*teamHealingFactor(w,target)*doomsdayRepairFactor(w,target));if(amount<=0)continue;
  target.hp+=amount;w.stats.healed+=amount;observeRecovery(w,worker,target,amount);if(w.tick%15===0)w.effect('heal',worker,target,.25,.25);
 }
}
