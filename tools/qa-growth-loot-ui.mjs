/** Bounded production UI renderer fixture. No combat loop or player storage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
import assert from 'node:assert/strict';
const out=path.resolve('reports/local/growth-loot-20261029'),site=path.join(out,'ui-site'),web=path.resolve('dist/growth-loot-20261029/web');
await fs.mkdir(out,{recursive:true});
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
if(process.argv.includes('--entry-only')){
 const server=createGameServer({webRoot:web,backendOptions:{config:{enabled:false}}});let browser;
 const result={build:release.appBuildId,scope:'Unmodified production Web entry, isolated desktop Chrome, menu and new-game race choice only.',errors:[],failures:[]};
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.failures.push({url:r.url(),status:r.status()});});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('[data-action="menu-new"]:visible').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('#scs-opening-visual'),null,{timeout:60000});
  await page.locator('[data-action="menu-new"]:visible').click();await page.locator('[data-action="menu-race-next"]:visible').waitFor();result.newGameChoice=true;
  await page.screenshot({path:path.join(out,'production-entry.png'),animations:'disabled'});assert.deepEqual(result.errors,[]);assert.deepEqual(result.failures,[]);
 }catch(e){result.failure=String(e.stack??e);process.exitCode=1;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'entry-results.json'),JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify(result));process.exit(process.exitCode??0);
}
const fixture=`
import './ui/presentation/building-panel.css';
import './ui/presentation/game-shell.css';
import './ui/presentation/text-scale-reference.generated.css';
import {World} from './simulation/world';
import {ELITES} from './data/elites';
import {configurePlatformAssetUrl,assetUrl} from './assets/manifest';
import {renderIntermission,IntermissionNavigation} from './ui/presentation/intermission';
import {mountIntermissionSkin} from './ui/intermission-skin/skin';
import {mountOverlayLayout} from './ui/presentation/overlay-layout';
import {finishOpening} from './ui/presentation/opening';
const manifest=await (await fetch('/${release.manifest}')).json();
configurePlatformAssetUrl(id=>manifest.assets[id]?new URL(manifest.assets[id].url,location.href).href:null);
const w=new World({seed:529,terrain:false,waves:false,sandbox:true,race:'terran'});w.start();w.stage=7;w.expedition.familySlots=['marine','reaper'];w.addUnit('reaper','terran',0,0);w.endStage();w.skipReward();w.wallet={minerals:10000,gas:10000};
const e=ELITES['reaper.3'];w.rewards=[{...w.rewards[0],id:'elite.reaper.3',offerId:'qa-hunter',name:e.name,description:e.description,icon:e.icon,kind:'elite',rarity:'purple',value:e.id,expeditionEffect:{kind:'elite',eliteId:e.id,family:'reaper'}},...w.rewards.slice(1)];
const root=document.querySelector('#interface');root.className='game-frame';root.dataset.device=matchMedia('(pointer:coarse)').matches?'mobile':'desktop';root.dataset.page='reward';root.dataset.race='terran';
document.body.dataset.rules='mvp';document.body.dataset.race='terran';document.body.dataset.uiPhase='reward';document.querySelector('#game-root').removeAttribute('inert');root.innerHTML='<section id="overlay"></section>';
const overlay=document.querySelector('#overlay'),nav=new IntermissionNavigation();mountOverlayLayout(overlay,root);
const skin=mountIntermissionSkin(overlay,()=>w,{assets:{resolve:key=>assetUrl('ui.intermission.'+key)}});
const render=()=>{overlay.innerHTML=renderIntermission(w,'',nav);skin.refresh();};render();
root.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='ui-offer')nav.push({page:'offer',id:b.dataset.id});else if(a==='ui-variant-select')nav.variant=b.dataset.variant;else if(a==='ui-back')nav.back();else return;render();});
finishOpening();globalThis.__GROWTH_UI_READY__=true;
`;
await build({base:'./',publicDir:false,plugins:[{name:'growth-loot-ui-fixture',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/main.ts'))return fixture;}}],build:{outDir:site,emptyOutDir:true,minify:true,target:'es2022'}});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');let bytes;for(const root of [site,web]){const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{bytes=await fs.readFile(file);break;}catch{}}if(!bytes){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(name)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(500).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
let browser;const report={build:release.appBuildId,method:'Existing renderIntermission, skin, CSS and production assets with an in-memory reward fixture. Simulated touch, no combat or natural campaign.',results:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile]of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.setDefaultTimeout(15000);
  try{
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});await page.waitForFunction(()=>globalThis.__GROWTH_UI_READY__&&!document.querySelector('#scs-opening-visual'));
   const card=page.locator('[data-card-id="qa-hunter"]'),copy=card.locator('.imx-copy'),press=target=>mobile?target.tap():target.click();
   await copy.scrollIntoViewIfNeeded();assert.match(await copy.innerText(),/吸收其他死神.*不继承技能/);const summary=await copy.innerText();
   await page.screenshot({path:path.join(out,name+'-hunter-summary.png'),animations:'disabled'});
   await press(copy);const detail=await copy.innerText();assert.match(detail,/0\.15%/);assert.match(detail,/100%/);assert.match(detail,/35%/);assert.match(detail,/不继承技能/);assert.equal(await copy.getAttribute('aria-expanded'),'true');
   const geometry=await copy.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight,overflowY:getComputedStyle(el).overflowY}));assert.ok(geometry.scrollWidth<=geometry.width+1);assert.ok(geometry.scrollHeight<=geometry.height+1||['auto','scroll'].includes(geometry.overflowY));
   await copy.evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(out,name+'-hunter-details.png'),animations:'disabled'});
   await press(card.locator('.im-card-action'));await page.locator('.im-elite-dialog').waitFor();await press(page.locator('[data-action="ui-variant-select"][data-variant="reaper.3"]'));
   const selected=page.locator('.im-selected-rule');await selected.scrollIntoViewIfNeeded();assert.match(await selected.innerText(),/0\.15%/);assert.match(await selected.innerText(),/精英可重复获取/);
   const dialog=page.locator('.im-elite-dialog'),rect=await dialog.boundingBox();assert.ok(rect.x>=-1&&rect.x+rect.width<=width+1&&rect.y>=-1&&rect.y+rect.height<=height+1);
   await dialog.locator('.modal-content').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(out,name+'-hunter-choice.png'),animations:'disabled'});
   await press(dialog.locator('.modal-footer [data-action="ui-back"]'));await page.locator('.im-elite-dialog').waitFor({state:'hidden'});assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
   report.results.push({name,width,height,simulatedTouch:mobile,summary,detail,geometry,dialog:rect,errors,failures});
  }catch(error){report.results.push({name,width,height,errors,failures,error:String(error.stack??error)});await page.screenshot({path:path.join(out,name+'-hunter-failure.png')});throw error;}finally{await context.close();}
 }
}finally{await fs.writeFile(path.join(out,'ui-results.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({sizes:report.results.length,passed:true,build:release.appBuildId}));
