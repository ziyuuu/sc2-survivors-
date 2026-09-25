import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {SpatialHash} from '../src/simulation/movement/spatial-hash.ts';

// CPU-only A/B: identical mixed crowd, callback order and 12-contact cutoff.
const bodies=Array.from({length:300},(_,id)=>({id,x:(id%20)*.64,z:Math.floor(id/20)*.64,hp:100,maxHp:100,armor:0,unitRadius:.35,flying:id%4===0,owner:id%2?'terran':'zerg',attributes:[]}));
const hash=new SpatialHash();hash.rebuild(bodies);
const run=plane=>{let checks=0,accepted=0;
 for(const a of bodies){let n=0;const visit=b=>{checks++;if(b.id===a.id||!plane&&b.flying!==a.flying)return;const dx=a.x-b.x,dz=a.z-b.z;if(dx*dx+dz*dz<.9*.9){accepted++;if(++n>=12)return false;}};
  if(plane)hash.queryPlane(a,2.8,a.flying,visit);else hash.query(a,2.8,visit);
 }return {checks,accepted};};
const expected=run(false),actual=run(true);assert.equal(actual.accepted,expected.accepted);assert.ok(actual.checks<expected.checks);
const samples=[];for(let i=0;i<8;i++){const row={};for(const plane of i%2?[true,false]:[false,true]){const before=performance.now();for(let frame=0;frame<120;frame++)run(plane);row[plane?'plane':'mixed']=performance.now()-before;}samples.push(row);}
const median=key=>samples.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor(samples.length/2)];
const rebuildStart=performance.now();for(let frame=0;frame<960;frame++)hash.rebuild(bodies);const rebuildMs=(performance.now()-rebuildStart)/960;
console.log(JSON.stringify({bodies:bodies.length,queriesPerSample:120*bodies.length,expected,actual,medianMixedMs:median('mixed'),medianPlaneMs:median('plane'),queryRatio:median('plane')/median('mixed'),rebuildMsPerFrame:rebuildMs,samples}));
