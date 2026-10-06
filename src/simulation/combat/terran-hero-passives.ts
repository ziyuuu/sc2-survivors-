import {observeRecovery} from '../observation';
import {zergTeamBuff} from './zerg-hero-passives';
import {groundHeroBuff} from './hero-ground-auras';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import {terranHeroGrowth,TERRAN_HERO_REPAIR_PER_SECOND} from '../../data/terran-heroes';
import {talentModifiers} from './expedition-combat';
const distance=(a:Body,b:Body)=>Math.hypot(a.x-b.x,a.z-b.z);
export interface HeroCombatState {cycles:number;target:number|null;warmupStart:number|null;lastFire:number;cloakUntil:number;cloakEpisode:boolean;charge:number;protectedUntil:number}
export const newHeroCombatState=():HeroCombatState=>({cycles:0,target:null,warmupStart:null,lastFire:-100,cloakUntil:0,cloakEpisode:false,charge:0,protectedUntil:0});
export function heroState(u:Entity){return u.heroCombat??=newHeroCombatState();}
export const permanentMechanical=(u:Entity)=>u.hp>0&&u.owner==='terran'&&!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure')&&u.attributes.includes('Mechanical');
/** Distinct named bonuses add before final multiplication; one living source per identity. */
export function heroAura(w:World,u:Entity){const result={damage:0,speed:0,health:0,shield:0,armor:0,move:0};if(u.owner!=='terran'||u.summonKind||u.temporary)return result;
 const raynor=w.heroEntity('raynor');if(raynor&&raynor.hp>0&&(u.heroId==='raynor'||!u.heroId&&['marine','marauder','reaper'].includes(u.unitType)))Object.assign(result,{damage:.3,speed:.3,health:.3,armor:3,move:.2});
 const brood=zergTeamBuff(w,u);result.health+=brood.health;result.speed+=brood.speed;result.move+=brood.move;
 const ground=groundHeroBuff(w,u);result.damage+=ground.damage;result.speed+=ground.speed;result.shield=result.health+ground.shield;result.health+=ground.health;result.move+=ground.move;
 const swann=w.heroEntity('swann');if(swann&&swann.hp>0&&permanentMechanical(u)){result.damage+=.25;result.armor+=4;}return result;
}
export function heroAttackSpeed(w:World,u:Entity){if(u.heroId!=='tychus')return 1;const s=heroState(u);return s.warmupStart===null||w.time-s.lastFire>=2?1:1+2*Math.min(1,(w.time-s.warmupStart)/4);}
const firing=(w:World,u:Entity)=>w.time-heroState(u).lastFire<2&&w.time<=u.nextShotAt+.15;
export function enemyHeroDamageFactor(w:World,u:Entity){if(u.owner!=='zerg')return 1;const tosh=w.heroEntity('tosh');return tosh&&tosh.hp>0&&firing(w,tosh)&&distance(tosh,u)<=8+u.unitRadius ? .8 : 1;}
export function heroIncomingFactor(w:World,target:Entity,attacker?:Entity){const s=target.heroCombat;if((s?.protectedUntil??0)>w.time)return 0;
 if(target.heroId==='tychus'&&firing(w,target))return .75;
 if(target.heroId==='yamato_battlecruiser'&&attacker){const direction=Math.atan2(attacker.x-target.x,attacker.z-target.z),delta=Math.atan2(Math.sin(direction-target.attackFacing),Math.cos(direction-target.attackFacing));if(Math.abs(delta)<=150*Math.PI/360)return .75;}return 1;
}
export function tickTerranHero(w:World,u:Entity,dt:number){if(!u.heroId||u.hp<=0)return;
 if(u.heroId==='nova'){const s=heroState(u),idle=w.time-Math.max(s.lastFire,u.lastDamagedAt??-100)>=2;if(!idle){s.cloakEpisode=false;u.cloaked=false;}else if(!s.cloakEpisode){s.cloakEpisode=true;s.cloakUntil=w.time+6;s.charge=1;}u.cloaked=idle&&s.cloakUntil>w.time;}
 if(u.heroId==='tychus'&&w.time-heroState(u).lastFire>=2)heroState(u).warmupStart=null;
 if(u.heroId==='swann'){const targets=w.allies().filter(a=>a.id!==u.id&&permanentMechanical(a)&&a.hp<a.maxHp&&w.edgeDistance(u,a)<=8&&w.hasAttackLine(u,a)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,7);u.healTargets=[];
  for(const a of targets){const suppression=Math.min(.5,Math.max(w.statuses.value(a.id,'bleed',w.time),w.statuses.value(a.id,'corruption',w.time))),gain=Math.min(a.maxHp-a.hp,TERRAN_HERO_REPAIR_PER_SECOND*terranHeroGrowth(u.rank).passive*(1+(talentModifiers(w,u).healingPct??0))*(1-suppression)*dt);if(gain>0){a.hp+=gain;w.stats.healed+=gain;observeRecovery(w,u,a,gain);u.healTargets.push(a.id);}}}
}
/** Snapshot one main cycle before launch. Secondary/APM packets never call this. */
export function beginHeroAttack(w:World,u:Entity,target:Body){if(!u.heroId)return;const s=heroState(u);if(u.heroId==='tychus'&&(s.warmupStart===null||w.time-s.lastFire>=2))s.warmupStart=w.time;
 s.lastFire=w.time;if(u.heroId!=='raynor'){s.cycles++;s.target=target.id;}
 if(u.heroId==='nova'){u.heroOpening=s.charge>0;s.charge=0;s.cloakUntil=0;u.cloaked=false;s.cloakEpisode=false;}
}
export function heroMainFactor(u:Entity,target:Body){return u.heroId==='nova'?(u.heroOpening?3:1)*(['elite','boss','lord'].includes((target as Entity).enemyTier??'')?2:1):1;}
export function heroExtraHits(w:World,u:Entity,target:Body,packet:number){const s=u.heroCombat;if(!s||!u.heroId)return;
 if(u.heroId==='raynor'){if(target.hp>=0){const live=w.entities.get(u.id);if(live){const ls=heroState(live);if(ls.target!==target.id){ls.target=target.id;ls.cycles=0;}ls.cycles++;s.cycles=ls.cycles;}}}
 if(u.heroId==='raynor'&&s.cycles%3===0&&target.hp>0){w.hit(target,packet,[],1,'terran',0,1,u.id,false,false,0,false);w.visual('weapon-area',u,target);}
 const rule=u.heroId==='tychus'?{every:5,radius:3,fraction:.3,max:Infinity}:u.heroId==='tosh'?{every:4,radius:3.5,fraction:1.2,max:Infinity}:u.heroId==='yamato_battlecruiser'?{every:8,radius:5,fraction:.5,max:4}:null;
 if(!rule||s.cycles%rule.every)return;
 const targets=[...w.entities.values()].filter(a=>a.owner==='zerg'&&a.hp>0&&(u.heroId==='tosh'||a.id!==target.id)&&w.visibleTo(a,'terran')&&distance(a,target)<=rule.radius+a.unitRadius&&w.hasAttackLine(u,a)).sort((a,b)=>distance(a,target)-distance(b,target)||a.id-b.id).slice(0,rule.max);
 for(const a of targets){w.hit(a,packet*rule.fraction,[],1,'terran',.5,0,u.id,false,false,0,false);w.visual('weapon-area',u,a);}
}
