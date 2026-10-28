import type {Race} from '../data/races';
import type {Difficulty} from '../data/stages';
import {RESCUE_PRESENTATION} from '../data/economy';
import {campaign18StageConfig} from '../data/campaign18';
import {missionAllowed,encounterAllowed} from '../simulation/progression/fun-availability';
import {FUN_MIN_STAGE} from '../simulation/encounters/expanded-state';

export interface BattleSceneScope {
 race:Race;difficulty:Difficulty;stage:number;endless?:boolean;
 /** Restored/live bodies win over prediction, including an already spawned site. */
 bodyModels?:Iterable<string>;hasHive?:boolean;
}
const facilities={terran:['barracks','factory','starport'],zerg:['hatchery'],protoss:['gateway','robotics','stargate']} as const;
const buildings=new Set(['command_center','nexus','mission.tower',...Object.values(facilities).flat()]);
const deathModels=new Set<string>(Object.values(facilities).flat());
const workers=new Set(['scv','drone','probe']);

/** Rendering-only closure. No RNG or World mutations; future content is prepared
 * by the existing entrance gate before its first eligible battle. */
export function battleScenePreload(scope:BattleSceneScope){
 const bodies=new Set<string>();
 if(!scope.endless&&scope.stage>=4){
  if(missionAllowed(scope.difficulty,'repair'))for(const key of facilities[scope.race])bodies.add(key);
  if(missionAllowed(scope.difficulty,'hives'))bodies.add('hatchery');
  if(missionAllowed(scope.difficulty,'escort')){
   bodies.add(RESCUE_PRESENTATION[scope.race].workerModel);
   bodies.add(scope.race==='terran'?'command_center':scope.race==='zerg'?'hatchery':'nexus');
  }
  // Hard-mode eggs can rescue workers of ANY race. The corrupted Protoss site
  // uses a gateway even when the player's own race is Terran or Zerg.
  if(missionAllowed(scope.difficulty,'eggs'))for(const key of workers)bodies.add(key);
  if(missionAllowed(scope.difficulty,'fleet'))bodies.add('mission.tower');
  if(scope.stage>=FUN_MIN_STAGE.corruptedProtoss&&encounterAllowed(scope.difficulty,'corruptedProtoss'))bodies.add('gateway');
 }
 for(const model of scope.bodyModels??[])bodies.add(model==='hive'?'hatchery':model);
 const reserves=scope.endless?null:campaign18StageConfig(Math.max(1,Math.min(18,scope.stage)),scope.difficulty).reserves;
 return {workers:[...bodies].filter(k=>workers.has(k)),buildings:[...bodies].filter(k=>buildings.has(k)),deaths:[...bodies].filter(k=>deathModels.has(k)),hive:!!scope.hasHive||!!reserves&&(reserves.mainHive>0||reserves.expansionHive>0)};
}
