import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const out=process.argv[2]??'reports/local/mvp5-full-map-20261014/offline-viewer/check-r1';
await fs.access(out).then(()=>{throw Error('Evidence exists')},e=>{if(e.code!=='ENOENT')throw e});await fs.mkdir(out,{recursive:true});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const build=JSON.parse(await fs.readFile('reports/local/mvp5-full-map-20261014/offline-viewer/build.json','utf8'));
assert.equal(createHash('sha256').update(await fs.readFile(build.output)).digest('hex'),build.sha256);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800},offline:true});
const page=await context.newPage(),errors=[],http=[],records=[];page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(90000);let step='starting';
const watchdog=setTimeout(()=>{console.log('watchdog timeout at '+step);void browser.close()},240000);
async function checkpoint(label){step=label;console.log('STEP '+label);await fs.writeFile(out+'/progress.json',JSON.stringify({step,at:new Date().toISOString(),records,errors,http},null,2))}
page.on('pageerror',e=>errors.push(String(e).slice(0,2000)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,2000))});
page.on('request',r=>{if(/^https?:/.test(r.url()))http.push(r.url())});
const api=(method,arg)=>page.evaluate(({method,arg})=>window.__ENV_SAMPLE__[method](arg),{method,arg});
const ready=async()=>{await page.waitForFunction(()=>{const r=window.__ENV_SAMPLE__?.report();return r?.ready||r?.errors.length},{},{timeout:60000});assert.deepEqual((await api('report')).errors,[]);};
const capture=async name=>{const r=await api('report');assert.deepEqual(r.errors,[]);await page.screenshot({path:out+'/'+name+'.png'});records.push({name,before:r.before,theme:r.theme,site:r.site,ready:r.ready,models:r.view.models,visibleMeshes:r.view.visibleMeshes});console.log(name);await checkpoint('captured '+name)};
try{
 await checkpoint('open named HTML');await page.goto(pathToFileURL(path.resolve(build.output)).href+'?theme=ice&site=4');await ready();await api('pause',true);await api('setTime',3);
 for(const theme of ['ice','industrial','mar-sara','char','frontier']){
  if((await api('report')).theme!==theme){await checkpoint('select '+theme);await page.locator('#theme').selectOption(theme);await ready()}
  for(let site=0;site<8;site++){await page.locator('#sites button').nth(site).click();await api('setTime',3);assert.equal((await api('report')).site,site)}
  await capture(theme+'-offline-outer-boundary');
 }
 // Exercise the actual same-file comparison navigation, including its query.
 await checkpoint('navigate actual same-file before');await page.locator('#compare').click();await ready();assert.equal((await api('report')).before,true);await api('pause',true);
 for(const theme of ['frontier','ice','industrial','mar-sara','char']){
  if((await api('report')).theme!==theme){await page.locator('#theme').selectOption(theme);await ready()}
  await api('setTime',3);await capture(theme+'-before-offline');
 }
 await checkpoint('return actual same-file current');await page.locator('#compare').click();await ready();assert.equal((await api('report')).before,false);
 await page.locator('#theme').selectOption('ice');await ready();await api('pause',true);await api('setTime',3);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await capture('ice-offline-portrait');
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
 await fs.writeFile(out+'/result.json',JSON.stringify({passed:true,offline:true,file:build.output,sha256:build.sha256,errors,http,records,checks:['40 full-layout inspection points','five maps before mode','same-file comparison return','390px portrait']},null,2));
}catch(error){await checkpoint('failed at '+step);await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,http,records},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error}finally{clearTimeout(watchdog);await browser.close()}
