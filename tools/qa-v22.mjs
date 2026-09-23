import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const out='reports/local/qa-v22';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
 await page.evaluate(()=>window.__SC2_DEBUG__.world.talentProfile.award('qa-v22',10));
 await page.locator('[data-action=talents]').click();await page.locator('[data-action=talent-buy][data-id=scv_savior]').click();
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.talentProfile.level('scv_savior')),1);
 assert.match(await page.locator('.talent-screen').innerText(),/剩余 9 点/);report.checks.push('permanent talent can be bought in the menu');
 await page.locator('[data-action=talents-back]').click();await page.locator('[data-action=start]').click();
 const initial=await page.evaluate(()=>[...window.__SC2_DEBUG__.world.allies()].map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp,weaponCooldown:u.weaponCooldown})));
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=true;w.stage=12;w.prepareStage();w.hive.hp=0;w.phase='won';w.changed();});
 await page.locator('[data-action=endless]').click();
 await page.waitForFunction(()=>{const r=window.__SC2_REPORT__();return r.map?.name==='Acropolis LE'&&r.assetsPending===0;},null,{timeout:240000});
 await page.waitForTimeout(1500);
 const state=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,r=window.__SC2_REPORT__();return {map:r.map,forts:[...w.fortifications.values()].map(f=>({kind:f.kind,hp:f.hp,x:f.x,z:f.z})),allies:w.allies().map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp,weaponCooldown:u.weaponCooldown})),phase:w.phase,errors:r.errors,drawCalls:r.drawCalls,triangles:r.triangles,fps:r.fps,minimap:document.querySelector('#minimap-canvas')?.dataset.mapFrame};});
 assert.equal(state.phase,'battle');assert.equal(state.map.name,'Acropolis LE');assert.equal(state.map.placements,150);assert.equal(state.forts.filter(f=>f.kind==='bunker').length,4);assert.equal(state.forts.filter(f=>f.kind==='repair').length,1);
 assert.deepEqual(state.allies.map(u=>u.id),initial.map(u=>u.id));assert.deepEqual(state.allies.map(u=>u.maxHp),initial.map(u=>u.maxHp));assert.ok(state.minimap);assert.deepEqual(state.errors,[]);
 await page.screenshot({path:out+'/acropolis-endless.png'});report.checks.push('Acropolis loads in the browser with 150 original placements, five defenses, live allies and no renderer errors');report.state=state;
 await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});const p=await mobile.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});await p.locator('[data-action=talents]').click();
 const layout=await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,panel:document.querySelector('.talent-screen')?.getBoundingClientRect().width}));assert.ok(layout.scrollWidth<=layout.viewport);assert.ok(layout.panel>0);report.mobile=layout;report.checks.push('talent panel fits a narrow touch viewport');await mobile.close();
 const offline=await browser.newContext({viewport:{width:1440,height:900},offline:true});const file=await offline.newPage(),requests=[];file.on('pageerror',e=>report.errors.push(e.message));file.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});file.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await file.goto(pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href,{timeout:180000});await file.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
 const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8')).filter(r=>r.status==='available'&&r.id.startsWith('map.acropolis')),expected=[];for(const r of records){const bytes=await fs.readFile(r.packedFile);expected.push({id:r.id,sha:createHash('sha256').update(bytes).digest('hex')});}
 const embedded=await file.evaluate(async expected=>{for(const {id,sha} of expected){const url=window.__SC2_EMBEDDED__[id];if(!url?.startsWith('blob:'))throw Error('Missing local Blob: '+id);const bytes=await (await fetch(url)).arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),actual=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');if(actual!==sha)throw Error('Acropolis asset hash mismatch: '+id);}return expected.length;},expected);
 assert.equal(embedded,5);assert.deepEqual(requests,[]);assert.equal(await file.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');await file.locator('[data-action=start]').click();assert.equal(await file.evaluate(()=>window.__SC2_REPORT__().phase),'battle');report.offline={requests,embedded,ready:true};report.checks.push('offline HTML starts without network and embeds the Acropolis data, original terrain atlases and masks byte-for-byte');await offline.close();
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,state:report.state&&{map:report.state.map,forts:report.state.forts.length,drawCalls:report.state.drawCalls,triangles:report.state.triangles,fps:report.state.fps},failure:report.failure}));}
