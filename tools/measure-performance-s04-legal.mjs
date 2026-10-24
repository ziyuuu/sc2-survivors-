import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import * as old from '../reports/local/performance-s04-20261020/baseline-logic/main.mjs';
import * as current from '../reports/local/performance-s04-20261020/candidate-logic/main.mjs';
import {legal,snapshot} from './performance-s04-cases.mjs';
const root='reports/local/performance-s04-20261020',results=[],mean=a=>a.reduce((a,b)=>a+b,0)/a.length;
for(const name of ['attributes','double','split','cleave','pierce','dot','moving']){
 const pair=[legal(old,name,300),legal(current,name,300)],counts=[];for(const c of pair){for(const t of c.targets)t.hp=t.maxHp=1e12;const fire=c.call;c.call=()=>{c.w.visualEvents=[];c.w.effects=[];c.w.starship.combat.burns=[];fire();};}
 for(const c of pair){const original=c.w.entities.values.bind(c.w.entities),hypot=Math.hypot;let scans=0,visits=0,distances=0;c.w.entities.values=function*(){scans++;for(const u of original()){visits++;yield u;}};Math.hypot=(...a)=>{distances++;return hypot(...a);};try{c.call();}finally{c.w.entities.values=original;Math.hypot=hypot;}counts.push({scans,visits,distances});}
 assert.deepEqual(snapshot(old,pair[0].w),snapshot(current,pair[1].w),name);for(let i=0;i<12;i++)for(const c of pair)c.call();const rounds=[],iterations=40;
 for(let r=0;r<12;r++){const row={round:r};for(const j of r%2?[1,0]:[0,1]){const start=performance.now();for(let k=0;k<iterations;k++)pair[j].call();row[j?'new':'old']=(performance.now()-start)/iterations;}rounds.push(row);}
 const row={name,n:300,iterations,rounds,counts,oldMs:mean(rounds.map(r=>r.old)),newMs:mean(rounds.map(r=>r.new)),fasterPairs:rounds.filter(r=>r.new<r.old).length};results.push(row);
 await fs.writeFile(root+'/legal-cpu.json',JSON.stringify({results,method:'Real inventory grants/equip, full World.fire with selected module/set effects and trueDps affix. Targets have diagnostic 1e12 HP. Twelve warmups, twelve alternating pairs, forty attacks each. Resets only transient visual/effect/burn outputs between repeated calls. Instrumented counts outside timing. Node CPU, not FPS.'},null,2));console.log(JSON.stringify({name,oldMs:row.oldMs,newMs:row.newMs,fasterPairs:row.fasterPairs,counts}));
}
