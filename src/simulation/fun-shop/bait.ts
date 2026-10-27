import type {World} from '../world';
import {BAIT_CHANCES,newFunShop,type BaitCategory} from './state';
import {startReplacementHorde,hordeCandidates} from '../field-events/hordes';
import {hordeAllowed} from '../progression/fun-availability';
import {encounterCandidates,spawnPacedEncounter,withoutRepeat} from '../field-events/pacing';
import {eventWindowSafe,noteEventAdmission} from '../field-events/event-window';
import type {SpecialType} from '../../data/enemies';

const CATEGORIES:BaitCategory[]=['encounter','elite','horde'];
const LIMITS={encounter:1,elite:2,horde:1},COOLDOWNS={encounter:60,elite:45,horde:60};
export function tickBait(w:World){
 const s=w.funShop,level=s.levels.bait;if(!level||w.diagnosticRun||w.specialStages.active||w.phase!=='battle'||w.paused||w.endless||w.stage<4||w.stage>18)return;
 if(s.bait.stage!==w.stage)s.bait={...newFunShop().bait,stage:w.stage};const b=s.bait;
 // One extra admission in total, including restored shelves with older per-category quotas.
 if(Object.values(b.counts).reduce((sum,n)=>sum+n,0)>=1){for(const key of CATEGORIES)b.pending[key]=false;return;}
 const categories=hordeAllowed(w.difficulty)?CATEGORIES:CATEGORIES.filter(k=>k!=='horde');
 if(!hordeAllowed(w.difficulty))b.pending.horde=false;
 if(w.duration-w.stageElapsed<20){for(const key of CATEGORIES)b.pending[key]=false;return;}
 // The roll is independent of native success and busy gates; only one pending result per category.
 if(w.stageElapsed+1e-8>=b.next){b.next=w.stageElapsed+20;for(const key of categories)if(b.counts[key]<LIMITS[key]&&!b.pending[key]&&w.time>=b.ready[key])b.pending[key]=w.random()<BAIT_CHANCES[key][level];}
 if(!eventWindowSafe(w))return;
 for(const key of categories){
  if(!b.pending[key]||b.counts[key]>=LIMITS[key]||w.time<b.ready[key])continue;
  let spawned=false,eventKey='';
  if(key==='encounter'){
   const pool=withoutRepeat(encounterCandidates(w,true),'encounter',w.fieldEvents.pacing.lastKey);
   if(pool.length){const start=Math.floor(w.random()*pool.length);for(let i=0;i<pool.length&&!spawned;i++){const kind=pool[(start+i)%pool.length];spawned=spawnPacedEncounter(w,kind,true);eventKey='encounter:'+kind;}}
  }else if(key==='elite'){
   const types:SpecialType[]=w.stage<8?['zergling','roach']:w.stage<12?['zergling','roach','hydralisk']:['zergling','roach','hydralisk','mutalisk','ultralisk'];
   const type=types[Math.floor(w.random()*types.length)],unit=w.spawnSpecial(type,'elite');spawned=!!unit;if(unit)w.fieldEvents.pacing.baitElites.push(unit.id);eventKey='elite:'+type;
  }else{const pool=withoutRepeat(hordeCandidates(w),'horde',w.fieldEvents.pacing.lastKey);if(pool.length){const kind=pool[Math.floor(w.random()*pool.length)];spawned=startReplacementHorde(w,kind,true);eventKey='horde:'+kind;}}
  if(spawned){b.pending[key]=false;b.counts[key]++;b.ready[key]=w.time+COOLDOWNS[key];noteEventAdmission(w,eventKey);break;}
  // One failed admission retry per second, without adding a backlog.
  b.ready[key]=w.time+1;
 }
}
