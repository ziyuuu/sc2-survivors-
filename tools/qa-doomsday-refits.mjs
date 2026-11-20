import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-20261117',port=Number(process.env.SC2_SHOWCASE_PORT??5199);
await fs.mkdir(out,{recursive:true});
const server=process.env.DOOMSDAY_QA_SERVE?await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false},optimizeDeps:{entries:['preview/doomsday-showcase-20261117/index.html']}}):null;
await server?.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const result={scenes:[],errors:[]};
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text().slice(0,400));});
 await page.goto(`http://127.0.0.1:${port}/preview/doomsday-showcase-20261117/?card=M-O02&variant=2`,{timeout:180000});
 await page.waitForFunction(()=>window.doomsdayShowcase?.report().ready,null,{timeout:300000});
 const cases=process.env.DOOMSDAY_REFIT_CASES?.split(',')??['sword-windup','sword-contact','sword-follow','giant-ranged','nano-shield','nano-body','phase-body','nano-ammo','phase-hit'];
 for(const name of cases){
  const id=name.startsWith('sword')||name==='giant-ranged'?'M-O02':name.startsWith('combo')?'M-N01':name==='phase-light'?'M-N02':{'nano-shield':'M-G02','nano-body':'M-B01','phase-body':'M-B04','nano-ammo':'M-N01','phase-hit':'M-N02','artillery-ring':'M-B02','artillery-pierce':'M-P05'}[name];
  const mode=name.startsWith('sword')?2:1;
  await page.evaluate(({id,mode,name})=>window.doomsdayShowcase.load(id,mode,false,{stack:name.startsWith('combo'),theme:name.endsWith('light')?'ice':undefined}),{id,mode,name});
  await page.evaluate(()=>window.doomsdayShowcase.audio.start());
  const scene=await page.evaluate(name=>{
   const q=window.doomsdayShowcase,w=q.world;
   const desired={'sword-windup':.23,'sword-contact':.41,'sword-follow':.6}[name];
   let found=false,sample;
   w.paused=false;
   for(let i=0;i<720;i++){
    w.step();q.audio.update(w);
    const slash=w.expedition.doomsday?.slashes?.find(e=>e.startTick<=w.tick&&e.endTick>w.tick);
    const phase=slash?(w.tick-slash.startTick)/(slash.endTick-slash.startTick):0;
    if(desired!==undefined&&slash&&phase>=desired){found=true;sample={phase,slash};break;}
    const recent=w.visualEvents.filter(e=>w.time-e.time<.12);
    if(name.startsWith('artillery')&&recent.some(e=>e.kind==='attack'&&e.unitType==='tank'&&(name==='artillery-ring'||(e.doomsdayStyle??0)&16))&&recent.some(e=>e.kind==='hit'&&e.weaponHit)){
     for(let j=0;j<5;j++){w.step();q.audio.update(w);}
     found=true;break;
    }
    if(desired===undefined&&(
     name==='nano-shield'&&recent.some(e=>e.doomsdayEffect==='nano-shield')||
     ['phase-hit','phase-light'].includes(name)&&recent.some(e=>e.doomsdayEffect==='phase-hit')||
     name.startsWith('combo')&&w.time>.65&&w.expedition.doomsday?.dots?.length&&recent.some(e=>e.doomsdayEffect==='phase-hit')||
     name==='nano-ammo'&&w.expedition.doomsday?.dots?.length||
     name==='giant-ranged'&&w.weaponFlights.length||
     ['nano-body','phase-body'].includes(name)&&i===30)) {found=true;break;}
   }
   // The phase collapse deliberately begins 45 ms after impact. A screenshot
   // taken on the trigger tick cannot establish that its visible stage works.
   if(found&&['phase-hit','phase-light','nano-ammo'].includes(name))for(let i=0;i<6;i++){w.step();q.audio.update(w);}
   w.paused=true;q.view.render(1/60,1);
   const model=q.view.gpu.get('thor');
   const sockets=name.startsWith('sword')&&model?[0,.23,.4,.6].map(t=>({t,grip:model.weaponAt('swordHorizontal',t,'SwordGrip'),guide:model.weaponAt('swordHorizontal',t,'SwordGuide')})):undefined;
   // Keep simulation frozen, but bypass the renderer's paused-frame reuse so
   // every sample includes real effects/pose/material updates.
   w.paused=false;
   const before=JSON.stringify(w.captureRun()),costs=[],full=[],part=q.view.doomsdayViews,original=part.update;
   part.update=function(...args){const started=performance.now();try{return original.apply(this,args);}finally{costs.push(performance.now()-started);}};
   for(let i=0;i<65;i++){const started=performance.now();q.view.render(1/60,1);full.push(performance.now()-started);}
   part.update=original;
   const pure=before===JSON.stringify(w.captureRun());w.paused=true;
   const summary=a=>{a=a.slice(5).sort((x,y)=>x-y);return {samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
   return {name,found,sample,sockets,pure,renderCpuMs:summary(full),refitCpuMs:summary(costs),report:q.report()};
  },name);
  await page.screenshot({path:`${out}/refit-${name}.png`});
  result.scenes.push(scene);
  assert.ok(scene.found,name+' trigger not found');
  assert.ok(scene.pure,name+' render changed saved simulation state');
  assert.equal(scene.refitCpuMs.samples,60,name+' effects updates were not measured');
  assert.deepEqual(scene.report.render.errors,[]);
  assert.deepEqual(scene.report.audio.errors,[]);
  console.log(JSON.stringify({name,tick:scene.report.tick,draw:scene.report.render.doomsday,audio:scene.report.audio.nativePlayed}));
 }
 await page.evaluate(()=>window.doomsdayShowcase.load('M-W01',0));
 result.retired=await page.evaluate(()=>window.doomsdayShowcase.report().render.doomsday);
 assert.deepEqual(result.retired,{objects:0,lineVertices:0});
 assert.deepEqual(result.errors,[]);
}catch(e){result.failure=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await server?.close();await fs.writeFile(`${out}/refits.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({scenes:result.scenes.length,errors:result.errors,failure:result.failure}));}
