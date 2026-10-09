import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {ASSETS,configurePlatformAssetUrl} from '../../src/assets/manifest';
import {RUNTIME_ASSETS} from '../../src/assets/runtime.generated';
import {checksum,encodeGraph} from '../../src/persistence/graph-codec';
import type {CombatUnitType} from '../../src/data/sc2-units';
import {createIndustrialStage} from './stage';
import {QualityView,DEFAULT_VIEW_HEIGHT} from './quality';
import {MaterialRepair} from './material-repair';
import {DECK_BLOCKERS,inspectDeck} from './scenario';
import {source,stamp as sourceStamp} from './sample-data';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';

const REVISION='r17';
const query=new URLSearchParams(location.search),race=query.get('roster')??'terran',look=query.get('look')??'restored';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T,canvas=el<HTMLCanvasElement>('battle');
const status=(s:string)=>{el('status').textContent=s;el('loadtext').textContent=s;};
const sampleAssets=new Map(RUNTIME_ASSETS.map(a=>[a.id,a]));
const standalone=!!document.getElementById('sc2-resource-pack');
if(!standalone)configurePlatformAssetUrl(id=>{const a=ASSETS.get(id)??sampleAssets.get(id);return a?.status==='available'?'/'+a.url.replace(/^\//,''):null;});
const errors:string[]=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
try{
 if(standalone){const ids=JSON.parse(el('sample-assets').textContent!) as string[];for(const id of ASSETS.keys())if(!ids.includes(id))ASSETS.delete(id);for(const id of ids){const record=sampleAssets.get(id);if(record)ASSETS.set(id,record);}await loadEmbeddedAssets();await prepareEmbeddedAssetIds(ids,(done,total)=>status(`准备原始模型 · ${done}/${total}`));}
 const world=new World({race:'terran',seed:10909,waves:false,sandbox:true,obstacles:DECK_BLOCKERS,terrain:new FlatTerrain()});world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];world.expedition.ledger=[];for(const p of Object.values(world.expedition.production))p.enabled={};
 world.anchor.x=0;world.anchor.z=-2;world.anchor.facing=Math.PI;world.paused=true;
 const unit=(type:CombatUnitType,x:number,z:number,owner:'terran'|'zerg'='terran')=>{const u=world.addUnit(type,owner,x,z);u.prev={x,z};u.facing=Math.PI;return u;};
 if(race==='terran'){
  for(let row=0;row<3;row++)for(let col=0;col<2;col++)unit('thor',-.6+col*3.2,-3.5+row*3.4);
  for(let row=0;row<5;row++)for(let col=0;col<4;col++)unit('marine',-6.2+col*.94,-3.3+row*1.45);
  for(let row=0;row<3;row++)for(let col=0;col<2;col++)unit('marauder',5.3+col*1.25,-2+row*2.0);
 }else if(race==='protoss'){
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)unit('immortal',-3.4+col*3.1,-3.5+row*3.6);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)unit('zealot',-6.5+col*.9,2+row*1.4);
 }else{
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)unit(col%2?'hydralisk':'roach',-4.5+col*2.2,-4+row*2.4);
  unit('ultralisk',4,3.8);unit('ultralisk',4,-1);
 }
 world.hash.rebuild(world.entities.values());
 const r=new BattleRenderer(canvas,world);await r.load(status,'terran',true);for(const u of world.entities.values())await r.ensureUnitVariant(u.unitType,u.unitType);await r.waitForPendingAssets();
 status('恢复原始材质与队伍色');const materials=new MaterialRepair(r,source as unknown as ConstructorParameters<typeof MaterialRepair>[1]);await materials.prepare();
 const stage=await createIndustrialStage(r.scene,status),quality=new QualityView(r,materials);quality.setMode(look);el<HTMLSelectElement>('look').value=look;el<HTMLSelectElement>('roster').value=race;
 const initial=structuredClone(world.captureRun()),profile=world.permanentProfile.exportJSON();let combatStarted=false,preparing=false,last=performance.now(),debt=0,discarded=0,ready=0,lastReport=0,boundaryViolations=0,frames:number[]=[],measure:null|{start:number;previous:number;frames:number[];submit:number[];draws:number[];gpu:number[];triangles:number[];state:string}=null;
 const gl=r.renderer.getContext() as WebGL2RenderingContext,timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),gpuInfo=gl.getExtension('WEBGL_debug_renderer_info'),pending:{query:WebGLQuery;id:number}[]=[];
 const hardware={renderer:gpuInfo?gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent};
 const measurements:unknown[]=[],checks:unknown[]=[];
 let queuedMove:{x:number;z:number}|null=null;
 const state=()=>checksum(JSON.stringify(encodeGraph({run:world.captureRun(),profile:world.permanentProfile.exportJSON()})));
 const report=()=>{el('report').textContent=JSON.stringify({revision:REVISION,sourceBaseline:'b50b47f',sourceStamp,hardware,race,paused:world.paused,phase:world.phase,time:world.time,entities:world.entities.size,living:[...world.entities.values()].filter(u=>u.hp>0).length,state:state(),scenario:inspectDeck(world),queuedMove,boundaryViolations,quality:quality.report(),materials:materials.report(),stage:stage.report(),runtime:r.report(),errors:[...errors,...r.modelErrors],checks,measurements,discardedSimulationSeconds:discarded,diagnostic:true,method:'Current World and original models. Authored industrial set with matching diagnostic deck blockers; not a new campaign map.'},null,2);};
 const percentile=(a:number[],p:number)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]??0,mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
 async function prepareBattle(){if(combatStarted)return;if(preparing)return;preparing=true;for(const id of ['play','reset','prepare','death','step','step60'])el<HTMLButtonElement>(id).disabled=true;
  try{status('准备交战模型…');for(const type of ['roach','hydralisk','zergling'] as const)await r.ensureUnitVariant(type,type);await materials.prepare();for(let i=0;i<17;i++){const u=unit(i%4===0?'hydralisk':i%3===0?'roach':'zergling',-6.5+(i%8)*1.65,-9.5-Math.floor(i/8)*1.9,'zerg');u.facing=0;}world.hash.rebuild(world.entities.values());combatStarted=true;status('交战已准备 · 暂停');}
  finally{preparing=false;for(const id of ['play','reset','prepare','death','step','step60'])el<HTMLButtonElement>(id).disabled=false;report();}
 }
 async function play(){if(preparing)return;if(world.phase!=='battle')reset();await prepareBattle();world.paused=!world.paused;el('play').textContent=world.paused?'继续交战':'暂停';status(world.paused?'已暂停':'交战中');report();}
 function reset(){if(preparing)return;world.permanentProfile.importJSON(profile);world.restoreRun(initial);world.paused=true;combatStarted=false;r.resetRun();materials.reset();quality.cameraTarget.set(0,0,-1);quality.height=DEFAULT_VIEW_HEIGHT;queuedMove=null;debt=0;boundaryViolations=0;el('play').textContent='开始交战';status('已重置');const sameRun=checksum(JSON.stringify(encodeGraph(world.captureRun())))===checksum(JSON.stringify(encodeGraph(initial)));checks.push({kind:'reset',sameRun,time:world.time,entities:world.entities.size});if(!sameRun)errors.push('Reset state differs from immutable initial fixture');report();}
 function stepWorld(){if(queuedMove){const accepted=world.issueMove(queuedMove);checks.push({kind:'queued-order-executed',accepted,...queuedMove});queuedMove=null;status(accepted?'编队移动':'移动指令无法执行');}world.step();boundaryViolations+=inspectDeck(world).blocked.length;if(world.phase!=='battle'){world.paused=true;el('play').textContent='重新演示';status('本段交战结束');}}
 el('play').addEventListener('click',()=>void play());el('reset').addEventListener('click',reset);
 el('clean').addEventListener('click',()=>{document.body.classList.toggle('clean');canvas.focus();});
 el('exitClean').addEventListener('click',()=>{document.body.classList.remove('clean');canvas.focus();});
 el<HTMLSelectElement>('look').addEventListener('change',()=>{const before=state();quality.setMode(el<HTMLSelectElement>('look').value);checks.push({kind:'look-switch',sameWorld:before===state(),mode:el<HTMLSelectElement>('look').value});report();});
 el<HTMLSelectElement>('roster').addEventListener('change',()=>{location.search=new URLSearchParams({roster:el<HTMLSelectElement>('roster').value,look:el<HTMLSelectElement>('look').value}).toString();});
 el('death').addEventListener('click',()=>{const u=[...world.entities.values()].find(u=>u.hp>0&&u.unitType===(race==='protoss'?'zealot':race==='zerg'?'hydralisk':'marine'));if(u){world.hit(u,1e7,[],1,'zerg');const paused=world.paused;world.paused=false;world.step();world.paused=paused;r.render(1/60,1);report();}});
 el('prepare').addEventListener('click',()=>void prepareBattle());
 el('barrier').addEventListener('click',()=>{const type=race==='protoss'?'immortal':race==='zerg'?'ultralisk':'thor',u=[...world.entities.values()].find(u=>u.hp>0&&u.unitType===type);if(u){world.hit(u,10,[],1,'zerg');checks.push({kind:'native-hit',id:u.id,type:u.unitType,barrier:u.barrier??0,hp:u.hp,time:world.time});report();}});
 for(const [id,count] of [['step2',2],['step',12],['step60',60]] as const)el(id).addEventListener('click',()=>{if(preparing)return;const paused=world.paused;world.paused=false;for(let i=0;i<count&&world.phase==='battle';i++){stepWorld();r.render(1/60,1);}world.paused=paused||world.phase!=='battle';report();});
 for(const id of ['specularAA','fxaa'])el(id).addEventListener('change',()=>{const before=state(),enabled=el<HTMLInputElement>(id).checked;if(id==='specularAA')materials.specularAA.value=enabled?1:0;else quality.fxaa.enabled=enabled;checks.push({kind:id,sameWorld:before===state(),enabled});report();});
 el('bench').addEventListener('click',()=>{measure={start:performance.now(),previous:0,frames:[],submit:[],draws:[],gpu:[],triangles:[],state:state()};status('测量中 · 10 秒');});
 el<HTMLInputElement>('ao').addEventListener('change',()=>{const before=state();quality.aoEnabled=el<HTMLInputElement>('ao').checked;checks.push({kind:'ao-switch',sameWorld:before===state(),enabled:quality.aoEnabled});report();});
 for(const id of ['shadow','msaa','bloom','environment','shadowSize','bloomScale'])el(id).addEventListener('change',()=>{const before=state();if(id==='shadow')quality.setShadows(el<HTMLInputElement>(id).checked);if(id==='msaa')quality.setMultisample(el<HTMLInputElement>(id).checked);if(id==='bloom')quality.bloom.enabled=el<HTMLInputElement>(id).checked;if(id==='environment')quality.setEnvironment(el<HTMLInputElement>(id).checked);if(id==='shadowSize')quality.setShadowResolution(Number(el<HTMLSelectElement>(id).value));if(id==='bloomScale')quality.setBloomScale(Number(el<HTMLSelectElement>(id).value));checks.push({kind:id,sameWorld:before===state()});report();});
 addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['SELECT','INPUT','BUTTON'].includes((e.target as HTMLElement).tagName)){e.preventDefault();void play();}if(e.code==='Escape')document.body.classList.remove('clean');});
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
 const moveAt=(x:number,y:number)=>{const rect=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),r.camera);if(ray.ray.intersectPlane(plane,point)&&Math.abs(point.x)<8&&Math.abs(point.z)<16&&world.phase==='battle'){const destination={x:point.x,z:point.z};if(world.paused){queuedMove=destination;checks.push({kind:'pointer-order-queued',...destination});status('移动指令已就绪 · 继续交战后执行');}else{const accepted=world.issueMove(destination);checks.push({kind:'pointer-order',accepted,...destination});status(accepted?'编队移动':'当前位置无法下达移动指令');}report();}};
 canvas.addEventListener('contextmenu',e=>{e.preventDefault();moveAt(e.clientX,e.clientY);});
 let drag:null|{x:number;y:number;target:THREE.Vector3}=null;
 canvas.addEventListener('pointerdown',e=>{if(e.button===0){canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,target:quality.cameraTarget.clone()};}});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const scale=quality.height/canvas.clientHeight,dx=(e.clientX-drag.x)*scale,dy=(e.clientY-drag.y)*scale;quality.cameraTarget.copy(drag.target).add(new THREE.Vector3(-dx*.91+dy*.46,0,dx*.42+dy*.99));});
 canvas.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)moveAt(e.clientX,e.clientY);drag=null;report();});canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();quality.height=THREE.MathUtils.clamp(quality.height*Math.exp(e.deltaY*.001),10,30);report();},{passive:false});
 r.renderer.info.autoReset=false;
 function frame(now:number){const elapsed=(now-last)/1000;last=now;frames.push(elapsed*1000);if(frames.length>180)frames.shift();
  if(!world.paused){const accepted=Math.min(.25,elapsed);discarded+=Math.max(0,elapsed-accepted);debt+=accepted;let steps=0;while(debt>=1/60&&steps<15&&!world.paused){stepWorld();debt-=1/60;steps++;}}else debt=0;
  if(timer)for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.query,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(timer.GPU_DISJOINT_EXT)&&measure?.start===p.id)measure.gpu.push(gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p.query);pending.splice(i,1);}}
  const q=measure&&timer&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(timer.TIME_ELAPSED_EXT,q);
  r.renderer.info.reset();const begin=performance.now();r.render(Math.min(.1,elapsed),1);const submit=performance.now()-begin;
  if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push({query:q,id:measure!.start});}
  if(measure){if(measure.previous)measure.frames.push(now-measure.previous);measure.previous=now;measure.submit.push(submit);measure.draws.push(r.renderer.info.render.calls);measure.triangles.push(r.renderer.info.render.triangles);if(now-measure.start>=10000){measurements.push({look:el<HTMLSelectElement>('look').value,quality:quality.report(),resolution:r.report().resolution,ao:quality.aoEnabled,paused:world.paused,stateBefore:measure.state,stateAfter:state(),seconds:(now-measure.start)/1000,frames:measure.frames.length,meanMs:mean(measure.frames),p95Ms:percentile(measure.frames,.95),p99Ms:percentile(measure.frames,.99),maxMs:Math.max(...measure.frames),over20:measure.frames.filter(f=>f>20).length/measure.frames.length,submitMs:mean(measure.submit),gpuAvailable:!!timer,gpuSamples:measure.gpu.length,gpuMeanMs:measure.gpu.length?mean(measure.gpu):null,draws:mean(measure.draws),triangles:mean(measure.triangles)});measure=null;status('测量完成');report();}}
  if(++ready===3){el('loading').style.display='none';document.body.dataset.ready='true';status('已就绪 · '+REVISION);report();}
  if(now-lastReport>1000){lastReport=now;el('stats').textContent=`${r.fps.toFixed(0)} FPS · ${r.renderer.info.render.calls} draws · ${world.time.toFixed(1)} s`;report();}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}catch(e){status(String(e));el('report').textContent=String(e);document.body.dataset.error=String(e);console.error(e);}
