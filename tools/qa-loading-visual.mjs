import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const [build,label,suite='identities']=process.argv.slice(2),root='reports/local/loading-20261012',out=root+'/'+label;
const requested=process.argv.find(v=>v.startsWith('--groups='))?.slice(9).split(',');
for(const value of [build,label,suite])assert.match(value,/^[a-z0-9-]+$/);
assert.ok(['identities','sequence','lifecycle'].includes(suite));
await fs.mkdir(out,{recursive:true});await fs.access(out+'/result.json').then(()=>{throw Error('Existing evidence');},e=>{if(e.code!=='ENOENT')throw e;});
const report={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),suite,records:[],errors:[],startedAt:new Date().toISOString(),method:'Paused native World, source material identity/pose and exact saved-state comparisons. Original camera and lighting retained. Model review is not human or original-client acceptance.'};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.setDefaultTimeout(300000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args});
const save=()=>fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function shot(name){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.equal(q.runtime.assetsPending,0);await page.screenshot({path:out+'/'+name+'.png'});report.records.push({name,state:q.state,time:q.time,tick:q.tick,subjects:q.subjects,runtime:q.runtime,surfaces:q.surfaces});await save();}
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true');
 if(suite==='identities'){
  const catalog=await call('catalog'),selected=requested?catalog.groups.filter(g=>requested.includes(g.id)):catalog.groups;if(requested)assert.equal(selected.length,new Set(requested).size);report.selectedGroups=selected.map(g=>g.id);for(const group of selected){await call('load',group.id,'industrial');await call('ticks',300);await call('controls',50,1,'fixed','always');
   const subjects=(await call('draw')).subjects;for(let i=0;i<subjects.length;i++){await call('focus',i);await shot(subjects[i].identity);}
   console.log(group.id+': '+subjects.length);
  }
 }else if(suite==='sequence'){
  for(const group of ['immortal','zealot','marine','zergling','heroes-protoss-0']){
   await call('load',group,'industrial');await call('ticks',300);await call('controls',50,1,'fixed','always');await shot(group+'-stand');
   await call('hit',0,10);await shot(group+'-hit');await call('ticks',15);await shot(group+'-hit-later');
   await call('attack');await shot(group+'-attack');await call('move');await shot(group+'-move');
   const order=await call('reorder');(report.sequenceChecks??=[]).push({group,fixture:'deliberate entity Map insertion-order reversal',before:order.before,after:order.after,renderGuard:'draw itself asserts no World mutation'});await shot(group+'-reorder');
   await call('hit',0,1e9);await call('ticks',12);await shot(group+'-death');const before=(await call('draw')).state;await call('reload');assert.equal((await call('draw')).state,before);await shot(group+'-reload');
  }
 }else if(suite==='lifecycle'){
  for(const theme of ['industrial','mar-sara','char','ice','frontier']){await call('load','immortal',theme);await call('ticks',300);await call('controls',50,1,'fixed','always');await shot(theme+'-before');const state=(await call('draw')).state;
   await call('reload');assert.equal((await call('draw')).state,state);await shot(theme+'-reload');
   const restore=await call('contextRestore');assert.equal(restore.before,restore.gameplayAfter);await shot(theme+'-context');
   const filters=await call('textureFiltering');assert.ok(filters.length);await call('resolution','native',1);await shot(theme+'-quality');
  }
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack??e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await save();await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,records:report.records.length,failure:report.failure}));}
