import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';

const base='http://127.0.0.1:15302/preview/zerg-swarm-20261120/';
const browser=await chromium.launch({channel:'msedge',args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1100,height:700}});
page.setDefaultTimeout(120000);
const errors=[];
const profiler=process.env.SC2_SWARM_PROFILE?await page.context().newCDPSession(page):null;
if(profiler)await profiler.send('Profiler.enable');
page.on('pageerror',e=>{errors.push(e.message);console.error('browser',e.message);});
const ready=async(id,rank)=>{
 await page.waitForFunction(([id,rank])=>{const r=window.swarmShowcase?.report();return r&&(r.error||r.ready&&r.option.id==='ZSW-'+id&&r.option.rank===rank);},[id,rank],{timeout:180000});
 const r=await page.evaluate(()=>window.swarmShowcase.report());
 assert.equal(r.error,'');assert.deepEqual(r.modelErrors,[]);
};
const step=t=>page.evaluate(t=>window.swarmShowcase.advance(t),t);
const shot=async name=>{
 if(!process.env.SC2_SWARM_SHOTS)return;
 await mkdir(process.env.SC2_SWARM_SHOTS,{recursive:true});
 await page.screenshot({path:path.join(process.env.SC2_SWARM_SHOTS,name+'.png')});
};
try{
 await page.goto(base+'cards.html?group=density');
 const links=page.locator('nav.swarm-trial-links a');
 assert.equal(await links.count(),9);
 const urls=await links.evaluateAll(els=>els.map(e=>e.href));
 for(const [i,u] of urls.entries()){assert.equal(new URL(u).searchParams.get('rank'),String(i%3+1));}
 await shot('cards');
 await page.goto(base+'?card=ZSW-G01&rank=1');await ready('G01',1);
 for(const id of ['G01','G02']){
  if(id==='G02'){await page.selectOption('#card','ZSW-G02');await ready(id,1);}
  const result=[];
  for(let run=0;run<2;run++){
   if(run){await page.click('#replay');await ready(id,1);}
   const now=await page.evaluate(()=>window.swarmShowcase.report().time);
   await step(Math.max(0,(id==='G01'?4.8:4.9)-now));
   const draws=[];
   for(const target of (id==='G01'?[5.06,5.26,5.46]:[5.12,6.46,6.55,6.7])){
    const t=await page.evaluate(()=>window.swarmShowcase.report().time);
    const sample=profiler&&id==='G01'&&target===5.06;
    if(sample)await profiler.send('Profiler.start');
    const r=await step(Math.max(0,target-t));
    if(sample){
     const {profile}=await profiler.send('Profiler.stop');
     const totals=new Map();
     for(const n of profile.nodes)if(n.hitCount){const fn=n.callFrame.functionName||'(script)';totals.set(fn,(totals.get(fn)??0)+n.hitCount);}
     console.log('delivery CPU samples',run,[...totals].sort((a,b)=>b[1]-a[1]).slice(0,8));
    }
    draws.push(Math.round(r.drawMilliseconds));assert.equal(r.phase,'battle');
    if(id==='G01'&&target===5.26)assert.equal(r.delivered,2);
    if(!run&&(target===5.26||target===6.46||target===6.7))await shot(id+'-'+target);
   }
   result.push(draws);
  }
  console.log('first / replay draw ms',id,JSON.stringify(result));
 }
 for(const [i,u] of (process.argv.includes('--drops')?[]:urls).entries()){
  const id=new URL(u).searchParams.get('card').slice(4),rank=i%3+1;
  if(i%3===0)await page.selectOption('#card','ZSW-'+id);else await page.click('[data-rank="'+rank+'"]');
  await ready(id,rank);
  const r=await step(1);
  assert.equal(r.phase,'battle');assert.ok(r.units.some(u=>u.hero)&&r.units.some(u=>u.swarm));
  const expectedSize=id==='G08'?[.9,.85,.8][rank-1]:id==='N07'?1-rank*.05:1;
  const expectedContact=id==='B09'?[.8,.65,.5][rank-1]:id==='N07'?1-rank*.05:1;
  assert.ok(r.units.every(u=>Math.abs(u.size-expectedSize)<1e-6&&Math.abs(u.contact-expectedContact)<1e-6));
  if(rank===3)await shot(id);
  await page.click('#retreat');const after=await step(1.5);assert.ok(after.anchor.z<r.anchor.z);
  console.log(id,rank,expectedSize,expectedContact,r.units.filter(u=>u.passes).length);
 }
 if(process.argv.includes('--drops')){
  for(const [id,t] of [['W03',.52],['B03',.52],['G04',4.1],['B02',2],['P01',9.25],['P02',10.2]]){
   await page.selectOption('#card','ZSW-'+id);await ready(id,1);
   const r=await step(Math.max(0,t-(await page.evaluate(()=>window.swarmShowcase.report().time))));
   assert.equal(r.phase,'battle');
   if(id==='W03'||id==='B03')assert.ok(r.marks.length);
   if(id==='B02')assert.ok(r.units.some(u=>u.swarm?.origin==='death-split'));
   if(id==='P01')assert.equal(r.units.filter(u=>u.swarm?.origin==='P01').length,9);
   if(id==='P02')assert.equal(r.units.filter(u=>u.swarm?.origin==='P02').length,3);
   console.log('feedback',id,r.time,r.temps,r.marks.length);await shot(id);
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
