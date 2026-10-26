import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const root=path.resolve('.cache/t01-gallery-20261025/rest-probe');await fs.mkdir(root,{recursive:true});
const server=await serveT01(),profile=root+'/profile',report={rows:[],errors:[]};let browser,child;
try{
 await fs.mkdir(profile,{recursive:true});child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1440,height:900});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});await page.bringToFront();
 const state=()=>page.evaluate(()=>{const t=T01,r=t.runtime.snapshot(),u=t.app.world.entities.get(r.actor.id),v=t.app.view,m=v.gpu.get(u.modelKey??u.unitType),s=v.animationStates.get(u.id);return {playing:r.playing,time:r.time,elapsed:r.elapsed,paused:t.app.world.paused,action:u.action,position:[u.x,u.z],animationMode:v.animationMode,source:m?{idle:m.actions.idle?.name,idleDuration:m.actions.idle?.duration,birth:m.actions.spawn?.name,birthDuration:m.actions.spawn?.duration,idleChanging:m.actions.idle?.tracks.filter(t=>{const size=t.getValueSize();return Array.from(t.values).some((v,i)=>i>=size&&Math.abs(v-t.values[i%size])>1e-5);}).length}:null,render:s?.sampled??null};});
 for(const [family,action]of [['marine','spawn'],['marine','idle'],['zergling','spawn'],['zergling','idle'],['zealot','idle']]){
  const id=`actor:${family}:1:${action}`;console.log('probe '+id);await page.evaluate(id=>T01.load(id),id);const row={id,ready:await state(),frames:[]};report.rows.push(row);await page.waitForTimeout(700);row.loadedOnly=await state();
  await page.evaluate(()=>{T01.runtime.trigger();T01.runtime.pause();T01.app.world.paused=false;});
  for(const time of [.016667,.15,.7,1.5,3]){await page.evaluate(t=>T01.runtime.advanceTo(t),time);row.frames.push(await state());if(time===.7||time===1.5)await page.screenshot({path:root+'/'+family+'-'+action+'-'+time+'.png'});}
  await fs.writeFile(root+'/result.json',JSON.stringify(report,null,2));
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server.close();await fs.writeFile(root+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({rows:report.rows.length,errors:report.errors,failure:report.failure}));}
