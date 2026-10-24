import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const run=process.argv[2]??'candidate-r2-final-1',root=path.resolve('reports/local/performance-r01-20261020',run),folder='performance-r01-20261020-candidate-r2';await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),fragments=JSON.parse(await fs.readFile('reports/local/performance-r01-20261020/shader-fragments-r1.json'));
const report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json')),scenarios:[],screens:[],errors:[],requests:[]};
const context=await chromium.launchPersistentContext(process.env.SC2_X_PROFILE??root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9338']}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const capture=async name=>{
 await page.evaluate(()=>{window.__R01__.settle();window.__R01Capture=window.__B02__.view.render;window.__B02__.view.render=()=>{};});
 const file=root+'/'+name+'.png';try{await page.screenshot({path:file});}finally{await page.evaluate(()=>{window.__B02__.view.render=window.__R01Capture;delete window.__R01Capture;});}
 const state=await page.evaluate(()=>window.__B02__.snapshot()),checkpoint=await page.evaluate(()=>window.__B02__.checkpoint());await fs.writeFile(root+'/'+name+'.state.json',state);report.screens.push({name,file,sha256:hash(await fs.readFile(file)),stateHash:hash(state),checkpoint});await save();return state;
};
const shaders=async theme=>{
 const r=await page.evaluate(({theme,fragment})=>{const v=window.__B02__.view,gl=v.renderer.getContext(),sources=v.renderer.info.programs.flatMap(p=>(gl.getAttachedShaders(p.program)??[]).map(s=>gl.getShaderSource(s)??''));return {theme,actualCompiledMatches:sources.filter(s=>s.includes(fragment)).length,pairInjectionPresent:!!window.__R01_PAIR__,ground:v.mapView.report().environment.ground,resolution:v.report().resolution};},{theme,fragment:fragments.variants.candidate.themes[theme].fragment});
 assert.ok(r.actualCompiledMatches>0,theme+' actual shader missing');assert.equal(r.pairInjectionPresent,false);assert.equal(r.ground.profile,theme);assert.equal(r.resolution.renderPixelRatio,1);return r;
};
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>window.__R01__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();report.loadingProgress=[];let last='';while(true){const state=await page.evaluate(()=>({...window.__B02__.readiness.state,pending:window.__B02__.view.assetsPending}));report.loadingProgress.push(state);await save();const key=state.phase+':'+state.label+':'+state.done;if(key!==last){console.log('Loading '+key+'/'+state.total);last=key;}if(state.phase==='ready')break;if(state.phase==='error')throw Error(state.error);if(Date.now()-start>600000)throw Error('Loading timeout');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>window.__B02__.freeze());report.device=await page.evaluate(()=>window.__B02__.device());console.log('Ready final candidate');
 for(const theme of ['industrial','mar-sara','char','ice','frontier']){
  await page.evaluate(theme=>window.__R01__.setup('quiet',theme,0),theme);const row={name:'quiet-'+theme,shader:await shaders(theme)};report.scenarios.push(row);await capture(row.name);console.log('Actual shader '+theme);
 }
 for(const name of ['melee-300','ranged-300','medical','carrier-equipment','main-hive','psionic']){
  await page.evaluate(name=>window.__R01__.setup(name,'char',name==='main-hive'?360:120),name);
  const row={name,shader:await shaders('char'),stages:[]};report.scenarios.push(row);await capture(name);
  for(const stage of ['opaque','transparent']){const r=await page.evaluate(stage=>window.__R01__.measure(stage,20,8),stage);row.stages.push(r);await save();console.log(name+' '+stage+' '+r.gpuMs.slice().sort((a,b)=>a-b)[10].toFixed(3));}
 }
 const stateBefore=await capture('before-recovery'),before=await page.evaluate(()=>{const a=window.__B02__;return {time:a.world.time,tick:a.world.tick,rng:a.world.rngState,epoch:a.view.contextEpoch};});
 await page.evaluate(()=>{window.__LOSS=window.__B02__.view.renderer.getContext().getExtension('WEBGL_lose_context');window.__LOSS.loseContext();});await page.waitForFunction(()=>window.__B02__.view.renderer.getContext().isContextLost());await page.evaluate(()=>window.__LOSS.restoreContext());
 await page.waitForFunction(()=>{const a=window.__B02__;return !a.view.renderer.getContext().isContextLost()&&a.readiness.state.kind===null&&a.view.assetsPending===0;},null,{timeout:300000});await page.evaluate(async()=>{window.__B02__.freeze();await window.__B02__.prepare();});
 const after=await page.evaluate(()=>{const a=window.__B02__;return {time:a.world.time,tick:a.world.tick,rng:a.world.rngState,epoch:a.view.contextEpoch};});assert.ok(after.epoch>before.epoch);for(const k of ['time','tick','rng'])assert.equal(after[k],before[k]);
 const resume=page.locator('.pause-actions [data-action=pause]');assert.equal(await resume.count(),1);await resume.click();await page.evaluate(async()=>{window.__B02__.freeze();await window.__B02__.prepare();});assert.equal(await page.locator('.pause-actions').isVisible(),false);
 const stateAfter=await capture('after-recovery'),old=JSON.parse(stateBefore),now=JSON.parse(stateAfter);const notice={before:[old.run.notice,old.run.noticeUntil],after:[now.run.notice,now.run.noticeUntil]};delete old.run.notice;delete old.run.noticeUntil;delete now.run.notice;delete now.run.noticeUntil;assert.deepEqual(now,old,'recovery world');report.recovery={before,after,notice,exactExceptNotice:true,shader:await shaders('char')};await save();console.log('Actual context recovery exact');
 report.afterRestoreMaps=[];for(const theme of ['industrial','mar-sara','char','ice','frontier']){await page.evaluate(theme=>window.__R01__.setup('quiet',theme,0),theme);report.afterRestoreMaps.push(await shaders(theme));await capture('restored-'+theme);console.log('Restored shader '+theme);}
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{await save();await context.close();}
console.log(JSON.stringify({pass:report.pass,scenes:report.scenarios.length,screens:report.screens.length,errors:report.errors,requests:report.requests.length}));
