import type {AudioEffects} from '../render/effects/audio';

/** Capture before page replacement, after that surface's touch-click guard.
 * The outer surface excludes its separately bound child so one accepted click sounds once. */
export function bindInterfaceAudio(root:HTMLElement,audio:Pick<AudioEffects,'interfaceCue'>,exclude?:HTMLElement){
 const abort=new AbortController();
 root.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,summary,input[type="checkbox"],input[type="radio"]'):null;
  if(!target||exclude?.contains(target)||target.closest('[inert]')||target.matches(':disabled,[aria-disabled="true"]'))return;
  audio.interfaceCue();
 },{capture:true,signal:abort.signal});
 root.addEventListener('change',event=>{if(event.target instanceof HTMLSelectElement&&!event.target.disabled&&!exclude?.contains(event.target))audio.interfaceCue();},{signal:abort.signal});
 return ()=>abort.abort();
}
