import {World} from '../../simulation/world';
export class Input {
 keys=new Set<string>();stick={x:0,z:0};pointer:number|null=null;enabled=true;
 constructor(readonly world:World,readonly joystick:HTMLElement,readonly onPause:()=>void,readonly onProduction:()=>void){
  const reset=()=>{this.keys.clear();this.release();world.input={x:0,z:0};};
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const code=e.code;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();if(e.repeat)return;
   this.keys.add(code);if(code==='KeyE')world.stim();if(code==='Space')world.dash();if(code==='Escape')onPause();if(code==='KeyB')onProduction();
  });window.addEventListener('keyup',e=>this.keys.delete(e.code));
  joystick.addEventListener('contextmenu',e=>e.preventDefault());
  joystick.addEventListener('pointerdown',e=>{if(this.pointer!==null||world.phase!=='battle'||world.paused)return;e.preventDefault();this.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);this.updateStick(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.updateStick(e);}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if((e as PointerEvent).pointerId===this.pointer)this.release();});
 }
 updateStick(e:PointerEvent){const r=this.joystick.getBoundingClientRect(),radius=r.width*.32;let x=(e.clientX-r.left-r.width/2)/radius,z=(e.clientY-r.top-r.height/2)/radius;const m=Math.hypot(x,z);if(m>1){x/=m;z/=m;}this.stick={x,z};this.joystick.style.setProperty('--stick-x',`${x*radius}px`);this.joystick.style.setProperty('--stick-y',`${z*radius}px`);}
 release(){this.pointer=null;this.stick={x:0,z:0};this.joystick.style.setProperty('--stick-x','0px');this.joystick.style.setProperty('--stick-y','0px');}
 poll(){if(this.world.phase!=='battle'||this.world.paused){this.world.input={x:0,z:0};this.release();return;}this.world.input={x:this.stick.x+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0),z:this.stick.z+(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)};}
}
