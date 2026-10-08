import type {World} from '../../src/simulation/world';
import type {UnitSeat} from '../../src/ui/presentation/unit-inspector';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {ELITES} from '../../src/data/elites';
import {HEROES} from '../../src/data/heroes';
import {familyAction} from './console-model';

/** Pack only actual units; ordinary manual-skill families precede heroes and passive families. */
export function liveSeats(w:World):UnitSeat[]{
 const groups=w.expedition.familySlots.map(family=>({family,units:w.familyUnits(family),action:familyAction(w,family)})),result:UnitSeat[]=[];
 const heroes=[...w.heroes.keys()].map((hero,i)=>{const unit=w.heroEntity(hero);return {key:'hero:'+i,hero,unit:unit&&unit.hp>0?unit:undefined,bodies:unit&&unit.hp>0?[unit]:[],name:HEROES[hero].name,image:'hero.'+hero} satisfies UnitSeat;});
 for(const active of [true,false]){
  if(!active)result.push(...heroes);
  const selected=groups.filter(g=>!!g.action===active),rows=Math.max(0,...selected.map(g=>g.units.length));
  for(let i=0;i<rows;i++)for(const {family,units}of selected){
   const unit=units[i];if(!unit)continue;const elite=unit.eliteId&&ELITES[unit.eliteId];
   result.push({key:'entity:'+unit.id,family,unit,bodies:[unit],name:elite?elite.name:SC2_UNITS[family].zh,image:elite?elite.icon:'unit.'+family});
  }
 }
 return result;
}
