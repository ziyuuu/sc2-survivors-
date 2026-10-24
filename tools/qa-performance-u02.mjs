import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import os from 'node:os';
const mode=process.argv[2]??'fixed',run=process.argv[3]??mode+'-1',fixed=mode==='fixed',uiOnly=process.argv[4]==='ui-only';
const folder='performance-u02-20261019'+(fixed?'':'-baseline'),root=path.resolve('reports/local/performance-u02-20261019',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile('tools/qa-performance-u02.mjs',root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex');
const report={run,mode,started:new Date().toISOString(),build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),host:{cpu:os.cpus()[0].model,memory:os.totalmem(),release:os.release()},checks:[],actions:[],benchmark:[],screens:[],errors:[],requests:[],states:{}};
const context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1}),page=context.pages()[0];page.setDefaultTimeout(60000);
let action='loading';page.on('pageerror',e=>report.errors.push({action,message:e.message,stack:e.stack}));page.on('console',m=>{if(m.type()==='error')report.errors.push({action,message:m.text()});});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
page.on('response',r=>{if(r.status()>=400)report.errors.push({action,status:r.status(),url:r.url()});});
await page.addInitScript(()=>{localStorage.setItem('sc2.renderQuality','native');localStorage.setItem('sc2.ordinaryEffects','full');localStorage.setItem('sc2.heroEffects','full');localStorage.setItem('sc2.animationMode','complete');});
const call=(method,args=[])=>page.evaluate(async({method,args})=>window.__B03__[method](...args),{method,args});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const gear=s=>page.locator('#native-starship '+s);
const click=s=>gear(s).first().click();
async function check(name,result){report.checks.push({name,result});if(fixed)assert.ok(result,name);await save();}
async function shot(name){await settle();const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({file,sha256:hash(await fs.readFile(file))});}
async function account(name){report.states[name]=await page.evaluate(()=>JSON.stringify(window.__B03__.world.starship.account,(_,v)=>v instanceof Set?[...v]:v instanceof Map?[...v]:v));await save();}
async function measure(name,fn){action=name;await call('begin',[true,false]);const at=performance.now();await fn();await settle();const result=await call('end');report.actions.push({name,wallMs:performance.now()-at,ui:result.ui});await save();}
try{
 await page.goto('http://127.0.0.1:4436/'+folder+'/',{timeout:120000});await page.waitForFunction(()=>!!window.__B03__,null,{timeout:180000});report.device=await call('device');
 for(const size of [0,1000]){
  await call('warehouse',[size]);await page.locator('[data-action=starship]:visible').click();await click('[data-act=page][data-page=warehouse]');
  await check('capacity-'+size,(await call('extra')).warehouse===size);
  await account('warehouse-'+size);
  for(let repeat=0;repeat<3;repeat++){
   await measure('search-'+size+'-'+repeat,()=>gear('[data-filter=query]').fill('攻击'));
   await measure('clear-'+size+'-'+repeat,()=>gear('[data-filter=query]').fill(''));
   await measure('sort-'+size+'-'+repeat,()=>gear('[data-filter=sort]').selectOption(repeat%2?'quality':'hp'));
   if(size){await measure('next-'+repeat,()=>click('[data-act=next]'));await measure('prev-'+repeat,()=>click('[data-act=prev]'));}
  }
  await check('search-blur-'+size,await page.evaluate(()=>{const r=document.querySelector('#native-starship'),q=r.querySelector('[data-filter=query]');q.focus();q.value='甲';q.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'甲'}));const retained=q===r.querySelector('[data-filter=query]');r.querySelector('[data-filter=sort]').focus();return retained&&r.querySelector('[data-filter=query]').value==='甲';}));
  await gear('[data-filter=query]').fill('');
  if(size){
   // Synchronous synthetic dispatch isolates handler work; separately record real browser input above.
   action='synthetic-handler-benchmark';
   report.benchmark=await page.evaluate(()=>{
    const root=document.querySelector('#native-starship'),rows=[];
    const perform=(name,fn)=>{const shell=root.firstElementChild,query=root.querySelector('[data-filter=query]'),at=performance.now();fn();const ms=performance.now()-at;rows.push({name,ms,shellRetained:shell===root.firstElementChild,inputRetained:query===root.querySelector('[data-filter=query]'),count:root.querySelector('.inventory-summary').textContent});};
    for(let n=0;n<15;n++){
     for(const value of ['攻击','','稳压',''])perform(value==='稳压'?'search-match':value?'search':'clear',()=>{const q=root.querySelector('[data-filter=query]');q.value=value;q.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:value?'insertText':'deleteContentBackward',data:value}));});
     perform('sort',()=>{const s=root.querySelector('[data-filter=sort]');s.value=n%2?'hp':'quality';s.dispatchEvent(new Event('change',{bubbles:true}));});
     perform('next',()=>root.querySelector('[data-act=next]').click());perform('prev',()=>root.querySelector('[data-act=prev]').click());
     perform('select',()=>root.querySelector('[data-select]').click());
    }return rows;
   });
   await check('benchmark-keeps-shell',report.benchmark.every(r=>r.shellRetained&&r.inputRetained));
   await measure('filter-open',()=>click('[data-act=toggle-filters]'));
   await measure('filter-quality',()=>gear('[data-multi-filter=quality][value="3"]').check());
   await check('quality-filter',await page.evaluate(()=>[...document.querySelectorAll('#native-starship .card-open')].every(c=>c.classList.contains('rarity-3'))));
   await measure('clear-filters',()=>click('[data-act=clear-filters]'));
   await check('filter-clear-count',await gear('.inventory-summary').textContent().then(s=>s.includes('1000 件')));
   await click('[data-act=toggle-filters]');await click('[data-act=toggle-filters]');
   await gear('[data-filter=sort]').selectOption('quality');await click('.card-open');await shot('warehouse-inspector');
   await click('[data-act=equip]');await click('.card-open');
   await check('comparison',await gear('.inspect-old').count()===1);await shot('warehouse-comparison');
   action='management-filter-invalidation';await click('[data-act=lock]');await click('[data-act=toggle-filters]');await gear('[data-multi-filter=state][value="locked"]').check();await check('locked-filter-count',await gear('.card-open').count()===1);await click('[data-act=lock]');await check('unlock-invalidates-list',await gear('.card-open').count()===0);await click('[data-act=clear-filters]');
   if(fixed){
    await check('input-composition-preserved',await page.evaluate(()=>{
     const r=document.querySelector('#native-starship'),q=r.querySelector('[data-filter=query]'),inspector=r.querySelector('.equipment-inspector');q.focus();q.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));q.value='攻击';q.setSelectionRange(1,1);q.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText',data:'攻击'}));q.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'攻击'}));return q===document.activeElement&&q===r.querySelector('[data-filter=query]')&&q.selectionStart===1&&inspector===r.querySelector('.equipment-inspector');
    }));await gear('[data-filter=query]').fill('');
    await check('select-keeps-image',await page.evaluate(()=>{const r=document.querySelector('#native-starship'),img=r.querySelector('.item-grid img'),c=r.querySelector('[data-select]');c.focus();c.click();return img===r.querySelector('.item-grid img')&&document.activeElement===c;}));
   }
   await click('[data-act=back]');
   await click('[data-act=save-preset][data-index="0"]');await click('[data-act=confirm]');
   await click('[data-act=rename-preset][data-index="0"]');await gear('[data-preset-name]').fill('U02 仓库验证');await gear('form [type=submit]').click();
   await check('preset-name',await gear('[data-act=rename-preset][data-index="0"]').textContent().then(s=>s.includes('U02 仓库验证')));
   await click('[data-act=apply-preset][data-index="0"]');await click('[data-act=confirm]');
   await click('.card-open');const before=await call('extra');await click('[data-act=dismantle]');await click('[data-act=confirm]');
   await check('dismantle',before.warehouse-(await call('extra')).warehouse===1);await account('after-commands');
   await check('account-revision-invalidates-list',await gear('.inventory-summary').textContent().then(s=>s.startsWith(String(before.warehouse-1)+' 件')));
   for(const [width,height]of [[1440,900],[1024,768],[844,390],[390,844]]){
    await page.setViewportSize({width,height});await measure('matching-search-'+width,()=>gear('[data-filter=query]').fill('稳压'));await check('matching-search-'+width,await gear('.card-open').count()>0&&await gear('.card-open').allTextContents().then(rows=>rows.every(s=>s.includes('稳压'))));await gear('[data-filter=query]').fill('');await shot('layout-'+width);
    await check('layout-horizontal-'+width,await page.evaluate(()=>{const r=document.querySelector('#native-starship');return r.scrollWidth<=r.clientWidth+2;}));
    if(fixed){const scroll=await page.evaluate(()=>{const r=document.querySelector('#native-starship'),q=r.querySelector('[data-filter=query]');r.scrollTop=200;const before=r.scrollTop;q.value='甲';q.dispatchEvent(new InputEvent('input',{bubbles:true,data:'甲'}));return {before,after:r.scrollTop,max:Math.max(0,r.scrollHeight-r.clientHeight)};});report.checks.push({name:'scroll-values-'+width,scroll});await check('scroll-kept-or-clamped-'+width,Math.abs(scroll.after-Math.min(scroll.before,scroll.max))<=1);}
    await gear('[data-filter=query]').fill('');
   }await page.setViewportSize({width:1440,height:900});
  }
  await gear('[data-act=close]').last().click();
 }
 if(fixed&&!uiOnly){
  action='battle-lifecycle';await call('warehouse',[0]);
  for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
  await page.waitForFunction(()=>window.__B03__.readiness.state.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__B03__.world.phase==='battle');await call('freeze');
  for(let n=0;n<3;n++){
   await page.keyboard.press('i');await check('backpack-paused-'+n,await page.evaluate(()=>window.__B03__.world.interfacePaused&&!window.__B03__.world.paused));const before=await call('snapshot');await gear('[data-filter=query]').fill('攻击');await gear('[data-filter=query]').fill('');await call('play');await page.waitForTimeout(300);await call('freeze');await check('backpack-world-stable-'+n,(await call('snapshot'))===before);if(n===0)await shot('battle-backpack');await gear('[data-act=close]').last().click();await check('battle-resumed-'+n,await page.evaluate(()=>!window.__B03__.world.interfacePaused&&!window.__B03__.world.paused));
  }
  await page.keyboard.press('Escape');await page.keyboard.press('i');await check('pause-not-overridden',!(await gear('[data-filter=query]').isVisible())&&(await call('extra')).paused);await page.locator('[data-action=restart]:visible').click();
  const before=await call('snapshot');for(const selector of ['[data-action=menu-new]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]'])await page.locator(selector).click();
  await check('active-run-start-disabled',await page.locator('[data-action=menu-start]').isDisabled());await check('active-run-copy',await page.locator('.departure-notice').textContent().then(s=>s.includes('当前出征尚未结束')&&!s.includes('新游戏将覆盖')));await shot('active-run-notice');await check('new-run-attempt-state-stable',(await call('snapshot'))===before);
  for(let n=0;n<3;n++)await page.locator('[data-action=menu-back]').click();await page.locator('[data-action=save-continue]:visible').click();await call('freeze');await check('same-page-continue',(await call('extra')).phase==='battle');await shot('battle-return');
  await check('same-page-preserves-user-pause',(await call('extra')).paused===true);await page.keyboard.press('Escape');
  const time=(await call('extra')).time;await call('play');await page.waitForTimeout(500);await call('freeze');await check('actual-loop-resumes',(await call('extra')).time>time);
  action='intermission';await call('drops',['mixed',96,true]);await page.evaluate(()=>{const a=window.__B03__;a.world.endStage();a.world.changed();a.hud.update();});
  await page.locator('[data-action=starship-backpack]:visible').click();await gear('[data-filter=query]').fill('稳压');await gear('[data-filter=query]').fill('');await click('[data-act=next]');await click('[data-act=prev]');
  const initial=(await call('extra')).backpack;await click('.card-open');await click('[data-act=equip]');await check('intermission-equip',(await call('extra')).backpack===initial-1);await click('[data-act=inspector-close]');await gear('.card-open').last().click();await click('[data-act=dismantle]');await click('[data-act=confirm]');await check('intermission-dismantle',(await call('extra')).backpack===initial-2);await shot('intermission-inventory');
  await page.locator('[data-action=ui-back]:visible').first().click();await check('intermission-return',(await call('extra')).phase==='reward'&&!await gear('[data-filter=query]').isVisible());
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 }
 if(fixed)assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 report.pass=true;
}catch(e){report.failure=String(e);throw e;}finally{await save();await context.close();}
console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,errors:report.errors.length,screens:report.screens.length}));
