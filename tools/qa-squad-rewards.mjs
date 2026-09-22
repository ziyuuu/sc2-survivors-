import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const out='reports/local/qa-v13-squad-rewards';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Actual DOM mouse/touch actions in desktop Chrome, with explicit isolated World fixtures for reward/repair/deployment regressions. No bot victory, physical phone, physical gamepad or human visual approval.',errors:[],viewports:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function boot(p,url='http://127.0.0.1:5173/'){p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await p.goto(url);await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:150000});await p.getByRole('button',{name:/部署小队/}).click();}
async function fixture(p){await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.autoWaves=false;w.eventPlan=[];w.nextWave=Infinity;w.buildings.clear();w.pods=[];w.economicTargets.clear();w.entities.clear();w.rewardDrops=[];w.pickups=[];w.effects=[];w.phase='battle';w.paused=false;w.cancelOrder();w.stage=1;w.stageElapsed=0;w.anchor={x:0,z:0,facing:Math.PI/2};w.addUnit('marine','terran',0,0);w.wallet={minerals:5000,gas:5000};w.addBuilding('barracks',0);w.addBuilding('starport',0);w.endStage();});}
async function choose(p,id){await p.locator(`[data-action="reward"][data-id$="${id}"]`).click();}
try{
 for(const [width,height,touch] of [[1440,900,false],[390,844,true],[844,390,true]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),p=await c.newPage();await boot(p);
  if(!touch)report.icons=await p.evaluate(async()=>{const {ASSETS,assetUrl}=await import('/src/assets/manifest.ts');const ids=[...ASSETS.values()].filter(a=>a.kind==='icon').map(a=>a.id),decoded=[];for(const id of ids){const image=new Image();image.src=assetUrl(id);await image.decode();decoded.push({id,width:image.naturalWidth,height:image.naturalHeight});}return {expected:ids.length,decoded};});
  const opening=await p.evaluate(()=>({units:window.__SC2_DEBUG__.world.allies().length,seconds:window.__SC2_DEBUG__.world.duration,report:window.__SC2_REPORT__()}));assert.equal(opening.units,1);assert.equal(opening.seconds,60);
  await fixture(p);await p.locator('[data-action=skip]').click();
  await p.evaluate(async()=>{const {rewardPool}=await import('/src/simulation/progression/rewards.ts'),w=window.__SC2_DEBUG__.world;w.rewards=w.offers(['veteran.marine.3','veteran.marine.5','buff.weapon.orange'].map(id=>rewardPool(w).find(r=>r.id===id)));w.changed();});
  const time=await p.evaluate(()=>window.__SC2_DEBUG__.world.time);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.time),time);
  const cards=await p.locator('.reward-card').evaluateAll(es=>es.map(e=>({rarity:e.dataset.rarity,color:getComputedStyle(e).borderTopColor,name:e.querySelector('h3').textContent,disabled:e.disabled})));
  assert.deepEqual(cards.map(c=>c.rarity),['green','blue','orange']);assert.equal(new Set(cards.map(c=>c.color)).size,3);
  await p.screenshot({path:out+`/rarity-${width}x${height}.png`});await choose(p,'veteran.marine.3');await choose(p,'veteran.marine.5');
  const recruited=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {ranks:w.allies().map(u=>u.rank),pods:w.pods.length,time:w.time};});assert.deepEqual(recruited.ranks,[1,3,5]);assert.equal(recruited.pods,0);assert.equal(recruited.time,time);
  await p.locator('[data-action=reroll]').click();assert.match(await p.locator('[data-action=reroll]').innerText(),/90/);assert.equal(await p.locator('.reward-card').count(),3);
  await p.evaluate(async()=>{const {rewardPool}=await import('/src/simulation/progression/rewards.ts'),w=window.__SC2_DEBUG__.world;w.rewards=w.offers([rewardPool(w).find(r=>r.id==='tech.mechanicalHeal')]);w.changed();});await choose(p,'tech.mechanicalHeal');assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.upgrades.has('mechanicalHeal')),true);
  await p.locator('[data-action=skip]').click();
  await p.evaluate(async()=>{const {rewardPool}=await import('/src/simulation/progression/rewards.ts'),w=window.__SC2_DEBUG__.world;w.buildings.clear();w.pods=[];w.eventPlan=[];const m=w.addUnit('medivac','terran',1,1);window.__qaMedivac=m.id;window.__repairStarted=w.time;const t=w.addUnit('tank','terran',2,0);t.hp=20;window.__qaTank=t.id;w.rewardDrops.push({id:99000,x:3.5,z:-1,reward:rewardPool(w).find(r=>r.id==='buff.weapon.purple')});w.changed();});
  await p.waitForFunction(()=>window.__SC2_DEBUG__.world.entities.get(window.__qaTank).hp>20,null,{timeout:10000});const repair=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {hp:w.entities.get(window.__qaTank).hp,energy:w.entities.get(window.__qaMedivac).energy,simulationSeconds:w.time-window.__repairStarted};});assert.ok(repair.hp>20);assert.ok(repair.energy<50);assert.equal(await p.locator('.loot-world-label[data-rarity=purple]').count(),1);
  const pos=await p.evaluate(()=>window.__SC2_DEBUG__.view.screen({x:3.5,z:-1}));assert.equal(await p.evaluate(pos=>document.elementFromPoint(pos.x,pos.y)?.id,pos),'battle');if(touch)await p.touchscreen.tap(pos.x,pos.y);else await p.mouse.click(pos.x,pos.y,{button:'right'});
  await p.waitForFunction(()=>window.__SC2_DEBUG__.world.upgrades.has('buff.weapon'),null,{timeout:12000});assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.rewardDrops.length),0);
  if(touch){
   const cdp=await c.newCDPSession(p),joy=await p.locator('#joystick').boundingBox(),siege=await p.locator('#siege').boundingBox();const a={id:1,x:joy.x+joy.width*.5,y:joy.y+joy.height*.5},b={id:2,x:siege.x+siege.width*.5,y:siege.y+siege.height*.5};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+25}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,x:a.x+25},b]});await p.waitForTimeout(180);
   assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.tankCommand),'siege');assert.ok(await p.evaluate(()=>window.__SC2_DEBUG__.world.input.x)>.1);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(100);assert.deepEqual(await p.evaluate(()=>window.__SC2_DEBUG__.world.input),{x:0,z:0});
  }
  const layout=await p.evaluate(()=>({scroll:[scrollX,scrollY],selection:String(getSelection()),scrollWidth:document.documentElement.scrollWidth,renderer:window.__SC2_REPORT__()}));assert.deepEqual(layout.scroll,[0,0]);assert.equal(layout.selection,'');assert.ok(layout.scrollWidth<=width);assert.deepEqual(layout.renderer.errors,[]);await p.screenshot({path:out+`/battle-${width}x${height}.png`});
  report.viewports.push({width,height,touch,opening,cards,recruited,mechanicalRepair:repair,mapRewardCollected:true,multitouch:touch,...layout});await c.close();console.log(`${width}x${height}: reward purchase, rarity, repair, pickup and input passed`);
 }
 if(process.env.SC2_QA_OFFLINE==='1'){
  const c=await browser.newContext({viewport:{width:1440,height:900},offline:true}),p=await c.newPage(),requests=[];p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await boot(p,pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href);await p.mouse.click(950,470,{button:'right'});await p.waitForTimeout(600);report.offline={requests,debug:await p.evaluate(()=>typeof window.__SC2_DEBUG__),runtime:await p.evaluate(()=>window.__SC2_REPORT__())};assert.deepEqual(requests,[]);assert.equal(report.offline.debug,'undefined');assert.equal(report.offline.runtime.models,8);assert.deepEqual(report.offline.runtime.errors,[]);await p.screenshot({path:out+'/offline-file.png'});await c.close();console.log('Offline file:// launch and commands passed');
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);console.error(report.failure);process.exitCode=1;}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
