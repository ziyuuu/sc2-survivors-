import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Synthetic development-World fixtures. This is interaction/rendering evidence,
// not natural campaign completion, human visual acceptance, or hardware FPS QA.
const out='reports/local/qa-feedback-20260927';await fs.mkdir(out,{recursive:true});
const reportFile=process.env.SC2_QA_LABEL?`report-${process.env.SC2_QA_LABEL}.json`:'report.json';
const stages=(process.env.SC2_QA_STAGES??'shop,settings,animation,boss').split(',');
const report={at:new Date().toISOString(),scope:'Synthetic development World fixtures; inflated shop funds and controlled combat clocks. No natural-campaign, human visual, physical-input or performance acceptance.',cases:[],errors:[],screens:[]};
const browser=await chromium.launch({executablePath:process.env.SC2_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:process.env.SC2_QA_HEADFUL!=='1'});
const url=process.env.SC2_QA_URL??'http://127.0.0.1:5173/';
async function snap(page,name){await page.screenshot({path:`${out}/${name}.png`});report.screens.push(name+'.png');}
async function pressPad(page,index=0){await page.evaluate(i=>window.__FEEDBACK_PAD__.buttons[i].value=1,index);await page.waitForTimeout(120);await page.evaluate(i=>window.__FEEDBACK_PAD__.buttons[i].value=0,index);await page.waitForTimeout(100);}
async function navigatePad(page,selector){
 await page.waitForTimeout(150);
 for(let i=0;i<80;i++){
  if(await page.evaluate(selector=>document.activeElement?.matches(selector),selector)){await pressPad(page);return;}
  await pressPad(page,13);
 }
 throw Error('Virtual D-pad could not reach '+selector);
}
async function activate(page,selector,mode){const el=page.locator(selector).first();if(mode==='touch')await el.tap();else if(mode==='gamepad'){await page.waitForTimeout(150);await el.focus();await pressPad(page);}else if(mode==='keyboard'){await el.focus();await page.keyboard.press('Enter');}else await el.click();}
async function boot(page){page.feedbackExpectedLoads++;await page.goto(url);await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});await page.waitForTimeout(150);}
async function newRun(page,mode){
 await activate(page,'[data-action=menu-new]',mode);await activate(page,'[data-action=menu-race][data-race=terran]',mode);await activate(page,'[data-action=menu-race-next]',mode);await activate(page,'[data-action=menu-difficulty-next]',mode);await activate(page,'[data-action=menu-start]',mode);
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await activate(page,'[data-action=flow-continue]',mode);await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 await page.evaluate(()=>{window.__SC2_DEBUG__.speed=0;const w=window.__SC2_DEBUG__.world;w.autoWaves=false;});
}
async function menu(page,mode,item){
 assert.deepEqual(await page.locator('.m3-main-actions button').allTextContents(),['新游戏','读档','天赋']);
 await activate(page,'[data-action=talents]',mode);
 for(const race of ['terran','zerg','protoss']){
  await activate(page,`[data-action=mvp-talent-race][data-race=${race}]`,mode);
  assert.equal(await page.locator('[data-action=mvp-talent-select]').count(),55);
  await activate(page,'[data-action=mvp-talent-select]',mode);
  assert.equal(await page.locator('[data-action=mvp-talent-select][aria-pressed=true]').count(),1);
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await snap(page,mode+'-talents');await activate(page,'[data-action=talents-back]',mode);
 item.menu={threeEntries:true,threeRaceTalentInspection:true,activation:mode==='keyboard'?'programmatic focus plus real Enter':mode==='gamepad'?'programmatic focus plus mocked A':mode};
}
async function combatControls(page,mode,item){
 await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;window.__INPUT_SNAPSHOT__=structuredClone(w.captureRun());w.phase='battle';w.paused=false;w.entities.clear();w.heroes.clear();w.expedition.familySlots=['marine','tank'];w.addUnit('tank','terran',0,0);w.acquireHero('raynor');const hero=w.heroEntity('raynor'),enemy=w.addUnit('roach','zerg',hero.x,hero.z+1);enemy.hp=enemy.maxHp=1e6;enemy.weaponDamage=0;w.hash.rebuild(w.entities.values());w.changed();v.prepareRosterAssets();});
 await page.waitForFunction(()=>window.__SC2_DEBUG__.view.assetsPending===0,null,{timeout:240000});
 async function sector(index){const angle=index*Math.PI/3;await page.evaluate(({x,z})=>{window.__FEEDBACK_PAD__.axes[2]=x;window.__FEEDBACK_PAD__.axes[3]=z;},{x:Math.sin(angle),z:-Math.cos(angle)});await page.waitForTimeout(150);await pressPad(page);await page.evaluate(()=>{window.__FEEDBACK_PAD__.axes[2]=window.__FEEDBACK_PAD__.axes[3]=0;});}
 if(mode==='gamepad'){await sector(2);await sector(3);}
 else if(mode==='keyboard'){await page.locator('#battle').click({position:{x:200,y:200}});await page.keyboard.press('g');await page.keyboard.press('1');}
 else {await activate(page,'[data-action=detection]',mode);await activate(page,'[data-action=hero-raynor]',mode);}
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.detectionFields.length),1);
 assert.ok(await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return w.heroes.get('raynor').skillReady>w.time;}));
 assert.equal(await page.locator('.hero-world-label .hero-slot,.hero-world-label .unit-label-title,.hero-world-label .hero-action').count(),0);
 assert.ok(await page.locator('.hero-world-label').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>getComputedStyle(n).pointerEvents==='none')));
 if(mode==='gamepad'){await sector(1);await activate(page,'[data-action=unit-mode][data-mode=siege]',mode);}
 else if(mode==='keyboard')await page.keyboard.press('t');else await activate(page,'[data-action=siege]',mode);
 assert.ok(await page.evaluate(()=>window.__SC2_DEBUG__.world.familyUnits('tank').some(u=>u.desiredMode==='siege')));
 await snap(page,mode+'-combat-controls');item.combatControls={detection:true,hero:true,manualTank:true,inputTransparentVitals:true};
 await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.restoreRun(window.__INPUT_SNAPSHOT__);v.resetRun();w.changed();});
}
async function receipt(page,mode,item){
 await page.evaluate(async()=>{const {world:w}=window.__SC2_DEBUG__;window.__RECEIPT_SNAPSHOT__=structuredClone(w.captureRun());const {receiptNeeded}=await import('/src/simulation/expedition-production.ts');w.phase='battle';w.paused=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];const s=w.expedition;s.familySlots=['marine','marauder','reaper','hellion','tank'];s.tech.starport=s.tech.factory=s.tech.starport_lab=1;for(let i=0;i<5;i++)w.addUnit('marine','terran',-8,i*2,5);const pod=w.spawnPod('viking',{x:8,z:0},990001,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();s.ledger.push({id:990001,family:'viking',line:'starport',facilityIds:[1],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:125,gas:75},status:'waiting',entityId:null,purpose:'body'}]});receiptNeeded(w,pod,0);w.changed();});
 await page.locator('[data-action=family-reject]').waitFor();
 const state=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;window.__PENDING_RECEIPT__=structuredClone(w.captureRun());const time=w.time;w.step(1/60);return {wallet:{...w.wallet},timeFrozen:w.time===time,request:structuredClone(w.expedition.pendingReceipt)};});
 assert.ok(state.timeFrozen);await snap(page,mode+'-family-receipt');
 await activate(page,'[data-action=family-reject]',mode);
 assert.deepEqual(await page.evaluate(()=>({...window.__SC2_DEBUG__.world.wallet})),state.wallet);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.pendingReceipt),null);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.familyUnits('marine').length),5);
 // DTO restore isolates the same pending choice; IndexedDB is covered by shop().
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.restoreRun(window.__PENDING_RECEIPT__);w.changed();});
 assert.deepEqual(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.pendingReceipt),state.request);
 await activate(page,'[data-action=family-replace][data-old=marine]:not(:disabled)',mode);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.familyUnits('viking').length),1);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.familyUnits('viking')[0].rank),3);
 assert.deepEqual(await page.evaluate(()=>({...window.__SC2_DEBUG__.world.wallet})),state.wallet);
 item.receipt={frozen:true,rejectPreservesOldFamilyAndFunds:true,dtoRestoresExactPendingChoice:true,replacementOnce:true};
 await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.restoreRun(window.__RECEIPT_SNAPSHOT__);v.resetRun();w.changed();});await page.waitForFunction(()=>window.__SC2_DEBUG__.view.assetsPending===0,null,{timeout:240000});
}
const shopState=()=>{const w=window.__SC2_DEBUG__.world;return {wallet:{...w.wallet},rewards:structuredClone(w.rewards),direction:w.expedition.developmentDirection,refresh:w.expedition.refreshCount,phase:w.phase,round:w.rewardRound,stage:w.stage};};
async function shop(page,mode,item){
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.wallet={minerals:20000,gas:20000};window.__FEEDBACK_RANDOM__=w.random;w.random=()=>0;w.endStage();});
 assert.equal(await page.locator('[data-action=development-direction]').count(),3);assert.equal(await page.locator('#reward-cards [data-action=reward]').count(),0);
 const paid=await page.evaluate(()=>structuredClone(window.__SC2_DEBUG__.world.expedition.ledger));
 const enabled=await page.locator('[data-action=production-enable][data-family=marine]').getAttribute('aria-pressed');
 await activate(page,'[data-action=production-enable][data-family=marine]',mode);
 assert.notEqual(await page.locator('[data-action=production-enable][data-family=marine]').getAttribute('aria-pressed'),enabled);
 await activate(page,'[data-action=production-enable][data-family=marine]',mode);
 assert.deepEqual(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.ledger),paid,'production switch preserves prepaid ledger');item.production={togglePreservesLedger:true};
 await snap(page,mode+'-direction');await activate(page,'[data-action=development-direction][data-line=barracks]',mode);
 const original=await page.evaluate(()=>structuredClone(window.__SC2_DEBUG__.world.rewards));
 await activate(page,'[data-action=development-direction][data-line=factory]',mode);await activate(page,'[data-action=development-direction][data-line=barracks]',mode);
 assert.deepEqual(await page.evaluate(()=>window.__SC2_DEBUG__.world.rewards),original,'switching back retains quoted direction offers');
 await activate(page,'#reward-cards [data-action=reward]:not(:disabled)',mode);await page.waitForFunction(()=>window.__SC2_DEBUG__.world.rewardRound==='random');
 const offers=await page.evaluate(()=>window.__SC2_DEBUG__.world.rewards.map(r=>({id:r.offerId,m:r.minerals,g:r.gas})));
 assert.equal(offers.length,3);assert.ok(offers.every(r=>r.m>0||r.g>0));await snap(page,mode+'-shop');
 for(const offer of offers)await activate(page,`#reward-cards [data-action=reward][data-id="${offer.id}"]:not(:disabled)`,mode);
 assert.ok(await page.evaluate(()=>window.__SC2_DEBUG__.world.rewards.every(r=>r.sold)));assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.phase),'reward');
 await snap(page,mode+'-shop-sold');
 const prices=[];for(const expected of [50,90,130,170,210]){const before=await page.evaluate(()=>({cost:window.__SC2_DEBUG__.world.rerollCost(),minerals:window.__SC2_DEBUG__.world.wallet.minerals}));assert.equal(before.cost,expected);prices.push(before.cost);await activate(page,'[data-action=reroll]',mode);assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.wallet.minerals),before.minerals-expected);}
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.random=window.__FEEDBACK_RANDOM__;delete window.__FEEDBACK_RANDOM__;});
 const expected=await page.evaluate(shopState),savedAt=await page.evaluate(()=>window.__SC2_REPORT__().save.savedAt);await activate(page,'[data-action=save-now]',mode);await page.waitForFunction(before=>{const s=window.__SC2_REPORT__().save;return !s.busy&&s.savedAt>before&&s.message.includes('已保存');},savedAt,{timeout:30000});
 page.feedbackExpectedLoads++;await page.reload();await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await activate(page,'[data-action=menu-load]',mode);await activate(page,'[data-action=menu-load-local]',mode);await activate(page,'[data-action=menu-load-ready]',mode);
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await activate(page,'[data-action=flow-continue]',mode);await page.waitForFunction(()=>window.__SC2_DEBUG__.world.phase==='reward');
 assert.deepEqual(await page.evaluate(shopState),expected);assert.equal(await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,t=w.time;w.step(1/60);return w.time===t;}),true,'restored intermission stays frozen');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no document horizontal overflow');await snap(page,mode+'-shop-restored');item.shop={prices,allThreeBought:true,savedQuotesPreserved:true};
}
async function animations(page,item){
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;window.__FEEDBACK_CHECKPOINT__=w.captureRun();w.phase='battle';w.paused=true;w.rewards=[];w.entities.clear();w.visualEvents=[];w.pendingElites=[];w.pods=[];w.rewardDrops=[];w.time=20;w.anchor={x:0,z:0};window.__SC2_DEBUG__.speed=0;
  const types=['reaper','zealot','stalker','high_templar','colossus','void_ray'];window.__FEEDBACK_ACTORS__=types.map((type,i)=>{const x=(i%3-1)*5,z=Math.floor(i/3)*6-3,p=w.freePosition(type,{x,z},0,6);if(!p)throw Error('No legal animation sample position '+type);return w.addUnit(type,'terran',p.x,p.z).id;});w.changed();window.__SC2_DEBUG__.view.prepareRosterAssets();});
 await page.waitForFunction(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;return !v.assetsPending&&window.__FEEDBACK_ACTORS__.every(id=>v.gpu.has(w.entities.get(id).unitType));},null,{timeout:240000});
 const result=await page.evaluate(()=>{
  const {world:w,view:v}=window.__SC2_DEBUG__;
  // Co-located durable targets isolate pose playback from terrain and approach AI.
  // This is an explicitly synthetic firing fixture, not a movement/combat pass.
  const records=[];for(const id of window.__FEEDBACK_ACTORS__){const u=w.entities.get(id),target=w.addUnit('roach','zerg',u.x,u.z);target.hp=target.maxHp=1e8;target.weaponDamage=0;w.fire(u,target);target.x=target.prev.x=200;target.z=target.prev.z=200;u.action='idle';}
  for(const mode of ['complete','energy-saving']){v.setAnimationMode(mode);for(const age of [0,.03,.1,.2]){w.time=20+age;v.render(0,1);records.push({mode,age,actors:window.__FEEDBACK_ACTORS__.map(id=>{const u=w.entities.get(id),s=v.animationStates.get(id);return {type:u.unitType,shots:u.shotSequence,simAction:u.action,pose:s?.sampled?.action,seconds:s?.sampled?.seconds};})});}}
  w.paused=false;w.time=20.2;w.changed();return records;
 });
 item.animation=result;
 for(const record of result)for(const actor of record.actors){assert.ok(actor.shots>0,`${actor.type} synthetic fixture did not fire`);assert.equal(actor.simAction,'idle');assert.ok(['attack','attackChannel'].includes(actor.pose),`${actor.type} missing displayed shot pose ${actor.pose}`);}
 item.animation=result;await page.evaluate(()=>window.__SC2_DEBUG__.view.setAnimationMode('complete'));await snap(page,'desktop-attack-complete');await page.evaluate(()=>window.__SC2_DEBUG__.view.setAnimationMode('energy-saving'));await snap(page,'desktop-attack-energy');
 await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.restoreRun(window.__FEEDBACK_CHECKPOINT__);v.resetRun();w.changed();});
}
async function settings(page,mode,item){
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=true;w.changed();});await activate(page,'[data-action=settings]',mode);
 const run=await page.evaluate(()=>window.__SC2_DEBUG__.world.runId);await page.locator('[data-setting=animation-mode]').selectOption('complete');await page.locator('[data-setting=quality]').selectOption('balanced');await page.locator('[data-setting=animation-mode]').focus();await page.locator('[data-setting=animation-mode]').selectOption('energy-saving');
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.view.quality),'balanced');assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.runId),run);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.setting),'animation-mode');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await snap(page,mode+'-settings');
 assert.equal(await page.evaluate(()=>localStorage.getItem('sc2.animationMode')),'energy-saving');await page.locator('[data-setting=animation-mode]').selectOption('complete');await activate(page,'[data-action=settings-back]',mode);item.settings={independent:true,focusRetained:true,worldIdentityRetained:true};
}
async function bosses(page,item,mode='desktop'){
 const data=await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__;const {EnemySpecials}=await import('/src/simulation/combat/enemy-specials.ts');w.phase='battle';w.paused=true;w.entities.clear();w.pods=[];w.rewardDrops=[];w.pendingElites=[];w.anchor={x:0,z:0};w.time=50;w.enemySpecials=new EnemySpecials(w);window.__SC2_DEBUG__.speed=0;
  const target=w.addUnit('marine','terran',0,3);target.hp=target.maxHp=10000;target.weaponDamage=0;
  const casts=[];for(const [i,type] of ['lurker','ultralisk','mutalisk','corruptor'].entries()){const boss=w.spawnSpecial(type,'boss',{x:(i-1.5)*3,z:-3}),near=w.addUnit('marine','terran',boss.x,boss.z);near.hp=near.maxHp=10000;near.weaponDamage=0;boss.specialReady=0;boss.windup=0;w.enemySpecials.act(boss,1/60);const cast=w.enemySpecials.casts.find(c=>c.source===boss.id);casts.push({type,kind:cast?.kind,at:cast?.at,count:cast?.count});}
  const queen=w.spawnSpecial('queen','boss',{x:0,z:0});queen.specialReady=0;const ally=w.addUnit('roach','zerg',queen.x,queen.z);ally.hp=100;ally.maxHp=2000;w.enemySpecials.act(queen,1/60);
  w.changed();v.prepareRosterAssets();window.__FEEDBACK_BOSS_IDS__=[...w.entities.values()].filter(u=>u.enemyTier==='boss').map(u=>u.id);return {casts,queenHealed:ally.hp>100};});
 assert.deepEqual(data.casts.map(c=>c.kind),['spikes','charge','fan','acid']);assert.ok(data.queenHealed);
 await page.waitForFunction(()=>window.__SC2_DEBUG__.view.assetsPending===0,null,{timeout:240000});await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.paused=false;w.changed();v.render(0,1);});await snap(page,mode+'-boss-warnings');item.bossMechanics=data;
 const loot=await page.evaluate(()=>{const {world:w}=window.__SC2_DEBUG__;const boss=w.entities.get(window.__FEEDBACK_BOSS_IDS__[0]),random=w.random;w.random=()=>.5;w.hit(boss,1e9,[],1,'terran');w.random=random;const drop=w.rewardDrops.find(d=>d.bossLootReceipt);if(!drop)throw Error('No physical Boss reward');const receipt=drop.bossLootReceipt;w.hit(boss,1e9,[],1,'terran');const count=w.rewardDrops.filter(d=>d.bossLootReceipt===receipt).length;w.collectRewardDrop(drop.id);return {receipt,count,rarity:drop.reward.rarity,wallet:{...w.wallet}};});
 assert.equal(loot.count,1);assert.equal(loot.rarity,'purple');await page.locator('[data-action=boss-loot-close]').waitFor();await snap(page,mode+'-boss-loot');
 const choose=selector=>mode==='gamepad'?navigatePad(page,selector):activate(page,selector,mode);
 await choose('[data-action=boss-loot-close]');if(mode==='gamepad'){await pressPad(page,9);await choose('#overlay [data-action=boss-loot-open]');await page.waitForFunction(()=>window.__SC2_DEBUG__.world.expedition.bossLootOpen);}else await choose('[data-action=boss-loot-open]');
 if(await page.locator('[data-action=elite-assets-retry]').count()){
  await choose('[data-action=elite-assets-retry]');await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await choose('[data-action=flow-continue]');
 }
 const variants=page.locator('[data-action=boss-loot-variant]');if(await variants.count())await choose('[data-action=boss-loot-variant]:not(:disabled)');await choose('[data-action=boss-loot-claim]:not(:disabled)');
 assert.deepEqual(await page.evaluate(()=>({...window.__SC2_DEBUG__.world.wallet})),loot.wallet);assert.equal(await page.evaluate(receipt=>window.__SC2_DEBUG__.world.expedition.bossLootClaimed.filter(r=>r===receipt).length,loot.receipt),1);item.bossLoot={singlePhysicalDrop:true,dismissReopenClaim:true,free:true};
}
async function shopElite(page,item,mode='desktop'){
 const before=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=true;w.entities.clear();w.pendingElites=[];w.expedition.pendingShopElite=null;w.wallet={minerals:20000,gas:20000};for(let i=0;i<5;i++)w.addUnit('marine','terran',i,0);const random=w.random;w.random=()=>.99;w.endStage();w.setDevelopmentDirection('barracks');w.skipReward();w.random=random;const offer=w.rewards.find(r=>r.expeditionEffect?.kind==='elite');if(!offer)throw Error('Synthetic purple shop did not produce an elite family');return {wallet:{...w.wallet},offer:structuredClone(offer)};});
 const choose=`[data-action=reward][data-id="${before.offer.offerId}"][data-variant="marine.2"]`;
 async function open(){await activate(page,choose,mode);await page.waitForFunction(()=>window.__SC2_REPORT__().readiness?.phase==='ready'||!!document.querySelector('[data-action=shop-elite-confirm]:not(:disabled)'),null,{timeout:240000});if(await page.locator('[data-action=flow-continue]').count())await activate(page,'[data-action=flow-continue]',mode);await page.locator('[data-action=shop-elite-confirm]:not(:disabled)').first().waitFor();}
 await open();assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.view.gpu.has('elite.marine.2')),true);assert.deepEqual(await page.evaluate(()=>({...window.__SC2_DEBUG__.world.wallet})),before.wallet);await snap(page,mode+'-elite-confirm');
 await activate(page,'[data-action=shop-elite-cancel]',mode);assert.equal(await page.evaluate(id=>window.__SC2_DEBUG__.world.rewards.find(r=>r.offerId===id).sold,before.offer.offerId),false);assert.deepEqual(await page.evaluate(()=>({...window.__SC2_DEBUG__.world.wallet})),before.wallet);
 await open();await activate(page,'[data-action=shop-elite-confirm]:not(:disabled)',mode);
 const after=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {wallet:{...w.wallet},count:w.familyUnits('marine').length,elite:w.eliteOwned('marine.2')?.eliteId,pending:w.expedition.pendingShopElite};});
 assert.equal(after.count,5);assert.equal(after.elite,'marine.2');assert.equal(after.pending,null);assert.equal(after.wallet.minerals,before.wallet.minerals-before.offer.minerals);assert.equal(after.wallet.gas,before.wallet.gas-before.offer.gas);item.eliteShop={nonDefaultModelReady:true,cancelPreservesFunds:true,confirmChargesOnce:true,familyCount:after.count};
}
try{
 for(const mode of (process.env.SC2_QA_MODES??'desktop,touch,gamepad').split(',')){
  const item={mode,viewport:mode==='touch'?{width:390,height:844}:{width:1440,height:900},checks:[]};report.cases.push(item);
  const context=await browser.newContext({viewport:item.viewport,deviceScaleFactor:1,...(mode==='touch'?{hasTouch:true,isMobile:true}:{})});
  if(mode==='gamepad')await context.addInitScript(()=>{const pad={id:'Feedback virtual standard gamepad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});window.__FEEDBACK_PAD__=pad;});
  const page=await context.newPage();page.feedbackExpectedLoads=0;let loads=0,unexpectedLoads=0;page.on('load',()=>{if(++loads>page.feedbackExpectedLoads)unexpectedLoads++;});page.on('pageerror',e=>report.errors.push(`${mode}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')report.errors.push(`${mode}: ${m.text()}`);});
  try{for(let attempt=0;attempt<2;attempt++){
   const before=unexpectedLoads;
   try{console.log('QA feedback '+mode+' attempt '+(attempt+1));await boot(page);if(stages.includes('menu'))await menu(page,mode,item);await newRun(page,mode);if(stages.includes('controls'))await combatControls(page,mode,item);if(stages.includes('receipt'))await receipt(page,mode,item);if(stages.includes('shop'))await shop(page,mode,item);if(stages.includes('settings'))await settings(page,mode,item);if(stages.includes('elite'))await shopElite(page,item,mode);if(mode==='desktop'&&stages.includes('animation'))await animations(page,item);if(stages.includes('boss'))await bosses(page,item,mode);item.passed=true;break;}
   catch(error){await snap(page,mode+'-failure-'+attempt).catch(()=>{});if(attempt===0&&unexpectedLoads>before){item.hmrRetry={unexpectedLoads,failure:String(error.stack??error)};page.feedbackExpectedLoads=loads;continue;}throw error;}
  }}
  catch(error){item.failure=String(error.stack??error);process.exitCode=1;}
  finally{await context.close();await fs.writeFile(out+'/'+reportFile,JSON.stringify(report,null,2));}
 }
 if(report.errors.length)process.exitCode=1;
}finally{await browser.close();report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/'+reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}













