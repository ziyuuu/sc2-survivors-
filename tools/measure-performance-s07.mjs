import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {setup,snapshot} from './performance-s07-cases.mjs';
const root='reports/local/performance-s07-20261020',revision=process.env.SC2_BATCH_REVISION??'',baseline=await import('../'+root+'/baseline-r3-logic/main.mjs'),only=process.argv.includes('--baseline'),libs=only?{baseline}:{baseline,candidate:await import('../'+root+'/candidate'+revision+'-logic/main.mjs')};
const report={pass:false,method:'12 serial alternating rounds, 20 excluded warm-up calls per case/build, preparation excluded, same production functions and identical calls; full final state and return comparison. Diagnostic force resets for local skill timing only. No FPS attribution.',rows:[]},median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
for(const [name,n,loops,theme] of [['contacts',30,30],['contacts',300,30],['separation',300,10],['step',300,5],['cliff',0,200],['cliff',300,200],['cliff-blocked',300,200],['cliff-placements',300,100],['engage-hot',16,300],['engage-hot',60,100],['engage-cold',16,60],['formation-hot',16,2000],['formation-cold',16,100],['marauder',0,60],['marauder',300,60],['immortal',300,30],['blink',300,10],...Object.keys(baseline.MAP_THEMES).map(theme=>['cliff-map',300,300,theme])]){
 for(const lib of Object.values(libs)){const {call}=setup(lib,name,n,529,theme);for(let i=0;i<20;i++)call();}
 const samples=Object.fromEntries(Object.keys(libs).map(k=>[k,[]]));
 for(let round=0;round<(only?3:12);round++){
  const results={};for(const mode of round%2?Object.keys(libs).reverse():Object.keys(libs)){
   const lib=libs[mode],{w,call}=setup(lib,name,n,529,theme);const at=performance.now();let value;for(let i=0;i<loops;i++)value=call();samples[mode].push((performance.now()-at)/loops);
   results[mode]={value:value??null,state:snapshot(lib,w)};
  }if(!only)assert.deepEqual(results.candidate,results.baseline,name);
 }
 const a=median(samples.baseline),b=only?undefined:median(samples.candidate);const row={name,n,loops,theme,samples,baselineMs:a,candidateMs:b,changePercent:b===undefined?undefined:(b/a-1)*100,fasterPairs:only?undefined:samples.candidate.filter((v,i)=>v<samples.baseline[i]).length};report.rows.push(row);console.log(JSON.stringify({...row,samples:undefined}));
}
report.pass=true;await fs.writeFile(root+(only?'/cpu-baseline.json':'/cpu'+(process.env.SC2_REPORT_REVISION??revision)+'.json'),JSON.stringify(report,null,2));
