import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out='reports/local/qa-hero-readability';
await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
 await page.locator('[data-action=start]').click();
 const acquired=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=true;return ['raynor','tychus','nova'].map(id=>w.acquireHero(id));});
 assert.deepEqual(acquired,[true,true,true]);
 await page.waitForFunction(()=>{const v=window.__SC2_DEBUG__.view;return v.assetsPending===0&&['raynor','tychus','nova'].every(id=>v.gpu.has('hero.'+id));},null,{timeout:240000});
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=false;w.changed();});
 await page.waitForFunction(()=>[...document.querySelectorAll('.hero-world-label')].filter(el=>!el.hidden&&el.textContent?.trim()).length===3);
 const inspect=()=>page.evaluate(()=>{
  const v=window.__SC2_DEBUG__.view,heroes=[...document.querySelectorAll('.hero-world-label')].filter(el=>!el.hidden).map(el=>{const r=el.getBoundingClientRect(),portrait=el.querySelector('img');return {hero:el.dataset.hero,name:el.querySelector('.unit-label-title')?.textContent,state:el.querySelector('.hero-world-state')?.textContent,portraitLoaded:portrait?.naturalWidth>0,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
  return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,auras:v.heroAuras.count,heroes,errors:v.modelErrors};
 });
 report.desktop=await inspect();assert.equal(report.desktop.auras,3);assert.equal(report.desktop.heroes.length,3);assert.ok(report.desktop.heroes.every(h=>h.portraitLoaded&&h.width>=150&&h.state?.includes('就绪')&&h.left>=0&&h.right<=1440));assert.deepEqual(report.desktop.errors,[]);
 report.checks.push('three original hero portraits, names, ability-ready states and color-coded world auras are present at 1440x900');
 await page.screenshot({path:out+'/heroes-desktop.png'});
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,u=w.heroEntity('nova');u.lastSkillAt=w.time;window.__SC2_DEBUG__.view.render(0,1);});
 const cast=await page.locator('.hero-world-label[data-hero=nova] .hero-action').evaluate(el=>({hidden:el.hidden,text:el.textContent}));assert.equal(cast.hidden,false);assert.ok(cast.text.includes('诺娃')&&cast.text.includes('狙击'));report.cast=cast;report.checks.push('Nova skill moment identifies its caster without changing combat state');
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>[...document.querySelectorAll('.hero-world-label')].filter(el=>!el.hidden).length===3);
 report.mobile=await inspect();assert.equal(report.mobile.auras,3);assert.ok(report.mobile.heroes.every(h=>h.portraitLoaded&&h.width<=132&&h.left>=0&&h.right<=390));assert.ok(report.mobile.scrollWidth<=390);report.checks.push('three hero beacons remain in bounds with no horizontal overflow at 390x844');
 await page.screenshot({path:out+'/heroes-narrow.png'});
 assert.deepEqual(report.errors,[]);
 await page.close();
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
