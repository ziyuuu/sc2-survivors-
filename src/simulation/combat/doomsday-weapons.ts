import {doomsdayStationRound,doomsdayNodeHit,doomsdaySplitHit,doomsdayFuryFraction} from './doomsday-nodes';
import {inDoomsdaySword} from './doomsday-melee';
import {DOOMSDAY_CARD_BY_ID as C,type DoomsdayId} from '../../data/terran-doomsday';
import {SIEGE} from '../../data/sc2-units';
import {SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {mechanicalMember,mechanicalRank,formalDoomsdayMember,sameMechanicalMember} from './doomsday-roster';
import {doomsdayHasHost} from './doomsday-refits';
import {doomsdayCombat,doomsdayNativeHit} from './doomsday-combat';
import {unitData,expeditionWeaponBonuses} from './expedition-combat';
import {cloneCombatSource} from '../starship/runtime';
import {equipmentWeaponPenetration} from '../starship/combat';
import {equipmentAreaRadius,equipmentAreaFactor,equipmentAreaBonuses} from '../starship/weapon-areas';
import {eliteMainFactor} from './terran-elite-runtime';
import {weaponFlightSpeed,type WeaponFlight} from './weapon-flight';
import {inWeaponArc} from './weapon-patterns';
import {clearLine,blocked,movementRadius} from '../movement/steering';
import type {DoomsdayPayload} from './doomsday-state';
import {bioKnockDistance} from './bio-runtime';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';

export const mechanicalRoundKey=(u:Entity)=>`${u.id}:${u.bornAt}:${u.shotSequence??0}`;
const gap=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const bonuses=(b:DoomsdayPayload['bonuses'],f:number)=>b.map(a=>({...a,amount:a.amount*f}));
const card=(w:World,u:Entity,id:DoomsdayId)=>u.doomsday?.round?.cards?.[id]??mechanicalRank(w,u,id);
export function nativeOuterRadius(w:World,u:Entity,radius:number){return radius*(card(w,u,'M-B02')?C['M-B02'].params.radius:1);}
function targets(w:World){return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])];}
function legal(w:World,u:Entity,b:Body,range=u.attackRange){return b.hp>0&&!b.heldBy&&b.owner!==u.owner&&w.visibleTo(b,u.owner)&&w.targetAllowed(u,b)&&w.edgeDistance(u,b)<=range&&w.hasAttackLine(u,b);}
export function nativePayload(w:World,u:Entity,bonus:DoomsdayPayload['bonuses'],shieldBonus:number,crit:number):DoomsdayPayload{
 const r=u.doomsday?.round,f=r?.damageFactor??1,hits=u.eliteId==='reaper.1'?6:u.eliteId==='marauder.3'?3:unitData(u).attacks,part=u.eliteId==='marauder.3'?.65:1;
 return {damage:u.weaponDamage*f*part,bonuses:bonuses(bonus,f*part),hits,shieldBonus:shieldBonus*f*part,crit,enemyFactor:w.enemyDamageFactor(u)};
}
/** A frozen secondary packet bypasses every native proc and still pays armor per hit. */
export function launchMechanicalPacket(w:World,u:Entity,target:Body,payload:DoomsdayPayload,fraction:number,kind:NonNullable<WeaponFlight['doomsdayDerived']>['kind'],options:{from?:Point;startTick?:number;speed?:number;hits?:number;round?:string}={}){
 const from=options.from??u,source=cloneCombatSource(w,u),start=options.startTick===undefined?w.time:w.time+(options.startTick-w.tick)/60,hits=options.hits??payload.hits;
 const p:WeaponFlight={id:w.nextId++,attackId:mechanicalRoundKey(u)+':'+kind+':'+w.nextId,source,target:target.id,targetFlying:target.flying,from:{x:from.x,z:from.z},point:{x:from.x,z:from.z},lastSeen:{x:target.x,z:target.z},start,expires:start+(kind==='split'?2:8),speed:options.speed??(weaponFlightSpeed(u)||1e6),lost:false,damage:payload.damage*fraction,bonuses:bonuses(payload.bonuses,fraction),hits,shieldBonus:payload.shieldBonus*fraction,crit:payload.crit,enemyFactor:payload.enemyFactor,apm:false,hop:0,seen:[],primary:false,doomsdayDerived:{penetration:Math.max(u.doomsday?.round?.penetration??0,equipmentWeaponPenetration(w,u,target)),kind,round:options.round??mechanicalRoundKey(u)},...(start>w.time?{pendingLaunch:true}:{})};
 w.weaponFlights.push(p);return p;
}
export function scheduleDoomsdayWeapon(w:World,u:Entity,target:Body,bonus:DoomsdayPayload['bonuses'],shieldBonus:number,crit:number){
 const r=u.doomsday?.round;if(!r||r.scheduled)return;r.scheduled=true;const payload=r.budget=nativePayload(w,u,bonus,shieldBonus,crit);
 const live=w.entities.get(u.id);if(live&&live.bornAt===u.bornAt&&live.doomsday?.round?.sequence===r.sequence)live.doomsday.round.budget=structuredClone(payload);
 const repeat=mechanicalMember(w,u)?card(w,u,'M-B03'):0;
 doomsdayStationRound(w,u,target,payload);
 if(repeat){const n=1+C['M-B03'].params.segments[repeat-1],period=Math.max(1,Math.ceil((u.shotInterval||u.attackPeriod)*60-1e-8));for(let j=1;j<n;j++)launchMechanicalPacket(w,u,target,payload,C['M-B03'].params.damage,'repeat',{startTick:w.tick+Math.floor(j*period/n)});}
}
/** Native sequential shots stay queued until their real launch step. */
export function launchPendingMechanical(w:World,p:WeaponFlight){
 if(!p.pendingLaunch)return true;
 const live=w.entities.get(p.source.id);if(!live||live.hp<=0||live.bornAt!==p.source.bornAt||live.heldBy||live.modeTimer>0||live.nativeModeUntil||live.mode!==p.source.mode||live.nativeMode!==p.source.nativeMode)return false;
 const originalTarget=p.target;
 let target=w.body(p.target);
 if(!target||target.hp<=0){
  if(!card(w,p.source,'M-B05'))return false;
  target=targets(w).filter(t=>legal(w,{...p.source,x:live.x,z:live.z},t)&&t.flying===(p.targetFlying??false)).sort((a,b)=>gap(live,a)-gap(live,b)||a.id-b.id)[0];
 }
 const source={...p.source,x:live.x,z:live.z};if(!target||!legal(w,source,target))return false;
 p.source.x=live.x;p.source.z=live.z;p.source.attackFacing=Math.atan2(target.x-live.x,target.z-live.z);p.target=target.id;p.from={x:live.x,z:live.z};p.point={...p.from};p.lastSeen={x:target.x,z:target.z};p.pendingLaunch=false;
 w.visual('support-flight',source,target,p.id,undefined,{supportVisual:'rear-blast',doomsdaySegment:p.doomsdayDerived?.kind,...(p.target!==originalTarget?{doomsdayEffect:'redirect' as const}:{})});return true;
}
export function doomsdayFlameHit(w:World,u:Entity,target:Body,effective:number){
 if(effective<=0||u.unitType!=='hellion'||target.flying||!doomsdayHasHost(w,'M-G06',u))return;
 const victim=w.entities.get(target.id);if(!victim||victim.hp<=0)return;const s=doomsdayCombat(victim),p=C['M-G06'].params;
 (s.blueFlame??={})[String(u.id)]={bornAt:u.bornAt,untilTick:w.tick+p.duration,speed:victim.enemyTier==='boss'||victim.enemyTier==='lord'?p.bossSpeed:p.speed};
}
export function doomsdaySlow(w:World,u:Entity){let factor=1;for(const [id,flame] of Object.entries(u.doomsday?.blueFlame??{})){if(flame.untilTick>w.tick)factor=Math.min(factor,flame.speed);else delete u.doomsday!.blueFlame![id];}return factor;}
export function chargeDoomsdayCapacitor(w:World,u:Entity,loss:number){if(loss>0&&u.hp>0&&doomsdayHasHost(w,'M-P04',u)){const s=doomsdayCombat(u);s.capacitor=Math.min(C['M-P04'].params.threshold,(s.capacitor??0)+loss/u.maxHp);}}
/** Called on the first real native direct impact, after the actual packet settled. */
export function doomsdayWeaponHit(w:World,u:Entity,target:Body,damage:number,bonus:DoomsdayPayload['bonuses'],effective:number,first:boolean){
 if(effective<=0)return;doomsdayFlameHit(w,u,target,effective);if(!first)return;
 const s=w.expedition.doomsday,r=u.doomsday?.round;if(!s||!r)return;
 const payload=r.budget??{damage,bonuses:bonus,hits:r.hits,shieldBonus:0,crit:1,enemyFactor:1};
 if(card(w,u,'M-P02')&&mechanicalMember(w,u)&&!target.flying&&!target.attributes.includes('Structure')){
  const victim=w.entities.get(target.id),ready=s.knockReady??={};
  if(victim&&victim.hp>0&&victim.enemyTier!=='boss'&&victim.enemyTier!=='lord'&&w.tick>=(ready[String(target.id)]??0)&&w.random()<C['M-P02'].params.chance){
   ready[String(target.id)]=w.tick+C['M-P02'].params.cooldown;const d=gap(u,target)||1,length=bioKnockDistance(w,target,target.attributes.some(a=>a==='Massive'||a==='Armored')?C['M-P02'].params.heavyDistance:C['M-P02'].params.distance),origin={x:target.x,z:target.z};
   for(let t=.1;t<=length+1e-8;t+=.1){const p={x:origin.x+(origin.x-u.x)/d*t,z:origin.z+(origin.z-u.z)/d*t};if(Math.abs(p.x)+target.unitRadius>=w.mapHalf||Math.abs(p.z)+target.unitRadius>=w.mapHalf||!clearLine(target,p,target.unitRadius,w.obstacles,w.terrain)||blocked(p,target.unitRadius,w.obstacles)||w.terrain&&!w.terrain.canOccupy(p,target.unitRadius))break;target.x=p.x;target.z=p.z;}
   if(gap(origin,target)>.01)w.visual('support-impact',{...u,...origin},target,undefined,undefined,{doomsdayEffect:'knock'});
  }
 }
 const live=w.entities.get(u.id);
 if(live&&doomsdayHasHost(w,'M-P04',live)&&(live.doomsday?.capacitor??0)>=C['M-P04'].params.threshold){
  live.doomsday!.capacitor=0;launchMechanicalPacket(w,u,target,payload,C['M-P04'].params.main,'node');
  const nearby=targets(w).filter(b=>b.id!==target.id&&b.hp>0&&b.owner!==u.owner&&b.flying===target.flying&&gap(b,target)<=4&&w.visibleTo(b,u.owner)&&w.hasAttackLine(u,b)).sort((a,b)=>gap(a,target)-gap(b,target)||a.id-b.id).slice(0,2);
  for(const victim of nearby)launchMechanicalPacket(w,u,victim,payload,C['M-P04'].params.side,'node',{from:target});
 }
 if(u.unitType==='banshee'&&(r.special==='M-P06'||doomsdayHasHost(w,'M-P06',u))){
  const key=mechanicalRoundKey(u),spent=s.splitSpent??={};if(spent[key]!==undefined)return;spent[key]=w.tick;
  const choices=targets(w).filter(b=>b.id!==target.id&&b.hp>0&&!b.flying&&b.owner!==u.owner&&!b.heldBy&&gap(b,target)<=4&&w.visibleTo(b,u.owner)&&(!w.terrain||w.terrain.lineOfFire(target,b,false,false))).sort((a,b)=>gap(a,target)-gap(b,target)||a.id-b.id).slice(0,3);
  if(target.hp>0)for(let i=0,n=Math.min(2,3-choices.length);i<n;i++)choices.push(target);
  if(choices.length)w.visual('support-impact',u,target,undefined,undefined,{doomsdayEffect:'split-release'});
  for(const victim of choices)launchMechanicalPacket(w,u,victim,payload,C['M-P06'].params.damage*payload.hits,'split',{from:target,hits:1,speed:C['M-P06'].params.speed,round:key});
 }
}
/** Both the native shell and the fortress center row use the card's rear-contact order. */
export function boreTargets(w:World,source:Entity,origin:Point,forward:Point,range:number){
 const {halfWidth,targets:limit}=C['M-P05'].params;
 return targets(w).filter(victim=>{
  const dx=victim.x-origin.x,dz=victim.z-origin.z;
  return victim.hp>0&&!victim.flying&&victim.owner!==source.owner&&dx*forward.x+dz*forward.z>0
   &&Math.abs(dx*forward.z-dz*forward.x)<=halfWidth+victim.unitRadius&&w.visibleTo(victim,source.owner)
   &&w.edgeDistance(source,victim)<=range&&w.hasAttackLine(source,victim);
 }).sort((a,b)=>gap(source,a)-gap(source,b)||a.id-b.id).slice(0,limit);
}
export function showBoreContacts(w:World,source:Entity,origin:Point,rear:readonly Body[]){
 let previous=origin;
 for(const victim of rear){
  w.visual('support-impact',source,victim,undefined,undefined,{doomsdayEffect:'bore-hit',doomsdayOrigin:{x:previous.x,z:previous.z}});
  previous=victim;
 }
}

/** Native splash shape used by a repeated frozen round; no follow-up proc is called. */
export function mechanicalAreaFractions(w:World,u:Entity,target:Body,pierced?:Body[]){
 const entries=new Map<Body,number>();entries.set(target,1);
 if(u.doomsday?.round?.melee){for(const b of targets(w))if(inDoomsdaySword(w,u,b,u.attackFacing))entries.set(b,1);return entries;}
 if(u.unitType==='tank'&&u.mode==='siege'){
  const m=u.eliteId==='tank.3'?Math.sqrt(5):u.eliteId==='tank.2'?1.25:1,bands=SIEGE.splash;
  for(const b of targets(w))if(b.id!==target.id&&b.hp>0&&!b.flying&&b.owner!==u.owner&&w.hasAttackLine(u,b)){
   const band=bands.find((s,i)=>gap(target,b)<=equipmentAreaRadius(w,u,(i===bands.length-1?nativeOuterRadius(w,u,s.radius*m):s.radius*m))+b.unitRadius*.25);if(band)entries.set(b,band.fraction);
  }
  if(u.doomsday?.round?.pierce){const dx=target.x-u.x,dz=target.z-u.z,d=Math.hypot(dx,dz)||1,forward={x:dx/d,z:dz/d};
   const rear=boreTargets(w,u,target,forward,u.attackRange);
   for(const b of rear){entries.set(b,Math.max(entries.get(b)??0,C['M-P05'].params.damage));pierced?.push(b);}
  }
 }else if(u.unitType==='thor'&&target.flying&&u.activeWeapon==='JavelinMissileLaunchers'){
  const bands=SOURCE_WEAPON_PATTERNS.thorExplosive.bands;for(const b of targets(w))if(b.id!==target.id&&b.hp>0&&b.flying&&b.owner!==u.owner){const band=bands.find((s,i)=>gap(target,b)<=equipmentAreaRadius(w,u,i===bands.length-1?nativeOuterRadius(w,u,s.radius):s.radius)+b.unitRadius);if(band)entries.set(b,band.fraction);}
 }else if(u.unitType==='hellion'){
  const flame=card(w,u,'M-W02'),width=flame?C['M-W02'].params.width[flame-1]:1,facing=Math.atan2(target.x-u.x,target.z-u.z),length=u.eliteId==='hellion.1'?26:6.5;
  for(const b of targets(w))if(b.hp>0&&!b.flying&&b.owner!==u.owner&&w.hasAttackLine(u,b)){
   const dx=b.x-u.x,dz=b.z-u.z,along=dx*Math.sin(facing)+dz*Math.cos(facing),across=Math.abs(dx*Math.cos(facing)-dz*Math.sin(facing));
   if(u.nativeMode==='hellbat'?inWeaponArc(u,facing,b,nativeOuterRadius(w,u,SOURCE_WEAPON_PATTERNS.hellbat.radius),SOURCE_WEAPON_PATTERNS.hellbat.arcDegrees*width):along>=0&&along<=length+b.unitRadius&&across<=equipmentAreaRadius(w,u,.15)*width+b.unitRadius)entries.set(b,1);
  }
 }
 return entries;
}
/** The primary/native tank path shares its area union with repeats, without duplicating a victim. */
export function resolveMechanicalTank(w:World,u:Entity,target:Body,damage:number,bonus:DoomsdayPayload['bonuses'],crit:number,enemyFactor:number,apm=false){
 if(!u.doomsday?.round)return false;
 const pierced:Body[]=[];
 const entries=mechanicalAreaFractions(w,u,target,pierced);
 if(card(w,u,'M-B02')){
  const factor=u.eliteId==='tank.3'?Math.sqrt(5):u.eliteId==='tank.2'?1.25:1;
  const radius=equipmentAreaRadius(w,u,nativeOuterRadius(w,u,SIEGE.splash.at(-1)!.radius*factor));
  w.visual('support-impact',u,target,undefined,undefined,{doomsdayEffect:'blast-ring',supportRadius:radius});
 }
 if(card(w,u,'M-N02'))for(const b of targets(w))if(b.id!==target.id&&b.hp>0&&!b.flying&&b.owner!==u.owner&&gap(target,b)<=1.5+b.unitRadius&&w.hasAttackLine(u,b))entries.set(b,Math.max(entries.get(b)??0,.2));
 showBoreContacts(w,u,target,pierced);
 for(const [victim,fraction] of entries){
  const direct=victim.id===target.id;
  w.attackHit(u,victim,damage*fraction*equipmentAreaFactor(w,u),equipmentAreaBonuses(w,u,bonuses(bonus,fraction)),1,0,direct,direct?crit:1,{enemyFactor,apm:direct&&apm,direct});
 }
 return true;
}
export function resolveMechanicalDerived(w:World,p:WeaponFlight,target:Body){
 if(!p.doomsdayDerived)return false;
 const u=p.source;
 const pierced:Body[]|undefined=p.doomsdayDerived.kind==='repeat'&&u.doomsday?.round?.pierce?[]:undefined;
 const entries=p.doomsdayDerived.kind==='repeat'?mechanicalAreaFractions(w,u,target,pierced):new Map([[target,1]]);
 if(pierced)showBoreContacts(w,u,target,pierced);
 for(const [victim,fraction] of entries){const factor=p.enemyFactor*p.crit*fraction*(p.doomsdayDerived.kind?eliteMainFactor(u,victim):1),area=victim.id!==target.id?equipmentAreaFactor(w,u):1;
  const effective=settleMechanicalPacket(w,u,victim,{damage:p.damage*factor*area,bonuses:bonuses(p.bonuses,factor*area),hits:p.hits,shieldBonus:p.shieldBonus*factor,crit:1,enemyFactor:1},p.doomsdayDerived.penetration,p.doomsdayDerived.kind==='barrage');
  const payload=u.doomsday?.round?.budget??{damage:p.damage,bonuses:p.bonuses,hits:p.hits,shieldBonus:p.shieldBonus,crit:p.crit,enemyFactor:p.enemyFactor};
  if(p.doomsdayDerived.kind==='vikingAssist')doomsdayNodeHit(w,u,victim,payload,effective,false,'vikingAssist');
  if(p.doomsdayDerived.kind==='turret')doomsdayNodeHit(w,u,victim,payload,effective,false,'turret');
  if(p.doomsdayDerived.kind==='split')doomsdaySplitHit(w,u,victim,p.doomsdayDerived.round!,payload,effective);
 }
 w.visual('projectile-impact',u,target,p.id,undefined,{doomsdaySegment:p.doomsdayDerived.kind??'salvo',
  doomsdayEffect:pierced?'bore-hit':undefined,doomsdayOrigin:{...p.from},supportDuration:w.time-p.start});
 return true;
}
/** Frozen native groups retain their one original budget, including N02's armor split. */
export function settleMechanicalPacket(w:World,u:Entity,target:Body,p:DoomsdayPayload,penetration:number,native=false){
 const before=target.hp+(w.entities.get(target.id)?.shield??0),f=p.crit*p.enemyFactor,fury=native?doomsdayFuryFraction(w,u,true):0;
 w.hit(target,p.damage*f*(1-fury),bonuses(p.bonuses,f*(1-fury)),p.hits,u.owner,.5,penetration,u.id,false,false,p.shieldBonus*f*(1-fury),false);
 if(fury&&target.hp>0)w.hit(target,p.damage*f*fury,bonuses(p.bonuses,f*fury),p.hits,u.owner,0,1,u.id,false,false,p.shieldBonus*f*fury,false);
 const effective=before-target.hp-(w.entities.get(target.id)?.shield??0);
 if(native)doomsdayNativeHit(w,u,target,p.damage*f,bonuses(p.bonuses,f),true,effective);
 return effective;
}
export function tickDoomsdayTurrets(w:World){
 const s=w.expedition.doomsday;if(!s)return;
 const host=s.blueprints?.['M-B09']?.host,u=host&&w.entities.get(host.entityId);if(!u||u.hp<=0||!sameMechanicalMember(host!,u)||u.flying||u.weaponDamage<=0)return;
 const state=doomsdayCombat(u);if(w.tick<(state.turretReadyTick??0))return;
 const main=u.attackTarget??u.pendingTarget,angle=u.attackFacing,target=targets(w).filter(t=>!t.flying&&t.id!==main&&legal(w,u,t,5)&&Math.abs(Math.atan2(Math.sin(Math.atan2(t.x-u.x,t.z-u.z)-angle),Math.cos(Math.atan2(t.x-u.x,t.z-u.z)-angle)))>=Math.PI/4).sort((a,b)=>gap(u,a)-gap(u,b)||a.id-b.id)[0];if(!target)return;
 state.turretReadyTick=w.tick+C['M-B09'].params.cooldown;const bonus=expeditionWeaponBonuses(w,u);launchMechanicalPacket(w,u,target,nativePayload(w,u,bonus.bonuses,bonus.shieldBonus,1),C['M-B09'].params.damage,'turret',{speed:52});
 w.visual('support-flight',u,target,undefined,undefined,{supportVisual:'bunker-shot',doomsdaySegment:'turret'});
}
