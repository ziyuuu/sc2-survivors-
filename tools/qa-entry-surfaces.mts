import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';import {createGameServer} from './coze-web-server.mjs';
const out=process.env.SC2_SURFACES_QA_DIR??'reports/local/entry-fixes-20261009/surfaces-r4';await fs.mkdir(out,{recursive:true});
const server=createGameServer({webRoot:path.resolve('dist/web'),backendOptions:{config:{enabled:false}}});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(20000);
// tsx may retain function-name helpers inside callbacks serialized into the browser.
await context.addInitScript('window.__name = (fn) => fn');
const report:any={build:JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),method:'Native navigation, current-schema fixture, isolated Chrome. Geometric containment, alignment, text overflow, resizing and scroll reachability; not natural or physical-device acceptance.',screens:[],records:[],issues:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const sizes=[[1440,900],[1194,985],[390,844],[844,390],[320,640]];
async function size(width:number,height:number,textScale=1){await page.setViewportSize({width,height});await page.evaluate(s=>document.documentElement.style.setProperty('--text-scale',String(s)),textScale);await page.waitForTimeout(350);}
async function capture(name:string){
 const geometry=await page.evaluate(()=>{
  const bounds=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
  const visible=(e:Element)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
  const issues:any[]=[],cards:any[]=[],modals:any[]=[];const root=document.querySelector('#overlay')!;
  for(const el of root.querySelectorAll('.intermission-screen>.im-choice-grid>.im-card')){
   const card=bounds(el),parts=[...el.querySelectorAll('.imx-art,.imx-name,.imx-kind,.imx-copy,.im-card-bottom,.im-card-status,.imx-service-detail')].filter(visible).map(e=>({class:e.className,text:e.textContent?.trim().slice(0,60),r:bounds(e)}));
   for(const p of parts)if(p.r.x<card.x-1||p.r.right>card.right+1||p.r.y<card.y-1||p.r.bottom>card.bottom+1)issues.push({kind:'card-content-outside',part:p,card});
   for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=parts[i].r,b=parts[j].r;if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)issues.push({kind:'card-parts-overlap',a:parts[i],b:parts[j]});}
   const art=el.querySelector('.imx-art')!,ar=bounds(art);if(ar.height/Number((root as HTMLElement).style.getPropertyValue('--ui-layout-scale'))<90)issues.push({kind:'artwork-too-short',r:ar});
   for(const badge of art.querySelectorAll('.imx-badges b,.imx-badges strong'))if(badge.textContent?.trim()){const b=bounds(badge);if(b.x<ar.x-1||b.right>ar.right+1||b.y<ar.y-1||b.bottom>ar.bottom+1)issues.push({kind:'artwork-badge-clipped',r:ar,b,text:badge.textContent});}
   const copy=el.querySelector('.imx-copy[aria-expanded=false]');if(copy){const r=bounds(copy),b=bounds(copy.querySelector('span')!);if(b.x<r.x-1||b.right>r.right+1||b.y<r.y-1||b.bottom>r.bottom+1)issues.push({kind:'simple-copy-clipped',r,b,text:copy.textContent});}
   cards.push({r:card,parts});
  }
  for(const e of root.querySelectorAll('.intermission-screen>.im-choice-grid'))if(visible(e)&&root.getAttribute('data-layout')!=='portrait'&&e.querySelector('.im-card')&&e.scrollHeight>e.clientHeight+2)issues.push({kind:'landscape-card-scroll',height:e.clientHeight,scroll:e.scrollHeight});
  for(const e of root.querySelectorAll('.modal-window'))if(visible(e)){const r=bounds(e);modals.push({class:e.className,r});if(r.x<-.6||r.right>innerWidth+.6||r.y<-.6||r.bottom>innerHeight+.6)issues.push({kind:'modal-outside',r,class:e.className});if(Math.abs(r.x+r.width/2-innerWidth/2)>1.5)issues.push({kind:'modal-not-centered',r,class:e.className});}
  for(const e of root.querySelectorAll('.screen-bottom,.talent-menu-footer,.intermission-screen>.im-footer,.loading-actions'))if(visible(e)){const r=bounds(e);if(r.x<-.6||r.right>innerWidth+.6||r.y<-.6||r.bottom>innerHeight+.6)issues.push({kind:'footer-outside',r,class:e.className});}
  for(const e of root.querySelectorAll('button,h1,h2,h3,h4'))if(visible(e)){
   const r=bounds(e),s=getComputedStyle(e);if(['auto','scroll'].includes(s.overflowX)||['auto','scroll'].includes(s.overflowY))continue;
   // Painted borders and hover pseudo-elements can enlarge scrollWidth without overflowing text.
   const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node:Node|null;const textBoxes:any[]=[];
   while(node=walker.nextNode()){if(!node.textContent?.trim()||node.parentElement?.closest('svg,.sr-only')||!node.parentElement?.getClientRects().length)continue;const range=document.createRange();range.selectNodeContents(node);for(const box of range.getClientRects())if(box.width>0&&box.height>0)textBoxes.push({x:box.x,y:box.y,right:box.right,bottom:box.bottom});}
   for(const box of textBoxes)if(box.x<r.x-1||box.right>r.right+1||box.y<r.y-1||box.bottom>r.bottom+1)issues.push({kind:'painted-text-outside',class:e.className,text:e.textContent?.trim().slice(0,70),r,box});
  }
  return {viewport:[innerWidth,innerHeight],layout:root.getAttribute('data-layout'),scale:root.style.getPropertyValue('--ui-layout-scale'),cards,modals,issues};
 });
 report.records.push({name,...geometry});report.issues.push(...geometry.issues.map((issue:any)=>({name,...issue})));await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(name+': '+geometry.issues.length+' issues');
}
async function matrix(name:string){for(const [w,h]of sizes)for(const t of [1,1.5]){await size(w,h,t);await capture(`${name}-${w}-${t}`);}await size(1440,900);}
async function click(action:string){await page.locator(`#overlay [data-action="${action}"]:visible`).first().click();await page.waitForTimeout(350);}
async function menu(){await page.goto('http://127.0.0.1:'+(server.address()as any).port,{timeout:300000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:300000});}
async function load(){await click('menu-load');const chooser=page.waitForEvent('filechooser');await click('menu-load-file');await(await chooser).setFiles(path.resolve('reports/local/entry-fixes-20261009/web-r3/terran-shop.json'));await matrix('load-preview');await click('menu-load-ready');await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:300000});assert.equal((await page.evaluate(()=>window.__SC2_REPORT__())).readiness.phase,'ready');await matrix('loading-ready');await click('flow-continue');}
try{
 await menu();await matrix('home');await click('talents');await matrix('talent-races');await page.locator('[data-action=mvp-talent-race][data-race=terran]').click();await matrix('talent-lines');await page.locator('[data-action=talent-line][data-line=army]').click();await matrix('talent-tree');await click('talent-presets');await matrix('talent-presets');await page.keyboard.press('Escape');await click('talent-exit');
 await click('menu-new');await matrix('race');await click('menu-race-next');await matrix('difficulty');await click('menu-difficulty-next');await matrix('deployment');
 await menu();await load();await matrix('shop');
 for(const [w,h]of [[320,640],[390,844]]){await size(w,h,1.5);await page.locator('#reward-cards').evaluate(e=>e.scrollTop=e.scrollHeight);await capture(`shop-bottom-${w}`);}await size(1440,900);
 for(const action of ['battle-base','battle-research','battle-progress']){await click(action);await matrix(action);if(action==='battle-progress'){await page.locator('[data-tab=sources]').click();await matrix('enhancement-sources');}await page.keyboard.press('Escape');}
 await page.locator('[data-page=rest]').click();await matrix('rest');await click('ui-rest-repair');await matrix('repair-choice');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await click('settings');await matrix('settings-controls');await page.locator('[data-tab=graphics]').click();await matrix('settings-graphics');await page.keyboard.press('Escape');
 await click('skip');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:300000});await page.locator('#topbar [data-action=pause]').click();await matrix('pause');await click('pause-saves');await matrix('archives');await page.keyboard.press('Escape');await click('restart');
 await click('menu-new');await click('menu-race-next');await click('menu-difficulty-next');await matrix('deployment-with-save');for(const [w,h]of [[320,640],[844,390]]){await size(w,h,1.5);await page.locator('.departure-notice').scrollIntoViewIfNeeded();await capture(`save-notice-${w}`);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.issues,[]);
}catch(e){report.failure=String((e as Error).stack??e);await capture('failure').catch(()=>{});process.exitCode=1;}
finally{report.finalBuild=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({screens:report.screens.length,issues:report.issues.length,errors:report.errors,failure:report.failure?.slice(0,500)}));}
