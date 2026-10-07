export function openingProgress(value:number|null,phase:'initializing'|'loading'|'ready'='initializing'){
 document.dispatchEvent(new CustomEvent('sc2-opening-progress',{detail:{value,phase}}));
}
export function finishOpening(){document.dispatchEvent(new Event('sc2-opening-finish'));}
export async function prepareOpeningMenu(root:HTMLElement){
 const images=[...root.querySelectorAll<HTMLImageElement>('img[src]')].filter(image=>image.getAttribute('src'));
 let done=0;openingProgress(images.length?75:100,'loading');
 await Promise.all(images.map(async image=>{try{await image.decode();}catch{}openingProgress(75+(++done/images.length)*25,'loading');}));
 openingProgress(100,'ready');await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));finishOpening();
}
