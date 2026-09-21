import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const out='reports/local/qa-v8-commands';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Actual mouse/right-click and CDP touch events in desktop Chrome. Explicit isolated fixtures verify input, targeting and routing, not balance or an automated playthrough. Mobile sizes are emulation, not a physical phone. Images remain local; no human visual approval.',desktop:{},touch:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
function watch(p){p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});}
async function start(p,url='http://127.0.0.1:5173/'){watch(p);await p.goto(url);await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:90000});await p.getByRole('button',{name:/部署小队/}).click();}
async function fixture(p,targets=false){await p.evaluate(targets=>{const w=window.__SC2_DEBUG__.world;w.cancelOrder();w.autoWaves=false;w.eventPlan=[];w.nextWave=Infinity;w.buildings.clear();w.entities.clear();w.pods=[];w.economicTargets.clear();w.effects=[];w.pickups=[];w.anchor={x:0,z:0,facing:Math.PI/2};w.stageElapsed=0;w.phase='battle';w.paused=false;w.input={x:0,z:0};w.addUnit('marine','terran',0,0);if(targets){for(const [x,z] of [[innerWidth<600?3.5:7,0],[0,-3]]){const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=10000;e.moveSpeed=0;e.weaponDamage=0;}window.__chosen=[...w.entities.values()].find(e=>e.owner==='zerg').id;}w.changed();},targets);await p.waitForTimeout(550);}
async function pixel(p,point){return p.evaluate(p=>window.__SC2_DEBUG__.view.screen(p),point);}
async function clickWorld(p,point,button='right'){const s=await pixel(p,point);assert.equal(await p.evaluate(s=>document.elementFromPoint(s.x,s.y)?.id,s),'battle');await p.mouse.click(s.x,s.y,{button});return s;}
async function order(p){return p.evaluate(()=>window.__SC2_REPORT__().order);}
async function focusPixel(p,touch=false){return p.evaluate(touch=>{const d=window.__SC2_DEBUG__,u=d.world.entities.get(window.__chosen),s=d.view.screen(u);for(const y of [s.y-10,s.y-5,s.y,s.y-20]){if(document.elementFromPoint(s.x,y)?.id==='battle'&&d.view.pick(s.x,y,touch)?.targetId===u.id)return {x:s.x,y};}throw Error('No exposed hit volume for hostile');},touch);}
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});await start(p);await fixture(p);
 await p.evaluate(()=>window.addEventListener('contextmenu',e=>window.__contextPrevented=e.defaultPrevented));
 const ground=await clickWorld(p,{x:8,z:2});const initial=await order(p);assert.equal(initial.kind,'move');assert.ok(Math.hypot(initial.point.x-8,initial.point.z-2)<.15);assert.equal(await p.evaluate(()=>window.__contextPrevented),true);
 await clickWorld(p,{x:-3,z:1},'left');assert.equal((await order(p)).issuedAt,initial.issuedAt);
 await p.locator('#roster').click({button:'right'});assert.equal((await order(p)).issuedAt,initial.issuedAt);
 await p.waitForTimeout(250);assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.anchor.x>.3));await p.screenshot({path:out+'/desktop-move.png'});
 await p.keyboard.down('ArrowLeft');await p.waitForTimeout(200);await p.keyboard.up('ArrowLeft');assert.equal(await order(p),null);
 report.desktop.move={ground,contextMenuPrevented:true,leftClickIgnored:true,hudIgnored:true,keyboardTakeover:true};
 await fixture(p,true);const target=await focusPixel(p);await p.mouse.click(target.x,target.y,{button:'right'});assert.equal((await order(p)).kind,'focus');await p.waitForTimeout(1900);
 report.desktop.focus=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world,t=w.entities.get(window.__chosen);return {targetId:t.id,damaged:t.hp<t.maxHp,order:w.order,unitTarget:w.allies()[0].attackTarget,anchor:{...w.anchor}};});assert.ok(report.desktop.focus.damaged);assert.equal(report.desktop.focus.unitTarget,report.desktop.focus.targetId);await p.screenshot({path:out+'/desktop-focus.png'});
 await p.keyboard.press('Escape');const frozen=await p.evaluate(()=>({order:window.__SC2_REPORT__().order,time:window.__SC2_REPORT__().time}));await p.mouse.click(1100,500,{button:'right'});await p.waitForTimeout(150);assert.deepEqual(await p.evaluate(()=>({order:window.__SC2_REPORT__().order,time:window.__SC2_REPORT__().time})),frozen);await p.keyboard.press('Escape');report.desktop.pauseFrozen=true;
 await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.hit(w.entities.get(window.__chosen),20000);});await p.waitForTimeout(150);assert.equal(await order(p),null);report.desktop.deadTargetCleared=true;
 await fixture(p);await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.stage=8;w.prepareStage();w.eventPlan=[];w.anchor={x:26,z:0,facing:Math.PI/2};const u=w.allies()[0];u.x=26;u.z=0;u.prev={x:26,z:0};w.changed();});await p.waitForTimeout(700);const plateau=await clickWorld(p,{x:32,z:4});const high=await order(p);assert.equal(high.kind,'move');assert.ok(Math.hypot(high.point.x-32,high.point.z-4)<.15);report.desktop.plateau={pixel:plateau,point:high.point};
 await p.close();console.log('Desktop right-click, focus, takeover, pause and height picking passed');
 for(const [width,height] of [[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await context.newPage();await start(p);await fixture(p);const cdp=await context.newCDPSession(p);
  const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  const s=await pixel(p,{x:5,z:1});assert.equal(await p.evaluate(s=>document.elementFromPoint(s.x,s.y)?.id,s),'battle');await touch('touchStart',[{...s,id:1}]);await touch('touchEnd',[]);assert.equal((await order(p)).kind,'move');await p.screenshot({path:out+`/touch-move-${width}x${height}.png`});
  await fixture(p,true);const t=await focusPixel(p,true);await touch('touchStart',[{...t,id:1}]);await touch('touchEnd',[]);assert.equal((await order(p)).kind,'focus');
  await fixture(p);let a=await pixel(p,{x:3,z:0});await touch('touchStart',[{...a,id:1}]);await touch('touchMove',[{x:a.x+30,y:a.y,id:1}]);await touch('touchEnd',[]);assert.equal(await order(p),null);
  await touch('touchStart',[{...a,id:1}]);await p.waitForTimeout(550);await touch('touchEnd',[]);assert.equal(await order(p),null);
  await touch('touchStart',[{...a,id:1}]);await touch('touchCancel',[]);assert.equal(await order(p),null);
  await touch('touchStart',[{...a,id:1}]);await touch('touchStart',[{...a,id:1},{x:a.x+30,y:a.y+20,id:2}]);await touch('touchEnd',[]);assert.equal(await order(p),null);
  const hud=await p.locator('#roster').boundingBox();await p.touchscreen.tap(hud.x+hud.width/2,hud.y+hud.height/2);assert.equal(await order(p),null);
  await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.addUnit('tank','terran',-3,0);w.changed();});const j=await p.locator('#joystick').boundingBox(),b=await p.locator('#siege').boundingBox(),x=j.x+j.width/2,y=j.y+j.height/2;
  await touch('touchStart',[{x,y,id:1}]);await touch('touchMove',[{x:x+30,y,id:1}]);await touch('touchStart',[{x:x+30,y,id:1},{x:b.x+b.width/2,y:b.y+b.height/2,id:2}]);await p.waitForTimeout(180);
  const result=await p.evaluate(()=>({input:window.__SC2_DEBUG__.world.input.x,tank:window.__SC2_DEBUG__.world.tankCommand,order:window.__SC2_REPORT__().order,selected:String(getSelection()),scroll:[scrollX,scrollY],pageWidth:document.documentElement.scrollWidth}));assert.ok(result.input>.5);assert.equal(result.tank,'siege');assert.equal(result.order,null);assert.equal(result.selected,'');assert.deepEqual(result.scroll,[0,0]);assert.ok(result.pageWidth<=width);
  await touch('touchEnd',[]);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.input.x),0);
  await p.evaluate(()=>window.__SC2_DEBUG__.world.endStage());await p.locator('[data-action=skip]').click();await p.locator('[data-action=skip]').click();assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.stage),2);assert.equal(await order(p),null);
  report.touch.push({width,height,tapMove:true,tapFocus:true,dragIgnored:true,longPressIgnored:true,cancelCleared:true,twoFingerTapIgnored:true,hudIgnored:true,movementAndSkill:true,released:true,rewardSkips:true,...result});await context.close();console.log(`Touch ${width}x${height} passed`);
 }
 if(process.env.SC2_QA_OFFLINE==='1'){
  const context=await browser.newContext({viewport:{width:1440,height:900},offline:true});const p=await context.newPage(),requests=[];p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await start(p,pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href);
  await p.mouse.click(950,470,{button:'right'});assert.equal((await order(p)).kind,'move');await p.waitForTimeout(250);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(100);await p.keyboard.up('ArrowLeft');assert.equal(await order(p),null);report.offline=await p.evaluate(()=>({debug:typeof window.__SC2_DEBUG__,report:window.__SC2_REPORT__()}));assert.equal(report.offline.debug,'undefined');assert.deepEqual(requests,[]);report.offline.networkRequests=requests;await p.screenshot({path:out+'/offline-file.png'});await context.close();console.log('Offline file:// command and keyboard takeover passed');
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
