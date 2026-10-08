import type {World} from '../../simulation/world';
import type {FamilyId} from '../../data/races';
import {SC2_UNITS} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {HEROES} from '../../data/heroes';
import {pairBodies,pairFor} from '../../simulation/zerg-brood';
import type {UnitSeat} from '../presentation/unit-inspector';
import type {BattleActionId} from '../controls/battle-actions';
export function familyAction(w:World,f:FamilyId):BattleActionId|undefined{
 if(f==='marine'||f==='marauder')return w.upgrades.has('stim')?'stim':undefined;
 if(f==='hellion')return w.expedition.tech['unlock.hellion']?'hellion-mode':undefined;
 if(f==='tank')return 'siege';
 if(f==='viking'||f==='thor'||f==='lurker')return `${f}-mode` as BattleActionId;
 if(f==='banshee')return w.expedition.tech.cloak?'banshee-cloak':undefined;
 if(f==='stalker')return w.expedition.tech.blink?'stalker-blink':undefined;
}
/** Existing members only; paired bodies remain one native roster member. */
export function packedSeats(w:World):UnitSeat[]{
 const result:UnitSeat[]=[],groups=w.expedition.familySlots.map(f=>({family:f,units:w.familyUnits(f),action:familyAction(w,f)}));
 for(const active of [true,false]){
  if(!active)for(const [i,hero]of [...w.heroes.keys()].entries()){const u=w.heroEntity(hero),unit=u&&u.hp>0?u:undefined;result.push({key:'hero:'+i,hero,unit,bodies:unit?[unit]:[],name:HEROES[hero].name,image:'hero.'+hero});}
  const chosen=groups.filter(g=>!!g.action===active),rows=Math.max(0,...chosen.map(g=>g.units.length));
  for(let i=0;i<rows;i++)for(const {family,units}of chosen){const u=units[i];if(!u)continue;const e=u.eliteId&&ELITES[u.eliteId],pair=u.pairId?pairFor(w,u):undefined;
   result.push({key:'entity:'+u.id,family,unit:u,bodies:pair?pairBodies(w,pair):[u],regrowAt:pair?.regrowAt??undefined,name:e?e.name:SC2_UNITS[family].zh,image:e?e.icon:'unit.'+family});
  }
 }
 return result;
}
