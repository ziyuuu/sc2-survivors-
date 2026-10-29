/** Local-only instrumentation. Imported by build-safari-stage-diagnostic.mjs;
 * never added to the player entry or production deployment. */
import {installRuntimeMemoryTrace,captureRuntimeMemoryInventory} from './runtime-memory-inventory.mjs';
export function installSafariTrace(){installRuntimeMemoryTrace();}
export function attachSafariDiagnostic(app){
 globalThis.__QUALITY_APP__=app;
 const variant=new URL(location.href).pathname.split('/').filter(Boolean)[0],events=[],samples=[],errors=[];
 const {world:w,view:v,session:s}=app;let steering=false,last='',rewardAt=0;
 const panel=document.createElement('div');panel.id='safari-diagnostic';panel.style.cssText='position:fixed;top:55px;left:8px;z-index:999999;background:#061019;color:white;font:12px monospace;padding:6px;max-width:500px';
 const label=document.createElement('span'),capture=document.createElement('button'),move=document.createElement('button');capture.textContent='记录诊断';move.textContent='开启模拟走位';panel.append(label,capture,move);document.body.append(panel);
 move.onclick=()=>{steering=!steering;move.textContent=steering?'停止模拟走位':'开启模拟走位';};
 const row=(tag)=>({tag,at:performance.now(),phase:w.phase,stage:w.stage,time:w.time,elapsed:w.stageElapsed,paused:w.paused,readiness:app.readiness.state.phase,progress:app.readiness.state.progress,models:v.gpu.size,textures:v.renderer.info.memory.textures,programs:v.renderer.info.programs?.length,gl:globalThis.__RUNTIME_MEMORY_TRACE__?.(),heap:performance.memory?.usedJSHeapSize,saveFailed:s.saveFailed});
 const publish=async(inventory=false)=>{
  const sample=row('manual');if(inventory){const data=captureRuntimeMemoryInventory();sample.inventory={cpuBuffers:data.cpuBuffers.uniqueBytes,decodedImages:data.decodedImages.uniqueBytes,models:data.models,effectModels:data.effectModels,targets:data.targets};}
  samples.push(sample);const raw=s.exportJSON(),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const report={variant,method:'Windows Chromium; medium visuals; simulated unknown-memory touch budget; native RAF/fixed steps; local instrumentation only',url:location.href,events,samples,errors,archiveBytes:new TextEncoder().encode(raw).length,archiveHash:digest,wallet:{...w.wallet},rewards:w.rewards.map(r=>({id:r.offerId,value:r.value,sold:r.sold})),modelErrors:[...v.modelErrors],missingEffects:v.sourceCombatEffects?.player?.counts?.missing,backgroundModels:[...v.backgroundPreloadModels().keys()]};
  await fetch('/__diagnostic-report/'+variant,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});label.textContent=variant+' 已记录 '+w.phase+' '+w.time.toFixed(1)+'s / '+sample.models+'模型';
 };
 capture.onclick=()=>void publish(true).catch(error=>{errors.push(String(error));label.textContent=String(error);});
 const wrap=(object,key)=>{const fn=object[key];object[key]=function(...args){const begin=performance.now();const event={key,phase:w.phase,time:w.time,start:begin};try{const result=fn.apply(this,args);if(result?.then)return result.finally(()=>{event.ms=performance.now()-begin;events.push(event);});event.ms=performance.now()-begin;events.push(event);return result;}catch(error){event.error=String(error);events.push(event);throw error;}};};
 for(const key of ['captureRun','endStage'])wrap(w,key);for(const key of ['exportJSON','saveNow'])wrap(s,key);
 for(const key of ['prepareSnapshotAssets','prepareCommonAssets','prepareEndlessAssets','warmPresentationBatches'])wrap(v,key);
 const prepare=v.prepareSnapshotAssets;v.prepareSnapshotAssets=async function(...args){samples.push(row('before-restore'));try{return await prepare.apply(this,args);}finally{samples.push(row('after-restore'));}};
 addEventListener('error',event=>errors.push(event.message));addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
 let next=0,direction={x:0,z:0};const step=w.step;
 w.step=function(...args){if(steering&&w.phase==='battle'&&!w.paused){if(w.time>=next){next=w.time+.15;const allies=w.allies().filter(u=>u.hp>0&&!u.temporary),center=allies.length?{x:allies.reduce((n,u)=>n+u.x,0)/allies.length,z:allies.reduce((n,u)=>n+u.z,0)/allies.length}:w.anchor,distance=p=>Math.hypot(p.x-center.x,p.z-center.z);let threat,goal;
   for(const u of w.entities.values())if(u.hp>0&&u.owner==='zerg'&&(!threat||distance(u)<distance(threat)))threat=u;
   for(const p of [...w.pods.filter(p=>['falling','active','opening'].includes(p.status)),...w.pickups])if(!goal||distance(p)<distance(goal))goal=p;
   if(threat&&distance(threat)<4.5){const dx=center.x-threat.x,dz=center.z-threat.z,n=Math.hypot(dx,dz)||1;goal={x:center.x+dx/n*6,z:center.z+dz/n*6};}else if(threat&&distance(threat)<7)goal=undefined;
   if(goal){const dx=goal.x-w.anchor.x,dz=goal.z-w.anchor.z,n=Math.hypot(dx,dz);direction=n>.7?{x:dx/n,z:dz/n}:{x:0,z:0};}else direction={x:0,z:0};
  }w.input={...direction};}return step.apply(this,args);};
 setInterval(()=>{const current=row('interval'),key=[current.phase,current.stage,current.readiness,Math.floor(current.progress*10)].join(':');if(key!==last||w.phase==='battle'&&w.stageElapsed>57){samples.push(current);last=key;}
  if(w.phase==='reward'&&!rewardAt){rewardAt=performance.now();setTimeout(()=>void publish(true),1500);}label.textContent=variant+' '+w.phase+' '+w.time.toFixed(1)+'s / '+v.gpu.size+'模型';
 },500);
}
