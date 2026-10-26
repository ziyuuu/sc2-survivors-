import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {browserRun} from './v03-browser-helper.mjs';
const run='t01-menu-bar-r1',env=await browserRun(run,'T01 suspected menu battle-bar leak. Actual normal production entry and mouse navigation; CSS proposal injected only into this disposable page after before evidence.',{native:true,variant:'dense-final-r1',port:0,profile:path.resolve('reports/local/t01-20261024/menu-bar-profile')});const {page,report,shot}=env;
const inspect=()=>page.evaluate(()=>{const e=document.querySelector('#topbar'),r=e.getBoundingClientRect(),s=getComputedStyle(e),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {phase:document.body.dataset.uiPhase,display:s.display,rect:{x:r.x,y:r.y,width:r.width,height:r.height},text:e.innerText,painted:e===at||e.contains(at),hit:at?.outerHTML.slice(0,240),hudMode:document.querySelector('#interface').dataset.hudMode};});
try{
 await page.goto(env.base);await page.locator('[data-action="menu-new"]').waitFor({state:'visible',timeout:180000});
 for(const [index,action]of ['', 'menu-new','menu-race-next','menu-difficulty-next'].entries()){
  if(action)await page.locator(`[data-action="${action}"]:visible`).click();
  await page.waitForTimeout(250);
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);const before=await inspect();await shot(`${index}-${width}-before`);
   await page.addStyleTag({content:'body[data-ui-phase=menu] #interface.native-hud[data-hud-mode] #topbar{display:none}'}).then(el=>el.evaluate(e=>e.id='t01-proposal'));
   const after=await inspect();await shot(`${index}-${width}-proposal`);assert.equal(after.display,'none');await page.locator('#t01-proposal').evaluate(e=>e.remove());report.checks.push({index,action,width,height,before,after});}
 }
 report.pass=report.errors.length===0;report.productionModified=false;report.menuBarReproduced=report.checks.some(r=>r.before.painted);report.proposalNeedsUserApproval=true;
}catch(e){report.failure=String(e);report.pass=false;process.exitCode=1;}
finally{await env.close();await fs.writeFile('reports/local/t01-20261024/menu-bar-result.json',JSON.stringify({report:env.root+'/report.json',source:'normal-production-entry',menuBarReproduced:report.menuBarReproduced,productionModified:false,pass:report.pass,failure:report.failure},null,2));}
