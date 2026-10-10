import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const [build,label]=process.argv.slice(2);for(const value of [build,label])assert.match(value,/^[a-z0-9-]+$/);
const root='reports/local/material-batch2-20261010',out=root+'/'+label;await fs.mkdir(out,{recursive:true});
await fs.access(out+'/results.json').then(()=>{throw Error('Evidence exists');},e=>{if(e.code!=='ENOENT')throw e;});
const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),method:'Actual World.castFamilyAbility and World.hit; finite native blink barrier observed in per-instance GPU material data. Diagnostic clocks, not natural or physical acceptance.',records:[],errors:[]};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:756}});page.setDefaultTimeout(300000);page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text())});
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args});
async function capture(name,expected){const q=await call('draw'),rows=await call('blinkState');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);if(!build.startsWith('baseline'))for(const row of rows){assert.ok(row.activities.length>0);for(const value of row.activities){if(row.identity==='stalker.2'){if(expected==='partial')assert.ok(value>0&&value<1);else assert.ok(Math.abs(value-expected)<1e-6);}else assert.equal(value,0);}}await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,state:q.state,subjects:q.subjects,time:q.time,rows,runtime:q.runtime});}
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true');await call('load','stalker');await call('focus',2);await capture('before',0);
 assert.equal((await call('blink')).accepted,true);await call('focus',2);await capture('start',1);await call('ticks',6);await capture('start-010',1);await call('ticks',114);await capture('hold-2',1);
 const paused=await call('draw');for(let i=0;i<5;i++)assert.equal((await call('draw')).state,paused.state);
 await call('reorder');await capture('reordered',1);await call('reload');await capture('reloaded',1);
 await call('ticks',181);await capture('expired',0);await call('load','stalker');assert.equal((await call('blink')).accepted,true);await call('focus',2);
 let selected=(await call('blinkState')).find(r=>r.identity==='stalker.2');await call('hit',2,selected.native.barrier/2);await capture('half-consumed','partial');
 selected=(await call('blinkState')).find(r=>r.identity==='stalker.2');await call('hit',2,selected.native.barrier+1);assert.ok((await call('blinkState')).find(r=>r.identity==='stalker.2').hp>0);await capture('exhausted-alive',0);
 await call('hit',2,1e8);await capture('death',0);result.passed=true;
}catch(e){result.passed=false;result.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:result.passed,records:result.records.length,errors:result.errors,failure:result.failure}));
