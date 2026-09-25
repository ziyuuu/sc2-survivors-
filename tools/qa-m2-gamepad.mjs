import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/qa-m2';await fs.mkdir(out,{recursive:true});
const result={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>result.errors.push(error.message));
 await page.addInitScript(()=>{
  const pad={id:'M2 virtual standard controller',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
  window.__M2_PAD__=pad;
 });
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race][data-race=protoss]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 await page.evaluate(()=>{
  const w=window.__SC2_DEBUG__.world;w.runConfig.frozenTalents.levels['P-M04']=1;
  const spot=w.freePosition('zealot',{x:w.anchor.x+2,z:w.anchor.z},0,4);if(!spot)throw Error('No second participant position');
  w.addUnit('zealot','terran',spot.x,spot.z);w.changed();
  document.dispatchEvent(new CustomEvent('sc2-target-family',{detail:'transfer'}));
 });
 await page.waitForFunction(()=>document.querySelectorAll('#transfer-picker [data-transfer-id]').length>=2);
 await page.evaluate(()=>{window.__M2_PAD__.axes[3]=1;});
 await page.waitForFunction(()=>window.__SC2_REPORT__().gamepad.active&&document.querySelectorAll('#transfer-picker [data-transfer-id]')[1]?.classList.contains('gamepad-member-selected'));
 await page.evaluate(()=>{window.__M2_PAD__.axes[3]=0;window.__M2_PAD__.buttons[2].value=1;});
 await page.waitForFunction(()=>document.querySelectorAll('#transfer-picker [data-transfer-id]')[1]?.getAttribute('aria-pressed')==='false');
 await page.evaluate(()=>{window.__M2_PAD__.buttons[2].value=0;});
 await page.waitForTimeout(150);
 await page.evaluate(()=>{window.__M2_PAD__.buttons[1].value=1;});
 await page.waitForFunction(()=>document.querySelector('#transfer-picker')?.hidden===true);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.talentTransferPlan),null);
 result.checks.push('Virtual standard gamepad right stick selects a transfer member, X toggles that member, B cancels without starting a transfer');
 await page.screenshot({path:out+'/gamepad-transfer-cancelled.png'});
 assert.deepEqual(result.errors,[]);
}catch(error){result.failure=String(error?.stack??error);console.error(result.failure);process.exitCode=1;}
finally{await fs.writeFile(out+'/gamepad.json',JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
