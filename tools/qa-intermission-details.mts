import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';
import {campaignTerrain} from '../src/data/campaign-map';
import {writeArchive} from '../src/persistence/archive';
import {createGameServer} from './coze-web-server.mjs';

const offline=process.argv.includes('--offline');
const out=process.env.SC2_INTERMISSION_DETAIL_DIR??`reports/local/intermission-integration-20261009/${offline?'offline':'details'}`;
await fs.mkdir(out,{recursive:true});
const html=path.resolve('dist/SC2-Survivors-Intermission-UI-20261009.html');
const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(n=>n.race==='terran'&&n.line==='army').map(n=>[n.id,n.maxRank]));
const q=profile.previewTalentAllocation('terran',0,levels)!;assert.ok(profile.commitTalentAllocation(q,q.expectedRevision));
function world(talents=false){const w=new World({seed:21,waves:false,permanentProfile:talents?profile:undefined,terrain:campaignTerrain({version:3,seed:21,theme:'industrial'})});assert.ok(w.start());for(const p of Object.values(w.expedition.production))p.enabled={};return w;}
async function write(name:string,w:World){const file=path.resolve(out,name+'.json');await fs.writeFile(file,writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));return file;}
// Current diagnostic scenes reach native actions; no export/import matching or old-save compatibility assertions.
const w=world(true);while(w.familySeatCount('marine')<w.rosterCap)w.addFamilyMember('marine',{x:w.familySeatCount('marine')*3,z:0},1);
w.acquireHero('raynor');w.hit(w.heroEntity('raynor')!,1e9);w.ordinaryUnits('marine')[0].hp=1;
w.stage=3;w.endStage();w.skipReward();w.wallet={minerals:10000,gas:10000};assert.ok(w.expedition.eliteContracts.length);const services=await write('services',w);
const arrivals:Record<string,string>={};for(const kind of ['elite','hero']){const a=world();a.random=()=>kind==='hero'?.1:.5;const boss=a.spawnSpecial('zergling','boss',a.anchor)!;a.hit(boss,1e9,[],1,'terran');for(const d of a.rewardDrops)if(d.bossLootReceipt&&(d.reward as any).expeditionEffect.kind==='elite')d.bossLootVariant='marine.2';a.paused=true;arrivals[kind]=await write(kind,a);}
const server=offline?null:createGameServer({webRoot:path.resolve('dist/web'),assetRoot:path.resolve('dist/web'),backendOptions:{enabled:false}});if(server)await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const url=offline?pathToFileURL(html).href:'http://127.0.0.1:'+(server!.address()as any).port;
const browser=offline?null:await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const browserProfile=offline?await fs.mkdtemp(path.resolve('.cache/intermission-offline-')):null;
const options={viewport:{width:1440,height:900},acceptDownloads:false};
const context=offline?await chromium.launchPersistentContext(browserProfile!,{...options,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']}):await browser!.newContext(options);
if(offline)await context.setOffline(true);const page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(30000);
if(!offline)await page.clock.install();
const report:any={build:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),offline,browserProfile,method:'Actual production UI and native current diagnostic actions. Arrival keyframes use a paused test clock after real pickup, not animation performance evidence. No old-save matching or migration.',checks:[],screens:[],geometry:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
async function shot(name:string){await page.screenshot({path:out+'/'+name+'.png'});report.screens.push(name);}
async function load(file:string){
 const phase=await page.evaluate(()=>window.__SC2_REPORT__?.().phase).catch(()=>null);
 if(phase==='battle'){if(!await page.locator('.pause-actions [data-action=restart]').isVisible())await page.locator('#topbar [data-action=pause]').click();await page.locator('.pause-actions [data-action=restart]').click();}
 else if(phase!=='menu')await page.goto(url,{timeout:240000});
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('.main-actions [data-action=menu-load]').click();const pick=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await pick).setFiles(file);await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();
}
const wallet=()=>page.evaluate(()=>window.__SC2_REPORT__().wallet);
try{
 if(!process.argv.includes('--arrivals-only')){
 await load(services);await page.locator('.imx-copy').first().waitFor();
 const before=await wallet(),offers=await page.locator('#reward-cards>.im-card').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-card-id')));
 await page.locator('[data-page=contracts]').click();await page.locator('.im-card-action[data-action=ui-contract]').first().click();await page.locator('[data-action=ui-variant-select][data-variant="marine.2"]').click();
 await page.locator('.im-elite-dialog .modal-footer [data-action=ui-back]').click();assert.deepEqual(await wallet(),before);
 await page.locator('.im-card-action[data-action=ui-contract]').first().click();await page.locator('[data-action=elite-contract]').click();await page.locator('.modal-footer [data-action=shop-elite-cancel]').waitFor();await shot('elite-replacement');await page.locator('.modal-footer [data-action=shop-elite-cancel]').click();assert.deepEqual(await wallet(),before);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.deepEqual(await page.locator('#reward-cards>.im-card').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-card-id'))),offers);
 report.checks.push('Elite variant cancel and full-family replacement cancel preserve native wallet and shop offers');
 await page.locator('[data-page=rest]').click();await page.locator('.imx-service-detail').click();await page.locator('[data-action=repair-all][data-family="marine"]').click();assert.ok((await wallet()).minerals<before.minerals);await page.keyboard.press('Escape');
 await page.locator('[data-action=revive][data-id=raynor]').click();assert.match(await page.locator('.im-card[data-card-id=raynor]').innerText(),/已安排|下关归队/);await page.waitForTimeout(650);await shot('rest-after-native-purchases');await page.keyboard.press('Escape');
 report.checks.push('Original per-family repair and paid hero revival remain reachable and update native state');
 }
 if(offline){
  await page.setViewportSize({width:390,height:844});await page.locator('[data-action=battle-research]').click();await page.waitForTimeout(650);assert.equal(await page.locator('.imx-research-art').count(),6);
  const urls=await page.locator('.imx-research-art').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundImage));assert.ok(urls.every(u=>u.includes('blob:')));await shot('offline-research');
  await page.keyboard.press('Escape');await page.locator('[data-action=skip]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle',null,{timeout:240000});await page.locator('#minimap-canvas').waitFor({state:'visible'});await shot('offline-battle');report.checks.push('Offline HTML decodes new embedded art, portrait research and native return to battlefield/minimap');
 }else{
  for(const kind of ['elite','hero']){
   await load(arrivals[kind]);await page.locator('.pause-actions [data-action=pause]').click();await page.locator('.arrival-card.'+kind).waitFor();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+750));
   assert.equal(await page.locator('.arrival-art>[data-art-key]').getAttribute('data-art-key'),kind==='elite'?'marine.2':'raynor');
   for(const [width,height]of [[1440,900],[390,844],[844,390],[320,700]]){
    await page.setViewportSize({width,height});await page.clock.runFor(100);
    for(const [phase,time]of [['back',400],['turn',750],['front',1300]]as const){
     await page.locator('.arrival-card').evaluate((e,t)=>{for(const a of e.getAnimations({subtree:true})){a.pause();a.currentTime=t;}},time);
     const bounds=await page.locator('.arrival-body').evaluate(e=>[...e.children].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));assert.ok(bounds[0].every((v,i)=>Math.abs(v-bounds[1][i])<.25));report.geometry.push({kind,width,height,phase,bounds});
     assert.ok(bounds[0][0]>=0&&bounds[0][1]>=0&&bounds[0][0]+bounds[0][2]<=width+.25&&bounds[0][1]+bounds[0][3]<=height+.25,'Arrival remains inside resized viewport');
     if(phase!=='turn'){await shot(`${kind}-${width}-${phase}`);assert.equal(await page.locator('.arrival-card.'+kind).count(),1);}
    }
   }
   assert.equal(await page.locator('#arrival-layer').evaluate(e=>getComputedStyle(e).pointerEvents),'none');assert.equal(await page.locator('.arrival-back img').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>100),true);
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.arrival-back').isVisible(),false);assert.equal(await page.locator('.arrival-body').evaluate(e=>getComputedStyle(e).animationName),'none');await shot(kind+'-reduced-motion');await page.emulateMedia({reducedMotion:'no-preference'});
   await page.clock.resume();await page.locator('.arrival-card').waitFor({state:'detached',timeout:7000});await page.setViewportSize({width:1440,height:900});report.checks.push(`${kind}: correct original art and logo, same front/back bounds at four sizes and three phases, reduced motion, natural automatic dismissal`);
  }
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String((e as Error).stack);await shot('failure').catch(()=>{});process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await context.close();await browser?.close();if(server)await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({checks:report.checks,screens:report.screens.length,errors:report.errors,failure:report.failure}));}
