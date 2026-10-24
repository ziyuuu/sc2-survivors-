import fs from 'node:fs/promises';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
import * as old from '../reports/local/performance-s08-20261020/baseline-logic/main.mjs';
const current=await import('../reports/local/performance-s08-20261020/candidate'+(process.env.SC2_BATCH_REVISION??'')+'-logic/main.mjs');
import {setup,make} from './performance-s08-cases.mjs';
const root='reports/local/performance-s08-20261020',mean=a=>a.reduce((x,y)=>x+y,0)/a.length,results=[];
function reset(c,variant){c.observed.length=0;c.w.visualEvents=[];c.w.effects=[];for(const p of c.targets){p.hp=p.maxHp*(variant==='full'?1:.5);p.shield=(p.maxShield??0)*(variant==='full'?1:.5);}if(c.source)c.source.energy=variant==='zero-energy'?0:100;for(const p of c.w.zergHeroes.pools)p.next=3;for(const f of c.w.protossElites.fields)f.next=3;if(c.w.eliteSupport.barriers.length)c.w.eliteSupport.barriers[0].until=10;}
function timed(c,variant,repeats){const start=performance.now();for(let i=0;i<repeats;i++){reset(c,variant);c.call();}return (performance.now()-start)/repeats;}
for(const name of ['medical-medivac','medical-medivac.2','swann','niadra','artanis','guardian','auras-none','auras-queen','pools-empty','pools-due','support-empty','support-barrier','weapon']){
 for(const n of [16,300])for(const variant of ['wounded',...(name.startsWith('medical')||name.startsWith('auras')?['full']:[])]){
  const pair=[old,current].map(lib=>setup(lib,name,n,529,variant));for(let i=0;i<12;i++)for(const c of pair)timed(c,variant,8);
  const samples=[];for(let k=0;k<12;k++){const row=[];for(const i of k%2?[1,0]:[0,1])row[i]=timed(pair[i],variant,40);samples.push({oldMs:row[0],newMs:row[1]});}
  const row={name,n,variant,oldMs:mean(samples.map(s=>s.oldMs)),newMs:mean(samples.map(s=>s.newMs)),fasterPairs:samples.filter(s=>s.newMs<s.oldMs).length,samples};results.push(row);console.log(JSON.stringify({...row,samples:undefined}));
 }
}
function statuses(lib){const s=new lib.CombatStatuses();for(let r=0;r<8;r++)for(let t=0;t<32;t++)for(let u=0;u<16;u++)s.apply(t,u,'bleed',.3,2+r*.05,r*.01);return s;}
const statusSamples=[];for(let k=0;k<24;k++){const pair=[old,current].map(statuses),ms=[];assert.equal(pair[0].count,512);assert.equal(pair[1].count,512);assert.equal(pair[0].expiry.length,4096);assert.equal(pair[1].expiry.length,4096);for(const i of k%2?[1,0]:[0,1]){const start=performance.now();pair[i].tick(4);ms[i]=performance.now()-start;}assert.deepEqual(pair[0].snapshot(),pair[1].snapshot());if(k>=12)statusSamples.push({oldMs:ms[0],newMs:ms[1]});}
results.push({name:'status-expiry',n:4096,activeEntriesBefore:512,heapTicketsBefore:4096,variant:'32 targets / 16 sources / 8 refreshes',oldMs:mean(statusSamples.map(s=>s.oldMs)),newMs:mean(statusSamples.map(s=>s.newMs)),fasterPairs:statusSamples.filter(s=>s.newMs<s.oldMs).length,samples:statusSamples});
await fs.writeFile(root+'/cpu.json',JSON.stringify({pass:true,warmups:12,pairs:12,repeats:40,method:'Alternating same-process production functions. Support timings include equal target HP/energy/event reset; status timing excludes queue construction. Synthetic target density, not FPS.',results},null,2));console.log(JSON.stringify({...results.at(-1),samples:undefined}));
