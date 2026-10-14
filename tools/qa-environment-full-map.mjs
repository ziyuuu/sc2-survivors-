import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {createHash} from 'node:crypto';import {createEnvironmentReviewServer} from './serve-environment-full-map.mjs';
const out=process.argv[2]??'reports/local/mvp5-full-map-20261014/viewer-r1';await fs.mkdir(out,{recursive:true});await fs.copyFile('reports/local/mvp5-full-map-20261014/viewer-build.json',out+'/build.json');
const server=createEnvironmentReviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const entry='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[],httpErrors=[],records=[];
page.on('pageerror',e=>errors.push(String(e).slice(0,2000)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,2000))});page.on('response',r=>{if(r.status()>=400)httpErrors.push({url:r.url(),status:r.status()})});
const api=(method,arg)=>page.evaluate(({method,arg})=>window.__ENV_SAMPLE__[method](arg),{method,arg}),ready=()=>page.waitForFunction(()=>window.__ENV_SAMPLE__?.report().ready,null,{timeout:180000});
const shot=async name=>{await api('pause',true);await api('setTime',3);const r=await api('report');assert.deepEqual(r.errors,[]);await page.screenshot({path:out+'/'+name+'.png'});records.push({name,...r});await fs.writeFile(out+'/progress.json',JSON.stringify({records,errors,httpErrors},null,2));console.log(name,r.memory,r.render)};
try{
 await page.goto(entry+'/?theme=industrial&site=0');await ready();
 for(const theme of ['industrial','ice','mar-sara','char','frontier']){
  if((await api('report')).theme!==theme){await api('load',theme);await ready()}
  for(let site=process.argv.includes('--boundaries')?4:0;site<8;site++){await api('selectSite',site);await api('setStage',site===0?1:18);await shot(theme+'-full-'+site)}
 }
 await page.goto(entry+'/?before=1&theme=industrial&site=2');await ready();assert.equal((await api('report')).before,true);await shot('industrial-baseline-mid');await api('load','ice');await ready();await shot('ice-baseline-mid');
 await page.locator('#compare').click();await ready();assert.equal((await api('report')).before,false);await api('selectSite',4);await api('pause',true);await api('setTime',3);
 const before=await api('report'),pixels=()=>page.locator('canvas').screenshot().then(b=>createHash('sha256').update(b).digest('hex')),hash=await pixels();await page.waitForTimeout(200);assert.equal(await pixels(),hash);await api('lose');await page.waitForFunction(g=>window.__ENV_SAMPLE__.report().ready&&window.__ENV_SAMPLE__.report().generation>g,before.generation,{timeout:180000});assert.equal(await pixels(),hash);await shot('ice-full-context-restored');
 const repeated=[];for(let i=0;i<2;i++)for(const theme of ['industrial','ice']){await api('load',theme);await ready();await api('selectSite',4);repeated.push((await api('report')).memory)}assert.deepEqual(repeated.slice(0,2),repeated.slice(2));
 await page.setViewportSize({width:390,height:844});await shot('ice-full-portrait');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await fs.writeFile(out+'/result.json',JSON.stringify({passed:true,method:'Production map modules and native camera projection, independent viewer clock; no World gameplay or final FPS acceptance.',records,errors,httpErrors,repeated},null,2));
}catch(e){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e),records,errors,httpErrors},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e}finally{await browser.close();await new Promise(r=>server.close(r))}
