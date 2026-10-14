type FullscreenDocument=Document&{webkitFullscreenElement?:Element|null;webkitFullscreenEnabled?:boolean;webkitExitFullscreen?:()=>Promise<void>|void};
type FullscreenElement=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};

export function fullscreenState(){
 const doc=typeof document==='undefined'?null:document as FullscreenDocument,root=doc?.documentElement as FullscreenElement|undefined;
 const active=!!(doc?.fullscreenElement||doc?.webkitFullscreenElement);
 const supported=!!root&&(!!root.requestFullscreen&&doc?.fullscreenEnabled!==false||!!root.webkitRequestFullscreen&&doc?.webkitFullscreenEnabled!==false);
 const standalone=typeof window!=='undefined'&&(window.matchMedia?.('(display-mode: standalone)').matches||window.matchMedia?.('(display-mode: fullscreen)').matches||!!(window.navigator as Navigator&{standalone?:boolean})?.standalone);
 return {active,supported,standalone:!!standalone};
}
/** Call directly in the click handler: awaiting other work loses mobile user activation. */
export async function toggleNativeFullscreen():Promise<boolean>{
 try{
  const doc=document as FullscreenDocument,root=doc.documentElement as FullscreenElement;
  if(doc.fullscreenElement)await doc.exitFullscreen();
  else if(doc.webkitFullscreenElement&&doc.webkitExitFullscreen)await doc.webkitExitFullscreen();
  else if(root.requestFullscreen&&doc.fullscreenEnabled!==false)await root.requestFullscreen();
  else if(root.webkitRequestFullscreen&&doc.webkitFullscreenEnabled!==false)await root.webkitRequestFullscreen();
  else return false;
  return true;
 }catch{return false;}
}
export const fullscreenLabel=()=>fullscreenState().active?'退出全屏':'进入全屏';

type Viewport={width:number;height:number;left:number;top:number;ratio:number};
const finite=(value:number|undefined,fallback:number)=>Number.isFinite(value)?value!:fallback;
function sampleViewport():Viewport{
 const v=window.visualViewport,round=(n:number)=>Math.round(n*64)/64;
 return {width:Math.max(1,round(finite(v?.width,window.innerWidth))),height:Math.max(1,round(finite(v?.height,window.innerHeight))),left:round(finite(v?.offsetLeft,0)),top:round(finite(v?.offsetTop,0)),ratio:finite(window.devicePixelRatio,1)};
}
const viewportKey=(v:Viewport)=>[v.width,v.height,v.left,v.top,v.ratio].join(':');

/** Commit the root, camera and HUD together after a short stable measurement.
 * Duplicate browser events do no work. Rotation gets a bounded late-size probe;
 * continuous browser-chrome animation cannot postpone a commit indefinitely. */
export function bindGameViewport(resize:()=>void,resetInputClock:()=>void){
 let frame=0,stopped=false,committed='',candidate=sampleViewport(),key=viewportKey(candidate),changedAt=0,beganAt=0,pollUntil=0,layout=false,reset=false;
 const queue=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(check);};
 const check=()=>{
  frame=0;if(stopped)return;const now=performance.now(),next=sampleViewport(),nextKey=viewportKey(next);
  if(nextKey!==key){candidate=next;key=nextKey;changedAt=now;}
  const changed=key!==committed;
  if(changed&&!reset){resetInputClock();reset=true;}
  if(changed&&committed&&now-changedAt<80&&now-beganAt<240){queue();return;}
  if(changed||layout){
   if(changed){if(committed)resetInputClock();const style=document.documentElement.style;style.setProperty('--game-height',`${candidate.height}px`);style.setProperty('--game-width',`${candidate.width}px`);style.setProperty('--game-left',`${candidate.left}px`);style.setProperty('--game-top',`${candidate.top}px`);committed=key;}
   layout=false;resize();
  }
  if(now<pollUntil){queue();return;}reset=false;
 };
 const changing=()=>{const now=performance.now(),next=sampleViewport(),nextKey=viewportKey(next);if(nextKey===key&&nextKey===committed)return;if(!frame)beganAt=now;if(nextKey!==key){key=nextKey;candidate=next;changedAt=now;}if(!reset){resetInputClock();reset=true;}queue();};
 const transition=()=>{const now=performance.now();if(!frame)beganAt=now;pollUntil=now+240;layout=true;if(!reset){resetInputClock();reset=true;}queue();};
 const hudLayout=()=>{layout=true;queue();};
 const events:[EventTarget,string,EventListener][]=[[window,'resize',changing],[window,'orientationchange',transition],[document,'fullscreenchange',transition],[document,'webkitfullscreenchange',transition],[document,'sc2-hud-layout',hudLayout]];
 if(window.visualViewport)events.push([window.visualViewport,'resize',changing],[window.visualViewport,'scroll',changing]);
 if(window.screen?.orientation)events.push([window.screen.orientation,'change',transition]);
 for(const [target,event,listener] of events)target.addEventListener(event,listener);queue();
 return ()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);for(const [target,event,listener] of events)target.removeEventListener(event,listener);};
}
