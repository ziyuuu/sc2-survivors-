import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {World} from '../src/simulation/world';
import {campaignTerrain} from '../src/data/campaign-map';
import {writeArchive} from '../src/persistence/archive';
import {shopProgress} from '../src/ui/presentation/shop-progress';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {createGameServer} from './coze-web-server.mjs';

const out='reports/local/maintenance-audit-20261008/'+(process.argv.includes('--geometry-only')?'card-geometry':'layout');
await fs.mkdir(out,{recursive:true});
const w=new World({seed:10812,waves:false,terrain:campaignTerrain({version:3,seed:10812,theme:'industrial'})});
assert.ok(w.start());w.wallet={minerals:1e9,gas:1e9};shopProgress(w).observe();w.endStage();w.skipReward();
let found=false,rolls=0;
for(;rolls<2000;rolls++){
 const groups=(w.rewards as ExpeditionReward[]).flatMap(r=>r.expeditionEffect.kind==='teamCard'?[r.expeditionEffect.group]:[]);
 if(groups.includes('firepower')&&groups.includes('defense')){found=true;break;}
 assert.ok(w.reroll());
}
assert.ok(found,'Native random draft with both team cards');
w.wallet={minerals:76,gas:248};
const fixture=path.resolve(out,'shop.json');
await fs.writeFile(fixture,writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),shopProgress:shopProgress(w).snapshot()}));
const server=createGameServer({webRoot:path.resolve('dist/web'),assetRoot:path.resolve('dist/web')});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+(server.address() as any).port;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
const report:any={at:new Date().toISOString(),appBuildId:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')).appBuildId,method:'Actual production UI and a diagnostic archive using native random offers; no CSS or runtime injection. Geometry records current defects, not acceptance.',rolls,views:[],captures:[],errors:[]};
let context:any,page:any;
const readCards=async()=>await page.locator('#reward-cards .im-card').evaluateAll(new Function('ns',`return ns.map(n=>{const rect=selector=>{const e=n.querySelector(selector);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};return {name:n.querySelector('h2')?.textContent,art:rect('.im-card-art'),title:rect('.im-card-title'),copy:rect('.im-card-copy'),progress:rect('.im-card-progress'),price:rect('.im-card-price'),action:rect('.im-card-action'),status:n.querySelector('.im-card-status')?.textContent,disabled:n.querySelector('button.im-card-action')?.hasAttribute('disabled'),short:n.classList.contains('im-short')};})`) as (nodes:Element[])=>unknown[]);
const shot=async(name:string)=>{const file=out+'/'+name+'.png';await page.screenshot({path:file});report.captures.push(file);};
try{
 for(const size of (process.argv.includes('--geometry-only')?[{width:1203,height:1063}]:[{width:1203,height:1063},{width:1440,height:900},{width:390,height:844},{width:844,height:390}])){
  const mobile=size.width===390||size.height===390,name=size.width+'x'+size.height;
  context=await browser.newContext({viewport:size,isMobile:mobile,hasTouch:mobile});page=await context.newPage();
  page.on('pageerror',(e:any)=>report.errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(url,{timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
  await page.locator('.main-actions [data-action=menu-load]').click();const choose=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await choose).setFiles(fixture);await page.locator('[data-action=menu-load-ready]').click();
  for(let attempt=0;attempt<10;attempt++){try{await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:30000});break;}catch{console.log(name+' preparing '+JSON.stringify(await page.evaluate(()=>window.__SC2_REPORT__?.().readiness)));}}
  const readiness=await page.evaluate(()=>window.__SC2_REPORT__?.().readiness);assert.equal(readiness?.phase,'ready',JSON.stringify(readiness));await page.waitForTimeout(750);
  const ready=await page.locator('.loading-actions').evaluate((n:HTMLElement)=>{const b=n.querySelector('button')!.getBoundingClientRect(),p=n.getBoundingClientRect();return {button:{x:b.x,y:b.y,width:b.width,height:b.height},container:{x:p.x,y:p.y,width:p.width,height:p.height},centerOffset:b.x+b.width/2-(p.x+p.width/2),viewportCenterOffset:b.x+b.width/2-innerWidth/2};});
  await shot(name+'-ready');await page.locator('[data-action=flow-continue]').click();await page.locator('#reward-cards').waitFor();await page.waitForTimeout(900);
  const cards=await readCards();assert.equal(cards.length,3,'All native card rectangles recorded');
  const tools=await page.locator('.feedback-progress-strip button,.im-footer>button').evaluateAll((ns:HTMLElement[])=>ns.map(n=>{const b=n.getBoundingClientRect();return {name:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height};}));
  await shot(name+'-shop');await page.locator('.im-heading [data-action=ui-menu]').click();await page.locator('.pause-modal').waitFor();await shot(name+'-intermission-menu');
  const entries=await page.locator('.pause-modal [data-action]').allTextContents();await page.locator('.pause-modal [data-action=settings]').click();await page.locator('.settings-modal').waitFor();await shot(name+'-settings');
  const settings=await page.locator('[data-action=settings-tab]').allTextContents();report.views.push({size,ready,cards,tools,entries,settings});
  await page.locator('[data-action=settings-tab][data-tab=graphics]').click();await page.locator('[data-setting=text-scale]').selectOption('1.5');await page.locator('.modal-footer [data-action=settings-back]').click();await page.locator('.pause-modal .modal-footer [data-action=ui-back]').click();await page.waitForTimeout(700);
  const largeTextCards=await readCards();assert.equal(largeTextCards.length,3);await shot(name+'-shop-text150');report.views.at(-1).largeTextCards=largeTextCards;
  await context.close();context=null;
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;if(page&&!page.isClosed())await shot('failure');}
finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await context?.close();await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({views:report.views.length,captures:report.captures.length,errors:report.errors,failure:report.failure??null}));}
