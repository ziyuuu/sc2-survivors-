import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import {createEnvironmentDeliveryServer} from './serve-environment-delivery.mjs';

const root='reports/local/mvp5-delivery-20261014',out=process.argv[2],offline=process.argv.includes('--offline');assert.ok(out?.startsWith(root+'/')&&!out.includes('..'));await fs.mkdir(out,{recursive:false});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const revision=process.argv.find(a=>a.startsWith('--revision='))?.slice(11)??'r1';assert.ok(/^r\d+$/.test(revision));
const build=JSON.parse(await fs.readFile(root+'/viewer-build-'+revision+'.json','utf8'));for(const r of build.files)assert.equal(createHash('sha256').update(await fs.readFile(r.file)).digest('hex'),r.sha256);
const server=createEnvironmentDeliveryServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900},offline,deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(60000);
const report={at:new Date().toISOString(),offline,build,records:[],checks:[],errors:[],http:[]};
page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});page.on('request',r=>{if(offline&&/^https?:/.test(r.url()))report.http.push(r.url())});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+': '+r.url())});
const api=(method,arg)=>page.evaluate(({method,arg})=>window.__ENV_SAMPLE__[method](arg),{method,arg}),ready=()=>page.waitForFunction(()=>window.__ENV_SAMPLE__?.report().ready,null,{timeout:180000});
async function shot(name){const state=await api('report');assert.deepEqual(state.errors,[]);assert.equal(await page.evaluate(()=>scrollY),0,'Controls scrolled the header out of view');await page.screenshot({path:out+'/'+name+'.png'});report.records.push({name,state});await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));console.log(name)}
try{
 if(offline){report.html=JSON.parse(await fs.readFile(root+'/viewer-offline-build'+(revision==='r1'?'':'-'+revision)+'.json','utf8'));assert.equal(createHash('sha256').update(await fs.readFile(report.html.file)).digest('hex'),report.html.sha256)}
 const entry=offline?pathToFileURL(path.resolve(report.html.file)).href:'http://127.0.0.1:'+server.address().port;
 await page.goto(entry+'?theme=invalid&site=oops',{timeout:180000});await ready();assert.equal((await api('report')).theme,'industrial');assert.equal((await api('report')).site,0);report.checks.push('Invalid initial query falls back to industrial spawn');
 await page.locator('#pause').click();assert.equal((await api('report')).paused,true);await api('setTime',3);
 for(const theme of ['industrial','mar-sara','char','ice','frontier']){
  if((await api('report')).theme!==theme){await page.locator('#theme').selectOption(theme);await ready()}
  for(let site=0;site<8;site++){await page.locator('#sites button').nth(site).click();const state=await api('report');assert.equal(state.site,site);assert.equal(new URL(page.url()).searchParams.get('theme'),theme);assert.equal(await page.locator('#sites button[aria-pressed="true"]').count(),1);if(site===0||site===4)await shot(theme+'-'+site)}
  report.checks.push(theme+': eight visible point buttons and query persistence');
 }
 await page.locator('canvas').focus();const before=(await api('report')).camera;await page.keyboard.press('ArrowRight');assert.ok((await api('report')).camera.target[0]>before.target[0]);await page.keyboard.press('+');assert.ok((await api('report')).camera.zoom>before.zoom);await page.locator('#reset').click();assert.equal((await api('report')).camera.zoom,1);report.checks.push('Keyboard pan, zoom and reset');
 const frozen=(await api('report')).time;await page.waitForTimeout(150);assert.equal((await api('report')).time,frozen);await page.locator('canvas').focus();await page.keyboard.press('Space');await page.waitForFunction(t=>window.__ENV_SAMPLE__.report().time>t,frozen);await page.keyboard.press('Space');report.checks.push('Pause freezes viewer clock; keyboard resumes');
 for(const viewport of [{width:768,height:1024},{width:390,height:844}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('canvas').evaluate(e=>e.getBoundingClientRect().height)>=280);await shot('responsive-'+viewport.width)}
 await page.setViewportSize({width:1440,height:900});
 if(!offline){const href=await page.locator('#play').getAttribute('href'),response=await fetch(entry+href),text=await response.text();assert.ok(text.includes(build.appBuildId));for(const name of ['game','viewer']){const r=await fetch(entry+'/downloads/'+name+'.html',{method:'HEAD'});assert.equal(r.status,200);assert.ok(Number(r.headers.get('content-length'))>1000000)}report.checks.push('Formal game link has exact final build; both named download endpoints exist')}
 else{const link=new URL(await page.locator('#play').getAttribute('href'),page.url());assert.equal(path.basename(link.pathname),'SC2-Survivors-MVP5-Final-20261014.html');await fs.access(path.resolve('dist/SC2-Survivors-MVP5-Final-20261014.html'));report.checks.push('Offline game link targets actual sibling final HTML')}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=String(error.stack??error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,screens:report.records.length,errors:report.errors,offlineHTTP:report.http.length,failure:report.failure}))}
