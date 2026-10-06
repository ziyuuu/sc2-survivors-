import {observeRecovery} from '../observation';
import {teamHealingFactor} from './team-auras';
import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import {ZERG_HERO_RULES as R,isZergHero,zergHeroGrowth} from '../../data/zerg-heroes';
import {talentModifiers} from './expedition-combat';
import {FAMILIES_BY_RACE} from '../../data/races';
import {ELITES} from '../../data/elites';
import {registerZergRevival,tickZergRevival,zergRevivalDeath,type RevivalWindow} from './zerg-hero-revival';
export interface ZergCombatState {essence:number;kills:number;biologicalUntil:number;mechanicalUntil:number;flyingUntil:number;barrier:number;barrierUntil:number;reserve:number;reserveMax:number;reserveUntil:number;tentacleAt:number}
export const newZergCombat=():ZergCombatState=>({essence:0,kills:0,biologicalUntil:0,mechanicalUntil:0,flyingUntil:0,barrier:0,barrierUntil:0,reserve:0,reserveMax:0,reserveUntil:0,tentacleAt:0});
export const zergState=(u:Entity)=>u.zergCombat??=newZergCombat();
export interface ZergHeroRunState {infections:{source:number;target:number;rank:number;until:number}[];parasites:{source:number;target:number;rank:number;until:number}[];pools:{id:number;source:number;rank:number;point:Point;until:number;next:number}[];revivals:RevivalWindow[]}
export const newZergHeroRun=():ZergHeroRunState=>({infections:[],parasites:[],pools:[],revivals:[]});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const permanentBiological=(u:Entity)=>u.owner==='terran'&&u.hp>0&&!u.temporary&&!u.summonKind&&u.attributes.includes('Biological')&&!u.attributes.includes('Structure')&&!['scv','drone','probe'].includes(u.unitType);
export function zergTeamBuff(w:World,u:Entity){const a={damage:0,health:0,armor:0,speed:0,move:0};if(!permanentBiological(u))return a;
 const z=w.heroEntity('zagara');if(z&&z.hp>0){a.speed=R.zagara.speed;a.move=R.zagara.move;}
 const l=w.heroEntity('hots_leviathan');if(l&&l.hp>0&&dist(l,u)<=R.hots_leviathan.healthRadius+u.unitRadius&&w.hasAttackLine(l,u))a.health=R.hots_leviathan.health;return a;
}
export function dehakaStats(u:Entity){const e=u.heroId==='dehaka'?zergState(u).essence:0,f=e/(e+R.dehaka.essenceK);return {damage:1+R.dehaka.damage*f,health:1+R.dehaka.health*f,armor:R.dehaka.armor*f};}
export const dehakaPenetration=(u:Entity)=>u.heroId==='dehaka'&&(u.zergCombat?.mechanicalUntil??0)>(u.heroCombat?.lastFire??0)?R.dehaka.armorIgnore:0;
export function zergHeal(w:World,source:Entity,target:Entity,amount:number,active=false){if(target.hp<=0)return 0;const suppress=Math.min(.5,Math.max(w.statuses.value(target.id,'bleed',w.time),w.statuses.value(target.id,'corruption',w.time))),gain=Math.max(0,Math.min(target.maxHp-target.hp,amount*(1-suppress)*teamHealingFactor(w,target,source.heroId==='niadra'||source.heroId==='stukov')));if(gain>0){target.hp+=gain;w.stats.healed+=gain;observeRecovery(w,source,target,gain);if(active)w.visual('skill-heal',source,target);}return gain;}
function patients(w:World,p:Point,radius:number,max=7,exclude?:number){return w.allies().filter(u=>u.id!==exclude&&permanentBiological(u)&&u.hp<u.maxHp&&dist(p,u)<=radius+u.unitRadius&&(!w.terrain||w.terrain.lineOfFire(p,u,false,u.flying))).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,max);}
export function tickZergHero(w:World,u:Entity,dt:number){if(!isZergHero(u.heroId)||u.hp<=0)return;const s=zergState(u),g=zergHeroGrowth(u.rank);
 if(s.barrierUntil<=w.time)s.barrier=0;if(s.reserveUntil<=w.time)s.reserve=0;
 if(u.heroId==='dehaka'&&s.biologicalUntil>w.time)zergHeal(w,u,u,u.maxHp*R.dehaka.regen*dt);
 if(u.heroId==='niadra'){u.healTargets=[];for(const a of patients(w,u,R.niadra.range,R.niadra.targets,u.id)){const gain=zergHeal(w,u,a,R.niadra.heal*g.passive*(1+(talentModifiers(w,u).healingPct??0))*dt);if(gain)u.healTargets.push(a.id);}}
 if(u.heroId==='hots_leviathan'&&w.time>=s.tentacleAt){s.tentacleAt=w.time+R.hots_leviathan.tentaclePeriod;const targets=[...w.entities.values()].filter(e=>e.owner!==u.owner&&e.hp>0&&!e.attributes.includes('Structure')&&w.visibleTo(e,u.owner)&&w.targetAllowed(u,e)&&w.edgeDistance(u,e)<=R.hots_leviathan.tentacleRange&&w.hasAttackLine(u,e)).sort((a,b)=>dist(u,a)-dist(u,b)||a.id-b.id).slice(0,R.hots_leviathan.tentacleTargets);for(const a of targets){w.hit(a,R.hots_leviathan.tentacleDamage*g.passive,[],1,u.owner,0,0,u.id);w.visual('hero-tentacle',u,a);}}
 if(u.heroId==='zagara'&&s.kills>=R.zagara.kills){const alive=w.allies().filter(a=>a.temporaryKind==='hero-baneling'&&a.summonOwnerId===u.id).length;if(alive+R.zagara.spawnCount<=R.zagara.limit){const positions:Point[]=[];for(let i=0;i<R.zagara.spawnCount;i++){const p=w.freePosition('baneling',{x:u.x+1.1+i,z:u.z+1.2},0,3);if(p&&positions.every(q=>dist(q,p)>.65))positions.push(p);}if(positions.length===R.zagara.spawnCount){s.kills-=R.zagara.kills;for(const p of positions){const b=w.addUnit('baneling','terran',p.x,p.z,u.rank);b.temporary=true;b.temporaryKind='hero-baneling';b.temporaryUntil=w.time+R.zagara.lifetime;b.summonOwnerId=u.id;w.refreshStats(b,true);w.visual('hero-hatch',u,b);}}}}
}
export function zergBeforePrimary(w:World,u:Entity,target:Body){if(target.owner===u.owner||target.hp<=0||target.attributes.includes('Structure'))return;
 const state=w.zergHeroes;if(u.heroId==='stukov'){state.infections=state.infections.filter(x=>x.source!==u.id||x.target!==target.id);state.infections.push({source:u.id,target:target.id,rank:u.rank,until:w.time+R.stukov.infectionSeconds});}
 if(u.heroId==='niadra'){state.parasites=state.parasites.filter(x=>x.source!==u.id||x.target!==target.id);state.parasites.push({source:u.id,target:target.id,rank:u.rank,until:w.time+R.niadra.parasiteSeconds});}
}
export function zergPrimary(w:World,u:Entity,target:Body,packet:number){const cycles=u.heroCombat?.cycles??0;
 const rule=u.heroId==='kerrigan'?{every:R.kerrigan.cleaveEvery,fraction:R.kerrigan.cleaveFraction,radius:R.kerrigan.cleaveRadius,ground:true}:u.heroId==='stukov'?{every:R.stukov.grenadeEvery,fraction:R.stukov.grenadeFraction,radius:R.stukov.grenadeRadius,ground:false}:null;
 if(!rule||cycles%rule.every!==0)return;for(const e of w.entities.values())if(e.id!==target.id&&e.owner!==u.owner&&e.hp>0&&(!rule.ground||!e.flying)&&w.targetAllowed(u,e)&&w.visibleTo(e,u.owner)&&dist(e,target)<=rule.radius+e.unitRadius&&w.hasAttackLine(u,e)&&(!w.terrain||w.terrain.lineOfFire(target,e,false,e.flying))){w.hit(e,packet*rule.fraction,[],1,u.owner,.5,0,u.id,false,false,0,true);w.visual('weapon-area',u,e);}w.visual('hero-cleave',u,target);
}
export function zergEffectiveDamage(w:World,source:number|undefined,amount:number){const u=source===undefined?undefined:w.entities.get(source);if(u?.heroId!=='kerrigan'||u.hp<=0||amount<=0)return;const s=zergState(u);if(s.barrierUntil<=w.time)s.barrier=0;s.barrier=Math.min(u.maxHp*R.kerrigan.barrierMaxHp,s.barrier+amount*R.kerrigan.barrierFraction);s.barrierUntil=w.time+R.kerrigan.barrierSeconds;}
export function absorbZergBarrier(w:World,u:Entity,amount:number){const s=u.zergCombat;if(u.heroId==='kerrigan'&&s&&s.barrierUntil>w.time){const take=Math.min(s.barrier,amount);s.barrier-=take;return amount-take;}return amount;}
export function absorbDehakaReserve(w:World,u:Entity,amount:number,armor:number,minimum:number,penetration:number){const s=u.zergCombat;if(u.heroId!=='dehaka'||!s||s.reserveUntil<=w.time||s.reserve<=0||amount<=0)return {amount,armorPaid:false};const adjusted=Math.max(minimum,amount-armor*(1-penetration)),take=Math.min(s.reserve,adjusted);s.reserve-=take;return {amount:adjusted-take,armorPaid:true};}
function essence(w:World,u:Entity,e:Body,amount:number){const s=zergState(u);s.essence=Math.min(1000000,s.essence+amount);if(e.attributes.includes('Biological'))s.biologicalUntil=w.time+R.dehaka.adaptation;if(e.attributes.includes('Mechanical'))s.mechanicalUntil=w.time+R.dehaka.adaptation;if(e.flying)s.flyingUntil=w.time+R.dehaka.adaptation;w.refreshStats(u);w.visual('hero-essence',u,e);}
export function dehakaDevour(w:World,u:Entity,target:Body,rank:number){if(u.hp<=0)return;essence(w,u,target,R.dehaka.devourEssence);zergHeal(w,u,u,u.maxHp*R.dehaka.healFraction,true);const s=zergState(u),amount=u.maxHp*R.dehaka.reserve[Math.max(0,Math.min(4,rank-1))],valid=s.reserveUntil>w.time;s.reserve=Math.max(valid?s.reserve:0,amount);s.reserveMax=Math.max(valid?s.reserveMax:0,amount);s.reserveUntil=w.time+R.dehaka.reserveSeconds;w.visual('hero-reserve',u);}
export function zergHeroDeath(w:World,e:Entity,sourceId?:number){if(e.owner==='terran'){zergRevivalDeath(w,e);return;}if(e.attributes.includes('Structure'))return;
 const source=sourceId===undefined?undefined:w.entities.get(sourceId),recursive=source?.temporaryKind==='hero-baneling';
 for(const u of w.allies()){if(u.heroId==='zagara'&&!recursive&&dist(u,e)<=R.zagara.killRadius&&w.hasAttackLine(u,e))zergState(u).kills=Math.min(20,zergState(u).kills+1);if(u.heroId==='dehaka'&&dist(u,e)<=10+e.unitRadius&&w.hasAttackLine(u,e))essence(w,u,e,R.dehaka.killEssence);}
 for(const x of w.zergHeroes.infections.filter(x=>x.target===e.id&&x.until>w.time)){w.zergHeroes.pools.push({id:w.nextId++,source:x.source,rank:x.rank,point:{x:e.x,z:e.z},until:w.time+R.stukov.poolSeconds,next:w.time+1});const u=w.entities.get(x.source);if(u)w.visual('hero-infection-pool',u,e);}
 for(const x of w.zergHeroes.parasites.filter(x=>x.target===e.id&&x.until>w.time)){const u=w.entities.get(x.source);if(u&&u.hp>0)for(const a of patients(w,e,R.niadra.deathRadius,R.niadra.targets))zergHeal(w,u,a,R.niadra.deathHeal*zergHeroGrowth(x.rank).passive,true);}
 w.zergHeroes.infections=w.zergHeroes.infections.filter(x=>x.target!==e.id);w.zergHeroes.parasites=w.zergHeroes.parasites.filter(x=>x.target!==e.id);
}
export function tickZergHeroState(w:World){w.zergHeroes.infections=w.zergHeroes.infections.filter(x=>x.until>w.time);w.zergHeroes.parasites=w.zergHeroes.parasites.filter(x=>x.until>w.time);
 const pools=w.zergHeroes.pools.filter(x=>x.until+1e-8>=w.time),due=pools.filter(x=>x.next<=w.time+1e-8);for(const p of due)p.next+=1;
 for(const a of w.allies().filter(permanentBiological)){const choices=due.filter(p=>dist(a,p.point)<=R.stukov.poolRadius+a.unitRadius&&(!w.terrain||w.terrain.lineOfFire(p.point,a,false,a.flying))).sort((a,b)=>b.rank-a.rank||a.id-b.id);const p=choices[0],source=p&&w.entities.get(p.source);if(source&&source.hp>0)zergHeal(w,source,a,R.stukov.heal*zergHeroGrowth(p.rank).passive,true);}
 w.zergHeroes.pools=pools.filter(x=>x.until>w.time+1e-8);tickZergRevival(w);
}
export {registerZergRevival};
export function validateZergHeroRun(s:ZergHeroRunState){const id=(n:number)=>Number.isSafeInteger(n)&&n>0;if(!s||!Array.isArray(s.infections)||!Array.isArray(s.parasites)||!Array.isArray(s.pools)||!Array.isArray(s.revivals)||s.infections.length>8192||s.parasites.length>8192||s.pools.length>1024||s.revivals.length>3)throw Error('虫族英雄状态无效');
 for(const x of [...s.infections,...s.parasites,...s.pools])if(!id(x.source)||!Number.isInteger(x.rank)||x.rank<1||x.rank>5||!Number.isFinite(x.until)||('target' in x&&!id(x.target)))throw Error('感染/寄生收据无效');
 for(const p of s.pools)if(!id(p.id)||![p.next,p.point?.x,p.point?.z].every(Number.isFinite))throw Error('感染池无效');
 for(const r of s.revivals)if(!id(r.id)||!id(r.source)||![r.until,r.next].every(Number.isFinite)||!Number.isInteger(r.charges)||r.charges<0||r.charges>4||!Array.isArray(r.seats)||r.seats.length>7||new Set(r.seats.map(x=>x.key)).size!==r.seats.length||r.seats.some(x=>typeof x.key!=='string'||typeof x.claimed!=='boolean'||!Number.isInteger(x.rank)||x.rank<1||x.rank>5||!Array.isArray(x.members)||x.members.length<1||x.members.length>2||x.members.some(u=>!id(u.id)||u.heroId||u.temporary||u.owner!=='terran'||u.hp>0)||x.deadAt!==null&&!Number.isFinite(x.deadAt)))throw Error('复生登记无效');
 for(const r of s.revivals)for(const seat of r.seats){
  if(!(FAMILIES_BY_RACE.zerg as readonly string[]).includes(seat.family)||seat.pairId!==undefined&&(seat.family!=='zergling'||typeof seat.pairId!=='string'||!seat.pairId)||seat.key!==(seat.pairId??'body:'+seat.members[0].id)||new Set(seat.members.map(u=>u.id)).size!==seat.members.length)throw Error('复生身份无效');
  for(const u of seat.members)if(u.unitType!==seat.family||u.race!=='zerg'||u.team!=='player'||u.hp!==0||!Number.isInteger(u.rank)||u.rank<1||u.rank>7||![u.bornAt,u.x,u.z,u.maxHp,u.unitRadius].every(Number.isFinite)||u.maxHp<=0||u.unitRadius<=0||![u.weaponCooldown,u.nextShotAt,u.lastShotAt].every(n=>typeof n==='number'&&!Number.isNaN(n))||!Array.isArray(u.attributes)||!u.attributes.includes('Biological')||u.attributes.includes('Structure')||u.summonKind||u.pairId!==seat.pairId||u.eliteId!==undefined&&(!Object.hasOwn(ELITES,u.eliteId)||ELITES[u.eliteId].family!==seat.family))throw Error('复生身体无效');
 }
}
