import type {World} from '../../simulation/world';
import {MISSION_NAMES} from '../../simulation/missions/runtime';
import type {MissionKind} from '../../simulation/missions/state';
import {esc} from '../presentation/reference-primitives';
export type TaskEntry={id:string;name:string;objective:string};
const objectives:Record<MissionKind,string>={
 escort:'护送农民安全返回基地。',repair:'守住废弃建筑，直到修复完成。',intel:'靠近情报书，收集战场情报。',
 rescue:'跟随求救信号，保护被围困的精英。',hives:'摧毁虫巢群，清除这片区域的威胁。',eggs:'击破虫卵，解救被困的农民。',fleet:'清理信号塔守军，靠近塔台发出呼叫。'
};
/** Only actual missions appear in the task tracker. Encounters and challenges use the scene. */
export function taskEntries(w:World):TaskEntry[]{
 if(w.phase!=='battle'||w.specialStages.active)return [];
 const m=w.missions.active;
 return m?[{id:m.id,name:MISSION_NAMES[m.kind],objective:objectives[m.kind]}]:[];
}
export function randomMissionMarkup(w:World){return taskEntries(w).map(t=>'<div class="battle-task" data-task="'+esc(t.id)+'"><strong>'+esc(t.name)+'</strong><p>'+esc(t.objective)+'</p></div>').join('');}
