import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';import {writeArchive,readArchive} from '../src/persistence/archive';
import {MAP_THEMES,CAMPAIGN_MAP_ID,campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';
import {RUN_SCHEMA} from '../src/simulation/persistence/run-snapshot';

const offline=process.argv.includes('--offline'),mapsOnly=process.argv.includes('--maps-only'),out=process.env.SC2_MAP_QA_DIR??'reports/local/cleanup-five-maps-20261006/'+(offline?'offline':'web')+(mapsOnly?'-maps':'');
await fs.mkdir(out,{recursive:true});
const fixtures=[];
for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[]){
 const recipe={version:3 as const,seed:10608,theme},w=new World({terrain:campaignTerrain(recipe),waves:false});w.start();w.stage=18;w.terrain!.setStage!(18);w.paused=true;
 const run=w.captureRun(),copy=new World({terrain:campaignTerrain(recipe),waves:false});copy.restoreRun(run);
 const file=path.resolve(out,theme+'.json');await fs.writeFile(file,writeArchive({profile:w.permanentProfile.exportJSON(),run}));fixtures.push({theme,file,recipe,hash:run.config.mapHash});
}
const server=createGameServer({webRoot:path.resolve('dist/web')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
const context=await browser.newContext({viewport:offline?{width:390,height:844}:{width:1440,height:900},hasTouch:offline,isMobile:offline,acceptDownloads:true});if(offline)await context.setOffline(true);
const page=await context.newPage(),report:any={at:new Date().toISOString(),offline,method:'Five saved map fixtures through production UI, three fresh random new games, physical input simulation and save/reload. Geometry tests cover dimensions and connected paths; this is not difficulty parity or physical device acceptance.',newGames:[],maps:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(offline&&r.url().startsWith('http'))report.errors.push('Offline request: '+r.url());});
const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});assert.equal((await page.evaluate(()=>window.__SC2_REPORT__())).readiness.phase,'ready');};
const exported=async()=>{const pending=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();return readArchive(await fs.readFile((await(await pending).path())!,'utf8')).bundle.run!;};
const title=async()=>{await page.locator('[data-action=restart]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='menu');};
const importMap=async(file:string)=>{await page.locator('[data-action=menu-load]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await chooser).setFiles(file);await page.locator('[data-action=menu-load-ready]').click();await ready();await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle'&&window.__SC2_REPORT__().assetsPending===0);};
// Temporarily hide only the pause overlay for a stable terrain capture, restoring it immediately.
const capture=async(name:string)=>{await page.locator('#overlay').evaluate((e:HTMLElement)=>e.style.visibility='hidden');try{await page.screenshot({path:out+'/'+name+'.png'});}finally{await page.locator('#overlay').evaluate((e:HTMLElement)=>e.style.removeProperty('visibility'));}};
try{
 await page.goto(offline?pathToFileURL(path.resolve('dist/SC2-Survivors-Current-20261006.html')).href:`http://127.0.0.1:${(server.address() as any).port}/`,{timeout:240000});
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
 for(const race of mapsOnly?[]:offline?['zerg']:['terran','zerg','protoss']){
  await page.locator('[data-action=menu-new]').click();await page.locator('[data-action=menu-race][data-race='+race+']').click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();await ready();await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().time>.2);await page.locator('#topbar [data-action=pause]').click();
  const run=await exported();assert.equal(run.schema,RUN_SCHEMA);assert.equal(run.config.mapId,CAMPAIGN_MAP_ID);assert.equal(run.config.race,race);assert.deepEqual([run.state.anchor.x,run.state.anchor.z],[0,0]);
  if(report.newGames.length)assert.notEqual(run.config.campaignMap!.theme,report.newGames.at(-1).recipe.theme);
  report.newGames.push({race,recipe:run.config.campaignMap,anchor:run.state.anchor});await capture(race+'-new-center');await title();
 }
 for(const f of fixtures.filter(f=>!offline||['ice','frontier'].includes(f.theme))){
  await importMap(f.file);let run=await exported(),r=await page.evaluate(()=>window.__SC2_REPORT__());
  assert.deepEqual({...run.config.campaignMap},f.recipe);assert.equal(run.config.mapHash,f.hash);assert.deepEqual([run.state.anchor.x,run.state.anchor.z],[0,0]);assert.equal(r.map.name,MAP_THEMES[f.theme].name);assert.deepEqual(r.errors,[]);await capture(f.theme+'-terrain');
  // Use the default mouse/joystick controls, after the unpause HUD has settled.
  await page.locator('.end-screen [data-action=pause]').click();const before=r.time;
  await page.waitForFunction(()=>document.body.dataset.battleActionsReady==='true'&&window.__SC2_REPORT__().assetsPending===0);
  await page.waitForTimeout(250);
  let touch:any;
  if(offline){const box=await page.locator('#joystick').boundingBox();assert.ok(box);touch=await context.newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height/2;await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-30}]});}
  else{const box=await page.locator('#battle').boundingBox();assert.ok(box);await page.locator('#battle').click({position:{x:box.width/2,y:box.height/2-180}});}
  await page.waitForFunction((t:number)=>window.__SC2_REPORT__().time>t+4,before,{timeout:30000});
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
  await page.locator('#topbar [data-action=pause]').click();run=await exported();assert.ok(Math.hypot(run.state.anchor.x,run.state.anchor.z)>.5);assert.deepEqual({...run.config.campaignMap},f.recipe);await capture(f.theme+'-route');
  await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'));const after=await exported();
  await page.reload({timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');await page.locator('[data-action=menu-load]').click();await page.locator('[data-action=menu-load-local]').click();await page.locator('[data-action=menu-load-ready]').click();await ready();await page.locator('[data-action=flow-continue]').click();const loaded=await exported();
  assert.deepEqual(loaded.config,after.config);assert.deepEqual(loaded.state.anchor,after.state.anchor);assert.equal(loaded.state.time,after.state.time);assert.equal(loaded.state.paused,true);
  report.maps.push({theme:f.theme,name:MAP_THEMES[f.theme].name,sourceHash:f.hash,placements:r.map.placements,area:r.map.area,rendered:true,movement:true,reloaded:true,debugApi:false});console.log(f.theme+': render, movement and exact map reload passed');await title();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});report.last=await page.evaluate(()=>window.__SC2_REPORT__?.()).catch(()=>null);}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({passed:report.passed,newGames:report.newGames.length,maps:report.maps.length,errors:report.errors,failure:report.failure}));}
