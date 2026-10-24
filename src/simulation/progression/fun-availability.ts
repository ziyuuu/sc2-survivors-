import type {Difficulty} from '../../data/stages';
import type {MissionKind} from '../missions/state';
import type {EncounterKind} from '../encounters/state';
import type {FunKind} from '../encounters/expanded-state';
import type {SpecialStageKind} from '../special-stages/state';

// Content eligibility only: existing stage, roster, placement and safety gates still apply.
const level:Record<Difficulty,number>={easy:0,normal:1,hard:2,hell:2};
export const MISSION_DIFFICULTY:Record<MissionKind,Difficulty>={repair:'easy',hives:'easy',escort:'normal',intel:'normal',rescue:'normal',eggs:'hard',fleet:'hard'};
export const ENCOUNTER_DIFFICULTY:Record<EncounterKind|FunKind,Difficulty>={golden:'easy',giant:'easy',gentle:'normal',whitePack:'normal',flyingRoaches:'normal',devourer:'hard',cruelQueen:'hard',infectedTerrans:'hard',corruptedProtoss:'hard',parasites:'hard'};
export const SPECIAL_DIFFICULTY:Record<SpecialStageKind,Difficulty>={resources:'easy',dodge:'easy',crossing:'normal',arena:'hard'};
export const missionAllowed=(difficulty:Difficulty,kind:MissionKind)=>level[difficulty]>=level[MISSION_DIFFICULTY[kind]];
export const encounterAllowed=(difficulty:Difficulty,kind:EncounterKind|FunKind)=>level[difficulty]>=level[ENCOUNTER_DIFFICULTY[kind]];
export const specialAllowed=(difficulty:Difficulty,kind:SpecialStageKind)=>level[difficulty]>=level[SPECIAL_DIFFICULTY[kind]];
export const hordeAllowed=(difficulty:Difficulty)=>level[difficulty]>=2;
export const funDifficultyDescription=(difficulty:Difficulty)=>difficulty==='easy'
 ?'趣味内容：修复建筑、消灭虫巢；黄金工蜂、巨型蟑螂；资源关与毒爆弹幕。不出现独立虫群事件。'
 :difficulty==='normal'
 ?'趣味内容：在简单基础上增加护送、情报、营救；温顺雷兽、白色虫群、飞行蟑螂；增加横穿虫群关。不出现独立虫群事件。'
 :'趣味内容：全部任务、特殊遭遇、四类独立虫群和四种特殊关，仍须满足关段与队伍条件。';
