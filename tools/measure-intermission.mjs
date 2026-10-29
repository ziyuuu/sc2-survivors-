/** Bounded deterministic gates, not a natural campaign or physical phone test. */
import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const label=process.argv[2]??'baseline',output='reports/local/intermission-20261029';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
 Object.defineProperty(navigator,'deviceMemory',{get:()=>undefined});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>6});
 const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=b=>b instanceof Uint32Array&&b.length===1?(b[0]=529,b):random(b);
 localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));
});
const page=await context.newPage(),errors=[],requests=[],rows=[],checks={};page.setDefaultTimeout(180000);
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/')&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
const click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
try{
 await page.goto('http://127.0.0.1:18890/'+label+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>globalThis.__INTERMISSION_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:300000});console.log(label+' menu ready');
 await page.evaluate(()=>{const w=globalThis.__INTERMISSION_APP__.world;w.listeners.add(()=>{if(w.phase==='battle')w.paused=true;});});
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(action);
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:600000});assert.equal(await page.evaluate(()=>globalThis.__SC2_REPORT__().readiness.phase),'ready');await click('flow-continue');
 await page.evaluate(async()=>{
  const a=globalThis.__INTERMISSION_APP__;a.background=a.readiness.background;a.world.endStage();a.world.paused=true;a.background.tick=()=>{};const leave=await a.background.enter();leave();
  globalThis.__GATE_ON_READY__=a.readiness.onReady;a.readiness.onReady=()=>{};const events=[];globalThis.__GATE_EVENTS__=events;
  const wrap=(object,key,prefix='')=>{const original=object[key];if(typeof original!=='function')throw Error(key);object[key]=function(...args){const event={key:prefix+key,start:performance.now()};const end=()=>{event.ms=performance.now()-event.start;events.push(event);};try{const value=original.apply(this,args);if(value?.then)return value.then(result=>{event.result=typeof result==='number'?result:undefined;end();return result;},e=>{event.error=String(e);end();throw e;});end();return value;}catch(e){event.error=String(e);end();throw e;}};};
  for(const key of ['prepareCurrentAssets','prepareRescueAssets','prepareMissionAssets','prepareCommonAssets','warmCommonMeshes','compilePresentation','warmPresentationBatches','warmLightingFrame','waitForGpu','waitForPendingAssets'])wrap(a.view,key);
  wrap(a.readiness.audio,'prepareBanks');wrap(a.readiness.audio.context,'decodeAudioData');wrap(a.background,'prepareStage');wrap(a.background,'enter');wrap(a.view.renderer.getContext(),'finish','gl.');
 });
 for(const scenario of ['campaign','endless']){
  if(scenario==='endless'){
   await page.evaluate(async()=>{const a=globalThis.__INTERMISSION_APP__,w=a.world;if(!w.skipReward()||!w.skipReward())throw Error('Prior reward fixture unfinished');w.stage=18;w.prepareStage();w.hive.hp=0;w.phase='won';if(!w.chooseCampaignExit('endless')||!w.skipReward()||!w.skipReward())throw Error('Endless fixture failed');if(!await a.readiness.prepare('endless'))throw Error(a.readiness.state.error);a.hud.onCommitFlow();});
   await page.waitForFunction(()=>globalThis.__INTERMISSION_APP__.world.endless&&globalThis.__INTERMISSION_APP__.readiness.state.kind===null);
   await page.evaluate(()=>{const a=globalThis.__INTERMISSION_APP__;a.world.endless.round=16;a.world.endStage();a.world.paused=true;});console.log(label+' endless boundary ready');
  }
  for(const tag of ['first','repeat-1','repeat-2','repeat-3']){
   const n=requests.length,row=await page.evaluate(async({scenario,tag})=>{
    const a=globalThis.__INTERMISSION_APP__,v=a.view,w=a.world,r=a.readiness,events=globalThis.__GATE_EVENTS__;events.length=0;
    const before=JSON.stringify(w.captureRun()),models=[...v.gpu.keys()],started=performance.now();let visible=false;
    const change=r.onChange;r.onChange=()=>{visible||=r.showLoading&&r.blocking;change();};const ok=await r.prepare('reinforcement',{stageAdvance:true}),ms=performance.now()-started;r.onChange=change;
    const row={scenario,tag,ok,ms,visible,error:r.state.error,unchanged:before===JSON.stringify(w.captureRun()),stage:w.stage,round:w.endless?.round,seed:w.runConfig?.seed,offers:w.rewards.map(r=>r.value),newModels:[...v.gpu.keys()].filter(k=>!models.includes(k)),models:v.gpu.size,programs:v.renderer.info.programs.length,textures:v.renderer.info.memory.textures,audio:{pcmBytes:r.audio.pcmBytes(),budget:r.audio.report().pcmBudget,decoded:r.audio.buffers.size,errors:r.audio.decodeErrors.slice()},stageWindow:a.background.report().stageWindow,events:events.slice(),modelErrors:v.modelErrors.slice()};r.cancel();return row;
   },{scenario,tag});
   row.requests=requests.slice(n);rows.push(row);console.log(JSON.stringify({scenario,tag,ms:row.ms,audioMs:row.events.find(e=>e.key==='prepareBanks')?.ms,decodes:row.events.filter(e=>e.key==='decodeAudioData').length,requests:row.requests.length,pcmBytes:row.audio.pcmBytes,visible:row.visible,stageWindow:row.stageWindow}));assert(row.ok&&row.unchanged&&!row.modelErrors.length&&!row.audio.errors.length);
  }
 }
 // Deliberately evict one valid original clip, then exercise the actual native
 // playback fallback. This is not included in the gate timing measurements.
 await page.evaluate(async()=>{const audio=globalThis.__INTERMISSION_APP__.readiness.audio,bank='melee:Marine_AttackLaunch',id=audio.native.previewAssets(bank)[0];await audio.context.resume();await audio.ensureDecoded(id);audio.buffers.delete(id);globalThis.__AUDIO_UPDATE__=audio.update;audio.update=()=>{};globalThis.__ON_DEMAND__={bank,id,before:audio.native.played.get(bank)??0};audio.native.play({bank,priority:4},false,{asset:id});});
 await page.waitForFunction(()=>{const a=globalThis.__INTERMISSION_APP__.readiness.audio,d=globalThis.__ON_DEMAND__;return (a.native.played.get(d.bank)??0)>d.before;});
 checks.onDemand=await page.evaluate(()=>{const a=globalThis.__INTERMISSION_APP__.readiness.audio,d=globalThis.__ON_DEMAND__,result={played:(a.native.played.get(d.bank)??0)-d.before,bufferRestored:a.buffers.has(d.id),errors:a.decodeErrors.slice()};a.native.reset();a.update=globalThis.__AUDIO_UPDATE__;return result;});assert.equal(checks.onDemand.played,1);assert(checks.onDemand.bufferRestored);assert.deepEqual(checks.onDemand.errors,[]);
 // Let the normal HUD readiness callback own checkpoint/commit once.
 await page.evaluate(()=>{const a=globalThis.__INTERMISSION_APP__;a.readiness.onReady=globalThis.__GATE_ON_READY__;a.hud.update();});
 if(await page.evaluate(()=>globalThis.__INTERMISSION_APP__.world.rewardRound==='building'))await click('skip');
 await click('skip');await page.waitForFunction(()=>globalThis.__INTERMISSION_APP__.world.phase==='battle'&&globalThis.__INTERMISSION_APP__.readiness.state.kind===null);
 checks.advance=await page.evaluate(()=>{const a=globalThis.__INTERMISSION_APP__;a.view.render(0,1);return {phase:a.world.phase,round:a.world.endless.round,saveFailed:a.session.saveFailed,modelErrors:a.view.modelErrors.slice(),audioErrors:a.readiness.audio.decodeErrors.slice()};});assert.equal(checks.advance.round,17);assert.equal(checks.advance.saveFailed,false);assert.deepEqual(checks.advance.modelErrors,[]);assert.deepEqual(checks.advance.audioErrors,[]);
 await page.screenshot({path:output+'/'+label+'-paired.png'});
 const canvas=await page.evaluate(()=>{const v=globalThis.__INTERMISSION_APP__.view;v.renderScene();return v.canvas.toDataURL('image/png').split(',')[1];});await fs.writeFile(output+'/'+label+'-canvas.png',Buffer.from(canvas,'base64'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({label,checks}));
}catch(error){checks.failure=String(error);throw error;}finally{
 await fs.writeFile(output+'/'+label+'-paired.json',JSON.stringify({label,method:'Windows Chrome; medium packed assets; simulated touch budget; fixed run seed 529; forced first-stage and endless-16 reward fixtures, battle clock paused; optional tick stopped and drained for controlled repeated gates; real readiness, stage window, on-demand native audio and HUD checkpoint/commit; no physical iOS test',rows,checks,errors},null,2));await browser.close();
}
