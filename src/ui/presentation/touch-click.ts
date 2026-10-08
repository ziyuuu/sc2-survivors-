/** Complete a short UI tap when a browser omits its compatibility click after a swipe. */
export function bindTouchClick(root:HTMLElement,blocked:(button:HTMLButtonElement)=>boolean=()=>false){
 let tap:{id:number;button:HTMLButtonElement;x:number;y:number;at:number;cancelled:boolean}|null=null,last={key:'',at:0},compat={key:'',until:0};
 const key=(b:HTMLButtonElement)=>b.id||JSON.stringify({...b.dataset});
 root.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.button!==0)return;compat={key:'',until:0};const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(b&&!b.disabled)tap={id:e.pointerId,button:b,x:e.clientX,y:e.clientY,at:performance.now(),cancelled:false};},true);
 root.addEventListener('pointermove',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>10)tap.cancelled=true;},true);
 for(const name of ['pointerup','pointercancel'])root.addEventListener(name,e=>{const p=e as PointerEvent,t=tap?.id===p.pointerId?tap:null;tap=null;if(name!=='pointerup'||!t||t.cancelled||performance.now()-t.at>=450)return;const b=t.button,k=key(b),up=performance.now();requestAnimationFrame(()=>{if(!b.isConnected||b.disabled||b.closest('[inert]')||last.key===k&&last.at>=up||blocked(b))return;compat={key:k,until:performance.now()+500};b.click();});},true);
 root.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;const k=key(b);if(e.isTrusted&&(e as PointerEvent).pointerType==='touch'&&compat.key===k&&performance.now()<compat.until){e.preventDefault();e.stopImmediatePropagation();return;}last={key:k,at:performance.now()};},true);
}
