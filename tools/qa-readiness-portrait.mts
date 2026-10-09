import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from '@playwright/test';import {createGameServer} from './coze-web-server.mjs';
const offline=process.argv.includes('--offline'),out=`reports/local/ui-battle-feedback-20261009/portrait-${offline?'offline':'web'}`;await fs.mkdir(out,{recursive:true});
const file='dist/SC2-Survivors-UI-Battle-Feedback-Final-20261009.html';
const server=offline?null:createGameServer({webRoot:path.resolve('dist/web'),assetRoot:path.resolve('dist/web'),backendOptions:{config:{enabled:false}}});if(server)await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const profile=offline?await fs.mkdtemp(path.resolve('.cache/ui-feedback-portrait-')):null;
const browser=offline?null:await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=offline?await chromium.launchPersistentContext(profile!,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files'],viewport:{width:320,height:640}}):await browser!.newContext({viewport:{width:320,height:640}});
if(offline)await context.setOffline(true);const page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(25000);
const report:any={build:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),offline,file:offline?file:null,profile,checks:[],screens:[],geometry:[],errors:[],method:'Native current-format import and readiness UI; portrait crop inspected at two widths, with desktop and landscape controls. Not compatibility or physical-device acceptance.'};page.on('pageerror',e=>report.errors.push(e.message));
try{
 for(const race of offline?['terran']:['terran','zerg','protoss']){
  await page.goto(offline?pathToFileURL(path.resolve(file)).href:'http://127.0.0.1:'+(server!.address()as any).port,{timeout:300000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:300000});
  await page.locator('.main-actions [data-action=menu-load]').click();const pick=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await pick).setFiles(path.resolve('reports/local/ui-battle-feedback-20261009/browser-r4/'+race+'-shop.json'));await page.locator('[data-action=menu-load-ready]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:300000});
  for(const [width,height]of [[320,640],[390,844],[1440,900],[844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(500);
   const image=await page.locator('.loading-portrait>.painted-cover').evaluate(e=>{const i=e as HTMLImageElement,s=getComputedStyle(i),r=i.getBoundingClientRect();return {src:i.src,decoded:i.complete&&i.naturalWidth>0,width:i.naturalWidth,height:i.naturalHeight,position:s.objectPosition,bounds:r.toJSON()};});
   assert.ok(image.decoded);assert.equal(image.position,width<700?'78% 50%':'50% 50%');
   const button=await page.locator('[data-action=flow-continue]').boundingBox();assert.ok(button);assert.ok(Math.abs(button.x+button.width/2-width/2)<2);assert.ok(button.y>=0&&button.y+button.height<=height);assert.ok(await page.locator('[data-action=flow-continue]').isEnabled());
   const name=`${race}-${width}x${height}`;await page.screenshot({path:out+'/'+name+'.png'});report.screens.push(name);report.geometry.push({race,width,height,image,button});
  }
  assert.deepEqual((await page.evaluate(()=>window.__SC2_REPORT__())).errors,[]);report.checks.push(race+': readiness portrait face crop, desktop/landscape retained, centered enabled action');
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String((e as Error).stack??e);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await context.close();await browser?.close();if(server)await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({checks:report.checks,screens:report.screens.length,errors:report.errors,failure:report.failure}));}
