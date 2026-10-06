import {protossEliteFlightImpact} from './protoss-elite-runtime';
import {isTerranEliteId} from '../../data/terran-elites';
import {isZergEliteId} from '../../data/zerg-elites';
import {zergEliteFlightImpact} from './zerg-elite-runtime';
import {eliteFlightImpact,revisedElite} from './terran-elite-runtime';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {SOURCE_WEAPON_PATTERNS} from '../../data/expansion-units';
import {expeditionWeaponScale,expeditionWeaponUpgrade,talentModifiers,unitData} from './expedition-combat';
import {eliteEffect} from './expedition-elites';

type Bonus={attribute:string;amount:number};
/** Immutable attack payload. Entity is a plain DTO, never a live reference or Three object. */
export interface WeaponFlight {
 primary?:boolean;id:number;attackId:string;source:Entity;target:number;from:Point;point:Point;lastSeen:Point;
 start:number;expires:number;speed:number;lost:boolean;damage:number;bonuses:Bonus[];hits:number;
 shieldBonus:number;crit:number;enemyFactor:number;apm:boolean;hop:number;seen:number[];
 bounceDamage?:number[];bounceBonuses?:Bonus[][];bounceLimit?:number;bounceRadius?:number;
}
export function weaponFlightSpeed(u:Pick<Entity,'unitType'|'heroId'|'nativeMode'|'activeWeapon'|'summonKind'> & Partial<Pick<Entity,'eliteId'|'team'>>):number {
 if(u.summonKind)return 0;
 if(u.heroId)return u.heroId==='yamato_battlecruiser'?56:['tosh','zagara','stukov','niadra','fenix','hots_leviathan'].includes(u.heroId)?26.25:0;
 if(u.team==='player'&&isTerranEliteId(u.eliteId)){if(u.unitType==='tank')return 32;if(['marine','reaper'].includes(u.unitType)||u.unitType==='thor'&&u.activeWeapon!=='JavelinMissileLaunchers'&&u.activeWeapon!=='ThorHighImpactPayload')return 52;if(u.unitType==='viking'&&u.nativeMode==='viking_assault')return 39.2;}
 if(u.unitType==='thor')return u.activeWeapon==='JavelinMissileLaunchers'?28:0;
 if(u.unitType==='viking')return u.nativeMode==='viking_assault'?0:39.2;
 if(u.unitType==='marauder')return 28;
 if(['hydralisk','queen','phoenix'].includes(u.unitType))return 56;
 if(u.unitType==='banshee')return 70;
 return ['roach','ravager','mutalisk','corruptor','adept','stalker','high_templar'].includes(u.unitType)?26.25:0;
}
export function launchWeaponFlight(w:World,u:Entity,target:Body,bonuses:Bonus[],shieldBonus:number,crit:number,hitsOverride?:number,primary=true){
 const speed=weaponFlightSpeed(u);if(!speed)return false;
 const p:WeaponFlight={primary,id:w.nextId++,attackId:`${u.id}:${u.shotSequence}`,source:structuredClone(u),target:target.id,
  from:{x:u.x,z:u.z},point:{x:u.x,z:u.z},lastSeen:{x:target.x,z:target.z},start:w.time,expires:w.time+8,speed,lost:false,
  damage:u.weaponDamage,bonuses:bonuses.map(b=>({...b})),hits:hitsOverride??unitData(u).attacks,shieldBonus,crit,enemyFactor:w.enemyDamageFactor(u),apm:(talentModifiers(w,u).apmDuplicate??0)>0,hop:0,seen:[]};
 if(!u.heroId&&u.unitType==='thor')p.hits=SOURCE_WEAPON_PATTERNS.thorExplosive.shots;
 if(!u.heroId&&u.unitType==='mutalisk'){
  const pattern=SOURCE_WEAPON_PATTERNS.mutalisk,scale=expeditionWeaponScale(w,u);
  p.bounceDamage=pattern.damage.map((damage,i)=>(damage+expeditionWeaponUpgrade(w,u,`GlaiveWurmU${i+1}`).damage)*scale*(i?eliteEffect(u,'secondaryBounceDamageMultiplier'):1));
  p.bounceBonuses=pattern.damage.map((damage,i)=>bonuses.map(b=>({...b,amount:b.amount*damage/pattern.damage[0]*(i?eliteEffect(u,'secondaryBounceDamageMultiplier'):1)})));
  p.damage=p.bounceDamage[0]*(target.attributes.includes('Light')?eliteEffect(u,'firstBounceLightDamageMultiplier'):1);p.hits=1;
 }
 w.weaponFlights.push(p);return true;
}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function resolve(w:World,p:WeaponFlight,target:Body){
 const u=p.source;if(eliteFlightImpact(w,p,target)||zergEliteFlightImpact(w,p,target)||protossEliteFlightImpact(w,p,target))return;
 w.attackHit(u,target,p.damage,p.bonuses,p.hits,p.shieldBonus,(p.primary??true)&&p.hop===0,p.hop===0?p.crit:1,{enemyFactor:p.enemyFactor,apm:p.apm});
 w.visual('projectile-impact',u,target,p.id);
 if(!u.heroId&&!revisedElite(u)&&u.unitType==='thor'){
  const bands=SOURCE_WEAPON_PATTERNS.thorExplosive.bands;
  w.hash.query(target,2,b=>{if(b.id===target.id||b.hp<=0||b.owner===u.owner||!b.flying&&(!('unitType' in b)||b.unitType!=='colossus'))return;
   const band=bands.find(band=>distance(b,target)<=band.radius+b.unitRadius);if(band)w.attackHit(u,b,p.damage*band.fraction,p.bonuses.map(b=>({...b,amount:b.amount*band.fraction})),p.hits,0,false,1,{enemyFactor:p.enemyFactor,apm:false});});
 }
 const splash=u.heroId==='fenix'?{r:1.1,n:3,f:.35}:u.heroId==='stukov'?{r:.8,n:2,f:.3}:null;
 if(splash){const candidates:Body[]=[];w.hash.query(target,splash.r+3,b=>{if(b.id!==target.id&&b.hp>0&&b.owner!==u.owner&&b.flying===target.flying&&distance(b,target)<=splash.r+b.unitRadius&&w.hasAttackLine(u,b))candidates.push(b);});
  for(const b of candidates.sort((a,b)=>distance(a,target)-distance(b,target)||a.id-b.id).slice(0,splash.n))w.attackHit(u,b,p.damage*splash.f,p.bonuses.map(b=>({...b,amount:b.amount*splash.f})),1,0,false,1,{enemyFactor:p.enemyFactor,apm:false});
 }
}
/** One authoritative arrival per packet. Loss of visibility is irreversible for this flight. */
export function tickWeaponFlights(w:World,dt:number){
 const pending:WeaponFlight[]=[];
 for(const p of w.weaponFlights){
  if(w.time>=p.expires)continue;if(w.time<p.start){pending.push(p);continue;}
  const target=w.body(p.target),live=!!target&&target.hp>0&&!p.lost&&w.visibleTo(target,p.source.owner);
  if(live)p.lastSeen={x:target.x,z:target.z};else p.lost=true;
  const d=distance(p.point,p.lastSeen),travel=p.speed*dt;
  if(d>travel+1e-8){p.point={x:p.point.x+(p.lastSeen.x-p.point.x)*travel/d,z:p.point.z+(p.lastSeen.z-p.point.z)*travel/d};pending.push(p);continue;}
  p.point={...p.lastSeen};
  if(!live||!target||w.terrain&&!w.terrain.lineOfFire(p.from,target,p.source.flying,target.flying))continue;
  resolve(w,p,target);
  if(p.bounceDamage&&p.hop+1<(p.bounceLimit??SOURCE_WEAPON_PATTERNS.mutalisk.maxTargets)){
   p.seen.push(target.id);const candidates:Body[]=[];
   const radius=p.bounceRadius??SOURCE_WEAPON_PATTERNS.mutalisk.bounceRadius;w.hash.query(target,radius+3,b=>{if(b.hp>0&&b.owner!==p.source.owner&&!p.seen.includes(b.id)&&w.visibleTo(b,p.source.owner)&&distance(b,target)<=radius+b.unitRadius&&(!w.terrain||w.terrain.lineOfFire(target,b,p.source.flying,b.flying)))candidates.push(b);});
   const next=candidates.sort((a,b)=>distance(a,target)-distance(b,target)||a.id-b.id)[0];
   if(next){p.hop++;p.target=next.id;p.from={...p.point};p.start=w.time;p.lastSeen={x:next.x,z:next.z};p.damage=p.bounceDamage[p.hop];p.bonuses=p.bounceBonuses![p.hop];pending.push(p);}
  }
 }
 w.weaponFlights=pending;
}
export function validateWeaponFlights(flights:WeaponFlight[]){
 for(const p of flights){
  const extended=p?.bounceLimit!==undefined||p?.bounceRadius!==undefined;
  if(extended){const id=p.source?.eliteId,allowed=p.source?.team==='player'&&!p.source.heroId&&isZergEliteId(id)&&p.source.unitType==='mutalisk';const fractions=id==='mutalisk.1'?[1,.8,.65,.5,.4,.3]:id==='mutalisk.2'?[1,.35,.15]:[1,1/3,1/9];
   if(!allowed||p.bounceLimit!==fractions.length||p.bounceRadius!==(id==='mutalisk.1'?5:3)||!p.bounceDamage||p.bounceDamage.length!==fractions.length||!p.bounceBonuses||p.bounceBonuses.length!==fractions.length||p.bounceDamage.some((n,i)=>!Number.isFinite(n)||Math.abs(n-p.source.weaponDamage*fractions[i])>1e-6)||p.hop<0||p.hop>=fractions.length||p.seen.length!==p.hop||new Set(p.seen).size!==p.seen.length||p.seen.some(id=>!Number.isSafeInteger(id)||id<1)||Math.abs(p.damage-p.bounceDamage[p.hop])>1e-6)throw Error('刃虫弹射收据无效');
  }
  if(p?.bounceDamage&&(!Array.isArray(p.bounceDamage)||p.bounceDamage.some(n=>!Number.isFinite(n)||n<0)||!p.bounceBonuses||p.bounceBonuses.some(bs=>!Array.isArray(bs)||bs.some(b=>typeof b.attribute!=='string'||!Number.isFinite(b.amount)))))throw Error('弹射载荷无效');
 }
 const ids=new Set<number>();for(const p of flights){if(!p||p.primary!==undefined&&typeof p.primary!=='boolean'||!Number.isSafeInteger(p.id)||ids.has(p.id)||!p.source||!Number.isSafeInteger(p.source.id)||!Number.isSafeInteger(p.target)||typeof p.attackId!=='string'||!['terran','zerg'].includes(p.source.owner)||![p.start,p.expires,p.speed,p.damage,p.crit,p.enemyFactor,p.point?.x,p.point?.z,p.from?.x,p.from?.z,p.lastSeen?.x,p.lastSeen?.z].every(Number.isFinite)||p.speed<=0||p.damage<0||p.expires<p.start||!Number.isInteger(p.hits)||p.hits<1||typeof p.lost!=='boolean'||typeof p.apm!=='boolean'||!Array.isArray(p.seen)||!Array.isArray(p.bonuses)||p.bonuses.some(b=>typeof b.attribute!=='string'||!Number.isFinite(b.amount))||!Number.isInteger(p.hop)||p.hop<0||p.hop>=(p.bounceLimit??3))throw Error('在途武器数据无效');ids.add(p.id);}
}
