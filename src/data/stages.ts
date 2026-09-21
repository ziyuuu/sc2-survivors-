import {ZERG,type ZergType} from './sc2-units';
export type Difficulty='easy'|'normal';
export type Counts=[number,number,number,number];
export interface StageConfig {id:number;name:string;durationSeconds:number;ambient:Counts;guards:Counts;waves:number;lingHp:number;speed:number;width:number;podHp:number;reward:readonly [number,number];drones:number;eggs:number}
const names=['边境警报','双向夹击','代谢加速','酸液装甲','地面虫潮','爆虫冲锋','孤立降落区','重甲围攻','离心钩','腐蚀胆汁','全兵种虫潮','摧毁虫巢'];
const ambient:Counts[]=[[5,0,0,0],[14,0,0,0],[28,0,0,0],[80,12,0,0],[120,24,0,0],[132,24,12,0],[160,32,16,0],[160,56,20,0],[192,48,40,0],[300,72,48,18],[360,96,72,30],[420,120,90,42]];
const guards:Counts[]=[[2,0,0,0],[3,0,0,0],[4,0,0,0],[6,1,0,0],[8,2,0,0],[10,2,1,0],[12,3,1,0],[14,4,2,0],[16,4,3,0],[18,4,3,1],[22,5,4,2],[26,6,5,3]];
const rewards:readonly (readonly [number,number])[]=[[80,30],[250,125],[300,150],[250,150],[250,150],[250,175],[200,175],[200,200],[200,200],[225,225],[250,225],[300,250]];
export const STAGES:StageConfig[]=names.map((name,i)=>({id:i+1,name,durationSeconds:i<3?120:i<9?240:360,ambient:ambient[i],guards:guards[i],waves:[5,7,7,10,12,12,14,14,16,24,27,30][i],lingHp:[18,24,30][i]??35,speed:[1,1,1.1,1.1,1.12,1.12,1.15,1.15,1.18,1.18,1.2,1.2][i],width:[28,36,44,52,60,68,76,84,92,100,104,112][i],podHp:[600,900,1200,1500,1800,2100,2400,2400,2400,2400,2400,2400][i],reward:rewards[i],drones:i<3?2:i<9?3:4,eggs:2}));
export function stageConfig(stage:number,difficulty:Difficulty):StageConfig {const s=STAGES[Math.max(0,Math.min(11,stage-1))];return {...s,ambient:s.ambient.map(n=>Math.ceil(n*(difficulty==='easy'&&stage>1?.7:1))) as Counts,guards:s.guards.map(n=>Math.ceil(n*(difficulty==='easy'&&stage>1?.75:1))) as Counts};}
export function incomeFactor(difficulty:Difficulty){return difficulty==='easy'?1.25:1;}
export function seeded(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export interface Wave {at:number;types:ZergType[];bearing:number}
export interface EconomicSpawn {at:number;kind:'egg'|'drone'}
/** Budgets and times depend on the run seed, never on surviving army strength. */
export function stageSchedule(s:StageConfig,seed:number){const rng=seeded(seed+s.id*7919),windows=[[20,30],[50,60],[65,75],[85,95],[105,115]];
 const waves:Wave[]=Array.from({length:s.waves},(_,i)=>({at:s.id===1?windows[i][0]+rng()*(windows[i][1]-windows[i][0]):12+i*(s.durationSeconds-24)/(s.waves-1)+(rng()-.5)*(s.durationSeconds-24)/(s.waves-1)*.3,types:[],bearing:rng()*Math.PI*2}));
 s.ambient.forEach((count,type)=>{const first=(s.id===4&&type===1||s.id===6&&type===2||s.id===10&&type===3)?2:0;for(let j=0;j<count;j++)waves[first+j%(waves.length-first)].types.push(ZERG[type]);});
 const events:EconomicSpawn[]=[...Array.from({length:s.eggs},(_,i)=>({at:s.durationSeconds*(.15+i*.5+(rng()-.5)*.06),kind:'egg' as const})),...Array.from({length:s.drones},(_,i)=>({at:s.durationSeconds*(.2+i*.6/Math.max(1,s.drones-1)+(rng()-.5)*.05),kind:'drone' as const}))].sort((a,b)=>a.at-b.at);
 return {waves,events};
}
