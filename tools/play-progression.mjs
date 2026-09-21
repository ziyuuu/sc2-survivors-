import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const report={date:new Date().toISOString(),scope:'Normal one-Marine opening and paid production. Read-only state inspection, keyboard/mouse input, no stat, clock, roster or enemy overrides. Scripted play, not human visual approval.',samples:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
let held=new Set(),queued=0,rerolled=false,lastSample=-10,dest;
async function keys(next){for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k))await page.keyboard.down(k);held=next;}
try{
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady);
 await page.locator('[data-action=start]').click();await page.keyboard.press('KeyB');await page.locator('[data-action=build][data-type=barracks]').click();await page.keyboard.press('KeyB');
 for(let i=0;i<600;i++){
  const s=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {time:w.time,stage:w.stage,phase:w.phase,wave:w.wave,wallet:{...w.wallet},anchor:{...w.anchor},allies:w.allies().map(u=>({id:u.id,type:u.unitType,hp:u.hp,x:u.x,z:u.z,action:u.action})),enemies:[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0).map(u=>({x:u.x,z:u.z,hp:u.hp,target:u.attackTarget,pod:u.guardianPod})),pods:w.pods.map(p=>({id:p.id,x:p.x,z:p.z,hp:p.hp,status:p.status,expiresAt:p.expiresAt,landedAt:p.landedAt,guards:p.guardianIds.size})),stats:{...w.stats},barracksReady:w.buildingsOf('barracks')[0]?.remaining<=0,rewards:w.rewards.map(r=>({id:r.id,name:r.name}))};});
  if(s.time-lastSample>=5||s.phase!=='battle'){report.samples.push(s);lastSample=s.time;console.log(JSON.stringify({time:s.time,phase:s.phase,stage:s.stage,hp:s.allies.map(u=>u.hp),enemies:s.enemies.length,kills:s.stats.kills,pods:s.pods}));}
  if(s.phase==='lost'||s.phase==='won'){report.final=s;break;}
  if(s.phase==='reward'){
   await keys(new Set());if(!report.firstStage)report.firstStage=s;
   if(!rerolled){const before=await page.locator('[data-action=reward]').evaluateAll(es=>es.map(e=>e.dataset.id));await page.locator('[data-action=reroll]').click();const after=await page.locator('[data-action=reward]').evaluateAll(es=>es.map(e=>e.dataset.id));report.reroll={before,after};rerolled=true;}
   const cards=await page.locator('[data-action=reward]').evaluateAll(es=>es.map(e=>e.dataset.id));const id=cards.find(c=>c.includes('shield'))??cards.find(c=>c.includes('infantry'))??cards.find(c=>c.includes('minerals'))??cards[0];await page.locator('[data-action=reward][data-id="'+id+'"]').click();report.choice=id;continue;
  }
  if(s.barracksReady&&queued<(s.stats.rescued?2:1)){await page.keyboard.press('KeyB');const train=page.locator('[data-action=train][data-type=marine]');if(await train.isEnabled()){await train.click();queued++;}await page.keyboard.press('KeyB');}
  const pod=s.pods.find(p=>p.status==='active');let next=new Set();if(s.stats.rescued&&!report.firstRescue)report.firstRescue=s;
  if(pod&&!s.stats.rescued){
   // Stop at weapon range rather than run the Marine into melee at the pod centre.
   if(!dest){const dx=s.anchor.x-pod.x,dz=s.anchor.z-pod.z,len=Math.hypot(dx,dz);dest={x:pod.x+dx/len*4,z:pod.z+dz/len*4};}
   if(Math.abs(dest.x-s.anchor.x)>.35)next.add(dest.x>s.anchor.x?'ArrowRight':'ArrowLeft');if(Math.abs(dest.z-s.anchor.z)>.35)next.add(dest.z>s.anchor.z?'ArrowDown':'ArrowUp');
  }
  await keys(next);
  if(s.stats.failed){report.final=s;break;}
  await page.waitForTimeout(pod&&!s.stats.rescued?100:500);
 }
 await keys(new Set());await page.screenshot({path:'reports/local/qa/early-progression.png'});
}finally{await fs.writeFile('reports/local/qa/EARLY_PROGRESSION.json',JSON.stringify(report,null,2));await browser.close();}
