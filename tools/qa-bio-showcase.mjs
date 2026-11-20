import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const base=process.env.SC2_QA_URL??'http://127.0.0.1:5199';
// Compare the upper body against the same patch of sky in the same seeded fight.
// This catches a transparent material even when both mesh instance counts are correct.
async function checkOverlordPixels(page){
 const carrier=await page.evaluate(()=>window.bioShowcase.overlordReport());
 assert.equal(carrier?.key,'overlord');
 assert.ok(carrier.instances.length&&carrier.instances.every(n=>n===1));
 const bounds=await page.locator('#battle').boundingBox();
 const [nx,ny]=carrier.center;
 const clip={x:Math.round(bounds.x+(nx+1)*bounds.width/2)-12,y:Math.round(bounds.y+(1-ny)*bounds.height/2)-9,width:24,height:18};
 const held=(await page.screenshot({clip})).toString('base64');
 await page.evaluate(async()=>{const s=window.bioShowcase;await s.load('BIO-B05',0);s.advance(2);});
 assert.equal(await page.evaluate(()=>window.bioShowcase.overlordReport()),null);
 const empty=(await page.screenshot({clip})).toString('base64');
 const pixels=await page.evaluate(async frames=>{
  const images=await Promise.all(frames.map(async data=>{
   const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
   const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
   const ctx=new OffscreenCanvas(bitmap.width,bitmap.height).getContext('2d');
   ctx.drawImage(bitmap,0,0);bitmap.close();return ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height).data;
  }));
  let changed=0,white=0;for(let i=0;i<images[0].length;i+=4){
   const diff=[0,1,2].some(k=>Math.abs(images[0][i+k]-images[1][i+k])>15);
   if(diff)changed++;
   if(Math.min(images[0][i],images[0][i+1],images[0][i+2])>80)white++;
  }
  return {changed,white};
 },[held,empty]);
 assert.ok(pixels.changed>70,`Expected visible Overlord body pixels, saw ${pixels.changed}`);
 assert.ok(pixels.white<8,`Persistent white spot on the Overlord: ${pixels.white} pixels`);
 console.log('Overlord body pixels',pixels);
}
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>{errors.push(String(e));console.error(e.stack);});
 page.on('console',msg=>{if(msg.type()==='error'){const text=msg.text();console.error(text.slice(0,300));if(/Shader Error|VALIDATE_STATUS|GL_INVALID_OPERATION/.test(text))errors.push(text.slice(0,300));}});
 page.on('response',r=>{if(r.status()>=400){const message=r.status()+' '+r.url();errors.push(message);console.error(message.slice(0,200));}});
 const first=process.argv[2];await page.goto(base+'/preview/bio-synergy-20261118/'+(first?'?card='+first:''),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.bioShowcase?.report().ready||window.bioShowcase?.report().error,{},{timeout:300000});
 const selected=await page.locator('#card option').evaluateAll(es=>es.map(e=>e.value));assert.equal(selected.length,45);
 for(const id of first?[first]:selected){
  const result=await page.evaluate(async id=>{const s=window.bioShowcase;await s.load(id,1);return s.advance(2);},id);
  assert.equal(result.error,'',id);assert.ok(result.time>=2,id);assert.deepEqual(result.models,[],id);
  assert.equal(new URL(page.url()).pathname,'/preview/bio-synergy-20261118/');
  if(id==='BIO-W02'){
   const poisoned=result.units.find(u=>u.bio?.poisons?.some(p=>p.kind==='venom'));
   assert.ok(poisoned);
   const venomDraws=()=>window.bioShowcase.effectReport().organic.batches.find(b=>b.key==='venom').count;
   const heldDraws=await page.evaluate(venomDraws);
   const base=await page.evaluate(async()=>{const s=window.bioShowcase;await s.load('BIO-W02',0);return s.advance(2);});
   assert.ok(base.units.every(u=>!u.bio?.poisons?.length));
   assert.ok(base.units.find(u=>u.id===poisoned.id).hp>poisoned.hp);
   assert.ok(heldDraws>await page.evaluate(venomDraws),'holding W02 should draw venom on the target');
  }
  if(id==='BIO-W01')assert.ok(result.units.some(u=>u.role==='hound'));if(id==='BIO-G05')assert.ok(result.units.some(u=>u.role==='twin'));
  if(id==='BIO-B05'){assert.ok(result.units.some(u=>u.role==='overlord'));await checkOverlordPixels(page);}
  if(id==='BIO-O02')assert.ok(result.units.some(u=>u.hero==='kerrigan'));
  const expected={ 'BIO-B02':'shell','BIO-B07':'resistance','BIO-B08':'barrier','BIO-P01':'ultralisk','BIO-P05':'strain','BIO-P06':'molt','BIO-N04':'plague','BIO-O01':'ascended','BIO-O02':'queen','BIO-O03':'ascended' }[id];
  if(expected){
   const cues=await page.evaluate(()=>window.bioShowcase.effectReport().bio);
   assert.ok(cues[expected]>0,`${id} missing ${expected}`);
   if(id.startsWith('BIO-O')){
    assert.equal(cues.organs.eye,cues[expected]*7,id+' compound eyes');
    assert.ok(cues.organs.tendril>=cues[expected]*2,id+' shoulder tendrils');
   }
   if(id==='BIO-P01')assert.ok(cues.organs.tendril>0);
   if(id==='BIO-B07')assert.ok(cues.organs.wet>0&&cues.organs.tendril>0);
   if(id==='BIO-P06'){
    assert.equal(cues.organs.husk,1);assert.ok(cues.organs.wet>0);
    const end=await page.evaluate(()=>{window.bioShowcase.advance(2.6);return window.bioShowcase.effectReport().bio.organs;});
    assert.equal(end.husk,0);assert.equal(end.wet,0);
   }
   const baseline=await page.evaluate(async id=>{const s=window.bioShowcase;await s.load(id,0);s.advance(2);return s.effectReport().bio;},id);
   assert.equal(baseline[expected]??0,0,`${id} retained ${expected} after switching to base`);
   if(id.startsWith('BIO-O'))assert.equal(baseline.organs.eye,0);
  }
  const moment={
   'BIO-G07':[.4,'snare'],'BIO-G09':[1.25,'spread'],'BIO-B02':[.95,'reflect'],
   'BIO-B08':[.95,'absorb'],'BIO-P02':[1.25,'grow'],'BIO-P04':[.4,'predator'],
   'BIO-N01':[.4,'grow'],'BIO-N03':[.9,'stim'],'BIO-N05':[.25,'metabolism'],
   'BIO-N06':[.5,'relay'],'BIO-N07':[3.9,'hatch'],'BIO-N08':[1.6,'recover'],
   'BIO-N09':[.9,'share'],'BIO-O03':[.2,'promote']
  }[id];
  if(moment){
   const cues=await page.evaluate(async([id,seconds])=>{const s=window.bioShowcase;await s.load(id,1);s.advance(seconds);return s.effectReport().bio;},[id,moment[0]]);
   assert.ok(cues[moment[1]]>0,`${id} missing ${moment[1]} at ${moment[0]}s`);
  }
  if(id==='BIO-O03'){assert.ok(result.units.some(u=>u.rank===25&&u.elite==='reaper.3'));assert.ok(result.units.some(u=>u.role==='twin'));}
  if(id==='BIO-B01'){
   const larva=await page.evaluate(async()=>{await window.bioShowcase.load('BIO-B01',1);return window.bioShowcase.advance(.5);});
   assert.ok(larva.units.some(u=>u.role==='hatchling'&&u.hp>0));
  }
  if(id==='BIO-G08'){
   const refund=await page.evaluate(()=>window.bioShowcase.advance(14));
   assert.ok(Math.abs(refund.healed-13.5)<1e-6);
  }
  if(id==='BIO-B07'){
   const untreated=await page.evaluate(async()=>{await window.bioShowcase.load('BIO-B07',0);return window.bioShowcase.advance(2);});
   assert.ok(result.healed>untreated.healed);
  }
  console.log(id,result.phase,result.units.length);
 }
 await page.click('#replay');await page.waitForFunction(()=>window.bioShowcase.report().ready);
 assert.deepEqual(errors,[]);console.log(first??'45/45 browser scenes played');
}finally{await browser.close();}
