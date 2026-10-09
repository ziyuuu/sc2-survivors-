import './skin.css';
import './card-material.css';
import type {World} from '../../simulation/world';
import type {ExpeditionReward} from '../../simulation/progression/expedition-drafts';
import {offerView,catalogueCards,restCards} from '../../ui/presentation/intermission';
import type {CardView} from '../../ui/presentation/reference-card';
import {paintedArt} from '../../ui/presentation/painted-art';
import {esc,glyph,button} from '../../ui/presentation/reference-primitives';
import {SC2_UNITS} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {cardPresentation,objectIndex,lineRows} from './presentation';

export interface IntermissionAssets {resolve:(key:string)=>string|null}
export interface SkinOptions {assets:IntermissionAssets}
/** Additive skin. It owns no wallet, gameplay commands, save schema or screen history. */
export function mountIntermissionSkin(root:HTMLElement,getWorld:()=>World,options:SkinOptions){
 const flipped=new Set<string>(),knownSold=new Map<string,boolean>();let run='',queued=false,disposed=false;
 const query=<T extends Element=HTMLElement>(s:string)=>root.querySelectorAll<T>(s);
 const asset=(id:string)=>options.assets.resolve(id)??'';
 function art(c:CardView,r?:ExpeditionReward){
  const eq=cardPresentation(getWorld(),c,r).equipment;
  if(eq)return `<div class="imx-object imx-equipment" role="img" aria-label="${esc(c.name)}" data-line="${eq.line}" style="background-image:url('${asset('line-equipment-'+c.race)}');background-position:${eq.kind*100}% ${eq.row*50}%"></div>`;
  if(c.identity&&['unit','elite','hero','supply','training'].includes(c.art))return paintedArt(c.identity,c.name,c.bodies??1,'imx-'+c.id,c.bodyIdentities);
  const i=objectIndex(c);return `<div class="imx-object" role="img" aria-label="${esc(c.name)}" style="background-image:url('${asset('objects-'+c.race)}');background-position:${(i%4)/3*100}% ${Math.floor(i/4)/3*100}%"></div>`;
 }
 function readViews(w:World){
  const map=new Map<string,{card:CardView;reward?:ExpeditionReward}>();
  for(const c of catalogueCards(w))map.set(c.id,{card:c});
  for(const e of Object.values(ELITES)){
   const c:CardView={id:e.id,race:w.expedition.race,rarity:'purple',name:e.name,kicker:SC2_UNITS[e.family].zh+' · 精锐',flavour:'',stat:'挑选精锐与专属战法',detail:e.description,identity:e.id,icon:e.icon,art:'elite',bodies:e.family==='zergling'?2:1};
   map.set(e.id,{card:c});for(const r of w.expedition.pendingTalentLoot?.offers??[])map.set(r.offerId+':'+e.id,{card:{...c,id:r.offerId+':'+e.id,rarity:r.rarity}});
  }
  for(const c of restCards(w))map.set(c.id,{card:c});
  for(const c of w.expedition.eliteContracts)map.set(c.id,{card:{id:c.id,race:w.expedition.race,rarity:'purple',name:SC2_UNITS[c.family].zh,kicker:'精英特约',flavour:'',stat:'挑选本兵种精锐',detail:'选择具体精锐后，按当前报价招募或晋升。',identity:c.family,art:'elite',icon:'unit.'+c.family,bodies:c.family==='zergling'?2:1}});
  for(const r of [...w.rewards,...(w.expedition.pendingTalentLoot?.offers??[])] as ExpeditionReward[])map.set(r.offerId,{card:offerView(w,r),reward:r});
  return map;
 }
 function refresh(){
  if(disposed)return;observer.disconnect();const w=getWorld();
  if(run!==w.runId){run=w.runId??'';flipped.clear();knownSold.clear();}
  const active=!!root.querySelector('.formal-intermission,.production-modal,.settings-modal,.family-modal,.im-elite-dialog,.im-detail-dialog,.detail-modal:has(.im-card),.detail-modal:has(.repair-services)');
  root.classList.toggle('imx',active);root.dataset.imxRace=w.expedition.race;
  if(active){
   root.style.setProperty('--imx-background',`url('${asset('background-'+w.expedition.race)}')`);
   const views=readViews(w);
   for(const el of query<HTMLElement>('.im-card')){
    const id=el.dataset.cardId!,v=views.get(id),was=knownSold.get(id),sold=el.classList.contains('im-sold');
    if(!el.dataset.imxCard){
     const face=el.querySelector<HTMLElement>('.im-card-face');if(!face)continue;
     const c=v?.card,p=c?cardPresentation(w,c,v?.reward):null;
     const name=(c?.name??face.querySelector('h2')?.textContent??'').replace(v?.reward?.expeditionEffect.kind==='supply'?/\s*×\d+(?:对)?$/:/$^/,''),simple=p?.simple??face.querySelector('.im-effect')?.textContent??'',detail=p?.detail??simple;
     const body=document.createElement('div');body.className='imx-card-body';
     body.innerHTML=`<div class="imx-art">${c?art(c,v?.reward):face.querySelector('.im-card-art')?.outerHTML??''}<div class="imx-badges"><b>${esc(p?.current??'')}</b><strong>${esc(p?.gain??'')}</strong></div></div><h2 class="imx-name">${esc(name)}</h2><p class="imx-kind">${esc(c?.kicker??el.querySelector('.im-card-meta>span')?.textContent??'')}</p><button class="imx-copy" type="button" data-imx-flip="${esc(id)}" aria-label="${esc(name)}：${flipped.has(id)?'切回简略':'查看详情'}" aria-expanded="${flipped.has(id)}"><span>${esc(flipped.has(id)?detail:simple)}</span><i aria-hidden="true">${glyph('refresh')}</i></button>`;
     body.querySelector<HTMLButtonElement>('.imx-copy')!.dataset.simple=simple;body.querySelector<HTMLButtonElement>('.imx-copy')!.dataset.detail=detail;
     face.replaceWith(body);el.dataset.imxCard='true';
     const b=el.querySelector<HTMLButtonElement>('.im-card-action');if(b?.disabled&&!sold&&!el.classList.contains('im-pending')){if(p?.simple==='军衔已满')b.textContent='军衔已满';b.insertAdjacentHTML('afterbegin','<i class="imx-ban" aria-hidden="true">⊘</i>');}
     if(c?.id==='repair')el.querySelector('.im-card-bottom')?.insertAdjacentHTML('beforebegin',button('选择部队','ui-rest-repair','text-button imx-service-detail'));
    }
    if(was===false&&sold&&['purple','orange'].includes(el.dataset.quality!))flash(el);
   if(!el.querySelector('.im-card-status'))el.insertAdjacentHTML('beforeend','<span class="im-card-status" aria-hidden="true"></span>');
   knownSold.set(id,sold);
   }
   for(const el of query<HTMLElement>('.im-card.im-short')){const badge=el.querySelector('.im-card-status');if(badge&&!badge.textContent?.includes('资源不足'))badge.textContent=(badge.textContent?badge.textContent+' · ':'')+'资源不足';}
   for(const d of query<HTMLElement>('.im-detail-dialog')){
    const name=d.querySelector('h1')?.textContent,entry=[...views.values()].find(v=>v.card.name===name);if(!entry)continue;
    const artSlot=d.querySelector<HTMLElement>('.im-detail-art');if(artSlot&&!artSlot.dataset.imxArt){artSlot.innerHTML=`<div class="imx-art">${art(entry.card,entry.reward)}</div>`;artSlot.dataset.imxArt='true';}
    const copy=d.querySelector('.im-detail-rule');if(copy)copy.textContent=cardPresentation(w,entry.card,entry.reward).detail;
   }
   for(const el of query<HTMLElement>('.feedback-research-line,.feedback-tech-card')){
    const line=el.dataset.line??lineRows[w.expedition.race].find(l=>el.querySelector('h4')?.textContent===({barracks:'兵营',factory:'重工厂',starport:'星港',gateway:'传送门',robotics:'机械台',stargate:'星门','zerg.basic':'基础虫群','zerg.evolution':'地面进化','zerg.air':'飞行虫群'})[l]);
    if(!line)continue;
    el.querySelectorAll<HTMLElement>('.feedback-research>div').forEach((row,kind)=>{if(row.querySelector('.imx-research-art'))return;const im=document.createElement('span');im.className='imx-research-art';im.style.backgroundImage=`url('${asset('line-equipment-'+w.expedition.race)}')`;im.style.backgroundPosition=`${kind*100}% ${lineRows[w.expedition.race].indexOf(line as never)*50}%`;row.prepend(im);});
   }

  }
  observer.observe(root,{childList:true,subtree:true});
 }
 function schedule(){if(queued||disposed)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});}
 function click(e:MouseEvent){const b=(e.target as Element).closest<HTMLButtonElement>('[data-imx-flip]');if(!b)return;e.preventDefault();e.stopPropagation();const id=b.dataset.imxFlip!;flipped.has(id)?flipped.delete(id):flipped.add(id);b.setAttribute('aria-expanded',String(flipped.has(id)));b.querySelector('span')!.textContent=(flipped.has(id)?b.dataset.detail:b.dataset.simple)??'';b.setAttribute('aria-label',b.getAttribute('aria-label')!.replace(/：(查看详情|切回简略)$/,'：'+(flipped.has(id)?'切回简略':'查看详情')));}
 function flash(el:HTMLElement){if(matchMedia('(prefers-reduced-motion:reduce)').matches||root.closest('.ui-reduced-motion'))return;el.classList.add('imx-flash');setTimeout(()=>el.classList.remove('imx-flash'),850);}
 const observer=new MutationObserver(schedule);root.addEventListener('click',click,true);refresh();
 return {refresh,notifyPurchase:(id:string)=>{const el=[...query<HTMLElement>('.im-card')].find(e=>e.dataset.cardId===id);if(el)flash(el);},dispose:()=>{disposed=true;observer.disconnect();root.removeEventListener('click',click,true);root.classList.remove('imx');}};
}
