import fs from 'node:fs/promises';import {openSync,closeSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const base='reports/local/v01-20261024',plan=JSON.parse(await fs.readFile(base+'/stage-window-plan.json')),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(plan.status,'implementation-in-progress');
const runs=plan.comparison.order.map(id=>({id,run:'stage-window-'+id.toLowerCase(),variant:id.startsWith('A')?'background-r1':'stage-window-r2'}));
const inputs=[];for(const f of JSON.parse(await fs.readFile(base+'/web-game-stage-window-r2-build.json')).inputs){const hash=sha(await fs.readFile(f.path));assert.equal(hash,f.sha256,f.path);inputs.push({file:f.path,sha256:hash});}
plan.comparison.runs=runs;plan.comparison.runner='stage-comparison.mjs';plan.comparison.runnerSha256=sha(await fs.readFile(base+'/stage-comparison.mjs'));plan.comparison.candidateBuild='web-game-stage-window-r2';plan.candidateInputs=inputs;plan.status='frozen-comparison-running';
await fs.writeFile(base+'/stage-window-plan.json',JSON.stringify(plan,null,2)+'\n');
const state={started:new Date().toISOString(),runs:[]};const save=()=>fs.writeFile(base+'/stage-window-sequence.json',JSON.stringify(state,null,2)+'\n');await save();
for(const spec of runs){const row={...spec,started:new Date().toISOString()};state.runs.push(row);await save();console.log('Starting '+spec.id+' '+spec.variant);
 const file=openSync(base+'/'+spec.run+'.log','wx');let result;try{result=spawnSync(process.execPath,[base+'/stage-comparison.mjs',spec.run,spec.variant,'0','1'],{env:{...process.env,V01_ENTRY_MODE:'staged',SC2_D04_TRACE:'1'},stdio:['ignore',file,file]});}finally{closeSync(file);}
 row.exitCode=result.status;row.ended=new Date().toISOString();await save();assert.equal(result.status,0,spec.run+' failed');const report=JSON.parse(await fs.readFile(base+'/'+spec.run+'/report.json'));assert.equal(report.pass,true);console.log('Completed '+spec.id);
}
state.complete=true;state.ended=new Date().toISOString();await save();
