import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {make,history} from './performance-s05-cases.mjs';
const root='reports/local/performance-s05-20261020',libs={baseline:await import('../'+root+'/baseline-r2-logic/main.mjs'),candidate:await import('../'+root+'/candidate-r2-logic/main.mjs')},report={method:'Serial alternating A/B rounds. Setup and history creation excluded from hot timings. Cold timings include first index build; heap measured after forced GC. Local CPU only, not frame FPS.',hot:[],cold:[],pass:false};
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
for(const n of [0,20,1000,10000])for(const name of ['reservations','production-idle','production-training','ui','healthy-twins']){
 const states={};for(const [mode,lib]of Object.entries(libs)){const w=make(lib,name==='healthy-twins'?'zerg':'terran',529,n);if(name==='production-training')lib.updateExpeditionProduction(w,0,true);if(name==='healthy-twins')w.addFamilyMember('zergling',{x:0,z:0},1);
  const f=name==='reservations'?()=>{lib.paidReservations(w,'marine');lib.tacticalReservations(w,'marine');}:name==='ui'?()=>lib.renderProductionWindow(w,'production'):name==='healthy-twins'?()=>lib.tickBroods(w):()=>lib.updateExpeditionProduction(w,0,false);
  for(let i=0;i<100;i++)f();states[mode]={w,f};}
 const calls=name==='ui'?200:2000,samples={baseline:[],candidate:[]};
 for(let round=0;round<9;round++)for(const mode of round%2?['candidate','baseline']:['baseline','candidate']){const at=performance.now();for(let i=0;i<calls;i++)states[mode].f();samples[mode].push((performance.now()-at)/calls);}
 for(const {w}of Object.values(states))assert.equal(w.expedition.ledger.length,n+(name==='production-training'?1:0));
 const baseline=median(samples.baseline),candidate=median(samples.candidate);report.hot.push({n,name,calls,samples,baselineMs:baseline,candidateMs:candidate,changePercent:(candidate/baseline-1)*100});console.log(JSON.stringify({n,name,baseline,candidate}));
}
for(const n of [0,20,1000,10000])for(const [mode,lib]of Object.entries(libs)){const w=make(lib,'terran',529,0),samples=[],heaps=[];for(let round=0;round<7;round++){w.expedition.ledger=history(n);global.gc?.();const before=process.memoryUsage().heapUsed,at=performance.now();assert.equal(lib.paidReservations(w,'marine'),0);samples.push(performance.now()-at);global.gc?.();heaps.push(process.memoryUsage().heapUsed-before);}report.cold.push({mode,n,samples,medianMs:median(samples),heapBytes:heaps,medianHeapBytes:median(heaps)});}
report.pass=true;await fs.writeFile(root+'/cpu.json',JSON.stringify(report,null,2));
