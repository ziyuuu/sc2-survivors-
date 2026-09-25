import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('dist/web'),out='reports/local/qa-m7-web';
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=createServer(async(request,response)=>{
 try{
  const url=new URL(request.url??'/',`http://${request.headers.host}`),relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  if(relative.split('/').includes('..'))throw Error('Unsafe asset path');
  const file=path.resolve(root,relative),inside=path.relative(root,file);
  if(!inside||inside.startsWith('..')||path.isAbsolute(inside))throw Error('Asset path escapes Web build');
  const bytes=await fs.readFile(file);response.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream','content-length':bytes.length});response.end(bytes);
 }catch(error){response.writeHead(404);response.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port,origin=`http://127.0.0.1:${port}/`,browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={at:new Date().toISOString(),origin,checks:[],errors:[],screens:[]};
try{
 const manifest=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
 assert.equal(manifest.assetCount,751);
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('requestfailed',request=>report.errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
 page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
 await page.goto(origin,{timeout:240000});
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
 await page.screenshot({path:`${out}/menu-desktop.png`});report.screens.push('menu-desktop.png');
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race][data-race=zerg]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty][data-difficulty=hard]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
 const before=await page.evaluate(()=>window.__SC2_REPORT__());
 assert.equal(before.expedition.race,'zerg');
 assert.match(await page.locator('#mission').innerText(),/困难/);
 assert.ok(await page.locator('#battle').evaluate(canvas=>canvas.width>0&&canvas.height>0));
 await page.screenshot({path:`${out}/battle-desktop.png`});report.screens.push('battle-desktop.png');
 report.checks.push('Static Web directory boots with verified local assets and starts Zerg/Hard without a state-changing debug API');
 await page.locator('#topbar [data-action=pause]').click();
 const savedTime=await page.evaluate(()=>window.__SC2_REPORT__().time);
 await page.locator('[data-action=save-now]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'),null,{timeout:30000});
 await page.reload({timeout:240000});
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-load]').click();
 await page.locator('[data-action=menu-load-local]').click();
 await page.locator('[data-action=menu-load-ready]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
 const after=await page.evaluate(()=>window.__SC2_REPORT__());
 assert.equal(after.expedition.race,'zerg');assert.equal(after.time,savedTime);
 assert.match(await page.locator('#mission').innerText(),/困难/);
 report.checks.push('Web directory reload restores Zerg/Hard and exact paused battle time');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`${out}/battle-mobile.png`});report.screens.push('battle-mobile.png');
 report.checks.push('390×844 Web build has no page-wide horizontal overflow');
 assert.deepEqual(report.errors,[]);
 report.passed=true;
 await context.close();
}catch(error){report.passed=false;report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure??null}));}
