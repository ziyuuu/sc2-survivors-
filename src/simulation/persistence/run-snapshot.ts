import type {RunData} from './run-fields';
import type {CombatStatus} from '../combat/statuses';
import type {EnemySpecialsSnapshot} from '../combat/enemy-specials';
import type {Race} from '../../data/races';
import type {Difficulty} from '../../data/stages';
import type {FrozenTalentAllocation} from '../progression/permanent-profile';
export const RUN_SCHEMA=6;
export const RUN_RULES='mvp-1.0' as const;
export interface RunConfig {
 rulesId:typeof RUN_RULES;race:Race;difficulty:Difficulty;campaignId:'campaign-18';
 seed:number;mapId:'campaign-kairos-v1';mapHash:string;frozenTalents:FrozenTalentAllocation;
}
export interface RunSnapshot {
 schema:6;rules:typeof RUN_RULES;config:RunConfig;map:string;seed:number;autoWaves:boolean;sandbox:boolean;
 state:RunData;statuses:{serial:number;entries:CombatStatus[]};specials:EnemySpecialsSnapshot;
}
