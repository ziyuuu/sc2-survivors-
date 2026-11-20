import {doomsdayNodeHit} from './doomsday-nodes';
import {doomsdayShotStyle} from './doomsday-presentation';
import {doomsdaySwordTarget} from './doomsday-melee';
import {doomsdayWeaponHit,doomsdayFlameHit} from './doomsday-weapons';
import {DOOMSDAY_CARD_BY_ID as CARDS} from '../../data/terran-doomsday';
import {doomsdayGun,doomsdayGunner} from './doomsday';
import {mechanicalRanks,mechanicalMember,mechanicalRank,formalDoomsdayMember} from './doomsday-roster';
import {doomsdayRank,type DoomsdayCombat} from './doomsday-state';
import {unitData} from './expedition-combat';
import {cloneCombatSource} from '../starship/runtime';
import {equipmentWeaponPenetration} from '../starship/combat';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const ref=(u:Entity)=>({entityId:u.id,bornAt:u.bornAt});
const key=(u:Entity)=>`${u.id}:${u.bornAt}:${u.shotSequence??0}`;
export function doomsdayCombat(u:Entity):DoomsdayCombat{return u.doomsday??={walked:0,lastWalked:u.distanceWalked,settled:0,ready:false,serial:0};}
/** distanceWalked is advanced only by voluntary movement, never teleports or knockback. */
export function tickDoomsdayPreheat(w:World,u:Entity){
 if(!doomsdayGunner(u,w)||!mechanicalRank(w,u,'M-W05'))return;
 const s=doomsdayCombat(u),p=CARDS['M-W05'].params;
 s.walked=Math.min(p.distance,s.walked+Math.max(0,u.distanceWalked-s.lastWalked));s.lastWalked=u.distanceWalked;
 s.settled=Math.hypot(u.velocity.x,u.velocity.z)<p.settleSpeed?s.settled+1:0;
 if(!s.ready&&s.walked>=p.distance&&s.settled>=p.settleTicks){s.ready=true;s.serial++;}
}
export function doomsdayAimFactor(w:World,u:Entity,target?:Body){if(doomsdaySwordTarget(w,u,target))return 1;const rank=mechanicalRank(w,u,'M-W05');return rank&&u.doomsday?.ready?CARDS['M-W05'].params.aim[rank-1]:1;}
function nativeHits(u:Entity){return u.eliteId==='reaper.1'?6:unitData(u).attacks;}
/** Called after the real native shot sequence increments, before any source is cloned. */
export function beginDoomsdayRound(w:World,u:Entity,target?:Body){
 if(!w.expedition.doomsday||!doomsdayGunner(u,w)&&!mechanicalMember(w,u))return;
 const s=doomsdayCombat(u),melee=doomsdaySwordTarget(w,u,target),gun=!melee&&doomsdayGun(u,w),r=gun?mechanicalRank(w,u,'M-W01'):0,aim=melee?0:mechanicalRank(w,u,'M-W05'),pen=gun?mechanicalRank(w,u,'M-G01'):0,a=w.expedition.doomsday;
 const preheated=!!aim&&s.ready;
 let salvo:number|null=null;
 if(preheated&&mechanicalRank(w,u,'M-N04')){
  a.salvos=(a.salvos??[]).filter(g=>g.expires>=w.tick&&!g.members.every(m=>m.fired));
  let group=a.salvos.find(g=>g.members.some(m=>m.entityId===u.id&&m.bornAt===u.bornAt&&m.serial===s.serial&&!m.fired));
  if(!group){
   const enhanced=(a.nodeReserves['M-N04']??0)>a.salvos.filter(g=>g.enhanced).length+(a.parkedSalvoReservations??0);
   const ready=w.allies().filter(v=>v.id!==u.id&&doomsdayGunner(v,w)&&v.doomsday?.ready&&distance(u,v)<=4&&!a.salvos!.some(g=>g.members.some(m=>m.entityId===v.id&&m.bornAt===v.bornAt&&m.serial===v.doomsday!.serial))).sort((v,z)=>distance(u,v)-distance(u,z)||v.id-z.id).slice(0,enhanced?3:2);
   group={id:a.nextSalvo=(a.nextSalvo??0)+1,expires:w.tick+60,enhanced:enhanced&&ready.length===3,members:[u,...ready].map(v=>({...ref(v),serial:v.doomsday!.serial,fired:false}))};a.salvos.push(group);
  }
  const member=group.members.find(m=>m.entityId===u.id&&m.bornAt===u.bornAt)!;member.fired=true;salvo=group.id;
  if(group.enhanced&&group.members.filter(m=>m.fired).length===4){a.nodeReserves['M-N04']!--;group.enhanced=false;}
 }
 s.round={sequence:u.shotSequence??0,gun,crossfire:mechanicalRank(w,u,'M-N05')>0,preheated,damageFactor:(r?CARDS['M-W01'].params.damage[r-1]:1)*(preheated?CARDS['M-W05'].params.damage[aim-1]:1),penetration:pen?CARDS['M-G01'].params.penetration[pen-1]:0,hits:nativeHits(u),salvo,cards:{...mechanicalRanks(w,u)},special:u.doomsday?.special,pierce:u.unitType==='tank'&&u.mode==='siege'&&!!mechanicalRank(w,u,'M-P05')&&(s.tankRounds=(s.tankRounds??0)+1)%3===0};
 if(melee)s.round.melee=true;
 s.round.shotStyle=doomsdayShotStyle(w,u);
 if(preheated){s.ready=false;s.walked=0;s.settled=0;}
}
export function doomsdayDirectPacket(u:Entity,direct:boolean){const round=u.doomsday?.round;return direct&&round?.sequence===u.shotSequence?round:null;}
export function launchDoomsdaySalvo(w:World,u:Entity,target:Body,bonuses:{attribute:string;amount:number}[],shieldBonus:number,crit:number){
 const round=doomsdayDirectPacket(u,true);if(!round||round.salvo===null)return;
 const fraction=.25*round.damageFactor;
 w.weaponFlights.push({id:w.nextId++,attackId:key(u)+':salvo',source:cloneCombatSource(w,u),target:target.id,from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},lastSeen:{x:target.x,z:target.z},start:w.time,expires:w.time+8,speed:52,lost:false,damage:u.weaponDamage*fraction,bonuses:bonuses.map(b=>({...b,amount:b.amount*fraction})),hits:round.hits,shieldBonus:shieldBonus*fraction,crit,enemyFactor:w.enemyDamageFactor(u),apm:false,hop:0,seen:[],primary:false,doomsdayDerived:{penetration:Math.max(round.penetration,equipmentWeaponPenetration(w,u,target))}});
 w.visual('support-flight',u,target,undefined,undefined,{supportVisual:'rear-blast',doomsdayEffect:'crossfire'});
}
/** Derived packets go directly through armor; they do not open another native round. */
function extraHit(w:World,u:Entity,front:Body,target:Body,damage:number,bonuses:{attribute:string;amount:number}[],hits:number,fraction:number,penetration:number){
 w.hit(target,damage*fraction,bonuses.map(b=>({...b,amount:b.amount*fraction})),hits,u.owner,.5,penetration,u.id,false,false,0,false);
 w.visual('support-impact',u,target,undefined,undefined,{supportVisual:'rear-blast',doomsdayEffect:'crossfire',doomsdayOrigin:{x:front.x,z:front.z}});
}
export function doomsdayNativeHit(w:World,u:Entity,target:Body,damage:number,bonuses:{attribute:string;amount:number}[],direct:boolean,effective:number){
 doomsdayFlameHit(w,u,target,effective);const a=w.expedition.doomsday,round=doomsdayDirectPacket(u,direct);if(!a||!round||effective<=0)return;
 const roundKey=key(u),seen=a.hitRounds??={};
 const first=seen[roundKey]===undefined;doomsdayNodeHit(w,u,target,round.budget??{damage,bonuses,hits:round.hits,crit:1,enemyFactor:1,shieldBonus:0},effective,first);
 if(round.cards?.['M-N02']&&mechanicalMember(w,u))w.visual('support-impact',u,target,undefined,undefined,{doomsdayEffect:'phase-hit',doomsdayStyle:doomsdayShotStyle(w,u)|((a.furyRounds?.[roundKey]?.fraction??0)>=.2?4:0)});
 if(!first)return;seen[roundKey]=w.tick;doomsdayWeaponHit(w,u,target,damage,bonuses,effective,true);
 // First effective direct hit per native round, including delayed elite bullets.
 if(!round.gun||!round.crossfire)return;
 const marks=a.crossfire??={},mark=marks[String(target.id)],p=CARDS['M-N05'].params;
 if(mark&&w.tick<mark.ready)return;
 if(mark&&mark.source.entityId!==u.id&&w.tick-mark.tick<=p.window&&distance(mark,u)>=p.separation){
  const dx=target.x-u.x,dz=target.z-u.z,d=Math.hypot(dx,dz),forward=d?{x:dx/d,z:dz/d}:null;
  if(forward){
   const extra=[...w.entities.values()].filter(v=>{
    if(v.id===target.id||v.hp<=0||v.heldBy||v.owner===u.owner||v.flying!==target.flying||!w.visibleTo(v,u.owner)||!w.hasAttackLine(u,v)||w.edgeDistance(u,v)>u.attackRange)return false;
    const x=v.x-target.x,z=v.z-target.z;return x*forward.x+z*forward.z>0&&Math.abs(x*forward.z-z*forward.x)<=p.halfWidth+v.unitRadius;
   }).sort((v,z)=>distance(u,v)-distance(u,z)||v.id-z.id).slice(0,(a.nodeReserves['M-N05']??0)>0?2:1);
   if(extra.length){for(const victim of extra)extraHit(w,u,target,victim,damage,bonuses,round.hits,p.damage,round.penetration);if(extra.length===2)a.nodeReserves['M-N05']!--;marks[String(target.id)]={source:ref(u),x:u.x,z:u.z,tick:w.tick,round:roundKey,ready:w.tick+p.cooldown};return;}
  }
 }
 marks[String(target.id)]={source:ref(u),x:u.x,z:u.z,tick:w.tick,round:roundKey,ready:0};
}
export function pruneDoomsdayRounds(w:World){const a=w.expedition.doomsday;if(!a)return;
 for(const u of w.allies())if(u.unitType==='tank'&&u.mode!=='siege'&&u.doomsday)u.doomsday.tankRounds=0;
 if(a.splitSpent)for(const [id,tick] of Object.entries(a.splitSpent))if(w.tick-tick>600)delete a.splitSpent[id];
 if(a.hitRounds)for(const [id,tick] of Object.entries(a.hitRounds))if(w.tick-tick>600)delete a.hitRounds[id];
 if(a.crossfire)for(const [id,mark] of Object.entries(a.crossfire))if(w.tick>Math.max(mark.ready,mark.tick+60))delete a.crossfire[id];
 if(a.salvos)a.salvos=a.salvos.filter(g=>g.expires>=w.tick&&!g.members.every(m=>m.fired));
}
export function clearDoomsdayBattle(w:World){const a=w.expedition.doomsday;if(!a)return;a.hitRounds={};a.crossfire={};a.salvos=[];a.parkedSalvoReservations=0;a.parkedResonanceReservations=0;a.scrap=[];a.areas=[];a.slashes=[];a.dots=[];a.pincer={};a.splitHits={};a.furyRounds={};
 for(const u of w.entities.values())clearDoomsdayActorBattle(u);
}
export function clearDoomsdayActorBattle(u:Entity){if(u.doomsday){const s=u.doomsday;u.doomsday={...s,round:undefined,walked:0,lastWalked:u.distanceWalked,settled:0,ready:false,dual:s.dual?{air:{...s.dual.air,target:null},ground:{...s.dual.ground,target:null}}:undefined,station:undefined,giant:s.giant?{nextReadyTick:s.giant.nextReadyTick,lastFireTick:s.giant.lastFireTick,rounds:0,cannons:0,pendingCannon:false}:undefined,capacitor:0,nanoAmmo:false,airPairUntilTick:0,blueFlame:undefined,tankRounds:0,tow:s.tow?{...s.tow,untilTick:0}:undefined};}}
