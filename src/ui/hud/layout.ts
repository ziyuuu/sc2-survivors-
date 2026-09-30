/** Keep the tactical readout below the actual wrapped header, including text zoom. */
export function bindHudSafeLayout(root:HTMLElement){
 const header=root.querySelector<HTMLElement>('#topbar')!,mission=root.querySelector<HTMLElement>('#mission')!;
 let queued=false;
 const set=(name:string,value:number)=>{const next=`${Math.ceil(value)}px`;if(root.style.getPropertyValue(name)!==next)root.style.setProperty(name,next);};
 const measure=()=>{queued=false;const origin=root.getBoundingClientRect().top;set('--battle-header-bottom',header.getBoundingClientRect().bottom-origin);set('--battle-mission-bottom',mission.getBoundingClientRect().bottom-origin);};
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(measure);}};
 // Menus also change the header border; observing only its content box misses that shift.
 const observer=new ResizeObserver(schedule);observer.observe(header,{box:'border-box'});observer.observe(mission,{box:'border-box'});
 window.addEventListener('resize',schedule);schedule();
}
