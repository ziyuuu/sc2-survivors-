import {tutorialDistRoot,tutorialWorkRoot} from './tutorial-candidate-paths.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveTutorial} from './serve-short-tutorial-candidate.mjs';
const root=tutorialWorkRoot,recordings=JSON.parse(await fs.readFile(root+'/review/recordings/manifest.json','utf8')),server=await serveTutorial({port:0}),origin='http://127.0.0.1:'+server.address().port;
const result={passed:false,scope:'Actual MP4 files: Chromium native video/audio metadata, play, seek, HTTP byte ranges. Full ffmpeg decode also performed during packaging.',cases:[],errors:[]};let browser,context;
try{
 await fs.writeFile(root+'/review/playback.html','<!doctype html><meta charset="utf-8"><video controls playsinline id="v"></video>');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.goto(origin+'/review/playback.html');
 for(const row of recordings){const url=origin+'/review/recordings/'+row.race+'.mp4',response=await fetch(url,{headers:{Range:'bytes=0-1023'}});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,1024);assert.match(response.headers.get('content-range'),/^bytes 0-1023\//);
  await page.evaluate(url=>{const v=document.querySelector('video');v.src=url;v.load();},url);await page.waitForFunction(()=>document.querySelector('video').readyState>=2,null,{timeout:30000});
  const metadata=await page.evaluate(()=>{const v=document.querySelector('video');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,mp4:v.canPlayType('video/mp4; codecs="avc1.64001f, mp4a.40.2"')};});assert.equal(metadata.width,row.videoDimensions.width);assert.equal(metadata.height,row.videoDimensions.height);assert.ok(Math.abs(metadata.duration-row.durationSeconds)<.25);assert.ok(metadata.mp4);
  await page.evaluate(async()=>{const v=document.querySelector('video');v.currentTime=Math.min(v.duration/2,40);await v.play();});await page.waitForFunction(()=>!document.querySelector('video').seeking);const before=await page.evaluate(()=>document.querySelector('video').currentTime);await page.waitForTimeout(1200);const after=await page.evaluate(()=>{const v=document.querySelector('video');v.pause();return v.currentTime;});assert.ok(after>before+.3);result.cases.push({race:row.race,...metadata,range:true,playedAndSeeked:true});
 }assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await context?.close();await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(root+'/delivery-playback.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
