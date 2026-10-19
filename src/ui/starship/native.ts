import type {HUD} from '../hud';
import {createWorldStarshipHost} from './world-host';
import {mountStarshipUI} from './view';
import './style.css';
import './legacy-r12.css';
import './polish.css';
import './native.css';

/** Mount the same equipment window in the original menu, HUD and intermission. */
export function mountGameStarship(hud:HUD,resolveImage:(key:string,detail?:boolean)=>string){
 const world=hud.world,container=hud.root.parentElement!,root=document.createElement('section'),abort=new AbortController();
 root.id='native-starship';root.className='native-starship';root.hidden=true;container.append(root);
 let origin=world.phase,embedded=false,disposed=false,closing=false,returnSelector='[data-action="starship"]';
 const host=createWorldStarshipHost(world,{resolveImage,inputReset:()=>hud.inputReset(),
  begin:()=>{hud.menuPage='race';hud.update();return true;},
  continue:()=>{const button=hud.root.querySelector<HTMLButtonElement>('#overlay [data-action="skip"]');if(!button||button.disabled)return false;button.click();return true;},
 });
 const ui=mountStarshipUI(root,host,{initialPage:'loadout',startOpen:false,embedded:()=>embedded,
  focusBoundary:()=>embedded?root.closest<HTMLElement>('.formal-intermission')??root:root,
  onClose(){
   hud.root.inert=false;
   if(embedded&&hud.intermission.current.page==='backpack')hud.intermission.back();
   hud.menuRace=world.expedition.race;hud.update();
   queueMicrotask(()=>hud.root.querySelector<HTMLElement>(returnSelector)?.focus({preventScroll:true}));
  },
 });
 function close(){if(closing||!ui.isOpen)return;closing=true;try{ui.close();}finally{closing=false;}sync();}
 function sync(){
  if(disposed)return;
  if(!ui.isOpen){hud.root.inert=false;if(root.parentElement!==container)container.append(root);return;}
  if(world.phase!==origin||hud.readiness?.state.kind||embedded&&hud.intermission.current.page!=='backpack'){close();return;}
  root.dataset.context=embedded?'intermission':world.phase==='menu'?'menu':'battle';
  if(embedded){
   hud.root.inert=false;root.setAttribute('role','region');root.removeAttribute('aria-modal');
   const slot=hud.root.querySelector<HTMLElement>('.im-backpack-slot');if(slot&&root.parentElement!==slot)slot.append(root);
  }else{
   if(root.parentElement!==container)container.append(root);hud.root.inert=true;
   root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  }
  root.setAttribute('aria-label',world.starship.account.run?.ended&&['lost','finished'].includes(world.phase)?'战利品结算':world.phase==='menu'?'旗舰配装':'背包');
 }
 function open(){
  if(disposed||hud.readiness?.state.kind||!['menu','battle','reward','won','lost','finished'].includes(world.phase))return;
  if(ui.isOpen){close();return;}
  if(hud.settingsOpen||world.phase==='battle'&&(world.paused||world.requiresPlayerDecision))return;
  origin=world.phase;embedded=world.phase==='reward';
  returnSelector=embedded?'[data-action="starship-backpack"]':hud.menuPage==='confirm'&&world.phase==='menu'?'[data-action="menu-edit-starship"]':'[data-action="starship"]';
  if(!hud.session?.canResume&&world.phase==='menu'&&hud.menuPage!=='title'&&world.expedition.race!==hud.menuRace)world.selectRace(hud.menuRace);
  if(embedded&&hud.intermission.current.page!=='backpack'){hud.intermission.push({page:'backpack'},returnSelector);hud.update();}
  ui.open(world.starship.account.run?.ended&&['lost','finished'].includes(world.phase)?'settlement':world.phase==='menu'?'loadout':'backpack');sync();
 }
 window.addEventListener('keydown',event=>{
  if(event.code!=='KeyI'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||(event.target as HTMLElement)?.closest('input,select,textarea,[contenteditable=true]'))return;
  if(world.phase!=='battle')return;event.preventDefault();event.stopImmediatePropagation();open();
 },{capture:true,signal:abort.signal});
 return {root,host,ui,open,close,sync,get isOpen(){return ui.isOpen;},dispose(){close();disposed=true;abort.abort();ui.dispose();host.dispose?.();root.remove();hud.root.inert=false;}};
}
