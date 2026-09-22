import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='reports/local/qa-v9-opening';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Desktop Chrome 1440x900. First stage uses keyboard input at normal time with no HP, resource, spawn or clock edits. Script outcome is an observation, never a Normal balance gate. Only one opening observation, no automatic Normal acceptance gate. Screenshots remain local; no human visual approval.',errors:[],samples:[],terrain:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:90000});
 report.icons=await p.evaluate(async()=>{const {ASSETS,assetUrl}=await import('/src/assets/manifest.ts');return Promise.all([...ASSETS.values()].filter(a=>a.kind==='icon').map(async a=>{const img=new Image();img.src=assetUrl(a.id);await img.decode();return {id:a.id,width:img.naturalWidth,height:img.naturalHeight};}));});assert.equal(report.icons.length,23);
 await p.getByRole('button',{name:/部署小队/}).click();await p.evaluate(async()=>{const {PlayPolicy}=await import('/tools/play-policy.ts');window.__policy=new PlayPolicy();});
 let lastSample=-30;const held=new Set(),deadline=Date.now()+210000;
 while(Date.now()<deadline){const state=await p.evaluate(()=>{const w=window.__SC2_DEBUG__.world;if(w.phase==='battle')window.__policy.update(w);return {phase:w.phase,time:w.time,input:{...w.input},stats:{...w.stats},wallet:{...w.wallet},units:w.allies().length};});
  if(state.time-lastSample>=30||state.phase!=='battle'){report.samples.push(state);lastSample=state.time;await p.screenshot({path:`${out}/opening-${Math.floor(state.time)}.png`});console.log('Opening observation',JSON.stringify(state));}
  if(state.phase!=='battle'){report.opening=state;break;}const want=new Set();if(state.input.x>.28)want.add('ArrowRight');if(state.input.x<-.28)want.add('ArrowLeft');if(state.input.z>.28)want.add('ArrowDown');if(state.input.z<-.28)want.add('ArrowUp');for(const key of held)if(!want.has(key)){await p.keyboard.up(key);held.delete(key);}for(const key of want)if(!held.has(key)){await p.keyboard.down(key);held.add(key);}await p.waitForTimeout(150);
 }
 for(const key of held)await p.keyboard.up(key);assert.ok(report.opening,'Opening observation timed out');
 if(report.opening.phase==='reward'){report.clear=await p.locator('.clear-reward').innerText();await p.locator('[data-action=skip]').click();assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.rewardRound),'random');await p.locator('[data-action=skip]').click();assert.equal(await p.evaluate(()=>window.__SC2_DEBUG__.world.stage),2);report.twoRoundsSkipped=true;}
 assert.deepEqual(report.errors,[]);console.log('Opening observation and 23 icons completed');
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await fs.writeFile(out+'/REPORT.json',JSON.stringify(report,null,2));await browser.close();}
