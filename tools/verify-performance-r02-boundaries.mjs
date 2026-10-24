import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {setup,snapshot} from './performance-r02-cases.mjs';
const root='reports/local/performance-r02-20261020',libs=[await import('../'+root+'/baseline-logic/main.mjs'),await import('../'+root+'/candidate-logic/main.mjs')],report={checks:[]};
const run=(name,fn)=>{const results=libs.map(fn);assert.deepEqual(results[1],results[0],name);report.checks.push({name,exact:true,observed:results[1].observed});};
try{
 run('strict mineral collection/attraction boundaries',lib=>{
  const {w}=setup(lib,{n:0});w.pickups=[2-1e-9,2,6-1e-9,6].map((x,i)=>({id:w.nextId++,x,z:0,minerals:5,gas:3}));
  const ids=w.pickups.map(p=>p.id);w.step();assert.equal(w.pickups.length,3);assert.equal(w.pickups[0].id,ids[1]);assert.equal(w.pickups[2].x,6);
  return {state:snapshot(lib,w),observed:{remaining:w.pickups.map(p=>({id:p.id,x:p.x})),wallet:w.wallet}};
 });
 run('equipment radius changes visible on the next fixed step',lib=>{
  const {w}=setup(lib,{n:0,gear:'radius'});const radiusBefore=lib.equipmentValue(w,'pickup_radius');assert.equal(radiusBefore,.25);w.pickups=[{id:w.nextId++,x:2.4,z:0,minerals:5,gas:3}];w.step();assert.equal(w.pickups.length,0);
  const a=w.starship.account,id=a.equipped.terran.gathering;a.equipped.terran.gathering=null;a.locations[id]={kind:'warehouse'};a.revision++;w.pickups=[{id:w.nextId++,x:2.4,z:0,minerals:5,gas:3}];w.step();assert.equal(w.pickups.length,1);
  return {state:snapshot(lib,w),observed:{radiusBefore,radiusAfter:lib.equipmentValue(w,'pickup_radius'),remaining:w.pickups.length,wallet:w.wallet}};
 });
 run('bounty promotion and hero evolution during a resource burst',lib=>{
  const {w}=setup(lib,{n:0,gear:'radius'}),a=w.starship.account;
  for(const slot of ['offense1','offense2','defense1','defense2']){const r=lib.grantEquipment(a,{template:'set.advanced.bounty.4',race:'terran',slot},'bounty:'+slot,{kind:'warehouse'});assert.ok(r.ok);a.equipped.terran[slot]=r.value.id;a.locations[r.value.id]={kind:'equipped',race:'terran',slot};a.revision++;}
  assert.equal(lib.equipmentValue(w,'bounty'),500);for(let i=0;i<12;i++)w.pickups.push({id:w.nextId++,x:.2,z:.1,minerals:1200,gas:3});w.step();assert.equal(w.pickups.length,0);assert.equal(w.starship.bounty.phase,'hero');assert.ok(w.heroes.size>0);
  return {state:snapshot(lib,w),observed:{bounty:w.starship.bounty,wallet:w.wallet,heroes:[...w.heroes.values()].map(h=>({id:h.id,rank:h.rank})),radius:lib.equipmentValue(w,'pickup_radius')}};
 });
 run('terrain obstruction toggles without a cached collection decision',lib=>{
  const {w}=setup(lib,{n:0});let clear=false;w.terrain=new lib.FlatTerrain();w.terrain.walkLine=()=>clear;w.pickups=[{id:w.nextId++,x:.2,z:0,minerals:5,gas:3}];w.step();assert.equal(w.pickups.length,1);clear=true;w.step();assert.equal(w.pickups.length,0);w.terrain=undefined;
  return {state:snapshot(lib,w),observed:{wallet:w.wallet,remaining:w.pickups.length}};
 });
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(root+'/boundaries.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
