import type {World} from '../../simulation/world';
import {COMMAND_ACTIONS,battleActionState} from '../controls/battle-actions';
import {hudGlyph} from './glyphs';
import {icon} from '../../assets/manifest';

/** Stable buttons keep focus and a held touch even when a cooldown changes. */
export class BattleCommands {
 constructor(private world:World,private root:HTMLElement){
  root.innerHTML=COMMAND_ACTIONS.map(action=>`<button class="command-key" id="${action.id}" data-action="${action.id}" data-battle-action="${action.id}" type="button">${'icon' in action?icon(action.icon):hudGlyph(action.glyph)}<b></b><kbd>${action.key}</kbd><i class="command-marker" aria-hidden="true"></i><span class="command-count" aria-hidden="true"></span></button>`).join('');
 }
 update(blocked=false){
  for(const action of COMMAND_ACTIONS){
   const state=battleActionState(this.world,action.id),button=this.root.querySelector<HTMLButtonElement>('#'+action.id)!;
   button.hidden=!state.visible;button.disabled=!state.enabled||blocked;
   const status=state.phase==='blocked'?'受阻':state.phase==='working'?'切换/执行中':state.phase==='mixed'?'混合状态':state.phase==='cooling'?'冷却中':state.active?'已开启':'';
   const title=state.name+(state.reason?' · '+state.reason:status?' · '+status:'')+' · '+action.key;
   if(button.title!==title){button.title=title;button.setAttribute('aria-label',title);}
   const label=button.querySelector('b')!;if(label.textContent!==state.name)label.textContent=state.name;
   button.dataset.actionState=state.phase;
   if(state.active!==undefined)button.setAttribute('aria-pressed',state.phase==='mixed'?'mixed':String(state.active));
   button.classList.toggle('command-active',!!state.active);button.classList.toggle('command-working',state.phase==='working');button.classList.toggle('command-blocked',state.phase==='blocked');
   const count=state.count!==undefined?String(state.count):state.remaining>1e-8?String(Math.ceil(state.remaining)):'';
   const mark=state.phase==='blocked'?'!':state.phase==='working'?'↻':state.phase==='mixed'?'◐':state.active?'●':'';
   const counter=button.querySelector('.command-count')!,marker=button.querySelector('.command-marker')!;if(counter.textContent!==count)counter.textContent=count;if(marker.textContent!==mark)marker.textContent=mark;
  }
 }
}
