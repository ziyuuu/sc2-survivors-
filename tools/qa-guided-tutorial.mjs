import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveTutorial} from './serve-tutorial-candidate.mjs';
const race=process.argv[2]??'terran',record=process.argv.includes('--record'),fast=process.argv.includes('--fast')&&!record,stopAt=process.argv.find(a=>a.startsWith('--stop='))?.slice(7);
const size=race==='zerg'?{width:844,height:390}:race==='protoss'?{width:390,height:844}:{width:1440,height:900},touch=race!=='terran';
const fixture=process.argv.find(a=>a.startsWith('--fixture='))?.slice(10);if(record&&fixture)throw Error('Recordings must start fresh');
const out=`reports/local/tutorial-20261105/guided-${record?'recordings':fixture?'recovery':'browser'}/${race}`;await fs.mkdir(out,{recursive:true});
const server=await serveTutorial({port:0,diagnostic:true}),origin='http://127.0.0.1:'+server.address().port;
const report={build:JSON.parse(await fs.readFile('reports/local/tutorial-20261105/browser/build.json','utf8')),race,size,touch,physicalPhone:false,record,assistance:fast?'Native highlighted clicks; bounded native fixed-step time compression for functional QA only. No damage/HP changes.':'Native highlighted clicks and ordinary real-time game clock only. No damage/HP/advance injection.',clicks:[],errors:[],passed:false};
let browser,context,page,video;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling','--autoplay-policy=no-user-gesture-required']});
 context=await browser.newContext({viewport:size,deviceScaleFactor:1,isMobile:touch,hasTouch:touch,...(record?{recordVideo:{dir:out,size}}:{})});
 await context.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1})));
 page=await context.newPage();video=page.video();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(origin+'/qa.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>globalThis.__TUTORIAL_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 const click=async a=>page.locator(`[data-action="${a}"]:visible`).first().click();
 if(!fixture){await click('menu-new');await page.locator(`[data-action="menu-race"][data-race="${race}"]`).click();await click('menu-race-next');await click('menu-difficulty-next');await click('menu-start');
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__TUTORIAL_APP__.readiness.state.phase),null,{timeout:240000});assert.equal(await page.evaluate(()=>globalThis.__TUTORIAL_APP__.readiness.state.phase),'ready');await click('flow-continue');}
 else{const raw=await fs.readFile(fixture,'utf8');await page.evaluate(async raw=>{const a=globalThis.__TUTORIAL_APP__;a.session.importJSON(raw);await a.session.saveNow();},raw);report.fixture=fixture;}
 await page.waitForSelector('.tutorial-comms:not([hidden])');
 await page.waitForFunction(()=>document.querySelector('.tutorial-comms img')?.naturalWidth>0);
 await page.screenshot({path:out+'/invitation.png'});
 if(record)report.audio=await page.evaluate(()=>{const audio=globalThis.__TUTORIAL_APP__.hud.audio,c=audio?.context,bus=audio?.masterBus;if(!c||!bus)return {captured:false};const dest=c.createMediaStreamDestination();bus.connect(dest);const chunks=[],rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus'});globalThis.__TUTORIAL_AUDIO__={rec,chunks,bus,dest,start:Date.now()};rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.start(1000);return {captured:true,start:Date.now(),source:'game master bus only'};});
 if(!fixture)await page.locator('[data-tutorial=accept]').click();
 let clicked='',last='',lastAt=Date.now(),clickedAt=0;const retries={};
 for(let iteration=0;iteration<1600;iteration++){
  const state=await page.evaluate(()=>{const {world:w,session:s,readiness:r,hud}=globalThis.__TUTORIAL_APP__,a=w.starship.account.tutorial,g=w.expedition.tutorial?.guided,root=document.querySelector('.tutorial-comms');return {status:a?.status,step:a?.tail?.step??g?.step,mode:a?.tail?'tail':g?.phase,phase:w.phase,stage:w.stage,time:w.stageElapsed,wallet:{...w.wallet},busy:s.busy,saveFailed:s.saveFailed,ready:r.state.kind,readiness:r.state.phase,pendingAdvance:hud.pendingStageAdvance,round:w.rewardRound,claimed:w.rewardClaimed,text:root?.querySelector('p')?.textContent,visible:root&&!root.hidden,highlight:[...document.querySelectorAll('.tutorial-highlight')].filter(e=>e.getClientRects().length).length,mark:!!document.querySelector('.tutorial-mark.is-actionable:not([hidden])'),jobs:w.expedition.ledger.map(j=>({id:j.id,state:j.state,pod:j.podId})),panel:hud.tutorialBuildingDraft()};});
  if(state.status==='completed'){report.finalState=state;break;}
  if(state.phase==='lost'||state.saveFailed)throw Error('Native defeat/save failure: '+JSON.stringify(state));
  if(state.step!==last){last=state.step;lastAt=Date.now();console.log(JSON.stringify({race,step:last,mode:state.mode,phase:state.phase,wallet:state.wallet}));}
  if(Date.now()-lastAt>(state.mode==='running'?100000:15000))throw Error('Step stalled: '+JSON.stringify(state));
  if(fast&&clicked===`${state.step}:${state.mode}`&&state.mode==='waiting'&&Date.now()-clickedAt>1200&&(retries[state.step]??0)<2){retries[state.step]=(retries[state.step]??0)+1;clicked='';}
  if(state.step===stopAt){report.stopped=state;break;}
  if(state.visible&&!state.busy&&!state.ready&&clicked!==`${state.step}:${state.mode}`&&(state.mode==='waiting'||state.mode==='tail')){
   const target=page.locator('.tutorial-highlight:visible').first(),marker=page.locator('.tutorial-mark.is-actionable:not([hidden]):not(:disabled)');
   if(await target.count()||await marker.count()){
    if(record)await page.waitForTimeout(1300);else await page.waitForTimeout(180);
    const chosen=await target.count()?target:marker;
    await chosen.scrollIntoViewIfNeeded();
    const box=await chosen.boundingBox();assert.ok(box,'Target has bounds');
    const hit=await chosen.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);const root=document.querySelector('.tutorial-comms'),p=root.querySelector('p'),style=getComputedStyle(p),box=root.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(p);const lineCount=new Set([...range.getClientRects()].map(r=>Math.round(r.top))).size;const hidden=root.hidden;root.hidden=true;const without=e.getBoundingClientRect();root.hidden=hidden;return {hit:e===hit||e.contains(hit),tag:hit?.outerHTML.slice(0,200),unmoved:Math.abs(r.x-without.x)<.1&&Math.abs(r.y-without.y)<.1&&Math.abs(r.width-without.width)<.1&&Math.abs(r.height-without.height)<.1,comms:{top:box.top,right:innerWidth-box.right,width:box.width,height:box.height,font:parseFloat(style.fontSize),lines:lineCount}};});assert.ok(hit.hit,'Target obscured: '+JSON.stringify(hit));assert.ok(hit.unmoved,'Tutorial reflowed native control');assert.ok(Math.abs(hit.comms.top-4)<1);assert.ok(Math.abs(hit.comms.right-(touch?8:12))<1);if(race==='protoss'){assert.equal(hit.comms.font,12);assert.ok(hit.comms.lines<=2.05,'Portrait subtitle exceeds two lines');}
    if(['build','system','equip-1','equip-3','module','install','train-1'].includes(state.step))await page.screenshot({path:out+'/'+state.step+'.png'});
    report.clicks.push({...state,timestamp:Date.now(),box,presentation:hit.comms,originalControlUnmoved:hit.unmoved});clicked=`${state.step}:${state.mode}`;clickedAt=Date.now();
    if(touch)await chosen.tap();else await chosen.click();
   }
  }
  if(fast)await page.evaluate(()=>{const w=globalThis.__TUTORIAL_APP__.world;if(w.expedition.tutorial?.guided?.phase==='running')w.advance(2);});await page.waitForTimeout(fast?120:350);
 }
 if(!stopAt){assert.equal(report.finalState?.status,'completed');assert.equal(report.finalState.wallet.minerals,race==='protoss'?50:375);assert.equal(report.finalState.wallet.gas,200);assert.equal(await page.locator('.tutorial-comms:visible').count(),0);}
 assert.deepEqual(report.errors,[]);if(!stopAt){await page.evaluate(()=>globalThis.__TUTORIAL_APP__.session.saveNow());await fs.writeFile(out+'/completed-save.json',await page.evaluate(()=>globalThis.__TUTORIAL_APP__.session.exportJSON()));}report.retries=retries;report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error);report.finalState=await page?.evaluate(()=>{const {world:w,session:s}=globalThis.__TUTORIAL_APP__;return {phase:w.phase,save:s.report(),tutorial:w.starship.account.tutorial,run:w.expedition.tutorial,actions:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>({a:e.dataset.action,act:e.dataset.act,id:e.dataset.id,facility:e.dataset.facility,disabled:e.disabled,text:e.textContent}))};}).catch(()=>null);if(page)await fs.writeFile(out+'/fixture-save.json',await page.evaluate(()=>globalThis.__TUTORIAL_APP__?.session.exportJSON()??'').catch(()=>''));await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{
 if(record&&page)try{const data=await page.evaluate(async()=>{const a=globalThis.__TUTORIAL_AUDIO__;if(!a)return null;await new Promise(r=>{a.rec.onstop=r;a.rec.stop();});a.bus.disconnect(a.dest);const blob=new Blob(a.chunks,{type:'audio/webm'}),bytes=new Uint8Array(await blob.arrayBuffer());let b='';for(let i=0;i<bytes.length;i+=32768)b+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(b);});if(data)await fs.writeFile(out+'/game-audio.webm',Buffer.from(data,'base64'));}catch(e){report.audioError=String(e);}
 await context?.close();if(video){await video.saveAs(out+'/screen.webm');await video.delete();}await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({race,passed:report.passed,clicks:report.clicks.length,failure:report.failure}));
}
