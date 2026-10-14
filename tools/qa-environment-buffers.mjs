import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {createEnvironmentReviewServer} from './serve-environment-full-map.mjs';

const out=process.argv[2],bundle=process.argv.find(a=>a.startsWith('--bundle='))?.slice(9)??'preview/environment-full-map-20261014/sample.js',expectLeak=process.argv.includes('--expect-leak');
assert.ok(out?.startsWith('reports/local/mvp5-lifecycle-20261014/')&&!out.includes('..'));await fs.mkdir(out,{recursive:false});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const bytes=await fs.readFile(bundle);await fs.writeFile(out+'/actual-bundle.js',bytes);
const server=createEnvironmentReviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.addInitScript(()=>{
 const counts={created:0,deleted:0,live:new WeakSet()};
 for(const type of [WebGLRenderingContext,WebGL2RenderingContext]){const create=type.prototype.createBuffer,remove=type.prototype.deleteBuffer;type.prototype.createBuffer=function(...args){const b=create.apply(this,args);if(b){counts.created++;counts.live.add(b)}return b};type.prototype.deleteBuffer=function(b){if(counts.live.delete(b))counts.deleted++;return remove.call(this,b)}}
 window.__ENV_BUFFER_COUNTS__=()=>({created:counts.created,deleted:counts.deleted,live:counts.created-counts.deleted});
});
await page.route('**/sample.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:bytes}));
const report={at:new Date().toISOString(),bundle,sha256:createHash('sha256').update(bytes).digest('hex'),expectLeak,method:'Actual WebGL createBuffer/deleteBuffer accounting across repeated production-map construction and disposal, one fixed renderer, independent viewer clock. WeakSet instrumentation retains no buffer references. Live means created minus explicitly deleted, not measured VRAM or inferred GC behavior. No GL allocation/geometry/material mutation.',rows:[],errors:[]};
page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/?theme=industrial&site=2');await page.waitForFunction(()=>window.__ENV_SAMPLE__?.report().ready);
 for(let cycle=0;cycle<3;cycle++)for(const theme of ['industrial','ice','mar-sara','char','frontier']){
  await page.evaluate(async theme=>{const api=window.__ENV_SAMPLE__;await api.load(theme);api.pause(true);api.selectSite(2);api.setTime(3);api.draw()},theme);await page.waitForFunction(()=>window.__ENV_SAMPLE__.report().ready);
  const r=await page.evaluate(()=>({buffers:window.__ENV_BUFFER_COUNTS__(),scene:window.__ENV_SAMPLE__.report()}));report.rows.push({cycle,theme,...r});console.log(cycle,theme,r.buffers);await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));
 }
 const later=report.rows.slice(10),earlier=report.rows.slice(5,10);report.growth=later.map((r,i)=>({theme:r.theme,buffers:r.buffers.live-earlier[i].buffers.live,geometries:r.scene.memory.geometries-earlier[i].scene.memory.geometries,textures:r.scene.memory.textures-earlier[i].scene.memory.textures}));
 if(expectLeak)assert.ok(report.growth.every(r=>r.buffers>0),'Expected pre-fix retained instance buffers');else assert.ok(report.growth.every(r=>r.buffers===0&&r.geometries===0&&r.textures===0),JSON.stringify(report.growth));
 await page.screenshot({path:out+'/final-frontier.png'});assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack??e);process.exitCode=1}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,growth:report.growth,error:report.failure}));}
