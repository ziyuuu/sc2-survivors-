import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Record the normal animation loop, without advancing the simulation or asking for
// the large renderer diagnostics in the timed part of a frame.
const label=process.argv[2];
if(!/^[a-z0-9-]+$/.test(label??''))throw Error('Specify a measurement name');
const cards=process.argv.slice(3);
if(!cards.length)cards.push('P01','N05','O01');
const out=process.env.ARMED_QA_OUT??'reports/local/armed-support-feedback-20261112';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({
 executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
 headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']
});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const client=await page.context().newCDPSession(page);
const errors=[],cases=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
function distribution(values){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const at=p=>+sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)].toFixed(2);
 return {p50:at(.5),p95:at(.95),p99:at(.99),max:at(1)};
}
try{
 await page.goto((process.env.SC2_QA_URL??'http://127.0.0.1:5196')+'/preview/armed-support-showcase-20261111/?card='+cards[0].split('-')[0],{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>window.armedShowcase&&!document.querySelector('#replay').disabled,null,{timeout:300000,polling:200});
 for(const [index,id] of cards.entries()){
  const [card,mode]=id.split('-');
  if(index)await page.evaluate(id=>window.armedShowcase.load(id,true),card);
  const prepared=await page.evaluate(async()=>{const start=performance.now();await window.armedShowcase.replay(false);return performance.now()-start;});
  if(card==='O01'&&mode==='scorched'){
   await page.evaluate(()=>{window.armedShowcase.world.expedition.support.armed.ranks.N05=1;});
  }
  if(mode==='manual')await page.evaluate(()=>{const s=window.armedShowcase;s.advance(16);if(s.world.expedition.support.ammo!==1)throw Error('Missing earned stock for manual replay');});
  await client.send('Profiler.enable');
  await client.send('Profiler.start');
  const result=await page.evaluate(async({traceShaders,manual})=>{
   const gallery=window.armedShowcase,{world,view}=gallery,source=view.sourceCombatEffects,player=source.player;
   const gl=view.renderer.getContext(),gpu=gl.getExtension('WEBGL_debug_renderer_info');
   const renderer=gpu?gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
   const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[];
   const frames=[],impacts=new Map(),shaderLog=[],originalRender=view.render,originalAdd=player.add,originalEnd=player.end,originalStep=world.step;
   const originalDraw=view.renderer.renderBufferDirect,originalLog=gl.getProgramInfoLog;
   const preparedKeys=traceShaders?view.renderer.info.programs.map(p=>p.cacheKey):[];
   let draw;
   if(traceShaders){
    view.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,...args){
     draw={object,material};
     try{return originalDraw.call(this,camera,scene,geometry,material,object,...args);}finally{draw=undefined;}
    };
    gl.getProgramInfoLog=function(program){
     const start=performance.now();
     try{return originalLog.call(this,program);}
     finally{
      const ms=performance.now()-start;
      const key=view.renderer.info.programs.find(p=>p.program===program)?.cacheKey;
      const parts=key?.split(',')??[];
      const diff=fields=>fields.reduce((n,x,i)=>n+Number(x!==parts[i]),0);
      const nearest=key&&preparedKeys.map(s=>s.split(',')).sort((a,b)=>diff(a)-diff(b))[0];
      const differences=nearest?parts.flatMap((x,i)=>x!==nearest[i]?[[i,nearest[i],x]]:[]):[];
      const obj=draw?.object,path=[];
      for(let p=obj;p;p=p.parent)if(p.name)path.push(p.name);
      const batch=obj&&([...view.gpu].find(([,b])=>b.allMeshes.includes(obj))?.[0]
       ??[...view.pickups.batches].find(([,meshes])=>meshes.includes(obj))?.[0]
       ??Object.keys(view).find(k=>view[k]===obj));
      shaderLog.push({tick:world.tick,ms,material:draw?.material.name,owner:path.join('/'),batch,
       geometry:obj&&Object.keys(obj.geometry.attributes),key,differences});
     }
    };
   }
   let nukeMs=0,flushMs=0,worldMs=0,previous=null,first=null;
   const drain=()=>{
    while(pending.length&&gl.getQueryParameter(pending[0].query,gl.QUERY_RESULT_AVAILABLE)){
     const {query,row}=pending.shift();
     if(!gl.getParameter(ext.GPU_DISJOINT_EXT))row.gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
     gl.deleteQuery(query);
    }
   };
   player.add=function(request,...args){
    if(request.model!=='GhostNukeExplode')return originalAdd.call(this,request,...args);
    const time=performance.now();
    if(!impacts.has(request.key))impacts.set(request.key,{time:world.time-request.age/(request.clockRate??1),x:request.placement.x,z:request.placement.z});
    first??=world.time;
    try{return originalAdd.call(this,request,...args);}finally{nukeMs+=performance.now()-time;}
   };
   player.end=function(...args){const time=performance.now();try{return originalEnd.apply(this,args);}finally{flushMs+=performance.now()-time;}};
   world.step=function(...args){const time=performance.now();try{return originalStep.apply(this,args);}finally{worldMs+=performance.now()-time;}};
   try{
    await new Promise((resolve,reject)=>{
     const watchdog=setTimeout(()=>reject(Error('Timed replay did not complete a nuclear volley')),100000);
     view.render=function(...args){
      if(ext)drain();
      const start=performance.now(),row={tick:world.tick,time:world.time,gap:previous===null?0:start-previous,worldMs,nukeMs:0,flushMs:0,renderMs:0,particles:0,shots:0};
      previous=start;worldMs=0;nukeMs=0;flushMs=0;
      const query=ext&&pending.length<12?gl.createQuery():null;
      if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
      try{originalRender.apply(this,args);}finally{if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,row});}}
      row.renderMs=performance.now()-start;row.nukeMs=nukeMs;row.flushMs=flushMs;
      const counts=player.modelCounts.get('GhostNukeExplode');
      row.particles=counts?.particles??0;row.shots=counts?.requests??0;
      frames.push(row);
      if(first!==null&&world.time>=first+5){world.paused=true;clearTimeout(watchdog);resolve();}
     };
     world.paused=false;if(manual)document.querySelector('#manual').click();
    });
   }finally{
    world.paused=true;view.render=originalRender;player.end=originalEnd;player.add=originalAdd;world.step=originalStep;
    if(traceShaders){gl.getProgramInfoLog=originalLog;view.renderer.renderBufferDirect=originalDraw;}
    if(ext){drain();for(const {query} of pending)gl.deleteQuery(query);}
   }
   const r=gallery.report();if(manual&&r.ammo!==0)throw Error('Manual volley did not spend its earned stock');
   return {renderer,quality:r.render.resolution,first,impacts:[...impacts.values()],damage:r.bySource,ammo:r.ammo,frames,shaderLog};
  },{traceShaders:process.env.ARMED_TRACE_SHADERS==='1',manual:mode==='manual'});
  const {profile}=await client.send('Profiler.stop');
  const nodes=new Map(profile.nodes.map(n=>[n.id,n.callFrame])),byFunction=new Map();
  for(const [i,sample]of profile.samples.entries()){
   const fn=nodes.get(sample),name=fn.functionName+' '+fn.url.split('?')[0].split('/').slice(-2).join('/');
   byFunction.set(name,(byFunction.get(name)??0)+profile.timeDeltas[i]/1000);
  }
  await client.send('Profiler.disable');
  const active=result.frames.filter(f=>f.shots&&f.gap>0);
  if(id==='O01-scorched'){
   assert.ok(result.impacts.length>=5&&result.impacts.length<=8,'Scorched counterattack volley size');
   assert.equal(result.ammo,1,'Scorched counterattack earns one stock');
  }else assert.equal(result.impacts.length,card==='N05'?8:4,id+' nuclear impacts');
  assert.ok(active.length>=10,id+' measured active frames');
  const summary={id,replayPrepareMs:Math.round(prepared),impacts:result.impacts.length,frames:active.length,
   frameMs:distribution(active.map(f=>f.gap)),renderMs:distribution(active.map(f=>f.renderMs)),gpuMs:distribution(active.map(f=>f.gpuMs)),
   nukeMs:distribution(active.map(f=>f.nukeMs)),flushMs:distribution(active.map(f=>f.flushMs)),worldMs:distribution(active.map(f=>f.worldMs)),
   framesOver50:active.filter(f=>f.gap>50).length,peakParticles:Math.max(...active.map(f=>f.particles)),renderer:result.renderer};
  cases.push({summary,...result,hotspots:[...byFunction].sort((a,b)=>b[1]-a[1]).slice(0,32)});
  await fs.writeFile(out+'/frames-'+label+'.json',JSON.stringify({cases,errors},null,2));
  console.log(JSON.stringify(summary));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
