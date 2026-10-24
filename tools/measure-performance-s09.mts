import fs from 'node:fs/promises';import {performance} from 'node:perf_hooks';
import {World} from '../src/simulation/world';import {ELITES} from '../src/data/elites';
import {meleeApproachGoal} from '../src/simulation/movement/melee-approach';
import {setup} from './performance-s09-cases.mjs';
const rows:any[]=[],median=(a:number[])=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
for(const n of [0,12,24]){
 const {w,u,target}=setup({World,ELITES},{scenario:'mixed-live',n});
 for(let i=0;i<300;i++){const e=w.addUnit('roach','zerg',30+i%10,30+Math.floor(i/10));e.stoppedUntil=1e9;}
 const goal={x:target.x,z:target.z-u.unitRadius-target.unitRadius-.13},cold:number[]=[],hot:number[]=[];let result;
 for(let round=0;round<12;round++){
  w.time+=.401;let at=performance.now();result=meleeApproachGoal(w,u,target,goal);cold.push(performance.now()-at);
  at=performance.now();for(let i=0;i<300;i++)meleeApproachGoal(w,u,target,goal);hot.push((performance.now()-at)/300);
 }
 rows.push({allies:n,enemies:301,cold,hot,coldMedianMs:median(cold),coldMaxMs:Math.max(...cold),hotMedianMs:median(hot),returned:{x:result?.x,z:result?.z}});
}
const report={pass:true,method:'Current source planner only, 12 rounds, cold forces route expiry; hot 300 repeated calls. Diagnostic 301 enemies exercise filtering; not normal 300 cap or full World.step/FPS. No claim of performance improvement; new routing has a CPU cost.',rows};
await fs.writeFile('reports/local/performance-s09-20261020/route-cpu.json',JSON.stringify(report,null,2));console.log(JSON.stringify(rows.map(({cold,hot,...r})=>r)));
