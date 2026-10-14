import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createEnvironmentDeliveryServer} from './serve-environment-delivery.mjs';
const out=process.argv[2]??'reports/local/mvp5-delivery-20261014/formal-mounted-menu-r2';assert.ok(out.startsWith('reports/local/mvp5-delivery-20261014/')&&!out.includes('..'));await fs.mkdir(out,{recursive:false});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=createEnvironmentDeliveryServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],report={at:new Date().toISOString(),errors};
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+': '+r.url())});
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/play/',{timeout:180000});
 await page.locator('.main-actions [data-action="menu-new"]').waitFor({state:'visible',timeout:180000});
 await page.locator('#scs-opening-visual').waitFor({state:'detached',timeout:180000});
 assert.equal(await page.locator('#game-root').getAttribute('inert'),null);
 await page.locator('.main-actions [data-action="menu-new"]').click({trial:true});
 report.openingDetached=true;report.menuButtonActionable=true;
 report.runtime=await page.evaluate(()=>window.__SC2_REPORT__());assert.equal(report.runtime.phase,'menu');
 assert.equal(await page.locator('meta[name="sc2-app-build"]').getAttribute('content'),'d5537607fe61bce5e5487fc723360d63debc61a46d15cd57bed2f81692455253');
 assert.equal(await page.evaluate(()=>typeof window.__MVP5_NATIVE__),'undefined');
 await page.screenshot({path:out+'/menu.png'});assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack??e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,failure:report.failure,errors}))}
