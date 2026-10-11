import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const build=process.argv[2]??'candidate-r1',label=process.argv[3]??'industrial-r1',root='reports/local/terrain-batch4-20261011',out=root+'/'+label;
for(const id of [build,label])assert.match(id,/^[a-z0-9-]+$/);await fs.mkdir(out,{recursive:true});
try{await fs.access(out+'/results.json');throw Error('Use a fresh evidence label');}catch(e){if(e.code!=='ENOENT')throw e;}
const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),startedAt:new Date().toISOString(),records:[],errors:[]};await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.setDefaultTimeout(300000);
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)result.errors.push(r.status()+' '+r.url());});
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args});
const persist=()=>fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));
async function capture(name){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,...q});await persist();console.log(name);return q;}
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:300000});
 for(const group of ['marine','zealot','zergling']){
  await call('load',group,'industrial');await call('ticks',300);await call('mapStage',9);
  const stages=build.startsWith('baseline')?[['baseline',false,false,false]]:[['rollback',false,false,false],['ground',true,false,false],['environment',true,true,false],['atmosphere',true,true,true]];
  for(const [stage,...features]of stages){await call('visualParts',...features);await call('view',19);await capture(group+'-'+stage+'-battle');if(group==='marine'){await call('offsetView',-10,10);await call('view',19);await call('offsetView',-10,10);await capture(group+'-'+stage+'-base');await call('view',7);await call('offsetView',-10,10);await capture(group+'-'+stage+'-base-near');}}
 }
 result.passed=true;
}catch(error){result.passed=false;result.failure=String(error.stack??error);console.error(result.failure);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();await persist();await browser.close();await new Promise(r=>server.close(r));}
