import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const label=arg('--label','pilot'),suite=arg('--suite','pilot'),out='reports/local/visual-baseline-20261010/'+label;
assert.match(label,/^[a-z0-9-]+$/);await fs.mkdir(out,{recursive:true});
try{await fs.access(out+'/results.json');throw Error('Use a new label; existing evidence is immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
const server=labServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const report={label,suite,startedAt:new Date().toISOString(),build:JSON.parse(await fs.readFile('reports/local/visual-baseline-20261010/lab/build.json','utf8')),host:{cpu:os.cpus()[0]?.model,ram:os.totalmem(),platform:process.platform},launch:{headless:false,viewport:{width:1280,height:792},dpr:1,flags:['--enable-precise-memory-info']},records:[],errors:[]};
const runner=await fs.readFile(new URL(import.meta.url));report.runnerSha256=createHash('sha256').update(runner).digest('hex');await fs.writeFile(out+'/runner.mjs',runner);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--enable-precise-memory-info','--window-position=0,0','--window-size=1300,900']});report.chrome=browser.version();
const context=await browser.newContext({viewport:report.launch.viewport,deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:300000});
const read=()=>page.locator('#report').textContent().then(JSON.parse);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const persist=()=>fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));
let number=0;
async function load(group,theme){await page.locator('#group').selectOption(group);await page.locator('#theme').selectOption(theme);await page.locator('#load').click();await ready();const q=await read();assert.deepEqual(q.errors,[]);assert.equal(q.runtime.assetsPending,0);console.log(JSON.stringify({prepared:group,theme,entities:q.runtime.entities,resolution:q.resolution}));}
async function measure({mode='baseline',live=true,seconds=10,trial=1,shot=false}){
 await page.locator('#reset').click();await ready();await page.locator('#mode').selectOption(mode);await ready();await page.locator('#seconds').selectOption(String(seconds));await page.bringToFront();
 const before=await read(),name=String(++number).padStart(3,'0')+'-'+before.group+'-'+before.theme+'-'+mode+'-'+(live?'live':'paused')+'-'+trial;
 assert.deepEqual(before.errors,[]);await page.locator(live?'#live':'#paused').click();
 // No CDP polling, screenshots or page-report reads in the timing window.
 await wait(seconds*1000+1000);await ready();const q=await read();assert.ok(q.latest);assert.deepEqual(q.errors,[]);
 await fs.writeFile(out+'/'+name+'.json',JSON.stringify(q,null,2));if(shot){await page.locator('#capture').click();await page.screenshot({path:out+'/'+name+'.png'});}
 const m=q.latest,summary={name,group:q.group,theme:q.theme,mode,live,trial,seconds:m.seconds,frame:m.frame,simulation:m.simulation,collector:m.collector,submit:m.submit,gpu:m.gpu,drawCalls:m.drawCalls,triangles:m.triangles,validity:m.validity,initialState:m.initialState,endState:m.endState,actualTicks:m.actualTicks,combatSeconds:m.combatSeconds,debt:m.debt,discarded:m.discarded,heap:m.heap,resolution:q.resolution,hardware:q.hardware,errors:q.errors,screen:shot?name+'.png':null};report.records.push(summary);await persist();console.log(JSON.stringify({sample:name,p95:m.frame.p95,mean:m.frame.mean,gpu:m.gpu.mean,ticks:m.actualTicks,valid:m.validity.timingValid,gpuValid:m.validity.gpuValid,reasons:m.validity.reasons}));return q;
}
try{
 await page.goto(url,{timeout:300000});await page.bringToFront();await ready();report.initial=await read();await page.screenshot({path:out+'/initial.png'});await persist();
 if(suite==='pilot'){await measure({live:false,shot:true});await measure({live:true,shot:true});}
 else if(suite==='baseline')for(const theme of arg('--themes','industrial,mar-sara,char,ice,frontier').split(','))for(const race of arg('--races','terran,zerg,protoss').split(','))for(const count of arg('--counts','18,48,96').split(',')){await load('density-'+race+'-'+count,theme);for(let trial=1;trial<=Number(arg('--repeat','3'));trial++)await measure({trial,live:true,seconds:Number(arg('--seconds','10')),shot:trial===1});}
 else if(suite==='candidates')for(const theme of arg('--themes','industrial,mar-sara,char,ice,frontier').split(','))for(const race of arg('--races','terran,zerg,protoss').split(',')){await load('density-'+race+'-48',theme);for(let trial=1;trial<=Number(arg('--repeat','3'));trial++)for(const mode of arg('--modes','baseline,lighting,shadow,contact,fxaa,msaa4,baseline').split(','))await measure({mode,live:false,trial,shot:trial===1});}
 else throw Error('Unknown suite '+suite);
 report.finishedAt=new Date().toISOString();report.valid=report.records.every(r=>r.validity.timingValid);report.gpuValid=report.records.every(r=>r.validity.gpuValid);report.passed=report.errors.length===0;await persist();
}catch(e){report.failure=String(e.stack??e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await persist();process.exitCode=1;}
finally{await browser.close();await new Promise(r=>server.close(r));}
