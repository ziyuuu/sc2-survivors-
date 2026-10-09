export type OverlayLayout={mode:'desktop'|'landscape'|'portrait';scale:number;width:number;height:number};
/** Menus keep desktop proportions in landscape; portrait uses a smaller, reflowed surface. */
export function overlayLayout(width:number,height:number):OverlayLayout{
 const w=Math.max(1,width),h=Math.max(1,height),mode=w>h&&h<=600?'landscape':w<=700&&h>=w?'portrait':'desktop';
 const scale=mode==='landscape'?Math.min(1,w/1280,h/720):mode==='portrait'?Math.min(1,w/480):1;
 return {mode,scale,width:w/scale,height:h/scale};
}
export function mountOverlayLayout(overlay:HTMLElement,host:HTMLElement){
 const update=()=>{const layout=overlayLayout(host.clientWidth,host.clientHeight);overlay.dataset.layout=layout.mode;
  overlay.style.width=layout.width+'px';overlay.style.height=layout.height+'px';overlay.style.transform=`scale(${layout.scale})`;
  overlay.style.setProperty('--ui-layout-width',layout.width+'px');overlay.style.setProperty('--ui-layout-height',layout.height+'px');overlay.style.setProperty('--ui-layout-scale',String(layout.scale));
 };
 const observer=new ResizeObserver(update);observer.observe(host);update();return ()=>observer.disconnect();
}
