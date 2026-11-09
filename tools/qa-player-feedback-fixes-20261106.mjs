/** Bounded production ship UI + real IndexedDB checks; synthetic accounts, no battle renderer. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import http from 'node:http';
import {chromium} from '@playwright/test';
const out=path.resolve('reports/local/player-feedback-fix-20261106');await fs.mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:`
import {World} from './src/simulation/world';
import {newEquipmentAccount,grantEquipment,canEquip} from './src/simulation/starship/inventory';
import {mountStarshipUI} from './src/ui/starship/legacy-view';
import {createWorldStarshipHost} from './src/ui/starship/world-host';
import {draftContext} from './src/simulation/expedition-economy';
import {drawExpeditionReinforcements} from './src/simulation/progression/expedition-drafts';
import {effectiveReaperGrowth} from './src/simulation/combat/terran-elite-runtime';
import {RunSession} from './src/app/run-session';
import {SaveRepository,IndexedSaveBackend} from './src/persistence/save-repository';
import './src/ui/starship/style.css';
import './src/ui/starship/legacy-r12.css';
import './src/ui/starship/polish.css';
import './src/ui/starship/native.css';
let w,ui,host,old,candidate,session;
const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>');
const make=equipmentAccount=>new World({seed:529,race:'terran',difficulty:'normal',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:equipmentAccount??newEquipmentAccount(529)});
const mount=()=>{const root=document.querySelector('#root');root.className='native-starship';root.dataset.context=w.phase==='menu'?'menu':'battle';host=createWorldStarshipHost(w,{resolveImage:()=>art});ui=mountStarshipUI(root,host,{initialPage:'loadout'});};
const reset=()=>{ui?.dispose();host?.dispose();w=make();};
const gear=(template,slot='offense1')=>{const a=w.starship.account,r=grantEquipment(a,{template,race:'terran',slot,polluted:false},'fixture:'+a.serial,a.run?{kind:'backpack',run:a.run.id}:{kind:'warehouse'});if(!r.ok)throw Error(r.error);return r.value;};
window.setup=(phase,template,extra=false)=>{
 reset();old=gear(template);w.equipItem(old.id,old.slot);if(phase==='intermission'){w.start();w.endStage();}candidate=gear(template==='attribute.3'?'attribute.3':'attribute.4');if(extra)gear('attribute.2','defense1');mount();return window.state();
};
window.state=()=>({phase:host.phase(),old:old.id,candidate:candidate.id,equipped:{...w.starship.account.equipped.terran},locations:structuredClone(w.starship.account.locations),count:Object.keys(w.starship.account.items).length,revision:w.starship.account.revision,rng:w.starship.account.rng,manual:canEquip(w.starship.account,'terran',candidate.id,candidate.slot).ok,plan:ui.controller.previewAutoEquip().map(i=>i.id)});
window.openWarehouse=()=>ui.open('warehouse');
window.setupPurchase=async()=>{
 reset();w.start();w.entities.clear();w.heroes.clear();w.expedition.familySlots=['reaper'];w.stage=7;w.acquireElite('reaper.3');w.wallet={minerals:100000,gas:100000};w.endStage();w.skipReward();
 let offer;for(let n=0;n<500;n++){w.rewards=drawExpeditionReinforcements(draftContext(w),true);offer=w.rewards.find(r=>r.rarity==='orange'&&r.expeditionEffect.kind==='elite');if(offer)break;}if(!offer)throw Error('No bounded native orange quote');
 old=gear('special.doom.3');if(!w.equipItem(old.id,old.slot).ok)throw Error('Fixture equip');candidate=gear('attribute.4');mount();session=new RunSession(w,new SaveRepository(new IndexedSaveBackend(indexedDB)),{run:null,savedAt:0,notice:''});await session.saveNow();
 return {offer:offer.offerId,minerals:offer.minerals,gas:offer.gas,old:old.id,candidate:candidate.id,before:window.combined()};
};
window.buy=id=>w.choose(id,'reaper.2');
window.flush=()=>session.saveBeforeAdvance();
window.combined=()=>({wallet:{...w.wallet},hunter:w.eliteOwned('reaper.3')?.id,growth:effectiveReaperGrowth(w,w.eliteOwned('reaper.3')),bodies:w.allies().filter(u=>u.unitType==='reaper').map(u=>({id:u.id,rank:u.rank,elite:u.eliteId})),receipts:structuredClone(w.terranElites.absorptions),purchases:{...w.economyTotals.purchases},offers:w.rewards.map(r=>({id:r.offerId,sold:r.sold,receipt:r.purchaseReceipt})),equipment:structuredClone(w.starship.account)});
window.restore=async()=>{const repo=new SaveRepository(new IndexedSaveBackend(indexedDB)),loaded=await repo.load();if(!loaded.bundle?.run)throw Error('No archive');const b=loaded.bundle;reset();w=make(b.equipment);if(!w.permanentProfile.importJSON(b.profile))throw Error('Profile');session=new RunSession(w,repo,{run:b.run,savedAt:loaded.savedAt,notice:loaded.notice,management:b.management});if(!session.resume())throw Error(session.message);mount();return window.combined();};
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',write:false,outdir:out,entryNames:'fixture',logLevel:'silent',loader:{'.woff2':'dataurl','.png':'dataurl','.svg':'dataurl'},target:'es2022'});
const files=new Map(bundle.outputFiles.map(f=>['/'+path.basename(f.path),f.contents]));
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body style="background:#07101a;margin:0"><main id="root"></main><script type="module" src="/fixture.js"></script></body></html>');return;}const f=files.get(req.url);res.setHeader('content-type',req.url.endsWith('.css')?'text/css':'text/javascript');res.statusCode=f?200:404;res.end(f);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={scope:'Windows Chrome production StarshipUI/WorldHost; isolated synthetic accounts, blank artwork, no battle renderer. Mouse and simulated touch. Real IndexedDB reload for combined purchase/equipment.',cases:[],errors:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile] of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>typeof window.setup==='function');
  const button=()=>page.locator('[data-act="auto-equip"]:visible').first(),press=async()=>{await button().scrollIntoViewIfNeeded();await (mobile?button().tap():button().click());};
  for(const phase of ['outside','intermission'])for(const template of ['attribute.1','attribute.3','set.training.2','special.doom.3']){
   const before=await page.evaluate(([p,t])=>window.setup(p,t),[phase,template]),blocked=template==='attribute.3'||phase==='intermission'&&template==='set.training.2';await button().waitFor();assert.equal(await button().isDisabled(),blocked);
   let message='';if(!blocked){await press();const after=await page.evaluate(()=>window.state());assert.equal(after.equipped.offense1,before.candidate);assert.equal(after.locations[before.old].kind,phase==='outside'?'warehouse':'backpack');assert.equal(after.count,before.count);assert.equal(after.revision,before.revision+1);assert.equal(after.rng,before.rng);assert.ok(await button().isDisabled());message=await page.locator('.ship-toast').innerText();assert.equal(message,template==='attribute.1'?'':'已换装，原装备效果可能变化');assert.equal(await page.locator('dialog[open]').count(),0);
    if(phase==='outside'&&template==='special.doom.3'){const toast=await page.locator('.ship-toast').boundingBox();assert.ok(toast&&toast.x>=0&&toast.y>=0&&toast.x+toast.width<=width+1&&toast.y+toast.height<=height+1);await page.screenshot({path:path.join(out,name+'-effect-feedback.png')});}
   }
   report.cases.push({name,phase,template,blocked,message});
  }
  const warehouse=await page.evaluate(()=>window.setup('outside','set.training.2'));await page.evaluate(()=>window.openWarehouse());await press();assert.equal((await page.evaluate(()=>window.state())).equipped.offense1,warehouse.candidate);report.cases.push({name,case:'warehouse set replacement'});
  const mixed=await page.evaluate(()=>window.setup('intermission','set.training.2',true));await press();const after=await page.evaluate(()=>window.state());assert.equal(after.equipped.offense1,mixed.old);assert.ok(after.equipped.defense1);report.cases.push({name,case:'independent protected slot does not block empty slot'});
  if(!mobile){
   const fixture=await page.evaluate(()=>window.setupPurchase());assert.ok(await page.evaluate(id=>window.buy(id),fixture.offer));await press();assert.ok(await page.evaluate(()=>window.flush()));const paid=await page.evaluate(()=>window.combined());assert.equal(paid.wallet.minerals,fixture.before.wallet.minerals-fixture.minerals);assert.equal(paid.wallet.gas,fixture.before.wallet.gas-fixture.gas);assert.equal(paid.receipts.length,1);assert.equal(paid.receipts[0].rank,5);assert.equal(paid.bodies.length,1);assert.equal(paid.hunter,fixture.before.hunter);assert.equal(paid.equipment.equipped.terran.offense1,fixture.candidate);assert.equal(paid.equipment.locations[fixture.old].kind,'backpack');
   assert.equal(await page.evaluate(id=>window.buy(id),fixture.offer),false);assert.deepEqual(await page.evaluate(()=>window.combined()),paid);await page.reload();await page.waitForFunction(()=>typeof window.restore==='function');assert.deepEqual(await page.evaluate(()=>window.restore()),paid);assert.equal(await page.evaluate(id=>window.buy(id),fixture.offer),false);assert.deepEqual(await page.evaluate(()=>window.combined()),paid);assert.ok(await button().isDisabled());report.cases.push({name,case:'paid V-rank absorption plus functional exchange survive actual IndexedDB page reload; repeat rejected',growth:paid.growth});
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.error=String(error.stack??error);throw error;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,errors:report.errors}));
