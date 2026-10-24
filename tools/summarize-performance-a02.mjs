import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-a02-20261020',run=process.argv[2]??'final-1';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const baseline=await read(root+'/probe-3/report.json'),candidate=await read(root+'/'+run+'/report.json');
const binding=await read(root+'/binding-1/report.json');
assert.equal(baseline.status,'pass');assert.equal(binding.status,'pass');
assert.equal(candidate.status,'failed');assert.match(candidate.failure,/undefined/);
assert.ok(candidate.contextRestore&&candidate.capacityBoundaries&&candidate.received);
assert.equal(candidate.errors.length,0);
const hash=x=>createHash('sha256').update(x).digest('hex');
const normalize=raw=>{
 const w=JSON.parse(raw),id=w.run.runId;
 w.run.runId='A02-RUN';if(w.account.run?.id===id)w.account.run.id='A02-RUN';
 if(w.run.expedition.support.stageReceipt?.startsWith(id+':'))w.run.expedition.support.stageReceipt='A02-RUN'+w.run.expedition.support.stageReceipt.slice(id.length);
 return JSON.stringify(w);
};
const comparisons=[];
for(const [i,row]of candidate.rows.entries()){
 const old=baseline.rows[i];assert.equal(row.name,old.name);
 const a=normalize(old.result.snapshot.world),b=normalize(row.result.snapshot.world);
 if(a!==b){await fs.writeFile(root+'/browser-world-mismatch-before.json',a);await fs.writeFile(root+'/browser-world-mismatch-after.json',b);}
 assert.equal(b,a,row.name+' World');
 const {world:wa,...sa}=old.result.snapshot,{world:wb,...sb}=row.result.snapshot;
 assert.deepEqual(sb,sa,row.name+' presentation');
 assert.ok(row.setup.casts.every(c=>c.result),'All requested skills cast successfully');
 assert.ok(Object.values(row.result.capacities).every(c=>c.dropped===0),'No measured real-scene capacity drop');
 comparisons.push({name:row.name,worldSha256:hash(a),presentationSha256:hash(JSON.stringify(sa)),casts:row.setup.casts.length});
}
for(let i=0;i<candidate.forts.length;i++){
 const a=baseline.forts[i],b=candidate.forts[i];
 assert.equal(normalize(b.result.snapshot.world),normalize(a.result.snapshot.world));
 assert.deepEqual(b.result.snapshot.forts,a.result.snapshot.forts);
 comparisons.push({name:b.setup.outside?'fort-outside':'fort-visible',worldSha256:hash(normalize(a.result.snapshot.world)),fortsExact:true});
}
const median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
const camera=candidate.camera.map((x,i)=>{
 const old=baseline.camera[i];for(const k of ['width','height','enemies','mode','bodyCount','time','tick','entities','occluded','active'])assert.deepEqual(x[k],old[k]);
 const metrics=Object.fromEntries(x.after.metrics.map(m=>[m.name,m.value-x.before.metrics.find(n=>n.name===m.name).value]));
 // CDP windows include UI work between protocol calls. Preserve nonzero counts,
 // including resize settling, instead of assigning every layout to cameraFrame.
 if(x.mode!=='fixed'){assert.equal(metrics.LayoutCount,0);assert.equal(metrics.RecalcStyleCount,0);}
  return {width:x.width,height:x.height,enemies:x.enemies,mode:x.mode,bodyCount:x.bodyCount,baselineMedianMs:median(old.samples),candidateMedianMs:median(x.samples),layoutCount:metrics.LayoutCount,styleCount:metrics.RecalcStyleCount,layoutDurationMs:metrics.LayoutDuration*1000,styleDurationMs:metrics.RecalcStyleDuration*1000};
});
const scenes=candidate.rows.map(x=>{
 const rows=x.result.rows,frames=x.result.frames;
 const getters=Object.entries(rows).filter(([name])=>/\.(packets|dots|lines|events)$/.test(name));
 const timer=name=>({calls:rows[name]?.calls??0,msPerFrame:(rows[name]?.totalMs??0)/frames});
 return {name:x.name,frames,casts:x.setup.casts,peaks:x.result.peaks,
  getterCalls:getters.reduce((s,[_k,v])=>s+v.calls,0),getterMsPerFrame:getters.reduce((s,[_k,v])=>s+v.totalMs,0)/frames,
  beginFrame:timer('protoss.beginFrame'),childPresentation:timer('protoss.childPresentation'),
  capacities:x.result.capacities};
});
const forts=candidate.forts.map(x=>({outside:x.setup.outside,frames:x.result.frames,forts:x.result.snapshot.forts,
 loopMsPerFrame:x.result.rows['fort.loop'].totalMs/x.result.frames,
 mixerMsPerFrame:Object.entries(x.result.rows).filter(([k])=>/^fort\.\d+\.mixer$/.test(k)).reduce((s,[_k,v])=>s+v.totalMs,0)/x.result.frames}));
const cpu=await read(root+'/reward-cpu-candidate-r2-1.json');
const rewards=cpu.rows.filter(r=>r.name!=='context');assert.ok(rewards.every(r=>r.fasterPairs===12));
const result={status:'pass',run,comparisons,camera,scenes,forts,
 rewardCpu:{rows:rewards.length,pairs:rewards.reduce((s,r)=>s+r.pairs.length,0),baselineRange:range(rewards.map(r=>r.baselineMs)),candidateRange:range(rewards.map(r=>r.candidateMs)),reductionPercent:range(rewards.map(r=>-r.changePercent))},
 capacityBoundaries:{fixed:candidate.capacityBoundaries.rows.length,dynamic:candidate.capacityBoundaries.dynamic,worldExact:candidate.capacityBoundaries.worldExact},
 lifecycle:{reentry:candidate.fortReentry,contextEpochBefore:candidate.contextRestore.before.epoch,contextEpochAfter:candidate.contextRestore.after.epoch,combatExact:candidate.contextRestore.before.json===candidate.contextRestore.after.json},
 errors:candidate.errors,failedRequests:candidate.failedRequests,loadedMainSha256:binding.rows.find(x=>x.variant==='candidate-r2').sha256,binding,receivedUrls:candidate.received.length,
 scope:'Controlled production operations and legal three-hero combinations; timers include probe overhead and nested timer totals must not be added. Capacity boundary injections are separate from real-scene drops. Not natural full-campaign, all-combination/equipment, FPS, physical-input or human acceptance.'};
function range(a){return [Math.min(...a),Math.max(...a)];}
await fs.writeFile(root+'/summary.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,comparisons:comparisons.length,camera:camera.length,rewardCpu:result.rewardCpu,forts:forts.map(({forts,...r})=>r),lifecycle:result.lifecycle.contextEpochAfter,received:result.receivedUrls}));
