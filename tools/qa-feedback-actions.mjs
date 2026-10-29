/** Bounded real-DOM checks with an injected equipment fixture, not a natural campaign or phone run. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const out='reports/local/feedback-actions-20261029',results=[];
await fs.mkdir(out,{recursive:true});
const server=spawn(process.execPath,['tools/serve-feedback-actions-diagnostic.mjs'],{windowsHide:true,stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile] of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  const act=id=>page.locator('[data-act="'+id+'"]:visible').first(),action=id=>page.locator('[data-action="'+id+'"]:visible').first(),press=target=>mobile?target.tap():target.click();
  try{
   await page.goto('http://127.0.0.1:18891',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>globalThis.__FEEDBACK_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:60000});
   await page.evaluate(()=>{
    const audio=globalThis.__FEEDBACK_APP__.hud.audio,original=audio.interfaceCue.bind(audio);globalThis.__QA_AUDIO__={calls:0,peak:0};
    audio.interfaceCue=()=>{globalThis.__QA_AUDIO__.calls++;original();if(audio.context&&audio.masterBus&&!globalThis.__QA_AUDIO_PROBE__){const probe=audio.context.createScriptProcessor(1024,1,1);audio.masterBus.connect(probe);probe.connect(audio.context.destination);probe.onaudioprocess=event=>{for(const value of event.inputBuffer.getChannelData(0))globalThis.__QA_AUDIO__.peak=Math.max(globalThis.__QA_AUDIO__.peak,Math.abs(value));};globalThis.__QA_AUDIO_PROBE__=probe;}};
   });
   await press(action('menu-new'));
   await page.waitForFunction(()=>globalThis.__FEEDBACK_APP__.hud.audio.context?.state==='running');
   const audio=await page.evaluate(async()=>{const a=globalThis.__FEEDBACK_APP__.hud.audio,render=new OfflineAudioContext(1,9600,48000),tone=new a.constructor();render.resume=()=>Promise.resolve();tone.context=render;tone.interfaceCue();const pcm=await render.startRendering();let offlinePeak=0;for(const value of pcm.getChannelData(0))offlinePeak=Math.max(offlinePeak,Math.abs(value));return {volume:a.interfaceVolume,state:a.context.state,phase:globalThis.__FEEDBACK_APP__.world.phase,offlinePeak,liveClockSeconds:a.context.currentTime,...globalThis.__QA_AUDIO__};});
   assert.equal(audio.volume,.25);assert.equal(audio.state,'running');assert.equal(audio.phase,'menu');assert.equal(audio.calls,1);assert.ok(audio.offlinePeak>0);
   const fixture=await page.evaluate(()=>globalThis.__FEEDBACK_FIXTURE__());
   await action('extract').waitFor();await page.screenshot({path:out+'/'+name+'-intermission.png',animations:'disabled'});
   await action('starship-backpack').click();await act('auto-equip').waitFor();
   await act('select-all').click();assert.match(await page.locator('.inventory-summary:visible').innerText(),/41 件.*已选 38 件/);
   await act('next').click();assert.ok(await page.locator('[data-select]:checked').count()>0);
   await act('clear-selection').click();assert.equal(await page.locator('[data-select]:checked').count(),0);await act('select-all').click();
   await act('toggle-filters').click();await page.locator('[data-multi-filter="availability"][value="equipable"]').check();
   assert.equal(await page.locator('.equipment-availability[data-equipable="false"]:visible').count(),0);assert.match(await page.locator('.inventory-summary:visible').innerText(),/已选 0 件/);
   await act('clear-filters').click();await act('select-all').click();await page.locator('[data-filter="query"]:visible').fill('聚变');assert.match(await page.locator('.inventory-summary:visible').innerText(),/已选 0 件/);await act('toggle-filters').click();await act('clear-filters').click();
   const before=await page.evaluate(()=>{const w=globalThis.__FEEDBACK_APP__.world;return {revision:w.starship.account.revision,rng:w.snapshotData().rngState,equipped:{...w.starship.account.equipped.terran}};});
   await press(act('auto-equip'));
   const after=await page.evaluate(()=>{const w=globalThis.__FEEDBACK_APP__.world;return {revision:w.starship.account.revision,rng:w.snapshotData().rngState,equipped:{...w.starship.account.equipped.terran}};});
   assert.equal(after.revision,before.revision+1);assert.equal(after.rng,before.rng);assert.equal(after.equipped.defense3,fixture.set);assert.equal(after.equipped.control,fixture.module);assert.equal(after.equipped.offense1,fixture.old);assert.ok(await act('auto-equip').isDisabled());
   await act('select-all').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+name+'-equipment.png',animations:'disabled'});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
   await act('select-all').click();await act('dismantle-selected').click();
   const confirmation=await page.locator('.confirm-body:visible').innerText();assert.match(confirmation,/分解.*件.*粉尘/);
   const preview=await page.evaluate(()=>({count:Object.keys(globalThis.__FEEDBACK_APP__.world.starship.account.items).length,dust:globalThis.__FEEDBACK_APP__.world.starship.account.dust}));
   await act('confirm').click();
   const dismantled=await page.evaluate(f=>{const a=globalThis.__FEEDBACK_APP__.world.starship.account;return {count:Object.keys(a.items).length,dust:a.dust,protected:f.protected.every(id=>!!a.items[id]),tainted:!!a.items[f.tainted]};},fixture);
   assert.ok(dismantled.count<preview.count);assert.ok(dismantled.dust>preview.dust);assert.ok(dismantled.protected&&dismantled.tainted);
   await page.locator('[data-select="'+fixture.tainted+'"]').check();await act('discard-selected').click();assert.match(await page.locator('.confirm-body:visible').innerText(),/销毁.*1 件/);await act('confirm').click();assert.equal(await page.evaluate(id=>!!globalThis.__FEEDBACK_APP__.world.starship.account.items[id],fixture.tainted),false);
   await action('ui-back').click();await press(action('extract'));await page.waitForFunction(()=>globalThis.__FEEDBACK_APP__.world.phase==='finished');
   const ended=await page.evaluate(async()=>{const a=globalThis.__FEEDBACK_APP__;return {saved:await a.session.saveBeforeAdvance(),ended:a.world.starship.account.run.ended,repeat:a.world.extractEquipment(),equipped:{...a.world.starship.account.equipped.terran}};});assert.equal(ended.ended,true);assert.equal(ended.repeat,false);assert.ok(ended.saved);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__FEEDBACK_APP__&&!document.getElementById('scs-opening-visual'));
   const restored=await page.evaluate(()=>({ended:globalThis.__FEEDBACK_APP__.world.starship.account.run?.ended,equipped:globalThis.__FEEDBACK_APP__.world.starship.account.equipped.terran}));assert.equal(restored.ended,true);assert.deepEqual(restored.equipped,ended.equipped);
   assert.deepEqual(errors,[]);results.push({name,width,height,simulatedMobileEnvironment:mobile,input:mobile?'Touch taps on menu, auto-equip and extraction; pointer list/checkbox actions':'Pointer clicks and checkbox checks',audio,crossPageSelection:38,filter:true,clearsSelectionOnFilterAndSearch:true,oneRevisionExchange:true,protectedGear:true,confirmation,dismantled,ended,restored,overflow,errors});console.log(name+' passed');
  }catch(error){await page.screenshot({path:out+'/'+name+'-failure.png'});console.log('Visible state', (await page.locator('body').innerText()).slice(-2200));throw error;}finally{await context.close();}
 }
}finally{await browser?.close();server.kill();await fs.writeFile(out+'/ui-results.json',JSON.stringify({scope:'Injected equipment fixture with production UI; Chrome viewport/touch emulation, not physical iPhone or a natural campaign',results},null,2));}
