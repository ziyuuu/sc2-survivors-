import type {World} from '../world';
import type {Body,Entity} from '../types';
import {swarmFormal} from './zerg-swarm-state';
import {movementRadius} from '../movement/steering';

function member(w:World,u:Entity){
 return u.team==='player'&&u.race==='zerg'&&!u.zergSix?.temp&&!u.summonKind&&!u.attributes.includes('Structure')
  &&!u.mission&&!u.encounter&&!!(u.heroId||u.zergSwarm||swarmFormal(w,u));
}
export function swarmSize(w:World,u:Entity){
 const ranks=w.expedition.zergSwarm?.ranks;
 if(!ranks||!member(w,u))return 1;
 const green=ranks['ZSW-G08']??0,node=ranks['ZSW-N07']??0;
 return 1-(green?(.05+.05*green):0)-.05*node;
}
export function swarmContactScale(w:World,u:Entity){
 const ranks=w.expedition.zergSwarm?.ranks;
 if(!ranks||!member(w,u))return 1;
 const blue=ranks['ZSW-B09']??0;
 return 1-(blue?(.05+.15*blue):0)-.05*(ranks['ZSW-N07']??0);
}
export function swarmPasses(w:World,u:Entity){
 const rank=w.expedition.zergSwarm?.ranks['ZSW-N07'];
 return !!rank&&member(w,u)&&rank>=(u.heroId?3:u.zergSwarm?1:2);
}
const mobile=(b:Body):b is Entity=>'velocity' in b&&!b.attributes.includes('Structure')&&!b.heldBy&&!(b as Entity).mission&&!(b as Entity).encounter;
export function swarmCanCross(w:World,a:Entity,b:Body){
 return a.flying===b.flying&&mobile(b)&&swarmPasses(w,a);
}
export function swarmIgnoresPair(w:World,a:Body,b:Body){
 if(!w.expedition.zergSwarm?.ranks['ZSW-N07']||!mobile(a)||!mobile(b)||a.flying!==b.flying)return false;
 const moving=(u:Entity)=>u.action!=='dead'&&Math.hypot(u.x-u.prev.x,u.z-u.prev.z)>.0001&&swarmPasses(w,u);
 return moving(a)||moving(b);
}
export function swarmContactSpan(w:World,a:Body,b:Body,radius:(body:Body)=>number=movementRadius){
 const ranks=w.expedition.zergSwarm?.ranks;
 if((!ranks?.['ZSW-B09']&&!ranks?.['ZSW-N07'])||!mobile(a)||!mobile(b))return radius(a)+radius(b);
 return radius(a)*swarmContactScale(w,a)+radius(b)*swarmContactScale(w,b);
}
