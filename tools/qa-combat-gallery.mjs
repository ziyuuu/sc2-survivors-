import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const root='reports/local/combat-effects-20261012',out=root+'/gallery-r1';
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});
const result={passed:false,records:0,pairedRecords:0,images:0,identityFilters:0,routeJumps:0,suiteSelections:0,decodedSelections:0,videos:0,errors:[],httpFailures:[]};page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.httpFailures.push({url:r.url(),status:r.status()});});
async function decode(){await page.locator('#after').evaluate(i=>i.decode());if(await page.locator('#beforeFigure').isVisible())await page.locator('#before').evaluate(i=>i.decode());result.decodedSelections++;}
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/comparison.html');await decode();
 const data=await page.evaluate(()=>({records:__galleryData.records.length,pairs:__galleryData.records.filter(r=>r.before).length,identities:__galleryData.identities.length,routes:__galleryData.routes.length,suites:[...new Set(__galleryData.records.map(r=>r.suite))]}));assert.equal(data.pairs,895);assert.equal(data.identities,138);assert.equal(data.routes,43);result.records=data.records;result.pairedRecords=data.pairs;
 for(const suite of data.suites){await page.locator('#suite').selectOption(suite);const count=await page.locator('#frameSelect option').count();assert.ok(count>0);for(const n of new Set([0,Math.floor(count/2),count-1])){await page.locator('#frameSelect').selectOption(String(n));await decode();}result.suiteSelections++;}
 await page.locator('#suite').selectOption('');
 const identities=await page.locator('#identity option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));for(const identity of identities){await page.locator('#identity').selectOption(identity);assert.ok(await page.locator('#frameSelect option').count()>0,identity);result.identityFilters++;}
 await page.locator('#identity').selectOption('');
 const routes=await page.locator('#routeSelect option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean));for(const route of routes){await page.locator('#routeSelect').selectOption(route);await decode();const actual=await page.evaluate(()=>__galleryState().image),expected=await page.evaluate(key=>__galleryData.routes.find(r=>r.key===key).jump,route);assert.equal(actual,expected,route);result.routeJumps++;}
 await page.locator('#search').fill('no-such-combat-frame');assert.ok(await page.locator('#empty').isVisible());assert.ok(await page.locator('#play').isDisabled());await page.locator('#search').fill('marine-tick');await decode();
 const initial=await page.evaluate(()=>__galleryState().index);await page.locator('#next').click();await decode();assert.notEqual(await page.evaluate(()=>__galleryState().index),initial);await page.locator('#prev').click();await decode();assert.equal(await page.evaluate(()=>__galleryState().index),initial);
 await page.locator('#play').click();await page.waitForFunction(i=>__galleryState().index!==i,initial);await page.locator('#play').click();assert.equal(await page.evaluate(()=>__galleryState().playing),false);
 for(let i=0;i<3;i++){await page.locator('#videoSelect').selectOption(String(i));const v=await page.locator('#video').evaluate(async v=>{if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',reject,{once:true});});return {duration:v.duration,width:v.videoWidth};});assert.ok(v.duration>=19&&v.width>0);result.videos++;}
 await page.locator('#search').fill('mode-tank-tick-480');await decode();await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/portrait.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const files=JSON.parse(await fs.readFile(root+'/gallery-files.json','utf8'));assert.ok(files.passed);result.images=files.images;result.fileValidation='All PNG headers/dimensions/SHA-256 verified by builder; browser decodes bounded suite representatives and every route jump. Not a full visual review of every image.';
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.httpFailures,[]);result.passed=true;
}catch(e){result.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(result));}
