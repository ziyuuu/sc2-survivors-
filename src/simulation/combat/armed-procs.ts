import {ARMED_CARD_BY_ID as C,ARMED_RULES} from '../../data/terran-armed-support';
import type {ArmedId} from '../progression/build-progress';
import type {World} from '../world';
import type {Entity} from '../types';
import {armedFormalFree} from './armed-support';
export const ARMED_ATTACK_PROCS:readonly ArmedId[]=['W01','W02','W04','W05','W06','W07','W08','W09','G01','G02','G04','G05','G06','G09','B02','B03','B04','B05','B06','B07','B08','B09','P01','P02','P03','P04','P05','P06','O02','O03'];
export function armedProcChance(id:ArmedId){return ARMED_RULES.procChance[C[id].quality];}
export function armedProcCooling(w:World,id:ArmedId){const a=w.expedition.support.armed;if(!a)return true;if(w.tick<(a.readyTick[id]??0)&&!(C[id].purchase==='reserve'&&(a.reserves[id]??0)>0))return true;const u=w.expedition.support.unique;return id==='G02'?u.bunkerReady>w.time:id==='B07'?u.missilesReady>w.time:id==='B09'?u.ready>w.time:false;}
function conditions(w:World,id:ArmedId){const a=w.expedition.support.armed!;
 if(id==='W02'&&!w.expedition.familySlots.some(f=>armedFormalFree(w,f)>0))return false;
 if(id==='G03'&&!a.losses.length)return false;
 if(id==='W06'&&!w.allies().some(u=>u.hp<u.maxHp&&u.attributes.includes('Biological')&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<=C.W06.params.search))return false;
 if(id==='G09'&&![...w.allies(),...w.fortifications.values()].some(u=>u.hp<u.maxHp&&u.attributes.includes('Mechanical')&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<=C.G09.params.range))return false;
 if(id==='B06'&&![...w.entities.values()].some(e=>e.owner==='zerg'&&e.hp>0&&e.flying&&w.visibleTo(e,'terran')))return false;
 if(id==='O03'&&(!a.hold||w.tick-a.hold.sinceTick<C.O03.params.holdTime*60))return false;
 if(C[id].purchase==='reserve'&&w.allies().some(u=>u.armed?.cardId===id))return false;
 return true;
}
function roll(w:World,id:ArmedId){const a=w.expedition.support.armed!,p=a.procs??={pending:{},cycles:{}};if(!a.ranks[id]||armedProcCooling(w,id)||!conditions(w,id)||(p.pending[id]??-1)>=w.tick||a.deployments.some(d=>d.cardId===id&&d.phase!=='ended'))return;if(w.random()<armedProcChance(id))p.pending[id]=w.tick+30;}
/** One saved opportunity per real formal weapon cycle. Idle fixed steps never roll. */
export function recordArmedAttackProc(w:World,u:Entity){const a=w.expedition.support.armed;if(!a||!Object.keys(a.ranks).length||u.team!=='player'||u.temporary||u.summonKind||u.fun||u.encounter||u.mission||u.arenaHero||u.arenaElite||w.starship.projections.has(u.id)||w.starship.members.get(u.id)?.independent)return;
 const p=a.procs??={pending:{},cycles:{}};const cycle=u.shotSequence??0;if(p.cycles[u.id]===cycle)return;p.cycles[u.id]=cycle;
 for(const id of ARMED_ATTACK_PROCS)roll(w,id);
}
/** Real damage can also awaken defensive support when hidden enemies prevent firing. */
export function recordArmedDamageProc(w:World,u:Entity){if(u.team!=='player'||u.temporary||u.summonKind||!w.expedition.support.armed)return;for(const id of ['W06','W08','G09','P04'] as const)roll(w,id);}
/** Called after the deduplicated real formal-loss receipt has been recorded. */
export function recordArmedLossProc(w:World){roll(w,'G03');}
export function hasArmedProc(w:World,id:ArmedId){return (w.expedition.support.armed?.procs?.pending[id]??-1)>=w.tick;}
/** Consume the opportunity before attempting a cast; a blocked cast spends no CD. */
export function takeArmedProc(w:World,id:ArmedId){const p=w.expedition.support.armed?.procs;if(!p||(p.pending[id]??-1)<w.tick)return false;delete p.pending[id];return true;}
export function armedOrderSeconds(w:World,seconds:number,baseSeconds=seconds){const rank=w.expedition.support.armed?.ranks.W03??0,p=C.W03.params;if(!rank||w.tick<(w.expedition.support.armed!.readyTick.W03??0)||w.random()>=p.chance[rank-1])return seconds;w.expedition.support.armed!.readyTick.W03=w.tick+Math.ceil(p.cd*60);return Math.min(seconds,Math.max(seconds*p.timeFactor[rank-1],baseSeconds*p.floor));}
