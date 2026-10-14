import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('reports/local/mvp1-intermission-design-20261013',process.env.MVP1_QA_REVISION??'r13');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({reducedMotion:'reduce'}),checks=[],images=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith('http://127.0.0.1:4387/'))external.push(r.url());});
const screen=async(name)=>{await page.screenshot({path:path.join(out,name+'.png')});images.push(name+'.png');};
let failure;
try{
 for(const [layout,viewport] of [['desktop',{width:1440,height:900}],['short-desktop',{width:1280,height:720}],['portrait',{width:390,height:844}]]){
  await page.setViewportSize(viewport);
  for(const [race,expected,target] of [['terran','重工厂','factory'],['protoss','传送门','gateway'],['zerg','地面进化','zerg.evolution']]){
   await page.goto(`http://127.0.0.1:4387/?race=${race}&scene=prerequisite`,{waitUntil:'load'});
   const wallet=await page.locator('.im-wallet').innerText(),refresh=await page.locator('.im-refresh>span').innerText();
   assert.equal(await page.locator('.im-card').count(),0);assert.equal(await page.locator('.wb-prerequisite h2').innerText(),expected);assert.equal(await page.locator('.wb-prerequisite .missing-icon').count(),0);
   assert.equal(await page.locator('[data-action="refresh"]').isDisabled(),true);
   const icon=await page.locator('.wb-prerequisite-art>img,.wb-prerequisite-art>.wb-facility-icon').evaluate(async el=>{
    const url=el instanceof HTMLImageElement?el.src:getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    const decoded=new Image();decoded.src=url??'';await decoded.decode();return {ready:decoded.naturalWidth>0,width:el.getBoundingClientRect().width};
   });assert.ok(icon.ready&&icon.width===28);const frame=await page.locator('.wb-prerequisite-art').boundingBox();assert.equal(frame.width,28);assert.equal(frame.height,28);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const hint=await page.locator('.wb-prerequisite-card').boundingBox(),footer=await page.locator('.im-footer').boundingBox();
   if(layout!=='portrait')assert.ok(hint.y+hint.height<=footer.y+1,'Prerequisite card overlaps footer');
   await screen(race+'-'+layout+'-prerequisite-icons');
   await page.locator('.wb-prerequisite [data-action="direction"]').click();
   assert.equal(await page.locator(`.im-direction [data-line="${target}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator(`.im-direction [data-line="${target}"]`).evaluate(el=>el===document.activeElement),true);
   assert.ok(await page.locator('.im-card').count()>0);assert.equal(await page.locator('.im-wallet').innerText(),wallet);assert.equal(await page.locator('.im-refresh>span').innerText(),refresh);
   checks.push(race+' '+layout+': decoded prerequisite icon, no text placeholder or overflow, shortcut changes direction only and restores keyboard focus');
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){failure=String(e);await screen('prerequisite-icons-failure');}
finally{fs.writeFileSync(path.join(out,failure?'prerequisite-icons-failure.json':'prerequisite-icons.json'),JSON.stringify({scope:'Prerequisite icon presentation and direction navigation only',checks,images,errors,external,failure},null,2));await browser.close();}
console.log(JSON.stringify({checks:checks.length,images:images.length,errors,failure}));if(failure)process.exitCode=1;
