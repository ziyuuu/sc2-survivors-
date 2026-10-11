import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {labServer} from './server.mjs';
const root='reports/local/terrain-batch4-20261011',out=root+'/gallery-review';await fs.mkdir(out,{recursive:true});await fs.access(out+'/results.json').then(()=>{throw Error('Evidence exists');},e=>{if(e.code!=='ENOENT')throw e;});
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);
const report={passed:false,at:new Date().toISOString(),errors:[],checks:[],screens:[],videos:[],frames:[]};await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
async function loaded(){await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png',fullPage:true});report.screens.push(name);}
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/comparison-gallery.html');await loaded();
 for(const suite of ['stage','maps','industrial','dense','edge','sequence']){await page.locator('#suite').selectOption(suite);await loaded();const count=await page.locator('#scene option').count();assert.ok(count>0);await page.locator('#scene').selectOption(String(count-1));await loaded();await page.locator('#previous').click();await loaded();await shot(suite+'-desktop');report.checks.push({suite,records:count,firstAndLastLoaded:true});}
 await page.locator('#suite').selectOption('maps');assert.equal(await page.locator('#identity option').count(),138);for(let i=0;i<138;i++){await page.locator('#identity').selectOption(String(i));await loaded();}for(const theme of ['industrial','mar-sara','char','ice','frontier']){await page.locator('#theme').selectOption(theme);await loaded();}report.checks.push({identities:138,maps:5});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile');await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.locator('#videoSelect option').count(),15);
 for(let i=0;i<15;i++){
  await page.locator('#videoSelect').selectOption(String(i));const video=page.locator('#video');
  const result=await video.evaluate(async v=>{v.muted=true;v.playbackRate=4;await v.play();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video playback timeout')),60000);v.addEventListener('ended',()=>{clearTimeout(timer);resolve();},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('Video decode failed'));},{once:true});});return {src:v.getAttribute('src'),width:v.videoWidth,height:v.videoHeight,duration:v.duration,ended:v.ended,decoded:v.getVideoPlaybackQuality().totalVideoFrames};});
  assert.ok(result.ended&&result.width>0&&result.duration>=19&&result.decoded>1);report.videos.push(result);
  for(const time of [4,16]){const info=await video.evaluate(async(v,time)=>{v.pause();await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time;});v.controls=false;return {actual:v.currentTime,decoded:v.getVideoPlaybackQuality().totalVideoFrames};},time),file='video-'+i+'-'+time+'s.png';await video.screenshot({path:out+'/'+file});report.frames.push({source:result.src,requested:time,...info,file:'gallery-review/'+file});}
  console.log('Decoded '+result.src);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);await shot('failure').catch(()=>{});process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await fs.writeFile(root+'/gallery-review.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,videos:report.videos.length,frames:report.frames.length,failure:report.failure}));}
