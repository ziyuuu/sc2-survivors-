import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const mode=process.argv[2]??'baseline',run=process.argv[3]??mode+'-pilot-1',revision=process.env.SC2_BATCH_REVISION??'',folder='performance-r01-20261020',root=path.resolve('reports/local',folder,run);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'-'+mode+revision+'/build-inputs.json')),scenarios:[],screens:[],errors:[],requests:[]},hash=x=>createHash('sha256').update(x).digest('hex');
report.profile={path:process.env.SC2_X_PROFILE??root+'/profile',reused:!!process.env.SC2_X_PROFILE};
const context=await chromium.launchPersistentContext(report.profile.path,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9338']}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'-'+mode+revision+'/',{timeout:120000});await page.waitForFunction(()=>window.__R01__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();report.loadingProgress=[];let last='';while(true){const state=await page.evaluate(()=>({at:performance.now(),...window.__B02__.readiness.state,pending:window.__B02__.view.assetsPending}));report.loadingProgress.push(state);await save();const key=state.phase+':'+state.label+':'+state.done;if(key!==last){console.log('Loading '+state.phase+' '+state.label+' '+state.done+'/'+state.total);last=key;}if(state.phase==='ready')break;if(state.phase==='error')throw Error(state.error);if(Date.now()-start>600000)throw Error('Required loading timeout, progress retained');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await page.evaluate(()=>window.__B02__.freeze());report.device=await page.evaluate(()=>window.__B02__.device());console.log('Ready '+run);
 for(const name of ['quiet','ranged-300','psionic']){
  const checkpoint=await page.evaluate(name=>window.__R01__.setup(name,'char',120),name),state=await page.evaluate(()=>window.__B02__.snapshot());await fs.writeFile(root+'/'+name+'.state.json',state);
  const scene={name,checkpoint,stateHash:hash(state),stages:[]};report.scenarios.push(scene);await save();
  for(const stage of ['total','contact','contact-depth','contact-ao','shadow','beauty','ground','refraction','bloom','output']){
   const result=await page.evaluate(stage=>window.__R01__.measure(stage,16,5),stage);scene.stages.push(result);await save();const sorted=result.gpuMs.slice().sort((a,b)=>a-b);console.log(name+' '+stage+' GPU median '+sorted[8].toFixed(3)+' ms');
  }
  await page.evaluate(()=>{window.__R01__.settle();const v=window.__B02__.view;window.__R01CaptureRender=v.render;v.render=()=>{};});const file=root+'/'+name+'.png';try{await page.screenshot({path:file});}finally{await page.evaluate(()=>{window.__B02__.view.render=window.__R01CaptureRender;delete window.__R01CaptureRender;});}
  report.screens.push({file,sha256:hash(await fs.readFile(file))});assert.equal(await page.evaluate(()=>window.__B02__.snapshot()),state);await save();
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{
 await save();if(process.env.SC2_DEBUG_HOLD==='1'){console.log('Retained browser on 9338; write '+root+'/close to finish');for(let i=0;i<1800;i++){if(await fs.stat(root+'/close').catch(()=>null))break;await new Promise(r=>setTimeout(r,1000));}}
 await context.close();
}
console.log(JSON.stringify({mode,run,pass:report.pass,errors:report.errors,requests:report.requests.length}));
