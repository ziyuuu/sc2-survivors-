import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';
import {installX04Baseline} from './performance-x04-baseline-page.mjs';
const mode=process.argv[2]??'baseline',run=process.argv[3]??mode+'-1',folder='performance-x04-20261020',root=path.resolve('reports/local',folder,run);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'-'+mode+'/build-inputs.json')),errors:[],requests:[],scenes:[]};
const context=await chromium.launchPersistentContext(process.env.SC2_X_PROFILE??root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)),call=(method,args=[])=>page.evaluate(async({method,args})=>{const a=window.__B02__,parts=method.split('.'),obj=parts.length===2?a[parts[0]]:a;return obj[parts.at(-1)](...args);},{method,args});
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'-'+mode+'/',{timeout:120000});await page.waitForFunction(()=>window.__B02__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 await page.waitForFunction(()=>window.__B02__.readiness.state.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await call('freeze');
 report.cold=await page.evaluate(()=>({...window.__X04Cold.data,readyAt:performance.now()}));await page.evaluate(installX04Baseline);console.log('Ready '+run);await save();
 report.firstUse=await page.evaluate(()=>{
  const a=window.__B02__,{world:w,view:v}=a,{PodView,THREE}=window.__X04Cold,rows=[];
  for(const race of v.podTemplates.keys())for(let i=0;i<8;i++){const start=performance.now(),pod=new PodView(v.podTemplates.get(race),new THREE.Scene(),race,v.podBirthTemplates.get(race),v.podDeathTemplates.get(race));const ms=performance.now()-start,transforms=pod.root.children.map(n=>({position:n.position.toArray(),scale:n.scale.toArray()}));rows.push({kind:'pod',race,iteration:i,ms,outline:pod.bodyOutline.map(p=>p.toArray()),bodyHeight:pod.bodyHeight,transforms});pod.dispose();}
  for(let i=0;i<8;i++){const id=900000+i,start=performance.now();v.playHiveDeath(id,new THREE.Vector3());rows.push({kind:'hive-death',iteration:i,ms:performance.now()-start});v.removeHiveDeath(id);}
  const acid=v.nonHeroEffects.acidGround,old=w.enemySpecials.acidZones;acid.reset();
  for(let i=0;i<8;i++){w.enemySpecials.acidZones=[{source:1,point:{x:0,z:0},radius:3,nextTick:w.time+1,ticks:3}];const start=performance.now();acid.render(w,()=>true);rows.push({kind:'acid',iteration:i,ms:performance.now()-start});acid.reset();}w.enemySpecials.acidZones=old;
  return rows;
 });await save();console.log('First uses measured '+run);
 await page.evaluate(()=>{const p=window.__B02__.view.sourceCombatEffects.player,{SOURCE_EFFECTS,sourceLife}=window.__X04Cold,add=p.add;window.__X04Requests={total:0,expired:0,byModel:{}};p.add=function(r,...args){const d=window.__X04Requests;d.total++;if(!r.loop&&r.age>sourceLife(SOURCE_EFFECTS[r.model])){d.expired++;d.byModel[r.model]=(d.byModel[r.model]??0)+1;}return add.call(this,r,...args);};});
 for(const name of ['ranged-300','medical','carrier-equipment']){
  await call('fixtures.setup',[name]);await call('fast',[{ticks:name==='carrier-equipment'?1200:360,renderEvery:12}]);
  const state=await call('snapshot');await fs.writeFile(root+'/'+name+'.state.json',state);await page.screenshot({path:root+'/'+name+'.png'});
  report.scenes.push({name,stateFile:name+'.state.json',snapshot:await page.evaluate(()=>window.__X04Snapshot()),requests:await page.evaluate(()=>structuredClone(window.__X04Requests))});
  await call('fixtures.stop',['all-combat']);await call('fast',[{ticks:900,renderEvery:60}]);await save();
 }
 report.pools=await page.evaluate(()=>({data:window.__X04__,ended:window.__X04Snapshot()}));assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);process.exitCode=1;}finally{await save();await context.close();}console.log(JSON.stringify({run,pass:report.pass,errors:report.errors}));
