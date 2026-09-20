import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const continuous=process.env.SC2_PLAY_CONTINUOUS==='1';
const report={method:'Normal stage 1: keyboard input only; diagnostic API is read for positions, no state overrides or time acceleration.',movement:continuous?'continuous route':'short bounds',samples:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady);
 await page.getByRole('button',{name:/部署小队/}).click();
 await page.keyboard.press('KeyB');await page.locator('[data-action="build"][data-type="barracks"]').click();await page.keyboard.press('KeyB');
 const route=[{x:0,z:-18},{x:-8,z:-30},{x:-28,z:-38},{x:-42,z:-24},{x:-43,z:14},{x:-28,z:40},{x:7,z:44},{x:30,z:37},{x:43,z:10}];
 let target=0,held=new Set(),queued=false;
 for(let i=0;i<150;i++){
  const state=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {...window.__SC2_REPORT__(),anchor:{...w.anchor},allies:w.allies().map(u=>({type:u.unitType,hp:u.hp,x:u.x,z:u.z,mode:u.mode})),barracksReady:w.buildings.get('barracks')?.remaining<=0};});
  if(i%10===0||state.phase!=='battle'){report.samples.push(state);console.log(JSON.stringify({time:state.time,phase:state.phase,allies:state.allies.map(u=>u.type+':'+Math.round(u.hp)),kills:state.stats.kills,stretch:state.maxStretch}));}
  if(state.phase!=='battle'){report.final=state;break;}
  if(state.barracksReady&&!queued){await page.keyboard.press('KeyB');const button=page.locator('[data-action="train"][data-type="marine"]');if(await button.isEnabled()){await button.click();queued=true;}await page.keyboard.press('KeyB');}
  let waypoint=route[target];if(Math.hypot(waypoint.x-state.anchor.x,waypoint.z-state.anchor.z)<2){target=(target+1)%route.length;waypoint=route[target];}
  const next=new Set();
  // Move in short bounds so the firing line can regroup; continuous flight is not a win criterion.
  if(continuous||i%8<3){const dx=waypoint.x-state.anchor.x,dz=waypoint.z-state.anchor.z;if(Math.abs(dx)>1)next.add(dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dz)>1)next.add(dz>0?'ArrowDown':'ArrowUp');}
  for(const key of held)if(!next.has(key))await page.keyboard.up(key);
  for(const key of next)if(!held.has(key))await page.keyboard.down(key);held=next;
  await page.waitForTimeout(500);
 }
 for(const key of held)await page.keyboard.up(key);
 await page.screenshot({path:'reports/local/qa/normal-play-stage.png'});
}finally{await fs.writeFile(`reports/local/qa/NORMAL_PLAY_${continuous?'continuous':'bounds'}.json`,JSON.stringify(report,null,2));await browser.close();}
