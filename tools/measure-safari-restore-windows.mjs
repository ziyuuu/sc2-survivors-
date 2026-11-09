/** Windows Chrome, local packed build, disposable storage. Compare a first entry
 * with reloading its own durable checkpoint through the ordinary continue button. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const candidate = process.env.SC2_TUTORIAL_DIST_ROOT ?? 'dist/auto-combat-1.2-20261106';
process.env.SC2_TUTORIAL_DIST_ROOT = candidate;
const {serveTutorial} = await import('./serve-short-tutorial-candidate.mjs');
const output = process.env.SC2_MEASURE_OUTPUT ?? 'reports/local/safari-restore-windows-20261109';
const release = JSON.parse(await fs.readFile(path.join(candidate,'candidate/web-release.json'),'utf8'));
await fs.mkdir(output,{recursive:true});

// Keep numbers only. Reports refer to renderer-owned CPU stores, cached blobs
// and decoded PCM separately; the three counters must not be summed as RSS.
function sample(){
 const report = globalThis.__SC2_REPORT__?.();
 if(!report)return null;
 return {
  progress:report.readiness.progress, preparation:report.readiness.phase, label:report.readiness.label,
  phase:report.phase, stage:report.stage, models:report.models, atlas:report.animationAtlasBytes,
  blob:report.embeddedAssets?.memory?.residentBlobBytes, pcm:report.audio.pcmBytes,
  pcmCachePeak:report.audio.peakPcmBytes, gpuBuffers:globalThis.__RUNTIME_MEMORY_TRACE__?.()[0]?.bufferBytes,
  sourcePixels:report.graphics?.textures?.liveVariantPixels, savedAt:report.save.savedAt
 };
}
function startSampling(read){
 globalThis.__RESTORE_SAMPLES__=[];
 globalThis.__RESTORE_TIMER__=setInterval(()=>{
  const item=read();if(item)globalThis.__RESTORE_SAMPLES__.push(item);
 },500);
}
const {installRuntimeMemoryTrace} = await import('./runtime-memory-inventory.mjs');
const server=await serveTutorial({port:0});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.addInitScript(installRuntimeMemoryTrace);
 await context.addInitScript({content:`(${startSampling})(${sample})`});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'deviceMemory',{get:()=>undefined});
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>6});
  localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));
  const random=crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues=b=>b instanceof Uint32Array&&b.length===1?(b[0]=529,b):random(b);
 });
 const page=await context.newPage(),errors=[],entries={};
 page.setDefaultTimeout(180000);
 page.on('pageerror',e=>errors.push(e.message));
 const action=name=>page.locator('[data-action="'+name+'"]:visible').first().click();
 const menu=()=>page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 const capture=async key=>{
  await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__?.().readiness.phase),null,{timeout:240000});
  const ready=await page.evaluate(sample);
  assert.equal(ready.preparation,'ready',ready.label);
  // Capture the ready row even if the timer didn't sample that frame yet.
  const rows=await page.evaluate(()=>globalThis.__RESTORE_SAMPLES__);rows.push(ready);
  const maximum=(name,subset=rows)=>Math.max(0,...subset.map(row=>row[name]).filter(Number.isFinite));
  const models=rows.filter(row=>row.progress>=.35&&row.progress<.72&&row.preparation==='models');
  entries[key]={ready,samples:rows.length,modelStageSamples:models.length,modelStageMaxBlob:maximum('blob',models),
   maxBlob:maximum('blob'),maxPcm:maximum('pcm'),maxAtlas:maximum('atlas'),maxGpuBuffers:maximum('gpuBuffers')};
  console.log(key,JSON.stringify(entries[key]));
  await action('flow-continue');
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='battle',null,{timeout:180000});
  await page.screenshot({path:path.join(output,key+'.png')});
 };
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await menu();await action('menu-new');await page.locator('[data-action="menu-race"][data-race="terran"]').click();
 await action('menu-race-next');await action('menu-difficulty-next');await action('menu-start');await page.locator('[data-tutorial="skip"]:visible').click();
 await capture('fresh');
 await page.waitForFunction(()=>{const r=globalThis.__SC2_REPORT__();return r.phase==='battle'&&r.time>1&&r.save.savedAt>0&&!r.save.busy;});
 await page.reload({waitUntil:'domcontentloaded'});await menu();await action('save-continue');
 await capture('restore');
 assert.deepEqual(errors,[]);
 const result={appBuildId:release.appBuildId,chrome:browser.version(),method:'Windows Chrome, one paired human-race opening with seed 529, medium tier, coarse/unknown-memory desktop fixture, same checkpoint on reload and warm disk cache. Stage counters sampled at 500 ms.',entries,errors};
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
