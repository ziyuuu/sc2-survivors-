import {World} from '../../simulation/world';
import {skillsFor,activateSkill,skillUnlocked,stickSkill,type SkillId} from '../controls/skills';
import {PadState,STANDARD,validMapping,type PadMapping,type PadSnapshot} from './state';
export class GamepadInput {
 active=false;private index:number|null=null;private states=new Map<number,PadState>();private armed=new Set<number>();private mappings:Record<string,PadMapping>={};private selectedSkill:SkillId|null=null;private skillPanel=document.createElement('aside');private lastPanel='';private panelAt=0;private missingSkillAxes=false;private calibrating=false;private lastTargetAt=0;private lastMemberCycleAt=0;
 private dialog=document.createElement('section');private calibration:{id:string;step:number;mapping:PadMapping;rest:number[];waiting:boolean}|null=null;
 constructor(readonly world:World,readonly pause:()=>void,readonly onActive:()=>void){try{const saved=JSON.parse(localStorage.getItem('sc2.gamepads.v1')??'{}');for(const [k,v] of Object.entries(saved))if(validMapping(v))this.mappings[k]=v;}catch{}
  this.skillPanel.id='pad-skill-picker';this.skillPanel.className='console';this.skillPanel.hidden=true;document.querySelector('#interface')!.append(this.skillPanel);
  this.dialog.id='gamepad-calibration';this.dialog.hidden=true;document.body.append(this.dialog);
  window.addEventListener('blur',()=>this.suspend());window.addEventListener('gamepaddisconnected',e=>{if(e.gamepad.index===this.index)this.suspend();this.armed.delete(e.gamepad.index);this.states.delete(e.gamepad.index);});
  document.addEventListener('pointerdown',()=>this.direct(),true);document.addEventListener('keydown',e=>{if(e.code==='Escape'&&this.calibrating){this.closeCalibration();return;}this.direct();});
  document.addEventListener('click',e=>{if((e.target as HTMLElement).closest('[data-action="controller"]'))this.openCalibration();});
  this.dialog.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))this.closeCalibration();});
 }
 reset(){this.closeCalibration();this.active=false;this.index=null;this.selectedSkill=null;this.states.clear();this.armed.clear();this.hideSkills();document.body.classList.remove('gamepad-active');}
 direct(){if(!this.active)return;this.armed.clear();this.states.clear();this.active=false;this.hideSkills();this.world.input={x:0,z:0};if(!document.body.dataset.targetFamily)this.world.cancelOrder();document.body.classList.remove('gamepad-active');}
 private suspend(){if(!this.active)return;this.world.input={x:0,z:0};this.armed.clear();this.states.clear();this.active=false;this.index=null;this.hideSkills();document.body.classList.remove('gamepad-active');if(this.world.phase==='battle'){this.world.paused=true;this.world.changed();}}
 private select(p:PadSnapshot){this.active=true;this.index=p.index;if(!document.body.dataset.targetFamily){this.world.cancelOrder();this.onActive();}else this.world.input={x:0,z:0};document.body.classList.add('gamepad-active');}
 poll(now=performance.now(),pads:readonly (PadSnapshot|null)[]=navigator.getGamepads?.()??[]){const connected=pads.filter((p):p is PadSnapshot=>!!p&&p.connected);if(this.active&&!connected.some(p=>p.index===this.index)){this.suspend();this.index=null;return;}
  if(this.calibrating){const p=connected.find(p=>p.id===this.calibration?.id)??connected[0];if(p)this.calibrate(p);return;}
  for(const p of connected){const mapping=this.mappings[p.id]??(p.mapping==='standard'?STANDARD:null);if(!mapping){if(p.buttons.some(b=>b.value>.55)){this.openCalibration(p);return;}continue;}
   let state=this.states.get(p.index);if(!state){state=new PadState();this.states.set(p.index,state);}const input=state.sample(p,mapping,now);
   if(!this.armed.has(p.index)){if(input.neutral){this.armed.add(p.index);state.reset();}continue;}
   if(input.meaningful&&!this.active||input.meaningful&&this.index!==p.index)this.select(p);
   if(!this.active||this.index!==p.index)continue;
   if(input.edges.has('pause')){this.pause();return;}
   const w=this.world;if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision){w.input={x:0,z:0};this.hideSkills();this.menu(input.menu,input.edges.has('confirm')||input.edges.has('stim'),input.edges.has('back'));continue;}
   if(document.body.dataset.targetFamily){const dt=Math.min(.05,Math.max(0,(now-this.lastTargetAt)/1000)),transfer=document.body.dataset.targetFamily==='transfer';this.lastTargetAt=now;w.input={x:0,z:0};this.hideSkills();if(input.edges.has('back'))document.dispatchEvent(new Event('sc2-target-cancel'));else if(transfer&&input.edges.has('stim'))document.dispatchEvent(new Event('sc2-target-member-toggle'));else if(input.edges.has('confirm')||!transfer&&input.edges.has('stim'))document.dispatchEvent(new Event('sc2-target-confirm'));else {if(transfer&&Math.abs(input.skill.z)>.65&&now-this.lastMemberCycleAt>=240){this.lastMemberCycleAt=now;document.dispatchEvent(new CustomEvent('sc2-target-member-cycle',{detail:Math.sign(input.skill.z)}));}if(input.move.x||input.move.z)document.dispatchEvent(new CustomEvent('sc2-target-nudge',{detail:{x:input.move.x*dt*8,z:input.move.z*dt*8}}));}continue;}this.lastTargetAt=now;
   this.missingSkillAxes=p.mapping!=="standard"&&(mapping.skillX===undefined||mapping.skillY===undefined);w.input=input.move;
   this.selectedSkill=stickSkill(input.skill.x,input.skill.z,this.selectedSkill,skillsFor(w));
   if(this.selectedSkill&&(input.edges.has('confirm')||input.edges.has('stim'))&&skillUnlocked(w,this.selectedSkill))activateSkill(w,this.selectedSkill);
   if(input.edges.has('back'))this.selectedSkill=null;
   if(now>=this.panelAt){this.panelAt=now+100;this.drawSkills();}
  }
 }
 private hideSkills(){this.skillPanel.hidden=true;for(const el of document.querySelectorAll('.pad-selected'))el.classList.remove('pad-selected');}
 private drawSkills(){
  const w=this.world,id=this.selectedSkill,skills=skillsFor(w),selected=skills.find(s=>s.id===id);
  const html=`<span>${this.missingSkillAxes?'设置 → 手柄校准 · 补充右摇杆':'右摇杆选择技能 · A / X 施放'}</span><div class="pad-options">${skills.map(s=>`<span class="pad-option ${id===s.id?'selected':''} ${skillUnlocked(w,s.id)?'':'locked'}" data-skill="${s.id}"><b>${s.arrow}</b>${s.name}</span>`).join('')}</div><strong>${selected?selected.name+(skillUnlocked(w,selected.id)?'':' · 未获得'):'左摇杆移动 · 自动索敌'}</strong>`;
  if(html!==this.lastPanel){this.skillPanel.innerHTML=html;this.lastPanel=html;}this.skillPanel.hidden=false;
  for(const el of document.querySelectorAll<HTMLElement>('#skills button,#hero-skills button'))el.classList.toggle('pad-selected',el.dataset.action===id||!!id?.startsWith('hero-slot-')&&el.dataset.heroSlot===id.slice(-1));
 }
 private menu(direction:string,confirm:boolean,back:boolean){const root=document.querySelector<HTMLElement>('#overlay');if(!root||root.hidden)return;const controls=[...root.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button:not(:disabled),select:not(:disabled)')].filter(e=>e.getClientRects().length);if(!controls.length)return;let i=controls.indexOf(document.activeElement as HTMLButtonElement),el=controls[Math.max(0,i)];
  if(back){const close=root.querySelector<HTMLButtonElement>('[data-action="flow-cancel"],[data-action="menu-back"],[data-action="endless-back"],[data-action="settings-back"],[data-action="talents-back"],[data-action="unit-operations-back"],[data-action="unit-operations-close"]');if(close){close.click();return;}(root.querySelector<HTMLButtonElement>('[data-action="skip"],[data-action="pause"]')??el).focus();return;}
  if(direction){if(el instanceof HTMLSelectElement&&['left','right'].includes(direction)){el.selectedIndex=(el.selectedIndex+(direction==='right'?1:el.options.length-1))%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));return;}i=(Math.max(0,i)+(['right','down'].includes(direction)?1:controls.length-1))%controls.length;el=controls[i];el.focus();el.scrollIntoView({block:'nearest'});}else if(i<0)el.focus();
  if(confirm){if(el instanceof HTMLSelectElement){el.selectedIndex=(el.selectedIndex+1)%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));}else el.click();}
 }
 openCalibration(p?:PadSnapshot){const pads=[...(navigator.getGamepads?.()??[])].filter((p):p is Gamepad=>!!p&&p.connected);p??=pads.find(p=>p.index===this.index)??pads[0];this.calibrating=true;this.dialog.hidden=false;if(this.world.phase==='battle'){this.world.paused=true;this.world.changed();}this.world.input={x:0,z:0};this.calibration=p?{id:p.id,step:0,mapping:structuredClone(STANDARD),rest:[...p.axes],waiting:true}:null;this.drawCalibration();}
 private drawCalibration(){const steps=['放开所有按键和摇杆','左摇杆向右推','左摇杆向下推','右摇杆向右推','右摇杆向下推','按 A（确认 / 施放）','按 B（返回）','按 X（确认 / 施放）','按菜单键（暂停）'];this.dialog.innerHTML=`<div class="console"><h2>手柄校准</h2><p>${this.calibration?steps[this.calibration.step]:'连接手柄后按任意键'}</p><p>每步完成后松开，再执行下一步。</p><button>取消 · 保留原设置</button></div>`;}
 private calibrate(p:PadSnapshot){if(!this.calibration){this.calibration={id:p.id,step:0,mapping:structuredClone(STANDARD),rest:[...p.axes],waiting:true};this.drawCalibration();}const c=this.calibration;
  const pressed=p.buttons.some(b=>b.value>.5),deltas=p.axes.map((v,i)=>v-(c.rest[i]??0)),axes=deltas.map((v,i)=>({v,i})).filter(a=>Math.abs(a.v)>.65),neutral=!pressed&&deltas.every(v=>Math.abs(v)<.2);
  if(c.waiting){if(neutral){c.waiting=false;if(c.step===0){c.rest=[...p.axes];c.step++;this.drawCalibration();}}return;}
  if(c.step<5){const axis=axes.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))[0];if(!axis)return;
   const keys=['x','y','skillX','skillY'] as const,inversions=['invertX','invertY','invertSkillX','invertSkillY'] as const,key=keys[c.step-1];
   if(keys.slice(0,c.step-1).some(k=>c.mapping[k]===axis.i))return;
   c.mapping[key]=axis.i;c.mapping[inversions[c.step-1]]=Math.sign(axis.v);
  }else {const button=p.buttons.findIndex(b=>b.value>.55);if(button<0)return;const key=(['confirm','back','stim','pause'] as const)[c.step-5];c.mapping[key]={button};}
  c.step++;c.waiting=true;if(c.step>8){this.mappings[p.id]=c.mapping;try{localStorage.setItem('sc2.gamepads.v1',JSON.stringify(this.mappings));}catch{}this.closeCalibration();this.select(p);this.armed.delete(p.index);this.world.announce('手柄校准完成');}else this.drawCalibration();
 }
 private closeCalibration(){this.dialog.hidden=true;this.calibrating=false;this.calibration=null;this.armed.clear();this.states.clear();}
 report(){return {active:this.active,selectedSkill:this.selectedSkill,needsRightStickCalibration:this.missingSkillAxes,index:this.index,calibrating:this.calibrating,connected:[...(navigator.getGamepads?.()??[])].filter(Boolean).map(p=>({id:p!.id,mapping:p!.mapping,axes:p!.axes.length,buttons:p!.buttons.length}))};}
}
