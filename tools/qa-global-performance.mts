/** Global frame diagnosis. Timing wrappers and CPU sampling are QA-only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {writeArchive,readArchive} from '../src/persistence/archive';

const option=(name:string,fallback:string)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const baseline=option('baseline','');
const candidateFiles=['src/render/scene/battle-renderer.ts','src/ui/hud/field-interactions.ts','src/ui/hud/packed-console.ts','src/render/effects/source/event-index.ts','src/render/effects/source-combat-effects.ts','src/render/effects/combat-audio-router.ts'];
if(baseline){const changed=execFileSync('git',['diff','--name-only',baseline,'--','src'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);assert.deepEqual(changed.filter(file=>!candidateFiles.includes(file)),[],'Unrelated source changes invalidate this baseline overlay; use the matching isolated checkout');}
const original=new Map(baseline?candidateFiles.map(file=>[path.resolve(file).replaceAll('\\','/'),execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:4*1024*1024})]):[]);
async function sourceDigest(){
 const hash=createHash('sha256');
 const visit=async(dir:string)=>{for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else{hash.update(file);hash.update(await fs.readFile(file));}}};
 await visit('src');return hash.digest('hex');
}
const sourceBefore=await sourceDigest();
let url=option('url','auto');
assert.ok(!baseline||url==='auto','Baseline overlays require the isolated server');
const server=url==='auto'?await createServer({root:process.cwd(),cacheDir:'reports/local/global-performance-20261120/vite-cache',optimizeDeps:{entries:['index.html']},plugins:[{name:'qa-frozen-performance-inputs',enforce:'pre',load(id){return original.get(id.split('?')[0]);}}],server:{host:'127.0.0.1',port:0,strictPort:false},clearScreen:false}):undefined;
if(server){await server.listen();const address=server.httpServer!.address();assert.ok(address&&typeof address!=='string');url='http://127.0.0.1:'+address.port+'/';}
const label=option('label','baseline'),caseName=option('case','zerg12');
const out=path.resolve(process.env.SC2_GLOBAL_QA_OUT??'D:/星际/reports/local/global-performance-20261120',label+'-'+caseName);
await fs.mkdir(out,{recursive:true});
assert.equal(caseName,'zerg12','Add explicitly reviewed fixtures before extending this probe');
async function fixedFixture(){
 const file=path.resolve(process.env.SC2_GLOBAL_QA_OUT??'D:/星际/reports/local/global-performance-20261120','fixture.json');
 try{const archive=await fs.readFile(file,'utf8'),{bundle}=readArchive(archive);assert.ok(bundle.run);return {archive,snapshot:bundle.run};}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
const randomUUID=globalThis.crypto.randomUUID;
globalThis.crypto.randomUUID=()=> '00000000-0000-4000-8000-000000000017';
const seed=17,w=new World({race:'zerg',difficulty:'normal',seed,terrain:campaignTerrain(chooseCampaignMap(seed))});
w.starship.enabled=true;
if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
assert.ok(w.start());
globalThis.crypto.randomUUID=randomUUID;
w.missions.enabled=w.encounters.enabled=false;w.expedition.ledger=[];w.pods=[];w.entities.clear();w.expedition.zerglingPairs=[];
for(const group of w.expedition.building!.groups)group.enabled=false;
w.expedition.familySlots=['hydralisk','aberration','devourer','viper','brood_lord'];
for(const [i,f] of w.expedition.familySlots.entries()){
 w.expedition.tech['unlock.'+f]=1;
 for(const dz of [-3,-1,1,3]){
  const p=w.freePosition(f,{x:w.anchor.x+(i-2)*2,z:w.anchor.z+dz},0,4)??w.anchor;
  w.addFamilyMember(f,p,5);
 }
}
w.stage=11;w.endStage();assert.ok(w.skipReward());assert.ok(w.finishIntermission());
while(w.phase==='battle'&&w.stageElapsed<39&&(w.expedition.zergEncounters?.counters.mother.entered??0)===0)w.step();
assert.equal(w.phase,'battle');
const snapshot=w.captureRun();
const archive=writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot,equipment:w.starship.account});
assert.ok(readArchive(archive),'The fixed fixture must pass the real archive validator');
 await fs.writeFile(file,archive);return {archive,snapshot};
}
const {archive,snapshot}=await fixedFixture();
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
await page.addInitScript({content:'globalThis.__name=(v)=>v;'});
page.setDefaultTimeout(45000);
try {
 await page.goto(url);
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});
 assert.ok(await page.evaluate(()=>!!(window as any).__SC2_DEBUG__),'Use a development endpoint for the diagnostic probe');
 await page.locator('[data-action=settings]:visible').first().click();
 await page.locator('[data-action=settings-tab][data-tab=saves]').click();
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();
 await(await chooser).setFiles({name:'global-frame-field.json',mimeType:'application/json',buffer:Buffer.from(archive)});
 console.log('Loading '+caseName+' snapshot at '+snapshot.state.time.toFixed(3)+' seconds');
 const loadingProgress=setInterval(()=>{void page.evaluate(()=>{const r=(window as any).__SC2_REPORT__();return {phase:r.phase,time:r.time,readiness:r.readiness,assetsReady:r.assetsReady};}).then(r=>console.log('Preparing '+JSON.stringify(r))).catch(()=>{});},25000);
 try{await page.waitForFunction(()=>{const r=(window as any).__SC2_REPORT__();return ['ready','error'].includes(r.readiness.phase)||r.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:300000,polling:500});}finally{clearInterval(loadingProgress);}
 const loaded=await page.evaluate(()=>(window as any).__SC2_REPORT__());assert.notEqual(loaded.readiness.phase,'error',JSON.stringify(loaded.readiness));
 await page.evaluate((tick:number)=>{
  const d=(window as any).__SC2_DEBUG__,world=d.world,step=world.step;
  d.healthLock(true);
  const gate={limit:tick+180,holding:false};(window as any).qaGate=gate;
  world.step=function(){if(!gate.holding&&world.tick<gate.limit)return step.call(this);};
 },snapshot.state.tick);
 console.log('Prepared field '+JSON.stringify({phase:loaded.phase,ready:loaded.readiness}));
 if(loaded.readiness.phase==='ready'&&loaded.readiness.kind||await page.locator('[data-action=flow-continue]:visible').count())await page.locator('[data-action=flow-continue]').click();
 if(await page.locator('.pause-actions [data-action=pause]:visible').count())await page.locator('.pause-actions [data-action=pause]').click();
 await page.evaluate(()=>{
  const debug=(window as any).__SC2_DEBUG__,view=debug.view,world=debug.world;
  debug.healthLock(true); // Controlled repeatable diagnosis; not natural survival or balance validation.
  const state={active:false,frames:[] as number[],spans:{} as Record<string,{calls:number,total:number,max:number}>,heap:0,start:0};
  const wrap=(object:any,key:string,label:string)=>{
   if(typeof object?.[key]!=='function')return;
   const original=object[key];
   object[key]=function(...args:any[]){
    if(!state.active)return original.apply(this,args);
    const start=performance.now();
    try{return original.apply(this,args);}finally{
     const ms=performance.now()-start,span=state.spans[label]??={calls:0,total:0,max:0};span.calls++;span.total+=ms;span.max=Math.max(span.max,ms);
    }
   };
  };
  for(const key of ['step','changed','updateEconomy','updateProduction','updateAuras','updateTalentSupport'])wrap(world,key,'world.'+key);
  wrap(world.contacts,'resolve','contacts.resolve');wrap(world.hash,'rebuild','hash.rebuild');
  for(const key of ['render','prepareRosterAssets','renderScene'])wrap(view,key,'view.'+key);
  wrap(view.renderer,'render','three.render');
  for(const key of ['measureText','fillText','fillRect','strokeRect','drawImage']){
   const original=(CanvasRenderingContext2D.prototype as any)[key];
   (CanvasRenderingContext2D.prototype as any)[key]=function(...args:any[]){
    if(!state.active||this.canvas.id!=='minimap-canvas')return original.apply(this,args);
    const start=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-start,span=state.spans['minimap.'+key]??={calls:0,total:0,max:0};span.calls++;span.total+=ms;span.max=Math.max(span.max,ms);}
   };
  }
  for(const [proto,key] of [[Element.prototype,'clientWidth'],[Element.prototype,'clientHeight'],[HTMLElement.prototype,'offsetHeight']] as const){
   const descriptor=Object.getOwnPropertyDescriptor(proto,key);if(!descriptor?.get)continue;
   Object.defineProperty(proto,key,{...descriptor,get(){
    if(!state.active)return descriptor.get!.call(this);
    const start=performance.now();try{return descriptor.get!.call(this);}finally{const ms=performance.now()-start,span=state.spans['layout.'+key]??={calls:0,total:0,max:0};span.calls++;span.total+=ms;span.max=Math.max(span.max,ms);}
   }});
  }
  const gl=view.renderer.getContext();
  for(const key of ['drawElements','drawElementsInstanced','drawArrays','drawArraysInstanced'])wrap(gl,key,'gl.'+key);
  for(const key of ['sourceCombatEffects','fx','nonHeroEffects','funVisuals','specialVisuals','doomsdayViews','armedFields','armedCarriers','contact','sceneShadows','refraction']){
   wrap(view[key],'update',key+'.update');wrap(view[key],'render',key+'.render');
  }
  let previous:number|undefined;
  const frame=(now:number)=>{if(state.active&&previous!==undefined)state.frames.push(now-previous);previous=state.active?now:undefined;requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
  (window as any).qaGlobal=state;
 });
 await page.waitForFunction(()=>(window as any).__SC2_DEBUG__.world.tick>=(window as any).qaGate.limit,null,{timeout:90000});
 await page.waitForTimeout(500);
 await page.waitForFunction(()=>(window as any).__SC2_REPORT__().simulationBacklogSeconds<1/30,null,{timeout:15000,polling:'raf'});
 const before=await page.evaluate(()=>{const q=(window as any).qaGlobal,gate=(window as any).qaGate;q.frames=[];q.spans={};gate.limit+=480;q.active=true;q.start=performance.now();return (window as any).__SC2_REPORT__();});
 console.log('Sampling frame costs');
 await page.waitForFunction(()=>(window as any).__SC2_DEBUG__.world.tick>=(window as any).qaGate.limit,null,{timeout:90000,polling:'raf'});
 const measured=await page.evaluate(()=>{const q=(window as any).qaGlobal;q.active=false;return {wallMs:performance.now()-q.start,frames:q.frames,spans:q.spans,after:(window as any).__SC2_REPORT__(),heapBytes:(performance as any).memory?.usedJSHeapSize};});
 assert.equal(measured.after.phase,'battle');
 await page.waitForTimeout(300);
 const endState=await page.evaluate(async()=>{
  const {encodeGraph}=await import('/src/persistence/graph-codec.ts' as string),world=(window as any).__SC2_DEBUG__.world;
  // Preserve Maps, Sets, shared references and infinite timers in the comparison.
  return encodeGraph({run:world.captureRun(),visualEvents:world.visualEvents});
 });
 await fs.writeFile(path.join(out,'end-state.json'),JSON.stringify(endState));
 await page.screenshot({path:path.join(out,'field.png')});
 if(option('layout','0')==='1'){
  const layouts=[];
  for(const [width,height] of [[1280,800],[844,390],[390,844],[1280,800]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(({width,height})=>{const r=(window as any).__SC2_DEBUG__.view.report().resolution;return r.cssWidth===width&&r.cssHeight===height;},{width,height});
   await page.waitForTimeout(250);
   const read=()=>page.evaluate(()=>{
    const army=document.querySelector<HTMLElement>('#army-hud')!,root=document.querySelector<HTMLElement>('#battle-console')!;
    const box=(e:Element)=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
    return {mode:root.parentElement!.dataset.hudMode,army:box(army),row:box(root.querySelector('.army-row')!),heightVar:root.parentElement!.style.getPropertyValue('--packed-army-height'),columns:army.style.getPropertyValue('--packed-columns'),seats:[...root.querySelectorAll<HTMLElement>('[data-seat]')].map(e=>({key:e.dataset.seat,box:box(e),hidden:e.offsetParent===null}))};
   });
   const open=await read();assert.ok(open.army.width>0);assert.ok(open.army.height>0);assert.ok(open.seats.length>0);
   await page.locator('#army-toggle').click();await page.waitForTimeout(150);const folded=await read();
   await page.locator('#army-toggle').click();await page.waitForTimeout(150);const reopened=await read();
   assert.deepEqual(reopened,open,'Roster geometry must survive fold/unfold');
   const projection=await page.evaluate(async()=>{
    const {FieldInteractions}=await import('/src/ui/hud/field-interactions.ts' as string),d=(window as any).__SC2_DEBUG__,w=d.world,view=d.view;
    const fake=Object.create(w);fake.paused=false;fake.encounters={...w.encounters,expanded:{...w.encounters.expanded,short:{id:'qa-field',kind:'infectedTerrans',corrupt:true,point:{...w.anchor},attackRequested:false}}};
    const parent=document.createElement('div');document.body.append(parent);
    try{
     const actual=new FieldInteractions(parent),expected=new FieldInteractions(parent),legacyView=Object.create(view);
     Object.defineProperty(legacyView,'viewportSize',{get:()=>({width:view.canvas.clientWidth,height:view.canvas.clientHeight})});
     actual.update(fake,view);expected.update(fake,legacyView);
     const buttons=[...parent.querySelectorAll('button')].map(b=>({left:b.style.left,top:b.style.top,hidden:b.hidden}));
     fake.paused=true;actual.update(fake,view);expected.update(fake,legacyView);
     return {buttons,cleared:parent.querySelectorAll('button').length===0};
    }finally{parent.remove();}
   });
   assert.equal(projection.buttons.length,2);assert.deepEqual(projection.buttons[0],projection.buttons[1]);assert.ok(projection.cleared);
   layouts.push({width,height,open,folded,projection});
   await page.screenshot({path:path.join(out,`layout-${width}-${height}.png`)});
  }
  await fs.writeFile(path.join(out,'layouts.json'),JSON.stringify(layouts,null,2));
 }
 await page.evaluate(()=>(window as any).qaGate.limit=Infinity);
 const cdp=await page.context().newCDPSession(page);
 console.log('Sampling CPU separately from frame timing');
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await page.waitForTimeout(6000);
 const {profile}=await cdp.send('Profiler.stop');await cdp.send('Profiler.disable');
 await fs.writeFile(path.join(out,'cpu.json'),JSON.stringify(profile));
 const nodes=new Map(profile.nodes.map((n:any)=>[n.id,n])),parent=new Map<number,number>();
 for(const n of profile.nodes)for(const child of n.children??[])parent.set(child,n.id);
 const self=new Map<string,number>(),inclusive=new Map<string,number>();
 const key=(n:any)=>n.callFrame.functionName+' '+n.callFrame.url.replace(url.replace(/\/$/,''),'').split('?')[0]+':'+(n.callFrame.lineNumber+1);
 for(let i=0;i<(profile.samples?.length??0);i++){
  const id=profile.samples![i],dt=profile.timeDeltas?.[i]??0,node=nodes.get(id);if(!node)continue;
  const label=key(node);self.set(label,(self.get(label)??0)+dt);
  const seen=new Set<string>();let at:number|undefined=id;
  while(at!==undefined){const n=nodes.get(at);if(!n)break;const label=key(n);if(!seen.has(label)){inclusive.set(label,(inclusive.get(label)??0)+dt);seen.add(label);}at=parent.get(at);}
 }
 const top=(m:Map<string,number>)=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,35).map(([name,us])=>({name,ms:Math.round(us/100)/10}));
 const frames=measured.frames.filter((n:number)=>n>0).sort((a:number,b:number)=>a-b);
 const sourceAfter=await sourceDigest();
 const report={label,caseName,source:'development',baseline:baseline||null,sourceBefore,sourceAfter,stateHash:createHash('sha256').update(JSON.stringify(endState)).digest('hex'),controlledHealthLock:true,viewport:{width:1280,height:800},
  start:before.time,end:measured.after.time,frames:frames.length,wallMs:measured.wallMs,
  medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],maxFrameMs:frames.at(-1),
  backlogBefore:before.simulationBacklogSeconds,backlogAfter:measured.after.simulationBacklogSeconds,
  entities:measured.after.entities,drawCalls:measured.after.drawCalls,triangles:measured.after.triangles,
  memory:measured.after.resourceMemory,heapBytes:measured.heapBytes,resolution:measured.after.resolution,sourceCombat:measured.after.sourceCombat,
  spans:measured.spans,cpuSelf:top(self),cpuInclusive:top(inclusive),errors};
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));
 assert.equal(sourceBefore,sourceAfter,'Source changed during sampling; this run is not a valid comparison');
 assert.deepEqual(errors,[]);assert.deepEqual(measured.after.errors,[]);
 console.log(JSON.stringify({out,start:report.start,end:report.end,frames:report.frames,p95:report.p95FrameMs,backlog:report.backlogAfter,entities:report.entities,drawCalls:report.drawCalls,spans:report.spans,top:report.cpuSelf.slice(0,15)}));
} catch(error){
 const failure={error:String(error),errors,state:await page.evaluate(()=>(window as any).__SC2_REPORT__?.()).catch(e=>String(e))};
 await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(failure,null,2));
 console.error(JSON.stringify({error:failure.error,errors,state:typeof failure.state==='object'?{phase:failure.state?.phase,time:failure.state?.time,readiness:failure.state?.readiness,assetsReady:failure.state?.assetsReady}:failure.state}));
 throw error;
} finally {await browser.close();await server?.close();}
