/** Keep the tactical readout below the actual wrapped header, including text zoom. */
export function bindHudSafeLayout(root:HTMLElement){
 const header=root.querySelector<HTMLElement>('#topbar')!,mission=root.querySelector<HTMLElement>('#mission')!,console=root.querySelector<HTMLElement>('#battle-console')!,map=root.querySelector<HTMLElement>('#minimap')!;
 let queued=false;
 const set=(name:string,value:number)=>{const next=`${Math.ceil(value)}px`;if(root.style.getPropertyValue(name)!==next)root.style.setProperty(name,next);};
 const measure=()=>{queued=false;const origin=root.getBoundingClientRect().top;set('--battle-header-bottom',header.getBoundingClientRect().bottom-origin);set('--battle-mission-bottom',mission.getBoundingClientRect().bottom-origin);const style=document.documentElement.style,height=`${Math.ceil(console.getBoundingClientRect().height)}px`,mapWidth=`${map.hidden?0:Math.ceil(map.getBoundingClientRect().width+16)}px`;const changed=style.getPropertyValue('--battle-console-height')!==height||style.getPropertyValue('--battle-map-space')!==mapWidth;style.setProperty('--battle-console-height',height);style.setProperty('--battle-map-space',mapWidth);if(changed)document.dispatchEvent(new Event('sc2-hud-layout'));};
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(measure);}};
 // Menus also change the header border; observing only its content box misses that shift.
 const observer=new ResizeObserver(schedule);for(const node of [header,mission,console,map])observer.observe(node,{box:'border-box'});
 window.addEventListener('resize',schedule);schedule();
}
