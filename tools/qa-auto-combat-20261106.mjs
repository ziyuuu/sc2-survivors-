/** Production simulation/HUD and real IndexedDB, synthetic battle fixtures, no renderer. */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
const out='reports/local/auto-combat-20261106';await fs.mkdir(out,{recursive:true});
const fixture=`
import {World} from './src/simulation/world';
import {HUD} from './src/ui/hud';
import {ControlSettings} from './src/ui/controls/settings';
import {PerspectiveCamera} from 'three';
import {configurePlatformAssetUrl} from './src/assets/manifest';
import {SaveRepository,IndexedSaveBackend} from './src/persistence/save-repository';
import {writeArchive,readArchive} from './src/persistence/archive';
import {familyModeState} from './src/simulation/combat/family-actions';
import {tacticsDiagnostics} from './src/simulation/combat/tactics/planner';
import './src/ui/presentation/building-panel.css';
import './src/ui/presentation/game-shell.css';
import './src/ui/presentation/text-scale-reference.generated.css';
configurePlatformAssetUrl(()=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'));
const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[],seed:619});
const backend=new IndexedSaveBackend(indexedDB);let fail=false;
const repo=new SaveRepository({read:()=>backend.read(),commit:async(...a)=>{if(fail)throw Error('injected');return backend.commit(...a);}});
let hud;
const render=()=>{if(!hud){document.body.dataset.rules='mvp';const camera=new PerspectiveCamera();camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();hud=new HUD(w,{canvas:document.querySelector('canvas'),camera,assetsPending:0,modelErrors:[],initialAssetsLoaded:true,gpu:new Map(),ground:()=>0,cameraOutput:{pitch:45,zoom:1}},new ControlSettings());}hud.update();};
window.prepare=()=>{w.start();w.entities.clear();w.expedition.familySlots=['lurker'];w.anchor.x=w.anchor.z=0;const u=w.addUnit('lurker','terran',0,0);u.nativeMode=u.desiredNativeMode='lurker_burrowed';u.autoMode={mode:'lurker_burrowed',since:0};w.refreshStats(u);const t=w.addUnit('roach','zerg',4,0);t.hp=t.maxHp=10000;t.stoppedUntil=100;w.hash.rebuild(w.entities.values());render();return window.state();};
window.state=()=>({time:w.time,wallet:{...w.wallet},modes:structuredClone(w.expedition.familyModes),units:[...w.entities.values()].map(u=>({id:u.id,hp:u.hp,mode:u.nativeMode,desired:u.desiredNativeMode,auto:u.autoMode,shots:u.shotSequence,nextShotAt:u.nextShotAt})),next:familyModeState(w,'lurker').next,plans:tacticsDiagnostics(w).plans.length});
window.advance=()=>{w.paused=false;for(let i=0;i<120;i++)w.step();render();return window.state();};
window.save=async()=>{await repo.commit(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));return window.state();};
window.slots=async()=>Promise.all((await backend.read()).map(raw=>raw?readArchive(raw).bundle.run.state.time:null));
window.failSave=async()=>{fail=true;try{await window.save();return false;}catch{return true;}finally{fail=false;}};
window.load=async()=>{const a=await repo.load();w.permanentProfile.importJSON(a.bundle.profile);w.restoreRun(a.bundle.run);render();return window.state();};
window.ready=true;
`;
const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',write:false,outdir:out,entryNames:'fixture',logLevel:'silent',loader:{'.woff2':'dataurl','.woff':'dataurl','.png':'dataurl','.webp':'dataurl','.svg':'dataurl'},target:'es2022'});
const files=new Map(bundle.outputFiles.map(f=>['/'+path.basename(f.path),f.contents]));
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;res.setHeader('content-type',pathname==='/'?'text/html':pathname.endsWith('.css')?'text/css':'text/javascript');res.end(pathname==='/'?'<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><body><main id="game-root"><canvas></canvas><div id="interface"></div></main><script type="module" src="/fixture.js"></script>':files.get(pathname));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const report={scope:'Synthetic production HUD with renderer stub and blank assets; native mode buttons, actual IndexedDB rotation/write failure/reload. Simulated touch, no physical phone.',bundle:createHash('sha256').update(files.get('/fixture.js')).digest('hex'),cases:[],errors:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server']});
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['landscape',844,390,true],['portrait',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);const initial=await page.evaluate(()=>window.prepare());assert.equal(initial.next,'lurker');
  const button=page.locator('[data-action="lurker-mode"]:visible,[data-command="lurker-mode"]:visible').first();
  await (touch?button.tap():button.click());let after=await page.evaluate(()=>window.advance());assert.equal(after.modes.lurker,'lurker');assert.equal(after.units[0].desired,'lurker');
  await page.evaluate(()=>window.save());await page.evaluate(()=>window.advance());await page.evaluate(()=>window.save());await page.evaluate(()=>window.advance());const saved=await page.evaluate(()=>window.save());const slots=await page.evaluate(()=>window.slots());assert.deepEqual(slots,[6,4,2]);
  await page.evaluate(()=>window.advance());assert.equal(await page.evaluate(()=>window.failSave()),true);assert.deepEqual(await page.evaluate(()=>window.slots()),slots);
  await page.reload();await page.waitForFunction(()=>window.ready);const loaded=await page.evaluate(()=>window.load());assert.equal(loaded.plans,0);assert.deepEqual({...loaded,plans:0},{...saved,plans:0});
  after=await page.evaluate(()=>window.advance());assert.equal(after.units[0].desired,'lurker');assert.deepEqual(after.wallet,saved.wallet);
  report.cases.push({name,touch,passed:true,slots});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.error=String(e.stack??e);process.exitCode=1;}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));}console.log(JSON.stringify(report));

