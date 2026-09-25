import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Captures stay local; compare their pixels with a local image tool.
const output='reports/local/ground-sparse-visual-20260924',port=5184;
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),method:'Same paused World and camera; sparse production terrain shader versus exact previous unconditional eight-layer expressions. Local canvas-only PNGs at stages1 and6; no artwork or screenshots uploaded.',captures:[],errors:[]};
let browser,server;
try{
  server=await createServer({server:{host:'127.0.0.1',port,strictPort:true,hmr:false,watch:null}});
  await server.listen();
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady&&!window.__SC2_REPORT__().assetsPending,null,{timeout:240000});
  await page.locator('[data-action=start]').click();
  await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.paused=true;v.cameraTarget.set(w.anchor.x,w.terrain.height(w.anchor),w.anchor.z);});
  const change=async dense=>page.evaluate(dense=>{
    const {view:v}=window.__SC2_DEBUG__,material=v.scene.getObjectByName('char-traversable-ground').material;
    if(!window.__groundSparseOriginal)window.__groundSparseOriginal={compile:material.onBeforeCompile,key:material.customProgramCacheKey.bind(material)};
    const original=window.__groundSparseOriginal;
    if(dense){
      const atlas=sampler=>Array.from({length:8},(_,i)=>`texture(${sampler},vec3(vMapUv*mapTiling.xy+mapTiling.zw,${i}.0)).rgb*weights${Math.floor(i/4)}.${'xyzw'[i%4]}`).join('+');
      material.onBeforeCompile=shader=>{
        original.compile(shader);
        const before=shader.fragmentShader;
        shader.fragmentShader=before.replace(/vec3 terrainColor=vec3\(0\.0\);.*?diffuseColor\.rgb\*=terrainColor;/s,`diffuseColor.rgb*=(${atlas('mapLayers')});`).replace(/vec3 terrainNormal=vec3\(0\.0\);.*?vec3 mapN=normalize\(terrainNormal\*2\.0-1\.0\);/s,`vec3 mapN=normalize((${atlas('normalLayers')})*2.0-1.0);`);
        if(before===shader.fragmentShader||shader.fragmentShader.includes('terrainColor')||shader.fragmentShader.includes('terrainNormal'))throw Error('Dense comparison shader did not match');
      };
      material.customProgramCacheKey=()=>original.key()+'-qa-dense';
    }else{
      material.onBeforeCompile=original.compile;
      material.customProgramCacheKey=original.key;
    }
    material.needsUpdate=true;
  },dense);
  for(const stage of [1,6]){
    await page.evaluate(stage=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.stage=stage;w.stageElapsed=0;w.stageStartedAt=w.time;w.prepareStage();w.paused=true;v.cameraTarget.set(w.anchor.x,w.terrain.height(w.anchor),w.anchor.z);w.changed();},stage);
    await change(false);await page.waitForTimeout(800);
    await page.locator('#battle').screenshot({path:`${output}/stage${stage}-sparse-a.png`});
    await page.waitForTimeout(300);
    await page.locator('#battle').screenshot({path:`${output}/stage${stage}-sparse-b.png`});
    await change(true);await page.waitForTimeout(800);
    await page.locator('#battle').screenshot({path:`${output}/stage${stage}-dense.png`});
    report.captures.push({stage,sparseA:`${output}/stage${stage}-sparse-a.png`,sparseB:`${output}/stage${stage}-sparse-b.png`,dense:`${output}/stage${stage}-dense.png`});
  }
  assert.deepEqual(report.errors,[]);
  await context.close();
}catch(error){report.failure=String(error.stack??error);console.error(report.failure);process.exitCode=1;}
finally{await browser?.close();await server?.close();await fs.writeFile(`${output}/results.json`,JSON.stringify(report,null,2));}
