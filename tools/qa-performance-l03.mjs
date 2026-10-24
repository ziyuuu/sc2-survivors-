import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const [kind='web',variant='baseline',rep='1']=process.argv.slice(2),folder='performance-l03-20261020-'+variant,root=path.resolve('reports/local/performance-l03-20261020',`${kind}-${variant}-${rep}`),offline=kind==='offline';
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={kind,variant,rep,scope:'Fixed map recipe; ordinary production entry, diagnostic stage completion for repeated new runs. Explicit GC samples are retained-JS measurements, not natural peak or VRAM. Component stress is separate from normal UI frequency.',build:JSON.parse(await fs.readFile(`preview/${folder}/build-inputs.json`)),stages:[],screens:[],errors:[],failedRequests:[],network:[],checks:[]};
let ctx,page,cdp,heartbeat,phase='boot';
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
const state=()=>page.evaluate(async()=>{
 const {app:a,sharedMaterialTextures:shared,stores}=L03,w=a.world,v=a.view,p=a.hud.mapPreview;
 const cacheStats=c=>({entries:c.size,characters:[...c].reduce((n,[k,value])=>n+k.length+(typeof value==='string'?value.length:0),0),numberElements:[...c.values()].reduce((n,value)=>n+(Array.isArray(value)?value.length:0),0)});
 const textures=await Promise.all([...shared.images.values()].map(p=>p.catch(()=>null))),imageSources=new Set(),typed=new Set();let decodedPixelEstimate=0,typedBytes=0;
 for(const t of textures){if(!t)continue;const data=t.source.data;if(imageSources.has(data))continue;imageSources.add(data);if(ArrayBuffer.isView(data?.data)){if(!typed.has(data.data.buffer)){typed.add(data.data.buffer);typedBytes+=data.data.byteLength;}}else decodedPixelEstimate+=(data?.width??0)*(data?.height??0)*4;}
 return {at:performance.now(),world:{phase:w.phase,time:w.time,tick:w.tick,runId:w.runId,recipe:w.campaignRecipe,rng:w.rngState},map:{views:v.mapViews.size,hashes:[...v.mapViews.keys()].map(t=>t.definition?.source.sha256),active:v.mapTerrain===w.terrain},models:{batches:v.gpu.size,keys:[...v.gpu.keys()].sort(),memory:v.renderer.info.memory,programs:v.renderer.info.programs.length,errors:v.modelErrors},previews:{overview:cacheStats(p.overview),scroll:cacheStats(a.hud.overlayScroll),savedCharacters:p.cached?.url.length??0,encoding:p.encoding??false},decoded:{textureEntries:shared.images.size,cubeEntries:shared.cubes.size,uniqueImageSources:imageSources.size,typedBytes,decodedPixelEstimate,scope:'typed data bytes measured; ordinary image RGBA dimensions estimate, not browser allocation or VRAM'},embedded:stores.map(s=>({ids:s.preparedCount,total:s.totalCount,logicalBlobBytes:Object.keys(s.urls).reduce((n,id)=>n+s.pack.assets[id].bytes,0),uniquePreparedChunkBytes:[...new Set(Object.keys(s.urls).flatMap(id=>s.pack.assets[id].parts))].reduce((n,i)=>n+s.pack.chunks[i].bytes,0),encodedCharacters:s.encodedChunks.reduce((n,c)=>n+(c?.length??0),0),encodedChunks:s.encodedChunks.filter(c=>c!==null).length})),heap:performance.memory?.usedJSHeapSize,ready:a.readiness.state};
});
async function record(label,ms){await cdp.send('HeapProfiler.collectGarbage');report.stages.push({label,ms,data:await state(),metrics:await cdp.send('Performance.getMetrics'),dom:await cdp.send('Memory.getDOMCounters')});await save();console.log(JSON.stringify({kind,variant,label,ms,heap:report.stages.at(-1).data.heap,maps:report.stages.at(-1).data.map.views}));}
async function enter(theme){
 await page.evaluate(theme=>{L03.recipe={version:3,seed:529,theme};},theme);
 const start=performance.now();
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();
 await page.waitForFunction(()=>['ready','error'].includes(L03.app.readiness.state.phase),null,{timeout:420000});assert.equal(await page.evaluate(()=>L03.app.readiness.state.phase),'ready');
 await page.evaluate(()=>{const a=L03.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});
 await page.locator('[data-action=flow-continue]:visible').click();await page.waitForFunction(()=>L03.app.world.phase==='battle'&&L03.app.hud.mapPreview.cached?.runId===L03.app.world.runId);
 const recipe=await page.evaluate(()=>L03.app.world.campaignRecipe);assert.deepEqual(recipe,{version:3,seed:529,theme});await record(phase,performance.now()-start);
}
async function settle(){await page.evaluate(()=>{const a=L03.app;a.world.endStage();if(!a.world.extractEquipment())throw Error('Fixture settlement refused');a.hud.update();});await page.locator('[data-action=restart]:visible').first().click();await page.waitForFunction(()=>L03.app.world.phase==='menu');}
try{
 ctx=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,offline,args:['--enable-precise-memory-info']});page=ctx.pages()[0];page.setDefaultTimeout(60000);cdp=await ctx.newCDPSession(page);await cdp.send('Performance.enable');
 try{const browser=ctx.browser(),info=await browser.newBrowserCDPSession(),system=await info.send('SystemInfo.getInfo');report.hardware={browser:browser.version(),gpu:system.gpu.devices};await info.detach();}catch(e){report.hardware={unavailable:String(e)};}
 page.on('pageerror',e=>report.errors.push({phase,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),error:r.failure()?.errorText}));page.on('request',r=>{if(/^https?:/.test(r.url()))report.network.push({phase,url:r.url()});});
 const served=[];page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/main.js'))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 report.progress=[];let checking=false;heartbeat=setInterval(async()=>{if(checking)return;checking=true;try{const data=await page.evaluate(()=>({at:performance.now(),ready:window.L03?.app?.readiness.state,phase:window.L03?.app?.world.phase,hidden:document.hidden}));report.progress.push({phase,...data});await save();console.log(JSON.stringify({kind,variant,progress:phase,ready:data.ready?.phase,label:data.ready?.label}));}catch{}finally{checking=false;}},15000);
 await page.addInitScript(()=>{for(const [k,v]of Object.entries({'sc2.renderQuality':'native','sc2.ordinaryEffects':'full','sc2.heroEffects':'full','sc2.animationMode':'complete'}))localStorage.setItem(k,v);performance.setResourceTimingBufferSize(5000);});
 await page.goto(offline?pathToFileURL(path.resolve(`reports/local/performance-l03-20261020/offline-${variant}/performance-l03.html`)).href:`http://127.0.0.1:4439/${folder}/`,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>L03.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 report.served=await Promise.all(served);if(!offline)assert.ok(report.served.some(s=>s.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256));
 const themes=offline?['char','ice','char']:['char','ice','industrial','frontier','mar-sara','char','ice','industrial','frontier','mar-sara','char'];
 for(let i=0;i<themes.length;i++){if(i)await settle();phase=`new-${i}-${themes[i]}`;await enter(themes[i]);if(i<5||i===themes.length-1)await shot(phase);}
 phase='preview-components';
 report.components=await page.evaluate(async()=>{
  const a=L03.app,w=a.world,p=a.hud.mapPreview,src=p.cached.url,img=new Image();img.src=src;await img.decode();const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=900;canvas.getContext('2d').drawImage(img,0,0,1440,900);
  const fixture={phase:'battle',paused:true,runId:'component-capture',tick:0,battlefield:{mapHash:'same-image'}};let writes=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='sc2.ui.save-image')writes++;return original.call(this,k,v);};
  const preview=new L03.MapPreview(),captures=[],urls=[];
  try{for(let i=0;i<12;i++){fixture.tick=i;const start=performance.now();preview.capture(fixture,canvas);const synchronousMs=performance.now()-start;while(preview.encoding)await new Promise(r=>setTimeout(r,5));captures.push({synchronousMs,totalMs:performance.now()-start});urls.push(preview.cached?.url??'');}}finally{Storage.prototype.setItem=original;}
  const snap={config:{race:'terran',difficulty:'normal',frozenTalents:{allocated:0}},state:{entities:new Map(),wallet:{},stage:1,battlefield:{mapHash:'overview-only'},runId:'overview-only'}},entries=[],first=[];
  for(let i=0;i<60;i++){const theme=['char','ice','industrial','frontier','mar-sara'][i%5],stage=i%18+1;snap.config.campaignMap={version:3,seed:529,theme};snap.config.mapHash=theme+'-529';snap.state.stage=stage;const start=performance.now(),url=preview.forRun(snap);if(!url)throw Error('Missing overview');if(i<5)first.push({theme,stage,url});entries.push({i,entries:preview.overview.size,characters:[...preview.overview.values()].reduce((n,s)=>n+s.length,0),ms:performance.now()-start});if(preview.forRun(snap)!==url)throw Error('Immediate overview differs');}
  const revisits=first.map(s=>{snap.config.campaignMap={version:3,seed:529,theme:s.theme};snap.config.mapHash=s.theme+'-529';snap.state.stage=s.stage;return {theme:s.theme,same:preview.forRun(snap)===s.url};});
  const originalId=w.runId,scroll=[];try{for(let i=0;i<120;i++){w.runId='scroll-fixture-'+i;a.hud.put('overlay','<div data-ui-scroll style="height:100px;overflow:auto"><div style="height:1000px">'+i+'</div></div>');document.querySelector('[data-ui-scroll]').scrollTop=73;scroll.push(a.hud.overlayScroll.size);}}finally{w.runId=originalId;a.hud.cache.delete('overlay');a.hud.update();}
  return {captures,writes,captureIdentical:urls.every(u=>u===urls[0]),captureUrl:urls[0],entries,revisits,scroll,overviewFirst:first};
 });
 // Save exact component images separately, and bind their hashes instead of repeating large strings.
 report.components.captureSha256=hash(report.components.captureUrl);await fs.writeFile(root+'/capture.webp',Buffer.from(report.components.captureUrl.split(',')[1],'base64'));delete report.components.captureUrl;
 for(const first of report.components.overviewFirst){first.sha256=hash(first.url);await fs.writeFile(root+'/overview-'+first.theme+'.webp',Buffer.from(first.url.split(',')[1],'base64'));delete first.url;}
 assert.ok(report.components.captureIdentical);assert.ok(report.components.revisits.every(r=>r.same));await record('after-display-stress',0);
 if(!variant.startsWith('baseline')){assert.ok(Math.max(...report.components.scroll)<=64);assert.ok(Math.max(...report.components.entries.map(r=>r.entries))<=8);}
 if(!variant.startsWith('baseline')){
  phase='context';const before=await state();
  const combat=()=>page.evaluate(()=>{const w=L03.app.world;return {epoch:L03.app.view.contextEpoch,json:JSON.stringify({entities:[...w.entities],wallet:w.wallet,stats:w.stats,expedition:w.expedition,statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account},(_k,v)=>v instanceof Map?{map:[...v]}:v instanceof Set?{set:[...v]}:v)};});
  const combatBefore=await combat();await page.evaluate(()=>{L03.ext=L03.app.view.renderer.getContext().getExtension('WEBGL_lose_context');if(!L03.ext)throw Error('No context extension');L03.ext.loseContext();});await page.waitForFunction(()=>L03.app.view.renderer.getContext().isContextLost());await page.evaluate(()=>L03.ext.restoreContext());await page.waitForFunction(()=>!L03.app.view.renderer.getContext().isContextLost()&&!L03.app.readiness.state.kind&&!L03.app.view.entryPreparation&&L03.app.view.screenWarmed.size>0,null,{timeout:240000});
  const after=await state(),combatAfter=await combat();assert.deepEqual(after.world,before.world);assert.deepEqual(after.models.keys,before.models.keys);assert.equal(combatAfter.epoch,combatBefore.epoch+1);assert.equal(combatAfter.json,combatBefore.json);await shot('restored');report.checks.push({name:'real-context-restore',before,after,combatBefore,combatAfter});
 }
 report.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:e.decodedBodySize})));report.captureCalls=await page.evaluate(()=>L03.previewCalls);if(offline)assert.equal(report.network.length,0);assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.pass=true;
}catch(e){report.failure=String(e.stack??e);if(page){report.failureState=await state().catch(error=>({error:String(error)}));await shot('failure').catch(()=>{});}process.exitCode=1;}
finally{clearInterval(heartbeat);await save();await ctx?.close();console.log(JSON.stringify({kind,variant,pass:report.pass,stages:report.stages.length,errors:report.errors.length,failure:report.failure}));}
