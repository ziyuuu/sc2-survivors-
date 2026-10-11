import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const [build='candidate-r4',label='environment-review-r1',suite='review']=process.argv.slice(2),root='reports/local/camera-calibration-20261011',out=root+'/'+label;
for(const id of [build,label,suite])assert.match(id,/^[a-z0-9-]+$/);await fs.mkdir(out,{recursive:true});await fs.access(out+'/results.json').then(()=>{throw Error('Evidence already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),suite,startedAt:new Date().toISOString(),records:[],checks:[],errors:[]};await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(300000);
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)result.errors.push(r.status()+' '+r.url());});
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args}),persist=()=>fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));
async function capture(name){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,group:q.group,theme:q.theme,state:q.state,time:q.time,tick:q.tick,subjects:q.subjects,runtime:q.runtime,errors:q.errors});await persist();console.log(name);return q;}
const themes=(process.argv[5]?.split(',')??['industrial','mar-sara','char','ice','frontier']),viewports=[['desktop',1440,900],['landscape',844,390],['portrait',390,844],['small',320,568]];
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:300000});
 if(suite==='review')for(const theme of themes){
  for(const group of ['terrain-empty','marine','zealot','zergling']){await call('load',group,theme);if(group!=='terrain-empty')await call('ticks',300);await call('mapStage',9);await capture(theme+'-'+group+'-battle');}
  await call('mapStage',18);for(const landmark of [0,4]){await call('groundFocus',landmark);await capture(theme+'-landmark-'+landmark);}
 }
 if(suite==='matrix')for(const theme of themes)for(const group of ['terrain-empty','density-terran-18','density-zerg-18','density-protoss-18']){
  await call('load',group,theme);if(group!=='terrain-empty')await call('ticks',300);
  for(const stage of [1,9,18]){await call('mapStage',stage);for(const [name,width,height]of viewports){await page.setViewportSize({width,height});await capture(theme+'-'+group+'-stage-'+stage+'-'+name);}}
 }
 if(suite==='dense')for(const theme of themes)for(const race of ['terran','zerg','protoss']){
  const group='density-'+race+'-96';await call('load',group,theme);await call('mapStage',18);await call('ticks',300);await capture(theme+'-'+race+'-dense-idle');
  await call('move');await capture(theme+'-'+race+'-dense-move');await call('combat');await capture(theme+'-'+race+'-dense-combat');await call('ticks',300);await capture(theme+'-'+race+'-dense-combat-6');
  const before=await call('environmentState');await call('reload');assert.equal((await call('environmentState')).state,before.state);await capture(theme+'-'+race+'-dense-reloaded');
 }
 if(suite==='lifecycle')for(const theme of themes){
  await call('load','marine',theme);const cache=await call('mapCacheState');if(cache.watched){assert.equal(cache.watched.detached,true);assert.ok(cache.watched.entries.every(r=>r.disposed));result.checks.push({name:theme+'-previous-map-disposed',cache});}await call('mapStage',18);await call('ticks',300);await call('view',29);await capture(theme+'-active');const active=await call('environmentState');assert.ok(active.particles.count>0&&active.particles.count<=60);assert.equal(active.particles.cast,false);assert.equal(active.particles.receive,false);
  await page.waitForTimeout(250);assert.deepEqual((await call('environmentState')).particles,active.particles);result.checks.push({name:theme+'-pause',state:active.state,particles:active.particles});
  await call('reload');assert.deepEqual((await call('environmentState')).particles,active.particles);assert.equal((await call('environmentState')).state,active.state);result.checks.push({name:theme+'-exact-restore',state:active.state});
  await call('ticks',60);const moved=await call('environmentState');assert.notEqual(moved.particles.matrix,active.particles.matrix);await capture(theme+'-advanced');
  await call('resolution','performance',1);assert.equal((await call('environmentState')).particles.count,0);await capture(theme+'-performance');await call('resolution','native',1);
  await page.emulateMedia({reducedMotion:'reduce'});await call('draw');assert.equal((await call('environmentState')).particles.count,0);await page.emulateMedia({reducedMotion:'no-preference'});await call('draw');assert.ok((await call('environmentState')).particles.count>0);
  const before=await call('environmentState'),restored=await call('contextRestore');assert.equal(restored.before,restored.gameplayAfter);assert.deepEqual((await call('environmentState')).particles,before.particles);await capture(theme+'-context-restored');result.checks.push({name:theme+'-context',before:restored.before,after:restored.after,gameplayAfter:restored.gameplayAfter,nativeNotice:restored.nativeNotice,particles:before.particles});
  const samplers=await call('sceneSamplerAudit');result.checks.push({name:theme+'-samplers',samplers});await call('watchMapResources');
 }
 result.passed=true;
}catch(error){result.passed=false;result.failure=String(error.stack??error);result.failureState=await call('report').catch(()=>null);console.error(result.failure);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();await persist();await browser.close();await new Promise(r=>server.close(r));}
