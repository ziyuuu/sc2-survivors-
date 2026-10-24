import * as THREE from 'three';
import {SkillEffects} from '../src/render/effects/confirmed-hero/skill-effects';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {campaignTerrain} from '../src/data/campaign-map';
import {CharTerrain} from '../src/data/terrain';
import {World} from '../src/simulation/world';
import {newSupportMine,advanceTrackingMine} from '../src/simulation/combat/tracking-mines';
import {blocked,distance} from '../src/simulation/movement/steering';

const canvas=document.querySelector('canvas')!,renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setSize(800,600);renderer.setClearColor(0x101827);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101827);const camera=new THREE.PerspectiveCamera(40,4/3,.1,100);camera.position.set(0,8,16);camera.lookAt(0,1,0);
const world:any={time:0,entities:new Map(),terrain:undefined},view:any={scene,gpu:new Map(),fx:{emit:()=>{},heroQuality:'full',projectiles:{batches:new Map()}}};
const fx=new SkillEffects(view,world),gl=renderer.getContext(),uploads:{kind:string;bytes:number}[]=[];
for(const name of ['bufferData','bufferSubData'] as const){const native=(gl[name] as any).bind(gl);(gl as any)[name]=(...args:any[])=>{const data=args[name==='bufferData'?1:2];uploads.push({kind:name,bytes:typeof data==='number'?data:data?.byteLength??0});return native(...args);};}
function effect(mode:string){
 fx.reset();world.time=.2;
 if(mode!=='empty'){
  const count=mode==='growth'?300:1;
  (fx as any).casts=Array.from({length:count},(_,i)=>({hero:mode==='shield'?'swann':mode==='charge'?'nova':'raynor',source:{x:0,z:0},cast:{id:i},at:0,from:{x:-3,y:1+(i%10)*.03,z:0},point:{x:3,y:1,z:0},end:{x:3,y:1,z:0},targets:[1],nextTrail:100}));
  world.entities.set(1,{x:0,z:0,unitRadius:.8,heroCombat:{protectedUntil:10}});
 }
 uploads.length=0;fx.render();renderer.render(scene,camera);
 return {mode,uploads:[...uploads],active:fx.stats.active,meshes:[...(fx as any).batches].map(([key,b]:any)=>({key,count:b.mesh.count,capacity:b.mesh.instanceMatrix.count,matrixVersion:b.mesh.instanceMatrix.version,colorVersion:b.mesh.instanceColor.version})),pixels:canvas.toDataURL()};
}
function emptyFrames(n=120){uploads.length=0;const at=performance.now();for(let i=0;i<n;i++){fx.render();renderer.render(scene,camera);}return {frames:n,ms:performance.now()-at,uploads:[...uploads]};}
function mapCheck(recipe:any){
 const terrain=campaignTerrain(recipe),maps=new Map<any,any>([[terrain,{}]]),stub:any={world:{phase:'menu'},raceModels:()=>new Map(),commonAssetIds:()=>[],commonTasks:()=>[],mapViews:maps,contextEpoch:0};
 const job=BattleRenderer.prototype.backgroundJobs.call(stub,'terran',null,recipe).find((j:any)=>j.key.includes(':map:'))!;
 let reads=0;const heights=terrain.definition.heights,iterator=heights[Symbol.iterator];
 Object.defineProperty(heights,Symbol.iterator,{configurable:true,value:function*(){for(const value of iterator.call(this)){reads++;yield value;}}});
 try{
  const at=performance.now(),results=[];for(let i=0;i<200;i++)results.push(job.isReady!());const ms=performance.now()-at;
  maps.clear();const invalidated=job.isReady!();maps.set(terrain,{});const restored=job.isReady!();
  const scanReads=reads;const second=campaignTerrain(recipe);terrain.setStage(18);const isolated=second!==terrain&&second.stage===1;
  return {recipe,results:results.every(Boolean),reads:scanReads,ms,invalidated,restored,isolated};
 }finally{delete (heights as any)[Symbol.iterator];}
}
function mines(){
 const results=[];
 for(let repeat=0;repeat<3;repeat++){
  const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.terrain=campaignTerrain({version:3,seed:529,theme:'char'});w.terrain.setStage!(18);
  const f:any={id:100,x:2.2,z:1.6,hp:100,maxHp:100,armor:0,unitRadius:1.6,flying:false,attributes:[],owner:'terran',kind:'bunker',nextActionAt:1e9};w.fortifications.set(100,f);
  const target=w.addUnit('zergling','zerg',3.6,-1.2),m=newSupportMine(101,{x:0,z:0});let hit=false,legal=true,ticks=0;const trace=[];
  for(;ticks<360&&!hit;ticks++){w.time=ticks/60;const old={...m.point};hit=advanceTrackingMine(w,m,[target]);legal&&=distance(old,m.point)<=.100001&&w.terrain.canStep(old,m.point,.3)&&!blocked(m.point,.3,[{x:f.x,z:f.z,w:3.2,h:3.2}]);if(ticks%10===0)trace.push({...m.point});}
  results.push({repeat,hit,legal,ticks,point:m.point,trace});
 }
 return results;
}
function cacheProbe(){
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const terrain=new CharTerrain();w.terrain=terrain;
 const f:any={id:100,x:1,z:0,hp:100,maxHp:100,armor:0,unitRadius:.6,flying:false,attributes:[],owner:'terran',kind:'bunker',nextActionAt:1e9};w.fortifications.set(100,f);
 let calls=0;const native=terrain.walkLine.bind(terrain);terrain.walkLine=(...args)=>{calls++;return native(...args);};
 const target=w.addUnit('zergling','zerg',3,0),records=[];
 for(let i=0;i<31;i++){const m=newSupportMine(200+i,{x:0,z:0});m.phase='chasing';m.targetId=target.id;calls=0;const at=performance.now();advanceTrackingMine(w,m,[target]);records.push({calls,ms:performance.now()-at,point:m.point});}
 return records;
}
(window as any).__BATCH__={cacheProbe,effect,emptyFrames,mapCheck,mines,restore:async()=>{await new Promise<void>(resolve=>{canvas.addEventListener('webglcontextlost',()=>setTimeout(()=>renderer.forceContextRestore(),50),{once:true});canvas.addEventListener('webglcontextrestored',()=>resolve(),{once:true});renderer.forceContextLoss();});return effect('charge');},device:()=>({renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR)})};
effect('empty');
