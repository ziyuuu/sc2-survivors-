import {MVP_RULES} from '../../data/races';
import type {CampaignMapRecipe} from '../../data/campaign-map';
import type {RunData} from './run-fields';
import type {CombatStatus} from '../combat/statuses';
import type {EnemySpecialsSnapshot} from '../combat/enemy-specials';
import type {Race} from '../../data/races';
import type {Difficulty} from '../../data/stages';
import type {FrozenTalentAllocation} from '../progression/permanent-profile';
export const RUN_SCHEMA=26;
export const RUN_RULES=MVP_RULES;
export interface RunConfig {
 rulesId:typeof RUN_RULES;race:Race;difficulty:Difficulty;campaignId:'campaign-18';
 seed:number;mapId:'campaign-kairos-v1'|'campaign-five-v3';campaignMap?:CampaignMapRecipe;mapHash:string;frozenTalents:FrozenTalentAllocation;
}
export interface RunSnapshot {
 schema:typeof RUN_SCHEMA;rules:typeof RUN_RULES;config:RunConfig;map:string;seed:number;autoWaves:boolean;sandbox:boolean;
 state:RunData;statuses:{serial:number;entries:CombatStatus[]};specials:EnemySpecialsSnapshot;
}
