import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const [build,label,suite='lighting']=process.argv.slice(2);for(const text of [build,label,suite])assert.match(text,/^[a-z0-9-]+$/);
const root='reports/local/lighting-batch3-20261010',out=root+'/'+label,baseline=build.startsWith('baseline');await fs.mkdir(out,{recursive:true});
await fs.access(out+'/results.json').then(()=>{throw Error('Evidence already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),label,suite,startedAt:new Date().toISOString(),method:'Controlled native World, current-schema reload and actual renderer. Diagnostic placements do not establish natural campaign, physical-device or original-client parity.',records:[],checks:[],errors:[]};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const nativeThrottlingDefaults=['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:suite!=='realtime',...(suite==='realtime'?{ignoreDefaultArgs:nativeThrottlingDefaults}:{})});
if(suite==='realtime')result.presentation={headful:true,nativeThrottlingDefaults:true,removedAutomationFlags:nativeThrottlingDefaults};
let context,page;const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args}),save=()=>fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));
async function open(width=1440,height=900,ratio=1){context=await browser.newContext({viewport:{width,height},deviceScaleFactor:ratio});page=await context.newPage();page.setDefaultTimeout(300000);page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true');}
async function capture(name,extra={}){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);if(!baseline){for(const key of ['shadows','contact']){assert.equal(q.runtime[key].enabled,true);assert.equal(q.runtime[key].ready,true);assert.equal(q.runtime[key].fallback,null);}assert.equal(q.runtime.lighting.theme,q.theme);assert.equal(q.runtime.shadows.resolution,1024);assert.equal(q.runtime.contact.samples,12);assert.equal(q.runtime.contact.strength,.5);assert.deepEqual(q.runtime.contact.depthSize,[q.runtime.resolution.width,q.runtime.resolution.height]);assert.deepEqual(q.runtime.contact.size,q.runtime.contact.depthSize.map(v=>Math.ceil(v/2)));}await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,...q,...extra});await save();return q;}
try{
 if(suite==='lighting'){
  await open();
  for(const theme of ['industrial','mar-sara','char','ice','frontier']){
   await call('acidSetup',theme);await capture(theme+'-acid-cast',{acid:await call('acidState')});await call('ticks',90);let q=await call('acidState');assert.equal(q.zones.length,1);const initial=q.hp,key=q.visual?.zones[0].key;await capture(theme+'-acid-impact',{acid:q});
   if(!baseline){assert.equal(q.visual.zones.length,1);assert.equal(q.visual.zones[0].radius,q.zones[0].radius);assert.deepEqual(q.visual.zones[0].point,q.zones[0].point);assert.equal(q.visual.auxiliaryOutlines,0);}
   const damage=q.zones[0].damage,losses=[];for(let tick=1;tick<=4;tick++){
    await call('ticks',60);q=await call('acidState');losses.push(initial-q.hp);result.lastAcid=q;await save();assert.ok(Math.abs(initial-q.hp-damage*tick)<1e-6);await capture(theme+'-acid-tick-'+tick,{acid:q});
    if(tick===1){await call('acidKill');q=await call('acidState');assert.equal(q.sourceHp,0);assert.equal(q.zones.length,1);await capture(theme+'-acid-source-dead',{acid:q});}
    if(tick===2){const before=q;await call('reload');q=await call('acidState');assert.equal(q.state,before.state);assert.deepEqual(q.zones,before.zones);if(!baseline)assert.equal(q.visual.zones[0].key,key);await capture(theme+'-acid-reloaded',{acid:q});}
   }
   assert.equal(q.zones.length,0);if(!baseline)assert.equal(q.visual.zones.length,0);result.checks.push({theme,fourNativeDamageTicks:losses,damage,sourceDeath:true,midZoneExactReload:true});
  }
  for(const [width,height]of [[1440,900],[844,390],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await call('load','tank','ice');await call('ticks',300);const pose=await call('poseAudit');if(!baseline)assert.ok(pose.length);await capture('pose-'+width,{pose});
   await call('markers','move');let m=await call('markerState');if(!baseline){assert.equal(m.anchorMeshPresent,false);assert.equal(m.destinationVisible,true);assert.equal(m.blobInstances,0);}await capture('move-'+width,{markers:m});await call('ticks',60);m=await call('markerState');if(!baseline)assert.equal(m.destinationVisible,false);
   await call('markers','target');m=await call('markerState');if(!baseline)assert.equal(m.lineVertices,6);await capture('target-'+width,{markers:m});await call('markers','clear');m=await call('markerState');if(!baseline)assert.equal(m.lineVertices,0);await capture('clear-'+width,{markers:m});
  }
  await page.setViewportSize({width:1440,height:900});await call('load','carrier','frontier');await call('ticks',300);const steps=[];for(let i=0;i<12;i++){const q=await call('offsetView',.01,0);steps.push(q.runtime.shadows?.view);await capture('camera-pan-'+i);}result.checks.push({shadowSnap:steps});
  for(const phase of ['setup','reveal','expire']){const hidden=await call('hiddenCaster',phase);assert.equal(hidden.visible,phase==='reveal');assert.equal(hidden.rendered>0,phase==='reveal');await capture('hidden-caster-'+phase,{hidden});}
  // Revisit already-loaded maps to exercise cache rebinding, then restore the WebGL context.
  for(const theme of ['ice','industrial','char','frontier','mar-sara','industrial']){await call('load','immortal',theme);await capture('cached-'+theme+'-'+result.records.length);}
  const restored=await call('contextRestore');await capture('context-restored',{restored});if(!baseline){assert.equal(restored.report.runtime.shadows.ready,true);assert.equal(restored.report.runtime.contact.ready,true);}result.checks.push({contextRestored:true});
  await context.close();
  // Existing quality/DPR logic determines the actual buffer size; no new quality setting is introduced.
  for(const ratio of [1.5,2]){await open(844,390,ratio);await call('load','zealot','char');await call('ticks',300);for(const quality of ['native','balanced','performance']){await call('resolution',quality);await capture('dpr-'+ratio+'-'+quality);}await context.close();}
 }
 if(suite==='realtime')for(const [race,group]of [['terran','marine'],['zerg','hydralisk'],['protoss','immortal']]){
  await open(1440,900);await page.bringToFront();await call('load',group);await call('combat');await call('view',11);
  await page.evaluate(()=>{const chunks=[],stream=document.querySelector('#battle').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};window.nativeRecording={recorder,chunks,stream};recorder.start(1000);});
  const clock=await call('realtime',20);const bytes=await page.evaluate(async()=>{const {recorder,chunks,stream}=window.nativeRecording;await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});for(const track of stream.getTracks())track.stop();return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));});const file=race+'-native-20s.webm';await fs.writeFile(out+'/'+file,Buffer.from(bytes));assert.equal(clock.visible,'visible');assert.equal(clock.focus,true);assert.equal(clock.discardedSeconds,0);assert.ok(clock.simulationTicks>0);await capture(race+'-continuous-end',{clock,video:{file,bytes:bytes.length,mime:'video/webm',method:'Browser MediaRecorder of actual WebGL canvas over measured wall time'}});result.checks.push({race,...clock,video:file});await context.close();console.log(JSON.stringify({race,ticks:clock.simulationTicks,frames:clock.frames,backlog:clock.backlogSeconds}));
 }
 result.passed=true;
}catch(error){result.passed=false;result.failure=String(error.stack??error);console.error(result.failure);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();await save();await context?.close().catch(()=>{});await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:result.passed,records:result.records.length,checks:result.checks.length,errors:result.errors.length}));
