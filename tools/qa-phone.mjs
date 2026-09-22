import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const serial=process.env.SC2_ADB_SERIAL;if(!serial)throw Error('Set SC2_ADB_SERIAL to the explicitly selected, unlocked adb device.');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',windowsHide:true}).trim();
const out='reports/local/qa-phone';await fs.mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),scope:'Physical Android Chrome, current development build via USB localhost. One focused run, actual rAF timing without CPU throttle; synthetic touch, no human visual approval.',device:{maker:adb('shell','getprop','ro.product.manufacturer'),model:adb('shell','getprop','ro.product.model'),android:adb('shell','getprop','ro.build.version.release'),soc:adb('shell','getprop','ro.soc.model')},runs:[],errors:[]};let browser,page;
try{
 // Only use the localhost page opened for this task; leave unrelated tabs alone.
 browser=await chromium.connectOverCDP('http://127.0.0.1:9235');page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://127.0.0.1:5173/')&&p.url().includes('qa=phone'));assert.ok(page,'Project phone test tab missing');
 await page.bringToFront();await page.waitForFunction(()=>!document.hidden,{timeout:15000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,{timeout:90000});
 page.on('pageerror',e=>report.errors.push(e.message));await page.getByLabel('画质',{exact:true}).selectOption('balanced');await page.getByRole('button',{name:/部署小队/}).click();const cdp=await page.context().newCDPSession(page);
 const j=await page.locator('#joystick').boundingBox(),d=await page.locator('#dash').boundingBox(),x=j.x+j.width/2,y=j.y+j.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y,id:1}]});await page.waitForTimeout(150);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+40,y,id:1},{x:d.x+d.width/2,y:d.y+d.height/2,id:2}]});await page.waitForTimeout(150);
 report.touch=await page.evaluate(()=>({moving:window.__SC2_DEBUG__.world.input.x>.5,dash:window.__SC2_DEBUG__.world.dashReady>window.__SC2_DEBUG__.world.time,selected:String(getSelection()),scroll:[scrollX,scrollY]}));assert.ok(report.touch.moving&&report.touch.dash);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.input.x),0);
 const measure=async name=>{await page.waitForTimeout(6000);await page.evaluate(()=>window.__SC2_DEBUG__.view.frameTimes.length=0);await page.waitForTimeout(12000);const value=await page.evaluate(()=>{const d=window.__SC2_DEBUG__,frames=d.view.frameTimes.slice(),sorted=frames.slice().sort((a,b)=>a-b),gl=d.view.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {...window.__SC2_REPORT__(),visible:!document.hidden,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],samples:frames.length,averageFps:1000/(frames.reduce((s,n)=>s+n,0)/frames.length),p50FrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',friendly:d.world.allies().length,enemies:d.world.enemyCount()};});assert.ok(value.visible&&value.samples>20);report.runs.push({name,...value});console.log(JSON.stringify(report.runs.at(-1)));await page.screenshot({path:out+'/'+name+'.png'});};
 await measure('normal-opening');
 for(const enemies of [100,300]){
  await page.evaluate(count=>{const w=window.__SC2_DEBUG__.world;clearInterval(window.__PHONE_LOAD__);w.entities.clear();w.economicTargets.clear();w.buildings.clear();w.pods=[];w.effects=[];w.stage=10;w.stageElapsed=0;w.stageStartedAt=w.time;w.prepareStage();w.autoWaves=false;w.input={x:0,z:0};w.anchor={x:0,z:0,facing:Math.PI/2};w.phase='battle';w.paused=false;let n=0;
   const keep=()=>{for(const u of w.allies())u.hp=u.maxHp=100000;while(w.allies().length<25){const i=n++,u=w.addUnit(['marine','hellion','tank','medivac'][i%4],'terran',(i%5-2)*1.8,Math.floor(i%25/5)*1.7);u.hp=u.maxHp=100000;}while(w.enemyCount()<count){const i=n++,a=i*2.399,u=w.addUnit(['zergling','roach','baneling','ravager'][i%4],'zerg',Math.sin(a)*14,Math.cos(a)*14);u.hp=u.maxHp=100000;u.weaponDamage=0;u.bileCooldown=1000;}};keep();window.__PHONE_LOAD__=setInterval(keep,200);
  },enemies);await measure('stress-25-'+enemies);
 }
 await page.evaluate(()=>{clearInterval(window.__PHONE_LOAD__);window.__SC2_DEBUG__.world.paused=true;});
 await fs.writeFile(out+'/gfxinfo.txt',adb('shell','dumpsys','gfxinfo','com.android.chrome'));
 report.nativeFrameCaveat='gfxinfo is browser UI evidence; the reported game FPS is the page rAF sample, not gfxinfo.';
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{
 await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));if(page)await page.close().catch(()=>{});
 try{adb('forward','--remove','tcp:9235');adb('reverse','--remove','tcp:5173');}catch{}
 // Disconnect this diagnostic process; never send Browser.close to the user's phone browser.
 process.exit(process.exitCode??0);
}
