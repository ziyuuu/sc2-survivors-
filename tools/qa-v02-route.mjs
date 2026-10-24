import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readArchive} from '../src/persistence/archive.ts';
import {browserRun} from './v02-browser-helper.mjs';
const BASE='reports/local/v02-20261024', run=process.argv[2]??'representative-r1',resume=process.argv[3];
const prior=resume?.startsWith('local:')?JSON.parse(await fs.readFile(BASE+'/'+resume.slice(6)+'/report.json','utf8')):null;
const env=await browserRun(run,'One native RAF/FixedStepper 1x Terran normal seed529 campaign with prepared legal G03 blue gear, audited public action controller, full/native/complete visuals. Actual UI start/readiness/advance/endless/retreat/management. No forced outcome, HP, money, stage, extra enemies, or direct step loop. Not human or physical device acceptance.',{variant:'dense-adopted-r1',port:prior?Number(new URL(prior.base).port):0,profile:prior?.profile??path.resolve(BASE+'/'+run+'-profile')});
const {page,root,report,save,shot,setPhase}=env;report.transitions=[];report.archives=[];report.startedAt=Date.now();report.campaignStartedAt=prior?.campaignStartedAt??prior?.startedAt??report.startedAt;
await fs.copyFile(import.meta.filename,root+'/runner.mjs');
await fs.copyFile('tools/v02-browser-helper.mjs',root+'/helper.mjs');
const click=s=>page.locator(s+':visible').first().click();
const state=()=>page.evaluate(()=>V02Run.state());
const waitSave=async()=>{await page.waitForFunction(()=>!A03.app.session.busy&&!A03.app.session.scheduled,null,{timeout:60000});const s=await page.evaluate(()=>({failed:A03.app.session.saveFailed,report:A03.app.session.report()}));assert.equal(s.failed,false,JSON.stringify(s));return s;};
async function archive(name){await waitSave();const raw=await page.evaluate(()=>A03.app.session.exportJSON());await fs.writeFile(root+'/'+name+'.json',raw);const {bundle}=readArchive(raw),s=bundle.run?.state;const row={name,phase:s?.phase,stage:s?.stage,time:s?.time,endless:s?.endless,runId:s?.runId,accountRun:bundle.equipment?.run?.id,ended:bundle.equipment?.run?.ended,settlement:bundle.equipment?.settlement};if(s?.runId)assert.equal(s.runId,row.accountRun);report.archives.push(row);await save();return row;}
await env.context.addInitScript(()=>{const native=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=function(a){if(a instanceof Uint32Array&&a.length===1){a[0]=529;return a;}return native(a);};});
let terminal=false;
try{
 setPhase('home');await page.goto(env.base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>globalThis.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 assert.equal(await page.evaluate(()=>!!globalThis.__SC2_DEBUG__),false);await shot('home');
 setPhase(prior?'resume-native-checkpoint':'import-prepared-account');if(prior)await click('[data-action=save-continue]');else{await click('[data-action=settings]');await click('[data-action=settings-tab][data-tab=saves]');await page.locator('input[aria-label="导入战局文件"]').setInputFiles(resume??BASE+'/opening-account.json');}
 await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:360000});
 if(await page.evaluate(()=>A03.app.readiness.state.phase==='error')){report.initialLoadError=await page.evaluate(()=>A03.app.readiness.state);await shot('resume-first-load-error');await click('[data-action=flow-retry]');await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:360000});}
 assert.equal(await page.evaluate(()=>A03.app.readiness.state.phase),'ready');await click('[data-action=flow-continue]');
 await page.waitForFunction(()=>Object.keys(A03.app.world.starship.account.items).length>=12&&!A03.app.session.busy,null,{timeout:60000});
 if(await page.locator('[data-action=settings-back]:visible').count())await click('[data-action=settings-back]');
 await page.addScriptTag({path:BASE+'/controller.js'});
 await page.evaluate(()=>{
  const a=A03.app,w=a.world,v=a.view;let p=null;
  const ensurePolicy=()=>{if(!p){p=V02Policy.create(w);if(['menu','reward'].includes(w.phase))p.initialize();}};
  const nativeStart=w.start;w.start=function(...args){p=null;ensurePolicy();return nativeStart.apply(this,args);};
  if(w.phase==='reward')ensurePolicy();
  let nextThink=-1,lastKey='',lastAt=0,nextSample=0,enabled=true,error=null;const segments=[],samples=[],deaths=[],specials=[],seenSpecial=new Set(),nativeStep=w.step,nativeRender=v.render;
  const key=()=>`${w.endless?'E'+w.endless.round:w.stage}:${w.specialStages.active?.id??'normal'}`;
  const state=()=>({phase:w.phase,stage:w.stage,time:w.time,tick:w.tick,elapsed:w.stageElapsed,duration:w.duration,endless:w.endless?{round:w.endless.round,elapsed:w.endlessElapsed}:null,paused:w.paused,decision:w.requiresPlayerDecision,special:w.specialStages.active?{id:w.specialStages.active.id,kind:w.specialStages.active.kind,phase:w.specialStages.active.phase,clock:w.specialStages.active.clock}:null,allies:w.allies().length,enemies:w.enemyCount(),kills:w.stats.kills,backlog:a.driver.accumulator,discarded:a.driver.discardedBacklogSeconds,pending:v.assetsPending,ready:a.readiness.state,saveFailed:a.session.saveFailed,runId:w.runId,seed:w.runConfig?.seed,gameSpeed:globalThis.__SC2_DEBUG__?.speed??1,error});
  const sample=()=>({...state(),wallet:{...w.wallet},tech:{...w.expedition.tech},units:w.allies().filter(u=>!u.temporary&&!u.summonKind).map(u=>({id:u.id,type:u.unitType,rank:u.rank,hp:u.hp,maxHp:u.maxHp,hero:u.heroId,elite:u.eliteId})),stats:{...w.stats},items:Object.keys(w.starship.account.items).length,accountRun:w.starship.account.run?.id});
  const safe=fn=>{if(error||!enabled)return;try{fn();}catch(e){error=String(e.stack??e);}};
  const decisions=()=>{if(w.phase!=='battle'||['loading','loot'].includes(w.specialStages.active?.phase)||a.readiness.state.kind||v.assetsPending)return;ensurePolicy();if(w.requiresPlayerDecision)p.decisions();};
  w.step=function(...args){safe(()=>{decisions();if(w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!a.readiness.state.kind&&w.specialStages.active?.phase!=='loading'&&w.time+1e-8>=nextThink){const special=w.specialStages.active,mandatory=!special&&(w.difficulty==='hell'||w.endless)&&[...w.expansionHives.values()].some(h=>h.hp>0),urgent=!mandatory&&!special&&[...w.entities.values()].some(e=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran')&&Math.hypot(e.x-w.anchor.x,e.z-w.anchor.z)<18);if(p.protectDelivery()){}else if(urgent)p.base.think();else p.think();nextThink=w.time+.25;}});const out=nativeStep.apply(this,args);if(w.specialStages.active&&!seenSpecial.has(w.specialStages.active.id)){seenSpecial.add(w.specialStages.active.id);specials.push(sample());}if(w.time>=nextSample){nextSample=w.time+10;samples.push(sample());}return out;};
  const nativeDeath=w.commitUnitDeath;w.commitUnitDeath=function(u,...args){if(u.deadAt===null&&u.owner==='terran'&&!u.temporary&&!u.summonKind)deaths.push({key:key(),time:w.time,id:u.id,type:u.unitType,rank:u.rank});return nativeDeath.call(this,u,...args);};
  v.render=function(...args){const at=performance.now(),out=nativeRender.apply(this,args),active=enabled&&w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!a.readiness.state.kind&&!v.assetsPending;const k=active?key():'';if(k){let row=segments.at(-1);if(k!==lastKey){row={key:k,begin:state(),startAt:at,intervals:[],cpu:[],maxBacklog:0,pendingFrames:0,skippedFrames:0};segments.push(row);}if(lastKey===k&&lastAt)row.intervals.push(at-lastAt);row.cpu.push(performance.now()-at);row.maxBacklog=Math.max(row.maxBacklog,a.driver.accumulator);if(v.backgroundBusy||v.entryPreparation)row.skippedFrames++;row.end=state();row.endedAt=at;}lastKey=k;lastAt=at;return out;};
  const decisionsTimer=setInterval(()=>safe(decisions),100);
  globalThis.V02Run={state,sample,intermission(){ensurePolicy();p.intermission();nextThink=-1;a.hud.update();},finish(){enabled=false;clearInterval(decisionsTimer);return {segments,samples,deaths,specials,final:sample(),events:p?[...p.base.events,...p.prior.events,...p.events]:[],suppressedOfflineReadyRequests:globalThis.V02SuppressedReady??0,modelErrors:[...v.modelErrors],background:__SC2_REPORT__().background};}};
 });
 if(!resume){for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty][data-difficulty=normal]','[data-action=menu-difficulty-next]'])await click(s);
 setPhase('opening');await click('[data-action=menu-start]');await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:360000});assert.equal((await state()).ready.phase,'ready');await shot('opening-ready');await click('[data-action=flow-continue]');}else{report.resume={file:resume,reason:'Continue the same native stored campaign after repairing automatic-reinforcement click race and duplicated special-runtime return. Bind controller after menu configuration. No reroll of route, seed, account or original run ID.'};}
 report.opening=await state();report.openingWallMs=Date.now()-report.startedAt;await save();
 let resumedPreparedIntermission=!!prior;if(prior){assert.equal(report.opening.runId,prior.opening.runId);assert.equal(report.opening.phase,'reward');assert.equal(report.opening.stage,6);await archive('native-resumed-checkpoint');}
 let lastProgress=Date.now(),progressKey='',lastPhase='',lastCheckpoint='',retryKey='';
 while(Date.now()-report.campaignStartedAt<70*60000){
  const s=await state();assert.equal(s.error,null,s.error);assert.equal(s.saveFailed,false,'Native save failed');
  const pk=[s.phase,s.stage,Math.floor(s.time),s.special?.id,s.special?.phase,s.endless?.round,s.ready.phase,s.ready.completed].join('|');if(pk!==progressKey){lastProgress=Date.now();progressKey=pk;}assert.ok(Date.now()-lastProgress<360000,'No progress for six minutes');
  const phaseKey=[s.phase,s.stage,s.endless?.round,s.special?.id,s.special?.phase].join('|');if(phaseKey!==lastPhase){lastPhase=phaseKey;report.transitions.push({at:Date.now(),...s});setPhase(phaseKey);await save();}
  if(s.ready.phase==='error'){const k=s.stage+':'+s.ready.kind;assert.notEqual(k,retryKey,'Repeated loading failure');retryKey=k;await shot('loading-error-'+s.stage);await click('[data-action=flow-retry]');}
  else if(s.ready.kind){if(s.ready.kind!=='reinforcement'&&s.ready.phase==='ready')await click('[data-action=flow-continue]');}
  else if(s.special?.phase==='loot'){await shot('special-'+s.special.id.split(':').at(-1)+'-loot');if(await page.locator('[data-action=special-claim]:visible:enabled').count())await click('[data-action=special-claim]');await click('[data-action=special-return]');await page.waitForFunction(()=>!A03.app.world.specialStages.active,null,{timeout:30000});report.checks.push({name:'native-special-claim-and-return',kind:s.special.kind,id:s.special.id});await shot('special-'+s.special.id.split(':').at(-1)+'-returned');}
  else if(s.phase==='reward'){
   const ck=s.stage+':'+(s.endless?.round??0)+':'+s.time;if(ck!==lastCheckpoint){lastCheckpoint=ck;await archive('checkpoint-'+s.stage+'-'+(s.endless?.round??0));if([1,6,12,18].includes(s.stage)||s.endless)await shot('checkpoint-'+s.stage+'-'+(s.endless?.round??0));}
   if(resumedPreparedIntermission)resumedPreparedIntermission=false;else await page.evaluate(()=>V02Run.intermission());await waitSave();await click('[data-action=skip]');
  }else if(s.phase==='won'){report.campaignOutcome='won';await archive('campaign-victory');await shot('campaign-victory');await click('[data-action=endless]');}
  else if(s.phase==='endless-ready'){await shot('endless-ready');await click('[data-action=endless-prepare]');}
  else if(['lost','finished'].includes(s.phase)){report.routeOutcome=s.phase;await archive('terminal');await shot('terminal');terminal=true;break;}
  else if(s.endless&&s.endless.elapsed>=240){
   report.endlessRoundCompleted=await state();await shot('endless-round-complete');
   // Native retreat is offered through the existing equipment UI.
   if(await page.locator('[data-action=starship]:visible').count())await click('[data-action=starship]');else{await page.keyboard.press('Escape');await click('[data-action=starship]');}
   await click('[data-act=extract]');if(await page.locator('[data-act=confirm]:visible').count())await click('[data-act=confirm]');
  }
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(terminal,'Route exceeded its wall-time limit');report.route=await page.evaluate(()=>V02Run.finish());await fs.writeFile(root+'/route.json',JSON.stringify(report.route,null,2));delete report.route;
 // Preserve terminal state before inspecting legal post-run actions.
 report.postTerminalButtons=await page.locator('button:visible').evaluateAll(es=>es.map(e=>({text:e.textContent,action:e.dataset.action})));
 await (await import('./v02-postroute.mjs')).postRoute({page,root,report,click,save,shot,waitSave,archive,setPhase});
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));report.pass=true;await save();
}catch(e){report.failure=String(e.stack??e);report.failureState=await state().catch(()=>null);report.failureText=await page.locator('body').innerText().catch(()=>null);if(await page.evaluate(()=>!!globalThis.V02Run).catch(()=>false)){const data=await page.evaluate(()=>V02Run.finish()).catch(()=>null);if(data)await fs.writeFile(root+'/route.json',JSON.stringify(data,null,2));}await shot('failure').catch(()=>{});process.exitCode=1;}
finally{report.endedAt=Date.now();await env.close();}
