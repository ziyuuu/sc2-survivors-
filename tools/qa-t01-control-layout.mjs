import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2];assert.match(run,/^tool-controls-probe-r\d+$/);
const root=path.resolve('reports/local/t01-20261024',run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const server=await serveT01(),report={run,build:server.build,profilePath:profile,scope:'Tool-only label layout in three sizes, with explicitly emulated foreground; no production UI edit.',checks:[],errors:[]};
let browser,child;
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0],cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});page.on('pageerror',e=>report.errors.push(e.message));
 for(const mode of ['dynamic','static']){
  await page.setViewportSize({width:1440,height:900});await page.goto(server.url+'/'+mode+'.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   const row={mode,width,height,screens:[]};report.checks.push(row);
   const tool=page.locator('#t01-tool');await tool.evaluate(e=>e.scrollTop=0);
   const shot=async label=>{const file=`${mode}-${width}-${label}.jpg`;await page.screenshot({path:root+'/'+file,type:'jpeg',quality:92});row.screens.push(file);};
   await shot('top');
   row.labels=[];
   for(const label of await tool.locator('label').all()){
    await label.scrollIntoViewIfNeeded();await shot('label-'+row.labels.length);
    const value=await label.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('#t01-tool').getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent,whiteSpace:s.whiteSpace,display:s.display,height:r.height,lineHeight:s.lineHeight,rect:r.toJSON(),withinTool:r.left>=p.left&&r.right<=p.right,withinViewport:r.top>=0&&r.bottom<=innerHeight};});row.labels.push(value);
    assert.equal(value.whiteSpace,'nowrap');assert.equal(value.display,'inline-flex');assert.ok(value.withinTool&&value.withinViewport);assert.ok(value.height<=parseFloat(value.lineHeight)+2);
   }
   await page.locator('#t01-count').scrollIntoViewIfNeeded();await shot('bottom');row.overflow=await tool.evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(row.overflow,false);
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.pass=false;process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors.length,pass:report.pass,failure:report.failure}));}
