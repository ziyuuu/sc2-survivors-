import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {campaignTerrain} from '../../src/data/campaign-map';
import {configurePlatformAssetUrl} from '../../src/assets/manifest';
import {checksum,encodeGraph} from '../../src/persistence/graph-codec';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import type {Race,CombatUnitType} from '../../src/data/races';
import type {CameraMode} from '../../src/render/scene/camera-controller';
const canvas=document.querySelector<HTMLCanvasElement>('#battle')!,errors:string[]=[];
const entryLane=new URLSearchParams(location.search).has('entry');
let world:World,view:BattleRenderer,foe:number|null=null,fixtureRace:Race='terran';
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));
const state=()=>checksum(JSON.stringify(encodeGraph({run:world.captureRun(),profile:world.permanentProfile.exportJSON()})));
function report(){return {state:state(),time:world.time,tick:world.tick,phase:world.phase,fixtureRace,runtime:view.report(),subjects:world.allies().map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,hp:u.hp,shield:u.shield,action:u.action})),errors:[...errors,...view.report().errors]};}
function draw(dt=0){const before=state();view.render(dt,1);if(before!==state())throw Error('Presentation changed native state');return report();}
async function setup(race:Race='terran',mode:CameraMode='cinematic',giant=false){
 fixtureRace=race;const next=new World({race,seed:529,waves:false,terrain:campaignTerrain({version:3,seed:529,theme:'industrial'})});if(!next.start())throw Error('Native start refused');
 for(const p of Object.values(next.expedition.production))p.enabled={};next.entities.clear();next.hive=null;next.economicTargets.clear();next.pods=[];next.pickups=[];next.rewardDrops=[];(next as any).eventPlan=[];(next as any).nextEvent=0;next.nextFreePodAt=next.nextEliteGrowthAt=next.nextMercenaryAt=next.nextTankSupportAt=1e9;
 const type:CombatUnitType=giant?'colossus':race==='terran'?'tank':race==='zerg'?'zergling':'zealot';
 const p=next.freePosition(type,{x:0,z:0},0,5);if(!p)throw Error('No legal native origin');const unit=next.addUnit(type,'terran',p.x,p.z);unit.stoppedUntil=0;next.anchor.x=p.x;next.anchor.z=p.z;
 let ep:ReturnType<World['freePosition']>=null;for(const distance of [21,18,15]){for(let i=0;i<8&&!ep;i++)ep=next.freePosition('roach',{x:p.x+Math.cos(i*Math.PI/4)*distance,z:p.z+Math.sin(i*Math.PI/4)*distance},0,4);if(ep)break;}if(!ep)throw Error('No legal enemy entry');const enemy=next.addUnit('roach','zerg',ep.x,ep.z);enemy.hp=enemy.maxHp=1e6;enemy.nextShotAt=enemy.specialReady=1e9;foe=enemy.id;
 next.hash.rebuild(next.entities.values());next.paused=true;next.runId='cinematic-fixture:'+race+':'+giant;
 if(!view){world=next;view=new BattleRenderer(canvas,world);view.entryPreparation=entryLane;await view.load(()=>{},race);}
 else{world.permanentProfile.importJSON(next.permanentProfile.exportJSON());world.restoreRun(next.captureRun());view.resetRun();}
 view.entryPreparation=entryLane;await view.prepareCurrentAssets();await view.prepareCampaignAssets(world.captureRun().config.campaignMap!);await view.waitForPendingAssets();await view.warmPresentationBatches();view.entryPreparation=false;
 view.setCameraPitch(50);view.setCameraZoom(1);view.setCameraMode(mode);view.setCameraShake(false);view.resize();(view as any).cameraTarget.set(world.anchor.x,(view as any).ground(world.anchor),world.anchor.z);draw();return report();
}
function command(seconds:number){if(seconds>=3&&seconds<7)world.input={x:1,z:0};else if(seconds>=7&&seconds<10)world.input={x:0,z:-1};else world.resetDirectionalInput();}
async function realtime(seconds=20){const start=performance.now(),startTick=world.tick,timeline:unknown[]=[];let previous=start,nextSample=0,removed=false;
 const stepper=new FixedStepper(1/60,()=>{if(world.paused||world.phase!=='battle'||world.requiresPlayerDecision)return false;world.step();return true;});world.paused=false;
 while(performance.now()-start<seconds*1000){await frame();const now=performance.now(),elapsed=(now-start)/1000,dt=(now-previous)/1000;previous=now;command(elapsed);
  if(elapsed>=13&&!removed){const e=world.entities.get(foe!);if(e)world.hit(e,1e9,[],1,'terran');removed=true;}
  const alpha=stepper.advance(dt);view.render(dt,alpha);if(elapsed>=nextSample){nextSample+=.1;timeline.push({wall:elapsed,time:world.time,tick:world.tick,anchor:{...world.anchor},camera:view.report().camera,subjects:world.allies().map(u=>({id:u.id,x:u.x,z:u.z,shot:u.shotSequence})),visible:document.visibilityState,focus:document.hasFocus()});}
 }
 const wallSeconds=(performance.now()-start)/1000;world.paused=true;world.resetDirectionalInput();return {wallSeconds,ticks:world.tick-startTick,backlog:stepper.accumulator,discarded:stepper.discardedBacklogSeconds,timeline,report:draw(),method:'Controlled current-schema fixture, native directional movement and FixedStepper. Enemy removal is an explicit native hit at 13s. No HUD in this diagnostic; actual HUD tested separately. Not natural campaign or FPS acceptance.'};
}
async function sequence(){const rows=[];world.paused=false;for(let tick=0;tick<1200;tick++){command(tick/60);if(tick===780){const e=world.entities.get(foe!);if(e)world.hit(e,1e9,[],1,'terran');}world.step();draw(1/60);if(tick%180===179){rows.push(report());await frame();}}world.paused=true;world.resetDirectionalInput();return rows;}
async function restore(){const before=state(),snapshot=world.captureRun();world.restoreRun(snapshot);view.resetRun();const result=draw();if(state()!==before)throw Error('Native restore changed');return result;}
addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));addEventListener('resize',()=>{if(view){view.resize();draw();}});
(window as any).cinematicLab={setup,draw,report,realtime,sequence,restore};
try{const manifest=await(await fetch('./asset-manifest.json')).json();configurePlatformAssetUrl(id=>manifest.assets[id]?.url?'/'+manifest.assets[id].url:null);await setup();document.body.dataset.ready='true';}catch(e){errors.push(String(e));document.body.dataset.ready='error';document.querySelector('#report')!.textContent=String(e);}
