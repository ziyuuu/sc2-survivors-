import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {readArchive} from '../../src/persistence/archive';
import {checksum,encodeGraph} from '../../src/persistence/graph-codec';
import {ASSETS,configurePlatformAssetUrl} from '../../src/assets/manifest';
import type {CampaignTheme} from '../../src/data/campaign-map';
import {SourceMaterialTrial,type SourceProfile} from './source-materials';
import {ShadowTrial,PoseAwareSSAOPass} from './shadows-ao';
import {LightingTrial} from './lighting';
const scenes=[['units-protoss-0','神族地面与英雄'],['units-protoss-1','神族大型与英雄'],['units-terran-0','人族地面与英雄'],['units-terran-1','人族大型与英雄'],['units-zerg-0','虫族地面与英雄'],['units-zerg-1','虫族大型与英雄'],['map-industrial','工业地形'],['map-mar-sara','玛萨拉地形'],['map-char','查尔地形'],['map-ice','冰封地形'],['map-frontier','矿场地形'],['immortal-idle','不朽者待机'],['immortal-active','不朽者真实受击护障'],['density-100','100目标密度'],['density-300','300目标密度']];
const query=new URLSearchParams(location.search),sceneId=query.get('scene')??scenes[0][0],initialMode=query.get('mode')??'A';
const sceneSelect=document.querySelector<HTMLSelectElement>('#scene')!,modeSelect=document.querySelector<HTMLSelectElement>('#mode')!,coverSelect=document.querySelector<HTMLSelectElement>('#cover')!,status=document.querySelector<HTMLElement>('#status')!,reportView=document.querySelector<HTMLElement>('#report')!,summary=document.querySelector<HTMLElement>('#summary')!;
sceneSelect.innerHTML=scenes.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');sceneSelect.value=sceneId;modeSelect.value=initialMode;
configurePlatformAssetUrl(id=>{const a=ASSETS.get(id);return a?.status==='available'?'/'+a.url.replace(/^\//,''):null;});
type Benchmark={id:number;start:number;previous:number;frames:number[];submit:number[];draws:number[];gpu:number[]};
const measurements:any[]=[],checks:any[]=[];let benchmark:Benchmark|null=null,benchmarkId=0;
const display=(data:unknown)=>reportView.textContent=JSON.stringify(data,null,2);
try{
 const profile=await(await fetch('./source-semantics.json')).json() as SourceProfile;
 const fixtureUrl='/reports/local/visual-restoration-20261006/fixtures/'+sceneId+'.json';const raw=await(await fetch(fixtureUrl)).text(),bundle=readArchive(raw).bundle,run=bundle.run!;
 const world=new World({race:run.config.race});world.permanentProfile.importJSON(bundle.profile);world.restoreRun(run);world.paused=true;
 const fingerprint=()=>checksum(JSON.stringify(encodeGraph({run:world.captureRun(),profile:world.permanentProfile.exportJSON()}))),baselineState=fingerprint();
 const r=new BattleRenderer(document.querySelector<HTMLCanvasElement>('#battle')!,world);await r.load(label=>status.textContent=label,run.config.race);await r.prepareCurrentAssets();for(const u of world.entities.values())if(u.hp>0)await r.ensureUnitVariant(u.modelKey??u.unitType,u.unitType);await r.waitForPendingAssets();
 const source=new SourceMaterialTrial(r,profile);await source.prepare();const shadow=new ShadowTrial(r),lighting=new LightingTrial(r,run.config.campaignMap!.theme as CampaignTheme,profile);
 const ao=new PoseAwareSSAOPass(r.scene,r.camera),target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});target.samples=[...world.entities.values()].some(u=>u.heroId)?0:4;
 const composer=new EffectComposer(r.renderer,target),bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,.8);composer.addPass(new RenderPass(r.scene,r.camera));composer.addPass(ao);composer.addPass(bloom);composer.addPass(new OutputPass());
 const privateRenderer=r as unknown as {renderScene:()=>void};const baselineDraw=privateRenderer.renderScene.bind(r);let aoEnabled=false,readyFrames=0,activeMode='A';let lastTime=performance.now(),composerSize='';
 const gl=r.renderer.getContext() as WebGL2RenderingContext,gpuTimer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending:{query:WebGLQuery;benchmarkId:number}[]=[];r.renderer.info.autoReset=false;
 const gpuInfo=gl.getExtension('WEBGL_debug_renderer_info');
 let fullReport:any={method:'Current BattleRenderer, immutable paused World and original resources. Source semantics, pose-correct shadow/depth/normal trial and source-informed lighting. No production game replacement or natural acceptance.',scene:sceneId,fixture:checksum(raw),source:profile.sourceSha256,entities:world.entities.size,hardware:{renderer:gpuInfo?gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:gpuInfo?gl.getParameter(gpuInfo.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION),userAgent:navigator.userAgent},checks,measurements};
 const report=()=>{fullReport={...fullReport,mode:activeMode,immutable:fingerprint()===baselineState,state:baselineState,resolution:r.report().resolution,sourceLayers:source.report(),shadow:shadow.report(),lighting:lighting.report(),ao:{enabled:aoEnabled,scale:.5,samples:16,strength:.45,poseNormals:true},errors:r.report().errors,checks,measurements};display(fullReport);};
 async function setMode(value:string){
  document.body.dataset.ready='false';status.textContent='准备 '+value;readyFrames=0;document.querySelector<HTMLButtonElement>('#bench')!.disabled=true;
  activeMode=value;source.setEnabled(value!=='A');shadow.setEnabled(['C','CAO','D','DP','E'].includes(value));aoEnabled=['CAO','E'].includes(value);lighting.setMode(value==='D'||value==='E'?'pbr':value==='DP'?'phong':'base');
  checks.push({mode:value,stateUnchanged:fingerprint()===baselineState});modeSelect.value=value;report();
 }
 privateRenderer.renderScene=()=>{
  source.update(world);shadow.beforeDraw();
  if(aoEnabled){const ratio=r.renderer.getPixelRatio(),width=r.canvas.clientWidth,height=r.canvas.clientHeight,size=[ratio,width,height].join(':');if(size!==composerSize){composer.setPixelRatio(ratio);composer.setSize(width,height);ao.setSize(Math.max(1,Math.round(width*ratio*.5)),Math.max(1,Math.round(height*ratio*.5)));composerSize=size;}bloom.enabled=[...world.entities.values()].some(u=>u.hp>0&&u.heroId);composer.render();}else baselineDraw();
 };
 function draw(now:number){
  const dt=Math.min(.1,(now-lastTime)/1000);lastTime=now;
  if(gpuTimer)for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.query,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(gpuTimer.GPU_DISJOINT_EXT)&&benchmark?.id===p.benchmarkId)benchmark.gpu.push(gl.getQueryParameter(p.query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p.query);pending.splice(i,1);}}
  const q=benchmark&&gpuTimer&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT,q);
  r.renderer.info.reset();const before=performance.now();r.render(dt,1);const submitted=performance.now()-before;if(q){gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);pending.push({query:q,benchmarkId:benchmark!.id});}
  if(benchmark){if(benchmark.previous)benchmark.frames.push(now-benchmark.previous);benchmark.previous=now;benchmark.submit.push(submitted);benchmark.draws.push(r.renderer.info.render.calls);if(now-benchmark.start>=10000){const percentile=(a:number[],p:number)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]??null,mean=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;measurements.push({mode:activeMode,scene:sceneId,seconds:(now-benchmark.start)/1000,frames:benchmark.frames.length,frameMeanMs:mean(benchmark.frames),frameP95Ms:percentile(benchmark.frames,.95),frameMaxMs:Math.max(...benchmark.frames),over20ms:benchmark.frames.filter(x=>x>20).length/benchmark.frames.length,submitMeanMs:mean(benchmark.submit),submitP95Ms:percentile(benchmark.submit,.95),gpuAvailable:!!gpuTimer,gpuSamples:benchmark.gpu.length,gpuMeanMs:mean(benchmark.gpu),drawsMean:mean(benchmark.draws),immutable:fingerprint()===baselineState});benchmark=null;report();status.textContent='测量完成 · '+activeMode;document.querySelector<HTMLButtonElement>('#bench')!.disabled=false;sceneSelect.disabled=modeSelect.disabled=coverSelect.disabled=false;}}
  if(++readyFrames===90){const ok=fingerprint()===baselineState;checks.push({mode:activeMode,ready:true,stateUnchanged:ok,errors:r.report().errors});document.body.dataset.ready='true';document.querySelector<HTMLButtonElement>('#bench')!.disabled=false;status.textContent=activeMode+' 已就绪 · 状态 '+(ok?'一致':'发生变化');summary.textContent='当前源码对照 · '+sceneSelect.selectedOptions[0].textContent+' · '+modeSelect.selectedOptions[0].textContent+' · 固定暂停诊断 · 原资源／规则未修改';report();}
  requestAnimationFrame(draw);
 }
 modeSelect.addEventListener('change',()=>{void setMode(modeSelect.value);});sceneSelect.addEventListener('change',()=>{const q=new URLSearchParams({scene:sceneSelect.value,mode:modeSelect.value});location.search=q.toString();});coverSelect.addEventListener('change',()=>{source.coverPreview=coverSelect.value as typeof source.coverPreview;source.previewTime=.083;report();});
 document.querySelector<HTMLButtonElement>('#bench')!.addEventListener('click',()=>{benchmark={id:++benchmarkId,start:performance.now(),previous:0,frames:[],submit:[],draws:[],gpu:[]};status.textContent='测量中 · '+activeMode;document.querySelector<HTMLButtonElement>('#bench')!.disabled=true;sceneSelect.disabled=modeSelect.disabled=coverSelect.disabled=true;});
 document.querySelector<HTMLButtonElement>('#export')!.addEventListener('click',()=>{report();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(fullReport,null,2)],{type:'application/json'}));a.download=`visual-restoration-${sceneId}-${activeMode}.json`;a.click();URL.revokeObjectURL(a.href);});
 await setMode(initialMode);requestAnimationFrame(draw);
}catch(error){status.textContent=String(error);document.body.dataset.error=String(error);display({error:String(error)});console.error(error);}
