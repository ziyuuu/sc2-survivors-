import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {run} from './performance-s09-cases.mjs';
const root='reports/local/performance-s09-20261020',revision=process.env.SC2_BATCH_REVISION??'',a=await import('../'+root+'/baseline-logic/main.mjs'),b=await import('../'+root+'/candidate'+revision+'-logic/main.mjs'),report={pass:false,rows:[],controls:[],method:'Actual production World.step, 900 ticks per case. No direct fire, windup/recovery reset or source range/damage/speed edit. Target high HP/stopped attack is diagnostic. Mixed-live allies retain autonomous movement/attack.'};
const save=()=>fs.writeFile(root+'/behavior'+(revision||'-r1')+'.json',JSON.stringify(report,null,2));
try{
 const cases=[];
 for(const id of ['baneling','baneling.1','baneling.2','baneling.3'])for(const scenario of ['contact','approach','mixed','mixed-live','air-only','chase','redirect','remove-blockers','wall','move-order'])cases.push({id,scenario,n:12});
 for(const n of [4,8,24])for(const angle of [0,1.4,3.1])cases.push({scenario:'mixed-live',n,angle,seed:1777});
 for(const theme of Object.keys(b.MAP_THEMES))for(const id of ['baneling','baneling.2'])cases.push({id,theme,scenario:'mixed-live'});
 for(const id of ['temporary','enemy'])for(const scenario of ['approach','mixed'])cases.push({id,scenario});
 for(const options of cases){
  const before=run(a,options),after=run(b,options);assert.deepEqual(after.initialStats,before.initialStats);
  assert.equal(after.terrainInvalid,0,JSON.stringify(options)+' terrain');assert.ok(after.maxTravel<.2,JSON.stringify(options)+' travel');
  if(options.scenario==='air-only'||options.scenario==='wall'||options.scenario==='move-order')assert.equal(after.shots.length,0,JSON.stringify(options)+' forbidden attack');
  else {assert.ok(after.shots.length>0,JSON.stringify(options)+' must approach/fire');if(!['temporary','enemy'].includes(options.id))for(let i=1;i<after.shots.length;i++)assert.ok(after.shots[i].time-after.shots[i-1].time>=5-1e-8);}
  if(['temporary','enemy'].includes(options.id)){assert.equal(after.shots.length,1);assert.ok(after.sourceHp<=0);assert.equal(after.shots[0].recoveryUntil,undefined);}
  if(!options.theme&&['contact','approach','air-only','chase','move-order'].includes(options.scenario))assert.deepEqual(after.states,before.states,'unblocked control '+JSON.stringify(options));
  report.rows.push({options,before:{...before,states:undefined},after:{...after,states:undefined}});console.log(JSON.stringify({options,shots:[before.shots.length,after.shots.length],clearance:after.minClearance,maxTravel:after.maxTravel}));await save();
 }
 for(const id of ['zergling','zealot','hydralisk','roach']){const options={id,scenario:'mixed-live'},before=run(a,options),after=run(b,options);assert.deepEqual(after,before);report.controls.push({id,exact:true});}
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await save();console.log(JSON.stringify({pass:report.pass,rows:report.rows.length,controls:report.controls.length,failure:report.failure}));}
