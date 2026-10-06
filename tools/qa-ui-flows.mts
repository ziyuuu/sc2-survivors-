import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';import {readArchive,writeArchive} from '../src/persistence/archive';import {encodeGraph} from '../src/persistence/graph-codec';
import {campaignTerrain} from '../src/data/campaign-map';
const out=process.env.SC2_UI_QA_DIR??'reports/local/ui-integration-20261006/flows-first';await fs.mkdir(out,{recursive:true});
const w=new World({terrain:campaignTerrain({version:3,seed:10608,theme:'industrial'}),waves:false,seed:10608});w.start();w.endStage();w.wallet={minerals:10000,gas:10000};
const fixture=path.resolve(out,'intermission.json');await fs.writeFile(fixture,writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));
const server=createGameServer({webRoot:path.resolve('dist/web')});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(20000);
const report:any={appBuildId:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')).appBuildId,at:new Date().toISOString(),checks:[],screens:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const shot=async(name:string)=>{await page.screenshot({path:out+'/'+name+'.png'});report.screens.push(name);};
const state=(run:any)=>JSON.stringify(encodeGraph(run));
const exportRun=async()=>{const task=page.waitForEvent('download');await page.locator('[data-action=save-export]:visible').click();return readArchive(await fs.readFile(await(await task).path(),'utf8')).bundle.run!;};
const stored=async()=>{await page.locator('[data-action=ui-page][data-page=rest]').click();const run=await exportRun();await page.locator('[data-action=ui-back]').click();return run;};
try{
 await page.goto(`http://127.0.0.1:${(server.address() as any).port}/`,{timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-load]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await chooser).setFiles(fixture);await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await shot('development');
 const before=await stored();
 for(const target of ['production','rest','catalog']){await page.locator(`[data-action=ui-page][data-page=${target}]`).click();await shot(target);if(target==='catalog'){
  for(const filter of ['ordinary','elite','hero','development','support','training']){await page.locator(`[data-action=ui-catalog-filter][data-filter=${filter}]`).click();await page.locator('[data-action=ui-catalog-detail]').first().click();await shot('catalog-'+filter);assert.equal(await page.locator('[data-action=reward]').count(),0);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-ui-route=catalog]').count(),1);}
 }await page.keyboard.press('Escape');assert.equal(await page.locator('[data-ui-route=root]').count(),1);}
 await page.locator('[data-action=settings]').click();for(const tab of ['controls','graphics','saves']){await page.locator(`[data-action=settings-tab][data-tab=${tab}]`).click();await shot('settings-'+tab);}await page.locator('[data-action=settings-back]').click();
 assert.equal(state(await stored()),state(before));report.checks.push('catalogue six categories, production, rest, settings and one-level Escape preserve full run');
 await page.locator('[data-action=ui-page][data-page=direction]').click();await page.locator('[data-action=development-direction]').first().click();await shot('development-offers');
 const quoteBefore=await stored();const model=new World();model.restoreRun(quoteBefore);const offer=model.rewards.find(r=>model.canChooseReward(r));assert.ok(offer);assert.ok(model.choose(offer.offerId));
 await page.locator(`[data-action=ui-offer][data-id="${offer.offerId}"]`).click();await shot('development-detail');await page.locator(`[data-action=reward][data-id="${offer.offerId}"]`).click();await shot('shop');assert.equal(state(await stored()),state(model.captureRun()));report.checks.push('development confirmation equals one original World.choose command');
 const shopBefore=await stored();
 for(const target of ['heroes','contracts']){await page.locator(`[data-action=ui-page][data-page=${target}]`).click();await shot(target);if(target==='contracts'&&await page.locator('[data-action=ui-contract]').count()){
   await page.locator('[data-action=ui-contract]').first().click();await shot('contract-variants');await page.locator('[data-action=ui-elite]').first().click();await shot('elite-detail');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-ui-route=contract]').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-ui-route=contracts]').count(),1);
  }await page.keyboard.press('Escape');}
 assert.equal(state(await stored()),state(shopBefore));report.checks.push('hero and elite variant browsing is read-only');
 const first=page.locator('[data-action=ui-offer]').first();await first.click();await shot('shop-detail');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-action')),'ui-offer');
 for(const [width,height] of [[540,900],[844,390],[667,375],[390,844],[320,568]]){await page.setViewportSize({width,height});await shot(`shop-${width}x${height}`);await page.locator('[data-action=ui-page][data-page=catalog]').click();await page.locator('[data-action=ui-catalog-filter][data-filter=elite]').click();await page.locator('[data-action=ui-catalog-detail]').last().click();await shot(`detail-${width}x${height}`);await page.keyboard.press('Escape');await page.keyboard.press('Escape');}
 await page.locator('[data-action=settings]').click();await page.locator('[data-action=settings-tab][data-tab=graphics]').click();await page.locator('[data-setting=text-scale]').selectOption('1.5');await shot('settings-150-percent');await page.locator('[data-setting=text-scale]').selectOption('1');await page.locator('[data-action=settings-back]').click();
 assert.equal(state(await stored()),state(shopBefore));assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String((e as Error).stack);process.exitCode=1;await shot('failure').catch(()=>{});}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify(report));}
