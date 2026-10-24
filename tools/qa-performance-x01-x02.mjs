import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const mode=process.argv[2]??'candidate',run=process.argv[3]??mode+'-1',revision=process.env.SC2_BATCH_REVISION??'',folder='performance-x01-x02-20261020',root=path.resolve('reports/local',folder,run);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'-'+mode+revision+'/build-inputs.json')),samples:[],checkpoints:[],screens:[],errors:[],requests:[]},hash=x=>createHash('sha256').update(x).digest('hex');
report.profile={path:process.env.SC2_X_PROFILE??root+'/profile',reused:!!process.env.SC2_X_PROFILE};
const context=await chromium.launchPersistentContext(report.profile.path,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)),call=(method,args=[])=>page.evaluate(async({method,args})=>{const a=window.__B02__,parts=method.split('.'),obj=parts.length===2?a[parts[0]]:a;return obj[parts.at(-1)](...args);},{method,args});
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({file,sha256:hash(await fs.readFile(file))});await save();};
const checkpoint=async name=>{const state=await call('snapshot'),data=await call('checkpoint'),heap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);await fs.writeFile(root+'/'+name+'.state.json',state);report.checkpoints.push({name,...data,heap,stateFile:name+'.state.json',sha256:hash(state)});await save();};
const sample=async(name,live,detail,ms=4000)=>{const initial=await call('snapshot'),before=await call('startMeasure',[detail,live]);await page.waitForTimeout(ms);const result=await call('stopMeasure'),after=await call('snapshot');const row={name,live,detail,before,...result,frozenExact:live?null:initial===after};report.samples.push(row);await save();if(!live)assert.ok(row.frozenExact);assert.ok(result.metrics.frames.length>5);console.log(JSON.stringify({name,mode,run,frames:result.metrics.frames.length,sourceCpu:result.metrics.cpu['render.sourceEffects']}));};
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'-'+mode+revision+'/',{timeout:120000});await page.waitForFunction(()=>window.__B02__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 await page.waitForFunction(()=>window.__B02__.readiness.state.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await call('freeze');report.device=await call('device');console.log('Ready '+run);
 if(process.env.SC2_X_GATE)while(!await fs.stat(process.env.SC2_X_GATE).then(()=>true,()=>false))await new Promise(resolve=>setTimeout(resolve,1000));
 for(const name of (process.env.SC2_X_CASES??'ranged-300,medical,carrier-equipment').split(',')){
  await call('fixtures.setup',[name]);await call('fast',[{ticks:name==='carrier-equipment'?1200:360,renderEvery:12}]);await checkpoint(name+'-fixed');await shot(name+'-fixed');
  await sample(name+'-frozen-detail',false,true);await sample(name+'-frozen-low',false,false);
  await sample(name+'-live-detail',true,true);await checkpoint(name+'-live');
  await call('fixtures.stop',['all-combat']);await call('fast',[{ticks:900,renderEvery:60}]);await checkpoint(name+'-ended');
 }
 if(process.env.SC2_X_FLAME==='1'){
  await page.evaluate(async()=>{const a=window.__B03__;await a.reset('elite-flame',{theme:'char',stage:15});const {world:w,view:v}=a;w.entities.clear();w.visualEvents=[];w.effects=[];w.time=10;w.tick=600;
   for(let i=0;i<4;i++){const u=w.addUnit('hellion','terran',(i-1.5)*3,-2);u.eliteId='hellion.2';u.shotSequence=1;u.attackFacing=0;u.lastShotAt=10;u.nextShotAt=1e9;u.moveSpeed=0;const end={x:u.x,z:4};w.visual('attack',u,end);u.shotSequence=2;w.visual('attack',u,end);w.effects.push({id:w.nextId++,kind:'flame',source:u.id,x:u.x,z:u.z,end,radius:5,until:10.35});}
   w.hash.rebuild(w.entities.values());await a.prepare();v.render(0,1);
  });
  report.flame=await page.evaluate(()=>window.__B03__.view.terranEliteEffects.report());assert.equal(report.flame.flameFans.length,4);await checkpoint('elite-flame-fixed');await shot('elite-flame-fixed');await sample('elite-flame-frozen-detail',false,true);await sample('elite-flame-frozen-low',false,false);
 }
 if(mode==='candidate'&&process.env.SC2_X_RECOVERY==='1'){
  await call('fixtures.setup',['psionic']);await call('fast',[{ticks:120,renderEvery:12}]);await shot('before-recovery');await checkpoint('before-recovery');
  const before=await page.evaluate(()=>{const a=window.__B02__;return {time:a.world.time,tick:a.world.tick,rng:a.world.rngState,epoch:a.view.contextEpoch};});
  await page.evaluate(()=>{window.__LOSS=window.__B02__.view.renderer.getContext().getExtension('WEBGL_lose_context');window.__LOSS.loseContext();});await page.waitForFunction(()=>window.__B02__.view.renderer.getContext().isContextLost());await page.evaluate(()=>window.__LOSS.restoreContext());await page.waitForFunction(()=>{const a=window.__B02__;return !a.view.renderer.getContext().isContextLost()&&a.readiness.state.kind===null&&a.view.assetsPending===0;},null,{timeout:240000});await call('freeze');await call('prepare');
  const after=await page.evaluate(()=>{const a=window.__B02__;return {time:a.world.time,tick:a.world.tick,rng:a.world.rngState,epoch:a.view.contextEpoch};});assert.ok(after.epoch>before.epoch);for(const k of ['time','tick','rng'])assert.equal(after[k],before[k]);report.recovery={before,after};
  const resume=page.locator('.pause-actions [data-action=pause]');assert.equal(await resume.count(),1);await resume.click();await call('freeze');await call('prepare');assert.equal(await page.locator('.pause-actions').isVisible(),false);await shot('after-recovery');await checkpoint('after-recovery');
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{await save();await context.close();}
console.log(JSON.stringify({mode,run,pass:report.pass,samples:report.samples.length,errors:report.errors,requests:report.requests.length}));
