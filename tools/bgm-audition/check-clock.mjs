/** Null output device keeps the real browser audio graph ticking without a physical speaker. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out='reports/local/bgm-integration-20261029';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-audio-output']});
let result;
try{
 const context=await browser.newContext(),page=await context.newPage();await context.setOffline(true);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(out+'/offline-music.html')).href,{waitUntil:'load'});
 await page.waitForFunction(()=>globalThis.__BGM_AUDIO__);await page.locator('[data-phase="menu"]').click();
 await page.waitForFunction(()=>globalThis.__BGM_AUDIO__.music.report().playing);
 await page.evaluate(()=>{const a=globalThis.__BGM_AUDIO__,probe=a.context.createAnalyser();probe.fftSize=2048;a.masterBus.connect(probe);globalThis.__BGM_CLOCK_PROBE__=probe;});
 const sample=()=>page.evaluate(async()=>{
  const a=globalThis.__BGM_AUDIO__,probe=globalThis.__BGM_CLOCK_PROBE__,data=new Float32Array(probe.fftSize),at=a.context.currentTime;let peak=0;
  for(let n=0;n<12;n++){await new Promise(r=>setTimeout(r,50));probe.getFloatTimeDomainData(data);for(const value of data)peak=Math.max(peak,Math.abs(value));}
  return {clockAdvance:a.context.currentTime-at,peak,music:a.music.report()};
 });
 const menu=await sample();assert.ok(menu.clockAdvance>.3,'Null output audio clock did not advance');assert.ok(menu.peak>0,'Menu media source produced no samples');
 const loops=[];
 for(const [phase,track]of [['menu','menu'],['reward','intermission']]){
  await page.locator('[data-phase="'+phase+'"]').click();
  await page.waitForFunction(track=>{const r=globalThis.__BGM_AUDIO__.music.report();return r.track===track&&r.playing&&!r.loading;},track);
  const at=await page.evaluate(()=>{const a=globalThis.__BGM_AUDIO__;a.music.media.currentTime=a.music.media.duration-.3;return a.music.report();});
  await page.waitForFunction(()=>{const r=globalThis.__BGM_AUDIO__.music.report();return r.time>0&&r.time<2;},null,{timeout:6000});
  const after=await sample();assert.equal(after.music.starts,at.starts);assert.equal(after.music.track,track);assert.ok(after.peak>0);
  loops.push({track,before:at,after});
 }
 const slider=page.locator('input');await slider.focus();await page.keyboard.press('Home');await page.waitForTimeout(120);
 const muted=await sample();assert.equal(muted.peak,0);assert.equal(muted.music.playing,false);
 await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>globalThis.__BGM_AUDIO__.music.report().playing);
 const resumed=await sample();assert.ok(resumed.peak>0);
 const hidden=await page.evaluate(async()=>{
  const a=globalThis.__BGM_AUDIO__;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  const before=a.music.report();await new Promise(r=>setTimeout(r,250));const after=a.music.report();
  await a.context.suspend();const suspendedState=a.context.state;
  delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return {before,after,suspendedState};
 });assert.equal(hidden.after.playing,false);assert.equal(hidden.after.time,hidden.before.time);
 await page.waitForFunction(()=>globalThis.__BGM_AUDIO__.music.report().playing);
 const foreground=await sample();assert.equal(hidden.suspendedState,'suspended');assert.ok(foreground.clockAdvance>.3);assert.ok(foreground.peak>0);
 await page.locator('[data-phase="battle"]').click();await page.waitForFunction(()=>!globalThis.__BGM_AUDIO__.music.report().playing);await page.waitForTimeout(120);
 const battle=await sample();assert.equal(battle.peak,0);assert.deepEqual(errors,[]);
 result={scope:'Real Chromium media/Web Audio graph with --disable-audio-output simulated output stream; not a hardware speaker or iPhone test',menu,loops,muted,resumed,hidden,foreground,battle,errors};
 await fs.writeFile(out+'/clock-verification.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({menu:menu.peak,loops:loops.map(l=>({track:l.track,peak:l.after.peak})),muted:muted.peak,resumed:resumed.peak,battle:battle.peak,clockAdvance:menu.clockAdvance}));
}finally{await browser.close();}
