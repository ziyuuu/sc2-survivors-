import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';import {writeArchive} from '../src/persistence/archive';
import {MAP_THEMES,campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';

const out=process.env.SC2_MAP_ART_QA_DIR??'reports/local/map-visual-polish-20261006/visual-first';
const themes=(process.env.SC2_MAP_ART_THEMES?.split(',')??Object.keys(MAP_THEMES)) as CampaignTheme[];
const mobile=process.argv.includes('--mobile');await fs.mkdir(out,{recursive:true});
const fixtures=[];
for(const theme of themes)for(const stage of [1,12]){
 const recipe={version:3 as const,seed:10608,theme},terrain=campaignTerrain(recipe),w=new World({terrain,waves:false});w.start();w.stage=stage;terrain.setStage(stage);w.paused=true;
 if(stage===12){
  const landmarks={industrial:{x:-22,z:22},'mar-sara':{x:-26,z:-16},char:{x:-26,z:19},ice:{x:21,z:17},frontier:{x:-20,z:25}};
  const p=[landmarks[theme],{x:18,z:25},{x:13,z:23},{x:21,z:21},{x:17,z:20}].find(p=>terrain.canOccupy(p,3.9))!;assert.ok(p,theme+' visual fixture must stand on open ground');
  w.anchor.x=p.x;w.anchor.z=p.z;for(const e of w.entities.values()){e.x+=p.x;e.z+=p.z;}
  for(const [i,family] of (['marine','marauder','hellion','tank'] as const).entries())w.addUnit(family,'terran',p.x+(i-1)*1.4,p.z+1.4);
 }
 const run=w.captureRun(),restored=new World({terrain:campaignTerrain(recipe),waves:false});restored.restoreRun(run);
 const file=path.resolve(out,`${theme}-${stage}.json`);await fs.writeFile(file,writeArchive({profile:w.permanentProfile.exportJSON(),run}));fixtures.push({theme,stage,file,anchor:{x:w.anchor.x,z:w.anchor.z}});
}
const server=createGameServer({webRoot:path.resolve('dist/web')});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
const page=await context.newPage(),report:any={at:new Date().toISOString(),method:'Current production renderer and UI; paused imported stage 1 and stage 12 fixtures. Overlay hidden only during a screenshot and immediately restored. Diagnostic scene, not natural campaign or human/device acceptance.',mobile,frames:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
try{
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}/`,{timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
 for(const f of fixtures){
  await page.locator('[data-action=menu-load]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await chooser).setFiles(f.file);
  await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});
  assert.equal((await page.evaluate(()=>window.__SC2_REPORT__())).readiness.phase,'ready');await page.locator('[data-action=flow-continue]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle'&&window.__SC2_REPORT__().assetsPending===0);await page.waitForTimeout(800);
  const before=await page.evaluate(()=>window.__SC2_REPORT__());assert.deepEqual(before.errors,[]);assert.equal(before.map.name,MAP_THEMES[f.theme].name);
  await page.locator('#overlay').evaluate((el:HTMLElement)=>el.style.visibility='hidden');
  try{await page.screenshot({path:out+`/${f.theme}-${f.stage}.png`});}finally{await page.locator('#overlay').evaluate((el:HTMLElement)=>el.style.removeProperty('visibility'));}
  if(f.stage===12){
   await page.locator('.end-screen [data-action=pause]').click();
   await page.waitForFunction((t:number)=>window.__SC2_REPORT__().time>t+.3,before.time);
   await page.screenshot({path:out+`/${f.theme}-${f.stage}-hud.png`});
   await page.locator('#topbar [data-action=pause]').click();
  }
  report.frames.push({...f,map:before.map,resolution:before.resolution});console.log(`${f.theme} stage ${f.stage}: ${before.map.visibleInstances} visible instances, ${before.map.visibleMeshes} batches`);
  await page.locator('[data-action=restart]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='menu');
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String((error as Error).stack??error);process.exitCode=1;report.last=await page.evaluate(()=>window.__SC2_REPORT__?.()).catch(()=>null);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));console.log(JSON.stringify({passed:report.passed,frames:report.frames.length,errors:report.errors,failure:report.failure}));}
