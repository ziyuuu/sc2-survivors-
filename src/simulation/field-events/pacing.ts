import type {World} from '../world';
import {encounterAllowed,hordeAllowed} from '../progression/fun-availability';
import {missionCandidates,spawnMission} from '../missions/runtime';
import type {MissionKind} from '../missions/state';
import {ENCOUNTER_KINDS,type EncounterKind} from '../encounters/state';
import {FUN_KINDS,type FunKind} from '../encounters/expanded-state';
import {canSpawnFun,spawnFunEncounter} from '../encounters/expanded';
import {spawnEncounter} from '../encounters/runtime';
import {legalHordeKinds,startReplacementHorde} from './hordes';
import {TAVERN_MULTIPLIERS} from '../fun-shop/state';
import type {EventCategory,HordeKind} from './state';
import {eventWindowSafe,noteEventAdmission,observeEventWindow} from './event-window';

export const naturalEventChance=(stage:number)=>stage<4||stage>18?0:stage<=6?.6:stage<=12?.7:.8;
export const eventCategoryWeights=(tavern:number)=>({mission:45*TAVERN_MULTIPLIERS[tavern],encounter:35,horde:20});
export function encounterCandidates(w:World,bait=false):(EncounterKind|FunKind)[]{
 const s=w.encounters;
 const base=ENCOUNTER_KINDS.filter(k=>encounterAllowed(w.difficulty,k)&&!s.active&&!s.expanded.short&&(bait||!s.used.has(k))&&(k==='gentle'?w.stage>=7:w.starship.enabled&&!!w.starship.account.run&&!w.starship.account.run.ended));
 return [...base,...FUN_KINDS.filter(k=>canSpawnFun(w,k,bait))];
}
export function spawnPacedEncounter(w:World,kind:EncounterKind|FunKind,bait=false){return (ENCOUNTER_KINDS as readonly string[]).includes(kind)?spawnEncounter(w,kind as EncounterKind,bait):spawnFunEncounter(w,kind as FunKind,undefined,bait);}
export function withoutRepeat<T extends string>(pool:readonly T[],category:EventCategory,last:string){const other=pool.filter(k=>category+':'+k!==last);return other.length?other:[...pool];}
export function tickEventPacing(w:World){
 if(w.specialStages.active||w.phase!=='battle'||w.paused)return;
 observeEventWindow(w);
 const p=w.fieldEvents.pacing;
 if(p.stage!==w.stage){p.stage=w.stage;p.rolled=false;p.pending=false;p.started=false;p.choice=null;p.next=20;}
 if(w.diagnosticRun||!w.missionAutoEnabled||w.endless||!naturalEventChance(w.stage)||w.stageElapsed<20)return;
 if(!p.rolled){p.rolled=true;p.pending=w.random()<naturalEventChance(w.stage);}
 if(!p.pending||p.started||w.stageElapsed+1e-8<p.next)return;
 if(w.duration-w.stageElapsed<20){p.pending=false;p.choice=null;return;}
 p.next=w.stageElapsed+1;
 if(!eventWindowSafe(w))return;
 const pools:Record<EventCategory,string[]>={mission:w.missions.enabled?missionCandidates(w):[],encounter:w.encounters.enabled?encounterCandidates(w):[],horde:w.replacementWindowSafe()?legalHordeKinds(w.stage):[]};
 if(!p.choice){
  const weights=eventCategoryWeights(w.funShop.levels.tavern),categories=(['mission','encounter','horde'] as const).filter(k=>pools[k].length);
  if(!categories.length)return;
  let roll=w.random()*categories.reduce((sum,k)=>sum+weights[k],0),category:EventCategory=categories.at(-1)!;
  for(const k of categories){roll-=weights[k];if(roll<0){category=k;break;}}
  const kinds=withoutRepeat(pools[category],category,p.lastKey);p.choice={category,kind:kinds[Math.floor(w.random()*kinds.length)]};
 }
 const {category,kind}=p.choice;
 // Keep the original category lottery: a difficulty-locked horde opportunity
 // expires once, without rerolling it into extra missions or encounters.
 if(category==='horde'&&!hordeAllowed(w.difficulty)){p.pending=false;p.choice=null;return;}
 // Keep one selection while waiting for placement; never bank another event.
 if(!pools[category].includes(kind))return;
 const success=category==='mission'?spawnMission(w,kind as MissionKind):category==='encounter'?spawnPacedEncounter(w,kind as EncounterKind|FunKind):startReplacementHorde(w,kind as HordeKind);
 if(success){p.started=true;p.pending=false;noteEventAdmission(w,category+':'+kind);}
}
