/** Bounded production HUD + real IndexedDB checks. Synthetic worlds, no combat renderer. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const out=path.resolve('reports/local/endless-update-20261106');await fs.mkdir(out,{recursive:true});
if(process.argv.includes('--entry-only')){
 const web=path.resolve('dist/endless-update-20261106/web'),release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8')),server=createGameServer({webRoot:web,backendOptions:{config:{enabled:false}}});let browser;
 const report={build:release.appBuildId,scope:'Unmodified local Web build, isolated Chrome menu and race-choice entry only; no natural endless play.',errors:[],failures:[]};
 try{await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failures.push({url:r.url(),status:r.status()});});await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('[data-action="menu-new"]:visible').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('#scs-opening-visual'));await page.locator('[data-action="menu-new"]:visible').click();await page.locator('[data-action="menu-race-next"]:visible').waitFor();assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.passed=true;}
 catch(error){report.error=String(error.stack??error);process.exitCode=1;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'entry.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report));process.exit(process.exitCode??0);
}
const fixture=`
import {World} from './src/simulation/world';
import {HUD} from './src/ui/hud';
import {ControlSettings} from './src/ui/controls/settings';
import {PerspectiveCamera} from 'three';
import {configurePlatformAssetUrl} from './src/assets/manifest';
import {campaign18Schedule} from './src/data/campaign18';
import {endlessSpawnStamp} from './src/data/endless';
import {SaveRepository,IndexedSaveBackend} from './src/persistence/save-repository';
import {writeArchive,readArchive} from './src/persistence/archive';
import './src/ui/presentation/building-panel.css';
import './src/ui/presentation/game-shell.css';
import './src/ui/presentation/text-scale-reference.generated.css';
const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>');
configurePlatformAssetUrl(()=>art);
const race=new URLSearchParams(location.search).get('race')||'terran';
const w=new World({seed:41,race,difficulty:'normal',sandbox:true,waves:false,terrain:false,obstacles:[]});
const backend=new IndexedSaveBackend(indexedDB);let fail=false;
const repo=new SaveRepository({read:()=>backend.read(),commit:async(...args)=>{if(fail)throw Error('injected write failure');return backend.commit(...args);}});
let hud;
const mount=()=>{if(!hud){document.body.dataset.rules='mvp';const camera=new PerspectiveCamera();camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const view={canvas:document.querySelector('canvas'),camera,assetsPending:0,modelErrors:[],initialAssetsLoaded:true,gpu:new Map(),ground:()=>0,cameraOutput:{pitch:45,zoom:1}};
 hud=new HUD(w,view,new ControlSettings());}hud.update();};
const finish=()=>{w.time=w.stageStartedAt+w.duration;w.tick=Math.round(w.time*60);w.stageElapsed=w.duration;w.endStage();while(w.phase==='reward')if(!w.skipReward())throw Error('Skip');};
const advance=t=>{w.time=w.stageStartedAt+t;w.tick=Math.round(w.time*60);w.stageElapsed=t;};
window.state=()=>({round:w.endless?.round,duration:w.duration,phase:w.phase,elapsed:w.stageElapsed,time:w.time,pacing:structuredClone(w.endless?.pacing),pending:structuredClone(w.endless?.pending),waves:structuredClone(w.waves),backlog:structuredClone(w.ambientBacklog),nextWave:w.nextWave,wallet:{...w.wallet},roundReceipts:[...w.endlessRoundReceipts],minutes:w.endlessAwardedMinutes,balance:w.permanentProfile.balance});
window.prepare=()=>{w.start();w.stage=18;w.prepareStage();w.hive.hp=0;const boss=w.spawnCampaignSpecial(campaign18Schedule(w.config,41).specials[0]);w.hit(boss,1e12,[],1,'terran');w.stageElapsed=w.duration;w.endStage();w.chooseCampaignExit('endless');while(w.phase==='reward')w.skipReward();mount();return window.state();};
window.begin=()=>{const p=w.previewEndlessTransition(),token=p.requestId+':'+p.expectedRevision+':'+p.mapHash;w.registerEndlessReadyToken(token);if(!w.commitEndlessTransition(p.requestId,p.expectedRevision,token))throw Error('Entry');mount();};
window.fixture=(legacy=false,reward=false)=>{window.begin();for(let r=1;r<4;r++)finish();if(legacy){delete w.endless.pacing;w.configStage=-1;w.prepareStage();}advance(30);w.endless.pending={boss:endlessSpawnStamp(w.endless,w.endlessElapsed)};w.endless.progress.boss=1;w.spawnWave();if(reward){advance(w.duration);w.endStage();}mount();return window.state();};
window.advance=t=>{advance(t);mount();return window.state();};
window.next=()=>{if(w.phase==='battle')finish();else while(w.phase==='reward')w.skipReward();mount();return window.state();};
window.save=async()=>{await repo.commit(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));return window.state();};
window.slots=async()=>Promise.all((await backend.read()).map(raw=>raw?readArchive(raw).bundle.run.state.stageElapsed:null));
window.failSave=async()=>{fail=true;try{await window.save();return false;}catch{return true;}finally{fail=false;}};
window.load=async()=>{const result=await repo.load();if(!result.bundle?.run)throw Error('No saved run');if(!w.permanentProfile.importJSON(result.bundle.profile))throw Error('Profile');w.restoreRun(result.bundle.run);mount();return window.state();};
window.uiRound=round=>{while(w.endless.round<round)finish();mount();return {round:w.endless.round,duration:w.duration};};
window.ready=true;
`;
const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',write:false,outdir:out,entryNames:'fixture',logLevel:'silent',loader:{'.woff2':'dataurl','.woff':'dataurl','.png':'dataurl','.webp':'dataurl','.svg':'dataurl'},target:'es2022'});
const files=new Map(bundle.outputFiles.map(f=>['/'+path.basename(f.path),f.contents]));
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body><main id="game-root"><canvas id="battle"></canvas><div id="interface"></div></main><script type="module" src="/fixture.js"></script></body></html>');return;}const bytes=files.get(pathname);res.setHeader('content-type',pathname.endsWith('.css')?'text/css':'text/javascript');res.statusCode=bytes?200:404;res.end(bytes);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={scope:'Production HUD, minimal renderer stub and blank asset fixtures; isolated synthetic states, mouse/simulated touch, actual IndexedDB reload/backup rotation/write failure. No natural survival, GPU benchmark or physical phone.',bundleHash:createHash('sha256').update(files.get('/fixture.js')).digest('hex'),cases:[],errors:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,mobile,race] of [['desktop',1440,900,false,'terran'],['landscape',844,390,true,'zerg'],['portrait',390,844,true,'protoss']]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.setDefaultTimeout(15000);
  const visit=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/?race='+race);await page.waitForFunction(()=>window.ready);};
  await visit();await page.evaluate(()=>window.prepare());assert.equal(await page.locator('.game-tags').innerText(),'前3轮 1分钟\n4 轮 / 发展');
  const info=page.locator('[data-action="ui-info"]:visible');await info.scrollIntoViewIfNeeded();await (mobile?info.tap():info.click());const copy=page.locator('.detail-copy');await copy.waitFor();assert.match(await copy.innerText(),/4—6轮1分30秒.*之后每3轮增加1分钟.*每轮购物，每4轮发展/);
  const geometry=await copy.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,dialog:el.closest('[role="dialog"]').getBoundingClientRect().toJSON()}));assert.ok(geometry.scrollWidth<=geometry.width+1);assert.ok(geometry.dialog.x>=-1&&geometry.dialog.y>=-1&&geometry.dialog.right<=width+1&&geometry.dialog.bottom<=height+1);
  await page.screenshot({path:path.join(out,name+'-details.png'),animations:'disabled'});await page.locator('[data-action="ui-info-close"]').last().click();
  await page.evaluate(()=>window.fixture());assert.equal(await page.locator('#clock').innerText(),'01:00');await page.evaluate(()=>window.save());await page.evaluate(()=>window.advance(35));await page.evaluate(()=>window.save());await page.evaluate(()=>window.advance(40));const saved=await page.evaluate(()=>window.save());assert.deepEqual(await page.evaluate(()=>window.slots()),[40,35,30]);
  await page.evaluate(()=>window.advance(45));assert.equal(await page.evaluate(()=>window.failSave()),true);assert.deepEqual(await page.evaluate(()=>window.slots()),[40,35,30]);await page.reload();await page.waitForFunction(()=>window.ready);assert.deepEqual(await page.evaluate(()=>window.load()),saved);assert.equal(await page.locator('#clock').innerText(),'00:50');
  const next=await page.evaluate(()=>window.next());assert.equal(next.round,5);assert.equal(next.duration,90);assert.deepEqual(next.pending,saved.pending);assert.equal(next.roundReceipts.length,saved.roundReceipts.length+1);const nextSaved=await page.evaluate(()=>window.save());await page.reload();await page.waitForFunction(()=>window.ready);assert.deepEqual(await page.evaluate(()=>window.load()),nextSaved);
  for(const [round,clock] of [[7,'02:00'],[10,'03:00'],[13,'04:00'],[16,'05:00']]){await page.evaluate(r=>window.uiRound(r),round);assert.equal(await page.locator('#clock').innerText(),clock);assert.equal(await page.locator('#stage').innerText(),'∞ '+round);}
  await page.screenshot({path:path.join(out,name+'-round16.png'),animations:'disabled'});report.cases.push({name,race,checks:['preparation/details geometry','round 4/7/10/13/16 HUD','three-slot rotation','write failure preserves all slots','page reload preserves pending/waves/resources','one next-round payout and second reload'],passed:true});await context.close();
 }
 for(const reward of [false,true]){
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);await page.evaluate(()=>window.prepare());const legacy=await page.evaluate(r=>window.fixture(true,r),reward);assert.equal(legacy.duration,60);assert.equal(legacy.pacing,undefined);await page.evaluate(()=>window.save());await page.reload();await page.waitForFunction(()=>window.ready);assert.deepEqual(await page.evaluate(()=>window.load()),legacy);const next=await page.evaluate(()=>window.next());assert.equal(next.round,5);assert.equal(next.duration,90);assert.equal(next.pacing.version,1);assert.deepEqual(next.pending,legacy.pending);await page.evaluate(()=>window.save());await page.reload();await page.waitForFunction(()=>window.ready);assert.deepEqual(await page.evaluate(()=>window.load()),next);report.cases.push({name:reward?'legacy intermission':'legacy battle',passed:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.error=String(error.stack??error);throw error;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,bundleHash:report.bundleHash}));
