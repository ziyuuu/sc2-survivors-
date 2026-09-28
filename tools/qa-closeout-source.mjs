import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='reports/local/closeout-source-browser';await fs.mkdir(out,{recursive:true});
const report={scope:'Synthetic real WebGL source presentation, cold required-resource failure/retry. Not natural combat or human acceptance.',errors:[],checks:[],screens:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/model.pylon.birth.glb',r=>r.abort());
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').click();await page.locator('[data-action=menu-race][data-race=protoss]').click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='error',null,{timeout:240000});
 const state=()=>{const v=window.__SC2_DEBUG__.view;return {children:v.scene.children.length,gpu:[...v.gpu.keys()].sort(),maps:v.mapViews.size,loaded:v.initialAssetsLoaded,birth:v.podBirthTemplates.size};};
 const first=await page.evaluate(state);assert.equal(first.loaded,false);assert.equal(first.maps,0);assert.equal(first.birth,0);report.initialFailure=await page.evaluate(()=>({readiness:window.__SC2_REPORT__().readiness,overlay:document.querySelector('#overlay')?.textContent,buttons:[...document.querySelectorAll('#overlay button')].map(b=>b.getAttribute('data-action'))}));
 await page.locator('[data-action=flow-retry]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='error');const second=await page.evaluate(state);assert.deepEqual(second,first);
 await page.screenshot({path:out+'/birth-required-failure.png'});report.screens.push('birth-required-failure.png');
 await page.unroute('**/model.pylon.birth.glb');await page.locator('[data-action=flow-retry]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});
 const ready=await page.evaluate(state);assert.equal(ready.loaded,true);assert.equal(ready.birth,1);assert.equal(ready.maps,1);
 await page.evaluate(async()=>{const v=window.__SC2_DEBUG__.view;await v.prepareRescueAssets('protoss');await v.prepareRescueAssets('protoss');});assert.deepEqual(await page.evaluate(state),ready);
 report.checks.push({coldFailure:first,repeatedFailure:second,recovered:ready,repeatedPrepareStable:true});
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 await page.evaluate(()=>{const {world:w}=window.__SC2_DEBUG__;window.__SC2_DEBUG__.speed=0;w.autoWaves=false;w.entities.clear();w.pods=[];w.visualEvents=[];const p=w.spawnPod('zealot',{...w.anchor});p.guardianIds.clear();window.__SOURCE_POD_ID__=p.id;});
 for(const progress of [0,.5,.7,.99,1]){
  const data=await page.evaluate(progress=>{const {world:w,view:v}=window.__SC2_DEBUG__,p=w.pods.find(p=>p.id===window.__SOURCE_POD_ID__);w.time=p.createdAt+(p.landedAt-p.createdAt)*progress;p.status=progress===1?'active':'falling';const before=JSON.stringify(p);v.render(0,1);const pv=v.podViews.get(p.id);return {progress,unchanged:JSON.stringify(p)===before,state:pv.state,birthTime:pv.birthMixer?.time,birthVisible:pv.birthModel?.visible,bodyVisible:pv.model.visible,sourceClips:v.podBirthTemplates.get('protoss').animations.map(c=>c.name)};},progress);
  assert.equal(data.unchanged,true);assert.equal(data.birthVisible,progress<1);assert.equal(data.bodyVisible,progress===1);if(progress<1)assert.ok(Math.abs(data.birthTime-progress*6)<.002);report.checks.push(data);
  const name=`pylon-birth-${progress}.png`;await page.screenshot({path:out+'/'+name});report.screens.push(name);
 }
 await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.pods=[];w.entities.clear();v.resetRun();w.time=50;const p=w.freePosition('colossus',w.anchor,0,8);if(!p)throw Error('No legal Colossus location');const u=w.addUnit('colossus','terran',p.x,p.z);window.__SOURCE_COLOSSUS__=u.id;await v.ensureUnitVariant('colossus','colossus');const t=w.addUnit('roach','zerg',p.x,p.z);t.hp=t.maxHp=1e8;w.fire(u,t);t.x=t.prev.x=200;t.z=t.prev.z=200;u.action='idle';});
 for(const mode of ['complete','energy-saving']){
  const data=await page.evaluate(mode=>{const {world:w,view:v}=window.__SC2_DEBUG__;v.setAnimationMode(mode);const u=w.entities.get(window.__SOURCE_COLOSSUS__),rows=[];for(const age of [0,.2,.7]){w.time=50+age;v.render(0,1);const p=v.animationStates.get(u.id)?.sampled;rows.push({age,pose:p?.action,seconds:p?.seconds,shot:u.shotSequence});}return {mode,rows,clips:v.batches.get('colossus').gltf.animations.map(c=>c.name)};},mode);assert.ok(data.clips.includes('Stand Channel Start'));assert.ok(data.rows.every(r=>r.shot>0&&['attack','attackChannel'].includes(r.pose)));report.checks.push(data);const name=`colossus-${mode}.png`;await page.screenshot({path:out+'/'+name});report.screens.push(name);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report));
