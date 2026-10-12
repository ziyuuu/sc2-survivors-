import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';

const out=process.argv[2],race=process.argv[3]??'terran',webRoot=process.argv.find(a=>a.startsWith('--web='))?.slice(6)??'dist/web',fixedSeed=process.argv.includes('--fixed-seed');
assert.ok(out?.startsWith('reports/local/cinematic-preload-20261012/'));
await fs.mkdir(out,{recursive:true});
await fs.access(out+'/result.json').then(()=>{throw Error('Evidence already exists');},e=>{if(e.code!=='ENOENT')throw e;});
await fs.copyFile(new URL(import.meta.url),out+'/runner.mts');
const server=createGameServer({webRoot:path.resolve(webRoot),assetRoot:path.resolve(webRoot),backendOptions:{config:{enabled:false}}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const report:any={race,fixedSeed,build:JSON.parse(await fs.readFile(webRoot+'/web-release.json','utf8')),method:'Native formal Web UI, fresh browser context. Optional seed 529 only replaces single-word entropy in this disposable QA browser for matched native maps. Phase observations are wall time, not GPU time or natural-campaign performance.',errors:[],screens:[]};
let browser:any;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 if(fixedSeed)await context.addInitScript(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=(array:any)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=529;return array;}return original(array);};});
 await context.addInitScript(()=>{(window as any).__name=(v:any)=>v;const samples:any[]=[];(window as any).__LOAD_SAMPLES__=samples;let previous='';setInterval(()=>{const r=(window as any).__SC2_REPORT__?.(),s=r?.readiness,key=s?`${s.phase}:${s.label}`:'boot';if(key!==previous){previous=key;samples.push({at:performance.now(),phase:s?.phase,label:s?.label,assets:r?.embeddedAssets});}},50);});
 await page.goto('http://127.0.0.1:'+(server.address()as any).port,{timeout:600000});
 await page.locator('.main-actions [data-action=menu-new]').click({trial:true});
 report.menuMs=await page.evaluate(()=>performance.now());report.menu=await page.evaluate(()=>(window as any).__SC2_REPORT__());const dwell=Number(process.argv.find(a=>a.startsWith('--dwell='))?.slice(8)??0);if(dwell)await page.waitForTimeout(dwell);if(process.argv.includes('--wait-background')){await page.waitForFunction(()=>{const b=(window as any).__SC2_REPORT__?.().background;return b&&b.pending===0&&!b.busy;},null,{timeout:900000});report.optionalQueueCompletedAt=await page.evaluate(()=>performance.now());}
 await page.screenshot({path:out+'/menu.png'});report.screens.push('menu.png');
 await page.locator('.main-actions [data-action=menu-new]').click();
 await page.locator(`[data-action=menu-race][data-race=${race}]`).click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 report.dwellMs=dwell;report.beforeStart=await page.evaluate(()=>(window as any).__SC2_REPORT__());report.startAt=await page.evaluate(()=>performance.now());
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>['ready','error'].includes((window as any).__SC2_REPORT__?.().readiness.phase),null,{timeout:900000});
 report.readyAt=await page.evaluate(()=>performance.now());report.entryMs=report.readyAt-report.startAt;
 report.ready=await page.evaluate(()=>(window as any).__SC2_REPORT__());
 report.browser=await page.evaluate(()=>{const gl=document.querySelector<HTMLCanvasElement>('#battle')!.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return {agent:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,visibility:document.visibilityState,focus:document.hasFocus()};});
 assert.equal(report.ready.readiness.phase,'ready');assert.deepEqual(report.ready.errors,[]);
 await page.screenshot({path:out+'/ready.png'});report.screens.push('ready.png');
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__().time>2);
 await page.screenshot({path:out+'/battle.png'});report.screens.push('battle.png');
 await page.locator('#topbar [data-action=pause]').click();
 report.battle=await page.evaluate(()=>(window as any).__SC2_REPORT__());
 report.samples=await page.evaluate(()=>(window as any).__LOAD_SAMPLES__);
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String((e as Error).stack??e);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser?.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({passed:report.passed,menuMs:report.menuMs,entryMs:report.entryMs,failure:report.failure}));}
