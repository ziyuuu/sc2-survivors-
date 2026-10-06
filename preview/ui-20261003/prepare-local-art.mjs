import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),art=new URL('./art/',root),base='http://127.0.0.1:4178';
await fs.mkdir(art,{recursive:true});
const source=await fs.readFile(new URL('../../src/data/mvp-talents.generated.ts',root),'utf8');
const talents=JSON.parse(source.slice(source.indexOf('['),source.lastIndexOf(']')+1));
await fs.writeFile(new URL('./talents.json',root),JSON.stringify(talents));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={method:'Authentic existing local SC2 GLB models; fixed original idle poses; local Three renderer. Battle background uses isolated development fixture, not gameplay or performance acceptance.',models:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:800,height:1050}});
 page.on('pageerror',e=>report.errors.push(e.message));
 for(const [file,id,angle] of [['raynor','model.hero.raynor',.18],['kerrigan','model.hero.kerrigan',-.17],['artanis','model.hero.artanis',.28],['tychus','model.hero.tychus',.12],['nova','model.hero.nova',.12],['zagara','model.hero.zagara',.12],['dehaka','model.hero.dehaka',.12],['zeratul','model.hero.zeratul',.12],['fenix','model.hero.fenix',.12]]){
  if(await fs.access(new URL(file+'.png',art)).then(()=>true,()=>false)){report.models.push({id,reused:true});continue;}
  await page.goto(`${base}/preview/ui-20261003/render-art.html?id=${id}&angle=${angle}`);
  await page.waitForFunction(()=>window.__ART_READY__||window.__ART_ERROR__,null,{timeout:90000});
  const status=await page.evaluate(()=>window.__ART_READY__||window.__ART_ERROR__);
  if(typeof status==='string')throw Error(status);
  await page.screenshot({path:fileURLToPath(new URL(file+'.png',art)),omitBackground:true});
  report.models.push(status);console.log('Rendered '+file);
 }
 for(const race of ['terran','zerg','protoss']){
 const sceneFile=race==='terran'?'battlefield.png':`battlefield-${race}.png`;
 if(await fs.access(new URL(sceneFile,art)).then(()=>true,()=>false))continue;
 await page.setViewportSize({width:1600,height:1000});await page.goto(base);
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').click();await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});
 const readiness=await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase);if(readiness!=='ready')throw Error('Battle resources: '+readiness);
 await page.locator('[data-action=flow-continue]').click();
 await page.evaluate(async race=>{
  const {world:w,view:v}=window.__SC2_DEBUG__;w.autoWaves=false;w.entities.clear();w.heroes.clear();w.pickups=[];w.weaponFlights=[];w.rewardDrops=[];w.effects=[];w.visualEvents=[];for(const p of Object.values(w.expedition.production))p.enabled={};
  const {campaignTerrain}=await import('/src/data/campaign-map.ts');w.terrain=campaignTerrain({version:1,seed:271,theme:'industrial',layout:0});w.terrain.setStage(6);w.stage=6;
  const families={terran:['marine','marauder','tank','medivac','reaper'],zerg:['zergling','roach','hydralisk','queen','baneling'],protoss:['zealot','stalker','immortal','sentry','colossus']}[race];
  w.expedition.familySlots=families;w.anchor={x:0,z:0,facing:Math.PI};
  for(const [j,f] of families.entries())for(let i=0;i<5;i++)w.addFamilyMember(f,{x:(j%3-1)*3.3+(i%3-1)*1.35,z:(j<3?0:4)+Math.floor(i/3)*1.6},2);
  for(const id of {terran:['raynor','tychus','nova'],zerg:['kerrigan','zagara','dehaka'],protoss:['artanis','zeratul','fenix']}[race])w.acquireHero(id);
  for(let i=0;i<16;i++){const u=w.addUnit('zergling','zerg',7+(i%4)*1.4,-5+Math.floor(i/4)*1.4);u.facing=0;}
  w.hash.rebuild(w.entities.values());w.paused=true;w.changed();await v.prepareRosterAssets();v.camera.zoom=1.1;v.camera.updateProjectionMatrix();v.render(.016,1);
  document.querySelectorAll('#hud,#overlay,#battle-console,#joystick,#touch-controls').forEach(e=>e.style.visibility='hidden');
  const canvas=document.querySelector('#battle');canvas.style.width='100vw';canvas.style.height='100vh';
 },race);
 await page.waitForFunction(()=>window.__SC2_DEBUG__.view.assetsPending===0,null,{timeout:120000});
 const pixels=await page.evaluate(()=>{const {view:v}=window.__SC2_DEBUG__;v.render(.016,1);return document.querySelector('#battle').toDataURL('image/png').split(',')[1];});
 await fs.writeFile(new URL(sceneFile,art),Buffer.from(pixels,'base64'));console.log('Captured '+race+' scene');
 }
 report.battle='Isolated full-army scene, UI hidden; paused without combat results';
}finally{await fs.writeFile(new URL('provenance.json',art),JSON.stringify(report,null,2));await browser.close();}
