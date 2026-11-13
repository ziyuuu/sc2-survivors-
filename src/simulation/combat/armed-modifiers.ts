import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import {armedRank,type ArmedId} from '../progression/build-progress';
import type {World} from '../world';
const virtual=new Set<ArmedId>(['W01','W04','B01','B04','B07','P01','P06']);
/** Consume a node reserve at the successful batch boundary, never per projectile. */
export function armedFireModifiers(w:World,id:ArmedId){
 const a=w.expedition.support.armed,p=ARMED_CARD_BY_ID.N01.params,dense=!!a&&virtual.has(id)&&armedRank(w.expedition.support,'N01')>0,reserve=dense&&(a.nodeReserves.N01??0)>0;
 if(reserve)a!.nodeReserves.N01!--;
 return {dense,damage:dense?p.damage*(reserve?p.reserveDamage:1):1,radius:dense?id==='W01'?p.podRadius:p.radius:1,interval:(ticks:number)=>dense?Math.ceil(ticks/p.speed):ticks};
}
