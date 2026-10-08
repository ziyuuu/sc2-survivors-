import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const out='reports/local/battle-ui-sample-20261008/revision-3';
await fs.mkdir(out,{recursive:true});
try{
 const old=JSON.parse(await fs.readFile(out+'/browser.json','utf8'));
 if(old.failure){const n=(await fs.readdir(out)).filter(f=>/^attempt-\d+-browser\.json$/.test(f)).length+1;await fs.copyFile(out+'/browser.json',out+'/attempt-'+n+'-browser.json');await fs.copyFile(out+'/failure.png',out+'/attempt-'+n+'-failure.png').catch(()=>{});}
}catch{}
const artifact=JSON.parse(await fs.readFile(out+'/build.json','utf8'));
const report={at:new Date().toISOString(),build:artifact.sampleBuildId,artifactSha256:artifact.sha256,method:'Isolated offline Chrome plays the independent sample through visible UI. Diagnostic setup, not a natural campaign or physical device acceptance.',checks:[],errors:[],captures:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
let page;
const state=()=>page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__());
const capture=async(name)=>{const file=out+'/'+name+'.png';await page.waitForTimeout(750);await page.screenshot({path:file});report.captures.push(file);};
const check=async(name,fn)=>{await fn();report.checks.push(name);console.log('PASS '+name);};
const waitReady=async()=>{
 for(let i=0;i<8;i++){
  await page.waitForFunction(()=>document.getElementById('sample-loading').hidden||document.getElementById('sample-loading').textContent.startsWith('载入失败'),null,{timeout:30000}).catch(()=>{});
  const label=await page.locator('#sample-loading').innerText();if(label.startsWith('载入失败'))throw Error(label+' '+report.errors[0]);if(await page.locator('#sample-loading').isHidden())return;console.log('Loading: '+label);
 }
 throw Error('Sample never became ready');
};
const scene=async(name)=>{await page.locator('#sample-scene').selectOption(name);await page.waitForFunction(name=>window.__BATTLE_UI_SAMPLE_REPORT__().scene===name,name);};
const buy=async(id)=>{await page.locator(`article[data-card-id="${id}"] .im-card-face`).click();await page.locator('.im-detail-dialog [data-action=reward]').click();};
const closeBase=()=>page.locator('.modal-footer [data-action=sample-base-close]').click();
const closeProgress=()=>page.locator('.modal-footer [data-action=sample-progress-close]').click();
const wire=()=>{
 page.on('pageerror',e=>report.errors.push(e.stack??e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,700));});
 page.on('request',r=>{if(r.url().includes('/api/'))report.errors.push('Unexpected API request: '+r.url());});
};
async function unlocksMatch(){
 const s=await state(),rows=await page.locator('[data-tech]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.tech,unlocked:n.dataset.unlocked,label:n.textContent})));
 assert.ok(rows.length>=10);
 for(const r of rows){assert.equal(r.unlocked,String(!!s.research[r.id]),r.id);assert.ok(r.label.includes(s.research[r.id]?'已解锁':'未解锁'),r.id);}
}
async function foldGeometry(){
 const boxes=await page.locator('.sample-fold').evaluateAll(nodes=>nodes.map(n=>{
  const b=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect(),c=document.getElementById('battle-console').getBoundingClientRect();
  return {id:n.id,label:n.textContent.trim(),b:{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},p:{x:p.x,y:p.y,right:p.right,bottom:p.bottom},c:{x:c.x,y:c.y,right:c.right,bottom:c.bottom}};
 }));
 assert.deepEqual(boxes.map(b=>b.label),['部队','指令']);
 for(const {id,b,p,c}of boxes){assert.ok(b.width>=44&&b.height>=44,id);assert.ok(b.x>=p.x-.5&&b.right<=p.right+.5&&b.y>=p.y-.5&&b.bottom<=p.bottom+.5,JSON.stringify({id,b,p}));assert.ok(b.x>=c.x-.5&&b.right<=c.right+.5&&b.y>=c.y-.5&&b.bottom<=c.bottom+.5,JSON.stringify({id,b,c}));}
 const [a,b]=boxes.map(r=>r.b);assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,JSON.stringify(boxes));
}
async function fourFoldStates(name){
 const initial=await page.locator('#battle').boundingBox();
 await foldGeometry();await capture(name+'-fold-none');
 await page.locator('#army-toggle').click();await foldGeometry();assert.equal(await page.locator('#army-toggle').getAttribute('aria-label'),'展开部队');assert.equal(await page.locator('#army-toggle path').getAttribute('d'),'M5 15l7-7 7 7');assert.ok(await page.locator('#sample-command-list').isVisible());await capture(name+'-fold-army');
 await page.locator('#commands-toggle').click();await foldGeometry();assert.equal(await page.locator('#commands-toggle').getAttribute('aria-label'),'展开指令');assert.equal(await page.locator('#commands-toggle path').getAttribute('d'),'M5 15l7-7 7 7');await page.waitForTimeout(150);assert.ok((await page.locator('#battle').boundingBox()).height>initial.height);await capture(name+'-fold-both');
 await page.locator('#army-toggle').click();await foldGeometry();assert.ok(await page.locator('#roster').isVisible());assert.equal(await page.locator('#army-toggle path').getAttribute('d'),'M5 9l7 7 7-7');await capture(name+'-fold-commands');
 await page.locator('#commands-toggle').click();await foldGeometry();
}
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}});await context.setOffline(true);page=await context.newPage();wire();
 await page.goto(pathToFileURL(path.resolve(artifact.output)).href,{timeout:240000});await waitReady();report.initial=await state();await capture('desktop-battle-initial');
 await check('five independent families above and owned heroes before commands below',async()=>{
  const s=await state();assert.equal(s.slots.length,8);assert.deepEqual(s.slots.slice(0,5).map(s=>s.key),['family:marine','family:hellion','family:tank','family:marauder','family:medivac']);assert.deepEqual(s.slots.slice(5).map(s=>s.action),['hero-slot-0','hero-slot-1','hero-slot-2']);assert.equal(s.slots[0].count,2);assert.equal(s.slots[3].count,1);assert.equal(await page.locator('#roster [data-battle-action=stim]').count(),2);assert.equal(await page.locator('#roster [data-slot]').count(),5);assert.equal(await page.locator('#roster .hero').count(),0);assert.deepEqual(await page.locator('#sample-command-list > button').evaluateAll(ns=>ns.map(n=>n.dataset.slot??n.dataset.command)),['hero:0','hero:1','hero:2','dash','detection']);assert.equal(await page.locator('[data-battle-action=unit-operations],[data-command=unit-operations]').count(),0);assert.ok(!(await page.locator('#interface').innerText()).includes('单位操作'));
 });
 await check('lower hero cast and separate family buttons retain the native shared stim rule',async()=>{
  await page.locator('[data-slot="hero:0"]').click();let s=await state();assert.ok(s.events.at(-1).ok);assert.equal(s.events.at(-1).action,'hero-slot-0');assert.ok(s.heroes.find(h=>h.id==='raynor').skillReady>s.time);
  await page.locator('[data-slot="family:marine"]').click();s=await state();assert.ok(s.stim.some(t=>t>s.time));assert.ok(s.stimMarauder.some(t=>t>s.time));assert.equal(s.events.filter(e=>e.action==='stim').length,1);for(const f of ['marine','marauder'])assert.ok((await page.locator(`[data-slot="family:${f}"]`).getAttribute('aria-label')).includes('兴奋剂尚未结束'));await page.locator('[data-slot="family:marauder"]').click();s=await state();assert.equal(s.events.at(-1).action,'stim');assert.equal(s.events.at(-1).ok,false);await capture('desktop-hero-stim');
 });
 await check('independent marine and marauder buttons open their own original artwork',async()=>{
  const before=(await state()).events.length;await page.locator('[data-slot="family:marine"]').click({button:'right'});await page.locator('.ui12-window[data-unit-identity=marine]').waitFor();await page.locator('.ui12-art .painted-art[data-art-key=marine]').waitFor();await page.locator('.ui12-close').click();await page.locator('[data-slot="family:marauder"]').click({button:'right'});await page.locator('.ui12-window[data-unit-identity=marauder]').waitFor();await page.locator('.ui12-art .painted-art[data-art-key=marauder]').waitFor();assert.equal((await state()).events.length,before);await capture('desktop-marauder-details');await page.locator('.ui12-close').click();
 });
 await check('native hellion changes form',async()=>{await page.locator('[data-slot="family:hellion"]').click();await page.waitForFunction(()=>window.__BATTLE_UI_SAMPLE_REPORT__().families.some(u=>u.mode==='hellbat'));});
 await check('right click inspects the correct hero artwork without casting',async()=>{
  const before=(await state()).events.length;await page.locator('[data-slot="hero:2"]').click({button:'right'});await page.locator('.ui12-window[data-unit-identity=nova]').waitFor();assert.equal((await state()).events.length,before);assert.equal(await page.locator('.ui12-art [data-art-key=nova]').count(),1);await page.locator('.ui12-tabs [data-inspect-tab=abilities]').click();await capture('desktop-nova-skills');await page.locator('.ui12-close').click();
 });
 await check('all four fold states attach labelled arrows to their own panels',()=>fourFoldStates('desktop'));
 await check('reinforcement entrance is independent and pauses only while open',async()=>{
  await page.locator('[data-sample=progress]').click();assert.equal((await state()).ui.progressOpen,true);assert.equal((await state()).ui.baseOpen,false);assert.equal((await state()).paused,true);assert.equal(await page.locator('[role=dialog]').count(),1);assert.equal(await page.locator('.sample-facility-list,.settings-tabs,[data-action=sample-base-tab]').count(),0);assert.ok((await page.locator('.sample-cumulative').innerText()).includes('8%'));await capture('desktop-independent-enhancements');await closeProgress();assert.equal((await state()).paused,false);
  await page.locator('[data-sample=pause]').click();await page.locator('[data-sample=progress]').click();await closeProgress();assert.equal((await state()).paused,true);await page.locator('[data-sample=pause]').click();
 });
 await check('facility counts stand out and every native family unlock is shown',async()=>{
  await page.locator('[data-sample=base]').click();assert.equal((await state()).paused,true);assert.equal((await state()).ui.progressOpen,false);assert.equal(await page.locator('.sample-facility-card').count(),3);assert.deepEqual(await page.locator('.sample-facility-count').allTextContents(),['1 座','1 座','1 座']);assert.equal(await page.locator('.sample-cumulative,[data-action=sample-progress]').count(),0);await unlocksMatch();const style=await page.locator('.sample-facility-count b').first().evaluate(n=>getComputedStyle(n).fontSize);assert.ok(parseFloat(style)>=26);await capture('desktop-base-facilities');
 });
 await check('current technology replaces unclear orders and deployment tabs',async()=>{
  assert.deepEqual(await page.locator('[data-action=sample-base-tab]').allTextContents(),['设施','训练','当前科技']);await page.locator('[data-tab=technology]').click();await unlocksMatch();assert.equal(await page.locator('.sample-tech-card').count(),3);assert.ok((await page.locator('.sample-tech-card').first().innerText()).includes('2 / 3'));assert.equal(await page.locator('[data-tech=stim]').getAttribute('data-unlocked'),'true');assert.equal(await page.locator('[data-tech=shield]').getAttribute('data-unlocked'),'false');await capture('desktop-current-technology');
  for(const tab of ['facilities','production','technology']){await page.locator(`[data-action=sample-base-tab][data-tab=${tab}]`).click();assert.equal(await page.locator('[data-setting=development-target],[data-sample-setting=development-target]').count(),0);assert.ok(!(await page.locator('.production-modal').innerText()).includes('下次发展目标'));}
  assert.equal((await state()).developmentTarget,null);
 });
 await check('native training control remains operational after tab simplification',async()=>{
  await page.locator('[data-action=sample-base-tab][data-tab=production]').click();await page.locator('[data-action=production-enable][data-family=marine]').click();assert.equal((await state()).production.barracks.enabled.marine,true);await capture('desktop-native-training');await closeBase();assert.equal((await state()).paused,false);
 });
 for(const name of ['building','supply','full','no-heroes']){await scene(name);report[name]=await state();await capture('desktop-'+name);}
 await check('desktop reward art and purchase buttons fit the viewport',async()=>{
  await scene('full');await page.waitForTimeout(750);const region=await page.locator('#reward-cards').boundingBox();for(const b of await page.locator('#reward-cards .im-card-action').all()){const r=await b.boundingBox();assert.ok(r.y>=region.y-.5&&r.y+r.height<=region.y+region.height+.5,JSON.stringify({region,r}));}for(const art of await page.locator('#reward-cards .im-card-art').all()){const r=await art.boundingBox();assert.ok(r.height>=125,JSON.stringify(r));}
 });
 await check('native offer artwork retains each unit identity',async()=>{
  await scene('building');assert.equal(await page.locator('#reward-cards .painted-art[data-art-key=reaper]').count(),1);await scene('supply');for(const id of ['marine','medivac','tank'])assert.equal(await page.locator(`#reward-cards .painted-art[data-art-key=${id}]`).count(),1);
 });
 await check('intermission facility and reinforcement entries stay separate',async()=>{
  await scene('building');const before=await state();await page.locator('[data-action=sample-progress]').click();assert.equal(await page.locator('.sample-progress-modal').count(),1);assert.equal(await page.locator('.sample-facility-card').count(),0);await closeProgress();assert.equal((await state()).rewardRound,'building');await page.locator('[data-action=sample-base]').click();assert.equal(await page.locator('.sample-cumulative').count(),0);assert.equal(await page.locator('[data-setting=development-target],[data-sample-setting=development-target]').count(),0);assert.deepEqual((await state()).wallet,before.wallet);assert.equal((await state()).developmentTarget,null);await closeBase();
 });
 await check('building purchase retains its real cost and native phase transition',async()=>{
  const before=await state(),r=before.rewards.find(r=>r.effect.kind==='development'&&r.effect.definitionId==='barracks');assert.ok(r?.legal);await buy(r.id);const after=await state();assert.equal(after.facilities.length,before.facilities.length+1);assert.deepEqual(after.wallet,{minerals:before.wallet.minerals-r.minerals,gas:before.wallet.gas-r.gas});assert.equal(after.rewardRound,'random');assert.equal(after.heroes.length,3);await capture('desktop-building-purchased');
  await page.locator('[data-action=sample-base]').click();assert.equal(await page.locator('[data-line=barracks] .sample-facility-count').textContent(),'2 座');await closeBase();
 });
 await check('supply purchase retains paid passengers and native training status',async()=>{
  await scene('supply');const before=await state(),r=before.rewards.find(r=>r.effect.kind==='supply'&&r.effect.family==='marine');assert.equal(r.effect.mode,'pod');await buy(r.id);const after=await state();assert.deepEqual(after.wallet,{minerals:before.wallet.minerals-r.minerals,gas:before.wallet.gas-r.gas});assert.equal(after.ledger.filter(j=>j.family==='marine').reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting').length,0),r.effect.count);assert.equal(after.rewards.find(q=>q.id===r.id).sold,true);await page.locator('[data-action=sample-base]').click();await page.locator('[data-action=sample-base-tab][data-tab=production]').click();assert.ok((await page.locator('.production-modal').innerText()).includes('等待救援'));assert.deepEqual((await state()).ledger,after.ledger);await capture('desktop-supply-training-status');await closeBase();
 });
 await check('independent cumulative improvement reflects the native purchased card',async()=>{
  const before=await state(),r=before.rewards.find(r=>r.effect.kind==='card'&&r.effect.effect==='energy');await buy(r.id);const after=await state();assert.equal(after.cardTotals[r.effect.key],(before.cardTotals[r.effect.key]??0)+r.effect.amount);await page.locator('[data-action=sample-progress]').click();assert.ok((await page.locator('.sample-cumulative').innerText()).includes('4%'));assert.equal(await page.locator('.sample-facility-card,.sample-unlocks').count(),0);await capture('desktop-cumulative-purchased');await closeProgress();
 });
 await check('return to battle preserves paid orders and enhancements',async()=>{
  const before=await state();await page.locator('[data-action=skip]').click();const after=await state();assert.equal(after.phase,'battle');assert.equal(after.scene,'supply');assert.deepEqual(after.cardTotals,before.cardTotals);assert.ok(Math.abs(after.wallet.minerals-before.wallet.minerals)<1);assert.ok(before.ledger.every(j=>after.ledger.some(k=>k.id===j.id)));assert.equal(after.renderer.podModel,true);await capture('desktop-original-return-to-battle');
 });
 await check('full-roster stale quote blocks payment and reports original capacity',async()=>{
  await scene('full');const before=await state(),r=before.rewards.find(r=>r.effect.kind==='supply'&&r.effect.family==='marine'),card=page.locator(`article[data-card-id="${r.id}"]`);assert.equal(r.legal,false);assert.equal(await card.locator('.im-card-status').innerText(),'编制已满');assert.equal(await card.locator('.im-card-action').isDisabled(),true);await card.locator('.im-card-face').click();const b=page.locator('.im-detail-dialog [data-action=reward]');assert.equal(await b.isDisabled(),true);assert.ok((await b.innerText()).includes('编制已满'));assert.deepEqual((await state()).wallet,before.wallet);assert.equal((await state()).slots.find(s=>s.key==='family:marine').count,5);await capture('desktop-full-detail');await page.locator('.im-detail-dialog .modal-footer [data-action=sample-offer-close]').click();
 });
 await check('no heroes means only the two global commands, with no empty hero placeholders',async()=>{
  await scene('no-heroes');assert.equal(await page.locator('.empty-slot').count(),0);assert.equal(await page.locator('#sample-command-list .hero').count(),0);assert.equal(await page.locator('#sample-command-list > button').count(),2);assert.equal(await page.locator('#roster > button').count(),5);assert.ok((await state()).slots.every(s=>s.key.startsWith('family:')));await page.keyboard.press('1');await page.keyboard.press('o');assert.equal((await state()).heroes.length,0);assert.equal(await page.locator('[role=dialog]').count(),0);
 });
 assert.deepEqual(report.errors,[]);await context.close();
 for(const size of [{width:390,height:844},{width:844,height:390},{width:320,height:700}]){
  const name=size.width+'x'+size.height,ctx=await browser.newContext({viewport:size,hasTouch:true,isMobile:true});await ctx.setOffline(true);page=await ctx.newPage();wire();await page.goto(pathToFileURL(path.resolve(artifact.output)).href,{timeout:240000});await waitReady();
  await check(name+' five family and five lower-row touch targets fit without obstructing the joystick',async()=>{
   const bounds=await page.locator('#roster > button,#sample-command-list > button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));assert.equal(bounds.length,10);assert.equal(await page.locator('#roster > button').count(),5);assert.equal(await page.locator('#sample-command-list .hero').count(),3);for(const b of bounds){assert.ok(b.width>=44&&b.height>=44,JSON.stringify(b));assert.ok(b.x>=0&&b.x+b.width<=size.width+.5);}const top=await page.locator('#roster').boundingBox(),bottom=await page.locator('#sample-command-list').boundingBox();assert.ok(top.y+top.height<=bottom.y);
   const money=await page.locator('#topbar .money,[data-sample=base],[data-sample=progress]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right};}));for(const b of money)assert.ok(b.x>=0&&b.right<=size.width,JSON.stringify(b));assert.ok(await page.locator('#joystick').isVisible());const a=await page.locator('#army-toggle').boundingBox(),j=await page.locator('#joystick').boundingBox();assert.ok(a.x+a.width<=j.x||j.x+j.width<=a.x||a.y+a.height<=j.y||j.y+j.height<=a.y);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await capture(name+'-battle');
  });
  await check(name+' tap casts and long press only inspects',async()=>{
   await page.locator('[data-slot="hero:1"]').tap();assert.equal((await state()).events.at(-1).ok,true);assert.equal((await state()).events.at(-1).action,'hero-slot-1');const before=(await state()).events.length,b=await page.locator('[data-slot="hero:2"]').boundingBox(),cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.locator('.ui12-window[data-unit-identity=nova]').waitFor();assert.equal((await state()).events.length,before);await page.locator('.ui12-tabs [data-inspect-tab=abilities]').tap();await capture(name+'-long-press-skills');await page.locator('.ui12-close').tap();
  });
  await check(name+' all fold states keep named controls attached',()=>fourFoldStates(name));
  await check(name+' independent reinforcement panel and close remain reachable',async()=>{
   await page.locator('[data-sample=progress]').tap();assert.equal(await page.locator('.sample-facility-card,.settings-tabs').count(),0);assert.equal((await state()).paused,true);await capture(name+'-reinforcements');const close=page.locator('.modal-footer [data-action=sample-progress-close]'),b=await close.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=size.height);await close.tap();assert.equal((await state()).paused,false);
  });
  await check(name+' facility counts, locked tech and native training remain reachable',async()=>{
   await page.locator('[data-sample=base]').tap();await unlocksMatch();assert.equal(await page.locator('.sample-cumulative').count(),0);await capture(name+'-base');await page.locator('[data-action=sample-base-tab][data-tab=technology]').tap();await unlocksMatch();await capture(name+'-technology');const content=page.locator('.production-modal .modal-content');await content.evaluate(n=>n.scrollTop=n.scrollHeight);await capture(name+'-technology-bottom');const close=page.locator('.modal-footer [data-action=sample-base-close]'),b=await close.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=size.height);await close.tap();assert.equal((await state()).paused,false);await scene('full');await capture(name+'-full');assert.ok((await page.locator('#reward-cards').innerText()).includes('编制已满'));
  });
  await check(name+' no-hero lower row removes all empty placeholders',async()=>{await scene('no-heroes');assert.equal(await page.locator('#roster > button').count(),5);assert.equal(await page.locator('#sample-command-list > button').count(),2);assert.equal(await page.locator('#sample-command-list [data-slot]').count(),0);await capture(name+'-no-heroes');});
  assert.deepEqual((await state()).errors,[]);await ctx.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page&&!page.isClosed()){report.last=await state().catch(()=>null);await capture('failure').catch(()=>{});}}
finally{await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,failure:report.failure??null}));}
