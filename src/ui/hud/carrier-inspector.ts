import type {World} from '../../simulation/world';
import {SC2_UNITS} from '../../data/sc2-units';
import {icon} from '../../assets/manifest';
/** Read-only inspection. Opening details is never a production / movement command. */
export class CarrierInspector {
 readonly root=document.createElement('aside');private id:number|null=null;private signature='';private previousFocus:HTMLElement|null=null;private entry=document.createElement('button');
 constructor(private world:World,parent:HTMLElement){
  document.addEventListener('sc2-inspection-open',e=>{if((e as CustomEvent).detail==='unit')this.close();});
  this.root.id='carrier-inspector';this.root.setAttribute('data-captures-battle-input','');this.root.className='console';this.root.hidden=true;this.root.setAttribute('aria-label','增援详情');parent.append(this.root);
  this.entry.textContent='增援详情';this.entry.hidden=true;this.entry.addEventListener('click',e=>{e.stopPropagation();const pods=this.world.pods.filter(p=>['falling','active','opening'].includes(p.status)).sort((a,b)=>Math.hypot(a.x-world.anchor.x,a.z-world.anchor.z)-Math.hypot(b.x-world.anchor.x,b.z-world.anchor.z)||a.id-b.id);if(pods[0])this.show(pods[0].id);});parent.querySelector('#console-commands')?.append(this.entry);
  this.root.addEventListener('pointerdown',e=>e.stopPropagation());this.root.addEventListener('click',e=>{e.stopPropagation();if((e.target as HTMLElement).closest('button'))this.close();});
  this.root.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.close();}else if(e.key==='Tab'){e.preventDefault();this.root.querySelector<HTMLButtonElement>('button')?.focus();}});
 }
 show(id:number){this.previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;document.dispatchEvent(new CustomEvent('sc2-inspection-open',{detail:'carrier'}));this.id=id;this.signature='';this.update();this.root.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});}
 close(){const wasOpen=!this.root.hidden;this.id=null;this.root.hidden=true;if(wasOpen&&this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});this.previousFocus=null;}
 update(){this.entry.hidden=this.world.phase!=='battle'||!this.world.pods.some(p=>['falling','active','opening'].includes(p.status));const pod=this.id===null?undefined:this.world.pods.find(p=>p.id===this.id);if(!pod||this.world.phase!=='battle'||!['falling','active','opening'].includes(pod.status)){this.close();return;}
  const waiting=pod.passengers.filter(p=>p.status==='waiting').length,html=`<button aria-label="关闭增援详情">×</button>${icon('wireframe.'+pod.unitType)}<b>${SC2_UNITS[pod.unitType].zh}增援</b><p>${pod.status==='falling'?'正在降落':pod.status==='opening'?'正在出兵':'等待救援'}</p><p>待出兵 ${waiting} · 生命 ${Math.ceil(pod.hp)} / ${pod.maxHp}</p>`;
  if(html!==this.signature){this.signature=html;const focused=this.root.contains(document.activeElement);this.root.innerHTML=html;if(focused)this.root.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});}this.root.hidden=false;
 }
}
