import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const root='reports/local/cinematic-preload-20261012',out=root+'/gallery-r1';
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const server=labServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});
const result={passed:false,images:0,pairs:0,videos:0,errors:[]};page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/comparison.html');
 for(const [select,images,key] of [['imageSelect',['shot'],'images'],['pairSelect',['before','after'],'pairs']]){
  const count=await page.locator('#'+select+' option').count();
  for(let i=0;i<count;i++){
   await page.locator('#'+select).selectOption(String(i));
   for(const id of images)await page.locator('#'+id).evaluate(async image=>{await image.decode();if(!image.naturalWidth)throw Error('Empty image');});
   result[key]++;
  }
 }
 const count=await page.locator('#videoSelect option').count();for(let i=0;i<count;i++){
  await page.locator('#videoSelect').selectOption(String(i));
  await page.locator('#video').evaluate(async video=>{if(video.readyState<1)await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',reject,{once:true});});if(video.duration<19)throw Error('Short video');});result.videos++;
 }
 assert.deepEqual(result.errors,[]);assert.equal(result.images,94);assert.equal(result.pairs,12);assert.equal(result.videos,3);
 await page.locator('#imageSelect').selectOption('0');await page.locator('#shot').evaluate(image=>image.decode());await page.screenshot({path:out+'/desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/portrait.png'});result.passed=true;
}catch(error){result.failure=String(error.stack??error);process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(result));}
