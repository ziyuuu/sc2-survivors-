import {campaign18ChapterGrowth,campaign18EnemyPressure} from './campaign18';
import type {Difficulty} from './stages';
import {continuousOrdinaryGrowth,continuousEndlessGrowth} from './enemy-tuning';
export type EnemyOrigin='regular'|'swarm'|'special';
export function ordinaryEnemyRank(stage:number,endlessRound?:number){return endlessRound?3:stage<=6?1:stage<=12?2:3;}
/** Spawn-only profile. Specials retain their approved independent chapter path. */
export function enemySpawnGrowth(difficulty:Difficulty,stage:number,origin:EnemyOrigin,endlessRound?:number,progress=endlessRound?1:(stage-1)/18,endlessSeconds=endlessRound?(endlessRound-1)*60:0){
 if(origin==='swarm')return {rank:1,health:1,damage:1,attackSpeed:1,armor:0,move:1};
 if(origin==='regular'){const rank=ordinaryEnemyRank(stage,endlessRound),growth=continuousOrdinaryGrowth(difficulty,progress,endlessSeconds);return {rank,...growth,armor:difficulty==='easy'?rankStats(rank).armor*.5:growth.armor};}
 const pressure=campaign18EnemyPressure(difficulty,stage),growth={...campaign18ChapterGrowth(difficulty,stage),armor:0};
 const g=continuousEndlessGrowth(endlessSeconds);
 return {rank:1,health:growth.health*pressure.health*g.health,damage:growth.damage*pressure.damage*g.damage,attackSpeed:growth.attackSpeed*pressure.attackSpeed*g.attackSpeed,armor:growth.armor,move:pressure.moveSpeed};
}
import {rankStats} from './ranks';
