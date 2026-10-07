/** Isolated same-frame DOM geometry check; uses public actions and real archives. */
import {chromium,type Page} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const out=process.env.SC2_QA_DIR??'reports/local/ui-fidelity-round-20261006/geometry-final',app=process.env.SC2_UI_URL??'http://127.0.0.1:4190/';
const ref='http://127.0.0.1:4191/reports/local/ui-fidelity-round-20261006/reference-frame.html';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report:any={app,captures:[],errors:[]};
const click=async(p:Page,s:string)=>p.locator(s+':visible:not(:disabled)').last().click();
const shot=async(p:Page,name:string)=>{
 await p.waitForFunction(()=>document.getAnimations().filter(a=>Number.isFinite(a.effect?.getTiming().iterations)).every(a=>a.playState!=='running'),null,{timeout:5000});
 await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})));});
 const parts=await p.evaluate(()=>['.home-copy','.wordmark-sc','.wordmark h1','.wordmark-en','.main-actions','.modal-window','.modal-heading','.modal-content','.modal-footer','.settings-tabs','.settings-tabs button','.keyboard-diagram','.setting-row','.battle-top','.battle-playfield','.battle-map-rim','.mini-map','#battle-console','.console-body','.im-heading','.im-steps','.im-caption','.im-choice-grid','.im-card','.im-footer'].flatMap(selector=>[...document.querySelectorAll<HTMLElement>(selector)].filter(e=>e.getBoundingClientRect().width&&!e.closest('[hidden]')).map((e,index)=>{const c=getComputedStyle(e);return{selector,index,rect:e.getBoundingClientRect().toJSON(),font:c.font,color:c.color,padding:c.padding,gap:c.gap,display:c.display,lineHeight:c.lineHeight,text:e.textContent?.replace(/\s+/g,' ').slice(0,900)};})));
 await p.screenshot({path:out+'/'+name+'.png',animations:'disabled'});report.captures.push({name,parts});await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
};
try{for(const [label,width,height,touch]of [['desktop',1280,720,false],['portrait',390,844,true],['minimum',320,568,true],['short-landscape',844,390,true],['narrow-desktop',1024,768,false]]as const){
 if(process.env.SC2_UI_VIEW&&process.env.SC2_UI_VIEW!==label)continue;
 for(const source of ['reference','runtime']){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,acceptDownloads:true}),p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  const root=source==='reference'?ref+'?device='+(touch?'mobile':'desktop'):app;await p.goto(root+(source==='reference'?'#home':''),{timeout:120000});
  if(source==='reference')await p.locator('.cover-dots button').first().click();else await p.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
  await shot(p,source+'-home-'+label);
  if(source==='reference')await p.goto(root+'#settings',{timeout:120000});else await click(p,'[data-action=settings]');
  await shot(p,source+'-settings-'+label);
  if(source==='reference'){await p.goto(root+'#talents',{timeout:120000});await click(p,'[data-action=talent-race][data-value=terran]');await click(p,'[data-action=talent-line][data-value=resources]');await p.locator('[data-action=select-talent]').first().click();}
  else{await click(p,'[data-action=settings-back]');await click(p,'[data-action=talents]');await click(p,'[data-action=mvp-talent-race][data-race=terran]');await click(p,'[data-action=talent-line][data-line=resources]');await p.locator('[data-action=mvp-talent-select]').first().click();}
  await shot(p,source+'-talent-node-'+label);
  if(source==='reference'){await click(p,'[data-action=modal-close]');await p.goto(root+'#battle',{timeout:120000});await p.locator('.battle-page').waitFor();}else{await click(p,'[data-action=talents-back]');await click(p,'[data-action=talent-exit]');await click(p,'[data-action=menu-load]');await p.locator('input[type=file][accept*=json]').setInputFiles(path.resolve('reports/local/ui-fidelity-round-20261006/fixtures/terran-battle.json'));await click(p,'[data-action=menu-load-ready]');await p.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await click(p,'[data-action=flow-continue]');await click(p,'.pause-actions [data-action=pause]');}
  await shot(p,source+'-battle-'+label);
  if(source==='reference')await p.goto(root+'#shop',{timeout:120000});else{await click(p,'#topbar [data-action=pause]');await click(p,'[data-action=restart]');await click(p,'[data-action=menu-load]');await p.locator('input[type=file][accept*=json]').setInputFiles(path.resolve('reports/local/ui-fidelity-round-20261006/fixtures/terran-shop.json'));await click(p,'[data-action=menu-load-ready]');await p.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await click(p,'[data-action=flow-continue]');}
  await shot(p,source+'-shop-'+label);await ctx.close();console.log(source+' '+label+' captured');
 }
}assert.deepEqual(report.errors,[]);}catch(e){report.failure=String((e as Error).stack??e);process.exitCode=1;}finally{await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({captures:report.captures.length,errors:report.errors,failure:report.failure??null}));}
