import {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
import type {ControlSettings} from '../controls/settings';
import {activateHeroSlot} from '../controls/skills';

type BattlePointer={canvas:HTMLCanvasElement;pick:(x:number,y:number,touch:boolean)=>{point:Point}|null;previewTarget?:(point:Point|null)=>void};
export class Input {
 keys=new Set<string>();stick={x:0,z:0};pointer:number|null=null;
 private cancelTap=()=>{};private cancelTarget=()=>{};
 reset(){this.cancelTarget();this.cancelTap();this.keys.clear();this.release();this.world.input={x:0,z:0};}
 constructor(readonly world:World,readonly joystick:HTMLElement,readonly onPause:()=>void,readonly settings:ControlSettings,battle:BattlePointer){
  let tap:{id:number;x:number;y:number;at:number;cancelled:boolean}|null=null;
  const canvas=battle.canvas,canAct=()=>world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision;
  let target:Point|null=null,targetKind:'stalker'|'transfer'|null=null,transferMemberIndex=0;const transferIds=new Set<number>(),transferCandidates=new Set<number>(),transferPanel=document.createElement('aside');transferPanel.id='transfer-picker';transferPanel.className='console';transferPanel.hidden=true;document.querySelector('#interface')?.append(transferPanel);
  const preview=()=>battle.previewTarget?.(target);
  const updateTransferPanel=(rebuild=false)=>{if(targetKind!=='transfer'||!target)return;const chosen=[...transferIds],result=world.previewTalentTransfer(target,chosen),members=world.allies().filter(unit=>transferCandidates.has(unit.id));if(rebuild){transferPanel.innerHTML=`<strong></strong><p role="status"></p><div class="transfer-members">${members.map(unit=>`<button data-transfer-id="${unit.id}" aria-pressed="false">${unit.heroId??unit.unitType} #${unit.id}</button>`).join('')}</div><button data-transfer-confirm>确认转移</button><button data-transfer-cancel>取消</button>`;}transferPanel.querySelector('strong')!.textContent=`微操转移 · ${chosen.length}名成员`;transferPanel.querySelector('[role=status]')!.textContent=result.ok?'全员可落地':result.reason;transferPanel.querySelector<HTMLButtonElement>('[data-transfer-confirm]')!.disabled=!result.ok;for(const [index,button] of [...transferPanel.querySelectorAll<HTMLButtonElement>('[data-transfer-id]')].entries()){const selected=transferIds.has(Number(button.dataset.transferId));button.setAttribute('aria-pressed',String(selected));button.classList.toggle('gamepad-member-selected',index===transferMemberIndex&&document.body.classList.contains('gamepad-active'));}};
  this.cancelTarget=()=>{target=null;targetKind=null;transferIds.clear();transferCandidates.clear();transferPanel.hidden=true;delete document.body.dataset.targetFamily;canvas.style.cursor='';preview();};
  const confirmTarget=()=>{if(!target||!canAct())return;if(targetKind==='transfer'){const result=world.previewTalentTransfer(target,[...transferIds]);if(result.ok&&world.airlift(target,[...transferIds])){this.cancelTarget();world.announce('转移已确认 · 小队开始准备');}else world.announce(result.reason||'目标位置不可转移');return;}if(world.castFamilyAbility('stalker',target)){this.cancelTarget();world.announce('闪烁已施放');}};
  transferPanel.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.hasAttribute('data-transfer-cancel'))this.cancelTarget();else if(button.hasAttribute('data-transfer-confirm'))confirmTarget();else if(button.dataset.transferId){const id=Number(button.dataset.transferId);transferMemberIndex=[...transferPanel.querySelectorAll('[data-transfer-id]')].indexOf(button);if(transferIds.has(id))transferIds.delete(id);else transferIds.add(id);updateTransferPanel();}});
  document.addEventListener('sc2-target-member-cycle',e=>{if(targetKind!=='transfer'||!target)return;const members=[...transferPanel.querySelectorAll<HTMLButtonElement>('[data-transfer-id]')];if(!members.length)return;transferMemberIndex=(transferMemberIndex+((e as CustomEvent<number>).detail>=0?1:-1)+members.length)%members.length;updateTransferPanel();members[transferMemberIndex].scrollIntoView({block:'nearest',inline:'nearest'});});
  document.addEventListener('sc2-target-member-toggle',()=>{if(targetKind!=='transfer'||!target)return;const member=transferPanel.querySelectorAll<HTMLButtonElement>('[data-transfer-id]')[transferMemberIndex];if(!member)return;const id=Number(member.dataset.transferId);if(transferIds.has(id))transferIds.delete(id);else transferIds.add(id);updateTransferPanel();});
  document.addEventListener('sc2-target-family',e=>{const kind=(e as CustomEvent).detail;if((kind!=='stalker'&&kind!=='transfer')||!canAct()||kind==='transfer'&&(!world.talent('airlift')||world.time<world.airliftReady||world.talentTransferPlan))return;this.cancelTap();this.keys.clear();this.release();world.input={x:0,z:0};targetKind=kind;target=kind==='transfer'?{x:world.anchor.x+Math.sin(world.anchor.facing)*12,z:world.anchor.z+Math.cos(world.anchor.facing)*12}:{x:world.anchor.x,z:world.anchor.z};document.body.dataset.targetFamily=kind;canvas.style.cursor='crosshair';if(kind==='transfer'){transferIds.clear();transferCandidates.clear();transferMemberIndex=0;for(const id of world.previewTalentTransfer(target).participantIds){transferIds.add(id);transferCandidates.add(id);}transferPanel.hidden=false;updateTransferPanel(true);}preview();world.announce(kind==='transfer'?'选择落点 · 手柄右摇杆选成员、X切换、左摇杆调整、A确认 · Esc／B取消':'选择闪烁落点 · 点击确认／手柄左摇杆＋A · Esc／B取消');});
  document.addEventListener('sc2-target-cancel',()=>this.cancelTarget());
  document.addEventListener('sc2-target-confirm',confirmTarget);
  document.addEventListener('sc2-target-nudge',e=>{if(!target||!canAct())return;const d=(e as CustomEvent<Point>).detail;if(Number.isFinite(d?.x)&&Number.isFinite(d?.z)){target={x:target.x+d.x,z:target.z+d.z};preview();updateTransferPanel();}});
  this.cancelTap=()=>{const id=tap?.id;tap=null;if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
  window.addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
  settings.listeners.add(()=>{this.reset();world.cancelOrder();});
  window.addEventListener('keydown',e=>{
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
   const code=e.code;if(code==='Escape'){if(target){this.cancelTarget();e.preventDefault();return;}if(world.talentTransferPlan){world.cancelTalentTransfer();e.preventDefault();return;}if(!e.repeat)onPause();return;}
   if(!canAct())return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code))e.preventDefault();if(e.repeat)return;
   this.keys.add(code);
   if(code==='Digit1')activateHeroSlot(world,0);if(code==='Digit2')activateHeroSlot(world,1);if(code==='Digit3')activateHeroSlot(world,2);if(code==='KeyG')world.castDetection();
   if(code==='KeyT')world.toggleTanks();if(code==='KeyE')world.stim();if(code==='Space')world.dash();if(code==='KeyF')document.dispatchEvent(new CustomEvent('sc2-target-family',{detail:'transfer'}));
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  const command=(e:PointerEvent)=>{
   if(!canAct()||(!target&&!settings.pointerMoves(e.pointerType))||this.pointer!==null)return;
   const hit=battle.pick(e.clientX,e.clientY,e.pointerType!=='mouse');if(hit){if(target){target=hit.point;preview();updateTransferPanel();confirmTarget();}else world.issueMove(hit.point);}
  };
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
   if(!canAct()||(!target&&!settings.pointerMoves(e.pointerType)))return;
   if(e.pointerType==='mouse'){if(e.button===2||e.button===0){e.preventDefault();command(e);}return;}
   if(tap){tap.cancelled=true;return;}if(!e.isPrimary||e.button!==0||this.pointer!==null)return;
   e.preventDefault();tap={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),cancelled:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{if(target&&canAct()){const hit=battle.pick(e.clientX,e.clientY,e.pointerType!=='mouse');if(hit){target=hit.point;preview();updateTransferPanel();}}if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12)tap.cancelled=true;});
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
  if(this.world.phase!=='battle'||this.world.paused||this.world.requiresPlayerDecision){this.reset();return;}
  if(document.body.dataset.targetFamily){this.world.input={x:0,z:0};return;}
  const keyboard=this.settings.desktop==='keyboard';
  this.world.input={x:this.stick.x+(keyboard?Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft')):0),z:this.stick.z+(keyboard?Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp')):0)};
 }
}
