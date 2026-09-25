import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {readArchive} from '../src/persistence/archive.ts';
import {isDeepStrictEqual} from 'node:util';

const mode=process.argv.includes('--offline')?'offline':'development';
const save=process.env.SC2_QA_SAVE??'reports/local/elite-receipt-20260924/sc2-survivors-save-recovered.json';
const out='reports/local/elite-receipt-20260924/'+mode;
await fs.mkdir(out,{recursive:true});
const source=readArchive(await fs.readFile(save,'utf8')).bundle;
const report={at:new Date().toISOString(),mode,checks:[],errors:[],httpRequests:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const ready=page=>page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady&&!window.__SC2_REPORT__().assetsPending,null,{timeout:240000});
function sameState(actual,expected){
 const a=structuredClone(actual),e=structuredClone(expected);
 assert.deepEqual(Object.keys(e).filter(key=>!isDeepStrictEqual(a[key],e[key])),[],'saved fields must remain unchanged');
}
async function exported(page,name){
 const download=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();
 const file=out+'/'+name+'.json';await (await download).saveAs(file);
 return readArchive(await fs.readFile(file,'utf8')).bundle;
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},offline:mode==='offline',acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.stack));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('request',r=>{if(mode==='offline'&&/^https?:/.test(r.url()))report.httpRequests.push(r.url());});
 await page.goto(mode==='offline'?pathToFileURL(process.cwd()+'/dist/SC2-Survivors-Demo.html').href:(process.env.SC2_QA_URL??'http://127.0.0.1:5187/'),{timeout:180000});
 await ready(page);
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=save-import]').click();await (await chooser).setFiles(save);
 await page.locator('[data-action=save-continue]').click();await ready(page);
 assert.equal(await page.locator('[data-action=elite-replace]:enabled').count(),5);
 assert.equal(await page.locator('[data-action=reward]').count(),0);
 const initial=await exported(page,'pending');
 const expected=structuredClone(source.run.state);expected.paused=true;
 sameState(initial.run.state,expected);
 assert.equal(initial.profile,source.profile);
 assert.equal(initial.threeRaceProfile,source.threeRaceProfile);
 report.checks.push('user run opens five enabled elite replacement candidates; all saved state retained except required paused=true');
 await page.screenshot({path:out+'/pending-desktop.png'});
 await page.locator('[data-action=restart]').click();
 await page.locator('[data-action=save-continue]').click();await ready(page);
 sameState((await exported(page,'returned')).run.state,expected);
 await page.locator('[data-action=save-now]').click();
 await page.waitForFunction(()=>!window.__SC2_REPORT__().save.busy);
 await page.reload({timeout:180000});await ready(page);await page.locator('[data-action=save-continue]').click();await ready(page);
 sameState((await exported(page,'reloaded')).run.state,expected);
 report.checks.push('save, return to title, continue and browser reload preserve the pending choice, wallet, HP, cooldowns, orders and original talents');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('[data-action=elite-replace]:enabled').count(),5);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const first=page.locator('[data-action=elite-replace]').first(),targetId=Number(await first.getAttribute('data-id'));
 await first.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/pending-narrow.png'});
 await first.focus();await page.keyboard.press('Enter');
 const after=await exported(page,'selected'),u=after.run.state.entities.get(targetId),old=source.run.state.entities.get(targetId);
 assert.deepEqual(after.run.state.pendingElites,[]);assert.equal(u.eliteId,'medivac.1');assert.equal(u.rank,1);
 assert.equal(after.run.state.rewardDrops.length,0);assert.equal(after.run.state.time,source.run.state.time);assert.deepEqual(after.run.state.wallet,source.run.state.wallet);
 assert.ok(Math.abs((u.maxHp-u.hp)-(old.maxHp-old.hp))<1e-6);assert.equal(u.weaponCooldown,old.weaponCooldown);
 for(const [id,entity] of source.run.state.entities)if(id!==targetId)assert.deepEqual(after.run.state.entities.get(id),entity);
 assert.equal(after.profile,source.profile);assert.equal(after.threeRaceProfile,source.threeRaceProfile);
 report.checks.push('narrow screen and keyboard confirm replacement once; no resource charge, duplicate drop, free healing or changes to other units/talents');
 await page.locator('#overlay [data-action=pause]').click();
 await page.waitForFunction(time=>window.__SC2_REPORT__().time>time+.5,source.run.state.time,{timeout:10000});
 await page.locator('#topbar [data-action=pause]').click();
 const resumed=await exported(page,'resumed');
 assert.equal(resumed.run.state.entities.get(targetId).rank,1);
 report.checks.push('battle resumes advancing and the elite does not receive a duplicate promotion');
 report.summary={stage:resumed.run.state.stage,time:resumed.run.state.time,eliteId:u.eliteId,rank:u.rank};
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpRequests,[]);
 await context.close();
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
