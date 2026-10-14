import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createEnvironmentReviewServer} from './serve-environment-full-map.mjs';
const out=process.argv[2]??'reports/local/mvp5-full-map-20261014/cost-r1';
await fs.access(out).then(()=>{throw Error('Evidence exists')},e=>{if(e.code!=='ENOENT')throw e});await fs.mkdir(out,{recursive:true});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');await fs.copyFile('reports/local/mvp5-full-map-20261014/viewer-build.json',out+'/build.json');
const server=createEnvironmentReviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),records=[],errors=[];
try{
 for(let pair=0;pair<3;pair++)for(const theme of ['industrial','ice'])for(const before of pair%2?[false,true]:[true,false]){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/?theme='+theme+'&site=2'+(before?'&before=1':''));await page.waitForFunction(()=>window.__ENV_SAMPLE__?.report().ready,null,{timeout:180000});
  const row=await page.evaluate(async()=>{
   const api=window.__ENV_SAMPLE__,gl=document.querySelector('canvas').getContext('webgl2');api.pause(true);api.setTime(3);api.setStage(18);gl.finish();
   const next=()=>new Promise(r=>requestAnimationFrame(r));for(let i=0;i<10;i++)await next();
   const intervals=[];let prior=await next();for(let i=0;i<120;i++){const now=await next();intervals.push(now-prior);prior=now;}
   // Includes GPU completion and synchronous driver work; not a CPU-only timer.
   const completion=[];for(let i=0;i<20;i++){await next();const begin=performance.now();api.draw();gl.finish();completion.push(performance.now()-begin);}
   const summarize=a=>{const sorted=[...a].sort((a,b)=>a-b);return {n:a.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),raw:a}};
   const dbg=gl.getExtension('WEBGL_debug_renderer_info');return {runtime:api.report(),rafMs:summarize(intervals),drawThroughGpuCompletionMs:summarize(completion),device:{userAgent:navigator.userAgent,renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),visibility:document.visibilityState,focused:document.hasFocus()}};
  });records.push({pair,theme,before,...row});await fs.writeFile(out+'/progress.json',JSON.stringify(records,null,2));console.log(JSON.stringify({pair,theme,before,loadMs:row.runtime.loads,raf:row.rafMs.median,complete:row.drawThroughGpuCompletionMs.median,memory:row.runtime.memory,render:row.runtime.render}));await context.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/result.json',JSON.stringify({passed:true,at:new Date().toISOString(),method:'Three alternating-order fresh-context pairs per industrial/ice map, same frozen native camera and seed 529, 1440x900 DPR1. Existing pre-layout bundle and full-layout bundle. Terrain viewer only, headless Chrome on this host, normal browser throttling; OS/driver/filesystem caches not reset. RAF samples and manual draw-to-GPU-completion samples are separate. Does not establish ordinary gameplay 60 FPS, physical latency or 7B acceptance.',records,errors},null,2));
}catch(e){await fs.writeFile(out+'/failure.json',JSON.stringify({error:String(e.stack??e),records,errors},null,2));throw e}finally{await browser.close();await new Promise(r=>server.close(r))}
