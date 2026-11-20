import {doomsdayGrowthTier} from './doomsday-presentation';
import {DOOMSDAY_CARD_BY_ID as C} from '../../data/terran-doomsday';
import {SIEGE} from '../../data/sc2-units';
import {formalDoomsdayMember,mechanicalMember,mechanicalRank} from './doomsday-roster';
import {doomsdayCombat,doomsdayNativeHit} from './doomsday-combat';
import {doomsdayHasHost} from './doomsday-refits';
import {cloneCombatSource} from '../starship/runtime';
import {boreTargets,showBoreContacts,launchMechanicalPacket,mechanicalRoundKey,nativeOuterRadius,mechanicalAreaFractions,settleMechanicalPacket} from './doomsday-weapons';
import {unitData} from './expedition-combat';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {DoomsdayArea,DoomsdayPayload} from './doomsday-state';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const ref=(u:Entity)=>({entityId:u.id,bornAt:u.bornAt});
const enemies=(w:World)=>[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])];
const armed=(u:Entity)=>formalDoomsdayMember(u)&&u.weaponDamage>0&&u.attackRange>1;
export function doomsdayRepairFactor(w:World,target:Entity){return mechanicalMember(w,target)&&w.expedition.doomsday?.ranks['M-N01']?C['M-N01'].params.repair:1;}
export function doomsdayRepaired(w:World,source:Entity|number|string|undefined,target:Body,amount:number){
 const a=w.expedition.doomsday,u=w.entities.get(target.id),worker=typeof source==='object'?source:typeof source==='number'?w.entities.get(source):undefined;
 if(!a||amount<=0||!u||!worker||!formalDoomsdayMember(worker))return;
 const engineer=!!mechanicalRank(w,worker,'M-G04')&&worker.unitType!=='science_vessel';
 const nano=!!a.ranks['M-N01']&&mechanicalMember(w,u)&&(worker.unitType==='science_vessel'||engineer);
 if(!nano){
  const medical=worker.unitType==='science_vessel'||worker.unitType==='medivac';
  const grade=medical?doomsdayGrowthTier(w,worker):0;
  if((w.tick%12===0||amount>=u.maxHp*.02)&&(engineer||worker.unitType==='science_vessel'&&mechanicalRank(w,worker,'M-W04')||grade))
   w.visual('support-pulse',worker,u,undefined,undefined,{doomsdayEffect:'repair-link',doomsdayStyle:grade});
  return;
 }
 doomsdayCombat(u).nanoArmorUntilTick=w.tick+180;
 if(w.tick%12===0)w.visual('support-pulse',worker,u,undefined,undefined,{doomsdayEffect:'nano-repair'});
 const candidates=w.allies().filter(v=>armed(v)&&!v.doomsday?.nanoAmmo&&(v.id===u.id||distance(v,u)<=4)).sort((v,z)=>Number(z.id===u.id)-Number(v.id===u.id)||distance(v,u)-distance(z,u)||v.id-z.id);
 const count=(a.nodeReserves['M-N01']??0)>0?2:1;
 for(const v of candidates.slice(0,count)){doomsdayCombat(v).nanoAmmo=true;w.visual('support-pulse',u,v,undefined,undefined,{doomsdayEffect:'nano-arm'});}
 if(count===2&&candidates.length>=2)a.nodeReserves['M-N01']!--;
}
export function queueDoomsdayArea(w:World,source:Entity,payload:DoomsdayPayload,kind:DoomsdayArea['kind'],points:Point[],radius:number,fraction:number,dueTick=w.tick,extra:Partial<DoomsdayArea>={}){
 const a=w.expedition.doomsday!;
 const event:DoomsdayArea={id:w.nextId++,kind,source:cloneCombatSource(w,source),payload:{...payload,damage:payload.damage*fraction,bonuses:payload.bonuses.map(b=>({...b,amount:b.amount*fraction})),shieldBonus:payload.shieldBonus*fraction},dueTick,points:points.map(p=>({...p})),radius,flying:false,...extra};
 (a.areas??=[]).push(event);return event;
}
export function doomsdayStationRound(w:World,u:Entity,target:Body,payload:DoomsdayPayload){
 if(!mechanicalMember(w,u)||!mechanicalRank(w,u,'M-N06'))return;
 const s=doomsdayCombat(u),p=C['M-N06'].params;
 if(!s.station||distance(u,s.station.origin)>p.distance||u.modeTimer>0)s.station={origin:{x:u.x,z:u.z},rounds:0};
 if(++s.station.rounds<4)return;s.station.rounds=0;
 const a=w.expedition.doomsday!,enhanced=(a.nodeReserves['M-N06']??0)>0,angle=u.attackFacing;
 const points=[-1,1].map(side=>({x:target.x+Math.cos(angle)*side,z:target.z-Math.sin(angle)*side}));
 for(const point of points)queueDoomsdayArea(w,u,payload,'station',[point],1,enhanced?.4:.25,w.tick,{flying:target.flying});
 if(enhanced)a.nodeReserves['M-N06']!--;
}
export function doomsdayFuryFraction(w:World,u:Entity,direct:boolean){
 if(!direct||!u.doomsday?.round||!u.doomsday.round.cards?.['M-N02']||!mechanicalMember(w,u))return 0;
 const a=w.expedition.doomsday!,key=mechanicalRoundKey(u),prior=a.furyRounds?.[key];
 return prior?.fraction??((a.nodeReserves['M-N02']??0)>0?.2:.1);
}
/** Called for every effective native hit; round-only effects additionally require first=true. */
export function doomsdayNodeHit(w:World,u:Entity,target:Body,payload:DoomsdayPayload,effective:number,first:boolean,channel:'native'|'turret'|'vikingAssist'='native'){
 const a=w.expedition.doomsday;if(!a||effective<=0)return;const r=u.doomsday?.round;
 if(first&&channel==='native'){
  const live=w.entities.get(u.id);
  if(live&&live.bornAt===u.bornAt&&live.doomsday?.nanoAmmo){
   live.doomsday.nanoAmmo=false;const victim=w.entities.get(target.id);
   if(victim&&victim.hp>0){const dots=a.dots??=[],old=dots.find(d=>d.source.id===u.id&&d.source.bornAt===u.bornAt&&d.target.entityId===target.id&&d.target.bornAt===victim.bornAt);
    const dot={source:cloneCombatSource(w,u),target:ref(victim),payload:structuredClone(payload),nextTick:old?.nextTick??w.tick+60,remaining:3};if(old)Object.assign(old,dot);else dots.push(dot);}
  }
  if(r?.cards?.['M-N02']&&mechanicalMember(w,u)){
   const key=mechanicalRoundKey(u),fraction=doomsdayFuryFraction(w,u,true);(a.furyRounds??={})[key]={fraction,tick:w.tick};if(fraction===.2)a.nodeReserves['M-N02']!--;
   if(!(u.unitType==='tank'&&u.mode==='siege')){const original=mechanicalAreaFractions(w,u,target);for(const b of enemies(w))if(b.id!==target.id&&b.hp>0&&!b.heldBy&&b.owner!==u.owner&&b.flying===target.flying&&distance(b,target)<=1.5+b.unitRadius&&!original.has(b)&&w.visibleTo(b,u.owner)&&w.hasAttackLine(u,b)){const f=payload.crit*payload.enemyFactor*.2;w.hit(b,payload.damage*f,payload.bonuses.map(v=>({...v,amount:v.amount*f})),payload.hits,u.owner,.5,r.penetration,u.id);}}
  }
 }
 const slow=w.entities.get(target.id)?.doomsday?.blueFlame;
 const blue=Object.entries(slow??{}).some(([id,mark])=>Number(id)!==u.id&&mark.untilTick>w.tick);
 const area=channel==='turret'||u.unitType==='tank'&&u.mode==='siege'||u.unitType==='thor'&&target.flying||u.unitType==='hellion'&&u.nativeMode==='hellbat';
 if(a.ranks['M-N07']&&blue&&area&&w.tick>=(a.coldReadyTick??0)){
  const angle=u.attackFacing,enhanced=(a.nodeReserves['M-N07']??0)>0,points=[1,...(enhanced?[2]:[])].map(n=>({x:target.x+Math.sin(angle)*1.5*n,z:target.z+Math.cos(angle)*1.5*n})).filter(p=>Math.abs(p.x)<w.mapHalf&&Math.abs(p.z)<w.mapHalf&&(!w.terrain||w.terrain.lineOfFire(target,p,target.flying,target.flying)));
  if(points.length){const radius=channel==='turret'?1.5:nativeOuterRadius(w,u,Math.max(1,...unitData(u).splash.map(s=>s.radius)));for(const point of points)queueDoomsdayArea(w,u,payload,'cold',[point],radius,.5,w.tick,{flying:target.flying});a.coldReadyTick=w.tick+480;if(enhanced&&points.length===2)a.nodeReserves['M-N07']!--;}
 }
 if(a.ranks['M-N08']){
  if(u.unitType==='viking'&&(r?.special==='M-B07'||doomsdayHasHost(w,'M-B07',u))){
   const live=w.entities.get(u.id);if(live&&live.bornAt===u.bornAt){const c=doomsdayCombat(live);
    if(target.flying)c.airPairUntilTick=w.tick+180;
    else if((c.airPairUntilTick??0)>w.tick&&w.tick>=(a.pincerReadyTick??0)){c.airPairUntilTick=0;const marks=a.pincer??={},reserved=Object.values(marks).filter(m=>m.enhanced&&m.untilTick>w.tick).length;if(!marks[String(target.id)]||marks[String(target.id)].untilTick<=w.tick){marks[String(target.id)]={untilTick:w.tick+180,followers:[],enhanced:(a.nodeReserves['M-N08']??0)>reserved};w.visual('support-pulse',u,target,undefined,undefined,{doomsdayEffect:'pincer-mark'});}}
   }
  }else if((u.unitType==='banshee'&&channel==='native')||channel==='turret'){
   const mark=a.pincer?.[String(target.id)];if(mark&&mark.untilTick>w.tick&&!mark.followers.includes(u.id)&&(mark.followers.length===0?w.tick>=(a.pincerReadyTick??0):mark.enhanced&&mark.followers.length===1)){
    launchMechanicalPacket(w,u,target,payload,.4,'node');w.visual('support-pulse',u,target,undefined,undefined,{doomsdayEffect:'pincer-spent'});mark.followers.push(u.id);if(mark.followers.length===1)a.pincerReadyTick=w.tick+480;else if(mark.enhanced){a.nodeReserves['M-N08']!--;mark.enhanced=false;}if(!mark.enhanced)delete a.pincer![String(target.id)];
   }
  }
 }
}
export function doomsdaySplitHit(w:World,u:Entity,target:Body,round:string,payload:DoomsdayPayload,effective:number){
 const a=w.expedition.doomsday;if(!a?.ranks['M-N09']||effective<=0||w.tick<(a.resonanceReadyTick??0))return;
 const marks=a.splitHits??={},hits=marks[round]??=[],old=hits.find(h=>h.target!==target.id&&distance(h.point,target)<=4);
 if(!old){if(!hits.some(h=>h.target===target.id))hits.push({target:target.id,point:{x:target.x,z:target.z},tick:w.tick});return;}
 const reserved=(a.areas??[]).filter(e=>e.kind==='resonance'&&e.enhanced).length+(a.parkedResonanceReservations??0),enhanced=(a.nodeReserves['M-N09']??0)>reserved;
 queueDoomsdayArea(w,u,payload,'resonance',[],0,.45,w.tick+30,{line:{from:old.point,to:{x:target.x,z:target.z},width:enhanced?1.6:.8},enhanced,round});a.resonanceReadyTick=w.tick+360;delete marks[round];
}
function lineDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function tickDoomsdayNodes(w:World){
 const a=w.expedition.doomsday;if(!a)return;
 for(const u of w.allies())if(u.doomsday?.station&&(distance(u,u.doomsday.station.origin)>1.5||u.modeTimer>0&&u.desiredMode==='tank'))u.doomsday.station=undefined;
 a.dots=(a.dots??[]).filter(d=>{const target=w.entities.get(d.target.entityId);if(!target||target.hp<=0||target.bornAt!==d.target.bornAt)return false;while(d.remaining>0&&w.tick>=d.nextTick){const p=d.payload,f=.1*p.crit*p.enemyFactor;w.hitOverTime(target,p.damage*f,p.bonuses.map(b=>({...b,amount:b.amount*f})),p.hits,d.source.owner,.5,0,d.source.id);w.visual('support-impact',d.source,target,undefined,undefined,{doomsdayEffect:'nano-dot'});d.remaining--;d.nextTick+=60;}return d.remaining>0&&target.hp>0;});
 a.areas=(a.areas??[]).filter(e=>{if(!e.pendingLaunch||w.tick<(e.launchTick??e.dueTick))return true;const u=w.entities.get(e.source.id);if(!u||u.hp<=0||u.bornAt!==e.source.bornAt||u.mode!=='siege'||u.modeTimer>0)return false;e.pendingLaunch=false;return true;});
 const due=(a.areas??[]).filter(e=>e.dueTick<=w.tick).sort((x,y)=>x.dueTick-y.dueTick||x.id-y.id);a.areas=(a.areas??[]).filter(e=>e.dueTick>w.tick);
 for(const e of due){
  const valid=enemies(w).filter(b=>b.hp>0&&!b.heldBy&&b.owner!==e.source.owner&&b.flying===e.flying&&(!e.forward||(b.x-e.source.x)*e.forward.x+(b.z-e.source.z)*e.forward.z>0)&&w.visibleTo(b,e.source.owner)&&w.hasAttackLine(e.source,b)&& (e.line?lineDistance(b,e.line.from,e.line.to)<=e.line.width/2+b.unitRadius:e.points.some(p=>distance(p,b)<=e.radius+b.unitRadius))).sort((x,y)=>x.id-y.id);
  const factors=new Map(valid.map(b=>[b,1]));
  const center=e.pierce&&e.points[Math.floor(e.points.length/2)];
  if(center&&e.forward){
   const rear=boreTargets(w,e.source,center,e.forward,e.range??0);
   const primary=valid.find(b=>b.id===e.primaryTarget);
   if(primary&&!rear.includes(primary))w.visual('support-impact',e.source,primary,undefined,undefined,{doomsdayEffect:'bore-hit'});
   showBoreContacts(w,e.source,center,rear);
   for(const b of rear)factors.set(b,Math.max(factors.get(b)??0,C['M-P05'].params.damage));
  }
  for(const [b,fraction] of factors){const p=e.payload,band=e.kind==='cannon'?SIEGE.splash.find(s=>distance(b,e.points[0])<=s.radius+b.unitRadius*.25)?.fraction??0:1,f=fraction*band;if(!f)continue;
   settleMechanicalPacket(w,e.source,b,{...p,damage:p.damage*f,bonuses:p.bonuses.map(v=>({...v,amount:v.amount*f})),shieldBonus:p.shieldBonus*f},e.source.doomsday?.round?.penetration??0,!!e.native&&b.id===e.primaryTarget);
  }
  if(e.enhanced&&e.kind==='resonance')a.nodeReserves['M-N09']=Math.max(0,(a.nodeReserves['M-N09']??0)-1);
  for(const p of e.points){
   if(e.kind==='nuke'){w.visual('strategic-impact',{...e.source,...p},p,e.id,undefined,{supportVisual:'doomsday-nuke'});continue;}
   const point={...p,flying:e.flying},launch=e.kind==='station'||e.kind==='cold'
    ?{x:e.source.x,z:e.source.z,facing:e.source.attackFacing,poseSeconds:.05}:undefined;
   w.visual('support-impact',e.source,point,e.id,launch,{supportVisual:'rear-blast',supportSound:'tank-siege',supportRadius:e.radius,doomsdayEffect:e.kind});
  }
  if(e.line){w.visual('support-impact',{...e.source,...e.line.from},e.line.to,e.id,undefined,{doomsdayEffect:'resonance',supportRadius:e.line.width});w.effect('shot',e.source,e.line.from,.3,.3);w.effect('shot',{...e.source,...e.line.from},e.line.to,e.line.width,.3);}
 }
 if(a.pincer)for(const [id,m] of Object.entries(a.pincer))if(m.untilTick<=w.tick)delete a.pincer[id];
 if(a.splitHits)for(const [id,m] of Object.entries(a.splitHits))if(!m.length||w.tick-m[0].tick>180)delete a.splitHits[id];
 if(a.furyRounds)for(const [id,m] of Object.entries(a.furyRounds))if(w.tick-m.tick>600)delete a.furyRounds[id];
}
