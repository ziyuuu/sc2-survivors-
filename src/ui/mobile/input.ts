import {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {ControlSettings} from '../controls/settings';

type BattlePointer={canvas:HTMLCanvasElement;pick:(x:number,y:number,touch:boolean)=>{point:Point}|null};
export class Input {
 keys=new Set<string>();stick={x:0,z:0};pointer:number|null=null;
 private cancelTap=()=>{};
 reset(){this.cancelTap();this.keys.clear();this.release();this.world.input={x:0,z:0};}
 constructor(readonly world:World,readonly joystick:HTMLElement,readonly onPause:()=>void,readonly settings:ControlSettings,battle:BattlePointer){
  let tap:{id:number;x:number;y:number;at:number;cancelled:boolean}|null=null;
  const canvas=battle.canvas,canAct=()=>world.phase==='battle'&&!world.paused&&!world.requiresEliteChoice;
  this.cancelTap=()=>{const id=tap?.id;tap=null;if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
  window.addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  settings.listeners.add(()=>{this.reset();world.cancelOrder();});
  window.addEventListener('keydown',e=>{
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
   const code=e.code;if(code==='Escape'){if(!e.repeat)onPause();return;}
   if(!canAct())return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();if(e.repeat)return;
   this.keys.add(code);
   if(code==='Digit1')world.castHero('raynor');if(code==='Digit2')world.castHero('tychus');if(code==='Digit3')world.castHero('nova');
   if(code==='KeyT')world.toggleTanks();if(code==='KeyE')world.stim();if(code==='Space')world.dash();
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  const command=(e:PointerEvent)=>{
   if(!canAct()||!settings.pointerMoves(e.pointerType)||this.pointer!==null)return;
   const hit=battle.pick(e.clientX,e.clientY,e.pointerType!=='mouse');if(hit)world.issueMove(hit.point);
  };
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
   if(!canAct()||!settings.pointerMoves(e.pointerType))return;
   if(e.pointerType==='mouse'){if(e.button===2||e.button===0){e.preventDefault();command(e);}return;}
   if(tap){tap.cancelled=true;return;}if(!e.isPrimary||e.button!==0||this.pointer!==null)return;
   e.preventDefault();tap={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),cancelled:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12)tap.cancelled=true;});
  canvas.addEventListener('pointerup',e=>{if(tap?.id!==e.pointerId)return;const t=tap;tap=null;
   if(!t.cancelled&&performance.now()-t.at<450&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<=12)command(e);
   if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  });
  for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(tap?.id===(e as PointerEvent).pointerId)tap=null;});
  joystick.addEventListener('contextmenu',e=>e.preventDefault());
  joystick.addEventListener('pointerdown',e=>{if(settings.touch!=='joystick'||this.pointer!==null||!canAct())return;e.preventDefault();this.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);this.updateStick(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.updateStick(e);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if((e as PointerEvent).pointerId===this.pointer)this.release();});
 }
 updateStick(e:PointerEvent){const r=this.joystick.getBoundingClientRect(),radius=r.width*.32;let x=(e.clientX-r.left-r.width/2)/radius,z=(e.clientY-r.top-r.height/2)/radius;const m=Math.hypot(x,z);if(m>1){x/=m;z/=m;}this.stick={x,z};this.joystick.style.setProperty('--stick-x',`${x*radius}px`);this.joystick.style.setProperty('--stick-y',`${z*radius}px`);}
 release(){const id=this.pointer;this.pointer=null;if(id!==null&&this.joystick.hasPointerCapture(id))this.joystick.releasePointerCapture(id);this.stick={x:0,z:0};this.joystick.style.setProperty('--stick-x','0px');this.joystick.style.setProperty('--stick-y','0px');}
 poll(){
  if(this.world.phase!=='battle'||this.world.paused||this.world.requiresEliteChoice){this.reset();return;}
  const keyboard=this.settings.desktop==='keyboard';
  this.world.input={x:this.stick.x+(keyboard?Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft')):0),z:this.stick.z+(keyboard?Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp')):0)};
 }
}
