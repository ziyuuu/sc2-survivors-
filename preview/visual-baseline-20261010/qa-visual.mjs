import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const index=process.argv.indexOf('--label'),label=index<0?'visual-r1':process.argv[index+1];
const groupIndex=process.argv.indexOf('--groups'),groups=groupIndex<0?['immortal','zealot','baneling','ravager','marine','tank','carrier']:process.argv[groupIndex+1].split(',');
assert.match(label,/^[a-z0-9-]+$/);
const root='reports/local/visual-baseline-20261010',out=root+'/'+label;
await fs.mkdir(out,{recursive:true});
try{await fs.access(out+'/results.json');throw Error('Use a new label; existing evidence is immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
const runner=await fs.readFile(new URL(import.meta.url));await fs.writeFile(out+'/runner.mjs',runner);
const report={label,suite:'visual',runnerSha256:createHash('sha256').update(runner).digest('hex'),build:JSON.parse(await fs.readFile(root+'/lab/build.json','utf8')),method:'Paused current native World. Identical Run/Profile checksum across baseline, no-bloom and direct output. Static diagnostic screenshots, not animation or performance acceptance.',records:[],errors:[]};
const server=labServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false});
const context=await browser.newContext({viewport:{width:1280,height:792},deviceScaleFactor:1}),page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:300000});
const read=()=>page.locator('#report').textContent().then(JSON.parse);
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await ready();
 for(const group of groups){
  await page.locator('#group').selectOption(group);await page.locator('#load').click();await ready();const initial=await read();
  for(const mode of ['baseline','no-bloom','direct']){
   await page.locator('#mode').selectOption(mode);await ready();await page.locator('#capture').click();const q=await read();
   assert.equal(q.state,initial.state);assert.deepEqual(q.errors,[]);assert.equal(q.runtime.assetsPending,0);assert.ok(q.subjects.every(s=>s.loaded));
   const name=group+'-'+mode;await page.screenshot({path:out+'/'+name+'.png'});await fs.writeFile(out+'/'+name+'.json',JSON.stringify(q,null,2));
   report.records.push({name,group,mode,state:q.state,subjects:q.subjects,errors:q.errors,screen:name+'.png'});
  }
  console.log(JSON.stringify({group,captures:3,identicalWorld:true}));
 }
 report.finishedAt=new Date().toISOString();report.passed=report.records.length===groups.length*3&&report.errors.length===0;
}catch(e){report.failure=String(e.stack??e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
