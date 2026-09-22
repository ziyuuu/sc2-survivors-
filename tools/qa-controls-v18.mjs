import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='reports/local/qa-v18';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Local desktop Chrome with actual pointer/keyboard events, CDP multi-touch and mocked Gamepad API. Screenshots remain local. No physical phone/gamepad or manual visual sign-off.',runs:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function fixture(p,heroes=false){await p.evaluate(async heroes=>{
 const {world:w,view:v}=window.__SC2_DEBUG__;w.resetRun();w.autoWaves=false;w.eventPlan=[];w.buildings.clear();w.phase='battle';w.paused=true;w.wallet={minerals:0,gas:0};w.entities.clear();w.addUnit('marine','terran',0,0);w.addUnit('tank','terran',-2,1);w.upgrades.set('stim',1);
 if(heroes)for(const id of ['raynor','tychus','nova']){w.acquireHero(id);await v.ensureUnitVariant('hero.'+id,'marine');}
 for(const u of w.allies())u.hp=u.maxHp=10000;
 const e=w.addUnit('roach','zerg',4,1);e.hp=e.maxHp=1000000;e.moveSpeed=0;e.weaponDamage=0;e.weaponCooldown=100000;window.__foe=e.id;
 w.hash.rebuild(w.entities.values());w.paused=false;w.changed();
},heroes);await p.waitForTimeout(250);}
async function settings(p){if(await p.evaluate(()=>window.__SC2_REPORT__().phase==='battle'))await p.keyboard.press('Escape');await p.locator('[data-action=settings]').click();}
async function resume(p){await p.locator('[data-action=settings-back]').click();const paused=p.locator('#overlay [data-action=pause]');if(await paused.count())await paused.click();}
async function ground(p,point){return await p.evaluate(point=>window.__SC2_DEBUG__.view.screen(point),point);}
async function pressPad(p,button){await p.evaluate(button=>window.__pad.buttons[button].value=1,button);await p.waitForTimeout(140);await p.evaluate(button=>window.__pad.buttons[button].value=0,button);await p.waitForTimeout(140);}
try{for(const [width,height,touch] of [[1440,900,false],[390,844,true],[844,390,true]]){
 const c=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),p=await c.newPage();
 p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await p.addInitScript(()=>{window.__pad={id:'QA standard',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false,touched:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad]});});
 await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
 const run={width,height,touch,checks:[]};await p.locator('[data-action=settings]').click();await p.getByLabel('画质',{exact:true}).selectOption('balanced');await p.locator('[data-action=settings-back]').click();await p.locator('[data-action=start]').click();await fixture(p,true);
 if(!touch){
  const q=await ground(p,{x:8,z:0});await p.mouse.click(q.x,q.y,{button:'right'});let order=await p.evaluate(()=>window.__SC2_DEBUG__.world.order);assert.equal(order.kind,'move');assert.ok(Math.abs(order.point.x-8)<.5);
  await p.keyboard.down('KeyA');await p.waitForTimeout(180);assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.input),{x:0,z:0});await p.keyboard.up('KeyA');
  const e=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.cancelOrder();const e=w.entities.get(window.__foe);return window.__SC2_DEBUG__.view.screen(e);});await p.mouse.click(e.x,e.y);
  order=await p.evaluate(()=>window.__SC2_DEBUG__.world.order);assert.equal(order.kind,'move');assert.equal('targetId' in order,false);
  await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.entities.get(window.__foe).x=-15;});assert.deepEqual((await p.evaluate(()=>window.__SC2_DEBUG__.world.order)).point,order.point);
  run.checks.push('mouse buttons set a fixed destination, never focus; keyboard movement gated');
  await settings(p);const t=await p.evaluate(()=>window.__SC2_DEBUG__.world.time);await p.getByLabel('电脑移动').selectOption('keyboard');await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.time),t);await resume(p);
  const at=await ground(p,{x:8,z:0});await p.mouse.click(at.x,at.y,{button:'right'});assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.order),null);
  const start=await p.evaluate(()=>window.__SC2_DEBUG__.world.anchor.x);await p.keyboard.down('KeyD');await p.waitForTimeout(400);await p.keyboard.up('KeyD');assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.anchor.x)>start+.2);await p.waitForTimeout(100);const stop=await p.evaluate(()=>({...window.__SC2_DEBUG__.world.anchor}));await p.waitForTimeout(200);assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.anchor),stop);
  run.checks.push('keyboard mode moves, release holds anchor, click ignored; settings freeze combat');
 }else{
  const cdp=await c.newCDPSession(p),joy=await p.locator('#joystick').boundingBox(),dash=await p.locator('#dash').boundingBox();assert.ok(joy);
  const a={id:1,x:joy.x+joy.width/2,y:joy.y+joy.height/2},b={id:2,x:dash.x+dash.width/2,y:dash.y+dash.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+24}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,x:a.x+24},b]});await p.waitForTimeout(150);
  assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.input.x)>.1);assert.ok(await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return w.dashReady>w.time;}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:width-10,y:height/2},b]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(100);assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.input),{x:0,z:0});
  const q=await ground(p,{x:5,z:-1});await p.touchscreen.tap(q.x,q.y);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.order),null);
  run.checks.push('joystick + skill multi-touch, pointer escape/cancel release, tap ignored in joystick mode');
  await settings(p);await p.getByLabel('手机移动').selectOption('tap');await resume(p);assert.equal(await p.locator('#joystick').isVisible(),false);
  const q2=await ground(p,{x:7,z:0});await p.touchscreen.tap(q2.x,q2.y);assert.equal((await p.evaluate(()=>window.__SC2_DEBUG__.world.order)).kind,'move');
  await p.evaluate(()=>window.__SC2_DEBUG__.world.cancelOrder());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:q2.x,y:q2.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:q2.x+30,y:q2.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.order),null);
  run.checks.push('tap mode hides joystick and moves; drag does not issue a destination');
 }
 await fixture(p,true);await p.evaluate(()=>window.__pad.axes=[.45,0,0,0]);await p.waitForTimeout(180);assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.input.x)>.1);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.order),null);
 await p.evaluate(()=>window.__pad.axes=[0,0,0,0]);await p.waitForTimeout(80);const stopped=await p.evaluate(()=>({...window.__SC2_DEBUG__.world.anchor}));await p.waitForTimeout(200);assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.anchor),stopped);
 const ids=['dash','stim','siege','hero-raynor','hero-tychus','hero-nova'];
 for(let i=0;i<ids.length;i++){
  await p.evaluate(i=>{window.__pad.axes=[.22,0,Math.sin(i*Math.PI/3),-Math.cos(i*Math.PI/3)];},i);await p.waitForTimeout(160);assert.equal(await p.evaluate(()=>window.__SC2_REPORT__().gamepad.selectedSkill),ids[i]);
  const before=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {time:w.time,dash:w.dashReady,stim:w.allies()[0].stimUntil,tank:w.tankCommand,hero:Object.fromEntries([...w.heroes].map(([id,h])=>[id,h.skillReady]))};});
  await pressPad(p,i%2?2:0);const after=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {time:w.time,dash:w.dashReady,stim:w.allies()[0].stimUntil,tank:w.tankCommand,hero:Object.fromEntries([...w.heroes].map(([id,h])=>[id,h.skillReady])),input:w.input,order:w.order};});
  if(i===0)assert.ok(after.dash>before.dash);else if(i===1)assert.ok(after.stim>before.stim);else if(i===2)assert.notEqual(after.tank,before.tank);else assert.ok(after.hero[ids[i].slice(5)]>before.hero[ids[i].slice(5)],ids[i]);
  assert.ok(after.input.x>0);assert.equal(after.order,null);
 }
 await p.evaluate(()=>window.__pad.axes=[0,0,0,0]);await p.waitForTimeout(80);await p.screenshot({path:out+'/skills-'+width+'x'+height+'.png'});
 await pressPad(p,9);const ready=await p.evaluate(()=>window.__SC2_DEBUG__.world.heroes.get('nova').skillReady);await pressPad(p,12);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.heroes.get('nova').skillReady),ready);
 await p.locator('#overlay [data-action=pause]').click();await p.waitForTimeout(150);await p.evaluate(()=>window.__pad.axes=[.5,0,0,0]);await p.waitForTimeout(150);await p.evaluate(()=>window.__pad.connected=false);await p.waitForTimeout(150);assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.paused));assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.input),{x:0,z:0});
 run.checks.push('gamepad release never chases; all six right-stick sectors; A/X skills during left-stick movement; menus do not cast; disconnect stops and pauses');
 const preferences=await p.evaluate(()=>window.__SC2_REPORT__().controls);await p.locator('[data-action=restart]').click();assert.deepEqual(await p.evaluate(()=>window.__SC2_REPORT__().controls),preferences);
 await p.locator('[data-action=settings]').click();run.layout=await p.evaluate(()=>({scrollX,scrollY,selection:String(getSelection()),width:document.documentElement.scrollWidth,overlayScroll:document.querySelector('#overlay').scrollHeight,viewport:innerHeight,touchAction:getComputedStyle(document.querySelector('#battle')).touchAction,select:getComputedStyle(document.querySelector('#interface')).userSelect}));assert.equal(run.layout.selection,'');assert.ok(run.layout.width<=width);assert.equal(run.layout.touchAction,'none');assert.equal(run.layout.select,'none');await p.screenshot({path:out+'/settings-'+width+'x'+height+'.png'});
 run.checks.push('preferences survive redeploy; settings fit viewport, no document scroll or text selection');run.renderer=await p.evaluate(()=>window.__SC2_REPORT__());report.runs.push(run);console.log(JSON.stringify({width,height,checks:run.checks}));await c.close();
}assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/controls.json',JSON.stringify(report,null,2));await browser.close();}
