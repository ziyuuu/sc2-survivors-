import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

const [directory,packed]=process.argv.slice(2);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const run=read(path.join(directory,fs.readdirSync(directory).filter(f=>/^\d+\.json$/.test(f)).sort().at(-1)));
assert(run.completed);assert.equal(run.rows.length,55);assert.deepEqual(run.errors,[]);
assert.equal(run.account,'fresh');assert.equal(run.mode,'controlled 4x fixed-step with allied healing');
assert.equal(run.rows.at(-1).kind,'endless');assert(run.eliteTiming.jobs.every(j=>j.ok));
assert(run.rows.every(r=>!r.errors.length&&r.seed===529&&r.difficulty==='easy'&&r.texture==='medium'));
const {metrics,profile}=read(path.join(directory,'frames.cpuprofile'));
const navigation=metrics.find(m=>m.name==='NavigationStart').value*1000;
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();
for(const n of nodes.values())for(const child of n.children??[])parent.set(child,n.id);
const release=read(path.join(packed,'web-release.json'));
assert.equal(release.appBuildId,run.build);
const code=gunzipSync(fs.readFileSync(path.join(packed,'assets','sc2-entry.'+release.compressedEntrySha256.slice(0,16)+'.js.gz'))).toString().split('\n');
const stamp=n=>n.callFrame.functionName||'(anonymous)';
function site(n){
 const f=n.callFrame,line=code[f.lineNumber];
 return {name:stamp(n),...(f.url.startsWith('blob:')&&line?{line:f.lineNumber+1,column:f.columnNumber,code:line.slice(f.columnNumber,f.columnNumber+110)}:{})};
}
const times=[];let t=profile.startTime/1000-navigation;
for(const delta of profile.timeDeltas){t+=delta/1000;times.push(t);}
const round=x=>+x.toFixed(1),mb=x=>round(x/2**20);
function hotspots(start,stop){
 const groups=new Map();
 for(let i=0;i<times.length;i++){
  if(times[i]<start)continue;if(times[i]>=stop)break;
  const id=profile.samples[i];groups.set(id,(groups.get(id)??0)+1);
 }
 return [...groups].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,count])=>{
  const stack=[];for(let k=id;k!==undefined&&stack.length<10;k=parent.get(k))stack.push(site(nodes.get(k)));
  return {count,stack};
 });
}
function detail(row){
 const spans=row.spans.filter(x=>x.end>=row.start&&x.start<row.stop).map(x=>({label:x.label,offset:round(x.start-row.start),ms:round(x.end-x.start),program:x.program})).sort((a,b)=>b.ms-a.ms).slice(0,12);
 return {ms:round(row.ms),age:round(row.age),prevAge:round(row.prevAge),entities:row.entities,special:row.special,pending:row.pending,spans,
  callbackDelayMs:round(row.end-row.stop),cpu:hotspots(row.start,row.stop)};
}
const stages=[];
for(let n=1;n<=18;n++){
 const f=run.frames.stages[n],records=run.rows.filter(r=>r.stage===n&&r.kind!=='endless');
 assert.deepEqual(records.map(r=>r.kind),['after','before','intermission']);
 assert(Math.abs(run.eliteTiming.stageFrames[n].maxMs-f.longest[0].ms)<.5);
 stages.push({stage:n,maxMs:round(f.longest[0].ms),age:round(f.longest[0].age),over100:f.over100,frames:f.count,histogram5ms:f.hist,
  trackedMiB:records.map(r=>mb(r.memory.trackedBytes)),processMiB:records.map(r=>r.privateBytes?mb(r.privateBytes):null),
  nydusTextureMiB:records.map(r=>mb(r.inventory.byId['model.fun-nydus']??0))});
}
const firstSampleGap=run.frames.stages[15].longest.find(f=>f.start<=times[0]&&f.stop>=profile.startTime/1000-navigation);
const result={build:run.build,resource:run.resourceRelease,stages,target16:run.frames.stages[16].longest.map(detail),open17:run.frames.windows.open17.map(detail),
  profilerStartup:{firstSampleAfterMs:round(profile.timeDeltas[0]/1000),overlappingFrameMs:firstSampleGap?round(firstSampleGap.ms):null},
  peakMiB:mb(Math.max(...run.rows.map(r=>r.memory.peakTrackedBytes))),processPeakMiB:mb(Math.max(...run.rows.map(r=>r.privateBytes??0))),endlessMiB:mb(run.rows.at(-1).memory.trackedBytes),
  reloads:run.eliteTiming.jobs.filter(j=>j.ok&&j.reload&&j.phase==='battle').map(j=>j.key),pressure:run.switches.map(x=>[x.stage,x.pressure])};
console.log(JSON.stringify(result,null,2));
