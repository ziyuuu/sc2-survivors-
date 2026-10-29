/** Bounded real HUD checks. Injected accounts/stage completion; no natural campaign or physical phone claim. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const out=path.resolve('reports/local/unlock-feedback-20261029'),web=path.resolve('dist/unlock-feedback-20261029/web'),site=path.join(out,'ui-site');
await fs.mkdir(out,{recursive:true});
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
if(process.argv.includes('--entry-only')){
 const server=createGameServer({webRoot:web,backendOptions:{config:{enabled:false}}}),report={build:release.appBuildId,scope:'Unmodified production Web menu and new-game race choice; no battle fixture.',errors:[],failures:[]};let browser;
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failures.push({url:r.url(),status:r.status()});});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('[data-action="menu-new"]:visible').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('#scs-opening-visual'));
  await page.locator('[data-action="menu-new"]:visible').click();await page.locator('[data-action="menu-race-next"]:visible').waitFor();await page.screenshot({path:path.join(out,'production-entry.png'),animations:'disabled'});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.passed=true;
 }catch(error){report.error=String(error.stack??error);process.exitCode=1;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'entry-results.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report));process.exit(process.exitCode??0);
}
const fixture=`import {grantEquipment} from './simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from './simulation/starship/types';
startGame(529).then(app=>{globalThis.__UNLOCK_APP__=app;globalThis.__UNLOCK_FIXTURE__=(kind)=>{
 const w=app.world,race=kind==='queen'?'zerg':'terran';app.readiness.background.tick=()=>{};app.view.render=()=>{};
 if(!w.selectRace(race))throw Error('Race setup failed');
 const equip=(template,slot)=>{const r=grantEquipment(w.starship.account,{template,race,slot},'unlock:'+slot,{kind:'warehouse'});if(!r.ok||!w.equipItem(r.value.id,slot).ok)throw Error('Equipment fixture failed');};
 if(kind==='queen'){for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip('set.advanced.choice.4',slot);equip('module.contract.4','logistics');w.setDevelopmentTarget('unlock.queen');}
 else {w.grantFacility('factory');w.expedition.tech['unlock.tank']=1;w.setDevelopmentTarget('unlock.thor');}
 w.start();w.paused=true;w.wallet={minerals:100000,gas:100000};w.endStage();if(kind==='heavy')w.setDevelopmentDirection('factory');app.hud.update();
 return globalThis.__UNLOCK_STATE__();
 };globalThis.__UNLOCK_STATE__=()=>{const w=app.world;return {wallet:{...w.wallet},rng:w.rngState,nextId:w.nextId,refresh:w.expedition.refreshCount,rewards:structuredClone(w.rewards),groups:structuredClone(w.expedition.building.groups),phase:w.phase,round:w.rewardRound};};}).catch(`;
await build({base:'./',publicDir:false,plugins:[{name:'unlock-feedback-fixture',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/main.ts'))return code.replace('startGame().catch(',fixture);}}],build:{outDir:site,emptyOutDir:true,target:'es2022'}});
let html=await fs.readFile(path.join(site,'index.html'),'utf8');html=html.replace('<head>',`<head><meta name="sc2-app-build" content="local-unlock-fixture"><meta name="sc2-asset-manifest" content="./${release.manifest}">`);await fs.writeFile(path.join(site,'index.html'),html);
await fs.copyFile(path.join(web,'web-release.json'),path.join(site,'web-release.json'));
await fs.copyFile(path.join(web,release.manifest),path.join(site,release.manifest));
const server=createGameServer({webRoot:site,assetRoot:web,backendOptions:{config:{enabled:false}}});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
let browser;const report={build:release.appBuildId,scope:'Actual HUD event handlers and world rules with controlled account, paused simulation and stage completion. Chrome mouse / simulated touch; no natural gameplay or physical iPhone.',results:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile] of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  for(const kind of ['queen','heavy']){
   const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1}),page=await context.newPage(),errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.setDefaultTimeout(20000);
   const action=id=>page.locator('[data-action="'+id+'"]:visible').first(),press=async target=>{await target.scrollIntoViewIfNeeded();return mobile?target.tap():target.click();};
   try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__UNLOCK_APP__&&!document.querySelector('#scs-opening-visual'),null,{timeout:60000});
    await action('menu-new').waitFor();const before=await page.evaluate(kind=>globalThis.__UNLOCK_FIXTURE__(kind),kind),target=before.rewards.find(r=>r.value===(kind==='queen'?'hatchery':'unlock.thor'));assert.ok(target);
    const card=page.locator('[data-card-id="'+target.offerId+'"]'),copy=card.locator('.imx-copy');await copy.waitFor();
    const plain=await page.evaluate(()=>globalThis.__UNLOCK_STATE__());await press(copy);assert.equal(await copy.getAttribute('aria-expanded'),'true');assert.deepEqual(await page.evaluate(()=>globalThis.__UNLOCK_STATE__()),plain);
    await page.screenshot({path:path.join(out,name+'-'+kind+'-before.png'),animations:'disabled'});
    await press(card.locator('[data-action="development-purchase"]'));
    await page.waitForFunction(kind=>globalThis.__UNLOCK_APP__.world.expedition.tech[kind==='queen'?'unlock.queen':'unlock.thor']===1,kind);
    const after=await page.evaluate(()=>globalThis.__UNLOCK_STATE__());
    if(kind==='queen'){
     assert.deepEqual(after.rewards,before.rewards.filter(r=>!['hatchery','unlock.queen'].includes(r.value)));assert.equal(await page.locator('[data-card-id]').filter({hasText:'解锁虫后'}).count(),0);
     assert.equal(after.groups.filter(g=>g.outputs.includes('queen')).length,1);assert.equal(after.groups[0].outputs[1],'queen');
     await page.screenshot({path:path.join(out,name+'-queen-after.png'),animations:'disabled'});
    }else assert.ok(after.groups.find(g=>g.id==='factory').outputs.includes('thor'));
    // The production panel and draft commit use the unmodified HUD click handlers.
    await press(page.getByRole('button',{name:'设施调整',exact:true}));
    const unit=kind==='queen'?'queen':'thor',producer=kind==='queen'?after.groups[0].id:'factory',button=page.locator('button[data-action="building-output"][data-facility="'+producer+'"][data-family="'+unit+'"]:visible');
    await button.waitFor();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await button.isEnabled(),true);
    await button.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-'+kind+'-production.png'),animations:'disabled'});
    if(kind==='heavy'){
     await press(button);assert.equal(await button.getAttribute('aria-pressed'),'false');await press(action('building-panel-apply'));
     await page.waitForFunction(()=>!globalThis.__UNLOCK_APP__.world.expedition.building.groups.find(g=>g.id==='factory').outputs.includes('thor'));
     await press(page.getByRole('button',{name:'设施调整',exact:true}));assert.equal(await button.isDisabled(),true);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    report.results.push({name,width,height,kind,input:mobile?'simulated touch':'mouse',detailsToggleHasNoEconomicEffect:true,keptCards:kind==='queen'?after.rewards.map(r=>({id:r.offerId,name:r.name,minerals:r.minerals,gas:r.gas})):null,production:after.groups,heavyCancellation:kind==='heavy',errors,failures});console.log(name+' '+kind+' passed');
   }catch(error){report.results.push({name,kind,error:String(error.stack??error),errors,failures});await page.screenshot({path:path.join(out,name+'-'+kind+'-failure.png')});console.log((await page.locator('body').innerText()).slice(-1800));throw error;}finally{await context.close();}
  }
 }
}finally{await fs.writeFile(path.join(out,'ui-results.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({passed:report.results.length,build:release.appBuildId}));
