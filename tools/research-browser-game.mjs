/** Read-only, bounded inspection of a public browser game in an isolated profile. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
const url=process.argv[2],out=path.resolve(process.argv[3]??'reports/local/browser-game-research-20261028');
if(!url)throw new Error('Usage: node tools/research-browser-game.mjs URL OUTPUT [seconds]');
const seconds=Math.min(90,Math.max(1,Number(process.argv[4]??15)));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
// Close the isolated browser even if a renderer becomes unresponsive during inspection.
process.once('SIGINT',()=>browser.close().finally(()=>process.exit(130)));
process.once('SIGTERM',()=>browser.close().finally(()=>process.exit(143)));
const records=[],errors=[],failed=[],pending=[],consoleLines=[];
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||m.text().includes('GPU ledger:')){consoleLines.push({type:m.type(),text:m.text().slice(0,20000)});if(consoleLines.length>100)consoleLines.shift();}});
page.on('response',res=>{const h=res.headers(),r={url:res.url(),status:res.status(),type:res.request().resourceType(),contentType:h['content-type'],contentLength:h['content-length'],encoding:h['content-encoding']};records.push(r);
 if(res.ok()&&(['document','script'].includes(r.type)||new URL(r.url).pathname.endsWith('-manifest.json')))pending.push((async()=>{try{const body=await res.body();r.bytes=body.length;r.sha256=createHash('sha256').update(body).digest('hex');if(body.length<4e6){r.local=String(records.indexOf(r)).padStart(3,'0')+'-'+path.basename(new URL(r.url).pathname||'index.html');await fs.writeFile(path.join(out,r.local),body);}}catch(e){r.bodyError=String(e);}})());
});
page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push({url:r.url(),reason:r.failure()?.errorText}));
try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});}catch(e){errors.push(String(e));}
await page.waitForTimeout(seconds*1000);
async function snapshot(label='entry'){
await page.evaluate(()=>window.__gpuLedger?.());
const state={url:page.url(),title:await page.title(),text:(await page.locator('body').innerText()).slice(0,12000),scripts:await page.locator('script[src]').evaluateAll(x=>x.map(n=>n.src)),links:await page.locator('a[href]').evaluateAll(x=>x.map(n=>({text:n.textContent,url:n.href}))),capability:await page.evaluate(async()=>{let adapter=null;try{adapter=await navigator.gpu?.requestAdapter();}catch{}return{webgpu:!!navigator.gpu,adapter:!!adapter,canvas:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height})),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,encoded:r.encodedBodySize,decoded:r.decodedBodySize,transfer:r.transferSize}))};})};
await page.screenshot({path:path.join(out,label+'.png')});await fs.writeFile(path.join(out,'page.html'),await page.content());await Promise.allSettled(pending);
const report={...state,records,errors,failed,consoleLines};await fs.writeFile(path.join(out,label+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({title:state.title,text:state.text,canvas:state.capability.canvas,requests:records.length,errors,failed,console:consoleLines.slice(-4)},null,2));
if(process.argv.includes('--blp-headers')){
 const urls=[...new Set(records.map(r=>r.url).filter(u=>u.includes('/character/')&&u.endsWith('.blp')))].slice(0,6),rows=[];
 for(const asset of urls){try{const res=await context.request.get(asset,{headers:{Range:'bytes=0-19'},timeout:15000}),b=await res.body();rows.push({url:asset,status:res.status(),...(b.length>=20&&b.toString('ascii',0,4)==='BLP2'?{magic:'BLP2',width:b.readUInt32LE(12),height:b.readUInt32LE(16),encoding:b[8],alphaDepth:b[9]}:{unrecognized:true})});}catch(e){rows.push({url:asset,error:String(e)});}}
 await fs.writeFile(path.join(out,label+'-blp-headers.json'),JSON.stringify(rows,null,2));
}
}
try{
await snapshot();
if(process.argv.includes('--hold')){
 const timer=setTimeout(()=>browser.close().finally(()=>process.exit()),600000);
 console.log('Ready: JSON commands state, click {x,y}, key {key}, close. Auto close in 10 minutes.');
 const input=createInterface({input:process.stdin});let n=0;
 for await(const line of input){try{const cmd=JSON.parse(line);if(cmd.action==='close')break;if(cmd.action==='click')await page.mouse.click(cmd.x,cmd.y);if(cmd.action==='key')await page.keyboard.press(cmd.key);await page.waitForTimeout(1500);await snapshot('step-'+(++n));}catch(e){console.log(String(e));}}
 clearTimeout(timer);input.close();
}
}finally{await browser.close();}
