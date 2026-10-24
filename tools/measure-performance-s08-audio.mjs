import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import * as lib from '../reports/local/performance-s08-20261020/candidate-logic/main.mjs';import {make} from './performance-s08-cases.mjs';
const root='reports/local/performance-s08-20261020',method=lib.AudioEffects.prototype.update.toString(),needle='const ids = /* @__PURE__ */ new Set();';assert.ok(method.includes(needle));
const experimental=new Function('return function '+method.replace(needle,'const ids=this.experimentalHealingIds??=new Set();ids.clear();'))(),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
export function audioFixture(healers=4,experimentalMethod=false){
 const w=make(lib,'terran'),a=new lib.AudioEffects(),trace=[],gain=()=>({gain:{value:0},connect(target){return target;},disconnect(){}});
 a.context={state:'running',destination:{},createGain:gain,createBufferSource(){const n={buffer:null,loop:false,connect(target){return target;},disconnect(){},start(){trace.push('start');},stop(){trace.push('stop');this.onended?.();}};return n;}};
 a.buffers.set('sc2.medivac.heal',{});if(experimentalMethod)a.update=experimental;
 const p=w.addUnit('marine','terran',0,0);for(let i=0;i<300;i++){const u=w.addUnit(i<healers?'medivac':'roach',i<healers?'terran':'zerg',i%10,Math.floor(i/10)%10);if(i<healers)u.healTarget=p.id;}w.anchor={x:0,z:0};return {w,a,trace,call:()=>a.update(w)};
}
const results=[],checks=[];
for(const n of [0,1,4,30]){const pair=[audioFixture(n),audioFixture(n,true)];
 for(let k=0;k<12;k++)for(const c of pair)for(let i=0;i<100;i++)c.call();
 const samples=[];for(let k=0;k<12;k++){const row=[];for(const i of k%2?[1,0]:[0,1]){const start=performance.now();for(let j=0;j<2000;j++)pair[i].call();row[i]=(performance.now()-start)/2000;}samples.push({oldMs:row[0],newMs:row[1]});}
 results.push({healers:n,entities:301,oldMs:mean(samples.map(s=>s.oldMs)),newMs:mean(samples.map(s=>s.newMs)),fasterPairs:samples.filter(s=>s.newMs<s.oldMs).length,activeLoops:pair[0].a.healers.size,ordinaryVoices:pair[0].a.voices,samples});
 for(let step=0;step<8;step++){for(const c of pair){const h=[...c.w.entities.values()].filter(u=>u.unitType==='medivac');if(step===1)for(const u of h)u.healTarget=null;if(step===2)c.w.time+=.1;if(step===3)c.w.time+=.1;if(step===4)for(const u of h)u.healTarget=1;if(step===5)c.w.paused=true;if(step===6){c.w.paused=false;for(const u of h)u.hp=0;}if(step===7)c.a.reset();else c.call();}
  assert.deepEqual({trace:pair[0].trace,played:[...pair[0].a.played],healers:[...pair[0].a.healers.keys()],last:[...pair[0].a.healerLastActive]},{trace:pair[1].trace,played:[...pair[1].a.played],healers:[...pair[1].a.healers.keys()],last:[...pair[1].a.healerLastActive]});checks.push(n+'/'+step);
 }
}
await fs.writeFile(root+'/audio-cpu.json',JSON.stringify({pass:true,pairs:12,repeats:2000,checks,results,scope:'Actual AudioEffects.update JavaScript with instrumented AudioContext nodes. Existing production source unchanged; experimental method only reuses the per-update ID Set. Not audio decoding, GPU or audible/hardware timing.'},null,2));console.log(JSON.stringify(results.map(({samples,...r})=>r),null,2));
