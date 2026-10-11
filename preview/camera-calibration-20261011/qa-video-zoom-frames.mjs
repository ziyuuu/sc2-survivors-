import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from './server.mjs';
const root='reports/local/camera-calibration-20261011',out=root+'/video-zoom-review';
await fs.mkdir(out,{recursive:true});await fs.access(out+'/results.json').then(()=>{throw Error('Evidence exists');},e=>{if(e.code!=='ENOENT')throw e;});
const gallery=JSON.parse(await fs.readFile(root+'/gallery-review.json','utf8'));assert.equal(gallery.passed,true);assert.equal(gallery.videos.length,15);
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);
const report={passed:false,at:new Date().toISOString(),method:'Supplementary real-video decoding at 6s and 10s, inside the recorded 70% and 160% holding intervals. Existing full playback and 4s/16s frames are retained; no new simulation or recording.',frames:[],errors:[]};await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/comparison-gallery.html');
 for(let i=0;i<15;i++){
  await page.locator('#videoSelect').selectOption(String(i));const video=page.locator('#video');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
  for(const [time,nominalZoom]of [[6,.7],[10,1.6]]){
   const info=await video.evaluate(async(v,time)=>{v.pause();v.controls=false;await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Seek timeout')),45000);v.addEventListener('seeked',()=>{clearTimeout(t);resolve();},{once:true});v.currentTime=time;});return {source:v.getAttribute('src'),actual:v.currentTime,width:v.videoWidth,height:v.videoHeight,decoded:v.getVideoPlaybackQuality().totalVideoFrames};},time);
   assert.equal(info.source,gallery.videos[i].src);assert.ok(Math.abs(info.actual-time)<.1);assert.ok(info.width>0&&info.decoded>0);const file='video-'+i+'-'+time+'s.png';await video.screenshot({path:out+'/'+file});report.frames.push({...info,requested:time,nominalZoom,file:'video-zoom-review/'+file});
  }
 }
 assert.equal(report.frames.length,30);assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,frames:report.frames.length,failure:report.failure}));}
