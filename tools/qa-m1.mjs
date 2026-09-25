import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {TalentProfile} from '../src/simulation/progression/talent-profile.ts';
import {encodeGraph,checksum} from '../src/persistence/graph-codec.ts';

const mode=process.argv[2]??'--development';
const out='reports/local/qa-m1';
await fs.mkdir(out,{recursive:true});
const report={mode,at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const ready=page=>page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady,null,{timeout:240000});
const saved=page=>page.waitForFunction(()=>window.__SC2_REPORT__?.().save?.message?.includes('已保存')&&!window.__SC2_REPORT__().save.busy,null,{timeout:30000});
const errors=page=>{page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});};

try{
 if(mode==='--development'){
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();errors(page);
  await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
  await ready(page);
  await page.getByLabel('开局种族').selectOption('zerg');
  await page.getByLabel('难度').selectOption('hell');
  await page.locator('[data-action=start]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
  await page.locator('#topbar [data-action=pause]').click();
  const before=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {runId:w.runId,race:w.expedition.race,difficulty:w.difficulty,time:w.time,wallet:{...w.wallet},paused:w.paused};});
  assert.equal(before.race,'zerg');assert.equal(before.difficulty,'hell');assert.equal(before.paused,true);
  await page.locator('[data-action=save-now]').click();await saved(page);
  await page.screenshot({path:out+'/battle-paused.png'});
  await page.reload();await ready(page);
  await page.getByLabel('开局种族').selectOption('terran');
  await page.getByLabel('难度').selectOption('easy');
  await page.locator('[data-action=save-continue]').click();
  const after=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {runId:w.runId,race:w.expedition.race,difficulty:w.difficulty,time:w.time,wallet:{...w.wallet},paused:w.paused};});
  assert.deepEqual(after,before);
  assert.match(await page.locator('#mission').innerText(),/地狱/);
  report.checks.push('Browser reload keeps Zerg/Hell from the run despite Terran/Easy menu defaults, including paused time and wallet');

  await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=false;w.endStage();});
  const reward=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {phase:w.phase,round:w.rewardRound,offers:w.rewards.map(r=>r.offerId),wallet:{...w.wallet},receipt:w.clearReceipt};});
  assert.equal(reward.phase,'reward');assert.equal(reward.round,'building');assert.ok(reward.offers.length);
  await page.locator('[data-action=save-now]').click();await saved(page);
  await page.screenshot({path:out+'/intermission.png'});
  await page.reload();await ready(page);await page.locator('[data-action=save-continue]').click();
  const restoredReward=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {phase:w.phase,round:w.rewardRound,offers:w.rewards.map(r=>r.offerId),wallet:{...w.wallet},receipt:w.clearReceipt};});
  assert.deepEqual(restoredReward,reward);
  report.checks.push('Intermission reload preserves the same offers, clear receipt and wallet without reroll');

  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:out+'/intermission-narrow.png'});
  const layout=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.viewport);
  report.checks.push('390-pixel intermission has no horizontal page overflow');

  await page.reload();await ready(page);
  const old=new TalentProfile();old.balance=7;old.levels={scv_savior:2};
  const payload={format:'sc2-survivors-save',version:1,savedAt:100,data:encodeGraph({profile:old.exportJSON(),run:null})};
  const raw=JSON.stringify({...payload,checksum:checksum(JSON.stringify(payload))});
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=save-import]').click();
  await (await chooser).setFiles({name:'developer-v1.json',mimeType:'application/json',buffer:Buffer.from(raw)});
  await page.locator('.legacy-save').waitFor();
  assert.match(await page.locator('.legacy-save').innerText(),/旧战局不可续玩/);
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=save-legacy-export]').click();
  const download=await downloadPromise;const exported=out+'/legacy-export.json';await download.saveAs(exported);
  assert.equal(await fs.readFile(exported,'utf-8'),raw);
  await page.locator('[data-action=save-legacy-import]').click();await saved(page);
  assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.permanentProfile.principal),9);
  report.checks.push('Verified v1 developer file is not resumed, exports byte-for-byte and imports only 9 permanent resources');

  await page.locator('[data-action=start]').click();
  await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;for(let i=0;i<4;i++)w.addUnit('marine','terran',i+1,0);if(!w.acquireElite('marine.1'))throw Error('elite choice fixture failed');});
  await page.locator('[data-action=elite-replace]').first().waitFor();
  assert.equal(await page.locator('[data-action=elite-replace]').first().isEnabled(),true);
  await page.screenshot({path:out+'/elite-choice.png'});
  await page.locator('[data-action=save-now]').click();await saved(page);
  await page.reload();await ready(page);await page.locator('[data-action=save-continue]').click();
  await page.locator('[data-action=elite-replace]').first().click();
  const elite=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {pending:w.requiresPlayerDecision,count:w.familyUnits('marine').filter(u=>u.eliteId==='marine.1').length};});
  assert.deepEqual(elite,{pending:false,count:1});
  report.checks.push('Full-family elite choice remains actionable through save/reload and resolves exactly once');
  await context.close();
 }else if(mode==='--offline'){
  const context=await browser.newContext({viewport:{width:1440,height:900},offline:true});
  const page=await context.newPage(),requests=[];errors(page);
  page.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href,{timeout:180000});
  await ready(page);
  assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
  await page.getByLabel('开局种族').selectOption('protoss');
  await page.getByLabel('难度').selectOption('hard');
  await page.locator('[data-action=start]').click();
  await page.locator('#topbar [data-action=pause]').click();
  const before=await page.evaluate(()=>window.__SC2_REPORT__());
  assert.equal(before.expedition.race,'protoss');assert.equal(before.expedition.rules,'mvp-1.0');
  await page.locator('[data-action=save-now]').click();await saved(page);
  await page.screenshot({path:out+'/offline-paused.png'});
  await page.reload({timeout:180000});await ready(page);
  await page.locator('[data-action=save-continue]').click();
  const after=await page.evaluate(()=>window.__SC2_REPORT__());
  assert.equal(after.expedition.race,'protoss');assert.equal(after.phase,'battle');assert.equal(after.time,before.time);
  assert.match(await page.locator('#mission').innerText(),/困难/);
  assert.deepEqual(requests,[]);
  await page.screenshot({path:out+'/offline-resumed.png'});
  report.checks.push('Offline standalone HTML starts and resumes Protoss/Hard without network requests or debug mutation API');
  await context.close();
 }else throw Error('Unknown QA mode');
 assert.deepEqual(report.errors,[]);
}catch(error){
 report.failure=String(error?.stack??error);
 console.error(report.failure);
 process.exitCode=1;
}finally{
 await fs.writeFile(out+'/'+(mode==='--offline'?'offline':'development')+'.json',JSON.stringify(report,null,2));
 await browser.close();
 console.log(JSON.stringify(report));
}
