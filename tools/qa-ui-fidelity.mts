/** Project-owned, isolated browser regression. Never attaches to a user browser. */
import {chromium, type Page} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {readArchive} from '../src/persistence/archive';import {encodeGraph} from '../src/persistence/graph-codec';
const out=process.env.SC2_QA_DIR??'reports/local/ui-fidelity-round-20261006/browser';
const app=process.env.SC2_UI_URL??'http://127.0.0.1:4190/';
const ref='http://127.0.0.1:4191/reports/local/ui-fidelity-round-20261006/reference-frame.html';
const fixtures=path.resolve('reports/local/ui-fidelity-round-20261006/fixtures');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report:any={method:'Isolated repository-owned browser QA; real archives, public UI actions and existing read-only diagnostics. Original R12 and runtime use identical content frames. Synthetic viewport/touch is not physical-device acceptance.',app,captures:[],checks:[],errors:[]};
let current:Page;
const read=async(p:Page)=>p.evaluate(()=>window.__SC2_REPORT__?.());
const tap=async(p:Page,selector:string)=>{await p.locator(selector+':visible:not(:disabled)').last().click();};
const capture=async(p:Page,name:string)=>{
 await p.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).every(a=>a.playState!=='running'),null,{timeout:5000});
 await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})));});
 const meta=await p.evaluate(()=>{
  const root=document.querySelector('#interface')??document.querySelector('#game-frame')!,rect=root.getBoundingClientRect();
  const parts=['.masthead','.home-copy','.main-actions','.game-footer','.screen-heading','.race-grid','.difficulty-layout','.talent-heading','.talent-tree-board','.talent-menu-footer','.im-heading','.im-choice-grid','.im-card','.im-library-filters','.modal-window','.modal-heading','.modal-footer','.ui12-window','.ui12-body','.battle-top','.battle-playfield','.battle-map-rim','.mini-map','#battle-console','.console-body','#roster','#skills'];
  return {viewport:{width:innerWidth,height:innerHeight},frame:rect.toJSON(),phase:document.body.dataset.uiPhase,text:(document.querySelector('#overlay')??root).textContent?.replace(/\s+/g,' ').slice(0,20000),parts:parts.flatMap(s=>[...document.querySelectorAll<HTMLElement>(s)].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {selector:s,rect:r.toJSON(),font:c.font,color:c.color,background:c.backgroundColor,overflow:c.overflow,padding:c.padding,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight};})),missing:[...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().width&&getComputedStyle(i).opacity!=='0'&&(!i.complete||!i.naturalWidth)).map(i=>i.currentSrc.slice(0,150)),overflow:root.scrollWidth>rect.width+1};
 });
 await p.screenshot({path:out+'/'+name+'.png',animations:'disabled'});
 report.captures.push({name,...meta});await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));
 assert.deepEqual(meta.missing,[],name+': missing visible images');assert.ok(!meta.overflow,name+': frame overflow');
 console.log('capture '+name);
};
const readiness=async(p:Page)=>{await p.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});assert.equal((await read(p)).readiness.phase,'ready');};
const exportRun=async(p:Page)=>{const pending=p.waitForEvent('download');await tap(p,'[data-action=save-export]');return readArchive(await fs.readFile(await(await pending).path()!,'utf8')).bundle;};
async function load(p:Page,name:string){await tap(p,'[data-action=menu-load]');await p.locator('input[type=file][accept*=json]').setInputFiles(path.join(fixtures,name+'.json'));await p.locator('[data-action=menu-load-ready]').waitFor({state:'visible'});await tap(p,'[data-action=menu-load-ready]');await readiness(p);await tap(p,'[data-action=flow-continue]');await p.waitForFunction(()=>window.__SC2_REPORT__().phase!=='menu');}
async function restart(p:Page){const buttons=p.locator('[data-action=restart]');if(!(await buttons.count())){await p.keyboard.press('Escape');await tap(p,'[data-action=restart]');}else await buttons.last().click();await p.waitForFunction(()=>window.__SC2_REPORT__().phase==='menu');}
const views=[['desktop',1280,720,false],['portrait',390,844,true],['minimum',320,568,true],['short-landscape',844,390,true],['narrow-desktop',1024,768,false]] as const;
try{
 for(const [label,width,height,touch] of views){
  if(process.env.SC2_UI_VIEW&&process.env.SC2_UI_VIEW!==label)continue;
  if(!process.env.SC2_UI_REFERENCE_ONLY){const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,acceptDownloads:true}),p=current=await ctx.newPage();p.on('pageerror',e=>report.errors.push(label+': '+e.message));
  await p.goto(app,{timeout:120000});await p.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
  await capture(p,'runtime-home-'+label);assert.equal(await p.locator('[data-action=cover-auto]').count(),0);assert.ok(!(await p.locator('#overlay').innerText()).includes('朋友试玩'));
  await tap(p,'[data-action=menu-new]');await capture(p,'runtime-race-'+label);await tap(p,'[data-action=menu-race-next]');await capture(p,'runtime-difficulty-'+label);await tap(p,'[data-action=menu-difficulty-next]');await capture(p,'runtime-confirm-'+label);
  await tap(p,'[data-action=menu-back]');await tap(p,'[data-action=menu-back]');await tap(p,'[data-action=menu-back]');
  await tap(p,'[data-action=talents]');await capture(p,'runtime-talent-races-'+label);await tap(p,'[data-action=mvp-talent-race][data-race=terran]');await capture(p,'runtime-talent-lines-'+label);await tap(p,'[data-action=talent-line][data-line=resources]');await capture(p,'runtime-talent-tree-'+label);assert.equal(await p.locator('[data-action=mvp-talent-select]').count(),16);await p.locator('[data-action=mvp-talent-select]').first().click();await capture(p,'runtime-talent-node-'+label);await tap(p,'[data-action=talents-back]');await tap(p,'[data-action=talent-exit]');
  await tap(p,'[data-action=settings]');for(const tab of ['controls','graphics','audio','saves']){await tap(p,'[data-action=settings-tab][data-tab='+tab+']');await capture(p,'runtime-settings-'+tab+'-'+label);}await tap(p,'[data-action=settings-back]');
  await tap(p,'[data-action=menu-load]');await capture(p,'runtime-saves-empty-'+label);await tap(p,'[data-action=menu-back]');
  await load(p,'terran-battle');await capture(p,'runtime-pause-'+label);
  const imported=await exportRun(p),original=readArchive(await fs.readFile(path.join(fixtures,'terran-battle.json'),'utf8')).bundle;assert.deepEqual(encodeGraph(imported.run!.state),encodeGraph(original.run!.state));
  await tap(p,'[data-action=pause-production]');await capture(p,'runtime-production-'+label);await tap(p,'[data-action=ui-rest-repair]');await capture(p,'runtime-repair-choices-'+label);await tap(p,'[data-action=ui-info-close]');await tap(p,'[data-action=pause-production-close]');
  await tap(p,'.pause-actions [data-action=pause]');await capture(p,'runtime-battle-'+label);
  const before=(await read(p)).time;await tap(p,'[data-seat="marine:0"]');await capture(p,'runtime-inspector-stats-'+label);await tap(p,'[data-inspect-tab=abilities]');await p.waitForFunction(()=>!!document.querySelector('.ui12-ability-details[open]'));await capture(p,'runtime-inspector-abilities-'+label);await tap(p,'[data-inspect-tab=army]');await capture(p,'runtime-inspector-army-'+label);assert.ok((await read(p)).time>before,'Inspector must not pause battle');await tap(p,'[data-inspect-close]');
  await tap(p,'#army-toggle');await capture(p,'runtime-army-collapsed-'+label);await tap(p,'#commands-toggle');await capture(p,'runtime-both-collapsed-'+label);await tap(p,'#army-toggle');await tap(p,'#commands-toggle');await tap(p,'#topbar [data-action=pause]');await restart(p);
  for(const fixture of ['terran-development','terran-shop']){await load(p,fixture);await capture(p,'runtime-'+(fixture.endsWith('shop')?'shop':'development')+'-'+label);if(fixture.endsWith('development')){const directions=p.locator('[data-action=development-direction]');if(await directions.count())await directions.first().click();await capture(p,'runtime-development-selected-'+label);}
   for(const page of ['catalog','heroes','contracts','rest']){await tap(p,'[data-action=ui-menu]');await tap(p,'[data-action=ui-page][data-page='+page+']');await capture(p,'runtime-'+page+'-'+label);if(page==='catalog'){await p.locator('[data-catalog-filter=group]').selectOption('elite');await capture(p,'runtime-catalog-elite-'+label);await tap(p,'.im-card-face');await capture(p,'runtime-card-detail-'+label);await tap(p,'[data-action=ui-back]');}await tap(p,'[data-action=ui-back]');}
   await tap(p,'[data-action=ui-menu]');await tap(p,'[data-action=settings]');await tap(p,'[data-action=settings-tab][data-tab=saves]');await tap(p,'[data-action=restart]');await p.waitForFunction(()=>window.__SC2_REPORT__().phase==='menu');
  }
  if(label==='desktop'||label==='portrait')for(const f of ['won','lost','endless']){await load(p,f);await capture(p,'runtime-'+f+'-'+label);if(f==='won'){await tap(p,'[data-action=endless]');await capture(p,'runtime-endless-entry-'+label);await tap(p,'[data-action=skip]');await tap(p,'[data-action=skip]');await capture(p,'runtime-endless-overview-'+label);await tap(p,'[data-action=endless-back]');}if(await p.locator('[data-action=ui-menu]').count())await tap(p,'[data-action=ui-menu]');if(await p.locator('[data-action=settings]').count()){await tap(p,'[data-action=settings]');await tap(p,'[data-action=settings-tab][data-tab=saves]');}await restart(p);}
  report.checks.push({label,width,height,touch,archivePreserved:true,inspectorLive:true,allMainRoutes:true});await ctx.close();}
  const rc=await browser.newContext({viewport:{width,height}}),rp=await rc.newPage();await rp.goto(ref+'?device='+(touch?'mobile':'desktop')+'#home',{timeout:120000});
  for(const route of ['home','race','difficulty','confirm','loading','talents','saves','battle','development','shop','cards','heroes','rest','pause','production','settings','family','victory','endless']){await rp.goto(ref+'?device='+(touch?'mobile':'desktop')+'#'+route,{timeout:120000});await rp.waitForFunction((route:string)=>{const state=(window as any).__UI_PREVIEW__?.getState();return state?.page===route||state?.layer===route;},route);if(route==='home')await rp.locator('.cover-dots button').first().click();await capture(rp,'reference-'+route+'-'+label);
   if(route==='talents'){await tap(rp,'[data-action=talent-race][data-value=terran]');await capture(rp,'reference-talent-lines-'+label);await tap(rp,'[data-action=talent-line][data-value=resources]');await capture(rp,'reference-talent-tree-'+label);await rp.locator('[data-action=select-talent]').first().click();await capture(rp,'reference-talent-node-'+label);await tap(rp,'[data-action=modal-close]');}
   if(route==='battle'){await rp.locator('[data-action=inspect-unit]').first().click();await capture(rp,'reference-inspector-stats-'+label);await tap(rp,'[data-action=ui12-tab][data-value=skills]');await capture(rp,'reference-inspector-abilities-'+label);await tap(rp,'[data-action=ui12-tab][data-value=roster]');await capture(rp,'reference-inspector-army-'+label);await tap(rp,'[data-action=modal-close]');}
  }
  await rc.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;if(current&&!current.isClosed())await current.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({views:report.checks.length,captures:report.captures.length,errors:report.errors,failure:report.failure??null}));}
