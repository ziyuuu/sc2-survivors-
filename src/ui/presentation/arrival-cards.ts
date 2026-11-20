import './arrival-cards.css';
import '../intermission-skin/card-material.css';
import type {World} from '../../simulation/world';
import {takeUnitArrivals,type UnitArrival} from '../../simulation/boss-loot';
import {paintedArt,escapeHtml} from './painted-art';
import {brandLogo} from './reference-primitives';

type NodeArrival={kind:'node';identity:string;name:string;quality:'purple'|'orange';art:Element|null};
type Arrival=UnitArrival|NodeArrival;

/** Approved R4 reveal; native settlement completes before this presentation queue. */
export class ArrivalCards {
 private layer=document.createElement('aside');private queue:Arrival[]=[];
 private current:Arrival|null=null;private timer=0;private version=-1;
 constructor(private world:World,root:HTMLElement){this.layer.id='arrival-layer';this.layer.setAttribute('role','status');this.layer.setAttribute('aria-live','polite');root.append(this.layer);}
 update(visible:boolean){
  if(this.version!==this.world.arrivalVersion){this.version=this.world.arrivalVersion;window.clearTimeout(this.timer);this.queue=[];this.current=null;this.layer.replaceChildren();}
  this.layer.hidden=!visible||this.world.phase==='menu';
  if(this.world.phase==='menu'){takeUnitArrivals(this.world);this.queue=[];window.clearTimeout(this.timer);this.current=null;this.layer.replaceChildren();return;}
  this.queue.push(...takeUnitArrivals(this.world));if(!this.current&&!this.layer.hidden)this.showNext();
 }
 showNode(item:NodeArrival){
  this.update(true);this.queue.push(item);
  if(!this.current)this.showNext();
 }
 private showNext(){
  this.layer.replaceChildren();if(this.layer.hidden)return;
  this.current=this.queue.shift()??null;if(!this.current)return;
  const item=this.current,card=document.createElement('article');const quality=item.kind==='node'?item.quality:item.kind==='hero'?'orange':'purple';
  card.className='arrival-card '+(quality==='orange'?'hero':'elite');
  const duration=quality==='orange'?2900:2400;
  card.style.setProperty('--arrival-duration',duration+'ms');
  card.dataset.identity=item.identity;card.dataset.quality=quality;card.dataset.cardRace=this.world.expedition.race;
  const particles=Array.from({length:quality==='orange'?38:24},(_,i)=>{
   const angle=i*2.399963,reach=.85+(i%5)*.13;
   return `<i style="--reach:${reach};--spark-size:${i%3+2}px;--spark-delay:${(duration*.285)+(i%4)*21}ms;--spark-angle:${angle}rad"></i>`;
  }).join('');
  const type=item.kind==='node'?(quality==='orange'?'橙色节点':'紫色节点')+' · 已领取':(item.kind==='elite'?'精英':'英雄')+' · '+(item.absorbedBy?'已吸收':item.promoted?'晋升':'加入部队');
  const art=item.kind==='node'?'':paintedArt(item.identity,item.name,item.identity.startsWith('zergling.')?2:1,'arrival');
  const caption=item.kind==='node'?'':'<span>'+(item.absorbedBy?'强化 '+escapeHtml(item.absorbedBy):(item.promoted?'军衔提升至 ':'军衔 ')+(['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][item.rank-1]??item.rank))+'</span>';
  card.innerHTML=`<div class="arrival-aura" aria-hidden="true"></div><div class="arrival-flare" aria-hidden="true"></div><div class="arrival-ring" aria-hidden="true"></div><div class="arrival-sparks" aria-hidden="true">${particles}</div><div class="arrival-flash" aria-hidden="true"></div><div class="arrival-body"><div class="arrival-back" aria-hidden="true"><span class="arrival-tag-eyelet"></span><div class="arrival-tag-inset">${brandLogo('arrival-tag-logo')}</div><span class="arrival-tag-grooves"></span></div><div class="arrival-front"><div class="arrival-type">${type}</div><div class="arrival-art">${art}</div><div class="arrival-caption"><strong>${escapeHtml(item.name)}</strong>${caption}</div><div class="arrival-sheen" aria-hidden="true"></div></div></div>`;
  if(item.kind==='node'&&item.art)card.querySelector('.arrival-art')!.append(item.art);
  this.layer.append(card);this.timer=window.setTimeout(()=>{this.current=null;this.showNext();},duration);
 }
}
