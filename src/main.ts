import {ControlSettings} from './ui/controls/settings';
import {loadEmbeddedAssets} from './assets/offline-pack';
import './ui/sc2-battle.css';
import {configureMapAssets,loadMapDefinition} from './render/terrain/original-map';
import {MapTerrain} from './simulation/movement/map-terrain';
import {World} from './simulation/world';
import {TalentProfile} from './simulation/progression/talent-profile';
import {FixedStepper} from './simulation/fixed-stepper';
import {TUNING} from './data/game';
import {BattleRenderer} from './render/scene/battle-renderer';
import {HUD} from './ui/hud';
import {GamepadInput} from './ui/gamepad/controller';
import {Input} from './ui/mobile/input';
import {installDebug} from './diagnostics/debug';
import {AudioEffects} from './render/effects/audio';

const canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
canvas.addEventListener('contextmenu',event=>event.preventDefault());
async function boot(){await loadEmbeddedAssets();configureMapAssets();let storage:Storage|undefined;try{storage=localStorage;}catch{}const definition=await loadMapDefinition(),endlessDefinition=await loadMapDefinition('acropolis').catch(()=>null),talentProfile=new TalentProfile(storage),world=new World({terrain:new MapTerrain(definition),endlessTerrain:endlessDefinition?new MapTerrain(endlessDefinition):undefined,talentProfile});const controls=new ControlSettings(storage);const view=new BattleRenderer(canvas,world),hud=new HUD(world,view,controls),audio=new AudioEffects();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause(),controls,{canvas,pick:(x,y,touch)=>view.pick(x,y,touch)});hud.inputReset=()=>input.reset();hud.onStart=()=>void audio.start();
 const gamepad=new GamepadInput(world,()=>hud.pause(),()=>input.reset());
 controls.listeners.add(()=>gamepad.reset());
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 // Reserve up to 12 ms for fixed-step catch-up; debt is retained and frame work remains bounded.
 const driver=new FixedStepper(TUNING.step,()=>{world.step();return world.phase==='battle'&&!world.paused&&!world.requiresEliteChoice&&!view.assetsPending;},()=>performance.now(),12);
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,endless:world.endless?{round:world.endless.round,elapsed:world.endlessElapsed,elites:world.endless.elites,bosses:world.endless.bosses}:null,time:world.time,stats:{...world.stats},assetsReady:hud.ready,simulationBacklogSeconds:driver.accumulator,audio:audio.report(),gamepad:gamepad.report(),controls:controls.report()});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now(),wasSimulating=false;
 hud.onRestart=()=>{
  input.reset();gamepad.reset();audio.reset();view.resetRun();driver.reset();
  wasSimulating=false;previous=performance.now();if(debug)debug.speed=1;
  world.resetRun();hud.root.querySelector<HTMLButtonElement>('[data-action=start]')?.focus();
 };

 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){view.prepareRosterAssets();input.poll();gamepad.poll(now);let alpha=1;const simulating=world.phase==='battle'&&!world.paused&&!world.requiresEliteChoice&&!view.assetsPending;if(simulating&&wasSimulating)alpha=driver.advance(elapsed*(debug?.speed??1));else driver.reset();wasSimulating=simulating;
   view.render(elapsed,alpha);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();driver.reset();if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();}});
 await view.load(label=>hud.setLoading(label));hud.finishLoading();
}
boot().catch(error=>{document.querySelector('#interface')!.innerHTML=`<section class="boot-error"><h1>战场载入失败</h1><p>${String(error)}</p><p>请使用支持 WebGL 2 的浏览器。</p></section>`;console.error(error);});
