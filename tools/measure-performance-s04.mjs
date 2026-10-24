import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import * as old from '../reports/local/performance-s04-20261020/baseline-logic/main.mjs';
import * as current from '../reports/local/performance-s04-20261020/candidate-logic/main.mjs';
import {setup,snapshot} from './performance-s04-cases.mjs';
const root='reports/local/performance-s04-20261020',results=[],mean=a=>a.reduce((a,b)=>a+b,0)/a.length;
for(const [name,n,iterations]of [['attributes',1,500],['attributes',16,300],['attributes',100,200],['attributes',300,100],['double',300,100],['split',300,100],['bounce',300,50],['cleave',300,100],['pierce',300,100],['dot',300,100],['combined',300,30],['acid',16,30],['acid',300,10],['hero-raynor',300,100],['hero-tosh',300,100],['snapshot',300,30]]){
 const pair=[setup(old,name,n),setup(current,name,n)],counts=[];
 for(const c of pair){const original=c.w.entities.values.bind(c.w.entities),hypot=Math.hypot,clone=globalThis.structuredClone,query=c.w.hash.query.bind(c.w.hash);let scans=0,visits=0,distances=0,clones=0,queries=0;
  c.w.entities.values=function*(){scans++;for(const u of original()){visits++;yield u;}};Math.hypot=(...a)=>{distances++;return hypot(...a);};globalThis.structuredClone=(...a)=>{clones++;return clone(...a);};c.w.hash.query=(...a)=>{queries++;return query(...a);};
  try{c.call();}finally{c.w.entities.values=original;Math.hypot=hypot;globalThis.structuredClone=clone;c.w.hash.query=query;}counts.push({scans,visits,distances,clones,queries});
 }
 assert.deepEqual(snapshot(old,pair[0].w),snapshot(current,pair[1].w),name);
 for(let i=0;i<12;i++)for(const c of pair)c.call();const rounds=[];
 for(let r=0;r<12;r++){const row={round:r};for(const j of r%2?[1,0]:[0,1]){const start=performance.now();for(let k=0;k<iterations;k++)pair[j].call();row[j?'new':'old']=(performance.now()-start)/iterations;}rounds.push(row);}
 const row={name,n,iterations,rounds,counts,oldMs:mean(rounds.map(r=>r.old)),newMs:mean(rounds.map(r=>r.new)),fasterPairs:rounds.filter(r=>r.new<r.old).length};results.push(row);
 await fs.writeFile(root+'/cpu.json',JSON.stringify({results,method:'Production functions on independent equal Worlds in one Node process, twelve warmups and twelve pairs with alternating order. Counters outside timed loops. Attack fixtures reset handled/transient outputs; acid resets due time/gates; hero resets cooldown/casts. These costs include fixture resetting, exclude browser/GPU and are not FPS.'},null,2));console.log(JSON.stringify({name,n,oldMs:row.oldMs,newMs:row.newMs,fasterPairs:row.fasterPairs,counts}));
}
