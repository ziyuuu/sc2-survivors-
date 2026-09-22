import {ZERG,type ZergType} from './sc2-units';
export type Difficulty='easy'|'normal';
export type Counts=Record<ZergType,number>;
export const emptyCounts=():Counts=>({zergling:0,roach:0,baneling:0,ravager:0,hydralisk:0});
export const counts=(a:readonly number[]):Counts=>Object.fromEntries(ZERG.map((t,i)=>[t,a[i]??0])) as Counts;
/** Separate carry objects for ambient/guards/elites. Never round every small group up. */
export function scaleCounts(source:Counts,factor:number,carry=emptyCounts()):Counts {const out=emptyCounts();for(const type of ZERG){const exact=source[type]*factor+carry[type];out[type]=Math.floor(exact+1e-8);carry[type]=exact-out[type];}return out;}
export interface StageConfig {id:number;name:string;durationSeconds:number;ambient:Counts;guards:Counts;waves:number;entranceSpacing:number;lingHp:number;speed:number;width:number;podHp:number;reward:readonly [number,number];drones:number;eggs:number}
const names=['边境警报','双向夹击','代谢加速','酸液装甲','地面虫潮','爆虫冲锋','孤立降落区','重甲围攻','离心钩','腐蚀胆汁','全兵种虫潮','摧毁虫巢'];
const ambient:number[][]=[[6,0,0,0],[12,0,0,0],[28,0,0,0],[80,12,0,0],[120,24,0,0],[132,24,12,0],[160,32,16,0],[160,56,20,0],[192,48,40,0],[300,72,48,18],[360,96,72,30],[420,120,90,42]];
const guards:number[][]=[[2,0,0,0],[3,0,0,0],[4,0,0,0],[6,1,0,0],[8,2,0,0],[10,2,1,0],[12,3,1,0],[14,4,2,0],[16,4,3,0],[18,4,3,1],[22,5,4,2],[26,6,5,3]];
const rewards:readonly (readonly [number,number])[]=[[80,30],[250,125],[300,150],[250,150],[250,150],[250,175],[200,175],[200,200],[200,200],[225,225],[250,225],[300,250]];
export const STAGES:StageConfig[]=names.map((name,i)=>({id:i+1,name,durationSeconds:60*(1+Math.floor(i/3)),ambient:counts([...ambient[i],[0,0,0,0,0,0,6,10,14,18,24,30][i]]),guards:counts([...guards[i],[0,0,0,0,0,0,1,1,1,2,2,3][i]]),entranceSpacing:i<3?.3:i<5?.8:.35,waves:[6,6,7,10,12,12,14,14,16,24,27,30][i],lingHp:[18,24,30][i]??35,speed:[1,1,1.1,1.1,1.12,1.12,1.15,1.15,1.18,1.18,1.2,1.2][i],width:[28,36,44,52,60,68,76,84,92,100,104,112][i],podHp:[600,900,1200,1500,1800,2100,2400,2400,2400,2400,2400,2400][i],reward:rewards[i],drones:i<2?4:i<3?2:i<9?3:4,eggs:i<2?3:2}));
export function stageConfig(stage:number,difficulty:Difficulty):StageConfig {const index=Math.max(0,Math.min(11,stage-1)),s=STAGES[index];if(difficulty==='normal')return {...s,ambient:{...s.ambient},guards:{...s.guards}};
 const carry=emptyCounts();for(let i=0;i<index;i++)scaleCounts(STAGES[i].ambient,.5,carry);return {...s,ambient:scaleCounts(s.ambient,.5,carry),guards:scaleCounts(s.guards,.5)};}
export function incomeFactor(difficulty:Difficulty){return difficulty==='easy'?1.25:1;}
export function seeded(seed:number){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export interface Wave {at:number;types:ZergType[];bearing:number}
export interface EconomicSpawn {at:number;kind:'egg'|'drone'}
/** Budgets and times depend on the run seed, never on surviving army strength. */
export function stageSchedule(s:StageConfig,seed:number){const rng=seeded(seed+s.id*7919);
 const waves:Wave[]=Array.from({length:s.waves},(_,i)=>({at:s.id<=2?3+i*10+(rng()-.5):12+i*(s.durationSeconds-24)/(s.waves-1)+(rng()-.5)*(s.durationSeconds-24)/(s.waves-1)*.3,types:[],bearing:rng()*Math.PI*2}));
 for(const type of ZERG){const first=(s.id===4&&type==='roach'||s.id===6&&type==='baneling'||s.id===10&&type==='ravager'||s.id===7&&type==='hydralisk')?2:0;for(let j=0;j<s.ambient[type];j++)waves[first+j%(waves.length-first)].types.push(type);}
 const events:EconomicSpawn[]=[...Array.from({length:s.eggs},(_,i)=>({at:s.id<=2?[10,27,41][i]+(rng()-.5)*2:s.durationSeconds*(.15+i*.5/Math.max(1,s.eggs-1)+(rng()-.5)*.06),kind:'egg' as const})),...Array.from({length:s.drones},(_,i)=>({at:s.id<=2?[7,19,37,49][i]+(rng()-.5)*2:s.durationSeconds*(.2+i*.6/Math.max(1,s.drones-1)+(rng()-.5)*.05),kind:'drone' as const}))].sort((a,b)=>a.at-b.at);
 return {waves,events};
}
