import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const out='reports/local/qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={date:new Date().toISOString(),screenshots:'Saved locally only; no image upload or model-based visual inspection.',desktop:{},mobile:[],offline:{},errors:[]};
// Read the actual default and HUD; never inject a diagnostic roster for this check.
const assertOpening=async page=>{
 const state=await page.evaluate(()=>({phase:window.__SC2_REPORT__().phase,stage:window.__SC2_REPORT__().stage,
  roster:[...document.querySelectorAll('#roster .unit-status')].map(el=>({name:el.querySelector('.unit-name').textContent,soldiers:[...el.querySelectorAll('.soldier:not(.empty)')].map(s=>s.title)}))}));
 assert.equal(state.phase,'menu');assert.equal(state.stage,1);
 assert.deepEqual(state.roster.map(u=>u.soldiers.length),[1,0,0,0]);
 assert.equal(state.roster[0].name,'Marine');assert.deepEqual(state.roster[0].soldiers,['Rank 1 · 45 / 45 HP']);
};
const newPage=async(size={width:1440,height:900},mobile=false)=>{const ctx=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1});const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))report.errors.push(m.text());});await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:60000});await assertOpening(page);await page.getByRole('button',{name:/部署小队/}).click();return {ctx,page};};
try{
 if(process.env.SC2_QA_SKIP_DESKTOP==='1'){
  report.desktop=JSON.parse(await fs.readFile(out+'/REPORT.json','utf8')).desktop;
  report.desktop.reusedEvidence=true;
 }else{
 const {ctx,page}=await newPage();
 await page.getByRole('button',{name:/生产 B/}).click();await page.locator('[data-action="build"][data-type="barracks"]').click();await page.locator('#production [data-action="production"]').click();
 console.log('Desktop: started normal stage 1; paid for Barracks. No speed/health changes.');
 for(let i=0;i<12;i++){await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(4700);const state=await page.evaluate(()=>window.__SC2_REPORT__());if(i%3===2||state.phase!=='battle')console.log('Normal stage progress',JSON.stringify(state));if(state.phase!=='battle')break;}
 await page.waitForFunction(()=>window.__SC2_REPORT__().phase!=='battle',{timeout:10000});
 const first=await page.evaluate(()=>window.__SC2_REPORT__());report.desktop.normalStage={...first,input:'Physical keyboard events: retreat west briefly, then hold to regroup; no speed, HP or damage overrides.'};
 if(first.phase!=='reward'){report.desktop.normalStage.warning='Normal attempt ended in defeat; subsequent UI flows use a separate diagnostic setup.';await page.reload();await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:60000});await page.getByRole('button',{name:/部署小队/}).click();await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.build('barracks');w.buildings.get('barracks').remaining=0;w.endStage();});}
 else assert.ok(first.time>=60);await page.screenshot({path:out+'/desktop-reward.png'});
 const before=await page.evaluate(()=>({m:window.__SC2_DEBUG__.world.wallet.minerals,ids:window.__SC2_DEBUG__.world.rewards.map(r=>r.id).sort()}));await page.locator('[data-action="reroll"]').click();const after=await page.evaluate(()=>({m:window.__SC2_DEBUG__.world.wallet.minerals,ids:window.__SC2_DEBUG__.world.rewards.map(r=>r.id).sort()}));assert.equal(before.m-after.m,50);assert.notDeepEqual(before.ids,after.ids);report.desktop.paidReroll=true;
 await page.locator('[data-action="reward"]').first().click();assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.stage),2);report.desktop.choice=true;
 await page.getByRole('button',{name:/生产 B/}).click();await page.locator('[data-action="train"][data-type="marine"]').click();await page.locator('#production [data-action="production"]').click();const jobs=await page.evaluate(()=>window.__SC2_DEBUG__.world.buildings.get('barracks').queue.length);assert.ok(jobs>0);report.desktop.paidProduction=true;
 // Bounded diagnostic scenarios use the same runtime. They are not evidence of winning a normal rescue.
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=true;w.updateProduction(20);w.changed();});
 let pods=await page.evaluate(()=>window.__SC2_DEBUG__.world.pods.map(p=>({id:p.id,type:p.unitType,status:p.status,deadline:p.expiresAt-p.landedAt,guardians:p.guardianIds.size})));assert.equal(pods.length,1);assert.equal(pods[0].deadline,30);report.desktop.productionPod=pods[0];
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,p=w.pods[0];for(const id of p.guardianIds)w.hit(w.entities.get(id),1e6);w.hash.rebuild(w.entities.values());w.updatePods();w.changed();});assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.pods[0].status),'rescued');report.desktop.rescueSuccess='diagnostic: guardians killed through real HP damage path';
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,p=w.spawnPod('hellion',{x:35,z:-32});w.hit(p,p.hp+p.armor);w.updatePods();w.changed();});assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.pods.at(-1).status),'destroyed');report.desktop.rescueFailure='diagnostic: pod destroyed via damage';
 await page.keyboard.press('Escape');await page.screenshot({path:out+'/desktop-rescue.png'});
 report.desktop.icons=await page.evaluate(async()=>{const {ASSETS,assetUrl}=await import('/src/assets/manifest.ts');const result=[];for(const a of ASSETS.values()){if(a.kind!=='icon')continue;const ok=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im.naturalWidth>0);im.onerror=()=>resolve(false);im.src=assetUrl(a.id);});result.push({id:a.id,ok});}return result;});assert.equal(report.desktop.icons.filter(x=>x.ok).length,23);
 await ctx.close();
 }
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const {ctx,page}=await newPage(viewport,true),cdp=await ctx.newCDPSession(page);
  const stick=await page.locator('#joystick').boundingBox(),dash=await page.locator('#dash').boundingBox();const x=stick.x+stick.width/2,y=stick.y+stick.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y,id:1}]});await page.waitForTimeout(100);
  const moved=await page.evaluate(()=>window.__SC2_DEBUG__.world.input.x);assert.ok(moved>.5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+45,y,id:1},{x:dash.x+dash.width/2,y:dash.y+dash.height/2,id:2}]});
  await page.waitForTimeout(100);const multi=await page.evaluate(()=>({input:window.__SC2_DEBUG__.world.input.x,dash:window.__SC2_DEBUG__.world.dashReady,time:window.__SC2_DEBUG__.world.time}));assert.ok(multi.input>.5&&multi.dash>multi.time);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:viewport.width-15,y:viewport.height/2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.input.x),0);
  await page.screenshot({path:out+`/mobile-${viewport.width}x${viewport.height}-battle.png`});
  const layout=await page.evaluate(()=>({selection:String(getSelection()),scroll:[scrollX,scrollY],width:document.documentElement.scrollWidth,viewport:innerWidth,joystickStyle:getComputedStyle(document.querySelector('#joystick')).touchAction,canvasStyle:getComputedStyle(document.querySelector('canvas')).userSelect}));assert.equal(layout.selection,'');assert.deepEqual(layout.scroll,[0,0]);assert.ok(layout.width<=layout.viewport);assert.equal(layout.joystickStyle,'none');
  await page.evaluate(()=>window.__SC2_DEBUG__.world.endStage());await page.locator('[data-action="reroll"]').click();await page.screenshot({path:out+`/mobile-${viewport.width}x${viewport.height}-reward.png`});
  const rewardLayout=await page.locator('#overlay').evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,touchAction:getComputedStyle(el).touchAction}));assert.equal(rewardLayout.touchAction,'pan-y');if(rewardLayout.scroll>rewardLayout.client){await page.locator('#overlay').evaluate(el=>el.scrollTop=100);assert.ok(await page.locator('#overlay').evaluate(el=>el.scrollTop)>0);}
  await page.locator('[data-action="reward"]').first().click();
  // Stress load bypasses the normal roster cap only through development API; no production rule change.
  await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.entities.clear();w.input={x:0,z:0};w.anchor.x=0;w.anchor.z=0;const types=['marine','hellion','tank','medivac'];for(let i=0;i<25;i++){const u=w.addUnit(types[i%4],'terran',(i%5-2)*1.8,Math.floor(i/5)*1.7);u.hp=u.maxHp=100000;}
   for(let i=0;i<300;i++){const a=i/300*Math.PI*2,r=10+i%8;const u=w.addUnit(['zergling','roach','baneling','ravager'][i%4],'zerg',Math.cos(a)*r,Math.sin(a)*r);u.hp=u.maxHp=100000;u.weaponDamage=0;u.bileCooldown=1000;}w.phase='battle';w.paused=false;});
  // Maintain the advertised load despite Baneling self-destruction and tank mode stat refreshes.
  await page.evaluate(()=>{let serial=0;const keepLoad=()=>{const w=window.__SC2_DEBUG__.world;for(const u of w.allies())u.hp=u.maxHp=100000;
   while(w.allies().length<25){const n=serial++,u=w.addUnit(['marine','hellion','tank','medivac'][n%4],'terran',(n%5-2)*1.8,3);u.hp=u.maxHp=100000;}
   while(w.enemyCount()<300){const n=serial++,a=n*2.399,u=w.addUnit(['zergling','roach','baneling','ravager'][n%4],'zerg',Math.cos(a)*14,Math.sin(a)*14);u.hp=u.maxHp=100000;u.weaponDamage=0;u.bileCooldown=1000;}};
   window.__SC2_STRESS_KEEP__=keepLoad;window.__SC2_STRESS_TIMER__=setInterval(keepLoad,200);keepLoad();});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.waitForTimeout(2000);await page.evaluate(()=>{window.__SC2_DEBUG__.view.frameTimes.length=0;});await page.waitForTimeout(10000);
  const perf=await page.evaluate(()=>{window.__SC2_STRESS_KEEP__();clearInterval(window.__SC2_STRESS_TIMER__);const d=window.__SC2_DEBUG__,a=d.view.frameTimes.slice().sort((a,b)=>a-b),gl=d.view.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');return {...d.view.report(),deviceDpr:devicePixelRatio,renderDpr:d.view.renderer.getPixelRatio(),gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',sampleFrames:a.length,averageFps:1000/(a.reduce((n,f)=>n+f,0)/a.length),p50FrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],friendly:d.world.allies().length,enemies:d.world.enemyCount()};});await page.screenshot({path:out+`/mobile-${viewport.width}x${viewport.height}-stress.png`});report.mobile.push({viewport,multiTouch:true,releaseOutside:true,layout,rewardLayout,performance:{...perf,environment:'Desktop Chrome with mobile viewport/touch emulation, device DPR 3 / render DPR capped at 1.5, and 4x CPU throttle; two-second warmup followed by ten-second load, final 240 frames; diagnostic respawns maintain 25 friendly / 300 enemy actors; not a physical phone.'}});console.log('Mobile QA',viewport,JSON.stringify(perf));await ctx.close();
 }
 const offline=await browser.newContext({viewport:{width:1440,height:900}});await offline.setOffline(true);const pageOffline=await offline.newPage(),network=[];pageOffline.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});await pageOffline.goto(pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href);await pageOffline.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:60000});await assertOpening(pageOffline);await pageOffline.getByRole('button',{name:/部署小队/}).click();await pageOffline.keyboard.press('F1');await pageOffline.waitForTimeout(1000);report.offline={...await pageOffline.evaluate(()=>window.__SC2_REPORT__()),requests:network,debugExposed:await pageOffline.evaluate(()=>typeof window.__SC2_DEBUG__!=='undefined')};assert.equal(network.length,0);assert.equal(report.offline.debugExposed,false);assert.equal(report.offline.models,8);await pageOffline.screenshot({path:out+'/offline-final.png'});await offline.close();
 assert.equal(report.errors.length,0);console.log('QA complete.');
}catch(error){report.failure=String(error.stack??error);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
