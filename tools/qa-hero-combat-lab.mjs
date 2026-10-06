import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='reports/local/hero-combat-lab';await fs.mkdir(out,{recursive:true});
const heroFilter=process.argv.find(a=>a.startsWith('--hero='))?.slice(7);if(heroFilter)assert.ok(['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'].includes(heroFilter));
const reportFile=heroFilter?'qa-'+heroFilter+'-final.json':'qa.json';
const report={attacks:[],skills:[],controls:[],errors:[],remote:[],consoleErrors:[]};
report.scope=heroFilter?'Final targeted ordinary-attack verification: '+heroFilter:'Full six-hero ordinary attacks, active skills and controls';
const original=JSON.parse(await fs.readFile('.cache/hero-skill-lab/qa-before-r2.json','utf8'));
const build=JSON.parse(await fs.readFile(out+'/build.json','utf8'));
const before=JSON.parse(await fs.readFile(out+'/before-baseline-restoration/build.json','utf8'));
const htmlHash=createHash('sha256').update(await fs.readFile(build.output)).digest('hex');assert.equal(htmlHash,build.sha256);
assert.equal(build.sourceHashes['skill-effects.ts'],before.sourceHashes['skill-effects.ts']);
const materialBefore=JSON.parse(await fs.readFile(out+'/before-material-refinement/build.json','utf8'));for(const file of ['attack-simulation.ts','tuning.ts','skill-effects.ts','fixture.ts'])assert.equal(build.sourceHashes[file],materialBefore.sourceHashes[file],file+' changed during presentation refinement');
report.artifact={output:build.output,bytes:build.bytes,sha256:htmlHash,gunBaseline:build.gunBaseline,previousHtml:before.sha256,activeSkillSourceUnchanged:true};
const gunSizes={raynor:[.182,1.15],tychus:[.084,.65],nova:[.0945,2.6],swann:[.084,.4],tosh:[.126,.4],yamato_battlecruiser:[.35,1.9]};
function approvedGuns(s,hero,rank){const guns=s.attackVisuals.approvedGuns;assert.ok(guns.cores.length>0,hero+' approved main gun');for(const core of guns.cores){assert.equal(core.hero,hero);assert.equal(core.rank,rank);assert.equal(core.diameter,gunSizes[hero][0]);assert.equal(core.length,gunSizes[hero][1]);assert.equal(core.red,hero==='raynor'&&rank>=3);}assert.equal(guns.burningCore,hero==='raynor'&&rank>=3);if(['raynor','tychus','nova'].includes(hero))assert.ok(guns.casings>0,hero+' original casings');if(hero==='yamato_battlecruiser')assert.equal(guns.cores.length,2,'original paired cannon');if(hero==='swann')assert.ok(s.attackVisuals.rocketModels>0,'original Swann projectile');}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browser=browser.version();
const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});
page.on('pageerror',e=>{report.errors.push(e.message);console.log('Page error',e.message);});page.on('request',r=>{if(/^https?:/.test(r.url()))report.remote.push(r.url());});page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,250));});
const state=()=>page.evaluate(()=>window.__HERO_COMBAT_DEMO_REPORT__());
const wait=fn=>page.waitForFunction(fn,null,{timeout:40000});
const age=t=>page.waitForFunction(t=>window.__HERO_COMBAT_DEMO_REPORT__().age>=t,t,{timeout:40000});
async function capture(name){await page.locator('#pause').click();await page.screenshot({path:out+'/'+name+'.png'});const s=await state();await page.locator('#pause').click();return s;}
async function choose(hero,rank){await page.locator('#rank').selectOption(String(rank));await page.locator(`button[data-hero=${hero}]`).click();}
try{
 await page.goto('file:///D:/%E6%98%9F%E9%99%85/dist/Six-Terran-Heroes-Attacks-And-Skills.html');await page.waitForFunction(()=>window.__HERO_COMBAT_DEMO_REPORT__?.().ready||document.querySelector('#interface')?.textContent.includes('失败'),null,{timeout:240000});assert.ok((await state()).ready,await page.locator('#interface').textContent());console.log('Dual demonstration ready');
 await page.locator('#auto').click();await page.locator('#speed').selectOption('.25');
 for(const hero of (heroFilter?[heroFilter]:['raynor','tychus','nova','swann','tosh','yamato_battlecruiser']))for(const rank of [1,3,5]){
  await choose(hero,rank);
  await wait(()=>{const s=window.__HERO_COMBAT_DEMO_REPORT__(),p=s.attack.packets.find(p=>p.kind==='main');return p&&s.time-p.born>=.065;});
  const baseline=await capture(`base-${hero}-${rank}`);approvedGuns(baseline,hero,rank);
  if(rank>=3&&(hero==='tychus'||hero==='yamato_battlecruiser'))await wait(()=>{const s=window.__HERO_COMBAT_DEMO_REPORT__();const p=s.attack.packets.find(p=>p.kind==='missile');return p&&s.time-p.born>=.12;});
  else if(rank>=3&&hero==='swann')await wait(()=>{const s=window.__HERO_COMBAT_DEMO_REPORT__();return s.attack.packets.some(p=>p.kind==='bounce'&&p.hop===(s.rank===5?2:1));});
  else if(rank>=3&&hero==='tosh')await wait(()=>{const s=window.__HERO_COMBAT_DEMO_REPORT__(),hit=s.attack.audit.find(a=>a.kind==='main');return s.attackVisuals.fireworks>0&&hit&&s.time-hit.at>=.1;});
  else await wait(()=>{const s=window.__HERO_COMBAT_DEMO_REPORT__(),p=s.attack.packets.find(p=>p.kind==='main');return p&&s.time-p.born>=.065;});
  const visual=await capture(`attack-${hero}-${rank}`);assert.equal(visual.mode,'attack');assert.equal(visual.launched,false);assert.equal(visual.castTargets.length,0);
  assert.ok(visual.attackVisuals.upgradeMaterials.batches.every(b=>b.geometry==='PlaneGeometry'&&b.textured));
  assert.ok(visual.attackVisuals.upgradeMaterials.ribbonOrientation.minimumAlignment>.999,'Actual ribbon axis follows its flight/spark path');
  if(rank>=3&&hero==='raynor'){assert.ok(visual.attackVisuals.red>0);assert.ok(visual.attackVisuals.fireLayers>=3);assert.ok(visual.attackVisuals.yellow>=(rank===5?2:1));const sides=visual.attack.packets.filter(p=>p.kind==='side');assert.equal(sides.length,rank===5?2:1);assert.ok(sides.every(p=>p.target!==p.primaryTarget));assert.equal(new Set(sides.map(p=>p.target)).size,sides.length);}
  if(rank>=3&&hero==='nova')assert.ok(visual.attackVisuals.lightningSegments>0);
  if(rank>=3&&(hero==='tychus'||hero==='yamato_battlecruiser')){assert.ok(visual.attackVisuals.missiles>0);assert.ok(visual.attackVisuals.rocketModels>0);assert.ok(visual.attackVisuals.missileBody.count>0);assert.equal(visual.attackVisuals.missileBody.id,'model.hero-upgrade.vikingfightermissile');assert.ok(visual.attackVisuals.missileBody.length>.8&&visual.attackVisuals.missileBody.length>visual.attackVisuals.missileBody.width*1.5,'Original missile length versus complete fin span');assert.ok(visual.attackVisuals.fireLayers>0);assert.ok(visual.attack.packets.filter(p=>p.kind==='missile').every(p=>p.target!==p.primaryTarget));}
  if(rank>=3&&hero==='swann'){assert.ok(visual.attackVisuals.bounces>0);assert.ok(visual.attackVisuals.rocketModels>0);}
  if(rank>=3&&hero==='tosh'){assert.ok(visual.attackVisuals.fireworkSparks>=(rank===5?36:18));}
  let lineDot;
  if(rank>=3&&hero==='nova'){await age(1.25);lineDot=await capture(`nova-line-dot-${rank}`);assert.ok(new Set(lineDot.attack.dots.map(d=>d.target)).size>=2,'DOT on several targets along firing line');assert.ok(lineDot.attackVisuals.lightningSegments>=20);}
  await page.locator('#speed').selectOption('1');await age(4.95);await page.locator('#pause').click();const s=await state();assert.ok(s.shots>0);assert.ok(s.damage>0);assert.equal(s.skillEffects.impacts,0);assert.equal(s.skillVisuals.shields,0);assert.deepEqual(s.modelErrors,[]);assert.deepEqual(s.fxErrors,[]);
  if(rank===1)assert.equal(s.attack.stats.sideHits+s.attack.stats.missileHits+s.attack.stats.bounceHits+s.attack.stats.dotTicks+s.attack.stats.splashHits,0);
  if(rank>=3){const field={raynor:'sideHits',tychus:'missileHits',nova:'dotTicks',swann:'bounceHits',tosh:'splashHits',yamato_battlecruiser:'missileHits'}[hero];assert.ok(s.attack.stats[field]>0);}
  if(rank>=3&&hero==='raynor'){const sides=s.attack.audit.filter(a=>a.kind==='side');assert.ok(sides.every(a=>a.target!==a.primaryTarget));for(const side of sides)assert.ok(Math.abs(side.damage-side.hpLoss)<1e-6,'side bullet arrival damage');}
  if(rank>=3&&hero==='nova'){const dots=s.attack.audit.filter(a=>a.kind==='dot'),main=s.attack.audit.find(a=>a.kind==='main');assert.ok(new Set(dots.map(a=>a.target)).size>=2);assert.ok(dots.some(a=>a.target!==main.target),'along-line secondary target takes DOT');const damaged=new Set(s.attack.audit.map(a=>a.target));assert.ok(s.targets.filter(t=>!damaged.has(t.id)).every(t=>t.hpNow===t.hp),'off-line targets keep HP');}
  report.attacks.push({hero,rank,baseline,visual,lineDot,result:s});console.log('attack',hero,rank,JSON.stringify(s.attack.stats));await page.locator('#speed').selectOption('.25');
 }
 if(!heroFilter){
 await page.locator('button[data-mode=skill]').click();await page.locator('#rank').selectOption('1');
 for(const hero of ['raynor','tychus','nova','swann','tosh','yamato_battlecruiser']){
  await choose(hero,1);await page.locator('#speed').selectOption('.25');
  const t={raynor:1.54,tychus:1.09,nova:1.24,swann:1.94,tosh:1.38,yamato_battlecruiser:1.42}[hero];await age(t);const visual=await capture('skill-'+hero);
  assert.equal(visual.mode,'skill');assert.equal(visual.shots,0);assert.equal(visual.attack.stats.salvos,0);assert.equal(visual.attack.packets.length,0);assert.equal(visual.attack.dots.length,0);assert.equal(visual.attack.lines.length,0);assert.equal(visual.attackVisuals.approvedGuns.cores.length,0);assert.equal(visual.attackVisuals.approvedGuns.burningCore,false);assert.equal(visual.attackVisuals.fireLayers,0);assert.equal(visual.attackVisuals.embers,0);assert.equal(visual.attackVisuals.missileBody.count,0);assert.ok(visual.attackVisuals.upgradeMaterials.batches.every(b=>b.count===0));
  if(hero==='swann'){assert.equal(visual.skillVisuals.shields,7);assert.ok(visual.skillVisuals.rings>=7);assert.equal(visual.skillTuning.swannVersion,'first-source-20261005-004625');}
  if(hero==='raynor'){assert.ok(visual.skillVisuals.castAge>.65&&visual.skillVisuals.castAge<1);assert.equal(visual.skillVisuals.beamWidths.length,2);}
  if(hero==='tychus'){assert.equal(visual.skillVisuals.grenadeVisible,true);assert.equal(visual.skillVisuals.grenadeScale,1.6);}
  if(hero==='yamato_battlecruiser'){assert.ok(visual.skillVisuals.beamWidths.includes(.14));await age(1.95);const flight=await capture('skill-yamato-projectile');assert.ok(flight.skillVisuals.beamWidths.includes(.85));assert.ok(flight.skillVisuals.beamWidths.includes(.22));}
  await page.locator('#speed').selectOption('1');await age(hero==='swann'?5.1:hero==='tychus'?4.7:2.9);await page.locator('#pause').click();const s=await state(),old=original.checks.find(c=>c.hero===hero);
  assert.equal(s.shots,0);assert.equal(s.castFailure,'');assert.ok(s.skillEffects.impacts>0);assert.deepEqual(s.modelErrors,[]);assert.deepEqual(s.fxErrors,[]);
  if(old){for(const key of ['damage','kills','healed','shots'])assert.equal(s[key],old[key],hero+' '+key);assert.deepEqual(s.targets.map(t=>t.hpNow),old.targets.map(t=>t.hpNow));}
  const before=s.time;await page.waitForTimeout(350);assert.equal((await state()).time,before);report.skills.push({hero,visual,result:s});console.log('skill',hero,JSON.stringify({damage:s.damage,kills:s.kills,healed:s.healed}));
 }
 // Paused replay, mode switching and detail/zoom controls through actual buttons.
 await page.locator('#cast').click();assert.equal((await state()).paused,false);await age(1.8);await page.locator('button[data-mode=attack]').click();let s=await state();assert.equal(s.launched,false);assert.equal(s.castTargets.length,0);assert.equal(s.skillVisuals.shields,0);assert.equal(s.attack.dots.length,0);assert.equal(s.attack.lines.length,0);await age(1.1);await page.locator('#pause').click();
 await page.locator('#cast').click();assert.equal((await state()).paused,false);await page.locator('#zoom').click();assert.equal(await page.locator('#zoom').textContent(),'近景视角');await page.locator('#zoom').click();await page.locator('details summary').click();assert.ok(await page.locator('details').getAttribute('open')!==null);await page.locator('details summary').click();report.controls.push({pausedReplay:true,modeReset:true,details:true,zoom:true});
 for(const [width,height] of [[390,844],[844,390],[667,375]]){
  await page.setViewportSize({width,height});await choose('raynor',5);await page.locator('#speed').selectOption('.25');await age(.75);await page.locator('#pause').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const boxes=await page.locator('button,#rank,#speed').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.hero||e.dataset.mode,width:r.width,height:r.height,bottom:r.bottom};}));assert.ok(boxes.every(b=>b.width>=44&&b.height>=44&&b.bottom<=height),'44px controls '+width+'x'+height);const stage=await page.locator('#stage').boundingBox();assert.ok(stage.height>=110);await page.screenshot({path:out+`/view-${width}x${height}.png`});report.controls.push({viewport:[width,height],boxes,stage});
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('#speed').selectOption('1');await choose('nova',5);await page.locator('#auto').click();const cycle=(await state()).cycle;await page.waitForFunction(c=>window.__HERO_COMBAT_DEMO_REPORT__().cycle>c,cycle,{timeout:25000});report.controls.push({attackLoop:true});
 await page.locator('button[data-mode=skill]').click();await choose('swann',1);const skillCycle=(await state()).cycle;await page.waitForFunction(c=>window.__HERO_COMBAT_DEMO_REPORT__().cycle>c,skillCycle,{timeout:25000});assert.equal((await state()).shots,0);report.controls.push({skillLoop:true});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.consoleErrors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}finally{await browser.close();await fs.writeFile(out+'/'+reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify({report:reportFile,attacks:report.attacks.length,skills:report.skills.length,controls:report.controls.length,failure:report.failure,errors:report.errors,remote:report.remote,consoleErrors:report.consoleErrors,browser:report.browser}));}
