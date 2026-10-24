import type {boot} from '../src/app/bootstrap';
import {chooseCampaignMap} from '../src/data/campaign-map';
import {selectRunData} from '../src/simulation/persistence/run-fields';
import {diagnosticHealthLock,setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
import {installB02Fixtures} from './performance-b02-scenes';
import {equipmentPresentationReceipts} from '../src/simulation/starship/presentation';
import {MapTerrain} from '../src/simulation/movement/map-terrain';

/** Measurement-only wrapper around the production app. Never imported by src/main. */
export function installPerformanceB02(app:Awaited<ReturnType<typeof boot>>){
 const {world:w,view:v,hud,driver:d,readiness}=app;
 let frozen=true,controller:ReturnType<typeof createCampaignController>|null=null,nextThink=0,caseName='normal-new-run';
 const nativePrepare=app.session.prepareNewRun.bind(app.session);
 app.session.prepareNewRun=(...args)=>{const t=nativePrepare(...args);t.campaignMap={...chooseCampaignMap(529),theme:'char'};return t;};
 const nativeAdvance=d.advance.bind(d);d.advance=(seconds:number)=>frozen?1:nativeAdvance(seconds);
 const freeze=()=>{frozen=true;d.reset();};const play=()=>{frozen=false;d.reset();};
 let active=false,detail=false,last=0,frames:any[]=[],gpu:any[]=[],pending:any[]=[],cpu:any={},draw:any[]=[],disjoint=0,uploads:any={},models=new Set<string>(),peak:any={},events:Record<string,number>={},trace:any[]=[];
 const gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const span=(name:string,start:number)=>{if(!active||!detail)return;const ms=performance.now()-start,t=cpu[name]??(cpu[name]={calls:0,totalMs:0,maxMs:0});t.calls++;t.totalMs+=ms;t.maxMs=Math.max(t.maxMs,ms);};
 const step=w.step.bind(w);w.step=()=>{const start=performance.now();if(controller){const bt=performance.now();controller.decisions();if(w.phase==='battle'&&w.time+1e-8>=nextThink){controller.think();nextThink=w.time+.25;}span('controller',bt);}step();span('simulation.step.includingController',start);};
 const advance=d.advance;d.advance=function(...args:any[]){const at=performance.now();try{return advance.apply(this,args);}finally{span('simulation.advance',at);}};
 const afterRender=hud.afterRender;hud.afterRender=function(...args:any[]){const at=performance.now();try{return afterRender.apply(this,args);}finally{span('hud.afterRender',at);}};
 const visual=w.visual;w.visual=function(...args:any[]){if(active)events[args[0]]=(events[args[0]]??0)+1;return visual.apply(this,args);};
 const poll=()=>{if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const p of pending)gl.deleteQuery(p.q);pending=[];return;}pending=pending.filter(p=>{if(!gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE))return true;gpu.push({frame:p.frame,ms:gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.q);return false;});};
 const render=v.render;v.render=function(...args:any[]){if(!active)return render.apply(this,args);const at=performance.now();let q:any=null;if(detail){poll();v.renderer.info.reset();q=ext&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}const start=performance.now(),result=render.apply(this,args),end=performance.now();
  if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q,frame:frames.length});}frames.push({at,interval:last?at-last:null,...detail?{renderCpuMs:end-start}:{},steps:d.lastSteps,backlog:d.accumulator,time:w.time,tick:w.tick});last=at;
  if(detail){draw.push({...v.renderer.info.render});const p=(v as any).sourceCombatEffects.player;for(const [name,c]of p.modelCounts)if(Object.values(c).some(n=>typeof n==='number'&&n>0))models.add(name);for(const key of ['particles','meshes','ribbonQuads','projectionQuads','displacementMeshes','displacementQuads','effects'])peak[key]=Math.max(peak[key]??0,p.counts[key]??0);}
  return result;
 };
 for(const [obj,key,name]of [[w.contacts,'resolve','simulation.contacts'],[w,'updateUnit','simulation.units.includingNavigation'],[w.hash,'rebuild','simulation.hashRebuild'],[MapTerrain.prototype,'routeGoal','simulation.navigation'],[MapTerrain.prototype,'path','simulation.pathSearch'],[w,'findTarget','simulation.findTarget'],[w,'updateAuras','simulation.auras'],[(v as any).sourceCombatEffects,'render','render.sourceEffects'],[(v as any).sourceCombatEffects.player,'add','render.sourceEvaluate']] as any[]){if(typeof obj?.[key]!=='function')continue;const original=obj[key];obj[key]=function(...args:any[]){const at=active&&detail?performance.now():0;try{return original.apply(this,args);}finally{if(at)span(name,at);}};}
 const tex=gl.texSubImage2D,buffer=gl.bufferSubData;
 gl.texSubImage2D=function(...args:any[]){if(active&&detail&&args[7]===gl.FLOAT&&args[8] instanceof Float32Array){uploads.floatTextureCalls++;uploads.floatTextureBytes+=args[4]*args[5]*(args[6]===gl.RG?2:args[6]===gl.RED?1:4)*4;}return tex.apply(this,args);};
 gl.bufferSubData=function(...args:any[]){const data=args[2];if(active&&detail&&ArrayBuffer.isView(data)){uploads.bufferCalls++;uploads.bufferBytes+=(args[4]??((data as any).length-(args[3]??0)))*(data as any).BYTES_PER_ELEMENT;}return buffer.apply(this,args);};
 const source=()=>{const all=(v as any).sourceCombatEffects.report(),p=all.source;return {routes:all.routes,events:all.events,flights:all.flights,echoes:all.echoes,models:p.models,particles:p.particles,meshes:p.meshes,ribbonQuads:p.ribbonQuads,projectionQuads:p.projectionQuads,displacementMeshes:p.displacementMeshes,displacementQuads:p.displacementQuads,activeRequests:p.activeRequests,modelDraws:p.modelDraws,endingChannels:p.endingChannels,meshInstances:p.meshInstances,batches:p.batches.map((b:any)=>({key:b.key,...b})),particleCache:p.particleCache};};
 const state=()=>({at:performance.now(),caseName,recipe:w.runConfig?.campaignMap,race:w.expedition.race,difficulty:w.difficulty,stage:w.stage,stageElapsed:w.stageElapsed,time:w.time,tick:w.tick,rng:w.rngState,backlog:d.accumulator,discarded:d.discardedBacklogSeconds,phase:w.phase,paused:w.paused,decision:w.requiresPlayerDecision,assetsPending:v.assetsPending,readiness:readiness.state.kind,enemies:w.enemyCount(),allies:w.allies().length,visible:!document.hidden,focus:document.hasFocus(),stats:{...w.stats},wallet:{...w.wallet},items:Object.keys(w.starship.account.items).length,lock:diagnosticHealthLock(w)});
 const snapshot=()=>JSON.stringify({run:selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account},(_k,value)=>value instanceof Map?{__map:[...value]}:value instanceof Set?{__set:[...value]}:value);
 const checkpoint=()=>({state:state(),source:source(),render:v.report(),memory:{...v.renderer.info.memory},programs:v.renderer.info.programs?.length,world:{equipmentReceipts:equipmentPresentationReceipts(w),specials:w.enemySpecials.snapshot(),mainCombat:w.campaign18Runtime?.mainCombat,effects:w.effects.length,events:w.visualEvents.length,flights:w.weaponFlights.length,spells:w.expedition.spells.map(s=>({kind:s.kind,source:s.source,target:s.target,until:s.until})),healTargets:w.allies().filter(u=>u.healTarget!==null).map(u=>({id:u.id,type:u.unitType,target:u.healTarget,targets:u.healTargets})),bodies:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,owner:u.owner,tier:u.enemyTier,hp:u.hp,maxHp:u.maxHp,shield:u.shield,temporary:u.temporary,summon:u.summonKind})),projections:w.starship.projections.size,burnZones:w.starship.burnZones.length},controllerEvents:controller?.events??[]});
 const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
 const prepare=async()=>{freeze();w.changed();await readiness.prepare('reinforcement');if(readiness.state.phase==='error')throw Error(readiness.state.error??'Assets failed');await v.waitForPendingAssets();v.render(0,1);hud.update();};
 const fast=async(options:{ticks?:number;untilStageElapsed?:number;untilCombat?:boolean;untilReward?:boolean;maxTicks?:number;renderEvery?:number})=>{
  freeze();const start=w.tick,eventStart=w.visualSerial,limit=options.maxTicks??options.ticks??18000,renderEvery=options.renderEvery??12;
  for(let n=0;n<limit;n++){
   if(w.phase!=='battle')break;
   if(!controller&&w.requiresPlayerDecision){const build=BUILDS.find(b=>b.race===w.expedition.race)!;const resolver=createCampaignController(w,build,undefined,{advanceIntermission:false});resolver.decisions();trace.push({kind:'diagnostic-required-decision',events:resolver.events,time:w.time});if(w.requiresPlayerDecision)throw Error('Unresolved diagnostic decision');}
   if(options.ticks!==undefined&&w.tick-start>=options.ticks||options.untilStageElapsed!==undefined&&w.stageElapsed>=options.untilStageElapsed||options.untilCombat&&w.visualEvents.some(e=>e.serial>eventStart&&['attack','storm-start','bile-impact','projectile-impact'].includes(e.kind)))break;
   const previousTick=w.tick;w.step();if(w.tick===previousTick&&w.phase==='battle')throw Error('Fixed-step preparation stopped at '+w.time);if(n%renderEvery===renderEvery-1){v.prepareRosterAssets();await v.waitForPendingAssets();v.render(0,1);await frame();}
  }
  v.prepareRosterAssets();await v.waitForPendingAssets();v.render(0,1);hud.update();const row={startTick:start,endTick:w.tick,options,state:state()};trace.push(row);return row;
 };
 const initCampaign=()=>{caseName='normal-'+w.expedition.race;setDiagnosticHealthLock(w,false);const id=w.expedition.race==='terran'?'bio':w.expedition.race==='zerg'?'entrench':'shield';controller=createCampaignController(w,BUILDS.find(b=>b.id===id)!,undefined,{advanceIntermission:false});controller.initialize();nextThink=0;return checkpoint();};
 const nextStage=async()=>{freeze();if(w.phase!=='reward')throw Error('Expected native intermission');controller!.intermission();if(!w.finishIntermission())throw Error('Native intermission refused');await prepare();return checkpoint();};
 const startMeasure=(instrumented:boolean,live:boolean)=>{if(live)play();else freeze();detail=instrumented;last=0;frames=[];gpu=[];cpu={};draw=[];disjoint=0;events={};models=new Set();peak={};uploads={floatTextureCalls:0,floatTextureBytes:0,bufferCalls:0,bufferBytes:0};v.renderer.info.autoReset=!detail;active=true;return state();};
 const stopMeasure=()=>{const after=state();if(detail)poll();active=false;const pendingQueries=pending.length;for(const p of pending)gl.deleteQuery(p.q);pending=[];v.renderer.info.autoReset=true;const metrics={frames,gpu,cpu,draw,uploads,disjoint,pendingQueries,events,models:[...models],peak};freeze();return {after,metrics,afterFreeze:state()};};
 const device=()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:devicePixelRatio,timerQuery:!!ext,quality:['sc2.renderQuality','sc2.ordinaryEffects','sc2.heroEffects','sc2.animationMode'].map(k=>[k,localStorage.getItem(k)])};};
 const fixtures=installB02Fixtures(app,{freeze,prepare,fast,setCase:(name:string)=>{caseName=name;controller=null;},checkpoint});
 (window as any).__B02__={...app,freeze,play,fast,prepare,state,snapshot,checkpoint,initCampaign,nextStage,startMeasure,stopMeasure,device,fixtures,trace:()=>trace};
}
