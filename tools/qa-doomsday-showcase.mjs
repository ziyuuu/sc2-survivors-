import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-20261117',base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';await fs.mkdir(out,{recursive:true});
const ids=(process.env.DOOMSDAY_QA_CARDS??['W','G','B','P','N','O'].flatMap((p,i)=>Array.from({length:[9,9,9,6,9,3][i]},(_,j)=>'M-'+p+String(j+1).padStart(2,'0'))).join(',')).split(',');
const boss=process.env.DOOMSDAY_QA_BOSS==='1';
const reportPath=`${out}/${boss?'showcase-boss':ids.length===45?'showcase':'showcase-focused'}.json`;
const server=process.env.DOOMSDAY_QA_SERVE?await (await import('vite')).createServer({server:{host:'127.0.0.1',port:Number(new URL(base).port),strictPort:true,hmr:false},optimizeDeps:{entries:['preview/doomsday-showcase-20261117/index.html']}}):null;await server?.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']}),result={cards:[],errors:[]};let page;
try{page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text().slice(0,500));});page.on('response',r=>{if(r.status()>=400)result.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(base+'/preview/doomsday-showcase-20261117/?card='+ids[0],{timeout:180000});await page.waitForFunction(()=>window.doomsdayShowcase?.report().ready,null,{timeout:300000});
 for(const id of ids)for(const variant of id.startsWith('M-N')?[0,1,2]:id==='M-O02'?[1,2]:[1]){
  await page.evaluate(({id,variant,boss})=>window.doomsdayShowcase.load(id,variant,boss),{id,variant,boss});await page.waitForFunction(()=>window.doomsdayShowcase.report().ready,null,{timeout:300000});
  const before=await page.evaluate(()=>window.doomsdayShowcase.report());await page.evaluate(()=>window.doomsdayShowcase.audio.start());let after;
  for(let i=0;i<12;i++){after=await page.evaluate(()=>window.doomsdayShowcase.advance(1));if(i===1&&variant===1)await page.screenshot({path:`${out}/${id}${boss?'-boss':''}.png`});}
  assert.equal(after.tick,720);assert.deepEqual(after.errors,[]);assert.deepEqual(after.render.errors,[]);assert.deepEqual(after.audio.errors,[]);
  result.cards.push({id,variant,before,after});await fs.writeFile(reportPath,JSON.stringify(result,null,2));console.log(JSON.stringify({id,variant,damage:after.totals.damage,events:after.events,errors:result.errors.length}));
 }
 if(process.env.DOOMSDAY_QA_VISUAL){
  result.visual=[];
  for(const id of ['M-G06','M-B07','M-P06','M-O02','M-O03']){
   await page.evaluate(id=>window.doomsdayShowcase.load(id,1),id);
   await page.evaluate(()=>window.doomsdayShowcase.replay(true));await page.waitForTimeout(3500);await page.evaluate(()=>window.doomsdayShowcase.world.paused=true);
   if(id==='M-G06')await page.evaluate(()=>{const q=window.doomsdayShowcase;for(let i=0;i<120;i++){q.advance(1/60);if(q.world.effects.some(e=>e.kind==='flame'&&q.world.entities.get(e.source)?.doomsday?.special==='M-G06'&&e.until-q.world.time>.25)){q.advance(.12);break;}}});
   await page.screenshot({path:`${out}/${id}-live.png`});result.visual.push({id,report:await page.evaluate(()=>window.doomsdayShowcase.report())});
  }
  for(const hero of ['raynor','tychus','nova','swann','tosh']){
   await page.evaluate(hero=>window.doomsdayShowcase.driver(hero),hero);await page.evaluate(()=>window.doomsdayShowcase.replay(true));await page.waitForTimeout(2400);await page.evaluate(()=>window.doomsdayShowcase.world.paused=true);await page.screenshot({path:`${out}/O01-${hero}.png`});const state=await page.evaluate(()=>window.doomsdayShowcase.report());assert.ok(state.heroes.find(h=>h.id===hero)?.skillReady>0,hero+' native skill did not start');result.visual.push({hero,report:state});
  }
  await page.evaluate(()=>window.doomsdayShowcase.load('M-W01',0));const final=await page.evaluate(()=>window.doomsdayShowcase.report());assert.deepEqual(final.render.doomsday,{objects:0,lineVertices:0});result.retired=final.render.doomsday;
 }
 if(result.errors.length)throw Error('Browser errors: '+result.errors.slice(0,3).join('; '));
}catch(e){result.failure=String(e.stack??e);result.last=await page?.evaluate(()=>({state:document.querySelector('#state')?.textContent,report:window.doomsdayShowcase?.report()})).catch(()=>null);process.exitCode=1;}
finally{await browser.close();await server?.close();await fs.writeFile(reportPath,JSON.stringify(result,null,2));console.log(JSON.stringify({completed:result.cards.length,errors:result.errors.slice(0,10),failure:result.failure}));}
