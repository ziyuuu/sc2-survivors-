/** Bounded UI checks for the approved 2026-10-29 changes. Synthetic state; no physical-device or natural-campaign claim. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const out=path.resolve('reports/local/zerg-melee-equipment-20261029'),web=path.resolve('dist/zerg-melee-equipment-20261029/web'),site=path.join(out,'ui-site');
await fs.mkdir(out,{recursive:true});
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
const entryOnly=process.argv.includes('--entry-only');
if(!entryOnly){
 const fixture=`import {grantEquipment} from './simulation/starship/inventory';
 startGame(845).then(app=>{globalThis.__QA_APP__=app;globalThis.__QA_SETUP__=(kind)=>{
 const w=app.world;app.readiness.background.tick=()=>{};app.view.render=()=>{};
 if(kind==='evolution'){w.selectRace('zerg');w.expedition.tech['unlock.queen']=1;w.grantFacility('hatchery');w.start();w.paused=true;w.wallet={minerals:10000,gas:10000};w.endStage();}
 else {w.selectRace(kind);for(const [slot,quality] of [['offense1',1],['offense1',3],['defense1',2],['offense2',4]]){const r=grantEquipment(w.starship.account,{template:'attribute.'+quality,race:kind,slot},'qa:'+slot+quality,{kind:'warehouse'});if(!r.ok)throw Error('fixture grant');if(quality===1)w.equipItem(r.value.id,slot);}}
 app.hud.update();return globalThis.__QA_STATE__();
 };globalThis.__QA_STATE__=()=>{const w=app.world;return {wallet:{...w.wallet},rng:w.rngState,nextId:w.nextId,phase:w.phase,round:w.rewardRound,groups:structuredClone(w.expedition.building.groups),quotes:Object.values(w.expedition.developmentQuotes),equipped:structuredClone(w.starship.account.equipped),locations:structuredClone(w.starship.account.locations),accountRevision:w.starship.account.revision};};}).catch(`;
 await build({base:'./',publicDir:false,plugins:[{name:'zerg-equipment-qa',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/main.ts'))return code.replace('startGame().catch(',fixture);}}],build:{outDir:site,emptyOutDir:true,target:'es2022'}});
 let html=await fs.readFile(path.join(site,'index.html'),'utf8');html=html.replace('<head>',`<head><meta name="sc2-app-build" content="zerg-equipment-qa"><meta name="sc2-asset-manifest" content="./${release.manifest}">`);await fs.writeFile(path.join(site,'index.html'),html);
 for(const file of ['web-release.json',release.manifest])await fs.copyFile(path.join(web,file),path.join(site,file));
}
const server=createGameServer({webRoot:entryOnly?web:site,assetRoot:web,backendOptions:{config:{enabled:false}}});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
let browser;const report={build:release.appBuildId,scope:entryOnly?'Unmodified production menu/race choice.':'Real HUD actions, synthetic accounts and paused stage transitions; Chrome mouse / simulated touch.',results:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile] of entryOnly?[['desktop',1440,900,false]]:[['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  for(const kind of entryOnly?['entry']:process.argv.includes('--evolution-only')?['evolution']:['evolution','terran','zerg','protoss']){
   const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1}),page=await context.newPage(),errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.setDefaultTimeout(20000);
   const action=id=>page.locator('[data-action="'+id+'"]:visible').first(),press=async target=>{await target.scrollIntoViewIfNeeded();return mobile?target.tap():target.click();};
   try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await action('menu-new').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('#scs-opening-visual'));
    if(entryOnly){await press(action('menu-new'));await action('menu-race-next').waitFor();}
    else {
     await page.waitForFunction(()=>globalThis.__QA_APP__);const before=await page.evaluate(kind=>globalThis.__QA_SETUP__(kind),kind);
     if(kind==='evolution'){
      await press(action('ui-evolution'));await page.locator('[data-evolution-facility]').selectOption('2');
      const ground=page.locator('[data-evolution="ground"] [data-action="development-purchase"]');assert.ok(await ground.isEnabled());
      const quote=before.quotes.find(q=>q.value==='evolve-zerg.evolution');assert.ok(quote);
      await page.screenshot({path:path.join(out,name+'-evolution-before.png'),animations:'disabled'});await press(ground);
      const after=await page.evaluate(()=>globalThis.__QA_STATE__());assert.deepEqual(after.groups[0].directions,[]);assert.deepEqual(after.groups[1].directions,['ground']);assert.equal(after.wallet.minerals,before.wallet.minerals-quote.minerals);assert.equal(after.wallet.gas,before.wallet.gas-quote.gas);
      await page.evaluate(()=>{const w=globalThis.__QA_APP__.world;while(w.phase==='reward')w.skipReward();w.endStage();globalThis.__QA_APP__.hud.update();});
      await press(action('ui-evolution'));await page.locator('[data-evolution-facility]').selectOption('2');
      assert.match(await page.locator('[data-evolution="ground"]').innerText(),/已完成/);await press(page.locator('[data-evolution="air"] [data-action="development-purchase"]'));
      const final=await page.evaluate(()=>globalThis.__QA_STATE__());assert.deepEqual(final.groups[1].directions,['ground','air']);assert.deepEqual(final.groups[0].directions,[]);
      await press(page.getByRole('button',{name:'设施调整',exact:true}));assert.match(await page.locator('.production-modal').innerText(),/地面 ✓/);
      await page.screenshot({path:path.join(out,name+'-evolution-after.png'),animations:'disabled'});
      report.results.push({name,kind,groundQuote:{minerals:quote.minerals,gas:quote.gas},groups:final.groups,errors,failures});
     }else{
      await press(action('starship'));const auto=page.locator('[data-act="auto-equip"]:visible').first();await auto.waitFor();assert.ok(await auto.isEnabled());await press(auto);
      await page.waitForFunction(()=>document.querySelectorAll('.ship-slots .slot.occupied').length===3);
      const measured=await page.evaluate(()=>{const d=document.querySelector('.ship-diagram').getBoundingClientRect();return {layout:document.querySelector('.ship-diagram').dataset.layout,diagram:{x:d.x,y:d.y,w:d.width,h:d.height},slots:[...document.querySelectorAll('.ship-slots .slot')].map(e=>{const r=e.getBoundingClientRect(),i=e.querySelector('.equipment-icon'),image=i?.getBoundingClientRect();return {id:e.dataset.slot,x:r.x,y:r.y,w:r.width,h:r.height,icon:image?{w:image.width,h:image.height}:null};})};});
      assert.equal(measured.slots.length,12);assert.notEqual(measured.layout,'insufficient-space');
      for(const [i,r]of measured.slots.entries()){assert.equal(r.w,mobile?48:56);assert.equal(r.h,mobile?48:56);if(r.icon)assert.equal(r.icon.w,mobile?38:44);assert.ok(r.x>=measured.diagram.x-1&&r.x+r.w<=measured.diagram.x+measured.diagram.w+1);assert.ok(r.y>=measured.diagram.y-1&&r.y+r.h<=measured.diagram.y+measured.diagram.h+1);for(const b of measured.slots.slice(i+1))assert.ok(r.x+r.w<=b.x+.1||b.x+b.w<=r.x+.1||r.y+r.h<=b.y+.1||b.y+b.h<=r.y+.1,`overlap ${r.id}/${b.id}`);}
      await page.screenshot({path:path.join(out,name+'-'+kind+'-equipment.png'),animations:'disabled'});
      await press(page.locator('[data-act="page"][data-page="warehouse"]:visible').first());assert.ok(await page.locator('[data-act="auto-equip"]:visible').count());
      const after=await page.evaluate(()=>globalThis.__QA_STATE__());assert.equal(after.accountRevision,before.accountRevision+1);assert.equal(after.rng,before.rng);
      report.results.push({name,kind,measured,equipped:after.equipped,errors,failures});
     }
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);console.log(name+' '+kind+' passed');
    if(entryOnly)report.results.push({name,kind,errors,failures});
   }catch(error){report.results.push({name,kind,error:String(error.stack??error),errors,failures});await page.screenshot({path:path.join(out,name+'-'+kind+'-failure.png')});console.log((await page.locator('body').innerText()).slice(-2300));throw error;}finally{await context.close();}
  }
 }
}finally{await fs.writeFile(path.join(out,entryOnly?'entry-results.json':process.argv.includes('--evolution-only')?'evolution-results.json':'ui-results.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:report.results.length,build:release.appBuildId}));
