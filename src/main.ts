import './ui/sc2-battle.css';
import {configureMapAssets,loadMapDefinition} from './render/terrain/original-map';
import {MapTerrain} from './simulation/movement/map-terrain';
import {World} from './simulation/world';
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
async function boot(){configureMapAssets();const definition=await loadMapDefinition(),world=new World({terrain:new MapTerrain(definition)});const view=new BattleRenderer(canvas,world),hud=new HUD(world,view),audio=new AudioEffects();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause(),{canvas,pick:(x,y,touch)=>view.pick(x,y,touch)});hud.inputReset=()=>{input.keys.clear();input.release();};hud.onStart=()=>void audio.start();
 const gamepad=new GamepadInput(world,b=>{const p=view.screen(b);return p.x>=0&&p.y>=0&&p.x<=canvas.clientWidth&&p.y<=canvas.clientHeight;},()=>hud.pause(),()=>{input.keys.clear();input.release();});
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 // Reserve up to 12 ms for fixed-step catch-up; debt is retained and frame work remains bounded.
 const driver=new FixedStepper(TUNING.step,()=>{world.step();return world.phase==='battle'&&!world.paused&&!world.requiresEliteChoice&&!view.assetsPending;},()=>performance.now(),12);
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,time:world.time,stats:{...world.stats},assetsReady:hud.ready,simulationBacklogSeconds:driver.accumulator,audio:audio.report(),gamepad:gamepad.report()});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now(),wasSimulating=false;
 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){view.prepareRosterAssets();input.poll();gamepad.poll(now);let alpha=1;const simulating=world.phase==='battle'&&!world.paused&&!world.requiresEliteChoice&&!view.assetsPending;if(simulating&&wasSimulating)alpha=driver.advance(elapsed*(debug?.speed??1));else driver.reset();wasSimulating=simulating;
   view.render(elapsed,alpha);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();driver.reset();if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();}});
 await view.load(label=>hud.setLoading(label));hud.finishLoading();
}
boot().catch(error=>{document.querySelector('#interface')!.innerHTML=`<section class="boot-error"><h1>战场载入失败</h1><p>${String(error)}</p><p>请使用支持 WebGL 2 的浏览器。</p></section>`;console.error(error);});
