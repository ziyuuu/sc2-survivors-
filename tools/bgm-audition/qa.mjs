/** Production controls plus bounded phase/visibility fixtures; no physical-device claim. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const out='reports/local/bgm-integration-20261029',results=[];
const deliveryOnly=process.argv.includes('--delivery-only');
if(deliveryOnly)results.push(...JSON.parse(await fs.readFile(out+'/browser-results.json','utf8')).results.filter(r=>['desktop','landscape','portrait'].includes(r.name)));
const server=spawn(process.execPath,['tools/bgm-audition/serve-checks.mjs'],{windowsHide:true,stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile]of deliveryOnly?[]:[['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),page=await context.newPage();
  const errors=[],failures=[],musicRequests=[];
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/')&&!r.url().endsWith('/favicon.ico'))failures.push({url:r.url(),status:r.status()});});
  page.on('request',r=>{if(/\.mp3(?:\?|$)/.test(r.url()))musicRequests.push(r.url());});
  const action=id=>page.locator('[data-action="'+id+'"]:visible').first(),press=locator=>mobile?locator.tap():locator.click();
  const report=()=>page.evaluate(()=>globalThis.__BGM_APP__.hud.audio.report().music);
  const playing=track=>page.waitForFunction(track=>{const a=globalThis.__BGM_APP__?.hud.audio.report().music;return a?.track===track&&a.playing&&!a.loading;},track);
  try{
   await page.goto('http://127.0.0.1:18892',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>globalThis.__BGM_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:90000});
   const before=await report();assert.equal(before.unlocked,false);assert.deepEqual(musicRequests,[]);
   await press(action('settings'));await playing('menu');
   const first=await report();assert.equal(first.volume,.15);
   await page.evaluate(()=>{const a=globalThis.__BGM_APP__.hud.audio,probe=a.context.createAnalyser();probe.fftSize=2048;a.musicBus.connect(probe);globalThis.__BGM_PROBE__=probe;});
   const slider=page.locator('[data-audio="music"]');await slider.scrollIntoViewIfNeeded();
   const bounds=await slider.boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
   await page.screenshot({path:out+'/'+name+'-settings.png',animations:'disabled'});
   await slider.focus();await page.keyboard.press('Home');
   assert.equal((await report()).playing,false);assert.equal((await report()).volume,0);
   await page.keyboard.press('ArrowRight');await playing('menu');assert.equal((await report()).volume,.01);
   const master=page.locator('[data-audio="master"]');await master.focus();await page.keyboard.press('Home');assert.equal((await report()).playing,false);
   await page.keyboard.press('End');await playing('menu');assert.equal((await report()).volume,.01);
   await press(action('settings-back'));const starts=(await report()).starts;
   await press(action('menu-new'));await page.waitForTimeout(400);assert.equal((await report()).starts,starts);
   await page.evaluate(()=>globalThis.__BGM_INTERMISSION__());await playing('intermission');
   const reward=await report();await press(action('starship-backpack'));await page.waitForTimeout(400);
   assert.equal((await report()).starts,reward.starts);await press(action('ui-back'));
   const visibility=await page.evaluate(async()=>{
    const a=globalThis.__BGM_APP__.hud.audio;const time=a.music.report().time;
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    const hidden=a.music.report();delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    return {time,hidden};
   });assert.equal(visibility.hidden.playing,false);await playing('intermission');
   await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide'));});assert.equal((await report()).playing,false);
   await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pageshow'));});await playing('intermission');
   await page.evaluate(()=>{const w=globalThis.__BGM_APP__.world;w.phase='battle';w.paused=true;w.changed();});
   await page.waitForFunction(()=>!globalThis.__BGM_APP__.hud.audio.music.report().playing);
   await page.mouse.click(20,20);assert.equal((await report()).playing,false);
   await page.evaluate(()=>{const w=globalThis.__BGM_APP__.world;w.phase='menu';w.changed();});await playing('menu');
   const realtime=await page.evaluate(async()=>{
    const a=globalThis.__BGM_APP__.hud.audio,probe=globalThis.__BGM_PROBE__,data=new Float32Array(probe.fftSize);
    const before=a.context.currentTime;let peak=0;
    for(let n=0;n<12;n++){await new Promise(r=>setTimeout(r,50));probe.getFloatTimeDomainData(data);for(const value of data)peak=Math.max(peak,Math.abs(value));}
    return {clockAdvance:a.context.currentTime-before,peak,time:a.music.report().time,sourceCount:a.music.source?1:0,musicDecodedInCombat:[...a.buffers.keys()].some(id=>id.startsWith('music.'))};
   });assert.equal(realtime.musicDecodedInCombat,false);assert.equal(realtime.sourceCount,1);
   const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('sc2.audio-mix')));assert.equal(prior.music,.01);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__BGM_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:90000});
   assert.equal((await report()).volume,.01);assert.equal((await report()).unlocked,false);
   await press(action('settings'));await playing('menu');assert.equal(await page.locator('[data-audio="music"]').inputValue(),'1');
   const final=await report();assert.deepEqual(final.errors,[]);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   results.push({name,width,height,simulatedTouch:mobile,before,first,reward,visibility,realtime,persisted:prior,final,musicRequests:musicRequests.length,errors,failures});
   console.log(name+' passed '+JSON.stringify(realtime));
  }catch(error){await page.screenshot({path:out+'/'+name+'-failure.png'});console.log(name+' state',await report().catch(()=>null));console.log('Browser errors',errors,failures);throw error;}finally{await context.close();}
 }
 // The unchanged production entry must also resolve the registered MP3 via its real Web manifest.
 {
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:18892/production/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>globalThis.__SC2_REPORT__&&!document.getElementById('scs-opening-visual'),null,{timeout:90000});
   await page.locator('[data-action="settings"]:visible').first().click();
   await page.waitForFunction(()=>globalThis.__SC2_REPORT__().audio.music.playing,null,{timeout:30000});
   const r=await page.evaluate(()=>globalThis.__SC2_REPORT__().audio.music);assert.deepEqual(r.errors,[]);assert.deepEqual(errors,[]);
   results.push({name:'production-web',report:r,errors});console.log('Production Web passed');
  }finally{await context.close();}
 }
 // A small file:// pack tests both songs through the production offline loader and mixer, with networking disabled.
 {
  const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];await context.setOffline(true);
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(pathToFileURL(path.resolve(out+'/offline-music.html')).href,{waitUntil:'load'});
   await page.waitForFunction(()=>globalThis.__BGM_AUDIO__);await page.locator('[data-phase="menu"]').click();
   await page.waitForFunction(()=>globalThis.__BGM_AUDIO__.music.report().playing);
   const menu=await page.evaluate(()=>globalThis.__BGM_REPORT__());
   await page.locator('[data-phase="reward"]').click();await page.waitForFunction(()=>{const r=globalThis.__BGM_AUDIO__.music.report();return r.track==='intermission'&&r.playing&&!r.loading;});
   const intermission=await page.evaluate(()=>globalThis.__BGM_REPORT__());
   const signal=await page.evaluate(async()=>{
    const a=globalThis.__BGM_AUDIO__,source=a.music.media.src,context=new OfflineAudioContext(2,88200,44100);
    const buffer=await context.decodeAudioData(await(await fetch(source)).arrayBuffer()),voice=context.createBufferSource(),gain=context.createGain();
    voice.buffer=buffer;voice.loop=true;voice.loopEnd=buffer.duration;gain.gain.value=a.masterVolume*a.musicVolume;voice.connect(gain).connect(context.destination);voice.start(0,buffer.duration-.5);
    const output=await context.startRendering(),pcm=output.getChannelData(0);let peak=0;for(const value of pcm)peak=Math.max(peak,Math.abs(value));
    return {decodedSeconds:buffer.duration,renderedSeconds:output.duration,peak,seamStep:Math.abs(pcm[22050]-pcm[22049]),scope:'Offline browser decode and two-second render across the source loop seam; not a hardware speaker test'};
   });assert.ok(signal.peak>0);assert.ok(signal.seamStep<.01);
   await page.locator('[data-phase="battle"]').click();await page.waitForFunction(()=>!globalThis.__BGM_AUDIO__.music.report().playing);
   assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);assert.deepEqual(intermission.audio.music.errors,[]);
   results.push({name:'offline-music-only',menu,intermission,signal,httpRequests:requests,errors});console.log('Offline pack passed '+JSON.stringify(signal));
  }finally{await context.close();}
 }
}finally{
 await browser?.close();server.kill();await fs.writeFile(out+'/browser-results.json',JSON.stringify({scope:'Chrome simulated viewports; phase and visibility fixtures; actual production Web menu; focused two-track file:// pack. No physical iPhone claim.',results},null,2));
}
