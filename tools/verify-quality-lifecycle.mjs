import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/quality-20261028',origin='http://127.0.0.1:18883';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
const c=await b.newContext({viewport:{width:1440,height:900}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(180000);
const tick=setInterval(async()=>{try{console.log('lifecycle',await p.evaluate(()=>({phase:globalThis.__SC2_REPORT__?.().phase,stage:globalThis.__SC2_REPORT__?.().stage,readiness:globalThis.__SC2_REPORT__?.().readiness,graphics:globalThis.__SC2_REPORT__?.().graphics})));}catch{}},20000),result={};
const click=a=>p.locator(`[data-action="${a}"]:visible`).first().click();
try{
 await p.addInitScript(()=>{globalThis.__name=v=>v;if(!localStorage.getItem('sc2.graphics.v1'))localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'low',tier:'medium',texture:'low'}));});
 await p.goto(origin+'/quality-lab.html');await p.waitForFunction(()=>globalThis.__QUALITY_APP__&&!document.getElementById('scs-opening-visual'));
 for(const a of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(a);
 await p.waitForFunction(()=>globalThis.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:420000});await click('flow-continue');
 await p.waitForFunction(()=>globalThis.__SC2_REPORT__().time>3);await click('pause');
 result.swap=await p.evaluate(async()=>{const a=__QUALITY_APP__,store=a.httpStore(),before=JSON.stringify(a.world.captureRun()),old=store.activeTier,original=store.urlForTier.bind(store);a.view.entryPreparation=true;a.view.setGraphicsPreset('high');store.urlForTier=async()=>{throw Error('injected unavailable variant');};let failed=false;try{await a.applyPendingTextureTier();}catch{failed=true;}store.urlForTier=original;if(!failed||store.activeTier!==old)throw Error('failed swap corrupted active tier');
  await a.applyPendingTextureTier();if(store.activeTier!=='high')throw Error('high swap failed');const high=__SC2_REPORT__();a.view.setGraphicsPreset('low');await a.applyPendingTextureTier();const low=__SC2_REPORT__();if(store.activeTier!=='low'||JSON.stringify(a.world.captureRun())!==before)throw Error('swap changed game state');a.view.entryPreparation=false;return {failedSwapPreserved:true,worldUnchanged:true,high:high.graphics,low:low.graphics,highResolution:high.resolution,lowResolution:low.resolution};});
 await p.screenshot({path:root+'/lifecycle-low.png'});
 result.stages=[];
 for(const stage of [2,3,12]){
  result.stages.push(await p.evaluate(async stage=>{const a=__QUALITY_APP__,w=a.world;w.paused=true;
   // Bounded directed scenario; uses real stage transition and presentation gates.
   if(stage===12)w.stage=11;
   w.endStage();if(w.phase!=='reward')throw Error('stage end blocked');if(w.rewardRound==='building')w.skipReward();
   a.hud.pendingStageAdvance=true;a.hud.onPrepareReinforcement();
   const until=performance.now()+240000;while((a.readiness.state.kind||w.stage!==stage)&&performance.now()<until){if(a.readiness.state.phase==='error')throw Error(a.readiness.state.error);await new Promise(r=>setTimeout(r,50));}
   if(w.stage!==stage||a.readiness.state.kind)throw Error('stage transition timeout');w.paused=true;
   if(stage===12){for(let i=0;i<60;i++)w.addUnit(i%3?'zergling':'roach','zerg',w.anchor.x+8+i%10,w.anchor.z+8+Math.floor(i/10),1);await a.readiness.prepare('reinforcement');while(a.readiness.state.kind)await new Promise(r=>setTimeout(r,25));}
   await a.view.waitForPendingAssets();w.paused=false;for(let i=0;i<180;i++)w.step();w.paused=true;a.view.render(.016,1);a.hud.update();const r=__SC2_REPORT__();return {stage:w.stage,time:w.time,phase:w.phase,entities:r.entities,errors:r.errors,pcmBytes:r.audio.pcmBytes,graphics:r.graphics};},stage));
 }
 await p.screenshot({path:root+'/lifecycle-late.png'});
 await p.evaluate(()=>{const a=__QUALITY_APP__;a.hud.settingsOpen=true;a.hud.settingsTab='graphics';a.hud.update();});await p.locator('[data-action="settings-tab"][data-tab="graphics"]').click();
 await p.locator('[data-setting="quality"]').selectOption('native');assert.equal(await p.locator('[data-setting="graphics-preset"]').inputValue(),'custom');
 result.layouts=[];for(const [width,height]of [[1440,900],[844,390],[390,844]]){await p.setViewportSize({width,height});await p.screenshot({path:root+`/settings-${width}x${height}.png`});result.layouts.push(await p.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,selects:[...document.querySelectorAll('.settings-modal select')].map(e=>({label:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width}))})));}
 const before=await p.evaluate(()=>__SC2_REPORT__().embeddedAssets);await p.reload();await p.waitForFunction(()=>globalThis.__QUALITY_APP__&&!document.getElementById('scs-opening-visual'));
 result.hot=await p.evaluate(()=>({graphics:__SC2_REPORT__().graphics,resolution:__SC2_REPORT__().resolution,assets:__SC2_REPORT__().embeddedAssets}));assert.equal(result.hot.graphics.preset,'custom');assert.equal(result.hot.resolution.quality,'native');
 result.beforeReload=before;result.errors=errors;assert.deepEqual(errors,[]);assert.ok(result.stages.every(s=>s.errors.length===0));assert.ok(result.layouts.every(l=>l.documentWidth<=l.width));
 await fs.writeFile(root+'/lifecycle.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await fs.writeFile(root+'/lifecycle-failure.json',JSON.stringify({error:String(e),result,report:await p.evaluate(()=>globalThis.__SC2_REPORT__?.()).catch(()=>null),errors},null,2));throw e;}finally{clearInterval(tick);await c.close();await b.close();}
