import fs from 'node:fs/promises';import {performance} from 'node:perf_hooks';import {setup,labels} from './performance-r02-cases.mjs';
const root='reports/local/performance-r02-20261020',variant=process.argv[2]??'pair',a=await import('../'+root+'/baseline-logic/main.mjs'),b=variant==='baseline'?a:await import('../'+root+'/candidate-logic/main.mjs');
const median=x=>{x=x.slice().sort((a,b)=>a-b);return (x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2;},report={variant,rows:[],method:'Serial alternating 12 pairs; setup/restoration excluded, accounts/loot/pickups/wallet/economy/time restored per call; full-step unit history retained. Milliseconds local CPU, not FPS.'};
for(const [name,options]of [['pickup-peak18',{n:18}],['pickup-stress96',{n:96}],['pickup-full96',{n:96,pack:64}],['pickup-far96',{n:96,near:false}],['pickup-long96',{n:96,warehouse:500}],['resource-181',{n:0,resource:181,gear:true}],['resource-stress1000',{n:0,resource:1000,gear:true}],['empty',{n:0}]]){
 if(process.env.SC2_R02_CASE&&process.env.SC2_R02_CASE!==name)continue;const fixture=[setup(a,options),setup(b,options)],restores=fixture.map(({w})=>{const account=structuredClone(w.starship.account),loot=structuredClone(w.starship.loot),pickups=structuredClone(w.pickups),wallet={...w.wallet},economy=structuredClone(w.economyTotals);return ()=>{w.starship.account=structuredClone(account);w.starship.loot=structuredClone(loot);w.pickups=structuredClone(pickups);w.wallet={...wallet};w.economyTotals=structuredClone(economy);w.phase='battle';w.time=0;w.tick=0;w.stageElapsed=0;};});
 const sample=k=>{let ms=0;for(let i=0;i<40;i++){restores[k]();const at=performance.now();name.startsWith('resource')?fixture[k].step():fixture[k].call();ms+=performance.now()-at;}return ms/40;};
 for(let i=0;i<4;i++)for(let k=0;k<2;k++)sample(k);
 const samples=[[],[]];for(let i=0;i<12;i++)for(const k of i%2?[1,0]:[0,1])samples[k].push(sample(k));
 const row={name,options,samples,median:samples.map(median)};report.rows.push(row);console.log(JSON.stringify(row));
}
for(const n of process.env.SC2_R02_CASE?[]:[0,18,96,1000]){
 const input=labels(n),calls=n===1000?100:500,run=lib=>{const at=performance.now();for(let i=0;i<calls;i++)lib.layoutEquipmentLabels(input,1440,900,[{left:0,top:0,right:1440,bottom:100}]);return (performance.now()-at)/calls;};for(let i=0;i<4;i++){run(a);run(b);}const samples=[[],[]];for(let i=0;i<12;i++)for(const k of i%2?[1,0]:[0,1])samples[k].push(run(k?b:a));const row={name:'labels-'+n,samples,median:samples.map(median)};report.rows.push(row);console.log(JSON.stringify(row));
}
await fs.writeFile(root+'/cpu-'+variant+(process.env.SC2_R02_CASE?'-'+process.env.SC2_R02_CASE:'')+'.json',JSON.stringify(report,null,2));
