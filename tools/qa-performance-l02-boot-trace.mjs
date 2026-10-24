import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const variant=process.argv[2]??'candidate-r1',rep=process.argv[3]??'1',root=path.resolve('reports/local/performance-l02-20261020',`boot-trace-${variant}-${rep}`);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={variant,rep,scope:'Offline boot only with Chrome trace overhead; independent from primary loading samples.',errors:[]};
let browser,cdp;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});const page=await browser.newPage({viewport:{width:1440,height:900},offline:true});
 page.on('pageerror',e=>report.errors.push(e.message));cdp=await page.context().newCDPSession(page);
 await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,disabled-by-default-v8.compile,blink.user_timing',options:'record-as-much-as-possible',transferMode:'ReturnAsStream'});
 await page.goto(pathToFileURL(path.resolve(`reports/local/performance-l02-20261020/offline-${variant}/performance-l02.html`)).href,{waitUntil:'domcontentloaded',timeout:240000});
 await page.waitForFunction(()=>window.L02?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 report.state=await page.evaluate(()=>({loadedAt:L02.loadedAt,bootFinished:L02.bootFinished,spans:L02.spans,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null}));
 const finished=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const end=await finished;report.dataLoss=end.dataLossOccurred??false;
 const file=root+'/trace.json',handle=await fs.open(file,'wx'),sha=createHash('sha256');let bytes=0;
 try{for(;;){const chunk=await cdp.send('IO.read',{handle:end.stream,size:1024*1024}),data=chunk.base64Encoded?Buffer.from(chunk.data,'base64'):Buffer.from(chunk.data);await handle.writeFile(data);sha.update(data);bytes+=data.length;if(chunk.eof)break;}}finally{await handle.close();await cdp.send('IO.close',{handle:end.stream});}
 report.trace={file,bytes,sha256:sha.digest('hex')};
 const trace=JSON.parse(await fs.readFile(file,'utf8')),totals={};
 for(const e of trace.traceEvents)if(e.ph==='X'&&e.dur){const key=e.name;totals[key]??={count:0,totalMs:0,maxMs:0};totals[key].count++;totals[key].totalMs+=e.dur/1000;totals[key].maxMs=Math.max(totals[key].maxMs,e.dur/1000);}
 report.events=Object.entries(totals).map(([name,s])=>({name,...s})).sort((a,b)=>b.totalMs-a.totalMs);assert.equal(report.errors.length,0);assert.equal(report.dataLoss,false);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await browser?.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({variant,pass:report.pass,trace:report.trace,events:report.events?.slice(0,10),failure:report.failure}));}
