import {ELITE_TIMES,BOSSES,type EnemyEvent} from './enemies';
import {ZERG,type ZergType} from './sc2-units';
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
/** Chapter growth is locked when an enemy spawns; Easy halves only the increment. */
export function chapterGrowth(difficulty:Difficulty,stage:number){const i=Math.min(3,Math.floor((stage-1)/3)),scale=difficulty==='easy'?.5:1;
 return {health:1+([1,1.2,1.6,2.1][i]-1)*scale,damage:1+([1,1.1,1.25,1.45][i]-1)*scale,attackSpeed:1+([1,1.05,1.1,1.2][i]-1)*scale};}
export function eliteGrowth(difficulty:Difficulty,stage:number){const level=stage>=12?5:stage>=10?4:Math.min(3,Math.floor((stage-1)/3)+1),scale=difficulty==='easy'?.5:1;
 return {level,health:1+([1,1.6,2.2,2.8,3.4][level-1]-1)*scale,damage:1+([1,1.5,2,2.5,3][level-1]-1)*scale,attackSpeed:1+([1,1.12,1.24,1.36,1.48][level-1]-1)*scale,armor:[0,.5,1,1.5,2][level-1]*scale};}
export type Counts=Record<ZergType,number>;
export const emptyCounts=():Counts=>({zergling:0,roach:0,baneling:0,ravager:0,hydralisk:0});
export const counts=(a:readonly number[]):Counts=>Object.fromEntries(ZERG.map((t,i)=>[t,a[i]??0])) as Counts;
/** Separate carry objects for ambient/guards/elites. Never round every small group up. */
export function scaleCounts(source:Counts,factor:number,carry=emptyCounts(),nearest=false):Counts {const out=emptyCounts();for(const type of ZERG){const exact=source[type]*factor+carry[type];out[type]=Math.floor(exact+(nearest?.5:1e-8));carry[type]=exact-out[type];}return out;}
export interface StageConfig {difficulty?:Difficulty;id:number;name:string;durationSeconds:number;ambient:Counts;guards:Counts;waves:number;entranceSpacing:number;lingHp:number;speed:number;width:number;podHp:number;reward:readonly [number,number];drones:number;eggs:number}
const names=['边境警报','双向夹击','代谢加速','酸液装甲','地面虫潮','爆虫冲锋','孤立降落区','重甲围攻','离心钩','腐蚀胆汁','全兵种虫潮','摧毁虫巢'];
const ambient:number[][]=[[6,0,0,0],[12,0,0,0],[28,0,0,0],[80,12,0,0],[120,24,0,0],[132,24,12,0],[160,32,16,0],[160,56,20,0],[192,48,40,0],[300,72,48,18],[360,96,72,30],[420,120,90,42]];
const guards:number[][]=[[2,0,0,0],[3,0,0,0],[4,0,0,0],[6,1,0,0],[8,2,0,0],[10,2,1,0],[12,3,1,0],[14,4,2,0],[16,4,3,0],[18,4,3,1],[22,5,4,2],[26,6,5,3]];
const rewards:readonly (readonly [number,number])[]=[[80,30],[250,125],[300,150],[250,150],[250,150],[250,175],[200,175],[200,200],[200,200],[225,225],[250,225],[300,250]];
export const STAGES:StageConfig[]=names.map((name,i)=>({id:i+1,name,durationSeconds:60*(1+Math.floor(i/3)),ambient:counts([...ambient[i],[0,0,0,0,0,0,6,10,14,18,24,30][i]]),guards:counts([...guards[i],[0,0,0,0,0,0,1,1,1,2,2,3][i]]),entranceSpacing:i<3?.3:i<5?.8:.35,waves:[6,6,7,10,12,12,14,14,16,24,27,30][i],lingHp:[18,24,30][i]??35,speed:[1,1,1.1,1.1,1.12,1.12,1.15,1.15,1.18,1.18,1.2,1.2][i],width:[28,36,44,52,60,68,76,84,92,100,104,112][i],podHp:[600,900,1200,1500,1800,2100,2400,2400,2400,2400,2400,2400][i],reward:rewards[i],drones:i<2?4:i<3?2:i<9?3:4,eggs:i<2?3:2}));
/** V17: Normal is 90% of the locked budget. Easy remains 50% of that original baseline. */
export const difficultyPressureFactor=(difficulty:Difficulty)=>difficulty==='easy'?.5:.9;
export const enemyCountFactor=difficultyPressureFactor;
export const bossHealthFactor=(difficulty:Difficulty,stage=1)=>difficultyPressureFactor(difficulty)*enemyPressure(difficulty,stage).health;
/** Normal-mode late campaign bosses deal 20% more damage and attack faster; HP is unchanged. */
export const bossDamageFactor=(difficulty:Difficulty,stage:number)=>(difficulty!=='easy'&&[6,9,12].includes(stage)?1.2:1)*enemyPressure(difficulty,stage).damage;
export const bossAttackSpeedFactor=(difficulty:Difficulty,stage:number)=>(difficulty!=='easy'&&stage===6?1.05:difficulty!=='easy'&&stage===9?1.1:difficulty!=='easy'&&stage===12?1.2:1)*enemyPressure(difficulty,stage).attackSpeed;
export function stageConfig(stage:number,difficulty:Difficulty):StageConfig {
 const index=Math.max(0,Math.min(11,stage-1)),s=STAGES[index],factor=enemyCountFactor(difficulty),normalCarry=emptyCounts(),extraCarry=emptyCounts();
 let ambient=emptyCounts();for(let i=0;i<=index;i++){const ordinary=scaleCounts(STAGES[i].ambient,factor,normalCarry,difficulty!=='easy');ambient=difficulty==='hard'||difficulty==='hell'?scaleCounts(ordinary,enemyPressure(difficulty,i+1).total,extraCarry,true):ordinary;}
 const guards=scaleCounts(scaleCounts(s.guards,factor,emptyCounts(),difficulty!=='easy'),enemyPressure(difficulty,stage).guards,emptyCounts(),true);
 return {...s,difficulty,ambient,guards,waves:Math.max(1,Math.round(s.waves*enemyPressure(difficulty,stage).waves))};
}
export function incomeFactor(difficulty:Difficulty){return difficulty==='easy'?1.25:1;}
export function seeded(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export interface Wave {at:number;types:ZergType[];bearing:number}
export interface EconomicSpawn {at:number;kind:'egg'|'drone'}
/** Budgets and times depend on the run seed, never on surviving army strength. */
export function stageSchedule(s:StageConfig,seed:number,specialsEnabled=true){const rng=seeded(seed+s.id*7919);
 const waves:Wave[]=Array.from({length:s.waves},(_,i)=>({at:s.id<=2?(s.difficulty==='hard'||s.difficulty==='hell'?3+i*(s.durationSeconds-7)/(s.waves-1):3+i*10)+(rng()-.5):12+i*(s.durationSeconds-24)/(s.waves-1)+(rng()-.5)*(s.durationSeconds-24)/(s.waves-1)*.3,types:[],bearing:rng()*Math.PI*2}));
 for(const type of ZERG){const first=(s.id===4&&type==='roach'||s.id===6&&type==='baneling'||s.id===10&&type==='ravager'||s.id===7&&type==='hydralisk')?2:0;for(let j=0;j<s.ambient[type];j++)waves[first+j%(waves.length-first)].types.push(type);}
 const events:EconomicSpawn[]=[...Array.from({length:s.eggs},(_,i)=>({at:s.id<=2?[10,27,41][i]+(rng()-.5)*2:s.durationSeconds*(.15+i*.5/Math.max(1,s.eggs-1)+(rng()-.5)*.06),kind:'egg' as const})),...Array.from({length:s.drones},(_,i)=>({at:s.id<=2?[7,19,37,49][i]+(rng()-.5)*2:s.durationSeconds*(.2+i*.6/Math.max(1,s.drones-1)+(rng()-.5)*.05),kind:'drone' as const}))].sort((a,b)=>a.at-b.at);
 const specials:EnemyEvent[]=[];let serial=ELITE_TIMES.slice(0,s.id-1).reduce((n,list)=>n+list.length,0);
 for(const [at,type] of specialsEnabled?ELITE_TIMES[s.id-1]:[]){serial++;const time=at+(rng()-.5)*4;if(s.difficulty==='easy'&&serial%2!==0)continue;
  const wave=waves.filter(w=>w.types.includes(type)).sort((a,b)=>Math.abs(a.at-time)-Math.abs(b.at-time))[0];if(!wave)continue;wave.types.splice(wave.types.indexOf(type),1);specials.push({at:time,type,tier:'elite'});
 }
 if(specialsEnabled&&(s.difficulty==='hard'||s.difficulty==='hell')){
  const factor=enemyPressure(s.difficulty,s.id).eliteEvents,earlier=ELITE_TIMES.slice(0,s.id-1).reduce((n,list)=>n+list.length,0),total=earlier+ELITE_TIMES[s.id-1].length;
  const extras=Math.max(0,Math.floor(total*factor+1e-8)-Math.floor(earlier*factor+1e-8)-ELITE_TIMES[s.id-1].length);
  for(let i=0;i<extras;i++){const time=s.durationSeconds*(.3+.45*(i+1)/(extras+1))+(rng()-.5)*3;
   const candidates=waves.flatMap(w=>w.types.filter(t=>t!=='baneling').map(type=>({wave:w,type}))).sort((a,b)=>Math.abs(a.wave.at-time)-Math.abs(b.wave.at-time));const chosen=candidates[0];if(!chosen)break;
   chosen.wave.types.splice(chosen.wave.types.indexOf(chosen.type),1);specials.push({at:time,type:chosen.type as Exclude<ZergType,'baneling'>,tier:'elite'});
  }
 }
 const boss=BOSSES[s.id];if(boss&&specialsEnabled)specials.push({at:boss.at,type:boss.type,tier:'boss'});
 if(specialsEnabled&&s.id>=7){const types=['zergling','roach','hydralisk','ravager'] as const;specials.push({at:s.durationSeconds*.8+(rng()-.5)*6,type:types[Math.floor(rng()*types.length)],tier:'lord'});}
 specials.sort((a,b)=>a.at-b.at);return {waves:s.difficulty==='hard'||s.difficulty==='hell'?waves.filter(w=>w.types.length):waves,events,specials};
}
