import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BUILDS,observe,createCampaignController} from '../tools/qa-campaign-controller';
import {DEVELOPMENT,PRODUCTION_LINES,developmentInDirection} from '../src/data/expedition-buildings';

test('controller observation excludes cloaked enemies until public detection',()=>{
 const w=new World({terrain:false,obstacles:[],waves:false});w.start();
 const hidden=w.addUnit('zergling','zerg',4,0);hidden.cloaked=true;
 assert.ok(!observe(w).enemies.some(e=>e.id===hidden.id));
 assert.ok(w.castDetection());assert.ok(observe(w).enemies.some(e=>e.id===hidden.id));
});
test('controller never advances simulation and preserves fixed initial talents',()=>{
 for(const build of BUILDS){const w=new World({race:build.race,seed:271,terrain:false,obstacles:[],waves:false});w.start();const c=createCampaignController(w,build);const time=w.time,tick=w.tick;c.tick();assert.equal(w.time,time);assert.equal(w.tick,tick);assert.equal(Object.keys(w.runConfig!.frozenTalents.levels).length,0);}
});
test('nine approved five-family builds are represented',()=>{
 assert.equal(BUILDS.length,9);for(const race of ['terran','zerg','protoss'])assert.equal(BUILDS.filter(b=>b.race===race).length,3);for(const b of BUILDS)assert.equal(new Set(b.families).size,5);
});
test('each planned development action exists and belongs to a race direction',()=>{
 for(const b of BUILDS)for(const id of b.actions){assert.ok(DEVELOPMENT.some(d=>d.id===id&&d.race===b.race),`${b.id}: ${id}`);assert.ok(Object.entries(PRODUCTION_LINES).some(([line,d])=>d.race===b.race&&developmentInDirection(id,line as keyof typeof PRODUCTION_LINES)));}
});
test('browser controller leaves Continue to UI and handles each window once',()=>{
 const w=new World({race:'terran',waves:false,terrain:false,obstacles:[]});w.start();w.endStage();let saves=0;
 const c=createCampaignController(w,BUILDS[0],()=>saves++,{advanceIntermission:false});c.tick();assert.equal(w.phase,'reward');assert.equal(w.rewardRound,'random');const revision=w.revision,events=c.events.length;c.tick();assert.equal(w.revision,revision);assert.equal(c.events.length,events);assert.equal(saves,0);assert.ok(w.finishIntermission());assert.equal(w.stage,2);
});
