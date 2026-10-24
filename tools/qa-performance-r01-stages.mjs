import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';
const run=process.argv[2]??'stages-r1',root=path.resolve('reports/local/performance-r01-20261020',run);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338'),page=browser.contexts()[0].pages()[0],report={run,device:await page.evaluate(()=>window.__B02__.device()),scenarios:[],resolution:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const setup=async(name,ticks=120)=>{await page.evaluate(async({name,ticks})=>{window.__R01_PAIR__?.set('baseline');await window.__B02__.view.prepareCampaignAssets({version:3,seed:529,theme:'char'});await window.__R01__.setup(name,'char',ticks);window.__R01_PAIR__?.set('baseline');window.__R01__.settle();window.__B02__.view.warmLightingFrame();},{name,ticks});};
const measure=async stage=>{const r=await page.evaluate(stage=>window.__R01__.measure(stage,20,8),stage);const sorted=r.gpuMs.slice().sort((a,b)=>a-b);console.log(stage+' '+sorted[10].toFixed(3));return r;};
try{
 for(const name of ['melee-300','medical','carrier-equipment','main-hive']){
  await setup(name,name==='main-hive'?360:120);const row={name,checkpoint:await page.evaluate(()=>window.__B02__.checkpoint()),stages:[]};report.scenarios.push(row);console.log('Stage scene '+name);
  for(const stage of ['total','contact','contact-depth','contact-ao','shadow','beauty','ground','refraction','bloom','output']){row.stages.push(await measure(stage));await save();}
 }
 for(const name of ['quiet','ranged-300']){
  await setup(name);const row={name,ratios:[]};report.resolution.push(row);
  for(const ratio of [1,.75,.5,1]){
   await page.evaluate(ratio=>{window.__B02__.view.renderer.setPixelRatio(ratio);window.__R01__.settle();},ratio);
   const r={ratio,checkpoint:await page.evaluate(()=>window.__B02__.checkpoint()),stages:[]};row.ratios.push(r);console.log('Resolution '+name+' '+ratio);
   for(const stage of ['total','ground','contact','beauty','bloom','output']){r.stages.push(await measure(stage));await save();}
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);}finally{await page.evaluate(()=>{window.__B02__.view.renderer.setPixelRatio(1);window.__R01_PAIR__?.set('baseline');window.__R01__.settle();}).catch(()=>{});await save();}
console.log(JSON.stringify({pass:report.pass,scenes:report.scenarios.length,resolution:report.resolution.length,errors:report.errors}));process.exit(process.exitCode??0);
