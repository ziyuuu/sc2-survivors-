import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/quality-20261028',origin=process.argv[2]??'http://127.0.0.1:18883',tier=process.argv[3]??'low',constrained=process.argv[4]==='constrained',label=tier+(constrained?'-constrained':'');
await fs.mkdir(root,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const c=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await c.addInitScript(({tier,constrained})=>{globalThis.__name=v=>v;if(constrained){Object.defineProperty(navigator,'deviceMemory',{get:()=>2});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2});}const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=b=>b instanceof Uint32Array&&b.length===1?(b[0]=529,b):random(b);if(!localStorage.getItem('sc2.graphics.v1'))localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:tier,tier,texture:tier}));},{tier,constrained});
const p=await c.newPage();p.setDefaultTimeout(180000);const errors=[],failed=[],bundles=new Set();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/')&&!r.url().endsWith('favicon.ico'))failed.push([r.status(),r.url()]);});p.on('console',m=>{if(m.type()==='error')console.log('console',m.text().slice(0,200));});
const tick=setInterval(async()=>{try{console.log('progress',await p.evaluate(()=>globalThis.__SC2_REPORT__?.().readiness??document.querySelector('[role="status"]')?.textContent));}catch{}},20000);
const click=a=>p.locator(`[data-action="${a}"]:visible`).first().click(),report=()=>p.evaluate(()=>globalThis.__SC2_REPORT__());
try{
 const start=performance.now();await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:300000});const menuMs=performance.now()-start;
 await click('settings');await p.locator('[data-action="settings-tab"][data-tab="graphics"]').click();

 for(const [value,quality]of [['high','high'],['medium','balanced'],['low','performance']]){await p.locator('[data-setting="graphics-preset"]').selectOption(value);assert.equal(await p.locator('[data-setting="quality"]').inputValue(),quality);assert.equal(await p.locator('[data-setting="texture-quality"]').inputValue(),value);}
 await p.locator('[data-setting="graphics-preset"]').selectOption(tier);await p.screenshot({path:`${root}/settings-${label}.png`});await click('settings-back');
 for(const a of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(a);
 await p.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:420000});const ready=await report();assert.equal(ready.readiness.phase,'ready',JSON.stringify(ready.readiness));const readyMs=performance.now()-start;
 await click('flow-continue');await p.waitForFunction(()=>globalThis.__SC2_REPORT__().time>5,null,{timeout:180000});await p.screenshot({path:`${root}/battle-${label}.png`});await click('pause');const battle=await report();
 const sw=await p.evaluate(()=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'sc2-pack-metrics'},[c.port2]);setTimeout(()=>resolve(null),2000);}));
 const result={tier,constrained,menuMs,readyMs,graphics:battle.graphics,resolution:battle.resolution,audio:battle.audio,assets:battle.embeddedAssets,save:battle.save,sw,errors,failed};await fs.writeFile(`${root}/browser-${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({tier,menuMs,readyMs,pcmBytes:battle.audio.pcmBytes,sw,errors,failed}));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await p.reload();await p.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});result.hot=await report();await fs.writeFile(`${root}/browser-${label}.json`,JSON.stringify(result,null,2));
}catch(error){await fs.writeFile(`${root}/browser-${label}-failure.json`,JSON.stringify({error:String(error),report:await report().catch(()=>null),errors,failed},null,2));await p.screenshot({path:`${root}/failure-${label}.png`}).catch(()=>{});throw error;}finally{clearInterval(tick);await c.close();await b.close();}
