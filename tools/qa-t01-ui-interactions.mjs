import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

const run=process.argv[2],selection=process.argv[3];assert.match(run,/^ui-interactions-r\d+$/);
const root=path.resolve('reports/local/t01-20261024/'+run);await fs.mkdir(root,{recursive:false});
const profile=path.join(os.tmpdir(),'codex-t01-20261024',run);await fs.mkdir(profile,{recursive:true});
const server=await serveT01(process.argv[4]?{buildPath:process.argv[4]}:{}),report={run,scope:'Per-display mouse-wheel/keyboard and emulated touch inspection. Controlled memory-only account; native transactions, when selected, are recorded independently. Not a physical-device claim.',build:server.build,rows:[],errors:[]};
report.profilePath=profile;
let browser,child,heartbeat;const save=async()=>{const temporary=root+'/report-next.json';await fs.writeFile(temporary,JSON.stringify(report,null,2));await fs.rename(temporary,root+'/report.json');};
try{
 await fs.copyFile(new URL(import.meta.url),root+'/runner.mjs');
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],page=context.pages()[0],cdp=await context.newCDPSession(page);page.on('pageerror',e=>report.errors.push(e.message));
 report.foreground={scope:'CDP foreground emulation for UI capture in a hidden test window; not native OS focus or performance acceptance.',before:await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus()}))};
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await page.goto(server.url+'/static.html');report.foreground.after=await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus()}));await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});let cases=await page.evaluate(()=>T01.cases);
 if(selection){const ids=new Set(JSON.parse(await fs.readFile(selection,'utf8')));cases=cases.filter(c=>ids.has(c.id));report.selection=selection;}
 heartbeat=setInterval(()=>console.log(JSON.stringify({done:report.rows.filter(r=>r.status!=='running').length,total:cases.length,current:report.rows.at(-1)?.id})),25000);
 for(const [index,c] of cases.entries()){
  const row={id:c.id,status:'running',viewports:[]};report.rows.push(row);const prefix=String(index+1).padStart(3,'0');
  try{const errorStart=report.errors.length;
   for(const [width,height,touch]of [[1440,900,false],[844,390,false],[390,844,true]]){
    await page.setViewportSize({width,height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:1});await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>T01.capture(true));await settle(page);
    const v={width,height,input:touch?'emulated-touch':'mouse-keyboard',scrolls:[],screens:[],focus:[]};row.viewports.push(v);assert.equal((await state(page)).memoryOnly,true);
    const shot=async label=>{const file=`${prefix}-${width}-${label}.jpg`;await page.screenshot({path:root+'/'+file,type:'jpeg',quality:92});v.screens.push(file);};
    // A prior viewport or focused control can retain scroll/hover state. Start
    // each display's visual record at the top without changing game fixtures.
    await page.mouse.move(0,0);await page.evaluate(()=>{
     if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
     for(const e of document.querySelectorAll('*'))if(e instanceof HTMLElement&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=0;
    });await settle(page);
    v.initialPresentation=await page.evaluate(()=>{const e=document.querySelector('#topbar');return {phase:document.body.dataset.uiPhase,topbarDisplay:e?getComputedStyle(e).display:null,levelBadges:[...document.querySelectorAll('.imx-badges b')].filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.textContent,font:getComputedStyle(e).font,rect:e.getBoundingClientRect().toJSON()}))};});
    await shot('initial');
    if(c.action==='decision'&&c.target==='receipt-detail'){
     v.receiptExpanded=await page.locator('.family-receipt details').evaluate(e=>e.open);assert.equal(v.receiptExpanded,true,'Receipt detail expected to stay expanded after loading');
    }
    const active=await page.evaluate(()=>{
     document.querySelectorAll('[data-t01-scroll],[data-t01-root]').forEach(e=>{delete e.dataset.t01Scroll;delete e.dataset.t01Root;});
     const visible=e=>{if(!e||!e.getBoundingClientRect().width||!e.getBoundingClientRect().height)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(p.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}return true;};
     const last=selector=>[...document.querySelectorAll(selector)].filter(visible).at(-1);
     const root=last('dialog[open]')??last('#native-starship')??last('#overlay .modal-window')??last('#unit-inspector,#carrier-inspector')??last('#overlay')??document.querySelector('#interface');
     if(!root)throw Error('Active interaction surface absent');root.dataset.t01Root='active';
     const scrolls=[root,...root.querySelectorAll('*')].filter(e=>visible(e)&&e.clientHeight>20&&e.scrollHeight>e.clientHeight+3&&/auto|scroll/.test(getComputedStyle(e).overflowY)).map((e,i)=>{e.dataset.t01Scroll=String(i);return {key:String(i),tag:e.tagName,classes:e.className,height:e.clientHeight,full:e.scrollHeight};});
     return {root:{tag:root.tagName,id:root.id,classes:root.className},scrolls};
    });v.activeRoot=active.root;const scrolls=active.scrolls;
    for(const item of scrolls){
     const locator=page.locator(`[data-t01-scroll="${item.key}"]`);await locator.scrollIntoViewIfNeeded();await locator.evaluate(e=>e.scrollTop=0);const s={...item,steps:[],status:'running'};v.scrolls.push(s);
     for(let step=0;step<100;step++){
      const before=await locator.evaluate((e,touch)=>{
       const r=e.getBoundingClientRect();let l=Math.max(0,r.left+e.clientLeft),top=Math.max(0,r.top+e.clientTop),right=Math.min(innerWidth,r.left+e.clientLeft+e.clientWidth),bottom=Math.min(innerHeight,r.top+e.clientTop+e.clientHeight);
       for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}if(/auto|scroll|hidden|clip/.test(s.overflowX)){l=Math.max(l,b.left);right=Math.min(right,b.right);}}
       const receiver=(x,y)=>{for(let p=document.elementFromPoint(x,y);p;p=p.parentElement)if(p.scrollHeight>p.clientHeight+3&&/auto|scroll/.test(getComputedStyle(p).overflowY))return p;return null;};
       const visibleHeight=bottom-top;let hit;
       // Parent scrolling must not be aimed through a nested scroller: it may
       // correctly consume/contain the wheel or touch gesture itself.
       // Scrollbars can report the owning scroller in elementFromPoint while
       // consuming touch differently. Use its client box and allow a shorter
       // gesture through a visible header/margin around a nested inspector.
       outer:for(const ratio of [.5,.25,.12])for(const fx of [.08,.92,.2,.8,.5,.03,.97,.01,.99]){for(const fy of [.5,.65,.35,.15,.85]){
        const dy=Math.min(300,visibleHeight*ratio);
        const x=l+(right-l)*fx,y=top+visibleHeight*fy,start=y+dy/2,end=y-dy/2;
        if(receiver(x,y)!==e||touch&&(start>=bottom-3||end<=top+3||receiver(x,start)!==e||receiver(x,end)!==e))continue;
        hit={x,y,start,end};break outer;
       }}
       return {top:e.scrollTop,max:e.scrollHeight-e.clientHeight,visibleHeight,hit,receiver:hit?{tag:e.tagName,classes:e.className}:null};
      },touch);
      if(before.top>=before.max-2){s.status='reached-bottom';break;}
      if(before.visibleHeight<30){s.status='requires-parent-scroll';break;}
      if(!before.hit){s.status='no-direct-input-region';break;}
      const {x,y,start,end}=before.hit;
      if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});for(let k=1;k<=8;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*k/8}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else {await page.mouse.move(x,y);await page.mouse.wheel(0,Math.max(80,item.height*.75));}
      await page.waitForTimeout(180);const after=await locator.evaluate(e=>e.scrollTop);s.steps.push({before:before.top,after,input:before.hit,receiver:before.receiver});await shot(`scroll-${item.key}-${step}`);if(after<=before.top+.5){s.status='input-did-not-scroll';break;}
     }
     if(s.status==='running')s.status='step-limit';
    }
    // Capture real hover/focus on an actionable production control. This is
    // deliberately per display, not an assertion that every control was used.
    const surface=page.locator('[data-t01-root="active"]');
    const summaries=surface.locator('[data-act="detail"]:visible:enabled,[data-act="slot"]:visible:enabled');
    const controls=await summaries.count()?summaries:surface.locator('button:visible:enabled,summary:visible,input:visible:enabled,select:visible:enabled');
    if(await controls.count()){
     const first=controls.first();await first.scrollIntoViewIfNeeded();if(!touch){await first.hover();await shot('hover');await first.focus();for(let n=0;n<3;n++){v.focus.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim().slice(0,160),visible:document.activeElement?.matches(':focus-visible')})));await page.keyboard.press('Tab');}await shot('focus');}
     else await shot('touch-end');
    }else await shot('no-control');
    v.after=await state(page);
    const action=actionFor(c);
    if(action){
     const button=page.locator(action.selector).first();assert.equal(await button.isEnabled(),true,'Expected enabled native action');await button.scrollIntoViewIfNeeded();const before=await state(page);
     if(touch){const b=await button.boundingBox();assert.ok(b);const x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await button.click();
     await page.waitForTimeout(1550);await settle(page);const after=await state(page);v.transaction={kind:action.kind,before,after};checkAction(action.kind,before,after);await shot('transaction');
    }
    v.status=v.scrolls.some(s=>s.status!=='reached-bottom')?'needs-review':'captured';
   }
   assert.equal(report.errors.length,errorStart,'Page error during display interaction');row.status=row.viewports.some(v=>v.status==='needs-review')?'needs-review':'captured';
  }catch(e){row.status='failed';row.failure=String(e);await page.screenshot({path:root+'/'+prefix+'-failed.png'}).catch(()=>{});}
  await page.evaluate(()=>T01.capture(false));await save();
 }
 report.complete=true;
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{clearInterval(heartbeat);if(browser){const session=await browser.newBrowserCDPSession();await session.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({rows:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,failure:report.failure}));}
async function settle(page){await page.evaluate(async()=>{const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await frames();await Promise.race([Promise.allSettled(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished)),new Promise(r=>setTimeout(r,1500))]);await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width&&i.getBoundingClientRect().height).map(i=>i.decode().catch(()=>{})));await frames();});}
async function state(page){return page.evaluate(()=>{const w=T01.app.world,a=w.starship.account;return {memoryOnly:T01.app.session.memoryOnly,fixture:T01.staticRuntime.snapshot(),wallet:{...w.wallet},allies:w.allies().map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp,hero:u.heroId})),heroes:[...w.heroes].map(([id,h])=>({id,revivePaid:h.revivePaid,awaitingSpawn:h.awaitingSpawn})),contracts:w.expedition.eliteContracts.map(c=>({id:c.id,purchased:c.purchased})),gear:{count:Object.keys(a.items).length,dust:a.dust,warehouseLevel:a.warehouseLevel,modification:a.modification??null,revision:a.revision,managementRevision:T01.app.session.management.revision},overflow:document.documentElement.scrollWidth>innerWidth+1};});}
function actionFor(c){
 if(c.action==='rest'&&['injured','repair-detail'].includes(c.target))return {kind:'repair',selector:(c.target==='repair-detail'?'.detail-modal ':'')+'[data-action="repair-all"][data-family=""]:visible:enabled'};
 if(c.action==='rest'&&c.target==='hero-dead')return {kind:'revive',selector:'[data-action="revive"]:visible:enabled'};
 if(c.action==='contracts'&&c.target==='detail')return {kind:'contract',selector:'[data-action="elite-contract"]:visible:enabled'};
 if(c.action==='ship-operation'){
  if(['dismantle-confirm','discard-confirm','expand-confirm','preset-save','preset-apply','reroll-affix-confirm','reroll-elite-confirm'].includes(c.target))return {kind:c.target,selector:'#native-starship [data-act="confirm"]:visible:enabled'};
  if(c.target.endsWith('-choice'))return {kind:'reroll-choice',selector:'#native-starship [data-act="reroll-finish"][data-index="0"]:visible:enabled'};
 }
 return null;
}
function checkAction(kind,before,after){
 assert.equal(after.memoryOnly,true);
 if(kind==='repair'){assert.ok(after.allies.reduce((s,u)=>s+u.hp,0)>before.allies.reduce((s,u)=>s+u.hp,0));assert.ok(after.allies.every(u=>Math.abs(u.hp-u.maxHp)<1e-7));assert.ok(after.wallet.minerals<before.wallet.minerals||after.wallet.gas<before.wallet.gas);}
 else if(kind==='revive')assert.ok(after.heroes.some(h=>h.revivePaid||h.awaitingSpawn));
 else if(kind==='contract')assert.ok(after.contracts.filter(c=>c.purchased).length>before.contracts.filter(c=>c.purchased).length);
 else if(kind==='discard-confirm'||kind==='dismantle-confirm')assert.ok(after.gear.count<before.gear.count);
 else if(kind==='expand-confirm')assert.equal(after.gear.warehouseLevel,before.gear.warehouseLevel+1);
 else if(kind.startsWith('preset-'))assert.ok(after.gear.managementRevision>before.gear.managementRevision||after.gear.revision>before.gear.revision);
 else if(kind==='reroll-choice')assert.equal(after.gear.modification,null);
 else if(kind.startsWith('reroll-'))assert.ok(after.gear.modification);
}
