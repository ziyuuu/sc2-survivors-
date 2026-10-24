import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {browserRun} from './v01-browser-helper.mjs';
const run=process.argv[2]??'growth-r1',env=await browserRun(run,'Bounded repeated native reset/new-game and map preparation, three cycles of three race/map pairs. Paused simulation; explicit GC samples distinguish retained live heap from temporary garbage. Functional/resource growth evidence, not long-session leak proof or FPS.',{profile:path.resolve('reports/local/v01-20261024/'+run+'-profile')});
const {page,cdp,root,base,report,save,setPhase}=env;
await fs.copyFile(import.meta.filename,root+'/runner.mjs');await fs.copyFile('tools/v01-browser-helper.mjs',root+'/helper.mjs');
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>globalThis.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 await page.evaluate(()=>{A03.app.view.battleBackgroundJobs=()=>[];});
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();await page.waitForFunction(()=>A03.app.readiness.state.phase==='ready',null,{timeout:240000});
 await page.evaluate(()=>{const a=A03.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.onCommitFlow=commit;};});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>!A03.app.readiness.state.kind);
 report.samples=[];
 for(let cycle=0;cycle<3;cycle++)for(const [race,theme]of [['terran','char'],['zerg','ice'],['protoss','frontier']]){
  setPhase(`${cycle}-${race}-${theme}`);
  const sample=await page.evaluate(async({cycle,race,theme})=>{
   const a=A03.app,w=a.world,v=a.view;v.entryPreparation=true;await v.prepareCampaignAssets({version:3,seed:529,theme});w.resetRun();w.selectRace(race);w.configureCampaign({version:3,seed:529,theme});w.starship.account=D04.difficultyLoadout(race,3,529);if(!w.start())throw Error('Native start rejected');w.paused=true;a.driver.reset();v.resetRun();await v.prepareCurrentAssets();await v.waitForPendingAssets();await v.compilePresentation(v.scene,v.camera);await v.warmPresentationBatches();v.entryPreparation=false;v.prepareRosterAssets();await v.waitForPendingAssets();v.render(0,1);a.hud.update();
   let nodes=0;v.scene.traverse(()=>nodes++);
   return {cycle,race,theme,time:w.time,tick:w.tick,phase:w.phase,pending:v.assetsPending,errors:v.modelErrors,models:v.gpu.size,mapViews:v.mapViews.size,activeMapBound:v.mapTerrain===w.terrain,sceneNodes:nodes,domNodes:document.querySelectorAll('*').length,gpu:{...v.renderer.info.memory,programs:v.renderer.info.programs.length},liveEntities:w.entities.size,preGcHeap:performance.memory?.usedJSHeapSize};
  },{cycle,race,theme});
  await cdp.send('HeapProfiler.collectGarbage');sample.heap=await cdp.send('Runtime.getHeapUsage');sample.dom=await cdp.send('Memory.getDOMCounters');report.samples.push(sample);await save();assert.equal(sample.pending,0);assert.deepEqual(sample.errors,[]);assert.equal(sample.time,0);assert.ok(sample.mapViews<=3);assert.equal(sample.activeMapBound,true);
 }
 for(const race of ['terran','zerg','protoss']){
  const samples=report.samples.filter(s=>s.race===race),a=samples[1],b=samples[2];report.checks.push({name:'repeat-'+race,resourceDelta:Object.fromEntries(['geometries','textures','programs'].map(k=>[k,b.gpu[k]-a.gpu[k]])),sceneNodeDelta:b.sceneNodes-a.sceneNodes,domNodeDelta:b.domNodes-a.domNodes,liveHeapDelta:b.heap.usedSize-a.heap.usedSize,samples});
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);await env.shot('failure').catch(()=>{});process.exitCode=1;}finally{await env.close();}
