import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const origin=(process.env.SC2_QA_URL??'http://127.0.0.1:5199')+'/preview/doomsday-showcase-20261117/';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-attack-fx-20261118';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const results={cases:[],errors:[],interaction:{}};let failed;
page.on('pageerror',e=>results.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text().slice(0,500));});
page.setDefaultTimeout(120000);
const scenes={tiger:5,artillery:4,air:4,overload:4,squad:2};
const important={
 'tiger-4':'bore-hit','artillery-1':'repeat','artillery-2':'bore-hit','artillery-3':'station',
 'air-1':'split-release','air-2':'resonance','air-3':'pincer-spent',
 'overload-1':'phase-hit','overload-2':'nano-dot','overload-3':'nano-dot','squad-1':'sword-hit',
};
try{
 await page.goto(origin+'?group=tiger&stage=0',{timeout:180000});
 await page.waitForFunction(()=>window.doomsdayShowcase?.report().ready,null,{timeout:300000});
 assert.equal(await page.locator('#card optgroup:not(:first-child) option').count(),45);
 assert.equal(await page.locator('#card optgroup:first-child option').count(),5);
 await page.getByRole('button',{name:'重新播放'}).click();
 await page.waitForFunction(()=>window.doomsdayShowcase.world.tick>5&&!window.doomsdayShowcase.world.paused);
 await page.locator('#pause').click();
 await page.waitForFunction(()=>window.doomsdayShowcase.world.paused);
 const tick=await page.evaluate(()=>window.doomsdayShowcase.world.tick);
 await page.waitForTimeout(90);
 assert.equal(await page.evaluate(()=>window.doomsdayShowcase.world.tick),tick);
 await page.locator('#stage').selectOption('3');
 await page.waitForFunction(()=>!window.doomsdayShowcase.report().busy&&location.search.includes('stage=3')&&window.doomsdayShowcase.world.tick>0);
 results.interaction={directLink:true,replay:true,pause:true,stage:true};
 for(const [group,count] of Object.entries(scenes)){
  await page.selectOption('#card',group);
  await page.waitForFunction(g=>window.doomsdayShowcase.report().ready&&window.doomsdayShowcase.report().options.group===g,group);
  for(let stage=0;stage<count;stage++){
   const key=group+'-'+stage,expected=important[key];
   await page.evaluate(async({group,stage})=>{const q=window.doomsdayShowcase;await q.compare(group,stage,false);await q.audio.start();},{group,stage});
   const result=await page.evaluate(({group,stage,expected})=>{
    const q=window.doomsdayShowcase,w=q.world,main=w.allies()[0],effects={},styles=[],rounds=[],segments={},required=expected??'attack';
    const played=()=>Object.values(q.audio.report().nativePlayed).reduce((a,b)=>a+b,0),initialAudio=played();
    let serial=w.visualEvents.at(-1)?.serial??0,found=false,warnings=0,sample,peak=0;
    w.paused=false;
    for(let i=0;i<600;i++){
     w.step();const recent=w.visualEvents.filter(e=>e.serial>serial);serial=recent.at(-1)?.serial??serial;
     q.audio.update(w);
     for(const e of recent){
      if(e.kind==='attack'&&e.entityId===main.id){rounds.push(w.tick);styles.push(e.doomsdayStyle??0);}
      if(e.doomsdayEffect)effects[e.doomsdayEffect]=(effects[e.doomsdayEffect]??0)+1;
      if(e.kind==='projectile-impact'&&e.doomsdaySegment)segments[e.doomsdaySegment]=(segments[e.doomsdaySegment]??0)+1;
     }
     if(w.effects.some(e=>e.kind==='bile'&&e.owner==='zerg'))warnings++;
     if(!found&&(group!=='squad'||stage===0||warnings>0)&&recent.some(e=>e.doomsdayEffect===required||e.kind==='projectile-impact'&&e.doomsdaySegment===required||required==='attack'&&e.kind==='attack'&&e.entityId===main.id)){
      found=true;sample=w.tick+(group==='tiger'&&stage<4?6:2);
     }
     if(w.tick===sample||i%45===0){q.view.render(1/60,1);peak=Math.max(peak,q.view.report().doomsday.objects);}
    }
    if(!found)throw Error(group+' '+stage+' missing '+required+' '+JSON.stringify({effects,segments,rounds}));
    const state={main:main.eliteId??main.unitType,rank:main.rank,rounds,styles:[...new Set(styles)],effects,segments,peak,warnings,sample,played:played()-initialAudio};
    return state;
   },{group,stage,expected});
   assert.ok(result.rounds.length>0,key+' no main attacks');
   if(group==='squad')assert.ok(result.warnings>0,'missing live enemy warning');
   if(group==='tiger'){assert.equal(result.rank,[5,5,8,10,10][stage]);assert.equal(result.styles[0],[0,128,384,896,896][stage]);}
   if(group==='overload'&&stage===3)assert.ok(result.effects['nano-arm']&&result.effects['phase-hit']&&result.effects['nano-dot']);
   const shot=['tiger-0','tiger-1','tiger-2','tiger-3','tiger-4','artillery-3','air-2','overload-3','squad-1'].includes(key);
   if(shot){
    const sample=await page.evaluate(async({group,stage,tick})=>{
     const q=window.doomsdayShowcase,w=q.world;await q.compare(group,stage,false);
     w.paused=false;for(let i=0;i<tick;i++)w.step();
     const before=JSON.stringify(w.captureRun());const times=[],views=[],part=q.view.doomsdayViews,original=part.update;
     part.update=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{views.push(performance.now()-t);}};
     try{for(let i=0;i<24;i++){const t=performance.now();q.view.render(1/60,1);times.push(performance.now()-t);}}finally{part.update=original;}
     const pure=before===JSON.stringify(w.captureRun());w.paused=true;
     const percentile=a=>{a=a.slice(4).sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.ceil(a.length*.95)-1]};};
     const stats=q.report();return {pure,render:stats.render.doomsday,cpu:percentile(times),refit:percentile(views),modelErrors:stats.errors,audioErrors:stats.audio.errors};
    },{group,stage,tick:result.sample});
    assert.ok(sample.pure,key+' changed a run while rendering');
    assert.equal(sample.refit.n,20);assert.deepEqual(sample.modelErrors,[]);assert.deepEqual(sample.audioErrors,[]);
    await page.screenshot({path:out+'/'+key+'.png'});result.sampleView=sample;
   }
   results.cases.push({key,...result});console.log(key+' '+result.main+' '+result.rounds.length+' rounds, sample '+result.sample);
  }
 }
 const ids=await page.locator('#card optgroup:not(:first-child) option').evaluateAll(options=>options.map(o=>o.value));
 results.cards=[];
 for(const card of ids){
  const output=await page.evaluate(async id=>{
   const q=window.doomsdayShowcase;await q.load(id,1,false,{});
   const report=q.advance(2);
   return {card:report.card,tick:report.tick,errors:[...report.errors,...report.audio.errors,...report.render.errors]};
  },card);
  assert.equal(output.card,card);assert.equal(output.tick,120);assert.deepEqual(output.errors,[]);
  results.cards.push(card);
 }
 console.log(results.cards.length+' individual card replays loaded and rendered');
 const tigers=results.cases.filter(v=>v.key.startsWith('tiger'));
 for(const item of tigers)assert.deepEqual(item.rounds,tigers[0].rounds);
 await page.selectOption('#card','M-W01');
 await page.waitForFunction(()=>window.doomsdayShowcase.report().ready&&!window.doomsdayShowcase.report().options.group);
 await page.locator('#base').click();
 await page.waitForFunction(()=>window.doomsdayShowcase.report().ready&&window.doomsdayShowcase.report().variant===0);
 results.retired=await page.evaluate(()=>{const q=window.doomsdayShowcase;q.view.render(1/60,1);return q.report().render.doomsday;});
 assert.deepEqual(results.retired,{objects:0,lineVertices:0});assert.deepEqual(results.errors,[]);
}catch(error){failed=String(error.stack??error);results.failure=failed;process.exitCode=1;}
finally{await browser.close();await fs.writeFile(out+'/summary.json',JSON.stringify(results,null,2));console.log(JSON.stringify({completed:results.cases.length,errors:results.errors,failure:failed}));}
