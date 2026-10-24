import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const root=path.resolve('reports/local/performance-r01-20261020',process.argv[2]??'boundaries-r1');await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338'),page=browser.contexts()[0].pages()[0],hash=x=>createHash('sha256').update(x).digest('hex'),report={cases:[],errors:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
try{
 for(const [theme,x,z]of [['industrial',5,10],['mar-sara',5,8],['char',0,6],['ice',-16,15],['frontier',-22,20]]){
  await page.evaluate(async theme=>{const a=window.__B02__;window.__R01_PAIR__.set('baseline');await a.view.prepareCampaignAssets({version:3,seed:529,theme});await window.__B03__.reset('r01-boundary',{theme,stage:18});a.world.entities.clear();a.world.hash.rebuild(a.world.entities.values());await a.prepare();},theme);
  for(const [zoom,pitch,width,height]of [[.6,60,1440,900],[1.8,40,1280,720]]){
   await page.setViewportSize({width,height});
   await page.evaluate(({x,z,zoom,pitch})=>{const a=window.__B02__,v=a.view;a.world.anchor={x,z,facing:0};v.setCameraMode('fixed');v.setCameraZoom(zoom);v.setCameraPitch(pitch);window.__R01__.settle();v.warmLightingFrame();},{x,z,zoom,pitch});
   const key=theme+'-'+zoom,state=await page.evaluate(()=>window.__B02__.snapshot()),row={key,theme,x,z,zoom,pitch,width,height,stateHash:hash(state),variants:[]};report.cases.push(row);
   for(const variant of ['baseline','candidate']){
    await page.evaluate(variant=>{window.__R01_PAIR__.set(variant);window.__R01__.settle();window.__R01_CAPTURE=window.__B02__.view.render;window.__B02__.view.render=()=>{};},variant);
    const file=root+'/'+key+'-'+variant+'.png';try{await page.screenshot({path:file});}finally{await page.evaluate(()=>{window.__B02__.view.render=window.__R01_CAPTURE;delete window.__R01_CAPTURE;});}
    const checkpoint=await page.evaluate(()=>window.__B02__.checkpoint());assert.equal(await page.evaluate(()=>window.__B02__.snapshot()),state);row.variants.push({variant,file,sha256:hash(await fs.readFile(file)),checkpoint});await save();
   }
   console.log(key+' exact state');
  }
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);}finally{await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{window.__R01_PAIR__.set('baseline');window.__R01__.settle();}).catch(()=>{});await save();}
console.log(JSON.stringify({pass:report.pass,cases:report.cases.length,errors:report.errors}));process.exit(process.exitCode??0);
