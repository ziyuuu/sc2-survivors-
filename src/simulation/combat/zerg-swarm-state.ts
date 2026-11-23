import {isZswId,ZERG_SWARM_BY_ID,type ZswCardId,type ZswShort} from '../../data/zerg-swarm';
import {FAMILIES_BY_RACE,type FamilyId} from '../../data/races';
import {HERO_IDS_BY_RACE,type HeroId} from '../../data/heroes';
import type {EliteId} from '../../data/elites';
import type {Entity,Point} from '../types';
import type {World} from '../world';
import {equipmentUnitTotals} from '../starship/runtime';
import {identityFactors} from '../starship/attributes';

const zergFamilies=new Set<FamilyId>(FAMILIES_BY_RACE.zerg),zergHeroIds=new Set<HeroId>(HERO_IDS_BY_RACE.zerg);

export interface SwarmBody {
 origin:string;baseLife:number;expires:number;oneUse?:boolean;
 mature?:{health:number;damage:number};birth?:{until:number;attack:number;move:number};
 rush?:{until:number;move:number};hunt?:{target:number;started:number;last:number;round:number};
}
export interface SwarmPart {
 family:FamilyId;count:number;width:1|2;cap:number;life:number;rank?:number;elite?:EliteId;
 energy?:number;weapon?:number;skill?:number;ability?:number;bile?:number;mode?:Entity['nativeMode'];six?:{ready?:number;shellReady?:number};
}
interface SwarmClock {period:number;next:number;first:boolean;batch?:number}
export interface SwarmBatch {
 id:number;source:string;createdAt:number;at:number;point:Point;recipe:SwarmPart[];original:SwarmPart[];root:boolean;
 first?:number;released:number;shock?:{point:Point;radius:number;power:number};rank:number;
}
export interface ZergSwarmState {
 version:1|2;ranks:Partial<Record<ZswCardId,number>>;
 purchases:{offerId:string;id:ZswCardId;rank:number}[];
 rng:Record<'offers'|'spawn'|'spores'|'revival',number>;
 clocks:Record<string,SwarmClock>;nextBatch:number;batches:SwarmBatch[];
 expanded:number[];overflowCursor:number;splitCursor:number;echoCount:number;echoCursor:number;
 landings?:{source:string;batch:number;index:number;point:Point;createdAt:number;at:number}[];
 spores:Record<number,{generation:number;until:number;applied?:number;from?:Point}>;
 attackChecks:Record<number,{round:number;next:number}>;
 tags:Record<number,number>;nearby:Record<number,{until:number;count:number}>;shells:Record<number,{birth?:{remaining:number;until:number};loss?:{remaining:number;until:number}}>;
 shared:Record<string,number>;
 groupArmor:Record<number,{until:number;factor:number}>;
 revivals:Record<number,{at:number;seat:string;health:number;energy:number;body:Entity}>;
 seatClocks:Record<string,{revive:number;split:number}>;
 delivery?:{job:number;at:number;seats:number};
 exitNydus?:{id:number;point:Point;createdAt:number;until:number};
 twin?:{hero?:import('../../data/heroes').HeroId;body?:number;next?:number;energy?:number};
}
export function newZergSwarmState(seed:number):ZergSwarmState{
 return {version:2,ranks:{},purchases:[],rng:{offers:(seed^0x61ac65ff)>>>0,spawn:(seed^0x14395510)>>>0,
  spores:(seed^0x31bf1346)>>>0,revival:(seed^0x087215ab)>>>0},clocks:{},nextBatch:1,batches:[],
  expanded:[],overflowCursor:0,splitCursor:0,echoCount:0,echoCursor:0,spores:{},attackChecks:{},tags:{},nearby:{},shells:{},
  shared:{},groupArmor:{},revivals:{},seatClocks:{}};
}
export const swarmRank=(s:ZergSwarmState|undefined,short:ZswShort)=>s?.ranks['ZSW-'+short as ZswCardId]??0;
export const tier=(r:number,values:readonly number[])=>values[Math.max(0,r-1)];
export function swarmRoll(s:ZergSwarmState,stream:keyof ZergSwarmState['rng']){
 s.rng[stream]=(Math.imul(s.rng[stream],1664525)+1013904223)>>>0;
 return s.rng[stream]/4294967296;
}
export function swarmFormal(w:World,u:Entity){
 return u.team==='player'&&!u.heroId&&!u.temporary&&!u.summonKind&&!u.zergSix?.temp&&!u.heldBy
  &&!u.mission&&!u.encounter&&!w.starship.members.get(u.id)?.independent&&!w.starship.captured.has(u.id)
  &&w.expedition.familySlots.includes(u.unitType as FamilyId);
}
export const swarmUnlocked=(w:World,f:FamilyId)=>(w.expedition.tech['unlock.'+f]??0)>0;
export function swarmHighest(w:World){
 const s=w.expedition.zergSwarm;let rank=1;
 for(const u of w.entities.values())if(swarmFormal(w,u)&&u.hp>0)rank=Math.max(rank,u.rank);
 for(const row of Object.values(s?.revivals??{}))rank=Math.max(rank,row.body.rank);
 for(const recovery of w.starship.life.pending.values())if(recovery.source!=='failed'&&swarmFormal(w,recovery.body))rank=Math.max(rank,recovery.body.rank);
 for(const window of w.zergHeroes.revivals)if(window.charges&&window.until>w.time)for(const seat of window.seats)if(!seat.claimed&&seat.deadAt!==null)for(const u of seat.members)if(swarmFormal(w,u))rank=Math.max(rank,u.rank);
 return rank;
}
export const swarmProductionFactor=(s:ZergSwarmState|undefined)=>[1,.85,.75,.65][swarmRank(s,'W01')];
export function swarmNativeRound(w:World,u:Entity,hits:number){
 if(!w.starship.enabled)return u.weaponDamage*hits;
 const gear=equipmentUnitTotals(w,u),shot=w.starship.attacks.get(u);
 const native=shot?.nativeDamage??u.weaponDamage*(1+gear.native);
 return (native*hits+gear.dps*identityFactors(u).dps*u.attackPeriod)*(1+gear.attack);
}
export const swarmLifespan=(s:ZergSwarmState,base:number)=>Math.min(60,base*(1+.25*swarmRank(s,'N08')));
export function swarmSlots(s:ZergSwarmState|undefined,base:number){return swarmRank(s,'O02')?Math.max(6,base):base;}
export function swarmFamilyExtra(s:ZergSwarmState|undefined,index:number){
 return s?.expanded.includes(index)?1+swarmRank(s,'N04'):0;
}
export function validateZergSwarmState(s:ZergSwarmState|undefined,race:string){
 if(s===undefined)return;
 if(race!=='zerg'||(s.version!==1&&s.version!==2)||!s.ranks||!Array.isArray(s.expanded)||s.expanded.length>3
  ||new Set(s.expanded).size!==s.expanded.length||s.expanded.some(i=>!Number.isInteger(i)||i<0||i>4)
  ||!Array.isArray(s.purchases)||new Set(s.purchases.map(p=>p.offerId)).size!==s.purchases.length
  ||s.purchases.some(p=>!p.offerId||!isZswId(p.id)||p.rank<1||p.rank>(s.ranks[p.id]??0))
  ||!Array.isArray(s.batches)||s.batches.length>100||!s.rng||Object.values(s.rng).some(n=>!Number.isInteger(n)||n<0||n>0xffffffff)
  ||!s.clocks||!s.shared||!s.shells||!s.spores||!s.tags||!s.revivals||!s.seatClocks)throw Error('虫群增殖状态无效');
 for(const [id,r] of Object.entries(s.ranks))if(!isZswId(id)||!Number.isInteger(r)||r<1||r>ZERG_SWARM_BY_ID[id].maxRank)throw Error('虫群增殖卡牌档位无效');
 if(Object.keys(s.ranks).filter(id=>id.startsWith('ZSW-O')).length>1)throw Error('虫群增殖橙节点冲突');
 for(const c of Object.values(s.clocks))if(!Number.isFinite(c.period)||c.period<=0||!Number.isFinite(c.next)||c.next<0)throw Error('虫群增殖冷却无效');
 const valid=(n:number)=>Number.isFinite(n)&&n>=0;
 if(Object.values(s.shared).some(n=>!valid(n)))throw Error('虫群共享状态无效');
 for(const [key,limit] of [['hero:zagara:kills',20],['hero:dehaka:essence',1000000]] as const){
  const value=s.shared[key];if(value!==undefined&&(!Number.isSafeInteger(value)||value>limit))throw Error('虫群英雄成长无效');
 }
 if(!Number.isSafeInteger(s.nextBatch)||s.nextBatch<1||new Set(s.batches.map(b=>b.id)).size!==s.batches.length
  ||s.batches.some(b=>!Number.isSafeInteger(b.id)||b.id<1||b.id>=s.nextBatch||!valid(b.createdAt)||!valid(b.at)||b.at<b.createdAt
   ||![b.point?.x,b.point?.z].every(Number.isFinite)||!Number.isSafeInteger(b.released)||b.released<0
   ||![b.recipe,b.original].every(parts=>Array.isArray(parts)&&parts.length>0&&parts.every(p=>p&&zergFamilies.has(p.family)
    &&Number.isSafeInteger(p.count)&&p.count>=0&&p.count<=90&&[1,2].includes(p.width)&&valid(p.life)&&p.life>0&&valid(p.cap)))))
  throw Error('虫群增殖投放批次无效');
 if(s.landings&&(!Array.isArray(s.landings)||s.landings.length>400||s.landings.some(l=>!l||typeof l.source!=='string'||![l.point?.x,l.point?.z,l.at,l.createdAt].every(Number.isFinite)||l.at<l.createdAt||!Number.isSafeInteger(l.batch)||!Number.isSafeInteger(l.index))))throw Error('虫群落点无效');
 if(s.ranks['ZSW-N04']&&!s.ranks['ZSW-B01']||s.expanded.length>(s.ranks['ZSW-B01']??0)
  ||s.delivery&&(!Number.isSafeInteger(s.delivery.job)||!valid(s.delivery.at)||![2,3,4].includes(s.delivery.seats))
  ||s.twin&&(!s.ranks['ZSW-O01']||s.twin.hero&&!zergHeroIds.has(s.twin.hero)||s.twin.next!==undefined&&!valid(s.twin.next)))
  throw Error('虫群增殖编制或交付无效');
}
export function validateSwarmBody(u:Entity){
 const b=u.zergSwarm;
 if(b&&(!u.temporary||u.owner!=='terran'||u.temporaryKind!=='zerg-swarm'||!Number.isFinite(b.baseLife)||b.baseLife<=0
  ||!Number.isFinite(b.expires)||b.expires<=u.bornAt||u.heroId))throw Error('虫群增殖临时兵身份无效');
}
