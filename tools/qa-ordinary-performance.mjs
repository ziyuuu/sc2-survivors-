import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';

// Local-only performance observation. Screenshots never leave reports/local.
const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'reports/local/ordinary-performance-20260924';
if(!/^reports\/local\/[a-z0-9-]+$/.test(output))throw Error('Invalid local output');
const port=5183;
const quantile=(values,q)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*q))]:null;
const summary=values=>({count:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,p50:quantile(values,.5),p95:quantile(values,.95),p99:quantile(values,.99),max:values.length?Math.max(...values):null,over20:values.filter(v=>v>20).length,over33:values.filter(v=>v>33.4).length});
const cases=[
  {id:'opening-terran-native',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:20,kind:'natural'},
  {id:'opening-zerg-native',race:'zerg',width:1440,height:900,quality:'native',sampleSeconds:20,kind:'natural'},
  {id:'opening-protoss-native',race:'protoss',width:1440,height:900,quality:'native',sampleSeconds:20,kind:'natural'},
  {id:'opening-terran-performance',race:'terran',width:1440,height:900,quality:'performance',sampleSeconds:15,kind:'natural'},
  {id:'opening-terran-narrow',race:'terran',width:390,height:844,quality:'native',sampleSeconds:15,kind:'natural'},
  {id:'opening-terran-half-pixels',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'half-pixels'},
  {id:'opening-terran-no-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-ground'},
  {id:'opening-terran-no-ground-normals',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-ground-normals'},
  {id:'opening-terran-no-ground-colors',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-ground-colors'},
  {id:'opening-terran-flat-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'flat-ground'},
  {id:'opening-terran-sparse-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'sparse-ground'},
  {id:'opening-terran-dense-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'dense-ground'},
  {id:'opening-terran-no-props',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-props'},
  {id:'opening-terran-no-map',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-map'},
  {id:'opening-terran-no-gl-submit',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:15,kind:'natural',diagnostic:'no-gl-submit'},
  {id:'stage3-reference',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:18,kind:'stage-reference',stage:3},
  {id:'stage6-reference',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:18,kind:'stage-reference',stage:6},
  {id:'stage6-sparse-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:18,kind:'stage-reference',stage:6,diagnostic:'sparse-ground'},
  {id:'stage6-dense-ground',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:18,kind:'stage-reference',stage:6,diagnostic:'dense-ground'},
  {id:'stage6-no-render',race:'terran',width:1440,height:900,quality:'native',sampleSeconds:18,kind:'stage-reference',stage:6,render:false},
  ...['terran','zerg','protoss'].flatMap(race=>[41,80].map(points=>({id:`m2-opening-${race}-${points}`,race,width:1440,height:900,quality:'native',sampleSeconds:10,kind:'natural',points}))),
  ...['terran','zerg','protoss'].flatMap(race=>[0,41,80].filter(points=>race!=='terran'||points!==0).map(points=>({id:`m2-stage6-${race}-${points}`,race,width:1440,height:900,quality:'native',sampleSeconds:10,kind:'stage-reference',stage:6,points}))),
];
const selected=process.argv.includes('--cases')?process.argv[process.argv.indexOf('--cases')+1].split(','):cases.map(c=>c.id);
if(selected.some(id=>!cases.some(c=>c.id===id)))throw Error('Unknown case');
const report={at:new Date().toISOString(),method:'Local AMD Chrome headless, Vite development build, real Kairos map and original models, DPR1, Normal difficulty and default authored stage seed89241. After UI start, the diagnostic sets RNG state421 for subsequent random events. Natural cases use the real opening at configured 0/41/80 permanent talent points and retain ordinary production/waves; nonzero resources are a local test fixture. Stage-reference cases use authored stage schedules with controlled friendly formation and high friendly HP to keep a repeatable scene; they are not actual campaign progression. Fixed 60Hz simulation, 2s warmup, rAF/step/render wrappers only. Capture screenshots after sampling; no CDP profiler in frame samples. Headless Chrome is normally display-paced near 60Hz, so this cannot establish 60+ on physical hardware or production file.',host:{cpu:os.cpus()[0]?.model,logicalCores:os.cpus().length,totalRAM:os.totalmem()},ownedProcesses:{nodePid:process.pid,port},runs:[]};
await fs.mkdir(output,{recursive:true});
await fs.writeFile(`${output}/active-process.json`,JSON.stringify({pid:process.pid,port,started:report.at},null,2));
let browser,server;
const save=()=>fs.writeFile(`${output}/results.json`,JSON.stringify(report,null,2));
try{
  server=await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null}});
  await server.listen();
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});
  report.browserVersion=browser.version();
  await save();
  for(const id of selected){
    const config=cases.find(c=>c.id===id);
    const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:1});
    try{
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady&&!window.__SC2_REPORT__().assetsPending,null,{timeout:240000});
      await page.getByLabel('开局种族').selectOption(config.race);
      await page.locator('[data-setting=difficulty]').selectOption('normal');
      await page.waitForFunction(()=>!window.__SC2_REPORT__().assetsPending);
      if(config.points)await page.evaluate(async ({race,points})=>{
        const {MVP_TALENTS}=await import('/src/data/mvp-talents.ts'),profile=window.__SC2_DEBUG__.world.permanentProfile;
        if(!profile.award(`qa-m2-${race}-${points}`,300))throw Error('Talent fixture resource award failed');
        const levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&(node.line==='resources'||points===80&&node.line==='soldiers'&&node.tier<=5||points===80&&node.line==='soldiers'&&node.id.endsWith('S14'))).map(node=>[node.id,node.maxRank]));
        if(points===80)levels[`${{terran:'T',zerg:'Z',protoss:'P'}[race]}-S15`]=1;
        const quote=profile.previewTalentAllocation(race,0,levels);
        if(!quote||quote.allocated!==points||!profile.commitTalentAllocation(quote,quote.expectedRevision))throw Error('Talent fixture allocation failed');
      },config);
      await page.locator('[data-action=start]').click();
      const fixture=await page.evaluate(async config=>{
        const {world:w,view:v}=window.__SC2_DEBUG__;
        w.rngState=421;v.setQuality(config.quality);
        if(config.kind==='stage-reference'){
          w.paused=true;
          w.stage=config.stage;w.stageElapsed=0;w.stageStartedAt=w.time;
          w.prepareStage();
          const composition=config.race==='zerg'?{zergling:5,roach:4,queen:1}:config.race==='protoss'?{zealot:5,stalker:4,sentry:1}:config.stage===3?{marine:4,marauder:2}:{marine:5,marauder:4,medivac:1};
          for(const [family,count] of Object.entries(composition)){
            await v.ensureUnitVariant(family,family);
            for(let i=0;i<count;i++){
              const p=w.freePosition(family,{x:w.anchor.x+(i%3-1)*1.5,z:w.anchor.z+(Math.floor(i/3)-1)*1.5},0,8);
              if(!p)throw Error(`No reference position for ${family}`);
              // The legacy spatial owner field still uses terran for every player race.
              const u=w.addUnit(family,'terran',p.x,p.z,Math.min(5,config.stage));
              u.hp=u.maxHp=100000;
            }
          }
          for(const u of w.allies())u.hp=u.maxHp=100000;
          for(const plan of Object.values(w.expedition.production))plan.enabled={};
          w.hash.rebuild(w.entities.values());w.paused=false;w.changed();
        }
        if(config.diagnostic==='half-pixels'){v.renderer.setPixelRatio(.5);v.renderer.setSize(v.viewportWidth,v.viewportHeight,false);}
        if(config.diagnostic==='no-ground')v.scene.getObjectByName('char-traversable-ground').visible=false;
        if(['no-ground-normals','no-ground-colors'].includes(config.diagnostic)){
          const material=v.scene.getObjectByName('char-traversable-ground').material;
          const original=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);
          material.onBeforeCompile=shader=>{
            original(shader);
            const before=shader.fragmentShader;
            if(config.diagnostic==='no-ground-normals')shader.fragmentShader=before.replace(/vec3 mapN=normalize\(\(.*?normal=normalize\(tbn\*mapN\);/s,'');
            else shader.fragmentShader=before.replace(/diffuseColor\.rgb\*=\(.*?\);float opened/s,'diffuseColor.rgb*=vec3(.5);float opened');
            if(before===shader.fragmentShader)throw Error('Ground shader diagnostic did not match');
          };
          material.customProgramCacheKey=()=>oldKey()+'-'+config.diagnostic;
          material.needsUpdate=true;
        }
        if(config.diagnostic==='flat-ground'){
          const ground=v.scene.getObjectByName('char-traversable-ground');
          ground.material=new (await import('/node_modules/.vite/deps/three.js')).MeshBasicMaterial({color:0x888888});
        }
        if(config.diagnostic==='dense-ground'){
          const material=v.scene.getObjectByName('char-traversable-ground').material;
          const original=material.onBeforeCompile,oldKey=material.customProgramCacheKey.bind(material);
          const blend=sampler=>Array.from({length:8},(_,i)=>`texture(${sampler},vec3(vMapUv*mapTiling.xy+mapTiling.zw,${i}.0)).rgb*weights${Math.floor(i/4)}.${'xyzw'[i%4]}`).join('+');
          material.onBeforeCompile=shader=>{
            original(shader);
            const before=shader.fragmentShader;
            shader.fragmentShader=before.replace(/vec3 terrainColor=vec3\(0\.0\);.*?diffuseColor\.rgb\*=terrainColor;/s,`diffuseColor.rgb*=(${blend('mapLayers')});`).replace(/vec3 terrainNormal=vec3\(0\.0\);.*?vec3 mapN=normalize\(terrainNormal\*2\.0-1\.0\);/s,`vec3 mapN=normalize((${blend('normalLayers')})*2.0-1.0);`);
            if(before===shader.fragmentShader||shader.fragmentShader.includes('terrainColor')||shader.fragmentShader.includes('terrainNormal'))throw Error('Dense shader diagnostic did not match');
          };
          material.customProgramCacheKey=()=>oldKey()+'-qa-dense-ground';
          material.needsUpdate=true;
        }
        if(config.diagnostic==='no-props'){
          const root=v.scene.getObjectByName('terrain-Kairos Junction LE');
          for(const child of root.children)if(child.name!=='char-traversable-ground')child.visible=false;
        }
        if(config.diagnostic==='no-map')v.mapView.setVisible(false);
        if(config.diagnostic==='no-gl-submit')v.renderer.render=()=>{};
        if(config.render===false)v.render=()=>{};
        return {stage:w.stage,race:w.expedition.race,talentPoints:w.runConfig?.frozenTalents.allocated,initialBodies:w.allies().length,seed:w.rngState,quality:v.quality,waves:w.waves?.length};
      },config);
      await page.waitForFunction(()=>!window.__SC2_REPORT__().assetsPending);
      await page.waitForTimeout(2000);
      const start=await page.evaluate(()=>{
        const {world:w,view:v}=window.__SC2_DEBUG__,samples=window.__ordinaryPerf={steps:[],renders:[],frames:[],draws:[],triangles:[],lastFrame:performance.now(),events:[],slowGl:[],slowRender:[],slowFrames:[],peakAllies:0,peakEnemies:0,peakEntities:0},usedMeshes=new Set();
        const oldStep=w.step.bind(w),oldRender=v.render.bind(v),oldGl=v.renderer.render.bind(v.renderer);
        w.step=(...args)=>{const started=performance.now();try{return oldStep(...args);}finally{samples.steps.push(performance.now()-started);}};
        v.renderer.render=(...args)=>{const started=performance.now(),before=(v.renderer.info.programs??[]).map(p=>({id:p.id,name:p.name})),firstVisible=[];v.scene.traverseVisible(o=>{if(!o.isMesh||o.count===0||usedMeshes.has(o.id))return;usedMeshes.add(o.id);firstVisible.push({name:o.name,id:o.id,material:Array.isArray(o.material)?o.material.map(m=>m.type):o.material?.type,geometry:o.geometry?.type});});try{return oldGl(...args);}finally{const ms=performance.now()-started;if(ms>25){const added=(v.renderer.info.programs??[]).filter(p=>!before.some(q=>q.id===p.id)).map(p=>({id:p.id,name:p.name}));samples.slowGl.push({time:w.time,ms,programsBefore:before.length,programsAfter:v.renderer.info.programs?.length,newPrograms:added,firstVisible,entities:w.entities.size,models:v.loadedModels,draws:v.renderer.info.render.calls});}}};
        v.render=(...args)=>{const started=performance.now();try{return oldRender(...args);}finally{const ms=performance.now()-started;samples.renders.push(ms);samples.draws.push(v.renderer.info.render.calls);samples.triangles.push(v.renderer.info.render.triangles);if(ms>25)samples.slowRender.push({time:w.time,ms,entities:w.entities.size,models:v.loadedModels,assetsPending:v.assetsPending,draws:v.renderer.info.render.calls});}};
        const frame=now=>{const ms=now-samples.lastFrame;samples.frames.push(ms);samples.lastFrame=now;samples.peakEntities=Math.max(samples.peakEntities,w.entities.size);samples.peakAllies=Math.max(samples.peakAllies,w.allies().length);samples.peakEnemies=Math.max(samples.peakEnemies,w.enemyCount());if(ms>33.4)samples.slowFrames.push({time:w.time,ms,entities:w.entities.size,models:v.loadedModels,assetsPending:v.assetsPending});if(!samples.done)requestAnimationFrame(frame);};requestAnimationFrame(frame);
        return {wall:performance.now(),time:w.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds,phase:w.phase,stage:w.stage,enemyCount:w.enemyCount(),heap:performance.memory?.usedJSHeapSize,report:window.__SC2_REPORT__()};
      });
      await page.waitForTimeout(config.sampleSeconds*1000);
      const finish=await page.evaluate(()=>{
        const {world:w,view:v}=window.__SC2_DEBUG__,samples=window.__ordinaryPerf;
        samples.done=true;w.paused=true;
        return {wall:performance.now(),time:w.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds,phase:w.phase,stage:w.stage,enemyCount:w.enemyCount(),allies:w.allies().length,heap:performance.memory?.usedJSHeapSize,renderer:window.__SC2_REPORT__(),measurements:samples,renderMemory:{...v.renderer.info.memory}};
      });
      if(config.render!==false)await page.screenshot({path:`${output}/${id}.png`});
      const frames=finish.measurements.frames.slice(1);
      const run={...config,fixture,start,finish:{...finish,measurements:undefined},peak:{allies:finish.measurements.peakAllies,enemies:finish.measurements.peakEnemies,entities:finish.measurements.peakEntities},wallSeconds:(finish.wall-start.wall)/1000,simulationSeconds:finish.time-start.time,backlogDelta:finish.backlog-start.backlog,deliveredFps:frames.length/((finish.wall-start.wall)/1000),frameMs:summary(frames),stepMs:summary(finish.measurements.steps),renderSubmitMs:summary(finish.measurements.renders),drawCalls:summary(finish.measurements.draws),triangles:summary(finish.measurements.triangles),slowEvents:{gl:finish.measurements.slowGl,render:finish.measurements.slowRender,frame:finish.measurements.slowFrames},errors};
      report.runs.push(run);await save();
      console.log(JSON.stringify({id,stage:[start.stage,finish.stage],phase:finish.phase,wall:run.wallSeconds,sim:run.simulationSeconds,debt:run.backlogDelta,fps:run.deliveredFps,frames:run.frameMs,step:run.stepMs,render:run.renderSubmitMs,enemy:[start.enemyCount,finish.enemyCount],draws:run.drawCalls.mean,errors}));
      assert.deepEqual(errors,[]);
    }finally{await context.close();}
  }
}catch(error){report.failure=String(error.stack??error);console.error(report.failure);process.exitCode=1;}
finally{await browser?.close();await server?.close();report.ownedProcesses.closedAt=new Date().toISOString();await save();await fs.writeFile(`${output}/active-process.json`,JSON.stringify({pid:process.pid,port,closed:true,ended:report.ownedProcesses.closedAt},null,2));}
