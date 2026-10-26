import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {browserRun} from './v03-browser-helper.mjs';
const revision=process.argv[2]??'r3';assert.match(revision,/^r\d+$/);
const run='t01-menu-bar-'+revision,root='reports/local/t01-20261024/menu-check-'+revision;
await fs.mkdir(root,{recursive:false});
const env=await browserRun(run,'User-approved menu-only topbar CSS in the current normal production entry. Native mouse navigation through title, race, difficulty and departure confirmation; no injected stylesheet.',{native:true,variant:'t01-ui-confirmed-r1',port:0,profile:path.resolve(root+'/profile')});
const {page,report,shot,cdp}=env;
try{
 report.foreground={scope:'CDP foreground emulation for UI capture in a hidden test window; not native OS focus or performance acceptance.',before:await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus()}))};
 await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await page.bringToFront();await page.goto(env.base);await page.waitForFunction(()=>!document.querySelector('#game-root')?.hasAttribute('inert'),null,{timeout:180000});await page.locator('[data-action="menu-new"]').waitFor({state:'visible',timeout:180000});
 report.foreground.after=await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus()}));
 for(const [index,action]of ['', 'menu-new','menu-race-next','menu-difficulty-next'].entries()){
  if(action)await page.locator(`[data-action="${action}"]:visible`).click();
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   const state=await page.evaluate(()=>{const e=document.querySelector('#topbar'),r=e.getBoundingClientRect();return {phase:document.body.dataset.uiPhase,display:getComputedStyle(e).display,rect:r.toJSON(),text:e.innerText,hudMode:document.querySelector('#interface').dataset.hudMode};});
   await shot(`${index}-${width}-approved`);report.checks.push({index,action,width,height,state});assert.equal(state.phase,'menu');assert.equal(state.display,'none');assert.equal(state.rect.height,0);
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.pass=false;process.exitCode=1;await shot('failure').catch(()=>{});report.failureState=await page.evaluate(()=>({hidden:document.hidden,focused:document.hasFocus(),inert:document.querySelector('#game-root')?.hasAttribute('inert'),opening:document.querySelector('#scs-opening-visual')?.innerText})).catch(()=>null);}
finally{await env.close();await fs.writeFile(root+'/normal-menu.json',JSON.stringify({report:env.root+'/report.json',pass:report.pass,checks:report.checks.length,errors:report.errors.length,profileClosed:report.profileClosed,failure:report.failure},null,2));await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));}
