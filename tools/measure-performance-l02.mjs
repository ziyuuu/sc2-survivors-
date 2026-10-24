import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'1',revision=process.argv[3]??'r2',folder='performance-l02-measure-20261020-'+revision,root=path.resolve('reports/local/performance-l02-20261020','measure-'+run),hash=x=>createHash('sha256').update(x).digest('hex');
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={run,revision,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),scope:'Eight alternating pairs per largest original raw/gzip chunk. Fixture JSON reading and SHA verification are outside timed intervals. Timer gaps measure this isolated main-thread fixture, not game FPS or an 8 ms hard guarantee.',samples:[],errors:[]};let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));const served=[];
 page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/main.js'))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 await page.goto('http://127.0.0.1:4439/'+folder+'/');await page.waitForFunction(()=>!!window.L02Measure);report.served=await Promise.all(served);assert.ok(report.served.some(s=>s.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256));
 for(const fixture of report.build.fixtures){
  await page.evaluate(async ({file,expected})=>{const r=await fetch(file),bytes=await r.arrayBuffer(),actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(actual!==expected)throw Error('Fixture changed');window.L02Fixture=JSON.parse(new TextDecoder().decode(bytes));},{file:'chunk-'+fixture.index+'.json',expected:fixture.fixtureSha256});
  // One untimed warmup for each implementation; explicit sequence retained.
  await page.evaluate(async()=>{for(const variant of ['baseline','candidate'])await L02Measure[variant](L02Fixture);});
  for(let round=0;round<8;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate']){
   const row=await page.evaluate(async ({variant,round,index})=>{
    const gaps=[];let last=performance.now(),active=false;
    const timer=setInterval(()=>{const now=performance.now();if(active)gaps.push(now-last);last=now;},1);
    await new Promise(r=>setTimeout(r,24));active=true;last=performance.now();const started=last,heapBefore=performance.memory?.usedJSHeapSize;
    const bytes=await L02Measure[variant](L02Fixture);const ms=performance.now()-started;
    await new Promise(r=>setTimeout(r,8));active=false;clearInterval(timer);
    const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    return {variant,round,index,ms,maxTimerGapMs:Math.max(0,...gaps),gaps,bytes:bytes.length,sha256:sha,heapBefore,heapAfter:performance.memory?.usedJSHeapSize};
   },{variant,round,index:fixture.index});
   assert.equal(row.sha256,fixture.sha256);assert.equal(row.bytes,fixture.bytes);report.samples.push(row);
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,samples:report.samples.length,failure:report.failure}));}
