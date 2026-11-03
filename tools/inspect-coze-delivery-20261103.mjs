/** Public delivery observations, not deployment or fault injection.
 * --http compares request-header/cache variants with the current local delivery.
 * --browser uses a new test-only Chrome profile and registers the public worker.
 * --layout-profile=profile-zerg-<timestamp> restores this audit's local checkpoint.
 * Browser modes must run serially with other GPU/browser checks.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const origin='https://sc-survivors.coze.site';
const out=path.resolve('reports/local/coze-live-check-20261103');
const pub=path.resolve('sites/size-optimized-site/public');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const browserHeaders={'accept-encoding':'gzip, deflate, br, zstd'};
const headerNames=['cache-control','content-encoding','vary','x-cache','via'];
await fs.mkdir(out,{recursive:true});

if(process.argv.includes('--http')){
 const rows=[];
 const cases=[
  ['default','sites-sw.js',{}],
  ['chrome-user-agent','sites-sw.js',{'user-agent':ua}],
  ['chrome-encoding','sites-sw.js',browserHeaders],
  ['without-zstd','sites-sw.js',{'accept-encoding':'gzip, deflate, br'}],
  ['identity','sites-sw.js',{'accept-encoding':'identity'}],
  ['cache-busting-query','sites-sw.js?coze-readcheck=20261103',browserHeaders],
  ['legacy-index','sites-pack-index.js',browserHeaders],
  ['versioned-index','sites-pack-index.0bb43ff1011a0ab1462d.js',browserHeaders],
  ['release','web-release.json',browserHeaders],
  ['runtime-config','runtime-config.json',browserHeaders],
  ['launcher','assets/index-5af019d9833114b6.js',browserHeaders],
  ['program','assets/sc2-entry.fb6ca9fb439a1328.js.gz',browserHeaders],
  ['services','api/config',browserHeaders],
 ];
 for(const [name,file,headers] of cases){
  const response=await fetch(origin+'/'+file,{headers,cache:'no-store',signal:AbortSignal.timeout(30000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  const local=await fs.readFile(path.join(pub,file.split('?')[0])).catch(()=>null);
  rows.push({name,path:file,status:response.status,bytes:bytes.length,sha256:sha(bytes),localSha256:local?sha(local):null,matchesLocal:local?bytes.equals(local):null,headers:Object.fromEntries(headerNames.map(k=>[k,response.headers.get(k)]))});
 }
 await fs.writeFile(path.join(out,'delivery-http.json'),JSON.stringify({date:new Date().toISOString(),origin,rows},null,2)+'\n');
 console.log(JSON.stringify(rows));
}else{
 const layoutProfile=process.argv.find(a=>a.startsWith('--layout-profile='))?.slice(17);
 assert(process.argv.includes('--browser')||layoutProfile,'Choose --http, --browser or --layout-profile');
 if(layoutProfile){assert(/^profile-zerg-\d+$/.test(layoutProfile));assert((await fs.lstat(path.join(out,layoutProfile))).isDirectory());}
 const report={date:new Date().toISOString(),origin,mode:layoutProfile?'stable-emulated-layout':'fresh-browser-worker',responses:[],pageErrors:[]};
 let context;
 try{
  context=await chromium.launchPersistentContext(path.join(out,layoutProfile??'fresh-worker-'+Date.now()),{
   executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
   viewport:layoutProfile?{width:390,height:844}:{width:1280,height:720},
   ...(layoutProfile?{isMobile:true,hasTouch:true}:{}),
   args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']
  });
  const page=context.pages()[0];
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('response',r=>{if(['/sites-sw.js','/sites-pack-index.js'].includes(new URL(r.url()).pathname))report.responses.push({url:r.url(),status:r.status(),fromServiceWorker:r.fromServiceWorker(),headers:Object.fromEntries(headerNames.map(k=>[k,r.headers()[k]??null]))});});
  if(layoutProfile){
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
   await page.locator('[data-action="save-continue"]:visible').click();
   await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__?.().readiness.phase),null,{timeout:240000});
   assert.equal(await page.evaluate(()=>globalThis.__SC2_REPORT__().readiness.phase),'ready');
   await page.locator('[data-action="flow-continue"]:visible').click();
   if(await page.evaluate(()=>globalThis.__SC2_REPORT__().phase==='battle'))await page.locator('[data-action="pause"]:visible').click();
   report.layouts=[];
   for(const viewport of [{width:844,height:390},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(1000);
    const geometry=await page.evaluate(()=>({innerWidth,innerHeight,screen:{width:screen.width,height:screen.height},body:{width:document.body.clientWidth,height:document.body.clientHeight},canvas:[...document.querySelectorAll('canvas')].map(c=>{const r=c.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,y:r.y};}),phase:globalThis.__SC2_REPORT__().phase}));
    report.layouts.push({viewport,geometry});
    await page.screenshot({path:path.join(out,'stable-touch-'+(viewport.width>viewport.height?'landscape':'portrait')+'.png')});
   }
  }else{
   await page.goto(origin+'/runtime-config.json');
   report.initialRegistrations=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length);
   assert.equal(report.initialRegistrations,0);
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/sites-sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;});
   report.workers=[];
   for(const worker of context.serviceWorkers())report.workers.push({url:worker.url(),state:await worker.evaluate(()=>({clearPacks:typeof clearPacks,indexFor:typeof indexFor,indexSize:Object.keys(self.SC2_PACK_INDEX??{}).length}))});
   report.fetches=await page.evaluate(async()=>{
    const rows=[];for(const file of ['/sites-sw.js','/sites-pack-index.js','/web-release.json','/api/config']){
     const response=await fetch(file,{cache:'no-store'}),bytes=await response.arrayBuffer();
     rows.push({path:file,status:response.status,bytes:bytes.byteLength,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),cacheControl:response.headers.get('cache-control')});
    }return rows;
   });
  }
  report.complete=true;
 }catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
 finally{await context?.close();await fs.writeFile(path.join(out,layoutProfile?'stable-layout.json':'fresh-browser-worker.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report));
}
