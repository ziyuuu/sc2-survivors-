import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const name=process.argv[2]??'pair-pilot-1',root=path.resolve('reports/local/performance-r01-20261020',name);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');const hash=x=>createHash('sha256').update(x).digest('hex'),fragments=JSON.parse(await fs.readFile('reports/local/performance-r01-20261020/shader-fragments-r1.json'));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338'),page=browser.contexts()[0].pages()[0],report={name,fragments,samples:[],screens:[],errors:[],scenarios:[]};page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
await page.evaluate(data=>{
 if(window.__R01_PAIR__)return;
 const a=window.__B02__,v=a.view,installed=new WeakSet();let variant='baseline';const events=[];
 const install=()=>{v.scene.traverse(n=>{if(!n.isMesh)return;for(const m of Array.isArray(n.material)?n.material:[n.material]){
  if(!m.name.startsWith('original-ground:')||installed.has(m))continue;const theme=m.name.split(':')[1],old=data.variants.baseline.themes[theme].fragment,next=data.variants.candidate.themes[theme].fragment,compile=m.onBeforeCompile,key=m.customProgramCacheKey;
  m.onBeforeCompile=function(s,r){compile.call(this,s,r);if(!s.fragmentShader.includes(old))throw Error('Production ground fragment mismatch: '+theme);if(variant==='candidate')s.fragmentShader=s.fragmentShader.replace(old,next);events.push({theme,variant,oldFound:true});};m.customProgramCacheKey=()=>key.call(m)+':r01-pair-'+variant;installed.add(m);
 }});};
 window.__R01_PAIR__={events,set(value){variant=value;install();v.scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.name.startsWith('original-ground:'))m.needsUpdate=true;});},get variant(){return variant;}};
},fragments);
try{
 const scenarios=process.env.SC2_R01_FULL==='1'?[['quiet','industrial'],['quiet','mar-sara'],['quiet','char'],['quiet','ice'],['quiet','frontier'],['ranged-300','char'],['psionic','char']]:[['quiet','char']];
 const rounds=process.env.SC2_R01_FULL==='1'?6:3;
 for(const [scene,theme]of scenarios){
  const key=scene+'-'+theme;await page.evaluate(async({scene,theme})=>{window.__R01_PAIR__.set('baseline');await window.__B02__.view.prepareCampaignAssets({version:3,seed:529,theme});return window.__R01__.setup(scene,theme,120);},{scene,theme});
  await page.waitForFunction(()=>{const a=window.__B02__,v=a.view;return !v.mapSwitching&&v.mapTerrain===a.world.terrain&&!v.assetsPending;},null,{timeout:180000});
  await page.evaluate(theme=>{const a=window.__B02__,v=a.view;window.__R01_PAIR__.set('baseline');window.__R01__.settle();v.warmLightingFrame();if(v.mapView.report().environment.ground.profile!==theme||v.mapView.report().sourceSha256!==a.world.terrain.definition.source.sha256)throw Error('Map binding mismatch');},theme);
  const state=await page.evaluate(()=>window.__B02__.snapshot());report.scenarios.push({key,checkpoint:await page.evaluate(()=>window.__B02__.checkpoint()),sha256:hash(state)});await fs.writeFile(root+'/'+key+'.state.json',state);
  for(let round=0;round<rounds;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate']){
   await page.evaluate(variant=>window.__R01_PAIR__.set(variant),variant);
   for(const stage of ['ground','total']){const result=await page.evaluate(stage=>window.__R01__.measure(stage,20,8),stage);report.samples.push({key,round,variant,...result});await save();assert.ok(result.gpuMs.every(x=>x>0),'Missing positive '+stage+' samples');const sorted=result.gpuMs.slice().sort((a,b)=>a-b);console.log(key+' '+round+' '+variant+' '+stage+' '+sorted[10].toFixed(3));}
   if(round===0){
    await page.evaluate(()=>{window.__R01__.settle();const v=window.__B02__.view;window.__R01_PAIR_CAPTURE=v.render;v.render=()=>{};});const file=root+'/'+key+'-'+variant+'.png';try{await page.screenshot({path:file});}finally{await page.evaluate(()=>{window.__B02__.view.render=window.__R01_PAIR_CAPTURE;delete window.__R01_PAIR_CAPTURE;});}
    report.screens.push({key,variant,file,sha256:hash(await fs.readFile(file))});await save();
   }
   assert.equal(await page.evaluate(()=>window.__B02__.snapshot()),state);
  }
 }
 report.compileEvents=await page.evaluate(()=>window.__R01_PAIR__.events);assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);}finally{await page.evaluate(()=>window.__R01_PAIR__.set('baseline')).catch(()=>{});await save();}
console.log(JSON.stringify({pass:report.pass,samples:report.samples.length,errors:report.errors}));
process.exit(process.exitCode??0);
