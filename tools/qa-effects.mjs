import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const out='reports/local/qa';await fs.mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),scope:'Local browser state/GPU/asset checks. Diagnostic fixtures; no image upload or human visual approval.',errors:[]};
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:90000});
 report.loaded=await page.evaluate(()=>window.__SC2_REPORT__());assert.equal(report.loaded.originalAnimationModels,8);assert.equal(report.loaded.originalDeathModels,8);assert.equal(report.loaded.effectTextures,24);
 await page.getByRole('button',{name:/部署小队/}).click();
 report.clips=await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.autoWaves=false;w.entities.clear();w.paused=true;const types=['marine','hellion','tank','medivac','zergling','roach','baneling','ravager'];for(let i=0;i<types.length;i++){const u=w.addUnit(types[i],i<4?'terran':'zerg',i%4*4-6,Math.floor(i/4)*5-2.5);u.action='move';u.velocity={x:1,z:0};}return [...v.gpu].map(([key,b])=>({key,bones:b.boneCount,actions:Object.fromEntries(Object.entries(b.actions).filter(([,v])=>v).map(([k,v])=>[k,v.name])),clips:[...b.clips.keys()]}));});
 for(let i=0;i<8;i++){await page.evaluate(()=>{const {world:w}=window.__SC2_DEBUG__;w.time+=.1;for(const u of w.entities.values())u.distanceWalked+=.4;});await page.waitForTimeout(35);}
 const before=await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu.get('marine').attributes[0].array.slice(0,4)]);await page.waitForTimeout(250);const after=await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu.get('marine').attributes[0].array.slice(0,4)]);assert.deepEqual(after,before);report.pauseFreezesPose=true;
 await page.screenshot({path:out+'/original-movement.png'});
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;const units=[...w.entities.values()];w.hash.rebuild(units);for(const u of units){if(u.unitType==='medivac')continue;const target=units.find(t=>t.owner!==u.owner&&t.hp>0&&!t.flying);if(target)w.fire(u,target);}for(const u of units)if(u.hp>0)w.hit(u,3);w.visual('bile-impact',units.at(-1));w.time+=.06;});await page.waitForTimeout(150);await page.screenshot({path:out+'/original-impact.png'});
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;for(const u of w.entities.values())if(u.hp>0)w.hit(u,10000);w.time+=.2;});await page.waitForTimeout(150);
 report.deathBatches=await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu].filter(([k,b])=>k.endsWith('.death')&&b.count>0).map(([k])=>k));assert.equal(report.deathBatches.length,8);
 await page.screenshot({path:out+'/original-death.png'});
 report.events=await page.evaluate(()=>window.__SC2_REPORT__().effects);assert.ok(report.events.attack>=6);assert.ok(report.events.hit>=8);assert.equal(report.events.death,8);assert.ok(report.events.movement>=8);assert.equal(report.events.bile,1);
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.entities.clear();w.time+=1.6;});await page.waitForTimeout(100);report.deathAfterSimulationRemoval=await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu].filter(([k,b])=>k.endsWith('.death')&&b.count>0).length);assert.ok(report.deathAfterSimulationRemoval>0);
 await page.evaluate(()=>{window.__SC2_DEBUG__.world.time+=6;});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu].filter(([k,b])=>k.endsWith('.death')&&b.count>0).length),0);
 report.deathLifecycle=true;
 // Both original morphs and both tank modes must be selected by simulation state.
 report.tank=[];for(const [action,mode] of [['move','tank'],['sieging','tank'],['idle','siege'],['unsieging','siege']]){await page.evaluate(({action,mode})=>{const {world:w}=window.__SC2_DEBUG__;w.entities.clear();const u=w.addUnit('tank','terran',0,0);u.action=action;u.mode=mode;u.modeTimer=2;u.distanceWalked=1;},{action,mode});await page.waitForTimeout(60);report.tank.push({action,mode,batches:await page.evaluate(()=>[...window.__SC2_DEBUG__.view.gpu].filter(([k,b])=>k.startsWith('tank')&&b.count>0).map(([k])=>k))});}
 assert.deepEqual(report.tank.map(t=>t.batches),[['tank'],['tank.morph'],['tank.siege'],['tank.morph']]);
 const offline=await browser.newContext();await offline.setOffline(true);const p=await offline.newPage(),requests=[];p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});p.on('pageerror',e=>report.errors.push(e.message));await p.goto(pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href);await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:90000});report.offline={...await p.evaluate(()=>window.__SC2_REPORT__()),requests};assert.equal(requests.length,0);assert.equal(report.offline.originalAnimationModels,8);assert.equal(report.offline.originalDeathModels,8);assert.equal(report.offline.effectTextures,24);
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile(out+'/EFFECTS.json',JSON.stringify(report,null,2));await browser.close();}
