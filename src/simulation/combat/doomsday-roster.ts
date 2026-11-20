import {armoredDriver} from './doomsday-orange';
import {doomsdayBodyOrderFactor} from './doomsday-refits';
import {grantMechanicalPolarization} from './doomsday-growth';
import {SC2_UNITS,type UnitType} from '../../data/sc2-units';
import {DOOMSDAY_RULES,type DoomsdayId} from '../../data/terran-doomsday';
import {waitingBodySeats} from '../expedition-production';
import {armedFormalReservations} from './armed-support';
import {doomsdayRank,newDoomsdayState,type MechanicalMemberRef} from './doomsday-state';
import type {World} from '../world';
import type {Entity} from '../types';

export const sameMechanicalMember=(ref:MechanicalMemberRef,u:Entity)=>ref.entityId===u.id&&ref.bornAt===u.bornAt;
export function formalDoomsdayMember(u:Entity){return u.team==='player'&&u.race==='terran'&&!u.heroId&&!u.temporary&&!u.summonKind&&!u.mission&&!u.encounter&&!u.fun&&!u.arenaHero&&!u.arenaElite;}
export function mechanicalFamily(w:World,f:UnitType){const d=SC2_UNITS[f];return !!d&&(d.attributes.includes('Mechanical')||d.attributes.includes('Biological')&&doomsdayRank(w.expedition.doomsday,'M-P03')>0);}
export function doomsdayBodyLimit(w:World,f:UnitType){const cap=w.familyMemberCap(f);return w.expedition.build?.main==='doomsday'&&mechanicalFamily(w,f)?Math.max(1,cap-1):cap;}
/** Existing seats, paid bodies, and formal support passengers are disjoint promises. */
export function availableNewBodies(w:World,f:UnitType,excludedPending?:object){const legacy=w.expedition.build?.main==='doomsday'?w.starship.pendingMembers.reduce((n,p)=>n+(p!==excludedPending&&!p.independent&&p.type===f?Math.min(p.count,p.doomsdayLegacyBodies??0):0),0):0;return Math.max(0,doomsdayBodyLimit(w,f)-w.familySeatCount(f)-waitingBodySeats(w,f,f==='zergling'?2:1)-armedFormalReservations(w,f)-legacy);}
export function mechanicalRanks(w:World,u:Entity){
 const s=w.expedition.doomsday;if(!s||!formalDoomsdayMember(u)&&!armoredDriver(w,u))return undefined;
 if(armoredDriver(w,u))return s.ranks;
 return w.expedition.build?.main==='doomsday'?s.veterans.find(ref=>sameMechanicalMember(ref,u))?.ranks??s.ranks:s.ranks;
}
export function mechanicalRank(w:World,u:Entity,id:DoomsdayId){return mechanicalRanks(w,u)?.[id]??0;}
export function mechanicalMember(w:World,u:Entity){return armoredDriver(w,u)||formalDoomsdayMember(u)&&(SC2_UNITS[u.unitType].attributes.includes('Mechanical')||SC2_UNITS[u.unitType].attributes.includes('Biological')&&mechanicalRank(w,u,'M-P03')>0);}
/** Allocation never replaces a survivor or resizes the original family cap. */
export function reconcileMechanicalSeats(w:World,locking=false,previousRanks?:Partial<Record<DoomsdayId,number>>){
 if(w.expedition.build?.main!=='doomsday'||w.specialStages.active)return;
 const s=w.expedition.doomsday??=newDoomsdayState();
 if(previousRanks!==undefined)for(const pending of w.starship.pendingMembers){
  const attributes=SC2_UNITS[pending.type].attributes;
  if(!pending.independent&&(locking||attributes.includes('Biological')&&!attributes.includes('Mechanical')&&!previousRanks['M-P03']))pending.doomsdayLegacyBodies=pending.count;
 }
 const members=[...w.entities.values()].filter(u=>u.hp>0&&formalDoomsdayMember(u)&&mechanicalFamily(w,u.unitType as UnitType));
 const alive=(ref:MechanicalMemberRef)=>members.some(u=>sameMechanicalMember(ref,u));
 s.seats=s.seats.filter(alive);s.veterans=s.veterans.filter(alive);
 const canRefit=locking||w.phase==='reward'&&!w.specialStages.active;
 for(const family of new Set(members.map(u=>u.unitType as UnitType))){
  const familyMembers=members.filter(u=>u.unitType===family).sort((a,b)=>Number(Object.values(s.blueprints??{}).some(p=>p?.host&&sameMechanicalMember(p.host,b)))-Number(Object.values(s.blueprints??{}).some(p=>p?.host&&sameMechanicalMember(p.host,a)))||Number(!!b.eliteId)-Number(!!a.eliteId)||b.rank-a.rank||a.bornAt-b.bornAt||a.id-b.id);
  let free=Math.max(0,doomsdayBodyLimit(w,family)-s.seats.filter(ref=>ref.family===family).length);
  for(const u of familyMembers){
   if(s.seats.some(ref=>sameMechanicalMember(ref,u)))continue;
   const veteran=s.veterans.find(ref=>sameMechanicalMember(ref,u));
   if(free>0&&(!veteran||canRefit)){s.seats.push({entityId:u.id,bornAt:u.bornAt,family});s.veterans=s.veterans.filter(ref=>!sameMechanicalMember(ref,u));free--;w.refreshStats(u);if(veteran)grantMechanicalPolarization(w,[u]);}
   else if(!veteran)s.veterans.push({entityId:u.id,bornAt:u.bornAt,family,ranks:{...(previousRanks??s.ranks)}});
  }
 }
}
export function doomsdayOrderFactor(w:World,f:UnitType,purpose:'body'|'rankTraining'|'tacticalProgress',ordinal=0){
 if(purpose==='body'&&ordinal===0){const orange=doomsdayBodyOrderFactor(w,f);if(orange)return orange;}
 return purpose==='body'&&w.expedition.build?.main==='doomsday'&&mechanicalFamily(w,f)?DOOMSDAY_RULES.bodyTime:1;
}
