import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {browserRun} from './d02-low-browser-helper.mjs';
const env=await browserRun(process.argv[2]??'boot-candidate-r1',process.argv[3]??'candidate-r2','Isolated cold boot diagnosis. No settings reloads; unmodified native readiness deadlines and normal Retry button.',{args:['--remote-debugging-port=9346']});
const {page,root,report,base,shot,save,setPhase}=env;await fs.copyFile(import.meta.filename,root+'/runner.mjs');
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 await page.evaluate(()=>{const v=A03.app.view,original=v.compilePresentation;window.BootDiagnostic={compiles:[]};v.compilePresentation=function(root,...args){const row={at:performance.now(),name:root.name,type:root.type,meshes:0,programs:this.renderer.info.programs.length};root.traverse(n=>{if(n.isMesh)row.meshes++;});BootDiagnostic.compiles.push(row);return original.call(this,root,...args).then(out=>{row.ms=performance.now()-row.at;return out;},e=>{row.ms=performance.now()-row.at;row.error=String(e);throw e;});};});
 for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty][data-difficulty=easy]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector+':visible').click();
 for(let attempt=0;attempt<2;attempt++){
  setPhase('load-'+attempt);await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:600000});
  const row=await page.evaluate(()=>({ready:A03.app.readiness.state,compiles:BootDiagnostic.compiles,pending:A03.app.view.renderer.info.programs.filter(p=>!p.isReady()).map(p=>({id:p.id,name:p.name,key:p.cacheKey.slice(0,100)})),errors:A03.app.view.modelErrors}));report.checks.push({attempt,...row});await save();
  if(row.ready.phase==='ready'){report.pass=true;break;}await shot('load-error-'+attempt);if(!attempt)await page.locator('[data-action=flow-retry]:visible').click();
 }
 assert.equal(report.pass,true);await shot('ready');
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;await save();}finally{await env.close();}
