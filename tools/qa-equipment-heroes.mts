import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const folder=process.env.SC2_PREVIEW_NAME??'equipment-effects-r4-20261016',root=path.resolve(process.env.SC2_QA_DIR??'reports/local/equipment-fx-performance-20261016/heroes-r1');await fs.mkdir(root,{recursive:true});
const heroes=(process.env.SC2_HEROES??'raynor,tychus,nova,swann,tosh,yamato_battlecruiser,kerrigan,zagara,dehaka,stukov,niadra,hots_leviathan,artanis,zeratul,alarak,fenix,vorazun,purifier_flagship').split(',');
const report:any={started:new Date().toISOString(),method:'Explicit diagnostic fixtures: legal six-piece pre-run loadout, real casts and 60 Hz native cast/status resolvers; static targets and manual clock. Not natural gameplay or performance acceptance.',build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),cases:[],errors:[]};
const context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.addInitScript('window.__name=v=>v;localStorage.setItem("sc2.renderQuality","native");localStorage.setItem("sc2.animationMode","complete");localStorage.setItem("sc2.heroEffects","full");localStorage.setItem("sc2.ordinaryEffects","full");');
const save=()=>fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
try{
 await page.goto('http://127.0.0.1:4413/'+folder+'/?qa=1',{timeout:120000});await page.waitForFunction(()=>!!(window as any).__EQUIPMENT_EFFECTS__,null,{timeout:180000});console.log('Hero menu ready');
 for(const hero of heroes)for(const polluted of [false,true]){
  const key=hero+(polluted?'-polluted':'-normal'),entry:any={key,frames:[]};report.cases.push(entry);console.log('Preparing '+key);
  const started=await page.evaluate(async({hero,polluted})=>(window as any).__EQUIPMENT_EFFECTS__.heroFixture(hero,polluted),{hero,polluted});assert.ok(started.equipment.some((e:any)=>e.key==='hero_orange'&&e.values[0]===(polluted?2:1)));await fs.writeFile(path.join(root,key+'-start.json'),JSON.stringify(started));
  const times=hero==='swann'?[.15,1.1,5.5,8.5,10.1]:hero==='vorazun'?[.15,.8,4.5,10.5,16.5]:hero==='stukov'?[.15,.8,1.5,4.5,7.1]:[.15,.45,.8,1.3,2.8];
  for(const time of times){const frame=await page.evaluate(async time=>(window as any).__EQUIPMENT_EFFECTS__.heroAdvance(time),time);const label=key+'-'+time.toFixed(2);await fs.writeFile(path.join(root,label+'.json'),JSON.stringify(frame));entry.frames.push({time,report:label+'.json',protected:frame.protected.length,receipts:frame.receipts.length,casts:frame.casts.length});
   if(time===times[1]||time===times[times.length-2]){await page.screenshot({path:path.join(root,label+'.png')});entry.frames.at(-1).screen=label+'.png';}
   if(hero==='swann'&&time===8.5)assert.equal(frame.protected.length,polluted?entry.frames[0].protected:0);
  }
  entry.passed=true;await save();console.log('PASS '+key);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error instanceof Error?error.stack:error);process.exitCode=1;}finally{report.finished=new Date().toISOString();await save();await context.close();console.log(JSON.stringify({passed:report.passed,failure:report.failure,cases:report.cases.length,errors:report.errors.length}));}
