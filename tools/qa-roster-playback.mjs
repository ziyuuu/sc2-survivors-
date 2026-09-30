import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.env.QA_OUT??'reports/local/hero-iteration/roster-playback';
await fs.mkdir(out,{recursive:true});
const report=process.env.QA_RESUME==='1'?JSON.parse(await fs.readFile(out+'/progress.json','utf8')):{method:'Visible Chrome; every ordinary/elite identity runs the real fixed-step World with isolated durable, immobilized targets and researched abilities. Local diagnostic videos, not natural performance, balance or human approval.',rows:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});
let page;
try {
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5181');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.exposeFunction('saveRosterFilm',async(id,bytes)=>fs.writeFile(out+'/'+id+'.webm',Buffer.from(bytes,'base64')));
 let started=false;for(const race of (process.env.QA_RACES??'terran,zerg,protoss').split(',')){
  if(started){
   await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=false;w.changed();});
   await page.locator('#topbar [data-action=pause]').click();
   await page.locator('[data-action=restart]').click();
  }
  await page.locator('[data-action=menu-new]').click();
  await page.locator(`[data-action=menu-race][data-race=${race}]`).click();
  await page.locator('[data-action=menu-race-next]').click();
  await page.locator('[data-action=menu-difficulty-next]').click();
  await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:600000});
  assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'ready');
  await page.locator('[data-action=flow-continue]').click();
  await page.evaluate(()=>{
   const d=window.__SC2_DEBUG__,w=d.world;
   Object.defineProperty(d,'speed',{configurable:true,get:()=>0,set:()=>{}});
   w.autoWaves=false;w.sandbox=true;w.stage=1;w.terrain.setStage(18);w.hive=null;
   for(const p of Object.values(w.expedition.production))p.enabled={};
   Object.assign(w.expedition.tech,{storm:1,charge:1,blink:1,cloak:1,stim:1,hellbat:1,'unlock.hellion':1});w.upgrades.set('stim',1);
  });
  started=true;const identities=await page.evaluate(async race=>{
   const {ALL_FAMILIES,familyRace}=await import('/src/data/races.ts'),{ELITES}=await import('/src/data/elites.ts');
   return [...ALL_FAMILIES.filter(f=>familyRace(f)===race).map(f=>({id:f,family:f})),...Object.values(ELITES).filter(e=>familyRace(e.family)===race).map(e=>({id:e.id,family:e.family,elite:e.id,model:e.model,mechanism:e.description}))];
  },race);
  for(const identity of identities){if(report.rows.some(row=>row.id===identity.id))continue;
   const row=await page.evaluate(async row=>{
    const {world:w,view:v}=window.__SC2_DEBUG__;
    w.entities.clear();w.heroes.clear();w.weaponFlights=[];w.heroCasts=[];w.visualEvents=[];w.effects=[];w.pods=[];w.economicTargets.clear();w.pickups=[];w.rewardDrops=[];w.expedition.spells=[];
    w.phase='battle';w.paused=false;w.stageElapsed=0;w.anchor={x:0,z:0,facing:Math.PI};w.cancelOrder();w.anchorStoppedFor=1;v.resetRun();
    const actor=w.addUnit(row.family,'terran',0,2);
    if(row.elite){actor.eliteId=row.elite;actor.modelKey=row.model;w.refreshStats(actor,true);}
    actor.facing=actor.attackFacing=Math.PI;actor.energy=actor.maxEnergy;actor.hp=actor.maxHp*.6;actor.lastDamagedAt=w.time-12;
    const rangedTarget=['viking','phoenix','corruptor'].includes(row.family)?'mutalisk':'roach';
    const targets=[];
    for(let i=0;i<3;i++){
     const target=w.addUnit(rangedTarget,'zerg',(i-1)*1.2,row.family==='tank'?-5:-1.3);
     target.hp=target.maxHp=1e6;target.stoppedUntil=Infinity;targets.push(target);
    }
    const patients=[];
    for(let i=0;i<3;i++){
     const patient=w.addUnit(row.family==='science_vessel'?'stalker':'roach','terran',i-1,3.5);
     patient.hp=patient.maxHp*.1;patient.stoppedUntil=Infinity;patients.push(patient);
    }
    w.hash.rebuild(w.entities.values());
    if(row.family==='lurker')w.setFamilyMode('lurker','lurker_burrowed');
    if(row.family==='tank')w.setFamilyMode('tank','siege');
    if(['marine','marauder'].includes(row.family))w.stim();
    if(row.family==='banshee')w.castFamilyAbility('banshee');
    await v.prepareRosterAssets();
    const parts=[],stream=document.querySelector('#battle').captureStream(30);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:700000});
    recorder.ondataavailable=e=>parts.push(e.data);recorder.start();
    const events=[],spellKinds=new Set(),startHealed=w.stats.healed,startTime=w.time;
    const operations=[],frames=['tank','ravager','lurker','hellion','viking'].includes(row.family)?420:300;
    for(let f=0;f<frames;f++){
     if(f===150&&row.family==='stalker')operations.push({kind:'blink',ok:w.castFamilyAbility('stalker',{x:2,z:1})});
     if(f===150&&row.family==='hellion')operations.push({kind:'hellbat',ok:w.setFamilyMode('hellion','hellbat')});
     if(f===150&&row.family==='viking'){const ground=w.addUnit('roach','zerg',0,-4);ground.hp=ground.maxHp=1e6;ground.stoppedUntil=Infinity;targets.push(ground);operations.push({kind:'assault',ok:w.setFamilyMode('viking','viking_assault')});}
     if(row.family==='immortal'&&f===45)w.hit(actor,10,[],1,'zerg',0,0,targets[0].id);
     w.step();
     for(const e of w.visualEvents)if(e.serial>(events.at(-1)?.serial??0))events.push(e);
     for(const spell of w.expedition.spells)spellKinds.add(spell.kind);
     v.render(1/60,1);await new Promise(resolve=>setTimeout(resolve,16));
    }
    const support=['medivac','science_vessel'].includes(row.family);
    const attacks=events.filter(e=>e.kind==='attack'&&(e.entityId===actor.id||row.family==='carrier'&&w.entities.get(e.entityId)?.summonOwnerId===actor.id)).length;
    const result={...row,simulationSeconds:w.time-startTime,attacks,healed:w.stats.healed-startHealed,damage:targets.reduce((n,t)=>n+1e6-t.hp,0),spells:[...spellKinds],operations,selfHp:actor.hp,maxHp:actor.maxHp,mode:actor.nativeMode??actor.mode,recovery:actor.recoveryUntil??null,shield:actor.shield,barrier:actor.barrier,events:[...new Set(events.filter(e=>e.entityId===actor.id).map(e=>e.kind))],support,coreDrops:v.fx.sculptures.stats.coreDropped,errors:v.report().errors};
    w.hit(actor,1e9,[],1,'zerg');
    for(let f=0;f<90;f++){w.step();v.render(1/60,1);await new Promise(resolve=>setTimeout(resolve,16));}
    result.deathEvent=w.visualEvents.some(e=>e.kind==='death'&&e.entityId===actor.id);
    await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(t=>t.stop());
    await window.saveRosterFilm(row.id,await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(parts));}));
    return result;
   },identity);
   report.rows.push(row);
   assert.deepEqual(row.errors,[],identity.id);
   assert.ok(row.support?row.healed>0:row.attacks>0||row.damage>0,identity.id+' must produce actual attack/healing');
   assert.equal(row.deathEvent,true,identity.id+' death event');
   await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));
  }
 }
 assert.equal(report.rows.length,120);assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page){await page.screenshot({path:out+'/failure.png'});report.state=await page.evaluate(()=>window.__SC2_REPORT__?.());}}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({rows:report.rows.length,failure:report.failure??null,errors:report.errors}));}
