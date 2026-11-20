import type {BioId} from '../../data/terran-bio';
import type {Body,Entity,Point} from '../types';
import type {World} from '../world';
import {bioFormal,bioRank} from './bio-state';
export interface BioPoison {kind:'venom'|'weak'|'strain'|'spread';source:number;power:number;start:number;next:number;end:number;refreshedAt?:number}
export interface BioMember {
 hostAura?:{damage:number;speed:number};
 role?:'hound'|'twin'|'hatchling'|'mutation'|'overlord'|'cocoon';host?:number;
 transientRate?:number;stableDamageShare?:number;hpFactor?:number;scale?:number;followHp?:number;followDamage?:number;followPeriod?:number;followMove?:number;followArmor?:number;hound?:number;twin?:number;
 houndAt?:number;twinAt?:number;pairReady?:number;seated?:boolean;
 cloudHealAt?:number;lastCombat?:number;focus?:number;focusStart?:number;lastRound?:number;rounds?:number;
 surviveTime?:number;survival?:number;kills?:number;low?:boolean;healFraction?:number;pulseFraction?:number;
 barrier?:number;barrierEnd?:number;barrierReady?:number;pulseReady?:number;
 clotEnd?:number;clotReady?:number;moltEnd?:number;moltReady?:number;shareEnd?:number;shareReady?:number;
 paid?:number;stimEnd?:number;refund?:number;refundEnd?:number;freeStim?:number;
 feedAt?:number;leechSecond?:number;leeched?:number;shareLeeched?:number;hatchAt?:number;
 armorLayers?:{end:number;fraction:number}[];nextArmor?:number;poisons?:BioPoison[];
 plague?:{end:number;source:number}[];nextPlague?:number;strongPlague?:number;
 relayBy?:number;relayAt?:number;relayReady?:number;cloudAt?:number;
 relayRounds?:{sequence:number;target:number;factor:number;end:number}[];
 lastRush?:number;rushEnd?:number;eggReady?:number;
}
export interface BioField extends Point {source:number;kind:'cloud'|'residue';radius:number;power:number;start?:number;next:number;end:number}
export const bioBody=(u:Entity):BioMember=>u.bio??={};
export function bioFormalSeat(w:World,u:Entity){
 const seats=w.expedition.bio!.bodySeats??=[];
 let seat=seats.find(s=>s.host===u.id);
 if(!seat){
  seat=seats.find(s=>s.family===u.unitType&&!(w.entities.get(s.host)?.hp??0)&&!w.expedition.bio!.appointments?.some(a=>a.body.id===s.host)&&!w.starship.life.pending.has(s.host));
  if(seat)seat.host=u.id;else {seat={family:u.unitType,host:u.id,lastRush:u.bio?.lastRush};seats.push(seat);}
 }
 return seat;
}
export const level=(w:World,key:BioId)=>w.expedition?bioRank(w.expedition,key):0;
export function value(w:World,key:BioId,first:number,second:number,third:number){const rank=level(w,key);return rank===3?third:rank===2?second:rank===1?first:0;}
export function bioEligible(w:World,u:Entity){return bioFormal(u)||u.owner==='terran'&&u.bio?.role==='twin'||!!(level(w,'BIO-O01')&&u.heroId&&u.race==='terran'&&u.owner==='terran');}
export const heroPower=(u:Entity)=>u.heroId?1.75:1;
export function reserve(w:World,id:BioId){const stock=w.expedition.bio?.nodeReserves;if(!stock?.[id])return false;stock[id]!--;return true;}
export const isBoss=(b:Body)=>['boss','lord'].includes((b as Entity).enemyTier??'');
export const near=(a:Point,b:Point,r:number)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
export const fleshMachine=(u:Entity)=>u.owner==='terran'&&!u.temporary&&!u.summonKind&&!u.mission&&!u.fun&&!u.heroId&&u.attributes.includes('Mechanical');
export function bioHealingFactor(w:World,u:Entity){
 const suppression=Math.min(.5,Math.max(w.statuses.value(u.id,'bleed',w.time),w.statuses.value(u.id,'corruption',w.time)));
 return 1-suppression*(1-(bioEligible(w,u)?value(w,'BIO-B07',.15,.25,.35)*heroPower(u):0));
}
export const bioMedicalPrimary=(w:World,healer:Entity,patient:Entity)=>patient.attributes.includes(healer.unitType==='science_vessel'?'Mechanical':'Biological')||!!(level(w,'BIO-B04')&&healer.unitType==='medivac'&&fleshMachine(patient));
export function bioStimCost(w:World,u:Entity){const base=u.unitType==='marauder'?20:10;return bioEligible(w,u)&&level(w,'BIO-W04')?Math.max(base*value(w,'BIO-W04',1.5,1.8,2.2),u.maxHp*value(w,'BIO-W04',.075,.09,.11)):base;}
export function bioStimFactor(w:World,u:Entity){return u.stimUntil>w.time?1+(bioEligible(w,u)&&level(w,'BIO-W04')?value(w,'BIO-W04',.65,.75,.85):.5):1;}
export function bioArmorPercent(w:World,u:Entity){
 if(!w.expedition?.bio||!bioEligible(w,u))return 0;
 return heroPower(u)*(value(w,'BIO-B02',.25,.4,.6)*(level(w,'BIO-N01')?1.5:1)+value(w,'BIO-P01',.3,.5,.75)+value(w,'BIO-P02',.02,.03,.04)*(u.bio?.survival??0)+(u.bio?.seated? .5:0));
}
export function bioStats(w:World,u:Entity,fill:boolean){
 if(!w.expedition?.bio||!bioEligible(w,u))return;
 const c=u.bio,p=heroPower(u),giant=(u.unitType==='marine'||u.heroId||level(w,'BIO-N01'))?level(w,'BIO-G03'):0;
 const ratio=u.maxHp?u.hp/u.maxHp:1;
 const hp=(giant?[.2,.35,.5][giant-1]:0)+value(w,'BIO-P01',.4,.65,.9)+(c?.survival??0)*value(w,'BIO-P02',.02,.03,.04)+(c?.kills??0)*.01;
 const attack=(giant?[.1,.18,.25][giant-1]:0)+(c?.survival??0)*value(w,'BIO-P02',.015,.02,.025)+(c?.kills??0)*.005+(c?.low?value(w,'BIO-B06',.1,.15,.2):0);
 bioBody(u).hpFactor=1+hp*p;u.maxHp*=1+hp*p;u.hp=fill?u.maxHp:ratio*u.maxHp;
 u.weaponDamage*=1+p*attack;
 const transientRate=1+(c?.low?p*value(w,'BIO-B06',.15,.22,.30):0)+((c?.shareEnd??0)>w.time?.2:0)+Math.min(4,Math.floor((c?.focus!==undefined?w.time-(c.focusStart??w.time):0)/2))*p*value(w,'BIO-W05',.02,.03,.04);
 bioBody(u).transientRate=transientRate;bioBody(u).stableDamageShare=(1+p*(attack-(c?.low?value(w,'BIO-B06',.1,.15,.2):0)))/(1+p*attack);u.attackPeriod/=transientRate;
 u.moveSpeed*=1+p*value(w,'BIO-W06',.05,.08,.12);
 if(u.attackRange>1.5)u.attackRange+=p*value(w,'BIO-W07',.25,.5,.75);
 if(giant){bioBody(u).scale=1+[.2,.35,.5][giant-1];u.unitRadius*=1+[.1,.15,.2][giant-1];u.movementRadius=u.unitRadius;}
}
export function bioDamageFactor(w:World,u:Entity,direct:boolean,dot:boolean){
 if(!w.expedition?.bio||!bioEligible(w,u))return 1;
 const factor=heroPower(u);
 const clot=direct&&(u.bio?.clotEnd??0)>w.time?factor*value(w,'BIO-W09',.1,.15,.2):0;
 const molt=(u.bio?.moltEnd??0)>w.time?factor*value(w,'BIO-P06',.3,.4,.5):0;
 const resistance=dot?factor*value(w,'BIO-B07',.25,.35,.45):0;
 return Math.max(.3,(1-clot)*(1-molt)*(1-resistance));
}
export function detachBioStats(u:Entity){const f=u.bio?.hpFactor;if(f&&f!==1){u.maxHp/=f;u.hp/=f;u.bio!.hpFactor=1;}}
export function bioFormalScan(w:World){return level(w,'BIO-G04')&&w.allies().some(bioFormal)?1+level(w,'BIO-G04')*.25:1;}
export function bioKnockDistance(w:World,b:Body,length:number){const u=w.entities.get(b.id);return u&&bioEligible(w,u)?length*(1-value(w,'BIO-W06',.1,.2,.3)*heroPower(u)):length;}
export function bioArmorFactor(w:World,target:Body){return 1-((target as Entity).bio?.armorLayers??[]).reduce((a,b)=>a+(b.end>w.time?b.fraction:0),0)*(isBoss(target)?.5:1);}
