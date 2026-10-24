import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const lifecycleOnly=process.env.SC2_R02_LIFECYCLE_ONLY==='1';const run=process.argv[2]??'browser-1',root=path.resolve('reports/local/performance-r02-20261020',run),folder='performance-r02-20261020-candidate-r3';await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json')),scenes:[],screens:[],errors:[],requests:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const context=await chromium.launchPersistentContext(process.env.SC2_X_PROFILE??root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9338']}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const capture=async name=>{await page.evaluate(()=>window.__R02PAIR__.draw());const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.__R02__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();report.loading=[];while(true){const s=await page.evaluate(()=>({...window.__B02__.readiness.state,pending:window.__B02__.view.assetsPending}));report.loading.push(s);await save();console.log('Loading '+s.phase+' '+s.done+'/'+s.total);if(s.phase==='ready')break;if(s.phase==='error')throw Error(s.error);if(Date.now()-start>600000)throw Error('Loading timeout');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>window.__B02__.freeze());report.device=await page.evaluate(()=>window.__B02__.device());
 // Comparator is bundled in this diagnostic entry to share the exact same THREE module.
 await page.evaluate(()=>{
  const a=window.__B02__,v=a.view,w=a.world,native=v.render,candidate=v.equipmentDrops,baseline=new window.R02Baseline.EquipmentDrops(v.scene,candidate.labelLayer),views={baseline,candidate};let active='candidate';baseline.resolveName=candidate.resolveName;
  const hide=d=>{d.root.visible=false;for(const el of d.labels.values())el.hidden=true;d.toast.hidden=true;};
  const select=name=>{for(const [k,d]of Object.entries(views))if(k!==name)hide(d);v.equipmentDrops=views[name];active=name;};
  const draw=()=>{select(active);native.call(v,0,1);};
  const snapshot=()=>{const d=views[active];return {world:a.snapshot(),camera:{position:v.camera.position.toArray(),matrixWorld:v.camera.matrixWorld.toArray(),projection:v.camera.projectionMatrix.toArray()},viewport:[v.viewportWidth,v.viewportHeight],counts:d.report(),meshes:d.meshes.map(m=>({name:m.name,count:m.count,visible:m.visible,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),color:Array.from(m.instanceColor.array.slice(0,m.count*3))})),labels:[...d.labels].map(([id,el])=>({id,hidden:el.hidden,text:el.textContent,title:el.title,quality:el.dataset.quality,polluted:el.dataset.polluted,transform:el.style.transform,width:el.style.width,color:el.style.getPropertyValue('--equipment-color')}))};};
  const renderComponent=()=>views[active].render(w,v.camera,v.viewportWidth,v.viewportHeight,p=>v.ground(p),p=>v.visible(p));
  window.__R02PAIR__={views,nativeName:candidate.resolveName,select,draw,snapshot,stop:()=>{v.render=()=>{};},resume:()=>{select('candidate');v.render=native;},reset:()=>{for(const d of Object.values(views))d.reset();},measure:(name,calls=100)=>{
   select(name);renderComponent();const d=views[name];for(let i=0;i<25;i++)renderComponent();
   const before=a.snapshot(),observer=new MutationObserver(()=>{});observer.observe(d.labelLayer,{subtree:true,attributes:true,childList:true,characterData:true});let groundCalls=0;const raw=v.ground;v.ground=function(p){groundCalls++;return raw.call(v,p);};
   const at=performance.now();try{for(let i=0;i<calls;i++)renderComponent();}finally{v.ground=raw;}const ms=performance.now()-at,records=observer.takeRecords(),labelMutations=records.filter(r=>r.target instanceof Element&&r.target.closest('.equipment-drop-label')).map(r=>r.attributeName??r.type);observer.disconnect();
   return {name,calls,ms,perCallMs:ms/calls,groundCalls,labelMutations:labelMutations.length,mutationKinds:labelMutations.reduce((o,k)=>(o[k]=(o[k]??0)+1,o),{}),worldExact:before===a.snapshot(),counts:d.report()};
  }};
 });
 for(const [name,n,resources,full]of lifecycleOnly?[]:[['peak',18,181,false],['stress',96,181,false],['full',18,181,true]]){
  await page.evaluate(()=>window.__R02PAIR__.resume());const fixture=await page.evaluate(([n,r,f])=>window.__R02__.setup(n,r,f),[n,resources,full]);await page.evaluate(()=>{const p=window.__R02PAIR__;p.stop();p.reset();for(const name of ['baseline','candidate']){p.select(name);p.draw();}p.reset();});
  const row={name,fixture,pairs:[],cpu:[]};report.scenes.push(row);
  for(const age of [0,.2,.45,.8,2]){
   await page.evaluate(t=>{window.__B02__.world.time=t;},age);
   const states=[];for(const variant of ['baseline','candidate']){states.push(await page.evaluate(name=>{const p=window.__R02PAIR__;p.select(name);p.draw();return p.snapshot();},variant));if(age===.45||age===2)await capture(name+'-'+age+'-'+variant);}
   assert.deepEqual(states[1],states[0],name+' matrices/labels/time '+age);await fs.writeFile(root+'/'+name+'-'+age+'-state.json',JSON.stringify(states[1]));row.pairs.push({age,exact:true,counts:states[1].counts});await save();
  }
  for(let i=0;i<12;i++)for(const variant of i%2?['candidate','baseline']:['baseline','candidate']){const r=await page.evaluate(name=>window.__R02PAIR__.measure(name),variant);assert.ok(r.worldExact);row.cpu.push({round:i,...r});}
  console.log('Pair verified '+name);await save();
 }
 // A viewport change, pause/re-entry, offscreen/re-entry and dynamic names must update immediately.
 if(lifecycleOnly){report.lifecycleOnly=true;await page.evaluate(()=>window.__R02PAIR__.resume());report.seedFixture=await page.evaluate(()=>window.__R02__.setup(18,181,true));await page.evaluate(()=>{const p=window.__R02PAIR__;p.stop();p.reset();for(const name of ['baseline','candidate']){p.select(name);p.draw();}});}
 report.transitions=[];
 for(const [name,size]of [['narrow',{width:390,height:844}],['wide',{width:1920,height:1080}]]){
  await page.setViewportSize(size);await page.waitForFunction(({width,height})=>{const v=window.__B02__.view;return v.viewportWidth===width&&v.viewportHeight===height&&v.canvas.clientWidth===width&&v.canvas.clientHeight===height;},size);await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const v=window.__B02__.view,w=window.__B02__.world;v.resize();v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);});const states=[];
  for(const variant of ['baseline','candidate']){states.push(await page.evaluate(name=>{const p=window.__R02PAIR__;p.select(name);p.draw();return p.snapshot();},variant));await capture(name+'-'+variant);}
  assert.deepEqual(states[1],states[0],name);report.transitions.push({name,exact:true,counts:states[1].counts});
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>{const v=window.__B02__.view;return v.viewportWidth===1440&&v.viewportHeight===900&&v.canvas.clientWidth===1440&&v.canvas.clientHeight===900;});await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.__B02__.view.resize();});
 for(const name of ['pause','reward','return','far','near','names']){
  await page.evaluate(name=>{const w=window.__B02__.world,p=window.__R02PAIR__;if(name==='pause')w.paused=true;if(name==='reward')w.phase='reward';if(name==='return'){w.phase='battle';w.paused=false;}if(name==='far')w.anchor.x=40;if(name==='near')w.anchor.x=0;if(name==='names')for(const d of Object.values(p.views))d.resolveName=item=>'更新名称 '+item.id;},name);
  const states=[];for(const variant of ['baseline','candidate'])states.push(await page.evaluate(name=>{const p=window.__R02PAIR__;p.select(name);p.draw();return p.snapshot();},variant));
  assert.deepEqual(states[1],states[0],name);report.transitions.push({name,exact:true,counts:states[1].counts});
 }
 // Real full bag -> native failed pickup -> discard one -> native successful pickup + flight.
 await page.evaluate(()=>{const p=window.__R02PAIR__;p.resume();for(const d of Object.values(p.views))d.resolveName=p.nativeName;});
 const full=await page.evaluate(()=>window.__R02__.setup(18,181,true));await page.evaluate(()=>{const p=window.__R02PAIR__;p.stop();p.reset();for(const name of ['baseline','candidate']){p.select(name);p.draw();}p.reset();});
 report.pickup=await page.evaluate(id=>{const b=window.__B03__,w=window.__B02__.world;b.moveDrop(id,{x:w.anchor.x+1,z:w.anchor.z});const blocked=b.pickupProbe(id),released=b.freeBackpack(),got=b.pickupProbe(id);return {blocked,released,got};},full.ids[0]);
 assert.equal(report.pickup.blocked.first.ok,false);assert.equal(report.pickup.blocked.first.error,'背包已满');assert.ok(report.pickup.released.ok);assert.ok(report.pickup.got.first.ok);assert.equal(report.pickup.got.second.ok,false);
 const flights=[];for(const variant of ['baseline','candidate']){flights.push(await page.evaluate(name=>{const p=window.__R02PAIR__;p.select(name);p.draw();return p.snapshot();},variant));await capture('pickup-flight-'+variant);}
 assert.deepEqual(flights[1],flights[0]);report.pickup.renderExact=true;
 // Final active view is the real production candidate; exercise a real WebGL loss/restore.
 await page.evaluate(()=>{window.__R02PAIR__.resume();window.__R02PAIR__.views.baseline.dispose();window.__R02PAIR__.views.candidate.resolveName=window.__R02PAIR__.nativeName;});const before=await page.evaluate(()=>{const a=window.__B02__;return {state:a.snapshot(),epoch:a.view.contextEpoch,time:a.world.time,tick:a.world.tick,rng:a.world.rngState};});
 await page.evaluate(()=>{window.__LOSS=window.__B02__.view.renderer.getContext().getExtension('WEBGL_lose_context');window.__LOSS.loseContext();});await page.waitForFunction(()=>window.__B02__.view.renderer.getContext().isContextLost());await page.evaluate(()=>window.__LOSS.restoreContext());
 await page.waitForFunction(()=>{const a=window.__B02__;return !a.view.renderer.getContext().isContextLost()&&a.readiness.state.kind===null&&a.view.assetsPending===0;},null,{timeout:300000});await page.locator('.pause-actions [data-action=pause]').click();await page.evaluate(async()=>{window.__B02__.freeze();await window.__B02__.prepare();});
 const after=await page.evaluate(()=>{const a=window.__B02__;return {state:a.snapshot(),epoch:a.view.contextEpoch,time:a.world.time,tick:a.world.tick,rng:a.world.rngState};});assert.ok(after.epoch>before.epoch);for(const k of ['time','tick','rng'])assert.equal(after[k],before[k]);const x=JSON.parse(before.state),y=JSON.parse(after.state);for(const s of [x,y]){delete s.run.notice;delete s.run.noticeUntil;}assert.deepEqual(y,x);report.recovery={before:{...before,state:undefined},after:{...after,state:undefined},exactExceptNotice:true};
 await page.evaluate(()=>window.__R02PAIR__.stop());await capture('actual-candidate-restored');assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{await save();await context.close();}
console.log(JSON.stringify({pass:report.pass,scenes:report.scenes.length,screens:report.screens.length,errors:report.errors,requests:report.requests.length}));
