import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const out=process.env.SC2_QA_OUT??'reports/local/qa-v17';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Local desktop Chrome, 1440x900. Repeated real UI redeploy; resource fingerprints, run state and memory counts. Offline source-byte validation. No remote screenshots, physical-phone claim or automatic campaign-win criterion.',errors:[],runs:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {for(const offline of [false,true]){
 const context=await browser.newContext({offline,viewport:{width:1440,height:900}}),p=await context.newPage(),requests=[];let documents=0;
 p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('request',r=>{requests.push(r.url());if(r.resourceType()==='document')documents++;});
 const start=performance.now();await p.goto(offline?pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href:'http://127.0.0.1:5173/',{timeout:180000});await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
 const run={offline,readySeconds:(performance.now()-start)/1000,restarts:[]};
 await p.getByLabel('难度',{exact:true}).selectOption('easy');await p.locator('[data-action=settings]').click();await p.getByLabel('画质',{exact:true}).selectOption('balanced');await p.locator('[data-action=settings-back]').click();await p.locator('[data-action=start]').click();
 if(!offline){await p.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.paused=true;
  w.acquireHero('raynor');await v.ensureUnitVariant('hero.raynor','marine');w.acquireElite('marine.1');w.addUnit('marine','terran',2,0);w.changed();
 });await p.waitForFunction(()=>document.querySelectorAll('[data-action=elite-replace]:not(:disabled)').length>0);
 const names=await p.locator('[data-action=elite-replace] h3').allTextContents();assert.ok(names.every(s=>s.includes('队伍')&&!s.includes('#')));run.names=names;
 await p.locator('[data-action=elite-replace]').first().click();
 await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.stage=12;w.prepareStage();w.hive.hp=0;w.endStage();w.startEndless();w.spawnPod('tank',{x:4,z:3});w.time+=3;w.landPod(w.pods.at(-1));w.visual('hit',w.allies()[0]);w.paused=true;w.changed();});
 }
 await p.evaluate(()=>{
  window.__restartTimes=[];document.addEventListener('click',e=>{if(e.target.closest('[data-action=restart]'))window.__restartStart=performance.now();},true);
  new MutationObserver(()=>{if(window.__restartStart!==undefined&&document.querySelector('[data-action=start]:not(:disabled)')){const t=window.__restartStart;delete window.__restartStart;requestAnimationFrame(()=>window.__restartTimes.push(performance.now()-t));}}).observe(document.querySelector('#overlay'),{subtree:true,childList:true});
  window.__assetFingerprint=JSON.stringify(window.__SC2_EMBEDDED__??{});
  if(window.__SC2_DEBUG__){const {world:w,view:v}=window.__SC2_DEBUG__;window.__worldIdentity=w;window.__gpuAtlases=[...v.gpu.values()].map(b=>b.textureBytes);window.__modelInstances=[...v.gpu.values()];}
 });
 await p.waitForFunction(()=>window.__SC2_REPORT__().audio.originalDecoded===10,null,{timeout:60000});
 const beforeRequests=requests.length;
 for(let i=0;i<5;i++){
  if(!offline){await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=true;const pod=w.spawnPod('marine',{x:3,z:2});w.landPod(pod);w.changed();});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  if(await p.locator('[data-action=restart]:visible').count()===0)await p.keyboard.press('Escape');
  await p.locator('[data-action=restart]').click();await p.waitForFunction(n=>window.__restartTimes.length===n,i+1);
  const state=await p.evaluate(()=>{const r=window.__SC2_REPORT__(),debug=window.__SC2_DEBUG__,w=debug?.world,v=debug?.view;
   return {phase:r.phase,time:r.time,stage:r.stage,endless:r.endless,stats:r.stats,errors:r.errors,quality:r.resolution.quality,assetsSame:JSON.stringify(window.__SC2_EMBEDDED__??{})===window.__assetFingerprint,
    restartMs:window.__restartTimes.at(-1),difficulty:document.querySelector('[data-setting=difficulty]').value,
    run:w?{sameIdentity:w===window.__worldIdentity,allies:w.allies().length,rank:w.allies()[0].rank,hp:w.allies()[0].hp,pods:w.pods.length,heroes:w.heroes.size,upgrades:w.upgrades.size,wallet:w.wallet,listeners:w.listeners.size}:null,
    memory:v?{...v.renderer.info.memory,programs:v.renderer.info.programs.length}:null,
    modelsReused:v?[...v.gpu.values()].every((m,i)=>m===window.__modelInstances[i]):null,
    ghostLabels:document.querySelectorAll('.hero-world-label,.elite-world-label,.pod-world-label').length};
  });
  assert.equal(state.phase,'menu');assert.equal(state.time,0);assert.equal(state.stage,1);assert.equal(state.endless,null);assert.equal(state.difficulty,'easy');assert.equal(state.quality,'balanced');assert.ok(state.assetsSame);assert.ok(Object.values(state.stats).every(n=>n===0));assert.deepEqual(state.errors,[]);assert.equal(state.ghostLabels,0);
  if(state.run){assert.equal(state.run.sameIdentity,true);assert.equal(state.run.allies,1);assert.equal(state.run.rank,1);assert.equal(state.run.hp,45);assert.equal(state.run.pods,0);assert.equal(state.run.heroes,0);assert.equal(state.run.upgrades,0);assert.deepEqual(state.run.wallet,{minerals:50,gas:0});assert.equal(state.modelsReused,true);}
  run.restarts.push(state);await p.locator('[data-action=start]').click();await p.waitForTimeout(220);assert.equal(await p.evaluate(()=>window.__SC2_REPORT__().phase),'battle');
 }
 run.newModelRequests=requests.slice(beforeRequests).filter(u=>/\.(gltf|glb|bin|ogg|wav)(?:$|[?])/.test(u));assert.deepEqual(run.newModelRequests,[]);assert.equal(documents,1);
 if(!offline){assert.equal(new Set(run.restarts.map(r=>r.run.listeners)).size,1);assert.deepEqual(run.restarts.at(-1).memory,run.restarts[1].memory);}
 if(offline){const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8')).filter(r=>r.status==='available'),expected=[];for(const r of records)expected.push({id:r.id,sha:createHash('sha256').update(await fs.readFile(r.packedFile)).digest('hex')});
  run.assetHashes=await p.evaluate(async expected=>{for(const a of expected){const url=window.__SC2_EMBEDDED__[a.id];if(!url.startsWith('blob:'))throw Error('Non-local asset');const bytes=await(await fetch(url)).arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==a.sha)throw Error('Changed asset: '+a.id);}return expected.length;},expected);
  run.iconsDecoded=await p.evaluate(async ids=>{await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>im.naturalWidth>0?resolve():reject(Error(id));im.onerror=()=>reject(Error(id));im.src=window.__SC2_EMBEDDED__[id];})));return ids.length;},records.filter(r=>r.kind==='icon').map(r=>r.id));
  assert.equal(run.assetHashes,647);assert.equal(await p.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');assert.deepEqual(requests.filter(u=>/^https?:/.test(u)),[]);
 }
 await p.screenshot({path:out+(offline?'/offline-restarted.png':'/restarted.png')});report.runs.push(run);console.log(JSON.stringify({offline,readySeconds:run.readySeconds,restartMs:run.restarts.map(r=>r.restartMs),assetHashes:run.assetHashes}));await context.close();
}assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
