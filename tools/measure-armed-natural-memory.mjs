import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {preview} from 'vite';
import {createBackend} from './backend/service.mjs';
import {observeEliteRenderer,checkElitePixels} from './qa-elite-residency-probe.mjs';
import {observeBattleFrames} from './qa-battle-frame-probe.mjs';

const root=path.resolve(process.env.ARMED_RELEASE_ROOT??'dist/v14-armed-audit-fixes-20261112/packed');
const controlled=process.argv.includes('--controlled');
const release=JSON.parse(await fs.readFile(root+'/web-release.json','utf8'));
if(!process.env.ARMED_RELEASE_ROOT)assert.equal(release.appBuildId,'ce857e80da5d380ea7730c323915b6208751af3d4dacba4d79e4bff9f25a7a2f');
const out=path.resolve(process.env.ARMED_QA_OUT??'reports/local/v14-natural-memory'),execute=promisify(execFile);
await fs.mkdir(out,{recursive:true});
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const fixedSeed=arg('seed')===undefined?undefined:Number(arg('seed'));
const difficultyName=arg('difficulty')??'normal', accountPath=arg('account');
assert.ok(['easy','normal'].includes(difficultyName));
if(fixedSeed!==undefined)assert.ok(Number.isInteger(fixedSeed)&&fixedSeed>=0&&fixedSeed<=0xffffffff);
const stamp=Date.now(), filename=out+'/'+stamp+'.json';
const results={mode:controlled?'controlled 4x fixed-step with allied healing':'realtime',build:release.appBuildId,resourceRelease:release.release,rows:[],switches:[],errors:[]};
async function save(){await fs.writeFile(filename,JSON.stringify(results,null,2));}
const backend=createBackend({config:{enabled:false},maintenance:false});
const server=await preview({configFile:false,publicDir:false,appType:'mpa',logLevel:'error',build:{outDir:root},preview:{port:5289,host:'127.0.0.1',strictPort:false},plugins:[{name:'game-api',configurePreviewServer(s){s.middlewares.use((req,res,next)=>{if(!backend.handle(req,res))next();});}}]});
const bot=(await build({entryPoints:['tools/qa-armed-memory-player.ts'],bundle:true,format:'iife',globalName:'PlayerController',platform:'browser',write:false,minify:true})).outputFiles[0].text;
let browser,page;
async function measure(){
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-proxy-server','--disable-background-timer-throttling'],headless:true});
 const browserCdp=await browser.newBrowserCDPSession();
 page=await browser.newPage({viewport:{width:1200,height:800}});
 page.on('pageerror',e=>results.errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'})));
 if(fixedSeed!==undefined)await page.addInitScript(seed=>{
  const native=crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues=a=>{if(a instanceof Uint32Array&&a.length===1){a[0]=seed;return a;}return native(a);};
 },fixedSeed);
 if(controlled)await page.addInitScript(()=>{
  let serial=0;crypto.randomUUID=()=>('52900000-0000-4000-8000-'+(++serial).toString(16).padStart(12,'0'));
 });
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port);
 const click=a=>page.locator('[data-action="'+a+'"]:visible').first().click({timeout:180000});
 if(accountPath){
  await click('settings');await page.locator('[data-action=settings-tab][data-tab=saves]').click();
  const picker=page.waitForEvent('filechooser');await click('menu-load-file');await (await picker).setFiles(accountPath);
  await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await click('flow-continue');
 }
 await click('menu-new');await page.locator('[data-action=menu-race][data-race=terran]').click();await click('menu-race-next');
 const difficulty=page.locator('[data-action=menu-difficulty][data-difficulty='+difficultyName+']');if(await difficulty.count())await difficulty.click();
 await click('menu-difficulty-next');await click('menu-start');const tutorial=page.locator('[data-tutorial=skip]:visible');await Promise.race([tutorial.waitFor({timeout:60000}),page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000})]);if(await tutorial.isVisible())await tutorial.click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await click('flow-continue');
 await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 const cdp=await page.context().newCDPSession(page);
 const reportFn=(await cdp.send('Runtime.evaluate',{expression:'window.__SC2_REPORT__'})).result;
 const code=await page.evaluate(()=>window.__SC2_REPORT__.toString());
 const name=code.match(/,phase:([\w$]+)\.phase,/)[1];
 const props=id=>cdp.send('Runtime.getProperties',{objectId:id,ownProperties:true});
 const scopes=(await props(reportFn.objectId)).internalProperties.find(p=>p.name==='[[Scopes]]').value;
 let world;
 for(const scope of (await props(scopes.objectId)).result){if(!scope.value?.objectId||scope.value.description==='Global')continue;
  const row=(await props(scope.value.objectId)).result.find(p=>p.name===name);if(row){world=row.value;break;}}
 assert.ok(world?.objectId,'Expected the live World observed by the release reporter');
 if(process.argv.includes('--elite-frames')||process.argv.includes('--elite-pixels')){
  const rendererName=code.match(/\.\.\.([\w$]+)\.report\(\)/)?.[1];
  let installed=false;
  for(const scope of (await props(scopes.objectId)).result){
   if(!scope.value?.objectId||scope.value.description==='Global')continue;
   const obj=(await props(scope.value.objectId)).result.find(p=>p.name===rendererName)?.value;
   if(!obj?.objectId)continue;
   if(process.argv.includes('--frame-profile')){
    const hook=await cdp.send('Runtime.callFunctionOn',{objectId:obj.objectId,functionDeclaration:observeBattleFrames.toString()});
    assert.ok(!hook.exceptionDetails,hook.exceptionDetails?.exception?.description);
   }
   if(process.argv.includes('--elite-pixels')){
    const render=await cdp.send('Runtime.callFunctionOn',{objectId:obj.objectId,functionDeclaration:checkElitePixels.toString(),awaitPromise:true,returnByValue:true});
    assert.ok(!render.exceptionDetails,render.exceptionDetails?.exception?.description);
    results.pixels=render.result.value;assert.equal(Object.keys(results.pixels).length,8);
    assert.deepEqual(results.errors,[]);results.completed=true;await save();return;
   }
   const hook=await cdp.send('Runtime.callFunctionOn',{objectId:obj.objectId,functionDeclaration:observeEliteRenderer.toString()});
   assert.ok(!hook.exceptionDetails,hook.exceptionDetails?.exception?.description);installed=true;break;
  }
  assert.ok(installed,'Expected the release renderer');
 }
 if(process.argv.includes('--inventory')){
  // Read only the release's existing tracked Sources, keeping sampler objects out of the saved results.
  const packed=await fs.readFile(path.join(root,'assets','sc2-entry.'+release.compressedEntrySha256.slice(0,16)+'.js.gz'));
  const registry=gunzipSync(packed).toString().match(/liveVariantSources:([\w$]+)\.size/)?.[1];
  assert.ok(registry,'Expected the texture reporter in the measured build');
  let table;
  for(const scope of (await props(scopes.objectId)).result){
   if(scope.value?.description==='Global'||!scope.value?.objectId)continue;
   const row=(await props(scope.value.objectId)).result.find(p=>p.name===registry&&p.value?.subtype==='map');
   if(row){table=row.value;break;}
  }
  if(table){
   const hook=await cdp.send('Runtime.callFunctionOn',{objectId:table.objectId,functionDeclaration:function(){
    const table=this;
    window.qaTextureInventory=()=>{
     const group={},identities=new Map(),eliteOwners=window.qaEliteOwners?.(),eliteSources={};let duplicateBytes=0;
     for(const [source,binding] of table){
      const texture=binding.textures.map(t=>t.deref()).find(Boolean);if(!texture)continue;
      const raw=source.data,compressed=texture.mipmaps?.reduce((sum,m)=>sum+(ArrayBuffer.isView(m.data)?m.data.byteLength:0),0)??0;
      const bytes=compressed||Math.ceil((raw?.width??0)*(raw?.height??0)*4*(texture.generateMipmaps?4/3:1));
      group[binding.id]=(group[binding.id]??0)+bytes;
      if(eliteOwners&&binding.id.startsWith('model.elite.')){
       const owners=[...(eliteOwners.owners.get(source)??[])].sort().join('|')||'unattributed';
       const key=binding.id+' '+owners;eliteSources[key]=(eliteSources[key]??0)+bytes;
      }
      const key=JSON.stringify([binding.id,binding.image??null,raw?.width,raw?.height,compressed]);
      if(identities.has(key))duplicateBytes+=bytes;identities.set(key,true);
     }
     return {byId:group,repeatedLogicalBytes:duplicateBytes,keys:eliteOwners?.keys,eliteSources};
    };
   }.toString()});
   assert.ok(!hook.exceptionDetails,hook.exceptionDetails?.exception?.description);
  }else console.warn('Texture inventory unavailable in this build scope');
 }
 const installed=await cdp.send('Runtime.callFunctionOn',{objectId:world.objectId,functionDeclaration:'function(){'+bot+';const w=this,c=PlayerController.createMemoryRunPlayer(w); c.initialize();window.qaMove=()=>{c.decisions();if(w.phase==="battle"&&!w.paused&&!w.requiresPlayerDecision)c.think();};window.qaShop=()=>c.intermission();window.qaInfo=()=>({seed:w.runConfig.seed,difficulty:w.difficulty,paused:w.paused,allies:w.allies().length,phase:w.phase,stage:w.stage,window:w.rewardRound,elapsed:w.stageElapsed,remaining:w.duration-w.stageElapsed,decision:w.requiresPlayerDecision,entry:!!w.endlessEntry,equipped:Object.values(w.starship.account.equipped.terran).map(id=>w.starship.account.items[id]?.quality),special:w.specialStages.active?.kind,armed:Object.keys(w.expedition.support.armed?.ranks??{})});return window.qaInfo();}',returnByValue:true});
 assert.ok(!installed.exceptionDetails,installed.exceptionDetails?.exception?.description);
 results.start=installed.result.value;assert.equal(results.start.stage,1);assert.equal(results.start.difficulty,difficultyName);if(fixedSeed!==undefined)assert.equal(results.start.seed,fixedSeed);results.account=accountPath?path.basename(accountPath):'fresh';
 console.log('START',JSON.stringify(results.start));await save();
 if(controlled){
  const wrapped=await cdp.send('Runtime.callFunctionOn',{objectId:world.objectId,functionDeclaration:function(){
   const w=this,step=w.step.bind(w);let lastDecision=-1;
   w.step=()=>{for(let n=0;n<4&&w.phase==='battle';n++){
    if(w.paused)break;
    if(w.requiresPlayerDecision||w.tick%15===0&&w.tick!==lastDecision){lastDecision=w.tick;window.qaMove();}
    for(const u of w.allies())u.hp=u.maxHp;
    const before=w.tick;step();if(w.tick===before)break;
   }};
  }.toString()});assert.ok(!wrapped.exceptionDetails,wrapped.exceptionDetails?.exception?.description);
 }else await page.evaluate(()=>{window.qaTimer=setInterval(()=>{try{window.qaMove()}catch(e){window.qaFailure=String(e);clearInterval(window.qaTimer);}},250);});
 async function read(){return page.evaluate(()=>{const r=window.__SC2_REPORT__();return {...window.qaInfo(),time:r.time,round:r.endless?.round??null,shots:r.stats.shots,gate:r.readiness.phase,pressure:r.resourceMemory.pressure,memory:r.resourceMemory,retired:r.lastStageRetirement?.evicted??[],atlas:r.animationAtlasBytes,models:r.models,variants:r.variantModels.length,threshold:r.graphics.budget.recentOnly?256:512,texture:r.graphics.texture,errors:r.errors,botError:window.qaFailure};});}
 async function record(kind,s){const ids=(await browserCdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id).filter(Number.isSafeInteger);
  // Chrome can retire a helper between CDP enumeration and the OS query.
  // Keep the game sample even when this optional process snapshot is unavailable.
  const cmd='Get-Process | Where-Object { $_.Id -in @('+ids.join(',')+') } | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress';
  let rows=[];
  try{
   const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',cmd],{windowsHide:true});
   if(stdout.trim())rows=[JSON.parse(stdout)].flat();
  }catch(error){console.warn('Process snapshot unavailable',error.message);}
  const inventory=await page.evaluate(()=>window.qaTextureInventory?.());
  results.rows.push({kind,...s,inventory,wall:Date.now(),processes:rows.length,privateBytes:rows.length?rows.reduce((n,r)=>n+r.PrivateMemorySize64,0):null,workingSet:rows.length?rows.reduce((n,r)=>n+r.WorkingSet64,0):null});
  console.log(kind,s.stage,s.time,s.allies,Math.round(s.memory.trackedBytes/1048576),s.pressure);await save();}
 let heartbeat='',lastChange=Date.now(),lastPrint=0;let last,pressure,early=0,shop=0,pre=0,armedNodeHandled=false;const samples={};
 let profiling=false,profileDone=false;
 while(true){const s=await read();assert.ok(!s.botError,s.botError);assert.deepEqual(s.errors,[]);assert.deepEqual(results.errors,[]);
  if(process.argv.includes('--frame-profile')&&!profileDone){
   if(s.stage===15&&!profiling){
    await cdp.send('Performance.enable');await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');profiling=true;
   }
   if(s.stage===17&&s.elapsed>6&&profiling){
    const {profile}=await cdp.send('Profiler.stop');
    const {metrics}=await cdp.send('Performance.getMetrics');
    await fs.writeFile(path.join(out,'frames.cpuprofile'),JSON.stringify({metrics,profile}));
    await fs.writeFile(path.join(out,'slow-frames.json'),JSON.stringify(await page.evaluate(()=>window.qaBattleFrames())));
    profileDone=true;
   }
  }
  const progressKey=[s.stage,s.phase,s.gate,s.time,s.round,s.special].join('|');
  if(heartbeat!==progressKey){heartbeat=progressKey;lastChange=Date.now();}
  if(Date.now()-lastPrint>60000){lastPrint=Date.now();console.log('progress',s.stage,s.phase,s.time,s.gate,s.special,s.allies);}
  if(Date.now()-lastChange>240000)throw Error('No progress for 4 minutes '+progressKey);
  const specialClaim=page.locator('[data-action=special-claim]:visible:enabled');
  if(await specialClaim.isVisible())await specialClaim.click();
  const specialReturn=page.locator('[data-action=special-return]:visible:enabled');
  if(await specialReturn.isVisible())await specialReturn.click();
  if(s.pressure!==pressure){results.switches.push({stage:s.stage,time:s.time,phase:s.phase,pressure:s.pressure,bytes:s.memory.trackedBytes});pressure=s.pressure;await save();}
  const range=samples[s.stage]??={min:s.memory.trackedBytes,max:s.memory.trackedBytes};range.min=Math.min(range.min,s.memory.trackedBytes);range.max=Math.max(range.max,s.memory.trackedBytes);results.stageRanges=samples;
  if(s.round&&s.phase==='battle'&&s.elapsed>=5){await record('endless',s);break;}
  if(s.phase==='lost'){await record('defeat',s);throw Error('Party defeated at stage '+s.stage);}
  if(s.phase==='battle'&&!s.round){if(s.elapsed>=4&&early!==s.stage){early=s.stage;await record('after',s);}
   if(s.remaining<=(controlled?8:3)&&pre!==s.stage){pre=s.stage;await record('before',s);}
   if(s.paused&&!s.decision&&s.gate==='idle'){const resume=page.getByRole('button',{name:'继续',exact:true});if(await resume.isVisible())await resume.click();}
  }
  if(s.phase==='reward'&&s.gate==='idle'){
   if(shop!==s.stage||s.entry&&shop===18&&!armedNodeHandled){await record('intermission',s);shop=s.stage;if(s.entry)armedNodeHandled=true;await page.evaluate(()=>window.qaShop());}
   const defer=page.locator('[data-action=armed-node-later]:visible:enabled');if(await defer.isVisible())await defer.click();
   const skip=page.locator('[data-action=skip]:visible:enabled');if(await skip.isVisible())await skip.click();
  }
  const endless=page.locator('[data-action=endless]:visible:enabled');if(await endless.isVisible())await endless.click();
  if(s.phase==='endless-ready'&&s.gate==='idle')await click('endless-prepare');
  if(s.phase==='endless-ready'&&s.gate==='ready')await page.evaluate(()=>{
   const button=document.querySelector('[data-action=flow-continue]:enabled');
   if(button?.getClientRects().length)button.click();
  });
  if(s.gate==='error')throw Error('Readiness error '+await page.locator('body').innerText());
  if(last!==s.phase){console.log('phase',s.phase,s.stage,s.time);last=s.phase;}
  await page.waitForTimeout(controlled?200:650);
 }
 results.eliteTiming=await page.evaluate(()=>window.qaEliteTiming?.());
 if(process.argv.includes('--frame-profile'))results.frames=await page.evaluate(()=>window.qaBattleFrames());
 results.completed=true;await save();
}
try{await measure();}catch(e){results.failure=String(e.stack??e);console.error(results.failure);if(page)console.error((await page.locator('body').innerText().catch(()=>'' )).slice(-800));await save();process.exitCode=1;}finally{await browser?.close();await server.close();await backend.close();}
