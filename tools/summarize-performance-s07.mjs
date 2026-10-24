import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const suffix=process.argv[2]??'1',output=suffix==='1'?'':'-r'+suffix;
const root='reports/local/performance-s07-20261020',read=async p=>JSON.parse(await fs.readFile(p)),a=await read(root+'/baseline-'+suffix+'/report.json'),b=await read(root+'/candidate-'+suffix+'/report.json'),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),report={pass:true,pairs:[],runs:[a,b].map(r=>({mode:r.mode,pass:r.pass,errors:r.errors,requests:r.requests,device:r.device,build:r.build.outputs}))};
function diffs(a,b,path='',out=[]){if(Object.is(a,b))return out;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diffs(a[k],b[k],path+'.'+k,out);}else out.push({path,a,b});return out;}
const semantic=s=>({modelDraws:s.modelDraws,meshInstances:s.meshInstances,particles:s.particles,ribbonQuads:s.ribbonQuads,activeRequests:s.activeRequests,batches:s.batches.map(({key,active,submitted,dropped})=>({key,active,submitted,dropped}))});
assert.ok(a.pass&&b.pass);assert.equal(a.checkpoints.length,10);assert.equal(b.checkpoints.length,10);
for(const x of a.checkpoints){const y=b.checkpoints.find(c=>c.name===x.name),old=await read(root+'/baseline-'+suffix+'/'+x.stateFile),now=await read(root+'/candidate-'+suffix+'/'+y.stateFile),stateDiff=diffs(old,now),sourceDiff=diffs(semantic(x.source),semantic(y.source)),cameraDiff=diffs(x.render.camera,y.render.camera);report.pairs.push({name:x.name,stateDiff,sourceDiff,cameraDiff,beforeHash:hash(old),afterHash:hash(now)});if(stateDiff.length||sourceDiff.length||suffix!=='1'&&cameraDiff.length)report.pass=false;
 if(x.name==='elites-end'){assert.ok(Object.keys(now.run.terranElites.knockReady).length>0);const immortal=now.run.entities.__map.map(x=>x[1]).find(u=>u.eliteId==='immortal.3');assert.ok(immortal.protossEliteCombat.ready>0);report.nativeCallbacks={knockReady:now.run.terranElites.knockReady,pullReady:immortal.protossEliteCombat.ready};}
}
report.scenarios=a.scenarios.map((s,i)=>({name:s.name,initial:s.initial,end:s.end,candidate:b.scenarios[i].end}));
if(suffix!=='1'){
 report.originalRunStatePairs=[];
 for(const mode of ['baseline','candidate'])for(const x of (mode==='baseline'?a:b).checkpoints){const old=await read(root+'/'+mode+'-1/'+x.stateFile),now=await read(root+'/'+mode+'-'+suffix+'/'+x.stateFile),stateDiff=diffs(old,now);report.originalRunStatePairs.push({mode,name:x.name,stateDiff});if(stateDiff.length)report.pass=false;}
}
await fs.writeFile(root+'/summary'+output+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,pairs:report.pairs.map(p=>({...p,stateDiff:p.stateDiff.slice(0,5),sourceDiff:p.sourceDiff.slice(0,5)}))}));if(!report.pass)process.exitCode=1;
