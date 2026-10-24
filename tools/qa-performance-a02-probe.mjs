import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'probe-1',variant=process.argv[3]??'baseline';
const root=path.resolve('reports/local/performance-a02-20261020',run),folder='performance-a02-20261020-'+variant;
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={run,variant,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json')),rows:[],screens:[],errors:[],failedRequests:[],status:'running'},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)+'\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9342']});
const page=context.pages()[0];page.setDefaultTimeout(120000);
const received=new Set(),responseJobs=[];
page.on('response',response=>{
 received.add(response.url());
 if(new URL(response.url()).pathname.endsWith('/main.js')&&(response.request().headers().referer??'').includes('/'+folder+'/'))responseJobs.push(response.body().then(bytes=>{report.loadedMainSha256=hash(bytes);}));
});
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const screen=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({file,sha256:hash(await fs.readFile(file))});};
try{
 await page.goto('http://127.0.0.1:4439/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.A02,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();for(;;){const s=await page.evaluate(()=>window.__B02__.readiness.state);report.loading={...s,elapsedMs:Date.now()-start};console.log('Preparing '+s.phase+' '+s.done+'/'+s.total);await save();if(s.phase==='ready')break;if(s.phase==='error')throw Error(s.error);if(Date.now()-start>600000)throw Error('Load timeout');await page.waitForTimeout(15000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>window.A02.stop());
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 for(const [race,offset,enemies]of [['terran',0,32],['terran',3,32],['protoss',0,32],['protoss',3,32],['zerg',0,32],['zerg',3,32],['terran',0,300],['protoss',3,300]]){
  console.log('Preparing heroes '+race+'/'+offset);
  const setup=await page.evaluate(async({race,offset,enemies})=>window.A02.heroScene(race,offset,enemies),{race,offset,enemies});
  await screen(race+'-'+offset+'-'+enemies+'-start');const metricsBefore=await cdp.send('Performance.getMetrics');
  const result=await page.evaluate(()=>window.A02.frames(180,1));const metricsAfter=await cdp.send('Performance.getMetrics');
  assert.equal(result.endTick-result.startTick,180);
  report.rows.push({name:race+'-'+offset+'-'+enemies,setup,result,metricsBefore,metricsAfter});
  await screen(race+'-'+offset+'-'+enemies+'-end');await save();console.log('Measured '+race+'/'+offset+'/'+enemies);
 }
 report.camera=[];
 for(const [width,height]of [[1440,900],[390,844]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(({width,height})=>window.A02.view.viewportWidth===width&&window.A02.view.viewportHeight===height,{width,height});
  for(const enemies of [0,32,300]){
   await page.evaluate(async n=>{const a=window.A02;await a.heroScene('terran',0,Math.max(3,n));if(n===0)for(const [id,u]of a.world.entities)if(u.owner==='zerg')a.world.entities.delete(id);a.draw();},enemies);
   for(const mode of ['fixed','auto','cinematic']){
    const before=await cdp.send('Performance.getMetrics');
    const result=await page.evaluate(mode=>window.A02.cameraBench(mode),mode);
    const after=await cdp.send('Performance.getMetrics');report.camera.push({width,height,enemies,before,after,...result});await save();
   }
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>window.A02.view.viewportWidth===1440);
 report.forts=[];
 for(const outside of [false,true]){
  const setup=await page.evaluate(async outside=>window.A02.fortScene(outside),outside);
  const result=await page.evaluate(()=>window.A02.frames(120,1));
  report.forts.push({setup,result});await screen(outside?'forts-outside':'forts-visible');await save();
 }
 report.capacityBoundaries=await page.evaluate(()=>window.A02.capacityBoundaries());
 assert.ok(report.capacityBoundaries.worldExact);
 for(const row of report.capacityBoundaries.rows)if(row.capacity){assert.equal(row.full,row.capacity);assert.equal(row.afterOverflow,row.capacity);}else assert.equal(row.full,4);
 for(const row of report.capacityBoundaries.dynamic??[]){assert.equal(row.afterCapacity,row.beforeCapacity*2);assert.equal(row.count,row.beforeCapacity+1);}
 await save();
 if(variant.startsWith('candidate')){
  await page.evaluate(async()=>{const a=window.A02;await a.fortScene(true);await a.frames(30,1);});
  report.fortReentry=await page.evaluate(()=>{
   const a=window.A02,old=a.snapshot().forts;for(const f of a.world.fortifications.values()){f.x-=80;f.z-=80;}a.draw();const reentered=a.snapshot().forts;
   a.world.paused=true;for(let i=0;i<20;i++)a.draw();const paused=a.snapshot().forts;
   const id=a.world.fortifications.keys().next().value;a.world.fortifications.delete(id);a.world.changed();a.draw();
   return {old,reentered,paused,removedId:id,removedMixer:!a.view.fortMixers.has(id),deathView:a.view.fortDeathViews.has(id),scope:'Controlled renderer reentry, pause and removal; not a natural fort death.'};
  });
  assert.ok(report.fortReentry.old.every(f=>!f.visible));assert.ok(report.fortReentry.reentered.some(f=>f.visible));
  assert.deepEqual(report.fortReentry.reentered.map(f=>f.time),report.fortReentry.old.map(f=>f.time));
  assert.deepEqual(report.fortReentry.paused,report.fortReentry.reentered);assert.ok(report.fortReentry.removedMixer&&report.fortReentry.deathView);
  await screen('forts-reentry-paused');
  const combat=()=>page.evaluate(()=>{const a=window.A02,w=a.world;return {epoch:a.view.contextEpoch,models:[...a.view.gpu.keys()].sort(),json:JSON.stringify({time:w.time,tick:w.tick,rng:w.rngState,phase:w.phase,paused:w.paused,entities:[...w.entities],wallet:w.wallet,stats:w.stats,expedition:w.expedition,statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account},(_k,v)=>v instanceof Map?{map:[...v]}:v instanceof Set?{set:[...v]}:v)};});
  const before=await combat();
  await page.evaluate(()=>{const a=window.A02;a.contextExtension=a.view.renderer.getContext().getExtension('WEBGL_lose_context');if(!a.contextExtension)throw Error('Missing context extension');a.contextExtension.loseContext();});
  await page.waitForFunction(()=>window.A02.view.renderer.getContext().isContextLost());
  await page.evaluate(()=>window.A02.contextExtension.restoreContext());
  await page.waitForFunction(()=>{const a=window.A02;return !a.view.renderer.getContext().isContextLost()&&!a.readiness.state.kind&&!a.view.entryPreparation&&a.view.screenWarmed.size>0;},null,{timeout:240000});
  await page.evaluate(()=>window.A02.draw(0));
  const after=await combat();assert.equal(after.epoch,before.epoch+1);assert.equal(after.json,before.json);assert.deepEqual(after.models,before.models);
  report.contextRestore={before,after};await screen('context-restored');await save();
 }
 await Promise.all(responseJobs);
 report.received=[...received];report.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.decodedBodySize})));
 assert.equal(report.loadedMainSha256,report.build.outputs.find(x=>x.file.endsWith('/main.js')).sha256);
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 report.status='pass';await save();
}catch(error){report.status='failed';report.failure=String(error.stack??error);try{await screen('failure');report.failureState=await page.evaluate(()=>({state:window.__B02__?.state(),ready:window.__B02__?.readiness.state}));}catch{}await save();console.error(error);process.exitCode=1;
}finally{await context.close();}
