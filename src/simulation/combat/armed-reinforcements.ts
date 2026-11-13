import {armedCounterLoss} from './armed-counterattack';
import {recordArmedLossProc} from './armed-procs';
import {detonateArmedRaider} from './armed-raiders';
import {armedQueueHandoff} from './armed-nodes';
import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import {ELITES,type EliteId} from '../../data/elites';
import {RUNTIME_ASSETS} from '../../assets/runtime.generated';
import {isSupportCombatType,type FamilyId} from '../../data/races';
import {armedRank} from '../progression/build-progress';
import {worldContent} from '../progression/run-content';
import {isG02Bunker} from './armed-origins';
import {tauntArmed} from './armed-fortifications';
import {equipmentCardDamage} from '../starship/card-effects';
import type {ArmedPassenger} from './armed-support-state';
import type {World} from '../world';
import type {Entity} from '../types';

const models=new Set(RUNTIME_ASSETS.filter(a=>a.status==='available').map(a=>a.id));
export function armedElitePool(family:FamilyId,planned?:readonly EliteId[]){const pool=Object.values(ELITES).filter(e=>e.family===family&&models.has('model.'+e.model)),selected=planned?pool.filter(e=>planned.includes(e.id)):[];return selected.length?selected:pool;}
export function prepareArmedPassengers(w:World,passengers:ArmedPassenger[]){
 if(!armedRank(w.expedition.support,'N03'))return;
 const a=w.expedition.support.armed!,p=ARMED_CARD_BY_ID.N03.params;
 for(const passenger of passengers){if(passenger.eliteId||isSupportCombatType(passenger.family))continue;const pool=armedElitePool(passenger.family as FamilyId,worldContent(w)?.elites);if(!pool.length)continue;const reserve=(a.nodeReserves.N03??0)>0;if(!reserve&&w.random()>=p.chance)continue;if(reserve)a.nodeReserves.N03!--;passenger.eliteId=pool[Math.min(pool.length-1,Math.floor(w.random()*pool.length))].id;}
}
export function armedTemporaryUsed(w:World){const living=[...w.entities.values()].filter(u=>u.team==='player'&&u.temporary&&!u.heroId&&!['P02','O02'].includes(u.armed?.cardId??'')&&u.hp>0).length,waiting=w.expedition.support.armed?.deployments.reduce((n,d)=>n+(d.phase==='ended'||['P02','O02'].includes(d.cardId)?0:d.passengers.filter(p=>!p.formal&&p.entityId===null&&!p.cancelled).length),0)??0;return living+waiting;}
export function applyArmedPassenger(w:World,u:Entity,p:ArmedPassenger,cardId:import('../progression/build-progress').ArmedId,castId:number,deploymentId:number){
 u.armed={cardId,castId,deploymentId,hpFactor:p.hpFactor??1,blockadeExit:w.expedition.support.armed?.deployments.find(d=>d.id===deploymentId)?.blockadeExit};if(p.eliteId){u.eliteId=p.eliteId;u.modelKey=ELITES[p.eliteId].model;u.specialReady=w.time+15;}
 if(!p.formal){u.temporary=true;u.temporaryKind='armed';u.temporaryUntil=(w.tick+p.lifeTicks)/60;}w.refreshStats(u,true);
 if(cardId==='B08'){u.mode='siege';u.modeTimer=0;w.refreshStats(u,true);}
 if(cardId==='O02'&&u.unitType==='tank'){u.mode=u.eliteId==='tank.2'?'siege':'tank';w.refreshStats(u,true);}
 if(cardId==='P02'||cardId==='O02'&&u.unitType==='thor')tauntArmed(w,u,ARMED_CARD_BY_ID.P02.params.tauntRadius,ARMED_CARD_BY_ID.P02.params.taunt);
 armedQueueHandoff(w,u);
 if(cardId==='B03'&&w.terrain){const from=w.freePosition(p.family as FamilyId,u,2,3.5);if(from){const to={x:u.x,z:u.z};u.x=from.x;u.z=from.z;u.prev={...from};u.cliffTransit={kind:'jump',from,to,startedAt:w.time,until:w.time+.5};u.cliffReadyAt=w.time+1.75;u.facing=Math.atan2(to.x-from.x,to.z-from.z);u.pendingTarget=null;u.attackTarget=null;u.action='move';}}
}
export function armedMemberStats(u:Entity){const id=u.armed?.cardId,titan=id==='P02'||id==='O02'&&u.unitType==='thor';return {damage:titan?ARMED_CARD_BY_ID.P02.params.weapon:1,frequency:1,armor:titan?ARMED_CARD_BY_ID.P02.params.armor:0};}
export function armedMemberDeath(w:World,u:Entity){detonateArmedRaider(w,u);}
export function recordArmedFormalDeath(w:World,u:Entity,forced:boolean){
 const a=w.expedition.support.armed;if(!a||forced||u.team!=='player'||u.heroId||u.temporary||u.summonKind||u.fun||u.encounter||u.mission||u.arenaHero||u.arenaElite||w.starship.projections.has(u.id)||w.starship.members.get(u.id)?.independent||!w.expedition.familySlots.includes(u.unitType as FamilyId))return;
 const receipt=`${u.id}:${u.bornAt}`;if(a.deathReceipts.includes(receipt))return;a.deathReceipts.push(receipt);a.losses.push({entityId:u.id,generation:u.bornAt,family:u.unitType as FamilyId,rank:u.rank,tick:w.tick});if(a.losses.length>2)a.losses.shift();recordArmedLossProc(w);armedCounterLoss(w,a.losses.at(-1)!);
}
/** Runs after original Pod delivery/retirement and support-fort expiry. */
export function tickArmedCarrierCrew(w:World){
 const a=w.expedition.support.armed;if(!a||!armedRank(w.expedition.support,'N02')||w.phase!=='battle'||w.paused||w.requiresPlayerDecision||w.expedition.race!=='terran'||w.specialStages.active||w.missions.fleet.ceasefire)return;
 const sources:{key:string;id:number;x:number;z:number;landTick:number}[]=[];
 for(const pod of w.pods)if(pod.owner==='terran'&&(pod.race??w.expedition.race)==='terran'&&pod.hp>0&&['active','opening'].includes(pod.status))sources.push({key:`pod:${pod.id}:${pod.landedAt}`,id:pod.id,x:pod.x,z:pod.z,landTick:Math.round(pod.landedAt*60)});
 for(const d of a.deployments)if(['W02','W05','B05'].includes(d.cardId)&&d.phase==='active'&&d.hp>0&&w.tick<d.endTick)sources.push({key:`deployment:${d.id}`,id:d.id,...d.point,landTick:d.landTick});
 for(const f of w.fortifications.values())if(isG02Bunker(f,armedRank(w.expedition.support,'G02'))&&w.time<f.supportUntil!&&f.hp>0)sources.push({key:`bunker:${f.id}`,id:f.id,x:f.x,z:f.z,landTick:f.supportOrigin?.landTick??Math.round((f.supportUntil!-30)*60)});
 const live=new Set(sources.map(s=>s.key));for(const key of Object.keys(a.crewSources))if(!live.has(key))delete a.crewSources[key];
 const p=ARMED_CARD_BY_ID.N02.params;
 for(const source of sources){const clock=a.crewSources[source.key]??={nextTick:source.landTick+Math.ceil(p.first*60),castId:a.nextCast++};if(w.tick<clock.nextTick||armedTemporaryUsed(w)>=(armedRank(w.expedition.support,'N03')?24:18))continue;
  const point=w.freePosition('marine',source,1.6,7);if(!point)continue;const families=['marine','reaper','marauder'] as const,family=families[Math.min(2,Math.floor(w.random()*3))],passenger:ArmedPassenger={family,rank:1,formal:false,exitTick:w.tick,lifeTicks:p.randomLife*60,entityId:null,cancelled:false};prepareArmedPassengers(w,[passenger]);clock.nextTick=w.tick+Math.ceil(p.interval*60);
  clock.lastExitTick=w.tick;const deployment=a.deployments.find(d=>d.id===source.id);if(deployment)deployment.lastExitTick=w.tick;const fort=w.fortifications.get(source.id);if(fort)fort.lastExitTick=w.tick;const u=w.addUnit(family,'terran',point.x,point.z,1);applyArmedPassenger(w,u,passenger,'N02',clock.castId,source.id);w.visual('pod-open',{...u,id:source.id},source,clock.castId);
 }
}
