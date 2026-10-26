import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

const offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),baseline=process.argv.includes('--baseline');
const phase=baseline?'baseline':offline?'offline':'web',root=path.resolve('.cache/t01-framing'),profile=root+'/profile-'+phase;
await fs.mkdir(profile,{recursive:true});
const server=offline?null:await serveT01(),report={phase,cases:[],checks:[],errors:[],http:[],complete:false};let browser,child,page;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,cases:report.cases.length,errors:report.errors.length})),25000);
try{
 if(offline){const b=JSON.parse(await fs.readFile(path.dirname(offline)+'/build.json','utf8')),a=b.artifacts[0],h=createHash('sha256');for await(const bytes of createReadStream(offline))h.update(bytes);assert.equal(h.digest('hex'),a.sha256);report.htmlSha256=a.sha256;}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0];page=context.pages()[0];
 await page.setViewportSize({width:1440,height:900});const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http.push(r.url());});
 if(offline){await context.setOffline(true);page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});}
 await page.goto(offline?pathToFileURL(path.resolve(offline)).href:server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:300000});
 assert.equal(await page.locator('#t01-fatal').count(),0);await page.evaluate(()=>T01.runtime.pause());
 report.counts=await page.evaluate(()=>({objects:T01.gallery.length,units:T01.gallery.filter(o=>o.unit).length,ui:T01.catalogue.static.length}));
 const cases=[...['carrier','elite.carrier.1','elite.carrier.2','elite.carrier.3','hero.purifier_flagship'].map(a=>`actor:${a}:1:attack`),...[1,3,5].map(r=>`actor:hero.purifier_flagship:${r}:skill`)];
 if(!baseline)cases.push('actor:carrier:1:idle','actor:carrier:1:move','actor:carrier:1:death','actor:marine:1:stim','actor:colossus:1:attack','actor:void_ray:1:attack');
 for(const id of cases){
  report.phase=phase+':'+id;await page.evaluate(async id=>{await T01.load(id);T01.runtime.pause();},id);
  const record={id,samples:[]};report.cases.push(record);
  for(const t of [0,.3,.7,1.4,3,5.8]){
   await page.evaluate(t=>T01.runtime.advanceTo(t),t);
   const sample=await page.evaluate(()=>{
    const {world:w,view:v}=T01.app,selected=T01.runtime.snapshot(),actor=w.entities.get(selected.actor?.id),bodies=actor?[actor,...[...w.entities.values()].filter(u=>u.summonOwnerId===actor.id),...selected.target?[w.entities.get(selected.target.id)]:[]]:[];
    const projected=[];
    for(const u of bodies.filter(Boolean)){
     const fleet=v.protossHeroes.childPresentation(u),key=fleet?(w.entities.get(u.summonOwnerId)?.heroId==='purifier_flagship'?'hero.purifier_flagship':fleet.modelKey):v.modelKey(u),m=v.gpu.get(key);if(!m)continue;
     const legacy=u.modelKey==='interceptor'&&u.visualScale===.2,scale=fleet?.scale??(u.visualScale??1)*(u.heroId==='purifier_flagship'||u.eliteId&&u.flying?1.15:1);
     // Independently project the rotated source hull at the real render pose.
     const p=fleet?.point??{x:u.x,y:u.flying?5.6:0,z:u.z},f=fleet?.facing??u.facing,cos=Math.cos(f),sin=Math.sin(f);
     let submitted=null,best=Infinity;const mesh=m.meshes[0];
     if(u.hp>0&&mesh)for(let i=0;i<mesh.count;i++){const matrix=v.camera.matrixWorld.clone();mesh.getMatrixAt(i,matrix);const e=matrix.elements,d=Math.hypot(e[12]-p.x,e[13]-p.y,e[14]-p.z);if(d<best){best=d;submitted=matrix;}}
     const points=m.bodyOutline.map(q=>submitted&&best<.05?q.clone().applyMatrix4(submitted).project(v.camera):q.clone().set(p.x+(q.x*cos+q.z*sin)*scale,p.y+q.y*scale,p.z+(-q.x*sin+q.z*cos)*scale).project(v.camera));
     projected.push({id:u.id,key,scale,submittedScale:submitted&&best<.05?Math.hypot(...submitted.elements.slice(0,3)):null,legacy,x:[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x))],y:[Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))],radius:u.unitRadius});
    }
    return {elapsed:selected.elapsed,projected,mechanics:{time:w.time,stats:w.stats,entities:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,hp:u.hp,shield:u.shield,x:u.x,z:u.z,shots:u.shotSequence,next:u.nextShotAt,damage:u.weaponDamage,radius:u.unitRadius})),casts:w.heroCasts.map(c=>({hero:c.hero,at:c.at,point:c.point}))},audio:selected.audio};
   });record.samples.push(sample);
   if(!baseline){for(const b of sample.projected){assert.ok([...b.x,...b.y].every(n=>Math.abs(n)<1),id+' cropped '+JSON.stringify(b));if(b.key==='interceptor'){assert.equal(b.scale,1);if(b.submittedScale!==null)assert.ok(Math.abs(b.submittedScale-1)<1e-6);}}}
   if(!baseline&&[.7,3].includes(t)&&!id.includes('marine'))await page.screenshot({path:root+'/'+phase+'-'+id.replaceAll(':','_')+'-'+t+'.png'});
  }
 }
 if(!baseline){
  const old=JSON.parse(await fs.readFile(root+'/baseline.json.browser','utf8'));report.mechanicsCompared=0;
  for(const c of old.cases){const fresh=report.cases.find(r=>r.id===c.id);for(let i=0;i<c.samples.length;i++){assert.deepEqual(JSON.parse(JSON.stringify(fresh.samples[i].mechanics)),c.samples[i].mechanics,c.id+' '+i);report.mechanicsCompared++;}}
  for(const [width,height]of [[900,650],[390,844]]){await page.setViewportSize({width,height});for(const id of ['actor:carrier:1:attack','actor:hero.purifier_flagship:5:skill','actor:marine:1:idle']){
   await page.evaluate(async id=>{await T01.load(id);await T01.runtime.advanceTo(1);},id);await page.screenshot({path:root+'/'+phase+'-'+width+'-'+id.replaceAll(':','_')+'.png'});
   const bounds=await page.evaluate(()=>{const {view:v,world:w}=T01.app,u=w.entities.get(T01.runtime.snapshot().actor.id),m=v.gpu.get(v.modelKey(u)),s=(u.visualScale??1)*(u.heroId==='purifier_flagship'?1.15:1);return m.bodyOutline.map(q=>q.clone().set(u.x+q.x*s,(u.flying?5.6:0)+q.y*s,u.z+q.z*s).project(v.camera)).map(p=>[p.x,p.y]);});assert.ok(bounds.flat().every(n=>Math.abs(n)<1));report.checks.push(width+'-frame-'+id);
  }}
  await page.setViewportSize({width:1440,height:900});assert.equal(report.counts.units,165);assert.ok(report.counts.objects<500);
  await page.locator('#t01-catalogue-notes summary').click();await page.getByRole('searchbox',{name:'查找目录说明',exact:true}).fill('恢复');assert.ok(await page.locator('#t01-catalogue-notes p:visible').count());await page.locator('#t01-catalogue-notes summary').click();report.checks.push('searchable-reference-catalogue');
  await page.evaluate(()=>T01.load('actor:carrier:1:attack',true));await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.1);await page.locator('#t01-play').click();const time=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),time);
  await page.locator('#t01-advanced summary').click();await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().elapsed)-time-1/60)<1e-6);await page.locator('#t01-advanced summary').click();report.checks.push('pause-and-step');
  await page.locator('#t01-loop').check();await page.evaluate(()=>T01.runtime.advanceTo(6));await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<3&&T01.runtime.snapshot().playing,null,{timeout:120000});await page.locator('#t01-loop').uncheck();await page.locator('#t01-play').click();report.checks.push('loop');
  const downloads=[],downloadRoot=path.join(root,'downloads-'+phase);await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
  await page.locator('#t01-note').fill('比例与取景复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const d=downloads.find(d=>d.state==='completed');assert.ok(d);const exported=JSON.parse(await fs.readFile(downloadRoot+'/'+d.guid,'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='比例与取景复核'));report.checks.push('export');
  const before=await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet}));await page.locator('#t01-static').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='static');assert.deepEqual(await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet})),before);report.checks.push('ui-isolation');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(root+'/'+phase+'.json.browser',JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,cases:report.cases.length,checks:report.checks.length,errors:report.errors,http:report.http,failure:report.failure}));}
