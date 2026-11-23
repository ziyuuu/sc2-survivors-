import {SWARM_PHYSICAL_WEAPONS} from '../../data/zerg-swarm';
import {isExperience} from '../zerg-encounters';
import {distance} from '../movement/steering';
import type {Body,Entity,Point} from '../types';
import type {World} from '../world';
import {swarmFormal,swarmHighest,swarmRank,swarmRoll,tier} from './zerg-swarm-state';
import {spawnSwarmEvent,swarmPart} from './zerg-swarm-spawn';

export interface SwarmAttackOrigin {
 source:number;generation:number;round:number;target:number;formal:boolean;weapon:string;power:number;
}
export function captureSwarmAttack(w:World,u:Entity,target:Body,hits:number){
 if(!w.expedition.zergSwarm||u.team!=='player'||u.race!=='zerg'||w.starship.combat.derivedDepth>0){u.swarmAttack=undefined;return;}
 const weapon=u.unitType==='queen'?u.activeWeapon:
  ({zergling:'Claws',hydralisk:'NeedleSpinesDamage',lurker:'LurkerMP',ultralisk:'KaiserBlades',aberration:'primary-cleave'} as Record<string,string>)[u.unitType];
 u.swarmAttack={source:u.id,generation:u.bornAt,round:u.shotSequence??0,target:target.id,formal:swarmFormal(w,u),weapon:u.unitType+'/'+(weapon??''),power:u.weaponDamage*hits};
}
function normal(u:Entity){
 return u.owner==='zerg'&&!u.enemyTier?.match(/^(boss|lord)$/)&&!u.temporary&&!u.summonKind&&!u.heldBy&&!u.fun
  &&!u.zergSix?.temp&&!u.attributes.includes('Structure')&&!isExperience(u);
}
export function applySwarmSpore(w:World,u:Entity,from?:Point){
 if(!normal(u))return false;
 w.expedition.zergSwarm!.spores[u.id]={generation:u.bornAt,until:w.time+8,applied:w.time,from:from?{x:from.x,z:from.z}:undefined};
 w.visual('support-pulse',u);
 return true;
}
function chance(probability:number,extra:number){return Math.min(.85,probability+extra);}
export function onSwarmResolvedHit(w:World,target:Entity,hit:SwarmAttackOrigin){
 const s=w.expedition.zergSwarm;
 if(!s||target.owner!=='zerg'||target.id!==hit.target)return 0;
 const tag=swarmRank(s,'W07');
 if(hit.formal&&tag)s.tags[target.id]=w.time+1+tag;
 if(!hit.formal||!SWARM_PHYSICAL_WEAPONS.has(hit.weapon)||!normal(target))return 0;
 const white=swarmRank(s,'W03'),blue=swarmRank(s,'B03'),node=swarmRank(s,'N05'),orange=swarmRank(s,'O03');
 if(!white&&!blue&&!node)return 0;
 const previous=s.attackChecks[hit.source];if(previous&&(previous.round===hit.round||w.time<previous.next))return 0;
 const current=s.spores[target.id],marked=current&&current.generation===target.bornAt&&current.until>w.time;
 if(marked){
  current.until=w.time+8;
  if(!blue)return 0;
  let other:Entity|undefined,nearest=Infinity;
  for(const e of w.entities.values()){
   if(e.id===target.id||e.hp<=0||!normal(e))continue;
   const mark=s.spores[e.id];if(mark&&mark.generation===e.bornAt&&mark.until>w.time)continue;
   const range=distance(e,target);
   if(range>4||!w.visibleTo(e,'terran'))continue;
   if(range<nearest||range===nearest&&e.id<other!.id){other=e;nearest=range;}
  }
  if(!other)return 0;
  s.attackChecks[hit.source]={round:hit.round,next:w.time+1};
  if(swarmRoll(s,'spores')<chance(tier(blue,[.2,.3,.4]),orange?.15:0))applySwarmSpore(w,other,target);
 }else{
  s.attackChecks[hit.source]={round:hit.round,next:w.time+1};
  if(swarmRoll(s,'spores')<chance(white?tier(white,[.15,.2,.25]):.15,orange?.15:0))applySwarmSpore(w,target);
 }
 return 0;
}
export function onSwarmEnemyDeath(w:World,u:Entity){
 const s=w.expedition.zergSwarm,mark=s?.spores[u.id];if(!s||!mark)return;
 delete s.spores[u.id];delete s.tags[u.id];
 if(mark.generation!==u.bornAt||mark.until<=w.time||!normal(u)||(s.shared.hatch??0)>w.time)return;
 const white=swarmRank(s,'W03'),blue=swarmRank(s,'B03'),node=swarmRank(s,'N05'),purple=swarmRank(s,'P05'),orange=swarmRank(s,'O03');
 if(swarmRoll(s,'spores')>=chance(.3+Math.max(0,white-1)*.1,orange?.2:0))return;
 const count=1+node,expanded=count+(orange?Math.ceil(count/3):0),highest=swarmHighest(w);
 const cap=Math.min(highest,Math.max(1,white,blue?blue+1:1,node?3:1,purple?purple+3:1));
 const life=Math.max(12,white?10+white*2:0,blue?12+blue*2:0,node?20:0,purple?18+purple*2:0);
 const list=Array.from({length:expanded},()=>{
  let family:'zergling'|'baneling'|'roach'|'mutalisk'='zergling';
  if(blue&&swarmRoll(s,'spores')<chance(tier(blue,[.3,.45,.6]),orange?.2:0)){
   const draw=swarmRoll(s,'spores');family=draw<.5?'baneling':draw<.8?'roach':'mutalisk';
  }
  return swarmPart(family,1,cap,life);
 });
 if(spawnSwarmEvent(w,'spore',list,u).length)s.shared.hatch=w.time+.25;
}
