import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const [build,label]=process.argv.slice(2),root='reports/local/combat-effects-20261012',out=root+'/'+label;
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(900000);
const report={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),records:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:900000});await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const age of [.7,1.5])for(const index of [undefined,0,1,2,3,4,5,6,7,8]){
  const name='siege-'+age+'-'+(index??'all'),data=await page.evaluate(async({age,index})=>window.combatLab.inspectSource('SiegeTankSiegedAttackImpact',age,index),{age,index});assert.deepEqual(data.errors,[]);await page.screenshot({path:out+'/'+name+'.png'});report.records.push({name,...data});await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
 }report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,records:report.records.length,failure:report.failure}));}
