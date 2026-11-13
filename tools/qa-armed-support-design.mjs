import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const out=path.resolve('reports/local/armed-support-design-20261111');
const base=pathToFileURL(path.join(out,'卡槽.html')).href;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
const result={date:'2026-11-11',scope:'Production referenceCard and current intermission CSS; candidate copy/art injection, no World, purchase, audio or physical phone validation.',checks:[],errors:[]};
try{
 for(const [name,width,height,mobile]of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});const page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(name+':'+e.message));
  for(const [set,ids]of [['purple','P01,N05,P02'],['node','N01,N05'],['aid','W01,W02,B05']]){
   await page.goto(base+'?ids='+ids,{waitUntil:'load'});await page.locator('.imx-copy').first().waitFor();await page.waitForTimeout(80);
   assert.equal(await page.locator('.im-card').count(),ids.split(',').length);
   const measure=async()=>page.evaluate(()=>({
    layout:document.querySelector('#overlay').getAttribute('data-layout'),
    viewport:[innerWidth,innerHeight],
    pageOverflow:document.documentElement.scrollWidth>innerWidth,
    cards:[...document.querySelectorAll('.im-card')].map(c=>{const q=c.querySelector('.imx-copy'),n=c.querySelector('.imx-name'),b=c.querySelector('.im-card-action'),r=q.getBoundingClientRect();return {id:c.dataset.cardId,text:q.innerText,copyFont:getComputedStyle(q).fontSize,nameFont:getComputedStyle(n).fontSize,nameOverflow:n.scrollWidth>n.clientWidth+1,copySize:[r.width,r.height],detailScroll:[q.clientHeight,q.scrollHeight],action:b.innerText,quality:c.dataset.quality};})}));
   const before=await measure();assert.equal(before.pageOverflow,false);assert.ok(before.cards.every(c=>c.copySize[0]>0&&c.copySize[1]>0&&!c.nameOverflow));
   assert.ok(before.cards.every(c=>c.text.trim().length>0&&!/\d/.test(c.text)),'Default card must have one simple purpose description without numerical rules');
   assert.ok(before.cards.every(c=>c.detailScroll[1]<=c.detailScroll[0]+1),'Default description must be readable without scrolling');
   await page.screenshot({path:path.join(out,`${name}-${set}-brief.png`)});
   const toggle=page.locator('.imx-copy').first();await toggle.scrollIntoViewIfNeeded();await (mobile?toggle.tap():toggle.click());
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');const after=await measure();assert.notEqual(after.cards[0].text,before.cards[0].text);assert.equal(after.pageOverflow,false);
   await page.screenshot({path:path.join(out,`${name}-${set}-detail.png`)});
   await toggle.evaluate(el=>el.scrollTop=el.scrollHeight);await toggle.scrollIntoViewIfNeeded();await (mobile?toggle.tap():toggle.click());assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal((await measure()).cards[0].text,before.cards[0].text);
   result.checks.push({name,set,before,after,pass:true});
  }
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(pathToFileURL(path.join(out,'武装支援-卡面审阅.html')).href,{waitUntil:'load'});
 assert.equal(await page.locator('[data-card]').count(),45);
 const ids=await page.locator('[data-card]').evaluateAll(bs=>bs.map(b=>b.dataset.card));
 for(const id of ids){await page.locator(`[data-card="${id}"]`).click();await page.locator('#sample').scrollIntoViewIfNeeded();await page.frameLocator('#sample').locator(`[data-card-id="${id}"] .imx-copy`).waitFor();assert.ok((await page.locator('#copy').innerText()).startsWith(id));
  const toggle=page.frameLocator('#sample').locator(`[data-card-id="${id}"] .imx-copy`);const brief=(await toggle.innerText()).trim();assert.ok(brief.length>0&&!/\d/.test(brief));await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');const detail=await toggle.innerText();assert.ok(detail.includes(brief));assert.notEqual(detail.trim(),brief);await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal((await toggle.innerText()).trim(),brief);
 }
 result.catalog={count:ids.length,allHaveSimpleDescription:true,allOpenedWithDetails:true,allCollapsedToSimpleDescription:true};assert.equal(result.errors.length,0);result.pass=true;
 await context.close();
}catch(e){result.error=String(e.stack??e);result.pass=false;process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,'ui-checks.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:result.pass,checks:result.checks.length,catalog:result.catalog,error:result.error,errors:result.errors}));}
