/** Consecutive native-tick frames, not wall-clock animation or performance acceptance. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const [build,label]=process.argv.slice(2);
for(const value of [build,label])assert.match(value,/^[a-z0-9-]+$/);
const root='reports/local/material-batch2-20261010',out=root+'/'+label;
await fs.mkdir(out,{recursive:true});
await fs.access(out+'/results.json').then(()=>{throw Error('Evidence exists; choose a new label');},error=>{if(error.code!=='ENOENT')throw error;});
const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),method:'Native World movement/attack/hit/death. Six simulation ticks between consecutive PNG frames. The gallery replays these sampled states; this is not a wall-clock animation/FPS measurement.',records:[],errors:[],startedAt:new Date().toISOString()};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let context,page;
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args});
async function capture(name){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);await page.evaluate(({name,time})=>document.querySelector('#status').textContent='原生诊断帧 · '+name+' · 模拟时间 '+time.toFixed(2)+' 秒（非实时性能记录）',{name,time:q.time});await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,state:q.state,time:q.time,subjects:q.subjects,runtime:q.runtime});}
async function sequence(group,phase,count){for(let i=0;i<count;i++){await capture(group+'-'+phase+'-'+String(i).padStart(2,'0'));await call('ticks',6);}}
try{
 for(const group of ['marine','baneling','immortal','zealot']){
  context=await browser.newContext({viewport:{width:960,height:640},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(300000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true');
  await call('load',group);await call('focus',1);await sequence(group,'idle',12);
  await call('move');await call('focus',1);await sequence(group,'move',12);
  await call('load',group);await call('combat');await call('focus',1);await sequence(group,'attack',18);
  await call('load',group);await call('focus',1);await call('hit',1,10);await sequence(group,'hit',12);
  await call('hit',1,1e8);await sequence(group,'death',30);
  await context.close();
  await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({group,frames:result.records.length}));
 }
 result.passed=true;
}catch(error){result.passed=false;result.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await context?.close().catch(()=>{});await browser.close();await new Promise(r=>server.close(r));result.finishedAt=new Date().toISOString();await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));}
console.log(JSON.stringify({passed:result.passed,frames:result.records.length,errors:result.errors,failure:result.failure}));
