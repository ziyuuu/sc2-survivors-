import {rankStats} from './ranks';
import {campaign18ChapterGrowth,campaign18EnemyPressure} from './campaign18';
import type {Difficulty} from './stages';
import {continuousOrdinaryGrowth,continuousEndlessGrowth} from './enemy-tuning';
export type EnemyOrigin='regular'|'swarm'|'special';
export function ordinaryEnemyRank(stage:number,endlessRound?:number){return endlessRound?3:stage<=6?1:stage<=12?2:3;}
/** Spawn-only profile. Specials retain their approved independent chapter path. */
export function enemySpawnGrowth(difficulty:Difficulty,stage:number,origin:EnemyOrigin,endlessRound?:number,progress=endlessRound?1:(stage-1)/18,endlessSeconds=endlessRound?(endlessRound-1)*60:0){
 if(origin==='swarm')return {rank:1,health:1,damage:1,attackSpeed:1,armor:0,move:1};
 if(difficulty!=='easy'&&origin==='regular')return {rank:ordinaryEnemyRank(stage,endlessRound),...continuousOrdinaryGrowth(difficulty,progress,endlessSeconds)};
 const pressure=campaign18EnemyPressure(difficulty,stage),rank=ordinaryEnemyRank(stage,endlessRound),r=rankStats(rank),scale=difficulty==='easy'?.5:1;
 const growth=origin==='special'?{...campaign18ChapterGrowth(difficulty,stage),armor:0}:{health:1+(r.health-1)*scale,damage:1+(r.damage-1)*scale,attackSpeed:1+(r.attackSpeed-1)*scale,armor:r.armor*scale};
 const early=origin==='regular'&&!endlessRound&&stage<=6?(difficulty==='easy'?.8:difficulty==='normal'?.9:1):1;
 const g=continuousEndlessGrowth(endlessSeconds);
 return {rank:origin==='special'?1:rank,health:growth.health*pressure.health*early*g.health,damage:growth.damage*pressure.damage*g.damage,attackSpeed:growth.attackSpeed*pressure.attackSpeed*g.attackSpeed,armor:growth.armor,move:pressure.moveSpeed};
}
