import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const rescueOnly=process.env.SC2_QA_RESCUE_ONLY==='1';
const report={method:'Diagnostic functional playthrough: 20 Rank-1 starting soldiers and a fixed first landing at (8,0). Normal HP, weapon data, waves, resources, construction/production clocks and 1x simulation. No damage injection, invulnerability or forced stage completion. This is not default-roster balance acceptance.',errors:[]};
if(rescueOnly)report.method='Isolated rescue fixture: 20 Rank-1 soldiers, a paid Barracks preset as completed, a paid Marine job running its full production time, fixed landing at (8,0). Player moves to the landing area before completion. Normal HP, damage, waves and 1x time; not default-roster balance acceptance.';
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady);
 await page.getByRole('button',{name:/部署小队/}).click();
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.entities.clear();for(const t of ['marine','hellion','tank','medivac'])for(let i=0;i<5;i++){const u=w.addUnit(t,'terran',0,0);const p=w.moveGoal(u);u.x=p.x;u.z=p.z;u.prev={...p};}const spawn=w.spawnPod.bind(w);w.spawnPod=(type,position,id)=>spawn(type,position??{x:8,z:0},id);w.changed();});
 await page.keyboard.press('KeyB');await page.locator('[data-action="build"][data-type="barracks"]').click();await page.keyboard.press('KeyB');
 let queued=false;
 if(rescueOnly){await page.evaluate(()=>{window.__SC2_DEBUG__.world.buildings.get('barracks').remaining=0;});await page.keyboard.press('KeyB');await page.locator('[data-action="train"][data-type="marine"]').click();await page.keyboard.press('KeyB');queued=true;}
 else{
 for(let i=0;i<34;i++){
  await page.waitForTimeout(2000);const state=await page.evaluate(()=>({...window.__SC2_REPORT__(),barracksReady:window.__SC2_DEBUG__.world.buildings.get('barracks').remaining<=0}));
  if(i%7===0||state.phase!=='battle')console.log('Combat playthrough',JSON.stringify(state));
  if(state.phase!=='battle'){report.firstStage=state;break;}
  if(state.barracksReady&&!queued){await page.keyboard.press('KeyB');await page.locator('[data-action="train"][data-type="marine"]').click();await page.keyboard.press('KeyB');queued=true;}
 }
 assert.equal(report.firstStage?.phase,'reward');assert.equal(report.firstStage.time,60);
 await page.locator('[data-action="reroll"]').click();await page.locator('[data-action="reward"]').first().click();
 }
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1400);await page.keyboard.up('ArrowRight');
 for(let i=0;i<25;i++){
  await page.waitForTimeout(2000);const pods=await page.evaluate(()=>window.__SC2_DEBUG__.world.pods.map(p=>({id:p.id,type:p.unitType,status:p.status,hp:p.hp,landedAt:p.landedAt,resolvedAt:p.resolvedAt,recruit:p.recruitId})));
  if(pods[0]&&pods[0].status!=='active'){report.firstPod=pods[0];console.log('First rescue',JSON.stringify(pods[0]));break;}
 }
 assert.equal(report.firstPod?.status,'rescued');
 await page.evaluate(()=>window.__SC2_DEBUG__.world.spawnPod('hellion',{x:40,z:-40}));
 for(let i=0;i<18;i++){
  await page.waitForTimeout(2000);const p=await page.evaluate(()=>{const p=window.__SC2_DEBUG__.world.pods.at(-1);return {status:p.status,hp:p.hp,landedAt:p.landedAt,resolvedAt:p.resolvedAt};});if(p.status!=='active'){report.abandonedPod=p;break;}
 }
 assert.ok(['destroyed','expired'].includes(report.abandonedPod?.status));
 report.final=await page.evaluate(()=>window.__SC2_REPORT__());
 await page.screenshot({path:'reports/local/qa/combat-playthrough.png'});
 console.log('Diagnostic combat flow passed',JSON.stringify(report.final));
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await fs.writeFile(`reports/local/qa/${rescueOnly?'COMBAT_RESCUE':'COMBAT_PLAYTHROUGH'}.json`,JSON.stringify(report,null,2));await browser.close();}
