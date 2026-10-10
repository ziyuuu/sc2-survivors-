import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const root='reports/local/lighting-batch3-20261010',out=root+'/final-stage-review';await fs.mkdir(out,{recursive:true});
const report={passed:false,errors:[],checks:[],screens:[]};await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
const loaded=()=>page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/stage-gallery.html');assert.equal(await page.locator('#stage option').count(),5);assert.equal(await page.locator('#fixture option').count(),15);
 for(let stage=1;stage<=5;stage++){await page.locator('#stage').selectOption(String(stage));for(const fixture of await page.locator('#fixture option').evaluateAll(options=>options.map(o=>o.value))){await page.locator('#fixture').selectOption(fixture);await loaded();}report.checks.push({stage,fixtures:15});}
 for(const [width,height]of [[1440,1000],[390,844]]){await page.setViewportSize({width,height});await loaded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const file='stage-'+width+'.png';await page.screenshot({path:out+'/'+file,fullPage:true});report.screens.push(file);}
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await fs.writeFile(root+'/final-stage-review.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(report));}
