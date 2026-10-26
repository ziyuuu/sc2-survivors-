import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

const mode=process.argv[2];assert.ok(['native','offline'].includes(mode));
const identities=process.argv.includes('--identities');
const root=path.resolve((identities?'.cache/t01-ui-main-20261025':'.cache/t01-set-layout-20261025')+'/qa-'+mode),profile=path.join(root,'profile');
await fs.mkdir(profile,{recursive:true});
const report={mode,checks:[],screens:[],errors:[],consoleErrors:[],http:[]};
let server,child,browser,page,timer;
const sizes={desktop:{width:1440,height:900},landscape:{width:844,height:390},portrait:{width:390,height:844}};
const fills=['','#28313b','#123324','#142f45','#342143','#452b18'];
const oldFills=['','#303a45','#173d2c','#193952','#3e2851','#51341e'];
const rgb=hex=>hex.match(/\w\w/g).map(n=>parseInt(n,16));
const luminance=channels=>channels.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const qualitySet=rows=>[...new Set(rows.map(r=>r.quality))].sort();
try{
 let url;
 if(mode==='native'){server=await serveT01();url=server.url+'/combined.html';}
 else{
  const build=JSON.parse(await fs.readFile(process.argv[3],'utf8')),artifact=build.artifacts.find(a=>a.mode==='combined'),hash=createHash('sha256');
  for await(const bytes of createReadStream(artifact.file))hash.update(bytes);assert.equal(hash.digest('hex'),artifact.sha256);report.htmlSha256=artifact.sha256;
  url=pathToFileURL(path.resolve(artifact.file)).href;
 }
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;
 for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0];page=context.pages()[0];
 if(mode==='offline')await context.setOffline(true);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.consoleErrors.push(e.text());});page.on('request',r=>{if(mode==='offline'&&/^https?:/.test(r.url()))report.http.push(r.url());});
 await page.setViewportSize(sizes.desktop);const focus=await context.newCDPSession(page);await focus.send('Emulation.setFocusEmulationEnabled',{enabled:true});
 timer=setInterval(()=>console.log(JSON.stringify({mode,phase:report.phase,checks:report.checks.length,errors:report.errors.length})),25000);
 report.phase='boot';await page.goto(url);await page.bringToFront();await page.waitForFunction(()=>globalThis.T01,null,{timeout:240000});
 if(mode==='offline')await page.waitForFunction(()=>T01.ready,null,{timeout:240000});
 const load=async(actor,race,target='populated')=>{await page.evaluate(id=>T01.load(id),`ui:starship:${actor}:${target}:${race}`);};
 const state=()=>page.evaluate(mode=>{
  const doc=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument,win=doc.defaultView,diagram=doc.querySelector('.ship-diagram'),rect=diagram?.getBoundingClientRect();
  const read=e=>{const s=win.getComputedStyle(e),b=e.getBoundingClientRect();return {quality:Number(e.className.match(/\brarity-([1-5])\b/)?.[1]),fill:s.getPropertyValue('--equipment-fill').trim(),bg:s.backgroundColor,tint:s.getPropertyValue('--equipment-tint').trim(),position:s.position,inside:!rect||b.left>=rect.left-1&&b.right<=rect.right+1&&b.top>=rect.top-1&&b.bottom<=rect.bottom+1};};
  const occupied=[...doc.querySelectorAll('.ship-slots .slot.occupied')].map(read),items=[...doc.querySelectorAll('.item-grid [data-act="detail"]')].map(read),empty=[...doc.querySelectorAll('.ship-slots .slot.empty')].map(read);
  const detail=doc.querySelector('.equipment-inspector .detail-art');
  return {occupied,items,empty,detailQuality:detail?Number(detail.className.match(/\brarity-([1-5])\b/)?.[1]):null,scripts:doc.scripts.length,canvases:doc.querySelectorAll('canvas').length,images:[...doc.querySelectorAll('#native-starship img')].filter(i=>i.getBoundingClientRect().width>0).map(i=>({loaded:i.complete&&i.naturalWidth>0}))};
 },mode);
 const checkColors=rows=>{for(const r of rows){assert.equal(r.fill,fills[r.quality]);assert.equal(r.bg,`rgb(${rgb(r.fill).join(', ')})`);assert.ok(luminance(rgb(r.fill))<luminance(rgb(oldFills[r.quality])));assert.ok((luminance(rgb(r.tint))+.05)/(luminance(rgb(r.fill))+.05)>4.5);}};
 const readyImages=()=>page.evaluate(async mode=>{const doc=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument,images=[...doc.images],loading=images.map(i=>i.loading);images.forEach(i=>i.loading='eager');try{await Promise.all(images.map(i=>i.decode().catch(()=>{})));}finally{images.forEach((i,n)=>i.loading=loading[n]);}},mode);
 const shot=async name=>{const file=path.join(root,name+'.png');if(mode==='native')await page.evaluate(()=>{const t=document.querySelector('#t01-tool');if(t.matches(':popover-open'))t.hidePopover();t.hidden=true;});await page.screenshot({path:file});report.screens.push(file);if(mode==='native')await page.evaluate(()=>{const t=document.querySelector('#t01-tool');t.hidden=false;t.showPopover();});};
 const worldState=()=>page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet,revision:T01.app.world.starship.account.revision}));

 const documentOf=mode=>mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument;
 for(const race of ['terran','zerg','protoss']){
  await load('warehouse',race,'quality-5');
  const before=await worldState();
  for(const [device,size]of Object.entries(sizes)){
   report.phase=race+'-'+device;
   if(mode==='native')await page.setViewportSize(size);else await page.locator('#t01-devices button[data-device="'+device+'"]').click();
   await page.waitForTimeout(250);
   await page.evaluate(mode=>{const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument;d.querySelector('.equipment-set').scrollIntoView({block:'start'});},mode);
   const state=await page.evaluate(mode=>{
    const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument,s=d.querySelector('.equipment-inspector .equipment-set'),tier=s.querySelector(':scope > .set-bonus-tier'),inspector=d.querySelector('.equipment-inspector');
    return {name:s.querySelector('h4').textContent,primary:tier.querySelector('.set-tier-heading').textContent,pieces:[...tier.querySelectorAll('.set-bonus-step')].map(e=>+e.dataset.pieces),identity:d.querySelector('.inspect-names p').textContent,setText:s.textContent,inactive:[...tier.querySelectorAll('.set-step-heading span')].every(e=>e.textContent==='未激活'),othersOpen:s.querySelector('.set-other-tiers').open,previewOpen:d.querySelector('details.equipment-preview').open,width:inspector.clientWidth,scrollWidth:inspector.scrollWidth,viewport:d.documentElement.clientWidth,right:inspector.getBoundingClientRect().right,scripts:d.scripts.length,canvases:d.querySelectorAll('canvas').length};
   },mode);
   assert.deepEqual(state.pieces,[2,4,6]);assert.match(state.primary,/橙色效果/);assert.ok(state.inactive);assert.equal(state.othersOpen,false);assert.equal(state.previewOpen,false);assert.ok(state.scrollWidth<=state.width+1);assert.ok(state.right<=state.viewport+1,'Inspector must fit the actual viewport');if(mode==='offline'){assert.equal(state.scripts,0);assert.equal(state.canvases,0);}
   if(identities){assert.match(state.identity,/专属精英：/);assert.ok(state.setText.includes(state.identity.split('：')[1]));assert.doesNotMatch(state.setText,/绑定身份|绑定英雄|绑定精英|绑定方向/);}
   report.checks.push({race,device,check:'set-name-grouped-thresholds-and-separated-preview',...state});await shot(race+'-'+device);
  }
  if(mode==='native')await page.setViewportSize(sizes.desktop);else await page.locator('#t01-devices button[data-device="desktop"]').click();
  const clickSummary=async selector=>{
   if(mode==='native'){await page.locator(selector).click();}
   else{const box=await page.evaluate(selector=>{const f=document.querySelector('#t01-prototype-frame'),e=f.contentDocument.querySelector(selector);e.scrollIntoView({block:'center'});const a=e.getBoundingClientRect(),b=f.getBoundingClientRect(),scale=b.width/f.clientWidth;return {x:b.x+(a.x+a.width/2)*scale,y:b.y+(a.y+a.height/2)*scale};},selector);await page.mouse.click(box.x,box.y);}
  };
  for(const cls of ['set-other-tiers','set-rules','equipment-preview']){
   await clickSummary('details.'+cls+' > summary');
   const open=await page.evaluate(({mode,cls})=>(mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument).querySelector('details.'+cls).open,{mode,cls});assert.ok(open,cls);
   report.checks.push({race,check:'local-expand-'+cls});
  }
  await page.evaluate(mode=>{const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument;d.querySelector('.equipment-set > .set-bonus-tier .set-bonus-step[data-pieces="6"]').scrollIntoView({block:'start'});},mode);await shot(race+'-six-piece-and-rules');
  assert.deepEqual(await worldState(),before);report.checks.push({race,check:'description-expansion-does-not-mutate-game'});
  await page.evaluate(id=>T01.load(id),`ui:ship-operation:effects-active:${race}`);
  const active=await page.evaluate(mode=>{const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument;return {groups:d.querySelectorAll('.set-strip .equipment-set').length,text:d.querySelector('.set-strip').textContent};},mode);
  await page.evaluate(mode=>{const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument;d.querySelector('.set-strip').scrollIntoView({block:'start'});},mode);await shot(race+'-active-summary');
  assert.equal(active.groups,2);assert.match(active.text,/（2）件套 · 已激活/);assert.match(active.text,/功能效果/);report.checks.push({race,check:'active-summary-grouped-by-equipment-source'});
  if(identities){
   await load('warehouse',race,'hero-detail');const name={terran:'雷诺',zerg:'凯瑞甘',protoss:'阿塔尼斯'}[race];
   for(const [device,size]of Object.entries(sizes)){
    if(mode==='native')await page.setViewportSize(size);else await page.locator('#t01-devices button[data-device="'+device+'"]').click();await page.waitForTimeout(250);
    const hero=await page.evaluate(mode=>{const d=mode==='native'?document:document.querySelector('#t01-prototype-frame').contentDocument,s=d.querySelector('.equipment-set'),e=d.querySelector('.equipment-inspector');s.querySelector(':scope > .set-bonus-tier .set-bonus-step[data-pieces="6"]').scrollIntoView({block:'start'});return {identity:d.querySelector('.inspect-names p').textContent,text:s.textContent,right:e.getBoundingClientRect().right,viewport:d.documentElement.clientWidth};},mode);
    assert.equal(hero.identity,'专属英雄：'+name);assert.ok(hero.text.includes('开局获得Ⅲ级'+name));assert.ok(hero.text.includes(name+'最大生命 +50%'));assert.doesNotMatch(hero.text,/绑定身份|绑定英雄|绑定精英|绑定方向/);assert.ok(hero.right<=hero.viewport+1);report.checks.push({race,device,check:'named-hero-effects',...hero});await shot(race+'-hero-'+device);
   }
   if(mode==='native')await page.setViewportSize(sizes.desktop);else await page.locator('#t01-devices button[data-device="desktop"]').click();
  }
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.http,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);if(page)await page.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();if(server)await server.close();await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({mode,pass:report.pass,checks:report.checks.length,errors:report.errors.length,failure:report.failure}));}
