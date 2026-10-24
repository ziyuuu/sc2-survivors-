import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import * as old from '../reports/local/performance-s08-20261020/baseline-logic/main.mjs';
import * as current from '../reports/local/performance-s08-20261020/candidate-r2-logic/main.mjs';
import {setup,enemies,snapshot} from './performance-s08-cases.mjs';
const root='reports/local/performance-s08-20261020',results=[],mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const name of ['medical-medivac','medical-medivac.2','swann','niadra','artanis','auras-none','auras-queen','pools-empty']){
 const pair=[old,current].map(lib=>setup(lib,name,16,529));
 for(const c of pair){enemies(c.w,300,529);const actual=c.call;c.call=()=>{c.observed.length=0;c.w.visualEvents=[];c.w.effects=[];for(const p of c.targets){p.hp=p.maxHp*.5;p.shield=(p.maxShield??0)*.5;}if(c.source)c.source.energy=100;actual();};c.call();}
 assert.deepEqual(snapshot(old,pair[0].w),snapshot(current,pair[1].w),name);assert.deepEqual(pair[0].observed,pair[1].observed,name+' receipts');
 for(let k=0;k<12;k++)for(const c of pair)for(let j=0;j<20;j++)c.call();const samples=[];
 for(let k=0;k<12;k++){const row=[];for(const i of k%2?[1,0]:[0,1]){const start=performance.now();for(let j=0;j<200;j++)pair[i].call();row[i]=(performance.now()-start)/200;}samples.push({oldMs:row[0],newMs:row[1]});}
 const row={name,patients:16,enemies:300,stateExact:true,oldMs:mean(samples.map(s=>s.oldMs)),newMs:mean(samples.map(s=>s.newMs)),fasterPairs:samples.filter(s=>s.newMs<s.oldMs).length,samples};results.push(row);console.log(JSON.stringify({...row,samples:undefined}));
}
await fs.writeFile(root+'/battle-cpu.json',JSON.stringify({pass:true,results,method:'16 wounded allied recipients plus 300 parked high-health enemies and relevant native support source. Local CPU, same-process 12 alternating pairs of 200 calls after 12 warmups. Eight complete state/observation pairs exact. Distinct from the 300-allied-recipient stress test; not natural gameplay or whole-game FPS.'},null,2));
