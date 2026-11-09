export function openingProgress(value:number|null,phase:'initializing'|'loading'|'ready'='initializing',message?:string){
 document.dispatchEvent(new CustomEvent('sc2-opening-progress',{detail:{value,phase,message}}));
}
export function finishOpening(){document.dispatchEvent(new Event('sc2-opening-finish'));}
export async function prepareOpeningMenu(root:HTMLElement,preparation:Promise<unknown>=Promise.resolve()){
 const images=[...root.querySelectorAll<HTMLImageElement>('img[src]')].filter(image=>image.getAttribute('src'));
 let done=0;openingProgress(images.length?75:100,'loading');
 await Promise.all(images.map(async image=>{try{await image.decode();}catch{}openingProgress(75+(++done/images.length)*15,'loading');}));
 await preparation;openingProgress(100,'ready');await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));finishOpening();
}
