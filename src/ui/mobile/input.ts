import {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
type BattlePointer={canvas:HTMLCanvasElement;pick:(x:number,y:number,touch:boolean)=>{point:Point;targetId?:number}|null};
export class Input {
 keys=new Set<string>();stick={x:0,z:0};pointer:number|null=null;enabled=true;
 constructor(readonly world:World,readonly joystick:HTMLElement,readonly onPause:()=>void,battle?:BattlePointer){
  let tap:{id:number;x:number;y:number;at:number;cancelled:boolean}|null=null;
  const reset=()=>{tap=null;this.keys.clear();this.release();world.input={x:0,z:0};};
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const code=e.code;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();if(e.repeat)return;
   this.keys.add(code);if(code==='Digit1')world.castHero('raynor');if(code==='Digit2')world.castHero('tychus');if(code==='Digit3')world.castHero('nova');if(code==='KeyT')world.toggleTanks();if(code==='KeyE')world.stim();if(code==='Space')world.dash();if(code==='Escape')onPause();
  });window.addEventListener('keyup',e=>this.keys.delete(e.code));
  if(battle){const canvas=battle.canvas;
   const command=(e:PointerEvent,targetOnly=false)=>{if(world.phase!=='battle'||world.paused||world.requiresEliteChoice||this.pointer!==null||Math.hypot(world.input.x,world.input.z)>.01)return;
    const hit=battle.pick(e.clientX,e.clientY,e.pointerType!=='mouse');if(!hit)return;
    if(hit.targetId!==undefined)world.issueFocus(hit.targetId);else if(!targetOnly)world.issueMove(hit.point);
   };
   canvas.addEventListener('contextmenu',e=>e.preventDefault());
   canvas.addEventListener('pointerdown',e=>{if(world.phase!=='battle'||world.paused||world.requiresEliteChoice)return;
    if(e.pointerType==='mouse'){if(e.button===2||e.button===0){e.preventDefault();command(e,e.button===0);}return;}
    if(tap){tap.cancelled=true;return;}if(!e.isPrimary||e.button!==0||this.pointer!==null)return;
    e.preventDefault();tap={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),cancelled:false};canvas.setPointerCapture(e.pointerId);
   });
   canvas.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12)tap.cancelled=true;});
   canvas.addEventListener('pointerup',e=>{if(tap?.id!==e.pointerId)return;const t=tap;tap=null;
    if(!t.cancelled&&performance.now()-t.at<450&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<=12)command(e);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
   });
   for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(tap?.id===(e as PointerEvent).pointerId)tap=null;});
  }
  joystick.addEventListener('contextmenu',e=>e.preventDefault());
  joystick.addEventListener('pointerdown',e=>{if(this.pointer!==null||world.phase!=='battle'||world.paused||world.requiresEliteChoice)return;e.preventDefault();this.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);this.updateStick(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.updateStick(e);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if((e as PointerEvent).pointerId===this.pointer)this.release();});
 }
 updateStick(e:PointerEvent){const r=this.joystick.getBoundingClientRect(),radius=r.width*.32;let x=(e.clientX-r.left-r.width/2)/radius,z=(e.clientY-r.top-r.height/2)/radius;const m=Math.hypot(x,z);if(m>1){x/=m;z/=m;}this.stick={x,z};this.joystick.style.setProperty('--stick-x',`${x*radius}px`);this.joystick.style.setProperty('--stick-y',`${z*radius}px`);}
 release(){this.pointer=null;this.stick={x:0,z:0};this.joystick.style.setProperty('--stick-x','0px');this.joystick.style.setProperty('--stick-y','0px');}
 poll(){if(this.world.phase!=='battle'||this.world.paused||this.world.requiresEliteChoice){this.world.input={x:0,z:0};this.release();return;}this.world.input={x:this.stick.x+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),z:this.stick.z+(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)};}
}
