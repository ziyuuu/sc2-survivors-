import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {captureBattleView} from '../../src/render/input/battle-view';
import {configurePlatformAssetUrl} from '../../src/assets/manifest';
import {encodeGraph,checksum} from '../../src/persistence/graph-codec';
import {groups,densityGroups,themes,type Group} from '../visual-plan-validation-20261009/catalog';
import {scenario,prepareTargets,prepareCastTargets,type Scenario} from '../visual-plan-validation-20261009/scenario';
import {CandidateView} from '../visual-plan-validation-20261009/view';
import {EventCollector} from '../visual-plan-validation-20261009/events';
import {stats,validity} from './measurement';

const revision='visual-baseline-r2',el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const choices=[...densityGroups,...groups],modes=['baseline','lighting','shadow','contact','surface','atmosphere','composition','combined','fxaa','msaa4','direct','no-bloom'];
const groupSelect=el<HTMLSelectElement>('group'),themeSelect=el<HTMLSelectElement>('theme'),modeSelect=el<HTMLSelectElement>('mode');
groupSelect.innerHTML=choices.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');themeSelect.innerHTML=themes.map(x=>`<option>${x}</option>`).join('');modeSelect.innerHTML=modes.map(x=>`<option>${x}</option>`).join('');
const query=new URLSearchParams(location.search);groupSelect.value=query.get('group')??'density-terran-18';themeSelect.value=query.get('theme')??'industrial';
const canvas=el<HTMLCanvasElement>('battle'),collector=new EventCollector(),errors:string[]=[],history:any[]=[];
let manifest:any,build:any,s:Scenario,r:BattleRenderer,view:CandidateView,initial:ReturnType<Scenario['world']['captureRun']>,initialProfile='',busy=true,active:Sample|null=null,sequence=0,previous=performance.now(),debt=0,discarded=0,preparation:any;
type Sample={id:number;live:boolean;start:number;seconds:number;previous:number;frames:number[];frameOffsets:number[];simulation:number[];collection:number[];submit:number[];cpuWork:number[];gpu:number[];draws:number[];triangles:number[];visibility:Set<string>;focused:Set<boolean>;gpuDisjoint:number;pendingAssets:number;initialState:string;startTick:number;startTime:number;startDebt:number;startDiscarded:number;startHeap:number|null;maxHeap:number|null;phaseComplete:boolean;longTasks:{at:number;ms:number}[]};
let gl:WebGL2RenderingContext,timer:any,pending:{query:WebGLQuery;id:number}[]=[];
const state=()=>checksum(JSON.stringify(encodeGraph({run:s.world.captureRun(),profile:s.world.permanentProfile.exportJSON()})));
const heap=()=>((performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize)??null;
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const status=(value:string)=>{el('status').textContent=value;};
function controls(value:boolean){busy=value;document.body.dataset.ready=String(!value);for(const item of document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select'))item.disabled=value;}
addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));canvas.addEventListener('webglcontextlost',()=>errors.push('WebGL context lost'));
new PerformanceObserver(list=>{if(active)for(const e of list.getEntries())if(e.startTime>=active.start)active.longTasks.push({at:e.startTime-active.start,ms:e.duration});}).observe({entryTypes:['longtask']});
function hardware(){const ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,browser:navigator.userAgent,gpuTimerSupported:!!timer,visibility:document.visibilityState,focused:document.hasFocus()};}
function subjects(){return s.subjects.map(x=>{const u=s.world.entities.get(x.entity.id)??x.entity;return {identity:x.identity.id,entityId:u.id,model:u.modelKey??u.unitType,hp:u.hp,shots:u.shotSequence??0,x:u.x,z:u.z,barrier:u.barrier??0,loaded:r.gpu.has(u.modelKey??u.unitType)};});}
function report(){if(!r)return;const q={revision,build,sequence,ready:!busy,group:s.group.id,theme:s.theme,mode:view.mode,state:state(),tick:s.world.tick,time:s.world.time,phase:s.world.phase,resolution:r.report().resolution,hardware:hardware(),preparation,subjects:subjects(),runtime:r.report(),events:{count:collector.lastSerial,retained:collector.history.length},latest:history.at(-1)??null,measurements:history.length,errors:[...errors,...r.report().errors],method:'Current production renderer in a compiled scene-only diagnostic. Synthetic 18/48/96 cohorts and high-health targets, fixed camera; no HUD or natural campaign acceptance. Original candidates are screening experiments, not integrated repairs.'};el('report').textContent=JSON.stringify(q);el('summary').textContent=`${s.group.id} · ${s.theme} · ${view.mode} · ${history.length} 条`;}
async function assets(){r.prepareRosterAssets();for(const u of s.world.entities.values())if(u.hp>0&&!r.gpu.has(u.modelKey??u.unitType))await r.ensureUnitVariant(u.modelKey??u.unitType,u.unitType);await r.prepareCurrentAssets();await r.waitForPendingAssets();}
function size(){r.setQuality('native');r.fx.heroQuality='full';r.renderer.setPixelRatio(1);r.renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);}
async function warm(count=60){for(let n=0;n<count;n++){r.render(0,1);await nextFrame();}await r.waitForPendingAssets();}
async function load(){
 controls(true);status('准备 '+groupSelect.value);const group=choices.find(x=>x.id===groupSelect.value)!;
 const next=scenario(group,themeSelect.value as typeof themes[number]);
 if(!r){s=next;r=new BattleRenderer(canvas,s.world);await r.load(status,group.race);view=new CandidateView(r);gl=r.renderer.getContext() as WebGL2RenderingContext;timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');r.renderer.info.autoReset=false;}
 else{const world=s.world;world.permanentProfile.importJSON(next.world.permanentProfile.exportJSON());world.restoreRun(next.world.captureRun());s={...next,world,subjects:next.subjects.map(x=>({...x,entity:world.entities.get(x.entity.id)!}))};r.resetRun();await r.prepareCampaignAssets(world.captureRun().config.campaignMap!);}
 collector.reset();prepareTargets(s);prepareCastTargets(s);await assets();size();view.height=group.density?30:20;view.set('baseline',s.theme);modeSelect.value='baseline';
 s.world.paused=false;const casts=s.subjects.filter(x=>x.identity.hero).map(x=>({id:x.identity.id,accepted:s.world.castHero(x.identity.hero!,captureBattleView(canvas,r.camera))}));
 for(let i=0;i<72;i++){s.world.step();collector.record(s.world.visualEvents);r.render(1/60,1);if(r.assetsPending)await r.waitForPendingAssets();if(i%6===5)await nextFrame();}
 s.world.paused=true;await assets();initial=structuredClone(s.world.captureRun());initialProfile=s.world.permanentProfile.exportJSON();preparation={ticks:72,casts,initialEntities:s.world.entities.size,syntheticCohort:group.density??null};debt=discarded=0;
 await warm();controls(false);sequence++;previous=performance.now();status('就绪');report();
}
async function restore(){controls(true);s.world.permanentProfile.importJSON(initialProfile);s.world.restoreRun(initial);s.subjects=s.subjects.map(x=>({...x,entity:s.world.entities.get(x.entity.id)!}));r.resetRun();collector.reset();await assets();size();view.set(modeSelect.value,s.theme);debt=discarded=0;await warm();controls(false);sequence++;previous=performance.now();status('已恢复同一起点');report();}
async function switchMode(){controls(true);const before=state();view.set(modeSelect.value,s.theme);await warm();if(state()!==before)throw Error('Candidate switch mutated World/Profile');controls(false);sequence++;status('对照就绪');report();}
function drainQueries(){
 if(!timer)return;const disjoint=gl.getParameter(timer.GPU_DISJOINT_EXT);
 if(disjoint){if(active)active.gpuDisjoint++;for(const p of pending)gl.deleteQuery(p.query);pending=[];return;}
 for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.query,gl.QUERY_RESULT_AVAILABLE)){if(active?.id===p.id)active.gpu.push(gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p.query);pending.splice(i,1);}}
}
function begin(live:boolean){
 if(busy)return;controls(true);document.body.dataset.measuring='true';const now=performance.now(),memory=heap();
 active={id:++sequence,live,start:now,seconds:Number(el<HTMLSelectElement>('seconds').value),previous:0,frames:[],frameOffsets:[],simulation:[],collection:[],submit:[],cpuWork:[],gpu:[],draws:[],triangles:[],visibility:new Set(),focused:new Set(),gpuDisjoint:0,pendingAssets:r.assetsPending,initialState:state(),startTick:s.world.tick,startTime:s.world.time,startDebt:debt,startDiscarded:discarded,startHeap:memory,maxHeap:memory,phaseComplete:true,longTasks:[]};
 s.world.paused=!live;previous=now;status(live?'连续交战计时中':'暂停图形计时中');
}
async function finish(now:number){
 const a=active!;active=null;s.world.paused=true;const endState=state(),runtime=r.report(),endTime=now;
 // Drain already submitted queries outside the wall-time window. No new render queries.
 for(let n=0;n<8&&pending.some(p=>p.id===a.id);n++){await nextFrame();if(timer&&gl.getParameter(timer.GPU_DISJOINT_EXT)){a.gpuDisjoint++;break;}for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.query,gl.QUERY_RESULT_AVAILABLE)){if(p.id===a.id)a.gpu.push(gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p.query);pending.splice(i,1);}}}
 for(const p of pending)gl.deleteQuery(p.query);pending=[];
 const seconds=(endTime-a.start)/1000,unchanged=endState===a.initialState;
 const result={id:a.id,group:s.group.id,theme:s.theme,mode:view.mode,live:a.live,seconds,targetSeconds:a.seconds,raw:{frames:a.frames,frameOffsets:a.frameOffsets,simulation:a.simulation,collection:a.collection,submit:a.submit,cpuWork:a.cpuWork,gpu:a.gpu,draws:a.draws,triangles:a.triangles,longTasks:a.longTasks},frame:stats(a.frames),simulation:stats(a.simulation),collector:stats(a.collection),submit:stats(a.submit),cpuWork:stats(a.cpuWork),gpu:stats(a.gpu),drawCalls:stats(a.draws),triangles:stats(a.triangles),visibility:[...a.visibility],focused:[...a.focused],gpuDisjoint:a.gpuDisjoint,pendingAssets:a.pendingAssets,initialState:a.initialState,endState,unchanged,startTick:a.startTick,endTick:s.world.tick,actualTicks:s.world.tick-a.startTick,combatSeconds:s.world.time-a.startTime,debt,discarded:discarded-a.startDiscarded,heap:{start:a.startHeap,max:a.maxHeap,end:heap()},runtime,validity:validity({seconds,targetSeconds:a.seconds,frames:a.frames,visibility:[...a.visibility],focused:[...a.focused],contextLost:gl.isContextLost(),errors:errors.length+runtime.errors.length,gpuSupported:!!timer,gpuDisjoint:a.gpuDisjoint,gpuSamples:a.gpu.length,pendingAssets:a.pendingAssets,live:a.live,unchanged,phaseComplete:a.phaseComplete,cpuWork:a.cpuWork,frameOffsets:a.frameOffsets,longTasks:a.longTasks})};
 history.push(result);document.body.dataset.measuring='false';controls(false);status(result.validity.timingValid?'测量完成':'测量完成 · 存在排除原因');report();
}
function frame(now:number){
 const dt=Math.max(0,(now-previous)/1000);previous=now;
 if(r&&(!busy||active)){
  const a=active,start=performance.now();let simulation=0,collection=0;
  if(a?.live){const accepted=Math.min(.25,dt);discarded+=Math.max(0,dt-accepted);debt+=accepted;let n=0;while(debt>=1/60&&n++<15){const at=performance.now();s.world.step();simulation+=performance.now()-at;const c=performance.now();collector.record(s.world.visualEvents);collection+=performance.now()-c;debt-=1/60;}if(s.world.phase!=='battle')a.phaseComplete=false;}
  drainQueries();const q=a&&timer&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(timer.TIME_ELAPSED_EXT,q);r.renderer.info.reset();const submitStart=performance.now();r.render(Math.min(.1,dt),1);const submit=performance.now()-submitStart;if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push({query:q,id:a!.id});}
  if(a){if(a.previous){a.frames.push(now-a.previous);a.frameOffsets.push(now-a.start);}a.previous=now;a.simulation.push(simulation);a.collection.push(collection);a.submit.push(submit);a.cpuWork.push(performance.now()-start);a.draws.push(r.renderer.info.render.calls);a.triangles.push(r.renderer.info.render.triangles);a.visibility.add(document.visibilityState);a.focused.add(document.hasFocus());a.pendingAssets=Math.max(a.pendingAssets,r.assetsPending);const memory=heap();if(memory!==null)a.maxHeap=Math.max(a.maxHeap??0,memory);if(now-a.start>=a.seconds*1000)void finish(now);}
 }
 requestAnimationFrame(frame);
}
async function action(fn:()=>Promise<void>){try{await fn();}catch(e){errors.push(String(e));controls(false);status('失败 '+String(e));report();}}
el('load').onclick=()=>void action(load);el('reset').onclick=()=>void action(restore);modeSelect.onchange=()=>void action(switchMode);el('paused').onclick=()=>begin(false);el('live').onclick=()=>begin(true);el('capture').onclick=()=>{r.render(0,1);sequence++;report();};
addEventListener('resize',()=>{if(r){if(active)errors.push('Resize during measurement');size();report();}});
try{build=await(await fetch('./build.json')).json();manifest=await(await fetch('./asset-manifest.json')).json();configurePlatformAssetUrl(id=>manifest.assets[id]?.url?'/'+manifest.assets[id].url:null);await load();requestAnimationFrame(frame);}catch(e){errors.push(String(e));controls(false);status('启动失败 '+String(e));el('report').textContent=JSON.stringify({errors});}
