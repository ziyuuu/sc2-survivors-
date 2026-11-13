import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createServer, preview} from 'vite';
import {createGameServer} from './coze-web-server.mjs';
import {createBackend} from './backend/service.mjs';
import {campaign18Schedule} from '../src/data/campaign18';
import {campaignTerrain, chooseCampaignMap} from '../src/data/campaign-map';
import {readArchive, writeArchive} from '../src/persistence/archive';
import {draftContext} from '../src/simulation/expedition-economy';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
import {createContentPlan} from '../src/simulation/progression/run-content';
import {World} from '../src/simulation/world';

const out = process.env.ARMED_QA_OUT ?? 'reports/local/v14-armed-audit-fixes-20261112';
await fs.mkdir(out, {recursive:true});
const sustained = process.argv.includes('--sustained');
const seed = 1111045;
const w = new World({race:'terran', seed, waves:sustained,
  terrain:campaignTerrain(chooseCampaignMap(seed)), endlessTerrain:new FlatTerrain()});
w.starship.enabled = true;
w.start(undefined, createContentPlan(seed, 'terran', w.difficulty));
if (w.starship.account.tutorial) w.starship.account.tutorial.status = 'completed';
w.expedition.support.armed!.ranks = {W06:1, G09:1};
w.wallet = {minerals:10000, gas:10000};
w.stage = 18;
w.prepareStage();
if (sustained) {
  // A separate late-campaign engineering roster for up to three timed rounds.
  // The original audit seed and the unmodified first-drop fixture stay reproducible.
  for (const family of ['marine','marauder','tank','thor','viking'] as const) {
    if (!w.expedition.familySlots.includes(family)) w.expedition.familySlots.push(family);
    w.expedition.tech['unlock.'+family] = 1;
    for (const u of w.ordinaryUnits(family)) {
      u.rank = w.soldierCap(family);
      w.refreshStats(u);
    }
    while (w.familySeatCount(family)<w.familyMemberCap(family)) {
      const point = w.freePosition(family, w.anchor, 1, 24);
      assert.ok(point, 'Missing deployment space for '+family);
      w.addFamilyMember(family, point, w.soldierCap(family));
    }
  }
}
w.hive!.hp = 0;
const bossEvent = campaign18Schedule(w.config as any, seed).specials[0];
const boss = (w as any).spawnCampaignSpecial(bossEvent);
w.hit(boss, 1e12, [], 1, 'terran');
w.stageElapsed = w.duration;
w.endStage();
assert.ok(w.chooseCampaignExit('endless'));
assert.ok(w.skipReward());
for (let i = 0; i < 2000; i++) {
  const offers = drawExpeditionReinforcements({...draftContext(w, 'audit/' + i), currentOffers:[]}, true);
  if (offers.some(o => o.expeditionEffect.kind === 'armedSupport' && o.expeditionEffect.cardId === 'P05')) {
    w.rewards = offers;
    break;
  }
}
const offer = w.rewards.find(o => o.value === 'P05');
assert.ok(offer, 'P05 must be legally quoted');
const archive = writeArchive({profile:w.permanentProfile.exportJSON(), run:w.captureRun(), equipment:w.starship.account});
readArchive(archive);
const initialRoster = w.expedition.familySlots.map(family => ({family, seats:w.familySeatCount(family),
  members:w.familyUnits(family).map(u=>({rank:u.rank,elite:u.eliteId??null}))}));
if (sustained) assert.ok(initialRoster.length===5 && initialRoster.every(r=>r.seats===w.familyMemberCap(r.family)),JSON.stringify(initialRoster));
if (process.argv.includes('--fixture-only')) {
  console.log(JSON.stringify({stage:w.stage,seed,difficulty:w.difficulty,initialRoster}));
  process.exit(0);
}

const compressed = sustained || process.argv.includes('--compressed');
const packaged = compressed || process.argv.includes('--packaged');
async function startServer() {
  if (compressed) {
    const root = process.env.ARMED_RELEASE_ROOT ?? 'dist/v14-armed-audit-fixes-20261112/packed';
    const backend = createBackend({config:{enabled:false}, maintenance:false});
    const server = await preview({configFile:false, publicDir:false, logLevel:'error', appType:'mpa',
      build:{outDir:root}, preview:{host:'127.0.0.1', port:0, strictPort:true},
      plugins:[{name:'local-game-api', configurePreviewServer(s) {
        s.middlewares.use((req,res,next) => { if (!backend.handle(req,res)) next(); });
      }}]});
    return {port:(server.httpServer.address() as {port:number}).port,
      close:async () => { await server.close(); await backend.close(); }};
  }
  if (packaged) {
    const root = process.env.ARMED_RELEASE_ROOT ?? 'dist/v14-armed-audit-fixes-20261112/web';
    const server = createGameServer({webRoot:root, backendOptions:{config:{enabled:false}}});
    await new Promise<void>((resolve,reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    return {port:(server.address() as {port:number}).port,
      close:() => new Promise<void>(resolve => server.close(() => resolve()))};
  }
  const server = await createServer({cacheDir:out+'/vite-cache', logLevel:'error',
    server:{host:'127.0.0.1', port:0, strictPort:false, hmr:false}, optimizeDeps:{entries:['index.html']}});
  await server.listen();
  return {port:(server.httpServer!.address() as {port:number}).port, close:() => server.close()};
}

const server = await startServer();
let browser, page;
async function inspectEntry() {
  browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true, args:['--no-proxy-server']});
  page = await browser.newPage({viewport:{width:1200,height:800}});
  if (sustained) await page.addInitScript(() => {
    localStorage.setItem('sc2.graphics.v1', JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium'}));
  });
  page.setDefaultTimeout(90000);
  const pageErrors:string[] = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.port);
  if (packaged) assert.equal(await page.evaluate(() => typeof (window as any).__SC2_DEBUG__), 'undefined');
  const click = (action:string) => page.locator('[data-action="' + action + '"]:visible').first().click();
  const ready = async () => {
    await page.waitForFunction(() => ['ready','error'].includes((window as any).__SC2_REPORT__()?.readiness.phase), null, {timeout:180000});
    const gate = await page.evaluate(() => (window as any).__SC2_REPORT__().readiness);
    assert.equal(gate.phase,'ready',gate.error);
  };
  console.log('Reading local stage 18 fixture.');
  await click('settings');
  await page.locator('[data-action=settings-tab][data-tab=saves]').click();
  const picker = page.waitForEvent('filechooser');
  await click('menu-load-file');
  await (await picker).setFiles({name:'endless-shelf.json', mimeType:'application/json', buffer:Buffer.from(archive)});
  await ready();
  await click('flow-continue');
  console.log('Purchasing P05 on the final shelf.');
  await page.locator('[data-action=reward][data-id="'+offer.offerId+'"]').click();
  await click('skip');
  await click('endless-prepare');
  await ready();
  await click('flow-continue');
  console.log('Checking first dispatch in endless.');
  if (packaged) {
    await page.waitForFunction(() => (window as any).__SC2_REPORT__().endless?.round === 1);
    const resume = page.getByRole('button', {name:'继续', exact:true});
    if (await resume.isVisible()) await resume.click();
    const build = await page.locator('meta[name=sc2-app-build]').getAttribute('content');
    const snapshot = () => page.evaluate(() => {
      const report = (window as any).__SC2_REPORT__();
      return {phase:report.phase, round:report.endless?.round, elapsed:report.endless?.elapsed, shots:report.stats.shots,
        depots:(report.armedForts??[]).filter((f:{card:string})=>f.card==='P05').map((f:{id:number})=>f.id)};
    });
    const start = await snapshot();
    const observeUntil = Date.now() + 150000;
    let firstDrop:Awaited<ReturnType<typeof snapshot>>|undefined;
    let fourLanded:Awaited<ReturnType<typeof snapshot>>|undefined;
    while (Date.now() < observeUntil && !pageErrors.length) {
      const now = await snapshot();
      if(now.depots.length)firstDrop??=now;
      if(now.depots.length===4)fourLanded??=now;
      if (now.phase !== 'battle' || now.round !== 1 || fourLanded&&now.elapsed-fourLanded.elapsed>=2&&now.shots>fourLanded.shots) break;
      await page.waitForTimeout(500);
    }
    const settled = await snapshot();
    await page.waitForTimeout(1000);
    const afterOneSecond=await snapshot();
    const evidence={build,initialRoster,start,firstDrop,fourLanded,settled,afterOneSecond,pageErrors};
    const resultFile = out + (sustained ? '/endless-sustained.json' : compressed ? '/endless-compressed.json' : '/endless-packaged.json');
    await fs.writeFile(resultFile,JSON.stringify(evidence,null,2));
    console.log(JSON.stringify(evidence));
    assert.deepEqual(pageErrors,[]);assert.ok(firstDrop&&fourLanded,'P05 must naturally land and render all four distinct forts');
    assert.equal(new Set(fourLanded.depots).size,4);assert.equal(settled.phase,'battle');
    assert.ok(settled.shots>fourLanded.shots&&afterOneSecond.elapsed>settled.elapsed&&afterOneSecond.shots>settled.shots,'Combat must continue after the drop');
    if (compressed) {
      const graphics = await page.evaluate(() => {
        const r = (window as any).__SC2_REPORT__();
        return {worker:navigator.serviceWorker.controller?.scriptURL, texture:r.graphics?.texture, tier:r.graphics?.tier};
      });
      assert.ok(graphics.worker && graphics.texture, 'Packed worker and graphics profile must be active');
      if (sustained) assert.equal(graphics.texture,'medium');
      const progress = [afterOneSecond];
      const deadline = Date.now()+480000;
      let sample = afterOneSecond;
      while (Date.now()<deadline && !pageErrors.length && sample.elapsed<180 && !['lost','won'].includes(sample.phase)) {
        // The reinforcement gate commits automatically when ready. Its disabled
        // progress button can disappear while a browser click is waiting on it.
        const gate = await page.evaluate(() => (window as any).__SC2_REPORT__().readiness.kind);
        const skip = page.locator('[data-action=skip]:visible:enabled');
        if (!gate && sample.phase==='reward' && await skip.isVisible()) await skip.click();
        else if (!gate && sample.phase==='battle' && await resume.isVisible()) await resume.click();
        await page.waitForTimeout(1100);
        sample = await snapshot();
        const last = progress.at(-1)!;
        if (last.phase!==sample.phase || last.round!==sample.round || sample.elapsed-last.elapsed>=15) {
          progress.push(sample);console.log(JSON.stringify({round:sample.round,elapsed:sample.elapsed,phase:sample.phase}));
        }
      }
      const runtime = await page.evaluate(() => {
        const r = (window as any).__SC2_REPORT__();
        return {memory:r.resourceMemory, errors:r.errors, discardedBacklog:r.discardedSimulationBacklogSeconds};
      });
      const outcome = sample.elapsed>=180 ? 'time-limit-reached' : sample.phase;
      await fs.writeFile(resultFile, JSON.stringify({...evidence,graphics,progress,last:sample,outcome,runtime},null,2));
      console.log(JSON.stringify({last:sample,graphics,errors:runtime.errors}));
      assert.ok(sample.elapsed>=180 || ['lost','won'].includes(sample.phase), 'Run must advance or reach its normal outcome');
      if (sustained) {
        const nextRound = progress.find(p=>p.round===2 && p.phase==='battle');
        assert.ok(nextRound && sample.elapsed>nextRound.elapsed && sample.shots>nextRound.shots,
          'A subsequent wave must advance the clock and produce new shots');
      }
      assert.deepEqual(runtime.errors,[]);assert.deepEqual(pageErrors,[]);
    }
    return;
  }
  // The development run pairs the exact first cast with the campaign loader.
  await page.waitForFunction(() => (window as any).__SC2_DEBUG__.world.endless?.round === 1);
  const result = await page.evaluate(async () => {
    const {world,view} = (window as any).__SC2_DEBUG__;
    const {reserveArmedDispatch} = await import('/src/simulation/combat/armed-support.ts');
    const {createContentPlan} = await import('/src/simulation/progression/run-content.ts');
    const [resources] = [() => ({
      medkit:view.gpu.has('support.medkit'), drone:view.gpu.has('support.repair_drone'),
      barrier:view.fortTemplates.has('supply_depot'), barrierDeath:view.fortDeathTemplates.has('supply_depot')
    })];
    const onEntry = {phase:world.phase, round:world.endless.round, rank:world.expedition.support.armed.ranks.P05, ...resources()};
    world.paused = false;
    const pos = world.freePosition('roach', {x:world.anchor.x,z:world.anchor.z+8}, 0, 3);
    if (!pos) throw Error('No fixture position for the first target');
    world.addUnit('roach','zerg',pos.x,pos.z);
    const cast = reserveArmedDispatch(world,'P05');
    if (!cast) throw Error('Fixture did not dispatch P05');
    world.paused = true;
    let renderError = '';
    try { view.render(1/60, 1); } catch (e) { renderError = String(e); }
    view.render(1/60, 1);
    const onDispatch = resources();

    // Start a fresh unarmed run in the same renderer, reach an intermission
    // and perform its normal stage-boundary preparation and retirement.
    world.resetRun();
    const plan = createContentPlan(world.seed, 'terran', world.difficulty);
    world.start(undefined, plan);
    view.resetRun();
    world.endStage();
    view.entryPreparation = true;
    try { await view.prepareCurrentAssets(undefined,true); } finally { view.entryPreparation = false; }
    const nextRun = {ranks:world.expedition.support.armed.ranks, phase:world.phase,
      retainedKeys:[...view.retainedRequired].filter((key:string)=>key.startsWith('support.')), ...resources(),
      boundaryRan:!!view.lastStageRetirement};
    return {onEntry, cast, renderError, onDispatch, nextRun};
  });
  await fs.writeFile(out+'/endless-development.json',JSON.stringify({...result,pageErrors},null,2));
  console.log(JSON.stringify({...result, pageErrors}));
  assert.equal(result.cast>0,true);assert.equal(result.renderError,'');assert.deepEqual(pageErrors,[]);
  assert.equal(result.nextRun.boundaryRan,true);
  for(const key of ['medkit','drone','barrier','barrierDeath'] as const){
    assert.ok(result.onEntry[key]&&result.onDispatch[key],key+' must be resident through dispatch');
    assert.equal(result.nextRun[key],false,key+' must retire when the new run does not use it');
  }
}

try {
  await inspectEntry();
} catch (error) {
  console.error(await page?.evaluate(() => ({text:document.body.innerText.slice(-450),
    phase:(window as any).__SC2_REPORT__?.().phase, gate:(window as any).__SC2_REPORT__?.().readiness})).catch(()=>null));
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
