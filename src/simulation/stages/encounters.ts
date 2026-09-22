import {stageConfig,type Difficulty} from '../../data/stages';
import {ZERG} from '../../data/sc2-units';
/** Compatibility for diagnostics: encounter budgets never depend on the squad. */
export const ambientCount=(count:number,_allies?:unknown)=>count;
export const rescueEnemies=(stage:number,_allies?:unknown,difficulty:Difficulty='normal')=>ZERG.flatMap(t=>Array(stageConfig(stage,difficulty).guards[t]).fill(t));
