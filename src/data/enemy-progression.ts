import {rankStats} from './ranks';
import {campaign18ChapterGrowth,campaign18EnemyPressure} from './campaign18';
import type {Difficulty} from './stages';
export type EnemyOrigin='regular'|'swarm'|'special';
export function ordinaryEnemyRank(stage:number,endlessRound?:number){return endlessRound?Math.min(5,3+Math.floor((endlessRound-1)/2)):stage<=6?1:stage<=12?2:3;}
/** Spawn-only profile. Specials retain their approved independent chapter path. */
export function enemySpawnGrowth(difficulty:Difficulty,stage:number,origin:EnemyOrigin,endlessRound?:number){
 if(origin==='swarm')return {rank:1,health:1,damage:1,attackSpeed:1,armor:0,move:1};
 const pressure=campaign18EnemyPressure(difficulty,stage),rank=ordinaryEnemyRank(stage,endlessRound),r=rankStats(rank),scale=difficulty==='easy'?.5:1;
 const growth=origin==='special'?{...campaign18ChapterGrowth(difficulty,stage),armor:0}:{health:1+(r.health-1)*scale,damage:1+(r.damage-1)*scale,attackSpeed:1+(r.attackSpeed-1)*scale,armor:r.armor*scale};
 const early=origin==='regular'&&!endlessRound&&stage<=6?(difficulty==='easy'?.8:difficulty==='normal'?.9:1):1;
 return {rank:origin==='special'?1:rank,health:growth.health*pressure.health*early,damage:growth.damage*pressure.damage,attackSpeed:growth.attackSpeed*pressure.attackSpeed,armor:growth.armor,move:pressure.moveSpeed};
}
