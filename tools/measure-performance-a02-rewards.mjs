import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const root='reports/local/performance-a02-20261020',revision=process.argv[2]??'candidate-r1',run=process.argv[3]??'1';
const libs={baseline:await import('../'+root+'/baseline-logic/main.mjs'),candidate:await import('../'+root+'/'+revision+'-logic/main.mjs')};
const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
const rows=[];
for(const race of ['terran','zerg','protoss'])for(const enemies of [0,300]){
 const states={};
 for(const [variant,lib]of Object.entries(libs)){
  const w=new lib.World({race,seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:lib.newEquipmentAccount(529)});assert.ok(w.start());
  for(let i=0;i<enemies;i++)w.addUnit('zergling','zerg',5+i%15,5+Math.floor(i/15));
  states[variant]={lib,w};
 }
 for(const name of ['context','boss','equipment']){
  const functions=Object.fromEntries(Object.entries(states).map(([key,{lib,w}])=>[key,name==='context'?()=>lib.draftContext(w):name==='boss'?()=>lib.drawBossLoot(lib.draftContext(w),'measure'):()=>lib.drawEquipmentUnitLoot(lib.draftContext(w),'measure')]));
  const cold={};for(const key of ['baseline','candidate']){const at=performance.now();functions[key]();cold[key]=performance.now()-at;}
  for(const key of ['baseline','candidate'])for(let i=0;i<50;i++)functions[key]();
  const samples={baseline:[],candidate:[]},pairs=[],calls=name==='context'?300:100;
  for(let round=0;round<12;round++){
   const pair={round};
   for(const key of round%2?['candidate','baseline']:['baseline','candidate']){
    const at=performance.now();for(let i=0;i<calls;i++)functions[key]();
    const ms=(performance.now()-at)/calls;samples[key].push(ms);pair[key]=ms;
   }pairs.push(pair);
  }
  const baseline=median(samples.baseline),candidate=median(samples.candidate);
  rows.push({race,enemies,name,cold,calls,pairs,baselineMs:baseline,candidateMs:candidate,changePercent:(candidate/baseline-1)*100,fasterPairs:pairs.filter(p=>p.candidate<p.baseline).length});
  console.log(JSON.stringify({race,enemies,name,baseline,candidate,fasterPairs:rows.at(-1).fasterPairs}));
 }
}
await fs.writeFile(`${root}/reward-cpu-${revision}-${run}.json`,JSON.stringify({pass:true,scope:'Serial, alternating, uninstrumented production bundles. 12 pairs after 50 warmup calls; local function CPU only. Cold first call is retained separately, not a statistically stable cold measure. No concurrent browser/test load during this run.',rows},null,2)+'\n');
