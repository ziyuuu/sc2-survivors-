import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {labServer} from '../preview/camera-control-20261011/server.mjs';
const [build,label]=process.argv.slice(2),root='reports/local/combat-effects-20261012',out=root+'/'+label;
for(const value of [build,label])assert.match(value,/^[a-z0-9-]+$/);
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const report={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),suite:'native-rare-layer-witnesses',records:[],audits:[],errors:[],passed:false};
const scheduleLabel=process.argv[4]??'final-witnesses-r2';
assert.match(scheduleLabel,/^[a-z0-9-]+$/);
const schedule=report.build.baseline?JSON.parse(await fs.readFile(root+'/'+scheduleLabel+'/result.json','utf8')):null;
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.setDefaultTimeout(900000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const call=(method,...args)=>page.evaluate(({method,args})=>window.combatLab[method](...args),{method,args}),save=()=>fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function shot(name,q,offset){assert.deepEqual(q.errors,[]);const source=q.runtime?.sourceCombat?.source;if(source){assert.equal(source.missing,0);assert.ok(source.batches.every(b=>b.dropped===0));}await page.screenshot({path:out+'/'+name+'.png'});report.records.push({name,offset,...q});await save();}
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:900000});await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const [kind,model]of [['mutalisk-third','MutaliskAttackSegment3Impact'],['guardian-hit','GuardianShieldImpact'],['bile-flight','RavagerCorrosiveBileMissile']]){
  await call('witnessCase',kind);let offset=0;
  if(schedule){for(const row of schedule.records.filter(r=>r.name.startsWith(kind+'-'))){if(row.offset>offset)await call('ticks',row.offset-offset);offset=row.offset;await shot(row.name,await call('draw'),offset);}}
  else{
   await shot(kind+'-before',await call('draw'),offset);let found=false;
   for(let tick=1;tick<=480;tick++){const q=await call('ticks',1);offset=tick;const visible=q.runtime.sourceCombat.source.modelDraws.find(m=>m.model===model&&m.meshes+m.particles+m.ribbons+m.projections>0);if(!visible)continue;await shot(kind+'-active',q,offset);found=true;break;}
   assert.ok(found,'Native layer never became active: '+model);
   for(const delta of [3,12,30,90,180]){await call('ticks',delta);offset+=delta;await shot(kind+'-after-'+delta,await call('draw'),offset);}
  }
  report.audits.push({name:kind,...await call('audit')});await save();console.log(kind);
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.finishedAt=new Date().toISOString();await save();await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,records:report.records.length,failure:report.failure}));}
