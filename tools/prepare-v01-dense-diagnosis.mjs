import fs from 'node:fs/promises';
let s=await fs.readFile('tools/qa-v01-dense-comparison.mjs','utf8');
s=s.replace('repeat<1','repeat<0').replace("if(process.argv.includes('--visual'))","if(true)");
const marker=" setPhase('settings-invariance');";
const diagnostic=`
 setPhase('bounded-render-cpu-gpu-diagnosis');
 await page.evaluate(()=>{
  const v=A03.app.view,w=A03.app.world,gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const rows=[],pending=[],gpu=[],totals={},restores=[];let row=null,disjoint=0;
  const wrap=(obj,key,name)=>{const original=obj[key];if(typeof original!=='function')return;obj[key]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const elapsed=performance.now()-at;if(row){row[name]=(row[name]??0)+elapsed;const total=totals[name]??={calls:0,ms:0};total.calls++;total.ms+=elapsed;}}};restores.push(()=>obj[key]=original);};
  for(const key of ['sourceCombatEffects','nonHeroEffects','protossEliteEffects','zergEliteEffects','terranEliteEffects','eliteSupportEffects','confirmedHeroes','zergHeroes','protossHeroes','fx'])wrap(v[key],'render',key);
  wrap(v.sourceCombatEffects.player,'end','sourcePlayerEnd');wrap(v,'renderScene','sceneCpu');
  const original=v.render,autoReset=v.renderer.info.autoReset;v.renderer.info.autoReset=false;
  v.render=function(...args){
   row={tick:w.tick,at:performance.now()};v.renderer.info.reset();let q=null;
   if(ext&&!gl.isContextLost()){
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const p of pending)gl.deleteQuery(p.q);pending.length=0;}
    while(pending.length&&gl.getQueryParameter(pending[0].q,gl.QUERY_RESULT_AVAILABLE)){const p=pending.shift();gpu.push({tick:p.tick,ms:gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.q);}
    if(pending.length<8&&!gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){q=gl.createQuery();if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
   }
   try{return original.apply(this,args);}finally{if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q,tick:w.tick});}row.totalRender=performance.now()-row.at;row.calls=v.renderer.info.render.calls;row.triangles=v.renderer.info.render.triangles;rows.push(row);row=null;}
  };
  window.V01Diagnosis={finish(){v.render=original;v.renderer.info.autoReset=autoReset;for(const restore of restores)restore();for(const p of pending)gl.deleteQuery(p.q);return {rows,gpu,totals,disjoint,supported:!!ext,unavailableQueries:pending.length,adaptive:v.adaptiveQuality};}};
  window.V01TargetTicks=600;V01Steady.start('terran');
 });
 await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
 await page.waitForFunction(()=>V01Steady.done(),null,{timeout:90000});
 const profile=await cdp.send('Profiler.stop');await fs.writeFile(root+'/cpu-dense.json',JSON.stringify(profile));
 report.diagnosis=await page.evaluate(()=>({parts:V01Diagnosis.finish(),run:V01Steady.finish()}));await fs.writeFile(root+'/diagnosis.json',JSON.stringify(report.diagnosis));await save();
 assert.equal(report.diagnosis.run.endTick-report.diagnosis.run.startTick,600);assert.equal(report.diagnosis.run.errors.length,0);
`;
if(!s.includes(marker))throw Error('Marker absent');s=s.replace(marker,diagnostic+marker);await fs.writeFile('tools/qa-v01-dense-diagnosis.mjs',s,{flag:'wx'});
console.log('Prepared fresh deterministic visual replay, followed by separate bounded diagnostic; no formal performance samples.');
