import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/g03-economy-20261023',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function bigHash(p){const h=createHash('sha256');for await(const chunk of fs.createReadStream(p))h.update(chunk);return h.digest('hex');}
const a=read(root+'/analysis.json'),before=read(root+'/before.json');
const source=before.files.filter(x=>/^(src|test)\//.test(x.file));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(d+'/'+x.name):[d+'/'+x.name]);
assert.equal(source.length,825);assert.deepEqual([...walk('src'),...walk('test')].sort(),source.map(x=>x.file).sort());
for(const row of source)assert.equal(hash(row.file),row.sha256,row.file);
for(const row of before.files.filter(x=>['package.json','tsconfig.json'].includes(x.file)))assert.equal(hash(row.file),row.sha256,row.file);
assert.equal(await bigHash(before.current.file),before.current.sha256);
const priorRoot='reports/local/g03-content-20261022/before',prior=read('reports/local/g03-content-20261022/before.json').source.filter(x=>/^(src|test)\//.test(x.file));
for(const row of prior)assert.equal(hash(priorRoot+'/'+row.file),row.sha256,priorRoot+'/'+row.file);
assert.equal(hash('src/data/expedition-buildings.ts'),hash(priorRoot+'/src/data/expedition-buildings.ts'));
for(const row of read(root+'/frozen-tools/final-r2/manifest.json').tools)assert.equal(hash(row.file),row.sha256,row.file);
const races=['terran','zerg','protoss'],diffs=['easy','normal','hard','hell'];
const expectedMain=races.flatMap(r=>diffs.flatMap(d=>[0,3,5].map(q=>`current-${r}-${d}-${q}-529`)));
assert.deepEqual(a.current.map(x=>x.id).sort(),expectedMain.sort());
const expectedBefore=races.flatMap(r=>['easy','normal'].flatMap(d=>[0,3].map(q=>`before-${r}-${d}-${q}-529`)));
assert.deepEqual(a.before.map(x=>x.id).sort(),expectedBefore.sort());
assert.equal(a.sensitivity.length,6);assert.equal(a.startup.length,6);assert.equal(a.replicates.length,0);
const expectedBait=diffs.flatMap(d=>[6,12,18].flatMap(s=>[529,20261023,20261024].flatMap(seed=>[0,1,2,3].map(l=>`${d}-${s}-${seed}-${l}`))));
assert.deepEqual(a.bait.map(x=>x.id).sort(),expectedBait.sort());assert.equal(a.baitPairs.length,108);assert.equal(a.pairs.length,12);
for(const r of [...a.current,...a.before,...a.sensitivity,...a.startup,...a.crossingReplays,...a.bait]){
 assert.ok(!r.issue,r.id+': '+r.issue);assert.ok(Object.values(r.reconciliation).every(v=>Math.abs(v)<.00001),r.id);
 assert.ok(Object.values(r.totals).every(x=>!x.sources.other),r.id+': unclassified currency');
 if(r.itemLifecycle){const l=r.itemLifecycle;assert.equal(l.remainingNew+l.explicitlyDismantled+l.settlementAutoSalvaged+l.uncollectedAbsent+l.collectedLost,r.equipment.generated,r.id+': gear partition');}
}
assert.ok(a.pairs.every(x=>x.pairedSession));
let replayed=0,originLabels=0;const originRows=[];
for(const row of a.bait.filter(x=>x.bait.counts.elite>0)){
 assert.ok(row.originSupplement,row.id+': missing source replay');
 const p=read(row.file),q=read(row.originSupplement);delete p.summary.wallMs;delete q.summary.wallMs;assert.deepEqual(q.summary,p.summary,row.id+': replay summary');
 let changed=0;for(const group of ['kills','drops']){assert.equal(q.measurement[group].length,p.measurement[group].length);for(let i=0;i<q.measurement[group].length;i++){const x=q.measurement[group][i],y=p.measurement[group][i];if(x.origin!==y.origin){assert.equal(x.origin,'bait-elite');assert.equal(y.origin,'special');x.origin=y.origin;changed++;}}}
 assert.deepEqual(q.measurement,p.measurement,row.id+': replay measurements');assert.deepEqual(q.policyEvents,p.policyEvents,row.id+': replay policy');
 originRows.push({id:row.id,changedLabels:changed,otherMeasuredStateExact:true});replayed++;originLabels+=changed;
}
const dodge=read(root+'/dodge-r1.json');assert.equal(dodge.rows.length,126);assert.equal(dodge.pass,true);
const workshop=read(root+'/workshop.json');assert.equal(workshop.rows.length,36);
const probe=read(root+'/probe-final-r6/probe.json'),longProbe=read(root+'/probe-special-r5/probe.json');assert.equal(probe.pass,true);assert.equal(longProbe.pass,true);
const crossingRows=[];
for(const old of a.current.filter(r=>r.stop==='step-count-censored'&&r.activeSpecialAtStop?.kind==='crossing')){
 const next=a.crossingReplays.find(r=>r.id===old.id);assert.ok(next,old.id+': missing crossing policy replay');
 const p=read(old.file),q=read(next.file),start=p.measurement.events.find(e=>e.kind==='special-start'&&e.type==='crossing');assert.ok(start);
 const command=p.policyEvents.find(e=>e.kind==='move'&&e.time>=start.time&&e.data.x===0&&e.data.z===-50);assert.ok(command);
 const prefix=rows=>rows.filter(s=>s.time<=command.time);
 assert.deepEqual(prefix(q.measurement.samples),prefix(p.measurement.samples),old.id+': sampled state before crossing exit command');
 assert.deepEqual(prefix(q.policyEvents),prefix(p.policyEvents),old.id+': policy before crossing exit command');
 assert.equal(next.activeSpecialAtStop?.kind,'crossing',old.id+': expected persistent-command diagnostic result');
 const originalOutside=p.finalState.entities.filter(e=>e.hp>0&&Math.abs(e.z)>54),replayOutside=q.finalState.entities.filter(e=>e.hp>0&&Math.abs(e.z)>54);assert.ok(originalOutside.length>0);assert.ok(replayOutside.length>0);
 crossingRows.push({id:old.id,original:old.stop,originalStage:old.stage,originalClock:old.activeSpecialAtStop.clock,replayStop:next.stop,replayCompleted:next.completed,replayEndlessSeconds:next.endlessSeconds,originalOutside:originalOutside.length,replayOutside:replayOutside.length,sampledPrefixExactUntil:command.time,sampleCount:prefix(p.measurement.samples).length,gameChanged:false,resolved:false});
}
const entryProbe=read(root+'/crossing-entry-probe.json');assert.equal(entryProbe.confirmed,true);assert.equal(entryProbe.rows.length,5);assert.equal(entryProbe.rows.filter(x=>x.count===32&&x.allInvalidRemainOutside).length,3);
const counts=rows=>Object.fromEntries(Object.entries(Object.groupBy(rows,x=>x.stop)).map(([k,v])=>[k,v.length]));
const report={pass:true,meaning:'Evidence integrity passed; known crossing entry defect remains open, not all game behavior passed.',gameSource:{unchanged:source.length,added:0,removed:0,files:source,priorVersionSourceExact:prior.length,configUnchanged:['package.json','tsconfig.json'],current:before.current},counts:{current:36,before:12,sensitivity:6,startup:6,crossingReplays:a.crossingReplays.length,crossingEntryProbes:5,bait:144,baitPairs:108,dodge:126,originReplays:replayed,workshop:36,workshopSettled:workshop.rows.filter(x=>!x.skipped).length,workshopAttempts:workshop.rows.reduce((n,x)=>n+(x.tests?.length??0),0)},stops:{current:counts(a.current),before:counts(a.before),sensitivity:counts(a.sensitivity),startup:counts(a.startup),crossingReplays:counts(a.crossingReplays),bait:counts(a.bait)},ledger:{rows:a.current.length+a.before.length+a.sensitivity.length+a.startup.length+a.crossingReplays.length+a.bait.length,unreconciled:0,unclassifiedCurrency:0,equipmentPartitionExact:true},originReplay:{replayed,changedLabels:originLabels,otherMeasuredStateExact:true,rows:originRows},crossingPolicy:{rows:crossingRows,originalsRetained:true,resolved:false,nativeEntryDefectConfirmed:true,entryProbe:root+'/crossing-entry-probe.json'},probe:{final:probe,long:longProbe},notExecuted:['12 second-seed blue full routes','6 orange pre-G03 comparison routes','human or natural full-campaign acceptance','new browser, FPS, full regression or build validation'],oldFailuresRetained:['pilot-r1','pilot-r2','pilot-r3','probe-r1','probe-r2','probe-r3','probe-special-r4','main-r1','bait-r1','bait-r2','sensitivity-r1 controller failure'],toolsFinalR2Exact:true};
fs.writeFileSync(root+'/verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pass:true,counts:report.counts,stops:report.stops,sourceExact:source.length,originReplays:replayed,originLabels}));
