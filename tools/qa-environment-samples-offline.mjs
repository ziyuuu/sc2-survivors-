import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const out=process.argv[2]??'reports/local/mvp5-environment-samples-20261013/offline-html/check-r1';
await fs.mkdir(out,{recursive:true});
const build=JSON.parse(await fs.readFile('reports/local/mvp5-environment-samples-20261013/offline-html/build.json','utf8'));
assert.equal(createHash('sha256').update(await fs.readFile(build.output)).digest('hex'),build.sha256);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800},offline:true});
const page=await context.newPage(),errors=[],http=[],records=[];
page.on('pageerror',e=>errors.push(String(e).slice(0,2000)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,2000))});
page.on('request',r=>{if(/^https?:/.test(r.url()))http.push(r.url())});
const api=(method,arg)=>page.evaluate(({method,arg})=>window.__ENV_SAMPLE__[method](arg),{method,arg});
const ready=()=>page.waitForFunction(()=>window.__ENV_SAMPLE__?.report().ready,{},{timeout:180000});
const capture=async name=>{const r=await api('report');assert.deepEqual(r.errors,[]);await page.screenshot({path:out+'/'+name+'.png'});records.push({name,before:r.before,theme:r.theme,site:r.site,ready:r.ready,models:r.view.models,visibleMeshes:r.view.visibleMeshes});console.log(name)};
try{
 await page.goto(pathToFileURL(path.resolve(build.output)).href+'?theme=ice&site=4');await ready();await api('pause',true);await api('setTime',3);
 for(const theme of ['ice','industrial','mar-sara','char','frontier']){
  if((await api('report')).theme!==theme){await page.locator('#theme').selectOption(theme);await ready()}
  for(let site=0;site<5;site++){await page.locator('#sites button').nth(site).click();await api('setTime',3);assert.equal((await api('report')).site,site)}
  await capture(theme+'-offline-P5');
 }
 // Exercise the actual same-file comparison navigation, including its query.
 await page.locator('#compare').click();await ready();assert.equal((await api('report')).before,true);await api('pause',true);
 for(const theme of ['frontier','ice','industrial','mar-sara','char']){
  if((await api('report')).theme!==theme){await page.locator('#theme').selectOption(theme);await ready()}
  await api('setTime',3);await capture(theme+'-before-offline');
 }
 await page.locator('#compare').click();await ready();assert.equal((await api('report')).before,false);
 await page.locator('#theme').selectOption('ice');await ready();await api('pause',true);await api('setTime',3);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await capture('ice-offline-portrait');
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
 await fs.writeFile(out+'/result.json',JSON.stringify({passed:true,offline:true,file:build.output,sha256:build.sha256,errors,http,records,checks:['25 sample points','five maps before mode','same-file comparison return','390px portrait']},null,2));
}catch(error){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,http,records},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error}finally{await browser.close()}
