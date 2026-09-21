import './ui/sc2-battle.css';
import {World} from './simulation/world';
import {FixedStepper} from './simulation/fixed-stepper';
import {TUNING} from './data/game';
import {BattleRenderer} from './render/scene/battle-renderer';
import {HUD} from './ui/hud';
import {Input} from './ui/mobile/input';
import {installDebug} from './diagnostics/debug';
import {AudioEffects} from './render/effects/audio';

const world=new World(),canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
canvas.addEventListener('contextmenu',event=>event.preventDefault());
async function boot(){const view=new BattleRenderer(canvas,world),hud=new HUD(world,view),audio=new AudioEffects();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause());hud.inputReset=()=>{input.keys.clear();input.release();};hud.onStart=()=>void audio.start();
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 const driver=new FixedStepper(TUNING.step,()=>{world.step();return world.phase==='battle'&&!world.paused;});
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,time:world.time,stats:{...world.stats},assetsReady:hud.ready,simulationBacklogSeconds:driver.accumulator,audio:audio.report()});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now();
 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){input.poll();let alpha=1;if(world.phase==='battle'&&!world.paused)alpha=driver.advance(elapsed*(debug?.speed??1));else driver.reset();
   view.render(elapsed,alpha);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();driver.reset();if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();}});
 await view.load(label=>hud.setLoading(label));hud.finishLoading();
}
boot().catch(error=>{document.querySelector('#interface')!.innerHTML=`<section class="boot-error"><h1>战场载入失败</h1><p>${String(error)}</p><p>请使用支持 WebGL 2 的浏览器。</p></section>`;console.error(error);});
