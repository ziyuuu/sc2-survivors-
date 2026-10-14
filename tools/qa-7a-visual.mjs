import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const [build,label,suite='replay']=process.argv.slice(2),root='reports/local/7a-20261013',out=root+'/'+label;
for(const value of [build,label,suite])assert.match(value,/^[a-z0-9-]+$/);
assert.ok(['replay','resources'].includes(suite));await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const report={at:new Date().toISOString(),build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),suite,records:[],errors:[],passed:false,method:'Native fixed input correctness is separate from natural wall-clock performance. Diagnostic resource totals are not physical VRAM.'};
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page,heapTimer;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.setDefaultTimeout(900000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 const cdp=await page.context().newCDPSession(page);report.heaps=[];let pending=false;
 heapTimer=setInterval(async()=>{if(pending)return;pending=true;try{report.heaps.push({at:Date.now(),...await cdp.send('Runtime.getHeapUsage')});}catch{}finally{pending=false;}},1000);
 const call=(method,...args)=>page.evaluate(({method,args})=>window.materialLab[method](...args),{method,args});
 const save=()=>fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
 const record=async(name,screenshot=true)=>{const row=await call('draw');assert.deepEqual(row.errors,[]);assert.equal(row.runtime.assetsPending,0);const file=screenshot?name+'.png':null;if(file)await page.screenshot({path:out+'/'+file});report.records.push({name,file,state:row.state,time:row.time,tick:row.tick,subjects:row.subjects,camera:row.runtime.camera,surfaces:row.surfaces,poseAudit:await call('poseAudit'),poseValues:await call('poseValues7A')});await save();};
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:900000});await page.waitForFunction(()=>document.body.dataset.ready==='true');assert.deepEqual((await call('draw')).errors,[]);
 if(suite==='replay'){
  for(const group of ['marauder','tank','thor','nova','ultralisk','kerrigan','colossus','artanis']){
   await call('load',group,'industrial');await call('ticks',240);await call('controls',50,1,'fixed','needed');await record(group+'-stand');
   await call('move');await record(group+'-move',false);const priorShots=(await call('draw')).subjects.map(subject=>subject.shots??0);await call('combat');
   let combat=await call('draw'),combatTicks=60;const fired=()=>combat.subjects.some((subject,index)=>(subject.shots??0)>priorShots[index]);
   while(!fired()&&combatTicks<420){await call('ticks',30);combatTicks+=30;combat=await call('draw');}
   assert.ok(fired(),'No sampled subject fired in native combat: '+group);(report.combatWindows??=[]).push({group,combatTicks,before:priorShots,subjects:combat.subjects});await call('ticks',8);await record(group+'-combat');
   await call('hit',0,1e9);await call('ticks',12);await record(group+'-death');const before=(await call('draw')).state;await call('reload');assert.equal((await call('draw')).state,before);await record(group+'-reload',false);
   console.log(JSON.stringify({group,passed:true}));
  }
 }else{
  const themes=['industrial','mar-sara','char','ice','frontier'];report.cycles=[];
  await call('load','marine','frontier');
  for(let cycle=0;cycle<2;cycle++)for(const theme of themes){
   await call('watchMapResources');await call('load','marine',theme);await call('controls',50,1,'fixed','needed');await call('renderFrames',3);
   const resources=await call('resources7A');assert.ok(resources.maps.length<=2,'More than active campaign plus retained endless map');
   assert.equal(resources.watched.detached,true,'Retired map still attached');assert.ok(resources.watched.entries.length>0);assert.ok(resources.watched.entries.every(e=>e.disposed),'Retired map object was not disposed');
   await call('clearMapWatch7A');const heap=await cdp.send('Runtime.getHeapUsage');report.cycles.push({cycle,theme,resources,heap});await record('cycle-'+cycle+'-'+theme);
   console.log(JSON.stringify({cycle,theme,memory:resources.memory,maps:resources.maps.length,decode:resources.textureDecodeReferences}));
  }
  const warmedDecoders=report.cycles.filter(r=>r.cycle===0).at(-1).resources.textureDecodeReferences;
  for(const theme of themes){const [a,b]=report.cycles.filter(r=>r.theme===theme);assert.deepEqual(b.resources.memory,a.resources.memory,'GPU object counts grow on repeated '+theme);assert.deepEqual(b.resources.textureDecodeReferences,warmedDecoders,'Shared decoder cache grows after all five maps are already decoded: '+theme);}
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;report.failureState=await page?.evaluate(()=>window.materialLab?.draw()).catch(()=>null);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{clearInterval(heapTimer);report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,suite,records:report.records.length,failure:report.failure}));}
