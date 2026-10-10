import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const root='reports/local/lighting-batch3-20261010',out=root+'/gallery-review';await fs.mkdir(out,{recursive:true});
const report={passed:false,errors:[],checks:[],videos:[],frames:[],screens:[]};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
const open=name=>page.goto('http://127.0.0.1:'+server.address().port+'/'+name+'.html');
async function loaded(){await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png',fullPage:true});report.screens.push(name);}
try{
 await open('comparison-gallery');assert.equal(await page.locator('#identity option').count(),138);for(let i=0;i<138;i++){await page.locator('#identity').selectOption(String(i));await loaded();}report.checks.push('138 identity pairs load');
 for(const v of ['industrial','mar-sara','char','ice','frontier','landscape','portrait','small']){await page.locator('#view').selectOption(v);await loaded();}await shot('identities-desktop');report.checks.push('Five maps and three mobile views load');
 await page.setViewportSize({width:390,height:844});await loaded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('identities-mobile');await page.setViewportSize({width:1440,height:1000});
 await open('stage-gallery');for(let i=1;i<=4;i++){await page.locator('#stage').selectOption(String(i));await loaded();}await shot('stages');report.checks.push('Four incremental stages load');
 await open('sequence-gallery');for(const g of ['marine','baneling','immortal','zealot'])for(const p of ['idle','move','attack','hit','death']){await page.locator('#group').selectOption(g);await page.locator('#phase').selectOption(p);await loaded();}await page.locator('#play').click();await page.waitForFunction(()=>Number(document.querySelector('#frame').value)>0);await page.locator('#play').click();await loaded();await shot('sequence');report.checks.push('Twenty sequences and playback controls work');
 await open('realtime-gallery');assert.equal(await page.locator('video').count(),3);
 for(let i=0;i<3;i++){const info=await page.locator('video').nth(i).evaluate(async v=>{v.muted=true;v.playbackRate=4;await v.play();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video playback timeout')),30000);v.addEventListener('ended',()=>{clearTimeout(timer);resolve();},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Video decode error'));},{once:true});});return {src:v.getAttribute('src'),width:v.videoWidth,height:v.videoHeight,duration:v.duration,ended:v.ended,decoded:v.getVideoPlaybackQuality().totalVideoFrames};});assert.ok(info.ended&&info.width>0&&info.height>0&&info.decoded>1);report.videos.push(info);
  // Replay the original recorded WebM and save unretouched browser video frames.
  // Actual media timestamps accompany each sample; this is visual inspection, not timing evidence.
  const video=page.locator('video').nth(i);await video.evaluate(async v=>{v.controls=false;v.playbackRate=2;await v.play();});
  for(const [index,seconds]of [0,4,8,12,16,19].entries()){await page.waitForFunction(({i,seconds})=>{const v=document.querySelectorAll('video')[i];return v.currentTime>=seconds||v.ended;},{i,seconds});const state=await video.evaluate(v=>({time:v.currentTime,ended:v.ended,decoded:v.getVideoPlaybackQuality().totalVideoFrames})),file='video-'+i+'-frame-'+index+'.png';await video.screenshot({path:out+'/'+file});report.frames.push({source:info.src,requestedSeconds:seconds,...state,file:'gallery-review/'+file});}await video.evaluate(v=>v.pause());
 }
 await shot('recordings');assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(root+'/gallery-review.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(report));}
