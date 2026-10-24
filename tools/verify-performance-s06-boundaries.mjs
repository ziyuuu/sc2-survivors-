import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {setup,snapshot} from './performance-s06-cases.mjs';
const root='reports/local/performance-s06-20261020',libs=[await import('../'+root+'/baseline-logic/main.mjs'),await import('../'+root+'/candidate-logic/main.mjs')],report={pass:false,rows:[]};
function check(name,run){const rows=libs.map(run);assert.deepEqual(rows[1],rows[0],name);report.rows.push({name,pass:true});}
try{
 for(const difficulty of ['easy','normal','hard','hell'])for(const stage of [1,2,5,18])check(`${difficulty}-stage-${stage}`,lib=>{
  const {w}=setup(lib,'ambient',176);w.difficulty=difficulty;w.stage=stage;
  for(const e of w.ambientBacklog){e.campaignStage=stage;e.stamp=w.enemyStamp(stage,e.lane/60);e.stamp.density=[.3,.5,1][e.lane%3];}
  w.releaseAmbient();assert.equal(w.enemyCount(),176);return snapshot(lib,w);
 });
 check('fallback-tie-retains-first',lib=>{
  const {w}=setup(lib,'ambient-fallback',1);w.spawnCells=[{x:-3,z:9},{x:3,z:9}];w.releaseAmbient();const u=[...w.entities.values()][0];assert.equal(u.x,-3);return snapshot(lib,w);
 });
 check('fallback-none-retains-head-and-original-rng-draw',lib=>{
  const {w}=setup(lib,'ambient-fallback',1);w.spawnCells=[{x:0,z:9}];const before=w.rngState;w.releaseAmbient();assert.equal(w.enemyCount(),0);assert.equal(w.ambientBacklog.length,1);assert.notEqual(w.rngState,before);return snapshot(lib,w);
 });
 check('endless-all-entrances-blocked-then-reopened',lib=>{
  const {w}=setup(lib,'endless',176);for(let i=0;i<8;i++){const a=i*Math.PI/4;w.addUnit('marine','terran',Math.sin(a)*69,Math.cos(a)*69);}
  w.releaseAmbient();assert.equal(w.enemyCount(),0);assert.equal(w.ambientBacklog.length,176);for(const u of w.entities.values())u.hp=0;w.releaseAmbient();assert.equal(w.enemyCount(),176);return snapshot(lib,w);
 });
 check('ambient-priority-keeps-swarm-pending',lib=>{
  const {w}=setup(lib,'ambient',1);w.swarm.pending=[{at:0,bearing:0,counts:{zergling:8,roach:0,hydralisk:0}}];w.releaseSwarm();assert.equal(w.swarm.spawned,0);assert.equal(w.swarm.pending[0].counts.zergling,8);return snapshot(lib,w);
 });
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(root+'/boundaries.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.rows.length,failure:report.failure}));}
