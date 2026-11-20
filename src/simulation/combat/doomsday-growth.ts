import {DOOMSDAY_CARD_BY_ID as C} from '../../data/terran-doomsday';
import {rankStats} from '../../data/ranks';
import {eliteStats} from '../../data/elites';
import {formalDoomsdayMember,mechanicalFamily,mechanicalMember,mechanicalRank} from './doomsday-roster';
import {doomsdayCombat} from './doomsday-combat';
import type {World} from '../world';
import type {Entity} from '../types';
import type {UnitType} from '../../data/sc2-units';

export function mechanicalCapBonus(w:World,f?:UnitType){
 const s=w.expedition?.doomsday;if(!s||!f||!mechanicalFamily(w,f))return 0;
 const rank=s.ranks['M-P01']??0;
 return (rank?C['M-P01'].params.cap[rank-1]:0)+(s.ranks['M-N03']?2:0);
}
export function mechanicalMemberCap(w:World,u:Entity){
 const base=u.eliteId?5:w.baseSoldierCap(u.unitType as UnitType);
 if(!formalDoomsdayMember(u)||!mechanicalMember(w,u))return base;
 const p=mechanicalRank(w,u,'M-P01');
 return base+(p?C['M-P01'].params.cap[p-1]:0)+(w.expedition.doomsday?.ranks['M-N03']?2:0);
}
/** Rebuild the rank curve from I and the original cap; never from a modified panel. */
export function mechanicalGrowth(w:World,u:Entity){
 const original=(rank:number)=>u.eliteId?eliteStats(u.eliteId,rank):{...rankStats(rank),movement:1};
 if(!formalDoomsdayMember(u))return original(u.eliteId?u.rank:u.owner==='terran'?u.rank:1);
 const machine=mechanicalMember(w,u),p=machine?mechanicalRank(w,u,'M-P01'):0,n=machine&&!!w.expedition.doomsday?.ranks['M-N03'];
 if(!p&&!n)return original(u.rank);
 const cap=u.eliteId?5:w.baseSoldierCap(u.unitType as UnitType),extra=Math.max(0,u.rank-cap),top=original(Math.min(u.rank,cap)),one=original(1);
 let damage=top.damage*(1+extra*.08),health=top.health*(1+extra*.10);
 if(p){damage=one.damage+1.2*(damage-one.damage);health=one.health+1.2*(health-one.health);}
 if(n&&u.rank>=10){damage*=1.3;health*=1.3;}
 return {...top,rank:u.rank,damage,health};
}
export function grantMechanicalPolarization(w:World,members:Entity[]=w.allies()){
 if(!w.expedition.doomsday?.ranks['M-N03'])return;
 for(const u of members.filter(u=>formalDoomsdayMember(u)&&mechanicalMember(w,u))){
  const s=doomsdayCombat(u);if(s.polarized)continue;s.polarized=true;
  const before=u.rank;u.rank=Math.min(mechanicalMemberCap(w,u),u.rank+2);w.refreshStats(u);if(u.rank>before)w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'promotion'});
 }
}
/** Called after recruit identity is final, so heroes, projections and temporary allies never consume a reserve. */
export function reconcileMechanicalRecruits(w:World){
 const s=w.expedition.doomsday;if(!s?.ranks['M-N03'])return;
 for(const u of w.allies().filter(u=>formalDoomsdayMember(u)&&mechanicalMember(w,u)).sort((a,b)=>a.bornAt-b.bornAt||a.id-b.id)){
  const c=doomsdayCombat(u);if(c.polarized)continue;c.polarized=true;
  const base=Math.max(5,u.rank),cap=mechanicalMemberCap(w,u),extra=(s.nodeReserves['M-N03']??0)>0&&base<cap?1:0;
  u.rank=Math.min(cap,base+extra);if(extra)s.nodeReserves['M-N03']!--;w.refreshStats(u);w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'promotion'});
 }
}
