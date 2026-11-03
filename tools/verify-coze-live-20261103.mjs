/** Read-only public Coze delivery audit. No deployment or backend mutation.
 * node tools/verify-coze-live-20261103.mjs --http | --browser [--race=terran] [--touch]
 * --resume-profile=profile-<race>-<timestamp> continues only this tool's prior test profile.
 * Browser uses a fresh local profile, actual UI and normal game time.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const origin='https://sc-survivors.coze.site',out=path.resolve('reports/local/coze-live-check-20261103'),pub=path.resolve('sites/size-optimized-site/public');
const sha=b=>createHash('sha256').update(b).digest('hex'),expected=JSON.parse(await fs.readFile(pub+'/web-release.json','utf8'));
await fs.mkdir(out,{recursive:true});
const get=async name=>{const start=Date.now(),r=await fetch(origin+'/'+name,{cache:'no-store',signal:AbortSignal.timeout(45000)}),b=Buffer.from(await r.arrayBuffer());return {status:r.status,bytes:b,elapsedMs:Date.now()-start,headers:Object.fromEntries(['content-type','cache-control','content-length','content-encoding','permissions-policy'].map(k=>[k,r.headers.get(k)]))};};
if(process.argv.includes('--http')){
 const report={date:'2026-11-03',origin,expectedAppBuildId:expected.appBuildId,expectedResourceRelease:expected.release,files:[],failures:[],complete:false};
 const descriptor=await get('web-release.json'),live=JSON.parse(descriptor.bytes.toString());report.liveDescriptor=live;
 assert.equal(live.appBuildId,expected.appBuildId);assert.equal(live.release,expected.release);assert.equal(live.runSchema,26);
 const html=await get('');assert.equal(html.status,200);assert(html.bytes.includes(expected.appBuildId));
 const text=html.bytes.toString(),launcher=[...text.matchAll(/<script[^>]+src=["']([^"']+)/g)].map(m=>m[1]).find(s=>s.startsWith('./assets/'))?.replace(/^\.\//,'');assert(launcher);
 const launcherLocal=await fs.readFile(pub+'/'+launcher,'utf8'),entry=launcherLocal.match(/\.\/sc2-entry\.[a-f0-9]+\.js\.gz/)?.[0].replace('./','assets/');assert(entry);
 const index=launcherLocal.match(/__SC2_PACK_INDEX_FILE__="([^"]+)"/)?.[1];assert(index);
 const manifest=JSON.parse(await fs.readFile(pub+'/'+live.manifest,'utf8'));
 const identities=new Map([...Object.values(manifest.assets),...Object.values(manifest.gpuTextures)].map(a=>[a.url,a.sha256]));
 const css=[...text.matchAll(/(?:src|href)=["'](\.\/assets\/[^"']+\.css)/g)].map(m=>m[1].replace('./',''));
 const names=[...new Set(['web-release.json','runtime-config.json',launcher,entry,...css,'sites-sw.js','sites-pack-index.js',index,live.manifest,'basis/basis_transcoder.js','basis/basis_transcoder.wasm',...Object.values(manifest.assets).filter(a=>a.mime==='audio/mpeg').map(a=>a.url),...Object.values(manifest.gpuTextures).map(a=>a.url)])];
 let cursor=0;
 const check=async()=>{while(cursor<names.length){const name=names[cursor++];try{const r=await get(name),expectedSha256=identities.get(name)??sha(await fs.readFile(pub+'/'+name)),row={path:name,status:r.status,bytes:r.bytes.length,sha256:sha(r.bytes),expectedSha256,cacheControl:r.headers['cache-control'],elapsedMs:r.elapsedMs};row.matches=row.status===200&&row.sha256===row.expectedSha256;report.files.push(row);if(!row.matches)report.failures.push(row);console.log(JSON.stringify({http:name,status:row.status,matches:row.matches}));}catch(error){report.failures.push({path:name,error:String(error)});}}};
 await Promise.all([check(),check(),check()]);
 report.html={status:html.status,appBuildMetaMatches:true,launcher,entry,platformInjectionAllowed:true,cacheControl:html.headers['cache-control']};
 report.complete=report.failures.length===0;await fs.writeFile(out+'/http.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({httpComplete:report.complete,files:report.files.length,failures:report.failures,build:live.appBuildId}));if(!report.complete)process.exitCode=1;
}else if(process.argv.includes('--browser')){
 const race=process.argv.find(a=>a.startsWith('--race='))?.slice(7)??'terran',touch=process.argv.includes('--touch'),resumeProfile=process.argv.find(a=>a.startsWith('--resume-profile='))?.slice(17);assert(['terran','zerg','protoss'].includes(race));if(resumeProfile)assert(new RegExp('^profile-'+race+'-[0-9]+$').test(resumeProfile));
 const report={date:'2026-11-03',origin,race,touchEmulation:touch,freshProfile:!resumeProfile,scope:'Real Windows Chrome, isolated local browser data, actual UI, normal game clock, no consent or production data mutation; not physical mobile/Safari.',checks:[],errors:[],console:[],httpFailures:[],requestFailures:[],apiWrites:[],complete:false};
 let context,page,tick;const start=Date.now();
 const brief=r=>({phase:r.phase,stage:r.stage,race:r.expedition?.race,time:r.time,wallet:r.wallet,save:r.save,readiness:r.readiness,assetsPending:r.assetsPending,missingEffects:r.sourceCombat?.source?.missing,errors:r.errors,graphics:r.graphics,audio:r.audio,stats:r.stats,controls:r.controls});
 try{
  context=await chromium.launchPersistentContext(out+'/'+(resumeProfile??'profile-'+race+'-'+Date.now()),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:touch?{width:390,height:844}:{width:1280,height:720},deviceScaleFactor:1,...(touch?{isMobile:true,hasTouch:true}:{}),args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']});
  page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({type:m.type(),text:m.text()});});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.httpFailures.push({url:r.url(),status:r.status()});});
  page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),method:r.method(),failure:r.failure()?.errorText}));
  page.on('request',r=>{if(r.url().startsWith(origin+'/api/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))report.apiWrites.push({url:r.url(),method:r.method()});});
  const read=()=>page.evaluate(()=>globalThis.__SC2_REPORT__());
  const click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
  const menu=async()=>{await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual')||/游戏加载失败|请更新 Chrome/.test(document.querySelector('.pack-loading')?.textContent??''),null,{timeout:240000});assert(await page.evaluate(()=>!!globalThis.__SC2_REPORT__),'Startup recovery screen shown');};
  const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});const r=await read();assert.equal(r.readiness.phase,'ready',JSON.stringify(r.readiness));await click('flow-continue');};
  tick=setInterval(async()=>console.log(JSON.stringify({race,elapsedMs:Date.now()-start,state:await page.evaluate(()=>{const r=globalThis.__SC2_REPORT__?.();return r?{phase:r.phase,stage:r.stage,time:r.time,readiness:r.readiness,save:r.save}:document.querySelector('.pack-loading')?.textContent;}).catch(()=>null)})),25000);
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await menu();
  assert.equal(await page.locator('meta[name="sc2-app-build"]').getAttribute('content'),expected.appBuildId);
  let r;report.checks.push({name:resumeProfile?'reopened-test-profile':'fresh-menu',elapsedMs:Date.now()-start,state:brief(await read())});
  if(race==='terran')await page.screenshot({path:out+'/menu.png'});
  if(race==='zerg'){
   await click('settings');await page.locator('[data-player-service="feedback"]:visible').click();
   report.playerServices={feedbackWarning:await page.locator('#player-services-dialog .service-unavailable').textContent(),feedbackDisabled:await page.locator('#player-feedback button[type="submit"]').isDisabled()};
   await page.screenshot({path:out+'/feedback-unavailable.png'});await page.locator('[data-service-action="privacy"]:visible').click();
   report.playerServices.statisticsDisabled=await page.locator('[data-service-action="allow"]').isDisabled();
   await page.locator('[data-service-action="close"]:visible').first().click();await click('settings-back');
  }
  if(resumeProfile){
   const previous=JSON.parse(await fs.readFile(out+'/browser-'+race+'.json','utf8'));report.reusedChecks=previous.checks;report.previousAttemptFailure=previous.failure;report.previousNormalStageEnd=previous.lastState;
   assert.equal((await read()).save.canResume,true);await click('save-continue');await ready();await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='reward');r=await read();assert.equal(r.stage,1);assert.equal(r.time,60);assert.equal(r.expedition.race,race);
  }else{
  await click('menu-new');await page.locator('[data-action="menu-race"][data-race="'+race+'"]:visible').click();await click('menu-race-next');
  await page.locator('[data-action="menu-difficulty"][data-difficulty="easy"]:visible').click();await click('menu-difficulty-next');await click('menu-start');await ready();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().time>=3,null,{timeout:120000});
  r=await read();assert.equal(r.expedition.race,race);assert.equal(r.assetsPending,0);assert.equal(r.sourceCombat.source.missing,0);assert.deepEqual(r.errors,[]);
  const initialSavedAt=r.save.savedAt;report.checks.push({name:'first-battle',state:brief(r)});await page.screenshot({path:out+'/'+race+'-battle.png'});
  if(touch){
   const joystick=page.locator('#joystick');assert(await joystick.isVisible());const box=await joystick.boundingBox();assert(box);const cdp=await context.newCDPSession(page),point={x:box.x+box.width/2,y:box.y+box.height/2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+box.width*.25,y:point.y}]});await page.waitForTimeout(600);
   const offset=await joystick.evaluate(el=>el.style.getPropertyValue('--stick-x'));assert(parseFloat(offset)>0);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await joystick.evaluate(el=>el.style.getPropertyValue('--stick-x')),'0px');
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(750);await page.screenshot({path:out+'/'+race+'-touch-landscape.png'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(750);report.checks.push({name:'emulated-touch-drag-release-and-rotation',offset});
  }else{assert.equal(await page.locator('#joystick').isVisible(),false);await page.keyboard.down('d');await page.waitForTimeout(600);await page.keyboard.up('d');}
  await click('pause');const paused=(await read()).time;await page.waitForTimeout(750);assert.equal((await read()).time,paused);await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.waitForFunction(at=>globalThis.__SC2_REPORT__().time>at+.4,paused);report.checks.push({name:'pause-resume',pausedTime:paused});
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){r=await read();if(r.phase!=='battle')break;await page.waitForTimeout(1000);}
  r=await read();assert.equal(r.phase,'reward','Expected natural first-stage completion: '+JSON.stringify(brief(r)));
  await page.waitForFunction(at=>{const s=globalThis.__SC2_REPORT__().save;return !s.busy&&s.savedAt>at&&!s.message.includes('失败');},initialSavedAt);
  }
  r=await read();assert.deepEqual(r.errors,[]);report.checks.push({name:resumeProfile?'restored-natural-first-stage':'natural-first-stage',state:brief(r)});
  const rewardState={stage:r.stage,wallet:r.wallet,race:r.expedition.race};await page.screenshot({path:out+'/'+race+'-intermission.png'});
  await page.reload({waitUntil:'domcontentloaded'});await menu();assert.equal((await read()).save.canResume,true);await click('save-continue');await ready();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='reward');r=await read();assert.deepEqual({stage:r.stage,wallet:r.wallet,race:r.expedition.race},rewardState);
  report.checks.push({name:'reload-checkpoint',walletPreserved:true,state:brief(r)});
  for(let i=0;i<2;i++){await click('skip');await page.waitForTimeout(250);r=await read();if(r.phase!=='reward'||r.readiness.kind)break;}
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().stage===2||globalThis.__SC2_REPORT__().readiness.phase==='error',null,{timeout:240000});
  r=await read();assert.equal(r.phase,'battle',JSON.stringify(r.readiness));
  const continueButton=page.getByRole('button',{name:'继续',exact:true});if(await continueButton.count())await continueButton.click();
  const before=r.time;await page.waitForFunction(at=>globalThis.__SC2_REPORT__().time>at+2,before,{timeout:90000});r=await read();assert.deepEqual(r.errors,[]);
  report.checks.push({name:'real-ui-second-stage',state:brief(r)});
  if(race==='terran'){
   await click('pause');await page.setViewportSize({width:844,height:390});await page.screenshot({path:out+'/landscape.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/portrait.png'});await page.setViewportSize({width:1280,height:720});
   await click('settings');await page.locator('[data-action="settings-tab"][data-tab="downloads"]:visible').click();await click('download-clear');await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.startsWith('资源缓存已清理'),null,{timeout:150000});await click('settings-back');
   await page.reload({waitUntil:'domcontentloaded'});await menu();assert.equal((await read()).save.canResume,true);report.checks.push({name:'existing-clear-cache',savedCheckpointRetained:true});
  }
  report.optionalServiceFailures=report.httpFailures.filter(r=>r.url===origin+'/api/config');assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpFailures.filter(r=>r.url!==origin+'/api/config'),[]);assert.deepEqual(report.apiWrites,[]);report.complete=true;
 }catch(error){report.failure=String(error.stack??error);process.exitCode=1;report.lastState=await page?.evaluate(()=>{const r=globalThis.__SC2_REPORT__?.();return r?{phase:r.phase,time:r.time,stage:r.stage,readiness:r.readiness,save:r.save}:null;}).catch(()=>null);await page?.screenshot({path:out+'/'+race+'-failure.png'}).catch(()=>{});}
 finally{clearInterval(tick);await context?.close();report.elapsedMs=Date.now()-start;await fs.writeFile(out+'/browser-'+race+'.json',JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({race,complete:report.complete,checks:report.checks.map(c=>c.name),errors:report.errors,httpFailures:report.httpFailures,console:report.console,apiWrites:report.apiWrites,failure:report.failure,lastState:report.lastState}));
}else throw Error('Choose --http or --browser');
