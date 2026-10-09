import './arrival.css';
import type {World} from '../../src/simulation/world';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {ELITES} from '../../src/data/elites';
import {HEROES} from '../../src/data/heroes';
import {paintedArt,escapeHtml} from '../../src/ui/presentation/painted-art';
import {brandLogo} from '../../src/ui/presentation/reference-primitives';

type Arrival={identity:string;name:string;kind:'elite'|'hero';rank:number;promoted:boolean};
/** Independent presentation demo: native acquisition precedes the notification. */
export async function installArrivalDemo(world:World,view:BattleRenderer,reset:()=>void){
 const elite=ELITES['marine.2'];
 await view.ensureUnitVariant(elite.model,elite.family);
 const layer=document.createElement('aside');
 layer.id='arrival-layer';layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
 document.getElementById('game-root')!.append(layer);
 const toolbar=document.querySelector('.sample-toolbar')!;
 toolbar.querySelector('strong')!.textContent='精英 / 英雄 · 入队演示';
 const buttons=document.createElement('div');buttons.className='arrival-demo-controls';
 buttons.innerHTML='<button data-arrival="elite">精英入队</button><button data-arrival="hero">英雄入队</button><button data-arrival="sequence">连续入队</button><button data-arrival="promotion">晋升</button>';
 toolbar.append(buttons);
 const queue:Arrival[]=[],history:Arrival[]=[];let current:Arrival|null=null,timer=0;
 function showNext(){
  current=queue.shift()??null;layer.replaceChildren();if(!current)return;
  const item=current,card=document.createElement('article');card.className='arrival-card '+item.kind;
  const duration=item.kind==='hero'?2900:2400;
  card.style.setProperty('--arrival-duration',duration+'ms');
  card.dataset.identity=item.identity;
  const particles=Array.from({length:item.kind==='hero'?38:24},(_,i)=>{
   const angle=i*2.399963,reach=.85+(i%5)*.13;
   return `<i style="--reach:${reach};--spark-size:${i%3+2}px;--spark-delay:${(duration*.285)+(i%4)*21}ms;--spark-angle:${angle}rad"></i>`;
  }).join('');
  card.innerHTML=`<div class="arrival-aura" aria-hidden="true"></div><div class="arrival-flare" aria-hidden="true"></div><div class="arrival-ring" aria-hidden="true"></div><div class="arrival-sparks" aria-hidden="true">${particles}</div><div class="arrival-flash" aria-hidden="true"></div><div class="arrival-body"><div class="arrival-back" aria-hidden="true"><span class="arrival-tag-eyelet"></span><div class="arrival-tag-inset">${brandLogo('arrival-tag-logo')}</div><span class="arrival-tag-grooves"></span></div><div class="arrival-front"><div class="arrival-type">${item.kind==='elite'?'精英':'英雄'} · ${item.promoted?'晋升':'加入部队'}</div><div class="arrival-art">${paintedArt(item.identity,item.name,1,'arrival')}</div><div class="arrival-caption"><strong>${escapeHtml(item.name)}</strong><span>${item.promoted?'军衔提升至 ':'军衔 '}${['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][item.rank-1]??item.rank}</span></div><div class="arrival-sheen" aria-hidden="true"></div></div></div>`;
  layer.append(card);history.push({...item});timer=window.setTimeout(showNext,duration);
 }
 function enqueue(item:Arrival){queue.push(item);if(!current)showNext();}
 function acquire(kind:'elite'|'hero'){
  const identity=kind==='elite'?'marine.2':'raynor',before=kind==='elite'?world.eliteOwned('marine.2'):world.heroEntity('raynor');
  const promoted=!!before,ok=kind==='elite'?world.acquireElite('marine.2'):world.acquireHero('raynor');
  const unit=kind==='elite'?world.eliteOwned('marine.2'):world.heroEntity('raynor');
  if(ok&&unit){enqueue({identity,name:kind==='elite'?elite.name:HEROES.raynor.name,kind,rank:unit.rank,promoted});world.changed();}
 }
 function restart(){window.clearTimeout(timer);queue.length=0;history.length=0;current=null;layer.replaceChildren();reset();}
 buttons.addEventListener('click',event=>{
  const action=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-arrival]')?.dataset.arrival;
  if(!action)return;restart();
  if(action==='elite'||action==='hero')acquire(action);
  if(action==='sequence'){acquire('elite');acquire('hero');}
  if(action==='promotion'){world.acquireElite('marine.2');acquire('elite');}
 });
 document.getElementById('sample-reset')!.addEventListener('click',restart);
 Object.assign(window,{__ARRIVAL_DEMO_REPORT__:()=>({current,queue:[...queue],history:[...history],elite:world.eliteOwned('marine.2')?.rank??null,hero:world.heroEntity('raynor')?.rank??null,paused:world.paused,time:world.time})});
 restart();acquire('elite');acquire('hero');
 document.body.dataset.arrivalReady='true';
}
