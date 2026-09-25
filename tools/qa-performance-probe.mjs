import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';

// Local-only diagnostics: no screenshots, uploads, per-method instrumentation or CPU profiler.
const option = (name, fallback) => { const index=process.argv.indexOf(name); return index<0?fallback:process.argv[index+1]; };
const output = option('--output', 'reports/local/performance-probe-20260924');
const port = Number(option('--port', '5177'));
if (!/^reports\/local\/[a-z0-9-]+$/.test(output) || !Number.isInteger(port) || port<1024 || port>65535) throw Error('Invalid local probe output or port');
const sampleSeconds = 12;
const baseCases = [
  { id: '100-native', enemies: 100, quality: 'native', render: true },
  { id: '300-native', enemies: 300, quality: 'native', render: true },
  { id: '300-performance', enemies: 300, quality: 'performance', render: true },
  { id: '300-render-disabled', enemies: 300, quality: 'native', render: false },
];
const optionalCases = [
  { id: '300-native-spatial-control', enemies: 300, quality: 'native', render: true, spatialControl: true },
];
const selected = option('--cases', baseCases.map(c=>c.id).join(',')).split(',');
const repeats = Number(option('--repeat', '1'));
const catalog=[...baseCases,...optionalCases];
if (!Number.isInteger(repeats) || repeats<1 || repeats>5 || selected.some(id=>!catalog.some(c=>c.id===id))) throw Error('Invalid probe case selection');
const cases = Array.from({length:repeats},(_,i)=>selected.map(id=>({...catalog.find(c=>c.id===id),id:repeats===1?id:`${id}-r${i+1}`}))).flat();
const quantile = (values, q) => values.length ? [...values].sort((a,b)=>a-b)[Math.min(values.length-1, Math.floor(values.length*q))] : null;
const summary = values => ({ count: values.length, mean: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null, p50: quantile(values,.5), p95: quantile(values,.95), p99: quantile(values,.99), max: values.length ? Math.max(...values) : null });
const report = {
  at: new Date().toISOString(),
  method: `Local Chrome headless, development build, real terrain and original models, 1440x900 DPR1, fixed seed421, 25 rank5 ordinary Terran + 3 heroes. Same creation order for the first100 enemies in all scenes. Native rules and AI remain active; health is boosted only to retain scene population. No production or automatic waves. Two seconds warmup + twelve seconds wall-clock sample, ${repeats} pass(es) per selected case. Only World.step and BattleRenderer.render are timed. No CDP or CPU profiling. Render-disabled is a diagnostic CPU isolation experiment, not a playable experience. Submit time is not GPU time. These samples do not establish production/physical-device acceptance.`,
  host: { platform: process.platform, cpu: os.cpus()[0]?.model, logicalCores: os.cpus().length, totalRAM: os.totalmem() },
  ownedProcesses: { nodePid: process.pid, parentPid: process.ppid, serverPort: port, browserManagedByPlaywright: true },
  runs: [],
};
await fs.mkdir(output, {recursive:true});
await fs.writeFile(`${output}/active-process.json`, JSON.stringify({ pid: process.pid, port, started: report.at, tool: 'qa-performance-probe.mjs' }, null, 2));
let server, browser;
const save = () => fs.writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
const ready = page => page.waitForFunction(() => window.__SC2_REPORT__?.().assetsReady && !window.__SC2_REPORT__().assetsPending, null, {timeout:240000});

try {
  server = await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null}});
  await server.listen();
  browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});
  report.browserVersion = browser.version();
  console.log(JSON.stringify({started:true,pid:process.pid,port}));
  await save();
  for (const config of cases) {
    const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {if(message.type()==='error') errors.push(message.text());});
      await page.goto(`http://127.0.0.1:${port}/`);
      await ready(page);
      await page.getByLabel('开局种族').selectOption('terran');
      await ready(page);
      await page.locator('[data-action=start]').click();
      const fixture = await page.evaluate(async config => {
        const {world:w,view:v} = window.__SC2_DEBUG__;
        const families = ['marine','marauder','tank','viking','medivac'];
        const heroes = ['raynor','swann','tosh'];
        w.paused=true; w.autoWaves=false; w.stage=17; w.stageElapsed=0; w.stageStartedAt=w.time;
        w.prepareStage(); w.rngState=421; w.eventPlan=[]; w.specialPlan=[]; w.ambientBacklog=[];
        w.entities.clear(); w.heroes.clear(); w.pods=[]; w.expedition.familySlots=families; w.expedition.ledger=[];
        for (const plan of Object.values(w.expedition.production)) plan.enabled={};
        w.wallet={minerals:100000,gas:100000};
        v.setQuality(config.quality);
        for(const family of families) {
          w.expedition.cardTotals['vitality.'+family]=1000;
          await v.ensureUnitVariant(family,family);
        }
        const center=[...w.spawnCells].filter(p=>w.terrain.canOccupy(p,2)).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];
        if(!center) throw Error('No stress battlefield center');
        w.anchor.x=center.x; w.anchor.z=center.z; w.trail=[{...center}];
        const origin={...center};
        for(const [i,family] of families.entries()) for(let j=0;j<5;j++) {
          const p=w.freePosition(family,{x:origin.x+(i-2)*1.5,z:origin.z+(j-2)*1.5},0,8);
          if(!p) throw Error('No legal friendly position');
          const unit=w.addUnit(family,'terran',p.x,p.z,5);
          if(family==='tank') unit.desiredMode='siege';
        }
        for(const id of heroes) {
          if(!w.acquireHero(id)) throw Error('Hero not ready '+id);
          const unit=w.heroEntity(id);
          await v.ensureUnitVariant(unit.modelKey,unit.unitType);
          unit.hp=unit.maxHp=100000;
        }
        const {SC2_UNITS}=await import('/src/data/sc2-units.ts');
        const enemyTypes=['zergling','roach','hydralisk','ravager','queen','mutalisk','corruptor','ultralisk'];
        for(const type of enemyTypes) await v.ensureUnitVariant(type,type);
        for(let i=0;i<config.enemies;i++) {
          const type=enemyTypes[i%enemyTypes.length],angle=i*2.399963,radius=10+(i%17)*.45;
          const desired={x:origin.x+Math.sin(angle)*radius,z:origin.z+Math.cos(angle)*radius},body=SC2_UNITS[type],r=body.unitRadius*.8;
          const p=[...w.spawnCells].filter(p=>(body.flying||w.terrain.canOccupy(p,r))&&Math.hypot(p.x-origin.x,p.z-origin.z)>8&&[...w.entities.values()].every(u=>u.flying!==body.flying||Math.hypot(u.x-p.x,u.z-p.z)>u.unitRadius+r+.12)).sort((a,b)=>Math.hypot(a.x-desired.x,a.z-desired.z)-Math.hypot(b.x-desired.x,b.z-desired.z))[0];
          if(!p) throw Error('No legal enemy position '+i);
          const unit=w.addUnit(type,'zerg',p.x,p.z); unit.hp=unit.maxHp=100000;
        }
        w.hash.rebuild(w.entities.values()); w.changed();
        if(config.spatialControl){const hash=w.hash;hash.queryPlane=(p,r,flying,visit)=>hash.query(p,r,b=>b.flying===flying?visit(b):undefined);}
        return {families,heroes,origin,ordinary:[...w.entities.values()].filter(u=>u.owner==='terran'&&!u.heroId&&!u.summonKind).length,heroCount:w.heroes.size,enemyCount:w.enemyCount(),seed:w.rngState,quality:v.quality};
      },config);
      await ready(page);
      assert.equal(fixture.ordinary,25); assert.equal(fixture.heroCount,3); assert.equal(fixture.enemyCount,config.enemies);
      await page.evaluate(config=>{
        const {world:w,view:v}=window.__SC2_DEBUG__;
        // Warmup is also render-free for the isolation control; remaining app-frame work remains enabled.
        if(!config.render) v.render=()=>{};
        w.paused=false;
      },config);
      await page.waitForTimeout(2000);
      const start = await page.evaluate(()=>{
        const {world:w,view:v}=window.__SC2_DEBUG__;
        const measurements=window.__performanceProbe={step:[],render:[],frames:[],drawCalls:[],triangles:[],lastFrame:performance.now()};
        const step=w.step.bind(w),render=v.render.bind(v);
        w.step=(...args)=>{const started=performance.now();try{return step(...args);}finally{measurements.step.push(performance.now()-started);}};
        v.render=(...args)=>{const started=performance.now();try{return render(...args);}finally{measurements.render.push(performance.now()-started);measurements.drawCalls.push(v.renderer.info.render.calls);measurements.triangles.push(v.renderer.info.render.triangles);}};
        const nextFrame=now=>{measurements.frames.push(now-measurements.lastFrame);measurements.lastFrame=now;if(!measurements.done)requestAnimationFrame(nextFrame);};
        requestAnimationFrame(nextFrame);
        const gl=v.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
        return {wall:performance.now(),time:w.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds,renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,report:window.__SC2_REPORT__()};
      });
      await page.waitForTimeout(sampleSeconds*1000);
      const finish = await page.evaluate(()=>{
        const {world:w,view:v}=window.__SC2_DEBUG__,measurements=window.__performanceProbe;
        measurements.done=true; w.paused=true;
        return {wall:performance.now(),time:w.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,counts:{ordinary:[...w.entities.values()].filter(u=>u.owner==='terran'&&!u.heroId&&!u.summonKind&&u.hp>0).length,heroes:[...w.entities.values()].filter(u=>u.heroId&&u.hp>0).length,enemies:w.enemyCount(),interceptors:[...w.entities.values()].filter(u=>u.summonKind==='interceptor'&&u.hp>0).length},measurements,report:window.__SC2_REPORT__(),renderMemory:{...v.renderer.info.memory}};
      });
      const run={...config,fixture,start,finish:{...finish,measurements:undefined},wallSeconds:(finish.wall-start.wall)/1000,simSeconds:finish.time-start.time,backlogDelta:finish.backlog-start.backlog,frameMs:summary(finish.measurements.frames.slice(1)),stepMs:summary(finish.measurements.step),renderSubmitMs:summary(finish.measurements.render),drawCalls:config.render?summary(finish.measurements.drawCalls):null,triangles:config.render?summary(finish.measurements.triangles):null,errors};
      report.runs.push(run);
      await save();
      console.log(JSON.stringify({id:config.id,wall:run.wallSeconds,sim:run.simSeconds,debt:run.backlogDelta,step:run.stepMs,render:run.renderSubmitMs,frames:run.frameMs,counts:finish.counts,heapMiB:finish.heap?.used/1048576,errors}));
      assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  }
} catch(error) {
  report.failure=String(error.stack??error); console.error(report.failure); process.exitCode=1;
} finally {
  await browser?.close();
  await server?.close();
  report.ownedProcesses.closedAt=new Date().toISOString();
  await save();
  await fs.writeFile(`${output}/active-process.json`,JSON.stringify({pid:process.pid,port,ended:report.ownedProcesses.closedAt,closed:true},null,2));
}
