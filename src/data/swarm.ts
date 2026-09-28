import {campaign18EnemyPressure} from './campaign18';
import type {Difficulty} from './stages';
export const SWARM_TYPES=['zergling','roach','baneling'] as const;
export type SwarmType=typeof SWARM_TYPES[number];
export interface SwarmBatch {at:number;counts:Record<SwarmType,number>;stage:number;round:number;bearing:number}
export interface SwarmState {window:string;carry:number[];pending:SwarmBatch[];planned:number;spawned:number;kills:number;minerals:number;gas:number;talentChecks:number;firstSpawnAt:number|null;lastSpawnAt:number|null}
export const newSwarmState=():SwarmState=>({window:'',carry:[0,0,0],pending:[],planned:0,spawned:0,kills:0,minerals:0,gas:0,talentChecks:0,firstSpawnAt:null,lastSpawnAt:null});
export function validateSwarm(s:SwarmState){
 if(!s||typeof s.window!=='string'||!Array.isArray(s.carry)||s.carry.length!==3||s.carry.some(n=>!Number.isFinite(n)||n<0||n>=1)||!Array.isArray(s.pending)||![s.planned,s.spawned,s.kills,s.talentChecks].every(n=>Number.isSafeInteger(n)&&n>=0)||s.spawned>s.planned||s.kills>s.spawned||![s.minerals,s.gas].every(n=>Number.isFinite(n)&&n>=0)||[s.firstSpawnAt,s.lastSpawnAt].some(n=>n!==null&&(!Number.isFinite(n)||n<0)))throw Error('虫海进度无效');
 let pending=0,last=-1;
 for(const b of s.pending){if(!b||!Number.isFinite(b.at)||b.at<last||!Number.isFinite(b.bearing)||!Number.isInteger(b.stage)||b.stage<1||b.stage>18||!Number.isSafeInteger(b.round)||b.round<0||!b.counts||Object.keys(b.counts).length!==3||SWARM_TYPES.some(t=>!Number.isSafeInteger(b.counts[t])||b.counts[t]<0))throw Error('虫海待入场记录无效');last=b.at;pending+=SWARM_TYPES.reduce((n,t)=>n+b.counts[t],0);}
 if(pending!==s.planned-s.spawned)throw Error('虫海数量不一致');
}
/** Own deterministic bearings: appending fodder never consumes the ordinary-wave RNG. */
export function planSwarm(state:SwarmState,stage:number,difficulty:Difficulty,seed:number,startedAt:number,duration:number,round=0){
 const window=round?'endless:'+round:'stage:'+stage;if(state.window===window)return;state.window=window;
 const amount=round?60:stage<7?0:stage<=9?60:stage<=12?90:stage<=15?120:150;if(!amount)return;
 const pressure=round?(difficulty==='hard'?1.4:difficulty==='hell'?1.8:1):campaign18EnemyPressure(difficulty,stage).total;
 const factor=(difficulty==='easy'?.5/.9:1)*pressure,shares=[.7,.2,.1],times:number[]=[];
 for(let t=5;t<duration;t+=15)times.push(t);
 const totals=shares.map((share,i)=>{const exact=amount*factor*share+state.carry[i],n=Math.floor(exact+1e-8);state.carry[i]=Math.max(0,exact-n);state.planned+=n;return n;});
 for(let i=0;i<times.length;i++){const counts=Object.fromEntries(SWARM_TYPES.map((type,j)=>[type,Math.floor((i+1)*totals[j]/times.length)-Math.floor(i*totals[j]/times.length)])) as Record<SwarmType,number>;
  state.pending.push({at:startedAt+times[i],counts,stage,round,bearing:((Math.imul(seed^stage,1664525)+Math.imul(round+1,1013904223)+i*2654435761)>>>0)/4294967296*Math.PI*2});
 }
}
