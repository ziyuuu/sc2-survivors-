/** The original two-image crossfade. Only menu DOM changes; no World calls. */
export function transitionCover(host:HTMLElement,previous:HTMLImageElement|null,motion:boolean){
 const layers=host.querySelectorAll<HTMLImageElement>('.cover-backdrop .cover-layer'),incoming=layers[0],outgoing=layers[1];if(!previous||!incoming||!outgoing||previous.src===incoming.src||!motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 outgoing.src=previous.src;outgoing.classList.add('is-active');incoming.classList.remove('is-active');
 const fade=()=>requestAnimationFrame(()=>{if(!incoming.isConnected)return;requestAnimationFrame(()=>{incoming.classList.add('is-active');outgoing.classList.remove('is-active');});});if(incoming.complete&&incoming.naturalWidth>0)fade();else incoming.addEventListener('load',fade,{once:true});
}
