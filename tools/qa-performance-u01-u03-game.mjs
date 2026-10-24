import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'game-1',revision=process.argv[3]??'r1',folder='performance-u01-u03-20261020-candidate-'+revision,root=path.resolve('reports/local/performance-u01-u03-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json')),checks:[],samples:[],screens:[],errors:[],requests:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const context=await chromium.launchPersistentContext(process.env.SC2_U01_PROFILE??root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];
page.setDefaultTimeout(90000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
const served=[];
page.on('response',r=>{if(/\/main\.(js|css)(?:\?|$)/.test(r.url()))served.push(r.body().then(bytes=>({url:r.url(),bytes:bytes.length,sha256:hash(bytes)})));});
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.__R03__&&window.U01,null,{timeout:180000});
 report.served=await Promise.all(served);assert.ok(report.served.some(r=>r.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256),'actual main.js binding');
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();for(;;){const s=await page.evaluate(()=>__B02__.readiness.state);console.log('Loading '+s.phase+' '+s.done+'/'+s.total);if(s.phase==='ready')break;if(s.phase==='error')throw Error(s.error);if(Date.now()-start>600000)throw Error('Loading timeout');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>{__B02__.freeze();__R03__.stop();__B02__.view.render(0,1);});
 await page.evaluate(()=>{
  const a=__R03__,w=a.world,h=a.hud,b=__B02__;a.draw();let hudCalls=0,notifies=0;const update=h.update.bind(h);
  h.update=()=>{hudCalls++;update();};w.listeners.add(()=>notifies++);
  const metrics=()=>({hudCalls,notifies});
  const dom=()=>{const copy=h.root.cloneNode(true);copy.querySelector('#production-detail')?.remove();return copy.innerHTML;};
  window.U01Game={a,w,h,b,metrics,dom,update,
   compareNotifications(n,batched){const before=metrics(),state=b.snapshot(),fn=()=>{for(let i=0;i<n;i++)w.changed();};
    if(batched)h.advanceSimulation(fn);else fn();
    return {n,batched,calls:hudCalls-before.hudCalls,notifications:notifies-before.notifies,dom:dom(),time:w.time,tick:w.tick};},
   measure(variant,n){const proto=U01[variant].HUD.prototype;for(let i=0;i<5;i++)proto.update.call(h);const at=performance.now();for(let i=0;i<n;i++)proto.update.call(h);return {variant,ms:(performance.now()-at)/n};},
  };
 });
 const old=await page.evaluate(()=>U01Game.compareNotifications(30,false)),cur=await page.evaluate(()=>U01Game.compareNotifications(30,true));
 assert.equal(old.calls,30);assert.equal(cur.calls,1);assert.equal(cur.notifications,30);assert.equal(cur.dom,old.dom);report.checks.push({name:'30-notifications',baseline:{...old,dom:hash(old.dom)},candidate:{...cur,dom:hash(cur.dom)}});await save();
 const native=await page.evaluate(()=>{const {w,h,b,metrics}=U01Game;w.paused=false;w.changed();const before={...metrics(),tick:w.tick,time:w.time};
  h.advanceSimulation(()=>{for(let i=0;i<12;i++)w.step();});
  return {calls:metrics().hudCalls-before.hudCalls,notifications:metrics().notifies-before.notifies,ticks:w.tick-before.tick,seconds:w.time-before.time,state:b.snapshot()};
 });
 assert.equal(native.ticks,12);assert.ok(native.notifications>=2);assert.equal(native.calls,1);
 report.checks.push({name:'12-native-fixed-steps',...native,state:hash(native.state)});await save();
 const rewards=await page.evaluate(()=>{const {w,h,metrics}=U01Game;
  const original=w.freePosition,random=w.random;w.random=()=>.5;
  const boss=w.spawnSpecial('zergling','boss',{x:w.anchor.x+10,z:w.anchor.z});w.hit(boss,1e9,[],1,'terran');w.random=random;
  const d=w.rewardDrops.find(d=>d.bossLootReceipt);if(!d)throw Error('No real boss drop');
  w.freePosition=()=>null;const before=metrics(),receipt=JSON.stringify(d),failed=[];
  h.advanceSimulation(()=>{for(let i=0;i<30;i++)failed.push(w.collectRewardDrop(d.id));});
  const result={failed,failCalls:metrics().hudCalls-before.hudCalls,failNotifications:metrics().notifies-before.notifies,retained:w.rewardDrops.includes(d),sameReceipt:receipt===JSON.stringify(d)};
  w.freePosition=original;result.retry=w.collectRewardDrop(d.id);result.claimed=w.expedition.bossLootClaimed.includes(d.bossLootReceipt);result.duplicate=w.collectRewardDrop(d.id);
  return result;});
 assert.ok(rewards.failed.every(x=>!x));assert.equal(rewards.failCalls,1);assert.equal(rewards.failNotifications,30);assert.ok(rewards.retained&&rewards.sameReceipt&&rewards.retry&&rewards.claimed&&!rewards.duplicate);report.checks.push({name:'blocked-real-boss-pickup',...rewards});await save();
 // Hidden details should stay untouched, then use current state immediately when exposed.
 const hidden=await page.evaluate(()=>{const {h}=U01Game,el=document.querySelector('#production-detail');el.innerHTML='sentinel';h.update();const kept=el.innerHTML==='sentinel';el.hidden=false;h.update();const shown=el.innerHTML;el.hidden=true;h.update();return {kept,shown};});
 assert.ok(hidden.kept&&hidden.shown!=='sentinel'&&hidden.shown.includes('span'));report.checks.push({name:'hidden-detail',...hidden});
 for(let round=0;round<8;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate'])report.samples.push({kind:'real-hud',round,...await page.evaluate(variant=>U01Game.measure(variant,40),variant)});
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const layoutBefore=(await cdp.send('Performance.getMetrics')).metrics;
 await page.evaluate(()=>{for(let i=0;i<100;i++)U01Game.h.squadConsole.update();});
 const layoutAfter=(await cdp.send('Performance.getMetrics')).metrics;
 report.nativeLayout=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration'].map(n=>[n,layoutAfter.find(v=>v.name===n).value-layoutBefore.find(v=>v.name===n).value]));
 await page.evaluate(()=>{U01Game.h.update();__R03__.draw();});await shot('battle-desktop');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(150);
  const result=await page.evaluate(()=>{const {h}=U01Game;h.update();__R03__.draw();const button=document.querySelector('[data-seat]');button?.focus();const before=document.activeElement;h.update();return {viewport:[innerWidth,innerHeight],focusRetained:document.activeElement===before,console:document.querySelector('#battle-console').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('#console-commands button')].filter(e=>e.getClientRects().length).length};});
  assert.ok(result.focusRetained);report.checks.push({name:'resize-focus',...result});await shot('battle-'+viewport.width+'x'+viewport.height);
 }
 await page.evaluate(()=>{const {w,h}=U01Game;w.paused=true;w.changed();});await shot('paused');
 // Native settings path and native close restore the pause state.
 await page.locator('#overlay [data-action=settings]:visible').click();await shot('settings');
 await page.keyboard.press('Escape');
 const paused=await page.evaluate(()=>({paused:U01Game.w.paused,settings:U01Game.h.settingsOpen}));assert.ok(paused.paused&&!paused.settings);report.checks.push({name:'settings-close',...paused});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>U01Game.w.paused),false);
 await page.evaluate(()=>{const {w}=U01Game;w.endStage();});await shot('intermission');
 await page.evaluate(()=>{const {h}=U01Game;h.intermission.push({page:'rest'});h.update();});await shot('rest');
 const skin=await page.evaluate(()=>({cards:document.querySelectorAll('.im-card').length,decorated:document.querySelectorAll('[data-imx-card]').length}));assert.ok(skin.cards>0&&skin.decorated===skin.cards);report.checks.push({name:'native-rest-cards',...skin});
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await shot('failure').catch(()=>{});process.exitCode=1;}finally{await save();await context.close();}
console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,screens:report.screens.length,errors:report.errors,requests:report.requests.length,failure:report.failure?.slice(0,500)}));
