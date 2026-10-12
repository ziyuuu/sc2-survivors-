import * as THREE from 'three';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {configurePlatformAssetUrl} from '../../src/assets/manifest';
import {checksum,encodeGraph} from '../../src/persistence/graph-codec';
import {scenario,prepareTargets,prepareCastTargets,activateMode,resolveActors,destroyActors,type Scenario} from '../visual-plan-validation-20261009/scenario';
import {groups,modeGroups,enemyGroups,densityGroups,actorGroups,identities,themes,type Group} from '../visual-plan-validation-20261009/catalog';
import {captureBattleView} from '../../src/render/input/battle-view';
import {FixedStepper} from '../../src/simulation/fixed-stepper';

const canvas=document.querySelector<HTMLCanvasElement>('#battle')!,errors:string[]=[];let s:Scenario,r:BattleRenderer,build:unknown,initial:any,profile='';
let observed={events:new Map<number,unknown>(),models:new Set<string>(),routes:new Set<string>(),maxParticles:0,maxMeshes:0,maxDropped:0};
function observe(){for(const e of s.world.visualEvents)observed.events.set(e.serial,structuredClone(e));const source=(r as any).sourceCombatEffects?.report();if(source){for(const route of source.routes)observed.routes.add(route);for(const row of source.source.modelDraws??[])if(row.meshes+row.particles+row.ribbons+row.projections>0)observed.models.add(row.model);observed.maxParticles=Math.max(observed.maxParticles,source.source.particles);observed.maxMeshes=Math.max(observed.maxMeshes,source.source.meshes);observed.maxDropped=Math.max(observed.maxDropped,...source.source.batches.map((b:any)=>b.dropped));}}
function audit(){return {events:[...observed.events.values()],models:[...observed.models].sort(),routes:[...observed.routes].sort(),maxParticles:observed.maxParticles,maxMeshes:observed.maxMeshes,maxDropped:observed.maxDropped};}
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const state=()=>checksum(JSON.stringify(encodeGraph({run:s.world.captureRun(),profile:s.world.permanentProfile.exportJSON()})));
const allGroups=[...groups,...modeGroups,...enemyGroups,...densityGroups,...actorGroups];
function stateHashes(){const run=s.world.captureRun(),normalized=structuredClone(run);normalized.state.notice='';normalized.state.noticeUntil=0;return {world:checksum(JSON.stringify(encodeGraph(run))),profile:checksum(s.world.permanentProfile.exportJSON()),rng:run.state.rngState,normalizedNotice:checksum(JSON.stringify(encodeGraph(normalized)))};}
function report(){const runtime=r?.report();return {build,group:s?.group.id,theme:s?.theme,state:s?state():null,time:s?.world.time,tick:s?.world.tick,subjects:s?.subjects.map(({identity,entity})=>{const u=s.world.entities.get(entity.id)??entity;return {identity:identity.id,id:u.id,hp:u.hp,shield:u.shield,x:u.x,z:u.z,flying:u.flying,mode:u.nativeMode,tankMode:u.mode,weapon:u.activeWeapon,shots:u.shotSequence,action:u.action};}),events:s?.world.visualEvents,flights:s?.world.weaponFlights.map(f=>({id:f.id,source:f.source.id,unitType:f.source.unitType,weapon:f.source.activeWeapon,hop:f.hop,start:f.start,point:f.point})),runtime,errors:[...errors,...runtime?.errors??[]]};}
function draw(){const before=state();r.render(0,1);if(state()!==before)throw Error('Renderer mutated native World/Profile/RNG');return {...report(),stateHashes:stateHashes()};}
async function settle(){r.prepareRosterAssets();for(const u of s.world.entities.values())if(u.hp>0)await r.ensureUnitVariant(u.modelKey??u.unitType,u.unitType);await r.prepareCurrentAssets();if(s.group.actors)await r.prepareEndlessAssets();await r.waitForPendingAssets();for(let n=0;n<2;n++){draw();await frame();}if(report().errors.length)throw Error(JSON.stringify(report().errors));}
async function load(id='marine',theme:typeof themes[number]='industrial'){
 document.body.dataset.ready='false';const group=allGroups.find(g=>g.id===id)??{id,name:id,race:identities.find(i=>i.id===id)!.race,identities:[identities.find(i=>i.id===id)!]} as Group,next=scenario(group,theme,5);next.world.runId='combat-effects:'+id+':'+theme;
 for(const u of next.world.entities.values())u.stoppedUntil=u.nextShotAt=u.specialReady=1e9;
 if(!r){s=next;r=new BattleRenderer(canvas,s.world);await r.load(text=>document.querySelector('#status')!.textContent=text,group.race);}
 else{const world=s.world;world.permanentProfile.importJSON(next.world.permanentProfile.exportJSON());world.restoreRun(next.world.captureRun());s={...next,world,subjects:next.subjects.map(x=>({...x,entity:world.entities.get(x.entity.id)!}))};r.resetRun();await r.prepareCampaignAssets(world.captureRun().config.campaignMap!);}
 r.setCameraMode('fixed');r.setCameraShake(false);r.setCameraPitch(50);r.setCameraZoom(1);(r as any).cameraTarget.set(s.world.anchor.x,r.ground(s.world.anchor),s.world.anchor.z);await settle();initial=structuredClone(s.world.captureRun());profile=s.world.permanentProfile.exportJSON();observed={events:new Map(),models:new Set(),routes:new Set(),maxParticles:0,maxMeshes:0,maxDropped:0};document.body.dataset.ready='true';return draw();
}
async function ticks(count:number,renderEvery=1){s.world.paused=false;for(let n=0;n<count;n++){s.world.step();if(renderEvery&&n%renderEvery===0){r.render(1/60,1);observe();}if(renderEvery&&n%24===23)await frame();}s.world.paused=true;return draw();}
async function combat(){prepareTargets(s);if(s.subjects.some(({entity:u})=>u.unitType==='high_templar'))s.world.expedition.tech.storm=1;for(const {entity:u}of s.subjects)u.stoppedUntil=u.nextShotAt=u.specialReady=0;await settle();return draw();}
async function weaponCase(family:string,plane:'ground'|'air',surface:'flesh'|'armor'|'shield',distance=3,modeValue?:string){
 await load(family);await ticks(300,0);const w=s.world;
 if(modeValue){w.paused=false;if(!w.setFamilyMode(family as any,modeValue as any))throw Error('Native branch mode rejected');w.paused=true;await ticks(120,0);}
 for(const {entity:u}of s.subjects){
  const type=plane==='air'?(surface==='armor'?'viking':'mutalisk'):surface==='armor'?'tank':'roach',near={x:u.x,z:u.z-distance},p=w.freePosition(type,near,0,2)??near,t=w.addUnit(type,u.owner==='terran'?'zerg':'terran',p.x,p.z);t.hp=t.maxHp=2e6;t.shield=t.maxShield=surface==='shield'?2e6:0;t.shieldRegen=0;t.moveSpeed=0;t.nextShotAt=t.specialReady=t.stoppedUntil=1e9;u.moveSpeed=0;u.stoppedUntil=u.nextShotAt=u.specialReady=0;
 }
 w.hash.rebuild(w.entities.values());await settle();return draw();
}
/** Additional native targets expose rare source layers; no visual events are fabricated. */
async function witnessCase(kind:'mutalisk-third'|'guardian-hit'|'bile-flight'){
 const family=kind==='mutalisk-third'?'mutalisk':kind==='guardian-hit'?'sentry':'ravager';await load(family);await ticks(300,0);await combat();const w=s.world;
 for(const {entity:u}of s.subjects){u.moveSpeed=0;
  if(kind==='mutalisk-third'){const near={x:u.x+3.8,z:u.z-2.7},p=w.freePosition('roach',near,0,2)??near,t=w.addUnit('roach','zerg',p.x,p.z);t.hp=t.maxHp=2e6;t.shield=t.maxShield=0;t.moveSpeed=0;t.stoppedUntil=t.nextShotAt=t.specialReady=1e9;}
  if(kind==='guardian-hit'){const near={x:u.x,z:u.z-4},p=w.freePosition('marine',near,0,2)??near,t=w.addUnit('marine','zerg',p.x,p.z);t.hp=t.maxHp=2e6;t.moveSpeed=0;t.stoppedUntil=t.nextShotAt=t.specialReady=0;}
 }
 w.hash.rebuild(w.entities.values());await settle();return draw();
}
async function cast(){prepareCastTargets(s);s.world.paused=false;const outcomes=s.subjects.filter(x=>x.identity.hero).map(x=>({hero:x.identity.hero,accepted:s.world.castHero(x.identity.hero!,captureBattleView(canvas,r.camera))}));s.world.paused=true;await settle();return {outcomes,...draw()};}
async function mode(){s.world.paused=false;const outcome=activateMode(s);s.world.paused=true;await ticks(90);return {outcome,...draw()};}
async function reset(){s.world.permanentProfile.importJSON(profile);s.world.restoreRun(structuredClone(initial));s.subjects=s.subjects.map(x=>({...x,entity:s.world.entities.get(x.entity.id)!}));r.resetRun();await settle();return draw();}
async function reload(){const before=state();s.world.restoreRun(structuredClone(s.world.captureRun()));s.subjects=s.subjects.flatMap(x=>{const entity=s.world.entities.get(x.entity.id);return entity?[{...x,entity}]:[];});r.resetRun();await settle();if(state()!==before)throw Error('Native save restore changed');return draw();}
async function kill(index=0){const u=s.subjects[index].entity;s.world.hit(u,1e9,[],1,u.owner==='terran'?'zerg':'terran');await settle();return draw();}
async function killAll(){for(const {entity:u}of s.subjects)if(u.hp>0)s.world.hit(u,1e9,[],1,u.owner==='terran'?'zerg':'terran');await settle();return draw();}
function controls(pitch=50,zoom=1,health:'hidden'|'always'|'needed'='needed'){r.setCameraPitch(pitch);r.setCameraZoom(zoom);r.setHealthBarMode(health);r.render(.3,1);return draw();}
function focus(index=0){const u=s.subjects[index].entity;s.world.anchor.x=u.x;s.world.anchor.z=u.z;(r as any).cameraTarget.set(u.x,r.ground(u),u.z);return controls(50,1.8);}
async function sample(models:string[],age:number,seed=1){draw();const p=(r as any).sourceCombatEffects?.player;if(!p)throw Error('Source effects unavailable in this build');p.begin(s.world.time);models.forEach((model,n)=>{const x=(n%4-1.5)*7,z=(Math.floor(n/4)-1)*7,y=r.ground({x,z});p.add({model,key:'sample:'+model,age,seed,placement:{x,y,z,facing:Math.PI,end:{x:x+2,y:y+1,z:z-5}},loop:false,hostedBeam:true},(at:any)=>r.ground(at));});p.end();(r as any).heroComposer.render(0);await frame();return {state:state(),source:p.report(),errors:[...errors]};}
async function inspectSource(model:string,age:number,materialIndex?:number){
 await sample([model],age,17);const p=(r as any).sourceCombatEffects.player,rows:any[]=[];
 for(const [key,b]of p.batches){if(!key.startsWith(model+':'))continue;b.mesh.visible=materialIndex===undefined||key===model+':'+materialIndex;rows.push({key,visible:b.mesh.visible,count:b.mesh.count,blend:b.surface.material.blending,quads:b.quads.map((q:any)=>({color:q.color,uv:q.uv,phase:q.phase.clip.name,seconds:q.phase.seconds})),uniforms:[...b.surface.data.slice(0,8)]});}
 (r as any).heroComposer.render(0);await frame();return {model,age,materialIndex,rows,errors};
}
async function contextRestore(){const before=state(),gl=r.renderer.getContext(),extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('No WebGL lose extension');await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Actual WebGL restore event timeout')),30000);canvas.addEventListener('webglcontextrestored',()=>{clearTimeout(timer);resolve();},{once:true});canvas.addEventListener('webglcontextlost',()=>setTimeout(()=>extension.restoreContext(),200),{once:true});extension.loseContext();});await r.waitForPendingAssets();await settle();return {before,...draw()};}
function quality(value:'native'|'balanced'|'performance'){r.setQuality(value);return draw();}
function effectQuality(value:'full'|'balanced'|'low'){r.nonHeroEffects.setQuality(value);r.fx.setHeroQuality(value);return draw();}
function reorder(){s.world.entities=new Map([...s.world.entities].reverse());return draw();}
function offscreen(index=0){const u=s.subjects[index].entity;(r as any).cameraTarget.set(u.x+35,r.ground(u),u.z);return draw();}
async function actors(destroy=false){if(destroy)destroyActors(s);else resolveActors(s);await settle();return draw();}
async function nextFlight(){for(let n=0;n<240;n++){if(s.world.weaponFlights.length)return draw();await ticks(1);}throw Error('No native missile launched');}
async function flightEdge(kind:'source-death'|'target-death'|'lost-sight'){
 const f=s.world.weaponFlights[0];if(!f)throw Error('No native missile');const source=s.world.entities.get(f.source.id)!,target=s.world.entities.get(f.target)!;
 if(kind==='source-death')s.world.hit(source,1e9,[],1,source.owner==='terran'?'zerg':'terran');
 else if(kind==='target-death')s.world.hit(target,1e9,[],1,target.owner==='terran'?'zerg':'terran');
 else {const position=s.world.freePosition(target.unitType,{x:source.x+30,z:source.z+20},0,8);if(!position)throw Error('No legal hidden target position');target.x=position.x;target.z=position.z;target.prev={...position};}
 await settle();return draw();
}
function stopCombat(){for(const u of s.world.entities.values())u.stoppedUntil=u.nextShotAt=u.specialReady=1e9;return draw();}
async function realtime(seconds=20){
 const start=performance.now(),startTick=s.world.tick,timeline:unknown[]=[];let previous=start,nextSample=0;
 const stepper=new FixedStepper(1/60,()=>{if(s.world.paused||s.world.phase!=='battle'||s.world.requiresPlayerDecision)return false;s.world.step();return true;});s.world.paused=false;
 await new Promise<void>(resolve=>{const step=(now:number)=>{const dt=(now-previous)/1000;previous=now;const elapsed=(now-start)/1000;s.world.input={x:Math.sin(elapsed*.4)*.5,z:Math.cos(elapsed*.4)*.5};const alpha=stepper.advance(dt);r.render(dt,alpha);if(elapsed>=nextSample){timeline.push({wall:elapsed,time:s.world.time,tick:s.world.tick,visible:document.visibilityState,focus:document.hasFocus(),source:(r as any).sourceCombatEffects?.report()});nextSample+=1;}if(elapsed<seconds)requestAnimationFrame(step);else resolve();};requestAnimationFrame(step);});
 s.world.paused=true;s.world.resetDirectionalInput();return {wallSeconds:(performance.now()-start)/1000,ticks:s.world.tick-startTick,backlog:stepper.accumulator,discarded:stepper.discardedBacklogSeconds,timeline,report:draw()};
}
addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
(window as any).combatLab={load,draw,report,audit,ticks,combat,weaponCase,witnessCase,cast,mode,reset,reload,kill,killAll,controls,focus,sample,inspectSource,contextRestore,quality,effectQuality,reorder,offscreen,actors,nextFlight,flightEdge,stopCombat,realtime,catalog:()=>({groups:allGroups.map(g=>({id:g.id,race:g.race,identities:g.identities.map(i=>i.id)})),identities,themes})};
try{build=await(await fetch('./build.json')).json();const manifest=await(await fetch('./asset-manifest.json')).json();configurePlatformAssetUrl(id=>manifest.assets[id]?.url?'/'+manifest.assets[id].url:null);await load();}catch(e){errors.push(String(e));document.querySelector('#status')!.textContent='失败 '+e;document.body.dataset.ready='true';}
