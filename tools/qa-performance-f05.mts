import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const recoveryOnly=process.env.SC2_F05_RECOVERY_ONLY==='1';
const mode=process.env.SC2_F05_MODE??'fixed',run=process.env.SC2_F05_RUN??mode+'-1',root=path.resolve('reports/local/performance-f05-20261019',run),folder='performance-f05-20261019'+(mode==='baseline'?'-baseline':'');
await fs.mkdir(root,{recursive:false});await fs.copyFile('tools/qa-performance-f05.mts',root+'/runner.mts');
const hash=(v:any)=>createHash('sha256').update(v).digest('hex');
const report:any={mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),checkpoints:[],checks:[],screens:[],errors:[],requestFailures:[]};
const context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];page.setDefaultTimeout(60000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript('window.__name=(v)=>v;localStorage.setItem("sc2.renderQuality","native");localStorage.setItem("sc2.ordinaryEffects","full");localStorage.setItem("sc2.heroEffects","full");localStorage.setItem("sc2.animationMode","complete");');
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const call=(method:string,args:any[]=[])=>page.evaluate(async({method,args})=>(window as any).__F05__[method](...args),{method,args});
async function checkpoint(label:string,screen=false){console.log(run+' checkpoint '+label);const state=await call('state'),raw=await call('snapshot');await fs.writeFile(root+'/'+label+'.state.json',raw);report.checkpoints.push({label,state,snapshotSha:hash(raw)});if(screen){await call('prepare');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const file=root+'/'+label+'.png';await page.screenshot({path:file});report.screens.push({file,sha256:hash(await fs.readFile(file))});}await save();return state;}
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>!!(window as any).__F05__,null,{timeout:180000});
 console.log(run+' home ready');for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
 await page.waitForFunction(()=>(window as any).__F05__.readiness.state.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await call('freeze');
 if(!recoveryOnly){await call('reset',['f05-expiry']);await call('spawn');await checkpoint('alive',true);await call('step',[36]);await checkpoint('expiry',true);await call('step',[120]);const expired=await checkpoint('reaped',true);assert.equal(expired.ids.every((u:any)=>!u.present),mode!=='baseline');
 await call('reset',['f05-repeat']);await call('step',[1]);const base=await call('state');for(let n=0;n<10;n++){await call('spawn');await call('step',[150]);const state=await call('state');report.checks.push({label:'repeat-'+n,state});if(mode==='fixed'){assert.equal(state.projections,0);assert.equal(state.entities,base.entities);assert.equal(state.members,base.members);assert.equal(state.sources,base.sources);assert.equal(state.movement,base.movement);}}await checkpoint('repeated',true);}
 await call('reset',['f05-early-death']);await call('spawn');await call('step',[6]);await call('kill');await call('step',[recoveryOnly?100:6]);const death=await checkpoint('early-death',true);if(recoveryOnly){assert.equal(death.projections,0);assert.ok(death.ids.every((u:any)=>!u.present));}
 // A frozen pause must not advance simulation or projection retirement clocks.
 const paused=await call('snapshot');await page.waitForTimeout(500);assert.equal(await call('snapshot'),paused);report.checks.push({label:'frozen-world-exact',pass:true});
 const before=await call('state');const epoch=await page.evaluate(()=>(window as any).__F05__.view.contextEpoch);
 await page.evaluate(()=>{const a=(window as any).__F05__;const ext=a.view.renderer.getContext().getExtension('WEBGL_lose_context');(window as any).__F05_LOSS=ext;ext.loseContext();});await page.waitForFunction(()=>(window as any).__F05__.view.renderer.getContext().isContextLost());await page.evaluate(()=>(window as any).__F05_LOSS.restoreContext());
 await page.waitForFunction(()=>{const a=(window as any).__F05__;return !a.view.renderer.getContext().isContextLost()&&a.readiness.state.kind===null&&a.view.assetsPending===0;},null,{timeout:240000});await call('freeze');const after=await checkpoint('restored-death',true);assert.deepEqual(after,before);assert.ok(await page.evaluate(()=>(window as any).__F05__.view.contextEpoch)>epoch);report.checks.push({label:'actual-WebGL-restore-projection-state-exact',pass:true});
 if((await call('extra')).paused)await page.keyboard.press('Escape');await call('freeze');await checkpoint('restored-visible-death',true);await call('step',[150]);const cleared=await checkpoint('early-reaped',true);assert.equal(cleared.ids.every((u:any)=>!u.present),mode!=='baseline');
 assert.ok(death.effects.some((e:any)=>e.key.startsWith('equipment-death:')));assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e);throw e;}finally{await save();await context.close();}
console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,screens:report.screens.length,errors:report.errors,requestFailures:report.requestFailures.length}));
