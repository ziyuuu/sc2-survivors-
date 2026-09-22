import {World} from '../../simulation/world';
import type {Body} from '../../simulation/types';
import {PadState,STANDARD,validMapping,type PadMapping,type PadSnapshot,type ButtonBinding} from './state';
export class GamepadInput {
 active=false;private index:number|null=null;private states=new Map<number,PadState>();private armed=new Set<number>();private mappings:Record<string,PadMapping>={};private lastAcquire=-1;private calibrating=false;
 private dialog=document.createElement('section');private calibration:{id:string;step:number;mapping:PadMapping;rest:number[];waiting:boolean}|null=null;
 constructor(readonly world:World,readonly visible:(b:Body)=>boolean,readonly pause:()=>void,readonly onActive:()=>void){try{const saved=JSON.parse(localStorage.getItem('sc2.gamepads.v1')??'{}');for(const [k,v] of Object.entries(saved))if(validMapping(v))this.mappings[k]=v;}catch{}
  this.dialog.id='gamepad-calibration';this.dialog.hidden=true;document.body.append(this.dialog);
  window.addEventListener('blur',()=>this.suspend());window.addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===this.index)this.suspend();this.armed.delete(e.gamepad.index);this.states.delete(e.gamepad.index);});
  document.addEventListener('pointerdown',()=>this.direct(),true);document.addEventListener('keydown',e=>{if(e.code==='Escape'&&this.calibrating){this.closeCalibration();return;}this.direct();});
  document.addEventListener('click',e=>{if((e.target as HTMLElement).closest('[data-action="controller"]'))this.openCalibration();});
  this.dialog.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))this.closeCalibration();});
 }
 direct(){if(!this.active)return;this.armed.clear();this.states.clear();this.active=false;this.world.controllerCommand=false;this.world.input={x:0,z:0};this.world.cancelOrder();document.body.classList.remove('gamepad-active');}
 private suspend(){if(!this.active)return;this.world.input={x:0,z:0};this.armed.clear();this.states.clear();this.active=false;this.index=null;this.world.controllerCommand=false;document.body.classList.remove('gamepad-active');if(this.world.phase==='battle'){this.world.paused=true;this.world.changed();}}
 private select(p:PadSnapshot){this.active=true;this.index=p.index;this.world.controllerCommand=true;this.onActive();document.body.classList.add('gamepad-active');}
 poll(now=performance.now(),pads:readonly (PadSnapshot|null)[]=navigator.getGamepads?.()??[]){const connected=pads.filter((p):p is PadSnapshot=>!!p&&p.connected);if(this.active&&!connected.some(p=>p.index===this.index)){this.suspend();this.index=null;return;}
  if(this.calibrating){const p=connected.find(p=>p.id===this.calibration?.id)??connected[0];if(p)this.calibrate(p);return;}
  for(const p of connected){const mapping=this.mappings[p.id]??(p.mapping==='standard'?STANDARD:null);if(!mapping){if(p.buttons.some(b=>b.value>.55)){this.openCalibration(p);return;}continue;}
   let state=this.states.get(p.index);if(!state){state=new PadState();this.states.set(p.index,state);}const input=state.sample(p,mapping,now);
   if(!this.armed.has(p.index)){if(input.neutral){this.armed.add(p.index);state.reset();}continue;}
   if(input.meaningful&&!this.active||input.meaningful&&this.index!==p.index)this.select(p);
   if(!this.active||this.index!==p.index)continue;
   if(input.edges.has('pause')){this.pause();return;}
   const w=this.world;if(w.phase!=='battle'||w.paused||w.requiresEliteChoice){w.input={x:0,z:0};this.menu(input.menu,input.edges.has('confirm'),input.edges.has('back'));continue;}
   w.controllerCommand=true;w.input=input.move;
   for(const id of ['raynor','tychus','nova'] as const)if(input.edges.has(id))w.castHero(id);
   if(input.edges.has('confirm'))w.dash();if(input.edges.has('stim'))w.stim();if(input.edges.has('siege'))w.toggleTanks();
   if(input.edges.has('back')){w.cancelOrder();this.acquire();}
   if(input.edges.has('previous'))this.acquire(-1);else if(input.edges.has('next'))this.acquire(1);
   const target=w.order?.kind==='focus'?w.body(w.order.targetId):null;
   if(now-this.lastAcquire>180){this.lastAcquire=now;if(!target||target.hp<=0||!w.controllerTargetReachable(target))this.acquire();}
  }
 }
 private acquire(cycle=0){const w=this.world;const bodies:Body[]=[...w.entities.values(),...[...w.economicTargets.values()].filter(e=>e.status==='active'),...(w.hive?[w.hive]:[])];const all=bodies.filter(b=>b.owner==='zerg'&&b.hp>0&&this.visible(b)&&w.controllerTargetReachable(b));
  all.sort((a,b)=>Math.atan2(a.z-w.anchor.z,a.x-w.anchor.x)-Math.atan2(b.z-w.anchor.z,b.x-w.anchor.x)||a.id-b.id);
  let selected:Body|undefined;if(cycle){const order=w.order;const current=order?.kind==='focus'?all.findIndex(b=>b.id===order.targetId):-1;selected=all[(current<0?(cycle>0?0:all.length-1):(current+cycle+all.length)%all.length)];}
  else selected=[...all].sort((a,b)=>Number(w.economicTargets.has(a.id))-Number(w.economicTargets.has(b.id))||Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id)[0];
  if(selected)w.setControllerFocus(selected.id);else if(w.order?.kind==='focus')w.cancelOrder();
 }
 private menu(direction:string,confirm:boolean,back:boolean){const root=document.querySelector<HTMLElement>('#overlay');if(!root||root.hidden)return;const controls=[...root.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button:not(:disabled),select:not(:disabled)')].filter(e=>e.getClientRects().length);if(!controls.length)return;let i=controls.indexOf(document.activeElement as HTMLButtonElement),el=controls[Math.max(0,i)];
  if(back){(root.querySelector<HTMLButtonElement>('[data-action="skip"],[data-action="pause"]')??el).focus();return;}
  if(direction){if(el instanceof HTMLSelectElement&&['left','right'].includes(direction)){el.selectedIndex=(el.selectedIndex+(direction==='right'?1:el.options.length-1))%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));return;}i=(Math.max(0,i)+(['right','down'].includes(direction)?1:controls.length-1))%controls.length;el=controls[i];el.focus();el.scrollIntoView({block:'nearest'});}else if(i<0)el.focus();
  if(confirm){if(el instanceof HTMLSelectElement){el.selectedIndex=(el.selectedIndex+1)%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));}else el.click();}
 }
 openCalibration(p?:PadSnapshot){const pads=[...(navigator.getGamepads?.()??[])].filter((p):p is Gamepad=>!!p&&p.connected);p??=pads.find(p=>p.index===this.index)??pads[0];this.calibrating=true;this.dialog.hidden=false;if(this.world.phase==='battle'){this.world.paused=true;this.world.changed();}this.world.input={x:0,z:0};this.calibration=p?{id:p.id,step:0,mapping:structuredClone(STANDARD),rest:[...p.axes],waiting:true}:null;this.drawCalibration();}
 private drawCalibration(){const steps=['放开所有按键和摇杆','左摇杆向右推','左摇杆向下推','按下面键（确认 / 推进）','按右面键（返回 / 自动选敌）','按左面键（兴奋剂）','按上面键（全队架炮）','按菜单键（暂停）','按左扳机（上一个目标）','按右扳机（下一个目标）','按方向键上（雷诺技能）','按方向键左（泰凯斯技能）','按方向键右（诺娃技能）'];this.dialog.innerHTML=`<div class="console"><h2>手柄校准</h2><p>${this.calibration?steps[this.calibration.step]:'连接手柄后按任意键'}</p><p>每步完成后松开，再执行下一步。</p><button>取消 · 保留原设置</button></div>`;}
 private calibrate(p:PadSnapshot){if(!this.calibration){this.calibration={id:p.id,step:0,mapping:structuredClone(STANDARD),rest:[...p.axes],waiting:true};this.drawCalibration();}const c=this.calibration;
  const pressed=p.buttons.some(b=>b.value>.5),deltas=p.axes.map((v,i)=>v-(c.rest[i]??0)),axes=deltas.map((v,i)=>({v,i})).filter(a=>Math.abs(a.v)>.65),neutral=!pressed&&deltas.every(v=>Math.abs(v)<.2);
  if(c.waiting){if(neutral){c.waiting=false;if(c.step===0){c.rest=[...p.axes];c.step++;this.drawCalibration();}}return;}
  if(c.step<3){const axis=axes.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))[0];if(!axis)return;const k=c.step===1?'x':'y';if(k==='y'&&axis.i===c.mapping.x)return;c.mapping[k]=axis.i;c.mapping[k==='x'?'invertX':'invertY']=Math.sign(axis.v);}
  else {let b:ButtonBinding|undefined;const button=p.buttons.findIndex(b=>b.value>.55);if(button>=0)b={button};else if(c.step>=8&&axes.length){const a=axes[0];b={axis:a.i,sign:Math.sign(a.v),rest:c.rest[a.i]};}if(!b)return;const key=['confirm','back','stim','siege','pause','previous','next','raynor','tychus','nova'][c.step-3] as 'confirm';c.mapping[key]=b;}
  c.step++;c.waiting=true;if(c.step>12){this.mappings[p.id]=c.mapping;try{localStorage.setItem('sc2.gamepads.v1',JSON.stringify(this.mappings));}catch{}this.closeCalibration();this.select(p);this.armed.delete(p.index);this.world.announce('手柄校准完成');}else this.drawCalibration();
 }
 private closeCalibration(){this.dialog.hidden=true;this.calibrating=false;this.calibration=null;this.armed.clear();this.states.clear();}
 report(){return {active:this.active,index:this.index,calibrating:this.calibrating,connected:[...(navigator.getGamepads?.()??[])].filter(Boolean).map(p=>({id:p!.id,mapping:p!.mapping,axes:p!.axes.length,buttons:p!.buttons.length}))};}
}
