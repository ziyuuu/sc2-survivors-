import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {chromium} from '@playwright/test';import {labServer} from '../visual-baseline-20261010/server.mjs';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const build=arg('--build','candidate-r1'),label=arg('--label','smoke-r1'),suite=arg('--suite','smoke');
for(const text of [build,label])assert.match(text,/^[a-z0-9-]+$/);
const root='reports/local/material-batch1-20261010',out=root+'/'+label;await fs.mkdir(out,{recursive:true});
try{await fs.access(out+'/results.json');throw Error('Evidence exists; use a fresh label');}catch(e){if(e.code!=='ENOENT')throw e;}
const server=labServer(root+'/'+build);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const result={build:JSON.parse(await fs.readFile(root+'/'+build+'/build.json','utf8')),label,suite,startedAt:new Date().toISOString(),records:[],errors:[]};
await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:suite!=='cost'});
const context=await browser.newContext({viewport:{width:1280,height:756},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(300000);
page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
const persist=()=>fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));
const call=(method,...args)=>page.evaluate(async({method,args})=>window.materialLab[method](...args),{method,args});
async function capture(name){const q=await call('draw');assert.deepEqual(q.errors,[]);assert.deepEqual(result.errors,[]);assert.equal(q.runtime.assetsPending,0);await page.screenshot({path:out+'/'+name+'.png'});result.records.push({name,...q});await persist();console.log(JSON.stringify({name,time:q.time,errors:q.errors.length,surfaces:q.surfaces.length}));return q;}
try{
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:300000});await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:300000});await capture('immortal-idle-far');
 if(suite==='smoke'||suite==='core'){
  await call('view',9);await capture('immortal-idle-near');await call('hit',0,10);await capture('immortal-start-0');await call('ticks',6);await capture('immortal-start-010');
  for(let i=1;i<4;i++){await call('hit',i,10);await call('ticks',6);await capture('immortal-stagger-'+i);}
  await call('reorder');await capture('immortal-reordered-stagger');await call('reload');await capture('immortal-reloaded-stagger');await call('ticks',90);await capture('immortal-hold');await call('reorder');await capture('immortal-reordered');await call('reload');await capture('immortal-reloaded');
  await call('hit',0,100);await capture('immortal-exhausted-0');await call('ticks',6);await capture('immortal-exhausted-010');await call('ticks',7);await capture('immortal-exhausted-022');
  await call('move');await capture('immortal-moving');await call('attack');await capture('immortal-attacking');
  await call('load','zealot');await call('view',9);await capture('zealot-before');for(let i=0;i<4;i++)await call('hit',i,1e8);await capture('zealot-death-000');let elapsed=0;for(const n of [12,30,90,197,201,223,225,237,241,263,267]){await call('ticks',n-elapsed);elapsed=n;await capture('zealot-death-'+String(n).padStart(3,'0'));if(n===30){await call('reload');await capture('zealot-death-reload-030');}}
  if(!build.startsWith('baseline')){result.filtering=await call('textureFiltering');assert.equal(new Set(result.filtering.map(r=>r.key)).size,4);assert.equal(new Set(result.filtering.map(r=>r.quality)).size,3);}
 }
 if(suite==='maps')for(const theme of ['industrial','mar-sara','char','ice','frontier'])for(const group of ['immortal','zealot']){await call('load',group,theme);await capture(theme+'-'+group+'-far');await call('view',7,0);if(group==='immortal'){await call('hit',0,10);await call('ticks',20);}else await call('hit',0,1e8);await capture(theme+'-'+group+'-near-active');}
 if(suite==='heroes'){result.heroDeaths=[];for(const group of ['artanis','alarak','vorazun']){await call('load',group);await call('view',7);await capture(group+'-alive');await call('hit',0,1e8);await capture(group+'-death-0');const start=(await call('deathStatus'))[0];assert.ok(start.clip&&start.retained);let elapsed=0;const checks=[];for(const tick of [...new Set([12,30,90,Math.floor(start.life*60)-1,Math.ceil(start.life*60)+1,Math.floor((start.life+.4)*60)-1,Math.ceil((start.life+.4)*60)+1])].sort((a,b)=>a-b)){await call('ticks',tick-elapsed);elapsed=tick;await capture(group+'-death-'+tick);checks.push({tick,...(await call('deathStatus'))[0]});}assert.equal(checks.at(-1).retained,false);assert.equal(checks.at(-1).count,0);result.heroDeaths.push({group,start,checks});}}
 if(suite==='mobile')for(const [layout,width,height] of [['landscape',844,390],['portrait',390,844]]){await page.setViewportSize({width,height});for(const group of ['immortal','zealot']){await call('load',group);await capture(layout+'-'+group+'-far');await call('view',7,0);await capture(layout+'-'+group+'-near');await call('hit',0,group==='immortal'?10:1e8);await call('ticks',12);await capture(layout+'-'+group+'-active');await call('ticks',78);await capture(layout+'-'+group+'-later');}}
 if(suite==='color'){result.color=[];for(const [group,hero] of [['marine','raynor'],['zergling','kerrigan'],['immortal','artanis']]){await call('load',group);const before=await call('pixels');await capture(group+'-without-hero');await call('hero',hero,true);const alive=await call('pixels');await capture(group+'-hero-alive');await call('hero',hero,false);const dead=await call('pixels');await capture(group+'-hero-dead');result.color.push({group,hero,before,alive,dead});if(!build.startsWith('baseline')){assert.equal(before.checksum,alive.checksum,group+' base color changed on hero arrival');assert.equal(before.checksum,dead.checksum,group+' base color changed on hero death');}}}
 if(suite==='cost'){await page.bringToFront();result.cost=await call('cost',5);await capture('cost-end');}
 result.passed=true;
}catch(error){result.passed=false;result.failure=String(error.stack??error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(result.failure);process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();await persist();await browser.close();await new Promise(r=>server.close(r));}
