import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {setup,snapshot} from './performance-s06-cases.mjs';
const root='reports/local/performance-s06-20261020',a=await import('../'+root+'/baseline-logic/main.mjs'),b=await import('../'+root+'/candidate-logic/main.mjs'),report={pass:false,rows:[],method:'Full World serialization, account, RNG, events and query outputs. Same S05 source snapshot except two S06 files. Diagnostic fixture fields are identical; three established UUID fields normalized.'};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function run(lib,name,n,seed,theme){
 const {w,call}=setup(lib,name,n,seed,theme),rows=[],record=(label,value)=>rows.push({label,value:value??null,snapshot:snapshot(lib,w)});
 record('initial');record('first',call());record('repeat',call());
 for(const u of w.entities.values())assert.ok(Number.isFinite(u.hp)&&Number.isFinite(u.weaponDamage),'finite unit stats');
 if(name==='ambient-fallback')for(const u of w.entities.values())assert.ok(Math.abs(u.x)>=2+u.unitRadius||Math.abs(u.z-9)>=2+u.unitRadius,'fallback must leave the blocked desired point');
 if(name==='endless')assert.equal(w.enemyCount(),Math.min(n,300));
 if(name.startsWith('ambient')||name==='endless'){
  for(const u of w.entities.values())if(u.owner==='zerg'&&u.id%2===0)u.hp=0;record('half-dead',call());
  w.anchor.x=3;w.time=1000;record('moved-later',call());w.entities.clear();record('clear-backlog',call());
 }else if(name==='queue'){for(let i=0;i<10;i++)call();record('overlap-sorted');}
 else{
  w.entities.clear();for(const p of w.pods)p.status='destroyed';record('obstacles-removed',call());
  const u=w.addUnit('ultralisk','terran',0,8);u.unitRadius=4;record('new-large-ally',call());u.hp=0;record('same-tick-dead',call());
 }
 return rows;
}
try{
 for(const name of ['ambient','ambient-fallback','ambient-empty','endless','free','free-blocked','hive','hive-blocked','carrier','queue'])for(const n of [0,1,176,1000])for(const seed of [91,529]){
  const before=run(a,name,n,seed),after=run(b,name,n,seed);assert.deepEqual(after,before,`${name}/${n}/${seed}`);report.rows.push({name,n,seed,checkpoints:before.length,sha256:hash(before)});
 }
 for(const theme of Object.keys(a.MAP_THEMES))for(const name of ['ambient','carrier','free','hive']){
  const before=run(a,name,176,529,theme),after=run(b,name,176,529,theme);assert.deepEqual(after,before,theme+'/'+name);report.rows.push({theme,name,n:176,seed:529,checkpoints:before.length,sha256:hash(before)});
 }
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{report.checkpoints=report.rows.reduce((n,r)=>n+r.checkpoints,0);await fs.writeFile(root+'/equivalence-r3.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,rows:report.rows.length,checkpoints:report.checkpoints,failure:report.failure}));}
