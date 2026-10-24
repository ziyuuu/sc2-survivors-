import fs from 'node:fs/promises';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';import {setup,snapshot} from './performance-s06-cases.mjs';
const root='reports/local/performance-s06-20261020',libs={baseline:await import('../'+root+'/baseline-logic/main.mjs'),candidate:await import('../'+root+'/candidate-logic/main.mjs')},report={pass:false,rows:[],method:'Serial alternating paired rounds, setup excluded, complete synchronous production function. Real five-map Char terrain called where indicated. Local CPU only. Burst step includes actual World.step and does not reduce spawn budget.'};
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
for(const [name,n,theme] of [['ambient',1],['ambient',176],['ambient',300],['ambient',176,'char'],['ambient-fallback',176],['endless',176],['free',0],['free-blocked',1000],['hive-blocked',1000],['carrier',0],['carrier',1000],['carrier',176,'char'],['queue',10000],['step',176]].filter(row=>!process.env.SC2_CASE||row[0]===process.env.SC2_CASE)){
 const samples={baseline:[],candidate:[]};let counts;
 for(let round=0;round<12;round++){
  const results={};
  for(const mode of round%2?['candidate','baseline']:['baseline','candidate']){
   const lib=libs[mode],{w,call}=setup(lib,name==='step'?'ambient':name,n,529,theme);
   const loops=name.startsWith('free')||name.startsWith('hive')||name==='carrier'?30:1,f=name==='step'?()=>w.step():call;
   const at=performance.now();let value;for(let i=0;i<loops;i++)value=f();samples[mode].push((performance.now()-at)/loops);
   results[mode]={value:value??null,state:snapshot(lib,w)};counts={enemies:w.enemyCount(),backlog:w.ambientBacklog.length,tick:w.tick};
   for(const u of w.entities.values())assert.ok(Number.isFinite(u.hp)&&Number.isFinite(u.weaponDamage));
   if(name==='endless')assert.equal(w.enemyCount(),n);
   if(name==='ambient-fallback')for(const u of w.entities.values())assert.ok(Math.abs(u.x)>=2+u.unitRadius||Math.abs(u.z-9)>=2+u.unitRadius);
  }
  assert.deepEqual(results.candidate,results.baseline);
 }
 const baseline=median(samples.baseline),candidate=median(samples.candidate);const row={name,n,theme,samples,baselineMs:baseline,candidateMs:candidate,changePercent:(candidate/baseline-1)*100,baselineMaxMs:Math.max(...samples.baseline),candidateMaxMs:Math.max(...samples.candidate),fasterPairs:samples.candidate.filter((v,i)=>v<samples.baseline[i]).length,counts};report.rows.push(row);console.log(JSON.stringify({...row,samples:undefined}));
}
report.pass=true;await fs.writeFile(root+'/cpu-r3.json',JSON.stringify(report,null,2));
