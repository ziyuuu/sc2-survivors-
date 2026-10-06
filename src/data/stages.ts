export type Difficulty='easy'|'normal'|'hard'|'hell';
export interface EnemyPressure {total:number;waves:number;guards:number;health:number;damage:number;attackSpeed:number;moveSpeed:number;eliteEvents:number}
const neutralPressure:EnemyPressure={total:1,waves:1,guards:1,health:1,damage:1,attackSpeed:1,moveSpeed:1,eliteEvents:1};
const hardPressure:readonly EnemyPressure[]=[
 {total:1.20,waves:1.15,guards:1.15,health:1.10,damage:1.05,attackSpeed:1,moveSpeed:1.05,eliteEvents:1.25},
 {total:1.30,waves:1.20,guards:1.20,health:1.20,damage:1.12,attackSpeed:1.05,moveSpeed:1.08,eliteEvents:1.25},
 {total:1.35,waves:1.30,guards:1.25,health:1.30,damage:1.18,attackSpeed:1.10,moveSpeed:1.10,eliteEvents:1.25},
 {total:1.40,waves:1.40,guards:1.30,health:1.40,damage:1.25,attackSpeed:1.12,moveSpeed:1.12,eliteEvents:1.25}
];
const hellPressure:readonly EnemyPressure[]=[hardPressure[0],
 {total:1.40,waves:1.30,guards:1.25,health:1.30,damage:1.20,attackSpeed:1.10,moveSpeed:1.12,eliteEvents:1.5},
 {total:1.60,waves:1.45,guards:1.35,health:1.55,damage:1.35,attackSpeed:1.18,moveSpeed:1.15,eliteEvents:1.5},
 {total:1.80,waves:1.60,guards:1.45,health:1.80,damage:1.50,attackSpeed:1.25,moveSpeed:1.18,eliteEvents:1.5}
];
export const enemyPressure=(difficulty:Difficulty,stage:number):EnemyPressure=>difficulty==='hard'?hardPressure[Math.min(3,Math.floor((stage-1)/3))]:difficulty==='hell'?hellPressure[Math.min(3,Math.floor((stage-1)/3))]:neutralPressure;
export function eliteGrowth(difficulty:Difficulty,stage:number){const level=stage>=12?5:stage>=10?4:Math.min(3,Math.floor((stage-1)/3)+1),scale=difficulty==='easy'?.5:1;
 return {level,health:1+([1,1.6,2.2,2.8,3.4][level-1]-1)*scale,damage:1+([1,1.5,2,2.5,3][level-1]-1)*scale,attackSpeed:1+([1,1.12,1.24,1.36,1.48][level-1]-1)*scale,armor:[0,.5,1,1.5,2][level-1]*scale};}
/** Current enemy count/HP factors; growth profiles also serve endless specials. */
export const difficultyPressureFactor=(difficulty:Difficulty)=>difficulty==='easy'?.5:.9;
export const enemyCountFactor=difficultyPressureFactor;
export const bossHealthFactor=(difficulty:Difficulty,stage=1)=>difficultyPressureFactor(difficulty)*enemyPressure(difficulty,stage).health;
/** Normal-mode late campaign bosses deal 20% more damage and attack faster; HP is unchanged. */
export const bossDamageFactor=(difficulty:Difficulty,stage:number)=>(difficulty!=='easy'&&[6,9,12].includes(stage)?1.2:1)*enemyPressure(difficulty,stage).damage;
export const bossAttackSpeedFactor=(difficulty:Difficulty,stage:number)=>(difficulty!=='easy'&&stage===6?1.05:difficulty!=='easy'&&stage===9?1.1:difficulty!=='easy'&&stage===12?1.2:1)*enemyPressure(difficulty,stage).attackSpeed;
export function incomeFactor(difficulty:Difficulty){return difficulty==='easy'?1.25:1;}
