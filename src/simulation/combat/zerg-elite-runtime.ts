import {observeRecovery} from '../observation';
import {compositeEliteBuff,teamHealingFactor,recordTeamTransfusion,teamEntryBarrier} from './team-auras';
import type {World} from '../world';
import type {Entity,Body,Point} from '../types';
import type {WeaponFlight} from './weapon-flight';
import {isZergEliteId,zergEliteArmor} from '../../data/zerg-elites';
import {eliteFixedGrowth} from '../../data/terran-elites';
import {BILE} from '../../data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {unitData,talentModifiers,expeditionWeaponUpgrade,expeditionWeaponScale} from './expedition-combat';
import {weaponFlightSpeed} from './weapon-flight';
import {clearLine,translate} from '../movement/steering';
import {inWeaponArc} from './weapon-patterns';
import {pairFor,pairBodies} from '../zerg-brood';

type Bonus={attribute:string;amount:number};
export interface ZergEliteCombat {
 cycles:number;lastFire:number;target:number|null;stacks:number;stackUntil:number;lockAt:number;
 stored:number;ready:number;regenUntil:number;burrowPhase:0|1|2|3;burrowAt:number;burrowUntil:number;burrowReady:number;previousCloak:boolean;
 opening:number;modeReady:number;barrier:number;barrierUntil:number;charge:number;episode:boolean;boostUntil:number;
 redirectAt:number;redirectSpent:number;dash:{from:Point;to:Point;target:number;travel:number;distance:number}|null;
}
export interface ZergElitePoison {id:number;source:Entity;target:number;next:number;until:number;layers:number;kind:'hydra'|'air';spread:boolean;}
export interface ZergEliteArea {id:number;source:Entity;point:Point;radius:number;damage:number;next:number;until:number;kind:'acid'|'rain';}
export interface ZergEliteBile {id:number;source:Entity;point:Point;launchAt:number;impactAt:number;damage:number;radius:number;launched:boolean;}
export interface ZergEliteHeal {id:number;source:Entity;targets:number[];next:number;until:number;amount:number;}
export interface ZergEliteLine {id:number;source:Entity;from:Point;point:Point;facing:number;length:number;width:number;progress:number;next:number;hits:number[];damage:number;bonuses:Bonus[];target:number;crit:number;apm:boolean;air:boolean;kind:'spine'|'spear';}
export interface ZergEliteRun {
 frenzy:Record<string,{stacks:number;until:number}>;poisons:ZergElitePoison[];areas:ZergEliteArea[];biles:ZergEliteBile[];heals:ZergEliteHeal[];lines:ZergEliteLine[];
 debuffs:{source:number;target:number;until:number;armor:number;speed:number;move:number}[];
 gates:Record<string,number>;
}
export const newZergEliteRun=():ZergEliteRun=>({frenzy:{},poisons:[],areas:[],biles:[],heals:[],lines:[],debuffs:[],gates:{}});
export const revisedZergElite=(u:Entity)=>u.team==='player'&&!u.heroId&&isZergEliteId(u.eliteId);
export const zergEliteCombat=(u:Entity):ZergEliteCombat=>u.zergEliteCombat??(u.zergEliteCombat={cycles:0,lastFire:-1,target:null,stacks:0,stackUntil:0,lockAt:0,stored:0,ready:0,regenUntil:0,burrowPhase:0,burrowAt:0,burrowUntil:0,burrowReady:0,previousCloak:false,opening:0,modeReady:0,barrier:0,barrierUntil:0,charge:0,episode:false,boostUntil:0,redirectAt:-1,redirectSpent:0,dash:null});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const boss=(b:Body)=>'enemyTier' in b&&(b.enemyTier==='boss'||b.enemyTier==='lord');
const eligible=(u:Entity)=>u.hp>0&&u.team==='player'&&!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure');
export function zergEliteEnemies(w:World,u:Entity,p:Point,r:number,plane:'ground'|'air'|'both'='both'):Body[]{
 return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.hp>0&&b.owner!==u.owner&&(plane==='both'||b.flying===(plane==='air'))&&dist(p,b)<=r+b.unitRadius&&w.visibleTo(b,u.owner)&&(!w.terrain||w.terrain.lineOfFire(p,b,u.flying,b.flying))&&(u.flying||b.flying||clearLine(p,b,0,w.obstacles)));
}
function debuff(w:World,u:Entity,b:Body,seconds:number,v:Partial<{armor:number;speed:number;move:number}>){let d=w.zergElites.debuffs.find(d=>d.source===u.id&&d.target===b.id);if(!d){d={source:u.id,target:b.id,until:0,armor:0,speed:0,move:0};w.zergElites.debuffs.push(d);}Object.assign(d,v,{until:w.time+seconds});}
export function zergEliteDebuff(w:World,b:Body,key:'armor'|'speed'|'move'){let n=0;for(const d of w.zergElites.debuffs)if(d.target===b.id&&d.until>w.time)n=Math.max(n,d[key]);return n;}
export function zergEliteFriendlyAura(w:World,u:Entity){const a=compositeEliteBuff(w,u);return {hp:1+a.maxHp,shield:1+a.maxShield,armor:a.armorFlat,shieldArmor:a.shieldArmorFlat,regen:a.regenHpPerSecond,family:a.family,speed:1+a.speed,move:1+a.move};}
export function zergEliteStatModifiers(w:World,u:Entity){let damage=1,speed=1,armor=0;if(!revisedZergElite(u))return {damage,speed,armor};const s=zergEliteCombat(u);armor=zergEliteArmor(u.eliteId as Parameters<typeof zergEliteArmor>[0],u.rank);
 if(u.eliteId==='zergling.1'){const f=w.zergElites.frenzy[u.pairId??'body:'+u.id];speed*=1+.3*(f&&f.until>w.time?f.stacks:0);}
 if(u.eliteId==='roach.1'&&u.hp/u.maxHp<.35)armor+=8;
 if(u.eliteId==='mutalisk.3'&&s.boostUntil>w.time)speed*=3;
 if(u.eliteId==='ultralisk.3'&&s.boostUntil>w.time)speed*=2;
 return {damage,speed,armor};
}
export function zergEliteCanFire(w:World,u:Entity){return !revisedZergElite(u)||zergEliteCombat(u).burrowPhase===0&&!zergEliteCombat(u).dash;}
export function zergEliteMainFactor(u:Entity,b:Body){if(!revisedZergElite(u))return 1;let f=1;const id=u.eliteId,s=u.zergEliteCombat;
 if(b.attributes.includes('Light')&&['zergling.1','ultralisk.1'].includes(id!))f*=1.5;
 if(b.attributes.includes('Armored'))f*=id==='zergling.2'?1.6:id==='hydralisk.2'?2.5:id==='mutalisk.2'||id==='ultralisk.3'?1.5:id==='corruptor.1'&&b.flying?1.5:1;
 if(id==='corruptor.1')f*=1+3*Math.min(1,Math.max(0,(s?.lastFire??0)-(s?.lockAt??0))/4);
 return f;
}
function heal(w:World,b:Entity,n:number){const gain=Math.min(Math.max(0,b.maxHp-b.hp),Math.max(0,n)*teamHealingFactor(w,b,false));b.hp+=gain;w.stats.healed+=gain;observeRecovery(w,b,b,gain);return gain;}
function area(w:World,u:Entity,p:Point,kind:ZergEliteArea['kind'],radius:number,damage:number,seconds:number){w.zergElites.areas.push({id:w.nextId++,source:structuredClone(u),point:{x:p.x,z:p.z},kind,radius,damage,next:w.time+1,until:w.time+seconds});}
function poison(w:World,u:Entity,b:Body,kind:ZergElitePoison['kind'],seconds:number,layers=1,spread=true){if(b.hp<=0)return;let p=w.zergElites.poisons.find(p=>p.source.id===u.id&&p.target===b.id&&p.kind===kind&&p.until>w.time);
 if(p){p.layers=Math.min(kind==='hydra'?4:1,p.layers+layers);p.until=w.time+seconds;p.source=structuredClone(u);p.spread=p.spread||spread;}
 else w.zergElites.poisons.push({id:w.nextId++,source:structuredClone(u),target:b.id,next:w.time+1,until:w.time+seconds,layers,kind,spread});
}
/** Actual life loss is the only receipt for leech. Shield loss and prevented damage grant nothing. */
export function zergEliteAfterHit(w:World,u:Entity,b:Body,primary:boolean,lifeLoss:number){if(!revisedZergElite(u))return;const live=w.entities.get(u.id);if(!live||live.hp<=0||live.eliteId!==u.eliteId)return;const id=u.eliteId;
 if(id==='zergling.2'&&b.hp>0)debuff(w,u,b,4,{armor:.5});
 if(id==='roach.3'&&primary&&lifeLoss>0)zergEliteCombat(live).regenUntil=w.time+4;
 if(primary&&['zergling.3','mutalisk.3'].includes(id!)&&lifeLoss>0){const gain=heal(w,live,lifeLoss*(id==='zergling.3'?.25:.35));if(gain>0)w.visual('support-impact',live,b);}
 if(id==='hydralisk.3'&&primary&&b.hp>0)poison(w,u,b,'hydra',5);
 if(id==='corruptor.1'&&b.hp>0)debuff(w,u,b,4,{armor:.45});
 if(id==='corruptor.3'&&primary&&b.flying&&b.hp>0)poison(w,u,b,'air',5);
}
/** Damage redirection occurs after shields/armor/barriers, before actual life loss, and never recurses. */
export function zergEliteRedirect(w:World,b:Entity,amount:number,sourceOwner:Body['owner'],transferred:boolean){if(transferred||sourceOwner===b.owner||amount<=0||b.hp<=0)return amount;
 if(revisedZergElite(b)&&b.eliteId==='zergling.3'){const p=pairFor(w,b),twin=p&&pairBodies(w,p).find(u=>u.id!==b.id);if(twin){const share=Math.min(amount*.5,twin.hp);amount-=share;w.hit(twin,share,[],1,sourceOwner,0,1,undefined,false,true);w.visual('support-pulse',b,twin);}}
 if(b.flying&&eligible(b)){for(const guard of w.allies().filter(a=>a.id!==b.id&&a.hp>0&&revisedZergElite(a)&&a.eliteId==='corruptor.2'&&dist(a,b)<=7+b.unitRadius).sort((a,b)=>a.id-b.id).slice(0,1)){
  const s=zergEliteCombat(guard);if(w.time>=s.redirectAt+1){s.redirectAt=w.time;s.redirectSpent=0;}const share=Math.min(amount*.3,Math.max(0,guard.maxHp*.2-s.redirectSpent),guard.hp);if(share>0){s.redirectSpent+=share;amount-=share;w.hit(guard,share,[],1,sourceOwner,0,1,undefined,false,true);w.visual('support-pulse',guard,b);}
 }}return amount;
}
export function zergEliteDefense(w:World,b:Body){const u=w.entities.get(b.id);if(!u||!revisedZergElite(u))return 0;return u.eliteId==='corruptor.2'?.25:u.eliteId==='ultralisk.2'&&zergEliteCombat(u).boostUntil>w.time?.35:0;}
export function absorbZergEliteBarrier(w:World,u:Entity,amount:number){if(!revisedZergElite(u))return amount;const s=zergEliteCombat(u);if(s.barrierUntil<=w.time)return amount;const n=Math.min(s.barrier,amount);s.barrier-=n;return amount-n;}
export function zergEliteAfterDamage(w:World,u:Entity,attacker:Entity|undefined,actual:number,forced:boolean,transferred:boolean){if(!revisedZergElite(u)||forced||transferred||attacker?.owner===u.owner||actual<=0)return;const s=zergEliteCombat(u);
 if(u.eliteId==='baneling.3')s.stored=Math.min(u.maxHp*2,s.stored+actual*.5);
 if(u.eliteId==='ultralisk.2'){s.stored=Math.min(u.maxHp*.8,s.stored+actual*.4);if(u.hp>0&&u.hp/u.maxHp<=.3&&w.time>=s.ready){const amount=Math.min(s.stored,u.maxHp*.5);s.stored-=amount;heal(w,u,amount);s.ready=w.time+25;s.boostUntil=w.time+5;w.visual('barrier-start',u);}}
 if(u.eliteId==='roach.3'&&u.hp>0&&attacker&&!attacker.flying&&attacker.attackRange<=1.5&&w.time>=s.ready){s.ready=w.time+.5;for(const b of zergEliteEnemies(w,u,u,2,'ground'))w.hit(b,actual*.6,[],1,u.owner,0,1,u.id);w.visual('weapon-area',u);}
}
/** One accepted cycle, frozen before rank/mode/target changes. Derived packets never earn another cycle. */
export function fireZergElite(w:World,u:Entity,target:Body,bonuses:Bonus[],shieldBonus:number,crit:number){if(!revisedZergElite(u))return false;if(!zergEliteCanFire(w,u)||(u.recoveryUntil??0)>w.time)return true;
 const s=zergEliteCombat(u),id=u.eliteId!;s.cycles++;s.lastFire=w.time;
 if(s.target!==target.id){s.target=target.id;s.stacks=0;s.lockAt=w.time;}
 if(id==='zergling.1'){const key=u.pairId??'body:'+u.id,f=w.zergElites.frenzy[key]??{stacks:0,until:0};if(f.until<=w.time)f.stacks=0;f.stacks=Math.min(8,f.stacks+1);f.until=w.time+2;w.zergElites.frenzy[key]=f;}
 let fraction=id==='zergling.2'&&s.cycles%3===0?4:id==='queen.3'?2:1;
 if(id==='roach.2'){if(s.stacks===5){fraction=4;s.stacks=0;}else{s.stacks++;fraction=1+.3*s.stacks;}}
 if(id==='lurker.3'&&s.opening>0){fraction=4;s.opening--;}
 const packet=structuredClone(u);packet.weaponDamage*=fraction;const bonus=bonuses.map(b=>({...b,amount:b.amount*fraction}));
 const shot=(b:Body,f=1,delay=0,primary=true,bounces?:readonly number[],radius=3,offset=0)=>{const from={x:u.x+Math.cos(u.attackFacing)*offset,z:u.z-Math.sin(u.attackFacing)*offset};const p:WeaponFlight={id:w.nextId++,attackId:`${u.id}:${u.shotSequence}`,source:structuredClone(packet),target:b.id,from,point:{...from},lastSeen:{x:b.x,z:b.z},start:w.time+delay,expires:w.time+delay+8,speed:weaponFlightSpeed(u)||56,lost:false,damage:packet.weaponDamage*f,bonuses:bonus.map(b=>({...b,amount:b.amount*f})),shieldBonus:shieldBonus*f*fraction,crit,hits:1,enemyFactor:w.enemyDamageFactor(u),apm:primary&&(talentModifiers(w,u).apmDuplicate??0)>0,hop:0,seen:[],primary};
  if(bounces){p.bounceDamage=bounces.map(n=>packet.weaponDamage*n);p.bounceBonuses=bounces.map(n=>bonus.map(b=>({...b,amount:b.amount*n})));p.bounceLimit=bounces.length;p.bounceRadius=radius;}w.weaponFlights.push(p);};
 if(u.unitType==='baneling'){
  const r=2.2*(id==='baneling.1'?1.8:1),f=id==='baneling.1'?3:id==='baneling.2'?2:1.8,extra=id==='baneling.3'?s.stored:0;s.stored=0;
  const structure=SOURCE_WEAPON_PATTERNS.baneling,upgrade=expeditionWeaponUpgrade(w,u,'VolatileBurstU2');
  for(const b of zergEliteEnemies(w,u,u,r,'ground')){const building=b.attributes.includes('Structure'),damage=building?(structure.structureDamage+upgrade.damage)*expeditionWeaponScale(w,u)*f+extra:packet.weaponDamage*f+extra;
   w.attackHit(packet,b,damage,building?[]:bonus.map(a=>({...a,amount:a.amount*f})),1,0,b.id===target.id,1,{enemyFactor:w.enemyDamageFactor(u),apm:false,ordinary:false,armorPen:building?1-structure.structureArmorReduction:0});}
  if(id==='baneling.2')area(w,u,u,'acid',4,420*eliteFixedGrowth(u.rank),5);
  if(id==='baneling.3')heal(w,u,u.maxHp*.35);
  u.recoveryUntil=w.time+5;u.velocity={x:0,z:0};u.action='idle';u.windup=0;u.pendingTarget=null;u.attackTarget=null;w.effect('explosion',u,u,r,.55);w.visual('baneling-recover',u);return true;
 }
 if(u.unitType==='lurker'){
  if(u.nativeMode!=='lurker_burrowed')return true;const giant=id==='lurker.2'&&s.cycles%4===0,length=giant?18:12,width=giant?2.2:unitData(u).splash[0]?.radius??.5,n=id==='lurker.1'?3:1;
  for(let i=0;i<n;i++){const a=u.attackFacing+(n===3?(i-1)*20*Math.PI/180:0),end={x:u.x+Math.sin(a)*length,z:u.z+Math.cos(a)*length};
   w.zergElites.lines.push({id:w.nextId++,source:structuredClone(packet),from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},facing:a,length,width,progress:0,next:w.time,hits:[],damage:packet.weaponDamage*(giant?5:1),bonuses:bonus.map(v=>({...v,amount:v.amount*(giant?5:1)})),target:target.id,crit,apm:i===Math.floor(n/2)&&(talentModifiers(w,u).apmDuplicate??0)>0,air:false,kind:'spine'});
   const fx=w.effect('hero-line',u,end,width,.65);fx.damage=giant?5:fraction;
  }w.visual('weapon-area',u,target);return true;
 }
 if(u.unitType==='ultralisk'){
  const third=id==='ultralisk.1'&&s.cycles%3===0,r=u.attackRange*(third?1.8:1),arc=third?170:180;
  for(const b of zergEliteEnemies(w,u,u,r+u.unitRadius,'ground'))if(inWeaponArc(u,u.attackFacing,b,r+u.unitRadius,arc))w.attackHit(packet,b,packet.weaponDamage*(third?3:1),bonus.map(v=>({...v,amount:v.amount*(third?3:1)})),1,0,b.id===target.id,crit);
  w.visual('weapon-area',u,target);const fx=w.effect('hero-line',u,{x:u.x+Math.sin(u.attackFacing)*r,z:u.z+Math.cos(u.attackFacing)*r},r,.7);fx.damage=third?3:1;return true;
 }
 if(id==='hydralisk.1'){
  const plane=target.flying?'air':'ground',pool=zergEliteEnemies(w,u,u,u.attackRange+u.unitRadius,plane).filter(b=>inWeaponArc(u,u.attackFacing,b,u.attackRange+u.unitRadius,35));
  for(let i=0;i<5;i++){const a=u.attackFacing+(i-2)*35/4*Math.PI/180;const b=i===2?target:pool.sort((x,y)=>Math.abs(Math.atan2(Math.sin(Math.atan2(x.x-u.x,x.z-u.z)-a),Math.cos(Math.atan2(x.x-u.x,x.z-u.z)-a)))-Math.abs(Math.atan2(Math.sin(Math.atan2(y.x-u.x,y.z-u.z)-a),Math.cos(Math.atan2(y.x-u.x,y.z-u.z)-a)))||x.id-y.id)[0]??target;shot(b,.7,Math.abs(i-2)*.012,i===2,undefined,3,(i-2)*.18);}return true;
 }
 if(id==='mutalisk.1'){shot(target,1,0,true,[1,.8,.65,.5,.4,.3],5);return true;}
 if(id==='mutalisk.2'){for(let i=0;i<3;i++)shot(target,1,i*.08,i===0,[1,.35,.15],3,(i-1)*.25);return true;}
 if(id==='mutalisk.3'){if(!s.episode){s.episode=true;if(s.charge>0){s.barrier=Math.max(s.barrier,u.maxHp*.8*s.charge);s.barrierUntil=w.time+6;teamEntryBarrier(w,u,s.charge);s.charge=0;s.boostUntil=w.time+3;w.visual('barrier-start',u);w.refreshStats(u);}}shot(target,1,0,true,[1,1/3,1/9]);return true;}
 if(weaponFlightSpeed(u)){shot(target);return true;}
 w.attackHit(packet,target,packet.weaponDamage,bonus,unitData(u).attacks,shieldBonus,true,crit);w.effect('shot',u,target,.1,.2);return true;
}
/** Spear / acid burst / venom contacts are applied at the real arrival, never launch. */
export function zergEliteFlightImpact(w:World,p:WeaponFlight,target:Body){const u=p.source;if(!revisedZergElite(u))return false;const id=u.eliteId;
 if(id==='hydralisk.2'){
  const dx=target.x-p.from.x,dz=target.z-p.from.z,d=Math.hypot(dx,dz)||1,a=Math.atan2(dx,dz),primaryAlong=d;
  w.attackHit(u,target,p.damage,p.bonuses,p.hits,p.shieldBonus,true,p.crit,{enemyFactor:p.enemyFactor,apm:p.apm});
  if(primaryAlong<12)w.zergElites.lines.push({id:w.nextId++,source:structuredClone(u),from:{...p.from},point:{...p.point},facing:a,length:12,width:1.2,progress:primaryAlong,next:w.time+.025,hits:[target.id],damage:p.damage*.8,bonuses:p.bonuses.map(a=>({...a,amount:a.amount*.8})),target:target.id,crit:1,apm:false,air:target.flying,kind:'spear'});
  w.visual('projectile-impact',u,target,p.id);w.effect('hero-line',{...u,x:p.from.x,z:p.from.z},{x:p.from.x+Math.sin(a)*12,z:p.from.z+Math.cos(a)*12},.1,.18);return true;
 }
 if(id==='roach.2'&&u.zergEliteCombat!.stacks===0||id==='queen.3'){
  for(const b of zergEliteEnemies(w,u,target,id==='queen.3'?3:2.5,target.flying?'air':'ground')){w.attackHit(u,b,p.damage,p.bonuses,p.hits,p.shieldBonus,b.id===target.id,b.id===target.id?p.crit:1,{enemyFactor:p.enemyFactor,apm:b.id===target.id&&p.apm});if(id==='queen.3'&&b.hp>0){const k=boss(b)?.5:1;debuff(w,u,b,3,{move:.5*k,speed:.3*k});}}
  w.visual('projectile-impact',u,target,p.id);w.visual('weapon-area',u,target);return true;
 }return false;
}
export function zergEliteModeCompleted(w:World,u:Entity,previous:string){if(!revisedZergElite(u)||u.eliteId!=='lurker.3'||previous==='lurker_burrowed'||u.nativeMode!=='lurker_burrowed')return;const s=zergEliteCombat(u);if(w.time<s.modeReady)return;s.modeReady=w.time+12;s.opening=3;s.barrier=u.maxHp*.4;s.barrierUntil=w.time+5;w.visual('barrier-start',u);}
export function zergEliteQueenAbility(w:World,u:Entity){if(!revisedZergElite(u)||u.unitType!=='queen')return false;if(u.eliteId!=='queen.2')return false;const s=zergEliteCombat(u),cost=SOURCE_ABILITIES.transfusion.energy*(1-(talentModifiers(w,u,'transfusion').abilityEnergyReductionPct??0));
 if(w.time<s.ready||u.energy<cost||u.nativeModeUntil||(u.stoppedUntil??0)>w.time)return true;
 const targets=w.allies().filter(p=>eligible(p)&&p.attributes.includes('Biological')&&p.hp<p.maxHp&&dist(u,p)<=8+p.unitRadius&&w.hasAttackLine(u,p)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,5);if(!targets.length)return true;
 u.energy-=cost;s.ready=w.time+12;u.abilityReady=s.ready;u.lastSkillAt=w.time;w.zergElites.heals.push({id:w.nextId++,source:structuredClone(u),targets:targets.map(p=>p.id),amount:240*eliteFixedGrowth(u.rank)*(1+(talentModifiers(w,u,'transfusion').healingPct??0)),next:w.time+.25,until:w.time+4});w.visual('skill-heal',u,targets[0]);return true;
}
export function zergEliteBile(w:World,u:Entity,dt:number){if(!revisedZergElite(u)||u.unitType!=='ravager')return false;u.bileCooldown=Math.max(0,u.bileCooldown-dt);if(!w.expedition.tech.bile||u.bileCooldown>0)return true;
 const targets=zergEliteEnemies(w,u,u,BILE.range,'both').sort((a,b)=>dist(u,a)-dist(u,b)||a.id-b.id),target=targets[0];if(!target){u.bileCooldown=.12;return true;}
 const id=u.eliteId,t=talentModifiers(w,u,'bile'),n=id==='ravager.1'?3:1;u.bileCooldown=(id==='ravager.1'?9:12)*(1-(t.abilityCooldownReductionPct??0));u.lastSkillAt=w.time;
 for(let i=0;i<n;i++)w.zergElites.biles.push({id:w.nextId++,source:structuredClone(u),point:{x:target.x,z:target.z},launchAt:w.time+i*.3,impactAt:w.time+i*.3+BILE.delay,damage:1200*eliteFixedGrowth(u.rank)*(id==='ravager.2'?4:1)*(1+(t.abilityDamagePct??0)),radius:BILE.radius*(id==='ravager.2'?1.5:1),launched:false});return true;
}
/** Burrow and physical charge are bounded state machines. World orders remain intact. */
export function tickZergElite(w:World,u:Entity,dt:number){if(!revisedZergElite(u))return false;const s=zergEliteCombat(u),id=u.eliteId!;
 if(s.barrierUntil<=w.time)s.barrier=0;
 s.stored=Math.min(s.stored,u.maxHp*(id==='baneling.3'?2:.8));
 if(id==='roach.3'&&s.regenUntil>w.time)heal(w,u,u.maxHp*.04*Math.min(dt,s.regenUntil-w.time));
 if(id==='mutalisk.3'){const quiet=w.time-Math.max(u.bornAt,s.lastFire,u.lastDamagedAt??-10);if(quiet>=2){s.episode=false;s.charge=Math.min(1,s.charge+dt/6);}}
 if(id==='roach.1'){
  if(s.burrowPhase===0&&u.hp/u.maxHp<.35&&w.time>=s.burrowReady){s.previousCloak=!!u.cloaked;s.burrowPhase=1;s.burrowAt=w.time;s.burrowUntil=w.time+.6;s.burrowReady=w.time+18;u.windup=0;u.pendingTarget=null;}
  if(s.burrowPhase===1&&w.time>=s.burrowUntil){s.burrowPhase=2;s.burrowAt=w.time;s.burrowUntil=w.time+3;u.cloaked=true;}
  if(s.burrowPhase===2){heal(w,u,u.maxHp*.12*Math.min(dt,Math.max(0,s.burrowUntil-w.time)));if(w.time>=s.burrowUntil){s.burrowPhase=3;s.burrowAt=w.time;s.burrowUntil=w.time+.6;u.cloaked=s.previousCloak;}}
  if(s.burrowPhase===3&&w.time>=s.burrowUntil){s.burrowPhase=0;u.action='idle';}
  if(s.burrowPhase){u.prev={x:u.x,z:u.z};u.velocity={x:0,z:0};u.action='sieging';return true;}
 }
 if(id==='ultralisk.3'){
  if(!s.dash&&w.time>=s.ready&&!(u.stoppedUntil!>w.time)){const target=zergEliteEnemies(w,u,u,6+u.unitRadius,'ground').filter(b=>!b.attributes.includes('Structure')&&w.hasAttackLine(u,b)).sort((a,b)=>dist(u,a)-dist(u,b)||a.id-b.id)[0];if(target){const length=Math.min(6,Math.max(0,dist(u,target)-u.unitRadius-target.unitRadius)),d=dist(u,target)||1;s.ready=w.time+12;s.dash={from:{x:u.x,z:u.z},to:{x:u.x+(target.x-u.x)*length/d,z:u.z+(target.z-u.z)*length/d},target:target.id,travel:0,distance:length};u.windup=0;u.pendingTarget=null;}}
  if(s.dash){const dash=s.dash,before={x:u.x,z:u.z},remaining=dist(u,dash.to),travel=Math.min(remaining,Math.max(8,u.moveSpeed*2.5)*dt),d=remaining||1;const next={x:u.x+(dash.to.x-u.x)*travel/d,z:u.z+(dash.to.z-u.z)*travel/d};const blocked=!clearLine(u,next,u.unitRadius,w.obstacles,w.terrain)||[...w.entities.values()].some(b=>b.id!==u.id&&b.hp>0&&!b.flying&&dist(b,next)<u.unitRadius+b.unitRadius-.03);
   if(!blocked)translate(u,{x:next.x-u.x,z:next.z-u.z},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);dash.travel+=dist(before,u);u.prev=before;u.velocity={x:(u.x-before.x)/dt,z:(u.z-before.z)/dt};u.action='move';u.attackFacing=u.facing=Math.atan2(dash.to.x-u.x,dash.to.z-u.z);
   if(blocked||remaining<=travel+1e-8||dist(before,u)<travel*.5){s.dash=null;s.boostUntil=w.time+6;for(const b of zergEliteEnemies(w,u,u,4,'ground'))w.hit(b,2200*eliteFixedGrowth(u.rank),[],1,u.owner,0,0,u.id);w.visual('strategic-impact',u);w.refreshStats(u);}return true;
  }
 }return false;
}
/** Death propagation consumes a saved source capsule once. Derived capsules cannot propagate again. */
export function zergEliteDeath(w:World,b:Entity){const capsules=w.zergElites.poisons.filter(p=>p.target===b.id&&p.until>w.time);w.zergElites.poisons=w.zergElites.poisons.filter(p=>p.target!==b.id);
 for(const p of capsules){if(!p.spread||boss(b))continue;const u=p.source,remaining=Math.max(0,p.until-w.time);if(remaining<=0)continue;
  if(p.kind==='air'){for(const t of zergEliteEnemies(w,u,b,4.5,'air'))w.hit(t,1800*eliteFixedGrowth(u.rank),[],1,u.owner,0,0,u.id);w.visual('strategic-impact',u,b);}
  const targets=zergEliteEnemies(w,u,b,p.kind==='air'?4.5:4,p.kind==='air'?'air':b.flying?'air':'ground').filter(t=>!boss(t)).sort((a,b)=>dist(a,p.source)-dist(b,p.source)||a.id-b.id).slice(0,p.kind==='air'?3:4);
  for(const t of targets){poison(w,u,t,p.kind,remaining,1,false);w.visual('support-flight',{...u,x:b.x,z:b.z,flying:b.flying},t,p.id);}
 }
}
export function tickZergEliteState(w:World,dt=1/60){const s=w.zergElites;

 s.debuffs=s.debuffs.filter(d=>d.until>w.time&&(w.body(d.target)?.hp??0)>0);for(const [key,f] of Object.entries(s.frenzy))if(f.until<=w.time)delete s.frenzy[key];for(const key of Object.keys(s.gates))if(s.gates[key]<w.time-2)delete s.gates[key];
 for(const b of s.biles){if(w.time>=b.launchAt&&!b.launched){const live=w.entities.get(b.source.id);if(!live||live.hp<=0){b.impactAt=-1;continue;}b.launched=true;w.visual('skill-launch',b.source,b.point,b.id);}if(!b.launched||w.time<b.impactAt||b.impactAt<0)continue;
  for(const t of zergEliteEnemies(w,b.source,b.point,b.radius,'both')){const f=b.source.eliteId==='ravager.2'&&(t.attributes.includes('Armored')||t.attributes.includes('Structure'))?1.5:1;w.hit(t,b.damage*f,[],1,b.source.owner,0,0,b.source.id);if(b.source.eliteId==='ravager.2'&&t.hp>0)debuff(w,b.source,t,5,{armor:.5});}
  w.visual('bile-impact',b.source,b.point,b.id);if(b.source.eliteId==='ravager.3')area(w,b.source,b.point,'rain',4,380*eliteFixedGrowth(b.source.rank),6);b.impactAt=-1;
 }s.biles=s.biles.filter(b=>b.impactAt>=0);
 for(const a of s.areas){while(a.next<=w.time+1e-8&&a.next<=a.until+1e-8){for(const b of zergEliteEnemies(w,a.source,a.point,a.radius,'ground')){const key=a.kind+':'+a.source.id+':'+b.id;if((s.gates[key]??-1)>w.time-1+1e-8)continue;const damage=Math.max(a.damage,...s.areas.filter(other=>other.kind===a.kind&&other.source.id===a.source.id&&other.until>=w.time&&dist(other.point,b)<=other.radius+b.unitRadius).map(o=>o.damage));s.gates[key]=w.time;w.hit(b,damage,[],1,a.source.owner,0,1,a.source.id);if(a.kind==='rain'&&b.hp>0)debuff(w,a.source,b,1.1,{move:boss(b)?.2:.45});}w.visual('skill-dot',a.source,a.point,a.id);a.next+=1;}}
 s.areas=s.areas.filter(a=>a.until>w.time+1e-8);
 for(const l of s.lines){while(l.next<=w.time+1e-8&&l.progress<l.length){const previous={...l.point};l.progress=Math.min(l.length,l.progress+(l.kind==='spear'?1.4:1));l.point={x:l.from.x+Math.sin(l.facing)*l.progress,z:l.from.z+Math.cos(l.facing)*l.progress};if(!clearLine(previous,l.point,0,w.obstacles,w.terrain)&&!l.air){l.progress=l.length;break;}
  for(const b of zergEliteEnemies(w,l.source,l.point,2.5+l.width/2,l.air?'air':'ground')){if(l.hits.includes(b.id))continue;const along=(b.x-l.from.x)*Math.sin(l.facing)+(b.z-l.from.z)*Math.cos(l.facing),across=Math.abs((b.x-l.from.x)*Math.cos(l.facing)-(b.z-l.from.z)*Math.sin(l.facing));if(along>=0&&along<=l.progress+b.unitRadius&&along>=l.progress-1.4-b.unitRadius&&across<=l.width/2+b.unitRadius){l.hits.push(b.id);w.attackHit(l.source,b,l.damage,l.bonuses,1,0,b.id===l.target,l.crit,{enemyFactor:w.enemyDamageFactor(l.source),apm:b.id===l.target&&l.apm});if(l.source.eliteId==='lurker.2'&&l.source.zergEliteCombat!.cycles%4===0&&b.hp>0)debuff(w,l.source,b,2,{move:boss(b)?.3:.6});w.visual('weapon-area',l.source,b,l.id);}}
  l.next+=l.kind==='spear'?.025:.04;
 }}s.lines=s.lines.filter(l=>l.progress<l.length);
 for(const p of [...s.poisons]){const b=w.body(p.target);if(!b||b.hp<=0)continue;while(p.next<=w.time+1e-8&&p.next<=p.until+1e-8&&b.hp>0){w.hit(b,(p.kind==='hydra'?120:260)*eliteFixedGrowth(p.source.rank)*p.layers,[],1,p.source.owner,0,1,p.source.id);w.visual('skill-dot',p.source,b,p.id);p.next+=1;}}
 s.poisons=s.poisons.filter(p=>p.until>w.time+1e-8&&(w.body(p.target)?.hp??0)>0);
 for(const h of s.heals){const live=w.entities.get(h.source.id);if(!live||live.hp<=0){h.until=-1;continue;}while(h.next<=w.time+1e-8&&h.next<=h.until+1e-8){for(const id of h.targets){const b=w.entities.get(id);if(b&&eligible(b)&&b.attributes.includes('Biological')&&dist(live,b)<=8+b.unitRadius&&w.hasAttackLine(live,b)){const gain=Math.min(b.maxHp-b.hp,h.amount*.25*teamHealingFactor(w,b));b.hp+=gain;w.stats.healed+=gain;observeRecovery(w,live,b,gain);recordTeamTransfusion(w,live,b,gain);if(gain>0)w.visual('skill-heal',live,b,h.id);}}h.next+=.25;}}s.heals=s.heals.filter(h=>h.until>w.time+1e-8);
}
/** Explicit retirement/expiry is not a combat death and cannot propagate a capsule. */
export function pruneZergEliteState(w:World){w.zergElites.poisons=w.zergElites.poisons.filter(p=>(w.body(p.target)?.hp??0)>0);w.zergElites.debuffs=w.zergElites.debuffs.filter(d=>(w.body(d.target)?.hp??0)>0);}
export function validateZergEliteCombat(s:ZergEliteCombat){if(!s||typeof s!=='object'||Object.keys(s).length!==24||![s.cycles,s.lastFire,s.stacks,s.stackUntil,s.lockAt,s.stored,s.ready,s.regenUntil,s.burrowAt,s.burrowUntil,s.burrowReady,s.opening,s.modeReady,s.barrier,s.barrierUntil,s.charge,s.boostUntil,s.redirectAt,s.redirectSpent].every(Number.isFinite)||!Number.isSafeInteger(s.cycles)||s.cycles<0||!Number.isInteger(s.stacks)||s.stacks<0||s.stacks>5||![0,1,2,3].includes(s.burrowPhase)||!Number.isInteger(s.opening)||s.opening<0||s.opening>3||s.charge<0||s.charge>1||s.stored<0||s.barrier<0||s.redirectSpent<0||typeof s.previousCloak!=='boolean'||typeof s.episode!=='boolean'||s.target!==null&&(!Number.isSafeInteger(s.target)||s.target<1))throw Error('虫族精英循环无效');
 const d=s.dash;if(d!==null&&(!d||Object.keys(d).length!==5||![d.from?.x,d.from?.z,d.to?.x,d.to?.z,d.travel,d.distance].every(Number.isFinite)||!Number.isSafeInteger(d.target)||d.target<1||d.travel<0||d.distance<0||d.distance>6||d.travel>d.distance+.05))throw Error('虫族冲锋状态无效');
}
export function validateZergEliteRun(s:ZergEliteRun){if(!s||typeof s!=='object'||Object.keys(s).length!==8||!['poisons','areas','biles','heals','lines','debuffs'].every(key=>Array.isArray(s[key as keyof ZergEliteRun]))||!s.frenzy||!s.gates)throw Error('虫族精英状态缺失');
 const ids=new Set<number>();const source=(u:Entity)=>{if(!u||!revisedZergElite(u)||!Number.isSafeInteger(u.id)||u.id<1||!Number.isInteger(u.rank)||u.rank<1||u.rank>5||![u.x,u.z,u.maxHp,u.weaponDamage,u.attackPeriod].every(Number.isFinite)||u.maxHp<=0||u.weaponDamage<0||u.attackPeriod<=0)throw Error('虫族派生来源无效');if(u.zergEliteCombat)validateZergEliteCombat(u.zergEliteCombat);};const id=(n:number)=>{if(!Number.isSafeInteger(n)||n<1||ids.has(n))throw Error('虫族效果收据重复');ids.add(n);};
 for(const f of Object.values(s.frenzy))if(!f||!Number.isInteger(f.stacks)||f.stacks<0||f.stacks>8||!Number.isFinite(f.until))throw Error('双体狂潮状态无效');
 for(const n of Object.values(s.gates))if(!Number.isFinite(n)||n<0)throw Error('腐土命中门无效');
 const keys=new Set<string>();for(const p of s.poisons){id(p.id);source(p.source);const key=p.source.id+':'+p.target+':'+p.kind;if(keys.has(key)||!Number.isSafeInteger(p.target)||p.target<1||!['hydra','air'].includes(p.kind)||p.kind==='hydra'&&p.source.eliteId!=='hydralisk.3'||p.kind==='air'&&p.source.eliteId!=='corruptor.3'||!Number.isInteger(p.layers)||p.layers<1||p.layers>(p.kind==='hydra'?4:1)||typeof p.spread!=='boolean'||![p.next,p.until].every(Number.isFinite)||p.next>p.until+1.001)throw Error('毒囊收据无效');keys.add(key);}
 for(const a of s.areas){id(a.id);source(a.source);if(!['acid','rain'].includes(a.kind)||a.kind==='acid'&&a.source.eliteId!=='baneling.2'||a.kind==='rain'&&a.source.eliteId!=='ravager.3'||![a.point?.x,a.point?.z,a.radius,a.damage,a.next,a.until].every(Number.isFinite)||a.radius!==4||Math.abs(a.damage-(a.kind==='acid'?420:380)*eliteFixedGrowth(a.source.rank))>1e-6||a.next>a.until+1.001)throw Error('腐蚀地面无效');}
 for(const b of s.biles){id(b.id);source(b.source);if(b.source.unitType!=='ravager'||![b.point?.x,b.point?.z,b.launchAt,b.impactAt,b.damage,b.radius].every(Number.isFinite)||b.damage<0||b.radius!==BILE.radius*(b.source.eliteId==='ravager.2'?1.5:1)||Math.abs(b.impactAt-b.launchAt-BILE.delay)>1e-6||typeof b.launched!=='boolean')throw Error('胆汁在途数据无效');}
 for(const h of s.heals){id(h.id);source(h.source);if(h.source.eliteId!=='queen.2'||!Array.isArray(h.targets)||h.targets.length<1||h.targets.length>5||new Set(h.targets).size!==h.targets.length||h.targets.some(n=>!Number.isSafeInteger(n)||n<1)||![h.amount,h.next,h.until].every(Number.isFinite)||h.amount<0||h.next>h.until+1.001)throw Error('输血窗口无效');}
 for(const l of s.lines){id(l.id);source(l.source);if(!['spine','spear'].includes(l.kind)||l.kind==='spine'&&l.source.unitType!=='lurker'||l.kind==='spear'&&l.source.eliteId!=='hydralisk.2'||typeof l.air!=='boolean'||typeof l.apm!=='boolean'||l.air&&l.kind==='spine'||![l.from?.x,l.from?.z,l.point?.x,l.point?.z,l.facing,l.length,l.width,l.progress,l.next,l.damage,l.crit].every(Number.isFinite)||l.progress<0||l.progress>l.length||l.length<0||l.length>18||l.width<=0||l.width>2.2||l.damage<0||!Array.isArray(l.hits)||new Set(l.hits).size!==l.hits.length||l.hits.some(n=>!Number.isSafeInteger(n)||n<1)||!Number.isSafeInteger(l.target)||!Array.isArray(l.bonuses)||l.bonuses.some(b=>typeof b.attribute!=='string'||!Number.isFinite(b.amount)))throw Error('脊刺推进收据无效');const giant=l.kind==='spine'&&l.source.eliteId==='lurker.2'&&l.source.zergEliteCombat!.cycles%4===0,expected=l.source.weaponDamage*(l.kind==='spear'?.8:giant?5:1),width=l.kind==='spear'?1.2:giant?2.2:unitData(l.source).splash[0]?.radius??.5;if(Math.abs(l.damage-expected)>1e-6||l.length!==(giant?18:12)||l.width!==width||Math.hypot(l.point.x-l.from.x-Math.sin(l.facing)*l.progress,l.point.z-l.from.z-Math.cos(l.facing)*l.progress)>1e-5||l.crit<1||l.crit>10)throw Error('脊刺冻结载荷不一致');}
 const ds=new Set<string>();for(const d of s.debuffs){const key=d.source+':'+d.target;if(ds.has(key)||![d.source,d.target].every(n=>Number.isSafeInteger(n)&&n>0)||![d.until,d.armor,d.speed,d.move].every(Number.isFinite)||[d.armor,d.speed,d.move].some(n=>n<0||n>1))throw Error('虫族负面状态无效');ds.add(key);}
}
