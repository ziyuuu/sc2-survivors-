import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as current from './fixed-performance-replay-entry.mts';
const out='reports/local/fixed-performance-20261006',baseline=await import(pathToFileURL(path.resolve(out+'/baseline-replay.mjs')).href),sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const original='reports/local/ui-integration-20261006/full-roster-third/web',files=['terran-0','terran-1','terran-2','zerg-0','zerg-1','protoss-0','protoss-1'].map(n=>original+'/'+n+'.json');files.push(out+'/fixtures/protoss-targets-100.json',out+'/fixtures/protoss-targets-300.json');
const stats=(a:number[])=>{const b=[...a].sort((a,b)=>a-b);return {count:b.length,mean:b.reduce((n,v)=>n+v,0)/b.length,p50:b[Math.floor(b.length*.5)],p95:b[Math.floor(b.length*.95)],p99:b[Math.floor(b.length*.99)]};};
const report:any={at:new Date().toISOString(),method:'Node fixed-tick replay, not browser FPS. Frozen full pre-optimization simulation bundle versus current source. Same current-format archive, input and three-second hero commands; complete config/map/state/profile graph hashes at initialization and every60 ticks. Alternating execution order. No health or clock changes during replay.',baselineBundleSha256:sha(await fs.readFile(out+'/baseline-replay.mjs')),runs:[]};
try{for(const file of files){const text=await fs.readFile(file,'utf8'),a=baseline.loadWorld(text),b=current.loadWorld(text),before:number[]=[],after:number[]=[],checks:any[]=[];assert.equal(current.state(b),baseline.state(a),file+':initial');
 for(let tick=0;tick<1800;tick++){
  const old=()=>{const at=performance.now();baseline.advance(a,tick);before.push(performance.now()-at);},next=()=>{const at=performance.now();current.advance(b,tick);after.push(performance.now()-at);};if(tick%2){next();old();}else{old();next();}
  if(tick%60===59){const left=baseline.state(a),right=current.state(b);if(left!==right){await fs.writeFile(out+'/replay-mismatch-before.json',left);await fs.writeFile(out+'/replay-mismatch-after.json',right);}assert.equal(sha(left),sha(right),file+':tick '+(tick+1));checks.push({tick:tick+1,sha256:sha(left)});}
 }
 const run={file,sha256:sha(text),ticks:1800,phase:b.phase,time:b.time,entities:b.entities.size,before:stats(before),after:stats(after),checks};report.runs.push(run);console.log(JSON.stringify({...run,checks:checks.length}));await fs.writeFile(out+'/replay.json',JSON.stringify(report,null,2));
}report.passed=true;}catch(e){report.failure=String((e as Error).stack);process.exitCode=1;}await fs.writeFile(out+'/replay.json',JSON.stringify(report,null,2));
