import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'browser-1',revision=process.argv[3]??'r1',pilot=process.env.SC2_R03_PILOT==='1',lifecycle=process.env.SC2_R03_LIFECYCLE==='1',verifyOnly=process.env.SC2_R03_VERIFY_ONLY==='1';
const folder='performance-r03-20261020-candidate-'+revision,root=path.resolve('reports/local/performance-r03-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,pilot,lifecycle,verifyOnly,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json')),scenes:[],boundaries:[],screens:[],errors:[],requests:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
report.profile=process.env.SC2_R03_PROFILE??root+'/profile';
const context=await chromium.launchPersistentContext(report.profile,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9338']}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const screen=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
const pair=async(name,shots=false)=>{
 const result=await page.evaluate(()=>window.R03QA.pair());report.boundaries.push({name,...result});await save();
 assert.equal(result.worldExact,true,name+' world');assert.equal(result.cameraExact,true,name+' camera');assert.equal(result.attributesExact,true,name+' attributes '+JSON.stringify(result.differences));assert.equal(result.labelsExact,true,name+' labels');assert.equal(result.sourceExact,true,name+' source');
 // Pixel differences are recorded without silently accepting a changed scene.
 assert.ok(result.pixels.changed<=25&&result.pixels.max<=2,name+' pixels '+JSON.stringify(result.pixels));
 if(shots)for(const variant of ['baseline','candidate']){
  await page.evaluate(variant=>window.__R03__.draw(variant),variant);await screen(name+'-'+variant);
  // Diagnostic field view only: temporarily hide the pause overlay/backdrop.
  await page.evaluate(()=>{const el=document.querySelector('#overlay');window.R03OverlayVisibility=el.style.visibility;el.style.visibility='hidden';});
  try{await screen(name+'-'+variant+'-field');}finally{await page.evaluate(()=>{document.querySelector('#overlay').style.visibility=window.R03OverlayVisibility;});}
 }
 return result;
};
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.__R03__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();for(;;){const s=await page.evaluate(()=>window.__B02__.readiness.state);console.log('Loading '+s.phase+' '+s.done+'/'+s.total);if(s.phase==='ready')break;if(s.phase==='error')throw Error(s.error);if(Date.now()-start>600000)throw Error('Loading timeout');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>window.__B02__.freeze());report.device=await page.evaluate(()=>window.__B02__.device());
 await page.evaluate(()=>{
  const a=window.__R03__,b=window.__B02__,v=a.view,w=a.world,source=v.sourceCombatEffects.render,renderScene=v.renderScene;let preparations=0,draws=0;
  v.sourceCombatEffects.render=function(...args){preparations++;return source.apply(this,args);};v.renderScene=function(...args){draws++;return renderScene.apply(this,args);};
  const pixels=()=>{const gl=v.renderer.getContext(),p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
  const capture=()=>{const arrays={};v.scene.traverse(n=>{if(!(n.isMesh||n.isLineSegments))return;arrays[n.uuid+':matrix']=n.matrixWorld.elements.slice();for(const [key,attr]of Object.entries({instanceMatrix:n.instanceMatrix,instanceColor:n.instanceColor,...n.geometry?.attributes}))if(attr&&(key==='instanceMatrix'||key==='instanceColor'||attr.usage===35048))arrays[n.uuid+':'+key]=Array.from(attr.array);arrays[n.uuid+':flags']=[n.visible,n.count??null,n.geometry?.drawRange.start??null,n.geometry?.drawRange.count??null];});
   const snap=a.snapshot(),s=snap.source.source;return {world:snap.world,camera:snap.camera,labels:snap.labels,source:{routes:snap.source.routes,events:snap.source.events,flights:snap.source.flights,models:s.models,particles:s.particles,meshes:s.meshes,ribbonQuads:s.ribbonQuads,projectionQuads:s.projectionQuads,displacementMeshes:s.displacementMeshes,displacementQuads:s.displacementQuads,activeRequests:s.activeRequests,modelDraws:s.modelDraws,endingChannels:s.endingChannels},arrays};
  };
  const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  window.R03QA={counts:()=>({preparations,draws}),pair:()=>{
   // Candidate draws first, so the old renderer cannot repair its stale state.
   const before=b.snapshot(),pre=preparations;a.draw('candidate');const first=preparations-pre,mid=preparations;a.draw('candidate');const second=preparations-mid,x=capture(),xp=pixels();a.draw('baseline');const y=capture(),yp=pixels(),differences=[];
   for(const key of new Set([...Object.keys(x.arrays),...Object.keys(y.arrays)]))if(!equal(x.arrays[key],y.arrays[key]))differences.push({key,before:x.arrays[key]?.slice(0,24),after:y.arrays[key]?.slice(0,24)});
   let changed=0,max=0;for(let i=0;i<xp.length;i+=4){let changedPixel=false;for(let c=0;c<3;c++){const delta=Math.abs(xp[i+c]-yp[i+c]);max=Math.max(max,delta);changedPixel||=delta!==0;}if(changedPixel)changed++;}
   return {worldExact:before===b.snapshot(),cameraExact:equal(x.camera,y.camera),attributesExact:differences.length===0,differences,labelsExact:equal(x.labels,y.labels),sourceExact:equal(x.source,y.source),source:x.source,pixels:{changed,max,width:v.canvas.width,height:v.canvas.height},preparations:{first,second},time:w.time,tick:w.tick,paused:w.paused,decision:w.requiresPlayerDecision};
  },measure:async(variant,frames=16)=>{
   for(let i=0;i<4;i++){a.draw(variant);await new Promise(requestAnimationFrame);}const before=b.snapshot(),pre=preparations,dr=draws,ms=[];
   for(let i=0;i<frames;i++){const at=performance.now();a.draw(variant);ms.push(performance.now()-at);await new Promise(requestAnimationFrame);}
   return {variant,ms,preparations:preparations-pre,draws:draws-dr,worldExact:before===b.snapshot()};
  }};
 });
 for(const name of lifecycle?[]:pilot?['drops']:['drops','ranged-300','psionic','carrier-equipment']){
  await page.evaluate(async name=>{const a=window.__R03__,b=window.__B02__;a.resume();if(name==='drops')await a.setup(18,181,false);else{await b.fixtures.setup(name);await b.fast({ticks:120});}b.freeze();a.world.paused=true;a.world.changed();a.stop();a.settle();a.invalidate();},name);
  const before=await page.evaluate(()=>window.__B02__.snapshot());await fs.writeFile(root+'/'+name+'-world.json',before);
  const row={name,worldSha256:hash(before),pair:await pair(name,true),samples:[]};report.scenes.push(row);assert.equal(row.pair.preparations.second,0,name+' cache miss');
  for(let round=0;round<(verifyOnly?0:pilot?2:6);round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate']){
   const sample=await page.evaluate(({variant,pilot})=>window.R03QA.measure(variant,pilot?4:16),{variant,pilot});assert.ok(sample.worldExact);assert.equal(sample.draws,sample.ms.length);assert.equal(sample.preparations,variant==='candidate'?0:sample.ms.length);row.samples.push({round,...sample});await save();
  }
  console.log('Verified '+name);await save();
 }
 if(!pilot){
  await page.evaluate(async()=>{const a=window.__R03__;a.resume();await a.setup(18,181,true);a.world.paused=true;a.world.changed();a.stop();a.settle();a.draw();});
  if(!lifecycle){
  const changes=[
   ['world-notification',()=>{window.__R03__.world.changed();}],
   ['world-time',()=>{const w=window.__R03__.world;w.time+=1/60;w.tick++;w.changed();}],
   ['visual-event-without-notify',()=>{const w=window.__R03__.world;w.visual('hit',w.allies()[0]);}],
   ['selected-body',()=>{const a=window.__R03__,id=a.world.allies()[0].id;a.hud.squadConsole.selectEntity(a.world.entities.get(id));}],
   ['selected-body-callback',()=>{const a=window.__R03__;window.R03Selection=a.view.selectedHealthBodies;a.view.selectedHealthBodies=()=>new Set([a.world.allies()[0].id]);}],
   ['selection-restored',()=>{window.__R03__.view.selectedHealthBodies=window.R03Selection;}],
   ['health-hidden',()=>window.__R03__.view.setHealthBarMode('hidden')],
   ['health-always',()=>window.__R03__.view.setHealthBarMode('always')],
   ['grid',()=>{window.__R03__.view.showGrid=true;}],
   ['grid-off',()=>{window.__R03__.view.showGrid=false;}],
   ['camera-pitch',()=>{const a=window.__R03__;a.view.setCameraPitch(42);a.settle();}],
   ['camera-zoom',()=>{const a=window.__R03__;a.view.setCameraZoom(1.2);a.settle();}],
   ['camera-auto',()=>{const a=window.__R03__;a.view.setCameraMode('auto');a.settle();}],
   ['camera-cinematic',()=>{const a=window.__R03__;a.view.setCameraMode('cinematic');a.settle();}],
   ['camera-fixed',()=>{const a=window.__R03__;a.view.setCameraMode('fixed');a.settle();}],
   ['effects-balanced',()=>{const a=window.__R03__;a.view.nonHeroEffects.setQuality('balanced');a.view.fx.setHeroQuality('balanced');}],
   ['effects-full',()=>{const a=window.__R03__;a.view.nonHeroEffects.setQuality('full');a.view.fx.setHeroQuality('full');}],
   ['reduced-motion',()=>document.querySelector('#interface').classList.add('ui-reduced-motion')],
   ['restore-motion',()=>document.querySelector('#interface').classList.remove('ui-reduced-motion')],
   ['resource-pending',()=>{window.__R03__.view.assetsPending++;}],
   ['resource-ready',()=>{window.__R03__.view.assetsPending--;}],
   ['prepare-busy',()=>{const a=window.__R03__;a.view.backgroundBusy=true;a.draw();a.view.backgroundBusy=false;}],
   ['entry-prepare',()=>{const a=window.__R03__;a.view.entryPreparation=true;a.draw();a.view.entryPreparation=false;}],
   ['unpaused-no-step',()=>{const a=window.__R03__;a.world.paused=false;a.world.changed();}],
   ['interface-pause-lease',()=>{window.R03Release=window.__R03__.world.acquireInterfacePause();}],
   ['release-interface-pause',()=>{window.R03Release();}],
   ['pause-again',()=>{const a=window.__R03__;a.world.paused=true;a.world.changed();}],
  ];
  for(const [name,fn]of changes){await page.evaluate(fn);const r=await pair(name);if(!['resource-pending','unpaused-no-step','release-interface-pause'].includes(name))assert.equal(r.preparations.second,0,name+' cache');}
  for(const [name,size]of [['narrow',{width:390,height:844}],['wide',{width:1920,height:1080}],['desktop',{width:1440,height:900}]]){
   await page.setViewportSize(size);await page.waitForFunction(size=>{const v=window.__R03__.view;return v.viewportWidth===size.width&&v.viewportHeight===size.height;},size);await page.evaluate(()=>window.__R03__.settle());await pair(name,true);
  }
  // Interpolation and a moving camera remain responsive even with no new World tick.
  await page.evaluate(()=>{const a=window.__R03__,v=a.view;v.setCameraPitch(55);window.R03Camera=[];for(let i=0;i<8;i++){a.draw('candidate',.04,1);window.R03Camera.push(v.camera.matrixWorld.toArray());}});
  report.cameraTransition=await page.evaluate(()=>window.R03Camera);assert.ok(new Set(report.cameraTransition.map(JSON.stringify)).size>1);
  await page.evaluate(()=>window.__R03__.settle());await pair('camera-transition-ended');
  report.alpha=await page.evaluate(()=>{const a=window.__R03__,v=a.view,b=window.R03QA.counts();a.draw('candidate',0,.5);const c=window.R03QA.counts();a.draw('candidate',0,.75);const d=window.R03QA.counts();return {first:c.preparations-b.preparations,second:d.preparations-c.preparations};});assert.deepEqual(report.alpha,{first:1,second:1});
  await pair('alpha-reset');
  // A real hero and the production visual-event path, stopped 0.1s into an
  // impact by an interface pause lease (paused remains false).
  report.shake=await page.evaluate(async()=>{
   const a=window.__R03__,b=window.__B02__,w=a.world;a.resume();w.paused=false;w.changed();
   if(!w.acquireHero('yamato_battlecruiser'))throw Error('Yamato fixture acquisition failed');
   await b.prepare();const hero=w.heroEntity('yamato_battlecruiser');if(!hero)throw Error('Yamato fixture body absent');
   w.visual('skill-impact',hero,{x:hero.x+3,z:hero.z});const at=w.time;for(let i=0;i<6;i++)w.step();
   window.R03ShakeRelease=w.acquireInterfacePause();a.stop();a.settle();
   return {hero:hero.heroId,age:w.time-at,paused:w.paused,decision:w.requiresPlayerDecision};
  });
  assert.equal(report.shake.paused,false);assert.equal(report.shake.decision,true);assert.ok(report.shake.age>.09&&report.shake.age<.11);
  const shake=await pair('decision-during-yamato-impact',true);assert.equal(shake.preparations.second,1,'frozen shake must keep the original offset');
  await page.evaluate(()=>{const a=window.__R03__;window.R03ShakeRelease();a.world.paused=true;a.world.changed();});await pair('paused-yamato-impact');
  }
  // Real UI pause, settings and equipment preserve the existing account on return.
  await page.evaluate(()=>{const a=window.__R03__;a.resume();a.world.paused=false;a.world.changed();window.R03Account=a.world.starship.account;window.R03Run=a.world.runId;window.R03Time=a.world.time;});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__R03__.world.paused);await screen('native-pause');
  await page.locator('[data-action=settings]:visible').click();await page.locator('[data-action=settings-tab][data-tab=graphics]').click();await page.evaluate(()=>window.__R03__.stop());report.settings=[];
  for(const [key,value]of [['quality','adaptive'],['quality','native'],['combat-preset','medium'],['combat-preset','full'],['animation-mode','energy-saving'],['animation-mode','complete'],['text-scale','1.15'],['text-scale','0.95']]){
   await page.locator('[data-setting="'+key+'"]').selectOption(value);await page.evaluate(()=>window.__R03__.settle());await pair('native-setting-'+key+'-'+value);
   report.settings.push({key,value,state:await page.evaluate(()=>{const v=window.__R03__.view;return {quality:v.quality,preset:v.combatPreset,animation:v.animationMode,textScale:document.documentElement.style.getPropertyValue('--text-scale')};})});
  }
  await screen('native-settings');await page.locator('[data-action=settings-back]').last().click();await page.evaluate(()=>window.__R03__.resume());
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__R03__.world.paused);
  await page.keyboard.press('KeyI');await page.waitForFunction(()=>window.__R03__.starship.isOpen);await screen('native-backpack');
  await page.locator('#native-starship [data-act=close]').last().click();await page.waitForFunction(()=>!window.__R03__.starship.isOpen);
  report.samePage=await page.evaluate(()=>{const a=window.__R03__;return {sameAccount:a.world.starship.account===window.R03Account,sameRun:a.world.runId===window.R03Run,timeUnchanged:a.world.time===window.R03Time,gearClosed:!a.starship.isOpen,paused:a.world.paused};});assert.ok(report.samePage.sameAccount&&report.samePage.sameRun&&report.samePage.timeUnchanged&&report.samePage.gearClosed);
  // Resume actual simulation for a bounded check, then freeze and pause again.
  await page.evaluate(async()=>{const a=window.__R03__,b=window.__B02__;a.world.paused=false;a.world.changed();await b.fast({ticks:12});a.world.paused=true;a.world.changed();a.stop();a.settle();});await pair('after-twelve-real-steps',true);
  // Real context loss/recovery must replace cached GPU state.
  await page.evaluate(()=>window.__R03__.resume());const before=await page.evaluate(()=>{const a=window.__R03__;return {state:window.__B02__.snapshot(),epoch:a.view.contextEpoch,time:a.world.time,tick:a.world.tick,rng:a.world.rngState};});
  await page.evaluate(()=>{window.R03Loss=window.__R03__.view.renderer.getContext().getExtension('WEBGL_lose_context');window.R03Loss.loseContext();});await page.waitForFunction(()=>window.__R03__.view.renderer.getContext().isContextLost());await page.evaluate(()=>window.R03Loss.restoreContext());
  await page.waitForFunction(()=>{const a=window.__R03__;return !a.view.renderer.getContext().isContextLost()&&a.readiness.state.kind===null&&a.view.assetsPending===0;},null,{timeout:300000});
  const after=await page.evaluate(()=>{const a=window.__R03__;a.stop();a.settle();a.draw();return {state:window.__B02__.snapshot(),epoch:a.view.contextEpoch,time:a.world.time,tick:a.world.tick,rng:a.world.rngState};});
  for(const k of ['time','tick','rng'])assert.equal(after[k],before[k]);assert.equal(after.epoch,before.epoch+1);const x=JSON.parse(before.state),y=JSON.parse(after.state);for(const s of [x,y]){delete s.run.notice;delete s.run.noticeUntil;}assert.deepEqual(x,y);
  report.recovery={before:{...before,state:undefined},after:{...after,state:undefined},exactExceptNotice:true};await pair('actual-webgl-restored',true);
  // Change the actual terrain and return, with the existing five-map assets.
  report.maps=[];
  for(const theme of ['ice','char']){
   await page.evaluate(async theme=>{const a=window.__R03__;a.resume();await a.view.prepareCampaignAssets({version:3,seed:529,theme});await window.__B03__.reset('r03-map-'+theme,{theme});a.world.paused=true;a.world.changed();a.stop();a.settle();},theme);
   await page.waitForFunction(()=>{const a=window.__R03__;return !a.view.mapSwitching&&!a.view.assetsPending&&a.view.mapTerrain===a.world.terrain;},null,{timeout:180000});
   await pair('map-'+theme,true);report.maps.push(await page.evaluate(()=>({theme:window.__R03__.world.campaignRecipe.theme,report:window.__R03__.view.mapView.report()})));await save();
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{await save();await context.close();}
console.log(JSON.stringify({pass:report.pass,scenes:report.scenes.length,boundaries:report.boundaries.length,screens:report.screens.length,errors:report.errors,requests:report.requests.length}));
