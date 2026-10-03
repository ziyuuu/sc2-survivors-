/** Native fullscreen is attempted only by a user gesture. Failure never changes simulation state. */
export async function toggleNativeFullscreen():Promise<boolean>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else{if(!document.documentElement.requestFullscreen)return false;await document.documentElement.requestFullscreen();}return true;}catch{return false;}
}
export const fullscreenLabel=()=>document.fullscreenElement?'退出全屏':'全屏';
export function bindGameViewport(resize:()=>void,resetInputClock:()=>void){
 let pending=0,settle:ReturnType<typeof setTimeout>|undefined;
 const update=()=>{if(pending)return;resetInputClock();pending=requestAnimationFrame(()=>{
  pending=0;const viewport=window.visualViewport,style=document.documentElement.style;
  style.setProperty('--game-height',`${viewport?.height??window.innerHeight}px`);style.setProperty('--game-width',`${viewport?.width??window.innerWidth}px`);
  style.setProperty('--game-left',`${viewport?.offsetLeft??0}px`);style.setProperty('--game-top',`${viewport?.offsetTop??0}px`);resize();
 });};
 // Mobile rotation/fullscreen can report an intermediate size before browser chrome settles.
 const changing=()=>{update();clearTimeout(settle);settle=setTimeout(update,160);};
 window.addEventListener('resize',changing);window.addEventListener('orientationchange',changing);window.visualViewport?.addEventListener('resize',changing);window.visualViewport?.addEventListener('scroll',update);document.addEventListener('fullscreenchange',changing);document.addEventListener('sc2-hud-layout',update);update();
 return ()=>{cancelAnimationFrame(pending);clearTimeout(settle);window.removeEventListener('resize',changing);window.removeEventListener('orientationchange',changing);window.visualViewport?.removeEventListener('resize',changing);window.visualViewport?.removeEventListener('scroll',update);document.removeEventListener('fullscreenchange',changing);document.removeEventListener('sc2-hud-layout',update);};
}
