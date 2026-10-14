import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const [build,label,scheduleLabel]=process.argv.slice(2),root='reports/local/refraction-science-20261013',out=root+'/'+label;
for(const x of [build,label,...scheduleLabel?[scheduleLabel]:[]])assert.match(x,/^[a-z0-9-]+$/);
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const report={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),records:[],errors:[],cases:[],method:'Real World weapon/death receipts with read-only rendering. Baseline replays the exact candidate tick schedule; isolated GPU effect samples are reported separately.'},schedule=scheduleLabel?JSON.parse(await fs.readFile(root+'/'+scheduleLabel+'/result.json','utf8')):null;
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(900000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const call=(method,...args)=>page.evaluate(({method,args})=>window.combatLab[method](...args),{method,args}),save=()=>fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function shot(name,q,offset){assert.deepEqual(q.errors,[]);assert.equal(q.runtime.sourceCombat.source.missing,0);assert.ok(q.runtime.sourceCombat.source.batches.every(b=>b.dropped===0));await page.screenshot({path:out+'/'+name+'.png'});report.records.push({name,offset,...q});await save();}
const cases=[
 ['marauder',['weaponCase','marauder','ground','shield',3],['MarauderBaseAttackImpact','ProtossShieldRipple']],
 ['siege',['weaponCase','tank','ground','armor',10,'siege'],['SiegeTankSiegedAttackImpact']],
 ['thor-ground',['weaponCase','thor','ground','armor',5],['ThorHandGunAttackLaunch']],
 ['thor-high-impact',['weaponCase','thor','air','armor',5,'thor_high_impact'],['ThorAAAttackLaunchLance']],
 ['baneling',['weaponCase','baneling','ground','flesh',1.4],['BanelingDeath']],
 ['bile',['witnessCase','bile-flight'],['RavagerCorrosiveBileImpact']],
 ['stalker',['weaponCase','stalker','ground','armor',3],['StalkerAttackImpact']],
 ['sentry',['witnessCase','guardian-hit'],['GuardianShield']],
 ['immortal',['weaponCase','immortal','ground','armor',3],['ImmortalAttackImpact']],
 ['colossus',['weaponCase','colossus','ground','armor',3],['ColossusAttackBeamImpact']],
 ['templar',['load','high_templar'],['HighTemplarAttackImpact','HighTemplarPsiStormModel']],
 ['void-ray',['weaponCase','void_ray','ground','armor',3],['VoidRayAttackBeam']],
];
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:900000});await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const [name,setup,models]of cases){await call(...setup);if(name==='templar'){await call('ticks',300,0);await call('combat');}let offset=0;const found=new Set();
  if(schedule){for(const row of schedule.records.filter(r=>r.name.startsWith(name+'--'))){if(row.offset>offset)await call('ticks',row.offset-offset);offset=row.offset;await shot(row.name,await call('draw'),offset);}}
  else{await shot(name+'--before',await call('draw'),offset);for(let n=1;n<=480&&found.size<models.length;n++){const q=await call('ticks',1);offset=n;for(const model of models){if(found.has(model))continue;const draw=q.runtime.sourceCombat.source.modelDraws.find(m=>m.model===model);if(!draw||draw.displacementMeshes+draw.displacementQuads===0)continue;found.add(model);await shot(name+'--'+model,q,offset);}}
   assert.equal(found.size,models.length,'Missing native displacement: '+models.filter(m=>!found.has(m)).join(','));for(const delta of [3,12,30]){offset+=delta;await shot(name+'--after-'+delta,await call('ticks',delta),offset);}}
  report.cases.push({name,models,found:[...found],audit:await call('audit')});await save();console.log(name);
 }
 for(const identity of ['science_vessel','science_vessel.1','science_vessel.2','science_vessel.3']){await call('load',identity);await call('ticks',300,0);await shot(identity+'--alive',await call('draw'),0);await call('killAll');for(const delta of [1,5,12,30,60])await shot(identity+'--death-'+delta,await call('ticks',delta),delta);await call('reload');await shot(identity+'--reloaded',await call('draw'),0);console.log(identity);}
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await save();await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,records:report.records.length,failure:report.failure}));}
