import './ui/sc2-battle.css';
import {World} from './simulation/world';
import {TUNING} from './data/game';
import {BattleRenderer} from './render/scene/battle-renderer';
import {HUD} from './ui/hud';
import {Input} from './ui/mobile/input';
import {installDebug} from './diagnostics/debug';
import {AudioEffects} from './render/effects/audio';

const world=new World(),canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
canvas.addEventListener('contextmenu',event=>event.preventDefault());
async function boot(){const view=new BattleRenderer(canvas,world),hud=new HUD(world,view),audio=new AudioEffects();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause(),()=>hud.toggleProduction());hud.inputReset=()=>{input.keys.clear();input.release();};hud.onStart=()=>void audio.start();
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,time:world.time,stats:{...world.stats},assetsReady:hud.ready});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now(),accumulator=0;
 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){input.poll();if(world.phase==='battle'&&!world.paused){accumulator+=elapsed*(debug?.speed??1);let steps=0;while(accumulator>=TUNING.step&&steps<120){world.step();accumulator-=TUNING.step;steps++;if(world.phase!=='battle'||world.paused){accumulator=0;break;}}}else accumulator=0;
   view.render(elapsed,world.phase==='battle'?Math.min(1,accumulator/TUNING.step):1);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();accumulator=0;if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();}});
 await view.load(label=>hud.setLoading(label));hud.finishLoading();
}
boot().catch(error=>{document.querySelector('#interface')!.innerHTML=`<section class="boot-error"><h1>战场载入失败</h1><p>${String(error)}</p><p>请使用支持 WebGL 2 的浏览器。</p></section>`;console.error(error);});
