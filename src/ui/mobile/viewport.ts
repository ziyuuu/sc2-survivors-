/** Native fullscreen is attempted only by a user gesture. Failure never changes simulation state. */
export async function toggleNativeFullscreen():Promise<boolean>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else{if(!document.documentElement.requestFullscreen)return false;await document.documentElement.requestFullscreen();}return true;}catch{return false;}
}
export const fullscreenLabel=()=>document.fullscreenElement?'退出全屏':'全屏';
export function bindGameViewport(resize:()=>void,resetInputClock:()=>void){
 let pending=0;
 const update=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const viewport=window.visualViewport;document.documentElement.style.setProperty('--game-height',`${viewport?.height??innerHeight}px`);document.documentElement.style.setProperty('--game-width',`${viewport?.width??innerWidth}px`);resetInputClock();resize();});};
 window.addEventListener('resize',update);window.addEventListener('orientationchange',update);window.visualViewport?.addEventListener('resize',update);document.addEventListener('fullscreenchange',update);update();
 return ()=>{cancelAnimationFrame(pending);window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);window.visualViewport?.removeEventListener('resize',update);document.removeEventListener('fullscreenchange',update);};
}
